/**
 * View `writing-marble` — closed-form suminagashi (DESIGN §6.8; *threejs* §c2, Lu & Jaffer 2012). Owner: WP-10.
 *
 * Engine (event-driven, zero frames at rest):
 *  - The pattern RT (RGBA8, premultiplied sRGB ink + amount) is recomposed only when the op list changes. Each
 *    compose pass walks the op window newest → oldest per pixel through the exact inverse maps, compositing every
 *    drop it meets front-to-back with `fwidth` anti-aliasing, and finally samples the baked base at the pre-image.
 *    No op ever resamples another op's output, so rings stay razor-sharp at any resolution; the window is baked
 *    into the base only when it exceeds BAKE ops (one resample per 96 ops).
 *  - An id attachment (R8, half resolution, high/medium) stores which item deposited each pixel (same walk,
 *    `uIdMode`), for hover outlines. Drops spread over 600 ms (high/medium) by re-composing with an animated r.
 *  - Display: water over 胡粉 paper, washi fibre density, a faint window specular by day and a moon streak at night
 *    (relit, never inverted), item outlines and comb guides on hover, keylines in Outline view.
 *  - Take a print: a sheet lowers onto the water and peels off with the shared peel curl (WP-05 chunk); the pattern
 *    is read back once into a 512² canvas (→ ctx.print.setMarbling) and a 1024² print on washi (PNG download).
 */
import * as THREE from 'three';
import type { AppContext, PlateN, StageAPI, Tier, View, ViewFrame } from '../../core/types';
import { cssColor } from '../../gl/stage/view-helpers';
import { NOISE } from '../../gl/chunks/noise';
import { PAPER } from '../../gl/chunks/paper';
import { COLORSPACE_GLSL } from '../../gl/chunks/colorspace';
import { PEEL_UNIFORMS, PEEL_VERT_CHUNK, peelUniforms } from '../../gl/chunks/peel';
import { INK_HEX, PAPER_HEX, type MOp } from './ops';

const MAXOPS = 128;
const BAKE = 96;
const SPREAD_MS = 600;
const SHEET_MS = 1700;

