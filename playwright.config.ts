import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  // Week 1 §8c requires all user groups to complete activities without extensive
  // training, and §7 requires desktop and mobile friendliness. Running the suite
  // on both viewports satisfies the responsive requirement once, centrally,
  // rather than cloning a responsive check onto every story.
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile',  use: { ...devices['Pixel 7'] } },
  ],
  reporter: [
    ['list'],
    // The HTML report lists every test by its TC_ id. That report is your
    // traceability evidence for the rubric: requirement -> case -> result.
    // PW_HTML_REPORT/PW_JSON keep evidence runs per environment apart (local vs deployed).
    ['html', { outputFolder: process.env.PW_HTML_REPORT ?? 'playwright-report', open: 'never' }],
    ['json', { outputFile: process.env.PW_JSON ?? 'test-results/results.json' }],
  ],
  outputDir: process.env.PW_OUTPUT_DIR ?? 'test-results',
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
    // PW_SCREENSHOT=on captures every test for the submission evidence; CI keeps failures only.
    screenshot: process.env.PW_SCREENSHOT === 'on' ? 'on' : 'only-on-failure',
  },
  // A BASE_URL (for example the deployed Vercel site) needs no local dev server.
  webServer: process.env.BASE_URL ? undefined : {
    command: 'npm run dev --workspace frontend -- --port 5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: 'http://localhost:5173',
  },
  // Scaffold mode skips database work while every case is still test.fixme().
  // Real seeded runs are gated in tests/seed/global-setup.ts.
  globalSetup: './tests/seed/global-setup.ts',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
});
