'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, usePathname } from 'next/navigation';
import { publicClient } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AnnouncementBar from '@/components/AnnouncementBar';
import VariantPickerModal from '@/components/VariantPickerModal';

interface Product {
  id: number;
  name: string;
  slug: string;
  price: number;
  original_price: number | null;
  images: string[] | null;
  category_id: number | null;
  category_name?: string | null;
  is_featured: boolean;
  is_new?: boolean;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  is_active: boolean;
}

function SkeletonProductCard() {
  return (
    <div className="bg-white border border-[#efefef] rounded-xl overflow-hidden">
      <div className="h-[200px] bg-gray-200 animate-pulse" />
      <div className="p-4">
        <div className="h-3 bg-gray-200 rounded animate-pulse w-16 mb-2" />
        <div className="h-4 bg-gray-200 rounded animate-pulse w-full mb-3" />
        <div className="h-4 bg-gray-200 rounded animate-pulse w-20" />
      </div>
    </div>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function StarIcon({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill={filled ? '#111111' : 'none'}
      stroke={filled ? '#111111' : '#d1d5db'}
      strokeWidth="2"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function ProductsPageContent() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const categorySlug = searchParams.get('category');

  const [products, setProducts] = useState<Product[]>([]);
  const [activeCategoryName, setActiveCategoryName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewAggregates, setReviewAggregates] = useState<Record<string, { avg: number; count: number }>>({});
  const [variantPickerProduct, setVariantPickerProduct] = useState<Product | null>(null);
  const [productsWithVariants, setProductsWithVariants] = useState<Set<number>>(new Set());

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout>;
    const startTime = Date.now();

    const fetchData = async () => {
      setLoading(true);

      const { data: categoriesData } = await publicClient
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      let query = publicClient
        .from('products')
        .select('id, name, slug, price, original_price, images, category_id, is_featured')
        .eq('is_active', true);

      if (categorySlug) {
        const cat = categoriesData?.find((c: Category) => c.slug === categorySlug);
        if (cat) {
          setActiveCategoryName(cat.name);
          const categoryIds = [cat.id];
          const subs = categoriesData?.filter((c: Category) => c.parent_id === cat.id) || [];
          categoryIds.push(...subs.map((s: Category) => s.id));
          query = query.in('category_id', categoryIds);
        }
      } else {
        setActiveCategoryName(null);
      }

      const res = await query;

      if (!res.error && res.data) {
        const categoryMap: Record<number, string> = {};
        categoriesData?.forEach((c: Category) => {
          categoryMap[c.id] = c.name;
        });
        const allProducts = res.data.map((p: Product) => ({
          ...p,
          category_name: p.category_id ? categoryMap[p.category_id] : null,
          is_new: false,
        }));
        allProducts.slice(0, 2).forEach((p: any) => p.is_new = true);
        setProducts(allProducts);

        if (res.data.length > 0) {
          const productIds = res.data.map((p: any) => p.id);
          const { data: variantsData } = await publicClient
            .from('product_attributes')
            .select('product_id')
            .in('product_id', productIds);

          if (variantsData) {
            const variantProductIds = new Set(variantsData.map((v: any) => v.product_id));
            setProductsWithVariants(variantProductIds);
          }
        }

        if (res.data.length > 0) {
          const productIds = res.data.map((p: any) => p.id);
          console.log('[Products Page] productIds for review query:', productIds, 'types:', productIds.map(p => typeof p));
          const { data: reviewsData, error: reviewsError } = await publicClient
            .from('product_reviews')
            .select('product_id, rating')
            .in('product_id', productIds)
            .eq('is_approved', true);

          console.log('[Products Page] reviewsData returned:', reviewsData);
          console.log('[Products Page] reviewsError:', reviewsError);

          const aggregates: Record<string, { avg: number; count: number }> = {};
          if (reviewsData) {
            const grouped: Record<string, number[]> = {};
            reviewsData.forEach((r: any) => {
              if (!grouped[r.product_id]) grouped[r.product_id] = [];
              grouped[r.product_id].push(r.rating);
            });
            Object.entries(grouped).forEach(([pid, ratings]) => {
              const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
              aggregates[pid] = { avg, count: ratings.length };
            });
          }
          console.log('[Products Page] computed aggregates:', aggregates);
          console.log('[Products Page] first product.id:', res.data[0]?.id, 'type:', typeof res.data[0]?.id);
          setReviewAggregates(aggregates);
        }
      }

      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 800 - elapsed);
      hideTimer = setTimeout(() => setLoading(false), remaining);
    };
    fetchData();

    return () => {
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [categorySlug, pathname]);

  const addToCart = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();

    if (productsWithVariants.has(product.id)) {
      setVariantPickerProduct(product);
      return;
    }

    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existing = cart.find((item: any) => item.id === product.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({ id: product.id, name: product.name, price: product.price, image: product.images?.[0], quantity: 1 });
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const handleVariantAdd = (selectedVariant: Record<string, string> | null, price: number) => {
    if (!variantPickerProduct) return;

    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existing = cart.find((item: any) => {
      if (selectedVariant) {
        return item.id === variantPickerProduct.id && JSON.stringify(item.selectedVariant) === JSON.stringify(selectedVariant);
      }
      return item.id === variantPickerProduct.id;
    });

    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({
        id: variantPickerProduct.id,
        name: variantPickerProduct.name,
        price: price,
        image: variantPickerProduct.images?.[0],
        quantity: 1,
        selectedVariant: selectedVariant || null,
      });
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cartUpdated'));
    setVariantPickerProduct(null);
  };

  const productVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: Math.min(i * 0.05, 0.5),
        duration: 0.3,
        ease: 'easeOut' as const,
      },
    }),
  };

  return (
    <div className="min-h-screen bg-white">
      <AnnouncementBar />
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 py-12">
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-2xl font-bold text-[#111111] tracking-tight mb-8"
        >
          {activeCategoryName || 'All Products'}
        </motion.h1>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
            >
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonProductCard key={i} />
              ))}
            </motion.div>
          ) : products.length > 0 ? (
            <motion.div
              key="products"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
            >
              {products.map((product, i) => (
                <motion.div
                  key={product.id}
                  custom={i}
                  variants={productVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <Link
                    href={`/products/${product.slug}`}
                    className="group bg-white border border-[#efefef] rounded-xl overflow-hidden hover:shadow-xl transition-all block"
                  >
                    <div className="h-[200px] bg-[#f7f7f5] relative overflow-hidden">
                      {product.images && product.images[0] ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          No Image
                        </div>
                      )}
                      {product.original_price && (
                        <span className="absolute top-3 left-3 bg-[#f5c518] text-[#0a0a0a] text-[10px] font-bold px-2.5 py-1 rounded-full">
                          SALE
                        </span>
                      )}
                      {product.is_new && (
                        <span className="absolute top-3 left-3 bg-[#0a0a0a] text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
                          NEW
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      {product.category_name && (
                        <p className="text-[10px] text-[#999] uppercase tracking-wider mb-1">
                          {product.category_name}
                        </p>
                      )}
                      <h3 className="font-bold text-[#111111] text-sm mb-2 leading-tight line-clamp-2">
                        {product.name}
                      </h3>
                      {reviewAggregates[String(product.id)] ? (
                        <div className="flex items-center gap-1 mb-3">
                          {[1,2,3,4,5].map((i) => (
                            <StarIcon key={i} className="h-3.5 w-3.5" filled={i <= Math.round(reviewAggregates[String(product.id)].avg)} />
                          ))}
                          <span className="text-[10px] text-[#999] ml-1">
                            ({reviewAggregates[String(product.id)].avg.toFixed(1)}) · {reviewAggregates[String(product.id)].count} review{reviewAggregates[String(product.id)].count !== 1 ? 's' : ''}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 mb-3">
                          {[1,2,3,4,5].map((i) => (
                            <StarIcon key={i} className="h-3.5 w-3.5" filled={false} />
                          ))}
                          <span className="text-[10px] text-[#999] ml-1">No reviews yet</span>
                        </div>
                      )}
                      <motion.div
                        whileHover={{ y: -4 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center justify-between"
                      >
                        <div className="flex flex-col">
                          <span className="font-bold text-[#111111]">
                            Rs. {product.price.toLocaleString()}
                          </span>
                          {product.original_price && (
                            <span className="text-[#999] text-xs line-through">
                              Rs. {product.original_price.toLocaleString()}
                            </span>
                          )}
                        </div>
                        <motion.button
                          onClick={(e) => addToCart(e, product)}
                          className="bg-[#0a0a0a] text-white w-9 h-9 rounded-lg flex items-center justify-center hover:bg-[#333] transition-colors"
                          whileTap={{ scale: 0.9 }}
                        >
                          <PlusIcon className="h-4 w-4" />
                        </motion.button>
                      </motion.div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="text-center py-20"
            >
              <p className="text-[#666666] text-lg mb-4">No products found</p>
              <p className="text-[#999] text-sm">Check back later for new products</p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Footer />

      <VariantPickerModal
        product={variantPickerProduct!}
        isOpen={!!variantPickerProduct}
        onClose={() => setVariantPickerProduct(null)}
        onAdd={handleVariantAdd}
      />
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-white">
      <AnnouncementBar />
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <SkeletonProductCard key={i} />
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ProductsPageContent />
    </Suspense>
  );
}