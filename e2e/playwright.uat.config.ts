import { defineConfig, devices } from '@playwright/test';

// Config for running the UAT checklist against the Docker-deployed app
// (docker compose up --build). The frontend is served on :3002 (nginx proxy
// to the backend on :3010). We do NOT start dev servers (no webServer) — the
// running containers are the system under test.
export default defineConfig({
  testDir: '.',
  fullyParallel: false, // many tests mutate shared seeded data; run sequentially
  forbidOnly: false,
  retries: 0,
  workers: 1,
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL: 'http://localhost:3002',
    trace: 'on',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
  },
  timeout: 60000,
  expect: { timeout: 6000 },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    { name: 'chromium', use: {
      ...devices['Desktop Chrome'],
      launchOptions: { args: ['--disable-gpu', '--disable-software-rasterizer'] },
    }, dependencies: ['setup'] },
  ],
});
