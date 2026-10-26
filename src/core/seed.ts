/**
 * Deterministic randomness (DESIGN §4 today's print seed, §8.6 re-seeding). Owner: WP-00.
 * Never `Math.random` in anything that must replay: derive sub-streams with `stream(seed, 'name')`.
 */
import { local } from './storage';

/** mulberry32 PRNG → floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a 32-bit string hash. */
export function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** A named, independent random stream derived from the visitor seed. */
export function stream(seed: number, name: string): () => number {
  return mulberry32((seed ^ hash32(name)) >>> 0);
}

/** Visitor seed: `?seed=` → localStorage['hanmoto.seed'] → a new one (stored). */
export function resolveSeed(): number {
  try {
    const q = new URLSearchParams(location.search).get('seed');
    if (q && /^\d{1,10}$/.test(q)) return Number(q) >>> 0;
  } catch { /* no location */ }
  const stored = local.get('hanmoto.seed');
  if (stored && /^\d{1,10}$/.test(stored)) return Number(stored) >>> 0;
  let s: number;
  try {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    s = a[0]!;
  } catch {
    s = (Date.now() * 2654435761) >>> 0;
  }
  local.set('hanmoto.seed', String(s));
  return s;
}
