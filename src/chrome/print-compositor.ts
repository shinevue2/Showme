/**
 * Today's print compositor — 今日の一枚 / Today's print / 今日之印 (DESIGN §1.3, §4.4). Owner: WP-04.
 *
 * Canvas2D only. Inputs: the eight plate SVGs and the cartouche mask (WP-02, `public/print/`, viewBox
 * 0 0 1240 1824, ōban portrait) and the visitor's `ctx.print` state (inked plates, hidden plates, seed,
 * marbling canvas, seal impression).
 *
 * Draw order (WP-02 R3, revised): 胡粉 paper ground → plates 2–7 with `multiply` (authentic overprint), each
 * offset by a seeded misregistration (thumbnail ±0–2 px, full size ±0–6 px, rotation ≤ 0.3°) → plate 8 (gold)
 * with `source-over` (metallic ink is opaque and goes on last) → the visitor's marbling clipped to the
 * cartouche → plate 1, the key block, on top → the name in the cartouche (vertical ja/zh, two lines en) →
 * the seal impression at lower left (the default 湊 seal until the visitor stamps).
 *
 * The print is an artwork: like every figure.print it is never inverted for night, so the paper ground is
 * the day 胡粉 (#FFFFFB) in both themes and the thumbnail sits on the light --mat.
 *
 * API (stable for WP-10, which imports it for the Colophon):
 *   renderPrint(canvas, widthPx, opts?)  → draws the print at widthPx CSS px (height = width × 1.47097)
 *   printBlob(widthPx?)                  → PNG Blob (default 1240 px desktop, 620 px on coarse pointers)
 *   downloadPrint(filename?)             → saves that PNG
 *   bindPrint(ctx)                       → called once by the chrome; falls back to window.__hanmoto.ctx
 */
import type { AppContext, PlateN, PrintStateAPI, SealImpression } from '../core/types';
import { stream } from '../core/seed';

export const PRINT_W = 1240;
export const PRINT_H = 1824;
export const PRINT_RATIO = PRINT_H / PRINT_W;

const PAPER = '#FFFFFB';            // 胡粉 NC — the day --paper-print; prints are never inverted (§3.6)
const KEY_INK = '#0F2540';          // 紺 NC — plate 1
const SEAL_INK = '#CB1B45';         // 紅 NC — --seal (day): seal paste is red on any paper
const CARTOUCHE = { x: 1022, y: 312, w: 126, h: 676 };      // assets-src/svg/print-layout.json
const SEAL_BOX = { x: 96, y: 1524, w: 150, h: 183 };

export interface RenderPrintOptions {
  /** Override the state (defaults to the bound ctx.print). */
  state?: Pick<PrintStateAPI, 'seed' | 'inked' | 'hidden' | 'marbling' | 'seal'>;
  /** Language of the name in the cartouche (defaults to the page language). */
  lang?: 'ja' | 'en' | 'zh';
  /** Device pixel ratio for the backing store (defaults to min(devicePixelRatio, 2); 1 for exports). */
  dpr?: number;
}

let bound: AppContext | null = null;
export function bindPrint(ctx: AppContext): void { bound = ctx; }
function ctxOf(): AppContext | null {
  return bound ?? (window as Window & { __hanmoto?: { ctx?: AppContext } }).__hanmoto?.ctx ?? null;
}

/* ---------------------------------------------------------------- assets */
const imgCache = new Map<string, Promise<HTMLImageElement | null>>();
function urlFor(p: string): string {
  const c = ctxOf();
  if (c) return c.assets.url(p);
  return new URL('../' + p, import.meta.url).href;
}
function loadImage(rel: string): Promise<HTMLImageElement | null> {
  let p = imgCache.get(rel);
  if (!p) {
    p = new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = urlFor(rel);
    });
    imgCache.set(rel, p);
  }
  return p;
}
const plateImg = (n: PlateN) => loadImage(`print/plate-${n}.svg`);

