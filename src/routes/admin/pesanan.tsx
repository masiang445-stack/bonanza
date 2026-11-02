import { createFileRoute, Link } from "@tanstack/react-router";
import { FileDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { DeleteOrderButton } from "@/components/delete-order-button";
import { PaymentTotals } from "@/components/payment-totals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { exportOrdersPdf } from "@/lib/export-files";
import { formatRupiah } from "@/lib/format";
import { formatDeliveryDay, formatDdMmYyyy, formatPeriodLabel, rangeForPeriod, todayJakarta, type PeriodId } from "@/lib/period";
import { adminListOrders, adminSetPaid, adminUpdateOrderStatus, getMyProfile } from "@/lib/server/shop";
import { ORDER_STATUSES, type OrderStatus, type ShopOrder } from "@/lib/types";

export const Route = createFileRoute("/admin/pesanan")({ component: AdminOrders });

const DATE_FILTERS: { id: PeriodId | "semua"; label: string }[] = [
  { id: "semua", label: "Semua tanggal" },
  { id: "harian", label: "Harian" },
  { id: "mingguan", label: "Mingguan" },
  { id: "bulanan", label: "Bulanan" },
  { id: "kustom", label: "Kustom" },
];

function orderDay(order: ShopOrder) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(order.slot)) return order.slot;
  return order.createdAt.slice(0, 10);
}

