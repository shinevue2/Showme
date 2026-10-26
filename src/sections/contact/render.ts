/**
 * Contact — 京 · 落款 (DESIGN §6.10). Owner: WP-10.
 * The artboard is a 12-column grid. Cols 1–7: the 京師 print (data-handoff="kyoto") and the arrival line.
 * Cols 8–12: the handwritten letter on ruled 胡粉 paper (vertical 便箋 in ja), its signature and the seal place
 * (`contact-seal` slot + the SVG impression), then the details in the body face and the form (mailto without JS,
 * mailto or a POST endpoint with JS). The letter column is deliberately NOT lifted above the canvas, so the seal
 * stone renders over the paper. Band contact-colophon carries the top half of the 割印.
 */
import type { Lang, SectionRender } from '../../core/types';
import { HTML_LANG } from '../../core/types';
import { artboardHead, marks, printFigure, sectionOpen } from '../../render/helpers';
import { strings } from './strings';

export const render: SectionRender = (rc) => {
  const c = rc.content.copy.contact;
  const L = rc.lang;
  const s = strings[L];
  const site = rc.content.site;
  const p = rc.content.person;
  const cv = (l: Lang) => `<li><a href="${rc.url(`cv/cv-${l}.pdf`)}" hreflang="${HTML_LANG[l]}" type="application/pdf" download>${rc.esc(c.cv[l][L])}</a></li>`;
  const overlap = p.overlap.map((o) => `<li>${rc.esc(o.label[L])} <span class="mono">${o.startJST}–${o.endJST} JST</span></li>`).join('');
  const mailto = `mailto:${site.email}?subject=${encodeURIComponent(s.subject)}`;
  const row = (dt: string, dd: string) => `<div><dt>${dt}</dt><dd>${dd}</dd></div>`;
  return (
    sectionOpen('contact', { className: 'contact' }) +
    artboardHead(rc, { id: 'contact', title: c.title, stage: c.stage, takeaway: c.takeaway, plate: 4 }) +
    `<div class="contact__kyoto">` +
    printFigure(rc, c.figure, { sizes: '(min-width: 1024px) 55vw, 100vw', handoff: 'kyoto', className: 'contact__print' }) +
    `<p class="contact__arrival">${rc.esc(c.arrival[L])}</p>` +
    `</div>` +
    `<div class="contact__side">` +
    `<div class="letter kento" data-letter>` +
    `<div class="letter__body">${c.letter.map((x) => `<p>${rc.esc(x[L])}</p>`).join('')}` +
    `<p class="letter__sign">${rc.esc(c.signature[L])}</p></div>` +
    `<div class="letter__seal" data-view-id="contact-seal" aria-hidden="true"><span class="letter__guide">${rc.esc(s.sealGuide)}</span><span class="letter__stamp"></span></div>` +
    `<p class="visually-hidden letter__sealed" role="status"></p>` +
    `</div>` +
    `<dl class="contact__details" aria-label="${rc.esc(s.details)}">` +
    row(rc.esc(s.email), `<a href="mailto:${site.email}">${rc.esc(site.email)}</a> <button type="button" class="contact__copy js-only" data-copy="${rc.esc(site.email)}">${rc.esc(c.copyEmail[L])}</button>`) +
    row(rc.esc(s.links), `<a href="${rc.esc(site.links.github)}" rel="me">GitHub</a> · <a href="${rc.esc(site.links.linkedin)}" rel="me">LinkedIn</a>`) +
    row(rc.esc(c.cvTitle[L]), `<ul class="contact__cv">${cv('ja')}${cv('en')}${cv('zh')}</ul>`) +
    row(rc.esc(c.availabilityTitle[L]), `${rc.esc(rc.content.copy.cover.facts.availability[L])}<br>${rc.esc(p.availability.kinds[L])}<br><span class="contact__minor">${rc.esc(p.availability.notice[L])}</span>`) +
    row(rc.esc(c.overlapTitle[L]), `${rc.esc(s.location)} <time class="jst-clock mono" data-jst-clock aria-live="off"></time><ul class="contact__overlap">${overlap}</ul>`) +
    row(rc.esc(s.reply), rc.esc(c.responseTime[L])) +
    row(rc.esc(s.auth), rc.esc(c.workAuth[L])) +
    row(rc.esc(s.where), rc.esc(c.relocation[L])) +
    `</dl>` +
    `<form class="contact__form" action="${rc.esc(mailto)}" method="post" enctype="text/plain" data-endpoint="${rc.esc(site.contactEndpoint ?? '')}">` +
    `<label><span>${rc.esc(c.form.name[L])}</span><input name="name" autocomplete="name" required maxlength="120"></label>` +
    `<label><span>${rc.esc(c.form.email[L])}</span><input name="email" type="email" autocomplete="email" required maxlength="200"></label>` +
    `<label><span>${rc.esc(c.form.message[L])}</span><textarea name="message" rows="5" required maxlength="4000"></textarea></label>` +
    `<div class="contact__send-row"><button type="submit" class="contact__send cur-seal">${rc.esc(c.form.send[L])}</button>` +
    `<p class="contact__note">${rc.esc(c.form.mailtoNote[L])}</p></div>` +
    `<p class="contact__status" role="status" aria-live="polite"></p>` +
    `</form>` +
    `</div>` +
    marks() +
    `<div class="ma" id="ma-contact-colophon" data-band="contact-colophon" aria-hidden="true"><span class="wariin wariin--top"></span></div>` +
    `</section>`
  );
};
