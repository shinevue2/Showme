/**
 * Chrome micro-strings (DESIGN §4). Owner: WP-04. Node-safe (imported by src/chrome/render.ts).
 * Every visible chrome string lives here so the font subsetter (scripts/fonts, WP-02) sees it: it reads
 * `strings[lang]` of this module. Section names come from content (`copy.<id>.layer`), plate names from
 * `content.plates`, glossary entries from `content.glossary`.
 */
import type { Lang } from '../core/types';

export interface ChromeStrings {
  /* document bar */
  home: string; express: string; works: string; cv: string; cvMenu: string; contact: string; skipFilm: string;
  cvJa: string; cvEn: string; cvZh: string; pdf: string;
  languages: string; wheel: string;
  theme: string; day: string; night: string; auto: string;
  metaLine: string;
  notice: { en: string; zh: string }; dismiss: string;
  outline: string; proof: string; info: string; menu: string; close: string;
  proofBanner: string; proofExit: string;
  /* layers + separations */
  layers: string; separations: string; motionLayer: string; motionHint: string;
  show: string; hide: string; artboards: string; chapters: string; expressRow: string; layerPanel: string;
  todaysPrint: string; savePrint: string; seed: string; uninked: string; keyLocked: string; inkedCount: string;
  /* status bar */
  status: string; artboard: string; idle: string; fps: string; draws: string; zoom: string;
  /* info sheet */
  tabInfo: string; tabGlossary: string; tabSettings: string; sheet: string;
  renderer: string; calls: string; triangles: string; programs: string; textures: string; geometries: string;
  frameTime: string; budget: string; perView: string; dpr: string; tier: string; governor: string; live: string; none: string;
  film: string; variant: string; frame: string; seek: string; page: string; transferred: string; vitals: string;
  heap: string; gpu: string; edition: string; unavailable: string; notDrawing: string;
  glossaryFilter: string; glossaryEmpty: string;
  sTheme: string; sMotion: string; on: string; off: string; sShortcuts: string; sQuality: string;
  qAuto: string; qHigh: string; qMedium: string; qLow: string; qStatic: string;
  sProof: string; sRulers: string; sOutline: string; keysTitle: string; reload: string;
  keys: readonly (readonly [string, string])[];
  /* peek */
  peek: string; peekTitle: string; copy: string; copied: string; peekShare: string; peekNoSource: string;
  /* mobile toolbar */
  mLayers: string; mSeparations: string; mInfo: string; mLanguage: string;
  /* rulers */
  units: { px: string; mm: string; sun: string; shaku: string; ken: string; ri: string; year: string };
  ri126: string; urame: string;
  /* outline view */
  keyframe: string;
  /* print / CV */
  cv_summary: string; cv_results: string; cv_experience: string; cv_work: string; cv_skills: string; cv_more: string;
  cv_languages: string; cv_education: string; cv_writing: string; cv_leadership: string; cv_contact: string;
  cv_years: string; cv_printed: string; cv_based: string; goldClouds: string;
}

