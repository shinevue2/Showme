# C1 · 八度摺 — Eight Impressions — 八版套印

*Concept proposal C1, narrative and culture first. 2026-10-25 (霜降). Builds on `docs/research/*` and `assets-src/images/manifest.json`.*

## 1. Name, thesis, novelty

| | Title | Subtitle |
|---|---|---|
| ja | **八度摺**（はちどずり） | 版を重ねる — 一年に一版、八年で一枚の錦絵 |
| en | **Eight Impressions** | A career printed one block at a time |
| zh | **八版套印** | 一年一版，八年套成一幅锦绘 |

**Thesis.** The site tells an eight-year engineering career as the making of one *nishiki-e*, a colour woodblock print pulled from several blocks. An Edo print workshop was, in structure, a software organisation. A publisher carried the risk. A designer's drawing was destroyed in the act of building it. Carvers split the work into blocks, and printers pulled hundreds of identical impressions. Registration notches made independent parts line up, a censor's seal came before anything shipped, and there were editions, worn blocks and patches. A senior engineer has sat in every one of those chairs. So the page prints itself as you read. It starts as one indigo key line on cool paper. Each career year adds one colour block, and the visitor's last act, pressing a seal, finishes the print. Scroll position, printing pass and career year are the same number. The idiom 版を重ねる means "to run to many editions", in other words lasting success. Literally, it means "to stack the blocks".

**The isomorphism the site is built on**

| Edo workshop | Software | Section |
|---|---|---|
| 版下絵: the drawing is pasted face-down and destroyed by carving | Design doc that dissolves into code | About |
| 校合摺: key-block proofs, each marked with one colour area | Specs and principles | Principles |
| 活字 movable type vs 版木 carved block | Reuse vs bespoke | Skills |
| 摺: identical impressions from the same blocks | Reproducible builds and deploys | Film |
| 見当: two notches per block so every pass registers | Interfaces and contracts | Borders and transitions |
| 改印 censor seal · 初摺/後摺 editions · 入木 inlay patch | Review · releases and tech debt · hotfix | Works |
| 空摺: blind embossing, seen only in raking light | Reliability | Achievements |
| 石摺: the same blocks in different inks | Theme tokens | Day and night |
| 奥付: the colophon, mandatory from the 1722 Kyōhō edict | Credits and build info | Footer |

**Why it is new**

- **No precedent, and process rather than wallpaper.** The research found no portfolio built on kentō, byōbu or suminagashi. Online, ukiyo-e is used as wallpaper; here the *process* is the information architecture.
- **The stylesheet is the separations, and the palette is cumulative.** Every plate is a CSS custom property that the Separations panel really toggles. In the film, the number of colours is elapsed career time.
- **Each language has its own heritage.**
  - zh: 毕昇 and 王祯's movable type, and the 十竹斋 albums' 饾版 colour printing with 拱花 embossing, which is karazuri's ancestor.
  - ja: the woodblock.
  - en: "impression" means both a pulled print and the mark a person leaves.

## 2. Storyline: 序破急 in ink

**Anchoring fact.** On a north-up map the Tōkaidō runs right to left, from Edo to Kyoto, the same direction an emaki unrolls. So the career map, the byōbu and the film camera all move leftwards.

| Tempo | Sections | Colour state | Visitor feels | Visitor learns |
|---|---|---|---|---|
| **序** | Hero, About, Principles, Skills | Workshop colours only: paper, indigo key line, cyan guides, vermilion notes, cherry wood | Calm, curiosity; one quiet shock (the hero was a mirror of something carved) | Who, level, specialty, method, tools |
| **破** | Film (7 chapters), Works | One plate per year arrives slightly misregistered and snaps into place; gold last | Momentum, colour flooding in | The eight-year path with scope and outcomes; six case studies |
| **急** | Achievements, Writing, Testimonials, Contact, Colophon | Decisive contrasts: one-ink ranking sheet, inkless emboss, many-coloured marbling, metallic surimono, one red seal | Conviction, delight, invitation | Numbers, voice, peers, how to hire, how it was built |

**Persistent thread.** A thumbnail of "today's print" in the Separations panel gains each plate as the visitor passes it.
- At the colophon it appears full size and can be saved.
- It carries that visitor's misregistration seed, marbling and seal pressure, so every visit is a different impression.

## 3. Global frame

### 3.1 The workbench (why an Illustrator frame)

Illustrator is the modern 版下, and prepress then and now is the same craft: separation into plates. So the chrome is a print-prep workbench, not a costume.

