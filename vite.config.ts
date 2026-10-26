/**
 * Vite configuration (DESIGN §8.9). Owner: WP-00.
 * base './' → every URL is relative, so dist/ works from any sub-path. Chunks: `three`, `motion`
 * (gsap + lenis), `mediabunny` (Rolldown `codeSplitting.groups`, the non-deprecated form of manualChunks).
 */
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { ssg, STUB_PAGE_FILES } from './build/ssg-plugin.ts';

const root = fileURLToPath(new URL('.', import.meta.url));
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

const STUB_PAGES: Record<string, string> = Object.fromEntries(
  STUB_PAGE_FILES.map((f) => [f.replace(/\.html$/, ''), fileURLToPath(new URL('./' + f, import.meta.url))]),
);

export default defineConfig({
  root,
  base: './',
  appType: 'mpa',
  publicDir: 'public',
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  define: {
    __HANMOTO_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [ssg()],
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsDir: 'assets',
    cssCodeSplit: false,
    modulePreload: { polyfill: false },
    assetsInlineLimit: 0,
    sourcemap: false,
    emptyOutDir: true,
    chunkSizeWarningLimit: 600,   // the three chunk (≈ 523 kB min, 129 kB gzip) is expected and loads after LCP
    rolldownOptions: {
      input: STUB_PAGES,
      output: {
        codeSplitting: {
          // JS modules only: `lenis/dist/lenis.css` (imported by src/sections/styles.ts into the one CSS
          // bundle) must not pull the motion group into the entry chunk — that would execute gsap + lenis
          // (≈ 49 kB gzip) before LCP (§8.8, §10.1 "JS before LCP ≤ 15 kB").
          groups: [
            { name: 'three', test: /[\\/]node_modules[\\/]three[\\/](?!.*\.css(?:$|\?))/ },
            { name: 'motion', test: /[\\/]node_modules[\\/](?:gsap|lenis)[\\/](?!.*\.css(?:$|\?))/ },
            { name: 'mediabunny', test: /[\\/]node_modules[\\/]mediabunny[\\/](?!.*\.css(?:$|\?))/ },
          ],
        },
      },
    },
  },
  server: { port: 5170, strictPort: true },
  preview: { port: 4170, strictPort: true },
});
