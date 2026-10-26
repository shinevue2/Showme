/**
 * <head> rendering (DESIGN §8.4, §11.2, §3.3 delivery, amendment A1). Owner: WP-00. Node-safe.
 */
import type { Lang, PageKind } from '../core/types';
import { HTML_LANG, LANGS } from '../core/types';
import type { CaseId, Content } from '../content/types';
import { esc, relUrl } from './helpers';
import { BOOT_HEAD } from './boot-script';

export type FontSource = 'self' | 'google';
export interface FontPreloadMap { ja?: readonly string[]; en?: readonly string[]; zh?: readonly string[]; shared?: readonly string[] }

export interface HeadInit {
  lang: Lang;
  page: PageKind;
  caseId?: CaseId;
  depth: number;
  content: Content;
  fontSource: FontSource;
  siteOrigin: string | null;
  fontPreload?: FontPreloadMap;
}

/** Root-relative path of a page (directory form, trailing slash; '' = root). */
export function pagePath(lang: Lang, page: PageKind, caseId?: CaseId): string {
  const prefix = lang === 'ja' ? '' : `${lang}/`;
  if (page === 'case' && caseId) return `${prefix}works/${caseId}/`;
  if (page === 'notfound') return '404.html';
  return prefix;
}

const OG_LOCALE: Record<Lang, string> = { ja: 'ja_JP', en: 'en_US', zh: 'zh_CN' };

/* ---------- Google Fonts CSS2 (amendment A1: FONT_SOURCE=google) ---------- */
const GF_SHARED = ['IBM+Plex+Sans:wdth,wght@85..100,300..700', 'Martian+Mono:wdth,wght@75..112.5,300..600', 'IBM+Plex+Mono:wght@400;500'];
const GF_LANG: Record<Lang, readonly string[]> = {
  ja: [
    'IBM+Plex+Sans+JP:wght@400;500;700', 'Shippori+Mincho+B1:wght@800', 'Zen+Antique', 'Dela+Gothic+One', 'Shippori+Antique+B1',
    'DotGothic16', 'Zen+Old+Mincho:wght@400;700', 'Kaisei+Tokumin:wght@800', 'Yuji+Mai', 'Kaisei+HarunoUmi:wght@400;700', 'Klee+One:wght@600',
  ],
  en: [
    'Bodoni+Moda:ital,opsz,wght@1,6..96,400..700', 'Schibsted+Grotesk:wght@400..800', 'Big+Shoulders:opsz,wght@10..72,100..900',
    'Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,200..800', 'Handjet:wght,ELGR,ELSH@100..900,1..2,0..16',
    'Newsreader:ital,opsz,wght@0,6..72,200..800;1,6..72,200..800', 'Gloock',
    // the en cover sets the ja name small and vertical (lang="ja")
    'Shippori+Mincho+B1:wght@800',
  ],
  zh: [
    'Noto+Sans+SC:wght@400;500;700;900', 'Noto+Serif+SC:wght@200..900', 'ZCOOL+XiaoWei', 'ZCOOL+QingKe+HuangYou',
    'Ma+Shan+Zheng', 'Zhi+Mang+Xing', 'Long+Cang',
  ],
};

export function googleFontsUrl(langs: readonly Lang[]): string {
  const fams = [...new Set([...GF_SHARED, ...langs.flatMap((l) => GF_LANG[l])])];
  return 'https://fonts.googleapis.com/css2?' + fams.map((f) => 'family=' + f).join('&') + '&display=swap';
}

function fontLinks(h: HeadInit): string {
  const langs: readonly Lang[] = h.page === 'notfound' ? LANGS : [h.lang];
  if (h.fontSource === 'google') {
    return (
      `<link rel="preconnect" href="https://fonts.googleapis.com">` +
      `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` +
      `<link vite-ignore rel="stylesheet" href="${esc(googleFontsUrl(langs))}">`
    );
  }
  const u = (p: string) => relUrl(p, h.depth);
  let out = `<link vite-ignore rel="stylesheet" href="${u('fonts/fonts-shared.css')}">`;
  for (const l of langs) out += `<link vite-ignore rel="stylesheet" href="${u(`fonts/fonts-${l}.css`)}">`;
  const pre = [...(h.fontPreload?.[h.lang] ?? []), ...(h.fontPreload?.shared ?? [])];
  for (const p of pre) out += `<link vite-ignore rel="preload" as="font" type="font/woff2" href="${u(p)}" crossorigin>`;
  return out;
}

function abs(h: HeadInit, path: string): string {
  return h.siteOrigin ? h.siteOrigin.replace(/\/+$/, '') + '/' + path : relUrl(path, h.depth);
}

