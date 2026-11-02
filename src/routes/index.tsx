import type { ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Clock, Leaf, Truck } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { PricePeriodFloat } from "@/components/price-period-float";
import { RequireCustomer } from "@/components/require-auth";
import { Button } from "@/components/ui/button";
import { useProducts } from "@/lib/use-products";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <RequireCustomer redirect="/">
      <HomeBody />
    </RequireCustomer>
  );
}

function HomeBody() {
  const { products, loading } = useProducts();
  const fruits = products.filter((fruit) => fruit.active !== false);

  return (
    <main>
      <PricePeriodFloat />
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:py-20">
        <div>
          <p className="rise-in text-sm font-medium uppercase tracking-[0.18em] text-muted">
            Toko buah Bonanza
          </p>
          <h1 className="rise-in rise-in-1 mt-4 font-display text-4xl font-medium leading-[1.1] text-fg sm:text-5xl lg:text-6xl">
            Buah tropis, rantai dingin terukur.
          </h1>
          <p className="rise-in rise-in-2 mt-5 max-w-md text-base leading-relaxed text-muted sm:text-lg">
            Semangka, melon, jeruk, anggur, dan buah harian lain — dipetik matang, dikirim hari yang
            sama.
          </p>
          <div className="rise-in rise-in-3 mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/katalog">
                Belanja katalog
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link to="/tentang">Tentang kebun</Link>
            </Button>
          </div>
        </div>
        <div className="rise-in rise-in-2 overflow-hidden rounded-2xl bg-surface p-2 shadow-[var(--shadow-border)]">
          <img
            src="/hero.jpg"
            alt="Still life buah tropis Bonanza"
            width={960}
            height={720}
            fetchPriority="high"
            decoding="async"
            className="aspect-[4/3] w-full rounded-lg object-cover lg:aspect-[16/11]"
          />
        </div>
      </section>

      <section className="border-y border-border">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 md:grid-cols-3">
          <Stat
            icon={<Leaf className="size-5" />}
            title="16 jenis harian"
            copy="Semangka, melon, jeruk, anggur, apel, pear, manggis, naga, pisang, kelengkeng."
          />
          <Stat
            icon={<Clock className="size-5" />}
            title="Seleksi pagi"
            copy="Buah tiba di Kemang sebelum toko buka. Belanja sebelum 14.00 untuk kirim hari ini."
          />
          <Stat
            icon={<Truck className="size-5" />}
            title="Tanpa biaya kirim"
            copy="Pengiriman tanpa ongkir. Pilih hari kirim saat checkout."
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted">Stok hari ini</p>
            <h2 className="mt-2 font-display text-3xl font-medium sm:text-4xl">Semua buah</h2>
          </div>
          <Link
            to="/katalog"
            className="inline-flex h-11 items-center gap-2 text-sm font-medium text-primary"
          >
            Filter katalog
            <ArrowRight className="size-4" />
          </Link>
        </div>
        {loading ? (
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-2xl bg-primary/8" />
            ))}
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
            {fruits.map((fruit) => (
              <ProductCard key={fruit.slug} fruit={fruit} />
            ))}
          </div>
        )}
      </section>

      <section className="bg-primary text-primary-fg">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2">
          <div className="overflow-hidden rounded-2xl p-2 ring-1 ring-primary-fg/10">
            <img
              src="/orchard.jpg"
              alt="Kebun buah tropis di pagi hari"
              className="aspect-[4/3] w-full rounded-lg object-cover"
            />
          </div>
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary-fg/65">
              Dari kebun
            </p>
            <h2 className="mt-3 font-display text-3xl font-medium sm:text-4xl">
              Mitra di Jawa, Sumatera, dan impor terpilih.
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-primary-fg/80">
              Kami tidak menggudang buah berminggu-minggu. Setiap pagi petugas kebun mengirim apa
              yang matang semalam.
            </p>
            <Button
              asChild
              variant="secondary"
              size="lg"
              className="mt-8 bg-primary-fg text-primary hover:bg-primary-fg/90"
            >
              <Link to="/tentang">Baca cerita kebun</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="font-display text-3xl font-medium">Cara belanja</h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          {[
            {
              n: "01",
              t: "Masuk akun",
              d: "Belanja hanya untuk pelanggan yang sudah login. Admin bisa membuatkan akun baru.",
            },
            {
              n: "02",
              t: "Pilih buahnya",
              d: "Isi keranjang, checkout, lalu cetak invoice. Status lunas atau belum selalu tercatat.",
            },
            {
              n: "03",
              t: "Tiba hari ini",
              d: "Kurir Bonanza ke Jakarta, Depok, Tangerang, dan Bekasi. Bayar di tempat atau transfer.",
            },
          ].map((step) => (
            <li key={step.n} className="rounded-2xl bg-surface p-6 shadow-[var(--shadow-border)]">
              <p className="font-display text-sm text-muted">{step.n}</p>
              <h3 className="mt-3 font-display text-2xl font-medium">{step.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{step.d}</p>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}

function Stat({
  icon,
  title,
  copy,
}: {
  icon: ReactNode;
  title: string;
  copy: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="grid size-11 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted">{copy}</p>
      </div>
    </div>
  );
}
