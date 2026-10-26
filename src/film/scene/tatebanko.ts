/**
 * Tatebanko dioramas (DESIGN §7.2, owner WP-03): each station is 5–9 cut-paper plates standing at z ∈ [−12, 0],
 * unlit and flat (a print, not a render). Every plate is scaled about the station's design eye (the landscape
 * rest camera) so that at rest the diorama projects exactly as the flat print; parallax appears only when the
 * camera moves. Plates carry a ≤ 2 % paper curl (displaced along the eye ray, so the rest view is unchanged),
 * a soft contact shadow, and two impressions (P_k / P_{k-1}) for the baren wipe.
 */
import * as THREE from 'three';
import type { PlatesJson, StationRecord, PlateLayer } from './types';
import { FLAT_FRAG, PLATE_FRAG, PLATE_VERT, SHADOW_FRAG, SKY_FRAG } from './wipe.glsl';
import { mulberry32, type Variant } from './timeline';
import { buildRestMist, type MistConfig, type RestMist } from './rest-mist';

export const D = 20;            // design eye distance from the z = 0 plane
export const PRINT_W = 16;      // world width of every print (its crop) on the z = 0 plane
export const SPACING = 40;      // stations along −x (emaki / Tōkaidō reading direction)
export const SHADOW_ALPHA = 0.1;

export const hexToRgb = (h: string): [number, number, number] => {
  const s = h.replace('#', '');
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
};
const rgb01 = (c: readonly number[]): THREE.Vector3 => new THREE.Vector3(c[0]! / 255, c[1]! / 255, c[2]! / 255);

export class StationGeom {
  readonly X: number;
  readonly Wc: number;
  readonly Hc: number;
  readonly eye: THREE.Vector3;
  constructor(readonly rec: StationRecord, readonly index: number) {
    this.X = -SPACING * index;
    this.Wc = PRINT_W / rec.print[2];
    this.Hc = this.Wc / rec.aspect;
    this.eye = new THREE.Vector3(this.X + (rec.rest.cx - 0.5) * this.Wc, (0.5 - rec.rest.cy) * this.Hc, D);
  }
  /** canvas (u, v-down) → point on the design plane z = 0 */
  design(u: number, v: number): THREE.Vector3 {
    return new THREE.Vector3(this.X + (u - 0.5) * this.Wc, (0.5 - v) * this.Hc, 0);
  }
  /** canvas (u, v) at depth z, scaled about the design eye so it projects onto design(u, v) from the eye */
  world(u: number, v: number, z: number, out = new THREE.Vector3()): THREE.Vector3 {
    const q = this.design(u, v);
    const s = (D - z) / D;
    return out.set(this.eye.x + (q.x - this.eye.x) * s, this.eye.y + (q.y - this.eye.y) * s, z);
  }
  /** rest camera pose for a variant */
  restPose(variant: Variant, aspect: number): { x: number; y: number; z: number; fov: number } {
    const p = variant === 'landscape' ? this.rec.rest : this.rec.restPortrait;
    const fw = p.w * this.Wc;                                 // frame width on the z = 0 plane
    const fov = THREE.MathUtils.radToDeg(2 * Math.atan(fw / (2 * D) / aspect));
    return { x: this.X + (p.cx - 0.5) * this.Wc, y: (0.5 - p.cy) * this.Hc, z: D, fov };
  }
  /** frame height on the z = 0 plane at the landscape rest */
  restFrameHeight(): number {
    return (this.rec.rest.w * this.Wc) * 9 / 16;
  }
}

