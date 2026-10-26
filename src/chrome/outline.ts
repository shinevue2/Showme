/**
 * Outline (keyline) view (DESIGN §4.1): html[data-view="outline"]. Owner: WP-04.
 * Artboards become 1 px keylines, display headings 0.6 px strokes, body text --ink-2, every figure a crossed
 * box labelled with its file (style.css); the stage mirrors the attribute into each view's setOutline()
 * (src/gl/stage); the film shows the current chapter still as a crossed box labelled `keyframe ch-N`.
 */
import { $, coalesce, h, type ChromeCtx } from './util';

export interface OutlineAPI { set(on: boolean): void; toggle(): void; readonly on: boolean }

export function mountOutline(c: ChromeCtx): OutlineAPI {
  const html = document.documentElement;
  const btn = $<HTMLButtonElement>('[data-tool="outline"]');
  const road = document.getElementById('road');
  let film: HTMLElement | null = null;
  let onScroll: (() => void) | null = null;

  const placeFilm = coalesce(() => {
    if (!film || !road) return;
    const video = road.querySelector<HTMLElement>('video') ?? road.querySelector<HTMLElement>('.film__poster');
    const r = (video?.parentElement ?? road).getBoundingClientRect();
    // clip to the reading area: below the doc bar + ruler, right of the left ruler, above the status bar
    const bar = document.querySelector('.docbar')?.getBoundingClientRect();
    const ruler = document.querySelector<HTMLElement>('.rulers');
    const rb = ruler && getComputedStyle(ruler).display !== 'none' ? ruler.getBoundingClientRect() : null;
    const status = document.querySelector('.status__line')?.getBoundingClientRect();
    const top = Math.max(r.top, rb && rb.height ? rb.bottom : bar?.bottom ?? 0);
    const bottom = Math.min(r.bottom, status && status.height ? status.top : innerHeight);
    const left = Math.max(r.left, 0);
    const right = Math.min(r.right, innerWidth);
    if (bottom - top < 24 || right - left < 24) { delete film.dataset.on; return; }
    film.dataset.on = '';
    film.style.left = `${left}px`;
    film.style.top = `${top}px`;
    film.style.width = `${right - left}px`;
    film.style.height = `${bottom - top}px`;
    const label = film.firstElementChild as HTMLElement;
    const text = `${c.s.keyframe} ch-${road.dataset.chapter ?? '1'}`;
    if (label.textContent !== text) label.textContent = text;
  });

  const set = (on: boolean) => {
    if (on) html.dataset.view = 'outline'; else delete html.dataset.view;
    btn?.setAttribute('aria-pressed', String(on));
    if (on && road && !film) {
      film = h('div', 'outline-film', { 'aria-hidden': 'true' }, '<span></span>');
      document.body.appendChild(film);
    }
    if (on && road) {
      onScroll = () => placeFilm();
      addEventListener('scroll', onScroll, { passive: true });
      addEventListener('resize', onScroll, { passive: true });
      placeFilm();
    } else if (onScroll) {
      removeEventListener('scroll', onScroll);
      removeEventListener('resize', onScroll);
      onScroll = null;
      if (film) delete film.dataset.on;
    }
  };
  btn?.addEventListener('click', () => set(html.dataset.view !== 'outline'));
  return { set, toggle: () => set(html.dataset.view !== 'outline'), get on() { return html.dataset.view === 'outline'; } };
}
