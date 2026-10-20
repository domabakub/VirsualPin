const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/Asus/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('node:fs');
async function main() {
  const out = 'docs/previews/ranat-v5'; fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  try {
    for (const [route, selector, name] of [
      ['/instruments/ranat', '.rl-art', 'landing'],
      ['/instruments/ranat/play', '.rn-stage', 'play'],
      ['/instruments', '.rn-card-ranat', 'showcase'],
    ]) {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.goto(`http://localhost:3000${route}`, { waitUntil: 'networkidle' });
      const section = page.locator(selector); await section.scrollIntoViewIfNeeded();
      await section.locator('canvas').waitFor(); await page.waitForTimeout(900);
      if (await section.locator('.rn-flat-fallback').count()) throw Error(`${route} fell back to 2D`);
      await section.screenshot({ path: `${out}/${name}-desktop.png` });
      await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(400);
      await section.screenshot({ path: `${out}/${name}-mobile.png` });
      if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw Error(`Overflow at ${route}`);
    }
    if (errors.length) throw Error(errors.join('\n'));
    console.log('PASS: v5 3D on landing, play and showcase; desktop/mobile; no runtime errors or overflow.');
  } finally { await browser.close(); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
