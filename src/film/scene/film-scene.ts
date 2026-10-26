/**
 * The film scene (DESIGN §7.2–§7.3, owner WP-03): seven tatebanko dioramas along −x, the traveller, mist cards
 * and the gold suyari outro, all driven by the frame index. Used by the capture page (offline render of the
 * masters) and available to the optional live "生 / 版" toggle (§7.6).
 */
import * as THREE from 'three';
import type { PlatesJson } from './types';
import { StationScene } from './tatebanko';
import { cameraAt } from './camera-paths';
import { MistLayer, VEIL_FULL } from './mist';
import { Traveller } from './traveller';
import { REST_TIMES, VARIANTS, phase, smooth, type Variant, type VariantSpec } from './timeline';

export interface FilmScene {
  readonly spec: VariantSpec;
  readonly stations: readonly StationScene[];
  prepare(f: number): Promise<void>;
  /** compile every program of the scene and the mist pass (renderer.compileAsync) */
  compile(): Promise<void>;
  render(f: number): void;
  /** release textures, geometries and materials (the live 生 / 版 toggle can mount and unmount it) */
  dispose(): void;
}

/** Wipe progress of station k at frame f: plate k rubs in over frames rest_k − 24 … rest_k − 4 (30 fps). */
export function wipeAt(spec: VariantSpec, k: number, f: number): number {
  if (k === 0) return 1;
  const t = f / spec.fps;
  const rt = REST_TIMES[k]!;
  return smooth(rt - 0.8, rt - 0.1333, t);
}

export interface FilmSceneOptions {
  /** review aid (tools/film/verify.mjs): render without the traveller, to measure him by difference */
  hideTraveller?: boolean;
  /** review aid: render without the rest mist banks (to study the bare dioramas) */
  hideRestMist?: boolean;
}

export async function createFilmScene(renderer: THREE.WebGLRenderer, plates: PlatesJson, variant: Variant, base: string,
                                      opts: FilmSceneOptions = {}): Promise<FilmScene> {
  const spec = VARIANTS[variant];
  const aspect = spec.width / spec.height;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, aspect, 0.1, 400);
  const stations = plates.order.map((id, i) => new StationScene(plates, plates.stations[id]!, i, base, variant, aspect));
  for (const s of stations) scene.add(s.group);
  const travTex = await new THREE.TextureLoader().loadAsync(`${base}traveller.png`);
  travTex.colorSpace = THREE.NoColorSpace;
  travTex.premultiplyAlpha = true;
  travTex.generateMipmaps = true;
  travTex.minFilter = THREE.LinearMipmapLinearFilter;
  travTex.anisotropy = 4;
  const traveller = new Traveller(spec, stations.map((s) => s.geom), travTex);
  scene.add(traveller.mesh);
  const mist = new MistLayer(spec, plates.plates);
  // the paper is given in sRGB: the renderer converts the clear colour to its output space, so it must be tagged
  // (an untagged Color is linear and would clear to #FBFEFF instead of --paper)
  renderer.setClearColor(new THREE.Color().setRGB(plates.paper[0] / 255, plates.paper[1] / 255, plates.paper[2] / 255, THREE.SRGBColorSpace), 1);
  renderer.autoClear = false;

  /**
   * the one station on screen at frame f: in a travel segment the departing diorama gives way to the arriving one
   * in the middle of the window where the paper veil covers the whole frame, so neither is ever seen in the
   * other's frames (each can keep a sky wide enough for its whole camera move)
   */
  const SWAP = (VEIL_FULL[0] + VEIL_FULL[1]) / 2;
  const needed = (f: number): number[] => {
    const ph = phase(spec, f);
    return (ph.outro ? [6] : ph.atRest || ph.u < SWAP ? [ph.k] : [ph.k + 1]).filter((i) => i < stations.length);
  };

  return {
    spec,
    stations,
    async prepare(f: number) {
      const need = new Set(needed(f));
      // keep at most the needed stations resident (texture memory stays flat across the whole film)
      for (let i = 0; i < stations.length; i++) if (!need.has(i) && stations[i]!.loaded) stations[i]!.unload();
      for (const i of need) await stations[i]!.load();
    },
    async compile() {
      // hidden stations are skipped by compileAsync: make all of them visible for the compile, then restore
      const vis = stations.map((s) => s.group.visible);
      for (const s of stations) s.group.visible = true;
      traveller.mesh.visible = true;
      await renderer.compileAsync(scene, camera);
      await renderer.compileAsync(mist.scene, mist.camera);
      stations.forEach((s, i) => { s.group.visible = vis[i]!; });
    },
    render(f: number) {
      const need = new Set(needed(f));
      for (let i = 0; i < stations.length; i++) {
        const s = stations[i]!;
        s.group.visible = need.has(i) && s.loaded;
        if (s.group.visible) {
          s.setWipe(wipeAt(spec, i, f));
          // the arriving diorama's mist bank takes over from the crossing cards, then withdraws (rest-mist.ts)
          const ph = phase(spec, f);
          s.restMist.setArrival(!ph.outro && !ph.atRest && i === ph.k + 1 ? ph.u : null);
          if (opts.hideRestMist) s.restMist.group.visible = false;
        }
      }
      const cam = cameraAt(spec, stations.map((s) => s.geom), f);
      camera.position.set(cam.x, cam.y, cam.z);
      camera.fov = cam.fov;
      camera.updateProjectionMatrix();
      traveller.update(f);
      if (opts.hideTraveller) traveller.mesh.visible = false;
      renderer.clear(true, true, true);
      renderer.render(scene, camera);
      if (mist.update(f)) renderer.render(mist.scene, mist.camera);
    },
    dispose() {
      for (const s of stations) s.unload();
      travTex.dispose();
      const free = (o: THREE.Object3D) => o.traverse((n) => {
        const m = n as THREE.Mesh;
        if (!m.isMesh) return;
        m.geometry.dispose();
        for (const mat of Array.isArray(m.material) ? m.material : [m.material]) mat.dispose();
      });
      free(scene);
      free(mist.scene);
    },
  };
}
