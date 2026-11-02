insert into orders (
  id, user_id, name, phone, address, city, notes, slot, payment,
  status, paid, subtotal, delivery, total, created_at
)
select
  i.id,
  'manual',
  c.name,
  '',
  '-',
  '-',
  i.notes,
  i.delivery_date::text,
  'transfer',
  case when i.paid then 'selesai' else 'baru' end,
  i.paid,
  i.subtotal,
  0,
  i.total,
  i.invoice_date::timestamptz
from manual_invoices i
join invoice_customers c on c.id = i.customer_id
on conflict (id) do nothing;

insert into order_items (order_id, slug, name, qty, price, unit)
select mi.invoice_id, mi.slug, mi.name, mi.qty, mi.price, mi.unit
from manual_invoice_items mi
join orders o on o.id = mi.invoice_id
where not exists (
  select 1 from order_items oi where oi.order_id = mi.invoice_id
);
