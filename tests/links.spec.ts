import { test, expect } from '@chromatic-com/playwright';

/* Enforcement: every external link opens in a new tab, with the rel
   that makes target="_blank" safe. Lives in the test suite rather than
   a lint rule — this repo has no ESLint, and the suite is already where
   cross-cutting guarantees (axe, form states) are enforced. */

const PAGES = ['/', '/about', '/contact', '/design-system', '/404'];

for (const path of PAGES) {
  test(`external links on ${path} open in a new tab`, async ({ page }) => {
    await page.goto(path);
    const links = await page.locator('a[href^="http"]').all();
    for (const link of links) {
      // The dev toolbar injects its own links under `astro dev`; they
      // aren't site content and don't ship in the build. Its UI lives in
      // shadow DOM (which Playwright pierces but closest() won't cross),
      // so filter on the root node: site content is always in the
      // document proper.
      if (await link.evaluate((el) => el.getRootNode() !== document)) continue;
      const href = await link.getAttribute('href');
      if (href?.startsWith('https://youthphase.dev')) continue; // own domain: same tab is fine
      const target = await link.getAttribute('target');
      const rel = (await link.getAttribute('rel')) ?? '';
      expect(target, `${href} on ${path} should have target="_blank"`).toBe('_blank');
      expect(rel, `${href} on ${path} should carry rel="noopener"`).toContain('noopener');
    }
  });
}
