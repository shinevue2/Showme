/**
 * Static chrome markup — the 版下 workbench (DESIGN §4). Owner: WP-04. Node-safe: imported by
 * src/render/page.ts (no DOM, no CSS, no import.meta.env).
 *
 * Every page gets the document bar: crest, name, the express lane (works without JS: plain links and a
 * <details> CV menu), the language links (real <a hreflang> under the type wheel) and, with JS, the theme
 * chips and tool buttons. Main and case pages also get the rulers, the Layers / Separations panel and the
 * status bar (all `js-only`: they are instruments, not content). Main pages carry a print-only CV sheet
 * (`.cv-sheet`, display:none on screen) that print.css lays out as a two-page A4 CV.
 */
import type { Lang, RenderCtx, SectionId } from '../core/types';
import { HTML_LANG, LANGS, SECTION_ORDER } from '../core/types';
import { plateNumeral } from '../core/numerals';
import type { T } from '../content/types';
import { toolLabels } from '../content/facts';
import edition from '../../build/edition.json';
import { strings, fill, type ChromeStrings } from './strings';

const LANG_LABEL: Record<Lang, string> = { ja: '日本語', en: 'English', zh: '简体中文' };
/** One sort per sector of the type wheel, in the language's own script. */
const LANG_SORT: Record<Lang, string> = { ja: '日', en: 'A', zh: '中' };

/** 丸に三つ組子 (WP-02 public/img/gen/crest.svg, assets-src/svg/crest.json): ring + six half-lapped strips. */
const CREST_PATHS =
  '<path d="M2 50A48 48 0 1 1 98 50A48 48 0 1 1 2 50ZM9.68 50A40.32 40.32 0 1 0 90.32 50A40.32 40.32 0 1 0 9.68 50Z"/>' +
  '<path d="M56.61 81.12L33.93 41.84L27.83 41.84L52.03 83.76Z"/><path d="M28.94 33.2L26.35 28.72L21.78 31.36L22.84 33.2Z"/>' +
  '<path d="M19.74 40.16L65.1 40.16L68.15 34.88L19.74 34.88Z"/><path d="M75.08 40.16L80.26 40.16L80.26 34.88L78.13 34.88Z"/>' +
  '<path d="M73.65 28.72L50.97 68L54.02 73.28L78.22 31.36Z"/><path d="M45.98 76.64L43.39 81.12L47.97 83.76L49.03 81.92Z"/>';
export const CREST_SVG = (cls: string, size: number) =>
  `<svg class="${cls}" viewBox="0 0 100 100" width="${size}" height="${size}" fill="currentColor" aria-hidden="true" focusable="false">${CREST_PATHS}</svg>`;

/**
 * Wang Zhen's revolving type table (王禎 轉輪排字架, 1313) as the language control: a rim, three spokes and
 * one sort per language sector. Sector k (0 ja, 1 en, 2 zh) is centred at k·120°; the dial turns so the
 * current language sits under the index notch at 12 o'clock.
 */
function wheelSvg(): string {
  const r = 17, cx = 20, cy = 20;
  const spokes = [60, 180, 300].map((a) => {
    const t = (a - 90) * Math.PI / 180;
    return `M${cx} ${cy}L${(cx + r * Math.cos(t)).toFixed(2)} ${(cy + r * Math.sin(t)).toFixed(2)}`;
  }).join('');
  const sorts = LANGS.map((l, k) => {
    const t = (k * 120 - 90) * Math.PI / 180;
    const x = cx + 10.5 * Math.cos(t), y = cy + 10.5 * Math.sin(t);
    return `<g class="wheel__sort" data-sort="${l}" transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${k * 120})">` +
      `<rect x="-4.6" y="-4.6" width="9.2" height="9.2"/><text lang="${HTML_LANG[l]}" y="0.4">${LANG_SORT[l]}</text></g>`;
  }).join('');
  // small sorts set around the rim (the type the compositor turns the table to reach)
  const rim = Array.from({ length: 12 }, (_, i) => {
    const t = (i * 30 + 15 - 90) * Math.PI / 180;
    return `<rect x="${(cx + 15.4 * Math.cos(t) - 0.9).toFixed(2)}" y="${(cy + 15.4 * Math.sin(t) - 0.9).toFixed(2)}" width="1.8" height="1.8"/>`;
  }).join('');
  return `<svg class="wheel__svg" viewBox="0 0 40 40" width="40" height="40" aria-hidden="true" focusable="false">` +
    `<g class="wheel__dial"><circle class="wheel__rim" cx="${cx}" cy="${cy}" r="${r}"/><path class="wheel__spokes" d="${spokes}"/>` +
    `<g class="wheel__rimsorts">${rim}</g>${sorts}</g>` +
    `<path class="wheel__index" d="M20 0.5v4.2M17.6 0.5h4.8"/></svg>`;
}

