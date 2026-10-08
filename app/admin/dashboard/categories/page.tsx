'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { publicClient } from '@/lib/supabase';
import {
  Button,
  ConfirmDialog,
  EmptyState,
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
import { PencilIcon, PlusIcon, TagIcon, TrashIcon } from '@/components/store/icons';

interface Category {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  display_order: number;
  is_active: boolean;
}

interface CategoryFormData {
  name: string;
  slug: string;
  parent_id: string | null;
  display_order: number;
  is_active: boolean;
}

const EMPTY_FORM: CategoryFormData = { name: '', slug: '', parent_id: null, display_order: 0, is_active: true };

const generateSlug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export default function CategoriesPage() {
  const notify = useAdminToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const fetchCategories = async () => {
    const [{ data }, { data: products }] = await Promise.all([
      publicClient.from('categories').select('*').order('display_order', { ascending: true }),
      publicClient.from('products').select('category_id'),
    ]);
    if (data) setCategories(data as Category[]);
    const counts: Record<string, number> = {};
    for (const p of (products ?? []) as { category_id: string | null }[]) {
      if (p.category_id) counts[p.category_id] = (counts[p.category_id] ?? 0) + 1;
    }
    setProductCounts(counts);
    setLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openSheet = (data: CategoryFormData, id: string | null) => {
    setFormData(data);
    setEditingId(id);
    setSheetOpen(true);
  };

  const handleOpenEdit = (category: Category) =>
    openSheet(
      {
        name: category.name,
        slug: category.slug,
        parent_id: category.parent_id,
        display_order: category.display_order,
        is_active: category.is_active,
      },
      category.id
    );

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.slug.trim()) {
      notify('Please fill in name and slug', 'error');
      return;
    }
    setSaving(true);
    const payload = {
      name: formData.name.trim(),
      slug: formData.slug.trim(),
      parent_id: formData.parent_id,
      display_order: formData.display_order,
      is_active: formData.is_active,
    };
    const { error } = editingId
      ? await publicClient.from('categories').update(payload).eq('id', editingId)
      : await publicClient.from('categories').insert(payload);
    setSaving(false);

    if (error) {
      notify(`Couldn’t save category: ${error.message}`, 'error');
      return;
    }
    notify(editingId ? 'Category updated' : 'Category added');
    setSheetOpen(false);
    fetchCategories();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    const ids = [deleting.id, ...categories.filter((c) => c.parent_id === deleting.id).map((c) => c.id)];
    // children first, so the parent isn't blocked by them
    let failed: string | null = null;
    for (const catId of ids.reverse()) {
      const { error } = await publicClient.from('categories').delete().eq('id', catId);
      if (error) failed = error.message;
    }
    setDeleteBusy(false);
    setDeleting(null);
    notify(failed ? `Couldn’t delete everything: ${failed}` : 'Category deleted', failed ? 'error' : 'success');
    fetchCategories();
  };

  const handleToggleActive = async (category: Category) => {
    setCategories((list) => list.map((c) => (c.id === category.id ? { ...c, is_active: !c.is_active } : c)));
    const { error } = await publicClient.from('categories').update({ is_active: !category.is_active }).eq('id', category.id);
    if (error) {
      notify(`Couldn’t update: ${error.message}`, 'error');
      fetchCategories();
    }
  };

  const topLevel = categories.filter((c) => c.parent_id === null);
  const childrenOf = (id: string) => categories.filter((c) => c.parent_id === id);

  const visibleTop = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return topLevel;
    return topLevel.filter((c) => c.name.toLowerCase().includes(q) || childrenOf(c.id).some((s) => s.name.toLowerCase().includes(q)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, search]);

  const deletingHasChildren = deleting ? categories.some((c) => c.parent_id === deleting.id) : false;
  let rowIndex = 0;

  const renderRow = (category: Category, isSub: boolean) => (
    <Row key={category.id} index={rowIndex++} className={isSub ? 'bg-blush-50/60' : ''}>
      <Td>
        <div className={`flex items-center gap-3 ${isSub ? 'pl-8' : ''}`}>
          {isSub ? (
            <span className="text-blush-300">↳</span>
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blush-100 font-display text-base font-semibold text-berry-600">
              {category.name.charAt(0).toUpperCase()}
            </span>
          )}
          <span className={isSub ? 'font-bold text-ink-soft' : 'font-extrabold text-ink'}>{category.name}</span>
        </div>
      </Td>
      <Td className="font-mono text-xs text-muted">{category.slug}</Td>
      <Td>
        <Pill tone={productCounts[category.id] ? 'pink' : 'neutral'}>{productCounts[category.id] ?? 0} products</Pill>
      </Td>
      <Td>
        <Toggle checked={category.is_active} onChange={() => handleToggleActive(category)} />
      </Td>
      <Td align="right">
        <RowActions>
          {!isSub && (
            <IconAction icon={PlusIcon} label="Add subcategory" tone="success" onClick={() => openSheet({ ...EMPTY_FORM, parent_id: category.id }, null)} />
          )}
          <IconAction icon={PencilIcon} label="Edit" tone="edit" onClick={() => handleOpenEdit(category)} />
          <IconAction icon={TrashIcon} label="Delete" tone="danger" onClick={() => setDeleting(category)} />
        </RowActions>
      </Td>
    </Row>
  );

  return (
    <div>
      <PageHeader
        title="Categories"
        subtitle={`${topLevel.length} categories · ${categories.length - topLevel.length} subcategories`}
        actions={
          <Button icon={PlusIcon} onClick={() => openSheet(EMPTY_FORM, null)}>
            Add category
          </Button>
        }
      />

      {loading ? (
        <TableSkeleton />
      ) : (
        <TableCard toolbar={<SearchInput value={search} onChange={setSearch} placeholder="Search categories…" />}>
          {categories.length === 0 ? (
            <EmptyState
              emoji="🏷️"
              title="No categories yet"
              text="Group your products so shoppers can find them faster."
              action={
                <Button icon={PlusIcon} onClick={() => openSheet(EMPTY_FORM, null)}>
                  Add your first category
                </Button>
              }
            />
          ) : visibleTop.length === 0 ? (
            <EmptyState emoji="🔍" title="No matches" text={`Nothing found for “${search}”.`} />
          ) : (
            <Table>
              <thead>
                <tr className="border-b border-line bg-blush-50/60">
                  <Th>Name</Th>
                  <Th>Slug</Th>
                  <Th>Products</Th>
                  <Th>Active</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {visibleTop.map((category) => (
                    <Fragment key={category.id}>
                      {renderRow(category, false)}
                      {childrenOf(category.id).map((sub) => renderRow(sub, true))}
                    </Fragment>
                  ))}
                </AnimatePresence>
              </tbody>
            </Table>
          )}
        </TableCard>
      )}

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editingId ? 'Edit category' : formData.parent_id ? 'Add subcategory' : 'Add category'}
        subtitle={editingId ? formData.name : 'Shoppers will see this in the menu'}
        icon={TagIcon}
        onSubmit={handleSave}
        saving={saving}
        submitLabel={editingId ? 'Save changes' : 'Add category'}
      >
        <div className="card-zs space-y-4 p-5">
          <Field label="Name" required>
            <input
              className="admin-input"
              value={formData.name}
              onChange={(e) => {
                const name = e.target.value;
                setFormData((prev) => ({ ...prev, name, slug: editingId ? prev.slug : generateSlug(name) }));
              }}
              placeholder="Audio"
              autoFocus
            />
          </Field>
          <Field label="Slug" required hint={`Used in the link: /products?category=${formData.slug || 'audio'}`}>
            <input
              className="admin-input font-mono"
              value={formData.slug}
              onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
              placeholder="audio"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Parent category">
              <select
                className="admin-input"
                value={formData.parent_id ?? ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, parent_id: e.target.value || null }))}
              >
                <option value="">None (top-level)</option>
                {topLevel
                  .filter((c) => c.id !== editingId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Display order" hint="Lower shows first">
              <input
                type="number"
                className="admin-input"
                value={formData.display_order}
                onChange={(e) => setFormData((prev) => ({ ...prev, display_order: Number(e.target.value) }))}
              />
            </Field>
          </div>
        </div>
        <Toggle
          checked={formData.is_active}
          onChange={(v) => setFormData((prev) => ({ ...prev, is_active: v }))}
          label="Active"
          description="Inactive categories are hidden from the store"
        />
      </Sheet>

      <ConfirmDialog
        open={!!deleting}
        title={`Delete “${deleting?.name}”?`}
        message={
          deletingHasChildren
            ? 'Its subcategories will be deleted too. Products stay, but lose this category.'
            : 'Products in it stay, but lose this category. This can’t be undone.'
        }
        loading={deleteBusy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
