/**
 * The print sheet, redrawn from the DOM (DESIGN §6.1 "pixel-identical swap"). Owner: WP-05.
 *
 * `collectSheet(paper)` reads the sheet's real geometry: the paper rect, its colour and deckle mask, every SVG in it
 * (serialised with computed colours and stroke widths) and every glyph (Range.getClientRects() per character, with
 * the computed font and colour). Two painters use that one model:
 *   - `paintPrint()` — the canvas texture of the sheet, device-pixel aligned, so the WebGL sheet can stand in for
 *     the DOM sheet invisibly (the DOM text then turns transparent but stays selectable and accessible);
 *   - `paintCarve()` — the carving source of the key block: the same marks, mirrored (scale(-1, 1)), white on black,
 *     with an uninked raised margin (pure red: raised but no ink) and the 鉤見当 / 引付見当 notches.
 * Vertical text is drawn glyph by glyph: CJK upright on its em cell; Latin turned 90° clockwise (text-orientation:
 * mixed); the long-vowel mark, dashes and brackets turned like their vertical forms; small kana and 、。 nudged to
 * the upper right as the font's `vert` alternates place them.
 */

export interface Rect { x: number; y: number; w: number; h: number }
type GlyphMode = 'h' | 'upright' | 'turn' | 'sideways';
export interface Glyph { ch: string; font: string; color: string; r: Rect; mode: GlyphMode; small: boolean; fine: boolean }
/** Text below this size (CSS px) stays DOM-rendered over the canvas sheet until the sheet starts to lift: canvas and
 *  DOM rasterise small glyphs with slightly different hinting/AA, large ones identically (see paintPrint). */
export const FINE_PX = 24;
/** One SVG shape, in viewport coordinates: the path, its screen CTM, and computed paint. */
interface SvgShape { d: string; m: DOMMatrix; fill: string | null; rule: CanvasFillRule; stroke: string | null; width: number; cap: CanvasLineCap; join: CanvasLineJoin }
export interface SheetModel {
  paper: Rect;               // viewport CSS px at measure time
  scrollY: number;
  paperColor: string;
  mask: HTMLImageElement | null;
  svgs: SvgShape[];
  glyphs: Glyph[];
}

const TURN = new Set([...'ー〜～…‥―—–（）「」『』【】〈〉《》［］｛｝＝']);
const SMALL = new Set([...'ぁぃぅぇぉっゃゅょゎゕゖァィゥェォッャュョヮヵヶ、。，．']);
function isUpright(cp: number): boolean {
  return (cp >= 0x1100 && cp <= 0x11ff) || (cp >= 0x2e80 && cp <= 0x9fff) || (cp >= 0xac00 && cp <= 0xd7af) ||
    (cp >= 0xf900 && cp <= 0xfaff) || (cp >= 0xfe30 && cp <= 0xfe4f) || (cp >= 0xff00 && cp <= 0xffef) || (cp >= 0x20000 && cp <= 0x3ffff);
}

const toRect = (b: DOMRect): Rect => ({ x: b.left, y: b.top, w: b.width, h: b.height });

async function loadImage(src: string): Promise<HTMLImageElement | null> {
  const img = new Image();
  img.decoding = 'async';
  img.src = src;
  try { await img.decode(); return img; } catch { return null; }
}

/** The SVG's paths as viewport-space shapes (getScreenCTM), drawn with Path2D exactly as Skia fills/strokes them. */
function svgShapes(svg: SVGSVGElement): SvgShape[] {
  const out: SvgShape[] = [];
  // Blink paints an inline SVG at its box offset snapped to whole device pixels; getScreenCTM() is unsnapped
  const dpr = devicePixelRatio || 1;
  const box = svg.getBoundingClientRect();
  const snap = new DOMMatrix().translate(Math.round(box.left * dpr) / dpr - box.left, Math.round(box.top * dpr) / dpr - box.top);
  for (const el of svg.querySelectorAll<SVGPathElement>('path')) {
    const d = el.getAttribute('d');
    const m = el.getScreenCTM();
    if (!d || !m) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const paint = (v: string) => (!v || v === 'none' ? null : v);
    const scale = Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1;
    const w = parseFloat(cs.strokeWidth) || 0;
    out.push({
      d, m: snap.multiply(DOMMatrix.fromMatrix(m)),
      fill: paint(cs.fill), rule: cs.fillRule === 'evenodd' ? 'evenodd' : 'nonzero',
      stroke: paint(cs.stroke), width: cs.vectorEffect === 'non-scaling-stroke' ? w : w * scale,
      cap: (cs.strokeLinecap as CanvasLineCap) || 'butt', join: (cs.strokeLinejoin as CanvasLineJoin) || 'miter',
    });
  }
  return out;
}

