-- Several titles (e.g. "SIO Constitution") exist as separate books per
-- language edition, distinguished only by the `language` column — the
-- title text alone is identical. Without this, a confirmed sale's
-- title_snapshot (and therefore every receipt, Sales History row, and
-- Excel export) can't show which edition was actually sold, even though
-- the correct book_id was decremented internally. Append "(Language)" to
-- the snapshot at the moment of sale, same signature as before so this is
-- a plain CREATE OR REPLACE.

create or replace function create_sale(
  p_customer_type text,
  p_customer_name text,
  p_payment_method text,
  p_idempotency_key uuid,
  p_items jsonb
)
returns table (sale_id uuid, transaction_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_book_id uuid;
  v_qty int;
  v_unit_list_price numeric(10,2);
  v_discount_percent numeric(5,2);
  v_unit_selling numeric(10,2);
  v_line_total numeric(10,2);
  v_subtotal numeric(10,2) := 0;
  v_discount_total numeric(10,2) := 0;
  v_total numeric(10,2) := 0;
  v_new_sale_id uuid := gen_random_uuid();
  v_code text;
  v_remaining int;
  v_title text;
  v_language text;
  v_supplier_name text;
  v_default_list_price numeric(10,2);
  v_default_discount numeric(5,2);
  v_found_sale_id uuid;
  v_found_code text;
  v_item_rows jsonb := '[]'::jsonb;
  v_cash_paid boolean;
begin
  if auth.role() <> 'authenticated' then
    raise exception 'not authorized';
  end if;

  if p_customer_type not in ('unit', 'person') then
    raise exception 'invalid customer_type: %', p_customer_type;
  end if;
  if coalesce(btrim(p_customer_name), '') = '' then
    raise exception 'customer_name is required';
  end if;
  if p_payment_method not in ('cash', 'upi', 'unpaid') then
    raise exception 'invalid payment_method: %', p_payment_method;
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'sale must include at least one item';
  end if;

  select sales.id, sales.transaction_code into v_found_sale_id, v_found_code
  from sales where client_idempotency_key = p_idempotency_key;

  if found then
    sale_id := v_found_sale_id;
    transaction_code := v_found_code;
    return next;
    return;
  end if;

  perform 1
  from books
  where id in (
    select (elem->>'book_id')::uuid
    from jsonb_array_elements(p_items) elem
  )
  order by id
  for update;

  v_code := 'SIO-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('sales_transaction_seq')::text, 4, '0');
  v_cash_paid := p_payment_method <> 'unpaid';

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_book_id := (v_item->>'book_id')::uuid;
    v_qty := (v_item->>'quantity')::int;

    if v_qty is null or v_qty <= 0 then
      raise exception 'invalid quantity for book %', v_book_id;
    end if;

    select b.remaining_stock, b.title, b.language, b.list_price, b.discount_percent, s.name
      into v_remaining, v_title, v_language, v_default_list_price, v_default_discount, v_supplier_name
      from books b
      join suppliers s on s.id = b.supplier_id
      where b.id = v_book_id;

    if not found then
      raise exception 'book % not found', v_book_id;
    end if;

    if v_remaining < v_qty then
      raise exception 'insufficient stock for "%": requested %, only % remaining', v_title, v_qty, v_remaining;
    end if;

    if v_language is not null and btrim(v_language) <> '' then
      v_title := v_title || ' (' || v_language || ')';
    end if;

    v_unit_list_price := coalesce((v_item->>'unit_list_price')::numeric, v_default_list_price);
    v_discount_percent := coalesce((v_item->>'discount_percent')::numeric, v_default_discount);

    if v_unit_list_price < 0 or v_discount_percent < 0 or v_discount_percent > 100 then
      raise exception 'invalid price/discount for "%"', v_title;
    end if;

    v_unit_selling := round(v_unit_list_price * (1 - v_discount_percent / 100), 2);
    v_line_total := round(v_unit_selling * v_qty, 2);

    v_subtotal := v_subtotal + (v_unit_list_price * v_qty);
    v_discount_total := v_discount_total + ((v_unit_list_price - v_unit_selling) * v_qty);
    v_total := v_total + v_line_total;

    update books set remaining_stock = remaining_stock - v_qty where id = v_book_id;

    v_item_rows := v_item_rows || jsonb_build_object(
      'book_id', v_book_id,
      'title_snapshot', v_title,
      'supplier_name_snapshot', v_supplier_name,
      'quantity', v_qty,
      'unit_list_price', v_unit_list_price,
      'discount_percent', v_discount_percent,
      'unit_selling_price', v_unit_selling,
      'line_total', v_line_total
    );
  end loop;

  insert into sales (
    id, transaction_code, client_idempotency_key, customer_type, customer_name,
    subtotal, discount_total, total_amount, cash_paid, payment_method, amount_paid, balance_due
  ) values (
    v_new_sale_id, v_code, p_idempotency_key, p_customer_type, btrim(p_customer_name),
    round(v_subtotal, 2), round(v_discount_total, 2), round(v_total, 2),
    v_cash_paid, p_payment_method,
    case when v_cash_paid then round(v_total, 2) else 0 end,
    case when v_cash_paid then 0 else round(v_total, 2) end
  );

  insert into sale_items (
    sale_id, book_id, title_snapshot, supplier_name_snapshot,
    quantity, unit_list_price, discount_percent, unit_selling_price, line_total
  )
  select
    v_new_sale_id,
    (r->>'book_id')::uuid,
    r->>'title_snapshot',
    r->>'supplier_name_snapshot',
    (r->>'quantity')::int,
    (r->>'unit_list_price')::numeric,
    (r->>'discount_percent')::numeric,
    (r->>'unit_selling_price')::numeric,
    (r->>'line_total')::numeric
  from jsonb_array_elements(v_item_rows) r;

  sale_id := v_new_sale_id;
  transaction_code := v_code;
  return next;
end;
$$;

revoke all on function create_sale(text, text, text, uuid, jsonb) from public, anon;
grant execute on function create_sale(text, text, text, uuid, jsonb) to authenticated;
