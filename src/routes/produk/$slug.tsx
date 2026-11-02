import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ProductCard } from "@/components/product-card";
import { QuantityStepper } from "@/components/quantity-stepper";
import { RequireCustomer, useMyRole } from "@/components/require-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-store";
import { formatRupiah, formatUnit } from "@/lib/format";
import { CATEGORIES, isSoldOut, type Fruit } from "@/lib/fruits";
import { getProduct, listProducts } from "@/lib/server/shop";
import { canShop } from "@/lib/types";

export const Route = createFileRoute("/produk/$slug")({
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  return (
    <RequireCustomer redirect={`/produk/${slug}`}>
      <ProductBody slug={slug} />
    </RequireCustomer>
  );
}

function ProductBody({ slug }: { slug: string }) {
  const add = useCart((s) => s.add);
  const open = useCart((s) => s.open);
  const role = useMyRole();
  const [qty, setQty] = useState(1);
  const [fruit, setFruit] = useState<Fruit | null | undefined>(undefined);
  const [related, setRelated] = useState<Fruit[]>([]);

  useEffect(() => {
    setFruit(undefined);
    void getProduct({ data: slug }).then(setFruit);
    void listProducts().then((all) => {
      setRelated(all.filter((item) => item.slug !== slug && item.active !== false).slice(0, 4));
    });
  }, [slug]);

  if (fruit === undefined) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-16">
        <div className="h-8 w-40 rounded-md bg-primary/10" />
        <div className="mt-8 grid gap-10 lg:grid-cols-2">
          <div className="aspect-square rounded-2xl bg-primary/8" />
          <div className="h-64 rounded-2xl bg-primary/8" />
        </div>
      </main>
    );
  }

  if (!fruit) {
    return (
      <main className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="font-display text-3xl">Buah tidak ditemukan</h1>
        <p className="mt-2 text-muted">Mungkin dihapus dari katalog, atau tautannya sudah usang.</p>
        <Button asChild className="mt-6">
          <Link to="/katalog">Kembali ke katalog</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link
        to="/katalog"
        className="inline-flex h-11 items-center gap-2 text-sm font-medium text-muted hover:text-fg"
      >
        <ArrowLeft className="size-4" />
        Katalog
      </Link>

      <div className="mt-6 grid items-start gap-10 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl bg-surface p-2 shadow-[var(--shadow-border)]">
          <img
            src={fruit.image}
            alt={fruit.name}
            width={800}
            height={800}
            decoding="async"
            className="aspect-square w-full rounded-lg object-cover"
          />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {fruit.categories.map((c) => {
              const label = CATEGORIES.find((cat) => cat.id === c)?.label ?? c;
              return (
                <Link key={c} to="/katalog" search={{ kategori: c }}>
                  <Badge>{label}</Badge>
                </Link>
              );
            })}
            {isSoldOut(fruit) ? (
              <Badge className="bg-accent text-accent-fg">Sold out</Badge>
            ) : (
              <Badge className="bg-primary text-primary-fg">Ready</Badge>
            )}
          </div>
          <h1 className="mt-4 font-display text-4xl font-medium">{fruit.name}</h1>
          <p className="mt-1 text-sm italic text-muted">{fruit.latin}</p>
          <p className="mt-4 text-2xl font-medium tabular-nums">{formatRupiah(fruit.price)}</p>
          <p className="text-sm text-muted">{formatUnit(fruit.unit)}</p>
          <p className="mt-6 max-w-lg leading-relaxed text-muted">{fruit.description}</p>

          <dl className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
              <dt className="text-xs font-medium uppercase tracking-wider text-muted">Rasa</dt>
              <dd className="mt-1 text-sm leading-relaxed">{fruit.taste}</dd>
            </div>
            <div className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
              <dt className="text-xs font-medium uppercase tracking-wider text-muted">Simpan</dt>
              <dd className="mt-1 text-sm leading-relaxed">{fruit.storage}</dd>
            </div>
          </dl>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {isSoldOut(fruit) ? (
              <p className="text-sm font-medium text-accent">Stok habis — belum bisa dipesan.</p>
            ) : role !== undefined && canShop(role) ? (
              <>
                <QuantityStepper value={qty} onChange={setQty} />
                <Button
                  size="lg"
                  className="min-w-48 flex-1 sm:flex-none"
                  onClick={() => {
                    add(fruit.slug, qty);
                    toast.success(`${qty} × ${fruit.name} masuk keranjang`);
                    open();
                  }}
                >
                  Tambah ke keranjang
                </Button>
              </>
            ) : role === "guest" ? (
              <p className="text-sm text-muted">Akun Guest hanya dapat melihat harga.</p>
            ) : null}
          </div>
        </div>
      </div>

      {related.length > 0 ? (
        <section className="mt-20">
          <h2 className="font-display text-3xl font-medium">Mungkin juga cocok</h2>
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.slug} fruit={item} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
