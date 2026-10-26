/**
 * One combined post pass (DESIGN §8.6 Post, threejs §h; *shaders* POST_FRAG adapted). Owner: WP-00.
 * High tier only: views render into a half-float RT at min(DPR, 1.5); this pass draws it to the canvas,
 * scissored to the union of the visible view rects: nijimi ink bleed, static paper tooth, ≤ 8 % vignette,
 * tone mapping + sRGB, ±0.5/255 dither. No chromatic aberration, no bloom.
 * Adaptation: the canvas is transparent (DOM paper shows between views), so the pass works on
 * un-premultiplied colour and writes premultiplied alpha with NoBlending.
 */
import * as THREE from 'three';
import type { GlobalUniforms } from '../../core/types';

export const POST_FRAG_PREMULT = /* glsl */`
uniform sampler2D tScene; uniform vec2 uRes; uniform float uTime, uGrain, uBleed, uVignette, uNight, uAnimGrain;
uniform vec3 uNightTint;
varying vec2 vUv;
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec3 tap(vec2 uv, vec3 fallback){ vec4 t = texture2D(tScene, uv); return t.a > 0.5 ? t.rgb / t.a : fallback; }
void main(){
  vec4 s0 = texture2D(tScene, vUv);
  if (s0.a < 0.002) { gl_FragColor = vec4(0.0); return; }
  vec2 px = 1.0 / uRes;
  vec3 c0 = s0.rgb / s0.a;
  vec2 cell = floor(gl_FragCoord.xy / 3.0);
  vec2 fib = vec2(hash12(cell), hash12(cell + 19.7)) - 0.5;
  vec2 o = (fib * 1.5 + 0.75) * px * uBleed;
  vec3 m = min(min(tap(vUv + vec2(o.x, 0.0), c0), tap(vUv - vec2(o.x, 0.0), c0)),
               min(tap(vUv + vec2(0.0, o.y), c0), tap(vUv - vec2(0.0, o.y), c0)));
  vec3 c = mix(c0, min(c0, m), 0.6);
  float g = hash12(gl_FragCoord.xy + uAnimGrain * floor(uTime * 12.0) * vec2(17.0, 59.0));
  c *= 1.0 - uGrain * (g - 0.5);
  vec2 q = (vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
  c *= mix(1.0 - uVignette, 1.0, smoothstep(1.1, 0.3, length(q)));
  c = mix(c, c * uNightTint + 0.02 * uNightTint, uNight);
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  gl_FragColor.rgb += (hash12(gl_FragCoord.xy + 0.5) - 0.5) / 255.0;
  gl_FragColor = vec4(gl_FragColor.rgb * s0.a, s0.a);
}`;

const VERT = /* glsl */`
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

export class Post {
  readonly rt: THREE.WebGLRenderTarget;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private material: THREE.ShaderMaterial;
  private mesh: THREE.Mesh;

  constructor(g: GlobalUniforms) {
    this.rt = new THREE.WebGLRenderTarget(4, 4, {
      type: THREE.HalfFloatType,
      depthBuffer: true,
      stencilBuffer: false,
      samples: 0,
    });
    this.material = new THREE.ShaderMaterial({
      name: 'hanmoto-post',
      vertexShader: VERT,
      fragmentShader: POST_FRAG_PREMULT,
      uniforms: {
        tScene: { value: this.rt.texture },
        uRes: { value: new THREE.Vector2(4, 4) },
        uTime: g.uTime,
        uNight: g.uNight,
        uGrain: { value: 0.035 },
        uBleed: { value: 1.0 },
        uVignette: { value: 0.06 },
        uAnimGrain: { value: 0 },
        uNightTint: { value: new THREE.Vector3(0.94, 0.97, 1.04) },
      },
      depthTest: false,
      depthWrite: false,
      blending: THREE.NoBlending,
      transparent: false,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
  }

  /** Size the RT at the canvas size × min(DPR, 1.5). */
  resize(cssW: number, cssH: number, dpr: number): void {
    const k = Math.min(dpr, 1.5);
    const w = Math.max(1, Math.round(cssW * k));
    const h = Math.max(1, Math.round(cssH * k));
    if (this.rt.width !== w || this.rt.height !== h) this.rt.setSize(w, h);
    (this.material.uniforms.uRes!.value as THREE.Vector2).set(w, h);
  }

  /** Composite the RT onto the canvas inside the union rect (CSS px, GL origin bottom-left). */
  render(renderer: THREE.WebGLRenderer, cssW: number, cssH: number, union: { x: number; y: number; w: number; h: number }): void {
    renderer.setRenderTarget(null);
    renderer.setViewport(0, 0, cssW, cssH);
    renderer.setScissor(union.x, union.y, union.w, union.h);
    renderer.setScissorTest(true);
    renderer.render(this.scene, this.camera);
    renderer.setScissorTest(false);
  }

  dispose(): void {
    this.rt.dispose();
    this.material.dispose();
    this.mesh.geometry.dispose();
  }
}
