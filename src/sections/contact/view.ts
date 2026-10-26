/**
 * View `contact-seal` (DESIGN §6.10). Owner: WP-10. Registered only while stamping, then unregistered.
 * The 白文「湊」 seal stone from WP-09's `createSealStone` (src/gl/seal, §13.2 Seal API) descends onto the letter
 * beside the signature, presses ~300 ms, twists a hair and lifts; its impression decal stays until the section swaps
 * in the identical SVG impression (same size and twist) and lets the view go. The canvas is transparent: the
 * letter paper (DOM, below the canvas) shows through.
 */
import * as THREE from 'three';
import type { AppContext, StageAPI, View } from '../../core/types';
import { cssColor } from '../../gl/stage/view-helpers';

/** seal height in px on the page (matches .letter__stamp) and the slot size (matches .letter__seal) */
export const STAMP_H = 56, SLOT = 200;
const PRESS_MS = 1500;
const TILT = THREE.MathUtils.degToRad(12);

export interface SealView extends View {
  /** resolves once the stone exists (or rejects on failure) */
  readonly ready: Promise<void>;
  /** play the stamp; resolves at the end with the impression's pressure and twist (radians, world y) */
  stamp(): Promise<{ pressure: number; rotation: number }>;
}

interface StoneLike { group: THREE.Group; press(t: number): void; impression(): { texture: THREE.Texture; quad: THREE.Mesh }; dispose(): void; ready?: Promise<void>; jitter?: number; setSealColor?(c: THREE.ColorRepresentation): void }

const factory = (el: HTMLElement, ctx: AppContext): SealView => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  // the visible height at the paper spans the slot; the stone's unit depth spans the stamp
  const D = SLOT / (STAMP_H * 2 * Math.tan(THREE.MathUtils.degToRad(15)));
  camera.position.set(0, D * Math.cos(TILT), D * Math.sin(TILT));
  camera.up.set(0, 0, -1);
  camera.lookAt(0, 0, 0);
  let stone: StoneLike | null = null;
  let stg: StageAPI | null = null;
  let play: { t0: number; resolve: (r: { pressure: number; rotation: number }) => void } | null = null;
  let resolveReady!: () => void, rejectReady!: (e: unknown) => void;
  const ready = new Promise<void>((res, rej) => { resolveReady = res; rejectReady = rej; });
  ready.catch(() => { /* handled by the caller */ });

  const view: SealView = {
    id: 'contact-seal', el, scene, camera, printName: '落款', vram: 1024 * 1024,
    ready,
    async init(stage: StageAPI) {
      stg = stage;
      try {
        const [{ createSealStone }, paths] = await Promise.all([
          import('../../gl/seal'),
          fetch(ctx.assets.url('img/gen/seal-paths.json')).then((r) => r.json() as Promise<{ minato: { viewBox: [number, number, number, number]; face: string; glyph: string[] } }>),
        ]);
        const m = paths.minato;
        const s = createSealStone(stage, { face: { svgPaths: [m.face, ...m.glyph], viewBox: m.viewBox } as never, style: 'hakubun', res: stage.tier.counts.sealRes || 256 }) as StoneLike;
        stone = s;
        s.setSealColor?.(cssColor(el, '--seal', '#CB1B45'));
        scene.add(s.group);
        scene.add(s.impression().quad);
        s.press(0);
        if (s.ready) await s.ready;
        resolveReady();
      } catch (e) { rejectReady(e); throw e; }
    },
    update() {
      if (!stone || !play) return false;
      const t = (performance.now() - play.t0) / PRESS_MS;
      stone.press(Math.min(1, t));
      if (t >= 1) {
        const r = play.resolve;
        play = null;
        r({ pressure: 0.86 + 0.12 * ((ctx.print.seed % 97) / 97), rotation: stone.jitter ?? 0 });
        return false;
      }
      return true;
    },
    render(r) { r.render(scene, camera); },
    park() { /* registered only while stamping */ },
    dispose() { stone?.dispose(); stone = null; },
    setOutline() { /* the stone module reads uOutline */ },
    stamp() {
      return new Promise((resolve) => { play = { t0: performance.now(), resolve }; stg?.requestFrame(); });
    },
  };
  return view;
};

export default factory;
