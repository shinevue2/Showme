/**
 * Works — section module (DESIGN §6.4, §2.2 works-skills, §4.5 keys). Owner: WP-07.
 *
 * Main page:
 *  - picks the layout mode the CSS already shows (dolly / list / mobile) and keeps it in `worksState`;
 *  - dolly: the run position s (stuck travel / 120 vh) drives the focused case in the DOM column (220 ms
 *    crossfade + the plate band snapping into register), `aria-current` on the panel label, the hold anchors
 *    (#works-{id} move onto them) and the view; the works-skills band drives the turn;
 *  - ← next panel / → previous inside Works (reading order is right → left), deep links to a panel's hold;
 *  - registers the `works-byobu` view; while the sticky stage moves it asks the stage to re-measure the
 *    placeholder (the stage caches document positions, which a sticky element does not keep).
 * Case pages (ctx.page === 'case'): the sangaku diagrams draw in compass-and-ruler order when they come into
 * view (motion on), and ← / → go to the next / previous panel's page.
 */
import type { AppContext, SectionModule, StageAPI, View, ViewFactory } from '../../core/types';
import { local } from '../../core/storage';
import { PANELS, focusIndex, holdS } from './map';
import { worksState, type WorksMode } from './state';

const isTextField = (el: Element | null): boolean =>
  !!el && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement || (el as HTMLElement).isContentEditable);

const keysEnabled = (): boolean => local.get('hanmoto.shortcuts') !== 'off';

function mountCase(el: HTMLElement, ctx: AppContext): void {
  const figs = Array.from(el.querySelectorAll<HTMLElement>('[data-draw]'));
  const arm = () => {
    if (!ctx.motion.enabled) { figs.forEach((f) => { f.classList.remove('is-armed'); f.classList.add('is-drawn'); }); return; }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        io.unobserve(e.target);
        const f = e.target as HTMLElement;
        requestAnimationFrame(() => f.classList.add('is-drawn'));
      }
    }, { threshold: 0.3 });
    figs.forEach((f) => {
      const r = f.getBoundingClientRect();
      if (r.top < innerHeight * 0.9 && r.bottom > 0) { f.classList.add('is-drawn'); return; }   // already on screen: no flash
      f.classList.add('is-armed');
      io.observe(f);
    });
  };
  arm();
  ctx.motion.on((on) => { if (!on) figs.forEach((f) => { f.classList.remove('is-armed'); f.classList.add('is-drawn'); }); });

  const next = el.querySelector<HTMLAnchorElement>('a[rel="next"]');
  const prev = el.querySelector<HTMLAnchorElement>('a[rel="prev"]');
  document.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.isComposing || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
    if (!keysEnabled() || isTextField(document.activeElement)) return;
    const ae = document.activeElement;
    if (ae && ae !== document.body && ae.id !== 'main' && !el.contains(ae)) return;
    const a = e.key === 'ArrowLeft' ? next : e.key === 'ArrowRight' ? prev : null;
    if (!a) return;
    e.preventDefault();
    a.click();
  });
}

