/**
 * 丸に三つ組子 — the persona's crest, constructed with compass and ruler (DESIGN §6.1, §13.2 WP-02).
 *   ring between R and 0.84 R · three kumiko strips on an equilateral triangle inscribed in 0.52 R ·
 *   strip width 0.11 R · each strip runs 0.18 R past both vertices · half-laps alternate over/under
 *   (pinwheel: every strip passes over at its first vertex and under at its second).
 * The under strip is cut where the over strip crosses, leaving a hairline of ground (割り) of `gap` R on
 * each side — the way crest painters show one lath lying on another.
 */
import { add, band, circle, clipHalf, dot, f, mul, norm, perp, polar, poly, sub } from './geom.mjs';

export function buildCrest({ R = 48, c = [50, 50], ring = 0.84, tri = 0.52, width = 0.11, ext = 0.18, gap = 0.035, d = 2 } = {}) {
  const rIn = ring * R, rTri = tri * R, w = width * R, e = ext * R, g = gap * R;
  const angles = [90, 210, 330]; // vertex down: a lattice triangle, never the letter A
  const V = angles.map((a) => polar(c, rTri, a));
  const strips = [0, 1, 2].map((i) => {
    const a = V[i], b = V[(i + 1) % 3];
    const dir = norm(sub(b, a));
    return { i, a, b, dir, A: sub(a, mul(dir, e)), B: add(b, mul(dir, e)) };
  });
  const pieces = [];
  const anchors = [];
  for (const s of strips) {
    const rect = band(s.A, s.B, w);
    const j = (s.i + 1) % 3; // the strip that starts at this strip's end vertex lies over it
    const o = strips[j];
    const n = perp(o.dir);
    const side = Math.sign(dot(sub(s.A, o.a), n));
    const off = w / 2 + g;
    const main = clipHalf(rect, add(o.a, mul(n, side * off)), mul(n, side));
    const stub = clipHalf(rect, add(o.a, mul(n, -side * off)), mul(n, -side));
    pieces.push({ strip: s.i, part: 'main', pts: main }, { strip: s.i, part: 'stub', pts: stub });
    for (const p of [...main, ...stub]) anchors.push(p.map((x) => +f(x, 3)));
  }
  const ringPath = circle(c, R, false, d) + circle(c, rIn, true, d);
  const stripPaths = pieces.map((p) => poly(p.pts, d));
  return {
    name: '丸に三つ組子 (maru ni mitsu-kumiko)',
    viewBox: [0, 0, c[0] * 2, c[1] * 2],
    centre: c,
    R,
    proportions: { ring, triangle: tri, stripWidth: width, extension: ext, gap },
    circles: [
      { id: 'R', r: R, role: 'outer edge of the ring' },
      { id: '0.84R', r: +f(rIn, 3), role: 'inner edge of the ring' },
      { id: '0.52R', r: +f(rTri, 3), role: 'circumcircle of the kumiko triangle' },
    ],
    radii: angles.map((a) => ({ angle: a, from: c, to: polar(c, R, a).map((x) => +f(x, 3)) })),
    intersections: V.map((p, i) => ({ id: `V${i}`, at: p.map((x) => +f(x, 3)), label: 'intersect', on: ['0.52R', `radius ${angles[i]}°`] })),
    strips: strips.map((s) => ({ id: `strip${s.i}`, from: `V${s.i}`, to: `V${(s.i + 1) % 3}`, over: `V${s.i}`, under: `V${(s.i + 1) % 3}`,
      start: s.A.map((x) => +f(x, 3)), end: s.B.map((x) => +f(x, 3)), width: +f(w, 3) })),
    anchors,
    order: ['circles', 'radii', 'intersections', 'anchors', 'fill'],
    paths: { ring: ringPath, strips: stripPaths },
    fillRule: 'nonzero',
  };
}

/** `disc`: a paper-coloured disc behind the mark (raster favicons, which cannot switch colour on dark browser chrome). */
export function crestSvg(cr, { fill = '#0F2540', title = '丸に三つ組子', extraStyle = '', disc = null } = {}) {
  const [x, y, wv, hv] = cr.viewBox;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${wv} ${hv}" width="${wv}" height="${hv}">` +
    `<title>${title}</title>${extraStyle ? `<style>${extraStyle}</style>` : ''}` +
    (disc ? `<circle cx="${cr.centre[0]}" cy="${cr.centre[1]}" r="${cr.R - 0.5}" fill="${disc}"/>` : '') +
    `<g fill="${fill}"><path d="${cr.paths.ring}"/>${cr.paths.strips.map((p) => `<path d="${p}"/>`).join('')}</g></svg>\n`;
}
