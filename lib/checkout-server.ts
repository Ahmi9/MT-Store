import 'server-only';
import { getServerClient } from '@/lib/supabase-server';

export interface CheckoutItemInput {
  product_id: string;
  quantity: number;
  variant: Record<string, string> | null;
}

export interface QuoteLine {
  product_id: string;
  name: string;
  image: string | null;
  price: number;
  quantity: number;
  total: number;
  variant: Record<string, string> | null;
}

export interface Quote {
  lines: QuoteLine[];
  subtotal: number;
  advance_discount: number;
  coupon_discount: number;
  total: number;
  coupon: { code: string; discount_type: 'percentage' | 'fixed'; discount_value: number } | null;
}

const MESSAGES: Record<string, (detail?: string, hint?: string) => string> = {
  empty_cart: () => 'Your bag is empty.',
  bad_quantity: () => 'Please check the quantities in your bag.',
  invalid_payment: () => 'Please choose a payment method.',
  product_unavailable: () => 'Something in your bag is no longer available. Please remove it and try again.',
  choose_options: (d) => `Please choose options for ${d ?? 'an item'} again.`,
  variant_unavailable: (d) => `The option you picked for ${d ?? 'an item'} is no longer available.`,
  out_of_stock: (d, h) => (Number(h) > 0 ? `Only ${h} left of ${d}. Please lower the quantity.` : `${d ?? 'An item'} just sold out.`),
  coupon_invalid: () => 'That coupon code isn’t valid.',
  coupon_expired: () => 'This coupon has expired.',
  coupon_used_up: () => 'This coupon has reached its usage limit.',
  coupon_min_order: (d) => `This coupon needs a minimum order of Rs. ${Number(d).toLocaleString('en-PK')}.`,
  invalid_customer: () => 'Please check your name, phone, address and city.',
  too_many_orders: () => 'You already have 3 open orders with this phone number. We’ll contact you to confirm them — or message us on WhatsApp.',
};

export class CheckoutError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
  }
}

/** Sanitises untrusted input from the browser into the shape checkout() expects. */
export function parseItems(raw: unknown): CheckoutItemInput[] {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 50) throw new CheckoutError('empty_cart', MESSAGES.empty_cart());
  return raw.map((r) => {
    const item = r as Record<string, unknown>;
    const variant = item.variant && typeof item.variant === 'object' && !Array.isArray(item.variant) ? item.variant : null;
    const cleanVariant = variant
      ? Object.fromEntries(Object.entries(variant as Record<string, unknown>).map(([k, v]) => [String(k).slice(0, 60), String(v).slice(0, 60)]))
      : null;
    return {
      product_id: String(item.product_id ?? ''),
      quantity: Math.trunc(Number(item.quantity)),
      variant: cleanVariant && Object.keys(cleanVariant).length ? cleanVariant : null,
    };
  });
}

export async function runCheckout(payload: Record<string, unknown>, place: boolean) {
  const { data, error } = await getServerClient().rpc('checkout', { payload, place });
  if (error) {
    const make = MESSAGES[error.message];
    if (make) throw new CheckoutError(error.message, make(error.details ?? undefined, error.hint ?? undefined));
    console.error('checkout() failed:', error);
    throw new CheckoutError('server', 'We couldn’t process your order right now. Please try again in a moment.');
  }
  return data;
}
