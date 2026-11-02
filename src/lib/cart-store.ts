import { create } from "zustand";
import { persist } from "zustand/middleware";
import { deliveryFeeFor, type Fruit } from "@/lib/fruits";
import { SHOP } from "@/lib/shop";

export type CartItem = { slug: string; qty: number };

type CartState = {
  items: CartItem[];
  isOpen: boolean;
  open: () => void;
  close: () => void;
  add: (slug: string, qty?: number) => void;
  setQty: (slug: string, qty: number) => void;
  remove: (slug: string) => void;
  clear: () => void;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      add: (slug, qty = 1) => {
        const items = [...get().items];
        const existing = items.find((item) => item.slug === slug);
        const next = Math.min(500, Math.max(1, Math.floor(qty)));
        if (existing) existing.qty = Math.min(500, existing.qty + next);
        else items.push({ slug, qty: next });
        set({ items });
      },
      setQty: (slug, qty) => {
        if (qty <= 0) {
          set({ items: get().items.filter((item) => item.slug !== slug) });
          return;
        }
        const next = Math.min(500, Math.max(1, Math.floor(qty)));
        set({
          items: get().items.map((item) => (item.slug === slug ? { ...item, qty: next } : item)),
        });
      },
      remove: (slug) => set({ items: get().items.filter((item) => item.slug !== slug) }),
      clear: () => set({ items: [] }),
    }),
    { name: "bonanza-cart", partialize: (state) => ({ items: state.items }) },
  ),
);

export function cartCount(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.qty, 0);
}

export function cartLines(items: CartItem[], catalog: Fruit[]) {
  const bySlug = new Map(catalog.map((fruit) => [fruit.slug, fruit]));
  return items
    .map((item) => {
      const fruit = bySlug.get(item.slug);
      if (!fruit) return null;
      return { ...item, fruit, lineTotal: fruit.price * item.qty };
    })
    .filter((line): line is NonNullable<typeof line> => line !== null);
}

export function cartTotals(items: CartItem[], catalog: Fruit[]) {
  const lines = cartLines(items, catalog);
  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const delivery = deliveryFeeFor(subtotal);
  return {
    lines,
    subtotal,
    delivery,
    total: subtotal + delivery,
    meetsMin: subtotal >= SHOP.minOrder,
  };
}
