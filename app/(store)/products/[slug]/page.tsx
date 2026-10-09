'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AnimatePresence, motion, useInView } from 'framer-motion';
import { publicClient } from '@/lib/supabase';
import {
  PRODUCT_FIELDS,
  enrichProducts,
  getCategories,
  getSiteSettings,
  type CatalogProduct,
  type Category,
  type Product,
} from '@/lib/catalog';
import { discountPercent, formatPrice } from '@/lib/cart';
import { withDealPrice } from '@/lib/deal';
import { useStore } from '@/components/store/StoreProvider';
import { Stepper } from '@/components/store/CartDrawer';
import ProductCard from '@/components/store/ProductCard';
import { findVariant, OptionPicker, useProductOptions } from '@/components/store/ProductOptions';
import {
  BagIcon,
  BoltIcon,
  ChevronDownIcon,
  HeartIcon,
  ReturnIcon,
  ShieldIcon,
  StarIcon,
  TruckIcon,
} from '@/components/store/icons';

interface Review {
  id: string;
  customer_name: string;
  customer_city: string | null;
  review_text: string;
  rating: number;
  created_at: string;
}

function formatTimeAgo(dateString: string): string {
  const diffDays = Math.floor((Date.now() - new Date(dateString).getTime()) / 864e5);
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${diffDays >= 14 ? 's' : ''} ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${diffDays >= 60 ? 's' : ''} ago`;
  return new Date(dateString).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { addToCart, toggleWishlist, isWished } = useStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [category, setCategory] = useState<Category | null>(null);
  const [related, setRelated] = useState<CatalogProduct[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [needOptions, setNeedOptions] = useState(false);
  const viewFired = useRef(false);
  const buyRef = useRef<HTMLDivElement>(null);
  const buyVisible = useInView(buyRef);

  const { attributes, values, variants, loading: optionsLoading } = useProductOptions(product?.id);

  useEffect(() => {
    (async () => {
      const { data, error } = await publicClient.from('products').select('*').eq('slug', slug).eq('is_active', true).single();
      if (error || !data) {
        setNotFound(true);
        return;
      }
      const p = withDealPrice(
        { ...(data as Product), price: Number(data.price), original_price: data.original_price ? Number(data.original_price) : null },
        await getSiteSettings()
      );
      setProduct(p);

      const cats = await getCategories();
      const cat = cats.find((c) => c.id === p.category_id) ?? null;
      setCategory(cat);

      const [{ data: reviewRows }, { data: relatedRows }] = await Promise.all([
        publicClient
          .from('product_reviews')
          .select('id, customer_name, customer_city, review_text, rating, created_at')
          .eq('product_id', p.id)
          .eq('is_approved', true)
          .order('created_at', { ascending: false }),
        (cat
          ? publicClient.from('products').select(PRODUCT_FIELDS).eq('is_active', true).eq('category_id', cat.id)
          : publicClient.from('products').select(PRODUCT_FIELDS).eq('is_active', true).eq('is_featured', true)
        )
          .neq('id', p.id)
          .limit(8),
      ]);
      setReviews((reviewRows as Review[]) ?? []);
      let rel = (relatedRows as Product[]) ?? [];
      if (rel.length < 4) {
        const { data: more } = await publicClient.from('products').select(PRODUCT_FIELDS).eq('is_active', true).neq('id', p.id).limit(8);
        const seen = new Set(rel.map((r) => r.id));
        rel = [...rel, ...((more as Product[]) ?? []).filter((m) => !seen.has(m.id))];
      }
      setRelated(await enrichProducts(rel.slice(0, 4)));
    })();
  }, [slug]);

  useEffect(() => {
    if (viewFired.current || !product || typeof window === 'undefined' || !window.fbq) return;
    window.fbq('track', 'ViewContent', {
      content_name: product.name,
      content_ids: [product.id],
      content_type: 'product',
      value: product.price,
      currency: 'PKR',
    });
    viewFired.current = true;
  }, [product]);

  const hasVariants = attributes.length > 0;
  const allSelected = attributes.every((a) => selected[a.attribute_name]);
  const variant = findVariant(attributes, variants, selected);
  const price = variant?.price ?? product?.price ?? 0;
  const stock = hasVariants ? (allSelected ? variant?.stock ?? 0 : null) : product?.stock ?? 0;
  const inStock = stock === null ? true : stock > 0;
  const off = discountPercent(price, product?.original_price);

  const rating = useMemo(() => {
    if (reviews.length === 0) return null;
    const dist = [5, 4, 3, 2, 1].map((s) => reviews.filter((r) => r.rating === s).length);
    return { avg: reviews.reduce((a, r) => a + r.rating, 0) / reviews.length, dist };
  }, [reviews]);

  const tryAdd = () => {
    if (!product) return false;
    if (hasVariants && !allSelected) {
      setNeedOptions(true);
      setTimeout(() => setNeedOptions(false), 900);
      document.getElementById('options')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }
    if (!inStock) return false;
    addToCart(
      {
        id: product.id,
        name: product.name,
        price,
        image: product.images?.[0] ?? null,
        slug: product.slug,
        selectedVariant: hasVariants ? { ...selected } : null,
      },
      quantity
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
    return true;
  };

  if (notFound) {
    return (
      <div className="container-zs py-24 text-center">
        <motion.div animate={{ rotate: [0, -8, 8, 0] }} transition={{ duration: 2.4, repeat: Infinity }} className="mx-auto mb-4 w-fit text-6xl">
          🙈
        </motion.div>
        <h1 className="font-display text-4xl font-semibold text-ink">Oops, this one’s gone</h1>
        <p className="mx-auto mt-2 max-w-md font-semibold text-muted">The product you’re looking for doesn’t exist or was removed.</p>
        <Link href="/products" className="btn-primary mt-8 px-8 py-3.5">
          Browse the shop
        </Link>
      </div>
    );
  }

  if (!product) return <ProductSkeleton />;

  const wished = isWished(product.id);
  const lowStock = stock !== null && stock > 0 && stock <= 10;

  return (
    <div className="pb-24 lg:pb-0">
      <div className="container-zs pt-6 md:pt-10">
        <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm font-bold text-muted">
          <Link href="/" className="hover:text-berry-600">Home</Link>
          <span>/</span>
          <Link href="/products" className="hover:text-berry-600">Shop</Link>
          {category && (
            <>
              <span>/</span>
              <Link href={`/products?category=${category.slug}`} className="hover:text-berry-600">{category.name}</Link>
            </>
          )}
          <span>/</span>
          <span className="line-clamp-1 text-ink">{product.name}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
          <Gallery images={product.images ?? []} name={product.name} badge={off > 0 ? `-${off}%` : null} />

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
            {category && <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.2em] text-berry-500">{category.name}</p>}
            <div className="flex items-start justify-between gap-4">
              <h1 className="font-display text-3xl font-semibold leading-tight text-ink md:text-5xl">{product.name}</h1>
              <motion.button
                type="button"
                whileTap={{ scale: 0.8 }}
                onClick={() =>
                  toggleWishlist({
                    id: product.id,
                    name: product.name,
                    slug: product.slug,
                    price: product.price,
                    original_price: product.original_price,
                    image: product.images?.[0] ?? null,
                  })
                }
                className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                  wished ? 'border-berry-400 bg-blush-100 text-berry-600' : 'border-line bg-white text-ink-soft hover:text-berry-500'
                }`}
                aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <HeartIcon className="h-6 w-6" filled={wished} />
              </motion.button>
            </div>

            {rating && (
              <a href="#reviews" className="mt-3 flex w-fit items-center gap-2">
                <span className="flex text-amber-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <StarIcon key={i} className="h-4 w-4" filled={i < Math.round(rating.avg)} />
                  ))}
                </span>
                <span className="text-sm font-extrabold text-ink">{rating.avg.toFixed(1)}</span>
                <span className="text-sm font-semibold text-muted underline-offset-2 hover:underline">{reviews.length} reviews</span>
              </a>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <motion.span key={price} initial={{ scale: 1.15, color: '#e2427f' }} animate={{ scale: 1, color: '#2b1520' }} className="origin-left font-display text-4xl font-semibold md:text-5xl">
                {formatPrice(price)}
              </motion.span>
              {product.original_price && product.original_price > price && (
                <>
                  <span className="text-xl font-bold text-muted line-through">{formatPrice(product.original_price)}</span>
                  <span className="chip bg-berry-500 text-white">You save {formatPrice(product.original_price - price)}</span>
                </>
              )}
            </div>

            <div className="mt-5">
              {stock === null ? (
                <p className="text-sm font-bold text-muted">Choose options to check availability</p>
              ) : inStock ? (
                <div>
                  <p className={`flex items-center gap-2 text-sm font-extrabold ${lowStock ? 'text-berry-600' : 'text-emerald-600'}`}>
                    <span className={`h-2.5 w-2.5 animate-pulse rounded-full ${lowStock ? 'bg-berry-500' : 'bg-emerald-500'}`} />
                    {lowStock ? `Hurry! Only ${stock} left` : 'In stock & ready to ship'}
                  </p>
                  {lowStock && (
                    <div className="mt-2 h-2 w-full max-w-xs overflow-hidden rounded-full bg-blush-100">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${Math.max(8, (stock / 10) * 100)}%` }} transition={{ duration: 1 }} className="h-full rounded-full bg-gradient-to-r from-berry-400 to-berry-600" />
                    </div>
                  )}
                </div>
              ) : (
                <p className="flex items-center gap-2 text-sm font-extrabold text-berry-700">
                  <span className="h-2.5 w-2.5 rounded-full bg-berry-700" /> Sold out
                </p>
              )}
            </div>

            {(hasVariants || optionsLoading) && (
              <motion.div
                id="options"
                animate={needOptions ? { x: [0, -10, 10, -6, 6, 0] } : {}}
                transition={{ duration: 0.5 }}
                className={`mt-6 rounded-[24px] border-2 p-5 transition-colors ${needOptions ? 'border-berry-400 bg-blush-100' : 'border-line bg-white'}`}
              >
                {optionsLoading ? (
                  <div className="space-y-3">
                    <div className="skeleton h-4 w-24 rounded" />
                    <div className="flex gap-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="skeleton h-10 w-20 rounded-full" />
                      ))}
                    </div>
                  </div>
                ) : (
                  <OptionPicker attributes={attributes} values={values} selected={selected} onSelect={(k, v) => setSelected((s) => ({ ...s, [k]: v }))} />
                )}
              </motion.div>
            )}

            <div ref={buyRef} className="mt-6 flex flex-wrap items-center gap-3">
              <Stepper value={quantity} onChange={(q) => setQuantity(stock ? Math.min(q, stock) : q)} size="lg" />
              <button type="button" onClick={tryAdd} disabled={!inStock} className="btn-primary min-w-[200px] flex-1 py-4 text-base">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={added ? 'added' : 'add'}
                    initial={{ y: 14, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -14, opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <BagIcon className="h-5 w-5" />
                    {added ? 'Added to bag!' : inStock ? 'Add to bag' : 'Sold out'}
                  </motion.span>
                </AnimatePresence>
              </button>
            </div>
            {inStock && (
              <button
                type="button"
                onClick={() => tryAdd() && router.push('/checkout')}
                className="btn-ghost mt-3 w-full py-3.5 text-base"
              >
                <BoltIcon className="h-5 w-5" /> Buy it now
              </button>
            )}

            <div className="mt-6 grid grid-cols-3 gap-2">
              {[
                { icon: TruckIcon, label: 'Cash on delivery' },
                { icon: ReturnIcon, label: '7-day returns' },
                { icon: ShieldIcon, label: '100% genuine' },
              ].map((perk) => (
                <div key={perk.label} className="flex flex-col items-center gap-1.5 rounded-2xl bg-white p-3 text-center">
                  <perk.icon className="h-6 w-6 text-berry-500" />
                  <span className="text-xs font-extrabold text-ink-soft">{perk.label}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-3">
              {product.description && (
                <Accordion title="Description" defaultOpen>
                  <p className="whitespace-pre-wrap leading-relaxed text-ink-soft">{product.description}</p>
                </Accordion>
              )}
              {product.specs && Object.keys(product.specs).length > 0 && (
                <Accordion title="Specifications" defaultOpen={!product.description}>
                  <dl className="divide-y divide-line">
                    {Object.entries(product.specs).map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-4 py-2.5 text-sm">
                        <dt className="font-bold text-muted">{k}</dt>
                        <dd className="text-right font-extrabold text-ink">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </Accordion>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      <Reviews productId={product.id} reviews={reviews} rating={rating} />

      {related.length > 0 && (
        <section className="container-zs py-12">
          <h2 className="mb-6 font-display text-3xl font-semibold text-ink md:text-4xl">You might also love</h2>
          <div className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">
            {related.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Sticky buy bar on phones once the main button scrolls away */}
      <AnimatePresence>
        {!buyVisible && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 p-3 backdrop-blur-lg lg:hidden"
          >
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-blush-100">
                {product.images?.[0] && <img src={product.images[0]} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-ink">{product.name}</p>
                <p className="font-display font-semibold text-berry-600">{formatPrice(price)}</p>
              </div>
              <button type="button" onClick={tryAdd} disabled={!inStock} className="btn-primary px-5 py-3 text-sm">
                <BagIcon className="h-4 w-4" /> {added ? 'Added!' : 'Add'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Gallery({ images, name, badge }: { images: string[]; name: string; badge: string | null }) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const rail = useRef<HTMLDivElement>(null);

  const onRailScroll = () => {
    const el = rail.current;
    if (!el) return;
    setActive(Math.round(el.scrollLeft / el.clientWidth));
  };

  const go = (i: number) => {
    setActive(i);
    rail.current?.scrollTo({ left: i * rail.current.clientWidth, behavior: 'smooth' });
  };

  if (images.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-[36px] bg-gradient-to-br from-blush-100 to-blush-200 text-berry-400">
        <BagIcon className="h-24 w-24" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="lg:sticky lg:top-28 lg:self-start">
      <div className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-blush-100 to-blush-200">
        {/* phones: swipe; desktop: hover to zoom */}
        <div ref={rail} onScroll={onRailScroll} className="no-scrollbar flex aspect-square snap-x snap-mandatory overflow-x-auto lg:hidden">
          {images.map((src, i) => (
            <img key={i} src={src} alt={`${name} ${i + 1}`} className="h-full w-full flex-shrink-0 snap-center object-cover" />
          ))}
        </div>
        <div
          className="relative hidden aspect-square cursor-zoom-in overflow-hidden lg:block"
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
          }}
          onMouseLeave={() => setZoom(null)}
        >
          <AnimatePresence mode="wait">
            <motion.img
              key={active}
              src={images[active]}
              alt={name}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: zoom ? 1.9 : 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: zoom ? 0.15 : 0.35 }}
              style={{ transformOrigin: zoom ? `${zoom.x}% ${zoom.y}%` : 'center' }}
              className="h-full w-full object-cover"
            />
          </AnimatePresence>
        </div>

        {badge && (
          <motion.span
            animate={{ rotate: [0, -6, 6, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute left-4 top-4 flex h-16 w-16 items-center justify-center rounded-full bg-berry-500 font-display text-lg font-semibold text-white shadow-pop"
          >
            {badge}
          </motion.span>
        )}

        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-white/70 px-2.5 py-1.5 backdrop-blur lg:hidden">
            {images.map((_, i) => (
              <button key={i} type="button" onClick={() => go(i)} className={`h-2 rounded-full transition-all ${i === active ? 'w-6 bg-berry-500' : 'w-2 bg-berry-400/40'}`} aria-label={`Image ${i + 1}`} />
            ))}
          </div>
        )}
      </div>

      {images.length > 1 && (
        <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto pb-1">
          {images.map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => go(i)}
              className={`relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl border-2 transition-all md:h-24 md:w-24 ${
                i === active ? 'border-berry-500 shadow-soft' : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function Accordion({ title, defaultOpen, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="overflow-hidden rounded-[24px] border border-line bg-white">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between px-5 py-4 text-left">
        <span className="font-display text-lg font-semibold text-ink">{title}</span>
        <ChevronDownIcon className={`h-5 w-5 text-berry-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-5 pb-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Reviews({
  productId,
  reviews,
  rating,
}: {
  productId: string;
  reviews: Review[];
  rating: { avg: number; dist: number[] } | null;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ rating: 0, customer_name: '', customer_city: '', review_text: '' });
  const [hover, setHover] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [thanks, setThanks] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const canSubmit = form.rating > 0 && form.customer_name.trim() && form.review_text.trim();

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: productId,
        customer_name: form.customer_name,
        customer_city: form.customer_city,
        review_text: form.review_text,
        rating: form.rating,
      }),
    });
    const result = await res.json().catch(() => ({}));
    const error = res.ok ? null : result.error || 'Couldn’t post your review. Please try again.';
    if (error) {
      setSubmitError(error);
    } else {
      setSubmitError('');
      setForm({ rating: 0, customer_name: '', customer_city: '', review_text: '' });
      setFormOpen(false);
      setThanks(true);
      setTimeout(() => setThanks(false), 3500);
    }
    setSubmitting(false);
  };

  const shown = showAll ? reviews : reviews.slice(0, 4);

  return (
    <section id="reviews" className="container-zs scroll-mt-28 py-16">
      <div className="grid gap-8 lg:grid-cols-[340px_1fr]">
        <div className="card-zs h-fit p-6 lg:sticky lg:top-28">
          <h2 className="font-display text-3xl font-semibold text-ink">Reviews</h2>
          {rating ? (
            <>
              <div className="mt-4 flex items-end gap-3">
                <span className="font-display text-6xl font-semibold leading-none text-ink">{rating.avg.toFixed(1)}</span>
                <div className="pb-1">
                  <div className="flex text-amber-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <StarIcon key={i} className="h-5 w-5" filled={i < Math.round(rating.avg)} />
                    ))}
                  </div>
                  <p className="text-sm font-bold text-muted">{reviews.length} reviews</p>
                </div>
              </div>
              <div className="mt-5 space-y-2">
                {rating.dist.map((n, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm font-bold text-ink-soft">
                    <span className="w-3">{5 - i}</span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-blush-100">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${(n / reviews.length) * 100}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: i * 0.08 }}
                        className="h-full rounded-full bg-gradient-to-r from-berry-400 to-berry-600"
                      />
                    </div>
                    <span className="w-6 text-right text-muted">{n}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-2 font-semibold text-muted">No reviews yet — be the first to share the love 💕</p>
          )}
          {!formOpen && (
            <button type="button" onClick={() => setFormOpen(true)} className="btn-primary mt-6 w-full py-3">
              Write a review
            </button>
          )}
        </div>

        <div>
          <AnimatePresence>
            {thanks && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-4 rounded-2xl bg-mint px-5 py-4 font-bold text-emerald-800">
                Thank you! Your review will appear once it’s approved ✨
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {formOpen && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="card-zs mb-6 space-y-4 p-6">
                  <p className="font-display text-xl font-semibold text-ink">How did you like it?</p>
                  <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <motion.button
                        key={s}
                        type="button"
                        whileHover={{ scale: 1.2, rotate: -8 }}
                        whileTap={{ scale: 0.9 }}
                        onMouseEnter={() => setHover(s)}
                        onClick={() => setForm((f) => ({ ...f, rating: s }))}
                        className="text-amber-400"
                        aria-label={`${s} star${s > 1 ? 's' : ''}`}
                      >
                        <StarIcon className="h-9 w-9" filled={s <= (hover || form.rating)} />
                      </motion.button>
                    ))}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input className="input-zs" placeholder="Your name *" value={form.customer_name} onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))} />
                    <input className="input-zs" placeholder="City (optional)" value={form.customer_city} onChange={(e) => setForm((f) => ({ ...f, customer_city: e.target.value }))} />
                  </div>
                  <textarea
                    className="input-zs resize-none"
                    rows={4}
                    placeholder="Tell other shoppers what you loved… *"
                    value={form.review_text}
                    onChange={(e) => setForm((f) => ({ ...f, review_text: e.target.value }))}
                  />
                  {submitError && <p className="text-sm font-bold text-berry-700">{submitError}</p>}
                  <div className="flex gap-3">
                    <button type="button" onClick={submit} disabled={!canSubmit || submitting} className="btn-primary px-6 py-3">
                      {submitting ? 'Posting…' : 'Post review'}
                    </button>
                    <button type="button" onClick={() => setFormOpen(false)} className="rounded-full px-5 py-3 font-extrabold text-muted hover:text-ink">
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-3">
            {shown.map((r, i) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="card-zs p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-blush-200 to-lilac font-display text-lg font-semibold text-berry-700">
                      {r.customer_name.trim().charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <p className="font-extrabold text-ink">{r.customer_name}</p>
                      <p className="text-xs font-semibold text-muted">{r.customer_city ? `${r.customer_city} · ` : ''}{formatTimeAgo(r.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex text-amber-400">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <StarIcon key={s} className="h-4 w-4" filled={s < r.rating} />
                    ))}
                  </div>
                </div>
                <p className="mt-3 leading-relaxed text-ink-soft">{r.review_text}</p>
              </motion.div>
            ))}
          </div>
          {reviews.length > 4 && (
            <button type="button" onClick={() => setShowAll((s) => !s)} className="mt-4 w-full rounded-full border-2 border-line bg-white py-3 font-extrabold text-ink hover:border-berry-400">
              {showAll ? 'Show fewer' : `Show all ${reviews.length} reviews`}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function ProductSkeleton() {
  return (
    <div className="container-zs grid gap-10 pt-10 lg:grid-cols-2">
      <div className="skeleton aspect-square rounded-[36px]" />
      <div className="space-y-4">
        <div className="skeleton h-4 w-24 rounded" />
        <div className="skeleton h-12 w-3/4 rounded-xl" />
        <div className="skeleton h-10 w-40 rounded-xl" />
        <div className="skeleton h-28 w-full rounded-[24px]" />
        <div className="skeleton h-14 w-full rounded-full" />
      </div>
    </div>
  );
}