const FSQ_VERT = /* glsl */`
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const COMPOSE_FRAG = /* glsl */`
precision highp float;
uniform sampler2D tBase; uniform sampler2D tBaseId; uniform sampler2D tOps;
uniform int uCount; uniform int uIdMode;
varying vec2 vUv;
void main(){
  vec2 p = vUv;
  vec3 acc = vec3(0.0); float aacc = 0.0; float T = 1.0;
  float bestW = 0.0; float bestId = 0.0;
  for (int k = 0; k < ${MAXOPS}; k++) {
    if (k >= uCount) break;
    int i = uCount - 1 - k;
    vec4 t0 = texelFetch(tOps, ivec2(i * 3, 0), 0);
    vec4 t1 = texelFetch(tOps, ivec2(i * 3 + 1, 0), 0);
    vec4 t2 = texelFetch(tOps, ivec2(i * 3 + 2, 0), 0);
    if (t0.x < 0.5) {                                  // drop
      vec2 c = t0.zw; float r = t1.x;
      vec2 d = p - c; float l = length(d);
      float sd = r - l;
      float cov = clamp(sd / max(fwidth(sd), 1e-6) + 0.5, 0.0, 1.0);
      float w = T * cov;
      acc += w * t2.rgb * t2.a; aacc += w * t2.a;
      float claim = w * max(t2.a, 0.3);
      if (claim > bestW) { bestW = claim; bestId = t0.y; }
      T *= 1.0 - cov;
      p = c + d * sqrt(max(1.0 - (r * r) / max(l * l, 1e-10), 0.0));
    } else {                                           // tine (finite when len > 0) or smooth comb
      vec2 m = t1.xy; vec2 q = p - t0.zw;
      float dn = dot(q, vec2(-m.y, m.x));
      float sh;
      if (t0.x < 1.5) {
        sh = t1.z * t1.w / (abs(dn) + t1.w);
        float len = t2.x;
        if (len > 0.0) { float t = dot(q, m); sh *= smoothstep(-0.1, 0.0, t) * (1.0 - smoothstep(len, len + 0.1, t)); }
      } else {
        sh = t1.z * sin(6.2831853 * dn / t2.x);
      }
      p -= sh * m;
    }
  }
  vec4 b = texture2D(tBase, p);
  float inTray = step(0.0, p.x) * step(p.x, 1.0) * step(0.0, p.y) * step(p.y, 1.0);
  b *= inTray;
  if (uIdMode == 1) {
    float bid = texture2D(tBaseId, p).r * 255.0 * inTray;
    if (T * max(b.a, 0.3) * step(0.5, bid) > bestW) bestId = bid;
    gl_FragColor = vec4(bestId / 255.0, 0.0, 0.0, 1.0);
  } else {
    gl_FragColor = vec4(acc + T * b.rgb, aacc + T * b.a);
  }
}`;

const DISPLAY_VERT = /* glsl */`
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const DISPLAY_FRAG = /* glsl */`
uniform sampler2D tPattern; uniform sampler2D tId;
uniform vec3 uPaperS; uniform vec3 uSelect; uniform vec3 uGuideCol; uniform vec3 uKey;
uniform float uNight; uniform float uOutline; uniform float uHighlight; uniform float uHasIds;
uniform vec4 uGuide; uniform float uGuideOn; uniform float uMode; uniform vec2 uTexel;
varying vec2 vUv;
${NOISE}
${PAPER}
${COLORSPACE_GLSL}
float idAt(vec2 uv){ return floor(texture2D(tId, uv).r * 255.0 + 0.5); }
void main(){
  vec4 pat = texture2D(tPattern, vUv);
  float fib = paperFibre(vUv, 1.0);
  // ink film: sumi soaks unevenly into the fibres
  float a = clamp(pat.a * (0.9 + 0.16 * fib), 0.0, 1.0);
  vec3 ink = pat.a > 1e-4 ? pat.rgb / pat.a : vec3(0.0);
  vec3 s = mix(uPaperS, ink, a);
  if (uMode > 0.5) {                     // export: the print on washi, sRGB out
    gl_FragColor = vec4(paperTone(s, vUv), 1.0);
    return;
  }
  if (uMode < -0.5) {                    // export: the bare pattern, straight alpha, sRGB out
    gl_FragColor = vec4(ink, pat.a);
    return;
  }
  vec3 col = srgbToLinear(paperTone(s, vUv));
  // hover: dim everything but the hovered item's rings and outline them in the selection colour
  if (uHighlight > 0.5 && uHasIds > 0.5) {
    float me = step(abs(idAt(vUv) - uHighlight), 0.5);
    float n = step(abs(idAt(vUv + vec2(uTexel.x, 0.0)) - uHighlight), 0.5) + step(abs(idAt(vUv - vec2(uTexel.x, 0.0)) - uHighlight), 0.5)
            + step(abs(idAt(vUv + vec2(0.0, uTexel.y)) - uHighlight), 0.5) + step(abs(idAt(vUv - vec2(0.0, uTexel.y)) - uHighlight), 0.5);
    float edge = me * step(n, 3.5);
    col = mix(col, srgbToLinear(uPaperS), (1.0 - me) * a * 0.55);
    col = mix(col, uSelect, edge * 0.9);
  }
  // comb (1) or tine (2) guides: 浅葱 construction lines over the water
  if (uGuideOn > 0.5) {
    vec2 m = vec2(cos(uGuide.z), sin(uGuide.z));
    float dn = dot(vUv - uGuide.xy, vec2(-m.y, m.x));
    float g = uGuideOn < 1.5 ? abs(fract(dn / uGuide.w + 0.5) - 0.5) * uGuide.w : abs(dn);
    float line = 1.0 - smoothstep(0.0, fwidth(dn) * 1.2, g);
    float dash = step(0.5, fract(dot(vUv - uGuide.xy, m) * 60.0));
    col = mix(col, uGuideCol, line * mix(0.45, 0.9, dash));
  }
  // water: a faint window reflection by day, a soft moon streak at night (scene relit, never inverted)
  vec2 w = vUv + 0.006 * vec2(vnoise(vUv * 7.0), vnoise(vUv * 7.0 + 9.0));
  float win = smoothstep(0.0, 0.06, w.x - 0.08) * smoothstep(0.0, 0.06, 0.34 - w.x) * smoothstep(0.0, 0.08, w.y - 0.66) * smoothstep(0.0, 0.08, 0.93 - w.y);
  col += (1.0 - uNight) * win * 0.022;
  col *= mix(vec3(1.0), vec3(0.6, 0.68, 0.86), uNight);
  float sx = w.x - 0.66 - 0.012 * sin(w.y * 23.0 + vnoise(w * 11.0) * 4.0);
  float streak = exp(-sx * sx / 0.0016) * smoothstep(0.0, 0.7, w.y) * (0.75 + 0.25 * vnoise(vec2(w.x * 40.0, w.y * 6.0)));
  col += uNight * streak * 0.16 * vec3(0.86, 0.92, 1.0);
  // depth towards the tray walls
  vec2 e = min(vUv, 1.0 - vUv);
  col *= 0.955 + 0.045 * smoothstep(0.0, 0.05, min(e.x, e.y));
  // Outline view: the ring keylines only
  float k = smoothstep(0.02, 0.2, fwidth(pat.a) * 6.0);
  col = mix(col, mix(srgbToLinear(uPaperS), uKey, k), uOutline);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

const SHEET_VERT = /* glsl */`
${PEEL_UNIFORMS}
uniform float uLift;
varying vec2 vUv; varying vec3 vN;
${PEEL_VERT_CHUNK}
void main(){
  vUv = uv;
  vec3 n;
  vec3 p = peel(vec3(uv, 0.0), uv, n);
  p.z += uLift;
  vN = normalize(normalMatrix * n);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;

const SHEET_FRAG = /* glsl */`
uniform sampler2D tPattern; uniform vec3 uPaperS; uniform float uPrinted; uniform float uOpacity; uniform float uNight;
varying vec2 vUv; varying vec3 vN;
${NOISE}
${PAPER}
${COLORSPACE_GLSL}
void main(){
  vec3 n = normalize(vN) * (gl_FrontFacing ? 1.0 : -1.0);
  vec3 base = uPaperS;
  if (!gl_FrontFacing) {                 // the printed side, seen as the sheet curls over
    vec4 pat = texture2D(tPattern, vUv);
    vec3 ink = pat.a > 1e-4 ? pat.rgb / pat.a : vec3(0.0);
    base = mix(base, ink, clamp(pat.a * (0.86 + 0.2 * paperFibre(vUv, 1.3)), 0.0, 1.0) * uPrinted);
  }
  vec3 col = srgbToLinear(paperTone(base, vUv * 1.3));
  float lit = 0.8 + 0.2 * max(dot(n, normalize(vec3(-0.4, 0.5, 0.8))), 0.0);
  col *= lit * mix(vec3(1.0), vec3(0.6, 0.68, 0.86), uNight);
  gl_FragColor = vec4(col, uOpacity);
  #include <colorspace_fragment>
}`;

function srgb(hex: string): THREE.Vector3 {
  const n = parseInt(hex.slice(1), 16);
  return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}
const INK_S = INK_HEX.map(srgb);
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const easeOut = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);
const easeInOut = (t: number) => { const k = clamp01(t); return k * k * (3 - 2 * k); };

