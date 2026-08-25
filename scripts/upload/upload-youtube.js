/**
 * YouTube Studio 업로드 (Playwright 브라우저 로그인 방식)
 * 사용법: node upload-youtube.js --product yongcha [--dry-run]
 *        node upload-youtube.js --product yongcha --login-only
 */

const path = require('path');
const fs = require('fs');
const { chromium, getLaunchOpts, waitForEnter, PROFILES_DIR } = require('./session-manager');

const args = process.argv.slice(2);

// --product yongcha 또는 --product=yongcha 모두 지원
function getArg(name) {
  const eq = args.find(a => a.startsWith(`--${name}=`));
  if (eq) return eq.split('=')[1];
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : null;
}

const product = getArg('product') || 'filo';
const dryRun = args.includes('--dry-run');
const loginOnly = args.includes('--login-only');
const setProfile = args.includes('--set-profile');
const headless = !loginOnly && !setProfile;

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
  console.log(`[YouTube] 콘텐츠 변형: ${variant.label} (${weekIdx + 1}/${meta.variants.length}주차 순환)`);
}

// 제품별 프로필 이미지 (512px 아이콘 사용)
const PROFILE_ICONS = {
  filo:    path.join(ROOT, 'filo-icon-512.png'),
  dine:    path.join(ROOT, 'dine-icon-512.png'),
  donway:  path.join(ROOT, 'donway-icon-512.png'),
  yongcha: path.join(ROOT, 'yongcha-icon-512.png'),
  mbtico:  path.join(ROOT, 'mbtico-512.png'),
};

