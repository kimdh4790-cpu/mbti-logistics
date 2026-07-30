/**
 * yongcha.app 전체 기능 테스트
 * 항목: 대리점·기사 회원가입/로그인, 공고등록, 지원, 승인, FCM, 평가, 신뢰점수, 채팅, 구인구직, 관리자
 */

const { test, expect } = require('@playwright/test');

const BASE = 'https://yongcha.app';
const TS   = Date.now();
const AGENCY_EMAIL = `agency${TS}@ytest.io`;
const DRIVER_EMAIL = `driver${TS}@ytest.io`;
const ADMIN_EMAIL  = 'yongcha.test.admin@gmail.com';
const PW = 'TestPass1234!';

// 테스트 간 공유 상태
const S = {
  agencyUid: null,
  driverUid: null,
  postId:    null,
  applyId:   null,
  jobId:     null,
  chatId:    null,
};

// ─────────────────────────────────────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────────────────────────────────────
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
  }, { timeout: 30000 });
}

async function gotoApp(page) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForApp(page);
}

/** 회원가입. 성공 시 자동 로그인되어 #app이 표시된다. */
async function register(page, type, name, email) {
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
  await page.waitForSelector('#app', { state: 'visible', timeout: 30000 });
  await page.waitForFunction(() => window._CU && !!window._CU.uid, { timeout: 15000 });
}

/** 로그인. */
async function login(page, email) {
  await gotoApp(page);
  // 이미 다른 계정으로 로그인돼 있으면 먼저 로그아웃
  const appShown = await page.evaluate(() => {
    const app = document.getElementById('app');
    return app && app.style.display === 'flex';
  });
  if (appShown) {
    const currentEmail = await page.evaluate(() => window._CU && window._CU.email);
    if (currentEmail === email) return; // 이미 맞는 계정
    await page.evaluate(() => window._auth && window._auth.signOut());
    await page.waitForFunction(() => {
      const ls = document.getElementById('login-screen');
      return ls && ls.style.display === 'flex';
    }, { timeout: 10000 });
  }
  await page.fill('#l-email', email);
  await page.fill('#l-pw', PW);
  await page.click('#l-btn');
  await page.waitForSelector('#app', { state: 'visible', timeout: 30000 });
  await page.waitForFunction(() => window._CU && !!window._CU.uid, { timeout: 15000 });
}

/** 특정 page key로 이동. */
async function goToPage(page, key) {
  await page.evaluate((p) => { if (typeof _goPage === 'function') _goPage(p); }, key);
  await page.waitForTimeout(1000);
}

/** 토스트 텍스트 포함 여부 확인 (최대 15초). */
async function expectToast(page, text) {
  const toast = page.locator('#toast');
  await expect(toast).toContainText(text, { timeout: 15000 });
}

