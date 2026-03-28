import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3003',
    actionTimeout: 15000,
    trace: 'off',
    screenshot: 'only-on-failure',
  },
  timeout: 60000,
  projects: [{ name: 'firefox', use: { ...devices['Desktop Firefox'] } }],
});
