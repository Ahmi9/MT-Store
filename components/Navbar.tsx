'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion';
import Logo from '@/components/store/Logo';
import { useStore } from '@/components/store/StoreProvider';
import { cartCount } from '@/lib/cart';
import { getCategories, type Category } from '@/lib/catalog';
import {
  BagIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  HeartIcon,
  MenuIcon,
  SearchIcon,
  XIcon,
} from '@/components/store/icons';

const CATEGORY_TINTS = ['bg-blush-100', 'bg-lilac', 'bg-peach', 'bg-mint', 'bg-blush-200', 'bg-cream'];

export default function Navbar() {
  const pathname = usePathname();
  const { cart, wishlist, setCartOpen, setSearchOpen, cartBump } = useStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [megaOpen, setMegaOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (y) => setScrolled(y > 24));

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setMegaOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const topLevel = categories.filter((c) => !c.parent_id);
  const childrenOf = (id: string) => categories.filter((c) => c.parent_id === id);
  const count = cartCount(cart);

  const links = [
    { href: '/', label: 'Home' },
    { href: '/products', label: 'Shop all' },
    { href: '/track-order', label: 'Track order' },
  ];

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname === href.split('?')[0] && !href.includes('?'));

  return (
    <>
      <header className="sticky top-0 z-50 px-2 pt-2 md:px-4 md:pt-3">
        <motion.div
          animate={{
            boxShadow: scrolled ? '0 14px 40px -18px rgba(226,66,127,0.35)' : '0 0 0 rgba(0,0,0,0)',
          }}
          className={`relative mx-auto flex max-w-7xl items-center justify-between gap-3 rounded-full border px-3 transition-all duration-300 md:px-5 ${
            scrolled ? 'border-line bg-white/85 py-2 backdrop-blur-xl' : 'border-transparent bg-white/60 py-2.5 backdrop-blur-md md:py-3'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-blush-100 lg:hidden"
              aria-label="Open menu"
            >
              <MenuIcon className="h-6 w-6" />
            </button>
            <Logo size={scrolled ? 38 : 44} />
          </div>

          <nav className="hidden items-center gap-1 lg:flex">
            {links.slice(0, 2).map((l) => (
              <NavLink key={l.href} href={l.href} active={isActive(l.href)}>
                {l.label}
              </NavLink>
            ))}

            <div className="relative" onMouseEnter={() => setMegaOpen(true)} onMouseLeave={() => setMegaOpen(false)}>
              <button
                type="button"
                onClick={() => setMegaOpen((o) => !o)}
                className="flex items-center gap-1 rounded-full px-4 py-2 text-[15px] font-bold text-ink-soft transition-colors hover:text-berry-600"
                aria-expanded={megaOpen}
              >
                Categories
                <ChevronDownIcon className={`h-4 w-4 transition-transform ${megaOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {megaOpen && topLevel.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                    transition={{ duration: 0.18 }}
                    className="absolute left-1/2 top-full w-[640px] -translate-x-1/2 pt-3"
                  >
                    <div className="card-zs grid grid-cols-3 gap-2 p-3 shadow-pop">
                      {topLevel.map((cat, i) => {
                        const subs = childrenOf(cat.id);
                        return (
                          <div key={cat.id} className={`rounded-2xl p-3 ${CATEGORY_TINTS[i % CATEGORY_TINTS.length]}`}>
                            <Link
                              href={`/products?category=${cat.slug}`}
                              className="group flex items-center justify-between font-display text-[15px] font-semibold text-ink"
                            >
                              {cat.name}
                              <ChevronRightIcon className="h-4 w-4 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                            </Link>
                            {subs.length > 0 && (
                              <div className="mt-1.5 flex flex-col gap-0.5">
                                {subs.map((s) => (
                                  <Link
                                    key={s.id}
                                    href={`/products?category=${s.slug}`}
                                    className="text-[13px] font-semibold text-ink-soft transition-colors hover:text-berry-600"
                                  >
                                    {s.name}
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {links.slice(2).map((l) => (
              <NavLink key={l.href} href={l.href} active={isActive(l.href)}>
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-1 md:gap-1.5">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="group flex h-10 items-center gap-2 rounded-full px-2.5 text-ink transition-colors hover:bg-blush-100 md:border md:border-line md:bg-white md:pl-3 md:pr-2"
              aria-label="Search products"
            >
              <SearchIcon className="h-5 w-5" />
              <span className="hidden text-sm font-semibold text-muted xl:inline">Search cute stuff…</span>
              <kbd className="hidden rounded-md bg-blush-100 px-1.5 py-0.5 text-[11px] font-bold text-berry-600 xl:inline">⌘K</kbd>
            </button>

            <Link
              href="/wishlist"
              className="relative hidden h-10 w-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-blush-100 sm:flex"
              aria-label="Wishlist"
            >
              <HeartIcon className="h-5 w-5" filled={wishlist.length > 0} />
              {wishlist.length > 0 && <Badge value={wishlist.length} />}
            </Link>

            <motion.button
              key={cartBump}
              type="button"
              onClick={() => setCartOpen(true)}
              initial={cartBump ? { scale: 1 } : false}
              animate={cartBump ? { scale: [1, 1.25, 0.9, 1.08, 1], rotate: [0, -10, 8, -4, 0] } : undefined}
              transition={{ duration: 0.6 }}
              className="relative flex h-11 w-11 items-center justify-center rounded-full bg-ink text-white shadow-soft transition-colors hover:bg-berry-600"
              aria-label={`Open bag, ${count} items`}
            >
              <BagIcon className="h-5 w-5" />
              {count > 0 && <Badge value={count} pink />}
            </motion.button>
          </div>
        </motion.div>
      </header>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-[60] bg-ink/40 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 top-0 z-[61] flex w-[320px] max-w-[88vw] flex-col overflow-hidden rounded-r-[32px] bg-blush-50 lg:hidden"
            >
              <div className="flex items-center justify-between border-b border-line p-4">
                <Logo size={40} onClick={() => setMobileOpen(false)} />
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink"
                  aria-label="Close menu"
                >
                  <XIcon className="h-5 w-5" />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto p-4">
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    setSearchOpen(true);
                  }}
                  className="mb-4 flex w-full items-center gap-2 rounded-2xl border-2 border-line bg-white px-4 py-3 text-left text-sm font-semibold text-muted"
                >
                  <SearchIcon className="h-5 w-5" /> Search products…
                </button>

                <div className="space-y-1">
                  {[...links, { href: '/wishlist', label: 'Wishlist' }].map((l, i) => (
                    <motion.div key={l.href} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }}>
                      <Link
                        href={l.href}
                        className={`block rounded-2xl px-4 py-3 font-display text-lg font-medium ${
                          isActive(l.href) ? 'bg-white text-berry-600 shadow-soft' : 'text-ink hover:bg-white'
                        }`}
                      >
                        {l.label}
                      </Link>
                    </motion.div>
                  ))}
                </div>

                {topLevel.length > 0 && (
                  <>
                    <p className="mb-2 mt-6 px-4 text-xs font-extrabold uppercase tracking-[0.18em] text-muted">Categories</p>
                    <div className="space-y-1">
                      {topLevel.map((cat) => {
                        const subs = childrenOf(cat.id);
                        const open = expanded === cat.id;
                        if (subs.length === 0) {
                          return (
                            <Link key={cat.id} href={`/products?category=${cat.slug}`} className="block rounded-2xl px-4 py-2.5 font-bold text-ink-soft hover:bg-white">
                              {cat.name}
                            </Link>
                          );
                        }
                        return (
                          <div key={cat.id}>
                            <button
                              type="button"
                              onClick={() => setExpanded(open ? null : cat.id)}
                              className="flex w-full items-center justify-between rounded-2xl px-4 py-2.5 font-bold text-ink-soft hover:bg-white"
                            >
                              {cat.name}
                              <ChevronDownIcon className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
                            </button>
                            <AnimatePresence initial={false}>
                              {open && (
                                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                                  <Link href={`/products?category=${cat.slug}`} className="block py-2 pl-8 text-sm font-semibold text-berry-600">
                                    All {cat.name}
                                  </Link>
                                  {subs.map((s) => (
                                    <Link key={s.id} href={`/products?category=${s.slug}`} className="block py-2 pl-8 text-sm font-semibold text-ink-soft">
                                      {s.name}
                                    </Link>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </nav>

              <p className="flex items-center justify-center gap-1.5 border-t border-line px-4 py-3 text-xs font-semibold text-muted">
                Made with <HeartIcon className="h-3.5 w-3.5 text-berry-400" filled /> by
                <a
                  href="https://ahmimakes.site"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-extrabold text-ink-soft underline decoration-berry-300 underline-offset-4 transition-colors hover:text-berry-600"
                >
                  ahmimakes
                </a>
              </p>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`relative flex items-center gap-1.5 rounded-full px-4 py-2 text-[15px] font-bold transition-colors ${
        active ? 'text-berry-600' : 'text-ink-soft hover:text-berry-600'
      }`}
    >
      {active && (
        <motion.span layoutId="nav-pill" className="absolute inset-0 -z-10 rounded-full bg-blush-100" transition={{ type: 'spring', stiffness: 380, damping: 30 }} />
      )}
      {children}
    </Link>
  );
}

function Badge({ value, pink }: { value: number; pink?: boolean }) {
  return (
    <motion.span
      key={value}
      initial={{ scale: 0.4 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 15 }}
      className={`absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-extrabold ring-2 ring-white ${
        pink ? 'bg-berry-400 text-white' : 'bg-berry-500 text-white'
      }`}
    >
      {value > 99 ? '99+' : value}
    </motion.span>
  );
}