- **Rulers** (Martian Mono, top and left).
  - Units toggle px ↔ **寸**, the unit of the Edo 大判 sheet (≈39 × 26.5 cm).
  - During the film the left ruler reads **2018 → 2026**, so scroll, video time and career time align.
- **Right panel**, with Illustrator's two tabs:
  - **レイヤー / Layers / 图层** is the table of contents. Each section is a layer with an eye toggle. Swatches follow Illustrator's real layer-colour cycle mapped to traditional colours (薄群青, 韓紅, 若竹, 瑠璃, 躑躅, 浅葱, 刈安, 鈍, 墨, 黄丹, 松葉). That colour is used only for the active artboard's 8-handle bounding box. Hiding the "motion" layer turns on quiet mode.
  - **分版 / Separations / 分色** lists the eight career plates. Here 壱–捌 is real information: printing order and year. Each row has a swatch, a name with ruby and an eye; hiding a plate removes that ink site-wide. Rows stay blank until the visitor has passed them.
  - On phones the panel is a bottom sheet.
- **Info panel** (F8 or `i`): pointer X/Y in px and 寸, the artboard, frame ms, draw calls, tier, video frame (`f 212/480`), seek latency, bytes, LCP and INP, plus the current 節気 and a JST clock.
- **版下表示 keyline view** (Ctrl/⌘+Y, `y`, or a toolbar button). Plates hide, text becomes 0.5 px strokes, images swap to line versions and 3D views render edges only. This is Illustrator's Outline mode, and literally what a key block is.
- **Kentō marks instead of card borders.**
  - Every artboard has an L-shaped 鉤見当 at lower right, a straight 引付見当 on the same edge, and 日本式トンボ crop marks.
  - Focus rings are the same two marks in `--select`.
  - No rounded corners and no shadows anywhere.
- **Selection labels and running heads.** A hovered figure gets a bounding box labelled like `Dela Gothic One 400 · 128px · 紺 #0F2540`. A vertical 柱 in the margin gives the stage and a real leaf number (丁付).
- **Express lane.** The fixed header carries 作品 Works, 履歴書 Résumé (PDF per language), 連絡 Contact and "skip the film". Every section opens with a one-line takeaway that never waits on animation.

### 3.2 Language, theme, cursor

**Language: a revolving type wheel.** A 40 px SVG after 王祯's 转轮排字架, with sectors labelled 日本語 · English · 简体中文.
- Hover or focus prefetches that language's fonts.
- On select, the wheel turns 120° while fonts resolve, so the spinner *is* the font loader. Then text re-sets line by line with a 2 px "sort drop" (400 ms total).
- The URL moves to `/ja/`, `/en/` or `/zh/`.

**Day ⇄ night is 本摺 ⇄ 石摺 *ishizuri*.** 石摺 is a real Edo genre that imitated Chinese stone rubbings (拓本): pale lines on a deep ground, the same blocks in different inks.
- Labels: 「本摺 ⇄ 石摺」 / "Brocade ⇄ Stone rubbing" / 「套色 ⇄ 拓印」.
- The switch is a View Transition with a zig-zag clip-path in the shape of baren strokes.
- Default follows `prefers-color-scheme`.
- The night ground is saturated indigo with luminance ≥0.045, never grey-black.

**Cursor.** No follower circle. Plain CSS `image-set()` tool cursors with no JS lag: the system arrow by default, then 彫刻刀 (gouge) on carvable surfaces, 馬連 (baren) on paper, 筆 (brush) on the marbling and 印 on the seal.

### 3.3 Tokens

Research palette A (藍摺). In aizuri-e even the key block was printed in indigo, which licenses 紺 as our "sumi". Sources: NC = nipponcolors.com, WD = colordic.org; contrast is measured against `--paper`.

