'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { getCategories, getSiteSettings, type Category } from '@/lib/catalog';
import { formatWhatsAppDisplay, formatWhatsAppLink } from '@/lib/utils';
import { waMessages } from '@/lib/whatsapp-messages';
import { BRAND } from '@/lib/brand';
import { HeartIcon, WhatsAppIcon } from '@/components/store/icons';

// 24 half-circle bumps hanging from the top edge
const SCALLOP = `M0 0H1200V6${Array.from({ length: 24 }, () => 'a25 18 0 0 1 -50 0').join('')}Z`;

export default function Footer() {
  const [whatsapp, setWhatsapp] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    getSiteSettings().then((s) => setWhatsapp(s?.whatsapp_number ?? null));
    getCategories().then((c) => setCategories(c.filter((x) => !x.parent_id).slice(0, 6)));
  }, []);

  return (
    <footer className="relative mt-20 overflow-hidden bg-ink text-white">
      {/* scalloped edge */}
      <svg className="absolute -top-px left-0 h-6 w-full text-blush-50" viewBox="0 0 1200 24" preserveAspectRatio="none" aria-hidden="true">
        <path fill="currentColor" d={SCALLOP} />
      </svg>
      <div className="pointer-events-none absolute -right-24 top-10 h-72 w-72 animate-blob bg-berry-500/25 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 animate-blob bg-lilac/10 blur-3xl" />

      <div className="container-zs relative pb-8 pt-16">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <div className="flex items-center gap-3">
              <motion.img
                src={BRAND.logo}
                alt=""
                className="h-16 w-16 rounded-full ring-4 ring-white/10"
                whileHover={{ rotate: -12, scale: 1.08 }}
              />
              <span className="font-display text-3xl font-semibold">
                {BRAND.short}
                <span className="text-berry-400">{BRAND.tld}</span>
              </span>
            </div>
            <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-white/70">
              {BRAND.tagline}. Genuine products, cash on delivery and a team that actually replies on WhatsApp.
            </p>
            {whatsapp && (
              <a
                href={formatWhatsAppLink(whatsapp, waMessages.footer())}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-3 rounded-full bg-white/10 py-2 pl-2 pr-5 text-sm font-bold transition-colors hover:bg-[#25D366]"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#25D366]">
                  <WhatsAppIcon className="h-5 w-5" />
                </span>
                {formatWhatsAppDisplay(whatsapp)}
              </a>
            )}
          </div>

          <FooterColumn title="Shop" className="md:col-span-3">
            <FooterLink href="/products">All products</FooterLink>
            {categories.map((c) => (
              <FooterLink key={c.id} href={`/products?category=${c.slug}`}>
                {c.name}
              </FooterLink>
            ))}
          </FooterColumn>

          <FooterColumn title="Help" className="md:col-span-2">
            <FooterLink href="/track-order">Track order</FooterLink>
            <FooterLink href="/wishlist">Wishlist</FooterLink>
            <FooterLink href="/contact">Contact us</FooterLink>
            <FooterLink href="/refund-policy">Returns</FooterLink>
          </FooterColumn>

          <FooterColumn title="Policies" className="md:col-span-2">
            <FooterLink href="/privacy-policy">Privacy</FooterLink>
            <FooterLink href="/terms">Terms</FooterLink>
            <FooterLink href="/refund-policy">Refunds</FooterLink>
          </FooterColumn>
        </div>

        <div className="mt-14 select-none overflow-hidden">
          <p className="text-gradient whitespace-nowrap text-center font-display text-[17vw] font-semibold leading-[0.85] opacity-90 md:text-[12vw]">
            {BRAND.name}
          </p>
        </div>

        <div className="mt-6 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs font-semibold text-white/50 md:flex-row">
          <p>
            © {new Date().getFullYear()} {BRAND.name}. All rights reserved.
          </p>
          <p className="flex items-center gap-1.5">
            Made with <HeartIcon className="h-3.5 w-3.5 text-berry-400" filled /> in Pakistan by
            <a
              href="https://ahmimakes.site"
              target="_blank"
              rel="noopener noreferrer"
              className="font-extrabold text-white/80 underline decoration-berry-400/60 underline-offset-4 transition-colors hover:text-berry-300"
            >
              ahmimakes
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, className, children }: { title: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <h4 className="mb-4 text-xs font-extrabold uppercase tracking-[0.2em] text-berry-400">{title}</h4>
      <div className="flex flex-col gap-2.5">{children}</div>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="group flex w-fit items-center gap-1.5 text-[15px] font-semibold text-white/70 transition-colors hover:text-white">
      <span className="h-1.5 w-0 rounded-full bg-berry-400 transition-all group-hover:w-3" />
      {children}
    </Link>
  );
}
