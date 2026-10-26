/**
 * すやり霞 mist cards and the gold suyari clouds (DESIGN §7.1–§7.2, owner WP-03).
 * Screen-space bands with crisp long edges, drawn over the dioramas: paper cards with long half-ellipse ends,
 * clouds (tinted and gold) with tapering spear ends.
 *
 * Crossing (each travel segment): paper cards sweep in from the right, their stepped ends drifting over the
 * departing diorama; while they cover the frame a paper veil hides the 40-unit gap between stations; then the
 * arriving diorama's own mist bank, drawn out over the whole frame, takes over (rest-mist.ts), their clouds pale
 * into the paper, the cards are taken away (paper on paper, unseen) and the bank withdraws to uncover the scene.
 * Two cards carry stepped clouds in the colour of the plate that is about to be printed (25 % over paper), so
 * each crossing previews its new colour in the language of the gold clouds that end the film.
 * Outro (13.8 → 16.0 s): the cards close in for good (rain thins into mist, clouds in the grey of plate 7), the
 * frame becomes paper, and the gold clouds (plate 8 at 50 % over paper, the P_8 tint) drift in from the right
 * and rise into the exact `endBands` of the manifest: the last frame is paper with three gold clouds (seven
 * tiers). Band geometry contract (shared with the DOM bands of road-works, WP-06): { y: top edge, h: height,
 * x0: left end, x1: right end } in normalised frame coordinates (y down); spear ends as in end-bands.json /
 * end-band-path.ts.
 */
import * as THREE from 'three';
import { MIST_FRAG, MIST_MAX, MIST_VERT } from './wipe.glsl';
import { mulberry32, phase, sine, smooth, smoother, type VariantSpec } from './timeline';
import { hexToRgb } from './tatebanko';
import endBands from './end-bands.json';
import { END_PROFILE } from './end-band-path';

export interface Band { x0: number; x1: number; y: number; h: number; rgb: [number, number, number]; taper: number; o: number }
export interface EndBand { y: number; h: number; x0: number; x1: number }

/** Final gold clouds (shared with publish.mjs → film-manifest endBands / endBandsPortrait). */
export const END_BANDS: EndBand[] = endBands.landscape;
export const END_BANDS_PORTRAIT: EndBand[] = endBands.portrait;
/** clouds: spear ends (a negative taper selects them in MIST_FRAG), end length taper × h */
export const END_TAPER: number = -endBands.taper;

const PAPER: [number, number, number] = [247, 252, 254];
const GOLD = hexToRgb(endBands.color);
/** plate colour at `amt` over paper (the film's P_k tints) */
const tint = (hex: string, amt: number): [number, number, number] => {
  const c = hexToRgb(hex);
  return [Math.round(PAPER[0] + (c[0] - PAPER[0]) * amt), Math.round(PAPER[1] + (c[1] - PAPER[1]) * amt), Math.round(PAPER[2] + (c[2] - PAPER[2]) * amt)];
};

/** one tier of a cloud carried by a card: offset of its left end from the card's left end, length, top, height */
interface Tier { a: number; len: number; y: number; h: number }
interface CardSpec {
  y: number; h: number; L: number; uIn: number; uCov: number; uRel: number; uOut: number; taper: number; cloud: Tier[];
  /** its cloud pales into the paper between fade[0] and fade[1]; at fade[1] the card itself is taken away (it lies
   *  on paper by then: the arriving bank, or the outro veil) */
  fade: [number, number];
}

/**
 * Deterministic card set per crossing (seeded per segment). The cards interlock: vertically they overlap,
 * and between uCov and uRel every card spans the full frame width, so the crossing is never seen.
 * Two cards carry a cloud of three stepped tiers in the colour of the coming plate: one reaching in from the
 * left edge, one from the right (as the gold clouds of the last frame). Tiers lie inside their card (past its end
 * caps, within its height), so they always sit on paper.
 */
