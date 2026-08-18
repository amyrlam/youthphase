/* Regression contract for the sky ↔ browser-chrome sync (issue #60).

   Real iOS Safari paints its toolbar and status bar outside the web
   view, where no Playwright assertion can reach — so these tests pin
   every signal the page emits INTO that chrome instead: the
   theme-color metas, the inline body background-color Safari samples,
   and the history-free same-document navigation that forces Safari to
   re-apply a theme-color after load (it otherwise applies it exactly
   once per navigation). They run in real WebKit with iPhone emulation,
   which is as close to the phone as CI can get.

   The other half — what Safari's chrome actually renders — is covered
   by scripts/check-sky-chrome.mjs, which drives the real iOS Simulator
   and pixel-samples the screenshots. Run it on a Mac with Xcode when
   touching any of these mechanisms. */
import { test, expect, type Page } from '@playwright/test';

const NIGHT_CHROME = 'rgb(29, 42, 97)';

function readChrome(page: Page) {
  return page.evaluate(() => ({
    metas: [...document.querySelectorAll('meta[name="theme-color"]')].map((m) => ({
      media: m.getAttribute('media'),
      content: m.getAttribute('content'),
    })),
    bodyInlineBg: document.body.style.backgroundColor,
    hash: location.hash,
    historyLength: history.length,
  }));
}

test('?sky=night pins the mode for the load', async ({ page }) => {
  await page.goto('/?sky=night');
  await expect(page.locator('#sky-mode')).toHaveText('sky: ☾ night');
  const chrome = await readChrome(page);
  for (const meta of chrome.metas) expect(meta.content).toBe(NIGHT_CHROME);
});

test('a mode switch rewrites both media-gated metas and the body background', async ({ page }) => {
  await page.goto('/?sky=day');
  const day = await readChrome(page);
  expect(day.metas.map((m) => m.media).sort()).toEqual([
    '(prefers-color-scheme: dark)',
    '(prefers-color-scheme: light)',
  ]);
  for (const meta of day.metas) expect(meta.content).toMatch(/^rgb\(/);

  // day -> night (MODES cycles auto -> day -> night)
  await page.locator('#sky-mode').click();
  await expect(page.locator('#sky-mode')).toHaveText('sky: ☾ night');

  const night = await readChrome(page);
  // Both metas carry the new chrome color, media attributes intact —
  // iOS Safari reads only the meta matching the device's color scheme,
  // so a stale one means a stale toolbar in that scheme.
  expect(night.metas.map((m) => m.media).sort()).toEqual([
    '(prefers-color-scheme: dark)',
    '(prefers-color-scheme: light)',
  ]);
  for (const meta of night.metas) expect(meta.content).toBe(NIGHT_CHROME);
  expect(night.metas[0].content).not.toBe(day.metas[0].content);

  // The inline body background is Safari's status-bar sample source; a
  // var()-only change never triggers its re-sample, so render() must
  // write it as a real inline style.
  expect(night.bodyInlineBg).toBe('rgb(29, 42, 97)');
});

test('a mode switch nudges Safari with a history-free #sky- navigation', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'webkit', 'the nudge is gated to Apple touch devices');
  await page.goto('/?sky=day');
  const before = await readChrome(page);

  await page.locator('#sky-mode').click();
  await expect(page.locator('#sky-mode')).toHaveText('sky: ☾ night');

  // The nudge is a same-document navigation — the only thing that makes
  // iOS Safari re-apply theme-color after its once-per-navigation read.
  // It is deferred past the meta swap, and must use location.replace so
  // the Back button never wades through sky states.
  await expect.poll(async () => (await readChrome(page)).hash).toMatch(/^#sky-[0-9a-f]{6}$/);
  expect((await readChrome(page)).historyLength).toBe(before.historyLength);
});

test('the nudge never clobbers a fragment the site did not create', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'webkit', 'the nudge is gated to Apple touch devices');
  await page.goto('/?sky=day#reader-anchor');

  await page.locator('#sky-mode').click();
  await expect(page.locator('#sky-mode')).toHaveText('sky: ☾ night');

  // Give the deferred nudge time to (not) fire, then confirm the
  // visitor's fragment survived while the metas still updated.
  await page.waitForTimeout(500);
  const chrome = await readChrome(page);
  expect(chrome.hash).toBe('#reader-anchor');
  for (const meta of chrome.metas) expect(meta.content).toBe(NIGHT_CHROME);
});
