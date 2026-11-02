import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { DeleteOrderButton } from "@/components/delete-order-button";
import { DeliveryCalendar } from "@/components/delivery-calendar";
import { QuantityStepper } from "@/components/quantity-stepper";
import { RequireShopper } from "@/components/require-auth";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cartTotals, useCart } from "@/lib/cart-store";
import { formatRupiah } from "@/lib/format";
import { formatCheckoutDay, todayJakarta } from "@/lib/period";
import { getMyProfile, listMyOrders, placeOrder } from "@/lib/server/shop";
import { SHOP } from "@/lib/shop";
import { ORDER_STATUSES, type ShopOrder } from "@/lib/types";
import { useProducts } from "@/lib/use-products";
import { PaymentTotals } from "@/components/payment-totals";

export const Route = createFileRoute("/checkout")({ component: CheckoutGate });

function CheckoutGate() {
  return (
    <RequireShopper redirect="/checkout">
      <CheckoutPage />
    </RequireShopper>
  );
}

function CheckoutPage() {
  const { user, isPending } = useCurrentUserState();
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const clear = useCart((s) => s.clear);
  const navigate = useNavigate();
  const { products } = useProducts();
  const { lines, total, meetsMin } = cartTotals(items, products);

  const [name, setName] = useState("");
  const [deliveryDay, setDeliveryDay] = useState(todayJakarta);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [orders, setOrders] = useState<ShopOrder[] | null>(null);

  async function reloadOrders() {
    const rows = await listMyOrders();
    setOrders(rows);
  }

  useEffect(() => {
    if (!user) return;
    void getMyProfile()
      .then((profile) => {
        if (profile.name) setName(profile.name);
      })
      .catch(() => undefined);
    void reloadOrders().catch(() => setOrders([]));
  }, [user]);

  const canSubmit = meetsMin && name.trim().length > 1 && Boolean(deliveryDay);

  if (isPending) {
    return (
      <main className="mx-auto max-w-lg px-4 py-24">
        <div className="h-8 w-48 rounded-md bg-primary/10" />
        <div className="mt-4 h-40 rounded-xl bg-primary/8" />
      </main>
    );
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) {
      setError("Lengkapi nama dan hari pengiriman.");
      return;
    }
    setSending(true);
    setError("");
    try {
      const order = await placeOrder({
        data: {
          name: name.trim(),
          deliveryDay,
          notes: notes.trim(),
          items: lines.map((line) => ({ slug: line.fruit.slug, qty: line.qty })),
        },
      });
      clear();
      await reloadOrders();
      await navigate({ to: "/pesanan/$id", params: { id: order.id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat pesanan.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl space-y-12 px-4 py-10 sm:px-6">
      {lines.length === 0 ? (
        <section className="rounded-2xl bg-surface p-8 text-center shadow-[var(--shadow-border)]">
          <h1 className="text-3xl font-semibold">Checkout</h1>
          <p className="mt-2 text-muted">Keranjang kosong. Pesanan yang sudah dibuat bisa dihapus di bawah.</p>
          <Button asChild className="mt-6">
            <Link to="/katalog">Belanja katalog</Link>
          </Button>
        </section>
      ) : (
        <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">
          <form onSubmit={submit} className="space-y-8">
            <div>
              <h1 className="text-4xl font-semibold">Pengiriman</h1>
              <p className="mt-2 text-muted">
                Isi nama dan pilih hari pengiriman. Jumlah buah bisa diubah di ringkasan pesanan.
              </p>
            </div>

            <fieldset className="space-y-4">
              <legend className="font-display text-2xl uppercase tracking-wide">Data pesanan</legend>
              <Field label="Nama" htmlFor="name">
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </Field>
              <Field label="Hari pengiriman" htmlFor="day">
                <DeliveryCalendar value={deliveryDay} onChange={setDeliveryDay} />
              </Field>
              <Field label="Catatan (opsional)" htmlFor="notes">
                <Input
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Opsional"
                />
              </Field>
            </fieldset>

            {error ? <p className="text-sm text-accent">{error}</p> : null}

            <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={!canSubmit || sending}>
              {sending ? "Menyimpan…" : "Buat pesanan"}
            </Button>
          </form>

          <aside className="h-fit rounded-2xl bg-surface p-5 shadow-[var(--shadow-border)] lg:sticky lg:top-24">
            <h2 className="text-xl font-semibold">Pesanan</h2>
            <ul className="mt-4 space-y-4">
              {lines.map((line) => (
                <li key={line.fruit.slug} className="space-y-2">
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="font-medium">{line.fruit.name}</span>
                    <span className="tabular-nums">{formatRupiah(line.lineTotal)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <QuantityStepper value={line.qty} onChange={(qty) => setQty(line.fruit.slug, qty)} min={0} />
                    <button
                      type="button"
                      className="h-11 px-2 text-sm font-medium text-accent"
                      onClick={() => remove(line.fruit.slug)}
                    >
                      Hapus
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1 border-t border-border pt-3 text-sm">
              <div className="flex justify-between font-medium">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatRupiah(total)}</dd>
              </div>
            </dl>
            {!meetsMin ? (
              <p className="mt-3 text-xs text-muted">Minimal belanja {formatRupiah(SHOP.minOrder)}.</p>
            ) : null}
          </aside>
        </div>
      )}

      <section>
        <h2 className="text-2xl font-semibold">Pesanan saya</h2>
        <p className="mt-1 text-sm text-muted">Hapus pesanan yang sudah dibuat, atau buka invoice.</p>
        {orders && orders.length > 0 ? (
          <div className="mt-4">
            <PaymentTotals orders={orders} />
          </div>
        ) : null}
        {orders === null ? (
          <div className="mt-4 h-28 rounded-xl bg-primary/8" />
        ) : orders.length === 0 ? (
          <div className="mt-4 rounded-2xl bg-surface p-6 text-sm text-muted shadow-[var(--shadow-border)]">
            Belum ada pesanan tersimpan.
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {orders.map((order) => {
              const status = ORDER_STATUSES.find((s) => s.id === order.status)?.label ?? order.status;
              return (
                <li
                  key={order.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-2xl bg-surface px-4 py-4 shadow-[var(--shadow-border)]"
                >
                  <div className="min-w-0">
                    <p className="font-medium tabular-nums">{order.id}</p>
                    <p className="text-sm text-muted">
                      {formatCheckoutDay(order.slot)} · {status} ·{" "}
                      <span className={order.paid ? "text-primary" : "text-accent"}>
                        {order.paid ? "Lunas" : "Belum bayar"}
                      </span>
                    </p>
                    <ul className="mt-1 text-sm text-muted">
                      {order.items.map((item) => (
                        <li key={item.slug}>
                          {item.qty} {item.unit} {item.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <p className="font-medium tabular-nums">{formatRupiah(order.total)}</p>
                    <Link
                      to="/pesanan/$id"
                      params={{ id: order.id }}
                      className="text-sm font-medium text-primary"
                    >
                      Invoice
                    </Link>
                    <DeleteOrderButton
                      orderId={order.id}
                      onDeleted={(id) =>
                        setOrders((prev) => (prev ?? []).filter((row) => row.id !== id))
                      }
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
