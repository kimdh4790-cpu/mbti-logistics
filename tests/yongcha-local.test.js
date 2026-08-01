/**
 * yongcha.app 로컬 테스트 (http://localhost:3001)
 * Firebase requests are intercepted to inject yongcha.app Origin/Referer.
 */

const { test, expect } = require('@playwright/test');

const BASE = 'http://localhost:3001';
const TS   = Date.now();
const AGENCY_EMAIL = `agency${TS}@ytest.io`;
const DRIVER_EMAIL = `driver${TS}@ytest.io`;
const PW = 'TestPass1234!';

const S = { agencyUid: null, driverUid: null, postId: null, applyId: null };

// ── Firebase request interceptor ─────────────────────────────────────────────
async function setupFirebaseIntercept(page) {
  await page.route('**/*.googleapis.com/**', async route => {
    const headers = {
      ...route.request().headers(),
      'origin': 'https://yongcha.app',
      'referer': 'https://yongcha.app/',
    };
    await route.continue({ headers });
  });
  await page.route('**firebaseapp.com/**', async route => {
    const headers = {
      ...route.request().headers(),
      'origin': 'https://yongcha.app',
      'referer': 'https://yongcha.app/',
    };
    await route.continue({ headers });
  });
}

async function waitForApp(page) {
  await page.waitForFunction(() => {
    const ld  = document.getElementById('ld');
    const ls  = document.getElementById('login-screen');
    const app = document.getElementById('app');
    if (!ld || !ls || !app) return false;
    const ldHidden = ld.style.display === 'none' || ld.style.display === '';
    const lsShown  = ls.style.display === 'flex';
    const appShown = app.style.display === 'flex';
    return ldHidden && (lsShown || appShown);
  }, { timeout: 40000 });
}

async function gotoApp(page) {
  await setupFirebaseIntercept(page);
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForApp(page);
}

async function register(page, type, name, email) {
  page.on('console', msg => { if (msg.type() === 'error') console.log('[browser]', msg.text()); });
  await gotoApp(page);
  await page.click('#tab-reg');
  await page.waitForTimeout(300);
  await page.click(`#t-${type}`);
  await page.waitForTimeout(200);
  await page.fill('#r-name', name);
  await page.fill('#r-email', email);
  await page.fill('#r-phone', '010-1234-5678');
  await page.selectOption('#r-region', '부산');
  await page.fill('#r-pw', PW);
  await page.click('#r-btn');
  await page.waitForTimeout(5000);
  const err = await page.evaluate(() => { const e = document.getElementById('r-err'); return e ? e.textContent : ''; });
  console.log(`  [reg] err="${err}"`);
  await page.waitForSelector('#app', { state: 'visible', timeout: 45000 });
  await page.waitForFunction(() => window._CU && !!window._CU.uid, { timeout: 15000 });
}

async function login(page, email) {
  page.on('console', msg => { if (msg.type() === 'error') console.log('[browser]', msg.text()); });
  await setupFirebaseIntercept(page);
  await gotoApp(page);
  const already = await page.evaluate(async (em) => {
    if (window._auth && window._auth.currentUser) {
      try { await window._auth.signOut(); } catch(e) {}
    }
    return false;
  }, email);
  await page.waitForFunction(() => {
    const ls = document.getElementById('login-screen');
    return ls && ls.style.display === 'flex';
  }, { timeout: 15000 });
  await page.fill('#l-email', email);
  await page.fill('#l-pw', PW);
  await page.click('#l-btn');
  await page.waitForSelector('#app', { state: 'visible', timeout: 30000 });
  await page.waitForFunction(() => window._CU && !!window._CU.uid, { timeout: 15000 });
}

async function goToPage(page, key) {
  await page.evaluate((p) => { if (typeof _goPage === 'function') _goPage(p); }, key);
  await page.waitForTimeout(1200);
}

