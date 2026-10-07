import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/auth-e2e',
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report/auth', open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:5176', trace: 'off', screenshot: 'only-on-failure' },
  // Recovery links and passwords must not enter retained browser traces.
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run dev --workspace frontend -- --port 5176 --strictPort',
    env: { API_PROXY_TARGET: 'http://127.0.0.1:3006' },
    url: 'http://127.0.0.1:5176',
    reuseExistingServer: false,
  },
});
