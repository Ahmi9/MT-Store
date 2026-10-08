'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '@/components/store/StoreProvider';
import { Stepper } from '@/components/store/CartDrawer';
import { cartCount, cartSubtotal, formatPrice, lineKey, removeLine, setLineQuantity } from '@/lib/cart';
import { getSiteSettings } from '@/lib/catalog';
import { ArrowRightIcon, BagIcon, GiftIcon, ShieldIcon, TrashIcon, TruckIcon } from '@/components/store/icons';

export default function CartPage() {
  const { cart, hydrated } = useStore();
  const [advanceDiscount, setAdvanceDiscount] = useState(0);

  useEffect(() => {
    getSiteSettings().then((s) => {
      if (s?.advance_payment_discount_enabled) setAdvanceDiscount(Number(s.advance_payment_discount_amount) || 200);
    });
  }, []);

  const subtotal = cartSubtotal(cart);

  if (!hydrated) return <div className="min-h-[60vh]" />;

  if (cart.length === 0) {
    return (
      <div className="container-zs flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 12 }}
          className="relative mb-6 flex h-32 w-32 items-center justify-center rounded-full bg-white text-berry-400 shadow-pop"
        >
          <BagIcon className="h-14 w-14" />
          <motion.span animate={{ y: [0, -8, 0] }} transition={{ duration: 2, repeat: Infinity }} className="absolute -right-2 -top-2 text-3xl">
            💭
          </motion.span>
        </motion.div>
        <h1 className="font-display text-4xl font-semibold text-ink">Your bag is empty</h1>
        <p className="mt-2 max-w-sm font-semibold text-muted">Nothing here yet — go find something that makes you smile.</p>
        <Link href="/products" className="btn-primary mt-8 px-8 py-4">
          Start shopping <ArrowRightIcon className="h-5 w-5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="container-zs py-8 md:py-12">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="font-display text-4xl font-semibold text-ink md:text-5xl">Your bag</h1>
          <p className="mt-1 font-semibold text-muted">
            {cartCount(cart)} item{cartCount(cart) === 1 ? '' : 's'} waiting for you
          </p>
        </div>
        <Link href="/products" className="hidden text-sm font-extrabold text-berry-600 hover:underline sm:block">
          Continue shopping
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {cart.map((item) => {
              const key = lineKey(item);
              const href = item.slug ? `/products/${item.slug}` : null;
              return (
                <motion.li
                  key={key}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -80, transition: { duration: 0.25 } }}
                  className="card-zs flex gap-4 p-3 md:p-4"
                >
                  <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl bg-blush-100 md:h-28 md:w-28">
                    {item.image && <img src={item.image} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        {href ? (
                          <Link href={href} className="line-clamp-2 font-bold text-ink hover:text-berry-600">
                            {item.name}
                          </Link>
                        ) : (
                          <p className="line-clamp-2 font-bold text-ink">{item.name}</p>
                        )}
                        {item.selectedVariant && Object.keys(item.selectedVariant).length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {Object.entries(item.selectedVariant).map(([k, v]) => (
                              <span key={k} className="rounded-full bg-blush-100 px-2.5 py-0.5 text-xs font-bold text-ink-soft">
                                {k}: {v}
                              </span>
                            ))}
                          </div>
                        )}
                        <p className="mt-1 text-sm font-semibold text-muted">{formatPrice(item.price)} each</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLine(key)}
                        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-blush-100 hover:text-berry-600"
                        aria-label={`Remove ${item.name}`}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-auto flex items-center justify-between pt-3">
                      <Stepper value={item.quantity} onChange={(q) => setLineQuantity(key, q)} />
                      <motion.span key={item.quantity} initial={{ scale: 1.15 }} animate={{ scale: 1 }} className="font-display text-xl font-semibold text-ink">
                        {formatPrice(item.price * item.quantity)}
                      </motion.span>
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="card-zs p-6">
            <h2 className="font-display text-2xl font-semibold text-ink">Order summary</h2>
            <dl className="mt-5 space-y-3 text-[15px] font-bold">
              <div className="flex justify-between text-ink-soft">
                <dt>Subtotal</dt>
                <dd className="text-ink">{formatPrice(subtotal)}</dd>
              </div>
              {advanceDiscount > 0 && (
                <div className="flex justify-between gap-4 rounded-2xl bg-blush-100 p-3 text-sm text-ink-soft">
                  <dt className="flex items-center gap-2">
                    <GiftIcon className="h-4 w-4 text-berry-500" /> Advance payment discount
                  </dt>
                  <dd className="whitespace-nowrap text-berry-600">−{formatPrice(advanceDiscount)}*</dd>
                </div>
              )}
            </dl>
            <div className="mt-5 flex items-end justify-between border-t border-dashed border-blush-300 pt-5">
              <span className="font-bold text-ink-soft">Total</span>
              <motion.span key={subtotal} initial={{ scale: 1.1 }} animate={{ scale: 1 }} className="font-display text-3xl font-semibold text-ink">
                {formatPrice(subtotal)}
              </motion.span>
            </div>
            {advanceDiscount > 0 && (
              <p className="mt-2 text-xs font-semibold text-muted">*Applied at checkout when you choose advance payment. Coupons can be added there too.</p>
            )}
            <Link href="/checkout" className="btn-primary mt-6 w-full py-4 text-base">
              Checkout securely <ArrowRightIcon className="h-5 w-5" />
            </Link>
            <div className="mt-5 space-y-2 text-sm font-semibold text-ink-soft">
              <p className="flex items-center gap-2">
                <TruckIcon className="h-4 w-4 text-berry-500" /> Cash on delivery available
              </p>
              <p className="flex items-center gap-2">
                <ShieldIcon className="h-4 w-4 text-berry-500" /> Genuine products, easy returns
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
