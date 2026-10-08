'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { publicClient } from '@/lib/supabase';
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Field,
  IconAction,
  PageHeader,
  Sheet,
  Toggle,
  useAdminToast,
} from '@/components/admin/ui';
import { CardIcon, CheckIcon, GiftIcon, PencilIcon, PlusIcon, SparkleIcon, TrashIcon, UserIcon } from '@/components/store/icons';

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

type FormData = {
  store_name: string;
  whatsapp_number: string;
  announcement_bar_text: string;
  announcement_bar_active: boolean;
  announcement_text_white: string;
  announcement_text_gold: string;
  hero_title: string;
  hero_subtitle: string;
  advance_payment_discount_enabled: boolean;
  advance_payment_discount_amount: number;
};

const EMPTY_METHOD = { method_name: '', account_title: '', account_number: '', iban: '' };

export default function SettingsPage() {
  const notify = useAdminToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>({
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
  const [saved, setSaved] = useState<FormData | null>(null);

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [methodSheet, setMethodSheet] = useState(false);
  const [editingMethod, setEditingMethod] = useState<number | null>(null);
  const [methodForm, setMethodForm] = useState(EMPTY_METHOD);
  const [methodSaving, setMethodSaving] = useState(false);
  const [deletingMethod, setDeletingMethod] = useState<PaymentMethod | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const fetchPaymentMethods = async () => {
    const { data } = await publicClient.from('payment_methods').select('*').order('display_order', { ascending: true });
    if (data) setPaymentMethods(data as PaymentMethod[]);
  };

  useEffect(() => {
    const fetchSettings = async () => {
      const { data, error } = await publicClient.from('site_settings').select('*').eq('id', 1).single();
      if (error) notify(`Couldn’t load settings: ${error.message}`, 'error');
      if (data) {
        const s = data as SiteSettings;
        const loaded: FormData = {
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
        };
        setFormData(loaded);
        setSaved(loaded);
      }
      setLoading(false);
    };
    fetchSettings();
    fetchPaymentMethods();
  }, [notify]);

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) => setFormData((prev) => ({ ...prev, [key]: value }));
  const dirty = saved !== null && JSON.stringify(saved) !== JSON.stringify(formData);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await publicClient.from('site_settings').update(formData).eq('id', 1);
    setSaving(false);
    if (error) {
      notify(`Couldn’t save: ${error.message}`, 'error');
      return;
    }
    setSaved(formData);
    notify('Settings saved ✨');
  };

  const openMethod = (method: PaymentMethod | null) => {
    setEditingMethod(method?.id ?? null);
    setMethodForm(
      method
        ? { method_name: method.method_name, account_title: method.account_title, account_number: method.account_number, iban: method.iban ?? '' }
        : EMPTY_METHOD
    );
    setMethodSheet(true);
  };

  const handleSaveMethod = async () => {
    if (!methodForm.method_name.trim() || !methodForm.account_title.trim() || !methodForm.account_number.trim()) {
      notify('Please fill in method name, account title and account number', 'error');
      return;
    }
    const payload = {
      method_name: methodForm.method_name.trim(),
      account_title: methodForm.account_title.trim(),
      account_number: methodForm.account_number.trim(),
      iban: methodForm.iban.trim() || null,
    };
    setMethodSaving(true);
    const { error } = editingMethod
      ? await publicClient.from('payment_methods').update(payload).eq('id', editingMethod)
      : await publicClient.from('payment_methods').insert({ ...payload, display_order: paymentMethods.length, is_active: true });
    setMethodSaving(false);
    if (error) {
      notify(`Couldn’t save payment method: ${error.message}`, 'error');
      return;
    }
    notify(editingMethod ? 'Payment method updated' : 'Payment method added');
    setMethodSheet(false);
    fetchPaymentMethods();
  };

  const confirmDeleteMethod = async () => {
    if (!deletingMethod) return;
    setDeleteBusy(true);
    const { error } = await publicClient.from('payment_methods').delete().eq('id', deletingMethod.id);
    setDeleteBusy(false);
    setDeletingMethod(null);
    if (error) {
      notify(`Couldn’t delete: ${error.message}`, 'error');
      return;
    }
    setPaymentMethods((list) => list.filter((m) => m.id !== deletingMethod.id));
    notify('Payment method deleted');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-12 w-48 rounded-2xl" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton h-44 rounded-[1.75rem]" />
        ))}
      </div>
    );
  }

  return (
    <div className="pb-24">
      <PageHeader title="Settings" subtitle="Store details, homepage text and payments" />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Store information" description="How customers reach you" icon={UserIcon}>
          <div className="space-y-4">
            <Field label="Store name" hint="Shown in the admin; the storefront uses the Zestore.pk logo">
              <input className="admin-input" value={formData.store_name} onChange={(e) => set('store_name', e.target.value)} placeholder="Zestore.pk" />
            </Field>
            <Field label="WhatsApp number" hint="e.g. 03001234567 — used for every WhatsApp button on the store">
              <input className="admin-input" value={formData.whatsapp_number} onChange={(e) => set('whatsapp_number', e.target.value)} placeholder="03001234567" inputMode="tel" />
            </Field>
          </div>
        </Card>

        <Card title="Announcement bar" description="The scrolling strip at the very top" icon={SparkleIcon} delay={0.05}>
          <div className="space-y-4">
            <Field label="Announcement text">
              <input className="admin-input" value={formData.announcement_text_white} onChange={(e) => set('announcement_text_white', e.target.value)} placeholder="Free delivery on orders above" />
            </Field>
            <Field label="Highlight text" hint="Shown as a little badge after the main text">
              <input className="admin-input" value={formData.announcement_text_gold} onChange={(e) => set('announcement_text_gold', e.target.value)} placeholder="Rs. 3,000 ✨" />
            </Field>
            <Toggle checked={formData.announcement_bar_active} onChange={(v) => set('announcement_bar_active', v)} label="Show announcement bar" />
            <AnimatePresence>
              {formData.announcement_bar_active && (formData.announcement_text_white || formData.announcement_text_gold) && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-berry-500 via-berry-400 to-berry-500 py-2 text-[13px] font-bold text-white">
                    <SparkleIcon className="h-3.5 w-3.5 text-blush-200" />
                    {formData.announcement_text_white}
                    {formData.announcement_text_gold && <span className="rounded-full bg-white/20 px-2 py-0.5">{formData.announcement_text_gold}</span>}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Card>

        <Card title="Homepage hero" description="Leave empty to use the default text" icon={SparkleIcon} delay={0.1}>
          <div className="space-y-4">
            <Field label="Hero title">
              <input className="admin-input" value={formData.hero_title} onChange={(e) => set('hero_title', e.target.value)} placeholder="Cute tech that makes you smile" />
            </Field>
            <Field label="Hero subtitle">
              <textarea
                className="admin-input resize-none"
                rows={3}
                value={formData.hero_subtitle}
                onChange={(e) => set('hero_subtitle', e.target.value)}
                placeholder="Headphones, smartwatches, powerbanks & little gadgets you’ll actually love…"
              />
            </Field>
          </div>
        </Card>

        <Card title="Advance payment discount" description="Reward customers who pay before delivery" icon={GiftIcon} delay={0.15}>
          <div className="space-y-4">
            <Toggle
              checked={formData.advance_payment_discount_enabled}
              onChange={(v) => set('advance_payment_discount_enabled', v)}
              label="Give a discount for advance payment"
            />
            <AnimatePresence>
              {formData.advance_payment_discount_enabled && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <Field label="Discount amount (Rs.)">
                    <input
                      type="number"
                      className="admin-input"
                      value={formData.advance_payment_discount_amount}
                      onChange={(e) => set('advance_payment_discount_amount', Number(e.target.value))}
                    />
                  </Field>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Card>
      </div>

      <Card
        className="mt-4"
        title="Payment accounts"
        description="Shown to customers who choose advance payment"
        icon={CardIcon}
        delay={0.2}
        actions={
          <Button size="sm" icon={PlusIcon} onClick={() => openMethod(null)}>
            Add account
          </Button>
        }
      >
        {paymentMethods.length === 0 ? (
          <EmptyState emoji="💳" title="No payment accounts yet" text="Add JazzCash, Easypaisa or a bank account for advance payments." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence initial={false}>
              {paymentMethods.map((m, i) => (
                <motion.div
                  key={m.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05 } }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="group relative rounded-[22px] border-2 border-line bg-white p-4 transition-colors hover:border-blush-300"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-berry-400 to-berry-600 font-display font-semibold text-white">
                        {m.method_name.charAt(0).toUpperCase()}
                      </span>
                      <div>
                        <p className="font-extrabold text-ink">{m.method_name}</p>
                        <p className="text-xs font-semibold text-muted">{m.account_title}</p>
                      </div>
                    </div>
                    <div className="flex">
                      <IconAction icon={PencilIcon} label="Edit" tone="edit" onClick={() => openMethod(m)} />
                      <IconAction icon={TrashIcon} label="Delete" tone="danger" onClick={() => setDeletingMethod(m)} />
                    </div>
                  </div>
                  <p className="mt-3 font-mono text-sm font-bold tracking-wide text-ink">{m.account_number}</p>
                  {m.iban && <p className="truncate font-mono text-xs text-muted">{m.iban}</p>}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </Card>

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
              <Button variant="ghost" size="sm" onClick={() => saved && setFormData(saved)} disabled={saving}>
                Discard
              </Button>
              <Button size="sm" icon={CheckIcon} onClick={handleSave} loading={saving}>
                Save
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Sheet
        open={methodSheet}
        onClose={() => setMethodSheet(false)}
        title={editingMethod ? 'Edit payment account' : 'Add payment account'}
        subtitle="Customers send advance payments here"
        icon={CardIcon}
        onSubmit={handleSaveMethod}
        saving={methodSaving}
        submitLabel={editingMethod ? 'Save changes' : 'Add account'}
      >
        <div className="card-zs space-y-4 p-5">
          <Field label="Method" required>
            <input
              className="admin-input"
              value={methodForm.method_name}
              onChange={(e) => setMethodForm((p) => ({ ...p, method_name: e.target.value }))}
              placeholder="JazzCash, Easypaisa, Meezan Bank…"
              autoFocus
            />
          </Field>
          <Field label="Account title" required>
            <input className="admin-input" value={methodForm.account_title} onChange={(e) => setMethodForm((p) => ({ ...p, account_title: e.target.value }))} placeholder="Ayesha Khan" />
          </Field>
          <Field label="Account number" required>
            <input
              className="admin-input font-mono"
              value={methodForm.account_number}
              onChange={(e) => setMethodForm((p) => ({ ...p, account_number: e.target.value }))}
              placeholder="03001234567"
            />
          </Field>
          <Field label="IBAN" hint="Optional, for bank transfers">
            <input className="admin-input font-mono" value={methodForm.iban} onChange={(e) => setMethodForm((p) => ({ ...p, iban: e.target.value }))} placeholder="PK00XXXX0000000000000000" />
          </Field>
        </div>
      </Sheet>

      <ConfirmDialog
        open={!!deletingMethod}
        title={`Delete ${deletingMethod?.method_name}?`}
        message="Customers will no longer see this account at checkout."
        loading={deleteBusy}
        onConfirm={confirmDeleteMethod}
        onCancel={() => setDeletingMethod(null)}
      />
    </div>
  );
}
