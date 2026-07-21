import { test, expect, devices, type Page } from '@playwright/test';

/* Regression tests for the about-page lightbox. Both bugs below shipped
   twice before these tests existed:
   - arrow-key navigation painting a focus ring on the Close button
   - long captions propping the polaroid wider than the photo */

const openLightbox = async (page: Page, index = 0) => {
  await page.goto('/about');
  await page.locator('[data-lightbox-trigger]').nth(index).click();
  await expect(page.locator('#lightbox')).toHaveAttribute('open', '');
};

test('arrow-key navigation never lands focus on the Close button', async ({ page }) => {
  await openLightbox(page);

  // Walk the full carousel (9 items, including the video tile — hiding a
  // focused <video> is what originally handed focus to Close).
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('.lightbox-close')).not.toBeFocused();
  }
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('.lightbox-close')).not.toBeFocused();
});

test('caption wraps to the photo width instead of widening the polaroid', async ({ page }) => {
  // Short viewport: the portrait peony photo shrinks with its 74vh cap,
  // ending up narrower than its caption's unwrapped one-line width.
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/about');

  // Find the trigger by its caption data attribute.
  const trigger = page.locator('[data-lightbox-trigger][data-caption*="bloom"]');
  await trigger.click();

  const img = page.locator('#lightbox-img');
  await expect(img).toBeVisible();
  // Generous timeout: astro dev generates the full-size derivative on
  // first request, which can take a while.
  await expect
    .poll(async () => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0), {
      timeout: 30_000,
    })
    .toBe(true);

  const [imgWidth, polaroidWidth] = await Promise.all([
    img.evaluate((el) => el.getBoundingClientRect().width),
    page.locator('.lightbox-polaroid').evaluate((el) => el.getBoundingClientRect().width),
  ]);

  // Polaroid = photo + 1rem padding each side. Any extra means the caption
  // is propping it open again.
  expect(polaroidWidth).toBeCloseTo(imgWidth + 32, 0);

  // And the caption actually wrapped: taller than a single ~38px line.
  const captionHeight = await page
    .locator('#lightbox-caption')
    .evaluate((el) => el.getBoundingClientRect().height);
  expect(captionHeight).toBeGreaterThan(45);
});

test.describe('touch phone', () => {
  // The dots/arrows swap is gated on (pointer: coarse) and (max-width:
  // 640px) — emulate a real touch phone, not just a narrow window.
  // (Explicit options rather than a devices[] spread: defaultBrowserType
  // can't be used inside a describe group.)
  test.use({
    viewport: devices['iPhone 13'].viewport,
    userAgent: devices['iPhone 13'].userAgent,
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: devices['iPhone 13'].deviceScaleFactor,
  });

  test('shows tappable position dots instead of prev/next buttons', async ({ page }) => {
    await openLightbox(page);

    await expect(page.locator('#lightbox-prev')).toBeHidden();
    await expect(page.locator('#lightbox-next')).toBeHidden();

    const dots = page.locator('.lightbox-dot');
    await expect(dots).toHaveCount(9);
    await expect(dots.nth(0)).toHaveClass(/is-active/);

    await page.keyboard.press('ArrowRight');
    await expect(dots.nth(1)).toHaveClass(/is-active/);
    await expect(dots.nth(0)).not.toHaveClass(/is-active/);

    // Dots are buttons: tapping one jumps straight to that photo.
    await dots.nth(4).click();
    await expect(dots.nth(4)).toHaveClass(/is-active/);
  });
});

test('narrow window with a mouse keeps the arrow buttons', async ({ page }) => {
  // A desktop browser resized narrow has no swipe — arrows must survive.
  await page.setViewportSize({ width: 500, height: 800 });
  await openLightbox(page);

  await expect(page.locator('#lightbox-prev')).toBeVisible();
  await expect(page.locator('#lightbox-next')).toBeVisible();
  await expect(page.locator('#lightbox-dots')).toBeHidden();
});

test('photo changes are announced to assistive tech', async ({ page }) => {
  await openLightbox(page);

  const status = page.locator('#lightbox-status');
  await expect(status).toHaveText(/photo 1 of 9/);

  await page.keyboard.press('ArrowRight');
  await expect(status).toHaveText(/photo 2 of 9 — camouflage/);
});
