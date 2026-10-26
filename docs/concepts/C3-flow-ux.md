# C3 — 見当 / In Register / 套准

**Angle:** flow, readability and performance first. The page is designed scroll-distance by scroll-distance and byte by byte. It still carries eight distinct live 3D families, a seven-chapter scroll-scrubbed film and a Japanese-modern identity nobody has shipped.

---

## Concept

| | |
|---|---|
| **ja** | 見当（けんとう）— 八年、摺り重ね |
| **en** | In Register — eight years, printed in passes |
| **zh** | 套准 — 八年叠印 |

**Thesis.** A woodblock print is not one picture. It is a key block plus up to a dozen colour blocks, printed one after another onto the same damp sheet. They line up only because every block has the same two notches carved into it: the L-shaped *kagi-kentō* and the straight *hikitsuke-kentō* (見当). Senior engineering is the same job: keep many separate passes in register (teams, services, render passes, three languages, eight years) so the result reads as one clean image. The word has a second meaning that helps us. 見当をつける means *to make an estimate*, the most senior skill there is. And Illustrator still ships a swatch called **[Registration]** that prints on every plate. So the site is one Illustrator document that gets **printed as you scroll**. Each artboard first appears as its key block, the wireframe Ctrl/⌘+Y shows. Then its colour plates drop in a few pixels off and snap into register. The journey follows the Tōkaidō from Edo to Kyoto at a 序破急 pace and ends at Sanjō Bridge, where you get in touch.

**Why nobody has done it.** The landscape survey (portfolio-landscape.md §3) found no portfolio or award site using kentō, emaki, byōbu, kumiko, kamon construction, sangaku or suminagashi. Japanese-themed sites stop at sakura, waves and brush fonts. Engineer portfolios stop at desks, terminals and particle names. Our motifs are **production tools** instead: blocks, registration and crop marks, joinery, colophons. Each one says something true about engineering. Tatebanko (立版古, Edo paper dioramas) drives the film, but it was outside that survey, so check it before claiming it is a first.

**Persona.** The client gave no personal data. All copy lives in `content/persona.{ja,en,zh-Hans}.json`, and every fact has a `provenance` field.
- **Working persona:** 高瀬 律 / Ritsu Takase / 高濑律, Senior Software Engineer since April 2018, based in Tokyo (JST).
- **Specialty:** web-platform performance, real-time graphics and distributed back ends. The given name 律 means "regulation, rhythm".
- **Employers (all fictional):**
  - 花道コマース *Hanamichi Commerce*, 2018–20
  - 渡り鳥ロジスティクス *Wataridori Logistics*, 2020–23
  - 海路マップス *Kairo Maps*, 2023 to now
- **Build gate:** production refuses to ship while any metric or testimonial is still `provenance: "sample"`.

---

## Storyline, first frame to last

The page uses 序破急 at three scales: the whole page, each section, and the easing curve itself.

**序 Jo: slow and airy, one idea per screen**
1. **First paint.**
   - The screen shows a pale artboard on a light-cyan pasteboard, with rulers.
   - The name stands in vertical Mincho. Beside it, as plain HTML: title, eight years, specialty, Tokyo / JST, availability, and links to Work · CV · Contact.
   - A crest draws itself with compass arcs.
   - *The visitor knows who this is before anything moves.*
2. **The block lifts.**
   - An inked cherry-wood block carved with the mirrored crest and name rises off the sheet as you scroll.
   - The crest printed underneath snaps into register.
   - *Feeling: this person is precise.*
3. **覚書 Summary.**
   - Live guides are traced over Hokusai's lesson in perspective and converge on one vanishing point.
   - *Learns: a three-sentence summary and four dated results.*

**破 Ha: the road, where density and motion build**
4. **道中 Road.**
   - That vanishing point becomes the horizon of the film.
   - Seven Hiroshige stations, rebuilt as paper dioramas, scrub with the scroll from 2018 to 2025.
   - The camera moves right to left, the way a handscroll is read and the way the road runs from east to west.
5. **屏風 Works.**
   - Gold clouds part, and a six-panel gold-leaf screen unfolds.
   - Each panel is a case study.
6. **組子 Stack.**
   - The screen turns round to show its wooden lattice core.
   - The lattice re-forms as kumiko, one pattern per domain.
7. **枯山水 Principles.**
   - The lattice is pressed into sand and raked smooth.
   - Five stones stand for five principles. The raked rows are a real year of latency data.
8. **砂子 Results.**
   - Sand grains lift, turn to gold and settle into charts.

**急 Kyū: short and decisive, then stillness**
9. **墨流し Writing.**
   - The gold falls into water as the first ink ring.
   - Visitors drop ink, comb it, and take a print.
