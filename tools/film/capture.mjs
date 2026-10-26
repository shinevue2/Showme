// Film capture (DESIGN §7.3 step 4, threejs §j; owner WP-03).
// Renders tools/film/capture.html in headless Chromium (project Playwright, SwiftShader) and pipes PNG frames
// to ffmpeg → near-lossless master. Run under the browser lock:
//   flock .locks/browser.lock node tools/film/capture.mjs --variant landscape --out assets-src/film/master-landscape.mp4
//   flock .locks/browser.lock node tools/film/capture.mjs --variant portrait  --out assets-src/film/master-portrait.mp4
// Preview stills instead of a master:
//   flock .locks/browser.lock node tools/film/capture.mjs --variant landscape --frames 0,66,138 --png-dir <dir> [--scale 0.5] [--hide traveller[,restmist]]
// Starts a Vite dev server on 5173 (--strictPort) unless one is already answering; stops it afterwards.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
// the machine is shared: this process, Chromium and ffmpeg (children inherit it) run at nice 10
try { os.setPriority(10); } catch { /* not permitted: keep the default */ }
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : def; };
const variant = opt('variant', 'landscape');
const out = opt('out', null);
const framesArg = opt('frames', null);
const pngDir = opt('png-dir', null);
const scale = Number(opt('scale', '1'));
const port = Number(opt('port', '5173'));
const hide = opt('hide', null);            // review aids: --hide traveller | restmist | traveller,restmist
const BATCH = 8;
const W = variant === 'portrait' ? 1080 : 1920, H = variant === 'portrait' ? 1920 : 1080;
const FPS = variant === 'portrait' ? 24 : 30;
const N = variant === 'portrait' ? 384 : 480;
const url = `http://localhost:${port}/tools/film/capture.html?variant=${variant}&scale=${scale}${hide ? `&hide=${hide}` : ''}`;

async function up() {
  try { const r = await fetch(`http://localhost:${port}/tools/film/capture.html`); return r.ok; } catch { return false; }
}

let vite = null;
async function ensureServer() {
  if (await up()) return;
  vite = spawn(path.join(ROOT, 'node_modules/.bin/vite'), ['--port', String(port), '--strictPort'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], detached: false });
  vite.stdout.on('data', () => {});
  vite.stderr.on('data', (d) => process.stderr.write(d));
  for (let i = 0; i < 120; i++) { if (await up()) return; await new Promise((r) => setTimeout(r, 500)); }
  throw new Error('vite dev server did not start');
}

const LAUNCH = { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] };
let browser, page;
async function open() {
  if (browser) await browser.close().catch(() => {});
  browser = await chromium.launch(LAUNCH);
  page = await browser.newPage({ viewport: { width: Math.round(W * scale), height: Math.round(H * scale) }, deviceScaleFactor: 1 });
  page.on('console', (m) => { if (m.type() === 'error') console.error('[page]', m.text()); });
  page.on('pageerror', (e) => console.error('[pageerror]', e.message));
  // no HMR during a capture: other work on the shared tree must not reload the page mid-batch
  await page.route('**/@vite/client', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: 'const h = { accept() {}, acceptExports() {}, dispose() {}, prune() {}, invalidate() {}, decline() {}, on() {}, off() {}, send() {}, data: {} };\n' +
      'export const createHotContext = () => h; export const updateStyle = () => {}; export const removeStyle = () => {};\n' +
      'export const injectQuery = (u) => u; export class ErrorOverlay {}\n',
  }));
  await page.goto(url);
  await page.waitForFunction('window.capture && (window.capture.ready === true || window.capture.error)', null, { timeout: 300_000 });
  const err = await page.evaluate('window.capture.error || null');
  if (err) throw new Error(err);
}

async function batch(start, n) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await page.evaluate(([s, k]) => window.capture.frames(s, k, 'image/png'), [start, n]);
    } catch (e) {
      if (attempt >= 5) throw e;
      console.error(`batch ${start}+${n} failed (${e.message.split('\n')[0]}); reopening`);
      await open();
    }
  }
}

const dataToBuf = (u) => Buffer.from(u.slice(u.indexOf(',') + 1), 'base64');

try {
  await ensureServer();
  await open();
  if (framesArg) {
    const list = framesArg.split(',').map(Number);
    mkdirSync(pngDir, { recursive: true });
    for (const f of list) {
      const [u] = await batch(f, 1);
      const file = path.join(pngDir, `${variant}-${String(f).padStart(3, '0')}.png`);
      writeFileSync(file, dataToBuf(u));
      console.log(file);
    }
  } else {
    if (!out) throw new Error('--out required');
    // written beside the target and renamed at the end: an interrupted capture never destroys the last master
    const part = path.resolve(ROOT, out).replace(/\.mp4$/, '.part.mp4');
    const ff = spawn(path.join(ROOT, 'tools/bin/ffmpeg'), ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
      '-vf', 'scale=out_color_matrix=bt709:out_range=tv:flags=lanczos', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '12', '-g', '8', '-bf', '0',
      '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
      part], { stdio: ['pipe', 'inherit', 'inherit'] });
    const hashes = new Map();
    const t0 = Date.now();
    for (let i = 0; i < N; i += BATCH) {
      const frames = await batch(i, Math.min(BATCH, N - i));
      for (let j = 0; j < frames.length; j++) {
        const u = frames[j];
        const f = i + j;
        const buf = dataToBuf(u);
        if (f % 30 === 0 || variant === 'portrait' && f % 24 === 0) {
          const h = createHash('sha256').update(buf).digest('hex').slice(0, 16);
          if (buf.length < 20_000) console.warn(`frame ${f}: suspiciously small PNG (${buf.length} B)`);
          if (hashes.has(h)) console.warn(`frame ${f}: identical to frame ${hashes.get(h)}`);
          hashes.set(h, f);
        }
        if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
      }
      if (i % 64 === 0) process.stdout.write(`\r${variant}: ${i + frames.length}/${N} frames, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    }
    ff.stdin.end();
    const code = await new Promise((r) => ff.on('close', r));
    if (code !== 0) throw new Error(`ffmpeg exited with ${code}`);
    renameSync(part, path.resolve(ROOT, out));
    console.log(`\n${variant}: master written to ${out} in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
} finally {
  if (browser) await browser.close().catch(() => {});
  if (vite) vite.kill('SIGTERM');
}
