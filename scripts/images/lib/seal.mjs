/**
 * 白文 「湊」 in 小篆 (Shuowen seal script), redrawn for a seal face. Owner: WP-02.
 *
 * Reference: Wikimedia Commons, "File:湊-seal.svg" (Shuowen seal script series, category "PD ancient script"),
 * https://commons.wikimedia.org/wiki/File:%E6%B9%8A-seal.svg — itself drawn from the 說文解字 small-seal forms
 * listed there (Sinica 小學堂 yanbian ?char=湊, hanziyuan.net, CUHK Multi-function Chinese Character Database).
 * The strokes below were traced as centre lines on that drawing's 300 × 300 grid (水 left: a long S-shaped
 * stream with four side strokes; 奏 right: 屮 sprout, the two hands of 廾 drawn as claws and long arms, 夲 =
 * 大 over 十), then widened 1.25× to sit in a single-character rectangular seal and re-stroked at one even
 * width with round ends (玉箸篆), the way a seal carver re-proportions the dictionary form for the stone
 * (印化: the 水 strokes, the long arms and 十 are drawn down to the lower border so the face fills evenly).
 */
import { f, noise1, rng } from './geom.mjs';

/** Centre lines on the reference's 300 grid (absolute M/L/H/V/C only). */
export const MINATO_STROKES = [
  // 氵 (水)
  'M70 44 C 86 60, 88 100, 69 122',
  'M92 28 C 112 50, 108 100, 100 128 C 92 150, 76 195, 82 235 C 85 258, 90 274, 92 287',
  'M122 43 C 126 70, 122 100, 112 120',
  'M72 144 C 60 175, 57 232, 71 284',
  'M116 146 C 102 172, 103 235, 120 281',
  // 奏 — 屮
  'M179 14 V 106',
  'M150 27 C 150 45, 160 51, 178 51',
  'M210 30 C 208 46, 198 51, 180 51',
  // 廾 left hand: claw, chevron, bar; long left arm
  'M156 64 L 143 90',
  'M167 85 C 155 88, 148 96, 150 100 C 152 105, 160 108, 167 110',
  'M147 113 H 166',
  'M128 101 C 132 140, 130 230, 131 288',
  // 廾 right hand: hooked long arm, chevron, bar
  'M197 67 C 218 72, 228 88, 226 110 C 222 140, 218 250, 216 288',
  'M190 87 C 202 88, 209 94, 207 100 C 205 105, 197 108, 190 110',
  'M190 120 H 210',
  // 夲 = 大 over 十
  'M177 118 V 168',
  'M177 126 C 169 136, 157 146, 147 151',
  'M177 126 C 187 136, 197 144, 206 148',
  'M177 166 C 167 175, 157 182, 149 186',
  'M177 166 C 189 175, 199 182, 207 187',
  'M153 212 H 207',
  'M177 181 V 282',
];

/* ---------- path sampling and stroke outlining ---------- */
function samplePath(d, step = 2.4) {
  const tok = d.match(/[MLHVC]|-?\d*\.?\d+/g);
  const pts = [];
  let i = 0, cur = [0, 0], cmd = '';
  const num = () => parseFloat(tok[i++]);
  while (i < tok.length) {
    if (/[MLHVC]/.test(tok[i])) cmd = tok[i++];
    if (cmd === 'M') { cur = [num(), num()]; pts.push(cur); cmd = 'L'; }
    else if (cmd === 'L' || cmd === 'H' || cmd === 'V') {
      const to = cmd === 'L' ? [num(), num()] : cmd === 'H' ? [num(), cur[1]] : [cur[0], num()];
      const n = Math.max(1, Math.ceil(Math.hypot(to[0] - cur[0], to[1] - cur[1]) / step));
      for (let k = 1; k <= n; k++) pts.push([cur[0] + ((to[0] - cur[0]) * k) / n, cur[1] + ((to[1] - cur[1]) * k) / n]);
      cur = to;
    } else if (cmd === 'C') {
      const p1 = [num(), num()], p2 = [num(), num()], p3 = [num(), num()];
      const est = Math.hypot(p1[0] - cur[0], p1[1] - cur[1]) + Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) + Math.hypot(p3[0] - p2[0], p3[1] - p2[1]);
      const n = Math.max(4, Math.ceil(est / step));
      for (let k = 1; k <= n; k++) {
        const t = k / n, u = 1 - t;
        pts.push([
          u * u * u * cur[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
          u * u * u * cur[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
        ]);
      }
      cur = p3;
    } else i++;
  }
  return pts;
}

/** Closed outline of a round-capped stroke of width w along polyline pts (counter-clockwise). */
function outline(pts, w) {
  const r = w / 2;
  const L = [], R = [];
  for (let k = 0; k < pts.length; k++) {
    const a = pts[Math.max(0, k - 1)], b = pts[Math.min(pts.length - 1, k + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1];
    const l = Math.hypot(tx, ty) || 1;
    tx /= l; ty /= l;
    L.push([pts[k][0] - ty * r, pts[k][1] + tx * r]);
    R.push([pts[k][0] + ty * r, pts[k][1] - tx * r]);
  }
  // round caps: sweep from one side to the other through the forward (end) / backward (start) direction
  const cap = (c, from) => {
    const out = [];
    for (let k = 1; k < 12; k++) { const a = from - (Math.PI * k) / 12; out.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]); }
    return out;
  };
  const end = pts[pts.length - 1], start = pts[0];
  const ae = Math.atan2(L[L.length - 1][1] - end[1], L[L.length - 1][0] - end[0]);
  const as = Math.atan2(R[0][1] - start[1], R[0][0] - start[0]);
  const ring = [...L, ...cap(end, ae), ...R.reverse(), ...cap(start, as)];
  // orientation: make it counter-clockwise in SVG coordinates (positive signed area)
  let area = 0;
  for (let k = 0; k < ring.length; k++) { const p = ring[k], q = ring[(k + 1) % ring.length]; area += p[0] * q[1] - q[0] * p[1]; }
  return area < 0 ? ring.reverse() : ring;
}

