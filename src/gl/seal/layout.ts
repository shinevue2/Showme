/**
 * Seal-face layout (DESIGN §6.7, §6.10). Owner: WP-09. Pure and Node-safe (no DOM, no three): shared by the
 * seal module (canvas faces for the carve and the impression) and by achievements/render.ts (SVG impressions
 * for the static tier), so the 3D impression and its fallback read the same.
 *
 * Text is set the way seal engravers set it: CJK in columns read right → left, each character stretched to fill
 * its cell (印文 fill the face); Latin as one line, or a figure over a small unit line ("7 / MIN").
 * Boxes are in the unit square (x right, y down).
 */
export interface SealBox { text: string; x: number; y: number; w: number; h: number; latin: boolean }

export const SEAL_BORDER = { inset: 0.045, width: 0.075 } as const;

const CJK = /[　-鿿豈-﫿]/;

export function sealLayout(text: string, style: 'shubun' | 'hakubun'): SealBox[] {
  const t = text.trim();
  const m = style === 'shubun' ? SEAL_BORDER.inset + SEAL_BORDER.width + 0.05 : 0.11;
  const W = 1 - 2 * m;
  if (CJK.test(t)) {
    const ch = [...t.replace(/\s+/g, '')];
    const g = 0.035;
    const box = (text: string, x: number, y: number, w: number, h: number): SealBox => ({ text, x, y, w, h, latin: false });
    if (ch.length === 1) return [box(ch[0]!, m, m, W, W)];
    const colW = (W - g) / 2;
    const right = m + colW + g;
    if (ch.length === 2) return [box(ch[0]!, right, m, colW, W), box(ch[1]!, m, m, colW, W)];
    const rowH = (W - g) / 2;
    if (ch.length === 3) {
      return [box(ch[0]!, right, m, colW, W), box(ch[1]!, m, m, colW, rowH), box(ch[2]!, m, m + rowH + g, colW, rowH)];
    }
    // 4+: two columns, right first, top → bottom
    const rows = Math.ceil(ch.length / 2);
    const rh = (W - g * (rows - 1)) / rows;
    return ch.map((c, i) => box(c, i < rows ? right : m, m + (i % rows) * (rh + g), colW, rh));
  }
  const parts = t.split(/\s+/);
  if (parts.length >= 2) {
    const big = parts[0]!, small = parts.slice(1).join(' ').toUpperCase();
    return [
      { text: big, x: m + W * 0.08, y: m + W * 0.02, w: W * 0.84, h: W * 0.56, latin: true },
      { text: small, x: m + W * 0.12, y: m + W * 0.7, w: W * 0.76, h: W * 0.24, latin: true },
    ];
  }
  return [{ text: t, x: m, y: m + W * 0.24, w: W, h: W * 0.5, latin: true }];
}

/** Seeded chips along the face edge (positions 0..1 along the perimeter, sizes in face units). */
export function sealChips(seed: number, n = 7): { at: number; r: number }[] {
  let s = (seed >>> 0) || 1;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  return Array.from({ length: n }, () => ({ at: rnd(), r: 0.012 + rnd() * 0.03 }));
}

/** Point on the square's perimeter (0..1 → clockwise from the top-left corner), inset by `inset`. */
export function perimeterPoint(at: number, inset: number): [number, number] {
  const L = 1 - 2 * inset;
  const d = (((at % 1) + 1) % 1) * 4;
  const k = d % 1;
  if (d < 1) return [inset + k * L, inset];
  if (d < 2) return [1 - inset, inset + k * L];
  if (d < 3) return [1 - inset - k * L, 1 - inset];
  return [inset, 1 - inset - k * L];
}
