import { publicClient } from '@/lib/supabase';
import { withDealPrice, type DealSettings } from '@/lib/deal';

export interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  original_price: number | null;
  images: string[] | null;
  category_id: string | null;
  is_featured: boolean;
  stock: number | null;
  created_at?: string;
  description?: string | null;
  specs?: Record<string, string> | null;
}

export interface CatalogProduct extends Product {
  category_name: string | null;
  rating: { avg: number; count: number } | null;
  hasVariants: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  display_order: number;
  is_active: boolean;
}

export interface SiteSettings extends DealSettings {
  store_name: string | null;
  whatsapp_number: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  announcement_bar_active: boolean | null;
  announcement_text_white: string | null;
  announcement_text_gold: string | null;
  advance_payment_discount_enabled: boolean | null;
  advance_payment_discount_amount: number | null;
}

export const PRODUCT_FIELDS =
  'id, name, slug, price, original_price, images, category_id, is_featured, stock, created_at';

// Settings and categories are shown by several components on every page;
// share one request per page load instead of each component fetching.
let settingsPromise: Promise<SiteSettings | null> | null = null;
let categoriesPromise: Promise<Category[]> | null = null;

export function getSiteSettings() {
  if (!settingsPromise) {
    settingsPromise = Promise.resolve(
      publicClient.from('site_settings').select('*').single()
    ).then(({ data }) => (data as SiteSettings) ?? null);
  }
  return settingsPromise;
}

export function getCategories() {
  if (!categoriesPromise) {
    categoriesPromise = Promise.resolve(
      publicClient
        .from('categories')
        .select('id, name, slug, parent_id, display_order, is_active')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
    ).then(({ data }) => (data as Category[]) ?? []);
  }
  return categoriesPromise;
}

export function categoryWithChildren(categories: Category[], id: string) {
  return [id, ...categories.filter((c) => c.parent_id === id).map((c) => c.id)];
}

// Adds category name, review average and "has variants" to raw product rows.
export async function enrichProducts(products: Product[]): Promise<CatalogProduct[]> {
  if (products.length === 0) return [];
  const ids = products.map((p) => p.id);

  const [categories, attrsRes, reviewsRes, settings] = await Promise.all([
    getCategories(),
    publicClient.from('product_attributes').select('product_id').in('product_id', ids),
    publicClient
      .from('product_reviews')
      .select('product_id, rating')
      .in('product_id', ids)
      .eq('is_approved', true),
    getSiteSettings(),
  ]);

  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const withVariants = new Set((attrsRes.data ?? []).map((a: { product_id: string }) => a.product_id));

  const ratings = new Map<string, number[]>();
  for (const r of (reviewsRes.data ?? []) as { product_id: string; rating: number }[]) {
    const list = ratings.get(r.product_id) ?? [];
    list.push(r.rating);
    ratings.set(r.product_id, list);
  }

  return products.map((p) => {
    const list = ratings.get(p.id);
    const priced = withDealPrice({ ...p, price: Number(p.price), original_price: p.original_price ? Number(p.original_price) : null }, settings);
    return {
      ...priced,
      category_name: p.category_id ? categoryName.get(p.category_id) ?? null : null,
      rating: list ? { avg: list.reduce((a, b) => a + b, 0) / list.length, count: list.length } : null,
      hasVariants: withVariants.has(p.id),
    };
  });
}
