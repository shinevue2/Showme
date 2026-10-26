/**
 * Tier selection for the film (DESIGN §7.6, video §5.4). Owner: WP-06.
 *   static    reduced motion / Motion layer off / Proof → stills in flow (CSS layout; no player)
 *   stills    Save-Data, 2G, decodingInfo unsupported, any failure → sticky stage, 7 crossfading stills
 *   webcodecs iOS muted play() rejected (Low Power Mode) with VideoDecoder → canvas scrubber (mediabunny)
 *   video     portrait / SD / HD file in a paused <video>, scrubbed by ScrollFilm
 * Software-GL visitors still get video (decoding is not GL). Debug override: ?film=static|stills|webcodecs|sd|hd|portrait.
 */
import type { FilmManifest, FilmVariant } from '../../core/types';

export type FilmTier = 'static' | 'stills' | 'webcodecs' | 'video';
export type VariantKey = 'hd' | 'sd' | 'portrait';

export interface Plan {
  tier: FilmTier;
  variant: VariantKey | null;
  v: FilmVariant | null;
  /** iOS/iPadOS: run the play()/pause() unlock probe after loadeddata */
  needsIosProbe: boolean;
  /** idle prefetch allowed (fast connection, or a fine pointer where NetworkInformation is missing) */
  prefetch: boolean;
  /** why this tier (Info panel / debug) */
  reason: string;
  forced: boolean;
}

interface Conn { saveData?: boolean; effectiveType?: string }
type Nav = Navigator & { connection?: Conn; deviceMemory?: number };

export const PORTRAIT_MQ = '(max-aspect-ratio: 4/5)';

const FORCE = ['static', 'stills', 'webcodecs', 'sd', 'hd', 'portrait'] as const;
type Force = (typeof FORCE)[number];

export function forcedFilm(): Force | null {
  try {
    const f = new URLSearchParams(location.search).get('film');
    return f && (FORCE as readonly string[]).includes(f) ? (f as Force) : null;
  } catch { return null; }
}

export function isIOS(): boolean {
  const ua = navigator.userAgent;
  return /iP(hone|od|ad)/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

/** The variant the current viewport and device call for (no network/capability gate). */
export function preferredVariant(): VariantKey {
  if (matchMedia(PORTRAIT_MQ).matches) return 'portrait';
  const nav = navigator as Nav;
  const c = nav.connection;
  const lowEnd = (nav.deviceMemory ?? 8) <= 4 || (navigator.hardwareConcurrency ?? 8) <= 4 || c?.effectiveType === '3g';
  return lowEnd ? 'sd' : 'hd';
}

export async function choosePlan(film: FilmManifest, opts: { motion: boolean; proof: boolean }): Promise<Plan> {
  const nav = navigator as Nav;
  const c = nav.connection;
  const prefetch = c ? c.effectiveType === '4g' && !c.saveData : matchMedia('(pointer: fine)').matches;
  const base = { needsIosProbe: false, prefetch, forced: false };
  const stills = (reason: string, forced = false): Plan => ({ ...base, tier: 'stills', variant: null, v: null, reason, forced });
  const force = forcedFilm();

  if (force === 'static' || opts.proof || !opts.motion) {
    return { ...base, tier: 'static', variant: null, v: null, reason: force === 'static' ? 'forced' : opts.proof ? 'proof' : 'motion off', forced: force === 'static' };
  }
  if (force === 'stills') return stills('forced', true);
  if (!force && (c?.saveData || /(^|-)2g$/.test(c?.effectiveType ?? ''))) return stills(c?.saveData ? 'save-data' : '2g');

  let key: VariantKey;
  if (force === 'sd' || force === 'hd' || force === 'portrait') key = force;
  else key = preferredVariant();
  let v = film.variants[key];

  if (!force) {
    // sanity gate, not a codec picker (decodingInfo is optimistic until the UA has stats)
    try {
      const r = await navigator.mediaCapabilities.decodingInfo({
        type: 'file',
        video: { contentType: 'video/mp4; codecs="avc1.640028"', width: v.w, height: v.h, bitrate: Math.round((v.bytes * 8) / film.duration), framerate: v.fps },
      });
      if (!r.supported) return stills('decodingInfo unsupported');
      if (!r.smooth && key === 'hd') { key = 'sd'; v = film.variants.sd; }
    } catch { /* older UA: keep the choice */ }
  }

  if (force === 'webcodecs') {
    return { ...base, tier: 'webcodecs', variant: key, v, reason: 'forced', forced: true };
  }
  return { ...base, tier: 'video', variant: key, v, needsIosProbe: isIOS(), reason: force ? 'forced' : key, forced: !!force };
}
