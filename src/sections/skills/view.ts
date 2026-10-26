/**
 * View `skills-kumiko` — instanced kumiko with data encoding (DESIGN §6.5; threejs §d). Owner: WP-08.
 *
 * World units are CSS px with the origin at the shoji frame's centre (y up). The camera is a window projection:
 * the paper plane z = 0 maps 1 : 1 onto the frame box in the page, whatever the placeholder's extent, so the
 * planar shadow, the DOM SVG diagram and the picking all share coordinates (the diagram overlays the shadow
 * exactly). The eye sits up and to the left (and drifts a little with the pointer), so the strips show their
 * planed sides. One group (scale = px per pitch) holds three draws: paper, planar shadow (MIN blend), strips.
 * The strips are one InstancedBufferGeometry of unit boxes posed in the vertex shader (glsl.ts): from the
 * exploded square lattice of the works-skills hand-off, to the five patterns, to the stack diagram. Tier counts
 * change instance data only (ichimatsu thinning of the leaves under tight budgets), never the program.
 * Budget: 3 draw calls, ~3 k instances × 20 vertices, ≈ 1 MB instance data + the 1280 px page texture.
 */
import * as THREE from 'three';
import type { AppContext, StageAPI, Tier, View, ViewFactory, ViewFrame } from '../../core/types';
import { NOISE } from '../../gl/chunks/noise';
import { PAPER } from '../../gl/chunks/paper';
import { readToken } from '../../gl/chunks/colorspace';
import { C, DESKTOP, K, MOBILE, buildShoji, cellOrigin, type Layout, type PatternId, type Shoji } from './shoji';
import { DIAGRAMS, diagramPieces } from './diagram';
import { skillsState as S, gardenHandoff } from './state';
import { KUMIKO_FRAG_COLOR, KUMIKO_FRAG_PARS, KUMIKO_OUTLINE, KUMIKO_PARS, PAPER_FRAG, PAPER_VERT, SHADOW_FRAG, SHADOW_VERT } from './glsl';

const SPEC_SRC = 'img/hokusai/manga-pattern-construction.1280.webp';
const SPEC_CROP = new THREE.Vector4(1066 / 2000, 770 / 1544, 770 / 2000, 770 / 1544);
const FROM_NX = 36, FROM_NY = 24;            // the byōbu back: 6 panels × 6 laths across (taller than the screen)
const DOMAIN_PLATE = [2, 1, 6, 7, 4];        // web, backend, data, infra, practice (render.ts DOMAIN_PLATE)
const KEY_DIR = new THREE.Vector3(-0.66, 0.5, 0.46).normalize();

interface Built { count: number; shoji: Shoji; geo: THREE.InstancedBufferGeometry; runs: { tool: number; pts: [number, number][] }[] }

function unitBox(): THREE.BufferGeometry {
  // a box x ∈ [−½, ½], y ∈ [−½, ½], z ∈ [0, 1] without its back face (it lies on the paper)
  const g = new THREE.BoxGeometry(1, 1, 1);
  g.translate(0, 0, 0.5);
  const idx = g.index!;
  const keep: number[] = [];
  const nz = g.getAttribute('normal');
  for (let i = 0; i < idx.count; i += 3) {
    const a = idx.getX(i);
    if (nz.getZ(a) < -0.5) continue;
    keep.push(idx.getX(i), idx.getX(i + 1), idx.getX(i + 2));
  }
  g.setIndex(keep);
  g.deleteAttribute('uv');
  return g;
}

function hash(n: number): number {
  let t = (n * 2654435761) >>> 0;
  t = Math.imul(t ^ (t >>> 15), 2246822507) >>> 0;
  return ((t ^ (t >>> 13)) >>> 0) / 4294967296;
}

/** Angle b adjusted by multiples of π (a strip is symmetric) to lie within π/2 of a. */
const near = (a: number, b: number) => b + Math.round((a - b) / Math.PI) * Math.PI;

