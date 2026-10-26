# 八度摺 · Eight Impressions · 八版套印

Portfolio of 瀬川 湊 / Minato Segawa (a complete, fictional persona — replaceable sample data). The site prints
itself as you read: scroll position = printing pass = career year.

**The binding spec is [`docs/DESIGN.md`](docs/DESIGN.md).** Read §0 first. File ownership is absolute (§8.3,
§13.2): write only the files your work package owns; ask for anything else in `docs/wp-requests/<WP-ID>.md`.

## Quick start

```bash
npm ci                      # Node ≥ 22.12
npm run dev                 # http://localhost:5170/  (en/ and zh/ beside it, 404.html, works/<caseId>/)
npm run build               # → dist/ (typecheck, Vite, SSG of the 22 pages, postbuild checks)
npm run preview             # serves dist/ on http://localhost:4170/
```

## Deploy

`dist/` is a plain static site with **relative URLs only**, so it works from any host and any sub-path (GitHub
Pages, Netlify, Cloudflare Pages, S3 + CloudFront, nginx …). Upload the whole folder. The host must:

- serve `index.html` for directory URLs (`/en/`, `/works/ledger/`, `/zh/works/platform/`) — the default almost
  everywhere; on S3 enable static website hosting, on nginx keep `index index.html; try_files $uri $uri/ =404;`;
- serve `404.html` for misses (`error_page 404 /404.html;`, Netlify/Pages pick it up automatically). Its links
  assume it is served from the site root;
- send `.avif`, `.woff2`, `.mp4`, `.webm` with their usual MIME types (all common hosts do).

Optional at build time: `SITE_ORIGIN=https://example.com npm run build` writes absolute canonical / hreflang / OG
URLs and `dist/sitemap.xml`. Long-cache `assets/` (hashed names); keep HTML on a short cache.

## Replacing the sample persona

Everything about the person is data in `src/content/` (text in ja / en / zh side by side):

| File | What it holds |
|---|---|
| `facts.ts` | person, employers, career years, metrics, cases, tools (+ `toolLabels`), banzuke, testimonials, writing |
| `copy.ts` | every section's headings, stage lines, takeaways, captions and microcopy |
| `site.config.ts` | page titles and descriptions, email, GitHub / LinkedIn links, `contactEndpoint` (POST target of the form; `null` opens mail), `siteOrigin`, `sampleNotice` |
| `glossary.ts`, `credits.ts`, `images.json` | Info-panel glossary, picture credits, image manifest |

Then:
1. Keep the types in `src/content/types.ts` satisfied (`npm run typecheck` tells you what is missing).
2. Set `sampleNotice: false` in `site.config.ts` (removes the "replaceable sample data" line).
3. Re-subset the fonts for the new text: `npm run fonts` (needs network; display faces are cut to the glyphs used).
4. Rebuild, then regenerate the derived files from a running preview: `npm run cv -- --base http://127.0.0.1:4170/`
   (CV PDFs in `public/cv/`), `node scripts/images/og.mjs` (OG images, if name or role changed),
   `npm run capture:posters` and the cover stills (WP-05 notes in `docs/wp-requests/WP-05.md`) if the name changed;
   rebuild once more so `dist/` carries them.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server on **5170**. Other ports: `npx vite --port 517N --strictPort`. |
| `npm run build` | `tsc --noEmit && vite build && node scripts/postbuild.mjs` → `dist/` (22 pages, relative URLs). Always under the build lock (below). |
| `npm run preview` | Serves `dist/` on **4170** (`--port 417N` for others). |
| `npm run typecheck` | TypeScript 7 (`tsc --noEmit`, strict, `@/*` → `src/*`). |
| `npm run fonts` · `images` | Font subsets (`scripts/fonts/fetch-fonts.mjs`; check with `node scripts/fonts/check-fonts.mjs pages <previewUrl>`) and image derivatives. |
| `npm run film:plates · film:capture · film:encode · film:publish` | Film pipeline (`tools/film/**`): plates → `node tools/film/traveller.mjs` → capture (landscape, portrait) → encode → publish → `node tools/film/verify.mjs --content --determinism`. |
| `npm run capture:posters` | View posters via `?poster=<viewId>&theme=` (needs a running preview, `--base <url>`). |
| `npm run cv` | CV PDFs `public/cv/cv-{ja,en,zh}.pdf` from the print stylesheet (needs a running preview, `--base <url>`). |
| `npm run check` | Smoke test of every built page at 1440 and 390: console errors, HTTP ≥ 400, horizontal overflow (`--base <url>`). |

