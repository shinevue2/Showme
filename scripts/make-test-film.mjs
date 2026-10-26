#!/usr/bin/env node
/**
 * Synthetic test film (DESIGN §13.2 WP-00, §7.3–§7.4). Owner: WP-00.
 * Encodes a 16 s synthetic clip (SMPTE bars + a moving block + a chapter counter) with the exact §7.3 settings (H.264 high, -g 8 -bf 0, forced IDR at the
 * seven rest times, x264 zones), in the three shipped variants (hd 1280×720@30, sd 960×540@30,
 * portrait 720×1280@24), extracts chapter stills from the ENCODED files (AVIF + WebP, plus end stills),
 * publishes them with 8-hex sha256 suffixes into public/film/ and writes src/film/film-manifest.json.
 * WP-03 replaces all of it with the real film (tools/film/publish.mjs).
 *
 * Run (one encode at a time on this machine):
 *   flock .locks/ffmpeg.lock nice -n 10 node scripts/make-test-film.mjs
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync, copyFileSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FF = path.join(root, 'tools/bin/ffmpeg');
const tmp = path.join(root, 'build/film/test');
const out = path.join(root, 'public/film');
const REST = [0, 2.2, 4.6, 6.9, 9.2, 11.5, 13.8];
const HOLD = [0.3, 0.4, 0.4, 0.4, 0.4, 0.4, 0.55];
const STATIONS = ['nihonbashi', 'hakone', 'mishima', 'hara', 'shimada', 'okazaki', 'shono'];
const COLOR = ['-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv'];
const X264 = ['-c:v', 'libx264', '-preset', 'slow', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-tag:v', 'avc1', '-movflags', '+faststart', '-an'];
const ZL = 'zones=0,3,q=18/63,69,q=18/135,141,q=18/204,210,q=18/273,279,q=18/342,348,q=18/411,417,q=18';
const ZP = 'zones=0,3,q=18/50,56,q=18/107,113,q=18/163,169,q=18/218,224,q=18/273,279,q=18/328,334,q=18';

function ff(args) {
  const r = spawnSync(FF, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error('ffmpeg failed: ' + args.join(' '));
}

/** Chapter counter without drawtext (not in this static build): chapter k shows k filled squares. */
function label(h) {
  const s = Math.round(h / 18), gap = Math.round(s / 2), y = Math.round(h / 18);
  return REST.map((t, i) => `,drawbox=x=${y + i * (s + gap)}:y=${y}:w=${s}:h=${s}:color=0x0F2540@1:t=fill:enable='gte(t,${Math.max(0, t - 0.01)})'`).join('') +
    `,drawbox=x=${y - 4}:y=${y - 4}:w=${7 * (s + gap) - gap + 8}:h=${s + 8}:color=white@1:t=2`;
}

function encode(name, { w, h, fps, crf, level, zones }) {
  const filter = path.join(tmp, `${name}.filter`);
  // flat bars + one moving block: realistic seeks (every frame differs) at a fraction of testsrc2's bitrate
  const moving = `,drawbox=x='mod(t*${Math.round(w / 4)}\\,${w})':y=${Math.round(h * 0.62)}:w=${Math.round(w / 16)}:h=${Math.round(h * 0.18)}:color=0xEB6101@1:t=fill`;
  writeFileSync(filter, `fps=${fps},scale=${w}:${h}:flags=lanczos${moving}${label(h)}`);
  const file = path.join(tmp, `film-${name}.mp4`);
  ff(['-f', 'lavfi', '-i', `smptehdbars=size=${w}x${h}:rate=${fps}`, '-t', '16', '-filter_script:v', filter,
    ...COLOR, ...X264, '-level:v', level, '-crf', String(crf), '-g', '8', '-keyint_min', '8', '-bf', '0',
    '-force_key_frames', REST.join(','), '-x264-params', zones, file]);
  return file;
}

