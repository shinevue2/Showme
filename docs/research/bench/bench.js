// Headless SwiftShader micro-benchmarks for the playbook (three r186, WebGLRenderer)
import * as THREE from 'three';
import { GPUComputationRenderer } from 'three/addons/misc/GPUComputationRenderer.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

const W = 1280, H = 720;
const canvas = document.createElement('canvas');
document.body.appendChild(canvas);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
const gl = renderer.getContext();
const px = new Uint8Array(4);
const sync = () => { renderer.setRenderTarget(null); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); }; // forces GPU completion

function info() {
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  return {
    renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
    vendor: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
    maxTex: gl.getParameter(gl.MAX_TEXTURE_SIZE),
    cbf: !!gl.getExtension('EXT_color_buffer_float'),
    cbhf: !!gl.getExtension('EXT_color_buffer_half_float'),
    flin: !!gl.getExtension('OES_texture_float_linear'),
    parallel: !!gl.getExtension('KHR_parallel_shader_compile'),
    clip: !!gl.getExtension('EXT_clip_control'),
    deviceMemory: navigator.deviceMemory, hc: navigator.hardwareConcurrency,
    webgpu: !!navigator.gpu,
  };
}

function time(fn, frames = 30, warm = 3) {
  for (let i = 0; i < warm; i++) fn(i);
  sync();
  const t0 = performance.now();
  for (let i = 0; i < frames; i++) fn(i);
  sync();
  return +((performance.now() - t0) / frames).toFixed(2);
}

const NOISE = /* glsl */`
vec3 hash3(vec3 p){p=vec3(dot(p,vec3(127.1,311.7,74.7)),dot(p,vec3(269.5,183.3,246.1)),dot(p,vec3(113.5,271.9,124.6)));return -1.0+2.0*fract(sin(p)*43758.5453123);}
float gnoise(vec3 p){vec3 i=floor(p);vec3 f=fract(p);vec3 u=f*f*(3.0-2.0*f);
return mix(mix(mix(dot(hash3(i+vec3(0,0,0)),f-vec3(0,0,0)),dot(hash3(i+vec3(1,0,0)),f-vec3(1,0,0)),u.x),
mix(dot(hash3(i+vec3(0,1,0)),f-vec3(0,1,0)),dot(hash3(i+vec3(1,1,0)),f-vec3(1,1,0)),u.x),u.y),
mix(mix(dot(hash3(i+vec3(0,0,1)),f-vec3(0,0,1)),dot(hash3(i+vec3(1,0,1)),f-vec3(1,0,1)),u.x),
mix(dot(hash3(i+vec3(0,1,1)),f-vec3(0,1,1)),dot(hash3(i+vec3(1,1,1)),f-vec3(1,1,1)),u.x),u.y),u.z);}
vec3 curl(vec3 p){const float e=0.1;
vec3 dx=vec3(e,0,0),dy=vec3(0,e,0),dz=vec3(0,0,e);
float n1=gnoise(p+dy),n2=gnoise(p-dy),n3=gnoise(p+dz),n4=gnoise(p-dz),n5=gnoise(p+dx),n6=gnoise(p-dx);
float a=gnoise(p+dy+vec3(31.4))-gnoise(p-dy+vec3(31.4));float b=gnoise(p+dz+vec3(31.4))-gnoise(p-dz+vec3(31.4));
float c=gnoise(p+dx+vec3(-17.1))-gnoise(p-dx+vec3(-17.1));
return vec3((n1-n2)-(b), (n3-n4)-(c), (n5-n6)-(a))/(2.0*e);}
`;

