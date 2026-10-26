import { chromium } from '/tmp/claude-1000/-home-star-Documents-Portf/e62e8949-2791-405e-a4be-159327fe6fc9/scratchpad/fftest/node_modules/playwright/index.mjs';
const extra = process.argv[2] === 'unsafe' ? ['--enable-unsafe-webgpu'] : [];
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', ...extra] });
for (const force of [false, true]) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto('file://' + new URL('./index.html', import.meta.url).pathname); await page.waitForFunction('window.ready === true');
  console.log(process.argv[2] || 'default', 'forceWebGL=' + force, JSON.stringify(await page.evaluate((f) => window.go(f), force)));
  await page.close();
}
await browser.close();
