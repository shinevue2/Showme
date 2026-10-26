/**
 * Writing — section module (DESIGN §6.8, bands achievements-writing (incoming gold drop) and writing-testimonials).
 * Owner: WP-10.
 *  - builds the deterministic op list from content, appends a shared `?ops=` list (validated, clamped);
 *  - applies op k as the section scrolls in (s ≥ k/N over s ∈ [0, 0.5]; all at once without motion); the gold drop
 *    lands as the achievements → writing band passes its middle;
 *  - visitor: click = a drop of the chosen ink (radius by press time), drag = a stylus stroke (strength by speed),
 *    a keyboard drop at the centre, Take a print (sheet + PNG + ctx.print.setMarbling), Share link, Start over;
 *  - list hover / focus outlines the item's rings (or draws its comb / tine guide) in the tray;
 *  - the writing → testimonials band lowers a sheet and lifts it; if no print was taken, one is taken then.
 * Without a stage (static tier, Proof) the tray shows its poster; the noren falls back to default-print.webp.
 */
import type { AppContext, MarbleOp, PlateN, SectionModule } from '../../core/types';
import { buildOps, decodeOps, encodeOps, ID, renderCpu, type MOp } from './ops';
import type { MarbleView } from './view';
import { strings } from './strings';

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

/** CPU fallback for the print canvas when the view is not live (straight alpha, 384²). */
function cpuPattern(ops: readonly MOp[]): HTMLCanvasElement {
  const size = 384;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const img = new ImageData(renderCpu(ops, size), size, size);
  c.getContext('2d')!.putImageData(img, 0, 0);
  return c;
}

