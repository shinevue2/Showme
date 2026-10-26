#!/usr/bin/env node
/**
 * View posters (DESIGN §12 #26, §8.6 context-loss fallback). Owner: WP-00 creates; WP-11 owns after Phase 1.
 *
 * Opens each view in poster mode — `?poster=<viewId>&theme=day|night&tier=high` freezes motion (the motion
 * layer is forced off), hides the chrome, scrolls the placeholder to the centre and exposes
 * `window.__hanmoto.poster.ready` (resolves after the view's first frame) — then screenshots the
 * `[data-view-id]` element and encodes AVIF to public/img/posters/{viewId}-{day|night}-{1440|390}.avif
 * (budget ≤ 60 KB each).
 *
 * Needs a running server (vite preview or dev). One browser at a time on this machine:
 *   npm run build && (npx vite preview --port 4170 --strictPort &)
 *   flock .locks/browser.lock node scripts/capture-posters.mjs --base http://localhost:4170/ [--views cover-block,works-byobu]
 *     [--themes day,night] [--widths 1440,390] [--lang ja|en|zh] [--quality 50] [--dry]
 */
import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const BASE = arg('base', process.env.POSTER_BASE ?? 'http://localhost:4170/');
const VIEWS = arg('views', 'works-byobu,skills-kumiko,principles-garden,writing-marble,colophon-emaki').split(',');
const THEMES = arg('themes', 'day,night').split(',');
const WIDTHS = arg('widths', '1440,390').split(',').map(Number);
const LANG = arg('lang', 'ja');
const QUALITY = Number(arg('quality', '50'));
const DRY = argv.includes('--dry');
const OUT = path.resolve(root, arg('out', 'public/img/posters'));
const BUDGET = 60 * 1024;
const HEIGHT = { 1440: 900, 390: 844 };

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const report = [];
try {
  mkdirSync(OUT, { recursive: true });
  for (const width of WIDTHS) {
    for (const theme of THEMES) {
      const ctx = await browser.newContext({ viewport: { width, height: HEIGHT[width] ?? 900 }, deviceScaleFactor: 1, colorScheme: theme === 'night' ? 'dark' : 'light' });
      for (const id of VIEWS) {
        const page = await ctx.newPage();
        const url = new URL(LANG === 'ja' ? '' : `${LANG}/`, BASE);
        url.searchParams.set('poster', id);
        url.searchParams.set('theme', theme);
        url.searchParams.set('tier', 'high');
        try {
          await page.goto(url.href, { waitUntil: 'load', timeout: 60000 });
          await page.waitForFunction(() => !!window.__hanmoto, null, { timeout: 30000 });
          await page.evaluate(() => window.__hanmoto.stageReady);
          const drawn = await page.waitForFunction(() => window.__hanmoto.poster?.ready, null, { timeout: 30000 }).then((h) => h.jsonValue()).catch(() => false);
          await page.evaluate(() => document.fonts.ready);
          await page.waitForTimeout(500);
          const el = await page.$(`[data-view-id="${id}"]`);
          if (!el || !drawn) { report.push({ id, theme, width, error: el ? 'view never drew (static tier, hidden at this width, or not registered)' : 'placeholder not found' }); continue; }
          const png = await el.screenshot({ type: 'png' });
          const avif = await sharp(png).avif({ quality: QUALITY, effort: 6 }).toBuffer();
          const file = path.join(OUT, `${id}-${theme}-${width}.avif`);
          if (!DRY) writeFileSync(file, avif);
          report.push({ id, theme, width, bytes: avif.length, overBudget: avif.length > BUDGET, file: path.relative(root, file) });
        } catch (e) {
          report.push({ id, theme, width, error: String(e?.message ?? e).split('\n')[0] });
        } finally {
          await page.close();
        }
      }
      await ctx.close();
    }
  }
} finally {
  await browser.close();
}
for (const r of report) {
  console.log(r.error ? `FAIL ${r.id} ${r.theme} ${r.width}: ${r.error}` : `${r.overBudget ? 'OVER' : 'ok  '} ${r.file} ${(r.bytes / 1024).toFixed(1)} KB`);
}
process.exit(report.some((r) => r.error) ? 1 : 0);
