/**
 * Colophon — section module (DESIGN §6.11). Owner: WP-10.
 *  - live figures: page weight (Resource Timing), LCP / INP / CLS (ctx.perf), build = version + this chunk's hash;
 *  - today's print at up to 620 px via WP-04's compositor (import only), re-drawn on ink / hide / marbling / seal,
 *    and Save (full-size PNG);
 *  - registers the emaki handscroll (it rolls once as the colophon comes up; posters cover static/software).
 */
import type { AppContext, SectionModule } from '../../core/types';
import { renderPrint, downloadPrint } from '../../chrome/print-compositor';
import { strings } from './strings';

function fmtBytes(n: number, lang: string): string {
  const mb = n / (1024 * 1024);
  const v = mb >= 1 ? `${mb.toFixed(2)} MB` : `${Math.round(n / 1024)} KB`;
  return lang === 'en' ? v : v.replace(' ', '\u2009');
}

function live(el: HTMLElement, ctx: AppContext): void {
  const out = (k: string) => el.querySelector<HTMLOutputElement>(`output[data-live="${k}"]`);
  const s = strings[ctx.lang];
  const hash = (/[-.]([A-Za-z0-9_-]{8})\.js/.exec(import.meta.url)?.[1]) ?? 'dev';
  const build = out('build');
  if (build) build.textContent = `${build.textContent} · ${hash}`;
  const paint = () => {
    const w = out('weight'), v = out('vitals');
    const bytes = ctx.perf.bytes();
    if (w) w.textContent = bytes > 0 ? fmtBytes(bytes, ctx.lang) : s.measuring;
    const vt = ctx.perf.vitals();
    if (v) v.textContent = `LCP ${vt.lcp != null ? (vt.lcp / 1000).toFixed(2) + ' s' : '—'} · INP ${vt.inp != null ? Math.round(vt.inp) + ' ms' : '—'} · CLS ${vt.cls != null ? vt.cls.toFixed(3) : '—'}`;
  };
  let pending = 0;
  const later = () => { if (!pending) pending = window.setTimeout(() => { pending = 0; paint(); }, 400); };
  ctx.perf.on(later);
  new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) paint(); }).observe(el);
  paint();
}

function todaysPrint(el: HTMLElement, ctx: AppContext): void {
  const canvas = el.querySelector<HTMLCanvasElement>('.colophon__canvas');
  const save = el.querySelector<HTMLButtonElement>('.colophon__save');
  if (!canvas) return;
  let near = false, queued = 0;
  const draw = () => {
    queued = 0;
    if (!near) return;
    const w = Math.min(620, Math.round(canvas.parentElement?.clientWidth || 620));
    void renderPrint(canvas, w).catch(() => { /* the compositor logs */ });
  };
  const schedule = () => { if (!queued) queued = window.setTimeout(draw, 120); };
  new IntersectionObserver((es) => { const was = near; near = es.some((e) => e.isIntersecting); if (near && !was) schedule(); }, { rootMargin: '50% 0px' }).observe(canvas);
  (['ink', 'hide', 'marbling', 'seal'] as const).forEach((ev) => ctx.print.on(ev, schedule));
  ctx.theme.on(schedule);
  new ResizeObserver(schedule).observe(canvas.parentElement ?? canvas);
  save?.addEventListener('click', () => { void downloadPrint(`segawa-print-${ctx.print.seed}.png`); });
}

async function mount(el: HTMLElement, ctx: AppContext): Promise<void> {
  live(el, ctx);
  todaysPrint(el, ctx);
  const slot = el.querySelector<HTMLElement>('[data-view-id="colophon-emaki"]');
  const stage = slot ? await ctx.getStage() : null;
  if (!stage || !slot) return;
  if (stage.tier.name === 'software') return;    // the rolled-scroll poster
  stage.register((await import('./view')).default(slot, ctx));
}

export default { id: 'colophon', mount } satisfies SectionModule;