10. **暖簾 Testimonials.**
    - The print is hung as a noren. In Japanese accounting, のれん also means *goodwill*.
11. **京 Contact.**
    - Step through the noren onto Sanjō Bridge.
    - A handwritten letter, and a seal stamped when you send.
12. **奥付 Colophon.**
    - The journey rolls up as a miniature handscroll.
    - Credits, and the real bytes this visit cost.

---

## Global frame (chrome)

**Rule:** the chrome never takes reading width.
- **Desktop:** 20 px rulers, and panels that collapse to one line.
- **Mobile:** a 2 px progress ruler and a bottom sheet.

**Document bar (express lane)**
- Pinned top left, always visible: `takase-ritsu.ai` · *Senior Software Engineer · 8 yrs · Tokyo JST*.
- Three links: 作品 Work · 履歴書 CV · 連絡 Contact.

**Rulers**
- Set in Martian Mono. They show the real px offset inside the current artboard.
- Across the film, the top ruler changes to **years 2018 → 2025, running right to left**, so scroll position = video time = career time.
- The width axis follows scroll velocity (wdth 75 → 100).

**Layers panel = navigation**
- Each section is a layer, shown in Illustrator's auto-assigned layer colour by creation order (research §2.2): 薄群青 #5383C3, 韓紅 #E95464, 若竹 #5DAC81, 瑠璃 #005CAF, 躑躅 #E03C8A, 浅葱 #33A6B8, 刈安 #E9CD4C, 鈍 #656765, 墨 #1C1C1C, 黄丹 #F05E1C, 松葉 #42602D.
- These colours carry information; nothing about them is invented.
- The film layer expands into seven sub-layers, one per chapter, from 2018 to 2025.
- Hiding the **Motion / 動き / 动效** layer is the reduced-motion and pause control (WCAG 2.2.2).

**Language switcher**
- Three document tabs, **日本語 · English · 中文**, each label set in its own face.
- Each language is a static URL (`/ja/ /en/ /zh/`) with hreflang.
- Switching runs a cross-document View Transition: the text plates lift 3 px and the new language prints into register in 280 ms. Where View Transitions aren't supported, the swap is instant.
- Every text node carries `lang`, so CJK glyph forms render correctly.

**Day / night: 昼摺 / 夜摺 (day impression / night impression)**
- Hōeidō prints were genuinely reissued with altered colour blocks, so the switch is a pair of colour chips rather than a sun/moon icon.
- The change animates as an **ichimonji-bokashi**, the dark band printed across the top of ukiyo-e skies, wiping down in 600 ms.
- The initial theme follows `prefers-color-scheme`. The visitor's choice is remembered in try/catch-guarded localStorage.
- **3D scenes are relit, not inverted.** A shared `uNight` uniform moves every light rig to moon and lantern light without recompiling anything.

**Cursor**
- Native, never a follower circle. Over a 3D view it becomes the matching tool (rake, ink drop, hand).
- On fine pointers, hovering a heading draws magenta **smart guides** and names its font and colour ("Zen Antique · 瑠璃 #005CAF").

**Info panel**
- Collapsed: `霜降 · JST 14:32 · 60 fps · 7 draws`. The solar term is computed from the sun's longitude.
- Expanded:
  - `renderer.info`, frame ms, DPR and tier
  - video frame and seek ms
  - bytes transferred
  - live LCP / INP / CLS
- A **分版 Separations** section toggles the current artboard's "plates", which are its real render passes (key line, colour, bokashi, post).

**Proof mode (校正刷り), the recruiter mode**
- Flattens the site into a static, text-first proof sheet with crop marks: no WebGL, no film.
- The same stylesheet is the print CV. At build time, Playwright renders the ja / en / zh PDFs from it.

**Keyboard.** Ctrl/⌘+Y toggles **outline mode** (every view wireframe, every DOM block its key-line box), caught only with page focus; Shift+Y is the fallback because ⌘+Y opens History in some browsers. Ctrl/⌘+R is never taken; Shift+R toggles rulers, G guides.

---

## Design tokens

### Palette 「藍摺 Aizuri」: light-dominant (NC = nipponcolors, WD = 和色大辞典)

