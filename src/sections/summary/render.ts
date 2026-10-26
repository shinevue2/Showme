/**
 * Summary — 覚書 · 版下 The Drawing (DESIGN §6.2, band summary-road §2.2). Owner: WP-05. Node-safe (SSG).
 * The GPU rests here: everything is DOM/SVG.
 *
 * A `.kyokaku` book spread with its 版心 fold at 54 %:
 *   left page  — the section head (h2, stage line, takeaway), three paragraphs, the four dated results (each number
 *                sits on a cyan baseline guide; JS adds its artboard readout and the ray to Hokusai's vanishing point),
 *                the "now" note;
 *   right page — Hokusai's perspective page (figure.print, data-handoff="hanshita": the cover's block lands its back
 *                here) with his construction traced in cyan over it, then languages, education and overlap hours.
 * Under the spread: the career ledger (a table; a <dl> on phones). The band carries the match-cut overlay (JS).
 */
import type { Lang, RenderCtx, SectionRender } from '../../core/types';
import { artboardHead, band, esc, fmtDate, marks, sectionOpen } from '../../render/helpers';
import { GUIDES, IMG_H, IMG_W, MARKS } from './guides';
import { strings } from './strings';

const RESULT_PLATES = [6, 5, 2, 7] as const;
const px = (v: number, s: number) => (Math.round(v * s * 10) / 10).toString();

/** Hokusai's construction, traced, as an SVG over the image (drawn in compass order by CSS). */
function guidesSvg(L: Lang): string {
  const lines = GUIDES.map((g) =>
    `<path class="sg-line" style="--o:${g.order.toFixed(2)}" d="M${px(g.from[0], IMG_W)} ${px(g.from[1], IMG_H)}L${px(g.to[0], IMG_W)} ${px(g.to[1], IMG_H)}" pathLength="1"/>`).join('');
  const marks = MARKS.map((m) => {
    const x = m.at[0] * IMG_W, y = m.at[1] * IMG_H;
    const label = m.kind === 'vp' ? strings[L].vanishing : strings[L].intersect;
    return `<g class="sg-mark sg-mark--${m.kind}" style="--o:${m.order.toFixed(2)}"><rect x="${(x - 9).toFixed(0)}" y="${(y - 9).toFixed(0)}" width="18" height="18"/>` +
      `<text x="${(x + 18).toFixed(0)}" y="${(y + 40).toFixed(0)}">${esc(label)}</text></g>`;
  }).join('');
  return `<svg class="summary__guides" viewBox="0 0 ${IMG_W} ${IMG_H}" preserveAspectRatio="none" aria-hidden="true" focusable="false">${lines}${marks}</svg>`;
}

function figure(rc: RenderCtx): string {
  const f = rc.content.copy.summary.figure;
  const L = rc.lang;
  const sep = L === 'en' ? ' · ' : '・';
  return (
    `<figure class="print kento summary__figure" data-handoff="hanshita" data-select>` +
    `<div class="print__mat deckle">${rc.img(f.file, { alt: rc.t(f.alt), sizes: '(min-width: 1024px) 40vw, 92vw', eager: true })}${guidesSvg(L)}</div>` +
    `<figcaption class="print__caption">${esc(rc.t(f.caption))}${sep}${esc(strings[L].institution)}</figcaption>` +
    `</figure>`
  );
}

