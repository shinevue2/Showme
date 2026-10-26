/**
 * Film chapters → media time (DESIGN §7.1, video §4.2). Owner: WP-06.
 * Each chapter owns 1/7 of the scroll span; for the first `hold` of it the film rests on the chapter's rest
 * frame (a forced IDR in every encode), then travels to the next rest with a smoothstep. The last chapter
 * travels to the final frame (the gold clouds). Precomputed into a lookup table, so the scroll path is one
 * array read.
 */

export interface FilmChapter { readonly n: number; readonly rest: number; readonly hold: number }

export const smoothstep = (x: number): number => x * x * (3 - 2 * x);

/** p ∈ [0, 1] → media time (s), `size + 1` entries. The end is the centre of the last frame. */
export function buildTimeLut(ch: readonly FilmChapter[], duration: number, fps: number, size = 2048): Float32Array {
  const lut = new Float32Array(size + 1);
  const n = ch.length;
  const end = duration - 1 / fps;
  for (let k = 0; k <= size; k++) {
    const x = Math.min((k / size) * n, n - 1e-6);
    const i = Math.floor(x);
    const u = x - i;
    const a = ch[i]!.rest;
    const b = i + 1 < n ? ch[i + 1]!.rest : end;
    const h = ch[i]!.hold;
    lut[k] = a + (b - a) * (u <= h ? 0 : smoothstep((u - h) / (1 - h)));
  }
  return lut;
}

/** Media time at progress p from a LUT. */
export function timeAt(lut: Float32Array, p: number): number {
  const k = Math.round(Math.min(1, Math.max(0, p)) * (lut.length - 1));
  return lut[k]!;
}

/** Chapter number (1-based) whose span contains p. */
export function chapterAt(p: number, count: number): number {
  return Math.min(count, Math.max(1, Math.floor(p * count) + 1));
}

/**
 * Frame index of a media time: rest times are exact frames (round(rest × fps), WP-03), so rounding is right;
 * seeks then target the frame centre (f + 0.5) / fps so float error can never land on f − 1.
 */
export function frameOf(t: number, fps: number, frames: number): number {
  return Math.min(frames - 1, Math.max(0, Math.round(t * fps)));
}
