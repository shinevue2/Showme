/**
 * Theme — 本摺 ⇄ 石摺 (DESIGN §4.3). Owner: WP-00.
 * Default follows prefers-color-scheme (day when no preference). Choosing sets data-theme="light"|"dark"
 * on <html> and stores it (try/catch); 'auto' removes it and follows the OS again. The switch is a
 * same-document View Transition with the ichimonji-bokashi wipe (motion.css, html.theme-wipe); fallback:
 * instant swap. Subscribers (the stage tweens uNight over 700 ms) get the resolved Theme.
 */
import type { Theme, ThemeAPI, ThemePref } from './types';
import { local } from './storage';

const DAY_META = '#C1E4E9';
const NIGHT_META = '#566C73';

export interface ThemeOptions {
  /** Whether the wipe may animate (motion enabled). */
  animate(): boolean;
}

type VTDoc = Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };

export function createTheme(opts: ThemeOptions): ThemeAPI {
  const root = document.documentElement;
  const mq = matchMedia('(prefers-color-scheme: dark)');
  const stored = local.get('hanmoto.theme');
  let pref: ThemePref = stored === 'light' || stored === 'dark' ? stored : 'auto';
  const listeners = new Set<(t: Theme) => void>();

  const resolve = (): Theme => {
    const a = root.dataset.theme;
    if (a === 'dark') return 'night';
    if (a === 'light') return 'day';
    return mq.matches ? 'night' : 'day';
  };
  let current: Theme = resolve();

  const syncMeta = () => {
    const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
    const explicit = root.dataset.theme === 'light' || root.dataset.theme === 'dark';
    metas.forEach((m) => {
      if (m.hasAttribute('media') || m.dataset.media) {
        if (!m.dataset.media) m.dataset.media = m.getAttribute('media') ?? '';
        m.setAttribute('media', explicit ? 'not all' : m.dataset.media);
      } else {
        m.content = explicit ? (current === 'night' ? NIGHT_META : DAY_META) : DAY_META;
      }
    });
  };

  const emit = () => { for (const cb of listeners) { try { cb(current); } catch (e) { console.error(e); } } };

  const apply = (p: ThemePref) => {
    if (p === 'auto') delete root.dataset.theme;
    else root.dataset.theme = p;
    current = resolve();
    syncMeta();
  };

  mq.addEventListener('change', () => {
    if (pref !== 'auto' && root.dataset.theme) return;
    const prev = current;
    current = resolve();
    syncMeta();
    if (prev !== current) emit();
  });
  syncMeta();

  const api: ThemeAPI = {
    get current() { return current; },
    get pref() { return pref; },
    set(p: ThemePref) {
      pref = p;
      local.set('hanmoto.theme', p === 'auto' ? null : p);
      const prev = current;
      const next: Theme = p === 'auto' ? (mq.matches ? 'night' : 'day') : p === 'dark' ? 'night' : 'day';
      const d = document as VTDoc;
      if (next !== prev && typeof d.startViewTransition === 'function' && opts.animate()) {
        root.classList.add('theme-wipe');
        try {
          const vt = d.startViewTransition(() => apply(p));
          vt.finished.catch(() => undefined).finally(() => root.classList.remove('theme-wipe'));
        } catch {
          root.classList.remove('theme-wipe');
          apply(p);
        }
      } else {
        apply(p);
      }
      current = next;
      if (next !== prev) emit();
      document.dispatchEvent(new CustomEvent('hanmoto:theme', { detail: { theme: current, pref } }));
    },
    toggle() {
      api.set(current === 'night' ? 'light' : 'dark');
    },
    on(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
  };
  return api;
}
