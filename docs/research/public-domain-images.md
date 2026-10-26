# Public-domain image research: classical Japanese art for an engineer's portfolio

Status: picture research done 2026-10-25. 60 images were downloaded, checked against each museum's API public-domain flag, inspected on contact sheets and catalogued.

- Images: `assets-src/images/<set>/<slug>.jpg`, 1,360–2,400 px on the long edge, 154–784 KB each, about 29 MB in total. All are under 1.5 MB.
- Catalogue: `assets-src/images/manifest.json`, one entry per image. Each entry has `file`, `set`, `title`, `artist`, `date`, `institution`, `objectUrl`, `imageUrl`, `license`, `width`, `height`, `dominantColors`, `suggestedUse`, plus `accentColors`, `creditText`, `accession`, `creditLine`, `medium`, `sourceApiFlag` and `bytes`. Tōkaidō prints also have `tokaido{printNo, stationIndex, nameJa, nameEn, subtitle}`, and book pages have `description`.
- Licence: every file comes from The Metropolitan Museum of Art Open Access (`isPublicDomain: true`) or the Art Institute of Chicago (`is_public_domain: true`). Both institutions release these images under CC0. Credit is not legally required, but we give it anyway (see §6).

---

## 0. Decisions at a glance

| Topic | Decision |
|---|---|
| Spine of the story | **Hiroshige's Hōeidō Tōkaidō (1833–34)**, 14 prints, from 日本橋 Nihonbashi (departure) to 京師 三条大橋 Kyoto (arrival). They are the images for the career journey and the 7-chapter scroll film. AIC holds the complete first-edition set. Every print chosen was compared across impressions, and the cleanest one was kept. |
| The "engineer" bridge | **Hokusai Manga pages that show method**: a perspective construction (三ツ割の法), a page that teaches how to build repeat patterns (seigaiha, kikkō, asanoha, sayagata), a torii proportion diagram, and a pagoda roof structure. Together with **uki-e perspective prints**, these are the strongest match between Edo visual culture and engineering. Each one is a specification drawing. |
| Gold and colour | **Rinpa gold-ground screens** (Kōrin, Kiitsu, Hōitsu, the Sōtatsu school, Tosa Mitsumochi). They feed the byōbu-fold and gold-leaf scenes in `threejs-techniques.md` §(e). |
| Pattern sources | **Katagami stencils** are cut paper, so a threshold turns them into clean alpha masks. **Meiji and Edo design books** (Seiei 1907, Moronobu 1677, the Kōrin design book 1864, a hand-painted kosode album) supply "template / wireframe" imagery. |
| Night mode | A 13th–14th-century **Star Mandala**, an **1885 photograph of a real star field**, Hiroshige moon prints and a Yoshitoshi moonlit triptych. |
| Deliberately not used as hero | The Great Wave. It is downloaded (Met impression) for a cameo or a particle morph target. As a hero image it would make the site look like a souvenir shop. |
| Rejected on content | A uki-e of a pleasure-house interior (an embracing couple; wrong register for a CV). A Hokusai Manga page of flintlock-pistol exploded drawings (weapon imagery). Scans that were small (552 px) or too dark. |

---

## 1. Method and API notes (for reproducibility)

