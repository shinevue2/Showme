/**
 * Font faces per page language (DESIGN §3.3) and the character sources for every CJK display subset.
 * Owner: WP-02. Read by fetch-fonts.mjs.
 *
 * kinds
 *   'latin'  — Google's latin + latin-ext slices only (Latin display faces, shared faces)
 *   'sliced' — CJK body faces: Google's unicode-range slices, kept only where they meet the site's repertoire
 *              (every character in src/** plus kana, ASCII and CJK punctuation); unicode-range narrowed to it
 *   'text'   — CJK display faces: one `&text=` subset per (page language, family, weight)
 *
 * `chars(ctx)` returns strings; ctx = { c: content, L, s: sectionStrings, num: {daiji, daxie}, terms, chrome }.
 * `first(ctx)` (preloaded faces only) returns the first-view characters, cut into a file of their own.
 * Each section's strings.ts `display[L]` is appended to that section's faces; `section: '*'` takes every
 * section's micro-strings (bold body face).
 */

import { strings } from './load-content.mjs';

// digits and the punctuation each script's display text may carry (zh faces never get Japanese 「」・ー〜)
const PUNCT_JA = '0123456789「」『』、。・ー—…〜（）：；！？　';
const PUNCT_ZH = '0123456789“”‘’《》、。，：；！？（）—…·　';
const KANJI_NUM = '〇一二三四五六七八九十百千万';

/** Values of a T or plain string for language L. */
const v = (x, L) => (x == null ? '' : typeof x === 'string' ? x : x[L] ?? '');
const pick = (obj, keys, L) => keys.map((k) => v(obj?.[k], L));

/**
 * Text that may be set at weight 600–700 in the body face: the summary's display voice (titles, table heads,
 * result labels), section titles, chrome and section micro-strings. Long body copy is never bold.
 */
const boldChars = ({ c, L, chrome }) => [
  ...pick(c.copy.summary, ['layer', 'title', 'resultsTitle', 'nowTitle', 'ledgerTitle', 'overlapTitle'], L),
  ...strings(c.copy.summary.ledgerColumns ?? {}, L),
  ...(c.copy.summary.results ?? []).map((id) => v(c.metrics.find((m) => m.id === id)?.label, L)),
  ...Object.values(c.copy).flatMap((sec) => pick(sec, ['layer', 'title'], L)),
  ...strings(chrome ?? {}, L), L === 'zh' ? PUNCT_ZH : PUNCT_JA, KANJI_NUM,
];

/** The cover name: the first-view characters of a preloaded display face (a file of their own, the only one preloaded). */
const coverName = ({ c, L }) => [...pick(c.copy.cover, ['name', 'nameLines'], L), v(c.person.name, L)].map((x) => x.replace(/\|/g, ''));

export const SHARED = [
  { family: 'IBM Plex Sans', spec: 'IBM+Plex+Sans:ital,wdth,wght@0,85..100,300..700;1,85..100,300..700', kind: 'latin', note: 'en body (also lang="en" runs on every page)' },
  { family: 'Martian Mono', spec: 'Martian+Mono:wdth,wght@75..112.5,300..600', kind: 'latin', note: 'chrome / HUD', preload: ['latin'] },
  { family: 'IBM Plex Mono', spec: 'IBM+Plex+Mono:ital,wght@0,400;0,500;1,400', kind: 'latin', note: 'code, en colophon' },
  // Latin display faces live here too, so a Latin numeral or label set in an en face on a ja/zh page (seal values,
  // panel numerals) still finds its font; files download only where a page actually uses them.
  // `display: true` → no latin-ext slice: the few non-ASCII characters the site sets (ō in Tōkaidō, →, ×) come in a
  // small `&text=` supplement instead of a 14–46 KB slice. Axes are pinned to what §3.3 uses wherever a face has one
  // voice (en Latin display ≤ 220 KB, §10.1); the full variable ranges measured 657 KB.
  { family: 'Bodoni Moda', spec: 'Bodoni+Moda:ital,opsz,wght@1,6..96,400..700', kind: 'latin', display: true, preloadLang: 'en', note: 'en cover name (wght follows baren pressure, opsz 96), contact (opsz 48)' },
  { family: 'Schibsted Grotesk', spec: 'Schibsted+Grotesk:wght@700', kind: 'latin', display: true, note: 'en summary display, 700' },
  { family: 'Big Shoulders', spec: 'Big+Shoulders:opsz,wght@72,700', kind: 'latin', display: true, note: 'en road years and stations, 700 opsz 72' },
  { family: 'Bricolage Grotesque', spec: 'Bricolage+Grotesque:opsz,wdth,wght@96,75,700', kind: 'latin', display: true, note: 'en works titles, wdth 75 opsz 96 700' },
  { family: 'Handjet', spec: 'Handjet:wght,ELGR,ELSH@100..900,1..2,0..16', kind: 'latin', display: true, note: 'en skills counters (ELSH 0→16 animates)' },
  { family: 'Newsreader', spec: 'Newsreader:ital,opsz,wght@0,72,300;1,24,400', kind: 'latin', display: true, note: 'en principles (300, opsz 72); writing and testimonials (italic 400, opsz 24)' },
  { family: 'Gloock', spec: 'Gloock', kind: 'latin', display: true, note: 'en achievements numerals and seals' },
];

