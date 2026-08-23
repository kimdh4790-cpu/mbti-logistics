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
const headless = !loginOnly;

const ROOT = path.join(__dirname, '../..');
const meta = require(`../content/${product}-meta.json`);
const videoPath = path.join(ROOT, 'output', `${product}-promo.mp4`);

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

  // 업로드 버튼 — 여러 셀렉터 시도
  const uploadSelectors = [
    'ytcp-button#upload-icon',
    '#upload-icon',
    '[aria-label="동영상 업로드"]',
    '[aria-label="Upload videos"]',
    '[aria-label="Create"]',
    'ytcp-icon-button[id="upload-icon"]',
    'button:has-text("업로드")',
  ];
  let clicked = false;
  for (const sel of uploadSelectors) {
    try {
      await page.waitForSelector(sel, { timeout: 5000 });
      await page.click(sel);
      clicked = true;
      console.log(`[YouTube] 업로드 버튼 클릭 (${sel})`);
      break;
    } catch(e) { /* 다음 셀렉터 시도 */ }
  }
  if (!clicked) {
    // 스크린샷 저장 후 종료
    const shotPath = path.join(ROOT, 'output', 'yt-debug.png');
    await page.screenshot({ path: shotPath });
    console.error(`[YouTube] 업로드 버튼을 찾을 수 없음. 스크린샷: ${shotPath}`);
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
  await page.click(titleSel);
  await page.keyboard.press('Control+a');
  await page.keyboard.type(meta.youtube.title);

  // 설명 입력
  const descSel = '#description-textarea, ytcp-mention-textbox[label="설명"], ytcp-mention-textbox[label="Description"]';
  await page.click(descSel);
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
