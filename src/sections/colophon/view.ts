/**
 * View `colophon-emaki` — the site as a handscroll, rolled up once (DESIGN §6.11; *threejs* §e1). Owner: WP-10.
 * The strip — `img/gen/strip-{lang}-{day|night}.avif` (WP-11), else a procedural miniature drawn here (washi, one
 * panel per section right → left in reading order, each with its layer colour as an ichimonji bokashi, its title and
 * a kentō mark, the Tōkaidō key line running through) — lies open, then winds right → left onto a cherry roller with
 * the verified Archimedean SCROLL_VERT wrap as the colophon comes up the screen (progress 0.2 → 0.6), and is tied with
 * an 江戸紫 cord. It plays once (the roll never unwinds). Reduced motion: the strip stays open; poster mode: rolled.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { AppContext, SectionId, StageAPI, Tier, View, ViewFrame } from '../../core/types';
import { SECTION_ORDER } from '../../core/types';
import { SCROLL_VERT } from '../../gl/chunks/research';
import { NOISE } from '../../gl/chunks/noise';
import { PAPER } from '../../gl/chunks/paper';

const H = 1;               // strip height (world units)
const R = 0.075;           // roller radius
const LAYER: Record<SectionId, string> = {
  cover: '#5383C3', summary: '#E95464', road: '#5DAC81', works: '#005CAF', skills: '#E03C8A', principles: '#33A6B8',
  achievements: '#E9CD4C', writing: '#656765', testimonials: '#1C1C1C', contact: '#F05E1C', colophon: '#42602D',
};

const FRAG = /* glsl */`
uniform sampler2D tArt; uniform vec3 uBack; uniform vec3 uLightDir; uniform float uNight; uniform float uOutline; uniform vec3 uInk;
varying vec2 vUv; varying vec3 vN; varying float vRollShade;
${NOISE}
${PAPER}
void main(){
  vec3 n = normalize(vN) * (gl_FrontFacing ? 1.0 : -1.0);
  vec3 base = gl_FrontFacing ? texture2D(tArt, vUv).rgb : paperTone(uBack, vUv * vec2(16.0, 1.0));
  float lit = 0.62 + 0.38 * max(dot(n, normalize(uLightDir)), 0.0);
  vec3 col = base * lit * mix(0.8, 1.0, vRollShade);
  col *= mix(vec3(1.0), vec3(0.62, 0.7, 0.88), uNight);
  vec2 e = abs(vUv - 0.5);
  float edge = step(0.497, e.y);
  col = mix(col, uInk, uOutline * edge);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

function proceduralStrip(ctx: AppContext, w: number): HTMLCanvasElement {
  const h = Math.round(w / 16);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d')!;
  g.fillStyle = '#FFFFFB';
  g.fillRect(0, 0, w, h);
  // washi fibres
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  g.strokeStyle = '#E8EEF0';
  g.lineWidth = 1;
  for (let i = 0; i < w * 0.6; i++) {
    const x = rnd() * w, y = rnd() * h, l = 4 + rnd() * 18, a = (rnd() - 0.5) * 0.6;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  const n = SECTION_ORDER.length;
  const pw = w / n;
  const vertical = ctx.lang !== 'en';
  const face = ctx.lang === 'zh' ? '"Noto Sans SC", sans-serif' : ctx.lang === 'ja' ? '"IBM Plex Sans JP", sans-serif' : '"IBM Plex Sans", sans-serif';
  SECTION_ORDER.forEach((id, i) => {
    const x1 = w - i * pw, x0 = x1 - pw;
    const col = LAYER[id];
    // ichimonji bokashi along the top and a thin mist band at the foot
    const top = g.createLinearGradient(0, 0, 0, h * 0.26);
    top.addColorStop(0, col + 'CC'); top.addColorStop(1, col + '00');
    g.fillStyle = top; g.fillRect(x0, 0, pw, h * 0.26);
    const foot = g.createLinearGradient(0, h * 0.86, 0, h);
    foot.addColorStop(0, col + '00'); foot.addColorStop(1, col + '66');
    g.fillStyle = foot; g.fillRect(x0, h * 0.86, pw, h * 0.14);
    // paper join (継ぎ目)
    g.fillStyle = '#D9E3E6';
    g.fillRect(x0, 0, Math.max(1, w / 4096), h);
    // title
    const title = (ctx.content.copy as unknown as Record<string, { title: Record<string, string> }>)[id]?.title[ctx.lang] ?? id;
    g.fillStyle = '#0F2540';
    const fs = Math.round(h * 0.15);
    g.font = `500 ${fs}px ${face}`;
    if (vertical) {
      g.textAlign = 'center'; g.textBaseline = 'middle';
      [...title].slice(0, 6).forEach((ch, k) => g.fillText(ch, x1 - pw * 0.16, h * 0.34 + k * fs * 1.08));
    } else {
      g.textAlign = 'right'; g.textBaseline = 'alphabetic';
      g.fillText(title, x1 - pw * 0.08, h * 0.44);
    }
    // kentō mark at the panel's lower right
    g.fillStyle = '#566C73';
    const u = Math.max(1, h / 128);
    g.fillRect(x1 - pw * 0.06 - 7 * u, h * 0.8, 7 * u, u);
    g.fillRect(x1 - pw * 0.06 - u, h * 0.8 - 6 * u, u, 7 * u);
  });
  // the Tōkaidō key line through the road panels, right → left, with the seven stations
  const roadI = SECTION_ORDER.indexOf('road');
  const rx1 = w - roadI * pw - pw * 0.1, rx0 = rx1 - pw * 0.8;
  g.strokeStyle = '#0F2540'; g.lineWidth = Math.max(1, h / 110);
  g.beginPath();
  for (let k = 0; k <= 40; k++) { const x = rx1 - (k / 40) * (rx1 - rx0); const y = h * (0.68 + 0.04 * Math.sin(k * 0.6)); if (k) g.lineTo(x, y); else g.moveTo(x, y); }
  g.stroke();
  for (let k = 0; k < 7; k++) { const x = rx1 - ((k + 0.5) / 7) * (rx1 - rx0); g.fillRect(x - 1, h * 0.64, Math.max(2, h / 80), h * 0.08); }
  return c;
}

export interface EmakiView extends View { setRoll(p: number): void }

const factory = (el: HTMLElement, ctx: AppContext): EmakiView => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(22, 5, 0.1, 100);
  let stage: StageAPI | null = null;
  let tier: Tier = ctx.tier.current;
  let mat: THREE.ShaderMaterial | null = null;
  let paper: THREE.Mesh | null = null;
  let roller: THREE.Mesh | null = null;
  let cord: THREE.Mesh | null = null;
  let tex: THREE.Texture | null = null;
  let L = 16;
  let roll = 0;            // 0 open … 1 rolled (monotonic)
  let target = 0;
  let segs = 0;
  const poster = document.documentElement.hasAttribute('data-poster');

  async function loadStrip(): Promise<THREE.Texture> {
    const theme = ctx.theme.current;
    const url = ctx.assets.url(`img/gen/strip-${ctx.lang}-${theme}.avif`);
    try {
      const t = await new THREE.TextureLoader().loadAsync(url);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    } catch {
      await document.fonts?.ready;
      const c = proceduralStrip(ctx, Math.min(4096, tier.counts.texMax));
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      return t;
    }
  }

  function buildPaper(n: number): void {
    segs = n;
    const geo = new THREE.PlaneGeometry(L, H, n, 1);
    geo.translate(L / 2, 0, 0);          // x ∈ [0, L]: the left end at 0
    if (paper) { paper.geometry.dispose(); paper.geometry = geo; }
    else if (mat) { paper = new THREE.Mesh(geo, mat); paper.frustumCulled = false; scene.add(paper); }
  }

  function layout(): void {
    if (!mat || !roller || !cord) return;
    const asp = camera.aspect || 5;
    const visH = H * 1.42;
    const dist = (visH / 2) / Math.tan(THREE.MathUtils.degToRad(11));
    const visW = visH * asp;
    const margin = 0.55;                                 // the strip's left end sits this far in from the frame
    const camX = -margin + visW / 2;
    camera.position.set(camX, 0.08, dist);
    camera.lookAt(camX, 0, 0);
    const open = Math.max(1, Math.min(L - 0.01, visW - margin - 0.45));   // initially open span
    const k = roll * roll * (3 - 2 * roll);
    const right = open + (R * 0.4 - open) * k;          // the roll line travels right → left
    mat.uniforms.uRight!.value = right;
    roller.position.set(right, 0, R);
    cord.position.set(right, 0, R);
    (cord.material as THREE.MeshStandardMaterial).opacity = Math.max(0, (roll - 0.9) / 0.1);
    cord.visible = roll > 0.9;
  }

  const view: EmakiView = {
    id: 'colophon-emaki', el, scene, camera, printName: '巻子', vram: 4096 * 256 * 4,
    async init(s) {
      stage = s;
      tier = s.tier;
      tex = await loadStrip();
      const img = tex.image as { width?: number; height?: number } | undefined;
      L = img?.width && img.height ? (img.width / img.height) * H : 16;
      mat = new THREE.ShaderMaterial({
        name: 'emaki:scroll', vertexShader: SCROLL_VERT, fragmentShader: FRAG, side: THREE.DoubleSide,
        uniforms: {
          uLeft: { value: -1 }, uRight: { value: L }, uRadius: { value: R }, uThick: { value: 0.0016 },
          tArt: { value: tex }, uBack: { value: new THREE.Color('#F4F6F2') }, uLightDir: { value: new THREE.Vector3(-0.35, 0.5, 0.8) },
          uNight: s.g.uNight, uOutline: s.g.uOutline, uInk: { value: new THREE.Color('#0F2540') },
        },
      });
      buildPaper(Math.max(120, tier.counts.emakiSegments || 300));
      const wood = new THREE.MeshStandardMaterial({ color: new THREE.Color('#B35C37'), roughness: 0.5, metalness: 0 });
      const rod = new THREE.CylinderGeometry(R * 0.82, R * 0.82, H + 0.1, 24);
      const capT = new THREE.CylinderGeometry(R * 1.25, R * 1.25, 0.07, 24).translate(0, H / 2 + 0.085, 0);
      const capB = new THREE.CylinderGeometry(R * 1.25, R * 1.25, 0.07, 24).translate(0, -H / 2 - 0.085, 0);
      roller = new THREE.Mesh(mergeGeometries([rod, capT, capB])!, wood);
      rod.dispose(); capT.dispose(); capB.dispose();
      cord = new THREE.Mesh(new THREE.TorusGeometry(R + 0.012, 0.009, 8, 40).rotateX(Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: new THREE.Color('#77428D'), roughness: 0.7, transparent: true, opacity: 0 }));
      scene.add(roller, cord, new THREE.HemisphereLight(0xffffff, 0xd8e4e8, 1.4));
      const key = new THREE.DirectionalLight(0xffffff, 1.4);
      key.position.set(-2, 3, 4);
      scene.add(key);
      if (poster) roll = target = 1;
      layout();
    },
    update(dt, _t, f: ViewFrame) {
      if (!mat) return false;
      if (!poster && ctx.motion.enabled) target = Math.max(target, Math.min(1, Math.max(0, (f.progress - 0.2) / 0.4)));
      let more = false;
      if (roll < target) {
        roll = Math.min(target, roll + Math.max(dt * 0.9, (target - roll) * Math.min(1, dt * 6)));
        more = roll < target;
      }
      layout();
      return more;
    },
    render(r) { r.render(scene, camera); },
    park() { /* one texture; kept */ },
    dispose() {
      tex?.dispose(); mat?.dispose();
      scene.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose?.(); if (m !== paper) (m.material as THREE.Material | undefined)?.dispose?.(); });
    },
    setOutline(on) { if (roller) (roller.material as THREE.MeshStandardMaterial).wireframe = on; stage?.requestFrame(); },
    setTier(t) { tier = t; const n = Math.max(120, t.counts.emakiSegments || 300); if (n !== segs) buildPaper(n); stage?.requestFrame(); },
    setRoll(p) { target = Math.max(target, p); stage?.requestFrame(); },
  };
  return view;
};

export default factory;
