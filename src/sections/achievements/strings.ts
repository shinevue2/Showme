/** Achievements micro-strings (DESIGN §6.7). Owner: WP-09. */
import type { Lang } from '../../core/types';

export interface AchStrings {
  rank: string;
  ranks: Record<'ozeki' | 'sekiwake' | 'komusubi' | 'maegashira', string>;
  /** Visual label of the second and third 前頭 (番付 write 「同」, "the same"). */
  same: string;
  /** The 「蒙御免」 permission line at the top of the centre column (ja only). */
  gomen: string;
  reliability: string;
  year: string;
  value: string;
  credLabels: [string, string, string];
  sealCaption: string;
  chartTable: string;
}

export const strings: Readonly<Record<Lang, AchStrings>> = {
  ja: {
    rank: '番付', ranks: { ozeki: '大関', sekiwake: '関脇', komusubi: '小結', maegashira: '前頭' }, same: '同', gomen: '蒙御免',
    reliability: '信頼性の数字', year: '時期', value: '値', credLabels: ['学歴', '表彰', '語学'], sealCaption: '印面', chartTable: '数値',
  },
  en: {
    rank: 'Rank', ranks: { ozeki: 'Ōzeki', sekiwake: 'Sekiwake', komusubi: 'Komusubi', maegashira: 'Maegashira' }, same: 'Maegashira', gomen: '',
    reliability: 'Reliability figures', year: 'Period', value: 'Value', credLabels: ['Education', 'Award', 'Languages'], sealCaption: 'Seal face', chartTable: 'Values',
  },
  zh: {
    rank: '番付', ranks: { ozeki: '大关', sekiwake: '关胁', komusubi: '小结', maegashira: '前头' }, same: '同', gomen: '',
    reliability: '可靠性数据', year: '时间', value: '数值', credLabels: ['学历', '奖项', '语言'], sealCaption: '印面', chartTable: '数值',
  },
};

/** Extra glyphs for the display-face subsets (banzuke 「同」「蒙御免」 in Kaisei Tokumin / Noto Serif SC). */
export const display: Partial<Record<Lang, string>> = { ja: '同蒙御免', zh: '同东西交付人才大关关胁小结前头八年〇一二三四五六七八九十霜降修订' };