function plateGeometry(g: StationGeom, layer: PlateLayer, zOff: number, dxy: [number, number], curlSeed: number): THREE.BufferGeometry {
  const [rx, ry, rw, rh] = layer.rect;
  const [sx0, sw] = layer.span ?? [rx, rw];
  const SX = Math.max(8, Math.round(28 * rw / sw)), SY = 6;
  const rng = mulberry32(curlSeed);
  const amp = layer.curl * g.Wc * (rng() < 0.5 ? -1 : 1);
  const phase = 0.35 + rng() * 0.3;
  const pos: number[] = [], uv: number[] = [], cuv: number[] = [], idx: number[] = [];
  const v3 = new THREE.Vector3();
  for (let j = 0; j <= SY; j++) {
    for (let i = 0; i <= SX; i++) {
      const tx = i / SX, ty = j / SY;
      const u = rx + tx * rw, v = ry + ty * rh;
      // a gentle bow across the whole layer (≤ 2 % of the canvas width), evaluated in canvas space so the
      // tiles of a wide layer join seamlessly
      const t = (u - sx0) / sw;
      const bow = Math.sin(Math.PI * Math.min(1, Math.max(0, t - phase + 0.5)));
      const z = layer.z + zOff + amp * bow;
      g.world(u + dxy[0] / g.Wc, v - dxy[1] / g.Hc, z, v3);
      pos.push(v3.x, v3.y, v3.z);
      uv.push(tx, 1 - ty);
      cuv.push(u, v);
    }
  }
  for (let j = 0; j < SY; j++) {
    for (let i = 0; i < SX; i++) {
      const a = j * (SX + 1) + i, b = a + 1, c = a + SX + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute('canvasUv', new THREE.Float32BufferAttribute(cuv, 2));
  geo.setIndex(idx);
  return geo;
}

function quadGeometry(g: StationGeom, u0: number, v0: number, u1: number, v1: number, z: number): THREE.BufferGeometry {
  const pos: number[] = [], uv: number[] = [], cuv: number[] = [];
  const v3 = new THREE.Vector3();
  const corners: [number, number, number, number][] = [[u0, v1, 0, 0], [u1, v1, 1, 0], [u0, v0, 0, 1], [u1, v0, 1, 1]];
  for (const [u, v, s, t] of corners) {
    g.world(u, v, z, v3);
    pos.push(v3.x, v3.y, v3.z);
    uv.push(s, t);
    cuv.push(u, v);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute('canvasUv', new THREE.Float32BufferAttribute(cuv, 2));
  geo.setIndex([0, 1, 2, 2, 1, 3]);
  return geo;
}

export const orderOf = (z: number): number => Math.round((z + 30) * 100);

interface LayerObj { layer: PlateLayer; mesh: THREE.Mesh; mat: THREE.ShaderMaterial; shadow: THREE.Mesh; shadowMat: THREE.ShaderMaterial }

export class StationScene {
  readonly group = new THREE.Group();
  readonly geom: StationGeom;
  readonly layers: LayerObj[] = [];
  readonly sky: { mesh: THREE.Mesh; mat: THREE.ShaderMaterial };
  frameLine: THREE.Group | null = null;
  readonly restMist: RestMist;
  private textures: THREE.Texture[] = [];
  private loading: Promise<void> | null = null;
  loaded = false;

  constructor(readonly plates: PlatesJson, readonly rec: StationRecord, readonly index: number, readonly base: string,
              readonly variant: Variant, readonly aspect: number) {
    this.geom = new StationGeom(rec, index);
    const g = this.geom;
    const paper = rgb01(plates.paper);
    // sky — procedural bokashi far behind the plates
    const sky = rec.sky;
    const stopY = new Array<number>(8).fill(2);
    const stopK = new Array<THREE.Vector3>(8).fill(paper).map((v) => v.clone());
    const stopP = new Array<THREE.Vector3>(8).fill(paper).map((v) => v.clone());
    const col = (pl: number, amt: number): THREE.Vector3 => {
      if (!pl || !amt) return paper.clone();
      const c = rgb01(hexToRgb(plates.plates[pl - 1]!));
      return paper.clone().lerp(c, amt);
    };
    sky.stops.forEach((s, i) => { stopY[i] = s[0]; stopK[i] = col(s[1], s[2]); });
    (sky.stopsPrev ?? sky.stops).forEach((s, i) => { stopP[i] = col(s[1], s[2]); });
    const skyMat = new THREE.ShaderMaterial({
      vertexShader: PLATE_VERT, fragmentShader: SKY_FRAG, transparent: true, premultipliedAlpha: true,
      depthTest: false, depthWrite: false,
      uniforms: {
        uStopY: { value: stopY }, uStopK: { value: stopK }, uStopP: { value: stopP }, uCount: { value: sky.stops.length },
        uWipe: { value: 1 }, uHasP: { value: sky.stopsPrev ? 1 : 0 }, uOpacity: { value: 1 },
      },
    });
    const sz = sky.z ?? -12.5;
    // the sky spans ±28 world units about the rest framing (±16 about the portrait rest): at its depth the moving
    // landscape frame of the widest framing (Hara, zoomed out under the desktop chrome) needs ±21. Stations stand
    // 40 units apart, but only one is ever drawn (film-scene.ts swaps them behind the crossing veil), so a wide
    // sky never shows in a neighbour's frames
    // world x at the sky's depth → canvas u (quads are scaled about the design eye, see StationGeom.world)
    const ss = (D - sz) / D;
    const uAt = (wx: number) => 0.5 + ((wx - g.eye.x) / ss + g.eye.x - g.X) / g.Wc;
    const px = g.X + (rec.restPortrait.cx - 0.5) * g.Wc;
    const skyMesh = new THREE.Mesh(quadGeometry(g, uAt(Math.min(g.eye.x - 28, px - 16)), -1.6, uAt(Math.max(g.eye.x + 28, px + 16)), 1.9, sz), skyMat);
    skyMesh.renderOrder = orderOf(sz) - 50;
    skyMesh.frustumCulled = false;
    this.group.add(skyMesh);
    this.sky = { mesh: skyMesh, mat: skyMat };
    // plates
    const ink = rgb01(hexToRgb(plates.plates[0]!));
    rec.layers.forEach((layer, li) => {
      const mat = new THREE.ShaderMaterial({
        vertexShader: PLATE_VERT, fragmentShader: PLATE_FRAG, transparent: true, premultipliedAlpha: true,
        depthTest: false, depthWrite: false,
        uniforms: {
          mapK: { value: null }, mapP: { value: null }, uHasP: { value: layer.p ? 1 : 0 }, uWipe: { value: 1 },
          uOpacity: { value: 1 }, uAlphaCut: { value: layer.stencil ? 0.04 : 0.0 },
        },
      });
      if (layer.stencil) {
        mat.stencilWrite = true;
        mat.stencilRef = 1;
        mat.stencilFunc = THREE.AlwaysStencilFunc;
        mat.stencilZPass = THREE.ReplaceStencilOp;
        mat.stencilZFail = THREE.ReplaceStencilOp;
        mat.stencilFail = THREE.KeepStencilOp;
      }
      const seed = 9001 + index * 131 + (layer.seed ?? li * 17);
      const mesh = new THREE.Mesh(plateGeometry(g, layer, 0, [0, 0], seed), mat);
      mesh.renderOrder = orderOf(layer.z);
      mesh.frustumCulled = false;
      // a faint contact shadow (plate 1 at a few %) behind every standing plate; far plates cast none
      const shadowAlpha = layer.shadowAlpha > 0 ? layer.shadowAlpha : layer.z > -10.5 ? SHADOW_ALPHA : 0;
      const shadowMat = new THREE.ShaderMaterial({
        vertexShader: PLATE_VERT, fragmentShader: SHADOW_FRAG, transparent: true, premultipliedAlpha: true,
        depthTest: false, depthWrite: false,
        uniforms: { map: { value: null }, uColor: { value: ink }, uOpacity: { value: shadowAlpha } },
      });
      // contact shadow: a soft strip at the plate's foot, just behind it and a touch lower
      const off: [number, number] = [0.0, -0.05 * (1 - layer.z / 14)];
      const shadow = new THREE.Mesh(plateGeometry(g, layer, -0.06, off, seed), shadowMat);
      shadow.renderOrder = mesh.renderOrder - 1;
      shadow.frustumCulled = false;
      shadow.visible = shadowAlpha > 0;
      this.group.add(shadow, mesh);
      this.layers.push({ layer, mesh, mat, shadow, shadowMat });
    });
    if (rec.extras.frameLine) this.frameLine = this.buildFrameLine(ink);
    const mcfg = (variant === 'landscape' ? rec.extras.mist : rec.extras.mistPortrait) as MistConfig | undefined;
    this.restMist = buildRestMist(g, variant, aspect, mcfg, 5150 + index * 71 + (variant === 'portrait' ? 7 : 0), paper, ink);
    this.group.add(this.restMist.group);
    this.group.visible = false;
  }

  /**
   * Hara: a 2 px key-line rectangle (plate 1) at z +0.5, inset 6 % of the rest frame height, or by
   * `extras.frameLineInset` (portrait: its top edge sits lower, under the caption zone). Only the top edge is masked by Fuji's plate (stencil), so the peak
   * breaks the frame line — the one Fuji on the site.
   */
  private buildFrameLine(ink: THREE.Vector3): THREE.Group {
    const g = this.geom;
    const grp = new THREE.Group();
    const pose = g.restPose(this.variant, this.aspect);
    // the line stands just behind the nearest figures (they step over it, as Fuji's peak breaks its top edge)
    const z = typeof this.rec.extras.frameZ === 'number' ? this.rec.extras.frameZ : 0.5;
    const s = (D - z) / D;
    const fh = 2 * D * Math.tan(THREE.MathUtils.degToRad(pose.fov) / 2) * s;
    const fw = fh * this.aspect;
    const pxH = this.variant === 'landscape' ? 1080 : 1920;
    const lw = (3 / pxH) * fh;                                     // 3 px at the master → 2 px at 720p
    const inset = 0.06 * Math.min(fw, fh);
    // landscape insets [top, sides, bottom] (fractions of the frame height / width / height): the site lays the
    // desktop chrome over the film (document bar + ruler ≈ 7 % at the top, rulers at the left) and crops it with
    // object-fit: cover (≈ 5 % a side at 16:10), so the line and the peak that breaks it sit inside that margin
    const ins = this.rec.extras.frameLineInset as [number, number, number] | undefined;
    const topFrac = this.variant === 'portrait' ? (this.rec.extras.frameLinePortraitTop ?? 0.06) : (ins?.[0] ?? 0.06);
    const side = this.variant === 'landscape' && ins ? ins[1] * fw : inset;
    const bottom = this.variant === 'landscape' && ins ? ins[2] * fh : inset;
    // camera-centred at the rest pose; at depth z the frame scales about the camera axis
    const x0 = pose.x - fw / 2 + side, x1 = pose.x + fw / 2 - side;
    const y1 = pose.y + fh / 2 - topFrac * fh, y0 = pose.y - fh / 2 + bottom;
    const make = (stencil: boolean) => {
      const mat = new THREE.ShaderMaterial({
        vertexShader: PLATE_VERT, fragmentShader: FLAT_FRAG, transparent: true, premultipliedAlpha: true,
        depthTest: false, depthWrite: false, uniforms: { uColor: { value: ink }, uOpacity: { value: 1 } },
      });
      if (stencil) {
        mat.stencilWrite = true;
        mat.stencilRef = 1;
        mat.stencilFunc = THREE.NotEqualStencilFunc;
        mat.stencilFail = THREE.KeepStencilOp;
        mat.stencilZFail = THREE.KeepStencilOp;
        mat.stencilZPass = THREE.KeepStencilOp;
        mat.stencilWriteMask = 0;
      }
      return mat;
    };
    const top = make(true), rest = make(false);
    const rect = (ax: number, ay: number, bx: number, by: number, mat: THREE.ShaderMaterial) => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute([ax, ay, z, bx, ay, z, ax, by, z, bx, by, z], 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2));
      geo.setAttribute('canvasUv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2));
      geo.setIndex([0, 1, 2, 2, 1, 3]);
      const m = new THREE.Mesh(geo, mat);
      m.renderOrder = orderOf(z) + 5;
      m.frustumCulled = false;
      grp.add(m);
    };
    rect(x0 - lw / 2, y1 - lw / 2, x1 + lw / 2, y1 + lw / 2, top);
    rect(x0 - lw / 2, y0 - lw / 2, x1 + lw / 2, y0 + lw / 2, rest);
    rect(x0 - lw / 2, y0 - lw / 2, x0 + lw / 2, y1 - lw / 2, rest);
    rect(x1 - lw / 2, y0 - lw / 2, x1 + lw / 2, y1 - lw / 2, rest);
    this.group.add(grp);
    return grp;
  }

  load(): Promise<void> {
    if (this.loaded) return Promise.resolve();
    if (this.loading) return this.loading;
    const loader = new THREE.TextureLoader();
    const dir = `${this.base}plates/${this.rec.station}/`;
    const get = (file: string, premult: boolean) => new Promise<THREE.Texture>((res, rej) => {
      loader.load(dir + file, (t) => {
        t.colorSpace = THREE.NoColorSpace;
        t.premultiplyAlpha = premult;
        t.generateMipmaps = true;
        t.minFilter = THREE.LinearMipmapLinearFilter;
        t.magFilter = THREE.LinearFilter;
        t.anisotropy = 4;
        t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
        this.textures.push(t);
        res(t);
      }, undefined, rej);
    });
    this.loading = (async () => {
      // sequential: deterministic upload order, modest peak memory
      for (const o of this.layers) {
        if (o.layer.k) o.mat.uniforms.mapK!.value = await get(o.layer.k, true);
        if (o.layer.p) o.mat.uniforms.mapP!.value = await get(o.layer.p, true);
        else o.mat.uniforms.mapP!.value = o.mat.uniforms.mapK!.value;
        o.shadowMat.uniforms.map!.value = await get(o.layer.shadow, false);
      }
      this.loaded = true;
      this.loading = null;
    })();
    return this.loading;
  }

  unload(): void {
    for (const t of this.textures) t.dispose();
    this.textures = [];
    for (const o of this.layers) {
      o.mat.uniforms.mapK!.value = null;
      o.mat.uniforms.mapP!.value = null;
      o.shadowMat.uniforms.map!.value = null;
    }
    this.loaded = false;
    this.group.visible = false;
  }

  setWipe(w: number): void {
    this.sky.mat.uniforms.uWipe!.value = w;
    for (const o of this.layers) o.mat.uniforms.uWipe!.value = w;
  }
}
