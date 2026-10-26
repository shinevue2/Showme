/**
 * Rulers (DESIGN §4.1 "Rulers", §4.2 progress ruler). Owner: WP-04.
 *
 * Two 2D canvases (top 20 px under the bar; left 20 px on desktops; top 16 px only on tablets). Origin = the
 * active artboard's top-left (Illustrator CS5+). Units follow the artboard:
 *   cover 寸 (the ōban sheet ≈ 1 尺 3 寸 tall) · summary px · road years 2018 → 2026 right to left while the
 *   film plays (the film calls ctx.chrome.setRulerYears(p)) · works 尺 (the screen is 5 尺 tall) · skills 寸
 *   with the 裏目 √2 scale of the carpenter's square · principles 間 (the garden artboard is 12 間 wide) ·
 *   achievements / writing / testimonials px · contact 里, reading 百二十六里 at the Kyoto print · colophon mm.
 * Redrawn only while scrolling, while the pointer moves or when something changes, coalesced to one draw per
 * frame through core/frame (never its own rAF loop). Martian Mono's wdth follows scroll velocity (75 at rest
 * → 112.5 when fast), updated at ≤ 10 Hz. Phones get a 2 px progress ruler in the active layer colour.
 */
import type { AppContext, SectionId } from '../core/types';
import { $, coalesce, mq } from './util';
import type { ChromeStrings } from './strings';

type Unit = 'px' | 'mm' | 'sun' | 'shaku' | 'ken' | 'ri' | 'year';
const SECTION_UNIT: Record<SectionId, Unit> = {
  cover: 'sun', summary: 'px', road: 'px', works: 'shaku', skills: 'sun', principles: 'ken',
  achievements: 'px', writing: 'px', testimonials: 'px', contact: 'ri', colophon: 'mm',
};
const CSS_PX_PER_MM = 96 / 25.4;
const SUN_PX = 30.303 * CSS_PX_PER_MM;          // 1 寸 = 1/33 m
const SHAKU_PX = SUN_PX * 10;

interface Scale { unit: Unit; ppu: number; ox: number; oy: number; dirX: 1 | -1; special?: { value: number; label: string } }
interface Steps { major: number; minor: number; mid: number }

const MAJORS: Record<Unit, number[]> = {
  px: [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000],
  mm: [5, 10, 20, 50, 100, 200, 500, 1000],
  sun: [1, 2, 5, 10, 20, 50, 100],
  shaku: [1, 2, 5, 10, 20, 50],
  ken: [1, 2, 5, 10, 20, 50],
  ri: [1, 2, 5, 10, 20, 50, 100],
  year: [1],
};

function steps(unit: Unit, ppu: number, minGap: number): Steps {
  const a = Math.abs(ppu);
  const majors = MAJORS[unit];
  const major = majors.find((m) => m * a >= minGap) ?? majors[majors.length - 1]!;
  const divs = unit === 'ken' && major === 1 ? [6, 3, 2] : unit === 'year' ? [12, 4, 2] : [10, 5, 2];
  const d = divs.find((k) => (major / k) * a >= 4) ?? 1;
  const mid = d === 10 ? major / 2 : d === 12 ? major / 4 : d === 6 ? major / 2 : major;
  return { major, minor: major / d, mid };
}

export interface RulersAPI {
  setYears(p: number | null): void;
  setExtent(r: { left: number; top: number; right: number; bottom: number } | null): void;
  pointer(): { x: number; y: number } | null;
  /** Pointer position relative to the active artboard (px), for the status bar. */
  artboardXY(): { x: number; y: number } | null;
  setVisible(v: boolean): void;
  readonly visible: boolean;
  refresh(): void;
  onDraw(cb: () => void): void;
}

