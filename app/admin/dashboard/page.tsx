'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { publicClient } from '@/lib/supabase';
import { BRAND } from '@/lib/brand';
import { BagIcon, ChartIcon, ClockIcon, GiftIcon, PackageIcon } from '@/components/store/icons';

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  total: number;
  status: string;
  payment_type: 'cod' | 'advance';
  created_at: string;
}

interface Stats {
  todayOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  deliveredOrders: number;
  codOrders: number;
  advanceOrders: number;
  totalProducts: number;
  outOfStock: number;
}

interface GA4Stats {
  activeUsersNow: number;
  todaySessions: number;
  yesterdaySessions: number;
  last7DaysSessions: number;
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-sky-100 text-sky-700',
  shipped: 'bg-violet-100 text-violet-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-rose-100 text-rose-700',
};

function PulsingDot() {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
    </span>
  );
}

function useCountUp(end: number, duration: number = 1000, delay: number = 0) {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        setCount(Math.floor(easeOut * end));

        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animate);
        }
      };

      rafRef.current = requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(timeout);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [end, duration, delay]);

  return count;
}

function CountUpStat({ value, prefix = '', suffix = '', delay = 0 }: { value: number; prefix?: string; suffix?: string; delay?: number }) {
  const count = useCountUp(value, 1000, delay);
  return <>{prefix}{count.toLocaleString()}{suffix}</>;
}

const TINTS = {
  pink: 'bg-blush-100 text-berry-600',
  violet: 'bg-lilac text-violet-600',
  peach: 'bg-peach text-orange-600',
  mint: 'bg-mint text-emerald-600',
  sky: 'bg-sky-100 text-sky-600',
  rose: 'bg-rose-100 text-rose-600',
};

