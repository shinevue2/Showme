/**
 * Suminagashi op list (DESIGN §6.8). Owner: WP-10. Node-safe (used by the view, the share links and the CPU
 * renderer that bakes `public/img/gen/default-print.webp`).
 *
 * Closed-form marbling (Lu & Jaffer 2012; *threejs* §c2). Pattern space is the unit square, y up.
 *  - drop  {c, r, ink, dens}: P' = C + (P−C)·√(1 + r²/|P−C|²); ink 0 = clear surfactant (pushes, deposits nothing)
 *  - tine  {a, m, alpha, lambda, len}: P' = P + (αλ/(d+λ))·M, d = |(P−A)·N|; len > 0 = a finite stylus stroke from A
 *  - comb  {a, m, alpha, spacing}: a smooth comb (a fan's breath): P' = P + α·sin(2π·dₙ/spacing)·M, dₙ the signed
 *    distance to the line; d is invariant along M, so it is area-preserving with the exact inverse P = P' − …·M
 *
 * Initial list (deterministic, from content): op 0 = the gold (plate 8) drop at the centre (the achievements →
 * writing hand-off); then, in date order, every repo release (a nested pair — ink, then clear — round the repo's
 * own centre, so each project grows its own set of fine concentric rings like a real suminagashi touch), every
 * article (one comb at angle month/12·π) and every talk (a plate-7 touch and one tine through it).
 */
import type { MarbleOp, PlateN } from '../../core/types';
import type { Article, Repo, Talk } from '../../content/types';

export interface MOp extends MarbleOp {
  /** finite tine length (pattern units); 0/undefined = a line across the whole tray */
  len?: number;
  /** ink density 0..1 (sumi thins as it spreads) */
  dens?: number;
}

/** Day plate fills (tokens.css §3.1); index = plate number, 0 = clear. Prints are never inverted at night. */
export const INK_HEX = ['#FFFFFB', '#0F2540', '#5DAC81', '#91989F', '#F4A7B9', '#A5DEE4', '#205C81', '#656765', '#FFB11B'] as const;
export const PAPER_HEX = '#FFFFFB';
export const MAX_SHARE_OPS = 200;
/** item ids carried by the id attachment (hover highlights) */
export const ID = { gold: 1, repo0: 2, article0: 5, talk0: 11, visitor: 14 } as const;

export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
  return h >>> 0;
}
const u01 = (h: number) => (h >>> 8) / 16777216;

/** Each repo's touch point: hashed, kept off the gold centre and apart from the others. */
function repoCentres(repos: readonly Repo[]): Map<string, [number, number]> {
  const out = new Map<string, [number, number]>();
  const placed: [number, number][] = [[0.5, 0.5]];
  for (const r of repos) {
    let salt = 0, c: [number, number] = [0.5, 0.5];
    for (; salt < 64; salt++) {
      const h1 = hashStr(`${r.id}:x:${salt}`), h2 = hashStr(`${r.id}:y:${salt}`);
      c = [0.2 + 0.6 * u01(h1), 0.2 + 0.6 * u01(h2)];
      if (placed.every((p) => Math.hypot(p[0] - c[0], p[1] - c[1]) > 0.3)) break;
    }
    placed.push(c);
    out.set(r.id, c);
  }
  return out;
}

/** a brush touch spreads wider than the bare formula (§6.8 r) so the rings meet and interfere, as on real water */
const TOUCH = 2.1;
export function releaseRadius(lines: number): number {
  return 0.02 + 0.012 * Math.log2(1 + lines / 100);
}

