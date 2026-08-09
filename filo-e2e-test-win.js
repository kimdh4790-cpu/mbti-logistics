/**
 * FILO·DINE 실사 E2E 테스트 (Windows 로컬용)
 * 실행: node filo-e2e-test-win.js
 * 사전 설치: npm install playwright  +  npx playwright install chromium
 */
const { chromium } = require('playwright');
const path = require('path');
const os = require('os');

const DID  = '9XD2K3W1tIhIs6XM74YT0xfRFEP2';
const BASE = 'https://filo.ai.kr';
const DINE = 'https://dine.ne.kr';
const EMAIL = 'soungkyekim@naver.com';
const PW    = 'khw3103!!!';
const TEST_PHONE = '01012345678';

const PASS = '✅';
const FAIL = '❌';
const SKIP = '⚠️';

const results = [];
function log(icon, label, detail='') {
  const msg = `${icon} ${label}${detail ? ' — '+detail : ''}`;
  console.log(msg);
  results.push(msg);
}

async function screenshot(page, name) {
  const p = path.join(os.tmpdir(), `filo-ss-${name}.png`);
  await page.screenshot({ path: p, fullPage: false });
  console.log(`  📸 ${p}`);
  return p;
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox','--disable-setuid-sandbox']
  });

  // ── 1. QR 출퇴근 페이지 ──────────────────────────────────────────
  console.log('\n=== [1] QR 출퇴근 페이지 ===');
  const qrPage = await browser.newPage();
  try {
    await qrPage.goto(`${BASE}/qr?did=${DID}&action=in`, { timeout: 20000 });
    await qrPage.waitForTimeout(3000);
    await screenshot(qrPage, '1-qr-page');

    const title = await qrPage.title();
    log(PASS, 'QR 페이지 로드', title);

    const membBtns = await qrPage.$$('.mem-btn');
    if (membBtns.length > 0) {
      const firstName = await membBtns[0].textContent();
      log(PASS, '직원 목록 로드됨', `${membBtns.length}명 (첫번째: ${firstName.trim()})`);
    } else {
      const statusText = await qrPage.$eval('#status', el => el.textContent).catch(()=>'');
      log(SKIP, '직원 목록 없음', statusText || '버튼 없음 (직원 미등록 가능)');
    }

    const hasFB = await qrPage.evaluate(() => typeof firebase !== 'undefined');
    log(hasFB ? PASS : FAIL, 'Firebase 스크립트 로드', hasFB ? 'OK' : '미로드');

    const hasFcmVar = await qrPage.evaluate(() => typeof _qrFcmToken !== 'undefined');
    log(hasFcmVar ? PASS : FAIL, '_qrFcmToken 변수', hasFcmVar ? '초기화됨' : '없음');

  } catch(e) {
    log(FAIL, 'QR 페이지 오류', e.message.slice(0,80));
    await screenshot(qrPage, '1-qr-error').catch(()=>{});
  }
  await qrPage.close();

  // ── 2. DINE 로그인 → 출퇴근 현황 ────────────────────────────────
  console.log('\n=== [2] DINE 출퇴근 현황 ===');
  const dinePage = await browser.newPage();
  try {
    await dinePage.goto(DINE, { timeout: 20000 });
    await dinePage.waitForTimeout(2000);
    await screenshot(dinePage, '2-dine-landing');

    const dineTitle = await dinePage.title();
    log(PASS, 'DINE 접속', dineTitle);

    const emailInput = await dinePage.$('input[type="email"], #email, #l-email').catch(()=>null);
    const pwInput    = await dinePage.$('input[type="password"], #password, #l-pw').catch(()=>null);

    if (emailInput && pwInput) {
      await emailInput.fill(EMAIL);
      await pwInput.fill(PW);
      const loginBtn = await dinePage.$('button[type="submit"], .btn-primary, button:has-text("로그인")').catch(()=>null);
      if (loginBtn) {
        await loginBtn.click();
        await dinePage.waitForTimeout(4000);
        await screenshot(dinePage, '2-dine-after-login');
        log(PASS, 'DINE 로그인 시도');

        const staffTab = await dinePage.$('[onclick*="staff"], [onclick*="attend"], text=직원, text=출퇴근').catch(()=>null);
        if (staffTab) {
          await staffTab.click();
          await dinePage.waitForTimeout(2000);
          await screenshot(dinePage, '2-dine-staff-tab');
          log(PASS, '직원 탭 이동');
          const attendTable = await dinePage.$('table, .attend-live, #attend-table').catch(()=>null);
          log(attendTable ? PASS : SKIP, attendTable ? '출퇴근 현황 테이블 표시됨' : '출퇴근 테이블 미확인');
        } else {
          log(SKIP, '직원/출퇴근 탭 버튼 못찾음', dinePage.url());
        }
      } else {
        log(SKIP, '로그인 버튼 못찾음');
      }
    } else {
      log(SKIP, '로그인 폼 없음 (이미 로그인 또는 다른 구조)', dinePage.url());
      await screenshot(dinePage, '2-dine-no-form');
    }
  } catch(e) {
    log(FAIL, 'DINE 오류', e.message.slice(0,80));
    await screenshot(dinePage, '2-dine-error').catch(()=>{});
  }
  await dinePage.close();

  // ── 3. 회원 포털 — 전화번호만으로 포인트 조회 ───────────────────
  console.log('\n=== [3] 회원 포털 ===');
  const memPage = await browser.newPage();
  try {
    await memPage.goto(`${BASE}/member?did=${DID}`, { timeout: 20000 });
    await memPage.waitForTimeout(2000);
    await screenshot(memPage, '3-member-portal');

    const memTitle = await memPage.title();
    log(PASS, '회원 포털 로드', memTitle);

    const btnText = await memPage.$eval('.btn-primary', el => el.textContent.trim()).catch(()=>'');
    if (btnText.includes('포인트 확인')) {
      log(PASS, '버튼 텍스트 정상', btnText);
    } else if (btnText.includes('로그인')) {
      log(FAIL, '버튼이 아직 "로그인" — 배포 미완료 가능성');
    } else {
      log(SKIP, '버튼 텍스트', btnText || '없음');
    }

    const desc = await memPage.$eval('body', el => el.textContent).catch(()=>'');
    if (desc.includes('별도 회원가입 없이')) {
      log(PASS, '가입 없이 이용 안내 표시됨');
    } else if (desc.includes('회원가입')) {
      log(FAIL, '회원가입 강요 문구 아직 있음');
    }

    const phoneInput = await memPage.$('#l-phone');
    if (phoneInput) {
      await phoneInput.fill(TEST_PHONE);
      await memPage.waitForTimeout(500);
      const val = await phoneInput.inputValue();
      log(PASS, '전화번호 입력 정상', val);

      const btn = await memPage.$('.btn-primary');
      if (btn) {
        await btn.click();
        await memPage.waitForTimeout(5000);
        await screenshot(memPage, '3-member-after-lookup');

        const appVisible = await memPage.$eval('#app', el => el.style.display !== 'none').catch(()=>false);
        if (appVisible) {
          const pointText = await memPage.$eval('#point-amount', el => el.textContent).catch(()=>'?');
          log(PASS, '포인트 조회 성공', pointText + 'P');
        } else {
          const errText = await memPage.$eval('#l-err', el => el.textContent).catch(()=>'');
          log(FAIL, '조회 실패', errText || '앱 화면 미표시');
        }
      }
    } else {
      log(FAIL, '전화번호 입력창 없음');
    }
  } catch(e) {
    log(FAIL, '회원 포털 오류', e.message.slice(0,80));
    await screenshot(memPage, '3-member-error').catch(()=>{});
  }
  await memPage.close();

  // ── 4. QR 주문 페이지 ────────────────────────────────────────────
  console.log('\n=== [4] QR 주문 페이지 ===');
  const orderPage = await browser.newPage();
  try {
    await orderPage.goto(`${BASE}/order?d=${DID}&t=1&name=1번테이블`, { timeout: 20000 });
    await orderPage.waitForTimeout(4000);
    await screenshot(orderPage, '4-order-page');

    const orderTitle = await orderPage.title();
    log(PASS, '주문 페이지 로드', orderTitle);

    const menuItems = await orderPage.$$('.menu-item, .menu-card, [class*="menu"]').catch(()=>[]);
    if (menuItems.length > 0) {
      log(PASS, '메뉴 로드됨', `${menuItems.length}개 아이템`);
    } else {
      const bodyTxt = await orderPage.$eval('body', el => el.textContent.slice(0,300)).catch(()=>'');
      log(SKIP, '메뉴 셀렉터 미매칭', bodyTxt.slice(0,100));
    }

    const gateVisible = await orderPage.$eval('#fcm-gate', el => el && el.style.display !== 'none').catch(()=>false);
    log(!gateVisible ? PASS : FAIL, 'FCM 게이트 모달', !gateVisible ? '제거됨 (정상)' : '아직 표시됨');

  } catch(e) {
    log(FAIL, '주문 페이지 오류', e.message.slice(0,80));
    await screenshot(orderPage, '4-order-error').catch(()=>{});
  }
  await orderPage.close();

  // ── 결과 요약 ────────────────────────────────────────────────────
  console.log('\n========== 결과 요약 ==========');
  results.forEach(r => console.log(r));
  const passed  = results.filter(r=>r.startsWith(PASS)).length;
  const failed  = results.filter(r=>r.startsWith(FAIL)).length;
  const skipped = results.filter(r=>r.startsWith(SKIP)).length;
  console.log(`\n합계: ${PASS}${passed}건 / ${FAIL}${failed}건 / ${SKIP}${skipped}건`);

  await browser.close();
})();