function mountMain(el: HTMLElement, ctx: AppContext): void {
  const root = document.documentElement;
  const run = el.querySelector<HTMLElement>('.works__run');
  const stageEl = el.querySelector<HTMLElement>('.works__stage');
  const frameEl = el.querySelector<HTMLElement>('.works__frame');
  const slot = el.querySelector<HTMLElement>('[data-view-id="works-byobu"]');
  const labelBox = el.querySelector<HTMLElement>('.byobu__labels');
  const labels = Array.from(el.querySelectorAll<HTMLElement>('.byobu__label')).sort((a, b) => Number(a.dataset.panel) - Number(b.dataset.panel));
  const items = Array.from(el.querySelectorAll<HTMLElement>('.works__case')).sort((a, b) => Number(a.dataset.panel) - Number(b.dataset.panel));
  const anchors = new Map(Array.from(el.querySelectorAll<HTMLElement>('.works__anchor')).map((a) => [a.dataset.anchor!, a] as const));
  if (!stageEl || !items.length) return;
  if (import.meta.env.DEV) (window as unknown as { __works?: typeof worksState }).__works = worksState;
  worksState.labels = labels;
  worksState.labelBox = labelBox;
  worksState.motion = ctx.motion.enabled;

  const dollyMq = matchMedia('(min-width: 1024px) and (prefers-reduced-motion: no-preference)');
  const mobileMq = matchMedia('(max-width: 767px)');
  let stage: (StageAPI & { measure?: () => void }) | null = null;

  /* ---------- geometry cache (no layout reads per frame) ---------- */
  const geo = { top: 0, height: 0, stageH: 0, runH: 1, frameOff: 0 };
  const measure = () => {
    const r = el.getBoundingClientRect();
    geo.top = r.top + scrollY;
    geo.height = el.offsetHeight;
    geo.stageH = stageEl.offsetHeight;
    geo.runH = Math.max(1, run?.offsetHeight || innerHeight * 1.2);
    geo.frameOff = frameEl ? frameEl.offsetTop : 0;
  };
  const ro = new ResizeObserver(() => { measure(); onScroll(); });
  ro.observe(el);
  ro.observe(stageEl);

  /* ---------- mode ---------- */
  const computeMode = (): WorksMode => {
    if (mobileMq.matches) return 'mobile';
    if (root.hasAttribute('data-proof') || root.dataset.motion === 'off' || !ctx.motion.enabled) return 'list';
    return dollyMq.matches ? 'dolly' : 'list';
  };
  const setIds = (mode: WorksMode) => {
    for (const li of items) {
      const id = `works-${li.dataset.case}`;
      const a = anchors.get(li.dataset.case!);
      if (mode === 'dolly' && a) { li.removeAttribute('id'); a.id = id; }
      else { a?.removeAttribute('id'); li.id = id; }
    }
  };
  let focus = -1;
  const setFocus = (k: number) => {
    if (k === focus) return;
    const prevFocus = focus;
    focus = k;
    worksState.focus = k;
    items.forEach((li, i) => {
      const on = i === k;
      li.classList.toggle('is-focus', on);
      if (on && prevFocus >= 0) li.classList.toggle('is-resnap');      // replay the registration snap
      li.toggleAttribute('inert', worksState.mode === 'dolly' && !on);
    });
    labels.forEach((a, i) => { if (i === k && worksState.mode === 'dolly') a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
  };
  let syncView: (() => void) | null = null;     // set once the stage is ready (below)
  const applyMode = () => {
    const mode = computeMode();
    worksState.motion = ctx.motion.enabled;
    if (mode === worksState.mode && el.dataset.mode === mode) return;
    worksState.mode = mode;
    el.dataset.mode = mode;
    setIds(mode);
    if (mode !== 'dolly') {
      items.forEach((li) => { li.classList.remove('is-focus'); li.removeAttribute('inert'); });
      labels.forEach((a) => a.removeAttribute('aria-current'));
      focus = -1;
    }
    measure();
    onScroll();
    syncView?.();
    stage?.requestFrame();
  };

  /* ---------- scroll ---------- */
  let q = 0;
  function onScroll(): void {
    if (worksState.mode !== 'dolly') { worksState.s = 0; stage?.requestFrame(); return; }
    const travel = Math.max(1, geo.height - geo.stageH);
    worksState.s = Math.max(0, Math.min(1, (q * travel) / geo.runH));
    setFocus(focusIndex(worksState.s));
    stage?.measure?.();          // sticky placeholder: refresh the stage's cached rect before it draws
    stage?.requestFrame();
  }
  ctx.scroll.track(el, {
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (p) => { q = p; onScroll(); },
  });
  const updateViewTop = () => {
    const natural = geo.top - scrollY;
    const stuckMax = geo.top + geo.height - geo.stageH - scrollY;
    const top = worksState.mode === 'dolly' ? Math.min(Math.max(natural, 0), stuckMax) : natural;
    worksState.viewTop = top + geo.frameOff;
  };
  ctx.scroll.band('works-skills').on((p) => {
    worksState.band = p;
    updateViewTop();
    stage?.measure?.();
    stage?.requestFrame();
  });

  /* ---------- keyboard: ← next panel, → previous (DESIGN §4.5) ---------- */
  const goTo = (k: number, moveFocus: boolean) => {
    const target = Math.max(0, Math.min(PANELS - 1, k));
    if (worksState.mode === 'dolly') {
      ctx.scroll.scrollTo(geo.top + holdS(target) * geo.runH);
    } else if (worksState.mode !== 'mobile') {
      items[target]?.scrollIntoView({ block: 'nearest' });
    }
    if (moveFocus) labels[target]?.focus({ preventScroll: worksState.mode === 'dolly' });
  };
  document.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.isComposing || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    if (!keysEnabled() || isTextField(document.activeElement)) return;
    // never take the arrows from another widget (Layers rows, ink chips, tabs): only on the page itself or inside Works
    const ae = document.activeElement;
    const onPage = !ae || ae === document.body || ae.id === 'main';
    const inWorks = el.contains(ae) || (onPage && ctx.scroll.active === 'works');
    if (!inWorks || worksState.mode === 'mobile') return;
    const onLabel = labels.indexOf(document.activeElement as HTMLElement);
    const cur = onLabel >= 0 ? onLabel : Math.max(0, focus);
    e.preventDefault();
    goTo(cur + (e.key === 'ArrowLeft' ? 1 : -1), onLabel >= 0 || worksState.mode !== 'dolly');
  });
  labels.forEach((a, i) => a.addEventListener('focus', () => {
    if (worksState.mode === 'dolly' && i !== focus) ctx.scroll.scrollTo(geo.top + holdS(i) * geo.runH);
  }));

  /* ---------- deep links: #works-{id} → that panel's hold ---------- */
  const fromHash = (immediate: boolean) => {
    const m = /^#works-([a-z]+)$/.exec(location.hash);
    if (!m || worksState.mode !== 'dolly') return;
    const li = items.find((x) => x.dataset.case === m[1]);
    if (!li) return;
    const k = Number(li.dataset.panel) - 1;
    measure();
    ctx.scroll.scrollTo(geo.top + holdS(k) * geo.runH, { immediate });
  };
  addEventListener('hashchange', () => fromHash(false));

  /* ---------- live mode switches ---------- */
  dollyMq.addEventListener('change', applyMode);
  mobileMq.addEventListener('change', applyMode);
  ctx.motion.on(() => { applyMode(); stage?.requestFrame(); });
  new MutationObserver(applyMode).observe(root, { attributes: true, attributeFilter: ['data-proof', 'data-motion'] });

  measure();
  applyMode();
  fromHash(true);

  /* ---------- the view ---------- */
  if (!slot) return;
  // software rasterisers get the poster (DESIGN §6.4 tiers) and phones the CSS screen (no WebGL below 768 px,
  // so the view chunk is not even fetched there); the governor or a resize may move us across either line later
  void ctx.getStage().then((s) => {
    if (!s) return;
    stage = s as StageAPI & { measure?: () => void };
    let factory: ViewFactory | null = null;
    let loading = false;
    let view: View | null = null;
    syncView = () => {
      const want = worksState.mode !== 'mobile' && ctx.tier.current.name !== 'software' && ctx.tier.current.name !== 'static';
      if (want && !view) {
        if (!factory) {
          if (!loading) { loading = true; void import('./view').then((m) => { factory = m.default; syncView?.(); }); }
          return;
        }
        view = factory(slot, ctx);
        stage!.register(view);
        onScroll();
      } else if (!want && view) { stage!.unregister(view); view = null; }
    };
    syncView();
    ctx.tier.on(() => syncView?.());
  });
}

export default {
  id: 'works',
  mount(el: HTMLElement, ctx: AppContext) {
    if (ctx.page === 'case' || el.hasAttribute('data-case-page')) { mountCase(el, ctx); return; }
    mountMain(el, ctx);
  },
} satisfies SectionModule;
