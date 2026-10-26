/**
 * The stage (DESIGN §8.6; threejs §a with the design's decisions). Owner: WP-00.
 *
 * One fixed <canvas id="stage">, one WebGLRenderer, many scissored views:
 *  - views register a DOM placeholder; rects are cached via ResizeObserver + docTop (never measured per frame);
 *    viewport = the full placeholder rect, scissor = its visible part (GL origin bottom-left);
 *  - live-view cap: tier.maxLiveViews (+1 while a 間 band between two candidate views is on screen);
 *    priority = visible area; the others show their poster (data-live="0");
 *  - warm-ahead (IntersectionObserver, tier.warmAhead screens), one view at a time during idle:
 *    init → allocate → compileAsync → prewarm; park when > 3 screens away or over the VRAM budget;
 *  - render on demand through core/frame.ts: a frame runs only when a visible live view asked for one, the
 *    pointer moved over a view, scroll/resize happened, requestFrame() was called or uNight/outline tween;
 *    no visible view or document.hidden → zero frames;
 *  - views clear depth only by default (transparent canvas: the DOM paper shows through); clear: 'all' for
 *    opaque views; post pass on the high tier only; governor; context-loss posters; deterministic restore.
 */
import * as THREE from 'three';
import type { AppContext, BandId, GlobalUniforms, SectionId, StageAPI, StageStats, Tier, View, ViewFrame, ViewOptions } from '../../core/types';
import { frame } from '../../core/frame';
import { johakyu } from '../../core/easing';
import { lowerTier } from '../../core/tier';
import { debugHooks } from '../../core/debug';
import { Governor, type GovernedStage } from './governor';
import { Post } from './post';

type State = 'cold' | 'warming' | 'warm' | 'parked' | 'error';

interface Rec {
  view: View;
  opts: ViewOptions;
  state: State;
  idx: number;
  section: SectionId | null;
  docTop: number; left: number; w: number; h: number;
  near: boolean;          // inside the warm-ahead zone
  seen: boolean;          // intersects the viewport
  live: boolean;          // drawn this frame
  drawn: boolean;
  sectionP: number;
  ms: number;
  unsubSection: (() => void) | null;
}

const GLOBAL_PAUSES = new Set(['film', 'hidden', 'proof', 'context-lost']);

export interface StageImpl extends StageAPI {
  /** Resolves after the view with this id has drawn its first frame (poster capture). */
  whenDrawn(id: string): Promise<boolean>;
  readonly views: readonly View[];
  measure(): void;
}

class Stage implements StageImpl, GovernedStage {
  readonly renderer: THREE.WebGLRenderer;
  readonly g: GlobalUniforms;
  private recs: Rec[] = [];
  private counter = 0;
  private timer = new THREE.Timer();
  private pauses = new Set<string>();
  private outline = false;
  private vw = 1;
  private vh = 1;
  private _dpr = 1;
  private post: Post | null = null;
  private governor: Governor;
  private warmQueue: Rec[] = [];
  private warmBusy = false;
  private warmIO!: IntersectionObserver;
  private farIO!: IntersectionObserver;
  private seenIO: IntersectionObserver;
  private bandIO: IntersectionObserver;
  private ro: ResizeObserver;
  private bandsOnScreen = new Set<BandId>();
  private pointer = { x: 0, y: 0, has: false, down: false };
  private lost = false;
  private dirty = false;
  private night: { from: number; to: number; start: number; dur: number } | null = null;
  private statsCbs = new Set<(s: StageStats) => void>();
  private lastStatsEmit = 0;
  private fpsEwma = 0;
  private frameMs = 0;
  private lastFrameT = 0;
  private live: Rec[] = [];
  private drawnWaiters = new Map<string, ((ok: boolean) => void)[]>();
  private gpu: string;

