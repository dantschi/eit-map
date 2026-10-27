#!/usr/bin/env node
/**
 * Rendert das Social-Media-Vorschaubild assets/og-image.png (1200 × 630)
 * aus der echten Karte. Benötigt Playwright mit Chromium:
 *
 *   npx playwright install chromium   (einmalig, falls nicht vorhanden)
 *   node tools/render-og-image.cjs
 */
const { chromium } = require('playwright');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROOT = path.join(__dirname, '..');
const url = (rel) => pathToFileURL(path.join(ROOT, rel)).href;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1300 }, colorScheme: 'dark', deviceScaleFactor: 2 });

  // 1) Karte im Endzustand abfotografieren
  await page.goto(url('index.html'));
  await page.addStyleTag({
    content: '.topbar,.layer-sparks,body::before,body::after{display:none} html,body{background:transparent!important}',
  });
  await page.locator('#eit-map').scrollIntoViewIfNeeded();
  await page.waitForTimeout(3500);
  const map = (await page.locator('#eit-map').screenshot({ omitBackground: true })).toString('base64');

  // 2) Mit Titel zum Vorschaubild zusammensetzen
  const og = await browser.newPage({ viewport: { width: 1200, height: 630 }, colorScheme: 'dark' });
  await og.goto(url('index.html')); // gleiche Herkunft, damit die lokalen Stylesheets laden dürfen
  await og.setContent(`<!doctype html>
    <html data-theme="dark"><head>
      <link rel="stylesheet" href="${url('css/fonts.css')}">
      <link rel="stylesheet" href="${url('css/style.css')}">
      <style>
        body { width: 1200px; height: 630px; overflow: hidden; display: grid; grid-template-columns: 500px 1fr; align-items: center; }
        .og-text { padding-left: 64px; }
        .og-text .hero__title { align-items: flex-start; font-size: 76px; margin: 22px 0 18px; }
        .og-text .hero__kicker { letter-spacing: .4em; }
        .og-text p { margin: 0; font-size: 21px; font-weight: 600; }
        .og-text small { display: block; margin-top: 10px; color: var(--muted); font-size: 17px; }
        .og-map { width: 680px; height: auto; margin-left: -10px; }
      </style>
    </head><body>
      <div class="og-text">
        <span class="eyebrow"><span class="eyebrow__dot"></span>DHBW Stuttgart</span>
        <h1 class="hero__title">
          <span class="hero__kicker">Map of</span>
          <span class="neon" data-branch="mikro">Electrical</span>
          <span class="neon" data-branch="ki">Engineering</span>
        </h1>
        <p>Elektro- und Informationstechnik</p>
        <small>Duales Studium · Bachelor of Engineering</small>
      </div>
      <img class="og-map" src="data:image/png;base64,${map}" alt="">
    </body></html>`);
  await og.waitForTimeout(400);
  await og.screenshot({ path: path.join(ROOT, 'assets', 'og-image.png') });
  await browser.close();
  console.log('✔ assets/og-image.png geschrieben');
})();
