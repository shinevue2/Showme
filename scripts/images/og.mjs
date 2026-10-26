#!/usr/bin/env node
/**
 * OG images (DESIGN §12 #15): public/og/og-{ja,en,zh}.png, 1200 × 630 — the print sheet on the pasteboard,
 * crest, the name in the cover face, role, the Tōkaidō key line, kentō / トンボ marks. Rendered with Playwright
 * from local HTML that links the self-hosted fonts (public/fonts, run `npm run fonts` first). Owner: WP-02.
 *
 *   flock /home/star/Documents/Portf/.locks/browser.lock node scripts/images/og.mjs
 */
import http from 'node:http';
import { createRequire } from 'node:module';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { loadContent, ROOT } from '../fonts/load-content.mjs';
import { buildCrest } from './lib/crest.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PUB = path.join(ROOT, 'public');
const PORT = 5172;
const { content: c } = await loadContent();

const cr = buildCrest();
const crest = (size) => `<svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true"><g fill="#0F2540"><path d="${cr.paths.ring}"/>${cr.paths.strips.map((d) => `<path d="${d}"/>`).join('')}</g></svg>`;
const years = ['2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026'];
const PLATES = ['#0F2540', '#5DAC81', '#91989F', '#F4A7B9', '#A5DEE4', '#205C81', '#656765', '#FFB11B'];

function keyLine(lang) {
  // the career mapped before it is told: one indigo line, right → left, nine year ticks
  const x0 = 1010, x1 = 140, y = 0;
  const ticks = years.map((yr, i) => {
    const x = x0 - ((x0 - x1) * i) / 8;
    return `<path d="M${x} ${y - 7}v14" stroke="#0F2540" stroke-width="2"/><text x="${x}" y="${y + 28}" text-anchor="middle">${yr}</text>`;
  }).join('');
  const station = c.stations.slice(0, 8).map((s, i) => {
    const x = x0 - ((x0 - x1) * i) / 8 - (x0 - x1) / 16;
    return `<text class="st" x="${x}" y="${y - 16}" text-anchor="middle">${s.name[lang]}</text>`;
  }).join('');
  return `<svg class="key" viewBox="0 -40 1104 80" width="1104" height="80" aria-hidden="true"><path d="M${x0 + 30} ${y}H${x1 - 30}" stroke="#0F2540" stroke-width="3"/>${ticks}${station}</svg>`;
}

