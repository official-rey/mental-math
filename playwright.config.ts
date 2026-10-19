import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  retries: 0,
  // One browser at a time: the drills are timing-sensitive and this machine is easily saturated.
  workers: 1,
  reporter: 'list',
  outputDir: 'test-results',
  use: { baseURL: 'http://localhost:4173/', trace: 'retain-on-failure' },
  projects: [{ name: 'mobile', use: { ...devices['Pixel 7'] } }],
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173/',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
