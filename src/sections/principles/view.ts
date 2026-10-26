/**
 * View `principles-garden` — data-driven raked sand (DESIGN §6.6; threejs §f1). Owner: WP-08.
 *
 * Draws: the sand (one quad, or a 256² displaced grid on the high tier, for grazing silhouettes), the five
 * stones (one merged geometry), and — into the trail render target, only when something changed — the visitor's
 * rake strokes and the re-rake sweep. Everything else is a pure function of plane position in the shader
 * (sand.ts): 52 rows from `weeklyP99ms`, samon rings, SEV-1 ring sets, the kumiko imprint and its rake line.
 * The camera is fixed per layout and moves only with scroll (a slow dolly through the section, a 12° tilt up in
 * the principles-achievements band); frames run only for scroll, strokes, the sweep and the theme tween.
 * Tier changes touch uniforms and the trail size only (uDetail 2/1/0: forward-difference normals + shadows +
 * displacement / FD normals + shadows / dFdx normals), never the program.
 * Budget: ≤ 3 draw calls + 1 per stroke batch; trail 1024² RGBA8 (4 MB) on high, 512² / 256² below.
 */
import * as THREE from 'three';
import type { AppContext, StageAPI, Tier, View, ViewFactory, ViewFrame } from '../../core/types';
import { NOISE } from '../../gl/chunks/noise';
import { RAKE_STROKE_FRAG, RAKE_STROKE_VERT } from '../../gl/chunks/research';
import { readToken } from '../../gl/chunks/colorspace';
import { CAM_HW, CAM_X, DATA, IMPRINT, PLANE, RAKE_W, SPACING, TINES, rowAmplitude, sevRadius } from './garden';
import { gardenState as G } from './state';
import { gardenHandoff } from '../skills/state';
import { CLEAR_FRAG, CLEAR_VERT, SAND_FRAG, SAND_VERT, STONE_FRAG, STONE_VERT } from './sand';

const FOV = 30;
const SUN_DAY = new THREE.Vector3(-0.759, 0.375, -0.532).normalize();
const MOON = new THREE.Vector3(0.837, 0.259, -0.483).normalize();
const MAX_SEGS = 256;
const STONE_SHAPE = [
  { h: 0.82, lean: 0.12, seed: 3 }, { h: 0.58, lean: -0.08, seed: 11 }, { h: 1.12, lean: 0.06, seed: 23 },
  { h: 0.66, lean: -0.14, seed: 31 }, { h: 0.94, lean: 0.1, seed: 47 },
];

function h3(x: number, y: number, z: number): number {
  let t = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(z | 0, 2147483647)) | 0;
  t = Math.imul(t ^ (t >>> 13), 1274126177);
  return ((t ^ (t >>> 16)) >>> 0) / 4294967296;
}
function vn3(x: number, y: number, z: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  return l(
    l(l(h3(xi, yi, zi), h3(xi + 1, yi, zi), u), l(h3(xi, yi + 1, zi), h3(xi + 1, yi + 1, zi), u), v),
    l(l(h3(xi, yi, zi + 1), h3(xi + 1, yi, zi + 1), u), l(h3(xi, yi + 1, zi + 1), h3(xi + 1, yi + 1, zi + 1), u), v), w);
}

