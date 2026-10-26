/**
 * Sangaku diagram kit (DESIGN §6.4 case pages, §12 #23, §5.2 引く). Owner: WP-07. Node-safe.
 *
 * A diagram is a list of primitives in compass-and-ruler order, the way a sangaku tablet (算額) or an
 * Illustrator construction is drawn: phase 0 construction circles and guides (浅葱) → 1 lines (紺) →
 * 2 intersections (躑躅, labelled "intersect") → 3 anchors and handles → 4 fills (plate tints, which the
 * Separations panel can lift off). Labels are plain SVG text, present from the first paint and never
 * animated; strokes carry pathLength="1" and an order index `--i`, so CSS can draw them in sequence.
 */
import type { Lang, PlateN } from '../../../core/types';
import type { T } from '../../../content/types';
import { esc } from '../../../render/helpers';

export type Phase = 0 | 1 | 2 | 3 | 4;
export type Pt = readonly [number, number];

export type Prim =
  | { k: 'circle'; ph: Phase; c: Pt; r: number; dash?: boolean }
  | { k: 'line'; ph: Phase; a: Pt; b: Pt; arrow?: boolean; dash?: boolean; heavy?: boolean; warn?: boolean }
  | { k: 'path'; ph: Phase; d: string; arrow?: boolean; dash?: boolean; heavy?: boolean; warn?: boolean; fill?: PlateN; closed?: boolean }
  | { k: 'rect'; ph: Phase; x: number; y: number; w: number; h: number; fill?: PlateN; dash?: boolean; heavy?: boolean; paper?: boolean }
  | { k: 'cyl'; ph: Phase; x: number; y: number; w: number; h: number; fill?: PlateN }
  | { k: 'x'; ph: Phase; c: Pt; label?: boolean }
  | { k: 'anchor'; ph: Phase; c: Pt; handle?: Pt };

export interface Label {
  at: Pt;
  t: T | string;
  /** text-anchor */
  a?: 'start' | 'middle' | 'end';
  /** lbl = body 12, head = 13 medium, num = mono, small = 10.5, warn = 銀朱 */
  s?: 'lbl' | 'head' | 'num' | 'small' | 'warn' | 'guide';
  /** max characters per line before wrapping on spaces (en) */
  wrap?: number;
  /** a knock-out in the tablet's paper colour behind the letters, for a label that lines pass under */
  halo?: boolean;
}

export interface Diagram {
  id: string;
  w: number;
  h: number;
  title: T;
  desc: T;
  prims: Prim[];
  labels: Label[];
}

const PHASE_CLASS = ['dg-c', 'dg-l', 'dg-x', 'dg-a', 'dg-f'] as const;
const f1 = (n: number) => (Math.round(n * 10) / 10).toString();

