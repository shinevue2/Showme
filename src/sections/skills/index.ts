/**
 * Skills — section module (DESIGN §6.5, §2.2 works-skills incoming, skills-principles outgoing). Owner: WP-08.
 *
 *  - measures the shoji frame and the view placeholder in one read per scroll update and writes them to
 *    skillsState (the view's window projection), then asks the stage to re-measure (the stage is sticky);
 *  - assembly: the strips appear at the byōbu's lattice (works-skills p ≥ 0.4, centre and pitch from WP-07's
 *    `hanmoto:byobu`, kept document-anchored once the screen has gone) and fall into the shoji as the section
 *    rises; it completes when the stage sticks;
 *  - diagram: scroll-driven over the stuck run (0.70–0.90) or toggled (600 ms, 序破急), reverted as the
 *    skills-principles band begins; the DOM SVG fades in once the shadow has resolved and the 3D drops to 30 %;
 *  - skills-principles: the panel tilts back and lowers onto the garden's imprint (published by the garden view);
 *  - the placeholder reaches up / down during the two bands so the strips can be drawn outside the frame;
 *  - list ↔ 3D: rows (hover, focus, roving arrows) light their run and its graph neighbours; a run under the
 *    pointer (CPU picking in the view) lights its row; the readout says the tool's line (aria-live);
 *  - registers the view except on the static and software tiers (the SVG lattice is the picture there).
 */
import type { AppContext, SectionModule, StageAPI, View } from '../../core/types';
import { frame } from '../../core/frame';
import { johakyu } from '../../core/easing';
import { skillsState as S } from './state';

type KView = View & { pick(x: number, y: number): number; runs(): Record<string, { segments: number; inlays: number }>; readonly instanceCount: number };

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (x: number) => { const t = clamp01(x); return t * t * (3 - 2 * t); };
const isText = (el: Element | null) => !!el && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || (el as HTMLElement).isContentEditable);

