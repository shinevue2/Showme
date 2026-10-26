import * as THREE from 'three/webgpu';
window.go = async (forceWebGL) => {
  const out = {};
  try {
    const canvas = document.createElement('canvas'); document.body.appendChild(canvas);
    const r = new THREE.WebGPURenderer({ canvas, antialias: false, forceWebGL });
    r.setPixelRatio(1); r.setSize(1280, 720, false);
    const t0 = performance.now(); await r.init(); out.initMs = Math.round(performance.now() - t0);
    out.backend = r.backend.isWebGPUBackend ? 'WebGPU' : 'WebGL2';
    const sc = new THREE.Scene(); sc.background = new THREE.Color(0xf3efe6);
    const cam = new THREE.PerspectiveCamera(40, 1280 / 720, .1, 50); cam.position.z = 6;
    const mesh = new THREE.Mesh(new THREE.TorusKnotGeometry(1, .3, 220, 32), new THREE.MeshStandardNodeMaterial({ color: 0xc9a227, metalness: .9, roughness: .3 }));
    sc.add(mesh, new THREE.HemisphereLight(0xffffff, 0x9a8466, 2.5), new THREE.DirectionalLight(0xffffff, 3));
    const t1 = performance.now(); await r.compileAsync(sc, cam); r.render(sc, cam); out.firstFrameMs = Math.round(performance.now() - t1);
    // sync via readRenderTargetPixelsAsync on a tiny RT is awkward; use a fixed loop + await animation frame timing
    const t2 = performance.now(); for (let i = 0; i < 20; i++) { mesh.rotation.y = i * .05; r.render(sc, cam); }
    if (r.backend.isWebGPUBackend) await r.backend.device.queue.onSubmittedWorkDone(); else { const gl = r.getContext(); gl.finish(); }
    out.msPerFrame = +((performance.now() - t2) / 20).toFixed(1);
  } catch (e) { out.err = String(e).slice(0, 200); }
  return out;
};
window.ready = true;
