'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import { usePathname } from 'next/navigation';
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
  stock?: number;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  is_active: boolean;
}

interface SiteSettings {
  hero_title: string | null;
  hero_subtitle: string | null;
}

const TRUST_ITEMS = [
  { title: 'Nationwide COD', subtitle: 'Cash on delivery across Pakistan', icon: 'truck' },
  { title: '100% Genuine', subtitle: 'Original products only', icon: 'shield' },
  { title: '7-Day Returns', subtitle: 'Easy return policy', icon: 'rotate' },
  { title: 'WhatsApp Support', subtitle: 'Quick response', icon: 'whatsapp' },
];

const TESTIMONIALS = [
  { name: 'Ahmed K.', city: 'Karachi', text: 'Great quality products! Delivery was super fast. Will definitely order again.', initials: 'AK' },
  { name: 'Fatima S.', city: 'Lahore', text: 'Best prices in the market. Customer support helped me choose the right powerbank.', initials: 'FS' },
  { name: 'Muhammad R.', city: 'Islamabad', text: 'Ordered cables for my phone. Genuine product as described. Highly recommended!', initials: 'MR' },
];

function BatteryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="16" height="10" rx="2" ry="2" />
      <line x1="22" x2="22" y1="11" y2="13" />
      <line x1="6" x2="6" y1="11" y2="13" />
      <line x1="10" x2="10" y1="11" y2="13" />
      <line x1="14" x2="14" y1="11" y2="13" />
    </svg>
  );
}

function PlugIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22v-5" />
      <path d="M9 8V2" />
      <path d="M15 8V2" />
      <path d="M18 8H6a2 2 0 0 0-2 2v3a6 6 0 0 0 12 0v-3a2 2 0 0 0-2-2Z" />
    </svg>
  );
}

function HeadphonesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </svg>
  );
}

function CableIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function TruckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
      <path d="M15 18H9" />
      <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
      <circle cx="17" cy="18" r="2" />
      <circle cx="7" cy="18" r="2" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function RotateIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}

function StarIcon({ className, filled }: { className?: string; filled?: boolean }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function ShoppingBagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function BoltIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}

const ICONS: Record<string, React.FC<{ className?: string }>> = {
  battery: BatteryIcon,
  plug: PlugIcon,
  bolt: BoltIcon,
  headphones: HeadphonesIcon,
  cable: CableIcon,
  truck: TruckIcon,
  shield: ShieldIcon,
  rotate: RotateIcon,
  whatsapp: WhatsAppIcon,
};

function CountUp({ target, suffix = '', decimalPlaces = 0 }: { target: number; suffix?: string; decimalPlaces?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const startTime = useRef<number>(Date.now());

  useEffect(() => {
    if (!isInView) return;

    const minDelay = 800;
    const elapsed = Date.now() - startTime.current;
    const delay = Math.max(0, minDelay - elapsed);

    const startTimer = setTimeout(() => {
      const duration = 1500;
      const steps = 60;
      const increment = target / steps;
      let current = 0;
      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          setCount(target);
          clearInterval(timer);
        } else {
          setCount(decimalPlaces > 0 ? parseFloat(current.toFixed(decimalPlaces)) : Math.floor(current));
        }
      }, duration / steps);

      return () => clearInterval(timer);
    }, delay);

    return () => clearTimeout(startTimer);
  }, [isInView, target]);

  return (
    <div ref={ref} className="text-2xl font-bold text-white">
      {count.toFixed(decimalPlaces)}{suffix}
    </div>
  );
}

function FloatingIcon({ emoji }: { emoji: string }) {
  return (
    <motion.div
      className="bg-[#0a0a0a] rounded-xl p-5 flex flex-col items-center gap-2"
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
    >
      <span className="text-2xl">{emoji}</span>
    </motion.div>
  );
}