| Token | 昼摺 Day | 夜摺 Night: moonlit indigo, never black |
|---|---|---|
| `--pasteboard` | 白藍 WD #C1E4E9 | 紺青 WD #192F60 |
| `--artboard` | 卯の花 WD #F7FCFE | 紺 WD #223A70 |
| `--panel` | 藍白 WD #EBF6F7 | 瑠璃紺 WD #19448E |
| `--ink` | 紺 NC #0F2540 (14.95:1) | 月白 WD #EAF4FC (9.88:1) |
| `--ink-2` | 藍鼠 NC #566C73 (5.36) | 瓶覗 NC #A5DEE4 (7.43) |
| `--link` | 縹 NC #006284 (6.59) | 白群 NC #78C2C4 (5.41), underlined |
| `--guide` / label | 浅葱 #33A6B8 (decorative) / 藍 #0D5661 | 白群 #78C2C4 / 瓶覗 #A5DEE4 |
| `--select` | 躑躅 #E03C8A (UI); 牡丹 #C1328E as text | 桃 NC #F596AA |
| `--seal` | 紅 NC #CB1B45 (once per artboard) | 鴇 NC #EEA9A9 |
| `--gilt` | 山吹 NC #FFB11B (fill only; 紺 on it 8.50:1) | 刈安 NC #E9CD4C |
| `--season` | follows the 二十四節気; currently 霜降, 朽葉 #E2943B (non-text) | same hue, lighter |

**Section kasane pairs.** Each section pairs its layer colour (used for selection) with one pigment from its own images, taken from the manifest's `accentColors`. Examples: Prussian blue #205C81 on the cover, Kyoto red #C27B65 on contact, Seki teal #4C8480 on testimonials.

**Borders.** Print marks replace cards:
- radius 0 and hairline frames;
- Japanese double crop marks (日本式トンボ) at the corners;
- focus rings drawn as two L-shaped kentō marks;
- colour bars named in kanji where the plates change.

There are no shadows, glass or glow. Gradients appear only where they are physical: kasumi mist, bokashi, gold sheen.

### Type system (verified Google Fonts families, research §4.1)

**Constant base (the connective tissue)**

| Role | Fonts |
|---|---|
| Body | IBM Plex Sans JP / IBM Plex Sans / Noto Sans SC, 400 and 500 |
| Chrome | Martian Mono |
| Code | IBM Plex Mono |

- **Line height:** 1.85 (ja), 1.8 (zh), 1.55 (en).
- **Measure:** 30–40 characters (ja), 28–36 characters (zh), 60–72ch (en).
- **CSS:** `line-break:strict`, `text-spacing-trim`, `text-autospace`, `word-break:auto-phrase` on Japanese headings, and `text-box` trim on display type.

**Display voices, one per artboard**

| Artboard | ja | en | zh-Hans |
|---|---|---|---|
| 表紙 Cover | Shippori Mincho B1 800, vertical | Bodoni Moda italic, opsz 96 | Noto Serif SC 200→900; signature in Ma Shan Zheng (horizontal) |
| 覚書 Summary | Murecho, wght 300→700 | Schibsted Grotesk | Noto Sans SC 700 |
| 道中 Road | Zen Antique, vertical 詞書 | Big Shoulders | ZCOOL XiaoWei |
| 屏風 Works | Dela Gothic One + Kaisei Tokumin 800 | Bricolage Grotesque, wdth 75 | Noto Sans SC 900 |
| 組子 Stack | DotGothic16 | Martian Mono + Handjet counters | ZCOOL QingKe HuangYou |
| 枯山水 Principles | Zen Old Mincho | Newsreader opsz 72, light | Noto Serif SC 300 |
| 砂子 Results | 大字 in Shippori B1; captions in Yuji Syuku | Gloock numerals | 大写 in Noto Serif SC; captions in Zhi Mang Xing |
| 墨流し Writing | Noto Serif JP | Newsreader | Noto Serif SC 400 |
| 暖簾 Testimonials | Kaisei HarunoUmi | Newsreader, opsz 24 | ZCOOL XiaoWei |
| 京 Contact | Klee One 600 | Newsreader italic | Long Cang |
| 奥付 Colophon | Shippori Antique B1 | IBM Plex Mono | Noto Serif SC 300 |

**Font loading**
- Display faces are build-time `&text=` subsets (1.5–6 KB each), self-hosted under the OFL, and only the cover's subsets are preloaded.
- `size-adjust` fallbacks give zero CLS when fonts swap.
- Faces without vertical tables are never set vertically.

### Motion language

**Four verbs.** Every section uses the same four, so eleven sections read as one print run:

| Verb | Meaning | How it moves |
|---|---|---|
| **摺る** | print-in | Colour plates arrive 2–6 px off and spring into register (≤1 px overshoot). **Key-block text is never invisible.** It is in the HTML at first paint, and only pseudo-element colour plates move. |
| **引く** | draw | Lines draw in compass-and-ruler order. |
| **霞む** | mist | Mist or gold-cloud bands wipe across (transform only). |
| **捲る** | fold | Folds, lifts and rolls. |

**Easing and duration**

