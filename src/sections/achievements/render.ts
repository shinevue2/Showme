/**
 * Achievements — 番付・空摺 Seen and Unseen (DESIGN §6.7). Owner: WP-09. Node-safe SSR.
 *
 * 1. 見立番付: one semantic <table> (rank × East/West). ja/zh ≥ 768 px lay its cells out as an Edo ranking
 *    sheet (CSS grid: 大関 at the outer edges, 前頭 on the lower tier, the centre column 八年 + date, vertical
 *    Kaisei Tokumin / Noto Serif SC); en is a plain two-column table; < 768 px every language stacks 東 then 西.
 *    Explicit ARIA roles keep the table semantics while the cells are re-flowed (display: contents rows).
 * 2. The press: the `achievements-press` view under four seals, three 砂子 charts and the 空摺 strip. Every
 *    number is DOM text; the SVG impressions and hatched bars are the static-tier picture (hidden while the
 *    view is live), each chart has a <table>, the reliability list is the karazuri's text.
 * 3. Credentials as a <dl>; the achievements-writing band (loose gold sliding off the edge).
 */
import type { Lang, SectionRender } from '../../core/types';
import type { BanzukeEntry, Chart, Metric } from '../../content/types';
import { artboardHead, esc, marks, printFigure, sectionOpen } from '../../render/helpers';
import { SEAL_BORDER, sealLayout } from '../../gl/seal/layout';
import { LINE_W, PLOT, VB, chartGeom } from './charts';
import { strings } from './strings';

const CJK_RUN = /[　-鿿＀-￯]+/g;
/** ja/zh vertical text: ASCII runs of ≤ 3 characters set upright as 縦中横. */
const tateRuns = (s: string) => esc(s).replace(/[A-Za-z0-9]+/g, (r) => (r.length <= 3 ? `<span class="tcy">${r}</span>` : r));
/** en: figures in the numeral face. */
const enNums = (s: string) => esc(s).replace(/\d[\d.,]*/g, (r) => `<span class="bz-n">${r}</span>`).replace(/×/g, '<span class="ach-x">×</span>');
const n1 = (x: number) => Math.round(x * 10) / 10;

function sideHead(label: string): string {
  const m = /^(\S+)\s*(?:·\s*)?(.*)$/.exec(label.trim());
  const big = m?.[1] ?? label, small = m?.[2] ?? '';
  return `<span class="bz-side__k">${esc(big)}</span>${small ? ` <span class="bz-side__l">${esc(small)}</span>` : ''}`;
}

function sealSvg(text: string, style: 'shubun' | 'hakubun'): string {
  const b = SEAL_BORDER;
  const frame = style === 'shubun'
    ? `<rect x="${n1((b.inset + b.width / 2) * 100)}" y="${n1((b.inset + b.width / 2) * 100)}" width="${n1((1 - 2 * b.inset - b.width) * 100)}" height="${n1((1 - 2 * b.inset - b.width) * 100)}" fill="none" stroke="currentColor" stroke-width="${n1(b.width * 100)}"/>`
    : `<rect x="2" y="2" width="96" height="96" fill="currentColor"/>`;
  const glyphs = sealLayout(text, style).map((bx) => {
    const cx = n1((bx.x + bx.w / 2) * 100), w = bx.w * 100, h = bx.h * 100;
    if (bx.latin) {
      return `<text x="${cx}" y="${n1((bx.y + bx.h) * 100)}" font-size="${n1(h / 0.7)}" text-anchor="middle" textLength="${n1(w)}" lengthAdjust="spacingAndGlyphs">${esc(bx.text)}</text>`;
    }
    return `<text transform="translate(${cx} ${n1((bx.y + bx.h / 2) * 100)}) scale(1 ${n1(h / w * 100) / 100})" font-size="${n1(w * 1.06)}" text-anchor="middle" dominant-baseline="central">${esc(bx.text)}</text>`;
  }).join('');
  return `<svg class="seal__svg" viewBox="0 0 100 100" focusable="false"><g filter="url(#ach-paste)">${frame}<g class="${style === 'shubun' ? 'seal__g' : 'seal__cut'}">${glyphs}</g></g></svg>`;
}

