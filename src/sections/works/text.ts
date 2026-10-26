/**
 * Works — text helpers (DESIGN §3.3, §3.6, §9). Owner: WP-07. Node-safe.
 */
import type { Lang, RenderCtx } from '../../core/types';
import type { CaseStudy } from '../../content/types';
import { manifestEntry } from '../../content/index';
import { esc } from '../../render/helpers';
import { strings } from './strings';

/** Sentences of a paragraph (ja/zh end at 。！？, en at . ! ? followed by a space and a capital or digit). */
export function sentences(text: string, lang: Lang): string[] {
  if (lang !== 'en') return (text.match(/[^。！？]+[。！？]?/g) ?? [text]).map((s) => s.trim()).filter(Boolean);
  // a full stop ends a sentence only before whitespace + a capital, digit or quote (keeps 99.95 and "3 a.m. on-call")
  const out: string[] = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (ch !== '.' && ch !== '!' && ch !== '?') continue;
    const rest = text.slice(i + 1);
    if (rest === '' || /^\s+[A-Z0-9“"‘]/.test(rest)) {
      out.push(text.slice(start, i + 1).trim());
      start = i + 1;
    }
  }
  if (start < text.length && text.slice(start).trim()) out.push(text.slice(start).trim());
  return out;
}

/** The opening of a paragraph: whole sentences until at least `min` characters (DOM column 問 / 術, 1–2 lines). */
export function lead(text: string, lang: Lang, min = lang === 'en' ? 88 : 38): string {
  const parts = sentences(text, lang);
  let out = '';
  for (const s of parts) {
    out += (out && lang === 'en' ? ' ' : '') + s;
    if (out.length >= min) break;
  }
  return out;
}

/**
 * Body text with its figures set in the chrome mono (Martian Mono): digits with their decimal points,
 * percent signs, ×, and the before → after arrows. Escapes everything else.
 */
export function numerals(text: string): string {
  const re = /(×?\d+(?:[.,]\d+)*(?:\s?%)?|→)/g;
  let out = '';
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    out += esc(text.slice(last, m.index)) + `<span class="num">${esc(m[0])}</span>`;
    last = m.index + m[0].length;
  }
  return out + esc(text.slice(last));
}

/** Manifest dates (English) in the page language. */
const DATES: Readonly<Record<string, Readonly<Record<Lang, string>>>> = {
  'after 1709': { ja: '1709年以降', en: 'after 1709', zh: '1709年以后' },
  'ca. 1704–9': { ja: '1704〜09年頃', en: 'c. 1704–09', zh: '约1704—1709年' },
  'early 19th century': { ja: '19世紀前半', en: 'early 19th century', zh: '19世纪前期' },
  'mid-17th century': { ja: '17世紀中頃', en: 'mid-17th century', zh: '17世纪中叶' },
  'early 17th century': { ja: '17世紀前半', en: 'early 17th century', zh: '17世纪前期' },
  'mid- to late 17th century': { ja: '17世紀中頃〜後半', en: 'mid- to late 17th century', zh: '17世纪中后期' },
  'probably 1834': { ja: '1834年頃', en: 'probably 1834', zh: '约1834年' },
  'c. 1776': { ja: '1776年頃', en: 'c. 1776', zh: '约1776年' },
};

/** Caption meta per §3.6: date · institution, localised. */
export function artMeta(file: string, lang: Lang): string {
  const m = manifestEntry(file);
  if (!m) return '';
  const date = DATES[m.date]?.[lang] ?? m.date;
  const inst = strings[lang].institutions[m.institution] ?? m.institution;
  return `${date}${strings[lang].sep}${inst}`;
}

/** Full caption: artist · title (credits) · date · institution. */
export function artCaption(rc: RenderCtx, file: string): string {
  const credit = rc.content.credits[file];
  const meta = artMeta(file, rc.lang);
  const title = credit ? rc.t(credit.title) : file;
  return `${esc(title)}${meta ? `<span class="art-meta">${esc(strings[rc.lang].sep)}${esc(meta)}</span>` : ''}`;
}

/** "Employer · period · role" line of a case. */
export function caseMeta(rc: RenderCtx, cs: CaseStudy): string {
  const L = rc.lang;
  const emp = rc.content.employers.find((e) => e.id === cs.employer);
  const sep = `<span class="sep" aria-hidden="true">${esc(strings[L].sep)}</span>`;
  return [emp ? esc(emp.name[L]) : '', `<span class="num">${esc(cs.period)}</span>`, esc(cs.role[L])].filter(Boolean).join(sep);
}

/**
 * Japanese text that may be set vertically (§3.3): counts of one to three digits stand upright as 縦中横
 * (`.tcy`); longer figures lie on their side. Harmless in horizontal lines.
 */
export function tateNumerals(text: string): string {
  const re = /\d+(?:[.,]\d+)*/g;
  let out = '';
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    const prev = text[m.index - 1] ?? '';
    const upright = /^\d{1,3}$/.test(m[0]) && !/[A-Za-z]/.test(prev);
    out += esc(text.slice(last, m.index)) + (upright ? `<span class="tcy">${esc(m[0])}</span>` : `<span class="num">${esc(m[0])}</span>`);
    last = m.index + m[0].length;
  }
  return out + esc(text.slice(last));
}
