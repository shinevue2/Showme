/**
 * Skills — GLSL for `skills-kumiko` (DESIGN §6.5). Owner: WP-08.
 *
 * KUMIKO_POSE places one strip (a unit box x ∈ [−½, ½], y ∈ [−½, ½], z ∈ [0, 1]) in the shoji group's space
 * (lattice pitches, frame-centred, y up, z out of the paper). Three poses blend per instance:
 *   from      the exploded square lattice of the works-skills hand-off (slot aF.xy × uFromPitch around
 *             uFromOrigin, layer aF.z × uExplode, laths 0.13 pitch wide), the byōbu's 下地骨 re-cut;
 *   assembled aA (centre, angle, length) with aS.xy (width, depth);
 *   diagram   aB, near the paper so the planar shadow resolves into the stack diagram.
 * Assembly follows the verified patchAssembly scheme (threejs §d: per-instance delay, k = (uProgress − delay)/0.35)
 * with absolute from-positions instead of offsets; the tumble about aSpin is zero at both ends so the lattice is
 * clean when exploded and when seated. Tints: the hovered tool's run takes its domain plate, graph neighbours
 * (aT.yz = 2 × 16-bit adjacency of the instance's tool) light at half strength.
 */

export const KUMIKO_PARS = /* glsl */`
uniform float uProgress, uDiagram, uFromPitch, uExplode, uHover, uLift;
uniform vec2 uFromOrigin;
uniform vec3 uPlate[5];
attribute vec4 aA, aB, aF, aS, aT, aSpin;
varying vec3 vTintCol;
varying float vTint, vKind, vSeed, vEnd, vLen;
varying vec2 vGrain;
vec3 kmRot(vec3 v, vec3 a, float ang){ return v * cos(ang) + cross(a, v) * sin(ang) + a * dot(a, v) * (1.0 - cos(ang)); }
vec3 kmRotZ(vec3 v, float a){ float c = cos(a), s = sin(a); return vec3(c * v.x - s * v.y, s * v.x + c * v.y, v.z); }
float kmEase(float x){ return x * x * (3.0 - 2.0 * x); }
float kmAng, kmLen, kmW, kmD, kmTumble, kmKind;
vec3 kmC, kmAxis;
void kumikoPose(){
  float kind = mod(aS.z, 8.0);
  float cell = floor(aS.z / 8.0) - 1.0;
  kmKind = kind;
  float delay = aS.w;
  float dn = delay / 0.65;
  // assembled → diagram (frame members stay where they are)
  float kD = kind == 2.0 ? 0.0 : smoothstep(0.0, 1.0, clamp((uDiagram - dn * 0.35) / 0.65, 0.0, 1.0));
  vec2 cA = mix(aA.xy, aB.xy, kD);
  float angA = mix(aA.z, aB.z, kD);
  float lenA = mix(aA.w, aB.w, kD);
  float mover = step(0.0001, aB.w);
  float wA = mix(aS.x, 0.075 * mover, kD);
  float dA = mix(aS.y, 0.1 * mover, kD);
  float zA = mover * (sin(3.14159265 * kD) * 0.9 + kD * 0.02);
  // from → assembled
  float k = clamp((uProgress - delay) / 0.35, 0.0, 1.0);
  float e = kmEase(k);
  vec2 cF = uFromOrigin + aF.xy * uFromPitch;
  float zF = aF.z * uExplode;
  kmC = vec3(mix(cF, cA, e), mix(zF, zA, e) + sin(3.14159265 * e) * (0.6 + aT.w * 0.9));
  kmAng = mix(aF.w, angA, e);
  kmLen = mix(uFromPitch * 0.97, lenA, e);
  kmW = mix(uFromPitch * 0.13, wA, e);
  kmD = mix(uFromPitch * 0.13, dA, e);
  kmAxis = normalize(aSpin.xyz);
  kmTumble = aSpin.w * sin(3.14159265 * e);
  // tints
  vTint = 0.0;
  if (aT.x >= 0.0 && uHover >= 0.0 && (kind == 3.0 || kind == 4.0)) {
    if (abs(aT.x - uHover) < 0.5) vTint = 1.0;
    else {
      int h = int(uHover + 0.5);
      int m = int((h < 16 ? aT.y : aT.z) + 0.5);
      int b = h < 16 ? h : h - 16;
      if (((m >> b) & 1) == 1) vTint = 0.5;
    }
  }
  if (kind == 3.0 && vTint > 0.9) kmC.z += uLift * (1.0 - kD);
  vTintCol = uPlate[int(clamp(cell, 0.0, 4.0))];
  vKind = kind;
  vSeed = aT.w;
  vLen = kmLen;
}
vec3 kumikoPosition(vec3 p){
  vec3 q = vec3(p.x * kmLen, p.y * kmW, p.z * kmD);
  vEnd = (0.5 - abs(p.x)) * kmLen;
  vGrain = vec2(p.x * kmLen + vSeed * 17.0, p.y + p.z);
  q = kmRotZ(q, kmAng);
  q = kmRot(q, kmAxis, kmTumble);
  return q + kmC;
}
vec3 kumikoNormal(vec3 n){ return kmRot(kmRotZ(n, kmAng), kmAxis, kmTumble); }
`;

