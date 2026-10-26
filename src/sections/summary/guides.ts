/**
 * Hokusai guide data (DESIGN §6.2, §12 asset 21). Owner: WP-05. Node-safe (used by render.ts and index.ts).
 *
 * Traced by WP-05 on `hokusai/manga-perspective.jpg` (2000 × 1528, Hokusai Manga vol. 3, perspective double page) in
 * normalised image coordinates (x → right, y ↓, 0..1):
 *   - left page: the street drawn on the vanishing-point method — the wall's courses (14 lines from the left frame)
 *     meet at VP (the vanishing point on the horizon, x 345, y 662 px), the horizon, and the house's receding edges;
 *   - right page: 三ツワリの法 (the "three-part rule") — the frame, the two horizontals that split it into ceiling
 *     (天), back wall and floor (地), and the four room-box diagonals; their crossings are the "intersect" marks.
 * `order` is the compass-and-ruler draw order (引く): horizon → courses → house → frame → horizontals → diagonals.
 */

export const IMG_W = 2000;
export const IMG_H = 1528;
type P = readonly [number, number];
const n = (x: number, y: number): P => [x / IMG_W, y / IMG_H];

/** The street's vanishing point (left page). */
export const VP: P = n(345, 662);
/** Where the floor diagonals of the room box converge (right page). */
export const VP2: P = n(1467, 569);

export interface GuideLine { from: P; to: P; order: number }

const frameX = 88;
const courses: GuideLine[] = Array.from({ length: 14 }, (_, i) => {
  const y = 278 + (i / 13) * (842 - 278);
  return { from: n(frameX, y), to: VP, order: 1 + i * 0.12 };
});

export const GUIDES: readonly GuideLine[] = [
  { from: n(88, 662), to: n(905, 662), order: 0 },                 // horizon through VP
  ...courses,
  { from: n(828, 806), to: VP, order: 2.8 },                       // house: plinth edge
  { from: n(548, 700), to: VP, order: 2.9 },                       // house: sill
  { from: n(612, 346), to: VP, order: 3.0 },                       // house: eave
  { from: n(1045, 266), to: n(1860, 266), order: 3.6 },            // room box: frame top
  { from: n(1047, 845), to: n(1858, 845), order: 3.7 },            // frame bottom
  { from: n(1045, 466), to: n(1860, 466), order: 4.0 },            // 天 / wall
  { from: n(1047, 657), to: n(1858, 657), order: 4.1 },            // wall / 地
  { from: n(1050, 268), to: n(1335, 657), order: 4.6 },            // diagonals
  { from: n(1855, 268), to: n(1592, 657), order: 4.7 },
  { from: n(1335, 657), to: n(1055, 843), order: 4.8 },
  { from: n(1592, 657), to: n(1855, 843), order: 4.9 },
];

/** "intersect" smart-guide marks (Illustrator's label) and the vanishing point (「消点」). */
export const MARKS: readonly { at: P; kind: 'vp' | 'intersect'; order: number }[] = [
  { at: VP, kind: 'vp', order: 2.4 },
  { at: n(1195, 466), kind: 'intersect', order: 5.0 },
  { at: n(1710, 466), kind: 'intersect', order: 5.1 },
  { at: n(1335, 657), kind: 'intersect', order: 5.2 },
  { at: n(1592, 657), kind: 'intersect', order: 5.3 },
];

/** Directions of the wall courses away from VP (unit vectors in image px), for the summary-road match cut. */
export function courseDirections(): [number, number][] {
  const out: [number, number][] = [];
  for (const g of GUIDES) {
    if (g.to !== VP) continue;
    const dx = (g.from[0] - VP[0]) * IMG_W, dy = (g.from[1] - VP[1]) * IMG_H;
    const l = Math.hypot(dx, dy) || 1;
    out.push([dx / l, dy / l]);
  }
  return out;
}