function build(ctx: AppContext, L: Layout, budget: number, box: THREE.BufferGeometry): Built {
  const tools = ctx.content.tools;
  const idx = (id: string) => tools.findIndex((t) => t.id === id);
  const cells = ctx.content.domains.map((d) => ({
    pattern: d.pattern as PatternId,
    tools: tools.filter((t) => t.domain === d.id).map((t) => ({ id: t.id, years: t.years, projects: t.projects })),
  }));
  let shoji = buildShoji(L, cells, idx, false);
  if (shoji.segs.length > budget) shoji = buildShoji(L, cells, idx, true);
  const segs = shoji.segs;
  const n = segs.length;
  const W = L.W, H = L.H;
  // adjacency masks per tool (2 × 16 bits over ≤ 32 tools)
  const masks = tools.map((t) => {
    let lo = 0, hi = 0;
    for (const nb of t.neighbours) { const j = idx(nb); if (j < 0) continue; if (j < 16) lo |= 1 << j; else hi |= 1 << (j - 16); }
    return [lo, hi] as const;
  });
  // the diagram is re-formed by the strips nearest to each of its pieces (short, legible moves); every other
  // strip dissolves where it sits (aB.w = 0), so the lattice visibly gives way to the stack diagram
  const pieces = diagramPieces(L === MOBILE ? DIAGRAMS.mobile : DIAGRAMS.desktop);
  const target = new Int32Array(n).fill(-1);
  {
    const GX = Math.ceil(W), GY = Math.ceil(H);
    const buckets: number[][] = Array.from({ length: GX * GY }, () => []);
    segs.forEach((s, i) => {
      if (s.k === K.frame) return;
      const bx = Math.min(GX - 1, Math.max(0, Math.floor((s.x0 + s.x1) / 2))), by = Math.min(GY - 1, Math.max(0, Math.floor((s.y0 + s.y1) / 2)));
      buckets[by * GX + bx]!.push(i);
    });
    pieces.forEach((p, pi) => {
      const mx = (p.x0 + p.x1) / 2, my = (p.y0 + p.y1) / 2;
      const bx = Math.floor(mx), by = Math.floor(my);
      let best = -1, bd = Infinity;
      for (let r = 0; r < 6 && best < 0; r++) {
        for (let y = by - r; y <= by + r; y++) for (let x = bx - r; x <= bx + r; x++) {
          if (x < 0 || y < 0 || x >= GX || y >= GY || (Math.abs(x - bx) !== r && Math.abs(y - by) !== r)) continue;
          for (const i of buckets[y * GX + x]!) {
            if (target[i]! >= 0) continue;
            const s = segs[i]!;
            const d = Math.hypot((s.x0 + s.x1) / 2 - mx, (s.y0 + s.y1) / 2 - my);
            if (d < bd) { bd = d; best = i; }
          }
        }
      }
      if (best >= 0) target[best] = pi;
    });
  }
  const aA = new Float32Array(n * 4), aB = new Float32Array(n * 4), aF = new Float32Array(n * 4);
  const aS = new Float32Array(n * 4), aT = new Float32Array(n * 4), aSpin = new Float32Array(n * 4);
  const slots = new Map<string, number>();
  for (let i = 0; i < n; i++) {
    const s = segs[i]!;
    const cx = (s.x0 + s.x1) / 2 - W / 2, cy = H / 2 - (s.y0 + s.y1) / 2;
    const ang = Math.atan2(-(s.y1 - s.y0), s.x1 - s.x0);
    const len = Math.hypot(s.x1 - s.x0, s.y1 - s.y0);
    aA.set([cx, cy, ang, len], i * 4);
    // diagram: frame stays; everything else re-forms the diagram lines (cycling over the pieces, stacked)
    if (s.k === K.frame) aB.set([cx, cy, ang, len], i * 4);
    else if (target[i]! < 0) aB.set([cx, cy, ang, 0], i * 4);
    else {
      const p = pieces[target[i]!]!;
      const bx = (p.x0 + p.x1) / 2 - W / 2, by = H / 2 - (p.y0 + p.y1) / 2;
      const ba = Math.atan2(-(p.y1 - p.y0), p.x1 - p.x0);
      aB.set([bx, by, near(ang, ba), Math.hypot(p.x1 - p.x0, p.y1 - p.y0) * 1.04], i * 4);
    }
    // exploded square lattice slot, in spatial correspondence with the target
    const u = (s.x0 + s.x1) / (2 * W), v = (s.y0 + s.y1) / (2 * H);
    const horiz = Math.abs(Math.cos(ang)) >= Math.abs(Math.sin(ang));
    const si = Math.min(FROM_NX - 1, Math.floor(u * FROM_NX)), sj = Math.min(FROM_NY, Math.round(v * FROM_NY));
    const key = `${horiz ? 'h' : 'v'}${si},${sj}`;
    const layer = slots.get(key) ?? 0;
    slots.set(key, layer + 1);
    const fx = horiz ? si + 0.5 - FROM_NX / 2 : si - FROM_NX / 2;
    const fy = horiz ? FROM_NY / 2 - sj : FROM_NY / 2 - sj - 0.5;
    aF.set([fx, fy, layer, near(ang, horiz ? 0 : Math.PI / 2)], i * 4);
    // joinery order: waku, jigumi (top rows first), leaves, the featured runs, then their inlays
    const top = 1 - v;
    const delay = s.k === K.frame ? 0.02 * (i % 9) / 9
      : s.k === K.jigumi ? 0.06 + 0.24 * (1 - top) + 0.02 * hash(i)
        : s.k === K.leaf ? 0.3 + 0.22 * (1 - top) + 0.03 * hash(i + 7)
          : s.k === K.run ? 0.52 + 0.06 * (1 - top)
            : 0.6 + 0.05 * hash(i + 3);
    aS.set([s.w, s.d, s.k + 8 * (s.cell + 1), Math.min(0.65, delay)], i * 4);
    const m = s.tool >= 0 ? masks[s.tool]! : [0, 0];
    aT.set([s.tool, m[0], m[1], hash(i * 3 + 1)], i * 4);
    // a gentle turn in flight (none for the long waku members, which would sweep across the page)
    const ax = new THREE.Vector3(hash(i + 11) - 0.5, hash(i + 13) - 0.5, hash(i + 17) * 0.6).normalize();
    aSpin.set([ax.x, ax.y, ax.z, s.k === K.frame || len > 2 ? 0 : (hash(i + 19) - 0.5) * 0.7], i * 4);
  }
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = box.index;
  geo.setAttribute('position', box.getAttribute('position'));
  geo.setAttribute('normal', box.getAttribute('normal'));
  const add = (name: string, a: Float32Array) => geo.setAttribute(name, new THREE.InstancedBufferAttribute(a, 4));
  add('aA', aA); add('aB', aB); add('aF', aF); add('aS', aS); add('aT', aT); add('aSpin', aSpin);
  geo.instanceCount = n;
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
  const runs = shoji.runs.map((r) => ({ tool: r.tool, pts: r.pts }));
  return { count: n, shoji, geo, runs };
}

