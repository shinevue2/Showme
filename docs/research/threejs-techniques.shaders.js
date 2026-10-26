// GLSL sketches used in docs/research/threejs-techniques.md — compile-tested against three r186 (WebGL2/SwiftShader)
export const FSQ_VERT = /* glsl */`
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

export const NOISE = /* glsl */`
float hash21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(hash21(i), hash21(i+vec2(1,0)), u.x), mix(hash21(i+vec2(0,1)), hash21(i+vec2(1,1)), u.x), u.y); }
float fbm(vec2 p){ float a=0.5, s=0.0; for(int i=0;i<4;i++){ s+=a*vnoise(p); p=p*2.03+17.1; a*=0.5; } return s; }`;

// ---------- (c) closed-form marbling (Lu, Jaffer et al. 2012) : one pass per operation ----------
export const MARBLE_OP_FRAG = /* glsl */`
uniform sampler2D tPrev;      // previous pattern (rgb = ink colour, a = ink amount)
uniform int   uOp;            // 0 = ink drop, 1 = tine stroke
uniform float uAspect;        // width / height of the pattern texture
uniform vec2  uC; uniform float uR; uniform vec4 uInk;           // drop centre, radius, ink
uniform vec2  uA; uniform vec2 uM; uniform float uAlpha, uLambda, uSpacing; // tine point, unit dir, shift, sharpness, comb spacing (0 = single tine)
varying vec2 vUv;
vec4 prevAt(vec2 p){ return texture2D(tPrev, vec2(p.x / uAspect, p.y)); }
void main(){
  vec2 p = vec2(vUv.x * uAspect, vUv.y);            // isotropic pattern space
  if (uOp == 0) {
    vec2  d  = p - uC;
    float l  = length(d);
    float aa = fwidth(l);
    float inside = 1.0 - smoothstep(uR - aa, uR + aa, l);
    // inverse of P' = C + (P-C) * sqrt(1 + r^2/|P-C|^2)
    vec2 q = uC + d * sqrt(max(1.0 - (uR*uR) / max(l*l, 1e-8), 0.0));
    gl_FragColor = mix(prevAt(q), uInk, inside);
  } else {
    vec2  N = vec2(-uM.y, uM.x);
    float d = abs(dot(p - uA, N));
    if (uSpacing > 0.0) d = 0.5*uSpacing - abs(mod(d, uSpacing) - 0.5*uSpacing);
    // inverse of P' = P + (alpha*lambda/(d+lambda)) M  (d is invariant along M)
    gl_FragColor = prevAt(p - (uAlpha * uLambda / (d + uLambda)) * uM);
  }
}`;

export const MARBLE_SHOW_FRAG = /* glsl */`
uniform sampler2D tPattern; uniform sampler2D tPaper; uniform vec3 uPaper;
varying vec2 vUv;
${NOISE}
void main(){
  vec4 ink = texture2D(tPattern, vUv);
  float fibre = fbm(vUv * vec2(220.0, 60.0));                   // washi fibre streaks
  float density = ink.a * (0.82 + 0.25 * fibre);                 // ink soaks unevenly
  vec3 col = mix(uPaper, ink.rgb, clamp(density, 0.0, 1.0));
  col *= 0.97 + 0.06 * fibre;
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

// ---------- (c) stable fluids kernels ----------
export const FLUID = {
  advect: /* glsl */`
uniform sampler2D uVel, uSrc; uniform vec2 uTexel; uniform float uDt, uDiss; varying vec2 vUv;
void main(){ vec2 back = vUv - uDt * texture2D(uVel, vUv).xy * uTexel; gl_FragColor = uDiss * texture2D(uSrc, back); }`,
  splat: /* glsl */`
uniform sampler2D uSrc; uniform vec2 uPoint; uniform vec3 uValue; uniform float uRadius, uAspect; varying vec2 vUv;
void main(){ vec2 d = vUv - uPoint; d.x *= uAspect; gl_FragColor = texture2D(uSrc, vUv) + vec4(uValue * exp(-dot(d,d)/uRadius), 0.0); }`,
  curl: /* glsl */`
uniform sampler2D uVel; uniform vec2 uTexel; varying vec2 vUv;
void main(){ float L=texture2D(uVel,vUv-vec2(uTexel.x,0)).y, R=texture2D(uVel,vUv+vec2(uTexel.x,0)).y,
  B=texture2D(uVel,vUv-vec2(0,uTexel.y)).x, T=texture2D(uVel,vUv+vec2(0,uTexel.y)).x; gl_FragColor = vec4(0.5*(R-L-T+B),0,0,1); }`,
  vorticity: /* glsl */`
uniform sampler2D uVel, uCurl; uniform vec2 uTexel; uniform float uEps, uDt; varying vec2 vUv;
void main(){ float L=texture2D(uCurl,vUv-vec2(uTexel.x,0)).x, R=texture2D(uCurl,vUv+vec2(uTexel.x,0)).x,
  B=texture2D(uCurl,vUv-vec2(0,uTexel.y)).x, T=texture2D(uCurl,vUv+vec2(0,uTexel.y)).x, C=texture2D(uCurl,vUv).x;
  vec2 f = 0.5*vec2(abs(T)-abs(B), abs(R)-abs(L)); f /= length(f) + 1e-5; f *= uEps * C; f.y *= -1.0;
  gl_FragColor = vec4(texture2D(uVel,vUv).xy + f*uDt, 0, 1); }`,
  divergence: /* glsl */`
uniform sampler2D uVel; uniform vec2 uTexel; varying vec2 vUv;
void main(){ vec2 c = texture2D(uVel,vUv).xy;
  float L=texture2D(uVel,vUv-vec2(uTexel.x,0)).x, R=texture2D(uVel,vUv+vec2(uTexel.x,0)).x,
        B=texture2D(uVel,vUv-vec2(0,uTexel.y)).y, T=texture2D(uVel,vUv+vec2(0,uTexel.y)).y;
  if (vUv.x - uTexel.x < 0.0) L = -c.x; if (vUv.x + uTexel.x > 1.0) R = -c.x;   // no-slip walls
  if (vUv.y - uTexel.y < 0.0) B = -c.y; if (vUv.y + uTexel.y > 1.0) T = -c.y;
  gl_FragColor = vec4(0.5*(R-L+T-B), 0, 0, 1); }`,
  jacobi: /* glsl */`
uniform sampler2D uP, uDiv; uniform vec2 uTexel; varying vec2 vUv;
void main(){ float L=texture2D(uP,vUv-vec2(uTexel.x,0)).x, R=texture2D(uP,vUv+vec2(uTexel.x,0)).x,
  B=texture2D(uP,vUv-vec2(0,uTexel.y)).x, T=texture2D(uP,vUv+vec2(0,uTexel.y)).x;
  gl_FragColor = vec4(0.25*(L+R+B+T - texture2D(uDiv,vUv).x), 0, 0, 1); }`,
  gradient: /* glsl */`
uniform sampler2D uP, uVel; uniform vec2 uTexel; varying vec2 vUv;
void main(){ float L=texture2D(uP,vUv-vec2(uTexel.x,0)).x, R=texture2D(uP,vUv+vec2(uTexel.x,0)).x,
  B=texture2D(uP,vUv-vec2(0,uTexel.y)).x, T=texture2D(uP,vUv+vec2(0,uTexel.y)).x;
  gl_FragColor = vec4(texture2D(uVel,vUv).xy - 0.5*vec2(R-L, T-B), 0, 1); }`,
  scale: /* glsl */`
uniform sampler2D uSrc; uniform float uK; varying vec2 vUv; void main(){ gl_FragColor = uK * texture2D(uSrc, vUv); }`,
};

// ---------- (f) raked sand height field ----------
export const SAND_FRAG = /* glsl */`
uniform sampler2D tTrail;          // r = lateral position across a rake stroke (0..1), a = coverage
uniform vec3  uStones[3];          // xy = centre (plane units), z = radius
uniform vec2  uSize;               // plane size in units
uniform vec3  uSunDir;             // normalized, low elevation
uniform vec3  uSandLit, uSandShade;
uniform float uSpacing, uTines;
varying vec2 vUv;
${NOISE}
const float TAU = 6.2831853;
float groove(float d){ return 0.5 + 0.5 * cos(TAU * d / uSpacing); }
float heightAt(vec2 uv){
  vec2 p = (uv - 0.5) * uSize;
  float h = groove(p.y + 0.15 * uSpacing * sin(p.x * 0.7));     // long straight rows (slightly hand-raked)
  for (int i = 0; i < 3; i++) {                                   // samon: concentric rings around stones
    float ds = length(p - uStones[i].xy) - uStones[i].z;
    float w  = 1.0 - smoothstep(uSpacing * 4.0, uSpacing * 5.5, ds);
    h = mix(h, groove(max(ds, 0.0)), w);
  }
  vec4 tr = texture2D(tTrail, uv);                                // visitor's own strokes
  h = mix(h, 0.5 + 0.5 * cos(TAU * (tr.r - 0.5) * uTines), tr.a);
  return h;
}
float stoneShadow(vec2 uv){
  vec2 p = (uv - 0.5) * uSize; float s = 1.0;
  for (int i = 0; i < 3; i++) {
    vec2 q = p - uStones[i].xy;
    float t = max(dot(q, -uSunDir.xz), 0.0);                      // distance towards the sun
    float d = length(q + uSunDir.xz * t) - uStones[i].z;          // closest approach of the sun ray
    s *= mix(1.0, smoothstep(-0.05, 0.25, d), smoothstep(uStones[i].z * 4.0, 0.0, t));
  }
  return s;
}
void main(){
  vec2 e = vec2(1.0 / 1024.0, 0.0);
  float h  = heightAt(vUv);
  float hx = heightAt(vUv + e.xy) - heightAt(vUv - e.xy);
  float hy = heightAt(vUv + e.yx) - heightAt(vUv - e.yx);
  vec3 n = normalize(vec3(-hx * 6.0, 1.0, -hy * 6.0));
  float diff = clamp(dot(n, uSunDir), 0.0, 1.0);
  float grain = hash21(floor(vUv * 1400.0));
  float glint = step(0.995, grain) * pow(diff, 8.0);              // quartz sparkle on lit flanks
  vec3 col = mix(uSandShade, uSandLit, diff * stoneShadow(vUv));
  col *= 0.86 + 0.14 * h;                                         // cavity darkening in grooves
  col *= 0.95 + 0.1 * grain;
  col += glint * 0.6;
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

// rake stroke drawn into the trail RT as a quad per pointer segment (attribute aLateral: 0..1 across the stroke)
export const RAKE_STROKE_VERT = /* glsl */`
attribute float aLateral; varying float vLat;
void main(){ vLat = aLateral; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
export const RAKE_STROKE_FRAG = /* glsl */`
varying float vLat;
void main(){ float edge = smoothstep(0.0, 0.08, vLat) * smoothstep(1.0, 0.92, vLat); gl_FragColor = vec4(vLat, 0.0, 0.0, edge); }`;

// ---------- (e) handscroll (emakimono) : two rollers, paper wraps on both sides ----------
export const SCROLL_VERT = /* glsl */`
uniform float uLeft, uRight;     // object-space x of the two roll lines (visible flat window between them)
uniform float uRadius, uThick;   // roller radius, paper thickness per turn
varying vec2 vUv; varying vec3 vN; varying float vRollShade;
vec3 wrap(float s, float side, out vec3 n){   // s = arc length past the roll line, side = +1 right / -1 left
  float theta = s / uRadius;
  float r = max(uRadius - uThick * theta / 6.2831853, 0.002);
  n = vec3(-side * sin(theta), 0.0, cos(theta));
  return vec3(side * r * sin(theta), 0.0, uRadius - r * cos(theta));
}
void main(){
  vUv = uv; vec3 p = position; vec3 n = vec3(0.0, 0.0, 1.0); vRollShade = 1.0;
  if (p.x > uRight)      { vec3 o = wrap(p.x - uRight, 1.0, n);  p.x = uRight + o.x; p.z = o.z; vRollShade = 0.0; }
  else if (p.x < uLeft)  { vec3 o = wrap(uLeft - p.x, -1.0, n);  p.x = uLeft  + o.x; p.z = o.z; vRollShade = 0.0; }
  else { float k = min(p.x - uLeft, uRight - p.x); vRollShade = smoothstep(0.0, uRadius * 1.5, k); } // contact shadow near rollers
  vN = normalize(normalMatrix * n);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;
export const SCROLL_FRAG = /* glsl */`
uniform sampler2D tArt; uniform vec3 uBack; uniform vec3 uLightDir; varying vec2 vUv; varying vec3 vN; varying float vRollShade;
void main(){
  vec3 n = normalize(vN) * (gl_FrontFacing ? 1.0 : -1.0);
  vec3 base = gl_FrontFacing ? texture2D(tArt, vUv).rgb : uBack;   // painting on the front, plain washi behind
  float lit = 0.55 + 0.45 * max(dot(n, normalize(uLightDir)), 0.0);
  gl_FragColor = vec4(base * lit * mix(0.82, 1.0, vRollShade), 1.0);
  #include <colorspace_fragment>
}`;

// ---------- (e) six-panel folding screen + gold leaf ----------
export const BYOBU_VERT = /* glsl */`
uniform float uPanels, uPanelW, uFold;     // fold = hinge angle (0 flat .. ~1.45 closed)
varying vec2 vUv; varying vec3 vWorld; varying vec3 vViewPos;
void main(){
  vUv = uv;
  float u = uv.x * uPanels;
  float i = min(floor(u), uPanels - 1.0);
  float f = u - i;
  float c = cos(uFold), s = sin(uFold);
  float x = (u * uPanelW) * c - 0.5 * uPanels * uPanelW * c;
  float z = (mod(i, 2.0) < 0.5 ? f : 1.0 - f) * uPanelW * s;     // zig-zag
  vec4 wp = modelMatrix * vec4(x, position.y, z, 1.0);
  vWorld = wp.xyz;
  vec4 mv = viewMatrix * wp; vViewPos = mv.xyz;
  gl_Position = projectionMatrix * mv;
}`;
export const GOLD_FRAG = /* glsl */`
uniform sampler2D tArt;      // painting (irises, waves ...) on top of the gold ground
uniform vec3  uLightPos, uLightCol;
uniform float uLeafPerUnit, uAspect;
varying vec2 vUv; varying vec3 vWorld; varying vec3 vViewPos;
${NOISE}
vec3 envStudio(vec3 r){                       // procedural "room": warm floor, bright ceiling, two softboxes
  vec3 c = mix(vec3(0.20, 0.16, 0.12), vec3(1.0, 0.96, 0.90), smoothstep(-0.3, 0.7, r.y));
  c += 5.0 * vec3(1.0, 0.95, 0.85) * smoothstep(0.93, 0.99, dot(r, normalize(vec3(0.5, 0.6, 0.6))));
  c += 2.0 * smoothstep(0.96, 0.995, dot(r, normalize(vec3(-0.7, 0.2, 0.7))));
  return c;
}
void main(){
  vec3 nGeo = normalize(cross(dFdx(vViewPos), dFdy(vViewPos)));          // flat per-panel normal (view space)
  vec2 g = vUv * vec2(uAspect, 1.0) * uLeafPerUnit;
  g.x += 0.5 * step(1.0, mod(floor(g.y), 2.0));                           // leaves laid in staggered rows
  vec2 cell = floor(g), f = fract(g);
  float rnd = hash21(cell);
  float seam = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y));
  float hakuAshi = smoothstep(0.0, 0.02, seam);                           // overlap seams of the squares
  vec2 crinkle = vec2(vnoise(g * 18.0) - 0.5, vnoise(g * 18.0 + 7.3) - 0.5);
  vec3 tilt = vec3((rnd - 0.5) * 0.08 + crinkle.x * 0.06, (hash21(cell + 3.1) - 0.5) * 0.08 + crinkle.y * 0.06, 0.0);
  vec3 n = normalize(nGeo + tilt);
  vec3 v = normalize(-vViewPos);
  vec3 L = normalize((viewMatrix * vec4(uLightPos, 1.0)).xyz - vViewPos);
  vec3 h = normalize(v + L);
  vec3 F0 = vec3(1.0, 0.766, 0.336);
  float NoV = max(dot(n, v), 1e-3), NoL = max(dot(n, L), 0.0), NoH = max(dot(n, h), 1e-3);
  vec3 F = F0 + (1.0 - F0) * pow(1.0 - NoV, 5.0);
  vec3 t = normalize(vec3(cos(rnd * 0.6), sin(rnd * 0.6), 0.0));         // hammering direction differs per leaf
  vec3 b = normalize(cross(n, t)); t = cross(b, n);
  float ax = 0.10, ay = 0.32, th = dot(t, h) / ax, bh = dot(b, h) / ay;
  float ward = exp(-(th * th + bh * bh) / (NoH * NoH)) / (12.566 * ax * ay * sqrt(max(NoL * NoV, 1e-4)));
  vec3 rW = (inverse(viewMatrix) * vec4(reflect(-v, n), 0.0)).xyz;
  vec3 gold = F * envStudio(rW) * (0.88 + 0.24 * rnd) + F * uLightCol * ward * NoL;
  float wear = smoothstep(0.66, 0.70, fbm(g * 0.9 + 3.0));               // worn patches show the red ground
  vec3 ground = vec3(0.42, 0.10, 0.06) * (0.4 + 0.6 * NoL);
  vec3 col = mix(gold, ground, wear) * mix(0.72, 1.0, hakuAshi);
  vec4 art = texture2D(tArt, vUv);                                        // mineral pigments sit on top (matte)
  col = mix(col, art.rgb * (0.35 + 0.65 * NoL) + 0.05, art.a);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

// ---------- (d) assembly of instanced pieces, injected into MeshStandardMaterial ----------
export function patchAssembly(material, uProgress) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uProgress = uProgress;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        uniform float uProgress;
        attribute vec3 aFrom; attribute vec4 aSpin; attribute float aDelay;
        vec3 rotAxis(vec3 v, vec3 a, float ang){ return v * cos(ang) + cross(a, v) * sin(ang) + a * dot(a, v) * (1.0 - cos(ang)); }
        float easeOutBack(float x){ float c1 = 1.70158, c3 = c1 + 1.0; return 1.0 + c3 * pow(x - 1.0, 3.0) + c1 * pow(x - 1.0, 2.0); }`)
      .replace('#include <beginnormal_vertex>', `
        float kAsm = clamp((uProgress - aDelay) / 0.35, 0.0, 1.0);
        float eAsm = easeOutBack(kAsm);
        vec3 axAsm = normalize(aSpin.xyz); float angAsm = aSpin.w * (1.0 - eAsm);
        vec3 objectNormal = rotAxis(normal, axAsm, angAsm);
        #ifdef USE_TANGENT
          vec3 objectTangent = vec3(tangent.xyz);
        #endif`)
      .replace('#include <begin_vertex>', `vec3 transformed = rotAxis(position, axAsm, angAsm);`)
      .replace('#include <project_vertex>', `
        vec4 mvPosition = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          mvPosition = instanceMatrix * mvPosition;
        #endif
        mvPosition.xyz += aFrom * (1.0 - eAsm);        // fly in from scattered position (mesh space)
        mvPosition = modelViewMatrix * mvPosition;
        gl_Position = projectionMatrix * mvPosition;`);
  };
  material.customProgramCacheKey = () => 'assembly-v1';
}