- **Met**: `/public/collection/v1/search` was **retired on 2026-10-01** and now returns HTTP 410. Use `https://collectionapi.metmuseum.org/public/collection/v1.1/search?q=…&hasImages=true&limit=…` (Elastic-backed, paginated). Object details still come from `/public/collection/v1/objects/{id}`. The `primaryImage` and `additionalImages` URLs use `/original/`. Swap in `/web-large/` (about 600–1,000 px; sometimes only 600 px for book pages) or `/mobile-large/` (about 460 px) for previews. Book pages (Hokusai Manga, the design books) exist only as `additionalImages` entries. Their page index is recorded in the manifest title, for example "(page image 92)".
- **AIC**: `https://api.artic.edu/api/v1/artworks/search?q=…&fields=id,title,artist_display,date_display,image_id,is_public_domain,thumbnail`, with both `User-Agent` and `AIC-User-Agent` set to a descriptive string. Images come from IIIF `https://www.artic.edu/iiif/2/{image_id}/full/1686,/0/default.jpg`. 1686 px is AIC's recommended cached width, so AIC landscapes are 1686 px wide.
- **Processing** (scripts are in the scratchpad, not shipped): Met originals (up to 11,588 px) were decoded with JPEG draft scaling and resized with Lanczos to 2,000 px on the long edge, or 2,400 px for panoramas with an aspect ratio of 2.2 or more. Screens and stencils had their uniform studio backdrop trimmed automatically, but only when all four corners agreed. The brocade mount of `soami-landscape` was cropped off by hand. Output is progressive JPEG at q86.
- **Colour fields**: `dominantColors` holds the 3–5 most frequent median-cut clusters, so it is mostly paper and ground tones. `accentColors` holds up to 3 saturated clusters that cover at least 1.2 % of the image: the actual pigments.
- About 130 candidates were reviewed on contact sheets. A further 262 Hokusai Manga page thumbnails were reviewed (Met 57833, 8 volumes) to find the method pages.

---

## 2. What was found, per set

### A) `tokaido/`: Hiroshige, Fifty-three Stations of the Tōkaidō, Hōeidō edition (14 files, all AIC except Kyoto)

AIC (Clarence Buckingham Collection) holds every Hōeidō station, often in 2–4 impressions. The Met holds about a dozen Hōeidō sheets. For every station chosen, all available impressions were compared, and the one with the best colour and least fading was kept. File names use the **print number** (1–55, with Nihonbashi as print 1). The manifest also records the post-station index (Nihonbashi = 0, Kyoto = terminus).

| File | Station | Print (subtitle) | Why it matters |
|---|---|---|---|
| `01-nihonbashi.jpg` | 日本橋 | Morning Scene, first state | Departure at dawn, the bridge gates opening. AIC 25544. Chosen over the Met copy (duller) and the later "procession" state (busier). |
| `02-shinagawa.jpg` | 品川 | Sunrise | Leaving the city by the sea. |
| `11-hakone.jpg` | 箱根 | View of the Lake | Patchwork mountain, the hardest climb. Works as a cut-paper layer stack. |
| `12-mishima.jpg` | 三島 | Morning Mist | Figures dissolving in grey tones. A natural fog or depth transition. |
| `13-numazu.jpg` | 沼津 | Twilight | Full moon. The hinge between day and night. |
| `14-hara.jpg` | 原 | Mount Fuji in the Morning | **Fuji breaks out of the picture frame.** The best "exceeding the bounds" image. |
| `16-kanbara.jpg` | 蒲原 | Evening Snow | Night snow. The night-theme chapter. |
| `17-yui.jpg` | 由井 | Satta Peak | A cliff edge above the sea. |
| `24-shimada.jpg` | 島田 | Suruga Bank of the Ōi River | Bird's-eye view of porters ferrying a procession: orchestrating many people. |
| `39-okazaki.jpg` | 岡崎 | Yahagi Bridge | The longest bridge on the road: infrastructure that connects. |
| `46-shono.jpg` | 庄野 | Driving Rain | The famous storm (crisis, incident). A reference for rain-line shaders. AIC holds a 9,474 px scan. |
| `47-kameyama.jpg` | 亀山 | Clear Weather after Snow | A steep diagonal: recovery after the storm, and a diagonal wipe. |
| `48-seki.jpg` | 関 | Early Departure from the Main Inn | Curtains with **family crests (kamon)**: identity and design systems. |
| `55-kyoto.jpg` | 京師 | Sanjō Ōhashi (大尾) | Arrival. Met 36976, chosen for its sharper red mountain. |

Not downloaded, but available on AIC if more stops are needed: Kawasaki 25555, Hodogaya 25561, Odawara 25584, Ejiri 25625, Mariko 25632, Okabe 18260, Kanaya 25657, Arai 25686, Kuwana 25748, Tsuchiyama 25772, Kusatsu 25783, Ōtsu 25785.

### B) `rinpa/`: gold-ground screens (8 files, all Met)

