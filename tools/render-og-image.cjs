#!/usr/bin/env node
/**
 * Rendert das Social-Media-Vorschaubild assets/og-image.png (1200 × 630)
 * aus der echten Karte. Benötigt Playwright mit Chromium:
 *
 *   npm install --no-save playwright && npx playwright install chromium
 *   node tools/render-og-image.cjs
 */
const { chromium } = require('playwright');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROOT = path.join(__dirname, '..');
const url = (rel) => pathToFileURL(path.join(ROOT, rel)).href;

(async () => {
  const browser = await chromium.launch();
  // 1) Karte im Endzustand abfotografieren (hell, ohne Kopfbereich)
  const page = await browser.newPage({ viewport: { width: 1700, height: 1500 }, colorScheme: 'light', deviceScaleFactor: 2 });
  await page.goto(url('index.html'));
  await page.addStyleTag({ content: '.masthead,.navbar,.to-top{display:none}' });
  await page.locator('#eit-map').scrollIntoViewIfNeeded();
  await page.waitForTimeout(3000);
  const map = (await page.locator('#eit-map').screenshot()).toString('base64');

  // 2) Mit Titel zum Vorschaubild zusammensetzen (Corporate Design: Rot, Grau, Weiß)
  const og = await browser.newPage({ viewport: { width: 1200, height: 630 }, colorScheme: 'light' });
  await og.goto(url('index.html')); // gleiche Herkunft, damit die lokalen Stylesheets laden dürfen
  await og.setContent(`<!doctype html>
    <html lang="de" data-theme="light"><head>
      <link rel="stylesheet" href="${url('css/fonts.css')}">
      <link rel="stylesheet" href="${url('css/style.css')}">
      <style>
        body { width: 1200px; height: 630px; overflow: hidden; display: grid; grid-template-columns: 470px 1fr; align-items: center; background: #fff; border-bottom: 10px solid var(--red); }
        .og-text { padding-left: 56px; }
        .og-text .brand__name { font-size: 26px; }
        .og-text .hero__title { margin: 26px 0 0; font-size: 64px; }
        .og-text p { margin: 18px 0 0; font-size: 21px; font-weight: 600; color: var(--ink-strong); }
        .og-text small { display: block; margin-top: 8px; color: var(--muted); font-size: 17px; }
        .og-map { width: 690px; height: auto; margin-left: -10px; box-shadow: 0 10px 30px rgba(0, 0, 0, .15); }
      </style>
    </head><body>
      <div class="og-text">
        <span class="brand__name">DHBW Stuttgart</span>
        <h1 class="hero__title">Map of Electrical Engineering</h1>
        <p>Elektrotechnik und Informationstechnik</p>
        <small>Berufsbilder und Studieninhalte auf einen Blick</small>
      </div>
      <img class="og-map" src="data:image/png;base64,${map}" alt="">
    </body></html>`);
  await og.waitForTimeout(500);
  await og.screenshot({ path: path.join(ROOT, 'assets', 'og-image.png') });
  await browser.close();
  console.log('✔ assets/og-image.png geschrieben');
})();
