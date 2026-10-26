# Portfolio Landscape Research — Senior Software Engineer (8 yrs) Portfolio

Research date: 2026-10-25. Written from the point of view of an Awwwards / FWA / CSSDA juror and creative technologist.
Goal: give the design and build steps a factual base — what has been done, what is now cliché, where the open territory is,
what hiring readers need, and what accessibility and performance bar an award-level WebGL site has to clear.

**How reliable this is.** Awwwards listing pages and case studies, web.dev, the three.js manual, MIT/CSAIL (Jaffer) and museum
collection pages were read directly. Codrops returned HTTP 403 to the fetcher, so Codrops items rest on search-result summaries.
Rows marked "(K)" in the catalogue come from background knowledge of well-known sites and were not re-checked during this
session. Where sources disagree, the conflict is stated.

---

## 0. Judging lens (what the jury actually scores)

- Awwwards weights: **Design 40 %, Usability 30 %, Creativity 20 %, Content 10 %**. At least 18 jurors score each site and the
  outlying scores are dropped. Honorable Mention needs 6.5 or more; Site of the Day (SOTD) is the day's top score. One source
  gives 15/15 for Creativity/Content instead; most give 20/10.
- **70 % of the score is Design + Usability.** A novel concept that loads slowly or confuses people loses to a fast, clean site.
  Usability covers navigation, clarity, performance, responsiveness and accessibility.
- Mistakes jurors call out: long preloaders, desktop-first builds, 5 s+ loads, placeholder or stock imagery, "coming soon"
  sections, template or AI-generated layouts, a polished home page with weak inner pages, motion with no hierarchy, and
  derivative trend-chasing.
- Studio guidance sets very aggressive targets (LCP < 1.5 s, CLS < 0.05, INP < 100 ms, under 3 MB, 60 fps). Google's "good"
  thresholds are LCP ≤ 2.5 s, INP ≤ 200 ms and CLS ≤ 0.1. **Aim between the two.**

---

## 1. Catalogue of notable examples (25)

