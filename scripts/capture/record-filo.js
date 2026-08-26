/**
 * FILO 화면 녹화 스크립트
 * 실행: node scripts/capture/record-filo.js [--login-only]
 *
 * Track A (랜딩): 인증 불필요 → 랜딩+공개 페이지 녹화
 * Track B (앱 내부): Firebase 인증 필요
 *   최초 1회: HEADLESS=false node scripts/capture/record-filo.js --login-only
 *   이후: 저장된 세션으로 자동 실행
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const { chromiumExec } = require('../utils/launch-options');
const ROOT = path.join(__dirname, '../..');
const PROFILES_DIR = process.env.PROFILES_DIR || path.join(require('os').homedir(), '.mbtico-profiles');
const scenario = require('../content/filo-scenario.json');
const args = process.argv.slice(2);
const loginOnly = args.includes('--login-only');
const headless = process.env.HEADLESS !== 'false' && !loginOnly;

async function record() {
  const outputDir = path.join(ROOT, 'output');
  fs.mkdirSync(outputDir, { recursive: true });

  // 세션 유지 프로파일 경로 (Track B 앱 내부 접근용)
  const profileDir = path.join(PROFILES_DIR, 'filo-record');
  fs.mkdirSync(profileDir, { recursive: true });

  const ctx = await chromium.launchPersistentContext(profileDir, {
    ...chromiumExec(),
    headless,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    viewport: scenario.viewport,
    recordVideo: {
      dir: outputDir,
      size: scenario.viewport,
    },
  });

  const page = await ctx.newPage();

  // 로그인 전용 모드: 수동으로 로그인 후 세션 저장
  if (loginOnly) {
    await page.goto('https://filo.ai.kr/app', { waitUntil: 'networkidle', timeout: 30000 });
    console.log('[FILO] 브라우저에서 soungkyekim@naver.com 으로 로그인하세요.');
    console.log('[FILO] 로그인 완료 후 이 창을 닫으면 세션이 저장됩니다.');
    await page.waitForURL('**/app**', { timeout: 300000 });
    console.log('[FILO] 세션 저장 완료: ' + profileDir);
    await ctx.close();
    return;
  }

  console.log('[FILO] 녹화 시작...');

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
      const shot = path.join(outputDir, `filo-${step.label}.png`);
      await page.screenshot({ path: shot, fullPage: false });
      console.log(`  [스크린샷] filo-${step.label}.png`);
    } else if (step.action === 'evaluate') {
      await page.evaluate(step.expression).catch(() => {});
      await page.waitForTimeout(step.wait || 2000);
    } else if (step.action === 'click') {
      await page.click(step.selector).catch(() => {});
      await page.waitForTimeout(step.wait || 1500);
    } else if (step.action === 'wait') {
      await page.waitForTimeout(step.ms);
    }
  }

  await ctx.close();

  // Playwright가 WebM 파일을 outputDir에 생성함 — 가장 최신 파일을 filo-raw.webm으로 이름변경
  const files = fs.readdirSync(outputDir)
    .filter(f => f.endsWith('.webm') && f !== 'filo-raw.webm')
    .sort((a, b) =>
      fs.statSync(path.join(outputDir, b)).mtimeMs - fs.statSync(path.join(outputDir, a)).mtimeMs
    );
  if (files.length > 0) {
    fs.renameSync(path.join(outputDir, files[0]), path.join(outputDir, 'filo-raw.webm'));
    console.log('[FILO] 녹화 완료: output/filo-raw.webm');
  } else {
    console.log('[FILO] 주의: WebM 파일 생성 안됨. 시나리오 단계 확인 필요.');
  }
}

record().catch(console.error);
