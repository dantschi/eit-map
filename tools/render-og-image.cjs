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

  // 1) Karte im Endzustand abfotografieren (hell, ohne Kopfzeile)
  const page = await browser.newPage({ viewport: { width: 1700, height: 1500 }, colorScheme: 'light', deviceScaleFactor: 2 });
  await page.goto(url('index.html'));
  await page.addStyleTag({ content: '.topbar{display:none}' });
  await page.locator('#eit-map').scrollIntoViewIfNeeded();
  await page.waitForTimeout(3000);
  const map = (await page.locator('#eit-map').screenshot({ omitBackground: true })).toString('base64');

  // 2) Mit Titel zum Vorschaubild zusammensetzen
  const og = await browser.newPage({ viewport: { width: 1200, height: 630 }, colorScheme: 'light' });
  await og.goto(url('index.html')); // gleiche Herkunft, damit die lokalen Stylesheets laden dürfen
  await og.setContent(`<!doctype html>
    <html lang="de" data-theme="light"><head>
      <link rel="stylesheet" href="${url('css/fonts.css')}">
      <link rel="stylesheet" href="${url('css/style.css')}">
      <style>
        body { width: 1200px; height: 630px; overflow: hidden; display: grid; grid-template-columns: 470px 1fr; align-items: center; }
        .og-text { padding-left: 60px; }
        .og-text .hero__title { align-items: flex-start; font-size: 72px; margin: 18px 0 6px; }
        .og-text .hero__kicker { margin-left: 4px; }
        .og-text .hero__stroke { width: 380px; margin: 0; }
        .og-text p { margin: 14px 0 0; font-size: 20px; font-weight: 600; }
        .og-text small { display: block; margin-top: 8px; color: var(--muted); font-size: 16px; }
        .og-map { width: 700px; height: auto; margin-left: -6px; filter: drop-shadow(0 12px 24px rgba(27, 31, 58, .18)); }
      </style>
    </head><body>
      <div class="og-text">
        <span class="eyebrow">DHBW Stuttgart</span>
        <h1 class="hero__title"><span class="hero__kicker">Map of</span><span>Electrical</span><span>Engineering</span></h1>
        ${await page.locator('.hero__stroke').evaluate((el) => el.outerHTML)}
        <p>Elektro- und Informationstechnik</p>
        <small>Berufsbilder und Studieninhalte auf einen Blick</small>
      </div>
      <img class="og-map" src="data:image/png;base64,${map}" alt="">
    </body></html>`);
  await og.waitForTimeout(500);
  await og.screenshot({ path: path.join(ROOT, 'assets', 'og-image.png') });
  await browser.close();
  console.log('✔ assets/og-image.png geschrieben');
})();
