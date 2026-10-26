/**
 * Bundles src/content (+ every section's strings.ts and the chrome strings) with esbuild and imports it,
 * so Node scripts can read the TypeScript content without tsx. Owner: WP-02.
 */
import { build } from 'esbuild';
import { existsSync } from 'node:fs';
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = fileURLToPath(new URL('../..', import.meta.url));

/** @returns {Promise<{ content: any, sectionStrings: Record<string, any>, chrome: any, solarTerms: any, numerals: any }>} */
export async function loadContent() {
  const secDir = path.join(ROOT, 'src/sections');
  const sections = (await readdir(secDir, { withFileTypes: true }))
    .filter((d) => d.isDirectory() && existsSync(path.join(secDir, d.name, 'strings.ts')))
    .map((d) => d.name)
    .sort();
  const code = [
    `export { content } from '@/content/index';`,
    ...sections.map((s, i) => `import * as s${i} from '@/sections/${s}/strings';`),
    `export const sectionStrings = { ${sections.map((s, i) => `${JSON.stringify(s)}: s${i}`).join(', ')} };`,
    `export * as chrome from '@/chrome/strings';`,
    `export * as solarTerms from '@/core/solar-term';`,
    `export * as numerals from '@/core/numerals';`,
  ].join('\n');
  const res = await build({
    stdin: { contents: code, resolveDir: ROOT, loader: 'ts', sourcefile: 'wp02-content-entry.ts' },
    bundle: true, write: false, format: 'esm', platform: 'node', target: 'node22',
    alias: { '@': path.join(ROOT, 'src') }, loader: { '.json': 'json' }, logLevel: 'silent',
  });
  const dir = path.join(ROOT, 'node_modules/.cache/wp02');
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `content-${process.pid}.mjs`);
  await writeFile(file, res.outputFiles[0].text);
  try { return await import(pathToFileURL(file).href); } finally { await rm(file, { force: true }); }
}

/** Every string value reachable from `v` for language `lang` (T objects contribute only `lang`). */
export function strings(v, lang, out = []) {
  if (v == null) return out;
  if (typeof v === 'string') { out.push(v); return out; }
  if (typeof v === 'number') { out.push(String(v)); return out; }
  if (Array.isArray(v)) { for (const x of v) strings(x, lang, out); return out; }
  if (typeof v === 'object') {
    const keys = Object.keys(v);
    if (keys.length === 3 && ['ja', 'en', 'zh'].every((k) => typeof v[k] === 'string')) { out.push(v[lang]); return out; }
    for (const k of keys) if (k !== 'prov') strings(v[k], lang, out);
  }
  return out;
}
