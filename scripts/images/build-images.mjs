#!/usr/bin/env node
/**
 * npm run images — every WP-02 image asset (DESIGN §12 items 1–16). Owner: WP-02.
 *
 *   derivatives  public/img/{set}/{slug}.{128,640,1280,max}.{avif,webp} for the 29 artworks + 2 detail crops;
 *                src/content/images.json (w, h, widths, dominant, accent)
 *   masks        public/img/gen/mask-{asanoha,sayagata,undulating}.png (1-bit, 1024 px)
 *   byobu        public/img/gen/byobu-atlas-{3072,1536}.webp (pigment alpha) + byobu-panel-{1..6}.{avif,webp}
 *   gold         public/img/gen/gold-leaf-1280.avif
 *   paper        public/img/gen/washi-512.avif, grain-{day,night}-256.webp
 *   svg          crest, seals, 割印 halves, deckles (public/img/gen), today's print plates (public/print),
 *                cursors (public/cursors), favicons (public/), construction data (assets-src/svg)
 *
 * Usage: node scripts/images/build-images.mjs [task …] [--force]   (no task = all; incremental by mtime)
 * OG images need a browser: `flock .locks/browser.lock node scripts/images/og.mjs` (after `npm run fonts`).
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCrest, crestSvg } from './lib/crest.mjs';
import { buildMinatoSeal, minatoSvg } from './lib/seal.mjs';
import { CURSORS, crestSealSvg, cursorSvg, deckleSvg } from './lib/marks.mjs';
import { buildPlates } from './lib/print-plates.mjs';
import { AVIF, WEBP, derivatives, goldLeaf, grainTile, pigmentPanel, sharp, stencilMask, washiTile } from './lib/raster.mjs';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const SRC = path.join(ROOT, 'assets-src/images');
const PUB = path.join(ROOT, 'public');
const GEN = path.join(PUB, 'img/gen');
const SVGSRC = path.join(ROOT, 'assets-src/svg');
const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const tasks = args.filter((a) => !a.startsWith('--'));
const run = (t) => !tasks.length || tasks.includes(t);
const log = (...a) => console.log('images:', ...a);

/** The artworks the site shows (DESIGN §12 #1). Never used: great-wave, red-fuji, shower-below-summit, ejiri-wind, 17-yui, manga-torii-proportion, hoitsu-cherry-maple. */
export const USED = [
  'tokaido/01-nihonbashi.jpg', 'tokaido/11-hakone.jpg', 'tokaido/12-mishima.jpg', 'tokaido/14-hara.jpg', 'tokaido/24-shimada.jpg',
  'tokaido/39-okazaki.jpg', 'tokaido/46-shono.jpg', 'tokaido/48-seki.jpg', 'tokaido/55-kyoto.jpg',
  'rinpa/mitsumochi-poppies.jpg', 'rinpa/sotatsu-moon-autumn-grasses.jpg', 'rinpa/fans-upon-waves.jpg', 'rinpa/korin-irises-yatsuhashi.jpg',
  'rinpa/kiitsu-morning-glories.jpg', 'rinpa/korin-rough-waves.jpg',
  'hokusai/manga-perspective.jpg', 'hokusai/manga-pattern-construction.jpg', 'hokusai/manga-pagoda-roof.jpg',
  'ukie/toyoharu-kabuki-perspective.jpg', 'ukie/toyoharu-dutch-perspective.jpg', 'pattern/seiei-moon-kikko.jpg',
  'night/hiroshige-ryogoku-moon.jpg', 'landscape/shonen-aged-pines.jpg', 'landscape/motonobu-ink-landscape.jpg',
  'writing/hokkei-first-writing.jpg', 'writing/gakutei-spider-web.jpg', 'writing/gakutei-paper.jpg', 'writing/gakutei-brush.jpg',
  'writing/gakutei-book-cart.jpg',
];
/** Detail crops (§12 #2): no torii in Mishima, no distant Fuji in Hakone. */
const DETAILS = [
  { file: 'tokaido/12-mishima-detail.jpg', from: 'tokaido/12-mishima.jpg', keep: 'left', frac: 0.62 },
  { file: 'tokaido/11-hakone-detail.jpg', from: 'tokaido/11-hakone.jpg', keep: 'right', frac: 0.75 },
];
const NEVER = ['hokusai/great-wave.jpg', 'hokusai/red-fuji.jpg', 'hokusai/shower-below-summit.jpg', 'hokusai/ejiri-wind.jpg',
  'tokaido/17-yui.jpg', 'hokusai/manga-torii-proportion.jpg', 'rinpa/hoitsu-cherry-maple.jpg'];

