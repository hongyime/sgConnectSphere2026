import { defineConfig, devices } from '@playwright/test';

// Demo sign-in checks against a deployed site (each writes a session row). BASE_URL is required, so
// this suite never runs against a local stack by accident.
if (!process.env.BASE_URL) throw new Error('Set BASE_URL to the deployed site, for example https://sgconnectsphere.vercel.app');

export default defineConfig({
  testDir: './tests/deployed',
  workers: 1,
  fullyParallel: false,
  timeout: 45_000,
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'] } }],
  reporter: [['list'], ['html', { outputFolder: process.env.PW_HTML_REPORT ?? 'playwright-report/deployed', open: 'never' }],
    ['json', { outputFile: process.env.PW_JSON ?? 'test-results/deployed-results.json' }]],
  outputDir: process.env.PW_OUTPUT_DIR ?? 'test-results',
  use: { baseURL: process.env.BASE_URL, trace: 'off', screenshot: process.env.PW_SCREENSHOT === 'on' ? 'on' : 'only-on-failure' },
});
