'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AnnouncementBar from '@/components/AnnouncementBar';
import { publicClient } from '@/lib/supabase';
import { formatWhatsAppLink, formatWhatsAppDisplay } from '@/lib/utils';

interface SiteSettings {
  whatsapp_number: string | null;
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

export default function RefundPolicyPage() {
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

  return (
    <div className="min-h-screen bg-white">
      <AnnouncementBar />
      <Navbar />

      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-[#0a0a0a] mb-8">Refund & Return Policy</h1>

        <div className="prose prose-gray">
          <p className="text-[#666] leading-relaxed mb-6">
            We offer a 7-day return policy from the date of delivery. Products must be unused and in original packaging. To initiate a return, please contact us on WhatsApp with your order number. Refunds will be processed within 3-5 business days after the returned item is received and inspected.
          </p>
          <p className="text-[#666] leading-relaxed mb-6">
            To be eligible for a return, your item must be unused, unworn, and in the same condition that you received it. It must also be in the original packaging with all tags and accessories included. Products that show signs of use, damage, or missing parts cannot be accepted for return.
          </p>
          <p className="text-[#666] leading-relaxed mb-6">
            Once we receive and inspect your returned item, we will notify you of the approval or rejection of your refund. If approved, the refund will be processed to your original payment method. For Cash on Delivery orders, refunds will be provided via bank transfer or JazzCash/EasyPaisa.
          </p>
          <p className="text-[#666] leading-relaxed mb-6">
            Shipping costs are non-refundable. If you are returning an item, you are responsible for paying the shipping costs for returning your item. We recommend using a trackable shipping service or purchasing shipping insurance for your return.
          </p>
          <p className="text-[#666] leading-relaxed mb-6">
            To initiate a return, please contact us on WhatsApp at {settings?.whatsapp_number ? formatWhatsAppDisplay(settings.whatsapp_number) : '...'} with your order number and reason for return. Our team will guide you through the return process and provide you with return shipping details.
          </p>
          <div className="bg-[#f7f7f5] p-6 rounded-xl mt-8">
            <h3 className="font-bold text-[#0a0a0a] mb-3">Need Help?</h3>
            <p className="text-[#666] mb-4">Contact us on WhatsApp for any questions about returns or refunds</p>
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
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
