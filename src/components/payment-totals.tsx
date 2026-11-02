import { formatRupiah } from "@/lib/format";
import { paymentTotals } from "@/lib/order-totals";
import type { ShopOrder } from "@/lib/types";

export function PaymentTotals({ orders }: { orders: ShopOrder[] }) {
  const totals = paymentTotals(orders);
  return (
    <section className="grid gap-3 sm:grid-cols-3">
      <Card
        label="Total pembayaran"
        hint={`${totals.paidCount} lunas`}
        value={formatRupiah(totals.paid)}
      />
      <Card
        label="Belum dibayar"
        hint={`${totals.unpaidCount} pesanan`}
        value={formatRupiah(totals.unpaid)}
      />
      <Card label="Semua pesanan" hint="Lunas + belum" value={formatRupiah(totals.all)} />
    </section>
  );
}

function Card({ label, hint, value }: { label: string; hint: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)]">
      <p className="text-xs font-medium uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-2 text-xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </div>
  );
}