| # | Site / URL | Year · recognition | What made it memorable (technique) | Lesson for us |
|---|---|---|---|---|
| 1 | **Bruno Simon** — bruno-simon.com | Rebuild launched late 2025; Awwwards Portfolio Honors Dec 2025, Developer Award, **Site of the Month Jan 2026** | You drive a car around a 3D island. Behaviour is driven by Blender naming conventions ("Physical"/"Fixed" → physics bodies). **TSL shaders with WebGPU and automatic WebGL2 fallback.** Grass is 78k single triangles looped around the island. Leaves are SDF billboards. Instancing, frustum culling, palette-texture UVs instead of vertex colours, KTX2 (ETC1S/UASTC) and Draco. **All visitors share the same weather and season in real time.** Async "whispers", a daily lap leaderboard, achievements, spatial audio, and a lower-quality mobile preset. | A portfolio can work as a *game with shared state*. Treat performance as a design constraint. **Shared real-time conditions** (time, season) are a strong idea we can adapt by tying the palette to the visitor's real time in JST. |
| 2 | **Igloo Inc** (abeto) — igloo.inc | 2024 · Awwwards **Site of the Year 2024**, Developer Award | Custom VDB→browser volume exporter (smaller than one image). The intro is rendered live in-engine, not pre-rendered. Shaders compile in the background. **Glitch and text-scramble effects run in WebGL with SDF text offsets instead of DOM/CSS, avoiding style recalculation.** Scene transitions use chromatic aberration plus frost. Continuously measured on low-end devices. | Do UI text effects on the GPU to keep the main thread free. Pre-compile shaders while the user reads. Build volumetric ice/ink "materials" with custom data formats. |
| 3 | **Lusion** — lusion.co | Studio site · SOTY from FWA, Awwwards and CSSDA (per Codrops 2026) | Physics-driven 3D objects that react to scroll and cursor, high-end lighting, R&D culture. | The craft bar for "engineers cheering". |
| 4 | **Oryzo** (Lusion) — oryzo.ai | 2026 · Awwwards SOTM Apr 2026, Developer Award | Satirical launch site for an "AI" cork coaster. **Inertial 3D product render combined with Z-depth scrolling.** Full fake campaign around it. | Humour and a sharp concept can beat spectacle. Scroll mapped to camera depth rather than page Y. |
| 5 | **Messenger** (abeto) — messenger.abeto.co | Sept 2025 · reported Awwwards SOTD | Cozy mail-delivery game on a tiny walkable planet with a **Japanese town atmosphere**. three.js + three-mesh-bvh. Houdini/Blender/Substance art. WebSocket presence where players see each other and send emoji. | Proves international audiences love Japanese everyday atmosphere when it is *not* sakura/torii kitsch. Lightweight multiplayer. |
| 6 | **IVRESS** (Utsubo, Tokyo) — brand.ivress.co.jp | 2026 · FWA SOTM May 2026, CSSDA | **WebGPU renderer with WebGL fallback; shaders written once in TSL.** A Japanese studio at the 2026 frontier. | Use TSL / WebGPU progressively and keep WebGL2 as the safe baseline. |
| 7 | **Cartier Watches & Wonders** (Immersive Garden) — cartier.com/en-fr/watchesandwonders | 2026 · Awwwards SOTD, CSSDA | **Six 3D alcoves**, each a self-contained diorama (GLSL, GSAP, Lenis), plus a **Web Audio score**. | Separate "rooms" give each section its own identity inside one system. That matches the client's "unique per page yet connected" request. |
| 8 | **Explore Primland** — explore.ownprimland.com | 2026 · Awwwards SOTD Feb 2026 | 3D landscape flythrough. **Scroll drives the camera along a path through atmospheric fog.** | Scroll-as-journey works well, but fog flythroughs are becoming common. |
| 9 | **Shopify Editions Spring 2026** — shopify.com/editions/spring2026 | 2026 | **Scroll-sequenced product reveal with type that disperses into particles** and depth-layered panels. | Shows how mainstream "particle type" has become, so we avoid it. |
| 10 | **Apple AirPods Pro / iPhone pages** — apple.com | 2019 → today | The archetypal **scroll-scrubbed sequence**: a pinned `<canvas>` draws preloaded JPEG/WebP frames chosen by scroll progress. Image sets run to tens of MB (one recreation was over 50 MB; WebP cut one hero from ~21 MB to ~4 MB). Mobile crashes are a known risk with big sequences. | This is the ancestor of the client's "one video across ~7 sections". We should beat it on memory (see §5.3). |
| 11 | **Jesper Landberg** — jesperlandberg.com | 2026 · Awwwards SOTD 29 Sep 2026, Developer Award | Minimal portfolio from one of the developers behind the "smooth-scroll + WebGL image plane" school. Restrained typography with GPU image transitions. (K) | Restraint plus very high polish still wins in 2026. |
| 12 | **Elliott Mangham** — elliott.mangham.dev | 2025 · SOTD 2 Dec 2025, Developer Award | Developer portfolio recognised for build quality. (Details not verified.) | Solo developer portfolios still win SOTD. |
| 13 | **Antoine Wodniack** — wodniack.dev | 2024 · SOTD 12 Dec 2024, Developer Award | Freelance creative developer, 140+ projects, 16 SOTDs. The site frames experience as hard numbers. | Counted, *real* proof (projects, awards, team led) is persuasive copy. |
| 14 | **Stefan Vitasović** — Codrops case study | 2025 | **Typographic animation plus a WebGL video grid with seamless page transitions**, glitch shaders and infinite scroll (Next.js + Framer Motion). | Video inside WebGL works. Glitch is on the edge of cliché. |
| 15 | **HAOQI.DESIGN** — Codrops "Inside HAOQI.DESIGN" | Aug 2026 | **DOM and WebGL share one "stage"**: HTML stays the source of truth and WebGL dresses it, in a retro-futurist art direction. | The pattern we need for SEO and accessibility: real DOM text with GPU decoration synced to its rects. |
| 16 | **Arnaud Rocca / "Shader uniforms to clip-path wipes"** — Codrops | 2026 | GSAP drives both shader uniforms and CSS clip-path wipes from **one timeline**. | One clock for DOM and GL. |
| 17 | **Garden Eight** — garden-eight.com · **The Shift** | SOTD Mar 2022 · SOTM Oct 2021 | Tokyo studio. OGL (minimal WebGL), GSAP, Locomotive Scroll, Barba.js. **Japanese restraint: generous *ma*, careful JP/EN type pairing.** | Japanese elegance comes from spacing and type, not motifs. |
| 18 | **Junni** (Tokyo) — junni.co.jp | SOTD Nov 2022 | Built on the studio's **own three.js-based library**. | Japanese studios favour in-house engines and craft. |
| 19 | **Treasures of Japan / "Opening"** (Mirror, Max Mara) | Awwwards inspiration | WebGL intro choreographed in **Theatre.js** (keyframe editor for three.js) with GSAP. | Theatre.js-style keyframed 3D choreography suits *jo-ha-kyū* pacing. |
| 20 | **Lynn Fisher** — lynnandtonic.com (K) | Redesigned every year | **Resizing the browser is the toy**: the illustration re-composes at each breakpoint. | Responsive behaviour itself can be the delight, which is engineer-native wit. |
| 21 | **Josh W. Comeau** — joshwcomeau.com (K) | ongoing | Interactive explainers, spring physics, optional sound and whimsical micro-interactions. **Teaching is the portfolio.** | For seniors, explaining *is* the proof of seniority. |
| 22 | **Brittany Chiang v4** — brittanychiang.com (K) | 2023 | Two-column, highly skimmable résumé site with a cursor-spotlight gradient. **Forked thousands of times**, so it is now a template look. | Skimmability benchmark, and also an example of how a look becomes a cliché. |
| 23 | **Henry Heffernan** — henryheffernan.com (K) / **Jesse Zhou** — jesse-zhou.com (K) | 2022 | A 3D computer whose screen runs a working fake OS (Heffernan). A Blender-baked 3D room (Zhou). | Both spawned paid clones (a $19.99 Gumroad clone exists) and the JS Mastery "3D developer portfolio" template with a desktop PC, globe and stars. **The 3D-desk/room portfolio is now the most cloned dev-portfolio trope.** |
| 24 | **Cyd Stumpel** — cydstumpel.nl (K) | 2023–25 | Award-level motion built on **native CSS View Transitions and scroll-driven animations**, plus a public guide to making award sites accessible. | Native CSS scroll timelines are now viable (Chromium 115+, Safari 26+; Firefox still behind a flag), so they suit lightweight 2D motion. |
| 25 | **Amanda Ghassaei — Digital Marbling** — amandaghassaei.com/projects/shaders | 2017–2022 | WebGL **suminagashi/marbling** that mixes Jaffer's closed-form "mathematical marbling" transforms with a GPU fluid solver. Keeping crisp colour boundaries was the hard problem. | Direct technical precedent for a suminagashi section, and proof the analytic route is feasible (§3, W7). |

Also worth a glance on the Awwwards Portfolio-Honors list (2024–26): NOTHIN' (noth.in, SOTD Aug 2026), Lama Lama (SOTM Jul 2026),
Pacôme Pertant (SOTD Jun 2026), MERSI architecture (SOTD Apr 2026), Gavin Schneider Productions (SOTD Mar 2026), Artiom Yakushev
(SOTD Dec 2025), Olha Lazarieva (SOTD Oct 2025), Phantom.Land (SOTD Jun 2025), Studio Null (SOTD May 2025), Gianluca Gradogna
(SOTD Jan 2025), Grégory Lallé '24 (SOTD Oct 2024), Lando Norris by OFF+BRAND (listed with a SOTY 2025 tag; unverified).

