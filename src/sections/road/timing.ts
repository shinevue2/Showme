/**
 * Road — where things happen along the film's scroll span (DESIGN §6.3, §7.2, video §4.2/§4.5). Owner: WP-06.
 * Node-safe and DOM-free: render.ts writes these numbers into CSS custom properties (scroll-driven ranges) and
 * index.ts uses the same numbers for the JS fallback, the inking and the anchors, so both paths agree.
 *
 * Progress p ∈ [0, 1] runs across `.film__body` ('top top' → 'bottom bottom', = view-timeline `contain`).
 * Chapter i (0-based) owns p ∈ [i/7, (i+1)/7]; inside it u ∈ [0, 1]. The video rests for u ∈ [0, hold], then
 * travels with a smoothstep: the camera eases out (time 0–25 %), a mist card crosses (25–60 %), the camera
 * eases into the next station (60–100 %). Under smoothstep, time fraction τ is reached at scroll fraction
 * x = smoothstep⁻¹(τ), so the mist covers x ≈ 0.33 … 0.57 of the travel.
 */

export interface HoldChapter { readonly hold: number }

/** smoothstep⁻¹ on [0, 1] (closed form of the cubic's inverse). */
export function invSmoothstep(y: number): number {
  const c = Math.min(1, Math.max(0, y));
  return 0.5 - Math.sin(Math.asin(1 - 2 * c) / 3);
}

/** u (fraction of chapter i's span) at which the travel after the rest reaches media-time fraction τ. */
export function travelU(hold: number, tau: number): number {
  return hold + (1 - hold) * invSmoothstep(tau);
}

/** Caption i is visible over [c0, c1] (film progress); keyframes fade in over its first 20 %, out over its last 18 %. */
export interface CaptionRange { c0: number; c1: number; first: boolean }

export const CAP_FADE_IN = 0.2;
export const CAP_FADE_OUT = 0.18;

export function captionRanges(ch: readonly HoldChapter[]): CaptionRange[] {
  const n = ch.length;
  return ch.map((c, i) => {
    // fully readable from the moment the station has arrived (u = 0) until just after the rest ends;
    // gone before the mist of the next crossing (u ≥ hold + 0.2 < mist start for every hold in §7.1)
    const out1 = c.hold + 0.2;
    const len = out1 / (1 - CAP_FADE_IN);            // fade-in ends exactly at the chapter start
    const c0 = i === 0 ? 0 : (i - CAP_FADE_IN * len) / n;
    return { c0, c1: (i + out1) / n, first: i === 0 };
  });
}

/** Deep-link landing point of chapter i: a little after the caption has fully arrived, inside the rest. */
export function anchorAt(i: number, n = 7): number {
  return (i + 0.22) / n;
}

/** Plate n (1-based, 2–7) is inked once the visitor reaches its station's rest. */
export function inkAt(nPlate: number, n = 7): number {
  return (nPlate - 1) / n;
}

/** Stills tier: still i (i ≥ 1) crossfades in over the mist of the crossing into station i; the end still last. */
export function stillRanges(ch: readonly HoldChapter[]): { s0: number; s1: number }[] {
  const n = ch.length;
  const out: { s0: number; s1: number }[] = [{ s0: -1, s1: -1 }];
  for (let i = 1; i < n; i++) {
    const h = ch[i - 1]!.hold;
    out.push({ s0: (i - 1 + travelU(h, 0.3)) / n, s1: (i - 1 + travelU(h, 0.55)) / n });
  }
  const h7 = ch[n - 1]!.hold;
  out.push({ s0: (n - 1 + travelU(h7, 0.62)) / n, s1: (n - 1 + travelU(h7, 0.9)) / n });   // gold end still
  return out;
}

/**
 * Rain over Shōno (ch 7): it starts in the crossing from Okazaki, is heavy as the slope arrives, thins over
 * the rest ("rest placed after the rain thins", §7.2) and has stopped before the outro mist and gold.
 * Points are [p, opacity] for the JS fallback; style.css carries the same curve as a scroll-driven keyframe set.
 */
export const RAIN_POINTS: readonly (readonly [number, number])[] = [
  [5.64 / 7, 0], [5.84 / 7, 1], [5.98 / 7, 0.86], [6.12 / 7, 0.42], [6.42 / 7, 0.32], [6.62 / 7, 0.12], [6.76 / 7, 0],
];

export function rainOpacity(p: number): number {
  const pts = RAIN_POINTS;
  if (p <= pts[0]![0] || p >= pts[pts.length - 1]![0]) return 0;
  for (let k = 1; k < pts.length; k++) {
    const [p1, o1] = pts[k]!;
    if (p <= p1) {
      const [p0, o0] = pts[k - 1]!;
      return o0 + (o1 - o0) * ((p - p0) / (p1 - p0));
    }
  }
  return 0;
}

/** Opacity / x-offset of a caption at progress p (JS fallback of the `road-cap` keyframes). */
export function captionState(r: CaptionRange, p: number): { o: number; x: number } {
  const t = (p - r.c0) / (r.c1 - r.c0);
  if (r.first && t <= 0) return { o: 1, x: 0 };
  if (t <= 0 || t >= 1) return { o: 0, x: t <= 0 ? -24 : 32 };
  if (!r.first && t < CAP_FADE_IN) { const k = t / CAP_FADE_IN; return { o: k, x: -24 * (1 - k) }; }
  if (t > 1 - CAP_FADE_OUT) { const k = (t - (1 - CAP_FADE_OUT)) / CAP_FADE_OUT; return { o: 1 - k, x: 32 * k }; }
  return { o: 1, x: 0 };
}

/** Gold clouds of the road-works band: offsets (fractions of the layer box) at band progress p ∈ [0, 1]. */
export interface CloudMove { x: number; y: number }
/** Keyframe offsets at which style.css samples `cloudMoves` (the scroll-driven path interpolates linearly). */
export const CLOUD_STOPS = [0, 0.2, 0.4, 0.6, 0.7, 0.8, 0.9, 1] as const;
export function cloudMoves(p: number): [CloudMove, CloudMove, CloudMove] {
  const q = Math.min(1, Math.max(0, p));
  // drift right → left from rest (zero velocity at p = 0: the film's clouds settle with zero velocity on its
  // last frame, so the DOM clouds pick the drift up smoothly) …
  const drift = q ** 1.6;
  // … and from p = 0.6 the clouds part: the upper one lifts away, the lower one sinks, the middle withdraws right
  const part = q <= 0.6 ? 0 : ((q - 0.6) / 0.4) ** 2;
  return [
    { x: -0.36 * drift, y: -0.45 * part },
    { x: -0.2 * drift + 1.1 * part, y: 0 },
    { x: -0.42 * drift, y: 0.46 * part },
  ];
}
