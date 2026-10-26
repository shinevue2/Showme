# three.js technical playbook: one WebGL context, many worlds

Scope: the real-time graphics layer of the portfolio for a senior engineer with 8 years of experience. The site uses many distinct three.js effects but only one WebGL context. Everything below targets **three 0.186.1** (r186, current on npm, released Sept 2026).

The numbers in this file are **measured**, not guessed. They come from headless Chromium 1248 (Playwright 1.64.1) running SwiftShader (ANGLE → Vulkan → SwiftShader/Subzero) on this 4-CPU Linux box, at 1280×720 and DPR 1. Treat SwiftShader as the worst case, the "software floor". A real GPU is usually 20–200× faster.

Companion files in this folder:

| File | What it is |
|---|---|
| `threejs-techniques.shaders.js` | Every GLSL sketch from this document as an ES module. All of them compiled without errors on r186 / WebGL2. |
| `threejs-techniques.verify.js` | Test harness. It renders all 8 effects as scissored views inside one context, then runs one post pass. This is the multi-view architecture from (a), running for real. |
| `bench/` | The benchmark and capture scripts that produced every number in this file. |
| `threejs-techniques-contact-sheet.webp` | Output of the harness: marbling, stable fluid, GPGPU kanji 匠, raked sand, emakimono, gold byobu, kumiko + SDF, petals. |

---

## 0. Decisions at a glance

1. **Renderer: `WebGLRenderer` + GLSL (`ShaderMaterial`, `GLSL3` where useful).** Skip `WebGPURenderer` for this production site. §1 has the evidence.
2. **One fixed full-viewport `<canvas>`.** Every section registers a *view* (DOM rect → viewport/scissor, scene, camera). Only views that are visible get rendered. Views warm up through `IntersectionObserver`, park their GPU memory when far away, and share one `Timer` and one set of global uniforms.
3. **Seven effect families, one per narrative chapter.** None of them repeat a technique:
   - GPGPU curl-noise particles that morph into a kanji or crest
   - Closed-form suminagashi marbling, with stable fluids for the breath and stirring phase
   - Instanced kumiko lattice assembly
   - Vertex-deformed emakimono (handscroll) for the career timeline
   - Six-panel byobu with an anisotropic gold-leaf shader
   - Raked-sand height field that the cursor can rake
   - Verlet noren curtain, plus vertex-shader petals and one raymarched SDF accent
4. **Post-processing is one combined full-screen pass:** nijimi ink bleed, paper tooth, vignette, dusk grade, dither. No `EffectComposer` chain. Do not use `outputBufferType`/`setEffects`, because they composite once per `render()` call (§2, pitfall P2).
5. **Quality is set once, then adjusted live.** A static tier comes from heuristics (renderer string, memory, cores, pointer). An FPS governor then moves DPR and tier while the page runs, with hysteresis.
6. **Offline video comes from the same engine.** Headless Chromium renders a deterministic frame loop, sends PNG batches to `ffmpeg -f image2pipe`, and encodes with a short GOP so scrubbing is cheap. Measured: **7–10 fps end-to-end at 1280×720 on SwiftShader** for a simple PBR scene (§j).

---

## 1. WebGLRenderer or WebGPURenderer for production in late 2026?

