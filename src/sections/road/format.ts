/**
 * Road — text helpers for captions (DESIGN §3.3 vertical-writing rules, §9 numerals). Owner: WP-06. Node-safe.
 */
import type { Lang } from '../../core/types';

const KANJI_DIGIT = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九'] as const;
const KANJI_SMALL = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'] as const;

/** Year digits read one by one in kanji, as Japanese vertical display text sets them: 2018 → 二〇一八. */
export function kanjiDigits(s: string): string {
  return s.replace(/\d/g, (d) => KANJI_DIGIT[Number(d)]!);
}

/** Positional kanji number for counts below 100: 11 → 十一, 24 → 二十四, 39 → 三十九. */
export function kanjiNumber(n: number): string {
  if (n < 10) return KANJI_DIGIT[n]!;
  const t = Math.floor(n / 10), u = n % 10;
  return (t > 1 ? KANJI_SMALL[t] : '') + '十' + KANJI_SMALL[u];
}

/**
 * Career year for the chapter heading: vertical ja uses kanji digits and a wave dash for the range
 * (2024–25 → 二〇二四〜二五); en/zh keep the digits.
 */
export function chapterYear(year: string, lang: Lang): string {
  if (lang !== 'ja') return year;
  return year.split('–').map(kanjiDigits).join('〜');
}

/**
 * Markup for Japanese text that may be set vertically (§3.3): numbers of one to three digits stand upright as
 * 縦中横 (`.tcy`); capital acronyms of two or three letters stand upright letter by letter (`.upr`); longer
 * Latin runs, decimals and years lie on their side as usual (`text-orientation: mixed`). The spans have no
 * effect in horizontal lines, so the same markup serves portrait captions and the static tier.
 */
export function tateHtml(text: string, esc: (s: string) => string): string {
  const re = /(\d+(?:[.,]\d+)*%?)|(\b[A-Z]{2,3}\b)/g;
  let out = '';
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    out += esc(text.slice(last, m.index));
    if (m[1]) {
      const num = m[1];
      // a bare count of ≤ 3 digits (not glued to Latin letters, e.g. p95 / WebGL2) stands upright
      const prev = text[m.index - 1] ?? '';
      const glued = /[A-Za-z]/.test(prev);
      out += /^\d{1,3}$/.test(num) && !glued ? `<span class="tcy">${esc(num)}</span>` : esc(num);
    } else {
      out += `<span class="upr">${esc(m[2]!)}</span>`;
    }
    last = m.index + m[0].length;
  }
  return out + esc(text.slice(last));
}

/**
 * Art date for figure captions from the manifest's English form ("c. 1833/34", "c. 1833-34", "ca. 1833–34").
 */
export function artDate(date: string, lang: Lang): string {
  const m = /(\d{4})\s*[/–-]\s*(\d{2,4})/.exec(date);
  if (!m) return date;
  const a = m[1]!, b = m[2]!;
  const bFull = b.length === 2 ? a.slice(0, 2) + b : b;
  if (lang === 'ja') return `${a}〜${b.slice(-2)}年頃`;
  if (lang === 'zh') return `约${a}—${bFull}年`;
  return `c. ${a}–${b.slice(-2)}`;
}