function StatCard({
  label,
  value,
  icon: Icon,
  tint,
  delay,
  hint,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tint: keyof typeof TINTS;
  delay: number;
  hint?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
      whileHover={{ y: -4 }}
      className="card-zs p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${TINTS[tint]}`}>
          <Icon className="h-5 w-5" />
        </span>
        {hint && <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted">{hint}</span>}
      </div>
      <p className="mt-4 font-display text-3xl font-semibold text-ink">
        <CountUpStat value={value} delay={delay} />
      </p>
      <p className="text-sm font-bold text-muted">{label}</p>
    </motion.div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    todayOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0,
    deliveredOrders: 0,
    codOrders: 0,
    advanceOrders: 0,
    totalProducts: 0,
    outOfStock: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [ga4Stats, setGa4Stats] = useState<GA4Stats | null>(null);
  const [ga4Loading, setGa4Loading] = useState(true);
  const [ga4Error, setGa4Error] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const todayStart = new Date(todayStr + 'T00:00:00.000Z').toISOString();
      const todayEnd = new Date(todayStr + 'T23:59:59.999Z').toISOString();

      const [
        todayOrdersRes,
        pendingOrdersRes,
        revenueRes,
        deliveredOrdersRes,
        codOrdersRes,
        advanceOrdersRes,
        totalProductsRes,
        outOfStockRes,
        recentOrdersRes,
      ] = await Promise.all([
        publicClient
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', todayStart)
          .lte('created_at', todayEnd),
        publicClient
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending'),
        publicClient
          .from('orders')
          .select('total')
          .neq('status', 'cancelled'),
        publicClient
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'delivered'),
        publicClient
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('payment_type', 'cod'),
        publicClient
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('payment_type', 'advance'),
        publicClient
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true),
        publicClient
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('stock', 0),
        publicClient
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      setStats({
        todayOrders: todayOrdersRes.count || 0,
        pendingOrders: pendingOrdersRes.count || 0,
        totalRevenue: (revenueRes.data ?? []).reduce((sum: number, row: any) => sum + parseFloat(row.total || 0), 0),
        deliveredOrders: deliveredOrdersRes.count || 0,
        codOrders: codOrdersRes.count || 0,
        advanceOrders: advanceOrdersRes.count || 0,
        totalProducts: totalProductsRes.count || 0,
        outOfStock: outOfStockRes.count || 0,
      });

      if (recentOrdersRes.data) {
        setRecentOrders(recentOrdersRes.data as Order[]);
      }

      setLoading(false);
    };

    const fetchGA4Stats = async () => {
      try {
        const response = await fetch('/api/analytics');
        const data = await response.json();
        if (data.error) {
          setGa4Error(true);
        } else {
          setGa4Stats(data);
        }
      } catch {
        setGa4Error(true);
      } finally {
        setGa4Loading(false);
      }
    };

    fetchData();
    fetchGA4Stats();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton h-32 rounded-[1.75rem]" />
        ))}
      </div>
    );
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const paidSplit = stats.codOrders + stats.advanceOrders;
  const codShare = paidSplit ? Math.round((stats.codOrders / paidSplit) * 100) : 0;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink md:text-4xl">{greeting} ✨</h1>
          <p className="font-semibold text-muted">
            {new Date().toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long' })} · here’s how {BRAND.name} is doing
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/dashboard/orders" className="rounded-full border border-line bg-white px-4 py-2 text-sm font-extrabold text-ink-soft hover:text-berry-600">
            View orders
          </Link>
          <Link href="/admin/dashboard/coupons" className="rounded-full border border-line bg-white px-4 py-2 text-sm font-extrabold text-ink-soft hover:text-berry-600">
            Coupons
          </Link>
        </div>
      </motion.div>

      <div className="grid gap-4 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-berry-400 via-berry-500 to-berry-600 p-6 text-white shadow-pop lg:col-span-2 md:p-8"
        >
          <div className="absolute -right-10 -top-10 h-56 w-56 animate-blob bg-white/15 blur-2xl" />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
            className="absolute -bottom-20 -right-16 h-56 w-56 rounded-full border-[14px] border-dashed border-white/15"
          />
          <p className="relative text-sm font-extrabold uppercase tracking-[0.18em] text-white/70">Total revenue</p>
          <p className="relative mt-2 font-display text-4xl font-semibold md:text-6xl">
            Rs. <CountUpStat value={stats.totalRevenue} />
          </p>
          <p className="relative mt-1 text-sm font-semibold text-white/80">From all orders that aren’t cancelled</p>
          <div className="relative mt-6 grid max-w-md grid-cols-3 gap-3">
            {[
              { label: 'Today', value: stats.todayOrders },
              { label: 'Pending', value: stats.pendingOrders },
              { label: 'Delivered', value: stats.deliveredOrders },
            ].map((m) => (
              <div key={m.label} className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">
                <p className="font-display text-2xl font-semibold">{m.value}</p>
                <p className="text-xs font-bold text-white/75">{m.label} orders</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card-zs flex flex-col p-6">
          <p className="font-display text-lg font-semibold text-ink">Payment mix</p>
          <p className="text-sm font-semibold text-muted">{paidSplit} orders in total</p>
          <div className="mt-5 flex h-4 overflow-hidden rounded-full bg-blush-100">
            <motion.div initial={{ width: 0 }} animate={{ width: `${codShare}%` }} transition={{ duration: 1, delay: 0.3 }} className="h-full bg-ink" />
            <motion.div initial={{ width: 0 }} animate={{ width: `${paidSplit ? 100 - codShare : 0}%` }} transition={{ duration: 1, delay: 0.5 }} className="h-full bg-berry-400" />
          </div>
          <div className="mt-4 space-y-2 text-sm font-bold">
            <p className="flex items-center justify-between text-ink-soft">
              <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-ink" /> Cash on delivery</span>
              <span className="text-ink">{stats.codOrders}</span>
            </p>
            <p className="flex items-center justify-between text-ink-soft">
              <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-berry-400" /> Advance payment</span>
              <span className="text-ink">{stats.advanceOrders}</span>
            </p>
          </div>
          <Link href="/admin/dashboard/settings" className="mt-auto pt-5 text-sm font-extrabold text-berry-600 hover:underline">
            Payment settings →
          </Link>
        </motion.div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Today’s orders" value={stats.todayOrders} icon={GiftIcon} tint="pink" delay={0.05} hint="today" />
        <StatCard label="Pending orders" value={stats.pendingOrders} icon={ClockIcon} tint="peach" delay={0.1} hint="to do" />
        <StatCard label="Active products" value={stats.totalProducts} icon={BagIcon} tint="violet" delay={0.15} />
        <StatCard label="Out of stock" value={stats.outOfStock} icon={PackageIcon} tint="rose" delay={0.2} hint={stats.outOfStock ? 'restock' : undefined} />
      </div>

      {ga4Loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-32 rounded-[1.75rem]" />
          ))}
        </div>
      ) : ga4Error || !ga4Stats ? (
        <div className="card-zs flex items-center gap-3 p-4 text-sm font-semibold text-muted">
          <ChartIcon className="h-5 w-5 text-berry-400" /> Website analytics are unavailable right now.
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card-zs p-5 md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="font-display text-lg font-semibold text-ink">Website traffic</p>
            <span className="flex items-center gap-2 rounded-full bg-mint px-3 py-1 text-xs font-extrabold text-emerald-700">
              <PulsingDot /> {ga4Stats.activeUsersNow} online now
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Today', value: ga4Stats.todaySessions, tint: 'bg-blush-100' },
              { label: 'Yesterday', value: ga4Stats.yesterdaySessions, tint: 'bg-lilac' },
              { label: 'Last 7 days', value: ga4Stats.last7DaysSessions, tint: 'bg-peach' },
            ].map((t) => (
              <div key={t.label} className={`rounded-2xl p-4 ${t.tint}`}>
                <p className="font-display text-2xl font-semibold text-ink">{Number(t.value).toLocaleString()}</p>
                <p className="text-xs font-bold text-ink-soft">{t.label} sessions</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.4 }} className="card-zs p-5 md:p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-ink">Recent orders</h2>
          <Link href="/admin/dashboard/orders" className="text-sm font-extrabold text-berry-600 hover:underline">
            View all →
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="rounded-2xl bg-blush-50 py-10 text-center">
            <p className="text-3xl">🛍️</p>
            <p className="mt-2 font-bold text-ink">No orders yet</p>
            <p className="text-sm font-semibold text-muted">New orders will pop up here.</p>
          </div>
        ) : (
          <div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-line">
                  <th className="px-3 py-3 text-left">Order</th>
                  <th className="px-3 py-3 text-left">Customer</th>
                  <th className="px-3 py-3 text-left">Total</th>
                  <th className="px-3 py-3 text-left">Status</th>
                  <th className="px-3 py-3 text-left">Payment</th>
                  <th className="px-3 py-3 text-left">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {recentOrders.map((order, index) => (
                  <motion.tr
                    key={order.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.05, duration: 0.3 }}
                  >
                    <td className="px-3 py-3">
                      <Link href={`/admin/dashboard/orders/${order.id}`} className="font-extrabold text-ink hover:text-berry-600">
                        #{order.order_number}
                      </Link>
                    </td>
                    <td className="px-3 py-3 font-semibold text-ink-soft">{order.customer_name}</td>
                    <td className="px-3 py-3 font-bold text-ink">Rs. {Number(order.total).toLocaleString()}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${statusColors[order.status] || 'bg-blush-100 text-ink-soft'}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${order.payment_type === 'cod' ? 'bg-blush-50 text-ink-soft' : 'bg-blush-200 text-berry-700'}`}>
                        {order.payment_type === 'cod' ? 'COD' : 'Advance'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm font-semibold text-muted">{new Date(order.created_at).toLocaleDateString('en-PK')}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
