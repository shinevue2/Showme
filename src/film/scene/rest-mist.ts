/**
 * すやり霞 at rest (DESIGN §7.1 "calm rest frames with negative space"; owner WP-03).
 * Each diorama carries a bank of horizontal mist bands in front of it (z = +0.5), composed against its rest
 * camera: the right ~30 % of the landscape rest frame (where the ja vertical caption and the en/zh caption block
 * sit), the top ~30 % of the portrait rest frame.
 *
 * The bands are flat paper with crisp edges, as a printer leaves a mist band uncut on the block. Their ends are
 * long half-ellipses (horizontal semi-axis = 1.9 × the vertical one, the 槍 "spear" ends of すやり霞), and the
 * ends step in a fixed rhythm, so the bank's edge reads as painted cloud bands, not as a ragged wall. A few thin
 * strands reach further into the scene (authored per station in the mask JSON, `extras.mist.strands`).
 * They are world-space plates, so they arrive and leave with their diorama (parallax, no screen overlay).
 */
import * as THREE from 'three';
import type { StationGeom } from './tatebanko';
import { D, orderOf } from './tatebanko';
import { mulberry32, type Variant } from './timeline';

const VERT = /* glsl */ `
varying vec2 vLocal;
uniform vec2 uSize;
void main() {
  vLocal = (uv - 0.5) * uSize;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/** Band with half-ellipse ends: semi-axes (uRx, uRy), cap centres at uSpan.x / uSpan.y (local x). */
const FRAG = /* glsl */ `
precision highp float;
uniform float uRy;
uniform float uRx;
uniform vec2 uSpan;
uniform vec3 uColor;
uniform float uOpacity;
varying vec2 vLocal;
void main() {
  float cx = clamp(vLocal.x, uSpan.x, uSpan.y);
  vec2 q = vec2((vLocal.x - cx) / uRx, vLocal.y / uRy);
  float f = length(q) - 1.0;
  float w = max(fwidth(f), 1e-5);
  float a = 1.0 - smoothstep(-0.5 * w, 0.5 * w, f);
  if (a <= 0.0) discard;
  gl_FragColor = vec4(uColor * a * uOpacity, a * uOpacity);
}
`;

export interface MistConfig {
  /** landscape: mean frame-x of the bank's band ends, default 0.70 */
  x0?: number;
  /** portrait: frame-y of the bank's lower edge, default 0.34 (the fully calm paper reaches ≈ 0.27–0.32) */
  y1?: number;
  /** thin strands reaching into the scene: [frame-y of the strand centre, frame-x of its tapered end] */
  strands?: [number, number][];
  /** band height scale (landscape), default 1 */
  scale?: number;
  /** start index into the stepping rhythm (landscape), default: the station seed */
  phase?: number;
  off?: boolean;
}

export interface MistBand { x0: number; x1: number; y: number; h: number; taper: number; kind: 'tier' | 'core' | 'strand' }

/** the bank in frame coordinates (y down) — exported for the review tools */
export function restMistBands(variant: Variant, cfg: MistConfig | undefined, seed: number): MistBand[] {
  const rng = mulberry32(seed);
  const bands: MistBand[] = [];
  if (variant === 'landscape') {
    const X0 = cfg?.x0 ?? 0.72;
    const S = cfg?.scale ?? 1;
    // few, broad tiers with long ends, stepping in a fixed rhythm (frame widths: 0 = the bank's outer edge X0,
    // negative = reaching further into the scene): a calm cloud bank, not a ragged wall
    const RHYTHM: [number, number][] = [[0.27, 0.0], [0.22, -0.1], [0.3, 0.025], [0.2, -0.15], [0.28, -0.035], [0.24, -0.085]];
    const r0 = (cfg?.phase ?? seed) % RHYTHM.length;
    let y = -0.08 - rng() * 0.03;
    let i = 0;
    while (y < 1.02) {
      const [h0, dx] = RHYTHM[(r0 + i) % RHYTHM.length]!;
      const h = h0 * S * (0.94 + rng() * 0.12);
      bands.push({ x0: X0 + dx + (rng() - 0.5) * 0.01, x1: 2.0, y, h, taper: 2.6, kind: 'tier' });
      y += h * 0.78;
      i++;
    }
    // a solid core behind the ends (the bank never shows a gap, whatever the stepping)
    bands.push({ x0: X0 + 0.08, x1: 2.0, y: -0.3, h: 1.6, taper: 0, kind: 'core' });
    for (const [yc, xs] of cfg?.strands ?? []) bands.push({ x0: xs, x1: 2.0, y: yc - 0.014, h: 0.028, taper: 3.2, kind: 'strand' });
  } else {
    // portrait: the top of the frame is one closed bank; its lower edge steps down in bands reaching in from
    // alternate sides, each shorter than the one above
    const Y1 = cfg?.y1 ?? 0.34;
    bands.push({ x0: -0.6, x1: 1.6, y: -1.6, h: Y1 + 1.6 - 0.1, taper: 0, kind: 'core' });
    const flipAll = (seed & 1) === 1;
    // [from the left, reach, top, bottom] (top / bottom relative to Y1): two tiers hide the core's edge, two more
    // step down from alternate sides, so the bank's lower edge is a run of straight band edges and long ends
    const rows: [boolean, number, number, number][] = [
      [true, 0.74, -0.125, -0.06], [false, 0.6, -0.12, -0.085], [false, 0.44, -0.09, -0.03], [true, 0.36, -0.06, 0.02],
    ];
    for (const [l0, reach0, t, bt] of rows) {
      const reach = reach0 + (rng() - 0.5) * 0.04;
      const fromLeft = flipAll ? !l0 : l0;
      const y = Y1 + t, h = bt - t;
      bands.push(fromLeft ? { x0: -0.6, x1: reach, y, h, taper: 2.6, kind: 'tier' } : { x0: 1 - reach, x1: 1.6, y, h, taper: 2.6, kind: 'tier' });
    }
    for (const [yc, xs] of cfg?.strands ?? []) bands.push({ x0: -0.6, x1: xs, y: yc - 0.008, h: 0.016, taper: 2.8, kind: 'strand' });
  }
  return bands;
}

export interface RestMist {
  readonly group: THREE.Group;
  /**
   * Arrival of the diorama (travel progress u of the segment that ends at its rest, or null when it is not
   * arriving): until u = 0.5 the bank is drawn out over the whole frame (it takes over from the departing
   * crossing cards, paper on paper, so no gap opens between them and the bank); from u = 0.5,
   * when the cards have gone, its tiers withdraw to their rest places (landscape: to the right, lowest tier first;
   * portrait: the whole bank lifts), uncovering the scene. At u = 1 (the rest frame) every tier is home.
   */
  setArrival(u: number | null): void;
}

export function buildRestMist(g: StationGeom, variant: Variant, aspect: number, cfg: MistConfig | undefined, seed: number,
                              paper: THREE.Vector3, _ink: THREE.Vector3): RestMist {
  const grp = new THREE.Group();
  // a station without a bank at rest (Hara portrait: its sky is the picture) still needs one to arrive behind:
  // the bank then rests just above the frame and lifts out of it
  const hidden = !!cfg?.off;
  if (hidden && variant === 'landscape') return { group: grp, setArrival() {} };
  if (hidden) cfg = { ...cfg, off: false, y1: -0.03 };
  const pose = g.restPose(variant, aspect);
  const z = 0.5;
  const s = (D - z) / D;
  const fh = 2 * D * Math.tan(THREE.MathUtils.degToRad(pose.fov) / 2) * s;
  const fw = fh * aspect;
  const toWorld = (fx: number, fy: number): [number, number] => [pose.x + (fx - 0.5) * fw, pose.y + (0.5 - fy) * fh];
  const items: { m: THREE.Mesh; home: THREE.Vector3; kind: MistBand['kind']; start: number; y: number }[] = [];
  restMistBands(variant, cfg, seed).forEach((b, i) => {
    const [ax, ay] = toWorld(b.x0, b.y);
    const [bx, by] = toWorld(b.x1, b.y + b.h);
    const w = bx - ax, h = ay - by;
    const ry = h / 2;
    const rx = b.taper > 0 ? Math.min(b.taper * ry, w / 2) : 1e-4;
    const geo = new THREE.PlaneGeometry(w, h);
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, premultipliedAlpha: true,
      depthTest: false, depthWrite: false,
      uniforms: {
        uSize: { value: new THREE.Vector2(w, h) }, uRy: { value: ry }, uRx: { value: rx },
        uSpan: { value: new THREE.Vector2(-w / 2 + rx, w / 2 - rx) },
        uColor: { value: paper }, uOpacity: { value: 1 },
      },
    });
    const m = new THREE.Mesh(geo, mat);
    m.position.set((ax + bx) / 2, (ay + by) / 2, z);
    m.renderOrder = orderOf(z) + 600 + i;
    m.frustumCulled = false;
    grp.add(m);
    items.push({ m, home: m.position.clone(), kind: b.kind, start: 0, y: b.y });
  });
  const landscape = variant === 'landscape';
  const EMAX = landscape ? 0.7 * fw : (hidden ? 1.08 : 0.75) * fh;
  // landscape: the tiers withdraw one after another from the ground up;
  // portrait: the whole bank lifts as one (its tiers are partial-width, the core carries the cover)
  const tiers = items.filter((it) => it.kind === 'tier').sort((a, b) => b.y - a.y);
  tiers.forEach((it, i) => { it.start = landscape ? 0.5 + 0.06 * (i / Math.max(1, tiers.length - 1)) : 0.5; });
  const DUR = landscape ? 0.26 : 0.36;
  // ease-out: the tiers start off-frame (any start velocity is unseen) and come to rest without a jolt
  const out3 = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return 1 - (1 - t) ** 3; };
  return {
    group: grp,
    setArrival(u: number | null) {
      const off = items.map((it) => (u === null ? 0 : EMAX * (1 - out3(it.start, it.start + DUR, u))));
      // the core and the strands follow the tier that is furthest home, so they never show an edge of their own
      const tierOff = off.filter((_, i) => items[i]!.kind === 'tier');
      const least = tierOff.length ? Math.min(...tierOff) : 0;
      items.forEach((it, i) => {
        const d = it.kind === 'tier' ? off[i]! : least;
        if (landscape) it.m.position.set(it.home.x - d, it.home.y, it.home.z);
        else it.m.position.set(it.home.x, it.home.y - d, it.home.z);
      });
    },
  };
}
