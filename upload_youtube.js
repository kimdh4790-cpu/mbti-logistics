/**
 * YouTube Studio 자동 업로드 스크립트
 * 실행: node upload_youtube.js
 * 요구사항: npm install playwright (로컬 PC에서만 실행)
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const VIDEO_PATH = path.resolve(__dirname, 'mbti_intro.mp4');
const VIDEO_TITLE = 'MBTICO 소개 영상';
// 기존 Chrome 로그인 세션 경로 (Windows 기준)
const USER_DATA_DIR = process.env.CHROME_PROFILE ||
  (process.platform === 'win32'
    ? `${process.env.LOCALAPPDATA}\\Google\\Chrome\\User Data`
    : `${process.env.HOME}/.config/google-chrome`);

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function uploadToYouTube() {
  if (!fs.existsSync(VIDEO_PATH)) {
    console.error(`파일 없음: ${VIDEO_PATH}`);
    process.exit(1);
  }

  const stat = fs.statSync(VIDEO_PATH);
  console.log(`업로드 파일: ${VIDEO_PATH} (${(stat.size / 1024).toFixed(1)}KB)`);
  console.log(`Chrome 프로필: ${USER_DATA_DIR}`);

  const browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    channel: 'chrome',
    args: [
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--lang=ko-KR',
    ],
    viewport: { width: 1280, height: 800 },
    locale: 'ko-KR',
    ignoreDefaultArgs: ['--enable-automation'],
  });

  const page = await browser.newPage();

  try {
    console.log('YouTube Studio 접속 중...');
    await page.goto('https://studio.youtube.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(3000);

    const url = page.url();
    console.log(`현재 URL: ${url}`);

    if (url.includes('accounts.google.com')) {
      console.error('Google 로그인이 필요합니다. 브라우저에서 수동 로그인 후 재실행하세요.');
      await sleep(60000);
      await browser.close();
      process.exit(1);
    }

    console.log('YouTube Studio 로드 완료. 업로드 버튼 탐색 중...');
    await sleep(2000);

    // 만들기(업로드) 버튼 클릭
    const uploadBtn = page.locator('#upload-icon, [aria-label="만들기"], [aria-label="Create"], ytcp-button#create-icon').first();
    await uploadBtn.waitFor({ state: 'visible', timeout: 15000 });
    await uploadBtn.click();
    console.log('만들기 버튼 클릭');
    await sleep(1500);

    // "동영상 업로드" 메뉴 클릭
    const uploadVideoMenu = page.locator('tp-yt-paper-item:has-text("동영상 업로드"), tp-yt-paper-item:has-text("Upload video")').first();
    await uploadVideoMenu.waitFor({ state: 'visible', timeout: 10000 });
    await uploadVideoMenu.click();
    console.log('동영상 업로드 메뉴 클릭');
    await sleep(2000);

    // 파일 선택
    const fileInput = page.locator('input[type="file"]');
    await fileInput.waitFor({ timeout: 15000 });
    await fileInput.setInputFiles(VIDEO_PATH);
    console.log('파일 선택 완료, 업로드 중...');

    // 업로드 진행 대기 (제목 입력 폼 등장)
    await page.waitForSelector('#title-textarea, ytcp-video-title', { timeout: 90000 });
    console.log('업로드 폼 로드됨. 제목 입력 중...');
    await sleep(1500);

    // 제목 입력
    const titleField = page.locator('#title-textarea #textbox, ytcp-video-title #textbox').first();
    await titleField.waitFor({ state: 'visible', timeout: 15000 });
    await titleField.click({ clickCount: 3 });
    await titleField.fill(VIDEO_TITLE);
    console.log(`제목 입력 완료: ${VIDEO_TITLE}`);
    await sleep(1000);

    // 다음 버튼 3회 클릭 (세부정보 → 동영상 요소 → 검토 → 공개 설정)
    for (let step = 1; step <= 3; step++) {
      const nextBtn = page.locator('#next-button').first();
      await nextBtn.waitFor({ state: 'visible', timeout: 15000 });
      await nextBtn.click();
      console.log(`다음 버튼 ${step}/3 클릭`);
      await sleep(2000);
    }

    // 공개 설정 - "공개" 선택
    console.log('공개 설정 중...');
    await sleep(1500);
    const publicRadio = page.locator('tp-yt-paper-radio-button[name="PUBLIC"]').first();
    if (await publicRadio.count() > 0) {
      await publicRadio.click();
      console.log('공개 설정 선택');
      await sleep(1000);
    }

    // 게시 버튼 클릭
    const publishBtn = page.locator('#done-button').first();
    await publishBtn.waitFor({ state: 'visible', timeout: 15000 });
    await publishBtn.click();
    console.log('게시 버튼 클릭!');

    await sleep(8000);
    console.log('최종 URL:', page.url());
    console.log('=== 업로드 완료 ===');

  } catch (err) {
    console.error('오류 발생:', err.message);
    const ssPath = path.join(__dirname, 'youtube-upload-error.png');
    await page.screenshot({ path: ssPath, fullPage: true });
    console.log('오류 스크린샷:', ssPath);
  } finally {
    await sleep(3000);
    await browser.close();
  }
}

uploadToYouTube().catch(console.error);
