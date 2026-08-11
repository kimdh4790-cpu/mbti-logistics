const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
const { execSync, spawnSync } = require('child_process');
const fs = require('fs');

const FFMPEG = '/opt/node22/lib/node_modules/ffmpeg-static/ffmpeg';
const CHROMIUM = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const SCRATCH = '/tmp/claude-0/-home-user-mbti-logistics/183edbc6-7b8c-505e-80e9-5405300b92e9/scratchpad';

const VIDEOS = [
  {
    name: 'filo',
    html: path.join(SCRATCH, 'filo-video4.html'),
    out: path.join(SCRATCH, 'filo-bexco2026.mp4'),
    videoDir: path.join(SCRATCH, 'vid_filo'),
    slides: 7,
    slideDuration: 5500, // ms per slide
    title: 'FILO 박람회 소개영상',
  },
  {
    name: 'dine',
    html: path.join(SCRATCH, 'dine-video3.html'),
    out: path.join(SCRATCH, 'dine-bexco2026.mp4'),
    videoDir: path.join(SCRATCH, 'vid_dine'),
    slides: 6,
    slideDuration: 5500,
    title: 'DINE 박람회 소개영상',
  },
];

async function recordVideo(cfg) {
  console.log(`\n[${cfg.name.toUpperCase()}] 녹화 시작...`);
  fs.mkdirSync(cfg.videoDir, { recursive: true });
  // clean old
  try { fs.readdirSync(cfg.videoDir).forEach(f => fs.unlinkSync(path.join(cfg.videoDir, f))); } catch(e){}

  const browser = await chromium.launch({
    executablePath: CHROMIUM,
    headless: true,
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-gpu','--force-device-scale-factor=1']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    recordVideo: { dir: cfg.videoDir, size: { width: 1280, height: 720 } }
  });

  const page = await context.newPage();
  await page.goto('file://' + cfg.html, { waitUntil: 'load' });
  await page.waitForTimeout(1200); // 첫 슬라이드 인트로 대기

  // 슬라이드 순서대로 진행
  for (let i = 1; i < cfg.slides; i++) {
    await page.waitForTimeout(cfg.slideDuration);
    await page.evaluate(() => window.goNext());
    console.log(`  [${cfg.name}] 슬라이드 ${i + 1}/${cfg.slides}`);
  }

  // 마지막 슬라이드 충분히 대기
  await page.waitForTimeout(cfg.slideDuration + 800);

  const webmPath = await page.video().path();
  await context.close();
  await browser.close();

  // WebM → MP4 변환
  console.log(`[${cfg.name.toUpperCase()}] FFmpeg 변환 중...`);
  const result = spawnSync(FFMPEG, [
    '-y',
    '-i', webmPath,
    '-vf', 'scale=1280:720',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '22',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    '-r', '30',
    cfg.out
  ], { stdio: 'inherit' });

  if (result.status !== 0) {
    console.error(`[${cfg.name}] FFmpeg 실패`);
    return;
  }

  const stat = fs.statSync(cfg.out);
  console.log(`[${cfg.name.toUpperCase()}] 완료 → ${cfg.out} (${(stat.size/1024/1024).toFixed(1)}MB)`);
}

(async () => {
  for (const cfg of VIDEOS) {
    await recordVideo(cfg);
  }
  console.log('\n모든 영상 제작 완료!');
  console.log('FILO:', path.join(SCRATCH, 'filo-bexco2026.mp4'));
  console.log('DINE:', path.join(SCRATCH, 'dine-bexco2026.mp4'));
})();
