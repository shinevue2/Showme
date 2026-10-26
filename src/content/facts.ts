/**
 * Canonical facts (DESIGN Appendix B). Owner: WP-01.
 * Numbers never change (Appendix B is the master). Every fact is fictional sample data (`prov: 'persona-sample'`, §1.4).
 * Node-safe: no DOM, no imports beyond types.
 *
 * House style (DESIGN §9):
 * - ja: 常体; Arabic digits in horizontal body, kanji numerals in vertical display text (banzuke, quotes).
 *   No manual spaces between kana/kanji and Latin or digits: `text-autospace` adds them (src/styles/type.css).
 * - en: US spelling, sentence case, digits, arrows for before → after.
 * - zh: 简体书面语，大陆术语；正文阿拉伯数字，番付与印面用大写数字；同样不手动在中西文之间加空格。
 */
import type {
  T, Person, Employer, Metric, Plate, Station, Chapter, CaseStudy, Domain, Tool, Principle, Ops, Banzuke,
  Chart, ReliabilityFigure, Repo, Article, Talk, Testimonial, Leadership, EmployerId, ToolId,
} from './types';

const t = (ja: string, en: string, zh: string): T => ({ ja, en, zh });
const P = 'persona-sample' as const;
const ALL: readonly EmployerId[] = ['hanamichi', 'wataridori', 'kairo'];
const SOURCE = t('チームのダッシュボードから書き出し（サンプルデータ）', 'Team dashboard export (sample data)', '团队看板导出（示例数据）');

/* ---------- B.1 person ---------- */
export const person: Person = {
  name: t('瀬川 湊', 'Minato Segawa', '濑川 凑'),
  nameRuby: 'せがわ みなと',
  sealGlyph: '湊',
  role: t('シニアソフトウェアエンジニア', 'Senior Software Engineer', '高级软件工程师'),
  yearsLabel: t('経験8年（2018年4月から）', '8 years, since April 2018', '从业8年（2018年4月起）'),
  since: '2018-04',
  specialty: t(
    '分散システム、開発者プラットフォーム、Webの描画性能',
    'Distributed systems, developer platforms and web rendering performance',
    '分布式系统、开发者平台与Web渲染性能',
  ),
  location: t('東京（JST、UTC+9）', 'Tokyo, Japan (JST, UTC+9)', '日本东京（JST，UTC+9）'),
  timezone: 'Asia/Tokyo',
  availability: {
    from: '2027-01',
    kinds: t(
      'シニア／スタッフエンジニアとしての正社員、またはアドバイザー',
      'Senior or Staff roles, full-time, or advisory work',
      '高级或资深（Staff）工程师全职岗位，或技术顾问',
    ),
    notice: t('現職の引き継ぎに2か月', "Two months' notice", '离职交接需2个月'),
    workAuth: t('日本国籍（国内での就労に制限なし）', 'Japanese citizen (no restrictions on work in Japan)', '日本国籍（在日本工作不受限制）'),
    relocation: t(
      '東京からリモートまたはハイブリッドで勤務。シンガポール・上海への転居も可',
      'Remote or hybrid from Tokyo; open to relocating to Singapore or Shanghai',
      '常驻东京，可远程或混合办公；也可迁居新加坡或上海',
    ),
  },
  overlap: [
    { label: t('欧州（CET）', 'Europe (CET)', '欧洲（CET）'), startJST: '16:00', endJST: '19:00', zone: 'Europe/Berlin' },
    { label: t('米国西海岸（PT）', 'US West Coast (PT)', '美国西海岸（PT）'), startJST: '08:00', endJST: '10:00', zone: 'America/Los_Angeles' },
  ],
  languages: [
    { lang: 'ja', level: t('日本語：母語', 'Japanese: native', '日语：母语') },
    { lang: 'en', level: t('英語：業務で使用（英語圏のリモートチームで3年）', 'English: professional (3 years in an English-speaking remote team)', '英语：工作语言（曾在英语远程团队工作3年）') },
    { lang: 'zh', level: t('中国語（普通話）：HSK5級。ビジネス文書の読解と会話', 'Mandarin Chinese: HSK 5, business reading and conversation', '中文（普通话）：HSK5级，可阅读商务文件、进行商务沟通') },
  ],
  education: t(
    '学士（工学）、情報科学専攻。2018年、国内の国立大学を卒業',
    'B.Eng. in Information Science, 2018 (a national university in Japan)',
    '工学学士，信息科学专业，2018年毕业于日本一所国立大学',
  ),
  awards: [t(
    '海路エンジニアリング賞 2025（社内表彰）：レジリエンス・プログラム',
    'Kairo Engineering Award 2025 (internal), for the resilience program',
    '2025年度海路工程奖（公司内部奖项），表彰异地多活容灾项目',
  )],
  now: t(
    '海路でプラットフォームの信頼性をリードしている。scrubkitを保守しながら、フレーム単位で正確な動画スクラブについて書いている。',
    'Leading platform reliability at Kairo; maintaining scrubkit; writing about frame-accurate video scrubbing.',
    '在海路负责平台可靠性，维护scrubkit，并在写一篇关于逐帧精准视频拖动的文章。',
  ),
  responseTime: t('1営業日以内に返信（日本時間）', 'Replies within 1 business day (JST)', '1个工作日内回复（日本时间）'),
  prov: P,
};

/* ---------- B.2 employers ---------- */
export const employers: readonly Employer[] = [
  {
    id: 'hanamichi', name: t('花道ペイメンツ', 'Hanamichi Payments', '花道支付'),
    descriptor: t('東京のカード決済スタートアップ', 'A card-payments startup in Tokyo', '东京的一家银行卡支付创业公司'),
    from: '2018-04', to: '2020-03', headcount: t('約40名', '≈ 40 people', '约40人'), prov: P,
  },
  {
    id: 'wataridori', name: t('渡り鳥ロジスティクス', 'Wataridori Logistics', '候鸟物流'),
    descriptor: t('リモートファーストの物流SaaS', 'A remote-first logistics SaaS company', '远程优先的物流SaaS公司'),
    from: '2020-04', to: '2023-06', headcount: t('約300名', '≈ 300 people', '约300人'), prov: P,
  },
  {
    id: 'kairo', name: t('海路', 'Kairo', '海路'),
    descriptor: t('月間利用者約900万人のC2Cマーケットプレイス', 'A C2C marketplace with ≈ 9 million monthly users', '月活约900万的C2C交易平台'),
    from: '2023-07', to: null, headcount: t('約1,200名', '≈ 1,200 people', '约1200人'), prov: P,
  },
];

