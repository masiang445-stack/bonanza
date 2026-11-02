export const SHOP = {
  name: "Bonanza",
  legal: "Bonanza Supply Chain",
  tagline: "Buah tropis, rantai dingin terukur",
  address: "Jl. Eyang Purwa, Bangbayang Utara",
  phone: "0812 3456 7890",
  hours: "Setiap hari, 07.00–21.00",
  email: "halo@bonanza.id",
  deliveryNote:
    "Kirim hari ini untuk pesanan sebelum pukul 14.00. Area Jakarta, Depok, Tangerang, dan Bekasi.",
  minOrder: 50_000,
  deliveryFee: 0,
  freeDeliveryAt: 0,
  bank: {
    name: "IIN KARLINA",
    number: "2093265997",
    bank: "BNI TAPLUS BISNIS",
  },
} as const;

export const DELIVERY_SLOTS = [
  { id: "pagi", label: "Pagi", time: "08.00–11.00" },
  { id: "siang", label: "Siang", time: "12.00–16.00" },
  { id: "sore", label: "Sore", time: "16.00–20.00" },
] as const;

export const CITIES = [
  "Jakarta Selatan",
  "Jakarta Pusat",
  "Jakarta Barat",
  "Jakarta Utara",
  "Jakarta Timur",
  "Depok",
  "Tangerang",
  "Tangerang Selatan",
  "Bekasi",
] as const;