**Patterns across the winners**
1. One coherent world or metaphor, not a pile of effects (Bruno, Cartier, Messenger).
2. The GPU carries the decoration while the DOM carries the meaning (Igloo's SDF text, HAOQI's shared stage).
3. Performance work is published as part of the story (Bruno's and abeto's case studies).
4. Japanese studios win on restraint and typography (Garden Eight), not on motifs.
5. In 2026, WebGPU/TSL with a WebGL2 fallback marks a site as current.

---

## 2. Overused patterns (avoid them, or subvert them on purpose)

### 2.1 Developer-portfolio clichés (2023–2026)

| Cliché | Why it is stale | If we must touch it, subvert like this |
|---|---|---|
| 3D laptop / desk / room / "my PC" hero (Heffernan and Zhou clones, JS Mastery template with globe and stars) | The most cloned template; sold on Gumroad | None. Avoid entirely. |
| Floating iridescent blob / metaball / chrome torus hero | Signals "three.js tutorial #1" | Replace with a physically meaningful object: kumiko joinery, ink rings, a karakuri gear train |
| Name made of particles / text exploding into particles | Now mainstream (Shopify Editions 2026) | Never particles. If something must disperse, use **ink diffusing in water** with real marbling math |
| Terminal / CLI hero, fake VS Code window, OS-desktop (Win95/macOS) metaphor | The engineer cliché | An **Illustrator/CAD frame** is the fresh tool metaphor (rulers, guides, anchor points, Outline mode), but only if it *does* something (§3, W13) |
| Marquee skill ticker / logo carousel / rotating 3D tag cloud / skill % bars ("React 90 %") | Says nothing about depth; % bars are meaningless | Show depth as **evidence**: years, scale, artefacts ("ran Postgres at 40k writes/s"), structured as a joinery diagram |
| Bento grid | Named as worn out by Tilda and SaaSFrame; Apple → Linear/Vercel → everyone | Use asymmetric **byōbu panel ratios** or **kyōkaku book frames** instead |
| Custom cursor circle / mix-blend-difference cursor / magnetic buttons | Snellenberg-era signature, copied everywhere | Default cursor. Change the cursor only where the *tool* changes (pen nib over editable anchors, rake over sand) |
| Cursor-spotlight radial gradient | Brittany Chiang v4 fingerprint | — |
| Noise-grain mesh gradient / aurora gradient / purple→blue hero | The "AI-generated" look | Japanese **bokashi** (hand-wiped woodblock gradation, short and directional) |
| Pinned horizontal-scroll project gallery | Every 2021–24 agency site | If horizontal movement is used, give it meaning: **emaki reads right-to-left** (a reason, not a gimmick) |
| 0→100 % preloader counter / long intro | Jurors penalise it | Content is readable at first paint; 3D streams in afterwards. Skip and Esc always work |
| Split-letter stagger on every heading | Monotone, and screen readers read letters one by one | Vary the entrance per section; keep `aria-label` on the parent and `aria-hidden` on the spans |
| WebGL hover RGB-shift / ripple on thumbnails | 2019 Codrops staple | Misregistration of woodblock colour plates that snaps *into* register (meaningful: alignment) |
| GitHub-style globe with arcs; space/stars backgrounds; "solar system of skills" | Template look | — |
| Glassmorphism nav pill; pulsing green "available for work" dot | AI/SaaS look | State availability in plain words, with the visitor's local time against Tokyo |
| Alternating left/right timeline with dots on a centre line | Template look | Use **iji-dōzu** continuous narration (§3, W3) |
| Infinite drag-canvas gallery | Rising fast, 2025–26 | The Illustrator frame lets us *zoom to fit artboard* with keys, which is purposeful, not wander-around |
| Lenis smooth scroll everywhere with heavy lerp | Feels laggy and fights the native scroll | Light smoothing (or none on touch). Never hijack the wheel |
| Glitch shaders and chromatic aberration on everything | Overused since Igloo | One deliberate use at most |

### 2.2 "Japanese-themed" clichés (no Japanese designer would ship these)

- Falling sakura petals; Hokusai's *Great Wave* as a hero; torii gates; red rising-sun circle; Mt Fuji silhouettes; koi; bamboo;
  ninja/samurai; a red-white-black-only palette.
- "Zen" as beige minimalism; *wabi-sabi* as an excuse for low effort. **Kintsugi as "I embrace failure"** has become a Western
  LinkedIn cliché; if used for post-mortems at all, keep it tiny.
- Brush-script fonts for every heading; vertical text used only as decoration (vertical text is fine when it is *real reading
  text*, as in Japanese typesetting).
- Ink-splash PNGs and enso circles as decoration.

### 2.3 "AI-generated design" fingerprints (from the brief plus jury experience)

Warm cream #F4F1EA with a serif display face and a terracotta accent. Near-black with one acid pop. Broadsheet hairline columns.
Inter or Space Grotesk as the safe face (Syne and Bricolage Grotesque are trending the same way). Emoji section markers.
Everything centred. `rounded-xl` plus a drop shadow on every card, sometimes with a coloured accent bar. Decorative 01/02/03
numbering. Stat numbers inside circles. Glassmorphism. Neon glow. Default Tailwind slate/indigo. Uniform 1 px grey borders.
Identical section rhythm (heading, paragraph, 3 cards) repeated down the page.

---

## 3. White space — concepts nobody seems to have shipped

Searches for emakimono websites, byōbu WebGL, kumiko three.js, kamon construction tools and suminagashi shaders returned
**no portfolio or award site using any of them**. The only finds were Wattenberger's SVG kumiko generator, an OpenSCAD kumiko
model, Ghassaei's marbling art pieces, and the University of Chicago's academic handscroll viewer. The territory is open.

