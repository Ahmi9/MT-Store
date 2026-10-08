'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { publicClient } from '@/lib/supabase';
import {
  Button,
  ConfirmDialog,
  EmptyState,
  FilterTabs,
  Field,
  IconAction,
  PageHeader,
  Pill,
  Row,
  RowActions,
  SearchInput,
  Sheet,
  Table,
  TableCard,
  TableSkeleton,
  Td,
  Th,
  Toggle,
  useAdminToast,
} from '@/components/admin/ui';
import { GiftIcon, PencilIcon, PlusIcon, TrashIcon } from '@/components/store/icons';

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
  created_at: string;
}

interface CouponFormData {
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number;
  max_uses: number | null;
  expiry_date: string;
  is_active: boolean;
}

type Filter = 'all' | 'active' | 'expired' | 'off';

const EMPTY_FORM: CouponFormData = {
  code: '',
  discount_type: 'percentage',
  discount_value: 10,
  min_order_amount: 0,
  max_uses: null,
  expiry_date: '',
  is_active: true,
};

const isExpired = (c: Coupon) => !!c.expiry_date && new Date(c.expiry_date) < new Date();
const isUsedUp = (c: Coupon) => c.max_uses !== null && c.used_count >= c.max_uses;

export default function CouponsPage() {
  const notify = useAdminToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<CouponFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Coupon | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const fetchCoupons = async () => {
    const { data } = await publicClient.from('coupons').select('*').order('created_at', { ascending: false });
    if (data) setCoupons(data as Coupon[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleOpenAdd = () => {
    setFormData(EMPTY_FORM);
    setEditingId(null);
    setSheetOpen(true);
  };

  const handleOpenEdit = (coupon: Coupon) => {
    setFormData({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      min_order_amount: coupon.min_order_amount,
      max_uses: coupon.max_uses,
      expiry_date: coupon.expiry_date ? coupon.expiry_date.split('T')[0] : '',
      is_active: coupon.is_active,
    });
    setEditingId(coupon.id);
    setSheetOpen(true);
  };

  const handleSave = async () => {
    if (!formData.code.trim()) {
      notify('Please enter a coupon code', 'error');
      return;
    }
    if (formData.discount_type === 'percentage' && (formData.discount_value < 1 || formData.discount_value > 100)) {
      notify('Percentage discount must be between 1 and 100', 'error');
      return;
    }
    if (formData.discount_value <= 0) {
      notify('Discount value must be greater than 0', 'error');
      return;
    }

    const payload = {
      code: formData.code.trim().toUpperCase(),
      discount_type: formData.discount_type,
      discount_value: formData.discount_value,
      min_order_amount: formData.min_order_amount || 0,
      max_uses: formData.max_uses || null,
      expiry_date: formData.expiry_date || null,
      is_active: formData.is_active,
    };

    setSaving(true);
    const { error } = editingId
      ? await publicClient.from('coupons').update(payload).eq('id', editingId)
      : await publicClient.from('coupons').insert(payload);
    setSaving(false);

    if (error) {
      notify(`Couldn’t save coupon: ${error.message}`, 'error');
      return;
    }
    notify(editingId ? 'Coupon updated' : `Coupon ${payload.code} created 🎉`);
    setSheetOpen(false);
    fetchCoupons();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    const { error } = await publicClient.from('coupons').delete().eq('id', deleting.id);
    setDeleteBusy(false);
    setDeleting(null);
    if (error) {
      notify(`Couldn’t delete: ${error.message}`, 'error');
      return;
    }
    notify('Coupon deleted');
    fetchCoupons();
  };

  const handleToggleActive = async (coupon: Coupon) => {
    setCoupons((list) => list.map((c) => (c.id === coupon.id ? { ...c, is_active: !c.is_active } : c)));
    const { error } = await publicClient.from('coupons').update({ is_active: !coupon.is_active }).eq('id', coupon.id);
    if (error) {
      notify(`Couldn’t update: ${error.message}`, 'error');
      fetchCoupons();
    }
  };

  const formatDiscount = (c: Pick<Coupon, 'discount_type' | 'discount_value'>) =>
    c.discount_type === 'percentage' ? `${c.discount_value}% off` : `Rs. ${Number(c.discount_value).toLocaleString()} off`;

  const counts = {
    all: coupons.length,
    active: coupons.filter((c) => c.is_active && !isExpired(c) && !isUsedUp(c)).length,
    expired: coupons.filter((c) => isExpired(c) || isUsedUp(c)).length,
    off: coupons.filter((c) => !c.is_active).length,
  };

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return coupons.filter((c) => {
      if (q && !c.code.toLowerCase().includes(q)) return false;
      if (filter === 'active') return c.is_active && !isExpired(c) && !isUsedUp(c);
      if (filter === 'expired') return isExpired(c) || isUsedUp(c);
      if (filter === 'off') return !c.is_active;
      return true;
    });
  }, [coupons, search, filter]);

  return (
    <div>
      <PageHeader
        title="Coupons"
        subtitle={`${counts.active} live coupon${counts.active === 1 ? '' : 's'}`}
        actions={
          <Button icon={PlusIcon} onClick={handleOpenAdd}>
            Add coupon
          </Button>
        }
      />

      {loading ? (
        <TableSkeleton />
      ) : (
        <TableCard
          toolbar={
            <>
              <FilterTabs
                id="coupons"
                value={filter}
                onChange={setFilter}
                tabs={[
                  { value: 'all', label: 'All', count: counts.all },
                  { value: 'active', label: 'Live', count: counts.active },
                  { value: 'expired', label: 'Expired / used up', count: counts.expired },
                  { value: 'off', label: 'Turned off', count: counts.off },
                ]}
              />
              <SearchInput value={search} onChange={setSearch} placeholder="Search codes…" />
            </>
          }
        >
          {coupons.length === 0 ? (
            <EmptyState
              emoji="🎟️"
              title="No coupons yet"
              text="Create a code like WELCOME10 to treat new customers."
              action={
                <Button icon={PlusIcon} onClick={handleOpenAdd}>
                  Create a coupon
                </Button>
              }
            />
          ) : visible.length === 0 ? (
            <EmptyState emoji="🔍" title="No matches" text="Try another filter or search." />
          ) : (
            <Table>
              <thead>
                <tr className="border-b border-line bg-blush-50/60">
                  <Th>Code</Th>
                  <Th>Discount</Th>
                  <Th>Min order</Th>
                  <Th>Used</Th>
                  <Th>Expires</Th>
                  <Th>Active</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {visible.map((coupon, index) => {
                    const expired = isExpired(coupon);
                    const usedUp = isUsedUp(coupon);
                    const usage = coupon.max_uses ? Math.min(100, (coupon.used_count / coupon.max_uses) * 100) : 0;
                    return (
                      <Row key={coupon.id} index={index}>
                        <Td>
                          <span className="inline-flex items-center rounded-xl border-2 border-dashed border-berry-400 bg-blush-50 px-3 py-1 font-mono text-sm font-extrabold tracking-wider text-berry-700">
                            {coupon.code}
                          </span>
                        </Td>
                        <Td className="font-extrabold text-ink">{formatDiscount(coupon)}</Td>
                        <Td>{coupon.min_order_amount ? `Rs. ${Number(coupon.min_order_amount).toLocaleString()}` : '—'}</Td>
                        <Td>
                          <div className="w-24">
                            <p className="text-xs font-bold text-ink-soft">
                              {coupon.used_count} / {coupon.max_uses ?? '∞'}
                            </p>
                            {coupon.max_uses !== null && (
                              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-blush-100">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${usage}%` }}
                                  transition={{ duration: 0.8, delay: 0.2 }}
                                  className={`h-full rounded-full ${usedUp ? 'bg-rose-400' : 'bg-berry-400'}`}
                                />
                              </div>
                            )}
                          </div>
                        </Td>
                        <Td>
                          {coupon.expiry_date ? (
                            <Pill tone={expired ? 'rose' : 'neutral'}>
                              {expired ? 'Expired ' : ''}
                              {new Date(coupon.expiry_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </Pill>
                          ) : (
                            <span className="text-muted">Never</span>
                          )}
                        </Td>
                        <Td>
                          <Toggle checked={coupon.is_active} onChange={() => handleToggleActive(coupon)} />
                        </Td>
                        <Td align="right">
                          <RowActions>
                            <IconAction icon={PencilIcon} label="Edit" tone="edit" onClick={() => handleOpenEdit(coupon)} />
                            <IconAction icon={TrashIcon} label="Delete" tone="danger" onClick={() => setDeleting(coupon)} />
                          </RowActions>
                        </Td>
                      </Row>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </Table>
          )}
        </TableCard>
      )}

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editingId ? 'Edit coupon' : 'New coupon'}
        subtitle={editingId ? formData.code : 'Customers enter this code at checkout'}
        icon={GiftIcon}
        onSubmit={handleSave}
        saving={saving}
        submitLabel={editingId ? 'Save changes' : 'Create coupon'}
      >
        {/* live preview */}
        <motion.div layout className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-berry-400 to-berry-600 p-5 text-white shadow-soft">
          <span className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-blush-50" />
          <span className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-blush-50" />
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-white/70">Preview</p>
          <p className="mt-1 font-mono text-2xl font-extrabold tracking-widest">{formData.code || 'CODE'}</p>
          <p className="font-display text-lg font-semibold">{formatDiscount(formData)}</p>
          <p className="text-xs font-semibold text-white/80">
            {formData.min_order_amount ? `On orders over Rs. ${formData.min_order_amount.toLocaleString()}` : 'No minimum order'}
            {formData.expiry_date ? ` · until ${new Date(formData.expiry_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}` : ''}
          </p>
        </motion.div>

        <div className="card-zs space-y-4 p-5">
          <Field label="Coupon code" required>
            <input
              className="admin-input font-mono uppercase tracking-wider"
              value={formData.code}
              onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
              placeholder="SUMMER20"
              autoFocus
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Discount type">
              <select
                className="admin-input"
                value={formData.discount_type}
                onChange={(e) => setFormData((prev) => ({ ...prev, discount_type: e.target.value as 'percentage' | 'fixed' }))}
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed amount (Rs.)</option>
              </select>
            </Field>
            <Field label={formData.discount_type === 'percentage' ? 'Discount (%)' : 'Discount (Rs.)'} required>
              <input
                type="number"
                className="admin-input"
                value={formData.discount_value}
                onChange={(e) => setFormData((prev) => ({ ...prev, discount_value: Number(e.target.value) }))}
              />
            </Field>
            <Field label="Minimum order (Rs.)">
              <input
                type="number"
                className="admin-input"
                value={formData.min_order_amount}
                onChange={(e) => setFormData((prev) => ({ ...prev, min_order_amount: Number(e.target.value) }))}
                placeholder="0"
              />
            </Field>
            <Field label="Max uses" hint="Leave empty for unlimited">
              <input
                type="number"
                className="admin-input"
                value={formData.max_uses ?? ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, max_uses: e.target.value ? Number(e.target.value) : null }))}
                placeholder="∞"
              />
            </Field>
            <Field label="Expiry date" hint="Leave empty to never expire" className="sm:col-span-2">
              <input
                type="date"
                className="admin-input"
                value={formData.expiry_date}
                onChange={(e) => setFormData((prev) => ({ ...prev, expiry_date: e.target.value }))}
              />
            </Field>
          </div>
        </div>
        <Toggle
          checked={formData.is_active}
          onChange={(v) => setFormData((prev) => ({ ...prev, is_active: v }))}
          label="Active"
          description="Turned-off coupons can’t be used at checkout"
        />
      </Sheet>

      <ConfirmDialog
        open={!!deleting}
        title={`Delete ${deleting?.code}?`}
        message="Customers won’t be able to use this code any more. This can’t be undone."
        loading={deleteBusy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
