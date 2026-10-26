/**
 * GLSL for the `cover-block` view (DESIGN §6.1). Owner: WP-05.
 * World space = viewport CSS px (origin at the viewport centre, y up, z towards the viewer); block-local space =
 * px with the origin at the block centre, the top face at z = 0, the grain running along local y (the block's long
 * axis, as on a real cherry plank). Every screen-facing shader ends with <colorspace_fragment>.
 */
import { NOISE } from '../../gl/chunks/noise';
import { PEEL_UNIFORMS, PEEL_VERT_CHUNK } from '../../gl/chunks/peel';

/** Lighting shared by the block faces: day north window (upper left, uLightEl), night andon (low right) + moon. */
const LIGHT = /* glsl */`
uniform vec3 uLightDir; uniform vec3 uCamPos; uniform float uNight;
uniform vec3 uAndonPos; uniform float uAndonRange;
const vec3 KEY = vec3(1.0, 0.985, 0.96);
const vec3 SKY = vec3(0.62, 0.72, 0.86);
const vec3 BOUNCE = vec3(0.55, 0.42, 0.32);
const vec3 ANDON = vec3(1.0, 0.56, 0.24);    // #FFB46B in linear light, a little warmer for the flame
const vec3 MOON = vec3(0.42, 0.55, 0.85);
float ggx(vec3 N, vec3 V, vec3 L, float rough){
  vec3 H = normalize(V + L);
  float a = rough * rough, a2 = a * a;
  float nh = max(dot(N, H), 0.0);
  float d = nh * nh * (a2 - 1.0) + 1.0;
  float D = a2 / (3.14159 * d * d);
  float nv = max(dot(N, V), 1e-3), nl = max(dot(N, L), 0.0);
  float k = (rough + 1.0) * (rough + 1.0) / 8.0;
  float G = (nv / (nv * (1.0 - k) + k)) * (nl / (nl * (1.0 - k) + k));
  float F = 0.04 + 0.96 * pow(1.0 - max(dot(H, V), 0.0), 5.0);
  return D * G * F / max(4.0 * nv, 1e-3);
}
vec3 shade(vec3 albedo, vec3 N, vec3 P, float rough, float ao, float specK){
  vec3 V = normalize(uCamPos - P);
  // day
  vec3 L = normalize(uLightDir);
  float nl = max(dot(N, L), 0.0);
  vec3 day = albedo * (KEY * nl * 1.55 + mix(BOUNCE, SKY, 0.5 + 0.5 * N.y) * 0.52 * ao) + KEY * ggx(N, V, L, rough) * nl * 1.55 * specK;
  // night: andon (a low warm lamp to the lower right) + a faint cool moon from the upper left
  vec3 A = uAndonPos - P; float dist = length(A); A /= max(dist, 1e-3);
  float att = 1.0 / (1.0 + (dist * dist) / (uAndonRange * uAndonRange));
  float na = max(dot(N, A), 0.0);
  vec3 M = normalize(vec3(-0.55, 0.62, 0.56));
  float nm = max(dot(N, M), 0.0);
  vec3 night = albedo * (ANDON * na * att * 2.6 + MOON * nm * 0.22 + vec3(0.05, 0.06, 0.09) * ao)
             + ANDON * ggx(N, V, A, rough) * na * att * 2.6 * specK + MOON * ggx(N, V, M, rough) * nm * 0.2 * specK;
  return mix(day, night, uNight) * mix(1.0, ao, 0.7);
}
`;

/** Re-carve sweep (uCarve 0 → 1): strips cut right → left, each gouged top → bottom. 1 = fully carved. */
const CARVE_SWEEP = /* glsl */`
uniform float uCarve;
float carved(vec2 uv){
  if (uCarve >= 1.0) return 1.0;
  float strips = 22.0;
  float col = floor((1.0 - uv.x) * strips);
  float j = fract(sin(col * 91.7 + 3.1) * 4375.85);
  float start = (col / strips) * 0.68 + j * 0.06;
  float lp = clamp((uCarve - start) / 0.26, 0.0, 1.0);
  return smoothstep(-0.05, 0.02, lp - (1.0 - uv.y));
}
`;