Each concept below gives the classical source, the software-engineering meaning, the interaction, the technique, and its cost.

**W1. 見当 KENTŌ — "Registration" as the master metaphor**
- *Source:* in mokuhanga (ukiyo-e woodblock printing), every colour block has the same two notches cut into it (kentō: an
  L-corner and a side mark), so each colour pass lands exactly on the key block. The idiom 見当をつける ("to take aim, to estimate")
  comes from it.
- *Engineering meaning:* GPU multi-pass rendering and compositing, layered architecture, aligning teams and systems. A senior
  engineer's job *is* registration.
- *How it works on the page:* each section "prints" in passes as it enters: 主版 key-block line (structure) → 色版 colour blocks
  (each skill domain) → ぼかし bokashi gradation (polish). Colour plates arrive slightly **misregistered and snap into register**
  as the reader arrives. The kentō marks and trim marks become the **border system**, replacing rounded cards.
- *Technique:* SVG/CSS for 2D. For 3D, an NPR post-process with per-plate UV offsets.
- *Cost:* low.

**W2. 屏風 BYŌBU + すやり霞 SUYARI-GASUMI — the scroll video, and the transitions between sections**
- The ~7-section scroll-scrubbed video becomes **one `VideoTexture` on a six-panel folding screen (rokkyoku byōbu)** in three.js.
  Panel fold angles follow scroll, so the zig-zag adds natural parallax. Byōbu come in left/right pairs, which suits
  before/after (a migration, a re-architecture).
- **Suyari-gasumi**, the gold band-clouds that byōbu and emaki painters used to *elide time and space between episodes*, become
  the classical answer to "animations between sections". They are layered SDF cloud bands that sweep across at chapter
  boundaries.
- *Cost:* one video decoder, one texture, about 12 triangles of panel geometry. Very cheap for the visual impact.

**W3. 絵巻 EMAKI reading grammar + 異時同図法 IJI-DŌZU**
- Emaki alternate 詞書 *kotobagaki* (text panels) with 絵 (picture panels) and read **right-to-left**.
- The page alternates skimmable text panels with picture/animation panels, which makes reading rhythm part of the design.
- *Iji-dōzu* (continuous narration) shows the same figure several times in one landscape to depict the passage of time. Here
  it becomes a **career timeline as one continuous painted landscape** in which the engineer's mark appears at each role, for
  example 2018 → 2026.
- This replaces the left/right dotted timeline cliché.

**W4. 東海道 TŌKAIDŌ — career as a road journey**
- Nihonbashi (first job) to Kyoto (now), using CC0 Hiroshige station prints from the Met and Cleveland Museum of Art as
  chapter art.
- Use only as many stations as there are real milestones (8 years gives roughly 8 stops). Never all 53 as decoration.
- Station stamps (eki-stamp culture) work as achievement markers. A 3D tube-route over a relief map is optional.

**W5. 家紋 KAMON construction = vector-anchor engineering**
- Kamon were drafted with compass and ruler by 紋上絵師 *mon-uwaeshi*, using construction circles (割り出し).
- The engineer's personal mon **constructs itself live** at the cover: construction circles, then arcs, then Illustrator-style
  anchor points and Bézier handles, then fill.
- The same mark serves as favicon, signature seal and loading state. Skill domains get *geometrically constructed* glyphs,
  which is not "letters in circles".
- *Interaction:* drag a handle and watch the mark stay valid through symmetry constraints.
- *Cost:* SVG plus a small solver. Negligible.

**W6. 組子 KUMIKO joinery = modular architecture**
- Thousands of slats lock together with half-lap notches and no nails: loose coupling, interfaces as contracts.
- **InstancedMesh lattice** (asanoha, goma, kaku-asanoha) assembles from an **exploded CAD view** into a shōji panel as you
  scroll. Hovering a "module" lights its dependencies.
- Light passing through the panel casts a shadow that resolves into the system-architecture diagram, a "gasp" moment.
- *Cost:* one draw call per pattern via instancing, with a GPU-driven per-instance animation offset.

**W7. 墨流し SUMINAGASHI = data flow / commits / open source**
- Jaffer's closed-form marbling maps:
  - ink drop: `P' = C + (P−C)·sqrt(1 + r²/|P−C|²)`
  - tine line: `F(P) = P + z·u^d·M`, with `d = |(P−B)·N|`
  - vortex: rotate `(P−C)` by `a = l/h`
- These are applied to polyline rings in a vertex shader: deterministic, resolution-independent, with **no fluid simulation**.
- Each ring is a release or contribution (for example one drop per month of OSS activity). The visitor's drag draws tines
  through the ink.
- *Cost:* very low compared with the Navier–Stokes ink everyone else uses.

**W8. 枯山水 KARESANSUI = reliability and observability**
- Raked gravel lines are steady-state signals, stones are services, and ripple rings around stones show incident blast radius.
- The rake pattern is **generated from real SLO/latency series** (p50 as line spacing, p99 as disturbance), like a
  seismograph drawn in sand.
- *Technique:* data-driven heightfield with normal-mapped grooves, or a fragment SDF. Light angle can follow the visitor's time
  of day.

**W9. 算額 SANGAKU = case studies**
- Edo-period geometry problems hung at shrines on wooden tablets, written as **問 (problem) · 術 (method) · 答 (answer)**. That is
  exactly the problem–approach–result format hiring managers want.
- Each case study becomes a sangaku tablet: a constructed diagram plus a terse 問/術/答 and measured outcomes. Detail pages read
  like proofs.
- Nobody has used this. It is culturally exact, nerd-pleasing, and **useful** for skimming.

**W10. 機巧図彙 KARAKURI ZUI = how I work / leadership**
- The 1796 *Karakuri zui* is an Edo mechanical-engineering manual with exploded woodblock diagrams of a tea-serving automaton.
  It is Japan's engineering ancestor and the root of its robotics culture.
