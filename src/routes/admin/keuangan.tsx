import { createFileRoute } from "@tanstack/react-router";
import { FileDown, FileSpreadsheet } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { PeriodFilter } from "@/components/period-filter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { exportFinanceExcel, exportFinancePdf } from "@/lib/export-files";
import { formatRupiah } from "@/lib/format";
import { formatPeriodLabel, rangeForPeriod, todayJakarta, type PeriodId } from "@/lib/period";
import { addLedgerEntry, getMyProfile, listLedger, resetLedger } from "@/lib/server/shop";
import { LEDGER_CATEGORIES, type LedgerEntry, type LedgerKind } from "@/lib/types";

export const Route = createFileRoute("/admin/keuangan")({ component: AdminFinance });

function AdminFinance() {
  const [period, setPeriod] = useState<PeriodId>("harian");
  const [customFrom, setCustomFrom] = useState(todayJakarta);
  const [customTo, setCustomTo] = useState(todayJakarta);
  const { from, to } = rangeForPeriod(period, customFrom, customTo);
  const [rows, setRows] = useState<LedgerEntry[] | null>(null);
  const [kind, setKind] = useState<LedgerKind>("keluar");
  const [category, setCategory] = useState<string>(LEDGER_CATEGORIES.keluar[0]);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [occurredAt, setOccurredAt] = useState(todayJakarta);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetScope, setResetScope] = useState<"periode" | "semua">("periode");
  const [resetPassword, setResetPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    void getMyProfile()
      .then((profile) => setIsAdmin(profile.role === "admin"))
      .catch(() => setIsAdmin(false));
  }, []);

  async function reload() {
    setRows(await listLedger({ data: { from, to } }));
  }

  useEffect(() => {
    void reload().catch(() => setRows([]));
  }, [from, to]);

  useEffect(() => {
    setCategory(LEDGER_CATEGORIES[kind][0]);
  }, [kind]);

  const totals = useMemo(() => {
    const list = rows ?? [];
    const masuk = list.filter((r) => r.kind === "masuk").reduce((s, r) => s + r.amount, 0);
    const keluar = list.filter((r) => r.kind === "keluar").reduce((s, r) => s + r.amount, 0);
    return { masuk, keluar, saldo: masuk - keluar };
  }, [rows]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const value = Number(amount.replace(/\D/g, ""));
    if (!value) {
      setError("Isi nominal.");
      return;
    }
    setSaving(true);
    try {
      await addLedgerEntry({
        data: { kind, category, amount: value, note, occurredAt },
      });
      setAmount("");
      setNote("");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  }

  async function onReset(e: FormEvent) {
    e.preventDefault();
    if (!resetPassword) {
      toast.error("Isi kata sandi admin.");
      return;
    }
    setResetting(true);
    try {
      const result = await resetLedger({
        data: { password: resetPassword, scope: resetScope, from, to },
      });
      setResetPassword("");
      setResetOpen(false);
      toast.success(`${result.deleted} catatan keuangan dihapus.`);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mereset data.");
    } finally {
      setResetting(false);
    }
  }

  function onPeriod(id: PeriodId) {
    if (id === "kustom") {
      const next = rangeForPeriod(period, customFrom, customTo);
      setCustomFrom(next.from);
      setCustomTo(next.to);
    }
    setPeriod(id);
  }

  return (
    <div className="space-y-6">
      <PeriodFilter
        period={period}
        from={from}
        to={to}
        onPeriod={onPeriod}
        onCustom={(a, b) => {
          setCustomFrom(a);
          setCustomTo(b);
        }}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">Periode {formatPeriodLabel(from, to)}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={!rows}
            onClick={() => {
              if (!rows) return;
              exportFinanceExcel(rows, totals, formatPeriodLabel(from, to));
              toast.success("File Excel diunduh");
            }}
          >
            <FileSpreadsheet className="size-4" />
            Ekspor Excel
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={!rows}
            onClick={() => {
              if (!rows) return;
              void exportFinancePdf(rows, totals, formatPeriodLabel(from, to)).then(
                () => toast.success("File PDF diunduh"),
                () => toast.error("Gagal mengunduh PDF"),
              );
            }}
          >
            <FileDown className="size-4" />
            Ekspor PDF
          </Button>
          {isAdmin ? (
            <Button type="button" variant="secondary" onClick={() => setResetOpen((open) => !open)}>
              Reset data
            </Button>
          ) : null}
        </div>
      </div>

      {isAdmin && resetOpen ? (
        <form
          onSubmit={onReset}
          className="space-y-4 rounded-2xl bg-surface p-5 shadow-[var(--shadow-border)]"
        >
          <div>
            <h2 className="text-xl font-semibold">Reset data keuangan</h2>
            <p className="mt-1 text-sm text-muted">
              Catatan masuk dan keluar dihapus. Pesanan dan invoice tidak dihapus. Masukkan kata sandi
              admin untuk konfirmasi.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setResetScope("periode")}
              className={
                resetScope === "periode"
                  ? "inline-flex h-11 items-center rounded-full bg-primary px-4 text-sm font-medium text-primary-fg"
                  : "inline-flex h-11 items-center rounded-full bg-bg px-4 text-sm font-medium shadow-[var(--shadow-border)]"
              }
            >
              Periode ini
            </button>
            <button
              type="button"
              onClick={() => setResetScope("semua")}
              className={
                resetScope === "semua"
                  ? "inline-flex h-11 items-center rounded-full bg-accent px-4 text-sm font-medium text-white"
                  : "inline-flex h-11 items-center rounded-full bg-bg px-4 text-sm font-medium shadow-[var(--shadow-border)]"
              }
            >
              Semua catatan
            </button>
          </div>
          <p className="text-sm text-muted">
            {resetScope === "semua"
              ? "Semua catatan keuangan akan dihapus."
              : `Hanya catatan periode ${formatPeriodLabel(from, to)}.`}
          </p>
          <div className="max-w-sm space-y-1.5">
            <Label htmlFor="reset-password">Kata sandi admin</Label>
            <Input
              id="reset-password"
              type="password"
              autoComplete="current-password"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={resetting || !resetPassword}>
            {resetting ? "Menghapus…" : "Konfirmasi reset"}
          </Button>
        </form>
      ) : null}

      <div className={isAdmin ? "grid gap-8 lg:grid-cols-[20rem_1fr]" : "grid gap-8"}>
        {isAdmin ? (
        <form
          onSubmit={onSubmit}
          className="h-fit space-y-4 rounded-2xl bg-surface p-5 shadow-[var(--shadow-border)]"
        >
          <h2 className="text-xl font-semibold">Catat transaksi</h2>
          <div className="grid grid-cols-2 gap-2">
            {(["masuk", "keluar"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={
                  kind === k
                    ? "h-11 rounded-md bg-primary text-sm font-medium text-primary-fg"
                    : "h-11 rounded-md bg-bg text-sm font-medium text-fg shadow-[var(--shadow-border)]"
                }
              >
                {k === "masuk" ? "Masuk" : "Keluar"}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cat">Kategori</Label>
            <select
              id="cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="flex h-11 w-full rounded-md border border-border bg-bg px-3 text-sm"
            >
              {LEDGER_CATEGORIES[kind].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="amount">Nominal (Rp)</Label>
            <Input
              id="amount"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="150000"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="date">Tanggal</Label>
            <Input
              id="date"
              type="date"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note">Catatan</Label>
            <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          {error ? <p className="text-sm text-accent">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Menyimpan…" : "Simpan"}
          </Button>
        </form>
        ) : null}

        <div>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <Mini label="Masuk" value={formatRupiah(totals.masuk)} />
            <Mini label="Keluar" value={formatRupiah(totals.keluar)} />
            <Mini label="Saldo" value={formatRupiah(totals.saldo)} />
          </div>
          {!rows ? (
            <div className="h-48 rounded-2xl bg-primary/8" />
          ) : rows.length === 0 ? (
            <div className="rounded-2xl bg-surface p-8 text-center shadow-[var(--shadow-border)]">
              <p className="font-medium">Tidak ada transaksi pada periode ini</p>
              <p className="mt-1 text-sm text-muted">
                Penjualan tercatat otomatis saat invoice dilunasi. Pengeluaran dicatat di formulir.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-2xl bg-surface shadow-[var(--shadow-border)]">
              {rows.map((row) => (
                <li key={row.id} className="flex items-start justify-between gap-4 px-4 py-3">
                  <div>
                    <p className="font-medium">{row.category}</p>
                    <p className="text-xs text-muted">
                      {row.occurredAt}
                      {row.note ? ` · ${row.note}` : ""}
                    </p>
                  </div>
                  <p
                    className={
                      row.kind === "masuk"
                        ? "tabular-nums text-primary"
                        : "tabular-nums text-accent"
                    }
                  >
                    {row.kind === "masuk" ? "+" : "−"}
                    {formatRupiah(row.amount)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface px-4 py-3 shadow-[var(--shadow-border)]">
      <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 font-medium tabular-nums">{value}</p>
    </div>
  );
}
