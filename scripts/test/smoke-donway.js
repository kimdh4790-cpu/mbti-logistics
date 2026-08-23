/**
 * DONWAY 스모크 테스트
 * 실행: node scripts/test/smoke-donway.js
 */
const { chromium } = require('playwright');
const { getChromiumLaunchOpts } = require('../utils/launch-options');

const CHECKS = [
  { url: 'https://donway.ai.kr', expect: ['DONWAY', '정산', '급여', '기사'], name: '랜딩' },
  { url: 'https://donway.ai.kr/donway_simulator.html', expect: ['시뮬레이터', '계산'], name: '시뮬레이터' },
  { url: 'https://donway.ai.kr/guide_ai.html', expect: ['가이드', 'AI'], name: 'AI가이드' },
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
      console.log(`  [DONWAY] ${icon} ${r.name}${detail ? ' — ' + detail : ''}`);
      if (!r.ok) failed++;
    }
    process.exit(failed > 0 ? 1 : 0);
  }).catch(e => { console.error(e); process.exit(1); });
}

module.exports = { run };
