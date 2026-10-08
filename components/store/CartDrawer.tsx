'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '@/components/store/StoreProvider';
import { cartCount, cartSubtotal, formatPrice, lineKey, removeLine, setLineQuantity } from '@/lib/cart';
import { getSiteSettings } from '@/lib/catalog';
import { BagIcon, GiftIcon, MinusIcon, PlusIcon, TrashIcon, XIcon } from '@/components/store/icons';

export default function CartDrawer() {
  const pathname = usePathname();
  const { cart, cartOpen, setCartOpen } = useStore();
  const [advanceDiscount, setAdvanceDiscount] = useState(0);

  useEffect(() => {
    getSiteSettings().then((s) => {
      if (s?.advance_payment_discount_enabled) setAdvanceDiscount(Number(s.advance_payment_discount_amount) || 200);
    });
  }, []);

  useEffect(() => {
    setCartOpen(false);
  }, [pathname, setCartOpen]);

  useEffect(() => {
    document.body.style.overflow = cartOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [cartOpen]);

  const subtotal = cartSubtotal(cart);

  return (
    <AnimatePresence>
      {cartOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCartOpen(false)}
            className="fixed inset-0 z-[65] bg-ink/40 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className="fixed bottom-0 right-0 top-0 z-[66] flex w-full max-w-md flex-col bg-blush-50 sm:rounded-l-[32px]"
            role="dialog"
            aria-label="Shopping bag"
          >
            <div className="flex items-center justify-between px-5 pb-3 pt-5">
              <div>
                <h2 className="font-display text-2xl font-semibold text-ink">Your bag</h2>
                <p className="text-sm font-semibold text-muted">
                  {cartCount(cart)} item{cartCount(cart) === 1 ? '' : 's'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCartOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink transition-transform hover:rotate-90"
                aria-label="Close bag"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            {advanceDiscount > 0 && cart.length > 0 && (
              <div className="mx-5 mb-2 flex items-center gap-2 rounded-2xl bg-gradient-to-r from-lilac to-blush-100 px-4 py-3 text-sm font-bold text-ink-soft">
                <GiftIcon className="h-5 w-5 flex-shrink-0 text-berry-500" />
                Pay in advance at checkout & save {formatPrice(advanceDiscount)}
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-5 py-2">
              {cart.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <motion.div
                    animate={{ y: [0, -10, 0], rotate: [0, -6, 6, 0] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-white text-berry-400 shadow-soft"
                  >
                    <BagIcon className="h-11 w-11" />
                  </motion.div>
                  <p className="font-display text-2xl text-ink">Your bag feels light</p>
                  <p className="mb-6 mt-1 text-sm text-muted">Let’s fill it with something cute ✨</p>
                  <Link href="/products" className="btn-primary px-7 py-3 text-sm">
                    Start shopping
                  </Link>
                </div>
              ) : (
                <ul className="space-y-3">
                  <AnimatePresence initial={false}>
                    {cart.map((item) => {
                      const key = lineKey(item);
                      return (
                        <motion.li
                          key={key}
                          layout
                          initial={{ opacity: 0, x: 30 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 60, height: 0, marginTop: 0 }}
                          className="flex gap-3 rounded-3xl bg-white p-3"
                        >
                          <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl bg-blush-100">
                            {item.image && <img src={item.image} alt="" className="h-full w-full object-cover" />}
                          </div>
                          <div className="flex min-w-0 flex-1 flex-col">
                            <div className="flex items-start justify-between gap-2">
                              <p className="line-clamp-2 text-sm font-bold text-ink">{item.name}</p>
                              <button
                                type="button"
                                onClick={() => removeLine(key)}
                                className="text-muted transition-colors hover:text-berry-600"
                                aria-label={`Remove ${item.name}`}
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                            {item.selectedVariant && Object.keys(item.selectedVariant).length > 0 && (
                              <p className="mt-0.5 text-xs font-semibold text-muted">
                                {Object.entries(item.selectedVariant)
                                  .map(([k, v]) => `${k}: ${v}`)
                                  .join(' · ')}
                              </p>
                            )}
                            <div className="mt-auto flex items-center justify-between pt-2">
                              <Stepper value={item.quantity} onChange={(q) => setLineQuantity(key, q)} />
                              <span className="font-extrabold text-berry-600">{formatPrice(item.price * item.quantity)}</span>
                            </div>
                          </div>
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                </ul>
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t border-line bg-white px-5 pb-6 pt-4 sm:rounded-bl-[32px]">
                <div className="mb-4 flex items-center justify-between">
                  <span className="font-bold text-ink-soft">Subtotal</span>
                  <motion.span key={subtotal} initial={{ scale: 1.15 }} animate={{ scale: 1 }} className="font-display text-2xl font-semibold text-ink">
                    {formatPrice(subtotal)}
                  </motion.span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Link href="/cart" className="btn-ghost py-3 text-sm">
                    View bag
                  </Link>
                  <Link href="/checkout" className="btn-primary py-3 text-sm">
                    Checkout
                  </Link>
                </div>
                <p className="mt-3 text-center text-xs font-semibold text-muted">Cash on delivery available nationwide 🚚</p>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export function Stepper({ value, onChange, size = 'sm' }: { value: number; onChange: (v: number) => void; size?: 'sm' | 'lg' }) {
  const box = size === 'lg' ? 'h-12 w-12' : 'h-8 w-8';
  return (
    <div className="flex items-center gap-1 rounded-full bg-blush-100 p-1">
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={value <= 1}
        className={`${box} flex items-center justify-center rounded-full bg-white text-ink transition-transform active:scale-90 disabled:opacity-40`}
        aria-label="Decrease quantity"
      >
        <MinusIcon className="h-3.5 w-3.5" />
      </button>
      <motion.span key={value} initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className={`${size === 'lg' ? 'w-10 text-lg' : 'w-7 text-sm'} text-center font-extrabold text-ink`}>
        {value}
      </motion.span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className={`${box} flex items-center justify-center rounded-full bg-white text-ink transition-transform active:scale-90`}
        aria-label="Increase quantity"
      >
        <PlusIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