const toPath = (ring, d = 1) => 'M' + ring.map((p) => `${f(p[0], d)} ${f(p[1], d)}`).join('L') + 'Z';

/**
 * Seal geometry in a W × H face (units). Returns the glyph outlines (white, incised), the stroke centre
 * lines (transformed) and the face outline with a hand-cut edge.
 */
export function buildMinatoSeal({ W = 82, H = 100, border = 5.5, stroke = 4.7, stretch = 1.32, seed = 1729 } = {}) {
  const bx = [55, 229], by = [12, 292];
  const gw = W - 2 * border, gh = H - 2 * border;
  const sy = gh / (by[1] - by[0]);
  const sx = Math.min(sy * stretch, gw / (bx[1] - bx[0]));
  const ox = border + (gw - (bx[1] - bx[0]) * sx) / 2, oy = border;
  const tf = ([x, y]) => [ox + (x - bx[0]) * sx, oy + (y - by[0]) * sy];
  const lines = MINATO_STROKES.map((d) => samplePath(d).map(tf));
  const glyph = lines.map((pts) => toPath(outline(pts, stroke)));
  // face: rectangle with a slightly worn, hand-cut edge (deterministic), corners eased
  const n = noise1(seed), r = rng(seed);
  const edge = [];
  const per = 2 * (W + H), stepE = 0.8;
  for (let s = 0; s < per; s += stepE) {
    let x, y, nx, ny;
    if (s < W) { x = s; y = 0; nx = 0; ny = -1; }
    else if (s < W + H) { x = W; y = s - W; nx = 1; ny = 0; }
    else if (s < 2 * W + H) { x = W - (s - W - H); y = H; nx = 0; ny = 1; }
    else { x = 0; y = H - (s - 2 * W - H); nx = -1; ny = 0; }
    const wob = n(s * 0.35) * 0.28 + n(s * 1.7 + 40) * 0.12 - (r() < 0.025 ? r() * 0.5 : 0);
    // ease the corners inwards by up to 0.9 units
    const corner = Math.min(Math.hypot(x, y), Math.hypot(W - x, y), Math.hypot(x, H - y), Math.hypot(W - x, H - y));
    const ease = corner < 2.2 ? (2.2 - corner) * 0.42 : 0;
    edge.push([x + nx * (wob - ease), y + ny * (wob - ease)]);
  }
  return {
    viewBox: [0, 0, W, H], face: toPath(edge), glyph, centreLines: MINATO_STROKES, stroke, border,
    transform: { from: '300-grid of the reference', scale: [+f(sx, 4), +f(sy, 4)], offset: [+f(ox - bx[0] * sx, 3), +f(oy - by[0] * sy, 3)] },
  };
}

/** 白文 impression: red field, glyph left as paper (transparent), one faint 印泥 speckle pass. */
export function minatoSvg(seal, { colour = '#CB1B45', id = 'minato', title = '湊（白文・小篆）', clip = null } = {}) {
  const [, , W, H] = seal.viewBox;
  const vb = clip ? `0 ${clip[0]} ${W} ${clip[1] - clip[0]}` : `0 0 ${W} ${H}`;
  const hgt = clip ? clip[1] - clip[0] : H;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${W * 4}" height="${hgt * 4}">` +
    `<title>${title}</title>` +
    `<defs><mask id="${id}-m" maskUnits="userSpaceOnUse" x="-2" y="-2" width="${W + 4}" height="${H + 4}">` +
    `<path d="${seal.face}" fill="#fff"/><g fill="#000">${seal.glyph.map((p) => `<path d="${p}"/>`).join('')}</g>` +
    `</mask></defs>` +
    `<rect x="-1" y="-1" width="${W + 2}" height="${H + 2}" fill="${colour}" mask="url(#${id}-m)"/></svg>\n`;
}

/** Tiny unprinted flecks where the paste did not take (deterministic; ≈ 0.4 % of the face). */
function speckles(W, H, seed) {
  const r = rng(seed);
  let d = '';
  for (let k = 0; k < 46; k++) {
    const x = 1.5 + r() * (W - 3), y = 1.5 + r() * (H - 3), s = 0.18 + r() * 0.42;
    d += `M${f(x)} ${f(y)}h${f(s)}l${f(-s * 0.3)} ${f(s * 0.8)}z`;
  }
  return `<path d="${d}" fill="#000" fill-opacity=".85"/>`;
}
