import { NextResponse } from 'next/server';
import { CheckoutError, parseItems, runCheckout } from '@/lib/checkout-server';
import { clientIp, rateLimited } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// Places an order. Everything money- or stock-related is computed inside the
// checkout() database function; the browser only says what it wants to buy.
export async function POST(request: Request) {
  if (rateLimited(`order:${clientIp(request)}`, 8, 10 * 60_000)) {
    return NextResponse.json({ error: 'Too many orders from this connection. Please try again later.' }, { status: 429 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const customer = (body.customer ?? {}) as Record<string, unknown>;
    const result = (await runCheckout(
      {
        items: parseItems(body.items),
        payment_type: body.payment_type === 'advance' ? 'advance' : 'cod',
        coupon_code: typeof body.coupon_code === 'string' ? body.coupon_code.slice(0, 40) : null,
        customer: {
          name: text(customer.name, 100),
          phone: text(customer.phone, 30),
          email: text(customer.email, 200),
          address: text(customer.address, 500),
          city: text(customer.city, 80),
        },
      },
      true
    )) as { order_number: string; token: string; total: number };
    return NextResponse.json({ order_number: result.order_number, token: result.token, total: result.total });
  } catch (err) {
    if (err instanceof CheckoutError) return NextResponse.json({ error: err.message, code: err.code }, { status: 400 });
    console.error('order failed:', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
