export function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatUnit(unit: string) {
  switch (unit) {
    case "kg":
    case "Kg":
      return "per Kg";
    case "buah":
    case "PCS":
      return "per PCS";
    case "sisir":
      return "per sisir";
    case "pack":
      return "per pack";
    case "DUS":
      return "per DUS";
    case "KRAT":
      return "per KRAT";
    default:
      return `per ${unit}`;
  }
}
