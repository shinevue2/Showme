/**
 * Skills — the shoji and its kumiko (DESIGN §6.5; aesth §3.2). Owner: WP-08. Pure and Node-safe: the render
 * module draws the static SVG lattices from it, the view builds its instances from the very same segments.
 *
 * Units are lattice pitches; frame coordinates have their origin at the frame's top-left, y down (SVG).
 * A shoji is cols × rows square cells of C × C pitches inside a waku (outer frame) of width B, cells parted by
 * dividers of width DV. Each cell's jigumi divides it evenly, so the cell edges are the frame itself (that is how
 * a kumiko maker sets out a panel) and every pattern is centred in its cell:
 *   asanoha       triangular jigumi (side s, rows fitted to the cell), three leaves to each centroid → 30°/60°/120°
 *   kaku-asanoha  square jigumi + both diagonals, in each right-isosceles triangle three leaves to its incentre →
 *                 45° / 22.5° / 67.5° cuts
 *   masu          square half-lap grid
 *   kikko         regular hexagons (pointy-top honeycomb, edge e)
 *   mitsukude     the triangular jigumi alone: three strips through every joint
 * A tool is a featured run: `years` consecutive lattice edges along one member (a zigzag for kikkō), with
 * `projects` dark inlay squares spaced along it.
 */

export type PatternId = 'asanoha' | 'kaku-asanoha' | 'masu' | 'kikko' | 'mitsukude';

/** Segment kinds (shared with the view's shader). */
export const K = { jigumi: 0, leaf: 1, frame: 2, run: 3, inlay: 4 } as const;
export type Kind = (typeof K)[keyof typeof K];

export interface Seg {
  x0: number; y0: number; x1: number; y1: number;
  k: Kind;
  /** tool index (−1 = structural) */
  tool: number;
  /** strip width and depth (pitch units) */
  w: number; d: number;
  /** cell index (−1 = frame) */
  cell: number;
}

export const C = 9;          // cell inner size
export const B = 0.6;        // waku (outer frame) width
export const DV = 0.5;       // divider width
export const STRIP_W = 0.08; // DESIGN §6.5: width 0.08, depth 0.24 pitch units
export const STRIP_D = 0.24;
export const LEAF_D = 0.2;   // 葉 pieces sit a little lower than the jigumi
export const LEAF_W = 0.066; // and are planed a little thinner
export const INLAY = 0.13;   // inlay square side
export const FRAME_D = 0.62;
export const DIV_D = 0.5;
export const TRI_S = C / (10 * (Math.sqrt(3) / 2));   // triangular side: ten rows fill the cell height exactly
export const HEX_E = 0.8;                              // kikkō edge: eight full zigzag tracks across the cell

export interface Layout { cols: number; rows: number; W: number; H: number }
export const DESKTOP: Layout = layout(3, 2);
export const MOBILE: Layout = layout(2, 3);
export function layout(cols: number, rows: number): Layout {
  return { cols, rows, W: cols * C + (cols - 1) * DV + 2 * B, H: rows * C + (rows - 1) * DV + 2 * B };
}
/** Top-left of cell i (row-major). */
export function cellOrigin(L: Layout, i: number): { x: number; y: number } {
  const c = i % L.cols, r = Math.floor(i / L.cols);
  return { x: B + c * (C + DV), y: B + r * (C + DV) };
}

/* ------------------------------------------------------------------ clipping */
/** Liang–Barsky clip of a segment to [0,C]²; null when outside or too short. */
function clip(x0: number, y0: number, x1: number, y1: number, min = 0.12): [number, number, number, number] | null {
  let t0 = 0, t1 = 1;
  const dx = x1 - x0, dy = y1 - y0;
  const p = [-dx, dx, -dy, dy], q = [x0, C - x0, y0, C - y0];
  for (let i = 0; i < 4; i++) {
    if (Math.abs(p[i]!) < 1e-12) { if (q[i]! < -1e-9) return null; continue; }
    const r = q[i]! / p[i]!;
    if (p[i]! < 0) { if (r > t1) return null; if (r > t0) t0 = r; } else { if (r < t0) return null; if (r < t1) t1 = r; }
  }
  const a = [x0 + t0 * dx, y0 + t0 * dy, x0 + t1 * dx, y0 + t1 * dy] as [number, number, number, number];
  if (Math.hypot(a[2] - a[0], a[3] - a[1]) < min) return null;
  // a piece lying on the cell edge is the frame's job
  const onEdge = (u: number) => Math.abs(u) < 1e-6 || Math.abs(u - C) < 1e-6;
  if ((onEdge(a[0]) && onEdge(a[2]) && Math.abs(a[0] - a[2]) < 1e-6) || (onEdge(a[1]) && onEdge(a[3]) && Math.abs(a[1] - a[3]) < 1e-6)) return null;
  return a;
}

