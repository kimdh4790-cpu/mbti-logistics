/**
 * DONWAY 화면 녹화 스크립트
 * 실행: node scripts/capture/record-donway.js
 *
 * DONWAY 랜딩·시뮬레이터·가이드는 모두 public (인증 불필요)
 * 실제 정산 화면(/admin)은 로그인 필요 — 현재는 랜딩+공개 페이지만 녹화
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const { getChromiumLaunchOpts } = require('../utils/launch-options');
const ROOT = path.join(__dirname, '../..');
const scenario = require('../content/donway-scenario.json');
const headless = process.env.HEADLESS !== 'false';

async function record() {
  const outputDir = path.join(ROOT, 'output');
  fs.mkdirSync(outputDir, { recursive: true });

  const browser = await chromium.launch(getChromiumLaunchOpts(headless));

  const ctx = await browser.newContext({
    viewport: scenario.viewport,
    recordVideo: {
      dir: outputDir,
      size: scenario.viewport,
    },
  });

  const page = await ctx.newPage();
  console.log('[DONWAY] 녹화 시작...');

  for (const step of scenario.steps) {
    if (step.action === 'goto') {
      console.log(`  → ${step.url}`);
      await page.goto(step.url, { waitUntil: 'networkidle', timeout: 30000 }).catch(() =>
        page.goto(step.url, { waitUntil: 'domcontentloaded', timeout: 30000 })
      );
      await page.waitForTimeout(step.wait || 2000);
    } else if (step.action === 'scroll') {
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'smooth' }), step.y);
      await page.waitForTimeout(step.wait || 1500);
    } else if (step.action === 'screenshot') {
      const shot = path.join(outputDir, `donway-${step.label}.png`);
      await page.screenshot({ path: shot, fullPage: false });
      console.log(`  [스크린샷] donway-${step.label}.png`);
    } else if (step.action === 'wait') {
      await page.waitForTimeout(step.ms);
    }
  }

  await ctx.close();
  await browser.close();

  const files = fs.readdirSync(outputDir)
    .filter(f => f.endsWith('.webm') && f !== 'donway-raw.webm')
    .sort((a, b) =>
      fs.statSync(path.join(outputDir, b)).mtimeMs - fs.statSync(path.join(outputDir, a)).mtimeMs
    );
  if (files.length > 0) {
    fs.renameSync(path.join(outputDir, files[0]), path.join(outputDir, 'donway-raw.webm'));
    console.log('[DONWAY] 녹화 완료: output/donway-raw.webm');
  } else {
    console.log('[DONWAY] 주의: WebM 파일 생성 안됨.');
  }
}

record().catch(console.error);
