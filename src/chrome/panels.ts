/**
 * Panels and sheets (DESIGN §4.1 Layers / Info, §4.2 bottom sheets). Owner: WP-04.
 *
 * One manager for the three openable instruments: the Layers panel (tabs Layers · Separations), the Info
 * sheet (tabs Info · Glossary · Settings) and, on phones, the language sheet under the type wheel.
 * Desktop: overlays (the Layers panel opens by click, Enter or 300 ms hover intent; Info by `i` or a click on
 * the status bar). Phones: bottom sheets (max 70 svh, drag handle, one at a time, tap outside to close).
 * Tabs follow the WAI-ARIA tabs pattern (roving tabindex, arrows, Home/End). Esc closes the latest panel.
 */
import { $, $$, mq } from './util';

export type PanelName = 'layers' | 'status' | 'lang';
type Via = 'hover' | 'click' | 'key' | 'api';

interface Def {
  name: PanelName;
  root: HTMLElement;          // gets [data-open]
  panel: HTMLElement;         // the panel / sheet element
  tab: string | null;
  open: boolean;
  via: Via;
  opener: HTMLElement | null;
  onTab?: (tab: string) => void;
  onOpen?: (tab: string | null) => void;
  onClose?: () => void;
  /** Only a sheet on phones (the language list is plain inline links on larger screens). */
  mobileOnly?: boolean;
  hide?: (on: boolean) => void;
}

export interface Panels {
  register(name: PanelName, root: HTMLElement | null, panel: HTMLElement | null, hooks?: Pick<Def, 'onTab' | 'onOpen' | 'onClose' | 'mobileOnly'>): void;
  open(name: PanelName, tab?: string | null, via?: Via, opener?: HTMLElement | null): void;
  close(name: PanelName, restoreFocus?: boolean): void;
  toggle(name: PanelName, tab?: string | null, via?: Via, opener?: HTMLElement | null): void;
  isOpen(name: PanelName): boolean;
  tab(name: PanelName): string | null;
  via(name: PanelName): Via | null;
  closeTop(): boolean;
  onChange(cb: () => void): () => void;
}

