/**
 * Seal stone module (DESIGN §6.7, §6.10, §13.2 WP-09 "Seal API", stable for WP-10). Owner: WP-09.
 *
 *   createSealStone(stage, { face: { svgPaths?, text?, font? }, style: 'shubun' | 'hakubun', res })
 *     → { group, press(t), impression(): { texture, quad }, dispose() }
 *
 * Frame: y is up, the paper is the y = 0 plane, the stone stands on it (cross-section aspect × 1, 2.2 tall) with
 * its carved face at y = 0 facing −y. Place / rotate / scale `group` freely; `press(t)` animates an inner pivot
 * only (t 0 → 1: descend from LIFT, contact at 0.45, hold with a seeded 0–1.5° twist, lift from 0.7).
 *
 * - The face: a 印面 drawn from `text` (laid out like a seal engraver would, src/gl/seal/layout.ts) or from
 *   `svgPaths` (+ optional `viewBox`, else the paths' bounding box), carved with src/gl/carve — 朱文 'shubun'
 *   (glyphs and border raised, profile seal-raised) or 白文 'hakubun' (glyphs incised, field raised, profile
 *   seal-incised). For 'hakubun' paths are the incised strokes; when the first path covers the whole face it is
 *   taken as the raised field outline (WP-02 seal-paths.json `minato`: [face, ...glyph] works as is).
 * - `font`: a CSS family list, optionally prefixed by a weight ('900 "Noto Serif SC", serif'). The module
 *   awaits `document.fonts.load()` before drawing; `ready` resolves when the face and impression exist.
 * - The impression: `impression().texture` is an RGBA canvas texture (rgb = seal colour, a = 印泥 coverage: the
 *   printing surface × paste noise × a seeded pressure gradient, 1–2 px bleed), in reading orientation
 *   (v up = −z on the paper). `impression().quad` is a flat mesh for the paper (y = 0.001, facing +y, twisted by
 *   the stamp's jitter). Add it to your scene at the stone's x/z; it stays empty until `press()` passes contact
 *   and then persists. The contact shadow is a child of `group` (option `shadow: false` to draw your own).
 * Extras on the returned object (not part of the frozen API, safe to ignore): `ready`, `jitter`, `aspect`,
 * `impressed`, `light` (world-space key direction / up for the soapstone shading), `setSealColor()`, `canvas`.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { StageAPI } from '../../core/types';
import { carve, type CarveResult } from '../carve';
import { NOISE } from '../chunks/research';
import { NOISE_EXTRA } from '../chunks/noise';
import { SEAL_BORDER, perimeterPoint, sealChips, sealLayout } from './layout';

export interface SealFace { svgPaths?: string[]; text?: string; font?: string; viewBox?: [number, number, number, number] }
export interface SealOptions {
  face: SealFace; style: 'shubun' | 'hakubun'; res: number;
  /** Optional (WP-09 extras): skip the carved face mesh (camera never sees it), skip the child contact shadow, seed. */
  showFace?: boolean; shadow?: boolean; seed?: number;
}
export interface SealStone {
  group: THREE.Group;
  press(t: number): void;
  impression(): { texture: THREE.Texture; quad: THREE.Mesh };
  dispose(): void;
}
export interface SealStoneExt extends SealStone {
  readonly ready: Promise<void>;
  readonly jitter: number;
  readonly aspect: number;
  readonly impressed: boolean;
  readonly light: { dir: THREE.Vector3; up: THREE.Vector3 };
  readonly canvas: HTMLCanvasElement;
  setSealColor(c: THREE.ColorRepresentation): void;
}

export const STONE_H = 2.2;
export const LIFT = 1.2;

/* ------------------------------------------------------------------------------------------------ helpers */

export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const ease = (x: number) => { const t = clamp01(x); return t * t * (3 - 2 * t); };
const sstep = (a: number, b: number, x: number) => ease((x - a) / (b - a));

function splitFont(font: string | undefined): { weight: string; family: string } {
  const f = (font ?? '"Shippori Mincho B1", serif').trim();
  const m = /^(\d{3}|bold|normal)\s+(.*)$/.exec(f);
  return m ? { weight: m[1]!, family: m[2]! } : { weight: '800', family: f };
}

