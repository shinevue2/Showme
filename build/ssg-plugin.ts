/**
 * Static generation plugin (DESIGN §8.4). Owner: WP-00.
 *
 * Every stub HTML page (22) contains `<!--ssr-head-->` and `<!--ssr-body-->`. In `transformIndexHtml`
 * (order 'pre') this plugin infers `{ lang, page, caseId, depth }` from the file path and replaces the
 * markers (and the `<html>` attributes) with `renderPage(spec)` from `src/render/page.ts`.
 *   - dev:   the render module is loaded through Vite's SSR module loader (HMR-aware; a full reload is
 *            sent when content or render code changes);
 *   - build: the render module is bundled once with esbuild (platform node, ESM, `@` → src, JSON loader)
 *            into build/.cache and imported.
 * Build-time options travel in the page spec (render modules stay Node-safe, no import.meta.env):
 *   FONT_SOURCE=google  → Google Fonts CSS2 links instead of self-hosted fonts (amendment A1)
 *   SITE_ORIGIN=https://… → absolute canonical / hreflang / OG URLs
 *   public/fonts/preload.json (optional, written by WP-02) → font preloads per language
 * Dev only: requests for not-yet-produced image derivatives (`img/{set}/{slug}.{w}.{avif|webp}`) fall back
 * to the source JPEG in assets-src/images so pages are readable before WP-02 runs.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, createReadStream } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Plugin, ViteDevServer, ResolvedConfig } from 'vite';

type Lang = 'ja' | 'en' | 'zh';
type PageKind = 'main' | 'case' | 'notfound';
interface PageSpec {
  lang: Lang; page: PageKind; caseId?: string; depth: number;
  fontSource?: 'self' | 'google'; siteOrigin?: string | null;
  fontPreload?: Partial<Record<Lang | 'shared', string[]>>;
}
interface RenderedPage { htmlAttrs: Record<string, string>; head: string; body: string }
interface PageModule {
  renderPage(spec: PageSpec): RenderedPage;
  countPersonaSample?: () => number;
  content: unknown;
  manifest: readonly Record<string, unknown>[];
  images: unknown;
}

const LANGS: readonly Lang[] = ['ja', 'en', 'zh'];
const CONTENT_PREFIX = 'virtual:hanmoto/content-';
const RESOLVED_PREFIX = '\0hanmoto-content:';

/**
 * T values (objects with exactly ja/en/zh string keys) that every page keeps in all three languages: names a
 * page may legitimately show in another language (the en cover's small ja name, ja colour names wrapped in
 * <span lang="ja"> on zh pages, station names on the Road sub-layers, employer/colleague names). Paths of
 * array items use the array's key (e.g. 'plates.name'). Everything else is page-language only at runtime.
 */
const KEEP_ALL = new Set([
  'person.name', 'copy.cover.name', 'copy.cover.nameLines', 'site.title',
  'plates.name', 'plates.numeral', 'stations.name', 'employers.name', 'testimonials.name',
]);

function isT(v: unknown): v is Record<Lang, string> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const k = Object.keys(v);
  return k.length === 3 && LANGS.every((l) => typeof (v as Record<string, unknown>)[l] === 'string');
}

/** Empty the other two languages' strings (the Content shape and every key stay intact). */
export function pruneContent(v: unknown, lang: Lang, path = ''): unknown {
  if (isT(v)) {
    if (KEEP_ALL.has(path)) return v;
    return { ja: lang === 'ja' ? v.ja : '', en: lang === 'en' ? v.en : '', zh: lang === 'zh' ? v.zh : '' };
  }
  if (Array.isArray(v)) return v.map((x) => pruneContent(x, lang, path));
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) out[k] = pruneContent(x, lang, path ? `${path}.${k}` : k);
    return out;
  }
  return v;
}

export const CASE_IDS = ['ledger', 'tracing', 'mapgl', 'strangler', 'platform', 'resilience'] as const;

