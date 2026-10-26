/**
 * Principles — the garden's fixed geometry (DESIGN §6.6). Owner: WP-08. Pure and Node-safe (render + view).
 *
 * Plane units: the 16 : 9 data plane spans x ∈ [−1, 1], z ∈ [−0.5625, 0.5625] (z toward the viewer); the sand
 * continues beyond it on every side and dissolves into mist at the back. 52 rows run across depth, week 1 at the
 * front: the oldest week is nearest, the calm recent weeks recede. Stones come from content (`principles[].stone`).
 */

export const PLANE = { minX: -1.9, maxX: 1.9, minZ: -1.25, maxZ: 1.6 } as const;
export const DATA = { back: -0.5625, front: 0.5625, rows: 52 } as const;
export const SPACING = (DATA.front - DATA.back) / DATA.rows;
/** Visitor's rake: 5 tines, as wide as five rows. */
export const TINES = 5;
export const RAKE_W = SPACING * TINES;
/** Where the kumiko panel is pressed into the sand (the empty left of the garden, behind the legend) and at what pitch. */
export const IMPRINT = { cx: -1.04, cz: -0.3, pitch: 0.023 } as const;
/** Desktop framing: the camera looks at x = CAM_X and frames ±CAM_HW of plane width at the target; the stones sit in
 *  the right two thirds (asymmetry; the empty sand on the left takes the header, the legend and the imprint). */
export const CAM_X = -0.3;
export const CAM_HW = 1.15;

/** Row waviness amplitude from weekly p99 (DESIGN §6.6): a = 0.15 + 0.85 · clamp((p99 − 140) / 280, 0, 1). */
export function rowAmplitude(p99: number): number {
  return 0.15 + 0.85 * Math.min(1, Math.max(0, (p99 - 140) / 280));
}

/** SEV-1 ring radius around stone 5: r5 + spacing · (2 + 10 · blastPct / 100). */
export function sevRadius(r5: number, blastPct: number): number {
  return r5 + SPACING * (2 + (10 * blastPct) / 100);
}
