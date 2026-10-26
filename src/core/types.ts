import type * as THREE from 'three';
import type { Content, CaseId, ImagesIndex, ManifestEntry } from '../content/types';
import type { IconName } from './icons';

export type Lang = 'ja' | 'en' | 'zh';
export const LANGS = ['ja', 'en', 'zh'] as const;
export const HTML_LANG: Record<Lang, string> = { ja: 'ja', en: 'en', zh: 'zh-Hans' };
export type Theme = 'day' | 'night';
export type ThemePref = 'auto' | 'light' | 'dark';
export type PageKind = 'main' | 'case' | 'notfound';
export type SectionId = 'cover' | 'summary' | 'road' | 'works' | 'skills' | 'principles'
  | 'achievements' | 'writing' | 'testimonials' | 'contact' | 'colophon';
export const SECTION_ORDER: readonly SectionId[] = ['cover', 'summary', 'road', 'works', 'skills',
  'principles', 'achievements', 'writing', 'testimonials', 'contact', 'colophon'];
export type BandId = 'cover-summary' | 'summary-road' | 'road-works' | 'works-skills' | 'skills-principles'
  | 'principles-achievements' | 'achievements-writing' | 'writing-testimonials' | 'testimonials-contact' | 'contact-colophon';
export type PlateN = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/* ---------- quality tiers ---------- */
export type TierName = 'high' | 'medium' | 'low' | 'software' | 'static';
export interface TierCounts {
  carveRes: 1024 | 768 | 512 | 0; blockSegments: 256 | 128 | 64 | 0; sheetSegments: readonly [number, number];
  byobuDetail: 2 | 1 | 0; byobuSegmentsPerPanel: 8 | 4 | 2;
  kumiko: number; sandTrail: 1024 | 512 | 256 | 0; sandDisplace: boolean;
  sunago: number; sealRes: 512 | 384 | 256 | 0; embossRes: 1024 | 768 | 512 | 0;
  marble: 1536 | 1024 | 768 | 512; marbleSpread: boolean; marbleIds: boolean;
  noren: { cols: number; rows: number; iters: number };
  emakiSegments: 900 | 600 | 300 | 0; texMax: 4096 | 2048 | 1024;
}
export interface Tier {
  name: TierName; maxDpr: number; minDpr: number; msaa: boolean; post: boolean;
  maxLiveViews: 0 | 1 | 2; bandExtraView: boolean; warmAhead: number; vramBudget: number;
  counts: TierCounts; mobile: boolean; renderer: string;
  caps: { floatRT: boolean; floatLinear: boolean; parallelCompile: boolean; maxTexture: number };
}
export interface TierAPI { readonly current: Tier; on(cb: (t: Tier) => void): () => void; force(name: TierName): void }

/* ---------- WebGL views ---------- */
export interface ViewFrame {
  progress: number;          // 0..1 as the placeholder crosses the viewport
  sectionProgress: number;   // 0..1 across the owning section's scroll range (sticky-aware)
  visible: number;           // 0..1 visible fraction
  pointer: THREE.Vector2 | null;  // view-local NDC, null when the pointer is elsewhere
  pointerDown: boolean;
  scrollVelocity: number;    // px/s
}
export interface View {
  readonly id: string;                 // 'cover-block' | 'works-byobu' | …
  readonly el: HTMLElement;            // placeholder; carries --poster
  readonly scene: THREE.Scene;
  readonly camera: THREE.Camera;
  readonly printName: string;          // Info panel label, e.g. '金箔'
  vram: number;                        // estimated bytes while live
  init(stage: StageAPI): Promise<void>;          // CPU-side construction only
  allocate?(stage: StageAPI): Promise<void>;     // render targets, data textures
  prewarm?(stage: StageAPI): void;               // one sim pass so off-graph programs link
  update(dt: number, t: number, f: ViewFrame): boolean;  // true = request another frame
  render(renderer: THREE.WebGLRenderer): void;
  park?(): void;                       // free RTs and large textures, keep materials
  dispose(): void;
  onContextRestored?(): void;          // rebuild RT contents, re-seed deterministically
  setOutline?(on: boolean): void;
  setTier?(t: Tier): void;             // uniforms / draw ranges only, never #define
}
export type ViewFactory = (el: HTMLElement, ctx: AppContext) => View;
export interface ViewOptions { order?: number; clear?: 'depth' | 'all'; band?: BandId }
export interface GlobalUniforms {
  uTime: THREE.IUniform<number>; uNight: THREE.IUniform<number>; uPointer: THREE.IUniform<THREE.Vector2>;
  uScroll: THREE.IUniform<number>; uDpr: THREE.IUniform<number>; uMotion: THREE.IUniform<number>;
  uOutline: THREE.IUniform<number>;
}
export interface StageStats {
  fps: number; frameMs: number; calls: number; triangles: number; programs: number; textures: number;
  geometries: number; dpr: number; tier: TierName; live: string[]; perViewMs: Record<string, number>;
  governor: string; gpu: string;
}
export interface StageAPI {
  readonly renderer: THREE.WebGLRenderer; readonly g: GlobalUniforms; readonly tier: Tier;
  register(view: View, opts?: ViewOptions): void; unregister(view: View): void;
  requestFrame(): void; pause(reason: string): void; resume(reason: string): void;
  setOutline(on: boolean): void; stats(): StageStats; onStats(cb: (s: StageStats) => void): () => void;
  loseContext(): void; restoreContext(): void;
}

