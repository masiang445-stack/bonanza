import { hashPassword, verifyPassword } from "@better-auth/utils/password";
import { createServerFn } from "@tanstack/react-start";
import { randomUUID } from "node:crypto";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql, withTransaction, type Sql } from "@/lib/db";
import { parseStock, slugify, type CategoryId, type Fruit, type Stock, type Unit } from "@/lib/fruits";
import { validatePassword } from "@/lib/password";
import { isDeliverableDay, todayJakarta } from "@/lib/period";
import { SHOP } from "@/lib/shop";
import type {
  DashboardData,
  LedgerEntry,
  LedgerKind,
  OrderStatus,
  PaymentMethod,
  Profile,
  ShopOrder,
  ShopUser,
  UserRole,
} from "@/lib/types";
import { emailToUsername, isValidUsername, normalizeUsername, usernameToEmail } from "@/lib/username";

type ProfileRow = {
  user_id: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  role: UserRole;
};

type OrderRow = {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  notes: string;
  slot: string;
  payment: PaymentMethod;
  status: OrderStatus;
  paid: boolean;
  subtotal: number;
  delivery: number;
  total: number;
  created_at: string;
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

type ProductRow = {
  slug: string;
  name: string;
  latin: string;
  category: string;
  origin: string;
  unit: Unit;
  price: number;
  description: string;
  taste: string;
  storage: string;
  stock: Stock;
  featured: boolean;
  image: string;
  active: boolean;
};

function toProfile(row: ProfileRow): Profile {
  return {
    userId: row.user_id,
    name: row.name,
    phone: row.phone,
    address: row.address,
    city: row.city,
    role: row.role,
  };
}

function toFruit(row: ProductRow): Fruit {
  return {
    slug: row.slug,
    name: row.name,
    latin: row.latin,
    categories: [row.category as CategoryId],
    unit: row.unit,
    price: row.price,
    description: row.description,
    taste: row.taste,
    storage: row.storage,
    featured: row.featured,
    stock: parseStock(row.stock),
    image: row.image,
    active: row.active,
  };
}

function toOrder(row: OrderRow, items: ItemRow[]): ShopOrder {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    phone: row.phone,
    address: row.address,
    city: row.city,
    notes: row.notes,
    slot: row.slot,
    payment: row.payment,
    status: row.status,
    paid: Boolean(row.paid),
    subtotal: row.subtotal,
    delivery: row.delivery,
    total: row.total,
    createdAt: row.created_at,
    items: items.map((item) => ({
      slug: item.slug,
      name: item.name,
      qty: item.qty,
      price: item.price,
      unit: item.unit,
      cashback: Math.max(0, Math.round(Number(item.cashback) || 0)),
    })),
  };
}

async function loadProfile(userId: string): Promise<Profile> {
  const sql = await getSql();
  const existing = await sql<ProfileRow>`
    select user_id, name, phone, address, city, role from profiles where user_id = ${userId}
  `;
  if (existing[0]) return toProfile(existing[0]);
  await sql`
    insert into profiles (user_id, role) values (${userId}, 'customer')
  `;
  const created = await sql<ProfileRow>`
    select user_id, name, phone, address, city, role from profiles where user_id = ${userId}
  `;
  return toProfile(created[0]!);
}

async function requireStaffOrAdmin(userId: string) {
  const profile = await loadProfile(userId);
  if (profile.role !== "admin" && profile.role !== "staff") throw new Error("Forbidden");
  return profile;
}

async function requireAdmin(userId: string) {
  const profile = await loadProfile(userId);
  if (profile.role !== "admin") throw new Error("Forbidden");
  return profile;
}

async function itemsForOrders(orderIds: string[], sql?: Sql) {
  if (orderIds.length === 0) return [];
  const db = sql ?? (await getSql());
  const placeholders = orderIds.map((_, i) => `$${i + 1}`).join(", ");
  return db.query<ItemRow>(
    `select order_id, slug, name, qty, price, unit, coalesce(cashback, 0)::int as cashback from order_items where order_id in (${placeholders}) order by id`,
    orderIds,
  );
}

