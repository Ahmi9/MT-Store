import { NextResponse } from 'next/server';
import { CheckoutError, parseItems, runCheckout, type Quote } from '@/lib/checkout-server';
import { clientIp, rateLimited } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// Prices, discounts and stock as the server sees them. The checkout page
// shows these numbers; the browser's cart prices are never trusted.
export async function POST(request: Request) {
  if (rateLimited(`quote:${clientIp(request)}`, 60, 60_000)) {
    return NextResponse.json({ error: 'Too many requests, please slow down.' }, { status: 429 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const quote = (await runCheckout(
      {
        items: parseItems(body.items),
        payment_type: body.payment_type === 'advance' ? 'advance' : 'cod',
        coupon_code: typeof body.coupon_code === 'string' ? body.coupon_code.slice(0, 40) : null,
      },
      false
    )) as Quote;
    return NextResponse.json(quote);
  } catch (err) {
    if (err instanceof CheckoutError) return NextResponse.json({ error: err.message, code: err.code }, { status: 400 });
    console.error('quote failed:', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
