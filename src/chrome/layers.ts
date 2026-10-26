/**
 * Layers panel and Separations tab (DESIGN §4.1, §3.2). Owner: WP-04.
 *
 * Layers: Motion (layer 12, the WCAG 2.2.2 pause control) above a 子持ち罫, then the eleven artboards in page
 * order. Name → scroll there; the road row opens its seven chapter sub-layers. Eye on a section = hide its
 * decorative layer: the stage pauses `eye:<id>` (its view parks and shows its poster), the section gets
 * [data-eye="off"] (its 2D motion pauses) and a `hanmoto:eye` event; the choice lives in
 * sessionStorage['hanmoto.eyes']. Eye on Motion = global motion off (core/motion setMotionLayerVisible).
 *
 * Separations: today's print (120 × 176, print-compositor), a one-line colour bar and eight plate rows.
 * Plates are un-inked (outlined) until the visitor passes the chapter that adds them (ctx.print.ink); the
 * swatch then fills with a 420 ms registration snap. A plate's eye hides it site-wide in decorative layers.
 */
import type { PlateN, SectionId } from '../core/types';
import { SECTION_ORDER } from '../core/types';
import { session } from '../core/storage';
import { stream } from '../core/seed';
import { $, $$, mq, motionLayerOn, setMotionLayer, fill, type ChromeCtx } from './util';
import type { Panels } from './panels';

export interface LayersAPI { refreshActive(): void }

