/**
 * Road — the gold すやり霞 of the road-works band (DESIGN §2.2, §7.4 `endBands`). Owner: WP-06. Node-safe.
 *
 * The film ends on three gold clouds (seven tiers; WP-03 `src/film/scene/end-band-path.ts`). The band draws
 * the same clouds as DOM SVG in a layer the size of the film stage, so at band progress 0 they lie exactly on
 * the film's last frame; each cloud is its own <svg> so its scroll-driven `translate` stays on the compositor.
 * Tiers that overlap vertically form one cloud: 1–2 (upper), 3–5 (middle), 6–7 (lower).
 */
import { endBandPath, type EndTier } from '../../film/scene/end-band-path';

const GROUPS: readonly (readonly number[])[] = [[0, 1], [2, 3, 4], [5, 6]];
const NAMES = ['a', 'b', 'c'] as const;

/**
 * In the film the washi grain overlay lies on the gold too, so each DOM cloud carries the same fibre tile as an
 * SVG pattern over its fill (≈ 512 CSS px at a 1.25 slice scale, the 1440 × 900 case), moving with the cloud.
 */
function cloudSet(tiers: readonly EndTier[], W: number, H: number, cls: 'l' | 'p', washi: string): string {
  const tile = 410;
  return GROUPS.map((g, k) => {
    const id = `road-washi-${cls}${NAMES[k]}`;
    const d = g.map((i) => tiers[i]).filter((t): t is EndTier => !!t).map((t) => endBandPath(t, W, H)).join(' ');
    return `<svg class="road-cloud road-cloud--${cls} road-cloud--${NAMES[k]}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" focusable="false" data-plate="8">` +
      `<defs><pattern id="${id}" patternUnits="userSpaceOnUse" width="${tile}" height="${tile}"><image vite-ignore href="${washi}" width="${tile}" height="${tile}"/></pattern></defs>` +
      `<path class="road-cloud__gold" d="${d}"/><path d="${d}" fill="url(#${id})"/></svg>`;
  }).join('');
}

/**
 * The cloud layer: landscape set (16 : 9, film-hd geometry) and portrait set (9 : 16), switched by the same
 * media query that picks the film variant. Variants of one aspect share the geometry (normalised tiers).
 */
export function cloudsHtml(landscape: readonly EndTier[], portrait: readonly EndTier[], washiUrl: string): string {
  return `<div class="road-clouds plate-layer" data-plate="8" aria-hidden="true">` +
    cloudSet(landscape, 1280, 720, 'l', washiUrl) + cloudSet(portrait, 720, 1280, 'p', washiUrl) +
    `</div>`;
}
