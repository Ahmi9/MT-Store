'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { publicClient } from '@/lib/supabase';

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  customer_address: string;
  customer_city: string;
  payment_type: 'cod' | 'advance';
  subtotal: number;
  discount: number;
  total: number;
  status: string;
  postex_tracking_number: string | null;
  created_at: string;
}

interface OrderItem {
  id: number;
  order_id: string;
  product_id: number;
  product_name: string;
  product_image: string | null;
  price: number;
  quantity: number;
  total: number;
  selected_variant?: Record<string, string> | null;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-600 text-white',
  confirmed: 'bg-blue-600 text-white',
  shipped: 'bg-purple-600 text-white',
  delivered: 'bg-green-600 text-white',
  cancelled: 'bg-red-600 text-white',
};

const statusOptions = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

function SuccessCheckmark() {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <motion.path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 13l4 4L19 7"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      />
    </motion.svg>
  );
}

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [newStatus, setNewStatus] = useState('');

  useEffect(() => {
    const fetchOrderData = async () => {
      const { data: orderData, error: orderError } = await publicClient
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError || !orderData) {
        router.push('/admin/dashboard/orders');
        return;
      }

      setOrder(orderData as Order);
      setNewStatus(orderData.status);

      const { data: itemsData } = await publicClient
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);

      if (itemsData) {
        setOrderItems(itemsData as OrderItem[]);
      }

      setLoading(false);
    };

    fetchOrderData();
  }, [orderId, router]);

  const handleUpdateStatus = async () => {
    if (!order || !newStatus) return;

    setUpdating(true);
    setShowSuccess(false);

    const { error } = await publicClient
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (!error) {
      setOrder({ ...order, status: newStatus });
      setUpdating(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } else {
      setUpdating(false);
    }
  };

  const whatsappLink = order
    ? `https://wa.me/92${order.customer_phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${order.customer_name}, your order ${order.order_number} status is ${order.status}`)}`
    : '#';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center text-gray-400 py-12">
        Order not found
      </div>
    );
  }

  const orderDate = new Date(order.created_at);
  const formattedDate = orderDate.toLocaleDateString('en-PK', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = orderDate.toLocaleTimeString('en-PK', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="bg-gray-900 min-h-screen p-8">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Link
            href="/admin/dashboard/orders"
            className="text-gray-400 hover:text-white text-sm mb-6 inline-block"
          >
            ← Back to Orders
          </Link>
        </motion.div>

        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-green-900/50 border border-green-700 text-green-300 px-4 py-3 rounded-lg mb-6 flex items-center gap-2"
            >
              <SuccessCheckmark />
              Order status updated successfully!
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex justify-between items-start mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{order.order_number}</h1>
            <p className="text-gray-400">
              {formattedDate} at {formattedTime}
            </p>
          </div>
          <div className="flex gap-3">
            <motion.a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              whileTap={{ scale: 0.97 }}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </motion.a>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="bg-gray-800 rounded-lg p-6"
          >
            <h2 className="text-lg font-bold text-white mb-4">Customer Details</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Name:</span>
                <span className="text-white font-medium">{order.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Phone:</span>
                <span className="text-white">{order.customer_phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Email:</span>
                <span className="text-white">{order.customer_email || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Address:</span>
                <span className="text-white text-right">{order.customer_address}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">City:</span>
                <span className="text-white">{order.customer_city}</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="bg-gray-800 rounded-lg p-6"
          >
            <h2 className="text-lg font-bold text-white mb-4">Order Items</h2>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {orderItems.map((item) => (
                <div key={item.id} className="flex items-center gap-4">
                  {item.product_image ? (
                    <img
                      src={item.product_image}
                      alt={item.product_name}
                      className="w-12 h-12 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center text-gray-500 text-xs">
                      No Image
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{item.product_name}</p>
                    <p className="text-gray-400 text-xs">Qty: {item.quantity} × Rs. {item.price.toLocaleString()}</p>
                    {item.selected_variant && Object.keys(item.selected_variant).length > 0 && (
                      <p className="text-gray-500 text-xs">
                        {Object.entries(item.selected_variant)
                          .map(([key, val]) => `${key}: ${val}`)
                          .join(', ')}
                      </p>
                    )}
                  </div>
                  <p className="text-white font-medium text-sm">Rs. {item.total.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="bg-gray-800 rounded-lg p-6"
          >
            <h2 className="text-lg font-bold text-white mb-4">Payment & Summary</h2>
            <div className="space-y-3 text-sm mb-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Payment Type:</span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  order.payment_type === 'cod'
                    ? 'bg-gray-600 text-gray-300'
                    : 'bg-yellow-500 text-yellow-900'
                }`}>
                  {order.payment_type === 'cod' ? 'Cash on Delivery' : 'Advance Payment'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Subtotal:</span>
                <span className="text-white">Rs. {order.subtotal.toLocaleString()}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Discount:</span>
                  <span className="text-green-500">- Rs. {order.discount}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-700 pt-3 mt-3">
                <span className="text-white font-bold">Total:</span>
                <span className="text-white font-bold">Rs. {order.total.toLocaleString()}</span>
              </div>
            </div>

            {order.postex_tracking_number && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Tracking #:</span>
                  <span className="text-white font-mono">{order.postex_tracking_number}</span>
                </div>
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="bg-gray-800 rounded-lg p-6"
          >
            <h2 className="text-lg font-bold text-white mb-4">Order Status</h2>
            <div className="mb-4">
              <span className="text-gray-400 text-sm block mb-2">Current Status:</span>
              <motion.span
                className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[order.status] || 'bg-gray-600 text-white'}`}
                key={order.status}
                initial={{ opacity: 0.7, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </motion.span>
            </div>
            <div className="mb-4">
              <label className="text-gray-400 text-sm block mb-2">Update Status:</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <motion.button
              onClick={handleUpdateStatus}
              disabled={updating || newStatus === order.status}
              whileTap={updating || newStatus === order.status ? {} : { scale: 0.97 }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {updating ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Updating...
                </>
              ) : (
                'Update Status'
              )}
            </motion.button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}