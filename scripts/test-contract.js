// 로컬 PC에서 실행: node scripts/test-contract.js
// 필요: npm install playwright (로컬에만)
// 첫 실행 시 로그인 세션 저장 → 이후 자동 로그인

const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const profileDir = path.join(__dirname, '.pw-profile');

  const ctx = await chromium.launchPersistentContext(profileDir, {
    headless: false,
    slowMo: 400,
    viewport: { width: 390, height: 844 },
    executablePath: process.env.CHROMIUM_PATH || undefined,
  });

  const page = await ctx.newPage();

  // 1. settle.html 접속
  console.log('1. settle.html 접속...');
  await page.goto('https://donway.ai.kr/settle');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'scripts/step1-settle.png' });
  console.log('   step1-settle.png 저장됨');

  // 2. 로그인 화면 확인
  const loginScreen = page.locator('#login-screen');
  const isLoginVisible = await loginScreen.isVisible().catch(() => false);

  if (isLoginVisible) {
    console.log('2. 로그인 화면 감지 — 이메일 로그인 탭 선택...');
    // 이메일 탭이 기본 선택 상태지만 확인
    const emailTab = page.locator('#login-tab-email');
    if (await emailTab.count()) await emailTab.click();
    await page.waitForTimeout(300);

    // ID/PW 입력
    await page.fill('#l-email', 'soungkyekim@naver.com');
    await page.fill('#l-pw', 'khw3103!!!');
    await page.screenshot({ path: 'scripts/step2-login-filled.png' });
    console.log('   step2-login-filled.png 저장됨');

    // 로그인 버튼 클릭
    await page.click('#btn-login-submit');
    console.log('   로그인 버튼 클릭 — Firebase 인증 대기...');
    await page.waitForTimeout(6000);
    await page.screenshot({ path: 'scripts/step3-after-login.png' });
    console.log('   step3-after-login.png 저장됨');
  } else {
    console.log('2. 이미 로그인 상태 (세션 유지됨)');
    await page.screenshot({ path: 'scripts/step2-already-logged-in.png' });
  }

  // 3. contract 페이지 이동
  console.log('3. 계약서 페이지 이동...');
  await page.goto('https://donway.ai.kr/contract');
  await page.waitForTimeout(4000);
  await page.screenshot({ path: 'scripts/step3-contract.png' });
  console.log('   step3-contract.png 저장됨');

  // 로그인 화면으로 리다이렉트됐는지 확인
  const contractLoginVisible = await page.locator('#login-screen').isVisible().catch(() => false);
  if (contractLoginVisible) {
    console.log('   ⚠️ 계약서 페이지에서도 로그인 화면 — 재로그인 시도');
    await page.fill('#l-email', 'soungkyekim@naver.com');
    await page.fill('#l-pw', 'khw3103!!!');
    await page.click('#btn-login-submit');
    await page.waitForTimeout(5000);
    await page.goto('https://donway.ai.kr/contract');
    await page.waitForTimeout(4000);
  }

  // 4. 위수탁 계약 선택
  console.log('4. 영업점-택배기사 위수탁 선택...');
  const courierBtn = page.locator('text=영업점-택배기사 위수탁');
  if (await courierBtn.count()) {
    await courierBtn.first().click();
    await page.waitForTimeout(1000);
  } else {
    console.log('   ⚠️ 위수탁 버튼 없음 — 현재 URL:', page.url());
  }
  await page.screenshot({ path: 'scripts/step4-type-selected.png' });
  console.log('   step4-type-selected.png 저장됨');

  // 5. 기사 드롭다운에서 실제 기사 선택
  console.log('5. 등록된 기사 선택...');
  const drvSelect = page.locator('#drv-select');
  if (await drvSelect.count()) {
    const options = await drvSelect.locator('option').all();
    console.log('   등록된 기사 수:', options.length - 1, '명'); // -1 for placeholder

    if (options.length > 1) {
      const firstDriverVal = await options[1].getAttribute('value');
      const firstDriverText = await options[1].textContent();
      console.log('   선택:', firstDriverText?.trim());
      await drvSelect.selectOption(firstDriverVal || '');
      await page.waitForTimeout(800);

      // fillDriver() 호출로 폼 자동완성
      await page.evaluate(() => { if(typeof fillDriver === 'function') fillDriver(); });
      await page.waitForTimeout(800);
    } else {
      console.log('   ⚠️ 등록된 기사 없음 (Firebase 인증 미완료 가능성)');
    }
  } else {
    console.log('   ⚠️ #drv-select 없음');
  }

  // 계약시작일 입력
  const startInput = page.locator('#c-start');
  if (await startInput.count()) {
    await startInput.fill('2026-08-13');
  }

  // 특약사항
  const specialInput = page.locator('#c-special');
  if (await specialInput.count()) {
    await specialInput.fill('계약기간 중 일방적 해지 시 위약금 없음');
  }

  await page.waitForTimeout(500);
  await page.screenshot({ path: 'scripts/step5-filled.png', fullPage: true });
  console.log('   step5-filled.png 저장됨');

  console.log('\n✅ 완료.');
  console.log('스크린샷 파일들: scripts/step1-settle.png ~ step5-filled.png');
  console.log('OTP 발송은 스크립트 하단 주석 해제 후 재실행하세요.');

  await page.waitForTimeout(4000);
  await ctx.close();
})();