export function mountRulers(ctx: AppContext, s: ChromeStrings): RulersAPI {
  const root = $<HTMLElement>('[data-rulers]');
  const top = $<HTMLCanvasElement>('.ruler--top', root ?? document);
  const left = $<HTMLCanvasElement>('.ruler--left', root ?? document);
  const prog = $<HTMLElement>('.progress-ruler');
  const html = document.documentElement;
  let years: number | null = null;
  let extent: { left: number; top: number; right: number; bottom: number } | null = null;
  let ptr: { x: number; y: number } | null = null;
  let visible = true;
  let wdth = 75;
  let colors = readColors();
  let docH = 0;
  let lastArt: DOMRect | null = null;
  const drawCbs: (() => void)[] = [];
  const isCase = ctx.page === 'case';
  const cjk = ctx.lang === 'zh' ? '"Noto Sans SC", "PingFang SC"' : '"IBM Plex Sans JP", "Hiragino Sans"';

  function readColors() {
    const cs = getComputedStyle(html);
    const v = (n: string) => cs.getPropertyValue(n).trim() || '#000';
    return { panel: v('--panel'), board: v('--pasteboard'), tick: v('--ink-2'), rule: v('--rule'), select: v('--select'), guide: v('--guide'), label: v('--guide-label'), ink: v('--ink'), selText: v('--select-text') };
  }

  function activeEl(): HTMLElement | null {
    if (isCase) return $('[data-case-page]');
    const id = ctx.scroll.active;
    return document.getElementById(id) ?? $(`[data-section="${id}"]`);
  }

  function scaleFor(id: SectionId | 'case', art: DOMRect): Scale {
    if (id === 'case') return { unit: 'px', ppu: 1, ox: art.left, oy: art.top, dirX: 1 };
    const unit = SECTION_UNIT[id];
    const base = { ox: art.left, oy: art.top, dirX: 1 as 1 | -1 };
    switch (unit) {
      case 'mm': return { unit, ppu: CSS_PX_PER_MM, ...base };
      case 'sun': {
        if (id === 'cover') {
          const sheet = $<HTMLElement>('#cover .cover__sheet') ?? $<HTMLElement>('#cover [class*="sheet"]');
          const h = sheet?.offsetHeight ?? 0;
          return { unit, ppu: h > 160 ? h / 13 : SUN_PX, ...base };
        }
        return { unit, ppu: SUN_PX, ...base };
      }
      case 'shaku': {
        const v = $<HTMLElement>('[data-view-id="works-byobu"]');
        const h = v?.offsetHeight ?? 0;
        return { unit, ppu: h > 200 ? h / 5 : SHAKU_PX / 4, ...base };
      }
      case 'ken': return { unit, ppu: art.width / 12, ...base };
      case 'ri': {
        // Edo at the artboard's right edge, Kyoto (126 里) at the 京師 print; right to left like the road
        const fig = $<HTMLElement>('#contact [data-handoff="kyoto"]');
        let ppu = art.width / 126;
        if (fig) {
          const fr = fig.getBoundingClientRect();
          const d = art.right - (fr.left + fr.width / 2);
          if (d / 126 > 1.6) ppu = d / 126;
        }
        return { unit, ppu, ox: art.right, oy: art.top, dirX: -1, special: { value: 126, label: s.ri126 } };
      }
      default: return { unit: 'px', ppu: 1, ...base };
    }
  }

  const unitLabel = (u: Unit) => s.units[u];
  const fmt = (v: number, u: Unit) => {
    const r = Math.round(v * 1000) / 1000;
    if (u === 'px' || u === 'mm' || u === 'ri') return String(Math.round(r));
    return Number.isInteger(r) ? String(r) : r.toFixed(1);
  };
  const stretchKw = () => (wdth < 81 ? 'condensed' : wdth < 94 ? 'semi-condensed' : wdth < 106 ? 'normal' : 'semi-expanded');

  function prep(c: HTMLCanvasElement): CanvasRenderingContext2D | null {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = c.clientWidth, hh = c.clientHeight;
    if (!w || !hh) return null;
    const W = Math.round(w * dpr), H = Math.round(hh * dpr);
    if (c.width !== W) c.width = W;
    if (c.height !== H) c.height = H;
    const g = c.getContext('2d');
    if (!g) return null;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, hh);
    const kw = stretchKw();
    g.font = `${kw} 400 9px "Martian Mono", ${cjk}, ui-monospace, monospace`;
    try { (g as CanvasRenderingContext2D & { fontStretch?: string }).fontStretch = kw; } catch { /* older engines */ }
    g.textBaseline = 'top';
    return g;
  }
  const px1 = (v: number) => { const d = Math.min(2, window.devicePixelRatio || 1); return Math.round(v * d) / d; };

  /** Horizontal ruler along x (viewport coordinates) or vertical along y. */
  function drawLinear(g: CanvasRenderingContext2D, len: number, thick: number, offset: number, sc: { ppu: number; o: number; dir: 1 | -1; unit: Unit; special?: Scale['special'] }, vertical: boolean, artA: number, artB: number, extentA: number | null, extentB: number | null, pointerAt: number | null, urame: boolean) {
    // ground: panel inside the artboard, pasteboard outside
    g.fillStyle = colors.board;
    g.fillRect(0, 0, vertical ? thick : len, vertical ? len : thick);
    g.fillStyle = colors.panel;
    const a = Math.max(0, artA - offset), b = Math.min(len, artB - offset);
    if (b > a) { if (vertical) g.fillRect(0, a, thick, b - a); else g.fillRect(a, 0, b - a, thick); }
    // edge rule
    g.fillStyle = colors.rule;
    if (vertical) g.fillRect(thick - 1, 0, 1, len); else g.fillRect(0, thick - 1, len, 1);

    const st = steps(sc.unit, sc.ppu, vertical ? 48 : 56);
    const ppu = sc.ppu * sc.dir;
    const v0 = ((offset - sc.o) / ppu), v1 = ((offset + len - sc.o) / ppu);
    const lo = Math.min(v0, v1), hi = Math.max(v0, v1);
    const first = Math.floor(lo / st.minor) * st.minor;
    g.fillStyle = colors.tick;
    const eps = 1e-6;
    const labels: [number, string][] = [];
    for (let v = first, i = 0; v <= hi + eps && i < 2000; v += st.minor, i++) {
      const vv = Math.round(v / st.minor) * st.minor;
      const p = sc.o + vv * ppu - offset;
      const isMajor = Math.abs(vv / st.major - Math.round(vv / st.major)) < eps;
      const isMid = !isMajor && Math.abs(vv / st.mid - Math.round(vv / st.mid)) < eps;
      const l = isMajor ? thick - 2 : isMid ? Math.round(thick * 0.42) : Math.round(thick * 0.24);
      const q = px1(p);
      if (vertical) g.fillRect(thick - 1 - l, q, l, 1); else g.fillRect(q, thick - 1 - l, 1, l);
      if (isMajor) labels.push([q, vv === 0 ? `0 ${unitLabel(sc.unit)}` : fmt(Math.abs(vv), sc.unit)]);
    }
    // 裏目 (√2) secondary scale of the carpenter's square: short ticks along the outer edge
    if (urame) {
      const up = ppu * Math.SQRT2;
      const f2 = Math.floor(Math.min((offset - sc.o) / up, (offset + len - sc.o) / up));
      const l2 = Math.max((offset - sc.o) / up, (offset + len - sc.o) / up);
      g.fillStyle = colors.guide;
      for (let v = f2; v <= l2 + eps; v += 0.5) {
        const q = px1(sc.o + v * up - offset);
        const whole = Math.abs(v - Math.round(v)) < eps;
        const l = whole ? 5 : 3;
        if (vertical) g.fillRect(0, q, l, 1); else g.fillRect(q, 0, 1, l);
      }
      if (!vertical) { g.fillStyle = colors.label; g.fillText(s.urame, Math.max(4, sc.o - offset + 4), 1); }
    }
    g.fillStyle = colors.tick;
    for (const [q, text] of labels) {
      if (vertical) {
        g.save(); g.translate(2, q - 3); g.rotate(-Math.PI / 2); g.textAlign = 'right'; g.fillText(text, 0, 0); g.restore();
      } else g.fillText(text, q + 3, 2);
    }
    // special reading (百二十六里 at the Kyoto print)
    if (sc.special && !vertical) {
      const q = px1(sc.o + sc.special.value * ppu - offset);
      if (q > -40 && q < len + 40) {
        g.fillStyle = colors.label;
        g.fillRect(q, 0, 1, thick);
        const w = g.measureText(sc.special.label).width;
        g.fillStyle = colors.panel;
        g.fillRect(q - w - 7, 1, w + 6, thick - 3);
        g.fillStyle = colors.label;
        g.textAlign = 'right';
        g.fillText(sc.special.label, q - 4, 2);
        g.textAlign = 'left';
      }
    }
    // selection extent (Illustrator draws the selected object's bounds on the ruler)
    if (extentA !== null && extentB !== null) {
      g.fillStyle = colors.select;
      const ea = extentA - offset, eb = extentB - offset;
      if (vertical) g.fillRect(thick - 3, ea, 2, eb - ea); else g.fillRect(ea, thick - 3, eb - ea, 2);
    }
    // pointer marker
    if (pointerAt !== null) {
      const q = px1(pointerAt - offset);
      g.fillStyle = colors.select;
      if (vertical) g.fillRect(0, q, thick, 1); else g.fillRect(q, 0, 1, thick);
    }
  }

  function drawYears(g: CanvasRenderingContext2D, len: number, thick: number, p: number) {
    g.fillStyle = colors.panel;
    g.fillRect(0, 0, len, thick);
    g.fillStyle = colors.rule;
    g.fillRect(0, thick - 1, len, 1);
    const m = 36, span = len - 2 * m;
    const x = (yr: number) => len - m - ((yr - 2018) / 8) * span;      // right → left, Edo → Kyoto
    for (let q = 0; q <= 8 * 12; q++) {
      const yr = 2018 + q / 12;
      const major = q % 12 === 0, mid = q % 3 === 0;
      const l = major ? thick - 2 : mid ? Math.round(thick * 0.42) : Math.round(thick * 0.22);
      g.fillStyle = colors.tick;
      g.fillRect(px1(x(yr)), thick - 1 - l, 1, l);
      if (major) {
        const label = String(2018 + q / 12);
        g.textAlign = 'right';
        g.fillText(label, px1(x(yr)) - 3, 2);
        g.textAlign = 'left';
      }
    }
    // the film's position: a 躑躅 marker with the current year
    const yr = 2018 + Math.max(0, Math.min(1, p)) * 8;
    const q = px1(x(yr));
    g.fillStyle = colors.select;
    g.fillRect(q - 0.5, 0, 2, thick);
    g.beginPath(); g.moveTo(q - 4, 0); g.lineTo(q + 5, 0); g.lineTo(q + 0.5, 5); g.closePath(); g.fill();
    // unit at the start of the road (the right end, where 2018 sits), clear of the 2026 label on the left
    g.fillStyle = colors.label;
    g.textAlign = 'right';
    g.fillText(unitLabel('year'), len - 6, 2);
    g.textAlign = 'left';
  }

  const draw = coalesce(() => {
    if (!visible || mq.mobile.matches) { updateProgress(); return; }
    const el = activeEl();
    if (!el || !top) return;
    const art = el.getBoundingClientRect();
    lastArt = art;
    const id: SectionId | 'case' = isCase ? 'case' : (el.dataset.section as SectionId) ?? 'cover';
    const sc = scaleFor(id, art);
    const rulerW = mq.desktop.matches ? 20 : 0;
    const gt = prep(top);
    if (gt) {
      const len = top.clientWidth, thick = top.clientHeight;
      const unitNow = years !== null && id === 'road' ? 'year' : sc.unit;
      if (root && root.dataset.unit !== unitNow) root.dataset.unit = unitNow;
      if (years !== null && id === 'road') drawYears(gt, len, thick, years);
      else drawLinear(gt, len, thick, rulerW, { ppu: sc.ppu, o: sc.ox, dir: sc.dirX, unit: sc.unit, special: sc.special }, false,
        art.left, art.right, extent ? extent.left : null, extent ? extent.right : null, ptr ? ptr.x : null, id === 'skills');
    }
    if (left && rulerW) {
      const gl = prep(left);
      if (gl) {
        const len = left.clientHeight, thick = left.clientWidth;
        const off = left.getBoundingClientRect().top;
        drawLinear(gl, len, thick, off, { ppu: sc.ppu, o: sc.oy, dir: 1, unit: sc.unit }, true,
          art.top, art.bottom, extent ? extent.top : null, extent ? extent.bottom : null, ptr ? ptr.y : null, false);
      }
    }
    for (const cb of drawCbs) cb();
  });

  function updateProgress() {
    if (!prog || !mq.mobile.matches) return;
    if (!docH) docH = document.documentElement.scrollHeight - innerHeight;
    const p = docH > 0 ? Math.min(1, Math.max(0, scrollY / docH)) : 0;
    prog.style.setProperty('--progress', p.toFixed(4));
  }

  // velocity → Martian Mono wdth (≤ 10 Hz), back to 75 at rest
  let lastW = 0;
  let restTimer: ReturnType<typeof setTimeout> | null = null;
  const setW = (w: number) => {
    if (Math.abs(w - wdth) < 2) return;
    wdth = w;
    const v = String(Math.round(w * 10) / 10);
    root?.style.setProperty('--mono-wdth', v);
    $<HTMLElement>('[data-status]')?.style.setProperty('--mono-wdth', v);
  };
  const onScroll = () => {
    draw();
    if (mq.mobile.matches) updateProgress();
    if (!ctx.motion.enabled) return;
    const now = performance.now();
    if (now - lastW >= 100) {
      lastW = now;
      const v = Math.abs(ctx.scroll.velocity);
      setW(75 + 37.5 * Math.min(1, v / 2600));
    }
    if (restTimer) clearTimeout(restTimer);
    restTimer = setTimeout(() => { setW(75); draw(); }, 180);
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { docH = 0; draw(); }, { passive: true });
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    ptr = { x: e.clientX, y: e.clientY };
    draw();
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { ptr = null; draw(); });
  ctx.scroll.onActive(() => draw());
  ctx.theme.on(() => { requestAnimationFrame(() => { colors = readColors(); draw(); }); });
  // the View-Transition theme swap flips data-theme inside its callback: re-read colours when it lands
  new MutationObserver(() => { colors = readColors(); draw(); }).observe(html, { attributes: true, attributeFilter: ['data-theme'] });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { colors = readColors(); draw(); });
  mq.mobile.addEventListener('change', () => { docH = 0; draw(); });
  document.fonts?.ready.then(() => draw()).catch(() => undefined);
  draw();
  updateProgress();

  return {
    setYears(p) { years = p; draw(); },
    setExtent(r) { extent = r; draw(); },
    pointer: () => ptr,
    artboardXY() {
      if (!ptr || !lastArt) return null;
      return { x: Math.round(ptr.x - lastArt.left), y: Math.round(ptr.y - lastArt.top) };
    },
    setVisible(v) {
      visible = v;
      if (v) delete html.dataset.rulers; else html.dataset.rulers = 'off';
      draw();
    },
    get visible() { return visible; },
    refresh() { docH = 0; colors = readColors(); draw(); },
    onDraw(cb) { drawCbs.push(cb); },
  };
}