function assemble(rows: OrderRow[], items: ItemRow[]): ShopOrder[] {
  const grouped = new Map<string, ItemRow[]>();
  for (const item of items) {
    const list = grouped.get(item.order_id) ?? [];
    list.push(item);
    grouped.set(item.order_id, list);
  }
  return rows.map((row) => toOrder(row, grouped.get(row.id) ?? []));
}

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => loadProfile(context.userId));

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { name: string; phone: string; address: string; city: string }) => input)
  .handler(async ({ context, data }) => {
    await loadProfile(context.userId);
    const sql = await getSql();
    await sql`
      update profiles
      set name = ${data.name.trim()},
          phone = ${data.phone.trim()},
          address = ${data.address.trim()},
          city = ${data.city}
      where user_id = ${context.userId}
    `;
    return loadProfile(context.userId);
  });

export const listProducts = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const profile = await loadProfile(context.userId);
    const sql = await getSql();
    const rows =
      profile.role === "admin"
        ? await sql<ProductRow>`select * from products order by name`
        : await sql<ProductRow>`select * from products where active = true order by name`;
    return rows.map(toFruit);
  });

export const getPricePeriod = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    const sql = await getSql();
    const rows = await sql<{ price_from: string | null; price_to: string | null }>`
      select price_from::text as price_from, price_to::text as price_to
      from shop_settings
      where id = 1
    `;
    return {
      from: String(rows[0]?.price_from ?? "").slice(0, 10),
      to: String(rows[0]?.price_to ?? "").slice(0, 10),
    };
  });

export const savePricePeriod = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { from: string; to: string }) => input)
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    const from = String(data.from ?? "").slice(0, 10);
    const to = String(data.to ?? "").slice(0, 10);
    const hasFrom = /^\d{4}-\d{2}-\d{2}$/.test(from);
    const hasTo = /^\d{4}-\d{2}-\d{2}$/.test(to);
    if (hasFrom !== hasTo) throw new Error("Isi tanggal mulai dan selesai periode harga.");
    if (hasFrom && from > to) throw new Error("Periode harga tidak valid.");
    const sql = await getSql();
    await sql`
      insert into shop_settings (id, price_from, price_to)
      values (1, ${hasFrom ? from : null}, ${hasTo ? to : null})
      on conflict (id) do update set
        price_from = excluded.price_from,
        price_to = excluded.price_to
    `;
    return { from: hasFrom ? from : "", to: hasTo ? to : "" };
  });

export const getProduct = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((slug: string) => slug)
  .handler(async ({ context, data: slug }) => {
    await loadProfile(context.userId);
    const sql = await getSql();
    const rows = await sql<ProductRow>`select * from products where slug = ${slug}`;
    return rows[0] ? toFruit(rows[0]) : null;
  });

export const adminSaveProduct = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (input: {
      slug?: string;
      name: string;
      latin: string;
      category: CategoryId;
      unit: Unit;
      price: number;
      description: string;
      taste: string;
      storage: string;
      stock: Stock;
      featured: boolean;
      image: string;
      active: boolean;
    }) => input,
  )
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    const name = data.name.trim();
    if (!name) throw new Error("Nama buah wajib diisi.");
    const price = Math.round(Number(data.price));
    if (!Number.isFinite(price) || price <= 0) throw new Error("Harga tidak valid.");
    const slug = (data.slug?.trim() || slugify(name)).replace(/[^a-z0-9-]/g, "");
    if (!slug) throw new Error("Slug tidak valid.");
    const stock = data.stock === "soldout" ? "soldout" : "ready";
    const image = data.image.trim();
    if (!image.startsWith("/fruits/") && !image.startsWith("data:image/")) throw new Error("Foto buah tidak valid.");
    if (image.length > 1_200_000) throw new Error("Foto terlalu besar.");
    const sql = await getSql();
    await sql`
      insert into products (
        slug, name, latin, category, origin, unit, price, description, taste, storage, stock, featured, image, active
      ) values (
        ${slug}, ${name}, ${data.latin.trim()}, ${data.category}, '', ${data.unit},
        ${price}, ${data.description.trim()}, ${data.taste.trim()}, ${data.storage.trim()},
        ${stock}, ${data.featured}, ${image}, ${data.active}
      )
      on conflict (slug) do update set
        name = excluded.name,
        latin = excluded.latin,
        category = excluded.category,
        origin = '',
        unit = excluded.unit,
        price = excluded.price,
        description = excluded.description,
        taste = excluded.taste,
        storage = excluded.storage,
        stock = excluded.stock,
        featured = excluded.featured,
        image = excluded.image,
        active = excluded.active
    `;
    return { slug };
  });

