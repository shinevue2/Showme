/**
 * Gold-leaf chunk (DESIGN §6.4 "Gold leaf", threejs §e2–e3). Owner: WP-07.
 *
 * `BYOBU_VERT` — the six-panel zig-zag fold (threejs §e2, verified) on a geometry whose hinge columns are
 *   duplicated per panel (attribute `aPanel`), so every fragment knows its panel exactly.
 * `GOLD_FRAG` — the byōbu material: 109 mm leaf squares (3寸6分) in staggered rows with 箔足 overlap seams
 *   (a double-thickness strip and the cut edge of the upper leaf), per-leaf tilt, tone and anisotropy
 *   direction, crinkle normals, worn patches showing the 弁柄 ground, gold Fresnel F0 (1.0, 0.766, 0.336),
 *   a Ward anisotropic highlight from one candle that follows the pointer, a procedural room for reflections
 *   (`envRoom`: shoji daylight, or andon and moonlight at night), matte mineral pigment from `tArt` (alpha =
 *   pigment), the lacquered 縁 frame with 飾金具 corner fittings and a brocade 縁裂, and on the back face the
 *   下地骨 — the wooden lattice core (pitch = panel width / 6) with torn paper remnants. No bloom: highlights
 *   roll off through a soft shoulder instead of clipping.
 * Tiers through uniforms only (no #define, no recompiles): uDetail 2 = Ward + crinkle + fbm4 wear,
 *   1 = Ward + fbm2, 0 = Blinn-Phong + the baked wear mask `tWear`.
 * `GOLD_LEAF` — the leaf BRDF alone, for anyone else who needs gold leaf (`goldLeafColor()`).
 * The research originals stay available as `GOLD_FRAG_RESEARCH` / `BYOBU_VERT_RESEARCH`.
 */
import { NOISE } from './research';

export { NOISE } from './research';
export { GOLD_FRAG as GOLD_FRAG_RESEARCH, BYOBU_VERT as BYOBU_VERT_RESEARCH } from './research';

