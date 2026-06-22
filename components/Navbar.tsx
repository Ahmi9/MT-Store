'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { publicClient } from '@/lib/supabase';

interface Category {
  id: string | number;
  parent_id?: string | number | null;
  name: string;
  [key: string]: any;
}

interface SiteSettings {
  store_name: string | null;
}

function ShoppingBagIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  );
}

function StoreLogo({ name }: { name: string }) {
  const words = name.split(' ');
  if (words.length === 1) {
    return <span className="text-[#0a0a0a]">{name}</span>;
  }
  const lastWord = words.pop();
  return (
    <>
      {words.join(' ')}{' '}
      <span className="text-[#f5c518]">{lastWord}</span>
    </>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
    </svg>
  );
}

export default function Navbar() {
  const [cartCount, setCartCount] = useState(0);
  const [storeName, setStoreName] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDropdown, setOpenDropdown] = useState<string | number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | number | null>(null);

  useEffect(() => {
    const updateCartCount = () => {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      const count = cart.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
      setCartCount(count);
    };

    updateCartCount();
    window.addEventListener('cartUpdated', updateCartCount);
    return () => window.removeEventListener('cartUpdated', updateCartCount);
  }, []);

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout>;
    const startTime = Date.now();

    const fetchData = async () => {
      const { data: settingsData } = await publicClient
        .from('site_settings')
        .select('store_name')
        .single();
      if (settingsData) setStoreName((settingsData as SiteSettings).store_name);

      const { data: categoriesData } = await publicClient
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (categoriesData) setCategories(categoriesData as Category[]);

      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 800 - elapsed);
      hideTimer = setTimeout(() => setLoading(false), remaining);
    };
    fetchData();

    return () => {
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, []);

  const topLevelCategories = categories.filter(c => c.parent_id === null);

  const getSubcategories = (parentId: string | number) => {
    return categories.filter(c => c.parent_id === parentId);
  };

  const hasActiveSubcategories = (parentId: string | number) => {
    return categories.some(c => c.parent_id === parentId && c.is_active);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
    setExpandedCategory(null);
  };

  return (
    <header className="bg-white border-b border-[#efefef] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 md:px-10 py-[18px] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <MenuIcon className="h-6 w-6 text-[#111111]" />
          </button>

          <Link href="/" className="text-xl font-bold tracking-tight">
            {loading ? (
              <span className="bg-gray-200 animate-pulse rounded text-transparent">Store Name</span>
            ) : storeName ? (
              <StoreLogo name={storeName} />
            ) : (
              <span className="text-[#0a0a0a]">MT</span>
            )}
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          {loading ? (
            <>
              <span className="bg-gray-200 animate-pulse rounded h-5 w-20" />
              <span className="bg-gray-200 animate-pulse rounded h-5 w-24" />
              <span className="bg-gray-200 animate-pulse rounded h-5 w-20" />
              <span className="bg-gray-200 animate-pulse rounded h-5 w-28" />
            </>
          ) : (
            <>
              <Link
                href="/products"
                className="text-sm font-medium text-[#111111] hover:text-[#f5c518] transition-colors"
              >
                All Products
              </Link>
              {topLevelCategories.map((category) => {
                const subcategories = getSubcategories(category.id);
                const hasSubs = hasActiveSubcategories(category.id);
                if (hasSubs) {
                  return (
                    <div
                      key={category.id}
                      className="relative group pb-2"
                      onMouseEnter={() => setOpenDropdown(category.id)}
                      onMouseLeave={() => setOpenDropdown(null)}
                    >
                      <button className="flex items-center gap-1 text-sm font-medium text-[#111111] hover:text-[#f5c518] transition-colors pt-2">
                        {category.name}
                        <ChevronDownIcon className="h-4 w-4" />
                      </button>
                      <div className={`absolute left-0 bg-white border border-[#efefef] rounded-lg shadow-lg min-w-[180px] py-2 transition-all ${openDropdown === category.id ? 'opacity-100 visible' : 'opacity-0 invisible'} mt-1`}>
                        <Link
                          href={`/products?category=${category.slug}`}
                          className="block px-4 py-2 text-sm text-[#111111] hover:bg-[#f7f7f5] hover:text-[#f5c518] transition-colors"
                        >
                          All {category.name}
                        </Link>
                        {subcategories.filter(s => s.is_active).map((sub) => (
                          <Link
                            key={sub.id}
                            href={`/products?category=${sub.slug}`}
                            className="block px-4 py-2 text-sm text-[#666] hover:bg-[#f7f7f5] hover:text-[#f5c518] transition-colors pl-8"
                          >
                            {sub.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                }
                return (
                  <Link
                    key={category.id}
                    href={`/products?category=${category.slug}`}
                    className="text-sm font-medium text-[#111111] hover:text-[#f5c518] transition-colors"
                  >
                    {category.name}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        <Link href="/cart">
          <motion.div
            whileTap={{ scale: 0.95 }}
            className="relative bg-[#0a0a0a] p-3 rounded-full hover:bg-[#333] transition-colors"
          >
            <ShoppingBagIcon className="h-5 w-5 text-white" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#f5c518] text-[#0a0a0a] text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </motion.div>
        </Link>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={closeMobileMenu}
              className="fixed inset-0 bg-black/50 z-50 md:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed top-0 left-0 bottom-0 w-[300px] max-w-[85vw] bg-white z-50 md:hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-[#efefef]">
                <Link href="/" onClick={closeMobileMenu} className="text-xl font-bold tracking-tight">
                  {storeName ? <StoreLogo name={storeName} /> : <span className="text-[#0a0a0a]">MT</span>}
                </Link>
                <button
                  type="button"
                  onClick={closeMobileMenu}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XIcon className="h-6 w-6 text-[#111111]" />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto py-4">
                <Link
                  href="/products"
                  onClick={closeMobileMenu}
                  className="block px-6 py-3 text-sm font-medium text-[#111111] hover:bg-gray-50 transition-colors"
                >
                  All Products
                </Link>

                {topLevelCategories.map((category) => {
                  const subcategories = getSubcategories(category.id);
                  const hasSubs = hasActiveSubcategories(category.id);
                  const isExpanded = expandedCategory === category.id;

                  if (hasSubs) {
                    return (
                      <div key={category.id}>
                        <button
                          type="button"
                          onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
                          className="w-full flex items-center justify-between px-6 py-3 text-sm font-medium text-[#111111] hover:bg-gray-50 transition-colors"
                        >
                          <span>{category.name}</span>
                          <motion.div
                            animate={{ rotate: isExpanded ? 90 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronRightIcon className="h-5 w-5 text-[#666]" />
                          </motion.div>
                        </button>
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <Link
                                href={`/products?category=${category.slug}`}
                                onClick={closeMobileMenu}
                                className="block pl-10 pr-6 py-2 text-sm text-[#666] hover:bg-gray-50 transition-colors"
                              >
                                All {category.name}
                              </Link>
                              {subcategories.filter(s => s.is_active).map((sub) => (
                                <Link
                                  key={sub.id}
                                  href={`/products?category=${sub.slug}`}
                                  onClick={closeMobileMenu}
                                  className="block pl-10 pr-6 py-2 text-sm text-[#666] hover:bg-gray-50 transition-colors"
                                >
                                  {sub.name}
                                </Link>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={category.id}
                      href={`/products?category=${category.slug}`}
                      onClick={closeMobileMenu}
                      className="block px-6 py-3 text-sm font-medium text-[#111111] hover:bg-gray-50 transition-colors"
                    >
                      {category.name}
                    </Link>
                  );
                })}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}