'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import PageHero from '@/components/store/PageHero';
import { getSiteSettings } from '@/lib/catalog';
import { formatWhatsAppDisplay, formatWhatsAppLink } from '@/lib/utils';
import { BagIcon, ClockIcon, PackageIcon, ReturnIcon, WhatsAppIcon } from '@/components/store/icons';

export default function ContactPage() {
  const [whatsapp, setWhatsapp] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    getSiteSettings().then((s) => setWhatsapp(s?.whatsapp_number ?? null));
  }, []);

  return (
    <div>
      <PageHero eyebrow="We’d love to hear from you" title="Say hi! 👋" subtitle="Questions about a product, an order or a return? We reply fastest on WhatsApp." />

      <div className="container-zs max-w-4xl pb-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="relative -mt-4 overflow-hidden rounded-[36px] bg-ink p-8 text-center text-white md:p-12"
        >
          <div className="absolute -right-16 -top-16 h-64 w-64 animate-blob bg-[#25D366]/30 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-64 w-64 animate-blob bg-berry-500/30 blur-3xl" />
          <motion.span
            animate={{ rotate: [0, -10, 10, 0] }}
            transition={{ duration: 2.4, repeat: Infinity }}
            className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-[#25D366] shadow-pop"
          >
            <WhatsAppIcon className="h-10 w-10" />
          </motion.span>
          <p className="relative text-sm font-extrabold uppercase tracking-[0.2em] text-white/60">WhatsApp</p>
          {whatsapp === undefined ? (
            <div className="relative mx-auto mt-3 h-10 w-64 animate-pulse rounded-xl bg-white/10" />
          ) : whatsapp ? (
            <>
              <p className="relative mt-2 font-display text-3xl font-semibold md:text-5xl">{formatWhatsAppDisplay(whatsapp)}</p>
              <a
                href={formatWhatsAppLink(whatsapp)}
                target="_blank"
                rel="noopener noreferrer"
                className="relative mt-7 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-8 py-4 font-extrabold text-white shadow-pop transition-transform hover:-translate-y-1"
              >
                <WhatsAppIcon className="h-5 w-5" /> Start a chat
              </a>
            </>
          ) : (
            <p className="relative mt-3 font-semibold text-white/70">Our contact number will be up here soon.</p>
          )}
          <p className="relative mt-5 flex items-center justify-center gap-2 text-sm font-semibold text-white/60">
            <ClockIcon className="h-4 w-4" /> We typically respond within a few hours
          </p>
        </motion.div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            { href: '/track-order', icon: PackageIcon, title: 'Track an order', text: 'See where your parcel is' },
            { href: '/refund-policy', icon: ReturnIcon, title: 'Returns', text: '7-day easy return policy' },
            { href: '/products', icon: BagIcon, title: 'Browse the shop', text: 'See everything that’s new' },
          ].map((c, i) => (
            <motion.div key={c.title} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + i * 0.08 }}>
              <Link href={c.href} className="group block h-full rounded-[24px] bg-white p-5 transition-all hover:-translate-y-1 hover:shadow-pop">
                <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blush-100 text-berry-600 transition-transform group-hover:rotate-[-8deg]">
                  <c.icon className="h-6 w-6" />
                </span>
                <p className="font-display text-lg font-semibold text-ink">{c.title}</p>
                <p className="text-sm font-semibold text-muted">{c.text}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
