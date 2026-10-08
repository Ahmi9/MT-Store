'use client';

import { motion } from 'framer-motion';
import { HeartIcon, SparkleIcon } from '@/components/store/icons';

export default function PageHero({ eyebrow, title, subtitle, children }: { eyebrow?: string; title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-blush-200 via-blush-100 to-blush-50" />
      <div className="bg-dots absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
      <div className="absolute -left-16 top-0 h-56 w-56 animate-blob bg-berry-400/25 blur-3xl" />
      <div className="absolute -right-10 bottom-0 h-56 w-56 animate-blob bg-lilac blur-3xl [animation-delay:-6s]" />
      <HeartIcon className="absolute left-[12%] top-[30%] hidden h-6 w-6 animate-float text-berry-400/60 md:block" filled />
      <SparkleIcon className="absolute right-[14%] top-[22%] hidden h-8 w-8 animate-float-slow text-white md:block" />

      <div className="container-zs relative py-14 text-center md:py-20">
        {eyebrow && (
          <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="chip mb-4 bg-white text-berry-600 shadow-soft">
            <SparkleIcon className="h-3.5 w-3.5" /> {eyebrow}
          </motion.span>
        )}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, type: 'spring', stiffness: 160, damping: 18 }}
          className="font-display text-4xl font-semibold text-ink md:text-6xl"
        >
          {title}
        </motion.h1>
        {subtitle && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mx-auto mt-3 max-w-xl text-lg font-semibold text-ink-soft">
            {subtitle}
          </motion.p>
        )}
        {children}
      </div>
    </section>
  );
}