/** The 22 stub pages, root-relative. */
export const STUB_PAGE_FILES: readonly string[] = [
  'index.html', 'en/index.html', 'zh/index.html', '404.html',
  ...CASE_IDS.flatMap((id) => [`works/${id}/index.html`, `en/works/${id}/index.html`, `zh/works/${id}/index.html`]),
];

export function inferSpec(rel: string): Omit<PageSpec, 'fontSource' | 'siteOrigin' | 'fontPreload'> | null {
  const segs = rel.split(/[\\/]/).filter(Boolean);
  if (!segs.length || !segs[segs.length - 1]!.endsWith('.html')) return null;
  let lang: Lang = 'ja';
  let rest = segs;
  if (segs[0] === 'en' || segs[0] === 'zh') { lang = segs[0]; rest = segs.slice(1); }
  const depth = segs.length - 1;
  if (rest.length === 1 && rest[0] === 'index.html') return { lang, page: 'main', depth };
  if (rest.length === 1 && rest[0] === '404.html' && lang === 'ja') return { lang, page: 'notfound', depth };
  if (rest.length === 3 && rest[0] === 'works' && rest[2] === 'index.html' && (CASE_IDS as readonly string[]).includes(rest[1]!)) {
    return { lang, page: 'case', caseId: rest[1], depth };
  }
  return null;
}

function attrString(attrs: Record<string, string>): string {
  return Object.entries(attrs).map(([k, v]) => ` ${k}="${v.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"`).join('');
}

export function applyRendered(html: string, out: RenderedPage): string {
  let next = html.replace(/<html\b[^>]*>/i, `<html${attrString(out.htmlAttrs)}>`);
  if (!next.includes('<!--ssr-head-->') || !next.includes('<!--ssr-body-->')) {
    throw new Error('[hanmoto-ssg] stub page is missing <!--ssr-head--> or <!--ssr-body-->');
  }
  next = next.replace('<!--ssr-head-->', () => out.head).replace('<!--ssr-body-->', () => out.body);
  return next;
}

const RENDER_DEPS = /[\\/]src[\\/](render|content|chrome[\\/](render|strings)\.ts|sections[\\/][^\\/]+[\\/](render|strings|case-render|not-found)\.ts|core[\\/](types|icons|numerals|solar-term)\.ts|film[\\/]film-manifest\.json)|[\\/]build[\\/]edition\.json|[\\/]assets-src[\\/]images[\\/]manifest\.json/;