export const adminDeleteProduct = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((slug: string) => slug)
  .handler(async ({ context, data: slug }) => {
    await requireAdmin(context.userId);
    const sql = await getSql();
    await sql`delete from products where slug = ${slug}`;
    return { ok: true };
  });

export const placeOrder = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (input: { name: string; deliveryDay: string; notes: string; items: { slug: string; qty: number }[] }) =>
      input,
  )
  .handler(async ({ context, data }) => {
    const profile = await loadProfile(context.userId);
    if (profile.role === "guest") {
      throw new Error("Akun Guest hanya dapat melihat harga.");
    }
    if (profile.role !== "customer" && profile.role !== "dapur") {
      throw new Error("Akun admin/staff tidak dapat berbelanja. Gunakan akun Dapur atau pelanggan.");
    }
    const name = data.name.trim();
    const deliveryDay = data.deliveryDay.trim();
    if (name.length < 2) throw new Error("Nama wajib diisi.");
    if (!isDeliverableDay(deliveryDay, todayJakarta())) {
      throw new Error("Pilih hari pengiriman dalam 31 hari ke depan.");
    }
    const id = `BNZ-${Date.now().toString(36).toUpperCase()}`;
    return withTransaction(async (tx) => {
      const catalog = await tx<ProductRow>`select * from products where active = true`;
      const bySlug = new Map(catalog.map((row) => [row.slug, row]));
      const lines = data.items
        .map((item) => {
          const fruit = bySlug.get(item.slug);
          if (!fruit || item.qty < 1) return null;
          return { fruit, qty: Math.min(500, Math.floor(item.qty)) };
        })
        .filter((line): line is { fruit: ProductRow; qty: number } => line !== null);
      if (lines.length === 0) throw new Error("Keranjang kosong.");
      const subtotal = lines.reduce((sum, line) => sum + line.fruit.price * line.qty, 0);
      if (subtotal < SHOP.minOrder) {
        throw new Error(`Minimal belanja Rp ${SHOP.minOrder.toLocaleString("id-ID")}.`);
      }
      const total = subtotal;
      await tx`
        insert into orders (
          id, user_id, name, phone, address, city, notes, slot, payment,
          status, paid, subtotal, delivery, total
        ) values (
          ${id}, ${context.userId}, ${name}, '', '-', '-',
          ${data.notes.trim()}, ${deliveryDay}, 'cod',
          'baru', false, ${subtotal}, 0, ${total}
        )
      `;
      for (const line of lines) {
        await tx`
          insert into order_items (order_id, slug, name, qty, price, unit)
          values (${id}, ${line.fruit.slug}, ${line.fruit.name}, ${line.qty}, ${line.fruit.price}, ${line.fruit.unit})
        `;
      }
      await tx`
        update profiles set name = ${name} where user_id = ${context.userId}
      `;
      const rows = await tx<OrderRow>`select * from orders where id = ${id} and user_id = ${context.userId}`;
      const items = await itemsForOrders([id], tx);
      const order = assemble(rows, items)[0];
      if (!order) throw new Error("Gagal menyimpan pesanan.");
      return order;
    });
  });

export const listMyOrders = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<OrderRow>`
      select * from orders where user_id = ${context.userId} order by created_at desc
    `;
    const items = await itemsForOrders(
      rows.map((row) => row.id),
      sql,
    );
    return assemble(rows, items);
  });

