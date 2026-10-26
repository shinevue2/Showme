/**
 * Raster assets (WP-02): responsive derivatives, detail crops, stencil masks, byōbu atlas and mobile panels,
 * gold-leaf ground, washi and paper-tooth tiles. Uses sharp only; every generator is deterministic.
 */
import { createRequire } from 'node:module';
import { existsSync, statSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { rng } from './geom.mjs';

const require = createRequire(import.meta.url);
export const sharp = require('sharp');
sharp.concurrency(2);
sharp.cache({ memory: 64, items: 20 });

export const AVIF = { quality: 50, effort: 5, chromaSubsampling: '4:2:0' };
export const WEBP = { quality: 78, effort: 5, smartSubsample: true };

const fresh = (out, src) => existsSync(out) && (!src || statSync(out).mtimeMs >= statSync(src).mtimeMs);

/** AVIF + WebP at each width (never above the source), sRGB, metadata stripped. */
export async function derivatives({ src, outBase, widths, extract = null, force = false }) {
  const done = [];
  for (const w of widths) {
    for (const [ext, opts] of [['avif', AVIF], ['webp', WEBP]]) {
      const out = `${outBase}.${w}.${ext}`;
      if (!force && fresh(out, src)) { done.push(out); continue; }
      await mkdir(path.dirname(out), { recursive: true });
      let img = sharp(src, { limitInputPixels: 4e8 });
      if (extract) img = img.extract(extract);
      img = img.resize({ width: w, kernel: 'lanczos3' }).toColourspace('srgb');
      if (w <= 128) img = img.sharpen({ sigma: 0.6 });
      await (ext === 'avif' ? img.avif(opts) : img.webp(opts)).toFile(out);
      done.push(out);
    }
  }
  return done;
}

/* ---------------------------------------------------------------- stencil masks (型紙 → 1-bit) */
/** Luminance threshold 0.6 → 1-bit alpha (white where the stencil is cut), despeckled, 1024 px wide. */
export async function stencilMask({ src, box, out, width = 1024 }) {
  // threshold at the master's resolution (thin cuts survive), then area-resample the 1-bit field to `width`
  const { data, info } = await sharp(src).extract(box).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: sw, height: sh, channels } = info;
  const field = Buffer.alloc(sw * sh);
  const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  for (let i = 0; i < sw * sh; i++) {
    const Y = 0.2126 * lin(data[i * channels] / 255) + 0.7152 * lin(data[i * channels + 1] / 255) + 0.0722 * lin(data[i * channels + 2] / 255);
    const Lstar = Y <= 0.008856 ? 903.3 * Y : 116 * Math.cbrt(Y) - 16; // perceptual luminance 0..100
    field[i] = Lstar >= 60 ? 255 : 0;
  }
  const h = Math.round((sh * width) / sw), w = width;
  const small = await sharp(field, { raw: { width: sw, height: sh, channels: 1 } }).resize(w, h, { kernel: 'cubic' }).extractChannel(0).raw().toBuffer();
  let bin = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) bin[i] = small[i] >= 118 ? 1 : 0;
  bin = majority(bin, w, h);
  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) { rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = 255; rgba[i * 4 + 3] = bin[i] ? 255 : 0; }
  await mkdir(path.dirname(out), { recursive: true });
  await sharp(rgba, { raw: { width: w, height: h, channels: 4 } }).png({ palette: true, colours: 2, compressionLevel: 9, effort: 10 }).toFile(out);
  let on = 0; for (const v of bin) on += v;
  return { w, h, coverage: on / (w * h) };
}

function majority(bin, w, h) {
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let s = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = Math.min(w - 1, Math.max(0, x + dx)), yy = Math.min(h - 1, Math.max(0, y + dy));
      s += bin[yy * w + xx];
    }
    out[y * w + x] = s >= 5 ? 1 : 0;
  }
  return out;
}

