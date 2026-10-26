/**
 * The traveller (DESIGN §7.2, owner WP-03): the same small figure in every chapter (異時同図法).
 * He walks in along his authored path as the camera arrives, stands at rest, and walks on as it leaves.
 * Pose alternates walk-a / walk-b every 6 frames (30 fps; 5 at 24 fps) while moving, 1.5 % bob.
 */
import * as THREE from 'three';
import type { StationGeom } from './tatebanko';
import { D, orderOf } from './tatebanko';
import { PLATE_VERT } from './wipe.glsl';
import { clamp01, smoother, type VariantSpec } from './timeline';

const FRAG = /* glsl */ `
precision highp float;
uniform sampler2D map;
uniform float uCell;
uniform float uOpacity;
varying vec2 vUv;
varying vec2 vCanvas;
void main() {
  vec4 c = texture2D(map, vec2((uCell + vUv.x) * 0.25, vUv.y));
  gl_FragColor = c * uOpacity;
}
`;

function arc(path: readonly [number, number][], aspect: number): { pts: [number, number][]; cum: number[]; total: number } {
  const cum = [0];
  for (let i = 1; i < path.length; i++) {
    const dx = (path[i]![0] - path[i - 1]![0]) * aspect, dy = path[i]![1] - path[i - 1]![1];
    cum.push(cum[i - 1]! + Math.hypot(dx, dy));
  }
  return { pts: path.slice() as [number, number][], cum, total: cum[cum.length - 1]! };
}

function along(a: ReturnType<typeof arc>, t: number): [number, number] {
  const s = clamp01(t) * a.total;
  for (let i = 1; i < a.pts.length; i++) {
    if (s <= a.cum[i]! || i === a.pts.length - 1) {
      const seg = (s - a.cum[i - 1]!) / Math.max(1e-9, a.cum[i]! - a.cum[i - 1]!);
      const p = a.pts[i - 1]!, q = a.pts[i]!;
      return [p[0] + (q[0] - p[0]) * seg, p[1] + (q[1] - p[1]) * seg];
    }
  }
  return a.pts[0]!;
}

export class Traveller {
  readonly mesh: THREE.Mesh;
  private mat: THREE.ShaderMaterial;
  private geo: THREE.BufferGeometry;
  constructor(readonly spec: VariantSpec, readonly stations: readonly StationGeom[], texture: THREE.Texture) {
    this.mat = new THREE.ShaderMaterial({
      vertexShader: PLATE_VERT, fragmentShader: FRAG, transparent: true, premultipliedAlpha: true,
      depthTest: false, depthWrite: false,
      uniforms: { map: { value: texture }, uCell: { value: 2 }, uOpacity: { value: 1 } },
    });
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(12), 3));
    this.geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2));
    this.geo.setAttribute('canvasUv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2));
    this.geo.setIndex([0, 1, 2, 2, 1, 3]);
    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
  }

  /** Which station he is in at frame f, and where along its path (param, moving?). */
  private state(f: number): { s: number; t: number; moving: boolean } | null {
    const spec = this.spec;
    const R = spec.rest;
    // arrival: during the last 42 % of the incoming travel; departure: the first 30 % of the outgoing one
    const inArr = (k: number) => {
      if (k === 0) return null;
      const a = R[k - 1]!, b = R[k]!;
      const u = (f - a) / (b - a);
      return u >= 0.58 && u <= 1 ? (u - 0.58) / 0.42 : null;
    };
    const depEnd = (k: number) => (k < 6 ? R[k]! + (R[k + 1]! - R[k]!) * 0.32 : R[6]! + (spec.frames - 1 - R[6]!) * 0.5);
    const tr = this.stations;
    for (let k = 0; k < 7; k++) {
      const tv = tr[k]?.rec.traveller;
      if (!tv) continue;
      const restT = spec.variant === 'portrait' && tv.restPortrait !== undefined ? tv.restPortrait : tv.rest;
      const ARR = 0.16, DEP = 0.14;   // fraction of the path walked in / out
      const a = inArr(k);
      if (a !== null && f < R[k]!) {
        const e = smoother(0, 1, a) * 0.5 + a * 0.5;        // walks in, slowing to a stop at the rest frame
        return { s: k, t: restT - ARR * (1 - e), moving: a < 0.97 };
      }
      if (f >= R[k]! && f <= depEnd(k)) {
        const span = depEnd(k) - R[k]!;
        const d = (f - R[k]!) / span;
        const e = d * d;                                     // starts from standing
        return { s: k, t: restT + DEP * e, moving: d > 0.04 };
      }
    }
    return null;
  }

  update(f: number): void {
    const st = this.state(f);
    if (!st) { this.mesh.visible = false; return; }
    const g = this.stations[st.s]!;
    const tv = g.rec.traveller!;
    const portrait = this.spec.variant === 'portrait';
    const a = arc(portrait && tv.pathPortrait ? tv.pathPortrait : tv.path, g.rec.aspect);
    const [u, v] = along(a, st.t);
    const z = portrait && tv.zPortrait !== undefined ? tv.zPortrait : tv.z;
    const s = (D - z) / D;
    const h = tv.height * g.restFrameHeight() * s;
    const w = h * (200 / 300);
    const foot = g.world(u, v, z);
    const walkEvery = this.spec.walkEvery;
    const step = Math.floor(f / walkEvery) % 2;
    const carried = tv.pose === 'carried';
    const cell = carried ? 3 : st.moving ? step : 2;
    const bob = st.moving ? 0.015 * h * Math.abs(Math.sin((Math.PI * f) / walkEvery)) : 0;
    const p = this.geo.getAttribute('position') as THREE.BufferAttribute;
    const x0 = foot.x - w / 2, x1 = foot.x + w / 2, y0 = foot.y + bob - h * 0.02, y1 = y0 + h;
    p.setXYZ(0, x0, y0, z); p.setXYZ(1, x1, y0, z); p.setXYZ(2, x0, y1, z); p.setXYZ(3, x1, y1, z);
    p.needsUpdate = true;
    this.mat.uniforms.uCell!.value = cell;
    this.mesh.renderOrder = orderOf(z) + 2;
    this.mesh.visible = true;
  }
}
