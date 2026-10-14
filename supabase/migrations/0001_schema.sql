-- SIO Book Sale Portal — initial schema
-- Run this once in the Supabase SQL editor (or via `supabase db push` if the project is linked).

create extension if not exists "pgcrypto";

create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table if not exists books (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references suppliers(id) on delete restrict,
  sl_no int not null,
  title text not null,
  author text,
  language text,
  list_price numeric(10,2) not null check (list_price >= 0),
  discount_percent numeric(5,2) not null default 0 check (discount_percent >= 0 and discount_percent <= 100),
  opening_stock int not null default 0 check (opening_stock >= 0),
  remaining_stock int not null default 0 check (remaining_stock >= 0),
  needs_review boolean not null default false,
  created_at timestamptz not null default now(),
  unique (supplier_id, sl_no)
);

create index if not exists books_title_idx on books using gin (to_tsvector('simple', title));
create index if not exists books_supplier_idx on books(supplier_id);

create sequence if not exists sales_transaction_seq;

create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  transaction_code text not null unique,
  client_idempotency_key uuid not null unique,
  customer_type text not null check (customer_type in ('unit', 'person')),
  customer_name text not null,
  subtotal numeric(10,2) not null,
  discount_total numeric(10,2) not null,
  total_amount numeric(10,2) not null,
  cash_paid boolean not null default false,
  amount_paid numeric(10,2) not null default 0,
  balance_due numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists sales_created_at_idx on sales(created_at desc);
create index if not exists sales_customer_name_idx on sales(customer_name);

create table if not exists sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales(id) on delete cascade,
  book_id uuid not null references books(id) on delete restrict,
  title_snapshot text not null,
  supplier_name_snapshot text not null,
  quantity int not null check (quantity > 0),
  unit_list_price numeric(10,2) not null,
  discount_percent numeric(5,2) not null,
  unit_selling_price numeric(10,2) not null,
  line_total numeric(10,2) not null
);

create index if not exists sale_items_sale_idx on sale_items(sale_id);
create index if not exists sale_items_book_idx on sale_items(book_id);

create table if not exists inventory_adjustments (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references books(id) on delete cascade,
  field text not null,
  old_value text,
  new_value text,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists inventory_adjustments_book_idx on inventory_adjustments(book_id);

-- Row Level Security: this is a single shared-admin internal tool (one
-- Supabase Auth account used by event staff), not a multi-tenant app, so
-- there is no per-row ownership to check — any authenticated session gets
-- full access, and anonymous (anon) requests get none.
alter table suppliers enable row level security;
alter table books enable row level security;
alter table sales enable row level security;
alter table sale_items enable row level security;
alter table inventory_adjustments enable row level security;

create policy "authenticated_full_access" on suppliers for all to authenticated using (true) with check (true);
create policy "authenticated_full_access" on books for all to authenticated using (true) with check (true);
create policy "authenticated_full_access" on sales for all to authenticated using (true) with check (true);
create policy "authenticated_full_access" on sale_items for all to authenticated using (true) with check (true);
create policy "authenticated_full_access" on inventory_adjustments for all to authenticated using (true) with check (true);