function drawShapes(g: CanvasRenderingContext2D, shapes: readonly SvgShape[], colour: string | null): void {
  for (const sh of shapes) {
    const p = new Path2D();
    p.addPath(new Path2D(sh.d), sh.m);
    if (sh.fill) { g.fillStyle = colour ?? sh.fill; g.fill(p, sh.rule); }
    if (sh.stroke && sh.width > 0) {
      g.strokeStyle = colour ?? sh.stroke;
      g.lineWidth = sh.width;
      g.lineCap = sh.cap;
      g.lineJoin = sh.join;
      g.stroke(p);
    }
  }
}

function cssUrl(v: string): string | null {
  const m = /url\((['"]?)(.*?)\1\)/.exec(v || '');
  return m ? m[2]! : null;
}

/** Read the sheet from the DOM. Call with layout settled and fonts loaded. */
export async function collectSheet(paper: HTMLElement): Promise<SheetModel> {
  const cs = getComputedStyle(paper);
  const paperColor = cs.getPropertyValue('--paper-print').trim() || '#FFFFFB';
  const maskSrc = cssUrl(cs.maskImage || (cs as CSSStyleDeclaration & { webkitMaskImage?: string }).webkitMaskImage || '');
  const glyphs: Glyph[] = [];
  const range = document.createRange();
  const walker = document.createTreeWalker(paper, NodeFilter.SHOW_TEXT);
  const meter = document.createElement('canvas').getContext('2d')!;
  // vertical columns made of several text nodes (outside ruby): carry the shaper's float pen position across nodes
  const cursors = new Map<Element, { x: number; y: number }>();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const text = n.nodeValue ?? '';
    const parent = n.parentElement;
    if (!parent || !text.trim() || parent.closest('.visually-hidden, svg')) continue;
    const ps = getComputedStyle(parent);
    if (ps.visibility === 'hidden' || ps.display === 'none') continue;
    const font = `${ps.fontStyle} ${ps.fontWeight} ${ps.fontSize} ${ps.fontFamily}`;
    const fine = (parseFloat(ps.fontSize) || 16) < FINE_PX;
    if (fine) (parent.closest('rt, p, span, h1, li') ?? parent).setAttribute('data-fine', '');
    const vertical = ps.writingMode.startsWith('vertical') || ps.writingMode.startsWith('sideways');
    const inRuby = vertical && !!parent.closest('rt');
    const col = vertical && !parent.closest('ruby') ? parent.closest('h1, p, li') : null;
    const first = glyphs.length;
    let i = 0, prevIdx = -9, prevLen = 0;
    for (const ch of text) {
      const len = ch.length;
      if (/\s/.test(ch) && col) {
        const cur = cursors.get(col);
        if (cur) { meter.font = font; cur.y += meter.measureText(ch).width + (parseFloat(ps.letterSpacing) || 0); }
      }
      if (!/\s/.test(ch)) {
        range.setStart(n, i);
        range.setEnd(n, i + len);
        const rects = range.getClientRects();
        const b = [...rects].find((x) => x.width > 0 && x.height > 0);
        if (b) {
          const cp = ch.codePointAt(0)!;
          const mode: GlyphMode = !vertical ? 'h' : TURN.has(ch) ? 'turn' : isUpright(cp) || ps.textOrientation === 'upright' ? 'upright' : 'sideways';
          const r = toRect(b);
          // consecutive upright glyphs of one run advance by exactly 1 em + letter-spacing (the shaper's float
          // positions); the per-character rects are rounded and drift by a fraction of a pixel per glyph
          const prev = glyphs.length > first ? glyphs[glyphs.length - 1]! : null;
          if (vertical && !inRuby && mode === 'upright' && prev?.mode === 'upright' && prevIdx === i - prevLen) {
            r.y = prev.r.y + (parseFloat(ps.fontSize) || 16) + (parseFloat(ps.letterSpacing) || 0);
          } else if (col && mode === 'upright') {
            const cur = cursors.get(col);
            if (cur && Math.abs(cur.x - r.x) < 1 && Math.abs(cur.y - r.y) < 2) r.y = cur.y;
          }
          if (col && mode === 'upright') cursors.set(col, { x: r.x, y: r.y + (parseFloat(ps.fontSize) || 16) + (parseFloat(ps.letterSpacing) || 0) });
          glyphs.push({ ch, font, color: ps.color, r, mode, small: vertical && SMALL.has(ch), fine });
          prevIdx = i;
          prevLen = len;
        }
      }
      i += len;
    }
    // ruby-align: space-around: each annotation glyph's rect also holds its share of the spread (half a share
    // before the first glyph, a full share after every glyph but the last): the first glyph sits half a share down
    if (inRuby && glyphs.length > first) {
      const fs = parseFloat(ps.fontSize) || 16;
      const ls = parseFloat(ps.letterSpacing) || 0;
      const adv = fs + ls;
      const g0 = glyphs[first]!;
      const k = glyphs.length - first;
      let top = g0.r.y + Math.max(0, (g0.r.h - adv) / 2);
      if (k >= 3) {
        const g1 = glyphs[first + 1]!;                 // a middle glyph: its rect = advance + one full share
        top = g1.r.y - adv - Math.max(0, g1.r.h - adv);
      } else if (k === 2) {
        const g1 = glyphs[first + 1]!;                 // the last glyph: advance + half a share
        top = g0.r.y + Math.max(0, g1.r.h - adv);
      }
      g0.r = { ...g0.r, y: top };
    }
  }
  const svgs: SvgShape[] = [];
  for (const svg of paper.querySelectorAll<SVGSVGElement>('svg')) {
    if (!svg.closest('.visually-hidden')) svgs.push(...svgShapes(svg));
  }
  const mask = maskSrc ? await loadImage(new URL(maskSrc, document.baseURI).href) : null;
  return { paper: toRect(paper.getBoundingClientRect()), scrollY, paperColor, mask, svgs, glyphs };
}

/** Ideographic em-box ascent of the CJK faces used on the sheet (Shippori Mincho B1, IBM Plex Sans JP, Noto SC). */
const EM_ASCENT: Readonly<Record<string, number>> = {};
const emAscent = (font: string) => { for (const [f, v] of Object.entries(EM_ASCENT)) if (font.includes(f)) return v; return 0.88; };
/** Per-mode placement fine-tuning, in em (measured against the DOM in Chromium; see the WP-05 hand-over). */
const NUDGE = { upright: { dx: 0, dy: 0 }, small: { dx: 0.11, dy: -0.12 } };

/** @param embolden carving source only: a stroke of this many em around each glyph, so hairlines survive the V-cut
 *  (a block's printing face is never thinner than the line it prints) */
function drawGlyph(g: CanvasRenderingContext2D, gl: Glyph, color: string, snap: (v: number) => number = (v) => v, snapUp: (v: number) => number = (v) => v, half = 0, embolden = 0): void {
  g.font = gl.font;
  g.fillStyle = color;
  const r = gl.r;
  const fsize = parseFloat(gl.font.split(' ')[2] ?? '16') || 16;
  const sw = Math.min(1.1, fsize * embolden);
  if (sw > 0) { g.strokeStyle = color; g.lineWidth = sw; g.lineJoin = 'round'; }
  const put = (x: number, y: number) => { g.fillText(gl.ch, x, y); if (sw > 0) g.strokeText(gl.ch, x, y); };
  if (gl.mode === 'h') {
    g.textAlign = 'left';
    g.textBaseline = 'alphabetic';
    const m = g.measureText(gl.ch);
    put(r.x, snap(r.y + m.fontBoundingBoxAscent));
    return;
  }
  g.textBaseline = 'alphabetic';
  const m = g.measureText(gl.ch);
  const emA = m.emHeightAscent ?? m.fontBoundingBoxAscent;
  const emD = m.emHeightDescent ?? m.fontBoundingBoxDescent;
  const size = parseFloat(gl.font.split(' ')[2] ?? '16') || 16;
  if (gl.mode === 'upright') {
    // Blink places an upright glyph by its vertical origin (VORG, else vmtx tsb + yMax): for CJK faces that is the
    // ideographic em box, ascent 0.88 em below the top of the glyph's advance (the rect's top; letter-spacing trails)
    const n = gl.small ? NUDGE.small : NUDGE.upright;
    g.textAlign = 'center';
    // canvas rounds the glyph's x to the pixel grid, Blink floors it: half a device pixel to the left matches them
    // vertical position: the advance's top snapped, then the em-box ascent rounded up (matches Blink to the pixel)
    put(r.x + r.w / 2 + n.dx * size - half, snap(r.y) + snapUp(emAscent(gl.font) * size + n.dy * size));
    return;
  }
  g.save();
  if (gl.mode === 'turn') {
    g.translate(r.x + r.w / 2, r.y + r.h / 2);
    g.rotate(Math.PI / 2);
    g.textAlign = 'center';
    put(0, (emA - emD) / 2);
  } else {
    g.translate(r.x + r.w / 2, r.y);
    g.rotate(Math.PI / 2);
    g.textAlign = 'left';
    put(0, (emA - emD) / 2);
  }
  g.restore();
}

export interface PrintCanvas { canvas: HTMLCanvasElement; dpr: number; quad: { x0: number; y0: number; x1: number; y1: number } }

/** The sheet as the DOM paints it, on a device-pixel-aligned canvas (quad in device px of the viewport). */
/**
 * @param fine include text smaller than FINE_PX (false: the "base" texture used while the sheet lies flat, with the
 *             DOM still drawing that small text on top; true: everything, used once the sheet lifts)
 */
export function paintPrint(m: SheetModel, dpr: number, fine = true, canvas: HTMLCanvasElement = document.createElement('canvas')): PrintCanvas {
  const p = m.paper;
  const x0 = Math.floor(p.x * dpr), y0 = Math.floor(p.y * dpr);
  const x1 = Math.ceil((p.x + p.w) * dpr), y1 = Math.ceil((p.y + p.h) * dpr);
  canvas.width = Math.max(1, x1 - x0);
  canvas.height = Math.max(1, y1 - y0);
  const g = canvas.getContext('2d')!;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, canvas.width, canvas.height);
  g.setTransform(dpr, 0, 0, dpr, -x0, -y0);
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  g.fillStyle = m.paperColor;
  // Blink pixel-snaps box painting (background, mask) to whole device pixels
  const ps = { x: Math.round(p.x * dpr) / dpr, y: Math.round(p.y * dpr) / dpr, w: (Math.round((p.x + p.w) * dpr) - Math.round(p.x * dpr)) / dpr, h: (Math.round((p.y + p.h) * dpr) - Math.round(p.y * dpr)) / dpr };
  g.fillRect(ps.x, ps.y, ps.w, ps.h);
  drawShapes(g, m.svgs, null);
  const snap = (v: number) => Math.round(v * dpr) / dpr;
  const snapUp = (v: number) => Math.ceil(v * dpr - 1e-3) / dpr;
  for (const gl of m.glyphs) if (fine || !gl.fine) drawGlyph(g, gl, gl.color, snap, snapUp, 0.5 / dpr);
  if (m.mask) {
    g.globalCompositeOperation = 'destination-in';
    g.drawImage(m.mask, ps.x, ps.y, ps.w, ps.h);
    g.globalCompositeOperation = 'source-over';
  }
  return { canvas, dpr, quad: { x0, y0, x1, y1 } };
}

/** The key block's face: 1.04 × the paper (§6.1), centred on it (viewport CSS px). */
export function blockRect(m: SheetModel): Rect {
  const p = m.paper;
  return { x: p.x - p.w * 0.02, y: p.y - p.h * 0.02, w: p.w * 1.04, h: p.h * 1.04 };
}

/** Deterministic hand-cut wobble for the margin's inner edge. */
function wobble(i: number): number {
  const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return (s - Math.floor(s)) - 0.5;
}

/**
 * The carving source: block face, long side = res. White = raised and inked; pure red = raised, uninked (margin);
 * black = cut away. The marks are mirrored, as on a real key block.
 */
export function paintCarve(m: SheetModel, res: number): HTMLCanvasElement {
  const B = blockRect(m);
  const p = m.paper;
  const aspect = B.w / B.h;
  const ch = aspect <= 1 ? res : Math.round(res / aspect);
  const cw = aspect <= 1 ? Math.round(res * aspect) : res;
  const c = document.createElement('canvas');
  c.width = cw;
  c.height = ch;
  const g = c.getContext('2d')!;
  const k = cw / B.w;
  g.fillStyle = '#000';
  g.fillRect(0, 0, cw, ch);
  // the raised, uninked margin with a hand-cut inner edge (block view = canvas view, not mirrored)
  g.setTransform(k, 0, 0, k, -B.x * k, -B.y * k);
  g.fillStyle = '#ff0000';
  g.fillRect(B.x, B.y, B.w, B.h);
  const mx = B.w * 0.036, my = B.w * 0.036;
  const ix0 = B.x + mx, iy0 = B.y + my, ix1 = B.x + B.w - mx, iy1 = B.y + B.h - my;
  const jit = B.w * 0.0016;
  g.fillStyle = '#000';
  g.beginPath();
  const steps = 26;
  for (let i = 0; i <= steps; i++) { const t = i / steps; const x = ix0 + (ix1 - ix0) * t, y = iy0 + wobble(i) * jit; i ? g.lineTo(x, y) : g.moveTo(x, y); }
  for (let i = 1; i <= steps; i++) { const t = i / steps; g.lineTo(ix1 + wobble(i + 40) * jit, iy0 + (iy1 - iy0) * t); }
  for (let i = 1; i <= steps; i++) { const t = i / steps; g.lineTo(ix1 - (ix1 - ix0) * t, iy1 + wobble(i + 80) * jit); }
  for (let i = 1; i < steps; i++) { const t = i / steps; g.lineTo(ix0 + wobble(i + 120) * jit, iy1 - (iy1 - iy0) * t); }
  g.closePath();
  g.fill();
  // 見当: 鉤見当 (an L-shaped notch hugging the sheet's corner) lower right, 引付見当 (straight) on the lower edge
  const t = B.w * 0.007;
  const px1 = p.x + p.w, py1 = p.y + p.h;
  g.fillRect(px1 - p.w * 0.13, py1 + t * 0.6, p.w * 0.13 + t * 1.6, t);
  g.fillRect(px1 + t * 0.6, py1 - p.h * 0.075, t, p.h * 0.075 + t * 1.6);
  g.fillRect(p.x + p.w * 0.18, py1 + t * 0.6, p.w * 0.16, t);
  // the printing marks, mirrored
  g.setTransform(-k, 0, 0, k, cw + B.x * k, -B.y * k);
  g.imageSmoothingEnabled = true;
  drawShapes(g, m.svgs, '#ffffff');
  for (const gl of m.glyphs) drawGlyph(g, gl, '#ffffff', undefined, undefined, 0, 0.013);
  g.setTransform(1, 0, 0, 1, 0, 0);
  return c;
}

/** The 版下 pasted on the block's back: the summary figure's mat (colour, image, deckle) at device resolution. */
export async function paintHanshita(mat: HTMLElement, dpr: number): Promise<HTMLCanvasElement | null> {
  const img = mat.querySelector('img');
  if (!img) return null;
  try { if (!img.complete || !img.naturalWidth) await img.decode(); } catch { return null; }
  const mr = mat.getBoundingClientRect();
  const ir = img.getBoundingClientRect();
  if (mr.width < 2 || mr.height < 2) return null;
  const scale = Math.min(dpr, 2048 / Math.max(mr.width, mr.height));
  const c = document.createElement('canvas');
  c.width = Math.round(mr.width * scale);
  c.height = Math.round(mr.height * scale);
  const g = c.getContext('2d')!;
  g.setTransform(scale, 0, 0, scale, -mr.left * scale, -mr.top * scale);
  const cs = getComputedStyle(mat);
  g.fillStyle = cs.backgroundColor || '#EBF6F7';
  g.fillRect(mr.left, mr.top, mr.width, mr.height);
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  g.drawImage(img, ir.left, ir.top, ir.width, ir.height);
  const maskSrc = cssUrl(cs.maskImage || (cs as CSSStyleDeclaration & { webkitMaskImage?: string }).webkitMaskImage || '');
  if (maskSrc) {
    const mask = await loadImage(new URL(maskSrc, document.baseURI).href);
    if (mask) {
      g.globalCompositeOperation = 'destination-in';
      g.drawImage(mask, mr.left, mr.top, mr.width, mr.height);
      g.globalCompositeOperation = 'source-over';
    }
  }
  return c;
}
