import { formatRupiah } from "@/lib/format";
import { formatDeliveryDay } from "@/lib/period";
import { SHOP } from "@/lib/shop";
import { ORDER_STATUSES, billedUnitPrice, type ShopOrder } from "@/lib/types";

export function Invoice({ order }: { order: ShopOrder }) {
  const status = ORDER_STATUSES.find((s) => s.id === order.status)?.label ?? order.status;
  const date = new Date(order.createdAt);
  const dateLabel = Number.isNaN(date.getTime())
    ? order.createdAt
    : date.toLocaleDateString("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" });
  const totalQty = order.items.reduce((n, item) => n + item.qty, 0);
  const deliveryDay = formatDeliveryDay(order.slot);

  return (
    <article className="overflow-hidden rounded-2xl bg-surface shadow-[var(--shadow-border)]">
      <div className="h-1.5 bg-primary" />
      <div className="p-6 sm:p-8">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-primary pb-6">
          <div>
            <img src="/logo.png" alt={SHOP.legal} className="logo h-11 w-auto" />
            <p className="mt-3 text-sm font-medium text-primary">{SHOP.legal}</p>
            <p className="text-sm text-muted">{SHOP.address}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Invoice</p>
            <p className="mt-1 font-display text-2xl tracking-wide">{order.id}</p>
            <p className="mt-1 text-sm text-muted">{dateLabel}</p>
            <p className={`mt-2 text-sm font-semibold ${order.paid ? "text-primary" : "text-accent"}`}>
              {order.paid ? "LUNAS" : "BELUM DIBAYAR"}
            </p>
          </div>
        </header>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-primary/6 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Pelanggan</p>
            <p className="mt-1 font-medium">{order.name}</p>
          </div>
          <div className="rounded-xl bg-primary/6 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Pengiriman</p>
            <p className="mt-1 font-medium">{deliveryDay}</p>
            <p className="text-sm text-muted">Status kirim: {status}</p>
            {order.notes ? <p className="text-sm text-muted">Catatan: {order.notes}</p> : null}
          </div>
        </div>

        <p className="mt-5 text-sm text-muted">
          Qty total {totalQty} · {order.items.length} jenis · Jumlah pesanan{" "}
          {formatRupiah(order.items.reduce((sum, item) => sum + billedUnitPrice(item) * item.qty, 0))}
        </p>

        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="bg-primary text-left text-[11px] uppercase tracking-wider text-primary-fg">
              <th className="px-3 py-2.5 font-semibold">No</th>
              <th className="px-3 py-2.5 font-semibold">Item</th>
              <th className="px-3 py-2.5 text-right font-semibold">Qty</th>
              <th className="px-3 py-2.5 font-semibold">Satuan</th>
              <th className="px-3 py-2.5 text-right font-semibold">Harga</th>
              <th className="px-3 py-2.5 text-right font-semibold">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, i) => (
              <tr key={item.slug} className="border-b border-border/70 odd:bg-primary/5">
                <td className="px-3 py-3 text-muted">{i + 1}</td>
                <td className="px-3 py-3 font-medium">{item.name}</td>
                <td className="px-3 py-3 text-right tabular-nums">{item.qty}</td>
                <td className="px-3 py-3 text-muted">{item.unit}</td>
                <td className="px-3 py-3 text-right tabular-nums">{formatRupiah(billedUnitPrice(item))}</td>
                <td className="px-3 py-3 text-right tabular-nums font-medium">
                  {formatRupiah(billedUnitPrice(item) * item.qty)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="ml-auto mt-6 w-full max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between rounded-md bg-primary px-3 py-2 font-semibold text-primary-fg">
            <dt>Total pembayaran</dt>
            <dd className="tabular-nums">
              {formatRupiah(
                order.items.reduce((sum, item) => sum + billedUnitPrice(item) * item.qty, 0),
              )}
            </dd>
          </div>
        </dl>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-primary/6 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
              Rekening pembayaran
            </p>
            <p className="mt-1 font-medium">{SHOP.bank.name}</p>
            <p className="font-medium tabular-nums">{SHOP.bank.number}</p>
            <p className="text-sm text-muted">{SHOP.bank.bank}</p>
          </div>
        </div>

        <p className="mt-8 text-xs text-muted">
          Invoice ini adalah bukti pemesanan yang sah dari {SHOP.legal}. Simpan file ini. Pengiriman mengikuti
          slot yang tercantum.
        </p>
      </div>
    </article>
  );
}
