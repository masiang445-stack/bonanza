import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql, withTransaction, type Sql } from "@/lib/db";
import { todayJakarta } from "@/lib/period";
import {
  INVOICE_UNITS,
  maxQtyForUnit,
  type InvoiceUnit,
  type ManualInvoice,
  type ManualInvoiceCustomer,
  type OrderLine,
} from "@/lib/types";

const MANUAL_USER = "manual";

type CustomerRow = { id: number; name: string; active: boolean };
type OrderHead = {
  id: string;
  name: string;
  notes: string;
  slot: string;
  paid: boolean;
  status: string;
  subtotal: number;
  total: number;
  created_at: string;
  invoice_date: string;
};
type ItemRow = {
  order_id: string;
  slug: string;
  name: string;
  qty: number;
  price: number;
  unit: string;
  cashback: number;
};

type SaveInput = {
  id?: string;
  customerId: number;
  notes: string;
  invoiceDate: string;
  deliveryDate: string;
  items: { name: string; qty: number; price: number; unit: string; cashback?: number }[];
};

async function assertAdmin(userId: string) {
  const sql = await getSql();
  const rows = await sql<{ role: string }>`select role from profiles where user_id = ${userId}`;
  if (rows[0]?.role !== "admin") throw new Error("Forbidden");
}

function isoDate(value: string | undefined, fallback: string) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback;
}

function parseUnit(value: string): InvoiceUnit {
  return INVOICE_UNITS.includes(value as InvoiceUnit) ? (value as InvoiceUnit) : "Kg";
}

function lineKey(name: string, unit: string, price: number, cashback: number) {
  return `${name.trim().toLowerCase()}|${unit}|${price}|${cashback}`;
}

function asMoney(value: unknown) {
  return Math.max(0, Math.round(Number(value) || 0));
}

function clampQty(unit: string, qty: number) {
  return Math.min(maxQtyForUnit(unit), Math.max(0, Math.floor(qty)));
}

function toInvoice(row: OrderHead, items: OrderLine[], customerId: number): ManualInvoice {
  return {
    id: row.id,
    customerId,
    customerName: row.name,
    notes: row.notes,
    paid: Boolean(row.paid),
    subtotal: row.subtotal,
    total: row.total,
    createdAt: row.created_at,
    invoiceDate: row.invoice_date,
    deliveryDate: row.slot,
    items,
  };
}

async function itemsFor(sql: Sql, ids: string[]) {
  if (ids.length === 0) return [];
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ");
  return sql.query<ItemRow>(
    `select order_id, slug, name, qty, price, unit, coalesce(cashback, 0)::int as cashback from order_items where order_id in (${placeholders}) order by id`,
    ids,
  );
}

async function customerIdFor(sql: Sql, name: string) {
  const rows = await sql<{ id: number }>`
    select id from invoice_customers where name = ${name} and active = true limit 1
  `;
  return rows[0]?.id ?? 0;
}

async function loadInvoice(sql: Sql, id: string) {
  const rows = await sql<OrderHead>`
    select id, name, notes, slot, paid, status, subtotal, total,
           created_at::text as created_at, (created_at AT TIME ZONE 'Asia/Jakarta')::date::text as invoice_date
    from orders
    where id = ${id} and user_id = ${MANUAL_USER}
  `;
  if (!rows[0]) return null;
  const items = await itemsFor(sql, [id]);
  const customerId = await customerIdFor(sql, rows[0].name);
  return toInvoice(
    rows[0],
    items.map((item) => ({
      slug: item.slug,
      name: item.name,
      qty: item.qty,
      price: item.price,
      unit: item.unit,
      cashback: asMoney(item.cashback),
    })),
    customerId,
  );
}

async function writeItems(sql: Sql, id: string, lines: OrderLine[]) {
  await sql`delete from order_items where order_id = ${id}`;
  for (const line of lines) {
    await sql`
      insert into order_items (order_id, slug, name, qty, price, unit, cashback)
      values (${id}, ${line.slug}, ${line.name}, ${line.qty}, ${line.price}, ${line.unit}, ${asMoney(line.cashback)})
    `;
  }
  const total = lines.reduce((sum, line) => sum + (line.price + asMoney(line.cashback)) * line.qty, 0);
  await sql`update orders set subtotal = ${total}, delivery = 0, total = ${total} where id = ${id}`;
  return total;
}

function resolveLines(items: SaveInput["items"]): OrderLine[] {
  const merged = new Map<string, OrderLine>();
  for (const item of items) {
    const name = item.name.trim();
    const unit = parseUnit(item.unit);
    const qty = clampQty(unit, Number(item.qty));
    const price = Math.round(Number(item.price));
    const cashback = asMoney(item.cashback);
    if (!name || qty < 1 || !Number.isFinite(price) || price < 0) continue;
    const slug = lineKey(name, unit, price, cashback).replace(/[^a-z0-9|]+/g, "-").slice(0, 80);
    const prev = merged.get(slug);
    if (prev) prev.qty = clampQty(unit, prev.qty + qty);
    else merged.set(slug, { slug, name, qty, price, unit, cashback });
  }
  return [...merged.values()];
}

