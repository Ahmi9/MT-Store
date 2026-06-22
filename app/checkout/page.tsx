'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { publicClient } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AnnouncementBar from '@/components/AnnouncementBar';
import { formatWhatsAppLink } from '@/lib/utils';

declare global {
  interface Window {
    fbq?: (event: string, eventName: string, data?: Record<string, any>) => void;
  }
}

interface CartItem {
  id: number;
  name: string;
  price: number;
  image: string | null;
  quantity: number;
  slug: string;
  selectedVariant?: Record<string, string> | null;
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

interface PaymentMethod {
  id: number;
  method_name: string;
  account_title: string;
  account_number: string;
  iban: string | null;
}

type PaymentType = 'cod' | 'advance';

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

function SpinnerIcon() {
  return (
    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartCount, setCartCount] = useState(0);
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
    const loadCart = () => {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      if (cart.length === 0) {
        router.push('/cart');
        return;
      }
      setCartItems(cart);
      const count = cart.reduce((sum: number, item: CartItem) => sum + (item.quantity || 0), 0);
      setCartCount(count);

      if (initiateCheckoutFired.current) return;
      if (typeof window !== 'undefined' && window.fbq) {
        const subtotal = cart.reduce((sum: number, item: CartItem) => sum + item.price * item.quantity, 0);
        window.fbq('track', 'InitiateCheckout', {
          value: subtotal,
          currency: 'PKR',
          num_items: cart.length,
        });
        initiateCheckoutFired.current = true;
      }
    };

    loadCart();
    window.addEventListener('cartUpdated', loadCart);
    return () => window.removeEventListener('cartUpdated', loadCart);
  }, [router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

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
      setCouponMessage({ type: 'error', text: `Minimum order of Rs. ${coupon.min_order_amount.toLocaleString()} required for this coupon` });
      return;
    }