QA switches on any main page: `?tier=high|medium|low|software|static`, `?film=static|stills|webcodecs|sd|hd|portrait`,
`?proof=1` (print/Proof mode), `?theme=day|night`; `window.__hanmoto` is the debug API.

## Machine rules (4 CPUs, ~3.5 GB free RAM, shared)

```bash
flock /home/star/Documents/Portf/.locks/browser.lock <playwright/chromium command>   # ONE browser at a time
flock /home/star/Documents/Portf/.locks/ffmpeg.lock nice -n 10 <ffmpeg command>      # one encode at a time
flock /home/star/Documents/Portf/.locks/build.lock npm run build                      # never two builds
```

npm scripts do not take locks themselves (nesting `flock` on the same file deadlocks): wrap the command.
Headless WebGL: Playwright from `node_modules/playwright` (1.64.1, Chromium 1248) with
`['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']` — correctness only, never tune to it.
`tools/bin/ffmpeg` (7.0.2 static: libx264, libaom, libvpx, libwebp; no drawtext) and `tools/bin/ffprobe` are gitignored copies.

## How the site is put together

- **Static first.** The 22 stub pages (`index.html`, `en/`, `zh/`, `404.html`, 18 case pages) contain only
  `<!--ssr-head-->` / `<!--ssr-body-->`. `build/ssg-plugin.ts` infers `{lang, page, caseId, depth}` from the path and
  fills them with `renderPage(spec)` (`src/render/page.ts`). Render modules are **Node-safe**: they may import
  `src/content/**`, `src/render/helpers.ts`, `src/core/{types,icons,numerals,solar-term}.ts`, JSON and other
  `render.ts` files — no DOM, three, CSS or `import.meta.env`. Every word is in the HTML; JS only enhances.
- **Boot** (`src/main.ts` → `src/core/boot.ts`, §8.8): inline head script (theme, `html.js`, proof/poster flags) and
  body script (restore position); after first paint the per-language content bundle loads, `AppContext` is built,
  chrome and cover/summary mount, the `motion` chunk (gsap + ScrollTrigger + Lenis) loads, other sections mount within
  two viewports; after LCP the tier is detected and the `three` chunk + stage load. On case pages the **works** module
  is mounted with the case `<article data-section="works" data-case-page="{caseId}">` (`ctx.page === 'case'`,
  `ctx.getStage()` → null). The entry chunk must never statically import `three`/`motion`/`mediabunny`: postbuild fails
  if the entry's static import graph does or exceeds the 15 kB JS-before-LCP budget.
- **Content at runtime comes from `ctx.content`** (never import `src/content` in runtime code: it would bundle all
  three languages). In the build each page language gets its own content chunk with the other two languages' strings
  emptied — always read text with `ctx.i18n.t(x)` / `x[ctx.lang]`. Names that a page may show in another language keep
  all three: `person.name`, `copy.cover.name/nameLines`, `site.title`, `plates[].name/numeral`, `stations[].name`,
  `employers[].name`, `testimonials[].name` (list in `build/ssg-plugin.ts` `KEEP_ALL`; ask WP-00/WP-11 to extend it).
  Dev serves the full content, so test cross-language reads with a build.
- **One clock** (`src/core/frame.ts`): never start your own rAF loop. Use `frame.add(cb)` (return `true` to keep
  running), `frame.busy(name)`, or `stage.requestFrame()`; return `true` from `View.update()` only while something
  animates. Idle = zero rAF (verified). GSAP's ticker is driven by this loop; ScrollTrigger is registered without its
  keep-alive rAF loop and 250 ms sync interval (see `src/core/motion-chunk.ts`).
- **Scroll**: `ctx.scroll.track(el, { start, end, onUpdate, onToggle })` (ScrollTrigger, progress only),
  `ctx.scroll.band(id).on(p)`, `ctx.scroll.section(id).on(p)` (sticky-aware via `data-sticky`), `scrollTo`, `refresh`.
