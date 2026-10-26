/**
 * Capture page entry (DESIGN §7.3 step 4, threejs §j; owner WP-03). Served by Vite dev on 5173:
 *   http://localhost:5173/tools/film/capture.html?variant=landscape|portrait[&frame=N][&hide=traveller,restmist]
 * Renders the film at master resolution with antialias + preserveDrawingBuffer (capture only) and exposes
 *   window.capture = { ready, fps, frames, rest, render(f), frames(start, n, mime) → data URLs }.
 * Deterministic: textures are awaited, shaders compiled with compileAsync, one throw-away frame is rendered.
 */
import * as THREE from 'three';
import type { PlatesJson } from './types';
import { createFilmScene } from './film-scene';
import { VARIANTS, type Variant } from './timeline';

declare global {
  interface Window {
    capture?: {
      ready: boolean;
      error?: string;
      fps: number;
      count: number;
      rest: readonly number[];
      render(f: number): Promise<void>;
      frames(start: number, n: number, mime?: string): Promise<string[]>;
    };
  }
}

async function main(): Promise<void> {
  const params = new URLSearchParams(location.search);
  const variant = (params.get('variant') === 'portrait' ? 'portrait' : 'landscape') as Variant;
  const spec = VARIANTS[variant];
  const scale = Number(params.get('scale') ?? '1') || 1;
  const canvas = document.createElement('canvas');
  document.body.appendChild(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, alpha: false, stencil: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1);
  renderer.setSize(Math.round(spec.width * scale), Math.round(spec.height * scale), false);
  canvas.style.width = `${Math.round(spec.width * scale)}px`;
  canvas.style.height = `${Math.round(spec.height * scale)}px`;
  const base = '/assets-src/film/';
  const plates = (await (await fetch(`${base}plates/plates.json`, { cache: 'no-store' })).json()) as PlatesJson;
  const hide = (params.get('hide') ?? '').split(',');
  const film = await createFilmScene(renderer, plates, variant, base, { hideTraveller: hide.includes('traveller'), hideRestMist: hide.includes('restmist') });
  const show = async (f: number) => {
    await film.prepare(f);
    film.render(f);
  };
  await show(0);
  // compile every program of the film (all stations, traveller, mist pass), then a throw-away frame
  await film.compile();
  film.render(0);
  window.capture = {
    ready: true,
    fps: spec.fps,
    count: spec.frames,
    rest: spec.rest,
    render: show,
    async frames(start: number, n: number, mime = 'image/png') {
      const out: string[] = [];
      for (let k = 0; k < n; k++) {
        await show(start + k);
        out.push(canvas.toDataURL(mime));
      }
      return out;
    },
  };
  const f = params.get('frame');
  if (f !== null) await show(Number(f));
}

main().catch((e: unknown) => {
  window.capture = { ready: false, error: String((e as Error)?.stack ?? e), fps: 0, count: 0, rest: [], render: async () => {}, frames: async () => [] };
  console.error(e);
});
