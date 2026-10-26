#!/usr/bin/env node
/**
 * Post-build (DESIGN §6.11 edition line, §11.2 sitemap, §8.9). Owner: WP-00.
 *  - verifies all 22 pages exist in dist/ and that no rendered page still contains an SSR marker;
 *  - verifies no absolute "/assets/" or "/src/" URL leaked into the HTML (dist/ must work from any sub-path);
 *  - writes dist/sitemap.xml only when SITE_ORIGIN is set;
 *  - on release builds (HANMOTO_RELEASE=1) increments build/edition.json `n` (第{v}版 第{n}刷) for the next
 *    impression and records the release date;
 *  - writes dist/build-info.json (version, edition, build time) for the Colophon / Info panel.
 * Never fails on content warnings; fails only on a broken dist/.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const CASES = ['ledger', 'tracing', 'mapgl', 'strangler', 'platform', 'resilience'];
const PAGES = ['index.html', 'en/index.html', 'zh/index.html', '404.html',
  ...CASES.flatMap((id) => [`works/${id}/index.html`, `en/works/${id}/index.html`, `zh/works/${id}/index.html`])];

let errors = 0;
for (const p of PAGES) {
  const f = path.join(dist, p);
  if (!existsSync(f)) { console.error(`[postbuild] missing ${p}`); errors++; continue; }
  const html = readFileSync(f, 'utf8');
  if (html.includes('<!--ssr-')) { console.error(`[postbuild] ${p} still contains an SSR marker`); errors++; }
  const abs = html.match(/(?:src|href)="\/(?:assets|src)\/[^"]*"/g);
  if (abs) { console.error(`[postbuild] ${p} has absolute asset URLs: ${abs.slice(0, 3).join(', ')}`); errors++; }
}
/* JS before LCP (§8.8, §10.1): the entry module and its STATIC import graph must stay tiny and must never
   pull in the lazy groups (three, motion, mediabunny) — a CSS import from node_modules once dragged the
   whole motion chunk into the entry this way. */
{
  const budget = JSON.parse(readFileSync(path.join(root, 'build/budgets.json'), 'utf8')).jsBeforeLcp?.gzip ?? 15360;
  const html = readFileSync(path.join(dist, 'index.html'), 'utf8');
  const entries = [...html.matchAll(/<script type="module"[^>]*\bsrc="\.\/(assets\/[^"]+\.js)"/g)].map((m) => m[1]);
  const seen = new Set();
  const walk = (rel) => {
    if (seen.has(rel)) return;
    seen.add(rel);
    const code = readFileSync(path.join(dist, rel), 'utf8');
    for (const m of code.matchAll(/(?:^|[;}\s])import\s*(?:[\w${},*\s]+from\s*)?["'`]\.\/([^"'`]+\.js)["'`]/g)) walk('assets/' + m[1]);
  };
  entries.forEach(walk);
  let gz = 0;
  for (const rel of seen) {
    gz += gzipSync(readFileSync(path.join(dist, rel))).length;
    if (/^assets\/(three|motion|mediabunny)-/.test(rel)) { console.error(`[postbuild] entry statically imports the lazy chunk ${rel}`); errors++; }
  }
  if (gz > budget) { console.error(`[postbuild] entry graph is ${gz} B gzip (> ${budget} B JS-before-LCP budget): ${[...seen].join(', ')}`); errors++; }
  else console.log(`[postbuild] entry graph ${[...seen].map((r) => path.basename(r)).join(' + ')} = ${gz} B gzip (budget ${budget})`);
}

/* Root-absolute url(/…) in the CSS escapes a sub-path deployment. Vite rewrites url(/x) to a relative URL
   only when public/x exists at build time, so a leftover means the file is not produced yet (warning). */
for (const f of readdirSync(path.join(dist, 'assets')).filter((x) => x.endsWith('.css'))) {
  const css = readFileSync(path.join(dist, 'assets', f), 'utf8');
  const abs = [...new Set([...css.matchAll(/url\(\s*["']?(\/[^/"')][^"')]*)/g)].map((m) => m[1]))];
  if (abs.length) console.warn(`[postbuild] warning: ${f} keeps root-absolute ${abs.join(', ')} — missing from public/, would 404 under a sub-path until produced`);
}

if (errors) {
  console.error(`[postbuild] ${errors} problem(s) in dist/`);
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const editionFile = path.join(root, 'build/edition.json');
const edition = JSON.parse(readFileSync(editionFile, 'utf8'));
const builtAt = new Date().toISOString();

const origin = process.env.SITE_ORIGIN?.replace(/\/+$/, '');
if (origin) {
  const urls = PAGES.filter((p) => p !== '404.html').map((p) => `${origin}/${p.replace(/index\.html$/, '')}`);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url><loc>${u}</loc><lastmod>${builtAt.slice(0, 10)}</lastmod></url>`).join('\n') + `\n</urlset>\n`;
  writeFileSync(path.join(dist, 'sitemap.xml'), xml);
  const robots = path.join(dist, 'robots.txt');
  if (existsSync(robots)) writeFileSync(robots, readFileSync(robots, 'utf8').trimEnd() + `\nSitemap: ${origin}/sitemap.xml\n`);
  console.log(`[postbuild] sitemap.xml with ${urls.length} URLs`);
}

writeFileSync(path.join(dist, 'build-info.json'), JSON.stringify({ version: pkg.version, edition: { v: edition.v, n: edition.n }, builtAt }, null, 2) + '\n');

if (process.env.HANMOTO_RELEASE === '1') {
  const next = { ...edition, v: Number(String(pkg.version).split('.')[0]) || edition.v, n: edition.n + 1, lastRelease: builtAt };
  writeFileSync(editionFile, JSON.stringify(next, null, 2) + '\n');
  console.log(`[postbuild] release: printed 第${edition.v}版 第${edition.n}刷; next impression will be ${next.n}`);
}
console.log(`[postbuild] ok — ${PAGES.length} pages verified`);
