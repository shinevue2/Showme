/**
 * Glossary for the Info panel (DESIGN §9). Owner: WP-01. Node-safe.
 * Each entry: term, ruby, en name, zh name, one-line gloss per language. Every historical statement was checked
 * (WP-01 hand-over lists the sources): 版下 (JAANUS), 主版/omohan (JAANUS), 錦絵 1765 (JAANUS), 奥付 and the
 * 1722 ordinance (Kotobank: ニッポニカ, 図書館情報学用語辞典), 大関/横綱 1890 (Wikipedia: Makuuchi, Nishinoumi
 * Kajirō I), 扇 counted from the right (nippon.com), 三組手 (島根県 伝統工芸), 金箔 109 mm (Kanazawa makers),
 * のれん = goodwill (Wikipedia: のれん (会計)), 異時同図法 (文化遺産オンライン), 湊 in 說文 (Dong Chinese),
 * 大尾 in the Kyoto print's title (The Met record: "Taibi, Keishi, Sanjō Ōhashi").
 */
import type { T, GlossaryEntry } from './types';

const t = (ja: string, en: string, zh: string): T => ({ ja, en, zh });
const g = (term: string, ruby: string, en: string, zh: string, gloss: T): GlossaryEntry => ({ term, ruby, en, zh, gloss });

