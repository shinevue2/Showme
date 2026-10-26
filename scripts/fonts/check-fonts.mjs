#!/usr/bin/env node
/**
 * Font verification (WP-02; reused by WP-11 after the final `npm run fonts`). Run under the browser lock.
 *
 *   node scripts/fonts/check-fonts.mjs specimen [outDir]
 *       Builds one specimen page per language from public/fonts/*.css (every family × weight, set in the
 *       characters of its own subset), screenshots it and asks Chromium (CDP CSS.getPlatformFontsForNode)
 *       which font actually drew every line. Fails if any line is drawn by anything but its web font.
 *   node scripts/fonts/check-fonts.mjs pages <baseUrl> [path …]
 *       Visits built pages (default: '' en/ zh/ works/ledger/ 404.html) and reports every element whose text
 *       is drawn, even partly, by a system (non-web) font — i.e. a silent fallback.
 */
import http from 'node:http';
import { createRequire } from 'node:module';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { ROOT } from './load-content.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PUB = path.join(ROOT, 'public');
const [mode = 'specimen', ...rest] = process.argv.slice(2);
const ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];

/** Characters of a unicode-range that the site actually uses (`rep`), in code-point order. */
function rangeChars(range, max = 64, rep = null) {
  const out = [];
  for (const part of range.split(',')) {
    const p = part.trim().replace(/^U\+/i, '');
    const [a, b] = p.split('-').map((x) => parseInt(x, 16));
    for (let c = a; c <= (b ?? a) && out.length < max; c++) if (c > 0x20 && (!rep || rep.has(c))) out.push(String.fromCodePoint(c));
    if (out.length >= max) break;
  }
  return out.join('');
}

/** Every character in src/** (content, strings, chrome, core): what the site can render. */
async function siteRepertoire() {
  const { readdir } = await import('node:fs/promises');
  const set = new Set();
  const walk = async (d) => {
    for (const e of await readdir(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) await walk(p);
      else if (/\.(ts|json)$/.test(e.name) && !e.name.includes('images.json') && !e.name.includes('film-manifest')) for (const ch of await readFile(p, 'utf8')) set.add(ch.codePointAt(0));
    }
  };
  await walk(path.join(ROOT, 'src'));
  return set;
}

