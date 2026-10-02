#!/usr/bin/env node
/**
 * MailMind 홍보 슬라이드 녹화 (Playwright)
 * assets/promo/mailmind-promo.html → output/mailmind-raw.webm
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '../..');
const HTML = path.join(ROOT, 'assets/promo/mailmind-promo.html');
const OUT  = path.join(ROOT, 'output/mailmind-raw.webm');

(async () => {
  if (!fs.existsSync(HTML)) {
    console.error('[mailmind] promo.html 없음:', HTML);
    process.exit(1);
  }

  const executablePath = process.env.CHROMIUM_PATH ||
    (fs.existsSync('/opt/pw-browsers') &&
      require('child_process').execSync(
        'ls /opt/pw-browsers/chromium-*/chrome-linux/chrome 2>/dev/null | head -1',
        { encoding: 'utf8' }
      ).trim()) || undefined;

  const browser = await chromium.launch({
    executablePath,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  const ctx = await browser.newContext({
    viewport: { width: 1080, height: 1920 },
    recordVideo: { dir: path.join(ROOT, 'output'), size: { width: 1080, height: 1920 } },
  });

  const page = await ctx.newPage();
  await page.goto(`file://${HTML}`);
  console.log('[mailmind] 슬라이드 녹화 시작 (30초)...');

  // 6 slides × 5초 = 30초
  await page.waitForTimeout(62000);

  await ctx.close();
  await browser.close();

  // playwright이 생성한 webm 파일을 mailmind-raw.webm으로 이동
  const files = fs.readdirSync(path.join(ROOT, 'output'))
    .filter(f => f.endsWith('.webm') && !f.includes('mailmind'));
  if (files.length > 0) {
    const latest = files.sort().pop();
    fs.renameSync(path.join(ROOT, 'output', latest), OUT);
    console.log('[mailmind] 녹화 완료:', OUT);
  } else {
    console.error('[mailmind] webm 파일 생성 실패');
    process.exit(1);
  }
})();