- An animated, correctly meshing **involute gear train** stands for the delivery process: design review → build → CI → deploy
  → observe, with a doll that "serves tea" (delivers value). Gears can be owned by teammates, to show mentoring.
- *Licensing:* the 1796 woodcuts are public domain by age, but photographs on Commons carry their own licences (one is
  CC BY-SA 3.0). Check each file, or redraw the diagrams in our own vector style.

**W11. 印 HANKO / 落款 RAKKAN / 割印 WARI-IN**
- The rakkan seal is the artist's sign-off, which here means ownership and accountability, and also code-review "approval".
  The contact form ends by *stamping* the message.
- The **wari-in**, a seal stamped across the join of two sheets to prove they belong together, becomes a **section-join
  transition**: half the seal in one section, half in the next.

**W12. 和本 WAHON book furniture = a non-AI border and grid system**
- 匡郭 *kyōkaku* (printed frame, single or double rule: 単辺/双辺/四周双辺), 版心 and 魚尾 *gyobi* (fish-tail fold marks),
  柱 *hashira* (running heads carrying the section title), 丁付 page folios (real information), and 子持ち罫 *komochi-kei*
  (thick+thin double rule).
- These frames are shared with Chinese woodblock books, so the system also resonates with the zh locale.

**W13. The Illustrator frame as an *engineering lens*, not decoration**
- Rulers show live coordinates. On the scroll-video span the vertical ruler shows **years (2018…2026)**, so scroll position =
  video time = career time.
- Guides mark chapters.
- The **Layers panel is the table of contents and the control panel**: the eye icon hides the "motion" layer, which gives the
  user an explicit reduced-motion switch, and also hides decoration and 3D layers.
- **Outline mode (Ctrl/⌘+Y)** turns the whole site into wireframe: DOM boxes become hairlines, three.js materials go
  `wireframe`, and the video shows keyframe silhouettes. "Show me the structure" is the engineer's view-source.
- A **Document Info panel shows live telemetry**: `renderer.info` (draw calls, triangles, textures), frame time, current decoded
  video frame, bytes transferred (Resource Timing), LCP/INP via PerformanceObserver, and JS heap where available.
- The **selection tool** shows any element's bounding box, 8 handles and properties: font family, size, traditional colour
  name. This credits the typography and shows craft.
- Artboard names are real section names. "Fit artboard" works with keys.
- *Risk:* the UI chrome takes space on mobile, so collapse it to a thin ruler plus a toolbar sheet.

**W14. 序破急 JO-HA-KYŪ pacing + 間 MA, and 起承転結 KISHŌTENKETSU copy**
- Jo-ha-kyū is the Noh/gagaku tempo: slow opening, development, rapid close. It governs both the global arc and each
  section's motion curve, with long holds of stillness (*ma*).
- Kishōtenketsu structures case-study prose: setup, development, twist (the real constraint), resolution.

**W15. 重ねの色目 KASANE NO IROME colour system + real time in JST**
- Heian layered-robe pairings (outer and lining), named by season. More than 100 are recorded, e.g. Masasuke's list compiled
  for Empress Tashi.
- **Each artboard gets its own kasane pair**, which gives a unique identity per section with one shared grammar.
- Day/night become 昼/夜 variants. An optional accent tracks the current season (二十四節気) and the time in Tokyo.
- This doubles as **recruiter-useful information**: "It is 21:14 in Tokyo — replies within one business day."

**W16. "Baked vs. live" as an explicit engineering story**
- The scroll video is an *offline pre-render* (made headless from our own three.js world at quality real-time cannot reach). The
  live scenes run elsewhere on the page.
- The Document Info panel explains the trade-off in numbers. **The site is its own case study.**

### 3.1 Candidate synthesis (for the design step to adopt or override)

The site is one **Illustrator-like document whose artboards are laid out as an emaki**, printed with kentō registration in
kasane colours.

1. **Cover (表紙):** name, role, 8 years, three hard metrics, CTA, language and day/night controls, all visible at first paint.
   The personal kamon constructs itself (W5).
2. **Seven-section scroll-video span = career 2018→2026:** a byōbu `VideoTexture` (W2) with kotobagaki text panels per chapter
   (W3) and a year ruler (W13). Suyari-gasumi clouds separate the chapters.
3. **Case studies as sangaku (W9).**
4. **Architecture and skills as kumiko (W6).**
5. **Reliability and performance as karesansui (W8).**
6. **Writing, talks and OSS as suminagashi (W7).**
7. **How I work / mentoring as karakuri (W10).**
8. **Contact as rakkan seal (W11)**, with résumé download.

Transitions rotate between suyari-gasumi, wari-in, fusuma slide and misregistration snap, each chosen to suit the section it
leads into. Live three.js kinds: byōbu video screen, instanced kumiko, analytic marbling, data heightfield, gear mechanism, plus
one NPR "mokuhanga" post-process tying them together. **Six technically distinct 3D families.**

---

## 4. What hiring readers actually need

### 4.1 Reading behaviour

- TheLadders' 2012 eye-tracking study of 30 recruiters found the first fit/no-fit pass takes about **6 seconds**. About 80 % of
  that time went to name, current and previous title/company, dates and education. A 7.4 s re-run figure (2018) is
  single-sourced.
- Engineering leads then read **depth**: 3–5 strong case studies beat many shallow ones.
- AI-assisted screening increasingly parses portfolio pages, which rewards clean structure, real text and metadata.
- **Implication:** the first viewport must answer *who, level, specialty, proof, how to contact* **with zero animation
  dependency**.

### 4.2 Content checklist (all mandatory, no placeholders)

