/**
 * Carve shaders (DESIGN §6.1 carving, §13.2 WP-05 carve API). Owner: WP-05.
 *
 * Pipeline, all full-screen passes on a fixed-size render target:
 *   1. MASK  — the rasterised source → mask RT (r = printing surface, g/b = source green/blue channels).
 *   2. SEED  — boundary texels (raised texels with a non-raised 4-neighbour) store their own texel coordinate;
 *              every other texel stores the "no seed" sentinel. Half-float RG: integer coordinates up to 2048 are exact.
 *   3. JFA   — jump flood (Rong & Tan 2006), steps 2^(n−1) … 1, 9 taps each: every texel keeps the closest seed.
 *   4. BAKE  — signed distance (texels, inside < 0) → height profile → height RT (r = height 0..1).
 *   5. NORMAL— the same profile evaluated at the four neighbours (full precision, not from the 8-bit height),
 *              central differences scaled by the relief → tangent-space normal RT (xyz · 0.5 + 0.5).
 */

export const CARVE_VERT = /* glsl */`
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

/** mask: r = printing surface (raised), g/b = the source's green/blue (extra layers callers may encode). */
export const MASK_FRAG = /* glsl */`
uniform sampler2D tSrc; uniform float uInvert;
varying vec2 vUv;
void main(){
  vec4 s = texture2D(tSrc, vUv);
  float raised = max(s.r, max(s.g, s.b)) * s.a;
  raised = mix(raised, 1.0 - raised, uInvert);
  gl_FragColor = vec4(raised, s.g * s.a, s.b * s.a, 1.0);
}`;

export const SEED_FRAG = /* glsl */`
uniform sampler2D tMask; uniform vec2 uTexel;
varying vec2 vUv;
bool inside(vec2 uv){ return texture2D(tMask, uv).r > 0.5; }
void main(){
  bool me = inside(vUv);
  bool edge = me && (!inside(vUv + vec2(uTexel.x, 0.0)) || !inside(vUv - vec2(uTexel.x, 0.0))
                  || !inside(vUv + vec2(0.0, uTexel.y)) || !inside(vUv - vec2(0.0, uTexel.y)));
  gl_FragColor = edge ? vec4(gl_FragCoord.xy, 0.0, 1.0) : vec4(-30000.0, -30000.0, 0.0, 1.0);
}`;

export const JFA_FRAG = /* glsl */`
uniform sampler2D tSeed; uniform vec2 uTexel; uniform float uStep;
varying vec2 vUv;
void main(){
  vec2 me = gl_FragCoord.xy;
  vec2 best = vec2(-30000.0);
  float bestD = 1e20;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 uv = vUv + vec2(float(i), float(j)) * uStep * uTexel;
      if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) continue;
      vec2 s = texture2D(tSeed, uv).xy;
      if (s.x < -1000.0) continue;
      vec2 d = s - me;
      float dd = dot(d, d);
      if (dd < bestD) { bestD = dd; best = s; }
    }
  }
  gl_FragColor = vec4(best, 0.0, 1.0);
}`;

/**
 * Shared profile code: `carveHeight(texel)` → height 0..1 for the requested profile.
 *   uProfile 0 vcut (woodblock): raised faces 1; 60° V-cut walls over uWall texels down to the ground (0.16) with
 *              round-chisel gouge scallops running along the grain (texture y); a little deeper 浚い clearing far from
 *              the walls. Heights stay inside 0..1 (8-bit RT), so the ground sits just above 0.
 *   uProfile 1 emboss (karazuri): soft rounded bevel inside the figure, soft foot outside.
 *   uProfile 2 seal (raised or incised; incised inverts the mask upstream): steep stone walls, knife-marked ground.
 */
export const PROFILE_GLSL = /* glsl */`
uniform sampler2D tSeed; uniform sampler2D tMask; uniform vec2 uTexel; uniform vec2 uSize;
uniform float uWall; uniform float uProfile; uniform float uSeed;
float c_hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float c_noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(c_hash(i), c_hash(i + vec2(1.0, 0.0)), u.x), mix(c_hash(i + vec2(0.0, 1.0)), c_hash(i + vec2(1.0, 1.0)), u.x), u.y); }
float c_fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++){ s += a * c_noise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
float sdAt(vec2 texel){
  vec2 uv = texel / uSize;
  vec2 s = texture2D(tSeed, uv).xy;
  bool inside = texture2D(tMask, uv).r > 0.5;
  float d = s.x < -1000.0 ? 4096.0 : length(s - texel);
  return inside ? -d - 0.5 : d - 0.5;
}
/* round-chisel (丸刀) strokes: shallow U-channels running along the grain (texture y), in two overlapping courses of
   different widths and lengths (the deeper cut wins), each stroke scooping in and lifting out at its ends */
float stroke(vec2 t, float colW, float lenA, float lenB, float salt){
  float tx = t.x + 9.0 * (c_noise(vec2(t.y * 0.004, salt)) - 0.5);
  float col = floor(tx / colW);
  float u = fract(tx / colW);
  float segL = lenA + lenB * c_hash(vec2(col, salt + 3.0));
  float sy = (t.y + c_hash(vec2(col, salt + 7.0)) * segL) / segL;
  float seg = floor(sy);
  float v = fract(sy);
  float on = step(0.18, c_hash(vec2(col * 1.3, seg + salt)));          // some strokes are missing
  float depth = 0.45 + 0.55 * c_hash(vec2(col * 1.7, seg + salt + 1.0));
  float w = 0.55 + 0.45 * c_hash(vec2(col, seg + salt + 2.0));           // stroke narrower than its course
  float a = clamp(abs(u * 2.0 - 1.0) / w, 0.0, 1.0);
  float across = 1.0 - a * a;
  float ends = smoothstep(0.0, 0.2, v) * (1.0 - smoothstep(0.75, 1.0, v));
  return -depth * across * ends * on;
}
float gouge(vec2 t){
  float g = min(stroke(t, 27.0, 120.0, 160.0, 1.0 + uSeed), stroke(t + vec2(13.0, 0.0), 17.0, 70.0, 110.0, 9.0 + uSeed));
  float fibre = c_fbm(vec2(t.x * 0.25, t.y * 0.02) + uSeed) - 0.5;
  return 0.07 * g + 0.014 * fibre;
}
float carveHeight(vec2 texel){
  float sd = sdAt(texel);
  float w = max(uWall, 1.0);
  if (uProfile < 0.5) {
    const float G = 0.16;
    if (sd <= 0.0) return 1.0;
    if (sd < w) return 1.0 - (1.0 - G) * sd / w;
    float ramp = smoothstep(w, w * 2.0, sd);
    float far = smoothstep(w * 2.5, w * 7.0, sd);
    return clamp(G + gouge(texel) * ramp - 0.04 * far, 0.0, 1.0);
  }
  if (uProfile < 1.5) return 1.0 - smoothstep(-w, w * 0.5, sd);
  const float GS = 0.1;
  float ws = w * 0.5;
  if (sd <= 0.0) return 1.0;
  if (sd < ws) return 1.0 - (1.0 - GS) * sd / ws;
  float knife = c_fbm(texel * vec2(0.09, 0.3) + uSeed) - 0.5;
  return clamp(GS + 0.08 * knife * smoothstep(ws, ws * 2.5, sd), 0.0, 1.0);
}
`;

export const BAKE_FRAG = /* glsl */`
${PROFILE_GLSL}
void main(){
  float h = carveHeight(gl_FragCoord.xy);
  gl_FragColor = vec4(h, h, h, 1.0);
}`;

export const NORMAL_FRAG = /* glsl */`
${PROFILE_GLSL}
uniform float uRelief;
void main(){
  vec2 t = gl_FragCoord.xy;
  float hx = carveHeight(t + vec2(1.0, 0.0)) - carveHeight(t - vec2(1.0, 0.0));
  float hy = carveHeight(t + vec2(0.0, 1.0)) - carveHeight(t - vec2(0.0, 1.0));
  vec3 n = normalize(vec3(-hx * 0.5 * uRelief, -hy * 0.5 * uRelief, 1.0));
  gl_FragColor = vec4(n * 0.5 + 0.5, 1.0);
}`;
