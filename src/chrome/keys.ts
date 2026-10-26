/**
 * Keyboard map (DESIGN §4.5; WCAG 2.1.4 — toggleable in Settings, inactive while focus is in a text field).
 * Owner: WP-04.  i Info · y / Shift+Y / Ctrl⌘+Y Outline · Shift+R rulers · [ ] previous / next artboard ·
 * Esc closes panels, sheets, menus and dialogs (always on). Ctrl/⌘+R is never captured; inside Works the
 * arrow keys belong to the byōbu (WP-07).
 */
import { SECTION_ORDER } from '../core/types';
import { local } from '../core/storage';
import { isTextField, type ChromeCtx } from './util';
import type { Panels } from './panels';
import type { RulersAPI } from './rulers';
import type { OutlineAPI } from './outline';

export function mountKeys(c: ChromeCtx, panels: Panels, rulers: RulersAPI | null, outline: OutlineAPI | null, closeOthers: () => boolean): void {
  const { ctx } = c;
  const enabled = () => local.get('hanmoto.shortcuts') !== 'off';
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (panels.closeTop() || closeOthers()) e.preventDefault();
      return;
    }
    if (e.defaultPrevented || e.isComposing) return;
    if (isTextField(document.activeElement)) return;
    const mod = e.ctrlKey || e.metaKey;
    const k = e.key;
    if (mod && !e.altKey && (k === 'y' || k === 'Y')) {
      if (!enabled() || !outline || !document.hasFocus()) return;
      e.preventDefault();                       // best effort: some browsers reserve it
      outline.toggle();
      return;
    }
    if (mod || e.altKey || !enabled()) return;  // never capture Ctrl/⌘+R (or any other modified key)
    if ((k === 'i' || k === 'I') && !e.shiftKey) {
      if (ctx.page === 'notfound') return;
      e.preventDefault();
      panels.toggle('status', 'info', 'key');
    } else if (k === 'y' || k === 'Y') {
      if (!outline) return;
      e.preventDefault();
      outline.toggle();
    } else if ((k === 'R' || k === 'r') && e.shiftKey) {
      if (!rulers) return;
      e.preventDefault();
      rulers.setVisible(!rulers.visible);
    } else if (k === '[' || k === ']') {
      if (ctx.page !== 'main') return;
      const i = SECTION_ORDER.indexOf(ctx.scroll.active);
      const j = Math.max(0, Math.min(SECTION_ORDER.length - 1, i + (k === ']' ? 1 : -1)));
      if (j === i) return;
      e.preventDefault();
      const el = document.getElementById(SECTION_ORDER[j]!);
      if (el) { ctx.scroll.scrollTo(el); el.focus?.({ preventScroll: true }); }
    }
  });
}
