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

  // 로그인 확인 (studio.youtube.com으로 확인 — accounts.google.com은 IP 변경 시 /signin 리다이렉트)
  await page.goto('https://studio.youtube.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  const url = page.url();
  const isLoggedIn = url.includes('studio.youtube.com') && !url.includes('/oops') && !url.includes('/signin');

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

  // 팝업 완전 제거 함수
  // 우선순위: ①닫기/X/나중에(dismiss) → ②ESC → ③YouTube wizard 전진
  async function dismissPopups(label, maxRounds) {
    for (let i = 0; i < maxRounds; i++) {
      await page.waitForTimeout(800);

      // ① dismiss: 닫기/X/나중에/건너뛰기/취소 — 팝업 자체를 닫음
      const dismissed = await page.evaluate(() => {
        const dismissTexts = ['나중에', 'Later', '지금 아님', 'Not now',
          '닫기', 'Close', '취소', 'Cancel', '아니요', 'No'];
        // Google Material 닫기 아이콘 버튼 (aria-label 기반)
        const closeBtns = document.querySelectorAll(
          '[aria-label="닫기"], [aria-label="Close"], [aria-label="Dismiss"],' +
          '[jsname="tygKHd"], .VfPpkd-dgl2Hf-ppHlrf-sM5MNb button,' +
          '[data-dismiss="modal"]'
        );
        for (const btn of closeBtns) {
          if (btn.offsetParent !== null) { btn.click(); return `X:${btn.ariaLabel||btn.className}`; }
        }
        // 텍스트 기반 dismiss 버튼 (모든 button 요소)
        const allBtns = document.querySelectorAll('button, tp-yt-paper-button');
        for (const btn of allBtns) {
          const txt = btn.textContent?.trim();
          if (dismissTexts.includes(txt) && btn.offsetParent !== null) {
            btn.click(); return `dismiss:${txt}`;
          }
        }
        return null;
      });
      if (dismissed) {
        console.log(`[YouTube][${label}] 팝업 dismiss ${i+1}회 (${dismissed})`);
        await page.waitForTimeout(1500);
        continue;
      }

      // ② 보이는 dialog가 있으면 ESC
      const hasDialog = await page.evaluate(() => {
        const dlgs = document.querySelectorAll('[role="dialog"], ytcp-dialog[opened], .VfPpkd-xl07Ob-XxIAqe');
        return [...dlgs].some(d => d.offsetParent !== null && !d.hidden);
      });
      if (hasDialog) {
        await page.keyboard.press('Escape');
        console.log(`[YouTube][${label}] ESC ${i+1}회`);
        await page.waitForTimeout(1200);
        continue;
      }

      // ③ YouTube Studio wizard 전진 (건너뛰기 / 다음) — ytcp-dialog 스코프만
      const wizardBtn = page.locator(
        'ytcp-dialog ytcp-button:has-text("건너뛰기"), ytcp-dialog ytcp-button:has-text("Skip"), ' +
        'ytcp-dialog ytcp-button:has-text("다음"), ytcp-dialog ytcp-button:has-text("Next"), ' +
        '[role="dialog"] ytcp-button:has-text("건너뛰기"), [role="dialog"] ytcp-button:has-text("Skip")'
      ).filter({ visible: true });
      if (await wizardBtn.count() > 0) {
        await wizardBtn.first().click({ force: true });
        console.log(`[YouTube][${label}] wizard 전진 ${i+1}회`);
        await page.waitForTimeout(1500);
        continue;
      }

      console.log(`[YouTube][${label}] 팝업 없음 → 완료 (${i+1}회)`);
      break;
    }
  }

  await dismissPopups('init', 20);

  // 팝업 처리 후 잔여 overlay 강제 제거
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
  const titleSel = 'ytcp-mention-textbox[label="제목"], ytcp-mention-textbox[label="Title"], #title-textarea';
  await page.waitForSelector(titleSel, { timeout: 60000 });
  await page.waitForTimeout(2000);

  // ytcp-mention-textbox 내부 contenteditable에 execCommand로 직접 입력
  // (shadow DOM 내부 focus 문제 우회)
  const titleEntered = await page.evaluate((title) => {
    const comps = [
      document.querySelector('ytcp-mention-textbox[label="제목"]'),
      document.querySelector('ytcp-mention-textbox[label="Title"]'),
      document.querySelector('#title-textarea'),
    ].filter(Boolean);
    for (const comp of comps) {
      const tb = comp.querySelector('[contenteditable]') ||
                 (comp.shadowRoot && comp.shadowRoot.querySelector('[contenteditable]'));
      if (tb) {
        tb.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, title);
        return true;
      }
    }
    // fallback: 직접 click + type
    return false;
  }, meta.youtube.title);

  if (!titleEntered) {
    // fallback: click + triple-click select + type
    await page.locator(titleSel).first().click({ force: true, clickCount: 3 });
    await page.waitForTimeout(300);
    await page.keyboard.type(meta.youtube.title, { delay: 30 });
  }
  console.log(`[YouTube] 제목 입력 완료 (execCommand:${titleEntered}): "${meta.youtube.title}"`);
  await page.waitForTimeout(500);

  // 설명 입력
  const descSel = 'ytcp-mention-textbox[label="설명"], ytcp-mention-textbox[label="Description"], #description-textarea';
  const descEntered = await page.evaluate((desc) => {
    const comps = [
      document.querySelector('ytcp-mention-textbox[label="설명"]'),
      document.querySelector('ytcp-mention-textbox[label="Description"]'),
      document.querySelector('#description-textarea'),
    ].filter(Boolean);
    for (const comp of comps) {
      const tb = comp.querySelector('[contenteditable]') ||
                 (comp.shadowRoot && comp.shadowRoot.querySelector('[contenteditable]'));
      if (tb) {
        tb.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, desc);
        return true;
      }
    }
    return false;
  }, meta.youtube.description);

  if (!descEntered) {
    await page.locator(descSel).first().click({ force: true, clickCount: 3 });
    await page.waitForTimeout(300);
    await page.keyboard.type(meta.youtube.description, { delay: 10 });
  }
  console.log(`[YouTube] 설명 입력 완료 (execCommand:${descEntered})`);

  // 제목+설명 입력 후 스크린샷
  await page.screenshot({ path: path.join(ROOT, 'output', 'yt-after-meta.png') });
  await page.waitForTimeout(500);

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

  // 다음 버튼 정확히 3회 (세부정보→동영상요소→검토→공개설정)
  // 핵심: disabled 상태의 next-button에 force:true 클릭 → wizard 안 넘어감
  // → enabled 될 때까지 폴링 후 정상 클릭
  for (let i = 0; i < 3; i++) {
    // next-button enabled 될 때까지 최대 40초 대기
    // 스텝 전환 중 버튼이 잠시 사라지는 경우 있음 → 3회 연속 없을 때만 종료
    let nextReady = false;
    let missingCount = 0;
    for (let ni = 0; ni < 20; ni++) {
      const state = await page.evaluate(() => {
        const btn = document.querySelector('ytcp-button#next-button');
        if (!btn) return { exists: false, disabled: true };
        const disabled = btn.hasAttribute('disabled') ||
          btn.classList.contains('disabled') ||
          (btn.shadowRoot && btn.shadowRoot.querySelector('[disabled]') !== null);
        return { exists: true, disabled };
      });
      if (!state.exists) {
        missingCount++;
        if (missingCount >= 3) {
          console.log(`[YouTube] next-button 지속 없음 (${i+1}번째, ${ni}번) — 종료`);
          break;
        }
        console.log(`[YouTube] next-button 잠시 없음 (${i+1}번째, ${ni}번) — 스텝 전환 대기`);
        await page.waitForTimeout(2000);
        continue;
      }
      missingCount = 0;
      if (!state.disabled) { nextReady = true; break; }
      console.log(`[YouTube] next-button 활성화 대기 ${i+1}/3 ... (${ni*2}s)`);
      await page.waitForTimeout(2000);
    }
    if (!nextReady) break;

    await page.evaluate(() => {
      document.querySelectorAll('tp-yt-iron-overlay-backdrop').forEach(el => el.removeAttribute('opened'));
    });
    try {
      await page.click('ytcp-button#next-button');
    } catch(e) {
      await page.click('ytcp-button#next-button', { force: true });
    }
    console.log(`[YouTube] 다음 버튼 ${i + 1}/3`);
    await page.waitForTimeout(5000);
  }

  // 공개설정 페이지 렌더링 대기 + 스크린샷
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(ROOT, 'output', 'yt-visibility-page.png'), fullPage: true });

  // 모든 radio button 텍스트 + visible 상태 로깅 (디버깅용)
  const radioInfo = await page.evaluate(() => {
    const radios = Array.from(document.querySelectorAll('tp-yt-paper-radio-button'));
    return radios.map((r, i) => {
      const style = window.getComputedStyle(r);
      const rect = r.getBoundingClientRect();
      return `[${i}]"${r.textContent.trim().slice(0,15)}" display:${style.display} h:${Math.round(rect.height)}`;
    }).join(' | ');
  });
  console.log(`[YouTube] 라디오 목록: ${radioInfo}`);

  // backdrop 제거
  await page.evaluate(() => {
    document.querySelectorAll('tp-yt-iron-overlay-backdrop').forEach(el => el.removeAttribute('opened'));
  });

  // 공개 설정 선택
  // 핵심: YouTube SPA는 모든 스텝 라디오(아동용 포함)를 DOM에 유지
  // → 텍스트로 "공개"/"Public" 시작하는 것만 선택 (아동용/비공개/일부공개 제외)
  let publicClicked = false;

  // 1단계: name="PUBLIC" (YouTube Studio 표준 속성 — visibility 페이지 도달 시 존재)
  if (!publicClicked) {
    for (const sel of [
      'tp-yt-paper-radio-button[name="PUBLIC"]',
      'tp-yt-paper-radio-button[name="public"]',
      '[name="PUBLIC"]',
      '[name="public"]',
    ]) {
      try {
        const el = await page.waitForSelector(sel, { timeout: 4000 });
        if (el) {
          await page.click(sel, { force: true });
          publicClicked = true;
          console.log(`[YouTube] 공개 설정 완료 (name 속성: ${sel})`);
          break;
        }
      } catch(e) {}
    }
  }

  // 2단계: 텍스트가 "공개" 또는 "Public"으로 시작하는 visible radio
  // "비공개"는 "비"로 시작, "일부 공개"는 "일"로 시작 → /^공개/ 로 정확히 구분
  if (!publicClicked) {
    for (const pattern of [/^공개/, /^Public/]) {
      try {
        const loc = page.locator('tp-yt-paper-radio-button').filter({ hasText: pattern });
        const cnt = await loc.count();
        console.log(`[YouTube] "${pattern}" 매칭 radio 개수: ${cnt}`);
        if (cnt > 0) {
          for (let ri = 0; ri < cnt; ri++) {
            const r = loc.nth(ri);
            if (await r.isVisible()) {
              const t = await r.textContent();
              await r.click({ force: true });
              publicClicked = true;
              console.log(`[YouTube] 공개 설정 완료 (hasText+visible: "${t?.trim().slice(0,15)}")`);
              break;
            }
          }
          if (publicClicked) break;
        }
      } catch(e) {}
    }
  }

  // 3단계: visible radio 전체 순회 → 아동용 키워드 제외하고 공개 키워드 포함 선택
  if (!publicClicked) {
    const allRadios = page.locator('tp-yt-paper-radio-button');
    const cnt = await allRadios.count();
    for (let ri = 0; ri < cnt; ri++) {
      const r = allRadios.nth(ri);
      if (!await r.isVisible()) continue;
      const t = (await r.textContent() || '').trim();
      console.log(`[YouTube] 순회 radio[${ri}]: "${t.slice(0,20)}"`);
      if ((t.startsWith('공개') || t.startsWith('Public')) && !t.includes('아동')) {
        await r.click({ force: true });
        publicClicked = true;
        console.log(`[YouTube] 공개 설정 완료 (순회 radio[${ri}]: "${t.slice(0,15)}")`);
        break;
      }
    }
  }

  if (!publicClicked) {
    const shotPath = path.join(ROOT, 'output', 'yt-public-debug.png');
    await page.screenshot({ path: shotPath, fullPage: true });
    // DOM 스냅샷으로 현재 상태 기록
    const domSnap = await page.evaluate(() => {
      const els = ['ytcp-video-visibility-select', 'ytcp-privacy-dropdown',
        '#privacy-radios', 'tp-yt-paper-radio-button', 'ytcp-button#done-button', 'ytcp-button#next-button'];
      return els.map(s => `${s}: ${document.querySelectorAll(s).length}`).join(', ');
    });
    console.error(`[YouTube] 공개 설정 버튼 못 찾음. DOM: {${domSnap}}`);
    console.error(`[YouTube] 스크린샷: ${shotPath}`);
  }
  await page.waitForTimeout(1000);

  // 게시 — done-button이 enabled 상태가 될 때까지 대기 (disabled 상태에서 force 클릭하면 YouTube가 다이얼로그 닫음)
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ROOT, 'output', 'yt-before-publish.png'), fullPage: true });

  // done-button disabled 해제 대기 (최대 3분)
  // Playwright isDisabled()는 Polymer web component의 disabled 속성을 직접 읽어서 evaluate()보다 신뢰도 높음
  let doneEnabled = false;
  const doneLocator = page.locator('ytcp-button#done-button');
  for (let di = 0; di < 90; di++) {
    const disabled = await doneLocator.isDisabled().catch(() => true);
    if (!disabled) { doneEnabled = true; break; }
    if (di % 5 === 0) console.log(`[YouTube] done-button 활성화 대기... (${di * 2}s / 180s)`);
    await page.waitForTimeout(2000);
  }
  if (!doneEnabled) {
    console.log('[YouTube] done-button 3분 후에도 disabled — 강제 진행');
  } else {
    console.log('[YouTube] done-button 활성화 확인 — 게시 진행');
  }

  // 게시 클릭 (done-button 직접 클릭, disabled 여부 무관)
  let doneClicked = false;
  try {
    // done-button은 항상 ytcp-button#done-button
    await page.waitForSelector('ytcp-button#done-button', { timeout: 5000 });
    // force: false 우선 시도 (disabled이면 오류 발생 → 아래 force로 재시도)
    try {
      await page.click('ytcp-button#done-button');
      doneClicked = true;
      console.log('[YouTube] 게시 버튼 클릭 (done-button, 정상)');
    } catch(e) {
      await page.click('ytcp-button#done-button', { force: true });
      doneClicked = true;
      console.log('[YouTube] 게시 버튼 클릭 (done-button, force)');
    }
  } catch(e) {
    // done-button 없으면 aria-label 시도
    try {
      await page.click('[aria-label="게시"]');
      doneClicked = true;
      console.log('[YouTube] 게시 버튼 클릭 (aria-label=게시)');
    } catch(e2) {}
  }
  if (!doneClicked) {
    const shotPath = path.join(ROOT, 'output', 'yt-done-debug.png');
    await page.screenshot({ path: shotPath, fullPage: true });
    console.error(`[YouTube] 게시 버튼 못 찾음. 스크린샷: ${shotPath}`);
    await ctx.close();
    process.exit(1);
  }

  // 게시 완료 확인 — 업로드 다이얼로그가 DOM에서 제거되면 성공
  // 최대 2회 재시도: 게시 클릭 후 팝업이 다시 뜨는 경우 dismiss 후 재게시
  let publishConfirmed = false;
  for (let pubTry = 0; pubTry < 2; pubTry++) {
    try {
      await page.waitForSelector('ytcp-upload-dialog', { state: 'detached', timeout: 15000 });
      publishConfirmed = true;
      console.log(`[YouTube] 업로드 다이얼로그 닫힘 → 게시 완료. URL: ${page.url()}`);
      break;
    } catch(e) {
      // 15초 내 dialog detach 안 됨 → 팝업 새로 뜬 것 처리 후 재게시
      await page.screenshot({ path: path.join(ROOT, 'output', `yt-publish-wait-${pubTry}.png`) });
      console.log(`[YouTube] 게시 대기 ${pubTry+1}회 타임아웃 → 팝업 처리 후 재게시`);
      await dismissPopups(`publish-${pubTry}`, 10);
      // backdrop 강제 제거
      await page.evaluate(() => {
        document.querySelectorAll('tp-yt-iron-overlay-backdrop').forEach(el => el.removeAttribute('opened'));
      });
      await page.waitForTimeout(1000);
      // done-button 재클릭
      try {
        await page.click('ytcp-button#done-button', { force: true });
        console.log(`[YouTube] 게시 버튼 재클릭 ${pubTry+1}회`);
      } catch(e2) {
        try { await page.click('[aria-label="게시"]', { force: true }); } catch(e3) {}
      }
      await page.waitForTimeout(3000);
    }
  }

  if (!publishConfirmed) {
    // 최종: URL 또는 dialog 부재로 성공 여부 판단
    const finalUrl = page.url();
    console.log(`[YouTube] 게시 후 URL: ${finalUrl}`);
    const dialogGone = await page.locator('ytcp-upload-dialog').count() === 0;
    if (dialogGone || finalUrl.includes('/video/') || !finalUrl.includes('channel')) {
      publishConfirmed = true;
    }
  }

  // 최종 스크린샷
  await page.screenshot({ path: path.join(ROOT, 'output', 'yt-publish-result.png'), fullPage: true });

  if (publishConfirmed) {
    console.log('[YouTube] 업로드 완료! (게시 확인됨)');
  } else {
    console.error('[YouTube] 경고: 게시 완료 확인 안됨. Studio → 콘텐츠에서 직접 확인하세요.');
    console.error(`[YouTube] 현재 URL: ${page.url()}`);
    process.exit(1);
  }

  await page.waitForTimeout(3000);
  await ctx.close();
}

uploadYouTube().catch(console.error);
