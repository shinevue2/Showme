/**
 * Entry (DESIGN §8.8). Owner: WP-00. Kept tiny (JS before LCP ≤ 15 KB gzip): the CSS bundle is imported
 * statically (render-blocking, no FOUC); the app itself loads after first paint — double rAF or the first
 * input, whichever comes first. Theme, html.js and scroll restore already ran inline (src/render/boot-script.ts).
 */
import './sections/styles';

let started = false;
function start(): void {
  if (started) return;
  started = true;
  removeEventListener('pointerdown', start);
  removeEventListener('keydown', start);
  import('./core/boot')
    .then((m) => m.boot())
    .catch((e) => console.error('[hanmoto] boot failed', e));
}

requestAnimationFrame(() => requestAnimationFrame(start));
addEventListener('pointerdown', start, { once: true, passive: true });
addEventListener('keydown', start, { once: true });
