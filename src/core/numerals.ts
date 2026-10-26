/**
 * Numerals (DESIGN §3.2, §9, §14.1). Node-safe: imported by render modules.
 * ja 大字: 壱弐参肆伍陸漆捌玖拾 (佰 阡 萬) · zh 大写: 壹贰叁肆伍陆柒捌玖拾 (佰 仟 万) · en Roman I–VIII…
 */
import type { Lang, PlateN } from './types';

const DAIJI_DIGITS = ['零', '壱', '弐', '参', '肆', '伍', '陸', '漆', '捌', '玖'] as const;
const DAXIE_DIGITS = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'] as const;
const DAIJI_UNITS = ['', '拾', '佰', '阡'] as const;
const DAXIE_UNITS = ['', '拾', '佰', '仟'] as const;

function formal(n: number, digits: readonly string[], units: readonly string[], myriad: string, zh: boolean): string {
  if (!Number.isFinite(n) || n < 0) return String(n);
  n = Math.floor(n);
  if (n === 0) return digits[0]!;
  const below10k = (v: number): string => {
    let out = '';
    let zeroPending = false;
    for (let p = 3; p >= 0; p--) {
      const d = Math.floor(v / 10 ** p) % 10;
      if (d === 0) {
        if (out) zeroPending = true;
        continue;
      }
      if (zeroPending && zh) out += digits[0];
      zeroPending = false;
      // display convention used on seals and banzuke (DESIGN §6.7): 12 → 拾弐 / 拾贰, not 壱拾弐
      out += (d === 1 && p === 1 && out === '' ? '' : digits[d]!) + units[p]!;
    }
    return out;
  };
  if (n < 10000) return below10k(n);
  const hi = Math.floor(n / 10000);
  const lo = n % 10000;
  return below10k(hi) + myriad + (lo ? (zh && lo < 1000 ? digits[0] : '') + below10k(lo) : '');
}

/** ja 大字, e.g. 12 → 拾弐, 7 → 漆, 120 → 壱佰弐拾. */
export function daiji(n: number): string {
  return formal(n, DAIJI_DIGITS, DAIJI_UNITS, '萬', false);
}

/** zh 大写, e.g. 12 → 拾贰, 7 → 柒, 105 → 壹佰零伍. */
export function daxie(n: number): string {
  return formal(n, DAXIE_DIGITS, DAXIE_UNITS, '万', true);
}

const ROMAN: readonly [number, string][] = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
  [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
];

export function roman(n: number): string {
  let out = '';
  let v = Math.floor(n);
  for (const [k, s] of ROMAN) while (v >= k) { out += s; v -= k; }
  return out;
}

/** Plate numeral: ja 壱 · en I · zh 壹 (printing order = year, so the numbering is information). */
export function plateNumeral(n: PlateN, lang: Lang): string {
  return lang === 'ja' ? daiji(n) : lang === 'zh' ? daxie(n) : roman(n);
}

/** Kanji (non-formal) numerals for vertical CJK display text, e.g. 2026 → 二〇二六 (digit by digit). */
export function kanjiDigits(n: number | string): string {
  const K = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  return String(n).replace(/[0-9]/g, (d) => K[Number(d)]!);
}
