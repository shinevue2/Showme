#!/usr/bin/env node
/**
 * npm run fonts — self-hosted fonts (DESIGN §3.3 "Delivery strategy"). Owner: WP-02.
 *
 * Calls the Google Fonts CSS2 API with a modern Chrome UA, downloads every referenced woff2 into
 * public/fonts/<family-slug>/, rewrites URLs to relative paths and writes
 *   public/fonts/fonts-shared.css   IBM Plex Sans, Martian Mono, IBM Plex Mono (latin + latin-ext)
 *   public/fonts/fonts-{ja,en,zh}.css  body + display faces of that page language
 *   public/fonts/preload.json       cover display subset per language + Martian Mono latin
 *   public/fonts/LICENSES/*.txt     OFL texts
 *   public/fonts/report.json        sizes per language / face (input for WP-11's budget check)
 * The site makes zero requests to Google at runtime. Re-run whenever copy changes (WP-11 runs it last).
 *
 * Flags: --dry (compute subsets and sizes, write nothing), --keep (do not delete unreferenced files).
 */
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadContent, ROOT, strings } from './load-content.mjs';
import { LANG_FACES, SHARED, foreignChars } from './faces.mjs';
import { woff2Cmap } from './woff2-cmap.mjs';

const OUT = path.join(ROOT, 'public/fonts');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const DRY = process.argv.includes('--dry');
const KEEP = process.argv.includes('--keep');
const LANGS = ['ja', 'en', 'zh'];

const slug = (f) => f.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const hash = (s, n = 8) => createHash('sha256').update(s).digest('hex').slice(0, n);

