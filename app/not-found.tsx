import Link from 'next/link';
import { BRAND } from '@/lib/brand';

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-blush-200 to-blush-50 px-6 text-center">
      <div className="bg-dots absolute inset-0 opacity-60" />
      <div className="absolute -left-20 top-10 h-72 w-72 animate-blob bg-berry-400/30 blur-3xl" />
      <div className="relative">
        <img src={BRAND.logoLarge} alt={BRAND.name} className="mx-auto h-40 w-40 animate-float rounded-full shadow-pop md:h-52 md:w-52" />
        <p className="text-gradient mt-6 font-display text-8xl font-semibold md:text-9xl">404</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-ink md:text-4xl">Oops, this page wandered off</h1>
        <p className="mx-auto mt-2 max-w-md font-semibold text-ink-soft">The link might be broken or the page was moved. Let’s get you back to the cute stuff.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn-primary px-8 py-3.5">
            Take me home
          </Link>
          <Link href="/products" className="btn-ghost bg-white/60 px-7 py-3.5">
            Browse products
          </Link>
        </div>
      </div>
    </div>
  );
}
