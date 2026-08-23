/**
 * FILO · DINE 실사 체크 — 로그인 셀렉터 자동 탐지 버전
 * 계정: soungkyekim@naver.com / khw3103!!!
 */
const { test, expect, chromium } = require('@playwright/test');
const path = require('path');
const fs   = require('fs');

const EMAIL = 'soungkyekim@naver.com';
const PW    = process.env.TEST_PW || '';

const SS = path.join(__dirname, '..', 'test-screenshots');
if (!fs.existsSync(SS)) fs.mkdirSync(SS, { recursive: true });

const BUGS = [];

function bug(id, title, note) {
  console.log(`\n[BUG-${id}] ${title}: ${note}`);
  BUGS.push({ id, title, note });
}

async function shot(page, name) {
  const f = path.join(SS, `${name}.png`);
  await page.screenshot({ path: f, fullPage: false }).catch(() => {});
  return f;
}

/* 로그인 - 버튼을 onclick 속성 또는 텍스트로 탐지 */
async function loginFilo(page) {
  await page.goto('https://filo.ai.kr/mbti', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  // 이미 앱 로드된 경우
  const appEl = await page.$('#app');
  if (appEl) {
    const disp = await appEl.evaluate(el => el.style.display);
    if (disp === 'flex') { console.log('  [filo] already logged in'); return true; }
  }

  // 로그인 폼 탐지
  const idInp = await page.$('#fl-id, input[placeholder*="이메일"], input[type="email"]');
  if (!idInp) {
    // 폼 없음 — 앱 로드 대기
    const ok = await page.waitForFunction(
      () => { const e = document.getElementById('app'); return e && e.style.display === 'flex'; },
      { timeout: 12000 }
    ).then(() => true).catch(() => false);
    return ok;
  }

  // 어떤 버튼이 있는지 탐지
  const allBtns = await page.$$('button');
  for (const b of allBtns) {
    const txt = await b.textContent().catch(() => '');
    const oc  = await b.getAttribute('onclick').catch(() => '');
    console.log(`  [btn] text="${txt.trim()}" onclick="${oc}"`);
  }

  // 자격증명 입력
  await idInp.fill(EMAIL);
  const pwInp = await page.$('#fl-pw, input[type="password"]');
  if (pwInp) await pwInp.fill(PW);

  // 버튼 클릭 — 정확한 onclick으로 선택 (substring 오탐 방지)
  const loginBtn = await page.$('button[onclick="_filoLogin()"]')
    || await page.$('button[onclick*="_filoLogin"]')
    || await page.$('button.btn-brand');

  if (!loginBtn) {
    console.log('  [filo] 로그인 버튼 없음');
    // 폼 제출 시도
    await page.keyboard.press('Enter');
  } else {
    const btnText = await loginBtn.textContent().catch(() => '');
    const btnOc   = await loginBtn.getAttribute('onclick').catch(() => '');
    console.log(`  [filo] 클릭 버튼: "${btnText.trim()}" onclick="${btnOc}"`);
    await loginBtn.click();
  }

  const ok = await page.waitForFunction(
    () => { const e = document.getElementById('app'); return e && e.style.display === 'flex'; },
    { timeout: 25000 }
  ).then(() => true).catch(() => false);

  const errMsg = await page.$eval('#fl-err', el => el.textContent).catch(() => '');
  if (!ok) console.log(`  [filo] login fail — err="${errMsg}"`);
  return ok;
}

async function loginDine(page) {
  await page.goto('https://dine.ne.kr/mbti', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  const hasApp = await page.$('#app, #app-wrap, .dine-main');
  if (hasApp) {
    const vis = await hasApp.isVisible().catch(() => false);
    if (vis) { console.log('  [dine] already logged in'); return true; }
  }

  const emailInp = await page.$('input[type="email"], #d-email, #login-email, input[placeholder*="이메일"]');
  if (emailInp) {
    await emailInp.fill(EMAIL);
    const pwInp = await page.$('input[type="password"]');
    if (pwInp) await pwInp.fill(PW);

    // 정확한 onclick으로 선택 (탭 전환 버튼 오탐 방지)
    const loginBtn = await page.$('button[onclick="_dineLogin()"]')
      || await page.$('button[onclick*="_dineLogin"]');
    if (loginBtn) {
      const oc = await loginBtn.getAttribute('onclick').catch(() => '');
      console.log(`  [dine] 클릭: onclick="${oc}"`);
      await loginBtn.click();
    } else {
      await page.keyboard.press('Enter');
    }
    await page.waitForTimeout(7000);
  }

  const app = await page.$('#app, #app-wrap, .dine-main');
  const ok = app ? await app.isVisible().catch(() => false) : false;
  console.log(`  [dine] login result: ${ok}, url: ${page.url()}`);
  return ok;
}

/* ══ FILO ══ */
test.describe('FILO — filo.ai.kr', () => {

  test('01 메인 페이지 접속', async ({ page }) => {
    page.on('console', m => { if (m.type() === 'error') bug('F-CONSOLE', 'JS오류', m.text().slice(0, 120)); });

    await page.goto('https://filo.ai.kr', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    await shot(page, 'F01-main');

    const title = await page.title();
    const body  = await page.locator('body').textContent().catch(() => '');
    console.log(`  title: "${title}", body_len: ${body.length}`);

    if (body.length < 100) bug('F01', '메인 페이지 콘텐츠 없음', `body=${body.length}chars`);
    expect(body.length).toBeGreaterThan(50);
  });

  test('02 로그인', async ({ page }) => {
    page.on('console', m => { if (m.type() === 'error') bug('F-CONSOLE', 'JS오류', m.text().slice(0, 120)); });

    const ok = await loginFilo(page);
    await shot(page, 'F02-login');

    if (!ok) {
      const url = page.url();
      const body = await page.locator('body').textContent().catch(() => '');
      bug('F02', 'FILO 로그인 실패', `url=${url} body_preview=${body.slice(0, 100)}`);
    }
    expect(ok, 'FILO 로그인 실패').toBe(true);
  });

  test('03 대시보드', async ({ page }) => {
    const ok = await loginFilo(page);
    if (!ok) { bug('F03', '로그인 실패로 대시보드 진입 불가', ''); return; }

    await shot(page, 'F03-dashboard');
    const content = await page.locator('#content, #app').textContent().catch(() => '');
    console.log(`  content: "${content.slice(0, 80)}"`);
    if (content.length < 50) bug('F03', '대시보드 콘텐츠 없음', `len=${content.length}`);
  });

  test('04 POS', async ({ page }) => {
    const ok = await loginFilo(page);
    if (!ok) { bug('F04', '로그인 실패', ''); return; }

    await page.evaluate(() => { if (typeof _filoGoPage === 'function') _filoGoPage('kiosk'); });
    await page.waitForTimeout(4000);
    await shot(page, 'F04-pos');

    const menuDom = await page.locator('.menu-item, .menu-card, .cat-tab, .kiosk-wrap').count();
    const content = await page.locator('#content').textContent().catch(() => '');
    console.log(`  menu DOM: ${menuDom}, content: "${content.slice(0, 60)}"`);
    if (menuDom === 0 && content.length < 50) bug('F04', 'POS 메뉴 로드 안됨', `dom=${menuDom}`);
  });

  test('05 메뉴관리', async ({ page }) => {
    const ok = await loginFilo(page);
    if (!ok) { bug('F05', '로그인 실패', ''); return; }

    await page.evaluate(() => { if (typeof _filoGoPage === 'function') _filoGoPage('menu_mgmt'); });
    await page.waitForTimeout(4000);
    await shot(page, 'F05-menu-mgmt');

    const content = await page.locator('#content').textContent().catch(() => '');
    const dom = await page.locator('.menu-item, .menu-card, table tr').count();
    if (!content.includes('메뉴') && !content.includes('카테고리') && dom === 0)
      bug('F05', '메뉴관리 콘텐츠 없음', `dom=${dom}`);
  });

  test('06 테이블', async ({ page }) => {
    const ok = await loginFilo(page);
    if (!ok) { bug('F06', '로그인 실패', ''); return; }

    await page.evaluate(() => { if (typeof _filoGoPage === 'function') _filoGoPage('table_qr'); });
    await page.waitForTimeout(4000);
    await shot(page, 'F06-table');

    const content = await page.locator('#content').textContent().catch(() => '');
    if (!content.includes('테이블') && !content.includes('QR') && content.length < 50)
      bug('F06', '테이블 현황 콘텐츠 없음', `len=${content.length}`);
  });

  test('07 주문대기', async ({ page }) => {
    const ok = await loginFilo(page);
    if (!ok) { bug('F07', '로그인 실패', ''); return; }

    await page.evaluate(() => { if (typeof _filoGoPage === 'function') _filoGoPage('orders'); });
    await page.waitForTimeout(4000);
    await shot(page, 'F07-orders');

    const content = await page.locator('#content').textContent().catch(() => '');
    if (content.length < 30) bug('F07', '주문대기 콘텐츠 없음', `len=${content.length}`);
  });

  test('08 매출집계', async ({ page }) => {
    const ok = await loginFilo(page);
    if (!ok) { bug('F08', '로그인 실패', ''); return; }

    await page.evaluate(() => { if (typeof _filoGoPage === 'function') _filoGoPage('pos_report'); });
    await page.waitForTimeout(4000);
    await shot(page, 'F08-report');

    const content = await page.locator('#content').textContent().catch(() => '');
    if (content.length < 30) bug('F08', '매출집계 콘텐츠 없음', `len=${content.length}`);
  });

  test('09 설정', async ({ page }) => {
    const ok = await loginFilo(page);
    if (!ok) { bug('F09', '로그인 실패', ''); return; }

    await page.evaluate(() => { if (typeof _filoGoPage === 'function') _filoGoPage('settings'); });
    await page.waitForTimeout(4000);
    await shot(page, 'F09-settings');

    const content = await page.locator('#content').textContent().catch(() => '');
    if (content.length < 30) bug('F09', '설정 콘텐츠 없음', `len=${content.length}`);
  });

  test('10 고객 주문화면', async ({ page }) => {
    const ORDER_URL = `https://filo.ai.kr/order?d=9XD2K3W1tIhIs6XM74YT0xfRFEP2&t=1`;
    await page.goto(ORDER_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(5000);
    await shot(page, 'F10-order-customer');

    const menuItems = await page.locator('.menu-item, .menu-card, [onclick*="addToCart"], [onclick*="addItem"]').count();
    const body = await page.locator('body').textContent().catch(() => '');
    console.log(`  메뉴 DOM: ${menuItems}, body: ${body.length}`);
    if (menuItems === 0) bug('F10', '고객 주문화면 메뉴 없음', `dom=${menuItems}`);
    if (body.length < 200) bug('F10', '고객 주문화면 콘텐츠 없음', `body=${body.length}`);

    if (menuItems > 0) {
      await page.locator('.menu-item, .menu-card').first().click();
      await page.waitForTimeout(1000);
      await shot(page, 'F10b-order-add');
    }
  });

});

/* ══ DINE ══ */
test.describe('DINE — dine.ne.kr', () => {

  test('11 메인 페이지 접속', async ({ page }) => {
    const mimeErrors = [];
    page.on('response', r => {
      const ct = r.headers()['content-type'] || '';
      if (r.url().match(/\.js(\?|$)/) && ct.includes('html')) {
        mimeErrors.push(`[${r.status()}] ${r.url()} content-type=${ct}`);
        bug('D-MIME', 'JS 파일이 HTML 반환 (404)', `${r.url()}`);
      }
    });
    page.on('console', m => { if (m.type() === 'error') bug('D-CONSOLE', 'JS오류', m.text().slice(0, 120)); });

    await page.goto('https://dine.ne.kr', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    await shot(page, 'D11-main');

    const title = await page.title();
    const body  = await page.locator('body').textContent().catch(() => '');
    console.log(`  title: "${title}", body_len: ${body.length}`);
    if (body.length < 100) bug('D11', 'DINE 메인 페이지 콘텐츠 없음', `body=${body.length}`);
    expect(body.length).toBeGreaterThan(50);
  });

  test('12 로그인', async ({ page }) => {
    page.on('console', m => { if (m.type() === 'error') bug('D-CONSOLE', 'JS오류', m.text().slice(0, 120)); });

    const ok = await loginDine(page);
    await shot(page, 'D12-login');

    if (!ok) bug('D12', 'DINE 로그인 실패', `url=${page.url()}`);
    expect(ok, 'DINE 로그인 실패').toBe(true);
  });

  test('13 대시보드', async ({ page }) => {
    const ok = await loginDine(page);
    if (!ok) { bug('D13', '로그인 실패로 대시보드 진입 불가', ''); return; }

    await shot(page, 'D13-dashboard');
    const body = await page.locator('body').textContent().catch(() => '');
    if (body.length < 100) bug('D13', 'DINE 대시보드 콘텐츠 없음', `len=${body.length}`);
  });

  test('14 근무스케줄', async ({ page }) => {
    // _dineTable 미구현(_dinePage 참조만 존재) — schedule 페이지로 대체 테스트
    const ok = await loginDine(page);
    if (!ok) { bug('D14', '로그인 실패', ''); return; }

    await page.evaluate(() => {
      if (typeof _dinePage === 'function') _dinePage('schedule', null);
    });
    await page.waitForTimeout(3500);
    await shot(page, 'D14-schedule');

    const content = await page.locator('#content, body').first().textContent().catch(() => '');
    if (content.length < 50)
      bug('D14', 'DINE 스케줄 화면 콘텐츠 없음', `body_len=${content.length}`);
  });

  test('15 매출분석', async ({ page }) => {
    const ok = await loginDine(page);
    if (!ok) { bug('D15', '로그인 실패', ''); return; }

    await page.evaluate(() => { if (typeof _dineGoPage === 'function') _dineGoPage('analytics'); });
    await page.waitForTimeout(3500);
    await shot(page, 'D15-analytics');

    const content = await page.locator('body').textContent().catch(() => '');
    console.log(`  body_len: ${content.length}`);
    if (content.length < 100) bug('D15', '매출분석 콘텐츠 없음', `len=${content.length}`);
  });

  test('16 직원관리', async ({ page }) => {
    const ok = await loginDine(page);
    if (!ok) { bug('D16', '로그인 실패', ''); return; }

    await page.evaluate(() => { if (typeof _dineGoPage === 'function') _dineGoPage('staff'); });
    await page.waitForTimeout(3500);
    await shot(page, 'D16-staff');

    const content = await page.locator('body').textContent().catch(() => '');
    if (content.length < 100) bug('D16', '직원관리 콘텐츠 없음', `len=${content.length}`);
  });

});

/* ══ 최종 리포트 ══ */
test.afterAll(async () => {
  console.log('\n\n══════════════ 실사테스트 버그 리포트 ══════════════');
  if (BUGS.length === 0) {
    console.log('발견된 버그 없음');
  } else {
    BUGS.forEach(b => console.log(`  [BUG-${b.id}] ${b.title}: ${b.note}`));
  }
  console.log(`\n총 ${BUGS.length}개 버그 발견`);
  fs.writeFileSync(
    path.join(__dirname, '..', 'test-full-result.json'),
    JSON.stringify({ bugs: BUGS, ts: new Date().toISOString() }, null, 2)
  );
});