async function loadTexture(url: string): Promise<THREE.Texture> {
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
  await img.decode();
  const tex = new THREE.Texture(img);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

const smooth = (x: number) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };
const tmp = new THREE.Vector3();

class KumikoView implements View {
  readonly id = 'skills-kumiko';
  readonly printName = '組子';
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.Camera();
  vram = 0;
  private stage: StageAPI | null = null;
  private group = new THREE.Group();
  private box = unitBox();
  private built: Built | null = null;
  private layoutKey = '';
  private budget = 12000;
  private strips: THREE.Mesh | null = null;
  private shadow: THREE.Mesh | null = null;
  private paper: THREE.Mesh | null = null;
  private stdMat: THREE.MeshStandardMaterial | null = null;
  private shadowMat: THREE.ShaderMaterial | null = null;
  private paperMat: THREE.ShaderMaterial | null = null;
  private key = new THREE.DirectionalLight(0xfff6ea, 2.6);
  private fill = new THREE.HemisphereLight(0xeef4ff, 0xc9b49a, 1.1);
  private spec: THREE.Texture | null = null;
  private blank = new THREE.DataTexture(new Uint8Array([255, 255, 251, 255]), 1, 1);
  private u = {
    uProgress: { value: 1 }, uDiagram: { value: 0 }, uFromPitch: { value: 1 }, uExplode: { value: 2 }, uHover: { value: -1 },
    uLift: { value: 0.07 }, uFromOrigin: { value: new THREE.Vector2() },
    uPlate: { value: [0, 1, 2, 3, 4].map(() => new THREE.Color()) },
    uRunWood: { value: new THREE.Color('#9C5634') }, uInlay: { value: new THREE.Color('#1F2B3A') },
    uFrameTint: { value: new THREE.Color(0.86, 0.79, 0.74) }, uInk: { value: new THREE.Color() },
    uAlpha: { value: 1 }, uLightLocal: { value: new THREE.Vector3() }, uShadow: { value: new THREE.Color() },
  };
  private eye = new THREE.Vector2();
  private eyeTarget = new THREE.Vector2();
  private pitchPx = 28;
  private lastRev = -1;
  private pickCache: { rev: number; segs: { tool: number; x0: number; y0: number; x1: number; y1: number }[] } = { rev: -1, segs: [] };
  private offs: (() => void)[] = [];

