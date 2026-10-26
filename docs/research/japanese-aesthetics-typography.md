# Classical Japanese aesthetics × Illustrator frame × trilingual typography — design reference

Researched and written 2026-10-25 for the senior-engineer portfolio (ja / en / zh-Hans).
Scope: traditional colours and palettes (day and night), Adobe Illustrator UI vocabulary, classical arts mapped to engineering ideas, and a verified Google Fonts type system with CJK loading costs.

How the claims were checked:

- **Measured** means I ran it in this environment. That covers Google Fonts metadata, served CSS, woff2 slices and their OpenType features, WCAG contrast and ΔE2000 maths, and the Art Institute of Chicago (AIC) API.
- **Sourced** means it is cited inline and in the source list at the end.
- **Unverified** marks claims I could not confirm. They are labelled where they appear.

---

## 0. Art-direction verdict (the concept in one paragraph)

**「道中図案帖」 *Dōchū Zuan-chō*: an engineer's pattern book drawn in Illustrator and unrolled like an emaki.**

- **The frame.** The page is one Illustrator document. Rulers, guides, a Layers panel used as navigation, an Info panel showing live X/Y/W/H, and artboards that are the sections.
- **The content.** Inside the artboards, the work is classical Japanese built with modern geometry:
  - Kamon emblems are constructed from circles, as the crest painters do.
  - Kumiko lattices assemble the skills section.
  - A six-panel byōbu folds out the projects.
  - The career section follows Hiroshige's Tōkaidō, from 日本橋 to 京都 三条大橋.
- **Section changes.** Bands of 金雲 / 霞 sweep across, the same device byōbu and emaki use to divide scenes (文化遺産オンライン: 「金雲によって画面を分節しながら空間構成」).
- **Pacing.** The whole page follows 序破急 (jo-ha-kyū).

Why this choice:

- The Illustrator frame is not a costume. Kamon makers themselves now bridge compass-and-ruler craft and Illustrator: crest painter 波戸場承龍 developed a circles-only construction method, 紋曼荼羅, after seeing his son use Illustrator ([和樂web](https://intojapanwaraku.com/rock/culture-rock/2564/2/)).
- Illustrator even ships a "Japanese crop marks" (日本式トンボ) preference, and ukiyo-e blocks carry registration marks (見当 kentō). Print-production marks are therefore native to both worlds.
- Treat these as the anti-"AI look" vocabulary: crop marks, registration marks, guides, handles and seals instead of rounded cards and drop shadows.

---

## 1. Traditional colours 日本の伝統色

### 1.1 Sources and how far to trust them

| Code | Source | Status |
|---|---|---|
| **NC** | **NIPPON COLORS** ([nipponcolors.com](https://nipponcolors.com/)), 250 colours. Values were extracted from the `nippon_colors` Dart package, which mirrors the site. | **Validated** against the live site: 8 of 8 random spot checks matched. The homepage renders a random colour, and each served background hex was compared with the package value (退紅 #F8C3CD, 錆鉄御納戸 #405B55, 滅紫 #533D5B, 菖蒲 #6F3381, ときがら茶 #DB8E71, 樺茶 #B35C37, 梅幸茶 #89916B, 苗 #86C166). |
| **WD** | **和色大辞典** ([colordic.org/w](https://www.colordic.org/w)), 465 entries, scraped from the static HTML. | These are the widely copied web values. |

> **The two sources often disagree.** For example, 墨 NC #1C1C1C vs WD #595857; 紺 #0F2540 vs #223A70; 群青 #51A8DD vs #4C6CB3; 桜 #FEDFE1 vs #FEF4F4; 鳥の子 #DAC9A6 vs #FFF1CF. Traditional names describe dye recipes, not sRGB points.
> **Rule:** always carry the source tag with a hex in code comments (`/* 紺 NC */`) and never mix two sources for the same name.

### 1.2 Usable families (55 colours)

**Whites & papers 白・紙**

| 色名 | Reading | NC | WD |
|---|---|---|---|
| 白練 | しろねり | `#FCFAF2` (shironeri) | `#F3F3F2` |
| 胡粉 | ごふん | `#FFFFFB` (gofun) | `#FFFFFC` |
| 生成 | きなり | — | `#FBFAF5` |
| 鳥の子 | とりのこ | `#DAC9A6` (torinoko) | `#FFF1CF` |
| 卯の花 | うのはな | — | `#F7FCFE` |
| 月白 | げっぱく | — | `#EAF4FC` |
| 白磁 | はくじ | — | `#F8FBF8` |
| 藍白 | あいじろ | — | `#EBF6F7` |
| 白菫 | しろすみれ | — | `#EAEDF7` |

**Inks & greys 墨・鼠**

| 色名 | Reading | NC | WD |
|---|---|---|---|
| 墨 | すみ | `#1C1C1C` (sumi) | `#595857` |
| 薄墨 | うすずみ | — | `#A3A3A2` |
| 鈍 | にび | `#656765` (nibi) | `#727171` |
| 銀鼠 | ぎんねず | `#91989F` (ginnezumi) | `#AFAFB0` |
| 藍鼠 | あいねず | `#566C73` (ainezumi) | `#6C848D` |
| 藍墨茶 | あいすみちゃ | `#373C38` (aisumicha) | `#474A4D` |

**Indigos & blues 藍・青.** In the late Edo period indigo was said to have "四十八色" of named strengths, such as 甕覗・浅葱・露草・紺・褐色 ([マイナビ子育て, citing period usage](https://kosodate.mynavi.jp/articles/15994)).

| 色名 | Reading | NC | WD |
|---|---|---|---|
| 瓶覗 | かめのぞき | `#A5DEE4` (kamenozoki) | `#A2D7DD` |
| 白藍 | しらあい | — | `#C1E4E9` |
| 浅葱 | あさぎ | `#33A6B8` (asagi) | `#00A3AF` |
| 縹 | はなだ | `#006284` (hanada) | `#2792C3` |
| 藍 | あい | `#0D5661` (ai) | `#165E83` |
| 紺 | こん | `#0F2540` (kon) | `#223A70` |
| 群青 | ぐんじょう | `#51A8DD` (gunjyo) | `#4C6CB3` |
| 瑠璃 | るり | `#005CAF` (ruri) | `#1E50A2` |
| 瑠璃紺 | るりこん | `#0B346E` (rurikon) | `#19448E` |
| 白群 | びゃくぐん | `#78C2C4` (byakugun) | `#83CCD2` |

**Reds & pinks 朱・紅・桜**

| 色名 | Reading | NC | WD |
|---|---|---|---|
| 朱 | しゅ | — | `#EB6101` |
| 銀朱 | ぎんしゅ | `#C73E3A` (ginsyu) | `#C85554` |
| 紅 | くれない | `#CB1B45` (kurenai) | `#D7003A` |
| 臙脂/燕脂 | えんじ | `#9F353A` (enji) | `#B94047` |
| 桜 | さくら | `#FEDFE1` (sakura) | `#FEF4F4` |
| 鴇 | とき | `#EEA9A9` (toki) | `#F4B3C2` |
| 躑躅 | つつじ | `#E03C8A` (tsutsuji) | `#E95295` |
| 牡丹 | ぼたん | `#C1328E` (botan) | `#E7609E` |

**Golds & yellows 金・黄**

| 色名 | Reading | NC | WD |
|---|---|---|---|
| 金/黄金 | こんじき/こがね | — | `#E6B422` |
| 山吹 | やまぶき | `#FFB11B` (yamabuki) | `#F8B500` |
| 刈安 | かりやす | `#E9CD4C` (kariyasu) | `#F5E56B` |
| 鬱金 | うこん | `#EFBB24` (ukon) | `#FABF14` |
| 玉子 | たまご | `#F9BF45` (tamago) | — |

**Greens 緑**

| 色名 | Reading | NC | WD |
|---|---|---|---|
| 若竹 | わかたけ | `#5DAC81` (wakatake) | `#68BE8D` |
| 緑青 | ろくしょう | `#24936E` (rokusyoh) | `#47885E` |
| 青磁 | せいじ | `#69B0AC` (seiji) | `#7EBEA5` |
| 白緑 | びゃくろく | `#A8D8B9` (byakuroku) | `#D6E9CA` |
| 苔 | こけ | `#838A2D` (koke) | `#69821B` |
| 鶯 | うぐいす | `#6C6A2D` (uguisu) | `#928C36` |
| 萌黄 | もえぎ | `#7BA23F` (moegi) | `#AACF53` |
| 鉄 | てつ | `#26453D` (tetsu) | `#005243` |
| 御納戸 | おなんど | `#0C4842` (onando) | (WD 納戸色 `#008899` is a different colour) |

**Purples 紫**

| 色名 | Reading | NC | WD |
|---|---|---|---|
| 藤 | ふじ | `#8B81C3` (fuji) | `#BBBCDE` |
| 藤紫 | ふじむらさき | `#8A6BBE` (fujimurasaki) | `#A59ACA` |
| 菫 | すみれ | `#66327C` (sumire) | `#7058A3` |
| 江戸紫 | えどむらさき | `#77428D` (edomurasaki) | `#745399` |
| 二藍 | ふたあい | `#70649A` (futaai) | `#915C8B` |
| 紅掛花 | べにかけはな | `#4E4F97` (benikakehana) | — |
| 藤煤竹 | ふじすすたけ | `#574C57` (fujisusutake) | `#5A5359` |
| 紫紺 | しこん | `#3C2F41` (shikon) | `#460E44` |

Extra NC colours used below: 錆鉄御納戸 `#405B55`, 鉄御納戸 `#255359`, 水浅葱 `#66BAB7`, 鳩羽鼠 `#72636E`, 一斥染 `#F4A7B9`, 桃 `#F596AA`, 紅藤 `#B481BB`, 薄 `#B28FCE`, 紺青 `#113285`.
Extra WD colours used below: 紺青 `#192F60`, 桜鼠 `#E9DFE5`, 淡藤 `#BBC8E6`.

### 1.3 Three palette directions

All three are light-dominant. None uses warm cream as the base. Each has a night variant that stays luminous: the night artboard luminance is 0.045–0.079, against 0 for black.

They share one token structure modelled on Illustrator:

| Token | Role |
|---|---|
| `--pasteboard` | Canvas around the artboards |
| `--artboard` | The page surface |
| `--ink` | Body text |
| `--ink-2` | Secondary text |
| `--guide` | Ruler guides |
| `--guide-label` | Guide labels and measurements |
| `--select` | Bounding box, anchors and handles |
| `--seal` | 落款 stamp only |
| `--gilt` | 金雲 and highlight fills, never text |

#### A. 「藍摺 Aizuri」: indigo blueprint on gofun paper (**recommended**)

The concept joins three blues:

- 藍摺絵 (aizuri-e), the all-blue prints made possible by Prussian blue (ベロ藍). It was widely adopted by Hokusai and Hiroshige from c.1830 ([MFA CAMEO](https://cameo.mfa.org/wiki/Prussian_Blue:_Ukiyo-e_colorant); [Wikipedia: Aizuri-e](https://en.wikipedia.org/wiki/Aizuri-e)).
- The engineer's cyanotype blueprint.
- Illustrator's cyan guides.

Day:

| Token | Colour |
|---|---|
| `--pasteboard` | 白藍 WD `#C1E4E9` |
| `--artboard` | 卯の花 WD `#F7FCFE` |
| `--panel` | 藍白 WD `#EBF6F7` |
| `--ink` | 紺 NC `#0F2540` |
| `--ink-2` | 藍鼠 NC `#566C73` |
| `--link` | 縹 NC `#006284` |
| `--guide` | 浅葱 NC `#33A6B8` |
| `--guide-label` | 藍 NC `#0D5661` |
| `--select` | 躑躅 NC `#E03C8A` (use 牡丹 NC `#C1328E` when it is text) |
| `--seal` | 紅 NC `#CB1B45` |
| `--gilt` | 山吹 NC `#FFB11B` |

Night 「月夜」 (moonlit indigo):

| Token | Colour |
|---|---|
| `--pasteboard` | 紺青 WD `#192F60` |
| `--artboard` | 紺 WD `#223A70` |
| `--panel` | 瑠璃紺 WD `#19448E` |
| `--ink` | 月白 WD `#EAF4FC` |
| `--ink-2` | 瓶覗 NC `#A5DEE4` |
| `--guide` | 白群 NC `#78C2C4` |
| `--select` | 桃 NC `#F596AA` |
| `--seal` | 鴇 NC `#EEA9A9` |
| `--gilt` | 刈安 NC `#E9CD4C` |

#### B. 「青磁 Seiji」: celadon and verdigris

Porcelain, bronze patina (緑青) and kintsugi gold lines.

Day:

| Token | Colour |
|---|---|
| `--pasteboard` | 白緑 WD `#D6E9CA` |
| `--artboard` | 白磁 WD `#F8FBF8` |
| `--ink` | 鉄 NC `#26453D` |
| `--ink-2` | 錆鉄御納戸 NC `#405B55` |
| `--guide` | 緑青 NC `#24936E` |
| `--select` and `--seal` | 銀朱 NC `#C73E3A` |
| `--gilt` | 金 WD `#E6B422` |

Night 「苔庭の夜」 (moss garden at night):

| Token | Colour |
|---|---|
| `--pasteboard` | 御納戸 NC `#0C4842` |
| `--artboard` | 鉄御納戸 NC `#255359` |
| `--ink` | 白磁 WD `#F8FBF8` |
| `--ink-2` | 白緑 NC `#A8D8B9` |
| `--guide` | 水浅葱 NC `#66BAB7` |
| `--select` | 鴇 NC `#EEA9A9` (use 桜 NC `#FEDFE1` when it is text) |
| `--gilt` | 玉子 NC `#F9BF45` |

#### C. 「藤襲 Fuji-gasane」: layered wisteria

This direction plays on the Heian layering of robes, 襲 (kasane). Layered colour is a pun on Illustrator layers.

Day:

| Token | Colour |
|---|---|
| `--pasteboard` | 白菫 WD `#EAEDF7` |
| `--artboard` | 桜(色) WD `#FEF4F4` |
| `--ink` | 紫紺 NC `#3C2F41` |
| `--ink-2` | 鳩羽鼠 NC `#72636E` |
| `--guide` | 藤 NC `#8B81C3` |
| `--guide-label` | 二藍 NC `#70649A` |
| `--select` | 牡丹 NC `#C1328E` |
| `--seal` | 紅 NC `#CB1B45` |
| `--gilt` | 刈安 NC `#E9CD4C` |

Night 「夜桜」 (night cherry blossom):

| Token | Colour |
|---|---|
| `--pasteboard` | 紫紺 NC `#3C2F41` |
| `--artboard` | 藤煤竹 NC `#574C57` |
| `--ink` | 桜 WD `#FEF4F4` |
| `--ink-2` | 桜鼠 WD `#E9DFE5` |
| `--guide` | 淡藤 WD `#BBC8E6` |
| `--select` | 一斥染 NC `#F4A7B9` |
| `--gilt` | 刈安 NC `#E9CD4C` |

#### WCAG contrast (measured, WCAG 2.x relative luminance)

| Surface | Foreground | Ratio | WCAG |
|---|---|---|---|
| A day `#F7FCFE` | ink 紺 `#0F2540` | 14.95 | AAA |
| A day | ink-2 藍鼠 `#566C73` | 5.36 | AA |
| A day | link 縹 `#006284` | 6.59 | AA |
| A day | guide-label 藍 `#0D5661` | 8.06 | AAA |
| A day | guide line 浅葱 `#33A6B8` | 2.79 | decorative lines only |
| A day | select 躑躅 `#E03C8A` | 3.92 | UI / large text |
| A day | select-text 牡丹 `#C1328E` | 4.94 | AA |
| A day | seal 紅 `#CB1B45` | 5.37 | AA |
| A pasteboard 白藍 `#C1E4E9` | ink 紺 | 11.44 | AAA |
| A pasteboard 白藍 | ink-2 藍鼠 | 4.10 | large text only |
| A gilt 山吹 `#FFB11B` | ink 紺 | 8.50 | AAA |
| A night `#223A70` | ink 月白 `#EAF4FC` | 9.88 | AAA |
| A night | ink-2 瓶覗 `#A5DEE4` | 7.43 | AAA |
| A night | guide 白群 `#78C2C4` | 5.41 | AA |
| A night | select 桃 `#F596AA` | 5.15 | AA |
| A night | seal 鴇 `#EEA9A9` | 5.71 | AA |
| A night | gilt 刈安 `#E9CD4C` | 6.97 | AA |
| B day `#F8FBF8` | ink 鉄 `#26453D` | 10.07 | AAA |
| B day | ink-2 錆鉄御納戸 `#405B55` | 7.08 | AAA |
| B day | guide 緑青 `#24936E` | 3.68 | UI / large text |
| B day | select/seal 銀朱 `#C73E3A` | 4.82 | AA |
| B gilt 金 `#E6B422` | ink 鉄 | 5.46 | AA |
| B night `#255359` | ink 白磁 `#F8FBF8` | 8.19 | AAA |
| B night | ink-2 白緑 `#A8D8B9` | 5.36 | AA |
| B night | guide 水浅葱 `#66BAB7` | 3.77 | UI |
| B night | select 鴇 `#EEA9A9` | 4.42 | UI / large text |
| B night | select-text 桜 `#FEDFE1` | 6.85 | AA |
| B night | gilt 玉子 `#F9BF45` | 5.11 | AA |
| C day `#FEF4F4` | ink 紫紺 `#3C2F41` | 11.62 | AAA |
| C day | ink-2 鳩羽鼠 `#72636E` | 5.22 | AA |
| C day | guide 藤 `#8B81C3` | 3.23 | UI |
| C day | guide-label 二藍 `#70649A` | 4.89 | AA |
| C day | select 牡丹 `#C1328E` | 4.73 | AA |
| C day | seal 紅 `#CB1B45` | 5.15 | AA |
| C gilt 刈安 `#E9CD4C` | ink 紫紺 | 7.94 | AAA |
| C night `#574C57` | ink 桜 `#FEF4F4` | 7.55 | AAA |
| C night | ink-2 桜鼠 `#E9DFE5` | 6.27 | AA |
| C night | guide 淡藤 `#BBC8E6` | 4.86 | AA |
| C night | select 一斥染 `#F4A7B9` | 4.30 | UI / large text |
| C night | gilt 刈安 `#E9CD4C` | 5.16 | AA |

Rules that follow from the table:

- Gilt colours (山吹, 金, 刈安, 玉子) are fills behind ink, never text on paper (1.5–1.9:1).
- 浅葱 guides on the day artboard are decorative; any measurement label that sits on them uses 藍.

### 1.4 Seasonal accent: 二十四節気

Only the accent token changes with the season. The base palette never does. Compute the current 節気 client-side from the sun's ecliptic longitude: 立春 = 315°, then every 15°. A Meeus low-precision solar longitude is accurate to a day, which is enough. On publish day (2026-10-25) the current term is **霜降**.

| Japanese | zh-Hans | Approx. start | Accent suggestion |
|---|---|---|---|
| 立春 雨水 啓蟄 | 立春 雨水 **惊蛰** | Feb 4 / Feb 19 / Mar 5 | 鶯 NC `#6C6A2D`, 萌黄 NC `#7BA23F` |
| 春分 清明 穀雨 | 春分 清明 **谷雨** | Mar 20 / Apr 5 / Apr 20 | 一斥染 NC `#F4A7B9`, 桜 |
| 立夏 小満 芒種 | 立夏 **小满 芒种** | May 5 / May 21 / Jun 6 | 若竹 NC `#5DAC81` |
| 夏至 小暑 大暑 | 夏至 小暑 大暑 | Jun 21 / Jul 7 / Jul 23 | 瓶覗 / 浅葱 |
| 立秋 処暑 白露 | 立秋 **处暑** 白露 | Aug 7 / Aug 23 / Sep 8 | 桔梗 NC `#6A4C9C` |
| 秋分 寒露 霜降 | 秋分 寒露 霜降 | Sep 23 / Oct 8 / Oct 23 | 朽葉 NC `#E2943B` (accent only, never a base), 銀鼠 |
| 立冬 小雪 大雪 | 立冬 小雪 大雪 | Nov 7 / Nov 22 / Dec 7 | 銀鼠 NC `#91989F` |
| 冬至 小寒 大寒 | 冬至 小寒 大寒 | Dec 22 / Jan 5 / Jan 20 | 紅 NC `#CB1B45` (camellia) on 白練 |

The Chinese names differ in places: **惊蛰** where Japanese has 啓蟄, plus the simplified forms 谷雨, 小满, 芒种 and 处暑. Use the correct set per locale. China's "Twenty-Four Solar Terms" were inscribed on UNESCO's intangible heritage list in 2016.

### 1.5 Colour and border rules against the "AI look"

- **No rounded-lg plus shadow cards.** Use 0-radius artboards with hairline (1px) frames.
- **Selection** is shown with Illustrator's grammar: a bounding box with 8 square handles in `--select`, hollow handles for unselected and solid ones for selected.
- **Print-production marks** are the ornament: 日本式トンボ (double crop marks), 見当 (L-shaped *kagi-kentō* and straight *hikitsuke-kentō* registration marks from woodblock printing), and colour-bar swatch strips named in kanji.
- **The red seal (落款) appears once per artboard at most,** like a real colophon. It is never a button colour.
- **No glow, glass or gradients-as-decoration.** Gradients only where physics justifies them: 霞 mist bands, 墨流し ink, gold leaf 箔 sheen with a subtle 4–6% luminance noise.
- **Washi edges** come from a deckle SVG mask on images, not from `border-radius`.

---

## 2. Illustrator as a design language

### 2.1 Vocabulary and verifiable facts

| Element | Facts to reproduce | ja UI term | zh-CN UI term |
|---|---|---|---|
| Artboard | Default names are "Artboard 1…n". Artboards are ordered, and the index is real information. The canvas around them is the pasteboard. Artboard tool: Shift+O. | アートボード | 画板 |
| Rulers | Ctrl/Cmd+R. Since CS5 the origin is the artboard's top-left and y increases downward (unverified in Adobe docs here; common knowledge). Units follow the document profile: pt for print, px for web. | 定規 | 标尺 |
| Guides | Drag from the rulers. Ctrl/Cmd+; shows or hides guides, Ctrl/Cmd+5 makes guides from paths, Alt+Ctrl+; locks them ([Adobe Learn](https://www.adobe.com/learn/illustrator/web/rulers-and-guides-alignment); cheat sheets). **Default guide colour is Cyan, style Lines**, set in Preferences › Guides & Grid. All unselected guides share one colour; **a selected guide takes its layer's colour** ([Adobe Community](https://community.adobe.com/t5/illustrator-discussions/changing-guide-color/m-p/10248684)). | ガイド | 参考线 |
| Smart Guides | Ctrl/Cmd+U. Temporary snap guides with small labels (anchor, path, center, intersect) and spacing/alignment readouts ([Adobe Learn](https://www.adobe.com/learn/illustrator/web/rulers-and-guides-alignment)). The **default colour is Magenta** (widely observed, for example "magenta smart guide line" in [Adobe Community](https://community.adobe.com/t5/illustrator-discussions/unknown-magenta-smart-guide-line-disappear/m-p/15194450/highlight/true); Adobe helpx blocked automated fetches, so treat it as unverified by official docs). Construction guides default to 45°/90° angles. | スマートガイド | 智能参考线 |
| Selection bounding box | 8 hollow square handles (4 corners and 4 edge midpoints) plus a centre point. Show/hide with Ctrl+Shift+B. Selection colour is the layer colour. | バウンディングボックス | 定界框 |
| Anchor points / Bézier handles | A selected anchor is a solid square and an unselected one hollow. Direction handles end in small dots. Tools: Pen (P), Direct Selection (A), Selection (V). | アンカーポイント / ハンドル / ペンツール | 锚点 / 手柄 / 钢笔工具 |
| Layers panel | F7. Each layer has a colour swatch, eye (visibility), lock and target circle. New layers get colours from a fixed sequence (2.2). | レイヤー | 图层 |
| Outline / Preview | Ctrl/Cmd+Y toggles outline (wireframe) and preview. | アウトライン表示 | 轮廓 |
| Info panel | F8. Shows X, Y, W, H and the colour of the selection. | 情報パネル | 信息 |
| Crop marks | Preferences › General › "Use Japanese Crop Marks" (日本式トンボ). | トンボ | 裁切标记 |

**Feature idea that engineers will love.** **Ctrl/Cmd+Y** toggles the whole site into outline mode. Every three.js scene switches to wireframe or edges materials, CSS swaps to 1px outlines, and images become crossed boxes with their filenames. **Ctrl/Cmd+;** toggles the guides overlay.

### 2.2 Layer colour sequence, mapped to traditional colours

What the evidence supports:

- **Adobe:** colours are assigned "in sequence" from a hard-wired list of named system colours, with 27 entries plus "Other…" (Adobe Community answers; [helpx page](https://helpx.adobe.com/illustrator/desktop/manage-layers/create-and-organize-layers/add-layers-and-sublayers.html) quoted in search results, not fetchable here).
- **Adobe Sr Product Manager Varun Sharma, 18 Mar 2020:** "The color yellow has been removed altogether as a layer color, and has been replaced by Magenta color for Layer 5", from Illustrator **24.1.1 Win / 24.1 Mac** ([Illustrator UserVoice](https://illustrator.uservoice.com/forums/333657-illustrator-feature-requests/suggestions/31535431-custom-layer-colors-layer-5-yellow-is-killing-me)). Users still reported yellow in symbol-editing layers in 24.3 and 25.3.1.
- **RGB values** come from a 2022 community script that indexes the 27-colour cycle ([Adobe Community](https://community.adobe.com/t5/illustrator-discussions/script-to-create-layer-and-already-set-the-color/m-p/12849833)). They are unofficial but consistent with the names.

The "#" column is the auto-assign cycle from that script, post-24.1.1: Light Blue, Red, Green, Blue, **Magenta, Cyan**, Yellow, Gray, Black, Orange…

The classic Layer Options menu order, from memory and unverified, is Light Blue, Red, Green, Blue, Yellow, Magenta, Cyan, Gray, Black, Orange, Dark Green, Teal, Tan, Brown, Violet, Gold, Dark Blue, Pink, Lavender, Brick Red, Olive Green, Peach, Burgundy, Grass Green, Ochre, Purple, Light Gray.

The nearest colours are measured with **CIEDE2000** against all 250 NC and 465 WD colours. The "design pick" column is the semantic choice I recommend for the site.

| # | Illustrator name | RGB | Nearest NC (ΔE) | Nearest WD (ΔE) | Design pick |
|---|---|---|---|---|---|
| 1 | Light Blue | 78,127,255 | 紅碧 `#7B90D2` (8.8) | 薄群青 `#5383C3` (6.5) | **薄群青 WD**, base layer |
| 2 | Red | 255,78,78 | 鉛丹 `#D75455` (7.5) | 韓紅 `#E95464` (7.3) | **韓紅 WD**; keep 紅 NC for the seal |
| 3 | Green | 78,255,78 | 苗 `#86C166` (16.0) | 若緑 `#98D98E` (13.9) | **若竹 NC `#5DAC81`** (no close match; semantic pick) |
| 4 | Blue | 78,78,255 | 紅掛花 `#4E4F97` (14.3) | 紺桔梗 `#4D5AAF` (11.0) | **瑠璃 NC `#005CAF`** |
| 5 | Magenta | 255,78,255 | 紅藤 `#B481BB` (15.9) | 菖蒲色 `#CC7EB1` (15.6) | **躑躅 NC `#E03C8A`**, also the smart-guide colour |
| 6 | Cyan | 78,255,255 | 瓶覗 `#A5DEE4` (12.4) | 白群 `#83CCD2` (13.1) | **浅葱 NC `#33A6B8`**, also the guide colour |
| 7 | Yellow | 255,255,78 | 黄蘗 `#FBE251` (8.0) | 黄檗色 `#FEF263` (4.2) | **刈安 NC `#E9CD4C`** |
| 8 | Gray | 127,127,127 | 灰 `#828282` (1.1) | 灰色 `#7D7D7D` (0.8) | **鈍 NC `#656765`** |
| 9 | Black | 0,0,0 | 黒 `#080808` (1.3) | 暗黒色 `#16160E` (6.2) | **墨 NC `#1C1C1C`** |
| 10 | Orange | 255,102,0 | 黄丹 `#F05E1C` (4.6) | 人参色 `#EC6800` (3.7) | **黄丹 NC** |
| 11 | Dark Green | 0,85,0 | 松葉 `#42602D` (9.2) | 深緑 `#00552E` (8.9) | **松葉 NC** |
| 12 | Teal | 0,153,153 | 青碧 `#268785` (6.3) | 浅葱色 `#00A3AF` (5.7) | **青碧 NC** |
| 13 | Tan | 204,153,102 | 赤白橡 `#E1A679` (5.4) | 伽羅色 `#D8A373` (3.3) | **伽羅 WD** |
| 14 | Brown | 153,51,0 | 弁柄 `#9A5034` (8.7) | 褐色 `#8A3B00` (4.8) | **弁柄 NC** |
| 15 | Violet | 153,51,255 | 藤紫 `#8A6BBE` (14.1) | 菫色 `#7058A3` (15.2) | **藤紫 NC** |
| 16 | Gold | 255,153,0 | 紅鬱金 `#E98B2A` (6.1) | 金茶 `#F39800` (2.5) | **金茶 WD** |
| 17 | Dark Blue | 0,0,136 | 紺桔梗 `#211E55` (11.6) | 鉄紺 `#17184B` (12.3) | **紺青 NC `#113285`** |
| 18 | Pink | 255,153,204 | 一斥染 `#F4A7B9` (8.2) | 薄紅梅 `#E597B2` (6.5) | **薄紅梅 WD** |
| 19 | Lavender | 153,153,255 | 紅碧 `#7B90D2` (7.7) | 青藤色 `#84A2D4` (7.8) | **紅碧 NC** |
| 20 | Brick Red | 153,0,0 | 紅鳶 `#994639` (11.4) | 弁柄色 `#8F2E14` (5.3) | **紅鳶 NC** |
| 21 | Olive Green | 102,102,0 | 鶯 `#6C6A2D` (5.4) | 璃寛茶 `#6A5D21` (6.9) | **鶯 NC** |
| 22 | Peach | 255,153,153 | 鴇 `#EEA9A9` (5.8) | 薄紅 `#F0908D` (3.3) | **鴇 NC** |
| 23 | Burgundy | 153,0,51 | 蘇芳 `#8E354A` (7.3) | 濃紅 `#A22041` (3.8) | **蘇芳 NC** |
| 24 | Grass Green | 153,204,0 | 鶸萌黄 `#90B44B` (8.9) | 萌黄 `#AACF53` (5.2) | **萌黄 WD** |
| 25 | Ochre | 153,102,0 | 狐 `#9B6E23` (3.6) | 桑茶 `#956F29` (4.9) | **狐 NC** |
| 26 | Purple | 102,0,102 | 紫 `#592C63` (7.4) | 桑の実色 `#55295B` (7.7) | **紫 NC** |
| 27 | Light Gray | 187,187,187 | 白鼠 `#BDC0BA` (4.0) | 銀鼠 `#AFAFB0` (3.3) | **白鼠 NC** |

How to use it:

- The Layers-panel navigation lists sections as layers. Each layer's swatch is its design pick, in the order above, so the first section is 薄群青, the second 韓紅, and so on.
- When a section is active, its artboard's bounding box and handles take that layer colour, exactly as Illustrator does. That gives every section its own colour without inventing any.

---

## 3. Classical arts mapped to engineering concepts (facts and how to use them)

### 3.1 家紋 kamon: compass-and-ruler construction

- **Tools.** 紋章上絵師 (crest painters, a Kyoto dyeing craft) paint crests onto kimono fabric with fine brushes and **ぶんまわし**, a bamboo compass ([京都 紋章上絵 explanation via 和樂web](https://intojapanwaraku.com/rock/culture-rock/2564/2/); [江東区 craft record](https://www.city.koto.lg.jp/103020/bunkasports/bunka/bunkazaisiseki/kogegijutsu/88493.html)). The back crest sits over a seam, so left-right balance must be exact (江東区).
- **Circles only.** 波戸場承龍 devised a method of drawing every line from combinations of perfect circles and named the overlapping construction **紋曼荼羅**. His son 耀次 works in Illustrator, and the father struggled at first with Bézier curves ([和樂web interview](https://intojapanwaraku.com/rock/culture-rock/2564/2/)).
- **Engineering mapping.** Kamon are a parametric system: a crest is constructed, never drawn freehand. The term 割り出し for the circle-division layout step was not confirmed in sources, so use it cautiously.
  - **Use:** each section's emblem animates its construction. Circles appear as cyan guides, intersections snap with magenta smart-guide labels ("intersect"), then the final outline fills in 墨 or 紺. This works as an SVG `stroke-dashoffset` sequence and runs within the site's chosen palette.
  - Typical symmetries are 5-fold (桜, 梅), 6-fold (麻の葉, 亀甲) and 8-fold (矢車).

### 3.2 組子 kumiko: lattice geometry (exact)

**三組手 (mitsu-kude).** Three thin strips are joined precisely into an equilateral triangle. This is the base of the triangular 地組 (jigumi), from which regular polygons can be built ([島根県 伝統工芸](https://www.pref.shimane.lg.jp/industry/syoko/sangyo/dentou_kougei/kougei/kougei_30.html)). Square jigumi use half-lap grids ([茨城県工業技術センター report](https://www.itic.pref.ibaraki.jp/publication/doc/research/s60/N14P09.pdf)).

**麻の葉 asanoha** (triangular jigumi, side *s*):

- In each equilateral triangle, three 葉 pieces run from the vertices to the centroid. The vertex-to-centroid length is *s*/√3, and each leaf leaves its corner at **30°** to the triangle edge.
- Around every lattice vertex, six leaf rhombi form a star.
- Each rhombus has its vertices at that lattice vertex, the neighbouring lattice vertex, and the two flanking centroids. Its side is *s*/√3, its angles are **60°/120°**, and its long diagonal is the triangle edge *s*.

**角麻の葉 kaku-asanoha** (square jigumi). Commercial jigs for it supply **45°, 22.5° and 67.5°** cuts ([WigWood jigs](https://www.japanesetools.com.au/collections/paper-print/products/asa-no-ha-kumiko-jigs-by-wigwood)). That is consistent with this construction: a square plus both diagonals gives four right-isosceles triangles, and in each one the lines run from its corners to its incentre. Bisecting the 45° corners gives the 22.5° cuts. This is derived geometry; check it against a reference before modelling.

**七宝 shippō.** Equal circles of radius *r* centred on lattice points (*i·r*, *j·r*) where *i*+*j* is even.

- Each circle passes through its four neighbours' tangent points (±*r*, 0) and (0, ±*r*).
- The overlaps form 4 lens petals per circle around a concave four-pointed star.
- Meaning: 円満, 調和, ご縁がつながる.

**青海波 seigaiha.**

- Three (or four) concentric arcs per fan (三重の半円).
- Horizontal pitch 2*R*, row pitch *R*/2, alternate rows shifted by *R*. Paint top to bottom so each lower row overpaints the one above; each fan stays visible down to its own centre.
- Meaning: lasting peace and good fortune.

**胡麻 goma, 桜 sakura (kumiko).** I could not verify their exact construction from sources. Model them only from a kumiko reference (Desmond King's *Shoji and Kumiko Design*, or a maker's drawings).

**Mapping.** Kumiko are joinery without nails: a strict grid, interlocking parts, and tolerance in fractions of a millimetre. They stand for system architecture and dependency graphs.

- **Use:** the skills section is a three.js `InstancedMesh` lattice. Strips fly in and lock into a 三組手 jigumi, then 葉 pieces slot in to form asanoha. One draw call, 30–60k instances, pieces animated in the vertex shader from a per-instance delay attribute.

### 3.3 屏風 byōbu: folding screens

- **Panels.** Each panel is a 扇 (*sen*). They are counted from the viewer's right: 第一扇, 第二扇… A screen is counted with 隻; two screens form 一双 ([Wikipedia ja 屏風](https://ja.wikipedia.org/wiki/屏風); [nippon.com](https://www.nippon.com/en/japan-data/h01096/)).
- **History.** Six panels per screen was common in the Nara–Heian periods. **六曲一双** (a pair of six-panel screens) became the standard format by the early 14th century.
- **Hinges.** Paper hinges, devised in the Kamakura period, let screens fold in both directions. This is the zig-zag fold to animate.
- **Gold.** Muromachi-period screens added gold leaf, cut gold, gold dust and gold paint (金屏風).
- **Reading.** Read right to left. For 風神雷神図屏風 you look at the right screen, then the left. Today "右隻" means the screen on the viewer's right.
- **Proportions** (measured example). 楼閣山水図屏風, right screen, is 372.0 × 170.8 cm, so each panel is about **62 × 171 cm (≈1 : 2.75)** ([江戸東京博物館](https://www.edohakuarchives.jp/detail-175573.html)). There is no fixed standard size.
- **Use:** the projects section is a six-fold 3D screen. Six panels hold six projects, read right to left. Scroll unfolds it (hinge angle from ±85° to 0°), gold leaf is a clearcoat/metalness material with a 箔 tile normal map, and 金雲 bands separate the scenes.

### 3.4 絵巻物 emakimono: handscrolls

- **Viewing.** The scroll lies on a table. The left hand unrolls new scenes while the right rolls up what has been seen, so reading runs right to left.
- **Size.** Usually about 30 cm high and about 10 m long; some approach 20 m.
- **Text and pictures.** The most common format alternates 詞 (text) then 絵 (picture).
  - **段落式** (sectional): each view is about **50–60 cm** wide, with text and picture alternating. The 源氏物語絵巻 is the classic example.
  - **連続式** (continuous): long picture runs follow a text passage.
- **Pictorial devices.**
  - **異時同図法**: the same figure appears repeatedly to show time passing. The nun appears six times in 信貴山縁起's Tōdai-ji scene.
  - **吹抜屋台**: roofs are removed to show interiors (源氏物語絵巻).
- **Famous examples:** 伴大納言絵詞, 信貴山縁起, and 鳥獣人物戯画, which has pictures only. All facts here are from [Wikipedia ja 絵巻物](https://ja.wikipedia.org/wiki/絵巻物).
- **Use:**
  - The career section can scroll horizontally right-to-left in ja and zh, with a CSS `direction` toggle. English may keep left-to-right.
  - Alternate 詞書 (vertical text column) and 絵 (image) blocks, 段落式.
  - 異時同図法 suits a "same engineer, different years" sequence, with the figure repeated along the path.
  - 吹抜屋台 is literally an exploded / cut-away architecture view: show system architecture this way.

### 3.5 墨流し suminagashi

- **Method.** Ink is dropped on still water, then blown on or touched with a bamboo tip carrying a little oil (or pine resin). Surface tension spreads the ink into rings, and washi laid on top lifts the pattern ([コトバンク: ニッポニカ / マイペディア](https://kotobank.jp/word/墨流し)).
- **History.** Practised since the Heian period; many examples survive in the papers of the 西本願寺本『三十六人家集』, copied in the early 12th century.
- **Echizen.** A legend says it was spread to 越前 in 1151 by 広場治左衛門. The technique survives in 越前市今立.
- **Use:** a GPU fluid hero. Alternating ink and dispersant drops create concentric rings that the cursor "blows" on. Run an advection-only stable-fluids solver at ¼ resolution and composite in 紺 or 墨 on paper. Drops can spell the name and then dissolve.

### 3.6 枯山水 karesansui: raked sand 砂紋

Seven common raking patterns ([NAJGA](https://najga.org/7-common-raking-patterns-in-japanese-dry-landscape-gardens/)):

| Pattern | Shape |
|---|---|
| 荒波紋 | Rough, stormy semicircular ridges |
| 市松紋 | Checkerboard squares, direction alternating like a weave |
| 水紋 | Concentric ripples from a point |
| 流水 | Stream flow |
| 漣紋 | Continuous small ripples over a large area |
| 青海波紋 | Interlocking semicircles |
| 立波紋 | Large sharp zig-zag waves |

The patterns are re-raked every few weeks; the re-raking is part of monastic practice. Karesansui developed in Zen temples of the Kamakura and Muromachi periods.

**Use:** the about/philosophy section is a displacement-mapped sand plane. Its height field is generated in a shader per pattern: concentric rings around "stones", the project or value markers. The cursor re-rakes the sand and the pattern relaxes back. This is the 間 section.

### 3.7 東海道五十三次 (Hiroshige, Hōeidō edition)

- **The series.** 55 large prints: 53 post stations plus the start at 日本橋 and the end at 京師 三条大橋, c.1833–34 ([MOA Museum](https://www.moaart.or.jp/en/?p=18984); [Wikipedia](https://en.wikipedia.org/wiki/The_Fifty-three_Stations_of_the_T%C5%8Dkaid%C5%8D)).
- **AIC holdings.** The Art Institute of Chicago holds nearly the whole Hōeidō set as public domain (CC0). This was queried live; image URL pattern: `https://www.artic.edu/iiif/2/{image_id}/full/843,/0/default.jpg`.
- **Watch out:** AIC also holds Hokusai's c.1806 Tōkaidō series and Hiroshige's later editions (1837–42, 1847–52). Filter for "c. 1833/34".

Suggested 8-year path (序破急):

| Year | Station (print) | AIC id | image_id |
|---|---|---|---|
| 壱 departure | 日本橋 朝之景 *Nihonbashi, asa no kei* | 25544 | `7438de25-4b03-56a0-a1d5-25e67fd0aea1` |
| 弐 first light | 品川 日之出 *Shinagawa, hinode* | 25551 | `2db60821-57ee-1960-1f16-8a201d918d09` |
| 参 the pass | 箱根 湖水図 *Hakone, kosui no zu* | 25585 | `c832e38b-666d-8d97-ca14-185035dd04c1` |
| 肆 clear view | 原 朝之富士 *Hara, asa no Fuji* | 13219 | `beeebdf4-31f0-0163-36f2-930ca37393fd` |
| 伍 quiet mastery | 蒲原 夜之雪 *Kanbara, yoru no yuki* | 25613 | `c287562e-816e-096c-022a-b05199ba4b8f` |
| 陸 the storm (incident) | 庄野 白雨 *Shōno hakuu* | 130691 | `59aaddd6-cb2d-25b6-b0f6-e95042fce0a5` |
| 漆 clearing | 亀山 雪晴 *Kameyama, yukibare* | 25762 | `a443ab43-25b8-e260-1b36-c5df3b221760` |
| 捌 arrival | 京師 三条大橋 *Keishi, Sanjō ōhashi* | 25789 | `2f21e6b9-2530-b8bc-fe3f-a9daac6645a9` |

Alternates: 三島 朝霧 (25588), 沼津 黄昏 (25594), 土山 春之雨 (25772), 岡崎 矢矧之橋 (25732), 四日市 三重川 (25755).

Here the 大字 numbering is real information, since these are the year indices.

### 3.8 落款 and 印章: seals

- 落款 abbreviates 落成款識, the artist's signature and seal. Seals are cut mostly in **篆書 (seal script)**.
- **朱文** (relief) prints red characters on white; **白文** (intaglio) prints white characters on red.
- Placement: the name seal (姓名印) and art-name seal (雅号印) go after the signature. A **関防印** goes at the top right of a calligraphy work, at the start of the reading. **遊印** are free-form decorative seals. Seal paste is 印泥 / 朱肉.
- This is general art-historical knowledge; no single source was fetched.
- **Use:** one 朱文 seal per artboard as the colophon, carrying the section name in seal script. Draw it as an SVG with an ink-texture mask and a slight rotation of 1–3°. 白文 is reserved for the final contact "signature". Generate seal-script glyphs as outlines rather than loading a font.

### 3.9 文様 patterns and their meanings

Meanings are folk interpretations and vary by source ([FUN! JAPAN](https://fun-japan.jp/jp/articles/14279); [和樂web 市松](https://intojapanwaraku.com/rock/art-rock/130880/); [wargo](https://wargo.jp/en/blogs/hiyori-column/ichimatsu)).

| 文様 | Geometry | Meaning | Section fit |
|---|---|---|---|
| 青海波 | 3-ring fans, pitch 2R × R/2 | Peace and fortune that last | Footer / continuity |
| 麻の葉 | Triangular lattice plus centroid leaves | Children's growth, protection; hemp grows straight and fast | Growth / mentoring |
| 市松 | Two-colour checkerboard; Heian 霰 / 石畳, popularised by kabuki actor **初代佐野川市松 (1722–1762)** | Endless prosperity | Data grids, test matrices |
| 矢絣 | Arrow-fletching chevrons, alternating columns | An arrow never returns (bridal) | Shipping / deploy |
| 鱗 | Alternating triangles | Protection against misfortune (warrior dress) | Security work |
| 亀甲 | Hexagon tessellation | Longevity, stability | Reliability / SRE |
| 七宝 | Overlapping equal circles | Harmony, connection | Collaboration / APIs |

### 3.10 間 ma, 余白 yohaku and 序破急: scroll choreography

**序破急** starts in gagaku, where jo is slow with no fixed beat, ha is measured, and kyū is fast. Zeami applied it to whole Noh plays and day programmes; *Sandō* describes a five-part play ([Wikipedia](https://en.wikipedia.org/wiki/Jo-ha-ky%C5%AB)).

Use it at three scales:

1. **Page.**
   - 序 = hero and about: few elements, long scroll distance per change, generous 余白.
   - 破 = skills, career, projects: density rises, motion builds.
   - 急 = achievements and contact: short, decisive, then stillness.
2. **Section.** Each artboard enters slowly, develops, and resolves quickly, then holds a 間: a pinned pause of 15–25 vh with only one small thing happening, such as the seal stamping.
3. **Easing.** A jo-ha-kyū curve as CSS `linear()` (supported in current Chrome, Firefox and Safari):
   `--ease-johakyu: linear(0, 0.03 15%, 0.10 35%, 0.35 60%, 0.60 80%, 0.85 93%, 1);`
   Mirror it into GSAP with `CustomEase`.

**余白** is content, not leftover space. On an artboard, at least 38% of the area should carry no ink. Let a single vertical line of text own a whole panel.

### 3.11 Numerals without template circles

- **Japanese 大字.** In law only **壱・弐・参・拾** are prescribed: 戸籍法施行規則 第31条 and 商業登記規則 第48条 ([bestcalendar.jp summary](https://bestcalendar.jp/tools/kansuji-henkan); [Wiktionary 壱](https://fr.wiktionary.org/wiki/%E5%A3%B1)). The full older set is 壱 弐 参 肆 伍 陸 漆 捌 玖 拾.
- **Chinese 大写数字** (cheques, finance): **壹 贰 叁 肆 伍 陆 柒 捌 玖 拾**. Use 柒, not 漆, and 陆, not 陸 ([汉典 大寫](https://www.zdic.net/hans/大寫)).
- **Ordinary kansuji:** 一二三四五六七八九十, with 〇 for zero in years.

Rules:

- Use numerals only where the order or count is real: years 壱–捌, Tōkaidō station numbers, metrics.
- Set them vertically with `text-combine-upright: all` for two-digit Arabic numbers (縦中横), or as large 大字 in a display face.
- **Never put them inside circles or badges.** Pair them with a guide line and an Info-panel style readout (`Y 1,280 px`) instead.
- ja uses the 大字 set, zh uses 大写; English uses lining figures from the mono face.

### 3.12 二十四節気

See 1.4. Use them as small time stamps in each artboard's header, for example "霜降 · 2026-10-25" (the real current term), and to drive the accent token.

---

## 4. Typography

### 4.1 Verified Google Fonts families

Source: `fonts.google.com/metadata/fonts`, fetched 2026-10-25, plus the served `css2` and woff2 files.

How to read the "Features" column:

- Features were read from the served punctuation slice (the one containing 「) with fontkit.
- **palt / halt / chws** decide whether `font-feature-settings:"palt"` and CSS `text-spacing-trim` can work. MDN: *"fonts must have the OpenType `halt`… `chws`… If the font doesn't have either feature, `text-spacing-trim` is disabled"* ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/text-spacing-trim)).
- **vert / vmtx** decide whether vertical writing gets rotated punctuation and correct vertical metrics.

**Japanese: Mincho / serif**

| Family | Weights | Variable | Features (punct slice) | Slices / weight | Notes |
|---|---|---|---|---|---|
| Shippori Mincho B1 | 400–800 (5) | no | vert, vrt2, vpal; **no palt** | 122 | Strong ink traps, best display Mincho. Heavy: 15 MB family. |
| Shippori Mincho | 400–800 | no | same as B1 | 122 | Lighter version of B1 |
| Zen Old Mincho | 400, 500, 600, 700, 900 | no | vert, kern; no palt | 122 | Old-style kana, also covers Greek and Cyrillic |
| Noto Serif JP | 200–900 | **wght 200–900** | **palt, halt, chws, vpal, vchw**, vert | 124 (variable) | The only Mincho here with full spacing features |
| Kaisei Tokumin / Decol / Opti / HarunoUmi | 400, 500, 700 (Tokumin also 800) | no | vert; no palt | 123 | Decol is decorative; Tokumin is bold display |
| BIZ UDPMincho | 400, 700 | no | vert; no palt (proportional kana built in) | 124 | Morisawa UD, very legible |
| Hina Mincho | 400 | no | vert, kern | 123 | Delicate, small-size charm |

**Japanese: Gothic / sans**

| Family | Weights | Variable | Features | Notes |
|---|---|---|---|---|
| **IBM Plex Sans JP** | 100–700 (7) | no | **palt, halt, vpal**, vert | Pairs with IBM Plex Sans and Mono. Engineering heritage. |
| Zen Kaku Gothic New | 300, 400, 500, 700, 900 | no | vert, kern; no palt | Clean and slightly humanist. Cheapest per slice. |
| Noto Sans JP | 100–900 | wght | palt, halt, vpal, vert | Safe and heavy |
| M PLUS 1 / M PLUS 2 | 100–900 | wght | vert, kern; no palt | Variable and geometric |
| Murecho | 100–900 | wght | vert, kern | Variable; distinctive sharp terminals |
| BIZ UDPGothic | 400, 700 | no | vert | UD |
| LINE Seed JP | 100, 400, 700, 800 | no | halt, vpal, vert | Added 2026-01-21 |

**Japanese: brush / handwriting**

| Family | Weights | Features | Notes |
|---|---|---|---|
| Yuji Syuku / Boku / Mai | 400 | vert; no palt; very large outlines (~8.5 MB family) | Brush 楷書 / 行書. Use only via `text=` subsets. |
| Klee One | 400, 600 | **palt, halt, vpal**, vert, cjct | Textbook 楷書 pen. Ideal for the "letter" contact section. |
| Zen Kurenaido | 400 | vert | Felt-pen |
| Shippori Antique (B1) | 400 | vert, vpal | Antique-gothic hybrid |
| Kiwi Maru | 300, 400, 500 | vert | Soft rounded Mincho |
| Yuji Hentaigana Akari / Akebono | 400 | — | Hentaigana: decorative only |

**Japanese: display / experimental**

| Family | Weight | Features | Character |
|---|---|---|---|
| Dela Gothic One | 400 | vert (no palt) | Ultra-heavy poster gothic |
| DotGothic16 | 400 | halt, vert | 16-dot bitmap: terminals, HUD |
| Reggae One, RocknRoll One, Rampart One, Stick, Train One | 400 | **palt, halt, vpal**, vert (Fontworks) | Rampart is 3D-extruded outline; Train One is an inline outline |
| Potta One, Mochiy Pop (P) One | 400 | vert | Pop: probably off-brand |
| Zen Antique / Zen Antique Soft | 400 | vert, kern | Meiji letterpress Mincho: station signage |
| New Tegomin | 400 | vert | Taishō-era hand-set feel |

**Simplified Chinese** (subset `chinese-simplified`, ≈92–101 slices per weight)

| Family | Weights | Variable | Features | Notes |
|---|---|---|---|---|
| Noto Serif SC | 200–900 | wght | palt, halt, chws, vpal, vert | Song/Ming display and text |
| Noto Sans SC | 100–900 | wght | palt, halt, vpal, vert | Body |
| Ma Shan Zheng | 400 | no | **no vert, no vmtx** | Brush 楷书. Horizontal only. |
| Zhi Mang Xing | 400 | no | (no GSUB/GPOS) | 行书 handwriting |
| Long Cang | 400 | no | (no GSUB/GPOS) | Casual handwriting |
| Liu Jian Mao Cao | 400 | no | — | 草书 cursive: single big characters only |
| ZCOOL XiaoWei | 400 | no | no vert, no vmtx | Song-flavoured display |
| ZCOOL QingKe HuangYou | 400 | no | no vert, no vmtx | Condensed geometric |
| ZCOOL KuaiLe | 400 | no | — | Playful (avoid) |
| WDXL Lubrifont SC | 400 | no | — | New 2025 sans display |

**LXGW WenKai** is on Google Fonts only as **LXGW WenKai TC** and **LXGW WenKai Mono TC** (300, 400, 700; subset `chinese-traditional`). They do contain simplified characters (tested: 们经验发这软师项联 all present), but the glyphs follow Traditional / Taiwan forms. Their unicode-range slicing is tuned for Traditional text, so a simplified paragraph costs **1.8 MB across 31 slices** (measured). Use them only via `text=` for short quotes, never for zh-Hans body text.

**Latin**

| Family | Weights / axes | Role and verdict |
|---|---|---|
| **Bodoni Moda** | opsz 6–96, wght 400–900, italics | Display serif. Its hairline contrast echoes Mincho brush contrast. Rarely seen in AI templates. |
| Newsreader | opsz 6–72, wght 200–800, italics | Text serif for essays and quotes |
| Gloock | 400 | Poster serif with sharp wedges; for numerals |
| Fraunces, Instrument Serif | — | **Avoid.** Google Fonts popularity ranks #42 and #28; now a staple of AI-generated landing pages. |
| **IBM Plex Sans** | wdth 75–100, wght 100–700 | UI and body. One superfamily with Plex Sans JP and Plex Mono. |
| Schibsted Grotesk / Familjen Grotesk / Hanken Grotesk | wght | Alternatives for UI |
| Bricolage Grotesque | opsz 12–96, wdth 75–100, wght 200–800 | Expressive headlines; animates wdth |
| Big Shoulders (formerly *Big Shoulders Display*) | opsz 10–72, wght 100–900 | Condensed numerals: years, station numbers |
| Anybody | wdth 50–150, wght 100–900 | Extreme width animation |
| **Martian Mono** | wdth 75–112.5, wght 100–800 | The Illustrator chrome: rulers, Info panel, coordinates. Animate wdth on scroll velocity. |
| IBM Plex Mono / JetBrains Mono | static / wght 100–800 | Code blocks (JetBrains for ligatures) |
| Handjet | ELSH 0–16, ELGR 1–2, wght 100–900 | Modular "pixel element" font: the element-shape axis morphs dots into shapes. Engineer bait for counters. |
| Doto | ROND 0–100, wght | Dot-matrix with roundness axis |
| Fragment Mono, DM Mono, Red Hat Mono, Geist Mono | — | Not chosen |
| Inter, Space Grotesk | — | Banned by the brief |
| Commit Mono | — | **Not on Google Fonts.** Self-host from its own release if wanted. |

All Google Fonts families are under open licences (OFL / Apache), so self-hosting is allowed; ship the licence files.

### 4.2 CJK loading behaviour (measured)

**How slicing works.** Google Fonts serves CJK as **~92–124 `@font-face` blocks per weight**, each limited by `unicode-range`. Static families double the count when two weights are requested: Shippori Mincho B1 with 400 and 800 gives 244 blocks. The browser downloads only the slices whose ranges match characters actually rendered.

**Measured cost for one realistic paragraph.**

- Japanese: 132 unique characters, a typical "about" paragraph. It needed **28 slices** in every family.
- Chinese: 121 unique characters. It needed **11 slices** for Noto SC.

| Request | Bytes |
|---|---|
| IBM Plex Sans JP 400 | **256 KB** |
| Zen Kaku Gothic New 400 | **256 KB** |
| Noto Sans JP 400 (static request) | 331 KB |
| Noto Sans JP 100–900 (variable request) | 601 KB |
| Shippori Mincho B1 400 | 494 KB |
| Noto Serif JP 200–900 | 805 KB |
| Noto Sans SC 400 | **343 KB** |
| Noto Sans SC variable | 642 KB |
| Noto Serif SC 300 | 438 KB |
| LXGW WenKai TC 400 | 1,803 KB |

The whole site's text will touch more slices. Budget about **0.6–1.0 MB of CJK body font per language** at one weight and about 1.5× for two weights.

**`text=` subsetting is the key trick for display faces.** `css2?family=X&text=<exact string>` returns one tiny woff2 containing only those glyphs. Measured:

| Face and string | Size |
|---|---|
| Shippori Mincho B1 800, "八年の道程、序破急。" | 3.7 KB |
| Zen Antique, 18 station names | 5.2 KB |
| Yuji Syuku, 9 characters | 5.8 KB |
| Dela Gothic One, 7 characters | 1.5 KB |
| DotGothic16, 12 characters | 1.7 KB |
| Ma Shan Zheng, 9 characters | 4.6 KB |
| Zhi Mang Xing, 7 characters | 2.6 KB |

`text=` subsets **keep vert, vrt2, palt and vpal** (verified on Shippori, Noto Serif JP and IBM Plex Sans JP). So the site can use a dozen display faces per language for under 50 KB in total.

**Recommended pipeline:**

1. **Body faces.** Self-host Google's sliced CSS and woff2 (or `@fontsource`, which mirrors the slices) for 1–2 static weights per language, with `font-display: swap`. Load only the active language's body face: `<link>` injected on language switch, plus `document.fonts.load()` before revealing.
2. **Display faces, at build time.** Collect every display string per language from the i18n JSON. Fetch `css2?family=…&text=…` with a modern Chrome UA, save the woff2 to `/fonts/display/{lang}/{face}.woff2`, and emit `@font-face` rules. Rebuild when the copy changes.
3. **No metric-compatible fallback exists for CJK.** For animated display text (SplitText reveals), `await document.fonts.load('800 1em "Shippori Mincho B1"', '八年')` before measuring or splitting, so the animation never runs on the fallback face.
4. **Preload** only the hero `text=` subsets: they are a few KB, so `<link rel=preload as=font crossorigin>` is cheap.

### 4.3 Cross-language glyph coverage (measured; critical)

Japanese display fonts **cannot render Simplified Chinese**. Tested on 壹贰叁肆伍陆柒捌玖拾 and 惊蛰 处暑 谷雨 小满 芒种:

- Zen Old Mincho, Zen Antique, Yuji Syuku, Klee One, Dela Gothic One, DotGothic16, Kaisei Decol and Hina Mincho all miss 贰叁陆柒惊蛰处满种.
- Shippori Mincho B1 misses 贰陆蛰处满.

Chinese display fonts **cannot render Japanese-specific kanji**. Ma Shan Zheng, Zhi Mang Xing, ZCOOL XiaoWei and Long Cang miss 壱弐陸啓蟄処穀鶯覗躑臙.

Noto Serif SC and LXGW WenKai TC cover both test sets.

Consequences:

- Font stacks must be strictly per language (`:lang(ja)`, `:lang(zh-Hans)`).
- Japanese colour names shown in the zh UI (for example 瓶覗) should be wrapped as `<span lang="ja">` and set in a face that covers them. Noto Serif SC covers everything tested.
- Always set the `lang` attribute: it selects Noto CJK's `locl` regional glyph forms, the punctuation position (CLREQ: mainland punctuation sits bottom-left horizontally and top-right vertically; Taiwan and Hong Kong centre it) and line-breaking rules.

### 4.4 Recommended type system

The base system holds the site together: one body family and one chrome family per language. Each section then adds its own display voice.

| Role | ja | en | zh-Hans |
|---|---|---|---|
| Body | **IBM Plex Sans JP 400/500** (palt-capable, so `text-spacing-trim` works) | **IBM Plex Sans** 400/500 (wdth 85–100) | **Noto Sans SC 400/500** |
| Long-form serif | Noto Serif JP 300/400 (has palt) or Zen Old Mincho 400 | Newsreader | Noto Serif SC 300/400 |
| Chrome / HUD (rulers, Info panel, labels) | Martian Mono, with IBM Plex Sans JP for kanji labels | Martian Mono | Martian Mono, with Noto Sans SC labels |
| Code | IBM Plex Mono | IBM Plex Mono | IBM Plex Mono |

Per-section display voices (a suggestion that matches the scenario; all ja and zh faces are delivered as `text=` subsets):

| Artboard (section) | ja display | en display | zh display | Why |
|---|---|---|---|---|
| 序 Hero / signature | **Shippori Mincho B1 800**, vertical | **Bodoni Moda** italic, opsz 96 | **Noto Serif SC 200→900** (animate wght); signature line in **Ma Shan Zheng** (horizontal only) | Ink contrast meets hairline; the brush signature acts as a 落款 |
| 間 About / philosophy (karesansui) | Zen Old Mincho 400, large and airy | Newsreader opsz 72 light | Noto Serif SC 300 | Quiet; most 余白 |
| 技 Skills (kumiko lattice) | **DotGothic16** labels with Martian Mono | Martian Mono (wdth 75→112) and **Handjet** counters | **ZCOOL QingKe HuangYou** | Grid- and pixel-built letterforms echo the joinery |
| 道 Career (Tōkaidō emaki) | **Zen Antique** station names, vertical 詞書 | **Big Shoulders** years / stations | **ZCOOL XiaoWei** | Edo–Meiji signage voice |
| 屏 Projects (byōbu) | **Dela Gothic One** titles, Kaisei Tokumin 800 subtitles | **Bricolage Grotesque** (wdth 75, opsz 96) | Noto Sans SC 900 | Poster weight on gold leaf |
| 印 Achievements / metrics (kamon and seals) | **Yuji Syuku** captions, 大字 in Shippori | **Gloock** numerals | **Zhi Mang Xing** captions, 大写 in Noto Serif SC | Brush plus seal = authority |
| 結 Contact (letter) | **Klee One 600** (palt-capable) | Newsreader italic | **Long Cang** | A handwritten letter that closes the scroll |

This mixes eight or more distinct letterforms without monotony, and coherence comes from:

- the shared chrome (Martian Mono rulers and labels in every artboard);
- shared colour tokens;
- the shared vertical 詞書 column device used in every section.

### 4.5 CJK typesetting rules (CSS)

```css
:root { --lh-ja: 1.85; --lh-zh: 1.8; --lh-en: 1.55; }
:lang(ja)      { font-family: "IBM Plex Sans JP", sans-serif; line-height: var(--lh-ja); line-break: strict; }
:lang(zh-Hans) { font-family: "Noto Sans SC", sans-serif;   line-height: var(--lh-zh); line-break: strict; }
:lang(en)      { font-family: "IBM Plex Sans", sans-serif;  line-height: var(--lh-en); }

/* Proportional kana only where the face actually has palt (Plex JP, Noto JP/SC, Klee One, Fontworks display faces) */
:lang(ja) h1, :lang(ja) h2 { font-feature-settings: "palt" 1; letter-spacing: .02em; }
/* Faces WITHOUT palt (Shippori, Zen *, Kaisei, Yuji): add tracking manually, 0.04–0.12em for display */

/* Punctuation trimming: only works with halt/chws faces (MDN). Chrome 123+. Harmless elsewhere. */
:lang(ja), :lang(zh-Hans) { text-spacing-trim: trim-start; text-autospace: normal; } /* text-autospace is Baseline 2025 */

/* Japanese phrase-aware wrapping for headings (Chrome 119+, lang=ja only, BudouX model) */
:lang(ja) :is(h1,h2,h3) { word-break: auto-phrase; }

/* Vertical 詞書 column */
.tate { writing-mode: vertical-rl; text-orientation: mixed; font-feature-settings: "vpal" 1; line-height: 1.9; }
.tate .tcy { text-combine-upright: all; }   /* 2–3 digit numbers: 縦中横. The `digits` value is unsupported everywhere (MDN). */
.tate .upright { text-orientation: upright; } /* single Latin letters / acronyms, one per em */
.tate em { font-style: normal; text-emphasis: filled sesame; } /* 傍点 instead of italics */
ruby rt { font-size: .5em; } /* readings for colour names: <ruby>浅葱<rt>あさぎ</rt></ruby> */

/* Trim leading so CJK display type sits on guides exactly (text-box is Baseline: Safari 18.2, Chrome 133, Firefox 154) */
.display { text-box: trim-both cap alphabetic; }
```

Rules:

- **Vertical writing** follows JLREQ conventions:
  - Punctuation moves to the top right.
  - Brackets 「」 rotate.
  - Two-digit numbers use 縦中横.
  - Latin words rotate 90° (`mixed`), and acronyms of three letters or fewer go upright.
  - Prefer kanji numerals in vertical text.
  - In vertical blocks use `vpal`, not `palt`.
- **zh-Hans vertical.** Mainland text is mostly horizontal (CLREQ), so use vertical only for short display: titles, the signature, seal captions.
  - In vertical text use corner brackets 「」『』 instead of “ ”.
  - Punctuation sits top right (mainland).
  - **Do not set Ma Shan Zheng, ZCOOL or Zhi Mang Xing vertically if the text contains punctuation**: they have no `vert` or `vmtx` tables.
- **Line length.** ja 30–40 characters, zh 28–36, en 60–72ch. Hanging punctuation is Safari-only, so do not rely on it.
- **Mixed scripts.** `text-autospace` adds roughly ⅛-em spacing between CJK and Latin. Never type manual spaces in the source copy.
- **Font sizes.** CJK glyphs look larger than Latin at the same size. Set Latin inside CJK runs about 1.05–1.1× via `size-adjust` on the Latin `@font-face` (or a span class), not by changing the CJK size.

### 4.6 Wiring the language switch

- On `<html lang="ja|en|zh-Hans">`, swap the body font CSS link and the display `@font-face` file per language.
- Re-run SplitText only after `document.fonts.ready` for the new language.
- Keep layout boxes stable across languages. Reserve vertical space for the longest translation (usually en), and let vertical ja and zh columns grow into the 余白 rather than reflowing the grid.

---

## 5. Section identity matrix (one system, distinct pages)

| Artboard | Layer colour (2.2) | Pattern / classical source | Signature 3D or 2D effect | Transition out |
|---|---|---|---|---|
| 序 Hero | 薄群青 | 墨流し, 落款 | GPU ink-marbling fluid that spells the name and dissolves | 霞 band wipes right-to-left |
| 間 About | 韓紅 (seal only) | 枯山水 砂紋 | Shader sand plane raked by the cursor; concentric rings around value "stones" | Sand ripples flatten into ruled guides |
| 技 Skills | 若竹 | 組子 麻の葉 / 角麻の葉 | Instanced kumiko assembly (三組手 → 葉) | Lattice zooms into one strip that becomes the Tōkaidō road |
| 道 Career | 瑠璃 | 東海道 (Hōeidō) emaki, 異時同図法 | Scroll-scrubbed video along the road; Hiroshige prints as 絵 panels between vertical 詞書 | 金雲 parts |
| 屏 Projects | 躑躅 | 六曲 byōbu, 金箔, 金雲 | 3D six-panel screen unfolding right to left; panels are projects | Screen folds flat into a stack of artboards |
| 印 Achievements | 浅葱 | 家紋 construction, 落款 | Kamon built from circles (紋曼荼羅) with smart-guide snaps; metrics in 大字 | Seal stamps; ink bleeds to paper white |
| 結 Contact | 刈安 | 青海波, letter 手紙 | Klee One handwritten note drawn stroke by stroke; seigaiha footer | Scroll rolls up (end) |

Every artboard shares:

- rulers in Martian Mono;
- cyan 浅葱 guides;
- the selection box in its layer colour;
- one 朱文 seal;
- a 二十四節気 timestamp;
- the vertical 詞書 column.

---

## 6. Sources

**Colour**
- NIPPON COLORS: https://nipponcolors.com/ (values via https://pub.dev/packages/nippon_colors, spot-checked 8/8 against the live site)
- 和色大辞典: https://www.colordic.org/w
- Aizuri-e and Prussian blue: https://en.wikipedia.org/wiki/Aizuri-e ; https://cameo.mfa.org/wiki/Prussian_Blue:_Ukiyo-e_colorant
- Indigo "四十八色": https://kosodate.mynavi.jp/articles/15994

**Illustrator**
- Adobe Learn, rulers and guides: https://www.adobe.com/learn/illustrator/web/rulers-and-guides-alignment
- Guide colours and the selected-guide layer colour: https://community.adobe.com/t5/illustrator-discussions/changing-guide-color/m-p/10248684
- Layer 5 yellow replaced by magenta (Adobe PM, 2020): https://illustrator.uservoice.com/forums/333657-illustrator-feature-requests/suggestions/31535431-custom-layer-colors-layer-5-yellow-is-killing-me
- 27-colour RGB cycle (community script): https://community.adobe.com/t5/illustrator-discussions/script-to-create-layer-and-already-set-the-color/m-p/12849833
- Magenta smart guide: https://community.adobe.com/t5/illustrator-discussions/unknown-magenta-smart-guide-line-disappear/m-p/15194450/highlight/true

**Classical arts**
- Kamon, 波戸場承龍 and 紋曼荼羅: https://intojapanwaraku.com/rock/culture-rock/2564/2/ ; 江東区 crest craft: https://www.city.koto.lg.jp/103020/bunkasports/bunka/bunkazaisiseki/kogegijutsu/88493.html
- Kumiko: https://www.pref.shimane.lg.jp/industry/syoko/sangyo/dentou_kougei/kougei/kougei_30.html ; https://www.itic.pref.ibaraki.jp/publication/doc/research/s60/N14P09.pdf ; https://www.japanesetools.com.au/collections/paper-print/products/asa-no-ha-kumiko-jigs-by-wigwood
- Byōbu: https://ja.wikipedia.org/wiki/屏風 ; https://www.nippon.com/en/japan-data/h01096/ ; https://www.edohakuarchives.jp/detail-175573.html ; 金雲 scene division: https://online.bunka.go.jp/heritages/detail/430340
- Emakimono: https://ja.wikipedia.org/wiki/絵巻物
- Suminagashi: https://kotobank.jp/word/墨流し
- Karesansui raking: https://najga.org/7-common-raking-patterns-in-japanese-dry-landscape-gardens/
- Tōkaidō: https://www.moaart.or.jp/en/?p=18984 ; https://en.wikipedia.org/wiki/The_Fifty-three_Stations_of_the_T%C5%8Dkaid%C5%8D ; AIC API https://api.artic.edu/api/v1/artworks/search
- Patterns: https://fun-japan.jp/jp/articles/14279 ; https://intojapanwaraku.com/rock/art-rock/130880/ ; https://wargo.jp/en/blogs/hiyori-column/ichimatsu
- Jo-ha-kyū: https://en.wikipedia.org/wiki/Jo-ha-ky%C5%AB
- Daiji: https://bestcalendar.jp/tools/kansuji-henkan ; https://fr.wiktionary.org/wiki/%E5%A3%B1 ; https://www.zdic.net/hans/大寫

**Typography and CSS**
- Google Fonts metadata: https://fonts.google.com/metadata/fonts ; CSS API: https://fonts.googleapis.com/css2
- MDN text-spacing-trim: https://developer.mozilla.org/en-US/docs/Web/CSS/text-spacing-trim
- MDN text-autospace: https://developer.mozilla.org/en-US/docs/Web/CSS/text-autospace
- MDN text-combine-upright: https://developer.mozilla.org/en-US/docs/Web/CSS/text-combine-upright
- word-break: auto-phrase (Chrome 119): https://developer.chrome.com/blog/css-i18n-features
- text-box Baseline: https://web.dev/blog/web-platform-08-2026
- W3C CLREQ: https://www.w3.org/TR/clreq/ ; W3C JLREQ: https://www.w3.org/TR/jlreq/