function cards(seed: number, portrait: boolean, aspect: number): CardSpec[] {
  const r = mulberry32(seed);
  const out: CardSpec[] = [];
  const n = portrait ? 9 : 7;
  const cloudRows = portrait ? [1, 4, 7] : [1, 4];
  for (let i = 0; i < n; i++) {
    const h = (1 / n) * (1.5 + r() * 0.3);
    const y = i / n - (h - 1 / n) / 2 + (r() - 0.5) * 0.02;
    const L = (portrait ? 2.1 : 1.6) + r() * 0.45;
    const card: CardSpec = {
      y, h, L,
      uIn: 0.19 + r() * 0.07,
      uCov: 0.33 + r() * 0.02,
      uRel: 0.6 + r() * 0.015,
      uOut: 9,
      fade: [0.44, 0.52],
      taper: 1.9 + r() * 0.5,
      cloud: [],
    };
    const j = cloudRows.indexOf((i + (seed % 2)) % n);
    if (j >= 0) {
      // mid-cover the card's left end sits near (xCov + xRel) / 2
      const rN = (h / 2) / aspect;
      const capW = card.taper * rN;
      const xMid = ((-0.02 - capW) + (1.02 + capW - L)) / 2;
      const lo = capW + 0.02, hi = L - capW - 0.02;     // tiers stay inside the card's straight part
      const fromLeft = (j + (seed >> 3)) % 2 === 0;
      // tier heights (fractions of the card): slimmer in portrait, where the frame is narrow and a thick tier
      // whose two spear ends both show would read as a leaf rather than a mist band
      const th = portrait ? [0.22, 0.26, 0.2] : [0.3, 0.36, 0.26];
      const ends = fromLeft ? [0.36, 0.5, 0.27] : [0.56, 0.44, 0.64];   // mid-cover frame-x of the free ends
      let ty = y + h * 0.12;
      for (let t = 0; t < 3; t++) {
        const e = ends[t]! + (r() - 0.5) * 0.06;
        const th_ = h * th[t]!;
        const a = fromLeft ? lo : Math.max(lo, e - xMid);
        const b = fromLeft ? Math.min(hi, e - xMid) : hi;
        if (b - a > 0.05) card.cloud.push({ a, len: b - a, y: ty, h: th_ });
        ty += th_ * 0.8;
      }
    }
    out.push(card);
  }
  return out;
}

/** left end of a card at u: enters from the right, covers, drifts, leaves to the left (velocity-continuous) */
function cardX(c: CardSpec, u: number, aspect: number): number {
  const rN = (c.h / 2) / aspect;                  // cap semi-axis (vertical) in frame widths
  const xCov = -0.02 - c.taper * rN;               // full coverage needs the whole cap off-frame
  const xRel = 1 + 0.02 + c.taper * rN - c.L;      // last position that still spans the frame
  const xEnd = -c.L - 0.02;
  const T = 1.02 - xEnd;
  const w1 = (1.02 - xCov) / T, w2 = (xCov - xRel) / T, w3 = 1 - w1 - w2;
  const G = w1 * sine(c.uIn, c.uCov, u) + w2 * smooth(c.uCov - 0.02, c.uRel + 0.02, u) + w3 * sine(c.uRel, c.uOut, u);
  return 1.02 - T * G;
}

function pushCards(bands: Band[], set: CardSpec[], u: number, aspect: number, plate: string): void {
  // paper cards first (one merged mass), the clouds on top
  const xs = set.map((c) => (u <= c.uIn || u >= c.uOut || u >= c.fade[1] ? null : cardX(c, u, aspect)));
  const pale = set.map((c) => smooth(c.fade[0], c.fade[1], u));
  set.forEach((c, i) => {
    const x0 = xs[i];
    if (x0 == null) return;
    bands.push({ x0, x1: x0 + c.L, y: c.y, h: c.h, rgb: PAPER, taper: c.taper, o: 1 });
  });
  set.forEach((c, i) => {
    const x0 = xs[i];
    if (x0 == null) return;
    for (const t of c.cloud) {
      const a = x0 + t.a;
      if (a > 1.05 || a + t.len < -0.05) continue;
      // paling by colour, not by opacity, so the overlapping tiers stay one flat cloud
      // spear ends at most a quarter of the tier each, so every tier keeps a straight middle (a band, not a lens)
      const taper = -Math.min(-END_TAPER, (t.len * aspect) / (4 * t.h));
      bands.push({ x0: a, x1: a + t.len, y: t.y, h: t.h, rgb: tint(plate, 0.25 * (1 - pale[i]!)), taper, o: 1 });
    }
  });
}

/** travel progress over which the paper veil hides the whole frame (the stations swap behind it, film-scene.ts) */
export const VEIL_FULL: readonly [number, number] = [0.365, 0.465];

