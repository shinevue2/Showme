/**
 * Washi paper chunk (DESIGN §8.6 Post: "views add their own fibre noise via paper.ts"). Owner: WP-00.
 * Requires NOISE (research.ts) in the same shader. `paperFibre(uv, scale)` returns 0..1 fibre streaks;
 * `paperTone(base, uv)` modulates a base colour with fibres and a faint mottle — never a beige tint.
 */
export const PAPER = /* glsl */`
float paperFibre(vec2 uv, float scale){
  float f = fbm(uv * vec2(220.0, 60.0) * scale);
  float streak = smoothstep(0.62, 0.9, fbm(uv * vec2(40.0, 6.0) * scale + 3.7));
  return clamp(f * 0.8 + streak * 0.35, 0.0, 1.0);
}
vec3 paperTone(vec3 base, vec2 uv){
  float fib = paperFibre(uv, 1.0);
  float mottle = fbm(uv * 3.0 + 11.0);
  return base * (0.965 + 0.05 * fib) * (0.985 + 0.03 * mottle);
}
`;