| Phase | Easing | Duration |
|---|---|---|
| Jo | `--ease-jo: cubic-bezier(.45,0,.2,1)` | 900–1400 ms |
| Ha | `--ease-johakyu: linear(0, .03 15%, .10 35%, .35 60%, .60 80%, .85 93%, 1)`, mirrored in GSAP CustomEase | 500–700 ms |
| Kyū | `--ease-kyu: cubic-bezier(.2,.9,.1,1)` | 180–260 ms |

**Scroll**
- Lenis runs at its default lerp of 0.1 with `syncTouch:false`, so touch scrolling stays native.
- ScrollTrigger supplies progress only. Captions use CSS scroll-driven animations.
- Elements stick rather than pin, and nothing scroll-jacks.
- SplitText is used only on the name and section titles.
- Between sections, a **間 band of 15–25 vh** holds exactly one transition. Reading zones and transition zones never overlap.

---

## Section-by-section spec

Each section lists its content, layout and accent, effect, images, the transition into the next section (→), and its fallback (F).

### 表紙 Cover — 序

**Content.** Name; *Senior Software Engineer · 8 years · web platform, real-time graphics, distributed systems*; Tokyo · JST · remote or relocation; available from 2027-01; Work / CV / Contact.

**Layout.** The vertical name column sits in the right third. The facts sit lower left on the guide grid. At least 38% of the area is left empty (余白). Accent: Prussian blue.

**Effect (2D, safe for LCP).** The personal crest **丸に三つ組子** draws in SVG in true compass order: circles, intersections, then anchors with Illustrator handles, then fill. It shows a kumiko 三組手 joint inside a circle: three strips held without nails, standing for front end, back end and infrastructure.

**Effect (3D, imported at idle after LCP): an SDF-carved woodblock.**
- The crest and the name in the current language are drawn mirrored onto a 1024² canvas.
- A GPU **jump-flood** pass (10 passes) turns that canvas into a distance field.
- A chisel-bevel profile drives the vertex displacement of a 256² plane.
- `MeshPhysicalMaterial` is patched through `onBeforeCompile` to add mountain-cherry grain, round-chisel gouges and wet ink (roughness 0.25 against 0.7).
- **Switching language re-carves the block.**
- The pointer tilts it ±6°. The first 40 vh of scroll lift it away while the DOM crest registers in.
- One draw call, rendered on demand.

**Images.** None; everything is generated. At night it is lit like an andon lamp.

**→ Summary.** The summary's plates print in.

**F.** A 60 KB AVIF still from the capture build. Mobile uses a 64² mesh with a baked normal map.

### 覚書 Summary — 序

**Content.**
- Three sentences.
- Four dated results:
  - map-engine p95 frame time from 38 to 9 ms (2021)
  - deploys from 2 a week to 30 a day (2020)
  - lead time across 14 teams from 4 days to 6 hours (2024)
  - MTTR from 3 h 10 min to 22 min (2025)
- A "now" note.
- Languages: ja native, en professional, zh conversational.
- Live overlap hours with Europe and the US West Coast.

**Layout.** Text takes the left 54%. Hokusai's perspective page sits on the right at 46%, with a deckle mask.

**Effect: 2D only, on purpose.** The GPU rests here, a 間. SVG guides are registered to Hokusai's own construction lines; their endpoints were traced once in normalised image coordinates. They are drawn by a CSS `view-timeline`. Each metric sits at a guide intersection with an Info readout such as `X 812 Y 344`.

**Images.** `hokusai/manga-perspective`.

**→ Road (match cut).** The guides converge on a vanishing point that matches the road and horizon of the film's poster frame exactly. The film fetch starts here, three viewports ahead. F: static lines.

### 道中 The Road — 破 (the film is specified below)

**Layout.** An 800 lvh section with a sticky 100 lvh stage.
- In ja, the captions are vertical 詞書 on the right, because emaki put the text before the picture.
- In en and zh they are horizontal blocks at the lower right.

**Accent.** 若竹, with each print's own pigment on its caption rule.

**→ Works.** The last rest frame is rain thinning into mist. Two DOM SVG **suyari-gasumi** gold-cloud bands slide across it from right to left, using transform only and no blending over the video. When they part, the byōbu is already live behind them.

### 屏風 Works — 破

**Content.** Six case studies, one per panel. Panels are counted from the right, as on a real screen: **第一扇 … 第六扇**, which is the true reading order.
1. Fleet map engine, WebGL2 vector tiles (Wataridori, 2021)
2. Payments strangler migration, with zero lost transactions over 14 months (Hanamichi, 2019–20)
3. Developer platform (Kairo, 2023–24)
4. Resilience programme (Kairo, 2025)
5. Design system (Hanamichi, 2019)
6. `scrubkit`, the open-source scroll-video controller this site runs on (2026)