export function mistAt(spec: VariantSpec, f: number, plates: readonly string[]): { veil: [number, number, number, number]; bands: Band[] } {
  const ph = phase(spec, f);
  const portrait = spec.variant === 'portrait';
  const aspect = spec.width / spec.height;
  const bands: Band[] = [];
  const veilRgb: [number, number, number] = [PAPER[0] / 255, PAPER[1] / 255, PAPER[2] / 255];
  if (!ph.outro) {
    const u = ph.u;
    // a paper sheet behind the interlocked cards (only ever visible through sub-pixel gaps)
    const veilA = smooth(VEIL_FULL[0] - 0.01, VEIL_FULL[0], u) * (1 - smooth(VEIL_FULL[1], VEIL_FULL[1] + 0.01, u));
    pushCards(bands, cards(4242 + ph.k * 97, portrait, aspect), u, aspect, plates[Math.min(ph.k + 1, 6)]!);
    return { veil: [...veilRgb, veilA], bands };
  }
  // outro: the cards close in and drift on to the left (rain thins into mist); behind them the sheet is paper
  // for good; then the gold clouds drift in from the right and rise into their final places
  const u = ph.u;
  const veilA = smooth(0.38, 0.42, u);
  const set = cards(777, portrait, aspect).map((c) => ({
    ...c, uIn: c.uIn * 0.8, uCov: 0.36 + (c.uCov - 0.33), uRel: 0.62 + (c.uRel - 0.6), fade: [0.5, 0.64] as [number, number],
  }));
  pushCards(bands, set, u, aspect, plates[6]!);
  const ends = portrait ? END_BANDS_PORTRAIT : END_BANDS;
  // tiers that overlap vertically form one cloud; each cloud rises from below the frame while drifting right →
  // left, the top cloud first (it has the longest way), all three settling exactly on the last frame
  const cloudOf: number[] = [];
  ends.forEach((b, i) => {
    const prev = ends[i - 1];
    cloudOf.push(i === 0 ? 0 : prev && b.y <= prev.y + prev.h ? cloudOf[i - 1]! : cloudOf[i - 1]! + 1);
  });
  const top = (c: number) => Math.min(...ends.filter((_, i) => cloudOf[i] === c).map((b) => b.y));
  ends.forEach((b, i) => {
    const c = cloudOf[i]!;
    const e = smoother(0.42 + 0.09 * c, 1.0, u);
    if (e <= 0) return;
    const rise = (1 - e) * (1.03 - top(c));
    const drift = (1 - e) * 0.25;
    bands.push({ x0: b.x0 + drift, x1: b.x1 + drift, y: b.y + rise, h: b.h, rgb: GOLD, taper: END_TAPER, o: 1 });
  });
  return { veil: [...veilRgb, veilA], bands };
}

export class MistLayer {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private mat: THREE.ShaderMaterial;
  constructor(readonly spec: VariantSpec, readonly plates: readonly string[]) {
    this.mat = new THREE.ShaderMaterial({
      vertexShader: MIST_VERT, fragmentShader: MIST_FRAG, transparent: true, premultipliedAlpha: true,
      depthTest: false, depthWrite: false,
      uniforms: {
        uRes: { value: new THREE.Vector2(spec.width, spec.height) },
        uBand: { value: Array.from({ length: MIST_MAX }, () => new THREE.Vector4()) },
        uBandC: { value: Array.from({ length: MIST_MAX }, () => new THREE.Vector4()) },
        uBandO: { value: new Array<number>(MIST_MAX).fill(0) },
        uCount: { value: 0 },
        uVeil: { value: new THREE.Vector4() },
        uSpear: { value: new THREE.Vector2(END_PROFILE.apex, END_PROFILE.power) },
      },
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat);
    mesh.frustumCulled = false;
    this.scene.add(mesh);
  }
  /** returns true when anything is visible */
  update(f: number): boolean {
    const st = mistAt(this.spec, f, this.plates);
    const u = this.mat.uniforms;
    const B = u.uBand!.value as THREE.Vector4[];
    const C = u.uBandC!.value as THREE.Vector4[];
    const O = u.uBandO!.value as number[];
    if (st.bands.length > MIST_MAX) throw new Error(`mist: ${st.bands.length} bands at frame ${f} (max ${MIST_MAX})`);
    const n = st.bands.length;
    for (let i = 0; i < n; i++) {
      const b = st.bands[i]!;
      B[i]!.set(b.x0, b.x1, b.y, b.h);
      C[i]!.set(b.rgb[0] / 255, b.rgb[1] / 255, b.rgb[2] / 255, b.taper);
      O[i] = b.o;
    }
    u.uCount!.value = n;
    (u.uVeil!.value as THREE.Vector4).set(...st.veil);
    return n > 0 || st.veil[3] > 0;
  }
}
