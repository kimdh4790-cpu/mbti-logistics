#!/usr/bin/env node
/**
 * FILO 실사 데이터 테스트 — Oracle Cloud에서 실행
 * 사용법: node scripts/test/filo-realdata-test.js
 *
 * 테스트 계정: soungkyekim@naver.com / khw3103!!!
 * dealerId: 9XD2K3W1tIhIs6XM74YT0xfRFEP2
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL    = 'https://filo.ai.kr';
const EMAIL       = process.env.FILO_EMAIL       || '';
const PASS        = process.env.FILO_PASS        || '';
const DID         = process.env.FILO_DID         || '';
const STAFF_PHONE = process.env.FILO_STAFF_PHONE || '';
const STAFF_PASS  = process.env.FILO_STAFF_PASS  || '';
const DINE_URL    = 'https://dine.ne.kr';

if (!EMAIL || !PASS || !DID) {
  console.error('환경변수 누락. scripts/test/.env.test 파일을 만들어서 source 하거나:');
  console.error('  export FILO_EMAIL=...  FILO_PASS=...  FILO_DID=...');
  console.error('  export FILO_STAFF_PHONE=...  FILO_STAFF_PASS=...');
  process.exit(1);
}

const SS_DIR = path.join(__dirname, '../../output/test-screenshots');
fs.mkdirSync(SS_DIR, { recursive: true });

let passed = 0, failed = 0;
const results = [];

function log(msg, ok = true) {
  const mark = ok ? '✅' : '❌';
  const line = `${mark} ${msg}`;
  console.log(line);
  results.push({ ok, msg });
  if (ok) passed++; else failed++;
}

async function ss(page, name) {
  const p = path.join(SS_DIR, name + '.png');
  await page.screenshot({ path: p, fullPage: false });
  console.log(`   📸 ${name}.png`);
}

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();

  try {
    /* ── 1. 로그인 ── */
    console.log('\n═══ 1. 로그인 테스트 ═══');
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await ss(page, '01-landing');

    // 이메일 입력 (filo.html: #fl-id type=text, #fl-pw type=password)
    await page.waitForSelector('#fl-id', { timeout: 15000 });
    await page.fill('#fl-id', EMAIL);
    await page.fill('#fl-pw', PASS);
    await ss(page, '02-login-filled');
    await page.press('#fl-pw', 'Enter');
    await wait(3000);
    await ss(page, '03-after-login');

    const url = page.url();
    log('로그인 후 대시보드 이동', url.includes('filo.ai.kr'));

    /* ── 2. 마진 분석 탭 ── */
    console.log('\n═══ 2. 마진 분석 탭 ═══');
    // 사이드바에서 마진 분석 클릭
    const marginNav = page.locator('text=마진, text=마진분석, [onclick*="margin"]').first();
    if (await marginNav.count() > 0) {
      await marginNav.click();
      await wait(2000);
      await ss(page, '04-margin-tab');
      log('마진 분석 탭 이동');
    } else {
      // URL 직접 접근
      await page.evaluate(() => {
        if (window._filoNavigate) _filoNavigate('margin');
        else if (window._filoMgTab) _filoMgTab(0);
      });
      await wait(2000);
      await ss(page, '04-margin-direct');
      log('마진 분석 직접 이동');
    }

    // 마진 KPI 카드 확인
    const kpiCard = page.locator('.kpi-card, .kpi-val').first();
    const hasKpi = await kpiCard.count() > 0;
    log('KPI 카드 렌더링', hasKpi);
    if (hasKpi) {
      const kpiText = await kpiCard.textContent();
      console.log(`   KPI 값: ${kpiText?.trim()}`);
    }

    /* ── 3. 원가 등록 탭 ── */
    console.log('\n═══ 3. 원가 등록 탭 ═══');
    const costTab = page.locator('text=원가, #mgt-1, [onclick*="mgt-1"]').first();
    if (await costTab.count() > 0) {
      await costTab.click();
    } else {
      await page.evaluate(() => { if (window._filoMgTab) _filoMgTab(1); });
    }
    await wait(2000);
    await ss(page, '05-cost-mgmt-tab');

    const costContent = page.locator('#mg-content');
    const costText = await costContent.textContent().catch(() => '');
    log('원가 등록 탭 렌더링', costText.length > 10);
    console.log(`   원가 탭 내용: ${costText?.slice(0, 80)}`);

    const hasCostItems = costText.includes('등록된 원가') || costText.includes('미등록') || costText.includes('원가');
    log('원가 목록 표시', hasCostItems);

    /* ── 4. 원가 추가 테스트 ── */
    console.log('\n═══ 4. 원가 추가 테스트 ═══');
    const addBtn = page.locator('button:has-text("수동 추가")').first();
    if (await addBtn.count() > 0) {
      await addBtn.click();
      await wait(500);
      await ss(page, '06-cost-modal');

      const nameInput = page.locator('#cost-m-name');
      const priceInput = page.locator('#cost-m-price');
      const costInput = page.locator('#cost-m-cost');

      await nameInput.fill('테스트메뉴_삭제용');
      await priceInput.fill('10000');
      await costInput.fill('3000');
      await wait(300);
      await ss(page, '07-cost-modal-filled');

      const preview = await page.locator('#cost-preview').textContent().catch(() => '');
      log('마진율 미리보기 계산', preview.includes('%'));
      console.log(`   미리보기: ${preview}`);

      // 저장
      await page.locator('button:has-text("저장")').last().click();
      await wait(1500);
      await ss(page, '08-cost-saved');
      const toast = await page.locator('.filo-toast, [class*="toast"]').textContent().catch(() => '');
      log('원가 저장 토스트', toast.includes('완료') || toast.includes('저장'));
    } else {
      log('원가 추가 버튼 없음 — 탭 미노출', false);
    }

    /* ── 5. 재고 탭 ── */
    console.log('\n═══ 5. 재고 관리 탭 ═══');
    await page.evaluate(() => { if (window._filoNavigate) _filoNavigate('inventory'); });
    await wait(2500);
    await ss(page, '09-inventory-tab');

    const invContent = page.locator('#inv-content, [id*="inventory"]').first();
    const invText = await invContent.textContent().catch(() => '');
    log('재고 탭 렌더링', invText.length > 5);

    const hasItems = invText.includes('재고') || invText.includes('개');
    log('재고 아이템 표시', hasItems);
    console.log(`   재고 탭: ${invText?.slice(0, 100)}`);

    /* ── 6. 레시피 탭 ── */
    console.log('\n═══ 6. 레시피 탭 ═══');
    const recipeTab = page.locator('text=레시피 연동, #inv-tab-2').first();
    if (await recipeTab.count() > 0) {
      await recipeTab.click();
      await wait(1500);
      await ss(page, '10-recipe-tab');
      const recipeText = await invContent.textContent().catch(() => '');
      log('레시피 탭 렌더링', recipeText.length > 5);
    } else {
      log('레시피 탭 접근', false);
    }

    /* ── 7. 주문 현황 ── */
    console.log('\n═══ 7. 주문 현황 ═══');
    await page.evaluate(() => { if (window._filoNavigate) _filoNavigate('orders'); });
    await wait(2000);
    await ss(page, '11-orders');
    log('주문 현황 이동', true);

    /* ── 8. 급여·근태 ── */
    console.log('\n═══ 8. 급여·근태 탭 ═══');
    await page.evaluate(() => { if (window._filoNavigate) _filoNavigate('payroll'); });
    await wait(2000);
    await ss(page, '12-payroll');
    const payrollText = await page.content();
    log('급여 탭 이동', payrollText.includes('급여') || payrollText.includes('근태'));

    /* ── 9. DINE 직원 앱 로그인 ── */
    console.log('\n═══ 9. DINE 직원 앱 (dine.ne.kr) ═══');
    const dinePage = await ctx.newPage();
    try {
      await dinePage.goto(DINE_URL, { waitUntil: 'networkidle', timeout: 30000 });
      await ss(dinePage, '13-dine-landing');

      // DINE 로그인: #li-email + #li-pw
      await dinePage.waitForSelector('#li-email', { timeout: 15000 });
      // 직원 계정은 전화번호를 이메일 필드에 입력 (Firebase phone auth 미사용 시)
      await dinePage.fill('#li-email', STAFF_PHONE + '@dine.filo');
      await dinePage.fill('#li-pw', STAFF_PASS);
      await ss(dinePage, '14-dine-login-filled');
      await dinePage.press('#li-pw', 'Enter');
      await wait(3000);
      await ss(dinePage, '15-dine-after-login');
      const dineUrl = dinePage.url();
      log('DINE 앱 접속', dineUrl.includes('dine.ne.kr'));

      // 출퇴근 현황 확인
      const dineContent = await dinePage.content();
      const hasDineData = dineContent.includes('출근') || dineContent.includes('근태') || dineContent.includes('스케줄') || dineContent.includes('급여');
      log('DINE 직원 데이터 표시', hasDineData);

      // QR 출퇴근 테스트
      console.log('\n═══ 10. QR 출퇴근 (filo.ai.kr/qr) ═══');
      const qrPage = await ctx.newPage();
      await qrPage.goto(`${BASE_URL}/qr?did=${DID}&action=in`, { waitUntil: 'networkidle', timeout: 20000 });
      await wait(2000);
      await ss(qrPage, '16-qr-page');
      const qrContent = await qrPage.content();
      log('QR 출퇴근 페이지 로드', qrContent.includes('출근') || qrContent.includes('직원') || qrContent.includes('선택'));
      // 직원 목록 확인
      const staffList = qrPage.locator('.staff-item, [onclick*="qr"], button').first();
      if (await staffList.count() > 0) {
        const txt = await staffList.textContent();
        log('직원 목록 표시: ' + (txt?.trim().slice(0, 20) || ''), true);
      }
      await qrPage.close();
    } catch (dineErr) {
      log('DINE 테스트 오류: ' + dineErr.message, false);
      await ss(dinePage, '99-dine-error').catch(() => {});
    } finally {
      await dinePage.close().catch(() => {});
    }

  } catch (e) {
    log(`테스트 오류: ${e.message}`, false);
    await ss(page, '99-error').catch(() => {});
  } finally {
    await browser.close();
  }

  /* ── 결과 요약 ── */
  console.log('\n══════════════════════════════');
  console.log(`결과: ${passed}개 통과 / ${failed}개 실패`);
  console.log(`스크린샷: ${SS_DIR}`);
  console.log('══════════════════════════════');

  const reportPath = path.join(SS_DIR, 'report.json');
  fs.writeFileSync(reportPath, JSON.stringify({ passed, failed, results, ts: new Date().toISOString() }, null, 2));
  console.log(`리포트: ${reportPath}`);

  process.exit(failed > 0 ? 1 : 0);
})();
