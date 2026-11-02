export type VitalName = "LCP" | "INP" | "CLS" | "FCP" | "TTFB";
export type VitalRating = "good" | "ni" | "poor";

export type Vital = {
  name: VitalName;
  label: string;
  hint: string;
  value: number | null;
  rating: VitalRating | null;
};

const LABELS: Record<VitalName, { label: string; hint: string }> = {
  LCP: { label: "LCP", hint: "Largest Contentful Paint" },
  INP: { label: "INP", hint: "Interaction to Next Paint" },
  CLS: { label: "CLS", hint: "Cumulative Layout Shift" },
  FCP: { label: "FCP", hint: "First Contentful Paint" },
  TTFB: { label: "TTFB", hint: "Time to First Byte" },
};

const THRESHOLDS: Record<VitalName, [number, number]> = {
  LCP: [2500, 4000],
  INP: [200, 500],
  CLS: [0.1, 0.25],
  FCP: [1800, 3000],
  TTFB: [800, 1800],
};

const NAMES: VitalName[] = ["LCP", "INP", "CLS", "FCP", "TTFB"];

let lcp = 0;
let fcp = 0;
let ttfb = 0;
let cls = 0;
const interactions: number[] = [];
let started = false;
const listeners = new Set<() => void>();

function rate(name: VitalName, value: number): VitalRating {
  const [good, ni] = THRESHOLDS[name];
  if (value <= good) return "good";
  if (value <= ni) return "ni";
  return "poor";
}

function inpValue() {
  if (interactions.length === 0) return 0;
  const sorted = [...interactions].sort((a, b) => a - b);
  if (sorted.length < 50) return sorted[sorted.length - 1]!;
  const index = Math.min(sorted.length - 1, Math.round(sorted.length * 0.98) - 1);
  return sorted[Math.max(0, index)]!;
}

function snapshot(): Vital[] {
  const values: Record<VitalName, number> = {
    LCP: lcp,
    INP: inpValue(),
    CLS: cls,
    FCP: fcp,
    TTFB: ttfb,
  };
  return NAMES.map((name) => {
    const value = values[name];
    const empty = name === "INP" ? interactions.length === 0 : value <= 0;
    return {
      name,
      ...LABELS[name],
      value: empty ? null : value,
      rating: empty ? null : rate(name, value),
    };
  });
}

let cached: Vital[] = snapshot();

function emit() {
  cached = snapshot();
  listeners.forEach((fn) => fn());
}

function observe(
  type: string,
  onEntry: (entry: PerformanceEntry) => void,
  extra?: Record<string, unknown>,
) {
  try {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach(onEntry);
    });
    observer.observe({ type, buffered: true, ...extra } as PerformanceObserverInit);
  } catch {
    // browser tanpa entry type ini
  }
}

export function startWebVitals() {
  if (started || typeof window === "undefined" || typeof PerformanceObserver === "undefined") return;
  started = true;

  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  if (nav) {
    ttfb = nav.responseStart;
    emit();
  }

  observe("largest-contentful-paint", (entry) => {
    lcp = entry.startTime;
    emit();
  });

  observe("paint", (entry) => {
    if (entry.name === "first-contentful-paint") {
      fcp = entry.startTime;
      emit();
    }
  });

  observe("layout-shift", (entry) => {
    const shift = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
    if (!shift.hadRecentInput) {
      cls += shift.value;
      emit();
    }
  });

  observe(
    "event",
    (entry) => {
      const event = entry as PerformanceEventTiming & { interactionId?: number };
      if (!event.interactionId) return;
      interactions.push(event.duration);
      if (interactions.length > 200) interactions.splice(0, interactions.length - 200);
      emit();
    },
    { durationThreshold: 16 },
  );
}

export function subscribeWebVitals(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getWebVitals() {
  return cached;
}

export function formatVital(vital: Vital) {
  if (vital.value == null) return "–";
  if (vital.name === "CLS") return vital.value.toFixed(3);
  return `${Math.round(vital.value)} ms`;
}

export function vitalRatingLabel(rating: VitalRating | null) {
  if (rating === "good") return "Baik";
  if (rating === "ni") return "Perlu perbaikan";
  if (rating === "poor") return "Buruk";
  return "Mengukur";
}
