// Film acceptance checks (DESIGN §13.2 WP-03; owner WP-03).
//   node tools/film/verify.mjs [--determinism]      (--determinism needs the browser lock: it re-captures frames)
// 1. manifest shape (FilmManifest), files exist, bytes match, budgets (HD ≤ 5 MB, SD ≤ 2.5 MB, portrait ≤ 3 MB,
//    stills ≤ 80 KB);
// 2. GOP: keyframes never more than 8 frames apart, plus the seven rest frames round(t × fps) (ffprobe);
// 3. stills: build/film/ch-N.png equals the frame decoded at the rest index (frame-exact select), AVIF/WebP PSNR;
// 4. end bands: gold pixels of the last decoded frame vs the endBands shapes (spear ends, end-bands.json;
//    outline within 1 % of the frame);
// 5. determinism (optional): frames 0, 207, 414 captured twice → identical PNG hashes;
// 6. content (optional, --content, browser lock): at every rest frame of both variants the traveller is visible
//    (rendered with and without him, ≈ 6 % of the frame tall) and the frame holds no colour of a later plate
//    (exact palette matches on the lossless capture: ch 1 indigo only … ch 7 seven plates, gold only in the outro).
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FF = path.join(ROOT, 'tools/bin/ffmpeg');
const FFPROBE = path.join(ROOT, 'tools/bin/ffprobe');
const TMP = path.join(ROOT, 'build/film/verify');
mkdirSync(TMP, { recursive: true });
const m = JSON.parse(readFileSync(path.join(ROOT, 'src/film/film-manifest.json'), 'utf8'));
const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`); };
const pub = (rel) => path.join(ROOT, 'public', rel);
const sha = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 16);

// 1. manifest
const REST = [0, 2.2, 4.6, 6.9, 9.2, 11.5, 13.8];
ok('manifest version/duration/chapters', m.version === 1 && m.duration === 16 && m.chapters.length === 7 &&
  m.chapters.every((c, i) => c.n === i + 1 && c.rest === REST[i] && typeof c.hold === 'number' && typeof c.station === 'string'));
const budget = { hd: 5e6, sd: 2.5e6, portrait: 3e6 };
for (const k of ['hd', 'sd', 'portrait']) {
  const v = m.variants[k];
  const f = pub(v.src);
  const exists = existsSync(f);
  const bytes = exists ? statSync(f).size : 0;
  ok(`variant ${k} file + bytes + budget`, exists && bytes === v.bytes && bytes <= budget[k], `${(bytes / 1e6).toFixed(2)} MB ≤ ${budget[k] / 1e6} MB`);
}
let stillMax = 0, stillsOk = true;
for (const o of ['landscape', 'portrait']) {
  const s = m.stills[o];
  const list = [...s.avif, ...s.webp, s.end.avif, s.end.webp];
  if (s.avif.length !== 7 || s.webp.length !== 7) stillsOk = false;
  for (const rel of list) {
    if (!existsSync(pub(rel))) { stillsOk = false; continue; }
    stillMax = Math.max(stillMax, statSync(pub(rel)).size);
  }
}
ok('stills present, ≤ 80 KB each', stillsOk && stillMax <= 80_000, `largest ${(stillMax / 1000).toFixed(1)} KB`);
const bandOk = (l) => Array.isArray(l) && l.length >= 3 && l.every((b) => ['y', 'h', 'x0', 'x1'].every((k) => typeof b[k] === 'number') && b.h > 0 && b.x1 > b.x0);
ok('matchVp / endBands shape', m.matchVp.length === 2 && m.matchVpPortrait.length === 2 && m.matchVp.every((x) => x >= 0 && x <= 1) && bandOk(m.endBands) && bandOk(m.endBandsPortrait),
  `matchVp ${m.matchVp}, matchVpPortrait ${m.matchVpPortrait}, ${m.endBands.length} + ${m.endBandsPortrait.length} tiers`);

// 2. GOP
for (const k of ['hd', 'sd', 'portrait']) {
  const v = m.variants[k];
  const out = execFileSync(FFPROBE, ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'packet=pts_time,flags', '-of', 'csv=p=0', pub(v.src)], { encoding: 'utf8' });
  const pk = out.trim().split('\n').map((l) => { const [t, f] = l.split(','); return { t: Number(t), k: f.includes('K') }; }).sort((a, b) => a.t - b.t);
  const bad = [];
  const kl = pk.map((p, i) => (p.k ? i : -1)).filter((i) => i >= 0);
  let maxGap = 0;
  for (let i = 1; i < kl.length; i++) { maxGap = Math.max(maxGap, kl[i] - kl[i - 1]); if (kl[i] - kl[i - 1] > 8) bad.push(`gap ${kl[i - 1]}→${kl[i]}`); }
  maxGap = Math.max(maxGap, pk.length - kl[kl.length - 1]);
  if (pk.length - kl[kl.length - 1] > 8) bad.push('tail');
  const restIdx = REST.map((t) => Math.round(t * v.fps));
  for (const i of restIdx) if (!pk[i]?.k) bad.push(`rest ${i}`);
  const restKeys = restIdx.filter((i) => pk[i]?.k).length;
  ok(`GOP ${k}: keyframes ≤ 8 frames apart + 7 rest keyframes`, pk.length === v.frames && bad.length === 0,
    `${pk.length} frames, ${kl.length} keyframes, max gap ${maxGap}, rest frames ${restIdx.join(' ')} keyframes ${restKeys}/7${bad.length ? ', faults ' + bad.slice(0, 6).join(' ') : ''}`);
}

// 3. stills = decoded rest frames
async function rgbOf(file) { return sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true }); }
function psnr(a, b) { let se = 0; for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; se += d * d; } const mse = se / a.length; return mse === 0 ? 99 : 10 * Math.log10(255 * 255 / mse); }
for (const [o, k, suf] of [['landscape', 'hd', ''], ['portrait', 'portrait', '-p']]) {
  const v = m.variants[k];
  let exact = 0; let minAvif = 99, minWebp = 99;
  for (let i = 0; i < 7; i++) {
    const n = Math.round(REST[i] * v.fps);
    const dec = path.join(TMP, `dec-${o}-${i + 1}.png`);
    execFileSync(FF, ['-y', '-loglevel', 'error', '-i', pub(v.src), '-vf', `select=eq(n\\,${n}),scale=in_color_matrix=bt709:in_range=tv`, '-frames:v', '1', '-update', '1', dec]);
    const png = path.join(ROOT, 'build/film', `ch-${i + 1}${suf}.png`);
    const A = await rgbOf(dec), B = await rgbOf(png);
    if (A.data.equals(B.data)) exact++;
    const av = await rgbOf(pub(m.stills[o].avif[i])), wb = await rgbOf(pub(m.stills[o].webp[i]));
    minAvif = Math.min(minAvif, psnr(A.data, av.data)); minWebp = Math.min(minWebp, psnr(A.data, wb.data));
  }
  ok(`stills ${o}: PNG = decoded rest frame (7/7), AVIF/WebP close`, exact === 7 && minAvif > 30 && minWebp > 30,
    `${exact}/7 exact, min PSNR AVIF ${minAvif.toFixed(1)} dB, WebP ${minWebp.toFixed(1)} dB`);
}

// 4. end bands in the last decoded frame: rasterise the contract shapes (spear ends: at distance d from the
//    nearer end, s = sin(π/2 · min(1, d / L))^power with L = min(taper·h·H, length / 2); the tip at y + apex·h)
//    — the same edge function as src/film/scene/end-band-path.ts — and compare with the gold pixels; every
//    mismatching pixel must lie within 1 % of the frame height of the expected outline
const endSpec = JSON.parse(readFileSync(path.join(ROOT, 'src/film/scene/end-bands.json'), 'utf8'));
const GOLD = [1, 3, 5].map((i) => parseInt(endSpec.color.slice(i, i + 2), 16));
// gold vs paper (247,252,254): the blue channel splits them in half
const BLUE_SPLIT = (GOLD[2] + 254) / 2;
for (const [k, bands] of [['hd', m.endBands], ['sd', m.endBands], ['portrait', m.endBandsPortrait]]) {
  const v = m.variants[k];
  const last = path.join(TMP, `last-${k}.png`);
  execFileSync(FF, ['-y', '-loglevel', 'error', '-i', pub(v.src), '-vf', `select=eq(n\\,${v.frames - 1}),scale=in_color_matrix=bt709:in_range=tv`, '-frames:v', '1', '-update', '1', last]);
  const { data, info } = await rgbOf(last);
  const W = info.width, H = info.height;
  const exp = new Uint8Array(W * H), got = new Uint8Array(W * H);
  for (const b of bands) {
    const x0 = b.x0 * W, x1 = b.x1 * W, hp = b.h * H;
    const L = Math.max(1e-6, Math.min(endSpec.taper * hp, (x1 - x0) / 2));
    const ya = b.y * H + endSpec.apex * hp;
    for (let x = Math.max(0, Math.floor(x0)); x < Math.min(W, Math.ceil(x1)); x++) {
      const X = x + 0.5;
      const d = Math.min(X - x0, x1 - X);
      if (d < 0) continue;
      const s = Math.sin((Math.PI / 2) * Math.min(1, d / L)) ** endSpec.power;
      const top = ya - endSpec.apex * hp * s, bot = ya + (1 - endSpec.apex) * hp * s;
      for (let y = Math.max(0, Math.floor(top)); y < Math.min(H, Math.ceil(bot)); y++) {
        const Y = y + 0.5;
        if (Y >= top && Y <= bot) exp[y * W + x] = 1;
      }
    }
  }
  let goldPx = 0;
  for (let i = 0; i < W * H; i++) { got[i] = data[i * 3 + 2] < BLUE_SPLIT && data[i * 3] > 200 ? 1 : 0; goldPx += got[i]; }
  const R = Math.ceil(0.01 * H), RS = R + 6;
  let xor = 0, worst = 0, far = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (exp[i] === got[i]) continue;
    xor++;
    // distance to the nearest pixel of the opposite expected state (= the expected outline)
    let d = Infinity;
    for (let dy = -RS; dy <= RS; dy++) {
      const yy = y + dy; if (yy < 0 || yy >= H) continue;
      for (let dx = -RS; dx <= RS; dx++) {
        const xx = x + dx; if (xx < 0 || xx >= W) continue;
        if (exp[yy * W + xx] !== exp[i]) d = Math.min(d, Math.hypot(dx, dy));
      }
    }
    worst = Math.max(worst, d);
    if (d > R) far++;
  }
  const area = exp.reduce((s, x) => s + x, 0);
  // the film's paper is --paper (#F7FCFE) within ±2 after 4:2:0 encoding (a patch of the last frame's top right)
  let pd = 0;
  for (let y = Math.round(H * 0.02); y < Math.round(H * 0.06); y++) for (let x = Math.round(W * 0.9); x < Math.round(W * 0.97); x++) {
    const i = (y * W + x) * 3;
    pd = Math.max(pd, Math.abs(data[i] - 247), Math.abs(data[i + 1] - 252), Math.abs(data[i + 2] - 254));
  }
  ok(`paper ${k}: last frame paper = #F7FCFE ±2`, pd <= 2, `max channel deviation ${pd}`);
  ok(`endBands ${k}: last frame = contract shapes within 1 %`, far === 0 && area > 0 && Math.abs(goldPx - area) / area < 0.02,
    `${bands.length} tiers, gold ${goldPx} px vs ${area} px expected, ${xor} px differ (${(100 * xor / (W * H)).toFixed(3)} % of frame), worst ${(100 * worst / H).toFixed(2)} % of frame height`);
}