export const getMyOrder = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((id: string) => id)
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    const profile = await loadProfile(context.userId);
    const rows =
      profile.role === "admin" || profile.role === "staff"
        ? await sql<OrderRow>`select * from orders where id = ${id}`
        : await sql<OrderRow>`select * from orders where id = ${id} and user_id = ${context.userId}`;
    if (!rows[0]) return null;
    const items = await itemsForOrders([id]);
    return assemble(rows, items)[0] ?? null;
  });

export const adminListOrders = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireStaffOrAdmin(context.userId);
    const sql = await getSql();
    const rows = await sql<OrderRow>`select * from orders order by created_at desc`;
    const items = await itemsForOrders(
      rows.map((row) => row.id),
      sql,
    );
    return assemble(rows, items);
  });

export const adminUpdateOrderStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; status: OrderStatus }) => input)
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    const sql = await getSql();
    const current = await sql<OrderRow>`select * from orders where id = ${data.id}`;
    const order = current[0];
    if (!order) throw new Error("Pesanan tidak ditemukan.");
    if (order.status === data.status) return order.status;
    await sql`update orders set status = ${data.status} where id = ${data.id}`;
    return data.status;
  });

export const adminSetPaid = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; paid: boolean }) => input)
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    return withTransaction(async (tx) => {
      const current = await tx<OrderRow>`
        select * from orders where id = ${data.id} for update
      `;
      const order = current[0];
      if (!order) throw new Error("Pesanan tidak ditemukan.");
      if (Boolean(order.paid) === data.paid) return data.paid;
      await tx`update orders set paid = ${data.paid} where id = ${data.id}`;
      if (data.paid) {
        const existing = await tx<{ id: number }>`
          select id from ledger
          where order_id = ${order.id} and kind = 'masuk' and category = 'Penjualan'
          limit 1
        `;
        if (!existing[0]) {
          await tx`
            insert into ledger (user_id, kind, category, amount, note, order_id, occurred_at)
            values (
              ${context.userId}, 'masuk', 'Penjualan', ${order.total},
              ${`Pembayaran ${order.id}`}, ${order.id}, current_date
            )
          `;
        }
      } else {
        await tx`
          delete from ledger
          where order_id = ${order.id} and kind = 'masuk' and category = 'Penjualan'
        `;
      }
      return data.paid;
    });
  });

export const deleteOrder = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id?: string }) => {
    const id = typeof input?.id === "string" ? input.id.trim() : "";
    if (!id) throw new Error("Nomor pesanan tidak valid.");
    return { id };
  })
  .handler(async ({ context, data }) => {
    const profile = await loadProfile(context.userId);
    if (profile.role === "staff") throw new Error("Staff tidak dapat menghapus pesanan.");
    const isAdmin = profile.role === "admin";
    return withTransaction(async (tx) => {
      const rows = isAdmin
        ? await tx<{ id: string }>`select id from orders where id = ${data.id} for update`
        : await tx<{ id: string }>`
            select id from orders
            where id = ${data.id} and user_id = ${context.userId}
            for update
          `;
      if (!rows[0]) throw new Error("Pesanan tidak ditemukan atau sudah dihapus.");
      await tx`delete from order_items where order_id = ${data.id}`;
      await tx`delete from ledger where order_id = ${data.id}`;
      await tx`delete from orders where id = ${data.id}`;
      return { ok: true, id: data.id };
    });
  });

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: { from: string; to: string }) => input)
  .handler(async ({ context, data }): Promise<DashboardData> => {
    await requireStaffOrAdmin(context.userId);
    const sql = await getSql();
    const from = data.from;
    const to = data.to;
    const omset = await sql<{ day: string; total: number }>`
      select created_at::date::text as day, coalesce(sum(total), 0)::int as total
      from orders
      where status <> 'batal' and paid = true
        and created_at::date >= ${from}::date
        and created_at::date <= ${to}::date
      group by created_at::date
      order by day
    `;
    const fruits = await sql<{ slug: string; name: string; qty: number; revenue: number }>`
      select i.slug, i.name, coalesce(sum(i.qty), 0)::int as qty,
             coalesce(sum(i.qty * i.price), 0)::int as revenue
      from order_items i
      join orders o on o.id = i.order_id
      where o.status <> 'batal'
        and o.created_at::date >= ${from}::date
        and o.created_at::date <= ${to}::date
      group by i.slug, i.name
      order by qty desc
    `;
    const totals = await sql<{ masuk: number; keluar: number }>`
      select
        coalesce(sum(case when kind = 'masuk' then amount else 0 end), 0)::int as masuk,
        coalesce(sum(case when kind = 'keluar' then amount else 0 end), 0)::int as keluar
      from ledger
      where occurred_at >= ${from}::date and occurred_at <= ${to}::date
    `;
    const orderCount = await sql<{ n: number }>`
      select count(*)::int as n from orders
      where status <> 'batal'
        and created_at::date >= ${from}::date
        and created_at::date <= ${to}::date
    `;
    const masuk = totals[0]?.masuk ?? 0;
    const keluar = totals[0]?.keluar ?? 0;
    return {
      omset,
      fruits,
      favorites: fruits.slice(0, 5).map((f) => ({ slug: f.slug, name: f.name, qty: f.qty })),
      totals: { masuk, keluar, saldo: masuk - keluar, orders: orderCount[0]?.n ?? 0 },
    };
  });

