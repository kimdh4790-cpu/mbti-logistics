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
let meta = require(`../content/${product}-meta.json`);
const videoPath = path.join(ROOT, 'output', `${product}-promo.mp4`);

// 주차 기반 variant 선택 (매주 다른 콘텐츠 각도로 홍보)
if (meta.variants && meta.variants.length > 0) {
  const weekIdx = Math.floor(Date.now() / (7 * 24 * 3600 * 1000)) % meta.variants.length;
  const variant = meta.variants[weekIdx];
  if (variant.youtube) meta = { ...meta, youtube: { ...meta.youtube, ...variant.youtube } };
  if (variant.instagram) meta = { ...meta, instagram: { ...meta.instagram, ...variant.instagram } };
  if (variant.blog) meta = { ...meta, blog: { ...meta.blog, ...variant.blog } };
  console.log(`[Instagram] 콘텐츠 변형: ${variant.label} (${weekIdx + 1}/${meta.variants.length}주차 순환)`);
}

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
    const igUser = process.env.INSTAGRAM_USERNAME;
    const igPass = process.env.INSTAGRAM_PASSWORD;
    if (igUser && igPass) {
      console.log('[Instagram] 자동 로그인 시도...');
      await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);
      await page.fill('input[name="username"]', igUser);
      await page.fill('input[name="password"]', igPass);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(6000);
      // "로그인 정보 저장" 다이얼로그 처리
      const notNow = page.locator('text=나중에 하기, text=Not Now, text=나중에');
      if (await notNow.count() > 0) await notNow.first().click().catch(() => {});
      await page.waitForTimeout(2000);
      const afterUrl = page.url();
      if (afterUrl.includes('/login') || afterUrl.includes('/challenge') || afterUrl.includes('/accounts/login')) {
        const shotPath = require('path').join(ROOT, 'output', 'ig-login-debug.png');
        await page.screenshot({ path: shotPath, fullPage: true });
        console.error(`[Instagram] 로그인 실패. 스크린샷: ${shotPath}`);
        await ctx.close();
        process.exit(1);
      }
      console.log('[Instagram] 자동 로그인 성공!');
    } else {
      console.error('[Instagram] 로그인 세션 없음. INSTAGRAM_USERNAME/PASSWORD 설정 또는 --login-only 로 먼저 로그인하세요.');
      await ctx.close();
      process.exit(1);
    }
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

  // 방법 A: /create/style/ 직접 이동 (버튼 클릭 없이 우회)
  let navigatedToCreate = false;
  try {
    await page.goto('https://www.instagram.com/create/style/', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    const curUrl = page.url();
    if (!curUrl.includes('/login') && !curUrl.includes('instagram.com/?')) {
      navigatedToCreate = true;
      console.log('[Instagram] /create/style/ 직접 이동 성공');
    }
  } catch (_) {}

  // 방법 B: /create/select/ 시도
  if (!navigatedToCreate) {
    try {
      await page.goto('https://www.instagram.com/create/select/', { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(2000);
      const curUrl = page.url();
      if (!curUrl.includes('/login') && !curUrl.includes('instagram.com/?')) {
        navigatedToCreate = true;
        console.log('[Instagram] /create/select/ 직접 이동 성공');
      }
    } catch (_) {}
  }

  // 방법 C: 버튼 클릭 폴백
  if (!navigatedToCreate) {
    await page.goto('https://www.instagram.com', { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(2000);
    const NEW_POST_SELECTORS = [
      '[aria-label="새 게시물"]',
      '[aria-label="New post"]',
      '[aria-label="Create"]',
      '[aria-label="만들기"]',
      'a[href="/create/select/"]',
      'nav a[href*="create"]',
      // aria-label 없는 플러스 아이콘 — SVG path로 찾기
      'svg[aria-label]',
    ];
    for (const sel of NEW_POST_SELECTORS) {
      try {
        await page.waitForSelector(sel, { timeout: 3000 });
        await page.click(sel);
        navigatedToCreate = true;
        console.log(`[Instagram] 새 게시물 버튼 클릭: ${sel}`);
        break;
      } catch (_) {}
    }
  }

  if (!navigatedToCreate) {
    const shotPath = path.join(ROOT, 'output', 'ig-debug.png');
    await page.screenshot({ path: shotPath, fullPage: true });
    throw new Error(`[Instagram] 새 게시물 화면 진입 실패. 스크린샷: ${shotPath}`);
  }
  await page.waitForTimeout(2000);

  // 파일 input 찾기 (hidden input[type=file] 강제 클릭)
  let fileChooser;
  try {
    [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: 8000 }),
      page.evaluate(() => {
        const inp = document.querySelector('input[type="file"]');
        if (inp) { inp.style.display = 'block'; inp.click(); }
      }),
    ]);
  } catch (_) {
    // input[type=file]이 없으면 "컴퓨터에서 선택" 버튼 시도
    [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: 10000 }),
      page.locator('text=컴퓨터에서 선택, text=Select from computer, text=Select from Gallery, text=선택').first().click(),
    ]);
  }
  await fileChooser.setFiles(videoPath);
  console.log('[Instagram] 파일 선택 완료, 업로드 중...');
  await page.waitForTimeout(6000);

  // Reels 선택 (비디오인 경우)
  if (type === 'reels') {
    await page.locator('text=릴스, text=Reels, text=Reel').first().click().catch(() => {});
    await page.waitForTimeout(1500);
  }

  // 다음 버튼 (최대 3번) — role=button 포함 다중 셀렉터
  for (let i = 0; i < 3; i++) {
    const nextClicked = await page.locator('text=다음').first().click({ timeout: 4000 }).then(() => true).catch(() => false)
      || await page.locator('text=Next').first().click({ timeout: 4000 }).then(() => true).catch(() => false)
      || await page.locator('[role="button"]:has-text("다음"), [role="button"]:has-text("Next")').first().click({ timeout: 4000 }).then(() => true).catch(() => false);
    if (!nextClicked) break;
    await page.waitForTimeout(2500);
  }

  // 캡션 입력
  const captionSel = 'textarea, [aria-label="캡션 작성"], [aria-label="Write a caption"], [aria-label="캡션"], [contenteditable="true"]';
  await page.click(captionSel, { timeout: 5000 }).catch(() => {});
  await page.keyboard.type(meta.instagram.caption, { delay: 20 });
  await page.waitForTimeout(1000);

  // 공유 버튼 — 다양한 셀렉터 순차 시도
  const SHARE_SELECTORS = [
    '[role="button"]:has-text("공유")',
    '[role="button"]:has-text("Share")',
    'button:has-text("공유")',
    'button:has-text("Share")',
    'div[role="button"]:has-text("공유")',
    'div[role="button"]:has-text("Share")',
    'text=공유',
    'text=Share',
  ];
  let shared = false;
  for (const sel of SHARE_SELECTORS) {
    shared = await page.locator(sel).first().click({ timeout: 8000 }).then(() => true).catch(() => false);
    if (shared) { console.log(`[Instagram] 공유 버튼 클릭: ${sel}`); break; }
  }
  if (!shared) {
    const shotPath = path.join(ROOT, 'output', 'ig-share-debug.png');
    await page.screenshot({ path: shotPath, fullPage: true });
    throw new Error(`[Instagram] 공유 버튼 클릭 실패. 스크린샷: ${shotPath}`);
  }
  console.log('[Instagram] 업로드 완료!');

  await page.waitForTimeout(5000);
  await ctx.close();
}

uploadInstagram().catch(console.error);