| File | Work | Note |
|---|---|---|
| `korin-irises-yatsuhashi.jpg` | Ogata Kōrin, *Irises at Yatsuhashi (Eight Bridges)*, after 1709 | The Met's primary photograph shows one screen of the pair: a zig-zag plank bridge through irises. 26 more detail and companion photographs exist (object 39664). |
| `korin-rough-waves.jpg` | Kōrin, *Rough Waves*, c. 1704–09 | Two-panel screen. Flow-field and wave reference. |
| `kiitsu-morning-glories.jpg` | Suzuki Kiitsu, *Morning Glories* | Lapis blue on gold. Reads as a node-and-edge network. |
| `fans-upon-waves.jpg` | Sōtatsu school, *Fans upon Waves*, mid-17th c. | Modules on a stream, a projects metaphor. |
| `bamboo-grove.jpg` | Unidentified, *Bamboo Grove*, 2nd half 17th c. | Vertical rhythm on gold. |
| `hoitsu-cherry-maple.jpg` | Sakai Hōitsu, *Cherry and Maple Trees*, early 1820s | Two seasons on one screen, for the theme switch. |
| `mitsumochi-poppies.jpg` | Tosa Mitsumochi, *Red and White Poppies*, early 17th c. | A **chequered fence**: a grid inside a classical screen. |
| `sotatsu-moon-autumn-grasses.jpg` | Tawaraya Sōtatsu, *Moon and Autumn Grasses* | The silver moon has oxidised dark. Night-mode emblem. |

Also PD at the Met and not downloaded: Kōrin *Cranes, Pines, and Bamboo* (44896), Hōitsu *Persimmon Tree* (45392), Kiitsu *Irises and Moth* (53424) and *Irises* (853219), Sakai Ōho *Six Jewel Rivers* (53427), Sōtatsu *Boats upon Waves* (48921).

### C) `hokusai/`: prints and method pages (11 files)

| File | Work | Note |
|---|---|---|
| `great-wave.jpg` | *Under the Wave off Kanagawa*, Met 45434 | Clean, bright impression. Cameo use only. |
| `red-fuji.jpg` | *A Mild Breeze on a Fine Day (Gaifū kaisei)*, a.k.a. Fine Wind, Clear Morning / Red Fuji, AIC 77328 | Summit, achievements. |
| `ejiri-wind.jpg` | *Ejiri in Suruga Province*, AIC 24800 | **Sheets of paper blown into the sky**: writing, logs, scattered events. |
| `shower-below-summit.jpg` | *Shower Below the Summit (Sanka hakuu)*, AIC 87008 | Lightning: performance wins. |
| `ono-falls.jpg` | *Ono Falls on the Kisokaidō*, AIC 25183 | Tall format. A wry "waterfall process" image. |
| `manga-perspective.jpg` | Hokusai Manga, Met 57833, page image 83 | **Perspective lesson with vanishing lines** (三ツ割の法), believed to be vol. 3, 1815. It matches the Illustrator ruler-and-guides idea exactly. |
| `manga-pattern-construction.jpg` | Hokusai Manga, page image 92 | **How to draw seigaiha, kikkō, asanoha, sayagata, shippō…**: an algorithm book for patterns. |
| `manga-torii-proportion.jpg` | Hokusai Manga, page image 136 | Torii types, plus a **proportion diagram** with diagonals and five-element labels. |
| `manga-pagoda-roof.jpg` | Hokusai Manga, page image 147 | Roof structure: layered architecture. |
| `manga-wave-studies.jpg` | Hokusai Manga, page image 60 | Line studies of waves, for an SVG or line-shader sea. |
| `manga-whirlpools.jpg` | Hokusai Manga, page image 170 | The Naruto whirlpools: event loop, curl-noise flow. |

Searched but not found with images in either API: 略画早指南 *Ryakuga haya oshie* (the compass-and-ruler manual). `manga-pattern-construction` and `manga-perspective` cover the same idea. Also PD and not downloaded: Hokusai *Kajikazawa* (AIC 18969), *Cranes on Snow-covered Pine* (AIC 21720), Met 40011 (*Album of Sketches by Katsushika Hokusai and His Disciples*, 105 images, not yet reviewed).

### D) `pattern/`: design books and katagami stencils (10 files, all Met)

