/**
 * Site configuration (DESIGN §1.4, §11.2). Owner: WP-01. Node-safe.
 *
 * Persona links must never point at a real person (§1.4). Checked by WP-01 on 2026-10-26:
 * - github.com/segawa-minato-hanmoto → HTTP 404 (also api.github.com/users/… → 404).
 * - segawa-minato.dev → no DNS answer (NXDOMAIN) and the .dev registry RDAP returns 404 "not found":
 *   the domain is unregistered. Never a `.ai` domain.
 * - linkedin.com/in/segawa-minato-hanmoto → LinkedIn answers every scripted request with HTTP 999, so the
 *   handle cannot be probed by curl; a web search for the exact handle returns nothing.
 * Re-check all three whenever the persona data is replaced, then set `sampleNotice: false`.
 *
 * Meta descriptions: ≤ 120 characters ja/zh, ≤ 155 en (§11.2).
 */
import type { T, Site } from './types';

const t = (ja: string, en: string, zh: string): T => ({ ja, en, zh });

export const site: Site = {
  title: t(
    '瀬川 湊 — シニアソフトウェアエンジニア｜八度摺',
    'Minato Segawa — Senior Software Engineer | Eight Impressions',
    '濑川 凑 — 高级软件工程师｜八版套印',
  ),
  description: t(
    '東京のシニアソフトウェアエンジニア、瀬川湊のポートフォリオ。分散システム、開発者基盤、Webの描画性能。8年の仕事を一枚の錦絵として摺る。',
    'Minato Segawa, senior software engineer in Tokyo: distributed systems, developer platforms and web rendering performance, told as a woodblock print.',
    '东京高级软件工程师濑川凑的作品集：分布式系统、开发者平台与Web渲染性能。8年的工作，套印成一幅锦绘。',
  ),
  ogAlt: t(
    '八度摺——瀬川湊、シニアソフトウェアエンジニア',
    'Eight Impressions — Minato Segawa, Senior Software Engineer',
    '八版套印——濑川凑，高级软件工程师',
  ),
  sampleNotice: true,
  sampleNoticeText: t(
    '掲載の人物・経歴・数値は差し替え可能な見本データです',
    'The person, career and figures shown are replaceable sample data.',
    '所载人物、经历与数据均为可替换的示例数据。',
  ),
  email: 'hello@segawa-minato.dev',
  links: {
    github: 'https://github.com/segawa-minato-hanmoto',
    linkedin: 'https://www.linkedin.com/in/segawa-minato-hanmoto',
  },
  contactEndpoint: null,
  siteOrigin: null,
  versionMajor: 1,
};
