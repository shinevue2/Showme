/**
 * Page renderer for the SSG plugin (DESIGN §8.4). Owner: WP-00. Node-safe entry point: imports only
 * content, render helpers, core types/icons/numerals and other render modules.
 *
 * `renderPage(spec)` returns the <html> attributes plus the markup that replaces the stub markers
 * `<!--ssr-head-->` and `<!--ssr-body-->`.
 */
import type { Lang, PageKind, SectionId, SectionRender } from '../core/types';
import { HTML_LANG, SECTION_ORDER } from '../core/types';
import type { CaseId } from '../content/types';
import { content, images, manifest } from '../content/index';
import { createRenderCtx, esc } from './helpers';
import { renderHead, type FontSource, type FontPreloadMap } from './head';
import { BOOT_BODY } from './boot-script';
import { renderChrome } from '../chrome/render';
import { render as cover } from '../sections/cover/render';
import { render as summary } from '../sections/summary/render';
import { render as road } from '../sections/road/render';
import { render as works, renderCase } from '../sections/works/render';
import { render as skills } from '../sections/skills/render';
import { render as principles } from '../sections/principles/render';
import { render as achievements } from '../sections/achievements/render';
import { render as writing } from '../sections/writing/render';
import { render as testimonials } from '../sections/testimonials/render';
import { render as contact } from '../sections/contact/render';
import { render as colophon } from '../sections/colophon/render';
import { renderNotFound } from '../sections/colophon/not-found';

export const SECTION_RENDERS: Readonly<Record<SectionId, SectionRender>> = {
  cover, summary, road, works, skills, principles, achievements, writing, testimonials, contact, colophon,
};

export interface PageSpec {
  lang: Lang;
  page: PageKind;
  caseId?: CaseId;
  /** Directory depth below the site root (index.html 0 · en/index.html 1 · en/works/x/index.html 3). */
  depth: number;
  /** 'self' (default): public/fonts/fonts-{lang}.css + fonts-shared.css · 'google': Google Fonts CSS2 (amendment A1). */
  fontSource?: FontSource;
  /** Absolute origin for canonical/hreflang/OG when SITE_ORIGIN is set at build; otherwise relative URLs. */
  siteOrigin?: string | null;
  /** Optional preload list written by WP-02's font script (public/fonts/preload.json). */
  fontPreload?: FontPreloadMap;
}

export interface RenderedPage {
  htmlAttrs: Record<string, string>;
  head: string;
  body: string;
}

const SKIP: Record<Lang, string> = { ja: '本文へスキップ', en: 'Skip to content', zh: '跳到正文' };

export function renderPage(spec: PageSpec): RenderedPage {
  const { lang, page, caseId, depth } = spec;
  const rc = createRenderCtx({ lang, page, caseId, depth, content, images });
  const head = renderHead({
    lang, page, caseId, depth, content,
    fontSource: spec.fontSource ?? 'self',
    siteOrigin: spec.siteOrigin ?? null,
    fontPreload: spec.fontPreload,
  });

  let main: string;
  if (page === 'main') main = SECTION_ORDER.map((id) => SECTION_RENDERS[id](rc)).join('\n');
  else if (page === 'case') main = renderCase(rc);
  else main = renderNotFound(rc);

  const body =
    `<a class="skip-link" href="#main">${esc(SKIP[lang])}</a>` +
    renderChrome(rc) +
    (page === 'main' ? `<canvas id="stage" aria-hidden="true"></canvas>` : '') +
    `<main id="main" tabindex="-1">${main}</main>` +
    `<script>${BOOT_BODY}</script>`;

  const htmlAttrs: Record<string, string> = {
    lang: HTML_LANG[lang],
    'data-page': page,
    'data-lang': lang,
    class: 'no-js',
  };
  if (caseId) htmlAttrs['data-case'] = caseId;
  return { htmlAttrs, head, body };
}

export { content, images, manifest };
export { countPersonaSample } from '../content/index';
