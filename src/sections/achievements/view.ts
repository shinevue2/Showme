/**
 * View `achievements-press` (DESIGN §6.7). Owner: WP-09.
 *
 * The paper is the z = 0 plane seen straight on, so it maps 1 : 1 onto the placeholder (1 world unit = one seal's
 * width in px); everything is placed from the DOM it sits under (seal slots, chart SVGs, the karazuri list), so the
 * DOM text and the 3D always register.
 *  - Four 寿山石 seal stones (src/gl/seal): each rests above its slot, and with scroll (stagger 0.12) lifts, travels,
 *    descends, presses (contact at 0.45, seeded twist) and goes back. The impression stays: carve-free 印泥 decals
 *    (printing surface × paste noise × pressure gradient) and the stones' soft shadows are one "desk" draw.
 *  - 砂子: instanced leaf flakes on closed-form paths (no simulation): rise from below the edge (grey → gold),
 *    wait at the sieve line, flutter down; flakes landing outside the glue (rasterised from the same chart
 *    geometry as the DOM SVG) slide off the bottom edge. Fully reversible: a function of scroll only.
 *  - 空摺: the reliability figures embossed with carve('emboss') into a paper strip under a raking light (pointer
 *    on fine pointers, scroll on coarse, or the light-angle range; elevation 35° → 8°). "Ink it" inks the relief.
 * Draw calls: desk 1 + strip 1 + stones 4 + flakes 1. Frames only while light / ink settle (scroll drives the rest).
 */
import * as THREE from 'three';
import type { AppContext, Lang, StageAPI, Tier, View, ViewFactory, ViewFrame } from '../../core/types';
import { createSealStone, LIFT, SEAL_SHADOW_GLSL, type SealStoneExt } from '../../gl/seal';
import { carve, type CarveResult } from '../../gl/carve';
import { NOISE } from '../../gl/chunks/research';
import { PAPER } from '../../gl/chunks/paper';
import { LINE_W, PLOT, VB, chartGeom } from './charts';
import { pressState } from './state';

const FOV = 34;
const TAN = Math.tan((FOV / 2) * Math.PI / 180);
const MAX_FLAKES = 24000;
const SEAL_FONT: Record<Lang, string> = { ja: '800 "Shippori Mincho B1", serif', zh: '900 "Noto Serif SC", serif', en: '400 "Gloock", serif' };
const KEY = new THREE.Vector3(-0.25, 0.3, 0.92).normalize();
const EL_HI = 35 * Math.PI / 180, EL_LO = 8 * Math.PI / 180;

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const ease = (x: number) => { const t = clamp01(x); return t * t * (3 - 2 * t); };
const sstep = (a: number, b: number, x: number) => ease((x - a) / (b - a));
function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

/** One press gesture, g 0 → 1: lift at rest, travel, descend (contact 0.45), hold, lift, travel back, set down. */
function gesture(g: number): { lat: number; h: number } {
  if (g <= 0 || g >= 1) return { lat: 0, h: 0 };
  const arc = (k: number) => LIFT + 0.22 * Math.sin(Math.PI * k);
  if (g < 0.15) return { lat: 0, h: LIFT * ease(g / 0.15) };
  if (g < 0.32) { const k = ease((g - 0.15) / 0.17); return { lat: k, h: arc(k) }; }
  if (g < 0.45) return { lat: 1, h: LIFT * (1 - ease((g - 0.32) / 0.13)) };
  if (g < 0.62) return { lat: 1, h: 0 };
  if (g < 0.75) return { lat: 1, h: LIFT * ease((g - 0.62) / 0.13) };
  if (g < 0.9) { const k = ease((g - 0.75) / 0.15); return { lat: 1 - k, h: arc(k) }; }
  return { lat: 0, h: LIFT * (1 - ease((g - 0.9) / 0.1)) };
}

/* ------------------------------------------------------------------------------------------------ shaders */

const PLANE_VERT = /* glsl */`
varying vec2 vUv; varying vec2 vP;
void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vP = w.xy; gl_Position = projectionMatrix * viewMatrix * w; }`;

