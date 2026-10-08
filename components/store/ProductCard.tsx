'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import type { CatalogProduct } from '@/lib/catalog';
import { discountPercent, formatPrice } from '@/lib/cart';
import { useStore } from '@/components/store/StoreProvider';
import VariantPickerModal from '@/components/VariantPickerModal';
import { BagIcon, HeartIcon, PlusIcon, StarIcon } from '@/components/store/icons';

const NEW_DAYS = 21;

export default function ProductCard({ product, index = 0 }: { product: CatalogProduct; index?: number }) {
  const { addToCart, toggleWishlist, isWished } = useStore();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [burst, setBurst] = useState(0);

  const wished = isWished(product.id);
  const off = discountPercent(product.price, product.original_price);
  const outOfStock = !product.hasVariants && (product.stock ?? 0) <= 0;
  const isNew = product.created_at ? Date.now() - new Date(product.created_at).getTime() < NEW_DAYS * 864e5 : false;
  const [first, second] = product.images ?? [];

  const onAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.hasVariants) {
      setPickerOpen(true);
      return;
    }
    addToCart({ id: product.id, name: product.name, price: product.price, image: first ?? null, slug: product.slug });
  };

  const onWish = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!wished) setBurst((b) => b + 1);
    toggleWishlist({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      original_price: product.original_price,
      image: first ?? null,
    });
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.5, delay: Math.min(index % 8, 7) * 0.06, ease: [0.22, 1, 0.36, 1] }}
        className="h-full"
      >
        <Link
          href={`/products/${product.slug}`}
          className="group relative flex h-full flex-col overflow-hidden rounded-[28px] border border-line bg-white p-2 transition-all duration-300 hover:-translate-y-1.5 hover:border-blush-300 hover:shadow-pop"
        >
          <div className="relative aspect-square overflow-hidden rounded-[22px] bg-gradient-to-br from-blush-100 to-blush-200">
            {first ? (
              <>
                <img
                  src={first}
                  alt={product.name}
                  loading="lazy"
                  className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 group-hover:scale-110 ${second ? 'group-hover:opacity-0' : ''}`}
                />
                {second && (
                  <img
                    src={second}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 h-full w-full scale-110 object-cover opacity-0 transition-all duration-700 group-hover:scale-100 group-hover:opacity-100"
                  />
                )}
              </>
            ) : (
              <div className="flex h-full w-full items-center justify-center text-berry-400/60">
                <BagIcon className="h-16 w-16" />
              </div>
            )}

            <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">
              {off > 0 && <span className="chip bg-berry-500 text-white shadow-soft">-{off}%</span>}
              {isNew && <span className="chip bg-white text-ink">New ✨</span>}
            </div>

            <button
              type="button"
              onClick={onWish}
              className="absolute right-2.5 top-2.5 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-berry-500 shadow-soft backdrop-blur transition-transform hover:scale-110 active:scale-90"
              aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <motion.span key={String(wished)} initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 12 }}>
                <HeartIcon className="h-5 w-5" filled={wished} />
              </motion.span>
              <AnimatePresence>
                {burst > 0 && (
                  <motion.span key={burst} className="pointer-events-none absolute inset-0" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.7 }}>
                    {Array.from({ length: 6 }).map((_, i) => {
                      const angle = (i / 6) * Math.PI * 2;
                      return (
                        <motion.span
                          key={i}
                          className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-berry-400"
                          initial={{ x: -3, y: -3, scale: 1 }}
                          animate={{ x: Math.cos(angle) * 22 - 3, y: Math.sin(angle) * 22 - 3, scale: 0 }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                        />
                      );
                    })}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            {outOfStock && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/55 backdrop-blur-[2px]">
                <span className="chip bg-ink text-white">Sold out</span>
              </div>
            )}

            {!outOfStock && (
              <div className="absolute inset-x-2.5 bottom-2.5 hidden translate-y-[130%] transition-transform duration-300 group-hover:translate-y-0 md:block">
                <button type="button" onClick={onAdd} className="btn-primary w-full py-2.5 text-sm">
                  <BagIcon className="h-4 w-4" />
                  {product.hasVariants ? 'Choose options' : 'Add to bag'}
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-1 flex-col px-2 pb-2 pt-3">
            {product.category_name && (
              <p className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-berry-500">{product.category_name}</p>
            )}
            <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-ink transition-colors group-hover:text-berry-600">{product.name}</h3>

            <div className="mt-1.5 flex items-center gap-1">
              {product.rating ? (
                <>
                  <StarIcon className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-xs font-extrabold text-ink">{product.rating.avg.toFixed(1)}</span>
                  <span className="text-xs font-semibold text-muted">({product.rating.count})</span>
                </>
              ) : (
                <span className="text-xs font-semibold text-muted">Be the first to review</span>
              )}
            </div>

            <div className="mt-auto flex items-end justify-between gap-2 pt-3">
              <div className="leading-tight">
                <p className="font-display text-lg font-semibold text-ink">{formatPrice(product.price)}</p>
                {off > 0 && <p className="text-xs font-semibold text-muted line-through">{formatPrice(product.original_price!)}</p>}
              </div>
              {!outOfStock && (
                <motion.button
                  type="button"
                  onClick={onAdd}
                  whileTap={{ scale: 0.85, rotate: 90 }}
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-ink text-white transition-colors hover:bg-berry-500 md:hidden"
                  aria-label={`Add ${product.name} to bag`}
                >
                  <PlusIcon className="h-4 w-4" />
                </motion.button>
              )}
            </div>
          </div>
        </Link>
      </motion.div>

      {product.hasVariants && (
        <VariantPickerModal
          product={product}
          isOpen={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onAdd={(variant, price) => {
            addToCart({ id: product.id, name: product.name, price, image: first ?? null, slug: product.slug, selectedVariant: variant });
            setPickerOpen(false);
          }}
        />
      )}
    </>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="rounded-[28px] border border-line bg-white p-2">
      <div className="skeleton aspect-square rounded-[22px]" />
      <div className="space-y-2 px-2 pb-2 pt-3">
        <div className="skeleton h-3 w-1/3 rounded" />
        <div className="skeleton h-4 w-full rounded" />
        <div className="skeleton h-5 w-1/2 rounded" />
      </div>
    </div>
  );
}