  constructor(readonly el: HTMLElement, private ctx: AppContext) {
    this.blank.needsUpdate = true;
  }

  async init(stage: StageAPI): Promise<void> {
    this.stage = stage;
    const g = stage.g;
    this.budget = stage.tier.counts.kumiko || 12000;
    const std = new THREE.MeshStandardMaterial({ color: '#D8A373', roughness: 0.65, metalness: 0, transparent: true, depthWrite: true });
    const u = this.u;
    std.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, u, { uNight: g.uNight, uOutline: g.uOutline });
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', `#include <common>\n${KUMIKO_PARS}`)
        .replace('#include <beginnormal_vertex>', `kumikoPose();\nvec3 objectNormal = kumikoNormal(normal);\n#ifdef USE_TANGENT\nvec3 objectTangent = vec3(tangent.xyz);\n#endif`)
        .replace('#include <begin_vertex>', 'vec3 transformed = kumikoPosition(position);');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>\n${KUMIKO_FRAG_PARS}`)
        .replace('vec4 diffuseColor = vec4( diffuse, opacity );', KUMIKO_FRAG_COLOR)
        .replace('#include <dithering_fragment>', KUMIKO_OUTLINE);
    };
    std.customProgramCacheKey = () => 'kumiko-v1';
    this.stdMat = std;
    this.shadowMat = new THREE.ShaderMaterial({
      name: 'kumiko-shadow',
      vertexShader: SHADOW_VERT,
      fragmentShader: SHADOW_FRAG,
      uniforms: u as unknown as Record<string, THREE.IUniform>,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.CustomBlending,
      blendEquation: THREE.MinEquation,
      blendEquationAlpha: THREE.MinEquation,
    });
    this.paperMat = new THREE.ShaderMaterial({
      name: 'kumiko-paper',
      vertexShader: PAPER_VERT,
      fragmentShader: PAPER_FRAG(NOISE, PAPER),
      uniforms: {
        uSize: { value: new THREE.Vector2(1, 1) }, uSpecCell: { value: new THREE.Vector2() }, uSpecCrop: { value: SPEC_CROP },
        tSpec: { value: this.blank }, uSpecOn: { value: 0 }, uNight: g.uNight, uOutline: g.uOutline, uAlpha: { value: 1 }, uCell: { value: C },
        uPaper: { value: new THREE.Color() }, uLantern: { value: new THREE.Color('#FFD39A') }, uPaperNight: { value: new THREE.Color('#3B5788') },
        uMat: { value: new THREE.Color() },
      },
      transparent: true,
      depthWrite: false,
    });
    this.scene.add(this.key, this.key.target, this.fill, this.group);
    this.key.position.copy(KEY_DIR);
    this.refreshColors();
    this.offs.push(this.ctx.theme.on(() => { this.refreshColors(); this.stage?.requestFrame(); }));
    this.rebuild();
  }

  async allocate(): Promise<void> {
    if (this.spec) return;
    try {
      this.spec = await loadTexture(this.ctx.assets.url(SPEC_SRC));
      this.paperMat!.uniforms.tSpec!.value = this.spec;
      this.paperMat!.uniforms.uSpecOn!.value = 1;
      this.vram = 1280 * 988 * 4 * 1.33 + (this.built?.count ?? 0) * 96;
      this.stage?.requestFrame();
    } catch { /* the page stays plain paper */ }
  }

  private refreshColors(): void {
    const el = this.el;
    DOMAIN_PLATE.forEach((p, i) => this.u.uPlate.value[i]!.copy(readToken(el, `--plate-${p}`, '#5DAC81')));
    this.u.uInk.value.copy(readToken(el, '--ink'));
    const paper = readToken(el, '--paper-print', '#FFFFFB');
    const night = this.ctx.theme.current === 'night';
    const pm = this.paperMat;
    if (pm) {
      // the shoji paper stays 胡粉 by day; at night the andon lights it from behind
      (pm.uniforms.uPaper!.value as THREE.Color).set('#FFFFFB');
      (pm.uniforms.uMat!.value as THREE.Color).copy(readToken(el, '--mat', '#EBF6F7'));
    }
    const guide = readToken(el, '--guide-label', '#0D5661');
    this.u.uShadow.value.copy(new THREE.Color('#FFFFFB').lerp(guide, 0.16));
    void paper;
    this.key.intensity = night ? 0.9 : 2.6;
    this.fill.intensity = night ? 0.5 : 1.1;
    this.u.uInlay.value.set(night ? '#140E0A' : '#3A2A1F');
  }

  private rebuild(): void {
    const L = S.layout === 'm' ? MOBILE : DESKTOP;
    const key = `${S.layout}:${this.budget}`;
    if (key === this.layoutKey && this.built) return;
    this.layoutKey = key;
    const old = this.built;
    this.built = build(this.ctx, L, this.budget, this.box);
    if (!this.strips) {
      this.paper = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.paperMat!);
      this.shadow = new THREE.Mesh(this.built.geo, this.shadowMat!);
      this.strips = new THREE.Mesh(this.built.geo, this.stdMat!);
      for (const [m, o] of [[this.paper, 0], [this.shadow, 1], [this.strips, 2]] as const) { m.frustumCulled = false; m.renderOrder = o; this.group.add(m); }
    } else {
      this.shadow!.geometry = this.built.geo;
      this.strips.geometry = this.built.geo;
    }
    if (old && old.geo !== this.built.geo) old.geo.dispose();
    this.paper!.geometry.dispose();
    this.paper!.geometry = new THREE.PlaneGeometry(L.W, L.H);
    (this.paperMat!.uniforms.uSize!.value as THREE.Vector2).set(L.W, L.H);
    const o6 = cellOrigin(L, 5);
    (this.paperMat!.uniforms.uSpecCell!.value as THREE.Vector2).set(o6.x, o6.y);
    this.pickCache.rev = -1;
  }

  /** Window projection of the frame box: z = 0 maps 1 : 1 onto the page, the placeholder rect is the viewport. */
  private project(): void {
    const F = S.frame, R = S.slot;
    const fcx = F.x + F.w / 2, fcy = F.y + F.h / 2;
    const D = 2.4 * Math.max(F.w, F.h);
    const ex = this.eye.x * F.w, ey = this.eye.y * F.h;
    const near = Math.max(20, D * 0.25), far = D * 4;
    const k = near / D;
    const left = (R.x - fcx - ex) * k, right = (R.x + R.w - fcx - ex) * k;
    const top = (fcy - R.y - ey) * k, bottom = (fcy - (R.y + R.h) - ey) * k;
    this.camera.position.set(ex, ey, D);
    this.camera.updateMatrixWorld();
    this.camera.projectionMatrix.makePerspective(left, right, top, bottom, near, far);
    this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();
  }

  /** The group: px per pitch, and the skills-principles press (tilt back, lower onto the sand, fade). */
  private placeGroup(): number {
    const L = S.layout === 'm' ? MOBILE : DESKTOP;
    const F = S.frame;
    this.pitchPx = F.w / L.W;
    const p = S.press;
    let alpha = S.alpha * (1 - 0.7 * S.dim);
    const g = this.group;
    g.scale.setScalar(this.pitchPx);
    g.position.set(0, 0, 0);
    g.rotation.set(0, 0, 0);
    if (p > 0) {
      const tilt = smooth((p - 0.2) / 0.55);
      const move = smooth((p - 0.28) / 0.6);
      g.rotation.x = -tilt * (55 * Math.PI / 180);
      const fcx = F.x + F.w / 2, fcy = F.y + F.h / 2;
      const im = gardenHandoff;
      const tx = im.live ? im.cx - fcx : 0;
      const ty = im.live ? fcy - im.cy : -innerHeight * 0.55;
      g.position.set(tx * move, ty * move, 0);
      if (im.live && im.pitch > 0) g.scale.setScalar(this.pitchPx * (1 + (im.pitch / this.pitchPx - 1) * move));
      alpha *= 1 - smooth((p - 0.8) / 0.14);
    }
    g.updateMatrixWorld(true);
    return alpha;
  }

  update(dt: number, _t: number, f: ViewFrame): boolean {
    if (!this.strips || !this.stdMat) return false;
    if ((S.layout === 'm') !== (this.layoutKey.startsWith('m'))) this.rebuild();
    const u = this.u;
    // eye: up-left of the frame, drifting a little toward the pointer (critically damped)
    const pt = S.pointer;
    const F = S.frame;
    this.eyeTarget.set(-0.13, 0.11);
    if (pt && S.motion && S.press === 0) {
      this.eyeTarget.x += ((pt.x - (F.x + F.w / 2)) / Math.max(1, F.w)) * 0.12;
      this.eyeTarget.y -= ((pt.y - (F.y + F.h / 2)) / Math.max(1, F.h)) * 0.1;
    }
    const kk = S.motion ? 1 - Math.exp(-dt * 6) : 1;
    this.eye.lerp(this.eyeTarget, kk);
    const settling = this.eye.distanceTo(this.eyeTarget) > 0.0005;
    void f;
    this.project();
    const alpha = this.placeGroup();
    u.uProgress.value = S.assembly;
    u.uDiagram.value = S.diagram;
    u.uHover.value = S.hover;
    u.uAlpha.value = alpha;
    // the from-lattice: the byōbu's centre and pitch (or, without it, a lattice gathered over the frame itself)
    const pitch = this.pitchPx;
    const homeP = (S.layout === 'm' ? MOBILE.W : DESKTOP.W) / FROM_NX;
    const g = S.from.live && S.from.pitch > 0 ? S.group : 1;
    const bx = S.from.live ? (S.from.cx - (F.x + F.w / 2)) / pitch : 0, by = S.from.live ? ((F.y + F.h / 2) - S.from.cy) / pitch : 0;
    const bp = S.from.live && S.from.pitch > 0 ? S.from.pitch / pitch : homeP;
    u.uFromOrigin.value.set(bx * (1 - g), by * (1 - g));
    u.uFromPitch.value = bp + (homeP - bp) * g;
    u.uExplode.value = u.uFromPitch.value * (2.2 - 1.5 * g);
    // the light converges to frontal as the diagram resolves, so the shadow lands under the strips
    const conv = smooth(S.diagram);
    const L = tmp.set(KEY_DIR.x * (1 - conv), KEY_DIR.y * (1 - conv), KEY_DIR.z).normalize();
    this.key.position.copy(L);
    const inv = new THREE.Quaternion().copy(this.group.quaternion).invert();
    u.uLightLocal.value.copy(L).applyQuaternion(inv);
    const lit = S.assembly;
    const night = this.ctx.theme.current === 'night' ? 1 : 0;
    const paperA = smooth((lit - 0.72) / 0.28) * alpha;
    this.paperMat!.uniforms.uAlpha!.value = paperA;
    this.shadow!.visible = paperA > 0.98 && night === 0 && S.diagram < 0.999;
    this.paper!.visible = paperA > 0.002;
    this.strips.visible = alpha > 0.002;
    this.lastRev = S.rev;
    return settling;
  }

  render(renderer: THREE.WebGLRenderer): void {
    if (!this.strips?.visible && !this.paper?.visible) return;
    renderer.render(this.scene, this.camera);
  }

  /** Nearest featured run within 8 px of a viewport point, or −1. */
  pick(x: number, y: number): number {
    if (!this.built || S.press > 0 || S.assembly < 0.98 || S.diagram > 0.5) return -1;
    if (this.pickCache.rev !== S.rev) {
      this.project();
      this.placeGroup();
      const L = S.layout === 'm' ? MOBILE : DESKTOP;
      const R = S.slot;
      const segs: KumikoView['pickCache']['segs'] = [];
      const toPx = (fx: number, fy: number) => {
        tmp.set(fx - L.W / 2, L.H / 2 - fy, 0.24).applyMatrix4(this.group.matrixWorld).project(this.camera);
        return [R.x + (tmp.x * 0.5 + 0.5) * R.w, R.y + (0.5 - tmp.y * 0.5) * R.h] as const;
      };
      for (const r of this.built.runs) {
        for (let i = 1; i < r.pts.length; i++) {
          const a = toPx(r.pts[i - 1]![0], r.pts[i - 1]![1]), b = toPx(r.pts[i]![0], r.pts[i]![1]);
          segs.push({ tool: r.tool, x0: a[0], y0: a[1], x1: b[0], y1: b[1] });
        }
      }
      this.pickCache = { rev: S.rev, segs };
    }
    let best = -1, bd = 8;
    for (const s of this.pickCache.segs) {
      const dx = s.x1 - s.x0, dy = s.y1 - s.y0;
      const t = Math.max(0, Math.min(1, ((x - s.x0) * dx + (y - s.y0) * dy) / (dx * dx + dy * dy || 1)));
      const d = Math.hypot(x - (s.x0 + t * dx), y - (s.y0 + t * dy));
      if (d < bd) { bd = d; best = s.tool; }
    }
    return best;
  }

  /** Debug/acceptance: run segments and inlays per tool, as built. */
  runs(): Record<string, { segments: number; inlays: number }> {
    const out: Record<string, { segments: number; inlays: number }> = {};
    if (!this.built) return out;
    for (const t of this.ctx.content.tools) out[t.id] = { segments: 0, inlays: 0 };
    for (const s of this.built.shoji.segs) {
      if (s.tool < 0) continue;
      const id = this.ctx.content.tools[s.tool]!.id;
      if (s.k === K.run) out[id]!.segments++;
      if (s.k === K.inlay) out[id]!.inlays++;
    }
    return out;
  }

  get instanceCount(): number { return this.built?.count ?? 0; }

  park(): void {
    this.spec?.dispose();
    this.spec = null;
    if (this.paperMat) { this.paperMat.uniforms.tSpec!.value = this.blank; this.paperMat.uniforms.uSpecOn!.value = 0; }
  }

  dispose(): void {
    this.offs.forEach((f) => f());
    this.park();
    this.built?.geo.dispose();
    this.paper?.geometry.dispose();
    this.box.dispose();
    this.stdMat?.dispose();
    this.shadowMat?.dispose();
    this.paperMat?.dispose();
    this.blank.dispose();
    this.scene.clear();
  }

  onContextRestored(): void {
    this.layoutKey = '';
    this.spec = null;
    this.rebuild();
  }

  setOutline(): void { /* uOutline is the shared global uniform */ }

  setTier(t: Tier): void {
    this.budget = t.counts.kumiko || 12000;
    if (this.built) this.rebuild();
  }
}

const factory: ViewFactory = (el, ctx) => new KumikoView(el, ctx);
export default factory;
export type { KumikoView };
