import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { clientIp, rateLimited } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// Customer reviews come in here (never straight from the browser to the
// database) so they can be rate limited. They stay hidden until approved.
export async function POST(request: Request) {
  const ip = clientIp(request);
  if ((await rateLimited(`review:${ip}`, 5, 60 * 60)) || (await rateLimited(`review-day:${ip}`, 15, 24 * 60 * 60))) {
    return NextResponse.json({ error: 'You’ve sent a lot of reviews — please try again later.' }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const productId = typeof body.product_id === 'string' && UUID.test(body.product_id) ? body.product_id : null;
  const rating = Number(body.rating);
  const name = text(body.customer_name, 80);
  const city = text(body.customer_city, 80);
  const review = text(body.review_text, 1000);

  if (!productId || !Number.isInteger(rating) || rating < 1 || rating > 5 || name.length < 2 || review.length < 3) {
    return NextResponse.json({ error: 'Please add a rating, your name and a short review.' }, { status: 400 });
  }

  const db = getServerClient();
  const { data: product } = await db.from('products').select('id').eq('id', productId).eq('is_active', true).maybeSingle();
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

  const { error } = await db.from('product_reviews').insert({
    product_id: productId,
    customer_name: name,
    customer_city: city || null,
    review_text: review,
    rating,
    is_approved: false,
  });
  if (error) {
    console.error('review insert failed:', error);
    return NextResponse.json({ error: 'Couldn’t post your review. Please try again.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
