const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  testMatch: 'yongcha-local.test.js',
  timeout: 90000,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  projects: [
    {
      name: 'chromium-local',
      use: {
        ...devices['Pixel 5'],
        executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',
        headless: true,
        permissions: ['notifications', 'geolocation'],
        ignoreHTTPSErrors: true,
        screenshot: 'only-on-failure',
        video: 'off',
        // No proxy bypass needed — all requests go through proxy except localhost
        proxy: {
          server: process.env.HTTPS_PROXY || 'http://127.0.0.1:36973',
          bypass: 'localhost,127.0.0.1,*.googleapis.com,*.google.com,*.gstatic.com,*.firebase.com,*.firebaseapp.com,*.firebasestorage.app,*.firebaseio.com',
        },
        // Intercept Firebase requests to inject yongcha.app origin
        extraHTTPHeaders: {
          'Origin': 'https://yongcha.app',
          'Referer': 'https://yongcha.app/',
        },
        launchOptions: {
          args: [
            '--ignore-certificate-errors',
            '--ignore-ssl-errors',
            '--allow-insecure-localhost',
            '--disable-web-security',
          ],
        },
      },
    },
  ],
});
