/**
 * Status bar (DESIGN §4.1 "Status bar / Info"). Owner: WP-04.
 * One Martian Mono line, 10 px:  霜降 · 2026-10-26 · JST 14:32 · 60 fps · 7 draws · T3 · アートボード 4/11 屏風 ·
 * X 812 Y 344 px · 100%.  `i` or a click opens the 320 px Info sheet (Info · Glossary · Settings), whose
 * content module loads on first open. Live values are aria-live="off" (§11.1); nothing here runs a loop:
 * the clock ticks once a minute, stage numbers arrive with the stage's own stats (≤ 4 Hz while it draws).
 */
import type { SectionId, TierName } from '../core/types';
import { SECTION_ORDER } from '../core/types';
import { onMinute, jstNow } from '../core/clock';
import { SEASON_COLORS } from '../core/solar-term';
import { $, mq, type ChromeCtx } from './util';
import type { Panels } from './panels';
import type { RulersAPI } from './rulers';

export const TIER_LABEL: Record<TierName, string> = { high: 'T3', medium: 'T2', low: 'T1', software: 'T0', static: 'TS' };

export interface StatusAPI { setText(text: string | null): void }

export function mountStatus(c: ChromeCtx, panels: Panels, rulers: RulersAPI | null): StatusAPI | null {
  const { ctx, s } = c;
  const root = $<HTMLElement>('[data-status]');
  const sheet = $<HTMLElement>('#status-sheet');
  if (!root || !sheet) return null;
  const line = $<HTMLElement>('.status__line', root)!;
  const toggle = $<HTMLButtonElement>('.status__toggle', root)!;
  const f = (k: string) => $<HTMLElement>(`[data-st="${k}"]`, root);
  const html = document.documentElement;

  /* ---- date, 節気 and the season swatch (--season, §3.1: "JS overrides per 二十四節気") */
  const paintDate = () => {
    const term = ctx.i18n.solarTerm();
    const name = ctx.lang === 'zh' ? term.zh : ctx.lang === 'en' ? term.en : term.ja;
    const t = f('term');
    if (t) t.textContent = name;
    const d = f('date');
    if (d) d.textContent = jstNow().iso.slice(0, 10);
    const col = SEASON_COLORS[term.index];
    if (col) html.style.setProperty('--season', col.hex);
  };
  paintDate();
  onMinute(paintDate);

  /* ---- tier */
  const paintTier = () => { const t = f('tier'); if (t) t.textContent = TIER_LABEL[ctx.tier.current.name] ?? 'T—'; };
  paintTier();
  ctx.tier.on(paintTier);

  /* ---- artboard n/11 */
  const n = SECTION_ORDER.length;
  const paintBoard = () => {
    const id: SectionId = ctx.page === 'case' ? 'works' : ctx.scroll.active;
    const i = SECTION_ORDER.indexOf(id);
    const b = f('board');
    if (b) b.innerHTML = `${s.artboard} <span class="st__v">${i + 1}/${n}</span> ${ctx.content.copy[id].layer[ctx.lang]}`;
  };
  paintBoard();
  ctx.scroll.onActive(paintBoard);

  /* ---- fps / draws from the stage (only while it draws; "idle" otherwise: zero rAF at rest) */
  const fps = f('fps'), draws = f('draws');
  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  const paintIdle = () => {
    if (fps) fps.textContent = `${s.idle}`;
    if (draws) draws.textContent = `— ${s.draws}`;
  };
  paintIdle();
  void c.stageReady.then((st) => {
    if (!st) { if (fps) fps.textContent = s.qStatic; if (draws) draws.textContent = `0 ${s.draws}`; return; }
    st.onStats((x) => {
      if (fps) fps.textContent = x.fps > 0 ? `${x.fps} ${s.fps}` : s.idle;      // 0 = not yet measured
      if (draws) draws.textContent = `${x.calls} ${s.draws}`;
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(paintIdle, 900);
    });
  });

  /* ---- pointer position on the active artboard, zoom */
  const xy = f('xy');
  const paintXY = () => {
    const p = rulers?.artboardXY();
    if (xy) xy.textContent = p ? `X ${p.x} Y ${p.y} px` : 'X — Y — px';
  };
  paintXY();
  rulers?.onDraw(paintXY);
  const zoom = f('zoom');
  const paintZoom = () => { if (zoom) zoom.textContent = `${Math.round((window.visualViewport?.scale ?? 1) * 100)}%`; };
  window.visualViewport?.addEventListener('resize', paintZoom, { passive: true });
  paintZoom();

  /* ---- the sheet */
  let sheetMod: Promise<typeof import('./sheet')> | null = null;
  const load = () => (sheetMod ??= import('./sheet'));
  panels.register('status', root, sheet, {
    onOpen(tab) { void load().then((m) => m.showTab(c, panels, sheet, tab ?? 'info')); },
    onTab(tab) { if (panels.isOpen('status')) void load().then((m) => m.showTab(c, panels, sheet, tab)); },
    onClose() { void sheetMod?.then((m) => m.hidden()); },
  });
  // the toggle is the keyboard/AT path; a click anywhere on the line is a pointer convenience
  toggle.addEventListener('click', (e) => { e.stopPropagation(); panels.toggle('status', null, (e as PointerEvent).pointerType ? 'click' : 'key', toggle); });
  line.addEventListener('click', () => panels.toggle('status', null, 'click', toggle));
  // warm the module after idle on desktop so the first open is instant
  if (!mq.mobile.matches) {
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    setTimeout(() => (ric ? ric(() => void load(), { timeout: 4000 }) : void load()), 6000);
  }

  // ctx.chrome.setStatus(text): a section's own note, shown after the artboard (e.g. "rake mode")
  let msg: HTMLElement | null = null;
  return {
    setText(text) {
      if (text === null) { msg?.remove(); msg = null; return; }
      if (!msg) {
        msg = document.createElement('span');
        msg.className = 'st st--msg';
        f('board')?.after(msg);
      }
      msg.textContent = text;
    },
  };
}