function chartSvg(ch: Chart): string {
  const g = chartGeom(ch);
  const yOf = (v: number) => PLOT.y1 - (v / g.yMax) * (PLOT.y1 - PLOT.y0);
  const ticks = g.ticks.map((t) => {
    const y = n1(yOf(t));
    return `<line class="sg-tk" x1="${PLOT.x0 - 5}" x2="${PLOT.x0}" y1="${y}" y2="${y}"/><text class="sg-tl" x="${PLOT.x0 - 8}" y="${y}" text-anchor="end" dominant-baseline="central">${t}</text>`;
  }).join('');
  const xs = (g.kind === 'bars' ? g.bars.map((b) => ({ x: b.cx, label: b.label, sub: b.sub })) : g.points).map((p) =>
    `<text class="sg-xl" x="${n1(p.x)}" y="${PLOT.y1 + 14}" text-anchor="middle">${esc(p.label)}</text>` +
    (p.sub ? `<text class="sg-xl sg-sub" x="${n1(p.x)}" y="${PLOT.y1 + 27}" text-anchor="middle">${esc(p.sub)}</text>` : '')).join('');
  let marks = '';
  if (g.kind === 'bars') {
    marks = g.bars.map((b) => `<rect class="sg-fill" x="${n1(b.x)}" y="${n1(b.y)}" width="${n1(b.w)}" height="${n1(b.h)}"/>` +
      `<text class="sg-vl" x="${n1(b.cx)}" y="${n1(b.y - 5)}" text-anchor="middle">${b.v}</text>`).join('');
  } else {
    const pts = g.points.map((p) => `${n1(p.x)},${n1(p.y)}`).join(' ');
    marks = `<polyline class="sg-fill sg-line" points="${pts}" stroke-width="${LINE_W}"/>` +
      g.points.map((p) => `<text class="sg-vl" x="${n1(p.x + 2)}" y="${n1(p.y - 9)}" text-anchor="middle">${p.v}</text>`).join('');
  }
  return `<svg class="sunago__svg" viewBox="0 0 ${VB.w} ${VB.h}" focusable="false" aria-hidden="true">` +
    `${marks}${ticks}<line class="sg-ax" x1="${PLOT.x0}" x2="${PLOT.x1}" y1="${PLOT.y1}" y2="${PLOT.y1}"/>${xs}</svg>`;
}

/** Twenty-two leaf flakes for the achievements-writing band (DOM, transform-only slide). */
function dust(): string {
  let s = 20261026;
  const r = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  const flakes = Array.from({ length: 22 }, () => {
    const x = 40 + r() * 1120, y = r() * 60, k = 2.2 + r() * 3.4, a = r() * 6.28;
    const p = [0, 1, 2, 3].map((i) => {
      const t = a + i * 1.57 + (r() - 0.5) * 0.9, rr = k * (0.6 + r() * 0.5);
      return `${n1(x + Math.cos(t) * rr)},${n1(y + Math.sin(t) * rr)}`;
    }).join(' ');
    return `<polygon points="${p}"/>`;
  }).join('');
  return `<svg class="ach-dust" viewBox="0 0 1200 160" preserveAspectRatio="none" focusable="false">${flakes}</svg>`;
}

