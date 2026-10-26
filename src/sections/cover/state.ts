/**
 * Shared cover state (index.ts ↔ view.ts). Owner: WP-05. Lives in the cover module chunk; the lazily imported view
 * reads the same instance.
 */
export type CoverMode = 'gl' | 'css' | 'still';

export const coverState = {
  /** Arrived via the language wheel (sessionStorage hanmoto.langSwitched, consumed at mount): re-carve + sort drop. */
  langSwitched: false,
  /** Resolves once the §5.6 sort drop has finished (or immediately when it does not run). */
  sortDone: Promise.resolve() as Promise<void>,
  /** The corner hint (§6.1): set by index.ts 2 s after the swap; cleared for good once scrolling starts. */
  hint: false,
  /** Poster capture (?poster=cover-block): the view renders the bare carved block under raking light. */
  capture: false,
  /** Set by the view: ask the stage for a frame (hint start). */
  wake: null as null | (() => void),
  /** Called by the view after its first frame (the canvas sheet is ready to stand in for the DOM sheet). */
  onReady: null as null | (() => void),
  /** Called by the view right after the frame in which the canvas sheet replaced the DOM sheet. */
  onSwap: null as null | (() => void),
};
