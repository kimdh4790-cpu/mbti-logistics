const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium',
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  console.log('Oracle Cloud 접속 중...');
  await page.goto('https://cloud.oracle.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/tmp/oci-01.png', fullPage: false });
  console.log('스크린샷 저장: /tmp/oci-01.png');

  // Cloud Account Name (tenancy) 입력
  const tenancyInput = await page.$('input[placeholder*="cloud account"], #cloudAccountName, input[name*="tenant"]');
  if (tenancyInput) {
    console.log('Tenancy 입력란 발견');
    await page.screenshot({ path: '/tmp/oci-02-tenancy.png' });
  } else {
    console.log('Tenancy 입력란 없음 - 현재 페이지 상태 확인');
  }

  const html = await page.content();
  console.log('페이지 타이틀:', await page.title());
  console.log('URL:', page.url());

  await browser.close();
})();