**Case pages.** Each panel opens a static case page in **sangaku format**:
- **問**: problem and constraints
- **術**: method, architecture and trade-offs
- **答**: results in numbers
- 後記: lessons

The architecture diagram constructs itself like an Edo geometry tablet. The panel morphs into the page header through a View Transition.

**Layout.** Sticky for 250 lvh. The screen opens and the camera dollies right to left. The focused panel's 問 / 術 / 答 sits in a DOM column beside it, in 紺 on 卯の花 and never on gold. The selection colour is 瑠璃.

**Effect: a gold-leaf byōbu shader.**
- **Panels and fold:** six panels at the measured 1 : 2.75 ratio. The zig-zag fold comes from `uOpen`, with flat normals from dFdx/dFdy.
- **Gold leaf:** 109 mm leaf squares with overlap seams (箔足), per-leaf tilt, Ward anisotropy, Fresnel and worn patches. The painting is composited only where it carries pigment.
- **Light:** follows the pointer like a candle.
- **Clouds:** the suyari clouds are an SDF in the same shader.
- **Cost:** one draw call.

**Images (Rinpa crops chosen for meaning).**
- *Irises at Yatsuhashi*: the eight-plank zigzag bridge stands for the platform.
- *Rough Waves*: resilience.
- *Fans upon Waves*: components on a flowing base, i.e. the design system.
- *Bamboo Grove*: the nodes are keyframes every 8 frames, i.e. `scrubkit`.
- *Poppies*: the chequered fence is the ledger.
- The map-engine panel is a **real render from our own engine**: a fictional coastline styled as an Edo map.

**→ Stack.** The screen folds and turns. A real byōbu is built on a wooden lattice core (下地骨), and here that core explodes into kumiko.

**F.** Mobile gets a vertical panel stack with CSS scroll-driven ±8° folds. T1 gets flat images.

### 組子 Stack — 破

**Content: five domains.** Every tool lists its years in production and links to the panels where it was used.
- **Front end:** TypeScript, React, web performance, accessibility, three.js, WebGPU.
- **Back end:** Go, Node, Rust, gRPC, Kafka.
- **Data:** PostgreSQL, Redis, ClickHouse.
- **Infrastructure:** Kubernetes, Terraform, AWS/GCP, OpenTelemetry, SLOs.
- **Practice:** system design, incident command, mentoring (9 mentees, 3 promoted), writing.

**Layout.** A 3×2 shoji frame. Five cells hold 麻の葉, 角麻の葉, 七宝, 青海波 and 三組手. **The sixth cell is Hokusai's own page constructing asanoha and seigaiha: the spec beside the implementation.**

**Effect: instanced kumiko assembly.**
- 12k / 5k / 2k strips, depending on tier.
- Each instance has an exploded transform and a target transform, staggered and driven by one `uProgress` injected into `MeshStandardMaterial` (with `customProgramCacheKey`).
- Normals are patched in `beginnormal_vertex`.
- **Honest depth.** A fully assembled pattern means 5+ years in production at scale. A partial one means it is in use but newer. The years are always printed. There are no percentage bars.
- A raking light casts the lattice onto the shoji paper. The shadow is recomputed only while the lattice assembles.
- An **Architecture / 構造 / 架构** toggle crossfades the strips to a second target set: the map engine's system diagram.

**Images.** `manga-pattern-construction`. The asanoha and sayagata stencils serve as legend masks.

**→ Principles.** The lattice lies down into sand and is raked away.

**F.** A static SVG lattice.

### 枯山水 Principles & reliability — 破

**Content.**
- Five stones, five principles: *Measure before optimising · Make the safe path the easy path · Write it down · Own the pager · Leave it cleaner*.
- The SLO of 99.95% was met in 11 of 12 months. The incident log and the on-call philosophy are included.

**Layout.** The emptiest artboard on the site. Principles stand as large vertical columns in the blank sand.

**Effect: analytic height-field sand with raymarched stones.**
- **The garden is the data.** There are 52 raked rows, one per week, and each row's waviness is that week's p99 latency. The rings around *Own the pager* are SEV1 incidents, with radius proportional to blast radius.
- The pointer rakes into a 512² trail target. A 整える / Re-rake button resets the garden.
- Stones are smooth-union SDFs, raymarched only inside proxy boxes with a 64 / 40 / 24 step cap and analytic shadows.
- At night the sand is moonlit.
- A "Show data" link opens an accessible table of the same figures.

**Images.** `motonobu-ink-landscape`, very faint, far behind.

