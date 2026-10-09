'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { publicClient } from '@/lib/supabase';
import {
  PRODUCT_FIELDS,
  categoryWithChildren,
  enrichProducts,
  getCategories,
  getSiteSettings,
  type CatalogProduct,
  type Category,
  type Product,
} from '@/lib/catalog';
import { discountPercent, formatPrice } from '@/lib/cart';
import { BRAND } from '@/lib/brand';
import ProductCard, { ProductCardSkeleton } from '@/components/store/ProductCard';
import { useStore } from '@/components/store/StoreProvider';
import {
  ArrowRightIcon,
  BagIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  GiftIcon,
  HeartIcon,
  ReturnIcon,
  ShieldIcon,
  SparkleIcon,
  StarIcon,
  TruckIcon,
  WhatsAppIcon,
} from '@/components/store/icons';

interface Review {
  id: string;
  product_id: string;
  customer_name: string;
  customer_city: string | null;
  review_text: string;
  rating: number;
}

const PERKS = [
  { title: 'Cash on delivery', text: 'Pay when it reaches your door, anywhere in Pakistan', icon: TruckIcon, tint: 'bg-blush-100' },
  { title: '100% genuine', text: 'Checked & packed with love before it ships', icon: ShieldIcon, tint: 'bg-lilac' },
  { title: '7-day returns', text: 'Not in love? Send it back, no drama', icon: ReturnIcon, tint: 'bg-peach' },
  { title: 'WhatsApp support', text: 'Real humans, quick replies', icon: WhatsAppIcon, tint: 'bg-mint' },
];

const TINTS = ['from-blush-100 to-blush-200', 'from-lilac to-blush-100', 'from-peach to-blush-100', 'from-mint to-blush-100', 'from-blush-200 to-lilac', 'from-cream to-peach'];