export const strings: Readonly<Record<Lang, ChromeStrings>> = {
  ja: {
    home: '表紙へ', express: '近道', works: '作品', cv: '履歴書', cvMenu: '履歴書（PDF）を選ぶ', contact: '連絡', skipFilm: '映像を飛ばす',
    cvJa: '日本語版', cvEn: '英語版', cvZh: '中国語版', pdf: 'PDF',
    languages: '言語', wheel: '転輪排字架 — 言語を選ぶ',
    theme: '摺りの種類', day: '本摺', night: '石摺', auto: '自動',
    metaLine: 'シニアソフトウェアエンジニア · 8年 · 東京 JST',
    notice: { en: 'Also in English →', zh: '也有简体中文版 →' }, dismiss: '閉じる',
    outline: 'アウトライン表示', proof: '校正刷り', info: '情報', menu: 'メニュー', close: '閉じる',
    proofBanner: '校正刷り — 文字のみの一段組', proofExit: '本刷りに戻す',
    layers: 'レイヤー', separations: '分版', motionLayer: '動き', motionHint: 'OSの「視差効果を減らす」が有効なため停止中',
    show: '{name}を表示', hide: '{name}を隠す', artboards: '{n} アートボード', chapters: '道中の七章', expressRow: '近道', layerPanel: 'レイヤーパネル',
    todaysPrint: '今日の一枚', savePrint: '原寸で保存', seed: '種', uninked: '未摺', keyLocked: '主版は隠せない', inkedCount: '{n}/8 版',
    status: '情報バー', artboard: 'アートボード', idle: '静止', fps: 'fps', draws: '描画', zoom: '表示倍率',
    tabInfo: '情報', tabGlossary: '用語', tabSettings: '設定', sheet: '情報パネル',
    renderer: '描画', calls: 'ドローコール', triangles: '三角形', programs: 'プログラム', textures: 'テクスチャ', geometries: 'ジオメトリ',
    frameTime: 'フレーム時間（直近120フレーム）', budget: '予算', perView: '版ごとのCPU時間', dpr: 'DPR', tier: '品質段', governor: '調整', live: '稼働中の版', none: 'なし',
    film: '映像', variant: 'バリアント', frame: 'フレーム', seek: 'シーク', page: 'ページ', transferred: '転送量', vitals: 'ウェブ指標',
    heap: 'JSヒープ', gpu: 'GPU', edition: '版次', unavailable: '取得不可', notDrawing: '描画なし（待機中）',
    glossaryFilter: '用語を絞り込む', glossaryEmpty: '該当なし',
    sTheme: '摺り', sMotion: '動き', on: '入', off: '切', sShortcuts: 'キーボードショートカット', sQuality: '画質',
    qAuto: '自動', qHigh: '高', qMedium: '中', qLow: '低', qStatic: '静止',
    sProof: '校正刷り', sRulers: '定規', sOutline: 'アウトライン', keysTitle: 'ショートカット', reload: '切り替えると再読み込み',
    keys: [['i', '情報パネル'], ['Y', 'アウトライン表示'], ['Shift R', '定規'], ['[ ]', '前／次のアートボード'], ['Esc', 'パネルを閉じる']],
    peek: 'GLSLを覗く', peekTitle: 'フラグメントシェーダ', copy: 'コピー', copied: 'コピーした', peekShare: '描画時間の割合', peekNoSource: 'この版は標準マテリアルのみ',
    mLayers: 'レイヤー', mSeparations: '分版', mInfo: '情報', mLanguage: '言語',
    units: { px: 'px', mm: 'mm', sun: '寸', shaku: '尺', ken: '間', ri: '里', year: '年' },
    ri126: '百二十六里', urame: '裏目',
    keyframe: 'キーフレーム',
    cv_summary: '概要', cv_results: '主な成果', cv_experience: '職歴', cv_work: '事例', cv_skills: '技術', cv_more: 'その他の数字',
    cv_languages: '言語', cv_education: '学歴', cv_writing: '公開物', cv_leadership: '育成', cv_contact: '連絡先',
    cv_years: '{n}年', cv_printed: '八度摺より印刷', cv_based: '所在', goldClouds: '金雲',
  },
  en: {
    home: 'Back to the cover', express: 'Express lane', works: 'Works', cv: 'CV', cvMenu: 'Choose a CV (PDF)', contact: 'Contact', skipFilm: 'Skip the film',
    cvJa: 'Japanese', cvEn: 'English', cvZh: 'Chinese', pdf: 'PDF',
    languages: 'Language', wheel: 'Revolving type table: choose a language',
    theme: 'Impression', day: 'Brocade', night: 'Stone rubbing', auto: 'Auto',
    metaLine: 'Senior Software Engineer · 8 yrs · Tokyo JST',
    notice: { en: 'Also in English →', zh: '也有简体中文版 →' }, dismiss: 'Dismiss',
    outline: 'Outline view', proof: 'Proof', info: 'Info', menu: 'Menu', close: 'Close',
    proofBanner: 'Proof: text only, one column', proofExit: 'Back to the full print',
    layers: 'Layers', separations: 'Separations', motionLayer: 'Motion', motionHint: 'Paused: your system asks for reduced motion',
    show: 'Show {name}', hide: 'Hide {name}', artboards: '{n} artboards', chapters: 'Seven chapters of the road', expressRow: 'Express lane', layerPanel: 'Layers panel',
    todaysPrint: "Today's print", savePrint: 'Save full size', seed: 'Seed', uninked: 'not yet printed', keyLocked: 'The key block cannot be hidden', inkedCount: '{n}/8 plates',
    status: 'Status bar', artboard: 'Artboard', idle: 'idle', fps: 'fps', draws: 'draws', zoom: 'Zoom',
    tabInfo: 'Info', tabGlossary: 'Glossary', tabSettings: 'Settings', sheet: 'Info panel',
    renderer: 'Renderer', calls: 'draw calls', triangles: 'triangles', programs: 'programs', textures: 'textures', geometries: 'geometries',
    frameTime: 'Frame time (last 120 frames)', budget: 'budget', perView: 'CPU per view', dpr: 'DPR', tier: 'Tier', governor: 'Governor', live: 'Live views', none: 'none',
    film: 'Film', variant: 'variant', frame: 'frame', seek: 'seek', page: 'Page', transferred: 'transferred', vitals: 'Web Vitals',
    heap: 'JS heap', gpu: 'GPU', edition: 'Edition', unavailable: 'not available', notDrawing: 'not drawing (idle)',
    glossaryFilter: 'Filter terms', glossaryEmpty: 'No match',
    sTheme: 'Impression', sMotion: 'Motion', on: 'On', off: 'Off', sShortcuts: 'Keyboard shortcuts', sQuality: 'Quality',
    qAuto: 'Auto', qHigh: 'High', qMedium: 'Medium', qLow: 'Low', qStatic: 'Static',
    sProof: 'Proof mode', sRulers: 'Rulers', sOutline: 'Outline', keysTitle: 'Shortcuts', reload: 'reloads the page',
    keys: [['i', 'Info panel'], ['Y', 'Outline view'], ['Shift R', 'Rulers'], ['[ ]', 'Previous / next artboard'], ['Esc', 'Close panels']],
    peek: 'Peek the GLSL', peekTitle: 'Fragment shader', copy: 'Copy', copied: 'Copied', peekShare: 'share of view CPU time', peekNoSource: 'This view uses built-in materials only',
    mLayers: 'Layers', mSeparations: 'Plates', mInfo: 'Info', mLanguage: 'Language',
    units: { px: 'px', mm: 'mm', sun: 'sun', shaku: 'shaku', ken: 'ken', ri: 'ri', year: 'yr' },
    ri126: '126 ri', urame: 'urame √2',
    keyframe: 'keyframe',
    cv_summary: 'Summary', cv_results: 'Selected results', cv_experience: 'Experience', cv_work: 'Selected work', cv_skills: 'Skills', cv_more: 'More numbers',
    cv_languages: 'Languages', cv_education: 'Education', cv_writing: 'Open source and writing', cv_leadership: 'People', cv_contact: 'Contact',
    cv_years: '{n} yrs', cv_printed: 'Printed from Eight Impressions', cv_based: 'Based in', goldClouds: 'gold clouds',
  },
  zh: {
    home: '回到封面', express: '快捷入口', works: '作品', cv: '简历', cvMenu: '选择简历（PDF）', contact: '联系', skipFilm: '跳过影片',
    cvJa: '日文版', cvEn: '英文版', cvZh: '中文版', pdf: 'PDF',
    languages: '语言', wheel: '转轮排字架：选择语言',
    theme: '印法', day: '套色', night: '拓印', auto: '自动',
    metaLine: '高级软件工程师 · 8 年 · 东京 JST',
    notice: { en: 'Also in English →', zh: '也有简体中文版 →' }, dismiss: '关闭',
    outline: '轮廓视图', proof: '校样', info: '信息', menu: '菜单', close: '关闭',
    proofBanner: '校样：纯文字单栏', proofExit: '回到完整印本',
    layers: '图层', separations: '分色', motionLayer: '动效', motionHint: '系统已开启“减弱动态效果”，动效暂停',
    show: '显示{name}', hide: '隐藏{name}', artboards: '{n} 个画板', chapters: '旅途七章', expressRow: '快捷入口', layerPanel: '图层面板',
    todaysPrint: '今日之印', savePrint: '保存原尺寸', seed: '种子', uninked: '未印', keyLocked: '主版不可隐藏', inkedCount: '{n}/8 版',
    status: '状态栏', artboard: '画板', idle: '静止', fps: 'fps', draws: '绘制', zoom: '缩放',
    tabInfo: '信息', tabGlossary: '术语', tabSettings: '设置', sheet: '信息面板',
    renderer: '渲染', calls: '绘制调用', triangles: '三角形', programs: '着色程序', textures: '纹理', geometries: '几何体',
    frameTime: '帧时间（最近120帧）', budget: '预算', perView: '各视图CPU耗时', dpr: 'DPR', tier: '画质档', governor: '调速器', live: '活动视图', none: '无',
    film: '影片', variant: '码流', frame: '帧', seek: '定位', page: '页面', transferred: '已传输', vitals: '网页核心指标',
    heap: 'JS堆', gpu: 'GPU', edition: '版次', unavailable: '无法获取', notDrawing: '未绘制（静止）',
    glossaryFilter: '筛选术语', glossaryEmpty: '无匹配',
    sTheme: '印法', sMotion: '动效', on: '开', off: '关', sShortcuts: '键盘快捷键', sQuality: '画质',
    qAuto: '自动', qHigh: '高', qMedium: '中', qLow: '低', qStatic: '静态',
    sProof: '校样模式', sRulers: '标尺', sOutline: '轮廓', keysTitle: '快捷键', reload: '切换后重新载入页面',
    keys: [['i', '信息面板'], ['Y', '轮廓视图'], ['Shift R', '标尺'], ['[ ]', '上一个／下一个画板'], ['Esc', '关闭面板']],
    peek: '查看GLSL', peekTitle: '片元着色器', copy: '复制', copied: '已复制', peekShare: '占视图CPU时间', peekNoSource: '此视图只用内置材质',
    mLayers: '图层', mSeparations: '分色', mInfo: '信息', mLanguage: '语言',
    units: { px: 'px', mm: 'mm', sun: '寸', shaku: '尺', ken: '间', ri: '日里', year: '年' },
    ri126: '一百二十六日里', urame: '裏目 √2',
    keyframe: '关键帧',
    cv_summary: '概述', cv_results: '主要成果', cv_experience: '工作经历', cv_work: '项目案例', cv_skills: '技术', cv_more: '更多数据',
    cv_languages: '语言', cv_education: '教育', cv_writing: '开源与写作', cv_leadership: '培养', cv_contact: '联系方式',
    cv_years: '{n}年', cv_printed: '印自八版套印', cv_based: '所在地', goldClouds: '金云',
  },
};

/** Fill `{name}` / `{n}` placeholders. */
export function fill(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''));
}
