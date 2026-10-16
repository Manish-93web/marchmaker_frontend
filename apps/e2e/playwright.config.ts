import { defineConfig, devices } from '@playwright/test';

const API_CWD = '../../../marchmaker_backend/apps/api';

/**
 * Starts a throwaway API (in-memory database, mock providers) and the web and admin dev servers.
 * Nothing here touches real data. See docs/E2E.md in the backend repo.
 */
export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://localhost:5173', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'pnpm exec tsx src/scripts/e2eServer.ts',
      cwd: API_CWD,
      url: 'http://localhost:4000/__e2e/ready',
      reuseExistingServer: false,
      timeout: 120_000,
    },
    { command: 'pnpm --filter @marchmaker/web dev', cwd: '../..', url: 'http://localhost:5173', reuseExistingServer: !process.env.CI, timeout: 120_000 },
    { command: 'pnpm --filter @marchmaker/admin dev', cwd: '../..', url: 'http://localhost:5174', reuseExistingServer: !process.env.CI, timeout: 120_000 },
  ],
});
