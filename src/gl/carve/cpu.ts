/**
 * CPU carve fallback (DESIGN §13.2 WP-05: "GPU jump-flood SDF + height/normal bake + CPU fallback"). Owner: WP-05.
 * Used when the GPU cannot render to a half-float target (no EXT_color_buffer_(half_)float) or the GPU path throws.
 * Exact Euclidean distance transform (Felzenszwalb & Huttenlocher 2012, two 1-D passes), then the same height
 * profiles as shaders.ts PROFILE_GLSL, normals by central differences. Output rows are bottom-up (DataTexture,
 * flipY false), matching the GPU textures' orientation (texture v = 0 at the bottom of the source canvas).
 */

const INF = 1e20;

/** 1-D squared distance transform of f (length n) into d. */
function edt1(f: Float64Array, n: number, d: Float64Array, v: Int32Array, z: Float64Array): void {
  let k = 0;
  v[0] = 0;
  z[0] = -INF;
  z[1] = INF;
  for (let q = 1; q < n; q++) {
    let s = ((f[q]! + q * q) - (f[v[k]!]! + v[k]! * v[k]!)) / (2 * q - 2 * v[k]!);
    while (s <= z[k]!) {
      k--;
      s = ((f[q]! + q * q) - (f[v[k]!]! + v[k]! * v[k]!)) / (2 * q - 2 * v[k]!);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = INF;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1]! < q) k++;
    const dq = q - v[k]!;
    d[q] = dq * dq + f[v[k]!]!;
  }
}

/** Squared distance from every texel to the nearest texel where `feature` is true. */
function edt2(feature: Uint8Array, w: number, h: number): Float64Array {
  const out = new Float64Array(w * h);
  const n = Math.max(w, h);
  const f = new Float64Array(n), d = new Float64Array(n), z = new Float64Array(n + 1);
  const v = new Int32Array(n);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = feature[y * w + x] ? 0 : INF;
    edt1(f, h, d, v, z);
    for (let y = 0; y < h; y++) out[y * w + x] = d[y]!;
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = out[y * w + x]!;
    edt1(f, w, d, v, z);
    for (let x = 0; x < w; x++) out[y * w + x] = d[x]!;
  }
  return out;
}

const fract = (x: number) => x - Math.floor(x);
function hash(px: number, py: number): number {
  let x = fract(px * 0.1031), y = fract(py * 0.1031), z = fract(px * 0.1031);
  const dd = x * (y + 33.33) + y * (z + 33.33) + z * (x + 33.33);
  x += dd; y += dd; z += dd;
  return fract((x + y) * z);
}
function noise(px: number, py: number): number {
  const ix = Math.floor(px), iy = Math.floor(py);
  const fx = px - ix, fy = py - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), e = hash(ix + 1, iy + 1);
  return (a + (b - a) * ux) * (1 - uy) + (c + (e - c) * ux) * uy;
}
function fbm(px: number, py: number): number {
  let a = 0.5, s = 0;
  for (let i = 0; i < 4; i++) { s += a * noise(px, py); px = px * 2.03 + 17.1; py = py * 2.03 + 17.1; a *= 0.5; }
  return s;
}
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
function stroke(x: number, y: number, colW: number, lenA: number, lenB: number, salt: number): number {
  const tx = x + 9 * (noise(y * 0.004, salt) - 0.5);
  const col = Math.floor(tx / colW);
  const u = fract(tx / colW);
  const segL = lenA + lenB * hash(col, salt + 3);
  const sy = (y + hash(col, salt + 7) * segL) / segL;
  const seg = Math.floor(sy), v = fract(sy);
  const on = hash(col * 1.3, seg + salt) >= 0.18 ? 1 : 0;
  const depth = 0.45 + 0.55 * hash(col * 1.7, seg + salt + 1);
  const w = 0.55 + 0.45 * hash(col, seg + salt + 2);
  const a = Math.min(1, Math.abs(u * 2 - 1) / w);
  const ends = smooth(0, 0.2, v) * (1 - smooth(0.75, 1, v));
  return -depth * (1 - a * a) * ends * on;
}
function gouge(tx: number, ty: number, seed: number): number {
  const g = Math.min(stroke(tx, ty, 27, 120, 160, 1 + seed), stroke(tx + 13, ty, 17, 70, 110, 9 + seed));
  const fibre = fbm(tx * 0.25 + seed, ty * 0.02 + seed) - 0.5;
  return 0.07 * g + 0.014 * fibre;
}

