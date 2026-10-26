/**
 * View `cover-block` — the mirror-carved cherry key block under the print sheet (DESIGN §6.1, band cover-summary
 * §2.2). Owner: WP-05.
 *
 * Space: world units are viewport CSS px with the origin at the viewport centre (y up, z towards the viewer). The
 * camera is a fixed virtual eye at (0, 0, D) whose frustum is cut, every frame, to exactly the device pixels of the
 * placeholder's viewport (three rounds the viewport; the post path truncates it) — so the plane z = 0 maps 1:1 onto
 * the page and the canvas sheet lands on the DOM sheet to the device pixel (pixel-identical swap).
 *
 * Draw calls: block top (displaced by the carve height, normal-mapped), block body (sides + back with the 版下),
 * sheet (print texture, peel curl) — 3.
 *
 * Scroll map (q = scroll into the cover): uPeel = smoothstep(0, 40vh); light 25° → 12° and the caption over
 * 40–60 vh. Band cover-summary (desktop, medium/high tier): the block turns 180° about its long axis and lands its
 * back (the pasted 版下) on `#summary [data-handoff="hanshita"] .print__mat`; at p = 1 the DOM figure shows and the
 * view stops drawing. Narrow screens and the low tier: a 240 ms fade instead.
 */
import * as THREE from 'three';
import type { AppContext, StageAPI, Tier, View, ViewFactory, ViewFrame } from '../../core/types';
import { johakyu } from '../../core/easing';
import { carve, type CarveResult } from '../../gl/carve/index';
import { peelUniforms, peelRollDistance } from '../../gl/chunks/peel';
import { cssColor } from '../../gl/stage/view-helpers';
import { BODY_FRAG, BODY_VERT, SHEET_FRAG, SHEET_VERT, TOP_FRAG, TOP_VERT } from './shaders';
import { collectSheet, paintCarve, paintHanshita, paintPrint, blockRect, type SheetModel, type PrintCanvas } from './sheet-canvas';
import { coverState } from './state';

const FOV = 28;                       // vertical field of view of the virtual eye (deg)
const PEEL_DIR: [number, number] = [-0.2, 0.98];
const PEEL_RADIUS = 0.08;
const PEEL_MAX = Math.PI - 0.35;
const TILT = (6 * Math.PI) / 180;
const DEG = Math.PI / 180;

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

interface DocRect { top: number; left: number; w: number; h: number }
interface Layout {
  vw: number; vh: number;
  sticky: boolean;
  sectionTop: number; sectionH: number; stageNatural: number; stageH: number;
  stageTopAtMeasure: number;           // stage viewport top when the sheet was measured
  view: DocRect;                       // placeholder (document coords)
  band: DocRect | null;
  mat: DocRect | null;
}

function docRect(el: Element | null): DocRect | null {
  if (!el) return null;
  const b = el.getBoundingClientRect();
  return { top: b.top + scrollY, left: b.left, w: b.width, h: b.height };
}

/** Block body: four sides and the back face (UVs mirrored so the 版下 reads correctly once turned over). */
function bodyGeometry(w: number, h: number, t: number): THREE.BufferGeometry {
  const x0 = -w / 2, x1 = w / 2, y0 = -h / 2, y1 = h / 2, zt = 0, zb = -t;
  const pos: number[] = [], nor: number[] = [], uv: number[] = [], face: number[] = [];
  const quad = (a: number[], b: number[], c: number[], d: number[], n: number[], f: number, uvs: number[][]) => {
    for (const [p, q] of [[a, uvs[0]], [b, uvs[1]], [c, uvs[2]], [a, uvs[0]], [c, uvs[2]], [d, uvs[3]]] as [number[], number[]][]) {
      pos.push(p[0]!, p[1]!, p[2]!); nor.push(n[0]!, n[1]!, n[2]!); uv.push(q[0]!, q[1]!); face.push(f);
    }
  };
  const U = [[0, 0], [1, 0], [1, 1], [0, 1]];
  quad([x0, y0, zt], [x0, y0, zb], [x1, y0, zb], [x1, y0, zt], [0, -1, 0], 0, U);            // bottom side
  quad([x1, y1, zt], [x1, y1, zb], [x0, y1, zb], [x0, y1, zt], [0, 1, 0], 0, U);             // top side
  quad([x0, y1, zt], [x0, y1, zb], [x0, y0, zb], [x0, y0, zt], [-1, 0, 0], 0, U);            // left side
  quad([x1, y0, zt], [x1, y0, zb], [x1, y1, zb], [x1, y1, zt], [1, 0, 0], 0, U);             // right side
  // back (z = −t, facing −z): seen after a turn about y, local −x becomes screen right, so u runs with −x
  quad([x1, y0, zb], [x0, y0, zb], [x0, y1, zb], [x1, y1, zb], [0, 0, -1], 1, [[0, 0], [1, 0], [1, 1], [0, 1]]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('aFace', new THREE.Float32BufferAttribute(face, 1));
  return g;
}

/** Sheet plane in px with its origin at the lower-left corner (the peel works in object px). */
function sheetGeometry(w: number, h: number, sx: number, sy: number): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(w, h, Math.max(1, sx), Math.max(1, sy));
  g.translate(w / 2, h / 2, 0);
  return g;
}

