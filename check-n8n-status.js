const { chromium } = require('playwright');
const path = require('path');

const USER_DATA_DIR = path.join(__dirname, '.oracle-session');

(async () => {
  console.log('Chrome 실행 중...');
  const browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    args: ['--start-maximized'],
    viewport: null
  });

  const page = await browser.newPage();

  console.log('Oracle Cloud 접속...');
  await page.goto('https://cloud.oracle.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Cloud Shell 버튼 클릭
  console.log('Cloud Shell 열기...');
  try {
    const shellBtn = page.locator('[aria-label*="Cloud Shell"], button[title*="Cloud Shell"], .cloudshell-button, [data-testid*="cloud-shell"]').first();
    await shellBtn.waitFor({ timeout: 10000 });
    await shellBtn.click();
    console.log('Cloud Shell 클릭됨');
  } catch (e) {
    console.log('Cloud Shell 버튼 못 찾음 - 스크린샷 확인 필요');
  }

  await page.waitForTimeout(10000);
  const screenshotPath = path.join(__dirname, 'cloudshell-status.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`스크린샷 저장: ${screenshotPath}`);
  console.log('확인 후 창 닫으세요.');

  await new Promise(r => setTimeout(r, 15000));
  await browser.close();
})();