  constructor(private canvas: HTMLCanvasElement, private ctx: AppContext) {
    const tier = ctx.tier.current;
    this._dpr = this.clampDpr(devicePixelRatio || 1, tier);
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      premultipliedAlpha: true,
      antialias: tier.msaa && this._dpr < 1.5,
      stencil: false,
      powerPreference: 'high-performance',
    });
    THREE.ColorManagement.enabled = true;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.autoClear = false;
    this.renderer.info.autoReset = false;
    this.renderer.debug.checkShaderErrors = import.meta.env.DEV;
    this.timer.connect(document);
    this.gpu = tier.renderer;
    this.g = {
      uTime: { value: 0 },
      uNight: { value: ctx.theme.current === 'night' ? 1 : 0 },
      uPointer: { value: new THREE.Vector2() },
      uScroll: { value: scrollY },
      uDpr: { value: this._dpr },
      uMotion: { value: ctx.motion.enabled ? 1 : 0 },
      uOutline: { value: 0 },
    };
    this.governor = new Governor(this);

    this.seenIO = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const r = this.find(e.target);
        if (!r) continue;
        r.seen = e.isIntersecting;
        if (r.seen && (r.state === 'cold' || r.state === 'parked')) this.enqueueWarm(r);
      }
      this.requestFrame();
    });
    this.bandIO = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const id = (e.target as HTMLElement).dataset.band as BandId;
        if (e.isIntersecting) this.bandsOnScreen.add(id); else this.bandsOnScreen.delete(id);
      }
      this.requestFrame();
    });
    document.querySelectorAll<HTMLElement>('[data-band]').forEach((b) => this.bandIO.observe(b));
    this.ro = new ResizeObserver(() => this.measure());
    // content above a view can change height (fonts, content-visibility, late sections) without the view
    // itself resizing: watch <main> too so cached docTops never go stale
    const main = document.getElementById('main');
    if (main) this.ro.observe(main);
    this.buildWarmObservers(tier);

    this.resize();
    addEventListener('resize', () => this.resize(), { passive: true });
    addEventListener('pointermove', this.onPointer, { passive: true });
    addEventListener('pointerdown', (e) => { this.pointer.down = true; this.onPointer(e); }, { passive: true });
    addEventListener('pointerup', () => { this.pointer.down = false; this.requestFrame(); }, { passive: true });
    document.addEventListener('visibilitychange', () => (document.hidden ? this.pause('hidden') : this.resume('hidden')));
    canvas.addEventListener('webglcontextlost', this.onLost, false);
    canvas.addEventListener('webglcontextrestored', this.onRestored, false);
    ctx.scroll.onActive(() => this.requestFrame());
    (ctx.scroll as unknown as { onRefresh?: (cb: () => void) => void }).onRefresh?.(() => this.measure());

    ctx.theme.on((t) => this.tweenNight(t === 'night' ? 1 : 0));
    ctx.motion.on((on) => { this.g.uMotion.value = on ? 1 : 0; this.requestFrame(); });
    ctx.tier.on((t) => this.applyTier(t));
    if (ctx.proof) this.pause('proof');

    // WP-04's outline view sets html[data-view="outline"]; mirror it into the stage.
    new MutationObserver(() => this.setOutline(document.documentElement.dataset.view === 'outline'))
      .observe(document.documentElement, { attributes: true, attributeFilter: ['data-view'] });

    if (tier.post) this.post = new Post(this.g);
    this.post?.resize(this.vw, this.vh, this._dpr);
    debugHooks.views = () => this.recs.map((r) => r.view);
    frame.setStage(this.frame);
  }

  /* ------------------------------------------------------------------ public API (StageAPI) */
  get tier(): Tier { return this.ctx.tier.current; }
  get views(): readonly View[] { return this.recs.map((r) => r.view); }
  get dpr(): number { return this._dpr; }
  get maxDprNow(): number { return Math.min(devicePixelRatio || 1, this.tier.maxDpr); }
  get minDprNow(): number { return Math.min(this.tier.minDpr, this.maxDprNow); }

  register(view: View, opts: ViewOptions = {}): void {
    if (this.recs.some((r) => r.view === view)) return;
    const el = view.el;
    const sectionEl = el.closest<HTMLElement>('[data-section]');
    const section = (sectionEl?.dataset.section as SectionId | undefined) ?? null;
    const rec: Rec = {
      view, opts, state: 'cold', idx: this.counter++, section,
      docTop: 0, left: 0, w: 0, h: 0, near: false, seen: false, live: false, drawn: false, sectionP: 0, ms: 0,
      unsubSection: null,
    };
    if (section) rec.unsubSection = this.ctx.scroll.section(section).on((p) => { rec.sectionP = p; });
    el.dataset.live = '0';
    el.dataset.viewState = 'cold';
    this.recs.push(rec);
    this.measureRec(rec);
    this.warmIO.observe(el);
    this.farIO.observe(el);
    this.seenIO.observe(el);
    this.ro.observe(el);
    this.requestFrame();
  }

  unregister(view: View): void {
    const i = this.recs.findIndex((r) => r.view === view);
    if (i < 0) return;
    const r = this.recs[i]!;
    this.recs.splice(i, 1);
    this.warmQueue = this.warmQueue.filter((x) => x !== r);
    [this.warmIO, this.farIO, this.seenIO].forEach((io) => io.unobserve(view.el));
    this.ro.unobserve(view.el);
    r.unsubSection?.();
    try { view.park?.(); view.dispose(); } catch (e) { console.error(e); }
    delete view.el.dataset.live;
    this.requestFrame();
  }

  requestFrame(): void { frame.request(); }

  pause(reason: string): void {
    if (this.pauses.has(reason)) return;
    this.pauses.add(reason);
    if (reason === 'film') this.canvas.style.visibility = 'hidden';
    if (reason.startsWith('eye:')) {
      const sec = reason.slice(4);
      for (const r of this.recs) if (r.section === sec && r.state === 'warm') this.park(r);
    }
    this.requestFrame();
  }

  resume(reason: string): void {
    if (!this.pauses.delete(reason)) return;
    if (reason === 'film') this.canvas.style.visibility = '';
    if (reason.startsWith('eye:')) {
      const sec = reason.slice(4);
      for (const r of this.recs) if (r.section === sec && r.near) this.enqueueWarm(r);
    }
    this.requestFrame();
  }

  setOutline(on: boolean): void {
    if (on === this.outline) return;
    this.outline = on;
    this.g.uOutline.value = on ? 1 : 0;
    for (const r of this.recs) if (r.state !== 'cold') r.view.setOutline?.(on);
    this.requestFrame();
  }

  stats(): StageStats {
    const info = this.renderer.info;
    const perViewMs: Record<string, number> = {};
    for (const r of this.recs) perViewMs[r.view.id] = Math.round(r.ms * 1000) / 1000;
    return {
      fps: Math.round(this.fpsEwma),
      frameMs: Math.round(this.frameMs * 100) / 100,
      calls: info.render.calls,
      triangles: info.render.triangles,
      programs: info.programs?.length ?? 0,
      textures: info.memory.textures,
      geometries: info.memory.geometries,
      dpr: this._dpr,
      tier: this.tier.name,
      live: this.live.map((r) => r.view.id),
      perViewMs,
      governor: this.governor.decision,
      gpu: this.gpu,
    };
  }

  onStats(cb: (s: StageStats) => void): () => void {
    this.statsCbs.add(cb);
    return () => this.statsCbs.delete(cb);
  }

  loseContext(): void { this.renderer.forceContextLoss(); }
  restoreContext(): void { this.renderer.forceContextRestore(); }

  whenDrawn(id: string): Promise<boolean> {
    const r = this.recs.find((x) => x.view.id === id);
    if (r?.drawn) return Promise.resolve(true);
    return new Promise((resolve) => {
      const list = this.drawnWaiters.get(id) ?? [];
      list.push(resolve);
      this.drawnWaiters.set(id, list);
      setTimeout(() => resolve(false), 20000);
    });
  }

  /* ------------------------------------------------------------------ governor hooks */
  setDpr(d: number): void {
    const next = this.clampDpr(d, this.tier);
    if (Math.abs(next - this._dpr) < 1e-3) return;
    this._dpr = next;
    this.g.uDpr.value = next;
    this.renderer.setPixelRatio(next);
    this.renderer.setSize(this.vw, this.vh, false);
    this.post?.resize(this.vw, this.vh, next);
    this.requestFrame();
  }

  degradeTier(): boolean {
    const cur = this.tier.name;
    const next = lowerTier(cur);
    if (next === cur) return false;
    this.ctx.tier.force(next);
    return true;
  }

  /* ------------------------------------------------------------------ internals */
  private clampDpr(d: number, t: Tier): number {
    const max = Math.min(devicePixelRatio || 1, t.maxDpr);
    return Math.max(Math.min(t.minDpr, max), Math.min(d, max));
  }

  private buildWarmObservers(t: Tier): void {
    this.warmIO?.disconnect();
    this.farIO?.disconnect();
    const ahead = Math.max(0, Math.round(t.warmAhead * 100));
    this.warmIO = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const r = this.find(e.target);
        if (!r) continue;
        r.near = e.isIntersecting;
        if (r.near && (r.state === 'cold' || r.state === 'parked')) this.enqueueWarm(r);
        else if (!r.near && r.state === 'warm' && this.vram() > this.tier.vramBudget) this.park(r);
      }
    }, { rootMargin: `${ahead}% 0px` });
    this.farIO = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const r = this.find(e.target);
        if (r && !e.isIntersecting && r.state === 'warm') this.park(r);   // > 3 screens away
      }
    }, { rootMargin: '300% 0px' });
    for (const r of this.recs) { this.warmIO.observe(r.view.el); this.farIO.observe(r.view.el); }
  }

  private applyTier(t: Tier): void {
    this.buildWarmObservers(t);
    this.setDpr(this._dpr);
    if (t.post && !this.post) { this.post = new Post(this.g); this.post.resize(this.vw, this.vh, this._dpr); }
    if (!t.post && this.post) { this.post.dispose(); this.post = null; }
    for (const r of this.recs) if (r.state !== 'cold') r.view.setTier?.(t);
    this.governor.reset();
    this.requestFrame();
  }

  private find(el: Element): Rec | undefined {
    return this.recs.find((r) => r.view.el === el);
  }

  private measureRec(r: Rec): void {
    const b = r.view.el.getBoundingClientRect();
    r.docTop = b.top + scrollY;
    r.left = b.left;
    r.w = b.width;
    r.h = b.height;
  }

  measure(): void {
    for (const r of this.recs) this.measureRec(r);
    this.requestFrame();
  }

  private resize(): void {
    this.vw = Math.max(1, this.canvas.clientWidth || innerWidth);
    this.vh = Math.max(1, this.canvas.clientHeight || innerHeight);
    this._dpr = this.clampDpr(this._dpr || devicePixelRatio || 1, this.tier);
    this.g.uDpr.value = this._dpr;
    this.renderer.setPixelRatio(this._dpr);
    this.renderer.setSize(this.vw, this.vh, false);
    this.post?.resize(this.vw, this.vh, this._dpr);
    this.measure();
  }

  private onPointer = (e: PointerEvent): void => {
    this.pointer.x = e.clientX;
    this.pointer.y = e.clientY;
    this.pointer.has = true;
    this.g.uPointer.value.set((e.clientX / this.vw) * 2 - 1, -((e.clientY / this.vh) * 2 - 1));
    const sy = scrollY;
    for (const r of this.live) {
      const top = r.docTop - sy;
      if (e.clientX >= r.left && e.clientX <= r.left + r.w && e.clientY >= top && e.clientY <= top + r.h) { this.requestFrame(); break; }
    }
  };

  private vram(): number {
    let s = 0;
    for (const r of this.recs) if (r.state === 'warm') s += r.view.vram || 0;
    return s;
  }

  private park(r: Rec): void {
    if (r.state !== 'warm') return;
    try { r.view.park?.(); } catch (e) { console.error(e); }
    r.state = 'parked';
    r.view.el.dataset.viewState = 'parked';
    r.view.el.dataset.live = '0';
    r.live = false;
    this.requestFrame();
  }

  private enqueueWarm(r: Rec): void {
    if (this.lost || r.state === 'warm' || r.state === 'warming' || r.state === 'error') return;
    if (r.section && this.pauses.has('eye:' + r.section)) return;
    if (!this.warmQueue.includes(r)) this.warmQueue.push(r);
    this.pumpWarm();
  }

  private pumpWarm(): void {
    if (this.warmBusy) return;
    // nearest-to-viewport first
    const sy = scrollY;
    this.warmQueue.sort((a, b) => Math.abs(a.docTop - sy) - Math.abs(b.docTop - sy));
    const r = this.warmQueue.shift();
    if (!r) return;
    this.warmBusy = true;
    const run = () => {
      this.warm(r).finally(() => {
        this.warmBusy = false;
        this.requestFrame();
        this.pumpWarm();
      });
    };
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    if (r.seen) run();
    else if (ric) ric(run, { timeout: 500 });
    else setTimeout(run, 50);
  }

  private async warm(r: Rec): Promise<void> {
    if (this.lost) return;
    const v = r.view;
    try {
      if (r.state === 'cold') {
        r.state = 'warming';
        v.el.dataset.viewState = 'warming';
        await v.init(this);
        v.setTier?.(this.tier);
        if (this.outline) v.setOutline?.(true);
      } else {
        r.state = 'warming';
        v.el.dataset.viewState = 'warming';
      }
      await v.allocate?.(this);
      const compiling = [this.renderer.compileAsync(v.scene, v.camera)];
      if (this.post) {
        // high tier: views draw into the linear post RT, a second program variant — link it now, not on screen
        const prev = this.renderer.getRenderTarget();
        this.renderer.setRenderTarget(this.post.rt);
        compiling.push(this.renderer.compileAsync(v.scene, v.camera));
        this.renderer.setRenderTarget(prev);
      }
      await Promise.all(compiling);
      v.prewarm?.(this);
      if (this.lost) { r.state = 'parked'; return; }
      r.state = 'warm';
      v.el.dataset.viewState = 'warm';
    } catch (e) {
      console.error(`[stage] view ${v.id} failed to warm`, e);
      r.state = 'error';
      v.el.dataset.viewState = 'error';
    }
  }

  private tweenNight(to: number): void {
    if (!this.ctx.motion.enabled) {
      this.g.uNight.value = to;
      this.night = null;
      this.requestFrame();
      return;
    }
    this.night = { from: this.g.uNight.value, to, start: performance.now(), dur: 700 };
    this.requestFrame();
  }

  private bandBetween(cands: Rec[]): boolean {
    if (!this.bandsOnScreen.size) return false;
    const secs = new Set(cands.map((r) => r.section));
    for (const id of this.bandsOnScreen) {
      const [a, b] = id.split('-') as [SectionId, SectionId];
      if (secs.has(a) && secs.has(b)) return true;
    }
    return false;
  }

  private onLost = (): void => {
    this.lost = true;
    document.documentElement.classList.add('gl-lost');
    this.pauses.add('context-lost');
    for (const r of this.recs) { r.live = false; r.view.el.dataset.live = '0'; }
    this.live = [];
  };

  private onRestored = (): void => {
    this.lost = false;
    this.pauses.delete('context-lost');
    document.documentElement.classList.remove('gl-lost');
    for (const r of this.recs) {
      if (r.state === 'cold') continue;
      r.state = 'parked';
      r.view.el.dataset.viewState = 'parked';
      try { r.view.onContextRestored?.(); } catch (e) { console.error(e); }
    }
    if (this.post) { this.post.dispose(); this.post = new Post(this.g); this.post.resize(this.vw, this.vh, this._dpr); }
    this.measure();
    for (const r of this.recs) if (r.near || r.seen) this.enqueueWarm(r);
    this.requestFrame();
  };

  private frameInfo(r: Rec, top: number, visibleArea: number): ViewFrame {
    const p = this.pointer;
    let pointer: THREE.Vector2 | null = null;
    if (p.has && p.x >= r.left && p.x <= r.left + r.w && p.y >= top && p.y <= top + r.h) {
      pointer = new THREE.Vector2(((p.x - r.left) / r.w) * 2 - 1, -(((p.y - top) / r.h) * 2 - 1));
    }
    const progress = Math.min(1, Math.max(0, (this.vh - top) / (this.vh + r.h)));
    return {
      progress,
      sectionProgress: r.sectionP,
      visible: r.w * r.h > 0 ? visibleArea / (r.w * r.h) : 0,
      pointer,
      pointerDown: p.down && !!pointer,
      scrollVelocity: this.ctx.scroll.velocity,
    };
  }

  /** Called by core/frame on every tick of the one clock; returns true to keep the loop alive. */
  private frame = (t: number): boolean => {
    if (this.lost) return false;
    for (const reason of this.pauses) {
      if (GLOBAL_PAUSES.has(reason)) return false;
    }
    if (document.hidden) return false;
    const r0 = performance.now();
    const renderer = this.renderer;
    const sy = scrollY;
    const vw = this.vw, vh = this.vh;
    this.timer.update(t);
    const dt = Math.min(this.timer.getDelta(), 1 / 20);
    const time = this.timer.getElapsed();
    this.g.uTime.value = time;
    this.g.uScroll.value = sy;
    let more = false;

    if (this.night) {
      const k = Math.min(1, (performance.now() - this.night.start) / this.night.dur);
      this.g.uNight.value = this.night.from + (this.night.to - this.night.from) * johakyu(k);
      if (k >= 1) this.night = null; else more = true;
    }

    // candidates: warm, seen, not eye-paused, with visible area
    type Cand = { r: Rec; top: number; area: number };
    const cands: Cand[] = [];
    for (const r of this.recs) {
      if (!r.seen) continue;
      if (r.section && this.pauses.has('eye:' + r.section)) continue;
      const top = r.docTop - sy;
      const x0 = Math.max(0, r.left), y0 = Math.max(0, top);
      const x1 = Math.min(vw, r.left + r.w), y1 = Math.min(vh, top + r.h);
      const area = Math.max(0, x1 - x0) * Math.max(0, y1 - y0);
      if (area <= 0) continue;
      if (r.state !== 'warm') { if (r.state === 'cold' || r.state === 'parked') this.enqueueWarm(r); continue; }
      cands.push({ r, top, area });
    }
    cands.sort((a, b) => b.area - a.area || (a.r.opts.order ?? 0) - (b.r.opts.order ?? 0));
    const tier = this.tier;
    const cap = tier.maxLiveViews + (tier.bandExtraView && this.bandBetween(cands.map((c) => c.r)) ? 1 : 0);
    const chosen = cands.slice(0, Math.max(0, cap));
    const nextLive = new Set(chosen.map((c) => c.r));
    for (const r of this.recs) {
      const isLive = nextLive.has(r);
      if (r.live !== isLive) { r.live = isLive; r.view.el.dataset.live = isLive ? '1' : '0'; }
    }
    this.live = chosen.map((c) => c.r);

    if (!chosen.length) {
      if (this.dirty) {
        renderer.setRenderTarget(null);
        renderer.setScissorTest(false);
        renderer.clear(true, true, false);
        this.dirty = false;
      }
      return more;
    }

    // update
    const motionOn = this.ctx.motion.enabled;
    for (const c of chosen) {
      const v0 = performance.now();
      try {
        if (c.r.view.update(dt, time, this.frameInfo(c.r, c.top, c.area)) && motionOn) more = true;
      } catch (e) { console.error(`[stage] ${c.r.view.id}.update`, e); }
      c.r.ms = c.r.ms * 0.8 + (performance.now() - v0) * 0.2;
    }

    // render
    renderer.info.reset();
    const post = this.post;
    const target = post ? post.rt : null;
    renderer.setRenderTarget(target);
    renderer.setScissorTest(false);
    renderer.clear(true, true, false);
    let ux0 = Infinity, uy0 = Infinity, ux1 = -Infinity, uy1 = -Infinity;
    const ordered = chosen.slice().sort((a, b) => (a.r.opts.order ?? 0) - (b.r.opts.order ?? 0) || a.r.idx - b.r.idx);
    for (const c of ordered) {
      const r = c.r;
      const x = r.left, y = vh - (c.top + r.h);
      const sx0 = Math.max(0, x), sy0 = Math.max(0, y), sx1 = Math.min(vw, x + r.w), sy1 = Math.min(vh, y + r.h);
      if (sx1 <= sx0 || sy1 <= sy0) continue;
      ux0 = Math.min(ux0, sx0); uy0 = Math.min(uy0, sy0); ux1 = Math.max(ux1, sx1); uy1 = Math.max(uy1, sy1);
      const cam = r.view.camera as THREE.PerspectiveCamera;
      if (cam.isPerspectiveCamera && r.h > 0 && Math.abs(cam.aspect - r.w / r.h) > 1e-4) {
        cam.aspect = r.w / r.h;
        cam.updateProjectionMatrix();
      }
      if (target) {
        const k = target.width / vw;     // r186: RT viewport/scissor in RT pixels, then re-bind (P1)
        target.viewport.set(x * k, y * k, r.w * k, r.h * k);
        target.scissor.set(sx0 * k, sy0 * k, (sx1 - sx0) * k, (sy1 - sy0) * k);
        target.scissorTest = true;
        renderer.setRenderTarget(target);
      } else {
        renderer.setViewport(x, y, r.w, r.h);
        renderer.setScissor(sx0, sy0, sx1 - sx0, sy1 - sy0);
        renderer.setScissorTest(true);
      }
      if (r.opts.clear === 'all') renderer.clear(true, true, false); else renderer.clearDepth();
      const v0 = performance.now();
      try { r.view.render(renderer); } catch (e) { console.error(`[stage] ${r.view.id}.render`, e); }
      r.ms = r.ms * 0.8 + (performance.now() - v0) * 0.2 + 0;
      if (!r.drawn) {
        r.drawn = true;
        const w = this.drawnWaiters.get(r.view.id);
        if (w) { this.drawnWaiters.delete(r.view.id); w.forEach((fn) => fn(true)); }
      }
    }
    if (target) {
      target.scissorTest = false;
      if (ux1 > ux0 && uy1 > uy0) post!.render(renderer, vw, vh, { x: ux0, y: uy0, w: ux1 - ux0, h: uy1 - uy0 });
    } else {
      renderer.setScissorTest(false);
    }
    this.dirty = true;

    // stats + governor
    this.frameMs = this.frameMs * 0.9 + (performance.now() - r0) * 0.1;
    if (this.lastFrameT && t - this.lastFrameT < 250) {
      const inst = 1000 / Math.max(1, t - this.lastFrameT);
      this.fpsEwma = this.fpsEwma ? this.fpsEwma * 0.9 + inst * 0.1 : inst;
    }
    this.lastFrameT = t;
    this.governor.tick(t);
    if (this.statsCbs.size && t - this.lastStatsEmit > 250) {
      this.lastStatsEmit = t;
      const s = this.stats();
      for (const cb of this.statsCbs) cb(s);
    }
    return more;
  };
}

export function createStage(canvas: HTMLCanvasElement, ctx: AppContext): StageImpl {
  return new Stage(canvas, ctx);
}

export type { View };