**→ Results.** Grains seeded from the height field (GPU to GPU, no readback) lift and turn gold.

**F.** A pre-rendered still and the table.

### 砂子 Results — 破 (zh label 洒金, gold-flecked paper)

**Content.**
- **Three dated charts:** deploys per day 2018–26, p95 latency, and cost per request.
- **Large figures:** 捌年, 参拾 deploys/day, 22-minute MTTR, −38% CI cost. Each shows its date range and source.
- **Credentials:** B.Eng. in Information Science (2018), one certification, and two internal awards.

**Effect: GPGPU sunago.**
- `GPUComputationRenderer` holds position and velocity in 256² / 128² / 64² textures.
- Gold flakes are sifted from a band, carried by drag and curl noise, and spring to targets sampled from each SVG chart.
- They draw as rotated point sprites with an anisotropic glint, sized by DPR.
- Hovering scatters them, and they settle back.

**Images.** A corner of `shonen-aged-pines` (ink pines on gold).

**→ Writing.** The gold falls into water as the first ink ring.

**F.** SVG charts with gold hatching and the same table.

### 墨流し Writing, OSS & talks — 急

**Content.** Three repositories, six dated articles and four talks. Venues stay generic until the client's real record replaces them.

**Effect: closed-form suminagashi (Lu & Jaffer).**
- Every drop or comb stroke is **one pass** over a 1536² / 1024² / 768² ping-pong texture. At rest it costs nothing, and the edges stay razor-sharp.
- The starting pattern is compiled from real commit history: one ink per repository, one drop per release, one comb stroke per article.
- Click to drop and drag to comb. `?seed=` reproduces any pattern exactly.
- **紙を置く / Take a print** lowers a sheet onto the water and lifts it. The print downloads as a PNG and *dyes the next section's noren*.

**Images.** Gakutei's surimono:
- *Spider's Web* for OSS, a quiet pun on the Web
- *Book Cart* for articles
- *Brush* for talks

**→ Testimonials.** The print is hung on a rod. F: a still of the default pattern.

### 暖簾 Testimonials — 急

**Content.** Three quotes, each with name, role and relationship. Each noren carries one kanji that distils its quote: 信, 速 or 育. The full text sits beside it in the DOM.

**Effect: CPU Verlet noren.** Three cloths of 18×30 particles each, 4 iterations, under 0.15 ms per frame. Pointer velocity acts as wind, and hovering parts the strips.

**Images.**
- **Day:** Hiroshige's **Seki: Early Departure** (48). Its great crested curtains rhyme with the noren.
- **Night:** **Twilight Moon at Ryōgoku**.

**→ Contact.** The camera walks through the centre noren, moved aside by a sphere collider, onto Sanjō Bridge.

**F.** A still cloth.

### 京 Contact & CV — 急

**Content.**
- A short letter and a three-field form.
- Email, GitHub and LinkedIn links.
- CV PDFs in ja, en and zh.
- Availability, a live JST clock with overlap hours, and a stated response time.

**Layout.** The Kyoto print (`tokaido/55-kyoto`, the arrival at Sanjō Ōhashi) fills 60% of the width with a deckle edge. The letter is set in Klee One. Accents: 黄丹 for selection, Kyoto red, and 紅 for the seal.

**Effect.** The letter appears first as Illustrator outlines with visible anchors, then fills phrase by phrase. **Sending the form stamps a 白文 seal of 律.** Without JS, the form falls back to `mailto:`.

**→ Colophon.** A 割印 seal is stamped across the boundary, half on each artboard.

### 奥付 Colophon — 急, then stillness

**Content.**
- Manifest `creditText` for every image (Met and AIC, CC0), with thumbnails.
- Fonts and their licences, plus the library versions (three.js r186, GSAP 3.15, Lenis 1.3.27).
- **Edition line: 「第一版 第七刷」**. The major version is the 版 and the deploy count is the 刷.
- This visit's real bytes and live Web Vitals.

**Effect: emakimono roll-up.** At build time we capture one 4096×256 AVIF strip per language and theme: a miniature of every section. Here it spirals onto a roller in the vertex shader and is tied with a cord. Two draw calls, played once.

---

## The scroll-scrubbed film

**What it shows.** The camera travels right to left, east to west, matching the map. It passes through seven **tatebanko dioramas**. Each is a Hiroshige station cut into 5–7 depth plates. One road ribbon joins them, and mist bands hide each scene change. **The same small indigo traveller carrying the crest appears in every diorama** (異時同図法), so the eye always has a protagonist. Because the plates are layered in depth, the scene can be reframed for a true **portrait camera**, which a flat print cannot.

