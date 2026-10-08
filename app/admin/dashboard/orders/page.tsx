'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { publicClient } from '@/lib/supabase';
import {
  EmptyState,
  FilterTabs,
  IconAction,
  PageHeader,
  Pill,
  Row,
  RowActions,
  SearchInput,
  STATUS_TONE,
  Table,
  TableCard,
  TableSkeleton,
  Td,
  Th,
} from '@/components/admin/ui';
import { EyeIcon } from '@/components/store/icons';

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_city: string;
  payment_type: 'cod' | 'advance';
  subtotal: number;
  discount: number;
  total: number;
  status: string;
  created_at: string;
}

type FilterType = 'all' | 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchOrders = async () => {
      const { data, error } = await publicClient.from('orders').select('*').order('created_at', { ascending: false });

      if (!error && data) {
        setOrders(data as Order[]);
      }
      setLoading(false);
    };

    fetchOrders();
  }, []);

  const count = (status: string) => orders.filter((o) => o.status === status).length;

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (filter !== 'all' && o.status !== filter) return false;
      if (!q) return true;
      return [o.order_number, o.customer_name, o.customer_phone, o.customer_city].some((v) => String(v ?? '').toLowerCase().includes(q));
    });
  }, [orders, filter, search]);

  const pendingValue = orders.filter((o) => o.status === 'pending').reduce((sum, o) => sum + Number(o.total), 0);

  return (
    <div>
      <PageHeader
        title="Orders"
        subtitle={
          count('pending')
            ? `${count('pending')} waiting for you · Rs. ${pendingValue.toLocaleString()} pending`
            : 'All caught up ✨'
        }
      />

      {loading ? (
        <TableSkeleton />
      ) : (
        <TableCard
          toolbar={
            <>
              <FilterTabs
                id="orders"
                value={filter}
                onChange={setFilter}
                tabs={[
                  { value: 'all', label: 'All', count: orders.length },
                  { value: 'pending', label: 'Pending', count: count('pending') },
                  { value: 'confirmed', label: 'Confirmed', count: count('confirmed') },
                  { value: 'shipped', label: 'Shipped', count: count('shipped') },
                  { value: 'delivered', label: 'Delivered', count: count('delivered') },
                  { value: 'cancelled', label: 'Cancelled', count: count('cancelled') },
                ]}
              />
              <SearchInput value={search} onChange={setSearch} placeholder="Order #, name, phone, city…" />
            </>
          }
        >
          {orders.length === 0 ? (
            <EmptyState emoji="🛍️" title="No orders yet" text="When customers check out, their orders will show up here." />
          ) : visible.length === 0 ? (
            <EmptyState emoji="🔍" title="No matching orders" text="Try another status or search." />
          ) : (
            <Table>
              <thead>
                <tr className="border-b border-line bg-blush-50/60">
                  <Th>Order</Th>
                  <Th>Customer</Th>
                  <Th>City</Th>
                  <Th>Total</Th>
                  <Th>Payment</Th>
                  <Th>Status</Th>
                  <Th>Date</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {visible.map((order, index) => (
                    <Row key={order.id} index={index} onClick={() => router.push(`/admin/dashboard/orders/${order.id}`)}>
                      <Td className="font-extrabold text-ink">#{order.order_number}</Td>
                      <Td>
                        <p className="font-bold text-ink">{order.customer_name}</p>
                        <p className="text-xs text-muted">{order.customer_phone}</p>
                      </Td>
                      <Td>{order.customer_city}</Td>
                      <Td className="font-extrabold text-ink">Rs. {Number(order.total).toLocaleString()}</Td>
                      <Td>
                        <Pill tone={order.payment_type === 'cod' ? 'neutral' : 'pink'}>{order.payment_type === 'cod' ? 'COD' : 'Advance'}</Pill>
                      </Td>
                      <Td>
                        <Pill tone={STATUS_TONE[order.status] ?? 'neutral'} dot>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </Pill>
                      </Td>
                      <Td className="whitespace-nowrap text-muted">
                        {new Date(order.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </Td>
                      <Td align="right">
                        <RowActions>
                          <IconAction icon={EyeIcon} label="View order" tone="edit" href={`/admin/dashboard/orders/${order.id}`} />
                        </RowActions>
                      </Td>
                    </Row>
                  ))}
                </AnimatePresence>
              </tbody>
            </Table>
          )}
        </TableCard>
      )}
    </div>
  );
}
