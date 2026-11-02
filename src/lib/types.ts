export type OrderStatus = "baru" | "diproses" | "dikirim" | "selesai" | "batal";
export type PaymentMethod = "cod" | "transfer";
export type LedgerKind = "masuk" | "keluar";
export type UserRole = "customer" | "admin" | "staff" | "guest" | "dapur";

export function canShop(role: string | null | undefined) {
  return role === "customer" || role === "dapur";
}

export type Profile = {
  userId: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  role: UserRole;
};

export type InvoiceUnit = "Kg" | "PCS" | "DUS" | "KRAT";

export const INVOICE_UNITS: InvoiceUnit[] = ["Kg", "PCS", "DUS", "KRAT"];

export function maxQtyForUnit(unit: string) {
  return unit.trim().toUpperCase() === "PCS" ? 5000 : 500;
}

export type OrderLine = {
  slug: string;
  name: string;
  qty: number;
  price: number;
  unit: string;
  cashback?: number;
};

export function billedUnitPrice(line: { price: number; cashback?: number }) {
  const price = Math.max(0, Math.round(Number(line.price) || 0));
  const cashback = Math.max(0, Math.round(Number(line.cashback) || 0));
  return price + cashback;
}

export type ManualInvoiceCustomer = {
  id: number;
  name: string;
  active: boolean;
};

export type ManualInvoice = {
  id: string;
  customerId: number;
  customerName: string;
  notes: string;
  paid: boolean;
  subtotal: number;
  total: number;
  createdAt: string;
  invoiceDate: string;
  deliveryDate: string;
  items: OrderLine[];
};

export type ShopOrder = {
  id: string;
  userId: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  notes: string;
  slot: string;
  payment: PaymentMethod;
  status: OrderStatus;
  paid: boolean;
  subtotal: number;
  delivery: number;
  total: number;
  createdAt: string;
  items: OrderLine[];
};

export function manualToShopOrder(invoice: ManualInvoice): ShopOrder {
  const invoiceDay = invoice.invoiceDate || invoice.createdAt.slice(0, 10);
  const deliveryDay = invoice.deliveryDate || invoiceDay;
  const items = invoice.items.map((item) => ({
    slug: item.slug,
    name: item.name,
    qty: item.qty,
    unit: item.unit,
    price: billedUnitPrice(item),
  }));
  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  return {
    id: invoice.id,
    userId: "manual",
    name: invoice.customerName,
    phone: "",
    address: "",
    city: "",
    notes: invoice.notes,
    slot: deliveryDay,
    payment: "transfer",
    status: invoice.paid ? "selesai" : "baru",
    paid: invoice.paid,
    subtotal: total,
    delivery: 0,
    total,
    createdAt: `${invoiceDay}T00:00:00+07:00`,
    items,
  };
}

export type LedgerEntry = {
  id: number;
  kind: LedgerKind;
  category: string;
  amount: number;
  note: string;
  orderId: string | null;
  occurredAt: string;
};

export type DashboardData = {
  omset: { day: string; total: number }[];
  fruits: { slug: string; name: string; qty: number; revenue: number }[];
  favorites: { slug: string; name: string; qty: number }[];
  totals: { masuk: number; keluar: number; saldo: number; orders: number };
};

export type ShopUser = {
  id: string;
  name: string;
  email: string;
  username: string;
  role: UserRole;
  phone: string;
  paidCount: number;
  unpaidCount: number;
  unpaidTotal: number;
};

export const ORDER_STATUSES: { id: OrderStatus; label: string }[] = [
  { id: "baru", label: "Baru" },
  { id: "diproses", label: "Diproses" },
  { id: "dikirim", label: "Dikirim" },
  { id: "selesai", label: "Selesai" },
  { id: "batal", label: "Batal" },
];

export const LEDGER_CATEGORIES = {
  masuk: ["Penjualan", "Modal", "Lainnya"],
  keluar: ["Pembelian stok", "Operasional", "Gaji", "Transport", "Lainnya"],
} as const;
