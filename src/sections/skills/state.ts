/**
 * Skills — state shared by the section module (index.ts) and the lazily loaded view (view.ts). Owner: WP-08.
 * index.ts measures and writes; the view reads in update(). Rects are viewport CSS px, read together in one scroll
 * handler (after which the stage re-measures its placeholder), so the view's projection and the stage's scissor
 * always agree.
 */
export interface Rect { x: number; y: number; w: number; h: number }

export interface SkillsState {
  /** 'd' 3 × 2 desktop/tablet shoji, 'm' 2 × 3 phone shoji */
  layout: 'd' | 'm';
  /** the shoji frame box (home of the lattice) */
  frame: Rect;
  /** the view placeholder (equals frame, or reaches up/down during the two bands) */
  slot: Rect;
  /** the exploded square lattice travels from the byōbu to the frame (0 → 1), then assembles in place */
  group: number;
  /** assembly 0 (exploded square lattice) → 1 (assembled) */
  assembly: number;
  /** strip opacity (fades in during works-skills) */
  alpha: number;
  /** diagram 0 → 1 (scroll-driven or toggled) */
  diagram: number;
  /** the DOM SVG diagram's opacity once the shadow has resolved: the strips drop to 30 % under it */
  dim: number;
  /** works-skills hand-off: the byōbu centre (viewport px) and lattice pitch (px), when published */
  from: { cx: number; cy: number; pitch: number; live: boolean };
  /** skills-principles band 0..1 (tilt to top-down, lower onto the garden's imprint — `gardenHandoff` — and fade) */
  press: number;
  /** hovered tool index (−1 none) */
  hover: number;
  /** pointer in viewport px (null = elsewhere) — parallax of the eye */
  pointer: { x: number; y: number } | null;
  motion: boolean;
  /** bumps whenever something above changed (the view compares it to request a frame) */
  rev: number;
}

export const skillsState: SkillsState = {
  layout: 'd',
  frame: { x: 0, y: 0, w: 1, h: 1 },
  slot: { x: 0, y: 0, w: 1, h: 1 },
  group: 1,
  assembly: 1,
  alpha: 1,
  diagram: 0,
  dim: 0,
  from: { cx: 0, cy: 0, pitch: 0, live: false },
  press: 0,
  hover: -1,
  pointer: null,
  motion: true,
  rev: 0,
};

/** Garden → kumiko: where the lattice imprint lies on screen, viewport px (written by the principles view each frame
 *  of the skills-principles band; it requests a frame when the value moves, the kumiko view reads it in update()). */
export const gardenHandoff = { cx: 0, cy: 0, pitch: 0, live: false };
