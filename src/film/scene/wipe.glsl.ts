/**
 * Shaders for the tatebanko plates (owner WP-03, DESIGN §7.2–§7.3).
 * Colours are raw sRGB values throughout (a print, not a lit render): no colour-space or tone-mapping chunks,
 * so the paper (#F7FCFE) leaves the renderer exactly as the site's --paper.
 *
 * BAREN_WIPE: the new plate (P_k) is rubbed in over the old impression (P_{k-1}) in five overlapping
 * boustrophedon strokes — left→right, right→left … top to bottom — each with a zig-zag leading edge, the way a
 * printer works the baren across the block. Evaluated in canvas coordinates so every layer of a diorama wipes
 * as one sheet.
 */
export const BAREN_WIPE = /* glsl */ `
float tri(float x) { return abs(fract(x) - 0.5) * 2.0; }
float baren(vec2 p, float t) {
  if (t <= 0.0) return 0.0;
  if (t >= 1.0) return 1.0;
  const float N = 5.0;
  float h = 0.5 / N * 1.38;
  float m = 0.0;
  for (int ii = 0; ii < 5; ii++) {
    float i = float(ii);
    float s = clamp((t * (N + 1.6) - i) / 2.2, 0.0, 1.0);
    s = s * s * (3.0 - 2.0 * s);
    float front = s * 1.36 - 0.18;
    float zig = 0.045 * (tri(p.y * 9.0 + i * 0.37) - 0.5);
    float x = mod(i, 2.0) < 0.5 ? p.x : 1.0 - p.x;
    float rev = 1.0 - smoothstep(front - 0.012, front + 0.012, x + zig);
    float yc = (i + 0.5) / N;
    float band = 1.0 - smoothstep(h - 0.012, h + 0.012, abs(p.y - yc) + 0.018 * (tri(p.x * 11.0 + i * 0.21) - 0.5));
    m = max(m, rev * band);
  }
  return m;
}
`;

export const PLATE_VERT = /* glsl */ `
attribute vec2 canvasUv;
varying vec2 vUv;
varying vec2 vCanvas;
void main() {
  vUv = uv;
  vCanvas = canvasUv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const PLATE_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D mapK;
uniform sampler2D mapP;
uniform float uHasP;
uniform float uWipe;
uniform float uOpacity;
uniform float uAlphaCut;
varying vec2 vUv;
varying vec2 vCanvas;
${BAREN_WIPE}
void main() {
  vec4 c = texture2D(mapK, vUv);
  if (uHasP > 0.5 && uWipe < 1.0) {
    vec4 p = texture2D(mapP, vUv);
    c = mix(p, c, baren(vCanvas, uWipe));
  }
  if (c.a < uAlphaCut) discard;
  gl_FragColor = c * uOpacity;            // premultiplied
}
`;