/** Warm the plate cache (the chrome calls it when the Separations tab first opens). */
export function preloadPlates(): void {
  for (let n = 1; n <= 8; n++) void plateImg(n as PlateN);
  void loadImage('img/gen/seal-minato.svg');
}

/* ---------------------------------------------------------------- fonts for the name */
const NAME_FONT: Record<'ja' | 'en' | 'zh', { family: string; weight: string; style: string; fallback: string }> = {
  ja: { family: 'Shippori Mincho B1', weight: '800', style: 'normal', fallback: '"Hiragino Mincho ProN", "Yu Mincho", serif' },
  zh: { family: 'Noto Serif SC', weight: '900', style: 'normal', fallback: '"Songti SC", "SimSun", serif' },
  en: { family: 'Bodoni Moda', weight: '600', style: 'italic', fallback: 'Georgia, serif' },
};
async function nameFont(lang: 'ja' | 'en' | 'zh', sample: string): Promise<string> {
  const f = NAME_FONT[lang];
  const spec = `${f.style} ${f.weight} 1em "${f.family}"`;
  try { await Promise.race([document.fonts.load(spec, sample), new Promise((r) => setTimeout(r, 1500))]); } catch { /* fallback faces */ }
  return `${f.style} ${f.weight} {size}px "${f.family}", ${f.fallback}`;
}

/* ---------------------------------------------------------------- drawing helpers */
interface Mis { dx: number; dy: number; rot: number }
function misregistration(seed: number, n: PlateN, maxPx: number): Mis {
  const r = stream(seed, 'print-plate:' + n);
  const sgn = () => (r() < 0.5 ? -1 : 1);
  return { dx: sgn() * r() * maxPx, dy: sgn() * r() * maxPx, rot: sgn() * r() * 0.3 * Math.PI / 180 };
}

function drawPlate(g: CanvasRenderingContext2D, img: HTMLImageElement, s: number, m: Mis | null): void {
  g.save();
  if (m) {
    g.translate(PRINT_W * s / 2 + m.dx, PRINT_H * s / 2 + m.dy);
    g.rotate(m.rot);
    g.translate(-PRINT_W * s / 2, -PRINT_H * s / 2);
  }
  g.drawImage(img, 0, 0, PRINT_W * s, PRINT_H * s);
  g.restore();
}

function cartoucheClip(g: CanvasRenderingContext2D, s: number): void {
  g.beginPath();
  g.rect(CARTOUCHE.x * s, CARTOUCHE.y * s, CARTOUCHE.w * s, CARTOUCHE.h * s);
  g.clip();
}

function drawMarbling(g: CanvasRenderingContext2D, src: HTMLCanvasElement, s: number): void {
  g.save();
  cartoucheClip(g, s);
  // a decorated-paper title slip: the marbling replaces the plate-6 ground inside the cartouche, drawn as a
  // centre crop of the visitor's tray (cover-fit, so the rings stay round)
  const bw = CARTOUCHE.w * s, bh = CARTOUCHE.h * s;
  const sw = src.width, sh = src.height;
  const scale = Math.max(bw / sw, bh / sh);
  const dw = sw * scale, dh = sh * scale;
  g.fillStyle = PAPER;
  g.fillRect(CARTOUCHE.x * s, CARTOUCHE.y * s, bw, bh);
  g.drawImage(src, CARTOUCHE.x * s + (bw - dw) / 2, CARTOUCHE.y * s + (bh - dh) / 2, dw, dh);
  g.restore();
}

