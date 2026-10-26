/**
 * Principles — 枯山水 The Garden (DESIGN §6.6). Owner: WP-08. Node-safe (SSG).
 *
 * The emptiest artboard. Desktop: two sticky layers over the same scroll range — the garden placeholder (below the
 * canvas; the sand fills its bottom 72 lvh, Motonobu's mist faint behind it) and the text stage pulled over it (the
 * header top-left, the five principles as tall columns in the blank upper area, each above its stone — refined by
 * the view from the projected stones, without JS from the stone's x — and the legend with Re-rake / Show the data). Phones: the principles as a list, the garden (60 svh) below.
 * Every number of the garden is in the data tables (52 weeks of p99, the SEV-1 incidents), readable without JS.
 */
import type { SectionRender } from '../../core/types';
import { artboardHead, band, esc, fmtDate, marks, sectionOpen, viewSlot } from '../../render/helpers';
import { strings } from './strings';
import { CAM_HW, CAM_X } from './garden';

export const render: SectionRender = (rc) => {
  const c = rc.content.copy.principles;
  const L = rc.lang;
  const ops = rc.content.ops;
  const s = strings[L];
  const tate = L === 'en' ? '' : ' tate';
  const bodyTate = L === 'ja' ? ' tate' : '';
  const items = rc.content.principles.map((p) =>
    `<li class="principle" data-stone="${p.n}" style="--fx:${(0.5 + (p.stone.x - CAM_X) / (2 * CAM_HW)).toFixed(4)}">` +
    `<h3 class="principle__title display${tate}">${esc(p.title[L])}</h3>` +
    `<p class="principle__body${bodyTate}">${esc(p.body[L])}</p></li>`).join('');
  const start = Date.parse(ops.from + 'T00:00:00Z');
  const weekRows = ops.weeklyP99ms.map((v, i) => {
    const d = new Date(start + i * 7 * 86400000).toISOString().slice(0, 10);
    const sev = ops.sev1.find((x) => x.week === i + 1);
    return `<tr${sev ? ' class="is-sev"' : ''}><td>${i + 1}</td><td>${d}</td><td>${v}</td></tr>`;
  }).join('');
  const sevRows = ops.sev1.map((x) =>
    `<tr><td>${x.week}</td><td>${esc(fmtDate(x.date, L))}</td><td class="t">${esc(x.title[L])}</td><td>${x.durationMin} ${esc(s.min)}</td><td>${x.blastPct} %</td></tr>`).join('');
  const mist = rc.content.copy.principles.mistFigure;
  const mistFig = `<figure class="principles__mist">${rc.img(mist.file, { alt: rc.t(mist.alt), sizes: '(min-width: 1024px) 60vw, 100vw' })}` +
    `<figcaption class="visually-hidden">${esc(rc.t(mist.caption))}</figcaption></figure>`;
  return (
    sectionOpen('principles', { sticky: true }) +
    `<div class="principles__stage artboard__stage">` +
    artboardHead(rc, { id: 'principles', title: c.title, stage: c.stage, takeaway: c.takeaway, plate: 3 }) +
    `<ol class="principles__list">${items}</ol>` +
    `<div class="principles__legend kento">` +
    `<p class="principles__legend-text">${esc(c.legend[L])}</p>` +
    `<p class="principles__slo"><span class="principles__k">${esc(s.slo)}</span> ${esc(ops.slo[L])} — ${esc(ops.sloMet[L])}</p>` +
    `<div class="principles__buttons">` +
    `<button type="button" class="principles__btn principles__rerake js-only">${rc.icon('rerake')}<span>${esc(c.rerake[L])}</span></button>` +
    `<button type="button" class="principles__btn principles__rake js-only" aria-pressed="false" data-on="${esc(s.rakeOn)}" data-off="${esc(c.rakeToggle[L])}">${rc.icon('rerake')}<span>${esc(c.rakeToggle[L])}</span></button>` +
    `<details class="principles__data" data-show="${esc(c.showData[L])}" data-hide="${esc(c.hideData[L])}">` +
    `<summary class="principles__btn">${esc(c.showData[L])}</summary>` +
    `<div class="principles__tables" data-lenis-prevent tabindex="0" role="region" aria-label="${esc(s.tables)}">` +
    `<table class="principles__table"><caption>${esc(c.tableCaption[L])}</caption>` +
    `<thead><tr><th scope="col">${esc(c.weekLabel[L])}</th><th scope="col">${esc(s.date)}</th><th scope="col">${esc(c.p99Label[L])}</th></tr></thead><tbody>${weekRows}</tbody></table>` +
    `<table class="principles__table principles__table--sev"><caption>${esc(c.sev1Label[L])}</caption>` +
    `<thead><tr><th scope="col">${esc(c.weekLabel[L])}</th><th scope="col">${esc(s.date)}</th><th scope="col">${esc(s.incidents)}</th><th scope="col">${esc(s.duration)}</th><th scope="col">${esc(s.blast)}</th></tr></thead><tbody>${sevRows}</tbody></table>` +
    `</div></details>` +
    `</div></div>` +
    `</div>` +
    // the garden placeholder is a direct, sticky child of the artboard (below the canvas), so Motonobu's mist inside
    // it sits BEHIND the sand (README layering rule); the stage above is pulled over it
    viewSlot(rc, 'principles-garden', { className: 'principles__view cur-rake', inner: mistFig }) +
    marks() +
    band('principles-achievements') +
    `</section>`
  );
};
