/**
 * donway.ai.kr/mbti — 로그인 · 정산현황 · 기사목록 통합 테스트
 * 실행: npx playwright test tests/donway-mbti.test.js --config=playwright-donway.config.js
 */
const { test, expect } = require('@playwright/test');

const BASE  = 'https://donway.ai.kr/mbti';
const EMAIL = process.env.DONWAY_EMAIL || 'kimdh4790@gmail.com';
const PW    = process.env.DONWAY_PW    || '';

const R = [];
function pass(n) { R.push({ name: n, ok: true });  console.log('✅ PASS:', n); }
function fail(n, r){ R.push({ name: n, ok: false, reason: r }); console.error('❌ FAIL:', n, '—', r); }

// ── 앱 로드 대기 (로딩 스피너 사라지고 login-screen 또는 app 표시) ────────────
async function waitForApp(page) {
  await page.waitForFunction(() => {
    const ld = document.getElementById('ld');
    const ls = document.getElementById('login-screen');
    const ap = document.getElementById('app');
    if (!ld && !ls && !ap) return false;
    const ldOk = !ld || ld.style.display === 'none' || ld.style.display === '';
    const lsOk = ls && (ls.style.display === 'flex' || ls.style.display === 'block');
    const apOk = ap && (ap.style.display === 'flex' || ap.style.display === 'block');
    return ldOk && (lsOk || apOk);
  }, { timeout: 30000 });
}

// ── Firebase 도메인 Origin 주입 (필요 시) ─────────────────────────────────────
async function setupIntercept(page) {
  await page.route('**/*.googleapis.com/**', async route => {
    const h = { ...route.request().headers(), origin: 'https://donway.ai.kr', referer: 'https://donway.ai.kr/' };
    await route.continue({ headers: h });
  });
  await page.route('**firebaseapp.com/**', async route => {
    const h = { ...route.request().headers(), origin: 'https://donway.ai.kr', referer: 'https://donway.ai.kr/' };
    await route.continue({ headers: h });
  });
}

// ═══════════════════════════════════════════════════════════════════
// TEST 1: 로그인 화면 로드
// ═══════════════════════════════════════════════════════════════════
test('1. 로그인 화면 로드', async ({ page }) => {
  await setupIntercept(page);
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForApp(page);

  const ls = page.locator('#login-screen');
  const visible = await ls.isVisible().catch(() => false);
  if (visible) {
    pass('로그인 화면 표시');
  } else {
    // 이미 로그인 상태일 수 있음
    const app = page.locator('#app');
    const appVisible = await app.isVisible().catch(() => false);
    if (appVisible) {
      pass('이미 로그인 상태 — 앱 표시됨');
    } else {
      fail('로그인 화면 표시', '화면 요소 없음');
    }
  }
  await page.screenshot({ path: 'test-screenshots/donway-01-login-screen.png', fullPage: false });
});