export default function HomePage() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [hero, setHero] = useState<{ title: string; subtitle: string }>({ title: '', subtitle: '' });
  const [advanceDiscount, setAdvanceDiscount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data }, cats, settings, { data: reviewRows }] = await Promise.all([
        publicClient.from('products').select(PRODUCT_FIELDS).eq('is_active', true).order('created_at', { ascending: false }),
        getCategories(),
        getSiteSettings(),
        publicClient
          .from('product_reviews')
          .select('id, product_id, customer_name, customer_city, review_text, rating')
          .eq('is_approved', true)
          .gte('rating', 4)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);
      setProducts(await enrichProducts((data as Product[]) ?? []));
      setCategories(cats);
      setReviews((reviewRows as Review[]) ?? []);
      setHero({ title: settings?.hero_title?.trim() || '', subtitle: settings?.hero_subtitle?.trim() || '' });
      if (settings?.advance_payment_discount_enabled) setAdvanceDiscount(Number(settings.advance_payment_discount_amount) || 200);
      setLoading(false);
    })();
  }, []);

  const featured = useMemo(() => {
    const f = products.filter((p) => p.is_featured);
    return (f.length ? f : products).slice(0, 8);
  }, [products]);

  const deal = useMemo(
    () =>
      [...products]
        .filter((p) => (p.images?.length ?? 0) > 0 && discountPercent(p.price, p.original_price) > 0)
        .sort((a, b) => discountPercent(b.price, b.original_price) - discountPercent(a.price, a.original_price))[0] ?? null,
    [products]
  );

  const heroProducts = useMemo(() => {
    const withImg = featured.filter((p) => p.images?.[0]);
    return withImg.length >= 3 ? withImg.slice(0, 3) : products.filter((p) => p.images?.[0]).slice(0, 3);
  }, [featured, products]);

  const categoryCards = useMemo(() => {
    const cards = categories
      .filter((c) => !c.parent_id)
      .map((c) => {
        const ids = new Set(categoryWithChildren(categories, c.id));
        const inCat = products.filter((p) => p.category_id && ids.has(p.category_id));
        return { ...c, count: inCat.length, image: inCat.find((p) => p.images?.[0])?.images?.[0] ?? null };
      })
      .sort((a, b) => b.count - a.count);
    const filled = cards.filter((c) => c.count > 0);
    return (filled.length >= 2 ? filled : cards).slice(0, 6);
  }, [categories, products]);

  const productName = (id: string) => products.find((p) => p.id === id);

  return (
    <div className="overflow-x-clip">
      <Hero title={hero.title} subtitle={hero.subtitle} products={heroProducts} productCount={products.length} loading={loading} />

      <Ribbon />

      {/* Categories */}
      {(loading || categoryCards.length > 0) && (
        <section id="categories" className="container-zs scroll-mt-24 py-16 md:py-20">
          <SectionHeading eyebrow="Shop by vibe" title="Find your favourites" href="/products" cta="All products" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-6">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton aspect-[4/5] rounded-[28px]" />)
              : categoryCards.map((c, i) => (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 24, rotate: i % 2 ? 2 : -2 }}
                    whileInView={{ opacity: 1, y: 0, rotate: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.06, type: 'spring', stiffness: 200, damping: 20 }}
                  >
                    <Link
                      href={`/products?category=${c.slug}`}
                      className={`group relative flex aspect-[4/5] flex-col overflow-hidden rounded-[28px] bg-gradient-to-br p-4 transition-transform duration-300 hover:-translate-y-1.5 hover:rotate-[-1deg] ${TINTS[i % TINTS.length]}`}
                    >
                      <div className="relative z-10">
                        <p className="font-display text-xl font-semibold leading-tight text-ink">{c.name}</p>
                        <p className="mt-0.5 text-xs font-bold text-ink-soft">{c.count} item{c.count === 1 ? '' : 's'}</p>
                      </div>
                      <div className="relative mt-auto flex justify-center">
                        {c.image ? (
                          <img
                            src={c.image}
                            alt=""
                            loading="lazy"
                            className="aspect-square w-[78%] rounded-full object-cover shadow-soft ring-4 ring-white/70 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6"
                          />
                        ) : (
                          <div className="flex aspect-square w-[70%] items-center justify-center rounded-full bg-white/60 text-berry-400">
                            <BagIcon className="h-10 w-10" />
                          </div>
                        )}
                      </div>
                      <span className="absolute bottom-3 right-3 flex h-9 w-9 scale-0 items-center justify-center rounded-full bg-ink text-white transition-transform duration-300 group-hover:scale-100">
                        <ArrowRightIcon className="h-4 w-4" />
                      </span>
                    </Link>
                  </motion.div>
                ))}
          </div>
        </section>
      )}

      {/* Featured */}
      <section className="container-zs pb-6">
        <SectionHeading eyebrow="Trending now" title="Our most loved picks" href="/products" cta="Shop all" />
        {loading ? (
          <div className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : featured.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">
            {featured.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        ) : (
          <EmptyShelf />
        )}
      </section>

      {deal && <DealSpotlight product={deal} />}

      {products.length > 4 && <NewArrivals products={products.slice(0, 10)} />}

      {/* Perks */}
      <section className="container-zs py-14">
        <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
          {PERKS.map((perk, i) => (
            <motion.div
              key={perk.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ y: -6 }}
              className={`rounded-[28px] p-5 md:p-6 ${perk.tint}`}
            >
              <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-berry-600 shadow-soft">
                <perk.icon className="h-6 w-6" />
              </span>
              <p className="font-display text-lg font-semibold text-ink">{perk.title}</p>
              <p className="mt-1 text-sm font-semibold text-ink-soft">{perk.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {advanceDiscount > 0 && <AdvancePromo amount={advanceDiscount} />}

      {reviews.length > 0 && (
        <section className="py-16 md:py-20">
          <div className="container-zs">
            <SectionHeading eyebrow="Real reviews" title="Our girls are obsessed" />
          </div>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-blush-50 md:w-40" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-blush-50 md:w-40" />
            <div className="flex w-max animate-marquee gap-4 hover:[animation-play-state:paused]">
              {[...reviews, ...reviews].map((r, i) => {
                const p = productName(r.product_id);
                return (
                  <div key={`${r.id}-${i}`} className="w-[290px] flex-shrink-0 rounded-[28px] border border-line bg-white p-5 md:w-[340px]" aria-hidden={i >= reviews.length}>
                    <div className="flex gap-0.5 text-amber-400">
                      {Array.from({ length: 5 }).map((_, s) => (
                        <StarIcon key={s} className="h-4 w-4" filled={s < r.rating} />
                      ))}
                    </div>
                    <p className="mt-3 line-clamp-4 text-[15px] font-semibold leading-relaxed text-ink-soft">“{r.review_text}”</p>
                    <div className="mt-4 flex items-center gap-3 border-t border-line pt-4">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-berry-400 to-berry-600 font-display font-semibold text-white">
                        {r.customer_name.trim().charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold text-ink">{r.customer_name}</p>
                        <p className="truncate text-xs font-semibold text-muted">
                          {[r.customer_city, p?.name].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function Hero({
  title,
  subtitle,
  products,
  productCount,
  loading,
}: {
  title: string;
  subtitle: string;
  products: CatalogProduct[];
  productCount: number;
  loading: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const stageY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, 60]);

  const words = (title || 'Cute tech that makes you smile').split(' ');

  return (
    <section ref={ref} className="relative -mt-[74px] overflow-hidden pt-[74px] md:-mt-[82px] md:pt-[82px]">
      <div className="absolute inset-0 bg-gradient-to-b from-blush-200 via-blush-100 to-blush-50" />
      <div className="bg-dots absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
      <div className="absolute -left-20 top-10 h-72 w-72 animate-blob bg-berry-400/30 blur-3xl" />
      <div className="absolute -right-10 bottom-0 h-80 w-80 animate-blob bg-lilac blur-3xl [animation-delay:-5s]" />
      <FloatingBits />

      <div className="container-zs relative grid items-center gap-10 pb-16 pt-10 md:pb-24 md:pt-16 lg:grid-cols-2">
        <motion.div style={{ y: textY }} className="relative z-10 text-center lg:text-left">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="chip mb-5 bg-white text-berry-600 shadow-soft"
          >
            <SparkleIcon className="h-3.5 w-3.5 animate-wiggle" /> New drops every week
          </motion.span>

          <h1 className="font-display text-[42px] font-semibold leading-[1.02] text-ink sm:text-6xl lg:text-[76px]">
            {words.map((w, i) => (
              <motion.span
                key={`${w}-${i}`}
                initial={{ opacity: 0, y: 40, rotate: 6 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                transition={{ delay: 0.15 + i * 0.08, type: 'spring', stiffness: 180, damping: 16 }}
                className={`mr-[0.22em] inline-block ${!title && (w === 'Cute' || w === 'smile') ? 'text-gradient' : ''}`}
              >
                {w}
              </motion.span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mx-auto mt-5 max-w-lg text-lg font-semibold text-ink-soft lg:mx-0"
          >
            {subtitle || 'Headphones, smartwatches, powerbanks & little gadgets you’ll actually love — genuine, gift-ready and delivered to your door.'}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75 }}
            className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start"
          >
            <Link href="/products" className="btn-primary px-8 py-4 text-base">
              Shop the collection <ArrowRightIcon className="h-5 w-5" />
            </Link>
            <a href="#categories" className="btn-ghost bg-white/60 px-7 py-4 text-base">
              Browse categories
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.95 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 lg:justify-start"
          >
            <Stat value={loading ? '—' : `${productCount}+`} label="cute products" />
            <span className="hidden h-10 w-px bg-blush-300 sm:block" />
            <Stat value="COD" label="all over Pakistan" />
            <span className="hidden h-10 w-px bg-blush-300 sm:block" />
            <Stat value="7 days" label="easy returns" />
          </motion.div>
        </motion.div>

        <motion.div style={{ y: stageY }} className="relative mx-auto aspect-square w-full max-w-[520px]">
          <HeroStage products={products} />
        </motion.div>
      </div>
    </section>
  );
}

function HeroStage({ products }: { products: CatalogProduct[] }) {
  const [main, ...rest] = products;
  return (
    <div className="relative h-full w-full">
      {/* rotating text ring */}
      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full animate-spin-slow text-berry-500" aria-hidden="true">
        <defs>
          <path id="ring" d="M100,100 m-88,0 a88,88 0 1,1 176,0 a88,88 0 1,1 -176,0" />
        </defs>
        <text className="fill-current font-display text-[9.5px] font-semibold uppercase tracking-[0.32em]">
          <textPath href="#ring">{`${BRAND.name} ♥ cute tech ♥ genuine ♥ cash on delivery ♥ `}</textPath>
        </text>
      </svg>

      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 120, damping: 14, delay: 0.2 }}
        className="absolute inset-[13%] overflow-hidden rounded-full bg-gradient-to-br from-white to-blush-200 shadow-pop ring-8 ring-white/70"
      >
        <img src={main?.images?.[0] ?? BRAND.logoLarge} alt={main?.name ?? BRAND.name} className="h-full w-full object-cover" />
      </motion.div>

      {main && (
        <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.9 }} className="absolute bottom-[8%] right-0 md:right-[-4%]">
          <Link href={`/products/${main.slug}`} className="flex animate-float items-center gap-3 rounded-2xl bg-white/95 p-2.5 pr-4 shadow-pop backdrop-blur">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blush-100 text-berry-600">
              <HeartIcon className="h-5 w-5" filled />
            </span>
            <span>
              <span className="block max-w-[140px] truncate text-xs font-bold text-muted">{main.name}</span>
              <span className="block font-display text-lg font-semibold text-ink">{formatPrice(main.price)}</span>
            </span>
          </Link>
        </motion.div>
      )}

      {rest.map((p, i) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 + i * 0.15, type: 'spring' }}
          className={`absolute ${i === 0 ? 'left-[-2%] top-[10%]' : 'left-[4%] bottom-[14%]'}`}
        >
          <Link
            href={`/products/${p.slug}`}
            className={`block h-20 w-20 overflow-hidden rounded-[22px] bg-white p-1 shadow-pop md:h-28 md:w-28 ${i === 0 ? 'animate-float rotate-[-8deg]' : 'animate-float-slow rotate-[6deg]'}`}
          >
            <img src={p.images![0]} alt={p.name} className="h-full w-full rounded-[18px] object-cover" />
          </Link>
        </motion.div>
      ))}

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1 }}
        className="absolute right-[2%] top-[6%] flex animate-float-slow items-center gap-1.5 rounded-full bg-ink px-3.5 py-2 text-xs font-extrabold text-white shadow-pop"
      >
        <StarIcon className="h-3.5 w-3.5 text-amber-300" /> Loved by 1000s
      </motion.div>
    </div>
  );
}

function FloatingBits() {
  const bits = [
    { c: 'left-[6%] top-[22%] text-berry-400', d: '0s', s: 'h-5 w-5', heart: true },
    { c: 'left-[46%] top-[12%] text-lilac', d: '-2s', s: 'h-7 w-7' },
    { c: 'right-[8%] top-[48%] text-blush-300', d: '-4s', s: 'h-4 w-4', heart: true },
    { c: 'left-[30%] bottom-[10%] text-white', d: '-1s', s: 'h-6 w-6' },
    { c: 'right-[40%] bottom-[22%] text-berry-400/60', d: '-3s', s: 'h-4 w-4', heart: true },
  ];
  return (
    <div className="pointer-events-none absolute inset-0 hidden md:block" aria-hidden="true">
      {bits.map((b, i) => (
        <span key={i} className={`absolute animate-float ${b.c}`} style={{ animationDelay: b.d }}>
          {b.heart ? <HeartIcon className={b.s} filled /> : <SparkleIcon className={b.s} />}
        </span>
      ))}
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-display text-3xl font-semibold text-ink">{value}</p>
      <p className="text-sm font-bold text-muted">{label}</p>
    </div>
  );
}

function Ribbon() {
  const items = ['Cash on delivery', 'Genuine products', '7-day easy returns', 'Gift-ready packing', 'WhatsApp support', 'Fast nationwide delivery'];
  return (
    <div className="relative z-10 -my-2 rotate-[-1.5deg] bg-ink py-3.5 shadow-pop">
      <div className="flex w-max animate-marquee-fast">
        {[0, 1].map((half) => (
          <div key={half} className="flex" aria-hidden={half === 1}>
            {items.map((t) => (
              <span key={t} className="flex items-center gap-4 px-4 font-display text-lg font-medium text-white md:text-xl">
                {t}
                <HeartIcon className="h-4 w-4 text-berry-400" filled />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionHeading({ eyebrow, title, href, cta }: { eyebrow: string; title: string; href?: string; cta?: string }) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
        <p className="mb-1.5 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.2em] text-berry-500">
          <SparkleIcon className="h-3.5 w-3.5" /> {eyebrow}
        </p>
        <h2 className="font-display text-3xl font-semibold text-ink md:text-[44px] md:leading-[1.05]">{title}</h2>
      </motion.div>
      {href && cta && (
        <Link href={href} className="group hidden flex-shrink-0 items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-extrabold text-ink shadow-soft transition-colors hover:text-berry-600 sm:flex">
          {cta}
          <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      )}
    </div>
  );
}

function DealSpotlight({ product }: { product: CatalogProduct }) {
  const { addToCart } = useStore();
  const [left, setLeft] = useState<number | null>(null);
  const off = discountPercent(product.price, product.original_price);

  // Daily deal resets at local midnight
  useEffect(() => {
    const tick = () => {
      const end = new Date();
      end.setHours(24, 0, 0, 0);
      setLeft(Math.max(0, end.getTime() - Date.now()));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  const parts = left === null ? ['--', '--', '--'] : [left / 36e5, (left / 6e4) % 60, (left / 1e3) % 60].map((n) => String(Math.floor(n)).padStart(2, '0'));

  return (
    <section className="container-zs py-16 md:py-20">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="relative grid overflow-hidden rounded-[36px] bg-ink md:grid-cols-2"
      >
        <div className="absolute -left-20 -top-20 h-80 w-80 animate-blob bg-berry-500/40 blur-3xl" />
        <div className="relative z-10 order-2 p-7 md:order-1 md:p-12">
          <span className="chip bg-berry-400 text-white">
            <ClockIcon className="h-3.5 w-3.5" /> Deal of the day
          </span>
          <h2 className="mt-4 font-display text-3xl font-semibold leading-tight text-white md:text-5xl">{product.name}</h2>
          <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-2">
            <span className="whitespace-nowrap font-display text-3xl font-semibold text-berry-400 md:text-4xl">{formatPrice(product.price)}</span>
            <span className="whitespace-nowrap text-lg font-bold text-white/40 line-through">{formatPrice(product.original_price!)}</span>
            <span className="chip bg-white text-berry-600">Save {off}%</span>
          </div>

          <div className="mt-7 flex gap-2 md:gap-3">
            {parts.map((v, i) => (
              <div key={i} className="w-[72px] rounded-2xl bg-white/10 py-3 text-center backdrop-blur md:w-20">
                <motion.p key={v} initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="font-display text-3xl font-semibold tabular-nums text-white">
                  {v}
                </motion.p>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-white/50">{['hours', 'mins', 'secs'][i]}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {product.hasVariants ? (
              <Link href={`/products/${product.slug}`} className="btn-primary px-7 py-3.5">
                Choose options <ArrowRightIcon className="h-5 w-5" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => addToCart({ id: product.id, name: product.name, price: product.price, image: product.images?.[0] ?? null, slug: product.slug })}
                className="btn-primary px-7 py-3.5"
              >
                <BagIcon className="h-5 w-5" /> Grab the deal
              </button>
            )}
            <Link href={`/products/${product.slug}`} className="inline-flex items-center gap-2 rounded-full px-5 py-3.5 font-extrabold text-white/80 hover:text-white">
              View details
            </Link>
          </div>
        </div>
        <div className="relative order-1 min-h-[280px] md:order-2">
          <img src={product.images![0]} alt={product.name} className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent md:bg-gradient-to-r" />
          <motion.span
            animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.06, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute right-5 top-5 flex h-20 w-20 items-center justify-center rounded-full bg-berry-400 text-center font-display text-xl font-semibold leading-none text-white shadow-pop"
          >
            -{off}%
          </motion.span>
        </div>
      </motion.div>
    </section>
  );
}

function NewArrivals({ products }: { products: CatalogProduct[] }) {
  const rail = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => rail.current?.scrollBy({ left: dir * rail.current.clientWidth * 0.8, behavior: 'smooth' });

  return (
    <section className="py-6">
      <div className="container-zs">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.2em] text-berry-500">
              <SparkleIcon className="h-3.5 w-3.5" /> Just landed
            </p>
            <h2 className="font-display text-3xl font-semibold text-ink md:text-[44px] md:leading-[1.05]">Fresh new arrivals</h2>
          </div>
          <div className="flex gap-2">
            {[-1, 1].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => scroll(d)}
                className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-line bg-white text-ink transition-all hover:border-berry-400 hover:text-berry-600 active:scale-90"
                aria-label={d < 0 ? 'Scroll left' : 'Scroll right'}
              >
                {d < 0 ? <ChevronLeftIcon className="h-5 w-5" /> : <ChevronRightIcon className="h-5 w-5" />}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div ref={rail} className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-6 md:gap-5 md:scroll-px-8 md:px-8 xl:px-[max(2rem,calc((100vw-80rem)/2+2rem))]">
        {products.map((p, i) => (
          <div key={p.id} className="w-[46%] flex-shrink-0 snap-start sm:w-[34%] lg:w-[23%]">
            <ProductCard product={p} index={i} />
          </div>
        ))}
      </div>
    </section>
  );
}

function AdvancePromo({ amount }: { amount: number }) {
  return (
    <section className="container-zs py-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-berry-400 via-berry-500 to-berry-600 p-8 text-white md:p-14"
      >
        <div className="bg-dots absolute inset-0 opacity-30 [filter:invert(1)]" />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          className="absolute -right-16 -top-16 h-64 w-64 rounded-full border-[18px] border-dashed border-white/15"
        />
        <div className="relative grid items-center gap-8 md:grid-cols-[1fr_auto]">
          <div>
            <span className="chip bg-white/20 text-white">
              <GiftIcon className="h-3.5 w-3.5" /> Little treat for you
            </span>
            <h2 className="mt-4 max-w-xl font-display text-3xl font-semibold leading-tight md:text-5xl">
              Pay in advance & get {formatPrice(amount)} off instantly
            </h2>
            <p className="mt-3 max-w-md font-semibold text-white/80">Choose “Advance payment” at checkout — the discount applies automatically.</p>
          </div>
          <Link href="/products" className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 font-extrabold text-berry-600 shadow-pop transition-transform hover:-translate-y-1 hover:rotate-[-2deg]">
            Shop & save <ArrowRightIcon className="h-5 w-5" />
          </Link>
        </div>
      </motion.div>
    </section>
  );
}

function EmptyShelf() {
  return (
    <div className="rounded-[32px] border-2 border-dashed border-blush-300 bg-white/60 p-12 text-center">
      <p className="font-display text-2xl text-ink">Products are on their way 💕</p>
      <p className="mt-1 text-sm font-semibold text-muted">Add products from the admin panel and they’ll show up here.</p>
    </div>
  );
}
