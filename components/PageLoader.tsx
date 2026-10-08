'use client';

import { useEffect, useState } from 'react';
import { BRAND } from '@/lib/brand';

// Brief branded splash on the first full page load only.
export default function PageLoader({ duration = 650 }: { duration?: number }) {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fade = setTimeout(() => setFading(true), duration);
    const hide = setTimeout(() => setVisible(false), duration + 400);
    return () => {
      clearTimeout(fade);
      clearTimeout(hide);
    };
  }, [duration]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-blush-50 transition-all duration-400 ${
        fading ? 'pointer-events-none scale-105 opacity-0' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <span className="absolute inset-0 animate-ping rounded-full bg-berry-400/30" />
          <img src={BRAND.logo} alt="" className="relative h-24 w-24 animate-float rounded-full shadow-pop" />
        </div>
        <span className="font-display text-2xl font-semibold text-ink">
          {BRAND.short}
          <span className="text-berry-500">{BRAND.tld}</span>
        </span>
      </div>
    </div>
  );
}
