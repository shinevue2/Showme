/**
 * Road — 道中 The Road (DESIGN §6.3, §7.5, video §4.1/§4.5). Owner: WP-06. Node-safe (SSG).
 *
 * Every word is in the HTML. The same markup serves every tier; CSS picks the layout:
 *   film mode (JS, motion on, not Proof): `.film__body` 800 lvh with a sticky `.film__stage` (video, canvas,
 *     chapter-1 poster, rain, night veil, washi grain, seven caption plates faded by the `--film` view timeline);
 *   static tier (no JS, reduced motion, Motion layer off, Proof, `?film=static`): seven chapters in normal
 *     flow, each with its chapter still (`.cap__still`, lazy, never fetched in film mode) and its caption.
 * Deep links #road-1 … #road-7 sit on the captions (static tier); in film mode index.ts moves them to the
 * `.film__anchor` markers placed at each chapter's rest on the scroll span.
 * The section header overlays the first screen of the film as a title slip (題簽) on landscape screens, so the
 * chapter-1 poster sits directly under the summary-road band (WP-05 match cut); on portrait it precedes the film.
 * Band road-works: the film's three gold clouds as DOM SVG (`clouds.ts`).
 */
import type { Lang, RenderCtx, SectionRender, FilmManifest } from '../../core/types';
import type { Chapter } from '../../content/types';
import { artboardHead, band, esc, langAttr, marks, sectionOpen } from '../../render/helpers';
import { manifestEntry } from '../../content/index';
import filmJson from '../../film/film-manifest.json';
import { strings } from './strings';
import { anchorAt, captionRanges } from './timing';
import { artDate, chapterYear, kanjiNumber, tateHtml } from './format';
import { cloudsHtml } from './clouds';
import { rainHtml } from './rain';

const film = filmJson as unknown as FilmManifest;

/** Reference prints: Hakone and Mishima are the WP-02 detail crops (no distant Fuji, no torii — §7.5). */
const REF_IMAGE: Readonly<Record<string, string>> = {
  hakone: 'tokaido/11-hakone-detail.jpg',
  mishima: 'tokaido/12-mishima-detail.jpg',
};

const pct = (x: number): string => `${(Math.round(x * 100000) / 1000).toString()}%`;

/** Body text of a caption: ja may be set vertically (tcy / upright acronyms), others are escaped as is. */
function txt(rc: RenderCtx, s: string): string {
  return rc.lang === 'ja' ? tateHtml(s, esc) : esc(s);
}

/** ja/zh write the print number in kanji like the 五十五 around it (第十四図 / 第十四图); en keeps digits. */
function printNo(L: Lang, n: number): string {
  return strings[L].printNo.replace('{n}', L === 'en' ? String(n) : kanjiNumber(n));
}

function refFigure(rc: RenderCtx, file: string, printNumber: number): string {
  const L = rc.lang;
  const credit = rc.content.credits[file];
  if (!credit) return '';
  const m = manifestEntry(file);
  const inst = m ? strings[L].institutions[m.institution] ?? m.institution : '';
  const sep = L === 'en' ? ' · ' : '・';
  const meta = m ? `${artDate(m.date, L)}${sep}${inst}` : '';
  return (
    `<figure class="print cap__ref" data-select>` +
    `<div class="print__mat deckle">${rc.img(file, { alt: rc.t(credit.alt), sizes: '(max-width: 767px) 120px, 280px' })}</div>` +
    `<figcaption class="print__caption cap__credit"><span class="cap__reflabel">${esc(rc.content.copy.road.refLabel[L])}<span class="cap__print">${esc(printNo(L, printNumber))}</span></span> ` +
    `<span class="cap__reftitle">${esc(rc.t(credit.title))}</span>` +
    // own line on large plates; run on after the title where space is short (portrait), hence the separator
    (meta ? `<span class="cap__refmeta"><span class="cap__refsep">${L === 'en' ? ', ' : ' '}</span>${esc(meta)}</span>` : '') +
    `</figcaption>` +
    `</figure>`
  );
}

/** Static tier only: the chapter's rest frame (lazy; `display: none` in film mode, so never fetched there). */
function chapterStill(rc: RenderCtx, i: number): string {
  const s = film.stills.landscape;
  const v = film.variants.hd;
  return (
    `<picture class="cap__still" aria-hidden="true">` +
    `<source vite-ignore type="image/avif" srcset="${rc.url(s.avif[i]!)}">` +
    `<img vite-ignore src="${rc.url(s.webp[i]!)}" width="${v.w}" height="${v.h}" alt="" decoding="async" loading="lazy">` +
    (i === 6 ? `<span class="cap__rain">${rainHtml('road-rain-s', 'rain')}</span>` : '') +
    `</picture>`
  );
}