export const BYOBU_VERT = /* glsl */`
attribute float aPanel;
uniform float uPanels, uPanelW, uPanelH, uFold;   // fold = hinge angle (0 flat … ~1.45 closed)
varying vec2 vUv;
varying vec3 vWorld;
varying float vPanel;
varying vec2 vLocal;                              // panel-local, world units: x 0..uPanelW, y 0..uPanelH
void main(){
  vUv = uv;
  vPanel = aPanel;
  float u = uv.x * uPanels;
  float f = u - aPanel;
  float c = cos(uFold), s = sin(uFold);
  float x = (u * uPanelW - 0.5 * uPanels * uPanelW) * c;
  float z = ((mod(aPanel, 2.0) < 0.5 ? f : 1.0 - f) - 0.5) * uPanelW * s;     // zig-zag, centred in depth
  vLocal = vec2(f * uPanelW, uv.y * uPanelH);
  vec4 wp = modelMatrix * vec4(x, position.y, z, 1.0);
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

/** Leaf BRDF helpers (needs NOISE). */
export const GOLD_LEAF = /* glsl */`
const vec3 GOLD_F0 = vec3(1.0, 0.766, 0.336);
vec3 fresnelGold(float NoV){ return GOLD_F0 + (1.0 - GOLD_F0) * pow(1.0 - NoV, 5.0); }
float wardAniso(vec3 n, vec3 t, vec3 b, vec3 h, float NoL, float NoV, float ax, float ay){
  float NoH = max(dot(n, h), 1e-3);
  float th = dot(t, h) / ax, bh = dot(b, h) / ay;
  return exp(-(th * th + bh * bh) / (NoH * NoH)) / (12.566 * ax * ay * sqrt(max(NoL * NoV, 1e-4)));
}
// a room seen in the leaf: day = shoji daylight from the upper left, warm ceiling, dark tatami;
// night = darkness, an andon glow low right and a faint moonlit shoji
vec3 envRoom(vec3 r, float night){
  // day: a warm room (tatami, cedar, paper walls) — gold takes its colour from what it reflects
  vec3 c = mix(vec3(0.07, 0.05, 0.025), vec3(0.30, 0.235, 0.14), smoothstep(-0.55, 0.05, r.y));
  c = mix(c, vec3(0.46, 0.38, 0.25), smoothstep(0.30, 0.95, r.y));
  // shoji, upper left: a broad window whose light falls off across the leaf (a gradient, never a flat plateau)
  float sh = max(dot(r, normalize(vec3(-0.80, 0.30, 0.52))), 0.0);
  c += vec3(0.66, 0.58, 0.44) * (sh * sh * sh * sh) * smoothstep(0.35, 0.80, sh);
  c += vec3(0.12, 0.11, 0.10) * smoothstep(0.80, 0.99, dot(r, normalize(vec3(0.70, 0.15, 0.70))));
  // night: a room lit by one andon — its warmth bounces off tatami and cedar, so the leaf never goes grey;
  // the andon itself low right (broad: a paper shade, not a bulb), the moonlit shoji only a hint
  vec3 n = vec3(0.052, 0.031, 0.013);
  n += vec3(0.34, 0.16, 0.050) * smoothstep(0.10, 0.97, dot(r, normalize(vec3(0.60, -0.30, 0.74))));
  n += vec3(0.008, 0.011, 0.020) * smoothstep(0.50, 0.95, dot(r, normalize(vec3(-0.80, 0.30, 0.52))));
  return mix(c, n, night);
}
vec3 softShoulder(vec3 c){
  vec3 k = vec3(0.78);
  vec3 over = max(c - k, 0.0);
  return min(c, k) + (1.0 - k) * (1.0 - exp(-over / (1.0 - k)));
}
`;

export const GOLD_FRAG = /* glsl */`
uniform sampler2D tArt;
uniform sampler2D tWear;
uniform float uArtOn, uDetail, uLeafPerUnit, uPanelW, uPanelH, uPanels, uFold, uTurn, uAlpha, uWear, uTime, uNight, uMotion, uOutline;
uniform vec2 uSeed;
uniform vec3 uLightPos, uLightCol, uKeyDir;
uniform float uLightDay, uLightNight;
uniform vec3 uSumi, uBengara, uBrocade, uWood, uUnder, uWashi, uInk;
varying vec2 vUv;
varying vec3 vWorld;
varying float vPanel;
varying vec2 vLocal;
${NOISE}
${GOLD_LEAF}

float aaLine(float d, float w){ float fw = max(fwidth(d), 1e-5); return 1.0 - smoothstep(w - fw, w + fw, d); }

