'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { publicClient } from '@/lib/supabase';

const navLinks = [
  { name: 'Dashboard', href: '/admin/dashboard' },
  { name: 'Orders', href: '/admin/dashboard/orders' },
  { name: 'Products', href: '/admin/dashboard/products' },
  { name: 'Categories', href: '/admin/dashboard/categories' },
  { name: 'Coupons', href: '/admin/dashboard/coupons' },
  { name: 'Settings', href: '/admin/dashboard/settings' },
];

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await publicClient.auth.getSession();
      if (!session) {
        router.push('/admin/login');
      } else {
        setUser(session.user);
        setLoading(false);
      }
    };
    checkUser();
  }, [router]);

  const handleLogout = async () => {
    await publicClient.auth.signOut();
    router.push('/admin/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <aside className="w-64 h-screen sticky top-0 overflow-y-auto flex-shrink-0 bg-gray-800 flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold text-white">Admin</h1>
        </div>

        <nav className="flex-1 px-4 space-y-2 relative">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="block px-4 py-2 rounded-lg relative"
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute inset-0 bg-blue-600 rounded-lg"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
                <span className={`relative z-10 block px-4 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}>
                  {link.name}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-700">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors text-left"
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto h-screen p-8 bg-gray-900">
        {children}
      </main>
    </div>
  );
}