/**
 * Strings rendered with lang="ja" / lang="zh-Hans" on pages of another language: names (KEEP_ALL fields),
 * plate and station names, glossary terms, the language wheel. `script` picks the ja or the zh strings.
 */
export function foreignChars({ c, chrome }, script) {
  const out = [];
  const one = (x) => (x ? [x[script]] : []);
  out.push(...one(c.person?.name), ...one(c.copy?.cover?.name), ...one(c.copy?.cover?.nameLines), ...one(c.site?.title));
  if (script === 'ja') out.push(c.person?.nameRuby ?? '', c.person?.sealGlyph ?? '');
  for (const p of c.plates ?? []) out.push(...one(p.name), ...one(p.numeral), script === 'ja' ? p.ruby ?? '' : '');
  for (const st of c.stations ?? []) out.push(...one(st.name), ...one(st.subtitle));
  for (const e of c.employers ?? []) out.push(...one(e.name));
  for (const t of c.testimonials ?? []) out.push(...one(t.name));
  for (const g of c.glossary ?? []) out.push(script === 'ja' ? g.term + g.ruby : g.zh);
  out.push(...Object.values(chrome?.strings?.[script] ?? {}).filter((x) => typeof x === 'string' && x.length < 16));
  out.push(script === 'ja' ? '日本語' : '简体中文');
  return out;
}