| Ch. | Station (print no.) | Year | Rest frame | Caption |
|---|---|---|---|---|
| 1 | 日本橋 (1) 朝之景 | 2018 | Gates open on the dawn procession | Joins Hanamichi; checkout rewrite; first on-call |
| 2 | 箱根 (11) 湖水図 | 2019 | The patchwork pass, from a low camera | The climb: design system; payments carve-out begins |
| 3 | 三島 (12) 朝霧 | 2020 | Silhouettes in fog | Moves to Wataridori: a greenfield dispatch product built through pandemic uncertainty; traffic ×6 |
| 4 | 原 (14) 朝之富士 | 2021 | Fuji breaks the frame | WebGL map engine, 38 → 9 ms; becomes tech lead |
| 5 | 島田 (24) 大井川駿岸 | 2022 | Porters carry travellers across the river | Leads six engineers through the Kubernetes migration |
| 6 | 岡崎 (39) 矢矧之橋 | 2023–24 | The longest bridge on the road | Joins Kairo; platform bridging 14 teams |
| 7 | 庄野 (46) 白雨 | 2025 | Rain thinning into mist | Runs a multi-region incident; resilience programme |

Kyoto (55) is kept back for Contact.

**Production**

1. **Plates.**
   - Trace 5–7 depth masks per print as Illustrator paths.
   - A Pillow script cuts the plates and quantises each to at most 8 flat colours, the way woodblocks work.
   - It removes paper grain, rebuilds the bokashi skies as clean gradients, and fills the holes behind cut-outs with the plate colour.
   - Flat plates compress far better than texture, which costs 3.6× the bytes.
2. **Scene.**
   - A `tatebanko` view module gives the plates a paper curl, baked contact shadows and alpha mist planes.
   - The camera follows a CatmullRom path with frame-exact rest poses. The portrait path is authored separately.
3. **Capture.**
   - A deterministic `capture.html` uses frame-indexed time and seeded randomness, and precompiles its shaders.
   - Playwright on SwiftShader sends PNG batches of 8 into `ffmpeg -f image2pipe`, about 1–2 minutes per clip.
4. **Encode.** The command:
   `-c:v libx264 -preset slow -profile:v high -pix_fmt yuv420p -g 8 -keyint_min 8 -bf 0 -sc_threshold 0 -force_key_frames <7 rest times> -colorspace bt709 -color_primaries bt709 -color_trc bt709 -movflags +faststart -an`

   | File | Resolution | fps | CRF | Length | Size |
   |---|---|---|---|---|---|
   | `film-hd` | 1280×720 | 30 | 23 | 16 s | ≤5 MB |
   | `film-sd` | 960×540 | 30 | 24 | 16 s | ≤2.5 MB |
   | `film-portrait` | 720×1280 | 24 | 25 | 16 s | ≤3 MB |

   - There is no 1080p.
   - Washi texture is a static AVIF overlay, never baked into the video.
5. **Stills.** Seven chapter stills (AVIF/WebP, ≤80 KB each) are extracted *from the encoded MP4*, so the poster matches frame 0 exactly.

**Player**

- **Markup.** One paused `<video preload="none">` in a sticky stage (`overflow:clip` ancestors, `align-self:start`, no `dvh`).
- **Loading.** The whole file is fetched as a Blob within three viewports, or earlier at idle on 4G without Save-Data or on fine pointers. A `<picture>` poster fades after `seeked` plus one `requestVideoFrameCallback`.
- **Scrub mapping.** A 2049-entry lookup table holds each rest frame for 0.4 of its chapter, then eases with a smoothstep into the next.
- **Seeking.**
  - Targets snap to mid-frame times.
  - Seeks are **single-flight**: only the newest target is kept, and it is issued from `seeked`.
  - Damping is time-based (k = 20/s).
  - rAF runs only while the target and the shown frame differ, so idle costs zero.
  - `fastSeek` is used only for Layers jumps longer than 1 s.
  - If 30 seeks average over 66 ms, playback switches to SD.

**Tiers**

| Condition | Gets |
|---|---|
| Reduced motion | stills in the normal flow |
| Save-Data, 2G or any error | crossfading stills |
| iOS Low Power Mode | WebCodecs canvas |
| Portrait | the portrait file |
| Low memory | SD |
| Everything else | HD |

**While the film is on screen**
- Every other render loop stops, and the shared canvas is set to `visibility:hidden`.
- At night, a static 紺青 layer at 18% opacity covers the video. It uses no blend mode and needs no second encode.
- A **映像を飛ばす / Skip the film** link sits at the top of the section.

---

## Performance architecture and budget

