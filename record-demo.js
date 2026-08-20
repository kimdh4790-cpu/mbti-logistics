const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const FFMPEG = '/opt/pw-browsers/ffmpeg-1011/ffmpeg-linux';
const OUT_DIR = '/tmp/demo-screens';
const VIDEO_OUT = '/tmp/filo-demo.webm';

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const STEPS = [
  { name: '01-login',    wait: 2000, action: null },
  { name: '02-dashboard',wait: 3000, action: async (page) => {
    // 로그인
    try {
      await page.fill('#email', 'soungkyekim@naver.com');
      await page.fill('#password', 'khw3103!!!');
      await page.click('button[type=submit], .login-btn, button:has-text("로그인")');
      await page.waitForTimeout(4000);
    } catch(e) { console.log('login step:', e.message); }
  }},
  { name: '03-pos',      wait: 3000, action: async (page) => {
    try { await page.click('text=POS, text=포스, .nav-item:has-text("POS")'); } catch(e) {}
    await page.waitForTimeout(3000);
  }},
  { name: '04-menu',     wait: 3000, action: async (page) => {
    try { await page.click('text=메뉴'); } catch(e) {}
    await page.waitForTimeout(2000);
  }},
  { name: '05-order',    wait: 3000, action: async (page) => {
    try { await page.click('.menu-item, .menu-card'); } catch(e) {}
    await page.waitForTimeout(2000);
  }},
  { name: '06-staff',    wait: 3000, action: async (page) => {
    try { await page.click('text=직원'); } catch(e) {}
    await page.waitForTimeout(2000);
  }},
  { name: '07-inventory',wait: 3000, action: async (page) => {
    try { await page.click('text=재고'); } catch(e) {}
    await page.waitForTimeout(2000);
  }},
  { name: '08-report',   wait: 3000, action: async (page) => {
    try { await page.click('text=분석, text=리포트, text=매출'); } catch(e) {}
    await page.waitForTimeout(2000);
  }},
];

(async () => {
  console.log('브라우저 시작...');
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage'],
  });

  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: OUT_DIR+'/video/', size: { width: 1280, height: 800 } },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
  });

  const page = await ctx.newPage();

  console.log('filo.ai.kr 접속...');
  try {
    await page.goto('https://filo.ai.kr', { waitUntil: 'networkidle', timeout: 30000 });
  } catch(e) {
    await page.goto('https://filo.ai.kr', { timeout: 30000 });
  }
  await page.waitForTimeout(3000);

  let idx = 0;
  for (const step of STEPS) {
    console.log('Step:', step.name);
    if (step.action) await step.action(page);
    await page.waitForTimeout(step.wait);
    const screenshotPath = `${OUT_DIR}/screen_${String(idx).padStart(3,'0')}_${step.name}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log('  Screenshot:', screenshotPath);
    idx++;
  }

  console.log('페이지 닫기...');
  await page.close();
  await ctx.close();
  await browser.close();

  // List video files
  const videoDir = OUT_DIR+'/video/';
  if (fs.existsSync(videoDir)) {
    const files = fs.readdirSync(videoDir);
    console.log('녹화 파일:', files);
    if (files.length > 0) {
      const videoSrc = path.join(videoDir, files[0]);
      fs.copyFileSync(videoSrc, VIDEO_OUT);
      console.log('동영상 저장:', VIDEO_OUT);
      const stat = fs.statSync(VIDEO_OUT);
      console.log('파일 크기:', Math.round(stat.size/1024), 'KB');
    }
  }

  // Also list screenshots
  const screens = fs.readdirSync(OUT_DIR).filter(f=>f.endsWith('.png'));
  console.log('스크린샷 수:', screens.length);
  screens.forEach(f=>console.log(' -', f));
})();
