/**
 * AppContext (DESIGN §8.5). Owner: WP-00. Built once at boot (after first paint); passed to the chrome,
 * every SectionModule.mount() and every ViewFactory.
 */
import type { AppContext, Lang, PageKind, StageAPI, Tier } from './types';
import type { CaseId, Content, ImagesIndex, ManifestEntry } from '../content/types';
import { createTheme } from './theme';
import { createMotion, type MotionImpl } from './motion';
import { createScroll, type ScrollImplType } from './scroll';
import { createI18n } from './i18n';
import { createPrintState } from './print-state';
import { createChromeBridge, type ChromeBridge } from './chrome-bridge';
import { createAssets } from './assets';
import { createPerf } from './perf';
import { resolveSeed } from './seed';
import { createTierAPI, TIERS, type TierImpl } from './tier';
import type { GLProbe } from '../gl/stage/tier-detect';

export interface ContextInternals {
  ctx: AppContext;
  motion: MotionImpl;
  scroll: ScrollImplType;
  chrome: ChromeBridge;
  /** Resolves the getStage() promise (boot calls it after tier detection and the stage import). */
  resolveStage(stage: StageAPI | null): void;
  /** Installs the detected tier (boot calls it after LCP). */
  setTier(t: Tier, probe: GLProbe): void;
  readonly stagePromise: Promise<StageAPI | null>;
}

export interface ContentBundle { content: Content; manifest: readonly ManifestEntry[]; images: ImagesIndex }

export function createContext(bundle: ContentBundle): ContextInternals {
  const { content, manifest, images } = bundle;
  const root = document.documentElement;
  const page = (root.dataset.page as PageKind) || 'main';
  const lang = (root.dataset.lang as Lang) || 'ja';
  const caseId = root.dataset.case as CaseId | undefined;
  const proof = root.hasAttribute('data-proof');
  const seed = resolveSeed();

  const motion = createMotion(seed);
  const theme = createTheme({ animate: () => motion.enabled });
  const scroll = createScroll();
  const chrome = createChromeBridge();
  const print = createPrintState(seed);
  const assets = createAssets(manifest, images);
  const perf = createPerf();

  // A provisional static tier until detection runs after LCP (§8.8 step 4).
  const noProbe: GLProbe = { ok: false, caveat: false, renderer: '', caps: { floatRT: false, floatLinear: false, parallelCompile: false, maxTexture: 0 } };
  let tierApi: TierImpl = createTierAPI({ ...TIERS.static, mobile: false, renderer: '', caps: noProbe.caps }, noProbe);
  const tierListeners = new Set<(t: Tier) => void>();
  let tierUnsub: (() => void) | null = null;
  const tierProxy: TierImpl = {
    get probe() { return tierApi.probe; },
    get current() { return tierApi.current; },
    on(cb) { tierListeners.add(cb); return () => tierListeners.delete(cb); },
    force(name) { tierApi.force(name); },
  };

  let resolveStage!: (s: StageAPI | null) => void;
  const stagePromise = new Promise<StageAPI | null>((r) => { resolveStage = r; });

  const i18n = createI18n({ lang, page, caseId, scroll: () => scroll, chrome: () => chrome });

  const ctx: AppContext = {
    page, lang, content, proof,
    theme, motion, tier: tierProxy, scroll, i18n, print, chrome, assets, perf,
    getStage: () => stagePromise,
  };

  return {
    ctx, motion, scroll, chrome,
    resolveStage: (s) => resolveStage(s),
    stagePromise,
    setTier(t: Tier, probe: GLProbe) {
      tierUnsub?.();
      tierApi = createTierAPI(t, probe);
      tierUnsub = tierApi.on((nt) => { root.dataset.tier = nt.name; for (const cb of tierListeners) cb(nt); });
      root.dataset.tier = t.name;
      for (const cb of tierListeners) cb(t);
    },
  };
}
