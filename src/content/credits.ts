/**
 * Localised titles and trilingual alt text for every image the site shows (DESIGN §3.6, §11.1, §12 #1–2).
 * Owner: WP-01. Node-safe.
 *
 * - `title` = "{artist} {title}" in the page language (ja/zh short titles; en follows the manifest title,
 *   shortened). It is used as a figure caption on its own, so it names the artist; renderers add the date and
 *   institution from assets-src/images/manifest.json, which also holds `creditText` and `objectUrl`.
 * - `alt` says what the picture shows and why it is on this page.
 * - Artist names and attribution qualifiers follow the museum records (The Met collection API `artistPrefix`,
 *   artic.edu API): the poppies screen is "Traditionally attributed to" Tosa Mitsumochi 土佐光茂 (伝), not Mitsuoki
 *   光起; Moon and Autumn Grasses is "Studio of" Tawaraya Sōtatsu (工房; silver and gold flecks, not gold leaf).
 *   The manifest's `creditText` drops both qualifiers (WP-01 R11).
 * - Subjects were checked on the images themselves: `manga-pagoda-roof` is captioned 「輪蔵の家根」 by Hokusai
 *   (a revolving sutra library, not a pagoda) and `seiei-moon-kikko` shows a kagome lattice under citrus fruit,
 *   not kikkō under moons (WP-01 R12).
 * - `-detail` entries are the WP-02 crops used in the film captions (Hakone: right 75 %, no distant Fuji;
 *   Mishima: left 62 %, no torii). The full Hakone and Mishima prints are never shown; their entries exist for
 *   completeness of the credits.
 * - The three katagami stencils appear only as 1-bit masks (aria-hidden legend textures); they are listed so
 *   the Colophon can credit them.
 */
import type { T } from './types';

const t = (ja: string, en: string, zh: string): T => ({ ja, en, zh });
const c = (title: T, alt: T) => ({ title, alt });