function jsonLd(h: HeadInit): string {
  const { content: c, lang } = h;
  const others = LANGS.filter((l) => l !== lang);
  const current = c.employers.find((e) => e.to === null);
  const person: Record<string, unknown> = {
    '@type': 'Person',
    name: c.person.name[lang],
    alternateName: others.map((l) => c.person.name[l]),
    jobTitle: c.person.role[lang],
    knowsLanguage: ['ja', 'en', 'zh-Hans'],
    knowsAbout: c.domains.map((d) => d.name[lang]),
    address: { '@type': 'PostalAddress', addressLocality: lang === 'en' ? 'Tokyo' : '東京', addressCountry: 'JP' },
    sameAs: [c.site.links.github, c.site.links.linkedin],
  };
  if (current) person.worksFor = { '@type': 'Organization', name: current.name[lang], description: current.descriptor[lang] };
  const graph: unknown[] = [{ '@type': 'ProfilePage', inLanguage: HTML_LANG[lang], name: c.site.title[lang], mainEntity: person }];
  if (h.page === 'case' && h.caseId) {
    const cs = c.cases.find((x) => x.id === h.caseId);
    if (cs) graph.push({ '@type': 'CreativeWork', name: cs.title[lang], about: cs.problem[lang], dateCreated: cs.period.slice(0, 4), inLanguage: HTML_LANG[lang], author: { '@type': 'Person', name: c.person.name[lang] } });
  }
  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
  return `<script type="application/ld+json">${json}</script>`;
}

export function renderHead(h: HeadInit): string {
  const { content: c, lang } = h;
  const cs = h.page === 'case' && h.caseId ? c.cases.find((x) => x.id === h.caseId) : undefined;
  const title = h.page === 'notfound'
    ? `${c.copy.notFound.title.ja} · ${c.copy.notFound.title.en} · ${c.copy.notFound.title.zh}｜${c.copy.colophon.bookTitle[lang]}`
    : cs ? `${cs.title[lang]}｜${c.site.title[lang]}` : c.site.title[lang];
  const desc = cs ? `${cs.problem[lang]} — ${cs.result[lang]}` : c.site.description[lang];
  const path = pagePath(lang, h.page, h.caseId);
  const u = (p: string) => relUrl(p, h.depth);
  let out = '';
  out += `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`;
  out += `<title>${esc(title)}</title>`;
  out += `<meta name="description" content="${esc(desc)}">`;
  out += `<meta name="color-scheme" content="light dark">`;
  out += `<meta name="theme-color" content="#566C73" media="(prefers-color-scheme: dark)">`;
  out += `<meta name="theme-color" content="#C1E4E9">`;
  out += `<script>${BOOT_HEAD}</script>`;
  if (h.page !== 'notfound') {
    out += `<link vite-ignore rel="canonical" href="${esc(abs(h, path))}">`;
    for (const l of LANGS) out += `<link vite-ignore rel="alternate" hreflang="${HTML_LANG[l]}" href="${esc(abs(h, pagePath(l, h.page, h.caseId)))}">`;
    out += `<link vite-ignore rel="alternate" hreflang="x-default" href="${esc(abs(h, pagePath('ja', h.page, h.caseId)))}">`;
  } else {
    out += `<meta name="robots" content="noindex">`;
  }
  out += `<meta property="og:type" content="${h.page === 'case' ? 'article' : 'profile'}">`;
  out += `<meta property="og:title" content="${esc(title)}">`;
  out += `<meta property="og:description" content="${esc(desc)}">`;
  out += `<meta vite-ignore property="og:image" content="${esc(abs(h, `og/og-${lang}.png`))}">`;
  out += `<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">`;
  out += `<meta property="og:image:alt" content="${esc(c.site.ogAlt[lang])}">`;
  out += `<meta property="og:locale" content="${OG_LOCALE[lang]}">`;
  for (const l of LANGS) if (l !== lang) out += `<meta property="og:locale:alternate" content="${OG_LOCALE[l]}">`;
  if (h.siteOrigin && h.page !== 'notfound') out += `<meta property="og:url" content="${esc(abs(h, path))}">`;
  out += `<meta name="twitter:card" content="summary_large_image">`;
  out += `<link vite-ignore rel="icon" href="${u('favicon.svg')}" type="image/svg+xml">`;
  out += `<link vite-ignore rel="icon" href="${u('favicon-32.png')}" sizes="32x32" type="image/png">`;
  out += `<link vite-ignore rel="apple-touch-icon" href="${u('apple-touch-icon.png')}">`;
  out += fontLinks(h);
  out += jsonLd(h);
  return out;
}