- **Stage** (`src/gl/stage`, §8.6): one canvas, scissored views, live-view cap (2, +1 inside a 間 band; 1 on low and
  software), warm-ahead one view at a time, park when far or over VRAM budget, governor (DPR first, then tier), post
  pass on the high tier, context-loss posters (`html.gl-lost`), `window.__hanmoto` debug API. Section pattern:

  ```ts
  // src/sections/<id>/index.ts
  export default { id: 'works', async mount(el, ctx) {
    const slot = el.querySelector<HTMLElement>('[data-view-id="works-byobu"]');
    const stage = await ctx.getStage();            // null: static tier, Proof mode or no WebGL2
    if (stage && slot) stage.register((await import('./view')).default(slot, ctx));
  } } satisfies SectionModule;
  ```

  Perspective cameras get their aspect from the placeholder automatically. Shared uniforms live in `stage.g`
  (reference them, never replace them). `src/gl/stage/view-helpers.ts` has the stub test plane and a `BaseView`.
- **Layering** (§8.7 + one correction): artboards are not stacking contexts; direct children are lifted to z 2 above
  the canvas (z 1) except `.view` placeholders. `position: sticky` always forms a stacking context, so sticky stages
  are lifted to z 2 as a whole and must stay transparent where the 3D shows through. DOM that must sit *behind* a view
  goes inside a `.view` placeholder that is a direct child of the artboard (`viewSlot(rc, id, { inner })`).
- **Chrome stub on mobile** (< 768 px): 48 px doc bar (crest, name, express links) + a fixed 52 px bottom toolbar with
  the language links and theme chips (`body` gets matching `padding-bottom`); WP-04 replaces both (§4.2).
- **Posters**: `viewSlot()` writes four document-relative `data-poster-*` URLs (+ an inline day poster for no-JS);
  boot sets `--poster-*` to absolute URLs near the viewport; CSS picks day/night × desktop/mobile. Files:
  `public/img/posters/{viewId}-{day|night}-{1440|390}.avif` (`npm run capture:posters`).
- **Registration snap**: `<h2 class="display" data-print data-plate="6" data-print-shape="block|band">`; seeded offsets
  from `ctx.print.seed`; CSS scroll-driven where supported, IO fallback; registered under reduced motion.
- **Separations**: `ctx.print.setHidden(n, true)` → `html[data-sep-off~="n"]` hides plate n only in decorative layers
  (`[data-print]` pseudo-elements, SVG descendants with `data-plate`, `aria-hidden` / `.plate-layer` elements).
- **Theme**: `ctx.theme.set('light'|'dark'|'auto')` (bokashi View-Transition wipe, stored in `hanmoto.theme`); the
  stage tweens `uNight` over 700 ms. Motion layer: `setMotionLayerVisible()` from `src/core/motion.ts` (WP-04).

## Contracts other WPs rely on

- **WP-02 fonts**: write `public/fonts/fonts-{ja,en,zh}.css` + `fonts-shared.css`, and optionally
  `public/fonts/preload.json` = `{ "ja": ["fonts/…woff2"], "en": […], "zh": […], "shared": […] }` (root-relative);
  the SSG plugin turns it into `<link rel="preload" as="font">` per page.
- **WP-02 images**: derivatives at `public/img/{set}/{slug}.{w}.{avif|webp}`; fill `widths` in `src/content/images.json`.
  Until then `npm run dev` serves the source JPEG for missing derivatives (dev only). CSS assets referenced as
  `/img/gen/…` resolve to relative URLs once the files exist in `public/`.
- **WP-03 film**: replace `public/film/*` and `src/film/film-manifest.json` (same schema, `FilmManifest`); the stub
  film has the exact §7.3 GOP/keyframes (K every 8 frames + the seven rest times).
- **WP-04 chrome**: `src/chrome/index.ts` default export `{ mount(ctx): ChromeAPI | Promise<ChromeAPI> }`; the return
  value backs `ctx.chrome`. `src/chrome/render.ts` `renderChrome(rc)` is included by every page.
- **WP-10 colophon**: edition = `build/edition.json` (`{ v, n }`), date stamp = `src/core/solar-term.ts`.
- **Carve / seal stubs** keep their final signatures (`src/gl/carve`, `src/gl/seal`); gold chunk re-exports *shaders*
  `GOLD_FRAG`; `src/gl/chunks/research.ts` is the verified GLSL as typed exports.

## Dependencies (exact pins, §8.2)

three 0.186.1 · gsap 3.15.0 · lenis 1.3.27 · mediabunny 1.62.1 · vite 8.3.4 · esbuild 0.28.2 · typescript 7.0.2 ·
tsx 4.23.15 · @types/three 0.186.0 · @types/node 26.6.5 (needed by `vite.config.ts` / the SSG plugin) · sharp 0.35.5 ·
playwright 1.64.1 · axe-core 4.14.0 · ffprobe-static 3.1.0. Nobody but WP-00 edits `package.json`.