/* ---------------------------------------------------------------- colour */
function srgbToLab(r, g, b) {
  const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const R = lin(r), G = lin(g), B = lin(b);
  const X = (0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047, Y = 0.2126 * R + 0.7152 * G + 0.0722 * B, Z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883;
  const fn = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = fn(X), fy = fn(Y), fz = fn(Z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/* ---------------------------------------------------------------- byōbu: pigment-alpha panels */
/**
 * Panel crop with the gold ground removed: gold reference = median Lab of gold-hued pixels; alpha = 0 within
 * ΔE (L weighted ½) < threshold, ramping to 1 over 6 units; despeckled (open 1 px) and softened to a 2 px edge.
 */
export async function pigmentPanel({ src, box, threshold, ramp = 6, w, h, erase = [] }) {
  const { data, info } = await sharp(src).extract({ left: box.x, top: box.y, width: box.w, height: box.h })
    .resize(w, h, { kernel: 'lanczos3', fit: 'fill' }).sharpen({ sigma: 0.7 }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const n = info.width * info.height, ch = info.channels;
  const lab = new Float32Array(n * 3);
  const cand = [];
  for (let i = 0; i < n; i++) {
    const [L, a, b] = srgbToLab(data[i * ch], data[i * ch + 1], data[i * ch + 2]);
    lab[i * 3] = L; lab[i * 3 + 1] = a; lab[i * 3 + 2] = b;
    const C = Math.hypot(a, b), hue = (Math.atan2(b, a) * 180) / Math.PI;
    if (C > 14 && hue > 50 && hue < 100 && L > 35 && L < 92) cand.push(i);
  }
  const med = (k) => { const v = cand.map((i) => lab[i * 3 + k]).sort((x, y) => x - y); return v[Math.floor(v.length / 2)] ?? 0; };
  const ref = cand.length > n * 0.05 ? [med(0), med(1), med(2)] : null;
  const alpha = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    if (!ref) { alpha[i] = 1; continue; }
    const dL = (lab[i * 3] - ref[0]) * 0.5, da = lab[i * 3 + 1] - ref[1], db = lab[i * 3 + 2] - ref[2];
    const dE = Math.sqrt(dL * dL + da * da + db * db);
    const t = Math.min(1, Math.max(0, (dE - (threshold - ramp / 2)) / ramp));
    alpha[i] = t * t * (3 - 2 * t);
  }
  // erase rects (master pixels → panel pixels): signatures and seals written on the gold
  for (const e of erase) {
    const sx = info.width / box.w, sy = info.height / box.h;
    const x0 = Math.max(0, Math.floor((e.x - box.x) * sx)), x1 = Math.min(info.width, Math.ceil((e.x + e.w - box.x) * sx));
    const y0 = Math.max(0, Math.floor((e.y - box.y) * sy)), y1 = Math.min(info.height, Math.ceil((e.y + e.h - box.y) * sy));
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) alpha[y * info.width + x] = 0;
  }
  // open (erode then dilate, 1 px) on the hard mask to drop specks of gold-leaf seams and dust
  const W = info.width, H = info.height;
  const hard = new Uint8Array(n);
  for (let i = 0; i < n; i++) hard[i] = alpha[i] > 0.5 ? 1 : 0;
  const morph = (src, op) => {
    const out = new Uint8Array(n);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let v = op === 'min' ? 1 : 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const s = src[Math.min(H - 1, Math.max(0, y + dy)) * W + Math.min(W - 1, Math.max(0, x + dx))];
        v = op === 'min' ? Math.min(v, s) : Math.max(v, s);
      }
      out[y * W + x] = v;
    }
    return out;
  };
  const opened = morph(morph(hard, 'min'), 'max');
  // soft 2 px edge: blur the opened mask, then keep the original ramp inside it
  const soft = Buffer.alloc(n);
  const floor = ramp > 12 ? 0 : 0.6; // ink washes (wide ramp) keep their bokashi; flat pigment gets a crisp edge
  for (let i = 0; i < n; i++) soft[i] = opened[i] || floor === 0 ? Math.round(255 * (floor ? Math.max(alpha[i], floor) : alpha[i])) : 0;
  const blurred = await sharp(soft, { raw: { width: W, height: H, channels: 1 } }).blur(1.0).extractChannel(0).raw().toBuffer();
  const rgba = Buffer.alloc(n * 4);
  let cover = 0;
  for (let i = 0; i < n; i++) {
    rgba[i * 4] = data[i * ch]; rgba[i * 4 + 1] = data[i * ch + 1]; rgba[i * 4 + 2] = data[i * ch + 2];
    rgba[i * 4 + 3] = blurred[i];
    cover += blurred[i] / 255;
  }
  return { rgba, w: W, h: H, ref, coverage: cover / n };
}

/* ---------------------------------------------------------------- gold leaf ground (金箔) */
/**
 * 1280 px tile: 10 × 10 leaves of 128 px (≈ 3寸6分 squares) in staggered rows. Each leaf has its own tone
 * (±3 %) and catches the light from its own angle (a faint linear sheen, ±1.5 %); 箔足 seams are the ~3 px
 * double-thickness overlaps on the right and lower edges (a touch darker, with a bright hairline where the upper
 * leaf ends); every leaf carries a few fine creases from laying (short light/dark line pairs) and the whole
 * sheet a soft mottle. Tileable; no repeating diagonal pattern.
 */
