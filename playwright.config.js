const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 90000,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    headless: true,
    viewport: { width: 390, height: 844 },
    baseURL: 'https://yongcha.app',
    permissions: ['notifications'],
    ignoreHTTPSErrors: true,
    video: 'off',
    screenshot: 'only-on-failure',
  },
});
