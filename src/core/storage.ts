/**
 * Storage (DESIGN §9 Persistence). Owner: WP-00. Every access is try/catch; the page works when storage
 * throws (private mode, blocked site data). Keys: localStorage hanmoto.lang/theme/motion/seed/shortcuts/tier;
 * sessionStorage hanmoto.pos/langSwitched/eyes.
 */
export type LocalKey = 'hanmoto.lang' | 'hanmoto.theme' | 'hanmoto.motion' | 'hanmoto.seed' | 'hanmoto.shortcuts' | 'hanmoto.tier';
export type SessionKey = 'hanmoto.pos' | 'hanmoto.langSwitched' | 'hanmoto.eyes';

function area(kind: 'local' | 'session'): Storage | null {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

function get(kind: 'local' | 'session', key: string): string | null {
  try { return area(kind)?.getItem(key) ?? null; } catch { return null; }
}
function set(kind: 'local' | 'session', key: string, value: string | null): void {
  try {
    const a = area(kind);
    if (!a) return;
    if (value === null) a.removeItem(key); else a.setItem(key, value);
  } catch { /* quota or blocked: ignore */ }
}

export const local = {
  get: (k: LocalKey) => get('local', k),
  set: (k: LocalKey, v: string | null) => set('local', k, v),
  json<T>(k: LocalKey, fallback: T): T {
    const raw = get('local', k);
    if (raw === null) return fallback;
    try { return JSON.parse(raw) as T; } catch { return fallback; }
  },
  setJson: (k: LocalKey, v: unknown) => set('local', k, JSON.stringify(v)),
};

export const session = {
  get: (k: SessionKey) => get('session', k),
  set: (k: SessionKey, v: string | null) => set('session', k, v),
  json<T>(k: SessionKey, fallback: T): T {
    const raw = get('session', k);
    if (raw === null) return fallback;
    try { return JSON.parse(raw) as T; } catch { return fallback; }
  },
  setJson: (k: SessionKey, v: unknown) => set('session', k, JSON.stringify(v)),
};