/* ---------- B.4 metrics ---------- */
export const metrics: readonly Metric[] = [
  {
    id: 'settle', label: t('精算バッチの所要時間', 'Settlement batch time', '日终清算跑批耗时'),
    before: '6 h', after: '50 min', display: t('6時間 → 50分', '6 h → 50 min', '6小时 → 50分钟'),
    unit: t('所要時間', 'duration', '耗时'), direction: 'fell', period: '2019', employer: 'hanamichi',
    context: t(
      '冪等キーとパーティション分割で、夜間精算を短くし、再実行しても安全にした',
      'Idempotency keys and a partitioned batch made the nightly run shorter and safe to retry',
      '引入幂等键并对跑批分区，夜间清算更快，也能安全重跑',
    ),
    source: SOURCE, prov: P,
  },
  {
    id: 'pci', label: t('PCI DSSの対象範囲', 'PCI DSS scope', 'PCI DSS合规范围'),
    before: '23', after: '3', display: t('23 → 3サービス', '23 → 3 services', '23 → 3个服务'),
    unit: t('サービス', 'services', '个服务'), direction: 'fell', period: '2019', employer: 'hanamichi',
    context: t(
      'カード番号をトークン化して対象を3サービスに封じ込め、監査は一度で通過',
      'Tokenizing card numbers confined the scope to 3 services; the audit passed first time',
      '卡号令牌化后，范围收敛到3个服务，审计一次通过',
    ),
    source: SOURCE, prov: P,
  },
  {
    id: 'mttd', label: t('平均検知時間（MTTD）', 'Mean time to detect (MTTD)', '平均发现时间（MTTD）'),
    before: '38 min', after: '6 min', display: t('38分 → 6分', '38 → 6 min', '38 → 6分钟'),
    unit: t('分', 'min', '分钟'), direction: 'fell', period: '2020', employer: 'wataridori',
    context: t(
      '140サービスを横断するトレーシングで、顧客より先に障害に気づけるようになった',
      'Tracing across 140 services meant we saw faults before customers did',
      '覆盖140个服务的全链路追踪，让故障先于用户被发现',
    ),
    source: SOURCE, prov: P,
  },
  {
    id: 'frame', label: t('地図レンダラーのp95フレーム時間（車両4万台）', 'Map renderer p95 frame time (40k vehicles)', '地图渲染p95帧耗时（4万辆车）'),
    before: '38 ms', after: '9 ms', display: t('38 → 9 ms', '38 → 9 ms', '38 → 9 ms'),
    unit: t('ミリ秒', 'ms', '毫秒'), direction: 'fell', period: '2021', employer: 'wataridori',
    context: t(
      'インスタンス描画とベクタータイルの逐次配信で、動く車両4万台を60fpsに保った',
      'Instanced glyphs and streamed vector tiles held 40k moving vehicles at 60 fps',
      '实例化绘制加矢量瓦片流式加载，4万辆移动车辆稳定在60fps',
    ),
    source: SOURCE, prov: P,
  },
  {
    id: 'thru', label: t('配車のスループット', 'Dispatch throughput', '调度吞吐量'),
    before: '2.1k events/s', after: '25k events/s',
    display: t('×12', '×12', '×12'),
    unit: t('イベント/秒', 'events/s', '事件/秒'), direction: 'rose', period: '2022–23', employer: 'wataridori',
    context: t(
      '毎秒2,100 → 25,000イベント、無停止。ストラングラーフィグ方式で、モノリスをKafkaのイベント駆動へ移した',
      '2.1k → 25k events/s with zero downtime: a strangler-fig migration moved the monolith onto Kafka events',
      '每秒2100 → 25000个事件，全程零停机：以绞杀者模式把单体逐步迁到Kafka事件驱动',
    ),
    source: SOURCE, seal: { face: t('拾弐倍', '×12', '拾贰倍'), side: t('2022–23 配車基盤', '2022–23 · dispatch', '2022–23 调度平台') }, prov: P,
  },
  {
    id: 'deploy', label: t('デプロイのリードタイム（中央値）', 'Deploy lead time (median)', '部署前置时间（中位数）'),
    before: '45 min', after: '7 min', display: t('45分 → 7分', '45 → 7 min', '45 → 7分钟'),
    unit: t('分', 'min', '分钟'), direction: 'fell', period: '2023-Q3 → 2024-Q4', employer: 'kairo',
    context: t(
      'ゴールデンパスで、14チームばらばらだったデプロイ経路を一本にした',
      "Golden paths replaced 14 teams' separate deploy pipelines with one",
      '黄金路径把14个团队各自的部署流水线统一为一条',
    ),
    source: SOURCE, seal: { face: t('漆分', '7 min', '柒分'), side: t('2023–24 開発者基盤', '2023–24 · developer platform', '2023–24 开发者平台') }, prov: P,
  },
  {
    id: 'paths', label: t('ゴールデンパスに載ったサービス数', 'Services on golden paths', '接入黄金路径的服务数'),
    before: '0', after: '120', display: t('0 → 120サービス', '0 → 120 services', '0 → 120个服务'),
    unit: t('サービス', 'services', '个服务'), direction: 'rose', period: '2023–24', employer: 'kairo',
    context: t(
      '2024年12月までに120サービスが移行。どのチームも任意で移ってきた',
      '120 services onboarded by December 2024, every one by choice',
      '截至2024年12月接入120个服务，全部出于团队自愿',
    ),
    source: SOURCE, prov: P,
  },
  {
    id: 'avail', label: t('決済の可用性（年間）', 'Checkout availability (annual)', '交易链路可用性（年度）'),
    before: '99.95 %', after: '99.99 %', display: t('99.95% → 99.99%', '99.95 → 99.99%', '99.95% → 99.99%'),
    unit: t('％', '%', '%'), direction: 'rose', period: '2024 → 2025', employer: 'kairo',
    context: t(
      'セル型のマルチリージョン構成と、自動フェイルオーバー',
      'A cell-based multi-region design with automated failover',
      '单元化异地多活架构，加上自动切换',
    ),
    source: SOURCE, seal: { face: t('肆玖', '99.99', '肆玖'), side: t('2025 決済', '2025 · checkout', '2025 交易链路') }, prov: P,
  },
  {
    id: 'rto', label: t('リージョン切替のRTO', 'Regional failover RTO', '区域级故障切换RTO'),
    before: '4 h', after: '15 min', display: t('4時間 → 15分', '4 h → 15 min', '4小时 → 15分钟'),
    unit: t('分', 'min', '分钟'), direction: 'fell', period: '2025', employer: 'kairo',
    context: t(
      '切替を自動化し、ゲームデーで繰り返し通しで試した',
      'Failover automated, then rehearsed end to end in game days',
      '切换流程自动化，并在故障演练中反复全流程实操',
    ),
    source: SOURCE, prov: P,
  },
  {
    id: 'mttr', label: t('MTTR（中央値、全インシデント）', 'MTTR (median, all incidents)', 'MTTR（中位数，全部故障）'),
    before: '44 min', after: '9 min', display: t('44分 → 9分', '44 → 9 min', '44 → 9分钟'),
    unit: t('分', 'min', '分钟'), direction: 'fell', period: '2024 → 2026', employer: 'kairo',
    context: t(
      'インシデントコマンダーの輪番を立ち上げ、SLOアラートを作り直した',
      'An incident-commander rotation and rebuilt SLO alerts',
      '建立故障指挥官轮值，重做SLO告警',
    ),
    source: SOURCE, seal: { face: t('玖分', '9 min', '玖分'), side: t('2024–26 全インシデント', '2024–26 · all incidents', '2024–26 全部故障') }, prov: P,
  },
  {
    id: 'pages', label: t('オンコール1週間あたりの呼び出し', 'Pages per on-call week', '每个值班周的告警呼叫次数'),
    before: '31', after: '4', display: t('31回 → 4回', '31 → 4 pages', '31次 → 4次'),
    unit: t('回', 'pages', '次'), direction: 'fell', period: '2024-Q4 → 2025-Q4', employer: 'kairo',
    context: t(
      'ノイズだけのアラートを消し、SLOの消費速度で呼ぶ設計に変えた',
      'Noisy alerts deleted; pages now fire on SLO burn rate',
      '清理噪声告警，改为按SLO消耗速率呼叫',
    ),
    source: SOURCE, prov: P,
  },
  {
    id: 'mentees', label: t('メンタリングしたエンジニア／うち昇格', 'Engineers mentored / promoted', '带过的工程师／其中晋升'),
    before: '0', after: '11 / 4', display: t('11名／4名', '11 / 4', '11人／4人'),
    unit: t('名', 'engineers', '人'), direction: 'rose', period: '2019–2026', employer: 'all',
    context: t('週1回のペアリングと設計レビュー', 'Weekly pairing and design reviews', '每周结对编程与设计评审'),
    source: SOURCE, prov: P,
  },
  {
    id: 'rfc', label: t('RFC（制度の創設以来）', 'RFCs since founding the process', 'RFC（自建立流程起）'),
    before: '0', after: '38', display: t('0 → 38本', '0 → 38 RFCs', '0 → 38篇'),
    unit: t('本', 'RFCs', '篇'), direction: 'rose', period: '2023-10 → 2026-10', employer: 'kairo',
    context: t(
      '設計の判断を文書に残し、誰でも提案できる場にした',
      'Design decisions are written down, and anyone can propose one',
      '设计决策落成文档，人人都能发起提案',
    ),
    source: SOURCE, prov: P,
  },
];

/* ---------- §3.2 plates ----------
 * Plate 1 ruby: 主版 is read おもはん in ukiyo-e usage (JAANUS "omohan"), not しゅはん as §3.2 prints.
 * Plate 4: the classical spelling is 一斤染 (紅花 one 斤); nipponcolors.com prints 一斥染, a variant of the
 * same colour (#F4A7B9 unchanged). docs/wp-requests/WP-01.md R2 asks the palette/plate owners to align. */
export const plates: readonly Plate[] = [
  { n: 1, numeral: t('壱', 'I', '壹'), name: t('主版 紺', 'Key block, indigo', '主版 绀'), ruby: 'おもはん こん', year: '2018', station: 'nihonbashi' },
  { n: 2, numeral: t('弐', 'II', '贰'), name: t('若竹', 'Young bamboo', '若竹'), ruby: 'わかたけ', year: '2019', station: 'hakone' },
  { n: 3, numeral: t('参', 'III', '叁'), name: t('銀鼠', 'Silver gray', '银鼠'), ruby: 'ぎんねず', year: '2020', station: 'mishima' },
  { n: 4, numeral: t('肆', 'IV', '肆'), name: t('一斤染', 'Pale safflower', '一斤染'), ruby: 'いっこんぞめ', year: '2021', station: 'hara' },
  { n: 5, numeral: t('伍', 'V', '伍'), name: t('瓶覗', 'Jar-peek blue', '瓶覗'), ruby: 'かめのぞき', year: '2022', station: 'shimada' },
  { n: 6, numeral: t('陸', 'VI', '陆'), name: t('ベロ藍', 'Prussian blue', '普鲁士蓝'), ruby: 'べろあい', year: '2023', station: 'okazaki' },
  { n: 7, numeral: t('漆', 'VII', '柒'), name: t('鈍', 'Dull gray', '钝色'), ruby: 'にび', year: '2024–25', station: 'shono' },
  { n: 8, numeral: t('捌', 'VIII', '捌'), name: t('金', 'Gold', '金'), ruby: 'きん', year: '2026', station: 'gold' },
];

/* ---------- B.12 stations ---------- */
export const stations: readonly Station[] = [
  { id: 'nihonbashi', printNo: 1, image: 'tokaido/01-nihonbashi.jpg', name: t('日本橋', 'Nihonbashi', '日本桥'), subtitle: t('朝之景', 'Morning Scene', '朝景') },
  { id: 'hakone', printNo: 11, image: 'tokaido/11-hakone.jpg', name: t('箱根', 'Hakone', '箱根'), subtitle: t('湖水図', 'View of the Lake', '湖水图') },
  { id: 'mishima', printNo: 12, image: 'tokaido/12-mishima.jpg', name: t('三島', 'Mishima', '三岛'), subtitle: t('朝霧', 'Morning Mist', '朝雾') },
  { id: 'hara', printNo: 14, image: 'tokaido/14-hara.jpg', name: t('原', 'Hara', '原'), subtitle: t('朝之富士', 'Mount Fuji in the Morning', '朝之富士') },
  { id: 'shimada', printNo: 24, image: 'tokaido/24-shimada.jpg', name: t('島田', 'Shimada', '岛田'), subtitle: t('大井川駿岸', 'Suruga Bank of the Ōi River', '大井川骏岸') },
  { id: 'okazaki', printNo: 39, image: 'tokaido/39-okazaki.jpg', name: t('岡崎', 'Okazaki', '冈崎'), subtitle: t('矢矧之橋', 'Yahagi Bridge', '矢矧之桥') },
  { id: 'shono', printNo: 46, image: 'tokaido/46-shono.jpg', name: t('庄野', 'Shōno', '庄野'), subtitle: t('白雨', 'Driving Rain', '白雨') },
  { id: 'seki', printNo: 48, image: 'tokaido/48-seki.jpg', name: t('関', 'Seki', '关'), subtitle: t('本陣早立', 'Early Departure from the Main Inn', '本阵早立') },
  { id: 'kyoto', printNo: 55, image: 'tokaido/55-kyoto.jpg', name: t('京師', 'Kyoto', '京师'), subtitle: t('三条大橋', 'The Great Bridge at Sanjō', '三条大桥') },
];

