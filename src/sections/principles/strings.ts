/**
 * Principles micro-strings (DESIGN §6.6). Owner: WP-08. Imported by render.ts only (SSG); runtime code reads
 * what it needs from data attributes in the server-rendered DOM.
 */
import type { Lang } from '../../core/types';

export interface PrinciplesStrings {
  incidents: string; date: string; duration: string; blast: string; min: string;
  slo: string; tables: string; rakeOn: string;
}

export const strings: Readonly<Record<Lang, PrinciplesStrings>> = {
  ja: { incidents: 'SEV-1 インシデント', date: '週の始まり', duration: '継続時間', blast: '影響を受けた利用者', min: '分', slo: 'SLO', tables: '運用データ', rakeOn: '熊手を置く' },
  en: { incidents: 'SEV-1 incidents', date: 'Week of', duration: 'Duration', blast: 'Users affected', min: 'min', slo: 'SLO', tables: 'Operations data', rakeOn: 'Put the rake down' },
  zh: { incidents: 'SEV-1 故障', date: '周起始日', duration: '持续时间', blast: '受影响用户', min: '分钟', slo: 'SLO', tables: '运维数据', rakeOn: '放下耙子' },
};

export const display: Partial<Record<Lang, string>> = {};