class CoverBlockView implements View {
  readonly id = 'cover-block';
  readonly printName = '主版';
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.Camera();
  vram = 0;

  private stage: StageAPI | null = null;
  private tier: Tier | null = null;
  private paper: HTMLElement;
  private section: HTMLElement;
  private stageEl: HTMLElement;
  private figure: HTMLElement | null;
  private mat: HTMLElement | null;
  private L: Layout | null = null;

  private group = new THREE.Group();
  private top: THREE.Mesh;
  private body: THREE.Mesh;
  private sheet: THREE.Mesh;
  private topMat: THREE.ShaderMaterial;
  private bodyMat: THREE.ShaderMaterial;
  private sheetMat: THREE.ShaderMaterial;
  private peelU = peelUniforms(THREE.Vector2, { radius: PEEL_RADIUS, dir: PEEL_DIR, maxAngle: PEEL_MAX });
  private light = { dir: new THREE.Vector3(), andon: new THREE.Vector3(), cam: new THREE.Vector3() };

  private model: SheetModel | null = null;
  private print: PrintCanvas | null = null;
  private sheetTex: THREE.CanvasTexture | null = null;       // everything (once the sheet lifts)
  private sheetTexBase: THREE.CanvasTexture | null = null;   // without the fine text, which the DOM draws while flat
  private lifted = false;
  private readyFired = false;
  private backTex: THREE.CanvasTexture | null = null;
  private carveRes: CarveResult | null = null;
  private sheetLocal = { x: 0, y: 0, w: 1, h: 1 };     // quad (CSS px) relative to the stage's top-left
  private blockLocal = { x: 0, y: 0, w: 1, h: 1 };
  private ready = false;
  private building: Promise<void> | null = null;
  private swapped = false;
  private live = false;
  private handed = false;
  private pending = false;
  private outline = false;
  private segs = { block: 256, sheet: [128, 190] as readonly [number, number], carve: 1024 };

