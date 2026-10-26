/**
 * Fetching the film (DESIGN §7.6, video §3.2): the whole file as one Blob, then played from an object URL.
 * Triggers, whichever comes first: an idle prefetch on fast connections (priority low), the section within
 * three viewports (IntersectionObserver rootMargin 300 %, priority high), or an explicit `go()` (the
 * summary-road band starting). One request; through the HTTP cache, so a repeat visit is instant.
 * Never streams into chunks (that would keep a second copy alive until GC). Owner: WP-06.
 */

export interface FilmLoader {
  readonly blob: Promise<Blob>;
  readonly started: boolean;
  go(priority?: 'high' | 'low'): void;
  abort(): void;
}

type Idle = (cb: () => void) => void;
const idle: Idle = (cb) => {
  const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
  if (ric) ric(cb, { timeout: 4000 }); else setTimeout(cb, 2500);
};

export function createLoader(url: string, section: Element, opts: { prefetch: boolean; observe?: boolean }): FilmLoader {
  let started = false;
  let io: IntersectionObserver | null = null;
  const ctl = new AbortController();
  let resolve!: (b: Blob) => void;
  let reject!: (e: unknown) => void;
  const blob = new Promise<Blob>((res, rej) => { resolve = res; reject = rej; });
  blob.catch(() => undefined);              // a rejection is handled by whoever awaits; never unhandled

  const go = (priority: 'high' | 'low' = 'high') => {
    if (started) return;
    started = true;
    io?.disconnect();
    io = null;
    fetch(url, { priority, credentials: 'omit', signal: ctl.signal } as RequestInit)
      .then((r) => { if (!r.ok) throw new Error(`film ${r.status}`); return r.blob(); })
      .then(resolve, reject);
  };

  if (opts.observe !== false) {
    io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) go('high'); }, { rootMargin: '300% 0px' });
    io.observe(section);
  }
  if (opts.prefetch) {
    if (document.readyState === 'complete') idle(() => go('low'));
    else addEventListener('load', () => idle(() => go('low')), { once: true });
  }

  return {
    blob,
    get started() { return started; },
    go,
    abort() { io?.disconnect(); io = null; ctl.abort(); },
  };
}