/** Wood shading injected into MeshStandardMaterial's fragment (replaces the flat diffuse colour). */
export const KUMIKO_FRAG_PARS = /* glsl */`
uniform vec3 uRunWood, uInlay, uFrameTint, uInk;
uniform float uNight, uOutline, uAlpha;
varying vec3 vTintCol;
varying float vTint, vKind, vSeed, vEnd, vLen;
varying vec2 vGrain;
float kmH(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float kmN(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(kmH(i), kmH(i + vec2(1, 0)), u.x), mix(kmH(i + vec2(0, 1)), kmH(i + vec2(1, 1)), u.x), u.y); }
`;

export const KUMIKO_FRAG_COLOR = /* glsl */`
  vec3 wood = diffuse * (0.9 + 0.18 * vSeed);
  // hinoki: straight grain along the strip, faint growth rings, tight and pale
  float gr = kmN(vec2(vGrain.x * 3.1, vGrain.y * 11.0 + vSeed * 40.0));
  float ring = 0.5 + 0.5 * sin(vGrain.x * 1.7 + gr * 5.0 + vSeed * 31.0);
  wood *= (0.93 + 0.09 * gr) * (0.975 + 0.035 * ring);
  if (vKind == 2.0) wood *= uFrameTint;
  if (vKind == 3.0) wood = uRunWood * (0.92 + 0.12 * vSeed) * (0.94 + 0.08 * gr);
  if (vKind == 4.0) wood = uInlay * (0.9 + 0.2 * gr);
  wood = mix(wood, vTintCol, vTint * (vKind == 4.0 ? 0.0 : 0.82));
  // the joint: where a piece meets the next, a hairline
  float seam = smoothstep(0.0, 0.03, vEnd);
  wood *= mix(0.8, 1.0, vKind == 2.0 ? 1.0 : seam);
  // night: the lantern is behind the paper, the lattice reads in silhouette
  wood *= mix(1.0, 0.36, uNight * (1.0 - vTint * 0.6));
  vec4 diffuseColor = vec4(wood, opacity * uAlpha);
`;

export const KUMIKO_OUTLINE = /* glsl */`
  #include <dithering_fragment>
  gl_FragColor.rgb = mix(gl_FragColor.rgb, uInk, uOutline);
`;

/** Planar shadow: the same pose, projected along the light onto the paper plane (z = 0); MIN blending keeps
 *  overlapping strips from darkening twice. */
export const SHADOW_VERT = /* glsl */`
${KUMIKO_PARS}
uniform vec3 uLightLocal;
void main(){
  kumikoPose();
  vec3 p = kumikoPosition(position);
  p.xy -= uLightLocal.xy * (p.z / max(uLightLocal.z, 0.05));
  p.z = 0.002;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;
export const SHADOW_FRAG = /* glsl */`
uniform vec3 uShadow;
void main(){
  gl_FragColor = vec4(uShadow, 1.0);
  #include <colorspace_fragment>
}`;

/** Shoji paper (胡粉 + fibres), Hokusai's page in the sixth cell, the andon glow at night. */
export const PAPER_VERT = /* glsl */`
uniform vec2 uSize;
varying vec2 vF;
void main(){
  vF = vec2(position.x + uSize.x * 0.5, uSize.y * 0.5 - position.y);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
export const PAPER_FRAG = (noise: string, paper: string) => /* glsl */`
uniform vec2 uSize, uSpecCell;
uniform vec4 uSpecCrop;
uniform sampler2D tSpec;
uniform float uSpecOn, uNight, uAlpha, uOutline, uCell;
uniform vec3 uPaper, uLantern, uPaperNight, uMat;
varying vec2 vF;
${noise}
${paper}
void main(){
  vec2 f = vF;
  vec3 col = paperTone(uPaper, f / 26.0);
  // andon behind the shoji: a warm, wide glow from low centre, falling off to the corners
  vec2 lc = vec2(uSize.x * 0.5, uSize.y * 0.82);
  float r = length((f - lc) / uSize);
  float glow = 0.55 + 0.45 * exp(-r * r * 4.0);
  vec3 lit = mix(uPaperNight, uLantern, glow * (0.82 + 0.1 * paperFibre(f / 26.0, 1.0)));
  col = mix(col, lit, uNight);
  // the sixth cell: Hokusai's page on a narrow mat (never recoloured)
  vec2 q = (f - uSpecCell) / uCell;
  if (q.x >= 0.0 && q.y >= 0.0 && q.x <= 1.0 && q.y <= 1.0) {
    vec2 m = vec2(0.035);
    if (q.x > m.x && q.y > m.y && q.x < 1.0 - m.x && q.y < 1.0 - m.y) {
      vec2 qq = (q - m) / (1.0 - 2.0 * m);
      vec2 uv = vec2(uSpecCrop.x + qq.x * uSpecCrop.z, 1.0 - (uSpecCrop.y + qq.y * uSpecCrop.w));
      col = mix(col, texture2D(tSpec, uv).rgb, uSpecOn);
    } else col = mix(col, uMat, uSpecOn);
  }
  float a = uAlpha * (1.0 - uOutline);
  gl_FragColor = vec4(col, a);
  #include <colorspace_fragment>
}`;
