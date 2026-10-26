/**
 * i18n (DESIGN §9, §4.3 language wheel). Owner: WP-00.
 * Static pages, real URLs: switching navigates to the other language's page (never a client-side swap).
 * Position is stored as sessionStorage['hanmoto.pos'] = { section, offset (fraction of section height), hash }
 * and restored before first paint by the inline body script.
 */
import type { I18nAPI, Lang, PageKind, PlateN, ChromeAPI, ScrollAPI } from './types';
import { daiji, daxie, plateNumeral } from './numerals';
import { solarTerm } from './solar-term';
import { jstNow } from './clock';
import { local, session } from './storage';

const LOCALE: Record<Lang, string> = { ja: 'ja-JP', en: 'en-US', zh: 'zh-CN' };

export interface I18nDeps {
  lang: Lang;
  page: PageKind;
  caseId?: string;
  scroll: () => ScrollAPI | null;
  chrome: () => ChromeAPI | null;
}

export function pageDepth(lang: Lang, page: PageKind): number {
  const prefix = lang === 'ja' ? 0 : 1;
  return page === 'case' ? prefix + 2 : page === 'notfound' ? 0 : prefix;
}

export function createI18n(d: I18nDeps): I18nAPI {
  const { lang, page, caseId } = d;
  const depth = pageDepth(lang, page);
  const up = '../'.repeat(depth);
  const prefetched = new Set<Lang>();

  const pathFor = (l: Lang): string => {
    const prefix = l === 'ja' ? '' : `${l}/`;
    if (page === 'case' && caseId) return `${prefix}works/${caseId}/`;
    return prefix;
  };
  const relFor = (l: Lang) => (up + pathFor(l)) || './';

  const parseIso = (iso: string): { date: Date; parts: number } => {
    const [y, m, dd] = iso.split('-').map((x) => Number(x));
    return { date: new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, dd ?? 1, 3)), parts: iso.split('-').length };
  };

  return {
    lang,
    t: (x) => x[lang],
    href(l: Lang) {
      return relFor(l) + (location.hash || '');
    },
    switchTo(l: Lang) {
      if (l === lang) return;
      const sc = d.scroll();
      const id = sc?.active ?? 'cover';
      const el = document.getElementById(id);
      let offset = 0;
      if (el && page === 'main') {
        const r = el.getBoundingClientRect();
        offset = r.height > 0 ? Math.max(0, Math.min(1, -r.top / r.height)) : 0;
      }
      if (page === 'main') session.setJson('hanmoto.pos', { section: id, offset, hash: location.hash || '' });
      local.set('hanmoto.lang', l);
      session.set('hanmoto.langSwitched', '1');
      const go = () => { location.href = page === 'main' ? relFor(l) : relFor(l) + (location.hash || ''); };
      const spin = d.chrome()?.spinWheel(l);
      if (spin) {
        let done = false;
        const fire = () => { if (!done) { done = true; go(); } };
        spin.then(fire, fire);
        setTimeout(fire, 450);
      } else go();
    },
    prefetch(l: Lang) {
      if (l === lang || prefetched.has(l)) return;
      prefetched.add(l);
      const add = (href: string, as?: string) => {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = href;
        if (as) link.as = as;
        document.head.appendChild(link);
      };
      add(relFor(l), 'document');
      if (document.querySelector('link[href*="fonts/fonts-"]')) add(up + `fonts/fonts-${l}.css`, 'style');
    },
    num(n: number, opts?: Intl.NumberFormatOptions) {
      try { return new Intl.NumberFormat(LOCALE[lang], opts).format(n); } catch { return String(n); }
    },
    date(iso: string, style: 'short' | 'long' | 'month' = 'short') {
      const { date, parts } = parseIso(iso);
      const o: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Tokyo', year: 'numeric' };
      if (style === 'short') { if (parts >= 2) o.month = '2-digit'; if (parts >= 3) o.day = '2-digit'; }
      else if (style === 'long') { if (parts >= 2) o.month = 'long'; if (parts >= 3) o.day = 'numeric'; }
      else o.month = 'long';
      try { return new Intl.DateTimeFormat(LOCALE[lang], o).format(date); } catch { return iso; }
    },
    daiji,
    daxie,
    plateNumeral: (n: PlateN) => plateNumeral(n, lang),
    jstNow: () => jstNow(),
    solarTerm: (dt?: Date) => {
      const s = solarTerm(dt);
      return { index: s.index, ja: s.ja, zh: s.zh, en: s.en };
    },
  };
}
