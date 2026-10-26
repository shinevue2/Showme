/**
 * Skills micro-strings (DESIGN §6.5). Owner: WP-08. Imported by render.ts only (SSG): runtime code reads what it
 * needs from the server-rendered DOM (data attributes), so `display` may pull tool labels from src/content for the
 * font subsets without bundling content into the runtime.
 */
import type { Lang } from '../../core/types';
import { toolLabels } from '../../content/facts';

export interface SkillsStrings {
  tools: string;
  colYears: string; colLast: string; colProjects: string;
  hint: string;
  lattice: string;
  diagram: Record<'request' | 'edge' | 'services' | 'events' | 'readModel' | 'observability', string>;
  pressed: string;
}

export const strings: Readonly<Record<Lang, SkillsStrings>> = {
  ja: {
    tools: '領域ごとの技術',
    colYears: '本番年数', colLast: '最終使用', colProjects: '案件',
    hint: '組子の線か、一覧の行を指す',
    lattice: '五つの領域に五つの組子。技術ひとつが濃い木の一本で、長さは年数、象嵌の数は案件数。六枚目は北斎の文様の手本',
    diagram: { request: 'リクエスト', edge: 'エッジ', services: 'サービス', events: 'イベント', readModel: '読み取りモデル', observability: '可観測性' },
    pressed: '構造を表示中',
  },
  en: {
    tools: 'Tools by domain',
    colYears: 'years', colLast: 'last used', colProjects: 'projects',
    hint: 'Point at a strip or a row',
    lattice: 'Five domains, five kumiko patterns. Each tool is one run of darker wood: its length is years in production, its inlays are projects. The sixth cell is Hokusai’s pattern page',
    diagram: { request: 'request', edge: 'edge', services: 'services', events: 'events', readModel: 'read model', observability: 'observability' },
    pressed: 'Showing the architecture',
  },
  zh: {
    tools: '按领域列出的技术',
    colYears: '生产年限', colLast: '最近使用', colProjects: '项目',
    hint: '指向木条或列表中的一行',
    lattice: '五个领域，五种组子纹样。每项技术是一段深色木条：长度是生产年限，嵌片数是项目数。第六格是北斋的纹样范本',
    diagram: { request: '请求', edge: '边缘网关', services: '服务', events: '事件', readModel: '读模型', observability: '可观测性' },
    pressed: '正在显示架构',
  },
};

/** Extra glyphs set in the section's display faces (DotGothic16 for ja labels and readouts; QingKe for zh headings). */
export const display: Partial<Record<Lang, string>> = {
  ja: Object.values(toolLabels).map((x) => x.ja).join('') + Object.values(strings.ja.diagram).join('') +
    strings.ja.colYears + strings.ja.colLast + strings.ja.colProjects + strings.ja.hint + '0123456789·—→',
  zh: '0123456789·',
};