async function uploadYouTube() {
  if (!loginOnly && !dryRun && !fs.existsSync(videoPath)) {
    console.error(`[YouTube] 영상 파일 없음: ${videoPath}`);
    process.exit(1);
  }

  const profileDir = path.join(PROFILES_DIR, 'youtube');
  fs.mkdirSync(profileDir, { recursive: true });

  console.log(`[YouTube] ${loginOnly ? '[LOGIN-ONLY] ' : dryRun ? '[DRY-RUN] ' : ''}제품: ${product}`);

  const launchOpts = { ...getLaunchOpts(headless), timeout: 60000 };
  const ctx = await chromium.launchPersistentContext(profileDir, launchOpts);

  // navigator.webdriver 숨기기 (Google 자동화 감지 우회)
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  const page = await ctx.newPage();

  // 로그인 확인
  await page.goto('https://accounts.google.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  const url = page.url();
  const isLoggedIn = !url.includes('/signin') && !url.includes('/rejected');

  if (loginOnly) {
    if (!isLoggedIn) {
      console.log('[YouTube] 브라우저에서 Google 계정으로 로그인하세요.');
      console.log('           로그인 완료 후 이 터미널에서 Enter를 누르세요.');
      await waitForEnter();
    }
    console.log('[YouTube] 세션 저장됨.');
    await ctx.close();
    return;
  }

  // 채널 프로필 이미지 설정
  if (setProfile) {
    const iconPath = PROFILE_ICONS[product];
    if (!iconPath || !fs.existsSync(iconPath)) {
      console.error(`[YouTube] 프로필 이미지 없음: ${iconPath}`);
      await ctx.close();
      process.exit(1);
    }
    console.log(`[YouTube] 프로필 이미지 설정: ${iconPath}`);
    await page.goto('https://studio.youtube.com', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    // 채널 아이콘 클릭 (좌측 상단)
    const iconSelectors = [
      '#account-photo img',
      'yt-img-shadow#avatar img',
      '.ytd-topbar-logo-renderer img',
      '[id="avatar-btn"] img',
    ];
    for (const sel of iconSelectors) {
      try {
        await page.waitForSelector(sel, { timeout: 3000 });
        await page.click(sel);
        console.log(`[YouTube] 채널 아이콘 클릭 (${sel})`);
        break;
      } catch(e) {}
    }
    await page.waitForTimeout(1000);
    // 채널 설정으로 이동
    await page.goto('https://myaccount.google.com/personal-info', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    // 프로필 사진 변경 버튼
    try {
      const photoBtn = page.locator('[data-accountphotobuttontype], [aria-label*="프로필"], button:has-text("사진 변경")');
      await photoBtn.first().click({ timeout: 5000 });
      await page.waitForTimeout(1000);
      const [chooser] = await Promise.all([
        page.waitForEvent('filechooser', { timeout: 8000 }),
        page.locator('input[type=file]').first().evaluate(el => el.click()).catch(() =>
          page.locator('[aria-label="사진 업로드"], button:has-text("업로드")').first().click()
        ),
      ]);
      await chooser.setFiles(iconPath);
      await page.waitForTimeout(3000);
      const saveBtn = page.locator('button:has-text("저장"), button:has-text("Save"), [aria-label="저장"]');
      if (await saveBtn.count() > 0) await saveBtn.first().click();
      console.log('[YouTube] 프로필 이미지 업로드 완료!');
    } catch(e) {
      const shotPath = path.join(ROOT, 'output', 'yt-profile-debug.png');
      await page.screenshot({ path: shotPath, fullPage: true });
      console.error(`[YouTube] 프로필 설정 실패. 스크린샷: ${shotPath}`, e.message);
    }
    await ctx.close();
    return;
  }

  if (!isLoggedIn) {
    console.error('[YouTube] 로그인 세션 없음. --login-only 로 먼저 로그인하세요.');
    await ctx.close();
    process.exit(1);
  }

  // YouTube Studio로 이동
  await page.goto('https://studio.youtube.com', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  // "지원되지 않는 브라우저" 페이지 → 건너뛰기 링크 클릭
  const skipLink = page.locator('a:has-text("건너뛰기"), a:has-text("Skip"), [href*="studio.youtube.com"]:has-text("스튜디오")');
  if (await skipLink.count() > 0) {
    console.log('[YouTube] 브라우저 경고 페이지 → 건너뛰기 클릭');
    await skipLink.first().click();
    await page.waitForTimeout(3000);
  }

  if (dryRun) {
    console.log('[YouTube][DRY-RUN] YouTube Studio 접속 성공.');
    console.log(`  제목: ${meta.youtube.title}`);
    console.log(`  영상: ${videoPath}`);
    await ctx.close();
    return;
  }

  // 스튜디오 로딩 대기 + 현재 상태 스크린샷
  await page.waitForTimeout(5000);
  await page.screenshot({ path: path.join(ROOT, 'output', 'yt-studio-init.png') });

  // "본인 인증" 팝업 처리 (Google 보안 확인 모달)
  try {
    const verifyNext = page.locator('button:has-text("다음"), button:has-text("Next"), [aria-label="다음"], [aria-label="Next"]');
    if (await verifyNext.count() > 0) {
      console.log('[YouTube] 본인 인증 팝업 → 다음 클릭');
      await verifyNext.first().click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: path.join(ROOT, 'output', 'yt-after-verify.png') });
    }
  } catch(e) { /* 팝업 없으면 무시 */ }
  const currentUrl = page.url();
  console.log(`[YouTube] 현재 URL: ${currentUrl}`);

  // 업로드 버튼 — 여러 셀렉터 시도
  const uploadSelectors = [
    '#upload-icon',
    'ytcp-button#upload-icon',
    'ytcp-icon-button#upload-icon',
    '[aria-label="동영상 업로드"]',
    '[aria-label="Upload videos"]',
    '[aria-label="Create"]',
    '[aria-label="만들기"]',
    'button:has-text("업로드")',
    'button:has-text("Upload")',
    // 최신 YouTube Studio: 카메라+플러스 아이콘
    'yt-icon-button.ytcp-upload-icon',
    '#create-icon',
    '[id="create-icon"]',
  ];
  let clicked = false;
  for (const sel of uploadSelectors) {
    try {
      const el = await page.waitForSelector(sel, { timeout: 4000 });
      await el.click({ force: true });
      clicked = true;
      console.log(`[YouTube] 업로드 버튼 클릭 (${sel})`);
      break;
    } catch(e) { /* 다음 셀렉터 시도 */ }
  }
  if (!clicked) {
    // 텍스트 기반 최후 시도
    try {
      await page.getByText('동영상 업로드').first().click({ force: true });
      clicked = true;
      console.log('[YouTube] 업로드 버튼 클릭 (텍스트 매칭)');
    } catch(e) {}
  }
  if (!clicked) {
    const shotPath = path.join(ROOT, 'output', 'yt-debug.png');
    await page.screenshot({ path: shotPath, fullPage: true });
    console.error(`[YouTube] 업로드 버튼을 찾을 수 없음. 스크린샷: ${shotPath}`);
    console.error(`[YouTube] 현재 URL: ${page.url()}`);
    await ctx.close();
    process.exit(1);
  }
  await page.waitForTimeout(2000);

  // 파일 선택 (drag-drop 영역 또는 input)
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 10000 }),
    page.locator('input[type=file]').first().evaluate(el => el.click()).catch(() =>
      page.locator('[aria-label="파일 선택"], [aria-label="SELECT FILES"], text=파일 선택, text=SELECT FILES').first().click()
    ),
  ]);
  await fileChooser.setFiles(videoPath);
  console.log('[YouTube] 파일 업로드 중...');

  // 제목 입력 (업로드 후 메타 패널 열릴 때까지 대기)
  const titleSel = '#title-textarea, ytcp-mention-textbox[label="제목"], ytcp-mention-textbox[label="Title"]';
  await page.waitForSelector(titleSel, { timeout: 60000 });
  // 오버레이/백드롭 사라질 때까지 대기 (최대 15초)
  await page.waitForFunction(() => {
    const bd = document.querySelector('tp-yt-iron-overlay-backdrop');
    return !bd || !bd.hasAttribute('opened');
  }, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1000);
  await page.locator(titleSel).click({ force: true });
  await page.keyboard.press('Control+a');
  await page.keyboard.type(meta.youtube.title);

  // 설명 입력
  const descSel = '#description-textarea, ytcp-mention-textbox[label="설명"], ytcp-mention-textbox[label="Description"]';
  await page.locator(descSel).click({ force: true });
  await page.keyboard.press('Control+a');
  await page.keyboard.type(meta.youtube.description);

  // 아동용 여부 — 필수 항목 (선택 안 하면 다음 안 넘어감)
  const notKidsSelectors = [
    'tp-yt-paper-radio-button[name="VIDEO_NOT_MADE_FOR_KIDS"]',
    '[aria-label="아니요, 아동용이 아닙니다"]',
    '[aria-label="No, it\'s not made for kids"]',
    'ytcp-form-select tp-yt-paper-radio-button:last-child',
  ];
  for (const sel of notKidsSelectors) {
    try {
      await page.waitForSelector(sel, { timeout: 4000 });
      await page.click(sel);
      console.log(`[YouTube] 아동용 아님 선택 (${sel})`);
      break;
    } catch(e) {}
  }
  // 위 셀렉터 모두 실패 시 텍스트로 시도
  try {
    await page.locator('text=아니요, 아동용이 아닙니다').first().click({ timeout: 3000 });
    console.log('[YouTube] 아동용 아님 선택 (text locator)');
  } catch(e) {}
  await page.waitForTimeout(1000);

  // 다음 버튼 3회 (세부정보 → 동영상요소 → 검토 → 공개설정)
  for (let i = 0; i < 3; i++) {
    await page.waitForSelector('ytcp-button#next-button', { timeout: 10000 });
    await page.click('ytcp-button#next-button');
    console.log(`[YouTube] 다음 버튼 ${i + 1}/3`);
    await page.waitForTimeout(2000);
  }

  // 공개 설정 — 여러 셀렉터 순차 시도
  const publicSelectors = [
    'tp-yt-paper-radio-button[name="PUBLIC"]',
    '#privacy-radios tp-yt-paper-radio-button:first-child',
    'ytcp-ve tp-yt-paper-radio-button[name="PUBLIC"]',
    '[name="PUBLIC"]',
    '[aria-label="공개"]',
    '[aria-label="Public"]',
    'input[value="PUBLIC"]',
    'ytcp-privacy-dropdown #privacy-radios tp-yt-paper-radio-button',
  ];
  let publicClicked = false;
  for (const sel of publicSelectors) {
    try {
      await page.waitForSelector(sel, { timeout: 3000 });
      await page.click(sel);
      publicClicked = true;
      console.log(`[YouTube] 공개 설정 클릭 (${sel})`);
      break;
    } catch(e) { /* 다음 시도 */ }
  }
  if (!publicClicked) {
    const shotPath = path.join(ROOT, 'output', 'yt-public-debug.png');
    await page.screenshot({ path: shotPath, fullPage: true });
    console.error(`[YouTube] 공개 설정 버튼 못 찾음. 스크린샷: ${shotPath}`);
    console.log('[YouTube] 그래도 게시 버튼 클릭 시도 (이미 공개 기본값일 수 있음)...');
  }
  await page.waitForTimeout(1000);

  // 게시
  const doneSelectors = [
    'ytcp-button#done-button',
    '[aria-label="게시"]',
    '[aria-label="Publish"]',
    'ytcp-button:has-text("게시")',
    'ytcp-button:has-text("Publish")',
    'button:has-text("게시")',
  ];
  let doneClicked = false;
  for (const sel of doneSelectors) {
    try {
      await page.waitForSelector(sel, { timeout: 5000 });
      await page.click(sel);
      doneClicked = true;
      console.log(`[YouTube] 게시 버튼 클릭 (${sel})`);
      break;
    } catch(e) {}
  }
  if (!doneClicked) {
    const shotPath = path.join(ROOT, 'output', 'yt-done-debug.png');
    await page.screenshot({ path: shotPath, fullPage: true });
    console.error(`[YouTube] 게시 버튼 못 찾음. 스크린샷: ${shotPath}`);
    await ctx.close();
    process.exit(1);
  }
  console.log('[YouTube] 업로드 완료!');

  await page.waitForTimeout(5000);
  await ctx.close();
}

uploadYouTube().catch(console.error);
