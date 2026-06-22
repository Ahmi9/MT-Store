'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { publicClient } from '@/lib/supabase';

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_city: string;
  payment_type: 'cod' | 'advance';
  subtotal: number;
  discount: number;
  total: number;
  status: string;
  created_at: string;
}

type FilterType = 'all' | 'pending' | 'confirmed' | 'shipped' | 'delivered';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-600 text-white',
  confirmed: 'bg-blue-600 text-white',
  shipped: 'bg-purple-600 text-white',
  delivered: 'bg-green-600 text-white',
  cancelled: 'bg-red-600 text-white',
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    const fetchOrders = async () => {
      const { data, error } = await publicClient
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setOrders(data as Order[]);
      }
      setLoading(false);
    };

    fetchOrders();
  }, []);

  const filteredOrders = filter === 'all'
    ? orders
    : orders.filter((order) => order.status === filter);

  const counts = {
    all: orders.length,
    pending: orders.filter((o) => o.status === 'pending').length,
    confirmed: orders.filter((o) => o.status === 'confirmed').length,
    shipped: orders.filter((o) => o.status === 'shipped').length,
    delivered: orders.filter((o) => o.status === 'delivered').length,
  };

  if (loading) {
    return (
      <div className="text-gray-400">Loading...</div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold text-white"
        >
          Orders
        </motion.h1>
        <span className="text-gray-400">Total: {orders.length}</span>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex gap-2 mb-6"
      >
        {(['all', 'pending', 'confirmed', 'shipped', 'delivered'] as FilterType[]).map((f) => (
          <motion.button
            key={f}
            onClick={() => setFilter(f)}
            whileTap={{ scale: 0.95 }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <span className="ml-2 text-xs opacity-75">({counts[f]})</span>
          </motion.button>
        ))}
      </motion.div>

      {filteredOrders.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-gray-400 py-12"
        >
          No orders found
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-800 rounded-lg overflow-hidden"
        >
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Order #</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Customer</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Phone</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">City</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Total</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Payment</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Date</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredOrders.map((order, index) => (
                <motion.tr
                  key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.04, 0.4) }}
                  className="hover:bg-gray-750"
                >
                  <td className="px-4 py-3 text-white font-medium">{order.order_number}</td>
                  <td className="px-4 py-3 text-white">{order.customer_name}</td>
                  <td className="px-4 py-3 text-gray-300">{order.customer_phone}</td>
                  <td className="px-4 py-3 text-gray-300">{order.customer_city}</td>
                  <td className="px-4 py-3 text-white">Rs. {order.total.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                      order.payment_type === 'cod'
                        ? 'bg-gray-600 text-gray-300'
                        : 'bg-yellow-500 text-yellow-900'
                    }`}>
                      {order.payment_type === 'cod' ? 'COD' : 'Advance'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <motion.span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[order.status] || 'bg-gray-600 text-white'}`}
                      key={order.status}
                      initial={{ opacity: 0.7 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </motion.span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-sm">
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/dashboard/orders/${order.id}`}
                      className="text-blue-400 hover:text-blue-300 text-sm"
                    >
                      View
                    </Link>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}
    </div>
  );
}