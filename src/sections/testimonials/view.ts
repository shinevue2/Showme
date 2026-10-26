/**
 * View `testimonials-noren` — indigo cotton noren on CPU Verlet (DESIGN §6.9; *threejs* §g1). Owner: WP-10.
 *  - Three panels with slits, pinned along a cherry rod; grid per panel from the tier (14×24 … 6×10), structural +
 *    skip-one bend constraints (high/medium), fixed 1/60 s steps (≤ 3 per frame).
 *  - Cloth: MeshStandardMaterial, a canvas dye map — 藍 #0D5661 with uneven dye, darker 紺 hems, the visitor's print
 *    dyed in at mix(indigo, marble.rgb, 0.65·marble.a) across all three panels (ctx.print.marbling, else
 *    img/gen/default-print.webp), the crest 丸に三つ組子 resist-dyed in 胡粉 on the centre panel — and a woven
 *    plain-weave normal map.
 *  - Wind: gusts on arrival, scroll and pointer (value noise per row × uMotion); the pointer is a sphere collider
 *    that parts the strips. The sim sleeps once the cloth settles: zero frames at rest.
 *  - Night: cool moonlight and a warm lantern behind the cloth (relit, never inverted).
 *  - Band out: the camera dollies through the centre panel, the collider rides with it, the cloth fades after 0.8.
 *  - Reduced motion: a pre-solved still pose.
 */
import * as THREE from 'three';
import type { AppContext, StageAPI, Tier, View, ViewFrame } from '../../core/types';

const PANELS = 3;
const PW = 0.74, GAP = 0.03, LEN = 1.0;
const TOTAL_W = PANELS * PW + (PANELS - 1) * GAP;
const DT = 1 / 60;
const CAM_Z = 3;

export interface NorenView extends View {
  /** testimonials → contact band progress (0..1) */
  setBand(p: number): void;
  /** gentle gust (arrival, scroll) */
  gust(k: number): void;
}

class Cloth {
  n = 0; cols = 0; rows = 0;
  pos = new Float32Array(0); prev = new Float32Array(0); rest = new Float32Array(0);
  pinned = new Uint8Array(0);
  cons: Int32Array = new Int32Array(0); conLen = new Float32Array(0);
  iters = 4;
  build(cols: number, rows: number, iters: number, bend: boolean): void {
    this.cols = cols; this.rows = rows; this.iters = iters;
    const per = cols * rows;
    this.n = per * PANELS;
    this.pos = new Float32Array(this.n * 3);
    this.prev = new Float32Array(this.n * 3);
    this.rest = new Float32Array(this.n * 3);
    this.pinned = new Uint8Array(this.n);
    const dx = PW / (cols - 1), dy = LEN / (rows - 1);
    const c: number[] = [], l: number[] = [];
    for (let p = 0; p < PANELS; p++) {
      const x0 = -TOTAL_W / 2 + p * (PW + GAP);
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const k = p * per + j * cols + i;
        const x = x0 + i * dx, y = -j * dy;
        this.rest.set([x, y, 0], k * 3);
        if (j === 0) this.pinned[k] = 1;
        const add = (a: number, b: number, len: number) => { c.push(a, b); l.push(len); };
        if (i + 1 < cols) add(k, k + 1, dx);
        if (j + 1 < rows) add(k, k + cols, dy);
        if (bend && i + 2 < cols) add(k, k + 2, 2 * dx);
        if (bend && j + 2 < rows) add(k, k + 2 * cols, 2 * dy);
        if (i + 1 < cols && j + 1 < rows) add(k, k + cols + 1, Math.hypot(dx, dy));
      }
    }
    this.cons = Int32Array.from(c);
    this.conLen = Float32Array.from(l);
    this.pos.set(this.rest); this.prev.set(this.rest);
  }
  step(wind: (j: number, x: number, t: number) => number, t: number, sphere: THREE.Vector4 | null, g: number): number {
    const P = this.pos, O = this.prev, damp = 0.982, dt2 = DT * DT;
    let energy = 0;
    const per = this.cols * this.rows;
    for (let k = 0; k < this.n; k++) {
      if (this.pinned[k]) continue;
      const k3 = k * 3;
      const j = Math.floor((k % per) / this.cols);
      const wz = wind(j, P[k3]!, t);
      for (let a = 0; a < 3; a++) {
        const x = P[k3 + a]!;
        const v = (x - O[k3 + a]!) * damp;
        energy += v * v;
        const acc = a === 1 ? g : a === 2 ? wz : wz * 0.12;
        P[k3 + a] = x + v + acc * dt2;
        O[k3 + a] = x;
      }
      if (sphere) {
        const dx = P[k3]! - sphere.x, dy = P[k3 + 1]! - sphere.y, dz = P[k3 + 2]! - sphere.z;
        const d = Math.hypot(dx, dy, dz);
        if (d < sphere.w && d > 1e-6) { const s = sphere.w / d; P[k3] = sphere.x + dx * s; P[k3 + 1] = sphere.y + dy * s; P[k3 + 2] = sphere.z + dz * s; }
      }
    }
    const C = this.cons, L = this.conLen;
    for (let it = 0; it < this.iters; it++) {
      for (let q = 0; q < L.length; q++) {
        const a = C[2 * q]!, b = C[2 * q + 1]!;
        const a3 = a * 3, b3 = b * 3;
        const dx = P[b3]! - P[a3]!, dy = P[b3 + 1]! - P[a3 + 1]!, dz = P[b3 + 2]! - P[a3 + 2]!;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
        const wa = this.pinned[a] ? 0 : 1, wb = this.pinned[b] ? 0 : 1;
        const sum = wa + wb;
        if (!sum) continue;
        const s = (d - L[q]!) / d / sum;
        P[a3] = P[a3]! + dx * s * wa; P[a3 + 1] = P[a3 + 1]! + dy * s * wa; P[a3 + 2] = P[a3 + 2]! + dz * s * wa;
        P[b3] = P[b3]! - dx * s * wb; P[b3 + 1] = P[b3 + 1]! - dy * s * wb; P[b3 + 2] = P[b3 + 2]! - dz * s * wb;
      }
    }
    return energy;
  }
}

