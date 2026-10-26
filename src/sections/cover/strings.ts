/** Cover micro-strings (DESIGN §6.1). Owner: WP-05. */
import type { Lang } from '../../core/types';

export interface CoverStrings {
  facts: string; clockLabel: string; cvPdf: string; keyLine: string;
  dt: { years: string; specialty: string; location: string; availability: string; languages: string };
  /** Illustrator-style artboard label above the print sheet. */
  sheetLabel: string;
  /** Accessible name of the carved-block still (static tier, fallbacks). */
  blockAlt: string;
  /** Illustrator's smart-guide label at the crest's construction intersections. */
  intersect: string;
}

export const strings: Readonly<Record<Lang, CoverStrings>> = {
  ja: {
    facts: '概要', clockLabel: '東京の現在時刻', cvPdf: '履歴書 PDF', keyLine: '東海道の主版：2018年 日本橋から 2026年 京師まで',
    dt: { years: '経験', specialty: '専門', location: '拠点', availability: '参画', languages: '言語' },
    sheetLabel: '大判 錦絵 · 主版',
    blockAlt: '裏返しに彫られた山桜の主版。名前と東海道の線が鏡文字で浮き彫りになり、凸面にだけ墨が残っている',
    intersect: '交差',
  },
  en: {
    facts: 'At a glance', clockLabel: 'Current time in Tokyo', cvPdf: 'CV PDF', keyLine: 'The Tōkaidō key line: from Nihonbashi in 2018 to Kyoto in 2026',
    dt: { years: 'Experience', specialty: 'Specialty', location: 'Based in', availability: 'Available', languages: 'Languages' },
    sheetLabel: 'Ōban print · key block',
    blockAlt: 'The mirror-carved cherry key block: the name and the Tōkaidō line stand in reverse relief, with ink only on the raised faces',
    intersect: 'intersect',
  },
  zh: {
    facts: '概要', clockLabel: '东京当前时间', cvPdf: '简历 PDF', keyLine: '东海道主版：从 2018 年日本桥到 2026 年京师',
    dt: { years: '经验', specialty: '专长', location: '所在地', availability: '可入职', languages: '语言' },
    sheetLabel: '大判锦绘 · 主版',
    blockAlt: '反刻的山樱木主版：姓名与东海道线条以镜像浮雕凸起，只有凸面留着墨',
    intersect: '交叉',
  },
};

/** Extra glyphs rendered in the cover display face (font subsetting input, §3.3). The name is already listed. */
export const display: Partial<Record<Lang, string>> = {};
