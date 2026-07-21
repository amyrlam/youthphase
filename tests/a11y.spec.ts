import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/* Automated accessibility gate — axe-core over each page, plus the
   lightbox in its open state (dialog content only exists then). Axe
   can't compute contrast against the gradient sky (those checks come
   back "incomplete", not violations); the sky script's pickInk system
   guarantees contrast there by construction. */

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

test('fun page has no axe violations', async ({ page }) => {
  await page.goto('/fun');
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

test('404 page has no axe violations', async ({ page }) => {
  await page.goto('/404');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
