/**
 * Skills — 組子 Joinery (DESIGN §6.5). Owner: WP-08. Node-safe (SSG): every word and number is in the HTML.
 *
 * Desktop (≥ 1024 px): the header, then a two-column grid — the sticky stage (cols 1–8) holds the 3 × 2 shoji
 * (five domain cells + Hokusai's pattern page) and the readout; the tool list (cols 9–12) scrolls beside it.
 * Below 1024 px the stage is in flow: the shoji (2 × 3 under 768 px), the readout, then the list.
 * The shoji frame box carries, in paint order: the static SVG lattice (generated from shoji.ts — the no-JS,
 * static-tier and context-loss picture), the `skills-kumiko` view placeholder, and the DOM SVG stack diagram
 * (diagram.ts) that the strips' shadow resolves into.
 */
import type { RenderCtx, SectionRender } from '../../core/types';
import type { Domain, Tool } from '../../content/types';
import { toolLabels } from '../../content/facts';
import { artboardHead, band, esc, langAttr, marks, printFigure, sectionOpen, viewSlot } from '../../render/helpers';
import { strings } from './strings';
import { C, DESKTOP, INLAY, MOBILE, K, buildShoji, cellOrigin, patternTile, type Layout, type PatternId, type Shoji } from './shoji';
import { DIAGRAMS, arrowPath, type Diagram } from './diagram';

/** Plate whose colour a domain's runs take when lit (§6.5 "tints to its domain's plate colour"). */
export const DOMAIN_PLATE: Readonly<Record<string, number>> = { web: 2, backend: 1, data: 6, infra: 7, practice: 4 };
/** The page of Hokusai Manga shown in the sixth cell: its lower right quarter (kikkō, asanoha and their construction). */
export const SPEC_CROP = { x: 1066 / 2000, y: 770 / 1544, w: 770 / 2000, h: 770 / 1544 } as const;
export const SPEC_FILE = 'hokusai/manga-pattern-construction.jpg';
const SPEC_SRC = 'img/hokusai/manga-pattern-construction.1280.webp';

const f = (n: number) => +n.toFixed(3);
const PATTERNS: PatternId[] = ['asanoha', 'kaku-asanoha', 'masu', 'kikko', 'mitsukude'];

function shojiFor(rc: RenderCtx, L: Layout): Shoji {
  const tools = rc.content.tools;
  const idx = (id: string) => tools.findIndex((t) => t.id === id);
  const cells = rc.content.domains.map((d) => ({
    pattern: d.pattern as PatternId,
    tools: tools.filter((t) => t.domain === d.id).map((t) => ({ id: t.id, years: t.years, projects: t.projects })),
  }));
  return buildShoji(L, cells, idx);
}

/** Shared SVG definitions (never display:none, so both layouts and the list glyphs can reference them). */
function defs(rc: RenderCtx, s: Shoji): string {
  const tools = rc.content.tools;
  let out = '';
  for (const p of PATTERNS) {
    const t = patternTile(p);
    const attrs = `patternUnits="userSpaceOnUse" x="${f(t.x)}" y="${f(t.y)}" width="${f(t.w)}" height="${f(t.h)}"`;
    out += `<pattern id="sk-p-${p}" ${attrs}><path class="sk-j" d="${t.jigumi}"/>${t.leaf ? `<path class="sk-l" d="${t.leaf}"/>` : ''}</pattern>`;
    out += `<pattern id="sk-s-${p}" ${attrs}><path class="sk-sh" d="${t.jigumi}${t.leaf}"/></pattern>`;
  }
  // one group per domain cell, in cell-local coordinates (both layouts <use> them)
  rc.content.domains.forEach((d, ci) => {
    const o = cellOrigin(s.layout, ci);
    let runs = '', inl = '';
    for (const r of s.runs.filter((x) => x.cell === ci)) {
      const id = tools[r.tool]!.id;
      runs += `<path class="sk-run" data-tool="${id}" d="${r.pts.map(([x, y], i) => `${i ? 'L' : 'M'}${f(x - o.x)} ${f(y - o.y)}`).join('')}"/>`;
      inl += `<path class="sk-inlay" data-tool="${id}" d="${r.inlays.map((p) => `M${f(p.x - o.x - INLAY / 2)} ${f(p.y - o.y)}h${INLAY}`).join('')}"/>`;
    }
    out += `<g id="sk-cell-${d.id}"><rect class="sk-paper" width="${C}" height="${C}"/>` +
      `<rect width="${C}" height="${C}" fill="url(#sk-s-${d.pattern})" transform="translate(.19 .23)"/>` +
      `<rect width="${C}" height="${C}" fill="url(#sk-p-${d.pattern})"/>${runs}${inl}</g>`;
  });
  return `<svg class="skills__defs" width="0" height="0" aria-hidden="true" focusable="false"><defs>${out}</defs></svg>`;
}

