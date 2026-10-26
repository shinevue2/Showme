/**
 * Case pages (DESIGN §6.4 "Case pages"). Owner: WP-07. Node-safe (SSG).
 *
 * A book page inside a 匡郭 frame, in sangaku order 問・術・答・省:
 *   running head (back to the screen · 六扇のうち第N扇) → header spread: panel label, title (View-Transition
 *   target `case-{id}`, morphing from the screen's label), employer · period · role · team, the result, the key
 *   figures; beside it the whole screen photograph with トンボ crop marks around the part mounted as this panel
 *   → 問 problem + constraints, role, team, period → 術 method, the sangaku diagram that draws itself in
 *   compass-and-ruler order, trade-offs → (resilience: the 吹抜屋台 walkthrough, headed by Toyoharu's
 *   perspective of a theatre, and the note on the central pillar beside Hokusai's rinzō) → 答 the results table
 *   (metric · before · after · period · source) → 省 what I would do differently → panel navigation in screen
 *   order (← next panel on the left, as the screen reads right to left).
 * Links are depth-correct relative URLs (rc.url): back = `../../#works-{id}` (ja) or `../../../en/#works-{id}`.
 */
import type { RenderCtx, SectionRender } from '../../core/types';
import type { CaseStudy, T } from '../../content/types';
import { esc, langAttr, marks, printFigure } from '../../render/helpers';
import { strings } from './strings';
import { PANEL_INFO } from './panels';
import { artCaption, caseMeta, numerals, tateNumerals } from './text';
import { DIAGRAMS, pillarNote, renderDiagram, walkIntro, walkParts, walkthrough } from './diagrams/index';

const sorted = (rc: RenderCtx): CaseStudy[] => [...rc.content.cases].sort((a, b) => a.panel - b.panel);

/** 問 / 术 … : the big label glyph (ja, zh) or the English word with the Japanese glyph as a small mark. */
function label(rc: RenderCtx, id: string, x: T, jaGlyph: string): string {
  const L = rc.lang;
  if (L === 'en') {
    return `<h2 id="${id}" class="case__label"><span class="case__glyph" lang="${langAttr('ja')}" aria-hidden="true">${esc(jaGlyph)}</span><span class="case__word display">${esc(x.en)}</span></h2>`;
  }
  return `<h2 id="${id}" class="case__label"><span class="case__glyph display">${esc(x[L])}</span></h2>`;
}

function para(text: string): string {
  return `<p>${numerals(text)}</p>`;
}

function crop(rc: RenderCtx, cs: CaseStudy): string {
  const [x, y, w, h] = PANEL_INFO[cs.id].crop;
  const pct = (v: number) => `${(v * 100).toFixed(2)}%`;
  return `<span class="case__crop tombo" aria-hidden="true" style="--cx:${pct(x)};--cy:${pct(y)};--cw:${pct(w)};--ch:${pct(h)}"><span class="case__crop-label">${esc(cs.panelLabel[rc.lang])}</span></span>`;
}

function artFigure(rc: RenderCtx, cs: CaseStudy): string {
  const L = rc.lang;
  const credit = rc.content.credits[cs.art.file];
  const alt = credit ? rc.t(credit.alt) : '';
  return (
    `<figure class="print kento case__art" data-select>` +
    `<div class="print__mat case__art-mat">` +
    `<div class="case__art-img">${rc.img(cs.art.file, { alt, sizes: '(min-width: 1240px) 760px, (min-width: 768px) 62vw, 100vw', eager: true })}${crop(rc, cs)}</div>` +
    `</div>` +
    `<figcaption class="print__caption case__caption"><span class="case__caption-k">${esc(strings[L].panelOf)}</span><span class="case__credit">${artCaption(rc, cs.art.file)}</span>` +
    `<span class="case__why">${esc(cs.art.why[L])}</span></figcaption>` +
    `</figure>`
  );
}

function figures(rc: RenderCtx, cs: CaseStudy): string {
  const L = rc.lang;
  const rows = cs.metrics.map((id) => {
    const m = rc.content.metrics.find((x) => x.id === id);
    if (!m) return '';
    const parts = m.display[L].split('→');
    const val = parts.length === 2
      ? `${numerals(parts[0]!.trim())}<span class="case__arrow"> → </span>${numerals(parts[1]!.trim())}`
      : numerals(m.display[L]);
    return `<div class="case__figure"><dt>${esc(m.label[L])}</dt><dd class="case__figure-val">${val}</dd><dd class="case__figure-period num">${esc(m.period)}</dd></div>`;
  }).join('');
  return `<dl class="case__figures" aria-label="${esc(strings[L].figures)}">${rows}</dl>`;
}

