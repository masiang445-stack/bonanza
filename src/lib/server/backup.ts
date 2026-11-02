import { verifyPassword } from "@better-auth/utils/password";
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql, withTransaction, type Sql } from "@/lib/db";

const APP = "bonanza";
const VERSION = 1;
const MAX_BYTES = 12_000_000;

type Dump = {
  app: string;
  version: number;
  exportedAt: string;
  tables: Record<string, Record<string, unknown>[]>;
};

const TABLES = [
  "products",
  "invoice_customers",
  "shop_settings",
  "orders",
  "order_items",
  "ledger",
  "profiles",
  "user",
  "account",
] as const;

async function assertAdminPassword(userId: string, password: string) {
  if (!password) throw new Error("Kata sandi wajib diisi.");
  const sql = await getSql();
  const role = await sql<{ role: string }>`select role from profiles where user_id = ${userId}`;
  if (role[0]?.role !== "admin") throw new Error("Hanya admin yang dapat mencadangkan database.");
  const accounts = await sql<{ password: string | null }>`
    select "password" as password from "account"
    where "userId" = ${userId} and "providerId" = 'credential'
    limit 1
  `;
  const hash = accounts[0]?.password;
  if (!hash) throw new Error("Akun ini tidak punya kata sandi.");
  if (!(await verifyPassword(hash, password))) throw new Error("Kata sandi salah.");
}

function cell(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "bigint") return Number(value);
  return value ?? null;
}

function rowsOf(dump: Dump, table: string) {
  const rows = dump.tables[table];
  if (!Array.isArray(rows)) throw new Error("File cadangan tidak lengkap.");
  return rows;
}

async function insertRows(sql: Sql, table: string, columns: string[], rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  const quoted = columns.map((column) => `"${column}"`).join(", ");
  for (const row of rows) {
    const values = columns.map((column) => cell(row[column]));
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
    await sql.query(`insert into ${table} (${quoted}) values (${placeholders})`, values);
  }
}

export const downloadDatabase = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { password: string }) => input)
  .handler(async ({ context, data }) => {
    await assertAdminPassword(context.userId, data.password ?? "");
    const sql = await getSql();
    const tables: Record<string, Record<string, unknown>[]> = {};
    const queries: Record<(typeof TABLES)[number], Promise<Record<string, unknown>[]>> = {
      products: sql`select * from products order by slug`,
      invoice_customers: sql`select * from invoice_customers order by id`,
      shop_settings: sql`select * from shop_settings order by id`,
      orders: sql`select * from orders order by created_at`,
      order_items: sql`select * from order_items order by id`,
      ledger: sql`select * from ledger order by id`,
      profiles: sql`select * from profiles order by user_id`,
      user: sql`select "id", "name", "email", "emailVerified", "image", "createdAt", "updatedAt" from "user" order by "createdAt"`,
      account: sql`
        select "id", "accountId", "providerId", "userId", "password", "createdAt", "updatedAt"
        from "account"
        order by "createdAt"
      `,
    };
    for (const table of TABLES) {
      tables[table] = (await queries[table]).map((row) => {
        const next: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(row)) next[key] = cell(value);
        return next;
      });
    }
    const dump: Dump = { app: APP, version: VERSION, exportedAt: new Date().toISOString(), tables };
    return { filename: `bonanza-database-${dump.exportedAt.slice(0, 10)}.json`, json: JSON.stringify(dump) };
  });

export const restoreDatabase = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { password: string; json: string }) => input)
  .handler(async ({ context, data }) => {
    await assertAdminPassword(context.userId, data.password ?? "");
    if (!data.json || data.json.length > MAX_BYTES) throw new Error("File cadangan terlalu besar atau kosong.");
    let dump: Dump;
    try {
      dump = JSON.parse(data.json) as Dump;
    } catch {
      throw new Error("File cadangan tidak valid.");
    }
    if (dump.app !== APP || dump.version !== VERSION) throw new Error("File ini bukan cadangan Bonanza.");
    for (const table of TABLES) rowsOf(dump, table);

    const userId = context.userId;
    await withTransaction(async (sql) => {
      await sql`delete from order_items`;
      await sql`delete from ledger`;
      await sql`delete from orders`;
      await sql`delete from products`;
      await sql`delete from invoice_customers`;
      await sql`delete from shop_settings`;
      await sql`delete from profiles`;
      await sql`delete from "session" where "userId" <> ${userId}`;
      await sql`delete from "account" where "userId" <> ${userId}`;
      await sql`delete from "user" where "id" <> ${userId}`;

      for (const row of rowsOf(dump, "user")) {
        await sql`
          insert into "user" ("id", "name", "email", "emailVerified", "image", "createdAt", "updatedAt")
          values (
            ${row.id}, ${row.name}, ${row.email}, ${Boolean(row.emailVerified)}, ${row.image ?? null},
            ${row.createdAt}, ${row.updatedAt}
          )
          on conflict ("id") do update set
            "name" = excluded."name",
            "email" = excluded."email",
            "emailVerified" = excluded."emailVerified",
            "image" = excluded."image",
            "updatedAt" = excluded."updatedAt"
        `;
      }
      const accounts = rowsOf(dump, "account");
      if (accounts.some((row) => row.userId === userId)) {
        await sql`delete from "account" where "userId" = ${userId}`;
      }
      await insertRows(
        sql,
        '"account"',
        ["id", "accountId", "providerId", "userId", "password", "createdAt", "updatedAt"],
        accounts,
      );
      await insertRows(
        sql,
        "profiles",
        ["user_id", "name", "phone", "address", "city", "role", "created_at"],
        rowsOf(dump, "profiles"),
      );
      await insertRows(
        sql,
        "products",
        [
          "slug",
          "name",
          "latin",
          "category",
          "origin",
          "unit",
          "price",
          "description",
          "taste",
          "storage",
          "stock",
          "featured",
          "image",
          "active",
          "price_from",
          "price_to",
        ],
        rowsOf(dump, "products"),
      );
      await insertRows(sql, "invoice_customers", ["id", "name", "active", "created_at"], rowsOf(dump, "invoice_customers"));
      await insertRows(sql, "shop_settings", ["id", "price_from", "price_to"], rowsOf(dump, "shop_settings"));
      await insertRows(
        sql,
        "orders",
        [
          "id",
          "user_id",
          "name",
          "phone",
          "address",
          "city",
          "notes",
          "slot",
          "payment",
          "status",
          "paid",
          "subtotal",
          "delivery",
          "total",
          "created_at",
          "cashback_saved",
        ],
        rowsOf(dump, "orders"),
      );
      await insertRows(
        sql,
        "order_items",
        ["order_id", "slug", "name", "qty", "price", "unit", "cashback"],
        rowsOf(dump, "order_items"),
      );
      await insertRows(
        sql,
        "ledger",
        ["user_id", "kind", "category", "amount", "note", "order_id", "occurred_at", "created_at"],
        rowsOf(dump, "ledger"),
      );
      await sql`select setval(pg_get_serial_sequence('invoice_customers', 'id'), coalesce((select max(id) from invoice_customers), 1), (select max(id) from invoice_customers) is not null)`;
    });
    return { ok: true };
  });
