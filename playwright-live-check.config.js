const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  testMatch: ['live-check.test.js'],
  timeout: 60000,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    headless: true,
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
    screenshot: 'on',
    video: 'off',
    trace: 'off',
    // chromium 기본값 — msedge 없으면 실패 방지
  },
  outputDir: 'test-screenshots',
});
