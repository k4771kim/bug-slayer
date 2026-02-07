import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3002',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  webServer: {
    command: 'cd ../.. && PATH="/home/claude/.local/share/pnpm:$PATH" pnpm --filter @bug-slayer/web dev',
    url: 'http://localhost:3002',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
