/**
 * Colour helpers (DESIGN §3.1 tokens → WebGL; threejs §2 colour management). Owner: WP-00.
 * three r186: ColorManagement is on; `new THREE.Color('#hex')` converts sRGB → linear working space.
 * ShaderMaterials write linear values and end with `#include <colorspace_fragment>` (P4).
 */
import * as THREE from 'three';

/** Linear-space THREE.Color from a token hex (sRGB). */
export function tokenColor(hex: string): THREE.Color {
  return new THREE.Color(hex);
}

/** Read a token from the DOM (theme-aware) as a linear THREE.Color. */
export function readToken(el: Element, name: string, fallback = '#0F2540'): THREE.Color {
  const v = getComputedStyle(el).getPropertyValue(name).trim();
  const c = new THREE.Color();
  try { c.setStyle(v || fallback); } catch { c.setStyle(fallback); }
  return c;
}

/** GLSL helpers for code that must convert by hand (e.g. into an RT that is later sampled as sRGB data). */
export const COLORSPACE_GLSL = /* glsl */`
vec3 srgbToLinear(vec3 c){ return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
vec3 linearToSrgb(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
float luma(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
`;
