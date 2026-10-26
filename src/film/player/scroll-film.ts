/**
 * ScrollFilm — the scrub controller (DESIGN §7.6, video §4.3). Owner: WP-06.
 *
 * Rules it enforces:
 *  1. No work when idle: it runs on the site's one clock (core/frame) only while the damped time has not
 *     converged on the target or an approximate seek must be made exact; then it unregisters (zero rAF).
 *  2. Frame-quantised targets: a seek is issued only when the frame changes, at the frame centre (f + 0.5)/fps.
 *  3. Single flight: never a seek while one is in flight — from the assignment until its completion event
 *     ('seeked') has been handled, not just while `video.seeking` is true (it turns false a task before
 *     'seeked' is dispatched; issuing the next seek in that gap would leave the completion unaccounted and
 *     starve the latency EWMA of samples). The newest wanted frame waits in `pending` and is issued from the
 *     completion callback. (A naive seek-per-rAF loop aborts every seek before the decoder finishes: zero
 *     frames presented on texture-heavy content, video §8.1 table B.)
 *  4. Light time-based damping, k = 20 s⁻¹, snapping within half a frame (Lenis already smooths the wheel).
 *  5. No layout reads: progress arrives from ScrollTrigger (cached geometry).
 *  6. fastSeek only for jumps of more than one second of media (Safari/Firefox), then an exact seek.
 *  7. Runtime downgrade: EWMA of seek latency > 66 ms after 30 seeks → onSlow() (once).
 * The source is a <video> (VideoSource) or the WebCodecs canvas (webcodecs-film.ts) — same contract.
 */
import { frame } from '../../core/frame';
import { frameOf, timeAt } from './chapters';

export interface FrameSource {
  /** a seek is in flight */
  readonly busy: boolean;
  /** keyframe-accurate fast seeking exists (HTMLMediaElement.fastSeek: Safari, Firefox) */
  readonly canFastSeek: boolean;
  /** start a seek to media time t; only ever called while !busy */
  seek(t: number, approx: boolean): void;
  /** set by ScrollFilm: called when the in-flight seek has completed */
  onDone: (() => void) | null;
  destroy(): void;
}

/** <video> as a frame source. `seeking` turns true synchronously when currentTime is assigned. */
export class VideoSource implements FrameSource {
  onDone: (() => void) | null = null;
  /** assignments made while the element was still seeking — must stay 0 (instrumented proof) */
  violations = 0;
  constructor(readonly video: HTMLVideoElement) {
    video.addEventListener('seeked', this.handle);
  }
  get busy(): boolean { return this.video.seeking; }
  get canFastSeek(): boolean { return typeof (this.video as HTMLVideoElement & { fastSeek?: unknown }).fastSeek === 'function'; }
  seek(t: number, approx: boolean): void {
    const v = this.video as HTMLVideoElement & { fastSeek?: (t: number) => void };
    if (v.seeking) { this.violations++; return; }
    if (approx && v.fastSeek) v.fastSeek(t);
    else v.currentTime = t;
  }
  private handle = (): void => { this.onDone?.(); };
  destroy(): void {
    this.video.removeEventListener('seeked', this.handle);
    this.onDone = null;
  }
}

export interface ScrollFilmOptions {
  source: FrameSource;
  lut: Float32Array;
  fps: number;
  frames: number;
  onSlow?: () => void;
  /** every completed seek, latency in ms (Info panel: debugFilm.seeks) */
  onSeek?: (ms: number) => void;
}

export interface ScrollFilmStats {
  seeks: number; fastSeeks: number; coalesced: number; violations: number;
  ewma: number; shown: number; target: number; ticks: number;
  /** main-thread time spent in the controller (tick, completion handler, progress), ms */
  jsMs: number;
}

export class ScrollFilm {
  private src: FrameSource;
  private readonly lut: Float32Array;
  private readonly fps: number;
  private readonly frames: number;
  private targetT = 0;
  private currentT = 0;
  private shown = -1;
  private pending = -1;
  private approx = false;
  private active = false;
  private frozen = false;
  private ready = false;
  private seekStart = 0;
  /** a seek was issued and its completion has not been handled yet */
  private inFlight = false;
  private ewma = 16;
  private samples = 0;
  private slowFired = false;
  private unreg: (() => void) | null = null;
  private kickQueued = false;
  private first: (() => void) | null = null;
  readonly stats: ScrollFilmStats = { seeks: 0, fastSeeks: 0, coalesced: 0, violations: 0, ewma: 16, shown: -1, target: 0, ticks: 0, jsMs: 0 };

  constructor(private readonly o: ScrollFilmOptions) {
    this.src = o.source;
    this.lut = o.lut;
    this.fps = o.fps;
    this.frames = o.frames;
    this.src.onDone = this.onDone;
  }

  /** The frame the element was last asked for. */
  get frame(): number { return this.shown; }
  get target(): number { return frameOf(this.targetT, this.fps, this.frames); }
  get settled(): boolean { return !this.unreg && !this.busy && !this.approx && this.shown === this.target; }