/** Waku and dividers as filled bands. */
function frameRects(L: Layout): string {
  let r = `<path class="sk-frame" fill-rule="evenodd" d="M0 0H${f(L.W)}V${f(L.H)}H0Z`;
  for (let i = 0; i < L.cols * L.rows; i++) { const o = cellOrigin(L, i); r += `M${f(o.x)} ${f(o.y)}h${C}v${C}h-${C}Z`; }
  return r + '"/>';
}

function lattice(rc: RenderCtx, L: Layout, variant: 'd' | 'm', alt: string): string {
  const domains = rc.content.domains;
  const id = `skills-lattice-${variant}`;
  const cells = domains.map((d, i) => { const o = cellOrigin(L, i); return `<use href="#sk-cell-${d.id}" x="${f(o.x)}" y="${f(o.y)}"/>`; }).join('');
  const o6 = cellOrigin(L, 5);
  // Hokusai's page in the sixth cell, cropped to its lower right quarter (image px of the 2000 × 1544 master)
  const page = `<svg x="${f(o6.x)}" y="${f(o6.y)}" width="${C}" height="${C}" viewBox="1066 770 770 770" preserveAspectRatio="xMidYMid slice">` +
    `<image vite-ignore href="${rc.url(SPEC_SRC)}" width="2000" height="1544" data-file="${SPEC_FILE}"/></svg>`;
  return `<svg class="skills__lattice skills__lattice--${variant}" viewBox="0 0 ${f(L.W)} ${f(L.H)}" role="img" aria-labelledby="${id}">` +
    `<title id="${id}">${esc(alt)}</title>${cells}${page}${frameRects(L)}</svg>`;
}

function diagramSvg(rc: RenderCtx, d: Diagram, variant: 'd' | 'm'): string {
  const L = rc.lang;
  const s = strings[L];
  const c = rc.content.copy.skills;
  const label = (id: string) => toolLabels[id]?.[L] ?? id;
  const mobile = variant === 'm';
  const fs = mobile ? 0.8 : 0.62, fc = mobile ? 0.56 : 0.42;
  let g = '';
  for (const b of d.boxes) {
    g += `<rect class="sk-d-box" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}"/>`;
    const names = b.toolIds.map(label);
    const tall = b.h > b.w * 1.6;
    const cx = f(b.x + b.w / 2);
    const lines = tall ? names : [names.join(' · ')];
    // fit the longest line into the box (Martian Mono advance ≈ 0.66 em)
    const fb = f(Math.min(fs, (b.w - 0.6) / (Math.max(...lines.map((n) => n.length)) * 0.66)));
    const top = b.y + b.h / 2 - ((lines.length - 1) * fb * 1.3) / 2 + fb * 0.1;
    lines.forEach((n, i) => { g += `<text class="sk-d-name" x="${cx}" y="${f(top + i * fb * 1.3)}" font-size="${fb}" text-anchor="middle">${esc(n)}</text>`; });
    g += `<text class="sk-d-role" x="${f(b.x + 0.32)}" y="${f(b.y + b.h - 0.34)}" font-size="${fc}">${esc(s.diagram[b.role])}</text>`;
  }
  for (const e of d.edges) {
    g += `<path class="sk-d-edge${e.dashed ? ' sk-d-dash' : ''}" d="${e.pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join('')}"/>`;
    if (e.arrow) g += `<path class="sk-d-edge" d="${arrowPath(e)}"/>`;
  }
  g += `<text class="sk-d-role" x="${d.request.x}" y="${d.request.y}" font-size="${fc}" text-anchor="${d.request.anchor}">${esc(s.diagram.request)}</text>`;
  const id = `skills-diagram-${variant}`;
  return `<svg class="skills__diagram skills__diagram--${variant}" viewBox="0 0 ${f(d.layout.W)} ${f(d.layout.H)}" role="img" aria-labelledby="${id}-t ${id}-d" lang="${langAttr(L)}">` +
    `<title id="${id}-t">${esc(c.architectureToggle[L])}</title><desc id="${id}-d">${esc(c.architectureCaption[L])}</desc>${g}</svg>`;
}

/** A tiny motif of the domain's pattern (2 × 2 pitches of the same tile) beside its heading. */
const glyph = (p: string) =>
  `<svg class="skills__glyph" viewBox="4 4 2 2" aria-hidden="true" focusable="false"><rect x="4" y="4" width="2" height="2" fill="url(#sk-p-${p})"/></svg>`;

