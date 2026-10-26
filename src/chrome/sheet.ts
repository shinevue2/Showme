/**
 * Info sheet content (DESIGN §4.1 "Status bar / Info"): 情報 Info · 用語 Glossary · 設定 Settings.
 * Owner: WP-04. Loaded on first open (its own chunk). Info refreshes only while it is visible: stage numbers
 * arrive with the stage's stats, the frame-time graph samples the one clock's ticks without keeping it
 * alive, and page numbers refresh once a second (setTimeout, never rAF).
 */
import type { ThemePref, TierName } from '../core/types';
import { frame } from '../core/frame';
import { debugFilm } from '../core/debug';
import { local } from '../core/storage';
import { $, $$, escHtml, hooks, motionLayerOn, setMotionLayer, fill, type ChromeCtx } from './util';
import type { Panels } from './panels';
import { TIER_LABEL } from './status';

let built: Record<string, boolean> = {};
let stopInfo: (() => void) | null = null;

export function hidden(): void { stopInfo?.(); stopInfo = null; }

export function showTab(c: ChromeCtx, _panels: Panels, sheet: HTMLElement, tab: string): void {
  const body = $<HTMLElement>(`[data-tab-panel="${tab}"]`, sheet);
  if (!body) return;
  if (tab !== 'info') { stopInfo?.(); stopInfo = null; }
  if (tab === 'info') { if (!built.info) { buildInfo(c, body); built.info = true; } stopInfo?.(); stopInfo = runInfo(c, body); }
  if (tab === 'glossary' && !built.glossary) { buildGlossary(c, body); built.glossary = true; }
  if (tab === 'settings') { if (!built.settings) { buildSettings(c, body); built.settings = true; } syncSettings(body); }
}

/* =========================================================================== Info */
const PRINT_TERMS: Record<string, string> = {
  'cover-block': '主版', 'works-byobu': '金箔', 'skills-kumiko': '組子', 'principles-garden': '砂紋',
  'achievements-press': '砂子・空摺', 'writing-marble': '墨流し', 'testimonials-noren': '暖簾', 'contact-seal': '落款',
  'colophon-emaki': '巻子',
};

function buildInfo(c: ChromeCtx, body: HTMLElement): void {
  const { s } = c;
  body.innerHTML =
    `<div class="info">` +
    `<section class="info__col"><h3>${s.frameTime}</h3>` +
    `<p class="info__big" data-i="fps">—</p>` +
    `<canvas class="info__graph" data-i="graph" aria-hidden="true"></canvas>` +
    `<p class="info__note" data-i="graphnote"></p></section>` +
    `<section class="info__col"><h3>${s.renderer}</h3><dl>` +
    `<dt>${s.calls}</dt><dd data-i="calls">—</dd><dt>${s.triangles}</dt><dd data-i="tris">—</dd>` +
    `<dt>${s.programs}</dt><dd data-i="progs">—</dd><dt>${s.textures}</dt><dd data-i="tex">—</dd>` +
    `<dt>${s.geometries}</dt><dd data-i="geo">—</dd><dt>${s.dpr}</dt><dd data-i="dpr">—</dd>` +
    `<dt>${s.tier}</dt><dd data-i="tier">—</dd><dt>${s.governor}</dt><dd data-i="gov">—</dd>` +
    `<dt>${s.live}</dt><dd data-i="live">—</dd><dt>${s.gpu}</dt><dd data-i="gpu">—</dd></dl></section>` +
    `<section class="info__col"><h3>${s.perView}</h3><ul class="info__views" data-i="views"></ul>` +
    `<h3>${s.film}</h3><dl><dt>${s.variant}</dt><dd data-i="fvar">—</dd><dt>${s.frame}</dt><dd data-i="fframe">—</dd>` +
    `<dt>${s.seek}</dt><dd data-i="fseek">—</dd></dl></section>` +
    `<section class="info__col"><h3>${s.page}</h3><dl><dt>${s.transferred}</dt><dd data-i="bytes">—</dd>` +
    `<dt>LCP</dt><dd data-i="lcp">—</dd><dt>INP</dt><dd data-i="inp">—</dd><dt>CLS</dt><dd data-i="cls">—</dd>` +
    `<dt>${s.heap}</dt><dd data-i="heap">—</dd></dl>` +
    `<h3>${s.edition}</h3><p class="info__note" data-i="edition"></p>` +
    (c.ctx.content.site.sampleNotice ? `<p class="info__note info__note--sample">${escHtml(c.ctx.i18n.t(c.ctx.content.site.sampleNoticeText))}</p>` : '') +
    `</section></div>`;
  const root = $<HTMLElement>('[data-status]');
  const [v, n] = (root?.dataset.edition ?? '1.1').split('.');
  const ed = $<HTMLElement>('[data-i="edition"]', body);
  if (ed) ed.textContent = `${fill(c.ctx.i18n.t(c.ctx.content.copy.colophon.editionPattern), { v: v ?? '1', n: n ?? '1' })} · v${typeof __HANMOTO_VERSION__ === 'string' ? __HANMOTO_VERSION__ : '0'}`;
}

