import { chromium } from '/tmp/claude-1000/-home-star-Documents-Portf/e62e8949-2791-405e-a4be-159327fe6fc9/scratchpad/fftest/node_modules/playwright/index.mjs';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto('file://' + new URL('./index.html', import.meta.url).pathname);
await page.waitForFunction('window.ready === true');
const r = await page.evaluate(async () => {
  const gl = document.querySelector('canvas').getContext('webgl2'); const px = new Uint8Array(4);
  let t = performance.now(); for (let i = 0; i < 20; i++) { window.renderFrame(i); gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,px); } const render = (performance.now() - t) / 20;
  t = performance.now(); for (let i = 0; i < 20; i++) { window.renderFrame(i); document.querySelector('canvas').toDataURL('image/png'); } const renderPng = (performance.now() - t) / 20;
  t = performance.now(); for (let i = 0; i < 20; i++) { window.renderFrame(i); await new Promise(r => document.querySelector('canvas').toBlob(b => b.arrayBuffer().then(r), 'image/png')); } const renderBlob = (performance.now() - t) / 20;
  let gpu = null; if (navigator.gpu) { const a = await navigator.gpu.requestAdapter(); gpu = a ? (a.info ? a.info.vendor + '/' + a.info.architecture + '/' + a.info.description : 'adapter') : 'no-adapter'; }
  let vp9 = null, avc = null;
  if (window.VideoEncoder) { vp9 = (await VideoEncoder.isConfigSupported({ codec: 'vp09.00.10.08', width: 1280, height: 720, bitrate: 8e6 })).supported; avc = (await VideoEncoder.isConfigSupported({ codec: 'avc1.640028', width: 1280, height: 720, bitrate: 8e6 })).supported; }
  return { renderOnlyMs: +render.toFixed(1), renderPlusPngDataURLMs: +renderPng.toFixed(1), renderPlusPngBlobMs: +renderBlob.toFixed(1), webgpuAdapter: gpu, webcodecsVP9: vp9, webcodecsAVC: avc };
});
// batched transfer: 8 frames per evaluate
const t0 = Date.now(); let n = 0;
for (let b = 0; b < 8; b++) { const arr = await page.evaluate((b) => { const o = []; for (let k = 0; k < 8; k++) o.push(window.grabPNG(b * 8 + k)); return o; }, b); n += arr.length; }
r.batched8PngFps = +(n / ((Date.now() - t0) / 1000)).toFixed(2);
console.log(JSON.stringify(r));
await browser.close();
