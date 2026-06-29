import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration for Chore-Ganizer
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Test directory
  testDir: './e2e',

  // Run tests in parallel
  fullyParallel: true,

  // Fail build on CI if you accidentally left test.only in source code
  forbidOnly: !!process.env.CI,

  // Retry failed tests on CI
  retries: process.env.CI ? 2 : 0,

  // Limit parallel workers on CI
  workers: process.env.CI ? 1 : undefined,

  // Test reporter
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],

  // Global test settings
  use: {
    // Base URL for tests
    baseURL: 'http://localhost:5173',

    // Collect trace on retry
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',

    // Default timeout for each action
    actionTimeout: 10000,
  },

  // Test timeout
  timeout: 30000,

  // Expect timeout
  expect: {
    timeout: 5000,
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Start servers automatically
  webServer: [
    {
      command: 'cd backend && npm run dev',
      url: 'http://localhost:3010/api/health',
      reuseExistingServer: true,
      timeout: 30000,
    },
    {
      command: 'cd frontend && npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 30000,
    },
  ],
});
