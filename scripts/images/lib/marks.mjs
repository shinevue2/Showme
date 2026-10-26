/**
 * Deckle masks, the 肖形印 crest seal and the cursor drawings (WP-02).
 */
import { buildCrest } from './crest.mjs';
import { f, noise1, rng } from './geom.mjs';

/* ---------------------------------------------------------------- deckle edges (耳付き和紙) */
/**
 * A sheet outline in a 1000 × 1000 box (stretched with preserveAspectRatio="none" by `.deckle`): fibrous,
 * irregular edges 0.3–1.4 % deep with the occasional bite where a fibre tore away. Four temperaments.
 */
export function deckleSvg(variant) {
  const cfg = [
    { seed: 11, base: 5, amp: [3.2, 1.6, 0.9], bites: 0.004 },  // soft machine-dried edge
    { seed: 23, base: 6, amp: [4.0, 2.2, 1.2], bites: 0.012 },  // torn by hand, with bites
    { seed: 37, base: 3.5, amp: [1.8, 1.1, 0.8], bites: 0.002 }, // fine, close-trimmed
    { seed: 53, base: 6.5, amp: [5.5, 1.4, 0.7], bites: 0.006 }, // long waves, a laid edge
  ][variant - 1];
  const n1 = noise1(cfg.seed), n2 = noise1(cfg.seed + 7), n3 = noise1(cfg.seed + 13), r = rng(cfg.seed + 99);
  const depth = (s) => {
    let d = cfg.base + cfg.amp[0] * n1(s * 0.018) + cfg.amp[1] * n2(s * 0.085) + cfg.amp[2] * n3(s * 0.42);
    if (r() < cfg.bites) d += 4 + r() * 6;
    return Math.max(0.4, d);
  };
  const pts = [];
  const step = 4;
  for (let s = 0; s < 1000; s += step) pts.push([s, depth(s)]);                // top
  for (let s = 0; s < 1000; s += step) pts.push([1000 - depth(s + 1000), s]);  // right
  for (let s = 0; s < 1000; s += step) pts.push([1000 - s, 1000 - depth(s + 2000)]); // bottom
  for (let s = 0; s < 1000; s += step) pts.push([depth(s + 3000), 1000 - s]);  // left
  const d = 'M' + pts.map((p) => `${f(p[0], 1)} ${f(p[1], 1)}`).join('L') + 'Z';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" preserveAspectRatio="none"><path fill="#fff" d="${d}"/></svg>\n`;
}

