/**
 * 용차앱 화면 녹화 스크립트
 * 실행: node scripts/capture/record-yongcha.js
 *
 * yongcha.app은 Worker에 HTML이 내장됨 (KV 없음)
 * 랜딩 페이지는 public — 인증 불필요
 * 앱 내부(공고 목록 등)는 Firebase 로그인 필요
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const CHROMIUM_PATH = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
const ROOT = path.join(__dirname, '../..');
const scenario = require('../content/yongcha-scenario.json');
const headless = process.env.HEADLESS !== 'false';

async function record() {
  const outputDir = path.join(ROOT, 'output');
  fs.mkdirSync(outputDir, { recursive: true });

  const browser = await chromium.launch({
    executablePath: CHROMIUM_PATH,
    headless,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  // 용차 랜딩은 모바일 기준
  const ctx = await browser.newContext({
    viewport: scenario.viewport,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    recordVideo: {
      dir: outputDir,
      size: scenario.viewport,
    },
  });

  const page = await ctx.newPage();
  console.log('[용차] 녹화 시작...');

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
      const shot = path.join(outputDir, `yongcha-${step.label}.png`);
      await page.screenshot({ path: shot, fullPage: false });
      console.log(`  [스크린샷] yongcha-${step.label}.png`);
    } else if (step.action === 'wait') {
      await page.waitForTimeout(step.ms);
    }
  }

  await ctx.close();
  await browser.close();

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
