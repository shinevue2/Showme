/**
 * View `works-byobu` — a six-panel gold-leaf byōbu (DESIGN §6.4, §2.2 works-skills; threejs §e2–e3).
 * Owner: WP-07.
 *
 * One mesh, one draw call: a plane with 6 × k segments (k = 8 / 4 / 2 by tier, chosen by draw range from one
 * index buffer), folded in the vertex shader (BYOBU_VERT) and shaded by GOLD_FRAG (src/gl/chunks/gold.ts).
 * Panels are counted from the right: geometry panel i (left → right) is 第(6 − i)扇, so the atlas column is
 * mirrored in the shader. The scroll positions come from index.ts through `worksState`:
 *   dolly — s drives the unfold and the camera's walk from 第一扇 to 第六扇 (map.ts);
 *   list  — the screen stands open, framed whole; only the candle moves (reduced motion: light only);
 *   band  — the screen folds half shut and turns 180° to show its 下地骨 lattice, then fades for skills-kumiko.
 * The candle follows the pointer (critically damped, frames only while it settles); without a pointer it rests
 * low in front of the focused panel. The view places the DOM panel labels at each panel's projected foot.
 * Budget: 1 draw call; atlas 3072 × 1408 RGBA + mips ≈ 23 MB (1536 × 704 ≈ 6 MB on low).
 */
import * as THREE from 'three';
import type { AppContext, StageAPI, Tier, View, ViewFactory, ViewFrame } from '../../core/types';
import { BYOBU_VERT, GOLD_FRAG } from '../../gl/chunks/gold';
import { FOLD_HALF, FOLD_OPEN, FOLD_STACK, LATTICE_PITCH, PANELS, PANEL_H, PANEL_W, fadeAt, focusAt, foldAt, smooth, turnAt } from './map';
import { ATLAS } from './panels';
import { worksState } from './state';

const FOV = 24;
const TAN_H = Math.tan((FOV / 2) * Math.PI / 180);
/** 5 尺 screen (151.5 cm) = PANEL_H units; leaves are 3寸6分 (10.9 cm) squares. */
const LEAF_PER_UNIT = (151.5 / PANEL_H) / 10.9;
const K_MAX = 8;
const LODS = [8, 4, 2] as const;
type Lod = (typeof LODS)[number];

const WOOD = '#D8A373';      // 伽羅 WD — the lattice wood (--accent-skills day value, shared with skills-kumiko)

interface Built { geo: THREE.BufferGeometry; ranges: Record<Lod, [number, number]> }

function buildGeometry(): Built {
  const cols = K_MAX + 1, rows = 3;
  const vCount = PANELS * cols * rows;
  const pos = new Float32Array(vCount * 3);
  const uv = new Float32Array(vCount * 2);
  const panel = new Float32Array(vCount);
  const idx = (p: number, r: number, c: number) => p * cols * rows + r * cols + c;
  for (let p = 0; p < PANELS; p++) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = idx(p, r, c);
        const v = r / (rows - 1);
        pos[i * 3 + 1] = (v - 0.5) * PANEL_H;
        uv[i * 2] = (p + c / K_MAX) / PANELS;
        uv[i * 2 + 1] = v;
        panel[i] = p;
      }
    }
  }
  const indices: number[] = [];
  const ranges = {} as Record<Lod, [number, number]>;
  for (const k of LODS) {
    const start = indices.length;
    const step = K_MAX / k;
    for (let p = 0; p < PANELS; p++) {
      for (let r = 0; r < rows - 1; r++) {
        for (let c = 0; c < k; c++) {
          const a = idx(p, r, c * step), b = idx(p, r, (c + 1) * step);
          const cc = idx(p, r + 1, (c + 1) * step), d = idx(p, r + 1, c * step);
          indices.push(a, b, d, b, cc, d);
        }
      }
    }
    ranges[k] = [start, indices.length - start];
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setAttribute('aPanel', new THREE.BufferAttribute(panel, 1));
  geo.setIndex(indices);
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), PANELS * PANEL_W);
  return { geo, ranges };
}

