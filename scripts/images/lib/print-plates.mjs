/**
 * Today's print (今日の一枚) — eight colour blocks + the cartouche mask, viewBox 0 0 1240 1824 (ōban portrait).
 * Owner: WP-02; composited by WP-04's print compositor (plates 2–7 multiplied in order, plate 8 gold drawn
 * normally on top of them — metallic ink is opaque and goes on last; multiplying it turns it olive over the green —
 * then marbling clipped to the cartouche, plate 1 key block on top, seal lower left). Nothing but the cartouche
 * ground (plate 6) is printed inside the cartouche. Composition after Hiroshige's Hōeidō Tōkaidō:
 * Prussian-blue ichimonji band and pink dawn at the horizon, green hills, grey mist bands, a pale river with
 * its deep channel, rain lines, gold suyari clouds; the key block carries the frame, every outline, the
 * Tōkaidō line running right → left down the sheet with seven station marks, the crest and the cartouche.
 * The name is set by the compositor inside the cartouche (vertical ja/zh, two stacked lines en).
 */
import { buildCrest } from './crest.mjs';
import { f, noise1, rng } from './geom.mjs';

export const W = 1240, H = 1824;
const INSET = 56; // 匡郭 frame inset
export const CARTOUCHE = { x: 1010, y: 300, w: 150, h: 700 };
export const PLATE_FILLS = ['#0F2540', '#5DAC81', '#91989F', '#F4A7B9', '#A5DEE4', '#205C81', '#656765', '#FFB11B'];

const P = (pts) => 'M' + pts.map((p) => `${f(p[0], 1)} ${f(p[1], 1)}`).join('L') + 'Z';
const Lp = (pts) => 'M' + pts.map((p) => `${f(p[0], 1)} ${f(p[1], 1)}`).join('L');