/* ---------- B.3 career chapters (film captions) ---------- */
export const career: readonly Chapter[] = [
  {
    n: 1, year: '2018', station: 'nihonbashi', employer: 'hanamichi',
    role: t('バックエンドエンジニア（新卒）', 'Backend Engineer (new grad)', '后端工程师（应届入职）'),
    headline: t('Goで精算APIを書き、入社4か月目からオンコールに加わった', 'Built the settlement API in Go; joined on-call in month four', '用Go写下结算API，入职第4个月加入值班'),
    scope: t('精算API、夜間バッチ、オンコール', 'Settlement API, nightly batch, on-call', '结算API、夜间跑批、值班'),
    outcomes: [
      t('初めて本番に出したサービス', 'First production service', '第一个上线的生产服务'),
      t('チーム初のランブックを書いた', "Wrote the team's first runbook", '写下团队的第一份运维手册'),
    ],
    plate: 1, metrics: [], prov: P,
  },
  {
    n: 2, year: '2019', station: 'hakone', employer: 'hanamichi',
    role: t('バックエンドエンジニア', 'Backend Engineer', '后端工程师'),
    headline: t('カード情報のトークン化と、精算台帳の作り直し', 'Card tokenization and the ledger rewrite', '银行卡号令牌化，以及清算账本重构'),
    scope: t('トークン化サービス、精算台帳、PCI DSS監査', 'Tokenization service, settlement ledger, PCI DSS audit', '令牌化服务、清算账本、PCI DSS审计'),
    outcomes: [
      t('PCI DSSの対象を23 → 3サービスに（監査は一度で通過）', 'PCI DSS scope 23 → 3 services (audit passed first time)', 'PCI DSS范围 23 → 3个服务（审计一次通过）'),
      t('精算バッチ 6時間 → 50分', 'Settlement batch 6 h → 50 min', '清算跑批 6小时 → 50分钟'),
    ],
    plate: 2, metrics: ['pci', 'settle'], prov: P,
  },
  {
    n: 3, year: '2020', station: 'mishima', employer: 'wataridori',
    role: t('ソフトウェアエンジニア', 'Software Engineer', '软件工程师'),
    headline: t('霧の中の一年。全員リモートで配車基盤を支えた（トラフィックは6倍）', 'A remote-first dispatch platform in a fog year (traffic ×6)', '雾中的一年：全员远程，撑住调度平台（流量×6）'),
    scope: t('配車API、分散トレーシング、アラート設計', 'Dispatch API, distributed tracing, alert design', '调度API、分布式链路追踪、告警设计'),
    outcomes: [
      t('140サービスを横断するトレーシング', 'Tracing across 140 services', '覆盖140个服务的链路追踪'),
      t('MTTD 38分 → 6分', 'MTTD 38 → 6 min', 'MTTD 38 → 6分钟'),
    ],
    plate: 3, metrics: ['mttd'], prov: P,
  },
  {
    n: 4, year: '2021', station: 'hara', employer: 'wataridori',
    role: t('シニアソフトウェアエンジニア', 'Senior Software Engineer', '高级软件工程师'),
    headline: t('シニアに昇格し、WebGLで車両地図のレンダラーを作った', 'Promoted; built the WebGL fleet-map renderer', '晋升高级工程师，做出WebGL实时车辆地图渲染器'),
    scope: t('WebGL2レンダラー、ベクタータイル配信、フレーム予算', 'WebGL2 renderer, vector-tile streaming, frame budget', 'WebGL2渲染器、矢量瓦片流式加载、帧预算'),
    outcomes: [
      t('車両4万台でp95フレーム 38 → 9ミリ秒', 'p95 frame 38 → 9 ms at 40k vehicles', '4万辆车下p95帧耗时 38 → 9毫秒'),
      t('kentoをオープンソースとして公開', 'Open-sourced kento', '开源kento'),
    ],
    plate: 4, metrics: ['frame'], prov: P,
  },
  {
    n: 5, year: '2022', station: 'shimada', employer: 'wataridori',
    role: t('テックリード（エンジニア6名）', 'Tech Lead (6 engineers)', '技术负责人（带6名工程师）'),
    headline: t('配車をモノリスからイベント駆動へ渡した（ストラングラーフィグ）', 'Carried dispatch from a monolith to events (strangler fig)', '把调度系统从单体渡往事件驱动（绞杀者模式）'),
    scope: t('Kafka、Envoyによるルーティング、シャドーリード、二重書き込み', 'Kafka, Envoy routing, shadow reads, dual writes', 'Kafka、Envoy路由、影子读、双写'),
    outcomes: [
      t('14か月、無停止', '14 months, zero downtime', '14个月，零停机'),
      t('スループット ×12', 'Throughput ×12', '吞吐量 ×12'),
    ],
    plate: 5, metrics: ['thru'], prov: P,
  },
  {
    n: 6, year: '2023', station: 'okazaki', employer: 'kairo',
    role: t('シニアソフトウェアエンジニア（開発者プラットフォーム）', 'Senior SWE, Developer Platform', '高级软件工程师（开发者平台）'),
    headline: t('14チームをつなぐゴールデンパス', 'Golden paths bridging 14 teams', '黄金路径，连通14个团队'),
    scope: t('Kubernetesのテンプレート、Terraformモジュール、共通CI、スコアカード', 'Kubernetes templates, Terraform modules, paved CI, scorecards', 'Kubernetes模板、Terraform模块、标准化CI、评分卡'),
    outcomes: [
      t('デプロイのリードタイム 45分 → 7分', 'Deploy lead time 45 → 7 min', '部署前置时间 45 → 7分钟'),
      t('2024年12月までに120サービスが移行', '120 services onboarded by December 2024', '截至2024年12月，120个服务接入'),
    ],
    plate: 6, metrics: ['deploy', 'paths'], prov: P,
  },
  {
    n: 7, year: '2024–25', station: 'shono', employer: 'kairo',
    role: t('シニアソフトウェアエンジニア／インシデントコマンダー', 'Senior SWE / Incident Commander', '高级软件工程师／故障指挥官'),
    headline: t('47分間のリージョン障害（2024年11月12日）、そしてレジリエンス・プログラム', 'A 47-minute regional outage (November 12, 2024), then the resilience program', '一次47分钟的区域故障（2024年11月12日），以及随后的异地多活容灾项目'),
    scope: t('セル型マルチリージョン、自動フェイルオーバー、ゲームデー、SLO', 'Cell-based multi-region, automated failover, game days, SLOs', '单元化异地多活、自动切换、故障演练、SLO'),
    outcomes: [
      t('RTO 4時間 → 15分', 'RTO 4 h → 15 min', 'RTO 4小时 → 15分钟'),
      t('可用性 99.95% → 99.99%', 'Availability 99.95 → 99.99%', '可用性 99.95% → 99.99%'),
    ],
    plate: 7, metrics: ['rto', 'avail'], prov: P,
  },
];