export interface MarbleView extends View {
  /** Replace the whole list (initial + visitor); `applied` ops are shown. */
  setOps(ops: readonly MOp[], applied: number): void;
  /** Show the first n ops (progressive application; the newest drop spreads). */
  setApplied(n: number): void;
  /** Append a visitor op (shown at once; a drop spreads). */
  push(op: MOp): void;
  setInk(n: PlateN | 0): void;
  highlight(id: number, guide?: { a: [number, number]; angle: number; spacing?: number; kind: 'comb' | 'tine' } | null): void;
  /** Pointer → pattern space (null outside the tray). */
  toPattern(clientX: number, clientY: number): [number, number] | null;
  /** Read the pattern back: 512² straight-alpha pattern + optional print PNG blob. */
  capture(printSize: number | 0): Promise<{ pattern: HTMLCanvasElement; print: Blob | null } | null>;
  /** The take-a-print sheet: animate once (button) or follow a band progress (0..1). */
  playSheet(): Promise<void>;
  setSheet(p: number): void;
  readonly ready: boolean;
}

const factory = (el: HTMLElement, ctx: AppContext): MarbleView => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 10);
  let stage: StageAPI | null = null;
  let tier: Tier = ctx.tier.current;
  let res = 0, idRes = 0;
  let rtA: THREE.WebGLRenderTarget | null = null;   // base (baked)
  let rtB: THREE.WebGLRenderTarget | null = null;   // composed pattern
  let idA: THREE.WebGLRenderTarget | null = null, idB: THREE.WebGLRenderTarget | null = null;
  let opsTex: THREE.DataTexture | null = null;
  const opsData = new Float32Array(MAXOPS * 3 * 4);
  let compose: THREE.ShaderMaterial | null = null;
  let display: THREE.ShaderMaterial | null = null;
  let sheetMat: THREE.ShaderMaterial | null = null;
  let sheet: THREE.Mesh | null = null;
  const fsqScene = new THREE.Scene();
  const fsqCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  let fsq: THREE.Mesh | null = null;
  const peelU = peelUniforms(THREE.Vector2, { radius: 0.09, dir: [-0.62, 0.78], size: [1, 1], corner: [1, 0] });

  let ops: MOp[] = [];
  let applied = 0;          // ops[0..applied) are shown
  let baked = 0;            // ops[0..baked) live in the base RT
  let composedFor = -1;     // applied count the pattern RT reflects
  let dirty = true;
  let anim: { index: number; t0: number } | null = null;
  let sheetAnim: { t0: number; resolve: () => void } | null = null;
  let sheetP = -1;
  let hl = 0;
  let isReady = false;
  const motion = () => ctx.motion.enabled;

  /* ------------------------------------------------------------------ resources */
  function makeRT(size: number, id = false): THREE.WebGLRenderTarget {
    return new THREE.WebGLRenderTarget(size, size, {
      type: THREE.UnsignedByteType, format: id ? THREE.RedFormat : THREE.RGBAFormat,
      minFilter: id ? THREE.NearestFilter : THREE.LinearFilter, magFilter: id ? THREE.NearestFilter : THREE.LinearFilter,
      depthBuffer: false, stencilBuffer: false, generateMipmaps: false,
      wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping,
    });
  }
  function allocate(): void {
    freeRTs();
    res = tier.counts.marble;
    idRes = tier.counts.marbleIds ? res >> 1 : 0;
    rtA = makeRT(res); rtB = makeRT(res);
    if (idRes) { idA = makeRT(idRes, true); idB = makeRT(idRes, true); }
    view.vram = res * res * 8 + idRes * idRes * 2;
    baked = 0; composedFor = -1; dirty = true;
    clearRT(rtA); if (idA) clearRT(idA);
    if (display) {
      display.uniforms.tPattern!.value = rtB.texture;
      display.uniforms.tId!.value = idB?.texture ?? null;
      display.uniforms.uHasIds!.value = idRes ? 1 : 0;
      display.uniforms.uTexel!.value.set(1 / Math.max(idRes, 1), 1 / Math.max(idRes, 1));
      if (sheetMat) sheetMat.uniforms.tPattern!.value = rtB.texture;
    }
  }
  function freeRTs(): void {
    rtA?.dispose(); rtB?.dispose(); idA?.dispose(); idB?.dispose();
    rtA = rtB = idA = idB = null;
  }
  function clearRT(rt: THREE.WebGLRenderTarget): void {
    const r = stage!.renderer;
    const prevAlpha = r.getClearAlpha();
    const prevColor = r.getClearColor(new THREE.Color());
    r.setRenderTarget(rt);
    r.setClearColor(0x000000, 0);
    r.clear(true, false, false);
    r.setRenderTarget(null);
    r.setClearColor(prevColor, prevAlpha);
  }

  /* ------------------------------------------------------------------ composition */
  function uploadOps(from: number, to: number, animIndex: number, animK: number): number {
    const n = Math.min(MAXOPS, to - from);
    for (let j = 0; j < n; j++) {
      const o = ops[from + j]!;
      const q = j * 12;
      if (o.k === 'drop') {
        const ink = o.ink ?? 0;
        const c = INK_S[ink]!;
        opsData.set([0, o.id ?? 0, o.c![0], o.c![1], (o.r ?? 0.04) * (from + j === animIndex ? animK : 1), 0, 0, 0, c.x, c.y, c.z, ink ? (o.dens ?? 1) : 0], q);
      } else {
        const kind = o.k === 'tine' ? 1 : 2;
        opsData.set([kind, o.id ?? 0, o.a![0], o.a![1], o.m![0], o.m![1], o.alpha ?? 0.05, o.lambda ?? 0.03, kind === 1 ? (o.len ?? 0) : (o.spacing ?? 0.2), 0, 0, 0], q);
      }
    }
    opsTex!.needsUpdate = true;
    return n;
  }
  function runCompose(target: THREE.WebGLRenderTarget, idTarget: THREE.WebGLRenderTarget | null, count: number): void {
    const r = stage!.renderer;
    const u = compose!.uniforms;
    u.tBase!.value = rtA!.texture;
    u.tBaseId!.value = idA?.texture ?? rtA!.texture;
    u.uCount!.value = count;
    fsq!.material = compose!;
    u.uIdMode!.value = 0;
    r.setRenderTarget(target);
    r.render(fsqScene, fsqCam);
    if (idTarget) {
      u.uIdMode!.value = 1;
      r.setRenderTarget(idTarget);
      r.render(fsqScene, fsqCam);
    }
    r.setRenderTarget(null);
  }
  /** Bring the pattern RT up to date with `applied` (and the spreading drop, if any). */
  function recompose(now: number): boolean {
    if (!rtA || !compose || !stage) return false;
    let more = false;
    if (applied - baked > MAXOPS) anim = null;   // never let a spread hold back a bake past the window
    // bake whole windows while the backlog is long (rebuild after park / restore, long visitor sessions)
    while (applied - baked > BAKE && !anim) {
      const end = Math.min(applied, baked + BAKE);
      const n = uploadOps(baked, end, -1, 1);
      runCompose(rtB!, idB, n);
      [rtA, rtB] = [rtB!, rtA!];
      if (idA && idB) [idA, idB] = [idB, idA];
      baked = end;
      composedFor = -1;
    }
    let needs = composedFor !== applied || dirty;
    let animIndex = -1, k = 1;
    if (anim) {
      needs = true;
      k = easeOut((now - anim.t0) / SPREAD_MS);
      if (k >= 1) anim = null; else { more = true; animIndex = anim.index; }
    }
    if (needs) {
      const n = uploadOps(baked, applied, animIndex, Math.max(0.02, k));
      runCompose(rtB!, idB, n);
      composedFor = applied;
      dirty = false;
      if (display) { display.uniforms.tPattern!.value = rtB!.texture; display.uniforms.tId!.value = idB?.texture ?? null; }
      if (sheetMat) sheetMat.uniforms.tPattern!.value = rtB!.texture;
    }
    return more;
  }
  function startSpread(index: number): void {
    const o = ops[index];
    if (o && o.k === 'drop' && tier.counts.marbleSpread && motion()) anim = { index, t0: performance.now() };
    else anim = null;
  }

  /* ------------------------------------------------------------------ colours */
  function refreshColors(): void {
    if (!display) return;
    const u = display.uniforms;
    (u.uSelect!.value as THREE.Color).copy(cssColor(el, '--select', '#E03C8A'));
    (u.uGuideCol!.value as THREE.Color).copy(cssColor(el, '--guide', '#33A6B8'));
    (u.uKey!.value as THREE.Color).copy(cssColor(el, '--ink', '#0F2540'));
  }

  /* ------------------------------------------------------------------ the view */
  const view: MarbleView = {
    id: 'writing-marble', el, scene, camera, printName: '墨流し', vram: 0,
    get ready() { return isReady; },
    async init(s) {
      stage = s;
      tier = s.tier;
      opsTex = new THREE.DataTexture(opsData, MAXOPS * 3, 1, THREE.RGBAFormat, THREE.FloatType);
      opsTex.minFilter = opsTex.magFilter = THREE.NearestFilter;
      opsTex.needsUpdate = true;
      compose = new THREE.ShaderMaterial({
        name: 'marble:compose', vertexShader: FSQ_VERT, fragmentShader: COMPOSE_FRAG,
        uniforms: { tBase: { value: null }, tBaseId: { value: null }, tOps: { value: opsTex }, uCount: { value: 0 }, uIdMode: { value: 0 } },
        depthTest: false, depthWrite: false, blending: THREE.NoBlending,
      });
      fsq = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), compose);
      fsq.frustumCulled = false;
      fsqScene.add(fsq);
      const g = s.g;
      display = new THREE.ShaderMaterial({
        name: 'marble:display', vertexShader: DISPLAY_VERT, fragmentShader: DISPLAY_FRAG,
        uniforms: {
          tPattern: { value: null }, tId: { value: null }, uPaperS: { value: srgb(PAPER_HEX) },
          uSelect: { value: new THREE.Color() }, uGuideCol: { value: new THREE.Color() }, uKey: { value: new THREE.Color() },
          uNight: g.uNight, uOutline: g.uOutline, uHighlight: { value: 0 }, uHasIds: { value: 0 },
          uGuide: { value: new THREE.Vector4(0.5, 0.5, 0, 0.2) }, uGuideOn: { value: 0 }, uMode: { value: 0 },
          uTexel: { value: new THREE.Vector2(1 / 512, 1 / 512) },
        },
        depthWrite: false,
      });
      const water = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), display);
      water.position.set(0.5, 0.5, 0);
      scene.add(water);
      sheetMat = new THREE.ShaderMaterial({
        name: 'marble:sheet', vertexShader: SHEET_VERT, fragmentShader: SHEET_FRAG,
        uniforms: { ...peelU, uLift: { value: 0.6 }, tPattern: { value: null }, uPaperS: { value: srgb(PAPER_HEX) }, uPrinted: { value: 0 }, uOpacity: { value: 0 }, uNight: g.uNight },
        side: THREE.DoubleSide, transparent: true, depthWrite: false,
      });
      sheet = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 48, 48), sheetMat);
      sheet.geometry.translate(0.5, 0.5, 0);
      sheet.position.z = 0.002;
      sheet.visible = false;
      sheet.frustumCulled = false;
      sheet.renderOrder = 2;
      scene.add(sheet);
      camera.position.set(0.5, 0.5, 1.866);
      camera.lookAt(0.5, 0.5, 0);
      refreshColors();
      ctx.theme.on(() => { refreshColors(); s.requestFrame(); });
    },
    async allocate() { allocate(); },
    prewarm() { if (stage) { recompose(performance.now()); isReady = true; } },
    update(_dt, _t, _f: ViewFrame) {
      if (!rtA) return false;
      const now = performance.now();
      // frame the 1 × 1 tray so it covers the placeholder
      const asp = camera.aspect || 1;
      const half = 0.5 * Math.min(1, 1 / asp);
      const d = half / Math.tan(THREE.MathUtils.degToRad(15));
      if (Math.abs(camera.position.z - d) > 1e-5) { camera.position.z = d; camera.updateMatrixWorld(); }
      let more = recompose(now);
      isReady = true;
      // take-a-print sheet
      let sp = sheetP;
      if (sheetAnim) {
        sp = (now - sheetAnim.t0) / SHEET_MS;
        if (!motion()) sp = sp > 0 ? 1 : 0;
        if (sp >= 1) { const r = sheetAnim.resolve; sheetAnim = null; sp = -1; r(); } else more = true;
      }
      if (sheet && sheetMat) {
        const on = sp > 0 && sp < 1;
        sheet.visible = on;
        if (on) {
          const u = sheetMat.uniforms;
          const desc = easeInOut(sp / 0.32);
          u.uLift!.value = 0.55 * (1 - desc);
          u.uOpacity!.value = clamp01(sp / 0.12) * (1 - clamp01((sp - 0.94) / 0.06));
          u.uPrinted!.value = clamp01((sp - 0.32) / 0.08);
          u.uPeel!.value = easeInOut((sp - 0.42) / 0.56);
        }
      }
      return more;
    },
    render(renderer) { renderer.render(scene, camera); },
    park() { freeRTs(); isReady = false; },
    dispose() {
      freeRTs();
      opsTex?.dispose();
      compose?.dispose(); display?.dispose(); sheetMat?.dispose();
      fsq?.geometry.dispose(); sheet?.geometry.dispose();
      scene.traverse((o) => (o as THREE.Mesh).geometry?.dispose?.());
    },
    onContextRestored() { if (stage) allocate(); },
    setOutline() { /* shared uOutline */ },
    setTier(t) {
      const resize = t.counts.marble !== res || (t.counts.marbleIds ? res >> 1 : 0) !== idRes;
      tier = t;
      if (resize && rtA) allocate();
      stage?.requestFrame();
    },

    setOps(list, n) {
      ops = list.slice();
      applied = Math.min(n, ops.length);
      baked = 0; composedFor = -1; dirty = true; anim = null;
      if (rtA) { clearRT(rtA); if (idA) clearRT(idA); }
      stage?.requestFrame();
    },
    setApplied(n) {
      const m = Math.min(n, ops.length);
      if (m <= applied) return;
      applied = m;
      startSpread(m - 1);
      stage?.requestFrame();
    },
    push(op) {
      ops.push(op);
      if (applied === ops.length - 1) { applied = ops.length; startSpread(applied - 1); }
      stage?.requestFrame();
    },
    setInk() { /* the section keeps the selected ink */ },
    highlight(id, guide) {
      hl = id;
      if (!display) return;
      const u = display.uniforms;
      u.uHighlight!.value = id;
      if (guide) {
        (u.uGuide!.value as THREE.Vector4).set(guide.a[0], guide.a[1], guide.angle, guide.spacing ?? 0.2);
        u.uGuideOn!.value = guide.kind === 'comb' ? 1 : 2;
      } else u.uGuideOn!.value = 0;
      stage?.requestFrame();
    },
    toPattern(cx, cy) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return null;
      const asp = r.width / r.height;
      const halfH = 0.5 * Math.min(1, 1 / asp), halfW = halfH * asp;
      const nx = ((cx - r.left) / r.width) * 2 - 1, ny = -(((cy - r.top) / r.height) * 2 - 1);
      const x = 0.5 + nx * halfW, y = 0.5 + ny * halfH;
      return x >= 0 && x <= 1 && y >= 0 && y <= 1 ? [x, y] : null;
    },
    async capture(printSize) {
      if (!stage || !rtA || !display || !fsq) return null;
      // finish any spread so the print holds the settled pattern
      if (anim) { anim = null; }
      dirty = true;
      recompose(performance.now());
      const r = stage.renderer;
      const read = (size: number, mode: number): ImageData => {
        const rt = makeRT(size);
        const prev = fsq!.material;
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), display!);
        mesh.frustumCulled = false;
        const sc = new THREE.Scene(); sc.add(mesh);
        display!.uniforms.uMode!.value = mode;
        display!.blending = THREE.NoBlending;
        // the display vertex shader uses the camera: an identity ortho camera maps the 2 × 2 quad to the target
        const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
        r.setRenderTarget(rt);
        r.render(sc, cam);
        const buf = new Uint8Array(size * size * 4);
        r.readRenderTargetPixels(rt, 0, 0, size, size, buf);
        r.setRenderTarget(null);
        display!.uniforms.uMode!.value = 0;
        display!.blending = THREE.NormalBlending;
        fsq!.material = prev;
        mesh.geometry.dispose(); rt.dispose();
        const img = new ImageData(size, size);
        const row = size * 4;
        for (let y = 0; y < size; y++) img.data.set(buf.subarray((size - 1 - y) * row, (size - y) * row), y * row);
        return img;
      };
      const pattern = document.createElement('canvas');
      pattern.width = pattern.height = 512;
      pattern.getContext('2d')!.putImageData(read(512, -1), 0, 0);
      let print: Blob | null = null;
      if (printSize) {
        const c = document.createElement('canvas');
        c.width = c.height = printSize;
        c.getContext('2d')!.putImageData(read(printSize, 1), 0, 0);
        print = await new Promise<Blob | null>((res2) => c.toBlob(res2, 'image/png'));
      }
      stage.requestFrame();
      return { pattern, print };
    },
    playSheet() {
      return new Promise<void>((resolve) => {
        sheetAnim?.resolve();
        sheetAnim = { t0: performance.now(), resolve };
        stage?.requestFrame();
      });
    },
    setSheet(p) {
      sheetP = p <= 0 || p >= 1 ? -1 : p;
      stage?.requestFrame();
    },
  };
  void hl;
  return view;
};

export default factory;
