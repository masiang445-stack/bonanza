import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { QuantityStepper } from "@/components/quantity-stepper";
import { useMyRole } from "@/components/require-auth";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/lib/cart-store";
import { formatRupiah, formatUnit } from "@/lib/format";
import { isSoldOut, type Fruit } from "@/lib/fruits";
import { canShop } from "@/lib/types";

export function ProductCard({ fruit }: { fruit: Fruit }) {
  const add = useCart((s) => s.add);
  const [qty, setQty] = useState(1);
  const soldOut = isSoldOut(fruit);
  const role = useMyRole();

  return (
    <article className="group flex flex-col">
      <Link
        to="/produk/$slug"
        params={{ slug: fruit.slug }}
        className="block rounded-2xl bg-surface p-2 shadow-[var(--shadow-border)] transition-[box-shadow,transform] duration-200 ease-[var(--ease-smooth-out)] hover:shadow-[var(--shadow-border-hover)]"
      >
        <div className="relative overflow-hidden rounded-lg">
          <img
            src={fruit.image}
            alt={fruit.name}
            width={600}
            height={600}
            loading="lazy"
            decoding="async"
            className="aspect-square w-full object-cover transition-transform duration-500 ease-[var(--ease-smooth-out)] group-hover:scale-[1.03]"
          />
          <Badge
            className={
              soldOut
                ? "absolute left-2.5 top-2.5 bg-accent text-accent-fg"
                : "absolute left-2.5 top-2.5 bg-primary text-primary-fg"
            }
          >
            {soldOut ? "Sold out" : "Ready"}
          </Badge>
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-3 px-1 pb-1 pt-3">
        <div className="flex-1">
          <Link to="/produk/$slug" params={{ slug: fruit.slug }} className="block">
            <h3 className="text-lg font-medium leading-snug text-fg">{fruit.name}</h3>
          </Link>
          <p className="mt-0.5 text-sm text-muted">{formatUnit(fruit.unit)}</p>
          {fruit.description ? (
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">{fruit.description}</p>
          ) : null}
        </div>
        <p className="text-sm font-medium tabular-nums text-fg">{formatRupiah(fruit.price)}</p>
        {soldOut ? (
          <p className="flex h-11 items-center text-sm font-medium text-accent">Stok habis</p>
        ) : role === undefined ? null : canShop(role) ? (
          <div className="flex items-center gap-2">
            <QuantityStepper value={qty} onChange={setQty} className="flex-1" />
            <button
              type="button"
              className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-fg transition-[transform,opacity] duration-150 hover:opacity-90 active:scale-[0.96]"
              aria-label={`Tambah ${qty} ${fruit.name} ke keranjang`}
              onClick={() => {
                add(fruit.slug, qty);
                toast.success(`${qty} ${fruit.name} masuk keranjang`);
              }}
            >
              <Plus className="size-4" />
              Tambah
            </button>
          </div>
        ) : (
          <p className="flex h-11 items-center text-sm text-muted">Hanya lihat harga</p>
        )}
      </div>
    </article>
  );
}
