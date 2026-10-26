// Renders every playbook effect into one canvas via scissored views + one post pass. Collects shader errors.
import * as THREE from 'three';
import { GPUComputationRenderer } from 'three/addons/misc/GPUComputationRenderer.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import * as S from './threejs-techniques.shaders.js';

const errors = [];
const W = 1280, H = 720, COLS = 4, ROWS = 2;
const canvas = document.createElement('canvas'); document.body.appendChild(canvas);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.debug.onShaderError = (gl, program, vs, fs) => {
  errors.push((gl.getShaderInfoLog(vs) || '') + (gl.getShaderInfoLog(fs) || '') + (gl.getProgramInfoLog(program) || ''));
};
const paper = new THREE.Color('#f2ede3');
const uTime = { value: 0 };                       // one shared uniform object -> every material sees the same clock
const fsqMat = (frag, uniforms) => new THREE.ShaderMaterial({ vertexShader: S.FSQ_VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false });
const views = [];
function addView(name, setup) { views.push({ name, ...setup() }); }

// 1. closed-form marbling
addView('marbling', () => {
  const PW = 1024, PH = 1024;
  const rtA = new THREE.WebGLRenderTarget(PW, PH, { type: THREE.HalfFloatType, depthBuffer: false });
  const rtB = rtA.clone();
  let read = rtA, write = rtB;
  const op = new FullScreenQuad(fsqMat(S.MARBLE_OP_FRAG, {
    tPrev: { value: null }, uOp: { value: 0 }, uAspect: { value: 1 }, uC: { value: new THREE.Vector2() }, uR: { value: 0.1 }, uInk: { value: new THREE.Vector4() },
    uA: { value: new THREE.Vector2() }, uM: { value: new THREE.Vector2(1, 0) }, uAlpha: { value: 0.1 }, uLambda: { value: 0.02 }, uSpacing: { value: 0 } }));
  const apply = (set) => { Object.entries(set).forEach(([k, v]) => { const u = op.material.uniforms[k]; if (u.value && u.value.set && Array.isArray(v)) u.value.set(...v); else u.value = v; });
    op.material.uniforms.tPrev.value = read.texture; renderer.setRenderTarget(write); op.render(renderer); [read, write] = [write, read]; };
  renderer.setRenderTarget(read); renderer.setClearColor(0x000000, 0); renderer.clear();
  const inks = [[0.10, 0.12, 0.16, 1], [0.16, 0.25, 0.45, 1], [0.0, 0.0, 0.0, 0.0], [0.62, 0.20, 0.14, 1]];
  for (let i = 0; i < 18; i++) apply({ uOp: 0, uC: [0.5 + 0.03 * Math.sin(i), 0.5 + 0.03 * Math.cos(i * 1.7)], uR: 0.05 + 0.012 * (i % 3), uInk: inks[i % 4] });
  apply({ uOp: 1, uA: [0.0, 0.5], uM: [0, 1], uAlpha: 0.12, uLambda: 0.03, uSpacing: 0.18 });
  apply({ uOp: 1, uA: [0.5, 0.0], uM: [1, 0], uAlpha: 0.06, uLambda: 0.02, uSpacing: 0 });
  const scene = new THREE.Scene(); const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const show = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.);} `, fragmentShader: S.MARBLE_SHOW_FRAG,
    uniforms: { tPattern: { value: read.texture }, tPaper: { value: null }, uPaper: { value: paper } } }));
  scene.add(show); return { scene, cam };
});

// 2. stable fluid (dye on paper)
addView('fluid', () => {
  const sw = 128, sh = 72, o = { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
  const dbl = (w, h) => { let a = new THREE.WebGLRenderTarget(w, h, o), b = new THREE.WebGLRenderTarget(w, h, o); return { get r() { return a; }, get w() { return b; }, swap() { [a, b] = [b, a]; } }; };
  const vel = dbl(sw, sh), prs = dbl(sw, sh), dye = dbl(sw * 4, sh * 4);
  const div = new THREE.WebGLRenderTarget(sw, sh, o), curl = new THREE.WebGLRenderTarget(sw, sh, o);
  const texel = new THREE.Vector2(1 / sw, 1 / sh);
  const q = Object.fromEntries(Object.entries(S.FLUID).map(([k, f]) => [k, new FullScreenQuad(fsqMat(f, {
    uVel: { value: null }, uSrc: { value: null }, uP: { value: null }, uDiv: { value: null }, uCurl: { value: null }, uTexel: { value: texel }, uDt: { value: 1 }, uDiss: { value: 0.995 },
    uPoint: { value: new THREE.Vector2() }, uValue: { value: new THREE.Vector3() }, uRadius: { value: 0.002 }, uAspect: { value: sw / sh }, uEps: { value: 0.3 }, uK: { value: 0.8 } }))]));
  const run = (k, target, u) => { const U = q[k].material.uniforms; for (const [a, b] of Object.entries(u)) U[a].value = b; renderer.setRenderTarget(target); q[k].render(renderer); };
  const step = (i) => {
    const pt = new THREE.Vector2(0.5 + 0.3 * Math.sin(i * 0.11), 0.5 + 0.25 * Math.cos(i * 0.07));
    run('splat', vel.w, { uSrc: vel.r.texture, uPoint: pt, uValue: new THREE.Vector3(6 * Math.cos(i * 0.2), 6 * Math.sin(i * 0.2), 0) }); vel.swap();
    run('splat', dye.w, { uSrc: dye.r.texture, uPoint: pt, uValue: new THREE.Vector3(0.6, 0.6, 0.6) }); dye.swap();
    run('curl', curl, { uVel: vel.r.texture });
    run('vorticity', vel.w, { uVel: vel.r.texture, uCurl: curl.texture, uDt: 1 }); vel.swap();
    run('divergence', div, { uVel: vel.r.texture });
    run('scale', prs.w, { uSrc: prs.r.texture, uK: 0.8 }); prs.swap();               // warm start: keep 80% of last pressure
    for (let k = 0; k < 20; k++) { run('jacobi', prs.w, { uP: prs.r.texture, uDiv: div.texture }); prs.swap(); }
    run('gradient', vel.w, { uP: prs.r.texture, uVel: vel.r.texture }); vel.swap();
    run('advect', vel.w, { uVel: vel.r.texture, uSrc: vel.r.texture, uDiss: 0.99 }); vel.swap();
    run('advect', dye.w, { uVel: vel.r.texture, uSrc: dye.r.texture, uDiss: 0.998 }); dye.swap();
  };
  for (let i = 0; i < 60; i++) step(i);
  const scene = new THREE.Scene(); const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.);} `,
    fragmentShader: `uniform sampler2D tDye; uniform vec3 uPaper; varying vec2 vUv; void main(){ float k=clamp(length(texture2D(tDye,vUv).rgb),0.,1.); gl_FragColor=vec4(mix(uPaper, vec3(0.13,0.17,0.3), k),1.);
      #include <colorspace_fragment>
    }`, uniforms: { tDye: { value: dye.r.texture }, uPaper: { value: paper } } })));
  return { scene, cam, update: step };
});

