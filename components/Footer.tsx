'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { publicClient } from '@/lib/supabase';
import { formatWhatsAppLink } from '@/lib/utils';

interface SiteSettings {
  store_name: string | null;
  whatsapp_number: string | null;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  is_active: boolean;
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

export default function Footer() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout>;
    const startTime = Date.now();

    const fetchData = async () => {
      const { data } = await publicClient
        .from('site_settings')
        .select('store_name, whatsapp_number')
        .single();
      if (data) setSettings(data as SiteSettings);

      const { data: categoriesData } = await publicClient
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .is('parent_id', null)
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

  const storeName = settings?.store_name || 'MT Store';
  const words = storeName.split(' ');
  const lastWord = words.length > 1 ? words.pop() : null;

  return (
    <footer className="bg-[#0a0a0a] text-white pt-11 pb-6">
      <div className="max-w-7xl mx-auto px-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="text-xl font-bold mb-3">
              {loading ? (
                <span className="bg-gray-700 animate-pulse rounded text-transparent inline-block w-32 h-6">Store Name</span>
              ) : lastWord ? (
                <>
                  {words.join(' ')} <span className="text-[#f5c518]">{lastWord}</span>
                </>
              ) : (
                <span className="text-[#ffffff]">{storeName}</span>
              )}
            </h3>
            {loading ? (
              <span className="bg-gray-700 animate-pulse rounded text-transparent inline-block w-48 h-4 mb-4">Description text here</span>
            ) : (
              <p className="text-[#999] text-sm mb-4">
                Your trusted destination for genuine electronics in Pakistan.
              </p>
            )}
            {!loading && settings?.whatsapp_number && (
              <a
                href={formatWhatsAppLink(settings.whatsapp_number)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#25D366] text-white px-4 py-2 rounded-full text-sm font-medium"
              >
                <WhatsAppIcon className="h-4 w-4" />
                WhatsApp Us
              </a>
            )}
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-4">Shop</h4>
            <div className="flex flex-col gap-2">
              {loading ? (
                <>
                  <span className="bg-gray-700 animate-pulse rounded h-4 w-20" />
                  <span className="bg-gray-700 animate-pulse rounded h-4 w-24" />
                  <span className="bg-gray-700 animate-pulse rounded h-4 w-20" />
                </>
              ) : (
                <>
                  <Link href="/products" className="text-[#999] text-sm hover:text-white transition-colors">All Products</Link>
                  {categories.map((category) => (
                    <Link
                      key={category.id}
                      href={`/products?category=${category.slug}`}
                      className="text-[#999] text-sm hover:text-white transition-colors"
                    >
                      {category.name}
                    </Link>
                  ))}
                </>
              )}
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-4">Support</h4>
            <div className="flex flex-col gap-2">
              <Link href="/track-order" className="text-[#999] text-sm hover:text-white transition-colors">Track Order</Link>
              <Link href="/refund-policy" className="text-[#999] text-sm hover:text-white transition-colors">Returns</Link>
              <Link href="/contact" className="text-[#999] text-sm hover:text-white transition-colors">Contact Us</Link>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-4">Policies</h4>
            <div className="flex flex-col gap-2">
              <Link href="/privacy-policy" className="text-[#999] text-sm hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="text-[#999] text-sm hover:text-white transition-colors">Terms of Service</Link>
              <Link href="/refund-policy" className="text-[#999] text-sm hover:text-white transition-colors">Refund Policy</Link>
            </div>
          </div>
        </div>
        <div className="border-t border-[#333] pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[#666] text-xs">
            © {new Date().getFullYear()} {loading ? 'Store Name' : storeName}. All rights reserved.
          </p>
          <p className="text-[#666] text-xs">
            Made with care in Pakistan 🇵🇰
          </p>
        </div>
      </div>
    </footer>
  );
}