/**
 * FILO·DINE 홍보 영상 자동 녹화 스크립트
 * 로컬 PC에서 실행: node record-filo-dine.js
 */
const { chromium } = require('playwright');
const path = require('path');

const DEALER_ID = '9XD2K3W1tIhIs6XM74YT0xfRFEP2';
const BASE_URL = 'https://filo.ai.kr';
const OUT_DIR = path.join(__dirname, 'videos');

const fs = require('fs');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR);

async function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function recordScene(browser, name, fn) {
  console.log(`[녹화] ${name} 시작...`);
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 14 Pro 기준
    recordVideo: { dir: OUT_DIR, size: { width: 390, height: 844 } },
    locale: 'ko-KR',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
  });
  const page = await ctx.newPage();
  try {
    await fn(page);
  } catch (e) {
    console.log(`  오류: ${e.message}`);
  }
  await wait(1000);
  await ctx.close();
  // 녹화된 파일 이름 변경
  const files = fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.webm') && !f.startsWith(name));
  if (files.length) {
    const latest = files.sort().reverse()[0];
    fs.renameSync(path.join(OUT_DIR, latest), path.join(OUT_DIR, `${name}.webm`));
  }
  console.log(`[완료] ${name}.webm 저장됨`);
}

(async () => {
  const browser = await chromium.launch({
    headless: false,
    executablePath: process.env.CHROME_PATH || undefined,
    args: ['--no-sandbox']
  });

  // ── Scene 1: QR 주문 흐름 ──
  await recordScene(browser, '01_qr_order', async (page) => {
    await page.goto(`${BASE_URL}/order?d=${DEALER_ID}&t=1&name=1번테이블`);
    await wait(3000);
    // 메뉴 카드 클릭 (첫 번째 메뉴)
    const menuCard = page.locator('.mi, .menu-item, [class*="menu"]').first();
    await menuCard.waitFor({ timeout: 8000 });
    await wait(500);
    await menuCard.click();
    await wait(1000);
    // 수량 추가
    const plusBtn = page.locator('[class*="plus"], button:has-text("+")').first();
    if (await plusBtn.isVisible().catch(() => false)) {
      await plusBtn.click();
      await wait(500);
    }
    await wait(1500);
    // 장바구니 확인
    const cartBtn = page.locator('[class*="cart"], [class*="fab"]').first();
    if (await cartBtn.isVisible().catch(() => false)) {
      await cartBtn.click();
      await wait(1500);
    }
    await wait(2000);
  });

  // ── Scene 2: 테이블 주문 선결제/후불 ──
  await recordScene(browser, '02_table_order', async (page) => {
    await page.goto(`${BASE_URL}/table-order?d=${DEALER_ID}&t=2&name=2번테이블`);
    await wait(3000);
    const menuCard = page.locator('.mi, .menu-item, [class*="menu"]').first();
    await menuCard.waitFor({ timeout: 8000 });
    await menuCard.click();
    await wait(1000);
    const orderBtn = page.locator('#order-btn, [class*="order-btn"]').first();
    if (await orderBtn.isVisible().catch(() => false)) {
      await orderBtn.click();
      await wait(2000); // 선결제/후불 모달
    }
    await wait(2000);
  });

  // ── Scene 3: 키친 디스플레이 ──
  await recordScene(browser, '03_kitchen', async (page) => {
    await page.goto(`${BASE_URL}/kitchen?d=${DEALER_ID}`);
    await wait(5000); // 실시간 주문 대기
    await page.screenshot({ path: path.join(OUT_DIR, '03_kitchen_thumb.png') });
    await wait(3000);
  });

  // ── Scene 4: DINE 직원 출퇴근 ──
  await recordScene(browser, '04_dine_staff', async (page) => {
    await page.goto(`${BASE_URL}/dine?d=${DEALER_ID}`);
    await wait(4000);
    // 직원 탭 클릭 시도
    const staffTab = page.locator('text=직원, text=출퇴근, [data-tab*="staff"]').first();
    if (await staffTab.isVisible().catch(() => false)) {
      await staffTab.click();
      await wait(2000);
    }
    await wait(3000);
  });

  // ── Scene 5: POS 화면 ──
  await recordScene(browser, '05_pos', async (page) => {
    await page.goto(`${BASE_URL}/filo?d=${DEALER_ID}`);
    await wait(4000);
    await page.screenshot({ path: path.join(OUT_DIR, '05_pos_thumb.png') });
    await wait(3000);
  });

  await browser.close();

  console.log('\n=== 녹화 완료 ===');
  console.log('저장 위치:', OUT_DIR);
  console.log('다음 단계: FFmpeg으로 영상 합성');
  console.log('  node make-video.js');
})();
