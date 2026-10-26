# 八度摺 · Eight Impressions · 八版套印 — DESIGN BIBLE

Version 1.0 · 2026-10-25 (霜降) · Status: **FINAL, binding**.
This file is the single source of truth for every implementation work package (WP). The concept files (`docs/concepts/`) and research (`docs/research/`) are background. Where research holds formulas or reference code, this file cites it by section (e.g. *threejs §c2*, *video §4.3*). **If this file disagrees with research or a concept file, this file wins.**

Abbreviations: *threejs* = `docs/research/threejs-techniques.md`, *video* = `docs/research/video-scrub.md`, *aesth* = `docs/research/japanese-aesthetics-typography.md`, *pd* = `docs/research/public-domain-images.md`, *land* = `docs/research/portfolio-landscape.md`, *shaders* = `docs/research/threejs-techniques.shaders.js` (verified GLSL on r186). Colour sources: **NC** = nipponcolors.com, **WD** = 和色大辞典 (colordic). Never mix sources for one colour name.

---

## 0. Rules for parallel implementers (read first)

1. **File ownership is absolute.** Each file has exactly one owner WP (§13.2). You may read anything. You may write only files your WP owns, plus new files inside directories your WP owns. If you need a change in someone else's file (a token, a type, a dependency), append a request to `docs/wp-requests/<YOUR-WP-ID>.md` and work around it with a section-local solution. WP-11 integrates requests at the end.
2. **Never edit** `package.json`, lockfiles, `vite.config.ts`, `tsconfig.json`, `build/**`, `src/core/**`, `src/gl/stage/**`, `src/content/types.ts`, `src/sections/registry.ts` unless you own them. No new npm dependencies: everything you may use is installed by WP-00 (§8.2).
3. **Machine limits** (4 CPUs, ~3.5 GB free RAM). Only **one headless browser at a time across all agents**. Wrap every Playwright/Chromium run: `flock /home/star/Documents/Portf/.locks/browser.lock <command>`. Wrap every ffmpeg encode: `flock /home/star/Documents/Portf/.locks/ffmpeg.lock nice -n 10 <command>`. Never run two Vite builds at once: `flock .locks/build.lock npm run build`.
4. **Dev server ports** (always `--strictPort`): WP-00 5170, WP-01 5171, WP-02 5172, WP-03 5173, WP-04 5174, WP-05 5175, WP-06 5176, WP-07 5177, WP-08 5178, WP-09 5179, WP-10 5180, WP-11 5181. Preview: 4170 + WP number.
5. **Headless WebGL**: Playwright from the project's `node_modules/playwright` (1.64.1; Chromium 1248 cached in `~/.cache/ms-playwright`), launch args `['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']`. SwiftShader is for **correctness, capture and screenshots only**; never tune visuals or counts to it (*threejs* P16).
6. **ffmpeg**: `tools/bin/ffmpeg` (WP-00 copies the verified static build there; it has libx264, libvpx-vp9, libaom-av1, libwebp). `tools/bin/ffprobe` likewise (from `ffprobe-static`).
7. **Done means**: `npm run typecheck` passes, `npm run build` passes, your acceptance criteria (§13) pass, and you have not touched files you do not own. Put your hand-over (files produced, how to verify, known gaps, verification sources) in your **final message** to the orchestrator; do not write report files. `docs/wp-requests/<WP-ID>.md` is the only shared note file (it is input for WP-11).
8. **No placeholders ship.** During development you may see stub content; final output must contain no "lorem", "TODO", "TBD", empty slots, grey boxes or sample-looking text. The persona is fictional but complete (§1.4).

---

## 1. Concept

### 1.1 Name

| | Title | Subtitle |
|---|---|---|
| ja | **八度摺**（はちどずり） | 一年に一版、八年で一枚の錦絵 |
| en | **Eight Impressions** | A career printed one block at a time |
| zh | **八版套印** | 一年一版，八年套成一幅锦绘 |

Page `<title>` pattern: `瀬川 湊 — シニアソフトウェアエンジニア｜八度摺` · `Minato Segawa — Senior Software Engineer | Eight Impressions` · `濑川 凑 — 高级软件工程师｜八版套印`.

### 1.2 Thesis (the spine)

An Edo colour print (*nishiki-e*) is pulled from one key block plus one block per colour, printed in passes onto the same damp sheet. Two notches cut into every block — the L-shaped 鉤見当 and the straight 引付見当 (*kentō*) — keep every pass **in register**. An Edo print workshop was, in structure, a software organisation, and a senior engineer has sat in every chair of it. **The site prints itself as you read: scroll position = printing pass = career year.** It opens as one indigo key line on cool paper; each career year (2018 → 2026) adds one named colour plate; gold goes on last, as metallics always did; the visitor's own marbling and seal finish the print, which they can take home. The idiom 版を重ねる ("to stack blocks") means "to run to many editions" — lasting work.

| Edo workshop | Software meaning | Where on the site |
|---|---|---|
| 版下 *hanshita*: the drawing pasted face-down on the block and destroyed by carving | A design doc that dissolves into code | Cover → Summary hand-off |
| 主版 key block, mirror-carved | Every interface is the mirror of what was carved beneath it | Cover |
| 見当 registration notches | Interfaces and contracts; aligning teams | Borders, focus rings, motion grammar |
| 色版 one block per colour, printed in order | Incremental delivery; one plate per career year | Film, Separations panel |
| 表具 mounting a screen; 下地骨 its lattice core | Shipping: the polished surface hides the structure | Works → Skills hand-off |
| 組子 joinery without nails | Loose coupling | Skills |
| 枯山水 raked daily, re-raked after disturbance | Operations, SLOs, incidents | Principles |
| 番付 ranking sheet; 空摺 blind embossing seen only in raking light | Achievements; reliability (visible only in a crisis) | Achievements |
| 料紙 decorated paper; 墨流し marbling | Writing and open source — patterns made in public | Writing |
| 暖簾 shop curtain; also "goodwill" in Japanese accounting | Testimonials | Testimonials |
| 落款 seal; 割印 seal across two sheets | Sign-off, accountability | Contact |
| 奥付 colophon (required by the 1722 Kyōhō publishing rules — verify, §14) | Credits, build info | Colophon |

Language heritage (one stage line each, never a lecture):
- **ja** — the woodblock workshop.
- **zh** — the zh copy tells its own origin story: 毕昇's movable type, 王祯's revolving type table (1313), and the 十竹斋 albums' 饾版 (multi-block colour printing) and 拱花 (blind embossing, karazuri's ancestor). zh is never a literal translation of ja.
- **en** — "impression" means both a pulled print and the mark a person leaves.

### 1.3 Storyline — 序破急 at page scale

| Tempo | Sections | Colour state | Visitor feels | Visitor learns |
|---|---|---|---|---|
| **序 jo** — slow, airy, one idea per screen | Cover, Summary | Workshop colours only: paper, 紺 key line, 浅葱 guides, 躑躅 selection, 朱 notes, cherry wood | Calm; one quiet shock (the name was the mirror of a carved block) | Who, level, specialty, proof (4 dated results), career ledger |
| **破 ha** — density and motion build | Road (film, 7 chapters), Works, Skills, Principles | One plate per year arrives misregistered and snaps into register; gold last | Momentum; colour flooding in; craft | The 8-year path; six case studies; stack depth; method; operations |
| **急 kyū** — short, decisive, then stillness | Achievements, Writing, Testimonials, Contact, Colophon | Decisive contrasts: one-ink ranking sheet, inkless emboss, many-coloured marbling, one red seal | Conviction, delight, invitation | Numbers, voice, peers, how to hire, how it was built |

