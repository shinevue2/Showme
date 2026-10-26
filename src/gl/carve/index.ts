/**
 * Carve module (DESIGN §6.1, §6.7, §13.2 WP-05 "Carve API", stable for WP-09 / WP-10). Owner: WP-05.
 *
 *   carve(renderer, { source, res, profile, depthPx? }) → Promise<{ height, normal, mask, dispose() }>
 *
 * - `source`: an HTMLCanvasElement (white = raised / printing surface, black = cut away) or
 *   `{ svgPaths, viewBox }` (filled with the non-zero rule, white on black).
 * - `res`: the long side of the output in texels (clamped to 16 … min(2048, MAX_TEXTURE_SIZE)). The output keeps the
 *   source's aspect ratio (canvas width/height or viewBox w/h), so texels are square on any face.
 * - `profile`:
 *     'vcut'          woodblock: raised faces h = 1, 60° V-cut walls over `depthPx` texels, ground ≈ 0.16 … 0 with
 *                     round-chisel gouge scallops along the texture's y axis (the grain);
 *     'emboss'        karazuri: soft rounded bevel inside the figure, soft foot outside (paper, no ground marks);
 *     'seal-raised'   朱文: the source is raised (steep stone walls over depthPx/2, knife-marked ground);
 *     'seal-incised'  白文: the source is cut away and the field is raised (same stone walls).
 * - `depthPx` (default 6): wall width in output texels.
 *
 * Result (all RGBA8, LinearFilter, no mipmaps, NoColorSpace; texture v = 0 at the bottom of the source):
 * - `height.r`  height 0..1 (1 = printing surface). `height.userData = { width, height, relief }`: `relief` is the
 *   height of 1.0 in texels of this texture, so a face W world units wide displaces by `h · relief · W / width`.
 * - `normal.rgb` tangent-space normal · 0.5 + 0.5 (x → texture u, y → texture v, z out of the face), computed at full
 *   precision with that same relief (the wall angles above are physical).
 * - `mask.r` printing surface (anti-aliased; for 'seal-incised' the complement of the source); `mask.g/b` carry the
 *   source's green and blue channels for callers that encode extra layers (the cover draws ink white and an uninked
 *   raised margin pure red, so `mask.g` = ink).
 * - `dispose()` frees the three render targets / textures.
 *
 * GPU path: jump-flood signed distance field (log2(res) passes on half-float ping-pong targets, freed after carving),
 * then height and normal bakes. CPU path (cpu.ts) when half-float rendering is unavailable or the GPU path fails.
 * Long passes yield to the event loop between steps (setTimeout 0) so no single task blocks for long; no rAF is used.
 * The renderer's current render target is restored afterwards.
 */
import * as THREE from 'three';
import { BAKE_FRAG, CARVE_VERT, JFA_FRAG, MASK_FRAG, NORMAL_FRAG, SEED_FRAG } from './shaders';
import { carveCpu } from './cpu';

export type CarveProfile = 'vcut' | 'emboss' | 'seal-raised' | 'seal-incised';
export interface CarveSourcePaths { svgPaths: string[]; viewBox: [number, number, number, number] }
export interface CarveOptions {
  source: HTMLCanvasElement | CarveSourcePaths;
  res: number;
  profile: CarveProfile;
  depthPx?: number;
}
export interface CarveResult {
  height: THREE.Texture;
  normal: THREE.Texture;
  mask: THREE.Texture;
  dispose(): void;
}

const PROFILE_ID: Record<CarveProfile, number> = { vcut: 0, emboss: 1, 'seal-raised': 2, 'seal-incised': 2 };
const yieldTask = () => new Promise<void>((r) => setTimeout(r, 0));

/** Texels of relief per 1.0 of height, so the wall angles are what the profile names. */
function reliefFor(profile: CarveProfile, wall: number): number {
  if (profile === 'vcut') return (Math.tan(Math.PI / 3) * wall) / 0.84;
  if (profile === 'emboss') return 0.8 * wall;
  return (Math.tan((75 * Math.PI) / 180) * wall * 0.5) / 0.9;
}

