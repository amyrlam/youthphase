import { test as base, expect } from '@chromatic-com/playwright';
import type { Page } from '@playwright/test';

/* The sky renders from real "now" (see sky.ts's render()), so two
   Chromatic builds captured at different times of day paint different
   gradients/sun/star positions on otherwise-identical pages — every
   screenshot shows as changed even when nothing meaningfully moved.
   Pinning every test's sky to the same fixed moment (via sky.ts's
   __skyAt dev hook) keeps Chromatic snapshots comparable build to
   build. Daytime, no moon/star drama, so pages render as their normal
   default state. */
const PINNED_SKY_AT = '2026-06-15T18:00:00Z';

export const test = base.extend<{ page: Page }>({
  page: async ({ page }, use) => {
    const originalGoto = page.goto.bind(page);
    page.goto = (async (url, options) => {
      const response = await originalGoto(url, options);
      await page.waitForFunction(
        () => typeof (window as unknown as { __skyAt?: unknown }).__skyAt === 'function',
      );
      await page.evaluate(
        (iso) => (window as unknown as { __skyAt: (iso: string) => void }).__skyAt(iso),
        PINNED_SKY_AT,
      );
      return response;
    }) as typeof page.goto;
    await use(page);
  },
});

export { expect };