function runInfo(c: ChromeCtx, body: HTMLElement): () => void {
  const { ctx, s } = c;
  const q = (k: string) => $<HTMLElement>(`[data-i="${k}"]`, body);
  const set = (k: string, v: string) => { const e = q(k); if (e && e.textContent !== v) e.textContent = v; };
  const samples: number[] = [];
  let lastDraw = 0;
  const graph = q('graph') as HTMLCanvasElement | null;

  const drawGraph = () => {
    if (!graph) return;
    const dpr = Math.min(2, devicePixelRatio || 1);
    const w = graph.clientWidth, hh = graph.clientHeight;
    if (!w) return;
    graph.width = Math.round(w * dpr); graph.height = Math.round(hh * dpr);
    const g = graph.getContext('2d');
    if (!g) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cs = getComputedStyle(document.documentElement);
    const col = (n: string) => cs.getPropertyValue(n).trim();
    const max = 50;                                    // ms at the top of the graph
    const y = (ms: number) => hh - 12 - (Math.min(ms, max) / max) * (hh - 16);
    g.fillStyle = col('--guide');
    for (const t of [0, 33.3]) g.fillRect(0, Math.round(y(t)), w, 1 / dpr);      // baseline and two frames
    // budget line (16.7 ms) in 朱, the designer's red note
    g.fillStyle = col('--instruct');
    g.fillRect(0, Math.round(y(16.7)), w, 1);
    g.font = `400 9px "Martian Mono", ${ctx.lang === 'zh' ? '"Noto Sans SC", "PingFang SC"' : '"IBM Plex Sans JP", "Hiragino Sans"'}, ui-monospace, monospace`;
    g.fillStyle = col('--instruct-text');
    g.fillText(`${s.budget} 16.7 ms`, 4, y(16.7) - 4);
    g.fillStyle = col('--ink-2');
    g.fillText('0', w - 10, hh - 2);
    // bars: one per frame, right-aligned
    const bw = w / 120;
    const ink = col('--ink');
    const over = col('--select');
    samples.forEach((ms, i) => {
      const x = w - (samples.length - i) * bw;
      g.fillStyle = ms > 16.7 * 1.5 ? over : ink;
      const top = y(ms);
      g.fillRect(x, top, Math.max(1, bw - 0.5), hh - 12 - top);
    });
    // render on demand: at rest the clock stops, so say so instead of showing an empty graph
    if (performance.now() - lastSample > 1200) {
      g.fillStyle = col('--ink-2');
      g.fillText(s.notDrawing, 4, hh - 18);
    }
  };

  let lastSample = 0;
  const offFrame = frame.add((_t, dt) => {
    // the first tick after a rest carries the whole idle gap: that is not a slow frame
    if (dt > 0 && dt < 250) {
      samples.push(dt);
      if (samples.length > 120) samples.shift();
      lastSample = performance.now();
    }
    const now = performance.now();
    if (now - lastDraw > 250) { lastDraw = now; drawGraph(); }
    return false;
  });

  const kb = (b: number) => (b > 1e6 ? `${(b / 1e6).toFixed(2)} MB` : `${Math.round(b / 1024)} KB`);
  const paintPage = () => {
    set('bytes', kb(ctx.perf.bytes()));
    const vt = ctx.perf.vitals();
    set('lcp', vt.lcp !== undefined ? `${(vt.lcp / 1000).toFixed(2)} s` : '—');
    set('inp', vt.inp !== undefined ? `${Math.round(vt.inp)} ms` : '—');
    set('cls', vt.cls !== undefined ? String(vt.cls) : '—');
    const mem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
    set('heap', mem ? kb(mem.usedJSHeapSize) : s.unavailable);
    // film: the player's plan names the variant and tier (the film may play from a blob: URL, so the
    // element's src is not enough); else match the video's source; frame = currentTime × fps
    const video = document.querySelector<HTMLVideoElement>('#road video');
    const variants = ctx.assets.film.variants as unknown as Record<string, { src: string; fps: number; frames: number }>;
    const plan = debugFilm.plan as { tier?: string; variant?: string | null } | null;
    let vname: string | null = plan?.variant && variants[plan.variant] ? plan.variant : null;
    if (!vname && video?.currentSrc) {
      vname = Object.keys(variants).find((k) => video.currentSrc.endsWith(variants[k]!.src.split('/').pop() ?? '\u0000')) ?? null;
    }
    const tierNote = plan?.tier && plan.tier !== 'video' ? plan.tier : '';
    set('fvar', vname ? (tierNote ? `${vname} · ${tierNote}` : vname) : (plan?.tier ?? s.none));
    const fv = vname ? variants[vname] : undefined;
    if (fv && video && video.readyState >= 1 && (!tierNote || tierNote === 'video')) {
      set('fframe', `f ${Math.min(fv.frames - 1, Math.round(video.currentTime * fv.fps))}/${fv.frames}`);
    } else set('fframe', '—');
    const seeks = debugFilm.seeks.filter((x) => Number.isFinite(x));
    if (seeks.length) {
      const sorted = [...seeks].sort((a, b) => a - b);
      const mean = seeks.reduce((a, b) => a + b, 0) / seeks.length;
      const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))]!;
      set('fseek', `${mean.toFixed(1)} / ${p95.toFixed(1)} ms (n ${seeks.length})`);
    } else set('fseek', '—');
  };

  const views = q('views');
  const paintStage = () => {
    const st = c.stage;
    if (!st) {
      set('fps', '—');
      set('graphnote', ctx.tier.current.name === 'static' ? `${TIER_LABEL.static} · ${s.qStatic}` : s.notDrawing);
      ['calls', 'tris', 'progs', 'tex', 'geo', 'gov', 'live', 'gpu'].forEach((k) => set(k, '—'));
      set('dpr', String(Math.round((devicePixelRatio || 1) * 100) / 100));
      set('tier', `${TIER_LABEL[ctx.tier.current.name]} ${ctx.tier.current.name}`);
      return;
    }
    const x = st.stats();
    const fpsEl = q('fps');
    if (fpsEl) fpsEl.innerHTML = `${x.fps}<small>${s.fps}</small> ${x.frameMs.toFixed(1)}<small>ms</small>`;
    set('graphnote', `${s.governor}: ${x.governor || '—'}`);
    set('calls', String(x.calls)); set('tris', x.triangles.toLocaleString(ctx.lang === 'en' ? 'en-US' : ctx.lang === 'zh' ? 'zh-CN' : 'ja-JP'));
    set('progs', String(x.programs)); set('tex', String(x.textures)); set('geo', String(x.geometries));
    set('dpr', String(Math.round(x.dpr * 100) / 100));
    set('tier', `${TIER_LABEL[x.tier as TierName] ?? ''} ${x.tier}`);
    set('gov', x.governor || '—');
    set('live', x.live.length ? x.live.join(', ') : s.none);
    set('gpu', x.gpu || s.unavailable);
    if (views) {
      const list = st.views ?? [];
      const total = Object.values(x.perViewMs).reduce((a, b) => a + b, 0);
      const html = list.map((vw) => {
        const ms = x.perViewMs[vw.id] ?? 0;
        const live = x.live.includes(vw.id);
        const term = vw.printName || PRINT_TERMS[vw.id] || vw.id;
        return `<li${live ? ' data-live' : ''}><b lang="ja">${escHtml(term)}</b><span>${escHtml(vw.id)}</span><span class="mono">${ms.toFixed(2)} ms${total > 0 ? ` · ${Math.round((ms / total) * 100)}%` : ''}</span></li>`;
      }).join('') || `<li><b></b><span>${s.none}</span><span></span></li>`;
      if (views.dataset.html !== html) { views.innerHTML = html; views.dataset.html = html; }
    }
  };

  paintStage(); paintPage(); drawGraph();
  const offStats = c.stage?.onStats(() => paintStage()) ?? (() => undefined);
  let timer: ReturnType<typeof setTimeout> | null = null;
  const tick = () => { paintPage(); paintStage(); drawGraph(); timer = setTimeout(tick, 1000); };
  timer = setTimeout(tick, 1000);
  return () => { offFrame(); offStats(); if (timer) clearTimeout(timer); };
}

