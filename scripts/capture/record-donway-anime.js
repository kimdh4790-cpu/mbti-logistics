#!/usr/bin/env node
/**
 * anime.js 기반 DONWAY 홍보 영상 녹화
 * 출력: output/donway-anime.mp4 (15~16초, 720×1280)
 */
const { chromium } = require('playwright');
const path         = require('path');
const fs           = require('fs');
const { execSync } = require('child_process');

const OUT_DIR   = path.join(__dirname, '..', '..', 'output');
const HTML_PATH = path.join(__dirname, 'donway-anime.html');

function findChromium() {
  const globs = [
    process.env.CHROMIUM_PATH,
    '/opt/pw-browsers/chromium-*/chrome-linux/chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
  ].filter(Boolean);
  for (const g of globs) {
    try {
      const hit = require('child_process')
        .execSync(`ls ${g} 2>/dev/null | head -1`, { encoding: 'utf8' })
        .trim();
      if (hit) return hit;
    } catch {}
  }
  return undefined;
}

(async () => {
  if (!fs.existsSync(HTML_PATH)) {
    console.error('HTML 없음:', HTML_PATH);
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const webmPath = path.join(OUT_DIR, 'donway-anime-raw.webm');
  const mp4Path  = path.join(OUT_DIR, 'donway-anime.mp4');

  const execPath = findChromium();
  console.log('[anime.js] Chromium:', execPath || '자동감지');

  const browser = await chromium.launch({
    executablePath: execPath,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const context = await browser.newContext({
    viewport: { width: 720, height: 1280 },
    recordVideo: { dir: OUT_DIR, size: { width: 720, height: 1280 } },
  });

  const page = await context.newPage();

  // Google Fonts 로딩 실패해도 진행 (CI 환경 폰트 차단 대비)
  page.on('requestfailed', () => {});

  console.log('[anime.js] HTML 로딩...');
  await page.goto(`file://${HTML_PATH}`, { waitUntil: 'networkidle' });

  // 폰트 대기 (최대 5초)
  await page.evaluate(() =>
    Promise.race([
      document.fonts.ready,
      new Promise(r => setTimeout(r, 5000)),
    ])
  );

  console.log('[anime.js] 애니메이션 실행 중 (최대 22초)...');
  await page.waitForFunction(() => window.__done === true, { timeout: 22000 })
    .catch(() => console.warn('[anime.js] 타임아웃 — 현재 시점에서 저장'));

  await page.waitForTimeout(300);

  const video = await page.video();
  await context.close();
  await browser.close();

  const raw = await video.path();
  if (raw && fs.existsSync(raw)) {
    fs.renameSync(raw, webmPath);
    console.log('[anime.js] WebM 저장:', webmPath);
  } else {
    console.error('[anime.js] 영상 파일 생성 실패');
    process.exit(1);
  }

  // WebM → MP4
  console.log('[FFmpeg] MP4 변환...');
  execSync(
    `ffmpeg -y -i "${webmPath}" -c:v libx264 -preset fast -crf 20 -movflags +faststart "${mp4Path}"`,
    { stdio: 'inherit' },
  );
  fs.unlinkSync(webmPath);
  console.log('[완료]', mp4Path);
})();
