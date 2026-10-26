/**
 * Works — state shared by the section module (index.ts) and the lazily loaded view (view.ts). Owner: WP-07.
 * index.ts writes the scroll positions and the layout mode; the view reads them in update() and places the
 * panel labels; both ask the stage for a frame when something changed.
 */
export type WorksMode = 'dolly' | 'list' | 'mobile';

export interface WorksState {
  mode: WorksMode;
  /** run position while the stage is stuck (map.ts) */
  s: number;
  /** works-skills band progress */
  band: number;
  /** panel labels (第一扇 first) and their container */
  labels: HTMLElement[];
  labelBox: HTMLElement | null;
  /** viewport top of the view placeholder (CSS px), kept current by index.ts during the band */
  viewTop: number;
  /** motion enabled (ctx.motion.enabled) */
  motion: boolean;
  /** focused panel index (0 = 第一扇) as the column shows it */
  focus: number;
}

export const worksState: WorksState = {
  mode: 'list',
  s: 0,
  band: 0,
  labels: [],
  labelBox: null,
  viewTop: 0,
  motion: true,
  focus: 0,
};
