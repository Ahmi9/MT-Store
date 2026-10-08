'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '@/components/store/StoreProvider';
import { discountPercent, formatPrice } from '@/lib/cart';
import PageHero from '@/components/store/PageHero';
import { ArrowRightIcon, BagIcon, HeartIcon, XIcon } from '@/components/store/icons';

export default function WishlistPage() {
  const { wishlist, toggleWishlist, hydrated } = useStore();

  return (
    <div>
      <PageHero
        eyebrow="Saved for later"
        title="Your wishlist"
        subtitle={hydrated && wishlist.length > 0 ? `${wishlist.length} little thing${wishlist.length === 1 ? '' : 's'} you’re crushing on` : 'Tap the heart on any product to save it here.'}
      />

      <div className="container-zs pb-6">
        {!hydrated ? null : wishlist.length === 0 ? (
          <div className="mx-auto max-w-md py-10 text-center">
            <motion.div
              animate={{ scale: [1, 1.15, 1, 1.1, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 0.6 }}
              className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-white text-berry-400 shadow-pop"
            >
              <HeartIcon className="h-11 w-11" filled />
            </motion.div>
            <p className="font-display text-2xl text-ink">No favourites yet</p>
            <p className="mt-1 font-semibold text-muted">Start exploring and save what you love.</p>
            <Link href="/products" className="btn-primary mt-7 px-8 py-3.5">
              Explore the shop <ArrowRightIcon className="h-5 w-5" />
            </Link>
          </div>
        ) : (
          <motion.ul layout className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">
            <AnimatePresence>
              {wishlist.map((item, i) => {
                const off = discountPercent(item.price, item.original_price);
                return (
                  <motion.li
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0, transition: { delay: i * 0.04 } }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="group relative overflow-hidden rounded-[28px] border border-line bg-white p-2"
                  >
                    <Link href={`/products/${item.slug}`} className="block">
                      <div className="relative aspect-square overflow-hidden rounded-[22px] bg-blush-100">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-berry-400">
                            <BagIcon className="h-12 w-12" />
                          </div>
                        )}
                        {off > 0 && <span className="chip absolute left-2.5 top-2.5 bg-berry-500 text-white">-{off}%</span>}
                      </div>
                      <div className="px-2 pb-2 pt-3">
                        <p className="line-clamp-2 font-bold text-ink group-hover:text-berry-600">{item.name}</p>
                        <p className="mt-1 font-display text-lg font-semibold text-ink">{formatPrice(item.price)}</p>
                      </div>
                    </Link>
                    <button
                      type="button"
                      onClick={() => toggleWishlist(item)}
                      className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-ink shadow-soft transition-transform hover:rotate-90 hover:text-berry-600"
                      aria-label={`Remove ${item.name} from wishlist`}
                    >
                      <XIcon className="h-4 w-4" />
                    </button>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </motion.ul>
        )}
      </div>
    </div>
  );
}