/* ---------- B.5 cases (full 問・術・答・省) ---------- */
export const cases: readonly CaseStudy[] = [
  {
    id: 'ledger', panel: 1, panelLabel: t('第一扇', 'Panel I', '第一扇'),
    title: t('精算台帳の作り直し', 'Settlement ledger rewrite', '清算账本重构'), short: t('精算台帳', 'Ledger', '清算账本'),
    employer: 'hanamichi', period: '2019',
    role: t('設計と実装のリード', 'Design and implementation lead', '设计与开发负责人'),
    team: t('バックエンドエンジニア3名', '3 backend engineers', '后端3人'),
    problem: t(
      '夜間の精算に6時間かかり、途中で止まった処理をリトライすると、まれに同じ決済を二重に精算していた。そのたびに手作業の返金と、加盟店への電話が発生した。',
      'Nightly settlement took 6 hours, and a retry after a half-finished run occasionally settled the same payment twice. Every double settlement meant a manual refund and a phone call to a merchant.',
      '夜间清算跑批要6小时；中途失败后重跑，偶尔会把同一笔交易清算两次。每次重复清算都意味着人工退款，还要给商户打电话解释。',
    ),
    constraints: [
      t('精算に使える時間は夜間の8時間だけ', 'The settlement window was 8 hours overnight', '清算窗口只有夜间8小时'),
      t('作り直しの期間がPCI DSSの監査と重なった', 'The rewrite overlapped the PCI DSS audit', '重构期恰逢PCI DSS审计'),
      t('カードのオーソリは一瞬も止められない', 'Card authorization could not pause, even briefly', '刷卡授权一刻不能停'),
    ],
    method: t(
      '精算の各ステップに冪等キーを持たせ、結果はトランザクショナルアウトボックス経由で書き出す。リトライしても、確定済みの処理は二度と実行されない。バッチは加盟店ごとにパーティション分割し、GoとPostgreSQLで並列に流した。',
      'Every settlement step got an idempotency key and wrote its effects through a transactional outbox, so a retry could only repeat work that had not committed. The batch was partitioned by merchant and run in parallel in Go on PostgreSQL.',
      '每个清算步骤都带幂等键，结果经事务性发件箱（Outbox）写出，重跑只会补做尚未提交的部分。跑批按商户分区，用Go在PostgreSQL上并行执行。',
    ),
    tradeoffs: [
      t('即時精算より、安全に再実行できることを優先した', 'Safe re-runs over real-time settlement', '宁可放弃实时，也要能安全重跑'),
      t('スキーマ移行の間は一時的に二重書き込み', 'Temporary dual writes while the schema moved', '表结构迁移期间临时双写'),
    ],
    result: t('6時間 → 50分。以後、二重精算はゼロ。', '6 h → 50 min; zero double settlements since.', '6小时 → 50分钟；此后再无重复清算。'),
    metrics: ['settle', 'pci'],
    reflection: t(
      'お金が動いている最中のシステムに、冪等性を後から入れた。次は最初の設計レビューで、再実行の手順書とともに入れる。',
      'I retrofitted idempotency into a system that already had money in flight. Next time it goes into the first design review, with a written replay procedure beside it.',
      '当时是在资金已经在流转的系统里补做幂等。下一次，幂等和重放手册会在第一次设计评审时就定下来。',
    ),
    art: { file: 'rinpa/mitsumochi-poppies.jpg', why: t(
      '市松の垣根は台帳の升目。一つも欠けず、一つも重ならない。',
      'The checkered fence is a ledger grid: no cell missing, no cell counted twice.',
      '方格篱笆就是账本的格子：一格不缺，一格不重。',
    ) },
    prov: P,
  },
  {
    id: 'tracing', panel: 2, panelLabel: t('第二扇', 'Panel II', '第二扇'),
    title: t('140サービス横断のトレーシング', 'Tracing across 140 services', '140个服务的全链路追踪'), short: t('トレーシング', 'Tracing', '链路追踪'),
    employer: 'wataridori', period: '2020',
    role: t('可観測性のリード', 'Observability lead', '可观测性负责人'),
    team: t('SRE2名と、各チームの推進役', '2 SREs and a champion in every team', '2名SRE，外加各团队一名对接人'),
    problem: t(
      '140のサービスに、6倍に増えたトラフィック。障害はたいてい顧客が先に見つけた。ログはばらばらで、一つのリクエストを端から端まで追える人はいなかった。',
      'With 140 services and traffic up sixfold, customers usually found incidents before we did. Logs lived in separate places, and nobody could follow one request end to end.',
      '140个服务，流量涨了6倍，故障往往是用户先发现。日志散落各处，没人能把一个请求从头追到尾。',
    ),
    constraints: [
      t('その年、トラフィックは6倍に', 'Traffic grew sixfold that year', '当年流量增长6倍'),
      t('全員がリモート', 'Everyone was remote', '全员远程'),
      t('トレースの保存費用には上限があった', 'Trace storage had a fixed budget', '追踪数据的存储预算有上限'),
    ],
    method: t(
      '共通ライブラリにOpenTelemetryの計装を入れ、各チームは依存を一つ上げるだけでトレースが取れるようにした。テイルサンプリングで遅いトレースと失敗したトレースは全件、残りは一部だけを保存。Prometheusのアラートからは、エグザンプラーで該当トレースへ直接飛べる。',
      'OpenTelemetry instrumentation went into the shared libraries, so each team got tracing by upgrading one dependency. Tail sampling kept every slow or failing trace and a small share of the rest, and Prometheus alerts linked straight to exemplar traces.',
      '把OpenTelemetry埋点做进公共库，各团队升级一个依赖就能接入追踪。尾部采样保留全部慢请求和失败请求，其余只留一小部分；Prometheus告警可通过exemplar直接跳到对应的trace。',
    ),
    tradeoffs: [
      t('全件保存ではなく、テイルサンプリング', 'Tail sampling instead of keeping every trace', '用尾部采样代替全量保存'),
      t('チームごとの計装より、共通ライブラリ', 'Shared libraries over per-team instrumentation', '公共库优先于各团队自行埋点'),
    ],
    result: t('MTTD 38分 → 6分。', 'MTTD 38 → 6 min.', 'MTTD 38 → 6分钟。'),
    metrics: ['mttd'],
    reflection: t(
      '答えるべき問いを決める前にダッシュボードを作り、半分は使われなかった。次は、深夜のオンコールが最初に知りたい五つの問いから始める。',
      'We built dashboards before agreeing on the questions they should answer, and half of them went unused. I would start with the 5 questions on-call asks first at 3 a.m.',
      '当时先做了仪表盘，后定问题，结果一半没人用。下次会先列出值班同学凌晨最想知道的5个问题。',
    ),
    art: { file: 'rinpa/sotatsu-moon-autumn-grasses.jpg', why: t(
      '月明かりで見る秋草。暗がりで障害を見つける。',
      'Grasses seen by moonlight: finding faults in the dark.',
      '借月光看秋草：在暗处找到故障。',
    ) },
    prov: P,
  },
  {
    id: 'mapgl', panel: 3, panelLabel: t('第三扇', 'Panel III', '第三扇'),
    title: t('WebGLの車両地図レンダラー', 'WebGL fleet-map renderer', 'WebGL实时车辆地图渲染器'), short: t('車両地図', 'Fleet map', '车辆地图'),
    employer: 'wataridori', period: '2021',
    role: t('レンダラーの設計と実装', 'Renderer design and implementation', '渲染器设计与实现'),
    team: t('フロントエンドエンジニア2名', '2 front-end engineers', '前端2人'),
    problem: t(
      '配車担当は一日中、車両地図を見ている。動く車両が4万台を超えると毎秒数フレームまで落ち、DOMで描いたマーカーのせいで、パンするたびに画面が固まった。',
      'Dispatchers watch the fleet map all day. Past 40k moving vehicles it fell to a few frames per second, and DOM markers made every pan stall.',
      '调度员整天盯着车辆地图。移动车辆一过4万辆，帧率就掉到个位数，基于DOM的标记让每次拖动都卡顿。',
    ),
    constraints: [
      t('内蔵GPUの、ごく普通の業務用ノートPCで動くこと', 'Ordinary office laptops with integrated graphics', '普通办公笔记本，集成显卡'),
      t('既存の地図タイルは変えない', 'The existing map tiles stayed', '沿用现有地图瓦片'),
      t('全車両をリストでも確認できること', 'Every vehicle also reachable in an accessible list', '所有车辆都能在无障碍列表中查看'),
    ],
    method: t(
      'WebGL2のレンダラーで、車両をインスタンス描画のグリフとして描き、カメラの移動に合わせてベクタータイルを流し込む。フレーム予算を決め、収まらない処理は次のフレームへ回した。',
      'A WebGL2 renderer drew each vehicle as an instanced glyph and streamed vector tiles in under the moving camera. It kept to a fixed frame budget: work that did not fit waited for the next frame.',
      '用WebGL2渲染器把车辆画成实例化图元，随镜头移动流式加载矢量瓦片，并设定帧预算：超出预算的工作顺延到下一帧。',
    ),
    tradeoffs: [
      t('縮小表示ではラベルを優先度順に間引く', 'Labels thinned by priority when zoomed out', '缩小时按优先级抽稀标签'),
      t('古いブラウザには静的な地図を出す', 'Older browsers get a static map', '旧浏览器降级为静态地图'),
    ],
    result: t('車両4万台でp95フレーム 38 → 9ミリ秒。', 'p95 frame 38 → 9 ms at 40k vehicles.', '4万辆车下p95帧耗时 38 → 9毫秒。'),
    metrics: ['frame'],
    reflection: t(
      '再現できるベンチマークより先に最適化を始めてしまい、初期の作業の一部は当て推量だった。今は計測の仕組みを最初に作る。',
      'I started optimizing before I had a repeatable benchmark, and some early work was guesswork. Now the measurement harness comes first.',
      '当时在有可复现的基准之前就开始优化，前期有些工作是在猜。现在一定先搭测量工具。',
    ),
    art: { file: 'rinpa/fans-upon-waves.jpg', why: t(
      '流れに乗る扇。動くカメラの下を流れるベクタータイル。',
      'Fans riding moving water: vector tiles streamed under a moving camera.',
      '扇面随水而行：镜头移动，矢量瓦片随之流入。',
    ) },
    prov: P,
  },
  {
    id: 'strangler', panel: 4, panelLabel: t('第四扇', 'Panel IV', '第四扇'),
    title: t('配車基盤、ストラングラーフィグでイベント駆動へ', 'Dispatch: a strangler-fig migration to events', '调度平台：以绞杀者模式迁往事件驱动'), short: t('ストラングラー', 'Strangler fig', '绞杀者迁移'),
    employer: 'wataridori', period: '2022–23',
    role: t('テックリード', 'Tech lead', '技术负责人'),
    team: t('エンジニア6名', '6 engineers', '6名工程师'),
    problem: t(
      '配車は、共有DBを抱えた一つのモノリスだった。繁忙期の負荷に耐えられず、デプロイのたびにチーム全員が張り詰めた夜を過ごした。',
      'Dispatch ran as one monolith on a shared database. It could not keep up in peak season, and every deploy meant a tense evening for the whole team.',
      '调度系统是一个共用数据库的单体，扛不住旺季流量；每次发布，全组都要提心吊胆熬一晚。',
    ),
    constraints: [
      t('配車は一度も止められない', 'Dispatch could never stop', '调度一刻不能停'),
      t('その間も機能開発は続く', 'Feature work continued throughout', '迁移期间新功能照常交付'),
      t('一斉切替はしない', 'No big-bang cutover', '不做一次性切换'),
    ],
    method: t(
      'モノリスの前にEnvoyのルーティング層を置き、機能を一つずつ、Kafkaのイベントで動くGoのサービスへ移した。移すときはまずシャドーリードで旧系と結果を突き合わせ、一致を確かめてから二重書き込みで切り替えた。',
      'An Envoy routing layer went in front of the monolith and moved one capability at a time to Go services on Kafka events. Each move ran shadow reads against the monolith first, then switched over with dual writes once the results matched.',
      '在单体前加一层Envoy路由，把功能逐个迁到基于Kafka事件的Go服务上。每次迁移先做影子读，与旧系统比对结果；结果一致后，再通过双写切换。',
    ),
    tradeoffs: [
      t('一時期、運用コストがほぼ倍になった', 'Running costs nearly doubled for a while', '一段时间内运维成本接近翻倍'),
      t('追跡画面では結果整合性を受け入れた', 'Accepted eventual consistency in tracking views', '轨迹查询接受最终一致'),
    ],
    result: t('14か月、無停止。スループット ×12。', '14 months, zero downtime, throughput ×12.', '14个月，零停机，吞吐量×12。'),
    metrics: ['thru'],
    reflection: t(
      '切り戻しの手順書を書いたのは、3か月目に冷や汗をかいてからだった。最初の経路を移す前、1週目に書くべきだった。',
      'We wrote the rollback runbook after a scare in month three. It belongs in week one, before the first route moves.',
      '回滚预案是在第3个月出了一次险情之后才写的。它应该在第1周、第一条路由迁移之前就写好。',
    ),
    art: { file: 'rinpa/korin-irises-yatsuhashi.jpg', why: t(
      '八橋のジグザグの板橋。一枚ずつ渡る。',
      'The zig-zag plank bridge at Yatsuhashi, crossed one plank at a time.',
      '八桥曲折，一块木板一块木板地走过去。',
    ) },
    prov: P,
  },
  {
    id: 'platform', panel: 5, panelLabel: t('第五扇', 'Panel V', '第五扇'),
    title: t('開発者プラットフォーム「ゴールデンパス」', 'Developer platform: golden paths', '开发者平台：黄金路径'), short: t('ゴールデンパス', 'Golden paths', '黄金路径'),
    employer: 'kairo', period: '2023–24',
    role: t('プラットフォーム設計のリード', 'Platform design lead', '平台架构负责人'),
    team: t('プラットフォームチーム5名', 'A platform team of 5', '平台组5人'),
    problem: t(
      '14チームが、それぞれ独自のデプロイ手段を抱えていた。変更が本番に届くまで中央値で45分。監査のたびに、14通りのパイプラインから証跡を集めていた。',
      '14 teams each kept their own way to deploy. A median change took 45 minutes to reach production, and every audit meant collecting evidence from 14 different pipelines.',
      '14个团队各有一套部署方式。一次变更上线的中位耗时是45分钟；每逢审计，都要从14条不同的流水线里收集证据。',
    ),
    constraints: [
      t('移行は各チームの任意', 'Adoption was voluntary', '是否迁移由团队自愿'),
      t('既存の監査要件はそのまま', 'Existing audit requirements stayed', '既有审计要求不变'),
      t('プロダクト開発は止めない', 'No freeze on product work', '业务开发不停'),
    ],
    method: t(
      'Kubernetesのゴールデンパス・テンプレート、クラウド資源にはTerraformモジュール、そして監査の証跡が副産物として残る共通CI。スコアカードで、各サービスの現在地と次の一歩を見せた。',
      'Golden-path templates on Kubernetes, Terraform modules for the cloud pieces, and one paved CI pipeline that left audit evidence as a side effect. Scorecards showed each service where it stood and what to do next.',
      '基于Kubernetes的黄金路径模板，云资源用Terraform模块，再加一条标准化CI流水线，审计证据作为副产物自动留存。评分卡告诉每个服务：现在在哪，下一步做什么。',
    ),
    tradeoffs: [
      t('完全な自由より、良い既定値', 'Good defaults over full flexibility', '好的默认值优先于完全的灵活'),
      t('例外は認める。ただし文書で', 'Exceptions allowed, but written down', '允许例外，但要写成文档'),
    ],
    result: t('リードタイム 45分 → 7分。120サービスが移行。', 'Lead time 45 → 7 min; 120 services onboarded.', '前置时间 45 → 7分钟；120个服务接入。'),
    metrics: ['deploy', 'paths'],
    reflection: t(
      '最初のスコアカードは成績表のように読まれ、二つのチームから強い反発を受けた。次の一歩を書き添えた道標として見せ直してから、ようやく使われ始めた。次は最初から道標として出す。',
      'The first scorecards read like grades, and two teams pushed back hard. Reframed as signposts with the next step spelled out, they started getting used. I would ship them as signposts from day one.',
      '第一版评分卡读起来像成绩单，两个团队强烈反弹。改成标明下一步的路标之后，大家才开始用。下次会从第一天起就做成路标。',
    ),
    art: { file: 'rinpa/kiitsu-morning-glories.jpg', why: t(
      '見えない垣を伝い、毎朝咲き直す朝顔。育ち続けるテンプレート。',
      'Morning glories climbing an unseen trellis, opening again every morning: templates that keep growing.',
      '牵牛花沿着看不见的篱架攀援，每天清晨重新开放：持续生长的模板。',
    ) },
    prov: P,
  },
  {
    id: 'resilience', panel: 6, panelLabel: t('第六扇', 'Panel VI', '第六扇'),
    title: t('マルチリージョンのレジリエンス・プログラム', 'Multi-region resilience program', '异地多活容灾项目'), short: t('レジリエンス', 'Resilience', '多活容灾'),
    employer: 'kairo', period: '2025',
    role: t('プログラムリード、インシデントコマンダー', 'Program lead and incident commander', '项目负责人兼故障指挥官'),
    team: t('5チーム横断の12名', '12 engineers across 5 teams', '跨5个团队的12名工程师'),
    problem: t(
      '2024年11月12日、リージョン障害で決済が47分間止まった。机上の復旧計画は4時間。それを通しで実行したことのある人は、誰もいなかった。',
      'On November 12, 2024, a regional outage took checkout down for 47 minutes. The recovery plan on paper said 4 hours, and nobody had ever run it end to end.',
      '2024年11月12日，一次区域故障让下单功能中断47分钟。纸面上的恢复预案要4小时，而且从没人完整演练过。',
    ),
    constraints: [
      t('決済は止められない', 'Checkout could not stop', '下单不能停'),
      t('予算は1年分', 'One year of budget', '预算只有1年'),
      t('途中に年末商戦を挟む', 'The year-end sale fell mid-program', '中途要扛年末大促'),
    ],
    method: t(
      '決済をセルに分け、各セルが複数のリージョンで独立して動くようにし、切替は自動化した。ゲームデーでわざと壊し、エラーバジェット付きのSLOで進め方を決め、見つかった問題は必ず担当者つきのチケットにした。',
      'Checkout was split into cells that each run independently in more than one region, with automated failover between them. Game days broke things on purpose, SLOs with error budgets set the pace, and every finding became a ticket with an owner.',
      '把交易链路拆成多个单元，每个单元都能在多个区域独立运行，并实现自动切换。通过故障演练主动制造故障，用带错误预算的SLO控制节奏，发现的每个问题都落成有人负责的工单。',
    ),
    tradeoffs: [
      t('全サービスではなく、まず決済の経路から', 'Checkout path first, not every service', '先做交易链路，而非全部服务'),
      t('コストより復旧時間', 'Recovery time over cost', '恢复时间优先于成本'),
    ],
    result: t('RTO 4時間 → 15分。可用性 99.95% → 99.99%。', 'RTO 4 h → 15 min; availability 99.95 → 99.99%.', 'RTO 4小时 → 15分钟；可用性 99.95% → 99.99%。'),
    metrics: ['rto', 'avail', 'mttr'],
    reflection: t(
      '最初のゲームデーはリージョン丸ごとの切替で、大きすぎて学びが濁った。次は依存先一つ、セル一つから始めて広げる。',
      'Our first game day was a full regional failover, too big to learn from cleanly. I would start with one dependency and one cell, and grow from there.',
      '第一次演练就做整个区域切换，规模太大，问题混在一起看不清。下次会从一个依赖、一个单元开始，逐步放大。',
    ),
    art: { file: 'rinpa/korin-rough-waves.jpg', why: t('荒波を、受け止める。', 'Rough water, held.', '浪再大，也稳得住。') },
    prov: P,
  },
];

