import { createFileRoute, Link, Navigate, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getMyProfile } from "@/lib/server/shop";
import type { Profile } from "@/lib/types";
import { cn } from "@/lib/cn";

export const Route = createFileRoute("/admin")({ component: AdminLayout });

const ADMIN_TABS = [
  { to: "/admin", label: "Dashboard" },
  { to: "/admin/pesanan", label: "Pesanan" },
  { to: "/admin/invoice", label: "Invoice" },
  { to: "/admin/cashback", label: "Cashback" },
  { to: "/admin/produk", label: "Buah" },
  { to: "/admin/pengguna", label: "Pengguna" },
  { to: "/admin/keuangan", label: "Keuangan" },
] as const;

const STAFF_TABS = [
  { to: "/admin", label: "Dashboard" },
  { to: "/admin/pesanan", label: "Pesanan" },
  { to: "/admin/keuangan", label: "Keuangan" },
] as const;

function AdminLayout() {
  const { user, isPending } = useCurrentUserState();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    void getMyProfile()
      .then(setProfile)
      .catch(() => setProfile(null));
  }, [user]);

  if (isPending || (user && profile === undefined)) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-16">
        <div className="h-8 w-40 rounded-md bg-primary/10" />
      </main>
    );
  }

  if (!user) return <RedirectToSignIn />;

  const role = profile?.role;
  if (role !== "admin" && role !== "staff") {
    return (
      <main className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="text-3xl font-semibold">Khusus internal</h1>
        <p className="mt-2 text-muted">Akun pelanggan tidak dapat membuka halaman ini.</p>
        <Link to="/" className="mt-6 inline-flex h-11 items-center text-sm font-medium text-primary">
          Kembali ke toko
        </Link>
      </main>
    );
  }

  const staffBlocked =
    role === "staff" &&
    pathname !== "/admin" &&
    !pathname.startsWith("/admin/keuangan") &&
    !pathname.startsWith("/admin/pesanan");
  if (staffBlocked) return <Navigate to="/admin" />;

  const tabs = role === "staff" ? STAFF_TABS : ADMIN_TABS;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted">
        {role === "staff" ? "Staff toko" : "Admin toko"}
      </p>
      <h1 className="mt-1 text-3xl font-semibold">Bonanza</h1>
      <nav className="hide-scrollbar mt-6 flex gap-2 overflow-x-auto">
        {tabs.map((tab) => {
          const active = tab.to === "/admin" ? pathname === "/admin" : pathname.startsWith(tab.to);
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={cn(
                "inline-flex h-11 shrink-0 items-center rounded-full px-4 text-sm font-medium",
                active
                  ? "bg-primary text-primary-fg"
                  : "bg-surface text-fg shadow-[var(--shadow-border)]",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-8">
        <Outlet />
      </div>
    </div>
  );
}