export function ssg(): Plugin {
  let config: ResolvedConfig;
  let server: ViteDevServer | undefined;
  let buildModule: Promise<PageModule> | null = null;
  let rendered = 0;

  const pageEntry = () => path.join(config.root, 'src/render/page.ts');

  function buildOptions(): Pick<PageSpec, 'fontSource' | 'siteOrigin' | 'fontPreload'> {
    const fontSource = process.env.FONT_SOURCE === 'google' ? 'google' : 'self';
    const siteOrigin = process.env.SITE_ORIGIN ? process.env.SITE_ORIGIN.replace(/\/+$/, '') : null;
    let fontPreload: PageSpec['fontPreload'];
    const pre = path.join(config.root, 'public/fonts/preload.json');
    if (fontSource === 'self' && existsSync(pre)) {
      try { fontPreload = JSON.parse(readFileSync(pre, 'utf8')); } catch { fontPreload = undefined; }
    }
    return { fontSource, siteOrigin, fontPreload };
  }

  async function bundleForBuild(): Promise<PageModule> {
    const { build } = await import('esbuild');
    const outDir = path.join(config.root, 'build/.cache');
    mkdirSync(outDir, { recursive: true });
    for (const f of readdirSync(outDir)) if (/^render-page\.\d+\.mjs$/.test(f)) rmSync(path.join(outDir, f), { force: true });
    const outfile = path.join(outDir, `render-page.${Date.now()}.mjs`);
    await build({
      entryPoints: [pageEntry()],
      bundle: true,
      platform: 'node',
      format: 'esm',
      target: 'node22',
      outfile,
      alias: { '@': path.join(config.root, 'src') },
      loader: { '.json': 'json' },
      logLevel: 'warning',
      legalComments: 'none',
    });
    return (await import(pathToFileURL(outfile).href)) as PageModule;
  }

  async function loadModule(): Promise<PageModule> {
    if (server) {
      const s = server as ViteDevServer & { ssrLoadModule?: (id: string) => Promise<Record<string, unknown>> };
      if (typeof s.ssrLoadModule === 'function') return (await s.ssrLoadModule('/src/render/page.ts')) as unknown as PageModule;
      const env = (server.environments as Record<string, { runner?: { import(id: string): Promise<unknown> } }>).ssr;
      return (await env!.runner!.import('/src/render/page.ts')) as PageModule;
    }
    buildModule ??= bundleForBuild();
    return buildModule;
  }

  return {
    name: 'hanmoto-ssg',
    enforce: 'pre',
    configResolved(c) {
      config = c;
    },
    configureServer(s) {
      server = s;
      // Dev-only fallback for image derivatives that WP-02 has not produced yet.
      s.middlewares.use((req, res, next) => {
        const url = (req.url ?? '').split('?')[0]!;
        const m = /^\/(?:.*\/)?img\/([a-z]+)\/([a-z0-9-]+)\.(\d+)\.(avif|webp)$/i.exec(url);
        if (!m) return next();
        const publicFile = path.join(config.root, 'public', 'img', m[1]!, `${m[2]}.${m[3]}.${m[4]}`);
        if (existsSync(publicFile)) return next();
        const slug = m[2]!.replace(/-detail$/, '');
        const src = path.join(config.root, 'assets-src/images', m[1]!, `${slug}.jpg`);
        if (!existsSync(src)) return next();
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'no-cache');
        createReadStream(src).pipe(res);
      });
    },
    async buildStart() {
      if (config.command === 'build') buildModule = bundleForBuild();
    },
    resolveId(id) {
      if (id.startsWith(CONTENT_PREFIX)) {
        const lang = id.slice(CONTENT_PREFIX.length) as Lang;
        if ((LANGS as readonly string[]).includes(lang)) return RESOLVED_PREFIX + lang;
      }
      return null;
    },
    async load(id) {
      if (!id.startsWith(RESOLVED_PREFIX)) return null;
      const lang = id.slice(RESOLVED_PREFIX.length) as Lang;
      if (config.command !== 'build') {
        return `import { content, manifest, images } from '/src/content/index.ts';\nexport default { content, manifest, images };\n`;
      }
      const mod = await loadModule();
      const data = {
        content: pruneContent(mod.content, lang),
        // runtime never shows the research notes: drop `description`, blank `suggestedUse`
        manifest: mod.manifest.map(({ description: _d, ...rest }) => ({ ...rest, suggestedUse: '' })),
        images: mod.images,
      };
      return `export default JSON.parse(${JSON.stringify(JSON.stringify(data))});\n`;
    },
    transformIndexHtml: {
      order: 'pre',
      async handler(html, ctx) {
        if (!html.includes('<!--ssr-body-->')) return html;
        const rel = path.relative(config.root, ctx.filename).split(path.sep).join('/');
        const base = inferSpec(rel);
        if (!base) throw new Error(`[hanmoto-ssg] cannot infer page spec from ${rel}`);
        const mod = await loadModule();
        const out = mod.renderPage({ ...base, ...buildOptions() });
        rendered++;
        return applyRendered(html, out);
      },
    },
    handleHotUpdate({ file, server: s }) {
      if (RENDER_DEPS.test(file)) {
        s.ws.send({ type: 'full-reload' });
      }
    },
    async closeBundle() {
      if (config.command !== 'build' || !buildModule) return;
      try {
        const mod = await buildModule;
        const n = mod.countPersonaSample?.() ?? 0;
        if (n > 0) config.logger.warn(`[hanmoto-ssg] ${n} facts carry prov: 'persona-sample' (sample persona data; flip site.sampleNotice after replacing). Rendered ${rendered} pages.`);
        else config.logger.info(`[hanmoto-ssg] rendered ${rendered} pages.`);
      } catch { /* reporting only */ }
    },
  };
}