function page(lang) {
  const role = c.person.role[lang];
  const title = c.copy.colophon?.bookTitle?.[lang] || { ja: '八度摺', en: 'Eight Impressions', zh: '八版套印' }[lang]; // content, else DESIGN §1.1
  const sub = { ja: '一年に一版、八年で一枚の錦絵', en: 'A career printed one block at a time', zh: '一年一版，八年套成一幅锦绘' }[lang];
  const name = c.copy.cover.name[lang];
  const htmlLang = { ja: 'ja', en: 'en', zh: 'zh-Hans' }[lang];
  const chips = PLATES.map((p) => `<i style="background:${p}"></i>`).join('');
  const nameBlock = lang === 'en'
    ? `<div class="name-en"><span>${c.copy.cover.nameLines.en.split('|')[0]}</span><span>${c.copy.cover.nameLines.en.split('|')[1]}</span></div><div class="name-ja-small" lang="ja">${c.copy.cover.name.ja}</div>`
    : `<div class="name-v ${lang}">${c.copy.cover.nameLines[lang].split('|').map((l, i) => `<span class="c${i}">${l}</span>`).join('')}<span class="rolecol">${role}</span></div>`;
  return `<!doctype html><html lang="${htmlLang}"><head><meta charset="utf-8">
<link rel="stylesheet" href="/fonts/fonts-shared.css"><link rel="stylesheet" href="/fonts/fonts-${lang}.css">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1200px;height:630px;background:#C1E4E9;overflow:hidden}
body{font-family:${lang === 'ja' ? '"IBM Plex Sans JP"' : lang === 'zh' ? '"Noto Sans SC"' : '"IBM Plex Sans"'},sans-serif;color:#0F2540}
.sheet{position:absolute;left:48px;top:40px;width:1104px;height:550px;background:#FFFFFB}
/* トンボ: double crop marks outside each corner */
.tombo{position:absolute;inset:-14px;pointer-events:none;--c:#566C73;
background:
 linear-gradient(var(--c),var(--c)) 0 13px/22px 1px no-repeat, linear-gradient(var(--c),var(--c)) 0 10px/22px 1px no-repeat,
 linear-gradient(var(--c),var(--c)) 13px 0/1px 22px no-repeat, linear-gradient(var(--c),var(--c)) 10px 0/1px 22px no-repeat,
 linear-gradient(var(--c),var(--c)) 100% 13px/22px 1px no-repeat, linear-gradient(var(--c),var(--c)) 100% 10px/22px 1px no-repeat,
 linear-gradient(var(--c),var(--c)) calc(100% - 13px) 0/1px 22px no-repeat, linear-gradient(var(--c),var(--c)) calc(100% - 10px) 0/1px 22px no-repeat,
 linear-gradient(var(--c),var(--c)) 0 calc(100% - 13px)/22px 1px no-repeat, linear-gradient(var(--c),var(--c)) 0 calc(100% - 10px)/22px 1px no-repeat,
 linear-gradient(var(--c),var(--c)) 13px 100%/1px 22px no-repeat, linear-gradient(var(--c),var(--c)) 10px 100%/1px 22px no-repeat,
 linear-gradient(var(--c),var(--c)) 100% calc(100% - 13px)/22px 1px no-repeat, linear-gradient(var(--c),var(--c)) 100% calc(100% - 10px)/22px 1px no-repeat,
 linear-gradient(var(--c),var(--c)) calc(100% - 13px) 100%/1px 22px no-repeat, linear-gradient(var(--c),var(--c)) calc(100% - 10px) 100%/1px 22px no-repeat}
/* 見当: 鉤見当 L at lower right + 引付見当 120 px to its left */
.kento{position:absolute;right:28px;bottom:26px;width:14px;height:14px;border-right:2px solid #566C73;border-bottom:2px solid #566C73}
.kento::after{content:"";position:absolute;right:134px;bottom:-2px;width:28px;height:2px;background:#566C73}
.crest{position:absolute;left:64px;top:52px}
.title{position:absolute;left:66px;top:150px;font-size:22px;font-weight:500;letter-spacing:${lang === 'en' ? '.02em' : '.12em'}}
.sub{position:absolute;left:66px;top:186px;font-size:15px;color:#566C73;letter-spacing:${lang === 'en' ? '0' : '.06em'}}
.role{position:absolute;font-size:22px;font-weight:500;color:#205C81}
.name-v{position:absolute;right:84px;top:56px;writing-mode:vertical-rl;font-size:142px;line-height:1;letter-spacing:.06em;white-space:nowrap}
.name-v span{display:block}
.name-v .c1{margin-top:150px;margin-left:18px}
.name-v .rolecol{font-family:${lang === 'zh' ? '"Noto Sans SC"' : '"IBM Plex Sans JP"'},sans-serif;font-weight:500;font-size:21px;letter-spacing:.16em;color:#205C81;margin-top:8px;margin-left:28px}
.name-v.ja{font-family:"Shippori Mincho B1",serif;font-weight:800}
.name-v.zh{font-family:"Noto Serif SC",serif;font-weight:900}
.role.v{right:244px;top:66px;writing-mode:vertical-rl;letter-spacing:.14em;font-size:21px}
.name-en{position:absolute;left:60px;top:250px;font-family:"Bodoni Moda",serif;font-style:italic;font-weight:600;font-variation-settings:"opsz" 96;font-size:92px;line-height:.98;display:flex;flex-direction:column}
.name-ja-small{position:absolute;right:90px;top:62px;writing-mode:vertical-rl;font-family:"Shippori Mincho B1",serif;font-weight:800;font-size:34px;letter-spacing:.1em}
.role.h{left:66px;top:224px;font-size:19px}
.key{position:absolute;left:0;bottom:44px;font-family:"Martian Mono",monospace;font-size:13px;fill:#566C73}
.key .st{font-family:${lang === "ja" ? "\"IBM Plex Sans JP\"" : lang === "zh" ? "\"Noto Sans SC\"" : "\"IBM Plex Sans\""},sans-serif;font-size:12px;fill:#0D5661}
.chips{position:absolute;right:66px;bottom:150px;display:flex;gap:4px}
.chips i{display:block;width:22px;height:10px}
.meta{position:absolute;right:66px;bottom:126px;font-family:"Martian Mono",monospace;font-size:12px;color:#566C73;letter-spacing:.04em}
</style></head><body>
<div class="sheet"><div class="tombo"></div>
<div class="crest">${crest(78)}</div>
${lang === 'en' ? '' : `<div class="title">${title}</div><div class="sub">${sub}</div>`}
${lang === 'en' ? `<div class="title">${title}</div><div class="sub">${sub}</div><div class="role h">${role}</div>` : ''}
${nameBlock}
<div class="chips">${chips}</div>
<div class="meta">${{ ja: '東京 · 経験8年', en: 'Tokyo · 8 years', zh: '东京 · 从业8年' }[lang]}</div>
${keyLine(lang)}
<div class="kento"></div></div>
</body></html>`;
}

const types = { '.css': 'text/css', '.woff2': 'font/woff2', '.html': 'text/html; charset=utf-8' };
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname.startsWith('/og-')) { res.writeHead(200, { 'content-type': types['.html'] }); return res.end(page(u.pathname.slice(4, 6))); }
  try {
    const f = path.join(PUB, decodeURIComponent(u.pathname));
    if (!f.startsWith(PUB)) throw new Error('outside');
    const buf = await readFile(f);
    res.writeHead(200, { 'content-type': types[path.extname(f)] ?? 'application/octet-stream' });
    res.end(buf);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const browser = await chromium.launch();
try {
  await mkdir(path.join(PUB, 'og'), { recursive: true });
  const pg = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  for (const lang of ['ja', 'en', 'zh']) {
    await pg.goto(`http://127.0.0.1:${PORT}/og-${lang}`, { waitUntil: 'networkidle' });
    await pg.evaluate(() => document.fonts.ready);
    const faces = await pg.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.weight}`));
    const need = { ja: ['Shippori Mincho B1', 'IBM Plex Sans JP', 'Martian Mono'], en: ['Bodoni Moda', 'IBM Plex Sans', 'Martian Mono', 'Shippori Mincho B1'], zh: ['Noto Serif SC', 'Noto Sans SC', 'Martian Mono'] }[lang];
    const missing = need.filter((n) => !faces.some((f) => f.startsWith(n)));
    if (missing.length) throw new Error(`og-${lang}: fonts not loaded: ${missing.join(', ')}`);
    await pg.screenshot({ path: path.join(PUB, 'og', `og-${lang}.png`), type: 'png' });
    console.log(`og-${lang}.png (${faces.length} faces loaded)`);
  }
} finally {
  await browser.close();
  server.close();
}
