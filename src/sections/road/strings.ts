/** Road micro-strings (DESIGN §6.3; ≤ 8 words each). Owner: WP-06. */
import type { Lang } from '../../core/types';

export interface RoadStrings {
  /** catalogue number of the print in Hiroshige's Hōeidō Tōkaidō ({n}: number) */
  printNo: string;
  chapters: string;
  outcomes: string;
  scope: string;
  /** the plate this year adds (label before "壱 主版 紺") */
  plate: string;
  institutions: Readonly<Record<string, string>>;
}

export const strings: Readonly<Record<Lang, RoadStrings>> = {
  ja: {
    printNo: '五十五図のうち第{n}図',
    chapters: '七つの宿場',
    outcomes: '成果',
    scope: '担当',
    plate: 'この年の版',
    institutions: { 'Art Institute of Chicago': 'シカゴ美術館', 'The Metropolitan Museum of Art': 'メトロポリタン美術館' },
  },
  en: {
    printNo: 'No. {n} of 55',
    chapters: 'Seven stations',
    outcomes: 'Outcomes',
    scope: 'Scope',
    plate: 'Plate added',
    institutions: { 'Art Institute of Chicago': 'Art Institute of Chicago', 'The Metropolitan Museum of Art': 'The Metropolitan Museum of Art' },
  },
  zh: {
    printNo: '五十五图之第{n}图',
    chapters: '七个驿站',
    outcomes: '成果',
    scope: '职责',
    plate: '本年之版',
    institutions: { 'Art Institute of Chicago': '芝加哥艺术博物馆', 'The Metropolitan Museum of Art': '大都会艺术博物馆' },
  },
};

/**
 * Extra glyphs set in the road display faces (Zen Antique ja / ZCOOL XiaoWei zh) beyond what
 * scripts/fonts/faces.mjs already collects (titles, stations, years, plates, kanji numerals).
 */
export const display: Partial<Record<Lang, string>> = {
  ja: '〜',
  zh: '–',
};
