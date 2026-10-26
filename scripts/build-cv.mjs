#!/usr/bin/env node
/**
 * CV PDFs (DESIGN §2.3, WP-04 R6): prints the hidden `.cv-sheet` of each main page through `src/chrome/print.css`
 * (two A4 pages per language) to public/cv/cv-{ja,en,zh}.pdf. Needs a running preview of a fresh build:
 *
 *   flock .locks/build.lock npm run build && (npx vite preview --port 4181 --strictPort &)
 *   flock .locks/browser.lock node scripts/build-cv.mjs --base http://127.0.0.1:4181/
 *
 * Rebuild afterwards so dist/cv/ carries the new PDFs.
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const BASE = arg('base', 'http://127.0.0.1:4170/');
const OUT = path.resolve(root, arg('out', 'public/cv'));

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
let failed = false;
try {
  for (const lang of ['ja', 'en', 'zh']) {
    const page = await browser.newPage({ viewport: { width: 1240, height: 1754 } });
    const url = new URL(lang === 'ja' ? '' : `${lang}/`, BASE);
    url.searchParams.set('proof', '1');
    try {
      await page.goto(url.href, { waitUntil: 'load', timeout: 60000 });
      await page.evaluate(() => document.fonts.ready);
      await page.emulateMedia({ media: 'print' });
      await page.waitForTimeout(400);
      const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
      const file = path.join(OUT, `cv-${lang}.pdf`);
      writeFileSync(file, pdf);
      const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
      console.log(`ok   ${path.relative(root, file)} ${(pdf.length / 1024).toFixed(1)} KB, ${pages} page(s)`);
    } catch (e) {
      failed = true;
      console.log(`FAIL cv-${lang}: ${String(e?.message ?? e).split('\n')[0]}`);
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}
process.exit(failed ? 1 : 0);