| Item | Notes |
|---|---|
| Name, title, years | "Senior Software Engineer · 8 years" plus specialty (e.g. distributed systems / web platform / performance) |
| One-paragraph summary | Who you help, how, with what result. Written per language, not machine-literal |
| 3–4 headline impact metrics | Real, specific, dated (latency ↓, cost ↓, uptime, scale, adoption, team grown). Use relative figures if confidential |
| Case studies (3–5) | **Problem → constraints → my role → approach and trade-offs → result (numbers) → what I would do differently.** Include diagrams and artefacts (RFC excerpts, dashboards, PR links) |
| Career history | Companies, titles, dates, scope (team size, systems owned), promotions |
| Tech stack *depth* | Grouped by domain, with years, scale and "used in production for X". No % bars |
| Architecture and system-design thinking | At least one design walkthrough |
| Reliability / performance / security track record | Incidents led, SLOs, on-call improvements |
| Leadership and mentoring | Mentees, hiring loops, RFC culture, onboarding docs, cross-team initiatives |
| Writing / talks / OSS | Titles, venues, repo links, stars or adoption where real |
| Testimonials | 2–3 short quotes from a manager, peer and report (named, with permission) |
| Résumé / CV | One-click PDF (per language) plus a print stylesheet of the site itself |
| Contact | Email (copy button), LinkedIn, GitHub; optional booking link |
| Availability | Open / not open, type (full-time, contract, advisory), notice period |
| Location and time zone | City, JST (UTC+9), overlap hours with EU/US, remote/hybrid/relocation, work authorisation |
| Languages spoken | e.g. Japanese, English, Chinese, with levels (also justifies the trilingual site) |
| Education and certifications | Brief |
| Now / currently | What you are building or learning (keeps the site alive) |

**Data note:** the client gave no personal data, so build all copy from a single trilingual content file (ja/en/zh-Hans) with
a coherent, realistic persona that can be replaced without code changes. Do not invent real employer names or false claims
about real organisations; use clearly fictional or generic company descriptors unless the client supplies real ones.

### 4.3 Skimmability despite heavy animation

- **Two speeds.** An "express lane" (cover, persistent header links to Work, Résumé PDF and Contact, and section summaries in
  the first lines) runs alongside the "scenic route" (scroll video, 3D).
- **Quiet / recruiter mode:** one toggle, also reachable from the Layers panel eye icon, renders a static text-first version
  with stills and no smooth scroll. It is also auto-chosen under `prefers-reduced-motion`.
- Every section opens with a **one-line takeaway** in body text that is readable before any animation finishes. Content never
  waits on animation, and nothing is hidden at `opacity: 0` without a timeout fallback.
- Deep links for every artboard and case study, a keyboard shortcut list, and a "skip the scroll film" link before the video
  span.
- Case-study pages are statically rendered HTML, so they print well and are indexed.

---

## 5. Accessibility and performance expectations

### 5.1 Accessibility (WCAG 2.2 AA as the floor)

- `prefers-reduced-motion`: replace scrubbed video and big 3D motion with stills or crossfades, disable smooth scroll, and keep
  the meaning. Provide an explicit in-page motion toggle, because many users never set the OS flag.
- **2.2.2 Pause, Stop, Hide:** anything that moves for more than 5 s on its own needs a pause control.
- **2.3.1:** no more than three flashes per second (watch glitch and chromatic effects).
- **2.3.3 Animation from Interactions (AAA, but expected by jurors).**
- Keyboard: a skip link, logical tab order through the Illustrator chrome, **2.4.7 visible focus** styled in the design
  language (kentō corner marks make an excellent focus ring), **2.4.11 focus not obscured** by fixed rulers/toolbars, and Esc
  to close panels.
- WebGL canvases get `aria-hidden="true"`; every 3D scene has a DOM equivalent (heading, text, list or figure with caption).
  Split-text uses `aria-label` on the parent and `aria-hidden` on the fragments.
- Contrast 4.5:1 for body text and 3:1 for large text and UI, **checked in both day and night themes and on every kasane pair.**
  **2.5.8 target size** at least 24×24 CSS px.
- `lang` on `<html>` and on any inline foreign text (ja / en / zh-Hans), which affects screen-reader voice *and* CJK glyph
  choice (the same Han codepoints render differently in JP and SC fonts).
- No scroll-jacking: native scroll stays authoritative, with light or no smoothing on touch. Browser zoom to 200 % must not
  break layout.
- CJK typography details:
  - `word-break: auto-phrase` (Chromium) for natural Japanese line breaks.
  - `text-spacing-trim` and `font-feature-settings: "palt"` in headings.
  - `writing-mode: vertical-rl` only for real Japanese/Chinese reading text.
  - Ruby for rare readings.

### 5.2 Performance budgets and techniques

- **Targets** (mid-tier Android, 4G): LCP ≤ 2.0 s (hard cap 2.5), INP ≤ 150 ms, CLS ≤ 0.05, Lighthouse ≥ 90 for Performance,
  Accessibility, Best Practices and SEO on the static first view.
- **First view:** HTML, CSS and critical JS ≤ ~150 KB gzip. The cover is pure SVG/CSS. three.js and scenes are dynamically
  imported after LCP or on approach (IntersectionObserver rootMargin).
- **One WebGL context, one fixed canvas, many scenes.** Render each scene into its DOM placeholder's rect with
  `setScissor`/`setViewport` (three.js manual "multiple scenes"). Browsers cap contexts (about 8–16 or more depending on the
  machine) and **resources cannot be shared across contexts**.
- Render on demand. Pause scenes that are off-screen or in a hidden tab (visibilitychange). Cap DPR at 1.5 on mobile and 2 on
  desktop. Use **adaptive quality from measured frame time** (drop DPR or effects after N slow frames) plus a coarse GPU tier
  from `WEBGL_debug_renderer_info` or detect-gpu, `navigator.hardwareConcurrency`/`deviceMemory`, and `Save-Data`.