export const render: SectionRender = (rc) => {
  const c = rc.content.copy.achievements;
  const L: Lang = rc.lang;
  const s = strings[L];
  const bz = rc.content.banzuke;
  const metric = (id?: string): Metric | undefined => rc.content.metrics.find((m) => m.id === id);
  const cjk = L !== 'en';
  const wrapJa = (t: string) => (L === 'en' ? esc(t).replace(CJK_RUN, (r) => `<span lang="ja">${r}</span>`) : esc(t));

  /* ---------- 見立番付 ---------- */
  const cell = (e: BanzukeEntry, side: 'e' | 'w', i: number, k: number) => {
    const top = i < 3;
    const col = side === 'e' ? 7 - (top ? i : k) : 1 + (top ? i : k);
    const m = (side === 'e' ? 4 : 11) + i;
    const rankVis = e.rank === 'maegashira' && k > 0 ? s.same : s.ranks[e.rank];
    const mv = metric(e.metric);
    const meta = cjk && mv ? `${mv.display[L]} · ${e.period}` : e.period;
    return `<td role="cell" class="bz-c${top ? ' bz-c--top' : ''}" style="--r:${top ? 3 : 4};--c:${col};--m:${m}">` +
      `<span class="bz-rk" aria-hidden="true">${esc(rankVis)}</span>` +
      `<span class="bz-b"><span class="bz-ft">${cjk ? tateRuns(e.feat[L]) : enNums(e.feat[L])}</span>` +
      `<span class="bz-mt">${esc(meta)}</span></span></td>`;
  };
  let mk = 0;
  const rows = bz.east.entries.map((e, i) => {
    const w = bz.west.entries[i]!;
    const k = e.rank === 'maegashira' ? mk++ : 0;
    return `<tr role="row"><th role="rowheader" scope="row" class="bz-rh">${esc(s.ranks[e.rank])}</th>${cell(e, 'e', i, k)}${cell(w, 'w', i, k)}</tr>`;
  }).join('');
  const banzuke =
    `<div class="bz-sheet kento" data-select>` +
    `<table class="banzuke" role="table">` +
    `<caption class="bz-title"><span class="bz-title__t">${esc(bz.title[L])}</span> <span class="bz-sub">${esc(bz.centre[L])} · ${esc(bz.date[L])}</span></caption>` +
    `<thead role="rowgroup"><tr role="row">` +
    `<th role="columnheader" scope="col" class="bz-mid"><span class="bz-rk-h">${esc(s.rank)}</span>` +
    `<span class="bz-mid__v" aria-hidden="true">${s.gomen ? `<span class="bz-gomen">${esc(s.gomen)}</span>` : ''}<span class="bz-yr">${esc(bz.centre[L])}</span><span class="bz-date">${esc(bz.date[L])}</span></span></th>` +
    `<th role="columnheader" scope="col" class="bz-side bz-side--e">${sideHead(bz.east.label[L])}</th>` +
    `<th role="columnheader" scope="col" class="bz-side bz-side--w">${sideHead(bz.west.label[L])}</th>` +
    `</tr></thead><tbody role="rowgroup">${rows}</tbody></table></div>`;

  /* ---------- seals ---------- */
  const seals = rc.content.metrics.filter((m) => m.seal).map((m, i) => {
    const style = m.direction === 'rose' ? 'shubun' : 'hakubun';
    const face = m.seal!.face[L];
    return `<figure class="seal" data-i="${i}" data-metric="${m.id}" data-style="${style}" data-face="${esc(face)}">` +
      `<div class="seal__rest" aria-hidden="true"></div>` +
      `<div class="seal__imp" aria-hidden="true">${sealSvg(face, style)}</div>` +
      `<p class="seal__side">${esc(m.seal!.side[L])}</p>` +
      `<figcaption><span class="seal__val">${esc(m.display[L]).replace(/×/g, '<span class="ach-x">×</span>')}</span><span class="seal__lab">${esc(m.label[L])}</span>` +
      `<span class="visually-hidden">${esc(s.sealCaption)} ${esc(face)}</span></figcaption></figure>`;
  }).join('');

  /* ---------- 砂子 charts ---------- */
  const charts = rc.content.charts.map((ch) =>
    `<figure class="sunago" data-chart="${ch.id}">` +
    `<figcaption class="sunago__cap"><span class="sunago__t">${esc(ch.title[L])}</span> <span class="sunago__u">${esc(ch.unit[L])}</span> <span class="sunago__n">${esc(ch.note[L])}</span></figcaption>` +
    chartSvg(ch) +
    `<table class="visually-hidden"><caption>${esc(ch.title[L])} (${esc(ch.unit[L])})</caption>` +
    `<thead><tr><th scope="col">${esc(s.year)}</th><th scope="col">${esc(s.value)}</th></tr></thead>` +
    `<tbody>${ch.series.map((p) => `<tr><th scope="row">${esc(p.x)}</th><td>${p.y}</td></tr>`).join('')}</tbody></table>` +
    `</figure>`).join('');

  /* ---------- 空摺 ---------- */
  const rel = rc.content.reliability.map((r) =>
    `<li data-figure="${r.id}"><span class="kz__v">${esc(r.value)}</span><span class="kz__l">${esc(r.label[L])}</span><span class="kz__p">${esc(r.period)}</span></li>`).join('');

  const defs = `<svg class="ach-defs" width="0" height="0" aria-hidden="true" focusable="false"><defs>` +
    `<filter id="ach-paste" x="0" y="0" width="1" height="1"><feTurbulence type="fractalNoise" baseFrequency="0.11" numOctaves="2" seed="7" result="n"/>` +
    `<feColorMatrix in="n" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -2.6 2.15" result="m"/><feComposite in="SourceGraphic" in2="m" operator="in"/></filter>` +
    `<pattern id="ach-hatch" width="3.2" height="3.2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="1.4" height="3.2"/></pattern>` +
    `</defs></svg>`;

  return (
    sectionOpen('achievements') +
    artboardHead(rc, { id: 'achievements', title: c.title, stage: c.stage, takeaway: c.takeaway, plate: 8 }) +
    `<div class="ach-rank">` +
    banzuke +
    printFigure(rc, c.pinesFigure, { sizes: '(min-width: 1024px) 26vw, 90vw', className: 'ach-pines' }) +
    `<p class="ach-note">${esc(c.banzukeNote[L])}</p>` +
    `</div>` +
    `<div class="ach-press">` +
    `<div class="view ach-view" data-view-id="achievements-press" data-select aria-hidden="true"></div>` + defs +
    `<div class="ach-blk ach-blk--seals"><div class="ach-lab"><h3>${esc(c.sealsTitle[L])}</h3>` +
    `<p class="ach-legend"><span data-k="rose">${wrapJa(c.sealLegend.rose[L])}</span><span data-k="fell">${wrapJa(c.sealLegend.fell[L])}</span></p></div>` +
    `<div class="seals">${seals}</div></div>` +
    `<div class="ach-blk ach-blk--charts"><div class="ach-lab"><h3>${esc(c.chartsTitle[L])}</h3></div><div class="charts">${charts}</div></div>` +
    `<div class="ach-blk ach-blk--kz"><div class="ach-lab"><h3>${esc(c.karazuriTitle[L])}</h3><p class="ach-kzcap">${esc(c.karazuriCaption[L])}</p></div>` +
    `<div class="kz-wrap"><ul class="kz" aria-label="${esc(s.reliability)}">${rel}</ul>` +
    `<div class="kz-ctl js-only"><label class="kz-light"><span>${esc(c.lightAngle[L])}</span><input type="range" min="0" max="100" step="1" value="0"></label>` +
    `<button type="button" class="kz-ink" aria-pressed="false">${esc(c.inkIt[L])}</button></div></div></div>` +
    `</div>` +
    `<div class="ach-cred"><h3>${esc(c.credentialsTitle[L])}</h3><dl>` +
    c.credentials.map((x, i) => `<div><dt>${esc(s.credLabels[i] ?? '')}</dt><dd>${esc(x[L])}</dd></div>`).join('') +
    `</dl></div>` +
    marks() +
    `<div class="ma" id="ma-achievements-writing" data-band="achievements-writing" aria-hidden="true">${dust()}</div>` +
    `</section>`
  );
};