function results(rc: RenderCtx, cs: CaseStudy): string {
  const L = rc.lang;
  const s = strings[L];
  const rows = cs.metrics.map((id) => {
    const m = rc.content.metrics.find((x) => x.id === id);
    if (!m) return '';
    // data-k: the column name, shown beside each value when a phone stacks the row (style.css)
    return `<tr><th scope="row">${esc(m.label[L])}<span class="case__ctx">${esc(m.context[L])}</span></th>` +
      `<td class="num case__before" data-k="${esc(s.before)}">${esc(m.before)}</td><td class="num case__after" data-k="${esc(s.after)}">${esc(m.after)}</td>` +
      `<td class="num case__period" data-k="${esc(s.period)}">${esc(m.period)}</td><td class="case__src" data-k="${esc(s.source)}">${esc(m.source[L])}</td></tr>`;
  }).join('');
  return (
    `<div class="case__table-wrap" tabindex="0" role="region" aria-label="${esc(s.results)}"><table class="case__results"><caption class="visually-hidden">${esc(s.results)}</caption>` +
    `<thead><tr><th scope="col">${esc(s.metric)}</th><th scope="col">${esc(s.before)}</th><th scope="col">${esc(s.after)}</th><th scope="col">${esc(s.period)}</th><th scope="col">${esc(s.source)}</th></tr></thead>` +
    `<tbody>${rows}</tbody></table></div>`
  );
}

function walkSection(rc: RenderCtx): string {
  const L = rc.lang;
  const d = walkthrough();
  const kabuki = 'ukie/toyoharu-kabuki-perspective.jpg';
  const rinzo = 'hokusai/manga-pagoda-roof.jpg';
  const credit = (file: string) => rc.content.credits[file];
  const fig = (file: string, cls: string, sizes: string) => {
    const c = credit(file);
    return c ? printFigure(rc, { file, caption: c.title, alt: c.alt }, { sizes, className: cls }) : '';
  };
  return (
    `<section class="case__walk" aria-labelledby="case-walk">` +
    `<div class="case__walk-head">` +
    `<h2 id="case-walk" class="case__walk-title">${esc(strings[L].walk)}</h2>` +
    `<p class="case__walk-intro">${esc(walkIntro[L])}</p>` +
    fig(kabuki, 'case__kabuki', '(min-width: 1024px) 420px, 100vw') +
    `</div>` +
    `<figure class="case__diagram case__diagram--walk" data-draw><div class="case__diagram-scroll" tabindex="0" role="region" aria-label="${esc(d.title[L])}">${renderDiagram(d, L, strings[L].diagram)}</div></figure>` +
    `<dl class="case__walk-parts">${walkParts.map((p) => `<div><dt>${esc(p.term[L])}</dt><dd>${numerals(p.gloss[L])}</dd></div>`).join('')}</dl>` +
    `<div class="case__pillar">` +
    fig(rinzo, 'case__rinzo', '(min-width: 1024px) 360px, 100vw') +
    `<p class="case__pillar-note">${esc(pillarNote[L])}</p>` +
    `</div>` +
    `</section>`
  );
}