| File | Work | Note |
|---|---|---|
| `seiei-arcs-wave.jpg` | Yamada Naosaburō (as credited by the Met), *Seiei: A Design Book*, 1907, page image 9 | Concentric gold arcs and a wave crest. Looks startlingly modern. |
| `seiei-moon-kikko.jpg` | Same book, page image 11 | Gold moons over a **hexagonal lattice on a diagonal**: tessellation leading into 3D. |
| `kosode-pattern-book.jpg` | *Book of Painted Kosode Patterns*, 2nd half 17th c., page image 0 | Vermilion and white robe silhouettes = templates and components. |
| `moronobu-kimono-template.jpg` | Hishikawa Moronobu, *Tōsei hiinagata*, 1677, page image 4 | Robe outlines, one filled black: **wireframe vs. filled**. |
| `korin-designs-stream.jpg` | *Kōrin shinsen hyakuzu*, 1864, page image 45 | Kōrin-style water (kōrin-nami). Good for vectorising. |
| `stencil-asanoha.jpg` | Stencil with hemp-leaf pattern (Met 53215) | Triangular-grid star. |
| `stencil-sayagata.jpg` | Stencil with sayagata fret (65305) | Interlocking fret. |
| `stencil-meander.jpg` | Stencil (69150) | Squared meander that reads like circuit traces or a maze. |
| `stencil-undulating-lines.jpg` | Stencil with parallel undulating lines (69390) | Waveforms, frequency. |
| `stencil-waves.jpg` | Stencil with pattern of waves (70033) | Bold cut-paper waves for a mask wipe. |

The Met holds more than 100 PD katagami: object IDs 69106–69150, 70008–70078, 53836–53842 and others. Other good ones: diamond and hishi 69138 and 69132 (both about 2 MB originals), kikkō 69141, turbulent water 69926. "Concentric circles" (70011) was rejected because the Met file is only 552 px. Generate that motif instead.

Kamon crest books (紋帳) and carpentry or 規矩術 manuals: **none with images and a PD flag** in either API. See §5.

### E) `ukie/`: perspective prints (3 files, AIC)

| File | Work | Note |
|---|---|---|
| `toyoharu-kabuki-perspective.jpg` | Utagawa Toyoharu, *Perspective Picture of a Kabuki Theater*, c. 1776 (AIC 24393) | One-point perspective. The grid of audience boxes is literally a 3D floor grid. |
| `hokusai-niomon-perspective.jpg` | Hokusai, *Perspective View: The Niō Gate of Kinryūzan Temple*, 1781/89 | Young Hokusai learning Western perspective. |
| `toyoharu-dutch-perspective.jpg` | Toyoharu, *Fishing*, from "Dutch Perspective Pictures" (Oranda uki-e), c. 1768 | A "Dutch-style" view modelled on European perspective prints (stone bridge, vanishing streets): **learning a foreign toolset**. |

Also available: Okumura Masanobu, *Large Perspective Picture of the Kaomise Performance* (AIC 21561, 10,487 px, dramatic converging beams), and the Kitao Masayoshi *Chūshingura* perspective series (AIC 180070–180083).

### F) `night/`: stars and moon (5 files)

| File | Work | Note |
|---|---|---|
| `star-mandala.jpg` | *Star Mandala (Hoshi mandara)*, 13th–14th c., Met 78283 | Concentric rings of star deities. Reference for an orbital or instanced-ring scene. |
| `cygnus-photograph.jpg` | Paul Henry (Paris Observatory), *A Section of the Constellation Cygnus*, 13 Aug 1885, Met 283255 | A real star-field photograph. Invert it for day mode, or sample star positions from it. |
| `hiroshige-cuckoo-moon.jpg` | Hiroshige, *A Cuckoo against the Moon* (fan print), AIC 22820 | Prussian blue and a full moon, a light-palette night motif. |
| `yoshitoshi-yasumasa-moon.jpg` | Yoshitoshi, *Fujiwara no Yasumasa Playing His Flute in the Moonlight*, triptych, AIC 102619 | Wide night panorama. |
| `hiroshige-ryogoku-moon.jpg` | Hiroshige, *Twilight Moon at Ryōgoku Bridge*, AIC 25417 | The moon seen through the bridge's timber piers. Engineering and dusk in one image. |