void main(){
  vec3 N = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
  vec3 V = normalize(cameraPosition - vWorld);
  if (dot(N, V) < 0.0) N = -N;
  // panel tangent (along the panel's width) from derivatives: constant per panel
  vec3 dpx = dFdx(vWorld), dpy = dFdy(vWorld);
  float dvx = dFdx(vLocal.y), dvy = dFdy(vLocal.y);
  vec3 T = dpx * dvy - dpy * dvx;
  T = normalize(T - N * dot(T, N) + 1e-6);
  vec3 B = normalize(cross(N, T));

  vec2 P = vLocal;
  float W = uPanelW, H = uPanelH;
  float last = uPanels - 1.0;

  vec3 Lv = uLightPos - vWorld;
  float d2 = dot(Lv, Lv);
  vec3 L = Lv * inversesqrt(d2);
  float lightPow = mix(uLightDay, uLightNight, uNight);
  vec3 Ic = uLightCol * lightPow / (1.0 + 0.30 * d2);
  vec3 K = normalize(uKeyDir);
  float keyAmt = 1.0 - uNight;

  // ---------- outline view: keylines only ----------
  if (uOutline > 0.5) {
    float edgeD = min(min(P.y, H - P.y), min(P.x, W - P.x));
    float g = aaLine(edgeD, 0.004);
    vec2 lg = P * uLeafPerUnit;
    vec2 lf = abs(fract(lg) - 0.5);
    float leafLines = max(aaLine(0.5 - lf.x, 0.002 * uLeafPerUnit), aaLine(0.5 - lf.y, 0.002 * uLeafPerUnit)) * 0.35;
    float a = max(g, leafLines) * uAlpha;
    gl_FragColor = vec4(uInk, 1.0);
    #include <colorspace_fragment>
    gl_FragColor = vec4(gl_FragColor.rgb * a, a);
    return;
  }

  vec3 col;
  if (!gl_FrontFacing) {
    // ---------- 下地骨: the lattice core seen from behind ----------
    float pitch = W / 6.0;
    vec2 q = P / pitch;
    vec2 fq = fract(q);
    vec2 dl = min(fq, 1.0 - fq) * pitch;                    // distance to the nearest lath centre line (units)
    float lw = 0.011;                                       // half lath width (≈ 1.2 cm laths)
    float lathV = aaLine(dl.x, lw), lathH = aaLine(dl.y, lw);
    float stile = aaLine(min(min(P.x, W - P.x), min(P.y, H - P.y)), 0.026);   // the panel's own frame (框)
    float overV = step(0.5, fract((floor(q.x) + floor(q.y)) * 0.5));          // half-lap: who lies on top
    float wood = max(max(lathV, lathH), stile);
    float grainAlong = mix(P.y, P.x, step(lathV, lathH) * (1.0 - stile));
    float grain = 0.86 + 0.14 * vnoise(vec2(grainAlong * 60.0, (lathV > lathH ? P.x : P.y) * 900.0));
    vec3 woodCol = uWood * grain;
    woodCol *= mix(1.0, 0.86, lathV * lathH * overV);       // the lower lath at a joint sits in shade
    // under-papers seen through the cells, darker near the laths (recessed)
    float rec = smoothstep(lw, lw + 0.03, min(dl.x, dl.y));
    vec3 under = uUnder * (0.80 + 0.20 * fbm(P * 7.0 + uSeed)) * mix(0.70, 1.0, rec);
    // the under-layers are recycled paper (反故紙): faint columns of old brush writing
    float colX = fract(P.x * 7.5 + 0.13 * floor(P.y * 1.3));
    float glyph = smoothstep(0.55, 0.75, vnoise(vec2(floor(P.x * 7.5) * 3.7, P.y * 26.0))) * (1.0 - smoothstep(0.18, 0.32, abs(colX - 0.5)));
    under = mix(under, under * 0.32, glyph * 0.7 * step(0.40, hash21(vec2(floor(P.x * 7.5), floor(P.y * 0.9)))));
    // torn washi remnants still pasted on the lattice, with fibrous edges
    // remnants cling where the backing was pasted hardest: along the panel's frame, and a few torn islands
    float edgeD = min(min(P.x, W - P.x), min(P.y, H - P.y));
    float torn = fbm(P * 2.6 + uSeed * 3.1) + 0.12 * (vnoise(P * 22.0) - 0.5) + 0.06 * (vnoise(P * 90.0) - 0.5)
               + 0.22 * (1.0 - smoothstep(0.02, 0.16, edgeD));
    float paper = smoothstep(0.700, 0.712, torn);
    float fibre = 0.92 + 0.08 * vnoise(P * vec2(40.0, 220.0));
    vec3 washi = uWashi * fibre * (0.80 + 0.12 * smoothstep(0.70, 0.78, torn));
    col = mix(under, woodCol, wood);
    col = mix(col, washi, paper * (1.0 - stile * 0.6));
    float NoK = max(dot(N, K), 0.0), NoLc = max(dot(N, L), 0.0);
    vec3 lit = vec3(0.62 + 0.38 * NoK) * keyAmt + vec3(0.07) * uNight + Ic * NoLc * 0.9;
    col *= lit;
    gl_FragColor = vec4(softShoulder(col), 1.0);
    #include <colorspace_fragment>
    gl_FragColor = vec4(gl_FragColor.rgb * uAlpha, uAlpha);
    return;
  }

  // ---------- front: frame, brocade, gold field ----------
  float isLeft = step(vPanel, 0.5), isRight = step(last - 0.5, vPanel);
  float big = 9.0;
  float dTop = H - P.y, dBot = P.y;
  float dL = mix(big, P.x, isLeft), dR = mix(big, W - P.x, isRight);
  float dEdge = min(min(dTop, dBot), min(dL, dR));
  float frameW = 0.046, heriW = 0.052;
  float aaE = max(fwidth(dEdge), 1e-5);
  float inFrame = 1.0 - smoothstep(frameW - aaE, frameW + aaE, dEdge);
  float inHeri = (1.0 - smoothstep(frameW + heriW - aaE, frameW + heriW + aaE, dEdge)) * (1.0 - inFrame);
  float hingeD = min(mix(P.x, big, isLeft), mix(W - P.x, big, isRight));    // inner hinges only

  // gold leaf: restarts on every panel (each was gilded before mounting), staggered rows
  vec2 g = P * uLeafPerUnit + vec2(vPanel * 0.37 + uSeed.x, vPanel * 0.61 + uSeed.y);
  float row = floor(g.y);
  g.x += 0.5 * mod(row, 2.0) + 0.06 * (hash21(vec2(row, vPanel)) - 0.5);
  vec2 cell = floor(g), f = fract(g);
  float rnd = hash21(cell), rnd2 = hash21(cell + 17.31), rnd3 = hash21(cell + 41.7);
  vec2 aaG = max(fwidth(g), vec2(1e-5));
  // 箔足: the upper leaf's left and bottom margins lie over its neighbours (double thickness);
  // its cut edge (at the cell boundary) throws a hair of shadow, the lower leaf's edge shows through faintly
  float ov = 0.030 + 0.016 * rnd2;
  vec2 inOv = 1.0 - smoothstep(vec2(ov) - aaG, vec2(ov) + aaG, f);
  float overlap = max(inOv.x, inOv.y);
  vec2 cutD = f / aaG;                                       // pixels from the upper leaf's cut edge
  float cut = max(1.0 - smoothstep(0.0, 1.4, cutD.x), 1.0 - smoothstep(0.0, 1.4, cutD.y));
  vec2 lowD = abs(f - ov) / aaG;
  float lowEdge = max(1.0 - smoothstep(0.0, 1.0, lowD.x), 1.0 - smoothstep(0.0, 1.0, lowD.y));
  // normals: per-leaf tilt, a ridge along the cut edge, hammered crinkles
  vec2 tilt = (vec2(rnd, rnd3) - 0.5) * 0.042;
  vec2 crinkle = vec2(0.0);
  if (uDetail > 1.5) crinkle = (vec2(vnoise(g * vec2(11.0, 27.0)), vnoise(g * vec2(25.0, 9.0) + 7.3)) - 0.5) * 0.10;
  else if (uDetail > 0.5) crinkle = (vec2(vnoise(g * 14.0), vnoise(g * 14.0 + 3.7)) - 0.5) * 0.05;
  vec2 ridge = vec2(1.0 - smoothstep(0.0, 1.6, cutD.x), 1.0 - smoothstep(0.0, 1.6, cutD.y)) * 0.07;
  vec3 n = normalize(N + T * (tilt.x + crinkle.x - ridge.x) + B * (tilt.y + crinkle.y - ridge.y));

  // wear: the 弁柄 ground shows through where hands and hinges rubbed the leaf thin
  float wearN;
  if (uDetail > 1.5) wearN = fbm(P * 3.1 + uSeed * 5.0);
  else if (uDetail > 0.5) wearN = 0.5 * vnoise(P * 3.1 + uSeed * 5.0) + 0.25 * vnoise(P * 6.3 + 9.1) + 0.12;
  else wearN = texture2D(tWear, fract(vec2(vUv.x * 2.0, vUv.y * 5.5))).r * 0.75;
  float wearBias = 0.16 * (1.0 - smoothstep(0.0, 0.30, P.y)) + 0.12 * (1.0 - smoothstep(0.0, 0.07, hingeD))
                 + 0.05 * (1.0 - smoothstep(0.0, 0.22, dTop));
  // rubbed thin, not stained: streaks along the panel's width where hands and the folding hinges wore the leaf
  float streak = vnoise(vec2(P.x * 9.0, P.y * 70.0) + uSeed);
  float wear = smoothstep(0.70, 0.80, wearN + wearBias + 0.10 * (streak - 0.5)) * (0.25 + 0.45 * streak) * uWear;

  // leaf BRDF
  float NoV = max(dot(n, V), 1e-3), NoL = max(dot(n, L), 0.0);
  vec3 F = fresnelGold(NoV);
  float ang = (rnd - 0.5) * 0.7;                            // hammering direction differs a little per leaf
  vec3 t = normalize(T * cos(ang) + B * sin(ang));
  t = normalize(t - n * dot(t, n));
  vec3 b = cross(n, t);
  vec3 h = normalize(L + V);
  float spec;
  if (uDetail > 0.5) {
    spec = wardAniso(n, t, b, h, NoL, NoV, 0.14, 0.36) + 0.18 * wardAniso(n, t, b, h, NoL, NoV, 0.42, 0.85);
  } else {
    spec = pow(max(dot(n, h), 0.0), 70.0) * 3.2 + pow(max(dot(n, h), 0.0), 8.0) * 0.25;
  }
  // the room is reflected by a calmer normal than the candle: tilts scatter glints, not the whole leaf's tone
  vec3 nEnv = normalize(N + T * (tilt.x * 0.35 + crinkle.x * 0.5 - ridge.x) + B * (tilt.y * 0.35 + crinkle.y * 0.5 - ridge.y));
  vec3 R = reflect(-V, nEnv);
  // each leaf beaten to its own thinness and alloy: a little tone and hue, plus a slow patina across the panel
  float patina = uDetail > 0.5 ? 0.90 + 0.20 * vnoise(P * 2.2 + uSeed * 1.7) : 1.0;
  vec3 tone = (0.955 + 0.09 * rnd2) * patina * mix(vec3(1.0, 0.985, 0.95), vec3(0.985, 1.0, 1.04), rnd3);
  // beaten leaf is never a mirror: its crinkles scatter the candle broadly (a warm sheen around the
  // highlight, not a glow — it is reflected light and stays on the leaf)
  float sheen = 0.30 * NoL * (0.75 + 0.25 * rnd2);
  vec3 gold = F * envRoom(R, uNight) * tone + F * Ic * (spec * NoL + sheen * tone);
  gold *= mix(vec3(1.0), vec3(0.97, 0.88, 0.70), overlap * 0.75);      // the double leaf reads deeper and warmer
  gold *= 1.0 - 0.09 * cut - 0.03 * lowEdge;
  // mica-like glints at night (≤ 0.5 % of pixels): single crystals catching the candle
  if (uDetail > 0.5) {
    vec2 gc = floor(g * 9.0);
    float hz = hash21(gc + 3.3);
    if (hz > 0.9955) {
      vec3 gn = normalize(N + T * (hash21(gc + 1.1) - 0.5) * 0.6 + B * (hash21(gc + 2.2) - 0.5) * 0.6);
      gold += F * Ic * pow(max(dot(gn, h), 0.0), 380.0) * 6.0 * uNight;
    }
  }
  vec3 ground = uBengara * (0.30 + 0.55 * max(dot(N, K), 0.0) * keyAmt + 0.5 * Ic * max(dot(N, L), 0.0)) * (0.8 + 0.2 * vnoise(P * 60.0));
  vec3 field = mix(gold, ground, wear);

  // concave hinges (the valleys of the zig-zag) gather shade
  float valleyD = mod(vPanel, 2.0) < 0.5 ? P.x : W - P.x;
  float ao = 1.0 - 0.28 * sin(uFold) * (1.0 - smoothstep(0.0, 0.30, valleyD));
  field *= ao;

  // matte mineral pigment from the Rinpa crops (alpha = pigment; the gold ground was removed)
  vec2 artUv = vec2((last - vPanel + P.x / W) / uPanels, P.y / H);
  vec4 art = texture2D(tArt, artUv);
  float pa = art.a * uArtOn;
  if (pa > 0.002) {
    vec3 nP = normalize(N + T * crinkle.x * 0.4 + B * crinkle.y * 0.4);
    float grainP = uDetail > 1.5 ? 0.92 + 0.16 * hash21(floor(P * 700.0)) : 1.0;
    vec3 irr = vec3(0.86, 0.82, 0.76) * (0.62 + 0.42 * max(dot(nP, K), 0.0)) * keyAmt
             + vec3(0.09, 0.075, 0.06) * uNight + Ic * max(dot(nP, L), 0.0) * 0.85;
    vec3 pigment = art.rgb * irr * grainP * ao;
    field = mix(field, pigment, pa);
  }

  // inner hinges: the paper hinge gap
  float hinge = aaLine(hingeD, 0.0035);
  field *= 1.0 - 0.55 * hinge;

  // 縁裂 brocade: a dark woven band with gold thread, and the thin gold 一文字 where it meets the painting
  vec3 brocade = uBrocade * (0.82 + 0.18 * vnoise(P * vec2(420.0, 420.0)));
  float thread = step(0.80, hash21(floor(P * 260.0))) * (1.0 - smoothstep(0.3, 0.9, max(fwidth(P.x), fwidth(P.y)) * 260.0));
  brocade = mix(brocade, F * envRoom(R, uNight) * 0.7, thread * 0.55);
  float ichimonji = aaLine(abs(dEdge - (frameW + heriW)), 0.0028);
  brocade *= 0.55 + 0.45 * max(dot(N, K), 0.0) * keyAmt + 0.25 * uNight + 0.6 * Ic * max(dot(N, L), 0.0);

  // 縁: black lacquer with a soft gloss; gilt 飾金具 fittings at the panel corners
  vec3 hL = normalize(L + V);
  float gloss = pow(max(dot(N, hL), 0.0), 90.0);
  vec3 lacquer = uSumi * (0.55 + 0.45 * max(dot(N, K), 0.0) * keyAmt)
               + 0.04 * envRoom(reflect(-V, N), uNight) + Ic * gloss * 0.35;
  float rim = aaLine(abs(dEdge - 0.004), 0.0025) * 0.5;
  lacquer += rim * 0.04 * envRoom(vec3(0.0, 1.0, 0.0), uNight);
  float corner = min(P.x, W - P.x);
  float fit = (1.0 - smoothstep(0.075, 0.075 + aaE, corner)) * inFrame * step(min(dTop, dBot), frameW + aaE);
  vec3 fitting = fresnelGold(max(dot(N, V), 1e-3)) * (envRoom(reflect(-V, N), uNight) * 0.85 + Ic * gloss * 2.0) * 0.9;
  fitting *= 0.85 + 0.15 * step(0.5, hash21(floor(P * 900.0)));      // 魚々子 punched texture

  col = field;
  col = mix(col, brocade, inHeri);
  col = mix(col, F * envRoom(R, uNight) * 0.95 + F * Ic * spec * 0.5, ichimonji * (1.0 - inFrame));
  col = mix(col, mix(lacquer, fitting, fit), inFrame);

  // the face dulls as the screen turns away (works-skills band)
  col *= mix(1.0, 0.6, smoothstep(0.12, 0.5, uTurn));
  gl_FragColor = vec4(softShoulder(col), 1.0);
  #include <colorspace_fragment>
  gl_FragColor = vec4(gl_FragColor.rgb * uAlpha, uAlpha);   // premultiplied (material.premultipliedAlpha)
}`;
