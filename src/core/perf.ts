/**
 * Performance observers (DESIGN §4.1 Info panel, §6.11 live weight / vitals, §10.4). Owner: WP-00.
 * bytes(): Resource Timing transfer sizes + navigation. vitals(): LCP, CLS (session-less sum without recent
 * input), INP (worst interaction duration — an approximation good enough for the Info panel).
 */
import type { PerfAPI } from './types';

export function createPerf(): PerfAPI {
  let lcp: number | undefined;
  let cls = 0;
  let inp: number | undefined;
  const listeners = new Set<() => void>();
  let pending: ReturnType<typeof setTimeout> | null = null;
  const notify = () => {
    if (pending) return;
    pending = setTimeout(() => { pending = null; for (const cb of listeners) cb(); }, 250);
  };
  const observe = (type: string, cb: (e: PerformanceEntry) => void, opts: Record<string, unknown> = {}) => {
    try {
      const po = new PerformanceObserver((list) => { list.getEntries().forEach(cb); notify(); });
      po.observe({ type, buffered: true, ...opts } as PerformanceObserverInit);
    } catch { /* unsupported entry type */ }
  };
  observe('largest-contentful-paint', (e) => { lcp = e.startTime; });
  observe('layout-shift', (e) => {
    const ls = e as PerformanceEntry & { value: number; hadRecentInput: boolean };
    if (!ls.hadRecentInput) cls += ls.value;
  });
  observe('event', (e) => {
    const ev = e as PerformanceEntry & { interactionId?: number; duration: number };
    if (ev.interactionId) inp = Math.max(inp ?? 0, ev.duration);
  }, { durationThreshold: 16 });
  observe('resource', () => undefined);

  return {
    bytes() {
      let total = 0;
      try {
        const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
        total += nav?.transferSize ?? 0;
        for (const r of performance.getEntriesByType('resource') as PerformanceResourceTiming[]) total += r.transferSize || 0;
      } catch { /* ignore */ }
      return total;
    },
    vitals: () => ({ lcp, inp, cls: Math.round(cls * 1000) / 1000 }),
    on(cb) { listeners.add(cb); return () => listeners.delete(cb); },
    mark(name: string) { try { performance.mark('hanmoto:' + name); } catch { /* ignore */ } },
  };
}

/** Resolves once LCP has been observed (or after `timeout` ms). */
export function whenLcp(timeout = 4000): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    try {
      const po = new PerformanceObserver((list) => { if (list.getEntries().length) { po.disconnect(); finish(); } });
      po.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch { finish(); }
    setTimeout(finish, timeout);
  });
}