export function mountLayers(c: ChromeCtx, panels: Panels): LayersAPI | null {
  const { ctx, s } = c;
  const root = $<HTMLElement>('[data-layers]');
  const panel = $<HTMLElement>('#layers-panel');
  if (!root || !panel) return null;
  const strip = $<HTMLButtonElement>('.layers__strip', root);
  const html = document.documentElement;
  const isMain = ctx.page === 'main';

  /* ---------------------------------------------------------- open / close */
  let printReady = false;
  const renderThumb = async () => {
    const canvas = $<HTMLCanvasElement>('.seps__canvas', panel);
    if (!canvas) return;
    const m = await import('./print-compositor');
    m.bindPrint(ctx);
    if (!printReady) { m.preloadPlates(); printReady = true; }
    await m.renderPrint(canvas, 120);
  };
  panels.register('layers', root, panel, {
    onTab(tab) { if (tab === 'separations' && panels.isOpen('layers')) void renderThumb(); },
    onOpen(tab) { if (tab === 'separations') void renderThumb(); },
  });

  // hover intent (300 ms) on the strip; a click pins it open
  let hoverTimer: ReturnType<typeof setTimeout> | null = null;
  let leaveTimer: ReturnType<typeof setTimeout> | null = null;
  strip?.addEventListener('pointerenter', (e) => {
    if (e.pointerType !== 'mouse' || mq.mobile.matches) return;
    if (leaveTimer) { clearTimeout(leaveTimer); leaveTimer = null; }
    if (panels.isOpen('layers')) return;
    hoverTimer = setTimeout(() => panels.open('layers', null, 'hover', strip), 300);
  });
  strip?.addEventListener('pointerleave', () => { if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; } });
  root.addEventListener('pointerenter', () => { if (leaveTimer) { clearTimeout(leaveTimer); leaveTimer = null; } });
  root.addEventListener('pointerleave', (e) => {
    if (e.pointerType !== 'mouse') return;
    if (panels.via('layers') !== 'hover') return;
    leaveTimer = setTimeout(() => panels.close('layers'), 320);
  });
  strip?.addEventListener('click', (e) => {
    if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; }
    const via = (e as PointerEvent).pointerType ? 'click' : 'key';
    if (panels.isOpen('layers') && panels.via('layers') === 'hover') { panels.open('layers', null, 'click', strip); return; }
    panels.toggle('layers', null, via, strip);
  });

  /* ---------------------------------------------------------- active artboard */
  const rows = new Map<string, HTMLElement>($$<HTMLElement>('.layer-row[data-layer]', panel).map((r) => [r.dataset.layer!, r]));
  const stripRows = new Map<string, HTMLElement>($$<HTMLElement>('.strip-row[data-row]', root).map((r) => [r.dataset.row!, r]));
  const setActive = (id: string) => {
    for (const [k, r] of rows) if (k !== 'motion') { if (k === id) r.dataset.active = ''; else delete r.dataset.active; }
    for (const [k, r] of stripRows) if (k !== 'motion') { if (k === id) r.dataset.active = ''; else delete r.dataset.active; }
  };
  const refreshActive = () => setActive(ctx.page === 'case' ? 'works' : ctx.scroll.active);
  ctx.scroll.onActive(refreshActive);
  refreshActive();

  // road chapters: current chapter marker follows #road[data-chapter] (set by the film)
  const roadSub = $<HTMLElement>('#road-sub', panel);
  const twisty = $<HTMLButtonElement>('.twisty', panel);
  twisty?.addEventListener('click', () => {
    const open = twisty.getAttribute('aria-expanded') !== 'true';
    twisty.setAttribute('aria-expanded', String(open));
    if (roadSub) roadSub.hidden = !open;
  });
  const road = document.getElementById('road');
  if (road && roadSub) {
    const mark = () => {
      const n = road.dataset.chapter;
      $$<HTMLAnchorElement>('a', roadSub).forEach((a, i) => { if (String(i + 1) === n) a.dataset.current = ''; else delete a.dataset.current; });
    };
    new MutationObserver(mark).observe(road, { attributes: true, attributeFilter: ['data-chapter'] });
    mark();
  }

  // names scroll through Lenis (or natively); phones close the sheet first
  $$<HTMLAnchorElement>('[data-goto], .layer-sub a, .layers__express a[href^="#"]', panel).forEach((a) => {
    a.addEventListener('click', (e) => {
      const hash = a.getAttribute('href') ?? '';
      if (!isMain || !hash.startsWith('#')) return;
      const target = document.querySelector(hash);
      if (!target) return;
      e.preventDefault();
      if (mq.mobile.matches || panels.via('layers') === 'hover') panels.close('layers');
      ctx.scroll.scrollTo(target);
      history.replaceState(history.state, '', hash);
      (target as HTMLElement).focus?.({ preventScroll: true });
    });
  });

  /* ---------------------------------------------------------- eyes */
  const setEyeButton = (b: HTMLButtonElement | null | undefined, visibleNow: boolean) => {
    if (!b) return;
    b.setAttribute('aria-pressed', String(visibleNow));
  };
  const hiddenSections = new Set<SectionId>(session.json<SectionId[]>('hanmoto.eyes', []).filter((x) => (SECTION_ORDER as readonly string[]).includes(x)));
  const applySection = (id: SectionId, hide: boolean) => {
    const el = document.getElementById(id);
    if (el) { if (hide) el.dataset.eye = 'off'; else delete el.dataset.eye; }
    const row = rows.get(id);
    if (row) { if (hide) row.dataset.hidden = ''; else delete row.dataset.hidden; }
    const sr = stripRows.get(id);
    if (sr) { if (hide) sr.dataset.hidden = ''; else delete sr.dataset.hidden; }
    setEyeButton($<HTMLButtonElement>(`[data-eye="${id}"]`, panel), !hide);
    void c.stageReady.then((st) => { if (!st) return; if (hide) st.pause('eye:' + id); else st.resume('eye:' + id); });
    document.dispatchEvent(new CustomEvent('hanmoto:eye', { detail: { section: id, visible: !hide } }));
  };
  if (isMain) {
    hiddenSections.forEach((id) => applySection(id, true));
    $$<HTMLButtonElement>('[data-eye]', panel).forEach((b) => {
      const id = b.dataset.eye!;
      if (id === 'motion') return;
      b.addEventListener('click', () => {
        const hide = !hiddenSections.has(id as SectionId);
        if (hide) hiddenSections.add(id as SectionId); else hiddenSections.delete(id as SectionId);
        session.setJson('hanmoto.eyes', [...hiddenSections]);
        applySection(id as SectionId, hide);
        c.announce(hide ? fill(s.hide, { name: rows.get(id)?.querySelector('.layer-row__name')?.textContent ?? id }) : fill(s.show, { name: rows.get(id)?.querySelector('.layer-row__name')?.textContent ?? id }));
      });
    });
  }

  // Motion layer
  const motionEye = $<HTMLButtonElement>('[data-eye="motion"]', panel);
  const motionHint = $<HTMLElement>('[data-motion-hint]', panel);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const syncMotion = () => {
    const layerOn = !layerOffStored();
    setEyeButton(motionEye, layerOn);
    const sr = stripRows.get('motion');
    const shownOn = layerOn && !reduced.matches;
    if (sr) { if (shownOn) delete sr.dataset.hidden; else sr.dataset.hidden = ''; }
    const row = rows.get('motion');
    if (row) { if (layerOn) delete row.dataset.hidden; else row.dataset.hidden = ''; }
    if (motionHint) motionHint.hidden = !(reduced.matches && layerOn);
  };
  const layerOffStored = () => !motionLayerOn();
  motionEye?.addEventListener('click', () => {
    setMotionLayer(!motionLayerOn());
    syncMotion();
  });
  ctx.motion.on(syncMotion);
  reduced.addEventListener('change', syncMotion);
  syncMotion();

  /* ---------------------------------------------------------- Separations */
  const plateRows = new Map<number, HTMLElement>($$<HTMLElement>('[data-plate-row]', panel).map((r) => [Number(r.dataset.plateRow), r]));
  const barChips = new Map<number, HTMLElement>($$<HTMLElement>('.seps__bar [data-plate]', panel).map((r) => [Number(r.dataset.plate), r]));
  const count = $<HTMLElement>('[data-inked-count]', panel);
  const seedEl = $<HTMLElement>('[data-seed]', panel);
  if (seedEl) seedEl.textContent = ctx.print.seed.toString(16).toUpperCase().padStart(8, '0');
  const r = stream(ctx.print.seed, 'chrome-plate-snap');
  plateRows.forEach((row) => {
    const sw = $<HTMLElement>('.sw--plate i', row);
    const m = (v: number) => (v < 0.5 ? -1 : 1) * (2 + r() * 3);
    sw?.style.setProperty('--mx', m(r()).toFixed(1) + 'px');
    sw?.style.setProperty('--my', m(r()).toFixed(1) + 'px');
    sw?.style.setProperty('--mr', ((r() * 2 - 1) * 0.3).toFixed(2) + 'deg');
  });

  const syncInk = (animate: boolean) => {
    let n = 0;
    for (const [k, row] of plateRows) {
      const inked = ctx.print.inked.has(k as PlateN);
      if (inked) n++;
      const was = row.hasAttribute('data-inked');
      if (inked && !was) {
        row.dataset.inked = '';
        if (animate && ctx.motion.enabled) {
          row.classList.add('just-inked');
          setTimeout(() => row.classList.remove('just-inked'), 500);
        }
      }
      const eye = $<HTMLButtonElement>('[data-plate-eye]', row);
      if (eye && k !== 1) eye.disabled = !inked;
      const state = $<HTMLElement>('.plate-row__state', row);
      if (state) state.textContent = inked ? '' : (state.dataset.uninkedLabel ?? '');
      const chip = barChips.get(k);
      if (chip) { if (inked) chip.dataset.inked = ''; else delete chip.dataset.inked; }
    }
    if (count) count.textContent = fill(s.inkedCount, { n });
  };
  const syncHidden = () => {
    for (const [k, row] of plateRows) {
      if (k === 1) continue;
      setEyeButton($<HTMLButtonElement>('[data-plate-eye]', row), !ctx.print.hidden.has(k as PlateN));
    }
  };
  $$<HTMLButtonElement>('[data-plate-eye]', panel).forEach((b) => {
    const n = Number(b.dataset.plateEye) as PlateN;
    if (n === 1) return;
    b.addEventListener('click', () => { ctx.print.setHidden(n, !ctx.print.hidden.has(n)); });
  });
  const thumbIfOpen = () => { if (panels.isOpen('layers') && panels.tab('layers') === 'separations') void renderThumb(); };
  ctx.print.on('ink', () => { syncInk(true); thumbIfOpen(); });
  ctx.print.on('hide', () => { syncHidden(); thumbIfOpen(); });
  ctx.print.on('marbling', thumbIfOpen);
  ctx.print.on('seal', thumbIfOpen);
  syncInk(false);
  syncHidden();

  $<HTMLButtonElement>('[data-save-print]', panel)?.addEventListener('click', async () => {
    const m = await import('./print-compositor');
    m.bindPrint(ctx);
    await m.downloadPrint();
  });

  return { refreshActive };
}
