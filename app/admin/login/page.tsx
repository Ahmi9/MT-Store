'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { publicClient } from '@/lib/supabase';
import { BRAND } from '@/lib/brand';
import { ArrowRightIcon, HeartIcon, LockIcon, MailIcon, SparkleIcon } from '@/components/store/icons';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { data, error } = await publicClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      setError(error?.message ?? 'Sign in failed');
      setLoading(false);
      return;
    }

    const { data: adminRow } = await publicClient.from('admins').select('user_id').eq('user_id', data.user.id).maybeSingle();
    if (!adminRow) {
      await publicClient.auth.signOut();
      setError('This account doesn’t have admin access.');
      setLoading(false);
      return;
    }
    router.push('/admin/dashboard');
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-blush-200 via-blush-100 to-lilac lg:flex lg:flex-col lg:items-center lg:justify-center">
        <div className="bg-dots absolute inset-0 opacity-60" />
        <div className="absolute -left-20 top-10 h-80 w-80 animate-blob bg-berry-400/30 blur-3xl" />
        <div className="absolute -right-10 bottom-0 h-80 w-80 animate-blob bg-white/60 blur-3xl [animation-delay:-6s]" />
        <HeartIcon className="absolute left-[18%] top-[22%] h-7 w-7 animate-float text-berry-400" filled />
        <SparkleIcon className="absolute right-[20%] top-[30%] h-9 w-9 animate-float-slow text-white" />
        <HeartIcon className="absolute bottom-[20%] right-[24%] h-5 w-5 animate-float text-berry-500/60" filled />

        <motion.img
          src={BRAND.logoLarge}
          alt={BRAND.name}
          initial={{ scale: 0.7, opacity: 0, rotate: -10 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 120, damping: 14 }}
          className="relative h-72 w-72 rounded-full shadow-pop ring-8 ring-white/60"
        />
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="relative mt-8 max-w-sm text-center">
          <p className="font-display text-3xl font-semibold text-ink">Your little store, beautifully run ✨</p>
          <p className="mt-2 font-semibold text-ink-soft">Orders, products, coupons and settings — all in one cute place.</p>
        </motion.div>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center bg-blush-50 px-5 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
          <div className="mb-8 flex flex-col items-center text-center lg:items-start lg:text-left">
            <img src={BRAND.logo} alt="" className="mb-5 h-20 w-20 rounded-full shadow-pop lg:hidden" />
            <span className="chip mb-3 bg-white text-berry-600 shadow-soft">
              <LockIcon className="h-3.5 w-3.5" /> Admin studio
            </span>
            <h1 className="font-display text-4xl font-semibold text-ink">Welcome back 👋</h1>
            <p className="mt-1 font-semibold text-muted">Sign in to manage {BRAND.name}</p>
          </div>

          <form onSubmit={handleSubmit} className="card-zs space-y-5 p-6 shadow-soft md:p-8">
            <label className="block">
              <span className="mb-1.5 block text-sm font-extrabold text-ink-soft">Email</span>
              <span className="relative block">
                <MailIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-berry-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="input-zs pl-12"
                  placeholder="admin@zestore.pk"
                />
              </span>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-extrabold text-ink-soft">Password</span>
              <span className="relative block">
                <LockIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-berry-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="input-zs pl-12 pr-16"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full px-2.5 py-1 text-xs font-extrabold text-berry-600 hover:bg-blush-100"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </span>
            </label>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0, x: [0, -8, 8, -4, 4, 0] }}
                  exit={{ opacity: 0 }}
                  className="rounded-2xl border-2 border-berry-400 bg-blush-100 px-4 py-3 text-sm font-bold text-berry-700"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <button type="submit" disabled={loading} className="btn-primary w-full py-4 text-base">
              {loading ? (
                <>
                  <span className="h-5 w-5 animate-spin rounded-full border-[3px] border-white/40 border-t-white" /> Signing in…
                </>
              ) : (
                <>
                  Sign in <ArrowRightIcon className="h-5 w-5" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm font-semibold text-muted">
            <Link href="/" className="text-berry-600 hover:underline">
              ← Back to the store
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
