-- One phone format everywhere: 03XXXXXXXXX.
-- Customers and admins can type a number any way they like (+923001234567,
-- +92 0300 1234567, 0092 300…, 3001234567, 03001234567); it's converted
-- before it's saved. Also includes the customer field rules from
-- 20261009020000 (name 2–100, address not empty, city up to 30), so running
-- this file on its own is enough.
-- Run once in Supabase → SQL Editor.

begin;

-- '03XXXXXXXXX', or null when the text isn't a Pakistani mobile number.
-- Same rules as normalizePkPhone() in lib/phone.ts.
create or replace function public.normalize_pk_phone(raw text)
returns text
language sql
immutable
set search_path = public
as $$
  select case when d ~ '^3[0-9]{9}$' then '0' || d end
  from (
    select regexp_replace(
             regexp_replace(
               regexp_replace(regexp_replace(coalesce(raw, ''), '[^0-9]', '', 'g'), '^00', ''),
               '^92', ''),
             '^0', '') as d
  ) s
$$;

-- whatever writes the row (checkout, the admin panel, the SQL editor), the
-- number lands in 03XXXXXXXXX; text that isn't a phone number is kept as is
create or replace function public.orders_normalize_phone()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.customer_phone := coalesce(public.normalize_pk_phone(new.customer_phone), new.customer_phone);
  return new;
end;
$$;

drop trigger if exists orders_normalize_phone on public.orders;
create trigger orders_normalize_phone
  before insert or update of customer_phone on public.orders
  for each row execute function public.orders_normalize_phone();

create or replace function public.site_settings_normalize_phone()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.whatsapp_number := coalesce(public.normalize_pk_phone(new.whatsapp_number), new.whatsapp_number);
  return new;
end;
$$;

drop trigger if exists site_settings_normalize_phone on public.site_settings;
create trigger site_settings_normalize_phone
  before insert or update of whatsapp_number on public.site_settings
  for each row execute function public.site_settings_normalize_phone();

-- fix the numbers already saved
update public.orders
set customer_phone = public.normalize_pk_phone(customer_phone)
where public.normalize_pk_phone(customer_phone) is distinct from customer_phone
  and public.normalize_pk_phone(customer_phone) is not null;

update public.site_settings
set whatsapp_number = public.normalize_pk_phone(whatsapp_number)
where public.normalize_pk_phone(whatsapp_number) is distinct from whatsapp_number
  and public.normalize_pk_phone(whatsapp_number) is not null;

-- wallet numbers (JazzCash, Easypaisa…); bank accounts are left alone
update public.payment_methods
set account_number = public.normalize_pk_phone(account_number)
where method_name !~* '(bank|hbl|ubl|mcb|meezan|alfalah|allied|faysal|askari|habib|iban)'
  and public.normalize_pk_phone(account_number) is not null
  and public.normalize_pk_phone(account_number) is distinct from account_number;

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
