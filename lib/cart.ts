// Cart and wishlist live in localStorage. The checkout page reads the same
// `cart` key, so the item shape here must stay compatible with it.

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string | null;
  quantity: number;
  slug?: string;
  selectedVariant?: Record<string, string> | null;
}

export interface WishlistItem {
  id: string;
  name: string;
  slug: string;
  price: number;
  original_price: number | null;
  image: string | null;
}

export const CART_EVENT = 'cartUpdated';
export const WISHLIST_EVENT = 'wishlistUpdated';

function read<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(key: string, value: unknown, event: string) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or blocked — the UI still updates from memory
  }
  window.dispatchEvent(new Event(event));
}

// Two cart lines are the same only if product and chosen variant match.
export function lineKey(item: Pick<CartItem, 'id' | 'selectedVariant'>) {
  return `${item.id}::${JSON.stringify(item.selectedVariant ?? null)}`;
}

export function getCart(): CartItem[] {
  return read<CartItem>('cart');
}

export function addToCart(item: Omit<CartItem, 'quantity'>, quantity = 1) {
  const cart = getCart();
  const key = lineKey(item);
  const existing = cart.find((c) => lineKey(c) === key);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({ ...item, selectedVariant: item.selectedVariant ?? null, quantity });
  }
  write('cart', cart, CART_EVENT);
}

export function setLineQuantity(key: string, quantity: number) {
  if (quantity < 1) return;
  const cart = getCart().map((c) => (lineKey(c) === key ? { ...c, quantity } : c));
  write('cart', cart, CART_EVENT);
}

export function removeLine(key: string) {
  write('cart', getCart().filter((c) => lineKey(c) !== key), CART_EVENT);
}

export function cartCount(cart: CartItem[]) {
  return cart.reduce((sum, c) => sum + (c.quantity || 0), 0);
}

export function cartSubtotal(cart: CartItem[]) {
  return cart.reduce((sum, c) => sum + c.price * c.quantity, 0);
}

export function getWishlist(): WishlistItem[] {
  return read<WishlistItem>('wishlist');
}

export function toggleWishlist(item: WishlistItem): boolean {
  const list = getWishlist();
  const exists = list.some((w) => w.id === item.id);
  const next = exists ? list.filter((w) => w.id !== item.id) : [item, ...list];
  write('wishlist', next, WISHLIST_EVENT);
  return !exists;
}

export function formatPrice(value: number) {
  return `Rs. ${Math.round(value).toLocaleString('en-PK')}`;
}

export function discountPercent(price: number, original: number | null | undefined) {
  if (!original || original <= price) return 0;
  return Math.round(((original - price) / original) * 100);
}
