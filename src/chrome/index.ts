/**
 * Chrome behaviour — the 版下 workbench (DESIGN §4). Owner: WP-04.
 * Contract (README, core/boot.ts): `export default { mount(ctx): ChromeAPI | Promise<ChromeAPI> }`; the return
 * value backs `ctx.chrome` through core/chrome-bridge.
 *
 * Eager here (first paint + a few ms): document bar (theme chips, CV menu, skip-the-film, root-page notice,
 * Proof), rulers, Layers / Separations, status bar, language wheel, outline view, keyboard map, smart guides.
 * Lazy: the Info sheet content (first open), today's print compositor (Separations / download), selection
 * boxes (first mouse move, fine pointers), Peek the GLSL (once the stage is live, desktop).
 */
import type { AppContext, ChromeAPI, Lang } from '../core/types';
import type { ChromeStrings } from './strings';
import { createPanels } from './panels';
import { mountRulers } from './rulers';
import { mountLayers } from './layers';
import { mountStatus } from './status';
import { mountWheel } from './wheel';
import { mountOutline } from './outline';
import { mountKeys } from './keys';
import { $, $$, h, hooks, mq, type ChromeCtx, type StageLike } from './util';

export interface ChromeModule {
  mount(ctx: AppContext): ChromeAPI | Promise<ChromeAPI>;
}

function themeChips(ctx: AppContext): void {
  const chips = $$<HTMLButtonElement>('[data-theme-set]');
  const sync = () => {
    const cur = ctx.theme.current === 'night' ? 'dark' : 'light';
    chips.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.themeSet === cur)));
    const group = chips[0]?.parentElement;
    const pressed = chips.find((b) => b.dataset.themeSet === cur);
    if (group && pressed) group.dataset.label = pressed.getAttribute('aria-label') ?? '';
  };
  chips.forEach((b) => b.addEventListener('click', () => {
    const want = b.dataset.themeSet as 'light' | 'dark';
    ctx.theme.set(want);
    sync();
  }));
  ctx.theme.on(sync);
  document.addEventListener('hanmoto:theme', sync);
  sync();
}

function cvMenu(): () => boolean {
  const det = $<HTMLDetailsElement>('[data-cv]');
  if (!det) return () => false;
  document.addEventListener('pointerdown', (e) => { if (det.open && !det.contains(e.target as Node)) det.open = false; }, { passive: true });
  det.addEventListener('focusout', (e) => { if (det.open && !det.contains(e.relatedTarget as Node | null)) det.open = false; });
  return () => {
    if (!det.open) return false;
    det.open = false;
    det.querySelector('summary')?.focus();
    return true;
  };
}

function skipFilm(): void {
  const road = document.getElementById('road');
  const skip = $<HTMLElement>('[data-skip-film]');
  if (!road || !skip) return;
  // shown only while the scroll position is above the end of #road
  new IntersectionObserver(([e]) => {
    skip.hidden = !!e && !e.isIntersecting && e.boundingClientRect.bottom < 0;
  }).observe(road);
}

function notice(ctx: AppContext): void {
  const box = $<HTMLElement>('[data-notice-box]');
  const which = document.documentElement.dataset.langNotice as Lang | undefined;
  if (!box || !which || ctx.page !== 'main' || ctx.lang !== 'ja') return;
  box.dataset.show = which;
  box.hidden = false;
  $<HTMLButtonElement>('[data-notice-dismiss]', box)?.addEventListener('click', () => {
    try { localStorage.setItem('hanmoto.lang', 'ja'); } catch { /* storage blocked: hide for this page only */ }
    box.hidden = true;
  });
  $$<HTMLAnchorElement>('a[data-notice]', box).forEach((a) => a.addEventListener('click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    ctx.i18n.switchTo(a.dataset.notice as Lang);
  }));
}

function proof(ctx: AppContext): void {
  const btn = $<HTMLButtonElement>('[data-tool="proof"]');
  const url = new URL(location.href);
  btn?.setAttribute('aria-pressed', String(ctx.proof));
  btn?.addEventListener('click', () => {
    if (ctx.proof) url.searchParams.delete('proof'); else url.searchParams.set('proof', '1');
    location.href = url.href;
  });
  const exit = $<HTMLAnchorElement>('[data-proof-exit]');
  if (exit) {
    const u = new URL(location.href);
    u.searchParams.delete('proof');
    exit.href = u.href;
  }
}