function pathFor(lang: Lang, rc: RenderCtx): string {
  const prefix = lang === 'ja' ? '' : `${lang}/`;
  return rc.page === 'case' && rc.caseId ? `${prefix}works/${rc.caseId}/` : prefix;
}

function eyeButton(rc: RenderCtx, s: ChromeStrings, name: string, attrs: string): string {
  // a toggle button keeps one name ("Show X") and reports its state with aria-pressed (pressed = visible)
  return `<button type="button" class="eye" aria-pressed="true" aria-label="${rc.esc(fill(s.show, { name }))}"${attrs}>` +
    rc.icon('eye').replace('class="icon"', 'class="icon eye__on"') + rc.icon('eye-off').replace('class="icon"', 'class="icon eye__off"') +
    `</button>`;
}

/* ------------------------------------------------------------------ document bar */
function docbar(rc: RenderCtx, s: ChromeStrings, home: string): string {
  const name = rc.content.person.name[rc.lang];
  const cv = (l: Lang, label: string) =>
    `<li><a href="${rc.url(`cv/cv-${l}.pdf`)}" hreflang="${HTML_LANG[l]}" type="application/pdf">${rc.esc(label)}<span class="docbar__pdf" aria-hidden="true">${s.pdf}</span></a></li>`;
  const langLinks = LANGS.map((l) => {
    const href = rc.url(pathFor(l, rc));
    const cur = l === rc.lang ? ' aria-current="page"' : '';
    return `<a class="lang-nav__link" href="${href}" hreflang="${HTML_LANG[l]}" lang="${HTML_LANG[l]}" data-lang-switch="${l}"${cur}>${LANG_LABEL[l]}</a>`;
  }).join('');
  const notice = rc.page === 'main' && rc.lang === 'ja'
    ? `<div class="docbar__notice js-only" data-notice-box hidden>` +
      `<a data-notice="en" href="${rc.url('en/')}" hreflang="en" lang="en">${s.notice.en}</a>` +
      `<a data-notice="zh" href="${rc.url('zh/')}" hreflang="zh-Hans" lang="zh-Hans">${s.notice.zh}</a>` +
      `<button type="button" class="docbar__dismiss" data-notice-dismiss aria-label="${rc.esc(s.dismiss)}">${rc.icon('close')}</button></div>`
    : '';
  const tool = (id: string, icon: Parameters<RenderCtx['icon']>[0], label: string, kbd: string, extra: string) =>
    `<button type="button" class="tool js-only" data-tool="${id}" aria-label="${rc.esc(label)}"${extra}>${rc.icon(icon)}` +
    `<span class="tool__tip" aria-hidden="true"${kbd ? ` data-kbd="${kbd}"` : ''}>${rc.esc(label)}</span></button>`;   // key drawn by CSS: the visible text stays equal to the accessible name
  const mTool = (id: string, icon: Parameters<RenderCtx['icon']>[0], label: string, controls: string) =>
    `<button type="button" class="mtool js-only" data-opens="${id}" aria-controls="${controls}" aria-expanded="false">${rc.icon(icon)}<span>${rc.esc(label)}</span></button>`;
  const full = rc.page !== 'notfound';
  return (
    `<header class="chrome docbar" data-chrome>` +
    `<div class="docbar__id">` +
    `<a class="docbar__crest" href="${home}#cover" aria-label="${rc.esc(name)} — ${rc.esc(s.home)}">${CREST_SVG('crest', 24)}</a>` +
    `<span class="docbar__name">${rc.esc(name)}</span>` +
    `<span class="docbar__meta">${rc.esc(s.metaLine)}</span>` +
    `</div>` +
    `<nav class="docbar__express" aria-label="${rc.esc(s.express)}">` +
    `<a href="${home}#works">${s.works}</a>` +
    `<details class="docbar__cv" data-cv><summary aria-label="${rc.esc(s.cvMenu)}"><span>${s.cv}</span><i class="caret" aria-hidden="true"></i></summary>` +
    `<ul class="docbar__cvlist">${cv('ja', s.cvJa)}${cv('en', s.cvEn)}${cv('zh', s.cvZh)}</ul></details>` +
    `<a href="${home}#contact">${s.contact}</a>` +
    (rc.page === 'main' ? `<a class="docbar__skip" href="#works" data-skip-film>${rc.icon('play-skip')}<span>${s.skipFilm}</span></a>` : '') +
    `</nav>` +
    `<div class="docbar__tools">` +
    (full ? mTool('layers', 'layers', s.mLayers, 'layers-panel') + mTool('separations', 'separations', s.mSeparations, 'layers-panel') + mTool('info', 'info', s.mInfo, 'status-sheet') : '') +
    `<div class="wheel" data-wheel>` +
    `<button type="button" class="wheel__btn js-only" aria-expanded="false" aria-controls="lang-nav">${wheelSvg()}<span class="wheel__cur" lang="${HTML_LANG[rc.lang]}">${LANG_LABEL[rc.lang]}</span><span class="visually-hidden"> — ${rc.esc(s.wheel)}</span></button>` +
    `<span class="wheel__face" aria-hidden="true">${wheelSvg()}</span>` +
    `<nav class="lang-nav" id="lang-nav" aria-label="${rc.esc(s.languages)}"><span class="lang-nav__grip" aria-hidden="true"><i></i><i></i><i></i></span>${langLinks}</nav>` +
    `</div>` +
    `<div class="theme-chips js-only" role="group" aria-label="${rc.esc(s.theme)}">` +
    `<button type="button" class="chip" data-theme-set="light" aria-pressed="false" aria-label="${rc.esc(s.day)}">${rc.icon('chip-day')}<span class="chip__label" aria-hidden="true">${s.day}</span></button>` +
    `<button type="button" class="chip" data-theme-set="dark" aria-pressed="false" aria-label="${rc.esc(s.night)}">${rc.icon('chip-night')}<span class="chip__label" aria-hidden="true">${s.night}</span></button>` +
    `</div>` +
    tool('outline', 'outline', s.outline, 'Y', ' aria-pressed="false" aria-keyshortcuts="Y Shift+Y Control+Y Meta+Y"') +
    (rc.page === 'main' ? tool('proof', 'proof', s.proof, '', ' aria-pressed="false"') : '') +
    (full ? tool('info', 'info', s.info, 'i', ' aria-expanded="false" aria-controls="status-sheet" aria-keyshortcuts="I"') : '') +
    `</div>` +
    (full ? `<button type="button" class="docbar__menu js-only" data-opens="layers" aria-controls="layers-panel" aria-expanded="false" aria-label="${rc.esc(s.menu)}">${rc.icon('menu')}</button>` : '') +
    notice +
    (rc.page === 'main' ? `<p class="docbar__proof" data-proof-banner>${rc.icon('proof')}<span>${s.proofBanner}</span><a href="./" data-proof-exit>${s.proofExit}</a></p>` : '') +
    `</header>`
  );
}

