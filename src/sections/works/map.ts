/**
 * Works scroll map (DESIGN §6.4 "Scroll map", §2.2 works-skills). Owner: WP-07. Pure and Node-safe: the
 * render module uses it for the hold anchors, the section module and the view for everything that moves.
 *
 *   s ∈ [0, 1]  the run while the stage is stuck (120 vh): 0–0.22 unfold (uFold 1.45 → 0.45),
 *               0.22–0.95 the camera dollies right → left from 第一扇 to 第六扇 with a hold LUT
 *               (40 % of every panel's slot is a hold), 0.95–1 rests on 第六扇.
 *   p ∈ [0, 1]  the works-skills band: the screen folds half shut and turns 180° about its vertical axis,
 *               showing its 下地骨 lattice; it fades as skills-kumiko takes over (from p = 0.4).
 */

export const FOLD_CLOSED = 1.45;
export const FOLD_OPEN = 0.45;
export const FOLD_HALF = 0.92;
/** Fold at the middle of the turn: almost a closed stack while it stands edge-on. */
export const FOLD_STACK = 1.32;
export const UNFOLD_END = 0.22;
export const DOLLY_END = 0.95;
export const PANELS = 6;
/** Panel ratio 1 : 2.75 (aesth §3.3). World units: a panel is 1 wide. */
export const PANEL_W = 1;
export const PANEL_H = 2.75;
/** Run length in vh (the stuck travel used for s); the band adds 25 vh after it. */
export const RUN_VH = 120;
/** Hold fraction of each panel's slot. */
export const HOLD = 0.4;

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);
export const smooth = (x: number): number => { const t = clamp01(x); return t * t * (3 - 2 * t); };
/** 序破急-flavoured ease for the unfold: slow start, decisive middle, soft landing. */
export const easeJo = (x: number): number => { const t = clamp01(x); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };

/** Hinge angle of the zig-zag for the run position s. */
export function foldAt(s: number): number {
  return FOLD_CLOSED + (FOLD_OPEN - FOLD_CLOSED) * easeJo(s / UNFOLD_END);
}

/**
 * Focused panel as a continuous index 0..5 (0 = 第一扇, the rightmost). Each panel owns a slot of
 * (DOLLY_END − UNFOLD_END) / 6; inside it the camera holds for HOLD of the slot, centred, and travels
 * between holds with a smoothstep. The first and last panels also hold through the slot edges.
 */
export function focusAt(s: number): number {
  const u = clamp01((s - UNFOLD_END) / (DOLLY_END - UNFOLD_END)) * PANELS;   // 0..6
  const half = (1 - HOLD) / 2;                                               // travel half-width in slot units
  // the hold of slot k spans [k + half, k + 1 - half]; the travel k → k+1 spans [k + 1 - half, k + 1 + half]
  const k = Math.floor(u - 0.5);
  if (k < 0) return 0;
  if (k >= PANELS - 1) return PANELS - 1;
  const a = k + 1 - half;            // travel start (end of hold k)
  const t = (u - a) / (2 * half);
  return k + smooth(t);
}

/** Integer panel index in focus (0 = 第一扇). */
export function focusIndex(s: number): number {
  return Math.max(0, Math.min(PANELS - 1, Math.round(focusAt(s))));
}

/** Run position at the centre of panel k's hold (keyboard jumps, deep links). */
export function holdS(k: number): number {
  const u = Math.max(0, Math.min(PANELS - 1, k)) + 0.5;
  const s = UNFOLD_END + (u / PANELS) * (DOLLY_END - UNFOLD_END);
  return k <= 0 ? Math.max(s, UNFOLD_END + 0.02) : s;
}

/** Turn progress (0..1) inside the works-skills band. */
export function turnAt(p: number): number {
  return smooth(p / 0.32);
}

/** Screen opacity inside the band: the gold-and-lattice screen hands over to skills-kumiko. */
export function fadeAt(p: number): number {
  return 1 - smooth((p - 0.38) / 0.24);
}

/** Lattice pitch of the 下地骨 (DESIGN §2.2): panel width / 6, in world units. */
export const LATTICE_PITCH = PANEL_W / 6;