No Japanese or Chinese **star chart** (Shibukawa Harumi 天文分野之図, or a Dunhuang-type chart) is in either API with images. Generate one (§5). Also PD and not downloaded: Paul Henry, *Nébuleuse de la Lyre* (the Ring Nebula, Met 266895, a good 404-page cameo), Yoshitoshi *Moon of Enlightenment* (AIC 102075), *Moon and Smoke* (AIC 197414), *Geese across the Moon* (AIC 212358).

### G) `landscape/`: ink, mist, pines (4 files)

| File | Work | Note |
|---|---|---|
| `motonobu-ink-landscape.jpg` | Attributed to Kano Motonobu, *Ink Landscape*, AIC 80072 | Very light and misty. A quiet hero background. |
| `soami-landscape.jpg` | Sōami, *Landscape*, Met 816194 | Cropped to the painting; the dark brocade mount was removed. |
| `shonen-aged-pines.jpg` | Suzuki Shōnen, *Aged Pines*, Met 65603 | Ink pines on gold: longevity, 8 years. |
| `tobun-snowy-fan.jpg` | Toki Tōbun, *Snowy Landscape* (fan painting), c. 1550 | The fan shape can serve as a radial-menu or language-switcher mask. |

No PD **karesansui / Ryōan-ji** or origami-crane (*Senbazuru orikata*, 1797) images were found in these APIs.

### H) `writing/`: the scholar's table (5 files, AIC surimono)

| File | Work | Note |
|---|---|---|
| `gakutei-brush.jpg` | Yashima Gakutei, *Brush: Lady Wei*, from "The Four Friends of the Writing Table" (文房四友), c. 1827 | Tools and stack. |
| `gakutei-paper.jpg` | Gakutei, *Paper: Fujiwara no Teika*, same series | Writing and publications. Only Brush and Paper from this series are at AIC; Ink and Inkstone are not. |
| `hokkei-first-writing.jpg` | Totoya Hokkei, *Tachibana no Hayanari preparing to make the first writing of the New Year*, 1823 | Kakizome (書初め): a "now" page or roadmap. |
| `gakutei-spider-web.jpg` | Gakutei, *Two Chinese Women Examining Thread and a Spider's Web in a Box*, c. 1824 | A Tanabata custom, and a quiet pun on **the Web**. |
| `gakutei-book-cart.jpg` | Gakutei, *A Woman Pulling the Cord of a Wheeled Book Case*, c. 1825 | Libraries and open-source packages. |

---

## 3. Best picks per likely site section

The section names below are guesses at the final IA. Adjust them to the real one.

