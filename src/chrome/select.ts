/**
 * Selection boxes (DESIGN §4.1; fine pointer, ≥ 768 px). Owner: WP-04.
 * Hovering any [data-select] (headings, figures, metric numbers, view placeholders) draws ONE reused overlay:
 * a 1 px box in the section's --layer-* colour, eight hollow 6 px handles, a centre point, and a label
 * above-left — `Dela Gothic One 400 · 128px · 紺 #0F2540` (first family of the computed font-family, computed
 * size, colour → nearest token through core/palette). Computed on pointerenter, hidden while scrolling; the
 * rulers mark the selection's extent.
 */
import { colourLabel } from '../core/palette';
import { h, mq, type ChromeCtx } from './util';
import type { RulersAPI } from './rulers';

export function mountSelect(c: ChromeCtx, rulers: RulersAPI | null): void {
  const { ctx } = c;
  const box = h('div', 'sel', { 'aria-hidden': 'true' }, '<i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><b></b><span></span>');
  document.body.appendChild(box);
  const label = box.querySelector('span')!;
  let current: Element | null = null;
  let scrolling = false;
  let lastX = -1, lastY = -1;

  const describe = (el: HTMLElement): string => {
    const r = el.getBoundingClientRect();
    const dims = `${Math.round(r.width)}×${Math.round(r.height)}`;
    const viewId = el.dataset.viewId;
    if (viewId) return `view · ${viewId} · ${dims}${el.dataset.live === '1' ? ' · live' : ''}`;
    const file = el.getAttribute('data-file') ?? el.querySelector('[data-file]')?.getAttribute('data-file');
    if (file && (el.tagName === 'FIGURE' || el.tagName === 'PICTURE' || el.querySelector('img'))) return `${file} · ${dims}`;
    const cs = getComputedStyle(el);
    const fam = (cs.fontFamily.split(',')[0] ?? '').replace(/["']/g, '').trim();
    const size = Math.round(parseFloat(cs.fontSize));
    const theme = ctx.theme.current;
    return `${fam} ${cs.fontWeight} · ${size}px · ${colourLabel(cs.color, theme)}`;
  };

  const show = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4 || r.bottom < 0 || r.top > innerHeight) { hide(); return; }
    const sec = el.closest<HTMLElement>('[data-section]');
    const col = sec ? getComputedStyle(sec).getPropertyValue('--layer').trim() : '';
    box.style.setProperty('--sel-c', col || 'var(--select)');
    box.style.transform = `translate(${Math.round(r.left)}px, ${Math.round(r.top)}px)`;
    box.style.width = `${Math.round(r.width)}px`;
    box.style.height = `${Math.round(r.height)}px`;
    label.textContent = describe(el);
    if (r.top < 96) box.dataset.below = ''; else delete box.dataset.below;
    box.dataset.on = '';
    rulers?.setExtent({ left: r.left, right: r.right, top: r.top, bottom: r.bottom });
  };
  function hide() {
    if (!box.hasAttribute('data-on')) return;
    delete box.dataset.on;
    rulers?.setExtent(null);
  }
  const enabled = () => mq.fine.matches && !mq.mobile.matches && !ctx.proof;

  document.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse' || !enabled() || scrolling) return;
    const t = (e.target as Element).closest?.('[data-select]') ?? null;
    if (t && (t as HTMLElement).closest('.chrome')) return;
    if (t === current) return;
    current = t;
    if (t) show(t as HTMLElement); else hide();
  }, { passive: true });

  let scrollTimer: ReturnType<typeof setTimeout> | null = null;
  addEventListener('scroll', () => {
    scrolling = true;
    current = null;
    hide();
    if (scrollTimer) clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => { scrolling = false; }, 160);
  }, { passive: true });

  // after a scroll the element under a still pointer changes without a pointerover: re-pick on the next move
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || scrolling || !enabled()) return;
    if (current || (Math.abs(e.clientX - lastX) < 2 && Math.abs(e.clientY - lastY) < 2)) return;
    lastX = e.clientX; lastY = e.clientY;
    const t = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-select]') ?? null;
    if (t && !(t as HTMLElement).closest('.chrome')) { current = t; show(t as HTMLElement); }
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { current = null; hide(); });
}
