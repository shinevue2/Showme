// The traveller (DESIGN §7.2, owner WP-03): one small figure in every chapter — 笠 sugegasa, 紺 kimono with
// kasuri marks, 矢立 (Edo travelling brush case) tucked in the obi, a furoshiki bundle on the back.
// Atlas: 4 cells (walk-a, walk-b, stand, carried — Shimada, on a river porter's shoulders), each 200 × 300 units,
// rasterised with sharp to assets-src/film/traveller.png (1024 × 384, transparent).
// Colours are only paper + plate 1 and its paper tints, so the figure belongs to every palette P_k.
//   node tools/film/traveller.mjs
import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'assets-src/film');
const C = { ink: '#0F2540', a: '#495B70', h: '#83919F', q: '#BDC6CF', paper: '#F7FCFE' };
const K = `stroke="${C.ink}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;

function seg(ax, ay, bx, by, w0, w1) {
  const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy);
  const nx = -dy / len, ny = dx / len;
  return [[ax + nx * w0 / 2, ay + ny * w0 / 2], [bx + nx * w1 / 2, by + ny * w1 / 2], [bx - nx * w1 / 2, by - ny * w1 / 2], [ax - nx * w0 / 2, ay - ny * w0 / 2]];
}
function leg(hx, hy, kx, ky, fx, fy) {
  // thigh + shin (kyahan legging) with a waraji sandal pointing left; the knee joint is a soft round
  const t = seg(hx, hy, kx, ky, 15, 12), sh = seg(kx, ky, fx, fy, 12, 9);
  const P = (q) => q.map((p) => p.join(',')).join(' L');
  return `<path d="M${P(t)} Z" fill="${C.a}" ${K}/>` +
    `<path d="M${P(sh)} Z" fill="${C.a}" ${K}/>` +
    `<circle cx="${kx}" cy="${ky}" r="6" fill="${C.a}"/>` +
    `<path d="M${sh[0][0] * 0.8 + sh[3][0] * 0.2},${(sh[0][1] + sh[3][1]) / 2 + 9} L${sh[3][0] * 0.8 + sh[0][0] * 0.2},${(sh[0][1] + sh[3][1]) / 2 + 9}" stroke="${C.paper}" stroke-width="1.6"/>` +
    `<path d="M${fx + 5},${fy - 2} Q${fx - 6},${fy - 4} ${fx - 15},${fy + 2} L${fx - 15},${fy + 7} L${fx + 7},${fy + 7} Z" fill="${C.q}" ${K}/>`;
}

function hat(cx, cy, s = 1) {
  // sugegasa seen from the side: a wide, shallow cone with straw ribs
  const w = 66 * s, h = 36 * s;
  const ribs = [-0.62, -0.3, 0.02, 0.34, 0.66].map((t) =>
    `<path d="M${cx},${cy - h} L${cx + t * w},${cy + 2 * s}" stroke="${C.h}" stroke-width="${1.6 * s}"/>`).join('');
  return `<path d="M${cx - w},${cy + 2 * s} L${cx},${cy - h} L${cx + w},${cy + 2 * s} Q${cx},${cy + 12 * s} ${cx - w},${cy + 2 * s} Z" fill="${C.paper}" ${K}/>` +
    ribs + `<path d="M${cx - w},${cy + 2 * s} Q${cx},${cy + 12 * s} ${cx + w},${cy + 2 * s}" fill="none" ${K}/>`;
}

function kasuri(x0, y0, x1, y1, seed) {
  // sparse, slightly irregular paper dashes (kasuri ikat), not a grid of crosses
  let s = seed, out = '';
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let y = y0; y < y1; y += 15) {
    for (let x = x0 + ((y / 15) % 2) * 10 + rnd() * 6; x < x1; x += 19 + rnd() * 6) {
      const jy = y + rnd() * 5, l = 3 + rnd() * 3;
      out += `<path d="M${x - l},${jy} L${x + l},${jy - 0.8}" stroke="${C.paper}" stroke-width="1.7" stroke-linecap="round" opacity="${0.75 + rnd() * 0.25}"/>`;
      if (rnd() < 0.45) out += `<path d="M${x - 1},${jy + 3} L${x + 2},${jy + 3.4}" stroke="${C.paper}" stroke-width="1.5" stroke-linecap="round"/>`;
    }
  }
  return out;
}

function traveller(pose) {
  // legs first (behind the kimono hem)
  let legs;
  if (pose === 'walk-a') legs = leg(108, 202, 118, 244, 132, 282) + leg(92, 202, 78, 242, 66, 284);
  else if (pose === 'walk-b') legs = leg(104, 202, 112, 244, 110, 280) + leg(96, 202, 88, 242, 86, 284);
  else legs = leg(107, 202, 108, 244, 109, 284) + leg(93, 202, 91, 244, 89, 284);
  const lean = pose === 'stand' ? 0 : -5;
  const body =
    // furoshiki bundle on the back
    `<path d="M118,96 Q150,90 158,108 Q164,132 150,146 Q130,154 118,142 Z" fill="${C.h}" ${K}/>` +
    `<path d="M128,102 q6,10 0,22 M140,100 q7,14 2,30" stroke="${C.paper}" stroke-width="1.8" fill="none"/>` +
    // kimono, hem tucked up
    `<clipPath id="kc-${pose}"><path d="M72,86 Q62,140 70,208 L130,208 Q138,140 128,86 Q100,78 72,86 Z"/></clipPath>` +
    `<path d="M72,86 Q62,140 70,208 L130,208 Q138,140 128,86 Q100,78 72,86 Z" fill="${C.ink}" ${K}/>` +
    `<g clip-path="url(#kc-${pose})">${kasuri(64, 96, 136, 206, pose.length * 7 + 3)}</g>` +
    // furoshiki strap across the chest, knot in front
    `<path d="M124,98 Q104,104 84,118" stroke="${C.h}" stroke-width="6" fill="none" stroke-linecap="round"/>` +
    `<circle cx="83" cy="119" r="5.5" fill="${C.h}" ${K}/>` +
    // collar
    `<path d="M84,86 L95,110 L102,86 Z" fill="${C.paper}" ${K}/>` +
    // obi
    `<path d="M68,140 L131,142 L131,154 L68,152 Z" fill="${C.h}" ${K}/>` +
    // 矢立 yatate: brush tube slanting out of the obi, ink pot at its foot
    `<path d="M74,147 L56,127" stroke="${C.ink}" stroke-width="5.5" stroke-linecap="round"/>` +
    `<path d="M73,145 L58,128" stroke="${C.q}" stroke-width="1.4" stroke-linecap="round"/>` +
    `<circle cx="76" cy="150" r="6" fill="${C.a}" ${K}/>` +
    // near sleeve and hand
    `<path d="M76,94 Q58,128 64,166 L86,164 Q84,128 92,100 Z" fill="${C.ink}" stroke="${C.paper}" stroke-width="1.6" stroke-linejoin="round"/>` +
    `<path d="M66,164 q4,10 14,6 q2,-6 -2,-8 Z" fill="${C.q}" ${K}/>` +
    // face under the brim
    `<path d="M80,68 Q72,80 78,90 L94,90 L96,68 Z" fill="${C.q}" ${K}/>` +
    hat(100, 70);
  return `<g>${legs}<g transform="rotate(${lean} 100 205)">${body}</g></g>`;
}

function carried() {
  // a river porter (kawagoshi ninsoku) wading, the traveller astride his shoulders (Shimada)
  const porterBack =
    leg(112, 232, 122, 262, 134, 288).replaceAll(C.a, C.q) + leg(90, 232, 76, 260, 66, 288).replaceAll(C.a, C.q) +
    `<path d="M66,172 Q76,160 100,160 Q124,160 132,174 L124,228 Q100,236 78,228 Z" fill="${C.q}" ${K}/>` +
    `<path d="M76,222 Q100,230 126,222 L128,240 Q100,246 74,240 Z" fill="${C.h}" ${K}/>`;
  const rider =
    `<g transform="translate(28 34) scale(0.8)">` +
    `<path d="M118,96 Q150,90 158,108 Q164,132 150,146 Q130,154 118,142 Z" fill="${C.h}" ${K}/>` +
    `<clipPath id="kc-car"><path d="M72,86 Q64,120 70,156 L132,156 Q136,120 128,86 Q100,78 72,86 Z"/></clipPath>` +
    `<path d="M72,86 Q64,120 70,156 L132,156 Q136,120 128,86 Q100,78 72,86 Z" fill="${C.ink}" ${K}/>` +
    `<g clip-path="url(#kc-car)">${kasuri(64, 96, 136, 156, 11)}</g>` +
    `<path d="M84,86 L95,110 L102,86 Z" fill="${C.paper}" ${K}/>` +
    `<path d="M68,128 L131,130 L131,142 L68,140 Z" fill="${C.h}" ${K}/>` +
    `<path d="M74,135 L56,115" stroke="${C.ink}" stroke-width="5.5" stroke-linecap="round"/>` +
    `<circle cx="76" cy="138" r="6" fill="${C.a}" ${K}/>` +
    `<path d="M80,68 Q72,80 78,90 L94,90 L96,68 Z" fill="${C.q}" ${K}/>` +
    hat(100, 70) + `</g>`;
  const front =
    // porter's head in front of the rider, the rider's near leg over his shoulder, porter's hands on the shins
    `<circle cx="84" cy="150" r="14" fill="${C.q}" ${K}/>` +
    `<path d="M80,140 q-6,2 -8,8" stroke="${C.ink}" stroke-width="2" fill="none"/>` +
    `<path d="M92,150 Q72,156 64,180 L77,186 Q84,168 100,162 Z" fill="${C.a}" ${K}/>` +
    `<path d="M60,184 q-2,8 8,8 l8,-2 l-2,-6 Z" fill="${C.q}" ${K}/>` +
    `<path d="M70,176 Q62,190 70,200" stroke="${C.q}" stroke-width="10" fill="none" stroke-linecap="round"/>` +
    `<path d="M70,176 Q62,190 70,200" stroke="${C.ink}" stroke-width="2" fill="none" stroke-dasharray="0 0"/>`;
  return `<g>${porterBack}${rider}${front}</g>`;
}

const cells = [traveller('walk-a'), traveller('walk-b'), traveller('stand'), carried()];
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 300" width="1024" height="384">` +
  cells.map((c, i) => `<g transform="translate(${i * 200} 0)">${c}</g>`).join('') + `</svg>`;
mkdirSync(OUT, { recursive: true });
writeFileSync(path.join(OUT, 'traveller.svg'), svg);
await sharp(Buffer.from(svg), { density: 96 * 1.28 }).resize(1024, 384).png({ compressionLevel: 9 }).toFile(path.join(OUT, 'traveller.png'));
console.log('traveller atlas → assets-src/film/traveller.png');
