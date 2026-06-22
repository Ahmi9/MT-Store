'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { publicClient } from '@/lib/supabase';

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
  pending: 'bg-yellow-600 text-white',
  confirmed: 'bg-blue-600 text-white',
  shipped: 'bg-purple-600 text-white',
  delivered: 'bg-green-600 text-white',
  cancelled: 'bg-red-600 text-white',
};

function PulsingDot() {
  return (
    <span className="relative flex h-3 w-3">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
    </span>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-gray-800 rounded-lg p-5 border-l-4 border-gray-600 animate-pulse">
          <div className="flex items-center justify-between">
            <div>
              <div className="h-4 w-28 bg-gray-700 rounded mb-2"></div>
              <div className="h-8 w-16 bg-gray-700 rounded"></div>
            </div>
            <div className="w-12 h-12 bg-gray-700 rounded-full"></div>
          </div>
        </div>
      ))}
    </div>
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

function StatCard({ label, value, icon, borderColor, delay, prefix = '', suffix = '' }: {
  label: string;
  value: number;
  icon: React.ReactNode;
  borderColor: string;
  delay: number;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
      className={`bg-gray-800 rounded-lg p-5 border-l-4 ${borderColor}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm">{label}</p>
          <p className="text-2xl font-bold text-white mt-1">
            <CountUpStat value={value} prefix={prefix} suffix={suffix} delay={delay} />
          </p>
        </div>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${borderColor.replace('border-', '').replace('-500', '/20').replace('-[#f5c518]', '-[#f5c518]/20')}`}>
          {icon}
        </div>
      </div>
    </motion.div>
  );
}

function RevenueCard({ value, delay }: { value: number; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
      className="bg-gray-800 rounded-lg p-5 border-l-4 border-green-500"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm">Total Revenue</p>
          <p className="text-2xl font-bold text-white mt-1">
            Rs. <CountUpStat value={value} delay={delay} />
          </p>
        </div>
        <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>
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
      <div className="text-gray-400">Loading...</div>
    );
  }

  return (
    <div>
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-3xl font-bold text-white mb-8"
      >
        Dashboard
      </motion.h1>

      {ga4Loading ? (
        <AnalyticsSkeleton />
      ) : ga4Error ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-gray-800 rounded-lg p-4 border-l-4 border-red-500 mb-6"
        >
          <p className="text-gray-400">Analytics unavailable</p>
        </motion.div>
      ) : ga4Stats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
        >
          <div className="bg-gray-800 rounded-lg p-5 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <PulsingDot />
                  <p className="text-gray-400 text-sm">Live Visitors Now</p>
                </div>
                <p className="text-2xl font-bold text-white mt-1">{ga4Stats.activeUsersNow}</p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-5 border-l-4 border-[#f5c518]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Today&apos;s Sessions</p>
                <p className="text-2xl font-bold text-white mt-1">{ga4Stats.todaySessions}</p>
              </div>
              <div className="w-12 h-12 bg-[#f5c518]/20 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#f5c518]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-5 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Yesterday&apos;s Sessions</p>
                <p className="text-2xl font-bold text-white mt-1">{ga4Stats.yesterdaySessions}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-5 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Last 7 Days Sessions</p>
                <p className="text-2xl font-bold text-white mt-1">{ga4Stats.last7DaysSessions}</p>
              </div>
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Today's Orders"
          value={stats.todayOrders}
          borderColor="border-[#f5c518]"
          delay={0}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#f5c518]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          }
        />

        <StatCard
          label="Pending Orders"
          value={stats.pendingOrders}
          borderColor="border-yellow-500"
          delay={0.08}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <RevenueCard value={stats.totalRevenue} delay={0.16} />

        <StatCard
          label="Delivered Orders"
          value={stats.deliveredOrders}
          borderColor="border-blue-500"
          delay={0.24}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
            </svg>
          }
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="COD Orders"
          value={stats.codOrders}
          borderColor="border-gray-500"
          delay={0.32}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
            </svg>
          }
        />

        <StatCard
          label="Advance Orders"
          value={stats.advanceOrders}
          borderColor="border-[#f5c518]"
          delay={0.4}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#f5c518]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5h1.5a3.75 3.75 0 010 7.5H10l2.5 3.75L15 15l3-4.5H19.5a3.75 3.75 0 000-7.5H3z" />
            </svg>
          }
        />

        <StatCard
          label="Total Products"
          value={stats.totalProducts}
          borderColor="border-purple-500"
          delay={0.48}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
          }
        />

        <StatCard
          label="Out of Stock"
          value={stats.outOfStock}
          borderColor="border-red-500"
          delay={0.56}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          }
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="bg-gray-800 rounded-lg p-6"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Recent Orders</h2>
          <Link
            href="/admin/dashboard/orders"
            className="text-blue-400 hover:text-blue-300 text-sm font-medium"
          >
            View All Orders →
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No orders yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Order #</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Customer</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Total</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Payment</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {recentOrders.map((order, index) => (
                  <motion.tr
                    key={order.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.05, duration: 0.3 }}
                    className="hover:bg-gray-750"
                  >
                    <td className="px-4 py-3 text-white font-medium">{order.order_number}</td>
                    <td className="px-4 py-3 text-gray-300">{order.customer_name}</td>
                    <td className="px-4 py-3 text-white">Rs. {order.total.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[order.status] || 'bg-gray-600 text-white'}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        order.payment_type === 'cod'
                          ? 'bg-gray-600 text-gray-300'
                          : 'bg-[#f5c518] text-yellow-900'
                      }`}>
                        {order.payment_type === 'cod' ? 'COD' : 'Advance'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
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