export const TOP_VERT = /* glsl */`
uniform sampler2D tHeight; uniform float uDepth; uniform float uDisplace;
${CARVE_SWEEP}
varying vec2 vUv; varying vec3 vWPos; varying vec3 vLocal;
varying vec3 vT; varying vec3 vB; varying vec3 vN;
void main(){
  vUv = uv;
  float h = texture2D(tHeight, uv).r;
  float hh = mix(1.0, h, carved(uv));
  vec3 p = position;
  p.z += (hh - 1.0) * uDepth * uDisplace;
  vLocal = p;
  vec4 wp = modelMatrix * vec4(p, 1.0);
  vWPos = wp.xyz;
  mat3 nm = transpose(inverse(mat3(modelMatrix)));
  vT = normalize(nm * vec3(1.0, 0.0, 0.0));
  vB = normalize(nm * vec3(0.0, 1.0, 0.0));
  vN = normalize(nm * vec3(0.0, 0.0, 1.0));
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

/** Wood albedo: yamazakura (cherry) — an even honey-pink body, gentle growth rings, fine streaks along the grain. */
const WOOD = /* glsl */`
${NOISE}
uniform vec3 uWood; uniform vec3 uWood2; uniform vec2 uFace;
float grainRing(vec2 g){
  float warp = fbm(vec2(g.x * 2.2, g.y * 0.35) + 4.1) * 0.26 + 0.05 * sin(g.y * 2.3 + g.x * 1.1);
  return fract((g.x + warp) * 6.5 + 0.1 * g.y);
}
vec3 woodAlbedo(vec2 lp, out float pores){
  vec2 g = lp / uFace.x;                         // ~1 across the width; grain along y
  float ring = grainRing(g);
  float late = smoothstep(0.42, 0.8, ring) * (1.0 - smoothstep(0.8, 1.0, ring));
  float streak = fbm(vec2(g.x * 140.0, g.y * 4.5));
  pores = vnoise(vec2(g.x * 460.0, g.y * 30.0));
  float figure = fbm(vec2(g.x * 7.0, g.y * 1.1) + 9.3);
  vec3 base = mix(uWood, vec3(dot(uWood, vec3(0.2126, 0.7152, 0.0722))), 0.3) * 1.06;
  vec3 c = base * (0.96 + 0.07 * figure);
  c = mix(c, base * vec3(0.86, 0.75, 0.67), late * 0.5);
  c *= 0.965 + 0.055 * streak;
  c *= 0.99 + 0.02 * pores;
  return c;
}
/* fine raised grain on the planed faces: tilts the normal across the grain (shows under raking light) */
vec3 grainNormal(vec2 lp){
  vec2 g = lp / uFace.x;
  float e = 0.0015;
  float r0 = grainRing(g), r1 = grainRing(g + vec2(e, 0.0));
  float h0 = fbm(vec2(g.x * 140.0, g.y * 4.5)) + 0.5 * smoothstep(0.45, 0.8, r0) * (1.0 - smoothstep(0.8, 1.0, r0));
  float h1 = fbm(vec2((g.x + e) * 140.0, g.y * 4.5)) + 0.5 * smoothstep(0.45, 0.8, r1) * (1.0 - smoothstep(0.8, 1.0, r1));
  return normalize(vec3(-(h1 - h0) * 0.06 / e * 0.02, 0.0, 1.0));
}
`;

export const TOP_FRAG = /* glsl */`
uniform sampler2D tHeight; uniform sampler2D tNormal; uniform sampler2D tMask;
uniform vec3 uInk; uniform float uOutline; uniform float uLit; uniform float uOpacity;
uniform vec4 uRoll; uniform vec3 uRollP;            // roll line in block-local px: corner.xy, dir.xy; (L, r, active)
${CARVE_SWEEP}
${WOOD}
${LIGHT}
varying vec2 vUv; varying vec3 vWPos; varying vec3 vLocal;
varying vec3 vT; varying vec3 vB; varying vec3 vN;
void main(){
  float k = carved(vUv);
  float h = mix(1.0, texture2D(tHeight, vUv).r, k);
  vec3 nt = texture2D(tNormal, vUv).xyz * 2.0 - 1.0;
  nt = normalize(mix(vec3(0.0, 0.0, 1.0), nt, k));
  vec3 gn = grainNormal(vLocal.xy);
  vec3 nd = normalize(vec3(nt.xy + gn.xy * smoothstep(0.9, 1.0, nt.z), nt.z));
  vec3 N = normalize(nd.x * vT + nd.y * vB + nd.z * vN);
  if (uOutline > 0.5) {
    float e = abs(h - 0.6);
    float w = fwidth(h) * 1.2 + 1e-4;
    float line = 1.0 - smoothstep(w * 0.5, w * 1.5, e);
    if (line < 0.02) discard;
    gl_FragColor = vec4(uInk, line);
    #include <colorspace_fragment>
    return;
  }
  float pores;
  vec3 wood = woodAlbedo(vLocal.xy, pores);
  float slope = 1.0 - nt.z;
  float wall = smoothstep(0.06, 0.3, slope) * step(h, 0.985);
  float ground = 1.0 - smoothstep(0.2, 0.45, h);
  vec3 cutWood = mix(uWood2, uWood * vec3(0.92, 0.8, 0.72), 0.25);
  vec3 albedo = mix(wood, cutWood, wall * 0.82);
  albedo = mix(albedo, mix(wood, uWood2, 0.3) * 0.96, ground * (1.0 - wall) * 0.6);
  vec4 m = texture2D(tMask, vUv);
  float ink = smoothstep(0.45, 0.8, m.g) * smoothstep(0.94, 0.99, h) * k;
  ink *= 0.9 + 0.1 * pores;
  // a little old ink lingers on the shoulders of the cut, never in the ground
  float shoulder = smoothstep(0.45, 0.8, m.g) * smoothstep(0.78, 0.95, h) * (1.0 - smoothstep(0.95, 0.99, h)) * 0.35 * k;
  albedo = mix(albedo, uInk, clamp(ink + shoulder, 0.0, 1.0));
  float rough = mix(0.7, 0.25, ink);
  float ao = mix(0.74, 1.0, smoothstep(0.1, 0.7, h));
  // the lifted sheet shades the block just before its roll line
  vec2 rp = vLocal.xy - uRoll.xy;
  float t = dot(rp, uRoll.zw) - uRollP.x;
  float shadow = t < 0.0 ? 1.0 - 0.42 * exp(t / max(uRollP.y * 1.4, 1.0)) * uRollP.z : 1.0;
  vec3 lit = shade(albedo, N, vWPos, rough, ao, mix(0.5, 1.6, ink)) * shadow;
  vec3 col = mix(albedo, lit, uLit);
  gl_FragColor = vec4(col, uOpacity);
  #include <colorspace_fragment>
}`;

/** Sides (plain wood, end grain on the short ends) and the back with the pasted 版下. aFace: 0 side, 1 back. */
export const BODY_VERT = /* glsl */`
attribute float aFace;
varying vec2 vUv; varying vec3 vWPos; varying vec3 vLocal; varying vec3 vNw; varying float vFace;
void main(){
  vUv = uv; vFace = aFace; vLocal = position;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWPos = wp.xyz;
  vNw = normalize(transpose(inverse(mat3(modelMatrix))) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

export const BODY_FRAG = /* glsl */`
uniform sampler2D tBack; uniform float uHasBack; uniform float uOutline; uniform vec3 uInk;
uniform float uLit; uniform float uOpacity; uniform float uBackOnly;
${WOOD}
${LIGHT}
varying vec2 vUv; varying vec3 vWPos; varying vec3 vLocal; varying vec3 vNw; varying float vFace;
void main(){
  vec3 N = normalize(vNw);
  if (uOutline > 0.5) {
    vec2 e = min(vUv, 1.0 - vUv);
    float d = min(e.x, e.y);
    float line = 1.0 - smoothstep(0.0, fwidth(d) * 1.5 + 1e-4, d);
    if (line < 0.02) discard;
    gl_FragColor = vec4(uInk, line);
    #include <colorspace_fragment>
    return;
  }
  float pores;
  vec3 wood = woodAlbedo(vLocal.xy + vec2(0.0, vLocal.z * 3.0), pores) * 0.9;
  float a = uOpacity;
  vec3 albedo = wood;
  if (vFace > 0.5) {
    vec4 b = uHasBack > 0.5 ? texture2D(tBack, vUv) : vec4(0.0);
    albedo = mix(wood, b.rgb, b.a);
    a *= mix(1.0, b.a, uBackOnly);
  } else {
    a *= 1.0 - uBackOnly;
    // end grain on the short ends: concentric rings
    float endG = step(0.5, abs(N.y));
    float rings = fract(length(vLocal.xz * vec2(0.02, 0.09)) * 3.0 + fbm(vLocal.xz * 0.05) * 0.4);
    albedo *= 1.0 - endG * 0.12 * smoothstep(0.6, 0.95, rings);
  }
  if (a < 0.003) discard;
  vec3 lit = shade(albedo, N, vWPos, 0.75, 1.0, 0.5);
  gl_FragColor = vec4(mix(albedo, lit, uLit), a);
  #include <colorspace_fragment>
}`;

/** The sheet: the print texture, curled by the shared peel chunk; the back shows 8 % mirrored show-through. */
export const SHEET_VERT = /* glsl */`
${PEEL_UNIFORMS}
${PEEL_VERT_CHUNK}
varying vec2 vUv; varying vec3 vNw; varying float vRoll; varying vec3 vWPos;
void main(){
  vUv = uv;
  vec3 n;
  vec3 p = peel(position, uv, n);
  vRoll = peelLine(uv);
  vNw = normalize(mat3(modelMatrix) * n);
  vec4 wp = modelMatrix * vec4(p, 1.0);
  vWPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

export const SHEET_FRAG = /* glsl */`
uniform sampler2D tSheet; uniform vec2 uTexel; uniform vec3 uPaper; uniform float uPress;
uniform vec3 uLightDir; uniform float uNight; uniform float uOutline; uniform vec3 uInk;
uniform float uPeel; uniform float uPeelRadius; uniform vec2 uPeelSize; uniform float uShadowOn;
varying vec2 vUv; varying vec3 vNw; varying float vRoll; varying vec3 vWPos;
float inkiness(vec3 c){ return length(c - uPaper); }
void main(){
  vec4 t = texture2D(tSheet, vUv);
  if (uOutline > 0.5) {
    vec2 e = min(vUv, 1.0 - vUv) * uPeelSize;
    float d = min(e.x, e.y);
    float line = max(1.0 - smoothstep(0.5, 1.6, d), step(0.4, inkiness(t.rgb)) * 0.0);
    if (line < 0.02) discard;
    gl_FragColor = vec4(uInk, line);
    #include <colorspace_fragment>
    return;
  }
  // baren pressure: ink spreads a little as the impression gets heavier (exact at rest: uPress = 0)
  if (uPress > 0.001) {
    vec2 o = uTexel * uPress * 1.1;
    vec4 s1 = texture2D(tSheet, vUv + vec2(o.x, 0.0)), s2 = texture2D(tSheet, vUv - vec2(o.x, 0.0));
    vec4 s3 = texture2D(tSheet, vUv + vec2(0.0, o.y)), s4 = texture2D(tSheet, vUv - vec2(0.0, o.y));
    vec4 best = t;
    if (inkiness(s1.rgb) > inkiness(best.rgb) && s1.a > 0.5) best = s1;
    if (inkiness(s2.rgb) > inkiness(best.rgb) && s2.a > 0.5) best = s2;
    if (inkiness(s3.rgb) > inkiness(best.rgb) && s3.a > 0.5) best = s3;
    if (inkiness(s4.rgb) > inkiness(best.rgb) && s4.a > 0.5) best = s4;
    t.rgb = mix(t.rgb, best.rgb, 0.65);
  }
  if (t.a < 0.004) discard;
  vec3 L = normalize(uLightDir);
  vec3 N = normalize(vNw);
  float r = max(uPeelRadius * uPeelSize.x, 1.0);
  vec3 col;
  if (gl_FrontFacing) {
    float k = 0.62;
    float shadeF = 1.0 + k * (dot(N, L) - L.z) * step(vRoll, 0.0);
    // the lifted flap shades the flat sheet just past the roll line
    float sh = vRoll > 0.0 ? 1.0 - 0.16 * exp(-vRoll / (r * 1.6)) * uShadowOn : 1.0;
    col = t.rgb * shadeF * sh;
  } else {
    vec3 back = mix(uPaper * mix(0.955, 1.06, uNight), t.rgb, 0.08);
    float nb = dot(-N, L);
    col = back * (0.86 + 0.32 * max(nb, 0.0)) * mix(1.0, 0.9, uNight);
  }
  gl_FragColor = vec4(col, t.a);
  #include <colorspace_fragment>
}`;