export function buildOps(content: { repos: readonly Repo[]; articles: readonly Article[]; talks: readonly Talk[] }): MOp[] {
  const ops: MOp[] = [{ k: 'drop', c: [0.5, 0.5], r: 0.12, ink: 8, id: ID.gold, dens: 0.96 }];
  const centres = repoCentres(content.repos);
  type Ev = { date: string; order: number; emit: () => void };
  const evs: Ev[] = [];
  content.repos.forEach((repo, ri) => {
    const c0 = centres.get(repo.id)!;
    repo.releases.forEach((rel) => {
      evs.push({ date: rel.date, order: 0, emit: () => {
        const h = hashStr(`${repo.id}@${rel.tag}`);
        const a = u01(h) * Math.PI * 2, j = 0.006 + 0.012 * u01(hashStr(`${rel.tag}#${repo.id}`));
        const c: [number, number] = [c0[0] + Math.cos(a) * j, c0[1] + Math.sin(a) * j];
        const r = releaseRadius(rel.lines) * TOUCH;
        const id = ID.repo0 + ri;
        // one touch of ink and one of clear: a fine ring that later touches push outwards and thin
        ops.push({ k: 'drop', c, r: r * 0.42, ink: repo.plate, id, dens: 0.8 + 0.18 * u01(h ^ 0x9e3779b9) });
        ops.push({ k: 'drop', c, r: r * 0.82, ink: 0, id });
      } });
    });
  });
  content.articles.forEach((art, i) => {
    evs.push({ date: art.date, order: 1, emit: () => {
      const month = Number(art.date.slice(5, 7)) || 1;
      const th = (month / 12) * Math.PI;
      const h = hashStr(art.id);
      ops.push({ k: 'comb', a: [0.5 + 0.04 * (u01(h) - 0.5), 0.5 + 0.04 * (u01(h >>> 3) - 0.5)], m: [Math.cos(th), Math.sin(th)],
        alpha: 0.022, lambda: 0, spacing: 0.22 + 0.06 * u01(h >>> 5), id: ID.article0 + i });
    } });
  });
  content.talks.forEach((talk, i) => {
    evs.push({ date: talk.date, order: 2, emit: () => {
      const h = hashStr(talk.id);
      const c: [number, number] = [0.26 + 0.48 * u01(h), 0.26 + 0.48 * u01(hashStr(talk.id + '/y'))];
      const th = u01(hashStr(talk.id + '/a')) * Math.PI;
      const id = ID.talk0 + i;
      ops.push({ k: 'drop', c, r: 0.034, ink: 7, id, dens: 0.9 });
      ops.push({ k: 'drop', c, r: 0.026, ink: 0, id });
      ops.push({ k: 'tine', a: c, m: [Math.cos(th), Math.sin(th)], alpha: 0.07, lambda: 0.06, id });
    } });
  });
  evs.sort((x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : x.order - y.order));
  evs.forEach((e) => e.emit());
  return ops;
}

/** Index ranges of each item's ops (for hover highlights and comb guides). */
export function opsOf(ops: readonly MOp[], id: number): MOp[] { return ops.filter((o) => o.id === id); }

/* ---------------------------------------------------------------- share links: ?ops=<base64url> */
// 8 bytes per op: kind/ink, x (u16), y (u16), p1 (r or α, u8), angle (u8), len (u8)
const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : Number.isFinite(x) ? x : a);
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function b64url(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i]! << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    const k = Math.min(4, Math.ceil(((bytes.length - i) * 8) / 6));
    for (let j = 0; j < k; j++) s += B64[(n >>> (18 - 6 * j)) & 63];
  }
  return s;
}
function unb64url(s: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(s) || s.length > 4096) return null;
  const out: number[] = [];
  for (let i = 0; i < s.length; i += 4) {
    let n = 0, k = 0;
    for (let j = 0; j < 4; j++) { const c = s[i + j]; n = (n << 6) | (c ? B64.indexOf(c) : 0); if (c) k++; }
    const bytes = Math.floor((k * 6) / 8);
    for (let j = 0; j < bytes; j++) out.push((n >>> (16 - 8 * j)) & 255);
  }
  return Uint8Array.from(out);
}

/** Visitor ops → compact share string (quantised, at most MAX_SHARE_OPS, never raw text). */
export function encodeOps(ops: readonly MOp[]): string {
  const list = ops.slice(-MAX_SHARE_OPS);
  const b = new Uint8Array(list.length * 8);
  list.forEach((o, i) => {
    const kind = o.k === 'drop' ? 0 : o.k === 'tine' ? 1 : 2;
    const p = o.k === 'drop' ? o.c! : o.a!;
    const ink = o.k === 'drop' ? (o.ink ?? 1) : 0;
    const x = Math.round(clamp(p[0], 0, 1) * 65535), y = Math.round(clamp(p[1], 0, 1) * 65535);
    const p1 = o.k === 'drop' ? Math.round(clamp(o.r ?? 0.04, 0, 0.2) / 0.2 * 255) : Math.round(clamp(o.alpha ?? 0.06, 0, 0.2) / 0.2 * 255);
    const m = o.m ?? [1, 0];
    const ang = Math.round((((Math.atan2(m[1], m[0]) / Math.PI) % 2 + 2) % 2) / 2 * 255);
    const len = Math.round(clamp(o.len ?? 0, 0, 1) * 255);
    b.set([kind | (ink << 4), x >> 8, x & 255, y >> 8, y & 255, p1, ang, len], i * 8);
  });
  return b64url(b);
}