/* ---------- scroll ---------- */
export interface TrackOptions { start?: string; end?: string; onUpdate(p: number): void; onToggle?(active: boolean): void }
export interface ScrollAPI {
  readonly y: number; readonly velocity: number; readonly active: SectionId;
  track(el: Element, opts: TrackOptions): () => void;          // ScrollTrigger (progress only) or IO fallback
  band(id: BandId): { el: HTMLElement | null; on(cb: (p: number) => void): () => void };
  section(id: SectionId): { el: HTMLElement; on(cb: (p: number) => void): () => void };
  onActive(cb: (id: SectionId) => void): () => void;
  scrollTo(target: string | Element | number, opts?: { immediate?: boolean; offset?: number }): void;
  refresh(): void;
}

/* ---------- theme, motion, i18n ---------- */
export interface ThemeAPI { readonly current: Theme; readonly pref: ThemePref; set(p: ThemePref): void; toggle(): void; on(cb: (t: Theme) => void): () => void }
export interface MotionAPI {
  readonly enabled: boolean; on(cb: (enabled: boolean) => void): () => void;
  registerSnap(root: ParentNode): void;                  // data-print behaviour (§5.5)
}
export interface I18nAPI {
  readonly lang: Lang;
  t(x: Readonly<Record<Lang, string>>): string;
  href(lang: Lang): string;            // this page in another language (relative URL, keeps #hash)
  switchTo(lang: Lang): void;          // store pref + position, spin wheel, navigate
  prefetch(lang: Lang): void;
  num(n: number, opts?: Intl.NumberFormatOptions): string;
  date(iso: string, style?: 'short' | 'long' | 'month'): string;
  daiji(n: number): string;            // ja 大字
  daxie(n: number): string;            // zh 大写
  plateNumeral(n: PlateN): string;     // 壱 | I | 壹
  jstNow(): { hh: string; mm: string; iso: string };
  solarTerm(d?: Date): { index: number; ja: string; zh: string; en: string };
}

/* ---------- today's print ---------- */
export interface MarbleOp { k: 'drop' | 'tine' | 'comb'; c?: [number, number]; r?: number; ink?: PlateN | 0;
  a?: [number, number]; m?: [number, number]; alpha?: number; lambda?: number; spacing?: number; id?: number }
export interface SealImpression { pressure: number; rotation: number; at: number }
export interface PrintStateAPI {
  readonly seed: number; readonly inked: ReadonlySet<PlateN>; readonly hidden: ReadonlySet<PlateN>;
  ink(n: PlateN): void; setHidden(n: PlateN, hidden: boolean): void;
  readonly marbling: { canvas: HTMLCanvasElement | null; ops: readonly MarbleOp[]; version: number };
  setMarbling(canvas: HTMLCanvasElement, ops: readonly MarbleOp[]): void;
  readonly seal: SealImpression | null; setSeal(s: SealImpression): void;
  on(ev: 'ink' | 'hide' | 'marbling' | 'seal', cb: () => void): () => void;
}

/* ---------- chrome bridge, assets, perf ---------- */
export interface ChromeAPI {
  setRulerYears(p: number | null): void;   // film only; null restores the artboard unit
  smartGuide(x: number, y: number, label: string): void;
  setStatus(text: string | null): void;
  spinWheel(to: Lang): Promise<void>;
}
export interface FilmVariant { src: string; w: number; h: number; fps: number; frames: number; bytes: number }
export interface FilmManifest {
  version: 1; duration: number;
  chapters: { n: 1 | 2 | 3 | 4 | 5 | 6 | 7; rest: number; hold: number; station: string }[];
  variants: { hd: FilmVariant; sd: FilmVariant; portrait: FilmVariant };
  stills: Record<'landscape' | 'portrait', { avif: string[]; webp: string[]; end: { avif: string; webp: string } }>;
  matchVp: [number, number]; matchVpPortrait: [number, number];
  endBands: { y: number; h: number; x0: number; x1: number }[];
  endBandsPortrait: { y: number; h: number; x0: number; x1: number }[];
}
export interface AssetAPI {
  url(rootRelative: string): string;       // dev: '/'+p ; build: new URL('../'+p, import.meta.url)
  img(file: string, opts: { alt: string; sizes: string; className?: string; eager?: boolean }): HTMLPictureElement;
  imageInfo(file: string): ImagesIndex[string] | undefined;
  readonly manifest: readonly ManifestEntry[];
  readonly film: FilmManifest;
}
export interface PerfAPI { bytes(): number; vitals(): { lcp?: number; inp?: number; cls?: number }; on(cb: () => void): () => void; mark(name: string): void }

/* ---------- context, sections, render ---------- */
export interface AppContext {
  readonly page: PageKind; readonly lang: Lang; readonly content: Content; readonly proof: boolean;
  readonly theme: ThemeAPI; readonly motion: MotionAPI; readonly tier: TierAPI; readonly scroll: ScrollAPI;
  readonly i18n: I18nAPI; readonly print: PrintStateAPI; readonly chrome: ChromeAPI;
  readonly assets: AssetAPI; readonly perf: PerfAPI;
  getStage(): Promise<StageAPI | null>;    // null: static tier, Proof mode or no WebGL2
}
export interface SectionModule { readonly id: SectionId; mount(el: HTMLElement, ctx: AppContext): void | Promise<void>; dispose?(): void }
export interface RenderCtx {
  readonly lang: Lang; readonly page: PageKind; readonly caseId?: CaseId; readonly content: Content;
  t(x: Readonly<Record<Lang, string>>): string;
  esc(s: string): string;
  url(rootRelative: string): string;       // depth-correct relative URL
  img(file: string, opts: { alt: string; sizes: string; className?: string; eager?: boolean }): string;  // <picture> HTML with data-file
  icon(name: IconName): string;
}
export type SectionRender = (rc: RenderCtx) => string;