function vnoise1(x: number): number {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  const h = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  return h(i) * (1 - u) + h(i + 1) * u;
}

/** A small plain-weave normal map (warp and weft over / under). */
function weaveNormal(): THREE.DataTexture {
  const S = 64, T = 8;
  const d = new Uint8Array(S * S * 4);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const cx = Math.floor(x / T), cy = Math.floor(y / T);
    const fx = (x % T + 0.5) / T - 0.5, fy = (y % T + 0.5) / T - 0.5;
    const warp = (cx + cy) % 2 === 0;
    let nx = 0, ny = 0;
    if (warp) { nx = -fx * 1.3; ny = Math.sin(fy * Math.PI) * 0.25; } else { ny = -fy * 1.3; nx = Math.sin(fx * Math.PI) * 0.25; }
    const nz = Math.sqrt(Math.max(0.05, 1 - nx * nx - ny * ny));
    const q = (y * S + x) * 4;
    d[q] = (nx * 0.5 + 0.5) * 255; d[q + 1] = (ny * 0.5 + 0.5) * 255; d[q + 2] = (nz * 0.5 + 0.5) * 255; d[q + 3] = 255;
  }
  const t = new THREE.DataTexture(d, S, S, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(PANELS * 26, 34);
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}

const factory = (el: HTMLElement, ctx: AppContext): NorenView => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1.8, 0.05, 20);
  camera.position.set(0, -0.05, CAM_Z);
  const group = new THREE.Group();
  scene.add(group);
  const cloth = new Cloth();
  let stage: StageAPI | null = null;
  let tier: Tier = ctx.tier.current;
  let geo: THREE.BufferGeometry | null = null;
  let mesh: THREE.Mesh | null = null;
  let mat: THREE.MeshStandardMaterial | null = null;
  let dyeCanvas: HTMLCanvasElement | null = null;
  let dyeTex: THREE.CanvasTexture | null = null;
  let normalTex: THREE.DataTexture | null = null;
  let crestImg: HTMLImageElement | null = null;
  let defaultPrint: HTMLImageElement | null = null;
  const hemi = new THREE.HemisphereLight(0xffffff, 0xcfe3ea, 1.2);
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(-1.5, 2.2, 3);
  const lantern = new THREE.PointLight(0xffb26b, 0, 6, 1.6);
  lantern.position.set(0.55, -0.55, -0.7);
  scene.add(hemi, key, lantern);
  let acc = 0, simT = 0, gustK = 0.6, energy = 1, band = 0;
  const sphere = new THREE.Vector4();
  const ray = new THREE.Vector3();
  let bandSphere = false;

  /* ---------------------------------------------------------------- dye */
  function loadImg(rel: string): Promise<HTMLImageElement | null> {
    return new Promise((res) => {
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => res(im);
      im.onerror = () => res(null);
      im.src = ctx.assets.url(rel);
    });
  }
  function paintDye(): void {
    if (!dyeCanvas) return;
    const S = dyeCanvas.width;
    const g = dyeCanvas.getContext('2d')!;
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    g.fillStyle = '#0D5661';            // 藍 NC
    g.fillRect(0, 0, S, S);
    // uneven vat dyeing: low-frequency mottling, deeper along the hems
    const m = document.createElement('canvas');
    m.width = 24; m.height = 24;
    const mg = m.getContext('2d')!;
    const id = mg.createImageData(24, 24);
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 24 * 24; i++) { const v = 200 + rnd() * 55; id.data.set([v, v, v, 255], i * 4); }
    mg.putImageData(id, 0, 0);
    g.globalCompositeOperation = 'multiply';
    g.imageSmoothingEnabled = true;
    g.drawImage(m, 0, 0, S, S);
    g.globalCompositeOperation = 'source-over';
    // the visitor's print, dyed in across the three panels
    const marble = ctx.print.marbling.canvas ?? defaultPrint;
    if (marble) { g.globalAlpha = 0.65; g.drawImage(marble, 0, 0, S, S); g.globalAlpha = 1; }
    // hems: 紺 at top (the rod sleeve) and bottom
    g.fillStyle = '#0F2540';
    g.globalAlpha = 0.9;
    g.fillRect(0, 0, S, S * 0.07);
    g.fillRect(0, S * 0.982, S, S * 0.018);
    g.globalAlpha = 1;
    // the crest, resist-dyed (胡粉 with a faint indigo bleed) on the centre panel
    if (crestImg) {
      const cw = S / PANELS * 0.6, cx = S / 2 - cw / 2, cy = S * 0.2;
      const t = document.createElement('canvas');
      t.width = t.height = Math.ceil(cw);
      const tg = t.getContext('2d')!;
      tg.drawImage(crestImg, 0, 0, cw, cw);
      tg.globalCompositeOperation = 'source-in';
      tg.fillStyle = '#E6EEF0';
      tg.fillRect(0, 0, cw, cw);
      g.globalAlpha = 0.35;
      g.drawImage(t, cx - 2, cy - 2, cw + 4, cw + 4);
      g.globalAlpha = 1;
      tg.fillStyle = '#FFFFFB';
      tg.fillRect(0, 0, cw, cw);
      g.drawImage(t, cx, cy, cw, cw);
    }
    if (dyeTex) dyeTex.needsUpdate = true;
    stage?.requestFrame();
  }

  /* ---------------------------------------------------------------- geometry */
  function buildCloth(t: Tier): void {
    const { cols, rows, iters } = t.counts.noren;
    const bend = t.name === 'high' || t.name === 'medium';
    cloth.build(cols, rows, iters, bend);
    const per = cols * rows;
    const uv = new Float32Array(cloth.n * 2);
    const idx: number[] = [];
    for (let p = 0; p < PANELS; p++) for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const k = p * per + j * cols + i;
      uv[k * 2] = (p + i / (cols - 1)) / PANELS;
      uv[k * 2 + 1] = 1 - j / (rows - 1);
      if (i + 1 < cols && j + 1 < rows) idx.push(k, k + cols, k + 1, k + 1, k + cols, k + cols + 1);
    }
    geo?.dispose();
    geo = new THREE.BufferGeometry();
    const pa = new THREE.BufferAttribute(cloth.pos, 3);
    pa.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', pa);
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    if (mesh) mesh.geometry = geo;
    // a pre-solved hang (with a slight breeze so the folds read), also the reduced-motion pose
    for (let i = 0; i < 160; i++) cloth.step((j) => -0.12 * (j / rows), i * DT, null, -2.4);
    cloth.prev.set(cloth.pos);
    energy = 0;
    syncGeo();
  }
  function syncGeo(): void {
    if (!geo) return;
    (geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    geo.computeVertexNormals();
  }

  /* ---------------------------------------------------------------- view */
  const view: NorenView = {
    id: 'testimonials-noren', el, scene, camera, printName: '暖簾', vram: 2 * 1024 * 1024,
    async init(s) {
      stage = s;
      tier = s.tier;
      dyeCanvas = document.createElement('canvas');
      dyeCanvas.width = dyeCanvas.height = tier.name === 'high' ? 1024 : 768;
      dyeTex = new THREE.CanvasTexture(dyeCanvas);
      dyeTex.colorSpace = THREE.SRGBColorSpace;
      dyeTex.anisotropy = 4;
      normalTex = weaveNormal();
      mat = new THREE.MeshStandardMaterial({
        map: dyeTex, normalMap: normalTex, normalScale: new THREE.Vector2(0.55, 0.55),
        roughness: 0.93, metalness: 0, side: THREE.DoubleSide, transparent: true,
      });
      mat.name = 'noren:cloth';
      buildCloth(tier);
      mesh = new THREE.Mesh(geo!, mat);
      mesh.frustumCulled = false;
      group.add(mesh);
      const rod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, TOTAL_W + 0.26, 20).rotateZ(Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: new THREE.Color('#B35C37'), roughness: 0.55, metalness: 0 }),
      );
      rod.position.set(0, 0.012, 0.004);
      group.add(rod);
      const [crest, def] = await Promise.all([loadImg('img/gen/crest.svg'), loadImg('img/gen/default-print.webp')]);
      crestImg = crest; defaultPrint = def;
      paintDye();
      ctx.print.on('marbling', () => { paintDye(); view.gust(0.8); });
    },
    update(dt, _t, f: ViewFrame) {
      if (!geo || !mat) return false;
      const night = stage!.g.uNight.value;
      hemi.intensity = 1.25 - 0.85 * night;
      key.intensity = 1.6 - 1.15 * night;
      key.color.setRGB(1 - 0.25 * night, 1 - 0.15 * night, 1);
      lantern.intensity = 2.6 * night;
      // fit the noren to the doorway width (mobile)
      const visH = 2 * CAM_Z * Math.tan(THREE.MathUtils.degToRad(15));
      const visW = visH * camera.aspect;
      const sc = Math.min(1, (visW * 0.88) / TOTAL_W, (visH * 0.66) / LEN);
      group.scale.setScalar(sc);
      group.position.y = visH / 2 - 0.09 * sc;
      // band: dolly through the centre panel
      const bp = band;
      camera.position.z = CAM_Z - (CAM_Z + 0.6) * (bp * bp * (3 - 2 * bp));
      camera.position.y = -0.05 - 0.25 * bp;
      camera.lookAt(0, camera.position.y - 0.02, -1);
      mat.opacity = 1 - Math.min(1, Math.max(0, (bp - 0.8) / 0.2));
      const motionOn = ctx.motion.enabled;
      if (!motionOn) return false;
      // stimuli
      if (Math.abs(f.scrollVelocity) > 50) gustK = Math.min(1, gustK + Math.abs(f.scrollVelocity) / 9000);
      let sph: THREE.Vector4 | null = null;
      if (f.pointer) {
        ray.set(f.pointer.x, f.pointer.y, 0.5).unproject(camera).sub(camera.position).normalize();
        const tz = -camera.position.z / ray.z;
        const wx = (camera.position.x + ray.x * tz - group.position.x) / sc, wy = (camera.position.y + ray.y * tz - group.position.y) / sc;
        sph = sphere.set(wx, wy, 0.04, 0.15);
        gustK = Math.max(gustK, 0.15);
      }
      bandSphere = bp > 0.02 && bp < 1;
      if (bandSphere) sph = sphere.set(0, (camera.position.y - group.position.y) / sc, (camera.position.z - 0.25) / sc, 0.5 / sc);
      const wind = (j: number, x: number, t: number) => {
        const row = j / (cloth.rows - 1);
        return -gustK * 1.6 * row * (0.35 + vnoise1(t * 0.9 + j * 0.18 + x * 1.7));
      };
      acc = Math.min(acc + dt, DT * 3);
      let steps = 0;
      while (acc >= DT) { energy = cloth.step(wind, simT, sph, -2.4); simT += DT; acc -= DT; steps++; }
      if (steps) syncGeo();
      gustK *= Math.exp(-dt / 1.4);
      if (gustK < 0.004) gustK = 0;
      return energy > 2e-7 || gustK > 0 || !!f.pointer || bandSphere;
    },
    render(r) { r.render(scene, camera); },
    park() { /* CPU cloth only: nothing large on the GPU besides the dye */ },
    dispose() {
      geo?.dispose(); mat?.dispose(); dyeTex?.dispose(); normalTex?.dispose();
      scene.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose?.(); (m.material as THREE.Material | undefined)?.dispose?.(); });
    },
    onContextRestored() { paintDye(); },
    setOutline(on) { if (mat) { mat.wireframe = on; stage?.requestFrame(); } },
    setTier(t) {
      const a = tier.counts.noren, b = t.counts.noren;
      tier = t;
      if (a.cols !== b.cols || a.rows !== b.rows || a.iters !== b.iters) buildCloth(t);
      stage?.requestFrame();
    },
    setBand(p) { band = p; stage?.requestFrame(); },
    gust(k) { gustK = Math.min(1, gustK + k); stage?.requestFrame(); },
  };
  return view;
};

export default factory;
