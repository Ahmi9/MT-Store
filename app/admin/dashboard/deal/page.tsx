'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { publicClient } from '@/lib/supabase';
import { discountPercent, formatPrice } from '@/lib/cart';
import { DEAL_DEFAULTS, dealIsLive, pickDealProduct, withDealPrice, type DealSettings, type DealTimer } from '@/lib/deal';
import DealSpotlight from '@/components/store/DealSpotlight';
import { Button, Card, Field, FilterTabs, PageHeader, Pill, SearchInput, Toggle, useAdminToast } from '@/components/admin/ui';
import { CheckIcon, ClockIcon, EyeIcon, ImageIcon, PencilIcon, SparkleIcon, TagIcon } from '@/components/store/icons';

interface DealProductRow {
  id: string;
  name: string;
  slug: string;
  price: number;
  original_price: number | null;
  images: string[] | null;
  hasVariants: boolean;
}

interface Form {
  deal_enabled: boolean;
  deal_product_id: string; // '' = automatic
  deal_price: string; // '' = normal price
  deal_timer: DealTimer;
  deal_ends_at: string; // datetime-local value
  deal_badge: string;
  deal_title: string;
  deal_subtitle: string;
  deal_button_text: string;
  deal_image: string; // '' = first product photo
}

const EMPTY: Form = {
  deal_enabled: true,
  deal_product_id: '',
  deal_price: '',
  deal_timer: 'midnight',
  deal_ends_at: '',
  deal_badge: '',
  deal_title: '',
  deal_subtitle: '',
  deal_button_text: '',
  deal_image: '',
};

const TIMERS: { value: DealTimer; label: string }[] = [
  { value: 'midnight', label: 'Resets at midnight' },
  { value: 'until', label: 'Ends on a date' },
  { value: 'none', label: 'No countdown' },
];

// <input type="datetime-local"> works in local time without a zone
const toLocalInput = (iso: string | null | undefined) => {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
};

function toSettings(f: Form): DealSettings {
  return {
    deal_enabled: f.deal_enabled,
    deal_product_id: f.deal_product_id || null,
    deal_price: f.deal_product_id && f.deal_price.trim() ? Number(f.deal_price) : null,
    deal_timer: f.deal_timer,
    deal_ends_at: f.deal_timer === 'until' && f.deal_ends_at ? new Date(f.deal_ends_at).toISOString() : null,
    deal_badge: f.deal_badge.trim() || null,
    deal_title: f.deal_title.trim() || null,
    deal_subtitle: f.deal_subtitle.trim() || null,
    deal_button_text: f.deal_button_text.trim() || null,
    deal_image: f.deal_image.trim() || null,
  };
}