/** Value-noise fbm baked into a 512² mask (low tier wear, DESIGN §6.4 tiers). The bytes are baked once per
 *  seed and kept (256 KB), so re-warming a parked view on the low tier never repeats the ~1 M noise samples. */
let wearCache: { seed: number; data: Uint8Array } | null = null;
function bakeWear(seed: number): THREE.DataTexture {
  const n = 512;
  if (wearCache?.seed === seed) return wearTexture(wearCache.data, n);
  const data = new Uint8Array(n * n);
  const h = (x: number, y: number) => {
    let t = (x * 374761393 + y * 668265263 + seed * 2246822519) | 0;
    t = Math.imul(t ^ (t >>> 13), 1274126177);
    return ((t ^ (t >>> 16)) >>> 0) / 4294967296;
  };
  const vn = (x: number, y: number, period: number) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const w = (a: number) => ((a % period) + period) % period;
    const a = h(w(xi), w(yi)), b = h(w(xi + 1), w(yi)), c = h(w(xi), w(yi + 1)), d = h(w(xi + 1), w(yi + 1));
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      let s = 0, amp = 0.5, f = 8;
      for (let o = 0; o < 4; o++) { s += amp * vn((x / n) * f, (y / n) * f, f); f *= 2; amp *= 0.5; }
      data[y * n + x] = Math.max(0, Math.min(255, Math.round(s * 255)));
    }
  }
  wearCache = { seed, data };
  return wearTexture(data, n);
}

