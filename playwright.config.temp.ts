import { defineConfig, devices } from '@playwright/test';

/**
 * Temporary config without webServer for analysis
 */
export default defineConfig({
  testDir: './frontend-e2e/src',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 10000,
  reporter: [
    ['list'],
    ['html']
  ],
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    }
  ],
  // webServer disabled for analysis
});