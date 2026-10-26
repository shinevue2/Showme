/**
 * The one clock (DESIGN §5.8). Owner: WP-00.
 *
 * A single rAF loop that runs only while something needs it: Lenis is animating, a view requested a frame,
 * a GSAP tween is active, a registered callback returned true, or a module holds a busy token. Each tick:
 *   lenis.raf(t) → gsap.updateRoot(t / 1000) → stage.frame(t) → registered callbacks.
 * The loop stops after two idle frames: zero rAF at idle. Scroll, wheel and resize request one frame.
 * (The film controller may keep its own idle-stopping rAF per video §4.3.)
 */

export type FrameCallback = (t: number, dt: number) => boolean | void;

export interface LenisLike {
  raf(time: number): void;
  readonly isScrolling: boolean | 'native' | 'smooth' | string;
  readonly animatedScroll: number;
  readonly targetScroll: number;
}

interface Entry { fn: FrameCallback; order: number }

class FrameLoop {
  private rafId = 0;
  private idleFrames = 0;
  private requested = false;
  private last = 0;
  private entries: Entry[] = [];
  private tokens = new Map<string, number>();
  private lenis: LenisLike | null = null;
  private gsapUpdate: ((tMs: number) => void) | null = null;
  private gsapActive: (() => boolean) | null = null;
  private stageFrame: ((t: number, dt: number) => boolean) | null = null;
  private listening = false;
  private inTick = false;
  /** Total ticks since load (debug/tests). */
  ticks = 0;

  get running(): boolean { return this.rafId !== 0; }

  /** Ask for (at least) one more frame. Cheap and idempotent. */
  request = (): void => {
    this.requested = true;
    this.idleFrames = 0;
    // A request made during a tick is honoured by the re-arm at the end of that tick (one rAF chain only).
    if (!this.rafId && !this.inTick) this.rafId = requestAnimationFrame(this.tick);
  };

  /** Register a per-frame callback; return true from it to keep the loop alive. Lower order runs first. */
  add(fn: FrameCallback, order = 0): () => void {
    const e = { fn, order };
    this.entries.push(e);
    this.entries.sort((a, b) => a.order - b.order);
    this.request();
    return () => { this.entries = this.entries.filter((x) => x !== e); };
  }

  /** Hold the loop running until the returned release function is called. */
  busy(name: string): () => void {
    this.tokens.set(name, (this.tokens.get(name) ?? 0) + 1);
    this.request();
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const n = (this.tokens.get(name) ?? 1) - 1;
      if (n <= 0) this.tokens.delete(name); else this.tokens.set(name, n);
    };
  }

  setLenis(l: LenisLike | null): void { this.lenis = l; this.request(); }
  setGsap(update: ((tMs: number) => void) | null, active: (() => boolean) | null): void {
    this.gsapUpdate = update;
    this.gsapActive = active;
    this.request();
  }
  setStage(fn: ((t: number, dt: number) => boolean) | null): void { this.stageFrame = fn; this.request(); }

  /** Start listening to the inputs that move things (idempotent). */
  listen(): void {
    if (this.listening) return;
    this.listening = true;
    const opts: AddEventListenerOptions = { passive: true };
    addEventListener('scroll', this.request, opts);
    addEventListener('wheel', this.request, opts);
    addEventListener('resize', this.request, opts);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.request(); });
  }

  private tick = (t: number): void => {
    this.rafId = 0;
    this.ticks++;
    const dt = this.last ? Math.min(t - this.last, 250) : 1000 / 60;
    this.last = t;
    this.requested = false;
    let more = false;
    this.inTick = true;
    try {
      const l = this.lenis;
      if (l) {
        l.raf(t);
        if (l.isScrolling === 'smooth' || Math.abs(l.targetScroll - l.animatedScroll) > 0.5) more = true;
      }
      if (this.gsapUpdate) {
        this.gsapUpdate(t);
        if (this.gsapActive?.()) more = true;
      }
      if (this.stageFrame && this.stageFrame(t, dt)) more = true;
      for (const e of this.entries.slice()) if (e.fn(t, dt)) more = true;
    } catch (err) {
      console.error('[frame]', err);
    }
    this.inTick = false;
    if (this.rafId) return;   // defensive: a chain is already armed
    if (this.tokens.size) more = true;
    if (more || this.requested) {
      this.idleFrames = 0;
      this.rafId = requestAnimationFrame(this.tick);
    } else if (++this.idleFrames < 2) {
      this.rafId = requestAnimationFrame(this.tick);
    } else {
      this.last = 0;          // loop stops: zero rAF at idle
    }
  };
}

export const frame = new FrameLoop();