/* =========================================================================== Glossary */
function buildGlossary(c: ChromeCtx, body: HTMLElement): void {
  const { ctx, s } = c;
  const L = ctx.lang;
  const items = ctx.content.glossary.map((g) => {
    const name = L === 'ja' ? '' : L === 'en' ? g.en : g.zh;
    // the Japanese term always carries its reading (ruby) — in en / zh pages too, marked lang="ja"
    const term = `<b${L === 'ja' ? '' : ' lang="ja"'}><ruby>${escHtml(g.term)}<rt>${escHtml(g.ruby)}</rt></ruby></b>`;
    const key = `${g.term} ${g.ruby} ${g.en} ${g.zh} ${ctx.i18n.t(g.gloss)}`.toLowerCase();
    return `<div data-key="${escHtml(key)}"><dt>${term}${name ? `<span>${escHtml(name)}</span>` : ''}</dt><dd>${escHtml(ctx.i18n.t(g.gloss))}</dd></div>`;
  }).join('');
  body.innerHTML = `<div class="glossary__filter"><input type="search" aria-label="${escHtml(s.glossaryFilter)}" placeholder="${escHtml(s.glossaryFilter)}"><span class="info__note" data-g-empty hidden>${s.glossaryEmpty}</span></div><dl class="glossary">${items}</dl>`;
  const input = $<HTMLInputElement>('input', body)!;
  const empty = $<HTMLElement>('[data-g-empty]', body)!;
  input.addEventListener('input', () => {
    const v = input.value.trim().toLowerCase();
    let shown = 0;
    $$<HTMLElement>('.glossary > div', body).forEach((d) => { const on = !v || (d.dataset.key ?? '').includes(v); d.hidden = !on; if (on) shown++; });
    empty.hidden = shown > 0;
  });
}