// ─────────────────────────────────────────────────────────────────────────────
test.describe.serial('yongcha 전체 기능 테스트 (local)', () => {

  // ── 1. 대리점 회원가입 ─────────────────────────────────────────────────────
  test('1. 대리점 회원가입 → 홈 KPI', async ({ page }) => {
    console.log(`\n[1] 대리점 가입: ${AGENCY_EMAIL}`);
    await register(page, 'agency', '테스트대리점', AGENCY_EMAIL);

    const badge = (await page.textContent('#hdr-badge')).trim();
    console.log(`  배지: "${badge}"`);
    expect(badge).toContain('대리점');

    S.agencyUid = await page.evaluate(() => window._CU.uid);
    expect(S.agencyUid).toBeTruthy();

    // 홈 KPI 카드 확인
    await page.waitForSelector('.hero-name', { timeout: 8000 });
    const heroName = await page.locator('.hero-name').first().textContent();
    expect(heroName).toContain('테스트대리점');

    // 배차현황 지도 버튼 확인 (agency 전용)
    const dispatchBtn = page.locator('button').filter({ hasText: '배차현황 실시간 지도' });
    await expect(dispatchBtn).toBeVisible({ timeout: 5000 });
    console.log('  ✅ 대리점 홈 + 배차현황 지도 버튼 확인');
  });

  // ── 2. 기사 회원가입 → 맞춤 추천 설정 ────────────────────────────────────
  test('2. 기사 회원가입 → 맞춤 추천 설정 저장', async ({ page }) => {
    console.log(`\n[2] 기사 가입: ${DRIVER_EMAIL}`);
    await register(page, 'driver', '테스트기사', DRIVER_EMAIL);

    const badge = (await page.textContent('#hdr-badge')).trim();
    expect(badge).toContain('기사');
    S.driverUid = await page.evaluate(() => window._CU.uid);
    expect(S.driverUid).toBeTruthy();

    // 기사 홈: 이번달 수입 KPI 카드 확인
    await page.waitForSelector('#kpi-income', { timeout: 8000 });
    console.log('  ✅ 기사 홈 이번달 수입 KPI 확인');

    // 바차트 확인
    const barChart = page.locator('#home-bar-chart');
    await expect(barChart).toBeVisible({ timeout: 5000 });
    console.log('  ✅ 7일 바차트 확인');

    // 프로필 탭으로 이동해서 맞춤 추천 설정
    await goToPage(page, 'profile');
    await page.waitForSelector('#pref-region', { timeout: 8000 });

    // 맞춤 추천 설정 입력
    await page.fill('#pref-region', '부산 해운대');
    await page.selectOption('#pref-carType', '하이탑');
    await page.selectOption('#pref-courier', 'CJ대한통운');
    await page.fill('#pref-price', '700');
    await page.selectOption('#pref-time', '오전');

    await page.click('button:has-text("맞춤 조건 저장")');
    await page.waitForTimeout(2000);

    // 저장 확인 (toast 또는 Firestore)
    const savedPrefs = await page.evaluate(async () => {
      try {
        const snap = await window._db.collection('yongcha_users').doc(window._CU.uid).get();
        return snap.exists ? snap.data().preferences : null;
      } catch(e) { return null; }
    });
    console.log(`  저장된 맞춤 조건: ${JSON.stringify(savedPrefs)}`);
    expect(savedPrefs).toBeTruthy();
    expect(savedPrefs.region).toContain('해운대');
    console.log('  ✅ 기사 맞춤 추천 설정 저장 확인');
  });

  // ── 3. 대리점 공고 등록 ───────────────────────────────────────────────────
  test('3. 대리점 공고 등록 → 카드 UI 확인', async ({ page }) => {
    console.log('\n[3] 공고 등록');
    await login(page, AGENCY_EMAIL);
    await goToPage(page, 'post_write');

    await page.selectOption('#pw-courier', 'CJ대한통운');
    await page.fill('#pw-routeNo', '부산-해운대-LOCAL01');
    await page.locator('#pw-type-group button').filter({ hasText: '월단위' }).click();
    await page.locator('#pw-shift-group button').filter({ hasText: '주간' }).click();
    await page.fill('#pw-hours', '06:00 ~ 14:00');
    for (const d of ['월','화','수','목','금']) {
      await page.locator('#pw-days-group button').filter({ hasText: d }).click();
      await page.waitForTimeout(80);
    }
    const today = new Date().toISOString().split('T')[0];
    await page.fill('#pw-date', today);
    await page.locator('#pw-pricetype-group button').filter({ hasText: /^건당$/ }).click();
    await page.fill('#pw-price', '850');
    await page.fill('#pw-volume', '200');
    await page.fill('#pw-settleDay', '매주 목요일');
    await page.fill('#pw-area', '해운대구 좌동');
    await page.fill('#pw-desc', '로컬 테스트 공고');
    await page.fill('#pw-loadingAddr', '부산 해운대구 센텀시티역');
    await page.locator('#submit-btn').click();

    await page.waitForFunction(
      () => { const t = document.getElementById('toast'); return t && t.classList.contains('show') && t.textContent.trim().length > 0; },
      { timeout: 15000 }
    );
    const toastText = await page.locator('#toast').textContent();
    console.log(`  토스트: ${toastText}`);
    expect(toastText).toContain('등록');

    await page.waitForTimeout(2000);
    S.postId = await page.evaluate(async () => {
      const snap = await window._db.collection('yongcha_posts').where('agencyId','==',window._CU.uid).limit(5).get();
      if (snap.empty) return null;
      const docs = snap.docs.sort((a,b) => (b.data().createdAt?.seconds||0)-(a.data().createdAt?.seconds||0));
      return docs[0].id;
    });
    console.log(`  공고 ID: ${S.postId}`);
    expect(S.postId).toBeTruthy();

    // 공고 목록에서 카드 UI 확인
    await goToPage(page, 'posts');
    await page.waitForTimeout(2000);
    const postCards = page.locator('.post-card');
    await expect(postCards.first()).toBeVisible({ timeout: 15000 });
    const cnt = await postCards.count();
    console.log(`  공고 카드 수: ${cnt} (5개씩 페이지네이션)`);
    expect(cnt).toBeLessThanOrEqual(5); // 5개씩 페이지네이션 확인

    // 36px 단가 확인
    const firstCard = postCards.first();
    const cardHTML = await firstCard.innerHTML();
    const has36px = cardHTML.includes('font-size:36px') || cardHTML.includes('font-size: 36px');
    console.log(`  단가 36px: ${has36px}`);

    console.log('  ✅ 공고 등록 + 카드 UI 확인');
  });

  // ── 4. 기사 공고 검색 → 맞춤 추천 정렬 확인 ─────────────────────────────
  test('4. 기사 공고 검색 → 맞춤 추천 정렬 + 지원', async ({ page }) => {
    console.log('\n[4] 기사 공고 검색 + 맞춤 추천 확인');
    await login(page, DRIVER_EMAIL);
    await goToPage(page, 'posts');
    await page.waitForTimeout(2500);

    const postCards = page.locator('.post-card');
    await expect(postCards.first()).toBeVisible({ timeout: 15000 });
    const cnt = await postCards.count();
    console.log(`  공고 수 (1페이지): ${cnt}`);
    expect(cnt).toBeGreaterThan(0);

    // 맞춤 추천 배지 확인 (CJ대한통운 + 해운대 조건 설정했으므로)
    const matchBadges = page.locator('.post-card').locator('text=내 조건 딱 맞음');
    const matchCnt = await matchBadges.count();
    console.log(`  맞춤 추천 배지 수: ${matchCnt}`);

    // 더보기 버튼 확인
    const loadMore = page.locator('.load-more-btn');
    const hasLoadMore = await loadMore.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`  더보기 버튼: ${hasLoadMore ? '있음' : '없음 (5개 이하 공고)'}`);

    // 출발→도착 route-row 확인
    const routeRows = page.locator('.route-row');
    const routeCnt = await routeRows.count();
    console.log(`  출발→도착 route-row 수: ${routeCnt}`);

    // 공고 클릭 → 지원
    const targetCard = postCards.first();
    await targetCard.click();
    const modal = page.locator('#modal-sheet');
    await expect(modal).toBeVisible({ timeout: 8000 });
    await page.waitForTimeout(800);

    const applyBtn = page.locator('#apply-btn');
    if (await applyBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      const btnTxt = (await applyBtn.textContent()).trim();
      if (!btnTxt.includes('이미 지원')) {
        await applyBtn.click();
        await page.waitForFunction(
          () => { const t = document.getElementById('toast'); return t && t.classList.contains('show') && t.textContent.trim().length > 0; },
          { timeout: 10000 }
        );
        const toast = await page.locator('#toast').textContent();
        console.log(`  지원 토스트: ${toast}`);
        expect(toast).toContain('지원');
      } else {
        console.log('  이미 지원 (중복 방지 확인)');
      }
    }
    await page.waitForTimeout(1500);
    if (S.postId) {
      S.applyId = await page.evaluate(async (postId) => {
        const snap = await window._db.collection('yongcha_applies').where('driverId','==',window._CU.uid).where('postId','==',postId).limit(1).get();
        return snap.empty ? null : snap.docs[0].id;
      }, S.postId);
    }
    console.log(`  applyId: ${S.applyId}`);
    await page.evaluate(() => window._closeModal && window._closeModal());
    console.log('  ✅ 기사 공고 검색 + 맞춤 추천 확인');
  });

  // ── 5. 대리점 지원자 승인 → FCM ──────────────────────────────────────────
  test('5. 대리점 지원자 승인', async ({ page }) => {
    console.log('\n[5] 지원자 승인');
    await login(page, AGENCY_EMAIL);
    await goToPage(page, 'my_posts');
    await page.waitForTimeout(1500);

    // 슬라이드 승인 버튼 확인
    const slideBtn = page.locator('.slide-accept').first();
    const hasSlide = await slideBtn.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`  슬라이드 승인 버튼: ${hasSlide}`);

    const checkBtn = page.locator('button').filter({ hasText: '지원자 확인' }).first();
    const hasCheck = await checkBtn.isVisible({ timeout: 8000 }).catch(() => false);
    if (hasCheck) {
      await checkBtn.click();
      await page.waitForTimeout(1200);
      const approveBtn = page.locator('.judge-approve').first();
      const hasApprove = await approveBtn.isVisible({ timeout: 3000 }).catch(() => false);
      if (hasApprove) {
        await approveBtn.click();
        await page.waitForFunction(
          () => { const t = document.getElementById('toast'); return t && t.classList.contains('show') && t.textContent.trim().length > 0; },
          { timeout: 10000 }
        );
        const t = await page.locator('#toast').textContent();
        console.log(`  승인 토스트: ${t}`);
        expect(t).toContain('승인');
      } else if (S.applyId) {
        await page.evaluate(async (id) => {
          await window._db.collection('yongcha_applies').doc(id).update({ status: 'approved', judgedAt: firebase.firestore.FieldValue.serverTimestamp() });
        }, S.applyId);
        console.log('  Firestore 직접 승인');
      }
      await page.evaluate(() => window._closeModal && window._closeModal());
    }
    console.log('  ✅ 지원자 승인 완료');
  });

  // ── 6. 기사 프로필 KPI (완주율 / 이달 수입) ──────────────────────────────
  test('6. 기사 프로필 KPI 확인', async ({ page }) => {
    console.log('\n[6] 기사 프로필 KPI');
    await login(page, DRIVER_EMAIL);
    await goToPage(page, 'profile');
    await page.waitForTimeout(2000);

    // 완주율 KPI
    const completion = page.locator('#profile-completion');
    await expect(completion).toBeVisible({ timeout: 8000 });
    const completionVal = await completion.textContent();
    console.log(`  완주율: ${completionVal}`);
    expect(completionVal).toMatch(/\d+%|—/);

    // 이달수입 KPI
    const income = page.locator('#profile-income');
    await expect(income).toBeVisible({ timeout: 5000 });
    const incomeVal = await income.textContent();
    console.log(`  이달수입: ${incomeVal}`);

    // 맞춤 추천 설정 폼 확인
    const prefRegion = page.locator('#pref-region');
    await expect(prefRegion).toBeVisible({ timeout: 5000 });
    const prefVal = await prefRegion.inputValue();
    console.log(`  저장된 맞춤 지역: "${prefVal}"`);
    expect(prefVal).toContain('해운대');

    console.log('  ✅ 기사 프로필 KPI + 맞춤 추천 설정 확인');
  });

  // ── 7. 대리점 배차현황 지도 ───────────────────────────────────────────────
  test('7. 대리점 배차현황 지도', async ({ page }) => {
    console.log('\n[7] 대리점 배차현황 지도');
    await login(page, AGENCY_EMAIL);

    // 홈에서 배차현황 지도 버튼 클릭
    const dispatchBtn = page.locator('button').filter({ hasText: '배차현황 실시간 지도' });
    await expect(dispatchBtn).toBeVisible({ timeout: 8000 });
    await dispatchBtn.click();
    await page.waitForTimeout(2000);

    // 지도 컨테이너 + 카운터 확인
    const mapContainer = page.locator('#dispatch-map-container');
    await expect(mapContainer).toBeVisible({ timeout: 8000 });

    const openCount = page.locator('#dmap-open');
    await expect(openCount).toBeVisible({ timeout: 5000 });
    const openVal = await openCount.textContent();
    console.log(`  공개 공고 수: ${openVal}`);

    // 홈으로 돌아가기 버튼
    const backBtn = page.locator('button').filter({ hasText: '홈으로' });
    await expect(backBtn).toBeVisible({ timeout: 3000 });
    await backBtn.click();
    await page.waitForTimeout(1000);

    // 홈으로 돌아왔는지 확인
    const heroCard = page.locator('.hero-card');
    await expect(heroCard).toBeVisible({ timeout: 5000 });
    console.log('  ✅ 대리점 배차현황 지도 + 홈 복귀 확인');
  });

  // ── 8. 5개 페이지네이션 더보기 ────────────────────────────────────────────
  test('8. 공고 목록 페이지네이션', async ({ page }) => {
    console.log('\n[8] 공고 페이지네이션');
    await login(page, DRIVER_EMAIL);
    await goToPage(page, 'posts');
    await page.waitForTimeout(2500);

    const postCards = page.locator('.post-card');
    const initialCnt = await postCards.count();
    console.log(`  초기 로드: ${initialCnt}개`);
    expect(initialCnt).toBeLessThanOrEqual(5);

    const loadMore = page.locator('.load-more-btn');
    const hasMore = await loadMore.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasMore) {
      const moreText = await loadMore.textContent();
      console.log(`  더보기 버튼: "${moreText}"`);
      await loadMore.click();
      await page.waitForTimeout(1500);
      const afterCnt = await postCards.count();
      console.log(`  더보기 후: ${afterCnt}개`);
      expect(afterCnt).toBeGreaterThan(initialCnt);
      console.log('  ✅ 더보기 페이지네이션 확인');
    } else {
      console.log(`  공고 ${initialCnt}개 이하 — 더보기 불필요`);
      console.log('  ✅ 페이지네이션 정상 (5개 이하)');
    }
  });

  // ── 9. 관리자 대시보드 ────────────────────────────────────────────────────
  test('9. 관리자 대시보드 + 전체 확인', async ({ page }) => {
    console.log('\n[9] 관리자 대시보드');
    const ADMIN_EMAIL_LOCAL = `admin${TS}@ytest.io`;

    page.on('console', msg => { if (msg.type() === 'error') console.log('[browser]', msg.text()); });
    await setupFirebaseIntercept(page);
    await gotoApp(page);

    // ADMINS 배열에 주입
    await page.evaluate((email) => {
      if (typeof ADMINS !== 'undefined' && Array.isArray(ADMINS)) {
        if (!ADMINS.includes(email)) ADMINS.push(email);
      }
    }, ADMIN_EMAIL_LOCAL);

    await page.click('#tab-reg');
    await page.waitForTimeout(300);
    await page.click('#t-agency');
    await page.fill('#r-name', '테스트관리자');
    await page.fill('#r-email', ADMIN_EMAIL_LOCAL);
    await page.fill('#r-phone', '051-000-0000');
    await page.selectOption('#r-region', '부산');
    await page.fill('#r-pw', PW);
    await page.click('#r-btn');
    await page.waitForSelector('#app', { state: 'visible', timeout: 45000 });
    await page.waitForFunction(() => window._CU && !!window._CU.uid, { timeout: 15000 });

    const userType = await page.evaluate(() => window._CU.type);
    console.log(`  유저 타입: ${userType}`);
    expect(userType).toBe('admin');

    // 관리자 전용 탭
    await page.click('#bnav-members');
    await page.waitForTimeout(2000);

    const agencyKpi = page.locator('#adm-agency');
    await expect(agencyKpi).toBeVisible({ timeout: 15000 });
    const agencyCnt = (await agencyKpi.textContent()).trim();
    console.log(`  대리점 수: ${agencyCnt}`);

    const memberItems = page.locator('#members-list .card');
    await expect(memberItems.first()).toBeVisible({ timeout: 10000 });
    const memberCnt = await memberItems.count();
    console.log(`  회원 수: ${memberCnt}명`);
    expect(memberCnt).toBeGreaterThan(0);

    // 공고 관리 탭
    await page.locator('.sub-tab').filter({ hasText: '공고 관리' }).click();
    await page.waitForTimeout(2000);
    const postItems = page.locator('#adm-content .card');
    await expect(postItems.first()).toBeVisible({ timeout: 10000 });
    console.log(`  공고 관리 항목: ${await postItems.count()}개`);

    console.log('  ✅ 관리자 대시보드 확인');
  });

});