export const LANG_FACES = {
  ja: [
    { family: 'IBM Plex Sans JP', spec: 'IBM+Plex+Sans+JP:wght@400;500', kind: 'sliced', note: 'ja body' },
    { family: 'IBM Plex Sans JP', weights: [700], kind: 'text', section: '*', note: 'summary display voice, headings and UI at 600–700', chars: boldChars },
    {
      family: 'Shippori Mincho B1', weights: [800], kind: 'text', section: 'cover', preload: true, first: coverName,
      note: 'cover name (vertical), 大字 on seals',
      chars: ({ c, L, num }) => [
        ...pick(c.copy.cover, ['name', 'nameLines'], L), v(c.person.name, L), c.person.sealGlyph,
        ...c.metrics.map((m) => v(m.seal?.face, L)), num.daiji, PUNCT_JA,
      ],
    },
    {
      family: 'Zen Antique', weights: [400], kind: 'text', section: 'road', note: 'road 詞書: stations and years',
      chars: ({ c, L }) => [
        ...pick(c.copy.road, ['layer', 'title', 'yearUnit'], L),
        ...c.stations.flatMap((st) => [v(st.name, L), v(st.subtitle, L)]), ...c.career.map((ch) => ch.year),
        ...c.plates.flatMap((p) => [v(p.numeral, L), v(p.name, L)]), '年第番', PUNCT_JA, KANJI_NUM,
      ],
    },
    {
      family: 'Dela Gothic One', weights: [400], kind: 'text', section: 'works', note: 'case titles',
      chars: ({ c, L }) => [...pick(c.copy.works, ['layer', 'title'], L), ...c.cases.flatMap((k) => [v(k.title, L), v(k.short, L)]), PUNCT_JA],
    },
    {
      family: 'Shippori Antique B1', weights: [400], kind: 'text', section: 'works,colophon', note: '問・術・答・省, 第N扇, colophon headings, 大尾',
      chars: ({ c, L, terms }) => [
        '問術答省大尾第扇版刷', ...Object.values(c.copy.works.labels ?? {}).map((x) => v(x, L)), ...c.cases.map((k) => v(k.panelLabel, L)),
        ...pick(c.copy.colophon, ['layer', 'title', 'bookTitle', 'author', 'publisher', 'carving', 'printing', 'paper', 'pictures',
          'weightLabel', 'vitalsLabel', 'buildLabel', 'finale', 'todaysPrint'], L),
        PUNCT_JA, KANJI_NUM,
      ],
    },
    {
      family: 'DotGothic16', weights: [400], kind: 'text', section: 'skills', note: 'skills labels and readouts',
      chars: ({ c, L }) => [
        ...pick(c.copy.skills, ['layer', 'title', 'yearsUnit', 'projectsUnit', 'lastUsed', 'architectureToggle'], L),
        ...c.domains.flatMap((d) => [v(d.name, L), v(d.patternName, L)]), ...c.tools.map((t) => t.name), PUNCT_JA, KANJI_NUM,
      ],
    },
    {
      family: 'Zen Old Mincho', weights: [700], kind: 'text', section: 'principles', note: 'principle titles (vertical)',
      chars: ({ c, L }) => [...pick(c.copy.principles, ['layer', 'title'], L), ...c.principles.map((p) => v(p.title, L)), PUNCT_JA, KANJI_NUM],
    },
    {
      family: 'Zen Old Mincho', weights: [400], kind: 'text', section: 'principles', note: 'principle bodies (vertical)',
      chars: ({ c, L }) => [...pick(c.copy.principles, ['stage', 'legend'], L), ...c.principles.map((p) => v(p.body, L)), PUNCT_JA, KANJI_NUM],
    },
    {
      family: 'Kaisei Tokumin', weights: [800], kind: 'text', section: 'achievements', note: 'banzuke (vertical)',
      chars: ({ c, L, num }) => [
        ...pick(c.copy.achievements, ['layer', 'title', 'sealsTitle', 'chartsTitle', 'karazuriTitle', 'credentialsTitle'], L),
        v(c.banzuke.title, L), v(c.banzuke.centre, L), v(c.banzuke.date, L), v(c.banzuke.east.label, L), v(c.banzuke.west.label, L),
        ...c.banzuke.east.entries.map((e) => v(e.feat, L)), ...c.banzuke.west.entries.map((e) => v(e.feat, L)),
        '番付大関関脇小結前頭東西', PUNCT_JA, KANJI_NUM,
      ],
    },
    {
      family: 'Yuji Mai', weights: [400], kind: 'text', section: 'writing', note: 'repo and essay titles',
      chars: ({ c, L }) => [
        ...pick(c.copy.writing, ['layer', 'title', 'reposTitle', 'articlesTitle', 'talksTitle'], L),
        ...c.repos.map((r) => r.name), ...c.articles.map((a) => v(a.title, L)), ...c.talks.map((t) => v(t.title, L)), PUNCT_JA,
      ],
    },
    {
      family: 'Kaisei HarunoUmi', weights: [400], kind: 'text', section: 'testimonials', note: 'quotes (vertical ≥ 1024 px, horizontal below)',
      chars: ({ c, L }) => [...pick(c.copy.testimonials, ['layer', 'title', 'leadershipTitle'], L), ...c.testimonials.flatMap((t) => [v(t.quote, L), v(t.name, L)]), PUNCT_JA],
    },
    {
      family: 'Kaisei HarunoUmi', weights: [700], kind: 'text', section: 'testimonials', note: 'section title, names',
      chars: ({ c, L }) => [...pick(c.copy.testimonials, ['layer', 'title', 'leadershipTitle'], L), ...c.testimonials.map((t) => v(t.name, L)), PUNCT_JA],
    },
    {
      family: 'Klee One', weights: [600], kind: 'text', section: 'contact', note: 'the letter',
      chars: ({ c, L }) => [...pick(c.copy.contact, ['layer', 'title', 'signature', 'arrival'], L), ...(c.copy.contact.letter ?? []).map((x) => v(x, L)), PUNCT_JA],
    },
    { family: 'Noto Sans SC', spec: 'Noto+Sans+SC:wght@400;500', kind: 'sliced', foreign: 'zh', note: 'lang="zh-Hans" runs (language wheel, names)' },
  ],
  en: [
    {
      family: 'Shippori Mincho B1', weights: [800], kind: 'text', section: 'cover', note: 'the ja name, small and vertical on the en cover',
      chars: ({ c }) => [c.copy.cover.name.ja, c.copy.cover.nameLines.ja, c.person.name.ja, c.person.sealGlyph, ...c.metrics.map((m) => v(m.seal?.face, 'en'))],
    },
    {
      family: 'Shippori Antique B1', weights: [400], kind: 'text', section: '', note: '大尾 and the works panel / case labels where the works CSS keeps this face',
      chars: ({ c, L }) => ['大尾', ...Object.values(c.copy.works.labels ?? {}).map((x) => v(x, L)), ...c.cases.map((k) => v(k.panelLabel, L)), 'Panel IVX', '問術答省'],
    },
    { family: 'IBM Plex Sans JP', spec: 'IBM+Plex+Sans+JP:wght@400;500', kind: 'sliced', foreign: 'ja', note: 'lang="ja" runs (names, glossary, wheel)' },
    { family: 'Noto Sans SC', spec: 'Noto+Sans+SC:wght@400;500', kind: 'sliced', foreign: 'zh', note: 'lang="zh-Hans" runs' },
  ],
  zh: [
    { family: 'Noto Sans SC', spec: 'Noto+Sans+SC:wght@400;500', kind: 'sliced', note: 'zh body' },
    { family: 'Noto Sans SC', weights: [700], kind: 'text', section: '*', note: 'summary display voice, headings and UI at 600–700', chars: boldChars },
    {
      family: 'Noto Serif SC', weights: [900], kind: 'text', section: 'cover,achievements', preload: true, first: coverName, note: 'cover name, banzuke, 大写 on seals',
      chars: ({ c, L, num }) => [
        ...pick(c.copy.cover, ['name', 'nameLines'], L), v(c.person.name, L),
        ...pick(c.copy.achievements, ['layer', 'title', 'sealsTitle', 'chartsTitle', 'karazuriTitle', 'credentialsTitle'], L),
        v(c.banzuke.title, L), v(c.banzuke.centre, L), v(c.banzuke.date, L), v(c.banzuke.east.label, L), v(c.banzuke.west.label, L),
        ...c.banzuke.east.entries.map((e) => v(e.feat, L)), ...c.banzuke.west.entries.map((e) => v(e.feat, L)),
        ...c.metrics.map((m) => v(m.seal?.face, L)), '番付大关关胁小结前头东西', num.daxie, PUNCT_ZH, KANJI_NUM,
      ],
    },
    {
      family: 'Noto Serif SC', weights: [300], kind: 'text', section: 'principles,colophon', note: 'principles (vertical allowed), colophon',
      chars: ({ c, L, terms }) => [
        ...pick(c.copy.principles, ['layer', 'title'], L), ...c.principles.flatMap((p) => [v(p.title, L), v(p.body, L)]),
        ...pick(c.copy.colophon, ['layer', 'title', 'bookTitle', 'author', 'publisher', 'carving', 'printing', 'paper', 'pictures',
          'weightLabel', 'vitalsLabel', 'buildLabel', 'finale', 'todaysPrint'], L),
        '第版次印', PUNCT_ZH, KANJI_NUM,
      ],
    },
    {
      family: 'Noto Serif SC', weights: [400], kind: 'text', section: 'testimonials,+ja names', note: 'quotes; Japanese names inside zh UI',
      chars: (ctx) => [
        ...pick(ctx.c.copy.testimonials, ['layer', 'title', 'leadershipTitle'], ctx.L),
        ...ctx.c.testimonials.map((t) => v(t.quote, ctx.L)),
        ...ctx.c.plates.flatMap((p) => [p.name.ja, p.ruby]), ...ctx.c.glossary.map((g) => g.term + g.ruby),
        ...ctx.c.stations.map((st) => st.name.ja + st.subtitle.ja), ...ctx.c.employers.map((e) => e.name.ja), ctx.c.person.name.ja, '日本語', PUNCT_ZH,
      ],
    },
    {
      family: 'Noto Sans SC', weights: [900], kind: 'text', section: 'works', note: 'case titles',
      chars: ({ c, L }) => [...pick(c.copy.works, ['layer', 'title'], L), ...c.cases.flatMap((k) => [v(k.title, L), v(k.short, L)]), PUNCT_ZH],
    },
    {
      family: 'ZCOOL XiaoWei', weights: [400], kind: 'text', section: 'road', note: 'road headings (horizontal only)',
      chars: ({ c, L }) => [
        ...pick(c.copy.road, ['layer', 'title', 'yearUnit'], L),
        ...c.stations.flatMap((st) => [v(st.name, L), v(st.subtitle, L)]), ...c.career.map((ch) => ch.year),
        ...c.plates.flatMap((p) => [v(p.numeral, L), v(p.name, L)]), '年第号', PUNCT_ZH, KANJI_NUM,
      ],
    },
    {
      family: 'ZCOOL QingKe HuangYou', weights: [400], kind: 'text', section: 'skills', note: 'skills labels (horizontal only)',
      chars: ({ c, L }) => [
        ...pick(c.copy.skills, ['layer', 'title', 'yearsUnit', 'projectsUnit', 'lastUsed', 'architectureToggle'], L),
        ...c.domains.flatMap((d) => [v(d.name, L), v(d.patternName, L)]), ...c.tools.map((t) => t.name), PUNCT_ZH,
      ],
    },
    {
      family: 'Ma Shan Zheng', weights: [400], kind: 'text', section: 'writing', note: 'writing titles (horizontal only)',
      chars: ({ c, L }) => [
        ...pick(c.copy.writing, ['layer', 'title', 'reposTitle', 'articlesTitle', 'talksTitle'], L),
        ...c.repos.map((r) => r.name), ...c.articles.map((a) => v(a.title, L)), ...c.talks.map((t) => v(t.title, L)), PUNCT_ZH,
      ],
    },
    {
      family: 'Zhi Mang Xing', weights: [400], kind: 'text', section: 'testimonials', note: 'signatures (horizontal only)',
      chars: ({ c, L }) => [...c.testimonials.map((t) => v(t.name, L)), PUNCT_ZH],
    },
    {
      family: 'Long Cang', weights: [400], kind: 'text', section: 'contact', note: 'the letter (horizontal only)',
      chars: ({ c, L }) => [...pick(c.copy.contact, ['layer', 'title', 'signature', 'arrival'], L), ...(c.copy.contact.letter ?? []).map((x) => v(x, L)), PUNCT_ZH],
    },
    {
      family: 'Shippori Antique B1', weights: [400], kind: 'text', section: '', note: '大尾 and the works panel labels where the works CSS keeps this face (simplified forms it lacks fall back)',
      chars: ({ c, L }) => ['大尾', ...Object.values(c.copy.works.labels ?? {}).map((x) => v(x, L)), ...c.cases.map((k) => v(k.panelLabel, L))],
    },
    { family: 'IBM Plex Sans JP', spec: 'IBM+Plex+Sans+JP:wght@400;500', kind: 'sliced', foreign: 'ja', note: 'lang="ja" runs outside Noto Serif SC' },
  ],
};

