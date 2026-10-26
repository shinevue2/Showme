/**
 * Works — 屏風 · 表具 The Mount (DESIGN §6.4). Owner: WP-07. Node-safe (SSG).
 *
 * Every word is in the HTML. One markup, three layouts chosen by CSS alone (so nothing shifts when JS or the
 * stage arrive):
 *   dolly  (JS, motion on, ≥ 1024 px, not Proof): the section is 100 lvh + a 120 vh run + the band; the stage
 *          is sticky; the view `works-byobu` unfolds and the camera dollies 第一扇 → 第六扇 (map.ts); the DOM
 *          column shows the focused case (all six are in the DOM, the others hidden);
 *   list   (no JS, reduced motion, Motion layer off, Proof, 768–1023 px): the screen shown open, the six cases
 *          listed in reading order;
 *   mobile (< 768 px): no WebGL — six tall panels on gold leaf, each with its case below (§6.4 Mobile).
 * Panels are counted from the right: 第一扇 is the rightmost and comes first in the DOM (reading order).
 * Deep links #works-{id} sit on the case items; in dolly mode index.ts moves them to the hold anchors.
 */
import type { RenderCtx, SectionRender } from '../../core/types';
import type { CaseStudy } from '../../content/types';
import { band, esc, langAttr, marks, stageLine, viewSlot } from '../../render/helpers';
import { strings } from './strings';
import { holdS } from './map';
import { PANEL_INFO } from './panels';
import { artCaption, caseMeta, lead, numerals } from './text';

export { renderCase } from './case-render';

const casePrefix = (rc: RenderCtx): string => (rc.lang === 'ja' ? '' : `${rc.lang}/`);

/** The panel label on the screen: a keyboard control and the View-Transition source of the case title. */
function label(rc: RenderCtx, cs: CaseStudy): string {
  const L = rc.lang;
  return (
    `<a class="byobu__label" href="${rc.url(`${casePrefix(rc)}works/${cs.id}/`)}" data-panel="${cs.panel}" data-case="${cs.id}" style="view-transition-name:case-${cs.id}">` +
    `<span class="byobu__n">${esc(cs.panelLabel[L])}</span><span class="byobu__short">${esc(cs.short[L])}</span></a>`
  );
}

/** Mobile panel: the art crop on gold leaf (lazy; `display: none` above 767 px, so never fetched there). */
function leaf(rc: RenderCtx, cs: CaseStudy): string {
  const info = PANEL_INFO[cs.id];
  const credit = rc.content.credits[cs.art.file];
  const alt = credit ? rc.t(credit.alt) : '';
  return (
    `<figure class="works__leaf" data-panel="${cs.panel}">` +
    `<div class="works__leaf-mount" data-select>` +
    `<picture data-file="${esc(cs.art.file)}">` +
    `<source vite-ignore type="image/avif" srcset="${rc.url(info.mobile + '.avif')}">` +
    `<img vite-ignore src="${rc.url(info.mobile + '.webp')}" width="560" height="896" alt="${esc(alt)}" decoding="async" loading="lazy">` +
    `</picture></div>` +
    `<figcaption class="works__credit">${artCaption(rc, cs.art.file)}</figcaption>` +
    `</figure>`
  );
}

function caseItem(rc: RenderCtx, cs: CaseStudy): string {
  const L = rc.lang;
  const c = rc.content.copy.works;
  const info = PANEL_INFO[cs.id];
  const tate = L === 'en' ? '' : ' tate';
  return (
    `<li class="works__case" id="works-${cs.id}" data-case="${cs.id}" data-panel="${cs.panel}" aria-labelledby="works-${cs.id}-title">` +
    leaf(rc, cs) +
    `<p class="works__n${tate}">${esc(cs.panelLabel[L])}</p>` +
    `<div class="works__body">` +
    `<h3 id="works-${cs.id}-title" class="works__title display" data-print data-plate="${info.plate}" data-print-shape="band">${esc(cs.title[L])}</h3>` +
    `<p class="works__meta">${caseMeta(rc, cs)}</p>` +
    `<dl class="works__qa">` +
    `<div><dt>${esc(c.labels.problem[L])}</dt><dd>${numerals(lead(cs.problem[L], L))}</dd></div>` +
    `<div><dt>${esc(c.labels.method[L])}</dt><dd>${numerals(lead(cs.method[L], L))}</dd></div>` +
    `<div class="works__a"><dt>${esc(c.labels.result[L])}</dt><dd>${numerals(cs.result[L])}</dd></div>` +
    `</dl>` +
    `<p class="works__foot">` +
    `<a class="works__read" href="${rc.url(`${casePrefix(rc)}works/${cs.id}/`)}">${esc(c.read[L])}<span class="works__arrow" aria-hidden="true">→</span></a>` +
    `<span class="works__art"><span class="works__art-k">${esc(strings[L].art)}</span> ${artCaption(rc, cs.art.file)}</span>` +
    `</p>` +
    `</div>` +
    `</li>`
  );
}

export const render: SectionRender = (rc) => {
  const c = rc.content.copy.works;
  const L = rc.lang;
  const s = strings[L];
  const cases = [...rc.content.cases].sort((a, b) => a.panel - b.panel);
  const direction = L === 'en'
    ? `<p class="works__direction"><span class="works__direction-icon" aria-hidden="true">${rc.icon('arrow-rtl')}</span>${esc(c.directionNote[L])}</p>`
    : `<p class="works__direction tate">${esc(c.directionNote[L])}</p>`;
  const anchors = cases.map((cs) => `<span class="works__anchor" data-anchor="${cs.id}" style="--s:${holdS(cs.panel - 1).toFixed(4)}"></span>`).join('');
  return (
    `<section id="works" class="artboard" data-section="works" aria-labelledby="works-title" data-sticky>` +
    `<div class="works__run" aria-hidden="true">${anchors}</div>` +
    `<div class="works__stage artboard__stage">` +
    `<header class="artboard__head works__head">` +
    `<h2 id="works-title" class="display artboard__title" data-print data-plate="8" data-print-shape="block" data-select>${esc(c.title[L])}</h2>` +
    stageLine(rc, c.stage, 'works__stage-line') +
    `<p class="takeaway">${esc(c.takeaway[L])}</p>` +
    direction +
    `</header>` +
    `<div class="works__frame">` +
    viewSlot(rc, 'works-byobu', { className: 'works__view' }) +
    `<nav class="byobu__labels" aria-label="${esc(s.panels)}">${cases.map((cs) => label(rc, cs)).join('')}</nav>` +
    `<p class="works__keys" aria-hidden="true" lang="${langAttr(L)}">${esc(s.keys)}</p>` +
    `</div>` +
    `<ol class="works__cases" aria-label="${esc(s.cases)}">${cases.map((cs) => caseItem(rc, cs)).join('')}</ol>` +
    `</div>` +
    `<div class="works__after" aria-hidden="true"></div>` +
    marks() +
    band('works-skills') +
    `</section>`
  );
};