/* ---------- §6.5 domains ---------- */
export const domains: readonly Domain[] = [
  {
    id: 'web', name: t('Webプラットフォームとグラフィックス', 'Web platform and graphics', 'Web平台与图形'),
    pattern: 'asanoha', patternName: t('麻の葉', 'Asanoha (hemp leaf)', '麻叶纹'),
    why: t('一つの格子から、多くの形', 'Many shapes from one grid', '一套网格，千般形状'),
  },
  {
    id: 'backend', name: t('バックエンドと分散システム', 'Back end and distributed systems', '后端与分布式系统'),
    pattern: 'kaku-asanoha', patternName: t('角麻の葉', 'Kaku-asanoha (square hemp leaf)', '角麻叶纹'),
    why: t('固い契約', 'Rigid contracts', '契约要硬'),
  },
  {
    id: 'data', name: t('データ', 'Data', '数据'),
    pattern: 'masu', patternName: t('枡組', 'Masu-gumi (box grid)', '枡形格'),
    why: t('升目は、そのまま表になる', 'A grid is already a table', '方格本身就是表格'),
  },
  {
    id: 'infra', name: t('インフラと信頼性', 'Infrastructure and reliability', '基础设施与可靠性'),
    pattern: 'kikko', patternName: t('亀甲', 'Kikkō (tortoiseshell)', '龟甲纹'),
    why: t('長く、揺るがない', 'Longevity and stability', '长久而稳固'),
  },
  {
    id: 'practice', name: t('実践とリーダーシップ', 'Practice and leadership', '工程实践与领导力'),
    pattern: 'mitsukude', patternName: t('三組手', 'Mitsukude (three-way joint)', '三组手'),
    why: t('釘なしで三本が支え合う。人も同じ', 'Three strips hold each other without nails, and so do people', '三根木条不用钉子，彼此撑住；人也一样'),
  },
];

