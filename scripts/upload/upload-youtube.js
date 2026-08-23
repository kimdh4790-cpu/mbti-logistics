/**
 * YouTube Studio 업로드 (Playwright 브라우저 로그인 방식)
 * 사용법: node upload-youtube.js --product filo [--dry-run]
 *
 * 최초 실행 시 HEADLESS=false 로 실행하여 수동 로그인 후 세션 저장:
 *   HEADLESS=false node upload-youtube.js --product filo --login-only
 */

const path = require('path');
const fs = require('fs');
const { chromium } = (() => { try { return require('/opt/node22/lib/node_modules/playwright'); } catch(e) { return require('playwright'); } })();
const { CHROMIUM_PATH, PROFILES_DIR } = require('./session-manager');

const args = process.argv.slice(2);
const product = (args.find(a => a.startsWith('--product=')) || '--product=filo').split('=')[1]
  || (args[args.indexOf('--product') + 1] || 'filo');
const dryRun = args.includes('--dry-run');
const loginOnly = args.includes('--login-only');
const headless = process.env.HEADLESS !== 'false' && !loginOnly;

const ROOT = path.join(__dirname, '../..');
const meta = require(`../content/${product}-meta.json`);
const videoPath = path.join(ROOT, 'output', `${product}-promo.mp4`);
const thumbPath = path.join(ROOT, 'output', `${product}-thumbnail.jpg`);

async function uploadYouTube() {
  if (!loginOnly && !dryRun && !fs.existsSync(videoPath)) {
    console.error(`[YouTube] 영상 파일 없음: ${videoPath}`);
    process.exit(1);
  }

  const profileDir = path.join(PROFILES_DIR, 'youtube');
  fs.mkdirSync(profileDir, { recursive: true });

  console.log(`[YouTube] ${loginOnly ? '[LOGIN-ONLY] ' : dryRun ? '[DRY-RUN] ' : ''}시작: ${product}`);

  const launchOpts = {
    headless,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    viewport: { width: 1280, height: 800 },
    timeout: 60000,
  };
  if (CHROMIUM_PATH) launchOpts.executablePath = CHROMIUM_PATH;
  const ctx = await chromium.launchPersistentContext(profileDir, launchOpts);

  const page = await ctx.newPage();

  // 로그인 확인
  await page.goto('https://studio.youtube.com', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  const url = page.url();
  if (url.includes('accounts.google.com')) {
    if (loginOnly || !headless) {
      console.log('[YouTube] 수동 로그인 필요. 로그인 후 Enter를 누르세요...');
      await page.waitForURL('**/studio.youtube.com**', { timeout: 300000 });
    } else {
      console.error('[YouTube] 로그인 세션 없음. HEADLESS=false --login-only 로 먼저 로그인하세요.');
      await ctx.close();
      process.exit(1);
    }
  }

  if (loginOnly) {
    console.log('[YouTube] 로그인 완료. 세션 저장됨.');
    await ctx.close();
    return;
  }

  if (dryRun) {
    console.log('[YouTube][DRY-RUN] YouTube Studio 접속 성공.');
    console.log(`  제목: ${meta.youtube.title}`);
    console.log(`  태그: ${meta.youtube.tags.join(', ')}`);
    await ctx.close();
    return;
  }

  // 업로드 버튼 클릭
  await page.waitForSelector('ytcp-button#upload-icon, [aria-label="동영상 업로드"], [aria-label="Upload videos"]', { timeout: 15000 });
  await page.click('ytcp-button#upload-icon, [aria-label="동영상 업로드"], [aria-label="Upload videos"]');
  await page.waitForTimeout(2000);

  // 파일 선택
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('input[type=file], [aria-label="파일 선택"]').catch(() =>
      page.locator('text=파일 선택, text=SELECT FILES').first().click()
    ),
  ]);
  await fileChooser.setFiles(videoPath);
  console.log('[YouTube] 파일 업로드 중...');

  // 제목 입력
  await page.waitForSelector('#title-textarea, ytcp-mention-textbox[label="제목"], ytcp-mention-textbox[label="Title"]', { timeout: 30000 });
  await page.click('#title-textarea, ytcp-mention-textbox[label="제목"], ytcp-mention-textbox[label="Title"]');
  await page.keyboard.selectAll();
  await page.keyboard.type(meta.youtube.title);

  // 설명 입력
  await page.click('#description-textarea, ytcp-mention-textbox[label="설명"], ytcp-mention-textbox[label="Description"]');
  await page.keyboard.selectAll();
  await page.keyboard.type(meta.youtube.description);

  // 다음 버튼 2회 (세부정보 → 공개 설정)
  for (let i = 0; i < 3; i++) {
    await page.waitForSelector('ytcp-button#next-button', { timeout: 10000 });
    await page.click('ytcp-button#next-button');
    await page.waitForTimeout(1500);
  }

  // 공개 설정
  await page.waitForSelector('[name="PUBLIC"], [aria-label="공개"]', { timeout: 10000 });
  await page.click('[name="PUBLIC"], [aria-label="공개"]');
  await page.waitForTimeout(1000);

  // 게시
  await page.click('ytcp-button#done-button, [aria-label="게시"], [aria-label="Publish"]');
  console.log('[YouTube] 업로드 완료!');

  await page.waitForTimeout(3000);
  await ctx.close();
}

uploadYouTube().catch(console.error);
