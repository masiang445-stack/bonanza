import { useEffect, useSyncExternalStore } from "react";
import {
  formatVital,
  getWebVitals,
  startWebVitals,
  subscribeWebVitals,
  vitalRatingLabel,
  type VitalRating,
} from "@/lib/web-vitals";
import { cn } from "@/lib/cn";

function ratingClass(rating: VitalRating | null) {
  if (rating === "good") return "text-primary";
  if (rating === "poor") return "text-accent";
  return "text-muted";
}

export function WebVitalsCollector() {
  useEffect(() => {
    startWebVitals();
  }, []);
  return null;
}

export function WebVitalsMetrics() {
  useEffect(() => {
    startWebVitals();
  }, []);
  const vitals = useSyncExternalStore(subscribeWebVitals, getWebVitals, getWebVitals);

  return (
    <section className="rounded-2xl bg-surface p-5 shadow-[var(--shadow-border)]">
      <h2 className="text-xl font-semibold">Web Vitals</h2>
      <p className="mt-1 text-sm text-muted">Metrik sesi ini: LCP, INP, CLS, FCP, TTFB.</p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {vitals.map((vital) => (
          <article key={vital.name} className="rounded-xl bg-bg px-3 py-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted">{vital.label}</p>
            <p className={cn("mt-1 text-lg font-semibold tabular-nums", ratingClass(vital.rating))}>
              {formatVital(vital)}
            </p>
            <p className="mt-0.5 text-xs text-muted">{vital.hint}</p>
            <p className={cn("mt-1 text-xs font-medium", ratingClass(vital.rating))}>
              {vitalRatingLabel(vital.rating)}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
