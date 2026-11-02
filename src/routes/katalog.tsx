import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, X } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { PricePeriodFloat } from "@/components/price-period-float";
import { RequireCustomer } from "@/components/require-auth";
import { Input } from "@/components/ui/input";
import { CATEGORIES, filterFruits } from "@/lib/fruits";
import { cn } from "@/lib/cn";
import { useProducts } from "@/lib/use-products";

type KatalogSearch = {
  q?: string;
  kategori?: string;
};

export const Route = createFileRoute("/katalog")({
  validateSearch: (s: Record<string, unknown>): KatalogSearch => ({
    q: typeof s.q === "string" ? s.q : undefined,
    kategori: typeof s.kategori === "string" ? s.kategori : undefined,
  }),
  component: KatalogPage,
});

function KatalogPage() {
  return (
    <RequireCustomer redirect="/katalog">
      <KatalogBody />
    </RequireCustomer>
  );
}

function KatalogBody() {
  const { q = "", kategori = "semua" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { products, loading } = useProducts();
  const fruits = filterFruits(products.filter((p) => p.active !== false), q, kategori);
  const active = kategori || "semua";

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PricePeriodFloat />
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted">Katalog</p>
      <h1 className="mt-2 font-display text-4xl font-medium">Buah yang ada hari ini</h1>
      <p className="mt-3 max-w-xl text-muted">
        16 jenis stok Bonanza. Harga per satuan yang tertera — kilogram atau sisir.
      </p>

      <div className="sticky top-16 z-30 -mx-4 mt-8 border-y border-border bg-bg/95 px-4 py-3 sm:-mx-0 sm:rounded-xl sm:border sm:px-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input
            value={q}
            onChange={(e) =>
              navigate({
                search: (prev) => ({ ...prev, q: e.target.value || undefined }),
              })
            }
            placeholder="Cari semangka, melon, anggur…"
            className="pl-10 pr-11"
            aria-label="Cari buah"
          />
          {q ? (
            <button
              type="button"
              className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center text-muted hover:text-fg"
              onClick={() => navigate({ search: (prev) => ({ ...prev, q: undefined }) })}
              aria-label="Hapus pencarian"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
        <div className="hide-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              to="/katalog"
              search={{ q: q || undefined, kategori: cat.id === "semua" ? undefined : cat.id }}
              className={cn(
                "inline-flex h-11 shrink-0 items-center rounded-full px-4 text-sm font-medium transition-colors duration-150",
                active === cat.id
                  ? "bg-primary text-primary-fg"
                  : "bg-surface text-fg shadow-[var(--shadow-border)] hover:shadow-[var(--shadow-border-hover)]",
              )}
            >
              {cat.label}
            </Link>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="mt-8 h-48 rounded-2xl bg-primary/8" />
      ) : fruits.length === 0 ? (
        <div className="py-20 text-center">
          <p className="font-display text-2xl">Tidak ada yang cocok</p>
          <p className="mt-2 text-sm text-muted">Coba kata lain, atau lihat semua katalog.</p>
          <Link to="/katalog" className="mt-4 inline-flex h-11 items-center text-sm font-medium text-primary">
            Reset filter
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-6 text-sm text-muted tabular-nums">{fruits.length} jenis</p>
          <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
            {fruits.map((fruit) => (
              <ProductCard key={fruit.slug} fruit={fruit} />
            ))}
          </div>
        </>
      )}
    </main>
  );
}
