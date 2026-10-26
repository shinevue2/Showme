/**
 * Shared GLSL noise (DESIGN §8.3, owner WP-00). Hash-based, deterministic on every GPU (no sin(t·big)).
 * NOISE is the verified block from research.ts (hash21, vnoise, fbm); the extras are for views that need
 * 3D noise or more octaves. Include once per shader: `${NOISE}` then `${NOISE_EXTRA}` if needed.
 */
export { NOISE } from './research';

export const NOISE_EXTRA = /* glsl */`
float hash11(float p){ p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
float hash31(vec3 p3){ p3 = fract(p3 * 0.1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
vec2 hash22(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float vnoise3(vec3 p){
  vec3 i = floor(p), f = fract(p); vec3 u = f * f * (3.0 - 2.0 * f);
  float n000 = hash31(i), n100 = hash31(i + vec3(1,0,0)), n010 = hash31(i + vec3(0,1,0)), n110 = hash31(i + vec3(1,1,0));
  float n001 = hash31(i + vec3(0,0,1)), n101 = hash31(i + vec3(1,0,1)), n011 = hash31(i + vec3(0,1,1)), n111 = hash31(i + vec3(1,1,1));
  return mix(mix(mix(n000, n100, u.x), mix(n010, n110, u.x), u.y), mix(mix(n001, n101, u.x), mix(n011, n111, u.x), u.y), u.z);
}
float fbmN(vec2 p, int octaves){ float a = 0.5, s = 0.0; for (int i = 0; i < 6; i++){ if (i >= octaves) break; s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
`;
