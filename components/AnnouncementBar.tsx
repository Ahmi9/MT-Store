'use client';

import { useEffect, useState } from 'react';
import { getSiteSettings } from '@/lib/catalog';
import { SparkleIcon } from '@/components/store/icons';

// Text is managed from Admin → Settings. The bar hides itself when it is
// switched off there or both text fields are empty.
export default function AnnouncementBar() {
  const [text, setText] = useState<{ main: string; accent: string } | null>(null);

  useEffect(() => {
    getSiteSettings().then((s) => {
      if (!s || s.announcement_bar_active === false) return;
      const main = s.announcement_text_white?.trim() || '';
      const accent = s.announcement_text_gold?.trim() || '';
      if (main || accent) setText({ main, accent });
    });
  }, []);

  if (!text) return null;

  const item = (
    <span className="flex items-center gap-3 px-6">
      <SparkleIcon className="h-3.5 w-3.5 text-blush-200" />
      <span>{text.main}</span>
      {text.accent && <span className="rounded-full bg-white/20 px-2 py-0.5 text-blush-100">{text.accent}</span>}
    </span>
  );

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-berry-500 via-berry-400 to-berry-500 py-2 text-[13px] font-bold text-white">
      <div className="flex w-max animate-marquee whitespace-nowrap hover:[animation-play-state:paused]">
        {Array.from({ length: 2 }).map((_, half) => (
          <div key={half} className="flex" aria-hidden={half === 1}>
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={i}>{item}</span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