/* =========================================================================== Settings */
type Opt = { v: string; label: string };
function radios(name: string, label: string, opts: Opt[], note = ''): string {
  return `<div class="setting" data-setting="${name}"><span class="setting__label" id="set-${name}">${escHtml(label)}</span>` +
    `<div class="seg" role="radiogroup" aria-labelledby="set-${name}">` +
    opts.map((o) => `<button type="button" role="radio" aria-checked="false" data-v="${o.v}">${escHtml(o.label)}</button>`).join('') +
    `</div>${note ? `<span class="setting__note">${escHtml(note)}</span>` : ''}</div>`;
}

let ctxRef: ChromeCtx | null = null;
function buildSettings(c: ChromeCtx, body: HTMLElement): void {
  ctxRef = c;
  const { s, ctx } = c;
  const onOff: Opt[] = [{ v: 'on', label: s.on }, { v: 'off', label: s.off }];
  body.innerHTML = `<div class="settings">` +
    radios('theme', s.sTheme, [{ v: 'auto', label: s.auto }, { v: 'light', label: s.day }, { v: 'dark', label: s.night }]) +
    radios('motion', s.sMotion, onOff) +
    radios('quality', s.sQuality, [{ v: 'auto', label: s.qAuto }, { v: 'high', label: s.qHigh }, { v: 'medium', label: s.qMedium }, { v: 'low', label: s.qLow }, { v: 'static', label: s.qStatic }], s.reload) +
    (ctx.page === 'main' ? radios('proof', s.sProof, onOff, s.reload) : '') +
    radios('rulers', s.sRulers, onOff) +
    radios('outline', s.sOutline, onOff) +
    radios('shortcuts', s.sShortcuts, onOff) +
    `<div class="setting"><span class="setting__label">${s.keysTitle}</span><div class="keys">${s.keys.map(([k, d]) => `<kbd>${escHtml(k)}</kbd><span>${escHtml(d)}</span>`).join('')}</div></div>` +
    `</div>`;
  $$<HTMLElement>('[data-setting]', body).forEach((group) => {
    const name = group.dataset.setting!;
    const btns = $$<HTMLButtonElement>('[role="radio"]', group);
    btns.forEach((b, i) => {
      b.addEventListener('click', () => { apply(name, b.dataset.v!); syncSettings(body); });
      b.addEventListener('keydown', (e) => {
        let j = -1;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % btns.length;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + btns.length) % btns.length;
        if (j < 0) return;
        e.preventDefault();
        btns[j]!.focus();
        btns[j]!.click();
      });
    });
  });
}