/** Desk: the stones' soft shadows + the four impressions (one draw). Premultiplied output over the DOM paper. */
const DESK_FRAG = /* glsl */`
${SEAL_SHADOW_GLSL}
uniform vec4 uStone[4];          // x, y, bottom height, aspect
uniform vec4 uImp[4];            // x, y, twist, cover
uniform sampler2D tImp0; uniform sampler2D tImp1; uniform sampler2D tImp2; uniform sampler2D tImp3;
uniform vec3 uKeyDir, uSeal, uShade, uInk; uniform float uOutline;
varying vec2 vP;
float impAt(sampler2D t, vec4 s){
  vec2 d = vP - s.xy; float c = cos(s.z), si = sin(s.z);
  vec2 uv = vec2(c * d.x + si * d.y, -si * d.x + c * d.y) + 0.5;
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return 0.0;
  return texture2D(t, uv).a * s.w;
}
void main(){
  vec2 k = -uKeyDir.xy / max(uKeyDir.z, 0.2);
  float lit = 1.0;
  for (int i = 0; i < 4; i++) lit *= 1.0 - sealShadow(vP, uStone[i].xy, vec2(uStone[i].w, 1.0) * 0.5, uStone[i].z, k);
  float s = 1.0 - lit;
  float ink = max(max(impAt(tImp0, uImp[0]), impAt(tImp1, uImp[1])), max(impAt(tImp2, uImp[2]), impAt(tImp3, uImp[3])));
  if (uOutline > 0.5) { s = 0.0; ink = step(0.5, ink) * (1.0 - step(0.5, ink * 0.92)); }
  float a = 1.0 - (1.0 - ink) * (1.0 - s);
  if (a < 0.002) discard;
  vec3 pre = mix(uSeal, uInk, uOutline) * ink * (1.0 - s) + uShade * s;
  gl_FragColor = vec4(pre / a, 1.0);
  #include <colorspace_fragment>
  gl_FragColor = vec4(gl_FragColor.rgb * a, a);
}`;