// 3. GPGPU particles morphing to a kanji sampled from canvas
addView('gpgpu-kanji', () => {
  const N = 128, gpu = new GPUComputationRenderer(N, N, renderer);
  const tgtCanvas = document.createElement('canvas'); tgtCanvas.width = tgtCanvas.height = 256;
  const g2 = tgtCanvas.getContext('2d'); g2.fillStyle = '#000'; g2.fillRect(0, 0, 256, 256); g2.fillStyle = '#fff';
  g2.font = '900 220px "Noto Serif CJK JP", serif'; g2.textAlign = 'center'; g2.textBaseline = 'middle'; g2.fillText('匠', 128, 136);
  const img = g2.getImageData(0, 0, 256, 256).data; const inside = [];
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) if (img[(y * 256 + x) * 4] > 128) inside.push([x, y]);
  const shapes = 2; const tdata = new Float32Array(N * N * shapes * 4);
  for (let i = 0; i < N * N; i++) { const [x, y] = inside[(Math.random() * inside.length) | 0];
    tdata.set([(x + Math.random()) / 128 - 1, 1 - (y + Math.random()) / 128, (Math.random() - 0.5) * 0.12, 1], i * 4);
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()); tdata.set([Math.cos(a) * r, Math.sin(a) * r, 0, 1], (N * N + i) * 4); }
  const tTargets = new THREE.DataTexture(tdata, N, N * shapes, THREE.RGBAFormat, THREE.FloatType); tTargets.needsUpdate = true;
  const p0 = gpu.createTexture(), v0 = gpu.createTexture();
  for (let i = 0; i < p0.image.data.length; i += 4) { p0.image.data.set([(Math.random() - .5) * 3, (Math.random() - .5) * 2, (Math.random() - .5), Math.random()], i); }
  const vel = gpu.addVariable('tVel', S.GPGPU_VEL, v0), pos = gpu.addVariable('tPos', S.GPGPU_POS, p0);
  gpu.setVariableDependencies(vel, [pos, vel]); gpu.setVariableDependencies(pos, [pos, vel]);
  Object.assign(vel.material.uniforms, { uTime, uDt: { value: 1 / 60 }, uMorph: { value: 0 }, uCurlAmp: { value: 0.6 }, uSpring: { value: 9 }, uDamp: { value: 0.92 },
    uShapeA: { value: 1 }, uShapeB: { value: 0 }, uBlend: { value: 1 }, tTargets: { value: tTargets }, uShapes: { value: shapes }, uPointer: { value: new THREE.Vector3(9, 9, 9) }, uPointerR: { value: 0.2 } });
  pos.material.uniforms.uDt = { value: 1 / 60 };
  const err = gpu.init(); if (err) errors.push('gpgpu: ' + err);
  const ref = new Float32Array(N * N * 2); for (let i = 0; i < N * N; i++) ref.set([(i % N + 0.5) / N, (Math.floor(i / N) + 0.5) / N], i * 2);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * N * 3), 3)); geo.setAttribute('aRef', new THREE.BufferAttribute(ref, 2));
  const mat = new THREE.ShaderMaterial({ vertexShader: S.PARTICLE_VERT, fragmentShader: S.PARTICLE_FRAG, transparent: true, depthWrite: false,
    uniforms: { tPos: { value: null }, uSize: { value: 9 }, uDpr: { value: 1 }, uInk: { value: new THREE.Color('#1d2b4a') } } });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false;
  const scene = new THREE.Scene(); scene.background = paper.clone(); scene.add(pts);
  const cam = new THREE.PerspectiveCamera(40, 1, 0.1, 20); cam.position.z = 3.4;
  const update = (i) => { vel.material.uniforms.uMorph.value = Math.min(1, i / 90); gpu.compute(); mat.uniforms.tPos.value = gpu.getCurrentRenderTarget(pos).texture; };
  return { scene, cam, update };
});

