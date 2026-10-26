/**
 * Cover section module (DESIGN §6.1). Owner: WP-05.
 * - Picks the cover mode (data-cover-mode): 'gl' (the `cover-block` view peels the sheet), 'css' (software tier,
 *   lost context, view error: CSS peel over the carved-block still), 'still' (static tier, reduced motion, Motion
 *   layer off, Proof: the sheet stays and the still sits beside it).
 * - Writes the scroll-linked CSS variables the DOM needs: --peel (CSS peel, when scroll-driven animations are
 *   unavailable), --cap (block caption), --press (en name weight 500 → 700 with baren pressure, non-GL modes).
 * - §5.6 sort drop of the name after a language switch; consumes sessionStorage['hanmoto.langSwitched'] (also used
 *   by the view for the re-carve).
 * - The corner hint 2 s after the swap; the corner button scrolls to the lifted sheet.
 */
import type { AppContext, SectionModule, StageAPI } from '../../core/types';
import { session } from '../../core/storage';
import { coverState, type CoverMode } from './state';

const VIEW_ID = 'cover-block';
const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** §5.6: the name's characters drop 2 px into place, 30 ms apart, ≤ 400 ms in all — transform only, never hidden. */
async function sortDrop(h1: HTMLElement): Promise<void> {
  const cs = getComputedStyle(h1);
  try { await document.fonts.load(`${cs.fontStyle} ${cs.fontWeight} 1em ${cs.fontFamily}`, h1.textContent ?? ''); } catch { /* fall through */ }
  const label = h1.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const originals: [Text, HTMLElement][] = [];
  const spans: HTMLElement[] = [];
  const walker = document.createTreeWalker(h1, NodeFilter.SHOW_TEXT);
  const texts: Text[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) if (!n.parentElement?.closest('rt') && n.nodeValue?.trim()) texts.push(n as Text);
  for (const t of texts) {
    const frag = document.createDocumentFragment();
    for (const ch of t.nodeValue ?? '') {
      if (/\s/.test(ch)) { frag.append(ch); continue; }
      const s = document.createElement('span');
      s.textContent = ch;
      s.setAttribute('aria-hidden', 'true');
      s.style.display = 'inline-block';
      frag.append(s);
      spans.push(s);
    }
    const holder = document.createElement('span');
    holder.append(frag);
    originals.push([t, holder]);
    t.replaceWith(holder);
  }
  h1.setAttribute('aria-label', label);
  const n = spans.length;
  const stagger = 30;
  const dur = Math.max(80, 400 - stagger * Math.max(0, n - 1));
  const anims = spans.map((s, i) => s.animate(
    [{ transform: 'translateY(-2px)' }, { transform: 'none' }],
    { duration: dur, delay: i * stagger, easing: 'cubic-bezier(.2, .9, .1, 1)', fill: 'backwards' },
  ));
  await Promise.all(anims.map((a) => a.finished.catch(() => undefined)));
  for (const [t, holder] of originals) holder.replaceWith(t);
  h1.removeAttribute('aria-label');
}

