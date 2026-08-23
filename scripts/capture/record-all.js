const path = require('path');
const { spawnSync } = require('child_process');
const fs = require('fs');

const IS_WIN = process.platform === 'win32';
const IS_LINUX = process.platform === 'linux';

// Playwright: 원격 Linux 환경은 /opt 경로, 로컬은 node_modules에서
let chromium;
try {
  chromium = require('/opt/node22/lib/node_modules/playwright').chromium;
} catch(e) {
  chromium = require('playwright').chromium;
}

// FFmpeg: ffmpeg-static 패키지 우선, 없으면 시스템 ffmpeg
let FFMPEG;
try {
  FFMPEG = require('ffmpeg-static');
} catch(e) {
  FFMPEG = IS_WIN ? 'ffmpeg.exe' : 'ffmpeg';
}

// Chromium: 원격 Linux 환경만 고정 경로, 로컬은 Playwright 기본값(undefined)
const CHROMIUM_PATH = IS_LINUX && fs.existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
  ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
  : undefined;

const TEMPLATE_DIR = path.join(__dirname, '..', 'video-templates');
const OUT_DIR = path.join(__dirname, '..', '..', 'output');

const VIDEOS = [
  { name: 'filo',    html: 'filo-bexco2026.html',  slides: 9, slideDuration: 5500 },
  { name: 'dine',    html: 'dine-bexco2026.html',  slides: 6, slideDuration: 5500 },
  { name: 'yongcha', html: 'yongcha-promo.html',   slides: 8, slideDuration: 5500 },
  { name: 'donway',  html: 'donway-promo.html',    slides: 7, slideDuration: 5500 },
  { name: 'mbtico',  html: 'mbtico-promo.html',    slides: 6, slideDuration: 5500 },
].map(v => ({
  ...v,
  htmlPath: path.join(TEMPLATE_DIR, v.html),
  out: path.join(OUT_DIR, `${v.name}-promo.mp4`),
}));

// CLI: node record-all.js [filo|dine|yongcha|donway|mbtico]
const filter = process.argv[2];
const targets = filter ? VIDEOS.filter(v => v.name === filter) : VIDEOS;

if (targets.length === 0) {
  console.error(`알 수 없는 제품명: ${filter}. filo/dine/yongcha/donway/mbtico 중 선택`);
  process.exit(1);
}

async function recordVideo(cfg) {
  if (!fs.existsSync(cfg.htmlPath)) {
    console.error(`[${cfg.name}] 템플릿 없음: ${cfg.htmlPath}`);
    console.error(`  → git pull 후 다시 시도하세요`);
    return;
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const videoDir = path.join(OUT_DIR, `vid_${cfg.name}`);
  fs.mkdirSync(videoDir, { recursive: true });
  try { fs.readdirSync(videoDir).forEach(f => fs.unlinkSync(path.join(videoDir, f))); } catch(e){}

  console.log(`\n[${cfg.name.toUpperCase()}] 녹화 시작 (${cfg.slides}슬라이드)...`);

  const launchOpts = {
    headless: true,
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-gpu','--force-device-scale-factor=1'],
  };
  if (CHROMIUM_PATH) launchOpts.executablePath = CHROMIUM_PATH;

  const browser = await chromium.launch(launchOpts);
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    recordVideo: { dir: videoDir, size: { width: 1280, height: 720 } },
  });

  const page = await context.newPage();
  // Windows: file:///C:/... 형식 필요
  const fileUrl = IS_WIN
    ? 'file:///' + cfg.htmlPath.replace(/\\/g, '/')
    : 'file://' + cfg.htmlPath;
  await page.goto(fileUrl, { waitUntil: 'load' });
  await page.waitForTimeout(1200);

  for (let i = 1; i < cfg.slides; i++) {
    await page.waitForTimeout(cfg.slideDuration);
    await page.evaluate(() => window.goNext());
    console.log(`  [${cfg.name}] 슬라이드 ${i + 1}/${cfg.slides}`);
  }
  await page.waitForTimeout(cfg.slideDuration + 800);

  const webmPath = await page.video().path();
  await context.close();
  await browser.close();

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
    cfg.out,
  ], { stdio: 'inherit' });

  if (result.status !== 0) {
    console.error(`[${cfg.name}] FFmpeg 실패 — ffmpeg-static 또는 ffmpeg 설치 필요`);
    console.error(`  npm install ffmpeg-static  또는  choco install ffmpeg`);
    return;
  }

  const stat = fs.statSync(cfg.out);
  console.log(`[${cfg.name.toUpperCase()}] 완료 → ${cfg.out} (${(stat.size/1024/1024).toFixed(1)}MB)`);
}

(async () => {
  console.log(`플랫폼: ${process.platform} | Chromium: ${CHROMIUM_PATH || '(Playwright 기본값)'} | FFmpeg: ${FFMPEG}`);
  for (const cfg of targets) {
    await recordVideo(cfg);
  }
  console.log('\n완료!');
  for (const cfg of targets) {
    if (fs.existsSync(cfg.out)) console.log(`  ${cfg.name}: ${cfg.out}`);
  }
})();
