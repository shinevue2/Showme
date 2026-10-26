/**
 * Road — 道中 The Road: section module (DESIGN §6.3, §7.5, §7.6, §2.2 road-works). Owner: WP-06.
 *
 * Film mode: progress across `.film__body` drives the player (src/film/player, its own chunk), the chapter
 * index (#road[data-chapter], read by the chrome), the top ruler's years, the plate inking of the print
 * state, the Shōno rain and — where CSS scroll-driven animations are missing — the captions. While the sticky
 * stage covers the viewport the WebGL stage is paused and its canvas hidden. The road-works band hands the
 * film's last frame over to the DOM gold clouds (data-tail) and lets them drift and part over the byōbu.
 * Static tier: captions in flow carry the #road-N ids; plates ink as their chapters are read.
 * The mode follows the Motion layer, reduced motion and Proof mode live (html[data-motion] / [data-proof]).
 */
import type { AppContext, PlateN, SectionModule, StageAPI } from '../../core/types';
import { stream } from '../../core/seed';
import { debugFilm } from '../../core/debug';
import { chapterAt } from '../../film/player/chapters';
import type { FilmHandle } from '../../film/player/mount';
import { captionRanges, captionState, cloudMoves, inkAt, rainOpacity, RAIN_POINTS, stillRanges } from './timing';
import { RAIN_PERIODS } from './rain';

type Mode = 'film' | 'static';

function forcedStatic(): boolean {
  try { return new URLSearchParams(location.search).get('film') === 'static'; } catch { return false; }
}

