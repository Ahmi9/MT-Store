'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { publicClient } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AnnouncementBar from '@/components/AnnouncementBar';
import { formatWhatsAppLink, formatWhatsAppDisplay } from '@/lib/utils';

declare global {
  interface Window {
    fbq?: (event: string, eventName: string, data?: Record<string, any>) => void;
  }
}

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
  created_at: string;
}

interface OrderItem {
  id: number;
  order_id: string;
  product_id: number;
  product_name: string;
  product_image: string;
  price: number;
  quantity: number;
  total: number;
  selected_variant?: Record<string, string> | null;
}

interface PaymentMethod {
  id: number;
  method_name: string;
  account_title: string;
  account_number: string;
  iban: string | null;
}

interface SiteSettings {
  id: number;
  store_name: string | null;
  whatsapp_number: string | null;
  announcement_bar_text: string | null;
  announcement_bar_active: boolean;
  hero_title: string | null;
  hero_subtitle: string | null;
  advance_payment_discount_enabled: boolean;
  advance_payment_discount_amount: number;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-xs text-[#999] hover:text-[#111] transition-colors ml-2"
      title={`Copy ${label}`}
    >
      {copied ? (
        <>
          <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-green-600">Copied!</span>
        </>
      ) : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span>Copy</span>
        </>
      )}
    </button>
  );
}

