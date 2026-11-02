import { createFileRoute, Link } from "@tanstack/react-router";
import { RequireAuth } from "@/components/require-auth";
import { Button } from "@/components/ui/button";
import { SHOP } from "@/lib/shop";

export const Route = createFileRoute("/tentang")({ component: AboutPage });

function AboutPage() {
  return (
    <RequireAuth redirect="/tentang">
      <AboutBody />
    </RequireAuth>
  );
}

function AboutBody() {
  return (
    <main>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted">
            Tentang Bonanza
          </p>
          <h1 className="mt-3 font-display text-4xl font-medium leading-[1.1] sm:text-5xl">
            Toko buah yang merawat rantai dingin dari kebun, bukan dari gudang.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-muted">
            Bonanza Supply Chain berdiri di Kemang sebagai etalase buah untuk kebun mitra di Jawa
            Barat, Sumatera Utara, Yogyakarta, dan Bali. Kami membeli pada kematangan makan, bukan
            pada harga terendah.
          </p>
        </div>
        <div className="overflow-hidden rounded-2xl bg-surface p-2 shadow-[var(--shadow-border)]">
          <img
            src="/orchard.jpg"
            alt="Kebun mitra Bonanza di pagi berkabut"
            width={960}
            height={720}
            loading="lazy"
            decoding="async"
            className="aspect-[4/3] w-full rounded-lg object-cover"
          />
        </div>
      </section>

      <section className="border-y border-border bg-surface">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-3">
          {[
            {
              t: "Panen, bukan stok lama",
              d: "Buah masuk toko pada hari yang sama dengan petik. Yang tidak lolos rasa tidak naik ke etalase.",
            },
            {
              t: "Harga per satuan jujur",
              d: "Kilogram, buah, sisir, atau pack — tercantum jelas. Tidak ada harga coret yang dibuat-buat.",
            },
            {
              t: "Kirim radius kota",
              d: "Kurir sendiri untuk Jakarta dan sekitarnya. Pesanan sebelum 14.00 tiba hari itu juga.",
            },
          ].map((item) => (
            <div key={item.t}>
              <h2 className="font-display text-2xl font-medium">{item.t}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{item.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-3xl font-medium">Toko</h2>
          <dl className="mt-6 space-y-4 text-sm">
            <div>
              <dt className="text-muted">Alamat</dt>
              <dd className="mt-1">{SHOP.address}</dd>
            </div>
            <div>
              <dt className="text-muted">Jam buka</dt>
              <dd className="mt-1">{SHOP.hours}</dd>
            </div>
            <div>
              <dt className="text-muted">Telepon</dt>
              <dd className="mt-1">{SHOP.phone}</dd>
            </div>
            <div>
              <dt className="text-muted">Pengiriman</dt>
              <dd className="mt-1">{SHOP.deliveryNote}</dd>
            </div>
          </dl>
          <Button asChild className="mt-8">
            <Link to="/katalog">Belanja katalog</Link>
          </Button>
        </div>
        <div className="rounded-2xl bg-primary p-8 text-primary-fg">
          <h2 className="font-display text-3xl font-medium">Mitra kebun</h2>
          <ul className="mt-6 space-y-3 text-sm leading-relaxed text-primary-fg/85">
            <li>Indramayu — mangga harum manis</li>
            <li>Binjai & Medan — rambutan, jeruk, durian</li>
            <li>Sleman — salak pondoh</li>
            <li>Lembang — alpukat mentega, stroberi</li>
            <li>Subang — nanas madu</li>
            <li>Purwakarta — manggis</li>
            <li>Banyuwangi — buah naga</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
