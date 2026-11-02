alter table manual_invoices
  add column if not exists invoice_date date not null default current_date;
alter table manual_invoices
  add column if not exists delivery_date date not null default current_date;