function toolRow(rc: RenderCtx, t: Tool, ti: number, first: boolean): string {
  const c = rc.content.copy.skills;
  const L = rc.lang;
  const s = strings[L];
  const name = toolLabels[t.id]?.[L] ?? t.name;
  const stale = t.lastProduction !== '2026' ? ' is-past' : '';
  // en units agree with the number (1 year, 1 project); ja/zh units have no plural
  const unit = (n: number, u: string) => (L === 'en' && n === 1 ? u.replace(/s$/, '') : u);
  const yu = unit(t.years, c.yearsUnit[L]), pu = unit(t.projects, c.projectsUnit[L]);
  return (
    `<li class="skt${stale}" data-tool="${t.id}" data-ti="${ti}" data-years="${t.years}" data-projects="${t.projects}" data-last="${t.lastProduction}" data-yu="${esc(yu)}" data-pu="${esc(pu)}" tabindex="${first ? 0 : -1}">` +
    `<span class="skt__name">${esc(name)}</span>` +
    `<span class="skt__years"><span class="visually-hidden">${esc(s.colYears)} </span><span class="skt__n">${t.years}</span><span class="skt__u">${esc(yu)}</span></span>` +
    `<span class="skt__last"><span class="visually-hidden">${esc(c.lastUsed[L])} </span>${esc(t.lastProduction)}</span>` +
    `<span class="skt__projects"><span class="visually-hidden">${esc(s.colProjects)} </span>${t.projects}<span class="skt__u">${esc(pu)}</span></span>` +
    `<span class="skt__scale">${esc(t.scale[L])}</span>` +
    `</li>`
  );
}

function domainBlock(rc: RenderCtx, d: Domain, firstTool: { done: boolean }): string {
  const L = rc.lang;
  const c = rc.content.copy.skills;
  const tools = rc.content.tools;
  const rows = tools.map((t, i) => ({ t, i })).filter(({ t }) => t.domain === d.id).map(({ t, i }) => {
    const r = toolRow(rc, t, i, !firstTool.done);
    firstTool.done = true;
    return r;
  }).join('');
  const legend = d.id === 'web' || d.id === 'backend' ? ` skills__domain--legend skills__domain--${d.id === 'web' ? 'asanoha' : 'sayagata'}` : '';
  const kikko = d.id === 'infra' ? printFigure(rc, c.kikkoFigure, { sizes: '128px', className: 'skills__kikko' }) : '';
  return (
    `<section class="skills__domain${legend}" data-domain="${d.id}" style="--dp:var(--plate-${DOMAIN_PLATE[d.id]})" aria-labelledby="skills-d-${d.id}">` +
    `<h3 id="skills-d-${d.id}" class="skills__domain-title display">${glyph(d.pattern)}<span class="skills__domain-name">${esc(d.name[L])}</span></h3>` +
    `<p class="skills__pattern"><span class="skills__pattern-name">${esc(d.patternName[L])}</span> — ${esc(d.why[L])}</p>` +
    kikko +
    `<ul class="skills__tools">${rows}</ul>` +
    `</section>`
  );
}

export const render: SectionRender = (rc) => {
  const c = rc.content.copy.skills;
  const L = rc.lang;
  const s = strings[L];
  const sd = shojiFor(rc, DESKTOP);
  const firstTool = { done: false };
  const domains = rc.content.domains.map((d) => domainBlock(rc, d, firstTool)).join('');
  const alt = `${s.lattice} — ${rc.t(c.specFigure.alt)}`;
  const counts = sd.segs.reduce((m, g) => { m[g.k] = (m[g.k] ?? 0) + 1; return m; }, {} as Record<number, number>);
  return (
    sectionOpen('skills', { sticky: true }) +
    artboardHead(rc, { id: 'skills', title: c.title, stage: c.stage, takeaway: c.takeaway, plate: 2 }) +
    `<div class="skills__grid">` +
    `<div class="skills__stage">` +
    `<figure class="skills__shoji" data-segs="${sd.segs.length}" data-runs="${counts[K.run] ?? 0}" data-inlays="${counts[K.inlay] ?? 0}">` +
    `<div class="skills__frame" data-select>` +
    defs(rc, sd) +
    lattice(rc, DESKTOP, 'd', alt) +
    lattice(rc, MOBILE, 'm', alt) +
    viewSlot(rc, 'skills-kumiko', { className: 'skills__view' }) +
    `<div class="skills__arch-fig" id="skills-diagram">${diagramSvg(rc, DIAGRAMS.desktop, 'd')}${diagramSvg(rc, DIAGRAMS.mobile, 'm')}</div>` +
    `</div>` +
    `<figcaption class="skills__spec">${esc(rc.t(c.specFigure.caption))}</figcaption>` +
    `</figure>` +
    `<p class="skills__readout" id="skills-readout" aria-live="polite" data-hint="${esc(s.hint)}" data-last="${esc(c.lastUsed[L])}">${esc(s.hint)}</p>` +
    `</div>` +
    `<div class="skills__list" role="group" aria-label="${esc(s.tools)}">` +
    `<p class="skills__cols" aria-hidden="true"><span>${esc(s.colYears)}</span><span>${esc(s.colLast)}</span><span>${esc(s.colProjects)}</span></p>` +
    domains +
    `<div class="skills__arch">` +
    `<button type="button" class="skills__toggle js-only" aria-pressed="false" aria-controls="skills-diagram">${rc.icon('outline')}<span>${esc(c.architectureToggle[L])}</span></button>` +
    `<p class="skills__caption">${esc(c.architectureCaption[L])}</p>` +
    `</div>` +
    printFigure(rc, c.learnFigure, { sizes: '(min-width: 1024px) 280px, 60vw', className: 'skills__learn' }) +
    `</div>` +
    `</div>` +
    marks() +
    band('skills-principles') +
    `</section>`
  );
};