/** Wait for the face's web font (no-op for paths). Never rejects. */
export async function loadSealFont(face: SealFace): Promise<void> {
  if (!face.text || !document.fonts?.load) return;
  const { weight, family } = splitFont(face.font);
  try {
    await Promise.race([document.fonts.load(`${weight} 64px ${family}`, face.text), new Promise((r) => setTimeout(r, 2500))]);
  } catch { /* fall back to whatever the stack resolves to */ }
}

function pathsBox(paths: string[]): [number, number, number, number] {
  try {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden');
    const g = document.createElementNS(NS, 'g');
    for (const d of paths) { const p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); g.appendChild(p); }
    svg.appendChild(g);
    document.body.appendChild(svg);
    const b = g.getBBox();
    svg.remove();
    if (b.width > 0 && b.height > 0) return [b.x, b.y, b.width, b.height];
  } catch { /* ignore */ }
  return [0, 0, 100, 100];
}

/** Aspect (w / h) of the face. */
export function faceAspect(face: SealFace): number {
  if (!face.svgPaths?.length) return 1;
  const vb = face.viewBox ?? pathsBox(face.svgPaths);
  return Math.max(0.4, Math.min(2.5, vb[2] / vb[3]));
}

/**
 * The printing surface (white = takes ink) in reading orientation, `res` px on the long side.
 * Assumes the font is loaded (see loadSealFont).
 */
export function drawPrinting(face: SealFace, style: 'shubun' | 'hakubun', res: number, seed: number): HTMLCanvasElement {
  const aspect = faceAspect(face);
  const W = Math.round(aspect >= 1 ? res : res * aspect), H = Math.round(aspect >= 1 ? res / aspect : res);
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.fillStyle = '#000';
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#fff';
  const chips = sealChips(seed, 9);
  if (face.svgPaths?.length) {
    const vb = face.viewBox ?? pathsBox(face.svgPaths);
    g.save();
    g.scale(W / vb[2], H / vb[3]);
    g.translate(-vb[0], -vb[1]);
    if (style === 'shubun') {
      for (const d of face.svgPaths) g.fill(new Path2D(d), 'nonzero');
    } else {
      const first = face.svgPaths[0]!;
      const fb = face.svgPaths.length > 1 ? pathsBox([first]) : null;
      const isField = !!fb && fb[2] * fb[3] > 0.8 * vb[2] * vb[3];
      if (isField) g.fill(new Path2D(first), 'nonzero'); else g.fillRect(vb[0], vb[1], vb[2], vb[3]);
      g.fillStyle = '#000';
      for (const d of isField ? face.svgPaths.slice(1) : face.svgPaths) g.fill(new Path2D(d), 'nonzero');
    }
    g.restore();
  } else {
    const S = Math.min(W, H);
    const ox = (W - S) / 2, oy = (H - S) / 2;
    if (style === 'shubun') {
      const b = SEAL_BORDER;
      g.fillRect(ox + S * b.inset, oy + S * b.inset, S * (1 - 2 * b.inset), S * (1 - 2 * b.inset));
      g.fillStyle = '#000';
      const i2 = b.inset + b.width;
      g.fillRect(ox + S * i2, oy + S * i2, S * (1 - 2 * i2), S * (1 - 2 * i2));
      g.fillStyle = '#fff';
    } else {
      g.fillRect(ox + S * 0.02, oy + S * 0.02, S * 0.96, S * 0.96);
      g.fillStyle = '#000';
    }
    const { weight, family } = splitFont(face.font);
    for (const bx of sealLayout(face.text ?? '', style)) drawGlyph(g, bx, ox, oy, S, weight, family);
    // 欠け: chips bitten out of the edge (black), an old stone is never a perfect square
    g.fillStyle = '#000';
    const inset = style === 'shubun' ? SEAL_BORDER.inset : 0.02;
    for (const ch of chips) {
      const [px, py] = perimeterPoint(ch.at, inset);
      g.beginPath();
      g.ellipse(ox + px * S, oy + py * S, ch.r * S, ch.r * S * 0.7, ch.at * 9, 0, Math.PI * 2);
      g.fill();
    }
  }
  return c;
}