export const listLedger = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: { from: string; to: string }) => input)
  .handler(async ({ context, data }): Promise<LedgerEntry[]> => {
    await requireStaffOrAdmin(context.userId);
    const sql = await getSql();
    const rows = await sql<{
      id: number;
      kind: LedgerKind;
      category: string;
      amount: number;
      note: string;
      order_id: string | null;
      occurred_at: string;
    }>`
      select id, kind, category, amount, note, order_id, occurred_at::text as occurred_at
      from ledger
      where occurred_at >= ${data.from}::date and occurred_at <= ${data.to}::date
      order by occurred_at desc, id desc
    `;
    return rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      category: row.category,
      amount: row.amount,
      note: row.note,
      orderId: row.order_id,
      occurredAt: row.occurred_at,
    }));
  });

export const addLedgerEntry = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (input: { kind: LedgerKind; category: string; amount: number; note: string; occurredAt: string }) => input,
  )
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    const amount = Math.round(data.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Nominal tidak valid.");
    const sql = await getSql();
    await sql`
      insert into ledger (user_id, kind, category, amount, note, occurred_at)
      values (
        ${context.userId}, ${data.kind}, ${data.category}, ${amount},
        ${data.note.trim()}, ${data.occurredAt}::date
      )
    `;
    return { ok: true };
  });

