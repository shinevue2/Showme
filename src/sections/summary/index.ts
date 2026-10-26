/**
 * Summary section module (DESIGN §6.2, band summary-road §2.2). Owner: WP-05. 2D only (the GPU rests here).
 * - Guides: each result's baseline guide runs to the 版心 fold, where an Illustrator "intersect" mark sits; an
 *   Illustrator-style X/Y readout (artboard px of the number's baseline origin) beside each result. Revealed by the
 *   spread's view-timeline (CSS), or on entry where scroll-driven animations are unsupported.
 * - Overlap hours: the local time in each overlap zone, once a minute (core clock, never rAF).
 * - Band summary-road: the 消点 match cut — Hokusai's courses, scaled about a vanishing point placed exactly on the
 *   film poster's vanishing point (film-manifest matchVp / matchVpPortrait), in document space, so the alignment
 *   holds at every scroll position; faded out at p 0.8–1.
 */
import type { AppContext, SectionModule } from '../../core/types';
import { onMinute } from '../../core/clock';
import { IMG_H, IMG_W, VP, GUIDES } from './guides';
import { strings } from './strings';

const SVGNS = 'http://www.w3.org/2000/svg';
const svgEl = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>): SVGElementTagNameMap[K] => {
  const e = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
};
const r1 = (v: number) => Math.round(v * 10) / 10;

/* ------------------------------------------------------------------ overlap hours */
function zoneTime(zone: string, d: Date): string {
  try { return new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: '2-digit', minute: '2-digit', hour12: false }).format(d); } catch { return ''; }
}
function overlap(el: HTMLElement, ctx: AppContext): void {
  const st = strings[ctx.lang];
  const paint = () => {
    const now = new Date();
    const { hh, mm } = ctx.i18n.jstNow();
    const cur = Number(hh) * 60 + Number(mm);
    el.querySelectorAll<HTMLElement>('.summary__overlap li[data-zone]').forEach((li) => {
      const out = li.querySelector<HTMLElement>('.overlap__now');
      if (!out) return;
      const zone = li.dataset.zone!;
      const t = zoneTime(zone, now);
      out.textContent = t ? st.localTime.replace('{city}', st.cities[zone] ?? zone).replace('{time}', t) : '';
      const [sh, sm] = (li.dataset.start ?? '0:0').split(':').map(Number);
      const [eh, em] = (li.dataset.end ?? '0:0').split(':').map(Number);
      const on = cur >= sh! * 60 + sm! && cur < eh! * 60 + em!;
      if (on) out.dataset.on = st.overlapping; else delete out.dataset.on;
    });
  };
  paint();
  onMinute(paint);
}

/* ------------------------------------------------------------------ fold marks + readouts */
function rays(el: HTMLElement, ctx: AppContext): void {
  const spread = el.querySelector<HTMLElement>('.summary__spread');
  const img = el.querySelector<HTMLImageElement>('.summary__figure img');
  const left = el.querySelector<HTMLElement>('.summary__page--left');
  if (!spread || !img || !left) return;
  const st = strings[ctx.lang];
  const svg = svgEl('svg', { class: 'summary__rays', 'aria-hidden': 'true', focusable: 'false' });
  spread.append(svg);
  const results = [...el.querySelectorAll<HTMLElement>('.result')];
  const readouts = results.map((li) => {
    const s = document.createElement('span');
    s.className = 'result__xy';
    s.setAttribute('aria-hidden', 'true');
    li.append(s);
    return s;
  });

  const draw = () => {
    while (svg.firstChild) svg.firstChild.remove();
    if (innerWidth < 768) return;
    const sr = spread.getBoundingClientRect();
    const ar = el.getBoundingClientRect();
    const ir = img.getBoundingClientRect();
    const lr = left.getBoundingClientRect();
    if (ir.width < 2) return;
    const gap = parseFloat(getComputedStyle(spread).columnGap) || 64;
    const foldX = lr.right - sr.left + gap / 2;
    svg.setAttribute('viewBox', `0 0 ${r1(sr.width)} ${r1(sr.height)}`);
    const vh = innerHeight;
    results.forEach((li, i) => {
      const num = li.querySelector<HTMLElement>('.result__num');
      if (!num) return;
      const nr = num.getBoundingClientRect();
      const by = nr.bottom - sr.top;
      const style = `--a:${Math.round(by + vh * 0.05)}px;--b:${Math.round(by + vh * 0.42)}px;--o:${i}`;
      const g = svgEl('g', { class: 'sr-mark', style });
      g.append(svgEl('rect', { x: r1(foldX - 3), y: r1(by - 3), width: 6, height: 6 }));
      const label = svgEl('text', { x: r1(foldX + 7), y: r1(by + 14) });
      label.textContent = st.intersect;
      g.append(label);
      svg.append(g);
      const ro = readouts[i]!;
      ro.textContent = `X ${Math.round(nr.left - ar.left)}  Y ${Math.round(nr.bottom - ar.top)}`;
      ro.setAttribute('style', style);
    });
  };
  draw();
  let t: ReturnType<typeof setTimeout> | null = null;
  const later = () => { if (t) clearTimeout(t); t = setTimeout(draw, 120); };
  new ResizeObserver(later).observe(spread);
  img.addEventListener('load', later);
  document.fonts?.ready.then(later).catch(() => undefined);

  const timeline = typeof CSS !== 'undefined' && CSS.supports?.('animation-timeline: view()');
  if (!timeline) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { spread.classList.add('is-drawn'); io.disconnect(); }
    }, { threshold: 0.12 });
    io.observe(spread);
  }
}