function stoneGeometry(stones: { x: number; z: number; r: number }[], detail: number): THREE.BufferGeometry {
  const pos: number[] = [];
  const ids: number[] = [];
  const nrm: number[] = [];
  stones.forEach((s, i) => {
    const sh = STONE_SHAPE[i % STONE_SHAPE.length]!;
    const g = new THREE.IcosahedronGeometry(1, detail);
    const p = g.getAttribute('position');
    for (let k = 0; k < p.count; k++) {
      const x = p.getX(k), y = p.getY(k), z = p.getZ(k);
      const n = 0.78 + 0.32 * vn3(x * 1.6 + sh.seed, y * 1.6, z * 1.6) + 0.1 * vn3(x * 4.2, y * 4.2 + sh.seed, z * 4.2);
      // weathered granite: a broad, slightly flattened top, a lean, sunk into the gravel
      let yy = y * n;
      if (yy > 0.55) yy = 0.55 + (yy - 0.55) * 0.55;
      const X = x * n + yy * sh.lean;
      pos.push(s.x + X * s.r, (yy * sh.h + 0.22) * s.r, s.z + z * n * s.r);
      ids.push(i);
      // a softened normal (the stone's own roundness), mixed with the flat facet in the shader
      const len = Math.hypot(X, yy * sh.h * 1.25, z * n) || 1;
      nrm.push(X / len, (yy * sh.h * 1.25) / len, (z * n) / len);
    }
    g.dispose();
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('aStone', new THREE.Float32BufferAttribute(ids, 1));
  geo.setAttribute('aN', new THREE.Float32BufferAttribute(nrm, 3));
  return geo;
}

const smooth = (x: number) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };
const tmp = new THREE.Vector3();
const tmp2 = new THREE.Vector3();

class GardenView implements View {
  readonly id = 'principles-garden';
  readonly printName = '砂紋';
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(FOV, 2, 0.05, 40);
  vram = 0;
  private stage: StageAPI | null = null;
  private sandMat: THREE.ShaderMaterial | null = null;
  private stoneMat: THREE.ShaderMaterial | null = null;
  private sand: THREE.Mesh | null = null;
  private stones: THREE.Mesh | null = null;
  private quad: THREE.BufferGeometry;
  private grid: THREE.BufferGeometry | null = null;
  private rows: THREE.DataTexture | null = null;
  private trail: THREE.WebGLRenderTarget | null = null;
  private trailSize = 512;
  private blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1);
  private strokeScene = new THREE.Scene();
  private strokeCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private strokeGeo = new THREE.BufferGeometry();
  private strokePos = new Float32Array(MAX_SEGS * 6 * 3);
  private strokeLat = new Float32Array(MAX_SEGS * 6);
  private clearGeo = new THREE.BufferGeometry();
  private clearMesh: THREE.Mesh;
  private pending: [number, number, number, number][] = [];
  private lastPt: THREE.Vector2 | null = null;
  private dragging = -1;
  private sweep: { t0: number; dur: number } | null = null;
  private needClear = true;
  private detail = 1;
  private aspect = 2;
  private camKey = '';
  private pubSig = '';
  private offs: (() => void)[] = [];
  private ro: ResizeObserver | null = null;

  constructor(readonly el: HTMLElement, private ctx: AppContext) {
    this.blank.needsUpdate = true;
    const q = new THREE.PlaneGeometry(PLANE.maxX - PLANE.minX, PLANE.maxZ - PLANE.minZ, 1, 1);
    q.rotateX(-Math.PI / 2);
    q.translate((PLANE.maxX + PLANE.minX) / 2, 0, (PLANE.maxZ + PLANE.minZ) / 2);
    this.quad = q;
    this.strokeGeo.setAttribute('position', new THREE.BufferAttribute(this.strokePos, 3));
    this.strokeGeo.setAttribute('aLateral', new THREE.BufferAttribute(this.strokeLat, 1));
    const strokeMat = new THREE.ShaderMaterial({
      name: 'garden-rake', vertexShader: RAKE_STROKE_VERT, fragmentShader: RAKE_STROKE_FRAG,
      transparent: true, depthTest: false, depthWrite: false, blending: THREE.NormalBlending,
    });
    const strokes = new THREE.Mesh(this.strokeGeo, strokeMat);
    strokes.frustumCulled = false;
    this.strokeScene.add(strokes);
    this.clearGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(18), 3));
    this.clearMesh = new THREE.Mesh(this.clearGeo, new THREE.ShaderMaterial({
      name: 'garden-rerake', vertexShader: CLEAR_VERT, fragmentShader: CLEAR_FRAG, depthTest: false, depthWrite: false, blending: THREE.NoBlending,
    }));
    this.clearMesh.frustumCulled = false;
  }

  async init(stage: StageAPI): Promise<void> {
    this.stage = stage;
    const g = stage.g;
    const ops = this.ctx.content.ops;
    // 52 × 1 row amplitudes
    const amp = new Uint8Array(DATA.rows);
    ops.weeklyP99ms.forEach((v, i) => { if (i < DATA.rows) amp[i] = Math.round(rowAmplitude(v) * 255); });
    this.rows = new THREE.DataTexture(amp, DATA.rows, 1, THREE.RedFormat, THREE.UnsignedByteType);
    this.rows.magFilter = THREE.LinearFilter;
    this.rows.minFilter = THREE.LinearFilter;
    this.rows.needsUpdate = true;
    const stones = this.ctx.content.principles.map((p) => p.stone);
    const uStones = stones.map((s, i) => new THREE.Vector4(s.x, (STONE_SHAPE[i]!.h * 0.5 + 0.22) * s.r, s.z, s.r));
    const r5 = stones[4]?.r ?? 0.1;
    const uSev = [0, 1, 2, 3].map((k) => { const x = ops.sev1[k]; return x ? new THREE.Vector2(sevRadius(r5, x.blastPct), 1.3) : new THREE.Vector2(0, 0); });
    const col = (hex: string) => new THREE.Color(hex);
    const gravel = readToken(this.el, '--gravel', '#BDC0BA');
    const common = {
      tRows: { value: this.rows }, tTrail: { value: this.blank }, uStones: { value: uStones }, uSev: { value: uSev },
      uPlane: { value: new THREE.Vector4(PLANE.minX, PLANE.minZ, PLANE.maxX - PLANE.minX, PLANE.maxZ - PLANE.minZ) },
      uData: { value: new THREE.Vector3(DATA.back, DATA.front, DATA.rows) },
      uSpacing: { value: SPACING }, uTines: { value: TINES }, uAmp: { value: 0.0046 },
      uStamp: { value: new THREE.Vector4(IMPRINT.cx, IMPRINT.cz, IMPRINT.pitch, 0) },
      uStampB: { value: new THREE.Vector4(0, 0, -9, 0) }, uStampGrid: { value: new THREE.Vector2(3, 2) },
    };
    void gravel;
    this.sandMat = new THREE.ShaderMaterial({
      name: 'garden-sand',
      vertexShader: SAND_VERT,
      fragmentShader: SAND_FRAG(NOISE),
      uniforms: {
        ...common,
        uDisplace: { value: 0 }, uDetail: { value: 1 },
        uSun: { value: new THREE.Vector3().copy(SUN_DAY) },
        // 白鼠 gravel: lit toward 卯の花 white, shade toward 藍鼠 — cool, never beige; moonlit blue-grey at night
        uSandLit: { value: col('#BDC0BA').lerp(col('#F7FCFE'), 0.66) }, uSandShade: { value: col('#BDC0BA').lerp(col('#566C73'), 0.46) },
        uSandLitN: { value: col('#91989F').lerp(col('#C1E4E9'), 0.34) }, uSandShadeN: { value: col('#91989F').lerp(col('#0F2540'), 0.74) },
        uGlint: { value: col('#FFFFFF') }, uInk: { value: new THREE.Color() },
        uNight: g.uNight, uOutline: g.uOutline, uDarken: { value: 0 },
        uFade: { value: new THREE.Vector2(PLANE.minZ + 0.16, -0.62) }, uSweep: { value: new THREE.Vector2(0, 0) },
      },
      transparent: true,
      depthWrite: true,
    });
    this.stoneMat = new THREE.ShaderMaterial({
      name: 'garden-stones',
      vertexShader: STONE_VERT,
      fragmentShader: STONE_FRAG(NOISE),
      uniforms: {
        uSun: this.sandMat.uniforms.uSun!, uStone: { value: col('#44494A') }, uStonePale: { value: col('#8C918C') },
        uStoneN: { value: col('#1E2738') }, uInk: this.sandMat.uniforms.uInk!, uNight: g.uNight, uOutline: g.uOutline,
        uDarken: this.sandMat.uniforms.uDarken!,
      },
    });
    this.sand = new THREE.Mesh(this.quad, this.sandMat);
    this.sand.frustumCulled = false;
    this.sand.renderOrder = 0;
    const tier = stage.tier;
    const detail = tier.name === 'high' ? 5 : tier.name === 'medium' ? 4 : 3;
    this.stones = new THREE.Mesh(stoneGeometry(stones, detail), this.stoneMat);
    this.stones.frustumCulled = false;
    this.stones.renderOrder = 1;
    this.scene.add(this.sand, this.stones);
    this.refreshColors();
    this.offs.push(this.ctx.theme.on(() => { this.refreshColors(); this.stage?.requestFrame(); }));
    this.ro = new ResizeObserver((e) => {
      const b = e[0]!.contentRect;
      this.aspect = b.height > 0 ? b.width / b.height : 2;
      this.camKey = '';
      this.stage?.requestFrame();
    });
    this.ro.observe(this.el);
    this.bindPointer();
  }

  async allocate(stage: StageAPI): Promise<void> {
    this.trailSize = stage.tier.counts.sandTrail || 256;
    if (!this.trail) {
      this.trail = new THREE.WebGLRenderTarget(this.trailSize, this.trailSize, {
        type: THREE.UnsignedByteType, format: THREE.RGBAFormat, depthBuffer: false, stencilBuffer: false,
        minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false,
      });
      this.trail.texture.colorSpace = THREE.NoColorSpace;
      this.needClear = true;
    }
    this.sandMat!.uniforms.tTrail!.value = this.trail.texture;
    this.vram = this.trailSize * this.trailSize * 4 + 52 + (this.grid ? 257 * 257 * 12 : 0);
  }

  private refreshColors(): void {
    (this.sandMat?.uniforms.uInk!.value as THREE.Color | undefined)?.copy(readToken(this.el, '--ink'));
  }

  /* ------------------------------------------------------------------ raking */
  private bindPointer(): void {
    const el = this.el;
    const toPlane = (e: PointerEvent): THREE.Vector2 | null => {
      const r = el.getBoundingClientRect();
      const nx = ((e.clientX - r.left) / r.width) * 2 - 1, ny = -(((e.clientY - r.top) / r.height) * 2 - 1);
      tmp.set(nx, ny, 0.5).unproject(this.camera).sub(this.camera.position).normalize();
      if (tmp.y > -1e-4) return null;
      const t = -this.camera.position.y / tmp.y;
      return new THREE.Vector2(this.camera.position.x + tmp.x * t, this.camera.position.z + tmp.z * t);
    };
    const allowed = (e: PointerEvent) => e.pointerType === 'mouse' || e.pointerType === 'pen' || G.raking;
    const down = (e: PointerEvent) => {
      if (!allowed(e) || e.button > 0 || this.dragging >= 0) return;
      const p = toPlane(e);
      if (!p) return;
      this.dragging = e.pointerId;
      this.lastPt = p;
      try { el.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      if (e.pointerType !== 'mouse') e.preventDefault();
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== this.dragging) return;
      const p = toPlane(e);
      if (!p || !this.lastPt) return;
      if (p.distanceTo(this.lastPt) < SPACING * 0.35) return;
      this.pending.push([this.lastPt.x, this.lastPt.y, p.x, p.y]);
      if (this.pending.length > MAX_SEGS) this.pending.shift();
      this.lastPt = p;
      this.stage?.requestFrame();
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== this.dragging) return;
      this.dragging = -1;
      this.lastPt = null;
      try { el.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    this.offs.push(() => { el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); });
  }

  /** Re-rake: an animated sweep clears the visitor's strokes over 900 ms (instant without motion). */
  rerake(): void {
    this.sweep = { t0: performance.now(), dur: G.motion ? 900 : 0 };
    this.stage?.requestFrame();
  }

  /** The kumiko pressed into the sand (DESIGN §2.2 skills-principles): kaku-asanoha at `pitch` (plane units). */
  stampLattice(pitch: number = IMPRINT.pitch): void {
    const u = this.sandMat?.uniforms;
    if (!u) return;
    (u.uStamp!.value as THREE.Vector4).z = pitch;
  }

  /** Test hook: synthesise a stroke between two plane points. */
  rakeLine(x0: number, z0: number, x1: number, z1: number): void {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / (SPACING * 0.8)));
    for (let i = 0; i < n; i++) {
      const a = i / n, b = (i + 1) / n;
      this.pending.push([x0 + (x1 - x0) * a, z0 + (z1 - z0) * a, x0 + (x1 - x0) * b, z0 + (z1 - z0) * b]);
    }
    this.stage?.requestFrame();
  }

  /* ------------------------------------------------------------------ camera */
  private placeCamera(): boolean {
    const mobile = G.layout === 'm';
    const tiltK = G.tilt;
    const fr = Math.min(1, Math.max(0.3, G.frameFrac));
    const key = `${mobile}|${this.aspect.toFixed(3)}|${fr}|${tiltK.toFixed(4)}|${G.drift.toFixed(4)}`;
    if (key === this.camKey) return false;
    this.camKey = key;
    const cam = this.camera;
    // the sand is framed into the bottom `fr` of the placeholder: the frustum is that frame's, extended upward
    // (an asymmetric view offset), so the sky and the mist above stay empty
    // (the stage keeps camera.aspect = placeholder aspect, so the frame's frustum is expressed as a view offset:
    // k = 1/fr times wider and taller than the base frustum, the frame's centre on the optical axis)
    const aspect = this.aspect / fr, k = 1 / fr;
    cam.aspect = this.aspect;
    if (fr < 0.999) cam.setViewOffset(1000, 1000, -500 * (k - 1), -1000 * (k - 1), 1000 * k, 1000 * k);
    else cam.clearViewOffset();
    const tanH = Math.tan((FOV / 2) * Math.PI / 180);
    const pitch = (mobile ? 58 : 35) * Math.PI / 180;
    const hw = mobile ? 0.8 : CAM_HW;
    const dist = Math.max(1.2, hw / (tanH * Math.max(0.3, aspect)));
    const tx = mobile ? 0.03 : CAM_X + G.drift * 0.05, tz = mobile ? -0.02 : 0.02 - G.drift * 0.04;
    cam.position.set(tx, Math.sin(pitch) * dist - G.drift * 0.03, tz + Math.cos(pitch) * dist);
    const look = pitch - tiltK * (12 * Math.PI / 180);
    tmp2.set(0, -Math.sin(look), -Math.cos(look)).add(cam.position);
    cam.lookAt(tmp2);
    cam.near = 0.05;
    cam.far = dist * 6;
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    return true;
  }

  private publishStones(): void {
    const cb = G.onStones;
    if (!cb) return;
    const b = this.el.getBoundingClientRect();
    const R = { x: b.left, y: b.top, w: b.width, h: b.height };
    const out = this.ctx.content.principles.map((p, i) => {
      tmp.set(p.stone.x, (STONE_SHAPE[i]!.h * 0.55 + 0.22) * p.stone.r * 1.6, p.stone.z).project(this.camera);
      return { x: R.x + (tmp.x * 0.5 + 0.5) * R.w, y: R.y + (0.5 - tmp.y * 0.5) * R.h };
    });
    cb(out);
  }

  /* ------------------------------------------------------------------ frame */
  update(_dt: number, _t: number, f: ViewFrame): boolean {
    if (!this.sandMat) return false;
    void f;
    const u = this.sandMat.uniforms;
    this.placeCamera();
    // sun ↔ moon with the shared theme tween
    const night = this.stage?.g.uNight.value ?? 0;
    (u.uSun!.value as THREE.Vector3).copy(SUN_DAY).lerp(MOON, night).normalize();
    u.uDarken!.value = 0.06 * G.tilt;
    // the imprint and its rake line
    const L = G.layout === 'm' ? { W: 19.7, H: 29.2, c: 2, r: 3 } : { W: 29.2, H: 19.7, c: 3, r: 2 };
    const stamp = u.uStamp!.value as THREE.Vector4;
    const hw = (L.W * stamp.z) / 2, hd = (L.H * stamp.z) / 2;
    stamp.w = G.stamp;
    const sb = u.uStampB!.value as THREE.Vector4;
    sb.set(hw, hd, stamp.x - hw - 0.03 + G.sweep * (2 * hw + 0.06), 0);
    (u.uStampGrid!.value as THREE.Vector2).set(L.c, L.r);
    // hand-off: where the imprint lies on screen, for the kumiko coming down
    if (G.press > 0 && G.press < 1 && G.layout === 'd') {
      const R = G.slot;
      tmp.set(stamp.x, 0, stamp.y).project(this.camera);
      const cx = R.x + (tmp.x * 0.5 + 0.5) * R.w, cy = R.y + (0.5 - tmp.y * 0.5) * R.h;
      tmp.set(stamp.x + stamp.z * 4, 0, stamp.y).project(this.camera);
      const px = Math.abs(R.x + (tmp.x * 0.5 + 0.5) * R.w - cx) / 4;
      const H = gardenHandoff;
      if (!H.live || Math.abs(H.cx - cx) > 0.5 || Math.abs(H.cy - cy) > 0.5 || Math.abs(H.pitch - px) > 0.01) {
        Object.assign(H, { cx, cy, pitch: px, live: true });
        this.stage?.requestFrame();
      }
    } else gardenHandoff.live = false;
    // re-rake sweep
    let more = this.pending.length > 0;
    if (this.sweep) {
      const k = this.sweep.dur > 0 ? Math.min(1, (performance.now() - this.sweep.t0) / this.sweep.dur) : 1;
      (u.uSweep!.value as THREE.Vector2).set(PLANE.minX + (PLANE.maxX - PLANE.minX) * smooth(k), k < 1 ? 1 : 0);
      more = more || k < 1;
    }
    return more;
  }

  private flushTrail(renderer: THREE.WebGLRenderer): void {
    const trail = this.trail;
    if (!trail) return;
    const sweeping = !!this.sweep;
    if (!this.needClear && !this.pending.length && !sweeping) return;
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(trail);
    if (this.needClear) { renderer.setClearColor(0x000000, 0); renderer.clear(true, false, false); this.needClear = false; }
    const sx = PLANE.maxX - PLANE.minX, sz = PLANE.maxZ - PLANE.minZ;
    const nx = (x: number) => ((x - PLANE.minX) / sx) * 2 - 1, nz = (z: number) => ((z - PLANE.minZ) / sz) * 2 - 1;
    if (this.pending.length) {
      const segs = this.pending.splice(0, MAX_SEGS);
      const P = this.strokePos, Lt = this.strokeLat;
      let v = 0;
      for (const [x0, z0, x1, z1] of segs) {
        const dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz) || 1;
        const ux = dx / len, uz = dz / len, ext = RAKE_W * 0.18;
        const ax = x0 - ux * ext, az = z0 - uz * ext, bx = x1 + ux * ext, bz = z1 + uz * ext;
        const ox = -uz * RAKE_W / 2, oz = ux * RAKE_W / 2;
        const quad: [number, number, number][] = [
          [ax - ox, az - oz, 0], [bx - ox, bz - oz, 0], [bx + ox, bz + oz, 1],
          [ax - ox, az - oz, 0], [bx + ox, bz + oz, 1], [ax + ox, az + oz, 1],
        ];
        for (const [x, z, l] of quad) { P[v * 3] = nx(x); P[v * 3 + 1] = nz(z); P[v * 3 + 2] = 0; Lt[v] = l; v++; }
      }
      this.strokeGeo.setDrawRange(0, v);
      (this.strokeGeo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      (this.strokeGeo.getAttribute('aLateral') as THREE.BufferAttribute).needsUpdate = true;
      renderer.render(this.strokeScene, this.strokeCam);
    }
    if (this.sweep) {
      const k = this.sweep.dur > 0 ? Math.min(1, (performance.now() - this.sweep.t0) / this.sweep.dur) : 1;
      const x = nx(PLANE.minX + sx * smooth(k));
      const a = this.clearGeo.getAttribute('position') as THREE.BufferAttribute;
      a.array.set([-1, -1, 0, x, -1, 0, x, 1, 0, -1, -1, 0, x, 1, 0, -1, 1, 0]);
      a.needsUpdate = true;
      renderer.render(this.clearMesh, this.strokeCam);
      if (k >= 1) { this.sweep = null; (this.sandMat!.uniforms.uSweep!.value as THREE.Vector2).set(0, 0); }
    }
    renderer.setRenderTarget(prev);
  }

  render(renderer: THREE.WebGLRenderer): void {
    this.flushTrail(renderer);
    renderer.render(this.scene, this.camera);
    // the stage may still adjust the camera's aspect before drawing: publish the stone tops from the final camera
    const e = this.camera.projectionMatrix.elements, c = this.camera.position;
    const sig = `${e[0]!.toFixed(4)}|${e[5]!.toFixed(4)}|${e[9]!.toFixed(4)}|${c.x.toFixed(4)}|${c.y.toFixed(4)}|${c.z.toFixed(4)}|${this.el.offsetWidth}`;
    if (sig !== this.pubSig) { this.pubSig = sig; this.publishStones(); }
  }

  park(): void {
    this.trail?.dispose();
    this.trail = null;
    if (this.sandMat) this.sandMat.uniforms.tTrail!.value = this.blank;
  }

  dispose(): void {
    this.offs.forEach((f) => f());
    this.ro?.disconnect();
    this.park();
    this.quad.dispose();
    this.grid?.dispose();
    this.rows?.dispose();
    this.stones?.geometry.dispose();
    this.sandMat?.dispose();
    this.stoneMat?.dispose();
    this.strokeGeo.dispose();
    this.clearGeo.dispose();
    this.blank.dispose();
    this.scene.clear();
  }

  onContextRestored(): void { this.trail = null; this.needClear = true; this.camKey = ''; }

  setOutline(): void { /* shared uOutline */ }

  setTier(t: Tier): void {
    if (!this.sandMat || !this.sand) return;
    this.detail = t.name === 'high' ? 2 : t.name === 'medium' ? 1 : 0;
    const u = this.sandMat.uniforms;
    u.uDetail!.value = this.detail;
    u.uDisplace!.value = t.counts.sandDisplace ? 1 : 0;
    if (t.counts.sandDisplace) {
      if (!this.grid) {
        const g = new THREE.PlaneGeometry(PLANE.maxX - PLANE.minX, PLANE.maxZ - PLANE.minZ, 256, 256);
        g.rotateX(-Math.PI / 2);
        g.translate((PLANE.maxX + PLANE.minX) / 2, 0, (PLANE.maxZ + PLANE.minZ) / 2);
        this.grid = g;
      }
      this.sand.geometry = this.grid;
    } else this.sand.geometry = this.quad;
    const size = t.counts.sandTrail || 256;
    if (this.trail && size !== this.trailSize) {
      // keep the strokes: the new target starts clear (a re-rake of sorts), the old one is freed
      this.trail.dispose();
      this.trail = null;
      void this.allocate(this.stage!);
    }
  }
}

const factory: ViewFactory = (el, ctx) => new GardenView(el, ctx);
export default factory;
export type { GardenView };
