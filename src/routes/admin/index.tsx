import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart,
} from "recharts";
import { PeriodFilter } from "@/components/period-filter";
import { WebVitalsMetrics } from "@/components/web-vitals-metrics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { downloadBlob } from "@/lib/export-files";
import { formatRupiah } from "@/lib/format";
import { chartDayLabel, formatPeriodLabel, rangeForPeriod, todayJakarta, type PeriodId } from "@/lib/period";
import { downloadDatabase, restoreDatabase } from "@/lib/server/backup";
import { getDashboard, getMyProfile } from "@/lib/server/shop";
import type { DashboardData } from "@/lib/types";

export const Route = createFileRoute("/admin/")({ component: AdminDashboard });

function AdminDashboard() {
  const [period, setPeriod] = useState<PeriodId>("harian");
  const [customFrom, setCustomFrom] = useState(todayJakarta);
  const [customTo, setCustomTo] = useState(todayJakarta);
  const { from, to } = rangeForPeriod(period, customFrom, customTo);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [role, setRole] = useState("");

  useEffect(() => {
    void getMyProfile()
      .then((profile) => setRole(profile.role))
      .catch(() => setRole(""));
  }, []);

  useEffect(() => {
    setData(null);
    void getDashboard({ data: { from, to } })
      .then(setData)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Gagal memuat"));
  }, [from, to]);

  function onPeriod(id: PeriodId) {
    if (id === "kustom") {
      const next = rangeForPeriod(period, customFrom, customTo);
      setCustomFrom(next.from);
      setCustomTo(next.to);
    }
    setPeriod(id);
  }

  if (error && role !== "admin") return <p className="text-sm text-accent">{error}</p>;

  const omset = (data?.omset ?? []).map((row) => ({
    ...row,
    label: chartDayLabel(row.day),
  }));

  return (
    <div className="space-y-8">
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
      <p className="text-sm text-muted">
        Periode {formatPeriodLabel(from, to)}
        {role === "staff" ? " · akun staff hanya dapat melihat data" : ""}
      </p>
      {role === "admin" ? (
        <DatabaseCard
          onRestored={() => {
            setData(null);
            setError("");
            void getDashboard({ data: { from, to } })
              .then(setData)
              .catch((err: unknown) => setError(err instanceof Error ? err.message : "Gagal memuat"));
          }}
        />
      ) : null}
      {error ? <p className="text-sm text-accent">{error}</p> : null}

      {!data ? (
        <div className="h-64 rounded-2xl bg-primary/8" />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Omset masuk" value={formatRupiah(data.totals.masuk)} />
            <Stat label="Pengeluaran" value={formatRupiah(data.totals.keluar)} />
            <Stat label="Saldo" value={formatRupiah(data.totals.saldo)} />
            <Stat label="Pesanan" value={String(data.totals.orders)} />
          </section>

          <WebVitalsMetrics />

          <section className="rounded-2xl bg-surface p-5 shadow-[var(--shadow-border)]">
            <h2 className="text-xl font-semibold">Pendapatan omset</h2>
            <p className="mt-1 text-sm text-muted">Pesanan lunas yang tidak dibatalkan, per hari.</p>
            <div className="mt-4 h-64">
              {omset.length === 0 ? (
                <EmptyChart text="Belum ada penjualan pada periode ini." />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={omset}>
                    <CartesianGrid stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: "var(--color-muted)", fontSize: 12 }} />
                    <YAxis
                      tick={{ fill: "var(--color-muted)", fontSize: 12 }}
                      tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                    />
                    <Tooltip
                      formatter={(v: number) => formatRupiah(v)}
                      labelFormatter={(l) => `Tanggal ${l}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="var(--color-primary)"
                      fill="var(--color-primary)"
                      fillOpacity={0.15}
                      name="Omset"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl bg-surface p-5 shadow-[var(--shadow-border)]">
              <h2 className="text-xl font-semibold">Buah yang terbeli</h2>
              <p className="mt-1 text-sm text-muted">Kuantitas per jenis pada periode ini.</p>
              <div className="mt-4 h-64">
                {data.fruits.length === 0 ? (
                  <EmptyChart text="Belum ada item terjual pada periode ini." />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.fruits.slice(0, 8)} layout="vertical" margin={{ left: 16 }}>
                      <CartesianGrid stroke="var(--color-border)" horizontal={false} />
                      <XAxis type="number" tick={{ fill: "var(--color-muted)", fontSize: 12 }} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={110}
                        tick={{ fill: "var(--color-fg)", fontSize: 12 }}
                      />
                      <Tooltip formatter={(v: number) => `${v} unit`} />
                      <Bar dataKey="qty" fill="var(--color-primary)" name="Terjual" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>

            <section className="rounded-2xl bg-surface p-5 shadow-[var(--shadow-border)]">
              <h2 className="text-xl font-semibold">Buah favorit</h2>
              <p className="mt-1 text-sm text-muted">Lima jenis dengan kuantitas tertinggi.</p>
              {data.favorites.length === 0 ? (
                <EmptyChart text="Favorit muncul setelah ada penjualan." />
              ) : (
                <ol className="mt-4 space-y-3">
                  {data.favorites.map((item, i) => (
                    <li key={item.slug} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="grid size-8 place-items-center rounded-md bg-accent/10 text-sm font-medium text-accent">
                          {i + 1}
                        </span>
                        <span className="font-medium">{item.name}</span>
                      </div>
                      <span className="text-sm tabular-nums text-muted">{item.qty} unit</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface p-5 shadow-[var(--shadow-border)]">
      <p className="text-xs font-medium uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-2 font-display text-2xl tracking-wide text-fg">{value}</p>
    </div>
  );
}

function EmptyChart({ text }: { text: string }) {
  return (
    <div className="grid h-full min-h-40 place-items-center rounded-xl bg-bg px-6 text-center text-sm text-muted">
      {text}
    </div>
  );
}

function DatabaseCard({ onRestored }: { onRestored: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"download" | "upload" | null>(null);
  const [fileName, setFileName] = useState("");

  async function onDownload(e: FormEvent) {
    e.preventDefault();
    if (!password) {
      toast.error("Isi kata sandi admin.");
      return;
    }
    setBusy("download");
    try {
      const file = await downloadDatabase({ data: { password } });
      downloadBlob(file.filename, new Blob([file.json], { type: "application/json" }));
      toast.success("Database diunduh.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengunduh database.");
    } finally {
      setBusy(null);
    }
  }

  async function onUpload(e: FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.error("Pilih file cadangan.");
      return;
    }
    if (!password) {
      toast.error("Isi kata sandi admin.");
      return;
    }
    if (!window.confirm("Database yang ada akan diganti dengan file ini. Lanjutkan?")) return;
    setBusy("upload");
    try {
      const json = await file.text();
      await restoreDatabase({ data: { password, json } });
      setPassword("");
      setFileName("");
      if (fileRef.current) fileRef.current.value = "";
      toast.success("Database berhasil dipulihkan.");
      onRestored();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengunggah database.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rounded-2xl bg-surface p-5 shadow-[var(--shadow-border)]">
      <h2 className="text-xl font-semibold">Database</h2>
      <p className="mt-1 text-sm text-muted">
        Unduh atau unggah cadangan buah, pesanan, keuangan, pelanggan, dan pengguna. Kata sandi admin
        wajib diisi. Unggah mengganti data yang ada.
      </p>
      <form onSubmit={onDownload} className="mt-4 grid gap-3 sm:grid-cols-[16rem_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="db-password">Kata sandi admin</Label>
          <Input
            id="db-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" variant="secondary" disabled={busy !== null}>
          {busy === "download" ? "Mengunduh…" : "Unduh database"}
        </Button>
      </form>
      <form onSubmit={onUpload} className="mt-4 flex flex-wrap items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="text-sm"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
        />
        <Button type="submit" disabled={busy !== null || !fileName}>
          {busy === "upload" ? "Mengunggah…" : "Unggah database"}
        </Button>
      </form>
    </section>
  );
}
