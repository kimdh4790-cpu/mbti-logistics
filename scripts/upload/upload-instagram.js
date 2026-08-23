/**
 * Instagram Web 업로드 (Playwright 브라우저 로그인 방식)
 * 사용법: node upload-instagram.js --product filo [--type reels|photo] [--dry-run]
 *
 * 최초 로그인:
 *   HEADLESS=false node upload-instagram.js --product filo --login-only
 */

const path = require('path');
const fs = require('fs');
const { chromium } = (() => { try { return require('/opt/node22/lib/node_modules/playwright'); } catch(e) { return require('playwright'); } })();
const { CHROMIUM_PATH, PROFILES_DIR } = require('./session-manager');

const args = process.argv.slice(2);
const product = (args.find(a => a.startsWith('--product=')) || '--product=filo').split('=')[1]
  || (args[args.indexOf('--product') + 1] || 'filo');
const type = (args.find(a => a.startsWith('--type=')) || '--type=reels').split('=')[1]
  || (args[args.indexOf('--type') + 1] || 'reels');
const dryRun = args.includes('--dry-run');
const loginOnly = args.includes('--login-only');
const headless = process.env.HEADLESS !== 'false' && !loginOnly;

const ROOT = path.join(__dirname, '../..');
const meta = require(`../content/${product}-meta.json`);
const videoPath = path.join(ROOT, 'output', `${product}-promo.mp4`);

async function uploadInstagram() {
  if (!dryRun && !fs.existsSync(videoPath)) {
    console.error(`[Instagram] 파일 없음: ${videoPath}`);
    process.exit(1);
  }

  const profileDir = path.join(PROFILES_DIR, 'instagram');
  fs.mkdirSync(profileDir, { recursive: true });

  console.log(`[Instagram] ${dryRun ? '[DRY-RUN] ' : ''}업로드: ${product} (${type})`);

  const ctx = await chromium.launchPersistentContext(profileDir, {
    executablePath: CHROMIUM_PATH,
    headless,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    viewport: { width: 375, height: 812 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    timeout: 60000,
  });

  const page = await ctx.newPage();
  await page.goto('https://www.instagram.com', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  const url = page.url();
  if (url.includes('/accounts/login') || url.includes('/login')) {
    if (loginOnly || !headless) {
      console.log('[Instagram] 수동 로그인 필요. 로그인 후 Enter를 누르세요...');
      await page.waitForURL('https://www.instagram.com/', { timeout: 300000 });
    } else {
      console.error('[Instagram] 로그인 세션 없음. HEADLESS=false --login-only 로 먼저 로그인하세요.');
      await ctx.close();
      process.exit(1);
    }
  }

  if (loginOnly) {
    console.log('[Instagram] 로그인 완료. 세션 저장됨.');
    await ctx.close();
    return;
  }

  if (dryRun) {
    console.log('[Instagram][DRY-RUN] 로그인 세션 확인 완료.');
    console.log(`  캡션: ${meta.instagram.caption.substring(0, 80)}...`);
    await ctx.close();
    return;
  }

  // 새 게시물 버튼
  await page.waitForSelector('svg[aria-label="새 게시물"], svg[aria-label="New post"], [aria-label="New post"]', { timeout: 15000 });
  await page.click('svg[aria-label="새 게시물"], svg[aria-label="New post"], [aria-label="New post"]');
  await page.waitForTimeout(2000);

  // 파일 선택
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.locator('text=컴퓨터에서 선택, text=Select from computer').first().click().catch(() =>
      page.locator('input[type=file]').first().click()
    ),
  ]);
  await fileChooser.setFiles(videoPath);
  console.log('[Instagram] 파일 선택 완료, 업로드 중...');
  await page.waitForTimeout(5000);

  // Reels 선택 (비디오인 경우)
  if (type === 'reels') {
    await page.locator('text=릴스, text=Reels').first().click().catch(() => {});
    await page.waitForTimeout(1000);
  }

  // 다음 버튼
  await page.locator('text=다음, text=Next').first().click();
  await page.waitForTimeout(2000);
  await page.locator('text=다음, text=Next').first().click();
  await page.waitForTimeout(2000);

  // 캡션 입력
  await page.click('textarea, [aria-label="캡션 작성"], [aria-label="Write a caption"]');
  await page.keyboard.type(meta.instagram.caption, { delay: 20 });
  await page.waitForTimeout(1000);

  // 공유
  await page.locator('text=공유, text=Share').first().click();
  console.log('[Instagram] 업로드 완료!');

  await page.waitForTimeout(5000);
  await ctx.close();
}

uploadInstagram().catch(console.error);