const key = (x: number, y: number) => `${Math.round(x * 1000)},${Math.round(y * 1000)}`;

/** A member is a straight line of lattice edges; runs travel along members. */
export interface Member { pts: [number, number][]; horizontal: boolean }

export interface CellPattern {
  segs: Omit<Seg, 'tool' | 'cell'>[];
  /** run tracks: polylines whose consecutive points are joints one edge apart (cell-local) */
  tracks: Member[];
}

function push(out: Omit<Seg, 'tool' | 'cell'>[], seen: Set<string>, x0: number, y0: number, x1: number, y1: number, k: Kind, d: number): void {
  const w = k === K.leaf ? LEAF_W : STRIP_W;
  const c = clip(x0, y0, x1, y1);
  if (!c) return;
  const a = key(c[0], c[1]), b = key(c[2], c[3]);
  const id = a < b ? a + '|' + b : b + '|' + a;
  if (seen.has(id)) return;
  seen.add(id);
  out.push({ x0: c[0], y0: c[1], x1: c[2], y1: c[3], k, w, d });
}

/* ------------------------------------------------------------------ square jigumi */
function squareGrid(u: number, leaves: boolean): CellPattern {
  const segs: CellPattern['segs'] = [];
  const seen = new Set<string>();
  const n = Math.round(C / u);
  // jigumi members, split at every crossing (lines at k·u, k = 1..n−1; the cell edges are the frame)
  for (let k = 1; k < n; k++) {
    const v = k * u;
    for (let j = 0; j < n; j++) {
      push(segs, seen, j * u, v, (j + 1) * u, v, K.jigumi, STRIP_D);
      push(segs, seen, v, j * u, v, (j + 1) * u, K.jigumi, STRIP_D);
    }
  }
  if (leaves) {
    const r2 = Math.SQRT2;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const x = i * u, y = j * u;
        const O: [number, number] = [x + u / 2, y + u / 2];
        const corners: [number, number][] = [[x, y], [x + u, y], [x + u, y + u], [x, y + u]];
        // both diagonals, as four half-diagonals from the centre (each its own piece, cut at 45°)
        for (const P of corners) push(segs, seen, O[0], O[1], P[0], P[1], K.leaf, LEAF_D);
        // four right-isosceles triangles (A, B, O): leaves from each corner to the incentre
        for (let q = 0; q < 4; q++) {
          const A = corners[q]!, Bc = corners[(q + 1) % 4]!;
          const I: [number, number] = [((A[0] + Bc[0]) / r2 + O[0]) / (r2 + 1), ((A[1] + Bc[1]) / r2 + O[1]) / (r2 + 1)];
          push(segs, seen, A[0], A[1], I[0], I[1], K.leaf, LEAF_D);
          push(segs, seen, Bc[0], Bc[1], I[0], I[1], K.leaf, LEAF_D);
          push(segs, seen, O[0], O[1], I[0], I[1], K.leaf, LEAF_D);
        }
      }
    }
  }
  const tracks: Member[] = [];
  for (let k = 1; k < n; k++) {
    const pts: [number, number][] = [];
    for (let j = 0; j <= n; j++) pts.push([j * u, k * u]);
    tracks.push({ pts, horizontal: true });
  }
  return { segs, tracks };
}

