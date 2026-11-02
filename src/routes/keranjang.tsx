import { createFileRoute, Link } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";
import { QuantityStepper } from "@/components/quantity-stepper";
import { RequireShopper } from "@/components/require-auth";
import { Button } from "@/components/ui/button";
import { cartTotals, useCart } from "@/lib/cart-store";
import { formatRupiah, formatUnit } from "@/lib/format";
import { SHOP } from "@/lib/shop";
import { useProducts } from "@/lib/use-products";

export const Route = createFileRoute("/keranjang")({ component: CartPage });

function CartPage() {
  return (
    <RequireShopper redirect="/keranjang">
      <CartBody />
    </RequireShopper>
  );
}

function CartBody() {
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const { products, loading } = useProducts();
  const { lines, subtotal, total, meetsMin } = cartTotals(items, products);

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-16">
        <div className="h-8 w-40 rounded-md bg-primary/10" />
      </main>
    );
  }

  if (lines.length === 0) {
    return (
      <main className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
        <ShoppingBag className="size-8 text-muted" />
        <h1 className="mt-4 font-display text-3xl">Keranjang kosong</h1>
        <p className="mt-2 text-muted">Belum ada buah yang dipilih. Mulai dari katalog pagi ini.</p>
        <Button asChild className="mt-6">
          <Link to="/katalog">Belanja katalog</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_20rem]">
      <div>
        <h1 className="font-display text-4xl font-medium">Keranjang</h1>
        <ul className="mt-8 divide-y divide-border border-y border-border">
          {lines.map(({ fruit, qty, lineTotal }) => (
            <li key={fruit.slug} className="flex gap-4 py-5">
              <Link
                to="/produk/$slug"
                params={{ slug: fruit.slug }}
                className="size-24 shrink-0 overflow-hidden rounded-lg bg-surface sm:size-28"
              >
                <img src={fruit.image} alt="" className="size-full object-cover" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <Link to="/produk/$slug" params={{ slug: fruit.slug }} className="font-display text-xl">
                    {fruit.name}
                  </Link>
                  <p className="text-sm text-muted">{formatUnit(fruit.unit)}</p>
                  <p className="mt-1 text-sm tabular-nums">{formatRupiah(fruit.price)}</p>
                </div>
                <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                  <p className="font-medium tabular-nums">{formatRupiah(lineTotal)}</p>
                  <div className="flex items-center gap-2">
                    <QuantityStepper value={qty} onChange={(next) => setQty(fruit.slug, next)} min={0} />
                    <button
                      type="button"
                      className="h-11 px-2 text-sm text-muted hover:text-fg"
                      onClick={() => remove(fruit.slug)}
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <aside className="h-fit rounded-2xl bg-surface p-5 shadow-[var(--shadow-border)] lg:sticky lg:top-24">
        <h2 className="font-display text-xl">Ringkasan</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between border-t border-border pt-2 font-medium">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatRupiah(total)}</dd>
          </div>
        </dl>
        {!meetsMin ? (
          <p className="mt-3 text-sm text-fg">
            Tambah {formatRupiah(SHOP.minOrder - subtotal)} lagi untuk checkout.
          </p>
        ) : null}
        <Button asChild className="mt-5 w-full" disabled={!meetsMin}>
          <Link to="/checkout">Lanjut checkout</Link>
        </Button>
      </aside>
    </main>
  );
}