**Persistent threads**
- **Today's print** (今日の一枚 / Today's print / 今日之印): a 120×176 px thumbnail (ōban ratio 1 : 1.47) in the Separations panel gains each plate as the visitor passes it, later the visitor's marbling (Writing) and seal (Contact). It carries the visitor's seed (misregistration, marbling jitter, seal pressure). Full size and downloadable in the Colophon.
- **The traveller**: one small figure with a 笠 hat and a 矢立 (Edo travelling brush case — an Edo laptop) appears in every film chapter (異時同図法: the same person in different years).
- **The ruler**: the top ruler changes unit with the artboard; during the film it reads years 2018 → 2026 right to left; at Contact it reads 百二十六里 (the Tōkaidō's length, Edo → Kyoto).

### 1.4 Persona rules

- The client supplied no personal data. The site ships a **complete, realistic, fictional** persona: **瀬川 湊 / Minato Segawa / 濑川 凑**, Senior Software Engineer, 8 years (since April 2018), Tokyo (JST). Specialty: **distributed systems, developer platforms and web rendering performance** (which justifies a site that renders its own film).
- All facts live in `src/content/` (owned by WP-01). Canonical numbers are fixed in **Appendix B**; every section must use them unchanged so the site is internally consistent.
- Employers are fictional with descriptors, never real companies: 花道ペイメンツ *Hanamichi Payments* (2018-04 → 2020-03), 渡り鳥ロジスティクス *Wataridori Logistics* (2020-04 → 2023-06), 海路 *Kairo* (2023-07 → now).
- Never name real employers, real conferences, real universities, real certifications, or claim contributions to real open-source projects. Talk venues are generic descriptors ("a Tokyo Go meetup").
- Every fact carries `prov: 'persona-sample'`. `site.config.ts` has `sampleNotice: true`, which prints **one** quiet line in the Colophon and the Info panel (「掲載の人物・経歴・数値は差し替え可能な見本データです」 / "The person, career and figures shown are replaceable sample data." / 「所载人物、经历与数据均为可替换的示例数据。」). The owner flips it to `false` after replacing data. The build prints a warning count of `persona-sample` items (never fails).
- External persona links (GitHub, LinkedIn, email domain) are in `site.config.ts`. WP-01 must verify each handle/domain is **unclaimed** (`curl -s -o /dev/null -w '%{http_code}' https://github.com/<handle>` → 404; `getent hosts <domain>` → nothing) so the site never links to a real person. Articles show on-site abstracts; no external article links unless `url` is set.

### 1.5 Never (merged must-avoid list)

Visual clichés: warm cream #F4F1EA + serif + terracotta; near-black + one acid pop; purple→blue gradients; glassmorphism; neon glow; bloom on gold; additive glow on paper; chromatic aberration/RGB split; conic-gradient holographic sheen; rounded-lg cards with drop shadows; accent rails; numbers in circles or badges; decorative 01/02/03 or 壱/弐/参 numbering where order is not information; emoji; everything centred; uniform 1 px grey borders around everything; bento grids; percentage skill bars; cursor follower circles or magnetic buttons; particle names or text-to-particles; morphing particles into chart shapes; 3D desk/room/laptop; terminal/VS Code heroes; star-chart sections; the Great Wave; sakura/petals; torii (Mishima's torii is removed from the film diorama); koi; red sun; ensō; beige sand; **Fuji more than once** (only in the 原 chapter of the film, where it breaks the frame — therefore *red-fuji, shower-below-summit, ejiri-wind, 17-yui, great-wave* are never shown, and Hakone's faint distant Fuji is removed from its diorama and cropped from its reference thumbnail); single decorative kanji as ornament (no 信/速/育 noren); Inter, Space Grotesk, Fraunces, Instrument Serif.

Behavioural: scroll-jacking; ScrollTrigger pins (use CSS `sticky`); Lenis on touch or under reduced motion; long preloaders; content waiting on animation; key text animated from invisible; split-letter staggers beyond the single allowed use (§5.6); a cultural lecture in body copy (one stage line per section; glossary in the Info panel); interaction required before the visitor knows who this is; mirrored/embossed/canvas text without a DOM equivalent; stable-fluid simulations; two separate night film encodes; a procedural NPR world as the film source; `THREE.HTMLTexture` or `WebGPURenderer` on the critical path; visible features depending on `EXT_disjoint_timer_query`; drawing the film into WebGL each frame; GSAP-tweening `currentTime`; image sequences; `will-change` in global CSS; `dvh` in scroll geometry; Ctrl/⌘+R capture; persona domain with `.ai`.

---

## 2. Information architecture

### 2.1 Ordered sections

One long page per language plus six static case pages per language. Section element: `<section id="{id}" class="artboard" data-section="{id}" aria-labelledby="{id}-title">`. Total length ≈ **2,400 vh** desktop (text sections grow to content height when longer).

| # | id | Layer name ja / en / zh | Stage (ja · en) | Purpose (hiring question answered) | Length desktop · mobile | Live view(s) | Tempo |
|---|---|---|---|---|---|---|---|
| 1 | `cover` | 表紙 / Cover / 封面 | 摺上り · The Impression | Who, level, specialty, availability, contact — in HTML at first paint | 160 vh (sticky stage 100 lvh, 60 vh of scrub) · 130 vh | `cover-block` (carved woodblock) | 序 |
| 2 | `summary` | 覚書 / Summary / 摘要 | 版下 · The Drawing | Three-sentence summary, four dated results, career ledger table, overlap hours | 110 vh · auto | none (GPU rest; 2D only) | 序 |
| 3 | `road` | 道中 / The Road / 旅途 | 道中 · The Road | Eight years as seven film chapters (stations), with scope and outcomes per year | **800 lvh** (sticky 100 lvh) · 800 lvh | none (DOM `<video>`; canvas hidden) | 破 |
| 4 | `works` | 屏風 / Works / 作品 | 表具 · The Mount | Six case studies (問・術・答・省), each opening a static case page | 220 vh (sticky) · auto | `works-byobu` | 破 |
| 5 | `skills` | 組子 / Skills / 技能 | 組子 · Joinery | Stack depth: years, scale, last production use; architecture diagram | 150 vh (sticky) · auto | `skills-kumiko` | 破 |
| 6 | `principles` | 枯山水 / Principles / 原则 | 枯山水 · The Garden | Five working principles; a year of operations data; SLO and incidents | 130 vh (sticky) · 130 vh | `principles-garden` | 破 |
| 7 | `achievements` | 番付 / Achievements / 成就 | 番付・空摺 · Seen and Unseen | Ranked achievements (delivery / people), headline metrics, dated charts, reliability | 150 vh · auto | `achievements-press` | 急 |
| 8 | `writing` | 墨流し / Writing / 写作 | 料紙 · Decorated Paper | OSS repos, articles, talks; interactive marbling seeded by commit history | 120 vh · auto | `writing-marble` | 急 |
| 9 | `testimonials` | 暖簾 / Testimonials / 推荐 | 暖簾 · Goodwill | Three named quotes; mentoring and leadership facts | 120 vh · auto | `testimonials-noren` | 急 |
| 10 | `contact` | 京 / Contact / 联系 | 落款 · The Seal | Availability, email, form, CV PDFs (ja/en/zh), location, overlap hours | 110 vh · auto | `contact-seal` (only while stamping) | 急 |
| 11 | `colophon` | 奥付 / Colophon / 版权页 | 奥付 · Colophon | Credits (every image), fonts, libraries, page weight, Web Vitals, edition, today's print | 100 vh · auto | `colophon-emaki` (plays once) | stillness |

Rules: max **two live views** at any time, three only inside a 間 band (§8.6). Summary and the text-heavy halves of Testimonials/Contact are deliberate GPU rests.

### 2.2 間 bands and transitions (between every pair)

A **間 band** is a 15–25 vh strip at the end of the outgoing section where exactly one small thing happens. Reading zones and transition zones never overlap. Band element: `<div class="ma" id="ma-{from}-{to}" data-band="{from}-{to}" aria-hidden="true">`, rendered **by the outgoing section's `render()`** as its last child. Progress `p ∈ [0,1]` = band top at viewport bottom → band bottom at viewport top, from `ctx.scroll.band(id)`. Both adjacent sections may subscribe; the table defines who draws what.

| Band id | Height | Name | Outgoing owner draws | Incoming owner draws | Implementation |
|---|---|---|---|---|---|
| `cover-summary` | 20 vh | 版木返し block flip | Woodblock rotates 180° on its long axis; its back carries the pasted 版下 (the Hokusai perspective page texture); it scales/translates so the back exactly covers `#summary [data-handoff="hanshita"]` (cached rect); at p = 1 the DOM `<img>` shows, the view stops | nothing (while the cover view is live, `cover` sets `data-handoff-state="pending"` on the figure, which hides it; removed at p = 1 — without JS the figure is always visible) | WebGL (cover view) + DOM swap. Mobile/T1: 240 ms crossfade |
| `summary-road` | 25 vh | 消点 match cut | SVG guides traced on Hokusai's page extend to full viewport and converge on the vanishing point; the figure scales (transform only) so its VP lands on the film poster's VP (`film-manifest.matchVp`); guides fade at p 0.8–1 | Poster `<picture>` of chapter 1 is already under the band | DOM/SVG, CSS scroll-driven animation; GSAP fallback |
| `road-works` | 25 vh | 金雲 gold clouds | Three DOM SVG すやり霞 gold bands slide right → left (transform only) continuing the film's last frame (`film-manifest.endBands`); at p > 0.6 they part | `works-byobu` view already live behind the bands, screen closed (`uFold = 1.45`) | DOM SVG over WebGL; no blend modes |
| `works-skills` | 25 vh | 下地骨 the lattice core | Byōbu folds half shut and turns 180° about its vertical axis; its back shows the real 下地骨: a square lattice of wooden laths (pitch = panel width / 6) with torn paper; gold fades | From p = 0.4: `skills-kumiko` starts as an exploded square lattice of the same pitch, wood colour and screen centre, and begins assembling (assembly continues into its section) | Two WebGL views, crossfade by material opacity (band is the one place 3 views may be live) |
| `skills-principles` | 20 vh | 押す pressed into sand | Assembled kumiko panel rotates to top-down and lowers onto the sand plane, fading at contact | `principles-garden` starts with the lattice imprint stamped into its trail RT (procedural kaku-asanoha at the same pitch), then rakes it away over the first 25 vh of its section | Two views; imprint via `stampLattice()` in garden view |
| `principles-achievements` | 20 vh | 砂子 sunago | Garden camera tilts up 12°; sand darkens 6% | `achievements-press` flakes rise from the bottom edge (grains lifting), turning gold as they rise; they then sift onto the paper (inside its section) | WebGL, analytic flake paths (no simulation) |
| `achievements-writing` | 20 vh | 金、水に落ちる | Loose gold flakes slide off the bottom edge | `writing-marble` applies its first op: a gold (plate 8) drop at the tray centre; ring spreads 600 ms | WebGL; marbling op list starts with the gold drop |
| `writing-testimonials` | 20 vh | 漉き上げ lifting the print | A sheet lowers onto the water and lifts with a peel curl (if the visitor has not taken a print, one is taken automatically at p = 0); the print is published to `ctx.print.setMarbling()` | `testimonials-noren` dyes its cloth with that canvas | WebGL; shared canvas via PrintState |
| `testimonials-contact` | 25 vh | くぐる walking through | Camera dollies through the centre noren; a sphere collider parts the cloth; canvas becomes transparent where cloth is gone | `#contact [data-handoff="kyoto"]` figure (the 京師 print) scales 0.92 → 1.0 behind | WebGL + DOM transform |
| `contact-colophon` | 15 vh | 割印 seal across two sheets | Two halves of the 落款 seal (top half at the bottom edge of Contact, bottom half at the top of Colophon) slide horizontally and register exactly at mid-viewport | nothing | CSS scroll-driven animation (`view-timeline`); GSAP fallback; SVG halves from WP-02 |

### 2.3 Pages and URLs

All paths are relative (Vite `base: './'`), so `dist/` works from any sub-path.

| Page | ja (x-default) | en | zh |
|---|---|---|---|
| Main | `index.html` | `en/index.html` | `zh/index.html` |
| Case pages (6) | `works/{caseId}/index.html` | `en/works/{caseId}/index.html` | `zh/works/{caseId}/index.html` |
| 404 | `404.html` (trilingual, one page) | | |

`caseId ∈ {ledger, tracing, mapgl, strangler, platform, resilience}`. Deep links: `#cover … #colophon`, film chapters `#road-1 … #road-7`, case panels `#works-ledger …`. CV PDFs: `cv/cv-ja.pdf`, `cv/cv-en.pdf`, `cv/cv-zh.pdf`.

### 2.4 Where the film sits

The `road` section is the third section, directly after the impact-first Summary. It is 800 lvh tall (7 chapters × 100 lvh of scrub + the 100 lvh sticky stage). Each chapter = one career year = one Tōkaidō station = one colour plate, **in true geographic order, right to left, Edo → Kyoto**:

| Ch | Year | Station (print no.) | Employer | Plate added | Anchor |
|---|---|---|---|---|---|
| 1 | 2018 | 日本橋 朝之景 (1) | Hanamichi | 壱 主版 紺 (key line only) | `#road-1` |
| 2 | 2019 | 箱根 湖水図 (11) | Hanamichi | 弐 若竹 | `#road-2` |
| 3 | 2020 | 三島 朝霧 (12) | Wataridori | 参 銀鼠 | `#road-3` |
| 4 | 2021 | 原 朝之富士 (14) | Wataridori | 肆 一斥染 | `#road-4` |
| 5 | 2022 | 島田 大井川駿岸 (24) | Wataridori | 伍 瓶覗 | `#road-5` |
| 6 | 2023 | 岡崎 矢矧之橋 (39) | Kairo | 陸 ベロ藍 | `#road-6` |
| 7 | 2024–25 | 庄野 白雨 (46) | Kairo | 漆 鈍 | `#road-7` |
| — | 2026 | (outro: 金雲 rising) | Kairo | 捌 金 (gold, last) | — |

京師 三条大橋 (55) is kept for Contact: the arrival. Each plate colour is the defining pigment of its station's print (Hakone's green crag, Mishima's grey fog, Hara's pink dawn, Shimada's pale river, Okazaki's Prussian-blue river, Shōno's grey rain), so colour accumulation is literally elapsed career time. A "skip the film" link sits above the section and in the express lane.

---

## 3. Global design system

### 3.1 Colour tokens (verbatim — `src/styles/tokens.css`, owner WP-00)

Palette 「藍摺 Aizuri」: indigo blueprint on cool paper, light-dominant. **Day (本摺) is the default.** Night (石摺 *ishizuri*, a real Edo genre imitating stone rubbings: pale lines on a deep ground) is a **moonlit lapis impression** with ground luminance 0.086–0.139 — saturated blue, never grey-black, never navy below L 0.08. Contrast ratios are WCAG 2.x against `--paper` of the same theme.

```css
/* ===== src/styles/tokens.css — bare :root = DAY (本摺). data-theme="dark" = NIGHT (石摺). ===== */
:root {
  color-scheme: light;
  /* grounds */
  --pasteboard: #C1E4E9;   /* 白藍 WD — canvas around artboards */
  --paper: #F7FCFE;        /* 卯の花 WD — artboards */
  --paper-print: #FFFFFB;  /* 胡粉 NC — cover print sheet, letter paper, seal paper */
  --panel: #EBF6F7;        /* 藍白 WD — chrome panels */
  --mat: #EBF6F7;          /* 藍白 WD — mats behind artworks */
  /* inks */
  --ink: #0F2540;          /* 紺 NC — 14.95:1 */
  --ink-2: #566C73;        /* 藍鼠 NC — 5.36; never small text on --pasteboard (4.10) */
  --link: #006284;         /* 縹 NC — 6.59 */
  --rule: #566C73;         /* 藍鼠 NC — structural frames (匡郭) */
  --guide: #33A6B8;        /* 浅葱 NC — guides; decorative only (2.79) */
  --guide-label: #0D5661;  /* 藍 NC — guide labels, measurements (8.06) */
  --select: #E03C8A;       /* 躑躅 NC — focus, selection, smart guides (3.92, UI only) */
  --select-text: #C1328E;  /* 牡丹 NC — selection labels as text (4.94) */
  --instruct: #EB6101;     /* 朱 WD — designer's red notes (fills, marks) */
  --instruct-text: #C73E3A;/* 銀朱 NC — red notes as text (4.86) */
  --seal: #CB1B45;         /* 紅 NC — seals only; at most once per artboard except Achievements (5.37) */
  --gilt: #FFB11B;         /* 山吹 NC — fills only, never text */
  --on-gilt: #0F2540;      /* text on gold (8.50) */
  --wood: #E1A679;         /* 赤白橡 NC — cherry block face */
  --wood-2: #B35C37;       /* 樺茶 NC — cherry grain, cut walls */
  --gravel: #BDC0BA;       /* 白鼠 NC — 白川砂, cool grey */
  --season: #E2943B;       /* 朽葉 NC (霜降); JS overrides per 二十四節気; non-text */
  --grain-opacity: .05;
  /* career plates — fills (one per year; Separations panel toggles decorative uses) */
  --plate-1: #0F2540;      /* 壱 主版 紺 NC — 2018 日本橋 */
  --plate-2: #5DAC81;      /* 弐 若竹 NC — 2019 箱根 */
  --plate-3: #91989F;      /* 参 銀鼠 NC — 2020 三島 */
  --plate-4: #F4A7B9;      /* 肆 一斥染 NC — 2021 原 */
  --plate-5: #A5DEE4;      /* 伍 瓶覗 NC — 2022 島田 */
  --plate-6: #205C81;      /* 陸 ベロ藍 (sampled from 39-okazaki) — 2023 岡崎 */
  --plate-7: #656765;      /* 漆 鈍 NC — 2024–25 庄野 */
  --plate-8: #FFB11B;      /* 捌 金 山吹 NC — 2026, gold last */
  /* career plates — text-safe */
  --plate-1-text: #0F2540; --plate-2-text: #26453D; --plate-3-text: #566C73; --plate-4-text: #9F353A;
  --plate-5-text: #006284; --plate-6-text: #205C81; --plate-7-text: #656765; --plate-8-text: #0F2540;
  /* Illustrator layer-colour cycle → traditional colours (aesth §2.2); used for each section's selection box */
  --layer-cover: #5383C3;        /*  1 Light Blue → 薄群青 WD */
  --layer-summary: #E95464;      /*  2 Red → 韓紅 WD */
  --layer-road: #5DAC81;         /*  3 Green → 若竹 NC */
  --layer-works: #005CAF;        /*  4 Blue → 瑠璃 NC */
  --layer-skills: #E03C8A;       /*  5 Magenta → 躑躅 NC */
  --layer-principles: #33A6B8;   /*  6 Cyan → 浅葱 NC */
  --layer-achievements: #E9CD4C; /*  7 Yellow → 刈安 NC */
  --layer-writing: #656765;      /*  8 Gray → 鈍 NC */
  --layer-testimonials: #1C1C1C; /*  9 Black → 墨 NC */
  --layer-contact: #F05E1C;      /* 10 Orange → 黄丹 NC */
  --layer-colophon: #42602D;     /* 11 Dark Green → 松葉 NC */
  --layer-motion: #268785;       /* 12 Teal → 青碧 NC (the Motion control layer) */
  /* section accents: fill/graphic, then text-safe */
  --accent-cover: #205C81;        --accent-cover-text: #205C81;
  --accent-summary: #EB6101;      --accent-summary-text: #C73E3A;
  --accent-road: #5DAC81;         --accent-road-text: #26453D;
  --accent-works: #E1A441;        --accent-works-text: #1A6343;   /* gold ground / malachite, both sampled from korin-irises (6.94) */
  --accent-skills: #D8A373;       --accent-skills-text: #255359;  /* 伽羅 WD wood / 鉄御納戸 NC (8.2) */
  --accent-principles: #BDC0BA;   --accent-principles-text: #656765;
  --accent-achievements: #CB1B45; --accent-achievements-text: #CB1B45;
  --accent-writing: #77428D;      --accent-writing-text: #77428D; /* 江戸紫 NC (6.85) */
  --accent-testimonials: #8A6BBE; --accent-testimonials-text: #70649A; /* 藤紫 NC / 二藍 NC (5.11) */
  --accent-contact: #C27B65;      --accent-contact-text: #9F353A; /* Kyoto red (sampled 55-kyoto) / 臙脂 NC */
  --accent-colophon: #42602D;     --accent-colophon-text: #42602D;
  /* film chapter caption rules — sampled print pigments (manifest accentColors) */
  --ch-1: #335B6A; --ch-2: #B4C085; --ch-3: #38465D; --ch-4: #D4A486; --ch-5: #376E84; --ch-6: #205C81; --ch-7: #656765;
}

/* NIGHT (石摺) — the two blocks below MUST be byte-identical apart from their selectors. */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;
    --pasteboard: #566C73;   /* 藍鼠 NC, L 0.139 */
    --paper: #005CAF;        /* 瑠璃 NC, L 0.107 — moonlit lapis */
    --paper-print: #1E50A2;  /* 瑠璃 WD, L 0.086 */
    --panel: #006284;        /* 縹 NC, L 0.104 */
    --mat: #C1E4E9;          /* 白藍 WD — prints sit on LIGHT mats at night; never inverted */
    --ink: #EAF4FC;          /* 月白 WD — 6.03 */
    --ink-2: #C1E4E9;        /* 白藍 WD — 4.95 */
    --link: #A5DEE4;         /* 瓶覗 NC — 4.51; links always underlined */
    --rule: #A5DEE4;
    --guide: #78C2C4;        /* 白群 NC */
    --guide-label: #A5DEE4;
    --select: #F596AA;       /* 桃 NC — 3.13 UI */
    --select-text: #FEDFE1;  /* 桜 NC — 5.35 */
    --instruct: #F4A7B9;     /* 一斥染 NC */
    --instruct-text: #FEDFE1;
    --seal: #EEA9A9;         /* 鴇 NC */
    --gilt: #E9CD4C;         /* 刈安 NC */
    --on-gilt: #0F2540;
    --wood: #E1A679; --wood-2: #B35C37;   /* materials are relit in WebGL, not recoloured */
    --gravel: #91989F;
    --grain-opacity: .07;
    --plate-1: #EAF4FC; --plate-2: #A8D8B9; --plate-3: #AFAFB0; --plate-4: #F4A7B9;
    --plate-5: #A5DEE4; --plate-6: #51A8DD; --plate-7: #A3A3A2; --plate-8: #E9CD4C;
    --plate-1-text: var(--ink); --plate-2-text: var(--ink); --plate-3-text: var(--ink); --plate-4-text: var(--ink);
    --plate-5-text: var(--ink); --plate-6-text: var(--ink); --plate-7-text: var(--ink); --plate-8-text: #0F2540;
    --layer-cover: #A5DEE4; --layer-summary: #EEA9A9; --layer-road: #A8D8B9; --layer-works: #78C2C4;
    --layer-skills: #F596AA; --layer-principles: #C1E4E9; --layer-achievements: #E9CD4C; --layer-writing: #BDC0BA;
    --layer-testimonials: #BBC8E6; --layer-contact: #F9BF45; --layer-colophon: #AACF53; --layer-motion: #E9DFE5;
    --accent-cover: #A5DEE4; --accent-summary: #F4A7B9; --accent-road: #A8D8B9; --accent-works: #E9CD4C;
    --accent-skills: #E1A679; --accent-principles: #BDC0BA; --accent-achievements: #EEA9A9; --accent-writing: #B28FCE;
    --accent-testimonials: #BBC8E6; --accent-contact: #EEA9A9; --accent-colophon: #AACF53;
    --accent-cover-text: var(--ink); --accent-summary-text: var(--ink); --accent-road-text: var(--ink);
    --accent-works-text: var(--ink); --accent-skills-text: var(--ink); --accent-principles-text: var(--ink);
    --accent-achievements-text: var(--ink); --accent-writing-text: var(--ink); --accent-testimonials-text: var(--ink);
    --accent-contact-text: var(--ink); --accent-colophon-text: var(--ink);
  }
}
:root[data-theme="dark"] { /* identical declarations to the block above */ }
```

Usage rules
- Body text only `--ink` / `--ink-2` / `--link` / `*-text` tokens. Gilt, guide, layer colours and plate fills are never text.
- `body { background: var(--pasteboard); color: var(--ink); }`; `.artboard { background: var(--paper); }`.
- `<meta name="theme-color">`: `#C1E4E9` (light) and `#566C73` (`media="(prefers-color-scheme: dark)"`).
- Night never inverts artworks: `<figure class="print">` sits on `--mat` (light at night) with kentō marks; its `<img>` has no filter.
- Opacity-tinted greys (`rgba(0,0,0,.1)`) are banned; every colour is a named token.
- The `--season` accent appears only as the 節気 date stamp and the Info panel swatch.

### 3.2 The eight career plates

| n | ja (ruby) | en | zh | Year · station | Day fill / text | Night fill |
|---|---|---|---|---|---|---|
| 1 | 壱 主版 紺（しゅはん こん） | I — Key block, indigo | 壹 主版 绀 | 2018 日本橋 | #0F2540 / same | #EAF4FC |
| 2 | 弐 若竹（わかたけ） | II — Young bamboo | 贰 若竹 | 2019 箱根 | #5DAC81 / #26453D | #A8D8B9 |
| 3 | 参 銀鼠（ぎんねず） | III — Silver grey | 叁 银鼠 | 2020 三島 | #91989F / #566C73 | #AFAFB0 |
| 4 | 肆 一斥染（いっこんぞめ） | IV — Pale safflower | 肆 一斥染 | 2021 原 | #F4A7B9 / #9F353A | #F4A7B9 |
| 5 | 伍 瓶覗（かめのぞき） | V — Jar-peek blue | 伍 瓶覗 | 2022 島田 | #A5DEE4 / #006284 | #A5DEE4 |
| 6 | 陸 ベロ藍（べろあい） | VI — Prussian blue | 陆 普鲁士蓝 | 2023 岡崎 | #205C81 / same | #51A8DD |
| 7 | 漆 鈍（にび） | VII — Dull grey | 柒 钝色 | 2024–25 庄野 | #656765 / same | #A3A3A2 |
| 8 | 捌 金（きん） | VIII — Gold | 捌 金 | 2026 金雲 | #FFB11B / ink on it | #E9CD4C |

Numbering here is real information (printing order = year). ja uses 大字, zh 大写 (柒 not 漆, 陆 not 陸), en Roman numerals I–VIII in Martian Mono.

**Separations mechanics.** `html[data-sep-off~="N"]` hides plate N **only in decorative layers**: elements carrying `data-plate="N"` (pseudo-element colour plates, SVG fills, today's print). Text never disappears; plate 1 cannot be hidden. Plates 2–8 rows in the panel are "un-inked" (outlined, empty swatch) until the visitor passes the chapter that adds them (`ctx.print.ink(n)`).

### 3.3 Typography

**Base system (constant connective tissue — every page, every section)**

| Role | ja | en | zh-Hans | Weights / axes |
|---|---|---|---|---|
| Body | IBM Plex Sans JP | IBM Plex Sans | Noto Sans SC | 400, 500 (Plex Sans: `wdth 85–100`) |
| Chrome / HUD / rulers / readouts | Martian Mono + body face for CJK glyphs | Martian Mono | Martian Mono + Noto Sans SC | `wdth 75–112.5`, `wght 300–600` |
| Code | IBM Plex Mono | IBM Plex Mono | IBM Plex Mono | 400, 500 |

Line height: ja 1.85, zh 1.8, en 1.55. Measure: ja 30–40 字, zh 28–36 字, en 60–72 ch. Body 16 px (all languages).

**Display voice per section (one voice per section; ≤ 3 display faces in any viewport)**

| Section | ja | en | zh-Hans | Notes |
|---|---|---|---|---|
| cover | **Shippori Mincho B1** 800, vertical | **Bodoni Moda** Italic, opsz 96, wght 500→700 tied to baren pressure (peel) | **Noto Serif SC** 900, vertical | Name only; facts in body face |
| summary | IBM Plex Sans JP 700 + Martian Mono numerals ("the house voice") | **Schibsted Grotesk** 700 | Noto Sans SC 700 | Deliberately plain: the proof sheet |
| road | **Zen Antique**, vertical 詞書 (縦中横 years) | **Big Shoulders** 700, opsz 72 (years, stations) | **ZCOOL XiaoWei** (horizontal only) | Edo–Meiji signage voice |
| works | **Dela Gothic One** (titles) + **Shippori Antique B1** (問・術・答・省 labels) | **Bricolage Grotesque** wdth 75, opsz 96, 700 | Noto Sans SC 900 | Poster weight beside gold |
| skills | **DotGothic16** (labels, readouts) | **Handjet** counters (ELSH 0→16 on selection) + Martian Mono | **ZCOOL QingKe HuangYou** (horizontal only) | Grid-built letterforms = joinery |
| principles | **Zen Old Mincho** 400/700, vertical columns | **Newsreader** 300, opsz 72 | Noto Serif SC 300 (vertical allowed) | Quiet, most 余白 |
| achievements | **Kaisei Tokumin** 800 (banzuke, vertical); Shippori Mincho B1 800 for 大字 on seals | **Gloock** (numerals, seals) | Noto Serif SC 900 (banzuke; 大写 on seals) | One ink |
| writing | **Yuji Mai** (repo/essay titles) | Newsreader Italic 400 | **Ma Shan Zheng** (titles, horizontal only) | Brush on decorated paper |
| testimonials | **Kaisei HarunoUmi** 400/700 (quotes, vertical ≥ 1024 px) | Newsreader opsz 24, Italic 400 | Noto Serif SC 400 quotes + **Zhi Mang Xing** signatures (horizontal) | |
| contact | **Klee One** 600 (letter; palt-capable) | Bodoni Moda Italic (bookends the cover) | **Long Cang** (letter, horizontal only) | A handwritten letter |
| colophon | Shippori Antique B1 (headings, 大尾) | IBM Plex Mono | Noto Serif SC 300 | Book back-matter |

Family counts: ja 10 display, en 7, zh 7 (Noto Serif/Sans SC double as display weights). Unity comes from: the constant body + Martian Mono chrome, the kentō/トンボ marks, colour tokens, and one shared device — a vertical 詞書 column (`.tate`) that appears in every section at least once in ja and zh (stage line or caption); in en the stage line is set in Martian Mono small caps beside the heading.

**Vertical-writing rules**
- May be set vertically: Shippori Mincho B1, Shippori Antique B1, Zen Antique, Zen Old Mincho, Kaisei Tokumin, Kaisei HarunoUmi, Klee One, Yuji Mai, DotGothic16, IBM Plex Sans JP, Noto Serif SC, Noto Sans SC.
- **Never vertical**: ZCOOL XiaoWei, ZCOOL QingKe HuangYou, Ma Shan Zheng, Zhi Mang Xing, Long Cang (no `vert`/`vmtx`), and every Latin face (Latin inside vertical runs rotates with `text-orientation: mixed`; acronyms ≤ 3 letters upright).
- zh vertical only for short display (titles, seal captions, banzuke); zh body is horizontal (CLREQ).
- `.tate { writing-mode: vertical-rl; text-orientation: mixed; font-feature-settings: "vpal" 1; line-height: 1.9; }`, `.tcy { text-combine-upright: all; }` for 2–3 digit numbers, `em` → `text-emphasis: filled sesame` (傍点, no italics in CJK).
- Every element containing CJK text carries the correct `lang` (`ja` / `zh-Hans`). Japanese colour names shown in zh UI are wrapped `<span lang="ja">` and fall back to Noto Serif SC.

**CJK CSS (verbatim from *aesth* §4.5, owner WP-00 `src/styles/type.css`)**
```css
:lang(ja)      { font-family: var(--f-body-ja); line-height: 1.85; line-break: strict; }
:lang(zh-Hans) { font-family: var(--f-body-zh); line-height: 1.8;  line-break: strict; }
:lang(en)      { font-family: var(--f-body-en); line-height: 1.55; }
:lang(ja) :is(h1,h2,h3), :lang(zh-Hans) :is(h1,h2,h3) { font-feature-settings: "palt" 1; }
:lang(ja), :lang(zh-Hans) { text-spacing-trim: trim-start; text-autospace: normal; }
:lang(ja) :is(h1,h2,h3) { word-break: auto-phrase; }
.display { text-box: trim-both cap alphabetic; }
ruby rt { font-size: .5em; }
/* faces without palt (Shippori, Zen *, Kaisei *, Yuji): add tracking .04–.12em on display sizes */
```

**Stacks and fallbacks** (`--f-*` custom properties in `type.css`)
- `--f-body-ja: "IBM Plex Sans JP", "Hiragino Sans", "Yu Gothic UI", "Noto Sans JP", sans-serif`
- `--f-body-zh: "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif`
- `--f-body-en: "IBM Plex Sans", "Plex Fallback", Arial, sans-serif` — `Plex Fallback` is an `@font-face` over `local("Arial")` with `size-adjust`/`ascent-override` tuned by WP-02 so cover and summary paragraphs reflow ≤ 2 % on swap.
- `--f-mono: "Martian Mono", ui-monospace, "SFMono-Regular", Menlo, monospace`; `--f-code: "IBM Plex Mono", ui-monospace, monospace`.
- Serif fallbacks for ja display: `"Hiragino Mincho ProN", "Yu Mincho", serif`; zh: `"Songti SC", "SimSun", serif`.
- All faces `font-display: swap`; **before any display-text animation**, `await document.fonts.load('<weight> 1em "<Family>"', '<sample>')`.

**Delivery strategy (production makes zero requests to Google)**
- `scripts/fonts/fetch-fonts.mjs` (WP-02) calls the Google Fonts CSS2 API with a modern Chrome UA, downloads every referenced `woff2` into `public/fonts/<family-slug>/`, rewrites URLs to relative paths and writes `public/fonts/fonts-ja.css`, `fonts-en.css`, `fonts-zh.css` plus `fonts-shared.css` (Martian Mono, IBM Plex Mono). Each page links only its language file + shared. Licences (OFL/Apache) copied to `public/fonts/LICENSES/`.
- **Body faces**: full unicode-range-sliced CSS (browser fetches only slices it renders).
- **CJK display faces**: one `&text=` subset per (language, family, weight). Characters = all strings that section renders in that face (from `src/content/**` plus each section's `strings.ts` `display` export) + digits, 「」『』、。・ー—…〜（）. Measured 1.5–6 KB per subset; ≤ 50 KB per language total. **Re-run whenever copy changes** (WP-11 runs it last).
- **Latin display faces**: `latin` + `latin-ext` slices only.
- Preload only the cover display subset for the page language and Martian Mono's latin slice.

Exact CSS2 family specs (axes listed lowercase-first, alphabetical, as the API requires):

```text
# body / chrome / code
IBM+Plex+Sans+JP:wght@400;500
IBM+Plex+Sans:wdth,wght@85..100,300..700
Noto+Sans+SC:wght@400;500
Martian+Mono:wdth,wght@75..112.5,300..600
IBM+Plex+Mono:wght@400;500
# ja display (each fetched with &text=<subset>)
Shippori+Mincho+B1:wght@800 · Zen+Antique · Dela+Gothic+One · Shippori+Antique+B1 · DotGothic16
Zen+Old+Mincho:wght@400;700 · Kaisei+Tokumin:wght@800 · Yuji+Mai · Kaisei+HarunoUmi:wght@400;700
Klee+One:wght@600 · IBM+Plex+Sans+JP:wght@700
# en display (latin, latin-ext slices)
Bodoni+Moda:ital,opsz,wght@1,6..96,400..700 · Schibsted+Grotesk:wght@400..800
Big+Shoulders:opsz,wght@10..72,100..900 · Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,200..800
Handjet:wght,ELGR,ELSH@100..900,1..2,0..16 · Newsreader:ital,opsz,wght@0,6..72,200..800;1,6..72,200..800 · Gloock
# zh display (&text=<subset>)
Noto+Serif+SC:wght@200..900 · Noto+Sans+SC:wght@700;900 · ZCOOL+XiaoWei · ZCOOL+QingKe+HuangYou
Ma+Shan+Zheng · Zhi+Mang+Xing · Long+Cang
```

Dev-only preview URL per language (designers may paste into a scratch HTML; never used by the site):
`https://fonts.googleapis.com/css2?family=<spec>&family=<spec>…&display=swap` with the body + display specs of that language. If the API returns 400 for a spec (axis range mismatch), WP-02 narrows the range to what `fonts.google.com/metadata/fonts` reports and records it in its report.

**Type scale** (`tokens.css`)
```css
--fs-chrome: 10px; --fs-caption: 12px; --fs-small: 14px; --fs-body: 16px;
--fs-lead: clamp(18px, 1.1vw + 12px, 22px); --fs-h3: clamp(20px, 1vw + 14px, 26px);
--fs-h2: clamp(28px, 2.4vw + 12px, 52px); --fs-display: clamp(48px, 6vw + 16px, 128px);
--fs-hero: clamp(64px, 9vw, 152px);
```

### 3.4 Spacing, grid, breakpoints

- Base unit 8 px. `--s-1 4px · --s-2 8px · --s-3 12px · --s-4 16px · --s-5 24px · --s-6 32px · --s-7 48px · --s-8 64px · --s-9 96px · --s-10 128px · --s-11 192px`.
- Breakpoints: `xs < 480`, `sm 480–767`, `md 768–1023`, `lg 1024–1439`, `xl ≥ 1440`. Film portrait variant: `(max-aspect-ratio: 4/5)`.
- Artboard: full viewport width minus chrome (desktop: 20 px left ruler; the Layers panel overlays, never pushes). Inner margin: xl/lg 64 px, md 40 px, sm/xs **16 px gutter**. Columns: 12 (lg+, 24 px gutter), 8 (md, 20 px), 4 (sm/xs, 16 px). No horizontal page scroll at any width ≥ 320 px.
- Vertical rhythm on an 8 px baseline; section padding 96–160 px desktop, 64–96 px mobile.
- **余白 rule**: at least 38 % of every artboard's area carries no ink (WP-11 spot-checks with a screenshot luminance script).
- Asymmetry is the default: no centred hero, no symmetric three-card rows. Compositions use byōbu panel ratios (1 : 2.75), ōban (1 : 1.47) and the 匡郭 book spread.

### 3.5 Frames, rules and marks (anti-"AI look")

- `--radius: 0` everywhere. No `box-shadow`, `filter: drop-shadow`, `backdrop-filter`, glow, glass.
- **Print-production marks replace borders.** Shared CSS classes (WP-00 `src/styles/marks.css`):
  - `.kento` — 鉤見当 L-mark (14 px arms, 2 px, `--rule`) at lower-right, plus 引付見当 straight mark (2 × 28 px) 120 px to its left on the same edge. Every artboard and every major figure has one.
  - `.tombo` — Japanese double crop marks (two parallel 1 px lines 3 px apart, 24 px long, offset 10 px outside) at the four corners, drawn with eight `linear-gradient` backgrounds on a `::before` inset −10 px.
  - `.kyokaku` — 匡郭 frame with 子持ち罫 (3 px + 1 px, 2 px gap) for book-spread layouts (Summary, case pages, Colophon); optional 版心 fold with 魚尾 mark.
  - `.colorbar` — strip of plate swatches named in kanji, used where plates change (Separations panel, after the film).
  - `.deckle` — `mask-image` with one of four generated deckle SVGs (WP-02) for artworks; never `border-radius`.
- Line-weight vocabulary: 0.5 px guides on DPR ≥ 2 (1 px otherwise) in `--guide`; 1 px frames in `--rule`; 2 px marks; 子持ち罫 for book frames. No uniform grey 1 px boxes.
- **Focus ring = kentō**: `:focus-visible` draws four L corners (10 px arms, 2 px, `--select`) at 4 px offset via `::after` (class `.focus-kento` is applied globally to `a, button, [tabindex], summary, .panel-row`); replaced elements (`input`, `textarea`, `select`) use `outline: 2px solid var(--select); outline-offset: 3px`. Both pass 3:1 in both themes.
- Gradients only where physical: bokashi (sky/rain), 霞 mist, gold sheen, ink.
- The red seal appears at most once per artboard (exceptions: Achievements seal stones and the 割印 band).

### 3.6 Imagery treatment

- Paper colour of prints never leaks into the UI; page grounds stay cool. Prints appear inside `figure.print` on `--mat`, with `.deckle` mask and `.kento` mark.
- Every artwork caption: artist · title (ja/zh short title from `src/content/credits.ts`, en from manifest) · date · institution, in `--fs-caption` Martian Mono + body face; full `creditText` + `objectUrl` in the Colophon.
- Responsive derivatives (WP-02): AVIF + WebP at 640 / 1280 / 2000 px (never above source), `img/{set}/{slug}.{w}.{avif|webp}`; `<picture>` built by `ctx.img()` / `rc.img()` with `width`/`height`, `decoding="async"`, `loading="lazy"` (cover/summary figures: `eager`, `fetchpriority="low"`).
- Stencils (katagami) are never shown as brown sheets: thresholded at luminance 0.6 into 1-bit alpha masks, coloured with the section accent.
- Gold screens feed the byōbu shader as **pigment-alpha** textures (gold ground removed → shader gold shows through).
- Never invert, filter or recolour artworks for night; at most a static `--mat` change.
- Never keep more than ~6 full-size images decoded at once on mobile (lazy + off-screen `content-visibility: auto` only on sections that host no WebGL view, §8.7).

### 3.7 Iconography

Custom SVG only, drawn on a 24 px grid, 1.5 px stroke, square caps, mitre joins, no fills except where noted, `currentColor`. Inline strings exported from `src/core/icons.ts` (owner WP-02; WP-00 creates the file with the names below and a minimal square path each). No emoji, no icon fonts, no letters inside circles.

| Name | Drawing |
|---|---|
| `eye`, `eye-off` | Almond outline + square pupil (Illustrator style); off = diagonal stroke |
| `wheel` | Wang Zhen type wheel: circle, 3 radial spokes, small square sorts on the rim |
| `chip-day`, `chip-night` | Two overlapping squares (swatch chips), the front filled `--paper` / `--paper` night |
| `info` | Ruler corner (L with ticks) |
| `outline` | Square with diagonal cross (Illustrator outline view) |
| `proof` | Sheet with crop marks |
| `layers` | Three stacked parallelograms |
| `separations` | Four offset squares (plates) |
| `download` | Arrow into a tray |
| `copy` | Two offset rectangles |
| `external` | Arrow leaving a kentō L |
| `close` | × made of two strokes |
| `menu` | 子持ち罫: thick + thin rules |
| `play-skip` | Two chevrons → |
| `rerake` | Rake head (comb of 5 tines) |
| `ink` | Brush tip |
| `seal` | Square with notch (seal face) |
| `arrow-rtl` | ← with a kentō foot (reading direction cue) |

---

## 4. Global chrome — the 版下 workbench (owner WP-04)

Illustrator is the modern 版下, and prepress then and now is separation into plates, so the chrome is a working print-prep bench, not a costume. **Rule: the chrome never takes reading width** (overlays only; artboards reserve 20 px for the left ruler and 60 px top for doc bar + ruler; `scroll-padding-top: 72px`). Static markup comes from `src/chrome/render.ts` (included by the page renderer, so the express lane works without JS); behaviour from `src/chrome/index.ts`.

### 4.1 Desktop (≥ 1024 px)

| Element | Spec |
|---|---|
| **Document bar** (top, 40 px, `--panel`, z 20) | Left: crest (24 px SVG) · name (body 500) · `Senior Software Engineer · 8 yrs · Tokyo JST` (Martian Mono 11 px). Middle — **express lane** (always visible): 作品 Works · 履歴書 CV ▾ (menu: ja / en / zh PDF) · 連絡 Contact · 映像を飛ばす Skip the film (shown only while scroll is above the end of `#road`). Right: language wheel, theme chips, Outline, Proof, Info buttons (icons from §3.7 with visible text labels on hover/focus and `aria-label`). On the root (ja) page, if no stored preference and `navigator.languages[0]` starts with `en`/`zh`, a one-line notice appears in the bar: "Also in English →" / 「也有简体中文版 →」 (never auto-redirect). |
| **Rulers** (top 20 px under the bar; left 20 px) | 2D `<canvas>` each, Martian Mono 9 px labels, `--panel` ground, `--ink-2` ticks, `--select` cursor marker. Origin = active artboard's top-left (Illustrator CS5+ behaviour). Redrawn only while scrolling/pointer moving (coalesced to ≤ 1 draw per frame via `core/frame`). Units follow the active artboard automatically (table below); no section needs to call anything except the film, which feeds years. Martian Mono `wdth` follows scroll velocity: 75 at rest → 112.5 at fast scroll (CSS var on the ruler/status elements, updated ≤ 10 Hz). Shift+R hides/shows. |
| **Layers panel** (right, overlay, z 20) | Collapsed: 28 px strip with 12 swatches (`--layer-*`) and eyes. Expanded: 248 px, opened by click/hover-intent (300 ms)/Enter. Tabs: レイヤー/Layers/图层 · 分版/Separations/分色. Layer rows top → bottom: **Motion / 動き / 动效** (layer 12, separated by a 子持ち罫), then sections in page order. Row: eye · swatch · name (current language) · artboard index (`4/11`). Active row: its swatch shows 4 tiny square handles. Click a name → `ctx.scroll.scrollTo('#id')`. Road row expands to 7 chapter sub-layers (`2018 日本橋` …). **Eye on a section** = hide that section's decorative layer: its view parks and shows its poster, its 2D motion stops (stored in `sessionStorage`). **Eye on Motion** = global motion off (WCAG 2.2.2 pause control; §5.9). |
| **Separations tab** | Top: today's print thumbnail (120 × 176 canvas, compositor §4.4). Below: 8 plate rows — eye · swatch · daiji · name with ruby · `year · station`. Un-inked rows: outlined empty swatch, `--ink-2`, eye disabled. On `ctx.print.ink(n)` the swatch fills with a 420 ms registration snap and a 1-line `.colorbar` updates. Eye hides plate n site-wide in decorative layers (§3.2). |
| **Status bar / Info** (bottom, 24 px, z 20) | Collapsed line, Martian Mono 10 px: `霜降 · 2026-10-25 · JST 14:32 · 60 fps · 7 draws · T3 · アートボード 4/11 屏風 · X 812 Y 344 px · 100%`. `i` or click expands a 320 px sheet with tabs **情報 Info** (renderer.info calls/triangles/programs/textures/geometries summed over views; frame-time graph of last 120 frames with budget line; per-view CPU ms labelled in print terms — 主版 cover, 金箔 works, 組子 skills, 砂紋 principles, 砂子・空摺 achievements, 墨流し writing, 暖簾 testimonials, 落款 contact, 巻子 colophon, 仕上 post; DPR; tier; governor's last decision; live views; film variant, frame `f 212/480`, seek ms mean/p95; bytes transferred (Resource Timing); LCP/INP/CLS; JS heap where exposed; GPU string; edition line; sample notice), **用語 Glossary** (terms with ruby and a one-line gloss per language), **設定 Settings** (Theme: Auto/本摺/石摺; Motion on/off; Keyboard shortcuts on/off; Quality: Auto/High/Medium/Low/Static → `?tier=`; Proof mode; Rulers). |
| **Selection boxes** (fine pointer only) | Hovering any `[data-select]` (headings, figures, metric numbers, view placeholders) draws one reused overlay: 1 px box in the section's `--layer-*`, 8 hollow 6 px square handles + centre point, and a label above-left: `Dela Gothic One 400 · 128px · 紺 #0F2540` (first family of computed `font-family`, computed size, colour → nearest token name/source via `src/core/palette.ts`). Computed on `pointerenter`, hidden while scrolling. |
| **Smart guides** | `ctx.chrome.smartGuide(x, y, label)` shows a magenta (`--select-text`) label — "anchor", "intersect", 「消点」 — for 900 ms. Used by the crest construction and the Summary guides. |
| **Outline (keyline) view** | Button, Shift+Y, `y`, and Ctrl/⌘+Y (best-effort `preventDefault`, only while the document has focus). `html[data-view="outline"]`: artboard backgrounds transparent with 1 px `--rule` outlines; display headings become 0.6 px strokes (`color: transparent; -webkit-text-stroke`), body text switches to `--ink-2` (stays readable); every `figure.print` hides its image and shows a crossed box labelled with its filename (`data-file`); `stage.setOutline(true)` → each view's `setOutline()` renders wireframe/edges; the film shows the current chapter still as a crossed box labelled `keyframe ch-N`. |
| **Peek the GLSL** | Each live view gets a 10 px square anchor at its top-left corner (layer colour, focusable). Activating opens a panel with that view's fragment shader source (read-only, Plex Mono, copy button) and its `renderer.info` share. |

**Ruler units by artboard**

| cover | summary | road | works | skills | principles | achievements | writing | testimonials | contact | colophon |
|---|---|---|---|---|---|---|---|---|---|---|
| 寸 (ōban sheet) | px | **years 2018 → 2026, right to left** (film calls `ctx.chrome.setRulerYears(p)`) | 尺 (screen height) | 寸 + 裏目 √2 secondary scale (carpenter's square) | 間 (ken, 1.82 m) | px | px | px | 里 — reads 百二十六里 at the Kyoto print | mm (print) |

### 4.2 Mobile (< 768 px) and tablet (768–1023 px)

- Mobile: document bar 48 px = crest + name + menu button. A **2 px progress ruler** at the very top in the active `--layer-*` colour replaces rulers. No selection boxes, no status bar, no peek anchors. A bottom toolbar (52 px + `env(safe-area-inset-bottom)`, `--panel`, top edge 子持ち罫) holds: Layers · 分版 · 情報 · language wheel · theme chips; each opens a **bottom sheet** (max 70 svh, square corners, drag handle = three short rules). Express links (Works · CV · Contact) are the first row of the Layers sheet and plain links on the cover.
- Tablet: top ruler only (16 px), Layers collapsed strip, status bar collapsed.

### 4.3 Language, theme, cursor, skip

- **Language — Wang Zhen's revolving type wheel** (王祯 转轮排字架). A 40 px SVG wheel with three sectors labelled in their own faces (日本語 · English · 简体中文). Underneath it is a real `<nav aria-label>` with three `<a hreflang>` links (keyboard/AT path). Hover/focus prefetches the target page and its font CSS + cover subset (`<link rel="prefetch">`). On activate: store `{section, offsetWithinSection}` in `sessionStorage['hanmoto.pos']` and `localStorage['hanmoto.lang']` (try/catch), rotate the wheel 120°/240° with `--ease-ha` (≤ 400 ms, the spin covers font resolution), then navigate. The new page restores the position before first paint (inline script reads `hanmoto.pos`), and its visible `[data-print]` headings run the registration snap; the cover name runs the **sort drop** (§5.6). Cross-document View Transition: `@view-transition { navigation: auto; }`; the doc bar and rulers carry `view-transition-name` so they stay still.
- **Theme — 本摺 ⇄ 石摺** (en "Brocade ⇄ Stone rubbing", zh 「套色 ⇄ 拓印」): two chip buttons with `aria-pressed`. No sun/moon icons. Default follows `prefers-color-scheme` (day when no preference). Choosing sets `data-theme="light"|"dark"` on `<html>` and stores it (try/catch); Settings → Auto removes it. The switch is a same-document View Transition: `::view-transition-new(root)` animates a registered `@property --wipe` (percentage 0 % → 112 %) inside `mask-image: linear-gradient(to bottom, #000 calc(var(--wipe) - 12%), transparent var(--wipe))` over 700 ms `--ease-ha` — an **ichimonji-bokashi** band wiping down. In parallel the stage tweens `uNight` over 700 ms (scenes are relit, not inverted, §6). Fallback: instant swap.
- **Cursors** — native, never a follower: classes `.cur-gouge` (carved block), `.cur-baren` (peelable sheet corner, take-a-print sheet), `.cur-hand` (byōbu), `.cur-direct` (kumiko strips, Illustrator direct-selection arrow), `.cur-rake` (sand), `.cur-brush` (marbling tray), `.cur-seal` (seal stones, send button). `cursor: url(cursors/x.png) hx hy, auto;` then `cursor: image-set(url(cursors/x.png) 1x, url(cursors/x@2x.png) 2x) hx hy, auto;`. Defined in `src/chrome/cursors.css`; sections only add the class.
- **Skip links**: first focusable `本文へスキップ / Skip to content / 跳到正文` → `#main`; `映像を飛ばす / Skip the film / 跳过影片` above `#road` and in the express lane → `#works`.
- **Proof mode (校正刷り / Proof / 校样)** — the recruiter view: `?proof=1` or the Proof button sets `html[data-proof]`; boot skips the stage and film player; sections render text-first in one column with crop marks; film chapters become stills in flow with captions. It is the same stylesheet as print (`src/chrome/print.css`), which produces the CV PDFs (§13, WP-11). Turning Proof off reloads the page.

### 4.4 Today's print compositor (WP-04, `src/chrome/print-compositor.ts`)

Canvas2D only. Inputs: plate SVGs `public/print/plate-{1..8}.svg` and `public/print/cartouche-mask.svg` (WP-02; viewBox 0 0 1240 1824, ōban portrait), `ctx.print` state (inked plates, hidden plates, seed, marbling canvas, seal). Draw order: `--paper-print` ground → plates 2–8 with `globalCompositeOperation = 'multiply'` (authentic overprint), each offset by seeded misregistration (thumbnail ±0–2 px, full size ±0–6 px, rotation ≤ 0.3°) → marbling clipped to the cartouche → key block (plate 1) on top → seal impression at lower left (default 湊 seal until the visitor stamps). Composition: crest top-right; name vertical (ja/zh) or two stacked lines (en); the Tōkaidō key line running right → left down the sheet with 7 station marks; plate 2 hills, 3 mist bands, 4 dawn bokashi, 5 river, 6 deep river and title cartouche, 7 rain bokashi lines, 8 gold suyari bands. API: `renderPrint(canvas, widthPx)`. Full-size download: 1240 × 1824 PNG desktop, 620 × 912 on `(pointer: coarse)` (memory cap).

### 4.5 Keyboard map (toggleable in Settings, WCAG 2.1.4; inactive while focus is in a text field)

`i` Info · `y` / Shift+Y / Ctrl⌘+Y Outline · Shift+R rulers · `[` `]` previous / next section · `Esc` closes panels, sheets, dialogs · inside Works: ← next panel (reading order is right → left), → previous · Ctrl/⌘+R is never captured.

---

## 5. Motion language

### 5.1 Principles

Things move like **paper, wood, ink, water, stone, cloth and gold**. Nothing floats, glows, bounces cartoonishly or glitches. Content never waits on animation: **key-block text is real HTML at first paint and is never animated from invisible**; only decorative colour plates, guides and 3D move.

### 5.2 Four verbs (used site-wide so eleven sections read as one print run)

| Verb | Meaning | Behaviour |
|---|---|---|
| **摺る** *suru* — print-in | Colour plates arrive and register | Decorative plates (pseudo-elements / `aria-hidden` layers) arrive 2–6 px and ≤ 0.3° off, opacity 0 → .92, then spring into register with `--ease-register` over 420 ms (≤ 1 px overshoot). |
| **引く** *hiku* — draw | Lines draw in compass-and-ruler order | `stroke-dashoffset` on SVG paths, ordered: construction circles → lines → intersections → anchors/handles → fill. `--ease-jo`. |
| **霞む** *kasumu* — mist | Mist or gold-cloud bands wipe across | Transform-only translation of SVG band shapes, right → left. |
| **捲る** *mekuru* — fold/lift | Folds, lifts, peels, rolls | Vertex-shader curls (WebGL) or CSS 3D `rotate3d` on panels (fallback). |

### 5.3 Easing and durations (`src/styles/tokens.css` + `src/core/easing.ts`, owner WP-00)

```css
--ease-jo: cubic-bezier(.45, 0, .2, 1);                                  /* 序: slow, airy */
--ease-ha: linear(0, .03 15%, .10 35%, .35 60%, .60 80%, .85 93%, 1);   /* 序破急 curve (aesth §3.10) */
--ease-kyu: cubic-bezier(.2, .9, .1, 1);                                 /* 急: decisive */
--ease-register: linear(0, .133 7.1%, .403 14.3%, .676 21.4%, .886 28.6%, 1.015 35.7%, 1.074 42.9%,
  1.086 50%, 1.071 57.1%, 1.047 64.3%, 1.024 71.4%, 1.007 78.6%, .998 85.7%, .993 92.9%, 1);
  /* damped spring k=380, c=24, m=1 sampled over 420 ms: 8.6 % overshoot → ≤ 0.5 px on a 6 px offset */
--dur-micro: 140ms; --dur-kyu: 220ms; --dur-register: 420ms; --dur-ha: 600ms; --dur-jo: 1200ms;
```
`easing.ts` exports the same curves as functions (`johakyu(t)`, `register(t)`, `jo(t)`, `kyu(t)`) for GSAP (`ease: johakyu`) and shaders (precomputed 64-entry LUT `Float32Array`). Ranges: jo 900–1400 ms, ha 500–700 ms, kyū 180–260 ms, micro 120–160 ms. Section entrances use jo; in-section reveals ha; UI responses kyū/micro.

### 5.4 序破急 at three scales

1. **Page**: 序 cover/summary (few elements, long scroll per change, ≥ 38 % 余白) → 破 road/works/skills/principles (density and motion rise) → 急 achievements → colophon (short, decisive, then stillness).
2. **Section**: each artboard enters slowly, develops, resolves fast, then holds its 間 band.
3. **Curve**: `--ease-ha` itself.

### 5.5 Registration snap (`data-print`) — the signature

Markup: `<h2 class="display" data-print data-plate="6" data-print-shape="block">…</h2>`. `ctx.motion.registerSnap(root)` (WP-00) attaches an IntersectionObserver (threshold 0.35); on enter it adds `.is-printed`. CSS (WP-00 `motion.css`): the element's `::before` (shape `block`: a deckled colour area behind the heading at the plate's fill, 18–40 % of the heading box) and optional `::after` (shape `band`: a bokashi band) start at `translate(var(--mx), var(--my)) rotate(var(--mr))` with `--mx/--my ∈ ±(2…6) px`, `--mr ∈ ±0.3°` (seeded per element from `ctx.print.seed`), and animate to zero with `--ease-register`. Where `animation-timeline: view()` is supported, the snap is scroll-driven (`animation-range: entry 20% cover 35%`); otherwise the class toggle triggers a 420 ms transition. Under reduced motion the plates are simply registered.

### 5.6 Split text — exactly one use

Only the cover name, only on arrival via the language wheel: GSAP SplitText splits into characters (parent keeps `aria-label`, spans `aria-hidden`); each character drops 2 px from above into place, 30 ms stagger, total ≤ 400 ms, after `document.fonts.load()` resolves. Nowhere else.

### 5.7 間 bands

15–25 vh at the end of every section (table §2.2), exactly one small thing happens, no reading text inside. Bands are DOM, `aria-hidden`, and collapse to 8 vh under reduced motion and in Proof mode.

### 5.8 Scroll and clock stack (owner WP-00)

- **One clock** — `src/core/frame.ts`: a single rAF loop that runs only while something needs it: Lenis is animating, a view requested a frame, a GSAP tween is active, or a module holds a busy token. Each tick: `lenis.raf(t)` → `gsap.updateRoot(t / 1000)` (GSAP's own ticker is detached with `gsap.ticker.remove(gsap.updateRoot)`) → `stage.frame(t)` → registered callbacks. The loop stops after two idle frames: **zero rAF at idle**. (The film controller may keep its own idle-stopping rAF per *video* §4.3.)
- **Lenis 1.3.27**: `{ lerp: 0.1, smoothWheel: true, syncTouch: false, anchors: true, autoRaf: false, prevent: n => !!n.closest?.('[data-lenis-prevent]') }`; `lenis.on('scroll', ScrollTrigger.update)`. Destroyed (native scroll) when motion is disabled, on coarse pointers it only smooths wheel (touch stays native). Import `lenis/dist/lenis.css`. Never `html { scroll-behavior: smooth }`; never `ScrollTrigger.normalizeScroll()`.
- **GSAP 3.15.0 + ScrollTrigger**: **progress only** (`onUpdate`, `onToggle`), never `pin`, never `scrub` tweens on media. `ScrollTrigger.config({ ignoreMobileResize: true })`; `ScrollTrigger.refresh()` after `document.fonts.ready` and after images above the film have dimensions. CustomEase not needed (function eases). SplitText only per §5.6.
- **Sticky, not pin**: stages are `position: sticky; top: 0; height: 100lvh` inside taller sections; ancestors use `overflow: clip` (never `hidden/auto/scroll`); sticky children of grid/flex parents get `align-self: start`. `lvh`/`svh` only, never `dvh`, in scroll geometry.
- **CSS scroll-driven animations** (`view-timeline`, `animation-range`) are preferred for 2D (captions, band DOM, 割印, plate snaps, panel folds on mobile), wrapped in `@supports (animation-timeline: view())`, with a `ctx.scroll.track()` GSAP fallback. Animate only `transform` and `opacity` (plus `clip-path`/`mask-position` on small elements). `will-change` is set only while an animation runs.

### 5.9 Reduced motion and the Motion layer

`ctx.motion.enabled = !matchMedia('(prefers-reduced-motion: reduce)').matches && motionLayerVisible`. When false:
- Lenis destroyed; native scroll. Plates appear registered. Bands jump to their end state with ≤ 160 ms opacity crossfades.
- Stage: `g.uMotion = 0`, render on demand (one frame on enter/resize/theme/lang); scroll-linked 3D movement becomes discrete crossfades between rest poses; ambient motion (cloth wind, gold flicker, rain) stops.
- Film: **static tier** (chapter stills in normal flow with captions; *video* §5.4).
- User-initiated interactions still work, without long tails (rake strokes, marbling drops appear at full size, take-a-print is instant, seals stamp instantly).
- Hiding the Motion layer is the in-page WCAG 2.2.2 control; it also stops anything that moves for > 5 s on its own.

---

## 6. Sections

Common to every section:
- `render.ts` returns the complete `<section>` HTML with **all real text** (SSG, §8.4). `index.ts` enhances it (`mount`). `view.ts` (if any) is the WebGL view, lazy-loaded by the stage.
- First child: `<header class="artboard__head">` with the `h2` (display face, `data-print`, `data-select`), the **stage line** (`.tate` vertical 詞書 in ja/zh, small caps line in en) and the **takeaway** (`p.takeaway`, body face, `--fs-lead`, never animated). Last child: the 間 band (§2.2), except Colophon.
- Each section has `.kento` + `.tombo` marks, its `--layer-*` selection colour, its accent pair, and its display face (§3.3).
- Content comes only from `ctx.content` / `rc.content` (Appendix A). Micro UI strings (buttons, aria-labels, hints ≤ 8 words) live in the section's own `strings.ts` (`Record<Lang, …>`).
- Every WebGL view: `aria-hidden` canvas, a DOM equivalent of all its information, a poster (`--poster` CSS var on the placeholder, day/night × desktop/mobile AVIF), `setOutline`, tier-scaled counts via uniforms/draw ranges, `uNight` relighting, `uMotion` scaling of time-driven terms, `park()` freeing render targets, deterministic re-seed on context restore.

### 6.1 `cover` — 表紙 · 摺上り The Impression (WP-05)

**Purpose.** In 6 seconds: who, level, specialty, availability, how to reach — in HTML. Then one quiet shock: the name on the sheet was printed from a mirror-carved block.

**Content keys** (`copy.cover`, `facts.person`): `layer, title, stage, takeaway, name, nameLines (en: "Minato|Segawa"), role, facts.{years, specialty, location, availability, languages}, express.{works, cv, contact, skipFilm}, peelHint, blockCaption`; `facts.person.nameRuby`; key-line years 2018…2026 are constants and station names come from `facts.stations`. `blockCaption` = 「表は、彫られた裏の鏡像である」 / "Every interface is the mirror of what was carved beneath it" / 「每个界面，都是其下所刻之物的镜像」.

**Layout — desktop.** Section **160 vh**, sticky stage 100 lvh (60 vh of scrub). 12-col artboard:
- Top-left: the personal crest **丸に三つ組子** (64 px), drawn live.
- Cols 1–5, bottom-aligned at 64 % height: role (`--fs-lead`, Plex 500), takeaway, a `<dl>` of facts (8 years · since 2018-04; specialty; Tokyo · live JST clock; available from 2027-01; ja native · en professional · zh HSK 5), express links (Works · CV PDF ja/en/zh · Contact).
- Cols 6–12: **the print sheet** — ōban portrait 1 : 1.47, height 78 lvh, `--paper-print`, `.deckle`, `.tombo`, `.kento`. On it: the name (`h1`) vertical at the sheet's right in `--fs-hero` (ja Shippori Mincho B1 800 with `<ruby>`; zh Noto Serif SC 900; en two stacked lines of Bodoni Moda Italic at the sheet's lower-left, with the ja name small and vertical at top-right, `lang="ja"`); the role as a second vertical column (ja/zh); the **Tōkaidō key line** — one continuous `--plate-1` SVG line running right → left across the sheet's lower third with 9 ticks (2018…2026, Martian Mono 9 px) and 8 tiny station names (body face). The career is mapped before it is told.
- Mobile: section 130 vh; sheet first (full width, 1 : 1.25, ≤ 60 svh), facts below, crest in the doc bar.

**2D motion.** Crest construction (引く, 1.6 s on load): cyan circles R, 0.84 R, 0.52 R and three radii → magenta "intersect" labels at the triangle vertices → Illustrator anchors and handles on the strip outlines → fill `--ink`, guides fade. Key line draws right → left (1.2 s) and its ticks print in (摺る). Live JST clock updates once a minute (`setTimeout`, never rAF). The name never animates (except §5.6 sort drop after a language switch).

**3D — view `cover-block`: the mirror-carved cherry woodblock under the sheet.**
- *Placeholder*: `.cover__stage` = cols 6–12 × full stage height (room for the curl).
- *Scene*: (1) **block** — slab 1.04 × sheet size, thickness 6 % of width; top face `PlaneGeometry` (256² / 128² / 64² segments) displaced by the carve height; sides plain wood; underside carries the 版下 texture (`hokusai/manga-perspective` 1280 px) for the band flip. (2) **sheet** — `PlaneGeometry` (128×190 / 64×96 / 32×48) with a `CanvasTexture` of the print, peeled from its lower-right corner by a vertex-shader cylinder curl (roll line advances with `uPeel`, radius 0.08 of width); back face = paper back with 8 % mirrored show-through.
- *Carving* via the shared module `src/gl/carve` (§8.5): input canvas (1024 / 768 / 512 px square) with crest + name + key line drawn **mirrored** (`scale(-1,1)`), white on black, using the same loaded fonts (`document.fonts.load` first) → GPU jump-flood distance field (log2(res) passes) → height profile: raised printing faces h = 1 inside glyphs; 60° V-cut walls over 6 px; ground h = 0 with round-chisel gouge marks (noise along the grain). Normal map computed once into an RT. JFA ping-pong RTs are freed after carving.
- *Material*: custom `ShaderMaterial` (stable program key). Wood albedo `--wood` → `--wood-2` on cut walls with anisotropic yamazakura grain (fbm stretched along x + growth-ring lines); **ink only on raised faces**: `--plate-1` wet ink, roughness 0.25 vs wood 0.7. Lights: day = north-window key from upper-left, elevation 25°; night (`uNight`) = warm andon point light (#FFB46B) low-right + faint cool moon fill. Pointer tilts the block ±6° (critically damped). After the peel, light elevation lowers 25° → 12° (raking) and the DOM caption appears.
- *Uniforms*: `uPeel, uCarve, uTilt (vec2), uLightEl, uFlip, tHeight, tNormal, tSheet, tHanshita` + globals (`uTime, uNight, uMotion, uOutline`).
- *Scroll map* (section scroll q over 60 vh): `uPeel = smoothstep(0, 40vh)`; light lowers and caption fades in over 40–60 vh. Band `cover-summary`: `uFlip` 0 → 1.
- *Pixel-identical swap*: once the view is live, fonts are loaded and its first frame is drawn, set `.cover__sheet[data-gl="on"]`: printed text gets `color: transparent` (stays selectable and accessible), SVG crest/key line `opacity: 0`; the canvas sheet is drawn from DOM geometry (`Range.getClientRects()` per character, computed font) so the swap is invisible (≤ 1 px). On context loss remove `data-gl`.
- *Hint*: 2 s after the swap, the sheet's lower-right corner lifts 3° showing a sliver of wood (`.cur-baren` on that corner). No further nagging.
- *Re-carve*: arriving via the language wheel (`sessionStorage['hanmoto.langSwitched']`), `uCarve` sweeps 0 → 1 over 900 ms (gouge strokes advance across the block).
- *Tiers*: high carve 1024, block 256², sheet 128×190; medium 768, 128², 64×96; low 512, 64² + normal map (no displacement), 32×48; software → poster + CSS peel; static → DOM sheet with the block poster beside it.
- *Budget*: ≤ 3 draw calls; ≈ 25 MB VRAM (height + normal 1024² RGBA8, sheet texture ≤ 2048 px tall).

**Fallbacks.** T1/software: CSS peel — `.cover__sheet` `clip-path` polygon trims the lower-right corner by a CSS scroll-driven animation while a `::after` curl triangle (bokashi gradient) follows it, revealing a pre-rendered AVIF of the carved block beneath. Reduced motion/static: sheet stays; block poster sits beside it at 60 % size with the caption.

**Transition out** `cover-summary` (owner WP-05): §2.2.

### 6.2 `summary` — 覚書 · 版下 The Drawing (WP-05)

**Purpose.** Impact first: three sentences, four dated results, the career ledger, overlap hours. The GPU rests here (2D only).

**Content keys** (`copy.summary`): `layer, title (「八年を三行で」 / "Eight years in three sentences" / 「三句话说八年」), stage, takeaway, paragraphs[3], resultsTitle, results: MetricId[4] = ['frame','thru','deploy','mttr'], nowTitle, now, ledgerTitle, ledgerColumns.{company, role, dates, scope}, ledger[] (employer, role, from, to, scope — includes promotions), overlapTitle, languagesLine, educationLine, figure.{file:'hokusai/manga-perspective.jpg', caption, alt}`.

**Layout — desktop.** A `.kyokaku` book spread with a 版心 fold at 54 %: left page (cols 1–6): `h2`, takeaway, 3 paragraphs, the four results, the "now" note. Each result: number in Martian Mono 500 at `--fs-display` (e.g. `38 → 9 ms`), label, period, context; its baseline sits on a cyan guide line that continues from Hokusai's own construction lines across the spread; beside it an Info readout `X 812 Y 344` (its real artboard position, Martian Mono 10 px, `--guide-label`). Right page (cols 7–12): the Hokusai perspective page (`figure.print.deckle`, 46 % width, `data-handoff="hanshita"`) with the SVG guide overlay; beneath it languages, education and live overlap hours ("Europe 16:00–19:00 JST · now 08:12 in Berlin"). Full width under the spread: the **career ledger** `<table>` (company · role · dates · scope; three employers, four roles).
- Mobile: single column (takeaway, paragraphs, results, figure, ledger as a `<dl>`, overlap).

**2D motion.** Guides (`src/sections/summary/guides.ts`: vanishing lines and room-box diagonals traced by WP-05 in normalised image coordinates) draw with a CSS `view-timeline` (引く), extend into the left page and hit the four result baselines; smart-guide labels "intersect" at crossings; result plates snap (摺る, plate colours 6/5/2/7). Typography: Plex Sans JP 700 / Schibsted Grotesk 700 / Noto Sans SC 700 headings, Martian Mono numerals.

**Transition out** `summary-road` (owner WP-05): match cut — §2.2. Reads `filmManifest.matchVp` (landscape) / `matchVpPortrait`.

**Reduced motion.** Guides drawn, plates registered.

### 6.3 `road` — 道中 The Road (WP-06; film production WP-03, §7)

**Purpose.** The career, year by year, as a continuous journey — the one scroll-scrubbed film.

**Content keys** (`copy.road`, `facts.career[7]`, `facts.stations`): `layer, title, stage, takeaway, skip, directionNote ("Read right to left, as the road runs from Edo to Kyoto."), refLabel (原画 / Original print / 原作), yearUnit`; per chapter: `n, year, station, employer, role, headline, scope, outcomes[2], plate, metrics[]`.

**DOM** (extends *video* §4.1): skip link before the section; `<section id="road" class="film">` 800 lvh with `view-timeline: --film block`; sticky `.film__stage` 100 lvh (`overflow: clip; contain: layout paint`) holding, bottom → top: `<video class="film__video" muted playsinline disablepictureinpicture disableremoteplayback preload="none" aria-hidden="true" tabindex="-1">`, `<canvas class="film__canvas" hidden>` (WebCodecs tier), `<picture class="film__poster">` (chapter-1 still), `.film__rain` (ch 7 only), `.film__veil` (night), `.film__grain` (static `washi.avif`, normal blend), `<ol class="film__captions">` with seven `<li id="road-N" class="cap" style="--i:N-1">`.

**Captions.** Each: `h3` (year + station with print number), employer descriptor, role, headline, scope, two outcomes, and a small reference `figure.print` (the real Hiroshige print, 280 px wide, with credit). ja: vertical 詞書 column (`.tate`, Zen Antique for station and year with 縦中横, body face for the rest) in the right 28 % of the stage, top 12 %, height ≤ 76 svh. en/zh: horizontal block lower-right, max 420 px (Big Shoulders / ZCOOL XiaoWei headings). Plate behind text: solid `--paper` (no blur, no blend) with `.kento` and a 3 px `--ch-N` rule (right edge in ja, top edge in en/zh). Portrait: caption in the top 30 svh, full width minus 16 px gutters, reference print hidden (credit line kept). Visibility via CSS scroll-driven animations (*video* §4.5) with a GSAP fallback.

**Behaviour.** Player per §7.6. While the stage fully covers the viewport: `stage.pause('film')` and `#stage` canvas `visibility:hidden`. `ctx.chrome.setRulerYears(p)`. When a chapter's rest range is entered: `ctx.print.ink(n)`; at p ≥ 0.98: `ctx.print.ink(8)`. Rain overlay (ch 7): two SVG pattern layers of thin straight lines at 75° (`--plate-1` and `--plate-7`, Hiroshige's Shōno), CSS `translate` loop 0.9 s while ch 7 is in range, static under reduced motion. Night only (hidden by day): `.film__veil { background: var(--paper); opacity: .22; }` (lapis veil, normal blend, no second encode).

**Transition out** `road-works` (owner WP-06): gold bands from `filmManifest.endBands`.

**Reduced motion / Proof.** Static tier: seven chapters in normal flow, each with its still and caption; no sticky, no scrub.

### 6.4 `works` — 屏風 · 表具 The Mount (WP-07)

**Purpose.** Depth: six case studies on a six-panel gold screen, each opening a static case page in sangaku format 問・術・答・省.

**Content keys** (`copy.works`, `facts.cases[6]`): `layer, title, stage, takeaway, directionNote (「屏風は右から左へ読みます」 / "Read right to left, as a folding screen is read." / 「屏风自右向左阅读。」), read, labels.{problem, constraints, role, team, period, method, tradeoffs, result, reflection}, backToWorks, prevCase, nextCase`; per case: Appendix A `CaseStudy`.

**Panels — counted from the right (第一扇 … 第六扇, the real reading order, chronological):**

| Panel | caseId | Case | Employer · period | Result | Art (Rinpa, Met CC0) | Why this image |
|---|---|---|---|---|---|---|
| 第一扇 | `ledger` | Settlement ledger rewrite | Hanamichi · 2019 | 6 h → 50 min; idempotent; zero double settlements | `rinpa/mitsumochi-poppies.jpg` | The chequered fence is a ledger grid |
| 第二扇 | `tracing` | Tracing across 140 services | Wataridori · 2020 | MTTD 38 → 6 min | `rinpa/sotatsu-moon-autumn-grasses.jpg` | Seeing by moonlight: finding faults in the dark |
| 第三扇 | `mapgl` | WebGL fleet-map renderer | Wataridori · 2021 | p95 frame 38 → 9 ms at 40k vehicles | `rinpa/fans-upon-waves.jpg` | Discrete fans riding moving water: vector tiles streamed under a moving camera |
| 第四扇 | `strangler` | Dispatch: strangler-fig migration to events | Wataridori · 2022–23 | 14 months, zero downtime, throughput ×12 | `rinpa/korin-irises-yatsuhashi.jpg` | The zig-zag eight-plank bridge, crossed in increments |
| 第五扇 | `platform` | Developer platform "golden paths" | Kairo · 2023–24 | Deploy lead time 45 → 7 min; 120 services | `rinpa/kiitsu-morning-glories.jpg` | Vines on a trellis blooming daily: templates that grow |
| 第六扇 | `resilience` | Multi-region resilience programme (+ system-design walkthrough) | Kairo · 2025 | RTO 4 h → 15 min; availability 99.95 → 99.99 % | `rinpa/korin-rough-waves.jpg` | Rough water, held |

**Layout — desktop.** Section 220 vh, sticky stage. Byōbu across the stage, ~62 lvh tall, upper area. DOM column bottom-left (cols 1–5): `第N扇` (Shippori Antique B1), title (Dela Gothic One / Bricolage Grotesque wdth 75 / Noto Sans SC 900), 問 (1–2 lines), 術 (1–2 lines), 答 (metrics in Martian Mono), "Read the case →" link; `--ink` on `--paper`, never on gold. Direction note vertical at top-right. Six DOM panel labels (`a.byobu__label`, `第N扇 · short title`, `href="works/{id}/"`, `view-transition-name: case-{id}`) positioned at projected panel centres (translate only, updated only while the screen moves); they are the keyboard controls (← next / → previous, §4.5).
- Scroll map (section scroll s over 120 vh): s 0–0.22 unfold (`uFold` 1.45 → 0.45); s 0.22–0.95 camera dollies right → left from panel 1 to 6 with a hold LUT (40 % hold per panel); the focused panel drives the DOM column (220 ms crossfade + plate snap).

**3D — view `works-byobu`: six-panel gold-leaf byōbu.**
- *Geometry*: one `PlaneGeometry`, `widthSegments = 6k` (k = 8 / 4 / 2), `heightSegments = 2`; panel ratio 1 : 2.75 (measured, *aesth* §3.3); `BYOBU_VERT` (*shaders*) zig-zag fold with flat normals from `dFdx/dFdy`. A lacquered 縁 frame band (墨 #1C1C1C) is drawn in-shader at panel edges.
- *Gold leaf*: `GOLD_FRAG` (*shaders*; shared chunk `src/gl/chunks/gold.ts`, owner WP-07): **109 mm leaf squares** (3寸6分 standard) in staggered rows with 箔足 overlap seams, per-leaf tilt and anisotropy direction, crinkle normal noise, worn patches showing 弁柄 ground (#9A5034 NC), Fresnel F0 (1.0, 0.766, 0.336), Ward anisotropic highlight from one light that follows the pointer like a candle, procedural studio environment (`envStudio`). Panel art = matte mineral pigment from `tArt` (atlas of six panel crops, alpha = pigment mask, gold ground removed). **No bloom.**
- *Back face (下地骨)*, `!gl_FrontFacing`: procedural lattice of wooden laths (pitch = panel width / 6, both directions) with torn paper remnants (fbm threshold) — the true structure of a byōbu.
- *Lighting*: day — warm-white soft key from upper-left plus the pointer candle; night — candle/lantern only (#FFB46B), lower ambient, rare mica glints (≤ 0.5 % of pixels).
- *Uniforms*: `uFold, uPanels=6, uPanelW, uAspect, uLeafPerUnit, uLightPos (vec3), uFocus (0–5), uTurn (0→1 band), uWear, tArt` + globals.
- *Tiers*: high Ward + crinkle + fbm4 wear, k = 8, atlas 3072 × 1408; medium Ward + fbm2, k = 4, atlas 3072 × 1408; low Blinn-Phong + baked 512² wear mask, k = 2, atlas 1536 × 704; software → poster. 1–2 draw calls, ≈ 25 MB VRAM.

**Case pages** (`src/sections/works/case-render.ts`, WP-07): `.kyokaku` spread. Header: panel art crop (2000 px) + title with `view-transition-name: case-{id}`. Then **問** (problem, constraints, role, team, period), **術** (method, an SVG architecture diagram that constructs itself in compass-and-ruler order like a sangaku tablet, trade-offs), **答** (results table: metric · before · after · period · source), **省** (reflection: what I would do differently). Case `resilience` adds a 吹抜屋台 roofless cut-away isometric walkthrough of the multi-region design (regions, cells, queues, failover), headed by `ukie/toyoharu-kabuki-perspective.jpg`, with `hokusai/manga-pagoda-roof.jpg` beside the note on the pagoda's 心柱 central pillar (a damped core, not a rigid one). Prev/next links in panel order; back link `../../#works-{id}` (depth-correct relative path).

**Mobile (< 768).** No WebGL: six tall panels stacked (art crop 1 : 1.6 on `img/gen/gold-leaf-1280.avif` with 箔足 grid as CSS gradients), CSS scroll-driven ±8° `rotateY` fold shading, DOM text under each; 第一扇 first.

**Transition out** `works-skills` (owner WP-07 for the turn): §2.2.

**Reduced motion.** Screen shown open; light follows the pointer only; DOM column lists all six cases.

### 6.5 `skills` — 組子 Joinery (WP-08)

**Purpose.** Stack depth as evidence: years in production, last production use, projects, scale. Joinery without nails = loose coupling. No percentage bars, ever.

**Content keys** (`copy.skills`, `facts.domains[5]`, `facts.tools[]`): `layer, title, stage, takeaway, yearsUnit, projectsUnit, lastUsed, architectureToggle (構造 / Architecture / 架构), architectureCaption, specFigure.{file:'hokusai/manga-pattern-construction.jpg', caption, alt}, learnFigure.{file:'ukie/toyoharu-dutch-perspective.jpg', caption ("How I learn a new stack: Edo artists adopting a foreign toolset"), alt}, kikkoFigure.{file:'pattern/seiei-moon-kikko.jpg', caption, alt}`. Stack diagram data `src/sections/skills/diagram.ts` (WP-08): boxes `{id, x, y, w, h, toolIds[]}` and edges, labels from tools — request path → edge (Envoy) → Go services → Kafka → read models (PostgreSQL, ClickHouse) → observability (OpenTelemetry, Prometheus).

**Domains → kumiko patterns** (straight-strip patterns only; geometry per *aesth* §3.2):

| Domain | Pattern | Why |
|---|---|---|
| `web` Web platform & graphics | 麻の葉 asanoha (triangular jigumi + leaves) | Many shapes from one grid |
| `backend` Back end & distributed systems | 角麻の葉 kaku-asanoha (square jigumi, 45° / 22.5° cuts) | Rigid contracts |
| `data` Data | 枡組 masu-gumi (square half-lap grid) | Tables |
| `infra` Infrastructure & reliability | 亀甲 kikkō (hexagonal) | Longevity, stability |
| `practice` Practice & leadership | 三組手 mitsukude (triangular jigumi) | Three strips held without nails: people |

**Layout — desktop.** Section 150 vh, sticky stage. A 3 × 2 shoji frame occupies cols 1–8: five cells hold the domain patterns; the sixth cell holds **Hokusai's own page teaching how to construct these patterns** (texture on the shoji paper) — the spec beside the implementation. Cols 9–12: DOM list grouped by domain (DotGothic16 / Martian Mono + Handjet / ZCOOL QingKe HuangYou headings); each tool row: name · years (Handjet counter) · last production year · projects · scale (e.g. "PostgreSQL — 8 years — 2026 — 9 projects — 4 TB, 40k writes/s"). Hover/focus a row → its strip run lights in 3D and graph neighbours light at 50 %; hover a run in 3D → the row highlights (`aria-describedby` readout). Architecture toggle button below the list. `learnFigure` small at the list's foot.
- Mobile: T2 at ≤ 2000 instances in a 2 × 3 vertical shoji; list below; toggle kept.

**3D — view `skills-kumiko`: instanced kumiko with data encoding.**
- *Strips*: thin boxes (length = one lattice pitch per segment, width 0.08, depth 0.24 pitch units) with half-lap notch geometry on high tier. Two `InstancedMesh`es (long strips, short leaves). Per-instance attributes: `aFrom` (vec3 scatter), `aSpin` (vec4 axis + angle), `aDelay` (float), `aTargetB` (vec4 position) + `aQuatB` (vec4) — the diagram target set, `aTool` (float, −1 = structural), `aMask` (vec2 — 2 × 16-bit adjacency bitmask over ≤ 32 tools).
- *Data encoding*: each tool is a **featured run** inside its domain cell: run length = years in production (one segment per year); joints along the run carry small dark inlay squares = projects (≤ 12); hovered run tints to its domain's plate colour; neighbours (tools used together, `tool.neighbours`) light via `aMask`.
- *Assembly*: `patchAssembly(material, uProgress)` (*shaders*, verified) injected into `MeshStandardMaterial` with `customProgramCacheKey = () => 'kumiko-v1'`; plus `uDiagram` lerps each instance toward `aTargetB/aQuatB` with staggered delay. `frustumCulled = false`.
- *Material*: roughness 0.65, procedural hinoki grain (fbm along strip axis), albedo `--accent-skills` (伽羅 wood).
- *Shoji paper and shadow*: paper plane (胡粉 + fibres, `src/gl/chunks/paper.ts`); a second draw of the instanced geometry with a **planar projection matrix** onto the paper (flat `--guide-label` at 0.22 alpha, `depthWrite:false`) — no shadow map. For the diagram, `aTargetB` positions lie near the paper plane so that, as `uLightAz` rotates, the **shadow resolves into the stack diagram**; then a DOM SVG drawn from the same data (projected to the same screen coordinates) fades in and the 3D drops to 30 %. Night: lantern behind the shoji — paper emissive 0.15 warm, strips in silhouette, shadow hidden.
- *Scroll map* (s over 50 vh): s 0–0.45 assembly from the exploded square lattice (`uProgress` 0 → 1); s 0.45–0.70 hold (interaction); s 0.70–0.90 `uDiagram` follows scroll 0 → 1 (shadow resolves); the toggle button flips `uDiagram` at any time (600 ms `--ease-ha`).
- *Picking*: CPU against ≤ 32 featured runs projected to screen segments (nearest within 8 px) — never raycast 12k instances.
- *Tiers*: high 12 000 instances; medium 5 000; low 2 000 (density via larger pitch); software 800 merged geometry or poster. ≤ 6 draw calls, ≈ 2 MB instance data.

**Fallback.** Static SVG lattices generated from the same pattern functions + the DOM SVG diagram. Reduced motion: assembled; toggle crossfades.

**Transition out** `skills-principles` (owner WP-08): §2.2. Images: `hokusai/manga-pattern-construction`, `ukie/toyoharu-dutch-perspective`, `pattern/stencil-asanoha` and `pattern/stencil-sayagata` (1-bit legend masks behind the `web` and `backend` headings), `pattern/seiei-moon-kikko` (small figure beside `infra`: a flat lattice turning into depth).

### 6.6 `principles` — 枯山水 The Garden (WP-08)

**Purpose.** Five working principles as five stones; a real year of operations data raked into the sand; SLO and incidents. A garden is raked every day and re-raked after any disturbance — that is operations.

**Content keys** (`copy.principles`, `facts.principles[5]`, `facts.ops`): `layer, title, stage, takeaway, rerake (整える / Re-rake / 重新耙平), rakeToggle (touch only: 熊手を持つ / Pick up the rake / 拿起耙子), showData (データを見る / Show the data / 查看数据), hideData, tableCaption, weekLabel, p99Label, sev1Label, legend ("52 rows = 52 weeks of checkout p99 latency, 2025-10-20 → 2026-10-18 · rings = SEV-1 incidents, radius ∝ users affected · SLO met 11 of 12 months"), mistFigure.{file:'landscape/motonobu-ink-landscape.jpg', caption, alt}`.

**Principles** (canonical; WP-01 writes ja/zh and a 1–2 sentence body for each):

| n | ja | en | Stone (x, z, r) on a 16:9 plane, x ∈ [−1, 1] |
|---|---|---|---|
| 1 | 測ってから彫る | Measure before you cut | (−0.55, −0.10, 0.09) |
| 2 | 小さな版を、何度も | Small blocks, many passes | (−0.25, 0.15, 0.07) |
| 3 | 見当は腕前に勝る | Registration over brilliance | (0.05, −0.20, 0.11) |
| 4 | 誰でも摺れる版を残す | Leave the block re-printable | (0.32, 0.10, 0.08) |
| 5 | 呼び出しは自分で受ける | Own the pager | (0.60, −0.05, 0.10) — SEV-1 rings around this stone |

**Layout — desktop.** Section 130 vh, sticky stage. The garden view fills the stage width × 72 lvh at the bottom (low oblique camera, ~35° down). The emptiest artboard: principles stand as tall vertical columns in the blank upper area above their stones (ja Zen Old Mincho 700/400 `.tate`; zh Noto Serif SC 300 `.tate`; en Newsreader 300 opsz 72 in short stacked lines), positioned at projected stone x (updated only when the camera moves). Legend and the two buttons at bottom-right. "Show the data" opens an accessible panel with a 52-row table (week · date · p99 ms) and the incident table. `landscape/motonobu-ink-landscape.jpg` sits very faint (opacity .18, `figure` behind the canvas) as distant mountains in mist. `pattern/stencil-undulating-lines.jpg` as a 1-bit mask (waveforms) in the legend, coloured `--accent-principles-text`.
- Mobile: 130 vh; principles as a vertical list above the garden; garden 60 svh; rake only after tapping the rake toggle (so touch scroll is never blocked).

**3D — view `principles-garden`: data-driven raked sand.**
- *Sand*: one quad, analytic height field (`SAND_FRAG` + `RAKE_STROKE_*`, *shaders*), extended:
  - 52 rows across depth; row i's waviness amplitude `a_i = 0.15 + 0.85 · clamp((p99_i − 140) / 280, 0, 1)` with hand wobble; data in a 52 × 1 texture `tRows`.
  - 砂紋 rings around every stone (band 4–5.5 spacings).
  - SEV-1 ring sets around stone 5: incident k adds ridges out to `r5 + spacing · (2 + 10 · blastPct_k / 100)` with amplitude 1.3 (`uSev[k] = (radius, strength)`).
  - Visitor raking: pointer segments drawn as quad strips into a **trail RT** (1024² / 512² / 256², RGBA8: r = lateral 0–1, a = coverage), 5 tines, persistent. **Re-rake** = animated sweep that clears the trail over 900 ms.
  - Band-in imprint: `stampLattice(pitch)` writes a procedural kaku-asanoha height override into the trail RT; an animated rake sweep erases it over the first 25 vh.
- *Stones*: five `IcosahedronGeometry` boulders (detail 4 / 3 / 2) displaced by seeded low-frequency noise; matte granite 藍墨茶 #373C38 NC with paler facets; analytic shadows on the sand (closest approach of the sun ray to each stone sphere) — no shadow maps.
- *Shading*: central-difference normals (high/medium) or `dFdx/dFdy` (low); low sun 22° from the left; cavity darkening; per-grain hash; sparse quartz glints (`step(0.995, grain)·diff⁸`). Colour `--gravel` (cool 白鼠), never beige. Night: moon 15° from the right, cool #C8D8F0, glints slightly stronger.
- *High tier*: an extra 256² grid displaced with the same `heightAt()` for grazing silhouettes.
- *Uniforms*: `tRows, uStones[5] (vec3), uSev[4] (vec2), tTrail, uSun (vec3), uSpacing, uTines, uSweep, uStamp` + globals.
- *Interaction*: `.cur-rake`; fine pointer rakes on drag; touch needs the rake toggle; keyboard reaches Re-rake and Show data.
- *Tiers*: high displaced grid + analytic normals + shadows + trail 1024; medium FD normals + shadows + trail 512; low `dFdx` normals, no shadows, trail 256; software → poster + data table. ≤ 3 draw calls, ≤ 8 MB VRAM.

**Transition out** `principles-achievements` (owner WP-08 for the garden part): camera tilts up 12°, sand darkens 6 %.

**Reduced motion.** Static camera; strokes still work (user-initiated); sweep is instant.

### 6.7 `achievements` — 番付・空摺 Seen and Unseen (WP-09)

**Purpose.** The numbers, ranked and dated; reliability printed without ink.

**Content keys** (`copy.achievements`, `facts.banzuke`, `facts.metrics`, `facts.charts[3]`, `facts.reliability[5]`): `layer, title, stage, takeaway, banzukeNote (one line: Edo ranking sheets were topped by 大関; 横綱 first appeared on a banzuke in 1890 — verify, §14), sealsTitle, sealLegend.{rose: "朱文 — raised: the number went up", fell: "白文 — incised: the number went down"}, chartsTitle, karazuriTitle, karazuriCaption ("Reliability is karazuri: visible only when light rakes across it — which is to say, in a crisis."), inkIt (墨を入れる / Ink it / 上墨), lightAngle (mobile slider label), credentialsTitle, credentials[], pinesFigure.{file:'landscape/shonen-aged-pines.jpg', caption, alt}`.

**Layout — desktop.** Section 150 vh, normal flow (no sticky).
1. **見立番付** (DOM `.banzuke`, one ink only: `--ink` on `--paper-print`): title cartouche (「瀬川湊 仕事見立番付」 / "A Mitate Ranking of the Work" / 「濑川凑 工作见立番付」); centre column 「八年」 + 「令和八年 霜降 改」; **東 Delivery** (right) and **西 People** (left); ranks top → bottom 大関 · 関脇 · 小結 · 前頭 · 前頭 · 前頭 (Appendix B). ja and zh: vertical columns (Kaisei Tokumin 800 / Noto Serif SC 900), rank labels larger; en: a two-column table (Gloock numerals, Newsreader). Dense inside the sheet (a deliberate contrast), airy around it. Metric values in small Martian Mono under each feat. The `shonen-aged-pines` crop sits **beside** the sheet (ink pines on gold = longevity, eight years), never inside it. `.banzuke` is a semantic `<table>`.
2. **View `achievements-press`** (in-flow rect, 100 vh): four seal stones (top), three 砂子 charts (middle), the 空摺 strip (bottom).
3. Credentials (education, internal award, languages) as a small `<dl>`.
- Mobile: banzuke as two stacked horizontal tables (東 then 西) in every language; seals 2 × 2; charts stacked; karazuri driven by a "Light angle" range input + Ink it.

**3D — view `achievements-press`.**
- **Seal stones** (shared module `src/gl/seal`, owner WP-09; reused by Contact). `SealStone`: `RoundedBoxGeometry` (*three/addons*) 1 × 1 × 2.2, soapstone (寿山石) material: warm translucent wrap lighting, albedo #E6D3A8 with fbm veins. The face: `PlaneGeometry` 256² / 128² / 64² on the bottom, displaced by a **carve** heightfield (`src/gl/carve`): **朱文** (glyphs and border raised) for metrics that rose; **白文** (glyphs incised, field raised) for metrics that fell. Faces per language from `metric.seal.face`:

  | Metric | Direction | ja (Shippori Mincho B1 800, 大字) | zh (Noto Serif SC 900, 大写) | en (Gloock) |
  |---|---|---|---|---|
  | `deploy` 45 → 7 min | fell → 白文 | 漆分 | 柒分 | 7 min |
  | `thru` ×12 | rose → 朱文 | 拾弐倍 | 拾贰倍 | ×12 |
  | `avail` 99.95 → 99.99 % | rose → 朱文 | 肆玖 (four nines) | 肆玖 | 99.99 |
  | `mttr` 44 → 9 min | fell → 白文 | 玖分 | 玖分 | 9 min |

  Press (scroll-driven, staggered 0.12 per stone): descend → contact at p 0.45 → hold with seeded 0–1.5° rotation jitter → lift. On contact an **impression decal** appears on the paper: carve mask × 印泥 coverage noise (fbm), 1–2 px bleed, seeded pressure gradient, colour `--seal`. The 側款 side inscription (`metric.seal.side`: period + context) is DOM text in Martian Mono beside each stone; every number is DOM text.
- **砂子 gold dust charts** — physical sifting, not a morph. Instanced quads (24 000 / 12 000 / 4 000), **closed-form paths in the vertex shader, no simulation**: per flake a CPU-precomputed landing point `aLand` (75 % rejection-sampled inside the chart **glue mask**, 25 % outside), a start below the bottom edge `aStart`, a delay `aDelay`, a spin `aSpin`. `uSift` (0 → 1, from the band + section scroll) drives: lift 0–0.35 (rise from the sand, colour mixing `--gravel` → gold as they rise) → fall 0.35–0.85 (drag + flutter rotation down from a sifting line at the top) → settle 0.85–1 (flakes outside the glue slide off the bottom edge and fade; inside ones lie flat). Fully reversible on scroll-back. Glint from the gold chunk (isotropic variant). The glue mask is rasterised at runtime (canvas 1024 × 512) from the three charts: deploys per week 2018–2026 (bars), deploy lead time 2023-Q3 → 2024-Q4 (thick line), MTTR median by year 2019–2026 (bars). Axes, ticks, values and titles are DOM SVG on top (`--ink` hairlines, Martian Mono); each chart has a `<table>` equivalent.
- **空摺 karazuri strip**: paper plane with an emboss heightfield from `carve()` (rounded-bevel profile) of the five reliability figures (Arabic numerals in Gloock for all languages; labels in the page language as DOM). A raking light follows the pointer (fine) or scroll (coarse), elevation 8°–35°; at grazing angles the figures rise from blank paper. **Ink it**: `uInk` 0 → 1 fills raised areas with `--plate-1` (400 ms) and reveals the DOM list as printed text.
- *Night*: cool moonlit raking light; gold warmer.
- *Uniforms*: `uSift, uInk, uLight (vec2 az/el), tEmboss, tGlue, uPress[4], tSealFaces (atlas 2×2)` + globals.
- *Tiers*: high flakes 24k, seal carve 512, emboss 1024; medium 12k, 384, 768; low 4k, 256, 512; software → posters + DOM SVG charts with gold hatching + SVG seal impressions. ≈ 5 draw calls (paper, instanced stone bodies, instanced faces, instanced decals, flakes); ≈ 20 MB VRAM.

**Transition out** `achievements-writing` (owner WP-09 for the flakes sliding off).

### 6.8 `writing` — 墨流し · 料紙 Decorated Paper (WP-10)

**Purpose.** Open source, articles and talks — patterns made in public. The most colourful artboard: all eight plates are inks now.

**Content keys** (`copy.writing`, `facts.repos[3]`, `facts.articles[6]`, `facts.talks[3]`): `layer, title, stage, takeaway, reposTitle, articlesTitle, talksTitle, dropHint (クリックで墨を落とす・ドラッグで梳く / Click to drop ink · drag to comb / 点击滴墨·拖动梳纹), dropCentre (中央に墨を落とす / Drop ink at the centre / 在中央滴墨 — keyboard alternative), takePrint (紙を置く / Take a print / 覆纸取印), download, share, reset, starsLabel, latestLabel, figures.{header:'writing/hokkei-first-writing.jpg', oss:'writing/gakutei-spider-web.jpg', articles:'writing/gakutei-paper.jpg', talks:'writing/gakutei-brush.jpg'}` (+ captions/alts). Image logic: 書き初め opens the section; *Spider's Web* = OSS (a quiet pun on the Web); *Paper: Teika* = articles; *Brush: Lady Wei* (the calligraphy teacher) = talks, i.e. teaching.

**Layout — desktop.** Section 120 vh, in flow. Cols 1–7: the marbling tray (view `writing-marble`, ~1 : 1, ≤ 70 vh) inside a lacquer tray frame; below it a row of nine ink chips (8 plates + clear surfactant) as DOM radio buttons, then Take a print · Reset · Share. Cols 8–12: the header plate (書き初め, 200 px) then three lists, each with its 140 px surimono plate and credit: **OSS** — repo name (IBM Plex Mono), description, language, stars ("1,140 stars" as text, no ★ glyph), latest release; **Articles** — title (Yuji Mai / Newsreader Italic / Ma Shan Zheng), date, venue, abstract in `<details>`; **Talks** — title, date, venue, abstract. Hovering an item highlights the ops it contributed in the pattern.
- Mobile: tray full width, lists below, chips in a horizontal scroller (`data-lenis-prevent`).

**3D — view `writing-marble`: closed-form suminagashi** (*threejs* §c2, Lu & Jaffer 2012; `MARBLE_OP_FRAG`, `MARBLE_SHOW_FRAG` in *shaders*).
- Pattern: ping-pong RT 1536² / 1024² / 768², RGBA8 (rgb ink, a amount) + an R8 **id attachment** (`WebGLRenderTarget(..., { count: 2 })`, high/medium) storing the source item of the last deposit; ops remap ids exactly like ink.
- Ops (each **one full-screen pass of the pattern texture**, event-driven): *drop* `{C, r, ink, id}` via the inverse map `P = C + (P′−C)·√(1 − r²/|P′−C|²)`; *tine/comb* `{A, M, α, λ, spacing, id}` via `P′ = P + (αλ/(d+λ))·M`. Drop spread: re-render from a snapshot with animated `uR` for 600 ms (high/medium only). At rest only the display pass runs, on demand.
- Initial op list (deterministic, `src/sections/writing/ops.ts`, from content): op 0 = **gold (plate 8) drop** at the centre, r 0.12 (the band hand-off); then every repo release in date order: a drop at `hash(repo, tag)` within the tray, `r = 0.02 + 0.012·log2(1 + lines/100)`, ink = `repo.plate` (kento 6, baren 2, scrubkit 4), each followed by a clear drop (a = 0) at r × 0.6 for authentic ring structure; each article = one comb stroke (spacing 0.08, α 0.06, λ 0.02) at angle `month/12·π`; each talk = one tine (α 0.12) in plate 7. Ops apply progressively as the section scrolls in (op k at s ≥ k/N over s ∈ [0, 0.5]); applied ops stay.
- Visitor: click = drop with the selected ink (radius 0.03–0.08 by press duration); drag = tine along the pointer segment (α by speed). `?seed=&ops=` share links: compact base64url of ≤ 200 quantised numeric ops, validated and clamped (never raw text). `.cur-brush`.
- Display: washi fibres, `fwidth`-antialiased edges, faint water specular (day) / a soft vertical moon streak (night); `uHighlight` outlines pixels whose id matches the hovered item.
- **Take a print**: a sheet lowers and lifts with the shared peel curl (`src/gl/chunks/peel.ts`, owner WP-05); the pattern is copied once (`readPixels`) into a 512² 2D canvas → `ctx.print.setMarbling(canvas, ops)` → noren dye and today's print; PNG download 1024² (768² on coarse pointers) named `segawa-print-<seed>.png`.
- *Tiers*: high 1536² + spread + id; medium 1024² + spread + id; low 768², no spread, no id; software 512² drops only, poster at rest. 1 draw call + 1 pass per op; 8–18 MB.

**Transition out** `writing-testimonials` (owner WP-10).

### 6.9 `testimonials` — 暖簾 Goodwill (WP-10)

**Purpose.** What peers say; mentoring and leadership. のれん also means *goodwill* in Japanese accounting. Stage line: 「最後の版は、他人が摺る」 / "The last block is printed by other people" / 「最后一块版，由他人来印」.

**Content keys** (`copy.testimonials`, `facts.testimonials[3]`, `facts.leadership`): `layer, title, stage, takeaway, leadershipTitle, leadershipLabels.{mentees, promoted, interviews, onboarding, rfcs, ics}, figureDay.{file:'tokaido/48-seki.jpg', caption, alt}, figureNight.{file:'night/hiroshige-ryogoku-moon.jpg', caption, alt}`.

**Layout — desktop.** Section 120 vh, in flow. Upper: the noren view (~55 vh, cols 4–12), hung on a wooden rod in a doorway, in front of a DOM backdrop print — Hiroshige's *Seki: Early Departure* by day (its great crested curtains rhyme with the noren), *Twilight Moon at Ryōgoku* by night (swap by theme, both `<img>` in DOM, the inactive one `display:none`). Lower: three quotes in a staggered arrangement (manager cols 1–6; peer cols 7–12 offset +64 px; report cols 2–8) — never three equal cards. ja quotes vertical on ≥ 1024 px (Kaisei HarunoUmi, `.tate`, ≤ 60 vh tall); en Newsreader Italic opsz 24; zh Noto Serif SC 400 with the signature name in Zhi Mang Xing (horizontal). Signature: name · role · relationship · date (body face). Leadership facts as a compact list with Martian Mono numbers.

**2D — two-plate overprint.** Each quote has two `aria-hidden` copies in 紅 #CB1B45 and 薄群青 #5383C3 behind the real text, `mix-blend-mode: multiply` by day (none at night). They arrive misregistered (3 px, 0.4°), snap into register at the reading line (scroll-driven, `--ease-register`) forming 藤紫, then fade (300 ms) leaving the accessible DOM text in `--accent-testimonials-text`.

**3D — view `testimonials-noren`: CPU Verlet noren** (*threejs* §g1).
- Three panels with slits; grid per panel 14×24 / 10×18 / 8×14 / 6×10; 6 / 4 / 3 / 2 constraint iterations; top row pinned to a wooden rod (cylinder); fixed 1/60 s accumulator; < 0.15 ms per frame.
- Material: indigo cotton (`MeshStandardMaterial`; Physical with sheen 0.4 on high), base 藍 #0D5661 dyed by the visitor's print: `mix(indigo, marble.rgb, 0.65·marble.a)` from `ctx.print.marbling.canvas` (`CanvasTexture`; default = the default op list's print, or `img/gen/default-print.webp` when Writing never ran). The crest 丸に三つ組子 in resist-white (胡粉) on the centre panel (mask raster of the crest SVG). Procedural weave normal.
- Wind: gentle value-noise gusts per row × `uMotion`, plus pointer velocity; hovering parts strips (sphere collider at the projected pointer). Night: lantern rim light.
- *Band out*: camera dollies through the centre panel; the collider follows the camera path and parts the cloth; cloth fades after p 0.8.
- 3–4 draw calls, < 2 MB. Fallback: still poster + two CSS halves that slide apart on hover/focus. Reduced motion: hangs in a pre-solved still pose.

**Transition out** `testimonials-contact` (owner WP-10).

### 6.10 `contact` — 京 · 落款 The Seal (WP-10)

**Purpose.** How to hire: availability, email, form, CV PDFs, location, overlap hours. The road ends at Sanjō Bridge, Kyoto: 「旅の終わりではなく、次の仕事の始まり。」

**Content keys** (`copy.contact`, `facts.person`): `layer, title, stage, takeaway, letter[3], signature, form.{name, email, message, send, sending, sent, error, mailtoNote}, copyEmail, copied, cvTitle, cv.{ja,en,zh}, availabilityTitle, overlapTitle, responseTime, workAuth, relocation, arrival (「京師 三条大橋 — 江戸より百二十六里、着。」 / "Sanjō Bridge, Kyoto — 126 ri from Edo. Arrived." / 「京师三条大桥——自江户一百二十六里，抵达。」), figure.{file:'tokaido/55-kyoto.jpg', caption, alt}`.

**Layout — desktop.** Section 110 vh. Cols 1–7: the 京師 print large (`figure.print.deckle`, `data-handoff="kyoto"`) with the arrival line. Cols 8–12: the letter on `--paper-print` with `.kento` (Klee One 600 / Bodoni Moda Italic / Long Cang), signature, then contact details in the body face: email + copy button, GitHub, LinkedIn, CV PDFs (ja/en/zh), availability, Tokyo + live JST clock + overlap hours, response time, work authorisation, relocation; then the form (name, email, message; Send with `.cur-seal`). Selection colour 黄丹; accents Kyoto red / 臙脂. The top ruler reads 百二十六里.
- Mobile: print first, then letter, details, form.

**Form.** If `site.config.contactEndpoint` is set, POST JSON with `fetch` (no third-party scripts); else build a `mailto:` URL (subject + body). No-JS fallback: `action="mailto:…" method="post" enctype="text/plain"`. Native validation with trilingual messages. On success (or when the mail client opens) the seal stamps.

**2D.** The letter first shows as display-face outlines with small anchor squares at phrase starts, then fills phrase by phrase (摺る, 1.2 s total). Text is present and readable throughout.

**3D — view `contact-seal`** (registered only while stamping, then parked): `SealStone` from `src/gl/seal` with the face **白文 「湊」 in 小篆** (`public/img/gen/seal-minato.svg`, WP-02) — or the 肖形印 crest variant; descends onto the signature area, presses 300 ms, lifts; the impression decal stays; `ctx.print.setSeal({ pressure, rotation })` completes today's print. Fallback (no WebGL / reduced motion): SVG stamp that appears with a 160 ms scale 1.04 → 1 and opacity.

**Transition out** `contact-colophon` — the 割印 (owner WP-10), §2.2.

### 6.11 `colophon` — 奥付 Colophon (WP-10)

**Purpose.** A real 奥付: who made it, with what, from which images, at what cost — and the visitor's print to take home.

**Content keys** (`copy.colophon`): `layer, title (奥付 / Colophon / 牌记), stage, takeaway, bookTitle, author, publisher, carving (彫), printing (摺), paper (料紙), pictures (画), weightLabel, vitalsLabel, buildLabel, editionPattern (「第{v}版 第{n}刷」 / "Edition {v}, impression {n}" / 「第{v}版 第{n}次印刷」), datePattern (「令和{y}年 {term} 摺」 / "Printed at {term}, {yyyy}" / 「{yyyy}年{term} 印」), sampleNotice, finale (大尾), todaysPrint, savePrint, libraries[] (name, version, licence), fonts[] (family, licence), booksFigure.{file:'writing/gakutei-book-cart.jpg', caption, alt}, nightFigure.{file:'night/hiroshige-ryogoku-moon.jpg', caption, alt}`. Credits are generated from the manifest (`creditText`, `objectUrl`) for **every image the site shows**, plus ja/zh short captions from `src/content/credits.ts`.

**Layout — desktop.** `.kyokaku` back-matter spread. Right page: the 奥付 block (vertical in ja/zh: book title, 著者, 版元, 彫 — three 0.186.1 · GSAP 3.15.0 · Lenis 1.3.27 · mediabunny 1.62.1 · Vite · TypeScript, 摺 — capture and encode pipeline (Playwright + SwiftShader, x264 `-g 8 -bf 0`), 料紙 — fonts and licences, 画 — image count, date, edition line) in Shippori Antique B1 headings. Left page: credits list (64 px thumbnail · creditText · objectUrl link), two columns, IBM Plex Mono. Beside the libraries, `writing/gakutei-book-cart.jpg` (the wheeled book case = dependencies). Live page weight (Resource Timing sum), LCP/INP/CLS, build hash, edition, the sample notice (if enabled). **Today's print** at 620 px wide with Save. Ends with **大尾** set large (Shippori Antique B1), the word from the cartouche of Hiroshige's Kyoto print; at night a small `night/hiroshige-ryogoku-moon.jpg` vignette.

**Edition line.** `第{v}版 第{n}刷`: v = `package.json` major version (版), n = deploy count from `build/edition.json` (incremented by `scripts/postbuild.mjs` on production builds). Date stamp computed from the build date's 二十四節気 (`src/core/solar-term.ts`), e.g. 「令和八年 霜降 摺」.

**3D — view `colophon-emaki`.** Build-time strip `img/gen/strip-{lang}-{day|night}.avif` (4096 × 256, a miniature of every section left ← right in reading order, WP-11) shown flat, then rolled up right → left onto a wooden roller with the `SCROLL_VERT` Archimedean wrap (*threejs* §e1) as the colophon enters (p 0.2 → 0.6), tied with a cord; plays once. Front = strip, back = plain washi. Segments 900 / 600 / 300; texture 4096 / 2048 / 2048; software → rolled-scroll poster. 2–3 draw calls. Until WP-11 captures the strip, the view uses a procedural strip (section layer colours + titles drawn in canvas) — a valid design, not a placeholder.

**Print stylesheet** (WP-04 `src/chrome/print.css`): printing any main page yields a two-page A4 CV with kentō marks (name, role, summary, results, ledger, cases in one line each, skills with years, contact); the Colophon prints only its edition line.

**404** (`404.html`, WP-10): `writing/gakutei-spider-web.jpg` with 「この糸の先には、まだ何も無い。」 / "Nothing at the end of this thread yet." / 「这根丝线的尽头，还什么都没有。」 and links to the three homes.

---

## 7. The scroll-scrubbed film 道中 (production WP-03 · player WP-06)

### 7.1 At a glance

| | Landscape | Portrait (`max-aspect-ratio: 4/5`) |
|---|---|---|
| Source | Offline render of our own three.js **tatebanko** dioramas cut from the real CC0 Hiroshige prints | Same world, **separately authored portrait camera** |
| Master | 1920 × 1080 @ 30 fps (1.5× supersample), 16.0 s, 480 frames | 1080 × 1920 @ 24 fps, 16.0 s, 384 frames |
| Shipped | `film-hd` 1280 × 720 @ 30, CRF 23, ≤ 5 MB · `film-sd` 960 × 540 @ 30, CRF 24, ≤ 2.5 MB | `film-portrait` 720 × 1280 @ 24, CRF 25, ≤ 3 MB |
| Rest times (s) — forced IDR | 0, 2.2, 4.6, 6.9, 9.2, 11.5, 13.8 | same |
| Rest frames | 0, 66, 138, 207, 276, 345, 414 | 0, 53, 110, 166, 221, 276, 331 |
| Hold fraction per chapter | 0.30, 0.40, 0.40, 0.40, 0.40, 0.40, 0.55 | same |
| End | 13.8 → 16.0: rain thins → mist → **gold suyari clouds rise and fill** (plate 8); last frame = paper with three gold bands (`endBands`) | same, bands authored for portrait |

Design rules for encoder-friendliness (*video* §2.6): flat quantised colours, no grain, no per-frame noise, slow lateral camera moves, calm rest frames with negative space at the **right ~32 %** (landscape; ja vertical captions top-right, en/zh blocks lower-right) or the **top ~30 %** (portrait), hard cuts only at forced keyframes, washi grain and rain live in DOM overlays.

### 7.2 Storyboard

World: station dioramas spaced 40 units apart along **−x** (the camera moves left: emaki/Tōkaidō reading direction). Each diorama = 5–7 depth plates at z ∈ [−12, 0] (back → front), unlit (`MeshBasicMaterial`, flat colours — a print, not a 3D render), each plate with ≤ 2 % paper curl (vertex bend) and a baked contact-shadow strip at its foot. Between stations, すやり霞 mist cards (flat bands with soft edges) sweep right → left in front (z = +1) to hide seams. The **traveller** (SVG atlas, 3 poses: walk-a, walk-b, stand; 紺 kimono, 笠 hat, 矢立 at the waist, a furoshiki bundle; height ≈ 6 % of frame at rest) appears in every diorama on its authored path; pose alternates every 6 frames while travelling, stands at rest, 1.5 % bob.

**Palette accumulation**: diorama k is quantised to palette **P_k** = {cool paper `#F7FCFE`, plates 1…k, and a 50 % paper tint of each}. Diorama k arrives in P_{k−1}; **plate k wipes in** with a zig-zag baren mask over 65–95 % of the travel into it (frames `rest_k − 24 … rest_k − 4` at 30 fps). Chapter 1 is P_1: indigo key line and indigo tints only.

| Ch | Rest frame (L / P) | At rest — landscape | Portrait framing | Plate wiping in |
|---|---|---|---|---|
| 1 日本橋 2018 | 0 / 0 | Bridge arch centre, the two kido gates framing left and right, the procession cresting the bridge, fish sellers foreground; traveller among them lower-left | Gates + bridge stacked vertically | — (key line only) |
| 2 箱根 2019 | 66 / 53 | Patchwork crag centre-right, lake left, a tiny procession on the pass; traveller at the crag's foot; **the faint white Fuji behind the far-left hills is removed** (merged into the sky plate) so Fuji appears only in ch 4 | The crag fills the frame vertically | 弐 若竹 on the crag |
| 3 三島 2020 | 138 / 110 | Three fog planes; horse-and-rider group left-centre; walkers dissolving into fog; **torii and lanterns removed** (filled with fog) | Rider group + fog columns | 参 銀鼠 fog |
| 4 原 2021 | 207 / 166 | Fuji's peak **breaks a thin key-line frame** (a 2 px `--plate-1` rectangle plate at z +0.5, inset 6 %) — the only Fuji on the site; pink dawn bokashi; two travellers and a porter on the road; our traveller behind them | Fuji tall, peak crossing the top frame line | 肆 一斥染 sky |
| 5 島田 2022 | 276 / 221 | Bird's-eye river bands with porters carrying a procession across a river that had no bridge; our traveller carried on a porter's shoulders | River on a diagonal | 伍 瓶覗 river |
| 6 岡崎 2023 | 345 / 276 | The long Yahagi bridge across the frame with its procession, castle hill and blue mountain; our traveller mid-bridge | Bridge receding on a diagonal | 陸 ベロ藍 river (a visible saturation jump) |
| 7 庄野 2024–25 | 414 / 331 | Slope on a strong diagonal, bending bamboo in three grey layers, running figures with umbrella; rest placed after the rain thins (rain = DOM overlay); then outro | Slope + bamboo | 漆 鈍 bokashi; then 捌 金 in the outro |

**Travel segment** between rests (≈ 2.2–2.3 s): 0–25 % camera eases out leftwards inside diorama k (parallax reveals depth) → 25–60 % mist card sweeps across while the camera crosses the gap → 60–100 % camera eases into diorama k+1's rest pose (plate wipe 65–95 %). Portrait: vertical pans within each diorama in the first and last 25 % of travel. Captions are DOM (not in the video).

### 7.3 Production pipeline (WP-03)

1. **Masks** — `tools/film/masks/<station>.json` per station (7 files), authored by viewing each print (zoom with the image reader): `crop` (normalised), `layers[]` (`name`, `z`, `poly` ≤ 60 points in normalised image coords, or `kind: "gradient"` with plate indices for the rebuilt bokashi sky), `remove[]` (polygons filled from the layer below — Mishima's torii/lanterns), `vp` (vanishing point of the rest framing), `travellerPath`, `rest` and `restPortrait` camera poses. Coarse polygons are fine; the quantisation hides edges.
2. **Plates** — `tools/film/plates.py` (Python 3.12 + Pillow, run with `python3 -I`): per layer: anti-aliased polygon mask at 4× supersampling → RGBA crop → `quantize(48, MEDIANCUT)` → map each cluster to the nearest colour of P_k **and** of P_{k−1} by CIEDE2000 (pure-Python implementation) → `ModeFilter(3)` to remove paper speckle → hole-fill regions hidden by front layers with the layer's dominant palette colour → PNG-8 at ≤ 2048 px wide. Shōno: levels lift (gamma 0.8, black point +18) before quantising. Outputs `assets-src/film/plates/<station>/<layer>.{k,k-1}.png` + `plates.json`. Sky layers are procedural gradients (colours from the mask JSON).
3. **Scene** — `src/film/scene/` (TypeScript, three r186): `tatebanko.ts` (builds dioramas from `plates.json`), `camera-paths.ts` (CatmullRom paths with frame-exact rest poses, landscape and portrait), `traveller.ts`, `mist.ts` (mist cards and gold suyari bands as SDF shapes), `wipe.glsl.ts` (baren zig-zag mask between the two palette textures). Deterministic: frame index → time, mulberry32 seeded randomness, no `Timer`, no `Math.random`.
4. **Capture** — `tools/film/capture.html` + `src/film/scene/capture-entry.ts`, served by Vite dev (`--port 5173`): `?variant=landscape|portrait`. Renders at master resolution with `antialias:true`, `preserveDrawingBuffer:true` (capture only), awaits textures + `renderer.compileAsync` + one throw-away frame, exposes `window.capture = { ready, frames(start, n, mime) }` (*threejs* §j). `tools/film/capture.mjs` (project Playwright, SwiftShader args, batches of 8 PNG) pipes to ffmpeg → near-lossless master:
   ```bash
   flock .locks/browser.lock node tools/film/capture.mjs --variant landscape --out assets-src/film/master-landscape.mp4
   # inside capture.mjs, ffmpeg args for the master:
   # -f image2pipe -framerate 30 -i - -c:v libx264 -preset veryfast -crf 12 -g 8 -bf 0 -pix_fmt yuv420p assets-src/film/master-landscape.mp4
   flock .locks/browser.lock node tools/film/capture.mjs --variant portrait  --out assets-src/film/master-portrait.mp4   # -framerate 24
   ```
   Expect ≈ 3 min per master on SwiftShader. Hash every 30th frame to detect duplicate/black frames; retry a batch on `Target closed`.
5. **Encode** — `tools/film/encode.sh` (exact commands; *video* §2.5):
   ```bash
   FF=tools/bin/ffmpeg
   COLOR="-colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv"
   X264="-c:v libx264 -preset slow -profile:v high -pix_fmt yuv420p -tag:v avc1 -movflags +faststart -an"
   REST="0,2.2,4.6,6.9,9.2,11.5,13.8"
   ZL="zones=0,3,q=18/63,69,q=18/135,141,q=18/204,210,q=18/273,279,q=18/342,348,q=18/411,417,q=18"
   ZP="zones=0,3,q=18/50,56,q=18/107,113,q=18/163,169,q=18/218,224,q=18/273,279,q=18/328,334,q=18"
   flock .locks/ffmpeg.lock nice -n 10 $FF -y -i assets-src/film/master-landscape.mp4 -vf "fps=30,scale=1280:720:flags=lanczos" $COLOR $X264 -level:v 4.0 \
     -crf 23 -g 8 -keyint_min 8 -bf 0 -force_key_frames "$REST" -x264-params "$ZL" build/film/film-hd.mp4
   flock .locks/ffmpeg.lock nice -n 10 $FF -y -i assets-src/film/master-landscape.mp4 -vf "fps=30,scale=960:540:flags=lanczos" $COLOR $X264 -level:v 3.1 \
     -crf 24 -g 8 -keyint_min 8 -bf 0 -force_key_frames "$REST" -x264-params "$ZL" build/film/film-sd.mp4
   flock .locks/ffmpeg.lock nice -n 10 $FF -y -i assets-src/film/master-portrait.mp4 -vf "fps=24,scale=720:1280:flags=lanczos" $COLOR $X264 -level:v 4.0 \
     -crf 25 -g 8 -keyint_min 8 -bf 0 -force_key_frames "$REST" -x264-params "$ZP" build/film/film-portrait.mp4
   # stills from the ENCODED files (poster = first decoded frame exactly)
   i=1; for t in ${REST//,/ }; do
     $FF -y -ss "$t" -i build/film/film-hd.mp4 -frames:v 1 -update 1 -c:v png build/film/ch-$i.png
     $FF -y -i build/film/ch-$i.png -c:v libaom-av1 -still-picture 1 -crf 30 -cpu-used 4 -pix_fmt yuv420p build/film/ch-$i.avif
     $FF -y -i build/film/ch-$i.png -c:v libwebp -quality 78 -compression_level 6 build/film/ch-$i.webp
     # same three lines from film-portrait.mp4 → ch-$i-p.{png,avif,webp}
     i=$((i+1)); done
   # end still (gold bands): -sseof -0.05 from each file → end.{avif,webp}, end-p.{avif,webp}
   ```
   Do not pass `-sc_threshold 0` (scene-cut detection only adds keyframes). If a file exceeds its budget, raise CRF by 2 (≈ −25 % bytes) after first simplifying content.
6. **Publish** — `tools/film/publish.mjs`: sha256 → 8-hex suffix (`film-hd.<hash>.mp4`, `ch-1.<hash>.avif` …) copied into `public/film/`, and writes `src/film/film-manifest.json` (schema §7.4). Verify keyframes: `tools/bin/ffprobe -v error -select_streams v:0 -show_entries packet=pts_time,flags -of csv=p=0 <file> | grep K` → a K every 8 frames plus all seven rest times.

### 7.4 `src/film/film-manifest.json` (written by WP-03; WP-00 commits a stub with a synthetic test film)

```json
{
  "version": 1,
  "duration": 16.0,
  "chapters": [
    { "n": 1, "rest": 0.0,  "hold": 0.30, "station": "nihonbashi" },
    { "n": 2, "rest": 2.2,  "hold": 0.40, "station": "hakone" },
    { "n": 3, "rest": 4.6,  "hold": 0.40, "station": "mishima" },
    { "n": 4, "rest": 6.9,  "hold": 0.40, "station": "hara" },
    { "n": 5, "rest": 9.2,  "hold": 0.40, "station": "shimada" },
    { "n": 6, "rest": 11.5, "hold": 0.40, "station": "okazaki" },
    { "n": 7, "rest": 13.8, "hold": 0.55, "station": "shono" }
  ],
  "variants": {
    "hd":       { "src": "film/film-hd.0000000a.mp4",       "w": 1280, "h": 720,  "fps": 30, "frames": 480, "bytes": 0 },
    "sd":       { "src": "film/film-sd.0000000b.mp4",       "w": 960,  "h": 540,  "fps": 30, "frames": 480, "bytes": 0 },
    "portrait": { "src": "film/film-portrait.0000000c.mp4", "w": 720,  "h": 1280, "fps": 24, "frames": 384, "bytes": 0 }
  },
  "stills": {
    "landscape": { "avif": ["film/ch-1.<h>.avif", "…7 entries"], "webp": ["…"], "end": { "avif": "…", "webp": "…" } },
    "portrait":  { "avif": ["…7"], "webp": ["…7"], "end": { "avif": "…", "webp": "…" } }
  },
  "matchVp": [0.5, 0.40],
  "matchVpPortrait": [0.5, 0.36],
  "endBands": [ { "y": 0.16, "h": 0.12, "x0": -0.1, "x1": 0.72 }, { "y": 0.47, "h": 0.10, "x0": 0.25, "x1": 1.1 }, { "y": 0.78, "h": 0.14, "x0": -0.1, "x1": 0.6 } ],
  "endBandsPortrait": [ { "y": 0.12, "h": 0.08, "x0": -0.1, "x1": 0.8 }, { "y": 0.44, "h": 0.07, "x0": 0.2, "x1": 1.1 }, { "y": 0.80, "h": 0.10, "x0": -0.1, "x1": 0.7 } ]
}
```
All `src` paths are relative to the site root and resolved with `ctx.assets.url()` (§8.3). `bytes` are real after publish.

### 7.5 Overlays per chapter

Captions (§6.3) from `facts.career[n]`; reference prints: `tokaido/01-nihonbashi`, `11-hakone` (**cropped to the right 75 %, credited "detail"**, so its faint distant Fuji is not shown), `12-mishima` (**cropped to the left 62 %, credited "detail"**, so no torii is shown), `14-hara`, `24-shimada`, `39-okazaki`, `46-shono`. Rain overlay during ch 7 only. Night veil always on at night. Grain overlay always (static). Nothing over the video uses `backdrop-filter` or `mix-blend-mode`; caption plates are opaque.

### 7.6 Player (WP-06, `src/film/player/`)

Implement *video* §3–§5 exactly (`plan.ts`, `load.ts`, `chapters.ts` with `buildTimeLut(…, 2048)`, `scroll-film.ts` = the `ScrollFilm` class, `webcodecs-film.ts` with dynamic `import('mediabunny')`, `mount.ts`), with these deltas:
- Progress from `ctx.scroll.track(section, { start: 'top top', end: 'bottom bottom', onUpdate, onToggle })` (ScrollTrigger underneath, progress only).
- `onToggle(active)`: `film.setActive(active)`; while active `ctx.getStage()?.pause('film')` and `#stage` gets `visibility:hidden`; on leave `resume('film')`.
- Fetch: idle prefetch (fast connection or fine pointer), `IntersectionObserver` with `rootMargin: '300% 0px'`, and also when the `summary-road` band starts. Whole file as a Blob → `URL.createObjectURL`.
- Poster `<picture>` fades after `seeked` + one `requestVideoFrameCallback`, then is removed.
- Single-flight seeks (never assign `currentTime` while `video.seeking`; newest target wins; frame-centre times); time-based damping k = 20 s⁻¹; rAF only while target ≠ shown; `fastSeek` only for jumps > 1 s (Layers sub-layer clicks), then an exact seek.
- Runtime downgrade: EWMA seek latency > 66 ms over 30 seeks → swap to `film-sd` at the next idle moment (only from HD), revoke the old blob URL. Only one film is ever in memory.
- iOS: `needsIosProbe` play/pause after `loadeddata`; `NotAllowedError` → WebCodecs tier if `VideoDecoder` exists, else stills.
- Errors, `decodingInfo.supported === false`, or a 10 s timeout after the section is in view → **stills tier** silently.
- Chapter index → `section.dataset.chapter`, `ctx.chrome.setRulerYears(p)`, `ctx.print.ink(n)` (and `ink(8)` at p ≥ 0.98).
- Night: veil only (no file swap).
- Tiers (*video* §5.4): `static` (reduced motion / Proof → stills in flow) · `stills` (Save-Data, 2G, failures → sticky stage with 7 crossfading stills on the same CSS ranges) · `webcodecs` (iOS Low Power with `VideoDecoder`) · `video` portrait / SD / HD. Software-GL visitors still get video (decoding is not GL).
- Optional stretch (high tier only, never blocking): **生 / 版 toggle** — pauses the video and renders the live tatebanko scene (`src/film/scene`, lazily loaded with its plate atlas) at the same frame; the Info panel shows "seek 36 ms · live 11.8 ms/frame".

---

## 8. Technical architecture

### 8.1 Stack and why

- **Vite + TypeScript (strict) + vanilla DOM.** No framework: pages are statically generated from TypeScript string-template render functions (§8.4), the DOM is the source of truth, and modules only enhance it — no hydration cost, tiny first-view JS, SEO-complete HTML.
- **three 0.186.1 `WebGLRenderer` + GLSL** (not WebGPURenderer: +110 KB gzip and a backend headless tests cannot exercise; *threejs* §1). **gsap 3.15.0** (ScrollTrigger, SplitText — all free), **lenis 1.3.27**, **mediabunny 1.62.1** (dynamic import, WebCodecs tier only).

### 8.2 Dependencies (installed by WP-00 with exact pins; nobody else edits `package.json`)

| Package | Version | Use |
|---|---|---|
| three | 0.186.1 | WebGL |
| gsap | 3.15.0 | ScrollTrigger (progress), SplitText (one use), `updateRoot` |
| lenis | 1.3.27 | wheel smoothing |
| mediabunny | 1.62.1 | WebCodecs film tier (lazy) |
| vite | **8.3.4** (Rolldown-based; 8.3.5 was published 2026-10-21, < 14 days old) | build, dev server |
| esbuild | latest 0.28.x (Vite 8's optional peer range) | bundling `src/render/page.ts` for the SSG plugin |
| typescript, tsx | latest stable ≥ 14 days old | typecheck, running TS scripts |
| @types/three | 0.186.0 | types |
| sharp | latest stable ≥ 14 days old | image derivatives (AVIF/WebP) |
| playwright | 1.64.1 | capture, posters, CV PDFs, measurement |
| axe-core | latest stable | a11y checks (WP-11) |
| ffprobe-static | latest stable | GOP verification |

`tools/bin/ffprobe` is copied from `node_modules/ffprobe-static/bin/linux/x64/ffprobe`; `tools/bin/ffmpeg` is copied by WP-00 from `/tmp/claude-1000/-home-star-Documents-Portf/e62e8949-2791-405e-a4be-159327fe6fc9/scratchpad/fftest/node_modules/ffmpeg-static/ffmpeg` (fallback: `npm i -D ffmpeg-static` and symlink). npm scripts: `dev`, `build` (`tsc --noEmit && vite build && node scripts/postbuild.mjs`), `preview`, `typecheck`, `fonts`, `images`, `film:plates`, `film:capture`, `film:encode`, `film:publish`, `capture:posters`, `capture:strips`, `cv`, `measure`, `check` (contrast, budgets, ownership, content).

### 8.3 File tree and ownership

```text
Portf/
├─ package.json  package-lock.json  tsconfig.json  vite.config.ts  .gitignore  README.md     [WP-00]
├─ index.html  en/index.html  zh/index.html  404.html                                        [WP-00] stubs filled by SSG
├─ works/<caseId>/index.html  en/works/<caseId>/index.html  zh/works/<caseId>/index.html      [WP-00] 18 stubs
├─ build/ssg-plugin.ts  build/budgets.json  build/edition.json                                [WP-00]
├─ build/film/                                                                                [WP-03] encode scratch (gitignored)
├─ scripts/postbuild.mjs                                                                      [WP-00]
├─ scripts/fonts/**  scripts/images/**                                                        [WP-02]
├─ scripts/capture-posters.mjs                                                                [WP-00 creates; WP-11 owns after Phase 1]
├─ scripts/capture-strips.mjs  scripts/build-cv.mjs  scripts/measure/**  scripts/check/**       [WP-11]
├─ tools/bin/{ffmpeg,ffprobe}                                                                 [WP-00] (gitignored)
├─ tools/film/**                                                                              [WP-03]
├─ assets-src/images/**                                                                       read-only (research output)
├─ assets-src/film/**                                                                         [WP-03]
├─ assets-src/svg/**                                                                          [WP-02]
├─ public/robots.txt                                                                          [WP-00]
├─ public/film/**                                                                             [WP-03]
├─ public/img/{tokaido,rinpa,hokusai,pattern,ukie,night,landscape,writing}/**                 [WP-02]
├─ public/img/gen/**                                                                          [WP-02] except files listed in §12 for other WPs
├─ public/img/posters/<viewId>-*.avif                                                         [the view's section WP; WP-11 recaptures]
├─ public/fonts/**  public/cursors/**  public/print/**  public/og/**  public/favicon*  public/icon-*  public/apple-touch-icon.png  [WP-02]
├─ public/cv/**                                                                               [WP-11]
├─ src/main.ts                                                                                [WP-00]
├─ src/core/** (all files)                                                                    [WP-00] except src/core/icons.ts [WP-02]
├─ src/gl/stage/**  src/gl/chunks/{research,noise,paper,colorspace}.ts                        [WP-00]
├─ src/gl/chunks/gold.ts                                                                      [WP-07]
├─ src/gl/chunks/peel.ts  src/gl/carve/**                                                     [WP-05] (WP-00 stubs)
├─ src/gl/seal/**                                                                             [WP-09] (WP-00 stub)
├─ src/content/types.ts  src/content/index.ts                                                 [WP-00]
├─ src/content/{facts,copy,glossary,credits,site.config}.ts                                   [WP-01] (WP-00 seeds)
├─ src/content/images.json                                                                    [WP-02] (WP-00 seeds from manifest)
├─ src/styles/{tokens,base,type,layout,marks,motion}.css                                      [WP-00]
├─ src/chrome/**                                                                              [WP-04]
├─ src/render/**                                                                              [WP-00]
├─ src/sections/registry.ts  src/sections/styles.ts                                           [WP-00]
├─ src/sections/{cover,summary}/**                                                            [WP-05]
├─ src/sections/road/**  src/film/player/**                                                   [WP-06]
├─ src/sections/works/**                                                                      [WP-07]
├─ src/sections/{skills,principles}/**                                                        [WP-08]
├─ src/sections/achievements/**                                                               [WP-09]
├─ src/sections/{writing,testimonials,contact,colophon}/**                                    [WP-10]
├─ src/film/film-manifest.json  src/film/scene/**                                             [WP-03] (WP-00 stub manifest)
├─ docs/DESIGN.md                                                                             read-only
├─ docs/wp-requests/<WP-ID>.md                                                                each WP its own file (input for WP-11)
└─ .locks/                                                                                    [WP-00] (gitignored)
```

Each section directory contains: `render.ts` (SSG, Node-safe), `index.ts` (default export `SectionModule`), optional `view.ts` (default export a `View` factory `(el, ctx) => View`), `style.css` (scoped under `[data-section="<id>"]`), `strings.ts` (micro-strings `Record<Lang, …>` + optional `display: Partial<Record<Lang, string>>` extra glyphs for font subsets), and any data/shader files.

### 8.4 Static generation (owner WP-00)

- 22 stub HTML files (3 main + 18 case + 404) of the form:
  ```html
  <!doctype html>
  <html data-page="main" data-lang="en" class="no-js">
  <head><meta charset="utf-8"><!--ssr-head--></head>
  <body><!--ssr-body--><script type="module" src="/src/main.ts"></script></body>
  </html>
  ```
- `build/ssg-plugin.ts`: a Vite plugin with `transformIndexHtml({ order: 'pre' })`. It infers `{lang, page, caseId}` from the file path and replaces the markers with `renderPage(spec)`. In dev it loads `src/render/page.ts` through `server.ssrLoadModule`; in build it bundles `src/render/page.ts` with esbuild (`platform: 'node'`, ESM, alias `@ → src`, JSON loader) and imports the result.
- **Render modules are Node-safe**: they import only `src/content/**`, `src/render/helpers.ts`, `src/core/types.ts`, `src/core/icons.ts`, `src/core/numerals.ts` and other `render.ts` files. No DOM, no three, no CSS, no `import.meta.env`.
- `renderPage` emits: `<html lang>` + `data-*`; head (title, description, canonical, hreflang alternates incl. `x-default` → ja, OG/Twitter tags with `og/og-{lang}.png`, JSON-LD `Person` + `ProfilePage`, two `theme-color` metas, font CSS links `fonts/fonts-shared.css` + `fonts/fonts-{lang}.css` (depth-correct), preload of the cover display subset, the inline boot script ≤ 1 KB); body: skip link, chrome markup (`src/chrome/render.ts`), `<canvas id="stage" aria-hidden="true">`, `<main id="main">` with all section renders in order (main page) or `renderCase` (case page) or `renderNotFound`.
- All section CSS is imported statically via `src/sections/styles.ts` (one CSS bundle, render-blocking, no FOUC); fonts CSS lives in `public/fonts/`.
- Absolute URLs (canonical, hreflang, OG, sitemap) only when `SITE_ORIGIN` is set at build; otherwise relative.

### 8.5 Runtime contracts (`src/core/types.ts`, owner WP-00 — frozen after Phase 0)

```ts
import type * as THREE from 'three';
import type { Content, CaseId, ImagesIndex, ManifestEntry } from '../content/types';
import type { IconName } from './icons';

export type Lang = 'ja' | 'en' | 'zh';
export const LANGS = ['ja', 'en', 'zh'] as const;
export const HTML_LANG: Record<Lang, string> = { ja: 'ja', en: 'en', zh: 'zh-Hans' };
export type Theme = 'day' | 'night';
export type ThemePref = 'auto' | 'light' | 'dark';
export type PageKind = 'main' | 'case' | 'notfound';
export type SectionId = 'cover' | 'summary' | 'road' | 'works' | 'skills' | 'principles'
  | 'achievements' | 'writing' | 'testimonials' | 'contact' | 'colophon';
export const SECTION_ORDER: readonly SectionId[] = ['cover', 'summary', 'road', 'works', 'skills',
  'principles', 'achievements', 'writing', 'testimonials', 'contact', 'colophon'];
export type BandId = 'cover-summary' | 'summary-road' | 'road-works' | 'works-skills' | 'skills-principles'
  | 'principles-achievements' | 'achievements-writing' | 'writing-testimonials' | 'testimonials-contact' | 'contact-colophon';
export type PlateN = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/* ---------- quality tiers ---------- */
export type TierName = 'high' | 'medium' | 'low' | 'software' | 'static';
export interface TierCounts {
  carveRes: 1024 | 768 | 512 | 0; blockSegments: 256 | 128 | 64 | 0; sheetSegments: readonly [number, number];
  byobuDetail: 2 | 1 | 0; byobuSegmentsPerPanel: 8 | 4 | 2;
  kumiko: number; sandTrail: 1024 | 512 | 256 | 0; sandDisplace: boolean;
  sunago: number; sealRes: 512 | 384 | 256 | 0; embossRes: 1024 | 768 | 512 | 0;
  marble: 1536 | 1024 | 768 | 512; marbleSpread: boolean; marbleIds: boolean;
  noren: { cols: number; rows: number; iters: number };
  emakiSegments: 900 | 600 | 300 | 0; texMax: 4096 | 2048 | 1024;
}
export interface Tier {
  name: TierName; maxDpr: number; minDpr: number; msaa: boolean; post: boolean;
  maxLiveViews: 0 | 1 | 2; bandExtraView: boolean; warmAhead: number; vramBudget: number;
  counts: TierCounts; mobile: boolean; renderer: string;
  caps: { floatRT: boolean; floatLinear: boolean; parallelCompile: boolean; maxTexture: number };
}
export interface TierAPI { readonly current: Tier; on(cb: (t: Tier) => void): () => void; force(name: TierName): void }

/* ---------- WebGL views ---------- */
export interface ViewFrame {
  progress: number;          // 0..1 as the placeholder crosses the viewport
  sectionProgress: number;   // 0..1 across the owning section's scroll range (sticky-aware)
  visible: number;           // 0..1 visible fraction
  pointer: THREE.Vector2 | null;  // view-local NDC, null when the pointer is elsewhere
  pointerDown: boolean;
  scrollVelocity: number;    // px/s
}
export interface View {
  readonly id: string;                 // 'cover-block' | 'works-byobu' | …
  readonly el: HTMLElement;            // placeholder; carries --poster
  readonly scene: THREE.Scene;
  readonly camera: THREE.Camera;
  readonly printName: string;          // Info panel label, e.g. '金箔'
  vram: number;                        // estimated bytes while live
  init(stage: StageAPI): Promise<void>;          // CPU-side construction only
  allocate?(stage: StageAPI): Promise<void>;     // render targets, data textures
  prewarm?(stage: StageAPI): void;               // one sim pass so off-graph programs link
  update(dt: number, t: number, f: ViewFrame): boolean;  // true = request another frame
  render(renderer: THREE.WebGLRenderer): void;
  park?(): void;                       // free RTs and large textures, keep materials
  dispose(): void;
  onContextRestored?(): void;          // rebuild RT contents, re-seed deterministically
  setOutline?(on: boolean): void;
  setTier?(t: Tier): void;             // uniforms / draw ranges only, never #define
}
export type ViewFactory = (el: HTMLElement, ctx: AppContext) => View;
export interface ViewOptions { order?: number; clear?: 'depth' | 'all'; band?: BandId }
export interface GlobalUniforms {
  uTime: THREE.IUniform<number>; uNight: THREE.IUniform<number>; uPointer: THREE.IUniform<THREE.Vector2>;
  uScroll: THREE.IUniform<number>; uDpr: THREE.IUniform<number>; uMotion: THREE.IUniform<number>;
  uOutline: THREE.IUniform<number>;
}
export interface StageStats {
  fps: number; frameMs: number; calls: number; triangles: number; programs: number; textures: number;
  geometries: number; dpr: number; tier: TierName; live: string[]; perViewMs: Record<string, number>;
  governor: string; gpu: string;
}
export interface StageAPI {
  readonly renderer: THREE.WebGLRenderer; readonly g: GlobalUniforms; readonly tier: Tier;
  register(view: View, opts?: ViewOptions): void; unregister(view: View): void;
  requestFrame(): void; pause(reason: string): void; resume(reason: string): void;
  setOutline(on: boolean): void; stats(): StageStats; onStats(cb: (s: StageStats) => void): () => void;
  loseContext(): void; restoreContext(): void;
}

/* ---------- scroll ---------- */
export interface TrackOptions { start?: string; end?: string; onUpdate(p: number): void; onToggle?(active: boolean): void }
export interface ScrollAPI {
  readonly y: number; readonly velocity: number; readonly active: SectionId;
  track(el: Element, opts: TrackOptions): () => void;          // ScrollTrigger (progress only) or IO fallback
  band(id: BandId): { el: HTMLElement | null; on(cb: (p: number) => void): () => void };
  section(id: SectionId): { el: HTMLElement; on(cb: (p: number) => void): () => void };
  onActive(cb: (id: SectionId) => void): () => void;
  scrollTo(target: string | Element | number, opts?: { immediate?: boolean; offset?: number }): void;
  refresh(): void;
}

/* ---------- theme, motion, i18n ---------- */
export interface ThemeAPI { readonly current: Theme; readonly pref: ThemePref; set(p: ThemePref): void; toggle(): void; on(cb: (t: Theme) => void): () => void }
export interface MotionAPI {
  readonly enabled: boolean; on(cb: (enabled: boolean) => void): () => void;
  registerSnap(root: ParentNode): void;                  // data-print behaviour (§5.5)
}
export interface I18nAPI {
  readonly lang: Lang;
  t(x: Readonly<Record<Lang, string>>): string;
  href(lang: Lang): string;            // this page in another language (relative URL, keeps #hash)
  switchTo(lang: Lang): void;          // store pref + position, spin wheel, navigate
  prefetch(lang: Lang): void;
  num(n: number, opts?: Intl.NumberFormatOptions): string;
  date(iso: string, style?: 'short' | 'long' | 'month'): string;
  daiji(n: number): string;            // ja 大字
  daxie(n: number): string;            // zh 大写
  plateNumeral(n: PlateN): string;     // 壱 | I | 壹
  jstNow(): { hh: string; mm: string; iso: string };
  solarTerm(d?: Date): { index: number; ja: string; zh: string; en: string };
}

/* ---------- today's print ---------- */
export interface MarbleOp { k: 'drop' | 'tine' | 'comb'; c?: [number, number]; r?: number; ink?: PlateN | 0;
  a?: [number, number]; m?: [number, number]; alpha?: number; lambda?: number; spacing?: number; id?: number }
export interface SealImpression { pressure: number; rotation: number; at: number }
export interface PrintStateAPI {
  readonly seed: number; readonly inked: ReadonlySet<PlateN>; readonly hidden: ReadonlySet<PlateN>;
  ink(n: PlateN): void; setHidden(n: PlateN, hidden: boolean): void;
  readonly marbling: { canvas: HTMLCanvasElement | null; ops: readonly MarbleOp[]; version: number };
  setMarbling(canvas: HTMLCanvasElement, ops: readonly MarbleOp[]): void;
  readonly seal: SealImpression | null; setSeal(s: SealImpression): void;
  on(ev: 'ink' | 'hide' | 'marbling' | 'seal', cb: () => void): () => void;
}

/* ---------- chrome bridge, assets, perf ---------- */
export interface ChromeAPI {
  setRulerYears(p: number | null): void;   // film only; null restores the artboard unit
  smartGuide(x: number, y: number, label: string): void;
  setStatus(text: string | null): void;
  spinWheel(to: Lang): Promise<void>;
}
export interface FilmVariant { src: string; w: number; h: number; fps: number; frames: number; bytes: number }
export interface FilmManifest {
  version: 1; duration: number;
  chapters: { n: 1 | 2 | 3 | 4 | 5 | 6 | 7; rest: number; hold: number; station: string }[];
  variants: { hd: FilmVariant; sd: FilmVariant; portrait: FilmVariant };
  stills: Record<'landscape' | 'portrait', { avif: string[]; webp: string[]; end: { avif: string; webp: string } }>;
  matchVp: [number, number]; matchVpPortrait: [number, number];
  endBands: { y: number; h: number; x0: number; x1: number }[];
  endBandsPortrait: { y: number; h: number; x0: number; x1: number }[];
}
export interface AssetAPI {
  url(rootRelative: string): string;       // dev: '/'+p ; build: new URL('../'+p, import.meta.url)
  img(file: string, opts: { alt: string; sizes: string; className?: string; eager?: boolean }): HTMLPictureElement;
  imageInfo(file: string): ImagesIndex[string] | undefined;
  readonly manifest: readonly ManifestEntry[];
  readonly film: FilmManifest;
}
export interface PerfAPI { bytes(): number; vitals(): { lcp?: number; inp?: number; cls?: number }; on(cb: () => void): () => void; mark(name: string): void }

/* ---------- context, sections, render ---------- */
export interface AppContext {
  readonly page: PageKind; readonly lang: Lang; readonly content: Content; readonly proof: boolean;
  readonly theme: ThemeAPI; readonly motion: MotionAPI; readonly tier: TierAPI; readonly scroll: ScrollAPI;
  readonly i18n: I18nAPI; readonly print: PrintStateAPI; readonly chrome: ChromeAPI;
  readonly assets: AssetAPI; readonly perf: PerfAPI;
  getStage(): Promise<StageAPI | null>;    // null: static tier, Proof mode or no WebGL2
}
export interface SectionModule { readonly id: SectionId; mount(el: HTMLElement, ctx: AppContext): void | Promise<void>; dispose?(): void }
export interface RenderCtx {
  readonly lang: Lang; readonly page: PageKind; readonly caseId?: CaseId; readonly content: Content;
  t(x: Readonly<Record<Lang, string>>): string;
  esc(s: string): string;
  url(rootRelative: string): string;       // depth-correct relative URL
  img(file: string, opts: { alt: string; sizes: string; className?: string; eager?: boolean }): string;  // <picture> HTML with data-file
  icon(name: IconName): string;
}
export type SectionRender = (rc: RenderCtx) => string;
```

Conventions: `src/sections/<id>/render.ts` → `export const render: SectionRender`; Works also `export const renderCase: SectionRender`; Colophon also `export const renderNotFound: SectionRender` (in `not-found.ts`). `index.ts` → `export default { id, mount } satisfies SectionModule`. `view.ts` → `export default (el, ctx) => View` (`ViewFactory`). Sections obtain the stage with `const stage = await ctx.getStage(); if (stage) stage.register((await import('./view')).default(el, ctx))`. `src/sections/registry.ts` (WP-00) maps ids to lazy `import('./<id>/index')`.

### 8.6 Stage rules (WP-00 implements; *threejs* §a with these decisions)

- One fixed `<canvas id="stage">` (`position: fixed; inset: 0; z-index: 1; pointer-events: none`), one `WebGLRenderer({ alpha: true, premultipliedAlpha: true, antialias: tier.msaa && dpr < 1.5, stencil: false, powerPreference: 'high-performance' })`, `ColorManagement.enabled`, `outputColorSpace = SRGBColorSpace`, clear colour transparent, `info.autoReset = false` (summed per frame), `debug.checkShaderErrors = import.meta.env.DEV`, one `THREE.Timer` connected to `document`.
- Views register a placeholder; rects cached via `ResizeObserver` + `docTop` (never `getBoundingClientRect` per frame); viewport = full placeholder rect, scissor = visible part; GL origin bottom-left. r186 render-target quirk: set `rt.viewport/rt.scissor` in RT pixels and re-bind (*threejs* P1).
- **Live-view cap**: `tier.maxLiveViews` (2 high/medium, 1 low/software); +1 only while a 間 band involving both views is active (`bandExtraView`). Priority = visible area. Warm-ahead `tier.warmAhead` screens (IO rootMargin), one view at a time: `init → allocate → compileAsync → prewarm` during idle. Park when > 3 screens away or over `vramBudget` (frees RTs, keeps materials/programs).
- **Render on demand** through `core/frame.ts`: a frame runs only if a visible live view's `update()` returned true, `requestFrame()` was called, the pointer moved over a view, scroll changed, or `uNight`/outline tweens run. No visible view or `document.hidden` → zero frames.
- Views clear **depth only** by default (transparent; DOM paper shows through) so overlapping views in a band composite in DOM order; `clear: 'all'` for opaque views.
- Global uniforms are shared objects (`stage.g`); materials reference them directly; never replace uniform objects (*threejs* P3). Custom shaders writing to the screen end with `#include <colorspace_fragment>` (P4). `InstancedMesh.frustumCulled = false` when vertices move (P6). Point sizes × DPR (P7). Stable program keys; `customProgramCacheKey` on every `onBeforeCompile` material; `renderer.info.programs.length` must stop growing after warm-up.
- **Post** (high tier only): one combined pass (*shaders* `POST_FRAG`: nijimi ink bleed, static paper tooth, ≤ 8 % vignette, tone mapping + sRGB, ±0.5/255 dither) into a half-float RT at min(DPR, 1.5), **scissored to the union of visible view rects**. No chromatic aberration, no bloom. Other tiers render straight to the canvas. DOM paper tooth comes from `.artboard:not(#road)::before` (absolute, `inset: 0`, no z-index, `background: url(img/gen/grain-day-256.webp)` or `grain-night-256.webp` by theme, `opacity: var(--grain-opacity)`, **normal blending** — pre-tinted transparent tiles, so no blend mode and nothing ever sits over the video); views add their own fibre noise via `paper.ts`.
- **Governor** (*threejs* §i): learns refresh rate, lowers DPR in 0.25 steps first, then tier; recovers after 8 s; hysteresis 2 s. Tier changes go through `view.setTier()` (uniforms/draw ranges).
- **Tier detection** at boot (*threejs* §i `detectTier`, adapted): `?tier=` override; `failIfMajorPerformanceCaveat` probe; SwiftShader/llvmpipe/software → `software`; reduced motion → counts at most `low`, motion off (views render single still frames, film static tier); Save-Data → counts at most `low`, film stills tier; coarse pointer + small screen → at most `medium`, DPR ≤ 1.5; no WebGL2 or Proof → `static`.
- Pause reasons: `film`, `hidden`, `proof`, `context-lost`, `eye:<sectionId>`; `motion-off` switches to on-demand single frames with `uMotion = 0`.
- Context loss: `html.gl-lost` shows every placeholder's poster (CSS); on restore, views go to `parked` and re-init; simulations re-seed from `ctx.print.seed` and op lists.
- Debug API `window.__hanmoto = { stage, views, tier, forceTier(name), loseContext(), restoreContext(), seed, replay(ops), film: { plan, seeks }, print, version }`, plus a one-line console greeting 「見当よし。」.

### 8.7 CSS layering (critical for views behind text)

- `body` background `--pasteboard`; `.artboard` background `--paper`, `position: relative` and **no z-index**; `#stage` fixed `z-index: 1`; every direct child of an artboard except `.view` placeholders gets `position: relative; z-index: 2` (rule in `layout.css`: `.artboard > :not(.view) { position: relative; z-index: 2; }`), chrome `z-index: 20`, sheets 30, dialogs 40.
- **An artboard that hosts a view must not create a stacking context**: no `transform`, `filter`, `opacity < 1`, `will-change`, `contain: paint|strict|content`, `content-visibility`, `isolation`, `mix-blend-mode` on the artboard or its sticky stage. Otherwise text would sink under the canvas or the view would vanish under the paper.
- `content-visibility: auto` (with `contain-intrinsic-size`) is allowed only on sections without views (Summary) and inner text blocks (Colophon credits).
- The film section's DOM (`<video>` etc.) sits at `z-index: 2`; the canvas is hidden while the film is active.

### 8.8 Boot sequence (`src/main.ts`, WP-00)

1. **Inline head script** (≤ 1 KB, emitted by `renderPage`): resolve theme (`localStorage` → `data-theme`), set `html.js`, read `sessionStorage['hanmoto.pos']` and scroll there before first paint, flag the root-page language notice.
2. **First paint**: static HTML + CSS (cover facts, crest construction via CSS). LCP element = the cover `h1`. JS before LCP ≤ 15 KB gzip (theme, i18n basics, context skeleton).
3. **After first paint** (double rAF or first input, whichever first): build `AppContext`; mount chrome; mount `cover` and `summary`; dynamic-import the `motion` chunk (gsap + ScrollTrigger + SplitText + lenis) → `core/frame`, Lenis (if motion enabled), ScrollTrigger; `ctx.motion.registerSnap(document)`. Other sections mount lazily when within 2 viewports (IO `rootMargin: '200% 0px'`).
4. **After LCP** (`largest-contentful-paint` observed + `load` + `requestIdleCallback`, timeout 1500 ms): detect tier; unless `static`, dynamic-import the `three` chunk + stage → resolve `ctx.getStage()`; sections register views (each `view.ts` is its own chunk).
5. Film player mounts on approach (IO 300 %). `ScrollTrigger.refresh()` after `document.fonts.ready`.

### 8.9 Build configuration (`vite.config.ts`, WP-00)

```ts
export default defineConfig({
  base: './',
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  plugins: [ssg()],
  build: {
    target: 'es2022', outDir: 'dist', assetsDir: 'assets', cssCodeSplit: false,
    modulePreload: { polyfill: false }, assetsInlineLimit: 0, sourcemap: false,
    rolldownOptions: {                       // Vite 8: `rollupOptions` is a deprecated alias
      input: STUB_PAGES,                     // the 22 stub HTML files
      output: { manualChunks(id) {           // if the installed Rolldown marks manualChunks deprecated,
        if (id.includes('node_modules/three')) return 'three';          // express the same three groups
        if (id.includes('node_modules/gsap') || id.includes('node_modules/lenis')) return 'motion';
        if (id.includes('node_modules/mediabunny')) return 'mediabunny'; // with output.codeSplitting.groups
      } },
    },
  },
  server: { port: 5170, strictPort: true },
  preview: { port: 4170, strictPort: true },
});
```
Runtime URLs to `public/` files always go through `ctx.assets.url()` (dev: `'/' + p`; build: `new URL('../' + p, import.meta.url)` — every chunk lives in `dist/assets/`, so `../` is the site root at any page depth). `dist/` must work when served from any sub-path (verified by WP-11 by serving `dist/` under `/some/prefix/`). Directory links use trailing slashes (`en/`, `works/ledger/`); hosting must serve `index.html` for directories (README note).

---

## 9. Internationalisation

- **Languages**: Japanese (default, root URL, `x-default`), English (`en/`), Simplified Chinese (`zh/`). `<html lang>` = `ja` / `en` / `zh-Hans`; hreflang `ja`, `en`, `zh-Hans`, `x-default`. Every inline foreign run carries `lang`.
- **Static pages, real URLs.** Switching navigates to the other language's page (cross-document View Transition where supported); it is never a client-side text swap. The `#hash` is kept; `sessionStorage['hanmoto.pos'] = {section, offset}` restores the exact place before first paint.
- **Persistence** (all through `core/storage.ts`, try/catch, page works when storage throws): `localStorage` — `hanmoto.lang`, `hanmoto.theme`, `hanmoto.motion`, `hanmoto.seed`, `hanmoto.shortcuts`, `hanmoto.tier`; `sessionStorage` — `hanmoto.pos`, `hanmoto.langSwitched`, `hanmoto.eyes`. The root page never auto-redirects; it shows the one-line notice (§4.1) when the browser prefers another language and no preference is stored.
- **Fonts swap with the page**: each page links its own `fonts-{lang}.css`; the wheel prefetches the target's CSS and cover subset on hover/focus. Display-text animations wait for `document.fonts.load()`.
- **Numbers and dates**: `Intl.NumberFormat(lang)` and `Intl.DateTimeFormat(lang, { timeZone: 'Asia/Tokyo' })`. Gregorian dates everywhere except the Colophon stamp (和暦 + 節気 for ja; 公历 + 节气 for zh; Gregorian + solar term in en). Plate numerals: ja 大字, zh 大写, en Roman. Vertical CJK display text uses kanji numerals; vertical body uses 縦中横 Arabic for 2–3 digits.
- **Glossary** (Info panel, `src/content/glossary.ts`, ≥ 24 entries): 見当, 版下, 主版, 色版, 摺る, 空摺, 石摺, 錦絵, 奥付, 番付, 大関, 扇, 屏風, 下地骨, 金箔, 箔足, 組子, 三組手, 枯山水, 砂紋, 砂子, 墨流し, 料紙, 暖簾, 落款, 割印, 白文・朱文, 詞書, 異時同図法, すやり霞, 序破急, 間, 節気. Each: term, ruby, en name, zh name, one-line gloss per language.

**Tone guidelines (WP-01)**
- **ja**: 常体（だ・である）for headings, stage lines, captions and lists; 敬体（です・ます）only in the Contact letter and form messages. Concrete numbers and dates; no hype (「圧倒的」「革新的」「情熱」「最強」 are banned). Industry katakana as Japanese engineers use it (デプロイ, レイテンシ, オンコール, 可観測性). One stage line per section; never explain culture at length in body copy.
- **en**: US spelling; sentence-case headings; active voice; first person used sparingly and concretely ("I led the migration", not "Responsible for"); digits for all numbers; arrows for before → after; no buzzwords ("passionate", "rockstar", "ninja", "synergy", "leverage", "cutting-edge", "world-class"). Japanese terms appear italicised at most once per section, glossed in the Info panel. The "impression" double meaning is used once (cover stage line).
- **zh**: 简体中文，书面、简洁；少用"我"；大陆通行术语（部署、延迟、值班、可观测性）；全角标点；正文用阿拉伯数字，印面与番付用大写数字（壹贰叁肆伍陆柒捌玖拾）。**不从日文直译**：zh stage lines tell the Chinese printing heritage — cover: 十竹斋的饾版套色; skills: 毕昇活字与王祯转轮排字架; achievements: 拱花（空摺之祖）; writing: 笺纸与墨流. Japanese colour names in zh text are wrapped `<span lang="ja">`. Fonts with no Japanese-only glyph coverage are never used for such names.

---

## 10. Performance budget and strategy

### 10.1 Budgets (`build/budgets.json`, enforced by `scripts/check/budgets.mjs`, WP-11)

| Item | Budget |
|---|---|
| First view (HTML + CSS + fonts needed for the cover + JS before LCP), gzip | ≤ 160 KB |
| JS executed before LCP, gzip | ≤ 15 KB |
| App shell after first paint (core + chrome + cover/summary modules), gzip | ≤ 60 KB |
| `motion` chunk (gsap + ScrollTrigger + SplitText + lenis), gzip | ≤ 55 KB |
| `three` chunk + stage, gzip (after LCP) | ≤ 145 KB |
| Each `view.ts` chunk, gzip | 6–25 KB |
| `mediabunny` (WebCodecs tier only), gzip | ≈ 55 KB |
| CSS bundle, gzip | ≤ 28 KB |
| CJK body font per language (active only, sliced) | 0.6–1.0 MB over a full scroll |
| Display subsets per language | ≤ 50 KB (CJK); Latin display ≤ 220 KB (en) |
| Images per section (AVIF, lazy) | ≤ 250 KB; posters ≤ 60 KB each; stills ≤ 80 KB each |
| Film | HD ≤ 5 MB · SD ≤ 2.5 MB · portrait ≤ 3 MB (target ≈ 2.5 MB HD with flat colours) |
| Total transfer for a full desktop scroll, excluding film | ≤ 3 MB (mobile ≤ 2 MB) |
| Web Vitals (mid-range Android, 4G) | LCP ≤ 2.0 s · INP ≤ 150 ms · CLS ≤ 0.05; Lighthouse ≥ 90 in all four categories on the static first view |
| Idle (nothing moving, any section on screen) | zero rAF; main thread < 1 % |
| Film scrubbing (4× CPU throttle) | main thread < 15 %; ≥ 24 presented fps on mid hardware (≥ 15 on software decode); mean lag ≤ 3 frames; 0 long tasks from the film |
| Memory | film ≤ file size + 60 MB, flat across 10 scrubs; JS heap ≤ 40 MB; tab ≤ 350 MB desktop / ≤ 200 MB mobile |
| GPU | ≤ 2 live views (3 in a band); ≤ 20 draw calls at peak; VRAM ≤ 200 MB high / 90 MB medium & mobile / 60 MB low; DPR cap 2 desktop, 1.5 mobile; post RT at min(DPR, 1.5); no MSAA at DPR ≥ 1.5 |
| Shader programs | `renderer.info.programs.length` stops growing after each view's warm-up; no compile stall > 50 ms while a view is visible (compile happens off-screen) |

### 10.2 Per-view budgets (high tier, 1920 × 1080 at DPR 1.5)

| View | Draw calls | GPU memory | Fill | Runs frames when | CPU per frame |
|---|---|---|---|---|---|
| `cover-block` | ≤ 3 | ≈ 25 MB (height/normal RTs, sheet texture) | its rect | peel/tilt/carve changing | < 0.3 ms |
| `works-byobu` | 1–2 | ≈ 25 MB (atlas + mips) | its rect, ~80 ALU/px | fold/dolly/pointer light | < 0.3 ms (labels only while moving) |
| `skills-kumiko` | ≤ 6 | ≈ 3 MB | thin strips + paper | assembly/diagram/hover | < 0.2 ms (CPU picking ≤ 32 runs) |
| `principles-garden` | ≤ 3 + 1 per stroke | ≤ 8 MB | its rect, ~120 ALU/px | camera drift, strokes, sweep | < 0.2 ms |
| `achievements-press` | ≈ 5 | ≈ 20 MB | rect + flake overdraw | sift/press/light/ink changing | < 0.2 ms |
| `writing-marble` | 1 + 1 pass per op | 8–18 MB (+ id RT) | its rect | op events, 600 ms spread, hover | < 0.2 ms; 0 at rest |
| `testimonials-noren` | 3–4 | < 2 MB | cloth only | wind/pointer (stops when motion off) | < 0.15 ms Verlet |
| `contact-seal` | 3 | < 4 MB | stone only | only while stamping | — |
| `colophon-emaki` | 2–3 | 8–32 MB (strip) | its rect | the single roll-up | — |
| post (high only) | 1 | ≈ 37 MB half-float | union of visible view rects | when any view drew | — |

### 10.3 Strategy

1. **Static first**: SSG HTML with every fact; cover is DOM/SVG; CSS-only crest construction; no preloader.
2. **Progressive loading**: motion chunk after first paint; three after LCP; section modules within 2 viewports; views warm 1.5 / 1.0 / 0.6 viewports ahead by tier, one at a time, compile off-screen; film fetched as a Blob 3 viewports ahead (or at idle on fast links).
3. **One canvas, scissored views, ≤ 2 live**, render on demand, zero rAF at idle, canvas hidden during the film, park far views (free RTs, keep programs).
4. **Adaptive quality**: static tier detection + governor (DPR first, then tier) with hysteresis; counts via uniforms/draw ranges.
5. **DOM discipline**: animate only `transform`/`opacity`; no layout reads in loops (cached rects via `ResizeObserver`); `will-change` only during animation; ≤ 8 composited layers in the film stage; `content-visibility` only where allowed (§8.7); images sized with `width`/`height`, AVIF/WebP, `decoding="async"`.
6. **Fonts**: build-time subsetting; only the active language's body face; `size-adjust` Latin fallback; preload only the cover subset.
7. **Content-side byte control for the film** (flat quantised plates, no grain, calm rests) before encoder settings.

### 10.4 Measurement plan (WP-11; one browser at a time under `flock`)

- `scripts/measure/page.mjs`: Playwright + CDP on `vite preview` — LCP/CLS/INP via injected `PerformanceObserver`, transfer bytes by type (Resource Timing), JS heap, `__hanmoto.stage.stats()` peak calls/programs/VRAM estimate across a scripted full scroll, idle main-thread time with a view on screen (expect < 1 %), program count stability.
- `scripts/measure/film.mjs`: the *video* §8.2 script (idle cores, scrub cores, dropped frames; fail if idle main > 1 % or scrub main > 15 %).
- `scripts/check/budgets.mjs`: gzip sizes of every chunk and asset class vs `build/budgets.json` (fails the check).
- `scripts/check/contrast.mjs`: parses `tokens.css`, computes WCAG ratios for every text pair in both themes (§3.1 rules), fails below 4.5 (text) / 3.0 (UI).
- `scripts/check/a11y.mjs`: axe-core in Playwright on the three main pages and one case page, both themes, plus reduced-motion and Proof mode.
- Lighthouse (if runnable with the cached Chromium) on the three main pages; otherwise the CDP metrics above.
- Manual real-device matrix (*video* §8.4) handed to the owner as a checklist in WP-11's final message: iPhone (normal + Low Power Mode), older iPhone, mid Android on cellular, Windows iGPU laptop, macOS Safari 26, Firefox 159+, reduced motion. SwiftShader numbers are regression signals only.

---

## 11. Accessibility and SEO

### 11.1 Accessibility (WCAG 2.2 AA in both themes)

- **Semantics**: `header` (chrome), `nav` (express lane, layers, language), `main`, one `section` per artboard with `aria-labelledby`, `footer` for the Colophon. One `h1` (the name, cover); `h2` per section; `h3` for chapters, cases, domains. Data as `table`/`dl`/`ul`; quotes as `blockquote` + `cite`; images as `figure`/`figcaption`.
- **Every canvas `aria-hidden="true"`** with a DOM equivalent: cover → facts + `h1`; road → captions (`h3` + text); works → panel links + DOM column + case pages; skills → tool list + diagram SVG with `title`/`desc`; principles → principles list + data tables; achievements → banzuke `table`, seal figcaptions, chart tables, reliability list ("Ink it" reveals it visually; it is always in the accessibility tree); writing → lists; testimonials → blockquotes; contact → links + form; colophon → `dl` + credits list. Mirrored, embossed or canvas-only text never carries information alone.
- **Alt text**: every artwork has a trilingual alt in `src/content/credits.ts` describing what it shows *and* why it is there (e.g. "Hiroshige, *Hara: Mount Fuji in the Morning*: Fuji's peak breaks the picture frame"). Grain, deckle, bands, plates: `alt=""` / `aria-hidden`.
- **Keyboard**: skip link first; tab order doc bar → main → panels; Layers rows, plate eyes, ink chips (radio group), Re-rake, Show data, Ink it, Take a print, Share, byōbu labels (← next, → previous), "Drop at centre" button (keyboard alternative to clicking the tray); `Esc` closes panels; no traps. Targets ≥ 24 × 24 px. Focus visible (kentō corners, §3.5) and not obscured (`scroll-padding-top: 72px`, bottom padding for the mobile toolbar).
- **Motion**: reduced motion and the Motion layer (§5.9); nothing flashes more than 3 times per second; ambient motion > 5 s stops with the Motion layer; interaction-triggered motion has no long tails when motion is off.
- **Forms**: visible labels, `autocomplete` (`name`, `email`), native validation with trilingual messages, status in an `aria-live="polite"` region.
- **Live content**: clocks and Info stats are `aria-live="off"`.
- **Language and scripts**: correct `lang` everywhere; vertical writing only for real reading text; 200 % zoom and WCAG text-spacing overrides keep layouts intact; no horizontal scroll at 320 px.

### 11.2 SEO and sharing

- Per page: localised `<title>`, meta description (≤ 120 chars ja/zh, ≤ 155 en), canonical, hreflang alternates (`ja`, `en`, `zh-Hans`, `x-default`), OG (`og:title`, `og:description`, `og:image` `og/og-{lang}.png` 1200 × 630, `og:locale` `ja_JP`/`en_US`/`zh_CN` + alternates), `twitter:card=summary_large_image`.
- JSON-LD: `Person` (name with `alternateName` in the other two scripts, `jobTitle`, `knowsLanguage`, `knowsAbout`, `address` Tokyo, `worksFor` current employer descriptor, `sameAs` persona links) + `ProfilePage`; case pages add `CreativeWork` (name, about, dateCreated).
- `robots.txt`; `sitemap.xml` only when `SITE_ORIGIN` is set. Every word is readable without JavaScript.
- Print stylesheet = two-page CV; CV PDFs per language (§13 WP-11).

---

## 12. Asset plan

| # | Asset | Spec | Path | Owner | Consumers |
|---|---|---|---|---|---|
| 1 | Responsive artwork derivatives | AVIF + WebP at 640 / 1280 / 2000 px (≤ source) + 128 px thumbnails, sRGB, metadata stripped | `public/img/{set}/{slug}.{w}.{avif,webp}` | WP-02 | all sections |
| | Images used (29) | tokaido 01, 11, 12, 14, 24, 39, 46, 48, 55 · rinpa mitsumochi-poppies, sotatsu-moon-autumn-grasses, fans-upon-waves, korin-irises-yatsuhashi, kiitsu-morning-glories, korin-rough-waves · hokusai manga-perspective, manga-pattern-construction, manga-pagoda-roof · ukie toyoharu-kabuki-perspective, toyoharu-dutch-perspective · pattern seiei-moon-kikko · night hiroshige-ryogoku-moon · landscape shonen-aged-pines, motonobu-ink-landscape · writing hokkei-first-writing, gakutei-spider-web, gakutei-paper, gakutei-brush, gakutei-book-cart | | | |
| | Never used | great-wave, red-fuji, shower-below-summit, ejiri-wind (all show Fuji or are clichés), 17-yui (Fuji), manga-torii-proportion (torii), hoitsu-cherry-maple (sakura) | | | |
| 2 | Detail crops | left 62 % of `12-mishima` (no torii); right 75 % of `11-hakone` (no distant Fuji); same widths | `public/img/tokaido/12-mishima-detail.{w}.{avif,webp}`, `11-hakone-detail.{w}.{avif,webp}` | WP-02 | road |
| 3 | `src/content/images.json` | per file: `w`, `h`, `widths[]`, `dominant`, `accent[]` | `src/content/images.json` | WP-02 | `rc.img`, `ctx.assets.img` |
| 4 | Stencil masks | luminance threshold 0.6 → 1-bit alpha, 1024 px | `public/img/gen/mask-{asanoha,sayagata,undulating}.png` | WP-02 | skills, principles |
| 5 | Byōbu art atlas | 6 panel crops (crop boxes in `assets-src/svg/byobu-crops.json`), each 512 × 1408 (low 256 × 704), RGBA, alpha = pigment mask (gold ground ΔE < 18 → 0, 2 px soft edge, frame/mount removed) | `public/img/gen/byobu-atlas-{3072,1536}.webp` | WP-02 | works |
| 6 | Mobile byōbu panels | 1 : 1.6 crops, opaque | `public/img/gen/byobu-panel-{1..6}.{avif,webp}` | WP-02 | works (mobile) |
| 7 | Gold-leaf ground | 1280 px, procedural 109 mm leaf grid with ±3 % tone and 箔足 seams | `public/img/gen/gold-leaf-1280.avif` | WP-02 | works (mobile/fallback) |
| 8 | Washi grain | 512² tile AVIF (film overlay, normal blend), two 256² transparent WebP tiles pre-tinted 紺 (day) and 月白 (night), procedural fibres | `public/img/gen/washi-512.avif`, `grain-day-256.webp`, `grain-night-256.webp` | WP-02 | road, layout CSS |
| 9 | Deckle masks | 4 SVG edge masks | `public/img/gen/deckle-{1..4}.svg` | WP-02 | `.deckle` |
| 10 | Crest 丸に三つ組子 | construction data (circles, radii, intersections, anchors, final paths) + SVG | `assets-src/svg/crest.json`, `public/img/gen/crest.svg` | WP-02 | cover, chrome, noren, seals, favicon |
| 11 | Seals | 白文 「湊」 in 小篆 (redrawn from a cited 說文 seal-script reference; source URL in `assets-src/svg/README.md`), 肖形印 crest seal, 割印 top/bottom halves | `public/img/gen/seal-minato.svg`, `seal-crest.svg`, `wariin-{top,bottom}.svg` (+ path JSON) | WP-02 | contact, achievements, chrome print |
| 12 | Cursors | gouge, baren, hand, direct, rake, brush, seal: SVG source + PNG 32/64 with hotspots listed in README | `public/cursors/*.png` | WP-02 | chrome cursors.css |
| 13 | Icons | §3.7 set as inline SVG strings | `src/core/icons.ts` | WP-02 | all |
| 14 | Today's print plates | 8 plate SVGs + cartouche mask, viewBox 0 0 1240 1824 | `public/print/plate-{1..8}.svg`, `cartouche-mask.svg` | WP-02 | chrome compositor |
| 15 | OG images | 1200 × 630 per language: paper, crest, name in the cover face, role, kentō/トンボ marks (rendered with Playwright from a local HTML using the self-hosted fonts) | `public/og/og-{ja,en,zh}.png` | WP-02 | head |
| 16 | Favicons | crest SVG with internal dark-scheme media query; 32 px PNG; 180 px apple-touch; 512 px icon | `public/favicon.svg`, `favicon-32.png`, `apple-touch-icon.png`, `icon-512.png` | WP-02 | head |
| 17 | Fonts | §3.3 delivery | `public/fonts/**` | WP-02 | all |
| 18 | Film masks, plates, traveller, masters | §7.3 | `tools/film/masks/*.json`, `assets-src/film/**` | WP-03 | film |
| 19 | Film encodes, stills, manifest | §7.3–7.4 | `public/film/*`, `src/film/film-manifest.json` | WP-03 | road, summary (matchVp) |
| 20 | Rain overlay, gold suyari bands | inline SVG in road render | `src/sections/road/*` | WP-06 | road |
| 21 | Hokusai guide data | normalised vanishing lines/diagonals | `src/sections/summary/guides.ts` | WP-05 | summary |
| 22 | Carved-block still | AVIF of the carved block alone (CSS-peel fallback, static tier) | `public/img/posters/cover-block-carved-{day,night}.avif` | WP-05 | cover |
| 23 | Sangaku diagrams (6) | SVG builders, compass-and-ruler draw order | `src/sections/works/diagrams/*.ts` | WP-07 | case pages |
| 24 | Stack diagram data | boxes/edges + tool ids | `src/sections/skills/diagram.ts` | WP-08 | skills |
| 25 | Default marbling print | 512² WebP of the default op list | `public/img/gen/default-print.webp` | WP-10 | noren fallback, today's print |
| 26 | View posters | each view at rest, day/night × 1440 / 390 wide, AVIF ≤ 60 KB | `public/img/posters/{viewId}-{day,night}-{1440,390}.avif` | section WP (initial) → WP-11 (final recapture) | CSS fallbacks |
| 27 | Emaki strips | 4096 × 256 per lang × theme, miniature of every section | `public/img/gen/strip-{ja,en,zh}-{day,night}.avif` | WP-11 | colophon |
| 28 | CV PDFs | A4, two pages, from Proof/print CSS | `public/cv/cv-{ja,en,zh}.pdf` | WP-11 | doc bar, contact |
| 29 | Glue masks, lattice stamp, emboss maps | runtime-generated | — | WP-09 / WP-08 / WP-09 | views |

---

## 13. Work packages

### 13.1 Phases

| Phase | Work packages | Rule |
|---|---|---|
| 0 | **WP-00 Foundation** | Runs alone, first. Creates every contract, stub and shared file so all others can start. |
| 1 | WP-01 … WP-10 in parallel | Each works only in its owned paths (§8.3) against stubs; nobody waits on anybody. Cross-WP needs → `docs/wp-requests/<WP>.md`. |
| 2 | **WP-11 Integration & QA** | Runs after Phase 1: applies requests, final font subsetting, poster/strip/CV capture, all checks, fixes integration defects. |

Stubs are the contract: WP-00 stubs return the right types and minimal visible output (a section skeleton with real headings from seed content; a flat test plane per view; a CPU-blur carve; a flat red seal; a synthetic test film). A stub is replaced wholesale by its owner; its exported signatures never change.

### 13.2 Definitions

#### WP-00 — Foundation (Phase 0, blocking)
- **Scope**: scaffold (`package.json` with §8.2 pins, `tsconfig.json` strict with `@/*` alias, `vite.config.ts` §8.9, `.gitignore` incl. `dist/`, `build/film/`, `build/qa/`, `tools/bin/`, `.locks/`, `assets-src/film/master-*`), `npm install`, copy ffmpeg/ffprobe into `tools/bin/` and verify `-version` lists libx264/libaom/libwebp, create `.locks/` and `docs/wp-requests/`. SSG plugin and 22 stub pages (§8.4); `src/render/**` (page, head with hreflang/OG/JSON-LD, helpers `rc.img/url/esc/t/icon`, case and 404 delegation); `src/core/**` (all §8.5 APIs implemented: context, `frame.ts` one-clock loop, scroll + Lenis + ScrollTrigger wiring, theme with View-Transition bokashi wipe and `uNight` tween hook, motion + `registerSnap`, tier detection + `TierAPI`, i18n incl. `numerals.ts` daiji/daxie, `solar-term.ts` (Meeus low-precision, 立春 = 315°), JST clock, assets URL resolution, print-state, perf observers, storage, palette name lookup, seed, easing); `src/styles/*.css` (`tokens.css` **verbatim** from §3.1 with both night blocks identical; base, type §3.3, layout §3.4/§8.7, marks §3.5, motion §5); `src/gl/stage/**` (§8.6: stage, governor, post, tier-detect, view helpers); `src/gl/chunks/research.ts` (copy of *shaders* as typed exports), `noise.ts`, `paper.ts`, `colorspace.ts`; **stubs** with final signatures for every other WP's files: all `src/sections/*/{render,index,view,strings}.ts` + `style.css`, `src/gl/carve/index.ts`, `src/gl/seal/index.ts`, `src/gl/chunks/{gold,peel}.ts` (gold = *shaders* `GOLD_FRAG` verbatim), `src/core/icons.ts` (all §3.7 names), `src/chrome/{render,index,strings}.ts` (doc bar with working express links), `src/content/{facts,copy,glossary,credits,site.config}.ts` seeded with Appendix B data (seed strings may repeat English in all three languages), `src/content/types.ts` **verbatim** Appendix A, `src/content/images.json` seeded from the manifest (dims, `widths: []`), `src/film/film-manifest.json` stub + a synthetic 16 s test film (`ffmpeg -f lavfi -i testsrc2=size=1280x720:rate=30` encoded with the §7.3 settings, plus SD/portrait variants and stills) in `public/film/`; `src/sections/registry.ts`, `src/sections/styles.ts`; `scripts/postbuild.mjs`; `scripts/capture-posters.mjs` skeleton (`?poster=<viewId>&theme=` mode that freezes motion and hides chrome, screenshots `[data-view-id]`); `public/robots.txt`; README (commands, ports, locks, ownership pointer to this file).
- **Inputs**: this document, research files. **Outputs**: a running skeleton site.
- **Acceptance**: (1) `npm run dev` serves all 22 pages in 3 languages with SSR'd section skeletons, real headings and the cover facts visible with JS disabled; (2) `npm run typecheck` and `npm run build` pass; `dist/` served under `/sub/path/` loads every page and chunk without 404 (other than not-yet-produced assets); (3) theme toggle shows the bokashi wipe and persists; Settings → Auto follows the OS; (4) each 3D section shows its stub plane via the shared stage; ≤ 2 live views enforced; **zero rAF callbacks over 3 s idle** (Playwright counter); context loss shows posters; (5) `window.__hanmoto` present; (6) `tokens.css` matches §3.1 byte-for-byte in values; (7) Lenis is active on desktop, absent under reduced motion; (8) hand-over in the final message.
- **Depends on**: nothing.

#### WP-01 — Content and copy (trilingual)
- **Scope**: all content per Appendix A using Appendix B canonical facts: `facts.ts`, `copy.ts` (every key in §6), `glossary.ts` (§9), `credits.ts` (ja/zh short titles + trilingual alts for every used image, §12 #1–2), `site.config.ts`. Tone per §9. zh tells its own heritage. Verify every historical/cultural claim in §14 with WebSearch/WebFetch; rewrite or remove anything not verifiable. Verify persona links/domains are unclaimed (§1.4). Length limits: takeaway ≤ 90 chars en / 45 字 ja / 40 字 zh; stage line one line; quotes ≤ 60 words en.
- **Owns**: `src/content/{facts,copy,glossary,credits,site.config}.ts`.
- **Acceptance**: typecheck passes; no empty strings, "TODO", "lorem", "TBD", "XXX"; every `T` has three distinct, idiomatic languages (proper nouns excepted); all numbers equal Appendix B; zh numerals use 大写 forms where specified; no real company, conference, university or certification named; the final message lists each verified claim with its source URL.
- **Depends on**: WP-00.

#### WP-02 — Assets: images, fonts, icons, cursors, generated graphics
- **Scope**: §12 items 1–17; §3.3 font delivery (`scripts/fonts/fetch-fonts.mjs` reading content + each section's `strings.ts` `display`), Plex fallback tuning; crest construction data (§6.1 proportions: ring R and 0.84 R, triangle on 0.52 R, strip width 0.11 R, ends extended 0.18 R past the vertices, half-laps alternating over/under); seal-script 「湊」 redrawn from a cited 說文 小篆 reference (if no reliable reference is found, ship the 肖形印 crest seal for Contact and record that).
- **Owns**: `scripts/fonts/**`, `scripts/images/**`, `assets-src/svg/**`, `public/img/**` except `posters/`, `gen/default-print.webp`, `gen/strip-*`; `public/fonts/**`, `public/cursors/**`, `public/print/**`, `public/og/**`, favicons; `src/core/icons.ts`; `src/content/images.json`.
- **Acceptance**: every listed derivative exists, AVIF 1280 px ≤ 180 KB typical; `images.json` complete; `npm run fonts` emits three language CSS files + shared, display subsets ≤ 50 KB per language, no Google requests at runtime; cursors legible on both paper colours; icons render at 16 and 24 px; OG images use the real faces; masks are clean 1-bit; byōbu atlas alpha removes gold ground but keeps pigment.
- **Depends on**: WP-00 (fonts re-run by WP-11 after WP-01).

#### WP-03 — Film production
- **Scope**: §7.2–§7.4 end to end (masks for 7 stations, `plates.py`, tatebanko scene, landscape and portrait camera paths, traveller atlas, mist and gold bands, palette wipe, capture page and script, masters, encodes, stills, publish, manifest).
- **Owns**: `tools/film/**`, `assets-src/film/**`, `build/film/**`, `public/film/**`, `src/film/scene/**`, `src/film/film-manifest.json`.
- **Acceptance**: three MP4s within budget; keyframes every 8 frames plus the 7 rest times (ffprobe); rest frames calm with the specified negative space; plate accumulation correct (ch 1 indigo only … ch 7 seven plates; gold only in the outro); no torii; Fuji only in ch 4, crossing the frame line (Hakone's faint distant Fuji removed); traveller present in all chapters; stills ≤ 80 KB and identical to the first decoded frame; manifest validates against `FilmManifest`; `endBands` overlay the last frame within 1 %; determinism: re-capturing frames 0, 207, 414 gives identical PNG hashes.
- **Depends on**: WP-00.

#### WP-04 — Chrome
- **Scope**: §4 entirely (document bar/express lane, rulers with unit map and years, Layers + eyes + Motion layer, Separations + today's print compositor, Info panel with stats/glossary/settings, selection boxes, smart guides, outline view, peek GLSL, language wheel, theme chips, cursors CSS, skip links, Proof mode, print stylesheet = CV layout, mobile bottom sheet and progress ruler, keyboard map with toggle).
- **Owns**: `src/chrome/**`.
- **Acceptance**: express lane works with JS disabled; rulers change unit per section and show years during the film (stub-driven); Motion eye disables motion site-wide; plate eyes hide only decorative plate layers; today's print renders at 120 × 176 and full size and downloads; Info shows live stage/film/vitals data; outline view works on every page; Proof mode is text-first and prints a 2-page A4 CV; mobile sheet usable at 320 px; shortcuts toggleable; chrome never narrows reading width; axe: 0 serious/critical in chrome.
- **Depends on**: WP-00 (WP-02 icons/cursors/plates later; stubs until then).

#### WP-05 — Cover, Summary, carve module, peel chunk
- **Scope**: §6.1, §6.2, bands `cover-summary` and `summary-road`; `src/gl/carve` (GPU jump-flood SDF + height/normal bake + CPU fallback; API below); `src/gl/chunks/peel.ts`; cover posters and the carved-block still.
- **Carve API** (stable for WP-09/WP-10): `carve(renderer, { source: HTMLCanvasElement | { svgPaths: string[]; viewBox: [number, number, number, number] }, res: number, profile: 'vcut' | 'emboss' | 'seal-raised' | 'seal-incised', depthPx?: number }): Promise<{ height: THREE.Texture; normal: THREE.Texture; mask: THREE.Texture; dispose(): void }>`.
- **Owns**: `src/sections/{cover,summary}/**`, `src/gl/carve/**`, `src/gl/chunks/peel.ts`, `public/img/posters/cover-*`.
- **Acceptance**: the cover `h1` is the LCP element, LCP ≤ 2.0 s under 4× CPU + fast-4G emulation on `vite preview`; facts readable without JS; crest constructs in compass order; peel over 0–40 vh reveals the mirror-carved block with ink only on raised faces; pixel-identical swap (≤ 1 % of sheet pixels differ by > 8/255); re-carve after a language switch; block flip lands on the summary figure within 2 px and hands over to the DOM; match cut aligns the guide VP with the film poster VP within 1 % of the viewport; all tiers and fallbacks; reduced motion.
- **Depends on**: WP-00 (WP-02 crest and WP-03 manifest: stubs until delivered).

#### WP-06 — Road (film section and player)
- **Scope**: §6.3, §7.5, §7.6, band `road-works` (gold bands from `endBands`), rain overlay, night veil, trilingual captions (landscape/portrait, ja vertical), stills and static tiers, WebCodecs tier, stage pause, ruler years, plate inking, skip link; debug `?film=static|stills|webcodecs|sd|hd|portrait`; optional 生/版 toggle.
- **Owns**: `src/sections/road/**`, `src/film/player/**`.
- **Acceptance**: *video* §8.3 criteria on `vite preview` (SwiftShader thresholds: ≥ 15 fps presented, idle main < 1 %, scrub main < 15 % at 4×); instrumented proof that no seek is issued while `seeking`; memory flat across 10 scrubs; no black frame at poster swap; every tier reachable via `?film=`; captions legible in 3 languages × 2 themes × landscape/portrait; gold-band continuity with the last frame (≤ 1 %); canvas hidden during the film and restored after. Re-verify with WP-03's real film.
- **Depends on**: WP-00, WP-03 (stub film first).

#### WP-07 — Works (byōbu and case pages)
- **Scope**: §6.4 (view, gold chunk, labels, DOM column, unfold/dolly mapping, back-face 下地骨, mobile CSS screen), 18 case pages via `renderCase`, six sangaku diagrams, band `works-skills` (turn), posters.
- **Owns**: `src/sections/works/**`, `src/gl/chunks/gold.ts`, `public/img/posters/works-*`.
- **Acceptance**: panels counted right → left with ← = next; visible 箔足 seams and anisotropic pointer-following highlight, no bloom; pigment only where the art has pigment; case pages complete in 3 languages with 問・術・答・省, diagrams drawing in compass order, View-Transition morph from the label (where supported), correct relative back/prev/next links at every depth; mobile version without WebGL; the turn reveals a lattice at the kumiko pitch.
- **Depends on**: WP-00 (WP-02 atlas, WP-01 copy: stubs/temps until delivered).

#### WP-08 — Skills and Principles
- **Scope**: §6.5 and §6.6 (pattern generators, data-encoded runs, adjacency, CPU picking, planar shadow → diagram → DOM SVG; data-driven sand, SEV-1 rings, trail RT, stones, stamp, re-rake, data table, touch rake toggle), bands `skills-principles` and the garden half of `principles-achievements`, posters, SVG fallbacks.
- **Owns**: `src/sections/{skills,principles}/**`, `public/img/posters/{skills,principles}-*`.
- **Acceptance**: pattern geometry correct (asanoha 30°/60°/120°; kaku-asanoha 45°/22.5°/67.5°; kikkō regular hexagons; masu half-lap grid; mitsukude equilateral); run lengths = years and joints = projects (checked against `facts.tools`); list ↔ 3D hover sync; shadow resolves into the diagram and the DOM SVG overlays it within 2 px; tier counts switch without shader recompiles; rows visibly follow `weeklyP99` (weeks 6 and 19 most disturbed); ring radii scale with blast; strokes persist; re-rake sweeps; data tables accessible.
- **Depends on**: WP-00.

#### WP-09 — Achievements and the seal module
- **Scope**: §6.7 (banzuke, seal stones + impression decals via carve, closed-form sunago with glue mask, karazuri emboss + Ink it, DOM charts/tables, credentials), `src/gl/seal`, band `achievements-writing`, posters.
- **Seal API** (stable for WP-10): `createSealStone(stage, { face: { svgPaths?: string[]; text?: string; font?: string }, style: 'shubun' | 'hakubun', res: number }): { group: THREE.Group; press(t: number): void; impression(): { texture: THREE.Texture; quad: THREE.Mesh }; dispose(): void }`.
- **Owns**: `src/sections/achievements/**`, `src/gl/seal/**`, `public/img/posters/achievements-*`.
- **Acceptance**: banzuke in one ink, 大関 top, entries per Appendix B, vertical ja/zh and tabular en; seal faces per language and 朱文/白文 by direction; impressions persist with 印泥 noise; flakes reversible on scroll-back, ≥ 95 % of in-mask flakes land inside the glue and out-of-mask flakes leave; karazuri unreadable at high light and legible at grazing; Ink it reveals the DOM list; every number exists in the DOM.
- **Depends on**: WP-00 (WP-05 carve stub until delivered).

#### WP-10 — Writing, Testimonials, Contact, Colophon, 404
- **Scope**: §6.8–§6.11 (marbling engine, ops builder, share links, take-a-print, `default-print.webp`; noren cloth + two-plate quotes; contact letter, form, seal stamp with WP-09's `createSealStone`, 割印 band; colophon 奥付, manifest-driven credits, live weight/vitals, edition and date stamp, today's print full size via WP-04's `renderPrint` (import is allowed, editing is not), emaki view with procedural fallback strip; 404), bands `writing-testimonials`, `testimonials-contact`, `contact-colophon`, posters.
- **Owns**: `src/sections/{writing,testimonials,contact,colophon}/**`, `public/img/gen/default-print.webp`, `public/img/posters/{writing,testimonials,contact,colophon}-*`.
- **Acceptance**: drop op is area-preserving and replay is deterministic (same ops → same pixel hash); zero frames at rest; share-link round trip with clamped input; take-a-print downloads a PNG and visibly dyes the noren and today's print; Verlet step < 0.15 ms; quotes overprint into 藤紫 then leave accessible DOM text; form works with `contactEndpoint: null` (mailto) and with a mock endpoint; seal stamps on send; 割印 halves register at mid-viewport within 1 px; credits cover every `data-file` rendered anywhere on the site; edition and 節気 date correct; emaki rolls once; 404 in three languages.
- **Depends on**: WP-00 (WP-09 seal and WP-04 compositor: stubs until delivered).

#### WP-11 — Integration and QA (Phase 2)
- **Scope**: apply every `docs/wp-requests/*` item; final `npm run fonts` after content freeze; capture all posters (§12 #26), emaki strips (#27), CV PDFs (#28) under the browser lock; run every check in §10.4 plus: content (no placeholders, Appendix B consistency), credits completeness, internal links and relative paths from every page depth, sub-path serving, no-JS reading, reduced motion, Proof mode, both themes × three languages screenshot pass (saved to `build/qa/`, gitignored), cliché audit (grep for `border-radius` > 0, `box-shadow`, `backdrop-filter`, `drop-shadow`, `Inter`, `Space Grotesk`, `Fraunces`, emoji ranges, `scroll-behavior: smooth`, ScrollTrigger `pin:`), accuracy checklist §14, ownership audit (every file lies inside a §8.3 path of a single WP).
- **Owns**: `scripts/capture-posters.mjs` (from Phase 2), `scripts/capture-strips.mjs`, `scripts/build-cv.mjs`, `scripts/measure/**`, `scripts/check/**`, `public/cv/**`, `public/img/gen/strip-*`, final `public/img/posters/**`; may edit any file **only** to apply a logged request or fix a documented integration defect.
- **Acceptance**: all checks green; budgets met; Lighthouse ≥ 90 (or the CDP equivalents documented); axe 0 serious/critical on all audited pages/themes/modes; zero placeholders; `dist/` works under a sub-path; §14 and the brief map below fully ticked in the WP-11 final message.
- **Depends on**: WP-00 … WP-10.

---

## 14. Verification checklist (accuracy, brief coverage)

### 14.1 Facts a Tokyo (or Shanghai) visitor will check — WP-01 verifies, WP-11 audits

| Claim | Status / rule |
|---|---|
| Tōkaidō order 日本橋 (1) → 箱根 (11) → 三島 (12) → 原 (14) → 島田 (24) → 岡崎 (39) → 庄野 (46) → 京師 (55) | Fixed by this design (east → west) |
| Hōeidō edition c. 1833–34, titles as in the manifest | Use manifest `title`/`date` verbatim in credits |
| 大関 was the top rank printed on banzuke; 横綱 first appeared on a banzuke in 1890 | Verify; if unverifiable, drop the date from the note |
| 版下 is pasted face-down on the block and destroyed by carving | Verify wording |
| 奥付 required by the 1722 (享保7年) publishing regulations | Verify; else say "Edo-period books carried an 奥付" |
| 王祯 revolving type table, 《农书》 1313 | Verify |
| 毕昇 movable type, recorded by 沈括《梦溪笔谈》 (庆历年间) | Verify |
| 十竹斋书画谱 (1627–1633) and 十竹斋笺谱 (1644): 饾版 and 拱花 | Verify dates |
| Standard 金箔 square ≈ 109 mm (3寸6分) | Verify |
| Tōkaidō ≈ 126 里 (≈ 495.5 km) Edo → Kyoto | Verify |
| 說文: 湊「水上人所會也」 | Glossary only, only if verified |
| 小篆 form of 湊 | Redrawn from a cited reference (WP-02) |
| 大字 / 大写 forms | ja 壱弐参肆伍陸漆捌玖拾; zh 壹贰叁肆伍陆柒捌玖拾 |
| Byōbu panels counted from the viewer's right (第一扇 …) | *aesth* §3.3 |
| Kumiko geometry | *aesth* §3.2; unverified patterns (胡麻, kumiko 桜) are not used |
| Image licences | Every displayed image is CC0 (Met Open Access / AIC); credits with `creditText` + `objectUrl`, no "courtesy of", no implied endorsement |

### 14.2 Brief → design map (every point is mandatory)

| # | Brief point | Where it is satisfied |
|---|---|---|
| 1 | Many kinds of animation showing every skill and strength | Four motion verbs + registration snap (§5), crest construction, guides, plate wipes, overprints, peel, fold, roll, rake, sift, press, marble, cloth; each tied to a skill (§6) |
| 2 | Heavy, multiple kinds of three.js 3D that engineers cheer | Nine distinct families on one renderer: SDF/JFA-carved woodblock with peel, tatebanko film (rendered by the page's own engine), anisotropic gold-leaf byōbu, data-encoded instanced kumiko with planar-shadow diagram, data-driven raked sand, closed-form sunago + carved seal stones + karazuri emboss, closed-form suminagashi, Verlet noren, emaki roll-up; Info panel, outline view, peek GLSL, `__hanmoto` (§4, §6, §8.6) |
| 3 | Thought-out scenario and complete portfolio content | 八度摺 thesis (§1.2), 序破急 storyline (§1.3), impact-first IA (§2), complete persona and data (Appendix B), case pages, CV PDFs |
| 4 | Environment-suited transitions between sections | Ten physically continuous 間 bands (§2.2) |
| 5 | Refined colour, no dark palette | 藍摺 light-dominant palette, day default, night = moonlit lapis ≥ L 0.086 (§3.1) |
| 6 | Japanese / English / Chinese | Static `/` `/en/` `/zh/` pages, per-language type, tone and heritage (§9) |
| 7 | Day / night switch | 本摺 ⇄ 石摺 with ichimonji-bokashi wipe and relit 3D (§4.3) |
| 8 | Meaningful images | 29 CC0 artworks chosen per meaning (§6, §12) + generated crest, seals, plates, film |
| 9 | Classical Japanese × modern; Illustrator-like format | Edo print workshop × Illustrator workbench chrome (§1.2, §4) |
| 10 | Diverse type and colour per section, unified | One display voice per section over a constant base (§3.3); per-section layer + accent colours (§3.1) |
| 11 | Non-AI colours/borders; no template circles/blanks | Named traditional colours, kentō/トンボ/匡郭 marks, radius 0, no shadows/glass; numbering only where real (§1.5, §3.5) |
| 12 | One scroll-scrubbed video over ~7 sections, minimal CPU/GPU/memory | 800 lvh film, 7 chapters, H.264 `-g 8 -bf 0` Blob player, single-flight seeks, zero idle cost, tiers and fallbacks (§7) |
| 13 | Design first, novel scenario, per-section uniqueness, gasp-worthy 2D/3D, accurate images, diverse fonts | All of the above, plus §14.1 accuracy |

---

## Appendix A — `src/content/types.ts` (verbatim; owner WP-00, frozen after Phase 0)

```ts
import type { Lang, PlateN } from '../core/types';

export type T = Readonly<Record<Lang, string>>;
export type Prov = 'persona-sample' | 'client';
export type EmployerId = 'hanamichi' | 'wataridori' | 'kairo';
export type StationId = 'nihonbashi' | 'hakone' | 'mishima' | 'hara' | 'shimada' | 'okazaki' | 'shono' | 'seki' | 'kyoto';
export type CaseId = 'ledger' | 'tracing' | 'mapgl' | 'strangler' | 'platform' | 'resilience';
export type DomainId = 'web' | 'backend' | 'data' | 'infra' | 'practice';
export type MetricId = 'settle' | 'pci' | 'mttd' | 'frame' | 'thru' | 'deploy' | 'paths' | 'avail' | 'rto' | 'mttr' | 'pages' | 'mentees' | 'rfc';
export type RepoId = 'kento' | 'baren' | 'scrubkit';
export type ChartId = 'deploys' | 'leadtime' | 'mttr';
export type ToolId = string;

export interface Figure { file: string; caption: T; alt: T }

/* ---------- facts ---------- */
export interface Person {
  name: T; nameRuby: string; sealGlyph: string; role: T; yearsLabel: T; since: string; specialty: T;
  location: T; timezone: 'Asia/Tokyo';
  availability: { from: string; kinds: T; notice: T; workAuth: T; relocation: T };
  overlap: readonly { label: T; startJST: string; endJST: string; zone: string }[];
  languages: readonly { lang: Lang; level: T }[];
  education: T; awards: readonly T[]; now: T; responseTime: T; prov: Prov;
}
export interface Employer { id: EmployerId; name: T; descriptor: T; from: string; to: string | null; headcount: T; prov: Prov }
export interface Metric {
  id: MetricId; label: T; before: string; after: string; display: T; unit: T;
  direction: 'rose' | 'fell'; period: string; employer: EmployerId | 'all';
  context: T; source: T; seal?: { face: T; side: T }; prov: Prov;
}
export interface Plate { n: PlateN; numeral: T; name: T; ruby: string; year: string; station: StationId | 'gold' }
export interface Station { id: StationId; printNo: number; image: string; name: T; subtitle: T }
export interface Chapter {
  n: 1 | 2 | 3 | 4 | 5 | 6 | 7; year: string; station: StationId; employer: EmployerId;
  role: T; headline: T; scope: T; outcomes: readonly [T, T]; plate: PlateN; metrics: readonly MetricId[]; prov: Prov;
}
export interface CaseStudy {
  id: CaseId; panel: 1 | 2 | 3 | 4 | 5 | 6; panelLabel: T; title: T; short: T; employer: EmployerId; period: string;
  role: T; team: T; problem: T; constraints: readonly T[]; method: T; tradeoffs: readonly T[];
  result: T; metrics: readonly MetricId[]; reflection: T; art: { file: string; why: T }; prov: Prov;
}
export interface Domain { id: DomainId; name: T; pattern: 'kaku-asanoha' | 'asanoha' | 'masu' | 'kikko' | 'mitsukude'; patternName: T; why: T }
export interface Tool {
  id: ToolId; name: string; domain: DomainId; years: number; since: string; lastProduction: string;
  projects: number; employers: readonly EmployerId[]; scale: T; cases: readonly CaseId[]; neighbours: readonly ToolId[];
}
export interface Principle { id: string; n: 1 | 2 | 3 | 4 | 5; title: T; body: T; stone: { x: number; z: number; r: number } }
export interface Sev1 { week: number; date: string; blastPct: number; durationMin: number; title: T }
export interface Ops { service: T; from: string; to: string; weeklyP99ms: readonly number[]; slo: T; sloMet: T; sev1: readonly Sev1[] }
export interface BanzukeEntry { rank: 'ozeki' | 'sekiwake' | 'komusubi' | 'maegashira'; feat: T; metric?: MetricId; period: string }
export interface Banzuke { title: T; centre: T; date: T; east: { label: T; entries: readonly BanzukeEntry[] }; west: { label: T; entries: readonly BanzukeEntry[] } }
export interface Chart { id: ChartId; title: T; unit: T; kind: 'bars' | 'line'; series: readonly { x: string; y: number }[]; note: T; source: T }
export interface ReliabilityFigure { id: string; label: T; value: string; period: string }
export interface Repo { id: RepoId; name: string; desc: T; language: string; stars: number; plate: PlateN; releases: readonly { date: string; tag: string; lines: number }[]; prov: Prov }
export interface Article { id: string; title: T; date: string; venue: T; abstract: T; url?: string; prov: Prov }
export interface Talk { id: string; title: T; date: string; venue: T; abstract: T; prov: Prov }
export interface Testimonial { id: 'manager' | 'peer' | 'report'; name: T; role: T; relation: T; date: string; quote: T; prov: Prov }
export interface Leadership { mentees: number; promoted: number; interviews: number; onboardingReaders: number; rfcs: number; incidentCommandersTrained: number; notes: readonly T[] }
export interface GlossaryEntry { term: string; ruby: string; en: string; zh: string; gloss: T }

/* ---------- copy (section text) ---------- */
interface Base { layer: T; title: T; stage: T; takeaway: T }
export interface CopyCover extends Base { name: T; nameLines: T; role: T; facts: { years: T; specialty: T; location: T; availability: T; languages: T }; express: { works: T; cv: T; contact: T; skipFilm: T }; peelHint: T; blockCaption: T }
export interface CopySummary extends Base {
  paragraphs: readonly [T, T, T]; resultsTitle: T; results: readonly [MetricId, MetricId, MetricId, MetricId];
  nowTitle: T; now: T; ledgerTitle: T; ledgerColumns: { company: T; role: T; dates: T; scope: T };
  ledger: readonly { employer: EmployerId; role: T; from: string; to: string | null; scope: T }[];
  overlapTitle: T; languagesLine: T; educationLine: T; figure: Figure;
}
export interface CopyRoad extends Base { skip: T; directionNote: T; refLabel: T; yearUnit: T }
export interface CopyWorks extends Base {
  directionNote: T; read: T; backToWorks: T; prevCase: T; nextCase: T;
  labels: { problem: T; constraints: T; role: T; team: T; period: T; method: T; tradeoffs: T; result: T; reflection: T };
}
export interface CopySkills extends Base { yearsUnit: T; projectsUnit: T; lastUsed: T; architectureToggle: T; architectureCaption: T; specFigure: Figure; learnFigure: Figure; kikkoFigure: Figure }
export interface CopyPrinciples extends Base { rerake: T; rakeToggle: T; showData: T; hideData: T; tableCaption: T; weekLabel: T; p99Label: T; sev1Label: T; legend: T; mistFigure: Figure }
export interface CopyAchievements extends Base {
  banzukeNote: T; sealsTitle: T; sealLegend: { rose: T; fell: T }; chartsTitle: T; karazuriTitle: T; karazuriCaption: T;
  inkIt: T; lightAngle: T; credentialsTitle: T; credentials: readonly T[]; pinesFigure: Figure;
}
export interface CopyWriting extends Base {
  reposTitle: T; articlesTitle: T; talksTitle: T; dropHint: T; dropCentre: T; takePrint: T; download: T; share: T; reset: T;
  starsLabel: T; latestLabel: T; figures: { header: Figure; oss: Figure; articles: Figure; talks: Figure };
}
export interface CopyTestimonials extends Base {
  leadershipTitle: T; leadershipLabels: { mentees: T; promoted: T; interviews: T; onboarding: T; rfcs: T; ics: T };
  figureDay: Figure; figureNight: Figure;
}
export interface CopyContact extends Base {
  letter: readonly T[]; signature: T;
  form: { name: T; email: T; message: T; send: T; sending: T; sent: T; error: T; mailtoNote: T };
  copyEmail: T; copied: T; cvTitle: T; cv: { ja: T; en: T; zh: T };
  availabilityTitle: T; overlapTitle: T; responseTime: T; workAuth: T; relocation: T; arrival: T; figure: Figure;
}
export interface CopyColophon extends Base {
  bookTitle: T; author: T; publisher: T; carving: T; printing: T; paper: T; pictures: T;
  weightLabel: T; vitalsLabel: T; buildLabel: T; editionPattern: T; datePattern: T; finale: T; todaysPrint: T; savePrint: T;
  libraries: readonly { name: string; version: string; licence: string }[];
  fonts: readonly { family: string; licence: 'OFL-1.1' | 'Apache-2.0' }[];
  booksFigure: Figure; nightFigure: Figure;
}
export interface CopyNotFound { title: T; line: T; home: T; figure: Figure }
export interface Copy {
  cover: CopyCover; summary: CopySummary; road: CopyRoad; works: CopyWorks; skills: CopySkills; principles: CopyPrinciples;
  achievements: CopyAchievements; writing: CopyWriting; testimonials: CopyTestimonials; contact: CopyContact;
  colophon: CopyColophon; notFound: CopyNotFound;
}

/* ---------- site config, manifest, images ---------- */
export interface Site {
  title: T; description: T; ogAlt: T; sampleNotice: boolean; sampleNoticeText: T;
  email: string; links: { github: string; linkedin: string }; contactEndpoint: string | null; siteOrigin: string | null; versionMajor: number;
}
export interface ManifestEntry {
  file: string; set: string; title: string; artist: string; date: string; institution: string; objectUrl: string; imageUrl: string;
  license: string; width: number; height: number; dominantColors: string[]; accentColors?: string[]; suggestedUse: string;
  creditText: string; accession?: string; creditLine?: string; medium?: string; sourceApiFlag?: string; bytes?: number;
  tokaido?: { printNo: number; stationIndex: number; nameJa: string; nameEn: string; subtitle: string }; description?: string;
}
export type ImagesIndex = Readonly<Record<string, { w: number; h: number; widths: readonly number[]; dominant: string; accent: readonly string[] }>>;

export interface Content {
  site: Site; person: Person; employers: readonly Employer[]; metrics: readonly Metric[]; plates: readonly Plate[];
  stations: readonly Station[]; career: readonly Chapter[]; cases: readonly CaseStudy[]; domains: readonly Domain[]; tools: readonly Tool[];
  principles: readonly Principle[]; ops: Ops; banzuke: Banzuke; charts: readonly Chart[]; reliability: readonly ReliabilityFigure[];
  repos: readonly Repo[]; articles: readonly Article[]; talks: readonly Talk[]; testimonials: readonly Testimonial[]; leadership: Leadership;
  glossary: readonly GlossaryEntry[]; credits: Readonly<Record<string, { title: T; alt: T }>>; copy: Copy;
}
```

Chrome micro-strings live in `src/chrome/strings.ts` (WP-04), not in content. `src/content/index.ts` (WP-00) assembles `content: Content` from the WP-01 files, the manifest (`assets-src/images/manifest.json`) and `images.json`.

---

## Appendix B — Canonical facts (English master; WP-01 translates and expands, numbers never change)

### B.1 Person

| Field | Value |
|---|---|
| Name | 瀬川 湊 (せがわ みなと) · Minato Segawa · 濑川 凑; seal glyph 湊 |
| Role | Senior Software Engineer · シニアソフトウェアエンジニア · 高级软件工程师 |
| Experience | 8 years, since 2018-04 |
| Specialty | Distributed systems, developer platforms and web rendering performance |
| Location | Tokyo, Japan (JST, UTC+9) |
| Availability | From 2027-01 · Senior or Staff roles, full-time, or advisory · two months' notice · Japanese citizen · remote or hybrid from Tokyo; open to relocating to Singapore or Shanghai |
| Overlap hours | Europe (CET): 16:00–19:00 JST · US West (PT): 08:00–10:00 JST |
| Languages | Japanese — native · English — professional (three years in an English-speaking remote team) · Chinese (Mandarin) — HSK 5, business reading and conversation |
| Education | B.Eng. in Information Science, 2018 (a national university in Japan) |
| Award | Kairo Engineering Award 2025 — resilience programme (internal) |
| Now | Leading platform reliability at Kairo; maintaining `scrubkit`; writing about frame-accurate video scrubbing |
| Response time | Replies within one business day (JST) |

### B.2 Employers (fictional)

| id | ja | en | zh | Descriptor | From → to | Headcount |
|---|---|---|---|---|---|---|
| hanamichi | 花道ペイメンツ | Hanamichi Payments | 花道支付 | A card-payments startup in Tokyo | 2018-04 → 2020-03 | ≈ 40 |
| wataridori | 渡り鳥ロジスティクス | Wataridori Logistics | 候鸟物流 | A remote-first logistics SaaS | 2020-04 → 2023-06 | ≈ 300 |
| kairo | 海路 | Kairo | 海路 | A C2C marketplace with ≈ 9 million monthly users | 2023-07 → present | ≈ 1,200 |

Roles/ledger: Hanamichi — Backend Engineer (2018-04 → 2020-03); Wataridori — Software Engineer (2020-04), Senior Software Engineer (promoted 2021-04), Tech Lead of 6 (2022-01 → 2023-06); Kairo — Senior Software Engineer, Developer Platform (2023-07), Incident Commander rotation lead (2024-11 →), platform reliability lead (2025-10 →).

### B.3 Career chapters (film)

| Ch | Year | Station | Employer | Role | Headline | Two outcomes |
|---|---|---|---|---|---|---|
| 1 | 2018 | nihonbashi | hanamichi | Backend Engineer (new grad) | Built the settlement API in Go; joined on-call in month four | First production service; wrote the team's first runbook |
| 2 | 2019 | hakone | hanamichi | Backend Engineer | Card tokenisation and the ledger rewrite | PCI DSS scope 23 → 3 services (audit passed first time); settlement batch 6 h → 50 min |
| 3 | 2020 | mishima | wataridori | Software Engineer | A remote-first dispatch platform in a fog year (traffic ×6) | Tracing across 140 services; MTTD 38 → 6 min |
| 4 | 2021 | hara | wataridori | Senior Software Engineer | Promoted; built the WebGL fleet-map renderer | p95 frame 38 → 9 ms at 40k vehicles; open-sourced `kento` |
| 5 | 2022 | shimada | wataridori | Tech Lead (6 engineers) | Carried dispatch from a monolith to events (strangler fig) | 14 months, zero downtime; throughput ×12 |
| 6 | 2023 | okazaki | kairo | Senior SWE, Developer Platform | Golden paths bridging 14 teams | Deploy lead time 45 → 7 min; 120 services onboarded by 2024-12 |
| 7 | 2024–25 | shono | kairo | Senior SWE / Incident Commander | A 47-minute regional outage (2024-11-12), then the resilience programme | RTO 4 h → 15 min; availability 99.95 → 99.99 % |

### B.4 Metrics

| id | Label | Display | Direction | Period | Employer | Seal face ja / zh / en |
|---|---|---|---|---|---|---|
| settle | Settlement batch time | 6 h → 50 min | fell | 2019 | hanamichi | — |
| pci | PCI DSS scope | 23 → 3 services | fell | 2019 | hanamichi | — |
| mttd | Mean time to detect | 38 → 6 min | fell | 2020 | wataridori | — |
| frame | Map renderer p95 frame time (40k vehicles) | 38 → 9 ms | fell | 2021 | wataridori | — |
| thru | Dispatch throughput | ×12 (2.1k → 25k events/s), zero downtime | rose | 2022–23 | wataridori | 拾弐倍 / 拾贰倍 / ×12 |
| deploy | Deploy lead time (median) | 45 → 7 min | fell | 2023-Q3 → 2024-Q4 | kairo | 漆分 / 柒分 / 7 min |
| paths | Services on golden paths | 0 → 120 | rose | 2023–24 | kairo | — |
| avail | Checkout availability (annual) | 99.95 → 99.99 % | rose | 2024 → 2025 | kairo | 肆玖 / 肆玖 / 99.99 |
| rto | Regional failover RTO | 4 h → 15 min | fell | 2025 | kairo | — |
| mttr | MTTR (median, all incidents) | 44 → 9 min | fell | 2024 → 2026 | kairo | 玖分 / 玖分 / 9 min |
| pages | Pages per on-call week | 31 → 4 | fell | 2024-Q4 → 2025-Q4 | kairo | — |
| mentees | Engineers mentored / promoted | 11 / 4 | rose | 2019–2026 | all | — |
| rfc | RFCs since founding the process | 0 → 38 | rose | 2023-10 → 2026-10 | kairo | — |

`source` for every metric: "team dashboard export (sample data)". Summary results: `frame`, `thru`, `deploy`, `mttr`.

### B.5 Cases (summary; WP-01 writes the full 問・術・答・省)

| Panel | id | Problem (one line) | Method (one line) | Result |
|---|---|---|---|---|
| 1 | ledger | Nightly settlement took 6 h and occasionally double-settled on retries | Idempotency keys + transactional outbox + partitioned batch in Go on PostgreSQL | 6 h → 50 min; zero double settlements since |
| 2 | tracing | Incidents across 140 services were found by customers first | OpenTelemetry tracing with tail sampling, exemplars linked from Prometheus alerts | MTTD 38 → 6 min |
| 3 | mapgl | The fleet map stalled with 40k moving vehicles | WebGL2 renderer with instanced glyphs, vector-tile streaming and a frame budget | p95 frame 38 → 9 ms |
| 4 | strangler | A dispatch monolith could not scale or be deployed safely | Strangler-fig migration to Kafka events behind an Envoy routing layer, shadow reads, dual writes | 14 months, zero downtime, throughput ×12 |
| 5 | platform | 14 teams each built their own deploy path | Golden-path templates on Kubernetes + Terraform modules, paved CI, scorecards | Lead time 45 → 7 min; 120 services onboarded |
| 6 | resilience | A 47-minute regional outage exposed a 4-hour recovery plan | Cell-based multi-region design, automated failover, game days, SLOs with error budgets | RTO 4 h → 15 min; availability 99.95 → 99.99 % |

### B.6 Tools (25; `years` and `projects` drive kumiko run length and joints)

| id | Name | Domain | Years | Since | Last | Projects | Employers | Scale | Cases | Neighbours |
|---|---|---|---|---|---|---|---|---|---|---|
| ts | TypeScript | web | 7 | 2019 | 2026 | 9 | all | Monorepo of 1.2M lines | mapgl, platform | react, threejs, webperf, node |
| react | React | web | 6 | 2019 | 2025 | 6 | all | Design system used by 40 engineers | platform | ts, a11y |
| threejs | three.js / WebGL | web | 5 | 2021 | 2026 | 4 | wataridori, kairo | 40k moving vehicles at 60 fps | mapgl | ts, webperf, webgpu |
| webperf | Web performance | web | 6 | 2020 | 2026 | 7 | wataridori, kairo | p95 frame 38 → 9 ms | mapgl | threejs, ts |
| a11y | Accessibility | web | 4 | 2022 | 2026 | 4 | wataridori, kairo | WCAG 2.2 AA audits of 3 products | — | react |
| webgpu | WebGPU | web | 1 | 2025 | 2026 | 1 | kairo | Prototype renderer | — | threejs |
| go | Go | backend | 8 | 2018 | 2026 | 12 | all | 25k events/s dispatch | ledger, strangler, resilience | grpc, kafka, postgres, k8s |
| rust | Rust | backend | 3 | 2023 | 2026 | 3 | kairo | Hot-path parser, −61 % CPU | — | go |
| node | Node.js | backend | 5 | 2019 | 2023 | 5 | hanamichi, wataridori | BFF for 3 apps | — | ts |
| grpc | gRPC | backend | 6 | 2020 | 2026 | 8 | wataridori, kairo | 140 services | tracing, strangler | go, envoy |
| kafka | Kafka | backend | 5 | 2021 | 2026 | 5 | wataridori, kairo | 3 clusters, 1.8B messages/day | strangler | go, clickhouse |
| postgres | PostgreSQL | data | 8 | 2018 | 2026 | 9 | all | 4 TB, 40k writes/s | ledger, strangler | go, redis |
| redis | Redis | data | 7 | 2019 | 2026 | 6 | all | Rate limiting at 120k ops/s | — | postgres, go |
| clickhouse | ClickHouse | data | 3 | 2023 | 2026 | 2 | kairo | 18B rows of events | — | kafka, otel |
| k8s | Kubernetes | infra | 6 | 2020 | 2026 | 7 | wataridori, kairo | 600 nodes in 3 regions | strangler, platform, resilience | terraform, envoy, go |
| terraform | Terraform | infra | 6 | 2020 | 2026 | 6 | wataridori, kairo | 1,900 managed resources | platform, resilience | k8s, aws |
| aws | AWS (multi-region) | infra | 8 | 2018 | 2026 | 10 | all | 3 regions, active-active | resilience | terraform, k8s |
| envoy | Envoy | infra | 4 | 2022 | 2026 | 3 | wataridori, kairo | Edge for 9M monthly users | strangler, resilience | grpc, k8s |
| otel | OpenTelemetry | infra | 6 | 2020 | 2026 | 5 | wataridori, kairo | Traces across 140 services | tracing | prom, clickhouse |
| prom | Prometheus | infra | 6 | 2020 | 2026 | 6 | wataridori, kairo | 1.2M active series | tracing, resilience | otel, slo |
| slo | SLOs and error budgets | infra | 5 | 2021 | 2026 | 4 | wataridori, kairo | SLOs for 38 services | resilience | prom, incident |
| design | System design and RFCs | practice | 6 | 2020 | 2026 | 10 | wataridori, kairo | Founded the RFC process (38 RFCs) | strangler, platform | writing, mentoring |
| incident | Incident command | practice | 3 | 2023 | 2026 | 3 | kairo | 23 incidents commanded, 2 SEV-1 | resilience | slo, mentoring |
| mentoring | Mentoring | practice | 7 | 2019 | 2026 | 11 | all | 11 mentees, 4 promoted | — | design, incident |
| writing | Technical writing | practice | 8 | 2018 | 2026 | 9 | all | 6 articles, 38 RFCs, runbooks | — | design |

### B.7 Operations (garden)

- Service: Kairo checkout API. Window: weeks of 2025-10-20 → 2026-10-18 (week 1 starts Monday 2025-10-20).
- SLO: "99.95 % of checkout requests succeed in under 300 ms, monthly" — met 11 of 12 months (missed 2025-11).
- `weeklyP99ms` (52 values, ms):
  `186, 184, 189, 183, 191, 412, 205, 188, 182, 179, 185, 228, 181, 178, 176, 180, 174, 177, 296, 190, 175, 172, 170, 173, 169, 171, 207, 168, 166, 165, 167, 163, 214, 162, 160, 161, 158, 159, 157, 160, 155, 156, 154, 157, 153, 151, 152, 150, 149, 151, 148, 147`
- SEV-1 incidents: week 6 — 2025-11-26, regional database failover stalled, 41 min, 18 % of users affected · week 19 — 2026-02-25, bad edge configuration push, 12 min, 7 % of users affected.

### B.8 Banzuke

| Rank | 東 Delivery | 西 People |
|---|---|---|
| 大関 | Deploy lead time 45 → 7 min (2023–24) | 11 engineers mentored, 4 promoted (2019–26) |
| 関脇 | Dispatch throughput ×12, zero downtime (2022–23) | Founded the RFC process: 38 RFCs (2023–26) |
| 小結 | Settlement batch 6 h → 50 min (2019) | Incident-commander rotation founded; 9 commanders trained (2025) |
| 前頭 | Map frame p95 38 → 9 ms (2021) | Onboarding guide read by 60 engineers (2024) |
| 前頭 | Regional failover RTO 4 h → 15 min (2025) | Three talks (2022–25) |
| 前頭 | PCI DSS scope 23 → 3 services (2019) | 120 interviews (2021–26) |

Centre: 八年 · 令和八年 霜降 改.

### B.9 Charts (sunago) and reliability (karazuri)

- `deploys` — production deploys per week in the teams I worked in, bars: 2018 3 · 2019 6 · 2020 25 · 2021 60 · 2022 110 · 2023 140 · 2024 210 · 2025 240 · 2026 255.
- `leadtime` — deploy lead time, median minutes, line: 2023-Q3 45 · 2023-Q4 38 · 2024-Q1 24 · 2024-Q2 15 · 2024-Q3 11 · 2024-Q4 7.
- `mttr` — MTTR, median minutes, bars: 2019 95 · 2020 62 · 2021 50 · 2022 41 · 2023 46 · 2024 44 · 2025 17 · 2026 9.
- Reliability figures: `99.99 %` checkout availability (2025) · `9 min` MTTR median (2026-01 → 2026-09) · `4` pages per on-call week (2025-Q4) · `0` SEV-1 since 2026-03 · `9` latent failures found in game days (2025).

### B.10 Writing, OSS, talks

- **Repos** (stars, plate ink, releases `date tag +lines`):
  - `kento` — idempotent job registration for Go · Go · 640 stars · plate 6 · 2021-05-09 v0.1.0 +2410 · 2021-07-18 v0.2.0 +880 · 2021-10-02 v0.3.0 +1120 · 2022-02-20 v0.4.0 +640 · 2022-06-11 v0.5.0 +930 · 2022-11-03 v1.0.0 +1780 · 2023-04-16 v1.1.0 +410 · 2024-01-28 v1.2.0 +520 · 2025-03-09 v1.3.0 +300 · 2026-05-17 v1.4.0 +260
  - `baren` — an even-pressure load generator · Go · 210 stars · plate 2 · 2022-08-21 v0.1.0 +1350 · 2022-12-04 v0.2.0 +620 · 2023-09-10 v0.3.0 +770 · 2024-06-23 v0.4.0 +390 · 2025-08-31 v0.5.0 +450
  - `scrubkit` — frame-accurate scroll-to-media-time controller (runs this site's film) · TypeScript · 1,140 stars · plate 4 · 2025-12-14 v0.1.0 +1940 · 2026-02-08 v0.2.0 +760 · 2026-04-19 v0.3.0 +1020 · 2026-07-05 v0.4.0 +540 · 2026-10-04 v1.0.0 +880
- **Articles** (on-site abstracts): 2019-09-14 "The six-hour batch that became fifty minutes" (Hanamichi engineering blog) · 2020-11-02 "Tracing in a fog year" (Wataridori engineering blog) · 2021-06-20 "Idempotency is registration" (personal notebook) · 2022-12-10 "Strangler figs need gardeners" (personal notebook) · 2025-04-27 "Against the 3 a.m. page" (Kairo engineering blog) · 2026-09-13 "Scrubbing video without dropping frames" (personal notebook).
- **Talks**: 2022-10-22 "Strangler figs at dispatch scale" — a Tokyo Go meetup · 2024-06-15 "Golden paths without golden handcuffs" — a platform-engineering meetup in Tokyo · 2025-11-08 "Four nines, measured" — an SRE community conference in Tokyo.

### B.11 People

- **Testimonials** (quotes written by WP-01, ≤ 60 words en, specific, no gushing):
  - manager — 佐伯 透子 / Tōko Saeki / 佐伯透子 — VP of Engineering, Kairo — managed Minato 2023–2026 — 2026-08 — on incident command and the resilience programme.
  - peer — ダニエル・オカフォー / Daniel Okafor / 丹尼尔·奥卡福 — Staff Engineer, Wataridori Logistics — worked together on dispatch 2020–2023 — 2023-06 — on the strangler migration and design docs.
  - report — 林 雨涵 / Lin Yuhan / 林雨涵 — Senior Software Engineer, Kairo — mentee 2024–2026, promoted 2026 — 2026-07 — on mentoring and pairing.
- **Leadership**: 11 mentees · 4 promoted · 120 interviews · onboarding guide read by 60 engineers · 38 RFCs · 9 incident commanders trained.

### B.12 Stations

| id | Print | Image | ja | en | zh | Subtitle ja / en / zh |
|---|---|---|---|---|---|---|
| nihonbashi | 1 | tokaido/01-nihonbashi.jpg | 日本橋 | Nihonbashi | 日本桥 | 朝之景 / Morning Scene / 朝景 |
| hakone | 11 | tokaido/11-hakone.jpg | 箱根 | Hakone | 箱根 | 湖水図 / View of the Lake / 湖水图 |
| mishima | 12 | tokaido/12-mishima.jpg | 三島 | Mishima | 三岛 | 朝霧 / Morning Mist / 朝雾 |
| hara | 14 | tokaido/14-hara.jpg | 原 | Hara | 原 | 朝之富士 / Mount Fuji in the Morning / 朝之富士 |
| shimada | 24 | tokaido/24-shimada.jpg | 島田 | Shimada | 岛田 | 大井川駿岸 / Suruga Bank of the Ōi River / 大井川骏岸 |
| okazaki | 39 | tokaido/39-okazaki.jpg | 岡崎 | Okazaki | 冈崎 | 矢矧之橋 / Yahagi Bridge / 矢矧之桥 |
| shono | 46 | tokaido/46-shono.jpg | 庄野 | Shōno | 庄野 | 白雨 / Driving Rain / 白雨 |
| seki | 48 | tokaido/48-seki.jpg | 関 | Seki | 关 | 本陣早立 / Early Departure from the Main Inn / 本阵早立 |
| kyoto | 55 | tokaido/55-kyoto.jpg | 京師 | Kyoto | 京师 | 三条大橋 / The Great Bridge at Sanjō / 三条大桥 |

*End of DESIGN.md.*