| Section | Primary image(s) | Supporting / transition |
|---|---|---|
| Opening / hero | `landscape/motonobu-ink-landscape` (mist) behind live 3D; `tokaido/01-nihonbashi` as the "departure" card | `hokusai/manga-perspective` guide lines drawn on top as an Illustrator-style overlay |
| About / philosophy | `landscape/shonen-aged-pines`, `landscape/soami-landscape` | `ukie/hokusai-niomon-perspective` (an artist learning a foreign method) |
| **Career journey (7 milestones = 7 film chapters)** | Proposed pairing: ① `01-nihonbashi` first job → ② `12-mishima` greenfield fog → ③ `11-hakone` big migration → ④ `24-shimada` leading a team → ⑤ `39-okazaki` platform/APIs → ⑥ `46-shono` the incident → ⑦ `14-hara` peak impact; closing bookend `55-kyoto` (now / contact) | Night variants: `13-numazu`, `16-kanbara`. Transitions: `47-kameyama` diagonal wipe; `48-seki` departure for a role change |
| Projects | `rinpa/fans-upon-waves` (each fan = a project), `rinpa/korin-irises-yatsuhashi` (the zig-zag bridge as the path between projects) | `ukie/toyoharu-kabuki-perspective` as the "stage" |
| Skills / engineering method | `hokusai/manga-pattern-construction`, `pattern/stencil-meander`, `pattern/stencil-sayagata`, `rinpa/kiitsu-morning-glories` (network) | `rinpa/mitsumochi-poppies` (grid), `pattern/stencil-undulating-lines` (signals) |
| Architecture / system design / 3D | `hokusai/manga-torii-proportion`, `hokusai/manga-pagoda-roof`, `pattern/seiei-moon-kikko` (flat lattice that turns into a 3D mesh) | `ukie/toyoharu-dutch-perspective` |
| Design system / front-end craft | `pattern/moronobu-kimono-template` (wireframe), `pattern/kosode-pattern-book` (filled components) | `pattern/korin-designs-stream` vectorised as dividers |
| Achievements / numbers | `hokusai/red-fuji`, `hokusai/shower-below-summit` | `tokaido/14-hara` |
| Writing / talks / OSS | `writing/gakutei-brush`, `writing/gakutei-paper`, `writing/hokkei-first-writing`, `writing/gakutei-book-cart` | `hokusai/ejiri-wind` (papers flying out as particles) |
| Night mode (theme) | `night/star-mandala`, `night/cygnus-photograph`, `night/yoshitoshi-yasumasa-moon` | Toggle illustration: `night/hiroshige-cuckoo-moon` or `rinpa/sotatsu-moon-autumn-grasses`; day↔night hinge: `night/hiroshige-ryogoku-moon`, `rinpa/hoitsu-cherry-maple` |
| Language switcher (JA/EN/ZH) | `landscape/tobun-snowy-fan` (fan mask, three ribs) | — |
| Contact | `tokaido/55-kyoto`, `pattern/seiei-arcs-wave` | — |
| 404 / easter eggs | `writing/gakutei-spider-web` ("the web is empty here"), `hokusai/great-wave`, Met 266895 Ring Nebula (not downloaded) | `hokusai/ono-falls` ("we don't do waterfall") |

**Scroll film source material.** The 7 chapter prints above can also be the *content* of the scrubbed video. Rendering them offline in three.js as layered 2.5D cut-outs (sky, mountains, figures) gives a continuous camera journey along the Tōkaidō. Camera motion over flat, limited-palette woodblock areas compresses extremely well under H.264, which fits the byte budget in `video-scrub.md` §2.6. Separate the layers by hand (or segment them, then clean up); the prints have few flat colour regions.

---

## 4. Treatment guidelines (so the images do not drift into "AI design")

