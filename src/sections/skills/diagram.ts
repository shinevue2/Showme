/**
 * Skills — stack diagram data (DESIGN §6.5 "Stack diagram data", §12 #24). Owner: WP-08. Pure and Node-safe.
 *
 * The request path drawn across the shoji frame: request → edge (Envoy) → Go services (gRPC) → Kafka →
 * read models (PostgreSQL, ClickHouse), with observability (OpenTelemetry, Prometheus) tapping every stage.
 * Coordinates are lattice pitches in frame space (origin top-left, y down) for the two shoji layouts, so the
 * DOM SVG (render.ts), the kumiko strips' diagram targets and their planar shadow (view.ts) share one geometry.
 */
import { DESKTOP, MOBILE, type Layout } from './shoji';

export type DiagramRole = 'request' | 'edge' | 'services' | 'events' | 'readModel' | 'observability';
export interface Box { id: string; x: number; y: number; w: number; h: number; toolIds: readonly string[]; role: DiagramRole }
export interface Edge { pts: readonly [number, number][]; dashed?: boolean; arrow?: boolean }
export interface Diagram { layout: Layout; boxes: readonly Box[]; edges: readonly Edge[]; request: { x: number; y: number; anchor: 'start' | 'middle' } }

const desktop: Diagram = {
  layout: DESKTOP,
  boxes: [
    { id: 'edge', x: 3.6, y: 4.6, w: 4.8, h: 4.0, toolIds: ['envoy'], role: 'edge' },
    { id: 'services', x: 10.6, y: 4.6, w: 5.6, h: 4.0, toolIds: ['go', 'grpc'], role: 'services' },
    { id: 'kafka', x: 18.4, y: 4.6, w: 3.8, h: 4.0, toolIds: ['kafka'], role: 'events' },
    { id: 'postgres', x: 23.6, y: 2.2, w: 4.8, h: 3.2, toolIds: ['postgres'], role: 'readModel' },
    { id: 'clickhouse', x: 23.6, y: 7.8, w: 4.8, h: 3.2, toolIds: ['clickhouse'], role: 'readModel' },
    { id: 'obs', x: 3.6, y: 13.0, w: 24.4, h: 4.0, toolIds: ['otel', 'prom'], role: 'observability' },
  ],
  edges: [
    { pts: [[1.1, 6.6], [3.6, 6.6]], arrow: true },
    { pts: [[8.4, 6.6], [10.6, 6.6]], arrow: true },
    { pts: [[16.2, 6.6], [18.4, 6.6]], arrow: true },
    { pts: [[22.2, 5.6], [22.9, 5.6], [22.9, 3.8], [23.6, 3.8]], arrow: true },
    { pts: [[22.2, 7.6], [22.9, 7.6], [22.9, 9.4], [23.6, 9.4]], arrow: true },
    { pts: [[6.0, 8.6], [6.0, 13.0]], dashed: true, arrow: true },
    { pts: [[13.4, 8.6], [13.4, 13.0]], dashed: true, arrow: true },
    { pts: [[20.3, 8.6], [20.3, 13.0]], dashed: true, arrow: true },
    { pts: [[26.0, 11.0], [26.0, 13.0]], dashed: true, arrow: true },
  ],
  request: { x: 1.1, y: 5.9, anchor: 'start' },
};

