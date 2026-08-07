/**
 * FILO·DINE 실사테스트 — Playwright 자동화
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const DEALER_ID = '9XD2K3W1tIhIs6XM74YT0xfRFEP2';
const BASE = 'https://filo.ai.kr';
const SS_DIR = path.join(__dirname, 'test-screenshots');
if (!fs.existsSync(SS_DIR)) fs.mkdirSync(SS_DIR);

const results = [];

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function ss(page, name) {
  const file = path.join(SS_DIR, name + '.png');
  await page.screenshot({ path: file, fullPage: false });
  console.log('  [캡쳐]', name + '.png');
  return file;
}

async function test(label, fn) {
  console.log('\n===', label, '===');
  try {
    await fn();
    console.log('  PASS:', label);
    results.push({ label, status: 'PASS' });
  } catch (e) {
    console.log('  FAIL:', label, '-', e.message.slice(0, 80));
    results.push({ label, status: 'FAIL', error: e.message.slice(0, 120) });
  }
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // ── 1. QR 주문 화면 로드 ──
  await test('QR 주문 페이지 로드', async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ko-KR' });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/order?d=${DEALER_ID}&t=1&name=1번테이블`, { timeout: 20000 });
    await wait(3000);
    await ss(page, '01_qr_order_load');

    const menu = page.locator('.mi, .menu-item, [class*="menu-item"], .menu-card').first();
    await menu.waitFor({ timeout: 10000 });
    await ss(page, '02_qr_order_menu');
    console.log('  메뉴 로드 확인');
    await ctx.close();
  });

  // ── 2. QR 주문 — 장바구니 추가 ──
  await test('QR 주문 장바구니 추가', async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ko-KR' });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/order?d=${DEALER_ID}&t=1&name=1번테이블`, { timeout: 20000 });
    await wait(3000);
    const menu = page.locator('.mi, .menu-item, [class*="menu-item"]').first();
    await menu.waitFor({ timeout: 10000 });
    await menu.click();
    await wait(1000);
    await ss(page, '03_qr_order_cart');
    await ctx.close();
  });

  // ── 3. 번역 기능 ──
  await test('번역 기능 (EN 전환)', async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ko-KR' });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/order?d=${DEALER_ID}&t=1&name=1번테이블`, { timeout: 20000 });
    await wait(3000);
    const enBtn = page.locator('button:has-text("EN"), [data-lang="en"], text=EN').first();
    if (await enBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await enBtn.click();
      await wait(2000);
      await ss(page, '04_translate_en');
      console.log('  EN 번역 버튼 클릭 성공');
    } else {
      await ss(page, '04_translate_no_btn');
      throw new Error('번역 버튼 없음');
    }
    await ctx.close();
  });

  // ── 4. 테이블 주문 (선결제/후불 모달) ──
  await test('테이블 주문 선결제/후불 모달', async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ko-KR' });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/table-order?d=${DEALER_ID}&t=2&name=2번테이블`, { timeout: 20000 });
    await wait(3000);
    await ss(page, '05_table_order_load');

    const menu = page.locator('.mi, .menu-item, [class*="menu"]').first();
    await menu.waitFor({ timeout: 10000 });
    await menu.click();
    await wait(1000);

    const orderBtn = page.locator('#order-btn, [class*="order-btn"], button:has-text("주문")').first();
    if (await orderBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await orderBtn.click();
      await wait(1500);
      await ss(page, '06_table_order_modal');
      // 선결제/후불 버튼 확인
      const prepay = page.locator('button:has-text("선결제"), #btn-prepay').first();
      const postpay = page.locator('button:has-text("후불"), #btn-postpay').first();
      const hasPrepay = await prepay.isVisible({ timeout: 3000 }).catch(() => false);
      const hasPostpay = await postpay.isVisible({ timeout: 3000 }).catch(() => false);
      if (!hasPrepay || !hasPostpay) throw new Error('선결제/후불 버튼 없음');
      console.log('  선결제/후불 모달 확인');
    } else {
      await ss(page, '06_table_order_no_btn');
      throw new Error('주문 버튼 없음');
    }
    await ctx.close();
  });

  // ── 5. 키친 디스플레이 ──
  await test('키친 디스플레이 로드', async () => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/kitchen?d=${DEALER_ID}`, { timeout: 20000 });
    await wait(4000);
    await ss(page, '07_kitchen');
    await ctx.close();
  });

  // ── 6. POS 화면 ──
  await test('POS 화면 로드', async () => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/filo?d=${DEALER_ID}`, { timeout: 20000 });
    await wait(4000);
    await ss(page, '08_pos');
    await ctx.close();
  });

  // ── 7. DINE 직원 출퇴근 ──
  await test('DINE 출퇴근 페이지 로드', async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ko-KR' });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/dine?d=${DEALER_ID}`, { timeout: 20000 });
    await wait(3000);
    await ss(page, '09_dine_staff');
    await ctx.close();
  });

  await browser.close();

  // ── 결과 요약 ──
  console.log('\n\n========== 테스트 결과 ==========');
  let pass = 0, fail = 0;
  for (const r of results) {
    const icon = r.status === 'PASS' ? 'PASS' : 'FAIL';
    console.log(`[${icon}] ${r.label}`);
    if (r.error) console.log(`       → ${r.error}`);
    r.status === 'PASS' ? pass++ : fail++;
  }
  console.log(`\n합계: ${pass} 통과 / ${fail} 실패`);
  console.log('스크린샷:', SS_DIR);
})();
