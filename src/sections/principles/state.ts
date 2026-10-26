/**
 * Principles — state shared by the section module (index.ts) and the lazily loaded view (view.ts). Owner: WP-08.
 */
export interface GardenState {
  /** 'd' desktop framing (stones in the right two thirds), 'm' phone framing */
  layout: 'd' | 'm';
  /** imprint: shown (the visitor came down from Skills or is above the sweep) and the rake line 0 → 1 */
  stamp: number;
  sweep: number;
  /** principles-achievements band: camera tilts up 12°, sand darkens 6 % */
  tilt: number;
  /** stuck progress through the section (a slow dolly) */
  drift: number;
  /** skills-principles band 0..1 (publish the imprint position while it runs) */
  press: number;
  motion: boolean;
  /** touch raking enabled by the rake toggle */
  raking: boolean;
  /** fraction of the placeholder's height (from the bottom) the sand is framed into: desktop 0.72 (72 of 100 lvh,
   *  the mist and the sky above), 1 in flow */
  frameFrac: number;
  /** the view placeholder's viewport rect (CSS px), measured by index.ts with the scroll */
  slot: { x: number; y: number; w: number; h: number };
  /** projected stone tops in viewport px (written by the view when the camera moves) */
  onStones: ((pts: { x: number; y: number }[]) => void) | null;
}

export const gardenState: GardenState = {
  layout: 'd', frameFrac: 1, stamp: 1, sweep: 0, tilt: 0, drift: 0, press: 0, motion: true, raking: false,
  slot: { x: 0, y: 0, w: 1, h: 1 }, onStones: null,
};
