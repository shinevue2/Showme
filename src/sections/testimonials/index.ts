/**
 * Testimonials — section module (DESIGN §6.9, band testimonials-contact). Owner: WP-10.
 *  - two-plate overprint: each quote's 紅 / 薄群青 copies wait misregistered (seeded ≤ 3 px, ≤ 0.4°), snap into
 *    register when the quote reaches the reading line (--ease-register, 420 ms), then lift off in 300 ms, leaving
 *    the DOM text; plates are never shown without motion;
 *  - registers the noren (not on the static tier; the CSS noren stays there), a gust when it comes into view;
 *  - testimonials → contact: the camera walks through the centre panel.
 */
import type { AppContext, SectionModule } from '../../core/types';
import type { NorenView } from './view';

function overprint(el: HTMLElement, ctx: AppContext): void {
  const quotes = Array.from(el.querySelectorAll<HTMLElement>('[data-quote]'));
  let s = ctx.print.seed || 1;
  const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  quotes.forEach((q) => {
    const sign = () => (rnd() < 0.5 ? -1 : 1);
    q.style.setProperty('--qx', `${(sign() * (2 + rnd())).toFixed(2)}px`);
    q.style.setProperty('--qy', `${(sign() * (1 + 2 * rnd())).toFixed(2)}px`);
    q.style.setProperty('--qr', `${(sign() * (0.2 + 0.2 * rnd())).toFixed(2)}deg`);
  });
  if (!('IntersectionObserver' in window)) { quotes.forEach((q) => q.classList.add('is-in', 'is-done')); return; }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const q = e.target as HTMLElement;
      io.unobserve(q);
      q.classList.add('is-in');
      setTimeout(() => q.classList.add('is-done'), ctx.motion.enabled ? 520 : 0);
    }
  }, { rootMargin: '0px 0px -30% 0px', threshold: 0 });   // the reading line: 70 % down the viewport
  quotes.forEach((q) => io.observe(q));
}

async function mount(el: HTMLElement, ctx: AppContext): Promise<void> {
  overprint(el, ctx);
  const slot = el.querySelector<HTMLElement>('[data-view-id="testimonials-noren"]');
  const stage = slot ? await ctx.getStage() : null;
  if (!stage || !slot) return;
  const view: NorenView = (await import('./view')).default(slot, ctx);
  stage.register(view);
  let arrived = false;
  ctx.scroll.track(slot, {
    start: 'top bottom', end: 'bottom top',
    onUpdate: (p) => { if (!arrived && p > 0.15) { arrived = true; view.gust(0.7); } },
  });
  ctx.scroll.band('testimonials-contact').on((p) => view.setBand(ctx.motion.enabled ? p : 0));
}

export default { id: 'testimonials', mount } satisfies SectionModule;