async function drawName(g: CanvasRenderingContext2D, s: number, lang: 'ja' | 'en' | 'zh', name: string, onSlip: boolean): Promise<void> {
  const font = await nameFont(lang, name.replace(/\s+/g, ''));
  g.save();
  cartoucheClip(g, s);
  // without marbling the name is reversed out of the plate-6 ground (白抜き: the colour block is carved away
  // around the letters, so the paper shows); on a marbled slip it is printed in key-block ink
  g.fillStyle = onSlip ? KEY_INK : PAPER;
  g.textBaseline = 'middle';
  g.textAlign = 'center';
  const cx = (CARTOUCHE.x + CARTOUCHE.w / 2) * s;
  if (lang === 'en') {
    const [first = '', last = ''] = name.split(/\s+/);
    const size = 46;
    g.font = font.replace('{size}', String(size * s));
    g.translate(cx, (CARTOUCHE.y + CARTOUCHE.h / 2) * s);
    g.rotate(Math.PI / 2);                        // Western book-spine reading: top to bottom
    g.fillText(first, 0, -size * 0.62 * s);
    g.fillText(last, 0, size * 0.62 * s);
  } else {
    // vertical, hanging from the top of the slip; a half-em pause between family and given name
    const size = 64;
    g.font = font.replace('{size}', String(size * s));
    const gap = size * 0.18;
    let y = CARTOUCHE.y + 40 + size / 2;
    for (const part of name.split(/\s+/)) {
      for (const ch of part) {
        g.fillText(ch, cx, y * s);
        y += size + gap;
      }
      y += size * 0.35;
    }
  }
  g.restore();
}

/** Seal paste (印泥) on paper: the 湊 seal SVG tinted 紅, with seeded speckle loss scaled by (1 − pressure). */
async function drawSeal(g: CanvasRenderingContext2D, s: number, seed: number, seal: SealImpression | null): Promise<void> {
  const img = await loadImage('img/gen/seal-minato.svg');
  if (!img) return;
  const r = stream(seed, 'print-seal:' + (seal?.at ?? 0));
  const pressure = seal ? Math.min(1, Math.max(0.2, seal.pressure)) : 0.82;
  // SealImpression.rotation is in radians (three.js convention); a value beyond ±45° can only be degrees
  const sealRot = seal ? (Math.abs(seal.rotation) > Math.PI / 4 ? seal.rotation * Math.PI / 180 : seal.rotation) : 0;
  const rot = seal ? sealRot : (r() * 2 - 1) * 2.2 * Math.PI / 180;
  const w = Math.max(1, Math.round(SEAL_BOX.w * s)), h = Math.max(1, Math.round(SEAL_BOX.h * s));
  const off = document.createElement('canvas');
  off.width = w; off.height = h;
  const o = off.getContext('2d');
  if (!o) return;
  o.drawImage(img, 0, 0, w, h);
  o.globalCompositeOperation = 'source-in';
  o.fillStyle = SEAL_INK;
  o.fillRect(0, 0, w, h);
  // uneven paste: light pressure leaves more paper showing through
  o.globalCompositeOperation = 'destination-out';
  const specks = Math.round((1 - pressure) * 900 * s + 60 * s);
  for (let i = 0; i < specks; i++) {
    const x = r() * w, y = r() * h, rad = (0.4 + r() * 1.6) * Math.max(0.5, s * 1.4);
    o.globalAlpha = 0.25 + r() * 0.6;
    o.beginPath();
    o.arc(x, y, rad, 0, Math.PI * 2);
    o.fill();
  }
  g.save();
  g.globalCompositeOperation = 'multiply';
  g.globalAlpha = 0.78 + pressure * 0.2;
  g.translate((SEAL_BOX.x + SEAL_BOX.w / 2) * s, (SEAL_BOX.y + SEAL_BOX.h / 2) * s);
  g.rotate(rot);
  g.drawImage(off, -w / 2, -h / 2);
  g.restore();
}

/* ---------------------------------------------------------------- public API */
const renderTokens = new WeakMap<HTMLCanvasElement, number>();

/**
 * Draw today's print into `canvas` at `widthPx` CSS pixels wide (the canvas CSS size is set to match).
 * Later calls on the same canvas supersede earlier ones that are still loading.
 */