/** Rasterise the source at w × h (white on black). */
function rasterise(source: CarveOptions['source'], w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.fillStyle = '#000';
  g.fillRect(0, 0, w, h);
  if (source instanceof HTMLCanvasElement) {
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(source, 0, 0, w, h);
  } else {
    const [vx, vy, vw, vh] = source.viewBox;
    g.save();
    g.scale(w / vw, h / vh);
    g.translate(-vx, -vy);
    g.fillStyle = '#fff';
    for (const d of source.svgPaths) g.fill(new Path2D(d), 'nonzero');
    g.restore();
  }
  return c;
}

function outSize(source: CarveOptions['source'], res: number, maxTex: number): [number, number] {
  const long = Math.max(16, Math.min(Math.round(res) || 512, 2048, maxTex || 2048));
  let aspect = 1;
  if (source instanceof HTMLCanvasElement) aspect = source.width / Math.max(1, source.height);
  else aspect = source.viewBox[2] / Math.max(1e-6, source.viewBox[3]);
  if (!(aspect > 0) || !isFinite(aspect)) aspect = 1;
  return aspect >= 1 ? [long, Math.max(1, Math.round(long / aspect))] : [Math.max(1, Math.round(long * aspect)), long];
}

function makeRT(w: number, h: number, type: THREE.TextureDataType): THREE.WebGLRenderTarget {
  const rt = new THREE.WebGLRenderTarget(w, h, {
    type,
    format: THREE.RGBAFormat,
    depthBuffer: false,
    stencilBuffer: false,
    generateMipmaps: false,
    minFilter: type === THREE.UnsignedByteType ? THREE.LinearFilter : THREE.NearestFilter,
    magFilter: type === THREE.UnsignedByteType ? THREE.LinearFilter : THREE.NearestFilter,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
  });
  rt.texture.colorSpace = THREE.NoColorSpace;
  return rt;
}