export const listInvoiceCustomers = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<ManualInvoiceCustomer[]> => {
    await assertAdmin(context.userId);
    const sql = await getSql();
    const rows = await sql<CustomerRow>`
      select id, name, active from invoice_customers where active = true order by name
    `;
    return rows.map((row) => ({ id: row.id, name: row.name, active: row.active }));
  });

export const saveInvoiceCustomer = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id?: number; name: string }) => input)
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const name = data.name.trim().replace(/\s+/g, " ").toUpperCase();
    if (name.length < 3) throw new Error("Nama pelanggan minimal 3 karakter.");
    const sql = await getSql();
    if (data.id) {
      const prev = await sql<{ name: string }>`select name from invoice_customers where id = ${data.id}`;
      await sql`update invoice_customers set name = ${name} where id = ${data.id}`;
      if (prev[0] && prev[0].name !== name) {
        await sql`
          update orders set name = ${name}
          where user_id = ${MANUAL_USER} and name = ${prev[0].name}
        `;
      }
      return { id: data.id, name };
    }
    const inserted = await sql<{ id: number }>`
      insert into invoice_customers (name) values (${name})
      on conflict (name) do update set active = true
      returning id
    `;
    return { id: inserted[0]!.id, name };
  });

export const getManualInvoice = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((id: string) => id)
  .handler(async ({ context, data: id }) => {
    await assertAdmin(context.userId);
    const invoice = await loadInvoice(await getSql(), id);
    if (!invoice) throw new Error("Invoice tidak ditemukan.");
    return invoice;
  });

export const listManualInvoices = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: { customerId?: number }) => input)
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const sql = await getSql();
    let customerName: string | undefined;
    if (data.customerId) {
      const found = await sql<CustomerRow>`
        select id, name, active from invoice_customers where id = ${data.customerId}
      `;
      customerName = found[0]?.name;
    }
    const rows = customerName
      ? await sql<OrderHead>`
          select id, name, notes, slot, paid, status, subtotal, total,
                 created_at::text as created_at, (created_at AT TIME ZONE 'Asia/Jakarta')::date::text as invoice_date
          from orders
          where user_id = ${MANUAL_USER} and name = ${customerName}
          order by created_at desc
        `
      : await sql<OrderHead>`
          select id, name, notes, slot, paid, status, subtotal, total,
                 created_at::text as created_at, (created_at AT TIME ZONE 'Asia/Jakarta')::date::text as invoice_date
          from orders
          where user_id = ${MANUAL_USER}
          order by created_at desc
        `;
    const items = await itemsFor(sql, rows.map((row) => row.id));
    const grouped = new Map<string, OrderLine[]>();
    for (const item of items) {
      const list = grouped.get(item.order_id) ?? [];
      list.push({
        slug: item.slug,
        name: item.name,
        qty: item.qty,
        price: item.price,
        unit: item.unit,
        cashback: asMoney(item.cashback),
      });
      grouped.set(item.order_id, list);
    }
    const customers = await sql<CustomerRow>`select id, name, active from invoice_customers`;
    const byName = new Map(customers.map((row) => [row.name, row.id]));
    return rows.map((row) => toInvoice(row, grouped.get(row.id) ?? [], byName.get(row.name) ?? 0));
  });

async function saveInside(tx: Sql, data: SaveInput) {
  const customer = await tx<CustomerRow>`
    select id, name, active from invoice_customers where id = ${data.customerId}
  `;
  if (!customer[0]) throw new Error("Pelanggan tidak ditemukan.");
  const lines = resolveLines(data.items);
  if (lines.length === 0) throw new Error("Tambahkan minimal satu buah.");
  const today = todayJakarta();
  const invoiceDate = isoDate(data.invoiceDate, today);
  const deliveryDate = isoDate(data.deliveryDate, today);
  const createdAt = `${invoiceDate}T00:00:00+07:00`;
  let id = data.id?.trim();
  if (id) {
    const existing = await tx<{ id: string; paid: boolean }>`
      select id, paid from orders where id = ${id} and user_id = ${MANUAL_USER} for update
    `;
    if (!existing[0]) throw new Error("Invoice tidak ditemukan.");
    if (existing[0].paid) throw new Error("Invoice lunas tidak dapat diubah.");
    await tx`
      update orders
      set name = ${customer[0].name}, notes = ${data.notes.trim()}, slot = ${deliveryDate},
          payment = 'transfer', created_at = ${createdAt}::timestamptz
      where id = ${id}
    `;
  } else {
    id = `INV-${Date.now().toString(36).toUpperCase()}`;
    await tx`
      insert into orders (
        id, user_id, name, phone, address, city, notes, slot, payment,
        status, paid, subtotal, delivery, total, created_at
      ) values (
        ${id}, ${MANUAL_USER}, ${customer[0].name}, '', '-', '-',
        ${data.notes.trim()}, ${deliveryDate}, 'transfer',
        'baru', false, 0, 0, 0, ${createdAt}::timestamptz
      )
    `;
  }
  await writeItems(tx, id, lines);
  const saved = await loadInvoice(tx, id);
  if (!saved) throw new Error("Gagal menyimpan invoice.");
  return saved;
}

