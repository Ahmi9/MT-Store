import Link from 'next/link';
import { BRAND } from '@/lib/brand';

export default function Logo({ size = 44, showText = true, onClick }: { size?: number; showText?: boolean; onClick?: () => void }) {
  return (
    <Link href="/" onClick={onClick} className="group flex items-center gap-2.5" aria-label={`${BRAND.name} home`}>
      <span
        className="relative flex-shrink-0 rounded-full ring-2 ring-white shadow-soft transition-transform duration-500 group-hover:rotate-[-8deg] group-hover:scale-105"
        style={{ width: size, height: size }}
      >
        <img src={BRAND.logo} alt="" width={size} height={size} className="h-full w-full rounded-full" />
      </span>
      {showText && (
        <span className="font-display text-[22px] font-semibold leading-none tracking-tight text-ink">
          {BRAND.short}
          <span className="text-berry-500">{BRAND.tld}</span>
        </span>
      )}
    </Link>
  );
}
