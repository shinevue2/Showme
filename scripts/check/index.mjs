#!/usr/bin/env node
/**
 * Smoke test of the built site (WP-11): every page of dist/ at 1440 × 900 and 390 × 844 — console errors,
 * page errors, failed requests / HTTP ≥ 400, horizontal overflow. Main pages are scrolled to the bottom in steps
 * so lazily mounted sections, posters and chunks load too. Needs a running preview:
 *
 *   (npx vite preview --port 4181 --strictPort &)
 *   flock .locks/browser.lock node scripts/check/index.mjs --base http://127.0.0.1:4181/ [--widths 1440,390]
 */
import { chromium } from 'playwright';
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const BASE = arg('base', 'http://127.0.0.1:4170/');
const WIDTHS = arg('widths', '1440,390').split(',').map(Number);
const ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];

function pages(dir = path.join(root, 'dist'), rel = '') {
  const out = [];
  for (const f of readdirSync(dir)) {
    const p = path.join(dir, f);
    if (statSync(p).isDirectory()) { if (!['assets', 'img', 'fonts', 'film', 'cv', 'print', 'cursors'].includes(f)) out.push(...pages(p, rel + f + '/')); }
    else if (f === 'index.html') out.push(rel);
    else if (f === '404.html' && !rel) out.push('404.html');
  }
  return out.sort();
}

const list = pages();
const isMain = (p) => p === '' || p === 'en/' || p === 'zh/';
const browser = await chromium.launch({ args: ARGS });
let problems = 0;
try {
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 900 } });
    for (const p of list) {
      const page = await ctx.newPage();
      const issues = [];
      page.on('console', (m) => { if (m.type() === 'error') issues.push('console: ' + m.text().slice(0, 160)); });
      page.on('pageerror', (e) => issues.push('pageerror: ' + String(e.message).slice(0, 160)));
      page.on('requestfailed', (r) => { const u = r.url(); if (!/blob:|data:/.test(u) && !/ERR_ABORTED/.test(r.failure()?.errorText ?? '')) issues.push(`failed: ${u.replace(BASE, '')} ${r.failure()?.errorText}`); });
      page.on('response', (r) => { if (r.status() >= 400 && !(p === '404.html' && r.url().endsWith('404.html'))) issues.push(`${r.status()}: ${r.url().replace(BASE, '')}`); });
      try {
        await page.goto(new URL(p, BASE).href, { waitUntil: 'load', timeout: 60000 });
        await page.waitForTimeout(1200);
        if (isMain(p)) {
          const h = await page.evaluate(() => document.documentElement.scrollHeight);
          for (let y = 0; y < h; y += 900) { await page.evaluate((v) => window.scrollTo(0, v), y); await page.waitForTimeout(250); }
          await page.waitForTimeout(800);
        }
        const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        if (over > 0) issues.push(`horizontal overflow ${over}px`);
      } catch (e) {
        issues.push('nav: ' + String(e?.message ?? e).split('\n')[0]);
      }
      const uniq = [...new Set(issues)];
      problems += uniq.length;
      console.log(`${uniq.length ? 'FAIL' : 'ok  '} ${width} /${p}${uniq.length ? '\n     ' + uniq.join('\n     ') : ''}`);
      await page.close();
    }
    await ctx.close();
  }
} finally {
  await browser.close();
}
console.log(`${list.length} pages × ${WIDTHS.length} widths, ${problems} issue(s)`);
process.exit(problems ? 1 : 0);