| Token | 本摺 day | 石摺 night |
|---|---|---|
| `--pasteboard` | 白藍 WD #C1E4E9 | 紺青 WD #192F60 |
| `--paper` | 卯の花 WD #F7FCFE | 紺 WD #223A70 |
| `--panel` | 藍白 WD #EBF6F7 | 瑠璃紺 WD #19448E |
| `--ink` (主版) | 紺 NC #0F2540 (14.95:1) | 月白 WD #EAF4FC (9.88) |
| `--ink-2` | 藍鼠 NC #566C73 (5.36) | 瓶覗 NC #A5DEE4 (7.43) |
| `--link` | 縹 NC #006284 (6.59) | 白藍 #C1E4E9 (8.15) |
| `--guide` / label | 浅葱 NC #33A6B8 / 藍 NC #0D5661 (8.06) | 白群 NC #78C2C4 (5.41) |
| `--select` | 躑躅 #E03C8A; text 牡丹 #C1328E (4.94) | 桃 NC #F596AA (5.15) |
| `--instruct` (designer's 朱) | 朱 WD #EB6101 fill; text 銀朱 #C73E3A (4.86) | 一斥染 NC #F4A7B9 (5.81) |
| `--seal` (once per artboard) | 紅 NC #CB1B45 (5.37) | 鴇 NC #EEA9A9 (5.71) |

**The eight plates** (fill / text-safe ink):

| Plate | Year · station | Day | Night |
|---|---|---|---|
| 壱 主版 | 2018 日本橋 | 紺 #0F2540 | 月白 #EAF4FC |
| 弐 | 2019 箱根 | 若竹 #5DAC81 / 鉄 #26453D (10.15) | 白緑 #A8D8B9 (6.91) |
| 参 | 2020 三島 | 銀鼠 #91989F / 藍鼠 #566C73 | 銀鼠 WD #AFAFB0 (5.02) |
| 肆 | 2021 原 | 一斥染 #F4A7B9 / 臙脂 #9F353A (6.67) | 一斥染 (5.81) |
| 伍 | 2022 島田 | 瓶覗 #A5DEE4 / 縹 #006284 | 瓶覗 (7.43) |
| 陸 | 2023 岡崎 | ベロ藍 #205C81, sampled from the prints (6.98) | 群青 NC #51A8DD (large text) |
| 漆 | 2024 庄野 | 鈍 #656765, as a bokashi (5.52) | 薄墨 #A3A3A2 (large text) |
| 捌 | 2025–26 京師 | 金 山吹 #FFB11B, never as text | 刈安 #E9CD4C (6.97) |

Gold goes on last, as metallics always did. The 二十四節気 appears only as a date stamp. The colophon is dated 「令和八年 霜降 摺」, the way Edo colophons gave era and season.

### 3.4 Type (all families verified on Google Fonts in the research)

**Base faces**
- Body: ja IBM Plex Sans JP · en IBM Plex Sans · zh Noto Sans SC.
- Chrome: Martian Mono; its `wdth` axis follows scroll velocity.
- Code: IBM Plex Mono.

**Display faces, one voice per section**

| Section | ja | en | zh |
|---|---|---|---|
| Hero | Shippori Mincho B1 800, vertical | Bodoni Moda italic; `wght` = baren pressure | Noto Serif SC; `wght` 200→900 = pressure |
| About | Zen Old Mincho | Newsreader 300, opsz 72 | Noto Serif SC 300 |
| Principles | Yuji Syuku (朱 notes) | Gloock (wedges read as chisel cuts) | Zhi Mang Xing |
| Skills | New Tegomin on 3D sorts; DotGothic16 counters | Big Shoulders 800 on sorts; Martian Mono, Handjet counters | Noto Serif SC 600 on sorts; ZCOOL QingKe HuangYou |
| Film | Zen Antique, vertical 詞書 | Anybody: `wdth` follows travel speed | ZCOOL XiaoWei (horizontal); Noto Serif SC for vertical |
| Works | Dela Gothic One; Shippori Antique B1 for 問術答 | Bricolage Grotesque (wdth 75) | Noto Sans SC 900 |
| Achievements | Kaisei Tokumin 800; 大字 in Shippori B1 | Big Shoulders 800 | Noto Serif SC 900, 大写 |
| Writing | Yuji Mai | Newsreader italic | Ma Shan Zheng (horizontal only) |
| Testimonials | Hina Mincho | Familjen Grotesk; Gloock names | Noto Serif SC; Zhi Mang Xing signatures |
| Contact | Klee One 600 | Bodoni Moda italic (bookends the hero) | Long Cang |
| Colophon | Zen Old Mincho; 大尾 in Shippori B1 | IBM Plex Mono | Noto Serif SC |

**Rules**
- Font stacks are strictly per `:lang()`, because coverage gaps run both ways.
- ja and zh display faces ship as build-time `&text=` subsets (≈2–6 KB each, ≤50 KB per language).
- Body slices load only for the active language.
- Faces without `palt` get manual tracking.
- ZCOOL, Ma Shan Zheng and Zhi Mang Xing are never set vertically.

### 3.5 Motion language

- **Materials only.** Things move like paper, wood, ink, water or stone. Nothing floats, glows or glitches.
- **Registration snap.** A plate arrives 2–6 px and ≤0.3° off, then settles with one damped overshoot (spring k 380, c 24) over ~420 ms.
- **序破急 easing.** `linear(0,.03 15%,.10 35%,.35 60%,.60 80%,.85 93%,1)`. Durations are 900–1400 ms (jo), 400–700 ms (ha) and 180–300 ms (kyū).
- **間.** A 15–25 vh pause after each section in which exactly one small thing happens.
- **Split-letter motion only twice:** the language re-set and the sort drop.
- **Reduced motion.** Plates arrive already registered, there is no smooth scroll, and the film becomes stills.

## 4. Sections

### 摺上り The Impression — Hero

**Takeaway.** 瀬川 湊 · Senior Software Engineer · 8 years · distributed systems and developer platforms · Tokyo (JST). The persona is fictional and swappable from one content file. 湊 is glossed in the 說文 as 「水上人所會也」, "where people on the water gather" (verify): a quiet nod to platform work.

**Layout.** A 横大判 artboard (1:1.47) on desktop, 縦大判 on phones.
- The name is vertical at right, with ruby, and the title is a second column. Location, availability (from 2027-01) and express links sit bottom left.
- The crest 「丸に違い見当」 (two kentō L-marks in a ring, built from circles) sits top left and is also the favicon.
- **One continuous indigo key line** runs right to left, 日本橋 → 京師, with eight ticks labelled 2018…2026. The career is mapped before it is told.

**Effect: carved woodblock (3D family 1).**
- Frame 0 is DOM and SVG (the LCP). The WebGL view mounts beneath it at idle, pixel-identical at rest.
- From 40 to 100 vh the sheet peels from its lower-right corner, as printers lift prints: a vertex-shader curl with mirrored show-through on the back.
- Beneath is a yamazakura cherry block carved **in mirror image**: a jump-flood SDF heightfield with V-cut walls, anisotropic grain, and indigo only on the raised faces.
- The camera tilts to raking light. Caption: 「表は、彫られた裏の鏡像である」 / "Every interface is the mirror of what was carved beneath it" / 「每个界面，都是其下所刻之物的镜像」.
- **Easter egg.** The Type tool (T) carves and prints the visitor's own name as a PNG dated 令和八年霜降, shareable via `?carve=`.

**Transition out: 版木返し.** Blocks are carved on both sides. This one flips on its long axis, and the 版下 pasted on its back lands exactly on the About artboard rect.

**Fallback.** A pre-rendered AVIF of the block with a CSS two-face peel. Under reduced motion, print and block sit side by side.

### 版下 The Drawing — About / summary

**Content.**
- Three short paragraphs: who I help, how, and the result.
- Facts:
  - 8 years, 3 employers, domains;
  - spoken languages: ja native, en professional, zh HSK 5 (this justifies the trilingual site);
  - education;
  - a "now" note.

**Layout.** A wahon spread inside a 匡郭 with 子持ち罫 (thick-thin double rule). The fold is a 版心 with a 魚尾 mark, furniture Japanese and Chinese books share, carrying the title and leaf number. ja runs vertically; en and zh run horizontally.

**Effect (2D).** The line drawing plays in stroke order. Illustrator anchors and handles pop with magenta smart-guide labels ("anchor", "intersect", 「消点」).

**Image.** `hokusai/manga-perspective.jpg` develops through a falling threshold mask, like ink soaking in, with cyan guides drawn over its vanishing lines. Caption: "He diagrammed the vanishing point two centuries ago; I still start on a grid."

**Transition out: 彫り払い (chisel clearing).** Gouge-shaped mask strokes cut the drawing away and reveal the proofs. This is historically true, since the hanshita never survives carving, and it is the site's thesis about design docs.

**Fallback.** Static spread.

### 校合摺 The Proofs — Principles / strengths

**Content.** Six principles, each a 朱 margin note on one proof:

| Principle | Meaning |
|---|---|
| Measure before you cut | Benchmarks and traces first |
| Small blocks, many passes | Incremental delivery |
| Registration over brilliance | Contracts outrank clever parts |
| Leave the block re-printable | Automate and document so others can print without you |
| Carve the 毛割 yourself | Seniors take the hardest hair-line work, as the 頭彫 did, then teach it |
| Paper first | Respect the user's data and time |

**Layout.** Six identical proofs of the hero key line in an asymmetric 3×2 contact sheet. The sheets are thin (8% show-through), deckled by SVG mask, with no shadows. On phones they stack vertically.

**Effect (2D).** As each proof enters, a brush mask hatches one region in 朱. Finally the six fold into one sheet showing every colour area: a preview of the film's plates.

**Transition out: 文字落とし (sort drop).** The principle titles split into glyphs. Their DOM rects seed instance positions, and they fall into the 3D type table, so text visibly becomes movable type.

**Fallback.** Static grid with the marks applied.

### 活字と版木 Type and Block — Skills / stack

**Content.** Grouped by domain. Each skill shows years, scale and last production use; there are no percentages.

| Domain | Skills |
|---|---|
| Languages | Go 8y · TypeScript 6y · Rust 3y (hot paths since 2023) · Python · SQL |
| Data | PostgreSQL · Kafka · Redis · ClickHouse |
| Infra | Kubernetes · Terraform · AWS multi-region · Envoy |
| Reliability | OpenTelemetry · Prometheus · SLOs · game days |
| Web and graphics | React · three.js/WebGL · web performance |
| Practice | RFCs and ADRs · review · incident command · mentoring |

**Effect: revolving type table (3D family 2).** Two round tables after 王祯's design.
- About 4,000 instanced wooden sorts in one draw call, with SDF-atlas glyphs in a per-language face.
- Dragging or scrolling spins a table to a domain. Sorts rise like a pin-screen and slide onto a composing stick to spell each skill.
- The adjacent DOM list is the accessible source of truth.

**Sidebar essay.** Japan printed with movable type c.1590–1650 (嵯峨本), then returned to carved blocks. The usual explanation:
- cursive kana ligatures;
- text and picture sharing one block;
- reprint economics: keep the blocks instead of re-setting type.

"Build vs buy, 17th-century edition."

**Images.**
- `ukie/toyoharu-dutch-perspective.jpg`: Edo artists adopting a foreign toolset, captioned "how I learn new stacks".
- A line redraw of the 1313 type-table woodcut.
- `pattern/stencil-meander.jpg` as the drawer texture.

**Transition out.** The camera pushes into the sort 道. Its inked face fills the screen and *is* the film's first frame, matched to the poster.

**Fallback.** A CSS grid of DOM-glyph sorts; click to compose.

### 道中 The Road — Career film

Specified in §5.
- **Captions.** Emaki-style vertical 詞書: station, year, company descriptor, title, scope, two outcomes.
- **References.** A small Hiroshige reference plate with its CC0 credit.
- **Separations panel.** Rows ink themselves one by one.

**Transition out: 金雲.** The film ends in rising gold bands, and the same shapes continue as WebGL gold leaf on the screen.

### 表具 The Mount — Works / case studies

**Content.** Six case studies, one per 扇 (panel).
- Panels are counted from the right (第一扇…第六扇, real physical order) and read right to left in every language. A one-line note tells en readers so.
- Each panel follows **問・術・答・省**: problem, approach and trade-offs, result, and what I'd do differently.
- Three panels open into full static pages.

| Panel | Case | Result | Screen (Met, CC0): why |
|---|---|---|---|
| 第一扇 | Settlement ledger rewrite | 6 h → 50 min, idempotent | *Red and White Poppies*: the chequered fence is a ledger grid |
| 第二扇 | Card tokenisation | PCI scope 23 → 3 services | *Bamboo Grove*: the nodes are bulkheads |
| 第三扇 | Tracing across 140 services | MTTD 38 → 6 min | *Moon and Autumn Grasses*: seeing by moonlight |
| 第四扇 | Dispatch to event-driven (strangler fig) | Zero downtime, 12× throughput | *Irises at Yatsuhashi*: a zig-zag bridge crossed in increments |
| 第五扇 | Developer platform "golden paths" | Deploys 45 → 7 min; 120 services | *Morning Glories*: vines on a trellis, blooming daily. Templates are drawn as 型紙 (`pattern/stencil-asanoha.jpg`) |
| 第六扇 | Multi-region resilience, plus the **system-design walkthrough** | RTO 4 h → 15 min | *Rough Waves*. The walkthrough is a 吹抜屋台 roofless cut-away after `ukie/toyoharu-kabuki-perspective.jpg` |

**Effect: byōbu and kinpaku (3D family 3).** Scroll unfolds the screen (hinges ±85° → 0, zig-zag, flat normals from `dFdx`/`dFdy`). The gold leaf has 箔足 seams, per-leaf tilt, Ward anisotropy, Fresnel and worn patches of red ground. Diagrams are inlaid as 截金 cut-gold lines on ベロ藍, and a small 改 seal on each panel lists its reviewers.

**Transition out: 屏風たたみ.** The screen folds into a narrow stack, which becomes the ranking sheet's 行司 spine.

**Fallback.** DOM panels in a snap row (phones), or a flat 6-column screen with a gold AVIF.

### 番付・空摺 Seen and Unseen — Achievements / metrics

**Upper half: 見立番付.** Edo printed rankings of everything. Its top rank was 大関, because 横綱 did not appear on banzuke until 1890. Real banzuke used one ink, so this one is 紺 only, set dense in Kaisei Tokumin 800. Centre column: 「八年」.

| Rank | 東 Delivery | 西 People |
|---|---|---|
| 大関 | Settlement 6 h → 50 min | 11 engineers mentored, 4 promoted |
| 関脇 | Deploys 45 → 7 min | RFC culture: 38 RFCs |
| 小結 | 120 services on golden paths | Two conference talks |
| 前頭 | PCI scope 23 → 3 | OSS adoption |

**Lower half: 空摺, reliability printed without ink.**
- 99.95 → 99.99% availability
- MTTR 47 → 9 min
- Pages per on-call week 31 → 4
- Zero Sev-1 incidents in 2025
- Nine latent failures found in game days

**Effect (3D family 4).**
- A paper plane with a heightmap of the embossed figures and an SLO curve, plus procedural washi-fibre normals.
- The pointer, or scroll on touch, sets the light's azimuth and elevation. At grazing angles the numbers rise out of blank paper.
- Caption: "Reliability is karazuri: visible only when light rakes across it, which is to say, in a crisis."
- An 「墨を入れる / Ink it」 button and the DOM list give equal access.

**Transition out: 水に沈める.** The embossed normals relax into a water surface, and one drop falls.

**Fallback.** A CSS relief made of paper-tone text-shadows, plus a light slider.

### 料紙 Decorated Paper — OSS / writing / talks

**Content.**
- OSS: `kento` (idempotent job registration in Go), `baren` (an even-pressure load tester), and upstream fixes.
- Six essays, for example "Idempotency is registration" and "Against the 3 a.m. page".
- Two talks.
- Venues and star counts are flagged for the client to confirm.

**Effect: closed-form suminagashi (3D family 5)**, after Lu & Jaffer.
- A drop is `P' = C + (P−C)·√(1 + r²/|P−C|²)`, plus tine strokes. Each operation is one pass on a 1024–1536² texture, so it costs nothing at rest.
- **Data drives the pattern.** Each repo's commit history replays as drops (radius ∝ log lines changed); each essay section is one drop; talks are tine strokes.
- Hovering an item highlights its operations through an ID channel. A click adds the visitor's own drop, which `?ops=` replays.
- All eight plates are inks now, so this is the most colourful artboard.

**Images.**
- `writing/hokkei-first-writing.jpg` (書き初め) for essays.
- `writing/gakutei-spider-web.jpg` (examining a spider's web: the Web) for OSS.
- `writing/gakutei-book-cart.jpg` for talks.

**Transition out: 漉き上げ・裁ち.** The marbled sheet lifts from the water, crop marks draw, and it is cut into square shikishi.

**Fallback.** A pre-baked AVIF per item, from the same operation lists.

### 連 The Circle — Testimonials / mentoring

**Content.**
- Three named testimonials: manager, peer and report (persona data).
- Mentoring and leadership: 11 mentees, 4 promotions, hiring loops, onboarding docs, the incident-commander rotation.

**Framing.** Surimono were luxury prints a poetry circle (連) commissioned as gifts for its members, and colleagues' words are gifts too.
- The section opens with `writing/gakutei-paper.jpg`, *Paper: Teika*, from the 一陽連's "Four Friends of the Writing Table" series.
- It closes with `writing/gakutei-brush.jpg`.

**Effect.** Three square surimono of our own design.
- Metallic sheen from a `conic-gradient` keyed to pointer or tilt, inside a karazuri border.
- ja quotes are set vertically, like kyōka.
- CSS only: a deliberate 間 between GPU sections.

**Transition out: 割印.** A seal straddles the boundary, half on the last card and half on the letter. Its halves register exactly at mid-screen, driven by a CSS scroll-driven animation.

**Fallback.** Static cards.

### 落款 The Seal — Contact / CV

**Content.**
- Email with a copy button, GitHub, LinkedIn.
- The résumé PDF in ja, en and zh.
- Availability: Senior or Staff roles from 2027-01, full-time or advisory, two months' notice.
- Location: Tokyo, JST (UTC+9).
- Overlap hours: EU 16–19 JST, US West 08–10 JST.
- Remote or hybrid; open to relocating to Singapore or Shanghai; Japanese national.

The text is a letter drawn stroke by stroke.

**Effect: soapstone seal (3D family 6).**
- A 寿山石 seal with translucent wrap shading. It reuses the hero's SDF carving module, and the Info panel says so.
- The seal face is a 白文 「湊」, redrawn from its 說文 小篆 form, beside a 肖形印 of the crest.
- Press and hold: the stone descends and the paper dents. On release, the impression appears with 印泥 coverage noise.
- This completes "today's print".

**Transition out: 綴じ.** A CSS 3D page turn to the inside back cover.

**Fallback.** An SVG stamp.

### 奥付 The Colophon — Footer / credits

**Content.** A real 奥付 (zh 牌记):
- 著者 (author) and 版元 (publisher);
- 彫: three r186, GSAP 3.15, Lenis 1.3.27;
- 摺: the capture and encoding pipeline;
- 料紙: fonts and licences;
- 画: every Met and AIC image with its `creditText` and `objectUrl` (CC0);
- live page weight, LCP and build hash;
- the date: 令和八年 霜降 摺.

**Ending.** Today's print appears full size. Then **大尾**, the "grand finale" from the cartouche of Hiroshige's own Kyoto print. At night the vignette is `night/hiroshige-ryogoku-moon.jpg`.

**Print stylesheet.** Printing the page yields the two-page CV with kentō marks.

## 5. The film: 道中

### 5.1 What it depicts

**World (3D family 7).** Our own three.js world through an NPR "print" renderer.
- Each material belongs to one plate.
- Shading is 2–3 flat tones plus bokashi.
- Key lines come from depth and normal edges in 主版 ink.
- Each plate has a slight per-plate offset.
- The compositions are homages to Hiroshige, not copies.

**Camera and traveller.**
- The camera dollies laterally **leftwards**, as an emaki unrolls. すやり霞 mist bands, the painters' own device, skip distance and are flat and encoder-friendly.
- One small traveller with a 笠 and a 矢立 (the travelling brush case: an Edo laptop) appears in every scene. This is 異時同図法: the same person in different years.

**Plates.** Chapter 1 is line only. Each later chapter wipes its plate across the frame during travel.

| Ch | Year | Station (credit) | Plate | Career beat | Rest frame |
|---|---|---|---|---|---|
| 1 | 2018 | 日本橋 (AIC) | 壱 line | New-grad backend at a 40-person payments startup; settlement in Go; first on-call | Gates swinging open on the arched bridge at dawn |
| 2 | 2019 | 箱根 (AIC) | 弐 若竹 | Tokenisation; PCI audit passed first time | Steep patchwork pass with a small 関所 checkpoint |
| 3 | 2020 | 三島 Mist (AIC) | 参 銀鼠 | Remote-first logistics SaaS; observability in a fog year | Figures layered in fog (no torii) |
| 4 | 2021 | 原 (AIC) | 肆 一斥染 | Promoted to Senior; `kento` open-sourced | Fuji's peak breaks the drawn frame line |
| 5 | 2022 | 島田 (AIC) | 伍 瓶覗 | Tech lead of 6; the monolith goes event-driven | Porters carry travellers across a river with no bridge, as the shogunate required |
| 6 | 2023 | 岡崎 (AIC) | 陸 ベロ藍 | Large marketplace; developer platform | The longest bridge; the imported pigment arrives as a saturation jump |
| 7 | 2024 → 25–26 | 庄野, then 京師 (Met) | 漆 鈍, then 捌 金 | Incident commander for a regional outage, then the resilience programme; arrival at "now" | Coherent diagonal rain → dusk on the Sanjō bridge under gold dust → rising 金雲 |

- Each chapter holds about 40% of its 100 lvh on the rest frame, then travels. Chapter 7 carries the Kyoto rest and the gold outro.
- Captions use CSS scroll-driven animation (`view-timeline: --film`), with a GSAP fallback.
- On the desktop high tier, "This film was rendered by this page" swaps to the live NPR world at the same frame.

### 5.2 Production

- **Capture.** A deterministic `capture.html` (frame index drives time, seeded randomness, `compileAsync` first). Playwright with SwiftShader runs one browser at a time and pipes PNG batches of 8 into `ffmpeg -f image2pipe`.
- **Variants.** 1280×720 @30 (480 frames, 16 s; SD encoded from the same frames), 720×1280 @24 with its own portrait camera, and a 石摺 night set of each from the same scene graph. About 10–12 minutes of rendering in total.
- **Encode** (as the research specifies). H.264 High, `yuv420p`, BT.709, `-preset slow -g 8 -keyint_min 8 -bf 0 -sc_threshold 0`, `-force_key_frames` at the 8 rest times, `+faststart`, no audio. CRF 23 / 24 / 25 for HD ≤5 MB, SD ≤2.5 MB and portrait ≤3 MB; verify with VMAF.
- **Encoder-friendly content.** Washi grain is a static AVIF overlay, not in the frames. No per-frame noise; rain is long coherent strokes; rest frames are calm. The eight rest stills (AVIF/WebP, ≤80 KB) are taken from the encoded MP4.

### 5.3 Player

- **Stage and loading.** One paused `<video>`, sticky at 100 lvh in an 800 lvh section. The file is fetched whole as a Blob within 3 viewports (or at idle on fast links); `preload` goes from `none` to `auto`. A `<picture>` poster fades after `seeked` plus one `requestVideoFrameCallback`.
- **Scrubbing.** ScrollTrigger gives progress only, through a 2049-entry hold/smoothstep table. Seeks are coalesced (never while `seeking`, newest wins, frame middle). rAF runs only while target ≠ shown frame. A mean seek above 66 ms drops to SD.

**Tiers.**

| Condition | Gets |
|---|---|
| Reduced motion | Stills in flow |
| Save-Data, 2G or error | Crossfading stills |
| iOS Low Power | WebCodecs fallback |
| Portrait phone | Portrait file |
| Low memory or few cores | SD |
| Otherwise | HD |

**Night switch mid-film.** The night still crossfades in at once, the night file fetches, the blob swaps at the next rest, and the old URL is revoked. Only one film is ever in memory.

**Rest of the page.** All WebGL views pause while the film is active.

## 6. Performance architecture and budget

- **Rendering.** One fixed canvas, one `WebGLRenderer` (GLSL, r186), scissored views that each register a rect, scene, camera and poster. Views warm up 150% ahead with `compileAsync`, park when far, and stop when nothing is visible. At most three are live. One combined post pass does grain, nijimi and per-plate misregistration.
- **Static first.** Prerendered `/ja/`, `/en/` and `/zh/` with hreflang and JSON-LD `Person`; a DOM/SVG hero; three.js at idle after LCP.
- **Governor.** The starting tier comes from the renderer string, caveat probe, `deviceMemory`, cores, pointer and Save-Data. It lowers DPR before tier and recovers after 8 s. Counts change through draw ranges, never `#define`s.

| Budget | Target |
|---|---|
| First view | ≤150 KB gzip; LCP ≤2.0 s; CLS ≤0.05; INP ≤150 ms |
| three.js stage (lazy) | ~136 KB gzip, plus 8–30 KB per view |
| GSAP, ScrollTrigger, Lenis | ~45 KB gzip; Lenis on the GSAP ticker; no `normalizeScroll` |
| Fonts | Body 0.6–1.0 MB (active language only); display ≤50 KB per language |
| Images | Rinpa 6 × ~180 KB AVIF; Hiroshige plates 8 × ≤90 KB; the rest lazy |
| Film | 2.5–5 MB per tier; stills 8 × ≤80 KB |
| GPU | VRAM ≤150 MB high, ≤70 MB mobile; DPR cap 2 desktop, 1.5 mobile |
| Idle / memory | Zero rAF; main thread <1%; blob +60 MB; tab ≤350 MB desktop, ≤200 MB mobile |

**Tiers.** T0 static (reduced motion or no WebGL) · T1 low (CSS fallbacks, one live view, DPR 1) · T2 mid · T3 high (adds the live-film toggle and shader peek).

**Engineer delights.** The Info panel and keyline view; "peek the GLSL" on each view's corner anchor; `window.__hanmoto` (`views`, `forceTier()`, `loseContext()`, `replay(ops)`); `?ops=` and `?carve=` links; a site that prints its own CV.

## 7. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Cultural density overwhelms readers | One spine only (printing). Each section names its stage in one line. Ruby readings and a glossary in the Info panel. Hiring facts never depend on the metaphor |
| Building the film's world is a large job | Procedural kit: heightfields, instanced trees, bridges and figures, cut-out traveller, 8 dioramas joined by mist. Fallback is 2.5D paper cut-outs on the same shader |
| Right-to-left screen confuses en readers | Motion leads the eye; a one-line note; arrow keys follow reading order |
| Night reads as "dark" | Day is the default. 石摺 is saturated indigo (luminance ≥0.045), presented as an alternate impression |
| Japanese clichés | Fuji appears once, and only because it breaks the frame. No Great Wave, sakura, torii, petals or particle name |
| ⌘Y opens History on macOS | Best-effort `preventDefault`, plus the `y` key and a toolbar button |
| Mirrored text and inkless emboss hurt accessibility | DOM equivalents, `aria-hidden` canvases, "Ink it", quiet mode |
| Seal-script authenticity | 「湊」 redrawn from the 說文 小篆 and checked against a reference. Never faked with a font |
| Persona credibility | One trilingual content file; employers as descriptors; venues, stars and quotes flagged `confirm:true` |
| Weight of ~30 font faces | `&text=` subsets; only the active language's body face; `document.fonts.load()` before split animations |
