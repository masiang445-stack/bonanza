import * as Dialog from "@radix-ui/react-dialog";
import { Link } from "@tanstack/react-router";
import { ShoppingBag, X } from "lucide-react";
import { useEffect, useState } from "react";
import { QuantityStepper } from "@/components/quantity-stepper";
import { Button } from "@/components/ui/button";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { cartTotals, useCart } from "@/lib/cart-store";
import { formatRupiah, formatUnit } from "@/lib/format";
import { getMyProfile } from "@/lib/server/shop";
import { SHOP } from "@/lib/shop";
import { canShop } from "@/lib/types";
import { useProducts } from "@/lib/use-products";

export function CartDrawer() {
  const isOpen = useCart((s) => s.isOpen);
  const close = useCart((s) => s.close);
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const { products } = useProducts();
  const { lines, total, meetsMin } = cartTotals(items, products);
  const { user } = useCurrentUserState();
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    if (!user) {
      setAdmin(false);
      return;
    }
    void getMyProfile()
      .then((profile) => setAdmin(!canShop(profile.role)))
      .catch(() => setAdmin(false));
  }, [user]);

  if (admin) return null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => (open ? useCart.getState().open() : close())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-fg/30" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-md flex-col bg-bg pb-[env(safe-area-inset-bottom)] shadow-[var(--shadow-border)] outline-none">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <Dialog.Title className="font-display text-xl font-medium">Keranjang</Dialog.Title>
              <Dialog.Description className="sr-only">
                Daftar buah yang akan dipesan di Bonanza
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="grid size-11 place-items-center rounded-md text-fg hover:bg-primary/8"
                aria-label="Tutup"
              >
                <X className="size-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {lines.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <ShoppingBag className="size-8 text-muted" />
                <p className="font-display text-lg">Keranjang masih kosong</p>
                <p className="max-w-xs text-sm text-muted">
                  Masuk dulu, lalu pilih buah dari katalog.
                </p>
                <Button asChild onClick={close}>
                  <Link to="/katalog">Lihat katalog</Link>
                </Button>
              </div>
            ) : (
              <ul className="flex flex-col gap-4">
                {lines.map(({ fruit, qty, lineTotal }) => (
                  <li key={fruit.slug} className="flex gap-3">
                    <Link
                      to="/produk/$slug"
                      params={{ slug: fruit.slug }}
                      onClick={close}
                      className="size-20 shrink-0 overflow-hidden rounded-lg bg-surface"
                    >
                      <img src={fruit.image} alt="" className="size-full object-cover" />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium leading-snug">{fruit.name}</p>
                          <p className="text-xs text-muted">{formatUnit(fruit.unit)}</p>
                        </div>
                        <p className="text-sm tabular-nums">{formatRupiah(lineTotal)}</p>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <QuantityStepper
                          value={qty}
                          onChange={(next) => setQty(fruit.slug, next)}
                          min={0}
                        />
                        <button
                          type="button"
                          className="h-11 px-2 text-sm text-muted hover:text-fg"
                          onClick={() => remove(fruit.slug)}
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {lines.length > 0 ? (
            <div className="border-t border-border px-5 py-4">
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between font-medium">
                  <dt>Total</dt>
                  <dd className="tabular-nums">{formatRupiah(total)}</dd>
                </div>
              </dl>
              {!meetsMin ? (
                <p className="mt-2 text-xs text-muted">
                  Minimal belanja {formatRupiah(SHOP.minOrder)}.
                </p>
              ) : null}
              <div className="mt-4 flex flex-col gap-2">
                <Button asChild className="w-full" disabled={!meetsMin}>
                  <Link to="/checkout" onClick={close}>
                    Lanjut checkout
                  </Link>
                </Button>
                <Button asChild variant="secondary" className="w-full">
                  <Link to="/keranjang" onClick={close}>
                    Lihat keranjang
                  </Link>
                </Button>
              </div>
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