/* ------------------------------------------------------------------ rulers */
function rulers(): string {
  return `<div class="chrome rulers js-only" aria-hidden="true" data-rulers>` +
    `<span class="rulers__corner"><i></i></span><canvas class="ruler ruler--top"></canvas><canvas class="ruler ruler--left"></canvas></div>` +
    `<div class="chrome progress-ruler js-only" aria-hidden="true"><i></i></div>`;
}

/* ------------------------------------------------------------------ Layers + Separations */
function layerName(rc: RenderCtx, id: SectionId): string {
  return rc.content.copy[id].layer[rc.lang];
}

function layersPanel(rc: RenderCtx, s: ChromeStrings, home: string): string {
  const L = rc.lang;
  const main = rc.page === 'main';
  const href = (id: string) => (main ? `#${id}` : `${home}#${id}`);
  const n = SECTION_ORDER.length;
  const stripRows = [`<span class="strip-row" data-row="motion" style="--sw:var(--layer-motion)"><i class="strip-eye"></i><i class="strip-sw"></i></span><span class="strip-rule"></span>`]
    .concat(SECTION_ORDER.map((id) => `<span class="strip-row" data-row="${id}" style="--sw:var(--layer-${id})"><i class="strip-eye"></i><i class="strip-sw"></i></span>`)).join('');

  const roadSub = rc.content.career.map((ch) => {
    const st = rc.content.stations.find((x) => x.id === ch.station);
    return `<li><a href="${href(`road-${ch.n}`)}"><span class="mono">${rc.esc(ch.year)}</span> ${rc.esc(st ? st.name[L] : '')}</a></li>`;
  }).join('');

  const rows = SECTION_ORDER.map((id, i) => {
    const name = layerName(rc, id);
    const twisty = id === 'road'
      ? `<button type="button" class="twisty" aria-expanded="false" aria-controls="road-sub" aria-label="${rc.esc(s.chapters)}"><i aria-hidden="true"></i></button>` : '<span class="twisty-gap"></span>';
    return `<li class="layer-row" data-layer="${id}" style="--sw:var(--layer-${id})">` +
      (main ? eyeButton(rc, s, name, ` data-eye="${id}"`) : '<span class="eye-gap"></span>') +
      twisty +
      `<span class="sw" aria-hidden="true"><i></i></span>` +
      `<a class="layer-row__name" href="${href(id)}" data-goto="${id}">${rc.esc(name)}</a>` +
      `<span class="layer-row__idx">${i + 1}/${n}</span>` +
      (id === 'road' ? `<ul class="layer-sub" id="road-sub" hidden>${roadSub}</ul>` : '') +
      `</li>`;
  }).join('');

  // phones: the express lane is the sheet's first row — Works · Contact, then one CV line (label once, three PDFs)
  const cv = (l: Lang, label: string) => `<a href="${rc.url(`cv/cv-${l}.pdf`)}" hreflang="${HTML_LANG[l]}" type="application/pdf"><span class="visually-hidden">${rc.esc(s.cv)} </span>${rc.esc(label)}</a>`;
  const express = `<nav class="layers__express" aria-label="${rc.esc(s.expressRow)}"><a href="${href('works')}">${s.works}</a><a href="${href('contact')}">${s.contact}</a>` +
    `<span class="layers__cv"><span class="layers__cvlabel" aria-hidden="true">${rc.esc(s.cv)}<span class="mono">${s.pdf}</span></span>${cv('ja', s.cvJa)}${cv('en', s.cvEn)}${cv('zh', s.cvZh)}</span></nav>`;

  const plates = rc.content.plates.map((p) => {
    const station = p.station === 'gold' ? null : rc.content.stations.find((x) => x.id === p.station);
    const where = station ? station.name[L] : s.goldClouds;
    const num = plateNumeral(p.n, L);
    const nameHtml = L === 'en'
      ? `<span>${rc.esc(p.name.en)}</span>`
      : L === 'ja' ? `<ruby>${rc.esc(p.name.ja)}<rt>${rc.esc(p.ruby)}</rt></ruby>` : `<span>${rc.esc(p.name.zh)}</span>`;
    return `<li class="plate-row" data-plate-row="${p.n}"${p.n === 1 ? ' data-inked' : ''}>` +
      eyeButton(rc, s, `${num} ${p.name[L]}`, ` data-plate-eye="${p.n}"${p.n === 1 ? ' disabled title="' + rc.esc(s.keyLocked) + '"' : ' disabled'}`) +
      `<span class="sw sw--plate" data-plate="${p.n}" aria-hidden="true"><i></i></span>` +
      `<span class="plate-row__num${L === 'en' ? ' mono' : ''}">${num}</span>` +
      `<span class="plate-row__text"><span class="plate-row__name">${nameHtml}</span>` +
      `<span class="plate-row__meta"><span class="mono">${rc.esc(p.year)}</span> ${rc.esc(where)}</span></span>` +
      `<span class="visually-hidden plate-row__state" data-uninked-label="${rc.esc(s.uninked)}">${p.n === 1 ? '' : rc.esc(s.uninked)}</span>` +
      `</li>`;
  }).join('');
  const bar = rc.content.plates.map((p) => `<span class="colorbar__chip" data-plate="${p.n}"${p.n === 1 ? ' data-inked' : ''}>${plateNumeral(p.n, L)}</span>`).join('');

  const grip = `<span class="panel__grip" aria-hidden="true"><i></i><i></i><i></i></span>`;
  return (
    `<aside class="chrome layers js-only" data-layers aria-label="${rc.esc(s.layerPanel)}">` +
    `<button type="button" class="layers__strip" aria-expanded="false" aria-controls="layers-panel" aria-label="${rc.esc(s.layerPanel)}">` +
    `<span class="layers__stripicon" aria-hidden="true">${rc.icon('layers')}</span><span class="strip-rows" aria-hidden="true">${stripRows}</span></button>` +
    `<div class="layers__panel panel" id="layers-panel" data-tab="layers">` +
    grip +
    `<div class="panel__head"><div class="panel__tabs" role="tablist" aria-label="${rc.esc(s.layerPanel)}">` +
    `<button type="button" role="tab" id="tab-layers" data-tab-btn="layers" aria-controls="tp-layers" aria-selected="true">${s.layers}</button>` +
    `<button type="button" role="tab" id="tab-separations" data-tab-btn="separations" aria-controls="tp-separations" aria-selected="false" tabindex="-1">${s.separations}</button>` +
    `</div><button type="button" class="panel__close" data-close aria-label="${rc.esc(s.close)}">${rc.icon('close')}</button></div>` +
    `<div class="panel__body" role="tabpanel" tabindex="0" id="tp-layers" aria-labelledby="tab-layers" data-tab-panel="layers">` +
    express +
    `<ul class="layer-list layer-list--motion"><li class="layer-row layer-row--motion" data-layer="motion" style="--sw:var(--layer-motion)">` +
    (main || rc.page === 'case' ? eyeButton(rc, s, s.motionLayer, ' data-eye="motion"') : '') +
    `<span class="twisty-gap"></span><span class="sw" aria-hidden="true"><i></i></span>` +
    `<span class="layer-row__name">${s.motionLayer}</span><span class="layer-row__idx">12</span>` +
    `<span class="layer-row__hint" data-motion-hint hidden>${s.motionHint}</span></li></ul>` +
    `<ul class="layer-list layer-list--sections">${rows}</ul>` +
    `<p class="panel__foot">${rc.esc(fill(s.artboards, { n }))}</p>` +
    `</div>` +
    `<div class="panel__body" role="tabpanel" tabindex="0" id="tp-separations" aria-labelledby="tab-separations" data-tab-panel="separations" hidden>` +
    `<div class="seps__print">` +
    `<div class="seps__thumb"><canvas class="seps__canvas" width="120" height="176" aria-hidden="true"></canvas></div>` +
    `<div class="seps__meta"><p class="seps__title">${s.todaysPrint}</p>` +
    `<p class="seps__line"><span>${s.seed}</span> <span class="mono" data-seed>—</span></p>` +
    `<p class="seps__line mono" data-inked-count>${rc.esc(fill(s.inkedCount, { n: 1 }))}</p></div>` +
    `<button type="button" class="seps__save" data-save-print>${rc.icon('download')}<span>${s.savePrint}</span></button>` +
    `</div>` +
    `<div class="colorbar seps__bar" aria-hidden="true">${bar}</div>` +
    `<ul class="plate-list">${plates}</ul>` +
    `</div>` +
    `</div>` +
    `</aside>`
  );
}