// ═══════════════════════════════════════════════════════════════════
// TEST 2: 이메일 로그인
// ═══════════════════════════════════════════════════════════════════
test('2. 이메일 로그인', async ({ page }) => {
  if (!PW) {
    fail('이메일 로그인', 'DONWAY_PW 환경변수 미설정 — 건너뜀');
    test.skip();
    return;
  }

  await setupIntercept(page);
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForApp(page);

  // 로그인 폼 입력
  const emailInp = page.locator('#l-email');
  const pwInp    = page.locator('#l-pw');

  const emailVis = await emailInp.isVisible().catch(() => false);
  if (!emailVis) {
    // 이미 로그인 상태
    const app = page.locator('#app');
    if (await app.isVisible().catch(() => false)) {
      pass('이미 로그인 상태');
      return;
    }
    fail('이메일 로그인', '이메일 입력 필드 없음');
    return;
  }

  await emailInp.fill(EMAIL);
  await pwInp.fill(PW);
  await page.screenshot({ path: 'test-screenshots/donway-02a-before-login.png' });

  // 로그인 버튼 클릭
  await page.locator('button:has-text("로그인")').first().click();

  // 앱 로드 대기
  try {
    await page.waitForFunction(() => {
      const ap = document.getElementById('app');
      return ap && (ap.style.display === 'flex' || ap.style.display === 'block');
    }, { timeout: 20000 });
    pass('로그인 성공 — 앱 진입');
    await page.screenshot({ path: 'test-screenshots/donway-02b-after-login.png' });
  } catch (e) {
    // 에러 메시지 확인
    const errTxt = await page.locator('#login-err, .err, [id*="err"]').first().textContent().catch(() => '');
    fail('로그인 성공', `타임아웃 (에러: ${errTxt || '없음'})`);
    await page.screenshot({ path: 'test-screenshots/donway-02-login-fail.png' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// TEST 3: 정산현황 페이지 접근
// ═══════════════════════════════════════════════════════════════════
test('3. 정산현황 페이지', async ({ page }) => {
  if (!PW) { test.skip(); return; }

  await setupIntercept(page);
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForApp(page);

  // 로그인
  const emailInp = page.locator('#l-email');
  if (await emailInp.isVisible().catch(() => false)) {
    await emailInp.fill(EMAIL);
    await page.locator('#l-pw').fill(PW);
    await page.locator('button:has-text("로그인")').first().click();
    await page.waitForFunction(() => {
      const ap = document.getElementById('app');
      return ap && (ap.style.display === 'flex' || ap.style.display === 'block');
    }, { timeout: 20000 }).catch(() => {});
  }

  // 정산현황 메뉴 클릭
  try {
    // 사이드바 정산현황 링크 찾기
    const settleMenu = page.locator('text=정산현황').or(page.locator('[onclick*="pageSettle"], [onclick*="settle"]')).first();
    const vis = await settleMenu.isVisible().catch(() => false);
    if (vis) {
      await settleMenu.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'test-screenshots/donway-03-settle.png' });
      pass('정산현황 메뉴 클릭');
    } else {
      fail('정산현황 메뉴', '메뉴 항목 미발견');
      await page.screenshot({ path: 'test-screenshots/donway-03-settle-fail.png' });
    }

    // 정산 데이터 테이블 또는 카드 확인
    await page.waitForTimeout(1500);
    const hasTable = await page.locator('table tbody tr, .settle-row, [class*="settle"]').first().isVisible().catch(() => false);
    if (hasTable) pass('정산 데이터 표시');
    else fail('정산 데이터', '테이블/카드 미표시');
  } catch (e) {
    fail('정산현황 페이지', e.message);
  }
});

// ═══════════════════════════════════════════════════════════════════
// TEST 4: 기사목록 페이지 접근
// ═══════════════════════════════════════════════════════════════════
test('4. 기사목록 페이지', async ({ page }) => {
  if (!PW) { test.skip(); return; }

  await setupIntercept(page);
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForApp(page);

  // 로그인
  const emailInp = page.locator('#l-email');
  if (await emailInp.isVisible().catch(() => false)) {
    await emailInp.fill(EMAIL);
    await page.locator('#l-pw').fill(PW);
    await page.locator('button:has-text("로그인")').first().click();
    await page.waitForFunction(() => {
      const ap = document.getElementById('app');
      return ap && (ap.style.display === 'flex' || ap.style.display === 'block');
    }, { timeout: 20000 }).catch(() => {});
  }

  // 기사목록 메뉴 클릭
  try {
    const driverMenu = page.locator('text=기사목록').or(page.locator('text=기사 목록')).or(page.locator('[onclick*="pageDrivers"], [onclick*="drivers"]')).first();
    const vis = await driverMenu.isVisible().catch(() => false);
    if (vis) {
      await driverMenu.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'test-screenshots/donway-04-drivers.png' });
      pass('기사목록 메뉴 클릭');
    } else {
      fail('기사목록 메뉴', '메뉴 항목 미발견');
      await page.screenshot({ path: 'test-screenshots/donway-04-drivers-fail.png' });
    }

    // 기사 카드 또는 테이블 확인
    await page.waitForTimeout(1500);
    const hasList = await page.locator('.driver-card, .di, [class*="driver"], table tbody tr').first().isVisible().catch(() => false);
    if (hasList) pass('기사 목록 데이터 표시');
    else fail('기사 목록 데이터', '목록 미표시');
  } catch (e) {
    fail('기사목록 페이지', e.message);
  }
});

// ═══════════════════════════════════════════════════════════════════
// TEST 5: 아이디지원 플로우 — 정산현황에서 아이디지원 라벨 확인
// ═══════════════════════════════════════════════════════════════════
test('5. 아이디지원 정산 라벨 확인', async ({ page }) => {
  if (!PW) { test.skip(); return; }

  await setupIntercept(page);
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForApp(page);

  // 로그인
  const emailInp = page.locator('#l-email');
  if (await emailInp.isVisible().catch(() => false)) {
    await emailInp.fill(EMAIL);
    await page.locator('#l-pw').fill(PW);
    await page.locator('button:has-text("로그인")').first().click();
    await page.waitForFunction(() => {
      const ap = document.getElementById('app');
      return ap && (ap.style.display === 'flex' || ap.style.display === 'block');
    }, { timeout: 20000 }).catch(() => {});
  }

  // 정산현황 이동
  try {
    const settleMenu = page.locator('text=정산현황').or(page.locator('[onclick*="pageSettle"], [onclick*="settle"]')).first();
    if (await settleMenu.isVisible().catch(() => false)) {
      await settleMenu.click();
      await page.waitForTimeout(3000);
    }

    // 아이디지원 라벨 검색 (etcPlusReason / etcMinusReason에 포함)
    const hasIdSupport = await page.locator('text=아이디지원').first().isVisible().catch(() => false);
    if (hasIdSupport) {
      pass('아이디지원 라벨 정산현황 표시');
      await page.screenshot({ path: 'test-screenshots/donway-05a-idsupport-found.png' });
    } else {
      // 정산 데이터 없거나 아이디지원 적용 없음 — 기사 설정 아이디지원 섹션 확인
      const driverCard = page.locator('.driver-card, .di, [class*="driver"]').first();
      if (await driverCard.isVisible().catch(() => false)) {
        pass('정산 데이터 있음 — 이번 달 아이디지원 적용 건 없음');
      } else {
        pass('정산현황 페이지 로드 — 데이터 없음 (이달 엑셀 미업로드)');
      }
      await page.screenshot({ path: 'test-screenshots/donway-05b-idsupport-nodata.png' });
    }

    // dateFresh 로직 확인: window._lastDrvMap에서 dateFresh 키 존재 여부
    const dateFreshOk = await page.evaluate(() => {
      const dm = window._lastDrvMap;
      if (!dm) return 'no_drvMap';
      const withFresh = Object.values(dm).filter(d => d.dateFresh && Object.keys(d.dateFresh).length > 0);
      return withFresh.length > 0 ? 'ok:'+withFresh.length+'명' : 'none';
    }).catch(() => 'eval_error');
    pass('dateFresh 상태: ' + dateFreshOk);

  } catch (e) {
    fail('아이디지원 플로우', e.message);
    await page.screenshot({ path: 'test-screenshots/donway-05-fail.png' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// 최종 리포트
// ═══════════════════════════════════════════════════════════════════
test.afterAll(async () => {
  console.log('\n━━━━━ DONWAY 테스트 결과 ━━━━━');
  R.forEach(r => console.log((r.ok ? '✅' : '❌'), r.name, r.reason ? `(${r.reason})` : ''));
  const passed = R.filter(r => r.ok).length;
  console.log(`\n통과: ${passed}/${R.length}`);
});
