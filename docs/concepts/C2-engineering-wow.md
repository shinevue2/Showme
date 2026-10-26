# C2 · 八版摺 MULTIPASS: concept proposal

Angle: engineering wow first. Builds on `docs/research/` and the image manifest. 2026-10-25.

## Name

| | |
|---|---|
| ja | **八版摺**(はっぱんずり): 八年を、八枚の版木で摺る |
| en | **MULTIPASS**: eight years, printed in eight blocks |
| zh | **八版套印**: 八年，八块版 |

## Thesis

An Edo colour print is a render pipeline three centuries early. The 絵師 writes the spec. The 彫師 compiles it into one block per colour. The 摺師 runs the blocks as passes, in order, on one sheet, and two notches called 見当 keep every pass in register. In that pipeline, bokashi is interpolation, 空摺 (blind embossing) is a normal map without ink, and 雲母摺 (mica) is a specular layer.

MULTIPASS treats a senior engineer's eight years the same way. Every section is one block, and every block is a real GPU pass. A small **progressive proof (試し摺)** in the corner gains one colour per section. By the end it is a finished print containing the visitor's own ink, and they can download it.

The editor around it borrows Illustrator's grammar: rulers, artboards, layers and outline mode. Japanese DTP still calls print-ready artwork 版下, the word an Edo carver used for the drawing pasted on the block. So *layer*, *block* and *pass* are one object shown three ways.

## Why nobody has done it

- **The motifs.** Our landscape research found no portfolio or award site using kentō, byōbu, kumiko, suminagashi or karesansui.
- **The vocabulary.** GPU engineers say *pass*, printmakers say *block* and designers say *layer*. No one has made these one inspectable interface.
- **The Chinese side.** Chinese multi-block printing (饾版) and embossing (拱花), from the Ten Bamboo Studio manuals of 1633–44, came before nishiki-e. The zh copy therefore tells the origin story rather than translating the Japanese.
- **The film** is rendered by the page's own engine, and a toggle proves it.

---

## Storyline: 序破急 in ten artboards

**Numbering** appears only where it is real information: the artboard index (the status bar reads "アートボード 4 / 10") and the block printing order (overprints depend on it).

**序 (slow; much empty space, 余白).** The visitor feels calm, and senses they are being noticed. They learn who this is in six seconds.

1. **Cover.** The page opens on paper, not a loader: a vertical name, the title, 8 years, three dated metrics and the express links, none of which wait for JavaScript. The crest constructs itself from compass circles. The visitor drops ink into a marbling bath, and scrolling lifts a washi sheet printed with their pattern and their name (**block 壱**). Lesson one: the site is exact and remembers you.
2. **Principles.** The bath drains, and the rings stay behind as raked gravel. Five stones are the principles. **Block 弐 adds only relief, no colour.**

**破 (density builds).** The visitor feels the craft building up. They learn the stack, the career and the depth of the work.

3. **Skills.** The rake lines rise into a kumiko lattice whose shadow becomes a system diagram (**block 参**).
4. **Career.** A push through one lattice opening hands off to the scroll film: seven Tōkaidō chapters, 2018→2026, and the ruler turns into years (**block 肆**).
5. **Works.** Gold clouds part on a six-panel folding screen of case studies (**block 伍**).

**急 (short, decisive, then stillness).** The visitor feels the work's authority. They learn the proof, the people, and the way to get in touch.

6. **Achievements.** The screen folds, a seal stamps across the seam (割印), and the metrics are carved and stamped (**block 陸**).
7. **Writing.** A gust from Hokusai's *Ejiri* lifts the papers. They land as a contribution calendar and a bookshelf (**block 漆**).
8. **Testimonials.** Colleagues' letters print in two plates that snap into register as violet. **Block 捌 is printed by other people.**
9. **Contact.** Through a crest noren: Hiroshige's Sanjō bridge, the end of the road. The proof is complete, and sending a message stamps the 落款.
10. **Colophon.** Credits, your visit's measured stats, and your impression to take home.

---

## Global frame: the 版下 editor