/* ------------------------------------------------------------------ status bar */
function statusBar(rc: RenderCtx, s: ChromeStrings): string {
  const grip = `<span class="panel__grip" aria-hidden="true"><i></i><i></i><i></i></span>`;
  return (
    `<div class="chrome status js-only" data-status data-edition="${edition.v}.${edition.n}">` +
    `<div class="status__line">` +
    `<span class="st st--term"><i class="st__season"></i><span data-st="term"></span></span>` +
    `<span class="st" data-st="date"></span>` +
    `<time class="st" data-jst-clock aria-live="off"></time>` +
    `<span class="st st--num" data-st="fps"></span>` +
    `<span class="st st--num" data-st="draws"></span>` +
    `<span class="st" data-st="tier"></span>` +
    `<span class="st st--board" data-st="board"></span>` +
    `<span class="st st--num" data-st="xy"></span>` +
    `<span class="st" data-st="zoom">100%</span>` +
    `<button type="button" class="status__toggle" aria-expanded="false" aria-controls="status-sheet" aria-keyshortcuts="I">${rc.esc(s.sheet)}<i class="caret" aria-hidden="true"></i></button>` +
    `</div>` +
    `<div class="status__sheet panel" id="status-sheet" data-tab="info">` +
    grip +
    `<div class="panel__head"><div class="panel__tabs" role="tablist" aria-label="${rc.esc(s.sheet)}">` +
    `<button type="button" role="tab" id="tab-info" data-tab-btn="info" aria-controls="tp-info" aria-selected="true">${s.tabInfo}</button>` +
    `<button type="button" role="tab" id="tab-glossary" data-tab-btn="glossary" aria-controls="tp-glossary" aria-selected="false" tabindex="-1">${s.tabGlossary}</button>` +
    `<button type="button" role="tab" id="tab-settings" data-tab-btn="settings" aria-controls="tp-settings" aria-selected="false" tabindex="-1">${s.tabSettings}</button>` +
    `</div><button type="button" class="panel__close" data-close aria-label="${rc.esc(s.close)}">${rc.icon('close')}</button></div>` +
    `<div class="panel__body sheet__body" role="tabpanel" tabindex="0" id="tp-info" aria-labelledby="tab-info" data-tab-panel="info"></div>` +
    `<div class="panel__body sheet__body" role="tabpanel" tabindex="0" id="tp-glossary" aria-labelledby="tab-glossary" data-tab-panel="glossary" hidden></div>` +
    `<div class="panel__body sheet__body" role="tabpanel" tabindex="0" id="tp-settings" aria-labelledby="tab-settings" data-tab-panel="settings" hidden></div>` +
    `</div>` +
    `</div>`
  );
}

