/**
 * Principles — GLSL for `principles-garden` (DESIGN §6.6). Owner: WP-08.
 * Extends the verified SAND_FRAG / RAKE_STROKE_* (threejs §f1, *shaders*): the height field is a pure function of
 * plane position —
 *   rows    52 rows across depth (week 1 at the front); row i's waviness amplitude a_i comes from a 52 × 1 texture
 *           (linear between row centres, so neighbouring ridges follow a disturbance), with hand wobble;
 *   samon   rings around every stone, blended in over 4–5.5 spacings;
 *   SEV-1   around stone 5, each incident raises the ridges inside r5 + spacing · (2 + 10 · blast / 100) to
 *           amplitude 1.3 and leaves a crest ring at that radius;
 *   trail   the visitor's strokes (r = lateral, a = coverage) as 5-tine grooves, persistent;
 *   stamp   the kumiko pressed into the sand (kaku-asanoha at the panel's pitch, the waku and dividers deeper, the
 *           sixth cell flat), cleared behind the rake line as the section scrolls.
 * Shading: forward-difference normals (high/medium) or dFdx/dFdy (low); a low sun; analytic stone shadows
 * (closest approach of the sun ray to each stone's sphere, no shadow maps); cavity; per-grain hash; sparse
 * quartz glints. Cool 白鼠 gravel by day, moonlit blue-grey at night; never beige.
 */

export const SAND_COMMON = /* glsl */`
uniform sampler2D tRows, tTrail;
uniform vec4 uStones[5];
uniform vec2 uSev[4];
uniform vec4 uPlane;
uniform vec3 uData;
uniform float uSpacing, uTines, uAmp;
uniform vec4 uStamp, uStampB;
uniform vec2 uStampGrid;
const float TAU = 6.2831853;
float sSeg(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
float kakuAsanoha(vec2 l){
  vec2 q = abs(fract(l) - 0.5);
  if (q.y > q.x) q = q.yx;
  float d = 0.5 - q.x;
  d = min(d, abs(q.x - q.y) * 0.70710678);
  d = min(d, sSeg(q, vec2(0.0), vec2(0.29289, 0.0)));
  d = min(d, sSeg(q, vec2(0.5), vec2(0.29289, 0.0)));
  return d;
}
float stampH(vec2 p, out float m){
  m = 0.0;
  if (uStamp.w < 0.001) return 0.5;
  vec2 q = p - uStamp.xy;
  vec2 e = uStampB.xy - abs(q);
  if (e.x < 0.0 || e.y < 0.0) return 0.5;
  float pitch = uStamp.z;
  vec2 f = (q + uStampB.xy) / pitch - 0.6;
  vec2 c = floor(f / 9.5);
  vec2 l = f - c * 9.5;
  bool inCell = l.x < 9.0 && l.y < 9.0 && f.x >= 0.0 && f.y >= 0.0 && c.x < uStampGrid.x && c.y < uStampGrid.y;
  float d = 1.0;
  if (inCell && c.y * uStampGrid.x + c.x < 4.5) d = kakuAsanoha(l);
  float g = 1.0 - smoothstep(0.028, 0.08, d);
  float hs = mix(0.62 - 0.52 * g, 0.2, inCell ? 0.0 : 1.0);
  float edge = min(e.x, e.y) / pitch;
  m = smoothstep(0.0, 0.3, edge) * step(uStampB.z, p.x) * uStamp.w;
  // a berm of displaced sand just outside the rake line
  return hs;
}
float heightAt(vec2 p, out float amp){
  float v = (uData.y - p.y) / uSpacing;
  float inData = step(0.0, v) * step(v, uData.z);
  float a = texture2D(tRows, vec2(clamp(v, 0.5, uData.z - 0.5) / uData.z, 0.5)).r * inData + 0.05 * (1.0 - inData);
  float wv = 0.62 * sin(p.x * 17.0 + v * 0.45) + 0.38 * sin(p.x * 31.0 - v * 0.8 + 1.7);
  float h = 0.5 + 0.5 * cos(TAU * (v + 1.15 * a * wv));
  amp = 1.0;
  for (int i = 0; i < 5; i++) {
    float ds = length(p - uStones[i].xz) - uStones[i].w;
    float w = 1.0 - smoothstep(uSpacing * 4.0, uSpacing * 5.5, ds);
    float ring = 0.5 + 0.5 * cos(TAU * max(ds, 0.0) / uSpacing);
    if (i == 4) {
      for (int k = 0; k < 4; k++) {
        if (uSev[k].y <= 0.0) continue;
        float rk = uSev[k].x - uStones[4].w;
        float inside = 1.0 - smoothstep(rk - 0.3 * uSpacing, rk + 0.3 * uSpacing, ds);
        amp += (uSev[k].y - 1.0) * inside;
        float crest = exp(-pow((ds - rk) / (0.3 * uSpacing), 2.0));
        ring = max(ring, crest);
        w = max(w, inside);
      }
    }
    h = mix(h, ring, w);
  }
  vec4 tr = texture2D(tTrail, (p - uPlane.xy) / uPlane.zw);
  h = mix(h, 0.5 + 0.5 * cos(TAU * (tr.r - 0.5) * uTines), tr.a);
  float m;
  float hs = stampH(p, m);
  h = mix(h, hs, m);
  amp = mix(amp, 1.0, max(tr.a, m));
  return h;
}
`;