function text(l: Label, lang: Lang): string {
  const raw = typeof l.t === 'string' ? l.t : l.t[lang];
  const cls = `dg-t dg-t--${l.s ?? 'lbl'}${l.halo ? ' dg-t--halo' : ''}`;
  const anchor = l.a ?? 'start';
  const lines: string[] = [];
  if (l.wrap && lang === 'en' && raw.length > l.wrap) {
    let cur = '';
    for (const w of raw.split(' ')) {
      if ((cur + ' ' + w).trim().length > l.wrap && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim();
    }
    if (cur) lines.push(cur);
  } else if (raw.includes('\n')) lines.push(...raw.split('\n'));
  else lines.push(raw);
  const lh = l.s === 'small' || l.s === 'guide' ? 13 : 15.5;
  const tspans = lines.map((s, i) => `<tspan x="${f1(l.at[0])}" dy="${i === 0 ? 0 : lh}">${esc(s)}</tspan>`).join('');
  return `<text class="${cls}" x="${f1(l.at[0])}" y="${f1(l.at[1])}" text-anchor="${anchor}">${tspans}</text>`;
}

function prim(p: Prim, i: number): string {
  const cls = PHASE_CLASS[p.ph];
  const st = ` style="--i:${i}"`;
  // dashed strokes keep their own dash pattern: they fade in instead of drawing (no pathLength)
  const dashed = 'dash' in p && !!p.dash;
  const pl = dashed ? '' : ' pathLength="1"';
  const mods = (o: { dash?: boolean; heavy?: boolean; warn?: boolean }) =>
    `${o.dash ? ' dg-dash dg-fade' : ''}${o.heavy ? ' dg-heavy' : ''}${o.warn ? ' dg-warn' : ''}`;
  switch (p.k) {
    case 'circle':
      return `<circle class="${cls} dg-s${p.dash ? ' dg-dash dg-fade' : ''}" cx="${f1(p.c[0])}" cy="${f1(p.c[1])}" r="${f1(p.r)}"${pl}${st}/>`;
    case 'line':
      return `<line class="${cls} dg-s${mods(p)}" x1="${f1(p.a[0])}" y1="${f1(p.a[1])}" x2="${f1(p.b[0])}" y2="${f1(p.b[1])}"${pl}${p.arrow ? ' marker-end="url(#dg-arrow)"' : ''}${st}/>`;
    case 'path': {
      if (p.fill) return `<path class="dg-f dg-fill dg-fade" d="${p.d}" data-plate="${p.fill}"${st}/>`;
      return `<path class="${cls} dg-s${mods(p)}" d="${p.d}"${pl}${p.arrow ? ' marker-end="url(#dg-arrow)"' : ''}${st}/>`;
    }
    case 'rect': {
      if (p.fill) return `<rect class="dg-f dg-fill dg-fade" x="${f1(p.x)}" y="${f1(p.y)}" width="${f1(p.w)}" height="${f1(p.h)}" data-plate="${p.fill}"${st}/>`;
      return `<rect class="${cls} dg-s${mods(p)}${p.paper ? ' dg-paper' : ''}" x="${f1(p.x)}" y="${f1(p.y)}" width="${f1(p.w)}" height="${f1(p.h)}"${pl}${st}/>`;
    }
    case 'cyl': {
      const { x, y, w, h } = p;
      const ry = Math.min(7, h * 0.18);
      const body = `M${f1(x)} ${f1(y + ry)}v${f1(h - 2 * ry)}a${f1(w / 2)} ${f1(ry)} 0 0 0 ${f1(w)} 0v${f1(-(h - 2 * ry))}`;
      const top = `M${f1(x)} ${f1(y + ry)}a${f1(w / 2)} ${f1(ry)} 0 1 0 ${f1(w)} 0a${f1(w / 2)} ${f1(ry)} 0 1 0 ${f1(-w)} 0`;
      const sil = `M${f1(x)} ${f1(y + ry)}v${f1(h - 2 * ry)}a${f1(w / 2)} ${f1(ry)} 0 0 0 ${f1(w)} 0v${f1(-(h - 2 * ry))}a${f1(w / 2)} ${f1(ry)} 0 0 0 ${f1(-w)} 0Z`;
      const fill = p.fill ? `<path class="dg-f dg-fill dg-fade" d="${sil}" data-plate="${p.fill}"${st}/>` : '';
      return fill + `<path class="${cls} dg-s dg-paper" d="${body}"${pl}${st}/><path class="${cls} dg-s" d="${top}"${pl}${st}/>`;
    }
    case 'x': {
      const [cx, cy] = p.c;
      const s = 4.5;
      return `<g class="dg-x dg-fade"${st}><path class="dg-xmark" d="M${f1(cx - s)} ${f1(cy - s)}L${f1(cx + s)} ${f1(cy + s)}M${f1(cx + s)} ${f1(cy - s)}L${f1(cx - s)} ${f1(cy + s)}"/>` +
        (p.label ? `<text class="dg-t dg-t--mag" x="${f1(cx + 7)}" y="${f1(cy - 7)}">intersect</text>` : '') + `</g>`;
    }
    case 'anchor': {
      const [cx, cy] = p.c;
      const h = p.handle ? `<line class="dg-handle" x1="${f1(cx)}" y1="${f1(cy)}" x2="${f1(p.handle[0])}" y2="${f1(p.handle[1])}"/><circle class="dg-handle-end" cx="${f1(p.handle[0])}" cy="${f1(p.handle[1])}" r="2"/>` : '';
      return `<g class="dg-a dg-fade"${st}>${h}<rect class="dg-anchor" x="${f1(cx - 2.5)}" y="${f1(cy - 2.5)}" width="5" height="5"/></g>`;
    }
  }
}

/** The `<svg>` of a diagram: phase-ordered groups, order indices for the draw-in, title and desc. */
export function renderDiagram(d: Diagram, lang: Lang, ariaLabel: string): string {
  const ordered = [...d.prims].sort((a, b) => a.ph - b.ph);
  // fills are drawn first in the DOM (under the lines) but appear last in time
  const fills = ordered.map((p, i) => ({ p, i })).filter(({ p }) => p.ph === 4);
  const rest = ordered.map((p, i) => ({ p, i })).filter(({ p }) => p.ph !== 4);
  const t = esc(d.title[lang]);
  const desc = esc(d.desc[lang]);
  const html = (
    `<svg class="dg" viewBox="0 0 ${d.w} ${d.h}" role="img" aria-labelledby="dg-${d.id}-t dg-${d.id}-d" style="--n:${ordered.length}">` +
    `<title id="dg-${d.id}-t">${esc(ariaLabel)}: ${t}</title><desc id="dg-${d.id}-d">${desc}</desc>` +
    `<defs><marker id="dg-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="dg-arrowhead" d="M1 1.5L9 5L1 8.5"/></marker></defs>` +
    `<g class="dg-g-fills" aria-hidden="true">${fills.map(({ p, i }) => prim(p, i)).join('')}</g>` +
    `<g class="dg-g-strokes" aria-hidden="true">${rest.map(({ p, i }) => prim(p, i)).join('')}</g>` +
    `<g class="dg-g-labels">${d.labels.map((l) => text(l, lang)).join('')}</g>` +
    `</svg>`
  );
  return html.replace(/dg-arrow\b/g, `dg-arrow-${d.id}`);
}

/* ---- small geometry helpers ---- */
export const P = (x: number, y: number): Pt => [x, y];
export const arcPath = (c: Pt, r: number, a0: number, a1: number): string => {
  const p0: Pt = [c[0] + r * Math.cos(a0), c[1] + r * Math.sin(a0)];
  const p1: Pt = [c[0] + r * Math.cos(a1), c[1] + r * Math.sin(a1)];
  const large = Math.abs(a1 - a0) > Math.PI ? 1 : 0;
  const sweep = a1 > a0 ? 1 : 0;
  return `M${f1(p0[0])} ${f1(p0[1])}A${f1(r)} ${f1(r)} 0 ${large} ${sweep} ${f1(p1[0])} ${f1(p1[1])}`;
};
export const poly = (pts: readonly Pt[], closed = false): string =>
  pts.map((p, i) => `${i ? 'L' : 'M'}${f1(p[0])} ${f1(p[1])}`).join('') + (closed ? 'Z' : '');
/** Isometric projection (吹抜屋台 walkthrough): x right-down, y left-down, z up; 30° axes. */
export const iso = (x: number, y: number, z: number, o: Pt = [0, 0], s = 1): Pt => [
  o[0] + (x - y) * Math.cos(Math.PI / 6) * s,
  o[1] + (x + y) * Math.sin(Math.PI / 6) * s - z * s,
];
export const t3 = (ja: string, en: string, zh: string): T => ({ ja, en, zh });
