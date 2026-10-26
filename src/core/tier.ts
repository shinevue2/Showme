/**
 * Quality tiers (DESIGN §8.6 tier detection, §6 per-view tier counts, §10.1 GPU budgets). Owner: WP-00.
 * `detectTier()` runs at boot (after LCP), before the three chunk loads:
 *   ?tier= / localStorage['hanmoto.tier'] override · Proof or no WebGL2 → static · software rasteriser → software ·
 *   GPU heuristics · reduced motion or Save-Data → counts at most low · coarse pointer + small screen → at most
 *   medium, DPR ≤ 1.5. Tier changes reach views only through `view.setTier()` (uniforms / draw ranges).
 */
import type { Tier, TierAPI, TierCounts, TierName } from './types';
import { probeGL, SOFTWARE_RE, type GLProbe } from '../gl/stage/tier-detect';
import { local } from './storage';

const COUNTS: Record<TierName, TierCounts> = {
  high: {
    carveRes: 1024, blockSegments: 256, sheetSegments: [128, 190], byobuDetail: 2, byobuSegmentsPerPanel: 8,
    kumiko: 12000, sandTrail: 1024, sandDisplace: true, sunago: 24000, sealRes: 512, embossRes: 1024,
    marble: 1536, marbleSpread: true, marbleIds: true, noren: { cols: 14, rows: 24, iters: 6 }, emakiSegments: 900, texMax: 4096,
  },
  medium: {
    carveRes: 768, blockSegments: 128, sheetSegments: [64, 96], byobuDetail: 1, byobuSegmentsPerPanel: 4,
    kumiko: 5000, sandTrail: 512, sandDisplace: false, sunago: 12000, sealRes: 384, embossRes: 768,
    marble: 1024, marbleSpread: true, marbleIds: true, noren: { cols: 10, rows: 18, iters: 4 }, emakiSegments: 600, texMax: 2048,
  },
  low: {
    carveRes: 512, blockSegments: 64, sheetSegments: [32, 48], byobuDetail: 0, byobuSegmentsPerPanel: 2,
    kumiko: 2000, sandTrail: 256, sandDisplace: false, sunago: 4000, sealRes: 256, embossRes: 512,
    marble: 768, marbleSpread: false, marbleIds: false, noren: { cols: 8, rows: 14, iters: 3 }, emakiSegments: 300, texMax: 2048,
  },
  software: {
    carveRes: 0, blockSegments: 0, sheetSegments: [0, 0], byobuDetail: 0, byobuSegmentsPerPanel: 2,
    kumiko: 800, sandTrail: 0, sandDisplace: false, sunago: 0, sealRes: 0, embossRes: 0,
    marble: 512, marbleSpread: false, marbleIds: false, noren: { cols: 6, rows: 10, iters: 2 }, emakiSegments: 0, texMax: 1024,
  },
  static: {
    carveRes: 0, blockSegments: 0, sheetSegments: [0, 0], byobuDetail: 0, byobuSegmentsPerPanel: 2,
    kumiko: 0, sandTrail: 0, sandDisplace: false, sunago: 0, sealRes: 0, embossRes: 0,
    marble: 512, marbleSpread: false, marbleIds: false, noren: { cols: 6, rows: 10, iters: 2 }, emakiSegments: 0, texMax: 1024,
  },
};

