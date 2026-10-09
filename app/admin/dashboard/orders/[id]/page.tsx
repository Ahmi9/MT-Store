'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { publicClient } from '@/lib/supabase';
import { formatWhatsAppLink } from '@/lib/utils';
import { waMessages } from '@/lib/whatsapp-messages';
import { displayPkPhone } from '@/lib/phone';
import { Button, Card, PageHeader, Pill, STATUS_TONE, useAdminToast } from '@/components/admin/ui';
import {
  CashIcon,
  CheckIcon,
  GiftIcon,
  MapPinIcon,
  PackageIcon,
  TruckIcon,
  UserIcon,
  WhatsAppIcon,
  XIcon,
} from '@/components/store/icons';

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
  coupon_code?: string | null;
  postex_tracking_number: string | null;
  created_at: string;
}

interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_image: string | null;
  price: number;
  quantity: number;
  total: number;
  selected_variant?: Record<string, string> | null;
}

const FLOW = [
  { value: 'pending', label: 'Pending', icon: GiftIcon },
  { value: 'confirmed', label: 'Confirmed', icon: CheckIcon },
  { value: 'shipped', label: 'Shipped', icon: TruckIcon },
  { value: 'delivered', label: 'Delivered', icon: MapPinIcon },
];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;
  const notify = useAdminToast();

  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState('');

  useEffect(() => {
    const fetchOrderData = async () => {
      const { data: orderData, error: orderError } = await publicClient.from('orders').select('*').eq('id', orderId).single();

      if (orderError || !orderData) {
        router.push('/admin/dashboard/orders');
        return;
      }

      setOrder(orderData as Order);
      setNewStatus(orderData.status);

      const { data: itemsData } = await publicClient.from('order_items').select('*').eq('order_id', orderId);
      if (itemsData) setOrderItems(itemsData as OrderItem[]);

      setLoading(false);
    };

    fetchOrderData();
  }, [orderId, router]);

  const handleUpdateStatus = async () => {
    if (!order || !newStatus) return;
    setUpdating(true);
    const { error } = await publicClient.from('orders').update({ status: newStatus }).eq('id', orderId);
    setUpdating(false);
    if (error) {
      notify(`Couldn’t update status: ${error.message}`, 'error');
      return;
    }
    setOrder({ ...order, status: newStatus });
    notify(`Order marked as ${newStatus} ✨`);
  };

  if (loading || !order) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-12 w-64 rounded-2xl" />
        <div className="skeleton h-28 w-full rounded-[1.75rem]" />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="skeleton h-64 rounded-[1.75rem] lg:col-span-2" />
          <div className="skeleton h-64 rounded-[1.75rem]" />
        </div>
      </div>
    );
  }

  const whatsappLink = formatWhatsAppLink(
    order.customer_phone,
    waMessages.adminOrder({
      customer_name: order.customer_name,
      order_number: order.order_number,
      status: order.status,
      total: Number(order.total),
      payment_type: order.payment_type,
      tracking: order.postex_tracking_number,
    })
  );
  const created = new Date(order.created_at);
  const currentStep = FLOW.findIndex((f) => f.value === order.status);
  const cancelled = order.status === 'cancelled';

  return (
    <div>
      <PageHeader
        backHref="/admin/dashboard/orders"
        backLabel="All orders"
        title={
          <span className="flex flex-wrap items-center gap-3">
            #{order.order_number}
            <Pill tone={STATUS_TONE[order.status] ?? 'neutral'} dot>
              {cap(order.status)}
            </Pill>
          </span>
        }
        subtitle={`${created.toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })} at ${created.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}`}
        actions={
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-extrabold text-white shadow-soft transition-transform hover:-translate-y-0.5"
          >
            <WhatsAppIcon className="h-4 w-4" /> Message customer
          </a>
        }
      />

      {/* progress */}
      <Card className="mb-4">
        {cancelled ? (
          <div className="flex items-center gap-3 font-bold text-rose-700">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100">
              <XIcon className="h-5 w-5" />
            </span>
            This order was cancelled.
          </div>
        ) : (
          <div className="flex items-start">
            {FLOW.map((step, i) => {
              const done = i <= currentStep;
              return (
                <div key={step.value} className="relative flex flex-1 flex-col items-center text-center">
                  {i < FLOW.length - 1 && (
                    <div className="absolute left-1/2 top-5 h-1 w-full overflow-hidden bg-blush-100">
                      <motion.div initial={{ width: 0 }} animate={{ width: i < currentStep ? '100%' : 0 }} transition={{ duration: 0.5, delay: i * 0.15 }} className="h-full bg-berry-500" />
                    </div>
                  )}
                  <motion.span
                    initial={{ scale: 0.6 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: i * 0.08, type: 'spring' }}
                    className={`relative flex h-10 w-10 items-center justify-center rounded-full ${done ? 'bg-gradient-to-br from-berry-400 to-berry-600 text-white shadow-soft' : 'bg-blush-100 text-muted'}`}
                  >
                    <step.icon className="h-5 w-5" />
                  </motion.span>
                  <span className={`mt-2 text-xs font-extrabold ${done ? 'text-ink' : 'text-muted'}`}>{step.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Items" description={`${orderItems.reduce((s, i) => s + i.quantity, 0)} pieces`} icon={PackageIcon} delay={0.05}>
            <ul className="divide-y divide-line">
              {orderItems.map((item, i) => (
                <motion.li key={item.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.04 }} className="flex items-center gap-4 py-3">
                  <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-2xl bg-blush-100">
                    {item.product_image && <img src={item.product_image} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-extrabold text-ink">{item.product_name}</p>
                    <p className="text-xs font-semibold text-muted">
                      {item.quantity} × Rs. {Number(item.price).toLocaleString()}
                    </p>
                    {item.selected_variant && Object.keys(item.selected_variant).length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {Object.entries(item.selected_variant).map(([k, v]) => (
                          <Pill key={k} tone="pink">
                            {k}: {v}
                          </Pill>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="font-extrabold text-ink">Rs. {Number(item.total).toLocaleString()}</p>
                </motion.li>
              ))}
            </ul>
            <dl className="mt-3 space-y-2 border-t border-dashed border-blush-300 pt-4 text-sm font-bold">
              <div className="flex justify-between text-ink-soft">
                <dt>Subtotal</dt>
                <dd className="text-ink">Rs. {Number(order.subtotal).toLocaleString()}</dd>
              </div>
              {Number(order.discount) > 0 && (
                <div className="flex justify-between text-ink-soft">
                  <dt>Discount{order.coupon_code ? ` (${order.coupon_code})` : ''}</dt>
                  <dd className="text-emerald-600">− Rs. {Number(order.discount).toLocaleString()}</dd>
                </div>
              )}
              <div className="flex items-end justify-between pt-1">
                <dt className="text-ink">Total</dt>
                <dd className="font-display text-2xl font-semibold text-ink">Rs. {Number(order.total).toLocaleString()}</dd>
              </div>
            </dl>
          </Card>

          <Card title="Customer" icon={UserIcon} delay={0.1}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Info label="Name" value={order.customer_name} />
              <Info label="Phone" value={displayPkPhone(order.customer_phone)} />
              <Info label="Email" value={order.customer_email || '—'} />
              <Info label="City" value={order.customer_city} />
              <Info label="Address" value={order.customer_address} className="sm:col-span-2" />
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Update status" icon={TruckIcon} delay={0.15}>
            <div className="grid grid-cols-2 gap-2">
              {[...FLOW.map((f) => f.value), 'cancelled'].map((status) => {
                const active = newStatus === status;
                return (
                  <motion.button
                    key={status}
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setNewStatus(status)}
                    className={`rounded-2xl border-2 px-3 py-2.5 text-sm font-extrabold transition-colors ${
                      active
                        ? status === 'cancelled'
                          ? 'border-rose-400 bg-rose-50 text-rose-700'
                          : 'border-berry-500 bg-blush-100 text-berry-700'
                        : 'border-line bg-white text-ink-soft hover:border-blush-300'
                    } ${status === 'cancelled' ? 'col-span-2' : ''}`}
                  >
                    {cap(status)}
                    {order.status === status && <span className="ml-1 text-[10px] font-bold opacity-70">(current)</span>}
                  </motion.button>
                );
              })}
            </div>
            <Button className="mt-4 w-full" icon={CheckIcon} onClick={handleUpdateStatus} loading={updating} disabled={newStatus === order.status}>
              {newStatus === order.status ? 'Choose a new status' : `Mark as ${newStatus}`}
            </Button>
          </Card>

          <Card title="Payment" icon={order.payment_type === 'cod' ? CashIcon : GiftIcon} delay={0.2}>
            <Pill tone={order.payment_type === 'cod' ? 'neutral' : 'pink'}>{order.payment_type === 'cod' ? 'Cash on delivery' : 'Advance payment'}</Pill>
            <p className="mt-3 text-sm font-semibold text-muted">
              {order.payment_type === 'cod' ? 'Collect payment when the parcel is delivered.' : 'Check the payment screenshot on WhatsApp before shipping.'}
            </p>
            {order.postex_tracking_number && (
              <div className="mt-4 rounded-2xl bg-blush-50 p-3">
                <p className="text-xs font-extrabold uppercase tracking-wider text-muted">Tracking number</p>
                <p className="font-mono font-bold text-ink">{order.postex_tracking_number}</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <p className="text-xs font-extrabold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-0.5 font-bold text-ink">{value}</p>
    </div>
  );
}
