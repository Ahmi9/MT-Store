'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { publicClient } from '@/lib/supabase';
import {
  PRODUCT_FIELDS,
  categoryWithChildren,
  enrichProducts,
  getCategories,
  type CatalogProduct,
  type Category,
  type Product,
} from '@/lib/catalog';
import { discountPercent, formatPrice } from '@/lib/cart';
import ProductCard, { ProductCardSkeleton } from '@/components/store/ProductCard';
import { ChevronDownIcon, FilterIcon, SearchIcon, SparkleIcon, XIcon } from '@/components/store/icons';

type Sort = 'featured' | 'newest' | 'price-asc' | 'price-desc' | 'discount' | 'rating';

const SORTS: { value: Sort; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'discount', label: 'Biggest discount' },
  { value: 'rating', label: 'Top rated' },
];

function ProductsPageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const categorySlug = params.get('category');
  const dealsOnly = params.get('filter') === 'deals';
  const q = params.get('q')?.trim() ?? '';

  const [all, setAll] = useState<CatalogProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<Sort>('featured');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [searchText, setSearchText] = useState(q);

  useEffect(() => setSearchText(q), [q]);

  useEffect(() => {
    (async () => {
      const [{ data }, cats] = await Promise.all([
        publicClient.from('products').select(PRODUCT_FIELDS).eq('is_active', true).order('created_at', { ascending: false }),
        getCategories(),
      ]);
      setAll(await enrichProducts((data as Product[]) ?? []));
      setCategories(cats);
      setLoading(false);
    })();
  }, []);

  const activeCategory = categories.find((c) => c.slug === categorySlug) ?? null;
  const parentCategory = activeCategory?.parent_id ? categories.find((c) => c.id === activeCategory.parent_id) ?? null : null;
  const topLevel = categories.filter((c) => !c.parent_id);
  const subcats = activeCategory ? categories.filter((c) => c.parent_id === (parentCategory?.id ?? activeCategory.id)) : [];

  const priceCeiling = useMemo(() => Math.max(1000, ...all.map((p) => p.price)), [all]);

  const visible = useMemo(() => {
    let list = all;
    if (activeCategory) {
      const ids = new Set(categoryWithChildren(categories, activeCategory.id));
      list = list.filter((p) => p.category_id && ids.has(p.category_id));
    }
    if (dealsOnly) list = list.filter((p) => discountPercent(p.price, p.original_price) > 0);
    if (q) {
      const needle = q.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(needle) || p.category_name?.toLowerCase().includes(needle));
    }
    if (inStockOnly) list = list.filter((p) => p.hasVariants || (p.stock ?? 0) > 0);
    if (maxPrice !== null) list = list.filter((p) => p.price <= maxPrice);

    const sorted = [...list];
    switch (sort) {
      case 'newest':
        sorted.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
        break;
      case 'price-asc':
        sorted.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        sorted.sort((a, b) => b.price - a.price);
        break;
      case 'discount':
        sorted.sort((a, b) => discountPercent(b.price, b.original_price) - discountPercent(a.price, a.original_price));
        break;
      case 'rating':
        sorted.sort((a, b) => (b.rating?.avg ?? 0) - (a.rating?.avg ?? 0));
        break;
      default:
        sorted.sort((a, b) => Number(b.is_featured) - Number(a.is_featured));
    }
    return sorted;
  }, [all, activeCategory, categories, dealsOnly, q, inStockOnly, maxPrice, sort]);

  const title = q ? `Results for “${q}”` : dealsOnly ? 'Hot deals' : activeCategory?.name ?? 'Shop everything';
  const filtersActive = inStockOnly || maxPrice !== null;

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams(params.toString());
    if (searchText.trim()) next.set('q', searchText.trim());
    else next.delete('q');
    router.push(`/products${next.toString() ? `?${next}` : ''}`);
  };

  const clearAll = () => {
    setInStockOnly(false);
    setMaxPrice(null);
    router.push('/products');
  };

  const filterPanel = (
    <div className="space-y-6">
      <div>
        <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.18em] text-muted">Price</p>
        <input
          type="range"
          min={0}
          max={priceCeiling}
          step={100}
          value={maxPrice ?? priceCeiling}
          onChange={(e) => {
            const v = Number(e.target.value);
            setMaxPrice(v >= priceCeiling ? null : v);
          }}
          className="w-full accent-berry-500"
          aria-label="Maximum price"
        />
        <div className="mt-1 flex justify-between text-sm font-bold text-ink-soft">
          <span>Rs. 0</span>
          <span className="text-berry-600">Up to {formatPrice(maxPrice ?? priceCeiling)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-2xl bg-blush-50 px-4 py-3">
        <span className="text-sm font-bold text-ink">In stock only</span>
        <button
          type="button"
          role="switch"
          aria-checked={inStockOnly}
          onClick={() => setInStockOnly((v) => !v)}
          className={`relative h-7 w-12 rounded-full transition-colors ${inStockOnly ? 'bg-berry-500' : 'bg-blush-200'}`}
        >
          <motion.span layout className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow ${inStockOnly ? 'right-1' : 'left-1'}`} />
        </button>
      </div>

      <Link
        href={dealsOnly ? '/products' : '/products?filter=deals'}
        className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold transition-colors ${
          dealsOnly ? 'bg-berry-500 text-white' : 'bg-blush-50 text-ink hover:bg-blush-100'
        }`}
      >
        <span className="flex items-center gap-2">
          <SparkleIcon className="h-4 w-4" /> On sale only
        </span>
        {dealsOnly && <XIcon className="h-4 w-4" />}
      </Link>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blush-100 to-blush-50" />
        <div className="absolute -right-20 -top-10 h-64 w-64 animate-blob bg-berry-400/20 blur-3xl" />
        <div className="container-zs relative pb-8 pt-8 md:pt-12">
          <nav className="mb-3 flex items-center gap-2 text-sm font-bold text-muted">
            <Link href="/" className="hover:text-berry-600">Home</Link>
            <span>/</span>
            <Link href="/products" className="hover:text-berry-600">Shop</Link>
            {parentCategory && (
              <>
                <span>/</span>
                <Link href={`/products?category=${parentCategory.slug}`} className="hover:text-berry-600">{parentCategory.name}</Link>
              </>
            )}
            {activeCategory && (
              <>
                <span>/</span>
                <span className="text-ink">{activeCategory.name}</span>
              </>
            )}
          </nav>
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <motion.h1 key={title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="font-display text-4xl font-semibold text-ink md:text-6xl">
                {title}
              </motion.h1>
              <p className="mt-2 font-semibold text-muted">{loading ? 'Loading the goodies…' : `${visible.length} product${visible.length === 1 ? '' : 's'} to fall in love with`}</p>
            </div>
            <form onSubmit={submitSearch} className="flex w-full items-center gap-2 rounded-full border-2 border-line bg-white p-1.5 pl-4 md:w-80">
              <SearchIcon className="h-5 w-5 text-berry-500" />
              <input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search in shop"
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-ink outline-none placeholder:text-[#c4a9b5]"
              />
              <button type="submit" className="rounded-full bg-ink px-4 py-2 text-xs font-extrabold text-white hover:bg-berry-600">
                Go
              </button>
            </form>
          </div>

          {/* Category chips */}
          <div className="no-scrollbar -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
            <CategoryChip href="/products" active={!activeCategory && !dealsOnly}>All</CategoryChip>
            {topLevel.map((c) => (
              <CategoryChip key={c.id} href={`/products?category=${c.slug}`} active={activeCategory?.id === c.id || parentCategory?.id === c.id}>
                {c.name}
              </CategoryChip>
            ))}
          </div>
          {subcats.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
              {subcats.map((s) => (
                <Link
                  key={s.id}
                  href={`/products?category=${s.slug}`}
                  className={`flex-shrink-0 rounded-full px-3.5 py-1.5 text-xs font-extrabold transition-colors ${
                    activeCategory?.id === s.id ? 'bg-blush-200 text-berry-700' : 'text-ink-soft hover:bg-white'
                  }`}
                >
                  {s.name}
                </Link>
              ))}
            </motion.div>
          )}
        </div>
      </section>

      <section className="container-zs grid gap-8 py-6 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <div className="card-zs sticky top-28 p-5">
            <div className="mb-5 flex items-center justify-between">
              <p className="font-display text-xl font-semibold text-ink">Filters</p>
              {(filtersActive || dealsOnly || activeCategory || q) && (
                <button type="button" onClick={clearAll} className="text-xs font-extrabold text-berry-600 hover:underline">
                  Clear all
                </button>
              )}
            </div>
            {filterPanel}
          </div>
        </aside>

        <div>
          <div className="mb-5 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="flex items-center gap-2 rounded-full border-2 border-line bg-white px-4 py-2.5 text-sm font-extrabold text-ink lg:hidden"
            >
              <FilterIcon className="h-4 w-4" /> Filters
              {filtersActive && <span className="h-2 w-2 rounded-full bg-berry-500" />}
            </button>
            <p className="hidden text-sm font-bold text-muted lg:block">Showing {visible.length} of {all.length}</p>
            <label className="relative flex items-center gap-2">
              <span className="hidden text-sm font-bold text-muted sm:inline">Sort by</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="appearance-none rounded-full border-2 border-line bg-white py-2.5 pl-4 pr-10 text-sm font-extrabold text-ink outline-none focus:border-berry-400"
              >
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="pointer-events-none absolute right-3.5 h-4 w-4 text-ink" />
            </label>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-3 md:gap-5 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="rounded-[32px] border-2 border-dashed border-blush-300 bg-white/70 px-6 py-16 text-center">
              <motion.div animate={{ rotate: [0, -10, 10, 0] }} transition={{ duration: 2, repeat: Infinity }} className="mx-auto mb-4 w-fit text-5xl">
                🔍
              </motion.div>
              <p className="font-display text-2xl text-ink">Nothing here… yet!</p>
              <p className="mx-auto mt-1 max-w-sm text-sm font-semibold text-muted">Try another category or clear your filters to see more cute things.</p>
              <button type="button" onClick={clearAll} className="btn-primary mt-6 px-6 py-3 text-sm">
                Clear filters
              </button>
            </motion.div>
          ) : (
            <motion.div layout className="grid grid-cols-2 gap-3 md:gap-5 xl:grid-cols-3">
              {visible.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </motion.div>
          )}
        </div>
      </section>

      <AnimatePresence>
        {sheetOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSheetOpen(false)} className="fixed inset-0 z-[70] bg-ink/40 backdrop-blur-sm lg:hidden" />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 320 }}
              className="fixed inset-x-0 bottom-0 z-[71] rounded-t-[32px] bg-white p-5 pb-8 lg:hidden"
            >
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-blush-200" />
              <div className="mb-5 flex items-center justify-between">
                <p className="font-display text-2xl font-semibold text-ink">Filters</p>
                <button type="button" onClick={clearAll} className="text-sm font-extrabold text-berry-600">
                  Clear all
                </button>
              </div>
              {filterPanel}
              <button type="button" onClick={() => setSheetOpen(false)} className="btn-primary mt-6 w-full py-3.5">
                Show {visible.length} product{visible.length === 1 ? '' : 's'}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function CategoryChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`relative flex-shrink-0 rounded-full px-5 py-2.5 text-sm font-extrabold transition-colors ${
        active ? 'text-white' : 'border-2 border-line bg-white text-ink-soft hover:border-blush-300 hover:text-berry-600'
      }`}
    >
      {active && <motion.span layoutId="cat-chip" className="absolute inset-0 -z-0 rounded-full bg-ink" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
      <span className="relative">{children}</span>
    </Link>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="container-zs grid grid-cols-2 gap-3 py-16 md:gap-5 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      }
    >
      <ProductsPageContent />
    </Suspense>
  );
}