  /**
   * A seek is in flight. A completion that never arrives (element reset under us) must not stall the film:
   * after 1.5 s with the element idle the seek counts as done.
   */
  private get busy(): boolean {
    if (this.inFlight && !this.src.busy && performance.now() - this.seekStart > 1500) this.inFlight = false;
    return this.inFlight || this.src.busy;
  }

  /** First real frame: seek to the current target; resolves when that seek has completed. */
  start(): Promise<void> {
    this.ready = true;
    this.currentT = this.targetT;
    return new Promise<void>((resolve) => {
      this.first = resolve;
      if (this.busy) { this.pending = frameOf(this.targetT, this.fps, this.frames); return; }
      this.seekTo(frameOf(this.targetT, this.fps, this.frames), false);
    });
  }

  /** 0..1 progress across the film body. */
  setProgress(p: number): void {
    const t0 = performance.now();
    const t = timeAt(this.lut, p);
    if (t !== this.targetT) {
      this.targetT = t;
      this.stats.target = frameOf(t, this.fps, this.frames);
      this.kick();
    }
    this.stats.jsMs += performance.now() - t0;
  }

  /**
   * The stage covers the viewport. Leaving does not stop the controller at once: it still converges on the
   * final target (frame 0 above the film, the last frame below it) while the stage scrolls away, then sleeps.
   */
  setActive(on: boolean): void {
    this.active = on;
    if (on) this.kick();
  }

  /** Layers eye off: hold the current frame, issue nothing until unfrozen. */
  setFrozen(on: boolean): void {
    this.frozen = on;
    if (on) this.sleep(); else this.kick();
  }

  destroy(): void {
    this.sleep();
    this.ready = false;
    this.src.onDone = null;
    this.src.destroy();
  }

  // ─────────────────────────── internals ───────────────────────────
  /**
   * Ask the one clock for frames. Deferred to a microtask: progress usually arrives from inside a clock tick
   * (Lenis → ScrollTrigger → onUpdate), and core/frame schedules a second rAF chain when asked for a frame
   * while a tick is running (docs/wp-requests/WP-06.md R7). After the tick its rAF id is set again, so the
   * request coalesces with the loop instead of forking it.
   */
  private kick(): void {
    if (!this.ready || this.frozen || this.kickQueued) return;
    this.kickQueued = true;
    queueMicrotask(() => {
      this.kickQueued = false;
      if (!this.ready || this.frozen) return;
      if (!this.unreg) this.unreg = frame.add(this.tick);
      else frame.request();
    });
  }

  private sleep(): void {
    this.unreg?.();
    this.unreg = null;
  }

  private tick = (_t: number, dtMs: number): boolean => {
    const t0 = performance.now();
    const more = this.step(dtMs);
    this.stats.jsMs += performance.now() - t0;
    return more;
  };

  private step(dtMs: number): boolean {
    this.stats.ticks++;
    const dt = Math.min(0.1, Math.max(0, dtMs) / 1000);
    const d = this.targetT - this.currentT;
    const half = 0.5 / this.fps;
    this.currentT = Math.abs(d) < half ? this.targetT : this.currentT + d * (1 - Math.exp(-20 * dt));

    const f = frameOf(this.currentT, this.fps, this.frames);
    const busy = this.busy;
    if (busy) {
      if (f !== this.shown && f !== this.pending) { this.pending = f; this.stats.coalesced++; }
    } else if (f !== this.shown) {
      this.seekTo(f, this.shown >= 0 && Math.abs(f - this.shown) > this.fps);
    } else if (this.approx && this.currentT === this.targetT) {
      this.seekTo(f, false);                                     // settle a fastSeek exactly
    }

    const converged = this.currentT === this.targetT;
    const caughtUp = f === this.shown || f === this.pending;
    if (converged && caughtUp && !(this.approx && !busy)) {
      this.sleep();                                              // fully idle; seeked() re-kicks if needed
      return false;
    }
    return true;
  }

  private seekTo(f: number, jump: boolean): void {
    if (this.src.busy) { this.stats.violations++; this.pending = f; return; }
    this.inFlight = true;
    this.shown = f;
    this.pending = -1;
    const fast = jump && this.src.canFastSeek;
    this.approx = fast;
    this.seekStart = performance.now();
    this.stats.seeks++;
    if (fast) this.stats.fastSeeks++;
    this.stats.shown = f;
    this.src.seek((f + 0.5) / this.fps, fast);
  }

  private onDone = (): void => {
    // a 'seeked' queued for an earlier seek can arrive after the next one was issued: that one reports itself
    if (this.src.busy) return;
    this.inFlight = false;
    const t0 = performance.now();
    this.done(t0);
    this.stats.jsMs += performance.now() - t0;
  };

  private done(now: number): void {
    const lat = now - this.seekStart;
    this.o.onSeek?.(lat);
    this.ewma += (lat - this.ewma) * 0.1;
    this.stats.ewma = this.ewma;
    if (++this.samples >= 30 && this.ewma > 66 && !this.slowFired) {
      this.slowFired = true;
      this.o.onSlow?.();
    }
    if (this.first) { const r = this.first; this.first = null; r(); }
    if (this.pending >= 0 && this.pending !== this.shown) this.seekTo(this.pending, false);
    else {
      this.pending = -1;
      if (this.approx || this.currentT !== this.targetT) this.kick();
    }
  }
}
