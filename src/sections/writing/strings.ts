/** Writing micro-strings (DESIGN §6.8). Owner: WP-10. */
import type { Lang } from '../../core/types';

export interface WritingStrings {
  inks: string; clear: string; abstract: string; tray: string; printed: string; linkCopied: string; linkFailed: string;
  reset: string; static: string; lang: string;
}

export const strings: Readonly<Record<Lang, WritingStrings>> = {
  ja: {
    inks: '墨の色', clear: '透明（界面活性剤）', abstract: '概要', tray: '墨流しの水盤',
    printed: '紙に写しました。保存しています', linkCopied: 'リンクをコピーしました', linkFailed: 'リンクを選んでコピーしてください',
    reset: '最初の模様に戻しました', static: 'この環境では模様の静止画を表示しています', lang: '言語',
  },
  en: {
    inks: 'Ink', clear: 'Clear (surfactant)', abstract: 'Abstract', tray: 'Marbling tray',
    printed: 'Print taken; saving the image', linkCopied: 'Link copied', linkFailed: 'Select the link to copy it',
    reset: 'Back to the first pattern', static: 'A still of the pattern is shown here', lang: 'Language',
  },
  zh: {
    inks: '墨色', clear: '透明（表面活性剂）', abstract: '摘要', tray: '墨流水盘',
    printed: '已覆纸取印，正在保存', linkCopied: '链接已复制', linkFailed: '请选中链接后复制',
    reset: '已恢复最初的纹样', static: '此处显示纹样的静态图', lang: '语言',
  },
};

export const display: Partial<Record<Lang, string>> = {};
