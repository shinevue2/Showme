/**
 * View helpers (DESIGN §8.6). Owner: WP-00.
 *
 * `createStubView()` is the flat test plane every 3D section registers until its owner replaces view.ts
 * (DESIGN §13.1 "a flat test plane per view"). It exercises the whole contract: shared global uniforms
 * (uTime, uNight, uMotion, uOutline, uPointer), section progress, view-local pointer, tier hooks, outline,
 * park/dispose, context restore, and the colorspace chunk. It renders on demand only (update() → false).
 *
 * Also exported: `cssColor()` to read a token colour from the placeholder, and `BaseView`, a small
 * convenience base class for real views (optional — views may implement `View` directly).
 */
import * as THREE from 'three';
import type { AppContext, GlobalUniforms, StageAPI, Tier, View, ViewFrame } from '../../core/types';

/** Read a CSS custom property (token) from an element as a THREE.Color (sRGB → linear working space). */
export function cssColor(el: Element, prop: string, fallback = '#0F2540'): THREE.Color {
  const raw = getComputedStyle(el).getPropertyValue(prop).trim() || fallback;
  const c = new THREE.Color();
  try { c.setStyle(raw); } catch { c.setStyle(fallback); }
  return c;
}

/** Optional base class: holds el/scene/camera, wires global uniforms and disposes a scene graph. */
export abstract class BaseView implements View {
  readonly scene = new THREE.Scene();
  abstract readonly camera: THREE.Camera;
  vram = 0;
  protected stage: StageAPI | null = null;
  constructor(readonly id: string, readonly el: HTMLElement, readonly printName: string, protected ctx: AppContext) {}
  async init(stage: StageAPI): Promise<void> { this.stage = stage; }
  abstract update(dt: number, t: number, f: ViewFrame): boolean;
  render(renderer: THREE.WebGLRenderer): void { renderer.render(this.scene, this.camera); }
  dispose(): void {
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose?.();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose()); else mat?.dispose?.();
    });
  }
}

const STUB_VERT = /* glsl */`
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const STUB_FRAG = /* glsl */`
uniform vec3 uInk, uPaper, uAccent;
uniform float uTime, uNight, uMotion, uOutline, uProgress, uAspect, uDensity;
uniform vec2 uLocalPointer; uniform float uHasPointer;
varying vec2 vUv;
float line(float d, float w){ return 1.0 - smoothstep(w * 0.5, w * 0.5 + fwidth(d) * 1.5, abs(d)); }
void main(){
  vec2 p = vUv;
  vec2 q = vec2(p.x * uAspect, p.y);
  // test plane: accent ground, kento-style 10 % grid, the diagonal cross of an Illustrator outline box
  vec3 col = mix(uPaper, uAccent, 0.55);
  vec2 g = fract(q * uDensity);
  float grid = max(line(g.x - 0.5, 0.012 * uDensity), line(g.y - 0.5, 0.012 * uDensity));
  col = mix(col, uInk, grid * 0.18);
  float cross = max(line(p.x - p.y, 0.004), line(p.x + p.y - 1.0, 0.004));
  col = mix(col, uInk, cross * 0.35);
  // a registration band that follows the section's scroll progress (shows the plumbing works)
  float band = line(p.x - uProgress, 0.02);
  col = mix(col, uInk, band * 0.6);
  // a slow ambient drift scaled by uMotion (time-driven terms always multiply uMotion)
  float drift = 0.5 + 0.5 * sin(uTime * 0.6 * uMotion + p.y * 6.2831);
  col *= 0.97 + 0.03 * drift;
  // pointer light (view-local NDC → uv)
  vec2 lp = uLocalPointer * 0.5 + 0.5;
  float light = uHasPointer * smoothstep(0.35, 0.0, distance(q, vec2(lp.x * uAspect, lp.y)));
  col += light * 0.12;
  // night relight: cooler, darker ground, never inverted
  col = mix(col, col * vec3(0.55, 0.62, 0.85), uNight * 0.7);
  // outline view: keylines only
  vec3 outlineCol = mix(uPaper, uInk, max(grid * 0.5, max(cross, band)));
  col = mix(col, outlineCol, uOutline);
  // frame edge
  float edge = max(max(line(p.x, 0.006), line(p.x - 1.0, 0.006)), max(line(p.y, 0.006 * uAspect), line(p.y - 1.0, 0.006 * uAspect)));
  col = mix(col, uInk, edge);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

export interface StubViewOptions {
  id: string;
  printName: string;
  /** CSS custom property for the plane colour (default: the section accent). */
  accentVar?: string;
}

/** The WP-00 stub: one full-rect plane, one draw call, no textures. */
export function createStubView(el: HTMLElement, ctx: AppContext, o: StubViewOptions): View {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  let material: THREE.ShaderMaterial | null = null;
  let mesh: THREE.Mesh | null = null;
  let g: GlobalUniforms | null = null;
  const local = { pointer: new THREE.Vector2(), has: 0 };
  let aspect = 1;
  let ro: ResizeObserver | null = null;

  const refreshColors = () => {
    if (!material) return;
    const u = material.uniforms;
    (u.uInk!.value as THREE.Color).copy(cssColor(el, '--ink'));
    (u.uPaper!.value as THREE.Color).copy(cssColor(el, '--paper'));
    (u.uAccent!.value as THREE.Color).copy(cssColor(el, o.accentVar ?? '--accent', '#5383C3'));
  };

  const view: View = {
    id: o.id,
    el,
    scene,
    camera,
    printName: o.printName,
    vram: 64 * 1024,
    async init(stage: StageAPI) {
      g = stage.g;
      material = new THREE.ShaderMaterial({
        name: `stub:${o.id}`,
        vertexShader: STUB_VERT,
        fragmentShader: STUB_FRAG,
        uniforms: {
          uInk: { value: new THREE.Color() },
          uPaper: { value: new THREE.Color() },
          uAccent: { value: new THREE.Color() },
          uTime: g.uTime,
          uNight: g.uNight,
          uMotion: g.uMotion,
          uOutline: g.uOutline,
          uProgress: { value: 0 },
          uAspect: { value: 1 },
          uDensity: { value: 10 },
          uLocalPointer: { value: local.pointer },
          uHasPointer: { value: 0 },
        },
        depthTest: false,
        depthWrite: false,
      });
      mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
      mesh.frustumCulled = false;
      scene.add(mesh);
      refreshColors();
      ctx.theme.on(() => { refreshColors(); stage.requestFrame(); });
      ro = new ResizeObserver((entries) => {
        const b = entries[0]!.contentRect;
        aspect = b.height > 0 ? b.width / b.height : 1;
        stage.requestFrame();
      });
      ro.observe(el);
    },
    update(_dt, _t, f) {
      if (!material) return false;
      const u = material.uniforms;
      u.uProgress!.value = f.sectionProgress;
      u.uAspect!.value = aspect;
      if (f.pointer) { local.pointer.copy(f.pointer); u.uHasPointer!.value = 1; } else u.uHasPointer!.value = 0;
      return false;   // render on demand: frames come from scroll, pointer, theme and tier changes
    },
    render(renderer) {
      renderer.render(scene, camera);
    },
    park() { /* no render targets to free */ },
    dispose() {
      ro?.disconnect();
      mesh?.geometry.dispose();
      material?.dispose();
      scene.clear();
    },
    onContextRestored() { refreshColors(); },
    setOutline() { /* driven by the shared uOutline uniform */ },
    setTier(t: Tier) {
      if (material) material.uniforms.uDensity!.value = t.name === 'high' ? 12 : t.name === 'medium' ? 10 : 6;
    },
  };
  return view;
}