export function createPanels(): Panels {
  const defs = new Map<PanelName, Def>();
  const stack: PanelName[] = [];
  const listeners = new Set<() => void>();
  const emit = () => { for (const cb of listeners) cb(); };

  const selectTab = (d: Def, tab: string, focus: boolean) => {
    d.tab = tab;
    d.panel.dataset.tab = tab;
    $$<HTMLButtonElement>('[data-tab-btn]', d.panel).forEach((b) => {
      const on = b.dataset.tabBtn === tab;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
      if (on && focus) b.focus({ preventScroll: true });
    });
    $$<HTMLElement>('[data-tab-panel]', d.panel).forEach((p) => { p.hidden = p.dataset.tabPanel !== tab; });
    d.onTab?.(tab);
  };

  const api: Panels = {
    register(name, root, panel, hooks = {}) {
      if (!root || !panel) return;
      const first = $<HTMLButtonElement>('[data-tab-btn]', panel)?.dataset.tabBtn ?? null;
      const d: Def = { name, root, panel, tab: first, open: false, via: 'api', opener: null, ...hooks };
      defs.set(name, d);
      // tabs: click + keyboard
      const tabs = $$<HTMLButtonElement>('[data-tab-btn]', panel);
      tabs.forEach((b, i) => {
        b.addEventListener('click', () => selectTab(d, b.dataset.tabBtn!, false));
        b.addEventListener('keydown', (e) => {
          let j = -1;
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % tabs.length;
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + tabs.length) % tabs.length;
          else if (e.key === 'Home') j = 0;
          else if (e.key === 'End') j = tabs.length - 1;
          if (j < 0) return;
          e.preventDefault();
          selectTab(d, tabs[j]!.dataset.tabBtn!, true);
        });
      });
      $$<HTMLButtonElement>('[data-close]', panel).forEach((b) => b.addEventListener('click', () => api.close(name, true)));
      const hide = (on: boolean) => {
        const active = on && (!d.mobileOnly || mq.mobile.matches);
        if (active) panel.setAttribute('aria-hidden', 'true'); else panel.removeAttribute('aria-hidden');
        panel.inert = active;
      };
      d.hide = hide;
      hide(true);
      if (d.mobileOnly) mq.mobile.addEventListener('change', () => { if (!mq.mobile.matches && d.open) api.close(name); hide(!d.open); });
      // phones: drag the grip down to dismiss
      const grip = $('.panel__grip, .lang-nav__grip', panel);
      if (grip) {
        let y0 = 0, dy = 0, dragging = false;
        grip.addEventListener('pointerdown', (e) => { dragging = true; y0 = e.clientY; dy = 0; grip.setPointerCapture(e.pointerId); });
        grip.addEventListener('pointermove', (e) => {
          if (!dragging) return;
          dy = Math.max(0, e.clientY - y0);
          panel.style.transform = `translateY(${dy}px)`;
        });
        const end = () => {
          if (!dragging) return;
          dragging = false;
          panel.style.transform = '';
          if (dy > 64) api.close(name, true);
        };
        grip.addEventListener('pointerup', end);
        grip.addEventListener('pointercancel', end);
        grip.addEventListener('click', () => { if (dy < 4) api.close(name, true); });
      }
    },
    open(name, tab, via = 'api', opener = null) {
      const d = defs.get(name);
      if (!d) return;
      if (mq.mobile.matches) for (const other of defs.values()) if (other !== d && other.open) api.close(other.name, false);
      if (tab && tab !== d.tab) selectTab(d, tab, false);
      else if (d.tab) selectTab(d, d.tab, false);
      const was = d.open;
      d.open = true;
      if (!was || via !== 'hover') d.via = was && d.via !== 'hover' ? d.via : via;
      if (opener) d.opener = opener;
      d.root.dataset.open = '';
      d.hide?.(false);
      const i = stack.indexOf(name);
      if (i >= 0) stack.splice(i, 1);
      stack.push(name);
      if (!was) d.onOpen?.(d.tab);
      if (via === 'key' || via === 'click') {
        const target = $<HTMLElement>('[data-tab-btn][aria-selected="true"]', d.panel) ?? $<HTMLElement>('a, button', d.panel);
        if (via === 'key' || mq.mobile.matches) target?.focus({ preventScroll: true });
      }
      emit();
    },
    close(name, restoreFocus = false) {
      const d = defs.get(name);
      if (!d || !d.open) return;
      const hadFocus = d.panel.contains(document.activeElement);
      d.open = false;
      delete d.root.dataset.open;
      d.hide?.(true);
      const i = stack.indexOf(name);
      if (i >= 0) stack.splice(i, 1);
      d.onClose?.();
      if ((restoreFocus || hadFocus) && d.opener && document.contains(d.opener)) d.opener.focus({ preventScroll: true });
      emit();
    },
    toggle(name, tab, via = 'click', opener = null) {
      const d = defs.get(name);
      if (!d) return;
      if (d.open && (!tab || tab === d.tab) && d.via !== 'hover') api.close(name, via === 'key');
      else api.open(name, tab, via, opener);
    },
    isOpen: (name) => !!defs.get(name)?.open,
    tab: (name) => defs.get(name)?.tab ?? null,
    via: (name) => (defs.get(name)?.open ? defs.get(name)!.via : null),
    closeTop() {
      const top = stack[stack.length - 1];
      if (!top) return false;
      api.close(top, true);
      return true;
    },
    onChange(cb) { listeners.add(cb); return () => listeners.delete(cb); },
  };

  // phones: a tap outside any sheet (and outside the toolbar) closes it
  document.addEventListener('pointerdown', (e) => {
    if (!mq.mobile.matches) return;
    const t = e.target as Element;
    if (t.closest('.panel, .lang-nav, .docbar__tools, .docbar__menu')) return;
    for (const d of defs.values()) if (d.open) api.close(d.name, false);
  }, { passive: true });

  return api;
}
