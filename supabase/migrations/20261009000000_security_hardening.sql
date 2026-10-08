-- Zestore.pk security hardening
-- Run once in Supabase → SQL Editor. Safe to re-run.
--
-- What it does
--   1. admins table + is_admin(): only listed users can manage the store
--   2. Row Level Security on every store table (drops the old policies first)
--   3. orders / order_items / coupons are no longer readable by the public
--   4. checkout() — the server computes prices, discounts and stock itself
--   5. reviews are moderated (pending until an admin approves) and only
--      come in through the server (rate limited)
--   6. product-images uploads are admin-only
--   7. admins must use two-factor auth (TOTP): is_admin() needs an aal2 session
--   8. database-backed rate limits, per-phone order limits, and stock goes
--      back when an order is cancelled

begin;

-- ───────────────────────── 1. Admins ─────────────────────────

create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

insert into public.admins (user_id)
select id from auth.users where email = 'ahmedmahmood9431@gmail.com'
on conflict do nothing;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  -- admin AND signed in with a second factor
  select exists (select 1 from public.admins where user_id = auth.uid())
     and coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2';
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;

-- ───────────────────────── 2. Schema tweaks ─────────────────────────

-- secret used in order-confirmation links instead of the guessable order number
alter table public.orders add column if not exists lookup_token uuid not null default gen_random_uuid();
create unique index if not exists orders_lookup_token_key on public.orders (lookup_token);

-- stock_reserved: this order took stock when it was placed (orders placed
-- before this migration never did, so cancelling them must not add stock)
alter table public.orders add column if not exists stock_reserved boolean not null default false;

-- new reviews wait for approval
alter table public.product_reviews alter column is_approved set default false;
alter table public.product_reviews drop constraint if exists product_reviews_rating_range;
alter table public.product_reviews
  add constraint product_reviews_rating_range check (rating between 1 and 5) not valid;
alter table public.product_reviews drop constraint if exists product_reviews_length;
alter table public.product_reviews
  add constraint product_reviews_length check (
    char_length(customer_name) <= 80
    and char_length(coalesce(customer_city, '')) <= 80
    and char_length(review_text) <= 1000
  ) not valid;

-- ───────────────────────── 3. Row Level Security ─────────────────────────

do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'products', 'categories', 'product_variants', 'product_attributes',
        'product_attribute_values', 'product_reviews', 'orders', 'order_items',
        'coupons', 'payment_methods', 'site_settings', 'admins'
      )
  loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

alter table public.products                 enable row level security;
alter table public.categories               enable row level security;
alter table public.product_variants         enable row level security;
alter table public.product_attributes       enable row level security;
alter table public.product_attribute_values enable row level security;
alter table public.product_reviews          enable row level security;
alter table public.orders                   enable row level security;
alter table public.order_items              enable row level security;
alter table public.coupons                  enable row level security;
alter table public.payment_methods          enable row level security;
alter table public.site_settings            enable row level security;
alter table public.admins                   enable row level security;

-- catalog: everyone reads what is live, admins manage everything
create policy "catalog read" on public.products for select using (is_active or public.is_admin());
create policy "catalog admin" on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "catalog read" on public.categories for select using (is_active or public.is_admin());
create policy "catalog admin" on public.categories for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "catalog read" on public.product_variants for select using (is_active or public.is_admin());
create policy "catalog admin" on public.product_variants for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "catalog read" on public.product_attributes for select using (true);
create policy "catalog admin" on public.product_attributes for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "catalog read" on public.product_attribute_values for select using (true);
create policy "catalog admin" on public.product_attribute_values for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- reviews: approved ones are public. Customers submit through /api/reviews
-- (service role, rate limited) — there is no public insert policy.
create policy "reviews read" on public.product_reviews for select using (is_approved or public.is_admin());
create policy "reviews admin" on public.product_reviews for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- orders & coupons: admins only (checkout goes through checkout() on the server)
create policy "orders admin" on public.orders for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "order items admin" on public.order_items for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "coupons admin" on public.coupons for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- payment accounts are shown at checkout
create policy "payment methods read" on public.payment_methods for select using (is_active or public.is_admin());
create policy "payment methods admin" on public.payment_methods for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- settings: public read, admin write
create policy "settings read" on public.site_settings for select using (true);
create policy "settings admin" on public.site_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- a signed-in user may only see their own admin row (used by the admin UI)
create policy "admins self" on public.admins for select to authenticated using (user_id = auth.uid());

-- ───────────────────────── 4. Storage ─────────────────────────

do $$
declare
  r record;
begin
  for r in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and (coalesce(qual, '') ilike '%product-images%' or coalesce(with_check, '') ilike '%product-images%')
  loop
    execute format('drop policy %I on storage.objects', r.policyname);
  end loop;
end $$;

-- files stay publicly viewable through their public URLs (public bucket);
-- listing and writing is for admins
create policy "product images admin read" on storage.objects for select to authenticated
  using (bucket_id = 'product-images' and public.is_admin());
create policy "product images admin insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());
create policy "product images admin update" on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin());
create policy "product images admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

