import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatRupiah } from "@/lib/format";
import { rangeForPeriod, todayJakarta, type PeriodId } from "@/lib/period";
import { listCashbackRecap, saveCashback } from "@/lib/server/invoices";

export const Route = createFileRoute("/admin/cashback")({ component: CashbackRecap });

const FILTERS: { id: PeriodId | "semua"; label: string }[] = [
  { id: "semua", label: "Semua" },
  { id: "harian", label: "Harian" },
  { id: "mingguan", label: "Mingguan" },
  { id: "bulanan", label: "Bulanan" },
  { id: "kustom", label: "Kustom" },
];

function invoiceWhen(iso: string) {
  const day = String(iso ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return { hari: "\u2014", tanggal: iso || "\u2014" };
  const [y, m, d] = day.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const hari = dt.toLocaleDateString("id-ID", { weekday: "long", timeZone: "UTC" });
  return {
    hari: hari.charAt(0).toUpperCase() + hari.slice(1),
    tanggal: `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`,
  };
}

type Row = {
  id: string;
  customerName: string;
  invoiceDate: string;
  paid: boolean;
  cashback: number;
};

function CashbackRecap() {
  const [period, setPeriod] = useState<PeriodId | "semua">("bulanan");
  const [customFrom, setCustomFrom] = useState(todayJakarta);
  const [customTo, setCustomTo] = useState(todayJakarta);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [customer, setCustomer] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const range = period === "semua" ? null : rangeForPeriod(period, customFrom, customTo);

  useEffect(() => {
    void listCashbackRecap({ data: range ? { from: range.from, to: range.to } : {} })
      .then(setRows)
      .catch(() => {
        setRows([]);
        toast.error("Gagal memuat rekap cashback.");
      });
  }, [range?.from, range?.to, period]);

  const names = useMemo(
    () => [...new Set((rows ?? []).map((row) => row.customerName))].sort((a, b) => a.localeCompare(b, "id")),
    [rows],
  );

  const visible = (rows ?? []).filter((row) => !customer || row.customerName === customer);

  const byCustomer = useMemo(() => {
    const map = new Map<string, { invoices: number; cashback: number; dates: string[] }>();
    for (const row of visible) {
      const current = map.get(row.customerName) ?? { invoices: 0, cashback: 0, dates: [] };
      current.invoices += 1;
      current.cashback += row.cashback;
      current.dates.push(row.invoiceDate);
      map.set(row.customerName, current);
    }
    return [...map.entries()].sort((a, b) => b[1].cashback - a[1].cashback);
  }, [visible]);

  const total = byCustomer.reduce((sum, [, value]) => sum + value.cashback, 0);

  async function onSave(id: string) {
    setSavingId(id);
    try {
      await saveCashback({ data: id });
      setRows((prev) => (prev ?? []).filter((item) => item.id !== id));
      toast.success("Cashback disimpan.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan cashback.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Rekap cashback</h2>
        <p className="mt-1 text-sm text-muted">
          Cashback per pelanggan dari invoice manual. Dihitung dari cashback × qty, tidak ditampilkan di PDF.
        </p>
      </div>

      <div className="hide-scrollbar flex gap-2 overflow-x-auto">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              if (item.id === "kustom") {
                const next = rangeForPeriod(period === "semua" ? "bulanan" : period, customFrom, customTo);
                setCustomFrom(next.from);
                setCustomTo(next.to);
              }
              setPeriod(item.id);
            }}
            className={
              period === item.id
                ? "inline-flex h-11 shrink-0 items-center rounded-full bg-primary px-4 text-sm font-medium text-primary-fg"
                : "inline-flex h-11 shrink-0 items-center rounded-full bg-surface px-4 text-sm font-medium shadow-[var(--shadow-border)]"
            }
          >
            {item.label}
          </button>
        ))}
      </div>

      {period === "kustom" ? (
        <div className="grid max-w-md grid-cols-2 gap-3">
          <input
            type="date"
            aria-label="Dari tanggal"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="h-11 rounded-md border border-border bg-surface px-3 text-sm"
          />
          <input
            type="date"
            aria-label="Sampai tanggal"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="h-11 rounded-md border border-border bg-surface px-3 text-sm"
          />
        </div>
      ) : null}

      <div className="max-w-md">
        <select
          aria-label="Nama pelanggan"
          value={customer}
          onChange={(e) => setCustomer(e.target.value)}
          className="h-11 w-full rounded-md border border-border bg-surface px-3 text-sm"
        >
          <option value="">Semua pelanggan</option>
          {names.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)]">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">Total cashback</p>
        <p className="mt-2 text-2xl font-semibold tabular-nums">{formatRupiah(total)}</p>
        <p className="mt-1 text-xs text-muted">{byCustomer.length} pelanggan</p>
      </div>

      {!rows ? (
        <div className="h-40 rounded-2xl bg-primary/8" />
      ) : byCustomer.length === 0 ? (
        <div className="rounded-2xl bg-surface p-8 text-center text-sm text-muted shadow-[var(--shadow-border)]">
          Belum ada cashback pada periode ini.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl bg-surface shadow-[var(--shadow-border)]">
            <table className="w-full min-w-[32rem] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted">
                  <th className="px-4 py-3 font-medium">Pelanggan</th>
                  <th className="px-4 py-3 font-medium">Invoice</th>
                  <th className="px-4 py-3 font-medium">Tanggal invoice</th>
                  <th className="px-4 py-3 font-medium">Total cashback</th>
                </tr>
              </thead>
              <tbody>
                {byCustomer.map(([name, value]) => (
                  <tr key={name} className="border-b border-border/70">
                    <td className="px-4 py-3 font-medium">{name}</td>
                    <td className="px-4 py-3 tabular-nums">{value.invoices}</td>
                    <td className="px-4 py-3">
                      {value.dates.map((day, index) => {
                        const when = invoiceWhen(day);
                        return (
                          <span key={`${day}-${index}`} className="block">
                            {when.hari}, {when.tanggal}
                          </span>
                        );
                      })}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{formatRupiah(value.cashback)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="overflow-x-auto rounded-2xl bg-surface shadow-[var(--shadow-border)]">
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted">
                  <th className="px-4 py-3 font-medium">Invoice</th>
                  <th className="px-4 py-3 font-medium">Pelanggan</th>
                  <th className="px-4 py-3 font-medium">Hari</th>
                  <th className="px-4 py-3 font-medium">Tanggal invoice</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Cashback</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr key={row.id} className="border-b border-border/70">
                    <td className="px-4 py-3 tabular-nums">{row.id}</td>
                    <td className="px-4 py-3">{row.customerName}</td>
                    <td className="px-4 py-3">{invoiceWhen(row.invoiceDate).hari}</td>
                    <td className="px-4 py-3 tabular-nums">{invoiceWhen(row.invoiceDate).tanggal}</td>
                    <td className={`px-4 py-3 ${row.paid ? "text-primary" : "text-accent"}`}>
                      {row.paid ? "Lunas" : "Belum bayar"}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{formatRupiah(row.cashback)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={savingId === row.id}
                        onClick={() => void onSave(row.id)}
                      >
                        {savingId === row.id ? "Menyimpan\u2026" : "Simpan"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
