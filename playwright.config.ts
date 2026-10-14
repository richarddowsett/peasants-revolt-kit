import { defineConfig, devices } from '@playwright/test';

const targetBaseURL = process.env.PLAYWRIGHT_BASE_URL || process.env.QA_URL || 'http://localhost:3000';
const isLiveEnvironment = !!(process.env.PLAYWRIGHT_BASE_URL || process.env.QA_URL || process.env.NO_EMULATOR);

export default defineConfig({
  testDir: './e2e',
  testIgnore: ['**/qa-smoke.spec.ts'],
  timeout: 60 * 1000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: targetBaseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  webServer: isLiveEnvironment
    ? undefined
    : [
        {
          command: 'npm run emulator',
          url: 'http://127.0.0.1:8085',
          reuseExistingServer: !process.env.CI,
          timeout: 120 * 1000,
        },
        {
          command: 'npm run backend:dev',
          url: 'http://127.0.0.1:8080/api/products',
          reuseExistingServer: !process.env.CI,
          timeout: 120 * 1000,
        },
        {
          command: 'npm run frontend:dev',
          url: 'http://localhost:3000',
          reuseExistingServer: !process.env.CI,
          timeout: 120 * 1000,
        },
      ],
});
