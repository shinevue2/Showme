/**
 * Render helpers (DESIGN §8.4). Owner: WP-00. Node-safe: no DOM, no three, no CSS, no import.meta.env.
 *
 * `createRenderCtx()` builds the `RenderCtx` every `SectionRender` receives. The markup helpers below
 * (`artboardHead`, `band`, `marks`, `viewSlot`, `printFigure`) produce the shared section skeleton so
 * every artboard reads as one print run; section owners may use them or write equivalent markup.
 *
 * Every asset-bearing element carries `vite-ignore`: Vite must not try to resolve `public/` URLs that
 * are written page-relative (they would otherwise resolve against the HTML file's directory).
 */
import type { Lang, PageKind, RenderCtx, SectionId, BandId, PlateN } from '../core/types';
import { HTML_LANG } from '../core/types';
import type { CaseId, Content, ImagesIndex, T } from '../content/types';
import { icon as iconSvg, type IconName } from '../core/icons';

export interface RenderCtxInit {
  lang: Lang;
  page: PageKind;
  caseId?: CaseId;
  /** Directory depth of the page below the site root: index.html 0, en/index.html 1, en/works/x/index.html 3. */
  depth: number;
  content: Content;
  images: ImagesIndex;
}

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export function esc(s: string): string {
  return String(s).replace(/[&<>"']/g, (ch) => ESC[ch]!);
}

/** Depth-correct relative URL to a site-root-relative path ('' = the root directory). */
export function relUrl(rootRelative: string, depth: number): string {
  const p = rootRelative.replace(/^\/+/, '');
  const up = '../'.repeat(depth);
  if (!p) return up || './';
  return up + p;
}

export const DEFAULT_WIDTHS = [640, 1280, 2000] as const;

/** `img/{set}/{slug}.{w}.{ext}` for a manifest file such as 'tokaido/01-nihonbashi.jpg'. */
export function derivativePath(file: string, w: number, ext: 'avif' | 'webp'): string {
  const slash = file.indexOf('/');
  const set = file.slice(0, slash);
  const slug = file.slice(slash + 1).replace(/\.[a-z0-9]+$/i, '');
  return `img/${set}/${slug}.${w}.${ext}`;
}

export function widthsFor(file: string, images: ImagesIndex): number[] {
  const info = images[file];
  if (info && info.widths.length) return [...info.widths].sort((a, b) => a - b);
  const max = info?.w ?? 2000;
  const ws = DEFAULT_WIDTHS.filter((w) => w <= max);
  return ws.length ? ws : [DEFAULT_WIDTHS[0]];
}

export interface ImgOpts { alt: string; sizes: string; className?: string; eager?: boolean }

export function pictureHtml(file: string, opts: ImgOpts, images: ImagesIndex, url: (p: string) => string): string {
  const info = images[file];
  const ws = widthsFor(file, images);
  const set = (ext: 'avif' | 'webp') => ws.map((w) => `${url(derivativePath(file, w, ext))} ${w}w`).join(', ');
  const fallbackW = [...ws].reverse().find((w) => w <= 1280) ?? ws[0]!;
  const dims = info ? ` width="${info.w}" height="${info.h}"` : '';
  const loading = opts.eager ? ' loading="eager" fetchpriority="low"' : ' loading="lazy"';
  const cls = opts.className ? ` class="${esc(opts.className)}"` : '';
  return (
    `<picture${cls} data-file="${esc(file)}">` +
    `<source vite-ignore type="image/avif" srcset="${set('avif')}" sizes="${esc(opts.sizes)}">` +
    `<source vite-ignore type="image/webp" srcset="${set('webp')}" sizes="${esc(opts.sizes)}">` +
    `<img vite-ignore src="${url(derivativePath(file, fallbackW, 'webp'))}"${dims} alt="${esc(opts.alt)}" decoding="async"${loading}>` +
    `</picture>`
  );
}

export function createRenderCtx(init: RenderCtxInit): RenderCtx & { readonly depth: number; readonly images: ImagesIndex } {
  const { lang, page, caseId, depth, content, images } = init;
  const url = (p: string) => relUrl(p, depth);
  return {
    lang, page, caseId, content, depth, images,
    t: (x: Readonly<Record<Lang, string>>) => x[lang],
    esc,
    url,
    img: (file, opts) => pictureHtml(file, opts, images, url),
    icon: (name: IconName) => iconSvg(name),
  };
}

/* ---------------------------------------------------------------------------------------------
 * Shared section skeleton (DESIGN §6 "Common to every section", §2.2 bands, §3.5 marks)
 * ------------------------------------------------------------------------------------------- */

/** `lang` attribute value for an inline run in language `l`. */
export const langAttr = (l: Lang): string => HTML_LANG[l];

/** Stage line: vertical 詞書 (`.tate`) in ja/zh, Martian Mono small caps in en. */
export function stageLine(rc: RenderCtx, text: T, extraClass = ''): string {
  const cls = rc.lang === 'en' ? 'stage-line' : 'stage-line tate';
  return `<p class="${cls}${extraClass ? ' ' + extraClass : ''}">${esc(rc.t(text))}</p>`;
}

export interface HeadOpts {
  id: SectionId;
  title: T;
  stage: T;
  takeaway: T;
  plate?: PlateN;
  /** Render the title as h1 (cover only; the page has exactly one h1). */
  level?: 1 | 2;
  /** Extra HTML appended inside the header (e.g. a direction note). */
  extra?: string;
}

/** `<header class="artboard__head">` with the h2 (display face, data-print, data-select), stage line and takeaway. */
export function artboardHead(rc: RenderCtx, o: HeadOpts): string {
  const h = o.level === 1 ? 'h1' : 'h2';
  const plate = o.plate ?? 1;
  return (
    `<header class="artboard__head">` +
    `<${h} id="${o.id}-title" class="display artboard__title" data-print data-plate="${plate}" data-print-shape="block" data-select>${esc(rc.t(o.title))}</${h}>` +
    stageLine(rc, o.stage) +
    `<p class="takeaway">${esc(rc.t(o.takeaway))}</p>` +
    (o.extra ?? '') +
    `</header>`
  );
}

/** Kentō + トンボ marks for an artboard (absolute overlay, aria-hidden). */
export function marks(): string {
  return `<div class="artboard__marks tombo kento" aria-hidden="true"></div>`;
}

/** The 間 band: last child of the outgoing section (§2.2). */
export function band(id: BandId): string {
  const [from, to] = id.split('-') as [string, string];
  return `<div class="ma" id="ma-${from}-${to}" data-band="${id}" aria-hidden="true"></div>`;
}

/**
 * WebGL view placeholder: carries `data-view-id` and its poster set (§6, §12 #26).
 * Poster URLs are document-relative data attributes (url() inside custom properties resolves against the
 * stylesheet in some browsers, so no relative url() goes into a CSS variable). Without JS the inline
 * background shows the day/desktop poster; with JS, core/boot.ts sets `--poster-*` to absolute URLs when the
 * placeholder nears the viewport and CSS picks day/night × desktop/mobile from `--poster`.
 */
export function viewSlot(rc: RenderCtx, viewId: string, opts: { className?: string; label?: string; inner?: string } = {}): string {
  const p = (theme: 'day' | 'night', w: 1440 | 390) => rc.url(`img/posters/${viewId}-${theme}-${w}.avif`);
  // DOM that must sit BEHIND the 3D (a backdrop print, faint mountains) goes inside the placeholder: the
  // placeholder is the only artboard child not lifted above the canvas (§8.7).
  const hidden = opts.inner ? '' : ' aria-hidden="true"';
  return `<div class="view${opts.className ? ' ' + opts.className : ''}" data-view-id="${viewId}" data-select${hidden}` +
    ` data-poster-day="${p('day', 1440)}" data-poster-night="${p('night', 1440)}" data-poster-day-m="${p('day', 390)}" data-poster-night-m="${p('night', 390)}"` +
    ` style="background-image:url(&quot;${p('day', 1440)}&quot;)">${opts.inner ?? ''}</div>`;
}

/** `figure.print` on --mat with deckle mask, kentō mark, image and caption (§3.6). */
export function printFigure(rc: RenderCtx, f: { file: string; caption: T; alt: T }, opts: { sizes: string; className?: string; eager?: boolean; handoff?: string } = { sizes: '50vw' }): string {
  const handoff = opts.handoff ? ` data-handoff="${esc(opts.handoff)}"` : '';
  return (
    `<figure class="print kento${opts.className ? ' ' + opts.className : ''}"${handoff} data-select>` +
    `<div class="print__mat deckle">${rc.img(f.file, { alt: rc.t(f.alt), sizes: opts.sizes, eager: opts.eager })}</div>` +
    `<figcaption class="print__caption">${esc(rc.t(f.caption))}</figcaption>` +
    `</figure>`
  );
}

/** Opening tag for an artboard section (§2.1). */
export function sectionOpen(id: SectionId, opts: { sticky?: boolean; className?: string; tag?: 'section' | 'footer' } = {}): string {
  const tag = opts.tag ?? 'section';
  return `<${tag} id="${id}" class="artboard${opts.className ? ' ' + opts.className : ''}" data-section="${id}" aria-labelledby="${id}-title"${opts.sticky ? ' data-sticky' : ''}>`;
}

/** Format an ISO month/day for static HTML (Gregorian, page language). */
export function fmtDate(iso: string | null, lang: Lang, present: T = { ja: '現在', en: 'present', zh: '至今' }): string {
  if (!iso) return present[lang];
  const [y, m, d] = iso.split('-');
  if (lang === 'en') {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return d ? `${Number(d)} ${months[Number(m) - 1]} ${y}` : m ? `${months[Number(m) - 1]} ${y}` : y!;
  }
  return d ? `${y}年${Number(m)}月${Number(d)}日` : m ? `${y}年${Number(m)}月` : `${y}年`;
}
