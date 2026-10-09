'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { discountPercent, formatPrice } from '@/lib/cart';
import { DEAL_DEFAULTS, dealCountdownEnd, type DealSettings } from '@/lib/deal';
import { ArrowRightIcon, BagIcon, ClockIcon } from '@/components/store/icons';

export interface DealProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  original_price: number | null;
  images: string[] | null;
  hasVariants?: boolean;
}

/**
 * The homepage "Deal of the day" card. Everything on it comes from
 * Admin → Deal of the day; the admin page renders it as a live preview.
 * `product` already has the deal price applied (withDealPrice).
 */
export default function DealSpotlight({
  product,
  settings,
  onAdd,
  onExpire,
  preview = false,
}: {
  product: DealProduct;
  settings: DealSettings | null;
  onAdd?: () => void;
  onExpire?: () => void;
  preview?: boolean;
}) {
  const [left, setLeft] = useState<number | null>(null);
  const off = discountPercent(product.price, product.original_price);
  const timer = settings?.deal_timer ?? 'midnight';
  const endsAt = settings?.deal_ends_at;

  useEffect(() => {
    if (timer === 'none') return;
    let expired = false;
    const tick = () => {
      const end = dealCountdownEnd({ deal_timer: timer, deal_ends_at: endsAt });
      const ms = end ? Math.max(0, end.getTime() - Date.now()) : 0;
      setLeft(ms);
      // a deal with an end time disappears once it's over
      if (timer === 'until' && ms === 0 && !expired) {
        expired = true;
        onExpire?.();
      }
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [timer, endsAt, onExpire]);

  const days = left === null ? 0 : Math.floor(left / 864e5);
  const units =
    left === null
      ? [['--', 'hours'], ['--', 'mins'], ['--', 'secs']]
      : days > 0
        ? [[days, 'days'], [(left / 36e5) % 24, 'hours'], [(left / 6e4) % 60, 'mins'], [(left / 1e3) % 60, 'secs']]
        : [[left / 36e5, 'hours'], [(left / 6e4) % 60, 'mins'], [(left / 1e3) % 60, 'secs']];
  const parts = units.map(([n, label]) => [typeof n === 'number' ? String(Math.floor(n)).padStart(2, '0') : n, label] as const);

  const image = settings?.deal_image?.trim() || product.images?.[0];
  const title = settings?.deal_title?.trim() || product.name;
  const subtitle = settings?.deal_subtitle?.trim();
  const badge = settings?.deal_badge?.trim() || DEAL_DEFAULTS.badge;
  const button = settings?.deal_button_text?.trim() || DEAL_DEFAULTS.button;
  const productHref = preview ? undefined : `/products/${product.slug}`;

  return (
    <section className={preview ? '' : 'container-zs py-16 md:py-20'}>
      <motion.div
        initial={preview ? false : { opacity: 0, scale: 0.96 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="relative grid overflow-hidden rounded-[36px] bg-ink md:grid-cols-2"
      >
        <div className="absolute -left-20 -top-20 h-80 w-80 animate-blob bg-berry-500/40 blur-3xl" />
        <div className="relative z-10 order-2 p-7 md:order-1 md:p-12">
          <span className="chip bg-berry-400 text-white">
            <ClockIcon className="h-3.5 w-3.5" /> {badge}
          </span>
          <h2 className="mt-4 font-display text-3xl font-semibold leading-tight text-white md:text-5xl">{title}</h2>
          {subtitle && <p className="mt-3 max-w-md font-semibold text-white/70">{subtitle}</p>}
          <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-2">
            <span className="whitespace-nowrap font-display text-3xl font-semibold text-berry-400 md:text-4xl">{formatPrice(product.price)}</span>
            {off > 0 && (
              <>
                <span className="whitespace-nowrap text-lg font-bold text-white/40 line-through">{formatPrice(product.original_price!)}</span>
                <span className="chip bg-white text-berry-600">Save {off}%</span>
              </>
            )}
          </div>

          {timer !== 'none' && (
            <div className="mt-7 flex gap-2 md:gap-3">
              {parts.map(([v, label]) => (
                <div key={label} className="w-[64px] rounded-2xl bg-white/10 py-3 text-center backdrop-blur md:w-20">
                  <motion.p key={v} initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="font-display text-3xl font-semibold tabular-nums text-white">
                    {v}
                  </motion.p>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-white/50">{label}</p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            {product.hasVariants ? (
              <Link href={productHref ?? '#'} onClick={(e) => preview && e.preventDefault()} className="btn-primary px-7 py-3.5">
                Choose options <ArrowRightIcon className="h-5 w-5" />
              </Link>
            ) : (
              <button type="button" onClick={() => !preview && onAdd?.()} className="btn-primary px-7 py-3.5">
                <BagIcon className="h-5 w-5" /> {button}
              </button>
            )}
            <Link
              href={productHref ?? '#'}
              onClick={(e) => preview && e.preventDefault()}
              className="inline-flex items-center gap-2 rounded-full px-5 py-3.5 font-extrabold text-white/80 hover:text-white"
            >
              View details
            </Link>
          </div>
        </div>
        <div className="relative order-1 min-h-[280px] md:order-2">
          {image && <img src={image} alt={product.name} className="absolute inset-0 h-full w-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent md:bg-gradient-to-r" />
          {off > 0 && (
            <motion.span
              animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.06, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute right-5 top-5 flex h-20 w-20 items-center justify-center rounded-full bg-berry-400 text-center font-display text-xl font-semibold leading-none text-white shadow-pop"
            >
              -{off}%
            </motion.span>
          )}
        </div>
      </motion.div>
    </section>
  );
}
