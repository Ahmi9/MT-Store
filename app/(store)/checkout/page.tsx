'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { publicClient } from '@/lib/supabase';
import { formatWhatsAppLink } from '@/lib/utils';
import { cartSubtotal, formatPrice, lineKey } from '@/lib/cart';
import { useStore } from '@/components/store/StoreProvider';
import PaymentMethodCard, { type PaymentMethod } from '@/components/store/PaymentMethodCard';
import {
  CashIcon,
  CheckIcon,
  GiftIcon,
  MapPinIcon,
  ShieldIcon,
  TagIcon,
  UserIcon,
  WalletIcon,
  WhatsAppIcon,
  XIcon,
} from '@/components/store/icons';

interface SiteSettings {
  whatsapp_number: string | null;
  advance_payment_discount_enabled: boolean;
  advance_payment_discount_amount: number;
}

interface Coupon {
  id: number;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number;
  max_uses: number | null;
  used_count: number;
  expiry_date: string | null;
  is_active: boolean;
}

type PaymentType = 'cod' | 'advance';

function Spinner() {
  return <span className="h-5 w-5 animate-spin rounded-full border-[3px] border-white/40 border-t-white" />;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { cart: cartItems, hydrated } = useStore();
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    address: '',
    city: '',
  });

  const [paymentType, setPaymentType] = useState<PaymentType>('cod');
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponMessage, setCouponMessage] = useState({ type: '', text: '' });
  const initiateCheckoutFired = useRef(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const settingsRes = await publicClient.from('site_settings').select('*').single();
      if (!settingsRes.error && settingsRes.data) {
        setSettings(settingsRes.data as SiteSettings);
      }
    };
    const fetchPaymentMethods = async () => {
      const { data } = await publicClient
        .from('payment_methods')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (data) setPaymentMethods(data as PaymentMethod[]);
    };
    fetchSettings();
    fetchPaymentMethods();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (cartItems.length === 0) {
      router.push('/cart');
      return;
    }
    if (initiateCheckoutFired.current) return;
    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', 'InitiateCheckout', {
        value: cartSubtotal(cartItems),
        currency: 'PKR',
        num_items: cartItems.length,
      });
      initiateCheckoutFired.current = true;
    }
  }, [hydrated, cartItems, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const subtotal = cartSubtotal(cartItems);
  const advanceDiscount =
    settings?.advance_payment_discount_enabled && paymentType === 'advance' ? Number(settings.advance_payment_discount_amount) || 200 : 0;
  const couponDiscount = appliedCoupon
    ? appliedCoupon.discount_type === 'percentage'
      ? Math.round(subtotal * (appliedCoupon.discount_value / 100))
      : Math.min(appliedCoupon.discount_value, subtotal)
    : 0;
  const total = subtotal - advanceDiscount - couponDiscount;

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) {
      setCouponMessage({ type: 'error', text: 'Please enter a coupon code' });
      return;
    }

    setCouponMessage({ type: '', text: '' });

    const { data, error } = await publicClient
      .from('coupons')
      .select('*')
      .ilike('code', couponInput.trim())
      .eq('is_active', true)
      .single();

    if (error || !data) {
      setCouponMessage({ type: 'error', text: 'Invalid coupon code' });
      return;
    }

    const coupon = data as Coupon;

    if (coupon.expiry_date && new Date(coupon.expiry_date) < new Date()) {
      setCouponMessage({ type: 'error', text: 'This coupon has expired' });
      return;
    }

    if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
      setCouponMessage({ type: 'error', text: 'This coupon has reached its usage limit' });
      return;
    }

    if (coupon.min_order_amount && subtotal < coupon.min_order_amount) {
      setCouponMessage({ type: 'error', text: `Minimum order of ${formatPrice(coupon.min_order_amount)} required for this coupon` });
      return;
    }

    setAppliedCoupon(coupon);
    const discountAmount =
      coupon.discount_type === 'percentage' ? Math.round(subtotal * (coupon.discount_value / 100)) : Math.min(coupon.discount_value, subtotal);
    setCouponMessage({ type: 'success', text: `Yay! You saved ${formatPrice(discountAmount)} 🎉` });
    setCouponInput('');
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponMessage({ type: '', text: '' });
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.fullName.trim() || !formData.phone.trim() || !formData.address.trim() || !formData.city.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const { data: orderData, error: orderError } = await publicClient
        .from('orders')
        .insert({
          customer_name: formData.fullName.trim(),
          customer_phone: formData.phone.trim(),
          customer_email: formData.email.trim() || null,
          customer_address: formData.address.trim(),
          customer_city: formData.city.trim(),
          payment_type: paymentType,
          subtotal,
          discount: advanceDiscount + couponDiscount,
          total,
          coupon_code: appliedCoupon?.code || null,
          status: 'pending',
        })
        .select('id, order_number')
        .single();

      if (orderError) {
        throw new Error(orderError.message);
      }

      if (appliedCoupon) {
        await publicClient
          .from('coupons')
          .update({ used_count: appliedCoupon.used_count + 1 })
          .eq('id', appliedCoupon.id);
      }

      const orderItems = cartItems.map((item) => {
        const price = parseFloat(item.price.toString());
        const quantity = parseInt(item.quantity.toString());
        return {
          order_id: orderData.id,
          product_id: item.id,
          product_name: item.name,
          product_image: item.image || '',
          price,
          quantity,
          total: price * quantity,
          selected_variant: item.selectedVariant || null,
        };
      });

      const { error: itemsError } = await publicClient.from('order_items').insert(orderItems);

      if (itemsError) {
        throw new Error(itemsError.message);
      }

      for (const item of cartItems) {
        const { data: productData } = await publicClient.from('products').select('stock').eq('id', item.id).single();

        if (productData) {
          const currentStock = productData.stock || 0;
          const orderedQty = parseInt(item.quantity.toString());
          const newStock = Math.max(0, currentStock - orderedQty);

          await publicClient.from('products').update({ stock: newStock }).eq('id', item.id);
        }
      }

      const orderNumber = orderData.order_number;

      // Written directly (no cartUpdated event) so the empty-cart redirect
      // above doesn't race the navigation to the confirmation page.
      localStorage.setItem('cart', JSON.stringify([]));

      window.location.href = `/order-confirmation/${orderNumber}`;
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Failed to place order. Please try again.');
      setLoading(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (!hydrated || cartItems.length === 0) return <div className="min-h-[60vh]" />;

  const discountAmount = settings?.advance_payment_discount_enabled ? Number(settings.advance_payment_discount_amount) || 200 : 0;

  return (
    <div className="container-zs py-8 md:py-12">
      <Steps />
      <h1 className="mb-8 text-center font-display text-4xl font-semibold text-ink md:text-5xl">Almost yours ✨</h1>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0, x: [0, -8, 8, -4, 4, 0] }}
            exit={{ opacity: 0 }}
            className="mx-auto mb-6 flex max-w-3xl items-center justify-between gap-3 rounded-2xl border-2 border-berry-400 bg-blush-100 px-5 py-4 font-bold text-berry-700"
          >
            {error}
            <button type="button" onClick={() => setError('')} aria-label="Dismiss">
              <XIcon className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <Section icon={UserIcon} step={1} title="Your details">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Full name" required>
                <input type="text" name="fullName" value={formData.fullName} onChange={handleInputChange} required autoComplete="name" className="input-zs" placeholder="Ayesha Khan" />
              </Field>
              <Field label="Phone number" required>
                <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} required autoComplete="tel" inputMode="tel" className="input-zs" placeholder="0300 1234567" />
              </Field>
              <Field label="Email" hint="optional" className="md:col-span-2">
                <input type="email" name="email" value={formData.email} onChange={handleInputChange} autoComplete="email" className="input-zs" placeholder="ayesha@example.com" />
              </Field>
            </div>
          </Section>

          <Section icon={MapPinIcon} step={2} title="Delivery address">
            <div className="grid gap-4 md:grid-cols-[1fr_220px]">
              <Field label="Full address" required>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  required
                  rows={3}
                  autoComplete="street-address"
                  className="input-zs resize-none"
                  placeholder="House #, Street #, Area, Landmark"
                />
              </Field>
              <Field label="City" required>
                <input type="text" name="city" value={formData.city} onChange={handleInputChange} required autoComplete="address-level2" className="input-zs" placeholder="Lahore" />
              </Field>
            </div>
          </Section>

          <Section icon={WalletIcon} step={3} title="Payment">
            <div className="grid gap-3 sm:grid-cols-2">
              <PaymentOption active={paymentType === 'cod'} onClick={() => setPaymentType('cod')} icon={CashIcon} title="Cash on delivery" text="Pay when your parcel arrives" />
              <PaymentOption
                active={paymentType === 'advance'}
                onClick={() => setPaymentType('advance')}
                icon={GiftIcon}
                title="Advance payment"
                text="Bank / JazzCash / Easypaisa"
                badge={discountAmount > 0 ? `Save ${formatPrice(discountAmount)}` : undefined}
              />
            </div>

            <AnimatePresence initial={false}>
              {paymentType === 'advance' && (
                <motion.div key="payment-details" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="pt-5">
                    <p className="font-extrabold text-ink">Send your payment to any of these</p>
                    <p className="mb-3 text-sm font-semibold text-muted">Then share the screenshot with us on WhatsApp.</p>
                    {paymentMethods.length > 0 ? (
                      <div className="grid gap-3 md:grid-cols-2">
                        {paymentMethods.map((method) => (
                          <PaymentMethodCard key={method.id} method={method} />
                        ))}
                      </div>
                    ) : (
                      <p className="rounded-2xl bg-blush-50 p-4 text-sm font-semibold text-ink-soft">Payment details will be shared after order confirmation.</p>
                    )}
                    {paymentMethods.length > 0 && settings?.whatsapp_number && (
                      <a
                        href={formatWhatsAppLink(settings.whatsapp_number)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 flex items-center gap-3 rounded-2xl bg-[#e7f9ee] p-4 transition-colors hover:bg-[#d4f5e1]"
                      >
                        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white">
                          <WhatsAppIcon className="h-5 w-5" />
                        </span>
                        <span className="flex-1">
                          <span className="block text-sm font-extrabold text-ink">Send payment screenshot</span>
                          <span className="block text-xs font-semibold text-ink-soft">We confirm advance orders on WhatsApp</span>
                        </span>
                      </a>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Section>

          <button type="submit" disabled={loading} className="btn-primary w-full py-4 text-base lg:hidden">
            {loading ? (
              <>
                <Spinner /> Placing your order…
              </>
            ) : (
              `Place order · ${formatPrice(total)}`
            )}
          </button>
        </form>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="card-zs overflow-hidden">
            <div className="bg-gradient-to-br from-blush-100 to-blush-200 px-6 py-4">
              <h2 className="font-display text-2xl font-semibold text-ink">Order summary</h2>
            </div>
            <div className="p-6">
              <ul className="max-h-[300px] space-y-4 overflow-y-auto pr-1">
                {cartItems.map((item) => (
                  <li key={lineKey(item)} className="flex gap-3">
                    <div className="relative h-16 w-16 flex-shrink-0">
                      <div className="h-full w-full overflow-hidden rounded-2xl bg-blush-100">
                        {item.image && <img src={item.image} alt="" className="h-full w-full object-cover" />}
                      </div>
                      <span className="absolute -right-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-ink px-1 text-[11px] font-extrabold text-white ring-2 ring-white">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-bold text-ink">{item.name}</p>
                      {item.selectedVariant && Object.keys(item.selectedVariant).length > 0 && (
                        <p className="text-xs font-semibold text-muted">
                          {Object.entries(item.selectedVariant)
                            .map(([key, val]) => `${key}: ${val}`)
                            .join(' · ')}
                        </p>
                      )}
                    </div>
                    <p className="text-sm font-extrabold text-ink">{formatPrice(item.price * item.quantity)}</p>
                  </li>
                ))}
              </ul>

              {!appliedCoupon ? (
                <div className="mt-5 border-t border-line pt-5">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <TagIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-berry-500" />
                      <input
                        type="text"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleApplyCoupon();
                          }
                        }}
                        placeholder="Coupon code"
                        className="input-zs py-2.5 pl-10 text-sm uppercase"
                      />
                    </div>
                    <button type="button" onClick={handleApplyCoupon} className="rounded-2xl bg-ink px-5 text-sm font-extrabold text-white transition-colors hover:bg-berry-600">
                      Apply
                    </button>
                  </div>
                  <AnimatePresence>
                    {couponMessage.text && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={`mt-2 text-xs font-bold ${couponMessage.type === 'error' ? 'text-berry-700' : 'text-emerald-600'}`}
                      >
                        {couponMessage.text}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mt-5 flex items-center justify-between rounded-2xl border-2 border-dashed border-emerald-300 bg-mint/60 px-4 py-3">
                  <div>
                    <p className="flex items-center gap-1.5 text-sm font-extrabold text-emerald-800">
                      <TagIcon className="h-4 w-4" /> {appliedCoupon.code}
                    </p>
                    <p className="text-xs font-semibold text-emerald-700">{couponMessage.text || 'Coupon applied'}</p>
                  </div>
                  <button type="button" onClick={handleRemoveCoupon} className="text-xs font-extrabold text-berry-700 hover:underline">
                    Remove
                  </button>
                </motion.div>
              )}

              <dl className="mt-5 space-y-2.5 border-t border-line pt-5 text-sm font-bold">
                <Row label="Subtotal" value={formatPrice(subtotal)} />
                <Row label="Delivery" value="Free" accent />
                <AnimatePresence>
                  {advanceDiscount > 0 && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                      <Row label="Advance payment discount" value={`−${formatPrice(advanceDiscount)}`} accent />
                    </motion.div>
                  )}
                  {couponDiscount > 0 && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                      <Row label={`Coupon (${appliedCoupon?.code})`} value={`−${formatPrice(couponDiscount)}`} accent />
                    </motion.div>
                  )}
                </AnimatePresence>
              </dl>

              <div className="mt-4 flex items-end justify-between border-t border-dashed border-blush-300 pt-4">
                <span className="font-bold text-ink-soft">Total</span>
                <motion.span key={total} initial={{ scale: 1.15, color: '#e2427f' }} animate={{ scale: 1, color: '#2b1520' }} className="font-display text-3xl font-semibold">
                  {formatPrice(total)}
                </motion.span>
              </div>

              <button type="button" onClick={handleSubmit} disabled={loading} className="btn-primary mt-6 hidden w-full py-4 text-base lg:flex">
                {loading ? (
                  <>
                    <Spinner /> Placing your order…
                  </>
                ) : (
                  'Place order'
                )}
              </button>

              <p className="mt-4 flex items-center justify-center gap-1.5 text-xs font-bold text-muted">
                <ShieldIcon className="h-4 w-4 text-berry-500" /> Your details are only used to deliver your order
              </p>
              <Link href="/cart" className="mt-3 block text-center text-sm font-extrabold text-berry-600 hover:underline">
                ← Back to bag
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Steps() {
  const steps = ['Bag', 'Details', 'Done'];
  return (
    <div className="mx-auto mb-6 flex max-w-sm items-center justify-between">
      {steps.map((s, i) => (
        <div key={s} className="flex flex-1 items-center last:flex-none">
          <div className="flex flex-col items-center gap-1">
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-extrabold ${
                i === 0 ? 'bg-berry-500 text-white' : i === 1 ? 'bg-ink text-white ring-4 ring-blush-200' : 'bg-white text-muted'
              }`}
            >
              {i === 0 ? <CheckIcon className="h-4 w-4" /> : i + 1}
            </span>
            <span className={`text-xs font-extrabold ${i === 1 ? 'text-ink' : 'text-muted'}`}>{s}</span>
          </div>
          {i < steps.length - 1 && (
            <div className="mx-2 mb-5 h-1 flex-1 overflow-hidden rounded-full bg-blush-200">
              <motion.div initial={{ width: 0 }} animate={{ width: i === 0 ? '100%' : '35%' }} transition={{ duration: 0.8, delay: 0.2 }} className="h-full bg-berry-500" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Section({ icon: Icon, step, title, children }: { icon: React.ComponentType<{ className?: string }>; step: number; title: string; children: React.ReactNode }) {
  return (
    <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: step * 0.08 }} className="card-zs p-5 md:p-7">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blush-100 text-berry-600">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-muted">Step {step}</p>
          <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
        </div>
      </div>
      {children}
    </motion.section>
  );
}

function Field({ label, required, hint, className, children }: { label: string; required?: boolean; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="mb-1.5 block text-sm font-extrabold text-ink-soft">
        {label} {required && <span className="text-berry-500">*</span>}
        {hint && <span className="font-semibold text-muted">({hint})</span>}
      </span>
      {children}
    </label>
  );
}

function PaymentOption({
  active,
  onClick,
  icon: Icon,
  title,
  text,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
  badge?: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      className={`relative flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-colors ${
        active ? 'border-berry-500 bg-blush-50' : 'border-line bg-white hover:border-blush-300'
      }`}
      aria-pressed={active}
    >
      <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${active ? 'bg-berry-500 text-white' : 'bg-blush-100 text-berry-600'}`}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="flex-1">
        <span className="block font-extrabold text-ink">{title}</span>
        <span className="block text-xs font-semibold text-muted">{text}</span>
      </span>
      <span className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${active ? 'border-berry-500 bg-berry-500 text-white' : 'border-blush-300'}`}>
        {active && <CheckIcon className="h-3.5 w-3.5" />}
      </span>
      {badge && <span className="chip absolute -top-3 right-3 bg-berry-500 text-white shadow-soft">{badge}</span>}
    </motion.button>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between gap-4 py-0.5">
      <dt className="text-ink-soft">{label}</dt>
      <dd className={accent ? 'text-emerald-600' : 'text-ink'}>{value}</dd>
    </div>
  );
}
