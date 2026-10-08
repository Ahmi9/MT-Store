'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { publicClient } from '@/lib/supabase';
import {
  ConfirmDialog,
  EmptyState,
  FilterTabs,
  IconAction,
  PageHeader,
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
import { StarIcon, TrashIcon } from '@/components/store/icons';

interface Review {
  id: string;
  product_id: string;
  customer_name: string;
  customer_city: string | null;
  review_text: string;
  rating: number;
  is_approved: boolean;
  created_at: string;
}

type Filter = 'pending' | 'approved' | 'all';

export default function ReviewsPage() {
  const notify = useAdminToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [products, setProducts] = useState<Record<string, { name: string; image: string | null }>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('pending');
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<Review | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const fetchReviews = async () => {
    const [{ data }, { data: prods }] = await Promise.all([
      publicClient.from('product_reviews').select('*').order('created_at', { ascending: false }),
      publicClient.from('products').select('id, name, images'),
    ]);
    if (data) setReviews(data as Review[]);
    setProducts(
      Object.fromEntries(
        ((prods ?? []) as { id: string; name: string; images: string[] | null }[]).map((p) => [p.id, { name: p.name, image: p.images?.[0] ?? null }])
      )
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const setApproved = async (review: Review, value: boolean) => {
    setReviews((list) => list.map((r) => (r.id === review.id ? { ...r, is_approved: value } : r)));
    const { error } = await publicClient.from('product_reviews').update({ is_approved: value }).eq('id', review.id);
    if (error) {
      notify(`Couldn’t update: ${error.message}`, 'error');
      fetchReviews();
      return;
    }
    notify(value ? 'Review is now live on the store' : 'Review hidden');
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    const { error } = await publicClient.from('product_reviews').delete().eq('id', deleting.id);
    setDeleteBusy(false);
    setDeleting(null);
    if (error) {
      notify(`Couldn’t delete: ${error.message}`, 'error');
      return;
    }
    setReviews((list) => list.filter((r) => r.id !== deleting.id));
    notify('Review deleted');
  };

  const pending = reviews.filter((r) => !r.is_approved).length;

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reviews.filter((r) => {
      if (filter === 'pending' && r.is_approved) return false;
      if (filter === 'approved' && !r.is_approved) return false;
      if (!q) return true;
      return [r.customer_name, r.review_text, products[r.product_id]?.name].some((v) => v?.toLowerCase().includes(q));
    });
  }, [reviews, products, filter, search]);

  return (
    <div>
      <PageHeader title="Reviews" subtitle={pending ? `${pending} waiting for your approval` : 'No reviews waiting ✨'} />

      {loading ? (
        <TableSkeleton />
      ) : (
        <TableCard
          toolbar={
            <>
              <FilterTabs
                id="reviews"
                value={filter}
                onChange={setFilter}
                tabs={[
                  { value: 'pending', label: 'Pending', count: pending },
                  { value: 'approved', label: 'Live', count: reviews.length - pending },
                  { value: 'all', label: 'All', count: reviews.length },
                ]}
              />
              <SearchInput value={search} onChange={setSearch} placeholder="Search reviews…" />
            </>
          }
        >
          {visible.length === 0 ? (
            <EmptyState
              emoji={filter === 'pending' ? '🎉' : '💬'}
              title={filter === 'pending' ? 'All caught up' : 'No reviews here'}
              text={filter === 'pending' ? 'New reviews from customers will wait here until you approve them.' : undefined}
            />
          ) : (
            <Table>
              <thead>
                <tr className="border-b border-line bg-blush-50/60">
                  <Th>Product</Th>
                  <Th>Review</Th>
                  <Th>Rating</Th>
                  <Th>Date</Th>
                  <Th>Live</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {visible.map((review, index) => {
                    const product = products[review.product_id];
                    return (
                      <Row key={review.id} index={index}>
                        <Td>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-xl bg-blush-100">
                              {product?.image && <img src={product.image} alt="" className="h-full w-full object-cover" />}
                            </div>
                            <span className="max-w-[180px] truncate font-bold text-ink">{product?.name ?? 'Deleted product'}</span>
                          </div>
                        </Td>
                        <Td>
                          <p className="font-extrabold text-ink">
                            {review.customer_name}
                            {review.customer_city && <span className="font-semibold text-muted"> · {review.customer_city}</span>}
                          </p>
                          <p className="line-clamp-2 max-w-md text-sm">{review.review_text}</p>
                        </Td>
                        <Td>
                          <span className="flex text-amber-400">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <StarIcon key={i} className="h-4 w-4" filled={i < review.rating} />
                            ))}
                          </span>
                        </Td>
                        <Td className="whitespace-nowrap text-muted">
                          {new Date(review.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </Td>
                        <Td>
                          <Toggle checked={review.is_approved} onChange={(v) => setApproved(review, v)} />
                        </Td>
                        <Td align="right">
                          <RowActions>
                            <IconAction icon={TrashIcon} label="Delete" tone="danger" onClick={() => setDeleting(review)} />
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
        title="Delete this review?"
        message={deleting ? `“${deleting.review_text.slice(0, 80)}${deleting.review_text.length > 80 ? '…' : ''}” by ${deleting.customer_name}` : undefined}
        loading={deleteBusy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