/* ------------------------------------------------------------------ triangular jigumi */
function triGrid(s: number, leaves: boolean): CellPattern {
  const segs: CellPattern['segs'] = [];
  const seen = new Set<string>();
  const h = (s * Math.sqrt(3)) / 2;
  const rows = Math.round(C / h);
  const cx = C / 2;
  const node = (r: number, j: number): [number, number] => [cx + (j + ((r % 2) === 0 ? 0 : 0.5)) * s, r * h];
  const jMin = -Math.ceil(C / s) - 2, jMax = Math.ceil(C / s) + 2;
  for (let r = 0; r <= rows; r++) {
    for (let j = jMin; j <= jMax; j++) {
      const P = node(r, j);
      // horizontal edges (rows 1..rows−1; the top and bottom rows lie on the frame)
      if (r > 0 && r < rows) { const Q = node(r, j + 1); push(segs, seen, P[0], P[1], Q[0], Q[1], K.jigumi, STRIP_D); }
      if (r < rows) {
        // slanted edges to the two nodes of the next row
        const off = (r % 2) === 0 ? -1 : 0;
        const L = node(r + 1, j + off), R = node(r + 1, j + off + 1);
        push(segs, seen, P[0], P[1], L[0], L[1], K.jigumi, STRIP_D);
        push(segs, seen, P[0], P[1], R[0], R[1], K.jigumi, STRIP_D);
        if (leaves) {
          // the triangle below P (P, L, R) and the one to its right (P, R, P+1)
          const P2 = node(r, j + 1);
          for (const tri of [[P, L, R], [P, R, P2]] as [number, number][][]) {
            const G: [number, number] = [(tri[0]![0] + tri[1]![0] + tri[2]![0]) / 3, (tri[0]![1] + tri[1]![1] + tri[2]![1]) / 3];
            for (const V of tri) push(segs, seen, V[0], V[1], G[0], G[1], K.leaf, LEAF_D);
          }
        }
      }
    }
  }
  const tracks: Member[] = [];
  for (let r = 1; r < rows; r++) {
    const pts: [number, number][] = [];
    for (let j = jMin; j <= jMax; j++) { const P = node(r, j); if (P[0] >= -1e-6 && P[0] <= C + 1e-6) pts.push(P); }
    tracks.push({ pts, horizontal: true });
  }
  return { segs, tracks };
}

/* ------------------------------------------------------------------ honeycomb (kikkō) */
function honeycomb(e: number): CellPattern {
  const segs: CellPattern['segs'] = [];
  const seen = new Set<string>();
  const w = Math.sqrt(3) * e;
  const rowsN = Math.round(C / (1.5 * e)) + 2;
  const cy0 = C / 2 - ((rowsN - 1) / 2) * 1.5 * e;
  const vtx = (cx: number, cy: number): [number, number][] => [
    [cx, cy - e], [cx + w / 2, cy - e / 2], [cx + w / 2, cy + e / 2], [cx, cy + e], [cx - w / 2, cy + e / 2], [cx - w / 2, cy - e / 2],
  ];
  const tracks: Member[] = [];
  for (let r = 0; r < rowsN; r++) {
    const cy = cy0 + r * 1.5 * e;
    const shift = (r % 2) * 0.5;
    const top: [number, number][] = [];
    for (let i = -8; i <= 8; i++) {
      const cx = C / 2 + (i + shift) * w;
      const v = vtx(cx, cy);
      for (let q = 0; q < 6; q++) push(segs, seen, v[q]![0], v[q]![1], v[(q + 1) % 6]![0], v[(q + 1) % 6]![1], K.jigumi, STRIP_D);
      top.push(v[5]!, v[0]!);
    }
    // the zigzag along the top of this row: upper-left → top → upper-right(= next upper-left) → …
    // (only rows whose whole zigzag lies inside the cell; x is monotonic, so trimming the ends keeps it contiguous)
    if (cy - e < -1e-6 || cy - e / 2 > C + 1e-6) continue;
    const pts = top.filter((p) => p[0] >= -1e-6 && p[0] <= C + 1e-6);
    if (pts.length > 2) tracks.push({ pts, horizontal: false });
  }
  return { segs, tracks };
}

export function cellPattern(p: PatternId, thin = false): CellPattern {
  switch (p) {
    case 'asanoha': return triGrid(TRI_S, true);
    case 'kaku-asanoha': return squareGrid(1, true);
    case 'masu': return squareGrid(1, false);
    case 'kikko': return honeycomb(HEX_E);
    case 'mitsukude': return triGrid(TRI_S, false);
    default: return thin ? squareGrid(1, false) : squareGrid(1, false);
  }
}

/* ------------------------------------------------------------------ runs */
export interface RunTool { years: number; projects: number; id: string }
export interface Run {
  tool: number;
  /** polyline of years + 1 joints (cell-local) */
  pts: [number, number][];
  /** inlay centres and directions (cell-local) */
  inlays: { x: number; y: number; a: number }[];
}

/** Small deterministic hash (FNV-1a) → [0, 1). */
export function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 100000) / 100000;
}

/**
 * Place each tool of a cell as a run along one track: tracks are spread over the cell height, runs never touch
 * each other (≥ 1 free edge between two runs on one track), and the start joint is seeded per tool so the runs
 * read as veins of a darker wood in the lattice, not as a bar chart.
 */
