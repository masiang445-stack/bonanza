import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatRupiah } from "@/lib/format";
import {
  CATEGORIES,
  PRODUCT_IMAGES,
  STOCK_OPTIONS,
  slugify,
  type CategoryId,
  type Fruit,
  type Stock,
} from "@/lib/fruits";
import { readImageFile } from "@/lib/read-image";
import { adminDeleteProduct, adminSaveProduct, getPricePeriod, listProducts, savePricePeriod } from "@/lib/server/shop";
import { INVOICE_UNITS, type InvoiceUnit } from "@/lib/types";
import { invalidateProductCache } from "@/lib/use-products";

export const Route = createFileRoute("/admin/produk")({ component: AdminProducts });

const empty = {
  slug: "",
  name: "",
  latin: "",
  category: "lokal" as CategoryId,
  unit: "Kg" as InvoiceUnit,
  price: "",
  description: "",
  taste: "",
  storage: "",
  stock: "ready" as Stock,
  featured: false,
  image: PRODUCT_IMAGES[0] as string,
  active: true,
};

function AdminProducts() {
  const [list, setList] = useState<Fruit[] | null>(null);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const [periodSaving, setPeriodSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function reload() {
    setList(await listProducts());
  }

  useEffect(() => {
    void reload().catch(() => setList([]));
    void getPricePeriod()
      .then((period) => {
        setPeriodFrom(period.from);
        setPeriodTo(period.to);
      })
      .catch(() => undefined);
  }, []);

  function startEdit(fruit: Fruit) {
    setEditing(fruit.slug);
    setForm({
      slug: fruit.slug,
      name: fruit.name,
      latin: fruit.latin,
      category: fruit.categories[0] ?? "lokal",
      unit: INVOICE_UNITS.includes(fruit.unit as InvoiceUnit) ? (fruit.unit as InvoiceUnit) : "Kg",
      price: String(fruit.price),
      description: fruit.description,
      taste: fruit.taste,
      storage: fruit.storage,
      stock: fruit.stock,
      featured: Boolean(fruit.featured),
      image: fruit.image,
      active: fruit.active !== false,
    });
    setError("");
  }

  async function onSavePeriod(e: FormEvent) {
    e.preventDefault();
    setPeriodSaving(true);
    setError("");
    try {
      const saved = await savePricePeriod({ data: { from: periodFrom, to: periodTo } });
      setPeriodFrom(saved.from);
      setPeriodTo(saved.to);
      toast.success("Periode harga disimpan.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan periode harga.");
    } finally {
      setPeriodSaving(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const wasEditing = Boolean(editing);
      await adminSaveProduct({
        data: {
          slug: editing ?? slugify(form.name),
          name: form.name,
          latin: form.latin,
          category: form.category,
          unit: form.unit,
          price: Number(form.price.replace(/\D/g, "")),
          description: form.description,
          taste: form.taste,
          storage: form.storage,
          stock: form.stock,
          featured: form.featured,
          image: form.image,
          active: form.active,
        },
      });
      setForm(empty);
      setEditing(null);
      invalidateProductCache();
      await reload();
      toast.success(wasEditing ? "Buah diperbarui." : "Buah ditambah.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(slug: string) {
    await adminDeleteProduct({ data: slug });
    invalidateProductCache();
    if (editing === slug) {
      setEditing(null);
      setForm(empty);
    }
    await reload();
  }

  async function onUpload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const image = await readImageFile(file);
      setForm((prev) => ({ ...prev, image }));
      toast.success("Foto siap disimpan.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengunggah foto.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={onSavePeriod}
        className="rounded-2xl bg-surface p-5 shadow-[var(--shadow-border)]"
      >
        <h2 className="text-xl font-semibold">Periode harga</h2>
        <p className="mt-1 text-sm text-muted">Berlaku untuk semua buah di katalog.</p>
        <div className="mt-4 grid max-w-xl grid-cols-2 gap-3">
          <Field label="Dari" htmlFor="period-from">
            <Input
              id="period-from"
              type="date"
              value={periodFrom}
              onChange={(e) => setPeriodFrom(e.target.value)}
            />
          </Field>
          <Field label="Sampai" htmlFor="period-to">
            <Input
              id="period-to"
              type="date"
              value={periodTo}
              onChange={(e) => setPeriodTo(e.target.value)}
            />
          </Field>
        </div>
        <Button type="submit" className="mt-4" disabled={periodSaving}>
          {periodSaving ? "Menyimpan…" : "Simpan periode"}
        </Button>
      </form>

      <div className="grid gap-8 lg:grid-cols-[22rem_1fr]">
      <form
        onSubmit={onSubmit}
        className="h-fit space-y-3 rounded-2xl bg-surface p-5 shadow-[var(--shadow-border)]"
      >
        <h2 className="text-xl font-semibold">{editing ? "Ubah buah" : "Tambah buah"}</h2>
        <Field label="Nama" htmlFor="name">
          <Input
            id="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </Field>
        <Field label="Harga (Rp)" htmlFor="price">
          <Input
            id="price"
            inputMode="numeric"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            required
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Satuan" htmlFor="unit">
            <select
              id="unit"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value as InvoiceUnit })}
              className="flex h-11 w-full rounded-md border border-border bg-bg px-3 text-sm"
            >
              {INVOICE_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Kategori" htmlFor="cat">
            <select
              id="cat"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as CategoryId })}
              className="flex h-11 w-full rounded-md border border-border bg-bg px-3 text-sm"
            >
              {CATEGORIES.filter((c) => c.id !== "semua").map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Foto buah" htmlFor="image">
          <div className="space-y-3">
            {form.image ? (
              <img
                src={form.image}
                alt={form.name || "Pratinjau foto buah"}
                className="aspect-square w-full max-w-56 rounded-lg object-cover"
              />
            ) : null}
            <input
              ref={fileRef}
              id="image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => void onUpload(e.target.files?.[0])}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? "Mengunggah…" : "Unggah foto"}
              </Button>
            </div>
            <select
              value={PRODUCT_IMAGES.includes(form.image) ? form.image : ""}
              onChange={(e) => {
                if (e.target.value) setForm({ ...form, image: e.target.value });
              }}
              className="flex h-11 w-full rounded-md border border-border bg-bg px-3 text-sm"
            >
              <option value="">Atau pilih foto toko</option>
              {PRODUCT_IMAGES.map((src) => (
                <option key={src} value={src}>
                  {src.replace("/fruits/", "")}
                </option>
              ))}
            </select>
          </div>
        </Field>
        <Field label="Stok" htmlFor="stock">
          <select
            id="stock"
            value={form.stock}
            onChange={(e) => setForm({ ...form, stock: e.target.value as Stock })}
            className="flex h-11 w-full rounded-md border border-border bg-bg px-3 text-sm"
          >
            {STOCK_OPTIONS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Deskripsi" htmlFor="desc">
          <Textarea
            id="desc"
            rows={5}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
            placeholder="Tulis deskripsi buah yang tampil di toko"
          />
        </Field>
        <label className="flex h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
          />
          Tampil di katalog
        </label>
        {error ? <p className="text-sm text-accent">{error}</p> : null}
        <div className="flex gap-2">
          <Button type="submit" className="flex-1" disabled={saving}>
            {saving ? "Menyimpan…" : editing ? "Simpan perubahan" : "Tambah"}
          </Button>
          {editing ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setEditing(null);
                setForm(empty);
              }}
            >
              Batal
            </Button>
          ) : null}
        </div>
      </form>

      <div>
        {!list ? (
          <div className="h-48 rounded-2xl bg-primary/8" />
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl bg-surface shadow-[var(--shadow-border)]">
            {list.map((fruit) => (
              <li key={fruit.slug} className="flex items-center gap-3 px-4 py-3">
                <img src={fruit.image} alt="" className="size-14 rounded-md object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{fruit.name}</p>
                  <p className="text-xs text-muted">
                    {formatRupiah(fruit.price)} / {fruit.unit}
                    {" · "}
                    {fruit.stock === "soldout" ? "Sold out" : "Ready"}
                    {fruit.active === false ? " · disembunyikan" : ""}
                  </p>
                </div>
                <button
                  type="button"
                  className="h-11 px-2 text-sm font-medium text-primary"
                  onClick={() => startEdit(fruit)}
                >
                  Ubah
                </button>
                <button
                  type="button"
                  className="h-11 px-2 text-sm text-accent"
                  onClick={() => void onDelete(fruit.slug)}
                >
                  Hapus
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
