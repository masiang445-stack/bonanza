import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/cn";

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 500,
  className,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex h-11 items-center rounded-md border border-border bg-surface shadow-[var(--shadow-border)]",
        className,
      )}
    >
      <button
        type="button"
        className="grid size-11 place-items-center text-fg transition-colors duration-150 hover:text-primary disabled:opacity-30"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Kurangi"
      >
        <Minus className="size-4" />
      </button>
      <input
        type="number"
        min={min}
        max={max}
        inputMode="numeric"
        value={value}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") {
            onChange(min);
            return;
          }
          const n = Number(raw);
          if (!Number.isFinite(n)) return;
          onChange(Math.min(max, Math.max(min, Math.floor(n))));
        }}
        className="h-11 w-16 bg-transparent text-center text-sm font-medium tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        aria-label="Jumlah"
      />
      <button
        type="button"
        className="grid size-11 place-items-center text-fg transition-colors duration-150 hover:text-primary disabled:opacity-30"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Tambah"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}