/** Share string → validated, clamped visitor ops (invalid input → []). */
export function decodeOps(s: string | null): MOp[] {
  if (!s) return [];
  const b = unb64url(s);
  if (!b || b.length % 8) return [];
  const out: MOp[] = [];
  for (let i = 0; i < b.length && out.length < MAX_SHARE_OPS; i += 8) {
    const kind = b[i]! & 15, ink = clamp(b[i]! >> 4, 0, 8) as PlateN | 0;
    if (kind > 2) return [];
    const x = ((b[i + 1]! << 8) | b[i + 2]!) / 65535, y = ((b[i + 3]! << 8) | b[i + 4]!) / 65535;
    const p1 = (b[i + 5]! / 255) * 0.2, th = (b[i + 6]! / 255) * Math.PI * 2, len = b[i + 7]! / 255;
    const m: [number, number] = [Math.cos(th), Math.sin(th)];
    if (kind === 0) out.push({ k: 'drop', c: [x, y], r: clamp(p1, 0.01, 0.12), ink, id: ID.visitor, dens: 0.92 });
    else if (kind === 1) out.push({ k: 'tine', a: [x, y], m, alpha: clamp(p1, 0.005, 0.14), lambda: 0.025, len: clamp(len, 0, 1), id: ID.visitor });
    else out.push({ k: 'comb', a: [x, y], m, alpha: clamp(p1, 0.005, 0.05), lambda: 0, spacing: 0.22, id: ID.visitor });
  }
  return out;
}

/* ---------------------------------------------------------------- CPU renderer (bakes, fallbacks) */
function hexRgb(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const TINE_FALLOFF = 0.1;

/** Pre-image of p under op o (o's inverse map); returns the drop coverage of p in `cov` (drops only). */
function inverse(o: MOp, x: number, y: number, out: { x: number; y: number; inside: boolean }): void {
  if (o.k === 'drop') {
    const dx = x - o.c![0], dy = y - o.c![1], l2 = dx * dx + dy * dy, r = o.r!;
    out.inside = l2 < r * r;
    const s = Math.sqrt(Math.max(1 - (r * r) / Math.max(l2, 1e-12), 0));
    out.x = o.c![0] + dx * s; out.y = o.c![1] + dy * s;
    return;
  }
  out.inside = false;
  const [mx, my] = o.m!, nx = -my, ny = mx;
  const px = x - o.a![0], py = y - o.a![1];
  const dn = px * nx + py * ny;
  let w = o.k === 'comb' ? o.alpha! * Math.sin((2 * Math.PI * dn) / (o.spacing || 0.15)) : (o.alpha! * o.lambda!) / (Math.abs(dn) + o.lambda!);
  if (o.k === 'tine' && o.len) {
    const t = px * mx + py * my;
    w *= smooth01((t + TINE_FALLOFF) / TINE_FALLOFF) * smooth01((o.len + TINE_FALLOFF - t) / TINE_FALLOFF);
  }
  out.x = x - w * mx; out.y = y - w * my;
}
function smooth01(t: number): number { const k = t < 0 ? 0 : t > 1 ? 1 : t; return k * k * (3 - 2 * k); }

/**
 * Render ops to RGBA (sRGB, straight alpha: rgb = ink, a = amount) at size², 2×2 supersampled.
 * Same composition as the GPU pass (newest op first, front-to-back).
 */
export function renderCpu(ops: readonly MOp[], size: number): Uint8ClampedArray<ArrayBuffer> {
  const px = new Uint8ClampedArray(size * size * 4);
  const inks = INK_HEX.map(hexRgb);
  const o = { x: 0, y: 0, inside: false };
  const n = ops.length;
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      let R = 0, G = 0, B = 0, A = 0;
      for (let s = 0; s < 4; s++) {
        let x = (i + 0.25 + 0.5 * (s & 1)) / size, y = 1 - (j + 0.25 + 0.5 * (s >> 1)) / size;
        for (let k = n - 1; k >= 0; k--) {
          const op = ops[k]!;
          inverse(op, x, y, o);
          if (o.inside) {
            const ink = op.ink ?? 0;
            if (ink) { const a = op.dens ?? 1, c = inks[ink]!; R += c[0] * a; G += c[1] * a; B += c[2] * a; A += a; }
            break;
          }
          x = o.x; y = o.y;
        }
      }
      const q = (j * size + i) * 4;
      const a = A / 4;
      if (A > 0) { px[q] = R / A; px[q + 1] = G / A; px[q + 2] = B / A; }
      px[q + 3] = Math.round(a * 255);
    }
  }
  return px;
}
