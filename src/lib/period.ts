export type PeriodId = "harian" | "mingguan" | "bulanan" | "kustom";

export const PERIODS: { id: PeriodId; label: string }[] = [
  { id: "harian", label: "Harian" },
  { id: "mingguan", label: "Mingguan" },
  { id: "bulanan", label: "Bulanan" },
  { id: "kustom", label: "Kustom" },
];

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function todayJakarta() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}

export function addDays(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

function mondayOfWeek(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const weekday = dt.getUTCDay();
  const offset = weekday === 0 ? -6 : 1 - weekday;
  return addDays(iso, offset);
}

export function normalizeDate(value: string | undefined, fallback: string) {
  return value && ISO.test(value) ? value : fallback;
}

export function rangeForPeriod(
  period: PeriodId,
  customFrom?: string,
  customTo?: string,
): { from: string; to: string } {
  const today = todayJakarta();
  if (period === "harian") return { from: today, to: today };
  if (period === "mingguan") return { from: mondayOfWeek(today), to: today };
  if (period === "bulanan") {
    const [y, m] = today.split("-");
    return { from: `${y}-${m}-01`, to: today };
  }
  const from = normalizeDate(customFrom, today);
  const to = normalizeDate(customTo, today);
  return from <= to ? { from, to } : { from: to, to: from };
}

export function formatDeliveryDay(iso: string) {
  if (!ISO.test(iso)) return iso;
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatPeriodLabel(from: string, to: string) {
  if (from === to) return formatDeliveryDay(from);
  return `${formatDeliveryDay(from)} – ${formatDeliveryDay(to)}`;
}

export function chartDayLabel(iso: string) {
  if (!ISO.test(iso)) return iso;
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "UTC" });
}

function formatHariDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const hari = dt
    .toLocaleDateString("id-ID", { weekday: "long", timeZone: "UTC" })
    .toUpperCase();
  return `${hari} ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

export function formatPricePeriod(from?: string, to?: string) {
  const start = String(from ?? "").slice(0, 10);
  const end = String(to ?? "").slice(0, 10);
  if (!ISO.test(start) || !ISO.test(end)) return "";
  if (start === end) return formatHariDate(start);
  return `${formatHariDate(start)} – ${formatHariDate(end)}`;
}

export function formatDdMmYyyy(iso: string) {
  if (!ISO.test(iso)) return iso;
  const [, m, d] = iso.split("-");
  return `${d}/${m}/${iso.slice(0, 4)}`;
}

export function formatCheckoutDay(iso: string) {
  if (!ISO.test(iso)) return iso;
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const hari = dt.toLocaleDateString("id-ID", { weekday: "long", timeZone: "UTC" });
  return `${hari}, ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

export function monthTitle(year: number, month: number) {
  const dt = new Date(Date.UTC(year, month - 1, 1));
  return dt.toLocaleDateString("id-ID", { month: "long", year: "numeric", timeZone: "UTC" });
}

export function calendarCells(year: number, month: number) {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const pad = (first.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: Array<{ iso: string; day: number } | null> = [];
  for (let i = 0; i < pad; i++) cells.push(null);
  for (let day = 1; day <= days; day++) {
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({ iso, day });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function isDeliverableDay(iso: string, today = todayJakarta(), horizon = 31) {
  if (!ISO.test(iso)) return false;
  return iso >= today && iso <= addDays(today, horizon);
}
