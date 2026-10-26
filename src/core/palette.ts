/**
 * Palette lookup (DESIGN §3.1, §4.1 selection boxes: "colour → nearest token name/source"). Owner: WP-00.
 * Generated from src/styles/tokens.css (both themes); names/sources from the token comments
 * (NC = nipponcolors.com, WD = 和色大辞典, "sampled …" = measured from a print in the manifest).
 */
export interface PaletteEntry { token: string; hex: string; name: string; source: string; theme: 'day' | 'night' }

export const PALETTE: readonly PaletteEntry[] = [
  { token: "--pasteboard", hex: "#C1E4E9", name: "白藍", source: "WD", theme: "day" },
  { token: "--paper", hex: "#F7FCFE", name: "卯の花", source: "WD", theme: "day" },
  { token: "--paper-print", hex: "#FFFFFB", name: "胡粉", source: "NC", theme: "day" },
  { token: "--panel", hex: "#EBF6F7", name: "藍白", source: "WD", theme: "day" },
  { token: "--mat", hex: "#EBF6F7", name: "藍白", source: "WD", theme: "day" },
  { token: "--ink", hex: "#0F2540", name: "紺", source: "NC", theme: "day" },
  { token: "--ink-2", hex: "#566C73", name: "藍鼠", source: "NC", theme: "day" },
  { token: "--link", hex: "#006284", name: "縹", source: "NC", theme: "day" },
  { token: "--rule", hex: "#566C73", name: "藍鼠", source: "NC", theme: "day" },
  { token: "--guide", hex: "#33A6B8", name: "浅葱", source: "NC", theme: "day" },
  { token: "--guide-label", hex: "#0D5661", name: "藍", source: "NC", theme: "day" },
  { token: "--select", hex: "#E03C8A", name: "躑躅", source: "NC", theme: "day" },
  { token: "--select-text", hex: "#C1328E", name: "牡丹", source: "NC", theme: "day" },
  { token: "--instruct", hex: "#EB6101", name: "朱", source: "WD", theme: "day" },
  { token: "--instruct-text", hex: "#C73E3A", name: "銀朱", source: "NC", theme: "day" },
  { token: "--seal", hex: "#CB1B45", name: "紅", source: "NC", theme: "day" },
  { token: "--gilt", hex: "#FFB11B", name: "山吹", source: "NC", theme: "day" },
  { token: "--on-gilt", hex: "#0F2540", name: "紺", source: "NC", theme: "day" },
  { token: "--wood", hex: "#E1A679", name: "赤白橡", source: "NC", theme: "day" },
  { token: "--wood-2", hex: "#B35C37", name: "樺茶", source: "NC", theme: "day" },
  { token: "--gravel", hex: "#BDC0BA", name: "白鼠", source: "NC", theme: "day" },
  { token: "--season", hex: "#E2943B", name: "朽葉", source: "NC", theme: "day" },
  { token: "--plate-1", hex: "#0F2540", name: "紺", source: "NC", theme: "day" },
  { token: "--plate-2", hex: "#5DAC81", name: "若竹", source: "NC", theme: "day" },
  { token: "--plate-3", hex: "#91989F", name: "銀鼠", source: "NC", theme: "day" },
  { token: "--plate-4", hex: "#F4A7B9", name: "一斤染", source: "NC", theme: "day" },
  { token: "--plate-5", hex: "#A5DEE4", name: "瓶覗", source: "NC", theme: "day" },
  { token: "--plate-6", hex: "#205C81", name: "ベロ藍", source: "sampled 39-okazaki", theme: "day" },
  { token: "--plate-7", hex: "#656765", name: "鈍", source: "NC", theme: "day" },
  { token: "--plate-8", hex: "#FFB11B", name: "山吹", source: "NC", theme: "day" },
  { token: "--plate-1-text", hex: "#0F2540", name: "紺", source: "NC", theme: "day" },
  { token: "--plate-2-text", hex: "#26453D", name: "", source: "", theme: "day" },
  { token: "--plate-3-text", hex: "#566C73", name: "藍鼠", source: "NC", theme: "day" },
  { token: "--plate-4-text", hex: "#9F353A", name: "臙脂", source: "NC", theme: "day" },
  { token: "--plate-5-text", hex: "#006284", name: "縹", source: "NC", theme: "day" },
  { token: "--plate-6-text", hex: "#205C81", name: "ベロ藍", source: "sampled 39-okazaki", theme: "day" },
  { token: "--plate-7-text", hex: "#656765", name: "鈍", source: "NC", theme: "day" },
  { token: "--plate-8-text", hex: "#0F2540", name: "紺", source: "NC", theme: "day" },
  { token: "--layer-cover", hex: "#5383C3", name: "薄群青", source: "WD", theme: "day" },
  { token: "--layer-summary", hex: "#E95464", name: "韓紅", source: "WD", theme: "day" },
  { token: "--layer-road", hex: "#5DAC81", name: "若竹", source: "NC", theme: "day" },
  { token: "--layer-works", hex: "#005CAF", name: "瑠璃", source: "NC", theme: "day" },
  { token: "--layer-skills", hex: "#E03C8A", name: "躑躅", source: "NC", theme: "day" },
  { token: "--layer-principles", hex: "#33A6B8", name: "浅葱", source: "NC", theme: "day" },
  { token: "--layer-achievements", hex: "#E9CD4C", name: "刈安", source: "NC", theme: "day" },
  { token: "--layer-writing", hex: "#656765", name: "鈍", source: "NC", theme: "day" },
  { token: "--layer-testimonials", hex: "#1C1C1C", name: "墨", source: "NC", theme: "day" },
  { token: "--layer-contact", hex: "#F05E1C", name: "黄丹", source: "NC", theme: "day" },
  { token: "--layer-colophon", hex: "#42602D", name: "松葉", source: "NC", theme: "day" },
  { token: "--layer-motion", hex: "#268785", name: "青碧", source: "NC", theme: "day" },
  { token: "--accent-cover", hex: "#205C81", name: "ベロ藍", source: "sampled 39-okazaki", theme: "day" },
  { token: "--accent-cover-text", hex: "#205C81", name: "ベロ藍", source: "sampled 39-okazaki", theme: "day" },
  { token: "--accent-summary", hex: "#EB6101", name: "朱", source: "WD", theme: "day" },
  { token: "--accent-summary-text", hex: "#C73E3A", name: "銀朱", source: "NC", theme: "day" },
  { token: "--accent-road", hex: "#5DAC81", name: "若竹", source: "NC", theme: "day" },
  { token: "--accent-road-text", hex: "#26453D", name: "", source: "", theme: "day" },
  { token: "--accent-works", hex: "#E1A441", name: "金地", source: "sampled korin-irises", theme: "day" },
  { token: "--accent-works-text", hex: "#1A6343", name: "岩緑青", source: "sampled korin-irises", theme: "day" },
  { token: "--accent-skills", hex: "#D8A373", name: "伽羅", source: "WD", theme: "day" },
  { token: "--accent-skills-text", hex: "#255359", name: "伽羅", source: "WD", theme: "day" },
  { token: "--accent-principles", hex: "#BDC0BA", name: "白鼠", source: "NC", theme: "day" },
  { token: "--accent-principles-text", hex: "#656765", name: "鈍", source: "NC", theme: "day" },
  { token: "--accent-achievements", hex: "#CB1B45", name: "紅", source: "NC", theme: "day" },
  { token: "--accent-achievements-text", hex: "#CB1B45", name: "紅", source: "NC", theme: "day" },
  { token: "--accent-writing", hex: "#77428D", name: "江戸紫", source: "NC", theme: "day" },
  { token: "--accent-writing-text", hex: "#77428D", name: "江戸紫", source: "NC", theme: "day" },
  { token: "--accent-testimonials", hex: "#8A6BBE", name: "藤紫", source: "NC", theme: "day" },
  { token: "--accent-testimonials-text", hex: "#70649A", name: "藤紫", source: "NC", theme: "day" },
  { token: "--accent-contact", hex: "#C27B65", name: "京の朱", source: "sampled 55-kyoto", theme: "day" },
  { token: "--accent-contact-text", hex: "#9F353A", name: "臙脂", source: "NC", theme: "day" },
  { token: "--accent-colophon", hex: "#42602D", name: "松葉", source: "NC", theme: "day" },
  { token: "--accent-colophon-text", hex: "#42602D", name: "松葉", source: "NC", theme: "day" },
  { token: "--ch-1", hex: "#335B6A", name: "日本橋の藍", source: "sampled 01-nihonbashi", theme: "day" },
  { token: "--ch-2", hex: "#B4C085", name: "箱根の緑", source: "sampled 11-hakone", theme: "day" },
  { token: "--ch-3", hex: "#38465D", name: "三島の墨", source: "sampled 12-mishima", theme: "day" },
  { token: "--ch-4", hex: "#D4A486", name: "原の曙", source: "sampled 14-hara", theme: "day" },
  { token: "--ch-5", hex: "#376E84", name: "島田の水", source: "sampled 24-shimada", theme: "day" },
  { token: "--ch-6", hex: "#205C81", name: "ベロ藍", source: "sampled 39-okazaki", theme: "day" },
  { token: "--ch-7", hex: "#656765", name: "鈍", source: "NC", theme: "day" },
  { token: "--pasteboard", hex: "#566C73", name: "藍鼠", source: "NC", theme: "night" },
  { token: "--paper", hex: "#005CAF", name: "瑠璃", source: "NC", theme: "night" },
  { token: "--paper-print", hex: "#1E50A2", name: "瑠璃", source: "WD", theme: "night" },
  { token: "--panel", hex: "#006284", name: "縹", source: "NC", theme: "night" },
  { token: "--mat", hex: "#C1E4E9", name: "白藍", source: "WD", theme: "night" },
  { token: "--ink", hex: "#EAF4FC", name: "月白", source: "WD", theme: "night" },
  { token: "--ink-2", hex: "#C1E4E9", name: "白藍", source: "WD", theme: "night" },
  { token: "--link", hex: "#A5DEE4", name: "瓶覗", source: "NC", theme: "night" },
  { token: "--rule", hex: "#A5DEE4", name: "瓶覗", source: "NC", theme: "night" },
  { token: "--guide", hex: "#78C2C4", name: "白群", source: "NC", theme: "night" },
  { token: "--guide-label", hex: "#A5DEE4", name: "瓶覗", source: "NC", theme: "night" },
  { token: "--select", hex: "#F596AA", name: "桃", source: "NC", theme: "night" },
  { token: "--select-text", hex: "#FEDFE1", name: "桜", source: "NC", theme: "night" },
  { token: "--instruct", hex: "#F4A7B9", name: "一斤染", source: "NC", theme: "night" },
  { token: "--instruct-text", hex: "#FEDFE1", name: "桜", source: "NC", theme: "night" },
  { token: "--seal", hex: "#EEA9A9", name: "鴇", source: "NC", theme: "night" },
  { token: "--gilt", hex: "#E9CD4C", name: "刈安", source: "NC", theme: "night" },
  { token: "--on-gilt", hex: "#0F2540", name: "紺", source: "NC", theme: "night" },
  { token: "--wood", hex: "#E1A679", name: "赤白橡", source: "NC", theme: "night" },
  { token: "--wood-2", hex: "#B35C37", name: "樺茶", source: "NC", theme: "night" },
  { token: "--gravel", hex: "#91989F", name: "銀鼠", source: "NC", theme: "night" },
  { token: "--plate-1", hex: "#EAF4FC", name: "月白", source: "WD", theme: "night" },
  { token: "--plate-2", hex: "#A8D8B9", name: "", source: "", theme: "night" },
  { token: "--plate-3", hex: "#AFAFB0", name: "", source: "", theme: "night" },
  { token: "--plate-4", hex: "#F4A7B9", name: "一斤染", source: "NC", theme: "night" },
  { token: "--plate-5", hex: "#A5DEE4", name: "瓶覗", source: "NC", theme: "night" },
  { token: "--plate-6", hex: "#51A8DD", name: "", source: "", theme: "night" },
  { token: "--plate-7", hex: "#A3A3A2", name: "", source: "", theme: "night" },
  { token: "--plate-8", hex: "#E9CD4C", name: "刈安", source: "NC", theme: "night" },
  { token: "--plate-8-text", hex: "#0F2540", name: "紺", source: "NC", theme: "night" },
  { token: "--layer-cover", hex: "#A5DEE4", name: "瓶覗", source: "NC", theme: "night" },
  { token: "--layer-summary", hex: "#EEA9A9", name: "鴇", source: "NC", theme: "night" },
  { token: "--layer-road", hex: "#A8D8B9", name: "", source: "", theme: "night" },
  { token: "--layer-works", hex: "#78C2C4", name: "白群", source: "NC", theme: "night" },
  { token: "--layer-skills", hex: "#F596AA", name: "桃", source: "NC", theme: "night" },
  { token: "--layer-principles", hex: "#C1E4E9", name: "白藍", source: "WD", theme: "night" },
  { token: "--layer-achievements", hex: "#E9CD4C", name: "刈安", source: "NC", theme: "night" },
  { token: "--layer-writing", hex: "#BDC0BA", name: "白鼠", source: "NC", theme: "night" },
  { token: "--layer-testimonials", hex: "#BBC8E6", name: "", source: "", theme: "night" },
  { token: "--layer-contact", hex: "#F9BF45", name: "", source: "", theme: "night" },
  { token: "--layer-colophon", hex: "#AACF53", name: "", source: "", theme: "night" },
  { token: "--layer-motion", hex: "#E9DFE5", name: "", source: "", theme: "night" },
  { token: "--accent-cover", hex: "#A5DEE4", name: "瓶覗", source: "NC", theme: "night" },
  { token: "--accent-summary", hex: "#F4A7B9", name: "一斤染", source: "NC", theme: "night" },
  { token: "--accent-road", hex: "#A8D8B9", name: "", source: "", theme: "night" },
  { token: "--accent-works", hex: "#E9CD4C", name: "刈安", source: "NC", theme: "night" },
  { token: "--accent-skills", hex: "#E1A679", name: "赤白橡", source: "NC", theme: "night" },
  { token: "--accent-principles", hex: "#BDC0BA", name: "白鼠", source: "NC", theme: "night" },
  { token: "--accent-achievements", hex: "#EEA9A9", name: "鴇", source: "NC", theme: "night" },
  { token: "--accent-writing", hex: "#B28FCE", name: "", source: "", theme: "night" },
  { token: "--accent-testimonials", hex: "#BBC8E6", name: "", source: "", theme: "night" },
  { token: "--accent-contact", hex: "#EEA9A9", name: "鴇", source: "NC", theme: "night" },
  { token: "--accent-colophon", hex: "#AACF53", name: "", source: "", theme: "night" },
];