function current(name: string): string {
  const c = ctxRef!;
  switch (name) {
    case 'theme': return c.ctx.theme.pref;
    case 'motion': return motionLayerOn() ? 'on' : 'off';
    case 'quality': {
      let q: string | null = null;
      try { q = new URLSearchParams(location.search).get('tier'); } catch { /* ignore */ }
      return q ?? local.get('hanmoto.tier') ?? 'auto';
    }
    case 'proof': return c.ctx.proof ? 'on' : 'off';
    case 'rulers': return hooks.rulers?.visible === false ? 'off' : 'on';
    case 'outline': return document.documentElement.dataset.view === 'outline' ? 'on' : 'off';
    case 'shortcuts': return local.get('hanmoto.shortcuts') === 'off' ? 'off' : 'on';
    default: return '';
  }
}

function apply(name: string, v: string): void {
  const c = ctxRef!;
  const url = new URL(location.href);
  switch (name) {
    case 'theme': c.ctx.theme.set(v as ThemePref); break;
    case 'motion': setMotionLayer(v === 'on'); break;
    case 'quality': {
      // the tier is detected once at boot: a new choice reloads with ?tier= (and is remembered for later visits)
      const prev = current('quality');
      if (v === 'auto') { local.set('hanmoto.tier', null); url.searchParams.delete('tier'); }
      else { local.set('hanmoto.tier', v); url.searchParams.set('tier', v); }
      if (v !== prev) location.href = url.href;
      break;
    }
    case 'proof':
      if ((v === 'on') !== c.ctx.proof) {
        if (v === 'on') url.searchParams.set('proof', '1'); else url.searchParams.delete('proof');
        location.href = url.href;
      }
      break;
    case 'rulers': hooks.rulers?.setVisible(v === 'on'); break;
    case 'outline': hooks.outline?.(v === 'on'); break;
    case 'shortcuts': local.set('hanmoto.shortcuts', v === 'off' ? 'off' : null); break;
  }
}

function syncSettings(body: HTMLElement): void {
  $$<HTMLElement>('[data-setting]', body).forEach((group) => {
    const cur = current(group.dataset.setting!);
    $$<HTMLButtonElement>('[role="radio"]', group).forEach((b) => {
      const on = b.dataset.v === cur;
      b.setAttribute('aria-checked', String(on));
      b.tabIndex = on ? 0 : -1;
    });
  });
}

