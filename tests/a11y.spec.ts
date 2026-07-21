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
  // Empty submit: native validation stops it before any request.
  await page.getByRole('button', { name: 'send' }).click();
  await expect(page.locator('#contact-status')).toHaveText('');
  // Filled submit against a dev server with no /api route: the error
  // state must surface in the aria-live line and keep the typed values.
  await page.getByRole('textbox', { name: 'name', exact: true }).fill('test person');
  await page.getByRole('textbox', { name: 'email', exact: true }).fill('test@example.com');
  await page.getByRole('textbox', { name: 'message', exact: true }).fill('hello');
  await page.getByRole('button', { name: 'send' }).click();
  await expect(page.locator('#contact-status')).toHaveText(/something went wrong/);
  await expect(page.getByRole('textbox', { name: 'name', exact: true })).toHaveValue('test person');
});

test('404 page has no axe violations', async ({ page }) => {
  await page.goto('/404');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
