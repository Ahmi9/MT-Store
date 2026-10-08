import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { clientIp, rateLimited } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const digits = (s: unknown) => String(s ?? '').replace(/\D/g, '').slice(-10);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Order lookup for customers.
 *  - { order_number, token } → full details (the secret link from checkout)
 *  - { order_number, phone } → tracking details only (no address/email)
 */
export async function POST(request: Request) {
  if (rateLimited(`lookup:${clientIp(request)}`, 20, 10 * 60_000)) {
    return NextResponse.json({ error: 'Too many attempts. Please try again in a few minutes.' }, { status: 429 });
  }
  const body = await request.json().catch(() => ({}));
  const orderNumber = typeof body.order_number === 'string' ? body.order_number.trim().replace(/^#/, '').slice(0, 40) : '';
  const token = typeof body.token === 'string' && UUID.test(body.token) ? body.token : null;
  const phone = digits(body.phone);
  if (!orderNumber || (!token && phone.length < 10)) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const db = getServerClient();
  const { data: order } = await db
    .from('orders')
    .select(
      'id, order_number, lookup_token, customer_name, customer_phone, customer_email, customer_address, customer_city, payment_type, subtotal, discount, total, status, created_at, postex_tracking_number'
    )
    .eq('order_number', orderNumber)
    .maybeSingle();

  const full = !!order && !!token && order.lookup_token === token;
  const tracking = !!order && !full && phone.length >= 10 && digits(order.customer_phone) === phone;
  if (!order || (!full && !tracking)) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const { data: items } = await db
    .from('order_items')
    .select('id, product_id, product_name, product_image, price, quantity, total, selected_variant')
    .eq('order_id', order.id);

  const base = {
    order_number: order.order_number,
    customer_name: full ? order.customer_name : order.customer_name.trim().split(' ')[0],
    customer_city: order.customer_city,
    payment_type: order.payment_type,
    subtotal: Number(order.subtotal),
    discount: Number(order.discount),
    total: Number(order.total),
    status: order.status,
    created_at: order.created_at,
    tracking_number: order.postex_tracking_number,
    items: items ?? [],
  };

  return NextResponse.json(
    full
      ? { ...base, full: true, customer_phone: order.customer_phone, customer_email: order.customer_email, customer_address: order.customer_address }
      : { ...base, full: false }
  );
}