/* ---------- B.6 tools ---------- */
export const tools: readonly Tool[] = [
  { id: 'ts', name: 'TypeScript', domain: 'web', years: 7, since: '2019', lastProduction: '2026', projects: 9, employers: ALL, scale: t('120万行のモノレポ', 'A 1.2M-line monorepo', '120万行代码的单仓（monorepo）'), cases: ['mapgl', 'platform'], neighbours: ['react', 'threejs', 'webperf', 'node'] },
  { id: 'react', name: 'React', domain: 'web', years: 6, since: '2019', lastProduction: '2025', projects: 6, employers: ALL, scale: t('エンジニア40名が使うデザインシステム', 'A design system used by 40 engineers', '40名工程师在用的设计系统'), cases: ['platform'], neighbours: ['ts', 'a11y'] },
  { id: 'threejs', name: 'three.js / WebGL', domain: 'web', years: 5, since: '2021', lastProduction: '2026', projects: 4, employers: ['wataridori', 'kairo'], scale: t('動く車両4万台を60fpsで', '40k moving vehicles at 60 fps', '4万辆移动车辆，60fps'), cases: ['mapgl'], neighbours: ['ts', 'webperf', 'webgpu'] },
  { id: 'webperf', name: 'Web performance', domain: 'web', years: 6, since: '2020', lastProduction: '2026', projects: 7, employers: ['wataridori', 'kairo'], scale: t('p95フレーム 38 → 9ミリ秒', 'p95 frame 38 → 9 ms', 'p95帧耗时 38 → 9毫秒'), cases: ['mapgl'], neighbours: ['threejs', 'ts'] },
  { id: 'a11y', name: 'Accessibility', domain: 'web', years: 4, since: '2022', lastProduction: '2026', projects: 4, employers: ['wataridori', 'kairo'], scale: t('3製品のWCAG 2.2 AA監査', 'WCAG 2.2 AA audits of 3 products', '3款产品的WCAG 2.2 AA审计'), cases: [], neighbours: ['react'] },
  { id: 'webgpu', name: 'WebGPU', domain: 'web', years: 1, since: '2025', lastProduction: '2026', projects: 1, employers: ['kairo'], scale: t('試作レンダラー', 'A prototype renderer', '原型渲染器'), cases: [], neighbours: ['threejs'] },
  { id: 'go', name: 'Go', domain: 'backend', years: 8, since: '2018', lastProduction: '2026', projects: 12, employers: ALL, scale: t('毎秒25,000イベントの配車', 'Dispatch at 25k events/s', '每秒2.5万事件的调度'), cases: ['ledger', 'strangler', 'resilience'], neighbours: ['grpc', 'kafka', 'postgres', 'k8s'] },
  { id: 'rust', name: 'Rust', domain: 'backend', years: 3, since: '2023', lastProduction: '2026', projects: 3, employers: ['kairo'], scale: t('ホットパスのパーサーでCPU −61%', 'Hot-path parser, −61% CPU', '热点路径解析器，CPU降低61%'), cases: [], neighbours: ['go'] },
  { id: 'node', name: 'Node.js', domain: 'backend', years: 5, since: '2019', lastProduction: '2023', projects: 5, employers: ['hanamichi', 'wataridori'], scale: t('3アプリのBFF', 'BFF for 3 apps', '3个应用的BFF'), cases: [], neighbours: ['ts'] },
  { id: 'grpc', name: 'gRPC', domain: 'backend', years: 6, since: '2020', lastProduction: '2026', projects: 8, employers: ['wataridori', 'kairo'], scale: t('140サービス間の通信', 'Calls between 140 services', '140个服务间通信'), cases: ['tracing', 'strangler'], neighbours: ['go', 'envoy'] },
  { id: 'kafka', name: 'Kafka', domain: 'backend', years: 5, since: '2021', lastProduction: '2026', projects: 5, employers: ['wataridori', 'kairo'], scale: t('3クラスター、1日18億メッセージ', '3 clusters, 1.8B messages a day', '3个集群，日均18亿条消息'), cases: ['strangler'], neighbours: ['go', 'clickhouse'] },
  { id: 'postgres', name: 'PostgreSQL', domain: 'data', years: 8, since: '2018', lastProduction: '2026', projects: 9, employers: ALL, scale: t('4 TB、毎秒4万書き込み', '4 TB, 40k writes/s', '4 TB，每秒4万次写入'), cases: ['ledger', 'strangler'], neighbours: ['go', 'redis'] },
  { id: 'redis', name: 'Redis', domain: 'data', years: 7, since: '2019', lastProduction: '2026', projects: 6, employers: ALL, scale: t('毎秒12万操作のレート制限', 'Rate limiting at 120k ops/s', '每秒12万次操作的限流'), cases: [], neighbours: ['postgres', 'go'] },
  { id: 'clickhouse', name: 'ClickHouse', domain: 'data', years: 3, since: '2023', lastProduction: '2026', projects: 2, employers: ['kairo'], scale: t('イベント180億行', '18B rows of events', '180亿行事件数据'), cases: [], neighbours: ['kafka', 'otel'] },
  { id: 'k8s', name: 'Kubernetes', domain: 'infra', years: 6, since: '2020', lastProduction: '2026', projects: 7, employers: ['wataridori', 'kairo'], scale: t('3リージョン、600ノード', '600 nodes in 3 regions', '3个区域，600个节点'), cases: ['strangler', 'platform', 'resilience'], neighbours: ['terraform', 'envoy', 'go'] },
  { id: 'terraform', name: 'Terraform', domain: 'infra', years: 6, since: '2020', lastProduction: '2026', projects: 6, employers: ['wataridori', 'kairo'], scale: t('管理リソース1,900件', '1,900 managed resources', '纳管资源1900个'), cases: ['platform', 'resilience'], neighbours: ['k8s', 'aws'] },
  { id: 'aws', name: 'AWS (multi-region)', domain: 'infra', years: 8, since: '2018', lastProduction: '2026', projects: 10, employers: ALL, scale: t('3リージョンのアクティブ・アクティブ', '3 regions, active-active', '3区域多活'), cases: ['resilience'], neighbours: ['terraform', 'k8s'] },
  { id: 'envoy', name: 'Envoy', domain: 'infra', years: 4, since: '2022', lastProduction: '2026', projects: 3, employers: ['wataridori', 'kairo'], scale: t('月間900万ユーザーのエッジ', 'Edge for 9M monthly users', '承载月活900万用户的边缘网关'), cases: ['strangler', 'resilience'], neighbours: ['grpc', 'k8s'] },
  { id: 'otel', name: 'OpenTelemetry', domain: 'infra', years: 6, since: '2020', lastProduction: '2026', projects: 5, employers: ['wataridori', 'kairo'], scale: t('140サービスを横断するトレース', 'Traces across 140 services', '覆盖140个服务的链路追踪'), cases: ['tracing'], neighbours: ['prom', 'clickhouse'] },
  { id: 'prom', name: 'Prometheus', domain: 'infra', years: 6, since: '2020', lastProduction: '2026', projects: 6, employers: ['wataridori', 'kairo'], scale: t('アクティブ系列120万', '1.2M active series', '120万活跃时间序列'), cases: ['tracing', 'resilience'], neighbours: ['otel', 'slo'] },
  { id: 'slo', name: 'SLOs and error budgets', domain: 'infra', years: 5, since: '2021', lastProduction: '2026', projects: 4, employers: ['wataridori', 'kairo'], scale: t('38サービスのSLO', 'SLOs for 38 services', '38个服务的SLO'), cases: ['resilience'], neighbours: ['prom', 'incident'] },
  { id: 'design', name: 'System design and RFCs', domain: 'practice', years: 6, since: '2020', lastProduction: '2026', projects: 10, employers: ['wataridori', 'kairo'], scale: t('RFCの制度を創設（38本）', 'Founded the RFC process (38 RFCs)', '创立RFC流程（38篇）'), cases: ['strangler', 'platform'], neighbours: ['writing', 'mentoring'] },
  { id: 'incident', name: 'Incident command', domain: 'practice', years: 3, since: '2023', lastProduction: '2026', projects: 3, employers: ['kairo'], scale: t('指揮したインシデント23件（うちSEV-1が2件）', '23 incidents commanded, 2 of them SEV-1', '指挥故障23起，其中2起为SEV-1'), cases: ['resilience'], neighbours: ['slo', 'mentoring'] },
  { id: 'mentoring', name: 'Mentoring', domain: 'practice', years: 7, since: '2019', lastProduction: '2026', projects: 11, employers: ALL, scale: t('メンティー11名、うち4名が昇格', '11 mentees, 4 promoted', '带教11人，其中4人晋升'), cases: [], neighbours: ['design', 'incident'] },
  { id: 'writing', name: 'Technical writing', domain: 'practice', years: 8, since: '2018', lastProduction: '2026', projects: 9, employers: ALL, scale: t('記事6本、RFC 38本、ランブック', '6 articles, 38 RFCs, runbooks', '文章6篇、RFC 38篇，以及运维手册'), cases: [], neighbours: ['design'] },
];

/**
 * Localised display names for every tool (Appendix A gives `Tool.name` as one string, so names such as
 * "Accessibility" or "Incident command" would otherwise stay English on ja/zh pages). Render modules
 * (SSG, Node-safe) import this directly; product names stay identical in all three languages.
 * Not part of `Content`, so runtime code reads the label from the server-rendered DOM instead.
 */
export const toolLabels: Readonly<Record<ToolId, T>> = {
  ts: t('TypeScript', 'TypeScript', 'TypeScript'),
  react: t('React', 'React', 'React'),
  threejs: t('three.js / WebGL', 'three.js / WebGL', 'three.js / WebGL'),
  webperf: t('Webパフォーマンス', 'Web performance', 'Web性能优化'),
  a11y: t('アクセシビリティ', 'Accessibility', '无障碍'),
  webgpu: t('WebGPU', 'WebGPU', 'WebGPU'),
  go: t('Go', 'Go', 'Go'),
  rust: t('Rust', 'Rust', 'Rust'),
  node: t('Node.js', 'Node.js', 'Node.js'),
  grpc: t('gRPC', 'gRPC', 'gRPC'),
  kafka: t('Kafka', 'Kafka', 'Kafka'),
  postgres: t('PostgreSQL', 'PostgreSQL', 'PostgreSQL'),
  redis: t('Redis', 'Redis', 'Redis'),
  clickhouse: t('ClickHouse', 'ClickHouse', 'ClickHouse'),
  k8s: t('Kubernetes', 'Kubernetes', 'Kubernetes'),
  terraform: t('Terraform', 'Terraform', 'Terraform'),
  aws: t('AWS（マルチリージョン）', 'AWS (multi-region)', 'AWS（多区域）'),
  envoy: t('Envoy', 'Envoy', 'Envoy'),
  otel: t('OpenTelemetry', 'OpenTelemetry', 'OpenTelemetry'),
  prom: t('Prometheus', 'Prometheus', 'Prometheus'),
  slo: t('SLOとエラーバジェット', 'SLOs and error budgets', 'SLO与错误预算'),
  design: t('システム設計とRFC', 'System design and RFCs', '系统设计与RFC'),
  incident: t('インシデントコマンド', 'Incident command', '故障指挥'),
  mentoring: t('メンタリング', 'Mentoring', '技术带教'),
  writing: t('テクニカルライティング', 'Technical writing', '技术写作'),
};

/* ---------- §6.6 principles ----------
 * Bodies are set as tall vertical columns in ja/zh, so they stay short and use kanji numerals in ja. */
export const principles: readonly Principle[] = [
  {
    id: 'measure', n: 1, title: t('測ってから彫る', 'Measure before you cut', '先量，后刻'),
    body: t(
      '勘では削らない。先に測り、目標の数字に合意してから、一つずつ変える。',
      "I don't optimize on a hunch. Measure first, agree on the target number, then change one thing at a time.",
      '不凭感觉做优化：先测量，对齐目标数字，再一次只改一处。',
    ),
    stone: { x: -0.55, z: -0.10, r: 0.09 },
  },
  {
    id: 'small', n: 2, title: t('小さな版を、何度も', 'Small blocks, many passes', '小版，多印'),
    body: t(
      '大きな変更も、戻せる小さな単位に割って、毎日出す。',
      'Big changes ship as small, reversible steps, every day.',
      '再大的改动，也拆成可回滚的小步，每天上线。',
    ),
    stone: { x: -0.25, z: 0.15, r: 0.07 },
  },
  {
    id: 'register', n: 3, title: t('見当は腕前に勝る', 'Registration over brilliance', '套准胜于炫技'),
    body: t(
      'チームが崩れるのは継ぎ目からだ。巧い実装より先に、インターフェースと契約を揃える。',
      'Teams come apart at the seams. Agree on interfaces and contracts before anyone writes clever code.',
      '团队出问题，多在接缝处。先对齐接口与契约，再谈精巧的实现。',
    ),
    stone: { x: 0.05, z: -0.20, r: 0.11 },
  },
  {
    id: 'reprint', n: 4, title: t('誰でも摺れる版を残す', 'Leave the block re-printable', '版要留给后来人'),
    body: t(
      '自分しか回せないものは、まだ仕上がっていない。他の人が試した手順書と自動化を残す。',
      "If only I can run it, it isn't finished. Leave runbooks and automation that someone else has tested.",
      '只有我能运维的系统，还不算完工。留下经他人验证过的手册与自动化。',
    ),
    stone: { x: 0.32, z: 0.10, r: 0.08 },
  },
  {
    id: 'pager', n: 5, title: t('呼び出しは自分で受ける', 'Own the pager', '告警自己接'),
    body: t(
      '作ったものの呼び出しは自分で受ける。深夜三時の呼び出しほど、正直な設計レビューはない。',
      'I carry the pager for what I build. A 3 a.m. page is the most honest design review there is.',
      '自己做的系统，告警自己接。凌晨3点的告警，是最诚实的设计评审。',
    ),
    stone: { x: 0.60, z: -0.05, r: 0.10 },
  },
];

