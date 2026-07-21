import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  webServer: {
    command: 'npm run dev',
    port: 4321,
    // Locally an astro dev server is usually already running (astro allows
    // only one per project); reuse it rather than failing to start a second.
    reuseExistingServer: true,
  },
  use: {
    baseURL: 'http://localhost:4321',
  },
});