type TierBase = Omit<Tier, 'mobile' | 'renderer' | 'caps'>;
export const TIERS: Record<TierName, TierBase> = {
  high:     { name: 'high',     maxDpr: 2,    minDpr: 1,    msaa: true,  post: true,  maxLiveViews: 2, bandExtraView: true,  warmAhead: 1.5, vramBudget: 200e6, counts: COUNTS.high },
  medium:   { name: 'medium',   maxDpr: 1.5,  minDpr: 0.75, msaa: true,  post: false, maxLiveViews: 2, bandExtraView: true,  warmAhead: 1.0, vramBudget: 90e6,  counts: COUNTS.medium },
  low:      { name: 'low',      maxDpr: 1.25, minDpr: 0.75, msaa: true,  post: false, maxLiveViews: 1, bandExtraView: true,  warmAhead: 0.6, vramBudget: 60e6,  counts: COUNTS.low },
  software: { name: 'software', maxDpr: 0.75, minDpr: 0.5,  msaa: false, post: false, maxLiveViews: 1, bandExtraView: false, warmAhead: 0.6, vramBudget: 60e6,  counts: COUNTS.software },
  static:   { name: 'static',   maxDpr: 1,    minDpr: 1,    msaa: false, post: false, maxLiveViews: 0, bandExtraView: false, warmAhead: 0,   vramBudget: 0,     counts: COUNTS.static },
};

export const TIER_ORDER: readonly TierName[] = ['high', 'medium', 'low', 'software', 'static'];
const isTierName = (s: string | null | undefined): s is TierName => !!s && (TIER_ORDER as readonly string[]).includes(s);

export interface DetectInput { proof: boolean; reducedMotion: boolean; saveData: boolean }

function build(name: TierName, probe: GLProbe, mobile: boolean): Tier {
  const base = TIERS[name];
  const maxDpr = mobile ? Math.min(base.maxDpr, 1.5) : base.maxDpr;
  return { ...base, maxDpr, mobile, renderer: probe.renderer, caps: { ...probe.caps } };
}

export function detectTier(input: DetectInput, probe: GLProbe = probeGL()): Tier {
  const coarse = matchMedia('(pointer: coarse)').matches;
  const mobile = coarse && Math.min(screen.width, screen.height) < 900;
  let forced: string | null = null;
  try { forced = new URLSearchParams(location.search).get('tier'); } catch { /* ignore */ }
  if (!isTierName(forced)) {
    const stored = local.get('hanmoto.tier');
    forced = isTierName(stored) ? stored : null;
  }
  if (input.proof || !probe.ok) return build('static', probe, mobile);
  if (isTierName(forced)) return build(forced, probe, mobile);
  const r = probe.renderer;
  if (probe.caveat || SOFTWARE_RE.test(r)) return build('software', probe, mobile);
  const nav = navigator as Navigator & { deviceMemory?: number };
  const mem = nav.deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency ?? 8;
  let s = 2;
  if (/apple m\d|rtx|radeon rx|radeon pro|geforce gtx 1[6-9]|geforce rtx|arc a\d/.test(r)) s = 3;
  if (/intel.*(hd|uhd) graphics|mali-[gt]\d{2}\b|adreno.*\b[3-5]\d\d\b|powervr/.test(r)) s = 1;
  if (r === 'apple gpu') s = mobile ? 2 : 3;
  if (mem <= 4 || cores <= 4) s = Math.min(s, 2);
  if (mem <= 2) s = 1;
  if (mobile) s = Math.min(s, 2);
  if (input.reducedMotion || input.saveData) s = Math.min(s, 1);
  const name: TierName = s >= 3 ? 'high' : s === 2 ? 'medium' : 'low';
  return build(name, probe, mobile);
}

export function lowerTier(name: TierName): TierName {
  const i = TIER_ORDER.indexOf(name);
  return TIER_ORDER[Math.min(i + 1, TIER_ORDER.indexOf('software'))]!;
}

export interface TierImpl extends TierAPI {
  readonly probe: GLProbe;
}

export function createTierAPI(initial: Tier, probe: GLProbe): TierImpl {
  let current = initial;
  const listeners = new Set<(t: Tier) => void>();
  return {
    probe,
    get current() { return current; },
    on(cb) { listeners.add(cb); return () => listeners.delete(cb); },
    force(name: TierName) {
      if (!isTierName(name) || name === current.name) return;
      current = build(name, probe, current.mobile);
      for (const cb of listeners) { try { cb(current); } catch (e) { console.error(e); } }
    },
  };
}
