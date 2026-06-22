'use client';

import { useEffect, useState } from 'react';
import { publicClient } from '@/lib/supabase';

interface AnnouncementBarProps {
  isActive?: boolean;
}

export default function AnnouncementBar({ isActive }: AnnouncementBarProps) {
  const [textWhite, setTextWhite] = useState<string | null>(null);
  const [textGold, setTextGold] = useState<string | null>(null);
  const [isEnabled, setIsEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await publicClient
        .from('site_settings')
        .select('announcement_bar_active, announcement_text_white, announcement_text_gold')
        .single();
      if (data) {
        setIsEnabled(data.announcement_bar_active ?? true);
        setTextWhite(data.announcement_text_white);
        setTextGold(data.announcement_text_gold);
      }
      setIsLoading(false);
    };
    fetchSettings();
  }, []);

  if (isActive === false) return null;

  if (isLoading) {
    return (
      <div className="bg-[#0a0a0a] min-h-[38px] flex items-center justify-center text-white text-center py-3 px-4 text-sm">
        <span className="font-medium">Loading...</span>
      </div>
    );
  }

  if (!isEnabled) return null;

  const displayWhite = textWhite || '';
  const displayGold = textGold || '';

  if (!displayWhite && !displayGold) return null;

  return (
    <div className="bg-[#0a0a0a] min-h-[38px] flex items-center justify-center text-white text-center py-3 px-4 text-sm">
      <span className="font-medium">{displayWhite}</span>
      {displayGold && <span className="font-medium text-[#f5c518]"> {displayGold}</span>}
    </div>
  );
}
