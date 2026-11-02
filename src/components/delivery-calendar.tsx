import { useState } from "react";
import { calendarCells, formatCheckoutDay, isDeliverableDay, monthTitle, todayJakarta } from "@/lib/period";
import { cn } from "@/lib/cn";

const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

export function DeliveryCalendar({
  value,
  onChange,
}: {
  value: string;
  onChange: (iso: string) => void;
}) {
  const today = todayJakarta();
  const initial = value && value.length >= 7 ? value : today;
  const [year, setYear] = useState(() => Number(initial.slice(0, 4)));
  const [month, setMonth] = useState(() => Number(initial.slice(5, 7)));
  const cells = calendarCells(year, month);
  const thisMonth = Number(today.slice(5, 7));
  const thisYear = Number(today.slice(0, 4));
  const maxIso = addMonth(today, 1);
  const atMin = year === thisYear && month === thisMonth;
  const atMax = year === Number(maxIso.slice(0, 4)) && month === Number(maxIso.slice(5, 7));

  function shift(delta: number) {
    const date = new Date(Date.UTC(year, month - 1 + delta, 1));
    setYear(date.getUTCFullYear());
    setMonth(date.getUTCMonth() + 1);
  }

  return (
    <div className="rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)]">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="grid size-11 place-items-center rounded-md text-fg hover:bg-primary/8 disabled:opacity-30"
          onClick={() => shift(-1)}
          disabled={atMin}
          aria-label="Bulan sebelumnya"
        >
          ‹
        </button>
        <p className="text-sm font-medium capitalize">{monthTitle(year, month)}</p>
        <button
          type="button"
          className="grid size-11 place-items-center rounded-md text-fg hover:bg-primary/8 disabled:opacity-30"
          onClick={() => shift(1)}
          disabled={atMax}
          aria-label="Bulan berikutnya"
        >
          ›
        </button>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase tracking-wider text-muted">
        {WEEKDAYS.map((d) => (
          <span key={d} className="py-1">
            {d}
          </span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          if (!cell) return <span key={`e-${i}`} />;
          const enabled = isDeliverableDay(cell.iso, today);
          const selected = cell.iso === value;
          return (
            <button
              key={cell.iso}
              type="button"
              disabled={!enabled}
              onClick={() => onChange(cell.iso)}
              className={cn(
                "grid aspect-square place-items-center rounded-md text-sm tabular-nums",
                selected
                  ? "bg-primary font-medium text-primary-fg"
                  : enabled
                    ? "text-fg hover:bg-primary/10"
                    : "text-subtle opacity-40",
              )}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
      {value ? (
        <p className="mt-3 rounded-md bg-primary/8 px-3 py-2 text-sm font-medium capitalize">
          {formatCheckoutDay(value)}
        </p>
      ) : (
        <p className="mt-3 text-sm text-muted">Pilih tanggal di kalender.</p>
      )}
    </div>
  );
}

function addMonth(iso: string, delta: number) {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7));
  const dt = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-01`;
}
