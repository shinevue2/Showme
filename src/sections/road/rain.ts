/**
 * Road — the white rain of Shōno (DESIGN §6.3, §7.5): two pattern layers of thin straight strokes falling at 75°
 * (top right → bottom left, as Hiroshige cut them), 主版 紺 (plate 1) and 鈍 (plate 7). Owner: WP-06. Node-safe.
 *
 * Each layer is one <svg> filled with a rotated pattern; the stylesheet translates the <svg> element by exactly
 * one pattern period along the fall line in 0.9 s (a compositor-only loop), so the strokes fall seamlessly.
 * Period vector on screen for a tile of height H rotated by 15°: (−H·sin 15°, H·cos 15°).
 */

interface RainLayer { id: string; w: number; h: number; n: number; len: [number, number]; plate: 1 | 7; seed: number }

const LAYERS: readonly RainLayer[] = [
  { id: 'a', w: 46, h: 300, n: 5, len: [40, 110], plate: 7, seed: 7 },     // far rain, grey, slower
  { id: 'b', w: 70, h: 440, n: 5, len: [70, 180], plate: 1, seed: 19 },    // near rain, indigo, faster
];

/** mulberry32 — deterministic stroke placement (the same rain in every build). */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function strokes(l: RainLayer): string {
  const r = rng(l.seed);
  const d: string[] = [];
  for (let i = 0; i < l.n; i++) {
    const x = Math.round(((i + 0.15 + r() * 0.7) / l.n) * l.w * 10) / 10;
    const y = Math.round(r() * l.h);
    const len = Math.round(l.len[0] + r() * (l.len[1] - l.len[0]));
    d.push(`M${x} ${y}v${len}`);
    if (y + len > l.h) d.push(`M${x} ${y - l.h}v${len}`);   // wrap so the tile repeats seamlessly
  }
  return d.join('');
}

/** Rain layers; `prefix` keeps pattern ids unique when the static tier draws its own copy. */
export function rainHtml(prefix: string, cls: string): string {
  return LAYERS.map((l) => {
    const id = `${prefix}-${l.id}`;
    return `<svg class="${cls} ${cls}--${l.id}" data-plate="${l.plate}" focusable="false" aria-hidden="true">` +
      `<defs><pattern id="${id}" width="${l.w}" height="${l.h}" patternUnits="userSpaceOnUse" patternTransform="rotate(15)">` +
      `<path d="${strokes(l)}" stroke="currentColor" stroke-width="1" fill="none"/></pattern></defs>` +
      `<rect width="100%" height="100%" fill="url(#${id})"/></svg>`;
  }).join('');
}

/** Screen-space period of each layer (px), for the stylesheet's loop (kept in sync by a test in index.ts dev). */
export const RAIN_PERIODS = LAYERS.map((l) => ({
  id: l.id,
  dx: -l.h * Math.sin(Math.PI / 12),
  dy: l.h * Math.cos(Math.PI / 12),
  h: l.h,
}));
