/**
 * Film timeline (DESIGN §7.1–§7.2, owner WP-03). Deterministic: frame index → time; no clocks, no Math.random.
 * Landscape 1920×1080 @ 30 fps (480 frames), portrait 1080×1920 @ 24 fps (384 frames), 16.0 s.
 * Rest frames are exact camera poses (forced IDR frames in the encodes).
 */
export type Variant = 'landscape' | 'portrait';

export interface VariantSpec {
  variant: Variant;
  width: number;
  height: number;
  fps: number;
  frames: number;
  rest: readonly number[];   // rest frame per chapter (7)
  walkEvery: number;         // traveller pose alternation, frames
}

export const REST_TIMES = [0, 2.2, 4.6, 6.9, 9.2, 11.5, 13.8] as const;
export const DURATION = 16.0;
export const HOLD = [0.3, 0.4, 0.4, 0.4, 0.4, 0.4, 0.55] as const;

export const VARIANTS: Record<Variant, VariantSpec> = {
  landscape: { variant: 'landscape', width: 1920, height: 1080, fps: 30, frames: 480, rest: [0, 66, 138, 207, 276, 345, 414], walkEvery: 6 },
  portrait: { variant: 'portrait', width: 1080, height: 1920, fps: 24, frames: 384, rest: [0, 53, 110, 166, 221, 276, 331], walkEvery: 5 },
};

/** Where frame f sits: in a travel segment k (station k → k+1, u ∈ [0,1]) or in the outro (k = 6). */
export interface Phase { k: number; u: number; outro: boolean; atRest: boolean }

export function phase(spec: VariantSpec, f: number): Phase {
  const R = spec.rest;
  if (f >= R[6]!) {
    const u = (f - R[6]!) / (spec.frames - 1 - R[6]!);
    return { k: 6, u: Math.min(1, Math.max(0, u)), outro: true, atRest: f === R[6] };
  }
  for (let k = 0; k < 6; k++) {
    if (f >= R[k]! && f < R[k + 1]!) {
      return { k, u: (f - R[k]!) / (R[k + 1]! - R[k]!), outro: false, atRest: f === R[k] };
    }
  }
  return { k: 0, u: 0, outro: false, atRest: true };
}

export const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
/** Ken Perlin's smootherstep on [a, b]: zero velocity and acceleration at both ends. */
export function smoother(a: number, b: number, x: number): number {
  const t = clamp01((x - a) / (b - a));
  return t * t * t * (t * (t * 6 - 15) + 10);
}
export function smooth(a: number, b: number, x: number): number {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}
/** Sine ease-in-out on [a, b]. */
export function sine(a: number, b: number, x: number): number {
  const t = clamp01((x - a) / (b - a));
  return 0.5 - 0.5 * Math.cos(Math.PI * t);
}

/** mulberry32 — the film's only source of randomness (seeded). */
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

/** Time in seconds of frame f. */
export const timeOf = (spec: VariantSpec, f: number): number => f / spec.fps;