export const SAND_VERT = /* glsl */`
${SAND_COMMON}
uniform float uDisplace;
varying vec3 vP;
void main(){
  vec3 pos = position;
  if (uDisplace > 0.5) { float a; float h = heightAt(pos.xz, a); pos.y += (h - 0.5) * a * uAmp; }
  vP = pos;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}`;

export const SAND_FRAG = (noise: string) => /* glsl */`
${SAND_COMMON}
${noise}
uniform vec3 uSun, uSandLit, uSandShade, uSandLitN, uSandShadeN, uGlint, uInk;
uniform float uDetail, uNight, uDarken, uOutline;
uniform vec2 uFade, uSweep;
varying vec3 vP;
float stoneShadow(vec3 P){
  float s = 1.0;
  for (int i = 0; i < 5; i++) {
    vec3 cp = uStones[i].xyz - P;
    float t = max(dot(cp, uSun), 0.0);
    float d = length(cp - uSun * t) - uStones[i].w * 0.9;
    float pen = 0.004 + 0.045 * t;
    s *= smoothstep(-pen, pen, d);
  }
  return s;
}
void main(){
  vec2 p = vP.xz;
  float amp;
  float h = heightAt(p, amp);
  vec3 n;
  if (uDetail > 0.5) {
    float e = uSpacing / 7.0, ax, az;
    float hx = heightAt(p + vec2(e, 0.0), ax) * ax - h * amp;
    float hz = heightAt(p + vec2(0.0, e), az) * az - h * amp;
    n = normalize(vec3(-hx * uAmp / e, 1.0, -hz * uAmp / e));
  } else {
    vec3 P = vec3(p.x, h * amp * uAmp, p.y);
    n = normalize(cross(dFdx(P), dFdy(P)));
    if (n.y < 0.0) n = -n;
  }
  float diff = dot(n, uSun);
  float sh = uDetail > 0.5 ? stoneShadow(vec3(p.x, 0.0, p.y)) : 1.0;
  float lit = smoothstep(-0.14, 0.6, diff) * mix(0.3, 1.0, sh);
  vec3 col = mix(mix(uSandShade, uSandShadeN, uNight), mix(uSandLit, uSandLitN, uNight), lit);
  col *= 0.9 + 0.1 * h;
  float grain = hash21(floor(p * 950.0));
  col *= 0.955 + 0.09 * grain;
  float glint = step(0.996 - 0.002 * uNight, grain) * pow(clamp(diff, 0.0, 1.0), 8.0) * sh;
  col += uGlint * glint * (0.4 + 0.35 * uNight);
  if (uSweep.y > 0.5) col *= 1.0 - 0.2 * exp(-pow((p.x - uSweep.x) / 0.018, 2.0));
  if (uStamp.w > 0.001 && abs(p.y - uStamp.y) < uStampB.y) col *= 1.0 - 0.16 * exp(-pow((p.x - uStampB.z) / 0.014, 2.0)) * uStamp.w;
  col *= 1.0 - uDarken;
  float a = smoothstep(uFade.x, uFade.y, p.y);
  vec3 ink = mix(col, uInk, smoothstep(0.82, 0.97, h));
  col = mix(col, ink, uOutline);
  a *= 1.0 - uOutline * (1.0 - smoothstep(0.82, 0.97, h));
  gl_FragColor = vec4(col, a);
  #include <colorspace_fragment>
}`;

export const STONE_VERT = /* glsl */`
attribute float aStone;
attribute vec3 aN;
varying vec3 vW, vN;
varying float vS;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  vN = aN;
  vS = aStone;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

export const STONE_FRAG = (noise: string) => /* glsl */`
${noise}
uniform vec3 uSun, uStone, uStonePale, uStoneN, uInk;
uniform float uNight, uOutline, uDarken;
varying vec3 vW, vN;
varying float vS;
void main(){
  vec3 fn = normalize(cross(dFdx(vW), dFdy(vW)));
  if (dot(fn, cameraPosition - vW) < 0.0) fn = -fn;
  vec3 n = normalize(mix(fn, normalize(vN), 0.8));
  float facet = hash21(floor(fn.xz * 9.0) + vS * 7.0);
  vec3 base = mix(mix(uStone, uStoneN, uNight), uStonePale, (0.18 + facet * 0.3) * (1.0 - 0.6 * uNight));
  base *= 0.92 + 0.16 * fbm(vW.xz * 60.0 + vW.y * 40.0 + vS * 5.0);
  float sp = hash21(floor(vW.xz * 1400.0 + vW.y * 900.0));
  base *= 0.88 + 0.24 * sp;
  float diff = max(dot(n, uSun), 0.0);
  float sky = 0.5 + 0.5 * n.y;
  vec3 col = base * (0.32 + 0.3 * sky + 1.05 * diff);
  col *= mix(0.55, 1.0, smoothstep(0.0, 0.018, vW.y));
  col *= 1.0 - uDarken;
  col = mix(col, uInk, uOutline * 0.85);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

/** Clears the trail behind the re-rake line (NoBlending, writes zero). */
export const CLEAR_VERT = /* glsl */`void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }`;
export const CLEAR_FRAG = /* glsl */`void main(){ gl_FragColor = vec4(0.0); }`;
