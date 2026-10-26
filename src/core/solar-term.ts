/**
 * 二十四節気 (24 solar terms) from the Sun's apparent ecliptic longitude — Meeus, *Astronomical
 * Algorithms* ch. 25 (low precision, ≈ 0.01°). Term 0 = 立春 at λ = 315°, then every 15°.
 * Owner: WP-00. Node-safe (pure math; render modules may import it for build-date stamps).
 */

export interface SolarTerm { index: number; ja: string; zh: string; en: string; romaji: string; longitude: number }

const TERMS: readonly [ja: string, zh: string, en: string, romaji: string][] = [
  ['立春', '立春', 'Start of Spring', 'risshun'], ['雨水', '雨水', 'Rain Water', 'usui'],
  ['啓蟄', '惊蛰', 'Awakening of Insects', 'keichitsu'], ['春分', '春分', 'Spring Equinox', 'shunbun'],
  ['清明', '清明', 'Clear and Bright', 'seimei'], ['穀雨', '谷雨', 'Grain Rain', 'kokuu'],
  ['立夏', '立夏', 'Start of Summer', 'rikka'], ['小満', '小满', 'Grain Buds', 'shōman'],
  ['芒種', '芒种', 'Grain in Ear', 'bōshu'], ['夏至', '夏至', 'Summer Solstice', 'geshi'],
  ['小暑', '小暑', 'Minor Heat', 'shōsho'], ['大暑', '大暑', 'Major Heat', 'taisho'],
  ['立秋', '立秋', 'Start of Autumn', 'risshū'], ['処暑', '处暑', 'End of Heat', 'shosho'],
  ['白露', '白露', 'White Dew', 'hakuro'], ['秋分', '秋分', 'Autumn Equinox', 'shūbun'],
  ['寒露', '寒露', 'Cold Dew', 'kanro'], ['霜降', '霜降', "Frost's Descent", 'sōkō'],
  ['立冬', '立冬', 'Start of Winter', 'rittō'], ['小雪', '小雪', 'Minor Snow', 'shōsetsu'],
  ['大雪', '大雪', 'Major Snow', 'taisetsu'], ['冬至', '冬至', 'Winter Solstice', 'tōji'],
  ['小寒', '小寒', 'Minor Cold', 'shōkan'], ['大寒', '大寒', 'Major Cold', 'daikan'],
];

/**
 * `--season` accent per term (non-text; DESIGN §3.1 "JS overrides per 二十四節気"). Every value is an
 * existing named token colour (source noted), so no new colour enters the palette.
 */
export const SEASON_COLORS: readonly { hex: string; name: string }[] = [
  { hex: '#F4A7B9', name: '一斤染 NC' }, { hex: '#A5DEE4', name: '瓶覗 NC' }, { hex: '#5DAC81', name: '若竹 NC' },
  { hex: '#F596AA', name: '桃 NC' }, { hex: '#33A6B8', name: '浅葱 NC' }, { hex: '#78C2C4', name: '白群 NC' },
  { hex: '#268785', name: '青碧 NC' }, { hex: '#E9CD4C', name: '刈安 NC' }, { hex: '#42602D', name: '松葉 NC' },
  { hex: '#006284', name: '縹 NC' }, { hex: '#51A8DD', name: '群青 NC' }, { hex: '#005CAF', name: '瑠璃 NC' },
  { hex: '#8A6BBE', name: '藤紫 NC' }, { hex: '#70649A', name: '二藍 NC' }, { hex: '#BDC0BA', name: '白鼠 NC' },
  { hex: '#FFB11B', name: '山吹 NC' }, { hex: '#F05E1C', name: '黄丹 NC' }, { hex: '#E2943B', name: '朽葉 NC' },
  { hex: '#B35C37', name: '樺茶 NC' }, { hex: '#91989F', name: '銀鼠 NC' }, { hex: '#EAF4FC', name: '月白 WD' },
  { hex: '#0F2540', name: '紺 NC' }, { hex: '#656765', name: '鈍 NC' }, { hex: '#566C73', name: '藍鼠 NC' },
];

const rad = Math.PI / 180;
const norm360 = (x: number) => ((x % 360) + 360) % 360;

/** Apparent geocentric ecliptic longitude of the Sun in degrees (Meeus 25.2–25.8, low accuracy). */
export function sunLongitude(d: Date): number {
  const jd = d.getTime() / 86400000 + 2440587.5;
  const T = (jd - 2451545.0) / 36525;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const Mr = M * rad;
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mr)
    + (0.019993 - 0.000101 * T) * Math.sin(2 * Mr)
    + 0.000289 * Math.sin(3 * Mr);
  const trueLong = L0 + C;
  const omega = 125.04 - 1934.136 * T;
  return norm360(trueLong - 0.00569 - 0.00478 * Math.sin(omega * rad));
}

export function solarTerm(d: Date = new Date()): SolarTerm {
  const lon = sunLongitude(d);
  const index = Math.floor(norm360(lon - 315) / 15) % 24;
  const [ja, zh, en, romaji] = TERMS[index]!;
  return { index, ja, zh, en, romaji, longitude: lon };
}

/** Japanese era year for the colophon stamp (令和 from 2019-05-01). */
export function reiwaYear(d: Date = new Date()): number {
  return d.getUTCFullYear() - 2018;
}
