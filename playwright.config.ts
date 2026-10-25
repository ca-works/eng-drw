import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  timeout: 30000,
  fullyParallel: true,
  use: {
    baseURL: process.env.TEST_URL || 'http://127.0.0.1:4321/eng-drw/',
    trace: 'retain-on-failure',
  },
  webServer: process.env.TEST_URL
    ? undefined
    : {
        command: 'npm run preview -- --port 4321',
        url: 'http://127.0.0.1:4321/eng-drw/',
        reuseExistingServer: true,
      },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(process.env.PW_CHROME ? { channel: 'chrome' } : {}),
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        ...(process.env.PW_FIREFOX_PATH
          ? { launchOptions: { executablePath: process.env.PW_FIREFOX_PATH } }
          : {}),
      },
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        ...(process.env.PW_WEBKIT_PATH
          ? { launchOptions: { executablePath: process.env.PW_WEBKIT_PATH } }
          : {}),
      },
    },
    {
      name: 'mobile',
      use: {
        ...devices['iPhone 13'],
        defaultBrowserType: 'chromium',
        ...(process.env.PW_CHROME ? { channel: 'chrome' } : {}),
      },
    },
  ],
});