/* ---------------------------------------------------------------- 肖形印: the crest as a 朱文 seal */
export function crestSealSvg({ colour = '#CB1B45', seed = 2718 } = {}) {
  const S = 100, frame = 5.2, inset = 2.5;
  const cr = buildCrest({ R: 33.5, c: [50, 50] });
  const n = noise1(seed);
  const edge = (o, dir) => {
    const pts = [];
    const per = 4 * (S - 2 * o);
    for (let s = 0; s < per; s += 0.8) {
      const side = Math.floor(s / (S - 2 * o)), u = s - side * (S - 2 * o);
      let x, y, nx, ny;
      if (side === 0) { x = o + u; y = o; nx = 0; ny = -1; }
      else if (side === 1) { x = S - o; y = o + u; nx = 1; ny = 0; }
      else if (side === 2) { x = S - o - u; y = S - o; nx = 0; ny = 1; }
      else { x = o; y = S - o - u; nx = -1; ny = 0; }
      const w = (n(s * 0.31 + o * 10) * 0.32 + n(s * 1.9 + o) * 0.1) * dir;
      pts.push([x + nx * w, y + ny * w]);
    }
    return pts;
  };
  const outer = edge(inset, 1), inner = edge(inset + frame, -1).reverse();
  const P = (pts) => 'M' + pts.map((p) => `${f(p[0])} ${f(p[1])}`).join('L') + 'Z';
  const body = `<path d="${P(outer)}${P(inner)}"/><path d="${cr.paths.ring}"/>${cr.paths.strips.map((d) => `<path d="${d}"/>`).join('')}`;
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="400" height="400"><title>肖形印 丸に三つ組子（朱文）</title><g fill="${colour}" fill-rule="nonzero">${body}</g></svg>\n`,
    paths: [P(outer) + P(inner), cr.paths.ring, ...cr.paths.strips],
    viewBox: [0, 0, S, S],
  };
}

/* ---------------------------------------------------------------- cursors */
const INK = '#0F2540', PAPER = '#FFFFFB';
/** Each cursor: 32 × 32 drawing, hotspot in 32-px units. Ink shapes carry a paper halo (paint-order stroke). */
export const CURSORS = {
  gouge: {
    hotspot: [3, 3], note: '三角刀 V-gouge, tip at the hotspot (carved block)',
    body: `<path d="M3.2 3.2 9.6 7.4 7.4 9.6z"/><path d="M8.2 6.8 15.6 14.2 14.2 15.6 6.8 8.2z"/><path d="M14 12.6 17.4 16 16 17.4 12.6 14z" fill="${PAPER}"/><path d="M16.6 15.2 28.6 27.2c.8.8.8 1.6 0 2.4s-1.6.8-2.4 0L14.2 17.6z"/>`,
  },
  baren: {
    hotspot: [16, 19], note: '馬楝 baren: pad and twisted sheath knot (peelable sheet corner, take-a-print)',
    body: `<path d="M16 9.5a9.5 9.5 0 1 1 0 19 9.5 9.5 0 0 1 0-19zm0 3a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13z"/><path d="M16 15.2a3.8 3.8 0 1 1-.01 0z" fill="none" stroke="${INK}" stroke-width="1.4"/><path d="M12.6 10.6c.6-3.4 1.8-6.6 3.4-6.6s2.8 3.2 3.4 6.6l-2.1.6c-.4-2-.8-3.6-1.3-3.6s-.9 1.6-1.3 3.6z"/>`,
  },
  hand: {
    hotspot: [16, 15], note: 'open hand (byōbu)',
    body: `<path d="M10.5 26.5 6.6 19.8c-.9-1.6-.3-3 1-3.3 1-.3 1.9.3 2.6 1.4l1.3 2V8.4c0-1.2.8-2 1.8-2s1.8.8 1.8 2v7.1V6.6c0-1.2.8-2 1.8-2s1.8.8 1.8 2v8.9V8c0-1.2.8-2 1.8-2s1.8.8 1.8 2v8.2-5c0-1.2.8-2 1.8-2s1.8.8 1.8 2v9.6c0 3.4-1 5.6-2.4 7.7z" fill="${PAPER}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`,
    noHalo: true,
  },
  direct: {
    hotspot: [4, 3], note: 'Illustrator direct-selection arrow (kumiko strips)',
    body: `<path d="M4 3v19.2l4.9-4.6 3.4 7.9 3.2-1.4-3.4-7.8h6.6z" fill="${PAPER}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="miter"/>`,
    noHalo: true,
  },
  rake: {
    hotspot: [12, 27], note: 'rake: tines at the hotspot (sand)',
    body: `<path d="M3.5 17.5h17v2.6h-17z"/><path d="M4 20h2.2v7H4zM8.2 20h2.2v7H8.2zM12.4 20h2.2v7h-2.2zM16.6 20h2.2v7h-2.2z"/><path d="M11 17.6 26.6 3.2l1.8 1.8L13.6 19.4z"/>`,
  },
  brush: {
    hotspot: [4, 28], note: '筆 brush, tip at the hotspot (marbling tray)',
    body: `<path d="M18.6 10.6 27.4 1.8c.7-.7 1.8-.7 2.4 0s.7 1.8 0 2.4l-8.8 8.8z"/><path d="M17.4 11.2 20.8 14.6 19.4 16 16 12.6z" fill="${PAPER}"/><path d="M15.4 12.2c2.4.2 4.2 2 4.4 4.4-3 3.6-8 8.4-15.8 11.6 3.2-7.8 8-12.8 11.4-16z"/>`,
  },
  seal: {
    hotspot: [16, 28], note: '印材 seal stone, face down at the hotspot (seal stones, send)',
    body: `<path d="M13 9.2V7.4a3 3 0 0 1 6 0v1.8z"/><path d="M10.2 9.2h11.6v15.4H10.2z"/><path d="M8.8 25.6h14.4v2.8H8.8z"/>`,
  },
};

export function cursorSvg(name) {
  const c = CURSORS[name];
  const halo = c.noHalo ? '' : `<g fill="${PAPER}" stroke="${PAPER}" stroke-width="3.2" stroke-linejoin="round">${c.body.replace(/fill="[^"]*"/g, '').replace(/stroke="[^"]*"/g, '').replace(/stroke-width="[^"]*"/g, '')}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">${halo}<g fill="${INK}">${c.body}</g></svg>\n`;
}
