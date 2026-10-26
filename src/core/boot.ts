/**
 * Boot sequence (DESIGN §8.8 steps 3–5). Owner: WP-00. Loaded by src/main.ts after first paint.
 *   3. build AppContext → mount chrome → mount cover + summary → dynamic-import the motion chunk (gsap +
 *      ScrollTrigger + lenis) → registerSnap(document); other sections mount within two viewports.
 *   4. after LCP (+ load + idle, timeout 1500 ms): detect tier; unless static, import three + stage →
 *      resolve ctx.getStage(); sections register their views.
 *   5. ScrollTrigger.refresh() after document.fonts.ready.
 */
import type { AppContext, SectionId, StageAPI } from './types';
import { SECTION_ORDER } from './types';
import { createContext, type ContentBundle } from './context';
import type { Lang } from './types';
import { frame } from './frame';
import { startClock } from './clock';
import { installDebug } from './debug';
import { whenLcp } from './perf';
import { detectTier } from './tier';
import { probeGL } from '../gl/stage/tier-detect';
import { SECTIONS, EAGER_SECTIONS } from '../sections/registry';

function afterLcp(): Promise<void> {
  const loaded = document.readyState === 'complete' ? Promise.resolve() : new Promise<void>((r) => addEventListener('load', () => r(), { once: true }));
  const idle = () => new Promise<void>((r) => {
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    if (ric) ric(() => r(), { timeout: 1500 }); else setTimeout(r, 200);
  });
  const capped = new Promise<void>((r) => setTimeout(r, 6000));
  return Promise.race([Promise.all([whenLcp(4000), loaded]).then(idle), capped]);
}

function mountSections(ctx: AppContext): void {
  const mounted = new Set<SectionId>();
  const mount = async (id: SectionId) => {
    if (mounted.has(id)) return;
    mounted.add(id);
    const el = document.getElementById(id);
    if (!el) return;
    try {
      const mod = (await SECTIONS[id]()).default;
      await mod.mount(el, ctx);
      el.dataset.mounted = '';
    } catch (e) {
      console.error(`[boot] section ${id} failed to mount`, e);
    }
  };
  EAGER_SECTIONS.forEach((id) => void mount(id));
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      void mount((e.target as HTMLElement).id as SectionId);
    }
  }, { rootMargin: '200% 0px' });
  for (const id of SECTION_ORDER) {
    if (EAGER_SECTIONS.includes(id)) continue;
    const el = document.getElementById(id);
    if (el) io.observe(el);
  }
}

/**
 * Case pages (§6.4): the works module also enhances the static case article (`<article data-section="works"
 * data-case-page="{caseId}">`, rendered by `renderCase`). Its `mount(el, ctx)` sees `ctx.page === 'case'`;
 * `ctx.getStage()` resolves null there (no WebGL on case pages).
 */
function mountCasePage(ctx: AppContext): void {
  const el = document.querySelector<HTMLElement>('[data-case-page]');
  if (!el) return;
  SECTIONS.works()
    .then(async (m) => { await m.default.mount(el, ctx); el.dataset.mounted = ''; })
    .catch((e) => console.error('[boot] works module failed to mount on the case page', e));
}

/** Posters (view fallbacks) load only when their placeholder comes within one viewport. */
function watchPosters(): void {
  const abs = (rel: string | undefined) => (rel ? `url("${new URL(rel, document.baseURI).href}")` : 'none');
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const el = e.target as HTMLElement;
      el.style.setProperty('--poster-day', abs(el.dataset.posterDay));
      el.style.setProperty('--poster-night', abs(el.dataset.posterNight));
      el.style.setProperty('--poster-day-m', abs(el.dataset.posterDayM));
      el.style.setProperty('--poster-night-m', abs(el.dataset.posterNightM));
      el.dataset.posterOn = '';
      io.unobserve(el);
    }
  }, { rootMargin: '100% 0px' });
  document.querySelectorAll('.view').forEach((v) => io.observe(v));
}

/**
 * Content for the page language. In the build each module carries the full Content shape with the other
 * two languages' strings emptied (a third of the bytes; see build/ssg-plugin.ts `contentModule`); in dev it
 * is the full content. Runtime code must read text through ctx.content, never import src/content directly.
 */
const CONTENT: Record<Lang, () => Promise<{ default: ContentBundle }>> = {
  ja: () => import('virtual:hanmoto/content-ja'),
  en: () => import('virtual:hanmoto/content-en'),
  zh: () => import('virtual:hanmoto/content-zh'),
};

export async function boot(): Promise<void> {
  const lang = (document.documentElement.dataset.lang as Lang) || 'ja';
  const bundle = (await (CONTENT[lang] ?? CONTENT.ja)()).default;
  const internals = createContext(bundle);
  const { ctx } = internals;
  const stageRef: { current: StageAPI | null } = { current: null };
  const dbg = installDebug(ctx, stageRef, internals.stagePromise);
  frame.listen();
  startClock();
  ctx.perf.mark('boot');

  // chrome (WP-04): its mount() returns the ChromeAPI implementation behind ctx.chrome
  import('../chrome/index')
    .then(async (m) => internals.chrome.attach(await m.default.mount(ctx)))
    .catch((e) => console.error('[boot] chrome failed', e));

  if (ctx.page === 'main') mountSections(ctx);
  else if (ctx.page === 'case') mountCasePage(ctx);
  ctx.motion.registerSnap(document);
  watchPosters();

  // the motion chunk: gsap + ScrollTrigger (+ Lenis when motion is enabled)
  import('./motion-chunk')
    .then((m) => {
      m.initMotionRuntime(internals.motion, internals.scroll);
      ctx.scroll.refresh();
    })
    .catch((e) => console.error('[boot] motion chunk failed; native scroll + fallback tracker in use', e));

  document.fonts?.ready.then(() => ctx.scroll.refresh()).catch(() => undefined);

  // stage after LCP
  await afterLcp();
  const probe = probeGL();
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  const tier = detectTier({ proof: ctx.proof, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches, saveData: !!conn?.saveData }, probe);
  internals.setTier(tier, probe);
  const canvas = document.getElementById('stage') as HTMLCanvasElement | null;
  if (tier.name === 'static' || ctx.page !== 'main' || !canvas) {
    internals.resolveStage(null);
    return;
  }
  try {
    const { createStage } = await import('../gl/stage/index');
    const stage = createStage(canvas, ctx);
    stageRef.current = stage;
    internals.resolveStage(stage);
    const posterId = document.documentElement.dataset.poster;
    if (posterId) {
      const el = document.querySelector<HTMLElement>(`[data-view-id="${CSS.escape(posterId)}"]`);
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior });
        dbg.poster = { id: posterId, ready: stage.whenDrawn(posterId) };
      }
    }
  } catch (e) {
    console.error('[boot] stage failed; posters stay', e);
    internals.resolveStage(null);
  }
}