function drawGlyph(g: CanvasRenderingContext2D, bx: ReturnType<typeof sealLayout>[number], ox: number, oy: number, S: number, weight: string, family: string): void {
  const px = 200;
  g.save();
  g.font = `${weight} ${px}px ${family}`;
  g.textBaseline = 'alphabetic';
  g.textAlign = 'left';
  const m = g.measureText(bx.text);
  const inkW = Math.max(1, m.actualBoundingBoxLeft + m.actualBoundingBoxRight);
  const inkH = Math.max(1, m.actualBoundingBoxAscent + m.actualBoundingBoxDescent);
  const bw = bx.w * S, bh = bx.h * S;
  let sx = bw / inkW, sy = bh / inkH;
  if (bx.latin) { const k = Math.min(sx, sy * 1.25); sy = Math.min(sy, k * 1.35); sx = k; }
  const cx = ox + (bx.x + bx.w / 2) * S, cy = oy + (bx.y + bx.h / 2) * S;
  g.translate(cx, cy);
  g.scale(sx, sy);
  g.fillText(bx.text, -(m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2, (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2);
  g.restore();
}

/* small deterministic value noise for the paste (CPU, once per face) */
function valueNoise(seed: number): (x: number, y: number) => number {
  const h = (x: number, y: number) => {
    let n = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  };
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}

/** 印泥 coverage: printing surface × paste noise × pressure gradient, 1–2 px bleed. rgb = colour, a = coverage. */
export function inkImpression(printing: HTMLCanvasElement, seed: number, colour: string, out?: HTMLCanvasElement): HTMLCanvasElement {
  const W = printing.width, H = printing.height;
  const src = printing.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, W, H).data;
  const c = out ?? document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const img = g.createImageData(W, H);
  const d = img.data;
  const col = new THREE.Color(colour);
  const r8 = Math.round(col.r * 255), g8 = Math.round(col.g * 255), b8 = Math.round(col.b * 255);
  const n1 = valueNoise(seed), n2 = valueNoise(seed + 17), n3 = valueNoise(seed + 41);
  const R = rng(seed);
  const ang = R() * Math.PI * 2, amt = 0.45 + R() * 0.45;
  const dx = Math.cos(ang), dy = Math.sin(ang);
  const S = Math.max(W, H);
  const at = (x: number, y: number) => src[((y < 0 ? 0 : y >= H ? H - 1 : y) * W + (x < 0 ? 0 : x >= W ? W - 1 : x)) * 4]! / 255;
  const fine = S / 90;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const c0 = at(x, y);
      let blur = 0;
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) blur += at(x + i, y + j);
      blur /= 9;
      const cov0 = Math.max(c0, blur * 0.86);
      if (cov0 <= 0.002) { d[(y * W + x) * 4 + 3] = 0; continue; }
      const u = x / S, v = y / S;
      const paste = 0.62 * (n1(u * 4.2, v * 4.2) * 0.65 + n1(u * 9.1 + 3, v * 9.1) * 0.35) + 0.38 * n2(u * 26, v * 26);
      const speck = n3(x / fine * 3.1, y / fine * 3.1);
      const grad = clamp01(0.5 + ((u - 0.5) * dx + (v - 0.5) * dy) * amt * 1.6);
      const thr = 0.2 + 0.3 * grad;
      const k = clamp01((paste - thr) * 4.5 + 0.82) * (speck > 0.9 - 0.08 * grad ? 0.25 : 1);
      const o = (y * W + x) * 4;
      d[o] = r8; d[o + 1] = g8; d[o + 2] = b8;
      d[o + 3] = Math.round(255 * cov0 * k);
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

/* ------------------------------------------------------------------------------------------------ shaders */

/** Soapstone (寿山石): warm translucent wrap lighting, fbm strata and veins, waxed specular. */
export const STONE_VERT = /* glsl */`
varying vec3 vW; varying vec3 vN; varying vec3 vO;
void main(){
  vO = position;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

export const STONE_SHADE = /* glsl */`
${NOISE}
${NOISE_EXTRA}
uniform vec3 uKeyDir, uUp, uBase, uHoney, uVein, uMilk, uInkO, uPaperO;
uniform float uSeed, uNight, uOutline;
float fbm3(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++){ s += a * vnoise3(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; } return s; }
vec3 stoneAlbedo(vec3 o){
  vec3 p = o * vec3(1.7, 0.85, 1.7) + uSeed;
  float warp = fbm3(p * 1.2);
  float strata = sin((o.y * 1.9 + warp * 3.4 + uSeed) * 3.14159);
  float vein = 1.0 - smoothstep(0.0, 0.07, abs(fbm3(p * 2.3 + warp * 1.5) - 0.5));
  float milk = smoothstep(0.5, 0.78, fbm3(p * 0.8 + 4.0));
  vec3 a = mix(uBase, uHoney, 0.5 + 0.35 * strata);
  a = mix(a, uMilk, milk * 0.65);
  a = mix(a, uVein, vein * 0.5);
  a *= 1.0 - 0.22 * step(0.986, hash31(floor(o * 85.0 + uSeed)));
  return a;
}
vec3 stoneLight(vec3 alb, vec3 N, vec3 V){
  vec3 L = normalize(uKeyDir);
  vec3 key = mix(vec3(1.0, 0.97, 0.92) * 1.05, vec3(0.62, 0.72, 1.0) * 0.72, uNight);      // day: daylight; night: moonlight
  vec3 sky = mix(vec3(0.72, 0.78, 0.82), vec3(0.10, 0.16, 0.34), uNight);
  vec3 gnd = mix(vec3(0.62, 0.62, 0.60), vec3(0.08, 0.12, 0.26), uNight);
  float NoL = dot(N, L);
  float wrap = clamp((NoL + 0.42) / 1.42, 0.0, 1.0);
  vec3 H = normalize(L + V);
  float NoV = max(dot(N, V), 0.0);
  float F = 0.04 + 0.96 * pow(1.0 - NoV, 5.0);
  vec3 amb = mix(gnd, sky, 0.5 + 0.5 * dot(N, normalize(uUp)));
  vec3 col = alb * (key * wrap * 0.82 + amb * 0.45);
  col += alb * alb * key * (1.0 - wrap) * 0.32 * smoothstep(-0.7, 0.2, NoL);   // light carried through the stone
  col += key * F * pow(max(dot(N, H), 0.0), 64.0) * 0.9 + F * amb * 0.18;       // waxed polish
  return col;
}`;

export const STONE_FRAG = /* glsl */`
${STONE_SHADE}
uniform vec3 uHalf;
varying vec3 vW; varying vec3 vN; varying vec3 vO;
void main(){
  vec3 N = normalize(vN);
  vec3 V = normalize(cameraPosition - vW);
  if (uOutline > 0.5) {
    vec3 d = uHalf - abs(vO);
    float m2 = max(min(d.x, d.y), min(max(d.x, d.y), d.z));
    float line = 1.0 - smoothstep(0.012, 0.03, m2);
    gl_FragColor = vec4(mix(uPaperO, uInkO, line), 1.0);
    #include <colorspace_fragment>
    return;
  }
  gl_FragColor = vec4(stoneLight(stoneAlbedo(vO), N, V), 1.0);
  #include <colorspace_fragment>
}`;

const FACE_VERT = /* glsl */`
uniform sampler2D tH; uniform float uDepth;
varying vec2 vUv; varying vec3 vW; varying vec3 vO; varying vec3 vT; varying vec3 vB; varying vec3 vN;
void main(){
  vUv = vec2(uv.x, 1.0 - uv.y);
  float h = texture2D(tH, vUv).r;
  vec3 p = position;
  p.z += (h - 1.0) * uDepth;
  vO = vec3(p.x, -p.z - 1.1, p.y);
  vec4 w = modelMatrix * vec4(p, 1.0);
  vW = w.xyz;
  mat3 m = mat3(modelMatrix);
  vT = normalize(m * vec3(1.0, 0.0, 0.0)); vB = normalize(m * vec3(0.0, -1.0, 0.0)); vN = normalize(m * vec3(0.0, 0.0, 1.0));
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const FACE_FRAG = /* glsl */`
${STONE_SHADE}
uniform sampler2D tNrm; uniform sampler2D tMask; uniform vec3 uSeal; uniform float uInked;
varying vec2 vUv; varying vec3 vW; varying vec3 vO; varying vec3 vT; varying vec3 vB; varying vec3 vN;
void main(){
  vec3 tn = texture2D(tNrm, vUv).xyz * 2.0 - 1.0;
  vec3 N = normalize(vT * tn.x + vB * tn.y + vN * tn.z);
  vec3 V = normalize(cameraPosition - vW);
  float m = texture2D(tMask, vUv).r;
  vec3 alb = stoneAlbedo(vO);
  float paste = smoothstep(0.35, 0.6, fbm(vUv * 18.0 + uSeed));
  alb = mix(alb, uSeal * 0.82, m * uInked * (0.55 + 0.4 * paste));
  vec3 col = uOutline > 0.5 ? mix(uPaperO, uInkO, m) : stoneLight(alb, N, V);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

/**
 * Analytic soft shadow of an upright box (footprint half extents `he`, bottom at height `h0`, 2.2 tall) cast by a
 * directional light with per-height ground offset `k` (= −L.xz / L.y). Returns 0..1 darkness.
 */
export const SEAL_SHADOW_GLSL = /* glsl */`
float sealBox(vec2 p, vec2 c, vec2 he, float blur){
  vec2 d = abs(p - c) - he;
  float sd = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
  return 1.0 - smoothstep(-blur, blur, sd);
}
float sealShadow(vec2 p, vec2 c, vec2 he, float h0, vec2 k){
  float sh = 0.0;
  for (int j = 0; j < 6; j++){
    float z = h0 + 2.2 * float(j) / 5.0;
    sh = max(sh, sealBox(p, c + k * z, he, 0.035 + 0.11 * z) * (0.95 - 0.07 * z));
  }
  float ao = sealBox(p, c, he + 0.035, 0.06) * (1.0 - smoothstep(0.0, 0.2, h0));
  return max(sh * (0.26 - 0.05 * min(h0, 2.0)), ao * 0.45);
}`;

const SHADOW_VERT = /* glsl */`
varying vec2 vP;
void main(){ vP = vec2(position.x, -position.y); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const SHADOW_FRAG = /* glsl */`
${SEAL_SHADOW_GLSL}
uniform vec3 uKeyDir, uShade; uniform float uLift, uAspect, uOutline;
varying vec2 vP;
void main(){
  if (uOutline > 0.5) discard;
  vec3 L = normalize(uKeyDir);
  vec2 k = -L.xz / max(L.y, 0.2);
  float a = sealShadow(vP, vec2(0.0), vec2(uAspect, 1.0) * 0.5, uLift, k);
  gl_FragColor = vec4(uShade, 1.0);
  #include <colorspace_fragment>
  gl_FragColor = vec4(gl_FragColor.rgb * a, a);
}`;

const QUAD_VERT = /* glsl */`
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const QUAD_FRAG = /* glsl */`
uniform sampler2D tImp; uniform vec3 uColor; uniform float uCover;
varying vec2 vUv;
void main(){
  float a = texture2D(tImp, vUv).a * uCover;
  if (a < 0.003) discard;
  gl_FragColor = vec4(uColor, 1.0);
  #include <colorspace_fragment>
  gl_FragColor = vec4(gl_FragColor.rgb * a, a);
}`;

function cssToken(name: string, fallback: string): string {
  try { return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback; } catch { return fallback; }
}

export function stoneUniforms(stage: StageAPI, seed: number, light: { dir: THREE.Vector3; up: THREE.Vector3 }): Record<string, THREE.IUniform> {
  const c = (hex: string) => new THREE.Color(hex);
  return {
    uKeyDir: { value: light.dir }, uUp: { value: light.up },
    uBase: { value: c('#E6D3A8') }, uHoney: { value: c('#D5AE76') }, uVein: { value: c('#A8673F') }, uMilk: { value: c('#F4EDDC') },
    uInkO: { value: c(cssToken('--ink', '#0F2540')) }, uPaperO: { value: c(cssToken('--paper', '#F7FCFE')) },
    uSeed: { value: (seed % 1000) / 37 },
    uNight: stage.g.uNight, uOutline: stage.g.uOutline,
  };
}

/* ------------------------------------------------------------------------------------------------ the stone */

export function createSealStone(stage: StageAPI, o: SealOptions): SealStoneExt {
  const seed = o.seed ?? hashStr((o.face.text ?? '') + (o.face.svgPaths?.join('') ?? '') + o.style);
  const R = rng(seed);
  const jitter = (R() * 2 - 1) * (1.5 * Math.PI / 180);
  const aspect = faceAspect(o.face);
  const res = Math.max(64, Math.min(1024, Math.round(o.res || 256)));
  const showFace = o.showFace !== false;
  const light = { dir: new THREE.Vector3(-0.38, 0.86, 0.34).normalize(), up: new THREE.Vector3(0, 1, 0) };

  const group = new THREE.Group();
  group.name = 'seal-stone';
  const inner = new THREE.Group();
  group.add(inner);

  // the body: when the face is shown, it starts just above the deepest cut so the recesses stay visible
  const depth = 0.035;
  const bodyH = showFace ? STONE_H - depth : STONE_H;
  const bodyGeo = new RoundedBoxGeometry(aspect, bodyH, 1, 3, 0.06);
  const bodyMat = new THREE.ShaderMaterial({
    name: 'seal-stone',
    vertexShader: STONE_VERT,
    fragmentShader: STONE_FRAG,
    uniforms: { ...stoneUniforms(stage, seed, light), uHalf: { value: new THREE.Vector3(aspect / 2, bodyH / 2, 0.5) } },
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.name = 'seal-body';
  body.position.y = STONE_H - bodyH / 2;
  inner.add(body);

  // the face (carved once the font and the carve are ready)
  let faceMesh: THREE.Mesh | null = null;
  let faceMat: THREE.ShaderMaterial | null = null;
  let carved: CarveResult | null = null;
  const blank = new THREE.DataTexture(new Uint8Array([255, 128, 128, 255]), 1, 1);
  blank.needsUpdate = true;
  const sealHex = cssToken('--seal', '#CB1B45');
  if (showFace) {
    const seg = res >= 512 ? 256 : res >= 384 ? 128 : 64;
    faceMat = new THREE.ShaderMaterial({
      name: 'seal-face',
      vertexShader: FACE_VERT,
      fragmentShader: FACE_FRAG,
      uniforms: {
        ...stoneUniforms(stage, seed, light),
        tH: { value: blank }, tNrm: { value: blank }, tMask: { value: blank },
        uDepth: { value: depth }, uSeal: { value: new THREE.Color(sealHex) }, uInked: { value: 0 },
      },
    });
    faceMesh = new THREE.Mesh(new THREE.PlaneGeometry(aspect, 1, seg, seg), faceMat);
    faceMesh.name = 'seal-face';
    faceMesh.rotation.x = Math.PI / 2;
    faceMesh.visible = false;
    inner.add(faceMesh);
  }

  // contact shadow (child of the outer group: it stays on the paper while the pivot lifts)
  let shadowMat: THREE.ShaderMaterial | null = null;
  let shadow: THREE.Mesh | null = null;
  if (o.shadow !== false) {
    shadowMat = new THREE.ShaderMaterial({
      name: 'seal-shadow', vertexShader: SHADOW_VERT, fragmentShader: SHADOW_FRAG,
      transparent: true, premultipliedAlpha: true, depthWrite: false,
      uniforms: { uKeyDir: { value: light.dir }, uShade: { value: new THREE.Color(cssToken('--ink', '#0F2540')) }, uLift: { value: LIFT }, uAspect: { value: aspect }, uOutline: stage.g.uOutline },
    });
    shadow = new THREE.Mesh(new THREE.PlaneGeometry(aspect + 3.2, 4.2), shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.002;
    shadow.renderOrder = -1;
    group.add(shadow);
  }

  // the impression
  const impCanvas = document.createElement('canvas');
  impCanvas.width = impCanvas.height = 4;
  const texture = new THREE.CanvasTexture(impCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  const quadMat = new THREE.ShaderMaterial({
    name: 'seal-impression', vertexShader: QUAD_VERT, fragmentShader: QUAD_FRAG,
    transparent: true, premultipliedAlpha: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
    uniforms: { tImp: { value: texture }, uColor: { value: new THREE.Color(sealHex) }, uCover: { value: 0 } },
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(aspect, 1), quadMat);
  quad.name = 'seal-impression';
  quad.rotation.set(-Math.PI / 2, 0, jitter);
  quad.position.y = 0.001;

  let impressed = false;
  let disposed = false;
  let printing: HTMLCanvasElement = impCanvas;

  const ready = (async () => {
    await loadSealFont(o.face);
    if (disposed) return;
    printing = drawPrinting(o.face, o.style, Math.min(res, 320), seed);
    inkImpression(printing, seed, sealHex, impCanvas);
    texture.needsUpdate = true;
    if (faceMat && faceMesh) {
      // white = raised (seal-raised) / white = cut away (seal-incised)
      const src = o.style === 'shubun' ? drawPrinting(o.face, o.style, res, seed) : invert(drawPrinting(o.face, o.style, res, seed));
      try {
        carved = await carve(stage.renderer, { source: src, res, profile: o.style === 'shubun' ? 'seal-raised' : 'seal-incised', depthPx: Math.max(2, res / 96) });
        if (disposed) { carved.dispose(); carved = null; return; }
        faceMat.uniforms.tH!.value = carved.height;
        faceMat.uniforms.tNrm!.value = carved.normal;
        faceMat.uniforms.tMask!.value = carved.mask;
        faceMesh.visible = true;
      } catch (e) { console.warn('[seal] carve failed; flat face', e); }
    }
    stage.requestFrame();
  })();

  const api: SealStoneExt = {
    group,
    ready,
    jitter,
    aspect,
    light,
    get impressed() { return impressed; },
    get canvas() { return impCanvas; },
    press(t: number) {
      const k = clamp01(t);
      const down = k < 0.45 ? ease(k / 0.45) : k < 0.7 ? 1 : 1 - ease((k - 0.7) / 0.3);
      inner.position.y = (1 - down) * LIFT;
      inner.rotation.y = jitter * sstep(0.05, 0.4, k) * (1 - sstep(0.8, 1, k));
      if (k >= 0.45 && !impressed) {
        impressed = true;
        quadMat.uniforms.uCover!.value = 1;
        if (faceMat) faceMat.uniforms.uInked!.value = 1;
      }
      if (shadowMat) shadowMat.uniforms.uLift!.value = inner.position.y;
    },
    impression: () => ({ texture, quad }),
    setSealColor(c) {
      (quadMat.uniforms.uColor!.value as THREE.Color).set(c);
      if (faceMat) (faceMat.uniforms.uSeal!.value as THREE.Color).set(c);
    },
    dispose() {
      disposed = true;
      bodyGeo.dispose(); bodyMat.dispose();
      faceMesh?.geometry.dispose(); faceMat?.dispose();
      shadow?.geometry.dispose(); shadowMat?.dispose();
      quad.geometry.dispose(); quadMat.dispose();
      texture.dispose(); blank.dispose();
      carved?.dispose(); carved = null;
    },
  };
  return api;
}

function invert(c: HTMLCanvasElement): HTMLCanvasElement {
  const g = c.getContext('2d')!;
  g.globalCompositeOperation = 'difference';
  g.fillStyle = '#fff';
  g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = 'source-over';
  return c;
}