export const renderCase: SectionRender = (rc: RenderCtx) => {
  const L = rc.lang;
  const c = rc.content.copy.works;
  const s = strings[L];
  const cases = sorted(rc);
  const i = Math.max(0, cases.findIndex((x) => x.id === rc.caseId));
  const cs = cases[i]!;
  const info = PANEL_INFO[cs.id];
  const prefix = L === 'ja' ? '' : `${L}/`;
  const next = cases[i + 1];
  const prev = cases[i - 1];
  const back = `${rc.url(prefix)}#works-${cs.id}`;
  const lb = c.labels;
  const tate = L === 'en' ? '' : ' tate';
  const glyphs = { problem: '問', method: '術', result: '答', reflection: '省' } as const;
  const diagram = DIAGRAMS[cs.id]();

  const facts =
    `<dl class="case__facts">` +
    `<div class="case__facts-c"><dt>${esc(lb.constraints[L])}</dt><dd><ul>${cs.constraints.map((x) => `<li>${numerals(x[L])}</li>`).join('')}</ul></dd></div>` +
    `<div><dt>${esc(lb.role[L])}</dt><dd>${esc(cs.role[L])}</dd></div>` +
    `<div><dt>${esc(lb.team[L])}</dt><dd>${numerals(cs.team[L])}</dd></div>` +
    `<div><dt>${esc(lb.period[L])}</dt><dd class="num">${esc(cs.period)}</dd></div>` +
    `</dl>`;

  const navLink = (cs2: CaseStudy | undefined, rel: 'next' | 'prev') => {
    if (!cs2) return `<span class="case__nav-${rel} case__nav-empty" aria-hidden="true"></span>`;
    const text = rel === 'next' ? c.nextCase[L] : c.prevCase[L];
    const arrow = rel === 'next' ? '←' : '→';
    return `<a class="case__nav-${rel}" rel="${rel}" href="${rc.url(`${prefix}works/${cs2.id}/`)}">` +
      `<span class="case__nav-k">${rel === 'next' ? `<span aria-hidden="true">${arrow} </span>` : ''}${esc(text)}${rel === 'prev' ? `<span aria-hidden="true"> ${arrow}</span>` : ''}</span>` +
      `<span class="case__nav-t"><span class="case__nav-n">${esc(cs2.panelLabel[L])}</span> ${esc(cs2.title[L])}</span></a>`;
  };

  return (
    `<article id="case-${cs.id}" class="artboard case" data-section="works" data-case-page="${cs.id}" data-panel="${cs.panel}" aria-labelledby="case-title">` +
    `<div class="case__book kyokaku">` +
    `<p class="case__runhead"><a class="case__back" href="${back}"><span aria-hidden="true">← </span>${esc(c.backToWorks[L])}</a>` +
    `<span class="case__of">${esc(s.ofSix.replace('{n}', cs.panelLabel[L]))}</span></p>` +

    `<header class="case__head">` +
    `<div class="case__lead">` +
    `<p class="case__panel${tate}">${esc(cs.panelLabel[L])}</p>` +
    `<h1 id="case-title" class="display case__title" style="view-transition-name:case-${cs.id}" data-print data-plate="${info.plate}" data-print-shape="band" data-select>${esc(cs.title[L])}</h1>` +
    `<p class="case__meta">${caseMeta(rc, cs)}<span class="sep" aria-hidden="true">${esc(s.sep)}</span>${numerals(cs.team[L])}</p>` +
    `<p class="takeaway case__result">${numerals(cs.result[L])}</p>` +
    figures(rc, cs) +
    `</div>` +
    artFigure(rc, cs) +
    `</header>` +

    `<section class="case__part case__part--q" aria-labelledby="case-q">` +
    label(rc, 'case-q', lb.problem, glyphs.problem) +
    `<div class="case__text">${para(cs.problem[L])}</div>` +
    `<aside class="case__aside" aria-label="${esc(s.facts)}">${facts}</aside>` +
    `</section>` +

    `<section class="case__part case__part--m" aria-labelledby="case-m">` +
    label(rc, 'case-m', lb.method, glyphs.method) +
    `<div class="case__text">${para(cs.method[L])}</div>` +
    `<aside class="case__aside"><h3 class="case__aside-h">${esc(lb.tradeoffs[L])}</h3><ul class="case__trade">${cs.tradeoffs.map((x) => `<li>${numerals(x[L])}</li>`).join('')}</ul></aside>` +
    `<figure class="case__diagram" data-draw data-diagram="${cs.id}"><div class="case__diagram-scroll" tabindex="0" role="region" aria-label="${esc(diagram.title[L])}">${renderDiagram(diagram, L, s.diagram)}</div>` +
    `<figcaption class="case__diagram-cap"><span class="case__diagram-k">${esc(s.diagram)}</span> ${esc(diagram.title[L])}</figcaption></figure>` +
    `</section>` +

    (cs.id === 'resilience' ? walkSection(rc) : '') +

    `<section class="case__part case__part--a" aria-labelledby="case-a">` +
    label(rc, 'case-a', lb.result, glyphs.result) +
    `<div class="case__text">${para(cs.result[L])}</div>` +
    results(rc, cs) +
    `</section>` +

    `<section class="case__part case__part--r" aria-labelledby="case-r">` +
    label(rc, 'case-r', lb.reflection, glyphs.reflection) +
    `<div class="case__text case__reflection${L === 'ja' ? ' case__reflection--tate' : ''}"><p>${L === 'ja' ? tateNumerals(cs.reflection[L]) : numerals(cs.reflection[L])}</p></div>` +
    `</section>` +

    `<nav class="case__nav" aria-label="${esc(s.nav)}">` +
    navLink(next, 'next') +
    `<a class="case__nav-back" href="${back}">${esc(c.backToWorks[L])}</a>` +
    navLink(prev, 'prev') +
    `</nav>` +
    `</div>` +
    marks() +
    `</article>`
  );
};
