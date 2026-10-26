/** Works micro-strings (DESIGN §6.4; ≤ 8 words each). Owner: WP-07. Node-safe. */
import type { Lang } from '../../core/types';

export interface WorksStrings {
  /** aria-label of the panel labels (keyboard controls) */
  panels: string;
  /** aria-label of the case list */
  cases: string;
  /** keyboard hint under the screen (reading order right → left) */
  keys: string;
  /** label before the artwork credit in each case */
  art: string;
  /** "{n} of six" for the case page running head */
  ofSix: string;
  /** case page: table headings */
  metric: string; before: string; after: string; period: string; source: string; results: string;
  /** case page: architecture diagram caption label */
  diagram: string;
  /** case page: the facts beside 問 */
  facts: string;
  /** case page: the figures strip under the title */
  figures: string;
  /** case page: navigation landmark */
  nav: string;
  /** case page: the art crop caption prefix */
  panelOf: string;
  /** museum names, localised */
  institutions: Readonly<Record<string, string>>;
  /** list separator */
  sep: string;
  /** resilience case: heading of the 吹抜屋台 walkthrough */
  walk: string;
}

export const strings: Readonly<Record<Lang, WorksStrings>> = {
  ja: {
    panels: '六曲屏風の各扇（右から第一扇）',
    cases: '六つの事例',
    keys: '← 次の扇　→ 前の扇',
    art: '画',
    ofSix: '六扇のうち{n}',
    metric: '指標', before: '前', after: '後', period: '期間', source: '出典', results: '結果の一覧',
    diagram: '構成図',
    facts: '概要',
    figures: '主な数値',
    nav: '扇の移動',
    panelOf: 'この扇に使った画',
    institutions: { 'The Metropolitan Museum of Art': 'メトロポリタン美術館', 'Art Institute of Chicago': 'シカゴ美術館' },
    sep: '・',
    walk: '屋根を外して見る構成',
  },
  en: {
    panels: 'Screen panels, counted from the right',
    cases: 'Six case studies',
    keys: '← next panel · → previous',
    art: 'Art',
    ofSix: '{n} of 6',
    metric: 'Metric', before: 'Before', after: 'After', period: 'Period', source: 'Source', results: 'Results',
    diagram: 'Architecture diagram',
    facts: 'At a glance',
    figures: 'Key figures',
    nav: 'Panels',
    panelOf: 'The painting on this panel',
    institutions: { 'The Metropolitan Museum of Art': 'The Metropolitan Museum of Art', 'Art Institute of Chicago': 'Art Institute of Chicago' },
    sep: ' · ',
    walk: 'The design, roof off',
  },
  zh: {
    panels: '屏风各扇（自右起第一扇）',
    cases: '六个案例',
    keys: '← 下一扇　→ 上一扇',
    art: '画作',
    ofSix: '六扇之{n}',
    metric: '指标', before: '之前', after: '之后', period: '时间', source: '来源', results: '结果一览',
    diagram: '架构图',
    facts: '概要',
    figures: '关键数字',
    nav: '翻扇',
    panelOf: '本扇所用画作',
    institutions: { 'The Metropolitan Museum of Art': '大都会艺术博物馆', 'Art Institute of Chicago': '芝加哥艺术博物馆' },
    sep: ' · ',
    walk: '揭去屋顶看架构',
  },
};

/**
 * Extra glyphs set in the works display faces beyond what scripts/fonts/faces.mjs collects (titles, shorts,
 * labels, panel labels): ja Dela Gothic One / Shippori Antique B1 — the big 問・術・答・省 glyphs and the
 * running head; zh Noto Sans SC 900 — the simplified labels 问 术 答 省 and their sub-labels.
 */
export const display: Partial<Record<Lang, string>> = {
  ja: '問術答省第扇一二三四五六のうち',
  zh: '问术答省约束职责团队周期取舍第扇一二三四五六之',
};
