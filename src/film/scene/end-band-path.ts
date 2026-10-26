/**
 * Gold すやり霞 tiers of the film's last frame as geometry (owner WP-03; DESIGN §7.1, §7.4 `endBands`).
 * Pure and DOM-free, so the road player / road-works bands (WP-06) can draw DOM/SVG clouds that continue the
 * film exactly: `endBandPath(tier, W, H)` gives an SVG path in a `viewBox="0 0 W H"` that matches the film's
 * last frame (the encoder check in tools/film/verify.mjs rasterises the same edge function).
 *
 * Tier = { y: top edge, h: height, x0, x1: extreme ends (tips included) }, normalised to the frame, y down.
 * Ends taper to a spear tip: at distance d (px) from the nearer end, t = clamp(d / L, 0, 1) with
 * L = min(taper·h·H, (x1 − x0)·W / 2); s = sin(πt/2)^power; the tip sits at y + apex·h and the edges open to
 * the top (y) and bottom (y + h) as s → 1. Colour: plate 8 at 50 % over --paper (`END_GOLD`), flat, no blur.
 */
import spec from './end-bands.json';

export interface EndTier { y: number; h: number; x0: number; x1: number }
export interface SpearProfile { taper: number; apex: number; power: number }

export const END_PROFILE: SpearProfile = { taper: spec.taper, apex: spec.apex, power: spec.power };
/** plate 8 at 50 % over paper — in CSS `color-mix(in srgb, var(--plate-8) 50%, var(--paper))` */
export const END_GOLD: string = spec.color;
export const END_TIERS_LANDSCAPE: readonly EndTier[] = spec.landscape;
export const END_TIERS_PORTRAIT: readonly EndTier[] = spec.portrait;

/** top and bottom edge (px) of a tier at horizontal pixel x, or null outside its ends */
export function tierEdges(b: EndTier, W: number, H: number, x: number, p: SpearProfile = END_PROFILE): [number, number] | null {
  const x0 = b.x0 * W, x1 = b.x1 * W, hp = b.h * H;
  const d = Math.min(x - x0, x1 - x);
  if (d < 0) return null;
  const L = Math.max(1e-6, Math.min(p.taper * hp, (x1 - x0) / 2));
  const s = Math.sin((Math.PI / 2) * Math.min(1, d / L)) ** p.power;
  const ya = b.y * H + p.apex * hp;
  return [ya - p.apex * hp * s, ya + (1 - p.apex) * hp * s];
}

/** SVG path of one tier in a `viewBox="0 0 W H"` (polyline, `n` segments per end; ≤ 0.1 px from the curve at n = 32) */
export function endBandPath(b: EndTier, W: number, H: number, n = 32, p: SpearProfile = END_PROFILE): string {
  const x0 = b.x0 * W, x1 = b.x1 * W, hp = b.h * H;
  const L = Math.max(1e-6, Math.min(p.taper * hp, (x1 - x0) / 2));
  const ya = b.y * H + p.apex * hp;
  const f = (v: number) => (Math.round(v * 100) / 100).toString();
  const top: string[] = [], bot: string[] = [];
  // tapers sampled densely near the tip, where the edge turns fastest
  const ts = Array.from({ length: n + 1 }, (_, i) => (i / n) ** 2);
  for (const t of ts) {           // left end, tip → full height
    const s = Math.sin((Math.PI / 2) * t) ** p.power;
    top.push(`${f(x0 + t * L)},${f(ya - p.apex * hp * s)}`);
    bot.push(`${f(x0 + t * L)},${f(ya + (1 - p.apex) * hp * s)}`);
  }
  const topR: string[] = [], botR: string[] = [];
  for (const t of ts) {           // right end, tip → full height
    const s = Math.sin((Math.PI / 2) * t) ** p.power;
    topR.push(`${f(x1 - t * L)},${f(ya - p.apex * hp * s)}`);
    botR.push(`${f(x1 - t * L)},${f(ya + (1 - p.apex) * hp * s)}`);
  }
  // clockwise: left tip → top edge → right tip → bottom edge → back
  return `M${top.join(' L')} L${topR.reverse().join(' L')} L${botR.slice(1).join(' L')} L${bot.reverse().slice(0, -1).join(' L')} Z`;
}