export default function HomePage() {
  const pathname = usePathname();
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewAggregates, setReviewAggregates] = useState<Record<string, { avg: number; count: number }>>({});
  const [variantPickerProduct, setVariantPickerProduct] = useState<Product | null>(null);
  const [productsWithVariants, setProductsWithVariants] = useState<Set<number>>(new Set());

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout>;
    const startTime = Date.now();

    const fetchData = async () => {
      const [productsRes, categoriesRes, settingsRes] = await Promise.all([
        publicClient
          .from('products')
          .select('id, name, slug, price, original_price, images, category_id, is_featured, stock')
          .eq('is_featured', true)
          .eq('is_active', true),
        publicClient
          .from('categories')
          .select('*')
          .eq('is_active', true)
          .is('parent_id', null)
          .order('display_order', { ascending: true }),
        publicClient
          .from('site_settings')
          .select('hero_title, hero_subtitle')
          .single(),
      ]);

      if (!productsRes.error && productsRes.data) {
        const allCategories = await publicClient
          .from('categories')
          .select('*')
          .eq('is_active', true);
        const categoryMap: Record<number, string> = {};
        if (allCategories.data) {
          allCategories.data.forEach((c: Category) => {
            categoryMap[c.id] = c.name;
          });
        }
        const products = productsRes.data.map((p: Product) => ({
          ...p,
          category_name: p.category_id ? categoryMap[p.category_id] : null,
          is_new: false,
        }));
        products.slice(0, 2).forEach((p: any) => p.is_new = true);
        setFeaturedProducts(products);

        if (productsRes.data.length > 0) {
          const productIds = productsRes.data.map((p: any) => p.id);
          const { data: variantsData } = await publicClient
            .from('product_attributes')
            .select('product_id')
            .in('product_id', productIds);

          if (variantsData) {
            const variantProductIds = new Set(variantsData.map((v: any) => v.product_id));
            setProductsWithVariants(variantProductIds);
          }
        }

        if (productsRes.data.length > 0) {
          const productIds = productsRes.data.map((p: any) => p.id);
          console.log('[Home Page] productIds for review query:', productIds, 'types:', productIds.map(p => typeof p));
          const { data: reviewsData, error: reviewsError } = await publicClient
            .from('product_reviews')
            .select('product_id, rating')
            .in('product_id', productIds)
            .eq('is_approved', true);

          console.log('[Home Page] reviewsData returned:', reviewsData);
          console.log('[Home Page] reviewsError:', reviewsError);

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
          console.log('[Home Page] computed aggregates:', aggregates);
          console.log('[Home Page] first product.id:', productsRes.data[0]?.id, 'type:', typeof productsRes.data[0]?.id);
          setReviewAggregates(aggregates);
        }
      }

      if (!categoriesRes.error && categoriesRes.data) {
        console.log('[Home Page] categories fetched:', categoriesRes.data);
        setCategories(categoriesRes.data as Category[]);
        console.log('[Home Page] categories state after set:', categoriesRes.data);
      } else {
        console.log('[Home Page] categories fetch error or no data:', categoriesRes.error, categoriesRes.data);
        setCategories([]);

        const allCategoriesData = await publicClient
          .from('categories')
          .select('*')
          .eq('is_active', true);

        const counts: Record<string, number> = {};
        for (const cat of categoriesRes.data) {
          const subcategoryIds = allCategoriesData.data
            ?.filter((c: Category) => c.parent_id === cat.id)
            .map((c: Category) => c.id) || [];
          const allCategoryIds = [cat.id, ...subcategoryIds];
          const { count } = await publicClient
            .from('products')
            .select('id', { count: 'exact' })
            .in('category_id', allCategoryIds)
            .eq('is_active', true);
          counts[cat.slug] = count || 0;
        }
        setCategoryCounts(counts);
      }

      if (!settingsRes.error && settingsRes.data) {
        setSettings(settingsRes.data as SiteSettings);
      }

      setCategoriesLoading(false);
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 800 - elapsed);
      hideTimer = setTimeout(() => setLoading(false), remaining);
    };

    fetchData();

    return () => {
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [pathname]);

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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  };

  return (
    <div className="min-h-screen bg-white">
      <AnnouncementBar />
      <Navbar />

      <section className="bg-[#0a0a0a] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#f5c518] opacity-[0.03] rounded-full blur-[120px] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-10 py-20 relative z-10">
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8, ease: 'easeOut' }}
              className="inline-flex items-center gap-2 bg-[#f5c518]/10 text-[#f5c518] text-xs font-bold px-4 py-2 rounded-full mb-6"
            >
              <BoltIcon className="h-4 w-4" />
              Pakistan&apos;s trusted electronics store
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.9, ease: 'easeOut' }}
            >
              {settings?.hero_title ? (
                <h1 className="text-[48px] font-bold text-white leading-[1.1] mb-4">
                  {settings.hero_title}
                </h1>
              ) : (
                <h1 className="text-[48px] font-bold text-white leading-[1.1] mb-4">
                  Premium Electronics at <span className="text-[#f5c518]">Unbeatable</span> <span className="text-[#f5c518]">Prices</span>
                </h1>
              )}
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.0, ease: 'easeOut' }}
              className="text-[#999999] text-lg mb-10 max-w-lg"
            >
              {settings?.hero_subtitle || 'Discover genuine electronics with fast delivery across Pakistan. Quality products, competitive prices, and excellent customer service.'}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.1, ease: 'easeOut' }}
              className="flex flex-wrap gap-4 mb-12"
            >
              <Link
                href="/products"
                className="inline-flex items-center gap-2 bg-[#f5c518] text-[#0a0a0a] px-6 py-3.5 rounded-full font-semibold text-sm hover:bg-[#e0b116] transition-colors"
              >
                Shop Now
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
              <Link
                href="/products?filter=deals"
                className="inline-flex items-center gap-2 border-2 border-white text-white px-6 py-3.5 rounded-full font-semibold text-sm hover:bg-white hover:text-[#0a0a0a] transition-colors"
              >
                Browse Deals
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.2, ease: 'easeOut' }}
              className="flex flex-wrap gap-8"
            >
              <div>
                <CountUp target={2500} suffix="+" />
                <p className="text-[#999999] text-sm">Happy customers</p>
              </div>
              <div>
                <CountUp target={40} suffix="+" />
                <p className="text-[#999999] text-sm">Products</p>
              </div>
              <div>
                <CountUp target={4.8} suffix="★" decimalPlaces={1} />
                <p className="text-[#999999] text-sm">Average rating</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <motion.section
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="bg-white border-b border-[#efefef] py-6"
      >
        <div className="max-w-7xl mx-auto px-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {TRUST_ITEMS.map((item) => {
              const IconComponent = ICONS[item.icon];
              return (
                <motion.div
                  key={item.title}
                  variants={itemVariants}
                  className="flex items-center gap-3 justify-center"
                >
                  <div className="w-10 h-10 bg-[#f5c518] rounded-full flex items-center justify-center flex-shrink-0">
                    <IconComponent className="h-5 w-5 text-[#0a0a0a]" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-[#111111]">{item.title}</p>
                    <p className="text-xs text-[#999999]">{item.subtitle}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.section>

      <motion.section
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="bg-[#f7f7f5] py-16"
      >
        <div className="max-w-7xl mx-auto px-10">
          <h2 className="text-2xl font-bold text-[#111111] mb-8">Shop by category</h2>
          {categoriesLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-6 flex flex-col items-center gap-4">
                  <div className="w-14 h-14 bg-gray-200 rounded-full animate-pulse" />
                  <div className="text-center">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-20 mb-2" />
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-12" />
                  </div>
                </div>
              ))}
            </div>
          ) : categories.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {categories.map((cat) => (
                <motion.div
                  key={cat.id}
                  variants={itemVariants}
                  whileHover={{ scale: 1.03 }}
                  transition={{ duration: 0.2 }}
                >
                  <Link
                    href={`/products?category=${cat.slug}`}
                    className="bg-white rounded-xl p-6 flex flex-col items-center gap-4 hover:shadow-lg transition-shadow"
                  >
                    <div className="w-14 h-14 bg-[#0a0a0a] rounded-full flex items-center justify-center">
                      <ShoppingBagIcon className="h-7 w-7 text-white" />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-[#111111]">{cat.name}</p>
                      <p className="text-xs text-[#999999]">{categoryCounts[cat.slug] || 0} items</p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-[#666] text-center py-8">No categories available</p>
          )}
        </div>
      </motion.section>

      <motion.section
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="py-16 bg-white"
      >
        <div className="max-w-7xl mx-auto px-10">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-[#111111]">Featured Products</h2>
            <Link href="/products" className="text-sm font-medium text-[#f5c518] hover:underline">
              See all →
            </Link>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white border border-[#efefef] rounded-xl overflow-hidden">
                  <div className="h-[200px] bg-gray-200 animate-pulse" />
                  <div className="p-4">
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-16 mb-2" />
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-full mb-3" />
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : featuredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {featuredProducts.map((product) => (
                <motion.div
                  key={product.id}
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.2 }}
                >
                  <Link
                    href={`/products/${product.slug}`}
                    className="group bg-white border border-[#efefef] rounded-xl overflow-hidden hover:shadow-xl transition-all"
                  >
                    <div className="h-[200px] bg-[#f7f7f5] relative overflow-hidden">
                      {product.images && product.images[0] ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBagIcon className="h-16 w-16 text-[#ccc]" />
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
                      <button
                        onClick={(e) => { e.preventDefault(); }}
                        className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md hover:bg-[#f7f7f5] transition-colors"
                      >
                        <HeartIcon className="h-4 w-4 text-[#999]" />
                      </button>
                    </div>
                    <div className="p-4">
                      {product.category_name && (
                        <p className="text-[10px] text-[#999] uppercase tracking-wider mb-1">
                          {product.category_name}
                        </p>
                      )}
                      <h3 className="font-bold text-[#111111] text-sm mb-3 leading-tight line-clamp-2">
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
                      <div className="flex items-center justify-between">
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
                          disabled={!product.stock}
                          className="bg-[#0a0a0a] text-white w-9 h-9 rounded-lg flex items-center justify-center hover:bg-[#333] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          whileTap={{ scale: 0.9 }}
                        >
                          <PlusIcon className="h-4 w-4" />
                        </motion.button>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-[#666] text-center py-16">No featured products yet</p>
          )}
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
        className="py-12 px-10"
      >
        <div className="max-w-7xl mx-auto">
          <div className="bg-gradient-to-br from-[#111] to-[#1a1a1a] rounded-2xl p-11 relative overflow-hidden">
            <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-[#f5c518] opacity-[0.05] rounded-full blur-[80px] pointer-events-none" />
            <div className="grid md:grid-cols-2 gap-8 items-center relative z-10">
              <div>
                <p className="text-[#f5c518] text-xs font-bold uppercase tracking-widest mb-3">Limited Time Offer</p>
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
                  Pay in advance, get <span className="text-[#f5c518]">Rs. 200 off</span> instantly
                </h2>
                <p className="text-[#999] text-sm mb-8 max-w-md">
                  Choose advance payment option at checkout and save big on your order. Applicable on all products above Rs. 1,000.
                </p>
                <Link
                  href="/products"
                  className="inline-block bg-[#f5c518] text-[#0a0a0a] px-8 py-3.5 rounded-full font-semibold text-sm hover:bg-[#e0b116] transition-colors"
                >
                  Shop & Save
                </Link>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <FloatingIcon emoji="💳" />
                <FloatingIcon emoji="🚚" />
                <FloatingIcon emoji="⭐" />
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="bg-[#f7f7f5] py-16"
      >
        <div className="max-w-7xl mx-auto px-10">
          <h2 className="text-2xl font-bold text-[#111111] mb-8 text-center">What our customers say</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={i}
                variants={itemVariants}
                className="bg-white rounded-xl p-6 flex flex-col"
              >
                <div className="flex gap-1 mb-4">
                  {[1,2,3,4,5].map((i) => (
                    <StarIcon key={i} className="h-4 w-4 text-[#111111]" filled />
                  ))}
                </div>
                <p className="text-[#666] text-sm mb-auto leading-relaxed">"{t.text}"</p>
                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[#efefef]">
                  <div className="w-10 h-10 bg-[#0a0a0a] rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {t.initials}
                  </div>
                  <div>
                    <p className="font-semibold text-[#111] text-sm">{t.name}</p>
                    <p className="text-[#999] text-xs">{t.city}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

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