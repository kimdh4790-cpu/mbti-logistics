const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 90000,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Pixel 5'],
        executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',
        headless: true,
        permissions: ['notifications'],
        ignoreHTTPSErrors: true,
        screenshot: 'only-on-failure',
        video: 'off',
        proxy: {
          server: process.env.HTTPS_PROXY || 'http://127.0.0.1:36973',
          bypass: 'localhost,127.0.0.1,yongcha.app,*.googleapis.com,*.google.com,*.gstatic.com,*.firebase.com,*.firebaseapp.com,*.firebasestorage.app',
        },
        launchOptions: {
          args: [
            '--ignore-certificate-errors',
            '--ignore-ssl-errors',
            '--allow-insecure-localhost',
          ],
        },
      },
    },
  ],
});
