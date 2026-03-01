// ─── Performance Monitoring Hook ─────────────────────────────────────
// Tracks Core Web Vitals (LCP, FID/INP, CLS) and reports them.
// In production, send to an analytics endpoint. In dev, logs to console.

export interface WebVitalMetric {
  name: 'LCP' | 'FID' | 'CLS' | 'INP' | 'TTFB' | 'FCP';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  navigationType: string;
}

type ReportFn = (metric: WebVitalMetric) => void;

// ─── Thresholds (per web.dev) ─────────────────

const THRESHOLDS: Record<string, [number, number]> = {
  LCP: [2500, 4000],
  FID: [100, 300],
  CLS: [0.1, 0.25],
  INP: [200, 500],
  TTFB: [800, 1800],
  FCP: [1800, 3000],
};

function rate(name: string, value: number): WebVitalMetric['rating'] {
  const [good, poor] = THRESHOLDS[name] ?? [Infinity, Infinity];
  if (value <= good) return 'good';
  if (value <= poor) return 'needs-improvement';
  return 'poor';
}

// ─── PerformanceObserver based collection ─────

let initialized = false;

export function initWebVitals(onReport?: ReportFn) {
  if (initialized || typeof window === 'undefined' || !('PerformanceObserver' in window)) return;
  initialized = true;

  const report: ReportFn = onReport ?? defaultReporter;

  // LCP
  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1] as PerformanceEntry & { startTime: number };
      if (last) {
        report({
          name: 'LCP',
          value: last.startTime,
          rating: rate('LCP', last.startTime),
          navigationType: getNavType(),
        });
      }
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch { /* unsupported */ }

  // CLS
  try {
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const le = entry as PerformanceEntry & { hadRecentInput: boolean; value: number };
        if (!le.hadRecentInput) {
          clsValue += le.value;
        }
      }
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });

    // Report CLS on page hide
    const reportCls = () => {
      report({
        name: 'CLS',
        value: clsValue,
        rating: rate('CLS', clsValue),
        navigationType: getNavType(),
      });
    };
    addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') reportCls();
    });
    addEventListener('pagehide', reportCls);
  } catch { /* unsupported */ }

  // FID / INP
  try {
    const fidObserver = new PerformanceObserver((list) => {
      const entry = list.getEntries()[0] as PerformanceEntry & { processingStart: number; startTime: number };
      if (entry) {
        const value = entry.processingStart - entry.startTime;
        report({
          name: 'FID',
          value,
          rating: rate('FID', value),
          navigationType: getNavType(),
        });
      }
    });
    fidObserver.observe({ type: 'first-input', buffered: true });
  } catch { /* unsupported */ }

  // TTFB
  try {
    const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (navEntry) {
      const ttfb = navEntry.responseStart - navEntry.requestStart;
      report({
        name: 'TTFB',
        value: ttfb,
        rating: rate('TTFB', ttfb),
        navigationType: getNavType(),
      });
    }
  } catch { /* unsupported */ }

  // FCP
  try {
    const fcpObserver = new PerformanceObserver((list) => {
      const entry = list.getEntries().find((e) => e.name === 'first-contentful-paint');
      if (entry) {
        report({
          name: 'FCP',
          value: entry.startTime,
          rating: rate('FCP', entry.startTime),
          navigationType: getNavType(),
        });
      }
    });
    fcpObserver.observe({ type: 'paint', buffered: true });
  } catch { /* unsupported */ }
}

function getNavType(): string {
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  return nav?.type ?? 'navigate';
}

function defaultReporter(metric: WebVitalMetric) {
  if (import.meta.env.DEV) {
    const color = metric.rating === 'good' ? '#22c55e' : metric.rating === 'needs-improvement' ? '#eab308' : '#ef4444';
    console.log(
      `%c[Web Vital] ${metric.name}: ${metric.value.toFixed(2)} (${metric.rating})`,
      `color: ${color}; font-weight: bold;`,
    );
  }

  // In production, beacon to analytics endpoint
  if (import.meta.env.PROD && import.meta.env.VITE_ANALYTICS_URL) {
    navigator.sendBeacon?.(
      import.meta.env.VITE_ANALYTICS_URL,
      JSON.stringify(metric),
    );
  }
}
