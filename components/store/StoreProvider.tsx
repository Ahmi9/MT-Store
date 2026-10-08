'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CART_EVENT,
  WISHLIST_EVENT,
  addToCart as addLine,
  getCart,
  getWishlist,
  toggleWishlist as toggleWish,
  type CartItem,
  type WishlistItem,
} from '@/lib/cart';
import { HeartIcon, CheckIcon } from '@/components/store/icons';

interface Toast {
  id: number;
  title: string;
  image?: string | null;
  kind: 'cart' | 'wish' | 'info';
}

interface StoreContextValue {
  cart: CartItem[];
  wishlist: WishlistItem[];
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  addToCart: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  toggleWishlist: (item: WishlistItem) => void;
  isWished: (id: string) => boolean;
  notify: (title: string, kind?: Toast['kind'], image?: string | null) => void;
  cartBump: number;
  hydrated: boolean;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}

export default function StoreProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [cartBump, setCartBump] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const toastId = useRef(0);

  useEffect(() => {
    const syncCart = () => setCart(getCart());
    const syncWish = () => setWishlist(getWishlist());
    syncCart();
    syncWish();
    setHydrated(true);
    window.addEventListener(CART_EVENT, syncCart);
    window.addEventListener(WISHLIST_EVENT, syncWish);
    // keep tabs in sync
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'cart') syncCart();
      if (e.key === 'wishlist') syncWish();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(CART_EVENT, syncCart);
      window.removeEventListener(WISHLIST_EVENT, syncWish);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const notify = useCallback((title: string, kind: Toast['kind'] = 'info', image?: string | null) => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id, title, kind, image }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);

  const addToCart = useCallback(
    (item: Omit<CartItem, 'quantity'>, quantity = 1) => {
      addLine(item, quantity);
      setCartBump((n) => n + 1);
      notify(`${item.name} added to bag`, 'cart', item.image);
      if (typeof window !== 'undefined' && window.fbq) {
        window.fbq('track', 'AddToCart', {
          content_name: item.name,
          content_ids: [item.id],
          content_type: 'product',
          value: item.price * quantity,
          currency: 'PKR',
        });
      }
    },
    [notify]
  );

  const toggleWishlist = useCallback(
    (item: WishlistItem) => {
      const added = toggleWish(item);
      notify(added ? 'Saved to your wishlist' : 'Removed from wishlist', 'wish', item.image);
    },
    [notify]
  );

  const isWished = useCallback((id: string) => wishlist.some((w) => w.id === id), [wishlist]);

  return (
    <StoreContext.Provider
      value={{
        cart,
        wishlist,
        cartOpen,
        setCartOpen,
        searchOpen,
        setSearchOpen,
        addToCart,
        toggleWishlist,
        isWished,
        notify,
        cartBump,
        hydrated,
      }}
    >
      {children}

      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[80] flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:pr-6">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 24, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border border-line bg-white/95 p-2.5 pr-4 shadow-pop backdrop-blur"
            >
              {t.image ? (
                <img src={t.image} alt="" className="h-11 w-11 flex-shrink-0 rounded-xl object-cover" />
              ) : (
                <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-blush-100 text-berry-600">
                  {t.kind === 'wish' ? <HeartIcon className="h-5 w-5" filled /> : <CheckIcon className="h-5 w-5" />}
                </span>
              )}
              <p className="flex-1 text-sm font-bold text-ink line-clamp-2">{t.title}</p>
              {t.kind === 'cart' && (
                <button
                  type="button"
                  onClick={() => setCartOpen(true)}
                  className="text-xs font-extrabold text-berry-600 hover:underline"
                >
                  View bag
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </StoreContext.Provider>
  );
}

declare global {
  interface Window {
    fbq?: (event: string, eventName: string, data?: Record<string, unknown>) => void;
  }
}
