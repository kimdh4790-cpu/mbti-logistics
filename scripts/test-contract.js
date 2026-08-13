// 로컬 PC에서 실행: node scripts/test-contract.js
// 필요: npm install playwright (로컬에만)

const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();

  // 1. settle.html에 로그인
  console.log('1. DONWAY 로그인...');
  await page.goto('https://donway.ai.kr/settle');
  await page.waitForTimeout(2000);

  // Firebase 이메일/비번 로그인 (이미 로그인돼 있으면 스킵됨)
  try {
    await page.fill('input[type="email"]', 'soungkyekim@naver.com');
    await page.fill('input[type="password"]', 'khw3103!!!');
    await page.click('button[type="submit"], .login-btn, [onclick*="signIn"]');
    await page.waitForTimeout(3000);
  } catch(e) {
    console.log('  이미 로그인 상태이거나 셀렉터 다름 — 계속 진행');
  }

  // 2. 계약서 페이지 이동
  console.log('2. 계약서 페이지 이동...');
  await page.goto('https://donway.ai.kr/contract');
  await page.waitForTimeout(2000);

  // 3. 위수탁 계약 선택
  console.log('3. 영업점-택배기사 위수탁 선택...');
  await page.click('text=영업점-택배기사 위수탁');
  await page.waitForTimeout(500);

  // 4. 기사 정보 입력
  console.log('4. 기사 정보 입력...');
  await page.fill('#c-name',   '홍길동');
  await page.fill('#c-phone',  '01012345678');
  await page.fill('#c-addr',   '부산시 해운대구 우동 1234');

  // 택배사
  const courier = page.locator('#c-courier');
  if (await courier.count()) await courier.selectOption('CJ대한통운');

  // 담당구역
  const region = page.locator('#c-region');
  if (await region.count()) await region.fill('해운대구');

  // 단가
  const unit = page.locator('#c-unit');
  if (await unit.count()) await unit.fill('880');

  // 계약시작일
  const start = page.locator('#c-start');
  if (await start.count()) await start.fill('2026-08-13');

  // 특약사항
  const special = page.locator('#c-special');
  if (await special.count()) await special.fill('계약기간 중 일방적 해지 시 위약금 없음');

  await page.waitForTimeout(1000);

  // 5. 스크린샷 저장
  await page.screenshot({ path: 'scripts/contract-filled.png', fullPage: true });
  console.log('5. 스크린샷 저장: scripts/contract-filled.png');

  // 6. OTP 발송 (실제 SMS 발송됨 — 주석 해제 후 실행)
  // console.log('6. OTP 발송...');
  // await page.click('text=서명 요청');
  // await page.waitForTimeout(3000);
  // await page.screenshot({ path: 'scripts/contract-otp-sent.png' });

  console.log('\n✅ 완료. 스크린샷 확인: scripts/contract-filled.png');
  console.log('OTP 발송은 스크립트 하단 주석 해제 후 재실행하세요.');

  await page.waitForTimeout(5000);
  await browser.close();
})();
