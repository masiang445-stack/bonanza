create table if not exists invoice_customers (
  id serial primary key,
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists manual_invoices (
  id text primary key,
  customer_id integer not null references invoice_customers (id),
  notes text not null default '',
  paid boolean not null default false,
  subtotal integer not null default 0,
  total integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists manual_invoices_customer_idx on manual_invoices (customer_id);
create index if not exists manual_invoices_created_idx on manual_invoices (created_at desc);

create table if not exists manual_invoice_items (
  id serial primary key,
  invoice_id text not null references manual_invoices (id) on delete cascade,
  slug text not null,
  name text not null,
  qty integer not null,
  price integer not null,
  unit text not null
);
create index if not exists manual_invoice_items_invoice_idx on manual_invoice_items (invoice_id);

insert into invoice_customers (name) values
  ('SPPG BANTARKAWUNG'),
  ('SPPG PAGUYANGAN 003'),
  ('SPPG PAKUJATI'),
  ('SPPG PAGOJENGAN'),
  ('SPPG SINDANGWANGI BANGBAYANG'),
  ('SPPG GUNUNG LARANG SALEM')
on conflict (name) do nothing;