/* ------------------------------------------------------------------ print-only CV (print.css) */
function cvSheet(rc: RenderCtx, s: ChromeStrings): string {
  const L = rc.lang;
  const c = rc.content;
  const e = rc.esc;
  const t = (x: T) => e(x[L]);
  const date = (iso: string | null) => {
    if (!iso) return L === 'ja' ? '現在' : L === 'zh' ? '至今' : 'present';
    const [y, m] = iso.split('-');
    return L === 'en' ? `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(m) - 1]} ${y}` : `${y}.${m}`;
  };
  const metric = (id: string) => c.metrics.find((m) => m.id === id);
  const head =
    `<header class="cv__head">` +
    `<div class="cv__who"><p class="cv__name">${e(c.person.name[L])}</p>` +
    `<p class="cv__alt">${LANGS.filter((l) => l !== L).map((l) => `<span lang="${HTML_LANG[l]}">${e(c.person.name[l])}</span>`).join(' · ')}</p>` +
    `<p class="cv__role">${t(c.person.role)} · ${t(c.person.specialty)}</p></div>` +
    `<dl class="cv__contact">` +
    `<div><dt>${s.cv_contact}</dt><dd>${e(c.site.email)}</dd></div>` +
    `<div><dt>GitHub</dt><dd>${e(c.site.links.github.replace(/^https:\/\/(www\.)?/, ''))}</dd></div>` +
    `<div><dt>LinkedIn</dt><dd>${e(c.site.links.linkedin.replace(/^https:\/\/(www\.)?/, ''))}</dd></div>` +
    `<div><dt>${s.cv_based}</dt><dd>${t(c.person.location)}</dd></div>` +
    `</dl>${CREST_SVG('cv__crest', 40)}</header>`;
  const avail = `<p class="cv__avail">${t(c.copy.cover.facts.availability)} · ${t(c.person.availability.kinds)}</p>`;
  const summary = `<section class="cv__block"><h2>${s.cv_summary}</h2>${c.copy.summary.paragraphs.map((p) => `<p>${t(p)}</p>`).join('')}</section>`;
  const results = `<section class="cv__block"><h2>${t(c.copy.summary.resultsTitle)}</h2><ul class="cv__results">` +
    c.copy.summary.results.map((id) => {
      const m = metric(id);
      return m ? `<li><span class="cv__num">${t(m.display)}</span><span class="cv__lab">${t(m.label)}</span><span class="cv__per">${e(m.period)}</span></li>` : '';
    }).join('') + `</ul></section>`;
  const exp = c.employers.map((emp) => {
    const rows = c.copy.summary.ledger.filter((r) => r.employer === emp.id)
      .map((r) => `<li><span class="cv__dates">${date(r.from)}–${date(r.to)}</span><span><b>${t(r.role)}</b> — ${t(r.scope)}</span></li>`).join('');
    const chapters = c.career.filter((ch) => ch.employer === emp.id)
      .map((ch) => {
        const stop = L === 'en' ? '. ' : '。';
        const body = [t(ch.headline), ...ch.outcomes.map((o) => t(o))].map((x) => x.replace(/[.。]$/, '')).join(stop) + stop.trim();
        return `<li><span class="cv__dates">${e(ch.year)}</span><span>${body}</span></li>`;
      }).join('');
    return `<article class="cv__emp"><h3>${t(emp.name)} <span>${t(emp.descriptor)}</span> <span class="cv__dates">${date(emp.from)}–${date(emp.to)}</span></h3>` +
      `<ul class="cv__rows">${rows}</ul><ul class="cv__rows cv__rows--ch">${chapters}</ul></article>`;
  }).join('');
  const experience = `<section class="cv__block"><h2>${s.cv_experience}</h2>${exp}</section>`;
  const work = `<section class="cv__block cv__page2"><h2>${s.cv_work}</h2><ul class="cv__cases">` +
    c.cases.map((cs) => `<li><b>${t(cs.title)}</b> <span class="cv__dates">${e(cs.period)}</span><br>${t(cs.result)}</li>`).join('') + `</ul></section>`;
  const skills = `<section class="cv__block"><h2>${s.cv_skills}</h2><dl class="cv__skills">` +
    c.domains.map((d) => {
      const tools = c.tools.filter((x) => x.domain === d.id).sort((a, b) => b.years - a.years)
        .map((x) => `${e(toolLabels[x.id]?.[L] ?? x.name)} <span class="cv__y">${x.years}</span>`).join(', ');
      return `<div><dt>${t(d.name)}</dt><dd>${tools}</dd></div>`;
    }).join('') + `</dl></section>`;
  const used = new Set<string>(c.copy.summary.results);
  const more = `<section class="cv__block"><h2>${s.cv_more}</h2><ul class="cv__more">` +
    c.metrics.filter((m) => !used.has(m.id)).map((m) => `<li><span class="cv__num">${t(m.display)}</span> ${t(m.label)} <span class="cv__per">${e(m.period)}</span></li>`).join('') + `</ul></section>`;
  const writing = `<section class="cv__block"><h2>${s.cv_writing}</h2><ul class="cv__plain">` +
    c.repos.map((r) => `<li><b>${e(r.name)}</b> — ${t(r.desc)}</li>`).join('') +
    c.talks.map((k) => `<li>${t(k.title)} — <span class="cv__per">${t(k.venue)}, ${e(k.date.slice(0, 7))}</span></li>`).join('') + `</ul></section>`;
  const lead = c.leadership;
  const people = `<section class="cv__block"><h2>${s.cv_leadership}</h2><ul class="cv__plain">${lead.notes.map((x) => `<li>${t(x)}</li>`).join('')}</ul></section>`;
  const misc = `<section class="cv__block cv__misc"><div><h2>${s.cv_languages}</h2><ul class="cv__plain">${c.person.languages.map((x) => `<li>${t(x.level)}</li>`).join('')}</ul></div>` +
    `<div><h2>${s.cv_education}</h2><p>${t(c.person.education)}</p></div></section>`;
  const foot = `<footer class="cv__foot"><span>${s.cv_printed} · ${e(fill(c.copy.colophon.editionPattern[L], { v: edition.v, n: edition.n }))}</span>` +
    (c.site.sampleNotice ? `<span>${t(c.site.sampleNoticeText)}</span>` : '') + `</footer>`;
  return `<div class="cv-sheet" lang="${HTML_LANG[L]}">${head}${avail}${summary}${results}${experience}${work}${skills}${more}${writing}${people}${misc}${foot}</div>`;
}

/** The page language's micro-strings for src/chrome/index.ts (one language per page, like the content bundle). */
function stringsJson(s: ChromeStrings): string {
  return `<script type="application/json" id="chrome-strings">${JSON.stringify(s).replace(/</g, '\\u003c')}</script>`;
}

export function renderChrome(rc: RenderCtx): string {
  const s = strings[rc.lang];
  const home = rc.page === 'main' ? '' : rc.url(rc.lang === 'ja' ? '' : `${rc.lang}/`);
  if (rc.page === 'notfound') return docbar(rc, s, home) + stringsJson(s);
  return docbar(rc, s, home) + stringsJson(s) + rulers() + layersPanel(rc, s, home) + statusBar(rc, s) + (rc.page === 'main' ? cvSheet(rc, s) : '');
}
