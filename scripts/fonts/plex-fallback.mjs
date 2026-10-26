#!/usr/bin/env node
/**
 * Tunes the "Plex Fallback" @font-face (local Arial with metric overrides, DESIGN §3.3) so en cover and
 * summary paragraphs reflow ≤ 2 % when IBM Plex Sans swaps in. Measures in Chromium (Arial resolves to the
 * metric-compatible Liberation Sans on Linux), prints the descriptors and the reflow check. Owner: WP-02.
 *
 *   flock .locks/browser.lock node scripts/fonts/plex-fallback.mjs
 */
import http from 'node:http';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { loadContent, ROOT } from './load-content.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const { content: c } = await loadContent();
const paras = [c.copy.cover.takeaway.en, ...c.copy.summary.paragraphs.map((p) => p.en), c.copy.summary.takeaway.en, c.copy.cover.role.en];
// IBM Plex Sans (hhea): unitsPerEm 1000, ascender 1025, descender −275, lineGap 0
const ASC = 102.5, DESC = 27.5;

const html = (sizeAdjust) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><link rel="stylesheet" href="/fonts/fonts-shared.css"><style>
@font-face{font-family:"Plex Fallback";src:local("Arial"),local("Helvetica Neue"),local("Liberation Sans");size-adjust:${sizeAdjust}%;ascent-override:${(ASC / sizeAdjust * 100).toFixed(2)}%;descent-override:${(DESC / sizeAdjust * 100).toFixed(2)}%;line-gap-override:0%}
body{margin:0;width:1400px}.col{width:560px;font-size:16px;line-height:1.55;margin:0 0 24px}
.a{font-family:"IBM Plex Sans"}.b{font-family:"Plex Fallback"}.lead{font-size:20px;width:640px}
</style></head><body>${paras.map((p, i) => `<p class="col a ${i === 0 ? 'lead' : ''}" id="a${i}">${p}</p><p class="col b ${i === 0 ? 'lead' : ''}" id="b${i}">${p}</p>`).join('')}
<span id="wa" class="a" style="font-size:100px;white-space:nowrap">${paras.join(' ')}</span><br><span id="wb" class="b" style="font-size:100px;white-space:nowrap">${paras.join(' ')}</span></body></html>`;

let sizeAdjust = 100;
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/t') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(html(Number(u.searchParams.get('s')) || 100)); }
  try { const f = path.join(ROOT, 'public', u.pathname); res.writeHead(200, { 'content-type': f.endsWith('.css') ? 'text/css' : 'font/woff2' }); res.end(await readFile(f)); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(5172, '127.0.0.1', r));
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const measure = async (s) => {
    await page.goto(`http://127.0.0.1:5172/t?s=${s}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    return page.evaluate((n) => {
      const r = (id) => document.getElementById(id).getBoundingClientRect();
      const rows = [];
      for (let i = 0; i < n; i++) rows.push({ a: r('a' + i).height, b: r('b' + i).height });
      return { wa: r('wa').width, wb: r('wb').width, rows };
    }, paras.length);
  };
  const m0 = await measure(100);
  sizeAdjust = +(100 * (m0.wa / m0.wb)).toFixed(2);
  const m1 = await measure(sizeAdjust);
  const reflow = m1.rows.map((r) => Math.abs(r.b - r.a) / r.a);
  console.log(`advance-width ratio Plex/Arial: ${(m0.wa / m0.wb).toFixed(4)}`);
  console.log(`@font-face{font-family:"Plex Fallback";src:local("Arial"),local("Helvetica Neue"),local("Liberation Sans");size-adjust:${sizeAdjust}%;ascent-override:${(ASC / sizeAdjust * 100).toFixed(2)}%;descent-override:${(DESC / sizeAdjust * 100).toFixed(2)}%;line-gap-override:0%}`);
  console.log(`single-line width after tuning: ${(Math.abs(m1.wb - m1.wa) / m1.wa * 100).toFixed(2)} % off`);
  console.log(`paragraph height change on swap: ${reflow.map((x) => (x * 100).toFixed(1) + ' %').join(', ')} (max ${(Math.max(...reflow) * 100).toFixed(1)} %)`);
} finally { await browser.close(); server.close(); }