const mobile: Diagram = {
  layout: MOBILE,
  boxes: [
    { id: 'edge', x: 2.2, y: 3.4, w: 8.4, h: 3.4, toolIds: ['envoy'], role: 'edge' },
    { id: 'services', x: 2.2, y: 9.2, w: 8.4, h: 3.4, toolIds: ['go', 'grpc'], role: 'services' },
    { id: 'kafka', x: 2.2, y: 15.0, w: 8.4, h: 3.4, toolIds: ['kafka'], role: 'events' },
    { id: 'postgres', x: 1.4, y: 21.4, w: 4.6, h: 3.4, toolIds: ['postgres'], role: 'readModel' },
    { id: 'clickhouse', x: 6.8, y: 21.4, w: 4.6, h: 3.4, toolIds: ['clickhouse'], role: 'readModel' },
    { id: 'obs', x: 13.0, y: 3.4, w: 5.4, h: 21.4, toolIds: ['otel', 'prom'], role: 'observability' },
  ],
  edges: [
    { pts: [[6.4, 1.2], [6.4, 3.4]], arrow: true },
    { pts: [[6.4, 6.8], [6.4, 9.2]], arrow: true },
    { pts: [[6.4, 12.6], [6.4, 15.0]], arrow: true },
    { pts: [[4.0, 18.4], [4.0, 20.0], [3.7, 20.0], [3.7, 21.4]], arrow: true },
    { pts: [[8.8, 18.4], [8.8, 20.0], [9.1, 20.0], [9.1, 21.4]], arrow: true },
    { pts: [[10.6, 5.1], [13.0, 5.1]], dashed: true, arrow: true },
    { pts: [[10.6, 10.9], [13.0, 10.9]], dashed: true, arrow: true },
    { pts: [[10.6, 16.7], [13.0, 16.7]], dashed: true, arrow: true },
    { pts: [[11.4, 23.1], [13.0, 23.1]], dashed: true, arrow: true },
  ],
  request: { x: 6.9, y: 2.0, anchor: 'start' },
};

export const DIAGRAMS = { desktop, mobile } as const;

export interface Piece { x0: number; y0: number; x1: number; y1: number }

/**
 * The diagram as straight pieces about one pitch long (box sides, edge legs, dashes, arrowheads): the strips'
 * diagram targets. Dashes are 0.5 long with 0.35 gaps; arrowheads are two 0.62 strokes at ±28°.
 */
export function diagramPieces(d: Diagram, maxLen = 0.9): Piece[] {
  const out: Piece[] = [];
  const line = (x0: number, y0: number, x1: number, y1: number) => {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(1, Math.ceil(len / maxLen));
    for (let i = 0; i < n; i++) out.push({ x0: x0 + ((x1 - x0) * i) / n, y0: y0 + ((y1 - y0) * i) / n, x1: x0 + ((x1 - x0) * (i + 1)) / n, y1: y0 + ((y1 - y0) * (i + 1)) / n });
  };
  for (const b of d.boxes) {
    line(b.x, b.y, b.x + b.w, b.y);
    line(b.x + b.w, b.y, b.x + b.w, b.y + b.h);
    line(b.x + b.w, b.y + b.h, b.x, b.y + b.h);
    line(b.x, b.y + b.h, b.x, b.y);
  }
  for (const e of d.edges) {
    for (let i = 1; i < e.pts.length; i++) {
      const [x0, y0] = e.pts[i - 1]!, [x1, y1] = e.pts[i]!;
      if (e.dashed) {
        const len = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / len, uy = (y1 - y0) / len;
        for (let s = 0; s < len - 0.05; s += 0.85) { const t = Math.min(len, s + 0.5); out.push({ x0: x0 + ux * s, y0: y0 + uy * s, x1: x0 + ux * t, y1: y0 + uy * t }); }
      } else line(x0, y0, x1, y1);
    }
    if (e.arrow) {
      const [ax, ay] = e.pts[e.pts.length - 2]!, [bx, by] = e.pts[e.pts.length - 1]!;
      const a = Math.atan2(by - ay, bx - ax);
      for (const s of [-1, 1]) {
        const t = a + Math.PI - s * (28 * Math.PI / 180);
        out.push({ x0: bx, y0: by, x1: bx + Math.cos(t) * 0.62, y1: by + Math.sin(t) * 0.62 });
      }
    }
  }
  return out;
}

/** Arrowhead path (SVG) for an edge end, matching `diagramPieces`. */
export function arrowPath(e: Edge): string {
  const [ax, ay] = e.pts[e.pts.length - 2]!, [bx, by] = e.pts[e.pts.length - 1]!;
  const a = Math.atan2(by - ay, bx - ax);
  const f = (n: number) => +n.toFixed(3);
  const p = [-1, 1].map((s) => { const t = a + Math.PI - s * (28 * Math.PI / 180); return [f(bx + Math.cos(t) * 0.62), f(by + Math.sin(t) * 0.62)]; });
  return `M${p[0]![0]} ${p[0]![1]}L${f(bx)} ${f(by)}L${p[1]![0]} ${p[1]![1]}`;
}
