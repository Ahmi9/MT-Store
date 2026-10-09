-- Deal of the day, managed from Admin → Deal of the day.
--   deal_enabled       show the card on the homepage
--   deal_product_id    the product on deal; null = pick the biggest discount
--   deal_price         special price for that product (checkout charges it
--                      while the deal is live); null = its normal price
--   deal_timer         'midnight' countdown resets every night,
--                      'until'    deal ends at deal_ends_at (card hides and
--                                 the normal price comes back),
--                      'none'     no countdown
--   deal_badge / deal_title / deal_subtitle / deal_button_text / deal_image
--                      card text and picture; empty = defaults
-- Run once in Supabase → SQL Editor, after 20261009030000_phone_format.sql.

begin;

alter table public.site_settings
  add column if not exists deal_enabled boolean not null default true,
  add column if not exists deal_product_id uuid references public.products(id) on delete set null,
  add column if not exists deal_price numeric,
  add column if not exists deal_timer text not null default 'midnight',
  add column if not exists deal_ends_at timestamptz,
  add column if not exists deal_badge text,
  add column if not exists deal_title text,
  add column if not exists deal_subtitle text,
  add column if not exists deal_button_text text,
  add column if not exists deal_image text;

alter table public.site_settings drop constraint if exists site_settings_deal_check;
alter table public.site_settings add constraint site_settings_deal_check check (
  deal_timer in ('midnight', 'until', 'none')
  and (deal_price is null or deal_price > 0)
  and (deal_timer <> 'until' or deal_ends_at is not null)
  and char_length(coalesce(deal_badge, '')) <= 40
  and char_length(coalesce(deal_title, '')) <= 120
  and char_length(coalesce(deal_subtitle, '')) <= 300
  and char_length(coalesce(deal_button_text, '')) <= 30
  and char_length(coalesce(deal_image, '')) <= 1000
);

-- The deal price of a product while its deal is live, otherwise null.
-- Same rules as dealPriceFor() in lib/deal.ts.
create or replace function public.deal_price(p_product uuid)
returns numeric
language sql
stable
set search_path = public
as $$
  select s.deal_price
  from public.site_settings s
  where s.id = 1
    and s.deal_enabled
    and s.deal_product_id = p_product
    and s.deal_price is not null
    and (s.deal_timer <> 'until' or s.deal_ends_at > now())
$$;

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
      -- options with their own price keep it; the rest get the deal price
      unit := coalesce(var.price, public.deal_price(prod.id), prod.price);
    else
      chosen := null;
      if prod.stock < qty then
        raise exception using message = 'out_of_stock', detail = prod.name, hint = prod.stock::text;
      end if;
      unit := coalesce(public.deal_price(prod.id), prod.price);
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
     -- name 2–100; any Pakistani mobile format; address just not empty;
     -- city up to 30 (longest city, "Khairpur Nathan Shah", is 20)
     or char_length(btrim(coalesce(cust ->> 'name', ''))) not between 2 and 100
     or public.normalize_pk_phone(cust ->> 'phone') is null
     or btrim(coalesce(cust ->> 'address', '')) = ''
     or char_length(btrim(coalesce(cust ->> 'city', ''))) not between 1 and 30
     or char_length(coalesce(cust ->> 'email', '')) > 200 then
    raise exception using message = 'invalid_customer';
  end if;

  -- at most 3 open orders per phone number per day (stops fake orders from
  -- locking up all the stock)
  if (
    select count(*) from public.orders o
    where o.status = 'pending'
      and o.created_at > now() - interval '24 hours'
      and public.normalize_pk_phone(o.customer_phone) = public.normalize_pk_phone(cust ->> 'phone')
  ) >= 3 then
    raise exception using message = 'too_many_orders';
  end if;

  insert into public.orders (
    customer_name, customer_phone, customer_email, customer_address, customer_city,
    payment_type, subtotal, discount, coupon_code, coupon_discount, total, status, stock_reserved
  ) values (
    btrim(cust ->> 'name'),
    public.normalize_pk_phone(cust ->> 'phone'),
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
