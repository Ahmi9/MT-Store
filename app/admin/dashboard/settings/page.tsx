'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { publicClient } from '@/lib/supabase';

interface SiteSettings {
  id: number;
  store_name: string | null;
  whatsapp_number: string | null;
  announcement_bar_text: string | null;
  announcement_bar_active: boolean;
  announcement_text_white: string | null;
  announcement_text_gold: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  advance_payment_discount_enabled: boolean;
  advance_payment_discount_amount: number;
}

interface PaymentMethod {
  id: number;
  method_name: string;
  account_title: string;
  account_number: string;
  iban: string | null;
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

const [formData, setFormData] = useState({
    store_name: '',
    whatsapp_number: '',
    announcement_bar_text: '',
    announcement_bar_active: false,
    announcement_text_white: '',
    announcement_text_gold: '',
    hero_title: '',
    hero_subtitle: '',
    advance_payment_discount_enabled: false,
    advance_payment_discount_amount: 200,
  });

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentFormData, setPaymentFormData] = useState({
    method_name: '',
    account_title: '',
    account_number: '',
    iban: '',
  });

  const fetchPaymentMethods = async () => {
    const { data } = await publicClient
      .from('payment_methods')
      .select('*')
      .order('display_order', { ascending: true });
    if (data) setPaymentMethods(data as PaymentMethod[]);
  };

  useEffect(() => {
    const fetchSettings = async () => {
      const { data, error } = await publicClient
        .from('site_settings')
        .select('*')
        .eq('id', 1)
        .single();

      if (error) {
        console.error('Error fetching settings:', error);
      }

      if (data) {
        const s = data as SiteSettings;
        setFormData({
          store_name: s.store_name ?? '',
          whatsapp_number: s.whatsapp_number ?? '',
          announcement_bar_text: s.announcement_bar_text ?? '',
          announcement_bar_active: s.announcement_bar_active ?? false,
          announcement_text_white: s.announcement_text_white ?? '',
          announcement_text_gold: s.announcement_text_gold ?? '',
          hero_title: s.hero_title ?? '',
          hero_subtitle: s.hero_subtitle ?? '',
          advance_payment_discount_enabled: s.advance_payment_discount_enabled ?? false,
          advance_payment_discount_amount: s.advance_payment_discount_amount ?? 200,
        });
      }

      setLoading(false);
    };

    fetchSettings();
    fetchPaymentMethods();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    console.log('Form updated:', name, '=', type === 'checkbox' ? checked : value);
  };

  const handlePaymentFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPaymentFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddPaymentMethod = () => {
    setPaymentFormData({ method_name: '', account_title: '', account_number: '', iban: '' });
    setShowPaymentForm(true);
  };

  const handleCancelPaymentForm = () => {
    setShowPaymentForm(false);
    setPaymentFormData({ method_name: '', account_title: '', account_number: '', iban: '' });
  };

  const handleSavePaymentMethod = async () => {
    if (!paymentFormData.method_name || !paymentFormData.account_title || !paymentFormData.account_number) {
      alert('Please fill in Method Name, Account Title, and Account Number');
      return;
    }

    const { error } = await publicClient
      .from('payment_methods')
      .insert({
        method_name: paymentFormData.method_name,
        account_title: paymentFormData.account_title,
        account_number: paymentFormData.account_number,
        iban: paymentFormData.iban || null,
        display_order: 0,
        is_active: true,
      });

    if (error) {
      alert('Error saving payment method: ' + error.message);
      return;
    }

    setShowPaymentForm(false);
    setPaymentFormData({ method_name: '', account_title: '', account_number: '', iban: '' });
    fetchPaymentMethods();
  };

  const handleDeletePaymentMethod = async (id: number) => {
    if (!confirm('Are you sure you want to delete this payment method?')) return;

    const { error } = await publicClient.from('payment_methods').delete().eq('id', id);
    if (!error) {
      setPaymentMethods(paymentMethods.filter((m) => m.id !== id));
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage('');

    console.log('Saving with data:', {
      store_name: formData.store_name,
      whatsapp_number: formData.whatsapp_number,
      announcement_bar_text: formData.announcement_bar_text,
      announcement_bar_active: formData.announcement_bar_active,
      announcement_text_white: formData.announcement_text_white,
      announcement_text_gold: formData.announcement_text_gold,
      hero_title: formData.hero_title,
      hero_subtitle: formData.hero_subtitle,
      advance_payment_discount_enabled: formData.advance_payment_discount_enabled,
      advance_payment_discount_amount: formData.advance_payment_discount_amount,
    });

    const { error } = await publicClient
      .from('site_settings')
      .update({
        store_name: formData.store_name,
        whatsapp_number: formData.whatsapp_number,
        announcement_bar_text: formData.announcement_bar_text,
        announcement_bar_active: formData.announcement_bar_active,
        announcement_text_white: formData.announcement_text_white,
        announcement_text_gold: formData.announcement_text_gold,
        hero_title: formData.hero_title,
        hero_subtitle: formData.hero_subtitle,
        advance_payment_discount_enabled: formData.advance_payment_discount_enabled,
        advance_payment_discount_amount: formData.advance_payment_discount_amount,
      })
      .eq('id', 1);

    console.log('Save result:', error);

    if (error) {
      setMessage('Error: ' + error.message);
    } else {
      setMessage('Settings saved successfully!');
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="text-gray-400">Loading...</div>
    );
  }

  return (
    <div className="max-w-3xl">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-bold text-white mb-8"
      >
        Settings
      </motion.h1>

      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`px-4 py-3 rounded-lg mb-6 ${message.startsWith('Error') ? 'bg-red-900/50 border border-red-700 text-red-300' : 'bg-green-900/50 border border-green-700 text-green-300'}`}
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-6">
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-bold text-white mb-6">Store Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Store Name
              </label>
              <input
                type="text"
                name="store_name"
                value={formData.store_name}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="MT Store"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                WhatsApp Number
              </label>
              <input
                type="text"
                name="whatsapp_number"
                value={formData.whatsapp_number}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="3083403662"
              />
              <p className="text-gray-500 text-xs mt-2">
                Enter 10 digit number without leading 0, e.g. 3083403662
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-bold text-white mb-6">Announcement Bar</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Announcement Text (White)
              </label>
              <input
                type="text"
                name="announcement_text_white"
                value={formData.announcement_text_white}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Free delivery on orders above"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Announcement Text (Gold/Highlight)
              </label>
              <input
                type="text"
                name="announcement_text_gold"
                value={formData.announcement_text_gold}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Rs. 1000!"
              />
              <p className="text-gray-500 text-xs mt-2">
                This part will be shown in gold/yellow color after the white text
              </p>
            </div>

            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="announcement_bar_active"
                  checked={formData.announcement_bar_active}
                  onChange={handleChange}
                  className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-300">Announcement Bar Active</span>
              </label>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-bold text-white mb-6">Homepage Hero</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Hero Title
              </label>
              <input
                type="text"
                name="hero_title"
                value={formData.hero_title}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Premium Electronics"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Hero Subtitle
              </label>
              <input
                type="text"
                name="hero_subtitle"
                value={formData.hero_subtitle}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Discover the latest gadgets and accessories"
              />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-bold text-white mb-6">Payment Information</h2>

          <div className="mb-6">
            <h3 className="text-md font-semibold text-white mb-4">Advance Payment Discount</h3>
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="advance_payment_discount_enabled"
                    checked={formData.advance_payment_discount_enabled}
                    onChange={handleChange}
                    className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-300">Enable Advance Payment Discount</span>
                </label>
              </div>
              {formData.advance_payment_discount_enabled && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Discount Amount (Rs.)
                  </label>
                  <input
                    type="number"
                    name="advance_payment_discount_amount"
                    value={formData.advance_payment_discount_amount}
                    onChange={handleChange}
                    min="1"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="200"
                  />
                  <p className="text-gray-500 text-xs mt-2">
                    Customers who choose Advance Payment at checkout will save this amount
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-gray-700 pt-6 mt-6">
            <h3 className="text-md font-semibold text-white mb-4">Payment Methods</h3>

            {paymentMethods.length > 0 && (
              <div className="space-y-3 mb-4">
                {paymentMethods.map((method) => (
                  <div key={method.id} className="flex items-center justify-between bg-gray-700 rounded-lg px-4 py-3">
                    <div>
                      <span className="text-white font-medium">{method.method_name}</span>
                      <span className="text-gray-400 mx-2">|</span>
                      <span className="text-gray-300">{method.account_title}</span>
                      <span className="text-gray-400 mx-2">|</span>
                      <span className="text-gray-300 font-mono text-sm">{method.account_number}</span>
                      {method.iban && (
                        <>
                          <span className="text-gray-400 mx-2">|</span>
                          <span className="text-gray-500 font-mono text-xs">{method.iban}</span>
                        </>
                      )}
                    </div>
                    <motion.button
                      onClick={() => handleDeletePaymentMethod(method.id)}
                      whileTap={{ scale: 0.95 }}
                      className="text-red-400 hover:text-red-300 p-1"
                      title="Delete"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </motion.button>
                  </div>
                ))}
              </div>
            )}

            {paymentMethods.length === 0 && !showPaymentForm && (
              <p className="text-gray-500 text-sm mb-4">No payment methods added yet.</p>
            )}

            {showPaymentForm ? (
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Bank/Method Name *
                    </label>
                    <input
                      type="text"
                      name="method_name"
                      value={paymentFormData.method_name}
                      onChange={handlePaymentFormChange}
                      placeholder="JazzCash"
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Account Title *
                    </label>
                    <input
                      type="text"
                      name="account_title"
                      value={paymentFormData.account_title}
                      onChange={handlePaymentFormChange}
                      placeholder="Hamza Kashif"
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Account Number *
                    </label>
                    <input
                      type="text"
                      name="account_number"
                      value={paymentFormData.account_number}
                      onChange={handlePaymentFormChange}
                      placeholder="0339-5002028"
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      IBAN (Optional)
                    </label>
                    <input
                      type="text"
                      name="iban"
                      value={paymentFormData.iban}
                      onChange={handlePaymentFormChange}
                      placeholder="PK10FAYS3412301000001037"
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <motion.button
                    onClick={handleSavePaymentMethod}
                    whileTap={{ scale: 0.97 }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Done
                  </motion.button>
                  <motion.button
                    onClick={handleCancelPaymentForm}
                    whileTap={{ scale: 0.97 }}
                    className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Cancel
                  </motion.button>
                </div>
              </div>
            ) : (
              <motion.button
                onClick={handleAddPaymentMethod}
                whileTap={{ scale: 0.97 }}
                className="text-blue-400 hover:text-blue-300 text-sm font-medium"
              >
                + Add Payment Method
              </motion.button>
            )}
          </div>
        </div>

        <motion.button
          onClick={handleSave}
          disabled={loading}
          whileTap={loading ? {} : { scale: 0.97 }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </motion.button>
      </div>
    </div>
  );
}