export function placeRuns(pat: CellPattern, tools: RunTool[], toolIndex: (id: string) => number): Run[] {
  const tracks = pat.tracks.filter((t) => t.pts.length >= 3);
  const used: { track: number; a: number; b: number }[] = [];
  const order = tools.map((t, i) => ({ t, i })).sort((a, b) => b.t.years - a.t.years || a.i - b.i);
  const runs: Run[] = [];
  const n = tools.length;
  // the outermost tracks hug the frame: use them only when the inner ones are full
  const inner = tracks.length >= 4 ? tracks.slice(1, -1) : tracks;
  for (const { t, i } of order) {
    // preferred track: spread evenly in reading order (i); then the nearest inner tracks; then the outer ones
    const pref = Math.min(inner.length - 1, Math.round(((i + 0.5) / n) * inner.length - 0.5));
    const tryOrder = inner.map((tr, k) => ({ tr, d: Math.abs(k - pref) + (k < pref ? 0.5 : 0) })).sort((a, b) => a.d - b.d).map((x) => x.tr);
    for (const tr of tracks) if (!tryOrder.includes(tr)) tryOrder.push(tr);
    let placed = false;
    for (const tr of tryOrder) {
      if (placed) break;
      const ti = tracks.indexOf(tr);
      const edges = tr.pts.length - 1;
      if (edges < t.years) continue;
      const span = edges - t.years;
      const want = Math.round(hash01(t.id) * span);
      for (let d = 0; d <= span && !placed; d++) {
        for (const a of [want + d, want - d]) {
          if (a < 0 || a > span) continue;
          const b = a + t.years;
          if (used.some((u) => u.track === ti && !(b + 1 <= u.a || a >= u.b + 1))) continue;
          used.push({ track: ti, a, b });
          const pts = tr.pts.slice(a, b + 1);
          runs.push({ tool: toolIndex(t.id), pts, inlays: inlaysAlong(pts, t.projects) });
          placed = true;
          break;
        }
      }
    }
  }
  return runs;
}

/** `count` inlay squares spaced evenly along a polyline (centred in equal shares of its length). */
export function inlaysAlong(pts: [number, number][], count: number): Run['inlays'] {
  const lens: number[] = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]); lens.push(l); total += l; }
  const out: Run['inlays'] = [];
  for (let k = 0; k < count; k++) {
    let s = ((k + 0.5) / count) * total;
    for (let i = 0; i < lens.length; i++) {
      if (s <= lens[i]! + 1e-9 || i === lens.length - 1) {
        const a = pts[i]!, b = pts[i + 1]!;
        const f = Math.min(1, s / lens[i]!);
        out.push({ x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, a: Math.atan2(b[1] - a[1], b[0] - a[0]) });
        break;
      }
      s -= lens[i]!;
    }
  }
  return out;
}

/* ------------------------------------------------------------------ the whole shoji */
export interface CellSpec { pattern: PatternId; tools: RunTool[] }
export interface Shoji { layout: Layout; segs: Seg[]; runs: (Run & { cell: number })[]; patterns: CellPattern[] }

/**
 * Every segment of the shoji in frame coordinates: frame members, then per cell the jigumi and leaves (run edges
 * re-typed as runs) and the inlays. `cells` are the five domain cells in order; the sixth cell is Hokusai's page.
 * `thin` = ichimatsu thinning for tight instance budgets: leaves only in alternate squares/triangle pairs.
 */