// 5. determinism
if (process.argv.includes('--determinism')) {
  const hashes = [];
  for (const run of [1, 2]) {
    const dir = path.join(TMP, `det-${run}`);
    const r = spawnSync('node', [path.join(ROOT, 'tools/film/capture.mjs'), '--variant', 'landscape', '--frames', '0,207,414', '--png-dir', dir], { stdio: ['ignore', 'pipe', 'inherit'], cwd: ROOT });
    if (r.status !== 0) { ok('determinism', false, 'capture failed'); break; }
    hashes.push(readdirSync(dir).sort().map((f) => sha(readFileSync(path.join(dir, f)))));
  }
  if (hashes.length === 2) ok('determinism: frames 0, 207, 414 re-captured identically', hashes[0].join() === hashes[1].join(), hashes[0].join(' '));
}
// 6. content
if (process.argv.includes('--content')) {
  const PLATES = ['#0F2540', '#5DAC81', '#91989F', '#F4A7B9', '#A5DEE4', '#205C81', '#656765', '#FFB11B'];
  const PAPER = [247, 252, 254];
  const hx = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  // colour → plate index (1-based) for every tint the plates use (100 / 75 / 50 / 25 % over paper)
  const owner = new Map();
  PLATES.forEach((h, pi) => {
    const c = hx(h);
    for (const t of [0, 0.25, 0.5, 0.75]) {
      const key = c.map((v, i) => Math.round(v * (1 - t) + PAPER[i] * t)).join(',');
      if (!owner.has(key)) owner.set(key, pi + 1);
    }
  });
  const capture = (variant, frames, dir, extra = []) => {
    const r = spawnSync('node', [path.join(ROOT, 'tools/film/capture.mjs'), '--variant', variant, '--frames', frames.join(','), '--png-dir', dir, '--scale', '0.5', ...extra], { stdio: ['ignore', 'pipe', 'inherit'], cwd: ROOT });
    if (r.status !== 0) throw new Error(`capture ${variant} failed`);
  };
  for (const [variant, rest, last] of [['landscape', [0, 66, 138, 207, 276, 345, 414], 479], ['portrait', [0, 53, 110, 166, 221, 276, 331], 383]]) {
    const dA = path.join(TMP, `content-${variant}`), dB = path.join(TMP, `content-${variant}-nt`);
    capture(variant, [...rest, last], dA);
    capture(variant, rest, dB, ['--hide', 'traveller']);
    const trav = [], late = [];
    let platesOk = true, travOk = true;
    for (let i = 0; i <= rest.length; i++) {
      const f = i < rest.length ? rest[i] : last;
      const name = `${variant}-${String(f).padStart(3, '0')}.png`;
      const A = await rgbOf(path.join(dA, name));
      const { width: W, height: H } = A.info;
      // plates present: exact palette matches; anything owned by a plate > k is a fault (k = 8 at the last frame)
      const k = i < rest.length ? i + 1 : 8;
      const count = new Array(9).fill(0);
      for (let p = 0; p < W * H; p++) {
        const o = owner.get(`${A.data[p * 3]},${A.data[p * 3 + 1]},${A.data[p * 3 + 2]}`);
        if (o) count[o]++;
      }
      const bad = count.reduce((s, n, pi) => s + (pi > k ? n : 0), 0);
      const used = count.map((n, pi) => (n > W * H * 0.0005 ? pi : 0)).filter(Boolean);
      late.push(`${i < rest.length ? 'ch' + (i + 1) : 'end'}: plates ${used.join('')}${bad ? ` (${bad} px of later plates)` : ''}`);
      if (bad > W * H * 0.0002) platesOk = false;
      if (i === rest.length) { if (!count[8]) platesOk = false; continue; }
      if (count[8]) platesOk = false;
      const B = await rgbOf(path.join(dB, name));
      let n = 0, y0 = H, y1 = -1;
      for (let p = 0; p < W * H; p++) {
        const d = Math.abs(A.data[p * 3] - B.data[p * 3]) + Math.abs(A.data[p * 3 + 1] - B.data[p * 3 + 1]) + Math.abs(A.data[p * 3 + 2] - B.data[p * 3 + 2]);
        if (d > 24) { n++; const y = Math.floor(p / W); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      }
      const hFrac = y1 >= y0 ? (y1 - y0 + 1) / H : 0;
      trav.push(`ch${i + 1} ${(hFrac * 100).toFixed(1)}%`);
      if (n < 40 || hFrac < 0.03 || hFrac > 0.12) travOk = false;
    }
    ok(`traveller visible at every rest frame (${variant})`, travOk, trav.join(', '));
    ok(`plate accumulation (${variant}): no later plate before its chapter, gold only at the end`, platesOk, late.join('; '));
  }
}

const failed = results.filter((r) => !r.pass).length;
console.log(failed ? `${failed} check(s) failed` : 'all checks passed');
process.exit(failed ? 1 : 0);