  private tiltX = { v: 0, x: 0 };
  private tiltY = { v: 0, x: 0 };
  private hint = 0;
  private fade = 1;
  private recarveStart = -1;
  private recarveDone = false;
  private lastT = 0;
  private unsub: (() => void)[] = [];
  private ro: ResizeObserver | null = null;
  private resizeTimer: ReturnType<typeof setTimeout> | null = null;
  private themeTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(readonly el: HTMLElement, private ctx: AppContext) {
    this.section = el.closest<HTMLElement>('[data-section="cover"]')!;
    this.paper = this.section.querySelector<HTMLElement>('[data-paper]')!;
    this.stageEl = this.section.querySelector<HTMLElement>('.cover__stage')!;
    this.figure = document.querySelector<HTMLElement>('#summary [data-handoff="hanshita"]');
    this.mat = this.figure?.querySelector<HTMLElement>('.print__mat') ?? this.figure;

    const common = { transparent: true, depthTest: true, depthWrite: true };
    this.topMat = new THREE.ShaderMaterial({
      name: 'cover-block:top', vertexShader: TOP_VERT, fragmentShader: TOP_FRAG, ...common,
      uniforms: {
        tHeight: { value: null }, tNormal: { value: null }, tMask: { value: null },
        uDepth: { value: 8 }, uDisplace: { value: 1 }, uCarve: { value: 1 }, uFace: { value: new THREE.Vector2(1, 1) },
        uWood: { value: new THREE.Color() }, uWood2: { value: new THREE.Color() }, uInk: { value: new THREE.Color('#0F2540') },
        uOutline: { value: 0 }, uLit: { value: 1 }, uOpacity: { value: 1 },
        uRoll: { value: new THREE.Vector4() }, uRollP: { value: new THREE.Vector3() },
        uLightDir: { value: this.light.dir }, uCamPos: { value: this.light.cam }, uNight: { value: 0 },
        uAndonPos: { value: this.light.andon }, uAndonRange: { value: 600 },
      },
    });
    this.bodyMat = new THREE.ShaderMaterial({
      name: 'cover-block:body', vertexShader: BODY_VERT, fragmentShader: BODY_FRAG, ...common,
      uniforms: {
        tBack: { value: null }, uHasBack: { value: 0 }, uOutline: { value: 0 }, uInk: this.topMat.uniforms.uInk!,
        uLit: { value: 1 }, uOpacity: { value: 1 }, uBackOnly: { value: 0 },
        uWood: this.topMat.uniforms.uWood!, uWood2: this.topMat.uniforms.uWood2!, uFace: this.topMat.uniforms.uFace!,
        uLightDir: this.topMat.uniforms.uLightDir!, uCamPos: this.topMat.uniforms.uCamPos!, uNight: this.topMat.uniforms.uNight!,
        uAndonPos: this.topMat.uniforms.uAndonPos!, uAndonRange: this.topMat.uniforms.uAndonRange!,
      },
    });
    this.sheetMat = new THREE.ShaderMaterial({
      name: 'cover-block:sheet', vertexShader: SHEET_VERT, fragmentShader: SHEET_FRAG, ...common, side: THREE.DoubleSide,
      uniforms: {
        ...this.peelU,
        tSheet: { value: null }, uTexel: { value: new THREE.Vector2(1, 1) }, uPaper: { value: new THREE.Color() },
        uPress: { value: 0 }, uShadowOn: { value: 0 },
        uLightDir: this.topMat.uniforms.uLightDir!, uNight: this.topMat.uniforms.uNight!,
        uOutline: this.topMat.uniforms.uOutline!, uInk: this.topMat.uniforms.uInk!,
      },
    });
    this.bodyMat.uniforms.uOutline = this.topMat.uniforms.uOutline!;
    this.top = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.topMat);
    this.body = new THREE.Mesh(bodyGeometry(1, 1, 1), this.bodyMat);
    this.sheet = new THREE.Mesh(sheetGeometry(1, 1, 1, 1), this.sheetMat);
    for (const m of [this.top, this.body, this.sheet]) m.frustumCulled = false;
    this.top.renderOrder = 0;
    this.body.renderOrder = 1;
    this.sheet.renderOrder = 2;
    this.group.add(this.top, this.body, this.sheet);
    this.scene.add(this.group);
    this.camera.position.set(0, 0, 1000);
  }

  /* ------------------------------------------------------------------ View lifecycle */
  async init(stage: StageAPI): Promise<void> {
    this.stage = stage;
    this.tier = stage.tier;
    coverState.wake = () => stage.requestFrame();
    this.applyTierCounts(stage.tier);
    this.topMat.uniforms.uNight = stage.g.uNight;
    this.bodyMat.uniforms.uNight = stage.g.uNight;
    this.sheetMat.uniforms.uNight = stage.g.uNight;
    this.readColors();
    this.measure();
    this.ro = new ResizeObserver(() => this.onResize());
    this.ro.observe(this.section);
    const summary = document.getElementById('summary');
    if (summary) this.ro.observe(summary);
    const onTheme = () => {
      if (this.themeTimer) clearTimeout(this.themeTimer);
      this.themeTimer = setTimeout(() => { this.readColors(); void this.repaintSheet(); void this.repaintBack(); }, 40);
    };
    this.unsub.push(this.ctx.theme.on(onTheme));
    const mo = new MutationObserver(() => {
      const live = this.el.dataset.live === '1';
      if (!live && this.live) this.setSwapped(false);
      this.live = live;
      if (!live) this.setPending(false);
    });
    mo.observe(this.el, { attributes: true, attributeFilter: ['data-live'] });
    const themeMo = new MutationObserver(onTheme);
    themeMo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    this.unsub.push(() => { mo.disconnect(); themeMo.disconnect(); });
    (this.ctx.scroll as unknown as { onRefresh?: (cb: () => void) => () => void }).onRefresh?.(() => this.measure());
  }

  async allocate(): Promise<void> {
    if (!this.building) this.building = this.build().finally(() => { this.building = null; });
    await this.building;
  }

  update(dt: number, t: number, f: ViewFrame): boolean {
    const L = this.L;
    if (!L || !this.ready) return false;
    const motion = this.ctx.motion.enabled;
    const s = scrollY;
    const vh = L.vh;
    const q = s - L.sectionTop;
    let peel: number, lightK: number;
    if (coverState.capture) { peel = 1; lightK = 1; }
    else if (L.sticky) { peel = smooth(0, 0.4 * vh, q); lightK = smooth(0.4 * vh, 0.6 * vh, q); }
    else { peel = smooth(0.02 * vh, 0.34 * vh, q); lightK = smooth(0.3 * vh, 0.5 * vh, q); }
    const bandP = L.band ? clamp01((s - (L.band.top - vh)) / (L.band.h + vh)) : 0;
    const flipOn = L.sticky && !!L.mat && !!this.mat && this.tier?.name !== 'low' && !coverState.capture;
    const flip = flipOn ? smooth(0.2, 0.9, bandP) : 0;
    let animating = false;

    // corner hint (2 s after the swap; gone for good once scrolling starts)
    const hintTarget = coverState.hint && motion && q < 4 ? 1 : 0;
    if (Math.abs(this.hint - hintTarget) > 1e-3) {
      this.hint += Math.sign(hintTarget - this.hint) * Math.min(Math.abs(hintTarget - this.hint), dt / 0.7);
      animating = true;
    } else this.hint = hintTarget;
    const effPeel = Math.max(peel, johakyu(this.hint) * 0.032);

    // re-carve after a language switch, once the block can be seen
    const tu = this.topMat.uniforms;
    if (coverState.langSwitched && !this.recarveDone && !coverState.capture) {
      if (this.recarveStart < 0 && peel > 0.15 && motion) this.recarveStart = t;
      if (this.recarveStart >= 0) {
        const k = (t - this.recarveStart) / 0.9;
        tu.uCarve!.value = clamp01(k);
        if (k >= 1) this.recarveDone = true; else animating = true;
      } else tu.uCarve!.value = motion ? 0 : 1;
      if (!motion) { tu.uCarve!.value = 1; this.recarveDone = true; }
    }

    // pointer tilt (critically damped), only once the sheet has started to lift
    const tiltK = smooth(0.02, 0.25, peel) * (1 - flip) * (motion && !coverState.capture ? 1 : 0);
    let tx = 0, ty = 0;
    if (f.pointer && tiltK > 0) {
      const top = L.view.top - s;
      const px = L.view.left + (f.pointer.x * 0.5 + 0.5) * L.view.w;
      const py = top + (0.5 - f.pointer.y * 0.5) * L.view.h;
      const b = this.blockViewport(s);
      tx = Math.max(-1, Math.min(1, (px - (b.x + b.w / 2)) / (b.w * 0.75)));
      ty = Math.max(-1, Math.min(1, (py - (b.y + b.h / 2)) / (b.h * 0.75)));
    }
    animating = this.spring(this.tiltX, tx * tiltK, dt) || animating;
    animating = this.spring(this.tiltY, ty * tiltK, dt) || animating;

    // mobile / low tier hand-off: a 240 ms fade once the band is half way
    const fadeTarget = !flipOn && bandP > 0.5 ? 0 : 1;
    if (this.fade !== fadeTarget) {
      this.fade = motion ? clamp01(this.fade + Math.sign(fadeTarget - this.fade) * dt / 0.24) : fadeTarget;
      if (this.fade !== fadeTarget) animating = true;
    }

    this.place(s, effPeel, flip, lightK, peel, bandP, flipOn);
    this.lastT = t;
    return animating;
  }

  render(renderer: THREE.WebGLRenderer): void {
    if (!this.L || !this.ready || this.handed) return;
    this.project(renderer);
    renderer.render(this.scene, this.camera);
    if (!this.readyFired) { this.readyFired = true; coverState.onReady?.(); }
    // Where the canvas cannot be pixel-identical to the DOM (the high tier's post pass, or a drawing buffer below the
    // device pixel ratio), the swap waits for the first lift (hint or scroll), so it coincides with motion.
    const exact = !this.stage?.tier.post && renderer.getPixelRatio() >= (devicePixelRatio || 1) - 0.01;
    if (!this.swapped && !coverState.capture && (exact || this.lifted)) this.setSwapped(true);
  }

  park(): void {
    this.setSwapped(false);
    this.setPending(false);
    this.ready = false;
    this.carveRes?.dispose();
    this.carveRes = null;
    this.sheetTex?.dispose();
    this.sheetTex = null;
    this.sheetTexBase?.dispose();
    this.sheetTexBase = null;
    this.backTex?.dispose();
    this.backTex = null;
    this.topMat.uniforms.tHeight!.value = null;
    this.topMat.uniforms.tNormal!.value = null;
    this.topMat.uniforms.tMask!.value = null;
    this.sheetMat.uniforms.tSheet!.value = null;
    this.bodyMat.uniforms.tBack!.value = null;
    this.bodyMat.uniforms.uHasBack!.value = 0;
    this.vram = 0;
  }

  dispose(): void {
    this.park();
    this.unsub.forEach((u) => u());
    this.ro?.disconnect();
    for (const m of [this.top, this.body, this.sheet]) m.geometry.dispose();
    this.topMat.dispose();
    this.bodyMat.dispose();
    this.sheetMat.dispose();
  }

  onContextRestored(): void {
    this.ready = false;
    this.swapped = false;
    this.carveRes = null;
    this.sheetTex = null;
    this.sheetTexBase = null;
    this.backTex = null;
    this.paper.removeAttribute('data-gl');
  }

  setOutline(on: boolean): void {
    this.outline = on;
    this.topMat.uniforms.uOutline!.value = on ? 1 : 0;
    this.stage?.requestFrame();
  }

  setTier(t: Tier): void {
    const prevCarve = this.segs.carve;
    this.tier = t;
    this.applyTierCounts(t);
    if (this.L) this.rebuildGeometry();
    if (this.ready && this.segs.carve !== prevCarve) void this.recarve();
  }

  /* ------------------------------------------------------------------ building */
  private applyTierCounts(t: Tier): void {
    const c = t.counts;
    this.segs.block = c.blockSegments || 64;
    this.segs.sheet = c.sheetSegments[0] ? c.sheetSegments : [32, 48];
    this.segs.carve = c.carveRes || 512;
    this.topMat.uniforms.uDisplace!.value = t.name === 'low' || t.name === 'software' ? 0 : 1;
  }

  private readColors(): void {
    const u = this.topMat.uniforms;
    (u.uWood!.value as THREE.Color).copy(cssColor(this.section, '--wood', '#E1A679'));
    (u.uWood2!.value as THREE.Color).copy(cssColor(this.section, '--wood-2', '#B35C37'));
    (this.sheetMat.uniforms.uPaper!.value as THREE.Color).copy(cssColor(this.paper, '--paper-print', '#FFFFFB'));
  }

  private async waitForSheet(): Promise<void> {
    const faces = new Set<string>();
    this.paper.querySelectorAll<HTMLElement>('*').forEach((e) => {
      const cs = getComputedStyle(e);
      if (e.closest('svg, .visually-hidden')) return;
      if (e.childNodes.length && [...e.childNodes].some((n) => n.nodeType === 3 && n.nodeValue?.trim())) {
        faces.add(`${cs.fontStyle} ${cs.fontWeight} 32px ${cs.fontFamily}|${e.textContent ?? ''}`);
      }
    });
    try {
      await Promise.all([...faces].map((x) => { const [font, text] = x.split('|'); return document.fonts.load(font!, text); }));
      await document.fonts.ready;
    } catch { /* fonts failed: the canvas uses the same fallbacks as the DOM */ }
    await coverState.sortDone;
    const anims = this.paper.getAnimations({ subtree: true });
    await Promise.race([Promise.all(anims.map((a) => a.finished.catch(() => undefined))), new Promise((r) => setTimeout(r, 2600))]);
  }

  private async build(): Promise<void> {
    await this.waitForSheet();
    this.measure();
    await this.repaintSheet(true);
    await this.recarve();
    void this.repaintBack();
    this.ready = !!this.carveRes && !!this.sheetTex;
    this.stage?.requestFrame();
  }

  /** Re-read the DOM sheet and redraw the print texture (geometry, fonts, theme). */
  private async repaintSheet(remeasure = false): Promise<void> {
    if (!this.stage) return;
    const wasSwapped = this.swapped;
    // read real colours: data-gl only turns the glyph fill transparent (computed `color` is unaffected)
    const model = await collectSheet(this.paper);
    void remeasure;
    this.model = model;
    const dpr = this.stage.renderer.getPixelRatio();
    const print = paintPrint(model, dpr);
    this.print = print;
    const stageTop = this.stageEl.getBoundingClientRect().top;
    const stageLeft = this.stageEl.getBoundingClientRect().left;
    this.sheetLocal = { x: print.quad.x0 / dpr - stageLeft, y: print.quad.y0 / dpr - stageTop, w: (print.quad.x1 - print.quad.x0) / dpr, h: (print.quad.y1 - print.quad.y0) / dpr };
    const B = blockRect(model);
    this.blockLocal = { x: B.x - stageLeft, y: B.y - stageTop, w: B.w, h: B.h };
    if (this.L) this.L.stageTopAtMeasure = stageTop;
    const mk = (c: HTMLCanvasElement) => {
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.generateMipmaps = false;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.anisotropy = 1;
      return tex;
    };
    this.sheetTex?.dispose();
    this.sheetTexBase?.dispose();
    this.sheetTex = mk(print.canvas);
    this.sheetTexBase = mk(paintPrint(model, dpr, false).canvas);
    this.sheetMat.uniforms.tSheet!.value = this.lifted ? this.sheetTex : this.sheetTexBase;
    (this.sheetMat.uniforms.uTexel!.value as THREE.Vector2).set(1 / print.canvas.width, 1 / print.canvas.height);
    this.rebuildGeometry();
    this.updateVram();
    if (wasSwapped) this.stage.requestFrame();
  }

  private async recarve(): Promise<void> {
    if (!this.stage || !this.model) return;
    const res = this.segs.carve;
    const src = paintCarve(this.model, res);
    const result = await carve(this.stage.renderer, { source: src, res, profile: 'vcut', depthPx: Math.max(3, Math.round(6 * res / 1024)) });
    this.carveRes?.dispose();
    this.carveRes = result;
    const u = this.topMat.uniforms;
    u.tHeight!.value = result.height;
    u.tNormal!.value = result.normal;
    u.tMask!.value = result.mask;
    const info = result.height.userData as { width: number; relief: number };
    u.uDepth!.value = info.relief * (this.blockLocal.w / info.width);
    this.updateVram();
    this.stage.requestFrame();
  }

  private async repaintBack(): Promise<void> {
    if (!this.mat || !this.stage) return;
    const c = await paintHanshita(this.mat, Math.min(this.stage.renderer.getPixelRatio(), 2));
    if (!c) return;
    this.backTex?.dispose();
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    this.backTex = tex;
    this.bodyMat.uniforms.tBack!.value = tex;
    this.bodyMat.uniforms.uHasBack!.value = 1;
    this.updateVram();
    this.stage.requestFrame();
  }

  private updateVram(): void {
    let v = 0;
    const tex = (t: THREE.Texture | null | undefined) => {
      const img = t?.image as { width?: number; height?: number } | undefined;
      return img?.width && img.height ? img.width * img.height * 4 : 0;
    };
    if (this.carveRes) { const i = this.carveRes.height.userData as { width: number; height: number }; v += i.width * i.height * 4 * 3; }
    v += tex(this.sheetTex) + tex(this.sheetTexBase) + tex(this.backTex);
    this.vram = v;
  }

  private rebuildGeometry(): void {
    const b = this.blockLocal, sh = this.sheetLocal;
    if (b.w < 2 || b.h < 2) return;
    this.top.geometry.dispose();
    const segX = this.segs.block, segY = Math.round(this.segs.block * Math.min(2, b.h / b.w));
    this.top.geometry = new THREE.PlaneGeometry(b.w, b.h, segX, segY);
    this.body.geometry.dispose();
    this.body.geometry = bodyGeometry(b.w, b.h, Math.max(6, b.w * 0.06));
    this.sheet.geometry.dispose();
    this.sheet.geometry = sheetGeometry(sh.w, sh.h, this.segs.sheet[0], this.segs.sheet[1]);
    (this.peelU.uPeelSize.value).set(sh.w, sh.h);
    (this.topMat.uniforms.uFace!.value as THREE.Vector2).set(b.w, b.h);
  }

  /* ------------------------------------------------------------------ layout */
  private measure(): void {
    const sec = docRect(this.section)!;
    const stageH = this.stageEl.offsetHeight;
    const padTop = parseFloat(getComputedStyle(this.section).paddingTop) || 0;
    const sticky = getComputedStyle(this.stageEl).position === 'sticky';
    this.stageLeftCache = this.stageEl.getBoundingClientRect().left;
    this.L = {
      vw: innerWidth, vh: innerHeight, sticky,
      sectionTop: sec.top, sectionH: sec.h, stageNatural: sec.top + padTop, stageH,
      stageTopAtMeasure: this.L?.stageTopAtMeasure ?? 0,
      view: docRect(this.el)!,
      band: docRect(this.section.querySelector('[data-band="cover-summary"]')),
      mat: docRect(this.mat),
    };
  }

  private onResize(): void {
    const prev = this.L;
    this.measure();
    const L = this.L!;
    const changed = !prev || Math.abs(prev.vw - L.vw) > 0.5 || Math.abs(prev.vh - L.vh) > 0.5 || Math.abs(prev.sectionH - L.sectionH) > 0.5;
    if (!changed || !this.ready) { this.stage?.requestFrame(); return; }
    // geometry changed: hide the canvas sheet until it is redrawn, then carve again
    if (this.resizeTimer) clearTimeout(this.resizeTimer);
    this.setSwapped(false);
    this.ready = false;
    this.resizeTimer = setTimeout(() => {
      void (async () => {
        this.measure();
        await this.repaintSheet(true);
        await this.recarve();
        void this.repaintBack();
        this.ready = true;
        this.stage?.requestFrame();
      })();
    }, 280);
  }

  /** Viewport top of the cover's stage at scroll s (sticky top: 0 inside the section; static on narrow screens). */
  private stageTop(s: number): number {
    const L = this.L!;
    if (!L.sticky) return L.stageNatural - s;
    return Math.min(Math.max(L.stageNatural - s, 0), L.sectionTop + L.sectionH - s - L.stageH);
  }

  private blockViewport(s: number): { x: number; y: number; w: number; h: number } {
    return { x: this.blockLocal.x + this.stageLeftCache, y: this.blockLocal.y + this.stageTop(s), w: this.blockLocal.w, h: this.blockLocal.h };
  }

  private stageLeftCache = 0;

  /** Lay out block + sheet in world space for this frame. */
  private place(s: number, effPeel: number, flip: number, lightK: number, peel: number, bandP: number, flipOn: boolean): void {
    const L = this.L!;
    const vw = L.vw, vh = L.vh;
    const st = this.stageTop(coverState.capture ? L.stageNatural : s);
    const sx = this.stageLeftCache;
    // block (viewport CSS rect) and the sheet quad
    const b = { x: this.blockLocal.x + sx, y: this.blockLocal.y + st, w: this.blockLocal.w, h: this.blockLocal.h };
    const q = { x: this.sheetLocal.x + sx, y: this.sheetLocal.y + st, w: this.sheetLocal.w, h: this.sheetLocal.h };
    if (coverState.capture) this.section.dataset.captureRect = JSON.stringify({ x: b.x, y: b.y, w: b.w, h: b.h });
    let cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    let scaleX = 1, scaleY = 1, zLift = 0, rotY = 0, thickness = Math.max(6, b.w * 0.06);
    const e = johakyu(flip);
    if (flip > 0 && L.mat) {
      const m = { x: L.mat.left, y: L.mat.top - s, w: L.mat.w, h: L.mat.h };
      cx = mix(cx, m.x + m.w / 2, e);
      cy = mix(cy, m.y + m.h / 2, e);
      const k = smooth(0.32, 0.68, flip);
      scaleX = mix(1, m.w / b.w, k);
      scaleY = mix(1, m.h / b.h, k);
      zLift = Math.sin(Math.PI * e) * b.w * 0.3;
      rotY = Math.PI * e;
      thickness = mix(thickness, 0.6, smooth(0.8, 1, flip));
    }
    // world: x right, y up, origin at the viewport centre
    this.group.position.set(cx - vw / 2, vh / 2 - cy, 0);
    this.group.scale.set(scaleX, scaleY, 1);
    this.group.rotation.set(this.tiltY.x * TILT, this.tiltX.x * TILT + rotY, 0, 'YXZ');
    // the turned block's back must lie on z = 0 at the end of the flip
    const backZ = (1 + thickness) * smooth(0.5, 1, flip);
    this.group.position.z = zLift - backZ;
    this.top.position.z = -1;
    this.body.position.z = -1;
    this.body.scale.z = thickness / Math.max(6, b.w * 0.06);
    // the sheet in block-local px: quad lower-left corner relative to the block centre
    const qLocalX = q.x - (b.x + b.w / 2);
    const qLocalY = (b.y + b.h / 2) - (q.y + q.h);
    this.sheet.position.set(qLocalX, qLocalY, 0);
    this.sheet.visible = effPeel < 0.999 && flip === 0 && !coverState.capture;
    this.peelU.uPeel.value = effPeel;
    this.setLifted(effPeel > 1e-4 || flip > 0 || coverState.capture);
    // roll line for the block's shadow (block-local px)
    const dir = this.peelU.uPeelDir.value;
    const rollL = peelRollDistance(effPeel, [q.w, q.h], [dir.x, dir.y], PEEL_RADIUS, PEEL_MAX);
    const active = smooth(0, PEEL_RADIUS * q.w, rollL) * (1 - smooth(0.85, 1, effPeel));
    const tu = this.topMat.uniforms;
    (tu.uRoll!.value as THREE.Vector4).set(qLocalX + q.w, qLocalY, dir.x, dir.y);
    (tu.uRollP!.value as THREE.Vector3).set(rollL, PEEL_RADIUS * q.w, active);
    this.sheetMat.uniforms.uShadowOn!.value = active;
    this.sheetMat.uniforms.uPress!.value = this.ctx.lang === 'en' ? peel : 0;
    // lights: day key from the upper left, elevation 25° → 12° (raking) after the peel
    const el = mix(25, 12, lightK) * DEG;
    const az = 135 * DEG;
    this.light.dir.set(Math.cos(el) * Math.cos(az), Math.cos(el) * Math.sin(az), Math.sin(el));
    this.light.andon.set(cx - vw / 2 + b.w * 0.85, vh / 2 - cy - b.h * 0.42, b.w * 0.22);
    tu.uAndonRange!.value = b.w * 1.15;
    const D = (vh / 2) / Math.tan((FOV / 2) * DEG);
    this.light.cam.set(0, 0, D);
    // hand-off: lighting fades to the flat colours as the back settles on the figure
    const litK = 1 - smooth(0.86, 1, flip);
    tu.uLit!.value = litK;
    this.bodyMat.uniforms.uLit!.value = litK;
    this.bodyMat.uniforms.uBackOnly!.value = smooth(0.86, 1, flip);
    // the block is hidden under the sheet until it starts to lift (its 2 % margin must not appear at the swap)
    const blockVis = coverState.capture ? 1 : smooth(0.0, 0.018, effPeel);
    tu.uOpacity!.value = this.fade * blockVis * (1 - smooth(0.9, 1, flip));
    this.bodyMat.uniforms.uOpacity!.value = this.fade * blockVis;
    this.top.visible = this.fade * blockVis > 0.002;
    this.body.visible = this.fade * blockVis > 0.002;
    // summary figure hand-off (cover owns data-handoff-state, §2.2)
    const handed = flipOn && bandP >= 0.999;
    if (handed !== this.handed) { this.handed = handed; this.stage?.requestFrame(); }
    this.setPending(flipOn && !handed && this.el.dataset.live === '1');
  }

  /** Off-axis frustum on the exact device pixels three will use for this placeholder. */
  private project(renderer: THREE.WebGLRenderer): void {
    const L = this.L!;
    const dpr = renderer.getPixelRatio();
    const vw = L.vw, vh = L.vh;
    const top = L.view.top - scrollY;
    const left = L.view.left, w = L.view.w, h = L.view.h;
    const post = !!this.stage?.tier.post;
    let X0: number, Y0: number, Wd: number, Hd: number, k: number;
    const yGL = vh - (top + h);
    if (post) {
      k = Math.round(vw * Math.min(dpr, 1.5)) / vw;
      X0 = Math.trunc(left * k); Y0 = Math.trunc(yGL * k); Wd = Math.trunc(w * k); Hd = Math.trunc(h * k);
    } else {
      k = dpr;
      X0 = Math.round(left * k); Y0 = Math.round(yGL * k); Wd = Math.round(w * k); Hd = Math.round(h * k);
    }
    const D = (vh / 2) / Math.tan((FOV / 2) * DEG);
    const near = Math.max(50, D * 0.2), far = D + 4000;
    const s = near / D;
    const l = (X0 / k - vw / 2) * s, r = ((X0 + Wd) / k - vw / 2) * s;
    const b = (Y0 / k - vh / 2) * s, t = ((Y0 + Hd) / k - vh / 2) * s;
    this.camera.position.set(0, 0, D);
    this.camera.updateMatrixWorld(true);
    this.camera.projectionMatrix.makePerspective(l, r, t, b, near, far);
    this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();
  }

  private spring(sv: { v: number; x: number }, target: number, dt: number): boolean {
    const w = 9;
    const a = -2 * w * sv.v - w * w * (sv.x - target);
    sv.v += a * dt;
    sv.x += sv.v * dt;
    if (Math.abs(sv.x - target) < 1e-4 && Math.abs(sv.v) < 1e-4) { sv.x = target; sv.v = 0; return false; }
    return true;
  }

  private setSwapped(on: boolean): void {
    if (on === this.swapped) return;
    this.swapped = on;
    if (on) {
      this.paper.setAttribute('data-gl', this.lifted ? 'all' : 'base');
      coverState.onSwap?.();
    } else this.paper.removeAttribute('data-gl');
  }

  /** Flat sheet: the canvas draws all but the fine text, which the DOM keeps drawing; lifted: the canvas draws all. */
  private setLifted(on: boolean): void {
    if (on === this.lifted) return;
    this.lifted = on;
    this.sheetMat.uniforms.tSheet!.value = on ? this.sheetTex : this.sheetTexBase;
    if (this.swapped) this.paper.setAttribute('data-gl', on ? 'all' : 'base');
  }

  private setPending(on: boolean): void {
    if (on === this.pending || !this.figure) return;
    this.pending = on;
    if (on) this.figure.dataset.handoffState = 'pending'; else delete this.figure.dataset.handoffState;
  }
}

const factory: ViewFactory = (el, ctx) => new CoverBlockView(el, ctx);
export default factory;