function stills(src, suffix) {
  const files = { avif: [], webp: [] };
  REST.forEach((t, i) => {
    const png = path.join(tmp, `ch-${i + 1}${suffix}.png`);
    ff(['-ss', String(t), '-i', src, '-frames:v', '1', '-update', '1', '-c:v', 'png', png]);
    const avif = png.replace(/\.png$/, '.avif');
    const webp = png.replace(/\.png$/, '.webp');
    ff(['-i', png, '-c:v', 'libaom-av1', '-still-picture', '1', '-crf', '30', '-cpu-used', '4', '-pix_fmt', 'yuv420p', avif]);
    ff(['-i', png, '-c:v', 'libwebp', '-quality', '78', '-compression_level', '6', webp]);
    files.avif.push(avif);
    files.webp.push(webp);
  });
  const endPng = path.join(tmp, `end${suffix}.png`);
  ff(['-sseof', '-0.05', '-i', src, '-frames:v', '1', '-update', '1', '-c:v', 'png', endPng]);
  const end = { avif: endPng.replace(/\.png$/, '.avif'), webp: endPng.replace(/\.png$/, '.webp') };
  ff(['-i', endPng, '-c:v', 'libaom-av1', '-still-picture', '1', '-crf', '30', '-cpu-used', '4', '-pix_fmt', 'yuv420p', end.avif]);
  ff(['-i', endPng, '-c:v', 'libwebp', '-quality', '78', '-compression_level', '6', end.webp]);
  return { ...files, end };
}

/** Copy into public/film/ with an 8-hex content hash; returns the site-root-relative path. */
function publish(file) {
  const hash = createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, 8);
  const base = path.basename(file);
  const ext = path.extname(base);
  const name = `${base.slice(0, -ext.length)}.${hash}${ext}`;
  copyFileSync(file, path.join(out, name));
  return `film/${name}`;
}

rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });
mkdirSync(out, { recursive: true });
for (const f of readdirSync(out)) if (/^(film-(hd|sd|portrait)|ch-\d|end)/.test(f)) rmSync(path.join(out, f));

const hd = encode('hd', { w: 1280, h: 720, fps: 30, crf: 23, level: '4.0', zones: ZL });
const sd = encode('sd', { w: 960, h: 540, fps: 30, crf: 24, level: '3.1', zones: ZL });
const portrait = encode('portrait', { w: 720, h: 1280, fps: 24, crf: 25, level: '4.0', zones: ZP });
const land = stills(hd, '');
const port = stills(portrait, '-p');

const variant = (file, w, h, fps, frames) => ({ src: publish(file), w, h, fps, frames, bytes: statSync(file).size });
const manifest = {
  version: 1,
  duration: 16.0,
  chapters: REST.map((rest, i) => ({ n: i + 1, rest, hold: HOLD[i], station: STATIONS[i] })),
  variants: {
    hd: variant(hd, 1280, 720, 30, 480),
    sd: variant(sd, 960, 540, 30, 480),
    portrait: variant(portrait, 720, 1280, 24, 384),
  },
  stills: {
    landscape: { avif: land.avif.map(publish), webp: land.webp.map(publish), end: { avif: publish(land.end.avif), webp: publish(land.end.webp) } },
    portrait: { avif: port.avif.map(publish), webp: port.webp.map(publish), end: { avif: publish(port.end.avif), webp: publish(port.end.webp) } },
  },
  matchVp: [0.5, 0.4],
  matchVpPortrait: [0.5, 0.36],
  endBands: [{ y: 0.16, h: 0.12, x0: -0.1, x1: 0.72 }, { y: 0.47, h: 0.1, x0: 0.25, x1: 1.1 }, { y: 0.78, h: 0.14, x0: -0.1, x1: 0.6 }],
  endBandsPortrait: [{ y: 0.12, h: 0.08, x0: -0.1, x1: 0.8 }, { y: 0.44, h: 0.07, x0: 0.2, x1: 1.1 }, { y: 0.8, h: 0.1, x0: -0.1, x1: 0.7 }],
  synthetic: true,
};
writeFileSync(path.join(root, 'src/film/film-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log('test film published:', manifest.variants.hd.src, manifest.variants.hd.bytes, 'bytes');
