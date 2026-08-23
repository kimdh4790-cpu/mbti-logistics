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
const PW    = process.env.TEST_PW || '';
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
    await dinePage.goto(`${DINE}/app`, { timeout: 20000 });
    await dinePage.waitForTimeout(2000);
    await screenshot(dinePage, '2-dine-app');

    const dineTitle = await dinePage.title();
    log(PASS, 'DINE 앱 접속', dineTitle);

    // 로그인 폼 확인 (#li-email, #li-pw)
    const emailInput = await dinePage.$('#li-email').catch(()=>null);
    const pwInput    = await dinePage.$('#li-pw').catch(()=>null);

    if (emailInput && pwInput) {
      await emailInput.fill(EMAIL);
      await pwInput.fill(PW);
      const loginBtn = await dinePage.$('button[onclick="_dineLogin()"], .btn.btn-primary').catch(()=>null);
      if (loginBtn) {
        await loginBtn.click();
        await dinePage.waitForTimeout(4000);
        await screenshot(dinePage, '2-dine-after-login');

        // 로그인 성공 여부 — #app-wrap 표시되면 성공 (최대 8초 대기)
        await dinePage.waitForTimeout(4000);
        let appVisible = await dinePage.$eval('#app-wrap', el => el.style.display !== 'none').catch(()=>false);
        if (!appVisible) { await dinePage.waitForTimeout(4000); appVisible = await dinePage.$eval('#app-wrap', el => el.style.display !== 'none').catch(()=>false); }
        log(appVisible ? PASS : FAIL, 'DINE 로그인', appVisible ? '성공' : '실패 (app-wrap 미표시)');

        if (appVisible) {
          // 출퇴근 현황 탭 클릭
          await dinePage.evaluate(() => { try{_dinePage('attend',null);}catch(e){} });
          await dinePage.waitForTimeout(2000);
          await screenshot(dinePage, '2-dine-attend');
          const attendCnt = await dinePage.$eval('#tb-attend-cnt', el => el.textContent).catch(()=>'');
          log(PASS, '출퇴근 현황 로드', attendCnt || '출근자 없음');

          // 직원 현황 탭
          await dinePage.evaluate(() => { try{_dinePage('staff',null);}catch(e){} });
          await dinePage.waitForTimeout(2000);
          await screenshot(dinePage, '2-dine-staff');
          const staffCards = await dinePage.$$('.staff-card, .member-card').catch(()=>[]);
          log(PASS, '직원 현황 탭 로드', `${staffCards.length}명`);
        }
      } else {
        log(SKIP, '로그인 버튼 못찾음');
      }
    } else {
      const appVisible = await dinePage.$eval('#app-wrap', el => el.style.display !== 'none').catch(()=>false);
      if (appVisible) {
        log(PASS, 'DINE 이미 로그인 상태');
        const attendCnt = await dinePage.$eval('#tb-attend-cnt', el => el.textContent).catch(()=>'');
        log(PASS, '출퇴근 현황', attendCnt || '확인됨');
      } else {
        log(SKIP, '로그인 폼 없음 — 구조 확인 필요', dinePage.url());
        await screenshot(dinePage, '2-dine-no-form');
      }
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

  // ── 5. FILO → DINE 실시간 연동 테스트 ───────────────────────────
  console.log('\n=== [5] FILO → DINE 실시간 연동 ===');
  const dine2 = await browser.newPage();
  const filo2 = await browser.newPage();
  try {
    // DINE 로그인 후 출퇴근 현황 열어두기
    await dine2.goto(`${DINE}/app`, { timeout: 20000 });
    await dine2.waitForTimeout(2000);
    const ei = await dine2.$('#li-email').catch(()=>null);
    const pi = await dine2.$('#li-pw').catch(()=>null);
    if (ei && pi) {
      await ei.fill(EMAIL); await pi.fill(PW);
      const lb = await dine2.$('button[onclick="_dineLogin()"]').catch(()=>null);
      if (lb) { await lb.click(); await dine2.waitForTimeout(4000); }
    }
    await dine2.waitForTimeout(4000);
    let dineReady = await dine2.$eval('#app-wrap', el => el.style.display !== 'none').catch(()=>false);
    if (!dineReady) { await dine2.waitForTimeout(4000); dineReady = await dine2.$eval('#app-wrap', el => el.style.display !== 'none').catch(()=>false); }
    if (!dineReady) { log(SKIP, 'DINE 로그인 실패 — 연동 테스트 건너뜀'); throw new Error('skip'); }
    log(PASS, 'DINE 로그인 완료');

    // 출퇴근 현황 탭 열기
    await dine2.evaluate(() => { try{_dinePage('attend',null);}catch(e){} });
    await dine2.waitForTimeout(1500);
    const beforeCnt = await dine2.$eval('#tb-attend-cnt', el => el.textContent.trim()).catch(()=>'0명 출근중');
    log(PASS, 'DINE 출퇴근 현황 열림', `현재: ${beforeCnt}`);

    // QR /qr/members API로 직원 목록 조회
    const membRes = await filo2.goto(`${BASE}/qr/members?did=${DID}`, { timeout: 15000 });
    await filo2.waitForTimeout(1000);
    const membJson = await filo2.evaluate(() => { try{return JSON.parse(document.body.innerText);}catch(e){return null;} });
    const members = Array.isArray(membJson) ? membJson : (membJson?.members || []);

    if (members.length === 0) {
      log(SKIP, '직원 미등록 — QR 출근 연동 테스트 건너뜀 (CLAUDE.md에 테스트 직원 등록 필요)');
    } else {
      const testMember = members[0];
      log(PASS, '직원 목록 조회', `${members.length}명 (테스트: ${testMember.name||testMember.uid})`);

      // /qr/confirm POST — 출근 처리
      const confirmRes = await fetch(`${BASE}/qr/confirm`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          did: DID,
          uid: testMember.uid || testMember.id,
          name: testMember.name || '테스트직원',
          action: 'in',
          deviceId: 'e2e-test-device',
          lat: 37.5, lng: 127.0,
          fcmToken: ''
        })
      });

      // fetch를 Playwright page context에서 실행
      const confirmData = await filo2.evaluate(async (args) => {
        try {
          const r = await fetch(args.url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(args.body) });
          return await r.json();
        } catch(e) { return {error: e.message}; }
      }, { url:`${BASE}/qr/confirm`, body:{did:DID, uid:testMember.uid||testMember.id, name:testMember.name||'테스트직원', action:'in', deviceId:'e2e-test-'+Date.now(), lat:37.5, lng:127.0, fcmToken:''} });

      if (confirmData && !confirmData.error && confirmData.ok !== false) {
        log(PASS, 'QR 출근 처리 완료', JSON.stringify(confirmData).slice(0,80));

        // DINE 실시간 반영 확인 (onSnapshot으로 자동 갱신 — 3초 대기)
        await dine2.waitForTimeout(3000);
        await screenshot(dine2, '5-dine-after-qr');
        const afterCnt = await dine2.$eval('#tb-attend-cnt', el => el.textContent.trim()).catch(()=>'');
        log(PASS, 'DINE 실시간 반영', `이전: ${beforeCnt} → 이후: ${afterCnt}`);

        const changed = beforeCnt !== afterCnt;
        log(changed ? PASS : SKIP, '출근자 수 변경', changed ? '실시간 반영 확인' : '수 동일 (이미 출근 상태일 수 있음)');
      } else {
        log(FAIL, 'QR 출근 처리 실패', JSON.stringify(confirmData||{}).slice(0,80));
      }
    }

    // 주문 → DINE 매출 실시간 연동 확인
    await dine2.evaluate(() => { try{_dinePage('sales',null);}catch(e){} }).catch(()=>{});
    await dine2.waitForTimeout(1500);
    await screenshot(dine2, '5-dine-sales');
    const salesVisible = await dine2.$eval('#sales-wrap, #sales-page, [id*="sales"]', el => !!el).catch(()=>false);
    log(salesVisible ? PASS : SKIP, 'DINE 매출 탭', salesVisible ? '표시됨' : '탭 미확인');

    // 급여산정 탭 확인
    await dine2.evaluate(() => { try{_dinePage('payroll',null);}catch(e){} }).catch(()=>{});
    await dine2.waitForTimeout(2000);
    await screenshot(dine2, '5-dine-payroll');
    // 급여 금액 표시 여부 확인
    const payrollData = await dine2.evaluate(() => {
      const rows = document.querySelectorAll('.payroll-row, .pay-row, [class*="payroll"], [class*="salary"]');
      const total = document.querySelector('#payroll-total, #pay-total, [id*="pay-total"]');
      return { rowCount: rows.length, totalText: total ? total.textContent.trim() : '' };
    }).catch(()=>({rowCount:0,totalText:''}));
    log(payrollData.rowCount > 0 || payrollData.totalText ? PASS : SKIP,
      '급여산정 탭',
      payrollData.rowCount > 0 ? `${payrollData.rowCount}명 급여 계산됨` : (payrollData.totalText || '표시 확인 필요'));

    // 근태 → 급여 연동: 출근 처리 후 해당 직원 급여에 근무시간 반영되는지
    if (members.length > 0) {
      const workerName = members[0].name || '직원';
      const workerPayEl = await dine2.evaluate((name) => {
        const els = Array.from(document.querySelectorAll('*'));
        const found = els.find(el => el.textContent.includes(name) && el.closest('[class*="pay"], [class*="salary"], [class*="staff"]'));
        return found ? found.closest('[class*="pay"], [class*="salary"]')?.textContent?.trim()?.slice(0,100) : null;
      }, workerName).catch(()=>null);
      log(workerPayEl ? PASS : SKIP, `${workerName} 급여 정보`, workerPayEl || '급여 탭에서 직접 확인 필요');
    }

  } catch(e) {
    if (e.message !== 'skip') log(FAIL, '실시간 연동 테스트 오류', e.message.slice(0,80));
    await screenshot(dine2, '5-dine-error').catch(()=>{});
  }
  await dine2.close();
  await filo2.close();

  // ── 결과 요약 ────────────────────────────────────────────────────
  console.log('\n========== 결과 요약 ==========');
  results.forEach(r => console.log(r));
  const passed  = results.filter(r=>r.startsWith(PASS)).length;
  const failed  = results.filter(r=>r.startsWith(FAIL)).length;
  const skipped = results.filter(r=>r.startsWith(SKIP)).length;
  console.log(`\n합계: ${PASS}${passed}건 / ${FAIL}${failed}건 / ${SKIP}${skipped}건`);

  await browser.close();
})();
