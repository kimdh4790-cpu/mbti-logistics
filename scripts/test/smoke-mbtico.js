/**
 * MBTICO 스모크 테스트
 * 실행: node scripts/test/smoke-mbtico.js
 */
const { chromium } = require('playwright');
const { getChromiumLaunchOpts } = require('../utils/launch-options');

const CHECKS = [
  { url: 'https://mbtico.kr', expect: ['배송', 'mbtico'], name: '랜딩' },
];

async function run() {
  const browser = await chromium.launch(getChromiumLaunchOpts(true));
  const results = [];

  for (const check of CHECKS) {
    const page = await browser.newPage();
    try {
      await page.goto(check.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(2000);
      const html = await page.content();
      const missing = check.expect.filter(kw => !html.includes(kw));
      results.push({ name: check.name, ok: missing.length === 0, missing });
    } catch (e) {
      results.push({ name: check.name, ok: false, error: e.message.split('\n')[0] });
    } finally {
      await page.close();
    }
  }

  await browser.close();
  return results;
}

if (require.main === module) {
  run().then(results => {
    let failed = 0;
    for (const r of results) {
      const icon = r.ok ? '✓' : '✗';
      const detail = r.ok ? '' : (r.error || `키워드 없음: ${r.missing.join(', ')}`);
      console.log(`  [MBTICO] ${icon} ${r.name}${detail ? ' — ' + detail : ''}`);
      if (!r.ok) failed++;
    }
    process.exit(failed > 0 ? 1 : 0);
  }).catch(e => { console.error(e); process.exit(1); });
}

module.exports = { run };