export function goldLeaf(size = 1280, leaves = 10) {
  const L = size / leaves, r = rng(109);
  const base = [225, 164, 65]; // 赤金 ground, --accent-works #E1A441 (sampled from Kōrin's Irises)
  const mottle = tileNoise(size, 41, [[5, 0.5], [10, 0.3], [20, 0.2]]);
  const fine = tileNoise(size, 42, [[80, 0.6], [160, 0.4]]);
  const rowOff = Array.from({ length: leaves }, () => Math.floor(r() * 3) * (L / 3));
  const leaf = Array.from({ length: leaves * leaves }, () => {
    const ang = r() * Math.PI * 2;
    return { tone: 1 + (r() * 2 - 1) * 0.03, sx: Math.cos(ang), sy: Math.sin(ang), sheen: 0.008 + r() * 0.012 };
  });
  // creases: per leaf 2–5 short slightly bent strokes, stored as a shading field (+ light side, − dark side)
  const crease = new Float32Array(size * size);
  for (let row = 0; row < leaves; row++) for (let col = 0; col < leaves; col++) {
    const n = 2 + Math.floor(r() * 4);
    for (let k = 0; k < n; k++) {
      let x = col * L - rowOff[row] + r() * L, y = row * L + r() * L, ang = r() * Math.PI * 2;
      const len = 14 + r() * 46, amp = 0.012 + r() * 0.02, bend = (r() - 0.5) * 0.06;
      for (let s2 = 0; s2 < len; s2 += 0.6) {
        ang += bend;
        x += Math.cos(ang) * 0.6; y += Math.sin(ang) * 0.6;
        const nx = -Math.sin(ang), ny = Math.cos(ang), taper = Math.sin((Math.PI * s2) / len);
        for (const [o, v] of [[0, 1], [1, -0.8]]) {
          const ix = (((Math.round(x + nx * o) % size) + size) % size), iy = (((Math.round(y + ny * o) % size) + size) % size);
          crease[iy * size + ix] = Math.max(-0.05, Math.min(0.05, crease[iy * size + ix] + v * amp * taper * 0.5));
        }
      }
    }
  }
  const buf = Buffer.alloc(size * size * 3);
  for (let y = 0; y < size; y++) {
    const row = Math.floor(y / L), vy = y - row * L;
    for (let x = 0; x < size; x++) {
      const xs = (x + rowOff[row]) % size, col = Math.floor(xs / L), vx = xs - col * L;
      const lf = leaf[row * leaves + col];
      let k = lf.tone * (1 + lf.sheen * (((vx / L) - 0.5) * lf.sx + ((vy / L) - 0.5) * lf.sy) * 2);
      // 箔足: overlap band (double leaf, slightly darker) and the bright cut edge of the upper leaf
      if (vx > L - 3) k *= 0.965; else if (vx < 1) k *= 1.03;
      if (vy > L - 3) k *= 0.965; else if (vy < 1) k *= 1.03;
      k *= 1 + (mottle(x, y) - 0.5) * 0.05 + (fine(x, y) - 0.5) * 0.016 + crease[y * size + x] * 1.6;
      const i = (y * size + x) * 3;
      buf[i] = Math.min(255, base[0] * k); buf[i + 1] = Math.min(255, base[1] * k); buf[i + 2] = Math.min(255, base[2] * (k * 0.98 + 0.02));
    }
  }
  return sharp(buf, { raw: { width: size, height: size, channels: 3 } });
}

/* ---------------------------------------------------------------- washi fibres and paper tooth */
/** Periodic value noise on a torus (tileable), octave sum in [0,1]. */
function tileNoise(size, seed, octaves = [[8, 0.5], [16, 0.3], [32, 0.2]]) {
  const r = rng(seed);
  const grids = octaves.map(([g]) => Array.from({ length: g * g }, () => r()));
  return (x, y) => {
    let v = 0;
    for (let o = 0; o < octaves.length; o++) {
      const [g, wgt] = octaves[o], gx = (x / size) * g, gy = (y / size) * g;
      const x0 = Math.floor(gx), y0 = Math.floor(gy), tx = gx - x0, ty = gy - y0;
      const at = (i, j) => grids[o][(((j % g) + g) % g) * g + (((i % g) + g) % g)];
      const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx, b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx;
      v += (a + (b - a) * sy) * wgt;
    }
    return v;
  };
}

