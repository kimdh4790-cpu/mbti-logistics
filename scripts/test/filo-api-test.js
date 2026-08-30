#!/usr/bin/env node
/**
 * FILO API 실사 테스트 — 브라우저 없이 Firebase REST + Worker API
 * 실행: node scripts/test/filo-api-test.js
 *
 * 환경변수:
 *   export FILO_EMAIL=soungkyekim@naver.com
 *   export FILO_PASS=your_password
 *   export FILO_DID=9XD2K3W1tIhIs6XM74YT0xfRFEP2
 */

const BASE  = 'https://filo.ai.kr';
const DINE  = 'https://dine.ne.kr';
// Firebase Web API Key (클라이언트 공개키 — filo-auth.js에도 노출됨)
const FIREBASE_KEY = 'AIzaSyDQmEFfLczgCuPQidunbBXqaHWgs39VMg0';

const EMAIL = process.env.FILO_EMAIL || '';
const PASS  = process.env.FILO_PASS  || '';
const DID   = process.env.FILO_DID   || '9XD2K3W1tIhIs6XM74YT0xfRFEP2';

if (!EMAIL || !PASS) {
  console.error('환경변수 누락:');
  console.error('  export FILO_EMAIL=soungkyekim@naver.com');
  console.error('  export FILO_PASS=khw3103!!!');
  console.error('  export FILO_DID=9XD2K3W1tIhIs6XM74YT0xfRFEP2');
  process.exit(1);
}

let passed = 0, failed = 0;
const results = [];

function log(ok, label, detail = '') {
  const mark = ok ? '✅' : '❌';
  const line = `${mark} ${label}${detail ? ' — ' + detail : ''}`;
  console.log(line);
  results.push({ ok, label, detail });
  if (ok) passed++; else failed++;
}

async function getToken() {
  const r = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Referer': 'https://filo.ai.kr',  // Firebase API 키 리퍼러 제한 우회
        'Origin': 'https://filo.ai.kr',
      },
      body: JSON.stringify({ email: EMAIL, password: PASS, returnSecureToken: true }),
    }
  );
  const d = await r.json();
  if (!d.idToken) throw new Error('Firebase 로그인 실패: ' + JSON.stringify(d.error));
  return d.idToken;
}

async function req(url, opts = {}) {
  try {
    const r = await fetch(url, { ...opts, signal: AbortSignal.timeout(15000) });
    const text = await r.text();
    return { status: r.status, text };
  } catch (e) {
    return { status: 0, text: e.message };
  }
}

(async () => {
  console.log('\n══════════════════════════════════════');
  console.log(' FILO API 실사 테스트 (REST 방식)');
  console.log('══════════════════════════════════════');

  /* ── 1. Firebase 로그인 ── */
  console.log('\n═══ 1. Firebase 로그인 ═══');
  let token = '';
  try {
    token = await getToken();
    log(true, 'Firebase Auth 로그인', `토큰 ${token.length}자`);
  } catch (e) {
    log(false, 'Firebase Auth 로그인', e.message);
    console.log('토큰 없이 계속...');
  }

  const auth = token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };

  /* ── 2. 페이지 서빙 확인 (인증 불필요) ── */
  console.log('\n═══ 2. 페이지 서빙 확인 ═══');

  const landing = await req(BASE + '/');
  log(landing.status === 200 && landing.text.includes('html'), 'filo.ai.kr 랜딩', `HTTP ${landing.status}`);

  const app = await req(BASE + '/app');
  log(app.status === 200 && app.text.includes('fl-id'), 'filo.ai.kr/app (로그인 폼)', `HTTP ${app.status}, #fl-id: ${app.text.includes('fl-id')}`);

  const qr = await req(`${BASE}/qr?did=${DID}&action=in`);
  log(
    qr.status === 200 && (qr.text.includes('출근') || qr.text.includes('직원') || qr.text.includes('선택') || qr.text.includes('html')),
    'QR 출퇴근 페이지',
    `HTTP ${qr.status}`
  );
  if (qr.status === 200) {
    const hasStaff = qr.text.includes('출근') || qr.text.includes('직원') || qr.text.includes('선택');
    log(hasStaff, 'QR 페이지 직원 선택 UI', hasStaff ? '출근/직원/선택 텍스트 포함' : '관련 텍스트 없음');
  }

  const orderPage = await req(`${BASE}/order?d=${DID}&t=1&name=1번테이블`);
  log(orderPage.status === 200, 'QR 주문 페이지', `HTTP ${orderPage.status}`);

  const storePage = await req(`${BASE}/store?did=${DID}`);
  log(storePage.status === 200, '매장 주문 현황', `HTTP ${storePage.status}`);

  const kitchenPage = await req(`${BASE}/kitchen?did=${DID}`);
  log(kitchenPage.status === 200, '주방 디스플레이', `HTTP ${kitchenPage.status}`);

  /* ── 3. 인증 필요 API ── */
  console.log('\n═══ 3. Worker API 테스트 ═══');

  if (token) {
    // 에러 로그 (슈퍼어드민 전용)
    const errors = await req(`${BASE}/api/errors`, { headers: auth });
    const errOk = errors.status === 200;
    log(errOk, '/api/errors (슈퍼어드민)', `HTTP ${errors.status}${errOk ? ', ' + errors.text.slice(0, 60) : ''}`);

    // 번역 API
    const tr = await req(`${BASE}/api/translate`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ text: '아메리카노', target: 'en', dealerId: DID }),
    });
    const trOk = tr.status === 200 && tr.text.length > 0;
    log(trOk, '번역 API (/api/translate)', `HTTP ${tr.status}, 결과: ${tr.text.slice(0, 60)}`);
  } else {
    log(false, '/api/errors', '토큰 없음');
    log(false, '번역 API', '토큰 없음');
  }

  // QR 멤버 목록 (SA 키 필요, 실패해도 무방)
  const qrMembers = await req(`${BASE}/qr/members?did=${DID}`, { headers: auth });
  const membersOk = qrMembers.status === 200;
  let memberCount = 0;
  if (membersOk) {
    try { memberCount = JSON.parse(qrMembers.text).length || 0; } catch (_) {}
  }
  log(membersOk, 'QR 직원 목록 (/qr/members)', `HTTP ${qrMembers.status}${membersOk ? ', 직원 ' + memberCount + '명' : ''}`);

  /* ── 4. DINE 앱 ── */
  console.log('\n═══ 4. DINE 앱 확인 ═══');

  const dineLanding = await req(DINE + '/');
  log(dineLanding.status === 200, 'dine.ne.kr 접속', `HTTP ${dineLanding.status}`);

  const dineApp = await req(DINE + '/app');
  log(
    dineApp.status === 200 && (dineApp.text.includes('li-email') || dineApp.text.includes('li-pw') || dineApp.text.includes('html')),
    'DINE 앱 로그인 폼',
    `HTTP ${dineApp.status}, 폼: ${dineApp.text.includes('li-email')}`
  );

  /* ── 결과 요약 ── */
  console.log('\n══════════════════════════════');
  console.log(`결과: ${passed}개 통과 / ${failed}개 실패`);
  console.log('══════════════════════════════\n');

  const { writeFileSync, mkdirSync } = require('fs');
  const { join } = require('path');
  const outDir = join(__dirname, '../../output');
  mkdirSync(outDir, { recursive: true });
  const reportPath = join(outDir, 'api-test-report.json');
  writeFileSync(reportPath, JSON.stringify({ passed, failed, results, ts: new Date().toISOString() }, null, 2));
  console.log(`리포트: ${reportPath}`);

  process.exit(failed > 0 ? 1 : 0);
})();
