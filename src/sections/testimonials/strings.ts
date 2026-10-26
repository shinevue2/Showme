/** Testimonials micro-strings (DESIGN §6.9). Owner: WP-10. */
import type { Lang } from '../../core/types';

export const strings: Readonly<Record<Lang, { quotes: string }>> = {
  ja: { quotes: '一緒に働いた人の言葉' },
  en: { quotes: 'What colleagues say' },
  zh: { quotes: '同事的评价' },
};

export const display: Partial<Record<Lang, string>> = {};