export const glossary: readonly GlossaryEntry[] = [
  /* the workshop */
  g('版元', 'はんもと', 'Hanmoto (publisher)', '版元（出版者）', t(
    '絵や本を企画し、絵師・彫師・摺師を束ねて世に出す者。',
    'The publisher who commissions a print and coordinates designer, carver and printer.',
    '策划版画或书籍，并统筹画师、刻工与印工的出版者。',
  )),
  g('版下', 'はんした', 'Hanshita (block drawing)', '版下（写样）', t(
    '主版を彫るための最終の下絵。版木に裏返して貼り、彫るうちに失われる。',
    'The final drawing for the key block, pasted face-down on the wood and destroyed as it is carved.',
    '雕刻主版用的定稿，反贴在版木上，随雕刻而消失；相当于中国雕版的“写样”。',
  )),
  g('主版', 'おもはん', 'Omohan (key block)', '主版', t(
    '墨の輪郭線を摺る版。最初に彫り、その校合摺をもとに色版を作る。',
    'The block that prints the black outlines. It is cut first, and its proofs guide every color block.',
    '印黑色轮廓线的版，最先雕刻，各色版都依其校样制作。',
  )),
  g('色版', 'いろはん', 'Iro-han (color block)', '色版', t(
    '一色に一枚ずつ彫る版。絵師が主版の校合摺に色を指定する。',
    'One block per color, cut after the artist marks the colors on proofs of the key block.',
    '一色一版；画师先在主版校样上标注颜色，再据此雕刻。',
  )),
  g('見当', 'けんとう', 'Kentō (registration marks)', '见当（套准记号）', t(
    '版木に彫る鉤形と直線の二つの目印。紙をここに合わせ、色を同じ位置に重ねる。',
    'An L-shaped and a straight notch cut into every block; the paper is laid against them so each color lands in register.',
    '刻在版木上的钩形与直线两处记号；纸张靠此定位，各色才能准确套合。',
  )),
  g('摺る', 'する', 'Suru (to print)', '摺（擦印）', t(
    '版に絵具をのせて湿った紙を置き、馬楝（ばれん）でこすって写す。',
    'To print: ink the block, lay damp paper on it and rub the back with a baren.',
    '在版上施色，覆上润湿的纸，用马连（baren）擦印。',
  )),
  g('空摺', 'からずり', 'Karazuri (blind printing)', '空摺', t(
    '絵具をつけずに摺り、紙に凹凸だけを残す技法。斜めの光で浮かび上がる。',
    'Printing with an uninked block, so only a relief is pressed into the paper; it shows in raking light.',
    '不施色而印，只在纸上压出凹凸，斜光下才显现；与中国的“拱花”同理。',
  )),
  g('石摺', 'いしずり', 'Ishizuri (stone-rubbing style)', '石摺', t(
    '石碑の拓本をまね、暗い地に線を白く抜いた摺り。このサイトの夜の版の名。',
    'Prints imitating stone rubbings, with pale lines on a dark ground; the name of this site’s night theme.',
    '模仿碑拓的印法，暗底上留出白线；本站夜间模式即取此名。',
  )),
  g('錦絵', 'にしきえ', 'Nishiki-e (brocade print)', '锦绘', t(
    '多色摺の浮世絵版画。1765年、鈴木春信の絵暦に始まるとされる。',
    'The full-color ukiyo-e print, thought to begin in 1765 with Suzuki Harunobu’s picture calendars.',
    '多色套印的浮世绘版画，一般认为始于1765年铃木春信的绘历。',
  )),
  g('摺物', 'すりもの', 'Surimono (private print)', '摺物', t(
    '狂歌の会などが注文して配った私家版の版画。金属粉や空摺を惜しまず使う。',
    'A privately commissioned print, often for a poetry circle, lavish with metallic pigments and embossing.',
    '诗社等私人定制分赠的版画，常用金属颜料与空摺。',
  )),
  g('奥付', 'おくづけ', 'Okuzuke (colophon)', '奥付（牌记）', t(
    '書物の巻末に書名や作者、版元、刊行年を記した部分。1722年の触書で、新刊に作者と版元の実名を記すよう定められた。',
    'The back page of a book naming title, author, publisher and date; a 1722 ordinance made new books name their author and publisher.',
    '书末载明书名、作者、版元与刊行年份的部分；1722年江户幕府的出版法令规定，新刊须写明作者与版元的真名。',
  )),
  g('大尾', 'たいび', 'Taibi (the end)', '大尾', t(
    '物事の終わり。広重「東海道五拾三次」の京師の図には、題に「大尾」とある。',
    'The end. Hiroshige’s Kyoto print, the last of his Tōkaidō series, carries the word in its title.',
    '终了、结尾。广重《东海道五十三次》最后一幅“京师”的标题里就写着“大尾”。',
  )),

  /* screens, gold, joinery */
  g('屏風', 'びょうぶ', 'Byōbu (folding screen)', '屏风', t(
    '蝶番でつないだ数枚の扇からなる、折りたたみの衝立。六曲が基本。',
    'A folding screen of hinged panels; six panels is the standard form.',
    '由数扇铰接而成、可折叠的屏风，以六扇为基本形制。',
  )),
  g('扇', 'せん', 'Sen (screen panel)', '扇', t(
    '屏風の一枚一枚の画面。向かって右端を第一扇と数える。',
    'One panel of a folding screen, counted from the viewer’s right.',
    '屏风的一扇；从观者右手起数为第一扇。',
  )),
  g('下地骨', 'したじぼね', 'Shitajibone (lattice core)', '下地骨（木骨）', t(
    '屏風の紙の下に組まれた木の格子。何層もの和紙で包んでから本紙を貼る。',
    'The wooden lattice inside a screen, wrapped in layers of paper before the painting goes on.',
    '屏风纸面之下的木格骨架，先裱多层和纸，再贴画心。',
  )),
  g('金箔', 'きんぱく', 'Kinpaku (gold leaf)', '金箔', t(
    '金を一万分の一ミリほどに打ち延ばした箔。109ミリ角（三寸六分）が広く使われる。',
    'Gold beaten to about a ten-thousandth of a millimeter; squares of 109 mm are the common size.',
    '锤至约万分之一毫米厚的金片，常用规格为109毫米见方。',
  )),
  g('箔足', 'はくあし', 'Hakuashi (leaf seams)', '箔足', t(
    '金箔を少しずつ重ねて貼ったとき、重なりに出る格子状の線。',
    'The grid of fine lines left where squares of gold leaf overlap.',
    '金箔逐张叠贴时，交叠处留下的格状细线。',
  )),
  g('組子', 'くみこ', 'Kumiko (lattice joinery)', '组子', t(
    '細い木を釘を使わずに組み、文様をつくる建具の技法。',
    'Joinery that builds patterns from thin strips of wood without nails.',
    '不用钉子、以细木条拼出纹样的门窗工艺。',
  )),
  g('三組手', 'みつくで', 'Mitsukude (three-way joint)', '三组手', t(
    '三本の組子を正三角形に組む組手。三角の地組の基本になる。',
    'Three strips joined into an equilateral triangle: the base of every triangular kumiko grid.',
    '三根组子拼成正三角形的接法，是三角形底格的基础。',
  )),

  /* garden */
  g('枯山水', 'かれさんすい', 'Karesansui (dry garden)', '枯山水', t(
    '水を使わず、石と砂で山水を表す庭。',
    'A garden that shows mountains and water with stone and raked gravel alone.',
    '不用水，只以石与砂表现山水的庭园。',
  )),
  g('砂紋', 'さもん', 'Samon (raked patterns)', '砂纹', t(
    '枯山水の砂に熊手で引く模様。乱れれば引き直す。',
    'Patterns raked into the gravel of a dry garden, raked again whenever they are disturbed.',
    '用耙子在枯山水砂面上画出的纹样，一乱便重新耙平。',
  )),

  /* ranking, seals, reliability */
  g('番付', 'ばんづけ', 'Banzuke (ranking sheet)', '番付', t(
    '力士の序列を一枚に摺った表。のちには何でも番付に見立てて摺られた。',
    'A printed sheet ranking sumo wrestlers; later almost anything was ranked the same way.',
    '把力士排名印成一张的表；后来几乎什么都能比照着排成番付。',
  )),
  g('大関', 'おおぜき', 'Ōzeki', '大关', t(
    '江戸の番付の最高位。「横綱」が番付に記されたのは1890年から。',
    'The top rank on Edo-period banzuke; “yokozuna” first appeared on one in 1890.',
    '江户番付的最高位；“横纲”到1890年才首次写上番付。',
  )),
  g('砂子', 'すなご', 'Sunago (gold dust)', '砂子（洒金）', t(
    '金銀の箔を細かく砕き、竹の筒でふるって紙や絵に撒く装飾。',
    'Gold or silver leaf crushed to flakes and sifted through a bamboo tube onto paper.',
    '把金银箔碾成碎屑，用竹筒筛撒在纸面上的装饰，与中国的洒金相近。',
  )),
  g('落款', 'らっかん', 'Rakkan (signature and seal)', '落款', t(
    '書画の仕上げに記す署名と、押す印。',
    'The signature and seal that mark a painting or calligraphy as finished.',
    '书画完成时题写的署名与钤盖的印章。',
  )),
  g('白文・朱文', 'はくぶん・しゅぶん', 'Hakubun and shubun', '白文·朱文', t(
    '文字を彫りくぼめて白く出す印が白文、文字を残して朱く出す印が朱文。',
    'Hakubun seals cut the characters in, so they print white; shubun seals leave them raised, so they print red.',
    '字口凹下、钤出白字的是白文印；字口凸起、钤出红字的是朱文印。',
  )),
  g('割印', 'わりいん', 'Wariin (split seal)', '骑缝章', t(
    '二枚の紙にまたがって押し、二つが対であることを示す印。',
    'A seal stamped across two sheets at once, proving they belong together.',
    '跨两张纸加盖、证明两者成对的印章。',
  )),
  g('湊', 'みなと', 'Minato (harbor)', '凑', t(
    '名の一字で、印の字。『説文解字』は「水上人所會也」と説く。',
    'The character of the given name, cut in the seal; the Shuowen defines it as “where people gather on the water.”',
    '名字用字，也是印面之字。《说文解字》释为“水上人所会也”。',
  )),

  /* paper, writing, cloth */
  g('料紙', 'りょうし', 'Ryōshi (decorated paper)', '料纸', t(
    '書や歌を書くために、染めや箔、墨流しで飾った紙。',
    'Paper decorated with dye, gold leaf or marbling for calligraphy and poems.',
    '为书写诗文而以染色、金箔、墨流装饰的纸。',
  )),
  g('墨流し', 'すみながし', 'Suminagashi (ink marbling)', '墨流', t(
    '水面に墨を落として模様をつくり、紙を置いて写し取る技法。',
    'Floating ink on water, then laying paper on it to lift the pattern.',
    '在水面滴墨成纹，再覆纸把纹样转印下来。',
  )),
  g('暖簾', 'のれん', 'Noren (shop curtain)', '暖帘', t(
    '店先に掛ける布。会計でいう「のれん」（営業権）の語源。',
    'A shop-front curtain; in Japanese accounting, noren is the word for goodwill.',
    '挂在店门口的布帘；日本会计中的“のれん”即商誉，语源于此。',
  )),
  g('詞書', 'ことばがき', 'Kotobagaki (text column)', '词书', t(
    '絵巻や絵に添えられた文章。',
    'The text written beside the pictures of a handscroll.',
    '绘卷或画作旁所附的文字。',
  )),
  g('異時同図法', 'いじどうずほう', 'Iji dōzu (continuous narrative)', '异时同图法', t(
    '同じ人物を一つの画面に何度も描き、時間の流れを表す手法。',
    'Showing the same person several times in one picture to tell the passing of time.',
    '在同一画面中多次描绘同一人物，以表现时间的推移。',
  )),
  g('すやり霞', 'すやりがすみ', 'Suyari-gasumi (mist bands)', '带状云霞', t(
    '絵巻や屏風で場面を区切り、距離や時間を省く帯状の霞。',
    'Bands of mist that divide scenes on scrolls and screens and skip over distance and time.',
    '绘卷与屏风上分隔场景、省略距离与时间的带状云霞。',
  )),

  /* time and tempo */
  g('序破急', 'じょはきゅう', 'Jo-ha-kyū', '序破急', t(
    '雅楽や能に由来する構成。ゆるやかに始まり、展開し、速く結ぶ。',
    'A tempo from gagaku and Noh: a slow opening, a building middle, a swift close.',
    '源自雅乐与能乐的结构：缓起、展开、急收。',
  )),
  g('間', 'ま', 'Ma (interval)', '间', t(
    'ものとものの間にある、意味をもつ空白や沈黙。',
    'A meaningful pause or space between things.',
    '事物之间有意义的空白与停顿。',
  )),
  g('節気', 'せっき', 'Sekki (solar term)', '节气', t(
    '太陽の位置で一年を二十四に分けた季節の区切り。奥付の日付に使う。',
    'One of the 24 solar terms that divide the year by the sun’s position; the colophon is dated by them.',
    '依太阳位置把一年分为二十四段的季节节点；牌记以此纪日。',
  )),
];