export const saveManualInvoice = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: SaveInput) => input)
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    return withTransaction((tx) => saveInside(tx, data));
  });

export const payManualInvoice = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: SaveInput) => input)
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    return withTransaction(async (tx) => {
      const saved = await saveInside(tx, data);
      const existing = await tx<{ id: number }>`
        select id from ledger
        where order_id = ${saved.id} and kind = 'masuk' and category = 'Penjualan'
        limit 1
      `;
      await tx`
        update orders
        set paid = true, status = 'selesai'
        where id = ${saved.id} and user_id = ${MANUAL_USER}
      `;
      if (!existing[0]) {
        await tx`
          insert into ledger (user_id, kind, category, amount, note, order_id, occurred_at)
          values (
            ${context.userId}, 'masuk', 'Penjualan', ${saved.total},
            ${`Pembayaran ${saved.id} · ${saved.customerName}`}, ${saved.id}, ${saved.invoiceDate}::date
          )
        `;
      }
      return { ...saved, paid: true };
    });
  });

export const mergeManualInvoices = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { customerId: number }) => input)
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    return withTransaction(async (tx) => {
      const customer = await tx<CustomerRow>`
        select id, name, active from invoice_customers where id = ${data.customerId}
      `;
      if (!customer[0]) throw new Error("Pelanggan tidak ditemukan.");
      const unpaid = await tx<{ id: string }>`
        select id from orders
        where user_id = ${MANUAL_USER} and name = ${customer[0].name} and paid = false
        order by created_at
        for update
      `;
      if (unpaid.length < 2) throw new Error("Butuh minimal dua invoice belum lunas untuk digabung.");
      const ids = unpaid.map((row) => row.id);
      const target = ids[0]!;
      const items = await itemsFor(tx, ids);
      const merged = new Map<string, OrderLine>();
      for (const item of items) {
        const cashback = asMoney(item.cashback);
        const unit = parseUnit(item.unit);
        const slug = lineKey(item.name, unit, item.price, cashback);
        const prev = merged.get(slug);
        if (prev) prev.qty = clampQty(unit, prev.qty + item.qty);
        else {
          merged.set(slug, {
            slug,
            name: item.name,
            qty: clampQty(unit, item.qty),
            price: item.price,
            unit,
            cashback,
          });
        }
      }
      await writeItems(tx, target, [...merged.values()]);
      for (const id of ids.slice(1)) {
        await tx`delete from order_items where order_id = ${id}`;
        await tx`delete from ledger where order_id = ${id}`;
        await tx`delete from orders where id = ${id} and user_id = ${MANUAL_USER}`;
      }
      const saved = await loadInvoice(tx, target);
      if (!saved) throw new Error("Gagal menggabung invoice.");
      return saved;
    });
  });

export const listCashbackRecap = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: { from?: string; to?: string }) => input)
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const sql = await getSql();
    const from = isoDate(data.from, "");
    const to = isoDate(data.to, "");
    const rows =
      from && to
        ? await sql<{ id: string; name: string; paid: boolean; invoice_date: string; cashback: number }>`
            select o.id, o.name, o.paid,
                   (o.created_at AT TIME ZONE 'Asia/Jakarta')::date::text as invoice_date,
                   coalesce(sum(i.cashback * i.qty), 0)::int as cashback
            from orders o
            join order_items i on i.order_id = o.id
            where o.user_id = ${MANUAL_USER}
              and coalesce(o.cashback_saved, false) = false
              and (o.created_at AT TIME ZONE 'Asia/Jakarta')::date >= ${from}::date
              and (o.created_at AT TIME ZONE 'Asia/Jakarta')::date <= ${to}::date
            group by o.id, o.name, o.paid, (o.created_at AT TIME ZONE 'Asia/Jakarta')::date
            having coalesce(sum(i.cashback * i.qty), 0) > 0
            order by invoice_date desc, o.name
          `
        : await sql<{ id: string; name: string; paid: boolean; invoice_date: string; cashback: number }>`
            select o.id, o.name, o.paid,
                   (o.created_at AT TIME ZONE 'Asia/Jakarta')::date::text as invoice_date,
                   coalesce(sum(i.cashback * i.qty), 0)::int as cashback
            from orders o
            join order_items i on i.order_id = o.id
            where o.user_id = ${MANUAL_USER}
              and coalesce(o.cashback_saved, false) = false
            group by o.id, o.name, o.paid, (o.created_at AT TIME ZONE 'Asia/Jakarta')::date
            having coalesce(sum(i.cashback * i.qty), 0) > 0
            order by invoice_date desc, o.name
          `;
    return rows.map((row) => ({
      id: row.id,
      customerName: row.name,
      invoiceDate: row.invoice_date,
      paid: Boolean(row.paid),
      cashback: asMoney(row.cashback),
    }));
  });

export const saveCashback = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => id)
  .handler(async ({ context, data: id }) => {
    await assertAdmin(context.userId);
    const sql = await getSql();
    await sql`
      update orders set cashback_saved = true
      where id = ${id} and user_id = ${MANUAL_USER}
    `;
    return { ok: true };
  });