// 4. raked sand
addView('sand', () => {
  const trail = new THREE.WebGLRenderTarget(512, 512, { depthBuffer: false });
  renderer.setRenderTarget(trail); renderer.setClearColor(0, 0); renderer.clear();
  // one curved rake stroke as a triangle strip in clip space
  const segs = 64, pos = [], lat = [], idx = [];
  for (let i = 0; i <= segs; i++) { const t = i / segs, x = -0.8 + 1.6 * t, y = -0.55 + 0.35 * Math.sin(t * 3.0), nx = -0.35 * 3 * Math.cos(t * 3) / 1.6, l = Math.hypot(nx, 1);
    for (const s of [0, 1]) { const o = (s - 0.5) * 0.22; pos.push(x - nx / l * o * 0, y + o / l, 0); lat.push(s); } if (i < segs) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); sg.setAttribute('aLateral', new THREE.Float32BufferAttribute(lat, 1)); sg.setIndex(idx);
  const stroke = new THREE.Mesh(sg, new THREE.ShaderMaterial({ vertexShader: S.RAKE_STROKE_VERT, fragmentShader: S.RAKE_STROKE_FRAG, transparent: true, depthTest: false, side: THREE.DoubleSide }));
  const sc = new THREE.Scene(); sc.add(stroke); renderer.render(sc, new THREE.Camera());
  const scene = new THREE.Scene(); const cam = new THREE.PerspectiveCamera(35, 1, 0.1, 50); cam.position.set(0, 7, 4.5); cam.lookAt(0, 0, 0);
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.ShaderMaterial({ vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);} `,
    fragmentShader: S.SAND_FRAG, uniforms: { tTrail: { value: trail.texture }, uStones: { value: [new THREE.Vector3(-1.2, -0.6, 0.45), new THREE.Vector3(1.4, 0.9, 0.3), new THREE.Vector3(0.6, -1.6, 0.22)] },
      uSize: { value: new THREE.Vector2(8, 8) }, uSunDir: { value: new THREE.Vector3(-0.8, 0.35, 0.45).normalize() }, uSandLit: { value: new THREE.Color('#efe9dc') }, uSandShade: { value: new THREE.Color('#b9b0a0') },
      uSpacing: { value: 0.12 }, uTines: { value: 5 } } }));
  plane.rotation.x = -Math.PI / 2; scene.add(plane);
  const stoneMat = new THREE.MeshStandardMaterial({ color: '#7d7a73', roughness: 0.9 });
  [[-1.2, 0.6, 0.45], [1.4, -0.9, 0.3], [0.6, 1.6, 0.22]].forEach(([x, z, r]) => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), stoneMat); m.position.set(x, r * 0.5, z); m.scale.y = 0.7; scene.add(m); });
  scene.add(new THREE.HemisphereLight('#ffffff', '#a89f8e', 1.5), (() => { const l = new THREE.DirectionalLight('#fff4e0', 2.5); l.position.set(-8, 3.5, 4.5); return l; })());
  return { scene, cam };
});

const artTexture = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };

// 5. handscroll
addView('emakimono', () => {
  const art = artTexture(2048, 256, (g, w, h) => { g.fillStyle = '#f4efe2'; g.fillRect(0, 0, w, h); g.strokeStyle = '#2b3a55'; g.lineWidth = 3;
    for (let x = 0; x < w; x += 22) { g.beginPath(); g.moveTo(x, h * 0.75); g.bezierCurveTo(x + 8, h * 0.5, x - 6, h * 0.35, x + 4, h * 0.2 + 30 * Math.sin(x * 0.01)); g.stroke(); }
    g.fillStyle = '#9b2d20'; g.font = '700 64px "Noto Serif CJK JP"'; g.fillText('二〇一八 — 二〇二六', 60, 90); });
  const scene = new THREE.Scene(); scene.background = paper.clone(); const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50); cam.position.set(0, 1.2, 5.5); cam.lookAt(0, 0, 0);
  const mat = new THREE.ShaderMaterial({ vertexShader: S.SCROLL_VERT, fragmentShader: S.SCROLL_FRAG, side: THREE.DoubleSide,
    uniforms: { uLeft: { value: -1.1 }, uRight: { value: 1.1 }, uRadius: { value: 0.11 }, uThick: { value: 0.012 }, tArt: { value: art }, uBack: { value: new THREE.Color('#e9e2d0') }, uLightDir: { value: new THREE.Vector3(0.3, 0.6, 1) } } });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(9, 1, 900, 1), mat); mesh.rotation.x = -0.25; scene.add(mesh);
  const update = (i) => { const o = Math.sin(i * 0.02) * 0.5; mat.uniforms.uLeft.value = -1.1 + o; mat.uniforms.uRight.value = 1.1 + o; };
  return { scene, cam, update };
});

// 6. byobu + gold leaf
addView('byobu', () => {
  const art = artTexture(1536, 512, (g, w, h) => { g.clearRect(0, 0, w, h); for (let i = 0; i < 70; i++) { const x = (i * 97) % w, y = h * 0.55 + (i * 37) % (h * 0.4);
      g.fillStyle = 'rgba(46,77,64,1)'; g.fillRect(x, y, 6, h - y); g.fillStyle = 'rgba(52,62,140,1)'; g.beginPath(); g.ellipse(x + 3, y, 18, 11, (i % 5) * 0.4, 0, Math.PI * 2); g.fill(); } });
  const scene = new THREE.Scene(); scene.background = paper.clone(); const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 50); cam.position.set(0.6, 0.4, 4.6); cam.lookAt(0, 0, 0);
  const mat = new THREE.ShaderMaterial({ vertexShader: S.BYOBU_VERT, fragmentShader: S.GOLD_FRAG, side: THREE.DoubleSide,
    uniforms: { uPanels: { value: 6 }, uPanelW: { value: 0.6 }, uFold: { value: 0.6 }, tArt: { value: art }, uLightPos: { value: new THREE.Vector3(2, 2, 3) }, uLightCol: { value: new THREE.Color(1, 0.95, 0.85).multiplyScalar(2) },
      uLeafPerUnit: { value: 6 }, uAspect: { value: 3.6 / 1.2 } } });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.2, 6, 1), mat); scene.add(mesh);
  const update = (i) => { mat.uniforms.uFold.value = 0.35 + 0.35 * Math.sin(i * 0.03); };
  return { scene, cam, update };
});

// 7. instanced assembly (asanoha-like spokes) + SDF drops
addView('kumiko+sdf', () => {
  const scene = new THREE.Scene(); scene.background = paper.clone(); const cam = new THREE.PerspectiveCamera(40, 1, 0.1, 50); cam.position.set(0, 0, 5);
  const uProgress = { value: 0.75 };
  const geo = new THREE.BoxGeometry(0.5, 0.03, 0.05).translate(0.25, 0, 0);
  const mat = new THREE.MeshStandardMaterial({ color: '#c8a678', roughness: 0.7 }); S.patchAssembly(mat, uProgress);
  const tri = []; const R = 6; for (let gx = -R; gx <= R; gx++) for (let gy = -3; gy <= 3; gy++) for (let k = 0; k < 6; k++) tri.push([gx * 0.5 + (gy % 2) * 0.25, gy * 0.433, k * Math.PI / 3]);
  const im = new THREE.InstancedMesh(geo, mat, tri.length); im.frustumCulled = false;
  const from = new Float32Array(tri.length * 3), spin = new Float32Array(tri.length * 4), delay = new Float32Array(tri.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), z = new THREE.Vector3(0, 0, 1);
  tri.forEach(([x, y, a], i) => { im.setMatrixAt(i, m.compose(new THREE.Vector3(x, y, 0), q.setFromAxisAngle(z, a), new THREE.Vector3(1, 1, 1)));
    from.set([(Math.random() - .5) * 6, (Math.random() - .5) * 4, 2 + Math.random() * 3], i * 3); spin.set([Math.random(), Math.random(), Math.random(), 6 * Math.random()], i * 4); delay[i] = Math.hypot(x, y) / 4 * 0.6; });
  geo.setAttribute('aFrom', new THREE.InstancedBufferAttribute(from, 3)); geo.setAttribute('aSpin', new THREE.InstancedBufferAttribute(spin, 4)); geo.setAttribute('aDelay', new THREE.InstancedBufferAttribute(delay, 1));
  scene.add(im, new THREE.HemisphereLight('#fff', '#a0896a', 1.6), (() => { const l = new THREE.DirectionalLight('#fff', 2); l.position.set(2, 3, 4); return l; })());
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), new THREE.ShaderMaterial({ vertexShader: S.SDF_BOX_VERT, fragmentShader: S.SDF_BOX_FRAG,
    uniforms: { uTime, uSteps: { value: 64 }, uInk: { value: new THREE.Color('#1f2a44') }, uPaper: { value: paper } } }));
  box.position.set(1.4, -0.9, 1); scene.add(box);
  return { scene, cam };
});

// 8. petals
addView('petals', () => {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#e9eef2'); const cam = new THREE.PerspectiveCamera(45, 1, 0.1, 50); cam.position.set(0, 0, 4);
  const petal = new THREE.ShapeGeometry(new THREE.Shape().moveTo(0, -0.5).bezierCurveTo(0.6, -0.2, 0.5, 0.4, 0.08, 0.5).lineTo(0, 0.38).lineTo(-0.08, 0.5).bezierCurveTo(-0.5, 0.4, -0.6, -0.2, 0, -0.5), 4);
  const count = 1200, seeds = new Float32Array(count * 4); for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
  const geo = new THREE.InstancedBufferGeometry().copy(petal); geo.instanceCount = count; geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 4));
  const pos = geo.attributes.position; const uvs = new Float32Array(pos.count * 2); for (let i = 0; i < pos.count; i++) { uvs[i * 2] = pos.getX(i) + 0.5; uvs[i * 2 + 1] = pos.getY(i) + 0.5; } geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  const mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({ vertexShader: S.PETAL_VERT, fragmentShader: S.PETAL_FRAG, side: THREE.DoubleSide,
    uniforms: { uTime, uBox: { value: new THREE.Vector3(5, 4, 3) }, uWind: { value: new THREE.Vector2(0.3, 0.05) }, uColA: { value: new THREE.Color('#f3c9cf') }, uColB: { value: new THREE.Color('#fbeef0') } } }));
  mesh.frustumCulled = false; scene.add(mesh); return { scene, cam };
});

// ---- multi-view render into ONE scene RT (version-proof viewport handling), then one post pass to screen ----
const sceneRT = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, depthBuffer: true });
const post = new FullScreenQuad(fsqMat(S.POST_FRAG, { tScene: { value: sceneRT.texture }, uRes: { value: new THREE.Vector2(W, H) }, uTime, uGrain: { value: 0.06 }, uBleed: { value: 1.5 }, uChroma: { value: 0.15 },
  uVignette: { value: 0.08 }, uNight: { value: 0 }, uAnimGrain: { value: 0 }, uNightTint: { value: new THREE.Color('#c9d3e6') } }));
function frame(i) {
  uTime.value = i / 60;
  views.forEach(v => v.update && v.update(i));
  const cw = W / COLS, ch = H / ROWS;
  sceneRT.scissorTest = false; sceneRT.viewport.set(0, 0, W, H); renderer.setRenderTarget(sceneRT); renderer.setClearColor(paper, 1); renderer.clear();
  views.forEach((v, k) => {
    const x = (k % COLS) * cw, y = H - (Math.floor(k / COLS) + 1) * ch;           // GL origin bottom-left
    sceneRT.viewport.set(x, y, cw, ch); sceneRT.scissor.set(x, y, cw, ch); sceneRT.scissorTest = true;
    renderer.setRenderTarget(sceneRT);                                                // re-bind copies rt.viewport/scissor
    if (v.cam.isPerspectiveCamera) { v.cam.aspect = cw / ch; v.cam.updateProjectionMatrix(); }
    renderer.render(v.scene, v.cam);
  });
  sceneRT.scissorTest = false;
  renderer.setRenderTarget(null); post.render(renderer);
}
window.runVerify = async () => {
  try { for (let i = 0; i < 150; i++) frame(i); } catch (e) { errors.push(String(e.stack || e)); }
  return { errors, programs: renderer.info.programs.length, memory: renderer.info.memory, views: views.map(v => v.name) };
};
window.ready = true;
