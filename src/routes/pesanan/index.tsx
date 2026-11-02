import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RequireShopper } from "@/components/require-auth";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Button } from "@/components/ui/button";
import { formatRupiah } from "@/lib/format";
import { listMyOrders } from "@/lib/server/shop";
import { ORDER_STATUSES, type ShopOrder } from "@/lib/types";
import { PaymentTotals } from "@/components/payment-totals";

export const Route = createFileRoute("/pesanan/")({ component: OrdersGate });

function OrdersGate() {
  return (
    <RequireShopper redirect="/pesanan">
      <OrdersPage />
    </RequireShopper>
  );
}

function OrdersPage() {
  const { user, isPending } = useCurrentUserState();
  const [orders, setOrders] = useState<ShopOrder[] | null>(null);

  useEffect(() => {
    if (!user) return;
    void listMyOrders()
      .then(setOrders)
      .catch(() => setOrders([]));
  }, [user]);

  if (isPending) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <div className="h-8 w-48 rounded-md bg-primary/10" />
      </main>
    );
  }
  if (!user) return <Navigate to="/login" search={{ redirect: "/pesanan" }} />;

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-4xl font-semibold">Pesanan saya</h1>
      <p className="mt-2 text-muted">Buka pesanan untuk melihat detail dan mengunduh invoice PDF.</p>

      {orders && orders.length > 0 ? (
        <div className="mt-6">
          <PaymentTotals orders={orders} />
        </div>
      ) : null}

      {orders === null ? (
        <div className="mt-8 h-32 rounded-xl bg-primary/8" />
      ) : orders.length === 0 ? (
        <div className="mt-10 rounded-2xl bg-surface p-8 text-center shadow-[var(--shadow-border)]">
          <p className="font-medium">Belum ada pesanan</p>
          <p className="mt-1 text-sm text-muted">Belanja dari katalog, lalu checkout setelah masuk.</p>
          <Button asChild className="mt-5">
            <Link to="/katalog">Belanja katalog</Link>
          </Button>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {orders.map((order) => {
            const status = ORDER_STATUSES.find((s) => s.id === order.status)?.label ?? order.status;
            return (
              <li key={order.id}>
                <Link
                  to="/pesanan/$id"
                  params={{ id: order.id }}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface px-4 py-4 shadow-[var(--shadow-border)] transition-[box-shadow] duration-150 hover:shadow-[var(--shadow-border-hover)]"
                >
                  <div>
                    <p className="font-medium tabular-nums">{order.id}</p>
                    <p className="text-sm text-muted">
                      {order.items.length} item · {status} ·{" "}
                      <span className={order.paid ? "text-primary" : "text-accent"}>
                        {order.paid ? "Lunas" : "Belum bayar"}
                      </span>
                    </p>
                  </div>
                  <p className="font-medium tabular-nums">{formatRupiah(order.total)}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