/* ---------- B.7 operations ---------- */
export const ops: Ops = {
  service: t('海路 決済API', 'Kairo checkout API', '海路下单API'),
  from: '2025-10-20',
  to: '2026-10-18',
  weeklyP99ms: [
    186, 184, 189, 183, 191, 412, 205, 188, 182, 179, 185, 228, 181, 178, 176, 180, 174, 177, 296, 190, 175, 172, 170, 173, 169, 171,
    207, 168, 166, 165, 167, 163, 214, 162, 160, 161, 158, 159, 157, 160, 155, 156, 154, 157, 153, 151, 152, 150, 149, 151, 148, 147,
  ],
  slo: t(
    '決済リクエストの99.95%が300ミリ秒未満で成功する（月次）',
    '99.95% of checkout requests succeed in under 300 ms, measured monthly',
    '99.95%的下单请求在300毫秒内成功（按月统计）',
  ),
  sloMet: t('12か月中11か月で達成（2025年11月のみ未達）', 'Met in 11 of 12 months (missed November 2025)', '12个月中11个月达标（仅2025年11月未达标）'),
  sev1: [
    { week: 6, date: '2025-11-26', blastPct: 18, durationMin: 41, title: t('リージョンのDBフェイルオーバーが途中で停止', 'Regional database failover stalled', '区域数据库切换中途卡住') },
    { week: 19, date: '2026-02-25', blastPct: 7, durationMin: 12, title: t('誤ったエッジ設定の配信', 'Bad edge configuration push', '错误的边缘配置下发') },
  ],
};

/* ---------- B.8 banzuke ----------
 * Feats are set vertically in ja/zh (§6.7): ja uses kanji numerals, zh uses 大写 (§9), no arrows. */
export const banzuke: Banzuke = {
  title: t('瀬川湊 仕事見立番付', 'A mitate ranking of the work', '濑川凑 工作见立番付'),
  centre: t('八年', 'Eight years', '八年'),
  date: t('令和八年 霜降 改', "Revised at Frost's Descent, 2026", '二〇二六年 霜降 修订'),
  east: {
    label: t('東 届けた仕事', 'East · Delivery', '东 · 交付'),
    entries: [
      { rank: 'ozeki', feat: t('デプロイのリードタイムを四十五分から七分へ', 'Deploy lead time 45 → 7 min', '部署前置时间由肆拾伍分钟降至柒分钟'), metric: 'deploy', period: '2023–24' },
      { rank: 'sekiwake', feat: t('配車の処理量を十二倍に 無停止で', 'Dispatch throughput ×12, zero downtime', '调度吞吐提升拾贰倍 零停机'), metric: 'thru', period: '2022–23' },
      { rank: 'komusubi', feat: t('精算バッチを六時間から五十分へ', 'Settlement batch 6 h → 50 min', '清算跑批由陆小时缩至伍拾分钟'), metric: 'settle', period: '2019' },
      { rank: 'maegashira', feat: t('地図描画のp95を三十八ミリ秒から九ミリ秒へ', 'Map frame p95 38 → 9 ms', '地图帧耗时p95由叁拾捌毫秒降至玖毫秒'), metric: 'frame', period: '2021' },
      { rank: 'maegashira', feat: t('リージョン切替のRTOを四時間から十五分へ', 'Regional failover RTO 4 h → 15 min', '区域切换RTO由肆小时降至拾伍分钟'), metric: 'rto', period: '2025' },
      { rank: 'maegashira', feat: t('PCI DSSの対象を二十三から三サービスへ', 'PCI DSS scope 23 → 3 services', 'PCI DSS范围由贰拾叁个服务收至叁个'), metric: 'pci', period: '2019' },
    ],
  },
  west: {
    label: t('西 育てた人', 'West · People', '西 · 育人'),
    entries: [
      { rank: 'ozeki', feat: t('十一名を指導し 四名が昇格', '11 engineers mentored, 4 promoted', '带教工程师拾壹名 其中肆名晋升'), metric: 'mentees', period: '2019–26' },
      { rank: 'sekiwake', feat: t('RFCの制度を興し 三十八本', 'Founded the RFC process: 38 RFCs', '创立RFC流程 累计叁拾捌篇'), metric: 'rfc', period: '2023–26' },
      { rank: 'komusubi', feat: t('インシデント指揮の輪番を興し 指揮官九名を育成', 'Incident-commander rotation founded; 9 commanders trained', '创立故障指挥官轮值 培养指挥官玖名'), period: '2025' },
      { rank: 'maegashira', feat: t('オンボーディング資料 読者六十名', 'Onboarding guide read by 60 engineers', '入职指南 读者陆拾名'), period: '2024' },
      { rank: 'maegashira', feat: t('登壇三回', '3 talks', '技术演讲叁场'), period: '2022–25' },
      { rank: 'maegashira', feat: t('採用面接百二十件', '120 interviews', '参与面试壹佰贰拾场'), period: '2021–26' },
    ],
  },
};

/* ---------- B.9 charts and reliability ---------- */
export const charts: readonly Chart[] = [
  {
    id: 'deploys', title: t('週あたりの本番デプロイ', 'Production deploys per week', '每周生产部署次数'), unit: t('回／週', 'per week', '次/周'), kind: 'bars',
    series: [{ x: '2018', y: 3 }, { x: '2019', y: 6 }, { x: '2020', y: 25 }, { x: '2021', y: 60 }, { x: '2022', y: 110 }, { x: '2023', y: 140 }, { x: '2024', y: 210 }, { x: '2025', y: 240 }, { x: '2026', y: 255 }],
    note: t('在籍したチームの合計', 'Across the teams I worked in', '所在团队合计'), source: SOURCE,
  },
  {
    id: 'leadtime', title: t('デプロイのリードタイム（中央値）', 'Deploy lead time (median)', '部署前置时间（中位数）'), unit: t('分', 'min', '分钟'), kind: 'line',
    series: [{ x: '2023-Q3', y: 45 }, { x: '2023-Q4', y: 38 }, { x: '2024-Q1', y: 24 }, { x: '2024-Q2', y: 15 }, { x: '2024-Q3', y: 11 }, { x: '2024-Q4', y: 7 }],
    note: t('ゴールデンパスを広げた期間', 'During the golden-path rollout', '黄金路径推广期间'), source: SOURCE,
  },
  {
    id: 'mttr', title: t('MTTR（中央値）', 'MTTR (median)', 'MTTR（中位数）'), unit: t('分', 'min', '分钟'), kind: 'bars',
    series: [{ x: '2019', y: 95 }, { x: '2020', y: 62 }, { x: '2021', y: 50 }, { x: '2022', y: 41 }, { x: '2023', y: 46 }, { x: '2024', y: 44 }, { x: '2025', y: 17 }, { x: '2026', y: 9 }],
    note: t('全インシデント', 'All incidents', '全部故障'), source: SOURCE,
  },
];

export const reliability: readonly ReliabilityFigure[] = [
  { id: 'avail', label: t('決済の可用性', 'Checkout availability', '交易链路可用性'), value: '99.99 %', period: '2025' },
  { id: 'mttr', label: t('MTTRの中央値', 'Median MTTR', 'MTTR中位数'), value: '9 min', period: '2026-01 → 2026-09' },
  { id: 'pages', label: t('オンコール1週間の呼び出し', 'Pages per on-call week', '每个值班周的告警呼叫'), value: '4', period: '2025-Q4' },
  { id: 'sev1', label: t('2026年3月以降のSEV-1', 'SEV-1 incidents since March 2026', '2026年3月以来的SEV-1故障'), value: '0', period: '2026-03 →' },
  { id: 'latent', label: t('ゲームデーで見つけた潜在障害', 'Latent failures found in game days', '故障演练中发现的隐患'), value: '9', period: '2025' },
];

/* ---------- B.10 writing, OSS, talks ---------- */
export const repos: readonly Repo[] = [
  {
    id: 'kento', name: 'kento', desc: t('Go向けの冪等なジョブ登録ライブラリ', 'Idempotent job registration for Go', 'Go语言的幂等任务注册库'), language: 'Go', stars: 640, plate: 6,
    releases: [
      { date: '2021-05-09', tag: 'v0.1.0', lines: 2410 }, { date: '2021-07-18', tag: 'v0.2.0', lines: 880 }, { date: '2021-10-02', tag: 'v0.3.0', lines: 1120 },
      { date: '2022-02-20', tag: 'v0.4.0', lines: 640 }, { date: '2022-06-11', tag: 'v0.5.0', lines: 930 }, { date: '2022-11-03', tag: 'v1.0.0', lines: 1780 },
      { date: '2023-04-16', tag: 'v1.1.0', lines: 410 }, { date: '2024-01-28', tag: 'v1.2.0', lines: 520 }, { date: '2025-03-09', tag: 'v1.3.0', lines: 300 },
      { date: '2026-05-17', tag: 'v1.4.0', lines: 260 },
    ],
    prov: P,
  },
  {
    id: 'baren', name: 'baren', desc: t('一定の圧で叩く負荷生成ツール', 'An even-pressure load generator', '均匀施压的压测工具'), language: 'Go', stars: 210, plate: 2,
    releases: [
      { date: '2022-08-21', tag: 'v0.1.0', lines: 1350 }, { date: '2022-12-04', tag: 'v0.2.0', lines: 620 }, { date: '2023-09-10', tag: 'v0.3.0', lines: 770 },
      { date: '2024-06-23', tag: 'v0.4.0', lines: 390 }, { date: '2025-08-31', tag: 'v0.5.0', lines: 450 },
    ],
    prov: P,
  },
  {
    id: 'scrubkit', name: 'scrubkit',
    desc: t(
      'スクロール位置を動画の時刻へ、フレーム単位で正確に対応させるコントローラー。このサイトの映像もこれで動いている',
      'A frame-accurate scroll-to-media-time controller. It runs the film on this site.',
      '把滚动位置精确映射到视频帧的控制器，本站的影片就由它驱动',
    ),
    language: 'TypeScript', stars: 1140, plate: 4,
    releases: [
      { date: '2025-12-14', tag: 'v0.1.0', lines: 1940 }, { date: '2026-02-08', tag: 'v0.2.0', lines: 760 }, { date: '2026-04-19', tag: 'v0.3.0', lines: 1020 },
      { date: '2026-07-05', tag: 'v0.4.0', lines: 540 }, { date: '2026-10-04', tag: 'v1.0.0', lines: 880 },
    ],
    prov: P,
  },
];