- Instancing; merged geometry; palette textures; **KTX2/Basis textures** (GPU-compressed, much less VRAM than decoded PNG);
  Meshopt/Draco; dispose GPU resources when sections are far away. Pre-compile shaders (`renderer.compileAsync`) during idle
  time.
- Optional **WebGPURenderer with TSL** and automatic WebGL2 fallback. It is progressive enhancement, not a requirement.
- Animate only transform and opacity in the DOM. Use one shared clock (GSAP ticker drives Lenis/ScrollTrigger and the GL
  render). Use native CSS scroll-driven animations for simple 2D reveals where supported (Chromium, Safari 26+; Firefox needs
  the JS fallback).
- **Fonts:** CJK fonts are huge. Use Google Fonts' automatic unicode-range slicing, or build-time subsetting to the glyphs the
  content uses. Use `font-display: swap` with metric-compatible fallbacks to avoid CLS. Limit to about 6–8 families in total
  across the three locales, loaded per locale.
- **SEO:** statically rendered per-locale URLs (`/ja/`, `/en/`, `/zh/`) with `hreflang` alternates and x-default,
  per-language `<title>`/description/OG image, JSON-LD `Person` plus `ProfilePage`, sitemap. **The language switch navigates
  to real URLs; it is not only a client-side text swap.**

### 5.3 Scroll-scrubbed video (~7 sections): engineering spec

**Why not an image sequence?** 400 frames of 1280×720 RGBA held decoded take about **3.7 MB × 400 ≈ 1.47 GB** of memory, and
Apple-style sequences download tens of MB. A `<video>` element keeps only a handful of decoded frames in hardware-decoder
memory.

**Encoding**
- H.264 High, `yuv420p` (Safari otherwise shows a black box), **all-intra `-g 1`** (every frame seekable) or short GOP
  (keyint 4–10, `-bf 0`), `-an`, `-movflags +faststart`, fixed 24–30 fps.
- Tests show a keyframe every 5 frames scrubs smoothly while one every 100 frames stutters, at about 5× the file size.
  All-intra at about 1280 px wide is roughly 8 MB for H.264.
- Optionally add a VP9 WebM listed first: Firefox scrubbed MP4 choppily in one test, and iOS Safari handles WebM poorly.
- Offer 2–3 width variants (≈ 854 / 1280 / 1920) chosen by rendered size × DPR and connection.
- Keep it to about 10–14 s (roughly 300–420 frames) across about 700 vh. Design the shots so heavy motion lines up with chapter
  boundaries.

**Driver**
- The video stays `muted playsinline`, paused, and never calls `.play()` for scrubbing.
- Map scroll progress to a target time, quantised to frame centres `(n + 0.5)/fps`.
- **Only one seek in flight.** On `seeked`, jump to the *latest* target (latest-wins coalescing). Never throttle the targets
  themselves.
- Use `requestVideoFrameCallback` (Chrome 83+, Safari 15.4+, Firefox 132+) to know when a frame is actually presented. Mark the
  three.js `VideoTexture` `needsUpdate` **only then**, so no per-rAF uploads happen.
- Light lerp on the target only (not on scroll).

**Loading**
- `preload="metadata"` until the span is near. Then fetch the whole selected file (≤ ~10 MB) to a Blob URL so every frame is
  seekable without range-request stalls. Show a poster still until `canplaythrough`.
- iOS needs a muted priming load on the first user gesture.

**Optional Chromium/Safari path:** WebCodecs `VideoDecoder` (Chrome 94+, Firefox 130+ desktop, Safari partial before 26) with
mp4box.js demuxing. Keep a small LRU of `VideoFrame`s and always call `close()` on eviction; these frames hold GPU memory and
leak otherwise.

**Fallbacks:** `prefers-reduced-motion`, `Save-Data`, low-memory devices or decode failure switch to **7 chapter stills**
(AVIF/WebP) that crossfade, with the same text panels. Pause decoding entirely when the span is off-screen.

**Where it is shown:** directly as a composited `<video>` (zero-copy, cheapest) or as a texture on the byōbu (W2). The byōbu
uses one texture and about 12 triangles, so the cost difference is small, but keep the plain-video path as the low-tier mode.

**Content:** an offline render from our own three.js world, for example the emaki/byōbu landscape of the career journey. This
is the "baked vs. live" story (W16).

---

## 6. Imagery and colour sourcing notes

