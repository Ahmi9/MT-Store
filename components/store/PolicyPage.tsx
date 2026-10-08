'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import PageHero from '@/components/store/PageHero';
import { getSiteSettings } from '@/lib/catalog';
import { formatWhatsAppLink } from '@/lib/utils';
import { WhatsAppIcon } from '@/components/store/icons';

const POLICIES = [
  { href: '/privacy-policy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
  { href: '/refund-policy', label: 'Refunds' },
];

export default function PolicyPage({
  title,
  subtitle,
  current,
  sections,
}: {
  title: string;
  subtitle: string;
  current: string;
  sections: { heading: string; body: React.ReactNode }[];
}) {
  const [whatsapp, setWhatsapp] = useState<string | null>(null);

  useEffect(() => {
    getSiteSettings().then((s) => setWhatsapp(s?.whatsapp_number ?? null));
  }, []);

  return (
    <div>
      <PageHero eyebrow="The fine print, made friendly" title={title} subtitle={subtitle}>
        <div className="mt-6 flex justify-center gap-2">
          {POLICIES.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className={`rounded-full px-4 py-2 text-sm font-extrabold transition-colors ${
                p.href === current ? 'bg-ink text-white' : 'bg-white/70 text-ink-soft hover:bg-white'
              }`}
            >
              {p.label}
            </Link>
          ))}
        </div>
      </PageHero>

      <div className="container-zs max-w-3xl pb-6">
        <div className="space-y-4">
          {sections.map((s, i) => (
            <motion.section
              key={s.heading}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: Math.min(i, 3) * 0.05 }}
              className="card-zs flex gap-4 p-6 md:p-7"
            >
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-blush-100 font-display text-lg font-semibold text-berry-600">
                {i + 1}
              </span>
              <div className="prose-zs">
                <h2 className="mb-2 font-display text-xl font-semibold text-ink">{s.heading}</h2>
                {s.body}
              </div>
            </motion.section>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-[28px] bg-gradient-to-r from-blush-200 to-lilac p-6 text-center md:flex-row md:text-left">
          <div>
            <p className="font-display text-xl font-semibold text-ink">Still have questions?</p>
            <p className="text-sm font-semibold text-ink-soft">We’re happy to help — just send us a message.</p>
          </div>
          {whatsapp ? (
            <a
              href={formatWhatsAppLink(whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-6 py-3 font-extrabold text-white shadow-soft"
            >
              <WhatsAppIcon className="h-5 w-5" /> WhatsApp us
            </a>
          ) : (
            <Link href="/contact" className="btn-primary px-6 py-3">
              Contact us
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