1. **Do not lift the paper colour into the UI.** Every print sits on a warm paper ground (`dominantColors` is mostly #c8bc9b to #e3d8bb). Warm cream + serif + terracotta is the named cliché. Keep the page ground cool and light (washed indigo-grey, or the pale blue-green of Hiroshige's skies). Let the paper appear only inside the image rectangles.
2. **Take accents from actual pigments** (`accentColors`). Prussian blue (bero-ai) `#205c81` / `#295376` / `#164a68`. Malachite and verdigris green `#1a6343` / `#1c6e3f`. Vermilion `#d84d3a` / `#e5736a`. Gold ground `#e1a441` / `#e9b460`. Red-Fuji beni `#bc715a`. Kyoto mountain red `#c27b65`. Seki teal `#4c8480`. Change the accent per section, keyed to that section's image. That gives each section its own identity while the whole stays one family.
3. **Stencils become masks, not pictures.** They are persimmon-tanned brown with white cut-outs. Threshold the luminance at about 0.6 to get a 1-bit mask, use it as `mask-image` or a shader alpha, and colour it with the section accent. Do not show the brown sheet itself in a light theme.
4. **Book pages**: keep the gutter and binding visible on at least one (it reads as "documentation"). For guides and overlays, crop to the printed frame.
5. **Gold screens in WebGL**: use them as the albedo for the anisotropic gold-leaf shader in `threejs-techniques.md` §(e3). Use only 1024-px textures there (about 4 MB GPU each with mips), not the 2000-px masters.
6. **Delivery**: encode AVIF and WebP at 640 / 1280 / 2000 px from these masters at build time. Load lazily with `decoding="async"`. A decoded 2000×1500 image costs about 12 MB of RAM, so never keep more than about 6 full-size images decoded at once on mobile.
7. **The Great Wave** stays a cameo. Hara's frame-breaking Fuji and Shōno's rain are less familiar and say more.

---

## 5. Gaps that should be GENERATED (SVG / canvas / WebGL)

| Gap | Why there is no PD file | Generate as |
|---|---|---|
| Star chart (天文分野之図 / Chinese 28 lunar mansions) | Not in the Met or AIC with images | Stars plotted from the Yale Bright Star Catalogue (BSC5, freely distributed by NASA HEASARC / CDS), with asterism lines hand-authored from star IDs; positions are facts. Render in WebGL as points with a hairline grid, in the style of the Star Mandala's rings. |
| Kamon / crest book (紋帳) | No PD crest books with images | SVG crests built with compass and ruler and **animated in that construction order**, as `manga-pattern-construction` teaches. Design a personal crest for the engineer. Do not reuse real corporate crests. |
| *Ryakuga haya oshie* compass constructions | Not in either API | An SVG stroke-drawing of circles and tangents that resolves into a figure (crane, Fuji). |
| Carpentry: sashigane square, 規矩術, kumiko joinery | No PD manual images found | three.js instanced kumiko lattice (`threejs-techniques.md` §(d)) plus an SVG sashigane ruler as the page ruler (the Illustrator ruler made Japanese). |
| Karesansui (raked sand garden) | No PD photo or print | Height-field sand with cursor raking (`threejs-techniques.md` §(f1)). |
| Origami crane (Senbazuru orikata, 1797) | Not found | Animated crease-pattern fold in three.js. A good "algorithm → form" metaphor. |
| Concentric-ripple katagami | Met file only 552 px | A procedural ripple shader. |
| Ink and inkstone of the Four Treasures | AIC has only Brush and Paper | A 3D inkstone and ink stick (simple SDF or low-poly), or use `hokkei-first-writing`. |
| Washi texture, gold leaf, mist | Better procedural than scanned | Noise-based washi fibre shader, the anisotropic gold-leaf shader, and layered fog cards. |
| Portrait, workplace and project screenshots | Must come from the client | Placeholder slots must not ship. Ask the client. |

---

## 6. Credit lines

Both museums ask (but do not require) that users credit the source. Recommended credits-page text:

- EN: "Historical artworks: The Metropolitan Museum of Art (Open Access) and the Art Institute of Chicago, released into the public domain under CC0. Titles, artists and object links are listed below."
- JA: 「作品画像：メトロポリタン美術館（オープンアクセス）およびシカゴ美術館所蔵。いずれもCC0（パブリックドメイン）として公開されています。各作品の題名・作者・所蔵品ページは以下に記載しています。」
- ZH: 「作品图片：大都会艺术博物馆（开放获取）与芝加哥艺术博物馆藏品，均以CC0（公有领域）方式发布。各作品名称、作者及馆藏页面列于下方。」

Per-image credit: use `manifest.json` → `creditText`. Example: "Utagawa Hiroshige 歌川 広重, Nihon Bridge: Morning Scene (Nihonbashi, asa no kei)…, c. 1833/34. Art Institute of Chicago, Clarence Buckingham Collection. Public domain (CC0)." Link each credit to `objectUrl`. A short caption beside each image is enough: artist, title, date, institution. Do not say "courtesy of", since no permission was sought or needed. Do not imply that either museum endorses the site.

---

## 7. Rejected candidates (and why)

- *Perspective Picture of a Large Room* (attr. Ishikawa Toyonobu, AIC 127631). Its tatami grid is ideal, but the centre shows an embracing couple in a pleasure-house interior. Replaced by Toyoharu's Dutch perspective print.
- Hokusai Manga page with an exploded drawing of a flintlock pistol (Met 57833, page image 252). It is a perfect "technical drawing", but weapon imagery is wrong for this site.
- Stencil *Concentric Circles* (Met 70011): 552 px source.
- Yoshitoshi *Moon in the Flame* and *Moon and Smoke*: fire and dark grounds, against the light palette.
- Sōtatsu *Boats upon Waves*, the *Trees and Grasses by a Stream* pair, Hōitsu *Persimmon*, Koson *Cypresses*: weaker silhouettes at web size, or too similar to the chosen screens.
- Duplicate impressions of every chosen Tōkaidō station: faded, trimmed, or a later state.
