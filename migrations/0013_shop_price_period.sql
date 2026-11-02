create table if not exists shop_settings (
  id integer primary key,
  price_from date,
  price_to date
);

insert into shop_settings (id, price_from, price_to)
values (1, null, null)
on conflict (id) do nothing;
