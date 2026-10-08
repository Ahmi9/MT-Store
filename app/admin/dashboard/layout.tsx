'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { publicClient } from '@/lib/supabase';
import { BRAND } from '@/lib/brand';
import { AdminToastProvider } from '@/components/admin/ui';
import {
  BagIcon,
  ExternalIcon,
  GiftIcon,
  GridIcon,
  LogoutIcon,
  MenuIcon,
  PackageIcon,
  SettingsIcon,
  StarIcon,
  TagIcon,
  XIcon,
} from '@/components/store/icons';

const navLinks = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: GridIcon },
  { name: 'Orders', href: '/admin/dashboard/orders', icon: PackageIcon },
  { name: 'Products', href: '/admin/dashboard/products', icon: BagIcon },
  { name: 'Categories', href: '/admin/dashboard/categories', icon: TagIcon },
  { name: 'Coupons', href: '/admin/dashboard/coupons', icon: GiftIcon },
  { name: 'Reviews', href: '/admin/dashboard/reviews', icon: StarIcon },
  { name: 'Settings', href: '/admin/dashboard/settings', icon: SettingsIcon },
];

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [denied, setDenied] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await publicClient.auth.getSession();
      if (!session) {
        router.push('/admin/login');
        return;
      }
      // Being signed in isn't enough — the account must be listed in `admins`.
      // (The database enforces the same rule through RLS.)
      const { data: adminRow } = await publicClient.from('admins').select('user_id').eq('user_id', session.user.id).maybeSingle();
      setEmail(session.user.email ?? null);
      setDenied(!adminRow);
      setLoading(false);
    };
    checkUser();
  }, [router]);

  useEffect(() => setDrawerOpen(false), [pathname]);

  const handleLogout = async () => {
    await publicClient.auth.signOut();
    router.push('/admin/login');
  };

  const isActive = (href: string) => (href === '/admin/dashboard' ? pathname === href : pathname.startsWith(href));
  const current = navLinks.find((l) => isActive(l.href));

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-blush-50">
        <div className="flex flex-col items-center gap-3">
          <img src={BRAND.logo} alt="" className="h-16 w-16 animate-float rounded-full shadow-pop" />
          <p className="text-sm font-bold text-muted">Opening your studio…</p>
        </div>
      </div>
    );
  }

  if (denied) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-blush-50 p-6">
        <div className="card-zs max-w-sm p-8 text-center">
          <img src={BRAND.logo} alt="" className="mx-auto mb-4 h-16 w-16 rounded-full" />
          <h1 className="font-display text-2xl font-semibold text-ink">No admin access</h1>
          <p className="mt-2 text-sm font-semibold text-muted">{email} isn’t an admin of this store.</p>
          <button type="button" onClick={handleLogout} className="btn-primary mt-6 w-full py-3">
            Sign out
          </button>
        </div>
      </div>
    );
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 pb-6 pt-6">
        <img src={BRAND.logo} alt="" className="h-11 w-11 rounded-full ring-2 ring-white shadow-soft" />
        <div className="leading-tight">
          <p className="font-display text-xl font-semibold text-ink">
            {BRAND.short}
            <span className="text-berry-500">{BRAND.tld}</span>
          </p>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-muted">Admin studio</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {navLinks.map((link) => {
          const active = isActive(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`relative flex items-center gap-3 rounded-2xl px-4 py-3 text-[15px] font-bold transition-colors ${
                active ? 'text-white' : 'text-ink-soft hover:bg-white hover:text-berry-600'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="admin-nav"
                  className="absolute inset-0 rounded-2xl bg-gradient-to-r from-berry-400 to-berry-600 shadow-soft"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
              <link.icon className="relative h-5 w-5" />
              <span className="relative">{link.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="m-3 rounded-3xl bg-white p-4">
        <Link
          href="/"
          target="_blank"
          className="mb-3 flex items-center justify-between rounded-2xl bg-blush-100 px-4 py-3 text-sm font-extrabold text-berry-700 transition-colors hover:bg-blush-200"
        >
          View store <ExternalIcon className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-berry-400 to-berry-600 font-display text-lg font-semibold text-white">
            {(email ?? 'A').charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold text-ink">Admin</p>
            <p className="truncate text-xs font-semibold text-muted">{email}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-blush-100 hover:text-berry-600"
            title="Log out"
            aria-label="Log out"
          >
            <LogoutIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <AdminToastProvider>
    <div className="admin-zs flex h-screen bg-blush-50">
      <aside className="hidden w-72 flex-shrink-0 border-r border-line bg-gradient-to-b from-blush-100 via-blush-50 to-blush-50 lg:block">{sidebar}</aside>

      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 top-0 z-50 w-72 max-w-[85vw] rounded-r-[28px] bg-blush-50 lg:hidden"
            >
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-ink"
                aria-label="Close menu"
              >
                <XIcon className="h-4 w-4" />
              </button>
              {sidebar}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* phones only: open the sidebar */}
        <header className="flex items-center gap-2 border-b border-line bg-white/80 px-3 py-2 backdrop-blur-lg lg:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-ink hover:bg-blush-100"
            aria-label="Open menu"
          >
            <MenuIcon className="h-6 w-6" />
          </button>
          <img src={BRAND.logo} alt="" className="h-8 w-8 rounded-full" />
          <p className="font-display text-lg font-semibold text-ink">{current?.name ?? 'Dashboard'}</p>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
    </AdminToastProvider>
  );
}
