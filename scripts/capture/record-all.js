const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
const { spawnSync } = require('child_process');
const fs = require('fs');

const FFMPEG = '/opt/node22/lib/node_modules/ffmpeg-static/ffmpeg';
const CHROMIUM = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const TEMPLATE_DIR = path.join(__dirname, '..', 'video-templates');
const OUT_DIR = path.join(__dirname, '..', '..', 'output');

const VIDEOS = [
  {
    name: 'filo',
    html: path.join(TEMPLATE_DIR, 'filo-bexco2026.html'),
    out: path.join(OUT_DIR, 'filo-promo.mp4'),
    slides: 9,
    slideDuration: 5500,
  },
  {
    name: 'dine',
    html: path.join(TEMPLATE_DIR, 'dine-bexco2026.html'),
    out: path.join(OUT_DIR, 'dine-promo.mp4'),
    slides: 6,
    slideDuration: 5500,
  },
  {
    name: 'yongcha',
    html: path.join(TEMPLATE_DIR, 'yongcha-promo.html'),
    out: path.join(OUT_DIR, 'yongcha-promo.mp4'),
    slides: 8,
    slideDuration: 5500,
  },
  {
    name: 'donway',
    html: path.join(TEMPLATE_DIR, 'donway-promo.html'),
    out: path.join(OUT_DIR, 'donway-promo.mp4'),
    slides: 7,
    slideDuration: 5500,
  },
  {
    name: 'mbtico',
    html: path.join(TEMPLATE_DIR, 'mbtico-promo.html'),
    out: path.join(OUT_DIR, 'mbtico-promo.mp4'),
    slides: 6,
    slideDuration: 5500,
  },
];

// CLI: node record-all.js [filo|dine|yongcha|donway|mbtico]
const filter = process.argv[2];
const targets = filter ? VIDEOS.filter(v => v.name === filter) : VIDEOS;

async function recordVideo(cfg) {
  if (!fs.existsSync(cfg.html)) {
    console.error(`[${cfg.name}] 템플릿 없음: ${cfg.html}`);
    return;
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const videoDir = path.join(OUT_DIR, `vid_${cfg.name}`);
  fs.mkdirSync(videoDir, { recursive: true });
  try { fs.readdirSync(videoDir).forEach(f => fs.unlinkSync(path.join(videoDir, f))); } catch(e){}

  console.log(`\n[${cfg.name.toUpperCase()}] 녹화 시작 (${cfg.slides}슬라이드)...`);

  const browser = await chromium.launch({
    executablePath: CHROMIUM,
    headless: true,
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-gpu','--force-device-scale-factor=1']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    recordVideo: { dir: videoDir, size: { width: 1280, height: 720 } }
  });

  const page = await context.newPage();
  await page.goto('file://' + cfg.html, { waitUntil: 'load' });
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
  for (const cfg of targets) {
    await recordVideo(cfg);
  }
  console.log('\n모든 영상 제작 완료!');
  for (const cfg of targets) {
    if (fs.existsSync(cfg.out)) console.log(`  ${cfg.name}: ${cfg.out}`);
  }
})();
