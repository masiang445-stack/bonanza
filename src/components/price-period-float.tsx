import { useEffect, useState } from "react";
import { formatPricePeriod } from "@/lib/period";
import { getPricePeriod } from "@/lib/server/shop";

export function PricePeriodFloat() {
  const [period, setPeriod] = useState("");

  useEffect(() => {
    void getPricePeriod()
      .then((row) => setPeriod(formatPricePeriod(row.from, row.to)))
      .catch(() => setPeriod(""));
  }, []);

  if (!period) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-4 pb-[env(safe-area-inset-bottom)] print:hidden">
      <p className="pointer-events-auto rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-fg shadow-[var(--shadow-border)]">
        Periode harga {period}
      </p>
    </div>
  );
}