| Criterion | WebGLRenderer (GLSL) | WebGPURenderer (TSL, WebGL2 fallback) |
|---|---|---|
| Headless test path (SwiftShader) | WebGL2 works. `EXT_color_buffer_float`, half-float RTs, float-linear and `EXT_clip_control` are all available. | **Measured.** With default flags `navigator.gpu` exists, but the renderer falls back to the **WebGL2 backend**. With `--enable-unsafe-webgpu` it gets a SwiftShader WebGPU adapter, but `queue.onSubmittedWorkDone()` threw `OperationError: A valid external Instance reference no longer exists`. So the backend under test is not the one most users get in production. |
| Bundle (esbuild, minified, minimal scene) | **539 KB min / 136 KB gzip** (including GPUComputationRenderer) | **897 KB min / 245 KB gzip** (+110 KB gz) |
| Ecosystem for the techniques we need | `GPUComputationRenderer`, `FullScreenQuad`, `EffectComposer` and every GLSL reference (Stam fluids, PavelDoGreat's fluid, GPU Gems) map 1:1. | These addons are WebGL-only. You would port everything to TSL. Compute is excellent on WebGPU, but on the WebGL2 fallback it is emulated, so performance differs by backend. |
| API stability | Mature and in maintenance. Few breaking changes since r163. | Still changing. Migration guide entries: `renderAsync` deprecated (r181), `colorBufferType`→`outputBufferType` (r182), `PostProcessing`→`RenderPipeline` (r183), premultiplied alpha rework (r185), `PCFSoftShadowMap` removed (r186), WeakRef internals and light registration changes (r187-dev). |
| Browser reach | Every browser that runs WebGL2 (~97%+) | WebGPU ships in Chrome/Edge (Android 12+ on Qualcomm/ARM since Chrome 121), Safari 26 (macOS Tahoe / iOS 26) and Firefox 141+ on Windows (Apple Silicon from 145). Firefox Android, Linux and older Safari use the fallback. |
| Shader warm-up | `compileAsync` with `KHR_parallel_shader_compile` (missing on SwiftShader: measured 90 ms for 6 physical programs) | Async pipelines (good), but TSL→WGSL/GLSL generation costs CPU |

**Verdict: WebGLRenderer.** The site has to look identical, and be testable identically, in headless SwiftShader and on real users' machines. It needs ping-pong FBO simulations, and it should keep the bundle and the unknowns small. WebGPU is where three.js invests next (Gaussian splats in r186, for example), but for this site it would add 110 KB gzip and a code path the headless test cannot exercise. **Future-proofing:** keep each effect's GLSL in its own module behind the `View` interface (§a). Porting one view to TSL later is then a local change.

---

## 2. Checklist: r150 → r186 changes that matter here

Verified against the r186 source in `node_modules/three` and the official migration guide.

| Topic | Correct r186 usage |
|---|---|
| Color management | `ColorManagement.enabled = true` (default). `renderer.outputColorSpace = SRGBColorSpace` (default). Color textures need `tex.colorSpace = SRGBColorSpace`. Data textures (normal, height, sim, LUT) stay `NoColorSpace`. `THREE.Color('#hex')` converts sRGB to the linear working space for you. `ColorManagement.fromWorkingColorSpace` was renamed `workingToColorSpace` (r177). |
| Custom shaders | A `ShaderMaterial` writes **linear** values. End fragment shaders that draw to screen with `#include <tonemapping_fragment>` (optional) and `#include <colorspace_fragment>`. Inline tone mapping only happens when the target is the screen (`null`). When you draw into an RT for post, the final pass must do tone mapping and sRGB conversion itself (§h). |
| Lights | Physically correct only. `useLegacyLights` is gone, so the old ×π fudge is gone too. Point and spot lights use `decay = 2` in candela. `Scene.environmentIntensity` exists (r163). PBR energy conservation changed in r181, so rough materials look brighter. |
| Timing | **`Clock` is deprecated (r183). Use `THREE.Timer`** (in core since r179). Call `timer.connect(document)` to use the Page Visibility API, because that is not automatic since r174. Then `timer.update(timestamp)` once per frame, followed by `getDelta()` / `getElapsed()`. |
| Render targets | `WebGLMultipleRenderTargets` was removed. For MRT use `new WebGLRenderTarget(w, h, { count: 2 })` (r162). `RenderTarget.clone()` now clones deeply (r174). **r186 quirk:** `renderer.setViewport/setScissor` always multiply by pixelRatio, even while an RT is bound. r187 changes this. Set `rt.viewport` / `rt.scissor` directly and re-bind instead. That works in both versions (P1). |
| GPGPU | `three/addons/misc/GPUComputationRenderer.js`, API unchanged: `setDataType(HalfFloatType|FloatType)`, `addVariable`, `setVariableDependencies`, `init`, `compute`, `getCurrentRenderTarget`, `dispose`. |
| New output pipeline | `new WebGLRenderer({ outputBufferType: HalfFloatType })` + `renderer.setEffects([...])` gives built-in HDR post. **Avoid it with scissored multi-view.** `WebGLOutput.end()` composites a full-screen triangle after *every* `render()` to the screen (P2). |
| Shadows | `PCFSoftShadowMap` is removed. WebGL warns and falls back to `PCFShadowMap`, which is soft now. Better: no real-time shadows at all. Bake contact shadows or fake them in the shader (§f). |
| Geometry | `uv1..3` naming (r152). `BufferAttribute.addUpdateRange()` (r159). `InstancedMesh.frustumCulled` is true, so compute the bounding sphere yourself or disable culling when the vertex shader moves instances. `BatchedMesh` needs `addGeometry` and then `addInstance` (r166). |
| Object lifecycle | `Object3D.dispose()` exists (r186). Subclasses must call `super.dispose()`. `Source` was renamed `TextureSource` (r186). |
| Shader errors | `renderer.debug.onShaderError = (gl, program, vs, fs) => …` and `renderer.debug.checkShaderErrors = false` in production, which saves sync `getProgramParameter` stalls. |
| WebGL 1 | Removed (r163). WebGL2 is assumed, so `texelFetch`, `gl_InstanceID`, UBOs (`THREE.UniformsGroup`) and integer textures are all available. |
| Experimental | `THREE.HTMLTexture` (r186) uploads a live DOM element with `texElementImage2D` (the WICG HTML-in-Canvas proposal, behind a Chrome flag). Treat it as a progressive enhancement only. The fallback is a `CanvasTexture`. |

---

## 3. Measured software-floor baseline (SwiftShader, 1280×720, DPR 1)

| Workload | Result |
|---|---|
| GPGPU curl particles, sim only / sim + draw | 4 096: **3.2 / 9.3 ms**; 16 384: **10 / 30 ms**; 65 536: **35 / 127 ms** |
| Stable fluid step (sim only; + full-screen display pass) | 64×36, 10 Jacobi: **6.8 ms** (+31 ms display); 128×72, 20 Jacobi: **32 ms** (+29); 256×144, 30 Jacobi: **153 ms** |
| Raymarch 64 steps, full-screen quad | 320×180: **4.7 ms**; 640×360: **12 ms**; 1280×720: **35 ms** |
| Multi-view (TorusKnot, `MeshNormalMaterial`) | 1 view: **13 ms**; 4 scissored views: **38 ms** |
| **Instanced draws** (box strips, 1 draw call) | ~**45–55 µs per instance**, whatever the material or fill: 500 → 28 ms, 2 000 → 105 ms, 8 000 → 407 ms. BatchedMesh costs the same, and `gl_InstanceID` + texture is only 15% faster. **Merged static geometry: 4× faster** (8 000 → 94 ms). |
| Shader warm-up | `compileAsync` on 6 `MeshPhysicalMaterial` variants: 90 ms (no `KHR_parallel_shader_compile`), first render after that: 76 ms |
| Frame capture (§j) | render 66 ms; + PNG encode 96–106 ms; end-to-end into x264: **7.0–7.4 fps** (1 frame per evaluate), **9.6 fps** (8-frame batches); raw RGBA readback: 3.0 fps; WebP: 5.2 fps |

What follows from this:
- A software-rendering visitor (SwiftShader, llvmpipe, "Microsoft Basic Render Driver") gets **posters and one live view at most**.
- In the headless capture path, prefer merged geometry over instancing.
- Full-screen fragment work is what kills software rendering. Lower the resolution before you lower anything else.

---

## (a) Single-renderer multi-view architecture

**Technique.** This is the three.js "multiple elements" pattern, scaled up for production. There is one `position: fixed` canvas. Each section's DOM placeholder (`<div data-view="kumiko">`) maps to a view rectangle, and only views that intersect the viewport get drawn. Each view draws with its own viewport and scissor. One context brings shared programs, one texture cache, no per-section context limit (iOS Safari allows about 16), and no context-creation jank between sections.

**Layering.** The canvas uses `position: fixed; inset: 0; z-index: 0; pointer-events: none`. DOM content uses `position: relative; z-index: 1` with transparent backgrounds where a view shows through. Pointer events come from the DOM element and are converted to view-local NDC.

**Scroll sync.** With native scrolling, the compositor moves the DOM a frame before `rAF` draws the canvas, and the 3D content appears to "swim". Fixes:
- Drive scrolling from the main thread with Lenis, and call `lenis.raf(t)` inside the same `setAnimationLoop` callback, or
- Make the canvas `position: absolute` and apply `transform: translateY(scrollY px)` in the render loop (what the three.js example does).

**Rects without layout thrash.** Cache `docTop = el.getBoundingClientRect().top + scrollY` and `height` in a `ResizeObserver`. Recompute them after `document.fonts.ready` and after images load. Then each frame, `top = docTop - scrollY`. Never call `getBoundingClientRect` for N views every frame.

```js
// stage.js — sketch (three r186)
import * as THREE from 'three';

export class Stage {
  constructor(canvas, tier) {
    this.tier = tier;
    this.renderer = new THREE.WebGLRenderer({
      canvas, antialias: tier.msaa && tier.maxDpr < 1.5,   // never MSAA at DPR >= 1.5 (VRAM ×4)
      alpha: true, premultipliedAlpha: true, stencil: false, powerPreference: 'high-performance',
    });
    this.renderer.setClearColor(0x000000, 0);              // DOM washi shows through between views
    this.renderer.info.autoReset = false;                  // sum stats across views for the HUD
    this.renderer.debug.checkShaderErrors = import.meta.env.DEV;
    this.dpr = Math.min(devicePixelRatio, tier.maxDpr);
    this.timer = new THREE.Timer(); this.timer.connect(document);
    // ONE set of global uniforms; materials reference these objects directly, so one write updates every program
    this.g = { uTime: { value: 0 }, uNight: { value: 0 }, uPointer: { value: new THREE.Vector2() },
               uScroll: { value: 0 }, uDpr: { value: this.dpr }, uMotion: { value: 1 } };
    this.views = []; this.visible = new Set();
    this.warmIO = new IntersectionObserver(this.#onWarm, { rootMargin: '150% 0px' });   // 1.5 screens ahead
    this.seenIO = new IntersectionObserver(this.#onSeen, { rootMargin: '0px' });
    this.ro = new ResizeObserver(() => this.measure());
    this.resize(); addEventListener('resize', () => this.resize());
    canvas.addEventListener('webglcontextlost', this.#onLost);          // three calls preventDefault()
    canvas.addEventListener('webglcontextrestored', this.#onRestored);
    document.addEventListener('visibilitychange', () => this.#loop(!document.hidden));
  }
  register(view) {                    // view: see interface below
    view.state = 'cold'; this.views.push(view);
    this.warmIO.observe(view.el); this.seenIO.observe(view.el); this.ro.observe(view.el);
  }
  measure() { const sy = scrollY; for (const v of this.views) { const r = v.el.getBoundingClientRect(); v.docTop = r.top + sy; v.left = r.left; v.w = r.width; v.h = r.height; } }
  resize() { this.renderer.setPixelRatio(this.dpr); this.renderer.setSize(innerWidth, innerHeight, false); this.measure(); }

  #onWarm = (entries) => { for (const e of entries) { const v = this.#find(e.target);
    if (e.isIntersecting && v.state !== 'live') this.#warm(v);
    else if (!e.isIntersecting && v.state === 'live') this.#maybePark(v); } };
  #onSeen = (entries) => { for (const e of entries) { const v = this.#find(e.target);
    e.isIntersecting ? this.visible.add(v) : this.visible.delete(v); }
    this.#loop(this.visible.size > 0 && !document.hidden); };          // no visible view => no rAF at all

  async #warm(v) {                     // one view at a time, so warming never stacks compile stalls
    if (v.state === 'cold') { await v.init(this); }        // CPU-side: scenes, geometry, materials
    v.state = 'warming';
    await v.allocate?.(this);                               // RTs, sim textures
    await this.renderer.compileAsync(v.scene, v.camera);    // programs compile while still off-screen
    v.prewarm?.(this);                                      // e.g. one gpu.compute() so sim programs link too
    v.state = 'live';
  }
  #maybePark(v) {                     // free MEMORY (RTs, big textures); keep materials => no recompile on return
    if (this.#vramEstimate() > this.tier.vramBudget || Math.abs(v.docTop - scrollY) > 3 * innerHeight) { v.park?.(); v.state = 'parked'; }
  }
  #loop(on) { this.renderer.setAnimationLoop(on ? this.#frame : null); }

  #frame = (time) => {
    const r = this.renderer, sy = window.lenis?.animatedScroll ?? scrollY, vh = innerHeight;
    this.timer.update(time);
    const dt = Math.min(this.timer.getDelta(), 1 / 20), t = this.timer.getElapsed();
    this.g.uTime.value = t; this.g.uScroll.value = sy;
    r.info.reset();
    // 1) simulations (each binds its own RTs; three restores canvas viewport/scissor on setRenderTarget(null))
    for (const v of this.visible) if (v.state === 'live') v.update(dt, t, (sy + vh - v.docTop) / (vh + v.h));
    // 2) draw views
    const target = this.postRT ?? null;                     // null when the tier has no post pass
    r.setRenderTarget(target); r.setScissorTest(false); r.clear();
    for (const v of this.visible) {
      if (v.state !== 'live') continue;
      const top = v.docTop - sy; if (top > vh || top + v.h < 0) continue;
      const x = v.left, y = vh - (top + v.h);               // GL origin is bottom-left; may be negative (partly off-screen)
      const x0 = Math.max(0, x), y0 = Math.max(0, y), x1 = Math.min(innerWidth, x + v.w), y1 = Math.min(vh, y + v.h);
      if (x1 <= x0 || y1 <= y0) continue;
      // viewport = FULL element rect (keeps camera aspect when clipped); scissor = visible part only.
      // autoClear stays true: each render() clears exactly its scissor rect with the view's own background.
      if (target) {                                         // version-proof: RT pixels, re-bind to apply
        const k = target.width / innerWidth;
        target.viewport.set(x * k, y * k, v.w * k, v.h * k);
        target.scissor.set(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k);
        target.scissorTest = true; r.setRenderTarget(target);
      } else {                                              // canvas: CSS px, three multiplies by DPR
        r.setViewport(x, y, v.w, v.h); r.setScissor(x0, y0, x1 - x0, y1 - y0);
        r.setScissorTest(true);
      }
      v.render(r);                                          // full element rect => camera aspect stays correct when clipped
    }
    if (target) { target.scissorTest = false; r.setRenderTarget(null); r.setScissorTest(false); this.post.render(r); }
    this.governor?.tick(time);                              // §i
  };
  #onLost = () => { this.#loop(false); document.documentElement.classList.add('gl-lost'); };      // CSS shows each view's poster
  #onRestored = () => { for (const v of this.views) if (v.state !== 'cold') { v.state = 'parked'; v.onContextRestored?.(); }
    document.documentElement.classList.remove('gl-lost'); this.measure(); this.#loop(this.visible.size > 0); };
  #find(el) { return this.views.find(v => v.el === el); }
  #vramEstimate() { return this.views.reduce((s, v) => s + (v.state === 'live' ? (v.vram ?? 0) : 0), 0); }
}
```

**View interface.** Each chapter implements this. Sections never touch the renderer directly.

```js
/** @typedef View
 * el: HTMLElement           placeholder; its CSS background-image is the poster (no-WebGL / context-lost fallback)
 * scene, camera             created in init()
 * vram: number              estimated bytes while live (drives parking)
 * init(stage)               CPU-side construction (no GPU allocations beyond geometry)
 * allocate(stage)           render targets / sim textures
 * prewarm(stage)            run one sim step so programs outside the scene graph (GPGPU, FSQ passes) are linked
 * update(dt, t, progress)   sims + uniforms; progress = 0..1 as the section crosses the viewport
 * render(renderer)          renderer.render(scene, camera) — may draw a background quad first
 * park()                    dispose RTs and large textures; keep materials (program cache)
 * onContextRestored()       rebuild RT contents (sim state is lost), re-seed deterministic sims
 */
```

**Lazy init timeline:**
- At 150% of a screen ahead: `init` + `allocate` + `compileAsync` + `prewarm`.
- On entering the viewport: render.
- On leaving the 150% zone: park, but only if over the VRAM budget or more than 3 screens away.

Parking frees memory (RTs are the big items) but keeps materials. Re-linking a program costs 50–300 ms on Windows/ANGLE-D3D11, while a material object costs a few KB.

**Shared clock, pause, budget.**
- One `Timer`. `dt` is clamped to 50 ms so simulations never explode after a stall.
- `setAnimationLoop(null)` whenever no view is visible or the tab is hidden. Zero frames, zero battery.
- Sims that don't need to run continuously, like marbling, render **on demand**: `update()` returns `false` and the stage skips the frame if no view requested one.

**Context loss.**
- three already calls `preventDefault()` on `webglcontextlost`, and on restore it re-initializes state and re-uploads geometry and textures that still have their source data.
- **Render-target contents are lost.** Sims must re-seed: deterministic seeds make this invisible.
- If you `close()` ImageBitmaps after upload to save RAM, keep the URL so you can reload them after a restore.
- Test with `renderer.getContext().getExtension('WEBGL_lose_context').loseContext()` and then `.restoreContext()`.

**Transitions between sections (cheap and per-environment).** Views may overlap while they hand over. Four options, cheapest first:
1. **Ink reveal.** The incoming view discards `fbm(uv*3.0) > uReveal` and darkens the edge band (`smoothstep(uReveal-0.04, uReveal, n)`). Cost: one noise eval per pixel.
2. **Shared actor.** The GPGPU particle layer is a full-screen view behind two sections, and scroll progress switches its target shape. The kanji of chapter A dissolves into the crest of chapter B.
3. **Physical metaphor.** Choose one per environment: the noren is pushed aside (cloth plus a camera dolly through it), the byobu folds closed into the next panel (`uFold` → 1.45), the emakimono rolls up (`uRight` → `uLeft`), the sand is swept flat by a rake (the trail RT is cleared with an animated sweep).
4. **Camera continuity.** Two adjacent chapters share one scene and the camera travels along a CatmullRom path keyed to scroll. That is one view instead of two.

**GPU cost.**
- One clear plus N views × (their own draw calls).
- Fill is bounded by the visible area: views are scissored, so the total fill ≤ 1× the screen plus the overlap during transitions.
- Measured on SwiftShader: 4 views cost 2.9× one view, which is mostly fixed per-view overhead.

**Tiers.**

| Tier | Simultaneous live views | Warm-ahead | Post RT |
|---|---|---|---|
| high | ≤ 3 | 150% | HalfFloat |
| medium | ≤ 2 | 100% | RGBA8 + dither |
| low / mobile | 1, with a hard handover | 60% | none (CSS grain) |
| software | 1 view at DPR 0.75, poster images elsewhere | — | — |

**Reduced motion** (`matchMedia('(prefers-reduced-motion: reduce)')`, plus an in-page "pause motion" toggle for WCAG 2.2.2):
- Set `g.uMotion.value = 0`. Every shader multiplies its time-driven terms by `uMotion`.
- The stage switches to render-on-demand: one frame on enter, resize or theme change.
- Scroll-linked movement becomes cross-fades. Interaction-triggered motion (raking sand, clicking a drop) stays, because it is user-initiated (WCAG 2.3.3), but without long tails.

---

## (b) GPGPU particles: ping-pong FBO, curl noise, morphing between shapes

**Technique.** Store state in float textures: `tPos` (xyz + per-particle random in w) and `tVel`, side length N, so N² particles. `GPUComputationRenderer` runs one full-screen pass per variable per step (2 passes) and ping-pongs two RTs per variable. A `Points` draw reads `tPos` in the vertex shader through a per-vertex `aRef` UV. Motion is:
- a spring toward a **target shape** (stacked target textures, blended),
- **curl noise** (the curl of a 3-D vector potential, so the flow has zero divergence and swirls instead of clumping; Bridson 2007),
- pointer repulsion and damping.

**Target shapes from the canvas.**
1. Draw the kanji (e.g. 匠 *takumi*, "master craftsman") with the site's own display font, or an SVG `Path2D` for a kamon, the engineer's monogram, or a git-graph glyph.
2. Read it back with `getImageData` and collect the pixels where alpha > 128.
3. Pick N² samples at random, with sub-pixel jitter and a small z thickness.
4. Store them as rows of one `DataTexture` (`N × N·shapes`).

To morph, animate `uShapeA/B/uBlend`, or swap target rows on scroll. Assignment matters:
- random sample → particle assignment gives a turbulent swarm,
- sorting both sets by x (or Morton code) gives a coherent "flow" between glyphs.

The contact sheet shows 16 384 particles that have settled on 匠.

```js
const N = tier.particlesSide;                                  // 512 / 256 / 128 / 64
const gpu = new GPUComputationRenderer(N, N, renderer);
gpu.setDataType(tier.floatRT ? THREE.FloatType : THREE.HalfFloatType);   // see precision note
const vel = gpu.addVariable('tVel', GPGPU_VEL, gpu.createTexture());
const pos = gpu.addVariable('tPos', GPGPU_POS, seededPositions(gpu.createTexture(), seed));
gpu.setVariableDependencies(vel, [pos, vel]); gpu.setVariableDependencies(pos, [pos, vel]);
Object.assign(vel.material.uniforms, { uTime: stage.g.uTime, uDt: { value: 1/60 }, uMorph: { value: 0 },
  uCurlAmp: { value: 0.6 }, uSpring: { value: 9 }, uDamp: { value: 0.92 }, tTargets: { value: targets },
  uShapes: { value: 2 }, uShapeA: { value: 0 }, uShapeB: { value: 1 }, uBlend: { value: 0 },
  uPointer: { value: new THREE.Vector3(9,9,9) }, uPointerR: { value: 0.2 } });
pos.material.uniforms.uDt = { value: 1/60 };
const err = gpu.init(); if (err) throw new Error(err);
// per frame (fixed step accumulator, max 2 substeps):
gpu.compute(); points.material.uniforms.tPos.value = gpu.getCurrentRenderTarget(pos).texture;
```

```glsl
// velocity pass (full source: GPGPU_VEL in threejs-techniques.shaders.js)
vec3 goal = mix(target(uShapeA, uv), target(uShapeB, uv), uBlend);
float stagger = clamp(uMorph * 1.6 - p.w * 0.6, 0.0, 1.0);      // per-particle arrival delay
vec3 acc = (goal - p.xyz) * uSpring * stagger;
acc += curlNoise(p.xyz * 1.3 + uTime * 0.07) * uCurlAmp * (1.0 - 0.85 * stagger);
v.xyz = (v.xyz + acc * uDt) * uDamp;
```

**Precision note.**
- Half floats have a 10-bit mantissa. At |x| ≈ 2 the step is about 0.002, which makes slow particles jitter visibly.
- Keep positions inside [-1.5, 1.5] and scale them in the vertex shader.
- Use `FloatType` when `EXT_color_buffer_float` exists (desktop, iOS 15+) and `HalfFloatType` otherwise.
- Many mobile GPUs lack `OES_texture_float_linear`. GPGPU reads are `texelFetch`-exact, so `NearestFilter` is fine.

**Rendering.** Use `Points` with `gl_PointSize = uSize * uDpr * … / -mv.z`. **Multiply by DPR**, because point size is in device pixels. Discard outside the disc. Draw with `transparent: true, depthWrite: false` and normal blending. Avoid additive blending: on light paper it reads as glow. Ink should darken (`MultiplyBlending` needs `premultipliedAlpha: true`, r178). For large sprites, use instanced quads instead (`gl_PointSize` caps at 64–1024 px depending on the GPU).

**GPU cost.**
- 2 simulation passes over N² texels plus 1 draw call of N² points.
- Memory = 4 textures × N² × 16 B (Float) + targets. 512² = 16 MB + 4 MB per shape; 256² = 4 MB + 1 MB per shape.
- Fill is tiny for the simulation. Overdraw of points dominates when they converge into a glyph: 65k 3-px points ≈ 0.6 Mpx.

**Tiers.**

| Tier | N | Particles | Curl evals/step | Notes |
|---|---|---|---|---|
| high | 512 | 262 144 | 1 (6 noise taps × 3) | an optional 1024² "show-off" toggle, desktop only |
| medium | 256 | 65 536 | 1 | |
| low / mobile | 128 (192 on high-end phones) | 16–36 k | 1, sim at 30 Hz | |
| software | 64 | 4 096 | | measured 9 ms/frame |

**Reduced motion.** Show the formed shape. The curl amplitude goes to 0, and a shape change becomes a 300 ms opacity cross-fade between two static point sets.

---

## (c) Ink in water: stable fluids, and closed-form suminagashi on paper

### c1. Stable fluids (Stam 1999; Harris, GPU Gems ch. 38)

**How it works.**
- Velocity is a half-float RG field on a **reduced grid**.
- Each step: splat forces and dye → curl → vorticity confinement → divergence → **pressure Poisson solve by Jacobi iteration** (warm-started from 0.8 × last pressure, so fewer iterations converge) → subtract the pressure gradient (projection gives divergence-free flow) → semi-Lagrangian advection of velocity, then of dye.
- Dye runs at 2–4× the sim resolution with linear filtering.
- Passes per step = 9 + Jacobi iterations, plus extra splats for multi-touch.

```js
// all kernels: FLUID.* in threejs-techniques.shaders.js; one FullScreenQuad per kernel
function step() {
  splat(vel, pointer.delta * force); splat(dye, inkColor);
  pass('curl', curlRT, { uVel: vel.r });
  pass('vorticity', vel.w, { uVel: vel.r, uCurl: curlRT }); vel.swap();
  pass('divergence', divRT, { uVel: vel.r });
  pass('scale', prs.w, { uSrc: prs.r, uK: 0.8 }); prs.swap();          // warm start
  for (let k = 0; k < tier.jacobi; k++) { pass('jacobi', prs.w, { uP: prs.r, uDiv: divRT }); prs.swap(); }
  pass('gradient', vel.w, { uP: prs.r, uVel: vel.r }); vel.swap();
  pass('advect', vel.w, { uVel: vel.r, uSrc: vel.r, uDiss: 0.99 }); vel.swap();
  pass('advect', dye.w, { uVel: vel.r, uSrc: dye.r, uDiss: 0.998 }); dye.swap();
}
```

```glsl
// Jacobi iteration for ∇²p = ∇·u   (uTexel = 1/grid)
float L=texture2D(uP,vUv-vec2(uTexel.x,0)).x, R=texture2D(uP,vUv+vec2(uTexel.x,0)).x,
      B=texture2D(uP,vUv-vec2(0,uTexel.y)).x, T=texture2D(uP,vUv+vec2(0,uTexel.y)).x;
gl_FragColor = vec4(0.25*(L+R+B+T - texture2D(uDiv,vUv).x), 0, 0, 1);
```

Cost: each pass touches grid-sized texels, so the sim itself is almost free on GPUs (128×72 = 9.2k texels × 29 passes). The **display pass at screen resolution** is the real cost, along with dye advection at dye resolution. Run the sim with a fixed `dt = 1/60` accumulator. On low tiers, step at 30 Hz and interpolate the display. **Idle detection:** when the sum of |velocity| (read back from a 1×1 mip every 30 frames, or simply after N seconds with no input) drops below ε, stop stepping and render the cached dye only.

| Tier | Grid (short side) | Jacobi | Dye | Vorticity | SwiftShader (measured) |
|---|---|---|---|---|---|
| high | 256 | 30–40 | 1024 | yes | 153 ms (sim) |
| medium | 160 | 20–25 | 512 | yes | — |
| low | 96 | 12–16 | 384 | no | — |
| mobile | 128 | 16–20 | 512 | yes | — |
| software | 64 | 8–10 | 256 | no | 6.8 ms + display |

### c2. Suminagashi done right: closed-form marbling (recommended renderer)

Real suminagashi alternates drops of sumi ink and "clear" surfactant onto still water, giving concentric rings. A breath or fan then deforms them, and paper laid on the surface lifts the pattern. Grid fluids **blur** those razor-thin rings: the pattern dissipates. The exact alternative comes from Lu, Jaffer et al., "Mathematical Marbling" (IEEE CG&A 2012). The marbling operations have **closed-form, area-preserving homeomorphisms**, and the paper renders them by **inverse mapping**:
- **Ink drop** of radius r at C: `P' = C + (P−C)·sqrt(1 + r²/|P−C|²)`. Inverse, for |P'−C| > r: `P = C + (P'−C)·sqrt(1 − r²/|P'−C|²)`. Inside the drop you get the new ink.
- **Tine stroke** along a line through A with unit direction M and normal N: `P' = P + (αλ/(d+λ))·M`, where `d = |(P−A)·N|`. d does not change under the shift, so the inverse just subtracts. For a comb with spacing s: `d' = s/2 − |mod(d, s) − s/2|`.

**Engine (event-driven, not per frame).**
- The pattern lives in a ping-pong RT (1024–1536² RGBA8; rgb = ink, a = amount).
- **Each operation is one full-screen pass of the pattern texture**, executed when the visitor clicks (drop) or drags (tine stroke along the pointer segment).
- A drop's spreading animation re-renders from a snapshot with an animated `uR` for about 600 ms. That is one pass per frame, during the animation only.
- Then the view sleeps. Cost at rest: just the display pass.
- It stays sharp at any zoom, because `fwidth` anti-aliases the drop edge.
- It is incompressible by construction and **deterministic**: replaying the op list reproduces the artwork, which suits the offline video and a `?seed=` share link.

```glsl
// MARBLE_OP_FRAG (verified) — one pass per operation
vec2 p = vec2(vUv.x * uAspect, vUv.y);
if (uOp == 0) {                                        // drop
  vec2 d = p - uC; float l = length(d), aa = fwidth(l);
  float inside = 1.0 - smoothstep(uR - aa, uR + aa, l);
  vec2 q = uC + d * sqrt(max(1.0 - (uR*uR) / max(l*l, 1e-8), 0.0));
  gl_FragColor = mix(prevAt(q), uInk, inside);         // uInk.a = 0 => "clear" surfactant drop
} else {                                               // tine / comb
  vec2 N = vec2(-uM.y, uM.x); float d = abs(dot(p - uA, N));
  if (uSpacing > 0.0) d = 0.5*uSpacing - abs(mod(d, uSpacing) - 0.5*uSpacing);
  gl_FragColor = prevAt(p - (uAlpha * uLambda / (d + uLambda)) * uM);
}
```

**Hybrid with c1.** For the breath phase, run the low-res fluid (96–128 grid) and **advect the pattern texture** with its velocity, using MacCormack/BFECC advection (3 taps, much sharper than plain semi-Lagrangian) for at most about 2 s. Then freeze it. The "transfer to paper" finale reuses the emakimono bend shader (§e): the sheet peels off the water, and the display shader adds washi fibre density and nijimi (`MARBLE_SHOW_FRAG` plus the post pass).

**Cost.**
- Drop and tine ops: 1 pass over the pattern texture (1024² = 1 Mpx) per event.
- Display: 1 pass per screen pixel plus 4 fbm octaves for fibres. Bake the fibres into a 512² tiling texture on mobile.
- Memory: 2 × 1024² × 4 B = 8 MB (high: 1536², 18 MB).

**Tiers.**

| Tier | Pattern size | Drop-spread animation |
|---|---|---|
| high | 1536² | yes |
| medium / mobile | 1024² | yes |
| low | 768² | none |
| software | baked WebP of a pre-recorded op list, interactive drops still allowed (one pass each) | none |

**Reduced motion.** Drops appear at full size immediately, without spreading. No breath phase.

---

## (d) Instanced constructions: kumiko lattice assembly, BatchedMesh

**Technique.** A kumiko (組子) panel, e.g. *asanoha* (hemp leaf), built from equilateral-triangle units. Every strip is one instance of a thin box. `instanceMatrix` holds the **final** placement. Extra `InstancedBufferAttribute`s hold:
- `aFrom` (scatter offset),
- `aSpin` (axis + angle),
- `aDelay` (radial or "joinery order" stagger).

A **single uniform `uProgress`** (scroll-driven) assembles the whole panel in the vertex shader, so there is zero CPU work per frame. Inject the code into `MeshStandardMaterial` with `onBeforeCompile` to keep PBR, lights and the environment intact.

```js
patchAssembly(material, uProgress);   // threejs-techniques.shaders.js — verified
// injected (order matters: beginnormal_vertex runs BEFORE begin_vertex in meshphysical):
//   beginnormal: k = clamp((uProgress - aDelay)/0.35, 0, 1); e = easeOutBack(k); objectNormal = rotAxis(normal, axis, angle*(1-e))
//   begin:       transformed = rotAxis(position, axis, angle*(1-e))
//   project:     mv = instanceMatrix * vec4(transformed,1); mv.xyz += aFrom * (1-e); mv = modelViewMatrix * mv
material.customProgramCacheKey = () => 'assembly-v1';
```

Notes:
- `worldpos_vertex` still uses the un-offset position, so only shadows and transmission would be wrong. Patch it too if you enable them.
- Set `frustumCulled = false`, or compute a bounding sphere that covers both the scattered and the assembled states.
- Wood: a procedural ring texture (fbm along the strip axis), or a CC0 hinoki texture from ambientCG at 1K. Use `MeshStandardMaterial` with roughness 0.6–0.75 and a faint `sheen`, if you switch to Physical, for the planed-cypress lustre.
- Joinery detail: half-lap notches are real geometry, a few extra vertices on the strip, so close-ups hold up.

**BatchedMesh** (r166+: `addGeometry`, then `addInstance(geometryId)`, `setMatrixAt`, `setColorAt`, `setVisibleAt`). Use it when one draw needs **several different geometries**: frame rails, long strips, short spokes, the leaf petals of the asanoha, the outer *waku*. It uses `WEBGL_multi_draw` and supports per-instance visibility and sorting. Per-instance custom attributes are not first-class (matrices and colors live in textures). So the vertex-shader assembly above is simpler with InstancedMesh (one geometry per InstancedMesh, 2–4 InstancedMeshes total). Use BatchedMesh for CPU-driven states, like pieces that are clicked and individually lifted.

**GPU cost.** 1 draw per InstancedMesh. Vertex work = instances × verts per strip (box = 24 verts). Fill is small: thin strips. Memory: 64 B matrix + 32 B extras per instance.

**Software caveat (measured).** SwiftShader costs about 50 µs per instance, whether you use InstancedMesh, BatchedMesh or a `gl_InstanceID` fetch. Merged static geometry is 4× faster. So in the software tier and in the **capture build**, bake the final layout into one merged `BufferGeometry` with per-vertex `aFrom/aSpin/aDelay` (same shader, `USE_INSTANCING` off).

**Tiers.**

| Tier | Instances |
|---|---|
| high | 12 000 |
| medium | 5 000 |
| low / mobile | 2 000 |
| software | ≤ 800, merged |

**Reduced motion.** Show the panel assembled (`uProgress = 1`). On click, a single unit lifts and settles back.

---

## (e) Vertex-shader deformations: emakimono scroll, byobu screen, gold leaf

### e1. Emakimono (handscroll) that rolls and unrolls

Japanese handscrolls are read **right to left**. The viewer unrolls the left roller and rolls the already-read part onto the right one. The career timeline maps naturally onto this, with scroll progress moving the visible window `[uLeft, uRight]` across the paper. Geometry: `PlaneGeometry(L, h, 900, 1)`. Lots of X segments are cheap: 1.8k verts. Past each roll line, the paper wraps around a cylinder whose radius shrinks per turn (an Archimedean spiral), so the roll looks thick.

```glsl
// SCROLL_VERT (verified): s = arc length past the roll line, side = ±1
vec3 wrap(float s, float side, out vec3 n){
  float theta = s / uRadius;
  float r = max(uRadius - uThick * theta / 6.2831853, 0.002);
  n = vec3(-side * sin(theta), 0.0, cos(theta));
  return vec3(side * r * sin(theta), 0.0, uRadius - r * cos(theta));
}
// p.x > uRight -> wrap(p.x - uRight, +1); p.x < uLeft -> wrap(uLeft - p.x, -1); flat window gets a contact shadow near the rollers
```

- Front faces show the painting, back faces plain washi (`gl_FrontFacing`).
- Wooden roller caps (*jiku*) are two `CylinderGeometry` meshes placed at `uLeft/uRight`.
- Content: real artwork as a texture. Public-domain handscroll scans are available from the Met and the Art Institute of Chicago APIs (check `isPublicDomain`). Render timeline text into a `CanvasTexture` at 2× and refresh it on language switch (JA/EN/ZH). `HTMLTexture` is the experimental path.
- Cost: 1 draw call, trivial vertex work, 1 texture (2048×256 to 4096×512).
- Tiers: segments 900 / 600 / 300; texture 4096 / 2048 / 2048 / 1024.
- Reduced motion: no inertia. Keep the window tied to scroll, which is user-driven, or show a flat horizontal strip.

### e2. Byobu (six-panel folding screen), zig-zag fold

The plane has 6 panels. Each vertex finds its panel index i and fraction f. Alternating panels tilt ±φ, which is the real *rokkyoku byōbu* zig-zag. Hinge vertices are shared and their positions agree. The shader uses **flat normals from `dFdx/dFdy`**, so no duplicated vertices are needed.

```glsl
// BYOBU_VERT (verified)
float u = uv.x * uPanels, i = min(floor(u), uPanels - 1.0), f = u - i;
float x = (u * uPanelW) * cos(uFold) - 0.5 * uPanels * uPanelW * cos(uFold);
float z = (mod(i, 2.0) < 0.5 ? f : 1.0 - f) * uPanelW * sin(uFold);
```

Animate `uFold` from 1.45 (closed stack) to about 0.45 as the chapter enters. It is a natural transition device.

### e3. Gold leaf (kinpaku): anisotropic and view-dependent, cheap

What makes gold leaf look real, and what most shaders miss:
1. Leaf is laid as **overlapping squares** in staggered rows. The overlaps form visible seams (*haku-ashi* 箔足).
2. Each square was hammered separately, so it has its own slight tilt and its own **anisotropy direction**.
3. Crinkles add high-frequency normal noise.
4. Worn patches show the red or ochre ground underneath.
5. Paintings sit on top as matte mineral pigment.

```glsl
// GOLD_FRAG (verified) — key lines
vec2 g = vUv * vec2(uAspect,1.0) * uLeafPerUnit; g.x += 0.5 * step(1.0, mod(floor(g.y), 2.0));
vec2 cell = floor(g), f = fract(g); float rnd = hash21(cell);
float hakuAshi = smoothstep(0.0, 0.02, min(min(f.x,1.0-f.x), min(f.y,1.0-f.y)));
vec3 n = normalize(nGeo + tiltPerLeaf + crinkle);
vec3 F = F0 + (1.0 - F0) * pow(1.0 - NoV, 5.0);              // F0 gold = (1.0, 0.766, 0.336) linear
float ward = exp(-(th*th + bh*bh) / (NoH*NoH)) / (4π ax ay sqrt(NoL NoV));   // Ward anisotropic, t rotated per leaf
vec3 gold = F * envStudio(reflectWorld) * (0.88 + 0.24*rnd) + F * uLightCol * ward * NoL;
col = mix(gold, redGround, wear) * mix(0.72, 1.0, hakuAshi);
col = mix(col, art.rgb * (0.35 + 0.65*NoL) + 0.05, art.a);   // matte pigment on top
```

- **Cheap environment:** `envStudio(r)` is a procedural room (warm floor, bright ceiling, two softboxes), about 10 ALU ops, with no texture and no PMREM.
- **Alternative:** `MeshPhysicalMaterial({ metalness: 1, roughness: 0.25, anisotropy: 0.6, anisotropyRotation })` plus a procedurally generated normal/roughness `CanvasTexture`, with `scene.environment = pmrem.fromScene(new RoomEnvironment()).texture`. That is a one-time PMREM (~20 ms, ~6 MB) and fully physically based. Use it when you also need lights and shadows consistent with other PBR objects.
- **Sheen while scrolling:** feed `uLightPos` from the pointer and scroll, so the leaf flashes as the visitor moves, the way gold screens do in candlelight.
- **Art:** Ogata Kōrin, *Irises at Yatsuhashi* (Met 53.7.1–2, Open Access), Tawaraya Sōtatsu's *Waves at Matsushima* (Freer|Sackler, Smithsonian Open Access CC0), or Hasegawa Tōhaku's pines (Tokyo National Museum; check the license). Alpha-mask the pigment layer so the gold shows between motifs.
- Cost: 1 draw call, fragment ≈ 60–90 ALU + 1 texture fetch, full-coverage only inside the screen's rect.
- Tiers:

| Tier | Ward | Crinkle | Wear |
|---|---|---|---|
| high | yes | 1 noise | fbm4 |
| medium | yes | — | fbm2 |
| low / mobile | Blinn-Phong instead | — | baked into a 512² mask texture |
| software | baked lit texture plus a moving specular band | | |

- Reduced motion: the panel is shown open, and the light follows the pointer only (no autonomous flicker).

---

## (f) Raked sand (karesansui) and raymarched SDFs

### f1. Height-field sand with cursor raking

- **Height** is a pure function of position. Straight raked rows run across the plane, with a slight hand-wobble. *Samon* rings are concentric `cos(2π·sdf/spacing)` around each stone's circle SDF, blended in a band 4–5.5 spacings wide.
- **The visitor's strokes** overwrite the height through a **trail RT** (512², RGBA8). Each pointer segment is drawn as a quad strip whose `aLateral` attribute goes 0→1 across the rake width. The sand shader then turns `cos(2π·(lateral−0.5)·tines)` into parallel grooves that follow the stroke. Coverage (alpha) blends it in.
- Strokes persist; it's a garden. A "reset" button sweeps the RT clean with an animated rake pass.
- Shading:
  - normals by central differences (3 height evaluations),
  - a low sun (20–25° elevation) so the grooves read,
  - cavity darkening by height,
  - per-grain hash variation, sparse quartz glints, `step(0.995, grain) * diff⁸`,
  - analytic **stone shadows**: the closest approach of the sun ray to each stone circle. No shadow map.

```glsl
// SAND_FRAG (verified) — heightAt()
float h = groove(p.y + 0.15 * uSpacing * sin(p.x * 0.7));                 // rows
for (int i = 0; i < 3; i++) { float ds = length(p - uStones[i].xy) - uStones[i].z;
  h = mix(h, groove(max(ds, 0.0)), 1.0 - smoothstep(uSpacing*4.0, uSpacing*5.5, ds)); }   // samon
vec4 tr = texture2D(tTrail, uv);
h = mix(h, 0.5 + 0.5 * cos(TAU * (tr.r - 0.5) * uTines), tr.a);           // visitor strokes
```

- **Cost:** 1 draw call on a single quad. The fragment does 3 height evaluations × (3 stones + 1 texture fetch) plus the shadow loop, about 120 ALU. One small RT draw per pointer move.
- **Silhouette option (high tier):** displace a 256² grid in the vertex shader with the same `heightAt()` (move it into a shared GLSL chunk) for grazing-angle close-ups.
- **Tiers:**

| Tier | Height function | Normals | Shadows | Displacement | Trail RT |
|---|---|---|---|---|---|
| high | full | analytic | yes | 256² grid | 1024² |
| medium | full | finite differences | yes | none | 512² |
| low / mobile | full | `dFdx/dFdy` normals (1 evaluation instead of 3) | none | none | 256² |
| software | baked base pattern as a WebP | — | — | — | strokes drawn into a 2D canvas, used as a normal map |

- **Reduced motion:** strokes still work (user-initiated). No ambient sand drift, no glint twinkle.

### f2. Raymarched SDF: when, and how to keep it cheap

Use an SDF raymarch only where meshes cannot do the job: merging ink drops (smooth union), an infinite repeated domain, or a morphing 3D crest. Measured on SwiftShader, a 64-step march costs 35 ms full-screen at 720p, and on a mobile GPU at DPR 2 a full-screen march is also expensive. Rules:
1. **Proxy volume.** Raymarch inside a `BoxGeometry` fragment shader, starting the ray at the box surface (`SDF_BOX_*`, verified). Only covered pixels pay, and the march length is bounded.
2. **Step cap per tier:** 96 / 64 / 40 / 24. Early-out at `d < 0.001`, bail at `t > boxDiagonal`.
3. **Reduced resolution:** render the SDF view into a 0.5× RT and upsample. With the ink look, the softness reads as intentional.
4. **Write depth** (`gl_FragDepth`) only if meshes must intersect it, since writing depth disables early-Z.
5. **Animate cheaply:** move SDF primitives with uniforms. Never rebuild anything on the CPU.

Reduced motion: freeze the time uniform and show one composed pose.

---

## (g) Cheap cloth (noren) and instanced petals

### g1. Noren curtain: Verlet on the CPU

A noren (暖簾) hangs in 2–5 panels with slits. Walking through it is a great **section transition**: the camera dollies forward and the panels part around a moving sphere collider. Position-based Verlet (Jakobsen, "Advanced Character Physics", 2001) on the CPU is ideal:
- 3 panels × 10×18 particles = 540 points,
- structural + bend constraints (skip-one) ≈ 1 400,
- 4 iterations → **< 0.15 ms of JS per frame**.

```js
step(dt) {                                          // fixed 1/60 accumulator
  const P = this.pos, O = this.prev, dt2 = dt * dt, damp = 0.985, t = (this.t += dt);
  for (let i = 0; i < this.n; i++) {
    if (this.pinned[i]) continue;                   // top row sewn to the rod
    const i3 = i * 3;
    const ax = this.windX(i, t) /* value noise per row + gusts */, ay = -1.5 /* soft gravity */, az = this.windZ(i, t);
    let x = P[i3];   P[i3]   = x + (x - O[i3])   * damp + ax * dt2; O[i3]   = x;
    x = P[i3+1];     P[i3+1] = x + (x - O[i3+1]) * damp + ay * dt2; O[i3+1] = x;
    x = P[i3+2];     P[i3+2] = x + (x - O[i3+2]) * damp + az * dt2; O[i3+2] = x;
    this.collideSphere(i3, this.pointerSphere);     // pointer / camera pushes the cloth
  }
  for (let it = 0; it < this.iters; it++) for (const [a, b, rest] of this.constraints) {
    const a3 = a*3, b3 = b*3, dx = P[b3]-P[a3], dy = P[b3+1]-P[a3+1], dz = P[b3+2]-P[a3+2];
    const d = Math.hypot(dx, dy, dz) || 1e-6, k = (d - rest) / d * 0.5;
    const wa = this.pinned[a] ? 0 : 1, wb = this.pinned[b] ? 0 : 1, s = k * 2 / (wa + wb || 1);
    P[a3] += dx*s*wa; P[a3+1] += dy*s*wa; P[a3+2] += dz*s*wa; P[b3] -= dx*s*wb; P[b3+1] -= dy*s*wb; P[b3+2] -= dz*s*wb;
  }
  this.geometry.attributes.position.needsUpdate = true;   // setUsage(DynamicDrawUsage) at creation
  this.geometry.computeVertexNormals();                    // 540 verts: ~0.05 ms
}
```

- Material: indigo-dyed cotton. `MeshStandardMaterial` (or Physical with `sheen: 0.4`) with a weave normal map, and the crest or the engineer's mon printed with `alphaMap`/`map`, in **resist-dye white** rather than a pure white fill.
- **When to use a GPU cloth:** only above about 10k particles, such as a whole street of noren. GPU PBD needs a gather-style constraint pass, 8–16 iterations → 10–20 passes per step. Not worth it here.
- Tiers:

| Tier | Grid per panel | Iterations | Fold-preserving bend constraints |
|---|---|---|---|
| high | 14×24 | 6 | yes |
| medium | 10×18 | 4 | yes |
| low / mobile | 8×14 | 3 | — |
| software | 6×10 | 2, or a baked flutter loop as vertex animation | — |

- Reduced motion: hang statically in a pre-solved pose. Parting on transition becomes a cross-fade.

### g2. Instanced petals and leaves, all in the vertex shader

`InstancedBufferGeometry` of a 4-segment petal shape, with one `aSeed` vec4 per instance (spawn xyz, random). The vertex shader computes:
- a fall that wraps (`fract(seed.y − t·speed/boxH)`),
- wind drift,
- tumbling around a per-instance axis,
- flutter bend.

Zero CPU per frame, 1 draw call. The palette changes per chapter: sakura in spring, momiji in autumn, ginkgo for the "present day" chapter.

```glsl
// PETAL_VERT (verified)
float fall = fract(aSeed.y - uTime * speed / uBox.y);
vec3 c = (vec3(aSeed.x, fall, aSeed.z) - 0.5) * uBox;
c.xz += uWind * (1.0 - fall) * uBox.y * 0.6 + vec2(sin(ph*0.7), cos(ph*0.5)) * 0.25;
p.z += 0.08 * sin(ph * 3.0 + position.x * 6.0);          // flutter
p = rotAxis(p, axis, ph);                                // tumble
```

- Interaction: sample the fluid velocity texture (c1) or the pointer position to push petals aside. That is one texture fetch in the vertex shader.
- Tiers: 2 000 / 900 / 400 / 150 (software: ≤ 150, merged into a single geometry).
- Reduced motion: **off**. Show a few petals resting on the page instead.

---

## (h) Post-processing: one combined pass, not a composer chain

**Cost model.** Each `EffectComposer` pass writes one full-screen RT and reads it back. At 1440p, DPR 2 (5120×2880 = 14.7 Mpx), one half-float pass moves about 118 MB of read + write, which is about 7 GB/s at 60 fps. Mobile GPUs have 25–50 GB/s **in total**. Four passes is a real budget item. One fused pass with 5 texture fetches per pixel costs a fraction of that.

**The pass** (`POST_FRAG`, verified; see the contact sheet):
1. **Nijimi (ink bleed)**, not chromatic aberration. Take the `min()` of 4 taps offset along a per-3-px "fibre" hash. Dark ink creeps 1–2 px into the paper with fibrous irregularity. A tiny optional warm fringe (`uChroma ≤ 0.15`) is allowed. RGB-split chromatic aberration was tried and **rejected**: it reads as a generic "glitch" cliché.
2. **Paper tooth.** Multiplicative hash grain. Static by default; with motion allowed, re-seeded at 12 fps (film-like), never per frame.
3. **Vignette.** 8% at most, warm, aspect-correct.
4. **Dusk grade** (`uNight`). Multiply by a cool tint plus a small lift. The night theme stays light: moonlit paper, not black. Animate the theme switch over 600 ms by tweening the uniform.
5. **Tone mapping + sRGB** (`#include <tonemapping_fragment>`, `<colorspace_fragment>`), because views were rendered into a linear RT.
6. **Dither** (±0.5/255) against 8-bit banding in RGBA8 targets.

**When there is no post pass** (low, mobile and software tiers), views render directly to the canvas. Paper grain becomes a **static CSS layer** (a 256² tiling WebP noise, `mix-blend-mode: multiply`, `opacity: .06`) over the whole page, so DOM and WebGL share the same tooth anyway.

**Scene RT format.**
- `HalfFloatType` (8 B/px) on high, for HDR highlights on gold.
- `UnsignedByteType` + dither on medium. The palette is light, and 8-bit linear only bands in darks.
- Size = canvas × min(DPR, 1.5). Rendering post at 1.5 while the canvas is at 2 is invisible on paper textures and saves 44% fill.

---

## (i) Adaptive quality

**Static tier at boot** (before any view is initialized):

```js
export function detectTier() {
  const forced = new URLSearchParams(location.search).get('tier'); if (forced) return TIERS[forced];
  const c = document.createElement('canvas');
  let gl = c.getContext('webgl2', { failIfMajorPerformanceCaveat: true }), caveat = false;
  if (!gl) { gl = c.getContext('webgl2'); caveat = !!gl; }          // works, but only in software
  if (!gl) return TIERS.none;                                        // posters + DOM video only
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');          // deprecated in Firefox -> RENDERER is pre-sanitized there
  const r = String(gl.getParameter(dbg ? dbg.UNMASKED_RENDERER_WEBGL : gl.RENDERER)).toLowerCase();
  const caps = { floatRT: !!gl.getExtension('EXT_color_buffer_float'), floatLinear: !!gl.getExtension('OES_texture_float_linear'),
                 parallel: !!gl.getExtension('KHR_parallel_shader_compile'), maxTex: gl.getParameter(gl.MAX_TEXTURE_SIZE) };
  gl.getExtension('WEBGL_lose_context')?.loseContext();             // free the probe context now
  if (caveat || /swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic/.test(r)) return { ...TIERS.software, r, ...caps };
  const mobile = matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 900;
  const mem = navigator.deviceMemory ?? 8, cores = navigator.hardwareConcurrency ?? 8;   // deviceMemory: Chromium only, capped at 8
  let s = 2;                                                           // medium by default
  if (/apple m\d|rtx|radeon rx|radeon pro|geforce gtx 1[6-9]|geforce rtx|arc a\d/.test(r)) s = 3;
  if (/intel.*(hd|uhd) graphics|mali-[gt]\d{2}\b|adreno.*\b[3-5]\d\d\b|powervr/.test(r)) s = 1;
  if (r === 'apple gpu') s = mobile ? 2 : 3;                          // Safari masks every Apple GPU as "Apple GPU"
  if (mem <= 4 || cores <= 4) s = Math.min(s, 2); if (mem <= 2) s = 1;
  if (mobile) s = Math.min(s, 2);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || navigator.connection?.saveData) s = Math.min(s, 1);
  return { ...[TIERS.low, TIERS.low, TIERS.medium, TIERS.high][s], mobile, r, ...caps };
}
export const TIERS = {
  high:     { name: 'high',   maxDpr: 2,    msaa: false, particlesSide: 512, fluidGrid: 256, jacobi: 32, kumiko: 12000, petals: 2000, post: 'half', vramBudget: 300e6 },
  medium:   { name: 'medium', maxDpr: 1.5,  msaa: true,  particlesSide: 256, fluidGrid: 160, jacobi: 22, kumiko: 5000,  petals: 900,  post: 'rgba8', vramBudget: 180e6 },
  low:      { name: 'low',    maxDpr: 1.25, msaa: true,  particlesSide: 128, fluidGrid: 96,  jacobi: 14, kumiko: 2000,  petals: 400,  post: 'none', vramBudget: 120e6 },
  software: { name: 'software', maxDpr: 0.75, msaa: false, particlesSide: 64, fluidGrid: 64, jacobi: 8, kumiko: 800,   petals: 150,  post: 'none', vramBudget: 60e6, posterOnlyExceptFirst: true },
  none:     { name: 'none' },
};
```

**Dynamic governor** (adjusts DPR first, tier second, with hysteresis):

```js
export class Governor {
  constructor(stage) { Object.assign(this, { stage, buf: new Float32Array(90), i: 0, last: 0, changed: 0, budget: 1000 / 60, calib: [] }); }
  tick(now) {
    const dt = now - this.last; this.last = now; if (dt > 250) return;          // tab switch / stall
    if (this.calib.length < 60) { this.calib.push(dt); if (this.calib.length === 60) {   // learn refresh rate (60/90/120/144)
      const m = this.calib.slice().sort((a, b) => a - b)[30]; this.budget = Math.max(m, 1000 / 144); } return; }
    this.buf[this.i++ % this.buf.length] = dt;
    if (now - this.changed < 2000 || this.i < this.buf.length) return;
    const avg = this.buf.reduce((a, b) => a + b) / this.buf.length;
    const slow = this.buf.filter(x => x > this.budget * 1.5).length / this.buf.length;   // share of missed frames
    const s = this.stage;
    if (slow > 0.2 || avg > this.budget * 1.25) {                                      // degrade fast
      if (s.dpr > (s.tier.minDpr ?? 0.75)) s.setDpr(Math.max(s.tier.minDpr ?? 0.75, s.dpr - 0.25)); else s.degradeTier();
      this.changed = now; this.i = 0;
    } else if (slow < 0.02 && avg < this.budget * 1.05 && now - this.changed > 8000 && s.dpr < Math.min(devicePixelRatio, s.tier.maxDpr)) {
      s.setDpr(s.dpr + 0.25); this.changed = now; this.i = 0;                           // recover slowly
    }
  }
}
```

- `rAF` delta is vsync-quantized, so it tells you that frames are being missed but not how much headroom is left. For GPU time, use `EXT_disjoint_timer_query_webgl2` where it is exposed (desktop Chrome), and fall back to the frame-miss ratio above.
- `setDpr` = `renderer.setPixelRatio(d)`, then `setSize(innerWidth, innerHeight, false)`, then resize the post RT. That reallocates the drawing buffer, which is why it has to be rare and hysteretic.
- Tier degradation swaps per-view parameters (particles, Jacobi iterations, petals) **without recompiling**. Make counts uniforms or draw ranges (`geometry.setDrawRange`, `instanceCount`), never `#define`s.

**Avoiding shader-compile jank.**
- Compile while off-screen: the `compileAsync` call in `#warm`. One view at a time, during `requestIdleCallback` when possible.
- Programs outside the scene graph (GPUComputationRenderer, FullScreenQuads) are only linked when first used. Call `prewarm()`, which runs one sim step, before the view becomes visible.
- **Keep program keys stable.** Every scene should have the same light count and types, and the same fog and tone-mapping settings. Don't toggle `defines` at runtime. Use `customProgramCacheKey` for `onBeforeCompile` materials. Verify in the HUD that `renderer.info.programs.length` stops growing after warm-up.
- Without `KHR_parallel_shader_compile` (SwiftShader, some Android), `compileAsync` still compiles synchronously inside `compile()`. Do it behind the intro, ink loader or poster.
- Production: `renderer.debug.checkShaderErrors = false`, which avoids sync `getProgramParameter`/`getShaderInfoLog` round-trips.

**Textures.**
- **Default:** WebP or AVIF, decoded off the main thread with `ImageBitmapLoader` (`setOptions({ imageOrientation: 'flipY', premultiplyAlpha: 'none' })`, then `texture.flipY = false`). For data textures add `colorSpaceConversion: 'none'`.
- **KTX2/Basis** (`KTX2Loader` + `basis_transcoder.{js,wasm}` ≈ 0.5 MB once) keeps textures compressed in VRAM. A 2048² RGBA8 with mips is 22 MB; as ETC1S about 3 MB, as UASTC about 6 MB. It also avoids decode jank. **Use it only for the 2–4 largest textures** (byobu art, emakimono strip, washi normal map) when the mobile VRAM budget is tight. Below about 10 textures of 2K or less, WebP + ImageBitmap is simpler and smaller to ship.
- Cap the texture size by tier: 4096 / 2048 / 2048 / 1024. Never exceed `MAX_TEXTURE_SIZE` (8192 on SwiftShader).
- Never use `antialias: true` at DPR ≥ 1.5. At 4K-equivalent, a 4× MSAA drawing buffer is about 265 MB.

---

## (j) Offline rendering in headless Chromium to produce the scroll-scrub video

**Deterministic scene contract** (a separate `capture.html` entry that imports the same view modules):
- No `Timer`. The frame index drives everything: `t = i / fps`, and simulations step exactly `substeps` times per frame with a fixed `dt`.
- Seeded PRNG (mulberry32) for every `Math.random`. In shaders, hashes only, no `sin(time·big)` variance between GPUs.
- Wait for `document.fonts.ready`, every texture's `onLoad` (`LoadingManager`), `await renderer.compileAsync(...)`, and one throw-away frame.
- Render, then read back in the same task. `toDataURL` right after `render()` reads a valid drawing buffer, and `preserveDrawingBuffer: true` makes it robust. Use it **only** in the capture build, because it costs performance on tiled GPUs.
- In the capture build, the kumiko uses merged geometry (§d software caveat).

```js
// capture.mjs — Node 24 + Playwright 1.64 + ffmpeg-static (measured on SwiftShader: 9.6 fps @1280x720 batched)
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import FFMPEG from 'ffmpeg-static';                 // full build: libx264 / libvpx-vp9 / libaom-av1
const FPS = 30, N = 900, W = 1280, H = 720, BATCH = 8;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
await page.goto('http://localhost:4173/capture.html?seed=8&w=1280&h=720');       // ES modules need http://, not file://
await page.waitForFunction('window.capture?.ready === true', null, { timeout: 120_000 });
const ff = spawn(FFMPEG, ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
  // master: visually lossless, short GOP for scrubbing
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-g', '8', '-keyint_min', '8', '-sc_threshold', '0', '-bf', '0',
  '-pix_fmt', 'yuv420p', '-movflags', '+faststart', 'out/scrub_h264.mp4'], { stdio: ['pipe', 'inherit', 'inherit'] });
for (let i = 0; i < N; i += BATCH) {
  const frames = await page.evaluate(([i, n]) => window.capture.frames(i, n, 'image/png'), [i, Math.min(BATCH, N - i)]);
  for (const url of frames) {
    const buf = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));   // respect backpressure
  }
}
ff.stdin.end(); await new Promise(r => ff.on('close', r)); await browser.close();
// page side: window.capture.frames = (start, n, mime) => { const out = []; for (let k = 0; k < n; k++) { renderFrame(start + k); out.push(canvas.toDataURL(mime)); } return out; };
```

**Throughput, measured** (SwiftShader, 4 cores, 1280×720, PBR TorusKnot + 2 lights):

| Step | Time |
|---|---|
| render | 66 ms |
| + PNG `toDataURL` | 96–106 ms |
| end-to-end (CDP transfer, decode, x264 veryfast), 1 frame per `evaluate` | **7.0–7.4 fps** |
| end-to-end, **8 frames per `evaluate`** | **9.6 fps** |
| JPEG q0.92 | 7.0 fps (38 KB/frame, lossy intermediate) |
| WebP q0.95 | 5.2 fps (slower encode) |
| raw RGBA `readPixels` → base64 → `-f rawvideo` | 3.0 fps (3.6 MB/frame over CDP) |

Rule of thumb: **total ≈ frames × (render_ms + ~35 ms)**. A 30 s clip at 30 fps (900 frames) takes about 1.5–2 min for simple scenes. With 65k GPGPU particles (127 ms/frame) it takes about 4 min. Memory stays flat: one page, frames streamed, nothing buffered.

**Robustness.**
- Run one browser at a time on this machine (3.5 GB free).
- Store PNG frames to disk only if you want to re-encode without re-rendering (900 × ~190 KB ≈ 170 MB).
- Check for duplicate or black frames by hashing every 30th buffer.
- Retry a batch on `Target closed`. Restart the browser every 2 000 frames to cap leak growth.

**Anti-aliasing for the video.** Either render at 1920×1080 and use `-vf scale=1280:720:flags=lanczos` (2.25× render time), or render with `antialias: true` at 1280×720 (MSAA works on SwiftShader). Supersampling looks better on thin kumiko strips.

**Encoding for scrubbing** (`video.currentTime` seeks decode forward from the previous keyframe):
- **GOP 6–12 frames, no B-frames** (`-g 8 -bf 0 -sc_threshold 0`) is the sweet spot. All-intra (`-g 1`) seeks instantly but is 3–5× larger.
- Ship two sources: AV1 (`libaom-av1 -cpu-used 4 -crf 34 -g 8`) or VP9, plus H.264 as the fallback. Add 720p and 1080p variants chosen by tier.
- Playback side:
  - fetch the whole file as a Blob, then `URL.createObjectURL`, so seeks never wait on range requests,
  - only set `currentTime` after the previous `seeked` event, lerping the target toward scroll,
  - use `requestVideoFrameCallback` (three's `VideoTexture` already does) if the video is composited in WebGL. Otherwise **show it as a plain DOM `<video>`**: hardware decode, compositor-only, zero WebGL cost,
  - pause decoding entirely (`video.src` kept, no seeks) when the 7-section zone is off-screen.

---

## Budget table per effect (high tier, 1920×1080, DPR 1.5 → 2880×1620 canvas)

| Effect | Draw calls | Full-res passes | Sim passes | VRAM | Notes |
|---|---|---|---|---|---|
| Stage + post | 1 | 1 (5 fetches) | – | ~19 MB (RGBA8) / 37 MB (half) post RT + drawing buffer | post at min(DPR,1.5) |
| GPGPU 512² | 1 | 0 | 2 | 16 MB state + 4 MB/shape | point overdraw when converged |
| Fluid 256 grid | 1 | 1 display | 41 (32 Jacobi) | ~2 MB sim + 9 MB dye | sleeps when idle |
| Marbling 1536² | 1 | 1 display | 1 per event | 18 MB | event-driven |
| Kumiko 12k | 1–4 | 0 | – | 1.2 MB instances | |
| Emakimono | 2–3 | 0 | – | 8–32 MB texture | |
| Byobu gold | 1 | ≤ 1 (its rect) | – | 4–12 MB art | ~80 ALU/px |
| Sand | 1 + 1 per stroke | ≤ 1 (its rect) | – | 1–4 MB trail | |
| Noren | 1–3 | 0 | CPU 0.15 ms | < 1 MB | |
| Petals 2k | 1 | 0 | – | 32 KB | |
| SDF accent | 1 | proxy box only | – | 0 | 0.5× RT optional |

Never more than about 3 of these are live at once (§a). A realistic high-tier peak is **8–20 draw calls, 1.5–2 full-screen-equivalents of fill and 120–200 MB VRAM**. Medium and mobile: about half of that.

---

## "Engineers would cheer": details worth building

1. **The Info panel, Illustrator-style** (toggle `I`, or the ⓘ in the toolbar). It shows live `renderer.info` (calls, triangles, programs, textures, geometries summed across views), frame ms with a budget line, the current DPR and tier, the governor's last decision, and the GPU string. It fits the Illustrator-like art direction.
2. **Outline mode = Ctrl+Y.** Illustrator's own shortcut. It swaps every view to wireframe or anchor-point rendering (`scene.overrideMaterial`, plus a `Points` pass over vertices). Designers and engineers both recognise it.
3. **"Peek the shader."** Click a view's corner anchor to open its live GLSL (`material.fragmentShader`) with highlighting. Edit it, then `needsUpdate = true`. Compile errors appear inline via `renderer.debug.onShaderError`.
4. **Tweak panel with live cost.** Sliders for curl frequency, Jacobi iterations, particle count (draw range) and leaf size, each showing its measured ms delta. It shows the visitor the cost of each knob, not just the effect.
5. **Show the data, not just the pixels.** A small inset displays the GPGPU position texture, or the fluid pressure field (colour-mapped) next to the ink, plus a residual graph of the Jacobi solver.
6. **Deterministic share links.** `?seed=…&ops=…` reproduces a visitor's marbling or sand raking exactly. The closed-form engine makes this possible.
7. **"This video was rendered by this page."** An A/B toggle in the scroll-video section switches between the encoded video and the live engine at the same frame index. The capture script is linked as source.
8. **Console API.** `window.__stage` exposes views, tiers, `forceTier('low')` and `loseContext()` for testing restore. Plus a one-line kanji ASCII greeting.

---

## Pitfalls

- **P1 (r186 → r187 viewport semantics).** With an RT bound, r186's `setViewport/setScissor` multiply by pixelRatio, and r187 stops doing that. Set `rt.viewport/scissor` in RT pixels and re-bind (as in `Stage.#frame`, and verified in the harness).
- **P2 (built-in output pipeline).** `outputBufferType: HalfFloatType` + `setEffects()` routes every screen `render()` through `WebGLOutput.begin/end`, which means one full-screen composite per view. Keep `UnsignedByteType` and use your own post pass.
- **P3 (uniform identity).** Never replace `material.uniforms.x = { value }` after the first render. three caches the uniform list per program, so the new object is silently ignored. Mutate `.value`. This bit us during verification.
- **P4 (ShaderMaterial is linear).** Without `#include <colorspace_fragment>`, everything looks too dark and saturated. Colour textures need `SRGBColorSpace`; sim, height, normal and LUT textures must stay `NoColorSpace`.
- **P5 (half-float precision and float-linear).** Watch the position jitter from half floats (§b). iOS and many Android devices lack `OES_texture_float_linear`: use `HalfFloatType` for linearly-filtered sims (dye) and `NearestFilter` for float data.
- **P6 (InstancedMesh culling).** A vertex shader that moves instances outside the computed bounding sphere makes them pop out. Use `frustumCulled = false` or a padded `boundingSphere`.
- **P7 (point size).** `gl_PointSize` is in device pixels. Multiply by DPR, and clamp to `ALIASED_POINT_SIZE_RANGE`.
- **P8 (fixed canvas + native scroll).** The canvas trails the DOM by one frame. Use Lenis in the same loop, or the translateY trick. Cache rects instead of calling `getBoundingClientRect` per frame.
- **P9 (program explosion).** Different light setups per scene, runtime `defines`, or a missing `customProgramCacheKey` on `onBeforeCompile` materials all multiply programs and cause stalls of 50–300 ms each (ANGLE/D3D11).
- **P10 (memory).** Dispose geometry, materials, textures, RTs and `GPUComputationRenderer`. `ImageBitmap.close()` saves RAM but breaks context restore unless you can reload. Budget VRAM: mobile Safari kills tabs at around 1–1.5 GB total.
- **P11 (MSAA at high DPR).** A 4× MSAA drawing buffer at 4K is about 265 MB. Use MSAA only at DPR < 1.5.
- **P12 (`preserveDrawingBuffer`).** Only in capture builds. It forces a copy per frame on tiled mobile GPUs.
- **P13 (Clock).** Deprecated (r183). `Timer` needs an explicit `update(timestamp)` and `connect(document)`.
- **P14 (shadows).** `PCFSoftShadowMap` was removed. Avoid real-time shadows entirely: analytic shadows (sand), baked contact shadows (byobu, kumiko), roll shading (scroll).
- **P15 (premultiplied alpha canvas).** With `alpha: true`, fragment output must be premultiplied wherever it blends with the DOM. Otherwise you get dark fringes. Opaque views (paper drawn in GL) avoid the issue.
- **P16 (headless ≠ real).** SwiftShader is ~50 µs per instance and slow at full-screen fill. Don't tune the visual design to it. Use it for **correctness** (compile, determinism, screenshots) and for the capture pipeline only.
- **P17 (clichés).** RGB-split chromatic aberration, additive glow on paper, and bloom on gold all read as AI-generic. Ink darkens, gold reflects, paper absorbs.

---

## Sources

- three.js r186 source (`node_modules/three@0.186.1`: `WebGLRenderer.js`, `webgl/WebGLOutput.js`, `core/Timer.js`, `core/Clock.js`, `misc/GPUComputationRenderer.js`, `textures/HTMLTexture.js`, shader chunks), inspected locally.
- three.js Migration Guide (r150–r187): https://github.com/mrdoob/three.js/wiki/Migration-Guide
- r186 release coverage: https://radiancefields.com/three.js-ships-its-native-gaussian-splat-renderer-and-splat-raycasting-in-r186 · https://cgworld.jp/flashnews/01-202610-Threejs-r186.html
- WebGPU support status: https://web.dev/blog/webgpu-supported-major-browsers · https://github.com/gpuweb/gpuweb/wiki/implementation-status
- Lu, Jin, Zhao, Mao, Jaffer, "Mathematical Marbling", IEEE CG&A 32(6), 2012. Ink-drop and tine-line formulas taken from pp. 27–28: https://www.gwern.net/doc/cs/cellular-automaton/2012-lu.pdf · Jaffer, "Oseen Flow in Paint Marbling", arXiv:1702.02106
- Stam, "Stable Fluids", SIGGRAPH 1999 · Harris, "Fast Fluid Dynamics Simulation on the GPU", GPU Gems ch. 38 · PavelDoGreat/WebGL-Fluid-Simulation (MIT), a reference kernel set
- Bridson, Hourihan, Nordenstam, "Curl-Noise for Procedural Fluid Flow", SIGGRAPH 2007
- Jakobsen, "Advanced Character Physics", GDC 2001 (Verlet cloth)
- Ward, "Measuring and Modeling Anisotropic Reflection", SIGGRAPH 1992
- MDN, WEBGL_debug_renderer_info: https://developer.mozilla.org/en-US/docs/Web/API/WebGL_debug_renderer_info · Firefox deprecation: https://bugzil.la/1722782
- Measurements: `docs/research/bench/` (micro-benchmarks, capture throughput, encode costs, WebGPU probe; bundle each `.js` with esbuild as an IIFE and run the `.mjs` with Playwright. Absolute paths inside point at the scratch install used on 2026-10-25) and `threejs-techniques.verify.js` (all shaders, one context, 0 compile errors, 24 programs).
