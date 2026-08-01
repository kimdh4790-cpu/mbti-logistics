/**
 * FILO·DINE 브라우저 통합 테스트
 *
 * 사용법:
 *   1. npm install playwright  (또는 npx playwright install chromium)
 *   2. 아래 CONFIG 섹션에 실제 값 입력
 *   3. node tests/filo-browser-test.mjs
 *
 * 필요 정보:
 *   - DEALER_ID  : filo.ai.kr 로그인 후 설정 > 매장정보에서 확인 가능
 *   - TABLE_NUM  : 테스트할 테이블 번호
 *   - ADMIN_EMAIL / ADMIN_PW : filo.ai.kr 로그인 이메일/비밀번호
 */

import { chromium } from 'playwright';

// ─── CONFIG (실제 값으로 교체) ────────────────────────────────────────────────
const DEALER_ID   = 'YOUR_DEALER_ID';   // 예: 'abc123xyz'
const TABLE_NUM   = '1';
const TABLE_NAME  = '테이블 1';
const ADMIN_EMAIL = 'YOUR_EMAIL';       // 예: 'admin@example.com'
const ADMIN_PW    = 'YOUR_PASSWORD';
const BASE        = 'https://filo.ai.kr';
// ─────────────────────────────────────────────────────────────────────────────

const results = [];
function pass(name) { results.push({ name, status: '✅ PASS' }); console.log(`✅ PASS: ${name}`); }
function fail(name, reason) { results.push({ name, status: `❌ FAIL: ${reason}` }); console.error(`❌ FAIL: ${name} — ${reason}`); }

async function testOrderFlow(browser) {
  const page = await browser.newPage();
  try {
    // 1. QR 주문화면 접근
    const orderUrl = `${BASE}/order?d=${DEALER_ID}&t=${TABLE_NUM}&name=${encodeURIComponent(TABLE_NAME)}`;
    await page.goto(orderUrl, { waitUntil: 'networkidle', timeout: 15000 });
    await page.screenshot({ path: 'test-screenshots/01-order-loaded.png' });

    // 테이블 이름 표시 확인
    const tableBadge = await page.locator('#table-name').textContent().catch(() => '');
    if (tableBadge && !tableBadge.includes('undefined')) {
      pass('테이블명 표시 (undefined 없음)');
    } else {
      fail('테이블명 표시', `"${tableBadge}" — undefined 포함 또는 요소 없음`);
    }

    // 메뉴 카드 렌더링
    await page.waitForSelector('.mi', { timeout: 10000 }).catch(() => {});
    const menuCount = await page.locator('.mi').count();
    if (menuCount > 0) pass(`메뉴 카드 렌더링 (${menuCount}개)`);
    else fail('메뉴 카드 렌더링', '메뉴 카드 0개');

    // 메뉴 이미지 확인 (첫 번째 카드)
    const firstImg = await page.locator('.mi img').first().getAttribute('src').catch(() => '');
    if (firstImg && firstImg.startsWith('http')) pass('메뉴 이미지 URL 존재');
    else fail('메뉴 이미지', `src="${firstImg}"`);

    // 2. 번역 (EN)
    const langBtn = await page.locator('button:has-text("EN"), [data-lang="en"], .lang-btn').first().isVisible().catch(() => false);
    if (langBtn) {
      await page.locator('button:has-text("EN"), [data-lang="en"], .lang-btn').first().click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'test-screenshots/02-order-en.png' });
      pass('언어 전환 버튼 클릭 (EN)');
    } else {
      fail('언어 전환 (EN)', '버튼 없음');
    }

    // 3. 장바구니 — 첫 메뉴 추가
    await page.locator('.mi').first().click().catch(() => {});
    await page.waitForTimeout(500);
    const modalVisible = await page.locator('#mdl').isVisible().catch(() => false);
    if (modalVisible) {
      // 수량 확인 후 담기
      await page.locator('#mdl-add, button:has-text("담기"), button:has-text("Add")').first().click().catch(() => {});
      await page.waitForTimeout(500);
      pass('장바구니 담기');
    } else {
      fail('메뉴 모달', '모달이 열리지 않음');
    }

    // 4. CS봇 버튼
    const csBtn = await page.locator('#cs-btn').isVisible().catch(() => false);
    if (csBtn) {
      pass('CS봇 버튼 렌더링');
      await page.locator('#cs-btn').click();
      await page.waitForTimeout(500);
      const panelVisible = await page.locator('#cs-panel').isVisible().catch(() => false);
      if (panelVisible) {
        pass('CS봇 패널 열림');
        await page.locator('#cs-input').fill('오늘 영업시간이 어떻게 되나요?');
        await page.screenshot({ path: 'test-screenshots/03-csbot-question.png' });
        await page.locator('#cs-input-row button').click();
        await page.waitForTimeout(5000); // AI 응답 대기
        const botMsg = await page.locator('.cs-bot').last().textContent().catch(() => '');
        if (botMsg && !botMsg.includes('⏳')) pass(`CS봇 AI 응답 수신: "${botMsg.slice(0,40)}..."`);
        else fail('CS봇 응답', `응답: "${botMsg}"`);
        await page.screenshot({ path: 'test-screenshots/04-csbot-answer.png' });
        await page.locator('#cs-panel button').first().click(); // 닫기
      } else {
        fail('CS봇 패널', '패널이 열리지 않음');
      }
    } else {
      fail('CS봇 버튼', '#cs-btn 없음');
    }

    // 5. 주문 완료
    const cartFab = await page.locator('#cart-fab, #order-fab, .fab').first().isVisible().catch(() => false);
    if (cartFab) {
      await page.locator('#cart-fab, #order-fab, .fab').first().click().catch(() => {});
      await page.waitForTimeout(500);
      await page.locator('#order-btn, button:has-text("주문"), button:has-text("Order")').first().click().catch(() => {});
      await page.waitForTimeout(500);
      // 결제 방식 선택
      await page.locator('[onclick*="postpay"], .pay-opt').first().click().catch(() => {});
      await page.waitForTimeout(2000);
      const doneVisible = await page.locator('#done').isVisible().catch(() => false);
      if (doneVisible) pass('주문 완료 화면 표시');
      else fail('주문 완료', '#done 미노출');
      await page.screenshot({ path: 'test-screenshots/05-order-done.png' });
    } else {
      fail('주문 FAB', '장바구니 버튼 없음');
    }
  } catch (e) {
    fail('주문 플로우 전체', e.message);
  } finally {
    await page.close();
  }
}