const widthsFor = (w) => [...new Set([128, 640, 1280, Math.min(2000, w)].filter((x) => x <= w))].sort((a, b) => a - b);
const outBase = (file) => path.join(PUB, 'img', file.replace(/\.[a-z]+$/i, ''));

async function taskDerivatives() {
  const manifest = JSON.parse(await readFile(path.join(SRC, 'manifest.json'), 'utf8'));
  const imagesPath = path.join(ROOT, 'src/content/images.json');
  const images = JSON.parse(await readFile(imagesPath, 'utf8'));
  for (const file of USED) if (NEVER.includes(file)) throw new Error(`never-used image listed: ${file}`);
  let n = 0;
  for (const file of USED) {
    const m = manifest.find((e) => e.file === file);
    const src = path.join(SRC, file);
    const meta = await sharp(src).metadata();
    const widths = widthsFor(meta.width);
    await derivatives({ src, outBase: outBase(file), widths, force: FORCE });
    images[file] = { w: meta.width, h: meta.height, widths, dominant: m?.dominantColors?.[0] ?? images[file]?.dominant ?? '#808080', accent: m?.accentColors ?? images[file]?.accent ?? [] };
    n++;
  }
  for (const d of DETAILS) {
    const src = path.join(SRC, d.from);
    const meta = await sharp(src).metadata();
    const w = Math.round(meta.width * d.frac);
    const extract = { left: d.keep === 'left' ? 0 : meta.width - w, top: 0, width: w, height: meta.height };
    const widths = widthsFor(w);
    await derivatives({ src, outBase: outBase(d.file), widths, extract, force: FORCE });
    const m = manifest.find((e) => e.file === d.from);
    images[d.file] = { w, h: meta.height, widths, dominant: m?.dominantColors?.[0] ?? '#808080', accent: m?.accentColors ?? [] };
    n++;
  }
  // images the site never shows keep their dimensions but no derivatives (widths: [])
  for (const [k, v] of Object.entries(images)) if (![...USED, ...DETAILS.map((d) => d.file)].includes(k)) images[k] = { ...v, widths: [] };
  await writeFile(imagesPath, JSON.stringify(images, null, 2) + '\n');
  log(`derivatives for ${n} images; images.json updated`);
}

async function taskMasks() {
  const jobs = [
    { name: 'asanoha', file: 'pattern/stencil-asanoha.jpg', box: { left: 180, top: 180, width: 1440, height: 720 } },
    { name: 'sayagata', file: 'pattern/stencil-sayagata.jpg', box: { left: 170, top: 262, width: 1630, height: 628 } },
    { name: 'undulating', file: 'pattern/stencil-undulating-lines.jpg', box: { left: 520, top: 560, width: 1180, height: 590 } },
  ];
  for (const j of jobs) {
    const r = await stencilMask({ src: path.join(SRC, j.file), box: j.box, out: path.join(GEN, `mask-${j.name}.png`) });
    log(`mask-${j.name}.png ${r.w}×${r.h}, cut ${(r.coverage * 100).toFixed(1)} %`);
  }
}

