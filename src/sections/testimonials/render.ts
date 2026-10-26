/**
 * Testimonials — 暖簾 Goodwill (DESIGN §6.9). Owner: WP-10.
 * Three quotes in a staggered arrangement (manager cols 1–6, peer 7–12 +64 px, report 2–8; ja vertical on desktop),
 * each with two aria-hidden plate copies (紅 + 薄群青) that overprint into 藤紫 and leave the DOM text; the
 * mentoring and leadership record; then the doorway — the `testimonials-noren` placeholder (a direct child of the
 * artboard, so the Seki / Ryōgoku backdrop print inside it sits behind the cloth) with a CSS noren for no-WebGL —
 * placed last so the testimonials → contact walk-through happens in view. Band testimonials-contact.
 */
import type { SectionRender } from '../../core/types';
import { artboardHead, band, fmtDate, marks, printFigure, sectionOpen } from '../../render/helpers';
import { strings } from './strings';

export const render: SectionRender = (rc) => {
  const c = rc.content.copy.testimonials;
  const L = rc.lang;
  const s = strings[L];
  const lead = rc.content.leadership;
  const quotes = rc.content.testimonials.map((q) => {
    const text = rc.esc(q.quote[L]);
    return `<figure class="quote quote--${q.id}" data-quote>` +
      `<blockquote class="quote__body">` +
      `<p class="quote__plate quote__plate--a" aria-hidden="true">${text}</p>` +
      `<p class="quote__plate quote__plate--b" aria-hidden="true">${text}</p>` +
      `<p class="quote__text">${text}</p></blockquote>` +
      `<figcaption class="quote__sig"><cite class="quote__name">${rc.esc(q.name[L])}</cite>` +
      `<span class="quote__role">${rc.esc(q.role[L])}</span><span class="quote__rel">${rc.esc(q.relation[L])} · <time datetime="${q.date}">${rc.esc(fmtDate(q.date, L))}</time></span></figcaption></figure>`;
  }).join('');
  const lab = c.leadershipLabels;
  const facts: [string, number][] = [
    [lab.mentees[L], lead.mentees], [lab.promoted[L], lead.promoted], [lab.interviews[L], lead.interviews],
    [lab.onboarding[L], lead.onboardingReaders], [lab.rfcs[L], lead.rfcs], [lab.ics[L], lead.incidentCommandersTrained],
  ];
  const noren = `<div class="noren-css" aria-hidden="true"><span></span><span class="noren-css__mon"></span><span></span></div>`;
  return (
    sectionOpen('testimonials') +
    artboardHead(rc, { id: 'testimonials', title: c.title, stage: c.stage, takeaway: c.takeaway, plate: 4 }) +
    `<div class="testimonials__quotes" role="group" aria-label="${rc.esc(s.quotes)}">${quotes}</div>` +
    `<section class="testimonials__lead" aria-labelledby="testimonials-lead"><h3 id="testimonials-lead" class="lead__title">${rc.esc(c.leadershipTitle[L])}</h3>` +
    `<dl class="lead__facts">${facts.map(([k, v]) => `<div><dt>${rc.esc(k)}</dt><dd>${v}</dd></div>`).join('')}</dl>` +
    `<ul class="lead__notes">${lead.notes.map((n) => `<li>${rc.esc(n[L])}</li>`).join('')}</ul></section>` +
    `<div class="view testimonials__doorway" data-view-id="testimonials-noren" data-select>` +
    `<div class="doorway__opening">` +
    printFigure(rc, c.figureDay, { sizes: '(min-width: 1024px) 70vw, 100vw', className: 'doorway__print doorway__print--day' }) +
    printFigure(rc, c.figureNight, { sizes: '(min-width: 1024px) 70vw, 100vw', className: 'doorway__print doorway__print--night' }) +
    noren + `</div></div>` +
    marks() +
    band('testimonials-contact') +
    `</section>`
  );
};
