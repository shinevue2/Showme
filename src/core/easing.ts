/**
 * Easing curves (DESIGN §5.3) — the same curves as the CSS tokens, as functions (GSAP `ease: johakyu`) and as
 * 64-entry LUTs for shaders. Owner: WP-00.
 */

/** Cubic-bezier easing (x1, y1, x2, y2) solved with Newton + bisection, like CSS. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  const solve = (x: number) => {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const e = sx(t) - x;
      if (Math.abs(e) < 1e-6) return t;
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    let lo = 0, hi = 1;
    t = x;
    for (let i = 0; i < 30; i++) {
      const v = sx(t);
      if (Math.abs(v - x) < 1e-6) break;
      if (v < x) lo = t; else hi = t;
      t = (lo + hi) / 2;
    }
    return t;
  };
  return (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : sy(solve(t)));
}

/** CSS `linear()` easing from [value, stop%] pairs (stops optional → evenly spaced). */
export function linearEase(points: readonly (readonly [number, number?])[]): (t: number) => number {
  const n = points.length;
  const pts = points.map(([v, s], i) => [v, s === undefined ? i / (n - 1) : s / 100] as const);
  return (t: number) => {
    if (t <= 0) return pts[0]![0];
    if (t >= 1) return pts[n - 1]![0];
    for (let i = 1; i < n; i++) {
      const [v1, s1] = pts[i]!;
      if (t <= s1) {
        const [v0, s0] = pts[i - 1]!;
        return v0 + ((v1 - v0) * (t - s0)) / Math.max(s1 - s0, 1e-9);
      }
    }
    return pts[n - 1]![0];
  };
}

/** 序: slow, airy — cubic-bezier(.45, 0, .2, 1) */
export const jo = cubicBezier(0.45, 0, 0.2, 1);
/** 急: decisive — cubic-bezier(.2, .9, .1, 1) */
export const kyu = cubicBezier(0.2, 0.9, 0.1, 1);
/** 序破急 curve — linear(0, .03 15%, .10 35%, .35 60%, .60 80%, .85 93%, 1) */
export const johakyu = linearEase([[0], [0.03, 15], [0.1, 35], [0.35, 60], [0.6, 80], [0.85, 93], [1, 100]]);
/** damped spring k=380, c=24, m=1 sampled over 420 ms (≈ 8.6 % overshoot) */
export const register = linearEase([
  [0], [0.133, 7.1], [0.403, 14.3], [0.676, 21.4], [0.886, 28.6], [1.015, 35.7], [1.074, 42.9],
  [1.086, 50], [1.071, 57.1], [1.047, 64.3], [1.024, 71.4], [1.007, 78.6], [0.998, 85.7], [0.993, 92.9], [1, 100],
]);

export const DURATIONS = { micro: 140, kyu: 220, register: 420, ha: 600, jo: 1200 } as const;

/** 64-entry lookup table for shaders (sample i at t = i / 63). */
export function lut(fn: (t: number) => number, size = 64): Float32Array {
  const out = new Float32Array(size);
  for (let i = 0; i < size; i++) out[i] = fn(i / (size - 1));
  return out;
}

export const LUTS = {
  get jo() { return lut(jo); },
  get kyu() { return lut(kyu); },
  get johakyu() { return lut(johakyu); },
  get register() { return lut(register); },
};

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