function mount(el: HTMLElement, ctx: AppContext): void {
  const root = document.documentElement;
  const grid = el.querySelector<HTMLElement>('.skills__grid');
  const stageEl = el.querySelector<HTMLElement>('.skills__stage');
  const fig = el.querySelector<HTMLElement>('.skills__shoji');
  const frameEl = el.querySelector<HTMLElement>('.skills__frame');
  const slot = el.querySelector<HTMLElement>('[data-view-id="skills-kumiko"]');
  const readout = el.querySelector<HTMLElement>('#skills-readout');
  const toggle = el.querySelector<HTMLButtonElement>('.skills__toggle');
  const rows = Array.from(el.querySelectorAll<HTMLElement>('.skt'));
  if (!grid || !stageEl || !fig || !frameEl || !slot) return;
  const tools = ctx.content.tools;
  const mobileMq = matchMedia('(max-width: 767px)');
  const stickyMq = matchMedia('(min-width: 1024px)');
  let stage: (StageAPI & { measure?: () => void }) | null = null;
  let view: KView | null = null;

  /* ---------- geometry cache (document px; refreshed on resize) ---------- */
  const geo = { gridTop: 0, gridH: 0, stageH: 0, frameOff: 0, vh: innerHeight };
  const measure = () => {
    const g = grid.getBoundingClientRect();
    geo.gridTop = g.top + scrollY;
    geo.gridH = grid.offsetHeight;
    geo.stageH = stageEl.offsetHeight;
    geo.frameOff = frameEl.offsetTop + (fig.offsetTop || 0);
    geo.vh = innerHeight;
  };

  /* ---------- hand-offs ---------- */
  let pWS = 0, pSP = 0;
  const from = { docX: 0, docY: 0, pitch: 0, has: false };
  document.addEventListener('hanmoto:byobu', (e) => {
    const d = (e as CustomEvent<{ cx: number; cy: number; pitch: number }>).detail;
    // ignore a published centre far off screen (a stale viewTop on the publisher's side)
    if (!d || !(d.pitch > 0) || !(d.cy > -2 * innerHeight && d.cy < 3 * innerHeight)) return;
    const moved = !from.has || Math.abs(d.cx - from.docX) > 0.5 || Math.abs(d.cy + scrollY - from.docY) > 0.5 || Math.abs(d.pitch - from.pitch) > 0.05;
    from.docX = d.cx; from.docY = d.cy + scrollY; from.pitch = d.pitch; from.has = true;
    // the byōbu publishes on every frame of the band: ask for a frame only when the hand-off really moved
    if (moved && S.layout === 'd') { S.from = { cx: d.cx, cy: d.cy, pitch: d.pitch, live: true }; S.rev++; stage?.requestFrame(); }
  });

  /* ---------- diagram: scroll value, user toggle and its tween ---------- */
  let diagScroll = 0;
  let user: { target: number; t0: number; v0: number; at: number } | null = null;
  let tweenV = 0;
  let stopTween: (() => void) | null = null;
  const startTween = (target: number) => {
    const v0 = S.diagram;
    user = { target, t0: performance.now(), v0, at: diagScroll };
    if (!S.motion) { tweenV = target; update(); return; }
    stopTween?.();
    stopTween = frame.add(() => {
      if (!user) return false;
      const k = clamp01((performance.now() - user.t0) / 600);
      tweenV = user.v0 + (user.target - user.v0) * johakyu(k);
      update();
      return k < 1;
    });
  };

  /* ---------- the one update ---------- */
  let reach = '';
  function update(): void {
    S.motion = ctx.motion.enabled && !root.hasAttribute('data-proof');
    S.layout = mobileMq.matches ? 'm' : 'd';
    const fr = frameEl!.getBoundingClientRect();
    const live = slot!.dataset.live === '1';
    // reach first (the placeholder extends up during works-skills, down during skills-principles), then measure it
    const want = !S.motion || (!live && !view) ? '' : pSP > 0 && pSP < 1 ? 'down' : pWS > 0.3 && pWS < 1 && !mobileMq.matches && fr.top > 0 ? 'up' : '';
    if (want !== reach) { reach = want; if (want) slot!.dataset.reach = want; else delete slot!.dataset.reach; }
    const sr = slot!.getBoundingClientRect();
    S.frame = { x: fr.left, y: fr.top, w: fr.width, h: fr.height };
    S.slot = { x: sr.left, y: sr.top, w: sr.width, h: sr.height };
    const vh = geo.vh;
    const stuckTop = stickyMq.matches ? geo.frameOff : vh * 0.18;
    if (S.motion) {
      // the frame's rise from (band p = 0.4 position) to its stuck position drives the assembly
      const span = vh * 1.1;
      const rise = clamp01(1 - (fr.top - stuckTop) / span);
      // while the byōbu is still turning and fading (works-skills p < 0.6) the lattice stays where the screen was;
      // then the exploded lattice travels down onto the frame as one piece, and assembles in place
      const gate = pWS > 0 && pWS < 1 ? smooth((pWS - 0.6) / 0.4) : 1;
      S.group = smooth(rise / 0.6) * gate;
      S.assembly = clamp01((rise - 0.5) / 0.5) * gate;
      S.alpha = pWS >= 0.999 || (pWS <= 0 && fr.top < vh) ? 1 : smooth((pWS - 0.4) / 0.15);
    } else {
      S.group = 1;
      S.assembly = 1;
      S.alpha = 1;
    }
    // from-lattice: the byōbu (document-anchored), else gathered over the frame
    if (from.has && S.layout === 'd') S.from = { cx: from.docX, cy: from.docY - scrollY, pitch: from.pitch, live: true };
    else if (S.layout === 'd' && pWS > 0.3 && pWS < 1) {
      // nothing published yet (the byōbu view is warming): estimate from its placeholder
      const b = document.querySelector('[data-view-id="works-byobu"]')?.getBoundingClientRect();
      if (b && b.height > 0) S.from = { cx: b.left + b.width / 2, cy: b.top + b.height * 0.41, pitch: (b.width * 0.72) / 36, live: true };
    } else S.from.live = false;
    // diagram over the stuck run (desktop) — reverted as the band to the garden begins
    if (stickyMq.matches && S.motion) {
      const travel = Math.max(1, geo.gridH - geo.stageH);
      const s = clamp01((scrollY - geo.gridTop) / travel);
      diagScroll = smooth((s - 0.7) / 0.2);
    } else diagScroll = 0;
    const revert = 1 - smooth(pSP / 0.22);
    if (user && (Math.abs(diagScroll - user.at) > 0.3 || pSP > 0.05)) { user = null; stopTween?.(); }
    S.diagram = (user ? tweenV : diagScroll) * revert;
    const shown = S.diagram > 0.5;
    if (toggle && toggle.getAttribute('aria-pressed') !== String(shown)) toggle.setAttribute('aria-pressed', String(shown));
    // DOM SVG: fades in once the shadow has resolved (or crossfades straight away without a live view)
    const dom = live ? smooth((S.diagram - 0.78) / 0.22) : S.diagram;
    fig!.style.setProperty('--dg', dom.toFixed(3));
    S.dim = live ? dom : 0;
    // the press onto the sand belongs to the sticky desktop stage; in flow the panel simply scrolls on
    S.press = S.motion && stickyMq.matches ? pSP : 0;
    S.rev++;
    stage?.measure?.();
    stage?.requestFrame();
  }

  /* ---------- hover: rows ↔ runs ↔ readout ---------- */
  const rowByTi = new Map(rows.map((r) => [Number(r.dataset.ti), r] as const));
  const hint = readout?.dataset.hint ?? '';
  const setHover = (ti: number) => {
    if (ti === S.hover) return;
    S.hover = ti;
    const nb = new Set(ti >= 0 ? (tools[ti]?.neighbours ?? []) : []);
    rows.forEach((r) => {
      r.classList.toggle('is-on', Number(r.dataset.ti) === ti);
      r.classList.toggle('is-near', nb.has(r.dataset.tool ?? ''));
    });
    if (ti >= 0) el.dataset.hoverTool = tools[ti]?.id ?? ''; else delete el.dataset.hoverTool;
    if (readout) {
      const r = rowByTi.get(ti);
      if (!r) readout.textContent = hint;
      else {
        const name = r.querySelector('.skt__name')?.textContent ?? '';
        const scale = r.querySelector('.skt__scale')?.textContent ?? '';
        const d = readout.dataset;
        readout.innerHTML = '';
        // spaces between the parts (collapsed in the flex row) keep the aria-live sentence readable
        const part = (cls: string, text: string) => { const s = document.createElement('span'); s.className = cls; s.textContent = text; readout.append(s, ' '); };
        part('ro__name', name);
        part('ro__n', r.dataset.years ?? '');
        part('ro__u', r.dataset.yu ?? '');
        part('ro__k', d.last ?? '');
        part('ro__v', r.dataset.last ?? '');
        part('ro__n', r.dataset.projects ?? '');
        part('ro__u', r.dataset.pu ?? '');
        part('ro__s', scale);
      }
    }
    S.rev++;
    stage?.requestFrame();
  };
  rows.forEach((r) => {
    const ti = Number(r.dataset.ti);
    r.addEventListener('pointerenter', () => setHover(ti));
    r.addEventListener('pointerleave', () => { if (document.activeElement !== r) setHover(-1); });
    r.addEventListener('focus', () => setHover(ti));
    r.addEventListener('blur', () => setHover(-1));
    r.addEventListener('keydown', (e) => {
      if (isText(document.activeElement) || e.altKey || e.ctrlKey || e.metaKey) return;
      const i = rows.indexOf(r);
      const to = e.key === 'ArrowDown' ? i + 1 : e.key === 'ArrowUp' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? rows.length - 1 : -2;
      if (to === -2) return;
      e.preventDefault();
      const next = rows[Math.max(0, Math.min(rows.length - 1, to))]!;
      rows.forEach((x) => (x.tabIndex = x === next ? 0 : -1));
      next.focus();
    });
  });
  // pointer over the shoji: parallax for the eye, picking for the runs
  frameEl.addEventListener('pointermove', (e) => {
    S.pointer = { x: e.clientX, y: e.clientY };
    if (view && slot.dataset.live === '1' && e.pointerType !== 'touch') {
      const ti = view.pick(e.clientX, e.clientY);
      setHover(ti);
      frameEl.classList.toggle('cur-direct', ti >= 0);
    }
    stage?.requestFrame();
  }, { passive: true });
  frameEl.addEventListener('pointerleave', () => { S.pointer = null; setHover(-1); frameEl.classList.remove('cur-direct'); stage?.requestFrame(); });

  /* ---------- the architecture toggle ---------- */
  toggle?.addEventListener('click', () => startTween(S.diagram > 0.5 ? 0 : 1));

  /* ---------- live / static picture ---------- */
  const syncLive = () => { fig.classList.toggle('is-live', slot.dataset.live === '1'); update(); };
  new MutationObserver(syncLive).observe(slot, { attributes: true, attributeFilter: ['data-live'] });

  /* ---------- scroll, bands, resize ---------- */
  ctx.scroll.track(el, { start: 'top bottom', end: 'bottom top', onUpdate: () => update() });
  ctx.scroll.band('works-skills').on((p) => { pWS = p; update(); });
  ctx.scroll.band('skills-principles').on((p) => { pSP = p; update(); });
  const ro = new ResizeObserver(() => { measure(); update(); });
  ro.observe(grid);
  ro.observe(el);
  addEventListener('resize', () => { measure(); update(); }, { passive: true });
  mobileMq.addEventListener('change', () => { measure(); update(); });
  ctx.motion.on(() => update());
  if (ctx.proof) return;
  measure();
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
        view = m.default(slot, ctx) as KView;
        stage!.register(view);
        if (import.meta.env.DEV) (window as unknown as { __kumiko?: KView }).__kumiko = view;
        update();
      } else if (!want && view) { stage!.unregister(view); view = null; fig.classList.remove('is-live'); update(); }
    };
    void sync();
    ctx.tier.on(() => void sync());
  });
  // acceptance hooks (debug only): window.__hanmoto is WP-00's; ours hangs off the section element
  (el as HTMLElement & { __kumiko?: () => KView | null }).__kumiko = () => view;
}

export default {
  id: 'skills',
  mount(el: HTMLElement, ctx: AppContext) { mount(el, ctx); },
} satisfies SectionModule;
