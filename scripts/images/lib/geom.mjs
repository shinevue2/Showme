/** Small 2D geometry kit for the generated SVG assets (WP-02). Pure functions, no dependencies. */

export const f = (n, d = 2) => {
  const s = n.toFixed(d);
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s;
};
export const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
export const mul = (a, k) => [a[0] * k, a[1] * k];
export const len = (a) => Math.hypot(a[0], a[1]);
export const norm = (a) => mul(a, 1 / len(a));
export const perp = (a) => [-a[1], a[0]];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
export const polar = (c, r, deg) => [c[0] + r * Math.cos((deg * Math.PI) / 180), c[1] + r * Math.sin((deg * Math.PI) / 180)];

/** Polygon → path data. */
export const poly = (pts, d = 2) => 'M' + pts.map((p) => `${f(p[0], d)} ${f(p[1], d)}`).join('L') + 'Z';

/** Full circle as two arcs (path data), optionally counter-clockwise (for even-odd / non-zero holes). */
export function circle(c, r, ccw = false, d = 2) {
  const s = ccw ? 0 : 1;
  return `M${f(c[0] - r, d)} ${f(c[1], d)}A${f(r, d)} ${f(r, d)} 0 1 ${s} ${f(c[0] + r, d)} ${f(c[1], d)}A${f(r, d)} ${f(r, d)} 0 1 ${s} ${f(c[0] - r, d)} ${f(c[1], d)}Z`;
}

/** Sutherland–Hodgman: keep the part of convex polygon `pts` where dot(p - o, n) >= 0. */
export function clipHalf(pts, o, n) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const da = dot(sub(a, o), n), db = dot(sub(b, o), n);
    if (da >= 0) out.push(a);
    if ((da >= 0) !== (db >= 0)) {
      const t = da / (da - db);
      out.push(add(a, mul(sub(b, a), t)));
    }
  }
  return out;
}

/** Rectangle of width w around segment a→b (corners in order). */
export function band(a, b, w) {
  const n = mul(perp(norm(sub(b, a))), w / 2);
  return [add(a, n), add(b, n), sub(b, n), sub(a, n)];
}

/** Line–line intersection of p+t·r and q+u·s. */
export function intersect(p, r, q, s) {
  const rxs = r[0] * s[1] - r[1] * s[0];
  const t = ((q[0] - p[0]) * s[1] - (q[1] - p[1]) * s[0]) / rxs;
  return add(p, mul(r, t));
}

/** Deterministic PRNG (mulberry32). */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 1D value noise (smooth), deterministic. */
export function noise1(seed) {
  const r = rng(seed);
  const tab = Array.from({ length: 256 }, () => r() * 2 - 1);
  return (x) => {
    const i = Math.floor(x), t = x - i;
    const a = tab[i & 255], b = tab[(i + 1) & 255];
    const s = t * t * (3 - 2 * t);
    return a + (b - a) * s;
  };
}