/** Catmull-Rom through carved ridge points, sampled as a polyline (Hiroshige's ranges are cut, not modelled). */
function ridgeLine(pts, step = 6) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t, tn = 0.35; // tension: crisp shoulders
      const m1 = [(p2[0] - p0[0]) * tn, (p2[1] - p0[1]) * tn], m2 = [(p3[0] - p1[0]) * tn, (p3[1] - p1[1]) * tn];
      const h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t, h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
      out.push([h00 * p1[0] + h10 * m1[0] + h01 * p2[0] + h11 * m2[0], h00 * p1[1] + h10 * m1[1] + h01 * p2[1] + h11 * m2[1]]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/** A pine in the Tōkaidō manner: a leaning trunk and three flat canopy pads. */
function pine(x, y, s, lean) {
  const trunk = [[x, y], [x + 4 * s, y], [x + 4 * s + lean * 60 * s, y - 120 * s], [x + lean * 60 * s, y - 120 * s]];
  const pads = [];
  const tops = [[-34, -118, 46, 15], [-6, -146, 38, 13], [-46, -92, 34, 11]];
  for (const [dx, dy, rx, ry] of tops) {
    const cx = x + lean * 60 * s * ((-dy - 60) / 60) + dx * s * 0.4 + 6 * s, cy = y + dy * s;
    const pts = [];
    for (let k = 0; k < 28; k++) {
      const a = (k / 28) * Math.PI * 2;
      const wob = 1 + 0.12 * Math.sin(a * 5 + x);
      pts.push([cx + Math.cos(a) * rx * s * wob, cy + Math.sin(a) * ry * s * (a > Math.PI ? 1.05 : 0.7)]);
    }
    pads.push(pts);
  }
  return { trunk: P(trunk), pads: pads.map(P) };
}

/** Vertical bokashi: plate colour fading between two heights (userSpaceOnUse, no masks). */
function fade(id, colour, y0, y1, stops) {
  return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="${y0}" x2="0" y2="${y1}">` +
    stops.map(([o, a]) => `<stop offset="${o}" stop-color="${colour}" stop-opacity="${a}"/>`).join('') + '</linearGradient>';
}

/**
 * すやり霞: a long band whose ends thin out like a drawn-out brush stroke (never a round-capped bar), with a
 * softly scalloped top edge and a calmer lower edge.
 */
function suyari(x0, x1, yc, h, seed) {
  const n = noise1(seed);
  const r = h / 2, top = [], bot = [];
  const steps = Math.max(32, Math.round((x1 - x0) / 10));
  for (let i = 0; i <= steps; i++) {
    const u = i / steps, x = x0 + (x1 - x0) * u;
    const e = Math.min(1, u / 0.14, (1 - u) / 0.14);
    const k = e <= 0 ? 0 : Math.sqrt(e) * (1.5 - 0.5 * e); // fast swell, long tail
    top.push([x, yc - r * k + n(i * 0.21) * h * 0.08 * k]);
    bot.push([x, yc + r * k * 0.92 + n(i * 0.17 + 50) * h * 0.05 * k]);
  }
  return P([...top, ...bot.reverse()]);
}

function frameRect(inset) { return `M${inset} ${inset}H${W - inset}V${H - inset}H${inset}Z`; }

export function buildPlates() {
  const L = INSET, R = W - INSET, B = H - INSET;
  const C = CARTOUCHE;
  const ys = (fn, x0, x1, step = 6) => { const o = []; for (let x = x0; x <= x1; x += step) o.push([x, fn(x)]); return o; };
  // river first: it rises at the foot of the near bank and widens towards the lower left
  const rn = noise1(53);
  const centre = (t) => [R - (R - L + 40) * t, 1196 + 380 * t ** 1.25 + rn(t * 2.6) * 22];
  const bankA = [], bankB = [], deepA = [], deepB = [];
  for (let i = 0; i <= 80; i++) {
    const t = i / 80, [x, yc] = centre(t);
    const half = 10 + 170 * t ** 1.5, dh = 2 + 34 * t ** 1.7;
    bankA.push([x, yc - half]); bankB.push([x, yc + half * 0.9]);
    deepA.push([x, yc - dh + 16 * t]); deepB.push([x, yc + dh + 16 * t]);
  }
  const river = P([...bankA, ...[...bankB].reverse()]);
  const deepRiver = P([...deepA, ...[...deepB].reverse()]);
  // three ranges: distant (瓶覗), middle (若竹, dissolving into mist), the near bank (若竹) standing on the river
  const farPts = ridgeLine([[L - 30, 742], [110, 700], [196, 628], [252, 660], [350, 582], [430, 520], [500, 590], [575, 640],
    [660, 616], [748, 680], [840, 640], [905, 560], [962, 512], [1030, 596], [1110, 650], [1190, 610], [R + 30, 640]]);
  const midPts = ridgeLine([[L - 30, 860], [70, 830], [150, 792], [230, 836], [330, 760], [400, 724], [470, 790], [560, 838],
    [650, 812], [760, 870], [880, 900]]);
  const nearTop = ridgeLine([[690, 1180], [760, 1120], [840, 1080], [905, 1040], [970, 1072], [1040, 1010], [1110, 978],
    [1170, 1030], [R + 30, 1060]]);
  const bankUnder = bankA.filter(([x]) => x >= 690);
  const farHill = P([[L - 30, 920], ...farPts, [R + 30, 920]]);
  const midHill = P([[L - 30, 1060], ...midPts, [880, 1060]]);
  const nearHill = P([...nearTop, [R + 30, bankA[0][1]], ...bankUnder]);
  const foreBank = P([...bankB, [L - 30, B + 20], [R + 30, B + 20], [R + 30, bankB[0][1]]]);
  const sky = P([[L, L], [R, L], [R + 30, 640], ...[...farPts].reverse(), [L - 30, 742]]);
  // the Tōkaidō on the far bank: Edo upper right → Kyoto lower left, seven stations
  const road = [];
  for (let i = 0; i <= 90; i++) {
    const t = i / 90, [x, yc] = centre(t);
    const half = 10 + 170 * t ** 1.5;
    road.push([x + 18 * Math.sin(t * 7), yc - half - 30 - 34 * (1 - t) + 10 * Math.sin(t * 11)]);
  }
  const stations = [0.05, 0.19, 0.34, 0.49, 0.64, 0.8, 0.95].map((t) => road[Math.round(t * 90)]);
  // pines along the road (並木), larger as the road comes nearer
  const pines = [0.12, 0.27, 0.41, 0.57, 0.72, 0.87].map((t, i) => { const [x, y] = road[Math.round(t * 90)]; return pine(x - 26, y - 4, 0.55 + t * 0.75, i % 2 ? -0.18 : 0.22); });
  // Yahagi bridge (岡崎) across the river at the sixth year
  const bt = 0.6, [bx, byc] = centre(bt), bh = 10 + 170 * bt ** 1.5;
  const bridgeTop = [[bx - 96, byc - bh - 18], [bx + 64, byc + bh * 0.9 + 4]];
  const piers = [];
  for (let k = 1; k < 11; k++) { const u = k / 11; const px = bridgeTop[0][0] + (bridgeTop[1][0] - bridgeTop[0][0]) * u, py = bridgeTop[0][1] + (bridgeTop[1][1] - bridgeTop[0][1]) * u; piers.push(`M${f(px, 1)} ${f(py, 1)}v${f(26 + 6 * u, 1)}`); }
  // rain (庄野): fine 75° lines on a jittered lattice over the lower left
  const rr = rng(97);
  let rain = '';
  for (let gy = 0; gy < 15; gy++) for (let gx = 0; gx < 13; gx++) {
    if (rr() < 0.18) continue;
    const x = L - 160 + gx * 62 + rr() * 40, y = 1100 + gy * 44 + rr() * 30;
    const len = 80 + rr() * 150, wdt = 1.2 + rr() * 1.1, a = (75 * Math.PI) / 180;
    const dx = Math.cos(a) * len, dy = Math.sin(a) * len;
    rain += P([[x, y], [x + wdt, y], [x + wdt + dx, y + dy], [x + dx, y + dy]]);
  }
  const cr = buildCrest({ R: 60, c: [C.x + C.w / 2, 200] });
  // the sheet inside the 匡郭 frame, minus the cartouche: as on a real block, nothing is cut or printed under the
  // cartouche except its own ground (plate 6) and the name
  const box0 = (x, y, w, h) => `M${x} ${y}h${w}v${h}h${-w}z`;
  const clip = `<clipPath id="sheet"><path clip-rule="evenodd" d="${frameRect(L)}${box0(C.x, C.y, C.w, C.h)}"/></clipPath>`;
  const keyLines = [
    `<path d="${Lp(farPts)}" stroke-width="3.5"/>`,
    `<path d="${Lp(midPts)}" stroke-width="4.5"/>`,
    `<path d="${Lp(nearTop)}" stroke-width="5"/>`,
    `<path d="${Lp(bankA)}" stroke-width="4"/>`,
    `<path d="${Lp(bankB)}" stroke-width="4"/>`,
    `<path d="${Lp(road)}" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/>`,
    `<path d="M${f(bridgeTop[0][0], 1)} ${f(bridgeTop[0][1], 1)}L${f(bridgeTop[1][0], 1)} ${f(bridgeTop[1][1], 1)}M${f(bridgeTop[0][0], 1)} ${f(bridgeTop[0][1] + 12, 1)}L${f(bridgeTop[1][0], 1)} ${f(bridgeTop[1][1] + 12, 1)}${piers.join('')}" stroke-width="5"/>`,
    ...pines.map((pn) => `<path d="${pn.pads.join('')}" stroke-width="3"/>`),
  ].join('');
  const box = (x, y, w, h) => `M${x} ${y}h${w}v${h}h${-w}z`;
  // station marks: small kentō Ls (the registration notch), not dots
  const stationMarks = stations.map(([x, y]) => `<path d="M${f(x - 11, 1)} ${f(y - 20, 1)}v20h20v-5h-15v-15z"/>`).join('');
  const crestPaths = `<path d="${cr.paths.ring}"/>` + cr.paths.strips.map((d) => `<path d="${d}"/>`).join('');
  const sheet = (body, defs = '') => `<defs>${clip}${defs}</defs><g clip-path="url(#sheet)">${body}</g>`;

  const plates = {
    1: `<defs>${clip}</defs><g fill="none" stroke="${PLATE_FILLS[0]}"><g clip-path="url(#sheet)">${keyLines}</g>` +
      `<path d="${frameRect(L)}" stroke-width="7"/><path d="${box(C.x, C.y, C.w, C.h)}" stroke-width="6"/><path d="${box(C.x + 12, C.y + 12, C.w - 24, C.h - 24)}" stroke-width="2.5"/></g>` +
      `<g fill="${PLATE_FILLS[0]}">${stationMarks}${crestPaths}${pines.map((pn) => `<path d="${pn.trunk}"/>`).join('')}</g>`,
    2: sheet(`<path d="${midHill}" fill="url(#midfade)"/><path d="${nearHill}" fill="${PLATE_FILLS[1]}"/><g fill="${PLATE_FILLS[1]}">${pines.map((pn) => `<path d="${pn.pads.join('')}"/>`).join('')}</g><path d="${foreBank}" fill="url(#forefade)"/>`,
      fade('midfade', PLATE_FILLS[1], 760, 990, [[0, 1], [0.5, 0.8], [1, 0]]) + fade('forefade', PLATE_FILLS[1], 1380, B, [[0, 0], [0.5, 0.35], [1, 0.7]])),
    3: sheet(`<path d="${suyari(L - 80, 720, 1000, 64, 5)}" fill="url(#m1)"/><path d="${suyari(240, 980, 1064, 40, 8)}" fill="url(#m2)"/><path d="${suyari(600, R + 80, 866, 52, 13)}" fill="url(#m3)"/>`,
      fade('m1', PLATE_FILLS[2], 968, 1032, [[0, 0.08], [0.45, 0.4], [1, 0.03]]) + fade('m2', PLATE_FILLS[2], 1044, 1084, [[0, 0.06], [0.5, 0.32], [1, 0.03]]) + fade('m3', PLATE_FILLS[2], 840, 892, [[0, 0.06], [0.5, 0.36], [1, 0.03]])),
    4: sheet(`<path d="${sky}" fill="url(#dawn)"/>`, fade('dawn', PLATE_FILLS[3], 380, 720, [[0, 0], [0.5, 0.55], [1, 1]])),
    5: sheet(`<path d="${farHill}" fill="url(#farfade)"/><path d="${river}" fill="${PLATE_FILLS[4]}"/>`,
      fade('farfade', PLATE_FILLS[4], 560, 900, [[0, 1], [0.6, 0.85], [1, 0.1]])),
    6: sheet(`<path d="M${L} ${L}H${R}V250H${L}Z" fill="url(#ichimonji)"/><path d="${deepRiver}" fill="${PLATE_FILLS[5]}"/>`,
      fade('ichimonji', PLATE_FILLS[5], L, 250, [[0, 1], [0.35, 0.9], [1, 0]])) +
      `<path d="${box(C.x, C.y, C.w, C.h)}" fill="${PLATE_FILLS[5]}"/>`,
    7: sheet(`<path d="${rain}" fill="url(#rainfade)"/>`, fade('rainfade', PLATE_FILLS[6], 1100, 1800, [[0, 0], [0.3, 0.85], [1, 0.75]])),
    // gold: a pair of bands in the dawn sky and a pair over the bare paper beside the river (never over the green,
    // where even opaque gold reads as a stripe)
    8: sheet(`<g fill="${PLATE_FILLS[7]}"><path d="${suyari(L - 120, 560, 400, 30, 21)}"/><path d="${suyari(130, 720, 444, 20, 34)}"/><path d="${suyari(740, R + 140, 1384, 28, 55)}"/><path d="${suyari(880, R + 140, 1422, 18, 61)}"/></g>`),
  };
  const svg = (body, title) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><title>${title}</title>${body}</svg>\n`;
  const titles = ['壱 主版 紺 — key block', '弐 若竹 — hills', '参 銀鼠 — mist', '肆 一斤染 — dawn', '伍 瓶覗 — river', '陸 ベロ藍 — deep river, ichimonji, cartouche', '漆 鈍 — rain', '捌 金 — gold clouds'];
  const out = {};
  for (let n = 1; n <= 8; n++) out[`plate-${n}.svg`] = svg(plates[n], titles[n - 1]);
  out['cartouche-mask.svg'] = svg(`<path d="M${C.x + 12} ${C.y + 12}h${C.w - 24}v${C.h - 24}h${-(C.w - 24)}z" fill="#fff"/>`, 'cartouche mask — marbling is clipped to this area');
  return { files: out, layout: { viewBox: [0, 0, W, H], cartouche: { x: C.x + 12, y: C.y + 12, w: C.w - 24, h: C.h - 24 }, crest: { cx: cr.centre[0], cy: cr.centre[1], r: cr.R }, seal: { x: 96, y: H - 300, w: 150, h: 183 }, stations: stations.map((p) => p.map((v) => Math.round(v))) } };
}
