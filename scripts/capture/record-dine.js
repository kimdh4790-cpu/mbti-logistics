const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const CHROMIUM_PATH = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
const ROOT = path.join(__dirname, '../..');
const PROFILES_DIR = process.env.PROFILES_DIR || path.join(require('os').homedir(), '.mbtico-profiles');
const scenario = require('../content/dine-scenario.json');
const args = process.argv.slice(2);
const loginOnly = args.includes('--login-only');
const headless = process.env.HEADLESS !== 'false' && !loginOnly;

async function record() {
  const outputDir = path.join(ROOT, 'output');
  fs.mkdirSync(outputDir, { recursive: true });

  const profileDir = path.join(PROFILES_DIR, 'dine-record');
  fs.mkdirSync(profileDir, { recursive: true });

  const ctx = await chromium.launchPersistentContext(profileDir, {
    executablePath: CHROMIUM_PATH,
    headless,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    viewport: scenario.viewport,
    recordVideo: {
      dir: outputDir,
      size: scenario.viewport,
    },
  });

  const page = await ctx.newPage();

  if (loginOnly) {
    await page.goto('https://dine.ne.kr/app', { waitUntil: 'networkidle', timeout: 30000 });
    console.log('[DINE] 브라우저에서 soungkyekim@naver.com 으로 로그인하세요.');
    console.log('[DINE] 로그인 완료 후 이 창을 닫으면 세션이 저장됩니다.');
    await page.waitForURL('**/app**', { timeout: 300000 });
    console.log('[DINE] 세션 저장 완료: ' + profileDir);
    await ctx.close();
    return;
  }

  console.log('[DINE] 녹화 시작...');

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
      const shot = path.join(outputDir, `dine-${step.label}.png`);
      await page.screenshot({ path: shot, fullPage: false });
      console.log(`  [스크린샷] dine-${step.label}.png`);
    } else if (step.action === 'wait') {
      await page.waitForTimeout(step.ms);
    }
  }

  await ctx.close();

  const files = fs.readdirSync(outputDir)
    .filter(f => f.endsWith('.webm') && f !== 'dine-raw.webm')
    .sort((a, b) =>
      fs.statSync(path.join(outputDir, b)).mtimeMs - fs.statSync(path.join(outputDir, a)).mtimeMs
    );
  if (files.length > 0) {
    fs.renameSync(path.join(outputDir, files[0]), path.join(outputDir, 'dine-raw.webm'));
    console.log('[DINE] 녹화 완료: output/dine-raw.webm');
  } else {
    console.log('[DINE] 주의: WebM 파일 생성 안됨. 시나리오 단계 확인 필요.');
  }
}

record().catch(console.error);