export default function DealPage() {
  const notify = useAdminToast();
  const [products, setProducts] = useState<DealProductRow[]>([]);
  const [form, setForm] = useState<Form>(EMPTY);
  const [saved, setSaved] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      const [settingsRes, productsRes, attrsRes] = await Promise.all([
        publicClient.from('site_settings').select('*').eq('id', 1).single(),
        publicClient.from('products').select('id, name, slug, price, original_price, images').eq('is_active', true).order('name'),
        publicClient.from('product_attributes').select('product_id'),
      ]);
      if (settingsRes.error) notify(`Couldn’t load the deal: ${settingsRes.error.message}`, 'error');
      const withOptions = new Set((attrsRes.data ?? []).map((a: { product_id: string }) => a.product_id));
      setProducts(
        ((productsRes.data ?? []) as Omit<DealProductRow, 'hasVariants'>[]).map((p) => ({
          ...p,
          price: Number(p.price),
          original_price: p.original_price ? Number(p.original_price) : null,
          hasVariants: withOptions.has(p.id),
        }))
      );
      const s = (settingsRes.data ?? {}) as DealSettings;
      const loaded: Form = {
        deal_enabled: s.deal_enabled ?? true,
        deal_product_id: s.deal_product_id ?? '',
        deal_price: s.deal_price != null ? String(Number(s.deal_price)) : '',
        deal_timer: s.deal_timer ?? 'midnight',
        deal_ends_at: toLocalInput(s.deal_ends_at),
        deal_badge: s.deal_badge ?? '',
        deal_title: s.deal_title ?? '',
        deal_subtitle: s.deal_subtitle ?? '',
        deal_button_text: s.deal_button_text ?? '',
        deal_image: s.deal_image ?? '',
      };
      setForm(loaded);
      setSaved(loaded);
      setLoading(false);
    })();
  }, [notify]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((prev) => ({ ...prev, [key]: value }));
  const dirty = saved !== null && JSON.stringify(saved) !== JSON.stringify(form);

  const settings = useMemo(() => toSettings(form), [form]);
  const picked = products.find((p) => p.id === form.deal_product_id) ?? null;
  // what the homepage shows right now with these settings
  const previewProduct = useMemo(() => {
    const p = pickDealProduct(products, { ...settings, deal_enabled: true, deal_timer: 'midnight' });
    return p ? withDealPrice(p, { ...settings, deal_enabled: true, deal_timer: 'midnight' }) : null;
  }, [products, settings]);
  const live = dealIsLive(settings) && !!previewProduct;
  const ended = form.deal_enabled && form.deal_timer === 'until' && !!form.deal_ends_at && !dealIsLive(settings);

  const visibleProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? products.filter((p) => p.name.toLowerCase().includes(q)) : products;
  }, [products, search]);

  const pickProduct = (id: string) => {
    // a new product starts with its own photo and normal price
    setForm((prev) => ({ ...prev, deal_product_id: id, deal_price: id === prev.deal_product_id ? prev.deal_price : '', deal_image: id === prev.deal_product_id ? prev.deal_image : '' }));
  };

  const handleSave = async () => {
    const dealPrice = form.deal_price.trim();
    if (picked && dealPrice) {
      const n = Number(dealPrice);
      if (!Number.isFinite(n) || n <= 0) return notify('Deal price must be a number above 0', 'error');
      if (n >= picked.price) return notify(`Deal price should be lower than the normal price (${formatPrice(picked.price)})`, 'error');
    }
    if (form.deal_image.trim() && !/^https:\/\/\S+$/i.test(form.deal_image.trim())) return notify('The image link must start with https://', 'error');
    if (form.deal_timer === 'until') {
      if (!form.deal_ends_at) return notify('Pick when the deal ends', 'error');
      if (new Date(form.deal_ends_at).getTime() <= Date.now()) return notify('The end time is already in the past', 'error');
    }
    setSaving(true);
    const { error } = await publicClient.from('site_settings').update(toSettings(form)).eq('id', 1);
    setSaving(false);
    if (error) {
      notify(
        /deal_/.test(error.message)
          ? 'The database isn’t ready for deals yet — run 20261009040000_deal_of_the_day.sql in Supabase first'
          : `Couldn’t save: ${error.message}`,
        'error'
      );
      return;
    }
    setSaved(form);
    notify('Deal saved ✨');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-12 w-64 rounded-2xl" />
        <div className="skeleton h-80 w-full rounded-[36px]" />
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="skeleton h-72 rounded-[1.75rem]" />
          <div className="skeleton h-72 rounded-[1.75rem]" />
        </div>
      </div>
    );
  }

  const off = picked && form.deal_price && Number(form.deal_price) > 0 ? discountPercent(Number(form.deal_price), Math.max(picked.original_price ?? 0, picked.price)) : 0;

  return (
    <div className="pb-24">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            Deal of the day
            {live ? (
              <Pill tone="green" dot>
                Live
              </Pill>
            ) : ended ? (
              <Pill tone="amber" dot>
                Ended
              </Pill>
            ) : (
              <Pill tone="neutral" dot>
                Hidden
              </Pill>
            )}
          </span>
        }
        subtitle="The big countdown card on the homepage"
      />

      {/* live preview */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-4 min-w-0">
        <div className="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-muted">
          <EyeIcon className="h-4 w-4" /> Live preview
        </div>
        <div className={`transition-opacity ${live ? '' : 'opacity-50 grayscale-[40%]'}`}>
          {previewProduct ? (
            <DealSpotlight product={previewProduct} settings={settings} preview />
          ) : (
            <div className="card-zs p-8 text-center font-bold text-muted">
              No product to show — pick one below{form.deal_product_id ? '' : ', or put a product on sale (original price higher than price)'}.
            </div>
          )}
        </div>
        {!live && previewProduct && (
          <p className="mt-2 text-center text-sm font-bold text-muted">
            {ended ? 'This deal has ended, so customers don’t see it.' : 'The card is turned off, so customers don’t see it.'}
          </p>
        )}
      </motion.div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 [&>*]:min-w-0">
        <Card title="Product & price" description="Which product is on deal" icon={TagIcon} delay={0.05}>
          <div className="space-y-4">
            <Toggle checked={form.deal_enabled} onChange={(v) => set('deal_enabled', v)} label="Show the deal on the homepage" />

            <div>
              <span className="admin-label">Product</span>
              <div className="mb-2">
                <SearchInput value={search} onChange={setSearch} placeholder="Search products…" />
              </div>
              <div className="max-h-72 space-y-1.5 overflow-y-auto rounded-2xl border border-line bg-blush-50/50 p-2">
                <ProductOption active={!form.deal_product_id} onClick={() => pickProduct('')} title="Automatic" text="Whichever product has the biggest discount" icon />
                {visibleProducts.map((p) => (
                  <ProductOption
                    key={p.id}
                    active={form.deal_product_id === p.id}
                    onClick={() => pickProduct(p.id)}
                    title={p.name}
                    text={`${formatPrice(p.price)}${p.original_price && p.original_price > p.price ? ` · was ${formatPrice(p.original_price)}` : ''}`}
                    image={p.images?.[0]}
                  />
                ))}
              </div>
            </div>

            <AnimatePresence initial={false}>
              {picked && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <Field
                    label="Deal price (Rs.)"
                    hint={
                      <>
                        Normal price {formatPrice(picked.price)}. Leave empty to keep it. Checkout charges the deal price only while the deal is live.
                        {picked.hasVariants && ' Options that have their own price keep that price.'}
                      </>
                    }
                  >
                    <div className="relative">
                      <input
                        type="number"
                        min={1}
                        inputMode="numeric"
                        className="admin-input pr-24"
                        value={form.deal_price}
                        onChange={(e) => set('deal_price', e.target.value)}
                        placeholder={String(picked.price)}
                      />
                      {off > 0 && <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-berry-500 px-2.5 py-1 text-xs font-extrabold text-white">{off}% off</span>}
                    </div>
                  </Field>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Card>

        <Card title="Countdown" description="When the deal ends" icon={ClockIcon} delay={0.1}>
          <div className="space-y-4">
            <FilterTabs id="deal-timer" tabs={TIMERS} value={form.deal_timer} onChange={(v) => set('deal_timer', v)} />
            <AnimatePresence mode="wait" initial={false}>
              <motion.p key={form.deal_timer} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-2xl bg-blush-50 p-4 text-sm font-semibold text-ink-soft">
                {form.deal_timer === 'midnight' && 'The countdown runs to midnight every day and starts again — the deal itself stays until you change it.'}
                {form.deal_timer === 'until' && 'The countdown runs to the time below. When it hits zero the card disappears and the normal price comes back by itself.'}
                {form.deal_timer === 'none' && 'No countdown on the card. The deal stays until you turn it off.'}
              </motion.p>
            </AnimatePresence>
            <AnimatePresence initial={false}>
              {form.deal_timer === 'until' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <Field label="Deal ends" required>
                    <input type="datetime-local" className="admin-input" value={form.deal_ends_at} onChange={(e) => set('deal_ends_at', e.target.value)} />
                  </Field>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Card>

        <Card title="Card text" description="Leave empty to use the defaults" icon={PencilIcon} delay={0.15}>
          <div className="space-y-4">
            <Field label="Badge">
              <input className="admin-input" maxLength={40} value={form.deal_badge} onChange={(e) => set('deal_badge', e.target.value)} placeholder={DEAL_DEFAULTS.badge} />
            </Field>
            <Field label="Title" hint="Empty = the product’s name">
              <input className="admin-input" maxLength={120} value={form.deal_title} onChange={(e) => set('deal_title', e.target.value)} placeholder={previewProduct?.name ?? 'Product name'} />
            </Field>
            <Field label="Short description" hint="Optional line under the title">
              <textarea
                className="admin-input resize-none"
                rows={2}
                maxLength={300}
                value={form.deal_subtitle}
                onChange={(e) => set('deal_subtitle', e.target.value)}
                placeholder="Today only — grab it before the timer runs out!"
              />
            </Field>
            <Field label="Button text" hint={previewProduct?.hasVariants ? 'This product has options, so the card shows “Choose options” instead' : undefined}>
              <input className="admin-input" maxLength={30} value={form.deal_button_text} onChange={(e) => set('deal_button_text', e.target.value)} placeholder={DEAL_DEFAULTS.button} />
            </Field>
          </div>
        </Card>

        <Card title="Picture" description="The photo on the right of the card" icon={ImageIcon} delay={0.2}>
          <div className="space-y-4">
            {previewProduct?.images && previewProduct.images.length > 0 ? (
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                {previewProduct.images.map((src, i) => {
                  const active = (form.deal_image || previewProduct.images![0]) === src;
                  return (
                    <motion.button
                      key={src}
                      type="button"
                      whileTap={{ scale: 0.93 }}
                      onClick={() => set('deal_image', i === 0 ? '' : src)}
                      className={`relative aspect-square overflow-hidden rounded-2xl border-[3px] transition-colors ${active ? 'border-berry-500' : 'border-transparent hover:border-blush-300'}`}
                    >
                      <img src={src} alt="" className="h-full w-full object-cover" />
                      {active && (
                        <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-berry-500 text-white">
                          <CheckIcon className="h-3 w-3" />
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm font-semibold text-muted">Pick a product to choose from its photos.</p>
            )}
            <Field label="Or use another image link" hint="Paste an https:// image address — empty = the photo picked above">
              <input
                className="admin-input"
                maxLength={1000}
                value={previewProduct?.images?.includes(form.deal_image) ? '' : form.deal_image}
                onChange={(e) => set('deal_image', e.target.value)}
                placeholder="https://…"
              />
            </Field>
          </div>
        </Card>
      </div>

      {/* sticky save bar, only when something changed */}
      <AnimatePresence>
        {dirty && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            className="fixed bottom-4 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 items-center justify-between gap-3 rounded-full border border-line bg-white/95 py-2 pl-5 pr-2 shadow-pop backdrop-blur lg:left-[calc(50%+9rem)]"
          >
            <p className="text-sm font-extrabold text-ink">You have unsaved changes</p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => saved && setForm(saved)} disabled={saving}>
                Discard
              </Button>
              <Button size="sm" icon={CheckIcon} onClick={handleSave} loading={saving}>
                Save
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProductOption({ active, onClick, title, text, image, icon }: { active: boolean; onClick: () => void; title: string; text: string; image?: string | null; icon?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl border-2 p-2 text-left transition-colors ${active ? 'border-berry-500 bg-white shadow-soft' : 'border-transparent hover:bg-white'}`}
    >
      <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-blush-100 text-berry-600">
        {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : icon ? <SparkleIcon className="h-5 w-5" /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-extrabold text-ink">{title}</span>
        <span className="block truncate text-xs font-semibold text-muted">{text}</span>
      </span>
      {active && (
        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-berry-500 text-white">
          <CheckIcon className="h-3.5 w-3.5" />
        </span>
      )}
    </button>
  );
}