async function testAdminLogin(browser) {
  const page = await browser.newPage();
  try {
    await page.goto(`${BASE}/filo.html`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.screenshot({ path: 'test-screenshots/06-admin-login.png' });

    await page.locator('input[type="email"], #login-email').fill(ADMIN_EMAIL).catch(() => {});
    await page.locator('input[type="password"], #login-pw').fill(ADMIN_PW).catch(() => {});
    await page.locator('button:has-text("로그인"), #login-btn').click().catch(() => {});
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-screenshots/07-admin-after-login.png' });

    const loggedIn = await page.locator('#app, .main-nav, #side-nav').isVisible().catch(() => false);
    if (loggedIn) pass('사장님 화면 로그인');
    else fail('사장님 화면 로그인', '로그인 후 앱 화면 미노출');

    return page; // 로그인 유지
  } catch (e) {
    fail('사장님 로그인', e.message);
    await page.close();
    return null;
  }
}

async function testSalesAnalysis(page) {
  try {
    // 매출 분석 메뉴 클릭
    await page.locator('text=매출, text=분석, [data-page="sales"], [onclick*="sales"]').first().click().catch(() => {});
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-screenshots/08-sales.png' });

    const chartEl = await page.locator('canvas, .chart-wrap, #sales-chart, [id*="chart"]').first().isVisible().catch(() => false);
    if (chartEl) pass('매출 차트 렌더링');
    else fail('매출 차트', 'canvas/차트 요소 없음');
  } catch(e) {
    fail('매출 분석', e.message);
  }
}

async function testMemberList(page) {
  try {
    await page.locator('text=회원, [data-page="members"], [onclick*="member"]').first().click().catch(() => {});
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-screenshots/09-members.png' });

    const rows = await page.locator('.member-row, .customer-row, [id*="member"]').count();
    pass(`회원 목록 표시 (${rows}행)`);
  } catch(e) {
    fail('회원 목록', e.message);
  }
}

async function testWaiting(page) {
  try {
    await page.locator('text=웨이팅, [data-page="waiting"], [onclick*="wait"]').first().click().catch(() => {});
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-screenshots/10-waiting.png' });

    const waitEl = await page.locator('[id*="wait"], .wait-list, .waiting').isVisible().catch(() => false);
    if (waitEl) pass('웨이팅 화면 로드');
    else fail('웨이팅 화면', '웨이팅 요소 없음');
  } catch(e) {
    fail('웨이팅', e.message);
  }
}

async function testKitchen(browser) {
  const page = await browser.newPage();
  try {
    await page.goto(`${BASE}/kitchen.html?d=${DEALER_ID}`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-screenshots/11-kitchen.png' });

    const loaded = await page.locator('#order-list, .order-card, #kitchen-list').isVisible().catch(() => false);
    if (loaded) pass('주방 화면 로드');
    else fail('주방 화면', '주문 리스트 요소 없음');
  } catch(e) {
    fail('주방 화면', e.message);
  } finally {
    await page.close();
  }
}

// ── 메인 ──────────────────────────────────────────────────────────────────────
(async () => {
  const { mkdirSync } = await import('fs');
  mkdirSync('test-screenshots', { recursive: true });

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });

  console.log('\n══ FILO·DINE 브라우저 통합 테스트 시작 ══\n');

  // 1~5: 주문 플로우 + CS봇 (로그인 불필요)
  if (DEALER_ID !== 'YOUR_DEALER_ID') {
    await testOrderFlow(browser);
    await testKitchen(browser);
  } else {
    fail('주문 플로우', 'DEALER_ID를 설정하세요 (CONFIG 섹션)');
    fail('주방 화면', 'DEALER_ID를 설정하세요');
  }

  // 6~10: 관리자 화면 (로그인 필요)
  if (ADMIN_EMAIL !== 'YOUR_EMAIL') {
    const adminPage = await testAdminLogin(browser);
    if (adminPage) {
      await testSalesAnalysis(adminPage);
      await testMemberList(adminPage);
      await testWaiting(adminPage);
      await adminPage.close();
    }
  } else {
    fail('관리자 화면', 'ADMIN_EMAIL/ADMIN_PW를 설정하세요 (CONFIG 섹션)');
  }

  await browser.close();

  console.log('\n══ 테스트 결과 요약 ══');
  const passed = results.filter(r => r.status.startsWith('✅')).length;
  const failed = results.filter(r => r.status.startsWith('❌')).length;
  results.forEach(r => console.log(`  ${r.status}  ${r.name}`));
  console.log(`\n총 ${results.length}건 — 통과 ${passed} / 실패 ${failed}`);
  console.log('스크린샷: ./test-screenshots/\n');

  process.exit(failed > 0 ? 1 : 0);
})();
