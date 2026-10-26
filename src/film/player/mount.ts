/**
 * The film player (DESIGN §7.6, video §3–§5): plan → fetch as Blob → attach → first frame → reveal, with the
 * stills / WebCodecs fallbacks, the runtime downgrade to film-sd and a variant swap when the viewport turns
 * between portrait and landscape. Only one film is ever kept: a swap loads the new file under the old one,
 * reveals it on its first presented frame, then releases the old element and revokes its object URL.
 * The section module (src/sections/road/index.ts) feeds progress/active state and owns everything around
 * the film (captions, ruler, inking, clouds). Owner: WP-06.
 */
import type { AppContext, FilmManifest } from '../../core/types';
import { debugFilm } from '../../core/debug';
import { buildTimeLut, chapterAt } from './chapters';
import { choosePlan, forcedFilm, preferredVariant, PORTRAIT_MQ, type FilmTier, type Plan, type VariantKey } from './plan';
import { createLoader, type FilmLoader } from './load';
import { ScrollFilm, VideoSource, type FrameSource } from './scroll-film';

export interface FilmHandle {
  readonly tier: FilmTier;
  setProgress(p: number): void;
  setActive(active: boolean): void;
  /** start fetching now (the summary-road band has begun) */
  trigger(): void;
  /** Layers eye: false freezes the film where it is */
  setEnabled(on: boolean): void;
  destroy(): void;
}

export interface FilmMountOptions {
  /** stills crossfade ranges (film progress) from the section's timing module, index 0 … 7 (7 = gold end) */
  stillRanges: readonly { s0: number; s1: number }[];
  /** CSS scroll-driven animations available (else the stills crossfade is driven from setProgress) */
  timelines: boolean;
  onTier?(tier: FilmTier): void;
}

const SEEK_LOG = 240;

function waitLoaded(v: HTMLVideoElement): Promise<void> {
  return new Promise((resolve, reject) => {
    const ok = () => { off(); resolve(); };
    const bad = () => { off(); reject(v.error ?? new Error('film: media error')); };
    const off = () => { v.removeEventListener('loadeddata', ok); v.removeEventListener('error', bad); };
    v.addEventListener('loadeddata', ok);
    v.addEventListener('error', bad);
  });
}

function presented(v: HTMLVideoElement | null): Promise<void> {
  return new Promise((resolve) => {
    const t = setTimeout(resolve, 400);
    if (v && 'requestVideoFrameCallback' in v) v.requestVideoFrameCallback(() => { clearTimeout(t); resolve(); });
    else requestAnimationFrame(() => { clearTimeout(t); resolve(); });
  });
}

