/**
 * FILO·DINE 홍보 영상 YouTube 자동 업로드
 * 실행: node upload-youtube.js
 * 필요: 기존 크롬 로그인 세션 (YouTube 로그인 상태)
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const USER_DATA_DIR = path.join(__dirname, '.youtube-session');
const VIDEO_FILE = path.join(__dirname, 'videos', 'filo_dine_promo.mp4');

const VIDEO_TITLE = 'FILO·DINE — 외식업 통합 운영 플랫폼 | QR주문·POS·키친디스플레이·출퇴근 올인원';
const VIDEO_DESC = `FILO·DINE은 외식업을 위한 통합 운영 플랫폼입니다.

✅ QR 테이블 주문 — 고객이 직접 스캔·주문·결제
✅ 선결제·후불 선택 — 토스페이먼츠 연동
✅ 키친 디스플레이 — 주방·홀 실시간 연동
✅ 직원 출퇴근 QR — 간편 출퇴근 관리
✅ POS 결제 — 현금·카드·간편결제 6종 지원

🔗 무료 체험: https://filo.ai.kr
📞 문의: kimdh4790@gmail.com

#외식업 #식당관리 #POS #QR주문 #키오스크 #매장관리 #FILODINE`;

const VIDEO_TAGS = 'FILO,DINE,외식업,POS,QR주문,키오스크,식당관리,매장관리,출퇴근,키친디스플레이';

async function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  if (!fs.existsSync(VIDEO_FILE)) {
    console.error('영상 파일 없음:', VIDEO_FILE);
    console.error('먼저 make-video.js를 실행하세요: node make-video.js');
    process.exit(1);
  }

  console.log('=== YouTube 업로드 시작 ===');
  console.log('파일:', VIDEO_FILE);
  console.log('세션 디렉토리:', USER_DATA_DIR);

  if (!fs.existsSync(USER_DATA_DIR)) fs.mkdirSync(USER_DATA_DIR, { recursive: true });

  const browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    args: ['--start-maximized', '--no-sandbox'],
    viewport: null,
    channel: 'chrome' // 실제 크롬 사용 (로그인 세션 공유)
  });

  const page = await browser.newPage();

  console.log('\nYouTube Studio 접속...');
  await page.goto('https://studio.youtube.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await wait(3000);

  // 로그인 확인
  const url = page.url();
  if (url.includes('accounts.google.com') || url.includes('signin')) {
    console.log('\n⚠️  YouTube 로그인이 필요합니다.');
    console.log('브라우저에서 Google 계정으로 로그인 후 계속하세요...');
    console.log('로그인 완료 후 Enter를 누르세요 (60초 대기)');
    await wait(60000);
  }

  // 업로드 버튼 클릭
  console.log('\n업로드 버튼 찾는 중...');
  try {
    // "만들기" 또는 업로드 버튼
    const createBtn = page.locator(
      'button[aria-label*="만들기"], button[aria-label*="Create"], #upload-btn, ytcp-button#create-icon, [test-id="upload-icon"]'
    ).first();
    await createBtn.waitFor({ timeout: 15000 });
    await createBtn.click();
    await wait(1500);

    // "동영상 업로드" 메뉴 항목
    const uploadMenuItem = page.locator(
      'tp-yt-paper-item:has-text("동영상 업로드"), tp-yt-paper-item:has-text("Upload video"), [test-id="upload-beta"]'
    ).first();
    if (await uploadMenuItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await uploadMenuItem.click();
      await wait(2000);
    }
  } catch (e) {
    console.log('만들기 버튼 못 찾음, 직접 업로드 URL 접속...');
    await page.goto('https://www.youtube.com/upload', { waitUntil: 'domcontentloaded' });
    await wait(3000);
  }

  // 파일 선택 input 찾기
  console.log('파일 업로드 중...');
  try {
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.waitFor({ timeout: 10000 });
    await fileInput.setInputFiles(VIDEO_FILE);
    console.log('파일 선택 완료, 업로드 대기...');
  } catch (e) {
    console.log('파일 input 못 찾음:', e.message);
    console.log('수동으로 파일을 선택해주세요:', VIDEO_FILE);
    await wait(30000);
  }

  // 업로드 진행 대기 (파일 크기에 따라 시간 소요)
  console.log('업로드 진행 중 (최대 3분 대기)...');
  await wait(10000);

  // 제목 입력
  console.log('제목 입력...');
  try {
    const titleInput = page.locator(
      '#textbox[aria-label*="제목"], #textbox[aria-label*="Title"], ytcp-social-suggestions-textbox #textbox'
    ).first();
    await titleInput.waitFor({ timeout: 20000 });
    await titleInput.click({ clickCount: 3 });
    await titleInput.fill(VIDEO_TITLE);
    await wait(1000);
    console.log('제목 입력 완료');
  } catch (e) {
    console.log('제목 입력 실패:', e.message);
  }

  // 설명 입력
  console.log('설명 입력...');
  try {
    const descInput = page.locator(
      '#description-textarea #textbox, [aria-label*="설명"], [aria-label*="Description"]'
    ).first();
    if (await descInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await descInput.click();
      await descInput.fill(VIDEO_DESC);
      await wait(1000);
      console.log('설명 입력 완료');
    }
  } catch (e) {
    console.log('설명 입력 실패:', e.message);
  }

  // 아동용 콘텐츠 아님 선택
  try {
    const notForKids = page.locator(
      'tp-yt-paper-radio-button[name="VIDEO_MADE_FOR_KIDS_NOT_MFK"], [name="NOT_MADE_FOR_KIDS"]'
    ).first();
    if (await notForKids.isVisible({ timeout: 5000 }).catch(() => false)) {
      await notForKids.click();
      await wait(500);
      console.log('아동용 아님 선택 완료');
    }
  } catch (e) {
    // 무시
  }

  // 다음 버튼들 (세부정보 → 요소 → 공개 설정)
  for (let step = 0; step < 3; step++) {
    console.log(`다음 단계 ${step + 1}/3...`);
    try {
      const nextBtn = page.locator(
        'ytcp-button#next-button, button:has-text("다음"), button:has-text("Next")'
      ).first();
      await nextBtn.waitFor({ timeout: 10000 });
      await nextBtn.click();
      await wait(2000);
    } catch (e) {
      console.log('다음 버튼 못 찾음:', e.message);
    }
  }

  // 공개 설정: 공개
  console.log('공개 설정...');
  try {
    const publicRadio = page.locator(
      'tp-yt-paper-radio-button[name="PUBLIC"], [name="PUBLIC"]'
    ).first();
    if (await publicRadio.isVisible({ timeout: 8000 }).catch(() => false)) {
      await publicRadio.click();
      await wait(1000);
      console.log('공개 선택 완료');
    }
  } catch (e) {
    console.log('공개 설정 실패:', e.message);
  }

  // 업로드 완료 대기 및 게시 버튼
  console.log('\n게시 버튼 대기 중 (업로드 완료 필요)...');
  let published = false;
  for (let i = 0; i < 24; i++) { // 최대 4분
    await wait(10000);
    try {
      const publishBtn = page.locator(
        'ytcp-button#done-button:not([disabled]), button:has-text("게시"):not([disabled]), button:has-text("Save"):not([disabled])'
      ).first();
      const isReady = await publishBtn.isEnabled({ timeout: 2000 }).catch(() => false);
      if (isReady) {
        console.log('게시 버튼 활성화 — 게시 중...');
        await publishBtn.click();
        await wait(5000);
        published = true;
        break;
      }
      process.stdout.write('.');
    } catch (e) {
      process.stdout.write('.');
    }
  }

  if (published) {
    console.log('\n\n=== YouTube 업로드 완료 ===');
    // 업로드된 URL 확인
    try {
      const videoLink = page.locator('a[href*="youtube.com/watch"]').first();
      const href = await videoLink.getAttribute('href', { timeout: 5000 }).catch(() => null);
      if (href) console.log('영상 URL:', href);
    } catch (e) {
      // 무시
    }
    await page.screenshot({ path: path.join(__dirname, 'videos', 'youtube-upload-done.png') });
    console.log('스크린샷: videos/youtube-upload-done.png');
  } else {
    console.log('\n\n⚠️  업로드 시간 초과 — 브라우저를 직접 확인하세요');
    await page.screenshot({ path: path.join(__dirname, 'videos', 'youtube-upload-timeout.png') });
  }

  await wait(5000);
  await browser.close();
}

main().catch(e => { console.error('오류:', e.message); process.exit(1); });
