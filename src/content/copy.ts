/**
 * Section copy (DESIGN §6 content keys). Owner: WP-01. Node-safe.
 *
 * House style (DESIGN §9):
 * - ja: 常体 everywhere except the Contact letter and form messages (敬体). Concrete numbers and dates.
 *   No manual spaces between kana/kanji and Latin or digits (`text-autospace` in src/styles/type.css adds them).
 * - en: US spelling, sentence case, digits, arrows for before → after. Japanese terms italicised at most once
 *   per section by the renderer; the glossary explains them.
 * - zh: 简体书面语，大陆术语，全角标点，正文阿拉伯数字。Stage lines tell the Chinese printing heritage
 *   (十竹斋饾版, 毕昇活字与王祯转轮排字架, 拱花, and the Song paper decorated by dropping ink on water that
 *   苏易简《文房四谱·纸谱》 records: 「傅于水面，能点墨或丹青于上……以纸布其上而受采焉」) and are never translated
 *   from ja. (The same passage names a paste-dragged paper 流沙笺; it is a different technique, so it is not used.)
 * - Display-face strings (titles, stage lines, letter) stay short: every CJK glyph set in a display face
 *   grows that face's font subset (WP-02 R9).
 *
 * Verified claims behind the copy are listed in the WP-01 hand-over (sources: JAANUS, Kotobank, MLIT,
 * Wikipedia, The Met, nippon.com).
 */
import type { T, Copy, Figure } from './types';
import { person } from './facts';

const t = (ja: string, en: string, zh: string): T => ({ ja, en, zh });
const fig = (file: string, caption: T, alt: T): Figure => ({ file, caption, alt });

const LANGUAGES = t(
  '日本語（母語）・英語（業務で使用）・中国語（HSK5級）',
  'Japanese (native) · English (professional) · Mandarin (HSK 5)',
  '日语（母语）、英语（工作语言）、中文（HSK5级）',
);
const OVERLAP = t('時差のある地域と重なる時間', 'Overlap hours', '跨时区可协作时段');
const RYOGOKU = fig(
  'night/hiroshige-ryogoku-moon.jpg',
  t('歌川広重「東都名所 両国之宵月」（1831年頃）', 'Utagawa Hiroshige, Twilight Moon at the Ryōgoku Bridge, c. 1831', '歌川广重《东都名所 两国之宵月》（约1831年）'),
  t(
    '両国橋の太い橋脚の間から、隅田川の舟と宵の月を見る。夜の版にだけ掛ける一枚',
    'The evening moon and boats on the Sumida River, framed by the heavy timber piers of Ryōgoku Bridge: the print that hangs only at night',
    '透过两国桥粗大的木桥墩，望见隅田川上的小船与傍晚的月亮——只在夜间版面出现的一幅',
  ),
);