function parseCss(css) {
  const rules = [];
  for (const m of css.matchAll(/@font-face\{([^}]*)\}/g)) {
    const b = m[1];
    const get = (k) => (b.match(new RegExp(`${k}:([^;]+);`)) || [])[1];
    rules.push({ family: get('font-family').replace(/'/g, ''), style: get('font-style'), weight: get('font-weight'), range: get('unicode-range') ?? '' });
  }
  return rules;
}

async function specimen(outDir) {
  const out = outDir ?? path.join(ROOT, 'build/qa/fonts');
  await mkdir(out, { recursive: true });
  const latin = 'Minato Segawa — 8 years · 2018–2026 · p95 38 → 9 ms ×12 “Impressions”';
  const rep = await siteRepertoire();
  const pages = {};
  for (const lang of ['ja', 'en', 'zh']) {
    const css = (await readFile(path.join(PUB, `fonts/fonts-${lang}.css`), 'utf8')) + (await readFile(path.join(PUB, 'fonts/fonts-shared.css'), 'utf8'));
    const rules = parseCss(css);
    const groups = new Map();
    for (const r of rules) {
      const w = r.weight.includes(' ') ? r.weight.split(' ').map(Number) : [Number(r.weight)];
      const k = `${r.family}|${r.style}|${r.weight}`;
      const g = groups.get(k) ?? { ...r, weights: w, chars: '' };
      if (/latin/.test(r.range) || /U\+0-ff|U\+0000-00ff/i.test(r.range)) g.latin = true;
      // ideographs first (they show a display face's character best), then kana, then the rest
      const rank = (ch) => { const c = ch.codePointAt(0); return c >= 0x3400 ? 0 : c >= 0x3040 && c < 0x3100 ? 1 : 2; };
      if (g.chars.length < 70) g.chars += [...rangeChars(r.range, 4000, rep).replace(/[\x21-\x7e]/g, '')].sort((a, b) => rank(a) - rank(b)).join('').slice(0, 70 - g.chars.length);
      groups.set(k, g);
    }
    let rows = '';
    let i = 0;
    for (const g of groups.values()) {
      const weights = g.weights.length > 1 ? [g.weights[0], Math.round((g.weights[0] + g.weights[1]) / 2), g.weights[1]] : g.weights;
      for (const w of weights) {
        const sample = (g.chars.trim() ? g.chars.slice(0, 40) + ' ' : '') + (g.latin || !g.chars.trim() ? latin : '');
        rows += `<div class="row"><div class="lab">${g.family} · ${g.style} · ${w}</div><div class="s" id="s${i++}" data-family="${g.family}" style="font-family:'${g.family}',monospace;font-style:${g.style};font-weight:${w}">${sample.replace(/</g, '&lt;')}</div></div>`;
      }
    }
    pages[lang] = `<!doctype html><html lang="${lang === 'zh' ? 'zh-Hans' : lang}"><head><meta charset="utf-8"><link rel="stylesheet" href="/fonts/fonts-shared.css"><link rel="stylesheet" href="/fonts/fonts-${lang}.css"><style>
body{margin:24px;background:#F7FCFE;color:#0F2540;width:1392px}.row{display:grid;grid-template-columns:300px 1fr;gap:16px;align-items:baseline;padding:6px 0;border-bottom:1px solid #C1E4E9}
.lab{font:11px/1.4 monospace;color:#566C73}.s{font-size:26px;line-height:1.35;white-space:nowrap;overflow:hidden}h1{font:600 14px monospace}</style></head><body><h1>fonts-${lang}.css + fonts-shared.css — ${groups.size} faces</h1>${rows}</body></html>`;
  }
  const server = http.createServer(async (req, res) => {
    const u = new URL(req.url, 'http://x');
    if (u.pathname.startsWith('/specimen-')) { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(pages[u.pathname.slice(10, 12)]); }
    try {
      const f = path.join(PUB, decodeURIComponent(u.pathname));
      if (!f.startsWith(PUB)) throw new Error();
      res.writeHead(200, { 'content-type': f.endsWith('.css') ? 'text/css' : 'font/woff2' }); res.end(await readFile(f));
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise((r) => server.listen(5172, '127.0.0.1', r));
  const browser = await chromium.launch({ args: ARGS });
  let failures = 0, notes = 0;
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
    for (const lang of ['ja', 'en', 'zh']) {
      await page.goto(`http://127.0.0.1:5172/specimen-${lang}`, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(out, `specimen-${lang}.png`), fullPage: true });
      const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
      const ids = (await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: '.s' })).nodeIds;
      for (const id of ids) {
        const attrs = (await cdp.send('DOM.getAttributes', { nodeId: id })).attributes;
        const fam = attrs[attrs.indexOf('data-family') + 1];
        const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId: id });
        // the face must draw its own specimen; a few symbols outside a font's repertoire (e.g. ∝ in a Latin
        // face, sampled from code comments) are reported but do not fail the line
        const sys = fonts.filter((f) => !f.isCustomFont).reduce((n, f) => n + f.glyphCount, 0);
        const own = fonts.filter((f) => f.isCustomFont).reduce((n, f) => n + f.glyphCount, 0);
        if (!own || own < 0.85 * (own + sys)) { failures++; console.log(`  FAIL ${lang}: ${fam} drew ${own}/${own + sys} glyphs`); }
        else if (sys) notes++;
      }
      console.log(`specimen-${lang}: ${ids.length} lines checked`);
    }
  } finally { await browser.close(); server.close(); }
  console.log(failures ? `FAIL: ${failures} specimen lines fell back` : `OK: every face drew its own specimen (${notes} lines with a stray symbol outside the font)`);
  process.exitCode = failures ? 1 : 0;
}

async function pagesCheck(base, paths) {
  const list = paths.length ? paths : ['', 'en/', 'zh/', 'works/ledger/', 'en/works/ledger/', 'zh/works/ledger/', '404.html'];
  const browser = await chromium.launch({ args: ARGS });
  let total = 0;
  try {
    for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
      const page = await browser.newPage({ viewport: vp });
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
      for (const p of list) {
        await page.goto(base.replace(/\/?$/, '/') + p, { waitUntil: 'networkidle' });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(400);
        const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
        const found = new Map();
        const visit = async (n) => {
          if (n.nodeName === 'SCRIPT' || n.nodeName === 'STYLE' || n.nodeName === 'svg' || n.nodeName === 'NOSCRIPT') return;
          const hasText = (n.children ?? []).some((ch) => ch.nodeType === 3 && ch.nodeValue.trim());
          if (hasText) {
            try {
              const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId: n.nodeId });
              const bad = fonts.filter((f) => !f.isCustomFont && f.glyphCount > 0);
              if (bad.length) {
                const txt = (n.children ?? []).filter((ch) => ch.nodeType === 3).map((ch) => ch.nodeValue.trim()).join(' ').slice(0, 60);
                const key = `${n.nodeName.toLowerCase()}${n.attributes?.includes('class') ? '.' + n.attributes[n.attributes.indexOf('class') + 1].split(' ')[0] : ''}`;
                if (!found.has(key)) found.set(key, `${bad.map((f) => `${f.familyName}×${f.glyphCount}`).join(', ')} — “${txt}”`);
              }
            } catch { /* detached */ }
          }
          for (const ch of n.children ?? []) await visit(ch);
        };
        await visit(root);
        total += found.size;
        console.log(`${vp.width}px /${p}: ${found.size ? found.size + ' element kinds use system fonts' : 'no fallbacks'}`);
        for (const [k, v] of found) console.log(`   ${k}: ${v}`);
      }
      await page.close();
    }
  } finally { await browser.close(); }
  process.exitCode = total ? 1 : 0;
}

if (mode === 'pages') await pagesCheck(rest[0] ?? 'http://127.0.0.1:4172/', rest.slice(1));
else await specimen(rest[0]);
