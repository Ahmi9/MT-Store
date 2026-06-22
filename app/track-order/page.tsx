'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AnnouncementBar from '@/components/AnnouncementBar';
import { publicClient } from '@/lib/supabase';
import { formatWhatsAppLink, formatWhatsAppDisplay } from '@/lib/utils';

interface SiteSettings {
  whatsapp_number: string | null;
}

function PackageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  );
}

function TruckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25m-2.25 0h-2.25m0 0v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v2.646m7.5 0v2.25c0 .621.504 1.125 1.125 1.125h2.25c.621 0 1.125-.504 1.125-1.125v-2.25m-7.5 0h7.5" />
    </svg>
  );
}

function MagnifierIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
};

export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState('');
  const [hasTracked, setHasTracked] = useState(false);
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await publicClient
        .from('site_settings')
        .select('whatsapp_number')
        .single();
      if (data) setSettings(data as SiteSettings);
    };
    fetchSettings();
  }, []);

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (orderNumber.trim()) {
      setHasTracked(true);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <AnnouncementBar />
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 md:px-6 py-12 md:py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[#111] rounded-full mb-6">
            <PackageIcon className="h-10 w-10 text-[#f5c518]" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-[#111] mb-3">Track Your Order</h1>
          <p className="text-[#666] text-base">Enter your order number to see delivery status</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-[#f8f8f6] rounded-2xl p-6 md:p-8 mb-8"
        >
          <form onSubmit={handleTrack} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Enter your order number"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              className="flex-1 px-4 py-3.5 bg-white border border-[#e5e5e5] rounded-xl text-[#111] placeholder-[#999] focus:outline-none focus:border-[#111] transition-colors"
            />
            <button
              type="submit"
              className="bg-[#111] text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-[#333] transition-colors whitespace-nowrap"
            >
              Track Order
            </button>
          </form>
          <p className="text-sm text-[#999] mt-4">Enter the order number you received after placing your order</p>
        </motion.div>

        <AnimatePresence>
          {hasTracked && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-[#f8f8f6] border border-[#e5e5e5] rounded-2xl p-6 mb-8"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[#f5c518] rounded-full flex items-center justify-center flex-shrink-0">
                  <MagnifierIcon className="h-6 w-6 text-[#111]" />
                </div>
                <div>
                  <h3 className="font-bold text-[#111] text-lg mb-1">Tracking Result</h3>
                  <p className="text-[#666] mb-3">
                    Order tracking will be available once your order ships. For immediate help, contact us on WhatsApp below.
                  </p>
                  <p className="text-sm text-[#999]">
                    Order <span className="font-semibold text-[#111]">#{orderNumber}</span> is currently being processed.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mb-10"
        >
          <h2 className="text-lg font-bold text-[#111] mb-6 text-center">How It Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <motion.div
              variants={itemVariants}
              className="bg-white border border-[#eee] rounded-2xl p-5 text-center"
            >
              <div className="w-12 h-12 bg-[#f8f8f6] rounded-full flex items-center justify-center mx-auto mb-3">
                <ClipboardIcon className="h-6 w-6 text-[#111]" />
              </div>
              <span className="inline-block text-xs font-bold text-[#f5c518] bg-[#f5c518]/10 px-2 py-0.5 rounded-full mb-2">Step 1</span>
              <h3 className="font-bold text-[#111] mb-1">Place Your Order</h3>
              <p className="text-sm text-[#666]">Add items to cart and complete checkout</p>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="bg-white border border-[#eee] rounded-2xl p-5 text-center"
            >
              <div className="w-12 h-12 bg-[#f8f8f6] rounded-full flex items-center justify-center mx-auto mb-3">
                <TruckIcon className="h-6 w-6 text-[#111]" />
              </div>
              <span className="inline-block text-xs font-bold text-[#f5c518] bg-[#f5c518]/10 px-2 py-0.5 rounded-full mb-2">Step 2</span>
              <h3 className="font-bold text-[#111] mb-1">We Process & Ship</h3>
              <p className="text-sm text-[#666]">We prepare and dispatch your package</p>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="bg-white border border-[#eee] rounded-2xl p-5 text-center"
            >
              <div className="w-12 h-12 bg-[#f8f8f6] rounded-full flex items-center justify-center mx-auto mb-3">
                <MagnifierIcon className="h-6 w-6 text-[#111]" />
              </div>
              <span className="inline-block text-xs font-bold text-[#f5c518] bg-[#f5c518]/10 px-2 py-0.5 rounded-full mb-2">Step 3</span>
              <h3 className="font-bold text-[#111] mb-1">Track Delivery</h3>
              <p className="text-sm text-[#666]">Monitor your order status in real time</p>
            </motion.div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center"
        >
          <p className="text-[#666] mb-4">Need immediate assistance? Reach us on WhatsApp</p>
          {settings?.whatsapp_number ? (
            <a
              href={formatWhatsAppLink(settings.whatsapp_number)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#25D366] text-white px-6 py-3 rounded-full font-medium hover:bg-[#20bd5a] transition-colors"
            >
              <WhatsAppIcon className="h-5 w-5" />
              WhatsApp Us
            </a>
          ) : (
            <span className="text-[#999]">Loading...</span>
          )}
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