/** Karazuri: emboss height (carve 'emboss'), raking light, cast shadow, paper fibres, "Ink it". Opaque paper. */
const KZ_FRAG = /* glsl */`
${NOISE}
${PAPER}
uniform sampler2D tH; uniform vec2 uTexel; uniform float uRelief, uInk, uAspect, uSeed, uOutline, uNight;
uniform vec3 uL, uPaper, uInkCol;
varying vec2 vUv;
float H(vec2 uv){ return texture2D(tH, uv).r; }
void main(){
  float h0 = H(vUv);
  float hx = H(vUv + vec2(uTexel.x, 0.0)) - H(vUv - vec2(uTexel.x, 0.0));
  float hy = H(vUv + vec2(0.0, uTexel.y)) - H(vUv - vec2(0.0, uTexel.y));
  vec2 q = vUv * vec2(uAspect, 1.0) * 3.0 + uSeed;
  vec2 fib = vec2(fbm(q * 46.0) - fbm(q * 46.0 + vec2(0.37, 0.0)), fbm(q * 46.0) - fbm(q * 46.0 + vec2(0.0, 0.37))) * 0.06;
  vec3 n = normalize(vec3(-hx * uRelief * 0.5 + fib.x, -hy * uRelief * 0.5 + fib.y, 1.0));
  vec3 L = normalize(uL);
  float lam = max(dot(n, L), 0.0) / max(L.z, 0.05);
  // cast shadow: march the heightfield towards the light
  vec2 dir = normalize(L.xy + 1e-5) * uTexel;
  float tanEl = L.z / max(length(L.xy), 1e-3);
  float occ = 0.0;
  for (int i = 1; i <= 8; i++){
    float t = float(i) * 1.6;
    occ = max(occ, (H(vUv + dir * t) - h0) * uRelief - t * tanEl);
  }
  float shade = lam * (1.0 - 0.4 * smoothstep(0.0, 0.6, occ));
  shade = 1.0 + (shade - 1.0) * mix(0.9, 2.1, uNight);           // moonlit lapis paper: relief needs more swing
  vec3 col = paperTone(uPaper, vUv * vec2(uAspect, 1.0) * 0.6) * max(shade, 0.25);
  col += vec3(0.05, 0.08, 0.13) * uNight * max(shade - 1.0, 0.0);
  float m = smoothstep(0.42, 0.72, h0);
  float soak = clamp(uInk * 1.7 - fbm(vUv * vec2(uAspect, 1.0) * 30.0 + uSeed) * 0.7, 0.0, 1.0);
  col = mix(col, uInkCol * mix(1.0, shade, 0.5), m * soak * 0.97);
  if (uOutline > 0.5) col = mix(uPaper, uInkCol, smoothstep(0.25, 0.4, h0) * (1.0 - smoothstep(0.55, 0.7, h0)));
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

const FLAKE_VERT = /* glsl */`
attribute vec2 aLand; attribute vec2 aStart; attribute vec4 aRnd; attribute vec3 aAxis;
uniform float uSift, uSiftY, uBottomY, uSize;
varying vec3 vN; varying float vA; varying float vGold; varying vec2 vQ; varying float vSeed;
mat3 rot(vec3 a, float t){
  float c = cos(t), s = sin(t), k = 1.0 - c;
  return mat3(c + a.x * a.x * k, a.y * a.x * k + a.z * s, a.z * a.x * k - a.y * s,
              a.x * a.y * k - a.z * s, c + a.y * a.y * k, a.z * a.y * k + a.x * s,
              a.x * a.z * k + a.y * s, a.y * a.z * k - a.x * s, c + a.z * a.z * k);
}
void main(){
  float d = aRnd.x, inside = aRnd.w;
  float lift = smoothstep(0.0 + d * 0.06, 0.29 + d * 0.06, uSift);
  float fall = clamp((uSift - (0.36 + d * 0.24)) / 0.25, 0.0, 1.0);
  float settle = smoothstep(0.86 + d * 0.04, 0.995, uSift);
  vec2 top = vec2(aLand.x + (aAxis.x * 0.6), uSiftY + aAxis.y * 0.18);
  vec2 p = mix(aStart, top, lift);
  p.x += sin(lift * 3.14159) * aAxis.z * 0.8;
  float fe = fall * 0.75 + fall * fall * (3.0 - 2.0 * fall) * 0.25;
  if (fall > 0.0) p = vec2(mix(top.x, aLand.x, fe) + sin(fall * 11.0 + d * 40.0) * 0.16 * (1.0 - fall), mix(top.y, aLand.y, fe));
  float out_ = 1.0 - inside;
  p.y = mix(p.y, uBottomY - d * 0.6, out_ * settle * settle);
  float landed = smoothstep(0.86, 1.0, fall);
  float ang = (lift * 1.5 + fall * 5.0) * aRnd.y * 6.2831 * (1.0 - landed) + landed * (0.12 + 0.3 * aRnd.y) * (inside > 0.5 ? 1.0 : 2.2);
  mat3 R = rot(normalize(aAxis), ang);
  vec3 off = R * vec3(position.xy * aRnd.z * uSize, 0.0);
  vN = R * vec3(0.0, 0.0, 1.0);
  vA = (lift > 0.001 ? 1.0 : 0.0) * (1.0 - out_ * settle);
  vGold = lift;
  vQ = position.xy;
  vSeed = d * 97.0 + aRnd.y * 13.0;
  vec4 w = modelMatrix * vec4(p + off.xy, 0.03 + off.z + (1.0 - fall) * 0.05, 1.0);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const FLAKE_FRAG = /* glsl */`
uniform vec3 uKeyDir, uGravel, uLamp; uniform float uLampOn, uNight, uOutline;
varying vec3 vN; varying float vA; varying float vGold; varying vec2 vQ; varying float vSeed;
void main(){
  if (vA < 0.01 || uOutline > 0.5) discard;
  float h = fract(sin(vSeed) * 43758.5453);
  vec2 cut = vec2(cos(h * 6.2831), sin(h * 6.2831));
  if (dot(vQ, cut) > 0.18 + 0.22 * fract(h * 7.31)) discard;
  vec3 n = normalize(gl_FrontFacing ? vN : -vN);
  vec3 V = vec3(0.0, 0.0, 1.0);
  vec3 L = normalize(mix(uKeyDir, uLamp, uLampOn * 0.6));
  float NoL = max(dot(n, L), 0.0);
  float sp = pow(max(dot(reflect(-L, n), V), 0.0), 26.0);
  vec3 F0 = vec3(1.0, 0.766, 0.336);
  vec3 key = mix(vec3(1.0, 0.97, 0.92), vec3(1.12, 0.9, 0.62), uNight);     // night: the gold reads warmer
  vec3 gold = F0 * key * (0.17 + 0.5 * NoL) * (0.8 + 0.4 * fract(h * 3.7)) + F0 * key * sp * 1.6;
  vec3 col = mix(uGravel * (0.62 + 0.38 * NoL), gold, vGold);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
  gl_FragColor = vec4(gl_FragColor.rgb * vA, vA);
}`;

/* ------------------------------------------------------------------------------------------------ layout */

interface Rect { x: number; y: number; w: number; h: number }
interface Lay {
  w: number; h: number; U: number; docTop: number;
  seals: { S: [number, number]; R: [number, number] }[];
  sealRowTop: number;
  desk: Rect;
  charts: { id: string; r: Rect }[];
  union: Rect;
  kz: Rect;
  values: { text: string; x: number; y: number; fs: number }[];
}

function tokenColor(el: Element, name: string, fallback: string): THREE.Color {
  const raw = getComputedStyle(el).getPropertyValue(name).trim() || fallback;
  const c = new THREE.Color();
  try { c.setStyle(raw); } catch { c.setStyle(fallback); }
  return c;
}

class PressView implements View {
  readonly id = 'achievements-press';
  readonly printName = '砂子・空摺';
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(FOV, 1.6, 0.5, 200);
  vram = 0;
  private stage: StageAPI | null = null;
  private tier: Tier | null = null;
  private lay: Lay | null = null;
  private root = new THREE.Group();
  private deskGroup = new THREE.Group();
  private stones: SealStoneExt[] = [];
  private cover = [0, 0, 0, 0];
  private deskMat: THREE.ShaderMaterial | null = null;
  private desk: THREE.Mesh | null = null;
  private kzMat: THREE.ShaderMaterial | null = null;
  private kz: THREE.Mesh | null = null;
  private kzCarve: CarveResult | null = null;
  private kzKey = '';
  private kzTimer = 0;
  private flakeGeo: THREE.InstancedBufferGeometry | null = null;
  private flakeMat: THREE.ShaderMaterial | null = null;
  private flakes: THREE.Mesh | null = null;
  private ro: ResizeObserver | null = null;
  private layTimer = 0;
  private offs: (() => void)[] = [];
  private seed: number;
  private poster: boolean;
  private coarse: boolean;
  private az = 2.4;
  private el_ = EL_HI;
  private inkV = 0;
  private ready = new Set<string>();
  private blank: THREE.DataTexture;

  constructor(readonly el: HTMLElement, private ctx: AppContext) {
    this.seed = ctx.print.seed >>> 0;
    this.poster = document.documentElement.dataset.poster === this.id;
    this.coarse = matchMedia('(pointer: coarse)').matches;
    this.blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1);
    this.blank.needsUpdate = true;
    this.root.add(this.deskGroup);
    this.deskGroup.rotation.x = Math.PI / 2;      // the seal module's y-up frame stands on our z = 0 paper
    this.scene.add(this.root);
  }

  private flag(token: string, on: boolean): void {
    if (on) this.ready.add(token); else this.ready.delete(token);
    this.el.dataset.ready = [...this.ready].join(' ');
  }

  async init(stage: StageAPI): Promise<void> {
    this.stage = stage;
    this.tier = stage.tier;
    const g = stage.g;
    // desk (shadows + impressions)
    this.deskMat = new THREE.ShaderMaterial({
      name: 'ach-desk', vertexShader: PLANE_VERT, fragmentShader: DESK_FRAG,
      transparent: true, premultipliedAlpha: true, depthWrite: false,
      uniforms: {
        uStone: { value: [0, 1, 2, 3].map(() => new THREE.Vector4(0, -999, 0, 1)) },
        uImp: { value: [0, 1, 2, 3].map(() => new THREE.Vector4(0, -999, 0, 0)) },
        tImp0: { value: this.blank }, tImp1: { value: this.blank }, tImp2: { value: this.blank }, tImp3: { value: this.blank },
        uKeyDir: { value: KEY }, uSeal: { value: new THREE.Color() }, uShade: { value: new THREE.Color() }, uInk: { value: new THREE.Color() },
        uOutline: g.uOutline,
      },
    });
    this.desk = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.deskMat);
    this.desk.renderOrder = 0;
    this.desk.frustumCulled = false;
    this.root.add(this.desk);
    // karazuri strip
    this.kzMat = new THREE.ShaderMaterial({
      name: 'ach-karazuri', vertexShader: PLANE_VERT, fragmentShader: KZ_FRAG, depthWrite: false,
      uniforms: {
        tH: { value: this.blank }, uTexel: { value: new THREE.Vector2(1 / 1024, 1 / 256) }, uRelief: { value: 1 }, uInk: { value: 0 },
        uAspect: { value: 4 }, uSeed: { value: (this.seed % 991) / 97 }, uL: { value: new THREE.Vector3(0, 0, 1) },
        uPaper: { value: new THREE.Color() }, uInkCol: { value: new THREE.Color() }, uOutline: g.uOutline, uNight: g.uNight,
      },
    });
    this.kz = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.kzMat);
    this.kz.renderOrder = 1;
    this.kz.visible = false;
    this.root.add(this.kz);
    // flakes
    this.flakeMat = new THREE.ShaderMaterial({
      name: 'ach-sunago', vertexShader: FLAKE_VERT, fragmentShader: FLAKE_FRAG,
      transparent: true, premultipliedAlpha: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: {
        uSift: { value: 0 }, uSiftY: { value: 0 }, uBottomY: { value: -10 }, uSize: { value: 0.03 },
        uKeyDir: { value: KEY }, uGravel: { value: new THREE.Color('#BDC0BA') }, uLamp: { value: new THREE.Vector3(0, 0, 1) }, uLampOn: { value: 0 },
        uNight: g.uNight, uOutline: g.uOutline,
      },
    });
    // seal stones (faces never face this camera: impressions only, no carve)
    const L = this.ctx.lang;
    const figs = [...this.el.parentElement!.querySelectorAll<HTMLElement>('.seal')];
    const sealRes = Math.max(256, Math.min(320, stage.tier.counts.sealRes || 256));
    this.stones = figs.slice(0, 4).map((f, i) => {
      const st = createSealStone(stage, {
        face: { text: f.dataset.face ?? '', font: SEAL_FONT[L] },
        style: f.dataset.style === 'shubun' ? 'shubun' : 'hakubun',
        res: sealRes, showFace: false, shadow: false, seed: (this.seed ^ (0x9E3779B1 * (i + 1))) >>> 0,
      });
      st.light.dir.copy(KEY);
      st.light.up.set(0, 0, 1);
      st.group.traverse((o) => { o.renderOrder = 2; });
      this.deskGroup.add(st.group);
      st.press(0.6);                 // the pivot sits on the paper with its twist; this view moves the group
      return st;
    });
    const u = this.deskMat.uniforms;
    this.stones.forEach((st, i) => { u[`tImp${i}`]!.value = st.impression().texture; });
    void Promise.all(this.stones.map((s) => s.ready)).then(() => { this.flag('seals', true); stage.requestFrame(); });

    this.readColors();
    this.offs.push(this.ctx.theme.on(() => { this.readColors(); stage.requestFrame(); }));
    this.offs.push(this.ctx.motion.on(() => stage.requestFrame()));
    this.ro = new ResizeObserver(() => this.scheduleLayout());
    this.ro.observe(this.el);
    void document.fonts?.ready.then(() => this.scheduleLayout());
    this.layout();
  }

  async allocate(stage: StageAPI): Promise<void> {
    if (!this.lay) this.layout();
    this.tier = this.tier ?? stage.tier;
    await this.carveStrip();
  }

  private readColors(): void {
    if (!this.deskMat || !this.kzMat) return;
    const night = this.ctx.theme.current === 'night';
    const d = this.deskMat.uniforms;
    (d.uSeal!.value as THREE.Color).copy(tokenColor(this.el, '--seal', '#CB1B45'));
    (d.uInk!.value as THREE.Color).copy(tokenColor(this.el, '--ink', '#0F2540'));
    (d.uShade!.value as THREE.Color).set(night ? '#071a3d' : '#1d2c3e');
    const k = this.kzMat.uniforms;
    (k.uPaper!.value as THREE.Color).copy(tokenColor(this.el, '--paper-print', '#FFFFFB'));
    (k.uInkCol!.value as THREE.Color).copy(tokenColor(this.el, '--plate-1', '#0F2540'));
  }

  private scheduleLayout(): void {
    clearTimeout(this.layTimer);
    this.layTimer = window.setTimeout(() => { this.layout(); this.stage?.requestFrame(); }, 120);
  }

  /** Measure the DOM the 3D sits under (px relative to the placeholder) and place everything. */
  private layout(): void {
    const el = this.el, host = el.parentElement;
    if (!host) return;
    const r0 = el.getBoundingClientRect();
    if (r0.width < 10 || r0.height < 10) return;
    const rel = (e: Element): Rect => { const r = e.getBoundingClientRect(); return { x: r.left - r0.left, y: r.top - r0.top, w: r.width, h: r.height }; };
    const seals = [...host.querySelectorAll('.seal')].slice(0, 4).map((f) => {
      const s = rel(f.querySelector('.seal__imp')!), r = rel(f.querySelector('.seal__rest')!);
      return { s, r };
    });
    if (seals.length < 4) return;
    const U = seals[0]!.s.w || 100;
    const block = rel(host.querySelector('.seals')!);
    const charts = [...host.querySelectorAll<HTMLElement>('.sunago')].map((f) => ({ id: f.dataset.chart ?? '', r: rel(f.querySelector('svg')!) }));
    const ux0 = Math.min(...charts.map((c) => c.r.x)), uy0 = Math.min(...charts.map((c) => c.r.y));
    const ux1 = Math.max(...charts.map((c) => c.r.x + c.r.w)), uy1 = Math.max(...charts.map((c) => c.r.y + c.r.h));
    const kzEl = host.querySelector('.kz')!;
    const kz = rel(kzEl);
    const values = [...kzEl.querySelectorAll<HTMLElement>('.kz__v')].map((v) => {
      const r = rel(v);
      return { text: v.textContent ?? '', x: r.x - kz.x, y: r.y - kz.y, fs: parseFloat(getComputedStyle(v).fontSize) || 36 };
    });
    this.lay = {
      w: r0.width, h: r0.height, U, docTop: r0.top + scrollY,
      seals: seals.map(({ s, r }) => ({ S: [s.x + s.w / 2, s.y + s.h / 2], R: [r.x + r.w / 2, r.y + r.h / 2] })),
      sealRowTop: Math.min(...seals.map((x) => x.r.y)),
      desk: { x: block.x - U * 0.6, y: block.y - U * 0.6, w: block.w + U * 3.2, h: block.h + U * 2.6 },
      charts, union: { x: ux0, y: uy0, w: ux1 - ux0, h: uy1 - uy0 },
      kz, values,
    };
    this.place();
    this.buildFlakes();
    clearTimeout(this.kzTimer);
    this.kzTimer = window.setTimeout(() => void this.carveStrip().then(() => this.stage?.requestFrame()), 200);
  }

  private wx(px: number): number { const l = this.lay!; return (px - l.w / 2) / l.U; }
  private wy(py: number): number { const l = this.lay!; return (l.h / 2 - py) / l.U; }

  private place(): void {
    const l = this.lay!;
    const D = (l.h / 2 / l.U) / TAN;
    this.camera.position.set(0, 0, D);
    this.camera.near = Math.max(0.5, D - 12);
    this.camera.far = D + 4;
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
    const setRect = (m: THREE.Mesh, r: Rect, z: number) => {
      m.position.set(this.wx(r.x + r.w / 2), this.wy(r.y + r.h / 2), z);
      m.scale.set(r.w / l.U, r.h / l.U, 1);
    };
    if (this.desk) setRect(this.desk, l.desk, 0);
    if (this.kz) setRect(this.kz, l.kz, 0.001);
  }

  private buildFlakes(): void {
    const l = this.lay!;
    // glue canvas with the union's aspect (long side 1024), drawn in px through one isotropic scale
    const ar = l.union.w / Math.max(1, l.union.h);
    const W = ar >= 1 ? 1024 : Math.max(64, Math.round(1024 * ar)), H = ar >= 1 ? Math.max(64, Math.round(1024 / ar)) : 1024;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d', { willReadFrequently: true })!;
    const sx = W / l.union.w, sy = H / l.union.h;
    g.fillStyle = '#fff'; g.strokeStyle = '#fff';
    g.lineJoin = 'round'; g.lineCap = 'round';
    const chartsById = new Map(this.ctx.content.charts.map((ch) => [ch.id as string, ch]));
    for (const cr of l.charts) {
      const ch = chartsById.get(cr.id);
      if (!ch) continue;
      const k = cr.r.w / VB.w;
      const X = (vx: number) => (cr.r.x - l.union.x + vx * k) * sx;
      const Y = (vy: number) => (cr.r.y - l.union.y + vy * k) * sy;
      const geo = chartGeom(ch);
      if (geo.kind === 'bars') for (const b of geo.bars) g.fillRect(X(b.x), Y(b.y), b.w * k * sx, (PLOT.y1 - b.y) * k * sy);
      else {
        g.lineWidth = LINE_W * k * Math.min(sx, sy);
        g.beginPath();
        geo.points.forEach((p, i) => (i ? g.lineTo(X(p.x), Y(p.y)) : g.moveTo(X(p.x), Y(p.y))));
        g.stroke();
      }
    }
    const glue = g.getImageData(0, 0, W, H).data;
    const R = rng(this.seed ^ 0x51ED);
    const edge = (x: number, y: number) => (Math.imul(x * 73856093 ^ y * 19349663, 83492791) >>> 0) / 4294967296;
    const inGlue = (px: number, py: number) => {
      const gx = Math.floor((px - l.union.x) * sx), gy = Math.floor((py - l.union.y) * sy);
      if (gx < 0 || gy < 0 || gx >= W || gy >= H) return false;
      const a = glue[(gy * W + gx) * 4]! / 255;
      return a > 0.5 + (edge(gx >> 1, gy >> 1) - 0.5) * 0.5;
    };
    const N = MAX_FLAKES;
    const land = new Float32Array(N * 2), start = new Float32Array(N * 2), rnd = new Float32Array(N * 4), axis = new Float32Array(N * 3);
    const u = l.union;
    for (let i = 0; i < N; i++) {
      const inside = R() < 0.75;
      let x = 0, y = 0;
      for (let t = 0; t < 80; t++) {
        x = u.x + R() * u.w; y = u.y + R() * u.h;
        if (inGlue(x, y) === inside) break;
      }
      land[i * 2] = this.wx(x); land[i * 2 + 1] = this.wy(y);
      start[i * 2] = this.wx(x + (R() - 0.5) * 220); start[i * 2 + 1] = this.wy(l.h + 30 + R() * 320);
      rnd[i * 4] = R(); rnd[i * 4 + 1] = 0.5 + R() * 1.5; rnd[i * 4 + 2] = 0.55 + R() * 0.95; rnd[i * 4 + 3] = inside ? 1 : 0;
      const ax = R() * 2 - 1, ay = R() * 2 - 1, az = R() * 2 - 1;
      axis[i * 3] = ax; axis[i * 3 + 1] = ay; axis[i * 3 + 2] = az;
    }
    if (!this.flakeGeo) {
      const base = new THREE.PlaneGeometry(1, 1);
      this.flakeGeo = new THREE.InstancedBufferGeometry();
      this.flakeGeo.index = base.index;
      this.flakeGeo.setAttribute('position', base.getAttribute('position'));
      this.flakes = new THREE.Mesh(this.flakeGeo, this.flakeMat!);
      this.flakes.frustumCulled = false;
      this.flakes.renderOrder = 3;
      this.root.add(this.flakes);
    }
    const geo = this.flakeGeo;
    geo.setAttribute('aLand', new THREE.InstancedBufferAttribute(land, 2));
    geo.setAttribute('aStart', new THREE.InstancedBufferAttribute(start, 2));
    geo.setAttribute('aRnd', new THREE.InstancedBufferAttribute(rnd, 4));
    geo.setAttribute('aAxis', new THREE.InstancedBufferAttribute(axis, 3));
    const count = Math.min(N, (this.tier ?? this.stage!.tier).counts.sunago);
    geo.instanceCount = count;
    const fu = this.flakeMat!.uniforms;
    fu.uSiftY!.value = this.wy(u.y - 30);
    fu.uBottomY!.value = this.wy(l.h + 40);
    fu.uSize!.value = Math.max(2.2, l.U * 0.032) / l.U;
    this.vram = N * 11 * 4 + (this.kzCarve ? this.kzVram : 0) + 4 * 320 * 320 * 4;
    this.flag('sift', count > 0);      // software tier: no dust, the hatched DOM bars stay
  }

  private kzVram = 0;

  /** Rasterise the five figures where the DOM sets them and emboss them (carve 'emboss'). */
  private async carveStrip(): Promise<void> {
    const l = this.lay, stage = this.stage;
    if (!l || !stage || !this.kzMat || !this.kz) return;
    const res = (this.tier ?? stage.tier).counts.embossRes;
    if (!res) { this.kz.visible = false; this.flag('kz', false); return; }
    const key = `${res}:${Math.round(l.kz.w)}x${Math.round(l.kz.h)}:${l.values.map((v) => `${v.x | 0},${v.y | 0},${v.fs | 0}`).join(';')}`;
    if (key === this.kzKey && this.kzCarve) return;
    try { await document.fonts?.load('400 40px "Gloock"', '0123456789.% min'); } catch { /* ignore */ }
    const scale = res / Math.max(l.kz.w, l.kz.h);
    const c = document.createElement('canvas');
    c.width = Math.max(16, Math.round(l.kz.w * scale)); c.height = Math.max(16, Math.round(l.kz.h * scale));
    const g = c.getContext('2d')!;
    g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#fff';
    g.textBaseline = 'alphabetic';
    let wall = 3;
    for (const v of l.values) {
      const fs = v.fs * scale;
      g.font = `400 ${fs}px Gloock, Georgia, serif`;
      const m = g.measureText(v.text);
      const A = m.fontBoundingBoxAscent ?? fs * 0.8, Dd = m.fontBoundingBoxDescent ?? fs * 0.2;
      const base = v.y * scale + (fs - (A + Dd)) / 2 + A;      // line-height 1: the content box is centred
      g.fillText(v.text, v.x * scale, base);
      wall = Math.max(2, Math.round(fs * 0.075));
    }
    const out = await carve(stage.renderer, { source: c, res, profile: 'emboss', depthPx: wall });
    this.kzCarve?.dispose();
    this.kzCarve = out;
    this.kzKey = key;
    const ud = out.height.userData as { width: number; height: number };
    const u = this.kzMat.uniforms;
    u.tH!.value = out.height;
    (u.uTexel!.value as THREE.Vector2).set(1 / ud.width, 1 / ud.height);
    u.uRelief!.value = wall * 0.05;
    u.uAspect!.value = l.kz.w / l.kz.h;
    this.kzVram = ud.width * ud.height * 4 * 3;
    this.kz.visible = true;
    this.flag('kz', true);
  }

  update(dt: number, _t: number, f: ViewFrame): boolean {
    const l = this.lay;
    if (!l || !this.deskMat || !this.flakeMat || !this.kzMat) return false;
    const vh = innerHeight;
    const top = l.docTop - scrollY;
    const motion = this.ctx.motion.enabled && !this.poster;
    let more = false;

    // seals: P over the row's approach; each stone's gesture staggered by 0.12
    const rowTop = top + l.sealRowTop;
    const P = motion ? clamp01((vh * 0.92 - rowTop) / (vh * 0.6)) : 1;
    const du = this.deskMat.uniforms;
    const S4 = du.uStone!.value as THREE.Vector4[], I4 = du.uImp!.value as THREE.Vector4[];
    this.stones.forEach((st, i) => {
      const gi = motion ? clamp01((P - 0.12 * i) / 0.64) : 1;
      const { lat, h } = gesture(gi);
      const s = l.seals[i]!;
      const x = this.wx(s.R[0] + (s.S[0] - s.R[0]) * lat), y = this.wy(s.R[1] + (s.S[1] - s.R[1]) * lat);
      st.group.position.set(x, h, -y);
      if (gi >= 0.45) this.cover[i] = 1;
      S4[i]!.set(x, y, h, st.aspect);
      I4[i]!.set(this.wx(s.S[0]), this.wy(s.S[1]), st.jitter, this.cover[i]!);
    });

    // 砂子
    const ut = top + l.union.y;
    this.flakeMat.uniforms.uSift!.value = motion ? clamp01((vh - ut) / (vh * 0.5)) : 1;

    // raking light: pointer (fine) > range > scroll (coarse) > rest (high)
    let tAz = 2.45, tEl = EL_HI;
    const kc = [l.kz.x + l.kz.w / 2, l.kz.y + l.kz.h / 2];
    const fu = this.flakeMat.uniforms;
    if (f.pointer && !this.coarse) {
      const px = (f.pointer.x + 1) / 2 * l.w, py = (1 - f.pointer.y) / 2 * l.h;
      const vx = px - kc[0]!, vy = kc[1]! - py;
      tAz = Math.atan2(vy, vx);
      tEl = EL_HI + (EL_LO - EL_HI) * sstep(0.35, 2.4, Math.hypot(vx, vy * 1.6) / Math.max(120, l.kz.h));
      (fu.uLamp!.value as THREE.Vector3).set(this.wx(px), this.wy(py), 3).normalize();
      fu.uLampOn!.value = 1;
    } else {
      fu.uLampOn!.value = 0;
      if (pressState.lightSet) { tAz = 2.75; tEl = EL_HI + (EL_LO - EL_HI) * pressState.light; }
      else if (this.coarse) {
        const cy = top + kc[1]!;
        tAz = 2.75; tEl = EL_HI + (EL_LO - EL_HI) * (1 - sstep(0, vh * 0.5, Math.abs(cy - vh * 0.5)));
      }
    }
    if (motion) {
      const k = 1 - Math.exp(-dt * 7);
      let dAz = tAz - this.az;
      dAz = Math.atan2(Math.sin(dAz), Math.cos(dAz));
      this.az += dAz * k; this.el_ += (tEl - this.el_) * k;
      if (Math.abs(dAz) > 0.002 || Math.abs(tEl - this.el_) > 0.0015) more = true;
    } else { this.az = tAz; this.el_ = tEl; }
    const ce = Math.cos(this.el_);
    (this.kzMat.uniforms.uL!.value as THREE.Vector3).set(ce * Math.cos(this.az), ce * Math.sin(this.az), Math.sin(this.el_));

    // Ink it (400 ms)
    const inkT = pressState.ink ? 1 : 0;
    if (!motion) this.inkV = inkT;
    else if (this.inkV !== inkT) {
      this.inkV += Math.sign(inkT - this.inkV) * Math.min(Math.abs(inkT - this.inkV), dt / 0.4);
      more = true;
    }
    this.kzMat.uniforms.uInk!.value = this.inkV;
    return more;
  }

  render(renderer: THREE.WebGLRenderer): void {
    renderer.render(this.scene, this.camera);
  }

  park(): void {
    this.kzCarve?.dispose();
    this.kzCarve = null;
    this.kzKey = '';
    if (this.kz) this.kz.visible = false;
    if (this.kzMat) this.kzMat.uniforms.tH!.value = this.blank;
    this.flag('kz', false);
    this.vram = MAX_FLAKES * 11 * 4;
  }

  setTier(t: Tier): void {
    const prev = this.tier;
    this.tier = t;
    if (this.flakeGeo) { this.flakeGeo.instanceCount = Math.min(MAX_FLAKES, t.counts.sunago); this.flag('sift', t.counts.sunago > 0); }
    if (prev && prev.counts.embossRes !== t.counts.embossRes && this.kzCarve) void this.carveStrip().then(() => this.stage?.requestFrame());
  }

  setOutline(): void { /* the shared uOutline uniform drives every material */ }

  onContextRestored(): void {
    this.kzKey = '';
    this.kzCarve = null;
    this.readColors();
  }

  dispose(): void {
    clearTimeout(this.layTimer);
    clearTimeout(this.kzTimer);
    this.ro?.disconnect();
    this.offs.forEach((o) => o());
    this.stones.forEach((s) => s.dispose());
    this.kzCarve?.dispose();
    this.desk?.geometry.dispose(); this.deskMat?.dispose();
    this.kz?.geometry.dispose(); this.kzMat?.dispose();
    this.flakeGeo?.dispose(); this.flakeMat?.dispose();
    this.blank.dispose();
    this.scene.clear();
  }
}

const factory: ViewFactory = (el, ctx) => new PressView(el, ctx);
export default factory;
