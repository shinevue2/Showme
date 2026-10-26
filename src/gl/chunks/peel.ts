/**
 * Peel curl chunk (DESIGN §5.2 捲る, §6.1 cover sheet, §6.8 take-a-print). Owner: WP-05.
 *
 * A vertex-shader cylinder curl that lifts a flat sheet from one corner, the way a printer pulls a print off the
 * block: the part between the corner and the roll line wraps round a cylinder of radius uPeelRadius·width, then
 * leaves it along the tangent at uPeelMaxAngle (≈ 160°: the flap folds back over the sheet and rises slightly). At
 * uPeel = 1 the roll line has passed the far edge and the whole sheet has left its rest position.
 *
 * Uniforms (declare with PEEL_UNIFORMS; `peelUniforms()` builds the matching three uniform objects):
 *   uPeel         0..1 roll-line advance
 *   uPeelRadius   cylinder radius as a fraction of the sheet width (0.08 on the cover)
 *   uPeelDir      unit vector, in sheet space, from the starting corner into the sheet
 *   uPeelSize     sheet size in object units (x = width, y = height); uv 0..1 spans it
 *   uPeelCorner   uv of the starting corner ((1, 0) = lower-right)
 *   uPeelMaxAngle wrap angle where the flap leaves the cylinder (radians)
 *
 * GLSL:
 *   vec3 peel(vec3 p, vec2 uv, out vec3 n)   p: object-space position of a plane in xy facing +z whose uv spans
 *       0..1; returns the curled position and the front-face normal n (object space; the back face is −n).
 *   float peelLine(vec2 uv)                   signed distance (object units) past the roll line: < 0 = lifted part.
 *   float peelAmount()                        roll-line distance from the corner (object units).
 * JS: `peelRollDistance(peel, size, dir, radius, maxAngle)` gives the same roll-line distance on the CPU (for
 * shadows cast on other meshes).
 */
import type * as THREE from 'three';

export const PEEL_UNIFORMS = /* glsl */`
uniform float uPeel; uniform float uPeelRadius; uniform vec2 uPeelDir;
uniform vec2 uPeelSize; uniform vec2 uPeelCorner; uniform float uPeelMaxAngle;
`;

export const PEEL_VERT_CHUNK = /* glsl */`
float peelReach(){
  vec2 d = normalize(uPeelDir);
  vec2 c = uPeelCorner * uPeelSize;
  float tmax = 0.0;
  tmax = max(tmax, dot(vec2(0.0, 0.0) - c, d));
  tmax = max(tmax, dot(vec2(uPeelSize.x, 0.0) - c, d));
  tmax = max(tmax, dot(vec2(0.0, uPeelSize.y) - c, d));
  tmax = max(tmax, dot(uPeelSize - c, d));
  return tmax;
}
float peelAmount(){
  float r = max(uPeelRadius * uPeelSize.x, 1e-4);
  return uPeel * (peelReach() + r * (uPeelMaxAngle + 1.0));
}
float peelLine(vec2 uv){
  vec2 d = normalize(uPeelDir);
  float t = dot(uv * uPeelSize - uPeelCorner * uPeelSize, d);
  return t - peelAmount();
}
vec3 peel(vec3 p, vec2 uv, out vec3 n){
  n = vec3(0.0, 0.0, 1.0);
  vec2 d = normalize(uPeelDir);
  float r = max(uPeelRadius * uPeelSize.x, 1e-4);
  float L = peelAmount();
  float t = dot(uv * uPeelSize - uPeelCorner * uPeelSize, d);
  float s = L - t;                       // arc length from the roll line back towards the corner
  if (s <= 0.0) return p;
  float th = s / r;
  float tNew; float z;
  if (th <= uPeelMaxAngle) {
    tNew = L - r * sin(th);
    z = r * (1.0 - cos(th));
  } else {
    float a = uPeelMaxAngle;
    float rest = s - a * r;
    tNew = L - r * sin(a) - rest * cos(a);
    z = r * (1.0 - cos(a)) + rest * sin(a);
    th = a;
  }
  p.xy += d * (tNew - t);
  p.z += z;
  n = vec3(d * sin(th), cos(th));
  return p;
}
`;

export interface PeelUniforms {
  uPeel: THREE.IUniform<number>;
  uPeelRadius: THREE.IUniform<number>;
  uPeelDir: THREE.IUniform<THREE.Vector2>;
  uPeelSize: THREE.IUniform<THREE.Vector2>;
  uPeelCorner: THREE.IUniform<THREE.Vector2>;
  uPeelMaxAngle: THREE.IUniform<number>;
}

/** Uniform objects for PEEL_UNIFORMS (vectors are created by the caller's three instance). */
export function peelUniforms(V2: typeof THREE.Vector2, o: { radius?: number; dir?: [number, number]; size?: [number, number]; corner?: [number, number]; maxAngle?: number } = {}): PeelUniforms {
  const dir = o.dir ?? [-0.34, 0.94];
  const len = Math.hypot(dir[0], dir[1]) || 1;
  return {
    uPeel: { value: 0 },
    uPeelRadius: { value: o.radius ?? 0.08 },
    uPeelDir: { value: new V2(dir[0] / len, dir[1] / len) },
    uPeelSize: { value: new V2(...(o.size ?? [1, 1])) },
    uPeelCorner: { value: new V2(...(o.corner ?? [1, 0])) },
    uPeelMaxAngle: { value: o.maxAngle ?? Math.PI - 0.35 },
  };
}

/** CPU twin of `peelAmount()`: roll-line distance from the corner, in the sheet's units. */
export function peelRollDistance(peel: number, size: [number, number], dir: [number, number], radius: number, maxAngle: number, corner: [number, number] = [1, 0]): number {
  const len = Math.hypot(dir[0], dir[1]) || 1;
  const dx = dir[0] / len, dy = dir[1] / len;
  const cx = corner[0] * size[0], cy = corner[1] * size[1];
  let tmax = 0;
  for (const [x, y] of [[0, 0], [size[0], 0], [0, size[1]], [size[0], size[1]]] as const) tmax = Math.max(tmax, (x - cx) * dx + (y - cy) * dy);
  const r = Math.max(radius * size[0], 1e-4);
  return peel * (tmax + r * (maxAngle + 1));
}