async function mount(el: HTMLElement, ctx: AppContext): Promise<void> {
  const s = strings[ctx.lang];
  const slot = el.querySelector<HTMLElement>('[data-view-id="writing-marble"]');
  const status = el.querySelector<HTMLElement>('.writing__status');
  const say = (t: string) => { if (status) status.textContent = t; };
  const base = buildOps(ctx.content);
  const N = base.length;
  let visitor: MOp[] = decodeOps(new URLSearchParams(location.search).get('ops'));
  const all = () => [...base, ...visitor];
  let ink: PlateN | 0 = 1;
  let taken = false;
  let lastPrint: Blob | null = null;

  const stage = slot ? await ctx.getStage() : null;
  if (!stage || !slot) {
    el.dataset.marble = 'off';
    // the noren still dyes with the content's own pattern
    ctx.scroll.band('writing-testimonials').on((p) => {
      if (p > 0 && !taken && !ctx.print.marbling.canvas) { taken = true; ctx.print.setMarbling(cpuPattern(all()), all() as MarbleOp[]); }
    });
    return;
  }
  const view: MarbleView = (await import('./view')).default(slot, ctx);
  stage.register(view);
  view.setOps(all(), ctx.motion.enabled ? 0 : N + visitor.length);
  const measure = () => (stage as unknown as { measure?: () => void }).measure?.();

  /* ---------- progressive application ---------- */
  let shown = ctx.motion.enabled ? 0 : N + visitor.length;
  const show = (n: number) => { if (n > shown) { shown = n; view.setApplied(n); } };
  const all0 = () => show(N + visitor.length);
  ctx.scroll.band('achievements-writing').on((p) => { if (p > 0.5) show(1); });
  ctx.scroll.section('writing').on((p) => {
    if (!ctx.motion.enabled || p >= 0.5) { all0(); } else if (p > 0) show(Math.max(1, 1 + Math.floor((p / 0.5) * (N - 1))));
    measure();
  });
  ctx.motion.on((on) => { if (!on) all0(); });

  /* ---------- inks ---------- */
  el.querySelectorAll<HTMLInputElement>('input[name="ink"]').forEach((r) => r.addEventListener('change', () => { if (r.checked) ink = Number(r.value) as PlateN | 0; }));

  const pushVisitor = (op: MOp) => {
    all0();
    visitor.push(op);
    if (visitor.length > 600) visitor = visitor.slice(-600);
    view.push(op);
  };

  /* ---------- pointer: click = drop, drag = stylus ---------- */
  let down: { t0: number; p: [number, number]; last: [number, number]; lt: number; dragged: boolean; id: number } | null = null;
  slot.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || !view.ready) return;
    const p = view.toPattern(e.clientX, e.clientY);
    if (!p) return;
    down = { t0: performance.now(), p, last: p, lt: performance.now(), dragged: false, id: e.pointerId };
    all0();
  });
  slot.addEventListener('pointermove', (e) => {
    if (!down || e.pointerId !== down.id) return;
    const p = view.toPattern(e.clientX, e.clientY);
    if (!p) return;
    const dx = p[0] - down.last[0], dy = p[1] - down.last[1];
    const len = Math.hypot(dx, dy);
    if (len < 0.035) return;
    if (!down.dragged) { down.dragged = true; try { slot.setPointerCapture(e.pointerId); } catch { /* ignore */ } }
    const now = performance.now();
    const v = len / Math.max(0.008, (now - down.lt) / 1000);
    pushVisitor({ k: 'tine', a: down.last, m: [dx / len, dy / len], len, alpha: 0.012 + 0.07 * clamp01(v / 2.5), lambda: 0.025, id: ID.visitor });
    down.last = p; down.lt = now;
  });
  const up = (e: PointerEvent) => {
    if (!down || e.pointerId !== down.id) return;
    if (!down.dragged && e.type === 'pointerup') {
      const dur = (performance.now() - down.t0) / 1000;
      pushVisitor({ k: 'drop', c: down.p, r: 0.03 + 0.05 * clamp01(dur / 1.2), ink, id: ID.visitor, dens: 0.92 });
    }
    down = null;
  };
  slot.addEventListener('pointerup', up);
  slot.addEventListener('pointercancel', up);

  /* ---------- buttons ---------- */
  const btn = (act: string) => el.querySelector<HTMLButtonElement>(`[data-act="${act}"]`);
  btn('drop')?.addEventListener('click', () => {
    const j = (visitor.length * 0.61803) % 1;
    pushVisitor({ k: 'drop', c: [0.5 + 0.03 * Math.cos(j * 6.283), 0.5 + 0.03 * Math.sin(j * 6.283)], r: 0.055, ink, id: ID.visitor, dens: 0.92 });
  });
  const fileName = () => `segawa-print-${ctx.print.seed}.png`;
  const save = (blob: Blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName();
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };
  const publish = async (printSize: number): Promise<Blob | null> => {
    const shot = await view.capture(printSize);
    const pattern = shot?.pattern ?? cpuPattern(all());
    ctx.print.setMarbling(pattern, all() as MarbleOp[]);
    taken = true;
    return shot?.print ?? null;
  };
  btn('print')?.addEventListener('click', async () => {
    all0();
    // read back first (one synchronous GPU read), then let the sheet fall and lift uninterrupted
    const blob = await publish(matchMedia('(pointer: coarse)').matches ? 768 : 1024);
    await view.playSheet();
    if (blob) { lastPrint = blob; save(blob); const d = btn('download'); if (d) d.hidden = false; }
    say(s.printed);
  });
  btn('download')?.addEventListener('click', () => { if (lastPrint) save(lastPrint); });
  btn('share')?.addEventListener('click', async () => {
    const u = new URL(location.href);
    u.search = '';
    u.searchParams.set('seed', String(ctx.print.seed));
    if (visitor.length) u.searchParams.set('ops', encodeOps(visitor));
    u.hash = 'writing';
    try { await navigator.clipboard.writeText(u.href); say(s.linkCopied); } catch { say(`${s.linkFailed}: ${u.href}`); }
  });
  btn('reset')?.addEventListener('click', () => {
    visitor = [];
    shown = N;
    view.setOps(base, N);
    say(s.reset);
  });

  /* ---------- list hover → tray outlines / guides ---------- */
  el.querySelectorAll<HTMLElement>('[data-item]').forEach((li) => {
    const id = Number(li.dataset.item);
    const g = li.dataset.guide?.split(',');
    const guide = g ? { kind: g[0] as 'comb' | 'tine', a: [Number(g[1]), Number(g[2])] as [number, number], angle: Number(g[3]), spacing: Number(g[4]) || 0.2 } : null;
    const on = () => { all0(); view.highlight(id, guide); };
    const off = () => view.highlight(0, null);
    li.addEventListener('pointerenter', on);
    li.addEventListener('pointerleave', off);
    li.addEventListener('focusin', on);
    li.addEventListener('focusout', off);
  });

  /* ---------- writing → testimonials: the sheet lowers and lifts; publish once ---------- */
  ctx.scroll.band('writing-testimonials').on((p) => {
    view.setSheet(ctx.motion.enabled ? clamp01(p / 0.7) : 0);
    if (p > 0 && !taken) { taken = true; void publish(0); }
  });
}

export default { id: 'writing', mount } satisfies SectionModule;
