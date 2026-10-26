/**
 * 404 page body (DESIGN §6.11 "404"). Owner: WP-10. One trilingual page: Gakutei's spider's-web box, the line in
 * three languages (each block and each part of the visually hidden h1 carries its own `lang`, WP-02 R13) and links
 * to the three homes. The links assume the page is served from the site root.
 */
import type { SectionRender } from '../../core/types';
import { HTML_LANG, LANGS } from '../../core/types';
import { esc, printFigure } from '../../render/helpers';

export const renderNotFound: SectionRender = (rc) => {
  const nf = rc.content.copy.notFound;
  const homes: Record<string, string> = { ja: '', en: 'en/', zh: 'zh/' };
  const blocks = LANGS.map((l) =>
    `<div class="notfound__lang" lang="${HTML_LANG[l]}"><p class="notfound__title">${esc(nf.title[l])}</p><p class="notfound__line">${esc(nf.line[l])}</p>` +
    `<p><a href="${rc.url(homes[l]!)}" hreflang="${HTML_LANG[l]}">${esc(nf.home[l])}</a></p></div>`).join('');
  const h1 = LANGS.map((l) => `<span lang="${HTML_LANG[l]}">${esc(nf.title[l])}</span>`).join(' · ');
  return (
    `<section id="notfound" class="artboard notfound" data-section="colophon" aria-labelledby="notfound-title">` +
    `<h1 id="notfound-title" class="visually-hidden">404 — ${h1}</h1>` +
    printFigure(rc, nf.figure, { sizes: '(min-width: 1024px) 30vw, 70vw', eager: true, className: 'notfound__figure' }) +
    `<div class="notfound__text">${blocks}</div>` +
    `<div class="artboard__marks tombo kento" aria-hidden="true"></div>` +
    `</section>`
  );
};