-- ───────────────────────── 5. Rate limits ─────────────────────────
-- Shared by every server instance (an in-memory counter resets per instance).

create table if not exists public.rate_limits (
  key text primary key,
  count integer not null,
  reset_at timestamptz not null
);
alter table public.rate_limits enable row level security;  -- no policies: service role only

create or replace function public.hit_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean  -- true when the caller is over the limit
language plpgsql
security definer
set search_path = public
as $$
declare
  hits integer;
begin
  insert into public.rate_limits as r (key, count, reset_at)
  values (p_key, 1, now() + make_interval(secs => p_window_seconds))
  on conflict (key) do update set
    count = case when r.reset_at < now() then 1 else r.count + 1 end,
    reset_at = case when r.reset_at < now() then now() + make_interval(secs => p_window_seconds) else r.reset_at end
  returning count into hits;

  if random() < 0.01 then
    delete from public.rate_limits where reset_at < now() - interval '1 day';
  end if;

  return hits > p_limit;
end;
$$;

revoke all on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;

-- ───────────────────────── 6. Stock back on cancel ─────────────────────────

create or replace function public.orders_restock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  it record;
  direction integer;
begin
  if not new.stock_reserved or new.status is not distinct from old.status then
    return new;
  end if;
  if new.status = 'cancelled' then
    direction := 1;   -- put it back
  elsif old.status = 'cancelled' then
    direction := -1;  -- re-opened: take it again
  else
    return new;
  end if;

  for it in select product_id, quantity, selected_variant from public.order_items where order_id = new.id
  loop
    update public.products set stock = greatest(stock + direction * it.quantity, 0) where id = it.product_id;
    if it.selected_variant is not null then
      update public.product_variants
      set stock = greatest(stock + direction * it.quantity, 0)
      where product_id = it.product_id and variant_combination = it.selected_variant;
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists orders_restock on public.orders;
create trigger orders_restock
  after update of status on public.orders
  for each row execute function public.orders_restock();

-- ───────────────────────── 7. Checkout ─────────────────────────
--
-- payload = {
--   items: [{ product_id, quantity, variant }],
--   payment_type: 'cod' | 'advance',
--   coupon_code: text | null,
--   customer: { name, phone, email, address, city }      -- only when placing
-- }
-- place = false → returns a quote; place = true → creates the order.
-- Errors are raised with a short code in MESSAGE and context in DETAIL.