export const credits: Readonly<Record<string, { title: T; alt: T }>> = {
  /* ---------- Hiroshige, Fifty-three Stations of the Tōkaidō (Hōeidō edition, c. 1833–34) ---------- */
  'tokaido/01-nihonbashi.jpg': c(
    t('歌川広重「東海道五拾三次之内 日本橋 朝之景」', 'Utagawa Hiroshige, Nihon Bridge: Morning Scene', '歌川广重《东海道五十三次之内 日本桥 朝之景》'),
    t(
      '夜明けの日本橋。木戸が開き、大名行列が橋を渡りはじめる。手前には天秤棒を担いだ魚売り。旅と仕事の起点',
      'Dawn at Nihonbashi: the gates open and a daimyo procession starts across the bridge, fish sellers with shoulder poles in front. Where the road, and the career, begin',
      '黎明的日本桥：木门打开，大名队列开始过桥，前景是挑担的鱼贩——旅程与职业的起点',
    ),
  ),
  'tokaido/11-hakone.jpg': c(
    t('歌川広重「東海道五拾三次之内 箱根 湖水図」', 'Utagawa Hiroshige, Hakone: View of the Lake', '歌川广重《东海道五十三次之内 箱根 湖水图》'),
    t(
      '色を継ぎはいだような箱根の岩山と芦ノ湖。岩山の裾を小さな行列が越えていく。東海道でいちばん険しい登り',
      'The patchwork crag above Lake Ashi at Hakone, with a small procession winding through the pass at its foot: the hardest climb of the road',
      '箱根色块拼接般的山岩与芦之湖，小小的队列在山脚穿过关隘——东海道上最难走的一段山路',
    ),
  ),
  'tokaido/11-hakone-detail.jpg': c(
    t('歌川広重「東海道五拾三次之内 箱根 湖水図」（部分）', 'Utagawa Hiroshige, Hakone: View of the Lake (detail)', '歌川广重《东海道五十三次之内 箱根 湖水图》（局部）'),
    t(
      '若竹色をはじめ、色を継ぎはいだような岩山を、小さな行列が越えていく。大きな作り直しの年',
      'A small procession climbs through a crag pieced together from blocks of color, young-bamboo green among them: the year of the big rewrite',
      '小小的队列翻越色块拼接般的山岩，其中有一抹若竹绿——大规模重构的那一年',
    ),
  ),
  'tokaido/12-mishima.jpg': c(
    t('歌川広重「東海道五拾三次之内 三島 朝霧」', 'Utagawa Hiroshige, Mishima: Morning Mist', '歌川广重《东海道五十三次之内 三岛 朝雾》'),
    t(
      '朝霧の三島。馬上の旅人と駕籠かきが、灰色の霧の層に溶けていく',
      'Morning mist at Mishima: a rider and palanquin bearers dissolving into layers of gray fog',
      '晨雾中的三岛：骑马的旅人与轿夫，渐渐隐入层层灰雾',
    ),
  ),
  'tokaido/12-mishima-detail.jpg': c(
    t('歌川広重「東海道五拾三次之内 三島 朝霧」（部分）', 'Utagawa Hiroshige, Mishima: Morning Mist (detail)', '歌川广重《东海道五十三次之内 三岛 朝雾》（局部）'),
    t(
      '銀鼠の霧の中を、馬上の旅人と駕籠が進む。先の見えない、全員リモートの一年',
      'A rider and a palanquin moving through silver-gray fog: a year of working blind, everyone remote',
      '银灰色的雾里，骑马人与轿子缓缓前行——前路难辨、全员远程的一年',
    ),
  ),
  'tokaido/14-hara.jpg': c(
    t('歌川広重「東海道五拾三次之内 原 朝之富士」', 'Utagawa Hiroshige, Hara: Mount Fuji in the Morning', '歌川广重《东海道五十三次之内 原 朝之富士》'),
    t(
      '原から見る朝の富士。頂が画面の枠を突き抜け、その下を二人の女の旅人と供の男が行く。枠を越えた一年',
      "Mount Fuji at dawn from Hara, its peak breaking through the top of the picture frame above two women travelers and their porter: the year that outgrew its frame",
      '从原宿望见的清晨富士，山顶冲出画框，山下两位女旅人与随行男子走过——突破框架的一年',
    ),
  ),
  'tokaido/24-shimada.jpg': c(
    t('歌川広重「東海道五拾三次之内 島田 大井川駿岸」', 'Utagawa Hiroshige, Shimada: The Suruga Bank of the Ōi River', '歌川广重《东海道五十三次之内 岛田 大井川骏岸》'),
    t(
      '橋のない大井川を真上から見る。人足たちが、大名行列を肩や輦台に乗せて浅瀬を渡していく。大勢を率いて川を渡る',
      'The bridgeless Ōi River seen from above, as porters carry a whole procession across the shallows on their shoulders and on litters: leading many people over',
      '俯瞰没有桥的大井川：脚夫们用肩膀和辇台把整支队列送过浅滩——带着一群人渡河',
    ),
  ),
  'tokaido/39-okazaki.jpg': c(
    t('歌川広重「東海道五拾三次之内 岡崎 矢矧之橋」', 'Utagawa Hiroshige, Okazaki: Yahagi Bridge', '歌川广重《东海道五十三次之内 冈崎 矢矧之桥》'),
    t(
      '東海道屈指の長い橋、矢矧橋を大名行列が渡る。奥に岡崎城。二つの岸をつなぐ',
      'A procession crosses Yahagi Bridge, one of the longest on the Tōkaidō, below Okazaki Castle: a crossing that joins two banks',
      '大名队列走过东海道上数一数二的长桥矢矧桥，远处是冈崎城——连通两岸',
    ),
  ),
  'tokaido/46-shono.jpg': c(
    t('歌川広重「東海道五拾三次之内 庄野 白雨」', 'Utagawa Hiroshige, Shōno: Driving Rain', '歌川广重《东海道五十三次之内 庄野 白雨》'),
    t(
      'にわか雨の坂道を、駕籠かきと旅人が駆け抜ける。斜めの雨脚と、風にしなる竹林。障害の年',
      'Palanquin bearers and travelers running through a sudden downpour on a slope, under slanting rain and bamboo bent by the wind: the year of the outage',
      '骤雨中，轿夫与旅人奔过山坡，雨线斜飞，竹林被风压弯——发生大故障的那一年',
    ),
  ),
  'tokaido/48-seki.jpg': c(
    t('歌川広重「東海道五拾三次之内 関 本陣早立」', 'Utagawa Hiroshige, Seki: Early Departure from the Main Camp', '歌川广重《东海道五十三次之内 关 本阵早立》'),
    t(
      '夜明け前の本陣。家紋を染めた大きな幕の下で、大名行列が出立の支度をしている。幕は暖簾と響き合う',
      "A daimyo's train readies to leave the main inn before dawn, under great curtains dyed with the family crest: they rhyme with the noren",
      '黎明前的本阵，染着家纹的大幅幕帘下，大名队列正准备出发——幕帘与暖帘相互呼应',
    ),
  ),
  'tokaido/55-kyoto.jpg': c(
    t('歌川広重「東海道五拾三次 大尾 京師 三条大橋」', 'Utagawa Hiroshige, Kyoto: The Great Bridge at Sanjō', '歌川广重《东海道五十三次 大尾 京师 三条大桥》'),
    t(
      '旅人が三条大橋を渡って京に入る。背後に東山。題の札には「大尾」とあり、ここで揃物が終わる',
      'Travelers cross the Sanjō Bridge into Kyoto below the Higashiyama hills; the title cartouche reads 大尾, "the end": the arrival',
      '旅人走过三条大桥进入京都，身后是东山；标题框上写着“大尾”——旅程抵达终点',
    ),
  ),

  /* ---------- gold screens (works) ---------- */
  'rinpa/mitsumochi-poppies.jpg': c(
    t('伝 土佐光茂「紅白芥子図屏風」', 'Traditionally attributed to Tosa Mitsumochi, Red and White Poppies', '传土佐光茂《红白罂粟图》屏风'),
    t(
      '金地に紅白の芥子。斜めに走る市松の垣根は、一つも欠けず一つも重ならない台帳の升目',
      'Red and white poppies on gold before a diagonal checkered fence, a ledger grid with no cell missing and none counted twice',
      '金地上的红白罂粟，前方斜贯一道方格篱笆——一格不缺、一格不重的账本网格',
    ),
  ),
  'rinpa/sotatsu-moon-autumn-grasses.jpg': c(
    t('俵屋宗達工房「月に秋草図屏風」', 'Studio of Tawaraya Sōtatsu, Moon and Autumn Grasses', '俵屋宗达工房《月与秋草图》屏风'),
    t(
      '金砂子を撒いた地に秋草が散り、左上に黒ずんだ銀の半月がかかる。月明かりで見るように、暗がりで障害を見つける',
      'Autumn grasses on a ground strewn with gold flecks, under a half moon of silver, now darkened: finding faults in the dark, as if by moonlight',
      '洒金的底子上散落着秋草，左上方悬着一轮已经发黑的银色半月——像借着月光那样，在暗处找出故障',
    ),
  ),
  'rinpa/fans-upon-waves.jpg': c(
    t('筆者不詳「扇面流図屏風」', 'Unidentified artist, Fans upon Waves', '佚名《扇面流水图》屏风'),
    t(
      '金雲の下、様式化された波に乗って扇が流れていく。動くカメラの下を流れ込むベクタータイル',
      'Open fans riding stylized waves under gold clouds: vector tiles streaming in beneath a moving camera',
      '金云之下，一把把折扇随着程式化的波浪漂流——镜头移动时不断流入的矢量瓦片',
    ),
  ),
  'rinpa/korin-irises-yatsuhashi.jpg': c(
    t('尾形光琳「八橋図屏風」', 'Ogata Kōrin, Irises at Yatsuhashi (Eight Bridges)', '尾形光琳《八桥图》屏风'),
    t(
      '金地に群れ咲く燕子花の間を、板橋がジグザグに渡る。一枚ずつ渡りきる移行',
      'Irises massed on gold, crossed by a zig-zag plank bridge: a migration made one plank at a time',
      '金地上成片的燕子花之间，木板桥曲折穿过——一块板一块板走完的迁移',
    ),
  ),
  'rinpa/kiitsu-morning-glories.jpg': c(
    t('鈴木其一「朝顔図屏風」', 'Suzuki Kiitsu, Morning Glories', '铃木其一《牵牛花图》屏风'),
    t(
      '見えない垣を伝うように、群青の朝顔の蔓が金地を巡る。毎朝咲き直し、育ち続けるテンプレート',
      'Vines of deep-blue morning glories looping across gold as if on an unseen trellis, opening again every morning: templates that keep growing',
      '深蓝的牵牛花藤像攀着看不见的篱架，在金地上回旋，每天清晨重新开放——持续生长的模板',
    ),
  ),
  'rinpa/korin-rough-waves.jpg': c(
    t('尾形光琳「波濤図屏風」', 'Ogata Kōrin, Rough Waves', '尾形光琳《波涛图》屏风'),
    t(
      '二曲の画面いっぱいに逆巻く荒波。崩れそうで崩れない波頭。荒波を受け止める',
      'Rough waves curling across two panels, crests that seem about to break and never do: rough water, held',
      '两扇画面上翻卷的怒涛，浪头似塌未塌——浪再大，也稳得住',
    ),
  ),

  /* ---------- Hokusai Manga ---------- */
  'hokusai/manga-perspective.jpg': c(
    t('葛飾北斎『北斎漫画』遠近法の頁', 'Katsushika Hokusai, Random Sketches (Hokusai Manga), perspective page', '葛饰北斋《北斋漫画》透视法一页'),
    t(
      '消失点へ集まる線で描いた通りと、画面を三つに割って天と地を決める「三ツワリの法」の図。下段に人物の素描。消えていく設計図としての版下',
      'A double page: a street drawn on lines that meet at a vanishing point, and Hokusai’s “three-part rule” that splits a picture into ceiling and floor, with figure sketches below: the plan that disappears into the work',
      '一页对开：沿汇向消失点的线条画出的街道，以及把画面三分、定出天与地的“三分法”图，下方是人物速写——终将消失在成品里的设计图',
    ),
  ),
  'hokusai/manga-pattern-construction.jpg': c(
    t('葛飾北斎『北斎漫画』文様の描き方の頁', 'Katsushika Hokusai, Random Sketches (Hokusai Manga), constructing patterns', '葛饰北斋《北斋漫画》纹样画法一页'),
    t(
      '青海波、亀甲、麻の葉、紗綾形などの割り付けを、描く手順とともに示した見開き。組子の仕様書',
      'A double page setting out seigaiha, tortoiseshell, hemp-leaf and key-fret patterns with notes on how to draw each: the kumiko spec',
      '一页对开，列出青海波、龟甲、麻叶、纱绫形等纹样的作图步骤——组子的规格书',
    ),
  ),
  'hokusai/manga-pagoda-roof.jpg': c(
    t('葛飾北斎『北斎漫画』輪蔵の屋根の頁', 'Katsushika Hokusai, Random Sketches (Hokusai Manga), roof of a revolving sutra library', '葛饰北斋《北斋漫画》轮藏屋顶一页'),
    t(
      '「輪蔵の家根」。中心の軸で回る経蔵の二重の屋根を、垂木、組物、軒の隅まで描き分けた見開き。中心の一本で全体を支える構造',
      'Hokusai’s “roof of a rinzō”, a sutra library that turns on a central post: two tiers of roof drawn down to the rafters, bracket sets and eave corners. A whole structure carried by one core',
      '北斋所题“轮藏之屋顶”：轮藏是绕中心轴转动的藏经阁，两重屋顶连椽子、斗栱与檐角都一一画出——整座建筑靠中间一根轴撑起',
    ),
  ),

  /* ---------- perspective pictures, patterns, landscapes ---------- */
  'ukie/toyoharu-kabuki-perspective.jpg': c(
    t('歌川豊春「浮絵 歌舞妓芝居之図」', 'Utagawa Toyoharu, Perspective Picture of a Kabuki Theater', '歌川丰春《浮绘 歌舞伎剧场图》'),
    t(
      '一点透視で奥へ伸びる芝居小屋。満員の客席と桟敷、正面の舞台。屋根を外して中を見せる、システムの断面図',
      'A kabuki theater in one-point perspective, packed stalls and galleries running toward the stage: a system shown in cut-away',
      '以一点透视画出的歌舞伎剧场，满座的池座与看台一路延伸到舞台——把系统剖开来看',
    ),
  ),
  'ukie/toyoharu-dutch-perspective.jpg': c(
    t('歌川豊春「阿蘭陀浮絵」より 漁の図', 'Utagawa Toyoharu, Fishing, from Dutch Perspective Pictures', '歌川丰春《阿兰陀浮绘》之渔图'),
    t(
      '西洋の銅版画にならい、石造りの街と橋、網を打つ舟を遠近法で描く。異国の道具を学んだ江戸の絵師',
      'A stone city, a bridge and fishermen casting a net, drawn with perspective learned from European prints: an Edo artist learning a foreign toolset',
      '仿照欧洲铜版画，用透视法画出石砌街市、石桥与撒网的渔船——学习外来工具的江户画师',
    ),
  ),
  'pattern/seiei-moon-kikko.jpg': c(
    t('山田直三郎『精英』より 籠目の図案', 'Yamada Naosaburō, Seiei: A Design Book, basket-weave lattice page', '山田直三郎《精英》图案集 笼目一页'),
    t(
      '深い緑の地を斜めに切って、六角と三角が組み合う籠目の格子が走り、その上に葉のついた金色の柑橘が実る明治の図案。色の入った升目で、平らな格子が奥行きを持ちはじめる',
      'A Meiji design page: a diagonal band of kagome lattice, hexagons and triangles woven together, under golden citrus fruit and leaves on deep green. With color in its cells, a flat grid starts to gain depth',
      '明治时期的图案页：深绿底上斜贯一道笼目格子，六角与三角相互交织，上方结着带叶的金色柑橘；格中填了色，平面格子开始有了纵深',
    ),
  ),
  'pattern/stencil-asanoha.jpg': c(
    t('筆者不詳 麻の葉文様の型紙', 'Unidentified artist, Stencil with Hemp-Leaf Pattern', '佚名 麻叶纹型纸'),
    t(
      '三角の格子から生まれる麻の葉文様の型紙。Webの見出しの下に、型抜きの影として敷く',
      'A dyer’s stencil of hemp-leaf pattern grown from a triangular grid, laid as a cut-out shadow under the web heading',
      '由三角网格生成的麻叶纹染布型纸，作为镂空底纹衬在Web标题之下',
    ),
  ),
  'pattern/stencil-sayagata.jpg': c(
    t('筆者不詳 紗綾形文様の型紙', 'Unidentified artist, Stencil with Continuous Fret Pattern (sayagata)', '佚名 纱绫形纹型纸'),
    t(
      '途切れずに組み合う紗綾形の型紙。バックエンドの見出しの下に、型抜きの影として敷く',
      'A dyer’s stencil of unbroken interlocking fret, laid as a cut-out shadow under the back-end heading',
      '连绵相扣的纱绫形染布型纸，作为镂空底纹衬在后端标题之下',
    ),
  ),
  'pattern/stencil-undulating-lines.jpg': c(
    t('筆者不詳 平行する波線の型紙', 'Unidentified artist, Stencil with Pattern of Parallel, Undulating Lines', '佚名 平行波线纹型纸'),
    t(
      '平行に揺れる波線の型紙。庭の凡例で、レイテンシの波形として使う',
      'A dyer’s stencil of parallel undulating lines, used in the garden legend as a latency waveform',
      '平行起伏的波线型纸，在庭园图例中用作延迟的波形',
    ),
  ),
  'night/hiroshige-ryogoku-moon.jpg': c(
    t('歌川広重「東都名所 両国之宵月」', 'Utagawa Hiroshige, Twilight Moon at the Ryōgoku Bridge', '歌川广重《东都名所 两国之宵月》'),
    t(
      '両国橋の太い橋脚の間から、隅田川の舟と宵の月を見る。夜の版にだけ掛ける一枚',
      'The evening moon and boats on the Sumida River, framed by the heavy timber piers of Ryōgoku Bridge: the print that hangs only at night',
      '透过两国桥粗大的木桥墩，望见隅田川上的小船与傍晚的月亮——只在夜间版面出现的一幅',
    ),
  ),
  'landscape/shonen-aged-pines.jpg': c(
    t('鈴木松年「老松図屏風」', 'Suzuki Shōnen, Aged Pines', '铃木松年《老松图》屏风'),
    t(
      '金地に墨だけで描いた老松の大枝。長く続く仕事のしるし',
      'A great bough of an old pine in ink alone on gold leaf: a sign of work that lasts',
      '金地上只用墨画出的老松粗枝——长久工作的象征',
    ),
  ),
  'landscape/motonobu-ink-landscape.jpg': c(
    t('伝 狩野元信「山水図」', 'Attributed to Kano Motonobu, Ink Landscape', '传狩野元信《山水图》'),
    t(
      '霧の奥に遠い山並みと小舟。庭の背後に、ごく淡く掛ける',
      'Distant peaks and small boats in mist, hung very faintly behind the garden',
      '雾霭深处的远山与小舟，极淡地衬在庭园之后',
    ),
  ),

  /* ---------- surimono (writing, colophon, 404) ---------- */
  'writing/hokkei-first-writing.jpg': c(
    t('魚屋北渓「書き初めの支度をする橘逸勢」', 'Totoya Hokkei, Tachibana no Hayanari preparing to make the first writing of the New Year', '鱼屋北溪《准备新年试笔的橘逸势》'),
    t(
      '筆立てと硯箱を前に、能書家の橘逸勢が新年の書き初めに向かう摺物。書く仕事の始まり',
      'A surimono of the calligrapher Tachibana no Hayanari at his brushes and writing box, about to make the first writing of the year: where writing begins',
      '一幅摺物：书法家橘逸势面对笔筒与砚箱，准备新年第一次落笔——写作由此开始',
    ),
  ),
  'writing/gakutei-spider-web.jpg': c(
    t('八島岳亭「糸と蜘蛛の巣の箱を見る唐美人」', "Yashima Gakutei, Two Chinese Women Examining Thread and a Spider's Web in a Box", '八岛岳亭《观盒中丝线与蛛网的唐装女子》'),
    t(
      '七夕の夜に蜘蛛を入れた小箱を、唐装の女性がのぞきに来る。巣のかかり具合で手芸の上達を占う風習。ウェブで編むオープンソースへの小さな洒落',
      "A woman in Chinese dress comes to look into a small box where a spider has spun overnight, a Tanabata custom for divining skill at needlework: a quiet pun on open source woven on the Web",
      '七夕把蜘蛛放进小盒、次晨看网疏密以卜巧拙，即“喜蛛应巧”；画中唐装女子前来看盒——也是对“在网上编织开源”的小小双关',
    ),
  ),
  'writing/gakutei-paper.jpg': c(
    t('八島岳亭「一陽連 文房四友 紙 定家」', 'Yashima Gakutei, Paper: Fujiwara no Sadaie (Teika)', '八岛岳亭《一阳连文房四友 纸 定家》'),
    t(
      '文房四友の「紙」。歌人の藤原定家が、紙と本を積んだ机に向かう。書いて残すこと',
      'Paper, one of the four friends of the writing table: the poet Fujiwara no Teika at a desk stacked with paper and books, writing things down',
      '文房四友之“纸”：歌人藤原定家坐在堆满纸与书的案前——写下来，留下来',
    ),
  ),
  'writing/gakutei-brush.jpg': c(
    t('八島岳亭「一陽連 文房四友 筆 衛夫人」', 'Yashima Gakutei, Brush: Lady Wei', '八岛岳亭《一阳连文房四友 笔 卫夫人》'),
    t(
      '文房四友の「筆」。王羲之に書を教えた衛夫人が筆をとる。教えること',
      'Brush, from the same set: Lady Wei, who taught Wang Xizhi calligraphy, at her desk: teaching',
      '文房四友之“笔”：曾教王羲之书法的卫夫人执笔案前——传授',
    ),
  ),
  'writing/gakutei-book-cart.jpg': c(
    t('八島岳亭「車付きの本箱の紐を引く女」', 'Yashima Gakutei, A Woman Pulling the Cord of a Wheeled Book Case', '八岛岳亭《拉带轮书箱绳索的女子》'),
    t(
      '本を積んだ車付きの本箱を、紐で引き寄せる女性。このサイトが引いて歩く依存ライブラリ',
      'A woman drawing a wheeled book case stacked with volumes toward her by its cord: the libraries this site pulls along',
      '女子拉着绳索，把堆满书册的带轮书箱拉到身边——本站一路拖着走的依赖库',
    ),
  ),
};
