/**
 * Language — Wang Zhen's revolving type wheel (DESIGN §4.3). Owner: WP-04.
 * The dial turns so the page language sits under the 躑躅 index notch. Hover/focus on a language prefetches
 * that page, its font CSS and its cover subset, and leans the dial a few degrees towards it. Activating
 * stores the position (core/i18n.switchTo), spins the dial 120° or 240° with --ease-ha (≤ 400 ms, the spin
 * covers font resolution), then navigates; the real <a hreflang> links underneath are the keyboard/AT path.
 * Phones: the wheel is a toolbar button that opens the three links as a bottom sheet.
 */
import type { Lang } from '../core/types';
import { $, $$, type ChromeCtx } from './util';
import type { Panels } from './panels';

const IDX: Record<Lang, number> = { ja: 0, en: 1, zh: 2 };

export interface WheelAPI { spin(to: Lang): Promise<void> }

export function mountWheel(c: ChromeCtx, panels: Panels): WheelAPI {
  const { ctx } = c;
  const wheel = $<HTMLElement>('[data-wheel]');
  const dials = $$<SVGGElement>('.wheel__dial');
  let rot = -IDX[ctx.lang] * 120;
  const setRot = (deg: number, animate = true) => {
    for (const d of dials) {
      if (!animate) d.style.transition = 'none';
      d.style.setProperty('--wheel-rot', `${deg}deg`);
      if (!animate) { void d.getBoundingClientRect(); d.style.transition = ''; }
    }
  };
  setRot(rot, false);

  // prefetch the target's cover subset (WP-02 public/fonts/preload.json), once per language
  let preload: Promise<Record<string, string[]> | null> | null = null;
  const fontsDone = new Set<Lang>();
  const prefetchFonts = (l: Lang) => {
    if (fontsDone.has(l) || !document.querySelector('link[href*="fonts/fonts-"]')) return;
    fontsDone.add(l);
    preload ??= fetch(ctx.assets.url('fonts/preload.json')).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    void preload.then((map) => {
      for (const href of map?.[l] ?? []) {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.as = 'font';
        link.crossOrigin = 'anonymous';
        link.href = ctx.assets.url(href);
        document.head.appendChild(link);
      }
    });
  };

  const reduced = () => !ctx.motion.enabled;
  $$<HTMLAnchorElement>('[data-lang-switch]').forEach((a) => {
    const l = a.dataset.langSwitch as Lang;
    if (l === ctx.lang) return;
    const pre = () => {
      ctx.i18n.prefetch(l);
      prefetchFonts(l);
      if (!reduced()) {
        const steps = (IDX[l] - IDX[ctx.lang] + 3) % 3;          // 1 = next sector clockwise
        setRot(rot - (steps === 1 ? 14 : -14));
      }
    };
    const back = () => setRot(rot);
    a.addEventListener('pointerenter', pre, { passive: true });
    a.addEventListener('focus', pre);
    a.addEventListener('pointerleave', back, { passive: true });
    a.addEventListener('blur', back);
    a.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      ctx.i18n.switchTo(l);
    });
  });

  // phones: the toolbar wheel opens the language sheet
  const btn = $<HTMLButtonElement>('.wheel__btn', wheel ?? document);
  const nav = $<HTMLElement>('#lang-nav');
  panels.register('lang', wheel, nav, { mobileOnly: true });
  btn?.addEventListener('click', (e) => panels.toggle('lang', null, (e as PointerEvent).pointerType ? 'click' : 'key', btn));
  panels.onChange(() => btn?.setAttribute('aria-expanded', String(panels.isOpen('lang'))));

  return {
    spin(to) {
      if (to === ctx.lang) return Promise.resolve();
      const steps = (IDX[to] - IDX[ctx.lang] + 3) % 3;          // turn the table forward: 120° or 240°
      rot = -IDX[ctx.lang] * 120 - steps * 120;
      if (reduced() || !dials.length) { setRot(rot, false); return Promise.resolve(); }
      setRot(rot);
      return new Promise((resolve) => setTimeout(resolve, 380));
    },
  };
}

