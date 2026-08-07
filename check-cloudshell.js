const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium',
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  try {
    console.log('Oracle Cloud 접속 시도...');
    await page.goto('https://cloud.oracle.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/tmp/oci-check.png' });
    console.log('접속 성공! 스크린샷: /tmp/oci-check.png');
    console.log('URL:', page.url());
    console.log('타이틀:', await page.title());
  } catch (e) {
    console.log('접속 실패:', e.message);
  }

  await browser.close();
})();