- **Public-domain or CC0 art:**
  - Met Open Access (`isPublicDomain`), e.g. Hiroshige *Tōkaidō* (Ōtsu JP804; series 57652).
  - Art Institute of Chicago (`is_public_domain`, IIIF).
  - Cleveland Museum of Art Open Access (CC0), e.g. Tōkaidō Hiratsuka 1985.237, Chiryū 1985.239, Hara 1985.235, Tenryū
    1940.985.
  - Avoid the *Great Wave*. Prefer less familiar prints: Hiroshige station prints, kamon pattern books, Edo maps, karakuri and
    sangaku diagrams (redrawn if a photo's licence is unclear).
- **Generated imagery:** offline three.js renders of our own scenes (kumiko, byōbu, gravel), procedural washi-fibre textures,
  and SVG constructions. These are meaningful because they show *our* work.
- **Colour:** build from traditional pigment colours with names, not Tailwind defaults. Commonly cited values (nipponcolors.com
  style; verify before use):

  | Name | Hex |
  |---|---|
  | 胡粉 gofun | #FFFFFB |
  | 白練 shironeri | #FCFAF2 |
  | 瓶覗 kamenozoki | #A5DEE4 |
  | 浅葱 asagi | #33A6B8 |
  | 青磁 seiji | #69B0AC |
  | 萌黄 moegi | #7BA23F |
  | 桜 sakura | #FEDFE1 |
  | 藤 fuji | #8B81C3 |
  | 山吹 yamabuki | #FFB11B |
  | 銀鼠 ginnezumi | #91989F |
  | 藍 ai | #0D5661 |
  | 紺 kon | #0F2540 |

  - Pair them as **kasane** per section, e.g. 卯の花 (white over green), 山吹 (pale russet over yellow), 萩 (suō over green),
    松重 (green over purple), 雪の下 (white over plum). Combinations vary by source.
  - **Day:** light paper grounds, but not the #F4F1EA cream cliché. Use cool gofun or kamenozoki-tinted paper.
  - **Night:** a moonlit indigo (紺/藍 family) with gofun text and lantern-warm accents. It is never neutral near-black and never
    neon, which keeps it within "no dark palette" in spirit while serving as a true night mode.
- **Borders:** kyōkaku frames, komochi-kei double rules, kentō marks, kumiko lattice rules, and varying sumi line weight. These
  replace uniform 1 px grey lines with rounded corners.
- **Typography:** vary by section while sharing one grid.
  - JP: Shippori Mincho B1 / Zen Old Mincho (classical), Klee One (pencil textbook), Dela Gothic One (heavy display),
    DotGothic16 (pixel, for telemetry), IBM Plex Sans JP (engineering text).
  - ZH: Noto Serif SC / LXGW WenKai (kai script), ZCOOL XiaoWei.
  - Latin: a non-default serif, a grotesk other than Inter/Space Grotesk, and a mono such as JetBrains Mono or IBM Plex Mono.
  - Check availability and licences at build time.

---

## 7. Sources

- Awwwards Portfolio winners list: https://www.awwwards.com/inspiration_search/winner_category_portfolio/
- Bruno's Portfolio case study (Mar 2026): https://www.awwwards.com/brunos-portfolio-case-study.html
- Igloo Inc case study: https://awwwards.com/igloo-inc-case-study.html
- Utsubo, 8 Best Three.js Websites of 2026: https://www.utsubo.com/blog/best-threejs-websites-2026
- Utsubo, Award-winning website design guide: https://www.utsubo.com/blog/award-winning-website-design-guide
- Hon Tran, How to build an award-winning portfolio: https://www.hontran.dev/blog/how-to-build-an-award-winning-portfolio-site
- Hon Tran, Scroll-scrubbed video stutters fix: https://www.hontran.dev/blog/scroll-scrubbed-video-stutters-fix
- Muffinman, Scrubbing videos using JavaScript: https://muffinman.io/blog/scrubbing-videos-using-javascript/
- CSS-Tricks, Apple-style scroll image sequence: https://css-tricks.com/?p=308477
- GSAP forum, AirPods image sequence: https://gsap.com/community/forums/topic/25188-airpods-image-sequence-animation-using-scrolltrigger/
- web.dev, requestVideoFrameCallback: https://web.dev/articles/requestvideoframecallback-rvfc
- three.js manual, Multiple scenes: https://threejs.org/manual/en/multiple-scenes.html
- Codrops: Stefan Vitasović (https://tympanus.net/codrops/?p=88357); HAOQI.DESIGN (https://tympanus.net/codrops/2026/08/15/inside-haoqi-design-letting-dom-and-webgl-share-a-retro-futurist-stage/); GSAP-driven portfolio (https://tympanus.net/codrops/2026/05/06/from-shader-uniforms-to-clip-path-wipes-how-gsap-drives-my-portfolio/); Lusion (https://tympanus.net/codrops/2026/04/13/lusion-where-digital-craft-meets-ambitious-experimentation/)
- Messenger by abeto: https://www.awwwards.com/messenger.html ; https://80.lv/articles/deliver-mail-on-tiny-colorful-planet-in-this-relaxing-web-game
- Garden Eight, The Shift SOTM: https://awwwards.com/the-shift-by-garden-eight-wins-site-of-the-month-october-2021.html
- Amanda Ghassaei, Digital marbling: https://blog.amandaghassaei.com/2022/10/25/digital-marbling/
- Jaffer, Marbling mathematics: https://people.csail.mit.edu/jaffer/Marbling/Mathematics
- Sangaku: https://en.wikipedia.org/wiki/Sangaku
- Emakimono: https://en.wikipedia.org/wiki/Emakimono ; UChicago Digital Scrolling Paintings: https://scrolls.uchicago.edu/
- Karakuri zui (British Museum): https://www.britishmuseum.org/collection/object/A_1998-0218-0-55-3 ; Seiko Museum: https://museum.seiko.co.jp/en/collections/book/collect002/
- Kasane no irome: https://sengokudaimyo.com/garb/kasane-no-irome ; https://en.wikipedia.org/wiki/J%C5%ABnihitoe
- Met Tōkaidō: https://www.metmuseum.org/art/collection/search/57652 ; Cleveland: https://clevelandart.org/art/1985.238
- Bento-grid fatigue: https://blog-en.tilda.cc/tpost/p515npkuk1-web-design-anti-trends-that-should-be-l ; https://www.saasframe.io/blog/designing-bento-grids-that-actually-work-a-2026-practical-guide
- Template evidence (3D desk portfolio): https://github.com/adrianhajdin/project_3D_developer_portfolio ; https://harisimran.gumroad.com/l/henry-hefferman-clone
- Wattenberger kumiko generator (SVG): referenced via https://plugins.qgis.org/styles/87
- TheLadders 6-second study: https://www.recruiter.com/i/theladders-reveals-research-reporting-that-resumes-spend-six-seconds-with-a-recruiter/
- Hiring-manager portfolio guidance: https://ntc.it.com/blog/hiring-managers-portfolio ; https://scale.jobs/blog/portfolio-content-for-tech-jobs-what-recruiters-want
- CSS scroll-driven animation support: https://ics.media/en/entry/230718/
- WebCodecs support overview: https://www.digitalsamba.com/blog/webcodecs-api-explained
