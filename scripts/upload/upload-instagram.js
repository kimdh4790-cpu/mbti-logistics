/**
 * Instagram Web 업로드 (Playwright 브라우저 로그인 방식)
 * 사용법: node upload-instagram.js --product filo [--type reels|photo] [--dry-run]
 *
 * 최초 로그인:
 *   HEADLESS=false node upload-instagram.js --product filo --login-only
 */

const path = require('path');
const fs = require('fs');
const { chromium, getLaunchOpts, PROFILES_DIR, waitForEnter } = require('./session-manager');

const args = process.argv.slice(2);
function getArg(name) {
  const eq = args.find(a => a.startsWith(`--${name}=`));
  if (eq) return eq.split('=')[1];
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : null;
}
const product = getArg('product') || 'filo';
const type = getArg('type') || 'reels';
const dryRun = args.includes('--dry-run');
const loginOnly = args.includes('--login-only');
const setProfile = args.includes('--set-profile');
const headless = process.env.HEADLESS !== 'false' && !loginOnly && !setProfile;

const ROOT = path.join(__dirname, '../..');
const meta = require(`../content/${product}-meta.json`);
const videoPath = path.join(ROOT, 'output', `${product}-promo.mp4`);

const PROFILE_ICONS = {
  filo:    path.join(ROOT, 'filo-icon-512.png'),
  dine:    path.join(ROOT, 'dine-icon-512.png'),
  donway:  path.join(ROOT, 'donway-icon-512.png'),
  yongcha: path.join(ROOT, 'yongcha-icon-512.png'),
  mbtico:  path.join(ROOT, 'mbtico-512.png'),
};

async function uploadInstagram() {
  if (!loginOnly && !dryRun && !fs.existsSync(videoPath)) {
    console.error(`[Instagram] 파일 없음: ${videoPath}`);
    process.exit(1);
  }

  const profileDir = path.join(PROFILES_DIR, 'instagram');
  fs.mkdirSync(profileDir, { recursive: true });

  console.log(`[Instagram] ${loginOnly ? '[LOGIN-ONLY] ' : dryRun ? '[DRY-RUN] ' : ''}시작: ${product} (${type})`);

  const launchOpts = {
    ...getLaunchOpts(headless),
    viewport: { width: 375, height: 812 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    timeout: 60000,
  };
  const ctx = await chromium.launchPersistentContext(profileDir, launchOpts);

  const page = await ctx.newPage();
  await page.goto('https://www.instagram.com', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  if (loginOnly) {
    await waitForEnter('[Instagram] 브라우저에서 Instagram 로그인 후 Enter를 누르세요.');
    console.log('[Instagram] 세션 저장됨.');
    await ctx.close();
    return;
  }

  const url = page.url();
  if (url.includes('/accounts/login') || url.includes('/login')) {
    console.error('[Instagram] 로그인 세션 없음. HEADLESS=false --login-only 로 먼저 로그인하세요.');
    await ctx.close();
    process.exit(1);
  }

  // 프로필 이미지 설정
  if (setProfile) {
    const iconPath = PROFILE_ICONS[product];
    if (!iconPath || !fs.existsSync(iconPath)) {
      console.error(`[Instagram] 프로필 이미지 없음: ${iconPath}`);
      await ctx.close();
      process.exit(1);
    }
    console.log(`[Instagram] 프로필 이미지 설정: ${iconPath}`);
    // 프로필 페이지 → 사진 변경
    await page.goto('https://www.instagram.com/accounts/edit/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    try {
      // 프로필 사진 클릭 또는 "사진 변경" 링크
      const photoChange = page.locator('text=사진 변경, text=Change photo, [aria-label="프로필 사진 변경"]');
      if (await photoChange.count() > 0) {
        await photoChange.first().click();
        await page.waitForTimeout(1000);
      }
      const [chooser] = await Promise.all([
        page.waitForEvent('filechooser', { timeout: 8000 }),
        page.locator('input[type=file]').first().evaluate(el => el.click()),
      ]);
      await chooser.setFiles(iconPath);
      await page.waitForTimeout(3000);
      // 확인 버튼
      const confirm = page.locator('button:has-text("확인"), button:has-text("Apply"), button:has-text("저장")');
      if (await confirm.count() > 0) await confirm.first().click();
      console.log('[Instagram] 프로필 이미지 업로드 완료!');
    } catch(e) {
      const shotPath = path.join(ROOT, 'output', 'ig-profile-debug.png');
      await page.screenshot({ path: shotPath, fullPage: true });
      console.error(`[Instagram] 프로필 설정 실패. 스크린샷: ${shotPath}`, e.message);
    }
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
