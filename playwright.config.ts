import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  webServer: {
    command: 'pnpm dev',
    port: 4321,
    // Locally an astro dev server is usually already running (astro allows
    // only one per project); reuse it rather than failing to start a second.
    reuseExistingServer: true,
  },
  use: {
    baseURL: 'http://localhost:4321',
  },
  // Chromatic's Playwright integration requires an explicit Chrome project
  // to snapshot against — https://www.chromatic.com/docs/playwright/.
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
