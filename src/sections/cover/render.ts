/**
 * Cover — 表紙 · 摺上り The Impression (DESIGN §6.1, band cover-summary §2.2). Owner: WP-05. Node-safe (SSG).
 *
 * Every fact is HTML at first paint: role, takeaway, the facts list, express links, and the print sheet with the
 * name (the page's only h1, the LCP element), the role column and the Tōkaidō key line (an <ol> of years and
 * stations over an aria-hidden SVG line). The crest construction is CSS-only (style.css), so it runs without JS.
 *
 * Structure (sticky stage = the header):
 *   header.artboard__stage.cover__stage
 *     .cover__crest      construction SVG (circles → radii → "intersect" → anchors → fill), aria-hidden
 *     .cover__facts      role · takeaway · dl · express links
 *     .cover__sheet      positioning box with トンボ / 見当 marks
 *       .cover__still    carved-block still (static tier, reduced motion, CSS-peel fallback), aria-hidden
 *       .cover__paper    the printed sheet (deckle mask, container for cq units): crest, h1, role, key line
 *       .cover__curl     the CSS-peel flap (software tier), aria-hidden
 *       .cover__corner   "Lift the corner" button (scrolls to the peel)
 *       .cover__caption  blockCaption, shown with the carved block
 *   .view.cover__view    WebGL placeholder: absolute, from the artboard top over cols 6–12 and down past the
 *                        cover into the summary, so the block flip can land on the summary figure (§2.2).
 *   marks · band cover-summary
 */
import type { RenderCtx, SectionRender, Lang } from '../../core/types';
import { HTML_LANG } from '../../core/types';
import { band, esc, marks, sectionOpen, stageLine, viewSlot } from '../../render/helpers';
import crest from '../../../assets-src/svg/crest.json';
import { strings } from './strings';

/** Key-line years (constants, §6.1) and where each sits on the road (fraction of the line, right → left). */
export const KEY_YEARS = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026] as const;
const STATION_AT: readonly { id: string; year: number }[] = [
  { id: 'nihonbashi', year: 2018 }, { id: 'hakone', year: 2019 }, { id: 'mishima', year: 2020 }, { id: 'hara', year: 2021 },
  { id: 'shimada', year: 2022 }, { id: 'okazaki', year: 2023 }, { id: 'shono', year: 2024.5 }, { id: 'kyoto', year: 2026 },
];
/** Road profile (viewBox 0 0 1000 120): the Hakone pass rises, the coast runs low, Shōno climbs a little. */
const ROAD_Y: Readonly<Record<number, number>> = { 2018: 66, 2019: 44, 2020: 60, 2021: 66, 2022: 63, 2023: 61, 2024: 56, 2025: 59, 2026: 62 };
const X0 = 968, X1 = 32;
const yearX = (y: number) => X0 - ((y - 2018) / 8) * (X0 - X1);
function roadY(year: number): number {
  const a = Math.floor(year), b = Math.min(2026, a + 1), t = year - a;
  return (ROAD_Y[a] ?? 60) * (1 - t) + (ROAD_Y[b] ?? 60) * t;
}