export function buildShoji(L: Layout, cells: CellSpec[], toolIndex: (id: string) => number, thin = false): Shoji {
  const segs: Seg[] = [];
  const runsOut: (Run & { cell: number })[] = [];
  const patterns: CellPattern[] = [];
  // waku: four border members (centred on the border band), then the dividers
  const fr = (x0: number, y0: number, x1: number, y1: number, w: number, d: number) => segs.push({ x0, y0, x1, y1, k: K.frame, tool: -1, w, d, cell: -1 });
  fr(0, B / 2, L.W, B / 2, B, FRAME_D);
  fr(0, L.H - B / 2, L.W, L.H - B / 2, B, FRAME_D);
  fr(B / 2, B, B / 2, L.H - B, B, FRAME_D);
  fr(L.W - B / 2, B, L.W - B / 2, L.H - B, B, FRAME_D);
  for (let c = 1; c < L.cols; c++) { const x = B + c * C + (c - 0.5) * DV; fr(x, B, x, L.H - B, DV, DIV_D); }
  for (let r = 1; r < L.rows; r++) {
    const y = B + r * C + (r - 0.5) * DV;
    for (let c = 0; c < L.cols; c++) { const x0 = B + c * (C + DV); fr(x0, y, x0 + C, y, DV, DIV_D); }
  }
  cells.forEach((spec, ci) => {
    const o = cellOrigin(L, ci);
    const pat = cellPattern(spec.pattern);
    patterns.push(pat);
    const runs = placeRuns(pat, spec.tools, toolIndex);
    // run edges: mark the matching jigumi segments (same endpoints) as the tool's run
    const runEdge = new Map<string, number>();
    for (const r of runs) for (let i = 1; i < r.pts.length; i++) {
      const a = key(r.pts[i - 1]![0], r.pts[i - 1]![1]), b = key(r.pts[i]![0], r.pts[i]![1]);
      runEdge.set(a < b ? a + '|' + b : b + '|' + a, r.tool);
    }
    let leafN = 0;
    for (const s of pat.segs) {
      const a = key(s.x0, s.y0), b = key(s.x1, s.y1);
      const tool = runEdge.get(a < b ? a + '|' + b : b + '|' + a);
      if (thin && s.k === K.leaf) {
        const mx = (s.x0 + s.x1) / 2, my = (s.y0 + s.y1) / 2;
        if ((Math.floor(mx) + Math.floor(my)) % 2 === 1) continue;
      }
      if (s.k === K.leaf) leafN++;
      segs.push({ ...s, x0: s.x0 + o.x, y0: s.y0 + o.y, x1: s.x1 + o.x, y1: s.y1 + o.y, k: tool !== undefined ? K.run : s.k, tool: tool ?? -1, cell: ci });
    }
    void leafN;
    for (const r of runs) {
      for (const p of r.inlays) {
        const dx = Math.cos(p.a) * INLAY / 2, dy = Math.sin(p.a) * INLAY / 2;
        segs.push({ x0: p.x + o.x - dx, y0: p.y + o.y - dy, x1: p.x + o.x + dx, y1: p.y + o.y + dy, k: K.inlay, tool: r.tool, w: INLAY, d: STRIP_D + 0.03, cell: ci });
      }
      runsOut.push({ ...r, cell: ci, pts: r.pts.map(([x, y]) => [x + o.x, y + o.y] as [number, number]), inlays: r.inlays.map((p) => ({ ...p, x: p.x + o.x, y: p.y + o.y })) });
    }
  });
  return { layout: L, segs, runs: runsOut, patterns };
}

/* ------------------------------------------------------------------ SVG tiles for the static fallback */
/**
 * One repeat tile of each pattern (cell-local, userSpaceOnUse), generated by the same functions: the tile's
 * segments are the pattern's segments that fall inside the tile window. Returns the tile box and a path `d`.
 */
export function patternTile(p: PatternId): { x: number; y: number; w: number; h: number; jigumi: string; leaf: string } {
  const pat = cellPattern(p);
  let box: { x: number; y: number; w: number; h: number };
  const h3 = (TRI_S * Math.sqrt(3)) / 2;
  switch (p) {
    case 'asanoha': case 'mitsukude': box = { x: C / 2, y: 2 * h3, w: TRI_S, h: 2 * h3 }; break;
    case 'kikko': box = { x: C / 2, y: 0, w: Math.sqrt(3) * HEX_E, h: 3 * HEX_E }; break;
    default: box = { x: 4, y: 4, w: 1, h: 1 };
  }
  if (p === 'kikko') {
    // align the tile with a hexagon row: find the row containing the cell centre
    const e = HEX_E, rowsN = Math.round(C / (1.5 * e)) + 2;
    const cy0 = C / 2 - ((rowsN - 1) / 2) * 1.5 * e;
    let r0 = 0;
    for (let r = 0; r < rowsN; r++) if (r % 2 === 0 && cy0 + r * 1.5 * e <= C / 2) r0 = r;
    box.y = cy0 + r0 * 1.5 * e;
  }
  const inside = (x: number, y: number) => x >= box.x - 0.6 && x <= box.x + box.w + 0.6 && y >= box.y - 0.6 && y <= box.y + box.h + 0.6;
  const f = (n: number) => +(n - 0).toFixed(3);
  let j = '', l = '';
  for (const s of pat.segs) {
    if (!inside(s.x0, s.y0) && !inside(s.x1, s.y1)) continue;
    const d = `M${f(s.x0 - box.x)} ${f(s.y0 - box.y)}L${f(s.x1 - box.x)} ${f(s.y1 - box.y)}`;
    if (s.k === K.leaf) l += d; else j += d;
  }
  return { ...box, jigumi: j, leaf: l };
}