export const SHADOW_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D map;
uniform vec3 uColor;
uniform float uOpacity;
varying vec2 vUv;
varying vec2 vCanvas;
void main() {
  // contact strip: only the foot of the plate (its lowest ~16 %) leaves a shadow on the plate behind it
  float foot = 1.0 - smoothstep(0.0, 0.16, vUv.y);
  float a = texture2D(map, vUv).r * uOpacity * foot;
  gl_FragColor = vec4(uColor * a, a);
}
`;

/** Procedural bokashi sky: two gradients (P_k and P_{k-1}) in canvas y, wiped like the plates. */
export const SKY_FRAG = /* glsl */ `
precision highp float;
uniform float uStopY[8];
uniform vec3 uStopK[8];
uniform vec3 uStopP[8];
uniform int uCount;
uniform float uWipe;
uniform float uHasP;
uniform float uOpacity;
varying vec2 vUv;
varying vec2 vCanvas;
${BAREN_WIPE}
vec3 grad(float y, bool prev) {
  vec3 c = prev ? uStopP[0] : uStopK[0];
  for (int i = 1; i < 8; i++) {
    if (i >= uCount) break;
    float y0 = uStopY[i - 1];
    float y1 = uStopY[i];
    vec3 c1 = prev ? uStopP[i] : uStopK[i];
    float t = clamp((y - y0) / max(1e-5, y1 - y0), 0.0, 1.0);
    t = t * t * (3.0 - 2.0 * t);
    if (y >= y0) c = mix(c, c1, t);
  }
  return c;
}
void main() {
  vec3 k = grad(vCanvas.y, false);
  vec3 c = k;
  if (uHasP > 0.5 && uWipe < 1.0) c = mix(grad(vCanvas.y, true), k, baren(vCanvas, uWipe));
  gl_FragColor = vec4(c * uOpacity, uOpacity);
}
`;

/** Flat colour quads (frame line, figures' helpers). */
export const FLAT_FRAG = /* glsl */ `
precision highp float;
uniform vec3 uColor;
uniform float uOpacity;
varying vec2 vUv;
varying vec2 vCanvas;
void main() { gl_FragColor = vec4(uColor * uOpacity, uOpacity); }
`;

/**
 * Screen-space mist and gold suyari bands: up to 24 bands composited in order over an optional full-frame veil.
 * Band = (x0, x1, yTop, height) in normalised frame coords (y down); colour rgb + taper; opacity.
 * Every band has crisp long edges. taper > 0: half-ellipse ends (the paper cards), vertical semi-axis h / 2,
 * horizontal semi-axis taper × h / 2 (in pixels, so the shape is the same at any aspect), clamped to half the
 * band length. taper < 0: spear ends of the すやり霞 clouds (gold outro and the tinted crossing clouds), end
 * length −taper × h, the tip at uSpear.x of the height, edges opening as sin(πt/2)^uSpear.y — the
 * film-manifest endBands contract (end-bands.json, end-band-path.ts).
 */
export const MIST_MAX = 24;

export const MIST_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

export const MIST_FRAG = /* glsl */ `
precision highp float;
uniform vec2 uRes;
uniform vec4 uBand[${MIST_MAX}];
uniform vec4 uBandC[${MIST_MAX}];
uniform float uBandO[${MIST_MAX}];
uniform int uCount;
uniform vec4 uVeil;             // rgb, opacity
uniform vec2 uSpear;            // spear ends: tip height (fraction of h from the top), edge power
varying vec2 vUv;
void main() {
  vec2 px = vec2(vUv.x, 1.0 - vUv.y) * uRes;            // pixels, y down
  vec3 col = uVeil.rgb * uVeil.a;
  float a = uVeil.a;
  for (int i = 0; i < ${MIST_MAX}; i++) {
    if (i >= uCount) break;
    vec4 b = uBand[i] * vec4(uRes.x, uRes.x, uRes.y, uRes.y);
    float tp = uBandC[i].w;
    float f;
    float w;
    if (tp < 0.0) {
      // spear end: signed distance-like field in pixels (negative inside)
      float d = min(px.x - b.x, b.y - px.x);
      float L = max(1e-3, min(-tp * b.w, (b.y - b.x) * 0.5));
      float s = pow(sin(1.5707963 * clamp(d / L, 0.0, 1.0)), uSpear.y);
      float ya = b.z + uSpear.x * b.w;
      float top = ya - uSpear.x * b.w * s;
      float bot = ya + (1.0 - uSpear.x) * b.w * s;
      f = max(max(top - px.y, px.y - bot), -d);
      w = clamp(fwidth(f), 1e-3, 1.5);
    } else {
      float ry = max(b.w * 0.5, 0.5);
      float rx = clamp(tp * ry, 0.5, max(0.5, (b.y - b.x) * 0.5));
      float cx = clamp(px.x, b.x + rx, max(b.x + rx, b.y - rx));
      vec2 q = vec2((px.x - cx) / rx, (px.y - (b.z + ry)) / ry);
      f = length(q) - 1.0;
      w = max(fwidth(f), 1e-5);
    }
    float ba = (1.0 - smoothstep(-0.5 * w, 0.5 * w, f)) * uBandO[i];
    // "over": band i is drawn on top of what is already there
    col = uBandC[i].rgb * ba + col * (1.0 - ba);
    a = ba + a * (1.0 - ba);
  }
  gl_FragColor = vec4(col, a);
}
`;