export async function mountFilm(section: HTMLElement, body: HTMLElement, ctx: AppContext, opts: FilmMountOptions): Promise<FilmHandle> {
  const film: FilmManifest = ctx.assets.film;
  const url = (p: string) => ctx.assets.url(p);
  const frames = section.querySelector<HTMLElement>('.film__frames')!;
  let video = section.querySelector<HTMLVideoElement>('.film__video')!;
  const canvas = section.querySelector<HTMLCanvasElement>('.film__canvas')!;
  let poster = section.querySelector<HTMLPictureElement>('.film__poster');
  const posterTemplate = poster?.cloneNode(true) as HTMLPictureElement | undefined;

  let plan: Plan = await choosePlan(film, { motion: ctx.motion.enabled, proof: ctx.proof });
  let tier: FilmTier = plan.tier;
  let progress = 0;
  let active = false;
  let enabled = true;
  let dead = false;
  let player: ScrollFilm | null = null;
  let source: FrameSource | null = null;
  let blobUrl: string | null = null;
  let loader: FilmLoader | null = null;
  let stills: HTMLElement | null = null;
  let posterChapter = 1;
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let viewIo: IntersectionObserver | null = null;
  let swapTimer: ReturnType<typeof setTimeout> | null = null;
  let swapping = false;
  let lastMove = performance.now();
  let wantVariant: VariantKey | null = null;

  const setTier = (t: FilmTier) => {
    tier = t;
    if (t === 'static' && !plan.forced) delete section.dataset.filmTier;
    else section.dataset.filmTier = t;
    opts.onTier?.(t);
  };

  // ---------- debug / Info panel (WP-04 reads debugFilm.plan and debugFilm.seeks) ----------
  debugFilm.plan = {
    get tier() { return tier; },
    get variant() { return plan.variant; },
    get reason() { return plan.reason; },
    get src() { return plan.v ? plan.v.src : null; },
    get bytes() { return plan.v ? plan.v.bytes : 0; },
    get stats() { return player ? { ...player.stats } : null; },
    get violations() { return source instanceof VideoSource ? source.violations : 0; },
    get ready() { return section.hasAttribute('data-ready'); },
    /** variant waiting to be swapped in (runtime downgrade / aspect change), and a swap in progress */
    get pendingVariant() { return wantVariant; },
    get swapping() { return swapping; },
  };
  const logSeek = (ms: number) => {
    const s = debugFilm.seeks;
    s.push(Math.round(ms * 10) / 10);
    if (s.length > SEEK_LOG) s.splice(0, s.length - SEEK_LOG);
  };

  // ---------- poster: the visible state until the first real frame ----------
  const posterTo = (n: number) => {
    if (!poster || n === posterChapter) return;
    posterChapter = n;
    const i = n - 1;
    const srcs = poster.querySelectorAll('source');
    const L = film.stills.landscape, P = film.stills.portrait;
    const set = [url(P.avif[i]!), url(P.webp[i]!), url(L.avif[i]!)];
    srcs.forEach((s, k) => { if (set[k]) s.srcset = set[k]!; });
    const img = poster.querySelector('img');
    if (img) img.src = url(L.webp[i]!);
  };

  const reveal = () => {
    if (dead) return;
    section.dataset.ready = '';
    const p = poster;
    if (!p) return;
    poster = null;
    let gone = false;
    const drop = () => { if (gone) return; gone = true; p.remove(); };   // frees its decoded bitmap
    p.addEventListener('transitionend', drop, { once: true });
    setTimeout(drop, 600);
  };

  // ---------- stills tier: seven chapter stills + the gold end still, crossfaded on the --film timeline ----------
  const mountStills = () => {
    if (stills) return;
    const L = film.stills.landscape, P = film.stills.portrait;
    const wrap = document.createElement('div');
    wrap.className = 'film__stills';
    const all = [...L.avif.map((_, i) => i), 7];
    wrap.innerHTML = all.map((i, k) => {
      const end = i === 7;
      const pa = end ? P.end.avif : P.avif[i]!, pw = end ? P.end.webp : P.webp[i]!;
      const la = end ? L.end.avif : L.avif[i]!, lw = end ? L.end.webp : L.webp[i]!;
      const r = opts.stillRanges[k] ?? { s0: -1, s1: -1 };
      return `<picture class="film__still" style="--s0:${(r.s0 * 100).toFixed(3)}%;--s1:${(r.s1 * 100).toFixed(3)}%">` +
        `<source media="${PORTRAIT_MQ}" type="image/avif" srcset="${url(pa)}"><source media="${PORTRAIT_MQ}" type="image/webp" srcset="${url(pw)}">` +
        `<source type="image/avif" srcset="${url(la)}"><img src="${url(lw)}" width="${film.variants.hd.w}" height="${film.variants.hd.h}" alt="" decoding="async" loading="lazy"></picture>`;
    }).join('');
    frames.insertBefore(wrap, poster ?? null);
    stills = wrap;
    const first = wrap.querySelector('img');
    if (first && !first.complete) {
      let done = false;
      const go = () => { if (!done) { done = true; reveal(); } };
      first.addEventListener('load', go, { once: true });
      first.addEventListener('error', go, { once: true });
      setTimeout(go, 1500);
    } else reveal();
    stillsProgress(progress);
  };
  const stillsProgress = (p: number) => {
    if (!stills || opts.timelines) return;
    const pics = stills.children;
    for (let k = 1; k < pics.length; k++) {
      const r = opts.stillRanges[k]!;
      const o = p <= r.s0 ? 0 : p >= r.s1 ? 1 : (p - r.s0) / (r.s1 - r.s0);
      (pics[k] as HTMLElement).style.opacity = String(Math.round(o * 1000) / 1000);
    }
  };

  // ---------- teardown of a running film (blob URL revoked, decoder released) ----------
  const releaseVideo = (v: HTMLVideoElement) => {
    const src = v.currentSrc || v.src;
    v.removeAttribute('src');
    v.load();
    if (src.startsWith('blob:')) URL.revokeObjectURL(src);
  };
  const stopPlayer = () => {
    player?.destroy();
    player = null;
    source = null;
    if (blobUrl) { URL.revokeObjectURL(blobUrl); blobUrl = null; }
  };

  const fallbackToStills = (why: unknown) => {
    if (dead || tier === 'stills' || tier === 'static') return;
    console.info('[film] stills tier:', why instanceof Error ? why.message : why);
    loader?.abort();
    loader = null;
    viewIo?.disconnect();
    viewIo = null;
    if (timeout) { clearTimeout(timeout); timeout = null; }
    if (swapTimer) { clearTimeout(swapTimer); swapTimer = null; }
    wantVariant = null;
    stopPlayer();
    releaseVideo(video);
    canvas.hidden = true;
    plan = { ...plan, tier: 'stills', reason: `fallback: ${why instanceof Error ? why.message : String(why)}` };
    setTier('stills');
    mountStills();
  };

  // ---------- attach a blob to a frame source ----------
  const makeVideoSource = async (v: HTMLVideoElement, blob: Blob, probe: boolean): Promise<VideoSource | 'blocked'> => {
    const u = URL.createObjectURL(blob);
    v.muted = true;
    v.playsInline = true;
    v.disableRemotePlayback = true;
    v.preload = 'auto';             // markup ships preload="none"; with "none" loadeddata may never come
    v.src = u;
    try { await waitLoaded(v); }
    catch (e) { URL.revokeObjectURL(u); throw e; }
    if (probe) {                     // iOS unlock + Low Power Mode probe, before the first real seek
      try { await v.play(); v.pause(); }
      catch (e) {
        if (e instanceof DOMException && e.name === 'NotAllowedError') { v.removeAttribute('src'); v.load(); URL.revokeObjectURL(u); return 'blocked'; }
      }
    }
    blobUrl = u;
    v.addEventListener('error', () => { if (v === video && !swapping) fallbackToStills('media error'); });
    return new VideoSource(v);
  };

  const makeWebCodecsSource = async (blob: Blob): Promise<FrameSource> => {
    if (!('VideoDecoder' in window)) throw new Error('no VideoDecoder');
    const { createWebCodecsSource } = await import('./webcodecs-film');
    const src = await createWebCodecsSource(canvas, blob, { w: plan.v!.w, h: plan.v!.h });
    canvas.hidden = false;
    return src;
  };

  const startPlayer = async (src: FrameSource): Promise<void> => {
    const v = plan.v!;
    const lut = buildTimeLut(film.chapters, film.duration, v.fps);
    const p = new ScrollFilm({ source: src, lut, fps: v.fps, frames: v.frames, onSeek: logSeek, onSlow: () => scheduleSwap('slow') });
    p.setProgress(progress);
    player = p;
    source = src;
    p.setActive(active);
    p.setFrozen(!enabled);
    await p.start();
    await presented(src instanceof VideoSource ? src.video : null);
  };

  /** the film path was abandoned meanwhile (stills fallback, teardown): stop whatever was in flight */
  const gone = () => dead || tier === 'stills' || tier === 'static';

  const run = async () => {
    const v = plan.v!;
    loader = createLoader(url(v.src), body, { prefetch: plan.prefetch });
    // a 10 s timeout once the section is actually in view: never a broken stage
    viewIo = new IntersectionObserver((es) => {
      if (!es.some((e) => e.isIntersecting) || timeout || section.hasAttribute('data-ready')) return;
      timeout = setTimeout(() => { if (!section.hasAttribute('data-ready')) fallbackToStills('timeout'); }, 10000);
    });
    viewIo.observe(body);
    const blob = await loader.blob;
    // the loader's promise would keep this Blob alive after a later variant swap revoked its URL:
    // drop it, so only the object URL (revoked on swap/teardown) holds the file
    loader = null;
    if (gone()) return;
    let src: FrameSource;
    if (tier === 'webcodecs') src = await makeWebCodecsSource(blob);
    else {
      const r = await makeVideoSource(video, blob, plan.needsIosProbe);
      if (r === 'blocked') {
        if ('VideoDecoder' in window) { plan = { ...plan, tier: 'webcodecs', reason: 'autoplay blocked' }; setTier('webcodecs'); src = await makeWebCodecsSource(blob); }
        else throw new Error('autoplay blocked, no VideoDecoder');
      } else src = r;
    }
    if (gone()) { src.destroy(); return; }
    await startPlayer(src);
    if (gone()) return;
    if (timeout) { clearTimeout(timeout); timeout = null; }
    viewIo?.disconnect();
    viewIo = null;
    reveal();
  };

  // ---------- variant swaps: runtime downgrade (HD → SD) and portrait ↔ landscape ----------
  const desiredVariant = (): VariantKey => {
    const f = forcedFilm();
    if (f === 'sd' || f === 'hd' || f === 'portrait') return f;
    const pref = preferredVariant();
    if (pref === 'portrait') return 'portrait';
    if (plan.variant === 'sd' || wantVariant === 'sd') return 'sd';     // never climb back after a downgrade
    return pref;
  };
  const scheduleSwap = (why: 'slow' | 'aspect') => {
    if (why === 'slow') { if (plan.variant !== 'hd') return; wantVariant = 'sd'; }
    else wantVariant = desiredVariant();
    if (!wantVariant || wantVariant === plan.variant) { wantVariant = null; return; }
    if (swapTimer) clearTimeout(swapTimer);
    const tryNow = () => {
      swapTimer = null;
      if (dead || swapping || !wantVariant) return;
      const idle = !active || (player?.settled && performance.now() - lastMove > 1200);
      if (!idle) { swapTimer = setTimeout(tryNow, 700); return; }
      void swapTo(wantVariant);
    };
    swapTimer = setTimeout(tryNow, 400);
  };

  const within = <T>(p: Promise<T>, ms: number): Promise<T> => new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('swap timeout')), ms);
    p.then((x) => { clearTimeout(t); resolve(x); }, (e) => { clearTimeout(t); reject(e); });
  });

  const swapTo = async (key: VariantKey) => {
    if (!player || (tier !== 'video' && tier !== 'webcodecs')) return;
    swapping = true;
    const v = film.variants[key];
    const prevPlan = plan;
    const prevPlayer = player;
    const prevSource = source;
    const prevVideo = video;
    const prevUrl = blobUrl;
    let nv: HTMLVideoElement | null = null;
    let next: ScrollFilm | null = null;
    try {
      const res = await fetch(url(v.src), { priority: 'low', credentials: 'omit' } as RequestInit);
      if (!res.ok) throw new Error(`film ${res.status}`);
      const blob = await res.blob();
      if (gone() || player !== prevPlayer) return;
      plan = { ...plan, variant: key, v, reason: key === 'sd' && plan.variant === 'hd' ? 'downgrade: slow seeks' : `aspect: ${key}` };
      let src: FrameSource;
      if (tier === 'webcodecs') {
        prevPlayer.destroy();
        player = null;
        src = await makeWebCodecsSource(blob);
      } else {
        // the new element sits under the old one until its first frame is on screen
        nv = prevVideo.cloneNode(false) as HTMLVideoElement;
        nv.removeAttribute('src');
        frames.insertBefore(nv, prevVideo);
        blobUrl = null;
        const r = await makeVideoSource(nv, blob, false);
        if (r === 'blocked') throw new Error('swap blocked');
        src = r;
      }
      if (gone()) { src.destroy(); throw new Error('torn down'); }
      player = null;
      const started = startPlayer(src);
      next = player as ScrollFilm | null;        // set synchronously by startPlayer
      await within(started, 8000);
      if (tier === 'video' && nv) {
        video = nv;
        prevPlayer.destroy();
        releaseVideo(prevVideo);
        prevVideo.remove();
        if (prevUrl) URL.revokeObjectURL(prevUrl);
      }
    } catch (e) {
      if (tier === 'video' && nv) {
        // keep the file that was playing: undo the half-made swap, release the new element and its URL
        (next as ScrollFilm | null)?.destroy();
        if (blobUrl && blobUrl !== prevUrl) URL.revokeObjectURL(blobUrl);
        releaseVideo(nv);
        nv.remove();
        plan = prevPlan;
        player = prevPlayer;
        source = prevSource;
        blobUrl = prevUrl;
        video = prevVideo;
        prevPlayer.setProgress(progress);
        prevPlayer.setActive(active);
        prevPlayer.setFrozen(!enabled);
        console.warn('[film] variant swap failed; keeping the current file', e);
      } else if (!gone() && !player) {
        fallbackToStills(e);           // WebCodecs: the old decoder is gone already
      } else console.warn('[film] variant swap skipped', e);
    } finally {
      swapping = false;
      wantVariant = null;
    }
  };

  const mq = matchMedia(PORTRAIT_MQ);
  const onAspect = () => { if (tier === 'video' || tier === 'webcodecs') scheduleSwap('aspect'); };
  mq.addEventListener('change', onAspect);

  // ---------- start ----------
  setTier(tier);
  if (tier === 'stills') mountStills();
  else if (tier === 'video' || tier === 'webcodecs') {
    if (tier === 'webcodecs' && !('VideoDecoder' in window)) fallbackToStills('no VideoDecoder');
    else run().catch((e) => fallbackToStills(e));
  }

  return {
    get tier() { return tier; },
    setProgress(p: number) {
      progress = p;
      lastMove = performance.now();
      if (player) player.setProgress(p);
      else if (poster && (tier === 'video' || tier === 'webcodecs')) posterTo(chapterAt(p, film.chapters.length));
      stillsProgress(p);
    },
    setActive(on: boolean) {
      active = on;
      player?.setActive(on);
    },
    trigger() { loader?.go('high'); },
    setEnabled(on: boolean) {
      enabled = on;
      player?.setFrozen(!on);
    },
    destroy() {
      dead = true;
      mq.removeEventListener('change', onAspect);
      if (timeout) clearTimeout(timeout);
      if (swapTimer) clearTimeout(swapTimer);
      viewIo?.disconnect();
      loader?.abort();
      stopPlayer();
      releaseVideo(video);
      canvas.hidden = true;
      stills?.remove();
      stills = null;
      delete section.dataset.ready;
      delete section.dataset.filmTier;
      // a later remount (Motion layer back on) starts again from the chapter-1 poster
      if (!frames.querySelector('.film__poster') && posterTemplate) frames.appendChild(posterTemplate);
      debugFilm.plan = null;
    },
  };
}
