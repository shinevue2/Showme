/**
 * Scroll (DESIGN §5.8, §8.5 ScrollAPI). Owner: WP-00.
 * `track()` uses GSAP ScrollTrigger (progress only: onUpdate / onToggle — never pin, never scrub on media)
 * once the motion chunk has loaded, and a small passive scroll-event tracker before that (or if the chunk
 * fails). Both parse the same `start` / `end` strings ("<element edge> <viewport edge>", edges = top |
 * center | bottom | N% | Npx). Rects are cached (ResizeObserver + refresh), never measured per frame.
 */
import type { BandId, ScrollAPI, SectionId, TrackOptions } from './types';
import { SECTION_ORDER } from './types';
import { frame } from './frame';

/* ---------- minimal types for the lazily loaded libraries ---------- */
export interface ScrollTriggerLike {
  create(vars: Record<string, unknown>): { kill(): void; progress: number; isActive: boolean };
  refresh(): void;
  update(): void;
}
export interface LenisScrollLike {
  scrollTo(target: number | string | HTMLElement, opts?: { offset?: number; immediate?: boolean; force?: boolean }): void;
}

/* ---------- start/end parsing shared by the fallback tracker ---------- */
function edge(token: string | undefined, size: number): number {
  if (!token) return 0;
  if (token === 'top') return 0;
  if (token === 'center') return size / 2;
  if (token === 'bottom') return size;
  const m = /^(-?[\d.]+)(%|px)?$/.exec(token);
  if (!m) return 0;
  const v = Number(m[1]);
  return m[2] === 'px' ? v : (v / 100) * size;
}
function parsePos(pos: string, elTop: number, elH: number, vh: number): number {
  const [a, b] = pos.trim().split(/\s+/);
  return elTop + edge(a, elH) - edge(b ?? 'top', vh);
}

class SimpleTrigger {
  top = 0; height = 0; p = -1; active = false; dead = false;
  constructor(public el: Element, public opts: TrackOptions) { this.measure(); this.update(); }
  measure(): void {
    const r = this.el.getBoundingClientRect();
    this.top = r.top + scrollY;
    this.height = r.height;
  }
  update(): void {
    if (this.dead) return;
    const vh = innerHeight;
    const s = parsePos(this.opts.start ?? 'top bottom', this.top, this.height, vh);
    const e = parsePos(this.opts.end ?? 'bottom top', this.top, this.height, vh);
    const y = scrollY;
    const raw = e > s ? (y - s) / (e - s) : y >= s ? 1 : 0;
    const p = raw < 0 ? 0 : raw > 1 ? 1 : raw;
    const active = y >= s && y <= e;
    if (p !== this.p) { this.p = p; this.opts.onUpdate(p); }
    if (active !== this.active) { this.active = active; this.opts.onToggle?.(active); }
  }
}

interface Handle { el: Element; opts: TrackOptions; kill: () => void; impl: { kill(): void } | SimpleTrigger | null }

