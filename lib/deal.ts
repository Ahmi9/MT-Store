// Deal of the day, managed from Admin → Deal of the day. The price rules here
// match public.deal_price() in the database, which checkout charges.

import { discountPercent } from '@/lib/cart';

export type DealTimer = 'midnight' | 'until' | 'none';

export interface DealSettings {
  deal_enabled?: boolean | null;
  deal_product_id?: string | null;
  deal_price?: number | string | null;
  deal_timer?: DealTimer | null;
  deal_ends_at?: string | null;
  deal_badge?: string | null;
  deal_title?: string | null;
  deal_subtitle?: string | null;
  deal_button_text?: string | null;
  deal_image?: string | null;
}

export const DEAL_DEFAULTS = {
  badge: 'Deal of the day',
  button: 'Grab the deal',
};

/** Off, or past its end time. Settings saved before the deal columns existed count as on. */
export function dealIsLive(s: DealSettings | null | undefined, now = Date.now()): boolean {
  if (!s || s.deal_enabled === false) return false;
  if (s.deal_timer === 'until') return !!s.deal_ends_at && new Date(s.deal_ends_at).getTime() > now;
  return true;
}

/** The special price of this product while its deal is live, otherwise null. */
export function dealPriceFor(s: DealSettings | null | undefined, productId: string, now = Date.now()): number | null {
  if (!s || !dealIsLive(s, now) || s.deal_product_id !== productId || s.deal_price == null || s.deal_price === '') return null;
  const price = Number(s.deal_price);
  return price > 0 ? price : null;
}

/** Product with its deal price applied; the old price becomes the struck-out one. */
export function withDealPrice<T extends { id: string; price: number; original_price: number | null }>(product: T, s: DealSettings | null | undefined): T {
  const deal = dealPriceFor(s, product.id);
  if (deal === null) return product;
  return { ...product, price: deal, original_price: Math.max(product.original_price ?? 0, product.price) || null };
}

/** The product the card shows: the one the admin picked, or the biggest discount. */
export function pickDealProduct<T extends { id: string; price: number; original_price: number | null; images: string[] | null }>(
  products: T[],
  s: DealSettings | null | undefined
): T | null {
  if (!dealIsLive(s)) return null;
  if (s?.deal_product_id) return products.find((p) => p.id === s.deal_product_id) ?? null;
  return (
    [...products]
      .filter((p) => (p.images?.length ?? 0) > 0 && discountPercent(p.price, p.original_price) > 0)
      .sort((a, b) => discountPercent(b.price, b.original_price) - discountPercent(a.price, a.original_price))[0] ?? null
  );
}

/** When the countdown reaches zero, or null when there's no countdown. */
export function dealCountdownEnd(s: DealSettings | null | undefined, now = new Date()): Date | null {
  const timer = s?.deal_timer ?? 'midnight';
  if (timer === 'none') return null;
  if (timer === 'until') return s?.deal_ends_at ? new Date(s.deal_ends_at) : null;
  const end = new Date(now);
  end.setHours(24, 0, 0, 0);
  return end;
}
