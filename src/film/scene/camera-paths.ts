/**
 * Camera paths (DESIGN §7.2, owner WP-03). Frame-exact rest poses; between rests the camera
 *   0–36 %  eases out leftwards inside diorama k (parallax reveals the depth of the plates),
 *   33–50 % crosses the 40-unit gap while interlocked mist cards cover the frame (DESIGN: 25–60 %),
 *   47–100 % eases into diorama k+1's rest pose (zero velocity and acceleration at the rest frame).
 * Three overlapping smootherstep ramps (departure, crossing, arrival) keep velocity continuous everywhere.
 * Portrait adds vertical pans in the first and last quarter (DESIGN: "vertical pans within each diorama").
 */
import type { StationGeom } from './tatebanko';
import { D } from './tatebanko';
import { lerp, phase, smoother, type VariantSpec } from './timeline';

export interface CamPose { x: number; y: number; z: number; fov: number }

interface PathTuning { depart: number; arrive: number; rise: number; dolly: number }
const TUNING: Record<'landscape' | 'portrait', PathTuning> = {
  landscape: { depart: 2.0, arrive: 2.2, rise: 0.3, dolly: 1.1 },
  portrait: { depart: 0.6, arrive: 0.7, rise: 1.4, dolly: 0.7 },
};

export function cameraAt(spec: VariantSpec, stations: readonly StationGeom[], f: number): CamPose {
  const aspect = spec.width / spec.height;
  const T = TUNING[spec.variant];
  const ph = phase(spec, f);
  const a = stations[ph.k]!.restPose(spec.variant, aspect);
  if (ph.outro) {
    // rain thins, the camera drifts on along the road and lifts a little into the mist
    const e = smoother(0, 1, ph.u);
    return { x: a.x - 1.6 * e, y: a.y + (spec.variant === 'portrait' ? 1.2 : 0.35) * e, z: D + 0.9 * e, fov: a.fov };
  }
  const nb = stations[ph.k + 1];
  const b = nb ? nb.restPose(spec.variant, aspect) : { ...a, x: a.x - 40 };   // (only while authoring a subset)
  const u = ph.u;
  const A = smoother(0, 0.36, u);
  const B = smoother(0.33, 0.5, u);
  const C = smoother(0.47, 1, u);
  const dx = b.x - a.x;
  const x = a.x - T.depart * A + (dx + T.depart + T.arrive) * B - T.arrive * C;
  const y = a.y + (b.y - a.y) * B + T.rise * (A - C);
  const z = D + T.dolly * (A - C);
  return { x, y, z, fov: lerp(a.fov, b.fov, B) };
}