/* ------------------------------------------------------------------ band summary-road: the match cut */
function matchCut(el: HTMLElement, ctx: AppContext): void {
  const bandEl = el.querySelector<HTMLElement>('[data-band="summary-road"]');
  const road = document.getElementById('road');
  if (!bandEl || !road) return;
  const box = document.createElement('div');
  box.className = 'match';
  box.setAttribute('aria-hidden', 'true');
  bandEl.append(box);
  const st = strings[ctx.lang];
  let vpView: { x: number; y: number } | null = null;   // VP in document coords

  const build = () => {
    box.replaceChildren();
    vpView = null;
    const stage = road.querySelector<HTMLElement>('.film__stage');
    const body = road.querySelector<HTMLElement>('.film__body') ?? stage?.parentElement ?? null;
    if (!stage || !body || road.dataset.filmTier === 'static' || getComputedStyle(stage).position !== 'sticky') return;
    const portrait = matchMedia('(max-aspect-ratio: 4/5)').matches;
    const film = ctx.assets.film;
    const [mx, my] = portrait ? film.matchVpPortrait : film.matchVp;
    const fw = portrait ? 720 : 1280, fh = portrait ? 1280 : 720;
    const sr = stage.getBoundingClientRect();
    const stageDocTop = body.getBoundingClientRect().top + scrollY;   // the stage's natural (un-stuck) top
    const s = Math.max(sr.width / fw, stage.offsetHeight / fh);
    const vpx = sr.left + (sr.width - fw * s) / 2 + mx * fw * s;
    const vpy = stageDocTop + (stage.offsetHeight - fh * s) / 2 + my * fh * s;
    const br = bandEl.getBoundingClientRect();
    const bandDocTop = br.top + scrollY;
    const w = br.width;
    const h = Math.max(br.height, vpy - bandDocTop + innerHeight * 0.6);
    const x = vpx - br.left, y = vpy - bandDocTop;
    vpView = { x: vpx, y: vpy };
    box.style.height = `${Math.round(h)}px`;
    const svg = svgEl('svg', { viewBox: `0 0 ${r1(w)} ${r1(h)}`, preserveAspectRatio: 'none' });
    const fan = svgEl('g', { class: 'mc-fan', style: `transform-origin:${r1(x)}px ${r1(y)}px` });
    const far = Math.hypot(w, h) * 1.2;
    const ray = (dx: number, dy: number, i: number) => {
      fan.append(svgEl('path', { class: 'mc-ray', d: `M${r1(x + dx * far)} ${r1(y + dy * far)}L${r1(x)} ${r1(y)}`, pathLength: 1, style: `--o:${i}` }));
    };
    let i = 0;
    for (const g of GUIDES) {
      if (g.to !== VP) continue;
      const dx = (g.from[0] - VP[0]) * IMG_W, dy = (g.from[1] - VP[1]) * IMG_H;
      const l = Math.hypot(dx, dy) || 1;
      ray(dx / l, dy / l, i++);
    }
    fan.append(svgEl('path', { class: 'mc-ray mc-horizon', d: `M0 ${r1(y)}L${r1(w)} ${r1(y)}` }));
    const mark = svgEl('g', { class: 'mc-vp' });
    mark.append(svgEl('rect', { x: r1(x - 4), y: r1(y - 4), width: 8, height: 8 }));
    const t = svgEl('text', { x: r1(x + 10), y: r1(y - 10) });
    t.textContent = st.vanishing;
    mark.append(t);
    svg.append(fan, mark);
    box.append(svg);
  };
  build();
  let tm: ReturnType<typeof setTimeout> | null = null;
  const later = () => { if (tm) clearTimeout(tm); tm = setTimeout(build, 150); };
  new ResizeObserver(later).observe(document.getElementById('main') ?? el);
  new MutationObserver(later).observe(road, { attributes: true, attributeFilter: ['data-film-tier', 'class'] });
  addEventListener('resize', later, { passive: true });

  const timeline = typeof CSS !== 'undefined' && CSS.supports?.('animation-timeline: view()');
  let guided = false;
  ctx.scroll.band('summary-road').on((p) => {
    if (!timeline) {
      const o = p < 0.14 ? p / 0.14 : p > 0.8 ? Math.max(0, (1 - p) / 0.2) : 1;
      box.style.setProperty('--mc-o', o.toFixed(3));
      box.style.setProperty('--mc-s', (1.35 - 0.35 * Math.min(1, p / 0.8)).toFixed(4));
      box.style.setProperty('--mc-d', (1 - Math.min(1, Math.max(0, (p - 0.05) / 0.67))).toFixed(4));
    }
    if (!guided && p > 0.55 && p < 0.8 && vpView && ctx.motion.enabled) {
      guided = true;
      ctx.chrome.smartGuide(vpView.x, vpView.y - scrollY, st.vanishing);
    }
    if (p <= 0.05 || p >= 0.99) guided = false;
  });
}

export default {
  id: 'summary',
  mount(el, ctx) {
    overlap(el, ctx);
    rays(el, ctx);
    matchCut(el, ctx);
  },
} satisfies SectionModule;
