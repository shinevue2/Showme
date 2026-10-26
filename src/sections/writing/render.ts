/**
 * Writing — 墨流し · 料紙 (DESIGN §6.8). Owner: WP-10.
 * Cols 1–7: the marbling tray (`writing-marble`) in a wooden tray, nine ink chips (eight plates + clear surfactant,
 * a radio group), the hint and the actions. Cols 8–12: the 書き初め header plate, then OSS / articles / talks, each
 * with its surimono plate and credit. Every item carries `data-item` (its op id) for the tray's hover outlines.
 * Band writing-testimonials.
 */
import type { SectionRender } from '../../core/types';
import { artboardHead, band, fmtDate, marks, printFigure, sectionOpen, viewSlot } from '../../render/helpers';
import { buildOps, ID, INK_HEX } from './ops';
import { strings } from './strings';

export const render: SectionRender = (rc) => {
  const c = rc.content.copy.writing;
  const L = rc.lang;
  const s = strings[L];
  const ops = buildOps(rc.content);
  const guide = (id: number) => {
    const o = ops.find((x) => x.id === id && x.k !== 'drop');
    if (!o) return '';
    const ang = Math.atan2(o.m![1], o.m![0]);
    return ` data-guide="${o.k},${o.a![0].toFixed(4)},${o.a![1].toFixed(4)},${ang.toFixed(4)},${(o.spacing ?? 0).toFixed(4)}"`;
  };
  const chips = rc.content.plates.map((p) =>
    `<label class="ink-chip"><input type="radio" name="ink" value="${p.n}"${p.n === 1 ? ' checked' : ''}>` +
    `<span class="ink-chip__swatch" data-plate="${p.n}" style="--ink-hex:${INK_HEX[p.n]}" aria-hidden="true"></span>` +
    `<span class="ink-chip__n" aria-hidden="true">${rc.esc(p.numeral[L])}</span><span class="visually-hidden">${rc.esc(p.numeral[L])} ${rc.esc(p.name[L])}</span></label>`).join('') +
    `<label class="ink-chip ink-chip--clear"><input type="radio" name="ink" value="0"><span class="ink-chip__swatch" aria-hidden="true"></span>` +
    `<span class="ink-chip__n">${rc.esc(s.clear.replace(/（.*|\s*\(.*/, ''))}</span><span class="visually-hidden">${rc.esc(s.clear)}</span></label>`;
  const repos = rc.content.repos.map((r, i) => {
    const last = r.releases[r.releases.length - 1]!;
    return `<li class="w-item repo" data-item="${ID.repo0 + i}" tabindex="0">` +
      `<code class="repo__name">${rc.esc(r.name)}</code><span class="repo__desc">${rc.esc(r.desc[L])}</span>` +
      `<span class="w-meta">${rc.esc(r.language)} · ${rc.esc(r.stars.toLocaleString('en-US'))} ${rc.esc(c.starsLabel[L])} · ${rc.esc(c.latestLabel[L])} ${rc.esc(last.tag)}${L === 'en' ? ` (${rc.esc(fmtDate(last.date, L))})` : `（${rc.esc(fmtDate(last.date, L))}）`}</span></li>`;
  }).join('');
  const articles = rc.content.articles.map((a, i) =>
    `<li class="w-item article" data-item="${ID.article0 + i}"${guide(ID.article0 + i)}>` +
    `<span class="w-title">${rc.esc(a.title[L])}</span><span class="w-meta">${rc.esc(fmtDate(a.date, L))} · ${rc.esc(a.venue[L])}</span>` +
    `<details><summary>${rc.esc(s.abstract)}</summary><p>${rc.esc(a.abstract[L])}</p></details></li>`).join('');
  const talks = rc.content.talks.map((t, i) =>
    `<li class="w-item talk" data-item="${ID.talk0 + i}"${guide(ID.talk0 + i)} tabindex="0">` +
    `<span class="w-title">${rc.esc(t.title[L])}</span><span class="w-meta">${rc.esc(fmtDate(t.date, L))} · ${rc.esc(t.venue[L])}</span>` +
    `<p class="w-abstract">${rc.esc(t.abstract[L])}</p></li>`).join('');
  const list = (id: string, title: string, fig: typeof c.figures.oss, items: string) =>
    `<section class="w-list" aria-labelledby="writing-${id}"><h3 id="writing-${id}" class="w-list__title">${rc.esc(title)}</h3>` +
    printFigure(rc, fig, { sizes: '140px', className: 'w-list__plate' }) + `<ul class="w-list__items">${items}</ul></section>`;
  return (
    sectionOpen('writing') +
    artboardHead(rc, { id: 'writing', title: c.title, stage: c.stage, takeaway: c.takeaway, plate: 6 }) +
    `<div class="writing__grid">` +
    `<div class="writing__tray">` +
    `<div class="writing__frame">${viewSlot(rc, 'writing-marble', { className: 'writing__view cur-brush' })}</div>` +
    `<p class="writing__hint js-only">${rc.esc(c.dropHint[L])}</p>` +
    `<fieldset class="writing__chips js-only" data-lenis-prevent><legend>${rc.esc(s.inks)}</legend>${chips}</fieldset>` +
    `<div class="writing__actions js-only">` +
    `<button type="button" data-act="drop">${rc.esc(c.dropCentre[L])}</button>` +
    `<button type="button" data-act="print" class="cur-baren">${rc.esc(c.takePrint[L])}</button>` +
    `<button type="button" data-act="download" hidden>${rc.esc(c.download[L])}</button>` +
    `<button type="button" data-act="share">${rc.esc(c.share[L])}</button>` +
    `<button type="button" data-act="reset">${rc.esc(c.reset[L])}</button>` +
    `</div>` +
    `<p class="writing__status" role="status" aria-live="polite"></p>` +
    `</div>` +
    `<div class="writing__lists">` +
    printFigure(rc, c.figures.header, { sizes: '200px', className: 'writing__header-plate' }) +
    list('oss', c.reposTitle[L], c.figures.oss, repos) +
    list('articles', c.articlesTitle[L], c.figures.articles, articles) +
    list('talks', c.talksTitle[L], c.figures.talks, talks) +
    `</div></div>` +
    marks() +
    band('writing-testimonials') +
    `</section>`
  );
};
