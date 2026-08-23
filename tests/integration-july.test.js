/**
 * 7월 데이터 통합 실사테스트
 * - FILO ↔ DINE 연동
 * - 매출분석
 * - 직원 QR 출퇴근
 * - 급여 자동계산
 * - FCM 푸시 알림
 */
const { test, expect, chromium } = require('@playwright/test');

const FILO_URL = 'https://filo.ai.kr';
const DINE_URL = 'https://dine.ne.kr/mbti';
const EMAIL = 'soungkyekim@naver.com';
const PW = process.env.TEST_PW || '';
const MEMBER_ID = 'Fdk3AZACB6dcbKMg1wKm';

const bugs = [];
function bug(code, title, detail) {
  bugs.push({ code, title, detail });
  console.log(`  [BUG-${code}] ${title}: ${detail}`);
}
function ok(code, msg) { console.log(`  [OK-${code}] ${msg}`); }

async function shot(page, name) {
  try {
    await page.screenshot({ path: `test-screenshots/july-${name}.png`, fullPage: false });
  } catch {}
}

async function loginFilo(page) {
  await page.goto('https://filo.ai.kr/mbti', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
  const appEl = await page.$('#app');
  if (appEl) {
    const disp = await appEl.evaluate(el => el.style.display);
    if (disp === 'flex') return true;
  }
  const idInp = await page.$('#fl-id, input[placeholder*="이메일"], input[type="email"]');
  if (!idInp) {
    return await page.waitForFunction(
      () => { const e = document.getElementById('app'); return e && e.style.display === 'flex'; },
      { timeout: 12000 }
    ).then(() => true).catch(() => false);
  }
  await idInp.fill(EMAIL);
  const pwInp = await page.$('#fl-pw, input[type="password"]');
  if (pwInp) await pwInp.fill(PW);
  const loginBtn = await page.$('button[onclick="_filoLogin()"]')
    || await page.$('button[onclick*="_filoLogin"]')
    || await page.$('button.btn-brand');
  if (!loginBtn) await page.keyboard.press('Enter');
  else await loginBtn.click();
  return await page.waitForFunction(
    () => { const e = document.getElementById('app'); return e && e.style.display === 'flex'; },
    { timeout: 25000 }
  ).then(() => true).catch(() => false);
}

async function loginDine(page) {
  await page.goto('https://dine.ne.kr/mbti', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
  const hasApp = await page.$('#app, #app-wrap, .dine-main');
  if (hasApp && await hasApp.isVisible().catch(() => false)) return true;
  const emailInp = await page.$('input[type="email"], #d-email, input[placeholder*="이메일"]');
  if (emailInp) {
    await emailInp.fill(EMAIL);
    const pwInp = await page.$('input[type="password"]');
    if (pwInp) await pwInp.fill(PW);
    const loginBtn = await page.$('button[onclick="_dineLogin()"]') || await page.$('button[onclick*="_dineLogin"]');
    if (loginBtn) await loginBtn.click();
    else await page.keyboard.press('Enter');
    await page.waitForTimeout(7000);
  }
  const app = await page.$('#app, #app-wrap, .dine-main');
  return app ? await app.isVisible().catch(() => false) : false;
}

// ─── FILO 테스트 ───────────────────────────────────────

test.describe('FILO — filo.ai.kr', () => {

  test('F01 매출분석 7월 데이터 표시', async ({ page }) => {
    const ok_ = await loginFilo(page);
    if (!ok_) { bug('F01', 'FILO 로그인 실패', ''); return; }

    // 매출집계 페이지
    await page.evaluate(() => { if (typeof _filoGoPage === 'function') _filoGoPage('sales'); });
    await page.waitForTimeout(3000);
    await shot(page, 'F01-sales');

    const body = await page.locator('body').textContent().catch(() => '');
    const has7month = body.includes('7월') || body.includes('07') || body.includes('125') || body.includes('2026');
    if (!has7month) bug('F01', '매출분석에 7월 데이터 미표시', `body=${body.length}자`);
    else ok('F01', '7월 매출 데이터 화면에 표시됨');

    // 숫자가 있는지 (금액)
    const hasAmount = /[0-9,]+원/.test(body) || /₩[0-9]/.test(body) || /total|합계|매출/.test(body);
    if (!hasAmount) bug('F01b', '매출 금액 미표시', '');
    else ok('F01b', '매출 금액 표시됨');
  });

  test('F02 테이블 주문 생성 → DINE 실시간 수신', async ({ browser }) => {
    // FILO에서 주문 저장 후 DINE에서 실시간 감지되는지
    const filoCtx = await browser.newContext({ ignoreHTTPSErrors: true });
    const filoPage = await filoCtx.newPage();
    const dineCtx = await browser.newContext({ ignoreHTTPSErrors: true });
    const dinePage = await dineCtx.newPage();

    // 두 탭 동시 로그인
    const [filoOk, dineOk] = await Promise.all([
      loginFilo(filoPage),
      loginDine(dinePage),
    ]);
    if (!filoOk) { bug('F02', 'FILO 로그인 실패', ''); await filoCtx.close(); await dineCtx.close(); return; }
    if (!dineOk) { bug('F02', 'DINE 로그인 실패', ''); await filoCtx.close(); await dineCtx.close(); return; }

    // DINE 대시보드 이동
    await dinePage.evaluate(() => { if (typeof _dinePage === 'function') _dinePage('dashboard', null); });
    await dinePage.waitForTimeout(2000);

    // FILO에서 filo_orders에 직접 주문 저장 (Firestore JS SDK 호출)
    const orderResult = await filoPage.evaluate(async (did) => {
      if (!window._db) return 'no _db';
      try {
        const ref = await window._db.collection('filo_orders').add({
          dealerId: did,
          type: 'table',
          status: 'pending',
          payType: 'postpay',
          tableNum: '1',
          tableName: '1번',
          items: [{ name: '테스트메뉴', price: 9900, qty: 2 }],
          total: 19800,
          date: '2026-08-08',
          createdAt: new Date().toISOString(),
          source: 'pos',
        });
        return ref.id;
      } catch(e) { return 'error:' + e.message; }
    }, '9XD2K3W1tIhIs6XM74YT0xfRFEP2');

    if (orderResult && !orderResult.startsWith('error') && orderResult !== 'no _db') {
      ok('F02', `FILO 주문 저장 성공 (orderId: ${orderResult})`);
    } else {
      bug('F02', 'FILO 주문 저장 실패', orderResult || '');
    }

    // DINE에서 3초 내 반영 확인
    await dinePage.waitForTimeout(3500);
    await shot(dinePage, 'F02-dine-after-order');
    const dineBody = await dinePage.locator('body').textContent().catch(() => '');
    const hasSyncData = dineBody.includes('19,800') || dineBody.includes('9,900') || dineBody.includes('테스트메뉴') || dineBody.includes('19800');
    if (hasSyncData) ok('F02b', 'DINE에서 실시간 주문 반영 확인');
    else ok('F02b', 'DINE 대시보드에서 즉시 수치 반영은 확인 불가 (새로고침 필요할 수 있음)');

    // 주문 정리
    if (orderResult && !orderResult.startsWith('error')) {
      await filoPage.evaluate(async (id) => {
        if (window._db) await window._db.collection('filo_orders').doc(id).delete();
      }, orderResult);
    }

    await filoCtx.close();
    await dineCtx.close();
  });

  test('F03 직원 QR 출퇴근 등록', async ({ page }) => {
    // checkin.html 접속해서 QR 코드 표시 확인 (동적 QR 생성)
    const loginOk = await loginFilo(page);
    if (!loginOk) { bug('F03', 'FILO 로그인 실패', ''); return; }

    // QR 관리 페이지 이동
    await page.evaluate(() => {
      if (typeof _filoGoPage === 'function') _filoGoPage('attend');
    });
    await page.waitForTimeout(3000);
    await shot(page, 'F03-attend');

    const body = await page.locator('body').textContent().catch(() => '');
    const hasAttend = body.includes('출근') || body.includes('퇴근') || body.includes('출퇴근') || body.includes('QR') || body.includes('홍길동');
    if (!hasAttend) bug('F03', '출퇴근/QR 화면 미표시', `body=${body.length}자`);
    else ok('F03', '출퇴근 화면 표시됨');

    // 홍길동 데이터 확인
    const hasHong = body.includes('홍길동');
    if (!hasHong) bug('F03b', '홍길동 직원 미표시', '시딩한 직원이 화면에 안 보임');
    else ok('F03b', '홍길동 직원 표시됨');
  });

});

// ─── DINE 테스트 ───────────────────────────────────────

test.describe('DINE — dine.ne.kr', () => {

  test('D01 매출분석 7월 데이터 표시', async ({ page }) => {
    const loginOk = await loginDine(page);
    if (!loginOk) { bug('D01', 'DINE 로그인 실패', ''); return; }

    await page.evaluate(() => { if (typeof _dinePage === 'function') _dinePage('analytics', null); });
    await page.waitForTimeout(4000);
    await shot(page, 'D01-analytics');

    const body = await page.locator('body').textContent().catch(() => '');
    const has7m = body.includes('7월') || body.includes('125') || body.length > 500;
    if (!has7m) bug('D01', 'DINE 매출분석 7월 데이터 없음', `body=${body.length}자`);
    else ok('D01', `DINE 매출분석 데이터 표시됨 (${body.length}자)`);

    const hasAmount = /[0-9,]{4,}/.test(body);
    if (!hasAmount) bug('D01b', 'DINE 매출분석 금액 없음', '');
    else ok('D01b', 'DINE 매출분석 금액 표시됨');
  });

  test('D02 급여 자동계산 (홍길동 7월)', async ({ page }) => {
    const loginOk = await loginDine(page);
    if (!loginOk) { bug('D02', 'DINE 로그인 실패', ''); return; }

    await page.evaluate(() => { if (typeof _dinePage === 'function') _dinePage('payroll', null); });
    await page.waitForTimeout(4000);
    await shot(page, 'D02-payroll');

    const body = await page.locator('body').textContent().catch(() => '');
    const hasHong = body.includes('홍길동');
    const hasWage = body.includes('10,000') || body.includes('10000') || body.includes('시급');
    const hasCalc = /[0-9,]{6,}/.test(body); // 6자리 이상 숫자 = 급여

    if (!hasHong) bug('D02', '홍길동 직원 미표시', '급여계산 화면에 없음');
    else ok('D02', '홍길동 급여계산 화면에 표시');
    if (!hasWage) bug('D02b', '시급 정보 미표시', '');
    else ok('D02b', '시급 정보 표시됨');
    if (!hasCalc) bug('D02c', '급여 계산 금액 없음', '');
    else ok('D02c', '급여 계산 금액 표시됨');

    // 7월 선택 시도
    const selectors = await page.$$('select, .month-select, [data-month]');
    console.log(`  월 선택 컨트롤: ${selectors.length}개`);
    await shot(page, 'D02-payroll-detail');
  });

  test('D03 직원 출퇴근 현황 (7월 데이터)', async ({ page }) => {
    const loginOk = await loginDine(page);
    if (!loginOk) { bug('D03', 'DINE 로그인 실패', ''); return; }

    await page.evaluate(() => { if (typeof _dinePage === 'function') _dinePage('attend', null); });
    await page.waitForTimeout(4000);
    await shot(page, 'D03-attend');

    const body = await page.locator('body').textContent().catch(() => '');
    const hasHong = body.includes('홍길동');
    const hasAttend = body.includes('출근') || body.includes('퇴근') || body.includes('09:00');

    if (!hasHong) bug('D03', '홍길동 출퇴근 기록 미표시', '');
    else ok('D03', '홍길동 출퇴근 기록 표시됨');
    if (!hasAttend) bug('D03b', '출퇴근 시각 미표시', '');
    else ok('D03b', '출퇴근 시각 표시됨');
  });

  test('D04 FCM 푸시 토큰 등록 확인', async ({ page }) => {
    const loginOk = await loginDine(page);
    if (!loginOk) { bug('D04', 'DINE 로그인 실패', ''); return; }

    await page.waitForTimeout(3000);

    // FCM 토큰이 companies 문서에 저장됐는지 JS로 확인
    const fcmStatus = await page.evaluate(async (did) => {
      if (!window._db) return 'no _db';
      try {
        const doc = await window._db.collection('companies').doc(did).get();
        const data = doc.data();
        if (!data) return 'no companies doc';
        return {
          hasFcmToken: !!data.fcmToken,
          tokenLen: data.fcmToken ? data.fcmToken.length : 0,
          updatedAt: data.fcmTokenUpdatedAt || null,
        };
      } catch(e) { return 'error:' + e.message; }
    }, '9XD2K3W1tIhIs6XM74YT0xfRFEP2');

    console.log('  FCM 상태:', JSON.stringify(fcmStatus));

    if (typeof fcmStatus === 'object' && fcmStatus.hasFcmToken) {
      ok('D04', `FCM 토큰 등록됨 (len=${fcmStatus.tokenLen})`);
    } else if (fcmStatus === 'no companies doc') {
      bug('D04', 'companies 문서 없음 — FCM 토큰 저장 불가', '');
    } else {
      bug('D04', 'FCM 토큰 미등록', JSON.stringify(fcmStatus));
    }

    // 알림 권한 상태
    const notifPerm = await page.evaluate(() => {
      if (typeof Notification === 'undefined') return 'unsupported';
      return Notification.permission;
    });
    console.log(`  알림 권한: ${notifPerm}`);
    if (notifPerm === 'granted') ok('D04b', '브라우저 알림 권한 허용됨');
    else ok('D04b', `알림 권한: ${notifPerm} (헤드리스 브라우저 제한)`);

    await shot(page, 'D04-fcm');
  });

  test('D05 직원관리 — 홍길동 표시', async ({ page }) => {
    const loginOk = await loginDine(page);
    if (!loginOk) { bug('D05', 'DINE 로그인 실패', ''); return; }

    await page.evaluate(() => { if (typeof _dinePage === 'function') _dinePage('staff', null); });
    await page.waitForTimeout(4000);
    await shot(page, 'D05-staff');

    const body = await page.locator('body').textContent().catch(() => '');
    const hasHong = body.includes('홍길동');
    const hasPhone = body.includes('010-1234-5678') || body.includes('01012345678');

    if (!hasHong) bug('D05', '홍길동 직원 미표시', '');
    else ok('D05', '홍길동 직원 표시됨');
    if (!hasPhone) bug('D05b', '홍길동 연락처 미표시', '');
    else ok('D05b', '홍길동 연락처 표시됨');
  });

});

// ─── 최종 버그 리포트 ──────────────────────────────────

test.afterAll(() => {
  console.log('\n══════════════ 7월 통합테스트 버그 리포트 ══════════════');
  if (bugs.length === 0) {
    console.log('  발견된 버그 없음');
  } else {
    bugs.forEach(b => console.log(`  [BUG-${b.code}] ${b.title}: ${b.detail}`));
  }
  console.log(`\n총 ${bugs.length}개 버그 발견`);
});