function benchGPGPU(size) {
  const gpu = new GPUComputationRenderer(size, size, renderer);
  gpu.setDataType(THREE.HalfFloatType);
  const pos0 = gpu.createTexture();
  const tgt = gpu.createTexture();
  const a = pos0.image.data, b = tgt.image.data;
  for (let i = 0; i < a.length; i += 4) {
    a[i] = Math.random() * 2 - 1; a[i + 1] = Math.random() * 2 - 1; a[i + 2] = Math.random() * 2 - 1; a[i + 3] = Math.random();
    const t = (i / 4) / (size * size) * Math.PI * 2; b[i] = Math.cos(t); b[i + 1] = Math.sin(t * 3) * .5; b[i + 2] = Math.sin(t); b[i + 3] = 1;
  }
  const posVar = gpu.addVariable('tPos', `
    uniform float uTime; uniform float uMorph; uniform sampler2D tTarget;
    ${NOISE}
    void main(){ vec2 uv=gl_FragCoord.xy/resolution.xy; vec4 p=texture2D(tPos,uv); vec3 t=texture2D(tTarget,uv).xyz;
      vec3 v=curl(p.xyz*0.8+uTime*0.1)*0.01; vec3 np=p.xyz+v; np=mix(np,t,uMorph*0.05);
      gl_FragColor=vec4(np,p.w); }`, pos0);
  gpu.setVariableDependencies(posVar, [posVar]);
  posVar.material.uniforms.uTime = { value: 0 };
  posVar.material.uniforms.uMorph = { value: 0.5 };
  const tt = new THREE.DataTexture(b, size, size, THREE.RGBAFormat, THREE.FloatType); tt.needsUpdate = true;
  posVar.material.uniforms.tTarget = { value: tt };
  const err = gpu.init(); if (err) return { err };
  const n = size * size; const ref = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) { ref[i * 2] = (i % size + .5) / size; ref[i * 2 + 1] = (Math.floor(i / size) + .5) / size; }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  geo.setAttribute('ref', new THREE.BufferAttribute(ref, 2));
  const mat = new THREE.ShaderMaterial({
    uniforms: { tPos: { value: null } }, transparent: true, depthWrite: false,
    vertexShader: `uniform sampler2D tPos; attribute vec2 ref; varying float vA;
      void main(){ vec4 p=texture2D(tPos,ref); vA=p.w; vec4 mv=modelViewMatrix*vec4(p.xyz,1.); gl_Position=projectionMatrix*mv; gl_PointSize=2.0*(3.0/-mv.z);} `,
    fragmentShader: `varying float vA; void main(){ vec2 c=gl_PointCoord-.5; if(dot(c,c)>.25) discard; gl_FragColor=vec4(0.15,0.2,0.35,0.6*vA);} `
  });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0xf3efe6); scene.add(pts);
  const cam = new THREE.PerspectiveCamera(45, W / H, .1, 50); cam.position.z = 3.5;
  const simOnly = time((i) => { posVar.material.uniforms.uTime.value = i / 60; gpu.compute(); });
  const full = time((i) => { posVar.material.uniforms.uTime.value = i / 60; gpu.compute(); mat.uniforms.tPos.value = gpu.getCurrentRenderTarget(posVar).texture; renderer.render(scene, cam); });
  gpu.dispose(); geo.dispose(); mat.dispose(); tt.dispose();
  return { particles: n, simMs: simOnly, simPlusDrawMs: full };
}

