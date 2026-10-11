import puppeteer from 'puppeteer-core';
import fs from 'fs';
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.split('=')));
const W = 1920, H = 1080;
const url = `http://127.0.0.1:${args.port || 5191}/?render=1`;
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new',
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', `--window-size=${W},${H}`, '--hide-scrollbars', '--force-device-scale-factor=1'],
  defaultViewport: { width: W, height: H, deviceScaleFactor: 1 }, protocolTimeout: 600000 });
const page = await browser.newPage();
page.on('console', (m) => { const t = m.text(); if (!/GPU stall|WebGL|swiftshader/i.test(t)) console.log('[page]', t); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(url, { waitUntil: 'networkidle0', timeout: 120000 });
await page.waitForFunction('window.ready !== undefined', { timeout: 120000 });
await page.evaluate(() => window.ready);
const shot = async (file) => fs.writeFileSync(file, await page.screenshot({ type: file.endsWith('.png') ? 'png' : 'jpeg', ...(file.endsWith('.png') ? {} : { quality: 95 }) }));
if (args.stills) {
  const ts = args.stills.split(',').map(Number);
  for (let i = 0; i < ts.length; i++) { const f = Math.round(ts[i] * 30); await page.evaluate((f) => window.renderAt(f), f); await shot(`${args.out}_${ts[i]}.png`); }
} else if (args.cues) {
  await page.evaluate(() => window.renderAt(53 * 30));
  fs.writeFileSync(args.cues, JSON.stringify(await page.evaluate(() => window.getCues()), null, 1));
} else {
  const f0 = +(args.from || 0), f1 = +(args.to || 1740); const dir = args.dir || 'frames'; fs.mkdirSync(dir, { recursive: true });
  const T0 = Date.now();
  for (let f = f0; f < f1; f++) { const file = `${dir}/f${String(f).padStart(5, '0')}.jpg`; if (fs.existsSync(file) && !args.force) continue;
    await page.evaluate((f) => window.renderAt(f), f); await shot(file);
    if (f % 30 === 0) console.log('frame', f, ((Date.now() - T0) / (f - f0 + 1)).toFixed(0), 'ms/f'); }
}
await browser.close();