/** Smooth Catmull-Rom path through the yearly points, drawn right (Edo) → left (Kyoto). */
function roadPath(): string {
  const pts: [number, number][] = [[992, 67], ...KEY_YEARS.map((y) => [yearX(y), ROAD_Y[y]!] as [number, number]), [8, 62]];
  let d = `M${pts[0]![0]} ${pts[0]![1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]!, p1 = pts[i]!, p2 = pts[i + 1]!, p3 = pts[Math.min(pts.length - 1, i + 2)]!;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0]!.toFixed(1)} ${c1[1]!.toFixed(1)} ${c2[0]!.toFixed(1)} ${c2[1]!.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

/* ------------------------------------------------------------------ crest */
type Pt = [number, number];
const C = crest as unknown as {
  centre: Pt; R: number;
  circles: { id: string; r: number }[];
  radii: { from: Pt; to: Pt }[];
  intersections: { id: string; at: Pt }[];
  anchors: Pt[];
  paths: { ring: string; strips: string[] };
};
const f1 = (n: number) => (Math.round(n * 100) / 100).toString();

/** The printed crest (ring + six half-lapped strips), filled with currentColor. */
export function crestPaths(): string {
  return `<path d="${C.paths.ring}" fill-rule="evenodd"/>` + C.paths.strips.map((d) => `<path d="${d}"/>`).join('');
}

/** Compass-and-ruler construction of 丸に三つ組子 (§6.1 2D motion, WP-02 R4 / WP-04 R12: triangle points down ▽). */
function crestConstruction(label: string): string {
  const [cx, cy] = C.centre;
  const circles = C.circles.map((c, i) =>
    `<circle class="cc-guide cc-draw" style="--i:${i}" cx="${cx}" cy="${cy}" r="${f1(c.r)}" pathLength="1"/>`).join('');
  const radii = C.radii.map((r, i) =>
    `<path class="cc-guide cc-draw cc-radius" style="--i:${i}" d="M${f1(r.from[0])} ${f1(r.from[1])}L${f1(r.to[0])} ${f1(r.to[1])}" pathLength="1"/>`).join('');
  const ints = C.intersections.map((p, i) =>
    `<g class="cc-int" style="--i:${i}"><rect x="${f1(p.at[0] - 2.4)}" y="${f1(p.at[1] - 2.4)}" width="4.8" height="4.8"/>` +
    `<text x="${f1(p.at[0] + 4.5)}" y="${f1(p.at[1] + 12)}">${esc(label)}</text></g>`).join('');
  // ring anchors with Bézier handles (kappa 0.5523), then the strip outline anchors
  const ringAnchors = C.circles.slice(0, 2).map((c) => [0, 90, 180, 270].map((deg) => {
    const a = (deg * Math.PI) / 180, k = c.r * 0.5523;
    const x = cx + Math.cos(a) * c.r, y = cy + Math.sin(a) * c.r;
    const tx = -Math.sin(a) * k, ty = Math.cos(a) * k;
    return `<path class="cc-handle" d="M${f1(x - tx)} ${f1(y - ty)}L${f1(x + tx)} ${f1(y + ty)}"/>` +
      `<circle class="cc-hdot" cx="${f1(x - tx)}" cy="${f1(y - ty)}" r="1.2"/><circle class="cc-hdot" cx="${f1(x + tx)}" cy="${f1(y + ty)}" r="1.2"/>` +
      `<rect class="cc-anchor" x="${f1(x - 1.9)}" y="${f1(y - 1.9)}" width="3.8" height="3.8"/>`;
  }).join('')).join('');
  const stripAnchors = C.anchors.map((p, i) =>
    `<rect class="cc-anchor" style="--j:${i % 8}" x="${f1(p[0] - 1.9)}" y="${f1(p[1] - 1.9)}" width="3.8" height="3.8"/>`).join('');
  return (
    `<svg class="cc" viewBox="-6 -6 112 112" width="64" height="64" focusable="false">` +
    `<g class="cc-fill">${crestPaths()}</g>` +
    `<g class="cc-guides">${circles}${radii}</g>` +
    `<g class="cc-anchors">${ringAnchors}${stripAnchors}</g>` +
    `<g class="cc-ints">${ints}</g>` +
    `</svg>`
  );
}

/* ------------------------------------------------------------------ the sheet */
function nameHtml(rc: RenderCtx): string {
  const p = rc.content.person;
  const c = rc.content.copy.cover;
  if (rc.lang === 'ja') {
    const parts = c.nameLines.ja.split('|');
    const ruby = p.nameRuby.split(' ');
    const inner = parts.map((s, i) => `<ruby>${esc(s)}<rt>${esc(ruby[i] ?? '')}</rt></ruby>`).join('<span class="cover__gap"> </span>');
    return `<h1 id="cover-title" class="display cover__name tate" data-select>${inner}</h1>`;
  }
  if (rc.lang === 'zh') {
    // Chinese sets the surname and given name solid (濑川凑), without the Japanese word space
    return `<h1 id="cover-title" class="display cover__name tate" data-select>${esc(c.nameLines.zh.replace('|', ''))}</h1>`;
  }
  const lines = c.nameLines.en.split('|').map((s) => `<span class="cover__line">${esc(s)}</span>`).join(' ');
  return `<h1 id="cover-title" class="display cover__name cover__name--en" data-select>${lines}</h1>` +
    `<div class="cover__cols"><p class="cover__name-ja tate" lang="ja">${esc(p.name.ja)}</p></div>`;
}

function keyLine(rc: RenderCtx): string {
  const L = rc.lang;
  const st = rc.content.stations;
  const name = (id: string) => st.find((x) => x.id === id)?.name[L] ?? '';
  const ticks = KEY_YEARS.map((y, i) => {
    const x = yearX(y), ry = roadY(y);
    return `<path class="kl-tick" style="--i:${i}" data-plate="1" d="M${f1(x)} ${f1(ry - 7)}V${f1(ry + 7)}"/>`;
  }).join('');
  const svg = `<svg class="kl-svg" viewBox="0 0 1000 120" preserveAspectRatio="none" aria-hidden="true" focusable="false">` +
    `<path class="kl-road" d="${roadPath()}" pathLength="1"/>${ticks}</svg>`;
  const years = KEY_YEARS.map((y) =>
    `<span class="kl-yr" style="--x:${(yearX(y) / 1000).toFixed(4)};--y:${(roadY(y) / 120).toFixed(4)}">${y}</span>`).join('');
  const stations = STATION_AT.map((s) => {
    const label = name(s.id);
    return `<span class="kl-st" style="--x:${(yearX(s.year) / 1000).toFixed(4)};--y:${(roadY(s.year) / 120).toFixed(4)}" lang="${HTML_LANG[L]}">${esc(label)}</span>`;
  }).join('');
  // the accessible form: an ordered list "2018 日本橋 … 2026 京師" (visually the labels above)
  const items = STATION_AT.map((s) => `<li>${s.year === 2024.5 ? '2024–25' : s.year} ${esc(name(s.id))}</li>`).join('');
  return `<div class="cover__keyline">${svg}<div class="kl-labels" aria-hidden="true">${stations}${years}</div>` +
    `<ol class="visually-hidden" aria-label="${esc(strings[L].keyLine)}">${items}</ol></div>`;
}

function sheet(rc: RenderCtx): string {
  const p = rc.content.person;
  const c = rc.content.copy.cover;
  const st = strings[rc.lang];
  const role = rc.lang === 'en' ? '' : `<p class="cover__role-v tate">${esc(p.role[rc.lang])}</p>`;
  return (
    `<div class="cover__sheet tombo kento">` +
    `<p class="cover__label" aria-hidden="true">${esc(st.sheetLabel)}</p>` +
    `<div class="cover__still" role="img" aria-label="${esc(st.blockAlt)}"></div>` +
    `<div class="cover__paper deckle" data-paper>` +
    `<svg class="cover__mon" viewBox="0 0 100 100" aria-hidden="true" focusable="false">${crestPaths()}</svg>` +
    (rc.lang === 'en' ? nameHtml(rc) : `<div class="cover__cols">${nameHtml(rc)}${role}</div>`) +
    keyLine(rc) +
    `</div>` +
    `<div class="cover__curl" aria-hidden="true"></div>` +
    `<button class="cover__corner cur-baren" type="button" aria-label="${esc(c.peelHint[rc.lang])}"><span>${esc(c.peelHint[rc.lang])}</span></button>` +
    `<p class="cover__caption${rc.lang === 'en' ? '' : ' tate'}">${esc(c.blockCaption[rc.lang])}</p>` +
    `</div>`
  );
}

export const render: SectionRender = (rc) => {
  const c = rc.content.copy.cover;
  const L = rc.lang;
  const st = strings[L];
  const cv = (l: Lang) => `<a href="${rc.url(`cv/cv-${l}.pdf`)}" hreflang="${HTML_LANG[l]}" type="application/pdf">${esc(rc.content.copy.contact.cv[l][L])}</a>`;
  return (
    sectionOpen('cover', { sticky: true }) +
    `<header class="artboard__head artboard__stage cover__stage">` +
    `<div class="cover__crest" aria-hidden="true">${crestConstruction(st.intersect)}</div>` +
    stageLine(rc, c.stage, 'cover__stage-line') +
    `<div class="cover__facts">` +
    `<p class="cover__role">${esc(c.role[L])}</p>` +
    `<p class="takeaway">${esc(c.takeaway[L])}</p>` +
    `<dl class="cover__dl" aria-label="${esc(st.facts)}">` +
    `<div><dt>${esc(st.dt.years)}</dt><dd>${esc(c.facts.years[L])}</dd></div>` +
    `<div><dt>${esc(st.dt.specialty)}</dt><dd>${esc(c.facts.specialty[L])}</dd></div>` +
    `<div><dt>${esc(st.dt.location)}</dt><dd>${esc(c.facts.location[L])} <time class="jst-clock" data-jst-clock aria-live="off" aria-label="${esc(st.clockLabel)}"></time></dd></div>` +
    `<div><dt>${esc(st.dt.availability)}</dt><dd>${esc(c.facts.availability[L])}</dd></div>` +
    `<div><dt>${esc(st.dt.languages)}</dt><dd>${esc(c.facts.languages[L])}</dd></div>` +
    `</dl>` +
    `<p class="cover__express"><a href="#works">${esc(c.express.works[L])}</a>` +
    `<span class="cover__cv">${esc(st.cvPdf)} ${cv('ja')} ${cv('en')} ${cv('zh')}</span>` +
    `<a href="#contact">${esc(c.express.contact[L])}</a></p>` +
    `</div>` +
    sheet(rc) +
    `</header>` +
    // no generic poster: the cover's fallbacks are the DOM sheet and the carved-block still (style.css)
    viewSlot(rc, 'cover-block', { className: 'cover__view' }).replace(/ data-poster-[a-z-]+="[^"]*"/g, '').replace(/ style="[^"]*"/, '') +
    marks() +
    band('cover-summary') +
    `</section>`
  );
};