    setAppliedCoupon(coupon);
    const discountAmount = coupon.discount_type === 'percentage'
      ? Math.round(subtotal * (coupon.discount_value / 100))
      : Math.min(coupon.discount_value, subtotal);
    setCouponMessage({ type: 'success', text: `Coupon applied! You saved Rs. ${discountAmount.toLocaleString()}` });
    setCouponInput('');
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponMessage({ type: '', text: '' });
  };

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const advanceDiscount = settings?.advance_payment_discount_enabled && paymentType === 'advance' ? (settings.advance_payment_discount_amount || 200) : 0;
  const couponDiscount = appliedCoupon
    ? appliedCoupon.discount_type === 'percentage'
      ? Math.round(subtotal * (appliedCoupon.discount_value / 100))
      : Math.min(appliedCoupon.discount_value, subtotal)
    : 0;
  const total = subtotal - advanceDiscount - couponDiscount;

  const handleSubmit = async (e: React.FormEvent) => {
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
        const { data: productData } = await publicClient
          .from('products')
          .select('stock')
          .eq('id', item.id)
          .single();

        if (productData) {
          const currentStock = productData.stock || 0;
          const orderedQty = parseInt(item.quantity.toString());
          const newStock = Math.max(0, currentStock - orderedQty);

          await publicClient
            .from('products')
            .update({ stock: newStock })
            .eq('id', item.id);
        }
      }

      const orderNumber = orderData.order_number;

      localStorage.setItem('cart', JSON.stringify([]));

      window.location.href = `/order-confirmation/${orderNumber}`;
    } catch (err: any) {
      setError(err.message || 'Failed to place order. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <AnnouncementBar />
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-[#111111] tracking-tight mb-8">
          Checkout
        </h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <form onSubmit={handleSubmit}>
              <div className="bg-white border border-[#eee] rounded-[14px] p-6 mb-6">
                <h2 className="font-bold text-[#111111] text-lg mb-6">Contact Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#666666] mb-2">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 bg-white border border-[#ddd] rounded-lg text-[#111] placeholder-[#999] focus:outline-none focus:border-[#111] transition-colors duration-200"
                      placeholder="Ahmed Khan"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#666666] mb-2">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 bg-white border border-[#ddd] rounded-lg text-[#111] placeholder-[#999] focus:outline-none focus:border-[#111] transition-colors duration-200"
                      placeholder="0300 1234567"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-[#666666] mb-2">
                      Email <span className="text-gray-400">(optional)</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-white border border-[#ddd] rounded-lg text-[#111] placeholder-[#999] focus:outline-none focus:border-[#111] transition-colors duration-200"
                      placeholder="ahmed@example.com"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white border border-[#eee] rounded-[14px] p-6 mb-6">
                <h2 className="font-bold text-[#111111] text-lg mb-6">Shipping Address</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#666666] mb-2">
                      Full Address <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      required
                      rows={3}
                      className="w-full px-4 py-3 bg-white border border-[#ddd] rounded-lg text-[#111] placeholder-[#999] focus:outline-none focus:border-[#111] resize-none transition-colors duration-200"
                      placeholder="House #, Street #, Area, Landmark"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#666666] mb-2">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 bg-white border border-[#ddd] rounded-lg text-[#111] placeholder-[#999] focus:outline-none focus:border-[#111] transition-colors duration-200"
                      placeholder="Karachi"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white border border-[#eee] rounded-[14px] p-6">
                <h2 className="font-bold text-[#111111] text-lg mb-6">Payment Method</h2>
                <div className="space-y-3">
                  <motion.label
                    className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors duration-200 ${paymentType === 'cod' ? 'border-[#111111] bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}
                    onClick={() => setPaymentType('cod')}
                    whileHover={{ scale: 1.01 }}
                    transition={{ duration: 0.15 }}
                  >
                    <input
                      type="radio"
                      name="paymentType"
                      value="cod"
                      checked={paymentType === 'cod'}
                      onChange={() => setPaymentType('cod')}
                      className="w-5 h-5 text-[#111111] focus:ring-[#f5c518]"
                    />
                    <div className="flex-1">
                      <span className="font-medium text-[#111111]">Cash on Delivery (COD)</span>
                    </div>
                  </motion.label>

                  <motion.label
                    className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors duration-200 ${paymentType === 'advance' ? 'border-[#111111] bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}
                    onClick={() => setPaymentType('advance')}
                    whileHover={{ scale: 1.01 }}
                    transition={{ duration: 0.15 }}
                  >
                    <input
                      type="radio"
                      name="paymentType"
                      value="advance"
                      checked={paymentType === 'advance'}
                      onChange={() => setPaymentType('advance')}
                      className="w-5 h-5 text-[#111111] focus:ring-[#f5c518]"
                    />
                    <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <span className="font-medium text-[#111111]">Advance Payment</span>
                      {settings?.advance_payment_discount_enabled && (
                        <span className="whitespace-nowrap bg-[#f5c518] text-[#111111] text-xs font-bold px-2 py-0.5 rounded-full w-fit">
                          Save Rs. {(settings.advance_payment_discount_amount || 200).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </motion.label>
                </div>

                <AnimatePresence mode="wait">
                  {paymentType === 'advance' && (
                    <motion.div
                      key="payment-details"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4">
                        <div className="mb-4">
                          <h3 className="text-base font-bold text-[#111111]">Payment Details</h3>
                          <p className="text-xs text-[#999] mt-1">Choose any method below to send payment</p>
                        </div>
                        {paymentMethods.length > 0 ? (
                          <div className="space-y-3 mb-4">
                            {paymentMethods.map((method) => (
                              <PaymentMethodCard key={method.id} method={method} />
                            ))}
                          </div>
                        ) : (
                          <p className="text-[#666] text-sm">Payment details will be shared after order confirmation.</p>
                        )}
                        {paymentMethods.length > 0 && settings?.whatsapp_number && (
                          <div className="bg-[#fff9e6] border-l-4 border-[#f5c518] rounded-r-lg p-4 mt-4">
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
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </form>
          </div>

          <div>
            <div className="bg-white border border-[#eee] rounded-[14px] p-6 sticky top-24">
              <h2 className="font-bold text-[#111111] text-lg mb-6">Order Summary</h2>

              <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto">
                {cartItems.map((item) => (
                  <div key={`${item.id}-${JSON.stringify(item.selectedVariant || {})}`} className="flex gap-3">
                    <div className="w-16 h-16 bg-[#f8f8f6] rounded-lg overflow-hidden flex-shrink-0">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">No Image</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#111111] line-clamp-2 mb-1">{item.name}</p>
                      <p className="text-xs text-[#666666]">Qty: {item.quantity}</p>
                      {item.selectedVariant && Object.keys(item.selectedVariant).length > 0 && (
                        <p className="text-xs text-gray-500">
                          {Object.entries(item.selectedVariant)
                            .map(([key, val]) => `${key}: ${val}`)
                            .join(', ')}
                        </p>
                      )}
                      <p className="text-sm font-bold text-[#111111]">Rs. {(item.price * item.quantity).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-[#eee] pt-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#666666]">Subtotal</span>
                  <span className="font-medium text-[#111111]">Rs. {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#666666]">Delivery Fee</span>
                  <span className="font-medium text-green-600">Free</span>
                </div>
                {advanceDiscount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[#666666]">Advance Payment Discount</span>
                    <span className="font-medium text-green-600">- Rs. {advanceDiscount.toLocaleString()}</span>
                  </div>
                )}
                {couponDiscount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[#666666]">Coupon Discount ({appliedCoupon?.code})</span>
                    <span className="font-medium text-green-600">- Rs. {couponDiscount.toLocaleString()}</span>
                  </div>
                )}
                <div className="border-t border-[#eee] pt-3 flex justify-between">
                  <span className="font-bold text-[#111111]">Total</span>
                  <span className="font-bold text-[#111111]">Rs. {total.toLocaleString()}</span>
                </div>
              </div>

              {!appliedCoupon && (
                <div className="mt-4 pt-4 border-t border-[#eee]">
                  <p className="text-sm text-[#666666] mb-2">Have a coupon code?</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="Enter code"
                      className="flex-1 px-3 py-2 bg-white border border-[#ddd] rounded-lg text-[#111] placeholder-[#999] focus:outline-none focus:border-[#111] text-sm uppercase"
                    />
                    <button
                      onClick={handleApplyCoupon}
                      className="bg-[#111111] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#333] transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                  {couponMessage.text && (
                    <p className={`text-xs mt-2 ${couponMessage.type === 'error' ? 'text-red-500' : 'text-green-600'}`}>
                      {couponMessage.text}
                    </p>
                  )}
                </div>
              )}

              {appliedCoupon && (
                <div className="mt-4 pt-4 border-t border-[#eee]">
                  <div className="flex items-center justify-between bg-green-50 px-3 py-2 rounded-lg">
                    <div>
                      <p className="text-sm text-green-700 font-medium">{appliedCoupon.code}</p>
                      <p className="text-xs text-green-600">Coupon applied</p>
                    </div>
                    <button
                      onClick={handleRemoveCoupon}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}

              <motion.button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full bg-[#111111] text-white py-4 rounded-[10px] font-semibold text-sm hover:bg-[#333] transition-colors mt-6 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                whileTap={loading ? {} : { scale: 0.97 }}
              >
                {loading ? (
                  <>
                    <SpinnerIcon />
                    Processing...
                  </>
                ) : (
                  'Place Order'
                )}
              </motion.button>

              <Link href="/cart" className="block text-center text-[#666666] hover:text-[#111111] text-sm transition-colors mt-4">
                ← Back to Cart
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}