function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** sRGB → CIE Lab (D65) for perceptual nearest-colour matching. */
function lab([r, g, b]: [number, number, number]): [number, number, number] {
  const lin = (c: number) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const R = lin(r), G = lin(g), B = lin(b);
  const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const Y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}

/** Parse 'rgb(…)', 'rgba(…)' or '#rrggbb' into a hex string (alpha ignored). */
export function toHex(css: string): string | null {
  const s = css.trim();
  if (s.startsWith('#')) return s.length >= 7 ? s.slice(0, 7).toUpperCase() : '#' + s.slice(1).split('').map((c) => c + c).join('').toUpperCase();
  const m = /rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)/.exec(s);
  if (!m) return null;
  return '#' + [m[1], m[2], m[3]].map((v) => Math.round(Number(v)).toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** Nearest token colour (ΔE76 in Lab), preferring entries of the given theme. */
export function nearestToken(color: string, theme: 'day' | 'night' = 'day'): (PaletteEntry & { deltaE: number }) | null {
  const hex = toHex(color);
  if (!hex) return null;
  const L = lab(rgb(hex));
  let best: PaletteEntry | null = null, bestD = Infinity;
  for (const e of PALETTE) {
    const [l, a, b] = lab(rgb(e.hex));
    const d = Math.hypot(L[0] - l, L[1] - a, L[2] - b) + (e.theme === theme ? 0 : 0.5);
    if (d < bestD) { bestD = d; best = e; }
  }
  return best ? { ...best, deltaE: bestD } : null;
}

/** Label used by selection boxes, e.g. "紺 #0F2540". */
export function colourLabel(color: string, theme: 'day' | 'night' = 'day'): string {
  const e = nearestToken(color, theme);
  if (!e) return color;
  return `${e.name || e.token} ${e.hex}`;
}
