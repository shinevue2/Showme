/**
 * Principles — section module (DESIGN §6.6, §2.2 skills-principles incoming, principles-achievements outgoing).
 * Owner: WP-08.
 *  - measures the garden placeholder with the scroll (the stage is sticky) and asks the stage to re-measure;
 *  - the kumiko imprint is in the sand from the start and is raked away over the first 25 vh of the section
 *    (instantly without motion); the principles-achievements band tilts the camera up 12° and darkens the sand;
 *  - places the five principles above their stones from the view's projected stone tops (desktop);
 *  - Re-rake, the touch rake toggle (touch scroll is never blocked until it is picked up), Show / Hide the data;
 *  - registers the view except on the static and software tiers (poster + data tables there).
 */
import type { AppContext, SectionModule, StageAPI, View } from '../../core/types';
import { gardenState as G } from './state';

type GView = View & { rerake(): void; stampLattice(p?: number): void; rakeLine(x0: number, z0: number, x1: number, z1: number): void };

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (x: number) => { const t = clamp01(x); return t * t * (3 - 2 * t); };

function mount(el: HTMLElement, ctx: AppContext): void {
  const root = document.documentElement;
  const stageEl = el.querySelector<HTMLElement>('.principles__stage');
  const slot = el.querySelector<HTMLElement>('[data-view-id="principles-garden"]');
  const list = el.querySelector<HTMLElement>('.principles__list');
  const items = Array.from(el.querySelectorAll<HTMLElement>('.principle'));
  const rerakeBtn = el.querySelector<HTMLButtonElement>('.principles__rerake');
  const rakeBtn = el.querySelector<HTMLButtonElement>('.principles__rake');
  const details = el.querySelector<HTMLDetailsElement>('.principles__data');
  if (!stageEl || !slot) return;
  const deskMq = matchMedia('(min-width: 1024px)');
  const mobileMq = matchMedia('(max-width: 767px)');
  let stage: (StageAPI & { measure?: () => void }) | null = null;
  let view: GView | null = null;
  let pBand = 0, pPress = 0;

  /* ---------- principles above their stones (desktop) ---------- */
  let lastCols = '';
  G.onStones = (pts) => {
    if (!deskMq.matches || !list) return;
    const lr = list.getBoundingClientRect();
    const key = pts.map((p) => Math.round(p.x - lr.left)).join(',');
    if (key === lastCols) return;
    lastCols = key;
    // each column takes its stone's x and at most ~90 % of the gap to its nearest neighbour (no overlaps)
    items.forEach((li, i) => {
      const p = pts[i];
      if (!p) return;
      const gaps = [pts[i - 1], pts[i + 1]].filter((q): q is { x: number; y: number } => !!q).map((q) => Math.abs(q.x - p.x));
      li.style.setProperty('--px', `${(p.x - lr.left).toFixed(1)}px`);
      li.style.setProperty('--pw', `${Math.round(Math.max(112, Math.min(184, 0.9 * Math.min(...gaps, 999))))}px`);
    });
  };

  function update(): void {
    G.motion = ctx.motion.enabled && !root.hasAttribute('data-proof');
    G.layout = mobileMq.matches ? 'm' : 'd';
    G.frameFrac = deskMq.matches ? 0.72 : 1;
    const sr = slot!.getBoundingClientRect();
    G.slot = { x: sr.left, y: sr.top, w: sr.width, h: sr.height };
    const er = el.getBoundingClientRect();
    const vh = innerHeight;
    // the rake clears the imprint over the first 25 vh after the section reaches the top (desktop) or after the
    // garden is fully in view (in flow)
    const ref = deskMq.matches ? er.top : sr.top - vh * 0.25;
    const k = clamp01((vh * 0.04 - ref) / (vh * 0.25));
    G.sweep = G.motion ? smooth(k) : k > 0 ? 1 : 0;
    G.stamp = G.sweep >= 1 ? 0 : 1;
    // a slow dolly while the stage is stuck
    const travel = Math.max(1, el.offsetHeight - (stageEl!.offsetHeight || vh));
    G.drift = deskMq.matches && G.motion ? clamp01(-er.top / travel) : 0;
    G.tilt = G.motion ? smooth(pBand / 0.7) : 0;
    G.press = pPress;
    stage?.measure?.();
    stage?.requestFrame();
  }

  /* ---------- buttons ---------- */
  rerakeBtn?.addEventListener('click', () => view?.rerake());
  rakeBtn?.addEventListener('click', () => {
    G.raking = !G.raking;
    rakeBtn.setAttribute('aria-pressed', String(G.raking));
    const label = rakeBtn.querySelector('span');
    if (label) label.textContent = (G.raking ? rakeBtn.dataset.on : rakeBtn.dataset.off) ?? '';
    if (G.raking) slot.dataset.raking = ''; else delete slot.dataset.raking;
  });
  if (details) {
    const sum = details.querySelector('summary');
    details.addEventListener('toggle', () => { if (sum) sum.textContent = (details.open ? details.dataset.hide : details.dataset.show) ?? ''; });
    if (ctx.proof) details.open = true;
  }

  /* ---------- scroll, bands, resize ---------- */
  ctx.scroll.track(el, { start: 'top bottom', end: 'bottom top', onUpdate: () => update() });
  ctx.scroll.band('principles-achievements').on((p) => { pBand = p; update(); });
  ctx.scroll.band('skills-principles').on((p) => { pPress = p; update(); });
  addEventListener('resize', () => { lastCols = ''; update(); }, { passive: true });
  mobileMq.addEventListener('change', () => { lastCols = ''; update(); });
  ctx.motion.on(() => update());
  if (ctx.proof) return;
  update();

  /* ---------- the view ---------- */
  void ctx.getStage().then((s) => {
    if (!s) return;
    stage = s as StageAPI & { measure?: () => void };
    const sync = async () => {
      const want = ctx.tier.current.name !== 'software' && ctx.tier.current.name !== 'static';
      if (want && !view) {
        const m = await import('./view');
        if (view) return;
        view = m.default(slot, ctx) as GView;
        stage!.register(view);
        update();
      } else if (!want && view) { stage!.unregister(view); view = null; }
    };
    void sync();
    ctx.tier.on(() => void sync());
  });
  (el as HTMLElement & { __garden?: () => GView | null }).__garden = () => view;
}

export default {
  id: 'principles',
  mount(el: HTMLElement, ctx: AppContext) { mount(el, ctx); },
} satisfies SectionModule;
