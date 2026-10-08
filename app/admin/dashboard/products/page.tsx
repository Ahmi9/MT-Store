'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { publicClient } from '@/lib/supabase';
import DemoProductsPanel from '@/components/admin/DemoProductsPanel';
import {
  ConfirmDialog,
  EmptyState,
  FilterTabs,
  IconAction,
  LinkButton,
  PageHeader,
  Pill,
  Row,
  RowActions,
  SearchInput,
  Table,
  TableCard,
  TableSkeleton,
  Td,
  Th,
  Toggle,
  useAdminToast,
} from '@/components/admin/ui';
import { BagIcon, PencilIcon, PlusIcon, StarIcon, TrashIcon } from '@/components/store/icons';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  original_price: number | null;
  stock: number;
  is_active: boolean;
  is_featured: boolean;
  images: string[] | null;
  category_id: string | null;
}

type Filter = 'all' | 'active' | 'hidden' | 'featured' | 'low';

const LOW_STOCK = 5;

export default function ProductsPage() {
  const notify = useAdminToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryNames, setCategoryNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const fetchProducts = async () => {
    const [{ data, error }, { data: cats }] = await Promise.all([
      publicClient.from('products').select('*').order('created_at', { ascending: false }),
      publicClient.from('categories').select('id, name'),
    ]);
    if (!error && data) setProducts(data as Product[]);
    setCategoryNames(Object.fromEntries(((cats ?? []) as { id: string; name: string }[]).map((c) => [c.id, c.name])));
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const patch = async (product: Product, change: Partial<Product>) => {
    setProducts((list) => list.map((p) => (p.id === product.id ? { ...p, ...change } : p)));
    const { error } = await publicClient.from('products').update(change).eq('id', product.id);
    if (error) {
      notify(`Couldn’t update: ${error.message}`, 'error');
      fetchProducts();
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    const { error } = await publicClient.from('products').delete().eq('id', deleting.id);
    setDeleteBusy(false);
    setDeleting(null);
    if (error) {
      notify(
        error.code === '23503' ? 'This product is part of past orders — hide it instead of deleting.' : `Couldn’t delete: ${error.message}`,
        'error'
      );
      return;
    }
    setProducts((list) => list.filter((p) => p.id !== deleting.id));
    notify('Product deleted');
  };

  const counts = {
    all: products.length,
    active: products.filter((p) => p.is_active).length,
    hidden: products.filter((p) => !p.is_active).length,
    featured: products.filter((p) => p.is_featured).length,
    low: products.filter((p) => p.stock <= LOW_STOCK).length,
  };

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q) && !(p.category_id && categoryNames[p.category_id]?.toLowerCase().includes(q))) return false;
      if (filter === 'active') return p.is_active;
      if (filter === 'hidden') return !p.is_active;
      if (filter === 'featured') return p.is_featured;
      if (filter === 'low') return p.stock <= LOW_STOCK;
      return true;
    });
  }, [products, categoryNames, search, filter]);

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle={`${counts.active} live in the store${counts.low ? ` · ${counts.low} low on stock` : ''}`}
        actions={
          <LinkButton href="/admin/dashboard/products/new" icon={PlusIcon}>
            Add product
          </LinkButton>
        }
      />

      <DemoProductsPanel onChange={fetchProducts} />

      {loading ? (
        <TableSkeleton />
      ) : (
        <TableCard
          toolbar={
            <>
              <FilterTabs
                id="products"
                value={filter}
                onChange={setFilter}
                tabs={[
                  { value: 'all', label: 'All', count: counts.all },
                  { value: 'active', label: 'Live', count: counts.active },
                  { value: 'hidden', label: 'Hidden', count: counts.hidden },
                  { value: 'featured', label: 'Featured', count: counts.featured },
                  { value: 'low', label: 'Low stock', count: counts.low },
                ]}
              />
              <SearchInput value={search} onChange={setSearch} placeholder="Search products…" />
            </>
          }
        >
          {products.length === 0 ? (
            <EmptyState
              emoji="🛍️"
              title="No products yet"
              text="Add your first product or import the demo catalog above."
              action={
                <LinkButton href="/admin/dashboard/products/new" icon={PlusIcon}>
                  Add product
                </LinkButton>
              }
            />
          ) : visible.length === 0 ? (
            <EmptyState emoji="🔍" title="No matching products" text="Try another filter or search." />
          ) : (
            <Table>
              <thead>
                <tr className="border-b border-line bg-blush-50/60">
                  <Th>Product</Th>
                  <Th>Price</Th>
                  <Th>Stock</Th>
                  <Th>Live</Th>
                  <Th>Featured</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {visible.map((product, index) => {
                    const off = product.original_price && product.original_price > product.price ? Math.round((1 - product.price / product.original_price) * 100) : 0;
                    return (
                      <Row key={product.id} index={index}>
                        <Td>
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-blush-100">
                              {product.images?.[0] ? (
                                <img src={product.images[0]} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full items-center justify-center text-berry-400">
                                  <BagIcon className="h-5 w-5" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="max-w-[260px] truncate font-extrabold text-ink">{product.name}</p>
                              <p className="text-xs text-muted">{product.category_id ? categoryNames[product.category_id] ?? '—' : 'No category'}</p>
                            </div>
                          </div>
                        </Td>
                        <Td>
                          <p className="font-extrabold text-ink">Rs. {Number(product.price).toLocaleString()}</p>
                          {off > 0 && (
                            <p className="text-xs">
                              <span className="text-muted line-through">Rs. {Number(product.original_price).toLocaleString()}</span>{' '}
                              <span className="font-extrabold text-berry-600">-{off}%</span>
                            </p>
                          )}
                        </Td>
                        <Td>
                          <Pill tone={product.stock === 0 ? 'rose' : product.stock <= LOW_STOCK ? 'amber' : 'green'} dot>
                            {product.stock === 0 ? 'Sold out' : `${product.stock} in stock`}
                          </Pill>
                        </Td>
                        <Td>
                          <Toggle checked={product.is_active} onChange={(v) => patch(product, { is_active: v })} />
                        </Td>
                        <Td>
                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.8, rotate: -20 }}
                            onClick={() => patch(product, { is_featured: !product.is_featured })}
                            className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                              product.is_featured ? 'bg-amber-100 text-amber-500' : 'text-blush-300 hover:bg-blush-100 hover:text-amber-400'
                            }`}
                            aria-label={product.is_featured ? 'Remove from featured' : 'Mark as featured'}
                            title={product.is_featured ? 'Featured on the homepage' : 'Feature on the homepage'}
                          >
                            <StarIcon className="h-5 w-5" filled={product.is_featured} />
                          </motion.button>
                        </Td>
                        <Td align="right">
                          <RowActions>
                            <IconAction icon={PencilIcon} label="Edit" tone="edit" href={`/admin/dashboard/products/${product.id}/edit`} />
                            <IconAction icon={TrashIcon} label="Delete" tone="danger" onClick={() => setDeleting(product)} />
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

      <ConfirmDialog
        open={!!deleting}
        title={`Delete “${deleting?.name}”?`}
        message="It will be removed from the store. This can’t be undone — to keep it for later, switch “Live” off instead."
        loading={deleteBusy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