// ---------- (g) instanced petals, all motion in the vertex shader ----------
export const PETAL_VERT = /* glsl */`
uniform float uTime; uniform vec3 uBox; uniform vec2 uWind;
attribute vec4 aSeed;    // xyz = spawn (0..1 in box), w = random
varying float vShade; varying vec2 vUv;
vec3 rotAxis(vec3 v, vec3 a, float ang){ return v * cos(ang) + cross(a, v) * sin(ang) + a * dot(a, v) * (1.0 - cos(ang)); }
void main(){
  vUv = uv;
  float speed = mix(0.12, 0.28, aSeed.w);
  float fall = fract(aSeed.y - uTime * speed / uBox.y);              // wraps top->bottom forever
  vec3 c = (vec3(aSeed.x, fall, aSeed.z) - 0.5) * uBox;
  float ph = uTime * (1.2 + aSeed.w) + aSeed.w * 40.0;
  c.xz += uWind * (1.0 - fall) * uBox.y * 0.6 + vec2(sin(ph * 0.7), cos(ph * 0.5)) * 0.25;
  vec3 p = position;
  p.z += 0.08 * sin(ph * 3.0 + position.x * 6.0);                    // flutter bend
  vec3 axis = normalize(vec3(sin(aSeed.w * 13.0), 0.6, cos(aSeed.w * 7.0)));
  p = rotAxis(p, axis, ph);
  vec3 n = rotAxis(vec3(0.0, 0.0, 1.0), axis, ph);
  vShade = 0.6 + 0.4 * abs(n.y);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(c + p * 0.06, 1.0);
}`;
export const PETAL_FRAG = /* glsl */`
uniform vec3 uColA, uColB; varying float vShade; varying vec2 vUv;
void main(){ vec3 col = mix(uColA, uColB, vUv.y) * vShade; gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

// ---------- (h) one combined post pass ----------
export const POST_FRAG = /* glsl */`
uniform sampler2D tScene; uniform vec2 uRes; uniform float uTime, uGrain, uBleed, uChroma, uVignette, uNight, uAnimGrain;
uniform vec3 uNightTint;
varying vec2 vUv;
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
void main(){
  vec2 px = 1.0 / uRes;
  vec3 c0 = texture2D(tScene, vUv).rgb;
  // nijimi: dark ink creeps into the paper along fibres -> min() of 4 jittered taps (5 fetches total)
  vec2 cell = floor(gl_FragCoord.xy / 3.0);
  vec2 fib = vec2(hash12(cell), hash12(cell + 19.7)) - 0.5;
  vec2 o = (fib * 1.5 + 0.75) * px * uBleed;
  vec3 m = min(min(texture2D(tScene, vUv + vec2(o.x, 0.0)).rgb, texture2D(tScene, vUv - vec2(o.x, 0.0)).rgb),
               min(texture2D(tScene, vUv + vec2(0.0, o.y)).rgb, texture2D(tScene, vUv - vec2(0.0, o.y)).rgb));
  vec3 c = mix(c0, min(c0, m), 0.6);
  c.r = mix(c.r, min(c.r, m.r), uChroma);                              // optional, keep tiny: warm fringe on ink edges
  float g = hash12(gl_FragCoord.xy + uAnimGrain * floor(uTime * 12.0) * vec2(17.0, 59.0));
  c *= 1.0 - uGrain * (g - 0.5);                                      // paper tooth
  vec2 q = (vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
  c *= mix(1.0 - uVignette, 1.0, smoothstep(1.1, 0.3, length(q)));
  c = mix(c, c * uNightTint + 0.02 * uNightTint, uNight);             // dusk grade (stays light, cooler)
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  gl_FragColor.rgb += (hash12(gl_FragCoord.xy + 0.5) - 0.5) / 255.0;  // dither against 8-bit banding
}`;

// ---------- (b) GPGPU particle kernels (GPUComputationRenderer) ----------
export const CURL = /* glsl */`
vec3 hash33(vec3 p){ p = vec3(dot(p,vec3(127.1,311.7,74.7)), dot(p,vec3(269.5,183.3,246.1)), dot(p,vec3(113.5,271.9,124.6))); return -1.0 + 2.0*fract(sin(p)*43758.5453); }
float gnoise(vec3 p){ vec3 i=floor(p), f=fract(p), u=f*f*(3.0-2.0*f);
  return mix(mix(mix(dot(hash33(i),f), dot(hash33(i+vec3(1,0,0)),f-vec3(1,0,0)),u.x),
                 mix(dot(hash33(i+vec3(0,1,0)),f-vec3(0,1,0)), dot(hash33(i+vec3(1,1,0)),f-vec3(1,1,0)),u.x),u.y),
             mix(mix(dot(hash33(i+vec3(0,0,1)),f-vec3(0,0,1)), dot(hash33(i+vec3(1,0,1)),f-vec3(1,0,1)),u.x),
                 mix(dot(hash33(i+vec3(0,1,1)),f-vec3(0,1,1)), dot(hash33(i+vec3(1,1,1)),f-vec3(1,1,1)),u.x),u.y),u.z); }
vec3 potential(vec3 p){ return vec3(gnoise(p), gnoise(p + vec3(31.4, 7.1, 2.9)), gnoise(p + vec3(-17.3, 12.9, 41.7))); }
vec3 curlNoise(vec3 p){                       // curl of a vector potential -> divergence-free flow
  const float e = 0.1; vec3 dx = vec3(e,0,0), dy = vec3(0,e,0), dz = vec3(0,0,e);
  vec3 px0 = potential(p - dx), px1 = potential(p + dx);
  vec3 py0 = potential(p - dy), py1 = potential(p + dy);
  vec3 pz0 = potential(p - dz), pz1 = potential(p + dz);
  return vec3((py1.z - py0.z) - (pz1.y - pz0.y), (pz1.x - pz0.x) - (px1.z - px0.z), (px1.y - px0.y) - (py1.x - py0.x)) / (2.0 * e);
}`;
export const GPGPU_VEL = /* glsl */`
uniform float uTime, uDt, uMorph, uCurlAmp, uSpring, uDamp, uShapeA, uShapeB, uBlend;
uniform sampler2D tTargets;     // targets stacked vertically: row k of size res.y holds shape k
uniform float uShapes;
uniform vec3 uPointer; uniform float uPointerR;
${CURL}
vec3 target(float k, vec2 uv){ return texture2D(tTargets, vec2(uv.x, (uv.y + k) / uShapes)).xyz; }
void main(){
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 p = texture2D(tPos, uv); vec4 v = texture2D(tVel, uv);
  vec3 goal = mix(target(uShapeA, uv), target(uShapeB, uv), uBlend);
  float stagger = clamp(uMorph * 1.6 - p.w * 0.6, 0.0, 1.0);          // p.w = per-particle random -> staggered arrival
  vec3 acc = (goal - p.xyz) * uSpring * stagger;
  acc += curlNoise(p.xyz * 1.3 + uTime * 0.07) * uCurlAmp * (1.0 - 0.85 * stagger);
  vec3 dp = p.xyz - uPointer; float dl = length(dp);
  acc += dp / max(dl, 1e-3) * smoothstep(uPointerR, 0.0, dl) * 6.0;    // pointer repulsion
  v.xyz = (v.xyz + acc * uDt) * uDamp;
  gl_FragColor = v;
}`;
export const GPGPU_POS = /* glsl */`
uniform float uDt;
void main(){ vec2 uv = gl_FragCoord.xy / resolution.xy; vec4 p = texture2D(tPos, uv); vec4 v = texture2D(tVel, uv);
  gl_FragColor = vec4(p.xyz + v.xyz * uDt, p.w); }`;
export const PARTICLE_VERT = /* glsl */`
uniform sampler2D tPos; uniform float uSize, uDpr; attribute vec2 aRef; varying float vRnd;
void main(){ vec4 p = texture2D(tPos, aRef); vRnd = p.w;
  vec4 mv = modelViewMatrix * vec4(p.xyz, 1.0);
  gl_PointSize = uSize * uDpr * (0.6 + 0.8 * p.w) / -mv.z;
  gl_Position = projectionMatrix * mv; }`;
export const PARTICLE_FRAG = /* glsl */`
uniform vec3 uInk; varying float vRnd;
void main(){ vec2 c = gl_PointCoord - 0.5; float d = dot(c, c); if (d > 0.25) discard;
  gl_FragColor = vec4(uInk * (0.8 + 0.4 * vRnd), smoothstep(0.25, 0.1, d) * 0.85);
  #include <colorspace_fragment>
}`;

// ---------- (f) raymarched SDF inside a proxy box (only covered pixels pay) ----------
export const SDF_BOX_VERT = /* glsl */`
varying vec3 vObj; varying vec3 vCamObj;
void main(){ vObj = position; vCamObj = (inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
export const SDF_BOX_FRAG = /* glsl */`
uniform float uTime; uniform int uSteps; uniform vec3 uInk, uPaper;
varying vec3 vObj; varying vec3 vCamObj;
float smin(float a, float b, float k){ float h = clamp(0.5 + 0.5*(b-a)/k, 0.0, 1.0); return mix(b, a, h) - k*h*(1.0-h); }
float map(vec3 p){                                   // three ink drops merging (metaball-like)
  float d = 1e9;
  for (int i = 0; i < 3; i++) { float fi = float(i);
    vec3 c = 0.28 * vec3(sin(uTime*0.7 + fi*2.1), cos(uTime*0.5 + fi*1.3), sin(uTime*0.3 + fi*4.0));
    d = smin(d, length(p - c) - 0.22, 0.18); }
  return d;
}
vec3 nrm(vec3 p){ vec2 e = vec2(0.002, 0.0); return normalize(vec3(map(p+e.xyy)-map(p-e.xyy), map(p+e.yxy)-map(p-e.yxy), map(p+e.yyx)-map(p-e.yyx))); }
void main(){
  vec3 ro = vObj, rd = normalize(vObj - vCamObj);    // start on the box surface, not at the camera
  float t = 0.0; bool hit = false;
  for (int i = 0; i < 128; i++) { if (i >= uSteps) break;
    float d = map(ro + rd * t); if (d < 0.001) { hit = true; break; } t += d; if (t > 2.0) break; }
  if (!hit) discard;
  vec3 n = nrm(ro + rd * t);
  float fres = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
  gl_FragColor = vec4(mix(uInk, uPaper, 0.15 + 0.6 * fres), 1.0);
  #include <colorspace_fragment>
}`;
