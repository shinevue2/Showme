/**
 * Colophon — 奥付 (DESIGN §6.11). Owner: WP-10.
 * A `.kyokaku` back-matter spread: picture credits for every image the site shows (left page, two columns, 64 px
 * thumbnails, IBM Plex Mono) and the 奥付 block (right page, vertical in ja/zh: book title, author, publisher,
 * 彫 libraries, 摺 pipeline, 料紙 fonts, 画 pictures, edition and 節気 date stamp, sample notice). Then the
 * libraries beside the wheeled book case, live page weight / Web Vitals / build, today's print at 620 px with Save,
 * the `colophon-emaki` handscroll and 大尾. The bottom half of the 割印 sits on the top edge. No band.
 */
import type { RenderCtx, SectionRender } from '../../core/types';
import { artboardHead, esc, marks, printFigure, sectionOpen, viewSlot } from '../../render/helpers';
import { manifestEntry } from '../../content/index';
import { solarTerm, reiwaYear } from '../../core/solar-term';
import edition from '../../../build/edition.json';
import { strings } from './strings';

/** Every image file the site renders: copy figures, case art, film reference prints and every credited file. */
export function usedImages(rc: RenderCtx): string[] {
  const out = new Set<string>();
  const walk = (v: unknown): void => {
    if (typeof v === 'string') { if (/\.(jpe?g|png)$/i.test(v)) out.add(v); return; }
    if (Array.isArray(v)) { v.forEach(walk); return; }
    if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(rc.content.copy);
  rc.content.cases.forEach((c) => out.add(c.art.file));
  rc.content.stations.forEach((s) => out.add(s.image));
  Object.keys(rc.content.credits).forEach((f) => out.add(f));
  return [...out].filter((f) => !!manifestEntry(f)).sort();
}

const K = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
const kanjiNum = (n: number): string => n < 10 ? K[n]! : (Math.floor(n / 10) > 1 ? K[Math.floor(n / 10)]! : '') + '十' + (n % 10 ? K[n % 10]! : '');

export function dateStamp(rc: RenderCtx, d = new Date()): string {
  const term = solarTerm(d);
  const p = rc.content.copy.colophon.datePattern[rc.lang];
  return p.replace('{y}', kanjiNum(reiwaYear(d))).replace('{yyyy}', String(d.getUTCFullYear())).replace('{term}', rc.lang === 'en' ? term.en : rc.lang === 'zh' ? term.zh : term.ja);
}

export function editionLine(rc: RenderCtx): string {
  const p = rc.content.copy.colophon.editionPattern[rc.lang];
  const v = rc.lang === 'en' ? String(edition.v) : kanjiNum(edition.v);
  const n = rc.lang === 'en' ? String(edition.n) : kanjiNum(edition.n);
  return p.replace('{v}', v).replace('{n}', n);
}

export const render: SectionRender = (rc) => {
  const c = rc.content.copy.colophon;
  const L = rc.lang;
  const s = strings[L];
  const files = usedImages(rc);
  const credits = files.map((f) => {
    const m = manifestEntry(f)!;
    const cr = rc.content.credits[f] ?? rc.content.credits[f.replace(/-detail(\.[a-z]+)$/, '$1')];
    let title = cr?.title[L] || cr?.title.en || `${m.artist}, ${m.title}`;
    if (/-detail\./.test(f) && !title.includes(s.detail.trim())) title += s.detail;
    // the institutional half of the manifest's creditText (date, museum, credit line, licence)
    const inst = [m.date, [m.institution, m.creditLine].filter(Boolean).join(', ')].filter(Boolean).join('. ');
    return `<li class="credit" data-credit="${esc(f)}">${rc.img(f, { alt: '', sizes: '56px', className: 'credit__thumb' })}` +
      `<span class="credit__body"><span class="credit__title">${esc(title)}</span><span class="credit__text">${esc(inst)}. ${esc(s.licence)}</span>` +
      `<a class="credit__link" href="${esc(m.objectUrl)}" rel="noopener">${esc(s.source)}</a></span></li>`;
  }).join('');
  const tate = L === 'en' ? '' : ' tate';
  const row = (dt: string, dd: string) => `<div><dt>${dt}</dt><dd>${dd}</dd></div>`;
  return (
    sectionOpen('colophon') +
    `<span class="wariin wariin--bottom" aria-hidden="true"></span>` +
    artboardHead(rc, { id: 'colophon', title: c.title, stage: c.stage, takeaway: c.takeaway, plate: 7 }) +
    `<div class="colophon__spread kyokaku" data-fold><span class="gyobi" aria-hidden="true"></span>` +
    `<div class="colophon__made">` +
    printFigure(rc, c.booksFigure, { sizes: '200px', className: 'colophon__books' }) +
    `<div class="colophon__libs"><h3 class="colophon__h">${esc(s.libraries)}</h3><ul>${c.libraries.map((l) => `<li><span>${esc(l.name)}</span> <span class="mono">${esc(l.version)}</span> <span class="lic">${esc(l.licence)}</span></li>`).join('')}</ul></div>` +
    `<dl class="colophon__live">` +
    row(esc(c.weightLabel[L]), `<output data-live="weight">—</output>`) +
    row(esc(c.vitalsLabel[L]), `<output data-live="vitals">—</output>`) +
    row(esc(c.buildLabel[L]), `<output data-live="build">v${rc.content.site.versionMajor} · ${esc(editionLine(rc))}</output>`) +
    `</dl></div>` +
    `<footer class="colophon__okuzuke${tate}">` +
    `<p class="okuzuke__title">${esc(c.bookTitle[L])}</p>` +
    `<p class="okuzuke__people">${esc(c.author[L])}</p><p class="okuzuke__people">${esc(c.publisher[L])}</p>` +
    `<dl class="okuzuke">` +
    row(esc(c.carving[L]), esc(s.carvingLine)) +
    row(esc(c.printing[L]), esc(s.pipeline)) +
    row(esc(c.paper[L]), esc(s.fontsLine.replace('{n}', String(c.fonts.length)))) +
    row(esc(c.pictures[L]), esc(s.imagesLine.replace('{n}', String(files.length)))) +
    `</dl>` +
    `<p class="okuzuke__edition">${esc(editionLine(rc))}</p>` +
    `<p class="okuzuke__date">${esc(dateStamp(rc))}</p>` +
    (rc.content.site.sampleNotice ? `<p class="okuzuke__sample">${esc(rc.content.site.sampleNoticeText[L])}</p>` : '') +
    `</footer></div>` +
    `<section class="colophon__credits" aria-labelledby="colophon-credits"><h3 id="colophon-credits" class="colophon__h">${esc(s.credits)}</h3><ul class="credits">${credits}</ul></section>` +
    `<div class="colophon__print js-only">` +
    `<div class="colophon__print-note"><h3 class="colophon__h">${esc(c.todaysPrint[L])}</h3><p>${esc(s.printNote)}</p>` +
    `<button type="button" class="colophon__save cur-baren">${esc(c.savePrint[L])}</button></div>` +
    `<canvas class="colophon__canvas" width="620" height="912" role="img" aria-label="${esc(s.printAlt)}"></canvas></div>` +
    viewSlot(rc, 'colophon-emaki', { className: 'colophon__view' }) +
    `<div class="colophon__end">` +
    printFigure(rc, c.nightFigure, { sizes: '240px', className: 'colophon__moon' }) +
    `<p class="colophon__finale" lang="ja">${esc(c.finale.ja)}</p>` +
    `</div>` +
    marks() +
    `</section>`
  );
};