function finish(tex: THREE.Texture, w: number, h: number, relief: number): THREE.Texture {
  tex.userData = { width: w, height: h, relief };
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

async function carveGpu(renderer: THREE.WebGLRenderer, src: HTMLCanvasElement, w: number, h: number, o: CarveOptions, wall: number, relief: number, seed: number): Promise<CarveResult> {
  const srcTex = new THREE.CanvasTexture(src);
  srcTex.colorSpace = THREE.NoColorSpace;
  srcTex.generateMipmaps = false;
  srcTex.minFilter = THREE.LinearFilter;
  srcTex.magFilter = THREE.LinearFilter;
  const texel = new THREE.Vector2(1 / w, 1 / h);
  const size = new THREE.Vector2(w, h);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  quad.frustumCulled = false;
  scene.add(quad);
  const mat = (frag: string, uniforms: Record<string, THREE.IUniform>) => new THREE.ShaderMaterial({
    vertexShader: CARVE_VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false, blending: THREE.NoBlending,
  });

  const maskRT = makeRT(w, h, THREE.UnsignedByteType);
  const heightRT = makeRT(w, h, THREE.UnsignedByteType);
  const normalRT = makeRT(w, h, THREE.UnsignedByteType);
  let a = makeRT(w, h, THREE.HalfFloatType);
  let b = makeRT(w, h, THREE.HalfFloatType);
  const materials: THREE.ShaderMaterial[] = [];
  const prevRT = renderer.getRenderTarget();
  const pass = (m: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget) => {
    quad.material = m;
    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
  };
  try {
    const maskM = mat(MASK_FRAG, { tSrc: { value: srcTex }, uInvert: { value: o.profile === 'seal-incised' ? 1 : 0 } });
    const seedM = mat(SEED_FRAG, { tMask: { value: maskRT.texture }, uTexel: { value: texel } });
    const jfaM = mat(JFA_FRAG, { tSeed: { value: a.texture }, uTexel: { value: texel }, uStep: { value: 1 } });
    const prof = () => ({
      tSeed: { value: a.texture }, tMask: { value: maskRT.texture }, uTexel: { value: texel }, uSize: { value: size },
      uWall: { value: wall }, uProfile: { value: PROFILE_ID[o.profile] }, uSeed: { value: seed },
    });
    const bakeM = mat(BAKE_FRAG, prof());
    const normM = mat(NORMAL_FRAG, { ...prof(), uRelief: { value: relief } });
    materials.push(maskM, seedM, jfaM, bakeM, normM);

    pass(maskM, maskRT);
    pass(seedM, a);
    let step = 1;
    while (step * 2 < Math.max(w, h)) step *= 2;
    for (; step >= 1; step = Math.floor(step / 2)) {
      jfaM.uniforms.tSeed!.value = a.texture;
      jfaM.uniforms.uStep!.value = step;
      pass(jfaM, b);
      [a, b] = [b, a];
      renderer.setRenderTarget(prevRT);
      await yieldTask();
    }
    bakeM.uniforms.tSeed!.value = a.texture;
    normM.uniforms.tSeed!.value = a.texture;
    pass(bakeM, heightRT);
    pass(normM, normalRT);
  } catch (e) {
    maskRT.dispose(); heightRT.dispose(); normalRT.dispose();
    throw e;
  } finally {
    renderer.setRenderTarget(prevRT);
    a.dispose();
    b.dispose();
    srcTex.dispose();
    materials.forEach((m) => m.dispose());
    quad.geometry.dispose();
  }
  return {
    height: finish(heightRT.texture, w, h, relief),
    normal: finish(normalRT.texture, w, h, relief),
    mask: finish(maskRT.texture, w, h, relief),
    dispose() { heightRT.dispose(); normalRT.dispose(); maskRT.dispose(); },
  };
}

function carveOnCpu(src: HTMLCanvasElement, w: number, h: number, o: CarveOptions, wall: number, relief: number, seed: number): CarveResult {
  const data = src.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, w, h).data;
  const out = carveCpu(data, w, h, PROFILE_ID[o.profile], wall, relief, o.profile === 'seal-incised', seed);
  const tex = (d: Uint8Array) => {
    const t = new THREE.DataTexture(d, w, h, THREE.RGBAFormat, THREE.UnsignedByteType);
    t.minFilter = THREE.LinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.generateMipmaps = false;
    t.needsUpdate = true;
    return finish(t, w, h, relief);
  };
  const height = tex(out.height), normal = tex(out.normal), mask = tex(out.mask);
  return { height, normal, mask, dispose() { height.dispose(); normal.dispose(); mask.dispose(); } };
}

/** True when the GPU path can run (half-float colour attachments). */
export function canCarveOnGpu(renderer: THREE.WebGLRenderer): boolean {
  try {
    return renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float');
  } catch {
    return false;
  }
}

export async function carve(renderer: THREE.WebGLRenderer, o: CarveOptions): Promise<CarveResult> {
  const [w, h] = outSize(o.source, o.res, renderer.capabilities?.maxTextureSize ?? 2048);
  const wall = Math.max(1, o.depthPx ?? 6);
  const relief = reliefFor(o.profile, wall);
  const seed = 7.31;
  const src = rasterise(o.source, w, h);
  if (canCarveOnGpu(renderer)) {
    try {
      return await carveGpu(renderer, src, w, h, o, wall, relief, seed);
    } catch (e) {
      console.warn('[carve] GPU path failed, using the CPU fallback', e);
    }
  }
  await yieldTask();
  return carveOnCpu(src, w, h, o, wall, relief, seed);
}

/** For tests and tooling: run only the CPU path (same output layout as the GPU path). */
export async function carveCpuOnly(o: CarveOptions, maxTex = 2048): Promise<CarveResult> {
  const [w, h] = outSize(o.source, o.res, maxTex);
  const wall = Math.max(1, o.depthPx ?? 6);
  return carveOnCpu(rasterise(o.source, w, h), w, h, o, wall, reliefFor(o.profile, wall), 7.31);
}
