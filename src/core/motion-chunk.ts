/**
 * The `motion` chunk (DESIGN §5.8, §8.8 step 3): gsap + ScrollTrigger + lenis, dynamic-imported after first
 * paint. Owner: WP-00.
 *
 * One clock: GSAP's own ticker is detached (`gsap.ticker.remove(gsap.updateRoot)`, put to sleep, and its
 * wake-up redirected to `frame.request()`), so tweens advance only inside core/frame's loop.
 * ScrollTrigger is registered "quietly": its permanent rAF keep-alive loop (`_rafBugFix`) and its 250 ms
 * sync interval would break "zero rAF at idle", so both are neutralised at registration time. ScrollTrigger
 * still updates synchronously on scroll events and on Lenis' 'scroll' event. Progress only — never pin,
 * never scrub on media.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { frame } from './frame';
import type { MotionImpl } from './motion';
import type { ScrollImplType } from './scroll';

export interface MotionRuntime {
  gsap: typeof gsap;
  ScrollTrigger: typeof ScrollTrigger;
  readonly lenis: Lenis | null;
}

let runtime: MotionRuntime | null = null;

function detachGsapTicker(): void {
  const ticker = gsap.ticker as typeof gsap.ticker & { wake?: () => void };
  ticker.remove(gsap.updateRoot);
  ticker.lagSmoothing(0);
  ticker.sleep();
  // GSAP calls ticker.wake() whenever a tween is created: ask our loop for frames instead.
  ticker.wake = () => frame.request();
  const offset = performance.now() / 1000 - gsap.ticker.time;
  const active = (): boolean => {
    const kids = gsap.globalTimeline.getChildren(false, true, true);
    for (const k of kids) if (!k.paused()) return true;
    return false;
  };
  frame.setGsap((tMs) => gsap.updateRoot(tMs / 1000 - offset), active);
}

function registerScrollTriggerQuietly(): void {
  const raf = window.requestAnimationFrame;
  const setInt = window.setInterval;
  const intervals: number[] = [];
  window.requestAnimationFrame = (() => 0) as typeof window.requestAnimationFrame;   // swallow _rafBugFix's first request
  window.setInterval = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
    const id = setInt(handler, timeout, ...args);
    intervals.push(id);
    return id;
  }) as typeof window.setInterval;
  try {
    gsap.registerPlugin(ScrollTrigger);
  } finally {
    window.requestAnimationFrame = raf;
    window.setInterval = setInt;
  }
  intervals.forEach((id) => clearInterval(id));
  ScrollTrigger.config({ ignoreMobileResize: true });
}

export function initMotionRuntime(motion: MotionImpl, scroll: ScrollImplType): MotionRuntime {
  if (runtime) return runtime;
  detachGsapTicker();
  registerScrollTriggerQuietly();

  let lenis: Lenis | null = null;
  const startLenis = () => {
    if (lenis) return;
    lenis = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
      syncTouch: false,
      anchors: true,
      autoRaf: false,
      prevent: (node: HTMLElement) => !!node.closest?.('[data-lenis-prevent]'),
    });
    lenis.on('scroll', ScrollTrigger.update);
    frame.setLenis(lenis);
    scroll.setLenis(lenis);
  };
  const stopLenis = () => {
    if (!lenis) return;
    lenis.destroy();
    lenis = null;
    frame.setLenis(null);
    scroll.setLenis(null);
  };
  if (motion.enabled) startLenis();
  motion.on((on) => (on ? startLenis() : stopLenis()));

  // Lenis' anchor handling and programmatic scrolls need a frame even before any scroll event fires.
  document.addEventListener('click', () => { if (lenis) frame.request(); }, { capture: true, passive: true });

  scroll.attach(ScrollTrigger, lenis);
  runtime = {
    gsap,
    ScrollTrigger,
    get lenis() { return lenis; },
  };
  return runtime;
}

export function getMotionRuntime(): MotionRuntime | null {
  return runtime;
}
