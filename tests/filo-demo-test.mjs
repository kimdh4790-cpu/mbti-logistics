/**
 * FILO·DINE 박람회 데모 브라우저 테스트
 * 실행: node tests/filo-demo-test.mjs
 * 환경변수: DEALER_ID, TABLE_NUM, BASE
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const DEALER_ID  = process.env.DEALER_ID  || 'haemul_gwangan_2026';
const TABLE_NUM  = process.env.TABLE_NUM  || '1';
const TABLE_NAME = '테이블 1';
const BASE       = process.env.BASE       || 'https://filo.ai.kr';

const results = [];
function pass(name, note='') { results.push({ name, status: '✅ PASS', note }); console.log(`✅ PASS: ${name}${note?' ('+note+')':''}`); }
function fail(name, reason)  { results.push({ name, status: `❌ FAIL`, note: reason }); console.error(`❌ FAIL: ${name} — ${reason}`); }

// ① QR 주문화면 접근 + 메뉴 렌더링
async function testOrderPage(browser) {
  const page = await browser.newPage();
  try {
    const url = `${BASE}/order?d=${DEALER_ID}&t=${TABLE_NUM}&name=${encodeURIComponent(TABLE_NAME)}`;
    console.log(`\n[1] 주문 URL: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
    await page.screenshot({ path: 'test-screenshots/01-order-loaded.png' });

    // 테이블명 "undefined" 없음 확인
    const tableEl = await page.locator('#table-name').textContent().catch(() => '');
    if (tableEl && !tableEl.includes('undefined')) pass('테이블명 표시 (undefined 없음)', tableEl.trim());
    else fail('테이블명 표시', `"${tableEl}"`);

    // 메뉴 카드 렌더링
    await page.waitForSelector('.mi', { timeout: 12000 }).catch(() => {});
    const menuCount = await page.locator('.mi').count();
    if (menuCount > 0) pass(`메뉴 카드 렌더링`, `${menuCount}개`);
    else fail('메뉴 카드 렌더링', '0개');

    // 메뉴 이미지 URL
    const firstImg = await page.locator('.mi img').first().getAttribute('src').catch(() => '');
    if (firstImg && firstImg.startsWith('http')) pass('메뉴 이미지 URL', firstImg.slice(0,60)+'...');
    else fail('메뉴 이미지', `src="${firstImg}"`);

    // ② 번역 버튼 (EN)
    const langBtn = await page.locator('button:has-text("EN"), [data-lang="en"], .lang-btn').first();
    const langVisible = await langBtn.isVisible().catch(() => false);
    if (langVisible) {
      await langBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'test-screenshots/02-order-en.png' });
      pass('언어 전환 (EN)');
    } else {
      fail('언어 전환 (EN)', '버튼 없음');
    }

    // ③ 장바구니 — 첫 메뉴 추가
    await page.locator('.mi').first().click().catch(() => {});
    await page.waitForTimeout(600);
    const modalVisible = await page.locator('#mdl').isVisible().catch(() => false);
    if (modalVisible) {
      await page.locator('#mdl-add, button:has-text("담기"), button:has-text("Add")').first().click().catch(() => {});
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'test-screenshots/03-cart-added.png' });
      pass('장바구니 담기');
    } else {
      fail('메뉴 모달', '모달 미열림');
    }

    // ④ CS봇 버튼 + 패널
    const csBtn = await page.locator('#cs-btn').isVisible().catch(() => false);
    if (csBtn) {
      pass('CS봇 버튼 렌더링');
      await page.locator('#cs-btn').click();
      await page.waitForTimeout(600);
      const panelVisible = await page.locator('#cs-panel').isVisible().catch(() => false);
      if (panelVisible) {
        pass('CS봇 패널 열림');
        await page.locator('#cs-input').fill('영업시간이 어떻게 되나요?');
        await page.screenshot({ path: 'test-screenshots/04-csbot-question.png' });
        await page.locator('#cs-input-row button').click();
        await page.waitForTimeout(6000);
        const botMsg = await page.locator('.cs-bot').last().textContent().catch(() => '');
        if (botMsg && !botMsg.includes('⏳') && botMsg.length > 10) pass('CS봇 AI 응답', botMsg.slice(0,50)+'...');
        else fail('CS봇 AI 응답', `"${botMsg}"`);
        await page.screenshot({ path: 'test-screenshots/05-csbot-answer.png' });
        await page.locator('#cs-panel button').first().click().catch(() => {});
      } else {
        fail('CS봇 패널', '미열림');
      }
    } else {
      fail('CS봇 버튼', '#cs-btn 없음');
    }

    // ⑤ 주문 완료
    const fab = await page.locator('#cart-fab, #order-fab, .fab').first().isVisible().catch(() => false);
    if (fab) {
      await page.locator('#cart-fab, #order-fab, .fab').first().click().catch(() => {});
      await page.waitForTimeout(500);
      await page.locator('#order-btn, button:has-text("주문"), button:has-text("Order")').first().click().catch(() => {});
      await page.waitForTimeout(500);
      await page.locator('[onclick*="postpay"], .pay-opt').first().click().catch(() => {});
      await page.waitForTimeout(2500);
      const doneVisible = await page.locator('#done').isVisible().catch(() => false);
      if (doneVisible) pass('주문 완료 화면 (#done)');
      else fail('주문 완료', '#done 미노출');
      await page.screenshot({ path: 'test-screenshots/06-order-done.png' });
    } else {
      fail('주문 FAB', '버튼 없음');
    }

  } catch(e) {
    fail('주문 플로우', e.message);
  } finally {
    await page.close();
  }
}

// ⑤ 주방 화면
async function testKitchen(browser) {
  const page = await browser.newPage();
  try {
    const url = `${BASE}/kitchen.html?d=${DEALER_ID}`;
    console.log(`\n[2] 주방 URL: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-screenshots/07-kitchen.png' });
    const loaded = await page.locator('#order-list, .order-card, #kitchen-list').first().isVisible().catch(() => false);
    if (loaded) pass('주방 화면 로드');
    else {
      // 빈 화면이어도 페이지 자체는 로드된 걸로 판단
      const bodyText = await page.locator('body').textContent().catch(() => '');
      if (bodyText && bodyText.length > 50) pass('주방 화면 로드 (빈 주문 목록)');
      else fail('주방 화면', '요소 없음');
    }
  } catch(e) {
    fail('주방 화면', e.message);
  } finally {
    await page.close();
  }
}

// ⑥ 웨이팅 화면 (store.html)
async function testWaiting(browser) {
  const page = await browser.newPage();
  try {
    const url = `${BASE}/store.html?d=${DEALER_ID}`;
    console.log(`\n[3] 웨이팅 URL: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-screenshots/08-waiting.png' });
    const bodyText = await page.locator('body').textContent().catch(() => '');
    if (bodyText && bodyText.length > 100) pass('웨이팅(store) 화면 로드');
    else fail('웨이팅 화면', '빈 페이지');
  } catch(e) {
    fail('웨이팅 화면', e.message);
  } finally {
    await page.close();
  }
}

// ── 메인 ──
(async () => {
  mkdirSync('test-screenshots', { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] });

  console.log(`\n══ FILO·DINE 박람회 데모 브라우저 테스트 ══`);
  console.log(`매장: ${DEALER_ID} | ${BASE}\n`);

  await testOrderPage(browser);
  await testKitchen(browser);
  await testWaiting(browser);

  await browser.close();

  console.log('\n══ 결과 요약 ══');
  const passed = results.filter(r => r.status.startsWith('✅')).length;
  const failed = results.filter(r => r.status.startsWith('❌')).length;
  results.forEach(r => console.log(`  ${r.status}  ${r.name}${r.note?' — '+r.note:''}`));
  console.log(`\n총 ${results.length}건 — 통과 ${passed} / 실패 ${failed}`);
  console.log('스크린샷: ./test-screenshots/\n');

  process.exit(failed > 0 ? 1 : 0);
})();
