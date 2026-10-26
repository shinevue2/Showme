/**
 * Motion (DESIGN §5.5, §5.9). Owner: WP-00.
 * `enabled = !prefers-reduced-motion && motionLayerVisible` (the Motion layer eye in the chrome, stored as
 * localStorage['hanmoto.motion'] = 'off'). html[data-motion="off"] mirrors it for CSS.
 * `registerSnap(root)` gives every [data-print] element its seeded misregistration (--mx/--my/--mr) and,
 * where CSS scroll-driven animations are unsupported, toggles .is-printed with an IntersectionObserver.
 */
import type { MotionAPI } from './types';
import { local } from './storage';
import { stream } from './seed';

export interface MotionImpl extends MotionAPI {
  /** WP-04's Motion layer eye calls this (WCAG 2.2.2 pause control). */
  setLayerVisible(visible: boolean): void;
  readonly reducedMotion: boolean;
}

let instance: MotionImpl | null = null;

/** For WP-04 (chrome): show/hide the Motion layer site-wide. */
export function setMotionLayerVisible(visible: boolean): void {
  instance?.setLayerVisible(visible);
}

export function createMotion(seed: number): MotionImpl {
  const root = document.documentElement;
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  let layerVisible = local.get('hanmoto.motion') !== 'off';
  const forced = (() => { try { return new URLSearchParams(location.search).has('poster'); } catch { return false; } })();
  const compute = () => !mq.matches && layerVisible && !forced;
  let enabled = compute();
  const listeners = new Set<(e: boolean) => void>();
  const supportsTimeline = typeof CSS !== 'undefined' && CSS.supports?.('animation-timeline: view()');
  const registered = new WeakSet<Element>();
  let io: IntersectionObserver | null = null;
  let counter = 0;

  const reflect = () => {
    if (enabled) delete root.dataset.motion; else root.dataset.motion = 'off';
  };
  const update = () => {
    const next = compute();
    if (next === enabled) { reflect(); return; }
    enabled = next;
    reflect();
    if (!enabled) document.querySelectorAll('[data-print]').forEach((el) => el.classList.add('is-printed'));
    for (const cb of listeners) { try { cb(enabled); } catch (e) { console.error(e); } }
  };
  mq.addEventListener('change', update);
  reflect();

  const api: MotionImpl = {
    get enabled() { return enabled; },
    get reducedMotion() { return mq.matches; },
    on(cb) { listeners.add(cb); return () => listeners.delete(cb); },
    setLayerVisible(v: boolean) {
      layerVisible = v;
      local.set('hanmoto.motion', v ? null : 'off');
      update();
    },
    registerSnap(scope: ParentNode) {
      const els = scope.querySelectorAll<HTMLElement>('[data-print]');
      els.forEach((el) => {
        if (registered.has(el)) return;
        registered.add(el);
        const key = el.id || el.closest('[data-section]')?.id + ':' + (counter++);
        const r = stream(seed, 'snap:' + key);
        const mag = () => (2 + r() * 4) * (r() < 0.5 ? -1 : 1);
        el.style.setProperty('--mx', mag().toFixed(2) + 'px');
        el.style.setProperty('--my', mag().toFixed(2) + 'px');
        el.style.setProperty('--mr', ((r() * 2 - 1) * 0.3).toFixed(3) + 'deg');
        if (!enabled) { el.classList.add('is-printed'); return; }
        if (supportsTimeline) return;          // CSS scroll-driven path (motion.css)
        io ??= new IntersectionObserver((entries) => {
          for (const e of entries) {
            if (e.isIntersecting) { e.target.classList.add('is-printed'); io!.unobserve(e.target); }
          }
        }, { threshold: 0.35 });
        io.observe(el);
      });
    },
  };
  instance = api;
  return api;
}