/**
 * Kōzo fibres on a torus (the tile repeats seamlessly): wavy, of varying width, tapering at both ends and
 * splatted with a soft footprint so they read as fibres in the sheet, not hairlines on top of it. Many short
 * fibres, a few long ones. Returns Float32 coverage.
 */
function fibres(size, seed, count, lenRange, width) {
  const r = rng(seed);
  const cov = new Float32Array(size * size);
  const splat = (x, y, rad, v) => {
    const x0 = Math.floor(x - rad - 1), x1 = Math.ceil(x + rad + 1), y0 = Math.floor(y - rad - 1), y1 = Math.ceil(y + rad + 1);
    for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) {
      const d = Math.hypot(xx - x, yy - y);
      const a = Math.max(0, Math.min(1, rad + 0.6 - d)); // anti-aliased disc
      if (!a) continue;
      const i = (((yy % size) + size) % size) * size + (((xx % size) + size) % size);
      cov[i] = Math.max(cov[i], Math.min(1, v * a));
    }
  };
  for (let fi = 0; fi < count; fi++) {
    let x = r() * size, y = r() * size, ang = r() * Math.PI * 2;
    const long = r() < 0.12;
    const len = long ? lenRange[1] * (0.6 + r() * 0.4) : lenRange[0] + r() * (lenRange[1] - lenRange[0]) * 0.45;
    const wgt = 0.35 + r() * 0.65, rad = (0.35 + r() * 0.75) * width;
    const f1 = 0.008 + r() * 0.02, f2 = 0.05 + r() * 0.08, p1 = r() * 9, p2 = r() * 9, a1 = 0.003 + r() * 0.007, a2 = 0.002 + r() * 0.005;
    for (let s = 0; s < len; s += 0.5) {
      ang += a1 * Math.sin(s * f1 + p1) + a2 * Math.sin(s * f2 + p2);
      x += Math.cos(ang) * 0.5; y += Math.sin(ang) * 0.5;
      const taper = Math.pow(Math.sin((Math.PI * s) / len), 0.6);
      splat(x, y, rad * (0.55 + 0.45 * taper), wgt * taper);
    }
  }
  return cov;
}

/**
 * washi-512.avif: transparent sheet for the film's grain overlay — pale kōzo fibres in a cloudy formation
 * (地合い: the fibres gather and thin out) over a faint cool tooth.
 */
export function washiTile(size = 512) {
  const tooth = tileNoise(size, 5, [[32, 0.45], [64, 0.35], [128, 0.2]]);
  const formation = tileNoise(size, 9, [[4, 0.55], [8, 0.3], [16, 0.15]]);
  const fib = fibres(size, 7, 640, [20, 260], 0.85);
  const buf = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = y * size + x, t = tooth(x, y), fm = formation(x, y), fv = fib[i] * (0.55 + 0.9 * fm);
    // light fibres (胡粉 white) where they lie, else a faint cool shadow tooth
    const light = fv > 0.04;
    const a = light ? Math.min(1, fv * 0.26) : Math.max(0, t - 0.55) * 0.16 * (1.2 - fm * 0.4);
    const c = light ? [255, 255, 251] : [15, 37, 64];
    buf[i * 4] = c[0]; buf[i * 4 + 1] = c[1]; buf[i * 4 + 2] = c[2]; buf[i * 4 + 3] = Math.round(a * 255);
  }
  return sharp(buf, { raw: { width: size, height: size, channels: 4 } });
}

/**
 * grain-{day,night}-256.webp: pre-tinted transparent paper tooth (normal blend; the page applies
 * --grain-opacity on top). Only fine structure — no low-frequency clouds, which read as stains at full width;
 * the night tile adds a few pale kōzo fibres (light on lapis is physical, dark hairs on day paper are not).
 */
export function grainTile(tint, size = 256, seed = 3, fibresOn = false) {
  const tooth = tileNoise(size, seed, [[64, 0.55], [128, 0.45]]);
  const fib = fibresOn ? fibres(size, seed + 11, 70, [14, 150], 0.7) : new Float32Array(size * size);
  const r = rng(seed + 5);
  const buf = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = y * size + x;
    const v = 0.22 + (tooth(x, y) - 0.5) * 0.9 + (r() - 0.5) * 0.18 + fib[i] * 0.5;
    buf[i * 4] = tint[0]; buf[i * 4 + 1] = tint[1]; buf[i * 4 + 2] = tint[2]; buf[i * 4 + 3] = Math.round(Math.min(1, Math.max(0, v)) * 255);
  }
  return sharp(buf, { raw: { width: size, height: size, channels: 4 } });
}
