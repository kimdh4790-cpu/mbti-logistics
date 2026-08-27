/**
 * 용차앱 프로모션 HTML 녹화 스크립트
 * 기사·대리점 양쪽 기능을 담은 로컬 HTML 슬라이드쇼 녹화
 * 실행: node scripts/capture/record-yongcha.js
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const { getChromiumLaunchOpts } = require('../utils/launch-options');
const ROOT = path.join(__dirname, '../..');
const headless = process.env.HEADLESS !== 'false';

async function record() {
  const outputDir = path.join(ROOT, 'output');
  fs.mkdirSync(outputDir, { recursive: true });

  const promoHtml = path.join(ROOT, 'assets/promo/yongcha-promo.html');
  if (!fs.existsSync(promoHtml)) {
    console.error('[용차] ERROR: assets/promo/yongcha-promo.html 없음. 먼저 파일 확인.');
    process.exit(1);
  }

  const browser = await chromium.launch(getChromiumLaunchOpts(headless));

  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    recordVideo: {
      dir: outputDir,
      size: { width: 390, height: 844 },
    },
  });

  const page = await ctx.newPage();
  console.log('[용차] 프로모션 HTML 녹화 시작...');

  const fileUrl = 'file://' + promoHtml;
  await page.goto(fileUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
  console.log('  → 프로모션 HTML 로드 완료');

  // 슬라이드 7장 × 평균 5.4초 = ~38초 + 여유
  const totalMs = 7 * 5500 + 3000;
  console.log(`  → ${Math.round(totalMs/1000)}초 녹화 중...`);

  // 슬라이드별 스크린샷
  const shots = [
    { label: 'landing-hero',     delay: 1500 },
    { label: 'landing-compare',  delay: 5500 },
    { label: 'landing-driver',   delay: 5500 },
    { label: 'landing-dealer',   delay: 6000 },
    { label: 'landing-guarantee',delay: 5500 },
    { label: 'landing-pricing-table', delay: 5500 },
    { label: 'landing-cta',      delay: 6000 },
  ];

  for (const s of shots) {
    await page.waitForTimeout(s.delay);
    await page.screenshot({ path: path.join(outputDir, `yongcha-${s.label}.png`) });
    console.log(`  [스크린샷] yongcha-${s.label}.png`);
  }

  await page.waitForTimeout(2000);
  await ctx.close();
  await browser.close();

  // webm → yongcha-raw.webm 이름 변경
  const files = fs.readdirSync(outputDir)
    .filter(f => f.endsWith('.webm') && f !== 'yongcha-raw.webm')
    .sort((a, b) =>
      fs.statSync(path.join(outputDir, b)).mtimeMs - fs.statSync(path.join(outputDir, a)).mtimeMs
    );
  if (files.length > 0) {
    fs.renameSync(path.join(outputDir, files[0]), path.join(outputDir, 'yongcha-raw.webm'));
    console.log('[용차] 녹화 완료: output/yongcha-raw.webm');
  } else {
    console.log('[용차] 주의: WebM 파일 생성 안됨.');
  }
}

record().catch(console.error);