export default {
  id: 'road',
  mount(el: HTMLElement, ctx: AppContext) {
    const body = el.querySelector<HTMLElement>('.film__body');
    if (!body) return;
    const film = ctx.assets.film;
    const n = film.chapters.length;
    const caps = Array.from(el.querySelectorAll<HTMLElement>('.cap'));
    const anchors = Array.from(el.querySelectorAll<HTMLElement>('.film__anchor'));
    const rain = el.querySelector<HTMLElement>('.film__rain');
    const clouds = Array.from(el.querySelectorAll<HTMLElement>('.road-cloud'));
    const ranges = captionRanges(film.chapters);
    const timelines = typeof CSS !== 'undefined' && !!CSS.supports?.('animation-timeline: view()');
    const root = document.documentElement;
    const canvas = document.getElementById('stage');

    // seeded misregistration of each chapter rule and plate swatch (摺る: they spring into register, §5.2)
    caps.forEach((cap) => {
      const r = stream(ctx.print.seed, 'road:' + cap.dataset.n);
      const mag = () => (2 + r() * 4) * (r() < 0.5 ? -1 : 1);
      cap.style.setProperty('--mx', mag().toFixed(2) + 'px');
      cap.style.setProperty('--my', mag().toFixed(2) + 'px');
      cap.style.setProperty('--mr', ((r() * 2 - 1) * 0.3).toFixed(3) + 'deg');
      cap.style.setProperty('--sx', mag().toFixed(2) + 'px');
      cap.style.setProperty('--sy', mag().toFixed(2) + 'px');
    });

    let mode: Mode | null = null;
    let handle: FilmHandle | null = null;
    let mountId = 0;
    let progress = 0;
    let active = false;
    let chapter = 0;
    let raining = false;
    // The rain falls while the visitor travels through Shōno and settles a moment after they stop: at rest the
    // strokes hang still like Hiroshige's own lines, so a reader parked on chapter 7 costs no frames at all.
    // (Even a paused CSS loop keeps the compositor producing frames, so the loop is removed, not paused; the
    // strokes keep the phase they stopped at — --rain-ax/ay/bx/by — and the next loop resumes from it — --rain-delay.)
    const RAIN_LOOP_MS = 900;
    const RAIN_SETTLE_MS = 2400;
    let rainMoved = 0;
    let rainRunMs = 0;
    let rainT0 = 0;
    let rainTimer: ReturnType<typeof setTimeout> | null = null;
    const rainSettle = () => {
      if (rainTimer) { clearTimeout(rainTimer); rainTimer = null; }
      if (!el.hasAttribute('data-rain-move')) return;
      rainRunMs += performance.now() - rainT0;
      // whole pixels: a layer parked at a fractional offset keeps the compositor redrawing it (measured)
      const f = (rainRunMs % RAIN_LOOP_MS) / RAIN_LOOP_MS;
      for (const r of RAIN_PERIODS) {
        el.style.setProperty(`--rain-${r.id}x`, `${Math.round(f * r.dx)}px`);
        el.style.setProperty(`--rain-${r.id}y`, `${Math.round(f * r.dy)}px`);
      }
      delete el.dataset.rainMove;
    };
    const rainCheck = () => {
      rainTimer = null;
      const left = RAIN_SETTLE_MS - (performance.now() - rainMoved);
      if (left > 16 && raining) { rainTimer = setTimeout(rainCheck, left); return; }
      rainSettle();
    };
    const rainMove = () => {
      rainMoved = performance.now();
      if (!el.hasAttribute('data-rain-move')) {
        rainT0 = rainMoved;
        el.style.setProperty('--rain-delay', `${-Math.round(rainRunMs % RAIN_LOOP_MS)}ms`);
        el.dataset.rainMove = '';
      }
      if (!rainTimer) rainTimer = setTimeout(rainCheck, RAIN_SETTLE_MS);
    };
    const rainStop = rainSettle;
    let stage: StageAPI | null = null;
    let kills: (() => void)[] = [];
    let staticIo: IntersectionObserver | null = null;
    const capCache = caps.map(() => ({ o: -1, x: NaN }));

    void ctx.getStage().then((s) => { stage = s; if (active && mode === 'film') s?.pause('film'); });

    const wantMode = (): Mode =>
      !ctx.motion.enabled || root.hasAttribute('data-proof') || root.dataset.motion === 'off' || forcedStatic()
        || matchMedia('(prefers-reduced-motion: reduce)').matches ? 'static' : 'film';

    const ink = (p: number) => {
      for (let k = 2; k <= n; k++) if (p >= inkAt(k, n) - 1e-4 && !ctx.print.inked.has(k as PlateN)) ctx.print.ink(k as PlateN);
      if (p >= 0.98 && !ctx.print.inked.has(8)) ctx.print.ink(8);
    };

    const setIds = (m: Mode) => {
      caps.forEach((cap, i) => {
        const id = `road-${i + 1}`;
        const a = anchors[i];
        if (m === 'film') { cap.removeAttribute('id'); a?.setAttribute('id', id); }
        else { a?.removeAttribute('id'); cap.id = id; }
      });
    };

    // main-thread time of the section's own scroll work (Info panel / measurements)
    let sectionMs = 0;
    (debugFilm as typeof debugFilm & { sectionMs?: () => number }).sectionMs = () => sectionMs;

    // ---------------------------------------------------------------- film mode
    const onProgress = (p: number) => {
      const t0 = performance.now();
      onProgressInner(p);
      sectionMs += performance.now() - t0;
    };
    let lastRainP = -1;
    const onProgressInner = (p: number) => {
      progress = p;
      handle?.setProgress(p);
      if (active || p > 0) {
        const c = chapterAt(p, n);
        if (c !== chapter) { chapter = c; el.dataset.chapter = String(c); }
      }
      if (active) ink(p);               // skipping past the film inks nothing; reading it inks each plate
      if (active) ctx.chrome.setRulerYears(p);
      const inRain = p > RAIN_POINTS[0]![0] && p < RAIN_POINTS[RAIN_POINTS.length - 1]![0];
      if (inRain !== raining) { raining = inRain; if (inRain) el.dataset.rain = ''; else { delete el.dataset.rain; rainStop(); } }
      if (inRain && p !== lastRainP) rainMove();
      lastRainP = p;
      if (!timelines) {
        if (rain) rain.style.setProperty('--rain-o', rainOpacity(p).toFixed(3));
        caps.forEach((cap, i) => {
          const s = captionState(ranges[i]!, p);
          const c = capCache[i]!;
          const o = Math.round(s.o * 100) / 100, x = Math.round(s.x);
          if (o === c.o && x === c.x) return;
          c.o = o; c.x = x;
          cap.style.opacity = String(o);
          cap.style.translate = `${x}px 0`;
        });
      }
    };

    const onToggle = (on: boolean) => {
      active = on;
      handle?.setActive(on);
      if (on) {
        stage?.pause('film');
        if (canvas) canvas.style.visibility = 'hidden';
        onProgress(progress);
      } else {
        stage?.resume('film');
        if (canvas) canvas.style.visibility = '';
        ctx.chrome.setRulerYears(null);
      }
    };

    /*
     * ScrollTrigger calls back from inside the clock's tick (Lenis 'scroll' → update). Anything that asks the
     * clock for a frame from there (the chrome ruler's coalesced redraw, the stage's resume, the player)
     * would fork a second rAF chain in core/frame (R7), so the work runs in a microtask right after the tick,
     * with the latest values only.
     */
    let queued = false;
    let wantP = 0;
    let wantActive: boolean | null = null;
    const flush = () => {
      queued = false;
      if (wantActive !== null && wantActive !== active) { const a = wantActive; wantActive = null; onToggle(a); }
      wantActive = null;
      onProgress(wantP);
    };
    const later = () => { if (!queued) { queued = true; queueMicrotask(flush); } };
    const onUpdateLater = (p: number) => { wantP = p; later(); };
    const onToggleLater = (on: boolean) => { wantActive = on; later(); };

    const onBand = (p: number) => {
      const tail = mode === 'film' && p > 0 && p < 1;
      if (tail !== el.hasAttribute('data-tail')) { if (tail) el.dataset.tail = ''; else delete el.dataset.tail; }
      if (!timelines && tail) {
        const m = cloudMoves(p);
        clouds.forEach((c) => {
          const k = c.classList.contains('road-cloud--a') ? 0 : c.classList.contains('road-cloud--b') ? 1 : 2;
          c.style.translate = `${(m[k]!.x * 100).toFixed(2)}% ${(m[k]!.y * 100).toFixed(2)}%`;
        });
      }
    };

    const enterFilm = () => {
      setIds('film');
      kills.push(ctx.scroll.track(body, { start: 'top top', end: 'bottom bottom', onUpdate: onUpdateLater, onToggle: onToggleLater }));
      kills.push(ctx.scroll.band('road-works').on(onBand));
      const sr = ctx.scroll.band('summary-road');
      let unsub: (() => void) | null = null;
      unsub = sr.on((p) => { if (p > 0) { handle?.trigger(); if (handle) { unsub?.(); unsub = null; } } });
      kills.push(() => unsub?.());
      // the first station registers as the stage arrives (progress is still 0 then, so no update fires)
      const arrive = new IntersectionObserver((es) => {
        if (es.some((e) => e.isIntersecting) && chapter === 0) { chapter = chapterAt(progress, n); el.dataset.chapter = String(chapter); }
      }, { rootMargin: '0px 0px -45% 0px' });
      arrive.observe(body);
      kills.push(() => arrive.disconnect());
      const id = ++mountId;
      import('../../film/player/mount')
        .then(({ mountFilm }) => mountFilm(el, body, ctx, { stillRanges: stillRanges(film.chapters), timelines }))
        .then((h) => {
          if (id !== mountId) { h.destroy(); return; }
          handle = h;
          h.setProgress(progress);
          h.setActive(active);
          if (el.dataset.eye === 'off') h.setEnabled(false);
        })
        .catch((e) => console.error('[road] film player failed', e));
      // a deep link into the film (#road-3) lands on that chapter's rest, not on the sticky stage
      const m = /^#road-([1-7])$/.exec(location.hash);
      if (m) {
        const a = anchors[Number(m[1]) - 1];
        const r = el.getBoundingClientRect();
        if (a && r.top < innerHeight && r.bottom > 0) requestAnimationFrame(() => ctx.scroll.scrollTo(a, { immediate: true }));
      }
    };

    const leaveFilm = () => {
      mountId++;
      kills.forEach((k) => k());
      kills = [];
      handle?.destroy();
      handle = null;
      if (active) onToggle(false);
      active = false;
      delete el.dataset.tail;
      delete el.dataset.rain;
      raining = false;
      rainStop();
      caps.forEach((cap, i) => { cap.style.removeProperty('opacity'); cap.style.removeProperty('translate');  capCache[i]!.o = -1; });
    };

    // ---------------------------------------------------------------- static tier
    const enterStatic = () => {
      setIds('static');
      if (forcedStatic()) el.dataset.filmTier = 'static';
      staticIo = new IntersectionObserver((es) => {
        for (const e of es) {
          if (!e.isIntersecting) continue;
          const k = Number((e.target as HTMLElement).dataset.n);
          if (k >= 2 && !ctx.print.inked.has(k as PlateN)) ctx.print.ink(k as PlateN);
          if (k === n && !ctx.print.inked.has(8)) ctx.print.ink(8);
          el.dataset.chapter = String(k);
        }
      }, { threshold: 0.5 });
      caps.forEach((c) => staticIo!.observe(c));
    };
    const leaveStatic = () => { staticIo?.disconnect(); staticIo = null; };

    // ---------------------------------------------------------------- mode switching (live)
    const apply = () => {
      const next = wantMode();
      if (next === mode) return;
      // keep the reader on the same chapter across the layout change
      const here = ctx.scroll.active === 'road' && mode !== null;
      const ch = mode === 'film' ? chapterAt(progress, n) : Number(el.dataset.chapter || 1);
      if (mode === 'film') leaveFilm(); else if (mode === 'static') leaveStatic();
      mode = next;
      if (next === 'film') enterFilm(); else enterStatic();
      if (here) {
        requestAnimationFrame(() => {
          const target = next === 'film' ? anchors[ch - 1] : caps[ch - 1];
          if (target) ctx.scroll.scrollTo(target, { immediate: true });
          ctx.scroll.refresh();
        });
      }
    };
    apply();
    new MutationObserver(apply).observe(root, { attributes: true, attributeFilter: ['data-motion', 'data-proof'] });
    ctx.motion.on(() => apply());

    // Layers eye (WP-04): the film freezes, the rain stops, the stage resumes as for any hidden layer
    document.addEventListener('hanmoto:eye', (e) => {
      const d = (e as CustomEvent<{ section: string; visible: boolean }>).detail;
      if (d?.section === 'road') handle?.setEnabled(d.visible);
    });

  },
} satisfies SectionModule;
