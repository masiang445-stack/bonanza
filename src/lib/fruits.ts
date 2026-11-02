export type Unit = "kg" | "buah" | "sisir" | "pack" | "Kg" | "PCS" | "DUS" | "KRAT";
export type CategoryId = "tropis" | "lokal" | "citrus" | "impor";
export type Stock = "ready" | "soldout";

export type Fruit = {
  slug: string;
  name: string;
  latin: string;
  categories: CategoryId[];
  unit: Unit;
  price: number;
  description: string;
  taste: string;
  storage: string;
  featured?: boolean;
  stock: Stock;
  image: string;
  active?: boolean;
};

export const STOCK_OPTIONS: { id: Stock; label: string }[] = [
  { id: "ready", label: "Ready" },
  { id: "soldout", label: "Sold out" },
];

export function parseStock(value: string | null | undefined): Stock {
  return value === "soldout" || value === "terbatas" ? "soldout" : "ready";
}

export function isSoldOut(fruit: Pick<Fruit, "stock">) {
  return fruit.stock === "soldout";
}

export const CATEGORIES: { id: "semua" | CategoryId; label: string }[] = [
  { id: "semua", label: "Semua" },
  { id: "tropis", label: "Tropis" },
  { id: "lokal", label: "Kebun lokal" },
  { id: "citrus", label: "Citrus" },
  { id: "impor", label: "Impor" },
];

export const PRODUCT_IMAGES: string[] = [
  "/fruits/semangka-nonbiji.jpg",
  "/fruits/semangka.jpg",
  "/fruits/semangka-kuning.jpg",
  "/fruits/melon.jpg",
  "/fruits/melon-sakata.jpg",
  "/fruits/jeruk.jpg",
  "/fruits/jeruk-siem.jpg",
  "/fruits/kelengkeng.jpg",
  "/fruits/apel.jpg",
  "/fruits/pear.jpg",
  "/fruits/anggur-ausy.jpg",
  "/fruits/anggur-rrc.jpg",
  "/fruits/anggur-muscat.jpg",
  "/fruits/naga.jpg",
  "/fruits/manggis.jpg",
  "/fruits/pisang.jpg",
];

export function filterFruits(list: Fruit[], query: string, kategori: string) {
  const q = query.trim().toLowerCase();
  return list.filter((fruit) => {
    const matchCat =
      kategori === "semua" || !kategori || fruit.categories.includes(kategori as CategoryId);
    if (!matchCat) return false;
    if (!q) return true;
    return fruit.name.toLowerCase().includes(q) || fruit.latin.toLowerCase().includes(q);
  });
}

export function deliveryFeeFor(_subtotal?: number) {
  return 0;
}

export function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}