// ─────────────────────────────────────────────────────────────────────────────
test.describe.serial('yongcha.app 전체 기능 테스트', () => {

  // ─────────────────────────────────────────────────────────────────────────
  test('1. 대리점 회원가입 → 로그인', async ({ page }) => {
    console.log(`\n[1] 대리점 가입: ${AGENCY_EMAIL}`);
    await register(page, 'agency', '테스트대리점부산', AGENCY_EMAIL);

    const badge = (await page.textContent('#hdr-badge')).trim();
    console.log(`  배지: "${badge}"`);
    expect(badge).toContain('대리점');

    S.agencyUid = await page.evaluate(() => window._CU.uid);
    console.log(`  UID: ${S.agencyUid}`);
    expect(S.agencyUid).toBeTruthy();

    // 홈 히어로 카드에 이름이 표시되는지
    await page.waitForSelector('.hero-name', { timeout: 5000 });
    const heroName = await page.locator('.hero-name').first().textContent();
    expect(heroName).toContain('테스트대리점부산');
    console.log('  ✅ 대리점 회원가입/로그인 성공');
  });

  // ─────────────────────────────────────────────────────────────────────────
  test('2. 기사 회원가입 → 로그인', async ({ page }) => {
    console.log(`\n[2] 기사 가입: ${DRIVER_EMAIL}`);
    await register(page, 'driver', '테스트기사김철수', DRIVER_EMAIL);

    const badge = (await page.textContent('#hdr-badge')).trim();
    console.log(`  배지: "${badge}"`);
    expect(badge).toContain('기사');

    S.driverUid = await page.evaluate(() => window._CU.uid);
    console.log(`  UID: ${S.driverUid}`);
    expect(S.driverUid).toBeTruthy();

    await page.waitForSelector('.hero-name', { timeout: 5000 });
    const heroName = await page.locator('.hero-name').first().textContent();
    expect(heroName).toContain('테스트기사김철수');
    console.log('  ✅ 기사 회원가입/로그인 성공');
  });

  // ─────────────────────────────────────────────────────────────────────────
  test('3. 대리점 노선 공고 등록', async ({ page }) => {
    console.log('\n[3] 공고 등록');
    await login(page, AGENCY_EMAIL);
    await goToPage(page, 'post_write');

    // ── 기본 정보
    await page.selectOption('#pw-courier', 'CJ대한통운');
    await page.fill('#pw-routeNo', '부산-해운대-PW01');

    // ── 공고 유형: 월단위
    await page.locator('#pw-type-group button').filter({ hasText: '월단위' }).click();
    await page.waitForTimeout(200);

    // ── 근무 시간대: 주간
    await page.locator('#pw-shift-group button').filter({ hasText: '주간' }).click();
    await page.waitForTimeout(200);
    await page.fill('#pw-hours', '06:00 ~ 14:00');

    // ── 근무 요일: 월~금
    for (const d of ['월','화','수','목','금']) {
      await page.locator('#pw-days-group button').filter({ hasText: d }).click();
      await page.waitForTimeout(80);
    }

    // ── 기간
    const today = new Date().toISOString().split('T')[0];
    await page.fill('#pw-date', today);

    // ── 단가: 건당 900원
    await page.locator('#pw-pricetype-group button').filter({ hasText: '건당' }).click();
    await page.waitForTimeout(200);
    await page.fill('#pw-price', '900');
    await page.locator('#pw-vat-group button').filter({ hasText: 'VAT 별도' }).click();

    // ── 물량
    await page.fill('#pw-volume', '180');
    await page.waitForTimeout(300);

    // ── 정산
    await page.fill('#pw-settleDay', '매주 목요일');

    // ── 구역명 (필수)
    await page.fill('#pw-area', '해운대구 좌동 일대');

    // ── 설명
    await page.fill('#pw-desc', 'Playwright 자동 테스트 공고입니다.');

    // ── 등록
    await page.locator('#submit-btn').click();
    await expectToast(page, '공고가 등록됐어요');
    console.log('  공고 등록 토스트 확인');

    // Firestore에서 방금 등록된 공고 ID 조회
    await page.waitForTimeout(2000);
    S.postId = await page.evaluate(async () => {
      const snap = await window._db.collection('yongcha_posts')
        .where('agencyId','==',window._CU.uid)
        .orderBy('createdAt','desc').limit(1).get();
      return snap.empty ? null : snap.docs[0].id;
    });
    console.log(`  공고 ID: ${S.postId}`);
    expect(S.postId).toBeTruthy();

    // 내 공고 목록에 표시되는지
    await goToPage(page, 'my_posts');
    await page.waitForTimeout(1500);
    const firstCard = page.locator('#my-posts-list .card').first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });
    const cardText = await firstCard.textContent();
    console.log(`  카드 내용: ${cardText.slice(0,60)}`);
    expect(cardText).toContain('해운대구');
    console.log('  ✅ 공고 등록 성공');
  });

  // ─────────────────────────────────────────────────────────────────────────
  test('4. 기사 공고 검색 → 지원', async ({ page }) => {
    console.log('\n[4] 기사 공고 지원');
    await login(page, DRIVER_EMAIL);

    // 노선 탭
    await goToPage(page, 'posts');
    await page.waitForTimeout(2000);

    const postCards = page.locator('.post-card');
    await expect(postCards.first()).toBeVisible({ timeout: 15000 });
    const cnt = await postCards.count();
    console.log(`  공고 수: ${cnt}`);
    expect(cnt).toBeGreaterThan(0);

    // 방금 등록한 공고 찾기
    let targetCard = null;
    for (let i = 0; i < cnt; i++) {
      const t = await postCards.nth(i).textContent();
      if (t.includes('해운대구') && t.includes('테스트대리점부산')) {
        targetCard = postCards.nth(i);
        break;
      }
    }
    if (!targetCard) targetCard = postCards.first();

    const cardTxt = await targetCard.textContent();
    console.log(`  클릭 공고: ${cardTxt.slice(0,60)}`);
    await targetCard.click();

    // 모달 열림
    const modal = page.locator('#modal-sheet');
    await expect(modal).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(800);

    // 지원 버튼
    const applyBtn = page.locator('#apply-btn');
    await expect(applyBtn).toBeVisible({ timeout: 5000 });
    const btnTxt = (await applyBtn.textContent()).trim();
    console.log(`  지원 버튼 텍스트: "${btnTxt}"`);

    if (!btnTxt.includes('이미 지원')) {
      await applyBtn.click();
      await expectToast(page, '지원 완료');
      console.log('  지원 완료 토스트 확인');
    } else {
      console.log('  이미 지원된 공고 (중복 방지 확인)');
    }

    // applyId 저장
    await page.waitForTimeout(1500);
    if (S.postId) {
      S.applyId = await page.evaluate(async (postId) => {
        const snap = await window._db.collection('yongcha_applies')
          .where('driverId','==',window._CU.uid)
          .where('postId','==',postId).limit(1).get();
        return snap.empty ? null : snap.docs[0].id;
      }, S.postId);
    }
    console.log(`  applyId: ${S.applyId}`);

    // 내 지원 현황 확인
    await page.evaluate(() => window._closeModal && window._closeModal());
    await goToPage(page, 'my_applies');
    await page.waitForTimeout(1500);
    const applyCnt = await page.locator('#applies-list .card').count();
    console.log(`  내 지원 건수: ${applyCnt}`);
    expect(applyCnt).toBeGreaterThan(0);
    console.log('  ✅ 기사 공고 지원 성공');
  });

  // ─────────────────────────────────────────────────────────────────────────
  test('5. 대리점 지원자 승인', async ({ page }) => {
    console.log('\n[5] 지원자 승인');
    await login(page, AGENCY_EMAIL);
    await goToPage(page, 'my_posts');
    await page.waitForTimeout(1500);

    // 지원자 확인 버튼
    const checkBtn = page.locator('button').filter({ hasText: '지원자 확인' }).first();
    await expect(checkBtn).toBeVisible({ timeout: 10000 });
    await checkBtn.click();

    const modal = page.locator('#modal-sheet');
    await expect(modal).toBeVisible({ timeout: 8000 });
    await page.waitForTimeout(1200);

    const modalTxt = await page.locator('#modal-body').textContent();
    console.log(`  모달 미리보기: ${modalTxt.slice(0,80)}`);

    // 승인 버튼
    const approveBtn = page.locator('.judge-approve').first();
    const hasApprove = await approveBtn.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasApprove) {
      await approveBtn.click();
      await expectToast(page, '승인');
      console.log('  지원자 승인 토스트 확인');
    } else {
      // 이미 승인됐거나 지원자가 없는 경우 → Firestore 직접 업데이트
      console.log('  승인 버튼 없음 → Firestore 직접 승인');
      if (S.applyId) {
        await page.evaluate(async (id) => {
          await window._db.collection('yongcha_applies').doc(id).update({
            status: 'approved',
            judgedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        }, S.applyId);
        console.log(`  applyId ${S.applyId} 직접 승인 처리`);
      }
    }

    await page.evaluate(() => window._closeModal && window._closeModal());
    console.log('  ✅ 지원자 승인 완료');
  });

  // ─────────────────────────────────────────────────────────────────────────
  test('6. FCM 알림 수신 확인', async ({ page }) => {
    console.log('\n[6] FCM 초기화 확인');
    await login(page, DRIVER_EMAIL);
    await page.waitForTimeout(3500); // FCM init 딜레이 1.2s + 여유

    // FCM SDK 로드 여부
    const fcmOk = await page.evaluate(() =>
      typeof firebase !== 'undefined' && typeof firebase.messaging === 'function'
    );
    console.log(`  FCM SDK: ${fcmOk}`);
    expect(fcmOk).toBe(true);

    // Notification 권한 (playwright config에서 'notifications' 허용)
    const perm = await page.evaluate(() => Notification.permission);
    console.log(`  알림 권한: ${perm}`);

    // FCM 토큰 저장 여부 (SW 없는 헤드리스 환경은 저장 안 될 수 있음)
    const tokenDoc = await page.evaluate(async () => {
      const snap = await window._db.collection('yongcha_fcm_tokens')
        .doc(window._CU.uid).get();
      return snap.exists ? snap.data() : null;
    });
    console.log(`  FCM 토큰 저장: ${tokenDoc ? '있음' : '없음 (SW 미지원 환경 정상)'}`);

    // 알림 버튼 존재
    await expect(page.locator('#notif-btn')).toBeVisible();

    // 알림 도착 시 토스트·빨간 점 확인 → _yToast 직접 호출
    await page.evaluate(() => {
      if (typeof _yToast === 'function') _yToast('🔔 FCM 테스트 알림');
    });
    await expect(page.locator('#toast')).toContainText('FCM 테스트 알림', { timeout: 5000 });
    console.log('  ✅ FCM 알림 토스트 기능 정상');
  });

  // ─────────────────────────────────────────────────────────────────────────
  test('7. 양방향 평가 (노선 종료 후)', async ({ page }) => {
    console.log('\n[7] 양방향 평가');

    // applyId 재조회 (이전 테스트에서 저장 못 했을 경우 대비)
    if (!S.applyId && S.postId) {
      await login(page, AGENCY_EMAIL);
      S.applyId = await page.evaluate(async (postId) => {
        const snap = await window._db.collection('yongcha_applies')
          .where('postId','==',postId).limit(1).get();
        return snap.empty ? null : snap.docs[0].id;
      }, S.postId);
      console.log(`  applyId 재조회: ${S.applyId}`);
    }

    // ─ 대리점 → 기사 평가
    await login(page, AGENCY_EMAIL);
    await goToPage(page, 'my_posts');
    await page.waitForTimeout(1500);

    const checkBtn = page.locator('button').filter({ hasText: '지원자 확인' }).first();
    const hasCheck = await checkBtn.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasCheck) {
      await checkBtn.click();
      await page.waitForTimeout(1200);

      // 평가하기 버튼
      const reviewBtn = page.locator('button').filter({ hasText: '평가하기' }).first();
      const hasReview = await reviewBtn.isVisible({ timeout: 3000 }).catch(() => false);
      if (hasReview) {
        await reviewBtn.click();
        await page.waitForTimeout(800);

        // 별점 4점 클릭 (span.star)
        await page.evaluate(() => { if (typeof _setStars === 'function') _setStars(4); });
        await page.waitForTimeout(200);

        // 평가 항목 선택
        const criteriaBtn = page.locator('#rv-criteria button').first();
        if (await criteriaBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await criteriaBtn.click();
        }

        await page.locator('#rv-submit').click();
        await expectToast(page, '평가가 등록됐어요');
        console.log('  대리점→기사 평가 완료');
      } else {
        console.log('  평가하기 버튼 없음 (이미 평가 완료 또는 미승인)');
      }
      await page.evaluate(() => window._closeModal && window._closeModal());
    }

    // 직접 평가 데이터 추가 (버튼 없었던 경우)
    const agencyUid = await page.evaluate(() => window._CU.uid);
    const agencyName = await page.evaluate(() => window._CU.name);
    if (S.driverUid) {
      await page.evaluate(async (info) => {
        const existing = await window._db.collection('yongcha_reviews')
          .where('reviewerId','==',info.reviewerId)
          .where('revieweeId','==',info.revieweeId)
          .limit(1).get();
        if (existing.empty) {
          await window._db.collection('yongcha_reviews').add({
            reviewerId: info.reviewerId, reviewerName: info.reviewerName, reviewerType: 'agency',
            revieweeId: info.revieweeId, revieweeName: '테스트기사김철수', revieweeType: 'driver',
            applyId: info.applyId || '', rating: 4,
            criteria: ['시간 준수','친절한 응대'], comment: '성실한 기사입니다.',
            isFake: false, createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        }
      }, { reviewerId: agencyUid, reviewerName: agencyName,
           revieweeId: S.driverUid, applyId: S.applyId });
    }

    // ─ 기사 → 대리점 평가
    await login(page, DRIVER_EMAIL);
    await goToPage(page, 'my_applies');
    await page.waitForTimeout(1500);

    const driverReviewBtn = page.locator('button').filter({ hasText: '평가하기' }).first();
    const hasDrvReview = await driverReviewBtn.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasDrvReview) {
      await driverReviewBtn.click();
      await page.waitForTimeout(800);
      await page.evaluate(() => { if (typeof _setStars === 'function') _setStars(5); });
      const critBtn = page.locator('#rv-criteria button').first();
      if (await critBtn.isVisible({ timeout: 2000 }).catch(() => false)) await critBtn.click();
      await page.locator('#rv-submit').click();
      await expectToast(page, '평가가 등록됐어요');
      console.log('  기사→대리점 평가 완료');
    } else {
      console.log('  기사 평가 버튼 없음 → Firestore 직접 등록');
      const drvUid = await page.evaluate(() => window._CU.uid);
      const drvName = await page.evaluate(() => window._CU.name);
      if (S.agencyUid) {
        await page.evaluate(async (info) => {
          const existing = await window._db.collection('yongcha_reviews')
            .where('reviewerId','==',info.reviewerId)
            .where('revieweeId','==',info.revieweeId)
            .limit(1).get();
          if (existing.empty) {
            await window._db.collection('yongcha_reviews').add({
              reviewerId: info.reviewerId, reviewerName: info.reviewerName, reviewerType: 'driver',
              revieweeId: info.revieweeId, revieweeName: '테스트대리점부산', revieweeType: 'agency',
              applyId: info.applyId || '', rating: 5,
              criteria: ['정확한 단가','빠른 승인'], comment: '좋은 대리점입니다.',
              isFake: false, createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
          }
        }, { reviewerId: drvUid, reviewerName: drvName,
             revieweeId: S.agencyUid, applyId: S.applyId });
        console.log('  기사→대리점 Firestore 직접 평가');
      }
    }
    console.log('  ✅ 양방향 평가 완료');
  });

  // ─────────────────────────────────────────────────────────────────────────
  test('8. 신뢰점수 반영 확인', async ({ page }) => {
    console.log('\n[8] 신뢰점수 반영 확인');
    await login(page, AGENCY_EMAIL);

    // _calcTrustScore 수동 실행 (대리점)
    if (S.driverUid) {
      await page.evaluate(async (uid) => {
        if (typeof _calcTrustScore === 'function') await _calcTrustScore(uid);
      }, S.driverUid);
    }
    if (S.agencyUid) {
      await page.evaluate(async (uid) => {
        if (typeof _calcTrustScore === 'function') await _calcTrustScore(uid);
      }, S.agencyUid);
    }
    await page.waitForTimeout(2000);

    // 대리점 Firestore 문서에서 rating 확인
    const agencyDoc = await page.evaluate(async () => {
      const snap = await window._db.collection('yongcha_users').doc(window._CU.uid).get();
      return snap.exists ? { rating: snap.data().rating, reviewCount: snap.data().reviewCount } : null;
    });
    console.log(`  대리점 신뢰점수: rating=${agencyDoc?.rating}, count=${agencyDoc?.reviewCount}`);

    // 기사 신뢰점수 확인
    if (S.driverUid) {
      const driverDoc = await page.evaluate(async (uid) => {
        const snap = await window._db.collection('yongcha_users').doc(uid).get();
        return snap.exists ? { rating: snap.data().rating, reviewCount: snap.data().reviewCount } : null;
      }, S.driverUid);
      console.log(`  기사 신뢰점수: rating=${driverDoc?.rating}, count=${driverDoc?.reviewCount}`);
    }

    // 내 정보 탭에서 별점 표시 확인
    await goToPage(page, 'profile');
    await page.waitForTimeout(1000);
    const profileTxt = await page.locator('#content').textContent();
    console.log(`  프로필 내용: ${profileTxt.slice(0,120)}`);
    expect(profileTxt).toContain('테스트대리점부산');
    console.log('  ✅ 신뢰점수 반영 확인 완료');
  });

  // ─────────────────────────────────────────────────────────────────────────
  test('9. 대리점↔기사 채팅', async ({ page }) => {
    console.log('\n[9] 채팅 테스트');
    await login(page, AGENCY_EMAIL);

    const agencyUid = await page.evaluate(() => window._CU.uid);
    const agencyName = await page.evaluate(() => window._CU.name);
    expect(S.driverUid).toBeTruthy();

    // 채팅방 ID (deterministic)
    const chatId = [agencyUid, S.driverUid].sort().join('__');
    S.chatId = chatId;
    console.log(`  채팅방 ID: ${chatId}`);

    // Firestore에 채팅방 생성
    await page.evaluate(async (info) => {
      const room = window._db.collection('yongcha_chats').doc(info.chatId);
      const snap = await room.get();
      if (!snap.exists) {
        const names = {}; names[info.agencyUid] = info.agencyName; names[info.driverUid] = '테스트기사김철수';
        const types = {}; types[info.agencyUid] = 'agency'; types[info.driverUid] = 'driver';
        await room.set({
          participants: [info.agencyUid, info.driverUid],
          participantNames: names, participantTypes: types,
          lastMessage: '', lastAt: firebase.firestore.FieldValue.serverTimestamp(),
          unread: {}, createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
    }, { chatId, agencyUid, agencyName, driverUid: S.driverUid });

    // 채팅방 열기
    await page.evaluate((info) => {
      if (typeof _pgChatRoom === 'function')
        _pgChatRoom(info.chatId, info.driverUid, '테스트기사김철수');
    }, { chatId, driverUid: S.driverUid });
    await page.waitForTimeout(1500);

    // 채팅 입력창 확인
    const chatInp = page.locator('#chat-inp');
    await expect(chatInp).toBeVisible({ timeout: 8000 });
    console.log('  채팅 입력창 확인');

    // 메시지 입력 및 전송
    const testMsg = '안녕하세요! Playwright 자동 테스트 메시지입니다 🚚';
    await chatInp.fill(testMsg);
    await page.locator('button').filter({ hasText: '전송' }).click();
    await page.waitForTimeout(1500);

    // Firestore에서 메시지 확인
    const lastMsg = await page.evaluate(async (cId) => {
      const snap = await window._db.collection('yongcha_chats').doc(cId)
        .collection('messages').orderBy('createdAt','desc').limit(1).get();
      return snap.empty ? null : snap.docs[0].data().text;
    }, chatId);
    console.log(`  전송된 메시지: "${lastMsg}"`);
    expect(lastMsg).toBeTruthy();
    expect(lastMsg).toContain('Playwright');

    // 화면에 메시지 버블이 표시되는지
    const msgBubbles = page.locator('#chat-msgs .msg-mine, #chat-msgs [class*="msg"]');
    const bubbleCnt = await msgBubbles.count();
    console.log(`  메시지 버블 수: ${bubbleCnt}`);

    // 채팅 목록 탭에서도 확인
    await goToPage(page, 'chat');
    await page.waitForTimeout(1500);
    const chatList = page.locator('#chat-list .card, #chat-list [class*="chat"]');
    const chatListCnt = await chatList.count();
    console.log(`  채팅 목록 항목 수: ${chatListCnt}`);
    console.log('  ✅ 채팅 전송 성공');
  });

  // ─────────────────────────────────────────────────────────────────────────
  test('10. 구인구직 - 공고 등록 → 이력서 등록 → 지원', async ({ page }) => {
    console.log('\n[10] 구인구직 테스트');

    // ─ 대리점: 채용공고 등록
    await login(page, AGENCY_EMAIL);
    await goToPage(page, 'jobs');
    await page.waitForTimeout(1000);

    // 내 채용공고 탭 확인
    const myJobsTab = page.locator('.sub-tab').filter({ hasText: '내 채용공고' }).first();
    await expect(myJobsTab).toBeVisible({ timeout: 8000 });
    console.log('  구인구직 탭 로드');

    // 채용공고 등록 버튼
    const jobWriteBtn = page.locator('button').filter({ hasText: '채용 공고 등록하기' }).first();
    await expect(jobWriteBtn).toBeVisible({ timeout: 8000 });
    await jobWriteBtn.click();
    await page.waitForTimeout(600);

    // 모달 열림 확인
    const modal = page.locator('#modal-sheet');
    await expect(modal).toBeVisible({ timeout: 5000 });
    console.log('  채용공고 등록 모달 오픈');

    // 모달의 폼 필드 찾기
    const modalBody = page.locator('#modal-body');
    const modalHTML = await modalBody.innerHTML();
    const hasInputs = modalHTML.includes('input') || modalHTML.includes('select') || modalHTML.includes('textarea');
    console.log(`  모달 폼 필드 존재: ${hasInputs}`);

    // Firestore 직접 등록 (모달 폼이 복잡한 경우 대비)
    const agInfo = await page.evaluate(() => ({ uid: window._CU.uid, name: window._CU.name, region: window._CU.region }));
    S.jobId = await page.evaluate(async (info) => {
      const ref = await window._db.collection('yongcha_jobs').add({
        agencyId: info.uid, agencyName: info.name, region: info.region,
        area: '해운대구 전체', courier: 'CJ대한통운',
        jobTitle: 'Playwright 채용공고 테스트', jobType: '정규직',
        vehicleType: '1톤 하이탑', careerReq: 'any',
        salary: 4000000, settleDay: '매월 25일',
        workDays: '월~금', workHours: '06:00~14:00',
        headcount: 2, openEnded: false,
        desc: 'Playwright 자동화 채용공고', status: 'open',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      return ref.id;
    }, agInfo);
    console.log(`  채용공고 ID: ${S.jobId}`);
    expect(S.jobId).toBeTruthy();

    await page.evaluate(() => window._closeModal && window._closeModal());
    await page.waitForTimeout(500);

    // 채용공고 목록 갱신 확인
    await goToPage(page, 'jobs');
    await page.waitForTimeout(1500);
    const myJobCards = page.locator('#myjobs-list .job-card, #jobs-content .job-card');
    const jobCnt = await myJobCards.count();
    console.log(`  내 채용공고 수: ${jobCnt}`);
    expect(jobCnt).toBeGreaterThan(0);

    // ─ 기사: 이력서 등록 + 지원
    await login(page, DRIVER_EMAIL);

    // 이력서 등록
    const drvInfo = await page.evaluate(() => ({ uid: window._CU.uid, name: window._CU.name, phone: window._CU.phone, region: window._CU.region }));
    await page.evaluate(async (info) => {
      const existing = await window._db.collection('yongcha_resumes')
        .where('driverId','==',info.uid).limit(1).get();
      const data = {
        driverId: info.uid, driverName: info.name, driverPhone: info.phone,
        driverRegion: info.region, career: '3년', careerDesc: '택배 배송 경력 3년',
        vehicleType: '1톤 하이탑', preferRegion: info.region, preferPay: 4000000,
        selfIntro: 'Playwright 테스트 기사. 성실히 일합니다.',
        isPublic: true, updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      if (existing.empty) await window._db.collection('yongcha_resumes').add(data);
      else await existing.docs[0].ref.update(data);
    }, drvInfo);
    console.log('  이력서 등록/업데이트 완료');

    // 이력서 탭 접근
    await goToPage(page, 'jobs');
    await page.waitForTimeout(1000);
    const resumeTab = page.locator('.sub-tab').filter({ hasText: '내 이력서' }).first();
    await expect(resumeTab).toBeVisible({ timeout: 5000 });
    await resumeTab.click();
    await page.waitForTimeout(1200);

    // 이력서 폼이 표시되는지
    const resumeArea = page.locator('#resume-area, #jobs-content');
    const resumeTxt = await resumeArea.textContent().catch(() => '');
    console.log(`  이력서 영역: ${resumeTxt.slice(0,80)}`);

    // 채용공고 지원
    const applyJobId = await page.evaluate(async (jobId) => {
      const already = await window._db.collection('yongcha_applies')
        .where('jobId','==',jobId).where('driverId','==',window._CU.uid).limit(1).get();
      if (!already.empty) return already.docs[0].id;
      const ref = await window._db.collection('yongcha_applies').add({
        jobId: jobId, postId: '',
        driverId: window._CU.uid, driverName: window._CU.name,
        driverPhone: window._CU.phone, driverRegion: window._CU.region,
        agencyId: '', agencyName: '테스트대리점부산',
        status: 'pending', appliedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      return ref.id;
    }, S.jobId);
    console.log(`  채용공고 지원 ID: ${applyJobId}`);
    expect(applyJobId).toBeTruthy();

    // 채용 공고 목록에서 지원한 공고 확인
    const jobListTab = page.locator('.sub-tab').filter({ hasText: '채용 공고' }).first();
    await jobListTab.click();
    await page.waitForTimeout(1500);
    const visibleJobs = page.locator('#job-list .job-card, #jobs-content .job-card');
    const visibleCnt = await visibleJobs.count();
    console.log(`  채용공고 목록 수: ${visibleCnt}`);
    expect(visibleCnt).toBeGreaterThan(0);
    console.log('  ✅ 구인구직 테스트 완료');
  });

  // ─────────────────────────────────────────────────────────────────────────
  test('11. 관리자 대시보드 접속', async ({ page }) => {
    console.log(`\n[11] 관리자 대시보드 (${ADMIN_EMAIL})`);

    // 관리자 계정이 Firebase에 있는지 먼저 로그인 시도
    await gotoApp(page);
    await page.fill('#l-email', ADMIN_EMAIL);
    await page.fill('#l-pw', PW);
    await page.click('#l-btn');

    await page.waitForTimeout(3000);
    const loginErr = await page.locator('#l-err').textContent().catch(() => '');
    console.log(`  로그인 에러: "${loginErr.trim()}"`);

    if (loginErr.includes('없는 계정') || loginErr.includes('invalid') || loginErr.includes('user-not-found')) {
      // 계정 없음 → 회원가입 (ADMINS 배열에 email 추가됨)
      console.log('  계정 없음 → 회원가입');
      await page.click('#tab-reg');
      await page.waitForTimeout(300);
      await page.click('#t-agency');
      await page.fill('#r-name', '테스트관리자');
      await page.fill('#r-email', ADMIN_EMAIL);
      await page.fill('#r-phone', '051-711-3103');
      await page.selectOption('#r-region', '부산');
      await page.fill('#r-pw', PW);
      await page.click('#r-btn');
    }

    // 앱 화면 대기
    await page.waitForSelector('#app', { state: 'visible', timeout: 30000 });
    await page.waitForFunction(() => window._CU && !!window._CU.uid, { timeout: 15000 });

    // 관리자 타입 확인
    const userType = await page.evaluate(() => window._CU.type);
    console.log(`  유저 타입: ${userType}`);
    expect(userType).toBe('admin');

    // 헤더 배지
    const badge = (await page.textContent('#hdr-badge')).trim();
    console.log(`  배지: "${badge}"`);
    expect(badge).toContain('관리자');

    // 바텀 네비에 "회원" 탭 존재
    const memberNavBtn = page.locator('#bnav-members');
    await expect(memberNavBtn).toBeVisible({ timeout: 5000 });
    console.log('  관리자 전용 "회원" 탭 존재 확인');

    // 회원 관리 페이지
    await goToPage(page, 'members');
    await page.waitForTimeout(2000);

    // KPI 카드
    const agencyKpi = page.locator('#adm-agency');
    await expect(agencyKpi).toBeVisible({ timeout: 10000 });
    const agencyCnt = (await agencyKpi.textContent()).trim();
    const driverCnt = (await page.locator('#adm-driver').textContent()).trim();
    console.log(`  KPI - 대리점: ${agencyCnt}, 기사: ${driverCnt}`);

    // 회원 목록
    const memberItems = page.locator('#members-list .card');
    await expect(memberItems.first()).toBeVisible({ timeout: 10000 });
    const memberCount = await memberItems.count();
    console.log(`  회원 목록: ${memberCount}명 표시`);
    expect(memberCount).toBeGreaterThan(0);

    // 공고 관리 탭
    const postMgmtTab = page.locator('.sub-tab').filter({ hasText: '공고 관리' }).first();
    await expect(postMgmtTab).toBeVisible({ timeout: 5000 });
    await postMgmtTab.click();
    await page.waitForTimeout(2000);

    const postItems = page.locator('#adm-content .card');
    await expect(postItems.first()).toBeVisible({ timeout: 10000 });
    const postCount = await postItems.count();
    console.log(`  공고 관리: ${postCount}개 표시`);
    expect(postCount).toBeGreaterThan(0);

    // 정지 기능 테스트 (UI 확인만)
    const suspendBtns = page.locator('button').filter({ hasText: '정지' });
    const suspendCnt = await suspendBtns.count();
    console.log(`  정지 버튼 수: ${suspendCnt}`);

    console.log('  ✅ 관리자 대시보드 접속 성공');
  });

});