/* ---------------------------------------------------------------- network */
async function get(url, kind = 'text', tries = 4) {
  let err;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': UA } });
      if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status} ${url}`), { status: res.status });
      return kind === 'text' ? await res.text() : Buffer.from(await res.arrayBuffer());
    } catch (e) {
      err = e;
      if (e.status === 400 || e.status === 404) break;
      await new Promise((r) => setTimeout(r, 400 * (i + 1)));
    }
  }
  throw err;
}

async function pool(items, n, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i], i); }
  }));
  return out;
}

/* ---------------------------------------------------------------- CSS parsing */
function parseFaces(css) {
  const faces = [];
  const re = /(?:\/\*\s*([^*]+?)\s*\*\/\s*)?@font-face\s*\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(css))) {
    const body = m[2];
    const prop = (k) => (body.match(new RegExp(`${k}\\s*:\\s*([^;]+);`)) || [])[1]?.trim();
    faces.push({
      subset: m[1] ?? 'text',
      family: prop('font-family').replace(/['"]/g, ''),
      style: prop('font-style') ?? 'normal',
      weight: prop('font-weight') ?? '400',
      stretch: prop('font-stretch'),
      url: (prop('src').match(/url\(([^)]+)\)/) || [])[1],
      range: prop('unicode-range'),
    });
  }
  return faces;
}

function rangeToSet(range) {
  const set = new Set();
  if (!range) return set;
  for (const part of range.split(',')) {
    const p = part.trim().replace(/^U\+/i, '');
    if (p.includes('-')) {
      const [a, b] = p.split('-').map((x) => parseInt(x, 16));
      for (let c = a; c <= b; c++) set.add(c);
    } else if (p.includes('?')) {
      const a = parseInt(p.replace(/\?/g, '0'), 16), b = parseInt(p.replace(/\?/g, 'f'), 16);
      for (let c = a; c <= b; c++) set.add(c);
    } else set.add(parseInt(p, 16));
  }
  return set;
}

function setToRange(set) {
  const cps = [...set].sort((a, b) => a - b);
  const parts = [];
  for (let i = 0; i < cps.length; i++) {
    let j = i;
    while (j + 1 < cps.length && cps[j + 1] === cps[j] + 1) j++;
    const h = (c) => c.toString(16);
    parts.push(j > i ? `U+${h(cps[i])}-${h(cps[j])}` : `U+${h(cps[i])}`);
    i = j;
  }
  return parts.join(', ');
}

/* ---------------------------------------------------------------- character repertoire */
async function walk(dir, exts, out = []) {
  for (const d of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) await walk(p, exts, out);
    else if (exts.some((e) => d.name.endsWith(e))) out.push(p);
  }
  return out;
}

/**
 * Characters a page of language L can render with its body face: every L string of the content, the
 * section and chrome strings in L, the cross-language names (foreign set), every literal in runtime code
 * (src/** except content and strings.ts, which are language-split above) and safety ranges
 * (ASCII, Latin-1, kana, CJK punctuation, full-width forms).
 */
async function repertoire(L, data, foreign) {
  const set = new Set(foreign);
  const addStr = (str) => { for (const ch of str) set.add(ch.codePointAt(0)); };
  addStr(strings(data.content, L).join(''));
  for (const ss of Object.values(data.sectionStrings)) addStr(strings(ss.strings?.[L] ?? {}, L).join('') + (ss.display?.[L] ?? ''));
  addStr(strings(data.chrome?.strings?.[L] ?? {}, L).join(''));
  const files = await walk(path.join(ROOT, 'src'), ['.ts']);
  for (const f of files) {
    if (f.includes(`${path.sep}content${path.sep}`) || f.endsWith('strings.ts')) continue;
    addStr(await readFile(f, 'utf8'));
  }
  const add = (a, b) => { for (let c = a; c <= b; c++) set.add(c); };
  add(0x20, 0x7e); add(0xa0, 0xff); add(0x2010, 0x2027); add(0x2030, 0x203b); add(0x2190, 0x2193);
  add(0x3000, 0x303f); add(0xff01, 0xff5e);
  if (L === 'ja') { add(0x3040, 0x309f); add(0x30a0, 0x30ff); } // kana: ja runs only (zh pages set kana inside lang="ja" spans)
  for (const c of [...set]) if (c < 0x20 || (c >= 0x7f && c < 0xa0)) set.delete(c);
  return set;
}

const cpSet = (str) => { const s = new Set(); for (const ch of str) { const c = ch.codePointAt(0); if (c >= 0x20) s.add(c); } return s; };

/* ---------------------------------------------------------------- main */
async function main() {
  const t0 = Date.now();
  const data = await loadContent();
  const c = data.content;
  const num = {
    daiji: '零壱弐参肆伍陸漆捌玖拾佰阡萬',
    daxie: '零壹贰叁肆伍陆柒捌玖拾佰仟万',
  };
  const termsFor = (L) => {
    const seen = new Set();
    for (let d = 0; d < 380; d += 5) {
      const t = data.solarTerms.solarTerm(new Date(Date.UTC(2026, 0, 1 + d)));
      seen.add(L === 'zh' ? t.zh : t.ja);
    }
    return [...seen].join('') + (L === 'zh' ? '' : '令和');
  };
  const foreignBy = { ja: cpSet(foreignChars({ c, chrome: data.chrome }, 'ja').join('')), zh: cpSet(foreignChars({ c, chrome: data.chrome }, 'zh').join('')) };
  // CJK inside en copy (朱文, 白文, 大尾, glossary terms …) and symbols the Latin faces lack (∝ …) are drawn by the
  // foreign faces on en pages: Plex JP takes what it has (ranges are narrowed to its cmap below), Noto Sans SC the
  // simplified forms Plex JP lacks. Needs "IBM Plex Sans JP", "Noto Sans SC" in --f-body-en (request R10).
  for (const ch of [...strings(c, 'en'), ...Object.values(data.sectionStrings).flatMap((ss) => strings(ss.strings?.en ?? {}, 'en')), ...strings(data.chrome?.strings?.en ?? {}, 'en')].join('')) {
    const cp = ch.codePointAt(0);
    if (cp >= 0x2190) { foreignBy.ja.add(cp); if (cp >= 0x2e80) foreignBy.zh.add(cp); }
  }
  const foreign = new Set([...foreignBy.ja, ...foreignBy.zh]);
  for (let cp = 0x20; cp <= 0x7e; cp++) foreign.add(cp);
  const rep = { ja: await repertoire('ja', data, foreign), en: await repertoire('en', data, foreign), zh: await repertoire('zh', data, foreign) };
  const asciiCps = new Set(Array.from({ length: 0x7f - 0x20 }, (_, i) => 0x20 + i));
  /** Characters of the first viewport (cover, chrome, person facts) + kana: the first body slice. */
  const firstView = {};
  for (const L of LANGS) {
    firstView[L] = [...strings(c.copy.cover, L), ...strings(c.person, L), ...strings(data.chrome?.strings?.[L] ?? {}, L),
      ...strings(data.sectionStrings.cover?.strings?.[L] ?? {}, L)].join('') + '、。「」・ー（）：　';
  }

  const files = new Map(); // relPath -> url
  const textRels = new Set(); // &text= files: Google lists every requested character in their unicode-range
  const byUrl = new Map(); // url -> relPath (variable fonts serve one file for several weights)
  const report = { generated: new Date().toISOString(), langs: {}, shared: {} };
  const cssOut = {};
  const preload = { ja: [], en: [], zh: [], shared: [] };

  /** Fetch a family spec and return @font-face rules (strings) + downloads. */
  async function sliced(face, { narrowTo, latinOnly }) {
    const css = await get(`https://fonts.googleapis.com/css2?family=${face.spec}&display=swap`);
    const faces = parseFaces(css);
    const rules = [];
    for (const f of faces) {
      // CJK slices come without a subset comment (or as "[N]"): number them from the URL (".../xyz.42.woff2")
      const numbered = /^\[\d+\]$/.test(f.subset) || f.subset === 'text';
      const sub = numbered ? `[${(f.url.match(/\.(\d+)\.woff2$/) || [])[1] ?? faces.indexOf(f)}]` : f.subset;
      if (latinOnly && !['latin', 'latin-ext'].includes(sub)) continue;
      if (!latinOnly && !numbered && !['latin', 'latin-ext'].includes(sub)) continue;
      let range = f.range;
      if (numbered && narrowTo) {
        const inter = new Set();
        for (const cp of rangeToSet(f.range)) if (narrowTo.has(cp)) inter.add(cp);
        if (!inter.size) continue;
        range = setToRange(inter);
      }
      const wTag = f.weight.replace(/\s+/g, '_');
      const sTag = numbered ? 's' + sub.slice(1, -1) : sub;
      const st = f.stretch ? '-w' + f.stretch.replace(/%/g, '').replace(/\s+/g, '_') : '';
      const rel = byUrl.get(f.url) ?? `${slug(face.family)}/${slug(face.family)}-${wTag}${f.style === 'italic' ? 'i' : ''}${st}-${sTag}.${hash(f.url, 6)}.woff2`;
      files.set(rel, f.url); byUrl.set(f.url, rel);
      rules.push({ rel, sub, range, css: fontFace(f, rel, range) });
    }
    return rules;
  }

  /**
   * `&text=` subsets. `groups` are strings in priority order (first-view characters first); characters are
   * de-duplicated across groups and cut into chunks whose request URL stays under Google's limit
   * (~4.5 kB works; ~7.5 kB silently returns a broken file), so a big repertoire becomes a few
   * unicode-range slices of our own.
   */
  async function textSubset(face, weight, L, groups, { exclude = null, tag = '', split = false } = {}) {
    const seen = new Set();
    const ordered = [];
    const firstLen = [];
    for (const g of groups) {
      for (const ch of g) {
        const cp = ch.codePointAt(0);
        if (cp < 0x20 || seen.has(ch) || (exclude && exclude.has(cp))) continue;
        seen.add(ch); ordered.push(ch);
      }
      firstLen.push(ordered.length);
    }
    if (!ordered.length) return [];
    const chunks = [];
    let cur = '', len = 0;
    ordered.forEach((ch, k) => {
      const enc = encodeURIComponent(ch).length;
      // `split`: the first group (e.g. the cover name) is a file of its own, so only it is preloaded
      if (cur && (len + enc > 3400 || (split && k === firstLen[0]))) { chunks.push(cur); cur = ''; len = 0; }
      cur += ch; len += enc;
    });
    if (cur) chunks.push(cur);
    const fam = encodeURIComponent(face.family).replace(/%20/g, '+');
    const rules = [];
    for (let i = 0; i < chunks.length; i++) {
      const chars = [...chunks[i]].sort().join('');
      let css;
      try { css = await get(`https://fonts.googleapis.com/css2?family=${fam}:wght@${weight}&text=${encodeURIComponent(chars)}&display=swap`); } catch (e) {
        // single-weight families reject an explicit wght: retry bare
        if (weight === 400) css = await get(`https://fonts.googleapis.com/css2?family=${fam}&text=${encodeURIComponent(chars)}&display=swap`);
        else throw e;
      }
      const asked = cpSet(chars);
      for (const f of parseFaces(css)) {
        const n = chunks.length > 1 ? `-${i}` : '';
        if (f.range) f.range = setToRange(new Set([...rangeToSet(f.range)].filter((cp) => asked.has(cp))));
        const rel = `${slug(face.family)}/${slug(face.family)}-${f.weight}-${L}${tag}${n}.${hash(chars + f.url)}.woff2`;
        files.set(rel, f.url); textRels.add(rel);
        rules.push({ rel, sub: 'text', chunk: i, chars: [...chars].length, requested: chars, css: fontFace(f, rel, f.range) });
      }
    }
    return rules;
  }

  function fontFace(f, rel, range) {
    return `@font-face{font-family:'${f.family}';font-style:${f.style};font-weight:${f.weight};${f.stretch ? `font-stretch:${f.stretch};` : ''}font-display:swap;src:url(${rel}) format('woff2');${range ? `unicode-range:${range};` : ''}}`;
  }

  /**
   * Latin faces: Google's latin + latin-ext slices (display faces: latin only), plus a small `&text=` supplement for
   * every character the site sets outside them (ō, → is not in Google's latin slice; ×, −, ≈ …), so they never
   * fall back.
   */
  const allRep = new Set([...rep.ja, ...rep.en, ...rep.zh]);
  async function latinFace(face) {
    let rules = await sliced(face, { latinOnly: true });
    // display faces: drop the latin-ext slice; whatever the site sets outside `latin` comes in the supplement below
    if (face.display) {
      for (const r of rules) if (r.sub === 'latin-ext') files.delete(r.rel);
      rules = rules.filter((r) => r.sub !== 'latin-ext');
    }
    const covered = new Set();
    for (const r of rules) for (const cp of rangeToSet(r.range)) covered.add(cp);
    const extra = [...allRep].filter((cp) => cp >= 0x80 && cp < 0x2e80 && !covered.has(cp)).map((cp) => String.fromCodePoint(cp)).join('');
    if (extra) {
      const css = await get(`https://fonts.googleapis.com/css2?family=${face.spec}&text=${encodeURIComponent(extra)}&display=swap`);
      const asked = cpSet(extra);
      for (const f of parseFaces(css)) {
        if (!f.range) continue;
        // only the characters asked for: Google adds base letters (O, o, u for Ō ō ū), which would make this file
        // shadow the latin slice for them (the last matching @font-face wins) and break kerning across files
        const range = setToRange(new Set([...rangeToSet(f.range)].filter((cp) => asked.has(cp))));
        if (!range) continue;
        const rel = `${slug(face.family)}/${slug(face.family)}-${f.weight.replace(/\s+/g, '_')}${f.style === 'italic' ? 'i' : ''}-sym.${hash(extra + f.url)}.woff2`;
        files.set(rel, f.url); textRels.add(rel);
        rules.push({ rel, sub: 'sym', range, css: fontFace(f, rel, range) });
      }
    }
    return rules;
  }

  /* shared */
  const sharedRules = [];
  for (const face of SHARED) {
    const rules = await latinFace(face);
    sharedRules.push(`/* ${face.family} — ${face.note} */`, ...rules.map((r) => r.css));
    if (face.preloadLang) { const r = rules.find((x) => x.sub === 'latin' && !/i[-.]/.test(x.rel.split('/')[1].replace(/^[^-]+-[^-]+-/, ''))) ?? rules.find((x) => x.sub === 'latin'); if (r) preload[face.preloadLang].push(`fonts/${r.rel}`); }
    if (face.preload) for (const r of rules) if (face.preload.includes(r.sub)) {
      // Martian Mono latin: the default (normal) face only
      if (!preload.shared.length) preload.shared.push(`fonts/${r.rel}`);
    }
    report.shared[face.family] = rules.map((r) => r.rel);
  }
  cssOut.shared = sharedRules.join('\n');

  /* per language */
  for (const L of LANGS) {
    const lines = [];
    report.langs[L] = { faces: [] };
    for (const face of LANG_FACES[L]) {
      if (face.kind === 'latin') {
        const rules = await latinFace(face);
        lines.push(`/* ${face.family} — ${face.note} */`, ...rules.map((r) => r.css));
        if (face.preload) {
          const r = rules.find((x) => face.preload.includes(x.sub));
          if (r) preload[L].push(`fonts/${r.rel}`);
        }
        report.langs[L].faces.push({ family: face.family, kind: 'latin', files: rules.map((r) => r.rel) });
      } else if (face.kind === 'sliced') {
        // CJK body faces: Google's latin slices + our own first-view-first &text= slices of the repertoire
        const weights = face.spec.split('@')[1].split(';').map(Number);
        const rules = [];
        if (!face.foreign) rules.push(...(await sliced(face, { latinOnly: true })));
        const latinCps = new Set();
        for (const r of rules) for (const cp of rangeToSet(r.range)) latinCps.add(cp);
        // foreign subsets: the language-wheel name and the persona's name come first, in a file of their own (they
        // are in the chrome of every page; the rest of the foreign repertoire loads only where it is used)
        const foreignFirst = { ja: '日本語' + (c.person?.name?.ja ?? ''), zh: '简体中文' + (c.person?.name?.zh ?? '') };
        const groups = face.foreign ? [foreignFirst[face.foreign], [...foreignBy[face.foreign]].map((cp) => String.fromCodePoint(cp)).join('')]
          : [firstView[L], [...rep[L]].map((cp) => String.fromCodePoint(cp)).join('')];
        // foreign subsets are named by script, so the en and zh pages share one file
        for (const w of weights) rules.push(...(await textSubset(face, w, face.foreign ?? L, groups, { exclude: face.foreign ? asciiCps : latinCps, tag: face.foreign ? '-x' : '', split: !!face.foreign })));
        lines.push(`/* ${face.family} — ${face.note} (${rules.length} files) */`, ...rules.map((r) => r.css));
        report.langs[L].faces.push({ family: face.family, kind: face.foreign ? 'foreign' : 'body', files: rules.map((r) => r.rel) });
      } else {
        const ctx = { c, L, s: data.sectionStrings, num, terms: termsFor(L), chrome: data.chrome?.strings?.[L] };
        let text = face.chars(ctx).filter(Boolean).join('');
        // section strings.ts: display extras + every micro-string of that section in L
        for (const sec of face.section === '*' ? Object.keys(data.sectionStrings) : face.section.split(',').filter(Boolean)) {
          const ss = data.sectionStrings[sec.trim()];
          if (!ss) continue;
          // the section's micro-strings (labels, buttons) are short and often set in its display face
          text += strings(ss.strings?.[L] ?? {}, L).join('') + (ss.display?.[L] ?? '');
        }
        if (!text.trim()) continue;
        // preloaded faces: the cover name gets a file of its own (a few KB), the rest of the face loads lazily
        const first = face.preload && face.first ? face.first({ c, L }).filter(Boolean).join('') : '';
        for (const w of face.weights) {
          const groups = first ? [first, text + '0123456789 –—·‘’“”…'] : [text + '0123456789 –—·‘’“”…'];
          const rules = await textSubset(face, w, L, groups, { split: !!first });
          lines.push(`/* ${face.family} ${w} — ${face.note} (&text= subset${rules.length > 1 ? `, ${rules.length} files` : ''}) */`, ...rules.map((r) => r.css));
          if (face.preload) preload[L].push(...rules.filter((r) => !first || r.chunk === 0).map((r) => `fonts/${r.rel}`));
          report.langs[L].faces.push({ family: face.family, weight: w, kind: 'text', chars: rules.reduce((n, r) => n + r.chars, 0), requested: rules.map((r) => r.requested).join(''), files: rules.map((r) => r.rel) });
        }
      }
    }
    cssOut[L] = lines.join('\n');
  }

  /* downloads */
  const entries = [...files.entries()];
  console.log(`fonts: ${entries.length} woff2 files referenced`);
  if (!DRY) {
    await pool(entries, 8, async ([rel, url]) => {
      const dest = path.join(OUT, rel);
      if (existsSync(dest)) return; // every name carries a hash of its source URL: immutable
      const buf = await get(url, 'buf');
      await mkdir(path.dirname(dest), { recursive: true });
      await writeFile(dest, buf);
    });
  }

  /* narrow every &text= subset's unicode-range to the glyphs its cmap really has */
  const cover = new Map();
  if (!DRY) {
    for (const rel of textRels) cover.set(rel, woff2Cmap(await readFile(path.join(OUT, rel))));
    const narrow = (css) => css.replace(/@font-face\{([^}]*)\}/g, (rule, body) => {
      const rel = (body.match(/src:url\(([^)]+)\)/) || [])[1];
      const cm = cover.get(rel);
      if (!cm) return rule;
      const m = body.match(/unicode-range:([^;]+);/);
      const want = m ? rangeToSet(m[1]) : cm;
      const keep = new Set([...want].filter((cp) => cm.has(cp)));
      if (!keep.size) { files.delete(rel); return ''; }
      return m ? rule.replace(m[0], `unicode-range:${setToRange(keep)};`) : rule;
    });
    for (const k of Object.keys(cssOut)) cssOut[k] = narrow(cssOut[k]);
  }

  /* sizes */
  const size = async (rel) => (DRY ? 0 : (await stat(path.join(OUT, rel))).size);
  let sharedBytes = 0;
  for (const [, rels] of Object.entries(report.shared)) for (const r of rels) sharedBytes += await size(r);
  report.shared.totalBytes = sharedBytes;
  for (const L of LANGS) {
    let display = 0, sliceBytes = 0;
    for (const f of report.langs[L].faces) {
      f.bytes = 0;
      f.files = f.files.filter((r) => files.has(r));
      for (const r of f.files) f.bytes += await size(r);
      if (f.requested !== undefined) {
        // characters this face is asked to draw but does not have (they fall back to the next family by design)
        const have = new Set(f.files.flatMap((r) => [...(cover.get(r) ?? [])]));
        f.missing = [...new Set(f.requested)].filter((ch) => ch.trim() && !have.has(ch.codePointAt(0))).join('');
        delete f.requested;
      }
      if (f.kind === 'text') display += f.bytes; else sliceBytes += f.bytes;
    }
    report.langs[L].cjkDisplaySubsetBytes = display;
    report.langs[L].slicedOnDiskBytes = sliceBytes;
  }

  if (DRY) { console.log(JSON.stringify(report, null, 1)); return; }

  /* write CSS */
  const head = (what) => `/* ${what} — generated by scripts/fonts/fetch-fonts.mjs (WP-02) from Google Fonts (OFL-1.1); do not edit. ${new Date().toISOString().slice(0, 10)} */\n`;
  await writeFile(path.join(OUT, 'fonts-shared.css'), head('fonts-shared.css') + cssOut.shared + '\n');
  for (const L of LANGS) await writeFile(path.join(OUT, `fonts-${L}.css`), head(`fonts-${L}.css`) + cssOut[L] + '\n');
  await writeFile(path.join(OUT, 'preload.json'), JSON.stringify(preload, null, 2) + '\n');
  for (const L of LANGS) {
    const css = await readFile(path.join(OUT, `fonts-${L}.css`));
    report.langs[L].cssBytes = css.length;
  }
  report.shared.cssBytes = (await readFile(path.join(OUT, 'fonts-shared.css'))).length;
  await writeFile(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1) + '\n');

  /* licences */
  await licences();

  /* prune files no longer referenced */
  if (!KEEP) {
    const keep = new Set([...files.keys()].map((r) => path.join(OUT, r)));
    let removed = 0;
    for (const f of await walk(OUT, ['.woff2'])) if (!keep.has(f)) { await rm(f); removed++; }
    for (const d of await readdir(OUT, { withFileTypes: true })) {
      if (d.isDirectory() && d.name !== 'LICENSES' && !(await readdir(path.join(OUT, d.name))).length) await rm(path.join(OUT, d.name), { recursive: true });
    }
    if (removed) console.log(`fonts: removed ${removed} unreferenced files`);
  }

  for (const L of LANGS) {
    const r = report.langs[L];
    console.log(`fonts-${L}.css ${(r.cssBytes / 1024).toFixed(1)} KB · CJK display subsets ${(r.cjkDisplaySubsetBytes / 1024).toFixed(1)} KB`);
    for (const f of r.faces.filter((x) => x.kind === 'text')) console.log(`   ${f.family} ${f.weight}: ${f.chars} chars, ${(f.bytes / 1024).toFixed(1)} KB${f.missing ? ` · not in the font: ${f.missing}` : ''}`);
  }
  console.log(`fonts: done in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}

/* ---------------------------------------------------------------- licences */
const LICENCE_DIRS = {
  'IBM Plex Sans': 'ibmplexsans', 'IBM Plex Sans JP': 'ibmplexsansjp', 'IBM Plex Mono': 'ibmplexmono', 'Martian Mono': 'martianmono',
  'Noto Sans SC': 'notosanssc', 'Noto Serif SC': 'notoserifsc', 'Shippori Mincho B1': 'shipporiminchob1', 'Zen Antique': 'zenantique',
  'Dela Gothic One': 'delagothicone', 'Shippori Antique B1': 'shipporiantiqueb1', 'DotGothic16': 'dotgothic16', 'Zen Old Mincho': 'zenoldmincho',
  'Kaisei Tokumin': 'kaiseitokumin', 'Yuji Mai': 'yujimai', 'Kaisei HarunoUmi': 'kaiseiharunoumi', 'Klee One': 'kleeone',
  'Bodoni Moda': 'bodonimoda', 'Schibsted Grotesk': 'schibstedgrotesk', 'Big Shoulders': 'bigshoulders', 'Bricolage Grotesque': 'bricolagegrotesque',
  'Handjet': 'handjet', 'Newsreader': 'newsreader', 'Gloock': 'gloock', 'ZCOOL XiaoWei': 'zcoolxiaowei', 'ZCOOL QingKe HuangYou': 'zcoolqingkehuangyou',
  'Ma Shan Zheng': 'mashanzheng', 'Zhi Mang Xing': 'zhimangxing', 'Long Cang': 'longcang',
};

async function licences() {
  const dir = path.join(OUT, 'LICENSES');
  await mkdir(dir, { recursive: true });
  const index = [];
  await pool(Object.entries(LICENCE_DIRS), 6, async ([family, d]) => {
    const dest = path.join(dir, `${slug(family)}-OFL.txt`);
    if (!existsSync(dest)) {
      try {
        const txt = await get(`https://raw.githubusercontent.com/google/fonts/main/ofl/${d}/OFL.txt`);
        await writeFile(dest, txt);
      } catch (e) {
        console.warn(`fonts: licence for ${family} not fetched (${e.message})`);
        return;
      }
    }
    index.push(`${family}\tSIL Open Font License 1.1\t${path.basename(dest)}\thttps://fonts.google.com/specimen/${family.replace(/ /g, '+')}`);
  });
  index.sort();
  await writeFile(path.join(dir, 'README.txt'),
    'Fonts self-hosted from Google Fonts (subsetted by the Google Fonts API). Every family is licensed under the\n' +
    'SIL Open Font License, Version 1.1; the full text for each family is in this folder.\n\n' + index.join('\n') + '\n');
}

main().catch((e) => { console.error(e); process.exit(1); });