function caption(rc: RenderCtx, ch: Chapter, i: number, range: { c0: number; c1: number; first: boolean }): string {
  const L = rc.lang;
  const s = strings[L];
  const st = rc.content.stations.find((x) => x.id === ch.station)!;
  const emp = rc.content.employers.find((e) => e.id === ch.employer)!;
  const plate = rc.content.plates.find((p) => p.n === ch.plate)!;
  const file = REF_IMAGE[st.id] ?? st.image;
  // ja: the colour name with its reading; zh: Japanese colour names kept as such are tagged ja (§3.3)
  const plateName = L === 'ja'
    ? `<ruby>${esc(plate.name.ja)}<rt>${esc(plate.ruby)}</rt></ruby>`
    : L === 'zh' && plate.name.zh === plate.name.ja
      ? `<span lang="${langAttr('ja')}">${esc(plate.name.zh)}</span>`
      : esc(plate.name[L]);
  const title =
    `<h3 id="road-${ch.n}-title" class="cap__title display">` +
    `<span class="cap__year">${esc(chapterYear(ch.year, L))}</span> ` +
    `<span class="cap__station">${esc(st.name[L])}</span> ` +
    `<span class="cap__sub">${esc(st.subtitle[L])}</span></h3>`;
  const body =
    `<div class="cap__body">` +
    `<p class="cap__employer"><span class="cap__emp">${esc(emp.name[L])}</span> <span class="cap__desc">${txt(rc, emp.descriptor[L])}</span></p>` +
    `<p class="cap__role">${txt(rc, ch.role[L])}</p>` +
    `<p class="cap__headline">${txt(rc, ch.headline[L])}</p>` +
    `<p class="cap__scope"><span class="cap__label">${esc(s.scope)}</span> ${txt(rc, ch.scope[L])}</p>` +
    `<ul class="cap__outcomes" aria-label="${esc(s.outcomes)}">${ch.outcomes.map((o) => `<li>${txt(rc, o[L])}</li>`).join('')}</ul>` +
    `<p class="cap__plateline"><span class="cap__swatch plate-layer" data-plate="${ch.plate}" aria-hidden="true"></span>` +
    `<span class="cap__label">${esc(s.plate)}</span> <span class="cap__numeral">${esc(plate.numeral[L])}</span> ${plateName}</p>` +
    `</div>`;
  const vars = `--ch:var(--ch-${ch.n});--c0:${pct(range.c0)};--c1:${pct(range.c1)}`;
  return (
    `<li id="road-${ch.n}" class="cap${range.first ? ' cap--first' : ''}" data-n="${ch.n}" style="${vars}" aria-labelledby="road-${ch.n}-title">` +
    chapterStill(rc, i) +
    `<div class="cap__plate kento" data-select>` +
    `<div class="cap__text">${title}${body}</div>` +
    refFigure(rc, file, st.printNo) +
    `</div>` +
    `</li>`
  );
}

export const render: SectionRender = (rc) => {
  const c = rc.content.copy.road;
  const L = rc.lang;
  const st = film.stills;
  const ranges = captionRanges(film.chapters);
  const poster =
    `<picture class="film__poster">` +
    `<source vite-ignore media="(max-aspect-ratio: 4/5)" type="image/avif" srcset="${rc.url(st.portrait.avif[0]!)}">` +
    `<source vite-ignore media="(max-aspect-ratio: 4/5)" type="image/webp" srcset="${rc.url(st.portrait.webp[0]!)}">` +
    `<source vite-ignore type="image/avif" srcset="${rc.url(st.landscape.avif[0]!)}">` +
    `<img vite-ignore src="${rc.url(st.landscape.webp[0]!)}" width="${film.variants.hd.w}" height="${film.variants.hd.h}" alt="" decoding="async" loading="lazy" fetchpriority="low">` +
    `</picture>`;
  const anchors = film.chapters.map((ch, i) => `<span class="film__anchor" data-anchor="${ch.n}" style="--at:${anchorAt(i, film.chapters.length).toFixed(5)}"></span>`).join('');
  return (
    `<a class="skip-film" href="#works" data-skip-film>${rc.icon('play-skip')}<span>${esc(c.skip[L])}</span></a>` +
    sectionOpen('road', { sticky: true, className: 'film' }) +
    artboardHead(rc, {
      id: 'road', title: c.title, stage: c.stage, takeaway: c.takeaway, plate: 2,
      extra: `<p class="film__direction">${rc.icon('arrow-rtl')}<span>${esc(c.directionNote[L])}</span></p>`,
    }).replace('class="artboard__head"', 'class="artboard__head film__head"') +
    `<div class="film__body">` +
    anchors +
    `<div class="film__stage">` +
    `<div class="film__frames" aria-hidden="true">` +
    `<video class="film__video" muted playsinline disablepictureinpicture disableremoteplayback preload="none" aria-hidden="true" tabindex="-1"></video>` +
    `<canvas class="film__canvas" hidden aria-hidden="true"></canvas>` +
    poster +
    `</div>` +
    `<div class="film__rain" aria-hidden="true">${rainHtml('road-rain', 'rain')}</div>` +
    `<div class="film__veil" aria-hidden="true"></div>` +
    `<div class="film__grain" aria-hidden="true"></div>` +
    `<ol class="film__captions" aria-label="${esc(strings[L].chapters)}">` +
    rc.content.career.map((ch, i) => caption(rc, ch, i, ranges[i]!)).join('') +
    `</ol>` +
    `</div>` +
    `</div>` +
    marks() +
    band('road-works').replace('></div>', `>${cloudsHtml(film.endBands, film.endBandsPortrait, rc.url('img/gen/washi-512.avif'))}</div>`) +
    `</section>`
  );
};
