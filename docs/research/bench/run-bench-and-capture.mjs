import { chromium } from '/tmp/claude-1000/-home-star-Documents-Portf/e62e8949-2791-405e-a4be-159327fe6fc9/scratchpad/fftest/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const FF = '/tmp/claude-1000/-home-star-Documents-Portf/e62e8949-2791-405e-a4be-159327fe6fc9/scratchpad/fftest/node_modules/ffmpeg-static/ffmpeg';
const mode = process.argv[2] || 'bench';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.error('[page]', m.text()); });
await page.goto('file://' + new URL('./index.html', import.meta.url).pathname);
await page.waitForFunction('window.ready === true');
if (mode === 'bench') {
  const r = process.argv[3]==='instv' ? await page.evaluate(()=>window.runInst()) : await page.evaluate((w) => window.runBench(w), process.argv[3] || 'compile,gpgpu,fluid,inst,multi,ray');
  console.log(JSON.stringify(r, null, 1));
} else if (mode === 'capture') {
  const N = +process.argv[4] || 60; const fmt = process.argv[3] || 'jpeg';
  const out = new URL(`./cap_${fmt}.mp4`, import.meta.url).pathname;
  const inArgs = fmt === 'raw' ? ['-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', '1280x720', '-r', '30', '-i', '-', '-vf', 'vflip'] : ['-f', 'image2pipe', '-framerate', '30', '-i', '-'];
  const ff = spawn(FF, ['-y', '-loglevel', 'error', ...inArgs, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const fn = { jpeg: 'grabJPEG', webp: 'grabWEBP', png: 'grabPNG', raw: 'grabRAW' }[fmt];
  const t0 = Date.now(); let bytes = 0; let tEval = 0;
  for (let i = 0; i < N; i++) {
    const a = Date.now();
    const s = await page.evaluate(([f, i]) => window[f](i), [fn, i]);
    tEval += Date.now() - a;
    const buf = fmt === 'raw' ? Buffer.from(s, 'base64') : Buffer.from(s.slice(s.indexOf(',') + 1), 'base64');
    bytes += buf.length;
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
  const dt = (Date.now() - t0) / 1000;
  console.log(JSON.stringify({ fmt, frames: N, seconds: dt, fps: +(N / dt).toFixed(2), msPerFrameEval: +(tEval / N).toFixed(1), avgFrameKB: Math.round(bytes / N / 1024), out }));
} else if (mode === 'webgpu') {
  const r = await page.evaluate(async () => { if (!navigator.gpu) return { gpu: false }; const a = await navigator.gpu.requestAdapter(); return { gpu: true, adapter: !!a, info: a ? (a.info ? { vendor: a.info.vendor, arch: a.info.architecture, desc: a.info.description } : 'noinfo') : null }; });
  console.log(JSON.stringify(r));
}
await browser.close();