/** Smart guides: a magenta label ("anchor", "intersect", 「消点」) with a cross mark, for 900 ms. */
function smartGuides(): ChromeAPI['smartGuide'] {
  const pool: HTMLElement[] = [];
  return (x, y, label) => {
    if (document.documentElement.dataset.poster !== undefined) return;
    const el = pool.pop() ?? h('div', 'sguide', { 'aria-hidden': 'true' }, '<span></span>');
    el.firstElementChild!.textContent = label;
    el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    delete el.dataset.out;
    document.body.appendChild(el);
    setTimeout(() => { el.dataset.out = ''; }, 900);
    setTimeout(() => { el.remove(); if (pool.length < 6) pool.push(el); }, 900 + 180);
  };
}

const chrome: ChromeModule = {
  mount(ctx) {
    const s = JSON.parse(document.getElementById('chrome-strings')?.textContent || '{}') as ChromeStrings;
    const live = h('div', 'visually-hidden', { 'aria-live': 'polite', role: 'status' });
    document.body.appendChild(live);
    const cc: ChromeCtx = {
      ctx, s, stage: null,
      stageReady: ctx.getStage().then((st) => { cc.stage = st as StageLike | null; return cc.stage; }),
      announce(msg) { live.textContent = ''; setTimeout(() => { live.textContent = msg; }, 30); },
    };
    // tab order: doc bar → main → panels (§11.1). The page renderer puts all chrome before <main>; the Layers panel
    // and the status bar are fixed overlays, so moving them after <main> changes only the focus order.
    for (const el of [$('[data-layers]'), $('[data-status]')]) if (el) document.body.appendChild(el);
    const panels = createPanels();
    themeChips(ctx);
    const closeCv = cvMenu();
    skipFilm();
    notice(ctx);
    proof(ctx);

    const full = ctx.page !== 'notfound';
    const rulers = full ? mountRulers(ctx, s) : null;
    hooks.rulers = rulers;
    if (full) mountLayers(cc, panels);
    const status = full ? mountStatus(cc, panels, rulers) : null;
    const wheel = mountWheel(cc, panels);
    const outline = mountOutline(cc);
    hooks.outline = (on) => outline?.set(on);
    mountKeys(cc, panels, rulers, outline, closeCv);

    // openers: menu (phones), toolbar buttons, Info tool, the status line
    const tabFor: Record<string, [ 'layers' | 'status', string ]> = { layers: ['layers', 'layers'], separations: ['layers', 'separations'], info: ['status', 'info'] };
    $$<HTMLButtonElement>('[data-opens]').forEach((b) => b.addEventListener('click', (e) => {
      const [panel, tab] = tabFor[b.dataset.opens!] ?? ['layers', 'layers'];
      panels.toggle(panel, tab, (e as PointerEvent).pointerType ? 'click' : 'key', b);
    }));
    const infoTool = $<HTMLButtonElement>('[data-tool="info"]');
    infoTool?.addEventListener('click', (e) => panels.toggle('status', 'info', (e as PointerEvent).pointerType ? 'click' : 'key', infoTool));
    const syncOpeners = () => {
      const lOpen = panels.isOpen('layers'), lTab = panels.tab('layers'), sOpen = panels.isOpen('status');
      $$<HTMLButtonElement>('[data-opens]').forEach((b) => {
        const k = b.dataset.opens!;
        const on = k === 'info' ? sOpen : lOpen && (k === 'layers' ? lTab === 'layers' || b.classList.contains('docbar__menu') : lTab === 'separations');
        b.setAttribute('aria-expanded', String(on));
      });
      infoTool?.setAttribute('aria-expanded', String(sOpen));
      $<HTMLButtonElement>('.status__toggle')?.setAttribute('aria-expanded', String(sOpen));
      $<HTMLButtonElement>('.layers__strip')?.setAttribute('aria-expanded', String(lOpen));
    };
    panels.onChange(syncOpeners);
    syncOpeners();

    // selection boxes: fine pointers only, loaded on the first mouse move
    if (full) {
      const arm = (e: PointerEvent) => {
        if (e.pointerType !== 'mouse') return;
        removeEventListener('pointermove', arm);
        void import('./select').then((m) => m.mountSelect(cc, rulers));
      };
      addEventListener('pointermove', arm, { passive: true });
    }
    // Peek the GLSL once the stage is live (desktop, fine pointer)
    void cc.stageReady.then((st) => {
      if (!st || !mq.fine.matches || ctx.proof) return;
      void import('./peek').then((m) => m.mountPeek(cc, st));
    });

    document.documentElement.dataset.chrome = 'ready';     // for tests and capture scripts
    const guide = smartGuides();
    const api: ChromeAPI = {
      setRulerYears(p) { rulers?.setYears(p); },
      smartGuide: guide,
      setStatus(text) { status?.setText(text); },
      spinWheel(to) { return wheel.spin(to); },
    };
    return api;
  },
};

export default chrome;
