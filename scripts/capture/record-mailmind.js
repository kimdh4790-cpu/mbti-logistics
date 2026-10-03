#!/usr/bin/env node
/**
 * MailMind 홍보 슬라이드 녹화 (Playwright)
 * assets/promo/mailmind-promo.html → output/mailmind-raw.webm
 *
 * 환경변수:
 *   MAILMIND_LANG    언어 코드 (EN|KR|JP|ZH|ES|DE|PT|FR|IT|VN|NL|PL|TR|HI), 기본 EN
 *   MAILMIND_VARIANT A 또는 B, 기본 A
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '../..');
const HTML = path.join(ROOT, 'assets/promo/mailmind-promo.html');
const OUT  = path.join(ROOT, 'output/mailmind-raw.webm');

const LANG    = (process.env.MAILMIND_LANG    || 'EN').toUpperCase();
const VARIANT = (process.env.MAILMIND_VARIANT || 'A').toUpperCase();

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
  const url = `file://${HTML}?lang=${LANG}&variant=${VARIANT}`;
  await page.goto(url);
  console.log(`[mailmind] 녹화 시작 LANG=${LANG} VARIANT=${VARIANT}`);

  // 6 slides × 10초 = 60초
  await page.waitForTimeout(62000);

  await ctx.close();
  await browser.close();

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