| Element | Desktop (≥1024 px) | Phone |
|---|---|---|
| Top bar | Crest, name, express links (作品 / 職歴書 PDF / 連絡), language, theme, 静読 quiet mode | crest, language, theme, menu |
| Rulers | Martian Mono. **The unit follows the artboard**: px; years in the film; 寸 with the carpenter's √2 裏目 on the kumiko; 尺 on the screen | year ticks in the film only |
| Layers = 版木一覧 | Right-edge colour bar of 8 swatches in printing order that fill as you go. Each has an eye (turns that view's motion off) and a jump link | colour-control strip along the bottom |
| Progressive proof | 120×176 px (ōban ratio). Opens an **exploded block stack** you can orbit, labelled with pass names and GPU ms | tap the strip |
| Status bar | `アートボード 4 / 10 · 霜降 2026-10-25 · JST 21:14` | hidden |
| Info panel (`I`) | `renderer.info` summed over views, frame ms against budget, DPR, tier, film seek ms, bytes | in the menu |

**Language.**
- **Switcher.** 日本語 · English · 中文, each in its own script. The active one is framed by L-shaped 鉤見当 marks rather than a pill or circle.
- **Pages.** Static `/ja/`, `/en/` and `/zh/` pages with `hreflang`. Switching keeps the reader's place.
- **What re-renders.** The stencil and seals re-carve. The name takes its local form (瀬 in ja, 濑 in zh).

**Day / night = 藍摺 / 石摺.** Night is a different printing technique, not dimmed day: 石摺 imitates a stone rubbing, pale lines on an inked indigo ground.
- **The switch.** An ichimonji-bokashi band wipes down the page: a View Transition mask driven by an `@property` gradient.
- **WebGL in step.** One shared `uNight` uniform tweens over the same 900 ms. Inks invert to gofun and mica, gold gains mica sparkle, and about 2,600 stars from the Yale Bright Star Catalogue (one `Points` draw) appear in the cover sky.
- **Default.** Follows `prefers-color-scheme`.

**Cursor.** There is no follower circle. The native cursor becomes an Illustrator-style tool where one applies: a dropper over the marbling bath, a rake over the sand, the direct-selection arrow on the lattice, a hand on the folding screen.

**Keys.**
- Ctrl/⌘+Y: outline mode. Every view goes wireframe, and images become crossed boxes labelled with their filenames.
- Ctrl/⌘+;: guides.
- `I`: Info panel.
- `F`: frame debugger. Passes are named in print terms (墨版, 空摺…) and timed with `EXT_disjoint_timer_query_webgl2` where the browser provides it.

### Tokens: day 藍摺 / night 月夜の石摺

Aizuri palette from the research. Ratios are WCAG contrast against `--artboard`.

| Token | Day | Night |
|---|---|---|
| `--pasteboard` | 白藍 WD `#C1E4E9` | 紺青 WD `#192F60` |
| `--artboard` | 卯の花 WD `#F7FCFE` | 紺 WD `#223A70` (luminance 0.045) |
| `--panel` | 藍白 WD `#EBF6F7` | 瑠璃紺 WD `#19448E` |
| `--ink` / `--ink-2` | 紺 NC `#0F2540` (14.95) / 藍鼠 NC `#566C73` (5.36) | 月白 WD `#EAF4FC` (9.88) / 瓶覗 NC `#A5DEE4` (7.43) |
| `--guide` / label | 浅葱 NC `#33A6B8` (decorative) / 藍 NC `#0D5661` (8.06) | 白群 NC `#78C2C4` (5.41) |
| `--select` | 躑躅 NC `#E03C8A` (UI); as text 牡丹 `#C1328E` (4.94) | 桃 NC `#F596AA` (5.15) |
| `--seal` / `--gilt` | 紅 NC `#CB1B45` (5.37) / 山吹 NC `#FFB11B` (fill only) | 鴇 NC `#EEA9A9` / 刈安 NC `#E9CD4C` |
| `--season` | solar-term accent (霜降 → 朽葉 NC `#E2943B`), status stamp only | same |

**Block colours** give each section its identity and double as its Layers swatch and selection colour.

| Block | Section | Day | Night |
|---|---|---|---|
| 壱 墨版 | Cover | 紺 `#0F2540` with 薄群青 `#5383C3` rings | 月白 |
| 弐 空摺 | Principles | relief only (swatch: hatched 胡粉 `#FFFFFB`; select 銀鼠 `#91989F`) | moonlit relief |
| 参 緑青 | Skills | malachite `#1A6343` (6.98) | 白緑 `#A8D8B9` (6.91) |
| 肆 ベロ藍 | Career | Prussian blue `#205C81` (6.98) | 瓶覗 |
| 伍 金 | Works | gold ground `#E1A441`, fill only (紺 ink on it 7.06) | 刈安 |
| 陸 朱 | Achievements | vermilion `#D84D3A` (4.03, large type only) | 鴇 |
| 漆 紅 | Writing | 一斥染 `#F4A7B9` fill / 牡丹 `#C1328E` text | 一斥染 (5.81) |
| 捌 薄藍 overprint | Testimonials | 薄群青 over 紅 makes 藤紫 `#8A6BBE`; text 二藍 `#70649A` (5.11) | 淡藤 `#BBC8E6` (6.56) |

**Borders.** 1 px `--guide` hairlines with 鉤見当 corners. No radius, shadow, glass or glow. Gradients appear only where they are physical: bokashi, mist, ink, gold.

### Type system

All families are verified on Google Fonts. Display faces ship as build-time `text=` subsets of 1.5–6 KB each. Body CJK fonts are self-hosted, subset to the glyphs in the content file.

| Role | ja | en | zh-Hans |
|---|---|---|---|
| Body | IBM Plex Sans JP 400/500 | IBM Plex Sans | Noto Sans SC 400/500 |
| Chrome | Martian Mono (`wdth` 100→112 with scroll speed) | Martian Mono | Martian Mono + Noto Sans SC |
| Cover | Shippori Mincho B1 800, vertical | Bodoni Moda italic | Noto Serif SC, wght 200→900; Ma Shan Zheng signature |
| Principles | Zen Old Mincho | Newsreader, light | Noto Serif SC 300 |
| Skills | DotGothic16 | Martian Mono + Handjet | ZCOOL QingKe HuangYou |
| Career | Zen Antique, vertical 詞書 | Big Shoulders | ZCOOL XiaoWei |
| Works | Dela Gothic One + Kaisei Tokumin 800 | Bricolage Grotesque | Noto Sans SC 900 |
| Achievements | Yuji Syuku; 大字 in Shippori | Gloock numerals | Zhi Mang Xing; 大写 in Noto Serif SC |
| Writing | Noto Serif JP (palt) | Schibsted Grotesk (a news publisher's face) | Noto Serif SC 400 |
| Testimonials | Klee One | Newsreader italic | Long Cang |
| Contact | Shippori Mincho B1 (rhymes with the cover) | Bodoni Moda | Noto Serif SC + Ma Shan Zheng |

Code uses IBM Plex Mono. **Unity** comes from the shared Martian Mono chrome, the hairline 見当 borders and one vertical 詞書 column device. The research's CJK rules apply (`auto-phrase`, `vpal`, 縦中横). Faces without vertical tables are never set vertically.

### Motion language

- **Signature: 見当合わせ.** Headings and images arrive as 2–3 colour plates, offset 2–4 px and up to 0.6°, then snap into register in 180 ms. This replaces split-letter staggers.
- **摺り reveal.** Images appear through a noise mask that sweeps in a baren's zig-zag. It is a CSS scroll-driven animation, so it runs off the main thread.
- **Tempo.** Easing follows 序破急: `linear(0, .03 15%, .10 35%, .35 60%, .60 80%, .85 93%, 1)`. Each artboard ends with a 間, a 15–25 vh pin in which one small thing happens. Micro motion takes 120–180 ms and section moves 600–1200 ms.
- **Direction.** Scene changes travel right to left, the way an emaki is read.
- **Scrolling.** Light Lenis 1.3.27 on the GSAP ticker; native on touch. No scroll-jacking.
- **Reduced motion** (or the 動 layer hidden) shows everything already printed, as stills.

---

## Section specs

**Persona.** One swappable trilingual content file. 早瀬 湊 / Minato Hayase / 早濑 凑, a Tokyo-based engineer since April 2018 who works across the web platform, rendering performance and distributed systems. Employers appear only as fictional descriptors.

### Artboard 1 · 序 Cover (block 壱 墨版)

**Content.** All DOM; this is the LCP element.
- Name, title and 8 years (縦中横), specialty.
- Availability: from January 2027, full-time or contract, remote first.
- Three dated metrics on guide rules: p99 checkout 820→190 ms (2022), infrastructure cost −38% (2021), MTTR 52→14 min (2023–24).

**Layout.** The name column runs vertically on the right in ja/zh, and as a horizontal Bodoni italic line at lower left in en. The bath fills the left 60%, and at least 38% of the page is left empty.

**Effect: closed-form suminagashi** (Lu & Jaffer 2012)
- The pattern lives in a ping-pong RGBA8 render target.
- **One drop is one full-screen pass** of the inverse map `P = C + (P′−C)·√(1 − r²/|P′−C|²)`. Drops alternate 墨 and clear surfactant, as in the real craft.
- Dragging makes a tine stroke: `P′ = P + (αλ/(d+λ))·M`.
- The bath is event-driven, so at rest only the display pass runs.
- The Info panel prints the op log. A `?seed=&ops=` share link reproduces the pattern exactly.
- Scrolling lowers a washi sheet with a vertex-shader peel. A stencil of the name, cut from a glyph SDF, masks the transfer, so the name lifts off as marbled letters.

**Images.** `hokusai/manga-perspective` is the 版下 underdrawing, shown in guides and outline mode. `night/cygnus-photograph` (an 1885 star plate) backs the night sky.

**Transition out: 紙上げ → 砂.** The sheet lifts and the bath drains. The marbling's luminance seeds the sand heightfield, so the visitor's own rings become raked rings, and stones settle where their drops fell.

**Fallback.** An AVIF poster (≈40 KB) of the default op list, rendered by the same engine, so the live view replaces it pixel for pixel. Under reduced motion the sheet is already printed.

### Artboard 2 · 間 Summary and principles (block 弐 空摺)

**Content.**
- A summary: whom he helps, how, and with what result.
- A fact sheet: Tokyo (JST) and overlap hours; languages (ja native, en professional, zh conversational); B.Eng. 2018; work authorisation; a "now" note.
- **Five principles, one per stone:**
  - 測ってから直す / measure before fixing
  - 境界は狭く、契約は明示 / narrow boundaries, explicit contracts
  - 失敗の半径を小さく / small blast radius
  - 読み手のために書く / write for the reader
  - チームも設計対象 / teams are architecture too

**Effect: raked gravel**
- **Gravel.** Cool grey 白川砂 granite, never beige. The surface is a height function: straight rows plus analytic rings around each stone.
- **Rendering.** Raymarched inside a proxy box only, with a low sun, cavity darkening and analytic shadows.
- **Raking.** The rake cursor writes into a 512² trail render target, and the strokes become parallel grooves.
- **Stones.** Focus ripples a stone's rings and opens its caption.
- In the proof, block 弐 is a normal map lit by the pointer, or by the gyro on phones: **principles are felt, not seen.**

**Images.** `landscape/soami-landscape` beside the summary; `ukie/hokusai-niomon-perspective` (Hokusai learning a foreign method) beside the line on learning.

**Transition out: rake → grid.** The grooves straighten to exactly the kumiko strip pitch, the camera tilts to top-down, and the grooves extrude into strips.

**Fallback.** A baked AVIF of the garden. The stones stay as DOM buttons.

### Artboard 3 · 技 Skills and architecture (block 参 緑青)

**Content.** Four domains, each with years in production and the scale reached. No percentage bars. Each domain is also a region of the lattice, built in its own kumiko pattern:

| Domain | Technologies | Kumiko pattern |
|---|---|---|
| Backend and distributed systems | Go, Kotlin, PostgreSQL, Kafka, gRPC | 角麻の葉 (square grid) |
| Web platform | TypeScript, React, WebGL/three.js, Web Vitals | 麻の葉 (flexible hexagons) |
| Infra and reliability | Kubernetes, Terraform, AWS/GCP, OpenTelemetry, SLOs | 七宝 (interlocked rings = redundancy) |
| Practice | RFCs, review, incident command, mentoring | 青海波 (rows of people) |

Below the lattice, a five-step walkthrough of the payments ledger design: request path → idempotency keys → transactional outbox → event bus → read models.

**Effect: instanced kumiko**
- **Strips.** Each strip is one technology. Its length is years of use, and its joint count is the number of projects that used it.
- **Assembly.** One instanced draw. Assembly runs from a single `uProgress`, injected via `onBeforeCompile` with a `customProgramCacheKey` and normals patched in `beginnormal_vertex`.
- **Selection.** Selecting a strip lights its graph neighbours (a per-instance adjacency bitmask) and shows a readout such as "PostgreSQL — 7年 — 3社 — 最大 4 TB".
- **Shadow → diagram.** A second draw flattens the instances onto the paper with a planar projection matrix, so no shadow map is needed. As the light rotates, the shadow resolves into the ledger diagram, then a DOM SVG takes over at the same coordinates.

**Images.** `hokusai/manga-pattern-construction` (Hokusai showing how to draw asanoha) is the section plate. `pattern/stencil-asanoha` and `stencil-sayagata` become thresholded masks. `hokusai/manga-pagoda-roof` sits beside the resilience note (the pagoda's 心柱).

**Transition out: through the lattice.** The camera pushes through one 麻の葉 opening. Film frame 0 is rendered by the same engine from the same camera, so the hand-off from live render to `<video>` has no visible seam.

**Fallback.** A stroke-dash SVG lattice and SVG diagrams.

### Artboard 4 · 道 Career: the scroll film (block 肆 ベロ藍)

**Layout.** 800lvh of scroll (see *The scroll film*). For skimmers, a DOM career table (role, company, dates, scope, promotions) and a "skip the film" link sit in normal flow.

### Artboard 5 · 屏 Works and case studies (block 伍 金)

**Content: a 六曲一隻 screen.** Panels are counted from the right and read right to left; this is the traditional order and real information.

| Panel | Case study |
|---|---|
| 第一扇 | Zero-downtime ledger split (dual writes, shadow reads, 11 weeks) |
| 第二扇 | API gateway and platform for 40 teams |
| 第三扇 | SLO and error-budget programme |
| 第四扇 | WebGL map renderer: 24→60 fps, memory −58% |
| 第五扇 | OSS scroll-to-media-time controller |
| 第六扇 | This site: pipeline, budgets, measurements |

**Case-study pages** are static and follow the format of sangaku tablets: 問 problem → constraints → role → 術 method and trade-offs → 答 result with numbers → 反省 lessons.

**Effect: the folding screen**
- **Panels.** Zig-zag panels with flat normals from `dFdx`/`dFdy`. Scrolling opens the fold.
- **Gold leaf.** 箔足 overlap seams, per-leaf tilt, Ward anisotropy lit from the cursor, Fresnel, and worn patches that reveal the 弁柄 ground. No bloom.
- **Text.** Panel text is DOM, placed with a per-panel `matrix3d` that is recomputed only while the screen is folding.
- **Opening a case study.** Clicking a panel morphs it into the case-study header through a View Transition.

**Images.** `rinpa/korin-irises-yatsuhashi` (itself a pair of six-panel screens) is the base art, faded under the diagrams. `rinpa/fans-upon-waves` is on the index page, and `ukie/toyoharu-kabuki-perspective` heads each case study.

**Transition out: 割印.** The screen folds shut, and a seal stone stamps across the boundary, leaving half the impression on each artboard.

**Fallback.** A right-to-left scroll-snap strip of six flat panels.

### Artboard 6 · 証 Achievements and reliability (block 陸 朱)

**Content.**
- **Six dated metrics:** p99 820→190 ms (2022); cost −38% (2021); deploys 2/week → 30/day (2020→22); MTTR 52→14 min (2023–24); renderer 24→60 fps (2025); 9 mentored, 4 promoted (2019–26).
- **Reliability record:** SLO 99.95% held in 11 of 12 quarters; 23 incidents commanded, 3 of them Sev-1; on-call pages −45%.

**Effect: seal stones**
- **Carving.** Raymarched SDF stones. The carving depth is a distance field of the numerals, built on the GPU by **jump flooding** (10 passes at 512²).
- **Switching language re-carves the seals:** 壱百九拾 (ja), 壹佰玖拾 (zh), Gloock "190" (en).
- **The carving encodes the direction of change:** numbers that went up are carved 朱文 (raised), numbers that went down 白文 (incised). A side inscription (側款) gives the date and context.
- **Printing.** Scrolling presses each stone onto the paper, with pressure variance and nijimi bleed. Every number also exists as DOM text.

**Images.** `hokusai/red-fuji` opens the section. `hokusai/shower-below-summit` (calm summit, storm below) sits beside the reliability record.

**Transition out: 江尻の風.** A gust lifts the impressions as paper slips.

**Fallback.** Pre-rendered AVIF impressions for each language.

### Artboard 7 · 文 Writing, talks and OSS (block 漆 紅)

**Content.** Five articles, three talks and repositories with star counts, all from the content file.

**Effect: GPGPU paper**
- `GPUComputationRenderer` with curl-noise wind and a spring pulling each scrap toward a staggered target.
- The scraps settle into a **52×7 contribution calendar**, where each cell's density is that day's real commit count. Hovering a week lists its commits in DOM.
- The simulation sleeps once a residual check shows it has settled.
- Articles stand as vertical spines on a shelf drawn after `writing/gakutei-book-cart`.

**Images.** `writing/gakutei-brush`, `gakutei-paper`, `gakutei-spider-web` (web posts); `hokusai/ejiri-wind` for the transition.

**Transition out.** The slips fold into letters.

**Fallback.** An SVG calendar.

### Artboard 8 · 声 Testimonials and leadership (block 捌 overprint)

**Content.**
- Three quotes, from a manager, a peer and a report.
- Leadership: 9 mentees, 120+ interviews, an onboarding guide used by 60 engineers, and the RFC process he founded.

**Effect (2D).**
- Each quote prints as two aria-hidden plates, 紅 then 薄藍, with `mix-blend-mode: multiply` by day.
- The plates arrive misregistered by 3 px and 0.4° and snap into 見当 at the reading line.
- They then give way to a single accessible DOM text in 二藍.

**Images.** `writing/hokkei-first-writing` is the plate behind the letters. `pattern/korin-designs-stream`, vectorised, is the divider.

**Transition out: 暖簾をくぐる,** stepping through a noren.

**Fallback.** The text appears already printed.

### Artboard 9 · 結 Contact and CV (no new block: the print is complete)

**Content.**
- Availability; email with a copy button; GitHub; LinkedIn; JST overlap hours.
- **Résumé PDFs in ja, en and zh,** printed at build time by Playwright from the same content file.
- `mailto:` is the primary path. A form appears only if an endpoint is configured.

**Effect: noren**
- CPU Verlet cloth: 540 particles × 4 iterations, under 0.15 ms per frame.
- Three slits and the dyed crest. Scroll pushes a virtual body through the curtain, and the cursor parts it.
- Behind it: `tokaido/55-kyoto`, the Sanjō bridge, with 「京に着く。旅の終わりではなく、次の依頼の始まり。」
- Sending a message, or pressing 押印, stamps the 落款 on the finished proof, which then lifts into the colophon.

**Fallback.** SVG noren halves that slide apart on hover or focus.

### Artboard 10 · 奥付 Colophon

**Credits.** Each image's manifest `creditText`, linked to its `objectUrl`, in all three languages. All are CC0; no endorsement is implied. Also font licences, three.js r186, GSAP 3.15 and Lenis 1.3.27.

**Your visit.** Frames, peak draw calls, bytes, LCP/INP and tier, measured locally and never sent.

**Your impression.** A 2480×3648 PNG of the visitor's proof: their marbling ops, rake strokes, date and solar term.

**404 page.** `writing/gakutei-spider-web` with 「この糸の先には、まだ何も無い。」

---

## The scroll film

**What it depicts.** One continuous camera journey along a procedural Tōkaidō, rendered by our **woodblock-style non-photorealistic (NPR) engine**:
- flat 4-step pigment ramps;
- Sobel keylines from depth and normals;
- an ichimonji-bokashi sky;
- 霞 mist cards, which hide the seams between sets exactly the way emaki change scenes, and compress well.

The sets are SVG silhouettes, traced from each print's composition and extruded. One small traveller in a sugegasa appears in every chapter (異時同図法). Each caption carries the real Hiroshige print as its 絵, with credit.

| Chapter | Year | Station (file) | Rest frame | Story | Move to next |
|---|---|---|---|---|---|
| frame 0 | | | 麻の葉 window, identical to the live lattice | | dolly through |
| 一 | 2018 | 日本橋 (`01-nihonbashi`) | bridge arch lower left, dawn bokashi | first job, payments backend; the procession = transactions | pan right→left |
| 二 | 2019 | 三島 朝霧 (`12-mishima`) | three fog planes, no torii | greenfield dashboard built in fog | mist card |
| 三 | 2020 | 箱根 (`11-hakone`) | patchwork mountain, each facet a service | monolith → services | rise over the pass |
| 四 | 2021 | 島田 (`24-shimada`) | bird's-eye river, porters carrying travellers | tech lead of five | high crane |
| 五 | 2022 | 岡崎 矢作橋 (`39-okazaki`) | long bridge of instanced segments | gateway for 40 teams; p99 820→190 ms | track along bridge |
| 六 | 2023 | 庄野 白雨 (`46-shono`) | slope, bending bamboo; rain is an **SVG overlay**, not in the video | incident command, 47-minute outage | gust, mist |
| 七 | 2024–25 | 原 (`14-hara`) | Fuji pierces the top: the DOM frame line is masked where the peak crosses it | 3D mapping; 24→60 fps | gold clouds; the last frame is the screen's first |

**Production.**
- **Deterministic capture.** `capture.html?frame=n` uses seeded randomness, awaits fonts and textures, and precompiles shaders.
- **Frame transport.** Playwright on headless SwiftShader pulls batches of 8 PNGs into `ffmpeg -f image2pipe`.
- **Two cuts.** 480 landscape frames (16 s at 30 fps) and 384 portrait frames (24 fps), the portrait set rendered from **its own camera path**. Each cut takes a few minutes.
- **Grain.** Washi grain is a static overlay, never baked into the video.

**Encoding** (measured research).

| File | Format | Budget |
|---|---|---|
| `film-hd` | 1280×720 @30, CRF 23 | ≤5 MB |
| `film-sd` | 960×540, CRF 24 | ≤2.5 MB |
| `film-portrait` | 720×1280 @24, CRF 25 | ≤3 MB |

All files: H.264 High `yuv420p` BT.709, `-g 8 -keyint_min 8 -bf 0 -sc_threshold 0 -preset slow`, `-force_key_frames` at the seven rest times, `+faststart`, no audio. Chapter stills (≤80 KB) are extracted from the encoded MP4, so each poster matches its frame exactly.

**Player** (as specified in `video-scrub.md`).
- **Element.** One paused `<video preload="none">` in a `position: sticky` 100lvh stage, with `overflow: clip` ancestors and no filter or mask on the video itself.
- **Loading.** The file is fetched whole as a Blob and played from `createObjectURL`. A `<picture>` poster fades out after `seeked` plus one `requestVideoFrameCallback`.
- **Scrubbing.** ScrollTrigger supplies progress only. A 2049-entry lookup table holds each rest frame for 30–55% of its chapter and smoothsteps between them. Targets are quantised to frame midpoints.
- **The rule that matters most:** never seek while `video.seeking` is true. Keep only the newest target and issue it from `seeked`.
- **Idle and fallback.** rAF runs only while the target and the shown frame differ. A mean seek time over 66 ms drops playback to `film-sd`.
- **Captions and night.** Captions use CSS scroll-driven animations. Night mode lays an indigo veil over the film, so no second film is needed.
- **Tiers:**
  - reduced motion: stills in normal flow;
  - Save-Data, 2G, an error or a 10 s timeout: crossfading stills;
  - iOS Low Power Mode with `VideoDecoder` available: WebCodecs canvas;
  - portrait phones: `film-portrait`;
  - weak devices: `film-sd`;
  - everyone else: `film-hd`.
- **Every other three.js loop pauses while the film is active.**
- **生 / 版 toggle (high tier only).** The video pauses and the live NPR scene renders at `frameIndex/30` s. The Info panel shows "seek 36 ms" beside "live 11.8 ms/frame".

---

## Performance architecture and budget

**Stage.**
- **Renderer.** One fixed `WebGLRenderer` (WebGL2 + GLSL).
- **Views.** Each artboard registers a view with its rect, scene, camera and poster. The viewport covers the whole element; the scissor covers only the visible part.
- **Warming and parking.** Views warm 150% of a screen ahead (dynamic `import()`, `compileAsync`). Parked views free their render targets and keep their programs.
- **Shared state.** One `THREE.Timer`, shared uniform objects, and one combined post pass with no composer chain.
- **Idle.** The loop stops when nothing visible is animating; Lenis runs inside it.
- **Context loss.** Posters show, and the simulations re-seed deterministically.

**Adaptive quality.** The starting tier comes from the renderer string (SwiftShader and llvmpipe are detected), `deviceMemory`, core count, pointer type and Save-Data. A governor lowers DPR first and the tier second, and recovers after 8 s. Counts change through uniforms and draw ranges, never `#define`, so changing tier never recompiles a shader.

| | High | Medium | Low / phone | Software |
|---|---|---|---|---|
| Marbling | 1536² + spread | 1024² + spread | 768² | baked + single passes |
| Sand steps | 96 | 64 | 40 at half res | 24 |
| Kumiko | 12k | 5k | 2k | 800 merged |
| Particles | 256² | 128² | 64² | off |
| Film | hd | hd/sd | portrait/sd | sd |

| Budget | Target |
|---|---|
| First view | ≤150 KB gzip, with ≤15 KB of JS before LCP |
| Idle JS | Lenis + GSAP ≈50 KB; three + stage ≈150 KB; 6–25 KB per view |
| Web Vitals | LCP ≤2.0 s, INP ≤150 ms, CLS ≤0.05; Lighthouse ≥90 |
| GPU | ≤3 live views, 8–20 draw calls, VRAM ≤200 MB (≤100 MB on phones), DPR ≤2 (≤1.5 on phones) |
| Film | file + ≤60 MB RAM, flat while scrubbing; ≥24 fps, mean lag ≤3 frames |
| Main thread | <1% idle; <15% scrubbing at 4× throttle |
| Fonts / images | body ≤300 KB per language; 1280 px AVIF ≤120 KB |

**Verification.** CI runs the research's Playwright + CDP script, Lighthouse, and shader compile checks. Manual testing includes an iPhone in Low Power Mode.

**Accessibility.**
- Every canvas is `aria-hidden` and has a DOM equivalent.
- Skip link; focus shown as 見当 corners.
- A pause control for any motion longer than 5 s, and no flashes.
- Targets of at least 24 px, both themes contrast-checked, and correct `lang` attributes.

---

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Effects feel like a pile of demos | One idea ties them together (block = pass = layer), with one post pass, one block palette and the accumulating proof. Each effect owns one artboard. |
| Recruiters get lost | Every fact is in the DOM first: express links, quiet mode, the career table, CV PDFs. |
| Japanese clichés | No sakura, Great Wave, red sun, koi or ensō. Mishima's torii is left out, and Fuji appears only in Hiroshige's frame-breaking composition. Grey gravel, not beige. |
| "AI look" | No cards, radii, shadows, glow, purple gradients, Inter or Space Grotesk. Numbering appears only where order is real: artboard index, printing order, panels counted from the right, stations, years. |
| Low-end devices | Quality tiers, a governor, matching posters, ≤3 live views, and an idle loop that sleeps. |
| iOS video quirks | Blob player, `play()` probe, WebCodecs fallback, stills after a 10 s timeout. |
| Film production effort | Simple silhouette sets plus mist cards; a deterministic re-render takes minutes. |
| Persona authenticity | Demonstration copy lives in one file. Metrics, repositories and quotes must be real before launch, and quotes marked `verified:false` are not rendered. No real employers are named. |
| three.js r186 pitfalls | Set `rt.viewport` directly, mutate uniform `.value`, include `colorspace_fragment`. |
