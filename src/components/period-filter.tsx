import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { PERIODS, type PeriodId } from "@/lib/period";

export function PeriodFilter({
  period,
  from,
  to,
  onPeriod,
  onCustom,
}: {
  period: PeriodId;
  from: string;
  to: string;
  onPeriod: (id: PeriodId) => void;
  onCustom: (from: string, to: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="hide-scrollbar flex gap-2 overflow-x-auto">
        {PERIODS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onPeriod(item.id)}
            className={cn(
              "inline-flex h-11 shrink-0 items-center rounded-full px-4 text-sm font-medium",
              period === item.id
                ? "bg-primary text-primary-fg"
                : "bg-surface text-fg shadow-[var(--shadow-border)]",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      {period === "kustom" ? (
        <div className="grid grid-cols-2 gap-3 sm:max-w-md">
          <Input
            type="date"
            aria-label="Dari tanggal"
            value={from}
            onChange={(e) => onCustom(e.target.value, to)}
          />
          <Input
            type="date"
            aria-label="Sampai tanggal"
            value={to}
            onChange={(e) => onCustom(from, e.target.value)}
          />
        </div>
      ) : null}
    </div>
  );
}
