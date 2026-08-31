/**
 * 네이버 로그인 세션 저장 스크립트
 * - 비밀번호는 절대 코드에 저장하지 않음
 * - 브라우저에서 로그인 완료 자동 감지 후 세션 저장
 * Usage: npm run login
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const PROFILE_DIR = path.join(__dirname, '..', 'naver-profile');

(async () => {
  console.log('📂 세션 폴더:', PROFILE_DIR);
  console.log('🌐 브라우저를 열고 있습니다...\n');

  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    viewport: { width: 1600, height: 1000 },
    locale: 'ko-KR',
  });

  const page = context.pages()[0] || await context.newPage();
  await page.goto('https://nid.naver.com/nidlogin.login', { waitUntil: 'networkidle' });

  console.log('📋 브라우저 창에서 네이버에 로그인해 주세요.');
  console.log('   (비밀번호는 브라우저에만 입력 — 여기에 입력하지 마세요)');
  console.log('   ⏳ 로그인 완료되면 자동으로 감지합니다...\n');

  // 로그인 완료 자동 감지 (최대 3분)
  let loggedIn = false;
  for (let i = 0; i < 36; i++) {
    await page.waitForTimeout(5000);
    const url = page.url();
    // 로그인 성공 시 네이버 메인 또는 블로그로 이동됨
    if (!url.includes('nid.naver.com') && !url.includes('nidlogin')) {
      loggedIn = true;
      break;
    }
    process.stdout.write(`\r   ⏳ 대기 중... (${(i + 1) * 5}초)`);
  }

  console.log('');

  if (!loggedIn) {
    console.error('\n❌ 3분 내에 로그인이 감지되지 않았습니다. 다시 시도하세요.');
    await context.close();
    process.exit(1);
  }

  // 블로그 접근 확인
  await page.goto('https://blog.naver.com', { waitUntil: 'networkidle', timeout: 15000 })
    .catch(() => {});

  // 쿠키 JSON 저장 (Oracle VM 등 타 OS에서 사용)
  const cookies = await context.cookies(['https://naver.com', 'https://blog.naver.com', 'https://nid.naver.com']);
  const cookiesFile = path.join(PROFILE_DIR, 'cookies.json');
  fs.writeFileSync(cookiesFile, JSON.stringify(cookies, null, 2));

  console.log('\n✅ 로그인 세션 저장 완료!');
  console.log('   쿠키 파일:', cookiesFile);
  console.log('   이제 다음 명령으로 글을 작성하세요:');
  console.log('   node scripts/naver_draft.js --draft drafts/파일.json --dry-run');

  await context.close();
  process.exit(0);
})();