function AdminOrders() {
  const [orders, setOrders] = useState<ShopOrder[] | null>(null);
  const [filter, setFilter] = useState<"semua" | "lunas" | "belum">("semua");
  const [dateFilter, setDateFilter] = useState<PeriodId | "semua">("semua");
  const [customFrom, setCustomFrom] = useState(todayJakarta);
  const [customTo, setCustomTo] = useState(todayJakarta);
  const [customer, setCustomer] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const range = dateFilter === "semua" ? null : rangeForPeriod(dateFilter, customFrom, customTo);
  const periodLabel = range ? formatPeriodLabel(range.from, range.to) : "Semua tanggal";

  function downloadName() {
    if (!range) return "Pesanan semua.pdf";
    const from = formatDdMmYyyy(range.from).replaceAll("/", "-");
    const to = formatDdMmYyyy(range.to).replaceAll("/", "-");
    return from === to ? `Pesanan ${from}.pdf` : `Pesanan ${from} - ${to}.pdf`;
  }

  async function reload() {
    const rows = await adminListOrders();
    setOrders(rows);
  }

  useEffect(() => {
    void reload().catch(() => setOrders([]));
    void getMyProfile()
      .then((profile) => setIsAdmin(profile.role === "admin"))
      .catch(() => setIsAdmin(false));
  }, []);

  async function onStatus(id: string, status: OrderStatus) {
    await adminUpdateOrderStatus({ data: { id, status } });
    await reload();
  }

  async function onPaid(id: string, paid: boolean) {
    try {
      await adminSetPaid({ data: { id, paid } });
      toast.success(
        paid ? "Lunas. Nominal masuk ke pemasukan keuangan." : "Status diubah menjadi belum bayar.",
      );
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengubah status bayar.");
    }
  }

  const names = useMemo(() => {
    if (!orders) return [];
    return [...new Set(orders.map((order) => order.name).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, "id"),
    );
  }, [orders]);

  if (!orders) return <div className="h-48 rounded-2xl bg-primary/8" />;

  const scoped = orders.filter((order) => {
    if (range) {
      const day = orderDay(order);
      if (day < range.from || day > range.to) return false;
    }
    if (customer && order.name !== customer) return false;
    return true;
  });

  const visible = scoped.filter((order) => {
    if (filter === "lunas") return order.paid;
    if (filter === "belum") return !order.paid && order.status !== "batal";
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="hide-scrollbar flex gap-2 overflow-x-auto">
        {DATE_FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              if (item.id === "kustom") {
                const next = rangeForPeriod(
                  dateFilter === "semua" ? "harian" : dateFilter,
                  customFrom,
                  customTo,
                );
                setCustomFrom(next.from);
                setCustomTo(next.to);
              }
              setDateFilter(item.id);
            }}
            className={
              dateFilter === item.id
                ? "inline-flex h-11 shrink-0 items-center rounded-full bg-primary px-4 text-sm font-medium text-primary-fg"
                : "inline-flex h-11 shrink-0 items-center rounded-full bg-surface px-4 text-sm font-medium shadow-[var(--shadow-border)]"
            }
          >
            {item.label}
          </button>
        ))}
      </div>

      {dateFilter === "kustom" ? (
        <div className="grid grid-cols-2 gap-3 sm:max-w-md">
          <div className="space-y-1.5">
            <Label htmlFor="from">Dari tanggal</Label>
            <Input
              id="from"
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="to">Sampai tanggal</Label>
            <Input
              id="to"
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
            />
          </div>
        </div>
      ) : null}

      <div className="max-w-md space-y-1.5">
        <Label htmlFor="customer">Nama pelanggan</Label>
        <select
          id="customer"
          value={customer}
          onChange={(e) => setCustomer(e.target.value)}
          className="flex h-11 w-full rounded-md border border-border bg-surface px-3 text-sm shadow-[var(--shadow-border)]"
        >
          <option value="">Semua pelanggan</option>
          {names.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: "semua", label: "Semua" },
            { id: "belum", label: "Belum bayar" },
            { id: "lunas", label: "Lunas" },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={
              filter === item.id
                ? "inline-flex h-11 items-center rounded-full bg-primary px-4 text-sm font-medium text-primary-fg"
                : "inline-flex h-11 items-center rounded-full bg-surface px-4 text-sm font-medium shadow-[var(--shadow-border)]"
            }
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          Data unduhan: {periodLabel}
          {customer ? ` · ${customer}` : ""}
          {filter === "lunas" ? " · Lunas" : filter === "belum" ? " · Belum bayar" : ""}
        </p>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            if (visible.length === 0) {
              toast.error("Tidak ada pesanan pada periode ini.");
              return;
            }
            const note = [
              periodLabel,
              customer ? `Pelanggan ${customer}` : "",
              filter === "lunas" ? "Lunas" : filter === "belum" ? "Belum bayar" : "",
            ]
              .filter(Boolean)
              .join(" · ");
            void exportOrdersPdf(visible, note, downloadName()).then(
              () => toast.success("PDF pesanan diunduh."),
              () => toast.error("Gagal mengunduh PDF."),
            );
          }}
        >
          <FileDown className="size-4" />
          Unduh PDF
        </Button>
      </div>

      <PaymentTotals orders={scoped} />

      {visible.length === 0 ? (
        <div className="rounded-2xl bg-surface p-8 text-center shadow-[var(--shadow-border)]">
          <p className="font-medium">Tidak ada pesanan pada filter ini</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-surface shadow-[var(--shadow-border)]">
          <table className="w-full min-w-[52rem] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted">
                <th className="px-4 py-3 font-medium">Invoice</th>
                <th className="px-4 py-3 font-medium">Pelanggan</th>
                <th className="px-4 py-3 font-medium">Hari kirim</th>
                <th className="px-4 py-3 font-medium">Qty</th>
                <th className="px-4 py-3 font-medium">Total pembayaran</th>
                <th className="px-4 py-3 font-medium">Status bayar</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {visible.map((order) => {
                const totalQty = order.items.reduce((n, item) => n + item.qty, 0);
                const status = ORDER_STATUSES.find((s) => s.id === order.status)?.label ?? order.status;
                return (
                  <tr key={order.id} className="border-b border-border/70 align-top">
                    <td className="px-4 py-3 tabular-nums">{order.id}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{order.name}</p>
                      {order.notes ? <p className="text-xs text-muted">{order.notes}</p> : null}
                    </td>
                    <td className="px-4 py-3">{formatDeliveryDay(order.slot)}</td>
                    <td className="px-4 py-3">
                      <ul className="space-y-0.5">
                        {order.items.map((item) => (
                          <li key={item.slug}>
                            {item.qty} {item.unit} {item.name}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-1 text-xs text-muted">Total qty {totalQty}</p>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{formatRupiah(order.total)}</td>
                    <td className="px-4 py-3">
                      {isAdmin ? (
                        <select
                          value={order.paid ? "lunas" : "belum"}
                          onChange={(e) => void onPaid(order.id, e.target.value === "lunas")}
                          className="h-11 rounded-md border border-border bg-bg px-2 text-sm"
                        >
                          <option value="belum">Belum bayar</option>
                          <option value="lunas">Lunas</option>
                        </select>
                      ) : (
                        <span className={order.paid ? "text-primary" : "text-accent"}>
                          {order.paid ? "Lunas" : "Belum bayar"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isAdmin ? (
                        <select
                          value={order.status}
                          onChange={(e) => void onStatus(order.id, e.target.value as OrderStatus)}
                          className="h-11 rounded-md border border-border bg-bg px-2 text-sm"
                        >
                          {ORDER_STATUSES.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span>{status}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-col items-end gap-2">
                        <Link
                          to="/pesanan/$id"
                          params={{ id: order.id }}
                          className="text-sm font-medium text-primary"
                        >
                          Invoice
                        </Link>
                        {isAdmin ? (
                          <DeleteOrderButton
                            orderId={order.id}
                            onDeleted={(id) =>
                              setOrders((prev) => (prev ?? []).filter((row) => row.id !== id))
                            }
                          />
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
