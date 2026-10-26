// Film publish (DESIGN §7.3 step 6, §7.4; owner WP-03).
// Hashes every encode and still in build/film/ (sha256 → 8-hex suffix), copies them into public/film/
// (removing superseded files), verifies the GOP (keyframes ≤ 8 frames apart, plus the seven rest frames) and the
// byte budgets, and writes src/film/film-manifest.json (FilmManifest, src/core/types.ts).
//   node tools/film/publish.mjs
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BUILD = path.join(ROOT, 'build/film');
const PUB = path.join(ROOT, 'public/film');
const FFPROBE = path.join(ROOT, 'tools/bin/ffprobe');
const REST = [0, 2.2, 4.6, 6.9, 9.2, 11.5, 13.8];
const HOLD = [0.3, 0.4, 0.4, 0.4, 0.4, 0.4, 0.55];
const STATIONS = ['nihonbashi', 'hakone', 'mishima', 'hara', 'shimada', 'okazaki', 'shono'];
const BUDGET = { hd: 5_000_000, sd: 2_500_000, portrait: 3_000_000, still: 80_000 };

const fail = [];
mkdirSync(PUB, { recursive: true });
const published = new Set();
function publish(file) {
  const src = path.join(BUILD, file);
  if (!existsSync(src)) throw new Error(`missing ${src} — run tools/film/encode.sh first`);
  const buf = readFileSync(src);
  const h = createHash('sha256').update(buf).digest('hex').slice(0, 8);
  const ext = path.extname(file);
  const name = `${path.basename(file, ext)}.${h}${ext}`;
  copyFileSync(src, path.join(PUB, name));
  published.add(name);
  return { rel: `film/${name}`, bytes: buf.length };
}

function probe(file, fps, frames) {
  const out = execFileSync(FFPROBE, ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'packet=pts_time,flags', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  const pk = out.trim().split('\n').map((l) => { const [t, f] = l.split(','); return { t: Number(t), k: f.includes('K') }; }).sort((a, b) => a.t - b.t);
  const keys = new Set(pk.map((p, i) => (p.k ? i : -1)).filter((i) => i >= 0));
  if (pk.length !== frames) fail.push(`${path.basename(file)}: ${pk.length} frames, expected ${frames}`);
  // GOP: never more than 8 frames between keyframes (-g 8; a forced IDR restarts the cadence, scene cuts add more)
  const kl = [...keys].sort((a, b) => a - b);
  for (let i = 1; i < kl.length; i++) if (kl[i] - kl[i - 1] > 8) fail.push(`${path.basename(file)}: keyframe gap ${kl[i - 1]} → ${kl[i]}`);
  if (frames - 1 - kl[kl.length - 1] >= 8) fail.push(`${path.basename(file)}: no keyframe in the last 8 frames`);
  // every chapter rest frame (round(t × fps)) is a forced IDR
  for (const t of REST) {
    const i = Math.round(t * fps);
    if (!keys.has(i)) fail.push(`${path.basename(file)}: rest ${t}s (frame ${i}) is not a keyframe`);
  }
  return { packets: pk.length, keyframes: keys.size };
}

const variants = {};
for (const [key, file, w, h, fps, frames] of [['hd', 'film-hd.mp4', 1280, 720, 30, 480], ['sd', 'film-sd.mp4', 960, 540, 30, 480], ['portrait', 'film-portrait.mp4', 720, 1280, 24, 384]]) {
  const p = publish(file);
  const pr = probe(path.join(BUILD, file), fps, frames);
  if (p.bytes > BUDGET[key]) fail.push(`${file}: ${p.bytes} B over budget ${BUDGET[key]}`);
  variants[key] = { src: p.rel, w, h, fps, frames, bytes: p.bytes };
  console.log(`${file.padEnd(18)} ${(p.bytes / 1e6).toFixed(2)} MB  ${pr.packets} frames, ${pr.keyframes} keyframes`);
}

const stills = { landscape: { avif: [], webp: [] }, portrait: { avif: [], webp: [] } };
for (const [orient, suf] of [['landscape', ''], ['portrait', '-p']]) {
  for (let i = 1; i <= 7; i++) {
    for (const ext of ['avif', 'webp']) {
      const p = publish(`ch-${i}${suf}.${ext}`);
      if (p.bytes > BUDGET.still) fail.push(`ch-${i}${suf}.${ext}: ${p.bytes} B over ${BUDGET.still}`);
      stills[orient][ext].push(p.rel);
    }
  }
  stills[orient].end = { avif: publish(`end${suf}.avif`).rel, webp: publish(`end${suf}.webp`).rel };
}

// match-cut vanishing point: the Nihonbashi diorama's vp in the chapter-1 rest frame (normalised, y down)
const plates = JSON.parse(readFileSync(path.join(ROOT, 'assets-src/film/plates/plates.json'), 'utf8'));
function vpIn(pose, aspect) {
  const st = plates.stations.nihonbashi;
  const [u, v] = st.vp;
  const fw = pose.w;                                    // canvas widths
  const fh = (pose.w * st.canvas[0] / st.canvas[1]) / aspect;   // canvas heights
  const x = (u - (pose.cx - fw / 2)) / fw, y = (v - (pose.cy - fh / 2)) / fh;
  return [Number(x.toFixed(4)), Number(y.toFixed(4))];
}
const ends = JSON.parse(readFileSync(path.join(ROOT, 'src/film/scene/end-bands.json'), 'utf8'));
const manifest = {
  version: 1,
  duration: 16.0,
  chapters: STATIONS.map((station, i) => ({ n: i + 1, rest: REST[i], hold: HOLD[i], station })),
  variants,
  stills,
  matchVp: vpIn(plates.stations.nihonbashi.rest, 16 / 9),
  matchVpPortrait: vpIn(plates.stations.nihonbashi.restPortrait, 9 / 16),
  endBands: ends.landscape,
  endBandsPortrait: ends.portrait,
};
writeFileSync(path.join(ROOT, 'src/film/film-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

// drop superseded film files
for (const f of readdirSync(PUB)) {
  if (!published.has(f) && /^(film-(hd|sd|portrait)|ch-\d(-p)?|end(-p)?)\.[0-9a-f]{8}\.(mp4|avif|webp)$/.test(f)) unlinkSync(path.join(PUB, f));
}
const total = [...published].reduce((s, f) => s + statSync(path.join(PUB, f)).size, 0);
console.log(`published ${published.size} files (${(total / 1e6).toFixed(2)} MB) → public/film/, manifest → src/film/film-manifest.json`);
console.log(`matchVp ${manifest.matchVp}  matchVpPortrait ${manifest.matchVpPortrait}`);
if (fail.length) { console.error('FAILED:\n  ' + fail.join('\n  ')); process.exit(1); }
console.log('GOP and budgets: OK');
