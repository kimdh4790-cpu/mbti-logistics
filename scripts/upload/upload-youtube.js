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
    await page.goto('https://studio.youtube.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
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
    await page.goto('https://myaccount.google.com/personal-info', { waitUntil: 'domcontentloaded', timeout: 30000 });
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
  await page.goto('https://studio.youtube.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
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

  // 팝업 완전 제거 루프 (본인 인증 등 — 최대 10회, 다단계 wizard 처리)
  // 중요: ytcp-dialog/[role=dialog] 내 버튼으로 스코프 한정
  //       → ytcpAppHeaderSkipNavigation(헤더 skip-nav, viewport 밖)을 자동 제외
  for (let popupTry = 0; popupTry < 10; popupTry++) {
    // 방법 1: CSS 스코프 셀렉터 (다이얼로그 내부만)
    const popupBtn = page.locator(
      'ytcp-dialog button:has-text("다음"), ytcp-dialog button:has-text("Next"), ' +
      'ytcp-dialog button:has-text("건너뛰기"), ytcp-dialog button:has-text("Skip"), ' +
      'ytcp-dialog ytcp-button:has-text("다음"), ytcp-dialog ytcp-button:has-text("건너뛰기"), ' +
      '[role="dialog"] button:has-text("다음"), [role="dialog"] button:has-text("Next"), ' +
      '[role="dialog"] button:has-text("건너뛰기"), [role="dialog"] button:has-text("Skip")'
    ).filter({ visible: true });
    const cnt = await popupBtn.count();
    if (cnt > 0) {
      console.log(`[YouTube] 팝업 닫기 ${popupTry + 1}회 (CSS)`);
      await popupBtn.first().click({ force: true });
      await page.waitForTimeout(2000);
      continue;
    }
    // 방법 2: JS evaluate — ytcp-dialog[opened] 내 버튼 직접 탐색 (shadow DOM 우회)
    const dismissed = await page.evaluate(() => {
      const targets = ['다음', 'Next', '건너뛰기', 'Skip', '확인', 'OK'];
      const dialogs = document.querySelectorAll('ytcp-dialog[opened], [role="dialog"]');
      for (const dlg of dialogs) {
        for (const btn of dlg.querySelectorAll('button, ytcp-button')) {
          if (targets.includes(btn.textContent?.trim())) {
            btn.click();
            return btn.textContent.trim();
          }
        }
      }
      return null;
    });
    if (dismissed) {
      console.log(`[YouTube] 팝업 닫기 ${popupTry + 1}회 (JS: ${dismissed})`);
      await page.waitForTimeout(2000);
      continue;
    }
    break;
  }
  // 팝업 처리 후 안정화 대기 + 잔여 overlay 강제 제거
  await page.waitForTimeout(3000);
  await page.evaluate(() => {
    document.querySelectorAll('tp-yt-iron-overlay-backdrop').forEach(el => el.removeAttribute('opened'));
    document.querySelectorAll('ytcp-dialog[opened]').forEach(el => el.removeAttribute('opened'));
  });
  await page.screenshot({ path: path.join(ROOT, 'output', 'yt-after-popup.png') });
  console.log(`[YouTube] 팝업 처리 후 URL: ${page.url()}`);

  // Step 1: 업로드/만들기 버튼 클릭
  const uploadSelectors = [
    '#create-icon',                    // 만들기 버튼 (최우선)
    'ytcp-button#create-icon',
    '[aria-label="만들기"]',
    '[aria-label="Create"]',
    '#upload-icon',                    // 직접 업로드 아이콘 (구버전)
    'ytcp-button#upload-icon',
    '[aria-label="동영상 업로드"]',
    '[aria-label="Upload videos"]',
    '[aria-label="Upload"]',
    'ytcp-button:has-text("만들기")',
    'button:has-text("만들기")',
  ];
  let clicked = false;
  for (const sel of uploadSelectors) {
    try {
      const el = await page.waitForSelector(sel, { timeout: 8000 });
      await el.click();
      clicked = true;
      console.log(`[YouTube] 버튼 클릭 (${sel})`);
      break;
    } catch(e) {}
  }
  if (!clicked) {
    const shotPath = path.join(ROOT, 'output', 'yt-debug.png');
    await page.screenshot({ path: shotPath, fullPage: true });
    console.error(`[YouTube] 업로드 버튼 찾기 실패. 스크린샷: ${shotPath}`);
    await ctx.close();
    process.exit(1);
  }

  // Step 2: 버튼 클릭 후 항상 드롭다운 메뉴 체크 (2초 대기)
  // #upload-icon이든 #create-icon이든 드롭다운이 뜨는 경우가 있음
  await page.waitForTimeout(2000);
  try {
    const menuItem = page.locator(
      'tp-yt-paper-item:has-text("동영상 업로드"), ' +
      'tp-yt-paper-item:has-text("Upload video"), ' +
      'ytcp-ve:has-text("동영상 업로드"), ' +
      '[role="menuitem"]:has-text("동영상 업로드")'
    );
    if (await menuItem.count() > 0) {
      await menuItem.first().click({ force: true });
      console.log('[YouTube] 드롭다운 → 동영상 업로드 클릭');
      await page.waitForTimeout(2000);
    } else {
      console.log('[YouTube] 드롭다운 없음 — 업로드 다이얼로그 직접 열린 것으로 간주');
    }
  } catch(e) {}

  // Step 3: 업로드 다이얼로그 완전 로딩 대기
  // 스크린샷 (업로드 클릭 직후 상태 확인용)
  await page.screenshot({ path: path.join(ROOT, 'output', 'yt-after-upload-click.png') });
  console.log('[YouTube] 업로드 다이얼로그 스크린샷 저장: yt-after-upload-click.png');

  // 업로드 다이얼로그 파일 선택 영역 대기 (30초)
  const uploadDialogReady = await page.waitForSelector(
    'ytcp-upload-dialog input[type=file], ytcp-uploads-file-picker, input[type=file]',
    { timeout: 30000 }
  ).then(() => true).catch(() => {
    console.log('[YouTube] input[type=file] 30초 대기 타임아웃 — 강제 시도');
    return false;
  });
  console.log(`[YouTube] 업로드 다이얼로그 준비: ${uploadDialogReady}`);

  // 현재 file input 개수 출력 (진단용)
  const fileInputCount = await page.locator('input[type=file]').count();
  console.log(`[YouTube] input[type=file] 개수: ${fileInputCount}`);

  // Step 4: 파일 주입 — ytcp-upload-dialog 내 file input 우선, fallback
  let fileSet = false;
  try {
    // 업로드 다이얼로그 내 file input 우선 시도
    const dialogInput = page.locator('ytcp-upload-dialog input[type=file]');
    const dialogInputCount = await dialogInput.count();
    console.log(`[YouTube] 다이얼로그 내 input[type=file] 개수: ${dialogInputCount}`);
    if (dialogInputCount > 0) {
      await dialogInput.first().setInputFiles(videoPath, { timeout: 30000 });
    } else {
      await page.locator('input[type=file]').first().setInputFiles(videoPath, { timeout: 30000 });
    }
    fileSet = true;
    console.log('[YouTube] 파일 설정 완료 (setInputFiles 직접)');
  } catch (e1) {
    console.log(`[YouTube] setInputFiles 실패: ${e1.message.split('\n')[0]} — filechooser 시도`);
    try {
      const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser', { timeout: 15000 }),
        (async () => {
          const selectBtn = page.locator(
            '[aria-label="파일 선택"], [aria-label="SELECT FILES"], [aria-label="파일 선택하기"],' +
            'ytcp-button:has-text("파일 선택"), button:has-text("SELECT FILES")'
          );
          if (await selectBtn.count() > 0) {
            await selectBtn.first().click({ force: true });
          } else {
            await page.locator('input[type=file]').first().evaluate(el => el.click());
          }
        })(),
      ]);
      await fileChooser.setFiles(videoPath);
      fileSet = true;
      console.log('[YouTube] 파일 설정 완료 (filechooser 이벤트)');
    } catch (e2) {
      const shotPath = path.join(ROOT, 'output', 'yt-upload-debug.png');
      await page.screenshot({ path: shotPath, fullPage: true });
      console.error(`[YouTube] 파일 선택 완전 실패. 스크린샷: ${shotPath}`);
      console.error(`  1차: ${e1.message.split('\n')[0]}`);
      console.error(`  2차: ${e2.message.split('\n')[0]}`);
      await ctx.close();
      process.exit(1);
    }
  }
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
    await page.waitForSelector('ytcp-button#next-button', { timeout: 30000 });
    // tp-yt-iron-overlay-backdrop이 포인터 이벤트 차단 → JS로 제거 후 force 클릭
    await page.evaluate(() => {
      document.querySelectorAll('tp-yt-iron-overlay-backdrop').forEach(el => el.removeAttribute('opened'));
    });
    await page.click('ytcp-button#next-button', { force: true });
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
  // 공개 설정 전에도 backdrop 제거
  await page.evaluate(() => {
    document.querySelectorAll('tp-yt-iron-overlay-backdrop').forEach(el => el.removeAttribute('opened'));
  });
  await page.waitForTimeout(1000);

  // 공개 설정 — JS로 shadow DOM 포함 전체 탐색
  const publicClicked = await page.evaluate(() => {
    // 1) name="PUBLIC" 속성을 가진 radio button
    const byName = document.querySelector('tp-yt-paper-radio-button[name="PUBLIC"]');
    if (byName) { byName.click(); return 'byName'; }
    // 2) 텍스트로 찾기 (공개 / Public)
    const all = Array.from(document.querySelectorAll('tp-yt-paper-radio-button'));
    const byText = all.find(el => el.textContent.trim() === '공개' || el.textContent.trim() === 'Public');
    if (byText) { byText.click(); return 'byText'; }
    // 3) ytcp-privacy-dropdown 내 첫번째 라디오 (공개가 첫 항목)
    const inDropdown = document.querySelector('ytcp-privacy-dropdown tp-yt-paper-radio-button');
    if (inDropdown) { inDropdown.click(); return 'inDropdown'; }
    return null;
  });

  if (publicClicked) {
    console.log(`[YouTube] 공개 설정 완료 (${publicClicked})`);
  } else {
    const shotPath = path.join(ROOT, 'output', 'yt-public-debug.png');
    await page.screenshot({ path: shotPath, fullPage: true });
    console.error(`[YouTube] 공개 설정 버튼 못 찾음. 스크린샷: ${shotPath}`);
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
      await page.click(sel, { force: true });
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