export default {
  id: 'cover',
  async mount(el: HTMLElement, ctx: AppContext) {
    const root = document.documentElement;
    const paper = el.querySelector<HTMLElement>('[data-paper]');
    const slot = el.querySelector<HTMLElement>(`[data-view-id="${VIEW_ID}"]`);
    const h1 = el.querySelector<HTMLElement>('#cover-title');
    const corner = el.querySelector<HTMLButtonElement>('.cover__corner');
    coverState.capture = root.dataset.poster === VIEW_ID;

    // ---- arrival via the language wheel: sort drop now, re-carve later (view)
    if (session.get('hanmoto.langSwitched')) {
      session.set('hanmoto.langSwitched', null);
      coverState.langSwitched = true;
      if (h1 && ctx.motion.enabled) coverState.sortDone = sortDrop(h1).catch(() => undefined);
    }

    // ---- scroll-linked variables
    const supportsTimeline = typeof CSS !== 'undefined' && CSS.supports?.('animation-timeline: scroll()');
    let mode: CoverMode | null = null;
    let lastQ = -1;
    const onScroll = () => {
      const q = scrollY - (el.offsetTop || 0);
      if (q === lastQ) return;
      lastQ = q;
      const vh = innerHeight;
      const narrow = innerWidth < 1024;
      const peel = narrow ? smooth(0.02 * vh, 0.34 * vh, q) : smooth(0, 0.4 * vh, q);
      const cap = narrow ? smooth(0.3 * vh, 0.5 * vh, q) : smooth(0.4 * vh, 0.6 * vh, q);
      const band = el.querySelector<HTMLElement>('[data-band="cover-summary"]');
      let fadeOut = 0;
      if (band && !narrow) {
        const p = (scrollY + vh - (band.offsetTop + el.offsetTop)) / (band.offsetHeight + vh);
        fadeOut = smooth(0.12, 0.26, p);
      }
      if (mode === 'gl' || mode === 'css') el.style.setProperty('--cap', (cap * (1 - fadeOut)).toFixed(3));
      if (mode === 'gl') el.style.setProperty('--marks', (1 - fadeOut).toFixed(3));
      if (mode === 'css' && !supportsTimeline) el.style.setProperty('--peel', peel.toFixed(4));
      if (mode !== 'gl' && ctx.lang === 'en') el.style.setProperty('--press', (mode === 'css' ? peel : 0).toFixed(3));
      if (q > 4 && el.hasAttribute('data-hint')) { el.removeAttribute('data-hint'); coverState.hint = false; coverState.wake?.(); }
    };
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', () => { lastQ = -1; onScroll(); }, { passive: true });

    const setMode = (m: CoverMode) => {
      if (m === mode) return;
      mode = m;
      el.dataset.coverMode = m;
      if (m !== 'gl') el.style.removeProperty('--marks');
      if (m === 'still') { el.style.removeProperty('--cap'); el.style.removeProperty('--peel'); }
      lastQ = -1;
      onScroll();
    };

    // ---- the corner: hint 2 s after the swap; activating it lifts the sheet (scrolls into the peel)
    coverState.onReady = () => {
      if (coverState.hint || scrollY - el.offsetTop > 4) return;
      setTimeout(() => {
        if (scrollY - el.offsetTop > 4 || !ctx.motion.enabled) return;
        coverState.hint = true;
        el.setAttribute('data-hint', '');
        coverState.wake?.();
      }, 2000);
    };
    corner?.addEventListener('click', () => {
      const narrow = innerWidth < 1024;
      ctx.scroll.scrollTo(el.offsetTop + innerHeight * (narrow ? 0.36 : 0.46));
    });

    // ---- mode
    const staticByMotion = () => !ctx.motion.enabled && !coverState.capture;
    if (ctx.proof || staticByMotion()) setMode('still');
    let stage: StageAPI | null = null;
    let viewRegistered = false;
    let view: import('../../core/types').View | null = null;

    const decide = async () => {
      if (ctx.proof) { setMode('still'); return; }
      if (staticByMotion()) {
        setMode('still');
        if (view && stage) { stage.unregister(view); view = null; viewRegistered = false; paper?.removeAttribute('data-gl'); }
        return;
      }
      if (!stage) { setMode('still'); return; }
      if (stage.tier.name === 'software' || stage.tier.name === 'static' || root.classList.contains('gl-lost')) { setMode('css'); return; }
      if (slot?.dataset.viewState === 'error') { setMode('css'); return; }
      setMode('gl');
      if (!viewRegistered && slot) {
        viewRegistered = true;
        view = (await import('./view')).default(slot, ctx);
        stage.register(view);
      }
    };

    ctx.motion.on(() => { void decide(); });
    stage = await ctx.getStage();
    await decide();
    if (stage) {
      ctx.tier.on(() => { void decide(); });
      new MutationObserver(() => { void decide(); }).observe(root, { attributes: true, attributeFilter: ['class'] });
      if (slot) new MutationObserver(() => { void decide(); }).observe(slot, { attributes: true, attributeFilter: ['data-view-state'] });
    }
    // CSS-peel fallback without scroll-driven animations, and the caption, need the scroll vars from the start
    onScroll();
  },
} satisfies SectionModule;
