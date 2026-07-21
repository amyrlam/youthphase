/* Captures public/og.png — a 1200x630 dusk-sky render of the homepage —
   for the og:image / twitter:image link-preview tags in Layout.astro.
   Requires the dev server to be running on :4321.

   Usage: node scripts/generate-og.mjs */
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.goto('http://localhost:4321/', { waitUntil: 'networkidle' });

// Pin the sky to a photogenic dusk regardless of when this runs, and
// strip the interactive chrome — a preview card isn't clickable. The
// astro dev toolbar also renders in dev mode; drop it too.
await page.evaluate(() => {
  window.__skyAt('2026-07-20T20:40');
  for (const id of ['sky-controls', 'sky-status']) document.getElementById(id)?.remove();
  document.querySelector('astro-dev-toolbar')?.remove();
  document.querySelector('nav[aria-label="Site pages"]')?.remove();
});
// Let the 2s glow/star transitions and the 1.6s color fade settle.
await page.waitForTimeout(2500);

await page.screenshot({ path: 'public/og.png' });
await browser.close();
console.log('wrote public/og.png');