function benchFluid(simW, simH, iters) {
  const opt = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping };
  const dbl = (w, h, o = {}) => { let a = new THREE.WebGLRenderTarget(w, h, { ...opt, ...o }), b = new THREE.WebGLRenderTarget(w, h, { ...opt, ...o }); return { get read() { return a; }, get write() { return b; }, swap() { [a, b] = [b, a]; }, dispose() { a.dispose(); b.dispose(); } }; };
  const vel = dbl(simW, simH), prs = dbl(simW, simH, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter }), dye = dbl(simW * 2, simH * 2);
  const div = new THREE.WebGLRenderTarget(simW, simH, { ...opt, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  const VS = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }`;
  const mk = (fs, uniforms) => new FullScreenQuad(new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: fs, uniforms, depthTest: false, depthWrite: false }));
  const texel = new THREE.Vector2(1 / simW, 1 / simH);
  const adv = mk(`varying vec2 vUv; uniform sampler2D uVel,uSrc; uniform vec2 texel; uniform float dt,diss; void main(){ vec2 c=vUv-dt*texture2D(uVel,vUv).xy*texel; gl_FragColor=diss*texture2D(uSrc,c);} `, { uVel: { value: null }, uSrc: { value: null }, texel: { value: texel }, dt: { value: 1 }, diss: { value: .995 } });
  const splat = mk(`varying vec2 vUv; uniform sampler2D uSrc; uniform vec2 pt; uniform vec3 col; uniform float r,aspect; void main(){ vec2 d=vUv-pt; d.x*=aspect; gl_FragColor=texture2D(uSrc,vUv)+vec4(col*exp(-dot(d,d)/r),0.);} `, { uSrc: { value: null }, pt: { value: new THREE.Vector2() }, col: { value: new THREE.Vector3() }, r: { value: .0008 }, aspect: { value: simW / simH } });
  const divg = mk(`varying vec2 vUv; uniform sampler2D uVel; uniform vec2 texel; void main(){ float L=texture2D(uVel,vUv-vec2(texel.x,0)).x,R=texture2D(uVel,vUv+vec2(texel.x,0)).x,B=texture2D(uVel,vUv-vec2(0,texel.y)).y,T=texture2D(uVel,vUv+vec2(0,texel.y)).y; gl_FragColor=vec4(.5*(R-L+T-B),0,0,1);} `, { uVel: { value: null }, texel: { value: texel } });
  const jac = mk(`varying vec2 vUv; uniform sampler2D uP,uDiv; uniform vec2 texel; void main(){ float L=texture2D(uP,vUv-vec2(texel.x,0)).x,R=texture2D(uP,vUv+vec2(texel.x,0)).x,B=texture2D(uP,vUv-vec2(0,texel.y)).x,T=texture2D(uP,vUv+vec2(0,texel.y)).x; float d=texture2D(uDiv,vUv).x; gl_FragColor=vec4((L+R+B+T-d)*.25,0,0,1);} `, { uP: { value: null }, uDiv: { value: null }, texel: { value: texel } });
  const grad = mk(`varying vec2 vUv; uniform sampler2D uP,uVel; uniform vec2 texel; void main(){ float L=texture2D(uP,vUv-vec2(texel.x,0)).x,R=texture2D(uP,vUv+vec2(texel.x,0)).x,B=texture2D(uP,vUv-vec2(0,texel.y)).x,T=texture2D(uP,vUv+vec2(0,texel.y)).x; vec2 v=texture2D(uVel,vUv).xy-.5*vec2(R-L,T-B); gl_FragColor=vec4(v,0,1);} `, { uP: { value: null }, uVel: { value: null }, texel: { value: texel } });
  const show = mk(`varying vec2 vUv; uniform sampler2D uDye; void main(){ vec3 paper=vec3(.95,.93,.88); float ink=clamp(length(texture2D(uDye,vUv).rgb),0.,1.); gl_FragColor=vec4(mix(paper,vec3(.12,.16,.27),ink),1.);} `, { uDye: { value: null } });
  const pass = (q, target) => { renderer.setRenderTarget(target); q.render(renderer); };
  const step = (i) => {
    splat.material.uniforms.pt.value.set(.5 + .3 * Math.sin(i * .1), .5 + .3 * Math.cos(i * .13));
    splat.material.uniforms.uSrc.value = vel.read.texture; splat.material.uniforms.col.value.set(5 * Math.cos(i * .1), 5 * Math.sin(i * .1), 0); pass(splat, vel.write); vel.swap();
    splat.material.uniforms.uSrc.value = dye.read.texture; splat.material.uniforms.col.value.set(.8, .8, .8); pass(splat, dye.write); dye.swap();
    adv.material.uniforms.uVel.value = vel.read.texture; adv.material.uniforms.uSrc.value = vel.read.texture; pass(adv, vel.write); vel.swap();
    divg.material.uniforms.uVel.value = vel.read.texture; pass(divg, div);
    jac.material.uniforms.uDiv.value = div.texture;
    for (let k = 0; k < iters; k++) { jac.material.uniforms.uP.value = prs.read.texture; pass(jac, prs.write); prs.swap(); }
    grad.material.uniforms.uP.value = prs.read.texture; grad.material.uniforms.uVel.value = vel.read.texture; pass(grad, vel.write); vel.swap();
    adv.material.uniforms.uVel.value = vel.read.texture; adv.material.uniforms.uSrc.value = dye.read.texture; pass(adv, dye.write); dye.swap();
  };
  const simMs = time(step);
  const fullMs = time((i) => { step(i); show.material.uniforms.uDye.value = dye.read.texture; pass(show, null); });
  [vel, prs, dye].forEach(d => d.dispose()); div.dispose();
  return { grid: `${simW}x${simH}`, jacobi: iters, passesPerStep: 6 + iters, simMs, simPlusDisplayMs: fullMs };
}

function benchInstanced(count, kind = 'lambert', scaleW = .15) {
  const geo = new THREE.BoxGeometry(1, .08, .08);
  const mat = kind === 'basic' ? new THREE.MeshBasicMaterial({ color: 0xb08a5a }) : kind === 'normal' ? new THREE.MeshNormalMaterial() : new THREE.MeshLambertMaterial({ color: 0xb08a5a });
  const im = new THREE.InstancedMesh(geo, mat, count);
  const m = new THREE.Matrix4(); const q = new THREE.Quaternion(); const s = new THREE.Vector3(1, 1, 1); const p = new THREE.Vector3();
  const side = Math.ceil(Math.sqrt(count));
  for (let i = 0; i < count; i++) { p.set((i % side) / side * 8 - 4, Math.floor(i / side) / side * 4.5 - 2.25, 0); q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), (i % 3) * Math.PI / 3); im.setMatrixAt(i, m.compose(p, q, s.set(scaleW, 1, 1))); }
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0xf3efe6); scene.add(im, new THREE.HemisphereLight(0xffffff, 0x886644, 2), new THREE.DirectionalLight(0xffffff, 2));
  const cam = new THREE.PerspectiveCamera(45, W / H, .1, 50); cam.position.z = 6;
  const ms = time((i) => { im.rotation.y = i * .01; renderer.render(scene, cam); });
  const calls = renderer.info.render.calls, tris = renderer.info.render.triangles;
  geo.dispose(); mat.dispose(); im.dispose();
  return { instances: count, kind, scaleW, ms, calls, tris };
}

function benchMultiView(nViews) {
  // nViews scissored viewports, each with its own scene/camera, one canvas
  renderer.setScissorTest(true); renderer.setClearColor(0xf3efe6, 1);
  const views = [];
  for (let k = 0; k < nViews; k++) {
    const scene = new THREE.Scene(); const cam = new THREE.PerspectiveCamera(40, 1, .1, 20); cam.position.z = 4;
    const mesh = new THREE.Mesh(new THREE.TorusKnotGeometry(.8, .25, 160, 24), new THREE.MeshNormalMaterial()); scene.add(mesh);
    views.push({ scene, cam, mesh, rect: { x: (k % 2) * W / 2, y: Math.floor(k / 2) * H / Math.ceil(nViews / 2), w: W / 2, h: H / Math.ceil(nViews / 2) } });
  }
  const ms = time((i) => {
    renderer.setScissorTest(false); renderer.clear(); renderer.setScissorTest(true);
    for (const v of views) { const r = v.rect; renderer.setViewport(r.x, r.y, r.w, r.h); renderer.setScissor(r.x, r.y, r.w, r.h); v.cam.aspect = r.w / r.h; v.cam.updateProjectionMatrix(); v.mesh.rotation.y = i * .02; renderer.render(v.scene, v.cam); }
  });
  renderer.setScissorTest(false); renderer.setViewport(0, 0, W, H);
  views.forEach(v => { v.mesh.geometry.dispose(); v.mesh.material.dispose(); });
  return { views: nViews, ms };
}

function benchRaymarch(scale) {
  const q = new FullScreenQuad(new THREE.ShaderMaterial({
    uniforms: { t: { value: 0 }, res: { value: new THREE.Vector2(W * scale, H * scale) } }, depthTest: false,
    vertexShader: `varying vec2 vUv; void main(){vUv=uv; gl_Position=vec4(position.xy,0.,1.);}`,
    fragmentShader: `varying vec2 vUv; uniform float t; uniform vec2 res;
      float sd(vec3 p){ vec3 q=mod(p+1.,2.)-1.; float s=length(q)-.35; float b=length(max(abs(q)-vec3(.25),0.))-.05; return mix(s,b,.5+.5*sin(t)); }
      void main(){ vec2 uv=(vUv-.5)*vec2(res.x/res.y,1.); vec3 ro=vec3(0,0,t), rd=normalize(vec3(uv,1.)); float d=0.; int i;
        for(i=0;i<64;i++){ float h=sd(ro+rd*d); if(h<.001||d>20.) break; d+=h; }
        vec3 p=ro+rd*d; vec2 e=vec2(.001,0); vec3 n=normalize(vec3(sd(p+e.xyy)-sd(p-e.xyy),sd(p+e.yxy)-sd(p-e.yxy),sd(p+e.yyx)-sd(p-e.yyx)));
        gl_FragColor=vec4(mix(vec3(.95,.93,.88), vec3(.5+.5*n), exp(-.1*d)),1.); }`
  }));
  const rt = new THREE.WebGLRenderTarget(W * scale, H * scale);
  const ms = time((i) => { q.material.uniforms.t.value = i / 30; renderer.setRenderTarget(rt); q.render(renderer); renderer.setRenderTarget(null); }, 10, 2);
  rt.dispose(); q.dispose();
  return { scale, px: `${W * scale}x${H * scale}`, steps: 64, ms };
}

async function benchCompile() {
  const mats = []; const scene = new THREE.Scene();
  for (let i = 0; i < 6; i++) { const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, clearcoat: 1, sheen: 1, iridescence: i % 2, transmission: 0 }); m.defines = { V: i }; mats.push(m); scene.add(new THREE.Mesh(new THREE.SphereGeometry(), m)); }
  scene.add(new THREE.DirectionalLight());
  const cam = new THREE.PerspectiveCamera();
  const t0 = performance.now(); await renderer.compileAsync(scene, cam); const tA = performance.now() - t0;
  const t1 = performance.now(); renderer.render(scene, cam); sync(); const tR = performance.now() - t1;
  return { programs: renderer.info.programs.length, compileAsyncMs: +tA.toFixed(1), firstRenderAfterMs: +tR.toFixed(1) };
}

// Deterministic scene for capture tests
const capScene = new THREE.Scene(); capScene.background = new THREE.Color(0xf3efe6);
const capCam = new THREE.PerspectiveCamera(40, W / H, .1, 50); capCam.position.set(0, 0, 6);
const capMesh = new THREE.Mesh(new THREE.TorusKnotGeometry(1, .3, 220, 32), new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: .9, roughness: .3 }));
capScene.add(capMesh, new THREE.HemisphereLight(0xffffff, 0x9a8466, 2.5), new THREE.DirectionalLight(0xffffff, 3));
window.renderFrame = (i, fps = 30) => { const t = i / fps; capMesh.rotation.set(t * .4, t * .7, 0); renderer.setRenderTarget(null); renderer.setViewport(0, 0, W, H); renderer.render(capScene, capCam); };
window.grabJPEG = (i, q = 0.92) => { window.renderFrame(i); return canvas.toDataURL('image/jpeg', q); };
window.grabWEBP = (i, q = 0.95) => { window.renderFrame(i); return canvas.toDataURL('image/webp', q); };
window.grabPNG = (i) => { window.renderFrame(i); return canvas.toDataURL('image/png'); };
const rgba = new Uint8Array(W * H * 4);
window.grabRAW = (i) => { window.renderFrame(i); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, rgba); let s = ''; const CH = 0x8000; for (let k = 0; k < rgba.length; k += CH) s += String.fromCharCode.apply(null, rgba.subarray(k, k + CH)); return btoa(s); };

window.runBench = async (which) => {
  const out = { info: info() };
  if (which.includes('compile')) out.compile = await benchCompile();
  if (which.includes('gpgpu')) out.gpgpu = [64, 128, 256].map(benchGPGPU);
  if (which.includes('fluid')) out.fluid = [[64, 36, 10], [128, 72, 20], [256, 144, 30]].map(a => benchFluid(...a));
  if (which.includes('inst')) out.instanced = [[2000,'lambert',.15],[2000,'basic',.15],[2000,'normal',.15],[2000,'lambert',.02],[20000,'lambert',.02],[20000,'basic',.02]].map(a=>benchInstanced(...a));
  if (which.includes('multi')) out.multiview = [1, 4].map(benchMultiView);
  if (which.includes('ray')) out.raymarch = [0.25, 0.5, 1].map(benchRaymarch);
  out.memory = renderer.info.memory;
  return out;
};
window.ready = true;

import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
function benchInstVariants(count) {
  const res = {};
  const base = new THREE.BoxGeometry(1, .08, .08);
  const side = Math.ceil(Math.sqrt(count));
  const mats = []; const m = new THREE.Matrix4(); const q = new THREE.Quaternion(); const s = new THREE.Vector3(.02, 1, 1); const p = new THREE.Vector3(); const z = new THREE.Vector3(0, 0, 1);
  for (let i = 0; i < count; i++) { p.set((i % side) / side * 8 - 4, Math.floor(i / side) / side * 4.5 - 2.25, 0); q.setFromAxisAngle(z, (i % 3) * Math.PI / 3); mats.push(m.clone().compose(p, q, s)); }
  const cam = new THREE.PerspectiveCamera(45, W / H, .1, 50); cam.position.z = 6;
  const mk = (obj) => { const sc = new THREE.Scene(); sc.background = new THREE.Color(0xf3efe6); sc.add(obj); return sc; };
  const mat = new THREE.MeshBasicMaterial({ color: 0xb08a5a });
  // merged
  const merged = mergeGeometries(mats.map(mm => base.clone().applyMatrix4(mm)));
  let sc = mk(new THREE.Mesh(merged, mat));
  res.merged = time(() => renderer.render(sc, cam));
  // gl_InstanceID + DataTexture (no divisor attributes)
  const tw = 1024, th = Math.ceil(count * 4 / tw);
  const data = new Float32Array(tw * th * 4); mats.forEach((mm, i) => data.set(mm.elements, i * 16));
  const dt = new THREE.DataTexture(data, tw, th, THREE.RGBAFormat, THREE.FloatType); dt.needsUpdate = true;
  const ig = new THREE.InstancedBufferGeometry(); ig.index = base.index; ig.setAttribute('position', base.attributes.position); ig.instanceCount = count;
  const sm = new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, uniforms: { tM: { value: dt } },
    vertexShader: `uniform highp sampler2D tM; mat4 fetchM(int id){ int b=id*4; ivec2 s=textureSize(tM,0); return mat4(texelFetch(tM,ivec2((b)%s.x,(b)/s.x),0),texelFetch(tM,ivec2((b+1)%s.x,(b+1)/s.x),0),texelFetch(tM,ivec2((b+2)%s.x,(b+2)/s.x),0),texelFetch(tM,ivec2((b+3)%s.x,(b+3)/s.x),0)); }
      void main(){ gl_Position=projectionMatrix*modelViewMatrix*fetchM(gl_InstanceID)*vec4(position,1.); }`,
    fragmentShader: `out vec4 o; void main(){ o=vec4(.69,.54,.35,1.); }` });
  const imesh = new THREE.Mesh(ig, sm); imesh.frustumCulled = false; sc = mk(imesh);
  res.instanceIdTexture = time(() => renderer.render(sc, cam));
  // InstancedMesh baseline
  const im = new THREE.InstancedMesh(base, mat, count); mats.forEach((mm, i) => im.setMatrixAt(i, mm)); sc = mk(im);
  res.instancedMesh = time(() => renderer.render(sc, cam));
  // BatchedMesh
  const bm = new THREE.BatchedMesh(count, 24 * 1, 36 * 1, mat); const gid = bm.addGeometry(base);
  mats.forEach(mm => { const iid = bm.addInstance(gid); bm.setMatrixAt(iid, mm); }); sc = mk(bm);
  res.batchedMesh = time(() => renderer.render(sc, cam)); res.batchedCalls = renderer.info.render.calls;
  return { count, ...res };
}
window.runInst = () => [500, 2000, 8000].map(benchInstVariants);