export const resetLedger = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { password: string; scope: "periode" | "semua"; from?: string; to?: string }) => input)
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    const password = data.password ?? "";
    if (!password) throw new Error("Kata sandi wajib diisi.");
    const sql = await getSql();
    const accounts = await sql<{ password: string | null }>`
      select "password" as password from "account"
      where "userId" = ${context.userId} and "providerId" = 'credential'
      limit 1
    `;
    const hash = accounts[0]?.password;
    if (!hash) throw new Error("Akun ini tidak punya kata sandi.");
    const match = await verifyPassword(hash, password);
    if (!match) throw new Error("Kata sandi salah.");

    if (data.scope === "semua") {
      const removed = await sql<{ id: number }>`delete from ledger returning id`;
      return { deleted: removed.length };
    }
    const from = String(data.from ?? "").slice(0, 10);
    const to = String(data.to ?? "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      throw new Error("Periode tidak valid.");
    }
    const start = from <= to ? from : to;
    const end = from <= to ? to : from;
    const removed = await sql<{ id: number }>`
      delete from ledger
      where occurred_at >= ${start}::date and occurred_at <= ${end}::date
      returning id
    `;
    return { deleted: removed.length };
  });

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<ShopUser[]> => {
    await requireAdmin(context.userId);
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      name: string;
      email: string;
      role: UserRole;
      phone: string;
      paid_count: number;
      unpaid_count: number;
      unpaid_total: number;
    }>`
      select
        u."id" as id,
        u."name" as name,
        u."email" as email,
        coalesce(p.role, 'customer') as role,
        coalesce(p.phone, '') as phone,
        coalesce((
          select count(*)::int from orders o
          where o.user_id = u."id" and o.paid = true and o.status <> 'batal'
        ), 0) as paid_count,
        coalesce((
          select count(*)::int from orders o
          where o.user_id = u."id" and o.paid = false and o.status <> 'batal'
        ), 0) as unpaid_count,
        coalesce((
          select sum(o.total)::int from orders o
          where o.user_id = u."id" and o.paid = false and o.status <> 'batal'
        ), 0) as unpaid_total
      from "user" u
      left join profiles p on p.user_id = u."id"
      order by u."createdAt" desc
    `;
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      username: emailToUsername(row.email),
      role: row.role ?? "customer",
      phone: row.phone ?? "",
      paidCount: row.paid_count,
      unpaidCount: row.unpaid_count,
      unpaidTotal: row.unpaid_total,
    }));
  });

export const adminCreateUser = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { name: string; username: string; password: string; role: UserRole }) => input)
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    return upsertCredentialUser(data, { allowExisting: false });
  });

async function upsertCredentialUser(
  data: { name: string; username: string; password: string; role: UserRole },
  opts: { allowExisting: boolean },
) {
  const username = normalizeUsername(data.username);
  const name = data.name.trim() || username;
  const password = data.password;
  if (!isValidUsername(username)) throw new Error("Username 3–32 karakter, huruf/angka/titik/strip.");
  const passwordError = validatePassword(password);
  if (passwordError) throw new Error(passwordError);
  const email = usernameToEmail(username);
  const hash = await hashPassword(password);
  return withTransaction(async (sql) => {
    const existing = await sql<{ id: string }>`select "id" as id from "user" where "email" = ${email}`;
    if (existing[0]) {
      if (!opts.allowExisting) throw new Error("Username sudah terdaftar.");
      const id = existing[0].id;
      const acc = await sql<{ id: string }>`
        select "id" as id from "account" where "userId" = ${id} and "providerId" = 'credential'
      `;
      if (acc[0]) {
        await sql`
          update "account" set "password" = ${hash}, "updatedAt" = now()
          where "id" = ${acc[0].id}
        `;
      } else {
        await sql`
          insert into "account" (
            "id", "accountId", "providerId", "userId", "password", "createdAt", "updatedAt"
          ) values (
            ${randomUUID()}, ${id}, 'credential', ${id}, ${hash}, now(), now()
          )
        `;
      }
      await sql`
        insert into profiles (user_id, name, role) values (${id}, ${name}, ${data.role})
        on conflict (user_id) do update set name = excluded.name, role = excluded.role
      `;
      await sql`update "user" set "name" = ${name}, "updatedAt" = now() where "id" = ${id}`;
      return { id };
    }
    const id = randomUUID();
    const accountId = randomUUID();
    await sql`
      insert into "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt")
      values (${id}, ${name}, ${email}, true, now(), now())
    `;
    await sql`
      insert into "account" (
        "id", "accountId", "providerId", "userId", "password", "createdAt", "updatedAt"
      ) values (
        ${accountId}, ${id}, 'credential', ${id}, ${hash}, now(), now()
      )
    `;
    await sql`
      insert into profiles (user_id, name, role) values (${id}, ${name}, ${data.role})
      on conflict (user_id) do update set name = excluded.name, role = excluded.role
    `;
    return { id };
  });
}

export const ensureDefaultAdmin = createServerFn({ method: "POST" }).handler(async () => {
  return upsertCredentialUser(
    { name: "Iang", username: "iang", password: "$Bonanza", role: "admin" },
    { allowExisting: true },
  );
});