export const render: SectionRender = (rc) => {
  const c = rc.content.copy.summary;
  const L = rc.lang;
  const st = strings[L];
  const metric = (id: string) => rc.content.metrics.find((m) => m.id === id)!;
  const employer = (id: string) => rc.content.employers.find((e) => e.id === id)!;
  const results = c.results.map((id, i) => {
    const m = metric(id);
    const emp = employer(m.employer === 'all' ? 'kairo' : m.employer);
    return `<li class="result" data-result="${esc(id)}">` +
      `<p class="result__num" data-print data-plate="${RESULT_PLATES[i]}" data-print-shape="band" data-select>${esc(m.display[L])}</p>` +
      `<p class="result__label">${esc(m.label[L])}</p>` +
      `<p class="result__period"><span class="mono">${esc(m.period)}</span> · ${esc(emp.name[L])}</p>` +
      `<p class="result__context">${esc(m.context[L])}</p></li>`;
  }).join('');
  const overlap = rc.content.person.overlap.map((o) =>
    `<li data-zone="${esc(o.zone)}" data-start="${o.startJST}" data-end="${o.endJST}"><span class="overlap__where">${esc(o.label[L])}</span>` +
    ` <span class="mono overlap__hours">${o.startJST}–${o.endJST} JST</span><span class="overlap__now mono" aria-live="off"></span></li>`).join('');
  const rows = c.ledger.map((r) => {
    const e = employer(r.employer);
    return `<tr><th scope="row"><span class="ledger__name">${esc(e.name[L])}</span><span class="ledger__desc">${esc(e.descriptor[L])}</span></th>` +
      `<td>${esc(r.role[L])}</td><td class="mono ledger__dates">${esc(fmtDate(r.from, L))} – ${esc(fmtDate(r.to, L))}</td><td>${esc(r.scope[L])}</td></tr>`;
  }).join('');
  const dl = c.ledger.map((r) => {
    const e = employer(r.employer);
    return `<div class="ledger-dl__row"><dt><span class="ledger__name">${esc(e.name[L])}</span><span class="mono ledger__dates">${esc(fmtDate(r.from, L))} – ${esc(fmtDate(r.to, L))}</span></dt>` +
      `<dd class="ledger-dl__role">${esc(r.role[L])}</dd><dd class="ledger-dl__scope">${esc(r.scope[L])}</dd></div>`;
  }).join('');
  return (
    sectionOpen('summary') +
    `<div class="summary__spread kyokaku" data-fold>` +
    `<div class="summary__page summary__page--left">` +
    artboardHead(rc, { id: 'summary', title: c.title, stage: c.stage, takeaway: c.takeaway, plate: 5 }) +
    `<div class="summary__paras">${c.paragraphs.map((p) => `<p>${esc(p[L])}</p>`).join('')}</div>` +
    `<h3 class="summary__h3">${esc(c.resultsTitle[L])}</h3>` +
    `<ul class="summary__results">${results}</ul>` +
    `<h3 class="summary__h3">${esc(c.nowTitle[L])}</h3><p class="summary__now">${esc(c.now[L])}</p>` +
    `</div>` +
    `<div class="summary__page summary__page--right"><div class="summary__aside">` +
    figure(rc) +
    `<div class="summary__side">` +
    `<p class="summary__line">${esc(c.languagesLine[L])}</p>` +
    `<p class="summary__line">${esc(c.educationLine[L])}</p>` +
    `<h3 class="summary__h3 summary__h3--small">${esc(c.overlapTitle[L])}</h3>` +
    `<ul class="summary__overlap">${overlap}</ul>` +
    `</div>` +
    `</div></div>` +
    `</div>` +
    `<h3 class="summary__h3 summary__ledger-title">${esc(c.ledgerTitle[L])}</h3>` +
    `<table class="ledger"><caption class="visually-hidden">${esc(st.ledgerCaption)}</caption>` +
    `<thead><tr><th scope="col">${esc(c.ledgerColumns.company[L])}</th><th scope="col">${esc(c.ledgerColumns.role[L])}</th>` +
    `<th scope="col">${esc(c.ledgerColumns.dates[L])}</th><th scope="col">${esc(c.ledgerColumns.scope[L])}</th></tr></thead>` +
    `<tbody>${rows}</tbody></table>` +
    `<dl class="ledger-dl" aria-label="${esc(st.ledgerCaption)}">${dl}</dl>` +
    marks() +
    band('summary-road') +
    `</section>`
  );
};
