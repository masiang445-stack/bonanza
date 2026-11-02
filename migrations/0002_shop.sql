create table if not exists profiles (
  user_id text primary key,
  name text not null default '',
  phone text not null default '',
  address text not null default '',
  city text not null default '',
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists orders (
  id text primary key,
  user_id text not null,
  name text not null,
  phone text not null,
  address text not null,
  city text not null,
  notes text not null default '',
  slot text not null,
  payment text not null,
  status text not null default 'baru' check (status in ('baru', 'diproses', 'dikirim', 'selesai', 'batal')),
  subtotal integer not null,
  delivery integer not null,
  total integer not null,
  created_at timestamptz not null default now()
);
create index if not exists orders_user_id_idx on orders (user_id);
create index if not exists orders_created_at_idx on orders (created_at desc);

create table if not exists order_items (
  id serial primary key,
  order_id text not null references orders (id) on delete cascade,
  slug text not null,
  name text not null,
  qty integer not null,
  price integer not null,
  unit text not null
);
create index if not exists order_items_order_id_idx on order_items (order_id);
create index if not exists order_items_slug_idx on order_items (slug);

create table if not exists ledger (
  id serial primary key,
  user_id text not null,
  kind text not null check (kind in ('masuk', 'keluar')),
  category text not null,
  amount integer not null,
  note text not null default '',
  order_id text,
  occurred_at date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists ledger_occurred_at_idx on ledger (occurred_at desc);
create index if not exists ledger_order_id_idx on ledger (order_id);
