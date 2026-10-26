/**
 * Assembles `content: Content` (DESIGN Appendix A) from the WP-01 files, the image manifest
 * (assets-src/images/manifest.json, research output, read-only) and images.json (WP-02).
 * Owner: WP-00. Node-safe: used by the SSG renderer and by the browser context.
 */
import type { Content, ManifestEntry, ImagesIndex, Prov } from './types';
import * as facts from './facts';
import { copy } from './copy';
import { glossary } from './glossary';
import { credits } from './credits';
import { site } from './site.config';
import manifestJson from '../../assets-src/images/manifest.json';
import imagesJson from './images.json';

export const manifest: readonly ManifestEntry[] = manifestJson as readonly ManifestEntry[];
export const images: ImagesIndex = imagesJson as ImagesIndex;

export const content: Content = {
  site,
  person: facts.person,
  employers: facts.employers,
  metrics: facts.metrics,
  plates: facts.plates,
  stations: facts.stations,
  career: facts.career,
  cases: facts.cases,
  domains: facts.domains,
  tools: facts.tools,
  principles: facts.principles,
  ops: facts.ops,
  banzuke: facts.banzuke,
  charts: facts.charts,
  reliability: facts.reliability,
  repos: facts.repos,
  articles: facts.articles,
  talks: facts.talks,
  testimonials: facts.testimonials,
  leadership: facts.leadership,
  glossary,
  credits,
  copy,
};

/** Lookup helpers shared by render modules and runtime code. */
export const byId = {
  metric: (id: string) => content.metrics.find((m) => m.id === id),
  employer: (id: string) => content.employers.find((e) => e.id === id),
  station: (id: string) => content.stations.find((s) => s.id === id),
  case: (id: string) => content.cases.find((c) => c.id === id),
  tool: (id: string) => content.tools.find((t) => t.id === id),
  plate: (n: number) => content.plates.find((p) => p.n === n),
};

export function manifestEntry(file: string): ManifestEntry | undefined {
  const base = file.replace(/-detail(\.[a-z]+)$/, '$1');
  return manifest.find((m) => m.file === file) ?? manifest.find((m) => m.file === base);
}

/** Number of facts carrying `prov: 'persona-sample'` (the build prints it as a warning, §1.4). */
export function countPersonaSample(c: Content = content): number {
  let n = 0;
  const visit = (v: unknown): void => {
    if (Array.isArray(v)) { for (const x of v) visit(x); return; }
    if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>;
      if (o.prov === ('persona-sample' satisfies Prov)) n++;
      for (const k of Object.keys(o)) if (k !== 'prov') visit(o[k]);
    }
  };
  visit(c);
  return n;
}