export const copy: Copy = {
  cover: {
    layer: t('表紙', 'Cover', '封面'),
    title: t('摺上り', 'The Impression', '印成'),
    stage: t('一年に一版、八年で一枚の錦絵', 'An impression is a pulled print, and the mark a person leaves', '如十竹斋饾版：一年一版，八年套成一幅'),
    takeaway: t(
      '8年間、分散システムと開発者基盤を設計・運用し、Webの描画性能を磨いてきた。',
      '8 years building and running distributed systems, developer platforms and fast web UIs.',
      '8年来设计、运维分布式系统与开发者平台，也专攻Web渲染性能。',
    ),
    name: t('瀬川 湊', 'Minato Segawa', '濑川 凑'),
    nameLines: t('瀬川|湊', 'Minato|Segawa', '濑川|凑'),
    role: t('シニアソフトウェアエンジニア', 'Senior Software Engineer', '高级软件工程师'),
    facts: {
      years: t('8年（2018年4月から）', '8 years, since April 2018', '8年（2018年4月起）'),
      specialty: t('分散システム、開発者基盤、Webの描画性能', 'Distributed systems, developer platforms, web rendering performance', '分布式系统、开发者平台、Web渲染性能'),
      location: t('東京（日本時間）', 'Tokyo (JST)', '东京（日本时间）'),
      availability: t('2027年1月から', 'From January 2027', '2027年1月起'),
      languages: LANGUAGES,
    },
    express: {
      works: t('作品', 'Works', '作品'),
      cv: t('履歴書', 'CV', '简历'),
      contact: t('連絡先', 'Contact', '联系方式'),
      skipFilm: t('映像を飛ばす', 'Skip the film', '跳过影片'),
    },
    peelHint: t('角をめくる', 'Lift the corner', '掀起一角'),
    blockCaption: t('表は、彫られた裏の鏡像である', 'Every interface is the mirror of what was carved beneath it', '每个界面，都是其下所刻之物的镜像'),
  },

  summary: {
    layer: t('覚書', 'Summary', '摘要'),
    title: t('八年を三行で', 'Eight years in three sentences', '三句话说八年'),
    stage: t('版下は、彫られて消える下絵', 'Pasted face-down, the drawing is carved away', '写样反贴上版，刻成即无'),
    takeaway: t(
      '8年で3社。カード決済、物流、月間900万人のマーケットプレイス。',
      '3 companies in 8 years: card payments, logistics and a 9-million-user marketplace.',
      '8年3家公司：银行卡支付、物流，以及月活900万的交易平台。',
    ),
    paragraphs: [
      t(
        '東京を拠点に8年、カード決済、物流の配車、月間900万人が使うマーケットプレイスで、分散システムを設計し、運用してきた。',
        'For 8 years in Tokyo I have designed and run the distributed systems behind card payments, freight dispatch and a marketplace with 9 million monthly users.',
        '常驻东京8年，为银行卡支付、物流调度和月活900万的交易平台设计并运维分布式系统。',
      ),
      t(
        'ここ数年は基盤と信頼性が中心だ。14チームのデプロイ経路をゴールデンパスにまとめてリードタイムを45分から7分に縮め、決済の可用性を99.99%に引き上げた。',
        'Lately the work is platforms and reliability: golden paths that cut deploy lead time from 45 to 7 minutes across 14 teams, and a resilience program that took checkout to 99.99% availability.',
        '近几年的重心是平台与可靠性：用黄金路径统一14个团队的部署流程，前置时间从45分钟降到7分钟；交易链路可用性做到99.99%。',
      ),
      t(
        'もう一つの軸は描画性能で、動く車両4万台の地図をp95で9ミリ秒に収めた。このサイトの映像も、サイト自身のエンジンで描いている。',
        'The other half is rendering performance: a fleet map that holds 40k moving vehicles at 9 ms p95, and the film on this site, rendered by the site’s own engine.',
        '另一条主线是渲染性能：4万辆移动车辆的地图，p95帧耗时压到9毫秒——本站的影片，也由本站自己的引擎渲染。',
      ),
    ],
    resultsTitle: t('日付のある四つの成果', 'Four dated results', '四项成果，均注明时间'),
    results: ['frame', 'thru', 'deploy', 'mttr'],
    nowTitle: t('いま', 'Now', '近况'),
    now: person.now,
    ledgerTitle: t('職歴', 'Career ledger', '工作经历'),
    ledgerColumns: { company: t('会社', 'Company', '公司'), role: t('役職', 'Role', '职位'), dates: t('期間', 'Dates', '时间'), scope: t('主な担当', 'Scope', '主要职责') },
    ledger: [
      {
        employer: 'hanamichi', role: t('バックエンドエンジニア', 'Backend Engineer', '后端工程师'), from: '2018-04', to: '2020-03',
        scope: t('精算API、カード情報のトークン化、精算台帳の作り直し', 'Settlement API, card tokenization, the ledger rewrite', '结算API、银行卡号令牌化、清算账本重构'),
      },
      {
        employer: 'wataridori', role: t('ソフトウェアエンジニア', 'Software Engineer', '软件工程师'), from: '2020-04', to: '2021-03',
        scope: t('配車API、140サービス横断のトレーシング', 'Dispatch API, tracing across 140 services', '调度API、覆盖140个服务的链路追踪'),
      },
      {
        employer: 'wataridori', role: t('シニアソフトウェアエンジニア（2021年4月に昇格）', 'Senior Software Engineer (promoted April 2021)', '高级软件工程师（2021年4月晋升）'), from: '2021-04', to: '2021-12',
        scope: t('WebGLの車両地図レンダラー、kentoの公開', 'WebGL fleet-map renderer; open-sourced kento', 'WebGL实时车辆地图渲染器；开源kento'),
      },
      {
        employer: 'wataridori', role: t('テックリード（エンジニア6名）', 'Tech Lead (6 engineers)', '技术负责人（带6名工程师）'), from: '2022-01', to: '2023-06',
        scope: t('配車基盤のイベント駆動への移行（14か月、無停止）', 'Moving dispatch to events (14 months, zero downtime)', '调度平台迁往事件驱动（14个月，零停机）'),
      },
      {
        employer: 'kairo', role: t('シニアソフトウェアエンジニア（開発者プラットフォーム）', 'Senior Software Engineer, Developer Platform', '高级软件工程师（开发者平台）'), from: '2023-07', to: null,
        scope: t(
          'ゴールデンパス。2024年11月からインシデントコマンダー輪番のリード、2025年10月からプラットフォーム信頼性のリード',
          'Golden paths; incident-commander rotation lead since November 2024; platform reliability lead since October 2025',
          '黄金路径；2024年11月起任故障指挥官轮值负责人，2025年10月起任平台可靠性负责人',
        ),
      },
    ],
    overlapTitle: OVERLAP,
    languagesLine: LANGUAGES,
    educationLine: person.education,
    figure: fig(
      'hokusai/manga-perspective.jpg',
      t('葛飾北斎『北斎漫画』より、遠近法の頁（1834年頃の刊本）', 'Katsushika Hokusai, a perspective page from Hokusai Manga, probably 1834', '葛饰北斋《北斋漫画》透视法一页（约1834年刊本）'),
      t(
        '消失点へ集まる線で描いた通りと、画面を三つに割って天と地を決める「三ツワリの法」の図。下段には人物の素描。消えていく下絵、つまり設計図としての版下',
        'A double page: a street drawn on lines that meet at a vanishing point, and Hokusai’s “three-part rule” that splits a picture into ceiling and floor, with figure sketches below: the plan that disappears into the work',
        '一页对开：沿汇向消失点的线条画出的街道，以及把画面三分、定出天与地的“三分法”图，下方是人物速写——终将消失在成品里的设计图',
      ),
    ),
  },

  road: {
    layer: t('道中', 'The Road', '旅途'),
    title: t('道中', 'The Road', '旅途'),
    stage: t('同じ旅人を、七つの宿に描く', 'One traveler, drawn at seven stations', '一个旅人，七个驿站，八个年头'),
    takeaway: t(
      '2018年から2026年まで、年ごとの役職と担当、二つの成果を宿場ごとにたどる。',
      '2018 to 2026 in seven stations: each year’s role, scope and 2 measured outcomes.',
      '2018至2026年，七个驿站：每年的职位、职责与两项成果。',
    ),
    skip: t('映像を飛ばす', 'Skip the film', '跳过影片'),
    directionNote: t('道は江戸から京へ。右から左へ読む。', 'Read right to left, as the road runs from Edo to Kyoto.', '自右向左阅读，一如道路从江户通向京都。'),
    refLabel: t('原画', 'Original print', '原作'),
    yearUnit: t('年', 'year', '年'),
  },

  works: {
    layer: t('屏風', 'Works', '作品'),
    title: t('屏風に、六つの仕事', 'Six cases on a folding screen', '六扇屏风，六个案例'),
    stage: t('表具は、下地の骨組みを隠して仕上げる', 'The mount hides the lattice beneath', '装裱之下，是看不见的木骨'),
    takeaway: t(
      '六つの事例を、問・術・答・省の順に読む。',
      'Six case studies, each told as problem, method, result and reflection.',
      '六个案例，均按问题、方法、结果、反思展开。',
    ),
    directionNote: t('屏風は右から左へ読む。', 'Read right to left, as a folding screen is read.', '屏风自右向左阅读。'),
    read: t('事例を読む', 'Read the case', '阅读案例'),
    backToWorks: t('屏風へ戻る', 'Back to the screen', '返回屏风'),
    prevCase: t('前の扇', 'Previous panel', '上一扇'),
    nextCase: t('次の扇', 'Next panel', '下一扇'),
    labels: {
      problem: t('問', 'Problem', '问'),
      constraints: t('制約', 'Constraints', '约束'),
      role: t('役割', 'Role', '职责'),
      team: t('体制', 'Team', '团队'),
      period: t('期間', 'Period', '周期'),
      method: t('術', 'Method', '术'),
      tradeoffs: t('トレードオフ', 'Trade-offs', '取舍'),
      result: t('答', 'Result', '答'),
      reflection: t('省', 'Reflection', '省'),
    },
  },

  skills: {
    layer: t('組子', 'Skills', '技能'),
    title: t('釘を使わずに組む', 'A stack joined without nails', '不用一根钉子'),
    stage: t('組子は釘を使わない。だから組み直せる', 'Kumiko uses no nails, so it can be taken apart', '毕昇活字，王祯转轮：拆得开，排得齐'),
    takeaway: t(
      '技術ごとに、本番での年数、最後に使った年、案件数、規模を示す。',
      'Each tool with its years in production, last production use, projects and scale.',
      '每项技术：生产年限、最近一次生产使用、项目数与规模。',
    ),
    yearsUnit: t('年', 'years', '年'),
    projectsUnit: t('件', 'projects', '个项目'),
    lastUsed: t('本番での最終使用', 'Last production use', '最近一次生产使用'),
    architectureToggle: t('構造', 'Architecture', '架构'),
    architectureCaption: t(
      'リクエストの経路：エッジ（Envoy）→ Goのサービス → Kafka → 読み取りモデル（PostgreSQL、ClickHouse）→ 可観測性（OpenTelemetry、Prometheus）',
      'Request path: edge (Envoy) → Go services → Kafka → read models (PostgreSQL, ClickHouse) → observability (OpenTelemetry, Prometheus)',
      '请求路径：边缘网关（Envoy）→ Go服务 → Kafka → 读模型（PostgreSQL、ClickHouse）→ 可观测性（OpenTelemetry、Prometheus）',
    ),
    specFigure: fig(
      'hokusai/manga-pattern-construction.jpg',
      t('葛飾北斎『北斎漫画』より、文様の描き方の頁（1834年頃の刊本）', 'Katsushika Hokusai, how to draw repeat patterns, from Hokusai Manga, probably 1834', '葛饰北斋《北斋漫画》纹样画法一页（约1834年刊本）'),
      t(
        '青海波、亀甲、麻の葉、紗綾形などの割り付けを、描く順とともに示した見開き。実装の横に置く仕様書',
        'A double page setting out seigaiha, tortoiseshell, hemp-leaf and key-fret patterns with notes on how to draw each: the spec beside the implementation',
        '一页对开，列出青海波、龟甲、麻叶、纱绫形等纹样的作图方法——放在实现旁边的规格书',
      ),
    ),
    learnFigure: fig(
      'ukie/toyoharu-dutch-perspective.jpg',
      t('新しい技術の学び方：異国の道具を取り入れた江戸の絵師', 'How I learn a new stack: Edo artists adopting a foreign toolset', '我怎样学新技术：江户画师吸收外来的透视法'),
      t(
        '歌川豊春「阿蘭陀浮絵」の一枚。西洋の銅版画にならい、石造りの街と橋、網を打つ舟を遠近法で描いている',
        'Utagawa Toyoharu, from Dutch Perspective Pictures: a stone city, a bridge and fishermen casting a net, drawn with perspective learned from European prints',
        '歌川丰春《阿兰陀浮绘》中的一幅：仿照欧洲铜版画，用透视法画出石砌街市、石桥与撒网的渔船',
      ),
    ),
    kikkoFigure: fig(
      'pattern/seiei-moon-kikko.jpg',
      t('山田直三郎『精英』より（1907年）', 'Yamada Naosaburō, Seiei: A Design Book, 1907', '山田直三郎《精英》图案集（1907年）'),
      t(
        '深い緑の地を斜めに切って、六角と三角が組み合う籠目の格子が走り、その上に金色の柑橘が実る明治の図案。色の入った升目で、平らな格子が奥行きを持ちはじめる',
        'A Meiji design page: a diagonal band of kagome lattice, hexagons and triangles woven together, under golden citrus on deep green. With color in its cells, a flat grid starts to gain depth',
        '明治时期的图案页：深绿底上斜贯一道笼目格子，六角与三角相互交织，上方结着金色柑橘；格中填了色，平面格子开始有了纵深',
      ),
    ),
  },

  principles: {
    layer: t('枯山水', 'Principles', '原则'),
    title: t('五つの石', 'Five stones', '五块石'),
    stage: t('砂紋は、乱れるたびに引き直す', 'Gravel is re-raked after every disturbance', '枯山水的砂纹，一乱便重新耙平'),
    takeaway: t(
      '仕事の原則を五つ。砂紋は、決済APIの一年分のレイテンシで引いた。',
      'Five working principles. The sand is raked from a year of checkout latency data.',
      '五条工作原则；砂纹按下单API一年的延迟数据耙出。',
    ),
    rerake: t('整える', 'Re-rake', '重新耙平'),
    rakeToggle: t('熊手を持つ', 'Pick up the rake', '拿起耙子'),
    showData: t('データを見る', 'Show the data', '查看数据'),
    hideData: t('データを閉じる', 'Hide the data', '收起数据'),
    tableCaption: t(
      '決済APIの週次p99レイテンシ（2025年10月20日〜2026年10月18日）',
      'Weekly p99 latency of the checkout API, October 20, 2025 → October 18, 2026',
      '下单API每周p99延迟（2025年10月20日至2026年10月18日）',
    ),
    weekLabel: t('週', 'Week', '周'),
    p99Label: t('p99（ミリ秒）', 'p99 (ms)', 'p99（毫秒）'),
    sev1Label: t('SEV-1（重大障害）', 'SEV-1 incidents', 'SEV-1（一级故障）'),
    legend: t(
      '砂紋52本 = 52週分の決済p99レイテンシ（2025年10月20日〜2026年10月18日）・輪 = SEV-1。半径は影響を受けた利用者の割合に比例・SLOは12か月中11か月で達成',
      '52 rows = 52 weeks of checkout p99 latency, 2025-10-20 → 2026-10-18 · rings = SEV-1 incidents, radius ∝ users affected · SLO met 11 of 12 months',
      '52道砂纹 = 52周下单API的p99延迟（2025年10月20日至2026年10月18日）· 圆环 = SEV-1故障，半径与受影响用户比例成正比 · 12个月中11个月达成SLO',
    ),
    mistFigure: fig(
      'landscape/motonobu-ink-landscape.jpg',
      t('伝 狩野元信「山水図」（17世紀）', 'Attributed to Kano Motonobu, Ink Landscape, 17th century', '传狩野元信《山水图》（17世纪）'),
      t(
        '霧の奥に遠い山並みと小舟。庭の背後に、ごく淡く掛ける',
        'Distant peaks and small boats in mist, hung very faintly behind the garden',
        '雾霭深处的远山与小舟，极淡地衬在庭园之后',
      ),
    ),
  },

  achievements: {
    layer: t('番付', 'Achievements', '成就'),
    title: t('番付と空摺', 'Seen and unseen', '番付与拱花'),
    stage: t('空摺は、光が斜めに差すときだけ見える', 'Blind embossing shows only in raking light', '拱花无墨，斜光乃见'),
    takeaway: t(
      '数字は順位と日付つきで。信頼性は、障害のときにだけ見える。',
      'Ranked, dated numbers, and reliability, which shows only in a crisis.',
      '数字排名次、注日期；可靠性只在危机时显现。',
    ),
    banzukeNote: t(
      '江戸の番付の最高位は大関。「横綱」の文字が番付に載ったのは1890年から。',
      'Edo-period ranking sheets were topped by ōzeki; "yokozuna" first appeared on a banzuke in 1890.',
      '江户番付以大关为最高位；“横纲”二字首次登上番付是在1890年。',
    ),
    sealsTitle: t('四つの印', 'Four seals', '四方印'),
    sealLegend: {
      rose: t('朱文——陽刻。数字が上がった', '朱文 — raised: the number went up', '朱文——阳刻：数字上升'),
      fell: t('白文——陰刻。数字が下がった', '白文 — incised: the number went down', '白文——阴刻：数字下降'),
    },
    chartsTitle: t('砂子のグラフ', 'Charts in gold dust', '洒金图表'),
    karazuriTitle: t('空摺', 'Karazuri', '拱花'),
    karazuriCaption: t(
      '信頼性は空摺だ。光が斜めに差すとき、つまり危機のときにだけ見える。',
      'Reliability is karazuri: visible only when light rakes across it — which is to say, in a crisis.',
      '可靠性如拱花：唯有斜光掠过时才显现，也就是在危机之中。',
    ),
    inkIt: t('墨を入れる', 'Ink it', '上墨'),
    lightAngle: t('光の角度', 'Light angle', '光线角度'),
    credentialsTitle: t('学歴・表彰・語学', 'Credentials', '学历·奖项·语言'),
    credentials: [person.education, person.awards[0]!, LANGUAGES],
    pinesFigure: fig(
      'landscape/shonen-aged-pines.jpg',
      t('鈴木松年「老松図屏風」（19世紀後半）', 'Suzuki Shōnen, Aged Pines, late 19th century', '铃木松年《老松图》屏风（19世纪后期）'),
      t(
        '金地に墨だけで描いた老松の大枝。長く続く仕事のしるしとして、番付の横に置く',
        'A great bough of an old pine in ink alone on gold leaf, set beside the ranking sheet as a sign of work that lasts',
        '金地上只用墨画出的老松粗枝，放在番付旁，寓意长久的工作',
      ),
    ),
  },

  writing: {
    layer: t('墨流し', 'Writing', '写作'),
    title: t('料紙と墨流し', 'Decorated paper', '笺纸与墨流'),
    stage: t('水に浮かべた墨を、紙に写し取る', 'Ink floats on water; paper lifts the pattern', '宋人笺纸：点墨水面，覆纸受采'),
    takeaway: t(
      '公開したコード、記事、登壇。どれも人前で描いた模様だ。',
      'Open-source code, articles and talks: patterns made in public.',
      '开源代码、文章与演讲——都是公开留下的纹样。',
    ),
    reposTitle: t('オープンソース', 'Open source', '开源项目'),
    articlesTitle: t('記事', 'Articles', '文章'),
    talksTitle: t('登壇', 'Talks', '演讲'),
    dropHint: t('クリックで墨を落とす・ドラッグで梳く', 'Click to drop ink · drag to comb', '点击滴墨·拖动梳纹'),
    dropCentre: t('中央に墨を落とす', 'Drop ink at the center', '在中央滴墨'),
    takePrint: t('紙を置く', 'Take a print', '覆纸取印'),
    download: t('画像を保存', 'Download', '下载图片'),
    share: t('リンクを共有', 'Share link', '分享链接'),
    reset: t('流し直す', 'Start over', '重新开始'),
    starsLabel: t('スター', 'stars', '星标'),
    latestLabel: t('最新リリース', 'Latest release', '最新版本'),
    figures: {
      header: fig(
        'writing/hokkei-first-writing.jpg',
        t('魚屋北渓「書き初めの支度をする橘逸勢」（1823年）', 'Totoya Hokkei, Tachibana no Hayanari preparing to make the first writing of the New Year, 1823', '鱼屋北溪《准备新年试笔的橘逸势》（1823年）'),
        t(
          '筆立てと硯箱を前に、能書家の橘逸勢が新年の書き初めに向かう摺物。書く仕事の始まり',
          'A surimono of the calligrapher Tachibana no Hayanari at his brushes and writing box, about to make the first writing of the year: where writing begins',
          '一幅摺物：书法家橘逸势面对笔筒与砚箱，准备新年第一次落笔——写作由此开始',
        ),
      ),
      oss: fig(
        'writing/gakutei-spider-web.jpg',
        t('八島岳亭「糸と蜘蛛の巣の箱を見る唐美人」（1824年頃）', "Yashima Gakutei, Two Chinese Women Examining Thread and a Spider's Web in a Box, c. 1824", '八岛岳亭《观盒中丝线与蛛网的唐装女子》（约1824年）'),
        t(
          '七夕の夜、小箱に蜘蛛を入れ、巣のかかり具合で手芸の上達を占う。その箱を見に来た唐装の女性。ウェブで編むオープンソースへの小さな洒落',
          "A woman in Chinese dress comes to look into a small box where a spider has spun its web overnight, a Tanabata custom for divining skill at needlework: a quiet pun on open source woven on the Web",
          '七夕之夜把蜘蛛放进小盒，次晨看结网疏密以卜巧拙——即“喜蛛应巧”。画中唐装女子前来看盒，也是对“在网上编织开源”的一个小小双关',
        ),
      ),
      articles: fig(
        'writing/gakutei-paper.jpg',
        t('八島岳亭「一陽連 文房四友 紙 定家」（1827年頃）', 'Yashima Gakutei, Paper: Fujiwara no Sadaie (Teika), c. 1827', '八岛岳亭《一阳连文房四友 纸 定家》（约1827年）'),
        t(
          '文房四友の「紙」。歌人の藤原定家が、紙と本を積んだ机に向かう。書いて残すこと、つまり記事',
          'Paper, one of the four friends of the writing table: the poet Fujiwara no Teika at a desk stacked with paper and books, for the articles',
          '文房四友之“纸”：歌人藤原定家坐在堆满纸与书的案前——写下来、留下来，对应文章',
        ),
      ),
      talks: fig(
        'writing/gakutei-brush.jpg',
        t('八島岳亭「一陽連 文房四友 筆 衛夫人」（1827年頃）', 'Yashima Gakutei, Brush: Lady Wei, c. 1827', '八岛岳亭《一阳连文房四友 笔 卫夫人》（约1827年）'),
        t(
          '文房四友の「筆」。王羲之に書を教えた衛夫人が筆をとる。教えること、つまり登壇',
          'Brush, from the same set: Lady Wei, who taught Wang Xizhi calligraphy, at her desk, for the talks, which are teaching',
          '文房四友之“笔”：曾教王羲之书法的卫夫人执笔案前——传授，对应演讲',
        ),
      ),
    },
  },

  testimonials: {
    layer: t('暖簾', 'Testimonials', '推荐'),
    title: t('暖簾', 'Goodwill', '口碑'),
    stage: t('最後の版は、他人が摺る', 'The last block is printed by other people', '最后一块版，由他人来印'),
    takeaway: t(
      '一緒に働いた三人の言葉と、人を育てた記録。',
      'Three people I worked with, in their own words, and a record of mentoring.',
      '三位共事者的评价，以及带人的记录。',
    ),
    leadershipTitle: t('育成とリーダーシップ', 'Mentoring and leadership', '带人与领导力'),
    leadershipLabels: {
      mentees: t('メンタリングしたエンジニア', 'Engineers mentored', '带教的工程师'),
      promoted: t('うち昇格', 'Of them promoted', '其中晋升'),
      interviews: t('採用面接', 'Hiring interviews', '参与面试'),
      onboarding: t('オンボーディングガイドの読者', 'Onboarding guide readers', '入职指南读者'),
      rfcs: t('RFC', 'RFCs', 'RFC文档'),
      ics: t('育てたインシデントコマンダー', 'Incident commanders trained', '培养的故障指挥官'),
    },
    figureDay: fig(
      'tokaido/48-seki.jpg',
      t('歌川広重「東海道五拾三次之内 関 本陣早立」（1833〜34年頃）', 'Utagawa Hiroshige, Seki: Early Departure from the Main Camp, c. 1833/34', '歌川广重《东海道五十三次之内 关 本阵早立》（约1833—34年）'),
      t(
        '夜明け前の本陣。家紋を染めた大きな幕が張られ、大名行列が出立の支度をしている。幕は暖簾と響き合う',
        "A daimyo's train readies to leave the main inn before dawn, behind great curtains dyed with the family crest: they rhyme with the noren",
        '黎明前的本阵，染着家纹的大幅幕帘下，大名队列正准备出发——幕帘与暖帘相互呼应',
      ),
    ),
    figureNight: RYOGOKU,
  },

  contact: {
    layer: t('京', 'Contact', '联系'),
    title: t('京へ、着く', 'Arriving in Kyoto', '抵达京师'),
    stage: t('旅の終わりではなく、次の仕事の始まり。', 'Not an ending: the start of the next job', '不是旅程的终点，而是下一份工作的开始。'),
    takeaway: t(
      '2027年1月から参画可能。返信は1営業日以内。',
      'Available from January 2027; replies within 1 business day.',
      '2027年1月起可入职，1个工作日内回复。',
    ),
    letter: [
      t(
        '2027年1月から、シニアまたはスタッフエンジニアとして新しい仕事をお引き受けできます。',
        'From January 2027 I can take on a new Senior or Staff role, full-time or advisory.',
        '2027年1月起，我可以承担新的高级或资深（Staff）工程师工作。',
      ),
      t(
        '分散システム、開発者基盤、Webの描画性能にかかわる課題でしたら、規模を問わずお聞かせください。',
        'If your problem involves distributed systems, developer platforms or rendering performance, at any scale, I would like to hear about it.',
        '如果您的课题与分布式系统、开发者平台或渲染性能有关，无论规模大小，都欢迎来信。',
      ),
      t('お返事は、1営業日以内にいたします。', 'I reply within 1 business day, Tokyo time.', '我会在1个工作日内回复。'),
    ],
    signature: t('瀬川 湊', 'Minato Segawa', '濑川 凑'),
    form: {
      name: t('お名前', 'Name', '姓名'),
      email: t('メールアドレス', 'Email', '电子邮箱'),
      message: t('ご用件', 'Message', '留言'),
      send: t('送信する', 'Send', '发送'),
      sending: t('送信しています…', 'Sending…', '正在发送…'),
      sent: t('送信しました。ありがとうございます。', 'Sent. Thank you.', '已发送，谢谢。'),
      error: t('送信できませんでした。お手数ですが、メールでお送りください。', 'Could not send. Please email me instead.', '发送失败，请直接发送电子邮件。'),
      mailtoNote: t('送信すると、お使いのメールソフトが開きます。', 'Sending opens your email app.', '点击发送将打开您的邮件应用。'),
    },
    copyEmail: t('アドレスをコピー', 'Copy address', '复制邮箱地址'),
    copied: t('コピーしました', 'Copied', '已复制'),
    cvTitle: t('履歴書（PDF）', 'CV (PDF)', '简历（PDF）'),
    cv: { ja: t('日本語版', 'Japanese', '日文版'), en: t('英語版', 'English', '英文版'), zh: t('中国語版', 'Chinese', '中文版') },
    availabilityTitle: t('参画可能な時期', 'Availability', '可入职时间'),
    overlapTitle: OVERLAP,
    responseTime: person.responseTime,
    workAuth: person.availability.workAuth,
    relocation: person.availability.relocation,
    arrival: t('京師 三条大橋 — 江戸より百二十六里、着。', 'Sanjō Bridge, Kyoto — 126 ri from Edo. Arrived.', '京师三条大桥——自江户一百二十六里，抵达。'),
    figure: fig(
      'tokaido/55-kyoto.jpg',
      t('歌川広重「東海道五拾三次 大尾 京師 三条大橋」（1833〜34年頃）', 'Utagawa Hiroshige, Kyoto: The Great Bridge at Sanjō, ca. 1833–34', '歌川广重《东海道五十三次 大尾 京师 三条大桥》（约1833—34年）'),
      t(
        '旅人が三条大橋を渡って京に入る。背後に東山。題の札には「大尾」とあり、ここで五十五枚の揃物が終わる',
        'Travelers cross the Sanjō Bridge into Kyoto below the Higashiyama hills; the title cartouche reads 大尾, "the end", closing the series of 55 prints',
        '旅人走过三条大桥进入京都，身后是东山；标题框上写着“大尾”，五十五幅组画到此结束',
      ),
    ),
  },

  colophon: {
    layer: t('奥付', 'Colophon', '版权页'),
    title: t('奥付', 'Colophon', '牌记'),
    stage: t('享保七年より、新刊は作者と版元の名を記す', 'From 1722, Edo books named author and publisher', '牌记：记下谁刻、谁印、何时印成'),
    takeaway: t(
      'このサイトをつくった道具、画像、重さの記録。',
      'How this site was made: tools, images, page weight and build.',
      '本站的制作记录：工具、图像、体积与构建。',
    ),
    bookTitle: t('八度摺', 'Eight Impressions', '八版套印'),
    author: t('著者 瀬川 湊', 'Author: Minato Segawa', '著者 濑川 凑'),
    publisher: t('版元 瀬川 湊（東京）', 'Publisher: Minato Segawa, Tokyo', '刊印 濑川 凑（东京）'),
    carving: t('彫', 'Carving', '刻'),
    printing: t('摺', 'Printing', '印'),
    paper: t('料紙', 'Paper', '用纸'),
    pictures: t('画', 'Pictures', '图'),
    weightLabel: t('転送量', 'Page weight', '传输量'),
    vitalsLabel: t('表示の指標', 'Web Vitals', '页面性能指标'),
    buildLabel: t('ビルド', 'Build', '构建'),
    editionPattern: t('第{v}版 第{n}刷', 'Edition {v}, impression {n}', '第{v}版 第{n}次印刷'),
    datePattern: t('令和{y}年 {term} 摺', 'Printed at {term}, {yyyy}', '{yyyy}年{term} 印'),
    finale: t('大尾', 'The end', '大尾'),
    todaysPrint: t('今日の一枚', "Today's print", '今日之印'),
    savePrint: t('この一枚を保存', 'Save the print', '保存这张印'),
    libraries: [
      { name: 'three', version: '0.186.1', licence: 'MIT' },
      { name: 'gsap', version: '3.15.0', licence: "Standard 'No Charge' License" },
      { name: 'lenis', version: '1.3.27', licence: 'MIT' },
      { name: 'mediabunny', version: '1.62.1', licence: 'MPL-2.0' },
      { name: 'vite', version: '8.3.4', licence: 'MIT' },
      { name: 'typescript', version: '7.0.2', licence: 'Apache-2.0' },
      { name: 'playwright', version: '1.64.1', licence: 'Apache-2.0' },
      { name: 'sharp', version: '0.35.5', licence: 'Apache-2.0' },
    ],
    fonts: [
      { family: 'IBM Plex Sans JP', licence: 'OFL-1.1' }, { family: 'IBM Plex Sans', licence: 'OFL-1.1' }, { family: 'IBM Plex Mono', licence: 'OFL-1.1' },
      { family: 'Noto Sans SC', licence: 'OFL-1.1' }, { family: 'Noto Serif SC', licence: 'OFL-1.1' }, { family: 'Martian Mono', licence: 'OFL-1.1' },
      { family: 'Shippori Mincho B1', licence: 'OFL-1.1' }, { family: 'Shippori Antique B1', licence: 'OFL-1.1' }, { family: 'Zen Antique', licence: 'OFL-1.1' },
      { family: 'Zen Old Mincho', licence: 'OFL-1.1' }, { family: 'Dela Gothic One', licence: 'OFL-1.1' }, { family: 'DotGothic16', licence: 'OFL-1.1' },
      { family: 'Kaisei Tokumin', licence: 'OFL-1.1' }, { family: 'Kaisei HarunoUmi', licence: 'OFL-1.1' }, { family: 'Yuji Mai', licence: 'OFL-1.1' },
      { family: 'Klee One', licence: 'OFL-1.1' }, { family: 'Bodoni Moda', licence: 'OFL-1.1' }, { family: 'Schibsted Grotesk', licence: 'OFL-1.1' },
      { family: 'Big Shoulders', licence: 'OFL-1.1' }, { family: 'Bricolage Grotesque', licence: 'OFL-1.1' }, { family: 'Handjet', licence: 'OFL-1.1' },
      { family: 'Newsreader', licence: 'OFL-1.1' }, { family: 'Gloock', licence: 'OFL-1.1' }, { family: 'ZCOOL XiaoWei', licence: 'OFL-1.1' },
      { family: 'ZCOOL QingKe HuangYou', licence: 'OFL-1.1' }, { family: 'Ma Shan Zheng', licence: 'OFL-1.1' }, { family: 'Zhi Mang Xing', licence: 'OFL-1.1' },
      { family: 'Long Cang', licence: 'OFL-1.1' },
    ],
    booksFigure: fig(
      'writing/gakutei-book-cart.jpg',
      t('八島岳亭「車付きの本箱の紐を引く女」（1825年頃）', 'Yashima Gakutei, A Woman Pulling the Cord of a Wheeled Book Case, c. 1825', '八岛岳亭《拉带轮书箱绳索的女子》（约1825年）'),
      t(
        '本を積んだ車付きの本箱を、紐で引き寄せる女性。このサイトが引いて歩く依存ライブラリ',
        'A woman drawing a wheeled book case stacked with volumes toward her by its cord: the libraries this site pulls along',
        '女子拉着绳索，把堆满书册的带轮书箱拉到身边——本站一路拖着走的依赖库',
      ),
    ),
    nightFigure: RYOGOKU,
  },

  notFound: {
    title: t('この頁は見つからない', 'Page not found', '页面不存在'),
    line: t('この糸の先には、まだ何も無い。', 'Nothing at the end of this thread yet.', '这根丝线的尽头，还什么都没有。'),
    home: t('表紙へ戻る', 'Back to the cover', '回到封面'),
    figure: fig(
      'writing/gakutei-spider-web.jpg',
      t('八島岳亭「糸と蜘蛛の巣の箱を見る唐美人」（1824年頃）', "Yashima Gakutei, Two Chinese Women Examining Thread and a Spider's Web in a Box, c. 1824", '八岛岳亭《观盒中丝线与蛛网的唐装女子》（约1824年）'),
      t(
        '蜘蛛の巣の入った小箱をのぞきに来た唐装の女性。糸の先は、まだ空っぽ',
        "A woman in Chinese dress comes to look into a small box for a spider's web: the thread, so far, leads nowhere",
        '唐装女子前来察看盒中的蛛网——丝线的尽头，暂时空空如也',
      ),
    ),
  },
};
