import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, ShoppingBag, X } from "lucide-react";
import { useEffect, useState } from "react";
import { SignedIn, SignedOut } from "@/lib/auth/gates";
import { AccountMenu } from "@/components/account-menu";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { cartCount, useCart } from "@/lib/cart-store";
import { getMyProfile } from "@/lib/server/shop";
import type { Profile } from "@/lib/types";
import { canShop } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";

const SHOP_NAV = [
  { to: "/", label: "Beranda" },
  { to: "/katalog", label: "Katalog" },
  { to: "/tentang", label: "Tentang" },
] as const;

const ADMIN_NAV = [
  { to: "/admin", label: "Dashboard" },
  { to: "/admin/pesanan", label: "Pesanan" },
  { to: "/admin/invoice", label: "Invoice" },
  { to: "/admin/produk", label: "Buah" },
  { to: "/admin/pengguna", label: "Pengguna" },
  { to: "/admin/keuangan", label: "Keuangan" },
] as const;

const STAFF_NAV = [
  { to: "/admin", label: "Dashboard" },
  { to: "/admin/pesanan", label: "Pesanan" },
  { to: "/admin/keuangan", label: "Keuangan" },
] as const;

export function SiteHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = useCart((s) => s.items);
  const openCart = useCart((s) => s.open);
  const { user, isPending } = useCurrentUserState();
  const [ready, setReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const count = ready ? cartCount(items) : 0;
  const isAdmin = profile?.role === "admin";
  const isStaff = profile?.role === "staff";
  const isCustomer = Boolean(user) && canShop(profile?.role);
  const nav = isAdmin ? ADMIN_NAV : isStaff ? STAFF_NAV : SHOP_NAV;

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    void getMyProfile()
      .then(setProfile)
      .catch(() => setProfile(null));
  }, [user]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg print:hidden">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link to="/" className="shrink-0">
          <img
            src="/logo.png"
            alt="Bonanza Supply Chain"
            width={160}
            height={36}
            decoding="async"
            className="logo h-8 w-auto sm:h-9"
          />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((item) => {
            const active = item.to === "/admin" || item.to === "/" ? pathname === item.to : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "inline-flex h-11 items-center px-3 text-sm font-medium transition-colors duration-150",
                  active ? "text-fg" : "text-muted hover:text-fg",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1">
          {isCustomer ? (
            <Link
              to="/checkout"
              className="hidden h-11 items-center px-2 text-sm font-medium text-muted hover:text-fg sm:inline-flex"
            >
              Pesanan saya
            </Link>
          ) : null}
          {isCustomer ? (
            <button
              type="button"
              onClick={openCart}
              className="relative grid size-11 place-items-center rounded-md text-fg hover:bg-primary/8"
              aria-label="Buka keranjang"
            >
              <ShoppingBag className="size-5" />
              {count > 0 ? (
                <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-medium tabular-nums text-accent-fg">
                  {count}
                </span>
              ) : null}
            </button>
          ) : null}
          <div className="hidden sm:block">
            {isPending ? (
              <div className="h-8 w-24 animate-pulse rounded-md bg-primary/10" />
            ) : (
              <>
                <SignedOut>
                  <Button asChild size="sm" variant="secondary">
                    <Link to="/login">Masuk</Link>
                  </Button>
                </SignedOut>
                <SignedIn>
                  <AccountMenu />
                </SignedIn>
              </>
            )}
          </div>
          <button
            type="button"
            className="grid size-11 place-items-center rounded-md text-fg hover:bg-primary/8 md:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <nav className="border-t border-border px-4 py-3 md:hidden">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex h-11 items-center text-sm font-medium text-fg"
            >
              {item.label}
            </Link>
          ))}
          {isCustomer ? (
            <Link to="/checkout" className="flex h-11 items-center text-sm font-medium text-fg">
              Pesanan saya
            </Link>
          ) : null}
          <SignedOut>
            <Link to="/login" className="flex h-11 items-center text-sm font-medium text-fg">
              Masuk
            </Link>
          </SignedOut>
          <SignedIn>
            <div className="pt-2">
              <AccountMenu />
            </div>
          </SignedIn>
        </nav>
      ) : null}
    </header>
  );
}
