'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { publicClient } from '@/lib/supabase';
import { getCategories, getSiteSettings, type Category, type Product } from '@/lib/catalog';
import { withDealPrice } from '@/lib/deal';
import { formatPrice } from '@/lib/cart';
import { useStore } from '@/components/store/StoreProvider';
import { ArrowRightIcon, SearchIcon, SparkleIcon, XIcon } from '@/components/store/icons';

export default function SearchOverlay() {
  const router = useRouter();
  const { searchOpen, setSearchOpen } = useStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // ⌘K / Ctrl+K and "/" open search from anywhere
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName);
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setSearchOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    getCategories().then((c) => setCategories(c.filter((x) => !x.parent_id).slice(0, 8)));
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    document.body.style.overflow = 'hidden';
    return () => {
      clearTimeout(t);
      document.body.style.overflow = '';
    };
  }, [searchOpen]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      const { data } = await publicClient
        .from('products')
        .select('id, name, slug, price, original_price, images, category_id, is_featured, stock')
        .eq('is_active', true)
        .ilike('name', `%${q.replace(/[%_,()]/g, ' ')}%`)
        .limit(6);
      const settings = await getSiteSettings();
      setResults(((data as Product[]) ?? []).map((p) => withDealPrice({ ...p, price: Number(p.price), original_price: p.original_price ? Number(p.original_price) : null }, settings)));
      setSearching(false);
    }, 220);
    return () => clearTimeout(t);
  }, [query]);

  const close = () => {
    setSearchOpen(false);
    setQuery('');
  };

  const submit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/products?q=${encodeURIComponent(query.trim())}`);
    close();
  };

  return (
    <AnimatePresence>
      {searchOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-start justify-center bg-ink/40 px-3 pt-[8vh] backdrop-blur-md"
          onClick={close}
        >
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl overflow-hidden rounded-[28px] bg-white shadow-pop"
            role="dialog"
            aria-label="Search products"
          >
            <form onSubmit={submit} className="flex items-center gap-3 border-b border-line px-5 py-4">
              <SearchIcon className="h-6 w-6 flex-shrink-0 text-berry-500" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search headphones, watches, powerbanks…"
                className="flex-1 bg-transparent text-lg font-semibold text-ink outline-none placeholder:text-[#c4a9b5]"
              />
              <button type="button" onClick={close} className="flex h-9 w-9 items-center justify-center rounded-full bg-blush-100 text-ink" aria-label="Close search">
                <XIcon className="h-4 w-4" />
              </button>
            </form>

            <div className="max-h-[60vh] overflow-y-auto p-3">
              {query.trim().length < 2 ? (
                <div className="p-3">
                  <p className="mb-3 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.18em] text-muted">
                    <SparkleIcon className="h-3.5 w-3.5 text-berry-400" /> Browse categories
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((c) => (
                      <Link
                        key={c.id}
                        href={`/products?category=${c.slug}`}
                        onClick={close}
                        className="rounded-full border-2 border-line px-4 py-2 text-sm font-bold text-ink-soft transition-all hover:-translate-y-0.5 hover:border-berry-400 hover:text-berry-600"
                      >
                        {c.name}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : searching ? (
                <div className="space-y-2 p-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="skeleton h-14 w-14 rounded-xl" />
                      <div className="flex-1 space-y-2">
                        <div className="skeleton h-3.5 w-2/3 rounded" />
                        <div className="skeleton h-3 w-1/4 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : results.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="font-display text-xl text-ink">No matches for “{query}”</p>
                  <p className="mt-1 text-sm text-muted">Try a shorter word, like “watch” or “buds”.</p>
                </div>
              ) : (
                <>
                  {results.map((p, i) => (
                    <motion.div key={p.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                      <Link
                        href={`/products/${p.slug}`}
                        onClick={close}
                        className="group flex items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-blush-50"
                      >
                        <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-blush-100">
                          {p.images?.[0] && <img src={p.images[0]} alt="" className="h-full w-full object-cover" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold text-ink group-hover:text-berry-600">{p.name}</p>
                          <p className="text-sm font-extrabold text-berry-600">{formatPrice(Number(p.price))}</p>
                        </div>
                        <ArrowRightIcon className="h-4 w-4 text-muted transition-transform group-hover:translate-x-1 group-hover:text-berry-500" />
                      </Link>
                    </motion.div>
                  ))}
                  <button
                    type="button"
                    onClick={submit}
                    className="mt-1 w-full rounded-2xl bg-blush-100 py-3 text-sm font-extrabold text-berry-600 hover:bg-blush-200"
                  >
                    See all results for “{query.trim()}”
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
