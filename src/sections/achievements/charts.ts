/**
 * 砂子 chart geometry (DESIGN §6.7). Owner: WP-09. Pure and Node-safe: render.ts draws the DOM SVG axes, ticks,
 * values and the static-tier gold hatching from it; view.ts rasterises the same shapes into the glue mask, so
 * the gold dust settles exactly under the DOM axes.
 */
import type { Chart } from '../../content/types';

export const VB = { w: 320, h: 200 } as const;
export const PLOT = { x0: 30, x1: 314, y0: 26, y1: 164 } as const;
/** Line chart: glue stroke width (viewBox units). */
export const LINE_W = 7;

export interface ChartGeom {
  yMax: number;
  ticks: number[];
  bars: { x: number; y: number; w: number; h: number; cx: number; v: number; label: string; sub?: string }[];
  points: { x: number; y: number; v: number; label: string; sub?: string }[];
  kind: 'bars' | 'line';
}

function niceMax(v: number): { max: number; step: number } {
  const steps = [5, 10, 20, 25, 50, 100, 200, 250, 500];
  for (const s of steps) {
    const max = Math.ceil(v / s) * s;
    if (max / s <= 4 && max >= v * 1.04) return { max, step: s };
  }
  return { max: Math.ceil(v / 100) * 100, step: 100 };
}

export function chartGeom(ch: Chart): ChartGeom {
  const vmax = Math.max(...ch.series.map((p) => p.y));
  const { max, step } = niceMax(vmax);
  const ticks: number[] = [];
  for (let t = 0; t <= max + 1e-6; t += step) ticks.push(t);
  const n = ch.series.length;
  const pitch = (PLOT.x1 - PLOT.x0) / n;
  const yOf = (v: number) => PLOT.y1 - (v / max) * (PLOT.y1 - PLOT.y0);
  const label = (x: string, i: number): { label: string; sub?: string } => {
    const q = /^(\d{4})-(Q\d)$/.exec(x);
    if (q) {
      const prev = i > 0 ? /^(\d{4})/.exec(ch.series[i - 1]!.x)?.[1] : undefined;
      return { label: q[2]!, sub: prev === q[1] ? undefined : q[1] };
    }
    return { label: n > 6 ? `’${x.slice(2)}` : x };
  };
  const bars: ChartGeom['bars'] = [];
  const points: ChartGeom['points'] = [];
  ch.series.forEach((p, i) => {
    const cx = PLOT.x0 + pitch * (i + 0.5);
    const lb = label(p.x, i);
    if (ch.kind === 'bars') {
      const w = pitch * 0.58;
      const y = yOf(p.y);
      bars.push({ x: cx - w / 2, y, w, h: PLOT.y1 - y, cx, v: p.y, ...lb });
    } else {
      points.push({ x: cx, y: yOf(p.y), v: p.y, ...lb });
    }
  });
  return { yMax: max, ticks, bars, points, kind: ch.kind };
}
