// ─── Playwright Config: Production E2E ──────────────────────────────
// Runs against the live Netlify deployment (no local webServer).
// Usage: npx playwright test --config playwright.prod.config.mjs

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: 'e2e-prod-*.spec.mjs',
  timeout: 45_000,
  retries: 1,
  use: {
    baseURL: 'https://peacefullai.netlify.app',
    screenshot: 'on',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  reporter: [
    ['html', { open: 'never', outputFolder: 'test-results/prod-report' }],
    ['list'],
  ],
  outputDir: 'test-results/prod-screenshots',
});