function wearTexture(data: Uint8Array, n: number): THREE.DataTexture {
  const tex = new THREE.DataTexture(data, n, n, THREE.RedFormat, THREE.UnsignedByteType);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

async function loadImageTexture(url: string): Promise<THREE.Texture> {
  const img = new Image();
  img.decoding = 'async';
  img.crossOrigin = 'anonymous';
  img.src = url;
  await img.decode();
  const tex = new THREE.Texture(img);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

const tmpV = new THREE.Vector3();

class ByobuView implements View {
  readonly id = 'works-byobu';
  readonly printName = '金箔';
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(FOV, 2.4, 0.1, 80);
  vram = 0;
  private stage: StageAPI | null = null;
  private mesh: THREE.Mesh | null = null;
  private mat: THREE.ShaderMaterial | null = null;
  private built: Built | null = null;
  private atlas: THREE.Texture | null = null;
  private atlasKey = '';
  private wear: THREE.DataTexture | null = null;
  private blank: THREE.DataTexture;
  private tier: Tier | null = null;
  private w = 1;
  private h = 1;
  private left = 0;
  private ro: ResizeObserver | null = null;
  private light = new THREE.Vector3(0.6, -0.5, 1.6);
  private lightTarget = new THREE.Vector3(0.6, -0.5, 1.6);
  private lastKey = '';
  private offs: (() => void)[] = [];
  private seed: number;
  private poster: boolean;

  constructor(readonly el: HTMLElement, private ctx: AppContext) {
    this.seed = ctx.print.seed >>> 0;
    this.blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1);
    this.blank.needsUpdate = true;
    this.poster = document.documentElement.dataset.poster === 'works-byobu';
  }

  async init(stage: StageAPI): Promise<void> {
    this.stage = stage;
    this.built = buildGeometry();
    const g = stage.g;
    const color = (hex: string) => new THREE.Color(hex);
    const sx = ((this.seed % 997) / 997) * 13.0, sy = ((Math.floor(this.seed / 997) % 991) / 991) * 7.0;
    this.mat = new THREE.ShaderMaterial({
      name: 'works-byobu-gold',
      vertexShader: BYOBU_VERT,
      fragmentShader: GOLD_FRAG,
      side: THREE.DoubleSide,
      forceSinglePass: true,        // one draw call and one program: depth sorts the folds, the fade is one layer
      transparent: true,
      premultipliedAlpha: true,
      depthWrite: true,
      depthTest: true,
      uniforms: {
        tArt: { value: this.blank },
        tWear: { value: this.blank },
        uArtOn: { value: 0 },
        uDetail: { value: 2 },
        uLeafPerUnit: { value: LEAF_PER_UNIT },
        uPanels: { value: PANELS },
        uPanelW: { value: PANEL_W },
        uPanelH: { value: PANEL_H },
        uFold: { value: FOLD_OPEN },
        uTurn: { value: 0 },
        uAlpha: { value: 1 },
        uWear: { value: 1 },
        uSeed: { value: new THREE.Vector2(sx, sy) },
        uLightPos: { value: this.light },
        uLightCol: { value: color('#FFB46B') },          // candle / andon (DESIGN §6.4)
        uLightDay: { value: 1.25 },
        uLightNight: { value: 3.0 },
        uKeyDir: { value: new THREE.Vector3(-0.62, 0.55, 0.56).normalize() },
        uSumi: { value: color('#1C1C1C') },               // 墨 NC — lacquered 縁
        uBengara: { value: color('#9A5034') },            // 弁柄 NC — the ground under the leaf
        uBrocade: { value: color('#373C38') },            // 藍海松茶 NC — the 縁裂 brocade
        uWood: { value: color(WOOD) },
        uUnder: { value: color('#A28C6A') },              // aged 下張り under-paper (a material, not a token)
        uWashi: { value: color('#FCFAF2') },              // 白練 NC
        uInk: { value: new THREE.Color() },
        uTime: g.uTime,
        uNight: g.uNight,
        uMotion: g.uMotion,
        uOutline: g.uOutline,
      },
    });
    this.mesh = new THREE.Mesh(this.built.geo, this.mat);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
    this.readInk();
    this.offs.push(this.ctx.theme.on(() => { this.readInk(); stage.requestFrame(); }));
    this.ro = new ResizeObserver(() => {
      const r = this.el.getBoundingClientRect();
      this.w = Math.max(1, r.width);
      this.h = Math.max(1, r.height);
      this.left = r.left;
      this.lastKey = '';
      stage.requestFrame();
    });
    this.ro.observe(this.el);
    const r = this.el.getBoundingClientRect();
    this.w = Math.max(1, r.width); this.h = Math.max(1, r.height); this.left = r.left;
    this.applyRig(0);
  }

  async allocate(stage: StageAPI): Promise<void> {
    if (!this.mat) return;
    const t = this.tier ?? stage.tier;
    const key = t.counts.byobuDetail === 0 || t.counts.texMax < 2048 ? 'low' : 'high';
    if (!this.atlas || this.atlasKey !== key) {
      const old = this.atlas;
      try {
        this.atlas = await loadImageTexture(this.ctx.assets.url(ATLAS[key]));
        this.atlas.anisotropy = Math.min(8, stage.renderer.capabilities.getMaxAnisotropy());
        this.atlasKey = key;
        old?.dispose();
      } catch (e) {
        console.warn('[works-byobu] atlas failed; gold without pigment', e);
        this.atlas = null;
      }
    }
    if (t.counts.byobuDetail === 0 && !this.wear) this.wear = bakeWear(this.seed);
    const u = this.mat.uniforms;
    u.tArt!.value = this.atlas ?? this.blank;
    u.uArtOn!.value = this.atlas ? 1 : 0;
    u.tWear!.value = this.wear ?? this.blank;
    if (this.atlas) stage.renderer.initTexture(this.atlas);
    const img = this.atlas?.image as { width?: number; height?: number } | undefined;
    this.vram = img?.width && img?.height ? Math.round(img.width * img.height * 4 * 1.34) : 2e6;
  }

  /**
   * The stage compiles views for the canvas, but on the high tier they draw into the post pass's linear
   * render target — a second program variant (output colour space). Compile that one here as well, during
   * the warm-up and off-screen, so the first visible frame never stalls on a link (WP-07 R10).
   */
  prewarm(stage: StageAPI): void {
    if (!stage.tier.post || !this.mesh) return;
    const r = stage.renderer;
    const prev = r.getRenderTarget();
    const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: true });
    try {
      r.setRenderTarget(rt);
      r.compile(this.scene, this.camera);
    } finally {
      r.setRenderTarget(prev);
      rt.dispose();
    }
  }

  private readInk(): void {
    if (!this.mat) return;
    const raw = getComputedStyle(this.el).getPropertyValue('--ink').trim() || '#0F2540';
    try { (this.mat.uniforms.uInk!.value as THREE.Color).setStyle(raw); } catch { /* keep */ }
  }

  /** Camera rig for the current fold / focus / turn (world units; the screen is centred at the origin). */
  private applyRig(dt: number): void {
    const st = worksState;
    const aspect = this.w / this.h;
    const dolly = st.mode === 'dolly' && !this.poster;
    const turn = turnAt(st.band);
    const turnK = st.motion ? turn : turn > 0.5 ? 1 : 0;
    // the turn: fold towards a closed stack while turning edge-on, then open half way with the back to us
    let fold = dolly ? foldAt(st.s) : FOLD_OPEN;
    const k1 = smooth(turnK * 2), k2 = smooth(turnK * 2 - 1);
    fold = fold + (FOLD_STACK - fold) * k1 + (FOLD_HALF - FOLD_STACK) * k2;
    const focus = dolly ? focusAt(st.s) : 2.5;
    const projW = PANELS * PANEL_W * Math.cos(fold) + 0.12;
    const fillH = 0.82;
    const dH = (PANEL_H / fillH) / (2 * TAN_H);
    const dW = (projW / 0.9) / (2 * TAN_H * aspect);
    const dFull = Math.max(dH, dW);
    // the dolly: how far past the unfold we are, released again as the screen turns
    const amt = dolly ? smooth((st.s - 0.12) / 0.16) * (1 - smooth(turnK * 2.4)) : 0;
    const uFocus = (PANELS - 1 - focus) + 0.5;
    const xf = (uFocus - PANELS / 2) * PANEL_W * Math.cos(fold);
    const tx = xf * 0.62 * amt;
    const d = (dolly ? dH * 0.99 : dFull) * (1 - 0.035 * amt);
    // the camera walks an arc: from the right, facing 第一扇 head-on, round to the left for 第六扇
    const theta = dolly ? 0.30 * ((2.5 - focus) / 2.5) * amt : 0.035;
    const cam = this.camera;
    if (Math.abs(cam.aspect - aspect) > 1e-4) { cam.aspect = aspect; cam.updateProjectionMatrix(); }
    // close in, the screen rides a little high in its frame so the panel labels hang under its feet on paper
    const lift = 0.10 * amt;
    cam.position.set(tx + Math.sin(theta) * d, 0.22 - 0.06 * amt - lift, Math.cos(theta) * d);
    cam.lookAt(tx, 0.05 * PANEL_H - lift, 0);
    cam.updateMatrixWorld();
    const mesh = this.mesh;
    if (mesh) {
      mesh.rotation.y = Math.PI * smooth(turnK);
      mesh.updateMatrixWorld();
    }
    const u = this.mat?.uniforms;
    if (u) {
      u.uFold!.value = fold;
      u.uTurn!.value = turnK;
      u.uAlpha!.value = st.motion ? fadeAt(st.band) : (st.band > 0.6 ? 0 : 1);
    }
    // candle rest position: low, in front of the focused panel's right edge. It is taken up again only when
    // the screen moves; when the pointer merely leaves, the candle stays where it was set down (so a later,
    // unrelated frame never sends it wandering back on its own)
    const rk = `${focus.toFixed(3)}|${fold.toFixed(3)}|${turnK.toFixed(3)}|${this.w}|${this.h}`;
    if (!this.pointerActive && rk !== this.restKey) {
      this.restKey = rk;
      this.lightTarget.set(tx + 0.55, -0.62, 1.55);
    }
    void dt;
    this.placeLabels(fold, focus, turnK);
    this.publish(turnK);
  }

  private pointerActive = false;
  private restKey = '';

  private labelW: number[] = [];

  private placeLabels(fold: number, focus: number, turn: number): void {
    const box = worksState.labelBox;
    const labels = worksState.labels;
    if (!box || !labels.length) return;
    const key = `${fold.toFixed(4)}|${focus.toFixed(4)}|${turn.toFixed(3)}|${this.w}|${this.h}|${worksState.mode}`;
    if (key === this.lastKey) return;
    if (!box.hasAttribute('data-placed')) { box.setAttribute('data-placed', ''); this.labelW = []; }
    if (this.labelW.length !== labels.length || this.labelW.some((w) => !w)) this.labelW = labels.map((el) => el.offsetWidth);
    this.lastKey = key;
    const cam = this.camera;
    const hideAll = fold > 0.85 || turn > 0.02 || worksState.band > 0.02;
    // each label hangs under its panel's foot: x at the panel's centre, y under the lower of its two bottom
    // corners (the zig-zag brings one corner towards the camera, and that corner projects lowest)
    const c = Math.cos(fold), s = Math.sin(fold);
    const footY = -PANEL_H / 2 - 0.02;
    const toY = (x: number, z: number) => { tmpV.set(x, footY, z).project(cam); return (-tmpV.y * 0.5 + 0.5) * this.h; };
    const pos = labels.map((_, k) => {
      const i = PANELS - 1 - k;
      const x = (i + 0.5 - PANELS / 2) * PANEL_W * c;
      const sgn = i % 2 === 0 ? 1 : -1;               // BYOBU_VERT: even panels run from z = −½ to +½
      const y = Math.max(
        toY((i - PANELS / 2) * PANEL_W * c, -0.5 * sgn * PANEL_W * s),
        toY((i + 1 - PANELS / 2) * PANEL_W * c, 0.5 * sgn * PANEL_W * s),
      );
      tmpV.set(x, footY, 0).project(cam);
      return { k, x: (tmpV.x * 0.5 + 0.5) * this.w, y };
    });
    // the focused panel's label first, then outwards; a label that would touch a placed one stays hidden
    const order = [...pos].sort((a, b) => Math.abs(a.k - focus) - Math.abs(b.k - focus));
    const placed: { l: number; r: number }[] = [];
    const show = new Set<number>();
    for (const p of order) {
      const half = (this.labelW[p.k] ?? 120) / 2 + 6;
      const l = p.x - half, r = p.x + half;
      if (hideAll || l < 8 || r > this.w - 8 || placed.some((q) => l < q.r && r > q.l)) continue;
      placed.push({ l, r });
      show.add(p.k);
    }
    // one rail for all six, under the lowest foot (a row of museum labels, not a ragged line);
    // the stage row under the frame starts with 32 px of padding: a label may hang into it, never further
    const rail = Math.min(Math.max(...pos.map((p) => p.y)) + 7, this.h + 4);
    pos.forEach((p) => {
      const el = labels[p.k]!;
      const y = rail;
      el.style.transform = `translate(${p.x.toFixed(1)}px, ${y.toFixed(1)}px) translateX(-50%)`;
      if (show.has(p.k)) el.removeAttribute('data-off'); else el.setAttribute('data-off', '');
    });
  }

  /** works-skills hand-off for skills-kumiko (WP-08): screen centre, lattice pitch and wood in viewport px. */
  private publish(turn: number): void {
    const p = worksState.band;
    if (p <= 0 || p >= 1) return;
    tmpV.set(0, 0, 0).project(this.camera);
    const cx = this.left + (tmpV.x * 0.5 + 0.5) * this.w;
    const cy = worksState.viewTop + (-tmpV.y * 0.5 + 0.5) * this.h;
    const dist = this.camera.position.length();
    const pxPerUnit = this.h / (2 * dist * TAN_H);
    const detail = { p, turn, cx, cy, pitch: LATTICE_PITCH * pxPerUnit, panelW: PANEL_W * pxPerUnit, wood: WOOD };
    const sec = this.el.closest<HTMLElement>('[data-section]');
    sec?.style.setProperty('--byobu-cx', `${cx.toFixed(1)}px`);
    sec?.style.setProperty('--byobu-cy', `${cy.toFixed(1)}px`);
    sec?.style.setProperty('--byobu-pitch', `${detail.pitch.toFixed(2)}px`);
    document.dispatchEvent(new CustomEvent('hanmoto:byobu', { detail }));
  }

  update(dt: number, _t: number, f: ViewFrame): boolean {
    if (!this.mat) return false;
    // candle: follow the pointer on a plane in front of the screen
    if (f.pointer && !this.poster) {
      this.pointerActive = true;
      tmpV.set(f.pointer.x, f.pointer.y, 0.5).unproject(this.camera);
      const dir = tmpV.sub(this.camera.position).normalize();
      const zPlane = 1.25;
      const k = (zPlane - this.camera.position.z) / (dir.z || -1e-3);
      this.lightTarget.copy(this.camera.position).addScaledVector(dir, k);
      this.lightTarget.y = Math.max(-PANEL_H * 0.55, Math.min(PANEL_H * 0.6, this.lightTarget.y));
    } else {
      this.pointerActive = false;
    }
    this.applyRig(dt);
    const motion = worksState.motion && this.ctx.motion.enabled;
    if (!motion) { this.light.copy(this.lightTarget); return false; }
    const a = 1 - Math.exp(-dt * 7.5);
    this.light.lerp(this.lightTarget, a);
    return this.light.distanceToSquared(this.lightTarget) > 1e-5;
  }

  render(renderer: THREE.WebGLRenderer): void {
    renderer.render(this.scene, this.camera);
  }

  park(): void {
    this.atlas?.dispose();
    this.atlas = null;
    this.atlasKey = '';
    this.wear?.dispose();
    this.wear = null;
    if (this.mat) {
      this.mat.uniforms.tArt!.value = this.blank;
      this.mat.uniforms.tWear!.value = this.blank;
      this.mat.uniforms.uArtOn!.value = 0;
    }
    this.vram = 0;
    const box = worksState.labelBox;
    box?.removeAttribute('data-placed');
    worksState.labels.forEach((el) => { el.style.transform = ''; el.removeAttribute('data-off'); });
    this.lastKey = '';
  }

  dispose(): void {
    this.park();
    this.ro?.disconnect();
    this.offs.forEach((off) => off());
    this.offs = [];
    this.built?.geo.dispose();
    this.mat?.dispose();
    this.blank.dispose();
    this.scene.clear();
  }

  onContextRestored(): void {
    // textures died with the context: allocate() reloads them (browser cache) when the stage re-warms
    this.atlas = null;
    this.atlasKey = '';
    this.wear = null;
    this.lastKey = '';
  }

  setOutline(): void { /* the shared uOutline uniform switches the shader to keylines */ }

  setTier(t: Tier): void {
    const prev = this.tier;
    this.tier = t;
    if (this.mat) this.mat.uniforms.uDetail!.value = t.counts.byobuDetail;
    if (this.built && this.mesh) {
      const k = (LODS as readonly number[]).includes(t.counts.byobuSegmentsPerPanel) ? t.counts.byobuSegmentsPerPanel as Lod : 2;
      const [start, count] = this.built.ranges[k];
      this.built.geo.setDrawRange(start, count);
    }
    // atlas size follows the tier on the next allocate (the stage re-warms parked views)
    if (prev && this.stage && this.atlas && (t.counts.byobuDetail === 0) !== (prev.counts.byobuDetail === 0)) {
      void this.allocate(this.stage).then(() => this.stage?.requestFrame());
    }
  }
}

const factory: ViewFactory = (el, ctx) => new ByobuView(el, ctx);
export default factory;
