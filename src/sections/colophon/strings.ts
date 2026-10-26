/** Colophon micro-strings (DESIGN §6.11). Owner: WP-10. */
import type { Lang } from '../../core/types';

export interface ColophonStrings {
  credits: string; pipeline: string; fontsLine: string; imagesLine: string; source: string; libraries: string;
  measuring: string; printAlt: string; detail: string; edition: string; licence: string; carvingLine: string; printNote: string;
}

export const strings: Readonly<Record<Lang, ColophonStrings>> = {
  ja: {
    credits: '図版の出典', pipeline: 'Playwright と SwiftShader で撮影、x264（-g 8 -bf 0）で符号化', fontsLine: '{n}書体（OFL-1.1）', imagesLine: '図版{n}点（すべてパブリックドメイン CC0）',
    source: '所蔵館の頁', libraries: '依存ライブラリ', measuring: '計測中', printAlt: '今日の一枚：閲覧のたびに版が重なり、墨流しと落款で仕上がる錦絵', detail: '（部分）', edition: '版', licence: 'パブリックドメイン（CC0）',
    carvingLine: 'three.js、GSAP、Lenis、mediabunny、Vite、TypeScript', printNote: 'この頁を読み進めるあいだに重なった版と、あなたの墨流し、落款。一枚ずつ違う。',
  },
  en: {
    credits: 'Picture credits', pipeline: 'Captured with Playwright and SwiftShader, encoded with x264 (-g 8 -bf 0)', fontsLine: '{n} typefaces (OFL-1.1)', imagesLine: '{n} pictures, all public domain (CC0)',
    source: 'Museum page', libraries: 'Libraries', measuring: 'measuring', printAlt: "Today's print: the plates you passed, your marbling and your seal on one sheet", detail: ' (detail)', edition: 'Edition', licence: 'Public domain (CC0)',
    carvingLine: 'three.js, GSAP, Lenis, mediabunny, Vite, TypeScript', printNote: 'The plates you passed while reading, your marbling and your seal. No two are alike.',
  },
  zh: {
    credits: '图版出处', pipeline: '以 Playwright 与 SwiftShader 采集，x264（-g 8 -bf 0）编码', fontsLine: '{n} 款字体（OFL-1.1）', imagesLine: '图版 {n} 幅（均为公有领域 CC0）',
    source: '馆藏页面', libraries: '依赖库', measuring: '测量中', printAlt: '今日之印：你经过的色版、你的墨流与印章，套印在同一张纸上', detail: '（局部）', edition: '版次', licence: '公有领域（CC0）',
    carvingLine: 'three.js、GSAP、Lenis、mediabunny、Vite、TypeScript', printNote: '你一路读来叠上的色版、你的墨流与印章。每一张都不同。',
  },
};

/** Glyphs the edition line and the 節気 date stamp can show (built at render time, not in copy). */
export const display: Partial<Record<Lang, string>> = {
  ja: '令和〇一二三四五六七八九十百年版刷摺第 立春雨水啓蟄春分清明穀雨立夏小満芒種夏至小暑大暑立秋処暑白露秋分寒露霜降立冬小雪大雪冬至小寒大寒',
  zh: '〇一二三四五六七八九十百年版次印刷第 立春雨水惊蛰春分清明谷雨立夏小满芒种夏至小暑大暑立秋处暑白露秋分寒露霜降立冬小雪大雪冬至小寒大寒',
};