create or replace function public.checkout(payload jsonb, place boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  prod public.products%rowtype;
  var public.product_variants%rowtype;
  has_options boolean;
  qty integer;
  unit numeric;
  chosen jsonb;
  lines jsonb := '[]'::jsonb;
  subtotal numeric := 0;
  advance_discount numeric := 0;
  coupon_discount numeric := 0;
  total numeric;
  settings public.site_settings%rowtype;
  coupon public.coupons%rowtype;
  has_coupon boolean := false;
  pay text := coalesce(payload ->> 'payment_type', 'cod');
  coupon_in text := upper(nullif(btrim(payload ->> 'coupon_code'), ''));
  cust jsonb := payload -> 'customer';
  new_order public.orders%rowtype;
  line jsonb;
begin
  if pay not in ('cod', 'advance') then
    raise exception using message = 'invalid_payment';
  end if;

  if jsonb_typeof(payload -> 'items') is distinct from 'array'
     or jsonb_array_length(payload -> 'items') = 0
     or jsonb_array_length(payload -> 'items') > 50 then
    raise exception using message = 'empty_cart';
  end if;

  for item in select value from jsonb_array_elements(payload -> 'items')
  loop
    if coalesce(item ->> 'quantity', '') !~ '^[0-9]{1,3}$' then
      raise exception using message = 'bad_quantity';
    end if;
    qty := (item ->> 'quantity')::integer;
    if qty < 1 or qty > 99 then
      raise exception using message = 'bad_quantity';
    end if;
    if coalesce(item ->> 'product_id', '') !~* '^[0-9a-f-]{36}$' then
      raise exception using message = 'product_unavailable';
    end if;

    select * into prod from public.products
    where id = (item ->> 'product_id')::uuid and is_active
    for update;
    if not found then
      raise exception using message = 'product_unavailable', detail = coalesce(item ->> 'product_id', '');
    end if;

    select exists (select 1 from public.product_attributes a where a.product_id = prod.id) into has_options;
    chosen := case when jsonb_typeof(item -> 'variant') = 'object' then item -> 'variant' else null end;

    if has_options then
      if chosen is null then
        raise exception using message = 'choose_options', detail = prod.name;
      end if;
      select * into var from public.product_variants
      where product_id = prod.id and is_active and variant_combination = chosen
      for update;
      if not found then
        raise exception using message = 'variant_unavailable', detail = prod.name;
      end if;
      if var.stock < qty then
        raise exception using message = 'out_of_stock', detail = prod.name, hint = var.stock::text;
      end if;
      unit := coalesce(var.price, prod.price);
    else
      chosen := null;
      if prod.stock < qty then
        raise exception using message = 'out_of_stock', detail = prod.name, hint = prod.stock::text;
      end if;
      unit := prod.price;
    end if;

    subtotal := subtotal + unit * qty;
    lines := lines || jsonb_build_array(jsonb_build_object(
      'product_id', prod.id,
      'name', prod.name,
      'image', prod.images[1],
      'price', unit,
      'quantity', qty,
      'total', unit * qty,
      'variant', chosen
    ));

    if place then
      if has_options then
        update public.product_variants set stock = stock - qty where id = var.id;
      end if;
      update public.products set stock = greatest(stock - qty, 0) where id = prod.id;
    end if;
  end loop;

  select * into settings from public.site_settings where id = 1;
  -- the store promises the advance discount on orders of Rs. 1,000 and up
  if pay = 'advance' and coalesce(settings.advance_payment_discount_enabled, false) and subtotal >= 1000 then
    advance_discount := coalesce(settings.advance_payment_discount_amount, 0);
  end if;

  if coupon_in is not null then
    select * into coupon from public.coupons c
    where upper(c.code) = coupon_in and c.is_active
    for update;
    if not found then
      raise exception using message = 'coupon_invalid';
    end if;
    if coupon.expiry_date is not null and coupon.expiry_date < now() then
      raise exception using message = 'coupon_expired';
    end if;
    if coupon.max_uses is not null and coupon.used_count >= coupon.max_uses then
      raise exception using message = 'coupon_used_up';
    end if;
    if coalesce(coupon.min_order_amount, 0) > subtotal then
      raise exception using message = 'coupon_min_order', detail = coupon.min_order_amount::text;
    end if;
    has_coupon := true;
    coupon_discount := case
      when coupon.discount_type = 'percentage' then round(subtotal * coupon.discount_value / 100)
      else least(coupon.discount_value, subtotal)
    end;
  end if;

  total := greatest(subtotal - advance_discount - coupon_discount, 0);

  if not place then
    return jsonb_build_object(
      'lines', lines,
      'subtotal', subtotal,
      'advance_discount', advance_discount,
      'coupon_discount', coupon_discount,
      'total', total,
      'coupon', case when has_coupon then jsonb_build_object(
        'code', coupon.code,
        'discount_type', coupon.discount_type,
        'discount_value', coupon.discount_value
      ) end
    );
  end if;

  -- customer details
  if jsonb_typeof(cust) is distinct from 'object'
     or char_length(btrim(coalesce(cust ->> 'name', ''))) not between 2 and 100
     or char_length(regexp_replace(coalesce(cust ->> 'phone', ''), '[^0-9]', '', 'g')) not between 10 and 15
     or char_length(btrim(coalesce(cust ->> 'address', ''))) not between 5 and 500
     or char_length(btrim(coalesce(cust ->> 'city', ''))) not between 2 and 80
     or char_length(coalesce(cust ->> 'email', '')) > 200 then
    raise exception using message = 'invalid_customer';
  end if;

  -- at most 3 open orders per phone number per day (stops fake orders from
  -- locking up all the stock)
  if (
    select count(*) from public.orders o
    where o.status = 'pending'
      and o.created_at > now() - interval '24 hours'
      and right(regexp_replace(o.customer_phone, '[^0-9]', '', 'g'), 10)
          = right(regexp_replace(cust ->> 'phone', '[^0-9]', '', 'g'), 10)
  ) >= 3 then
    raise exception using message = 'too_many_orders';
  end if;

  insert into public.orders (
    customer_name, customer_phone, customer_email, customer_address, customer_city,
    payment_type, subtotal, discount, coupon_code, coupon_discount, total, status, stock_reserved
  ) values (
    btrim(cust ->> 'name'),
    btrim(cust ->> 'phone'),
    nullif(btrim(coalesce(cust ->> 'email', '')), ''),
    btrim(cust ->> 'address'),
    btrim(cust ->> 'city'),
    pay,
    subtotal,
    advance_discount + coupon_discount,
    case when has_coupon then coupon.code end,
    coupon_discount,
    total,
    'pending',
    true
  )
  returning * into new_order;

  for line in select value from jsonb_array_elements(lines)
  loop
    insert into public.order_items (order_id, product_id, product_name, product_image, price, quantity, total, selected_variant)
    values (
      new_order.id,
      (line ->> 'product_id')::uuid,
      line ->> 'name',
      coalesce(line ->> 'image', ''),
      (line ->> 'price')::numeric,
      (line ->> 'quantity')::integer,
      (line ->> 'total')::numeric,
      case when jsonb_typeof(line -> 'variant') = 'object' then line -> 'variant' end
    );
  end loop;

  if has_coupon then
    update public.coupons set used_count = used_count + 1 where id = coupon.id;
  end if;

  return jsonb_build_object(
    'order_number', new_order.order_number,
    'token', new_order.lookup_token,
    'total', total,
    'lines', lines
  );
end;
$$;

revoke all on function public.checkout(jsonb, boolean) from public, anon, authenticated;
grant execute on function public.checkout(jsonb, boolean) to service_role;

commit;