function PaymentMethodCard({ method }: { method: PaymentMethod }) {
  return (
    <div className="bg-white border border-[#eee] rounded-[14px] p-4 hover:border-[#ddd] transition-colors">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 bg-[#f5c518] rounded-full flex items-center justify-center text-[#0a0a0a] text-sm font-bold flex-shrink-0">
          {method.method_name.charAt(0).toUpperCase()}
        </div>
        <span className="font-bold text-[#111] text-[15px]">{method.method_name}</span>
      </div>
      <div className="pl-11">
        <p className="text-[12px] text-[#666] mb-1">
          <span className="text-[#999]">Account Title:</span> {method.account_title}
        </p>
        <div className="flex items-center">
          <span className="text-[14px] font-bold text-[#111]">{method.account_number}</span>
          <CopyButton text={method.account_number} label="Account Number" />
        </div>
        {method.iban && (
          <div className="flex items-center mt-1">
            <span className="text-[12px] text-[#999] font-mono">{method.iban}</span>
            <CopyButton text={method.iban} label="IBAN" />
          </div>
        )}
      </div>
    </div>
  );
}

export default function OrderConfirmationPage() {
  const params = useParams();
  const orderId = params.order_id as string;

  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const purchaseFired = useRef(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const settingsRes = await publicClient.from('site_settings').select('*').single();
      if (!settingsRes.error && settingsRes.data) {
        setSettings(settingsRes.data as SiteSettings);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    const fetchPaymentMethods = async () => {
      const { data } = await publicClient
        .from('payment_methods')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (data) setPaymentMethods(data as PaymentMethod[]);
    };
    fetchPaymentMethods();
  }, []);

  useEffect(() => {
    const fetchOrder = async () => {
      const { data: orderData, error: orderError } = await publicClient
        .from('orders')
        .select('*')
        .eq('order_number', orderId)
        .single();

      if (orderError || !orderData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setOrder(orderData as Order);

      const { data: itemsData } = await publicClient
        .from('order_items')
        .select('*')
        .eq('order_id', orderData.id);

      if (itemsData) {
        setOrderItems(itemsData as OrderItem[]);
      }

      setLoading(false);
    };

    fetchOrder();
  }, [orderId]);

  useEffect(() => {
    if (purchaseFired.current) return;
    if (order && orderItems.length > 0 && typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', 'Purchase', {
        value: order.total,
        currency: 'PKR',
        content_ids: orderItems.map((item: any) => item.product_id),
        content_type: 'product',
        num_items: orderItems.length,
      });
      purchaseFired.current = true;
    }
  }, [order, orderItems]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <AnnouncementBar />
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <p className="text-[#666666]">Loading...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="min-h-screen bg-white">
        <AnnouncementBar />
        <Navbar />

        <main className="max-w-7xl mx-auto px-6 py-20 text-center">
          <h1 className="text-2xl font-bold text-[#111111] mb-4">Order Not Found</h1>
          <p className="text-[#666666] mb-8">The order you are looking for does not exist.</p>
          <Link href="/products" className="bg-[#111111] text-white px-8 py-3 rounded-full font-semibold text-sm hover:bg-[#333] transition-colors">
            Continue Shopping
          </Link>
        </main>

        <Footer />
      </div>
    );
  }

  const orderNumber = order.order_number;

  return (
    <div className="min-h-screen bg-white">
      <AnnouncementBar />
      <Navbar />

      <main className="max-w-2xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 12 }}
            className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </motion.div>

          <h1 className="text-2xl font-bold text-[#111111] mb-2">
            Order Placed Successfully!
          </h1>

          <p className="text-lg font-semibold text-[#111111]">
            Order {orderNumber}
          </p>
        </div>

        <div className="bg-white border border-[#eee] rounded-[14px] p-6 mb-6">
          <h2 className="font-bold text-[#111111] text-lg mb-4">Customer Details</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#666666]">Name:</span>
              <span className="font-medium text-[#111111]">{order.customer_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#666666]">Phone:</span>
              <span className="font-medium text-[#111111]">{order.customer_phone}</span>
            </div>
            {order.customer_email && (
              <div className="flex justify-between">
                <span className="text-[#666666]">Email:</span>
                <span className="font-medium text-[#111111]">{order.customer_email}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[#666666]">Address:</span>
              <span className="font-medium text-[#111111] text-right">{order.customer_address}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#666666]">City:</span>
              <span className="font-medium text-[#111111]">{order.customer_city}</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#eee] rounded-[14px] p-6 mb-6">
          <h2 className="font-bold text-[#111111] text-lg mb-4">Order Items</h2>
          <div className="space-y-4">
            {orderItems.map((item) => (
              <div key={item.id} className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-[#111111]">{item.product_name}</p>
                  <p className="text-sm text-[#666666]">Qty: {item.quantity} × Rs. {item.price.toLocaleString()}</p>
                  {item.selected_variant && Object.keys(item.selected_variant).length > 0 && (
                    <p className="text-xs text-gray-500">
                      {Object.entries(item.selected_variant)
                        .map(([key, val]) => `${key}: ${val}`)
                        .join(', ')}
                    </p>
                  )}
                </div>
                <p className="font-bold text-[#111111]">Rs. {item.total.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-[#eee] rounded-[14px] p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-4">
            <h2 className="font-bold text-[#111111] text-lg sm:text-base">Payment Method</h2>
            <span className={`inline-block whitespace-nowrap px-3 py-1 rounded-full text-sm font-medium ${
              order.payment_type === 'cod'
                ? 'bg-gray-100 text-gray-700'
                : 'bg-[#fffbeb] text-[#111111]'
            }`}>
              {order.payment_type === 'cod' ? 'Cash on Delivery' : 'Advance Payment'}
            </span>
          </div>

          <div className="border-t border-[#eee] pt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#666666]">Subtotal</span>
              <span className="font-medium text-[#111111]">Rs. {order.subtotal.toLocaleString()}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between">
                <span className="text-[#666666]">Discount</span>
                <span className="font-medium text-green-600">- Rs. {order.discount}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-[#eee] pt-2 mt-2">
              <span className="font-bold text-[#111111]">Total</span>
              <span className="font-bold text-[#111111]">Rs. {order.total.toLocaleString()}</span>
            </div>
          </div>

          {order.payment_type === 'advance' && paymentMethods.length > 0 && (
            <div className="mt-6">
              <h3 className="font-bold text-[#111111] mb-4">Payment Details</h3>
              <div className="space-y-3 mb-4">
                {paymentMethods.map((method) => (
                  <PaymentMethodCard key={method.id} method={method} />
                ))}
              </div>
              {settings?.whatsapp_number && (
                <div className="bg-[#fff9e6] border-l-4 border-[#f5c518] rounded-r-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-[#25D366] rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-[#111111] font-medium mb-2">Send Payment Screenshot</p>
                      <p className="text-xs text-[#666] mb-3">After making payment, send the screenshot on WhatsApp for order confirmation.</p>
                      <a
                        href={formatWhatsAppLink(settings.whatsapp_number)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white px-4 py-2 rounded-full text-xs font-medium transition-colors"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        Send Screenshot
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <motion.a
            href={settings?.whatsapp_number ? formatWhatsAppLink(settings.whatsapp_number) : '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-4 rounded-[10px] font-semibold text-sm transition-colors disabled:opacity-50"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Track on WhatsApp
          </motion.a>

          <Link
            href="/products"
            className="block text-center bg-[#111111] text-white py-4 rounded-[10px] font-semibold text-sm hover:bg-[#333] transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}