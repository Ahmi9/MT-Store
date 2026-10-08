'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { publicClient } from '@/lib/supabase';
import { formatWhatsAppLink } from '@/lib/utils';
import { formatPrice } from '@/lib/cart';
import PaymentMethodCard, { type PaymentMethod } from '@/components/store/PaymentMethodCard';
import { ArrowRightIcon, CashIcon, CopyIcon, GiftIcon, MapPinIcon, PackageIcon, TruckIcon, WhatsAppIcon } from '@/components/store/icons';

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
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_image: string;
  price: number;
  quantity: number;
  total: number;
  selected_variant?: Record<string, string> | null;
}

export default function OrderConfirmationPage() {
  const params = useParams();
  const orderId = params.order_id as string;

  const [whatsapp, setWhatsapp] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);
  const purchaseFired = useRef(false);

  useEffect(() => {
    const fetchExtras = async () => {
      const [settingsRes, methodsRes] = await Promise.all([
        publicClient.from('site_settings').select('whatsapp_number').single(),
        publicClient.from('payment_methods').select('*').eq('is_active', true).order('display_order', { ascending: true }),
      ]);
      setWhatsapp(settingsRes.data?.whatsapp_number ?? null);
      if (methodsRes.data) setPaymentMethods(methodsRes.data as PaymentMethod[]);
    };

    const fetchOrder = async () => {
      const { data: orderData, error: orderError } = await publicClient.from('orders').select('*').eq('order_number', orderId).single();

      if (orderError || !orderData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setOrder(orderData as Order);

      const { data: itemsData } = await publicClient.from('order_items').select('*').eq('order_id', orderData.id);
      if (itemsData) setOrderItems(itemsData as OrderItem[]);
      setLoading(false);
    };

    fetchExtras();
    fetchOrder();
  }, [orderId]);

  useEffect(() => {
    if (purchaseFired.current) return;
    if (order && orderItems.length > 0 && typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', 'Purchase', {
        value: order.total,
        currency: 'PKR',
        content_ids: orderItems.map((item) => item.product_id),
        content_type: 'product',
        num_items: orderItems.length,
      });
      purchaseFired.current = true;
    }
  }, [order, orderItems]);

  if (loading) {
    return (
      <div className="container-zs max-w-3xl space-y-4 py-16">
        <div className="skeleton mx-auto h-28 w-28 rounded-full" />
        <div className="skeleton mx-auto h-10 w-2/3 rounded-xl" />
        <div className="skeleton h-48 w-full rounded-[28px]" />
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="container-zs py-24 text-center">
        <div className="mx-auto mb-4 w-fit text-6xl">📦</div>
        <h1 className="font-display text-4xl font-semibold text-ink">Order not found</h1>
        <p className="mx-auto mt-2 max-w-md font-semibold text-muted">We couldn’t find an order with this number. Double-check it or message us on WhatsApp.</p>
        <Link href="/products" className="btn-primary mt-8 px-8 py-3.5">
          Continue shopping
        </Link>
      </div>
    );
  }

  const firstName = order.customer_name.trim().split(' ')[0];
  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText(order.order_number);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked — nothing to do
    }
  };

  return (
    <div className="relative overflow-hidden">
      <Confetti />
      <div className="container-zs relative max-w-3xl py-10 md:py-16">
        <div className="text-center">
          <motion.div
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 180, damping: 12 }}
            className="relative mx-auto mb-6 flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-berry-400 to-berry-600 shadow-pop"
          >
            <span className="absolute inset-0 animate-ping rounded-full bg-berry-400/30" />
            <svg viewBox="0 0 24 24" className="relative h-14 w-14 text-white" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
              <motion.path d="m5 12.5 4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.35, duration: 0.5 }} />
            </svg>
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="font-display text-4xl font-semibold text-ink md:text-5xl">
            Yay, thank you {firstName}! 💕
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }} className="mt-2 font-semibold text-muted">
            Your order is placed and we’re getting it ready with love.
          </motion.p>
          <motion.button
            type="button"
            onClick={copyNumber}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.55 }}
            className="mt-5 inline-flex items-center gap-2 rounded-full border-2 border-dashed border-berry-400 bg-white px-5 py-2.5 font-extrabold text-ink"
          >
            Order #{order.order_number}
            <span className="flex items-center gap-1 text-xs text-berry-600">
              <CopyIcon className="h-3.5 w-3.5" /> {copied ? 'Copied!' : 'Copy'}
            </span>
          </motion.button>
        </div>

        <Timeline />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="card-zs p-6">
            <p className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-ink">
              <MapPinIcon className="h-5 w-5 text-berry-500" /> Delivering to
            </p>
            <p className="font-extrabold text-ink">{order.customer_name}</p>
            <p className="mt-1 text-sm font-semibold leading-relaxed text-ink-soft">
              {order.customer_address}, {order.customer_city}
            </p>
            <p className="mt-2 text-sm font-semibold text-ink-soft">{order.customer_phone}</p>
            {order.customer_email && <p className="text-sm font-semibold text-ink-soft">{order.customer_email}</p>}
          </div>
          <div className="card-zs p-6">
            <p className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-ink">
              {order.payment_type === 'cod' ? <CashIcon className="h-5 w-5 text-berry-500" /> : <GiftIcon className="h-5 w-5 text-berry-500" />} Payment
            </p>
            <span className="chip bg-blush-100 text-berry-700">{order.payment_type === 'cod' ? 'Cash on delivery' : 'Advance payment'}</span>
            <dl className="mt-4 space-y-2 text-sm font-bold">
              <div className="flex justify-between text-ink-soft">
                <dt>Subtotal</dt>
                <dd className="text-ink">{formatPrice(Number(order.subtotal))}</dd>
              </div>
              {Number(order.discount) > 0 && (
                <div className="flex justify-between text-ink-soft">
                  <dt>Discount</dt>
                  <dd className="text-emerald-600">−{formatPrice(Number(order.discount))}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-dashed border-blush-300 pt-2">
                <dt className="text-ink">Total</dt>
                <dd className="font-display text-xl font-semibold text-ink">{formatPrice(Number(order.total))}</dd>
              </div>
            </dl>
          </div>
        </motion.div>

        {order.payment_type === 'advance' && paymentMethods.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="card-zs mt-4 p-6">
            <p className="font-display text-lg font-semibold text-ink">Complete your advance payment</p>
            <p className="mb-4 text-sm font-semibold text-muted">Send {formatPrice(Number(order.total))} to any account below, then share the screenshot on WhatsApp.</p>
            <div className="grid gap-3 md:grid-cols-2">
              {paymentMethods.map((method) => (
                <PaymentMethodCard key={method.id} method={method} />
              ))}
            </div>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="card-zs mt-4 p-6">
          <p className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-ink">
            <PackageIcon className="h-5 w-5 text-berry-500" /> In your parcel
          </p>
          <ul className="divide-y divide-line">
            {orderItems.map((item) => (
              <li key={item.id} className="flex items-center gap-3 py-3">
                <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-blush-100">
                  {item.product_image && <img src={item.product_image} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 font-bold text-ink">{item.product_name}</p>
                  <p className="text-xs font-semibold text-muted">
                    {item.quantity} × {formatPrice(Number(item.price))}
                    {item.selected_variant && Object.keys(item.selected_variant).length > 0 && (
                      <>
                        {' · '}
                        {Object.entries(item.selected_variant)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(' · ')}
                      </>
                    )}
                  </p>
                </div>
                <p className="font-extrabold text-ink">{formatPrice(Number(item.total))}</p>
              </li>
            ))}
          </ul>
        </motion.div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {whatsapp && (
            <a
              href={formatWhatsAppLink(whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] py-4 font-extrabold text-white shadow-soft transition-transform hover:-translate-y-0.5"
            >
              <WhatsAppIcon className="h-5 w-5" /> {order.payment_type === 'advance' ? 'Send payment screenshot' : 'Chat about my order'}
            </a>
          )}
          <Link href="/products" className={`btn-primary py-4 ${whatsapp ? '' : 'sm:col-span-2'}`}>
            Continue shopping <ArrowRightIcon className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function Timeline() {
  const steps = [
    { icon: GiftIcon, label: 'Order placed', done: true },
    { icon: PackageIcon, label: 'Packing', done: false },
    { icon: TruckIcon, label: 'On the way', done: false },
    { icon: MapPinIcon, label: 'Delivered', done: false },
  ];
  return (
    <div className="card-zs mt-10 p-5 md:p-6">
      <div className="flex items-start justify-between">
        {steps.map((s, i) => (
          <div key={s.label} className="relative flex flex-1 flex-col items-center text-center">
            {i < steps.length - 1 && (
              <div className="absolute left-1/2 top-5 h-1 w-full bg-blush-100">
                {i === 0 && <motion.div initial={{ width: 0 }} animate={{ width: '50%' }} transition={{ delay: 0.9, duration: 0.8 }} className="h-full bg-berry-400" />}
              </div>
            )}
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.6 + i * 0.12, type: 'spring' }}
              className={`relative flex h-10 w-10 items-center justify-center rounded-full ${s.done ? 'bg-berry-500 text-white shadow-soft' : 'bg-blush-100 text-muted'}`}
            >
              <s.icon className="h-5 w-5" />
            </motion.span>
            <span className={`mt-2 text-[11px] font-extrabold md:text-xs ${s.done ? 'text-ink' : 'text-muted'}`}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Confetti() {
  const [pieces] = useState(
    () =>
      Array.from({ length: 46 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 2.4 + Math.random() * 1.8,
        rotate: Math.random() * 540 - 270,
        drift: Math.random() * 120 - 60,
        color: ['#ff80aa', '#f7609a', '#e9dcff', '#ffd9c7', '#cdf3e4', '#fad4e1', '#b46cff'][i % 7],
        shape: i % 3,
      }))
  );
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-[90vh] overflow-hidden" aria-hidden="true">
      {pieces.map((p, i) => (
        <motion.span
          key={i}
          className="absolute -top-6"
          style={{ left: `${p.left}%` }}
          initial={{ y: -20, x: 0, rotate: 0, opacity: 1 }}
          animate={{ y: '90vh', x: p.drift, rotate: p.rotate, opacity: [1, 1, 0] }}
          transition={{ delay: p.delay, duration: p.duration, ease: 'easeIn' }}
        >
          {p.shape === 0 ? (
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill={p.color}>
              <path d="M12 20.5s-7.5-4.6-9.3-9.4C1.5 7.8 3.6 4.5 7 4.5c2 0 3.4 1.1 5 3 1.6-1.9 3-3 5-3 3.4 0 5.5 3.3 4.3 6.6-1.8 4.8-9.3 9.4-9.3 9.4Z" />
            </svg>
          ) : (
            <span className={`block ${p.shape === 1 ? 'h-3 w-1.5 rounded-sm' : 'h-2.5 w-2.5 rounded-full'}`} style={{ background: p.color }} />
          )}
        </motion.span>
      ))}
    </div>
  );
}
