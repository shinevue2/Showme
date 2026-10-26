/**
 * Debug API (DESIGN §8.6): window.__hanmoto = { stage, views, tier, forceTier(name), loseContext(),
 * restoreContext(), seed, replay(ops), film: { plan, seeks }, print, version } + the greeting 「見当よし。」.
 * Sections register extra hooks through `debugHooks` (e.g. WP-10 sets `debugHooks.replay`, WP-06 fills
 * `debugFilm.plan` / pushes to `debugFilm.seeks`). Owner: WP-00.
 */
import type { AppContext, MarbleOp, StageAPI, TierName, View } from './types';
import { frame } from './frame';

export const debugHooks: { replay?: (ops: readonly MarbleOp[]) => void; views?: () => readonly View[] } = {};
export const debugFilm: { plan: unknown; seeks: number[] } = { plan: null, seeks: [] };

export interface HanmotoDebug {
  readonly stage: StageAPI | null;
  readonly views: readonly View[];
  readonly tier: TierName;
  forceTier(name: TierName): void;
  loseContext(): void;
  restoreContext(): void;
  readonly seed: number;
  replay(ops: readonly MarbleOp[]): void;
  film: typeof debugFilm;
  readonly print: AppContext['print'];
  readonly version: string;
  /** extras (not in the spec list): the context, the clock, poster readiness */
  readonly ctx: AppContext;
  readonly frame: typeof frame;
  stageReady: Promise<StageAPI | null>;
  poster?: { id: string; ready: Promise<boolean> };
}

declare global {
  interface Window { __hanmoto?: HanmotoDebug }
}

export function installDebug(ctx: AppContext, stageRef: { current: StageAPI | null }, stageReady: Promise<StageAPI | null>): HanmotoDebug {
  const api: HanmotoDebug = {
    get stage() { return stageRef.current; },
    get views() { return debugHooks.views?.() ?? []; },
    get tier() { return ctx.tier.current.name; },
    forceTier(name: TierName) { ctx.tier.force(name); },
    loseContext() { stageRef.current?.loseContext(); },
    restoreContext() { stageRef.current?.restoreContext(); },
    get seed() { return ctx.print.seed; },
    replay(ops) { debugHooks.replay ? debugHooks.replay(ops) : console.info('[hanmoto] replay: writing view not mounted'); },
    film: debugFilm,
    get print() { return ctx.print; },
    version: typeof __HANMOTO_VERSION__ === 'string' ? __HANMOTO_VERSION__ : '0.0.0',
    ctx,
    frame,
    stageReady,
  };
  window.__hanmoto = api;
  console.info('%c見当よし。', 'font-family: "Shippori Mincho B1", serif; font-size: 14px; color: #0F2540');
  return api;
}
