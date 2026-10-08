'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { getSiteSettings } from '@/lib/catalog';
import { formatPrice } from '@/lib/cart';
import { formatWhatsAppDisplay, formatWhatsAppLink } from '@/lib/utils';
import PageHero from '@/components/store/PageHero';
import { CheckIcon, GiftIcon, MapPinIcon, PackageIcon, SearchIcon, TruckIcon, WhatsAppIcon, XIcon } from '@/components/store/icons';

interface TrackedOrder {
  order_number: string;
  customer_name: string;
  customer_city: string;
  status: string;
  total: number;
  created_at: string;
  tracking_number: string | null;
}

const FLOW = [
  { key: 'pending', label: 'Order placed', icon: GiftIcon },
  { key: 'confirmed', label: 'Confirmed', icon: CheckIcon },
  { key: 'shipped', label: 'On the way', icon: TruckIcon },
  { key: 'delivered', label: 'Delivered', icon: MapPinIcon },
];

const digits = (s: string) => s.replace(/\D/g, '').slice(-10);

export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState<string | null>(null);
  const [result, setResult] = useState<TrackedOrder | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'notfound' | 'limited'>('idle');

  useEffect(() => {
    getSiteSettings().then((s) => setWhatsapp(s?.whatsapp_number ?? null));
  }, []);

  const track = async (e: React.FormEvent) => {
    e.preventDefault();
    const number = orderNumber.trim().replace(/^#/, '');
    if (!number || digits(phone).length < 10) return;
    setStatus('loading');
    setResult(null);
    // the server checks the phone number and only returns tracking details
    const res = await fetch('/api/orders/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_number: number, phone }),
    });
    if (res.ok) {
      setResult((await res.json()) as TrackedOrder);
      setStatus('idle');
    } else {
      setStatus(res.status === 429 ? 'limited' : 'notfound');
    }
  };

  const stepIndex = result ? FLOW.findIndex((f) => f.key === result.status) : -1;
  const cancelled = result?.status === 'cancelled';

  return (
    <div>
      <PageHero eyebrow="Where’s my parcel?" title="Track your order" subtitle="Enter your order number and the phone number you ordered with." />

      <div className="container-zs max-w-2xl pb-10">
        <motion.form
          onSubmit={track}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="card-zs relative -mt-6 grid gap-3 p-4 shadow-pop md:grid-cols-[1fr_1fr_auto] md:p-5"
        >
          <input value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="Order number" className="input-zs" required />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (0300…)" inputMode="tel" className="input-zs" required />
          <button type="submit" disabled={status === 'loading'} className="btn-primary px-6 py-3.5">
            {status === 'loading' ? <span className="h-5 w-5 animate-spin rounded-full border-[3px] border-white/40 border-t-white" /> : <SearchIcon className="h-5 w-5" />}
            Track
          </button>
        </motion.form>

        <AnimatePresence mode="wait">
          {status === 'limited' && (
            <motion.p key="lim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-6 rounded-[24px] bg-blush-100 p-5 text-center font-bold text-berry-700">
              Too many tries — please wait a few minutes and try again.
            </motion.p>
          )}
          {status === 'notfound' && (
            <motion.div
              key="nf"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0, x: [0, -8, 8, -4, 0] }}
              exit={{ opacity: 0 }}
              className="mt-6 rounded-[24px] border-2 border-berry-400 bg-blush-100 p-5 text-center"
            >
              <p className="font-display text-xl font-semibold text-ink">Hmm, we couldn’t find that order</p>
              <p className="mt-1 text-sm font-semibold text-ink-soft">Check the order number and use the same phone number you checked out with.</p>
            </motion.div>
          )}

          {result && (
            <motion.div key={result.order_number} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="card-zs mt-6 p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-muted">Order #{result.order_number}</p>
                  <p className="mt-1 font-display text-2xl font-semibold text-ink">Hi {result.customer_name.split(' ')[0]} 👋</p>
                  <p className="text-sm font-semibold text-muted">
                    Placed {new Date(result.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })} · {formatPrice(Number(result.total))} · {result.customer_city}
                  </p>
                </div>
                <span className={`chip ${cancelled ? 'bg-ink text-white' : 'bg-berry-500 text-white'} capitalize`}>{result.status}</span>
              </div>

              {cancelled ? (
                <div className="mt-6 flex items-center gap-3 rounded-2xl bg-blush-50 p-4">
                  <XIcon className="h-6 w-6 text-berry-600" />
                  <p className="font-semibold text-ink-soft">This order was cancelled. Message us on WhatsApp if that’s unexpected.</p>
                </div>
              ) : (
                <div className="mt-8 flex items-start">
                  {FLOW.map((s, i) => {
                    const done = i <= stepIndex;
                    return (
                      <div key={s.key} className="relative flex flex-1 flex-col items-center text-center">
                        {i < FLOW.length - 1 && (
                          <div className="absolute left-1/2 top-5 h-1 w-full overflow-hidden bg-blush-100">
                            <motion.div initial={{ width: 0 }} animate={{ width: i < stepIndex ? '100%' : 0 }} transition={{ delay: 0.2 + i * 0.25, duration: 0.4 }} className="h-full bg-berry-500" />
                          </div>
                        )}
                        <motion.span
                          initial={{ scale: 0.5 }}
                          animate={{ scale: i === stepIndex ? [1, 1.15, 1] : 1 }}
                          transition={i === stepIndex ? { duration: 1.6, repeat: Infinity } : { delay: i * 0.1 }}
                          className={`relative flex h-10 w-10 items-center justify-center rounded-full ${done ? 'bg-berry-500 text-white shadow-soft' : 'bg-blush-100 text-muted'}`}
                        >
                          <s.icon className="h-5 w-5" />
                        </motion.span>
                        <span className={`mt-2 text-[11px] font-extrabold md:text-xs ${done ? 'text-ink' : 'text-muted'}`}>{s.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {result.tracking_number && (
                <p className="mt-6 rounded-2xl bg-lilac/60 p-4 text-sm font-bold text-ink-soft">
                  Courier tracking number: <span className="font-mono text-ink">{result.tracking_number}</span>
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          {[
            { icon: GiftIcon, title: 'Place your order', text: 'You get an order number right after checkout' },
            { icon: PackageIcon, title: 'We pack it', text: 'Confirmed orders ship within 1–2 working days' },
            { icon: TruckIcon, title: 'It’s on its way', text: 'Delivered to your door, anywhere in Pakistan' },
          ].map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="rounded-[24px] bg-white p-5 text-center"
            >
              <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blush-100 text-berry-600">
                <s.icon className="h-6 w-6" />
              </span>
              <p className="font-display text-lg font-semibold text-ink">{s.title}</p>
              <p className="mt-1 text-sm font-semibold text-muted">{s.text}</p>
            </motion.div>
          ))}
        </div>

        {whatsapp && (
          <a
            href={formatWhatsAppLink(whatsapp)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 flex items-center gap-4 rounded-[24px] bg-[#e7f9ee] p-5 transition-transform hover:-translate-y-0.5"
          >
            <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white">
              <WhatsAppIcon className="h-6 w-6" />
            </span>
            <span className="flex-1">
              <span className="block font-extrabold text-ink">Need help with an order?</span>
              <span className="block text-sm font-semibold text-ink-soft">Message us at {formatWhatsAppDisplay(whatsapp)}</span>
            </span>
          </a>
        )}

        <p className="mt-6 text-center text-sm font-semibold text-muted">
          Lost your order number? It’s on your confirmation page — or just <Link href="/contact" className="text-berry-600 underline">contact us</Link>.
        </p>
      </div>
    </div>
  );
}