class ScrollImpl implements ScrollAPI {
  private st: ScrollTriggerLike | null = null;
  private lenis: LenisScrollLike | null = null;
  private simple = new Set<SimpleTrigger>();
  private ro: ResizeObserver;
  private activeId: SectionId = 'cover';
  private activeCbs = new Set<(id: SectionId) => void>();
  private refreshCbs = new Set<() => void>();
  private shared = new Map<string, { listeners: Set<(p: number) => void>; last: number; kill: () => void }>();
  private lastY = 0;
  private lastT = 0;
  private vel = 0;
  private velTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.lastY = scrollY;
    this.ro = new ResizeObserver(() => this.remeasure());
    // positions depend on everything above a trigger: refresh (debounced, no rAF) when <main> changes height
    const main = document.getElementById('main');
    if (main) {
      let lastH = 0;
      let t: ReturnType<typeof setTimeout> | null = null;
      new ResizeObserver((entries) => {
        const h = entries[0]?.contentRect.height ?? 0;
        if (Math.abs(h - lastH) < 1) return;
        const first = lastH === 0;
        lastH = h;
        if (first) return;
        if (t) clearTimeout(t);
        t = setTimeout(() => this.refresh(), 120);
      }).observe(main);
    }
    addEventListener('scroll', this.onScroll, { passive: true });
    addEventListener('resize', () => this.remeasure(), { passive: true });
    this.observeSections();
  }

  get y(): number { return scrollY; }
  get velocity(): number { return this.vel; }
  get active(): SectionId { return this.activeId; }

  /** Called by the motion chunk once ScrollTrigger (and Lenis, when motion is on) are ready. */
  attach(st: ScrollTriggerLike | null, lenis: LenisScrollLike | null): void {
    if (st) this.st = st;
    this.lenis = lenis;
  }
  setLenis(lenis: LenisScrollLike | null): void { this.lenis = lenis; }
  onRefresh(cb: () => void): () => void { this.refreshCbs.add(cb); return () => this.refreshCbs.delete(cb); }

  private onScroll = (): void => {
    const now = performance.now();
    const y = scrollY;
    const dt = now - this.lastT;
    if (dt > 0 && dt < 200) this.vel = this.vel * 0.6 + (((y - this.lastY) / dt) * 1000) * 0.4;
    else this.vel = 0;
    this.lastY = y;
    this.lastT = now;
    if (this.velTimer) clearTimeout(this.velTimer);
    this.velTimer = setTimeout(() => { this.vel = 0; }, 120);
    for (const t of this.simple) t.update();
  };

  private remeasure(): void {
    for (const t of this.simple) { t.measure(); t.update(); }
  }

  private observeSections(): void {
    const els = SECTION_ORDER.map((id) => document.getElementById(id)).filter((e): e is HTMLElement => !!e);
    if (!els.length) return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          const id = (e.target as HTMLElement).dataset.section as SectionId;
          if (id && id !== this.activeId) {
            this.activeId = id;
            document.documentElement.dataset.activeSection = id;
            for (const cb of this.activeCbs) cb(id);
          }
        }
      }
    }, { rootMargin: '-50% 0px -50% 0px' });
    els.forEach((el) => io.observe(el));
  }

  track(el: Element, opts: TrackOptions): () => void {
    const h: Handle = { el, opts, impl: null, kill: () => undefined };
    if (this.st) {
      const inst = this.st.create({
        trigger: el,
        start: opts.start ?? 'top bottom',
        end: opts.end ?? 'bottom top',
        onUpdate: (self: { progress: number }) => opts.onUpdate(self.progress),
        onToggle: opts.onToggle ? (self: { isActive: boolean }) => opts.onToggle!(self.isActive) : undefined,
        onRefresh: (self: { progress: number }) => opts.onUpdate(self.progress),
      });
      h.impl = inst;
      opts.onUpdate(inst.progress);
      h.kill = () => inst.kill();
    } else {
      const t = new SimpleTrigger(el, opts);
      this.simple.add(t);
      this.ro.observe(el);
      h.impl = t;
      h.kill = () => { t.dead = true; this.simple.delete(t); };
    }
    return h.kill;
  }

  private sharedTrack(key: string, el: HTMLElement | null, start: string, end: string) {
    let s = this.shared.get(key);
    if (!s) {
      const listeners = new Set<(p: number) => void>();
      const entry = { listeners, last: 0, kill: () => undefined as void };
      if (el) entry.kill = this.track(el, { start, end, onUpdate: (p) => { entry.last = p; for (const cb of listeners) cb(p); } });
      this.shared.set(key, entry);
      s = entry;
    }
    return s;
  }

  band(id: BandId) {
    const el = document.querySelector<HTMLElement>(`[data-band="${id}"]`);
    return {
      el,
      on: (cb: (p: number) => void) => {
        const s = this.sharedTrack('band:' + id, el, 'top bottom', 'bottom top');
        s.listeners.add(cb);
        cb(s.last);
        return () => { s.listeners.delete(cb); };
      },
    };
  }

  section(id: SectionId) {
    const el = document.getElementById(id) as HTMLElement;
    return {
      el,
      on: (cb: (p: number) => void) => {
        const sticky = !!el?.hasAttribute('data-sticky');
        const s = this.sharedTrack('section:' + id, el, sticky ? 'top top' : 'top bottom', sticky ? 'bottom bottom' : 'bottom top');
        s.listeners.add(cb);
        cb(s.last);
        return () => { s.listeners.delete(cb); };
      },
    };
  }

  onActive(cb: (id: SectionId) => void): () => void {
    this.activeCbs.add(cb);
    return () => this.activeCbs.delete(cb);
  }

  scrollTo(target: string | Element | number, opts: { immediate?: boolean; offset?: number } = {}): void {
    if (this.lenis) {
      this.lenis.scrollTo(target as number | string | HTMLElement, { offset: opts.offset ?? 0, immediate: !!opts.immediate, force: true });
      frame.request();
      return;
    }
    let y: number;
    if (typeof target === 'number') y = target;
    else {
      const el = typeof target === 'string' ? document.querySelector(target) : target;
      if (!el) return;
      const pad = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      y = el.getBoundingClientRect().top + scrollY - pad;
    }
    window.scrollTo({ top: y + (opts.offset ?? 0), behavior: 'instant' as ScrollBehavior });
  }

  refresh(): void {
    try { this.st?.refresh(); } catch (e) { console.error(e); }
    this.remeasure();
    for (const cb of this.refreshCbs) cb();
    frame.request();
  }
}

export type ScrollImplType = ScrollImpl;
export function createScroll(): ScrollImpl {
  return new ScrollImpl();
}
