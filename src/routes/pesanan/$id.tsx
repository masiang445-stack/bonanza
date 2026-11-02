import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { FileDown, Printer } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { DeleteOrderButton } from "@/components/delete-order-button";
import { Invoice } from "@/components/invoice";
import { Button } from "@/components/ui/button";
import { exportInvoicePdf } from "@/lib/export-files";
import { adminSetPaid, getMyOrder, getMyProfile } from "@/lib/server/shop";
import type { ShopOrder } from "@/lib/types";

export const Route = createFileRoute("/pesanan/$id")({ component: OrderDetailPage });

function OrderDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user, isPending } = useCurrentUserState();
  const [order, setOrder] = useState<ShopOrder | null | undefined>(undefined);
  const [role, setRole] = useState<"admin" | "staff" | "customer">("customer");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!user) return;
    void getMyOrder({ data: id })
      .then(setOrder)
      .catch(() => setOrder(null));
    void getMyProfile()
      .then((profile) => setRole(profile.role === "admin" || profile.role === "staff" ? profile.role : "customer"))
      .catch(() => setRole("customer"));
  }, [user, id]);

  if (isPending || order === undefined) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <div className="h-8 w-48 rounded-md bg-primary/10" />
        <div className="mt-6 h-64 rounded-2xl bg-primary/8" />
      </main>
    );
  }

  if (!user) return <Navigate to="/login" search={{ redirect: `/pesanan/${id}` }} />;

  if (!order) {
    return (
      <main className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="text-3xl font-semibold">Invoice tidak ditemukan</h1>
        <p className="mt-2 text-muted">Pesanan ini bukan milik akun Anda, atau nomornya salah.</p>
        <Button asChild className="mt-6">
          {role === "admin" || role === "staff" ? (
            <Link to="/admin/pesanan">Kembali</Link>
          ) : (
            <Link to="/katalog">Kembali</Link>
          )}
        </Button>
      </main>
    );
  }

  async function onPaid(paid: boolean) {
    if (!order) return;
    try {
      await adminSetPaid({ data: { id: order.id, paid } });
      setOrder({ ...order, paid });
      toast.success(
        paid ? "Lunas. Nominal masuk ke pemasukan keuangan." : "Status diubah menjadi belum bayar.",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengubah status bayar.");
    }
  }

  async function onPdf() {
    setDownloading(true);
    try {
      await exportInvoicePdf(order!);
      toast.success("Invoice PDF diunduh");
    } catch {
      toast.error("Gagal mengunduh PDF");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 no-print">
        {role === "admin" || role === "staff" ? (
          <Link to="/admin/pesanan" className="text-sm font-medium text-muted hover:text-fg">
            Kembali ke pesanan admin
          </Link>
        ) : (
          <Link to="/checkout" className="text-sm font-medium text-muted hover:text-fg">
            Kembali ke checkout
          </Link>
        )}
        <div className="flex flex-wrap gap-2">
          {role === "admin" ? (
            <select
              value={order.paid ? "lunas" : "belum"}
              onChange={(e) => void onPaid(e.target.value === "lunas")}
              className="h-11 rounded-md border border-border bg-bg px-3 text-sm"
            >
              <option value="belum">Belum bayar</option>
              <option value="lunas">Lunas</option>
            </select>
          ) : null}
          {role !== "staff" ? (
            <DeleteOrderButton
              orderId={order.id}
              variant="button"
              onDeleted={() => {
                void navigate({ to: role === "admin" ? "/admin/pesanan" : "/checkout" });
              }}
            />
          ) : null}
          <Button type="button" variant="secondary" onClick={() => window.print()}>
            <Printer className="size-4" />
            Cetak
          </Button>
          <Button type="button" onClick={() => void onPdf()} disabled={downloading}>
            <FileDown className="size-4" />
            {downloading ? "Menyiapkan…" : "Unduh PDF"}
          </Button>
        </div>
      </div>
      <Invoice order={order} />
    </main>
  );
}