**Delivery**
- Static HTML for each language and each case page, with JSON-LD Person data and hreflang (`x-default` → `/en/`).
- Critical CSS is inlined and the cover is SVG.
- Core JS (Lenis, ScrollTrigger, the app shell) loads after first paint.
- three.js and the cover view load at idle after LCP. Every other view is its own chunk, warmed 1.5 viewports ahead.

**One renderer, many views**
- **Canvas.** One fixed WebGL2 canvas (r186, GLSL). Every view has a scissor rect.
- **Live views.** **At most two are live**, three only during a 間 transition. Parked views free their render targets but keep their programs.
- **Render on demand.** A view requests frames only while it is simulating, tweening or hovered. The loop stops completely when nothing is visible or the tab is hidden.
- **Tier changes.** Uniforms and draw ranges carry tier changes, never defines, so nothing recompiles. `compileAsync` runs at idle.
- **Post.** One combined post pass: nijimi bleed, a vignette of at most 8%, a register offset that springs to 0 at rest, then tone mapping and dither. T2 and below use CSS grain instead.
- **Governor.** It lowers DPR first and tier second, and recovers after 8 s. DPR is capped at 1.5 on mobile and 2 on desktop. There is no MSAA at DPR 1.5 and above.
- **Context loss.** CSS posters stand in, and the simulations re-seed deterministically.

| Tier | Who | Gets |
|---|---|---|
| T3 | Desktop with a capable GPU | Everything, live post |
| T2 | Phones, low-memory or 4-core devices | Half counts, DPR ≤ 1.5, SD or portrait film, no post |
| T1 | No WebGL2, software GL, Save-Data | 2D/CSS versions, posters, stills instead of the film |
| T0 | Reduced motion or Proof mode | Static proof sheet |

| Budget | Target |
|---|---|
| First view (HTML, CSS, SVG, cover font subsets, core JS) | ≤ 180 KB gzip |
| three.js + cover view | about 140 KB gzip, after LCP |
| Each further view | 8–25 KB gzip |
| Images per section | ≤ 250 KB (AVIF/WebP, lazy, async decode) |
| Film | ≤ 5 / 2.5 / 3 MB; memory ≤ file size + 60 MB with no growth |
| VRAM | ≤ 200 MB on T3, ≤ 90 MB on T2 |
| JS heap | ≤ 40 MB |
| Web Vitals | LCP ≤ 2.0 s (mid-range phone on 4G), INP ≤ 150 ms, CLS ≤ 0.05; Lighthouse ≥ 90 |
| Runtime | Idle main thread < 1%; scrubbing < 15% at 4× throttle; ≥ 24 fps with lag ≤ 3 frames |

**Measurement**
- Every build runs the research's Playwright + CDP script plus Lighthouse CI.
- Real-device passes include a mid-range Android and an iPhone in Low Power Mode.
- Cookieless RUM collects web-vitals. The Info panel shows visitors the same numbers.

**Accessibility.** WCAG 2.2 AA in both themes; skip links; `scroll-padding` so focus never hides under rulers; `aria-hidden` canvases with DOM equivalents; 24 px targets; the Motion layer pauses everything; vertical text only for display and captions.

---

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Fabricated testimonials or metrics ship | `provenance` on every item; the build fails on `sample`; the layout works with two quotes |
| It becomes a Japanese motif theme park | One woodblock grammar and one chrome; one classical device per section; no sakura, torii, koi or Great Wave |
| ~2,600 vh tires recruiters | Express lane, Proof mode, one static takeaway line per section, Layers jumps, a film skip link, deep-linked case pages |
| Film lag on weak decoders | `-g 8`, single-flight seeks, automatic switch to SD, re-encode at `-g 4` if real devices lag more than 3 frames, and a stills tier |
| iOS Low Power Mode | First-tap probe, then a WebCodecs fallback. That rescue is unverified on a real device, so it goes in the test matrix; stills are the floor |
| CJK font weight | `&text=` subsets, per-language stacks, unicode-range body slices, cover-only preload |
| Shortcut clashes | Shift+Y / Shift+R alternatives; Ctrl/⌘+Y caught only while the page has focus; reload never blocked |
| GPU memory spikes | At most two live views, parked render targets freed, the governor, loops paused during the film |
| Time to trace the plates | Build the pipeline with automatic luminance layers first, then hand-refine (about two days) |
| Shōno is a dark print | Rest frame placed after the rain thins; key colour lifted during quantisation |
| Night mode and artworks | Prints are never inverted. They sit on a 紺 mat while the 3D scenes are relit |
| No View Transitions / scroll-driven CSS; SwiftShader-only testing | Instant swaps and GSAP fallback, no content depends on either; SwiftShader for correctness and capture only, tuning on real GPUs |