/** Height for signed distance sd (texels, inside < 0) at texel (tx, ty): the profiles of PROFILE_GLSL. */
export function profileHeight(profile: number, sd: number, w: number, tx: number, ty: number, seed: number): number {
  w = Math.max(w, 1);
  if (profile === 0) {
    const G = 0.16;
    if (sd <= 0) return 1;
    if (sd < w) return 1 - (1 - G) * sd / w;
    const ramp = smooth(w, w * 2, sd), far = smooth(w * 2.5, w * 7, sd);
    return Math.min(1, Math.max(0, G + gouge(tx, ty, seed) * ramp - 0.04 * far));
  }
  if (profile === 1) return 1 - smooth(-w, w * 0.5, sd);
  const GS = 0.1, ws = w * 0.5;
  if (sd <= 0) return 1;
  if (sd < ws) return 1 - (1 - GS) * sd / ws;
  const knife = fbm(tx * 0.09 + seed, ty * 0.3 + seed) - 0.5;
  return Math.min(1, Math.max(0, GS + 0.08 * knife * smooth(ws, ws * 2.5, sd)));
}

export interface CpuCarveOut { height: Uint8Array; normal: Uint8Array; mask: Uint8Array }

/**
 * @param rgba   the rasterised source (top-down rows, RGBA8)
 * @param invert seal-incised: the printing surface is the complement of the source
 */
export function carveCpu(rgba: Uint8ClampedArray, w: number, h: number, profile: number, wall: number, relief: number, invert: boolean, seed: number): CpuCarveOut {
  const n = w * h;
  const raised = new Float32Array(n);
  const inside = new Uint8Array(n);
  const outside = new Uint8Array(n);
  const mask = new Uint8Array(n * 4);
  for (let row = 0; row < h; row++) {
    const dst = h - 1 - row;                       // bottom-up output rows
    for (let x = 0; x < w; x++) {
      const si = (row * w + x) * 4;
      const a = rgba[si + 3]! / 255;
      let r = Math.max(rgba[si]!, rgba[si + 1]!, rgba[si + 2]!) / 255 * a;
      if (invert) r = 1 - r;
      const i = dst * w + x;
      raised[i] = r;
      inside[i] = r > 0.5 ? 1 : 0;
      outside[i] = inside[i] ? 0 : 1;
      mask[i * 4] = Math.round(r * 255);
      mask[i * 4 + 1] = Math.round(rgba[si + 1]! * a);
      mask[i * 4 + 2] = Math.round(rgba[si + 2]! * a);
      mask[i * 4 + 3] = 255;
    }
  }
  const dOut = edt2(inside, w, h);    // outside texels: distance to the nearest raised texel
  const dIn = edt2(outside, w, h);    // inside texels: distance to the nearest non-raised texel
  const hf = new Float32Array(n);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const sd = inside[i] ? -Math.sqrt(dIn[i]!) + 0.5 : Math.sqrt(dOut[i]!) - 0.5;
      hf[i] = profileHeight(profile, sd, wall, x + 0.5, y + 0.5, seed);
    }
  }
  const height = new Uint8Array(n * 4);
  const normal = new Uint8Array(n * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const hv = Math.round(hf[i]! * 255);
      height[i * 4] = height[i * 4 + 1] = height[i * 4 + 2] = hv;
      height[i * 4 + 3] = 255;
      const hx = hf[y * w + Math.min(w - 1, x + 1)]! - hf[y * w + Math.max(0, x - 1)]!;
      const hy = hf[Math.min(h - 1, y + 1) * w + x]! - hf[Math.max(0, y - 1) * w + x]!;
      let nx = -hx * 0.5 * relief, ny = -hy * 0.5 * relief, nz = 1;
      const len = Math.hypot(nx, ny, nz);
      nx /= len; ny /= len; nz /= len;
      normal[i * 4] = Math.round((nx * 0.5 + 0.5) * 255);
      normal[i * 4 + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      normal[i * 4 + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      normal[i * 4 + 3] = 255;
    }
  }
  return { height, normal, mask };
}
