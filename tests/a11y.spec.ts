import { test, expect, type Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/* Automated accessibility gate — axe-core over each page, plus the
   lightbox in its open state (dialog content only exists then). Axe
   can't compute contrast against the gradient sky (those checks come
   back "incomplete", not violations); the sky script's pickInk system
   guarantees contrast there by construction.

   Axe doesn't check target size or reduced-motion/focus-trap behavior,
   so those get their own assertions below rather than relying on axe
   to catch a regression in them. */

// Visible elements can be smaller than WCAG AAA's 44px target; the real
// hit area is expanded with an invisible ::after at a negative inset
// (see DESIGN.md's "icon buttons & touch targets" rule). This measures
// the element's own box plus whatever its ::after adds on each side.
async function hitAreaSize(locator: Locator) {
  return locator.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    const after = getComputedStyle(el, '::after');
    const px = (v: string) => (v === 'auto' ? 0 : parseFloat(v));
    const left = -px(after.left);
    const right = -px(after.right);
    const top = -px(after.top);
    const bottom = -px(after.bottom);
    return { width: rect.width + left + right, height: rect.height + top + bottom };
  });
}

test('homepage has no axe violations', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('about page has no axe violations', async ({ page }) => {
  await page.goto('/about');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('open lightbox has no axe violations', async ({ page }) => {
  await page.goto('/about');
  await page.locator('[data-lightbox-trigger]').first().click();
  await expect(page.locator('#lightbox')).toHaveAttribute('open', '');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('contact page has no axe violations', async ({ page }) => {
  await page.goto('/contact');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('contact form blocks empty submits and reports errors politely', async ({ page }) => {
  await page.goto('/contact');
  // Empty submit: inline validation stops it before any request — the
  // field-level messages appear, focus lands on the first invalid
  // field, and the status line stays empty.
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.locator('#contact-email-error')).toBeVisible();
  await expect(page.locator('#contact-message-error')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Email', exact: true })).toBeFocused();
  await expect(page.locator('#contact-status')).toHaveText('');
  // Filled submit against a dev server with no /api route: the error
  // state must surface in the aria-live line and keep the typed values.
  // Name stays empty on purpose — it's optional; email + message carry
  // the submission.
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill('test@example.com');
  await page.getByRole('textbox', { name: 'Message', exact: true }).fill('hello');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.locator('#contact-status')).toHaveText(/Something went wrong/);
  await expect(page.getByRole('textbox', { name: 'Message', exact: true })).toHaveValue('hello');
});

test('404 page has no axe violations', async ({ page }) => {
  await page.goto('/404');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('small visible controls still meet the 44px touch target minimum', async ({ page }) => {
  await page.goto('/');
  for (const link of ['about', 'contact']) {
    const size = await hitAreaSize(page.getByRole('link', { name: link }));
    expect(size.width, `${link} link width`).toBeGreaterThanOrEqual(44);
    expect(size.height, `${link} link height`).toBeGreaterThanOrEqual(44);
  }
  for (const label of ['Play a 24-hour sky time-lapse', /Sky theme:/]) {
    const size = await hitAreaSize(page.getByRole('button', { name: label }));
    expect(size.width).toBeGreaterThanOrEqual(44);
    expect(size.height).toBeGreaterThanOrEqual(44);
  }

  await page.goto('/about');
  await page.locator('[data-lightbox-trigger]').first().click();
  await expect(page.locator('#lightbox')).toHaveAttribute('open', '');
  for (const label of ['Close', 'Previous photo', 'Next photo']) {
    const size = await hitAreaSize(page.getByRole('button', { name: label }));
    expect(size.width, `${label} button width`).toBeGreaterThanOrEqual(44);
    expect(size.height, `${label} button height`).toBeGreaterThanOrEqual(44);
  }
});

test('lightbox never hands focus to the page behind it', async ({ page }) => {
  await page.goto('/about');
  await page.locator('[data-lightbox-trigger]').first().click();
  await expect(page.locator('#lightbox')).toHaveAttribute('open', '');

  // showModal() traps Tab among the dialog's own controls. The one
  // exception: because the trigger deliberately parks initial focus on
  // the non-tabbable polaroid card (see lightbox.ts, to avoid painting a
  // focus ring on Close from the arrow-key handler), the very first Tab
  // press transiently lands on <body> before re-entering the dialog —
  // harmless (body has no action), so the real guarantee under test is
  // narrower: focus must never reach an interactive element in `main`,
  // the content sitting behind the modal.
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press('Tab');
    const escapedToPageContent = await page.evaluate(
      () => document.querySelector('main')?.contains(document.activeElement) ?? false,
    );
    expect(escapedToPageContent).toBe(false);
  }
});

test.describe('prefers-reduced-motion', () => {
  // The `reducedMotion` context/test.use() option doesn't reliably flip
  // matchMedia in this Playwright/Chromium combination — page.emulateMedia()
  // does, so it's applied per-test instead.

  test('star twinkle animation is disabled', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    // Stars are only opaque at night (sky.ts fades #stars to 0 by day) —
    // pin the sky to a moonless winter night via the dev-console helper
    // (see README) so the star field is actually visible to assert on.
    // sky.ts attaches __skyAt during its own async start-up, so wait for
    // it rather than assuming it exists the instant goto() resolves. The
    // explicit "Z" matters — an unzoned ISO string parses as the local
    // time of whatever machine runs the test, not San Francisco's, which
    // can land on a different, non-nighttime sun altitude. And #stars'
    // opacity is a real CSS transition (2s), so wait for it to actually
    // land rather than asserting the instant after the call returns.
    await page.waitForFunction(
      () => typeof (window as unknown as { __skyAt?: unknown }).__skyAt === 'function',
    );
    await page.evaluate(() =>
      (window as unknown as { __skyAt: (iso: string) => void }).__skyAt('2026-01-01T09:00:00Z'),
    );
    await expect
      .poll(() =>
        page.evaluate(() =>
          parseFloat(getComputedStyle(document.getElementById('stars')!).opacity),
        ),
      )
      .toBeGreaterThan(0.5);
    const star = page.locator('.star').first();
    await expect(star).toBeVisible();
    const animationName = await star.evaluate((el) => getComputedStyle(el).animationName);
    expect(animationName).toBe('none');
  });
});