async function taskByobu() {
  const cfg = JSON.parse(await readFile(path.join(SVGSRC, 'byobu-crops.json'), 'utf8'));
  const { w: PW, h: PH } = cfg.panel;
  const tiles = [];
  for (const p of cfg.panels) {
    const r = await pigmentPanel({ src: path.join(SRC, p.file), box: p.box, threshold: p.groundThreshold, ramp: p.ramp, w: PW, h: PH, erase: p.erase ?? [] });
    tiles.push(r);
    log(`panel ${p.n} ${p.caseId}: gold ref Lab ${r.ref ? r.ref.map((v) => v.toFixed(0)).join('/') : '—'}, pigment ${(r.coverage * 100).toFixed(0)} %`);
  }
  const atlas = sharp({ create: { width: PW * 6, height: PH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(tiles.map((t, i) => ({ input: t.rgba, raw: { width: t.w, height: t.h, channels: 4 }, left: i * PW, top: 0 })));
  const full = await atlas.png().toBuffer();
  // q 72 / alpha 70 is visually identical to q 84 / 92 on these upsampled panels at half the bytes (≈ 0.5 MB vs 1 MB)
  await sharp(full).webp({ quality: 72, alphaQuality: 70, effort: 6 }).toFile(path.join(GEN, 'byobu-atlas-3072.webp'));
  await sharp(full).resize(PW * 3, PH / 2, { kernel: 'lanczos3' }).webp({ quality: 76, alphaQuality: 75, effort: 6 }).toFile(path.join(GEN, 'byobu-atlas-1536.webp'));
  // mobile panels: 1 : 1.6, opaque, inside the same single panel (第N扇 — no hinge seams, borders or signatures),
  // full panel width, positioned vertically by `mobileY`; always 560 × 896 so the layout can rely on one size
  for (const p of cfg.panels) {
    const src = path.join(SRC, p.file);
    const w = p.box.w, h = Math.round(w * 1.6);
    const top = p.box.y + Math.round((p.box.h - h) * (p.mobileY ?? 0.5));
    const outW = 560, outH = 896;
    const base = path.join(GEN, `byobu-panel-${p.n}`);
    const img = () => sharp(src).extract({ left: p.box.x, top, width: w, height: h }).resize(outW, outH, { kernel: 'lanczos3', fit: 'fill' })
      .sharpen({ sigma: 0.6 }).toColourspace('srgb');
    await img().avif(AVIF).toFile(base + '.avif');
    await img().webp(WEBP).toFile(base + '.webp');
  }
  log('byobu atlas 3072 / 1536 and 6 mobile panels');
}

async function taskGold() {
  await goldLeaf().avif({ quality: 60, effort: 6, chromaSubsampling: '4:4:4' }).toFile(path.join(GEN, 'gold-leaf-1280.avif'));
  log('gold-leaf-1280.avif');
}

async function taskPaper() {
  await washiTile().avif({ quality: 48, effort: 6 }).toFile(path.join(GEN, 'washi-512.avif'));
  await grainTile([15, 37, 64]).webp({ quality: 60, alphaQuality: 45, effort: 6 }).toFile(path.join(GEN, 'grain-day-256.webp'));
  await grainTile([234, 244, 252], 256, 4, true).webp({ quality: 60, alphaQuality: 45, effort: 6 }).toFile(path.join(GEN, 'grain-night-256.webp'));
  log('washi-512.avif, grain-day-256.webp, grain-night-256.webp');
}

async function taskSvg() {
  await mkdir(GEN, { recursive: true });
  await mkdir(path.join(PUB, 'print'), { recursive: true });
  await mkdir(path.join(PUB, 'cursors'), { recursive: true });
  await mkdir(path.join(SVGSRC, 'cursors'), { recursive: true });
  // crest
  const cr = buildCrest();
  await writeFile(path.join(SVGSRC, 'crest.json'), JSON.stringify(cr, null, 1) + '\n');
  await writeFile(path.join(GEN, 'crest.svg'), crestSvg(cr));
  // favicon: crest with its own dark-scheme colour; PNGs on the day paper
  await writeFile(path.join(PUB, 'favicon.svg'), crestSvg(cr, { fill: 'currentColor', extraStyle: 'svg{color:#0F2540}@media (prefers-color-scheme:dark){svg{color:#EAF4FC}}' }));
  const bold = buildCrest({ R: 48, width: 0.15, gap: 0.045, ring: 0.8 }); // optically corrected for 16–32 px
  const png = async (size, file, pad = 0, bg = null) => {
    const inner = Math.round(size * (1 - pad * 2));
    // the 32 px tab icon sits on light or dark browser chrome: paper disc behind the ink mark
    const icon = await sharp(Buffer.from(crestSvg(size <= 48 ? bold : cr, { disc: size <= 48 ? '#FFFFFB' : null })), { density: (72 * inner) / 100 * 2 }).resize(inner, inner).png().toBuffer();
    const canvas = sharp({ create: { width: size, height: size, channels: 4, background: bg ?? { r: 0, g: 0, b: 0, alpha: 0 } } });
    await canvas.composite([{ input: icon, left: Math.round((size - inner) / 2), top: Math.round((size - inner) / 2) }]).png({ compressionLevel: 9 }).toFile(path.join(PUB, file));
  };
  await png(32, 'favicon-32.png', 0.02);
  await png(180, 'apple-touch-icon.png', 0.14, { r: 247, g: 252, b: 254, alpha: 1 });
  await png(512, 'icon-512.png', 0.12, { r: 247, g: 252, b: 254, alpha: 1 });
  // seals
  const seal = buildMinatoSeal();
  await writeFile(path.join(SVGSRC, 'seal-minato.json'), JSON.stringify(seal, null, 1) + '\n');
  await writeFile(path.join(GEN, 'seal-minato.svg'), minatoSvg(seal));
  const [, , SW, SH] = seal.viewBox;
  await writeFile(path.join(GEN, 'wariin-top.svg'), minatoSvg(seal, { id: 'wt', clip: [0, SH / 2], title: '割印（上）' }));
  await writeFile(path.join(GEN, 'wariin-bottom.svg'), minatoSvg(seal, { id: 'wb', clip: [SH / 2, SH], title: '割印（下）' }));
  const cs = crestSealSvg();
  await writeFile(path.join(GEN, 'seal-crest.svg'), cs.svg);
  await writeFile(path.join(GEN, 'seal-paths.json'), JSON.stringify({
    about: 'Seal faces for the carve module (svgPaths + viewBox, filled with the non-zero rule). minato: 白文 — the field is raised, the glyph strokes are incised (face minus glyph). crest: 朱文 肖形印 — frame and crest raised. wariin: the minato seal split at y = H/2.',
    minato: { viewBox: seal.viewBox, face: seal.face, glyph: seal.glyph, style: 'hakubun' },
    crest: { viewBox: cs.viewBox, paths: cs.paths, style: 'shubun' },
    wariin: { splitY: SH / 2, width: SW, height: SH },
  }) + '\n');
  // deckles
  for (let v = 1; v <= 4; v++) await writeFile(path.join(GEN, `deckle-${v}.svg`), deckleSvg(v));
  // today's print plates
  const plates = buildPlates();
  for (const [name, svg] of Object.entries(plates.files)) await writeFile(path.join(PUB, 'print', name), svg);
  await writeFile(path.join(SVGSRC, 'print-layout.json'), JSON.stringify(plates.layout, null, 1) + '\n');
  // cursors: SVG source + PNG 1x (32) / 2x (64)
  for (const name of Object.keys(CURSORS)) {
    const svg = cursorSvg(name);
    await writeFile(path.join(SVGSRC, 'cursors', `${name}.svg`), svg);
    await sharp(Buffer.from(svg), { density: 72 }).resize(32, 32).png({ compressionLevel: 9 }).toFile(path.join(PUB, 'cursors', `${name}.png`));
    await sharp(Buffer.from(svg), { density: 144 }).resize(64, 64).png({ compressionLevel: 9 }).toFile(path.join(PUB, 'cursors', `${name}@2x.png`));
  }
  await writeFile(path.join(PUB, 'cursors', 'hotspots.json'), JSON.stringify(Object.fromEntries(Object.entries(CURSORS).map(([k, v]) => [k, { x: v.hotspot[0], y: v.hotspot[1], note: v.note }])), null, 1) + '\n');
  log('crest, favicons, seals, 割印, deckles, 8 print plates + cartouche, 7 cursors');
}

const order = [['svg', taskSvg], ['derivatives', taskDerivatives], ['masks', taskMasks], ['byobu', taskByobu], ['gold', taskGold], ['paper', taskPaper]];
for (const [name, fn] of order) if (run(name)) { const t = Date.now(); await fn(); log(`${name} ${((Date.now() - t) / 1000).toFixed(1)} s`); }
if (!existsSync(path.join(PUB, 'og/og-ja.png'))) log('note: OG images not built yet — run scripts/images/og.mjs under the browser lock');
