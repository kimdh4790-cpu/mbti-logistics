/**
 * 네이버 로그인 세션 저장 스크립트
 * - 비밀번호는 절대 코드에 저장하지 않음
 * - 사용자가 브라우저에서 직접 로그인 후 세션만 persistentContext로 보존
 * Usage: npm run login
 */
const { chromium } = require('playwright');
const path = require('path');
const readline = require('readline');

const PROFILE_DIR = path.join(__dirname, '..', 'naver-profile');

function waitEnter() {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('\n✅ 로그인이 완료되면 Enter를 누르세요: ', () => {
      rl.close();
      resolve();
    });
  });
}

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

  console.log('📋 브라우저에서 네이버 로그인을 완료해 주세요.');
  console.log('   (비밀번호는 브라우저에서만 — 여기에 입력하지 마세요)');

  await waitEnter();

  // 로그인 확인
  await page.goto('https://blog.naver.com', { waitUntil: 'networkidle' });
  const title = await page.title();
  const ok = title.includes('네이버 블로그') || await page.$('.MyBlog_link__');

  if (ok) {
    console.log('\n✅ 로그인 세션 저장 완료!');
    console.log('   이제 npm run draft -- --draft drafts/파일.json 으로 글을 작성하세요.');
  } else {
    console.log('\n⚠️  로그인 상태 확인 실패. 다시 시도하거나 probe 스크립트로 DOM 확인하세요.');
  }

  await context.close();
  process.exit(0);
})();
