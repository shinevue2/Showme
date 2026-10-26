/**
 * Achievements section module (DESIGN §6.7). Owner: WP-09. Wires "Ink it" and the light-angle range (keyboard and
 * touch control of the raking light) and registers the `achievements-press` view. Without a stage (static tier,
 * Proof mode, no WebGL2) the DOM is already complete: SVG impressions, hatched gold bars, printed figures.
 */
import type { SectionModule } from '../../core/types';
import { pressState } from './state';

const VIEW_ID = 'achievements-press';

export default {
  id: 'achievements',
  async mount(el, ctx) {
    const kz = el.querySelector<HTMLElement>('.kz');
    const btn = el.querySelector<HTMLButtonElement>('.kz-ink');
    const range = el.querySelector<HTMLInputElement>('.kz-light input');
    btn?.addEventListener('click', () => {
      pressState.ink = !pressState.ink;
      btn.setAttribute('aria-pressed', String(pressState.ink));
      kz?.toggleAttribute('data-inked', pressState.ink);
      pressState.wake();
    });
    range?.addEventListener('input', () => {
      pressState.light = Number(range.value) / 100;
      pressState.lightSet = true;
      pressState.wake();
    });
    const slot = el.querySelector<HTMLElement>(`[data-view-id="${VIEW_ID}"]`);
    if (!slot) return;
    const stage = await ctx.getStage();
    if (!stage) return;
    pressState.wake = () => stage.requestFrame();
    stage.register((await import('./view')).default(slot, ctx));
  },
} satisfies SectionModule;
