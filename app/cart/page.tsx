'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AnnouncementBar from '@/components/AnnouncementBar';
import { publicClient } from '@/lib/supabase';

interface SiteSettings {
  advance_payment_discount_enabled: boolean;
  advance_payment_discount_amount: number;
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

function MinusIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}

export default function CartPage() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [prevQuantities, setPrevQuantities] = useState<Record<number, number>>({});
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({
    advance_payment_discount_enabled: false,
    advance_payment_discount_amount: 200,
  });

  useEffect(() => {
    const loadCart = () => {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      console.log('Cart loaded:', JSON.stringify(cart, null, 2));
      console.log('First item selectedVariant:', cart[0]?.selectedVariant);
      setCartItems(cart);
      const qtyMap: Record<number, number> = {};
      cart.forEach((item: CartItem) => {
        qtyMap[item.id] = item.quantity;
      });
      setQuantities(qtyMap);
      setPrevQuantities(qtyMap);
    };

    const loadSiteSettings = async () => {
      const { data } = await publicClient
        .from('site_settings')
        .select('advance_payment_discount_enabled, advance_payment_discount_amount')
        .single();
      if (data) {
        setSiteSettings({
          advance_payment_discount_enabled: data.advance_payment_discount_enabled ?? false,
          advance_payment_discount_amount: data.advance_payment_discount_amount ?? 200,
        });
      }
    };

    loadCart();
    loadSiteSettings();
    window.addEventListener('cartUpdated', loadCart);
    return () => window.removeEventListener('cartUpdated', loadCart);
  }, []);

  const updateQuantity = (id: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    setPrevQuantities(quantities);
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const item = cart.find((item: CartItem) => item.id === id);
    if (item) {
      item.quantity = newQuantity;
      localStorage.setItem('cart', JSON.stringify(cart));
      window.dispatchEvent(new Event('cartUpdated'));
    }
    setQuantities((prev) => ({ ...prev, [id]: newQuantity }));
    setTimeout(() => setPrevQuantities((prev) => ({ ...prev, [id]: newQuantity })), 300);
  };

  const removeItem = (id: number) => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const filtered = cart.filter((item: CartItem) => item.id !== id);
    localStorage.setItem('cart', JSON.stringify(filtered));
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const { advance_payment_discount_enabled, advance_payment_discount_amount } = siteSettings;
  const discount = advance_payment_discount_enabled ? advance_payment_discount_amount : 0;
  const total = subtotal > 1000 && discount > 0 ? subtotal - discount : subtotal;

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <AnnouncementBar />
        <Navbar />
        <main className="max-w-7xl mx-auto px-6 py-20 text-center">
          <div className="mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-gray-300 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#111111] mb-4">Your Cart is Empty</h1>
          <p className="text-[#666666] mb-8">Looks like you have not added anything to your cart yet.</p>
          <Link href="/products" className="bg-[#111111] text-white px-8 py-3 rounded-full font-semibold text-sm hover:bg-[#333] transition-colors">
            Start Shopping
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <AnnouncementBar />
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-10">
        <h1 className="text-2xl font-bold text-[#111111] tracking-tight mb-8">
          Shopping Cart
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
          <div>
            <div className="bg-white border border-[#eee] rounded-[14px] overflow-hidden">
              <AnimatePresence>
                {cartItems.map((item) => (
                  <motion.div
                    key={`${item.id}-${JSON.stringify(item.selectedVariant || {})}`}
                    exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                    layout
                    className="flex gap-4 p-4 border-b border-[#eee] last:border-b-0"
                  >
                    <Link href={`/products/${item.slug}`} className="w-20 h-20 sm:w-24 sm:h-24 bg-[#f8f8f6] rounded-[10px] overflow-hidden flex-shrink-0">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">No Image</div>
                      )}
                    </Link>
                    <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
                      <div className="flex-1">
                        <Link href={`/products/${item.slug}`} className="font-bold text-[#111111] text-sm hover:text-[#f5c518] transition-colors line-clamp-2 mb-1 block">
                          {item.name}
                        </Link>
                        <p className="text-[#111111] font-bold text-sm mb-1 sm:mb-2">
                          Rs. {item.price.toLocaleString()}
                        </p>
                        {item.selectedVariant && Object.keys(item.selectedVariant).length > 0 && (
                          <p className="text-gray-500 text-xs mb-2">
                            {Object.entries(item.selectedVariant)
                              .map(([key, val]) => `${key}: ${val}`)
                              .join(', ')}
                          </p>
                        )}
                        <div className="flex items-center gap-2">
                          <div className="flex items-center border border-gray-200 rounded-[8px]">
                            <motion.button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="w-8 h-8 flex items-center justify-center text-[#111111] hover:bg-gray-50 text-sm"
                              whileTap={{ scale: 0.9 }}
                            >
                              <MinusIcon />
                            </motion.button>
                            <motion.span
                              className="w-10 text-center font-medium text-[#111111] text-sm"
                              key={quantities[item.id]}
                              initial={quantities[item.id] !== prevQuantities[item.id] ? { scale: 1.2 } : false}
                              animate={{ scale: 1 }}
                              transition={{ duration: 0.15 }}
                            >
                              {item.quantity}
                            </motion.span>
                            <motion.button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="w-8 h-8 flex items-center justify-center text-[#111111] hover:bg-gray-50 text-sm"
                              whileTap={{ scale: 0.9 }}
                            >
                              <PlusIcon />
                            </motion.button>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center sm:flex-col sm:items-end sm:justify-between gap-2 sm:gap-3 flex-shrink-0">
                        <p className="font-bold text-[#111111] text-sm sm:text-base">
                          Rs. {(item.price * item.quantity).toLocaleString()}
                        </p>
                        <button
                          type="button"
                          onClick={removeItem.bind(null, item.id)}
                          className="text-red-500 hover:text-red-700 active:scale-90 transition-all duration-150 p-2 touch-manipulation"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <div className="mt-4">
              <Link href="/products" className="text-[#666666] hover:text-[#111111] text-sm transition-colors">
                ← Continue Shopping
              </Link>
            </div>
          </div>

          <div>
            <div className="bg-white border border-[#eee] rounded-[14px] p-6 sticky top-24">
              <h2 className="font-bold text-[#111111] text-lg mb-6">Order Summary</h2>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#666666]">Subtotal</span>
                  <span className="font-medium text-[#111111]">Rs. {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#666666]">Delivery Fee</span>
                  <span className="font-medium text-green-600">Free</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[#666666]">Discount</span>
                    <span className="font-medium text-green-600">- Rs. {discount}</span>
                  </div>
                )}
                <div className="border-t border-[#eee] pt-4 flex justify-between">
                  <span className="font-bold text-[#111111]">Total</span>
                  <span className="font-bold text-[#111111]">Rs. {total.toLocaleString()}</span>
                </div>
              </div>
              {discount > 0 && (
                <p className="text-xs text-[#666666] mt-3 bg-[#f8f8f6] p-3 rounded-[8px]">
                  Rs. {discount} off applied for advance payment at checkout
                </p>
              )}
              <motion.button
                onClick={() => router.push('/checkout')}
                className="w-full bg-[#111111] text-white py-4 rounded-[10px] font-semibold text-sm hover:bg-[#333] transition-colors mt-6"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                Proceed to Checkout
              </motion.button>
              <Link href="/products" className="block text-center text-[#666666] hover:text-[#111111] text-sm transition-colors mt-4">
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}