const NOTEBOOK = t('個人のノート', 'Personal notebook', '个人笔记');
export const articles: readonly Article[] = [
  {
    id: 'six-hour-batch', date: '2019-09-14',
    title: t('6時間のバッチが50分になるまで', 'The six-hour batch that became fifty minutes', '6小时的跑批，如何变成50分钟'),
    venue: t('花道ペイメンツ技術ブログ', 'Hanamichi engineering blog', '花道支付技术博客'),
    abstract: t(
      '冪等キーとトランザクショナルアウトボックスで、夜間精算を速くし、しかも再実行に強くした記録。',
      'How idempotency keys and a transactional outbox made the nightly settlement faster and safe to retry.',
      '用幂等键和事务性发件箱，让夜间清算更快，也更经得起重跑。',
    ),
    prov: P,
  },
  {
    id: 'fog-year', date: '2020-11-02',
    title: t('霧の年のトレーシング', 'Tracing in a fog year', '雾中之年的链路追踪'),
    venue: t('渡り鳥ロジスティクス技術ブログ', 'Wataridori engineering blog', '候鸟物流技术博客'),
    abstract: t(
      'トラフィックが6倍になった年に、一つのリクエストを140サービスの端から端まで追えるようにした方法。',
      'Making one request followable across 140 services, in the year traffic grew sixfold.',
      '流量涨了6倍的那一年，如何让一个请求在140个服务之间一路可追。',
    ),
    prov: P,
  },
  {
    id: 'idempotency-registration', date: '2021-06-20',
    title: t('冪等性は見当である', 'Idempotency is registration', '幂等即套准'),
    venue: NOTEBOOK,
    abstract: t(
      '見当の合った版木は、何度摺っても同じ位置に色が乗る。何度実行しても結果が揃う設計について。',
      'A block in register prints in the same place on every pass. On designing jobs that land the same way however often they run.',
      '版木对准了，印多少遍颜色都落在同一处。谈谈无论执行多少次、结果都一致的设计。',
    ),
    prov: P,
  },
  {
    id: 'strangler-gardeners', date: '2022-12-10',
    title: t('ストラングラーフィグには庭師がいる', 'Strangler figs need gardeners', '绞杀榕也需要园丁'),
    venue: NOTEBOOK,
    abstract: t(
      '14か月の段階移行を止めずに続けるための、地味な習慣。',
      'The unglamorous habits that kept a 14-month incremental migration moving.',
      '让一场14个月的渐进式迁移不停摆的几个朴素习惯。',
    ),
    prov: P,
  },
  {
    id: 'against-3am', date: '2025-04-27',
    title: t('午前3時の呼び出しに反対する', 'Against the 3 a.m. page', '反对凌晨3点的告警'),
    venue: t('海路技術ブログ', 'Kairo engineering blog', '海路技术博客'),
    abstract: t(
      'SLOの消費速度で呼ぶアラートに変え、オンコール1週間あたりの呼び出しを31回から4回にした。',
      'SLO burn-rate alerting cut pages per on-call week from 31 to 4.',
      '改用基于SLO消耗速率的告警后，每个值班周的告警呼叫从31次降到4次。',
    ),
    prov: P,
  },
  {
    id: 'scrubbing-video', date: '2026-09-13',
    title: t('フレームを落とさない動画スクラブ', 'Scrubbing video without dropping frames', '不掉帧的视频拖动'),
    venue: NOTEBOOK,
    abstract: t(
      '短いGOP、同時に一つだけのシーク、アイドル時の負荷ゼロ。scrubkitの設計。',
      'Short GOPs, single-flight seeks and zero idle cost: the design behind scrubkit.',
      '短GOP、同一时刻只发一个seek、空闲时零开销——scrubkit背后的设计。',
    ),
    prov: P,
  },
];

export const talks: readonly Talk[] = [
  {
    id: 'strangler-scale', date: '2022-10-22',
    title: t('配車規模のストラングラーフィグ', 'Strangler figs at dispatch scale', '调度规模下的绞杀者模式'),
    venue: t('東京のGoミートアップ', 'A Tokyo Go meetup', '东京的一场Go技术聚会'),
    abstract: t('配車を止めずにモノリスを置き換えた14か月の話。', '14 months of replacing a monolith without taking dispatch down.', '14个月，在调度不停机的前提下替换掉单体。'),
    prov: P,
  },
  {
    id: 'golden-handcuffs', date: '2024-06-15',
    title: t('金の手錠のないゴールデンパス', 'Golden paths without golden handcuffs', '不带金手铐的黄金路径'),
    venue: t('東京のプラットフォームエンジニアリング・ミートアップ', 'A platform-engineering meetup in Tokyo', '东京的一场平台工程聚会'),
    abstract: t('強制しなくても選ばれるプラットフォームの作り方。', 'Building a platform teams choose without being told to.', '不靠强推，也能让团队主动选择的平台怎么做。'),
    prov: P,
  },
  {
    id: 'four-nines', date: '2025-11-08',
    title: t('測ったフォーナイン', 'Four nines, measured', '量出来的四个九'),
    venue: t('東京のSREコミュニティカンファレンス', 'An SRE community conference in Tokyo', '东京的一场SRE社区大会'),
    abstract: t(
      '可用性99.99%を、ステータスページではなく数字で確かめた1年。',
      'A year of checking 99.99% availability against the numbers instead of the status page.',
      '用数据而不是状态页，验证99.99%可用性的一年。',
    ),
    prov: P,
  },
];

/* ---------- B.11 people ----------
 * ja quotes are set vertically on desktop (Kaisei HarunoUmi), so they use kanji numerals. */
export const testimonials: readonly Testimonial[] = [
  {
    id: 'manager', name: t('佐伯 透子', 'Tōko Saeki', '佐伯透子'),
    role: t('海路 エンジニアリング部門VP', 'VP of Engineering, Kairo', '海路 技术副总裁'),
    relation: t('2023〜2026年の上長', 'Managed Minato, 2023–2026', '2023–2026年任其直属上级'), date: '2026-08',
    quote: t(
      '二〇二四年十一月の障害の夜、瀬川さんは指揮を執りながら、誰が何を見ているのかを最後まで声に出し続けた。その後のレジリエンス・プログラムでRTOは四時間から十五分になり、チームの誰でも実行できる手順書が残った。',
      'On the night of the November 2024 outage, Minato ran the incident while saying out loud who was looking at what, start to finish. The resilience program that followed took our RTO from 4 hours to 15 minutes and left a runbook anyone on the team can run.',
      '2024年11月那次故障的夜里，濑川一边指挥，一边从头到尾把“谁在看什么”说出声来。之后的多活容灾项目把RTO从4小时压到15分钟，还留下了一份团队里谁都能执行的预案。',
    ),
    prov: P,
  },
  {
    id: 'peer', name: t('ダニエル・オカフォー', 'Daniel Okafor', '丹尼尔·奥卡福'),
    role: t('渡り鳥ロジスティクス スタッフエンジニア', 'Staff Engineer, Wataridori Logistics', '候鸟物流 资深（Staff）工程师'),
    relation: t('2020〜2023年、配車基盤で協働', 'Worked with Minato on dispatch, 2020–2023', '2020–2023年在调度平台共事'), date: '2023-06',
    quote: t(
      'ストラングラー移行の十四か月、瀬川さんの設計文書はいつも「やらないこと」から始まっていた。おかげで議論は短く、切り戻しの判断は速かった。最後の経路がモノリスから外れた日も、オンコールの誰一人気づかなかった。',
      'For 14 months of the strangler migration, every design doc Minato wrote opened with what we would not do. It kept our debates short and our rollback calls fast. When the last route moved off the monolith, nobody on call even noticed.',
      '绞杀者迁移的14个月里，濑川写的每份设计文档都从“不做什么”开始。讨论因此很短，回滚决策也很快。最后一条路由迁离单体那天，值班的人甚至都没察觉。',
    ),
    prov: P,
  },
  {
    id: 'report', name: t('林 雨涵', 'Lin Yuhan', '林雨涵'),
    role: t('海路 シニアソフトウェアエンジニア', 'Senior Software Engineer, Kairo', '海路 高级软件工程师'),
    relation: t('2024〜2026年のメンティー。2026年に昇格', 'Mentee 2024–2026; promoted in 2026', '2024–2026年由其带教，2026年晋升'), date: '2026-07',
    quote: t(
      '毎週のペアリングで、瀬川さんは答えを渡さなかった。代わりに、私がそれをどう測ればいいかを一緒に考えてくれた。昇格面談で話したことの半分は、あの時間に覚えたことだ。',
      'In our weekly pairing, Minato never handed me the answer. We worked out how I could measure it instead. Half of what I said in my promotion review, I learned in those hours.',
      '每周结对，濑川从来不直接给答案，而是陪我一起想：这个问题我该怎么去测。晋升答辩里我讲的一半内容，都是在那些时间里学到的。',
    ),
    prov: P,
  },
];

export const leadership: Leadership = {
  mentees: 11,
  promoted: 4,
  interviews: 120,
  onboardingReaders: 60,
  rfcs: 38,
  incidentCommandersTrained: 9,
  notes: [
    t('週1回のペアリングを、3年続けている', 'Weekly pairing, kept up for 3 years', '每周结对，已坚持3年'),
    t('オンボーディングガイドを書き、今も更新している', 'Wrote the onboarding guide and still maintain it', '编写入职指南，并持续维护'),
    t('インシデントコマンダー9名を、シャドー当番で育てた', 'Trained 9 incident commanders through shadow shifts', '通过影子值班培养了9名故障指挥官'),
  ],
};
