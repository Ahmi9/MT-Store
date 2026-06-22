'use client';

import { useState, useEffect } from 'react';

interface PageLoaderProps {
  duration?: number;
}

export default function PageLoader({ duration = 500 }: PageLoaderProps) {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setFading(true);
    }, duration);

    const unmountTimer = setTimeout(() => {
      setVisible(false);
    }, duration + 300);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(unmountTimer);
    };
  }, [duration]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-[#0a0a0a] flex items-center justify-center transition-opacity duration-300 ${
        fading ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-[#f5c518] border-t-transparent rounded-full animate-spin" />
        <span className="text-white text-lg font-medium tracking-tight">MT Store</span>
      </div>
    </div>
  );
}