export async function renderPrint(canvas: HTMLCanvasElement, widthPx: number, opts: RenderPrintOptions = {}): Promise<void> {
  const c = ctxOf();
  const state = opts.state ?? c?.print;
  const lang = opts.lang ?? c?.lang ?? ((document.documentElement.dataset.lang as 'ja' | 'en' | 'zh') || 'ja');
  const token = (renderTokens.get(canvas) ?? 0) + 1;
  renderTokens.set(canvas, token);

  const dpr = opts.dpr ?? Math.min(2, window.devicePixelRatio || 1);
  const wCss = Math.max(1, widthPx);
  const hCss = Math.floor((wCss * PRINT_H) / PRINT_W + 1e-6);     // 120 → 176, 620 → 912, 1240 → 1824
  const W = Math.round(wCss * dpr), H = Math.round(hCss * dpr);
  const s = W / PRINT_W;

  const seed = state?.seed ?? 1;
  const inked = state?.inked ?? new Set<PlateN>([1]);
  const hidden = state?.hidden ?? new Set<PlateN>();
  const visible = (n: PlateN) => n === 1 || (inked.has(n) && !hidden.has(n));
  const plates = await Promise.all(([1, 2, 3, 4, 5, 6, 7, 8] as PlateN[]).map((n) => (visible(n) ? plateImg(n) : Promise.resolve(null))));
  if (renderTokens.get(canvas) !== token) return;

  // compose off-screen, then blit in one go (no half-drawn frames on screen)
  const off = document.createElement('canvas');
  off.width = W; off.height = H;
  const g = off.getContext('2d');
  if (!g) return;
  g.fillStyle = PAPER;
  g.fillRect(0, 0, W, H);

  // misregistration in print px: ±2 px on the thumbnail, ±6 px at full size (CSS px of the output)
  const maxMis = (wCss <= 240 ? 2 : wCss >= 1000 ? 6 : 2 + 4 * ((wCss - 240) / 760)) * dpr;
  g.globalCompositeOperation = 'multiply';
  for (const n of [2, 3, 4, 5, 6, 7] as PlateN[]) {
    const img = plates[n - 1];
    if (img) drawPlate(g, img, s, misregistration(seed, n, maxMis));
  }
  g.globalCompositeOperation = 'source-over';
  const gold = plates[7];
  if (gold) drawPlate(g, gold, s, misregistration(seed, 8, maxMis));

  const marble = state?.marbling?.canvas ?? null;
  const hasMarble = !!marble && marble.width > 0 && marble.height > 0;
  if (hasMarble) drawMarbling(g, marble!, s);

  const key = plates[0];
  if (key) drawPlate(g, key, s, null);

  const name = c?.content.person.name[lang] || (lang === 'en' ? 'Minato Segawa' : lang === 'zh' ? '濑川 凑' : '瀬川 湊');
  // the cartouche ground is plate 6; before it is inked the slip is bare paper, so the name prints in ink
  await drawName(g, s, lang, name, hasMarble || !visible(6));
  if (renderTokens.get(canvas) !== token) return;
  await drawSeal(g, s, seed, state?.seal ?? null);
  if (renderTokens.get(canvas) !== token) return;

  if (canvas.width !== W) canvas.width = W;
  if (canvas.height !== H) canvas.height = H;
  canvas.style.width = wCss + 'px';
  canvas.style.height = hCss + 'px';
  const out = canvas.getContext('2d');
  if (!out) return;
  out.clearRect(0, 0, W, H);
  out.drawImage(off, 0, 0);
}

/** Full-size PNG: 1240 × 1824 on desktop, 620 × 912 on coarse pointers (memory cap, §4.4). */
export async function printBlob(widthPx?: number): Promise<Blob | null> {
  const w = widthPx ?? (matchMedia('(pointer: coarse)').matches ? 620 : PRINT_W);
  const canvas = document.createElement('canvas');
  await renderPrint(canvas, w, { dpr: 1 });
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}

export async function downloadPrint(filename?: string): Promise<void> {
  const blob = await printBlob();
  if (!blob) return;
  const seed = ctxOf()?.print.seed ?? 0;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename ?? `hachidozuri-${seed.toString(36)}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
