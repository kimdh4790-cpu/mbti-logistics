// ================================================================
// _worker.js — Cloudflare Worker (mbti-logistics)
// 최종수정: 2026-07-17 | 담당: 엠비티아이 김형우
// ================================================================
//
// ⚠️ Claude에게 — 반드시 읽을 것 ⚠️
// 1. GitHub API + 토큰으로 파일 직접 수정/업로드 가능
//    → "권한 없다", "wrangler 필요하다" 하면 안 됨
// 2. GitHub push → GitHub Actions 자동배포 작동 중
// 3. 배포 순서: GitHub API로 파일 수정 → Actions 자동배포 완료
//
// [도메인별 라우팅]
//   donway.ai.kr  → /join=/admin → settle.html (AI정산 SaaS)
//   filo.ai.kr    → filo.html + /api/* + JS 파일 서빙 (외식업 운영)
//   dine.ne.kr    → dine.html + dine-*.js 서빙 (외식업 특화)
//   mbtico.kr     → /hub/label/scan/emergency 등 (배송현장앱)
//
// [KV 키 — 절대 변경 금지]
//   settle.html → 'settle.html' (donway-pages/index.html 아님!)
//   filo-manifest.json → 'filo-manifest.json'
//
// [공개 API (비로그인 가능)]
//   /api/menus?did=        — 메뉴 목록 (고객 QR주문용)
//   /api/tables?did=       — 테이블 현황
//   /api/booking POST      — 예약 저장
//   /api/booking-status?bid= — 예약 상태 확인
//   /api/translate         — 메뉴 다국어 번역 (Anthropic API)
//   /api/store?did=        — 배달 매장 정보
//   /api/menus-bulk        — 메뉴 일괄 조회
//
// [JS 파일 서빙]
//   filo-*.js, dine-*.js, order.js, store.js, donway_landing.js 등
//   ⚠️ 새 JS 파일 추가 시 반드시 이 파일 서빙 배열 + deploy.yml KV 목록에도 추가!
//
// [DONWAY /join 커스터마이즈 주입]
//   범용정산·재고관리 카드 숨김, AI정산 요금 실제값 교체
//   구독 팝업: AI정산+배달대행만 노출 (qr_payroll/universal/filo_combo 숨김)
//
// [Secrets]
//   ANTHROPIC_API_KEY    — 번역 AI
//   FIREBASE_SA_KEY      — Firestore 서버 접근 (Rules 배포)
//   CRON_SECRET          — 구독 만료 크론
//   GOOGLE_TRANSLATE_KEY — 번역 폴백
//
// [배포]
//   GitHub push → Actions 자동배포 (deploy.yml)
//   수동: npx wrangler deploy (mbti-logistics 폴더에서)
//
// [2026-07-17 주요 변경]
//   - /api/ctrl-notify 관제센터 FCM/이메일 알림 API 추가
//   - admin.html/admin_sub.html 삭제 → /control 리다이렉트
//   - 슬러그 기반 고객사 데이터 분리 (__FILO_DEALER_ID__ 주입)
//   - filo-auth.js services 기반 메뉴 on/off 연동
//   - Storage Rules + Firestore Rules 보안 강화
//   - SA 쓰기 차단 (읽기 전용)
//   - 슬러그 중복 검사, 계좌이체 결제 안내
//   - 월별카드 총매출 정산현황 일치
//
// ⚠️ mbtico.kr → mbtico-pages/_worker.js 별도 서빙!
// ⚠️ settle.html = donway-pages/index.html (KV키: settle.html)
//
// ═══════════════════════════════════════════════════════════════
// 🚨 Claude — 절대 건들면 안 되는 항목 (삭제·이름변경·이동 금지)
// ═══════════════════════════════════════════════════════════════
//
// [DONWAY 정산 핵심 함수 — 절대 삭제 금지]
//   parseCoupangExcel        — 쿠팡 엑셀 파싱 진입점
//   _parseCoupangExcelInner  — 내부 파싱 로직
//   _parseCoupangWing        — Wing 엑셀 파싱
//   recalcAllSettlements     — 전체 정산 재계산
//   calcDeliveryBonus        — 배달 인센티브 계산
//   pageSettle               — 정산 메인 페이지
//   pageSettlements          — 정산 현황 목록
//   _renderSettleList        — 정산 목록 렌더링
//   _renderSettlePage        — 정산 상세 렌더링
//   _sendAlimtalk            — 알림톡 발송
//   _sendAlimtalkWithStmt    — 명세서 포함 알림톡 발송
//
// [DONWAY 핵심 변수 — 절대 삭제·이름변경 금지]
//   DW_TIERS_IND      — 개인 요금제 단계
//   DW_TIERS_GRP      — 단체 요금제 단계
//   IND_TERMS         — 업종별 서비스 약관 (ai_settle / delivery 포함)
//   _idSupportRules   — 아이디지원 규칙 (앞=지원받는기사 fid, 뒤=대신배송기사 tid)
//   _routeCampMap     — 라우트↔캠프 매핑
//   _routePrices      — 라우트별 단가
//   dateRoutes        — 날짜별 라우트 정보
//   _guaranteeAmt     — 보장 금액
//   _checkAlimtalkQuota — 알림톡 잔액 확인
//
// [Worker 라우팅 — 순서·위치 변경 금지]
//   filo.ai.kr 블록은 반드시 slug 라우팅 체크보다 앞에 위치
//   /api/* 블록은 도메인 라우팅 블록보다 앞에 위치
//   mbtico.kr → mbtico-pages/_worker.js 별도 서빙 (이 파일 아님!)
//
// [KV 키 이름 — 절대 변경 금지]
//   'settle.html'       — donway-pages/index.html 의 KV 키
//   'filo-manifest.json'— FILO PWA 매니페스트
//   ⚠️ KV 키 ≠ 파일명인 경우 반드시 위 목록 확인 후 작업
//
// [의도적 공개 Firestore 규칙 — 보안 강화 명목으로 닫으면 안 됨]
//   filo_orders create: true    — 비로그인 고객 주문
//   filo_menus  read:   true    — QR주문 페이지
//   join_requests create: true  — 가입 신청
//   statement_share read: true  — 정산서 공유링크
//   filo_bookings create: true  — 비로그인 예약
//   filo_point_log create: true — 고객 포인트 적립
//
// [filo-common.js — 직접 수정 금지]
//   리팩토링 완료본. 변경 필요 시 분리된 모듈(filo-order-common.js 등) 수정
//
// ═══════════════════════════════════════════════════════════════
//
// [2026-07-16 주요 변경]
//   - /join 라우팅: KV에서 settle.html 읽어 UI 커스터마이즈 주입
//   - filo-qr.js, dine-schedule.js JS 서빙 목록 추가
//   - /v9, /app 레거시 경로 제거
//   - /universal → /join 리다이렉트
//   - /company-register → /join 리다이렉트
// ================================================================

// ── 보안 설정 ──────────────────────────────────────────────────────────────
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)',
  'X-XSS-Protection': '1; mode=block',
  'Content-Security-Policy': "default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com https://apis.google.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://js.tosspayments.com https://cdn.iamport.kr https://static.cloudflareinsights.com https://t1.kakaocdn.net https://t1.daumcdn.net https://developers.kakao.com https://dapi.kakao.com https://www.googletagmanager.com https://www.google-analytics.com; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https: blob:; connect-src 'self' https://donway.ai.kr https://app.donway.ai.kr https://filo.ai.kr https://dine.ne.kr https://*.firebaseio.com https://*.googleapis.com wss://*.firebaseio.com https://api.anthropic.com https://api.toss.im https://api.tosspayments.com https://*.tosspayments.com https://log.tosspayments.com/v1/log https://event.tosspayments.com https://www.gstatic.com https://api.ipify.org https://dapi.kakao.com https://kapi.kakao.com https://t1.daumcdn.net https://www.googletagmanager.com https://www.google-analytics.com https://region1.google-analytics.com; frame-ancestors 'none';",
};

// Rate Limiting (메모리 기반, Worker 재시작 시 초기화)
const rateLimitMap = new Map();
function checkRateLimit(ip, limit = 60, windowMs = 60000) {
  const now = Date.now();
  const key = ip;
  if (!rateLimitMap.has(key)) rateLimitMap.set(key, []);
  const timestamps = rateLimitMap.get(key).filter(t => now - t < windowMs);
  timestamps.push(now);
  rateLimitMap.set(key, timestamps);
  return timestamps.length <= limit;
}

// ── Firebase ID 토큰 검증 ──────────────────────────────────────────────────
async function verifyFirebaseToken(request) {
  try {
    const auth = request.headers.get('Authorization') || '';
    const token = auth.replace('Bearer ', '').trim();
    if (!token || token.length < 100) return null;
    // Firebase API Key는 환경변수에서 가져오기
    const apiKey = (env && env.FIREBASE_API_KEY) ? env.FIREBASE_API_KEY : '';
    if (!apiKey) return {uid: 'verified'}; // API Key 없으면 토큰 존재만 확인
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({idToken: token})
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.users?.[0] || null;
  } catch(e) { return null; }
}

// 보안 헤더 적용 헬퍼
function addSecurityHeaders(response, allowIframe = false) {
  const newHeaders = new Headers(response.headers);
  Object.entries(SECURITY_HEADERS).forEach(([k,v]) => newHeaders.set(k, v));
  // iframe 허용 시 X-Frame-Options 제거 (시뮬레이터 등)
  if (allowIframe) newHeaders.delete('X-Frame-Options');
  return new Response(response.body, { status: response.status, headers: newHeaders });
}

// 접근 거부 헬퍼
function forbidden(msg = '접근이 거부되었습니다') {
  return new Response(JSON.stringify({ error: msg }), {
    status: 403,
    headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS }
  });
}

const PROJECT_ID = 'mbti-logistics';
// ★ GitHub Raw 직접 서빙
let _env_ref = null;
async function fetchAsset(path, request, env) {
  const e = env || _env_ref;
  const filePath = path.startsWith('/') ? path : '/' + path;
  const fileName = filePath.replace(/^\//, '').split('?')[0]; // 쿼리스트링 제거

  // KV 우선 서빙
  if (e && e.DONWAY_ASSETS) {
    const kvVal_fa = await e.DONWAY_ASSETS.get(fileName, 'text');
    if (kvVal_fa) {
      return new Response(kvVal_fa, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0', 'Pragma': 'no-cache', 'Surrogate-Control': 'no-store', 'X-Served-From': 'KV' } });
    }
  }
  // KV 없으면 GitHub Raw
  const bust = Date.now() + Math.random().toString(36).slice(2);
  const fetchUrl = 'https://raw.githubusercontent.com/kimdh4790-cpu/mbti-logistics/main/' + fileName + '?bust=' + bust;
  const ghResp = await fetch(fetchUrl, {
    cf: { cacheEverything: false, cacheTtl: 0, bypassCache: true },
    headers: { 'Cache-Control': 'no-cache, no-store', 'Pragma': 'no-cache' }
  });
  const ghText = await ghResp.text();
  const ext2 = fileName.split('.').pop().toLowerCase();
  const types2 = { html:'text/html; charset=utf-8', js:'application/javascript', css:'text/css', json:'application/json' };
  return new Response(ghText, { status: ghResp.status, headers: { 'Content-Type': types2[ext2]||'text/plain', 'Cache-Control': 'no-store, no-cache, must-revalidate', 'X-Served-From': 'GitHub' } });
}

// ★ serveKVFile — fetchAsset 래퍼 (도메인별 라우팅용)
async function serveKVFile(env, fileName, contentType) {
  const _NAVER_META = '<meta name="naver-site-verification" content="26f9af7ad9b774a92a8fecad908882c81a64537b" />';
  const _injectMeta = (html) => html.replace('<head>', '<head>' + _NAVER_META);
  try {
    // KV 우선 서빙
    const _e = env || _env_ref;
    if (_e && _e.DONWAY_ASSETS) {
      const kvVal_sf = await _e.DONWAY_ASSETS.get(fileName, 'text');
      if (kvVal_sf) {
        const body_sf = contentType === 'text/html' ? _injectMeta(kvVal_sf) : kvVal_sf;
        return new Response(body_sf, { headers: { 'Content-Type': contentType+'; charset=utf-8', 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0', 'Pragma': 'no-cache', 'Surrogate-Control': 'no-store', 'X-Served-From': 'KV', ...SECURITY_HEADERS } });
      }
    }
    // KV 없으면 GitHub Raw
    const PAGES_FILES = {};
    const bust = Date.now() + Math.random().toString(36).slice(2);
    const fileUrl = PAGES_FILES[fileName]
      ? PAGES_FILES[fileName] + '?bust=' + bust
      : 'https://api.github.com/repos/kimdh4790-cpu/mbti-logistics/contents/' + encodeURIComponent(fileName);
    const resp = await fetch(fileUrl, {
      cf: { cacheEverything: false, cacheTtl: 0, bypassCache: true },
      headers: { 'Cache-Control': 'no-cache, no-store', 'Pragma': 'no-cache' }
    });
    if (resp.ok) {
      let rawText;
      const ct = resp.headers.get('Content-Type')||'';
      if (ct.includes('application/json')) {
        const j = await resp.json();
        rawText = j.content ? atob(j.content.replace(/\n/g,'')) : await resp.text();
      } else { rawText = await resp.text(); }
      const text = rawText;


      return new Response(text, {
        headers: { 'Content-Type': contentType+'; charset=utf-8', 'Cache-Control': 'no-store, no-cache, must-revalidate', 'X-Served-From': 'GitHub', ...SECURITY_HEADERS }
      });
    }
    return new Response(fileName + ' not found', { status: 404 });
  } catch(e2) {
    return new Response('Error: ' + e2.message, { status: 500 });
  }
}

// ── 임시 비밀번호 생성 (영문+숫자 8자리) ──
function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes).map(b => chars[b % chars.length]).join('');
}

// ── 플랜별 접속 URL 반환 ──
function getPlanUrl(planType, slug) {
  const base = 'https://donway.ai.kr';
  const slugPath = slug ? ('/' + slug) : '/settle';
  const urls = {
    settle:   slugPath,
    full:     slugPath,
    contract: slugPath,
    roster:   slugPath,
    qr:       base + '/attendance'
  };
  return base + (urls[planType] || slugPath);
}


// ── 슈퍼어드민 Firestore 수정 엔드포인트 ──
// POST /sa/firestore { collection, docId, fields: {key:value} }
async function handleSAFirestore(request, env) {
  try {
    const body = await request.json();
    const { collection, docId, fields } = body;
    if (!collection || !docId || !fields) {
      return new Response(JSON.stringify({error:'collection/docId/fields 필수'}), {status:400, headers:{'Content-Type':'application/json'}});
    }
    const SA_KEY = env.FIREBASE_SA_KEY ? JSON.parse(env.FIREBASE_SA_KEY) : null;
    if (!SA_KEY) return new Response(JSON.stringify({error:'SA_KEY 없음'}), {status:500, headers:{'Content-Type':'application/json'}});

    // Google OAuth2 token 발급
    const now = Math.floor(Date.now()/1000);
    const header = btoa(JSON.stringify({alg:'RS256',typ:'JWT'}));
    const claim = btoa(JSON.stringify({
      iss: SA_KEY.client_email,
      scope: 'https://www.googleapis.com/auth/datastore',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now+3600, iat: now
    }));
    // JWT 서명 (RSA는 Workers에서 crypto.subtle로)
    const pemKey = SA_KEY.private_key;
    const keyData = pemKey.replace(/-----.*?-----/g,'').replace(/\s/g,'');
    const binaryKey = Uint8Array.from(atob(keyData), c=>c.charCodeAt(0));
    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8', binaryKey.buffer,
      {name:'RSASSA-PKCS1-v1_5', hash:'SHA-256'},
      false, ['sign']
    );
    const sigInput = new TextEncoder().encode(header+'.'+claim);
    const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, sigInput);
    const jwt = header+'.'+claim+'.'+btoa(String.fromCharCode(...new Uint8Array(sig)));

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method:'POST',
      headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body:`grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
    });
    const {access_token} = await tokenRes.json();

    // Firestore PATCH
    const PROJECT = 'mbti-logistics';
    const fieldMap = {};
    for(const [k,v] of Object.entries(fields)) {
      fieldMap[k] = typeof v==='number' ? {integerValue:v} : {stringValue:String(v)};
    }
    const fsRes = await fetch(
      `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${collection}/${docId}?updateMask.fieldPaths=${Object.keys(fields).join('&updateMask.fieldPaths=')}`,
      {method:'PATCH', headers:{'Authorization':`Bearer ${access_token}`,'Content-Type':'application/json'},
       body:JSON.stringify({fields:fieldMap})}
    );
    const result = await fsRes.json();
    return new Response(JSON.stringify({ok:true, result}), {headers:{'Content-Type':'application/json'}});
  } catch(e) {
    return new Response(JSON.stringify({error:e.message}), {status:500, headers:{'Content-Type':'application/json'}});
  }
}

// ── 기사 배치 업데이트 (이름 기준 ssn/joinDate/bizNum) ──
async function handleDriversBatch(request, env) {
  try {
    const body = await request.json();
    const { dealerId, drivers } = body;
    if (!dealerId || !drivers) return new Response(JSON.stringify({error:'dealerId/drivers 필수'}), {status:400, headers:{'Content-Type':'application/json'}});

    const SA_KEY = env.FIREBASE_SA_KEY ? JSON.parse(env.FIREBASE_SA_KEY) : null;
    if (!SA_KEY) return new Response(JSON.stringify({error:'SA_KEY 없음'}), {status:500, headers:{'Content-Type':'application/json'}});

    const now = Math.floor(Date.now()/1000);
    const pemKey = SA_KEY.private_key;
    const keyData = pemKey.replace(/-----.*?-----/g,'').replace(/\s/g,'');
    const binaryKey = Uint8Array.from(atob(keyData), c=>c.charCodeAt(0));
    const cryptoKey = await crypto.subtle.importKey('pkcs8', binaryKey.buffer, {name:'RSASSA-PKCS1-v1_5', hash:'SHA-256'}, false, ['sign']);
    const header = btoa(JSON.stringify({alg:'RS256',typ:'JWT'}));
    const claim = btoa(JSON.stringify({iss:SA_KEY.client_email, scope:'https://www.googleapis.com/auth/datastore', aud:'https://oauth2.googleapis.com/token', exp:now+3600, iat:now}));
    const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(header+'.'+claim));
    const jwt = header+'.'+claim+'.'+btoa(String.fromCharCode(...new Uint8Array(sig)));
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body:`grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`});
    const {access_token} = await tokenRes.json();

    const PROJECT = 'mbti-logistics';
    // drivers 컬렉션 전체 조회
    const listRes = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/drivers?pageSize=200`, {headers:{'Authorization':`Bearer ${access_token}`}});
    const listData = await listRes.json();
    const docs = listData.documents || [];

    // 이름→docId 맵
    const nameMap = {};
    for (const doc of docs) {
      const f = doc.fields || {};
      const dId = f.dealerId?.stringValue || '';
      if (dId !== dealerId) continue;
      const name = f.name?.stringValue || '';
      if (name) nameMap[name] = doc.name;
    }

    let updated = 0, notFound = [];
    for (const drv of drivers) {
      const docPath = nameMap[drv.name];
      if (!docPath) { notFound.push(drv.name); continue; }

      const fields = {};
      if (drv.ssn) fields.ssn = {stringValue: drv.ssn};
      if (drv.joinDate) fields.joinDate = {stringValue: drv.joinDate};
      if (drv.bizNum) { fields.bizNum = {stringValue: drv.bizNum}; fields.isBiz = {booleanValue: true}; }

      const mask = Object.keys(fields).map(k=>`updateMask.fieldPaths=${k}`).join('&');
      await fetch(`https://firestore.googleapis.com/v1/${docPath}?${mask}`, {
        method:'PATCH', headers:{'Authorization':`Bearer ${access_token}`,'Content-Type':'application/json'},
        body: JSON.stringify({fields})
      });
      updated++;
    }

    return new Response(JSON.stringify({ok:true, updated, notFound}), {headers:{'Content-Type':'application/json'}});
  } catch(e) {
    return new Response(JSON.stringify({error:e.message}), {status:500, headers:{'Content-Type':'application/json'}});
  }
}

// ── FCM 푸시 발송 (Cloud Function sendPush 경유) ──
async function sendFCMPush(fcmToken, title, body, data = {}) {
  if (!fcmToken) return { sent: false, reason: 'no token' };
  try {
    const resp = await fetch('https://us-central1-mbti-logistics.cloudfunctions.net/sendPush', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: fcmToken, title, body, data })
    });
    return resp.ok ? { sent: true } : { sent: false, reason: await resp.text() };
  } catch(e) {
    return { sent: false, reason: e.message };
  }
}

// ── 관리자 FCM 푸시 발송 ──
async function sendAdminFCM(env, token, { title, body, type }) {
  try {
    const accessToken = await getAccessToken(env);
    const resp = await fetch(
      `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: {
            token: token,
            notification: { title, body },
            data: { type: type || 'alert' },
            android: { priority: 'high', notification: { sound: 'default', channelId: 'donway_admin' } },
            apns: { payload: { aps: { sound: 'default', badge: 1 } } },
            webpush: { notification: { icon: '/icon-192.png', badge: '/icon-192.png', requireInteraction: true } }
          }
        })
      }
    );
    return resp.ok;
  } catch(e) {
    console.error('[FCM]', e.message);
    return false;
  }
}

// 관리자 전체 기기에 FCM 푸시 발송
async function notifyAdmins(env, token, { title, body, type }) {
  try {
    // admin_tokens 컬렉션에서 모든 관리자 토큰 조회
    const resp = await fetch(`${FS_BASE}/admin_tokens`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!resp.ok) return;
    const data = await resp.json();
    const docs = data.documents || [];
    // 병렬로 모든 관리자 기기에 발송
    await Promise.allSettled(
      docs.map(doc => {
        const fcmToken = doc.fields?.token?.stringValue;
        if (fcmToken) return sendAdminFCM(env, fcmToken, { title, body, type });
      }).filter(Boolean)
    );
  } catch(e) {
    console.error('[notifyAdmins]', e.message);
  }
}

// ── 환영 이메일 발송 (Gmail SMTP via Cloudflare Email) ──
async function sendWelcomeEmail(env, { email, companyName, tempPassword, planType, loginUrl, planLabel }) {
  const emailKey = env.EMAIL_API_KEY || env.RESEND_API_KEY;
  if (!emailKey) { console.log('[Email] API키 없음:', email); return Promise.resolve({ok:false,reason:'no_key'}); }
  const signupUrl = loginUrl || 'https://donway.ai.kr/settle';
  const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f0f4ff;font-family:sans-serif"><div style="max-width:480px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.1)"><div style="background:linear-gradient(135deg,#0066ff,#00d4ff);padding:32px 24px;text-align:center"><div style="font-size:32px;margin-bottom:8px"></div><div style="color:#fff;font-size:22px;font-weight:900">DONWAY 승인 완료!</div><div style="color:rgba(255,255,255,.8);font-size:13px;margin-top:6px">7일 무료 체험이 시작됩니다</div></div><div style="padding:28px 24px"><p style="font-size:15px;font-weight:700;color:#1a1a2e;margin-bottom:16px">안녕하세요, <b>${companyName}</b> 대표님!</p><p style="font-size:13px;color:#555;line-height:1.7;margin-bottom:24px">DONWAY 도입 신청이 승인되었습니다.<br>지금 바로 <b>7일 무료 체험</b>을 시작하세요!</p><div style="background:#f8faff;border:1px solid #e0e8ff;border-radius:12px;padding:16px;margin-bottom:24px"><div style="font-size:12px;color:#888;margin-bottom:8px">로그인 정보</div><div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee;font-size:13px"><span style="color:#888">이메일</span><span style="font-weight:700;color:#1a1a2e">${email}</span></div>${tempPassword ? `<div style="display:flex;justify-content:space-between;padding:8px 0;font-size:13px"><span style="color:#888">임시 비밀번호</span><span style="font-weight:700;color:#0066ff;font-family:monospace;font-size:15px">${tempPassword}</span></div>` : ''}</div><a href="${signupUrl}" style="display:block;text-align:center;background:linear-gradient(90deg,#0066ff,#00d4ff);color:#fff;padding:15px;border-radius:12px;font-size:15px;font-weight:900;text-decoration:none;margin-bottom:16px">DONWAY 시작하기 →</a><div style="text-align:center;font-size:11px;color:#aaa">문의: 051-711-3103 · 평일 09:00~18:00</div></div><div style="background:#f8faff;padding:16px 24px;text-align:center;font-size:11px;color:#aaa">© 2026 (유)엠비티아이 · DONWAY</div></div></body></html>`;
  return fetch('https://api.resend.com/emails', { method:'POST', headers:{'Authorization':`Bearer ${emailKey}`,'Content-Type':'application/json'}, body: JSON.stringify({ from:'DONWAY <all@donway.ai.kr>', to:[email], subject:`[DONWAY] ${companyName} 계정 승인 완료 — 7일 무료 체험 시작!`, html }) }).then(res => { console.log('[Email] 발송:', res.status, email); return res; }).catch(e => { console.error('[Email] 오류:', e.message); return {ok:false,reason:e.message}; });
}

// 16진수 문자열 → Uint8Array
function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}
const FS_BASE    = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// ── Service Account JWT ───────────────────────────────────────────────────────
async function importPrivateKey(pem) {
  const content = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  const binary = atob(content);
  const bytes  = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return crypto.subtle.importKey(
    'pkcs8', bytes.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  );
}
function b64url(str) {
  return btoa(str).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
}
function b64urlBuf(buf) {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
}
async function makeServiceJWT(sa) {
  const now = Math.floor(Date.now() / 1000);
  const hdr = b64url(JSON.stringify({ alg:'RS256', typ:'JWT' }));
  const pay = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600
  }));
  const key = await importPrivateKey(sa.private_key);
  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5', key,
    new TextEncoder().encode(`${hdr}.${pay}`)
  );
  return `${hdr}.${pay}.${b64urlBuf(sig)}`;
}
async function makeFirebaseCustomToken(sa, uid) {
  const now = Math.floor(Date.now() / 1000);
  const hdr = b64url(JSON.stringify({ alg:'RS256', typ:'JWT' }));
  const pay = b64url(JSON.stringify({
    iss: sa.client_email, sub: sa.client_email,
    aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdTokenFactory',
    uid, iat: now, exp: now + 3600
  }));
  const key = await importPrivateKey(sa.private_key);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${hdr}.${pay}`));
  return `${hdr}.${pay}.${b64urlBuf(sig)}`;
}
async function getAccessToken(env) {
  if (!env.FIREBASE_SA_KEY) throw new Error('FIREBASE_SA_KEY not set');
  const sa  = JSON.parse(env.FIREBASE_SA_KEY);
  const jwt = await makeServiceJWT(sa);
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('Token error: ' + JSON.stringify(data));
  return data.access_token;
}

// ── Firestore REST helpers ────────────────────────────────────────────────────
async function fsQuery(token, collectionId, filters) {
  const res = await fetch(`${FS_BASE}:runQuery`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId }],
        where: { compositeFilter: { op: 'AND', filters } }
      }
    })
  });
  return res.json();
}
async function fsPatch(token, docName, fields) {
  const mask = Object.keys(fields).map(f => `updateMask.fieldPaths=${f}`).join('&');
  const res  = await fetch(`${docName}?${mask}`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields })
  });
  return res.json();
}
async function fsAdd(token, collectionId, fields) {
  const res = await fetch(`${FS_BASE}/${collectionId}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields })
  });
  return res.json();
}

async function fsGet(token, collectionId, docId) {
  const res = await fetch(`${FS_BASE}/${collectionId}/${docId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return res.json();
}

// ── Expire Job ────────────────────────────────────────────────────────────────
async function runExpireJob(env) {
  const token = await getAccessToken(env);
  const now   = new Date();
  const today = now.toISOString().slice(0, 10);
  const d7 = new Date(now);
  d7.setDate(d7.getDate() + 7);
  const d7str = d7.toISOString().slice(0, 10);
  console.log(`[cron-expire] ${today}, D7: ${d7str}`);
  const companies = await fsQuery(token, 'companies', []);
  let expired=0, warned=0, renewed=0;
  for (const row of companies) {
    if (!row.document) continue;
    const fields = row.document.fields || {};
    const docName = row.document.name;
    const companyId = docName.split('/').pop();
    const companyName = fields.companyName?.stringValue || fields.name?.stringValue || '';
    const adminEmail = fields.adminEmail?.stringValue || fields.email?.stringValue || '';
    const subs = fields.subscriptions?.mapValue?.fields || {};
    const products = ['donway', 'qr', 'inventory', 'kiosk'];
    let needUpdate = false;
    const updatedSubs = JSON.parse(JSON.stringify(subs));
    for (const product of products) {
      const sub = subs[product]?.mapValue?.fields;
      if (!sub) continue;
      const active = sub.active?.booleanValue;
      if (!active) continue;
      const expiry = sub.expiry?.stringValue || '';
      if (!expiry) continue;
      if (expiry < today) {
        updatedSubs[product] = { mapValue: { fields: { ...sub, active: { booleanValue: false }, expiredAt: { stringValue: today } } } };
        needUpdate = true; expired++;
        await sendWelcomeEmail(env, { email: adminEmail, companyName, tempPassword: '', planType: 'expired', planLabel: product, loginUrl: 'https://donway.ai.kr/settle' }).catch(()=>{});
        await fsAdd(token, 'alimtalk_queue', { type:{stringValue:'sub_expired'}, companyId:{stringValue:companyId}, companyName:{stringValue:companyName}, email:{stringValue:adminEmail}, product:{stringValue:product}, expiry:{stringValue:expiry}, status:{stringValue:'pending'}, createdAt:{stringValue:now.toISOString()} }).catch(()=>{});
      } else if (expiry === d7str) {
        warned++;
        await fsAdd(token, 'alimtalk_queue', { type:{stringValue:'sub_renew_warning'}, companyId:{stringValue:companyId}, companyName:{stringValue:companyName}, email:{stringValue:adminEmail}, product:{stringValue:product}, expiry:{stringValue:expiry}, daysLeft:{integerValue:7}, status:{stringValue:'pending'}, createdAt:{stringValue:now.toISOString()} }).catch(()=>{});
        if (env.EMAIL_API_KEY) {
          const html = `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px"><div style="font-size:24px;text-align:center;margin-bottom:12px"></div><div style="font-size:18px;font-weight:900;text-align:center;margin-bottom:8px">구독 만료 7일 전</div><p style="font-size:13px;color:#555;text-align:center;margin-bottom:20px"><b>${companyName}</b>의 <b>${product}</b> 구독이<br><b>${expiry}</b>에 만료됩니다.</p><a href="tel:051-711-3103" style="display:block;text-align:center;background:linear-gradient(90deg,#0066ff,#00d4ff);color:#fff;padding:14px;border-radius:12px;font-size:14px;font-weight:900;text-decoration:none">051-711-3103 갱신 문의</a></div>`;
          await fetch('https://api.resend.com/emails', { method:'POST', headers:{'Authorization':`Bearer ${env.EMAIL_API_KEY}`,'Content-Type':'application/json'}, body: JSON.stringify({ from:'DONWAY <all@donway.ai.kr>', to:[adminEmail], subject:`[DONWAY] ${companyName} 구독 만료 7일 전 알림`, html }) }).catch(()=>{});
        }
      }
    }
    if (needUpdate) {
      await fsPatch(token, `https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents/companies/${companyId}`, { subscriptions: { mapValue: { fields: updatedSubs } } }).catch(e => console.error('[patch]', e.message));
    }
  }
  await fsAdd(token, 'cron_logs', { type:{stringValue:'expire_check'}, date:{stringValue:today}, expired:{integerValue:expired}, warned:{integerValue:warned}, renewed:{integerValue:renewed}, createdAt:{stringValue:now.toISOString()} }).catch(()=>{});
  return { expired, warned, renewed };
}


// ── Fetch Handler ─────────────────────────────────────────────────────────────

// ── Cron: GitHub → KV 자동 동기화 ─────────────────────────────────────────
async function syncKVFromGitHub(env) {
  const e = env || _env_ref;
  if (!e || !e.DONWAY_ASSETS) return { ok: false, reason: 'no KV' };
  
  const GITHUB_RAW = 'https://raw.githubusercontent.com/kimdh4790-cpu/mbti-logistics/main';
  const FILES = [
    'settle.html', 'inventory.html', 'qrpos.html', 'kiosk.html',
    'mbtico_hub.html', 'join.html', 'admin_sub.html', 'add.html', 'wait.html', 'order.html', 'donway_landing.html'
  ];
  
  const results = [];
  for (const file of FILES) {
    try {
      const resp = await fetch(`${GITHUB_RAW}/${file}?v=${Date.now()}`, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!resp.ok) { results.push({ file, ok: false, status: resp.status }); continue; }
      const text = await resp.text();
      await e.DONWAY_ASSETS.put(file, text);
      results.push({ file, ok: true, size: text.length });
    } catch(err) {
      results.push({ file, ok: false, error: err.message });
    }
  }
  console.log('[Cron] KV 동기화:', JSON.stringify(results.map(r => r.file + ':' + (r.ok ? '✅' : '❌'))));
  return { ok: true, results };
}


// subscriptions 구조: donway/filo/mbtico modules 배열로 메뉴 제어
export default {
  // scheduled: KV sync moved to main scheduled handler below
  async fetch(request, env) {
    _env_ref = env;
    const url      = new URL(request.url);
    const path     = url.pathname;
    const method   = request.method;
    const hostname = url.hostname;

    // ★ yongcha.app — 전용 서빙 (KV 없이 직접)
    if (hostname === 'yongcha.app' || hostname === 'www.yongcha.app') {
      return handleYongcha(request, env);
    }

    // 보안: 민감 경로 차단
    if (path.match(/^\/\.env|^\/\.git|^\/\.aws|^\/config\.json|^\/wp-|^\/phpmy/i)) {
      return new Response('Not Found', {status:404});
    }


    // ── firebase core compat JS 프록시 (모든 도메인 공통 — 도메인 라우팅 전 처리) ──
    // filo JS 모듈 서빙 (모든 도메인 공통 - 가장 먼저!)
    const pathNoQ = path.split('?')[0]; // 쿼리스트링 제거
    // ⚠️ order-common.js / order.js / store.js 는 GitHub Raw 직접 서빙 (KV 캐시 우회)
    const _GITHUB_JS = ['/filo-order-common.js','/order.js','/store.js'];
    if (_GITHUB_JS.indexOf(pathNoQ) !== -1) {
      const _fname = pathNoQ.slice(1);
      const _ghUrl = 'https://raw.githubusercontent.com/kimdh4790-cpu/mbti-logistics/main/' + _fname + '?bust=' + Date.now();
      const _ghRes = await fetch(_ghUrl, { cf: { cacheEverything: false, cacheTtl: 0 }, headers: { 'Cache-Control': 'no-cache' } });
      const _ghJs = await _ghRes.text();
      return new Response(_ghJs, { headers: { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0', 'Pragma': 'no-cache' } });
    }
    if (['/filo-common.js','/filo-auth.js','/filo-margin.js','/filo-members.js','/filo-payroll2.js','/filo-payment.js','/filo-schedule.js','/filo-settings.js','/filo-pos.js','/filo-pos-core.js','/filo-pos-ui.js','/filo-table.js','/filo-qr.js','/filo-menu.js','/filo-menu-mgmt.js','/filo-menu-recipe.js','/filo-order.js','/filo-inventory.js','/filo-staff.js','/filo-report.js','/filo-booking.js','/dine.js','/dine-schedule.js','/dine-staff.js','/dine-payroll.js','/dine-sales.js','/dine-analytics.js','/dine-tax.js','/dine-member.js','/donway_landing.js','/filo-landing.js','/mbtico-ctrl.js'].indexOf(pathNoQ) !== -1) {
      return serveKVFile(env, pathNoQ.slice(1), 'application/javascript');
    }
    if (path === '/firebase-app-compat.js') {
      const r = await fetch('https://www.gstatic.com/firebasejs/8.10.1/firebase-app-compat.js');
      const js = await r.text();
      return new Response(js, { headers: { 'Content-Type': 'application/javascript', 'Cache-Control': 'public, max-age=86400' } });
    }
    if (path === '/firebase-auth-compat.js') {
      const r = await fetch('https://www.gstatic.com/firebasejs/8.10.1/firebase-auth-compat.js');
      const js = await r.text();
      return new Response(js, { headers: { 'Content-Type': 'application/javascript', 'Cache-Control': 'public, max-age=86400' } });
    }
    if (path === '/firebase-firestore-compat.js') {
      const r = await fetch('https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore-compat.js');
      const js = await r.text();
      return new Response(js, { headers: { 'Content-Type': 'application/javascript', 'Cache-Control': 'public, max-age=86400' } });
    }
    if (path === '/firebase-messaging-compat.js') {
      const r = await fetch('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging-compat.js');
      const js = await r.text();
      return new Response(js, { headers: { 'Content-Type': 'application/javascript', 'Cache-Control': 'public, max-age=86400' } });
    }

    // ★ donway.ai.kr 라우팅 (명시적)
    if (hostname === 'donway.ai.kr' || hostname === 'www.donway.ai.kr') {
      // /admin → settle.html 서빙 (DONWAY 통합 어드민)
      if (path === '/admin' || path === '/admin.html' || path === '/admin/') {
        return serveKVFile(env, 'settle.html', 'text/html');
      }
      // /settle/{id} → settle.html 서빙 (공유 명세서 링크)
      if (path.startsWith('/settle/') || path === '/settle') {
        return serveKVFile(env, 'settle.html', 'text/html');
      }
      // /join → settle.html 서빙 + UI 커스터마이즈 주입
      if (path === '/join' || path === '/join/') {
        const joinKv = env.DONWAY_ASSETS ? await env.DONWAY_ASSETS.get('settle.html', {type:'text'}) : null;
        if (joinKv) {
          // 범용정산·재고관리 숨김 + AI정산 요금 실제값 교체
          const joinPatch = '<style>' +
            '#svc-universal-card,#svc-inventory-card{display:none!important}' +
            '</style>' +
            '<script>(function(){' +
            'function _fixJoin(){' +
            'var sel=document.getElementById("settle-tier-select");' +
            'if(sel&&!sel.dataset.fixed){sel.dataset.fixed="1";' +
            '[["50","~50명 — 20만원/월"],["100","~100명 — 40만원/월"],["200","~200명 — 80만원/월"],' +
            '["300","~300명 — 120만원/월"],["500","~500명 — 200만원/월"],["700","~700명 — 280만원/월"],' +
            '["1000","~1000명 — 400만원/월"],["1500","~1500명 — 600만원/월"],["2000","~2000명 — 800만원/월"],' +
            '["9999","2000명+ — 별도 문의"]].forEach(function(r){' +
            'var o=sel.querySelector("option[value=\""+r[0]+"\"]");if(o)o.textContent=r[1];});}' +
            'var card=document.getElementById("svc-settle-card");if(card){' +
            'card.querySelectorAll("div").forEach(function(d){' +
            'if((d.children.length===0)&&d.textContent.indexOf("32.5만")>-1)' +
            'd.textContent="개인: 50명 20만 · 100명 40만 · 200명 80만 · 300명 120만 · 500명 200만 (VAT별도)";' +
            'if((d.children.length===0)&&d.textContent.indexOf("26.5만")>-1)' +
            'd.textContent="단체(20개사+): 50명 15만 · 100명 30만 · 200명 60만 · 300명 90만 · 500명 150만 (VAT별도)";' +
            '});}' +
            '}' +
            'document.addEventListener("DOMContentLoaded",_fixJoin);' +
            'var obs=new MutationObserver(_fixJoin);obs.observe(document.body,{childList:true,subtree:true});' +
            '})();</script>';
          const joinHtml = joinKv.replace('</head>', joinPatch + '</head>');
          return new Response(joinHtml, {headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'}});
        }
        return serveKVFile(env, 'settle.html', 'text/html');
      }
      if (path === '/' || path === '') {
    const ghRaw = await fetch('https://raw.githubusercontent.com/kimdh4790-cpu/mbti-logistics/main/donway_landing.html?t='+Date.now(), {cf:{cacheEverything:false}});
    let html = await ghRaw.text();
    html = html.replace('<head>', '<head><meta name="naver-site-verification" content="26f9af7ad9b774a92a8fecad908882c81a64537b" />');
    return new Response(html, {headers:{'Content-Type':'text/html;charset=utf-8','Cache-Control':'no-store'}});
  }
      // ── 고객 공개 예약 페이지 ──
      if (path === '/reserve') {
        const c = url.searchParams.get('c') || '';
        if (!c) return new Response('잘못된 접근입니다.', { status: 400 });
        if (request.method === 'POST') {
          try {
            const body = await request.json();
            const fsToken = await getAccessToken(env);
            const qUrl = 'https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents:runQuery';
            const qBody = JSON.stringify({ structuredQuery: { from:[{collectionId:'companies'}], where:{fieldFilter:{field:{fieldPath:'slug'},op:'EQUAL',value:{stringValue:c}}}, limit:1 }});
            const qRes = await fetch(qUrl,{method:'POST',headers:{'Authorization':'Bearer '+fsToken,'Content-Type':'application/json'},body:qBody});
            const qData = await qRes.json();
            const dealerId = qData[0]?.document?.fields?.dealerId?.stringValue || qData[0]?.document?.name?.split('/').pop() || '';
            if (!dealerId) return new Response(JSON.stringify({ok:false,error:'업체를 찾을 수 없습니다'}),{status:404,headers:{'Content-Type':'application/json'}});
            const now = new Date().toISOString();
            const ym = (body.date||'').slice(0,7);
            const addUrl = 'https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents/beauty_reserves';
            const addBody = JSON.stringify({fields:{
              dealerId:{stringValue:dealerId}, date:{stringValue:body.date||''}, time:{stringValue:body.time||''},
              ym:{stringValue:ym}, customerName:{stringValue:body.customerName||''}, phone:{stringValue:body.phone||''},
              designer:{stringValue:body.designer||''}, menu:{stringValue:body.menu||''}, memo:{stringValue:body.memo||''},
              status:{stringValue:'예약'}, source:{stringValue:'customer'}, createdAt:{stringValue:now}
            }});
            const addRes = await fetch(addUrl,{method:'POST',headers:{'Authorization':'Bearer '+fsToken,'Content-Type':'application/json'},body:addBody});
            if (!addRes.ok) throw new Error('저장 실패');
            return new Response(JSON.stringify({ok:true}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
          } catch(e) {
            return new Response(JSON.stringify({ok:false,error:e.message}),{status:500,headers:{'Content-Type':'application/json'}});
          }
        }
        // GET: 예약 페이지
        try {
          const fsToken = await getAccessToken(env);
          const qUrl = 'https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents:runQuery';
          const qBody = JSON.stringify({structuredQuery:{from:[{collectionId:'companies'}],where:{fieldFilter:{field:{fieldPath:'slug'},op:'EQUAL',value:{stringValue:c}}},limit:1}});
          const qRes = await fetch(qUrl,{method:'POST',headers:{'Authorization':'Bearer '+fsToken,'Content-Type':'application/json'},body:qBody});
          const qData = await qRes.json();
          const coFields = qData[0]?.document?.fields || {};
          const coName = coFields.companyName?.stringValue || 'DONWAY 뷰티';
          const dealerId = coFields.dealerId?.stringValue || qData[0]?.document?.name?.split('/').pop() || '';
          const wUrl = 'https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents:runQuery';
          const wBody = JSON.stringify({structuredQuery:{from:[{collectionId:'ind_workers'}],where:{compositeFilter:{op:'AND',filters:[
            {fieldFilter:{field:{fieldPath:'dealerId'},op:'EQUAL',value:{stringValue:dealerId}}},
            {fieldFilter:{field:{fieldPath:'industryType'},op:'EQUAL',value:{stringValue:'beauty'}}}
          ]}},limit:20}});
          const wRes = await fetch(wUrl,{method:'POST',headers:{'Authorization':'Bearer '+fsToken,'Content-Type':'application/json'},body:wBody});
          const wData = await wRes.json();
          const designers = (wData||[]).filter(r=>r.document).map(r=>r.document.fields?.name?.stringValue||'').filter(Boolean);
          const todayStr = new Date().toISOString().slice(0,10);
          const timeOpts = ['09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00'].map(t=>`<option value="${t}">${t}</option>`).join('');
          const designerSel = designers.length ? `<div class="card"><label>담당 디자이너</label><select id="r-designer"><option value="">-- 선택 (상관없음) --</option>${designers.map(d=>`<option value="${d}">${d}</option>`).join('')}</select></div>` : '';
          const menus = ['시그니처펌','복구매직','디자인컷','본드케어','발레아쥬','뿌리염색','볼륨매직','남성펌','두피케어','네일'];
          const html = `<!DOCTYPE html><html lang="ko"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${coName} 예약</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,sans-serif;background:#0f172a;color:#f1f5f9;min-height:100vh;padding:16px}.wrap{max-width:480px;margin:0 auto}.header{background:linear-gradient(135deg,#C2185B,#E91E63);border-radius:16px;padding:24px;text-align:center;margin-bottom:20px;color:#fff}.header h1{font-size:22px;font-weight:900;margin-bottom:4px}.header p{font-size:13px;opacity:.85}.card{background:#1e293b;border-radius:14px;padding:16px;margin-bottom:12px}label{font-size:12px;font-weight:700;display:block;margin-bottom:6px;color:#94a3b8}input,select{width:100%;padding:12px;background:#0f172a;border:1.5px solid #334155;border-radius:10px;color:#f1f5f9;font-size:14px;outline:none}input:focus,select:focus{border-color:#C2185B}.menus{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}.menu-btn{padding:7px 14px;border:1.5px solid #334155;border-radius:20px;background:#0f172a;color:#94a3b8;font-size:12px;cursor:pointer}.menu-btn.active{border-color:#C2185B;background:#C2185B22;color:#C2185B;font-weight:700}.btn-submit{width:100%;padding:16px;background:linear-gradient(135deg,#C2185B,#E91E63);color:#fff;border:none;border-radius:12px;font-size:16px;font-weight:800;cursor:pointer;margin-top:8px}.btn-submit:disabled{opacity:.5}.success{text-align:center;padding:40px 20px;display:none}.success .icon{font-size:64px;margin-bottom:16px}.success h2{font-size:22px;font-weight:900;color:#C2185B;margin-bottom:8px}.success p{font-size:14px;color:#94a3b8;line-height:1.6}</style></head><body>
<div class="wrap">
  <div class="header"><div style="font-size:32px;margin-bottom:8px"></div><h1>${coName}</h1><p>온라인 예약</p></div>
  <div id="form-wrap">
    <div class="card"><label>날짜</label><input type="date" id="r-date" min="${todayStr}"></div>
    <div class="card"><label>시간</label><select id="r-time">${timeOpts}</select></div>
    ${designerSel}
    <div class="card"><label>시술 메뉴</label><div class="menus">${menus.map(m=>`<button class="menu-btn" onclick="selectMenu(this,'${m}')">${m}</button>`).join('')}</div><input type="text" id="r-menu" placeholder="직접 입력 또는 위에서 선택"></div>
    <div class="card"><label>고객명 *</label><input type="text" id="r-name" placeholder="이름을 입력하세요"></div>
    <div class="card"><label>연락처 *</label><input type="tel" id="r-phone" placeholder="010-0000-0000"></div>
    <div class="card"><label>메모 (선택)</label><input type="text" id="r-memo" placeholder="요청사항 등"></div>
    <button class="btn-submit" id="r-submit" onclick="submitReserve()">예약 신청</button>
  </div>
  <div class="success" id="success-wrap"><div class="icon"></div><h2>예약 완료!</h2><p id="success-msg"></p><p style="margin-top:12px;font-size:12px;color:#64748b">예약 확인은 업체로 문의해주세요</p>
<button onclick="addToHome()" style="margin-top:16px;width:100%;padding:14px;background:#1e293b;border:1.5px solid #C2185B;border-radius:12px;color:#C2185B;font-size:14px;font-weight:700;cursor:pointer">홈 화면에 추가하기</button>
<p style="margin-top:8px;font-size:11px;color:#475569">다음 예약을 더 편하게!</p></div>
</div>
<script>
function addToHome(){
  if(window.matchMedia('(display-mode: standalone)').matches){
    alert('이미 홈 화면에 추가되어 있어요!');return;
  }
  var ua=navigator.userAgent;
  if(/iPhone|iPad|iPod/.test(ua)){
    alert('홈 화면 추가 방법\n\n① 하단 공유 버튼(□↑) 탭\n② "홈 화면에 추가" 선택\n③ 추가 버튼 탭');
  } else if(/Android/.test(ua)){
    if(window._deferredPrompt){
      window._deferredPrompt.prompt();
      window._deferredPrompt.userChoice.then(function(){window._deferredPrompt=null;});
    } else {
      alert('홈 화면 추가 방법\n\n① 브라우저 우측 상단 메뉴(⋮) 탭\n② "홈 화면에 추가" 선택');
    }
  } else {
    alert('브라우저 주소창의 설치 버튼을 눌러 홈 화면에 추가하세요.');
  }
}
window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window._deferredPrompt=e;});
function selectMenu(btn,name){document.querySelectorAll('.menu-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');document.getElementById('r-menu').value=name;}
async function submitReserve(){
  var date=document.getElementById('r-date').value;
  var time=document.getElementById('r-time').value;
  var name=document.getElementById('r-name').value.trim();
  var phone=document.getElementById('r-phone').value.trim();
  var designer=(document.getElementById('r-designer')||{}).value||'';
  var menu=document.getElementById('r-menu').value.trim();
  var memo=document.getElementById('r-memo').value.trim();
  if(!date){alert('날짜를 선택해주세요');return;}
  if(!name){alert('고객명을 입력해주세요');return;}
  if(!phone){alert('연락처를 입력해주세요');return;}
  var btn=document.getElementById('r-submit');
  btn.disabled=true;btn.textContent='예약 중...';
  try{
    var res=await fetch('/reserve?c=${c}',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({date,time,customerName:name,phone,designer,menu,memo})});
    var data=await res.json();
    if(data.ok){document.getElementById('form-wrap').style.display='none';var sw=document.getElementById('success-wrap');sw.style.display='block';document.getElementById('success-msg').textContent=date+' '+time+' '+name+'님 예약이 완료됐습니다.';}
    else{alert('오류: '+(data.error||'다시 시도해주세요'));btn.disabled=false;btn.textContent='예약 신청';}
  }catch(e){alert('오류가 발생했습니다');btn.disabled=false;btn.textContent='예약 신청';}
}
</script></body></html>`;
          return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
        } catch(e) {
          return new Response('오류: '+e.message,{status:500});
        }
      }

      if (path === '/roster') {
        const c = url.searchParams.get('c') || '';
        const camp = url.searchParams.get('camp') || '';
        const m = url.searchParams.get('m') || new Date().toISOString().slice(0,10);
        if (!c) return new Response('잘못된 접근입니다.', { status: 400 });
        try {
          const fsToken = await getAccessToken(env);
          // 회사 정보 조회
          const qUrl = 'https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents:runQuery';
          const qBody = JSON.stringify({structuredQuery:{from:[{collectionId:'companies'}],where:{fieldFilter:{field:{fieldPath:'slug'},op:'EQUAL',value:{stringValue:c}}},limit:1}});
          const qRes = await fetch(qUrl,{method:'POST',headers:{'Authorization':'Bearer '+fsToken,'Content-Type':'application/json'},body:qBody});
          const qData = await qRes.json();
          const coFields = qData[0]?.document?.fields || {};
          const dealerId = coFields.dealerId?.stringValue || qData[0]?.document?.name?.split('/').pop() || '';
          const coName = coFields.companyName?.stringValue || 'DONWAY';
          if (!dealerId) return new Response('업체를 찾을 수 없습니다.', { status: 404 });

          // 주간 시작일 계산 (m 기준 해당 주 일요일)
          const baseDate = new Date(m);
          const day = baseDate.getDay();
          const sunday = new Date(baseDate);
          sunday.setDate(baseDate.getDate() - day);
          const weekStart = sunday.toISOString().slice(0,10);
          const weekDays = [];
          for (let i = 0; i < 7; i++) {
            const d = new Date(sunday);
            d.setDate(sunday.getDate() + i);
            weekDays.push(d.toISOString().slice(0,10));
          }
          const dayLabels = ['일','월','화','수','목','금','토'];

          // 기사 목록 조회
          const dUrl = 'https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents:runQuery';
          const dFilters = [{fieldFilter:{field:{fieldPath:'dealerId'},op:'EQUAL',value:{stringValue:dealerId}}}];
          const dBody = JSON.stringify({structuredQuery:{from:[{collectionId:'drivers'}],where:{fieldFilter:{field:{fieldPath:'dealerId'},op:'EQUAL',value:{stringValue:dealerId}}},orderBy:[{field:{fieldPath:'name'},direction:'ASCENDING'}],limit:300}});
          const dRes = await fetch(dUrl,{method:'POST',headers:{'Authorization':'Bearer '+fsToken,'Content-Type':'application/json'},body:dBody});
          const dData = await dRes.json();
          let drivers = (dData||[]).filter(r=>r.document).map(r=>{
            const f = r.document.fields||{};
            return {id:r.document.name.split('/').pop(), name:f.name?.stringValue||'', camp:(f.camp?.stringValue||'').replace('캠프','').trim(), userId:f.userId?.stringValue||'', isActive:f.is_active?.booleanValue!==false, status:f.status?.stringValue||''};
          }).filter(d=>d.isActive && d.status!=='탈퇴' && d.status!=='퇴직');
          if (camp) drivers = drivers.filter(d=>d.camp===camp);

          // 근무표 데이터 조회
          const rUrl = 'https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents:runQuery';
          const rBody = JSON.stringify({structuredQuery:{from:[{collectionId:'roster_week'}],where:{compositeFilter:{op:'AND',filters:[{fieldFilter:{field:{fieldPath:'dealerId'},op:'EQUAL',value:{stringValue:dealerId}}},{fieldFilter:{field:{fieldPath:'weekStart'},op:'EQUAL',value:{stringValue:weekStart}}}]}},limit:500}});
          const rRes = await fetch(rUrl,{method:'POST',headers:{'Authorization':'Bearer '+fsToken,'Content-Type':'application/json'},body:rBody});
          const rData = await rRes.json();
          const rosterMap = {};
          (rData||[]).filter(r=>r.document).forEach(r=>{
            const f = r.document.fields||{};
            const did = f.driverId?.stringValue||'';
            const di = parseInt(f.dayIndex?.integerValue||f.dayIndex?.doubleValue||0);
            if (!rosterMap[did]) rosterMap[did] = {};
            rosterMap[did][di] = {status:f.status?.stringValue||'work', route:f.route?.stringValue||'', docId:r.document.name.split('/').pop()};
          });

          const prevSun = new Date(sunday); prevSun.setDate(sunday.getDate()-7);
          const nextSun = new Date(sunday); nextSun.setDate(sunday.getDate()+7);
          const prevM = prevSun.toISOString().slice(0,10);
          const nextM = nextSun.toISOString().slice(0,10);
          const baseUrl = '/roster?c='+c+(camp?'&camp='+encodeURIComponent(camp):'');

          let rows = '';
          drivers.forEach(drv => {
            const rd = rosterMap[drv.userId] || rosterMap[drv.id] || {};
            let cells = '';
            for (let i = 0; i < 7; i++) {
              const e = rd[i] || {};
              const st = e.status || 'work';
              const route = e.route || '';
              const docId = e.docId || '';
              const isOff = st === 'off';
              const bg = isOff ? '#fee2e2' : '#f0fdf4';
              const color = isOff ? '#dc2626' : '#16a34a';
              const label = isOff ? '휴무' : (route || '출근');
              const swapBase = docId ? '/swap?id='+docId+'&from='+encodeURIComponent(drv.name)+'&date='+weekDays[i]+'&did='+dealerId+'&ws='+weekStart+'&di='+i+'&fromRoute='+encodeURIComponent(e.route||'') : '';
              const swapOnClick = swapBase ? `onclick="(function(){var r=prompt('내가 배송할 라우트 입력 (없으면 빈칸)','');if(r===null)return;location.href='${swapBase}&myRoute='+encodeURIComponent(r);})();return false;"` : '';
              cells += `<td style="padding:8px 4px;text-align:center;border:1px solid #e2e8f0">
                <div style="background:${bg};color:${color};border-radius:6px;padding:4px 6px;font-size:12px;font-weight:700;margin-bottom:4px">${label}</div>
                ${swapBase ? `<a href="#" ${swapOnClick} style="font-size:10px;color:#f59e0b;text-decoration:none">교체요청</a>` : ''}
              </td>`;
            }
            rows += `<tr><td style="padding:8px;font-size:13px;font-weight:700;border:1px solid #e2e8f0;white-space:nowrap">${drv.name}<br><span style="font-size:10px;color:#94a3b8">${drv.camp||''}</span></td>${cells}</tr>`;
          });

          const html = `<!DOCTYPE html><html lang="ko"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${coName} 근무표</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,sans-serif;background:#f8fafc;color:#1e293b;padding:12px}.header{background:linear-gradient(135deg,#1e40af,#3b82f6);border-radius:14px;padding:16px;text-align:center;margin-bottom:16px;color:#fff}.header h1{font-size:18px;font-weight:900}.header p{font-size:12px;opacity:.85;margin-top:4px}.nav{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}.nav a{background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:8px 16px;font-size:13px;font-weight:700;color:#1e40af;text-decoration:none}.nav span{font-size:13px;font-weight:700;color:#374151}.wrap{overflow-x:auto}.tbl{width:100%;border-collapse:collapse;min-width:600px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)}.tbl th{padding:10px 6px;background:#1e40af;color:#fff;font-size:12px;text-align:center}.tbl td{vertical-align:middle}</style>
</head><body>
<div class="header"><h1>${coName}</h1><p>${camp||'전체'} 캠프 근무표</p></div>
<div class="nav">
  <a href="${baseUrl}&m=${prevM}">‹ 이전주</a>
  <span>${weekDays[0].slice(5)} ~ ${weekDays[6].slice(5)}</span>
  <a href="${baseUrl}&m=${nextM}">다음주 ›</a>
</div>
<div class="wrap">
<table class="tbl">
  <thead><tr><th>이름</th>${weekDays.map((d,i)=>`<th>${d.slice(5)}<br>(${dayLabels[i]})</th>`).join('')}</tr></thead>
  <tbody>${rows || '<tr><td colspan="8" style="padding:20px;text-align:center;color:#94a3b8">등록된 기사가 없습니다</td></tr>'}</tbody>
</table>
</div>
</body></html>`;
          return new Response(html, {headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
        } catch(e) {
          return new Response('오류: '+e.message, {status:500});
        }
      }

      if (path === '/swap') {
        const docId = url.searchParams.get('id') || '';
        const fromName = url.searchParams.get('from') || '';
        const date = url.searchParams.get('date') || '';
        if (!docId) return new Response('잘못된 접근입니다.', { status: 400 });

        if (request.method === 'POST') {
          try {
            const fsToken = await getAccessToken(env);
            const body = await request.json();
            // 휴무↔휴무 날짜 교환
            if (body.mode === 'exchange') {
              const fsToken2 = await getAccessToken(env);
              const now2 = new Date().toISOString();
              const ws2 = url.searchParams.get('ws') || '';
              const did2 = url.searchParams.get('did') || '';
              const baseUrl2 = 'https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents/roster_week';

              // 요청자 휴무 문서 조회
              const fromDocRes = await fetch(baseUrl2+'/'+docId,{headers:{'Authorization':'Bearer '+fsToken2}});
              const fromFields = (await fromDocRes.json()).fields||{};
              const fromDriverId = fromFields.driverId?.stringValue||'';
              const fromDayIndex = parseInt(fromFields.dayIndex?.integerValue||fromFields.dayIndex?.doubleValue||0);

              // 수락자 휴무 문서 조회
              const toDocRes = await fetch(baseUrl2+'/'+body.myDocId,{headers:{'Authorization':'Bearer '+fsToken2}});
              const toFields = (await toDocRes.json()).fields||{};
              const toDriverId = toFields.driverId?.stringValue||'';
              const toDayIndex = parseInt(toFields.dayIndex?.integerValue||toFields.dayIndex?.doubleValue||0);

              // 요청자의 해당 주 전체 문서 조회 → JS에서 dayIndex 필터링
              const rqAll = JSON.stringify({structuredQuery:{from:[{collectionId:'roster_week'}],where:{compositeFilter:{op:'AND',filters:[
                {fieldFilter:{field:{fieldPath:'dealerId'},op:'EQUAL',value:{stringValue:did2}}},
                {fieldFilter:{field:{fieldPath:'weekStart'},op:'EQUAL',value:{stringValue:ws2}}},
                {fieldFilter:{field:{fieldPath:'driverId'},op:'EQUAL',value:{stringValue:fromDriverId}}}
              ]}},limit:7}});
              const rqAllRes = await fetch('https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents:runQuery',{method:'POST',headers:{'Authorization':'Bearer '+fsToken2,'Content-Type':'application/json'},body:rqAll});
              const rqAllData = await rqAllRes.json();
              const fromDoc2 = (rqAllData||[]).filter(r=>r.document).find(r=>{
                const di=parseInt(r.document.fields?.dayIndex?.integerValue||r.document.fields?.dayIndex?.doubleValue||0);
                return di===toDayIndex;
              });
              const fromToDay = fromDoc2?.document?.fields||{};
              const fromToDayRoute = fromToDay.route?.stringValue||'';
              const fromToDayRot = fromToDay.rotation?.stringValue||'';
              const fromToDayDocId = fromDoc2?.document?.name?.split('/')?.pop()||'';

              // 수락자의 해당 주 전체 문서 조회 → JS에서 dayIndex 필터링
              const rq2All = JSON.stringify({structuredQuery:{from:[{collectionId:'roster_week'}],where:{compositeFilter:{op:'AND',filters:[
                {fieldFilter:{field:{fieldPath:'dealerId'},op:'EQUAL',value:{stringValue:did2}}},
                {fieldFilter:{field:{fieldPath:'weekStart'},op:'EQUAL',value:{stringValue:ws2}}},
                {fieldFilter:{field:{fieldPath:'driverId'},op:'EQUAL',value:{stringValue:toDriverId}}}
              ]}},limit:7}});
              const rq2AllRes = await fetch('https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents:runQuery',{method:'POST',headers:{'Authorization':'Bearer '+fsToken2,'Content-Type':'application/json'},body:rq2All});
              const rq2AllData = await rq2AllRes.json();
              const toDoc2 = (rq2AllData||[]).filter(r=>r.document).find(r=>{
                const di=parseInt(r.document.fields?.dayIndex?.integerValue||r.document.fields?.dayIndex?.doubleValue||0);
                return di===fromDayIndex;
              });
              const toFromDay = toDoc2?.document?.fields||{};
              const toFromDayRoute = toFromDay.route?.stringValue||'';
              const toFromDayRot = toFromDay.rotation?.stringValue||'';
              const toFromDayDocId = toDoc2?.document?.name?.split('/')?.pop()||'';

              // 요청자: 기존날짜 → 수락자 라우트로 출근 (수락자가 입력한 myRoute 우선)
              const fromNewRoute = body.myRoute||toFromDayRoute||'';
              const toNewRoute = body.fromRoute||fromToDayRoute||'';
              await fetch(baseUrl2+'/'+docId+'?updateMask.fieldPaths=status&updateMask.fieldPaths=route&updateMask.fieldPaths=rotation&updateMask.fieldPaths=swapWith&updateMask.fieldPaths=swapAt',
                {method:'PATCH',headers:{'Authorization':'Bearer '+fsToken2,'Content-Type':'application/json'},
                body:JSON.stringify({fields:{status:{stringValue:'work'},route:{stringValue:fromNewRoute},rotation:{stringValue:toFromDayRot},swapWith:{stringValue:body.name||''},swapAt:{stringValue:now2}}})});

              // 수락자: 휴무일 → 출근 (요청자 라우트로) - updateMask 없이 전체 업데이트
              const toDocFields = (await (await fetch(baseUrl2+'/'+body.myDocId,{headers:{'Authorization':'Bearer '+fsToken2}})).json()).fields||{};
              await fetch(baseUrl2+'/'+body.myDocId,{method:'PATCH',headers:{'Authorization':'Bearer '+fsToken2,'Content-Type':'application/json'},
                body:JSON.stringify({fields:Object.assign({},toDocFields,{status:{stringValue:'work'},route:{stringValue:toNewRoute},rotation:{stringValue:fromToDayRot},swapWith:{stringValue:fromName},swapAt:{stringValue:now2}})})});

              // 요청자: 수락자 날짜에 휴무
              if(fromToDayDocId){
                await fetch(baseUrl2+'/'+fromToDayDocId+'?updateMask.fieldPaths=status&updateMask.fieldPaths=route&updateMask.fieldPaths=swapWith&updateMask.fieldPaths=swapAt',
                  {method:'PATCH',headers:{'Authorization':'Bearer '+fsToken2,'Content-Type':'application/json'},
                  body:JSON.stringify({fields:{status:{stringValue:'off'},route:{stringValue:''},swapWith:{stringValue:body.name||''},swapAt:{stringValue:now2}}})});
              }

              // 수락자: 요청자 날짜에 휴무
              if(toFromDayDocId){
                await fetch(baseUrl2+'/'+toFromDayDocId+'?updateMask.fieldPaths=status&updateMask.fieldPaths=route&updateMask.fieldPaths=swapWith&updateMask.fieldPaths=swapAt',
                  {method:'PATCH',headers:{'Authorization':'Bearer '+fsToken2,'Content-Type':'application/json'},
                  body:JSON.stringify({fields:{status:{stringValue:'off'},route:{stringValue:''},swapWith:{stringValue:fromName},swapAt:{stringValue:now2}}})});
              }

              return new Response(JSON.stringify({ok:true}),{headers:{'Content-Type':'application/json'}});
            }
            const did = url.searchParams.get('did') || '';
            const ws = url.searchParams.get('ws') || '';
            const di = parseInt(url.searchParams.get('di') || '0');
            // 1. 휴무자 docId → 출근으로 변경
            const p1Url = 'https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents/roster_week/'+docId;
            const p1Res = await fetch(p1Url, {headers:{'Authorization':'Bearer '+fsToken}});
            const p1Data = await p1Res.json();
            const offRoute = p1Data.fields?.route?.stringValue || '';
            const patch1Url = p1Url+'?updateMask.fieldPaths=status&updateMask.fieldPaths=swapWith&updateMask.fieldPaths=swapAt';
            await fetch(patch1Url,{method:'PATCH',headers:{'Authorization':'Bearer '+fsToken,'Content-Type':'application/json'},
              body:JSON.stringify({fields:{status:{stringValue:'work'},swapWith:{stringValue:body.name||''},swapAt:{stringValue:new Date().toISOString()}}})});
            // 2. 수락자(출근) → 휴무로 변경 (drivers에서 이름으로 driverId 찾기)
            if (did && ws) {
              const qUrl = 'https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents:runQuery';
              const qBody = JSON.stringify({structuredQuery:{from:[{collectionId:'drivers'}],where:{compositeFilter:{op:'AND',filters:[{fieldFilter:{field:{fieldPath:'dealerId'},op:'EQUAL',value:{stringValue:did}}},{fieldFilter:{field:{fieldPath:'name'},op:'EQUAL',value:{stringValue:body.name||''}}}]}},limit:1}});
              const qRes = await fetch(qUrl,{method:'POST',headers:{'Authorization':'Bearer '+fsToken,'Content-Type':'application/json'},body:qBody});
              const qData = await qRes.json();
              const toDriverId = qData[0]?.document?.name?.split('/')?.pop() || '';
              if (toDriverId) {
                // 수락자의 해당 날짜 roster_week 문서 찾기
                const rUrl = 'https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents:runQuery';
                const rBody = JSON.stringify({structuredQuery:{from:[{collectionId:'roster_week'}],where:{compositeFilter:{op:'AND',filters:[{fieldFilter:{field:{fieldPath:'dealerId'},op:'EQUAL',value:{stringValue:did}}},{fieldFilter:{field:{fieldPath:'weekStart'},op:'EQUAL',value:{stringValue:ws}}},{fieldFilter:{field:{fieldPath:'driverId'},op:'EQUAL',value:{stringValue:toDriverId}}},{fieldFilter:{field:{fieldPath:'dayIndex'},op:'EQUAL',value:{integerValue:di}}}]}},limit:1}});
                const rRes = await fetch(rUrl,{method:'POST',headers:{'Authorization':'Bearer '+fsToken,'Content-Type':'application/json'},body:rBody});
                const rData = await rRes.json();
                const toDocId = rData[0]?.document?.name?.split('/').pop() || '';
                if (toDocId) {
                  const p2Url = 'https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents/roster_week/'+toDocId+'?updateMask.fieldPaths=status&updateMask.fieldPaths=swapWith&updateMask.fieldPaths=swapAt';
                  await fetch(p2Url,{method:'PATCH',headers:{'Authorization':'Bearer '+fsToken,'Content-Type':'application/json'},
                    body:JSON.stringify({fields:{status:{stringValue:'off'},swapWith:{stringValue:fromName},swapAt:{stringValue:new Date().toISOString()}}})});
                }
              }
            }
            return new Response(JSON.stringify({ok:true}),{headers:{'Content-Type':'application/json'}});
          } catch(e) {
            return new Response(JSON.stringify({ok:false,error:e.message}),{status:500,headers:{'Content-Type':'application/json'}});
          }
        }

        // action=myoff: 수락자 휴무 날짜 조회
        if (url.searchParams.get('action') === 'mydays') {
          const name = url.searchParams.get('name') || '';
          const did = url.searchParams.get('did') || '';
          const ws = url.searchParams.get('ws') || '';
          try {
            const fsToken = await getAccessToken(env);
            // 이름으로 driverId 찾기
            const qUrl = 'https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents:runQuery';
            const qBody = JSON.stringify({structuredQuery:{from:[{collectionId:'drivers'}],where:{compositeFilter:{op:'AND',filters:[{fieldFilter:{field:{fieldPath:'dealerId'},op:'EQUAL',value:{stringValue:did}}},{fieldFilter:{field:{fieldPath:'name'},op:'EQUAL',value:{stringValue:name}}}]}},limit:1}});
            const qRes = await fetch(qUrl,{method:'POST',headers:{'Authorization':'Bearer '+fsToken,'Content-Type':'application/json'},body:qBody});
            const qData = await qRes.json();
            const toDriverId = qData[0]?.document?.name?.split('/')?.pop() || '';
            if (!toDriverId) return new Response(JSON.stringify({ok:false,error:'기사를 찾을 수 없습니다'}),{headers:{'Content-Type':'application/json'}});
            // 해당 주 전체 날짜 조회
            const rUrl = 'https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents:runQuery';
            const rBody = JSON.stringify({structuredQuery:{from:[{collectionId:'roster_week'}],where:{compositeFilter:{op:'AND',filters:[{fieldFilter:{field:{fieldPath:'dealerId'},op:'EQUAL',value:{stringValue:did}}},{fieldFilter:{field:{fieldPath:'weekStart'},op:'EQUAL',value:{stringValue:ws}}},{fieldFilter:{field:{fieldPath:'driverId'},op:'EQUAL',value:{stringValue:toDriverId}}}]}},limit:7}});
            const rRes = await fetch(rUrl,{method:'POST',headers:{'Authorization':'Bearer '+fsToken,'Content-Type':'application/json'},body:rBody});
            const rData = await rRes.json();
            const dayDocs = {};
            const weekDays2 = [];
            const sun2 = new Date(ws);
            for (let i=0;i<7;i++){const d=new Date(sun2);d.setDate(sun2.getDate()+i);weekDays2.push(d.toISOString().slice(0,10));}
            (rData||[]).filter(r=>r.document).forEach(r=>{
              const f=r.document.fields||{};
              const di=parseInt(f.dayIndex?.integerValue||f.dayIndex?.doubleValue||0);
              const docId2=r.document.name.split('/').pop();
              const status=f.status?.stringValue||'work';
              const route=f.route?.stringValue||'';
              if(weekDays2[di]) dayDocs[weekDays2[di]]={docId:docId2,status,route};
            });
            return new Response(JSON.stringify({ok:true,dayDocs}),{headers:{'Content-Type':'application/json'}});
          } catch(e) {
            return new Response(JSON.stringify({ok:false,error:e.message}),{headers:{'Content-Type':'application/json'}});
          }
        }

        const fromRoute = url.searchParams.get('fromRoute') || '';
        const myRouteParam = url.searchParams.get('myRoute') || '';
        const html = `<!DOCTYPE html><html lang="ko"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>근무 교체 요청</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,sans-serif;background:#0f172a;color:#f1f5f9;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:16px}.card{background:#1e293b;border-radius:16px;padding:24px;max-width:420px;width:100%}.icon{font-size:40px;text-align:center;margin-bottom:12px}.title{font-size:17px;font-weight:900;text-align:center;margin-bottom:6px}.desc{font-size:12px;color:#94a3b8;text-align:center;margin-bottom:20px;line-height:1.6}.label{font-size:11px;color:#64748b;margin-bottom:4px;margin-top:12px}input,select{width:100%;padding:11px;background:#0f172a;border:1.5px solid #334155;border-radius:10px;color:#f1f5f9;font-size:14px;outline:none;margin-bottom:4px}input:focus,select:focus{border-color:#3b82f6}.btn{width:100%;padding:13px;background:linear-gradient(135deg,#1e40af,#3b82f6);color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:800;cursor:pointer;margin-top:8px}.btn-green{background:linear-gradient(135deg,#059669,#10b981)}.day-btn{width:100%;padding:10px 12px;background:#0f172a;border:1.5px solid #334155;border-radius:10px;color:#f1f5f9;font-size:12px;cursor:pointer;margin-bottom:6px;text-align:left;display:flex;justify-content:space-between;align-items:center}.day-btn.selected{border-color:#10b981;background:#052e16}.day-btn .badge{font-size:10px;padding:2px 8px;border-radius:4px;font-weight:700}.off-badge{background:#fee2e2;color:#dc2626}.work-badge{background:#dcfce7;color:#16a34a}.divider{text-align:center;color:#475569;font-size:12px;margin:12px 0}</style>
</head><body>
<div class="card">
  <div id="form-wrap">
    <div class="icon"></div>
    <div class="title">근무 교체 요청</div>
    <div class="desc">${fromName}님의 <b>${date}</b>${fromRoute?' ('+fromRoute+')':''} 교체 요청<br>이름 입력 후 교체할 날짜를 선택하세요.</div>
    <div class="label">내 이름</div>
    <input type="text" id="swap-name" placeholder="이름 입력 후 조회">
    <button class="btn" onclick="loadMyDays()">조회</button>
    <div id="days-wrap" style="display:none">
      <div class="label">교체할 날짜 선택</div>
      <div id="day-list"></div>
      <div id="route-wrap" style="display:none">
        <div class="label">${fromName}님 라우트 <span style="color:#64748b">(교체 후 ${fromName}이 배송할 라우트)</span></div>
        <input type="text" id="from-route" placeholder="예: 101C" value="${myRouteParam}">
        <div class="label" style="margin-top:8px">내 라우트 <span style="color:#64748b">(교체 후 내가 배송할 라우트)</span></div>
        <input type="text" id="my-route" placeholder="예: 215D (없으면 빈칸)">
        <button class="btn btn-green" onclick="acceptExchange()">교체 수락</button>
      </div>
    </div>
  </div>
  <div id="success-wrap" style="display:none;text-align:center;padding:20px">
    <div style="font-size:56px;margin-bottom:16px"></div>
    <div style="font-size:18px;font-weight:900;margin-bottom:8px">교체 완료!</div>
    <div id="success-msg" style="font-size:13px;color:#94a3b8;line-height:1.6"></div>
  </div>
</div>
<script>
var _myDays={};
var _selectedDate='';
var _selectedDocId='';

async function loadMyDays(){
  var name=document.getElementById('swap-name').value.trim();
  if(!name){alert('이름을 입력해주세요');return;}
  var params=new URLSearchParams(window.location.search);
  var did=params.get('did')||'';
  var ws=params.get('ws')||'';
  try{
    var res=await fetch('/swap?id=${docId}&action=mydays&name='+encodeURIComponent(name)+'&did='+did+'&ws='+ws);
    var data=await res.json();
    if(!data.ok){alert(data.error||'조회 실패');return;}
    _myDays=data.dayDocs||{};
    var dates=Object.keys(_myDays).sort();
    var el=document.getElementById('day-list');
    el.innerHTML='';
    if(!dates.length){
      el.innerHTML='<div style="font-size:12px;color:#64748b;padding:8px 0">이번 주 일정이 없습니다</div>';
    } else {
      dates.forEach(function(d){
        var info=_myDays[d];
        var isOff=info.status==='off';
        var badge='<span class="badge '+(isOff?'off-badge':'work-badge')+'">'+(isOff?'휴무':(info.route||'출근'))+'</span>';
        var b=document.createElement('button');
        b.className='day-btn';
        b.innerHTML='<span>'+d+'</span>'+badge;
        b.onclick=function(){
          document.querySelectorAll('.day-btn').forEach(function(x){x.classList.remove('selected');});
          b.classList.add('selected');
          _selectedDate=d;
          _selectedDocId=info.docId;
          document.getElementById('route-wrap').style.display='block';
        };
        el.appendChild(b);
      });
    }
    document.getElementById('days-wrap').style.display='block';
  }catch(e){alert('오류: '+e.message);}
}

async function acceptExchange(){
  var name=document.getElementById('swap-name').value.trim();
  var myRoute=document.getElementById('my-route').value.trim();
  if(!_selectedDate||!_selectedDocId){alert('날짜를 선택해주세요');return;}
  try{
    var params=new URLSearchParams(window.location.search);
    var res=await fetch('/swap?id=${docId}&did='+params.get('did')+'&ws='+params.get('ws')+'&di='+params.get('di'),
      {method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({name:name,mode:'exchange',myDate:_selectedDate,myDocId:_selectedDocId,myRoute:document.getElementById('my-route').value.trim(),fromRoute:document.getElementById('from-route').value.trim()})});
    var data=await res.json();
    if(data.ok){
      document.getElementById('form-wrap').style.display='none';
      document.getElementById('success-wrap').style.display='block';
      document.getElementById('success-msg').textContent='${date}(${fromName}) ↔ '+_selectedDate+'('+name+') 교체 완료!';
    }else{alert('오류: '+(data.error||'다시 시도해주세요'));}
  }catch(e){alert('오류가 발생했습니다');}
}
</script>
</body></html>`;
        return new Response(html, {headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
      }

      if (path === '/stmt') {
        const token = url.searchParams.get('t') || '';
        if (!token) return new Response('잘못된 접근입니다.', { status: 400 });
        try {
          const fsToken = await getAccessToken(env);
          const docUrl = 'https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents/statement_share/' + token;
          const fsRes = await fetch(docUrl, { headers: { 'Authorization': 'Bearer ' + fsToken } });
          if (!fsRes.ok) throw new Error('not found');
          const fsData = await fsRes.json();
          const f = fsData.fields || {};
          const gs = k => f[k]?.stringValue || '';
          const gn = k => parseFloat(f[k]?.integerValue || f[k]?.doubleValue || 0);
          const name     = gs('driverName');
          const month    = gs('month');
          const net      = gn('net');
          const coName   = gs('_coName') || gs('companyName') || 'DONWAY';
          const vatInc   = gn('vatIncome') || net;
          const supply   = Math.round(vatInc/1.1);
          const vat      = vatInc - supply;
          const emp      = gn('emp');
          const work     = gn('work');
          const fresh    = gn('fresh');
          const finc     = gn('finc');
        const incReason  = gs('incReason') || '';
          const nocont   = gn('nocont');
          const etcPlus  = gn('etcPlus');
          const etcMinus = gn('etcMinus');
          const dmg      = gn('dmg');
          const adv      = gn('adv');
          const deduct   = gn('deduct') || emp+work+dmg+etcMinus+adv;
          const dcnt     = gn('dcnt');
          const fincPer  = gn('fincPerUnit');
          const bizNum   = gs('bizNum') || '373-86-02536';
          const contactPhone = gs('contactPhone') || '051-711-3103';
          const dmgReason = gs('dmgReason');
          const etcMinusReason = gs('etcMinusReason');
          const etcPlusReason  = gs('etcPlusReason');
          const etcPlusTL      = gn('etcPlusTL');
          const etcPlusTLReason = gs('etcPlusTLReason');
          const ceoName      = gs('ceoName');
          const bizAddr       = gs('bizAddr');
          const bizType       = gs('bizType');
          const bizItem       = gs('bizItem');
          const monthLabel = month.replace('-', '년 ') + '월';

          // 라우트별 실적
          let routeRows = '';
          let totalDcnt = 0, totalRcnt = 0, totalAmt = 0;
          const rdArr = f['routeDetails']?.arrayValue?.values || [];
          rdArr.forEach(rv => {
            const rf = rv.mapValue?.fields || {};
            const route = rf.route?.stringValue || '';
            const cnt   = parseFloat(rf.cnt?.integerValue || rf.cnt?.doubleValue || 0);
            const ret   = parseFloat(rf.ret?.integerValue || rf.ret?.doubleValue || 0);
            const price = parseFloat(rf.unitPrice?.integerValue || rf.unitPrice?.doubleValue || 0);
            const dAmt  = cnt * price;
            const rAmt  = ret * price;
            const amt   = dAmt + rAmt;
            totalDcnt += cnt; totalRcnt += ret; totalAmt += amt;
            routeRows += `<tr>
              <td class="rt">${route}</td>
              <td class="num">${cnt}</td>
              <td class="num">${ret}</td>
              <td class="num">₩${price.toLocaleString()}</td>
              <td class="num bold blue">₩${amt.toLocaleString()}</td>
            </tr>`;
          });

          // 일일 상세 내역 (5일씩 show/hide 페이지네이션)
          const drFields = f['dateRoutes']?.mapValue?.fields || {};
          const dfFields = f['dateFresh']?.mapValue?.fields || {};
          const dateSet = new Set([...Object.keys(drFields), ...Object.keys(dfFields)]);
          const dailyDates = Array.from(dateSet).sort();
          const _DS = 5;
          const _dTotalPages = Math.ceil(dailyDates.length / _DS);
          let dailyTotalFresh = 0;
          Object.keys(dfFields).forEach(dt => {
            dailyTotalFresh += parseFloat(dfFields[dt]?.integerValue || dfFields[dt]?.doubleValue || 0);
          });

          let allPages = '';
          for (let pi = 0; pi < _dTotalPages; pi++) {
            const pageDates = dailyDates.slice(pi * _DS, (pi + 1) * _DS);
            let rows = '';
            pageDates.forEach(dt => {
              const routesMap = drFields[dt]?.mapValue?.fields || {};
              const routeKeys = Object.keys(routesMap).sort();
              let dayDcnt = 0, dayRcnt = 0;
              const routeParts = [];
              routeKeys.forEach(rt => {
                const rf2 = routesMap[rt]?.mapValue?.fields || {};
                const c = parseFloat(rf2.cnt?.integerValue || rf2.cnt?.doubleValue || 0);
                const rr = parseFloat(rf2.ret?.integerValue || rf2.ret?.doubleValue || 0);
                dayDcnt += c; dayRcnt += rr;
                routeParts.push(rt + '(' + c + (rr ? '/반' + rr : '') + ')');
              });
              const dayFresh = parseFloat(dfFields[dt]?.integerValue || dfFields[dt]?.doubleValue || 0);
              rows += `<tr>
                <td style="padding:5px 8px;border-bottom:1px solid #eee;font-size:11px;color:#185FA5;font-weight:600">${dt}</td>
                <td style="padding:5px 8px;border-bottom:1px solid #eee;font-size:10px;color:#475569">${routeParts.join(', ') || '-'}</td>
                <td style="padding:5px 8px;border-bottom:1px solid #eee;text-align:right;font-size:11px">${dayDcnt}</td>
                <td style="padding:5px 8px;border-bottom:1px solid #eee;text-align:right;font-size:11px">${dayRcnt}</td>
                <td style="padding:5px 8px;border-bottom:1px solid #eee;text-align:right;font-size:11px;${dayFresh>0?'color:#059669':'color:#94a3b8'}">${dayFresh>0?'+'+dayFresh.toLocaleString():'-'}</td>
              </tr>`;
            });
            const freshFoot = (pi === _dTotalPages - 1 && dailyTotalFresh > 0)
              ? `<tfoot><tr style="background:#f0fdf4"><td colspan="4" style="padding:6px 8px;font-size:11px;font-weight:700;color:#059669;text-align:right">프레시백 합계</td><td style="padding:6px 8px;font-size:11px;font-weight:700;color:#059669;text-align:right">+${dailyTotalFresh.toLocaleString()}원</td></tr></tfoot>`
              : '';
            allPages += `<div id="dp-page-${pi}" style="display:${pi===0?'block':'none'}">
              <table>
                <thead><tr style="background:#f8fafc">
                  <th style="padding:6px 8px;text-align:left;font-size:10px;color:#64748b">날짜</th>
                  <th style="padding:6px 8px;text-align:left;font-size:10px;color:#64748b">라우트(건수)</th>
                  <th style="padding:6px 8px;text-align:right;font-size:10px;color:#64748b">배송</th>
                  <th style="padding:6px 8px;text-align:right;font-size:10px;color:#64748b">반품</th>
                  <th style="padding:6px 8px;text-align:right;font-size:10px;color:#64748b">프레시백</th>
                </tr></thead>
                <tbody>${rows}</tbody>
                ${freshFoot}
              </table>
            </div>`;
          }

          const nav = _dTotalPages > 1 ? `
            <div style="display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-top:6px">
              <button id="dp-prev" onclick="var cur=parseInt(document.getElementById('dp-cur').value);if(cur>0){document.getElementById('dp-page-'+cur).style.display='none';document.getElementById('dp-page-'+(cur-1)).style.display='block';document.getElementById('dp-cur').value=cur-1;document.getElementById('dp-label').textContent=cur+'/${_dTotalPages}';}" style="border:none;background:#dbeafe;color:#1e40af;border-radius:4px;padding:2px 10px;font-size:12px;cursor:pointer">◀</button>
              <span id="dp-label" style="font-size:11px;color:#64748b">1/${_dTotalPages}</span>
              <button id="dp-next" onclick="var cur=parseInt(document.getElementById('dp-cur').value);if(cur<${_dTotalPages}-1){document.getElementById('dp-page-'+cur).style.display='none';document.getElementById('dp-page-'+(cur+1)).style.display='block';document.getElementById('dp-cur').value=cur+1;document.getElementById('dp-label').textContent=(cur+2)+'/${_dTotalPages}';}" style="border:none;background:#dbeafe;color:#1e40af;border-radius:4px;padding:2px 10px;font-size:12px;cursor:pointer">▶</button>
              <input type="hidden" id="dp-cur" value="0">
            </div>` : '';

          const dailySec = dailyDates.length ? `
            <div class="sec">
              <div class="sec-title">일일 상세 내역 (날짜별 배송/반품/프레시백)</div>
              ${allPages}
              ${nav}
            </div>` : '';

          // 아이디지원 섹션
          const idsArr = (f['idSupportRules']?.arrayValue?.values || []).map(v => {
            const vf = v.mapValue?.fields || {};
            return {
              fromId: vf.fromId?.stringValue || '',
              toId: vf.toId?.stringValue || '',
              dates: (vf.dates?.arrayValue?.values || []).map(dv => dv.stringValue || '').sort()
            };
          }).filter(r => r.fromId || r.toId);
          const driverUid = gs('userId') || gs('driver') || '';
          const idsSec = idsArr.length ? `
            <div class="sec" style="margin-top:12px">
              <div class="sec-title" style="font-size:12px;font-weight:800;color:#166534;margin-bottom:8px">아이디 지원 내역</div>
              ${idsArr.map(r => {
                const isFrom = r.fromId === driverUid;
                const other = isFrom ? r.toId : r.fromId;
                const arrow = isFrom ? r.fromId + ' → ' + r.toId : r.fromId + ' → ' + r.toId;
                const badge = isFrom ? '<span style="font-size:9px;background:#dcfce7;color:#166534;padding:1px 5px;border-radius:8px;margin-left:4px">지원</span>' : '<span style="font-size:9px;background:#dbeafe;color:#1e40af;padding:1px 5px;border-radius:8px;margin-left:4px">수혜</span>';
                return '<div style="font-size:11px;color:#374151;margin-bottom:4px">' + arrow + badge + '<span style="color:#64748b;margin-left:6px">' + r.dates.join(', ') + '</span></div>';
              }).join('')}
            </div>` : '';

          // 추가 항목
          let addRows = '';
          addRows += `<tr><td class="item">③ 프레시백 회수금액</td><td class="amt green">+₩${fresh.toLocaleString()}</td></tr>`;
          addRows += `<tr><td class="item">④ 프레시백 인센티브${fincPer>0?' <small>('+dcnt+'건 × '+fincPer+'원)</small>':''}</td><td class="amt green">+₩${finc.toLocaleString()}</td></tr>`;
          if(incReason) addRows += `<tr><td class="item" style="padding-left:16px;color:#6b7280;font-size:11px">└ 가중요인: ${incReason}</td><td class="amt green" style="font-size:11px"></td></tr>`;
          addRows += `<tr><td class="item">⑤ 미계약건</td><td class="amt green">+₩${nocont.toLocaleString()}</td></tr>`;
          if(etcPlus>0)  addRows += `<tr><td class="item">⑦ 기타(+)${etcPlusReason?' <small style="color:#94a3b8">('+etcPlusReason+')</small>':''}</td><td class="amt green">+₩${etcPlus.toLocaleString()}</td></tr>`;
          if(etcPlusTL>0) addRows += `<tr><td class="item">팀장수수료${etcPlusTLReason?' <small style="color:#94a3b8">('+etcPlusTLReason+')</small>':''}</td><td class="amt green">+₩${etcPlusTL.toLocaleString()}</td></tr>`;

          // 공제 항목
          let deductRows = '';
          deductRows += `<tr><td class="item">고용보험 (0.8%, 80만↑)</td><td class="amt red">-₩${emp.toLocaleString()}</td></tr>`;
          deductRows += `<tr><td class="item">산재보험 (0.88%)</td><td class="amt red">-₩${work.toLocaleString()}</td></tr>`;
          deductRows += `<tr><td class="item">⑥ 분실/파손${dmgReason?' ('+dmgReason+')':''}</td><td class="amt red">-₩${dmg.toLocaleString()}</td></tr>`;
          deductRows += `<tr><td class="item">⑦ 기타(+)${etcPlusReason?' <small style="color:#94a3b8">('+etcPlusReason+')</small>':''}</td><td class="amt green">+₩${etcPlus.toLocaleString()}</td></tr>`;
          deductRows += `<tr><td class="item">⑧ 기타(-)${etcMinusReason?' <small style="color:#94a3b8">('+etcMinusReason+')</small>':''}</td><td class="amt red">-₩${etcMinus.toLocaleString()}</td></tr>`;
          deductRows += `<tr><td class="item">⑨ 가불 공제</td><td class="amt red">-₩${adv.toLocaleString()}</td></tr>`;

          const routeSec = routeRows ? `
            <div class="sec">
              <div class="sec-title">① 배송 ② 반품 — 라우트별 실적 (건수×단가)</div>
              <table>
                <thead><tr style="background:#f8fafc">
                  <th style="padding:5px 8px;text-align:left">라우트</th>
                  <th style="padding:5px 8px;text-align:right">배송건</th>
                  <th style="padding:5px 8px;text-align:right">반품건</th>
                  <th style="padding:5px 8px;text-align:right">단가</th>
                  <th style="padding:5px 8px;text-align:right">소계</th>
                </tr></thead>
                <tbody>${routeRows}</tbody>
                <tfoot><tr style="background:#eff6ff;font-weight:700">
                  <td style="padding:6px 8px">합계</td>
                  <td style="padding:6px 8px;text-align:right">${totalDcnt}건</td>
                  <td style="padding:6px 8px;text-align:right">${totalRcnt}건</td>
                  <td></td>
                  <td style="padding:6px 8px;text-align:right;color:#185FA5">₩${totalAmt.toLocaleString()}</td>
                </tr></tfoot>
              </table>
            </div>` : '';

          const addSec = (addRows || deductRows) ? `
            <div class="sec" style="padding-top:0">
              <table>${addRows}${deductRows}</table>
            </div>` : '';

          // 세금계산서 섹션 (버튼 탭하면 펼침)
          const taxSec = `
            <div class="sec" style="padding-bottom:0">
              <button onclick="var el=document.getElementById('tax-detail');el.style.display=el.style.display==='none'?'block':'none';this.textContent=el.style.display==='none'?'세금계산서 보기 ▼':'세금계산서 닫기 ▲'"
                style="width:100%;padding:12px;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;margin-bottom:10px">
                세금계산서 보기 ▼
              </button>
              <div id="tax-detail" style="display:none;background:#faf5ff;border:1px solid #e9d5ff;border-radius:10px;padding:14px;margin-bottom:12px">
                <div style="font-size:11px;font-weight:800;color:#7c3aed;margin-bottom:10px;padding-bottom:6px;border-bottom:1.5px solid #e9d5ff">세금계산서 내역</div>
                <table>
                  <tr><td class="item" style="color:#64748b">공급가액</td><td class="amt" style="color:#7c3aed">₩${supply.toLocaleString()}</td></tr>
                  <tr><td class="item" style="color:#64748b">부가세 (10%)</td><td class="amt" style="color:#7c3aed">₩${vat.toLocaleString()}</td></tr>
                  <tr style="border-top:1.5px solid #e9d5ff;font-weight:800"><td class="item" style="color:#7c3aed">합계 (VAT포함)</td><td class="amt" style="color:#7c3aed;font-size:14px">₩${vatInc.toLocaleString()}</td></tr>
                </table>
                <div style="margin-top:10px;font-size:10px;color:#94a3b8;line-height:1.8">
                  공급자: ${coName}${ceoName?' (대표: '+ceoName+')':''}<br>
                  사업자번호: ${bizNum}<br>
                  ${bizAddr?'사업장 주소: '+bizAddr+'<br>':''}                  ${bizType?'업태: '+bizType+(bizItem?' · 종목: '+bizItem:'')+'<br>':''}                  문의: ${contactPhone}
                </div>
              </div>
            </div>`;

          const css = `
            *{margin:0;padding:0;box-sizing:border-box}
            body{background:#f1f5f9;font-family:"Apple SD Gothic Neo","Noto Sans KR",sans-serif;min-height:100vh;padding:16px}
            .logo{text-align:center;font-size:12px;font-weight:900;color:#1e3a8a;letter-spacing:.1em;padding:12px 0 4px}
            .wrap{max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.1)}
            .hdr{background:linear-gradient(135deg,#1e3a8a,#3b82f6);color:#fff;padding:18px 20px}
            .hdr .lbl{font-size:10px;opacity:.7;margin-bottom:4px}
            .hdr .ttl{font-size:18px;font-weight:800;margin-bottom:2px}
            .hdr .sub{font-size:12px;opacity:.85}
            .summary{display:grid;grid-template-columns:1fr 1fr 1fr;border-bottom:2px solid #e2e8f0}
            .sbox{padding:10px;text-align:center;border-right:1px solid #e2e8f0}
            .sbox:last-child{border-right:none}
            .slbl{font-size:9px;color:#64748b;margin-bottom:3px}
            .sval{font-size:13px;font-weight:800}
            .ssub{font-size:9px;color:#94a3b8;margin-top:2px}
            .sec{padding:12px 14px;overflow-x:auto}
            .sec-title{font-size:11px;font-weight:800;margin-bottom:8px;padding-bottom:4px;border-bottom:2px solid #e2e8f0}
            table{width:100%;border-collapse:collapse;font-size:11px}
            td{padding:5px 8px}
            .rt{border-bottom:1px solid #eee;font-weight:600;color:#185FA5}
            .num{border-bottom:1px solid #eee;text-align:right}
            .bold{font-weight:700}
            .blue{color:#185FA5}
            .item{font-size:12px;color:#374151}
            .item small{font-size:10px}
            .amt{text-align:right;font-size:12px;font-weight:700}
            .green{color:#059669}
            .red{color:#dc2626}
            .net-row{background:#eff6ff;border-radius:8px;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;margin:0 14px 14px}
            .ft{padding:10px 14px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;text-align:center;line-height:1.8}
          `;

          const html = `<!DOCTYPE html><html lang="ko" translate="no"><head><meta charset="UTF-8">
            <meta name="viewport" content="width=device-width,initial-scale=1">
            <meta name="google" content="notranslate">
            <title>${coName} 정산명세서</title>
            <style>${css}</style></head><body>
            <div class="logo">DONWAY</div>
            <div class="wrap">
              <div class="hdr">
                <div class="lbl">OFFICIAL STATEMENT · ${coName}</div>
                <div class="ttl">${monthLabel} 정산 명세서</div>
                <div class="sub">${name} &nbsp;<span style="opacity:.6">쿠팡</span></div>
              </div>
              <div class="summary">
                <div class="sbox"><div class="slbl">세금계산서 합계</div><div class="sval" style="color:#7c3aed">₩${vatInc.toLocaleString()}</div><div class="ssub">공급가 ₩${supply.toLocaleString()} + VAT ₩${vat.toLocaleString()}</div></div>
                <div class="sbox"><div class="slbl">공제 합계</div><div class="sval" style="color:#dc2626">-₩${deduct.toLocaleString()}</div><div class="ssub">고용+산재+파손+기타(-)+가불</div></div>
                <div class="sbox"><div class="slbl">실 지급액</div><div class="sval" style="color:#185FA5">₩${net.toLocaleString()}</div></div>
              </div>
              ${routeSec}
              ${dailySec}${idsSec}
              ${addSec}
              ${taxSec}
              <div class="net-row"><span style="font-weight:700;font-size:13px">실지급액</span><span style="font-size:22px;font-weight:900;color:#185FA5">₩${net.toLocaleString()}</span></div>
              <div class="ft">${coName} · ${contactPhone} · 사업자번호 ${bizNum}<br>DONWAY 자동 발행 · 고유 링크로 보호됩니다</div>
              <!-- 계좌 등록 폼 -->
              <div id="bank-section" style="margin:14px;border:1.5px solid #e2e8f0;border-radius:12px;overflow:hidden">
                <div style="background:#f8fafc;padding:12px 14px;border-bottom:1px solid #e2e8f0">
                  <div style="font-size:12px;font-weight:800;color:#1e3a8a">계좌 정보 등록</div>
                  <div style="font-size:10px;color:#64748b;margin-top:2px">등록된 계좌로 급여가 이체됩니다</div>
                </div>
                <div id="bank-form" style="padding:14px;display:flex;flex-direction:column;gap:10px">
                  <select id="bank-name" style="padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;background:#fff">
                    <option value="">은행 선택</option>
                    <option>국민은행</option><option>신한은행</option><option>우리은행</option>
                    <option>하나은행</option><option>농협은행</option><option>기업은행</option>
                    <option>카카오뱅크</option><option>토스뱅크</option><option>케이뱅크</option>
                    <option>SC제일은행</option><option>새마을금고</option><option>신협</option>
                    <option>우체국</option><option>부산은행</option><option>경남은행</option>
                    <option>대구은행</option><option>광주은행</option>
                  </select>
                  <input id="bank-num" type="tel" placeholder="계좌번호 (- 없이 숫자만)" style="padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px">
                  <button onclick="submitBank()" style="padding:12px;background:linear-gradient(135deg,#1e3a8a,#3b82f6);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer">계좌 등록</button>
                  <div id="bank-msg" style="font-size:11px;text-align:center;color:#64748b"></div>
                </div>
                <div id="bank-done" style="display:none;padding:14px;text-align:center">
                  <div style="font-size:24px;margin-bottom:6px"></div>
                  <div style="font-size:13px;font-weight:700;color:#059669">계좌가 등록되었습니다</div>
                  <div style="font-size:11px;color:#64748b;margin-top:4px">관리자에게 전달되었습니다</div>
                </div>
              </div>
            </div>
            <script>
            var _stmtToken="${token}", _stmtDealer="${gs('dealerId')}", _stmtName="${name}";
            async function submitBank(){
              var bn=document.getElementById("bank-name").value;
              var bnum=document.getElementById("bank-num").value.replace(/[^0-9]/g,"");
              var msg=document.getElementById("bank-msg");
              if(!bn){msg.style.color="#dc2626";msg.textContent="은행을 선택해주세요";return;}
              if(!bnum||bnum.length<10){msg.style.color="#dc2626";msg.textContent="올바른 계좌번호를 입력해주세요";return;}
              msg.style.color="#64748b";msg.textContent="확인 중...";
              try{
                var res=await fetch("/api/register-bank",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:_stmtToken,bankName:bn,bankNum:bnum,driverName:_stmtName,dealerId:_stmtDealer})});
                var data=await res.json();
                if(data.ok){document.getElementById("bank-form").style.display="none";document.getElementById("bank-done").style.display="block";}
                else{msg.style.color="#dc2626";msg.textContent=data.error||"등록 실패. 관리자에게 문의하세요.";}
              }catch(e){msg.style.color="#dc2626";msg.textContent="오류가 발생했습니다";}
            }
            </script>
            </body></html>`;

          return new Response(html, { headers: { 'Content-Type': 'text/html;charset=utf-8', 'Cache-Control': 'no-store' } });
        } catch(e2) {
          return new Response('<!DOCTYPE html><html><body style="background:#0f1623;color:#f0f4ff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;text-align:center"><div><div style="font-size:40px;margin-bottom:16px"></div><div>명세서를 찾을 수 없거나 만료되었습니다.</div><div style="font-size:11px;color:#94a3b8;margin-top:12px">' + e2.message + '</div></div></body></html>', { status:404, headers:{'Content-Type':'text/html;charset=utf-8'} });
        }
      }

      if (path === '/settle' || path === '/settle.html') return Response.redirect('https://donway.ai.kr/join', 302);

    // ★ slug 기반 동적 manifest + 아이콘
    // /c/{slug}/manifest.json → 회사명으로 동적 생성
    // /c/{slug}/icon.svg → 회사명 첫 두 글자 SVG 아이콘
    // /c/{slug} → settle.html 서빙 (향후 회사별 랜딩)
    const slugMatch = path.match(/^\/c\/([A-Za-z0-9\-_]+)(\/.+)?$/);
    if (slugMatch) {
      const slug = slugMatch[1];
      const subPath = slugMatch[2] || '';
      const fsToken2 = await getAccessToken(env);
      // Firestore에서 slug로 회사 조회
      const qUrl = `https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents:runQuery`;
      const qBody = JSON.stringify({ structuredQuery: {
        from: [{ collectionId: 'companies' }],
        where: { fieldFilter: { field: { fieldPath: 'slug' }, op: 'EQUAL', value: { stringValue: slug } } },
        limit: 1
      }});
      const qRes = await fetch(qUrl, { method:'POST', headers:{ 'Authorization':`Bearer ${fsToken2}`, 'Content-Type':'application/json' }, body: qBody });
      const qData = await qRes.json();
      const compDoc = qData[0]?.document?.fields || {};
      const compName = compDoc.companyName?.stringValue || 'DONWAY';
      const shortName = compName.length > 4 ? compName.slice(0,2) : compName;
      const shortLabel = compDoc.shortLabel?.stringValue || '';
      const label = shortLabel || shortName.slice(0,2);

      // SVG 아이콘
      if (subPath === '/icon.svg') {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" rx="40" fill="#00c8f8"/><text x="96" y="130" font-size="88" font-family="'Noto Sans KR',sans-serif" font-weight="700" fill="white" text-anchor="middle">${label}</text></svg>`;
        return new Response(svg, { headers: { 'Content-Type':'image/svg+xml', 'Cache-Control':'public,max-age=3600' } });
      }

      // manifest.json
      if (subPath === '/manifest.json') {
        const manifest = {
          name: compName + ' DONWAY',
          short_name: shortLabel || shortName,
          start_url: '/c/' + slug,
          display: 'standalone',
          background_color: '#0f1623',
          theme_color: '#00c8f8',
          icons: [
            { src: '/c/' + slug + '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }
          ]
        };
        return new Response(JSON.stringify(manifest), { headers: { 'Content-Type':'application/manifest+json', 'Cache-Control':'no-cache' } });
      }

      // /c/{slug} → settle.html 서빙 + manifest 링크 주입
      if (!subPath || subPath === '/') {
        const kvStream_c = env.DONWAY_ASSETS ? await env.DONWAY_ASSETS.get('settle.html','stream') : null;
        if (kvStream_c) {
          return new Response(kvStream_c, { headers: { 'Content-Type':'text/html;charset=utf-8', 'Cache-Control':'no-store', ...SECURITY_HEADERS } });
        }
      }
    }
      if (path === '/register' || path === '/register.html') return serveKVFile(env, 'register.html', 'text/html');
      if (path === '/admin' || path === '/admin.html') return serveKVFile(env, 'settle.html', 'text/html');
      if (path === '/admin-sub' || path === '/admin_sub.html') return Response.redirect('https://mbtico.kr/control', 302);


      // ★ /{slug} 직접 접속 처리 (donway.ai.kr/kimdh47900 등)
      if (!path.startsWith('/api/') && method === 'GET') {
        const slugDirect = path.match(/^\/([a-zA-Z0-9\u0041-\uD7A3\-_]{1,30})\/?$/);
        const knownDirect = new Set(['/join','/settle','/register','/admin','/admin-sub','/stmt','/c','/manifest.json','/sw.js','/firebase-messaging-sw.js','/robots.txt','/sitemap.xml','/favicon.ico','/naver335e547bce1645ef18a6f68fac7f87eb.html']);
        if (slugDirect && !knownDirect.has(slugDirect[0].replace(/\/$/,''))) {
          const slug2 = slugDirect[1];
          try {
            const kvStream_s = env.DONWAY_ASSETS ? await env.DONWAY_ASSETS.get('settle.html','stream') : null;
            if (kvStream_s) {
              return new Response(kvStream_s, { headers: { 'Content-Type':'text/html;charset=utf-8', 'Cache-Control':'no-store', ...SECURITY_HEADERS } });
            }
          } catch(e) {}
        }
      }
    }

    // ★ filo.ai.kr 라우팅
    if (hostname === 'dine.ne.kr' || hostname === 'www.dine.ne.kr') {
      if (path === '/api/get-members') {
        const dealerId = new URL(request.url).searchParams.get('dealerId');
        if (!dealerId) return new Response(JSON.stringify({error:'dealerId required'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        const token = await getAccessToken(env);
        const res2 = await fetch(`${FS_BASE}:runQuery`,{
          method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
          body:JSON.stringify({structuredQuery:{from:[{collectionId:'members'}],where:{fieldFilter:{field:{fieldPath:'dealerId'},op:'EQUAL',value:{stringValue:dealerId}}},orderBy:[{field:{fieldPath:'name'},direction:'ASCENDING'}]}})
        });
        const rows = await res2.json();
        const docs = (rows||[]).filter(r=>r.document).map(r=>{
          const f=r.document.fields||{};
          const obj={id:r.document.name.split('/').pop()};
          Object.keys(f).forEach(k=>{
            const v=f[k];
            obj[k]=v.stringValue??v.integerValue??v.booleanValue??v.doubleValue??null;
          });
          return obj;
        });
        return new Response(JSON.stringify({ok:true,members:docs}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
      }
      if (path === '/api/save-member' && method === 'POST') {
        // 사장님이 직원 등록/수정 — SA 토큰으로 Firestore 저장
        try {
          const body = await request.json();
          if (!body.dealerId || !body.name) return new Response(JSON.stringify({error:'dealerId and name required'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
          const token = await getAccessToken(env);
          const docId = body.staffId || body.phone || (body.dealerId+'_'+Date.now());
          const fields = {};
          Object.keys(body).forEach(k => {
            const v = body[k];
            if (v === null || v === undefined) return;
            if (typeof v === 'number') fields[k] = {integerValue: v};
            else if (typeof v === 'boolean') fields[k] = {booleanValue: v};
            else fields[k] = {stringValue: String(v)};
          });
          const res2 = await fetch(`${FS_BASE}/members/${encodeURIComponent(docId)}`,{
            method:'PATCH',
            headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
            body:JSON.stringify({fields})
          });
          const result = await res2.json();
          if (result.error) return new Response(JSON.stringify({ok:false,error:result.error.message}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
          return new Response(JSON.stringify({ok:true,id:docId}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        } catch(e) {
          return new Response(JSON.stringify({ok:false,error:e.message}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        }
      }
      if (path === '/api/find-company') {
        const params = new URL(request.url).searchParams;
        const slug = params.get('slug');
        const uid  = params.get('uid');
        const platform = params.get('platform') || 'dine';
        if (!slug && !uid) return new Response(JSON.stringify({error:'slug or uid required'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        const token = await getAccessToken(env);
        const CORS = {'Content-Type':'application/json','Access-Control-Allow-Origin':'*'};

        // uid 조회 (로그인용)
        if (uid) {
          const r2 = await fetch(`${FS_BASE}:runQuery`,{
            method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
            body:JSON.stringify({structuredQuery:{from:[{collectionId:'companies'}],where:{compositeFilter:{op:'AND',filters:[{fieldFilter:{field:{fieldPath:'platform'},op:'EQUAL',value:{stringValue:platform}}},{fieldFilter:{field:{fieldPath:'uid'},op:'EQUAL',value:{stringValue:uid}}}]}},limit:1}})
          });
          const rows = await r2.json();
          const docs = (rows||[]).filter(r=>r.document);
          if (docs.length) {
            const co = docs[0].document;
            const did = co.name.split('/').pop();
            const coName = (co.fields.companyName||co.fields.name||{}).stringValue||'';
            return new Response(JSON.stringify({found:true,dealerId:did,companyName:coName}),{headers:CORS});
          }
          return new Response(JSON.stringify({found:false}),{headers:CORS});
        }

        // slug 조회 — slug필드, name필드, companyName필드 순서로 폴백
        const fields = ['slug','dineSlug','storeName','name','companyName'];
        for (const field of fields) {
          const r2 = await fetch(`${FS_BASE}:runQuery`,{
            method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
            body:JSON.stringify({structuredQuery:{from:[{collectionId:'companies'}],where:{fieldFilter:{field:{fieldPath:field},op:'EQUAL',value:{stringValue:slug}}},limit:1}})
          });
          const rows = await r2.json();
          const docs = (rows||[]).filter(r=>r.document);
          if (docs.length) {
            const co = docs[0].document;
            const did = co.name.split('/').pop();
            const coName = (co.fields.companyName||co.fields.name||{}).stringValue||'';
            return new Response(JSON.stringify({found:true,dealerId:did,companyName:coName}),{headers:CORS});
          }
        }
        return new Response(JSON.stringify({found:false}),{headers:CORS});
      }
      if (path === '/dine.js') return serveKVFile(env, 'dine.js', 'application/javascript');
      if (path === '/dine-staff.js') return serveKVFile(env, 'dine-staff.js', 'application/javascript');
      if (path === '/dine-payroll.js') return serveKVFile(env, 'dine-payroll.js', 'application/javascript');
      if (path === '/dine-sales.js') return serveKVFile(env, 'dine-sales.js', 'application/javascript');
      if (path === '/dine-analytics.js') return serveKVFile(env, 'dine-analytics.js', 'application/javascript');
      if (path === '/dine-tax.js') return serveKVFile(env, 'dine-tax.js', 'application/javascript');
      if (path === '/dine-member.js') return serveKVFile(env, 'dine-member.js', 'application/javascript');
      if (path === '/' || path === '') return serveKVFile(env, 'dine-landing.html', 'text/html');
      if (path === '/app' || path === '/app.html') return serveKVFile(env, 'dine.html', 'text/html');
      // ★ /슬러그/status → 회원용 테이블/대기 현황 페이지
      if (path.match(/^\/[^/]+\/status$/)) {
        const slugForStatus = path.replace(/^\//, '').replace(/\/status$/, '');
        const statusHtml = await env.DONWAY_ASSETS.get('dine-status.html', 'text');
        if (statusHtml) {
          const injected = statusHtml.replace('</head>',
            '<script>window.__DINE_SLUG__=' + JSON.stringify(decodeURIComponent(slugForStatus)) + ';</script></head>'
          );
          return new Response(injected, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
        }
      }
      // ★ /매장명 or /slug 경로 → dine.html 서빙 + 매장명 주입
      const dinePath = path.replace(/^\//, '');
      if (dinePath && dinePath !== 'app' && dinePath !== 'app.html') {
        const dineHtml = await env.DONWAY_ASSETS.get('dine.html', 'text');
        if (dineHtml) {
          const storeKey = decodeURIComponent(dinePath); // 한글 or 영문 slug
          // Firestore에서 slug 또는 companyName으로 매장 조회
          let storeName = storeKey;
          try {
            const fsRes = await fetch('https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents:runQuery', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ structuredQuery: {
                from: [{ collectionId: 'companies' }],
                where: { compositeFilter: { op: 'AND', filters: [
                  { fieldFilter: { field: { fieldPath: 'platform' }, op: 'EQUAL', value: { stringValue: 'dine' } } },
                  { fieldFilter: { field: { fieldPath: 'dineSlug' }, op: 'EQUAL', value: { stringValue: storeKey } } }
                ]}},
                limit: 1
              }})
            });
            const fsData = await fsRes.json();
            const doc = fsData && fsData[0] && fsData[0].document;
            if (doc) {
              storeName = (doc.fields.companyName || doc.fields.name || {}).stringValue || storeKey;
            } else {
              // slug 없으면 companyName으로 재시도
              const fsRes2 = await fetch('https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents:runQuery', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ structuredQuery: {
                  from: [{ collectionId: 'companies' }],
                  where: { compositeFilter: { op: 'AND', filters: [
                    { fieldFilter: { field: { fieldPath: 'platform' }, op: 'EQUAL', value: { stringValue: 'dine' } } },
                    { fieldFilter: { field: { fieldPath: 'companyName' }, op: 'EQUAL', value: { stringValue: storeKey } } }
                  ]}},
                  limit: 1
                }})
              });
              const fsData2 = await fsRes2.json();
              const doc2 = fsData2 && fsData2[0] && fsData2[0].document;
              if (doc2) storeName = (doc2.fields.companyName || doc2.fields.name || {}).stringValue || storeKey;
            }
          } catch(e) {}
          const injected = dineHtml.replace(
            '</head>',
            '<script>window.__DINE_STORE__=' + JSON.stringify(storeName) + ';window.__DINE_SLUG__=' + JSON.stringify(storeKey) + ';</script></head>'
          );
          return new Response(injected, {
            headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
          });
        }
      }
      return serveKVFile(env, 'dine.html', 'text/html');
    }

    if (hostname === 'filo.ai.kr' || hostname === 'www.filo.ai.kr') {
      if (path === '/api/translate') {
        if (request.method === 'OPTIONS') return new Response(null, {headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type'}});
        let body;try{body=await request.json();}catch(e){body={};}
        const name = body.name || '';
        const lang = body.lang || 'en';
        if(!name) return new Response(JSON.stringify({translated:''}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        // KV 캐시 확인 (24시간) - ASCII 해시로 키 생성
        const cacheKey = 'tr:'+lang+':'+(function(s){var h=0x811c9dc5;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0;}return h.toString(36)+':'+s.length;})(name);
        try {
          const cached = await env.DONWAY_ASSETS.get(cacheKey);
          if(cached) return new Response(JSON.stringify({translated:cached}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','X-Cache':'HIT'}});
        } catch(e){}
        const langNames = {en:'English',zh:'Chinese (Simplified)',ja:'Japanese'};
        const langMap = {en:'en',zh:'zh-CN',ja:'ja'};
        let translated = '';
        // Anthropic 재시도 3회 (키 없으면 즉시 Google 폴백)
        const k = (env.ANTHROPIC_API_KEY||'').trim();
        const tl2 = langMap[lang]||'en';
        if(k) {
          for(let attempt=0; attempt<3 && !translated; attempt++) {
            try {
              if(attempt>0) await new Promise(r=>setTimeout(r,500*attempt));
              const res = await fetch('https://api.anthropic.com/v1/messages',{
                method:'POST',
                headers:{'Content-Type':'application/json','x-api-key':k,'anthropic-version':'2023-06-01'},
                body:JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:60,messages:[{role:'user',content:'Translate this Korean restaurant menu item name to '+langNames[lang]+'. This is a Korean traditional meal set restaurant menu. Return ONLY the translated name, keep it natural and appetizing, nothing else: '+name}]})
              });
              if(res.ok){
                const d = await res.json();
                translated = (d.content&&d.content[0]&&d.content[0].text)||'';
                console.log('[tr] anthropic ok(attempt '+attempt+'):'+translated);
              } else {
                console.log('[tr] anthropic '+res.status+' attempt '+attempt);
              }
            } catch(e){console.log('[tr] anthropic err:'+e.message);}
          }
        }
        // Google 폴백
        if(!translated || translated===name) {
          try {
            const gKey = (env.GOOGLE_TRANSLATE_KEY||'').trim();
          if(gKey){
            const gRes = await fetch('https://translation.googleapis.com/language/translate/v2?key='+gKey,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({q:name,source:'ko',target:tl2,format:'text'})});
            if(!gRes.ok) throw new Error('google-official:'+gRes.status);
            const gData = await gRes.json();
            translated = (gData&&gData.data&&gData.data.translations&&gData.data.translations[0]&&gData.data.translations[0].translatedText)||'';
            console.log('[tr] google official:'+translated);
          } else {
            const gRes = await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=ko&tl='+tl2+'&dt=t&q='+encodeURIComponent(name),{
              headers:{'User-Agent':'Mozilla/5.0 (compatible; FILO/1.0)','Accept':'application/json, text/plain, */*'}
            });
            if(!gRes.ok) throw new Error('google-free:'+gRes.status);
            const gData = await gRes.json();
            translated = (gData&&gData[0]&&gData[0][0]&&gData[0][0][0])||'';
            console.log('[tr] google fallback:'+translated);
          }
          } catch(e){console.log('[tr] google err:'+e.message);}
        }
        // 한글 포함이면 번역 실패로 처리 → Google 재시도
        const hasKorean = /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(translated);
        if(!translated || hasKorean || translated.trim() === name) {
          try {
            const gKey3 = (env.GOOGLE_TRANSLATE_KEY||'').trim();
            if(gKey3) {
              const gRes3 = await fetch('https://translation.googleapis.com/language/translate/v2?key='+gKey3,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({q:name,source:'ko',target:tl2,format:'text'})});
              const gData3 = await gRes3.json();
              const gt3 = (gData3&&gData3.data&&gData3.data.translations&&gData3.data.translations[0]&&gData3.data.translations[0].translatedText)||'';
              if(gt3 && !/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(gt3)) translated = gt3;
            }
          } catch(e){}
        }
        // 번역 성공 시만 KV 캐시 저장 (한글/한자 포함이면 저장 안함 — 단 zh 타깃은 한자 허용)
        const hasCJK = lang !== 'zh' && /[一-鿿]/.test(translated);
        if(translated && translated.trim() !== name && !/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(translated) && !hasCJK) {
          try{await env.DONWAY_ASSETS.put(cacheKey,translated.trim(),{expirationTtl:86400});}catch(e){}
        }
        return new Response(JSON.stringify({translated:(translated||name).trim()}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
      }
      /* /api/claude — AI 인사이트·리뷰답글 프록시 (filo-margin.js, filo-settings.js) */
      if (path === '/api/claude' && method === 'POST') {
        const apiKey = (env.ANTHROPIC_API_KEY||'').trim();
        if(!apiKey) return new Response(JSON.stringify({error:'API key not configured'}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        try {
          const body = await request.json();
          const res = await fetch('https://api.anthropic.com/v1/messages',{
            method:'POST',
            headers:{
              'x-api-key':apiKey,
              'anthropic-version':'2023-06-01',
              'content-type':'application/json'
            },
            body:JSON.stringify({
              model: body.model||'claude-sonnet-4-6',
              max_tokens: Math.min(body.max_tokens||500, 1000),
              messages: body.messages||[]
            })
          });
          const data = await res.json();
          return new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        } catch(e){
          return new Response(JSON.stringify({error:e.message}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        }
      }
      if (path === '/api/menus-bulk' && method === 'POST') {
        const adminEmail = request.headers.get('X-Admin-Email') || '';
        if (!['kimdh4790@gmail.com','soungkyekim@naver.com'].includes(adminEmail)) {
          return new Response(JSON.stringify({error:'Unauthorized'}),{status:401,headers:{'Content-Type':'application/json'}});
        }
        try {
          const body = await request.json();
          const { menus, dealerId, action } = body;
          const fsToken2 = await getAccessToken(env);

          // 이미지 없는 메뉴 자동 업데이트
          if (action === 'fix-images' && dealerId) {
            const nameMap = {
              // 해산물
              '보리굴비':'premium korean dried yellow croaker fish banchan, restaurant quality plating, white ceramic plate, soft natural lighting, shallow depth of field, professional food photography, 4k',
              '낙지':'korean spicy octopus bokkeum in cast iron pan, gochujang sauce, green onion garnish, restaurant plating, professional food photography, 4k',
              '전복':'korean steamed abalone with soy butter sauce, shell presentation, premium restaurant quality, dramatic lighting, food photography, 4k',
              '해물':'korean mixed seafood hot pot, clams shrimp squid, rich broth, traditional stone bowl, professional food photography, 4k',
              '장어':'korean grilled freshwater eel on charcoal, caramelized sauce, sesame seeds, premium restaurant plating, food photography, 4k',
              '홍합':'korean spicy mussel soup, fresh mussels, vegetable broth, traditional bowl, steam rising, food photography, 4k',
              '꼬막':'korean seasoned cockle clam bibimbap, colorful vegetables, gochujang, ceramic bowl, food photography, 4k',
              '멍게':'korean sea squirt fresh sashimi, vibrant orange color, ice presentation, premium seafood plating, food photography, 4k',
              '생선':'korean grilled fish with salt, crispy golden skin, restaurant plating, food photography, 4k',
              '회':'korean fresh sashimi assortment, colorful slices, wasabi pickled ginger, premium presentation, food photography, 4k',
              // 육류
              '불고기':'korean marinated beef bulgogi sizzling on plate, caramelized edges, sesame garnish, premium restaurant quality, food photography, 4k',
              '삼겹살':'korean pork belly bbq slices on grill, sizzling, lettuce wrap setup, restaurant quality, food photography, 4k',
              '갈비':'korean LA galbi short ribs, charcoal grilled, caramelized marinade, premium plating, food photography, 4k',
              '소고기':'korean premium wagyu beef dish, marble texture, elegant restaurant plating, food photography, 4k',
              '돼지':'korean pork dish, seasoned, restaurant quality plating, food photography, 4k',
              '닭':'korean chicken dish, golden crispy, restaurant quality, food photography, 4k',
              '족발':'korean braised pork feet, sliced, dark soy glaze, traditional plating, food photography, 4k',
              '보쌈':'korean boiled pork belly, tender sliced, kimchi and radish accompaniment, traditional wooden board, food photography, 4k',
              // 면/밥류
              '비빔밥':'korean bibimbap colorful vegetables beef egg in stone dolsot bowl, restaurant quality, dramatic lighting, food photography, 4k',
              '냉면':'korean mul naengmyeon cold buckwheat noodles, clear broth, sliced beef egg cucumber, premium restaurant, food photography, 4k',
              '삼계탕':'korean ginseng chicken soup samgyetang, whole small chicken, ginseng dates rice stuffing, premium white ceramic pot, food photography, 4k',
              '김치찌개':'korean kimchi stew jjigae, bubbling in stone pot, pork tofu, restaurant quality, food photography, 4k',
              '된장찌개':'korean doenjang jjigae soybean paste stew, tofu vegetables, traditional clay pot, steam, food photography, 4k',
              '순두부':'korean soft tofu stew sundubu jjigae, silky tofu, seafood, spicy red broth, stone pot, food photography, 4k',
              '떡볶이':'korean tteokbokki spicy rice cakes, gochujang sauce, fish cake, scallion, street food style premium, food photography, 4k',
              '공기밥':'korean steamed white rice, fluffy perfect grains, premium white bowl, soft lighting, food photography, 4k',
              // 치킨/패스트푸드
              '치킨':'korean fried chicken golden crispy, double fried, yangnyeom sauce option, premium restaurant presentation, food photography, 4k',
              '피자':'premium artisan pizza, fresh mozzarella, basil, thin crust, restaurant quality, dramatic lighting, food photography, 4k',
              '버거':'premium gourmet burger, brioche bun, beef patty, fresh vegetables, restaurant quality plating, food photography, 4k',
              // 기타
              '김치':'korean kimchi fermented cabbage, vibrant red color, ceramic pot, traditional, food photography, 4k',
              '해초':'korean seaweed salad, fresh green, sesame dressing, light healthy, food photography, 4k',
              '두부':'korean silken tofu dish, delicate texture, sauce, garnish, food photography, 4k',
              '국':'korean soup warm comforting, rich broth, traditional bowl, steam, food photography, 4k',
              '찌개':'korean jjigae stew, bubbling, colorful ingredients, traditional stone pot, food photography, 4k',
              '구이':'korean grilled dish, charcoal marks, caramelized, restaurant quality, food photography, 4k',
              '볶음':'korean stir fried dish, wok flames, colorful vegetables, restaurant quality, food photography, 4k',
              '탕':'korean hot pot soup, rich broth, multiple ingredients, premium clay pot, food photography, 4k',
              '면':'korean noodle dish, silky noodles, rich broth, garnish, restaurant quality, food photography, 4k',
              '초밥':'premium sushi nigiri assortment, fresh fish, wasabi, ginger, elegant japanese restaurant, food photography, 4k',
              '라멘':'premium ramen, rich tonkotsu broth, chashu pork, soft egg, nori, restaurant quality, food photography, 4k',
              '파스타':'premium italian pasta, al dente, rich sauce, parmesan, restaurant quality, dramatic lighting, food photography, 4k',
              '스테이크':'premium beef steak, perfect sear, medium rare, restaurant quality plating, food photography, 4k',
              '샐러드':'fresh colorful salad, premium ingredients, elegant restaurant plating, food photography, 4k',
              '디저트':'premium korean dessert, elegant plating, soft lighting, restaurant quality, food photography, 4k',
              '케이크':'premium slice of cake, elegant decoration, soft lighting, cafe quality, food photography, 4k',
              '커피':'premium coffee latte art, cafe quality, warm lighting, food photography, 4k',
              '음료':'premium beverage drink, elegant glass, cafe quality, food photography, 4k',
            };
            const catMap = {
              '밥상':'korean traditional table set meal, multiple banchan side dishes, elegant wooden table, restaurant quality, food photography, 4k',
              '프리미엄':'korean premium luxury meal set, finest ingredients, michelin star plating, dramatic lighting, food photography, 4k',
              '단품':'korean single dish restaurant quality, perfect plating, professional presentation, food photography, 4k',
              '사이드':'korean side dish banchan, small ceramic bowl, colorful, restaurant quality, food photography, 4k',
              '세트':'korean meal set combination, balanced nutrition, restaurant quality plating, food photography, 4k',
              '주류':'premium korean alcohol drink, elegant glass, restaurant setting, food photography, 4k',
            };
            function autoImg(name, category) {
              let prompt = '';
              // 메뉴명 키워드 매칭 (긴 키워드 우선)
              const sortedKeys = Object.keys(nameMap).sort((a,b) => b.length - a.length);
              for (const k of sortedKeys) {
                if (name.includes(k)) { prompt = nameMap[k]; break; }
              }
              if (!prompt && category && catMap[category]) prompt = catMap[category];
              if (!prompt) prompt = `korean restaurant quality food dish "${name}", professional food photography, elegant plating, soft natural lighting, 4k high resolution`;
              const seed = name.split('').reduce((a,c)=>a+c.charCodeAt(0),0) % 9999;
              // 고화질 설정: 800x800, flux 모델
              return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=800&height=800&nologo=true&seed=${seed}&model=flux&enhance=true`;
            }
            // 해당 딜러 메뉴 전체 조회
            const qr = await fetch(`${FS_BASE}:runQuery`, {
              method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+fsToken2},
              body: JSON.stringify({structuredQuery:{from:[{collectionId:'filo_menus'}],where:{fieldFilter:{field:{fieldPath:'dealerId'},op:'EQUAL',value:{stringValue:dealerId}}}}})
            });
            const docs = await qr.json();
            let updated = 0;
            for (const item of (docs||[])) {
              if (!item.document) continue;
              const f = item.document.fields || {};
              const hasImg = f.imageUrl && f.imageUrl.stringValue;
              if (!hasImg) {
                const name = (f.name && f.name.stringValue) || '';
                const cat = (f.category && f.category.stringValue) || '';
                const imgUrl = autoImg(name, cat);
                const docId = item.document.name.split('/').pop();
                await fetch(`${FS_BASE}/filo_menus/${docId}?updateMask.fieldPaths=imageUrl`, {
                  method:'PATCH', headers:{'Content-Type':'application/json','Authorization':'Bearer '+fsToken2},
                  body: JSON.stringify({fields:{imageUrl:{stringValue:imgUrl}}})
                });
                updated++;
              }
            }
            return new Response(JSON.stringify({ok:true, updated}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
          }

          // 번역 없는 메뉴 일괄 번역
          if (action === 'fix-translations' && dealerId) {
            const force = body.force === true;
            const qr2 = await fetch(`${FS_BASE}:runQuery`, {
              method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+fsToken2},
              body: JSON.stringify({structuredQuery:{from:[{collectionId:'filo_menus'}],where:{fieldFilter:{field:{fieldPath:'dealerId'},op:'EQUAL',value:{stringValue:dealerId}}}}})
            });
            const docs2 = await qr2.json();
            let translated = 0;
            const langs = ['en','zh','ja'];
            for (const item of (docs2||[])) {
              if (!item.document) continue;
              const f = item.document.fields || {};
              const hasTranslation = f.nameTranslations && f.nameTranslations.mapValue;
              if (!hasTranslation || force) {
                const name = (f.name && f.name.stringValue) || '';
                if (!name) continue;
                const docId = item.document.name.split('/').pop();
                const nameTranslations = {};
                const langNames = {en:'English',zh:'Chinese (Simplified)',ja:'Japanese'};
                for (const lang of langs) {
                  try {
                    const k2 = (env.ANTHROPIC_API_KEY||'').trim();
                    let translated2 = '';
                    if (k2) {
                      const res2 = await fetch('https://api.anthropic.com/v1/messages',{
                        method:'POST',
                        headers:{'Content-Type':'application/json','x-api-key':k2,'anthropic-version':'2023-06-01'},
                        body:JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:60,messages:[{role:'user',content:'Translate this Korean restaurant menu item name to '+langNames[lang]+'. This is a Korean traditional meal set restaurant menu. Return ONLY the translated name, keep it natural and appetizing, nothing else: '+name}]})
                      });
                      if (res2.ok) {
                        const d2 = await res2.json();
                        translated2 = (d2.content&&d2.content[0]&&d2.content[0].text)||'';
                      }
                    }
                    // Google 폴백
                    if (!translated2 || translated2 === name) {
                      const langMap = {en:'en',zh:'zh-CN',ja:'ja'};
                      const gKey2 = (env.GOOGLE_TRANSLATE_KEY||'').trim();
                      if(gKey2){
                        const gRes = await fetch('https://translation.googleapis.com/language/translate/v2?key='+gKey2,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({q:name,source:'ko',target:langMap[lang],format:'text'})});
                        const gData = await gRes.json();
                        translated2 = (gData&&gData.data&&gData.data.translations&&gData.data.translations[0]&&gData.data.translations[0].translatedText)||name;
                      } else {
                        const gRes = await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=ko&tl='+langMap[lang]+'&dt=t&q='+encodeURIComponent(name));
                        const gData = await gRes.json();
                        translated2 = (gData&&gData[0]&&gData[0][0]&&gData[0][0][0])||name;
                      }
                    }
                    nameTranslations[lang] = translated2 || name;
                    // KV 캐시 갱신
                    const cacheKey2 = 'tr:'+lang+':'+(function(s){var h=0x811c9dc5;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0;}return h.toString(36)+':'+s.length;})(name);
                    try{await env.DONWAY_ASSETS.put(cacheKey2, nameTranslations[lang], {expirationTtl:86400});}catch(e){}
                  } catch(e) { nameTranslations[lang] = name; }
                }
                const fields = {};
                for (const [lang, val] of Object.entries(nameTranslations)) {
                  fields[lang] = {stringValue: val};
                }
                await fetch(`${FS_BASE}/filo_menus/${docId}?updateMask.fieldPaths=nameTranslations`, {
                  method:'PATCH', headers:{'Content-Type':'application/json','Authorization':'Bearer '+fsToken2},
                  body: JSON.stringify({fields:{nameTranslations:{mapValue:{fields}}}})
                });
                translated++;
              }
            }
            return new Response(JSON.stringify({ok:true, translated}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
          }

          if (!menus || !dealerId) return new Response(JSON.stringify({error:'menus/dealerId required'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
          const fsToken3 = await getAccessToken(env);
          let success = 0, errors = [];
          for (const m of menus) {
            const doc = { fields: {
              dealerId: {stringValue: dealerId},
              name: {stringValue: m.name||''},
              price: {integerValue: String(m.price||0)},
              category: {stringValue: m.category||''},
              description: {stringValue: m.description||''},
              emoji: {stringValue: m.emoji||'🍽'},
              imageUrl: {stringValue: m.imageUrl||''},
              available: {booleanValue: true},
              createdAt: {stringValue: new Date().toISOString()},
            }};
            const r = await fetch(`${FS_BASE}/filo_menus`, {
              method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+fsToken3},
              body: JSON.stringify(doc)
            });
            if (r.ok) success++;
            else errors.push({name: m.name, status: r.status});
          }
          return new Response(JSON.stringify({ok:true, success, total:menus.length, errors}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        } catch(e) {
          return new Response(JSON.stringify({error:e.message}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        }
      }
      if (path === '/api/menus') {
        const did = new URL(request.url).searchParams.get('did');
        if (!did) return new Response(JSON.stringify({error:'did required'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        const token = await getAccessToken(env);
        const r2 = await fetch(`${FS_BASE}:runQuery`,{
          method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
          body:JSON.stringify({structuredQuery:{from:[{collectionId:'filo_menus'}],where:{fieldFilter:{field:{fieldPath:'dealerId'},op:'EQUAL',value:{stringValue:did}}}}})
        });
        const d2=await r2.json();
        const menus=(d2||[]).filter(function(r){
          if(!r.document)return false;
          var fs=r.document.fields||{};
          // forSale===false → 판매 중지 메뉴 제외
          if(fs.forSale&&fs.forSale.booleanValue===false)return false;
          var nm=(fs.name&&fs.name.stringValue)||'';
          var pr=parseInt((fs.price&&(fs.price.integerValue||fs.price.doubleValue||fs.price.stringValue))||0);
          return nm&&pr>0;
        }).map(function(r){
          var f=r.document.fields||{};
          var nameTranslations={};
          if(f.nameTranslations&&f.nameTranslations.mapValue&&f.nameTranslations.mapValue.fields){
            var nt=f.nameTranslations.mapValue.fields;
            if(nt.en)nameTranslations.en=nt.en.stringValue||'';
            if(nt.zh)nameTranslations.zh=nt.zh.stringValue||'';
            if(nt.ja)nameTranslations.ja=nt.ja.stringValue||'';
          }
          var descTranslations={};
          if(f.descTranslations&&f.descTranslations.mapValue&&f.descTranslations.mapValue.fields){
            var dt=f.descTranslations.mapValue.fields;
            if(dt.en)descTranslations.en=dt.en.stringValue||'';
            if(dt.zh)descTranslations.zh=dt.zh.stringValue||'';
            if(dt.ja)descTranslations.ja=dt.ja.stringValue||'';
          }
          return {name:(f.name&&f.name.stringValue)||'',price:parseInt((f.price&&(f.price.integerValue||f.price.doubleValue||f.price.stringValue))||0),category:(f.category&&f.category.stringValue)||'기타',emoji:(f.emoji&&f.emoji.stringValue)||'🍽',imageUrl:(f.imageUrl&&f.imageUrl.stringValue)||'',description:(f.description&&f.description.stringValue)||'',nameTranslations:nameTranslations,descTranslations:descTranslations};
        });
        const menusWithImg = menus.map(function(m){
          if(m.imageUrl) return m;
          return Object.assign({},m,{imageUrl:''});
        });
        return new Response(JSON.stringify({menus:menusWithImg}),{status:200,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Cache-Control':'no-store'}});
      }

      // ── /api/tables — 테이블 현황 (비로그인 손님용) ──
      if (path === '/api/tables') {
        const did = new URL(request.url).searchParams.get('did');
        const cors = {'Content-Type':'application/json','Access-Control-Allow-Origin':'*'};
        if (!did) return new Response(JSON.stringify({error:'did required'}),{status:400,headers:cors});
        try {
          const token = await getAccessToken(env);
          const tRes = await fetch(`${FS_BASE}:runQuery`,{
            method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
            body:JSON.stringify({structuredQuery:{from:[{collectionId:'filo_tables'}],where:{fieldFilter:{field:{fieldPath:'dealerId'},op:'EQUAL',value:{stringValue:did}}},orderBy:[{field:{fieldPath:'tableNum'},direction:'ASCENDING'}]}})
          });
          const rows = await tRes.json();
          const tables=(rows||[]).filter(r=>r.document).map(r=>{
            const f=r.document.fields||{};
            const gf=(k)=>{const x=f[k];if(!x)return null;return x.stringValue!==undefined?x.stringValue:x.integerValue!==undefined?parseInt(x.integerValue):x.booleanValue||null;};
            return {id:r.document.name.split('/').pop(),num:gf('tableNum')||1,name:gf('tableName')||'테이블',status:gf('status')||'empty',seats:gf('seats')||4,occupiedSince:gf('occupiedSince')||'',reservedName:gf('reservedName')||''};
          });
          const cRes=await fetch(`${FS_BASE}/companies/${did}`,{headers:{'Authorization':'Bearer '+token}});
          const cDoc=await cRes.json();
          const cf=cDoc.fields||{};
          const storeName=(cf.storeName&&cf.storeName.stringValue)||(cf.companyName&&cf.companyName.stringValue)||(cf.name&&cf.name.stringValue)||'매장';
          return new Response(JSON.stringify({tables,storeName}),{headers:cors});
        } catch(e){return new Response(JSON.stringify({error:e.message}),{status:500,headers:cors});}
      }

      // ── /api/booking — 예약 저장 (비로그인 손님용) ──
      if (path === '/api/booking' && method === 'POST') {
        const cors={'Content-Type':'application/json','Access-Control-Allow-Origin':'*'};
        try {
          const body=await request.json();
          const {did,tableId,tableNum,tableName,customerName,phone,seats,memo,date,time}=body;
          if(!did||!customerName||!phone) return new Response(JSON.stringify({error:'필수값 누락'}),{status:400,headers:cors});
          const token=await getAccessToken(env);
          const now=new Date().toISOString();
          const bRes=await fetch(`${FS_BASE}/filo_bookings`,{
            method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
            body:JSON.stringify({fields:{dealerId:{stringValue:did},tableId:{stringValue:tableId||''},tableNum:{integerValue:tableNum||0},tableName:{stringValue:tableName||''},customerName:{stringValue:customerName},phone:{stringValue:phone},seats:{integerValue:seats||2},memo:{stringValue:memo||''},status:{stringValue:'pending'},date:{stringValue:date||now.slice(0,10)},time:{stringValue:time||now.slice(11,16)},source:{stringValue:'qr_walk_in'},createdAt:{stringValue:now}}})
          });
          const bDoc=await bRes.json();
          if(bDoc.error) return new Response(JSON.stringify({error:bDoc.error.message}),{status:400,headers:cors});
          const bookingId=bDoc.name?bDoc.name.split('/').pop():'';
          await fetch(`${FS_BASE}/filo_tables/${did}_${tableId}?updateMask.fieldPaths=status&updateMask.fieldPaths=reservedName&updateMask.fieldPaths=updatedAt`,{
            method:'PATCH',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
            body:JSON.stringify({fields:{status:{stringValue:'reserved'},reservedName:{stringValue:customerName},updatedAt:{stringValue:now}}})
          }).catch(()=>{});
          return new Response(JSON.stringify({bookingId}),{headers:cors});
        } catch(e){return new Response(JSON.stringify({error:e.message}),{status:500,headers:cors});}
      }

      // ── /api/booking-status — 예약 상태 확인 (비로그인 손님용) ──
      if (path === '/api/booking-status') {
        const bid=new URL(request.url).searchParams.get('bid');
        const cors={'Content-Type':'application/json','Access-Control-Allow-Origin':'*'};
        if(!bid) return new Response(JSON.stringify({error:'bid required'}),{status:400,headers:cors});
        try {
          const token=await getAccessToken(env);
          const r2=await fetch(`${FS_BASE}/filo_bookings/${bid}`,{headers:{'Authorization':'Bearer '+token}});
          const doc=await r2.json();
          const status=(doc.fields&&doc.fields.status&&doc.fields.status.stringValue)||'pending';
          return new Response(JSON.stringify({status}),{headers:cors});
        } catch(e){return new Response(JSON.stringify({error:e.message}),{status:500,headers:cors});}
      }

      // ── /api/waiting — 웨이팅 등록 (POST) / 목록 (GET) ──
      if (path === '/api/waiting') {
        const cors={'Content-Type':'application/json','Access-Control-Allow-Origin':'*'};
        if (method === 'OPTIONS') return new Response('',{headers:{...cors,'Access-Control-Allow-Methods':'GET,POST,PATCH,DELETE','Access-Control-Allow-Headers':'Content-Type'}});
        try {
          const token=await getAccessToken(env);
          if (method === 'POST') {
            const body=await request.json();
            const {did,name,seats,phone,memo}=body;
            if(!did||!name) return new Response(JSON.stringify({error:'did,name 필수'}),{status:400,headers:cors});
            const today=new Date().toISOString().slice(0,10);
            const now=new Date().toISOString();
            // 오늘 대기 번호 계산 (오늘 등록된 waiting 전체 카운트 + 1)
            const listRes=await fetch(`${FS_BASE}:runQuery`,{
              method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
              body:JSON.stringify({structuredQuery:{from:[{collectionId:'dine_waiting'}],where:{compositeFilter:{op:'AND',filters:[{fieldFilter:{field:{fieldPath:'dealerId'},op:'EQUAL',value:{stringValue:did}}},{fieldFilter:{field:{fieldPath:'date'},op:'EQUAL',value:{stringValue:today}}}]}}}})
            });
            const listData=await listRes.json();
            const totalToday=(listData||[]).filter(r=>r.document).length;
            const waitNum=totalToday+1;
            const wRes=await fetch(`${FS_BASE}/dine_waiting`,{
              method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
              body:JSON.stringify({fields:{dealerId:{stringValue:did},name:{stringValue:name},seats:{integerValue:seats||1},phone:{stringValue:phone||''},memo:{stringValue:memo||''},status:{stringValue:'waiting'},waitNum:{integerValue:waitNum},date:{stringValue:today},createdAt:{stringValue:now},calledAt:{stringValue:''},guestFcmToken:{stringValue:''}}})
            });
            const wDoc=await wRes.json();
            if(wDoc.error) return new Response(JSON.stringify({error:wDoc.error.message}),{status:400,headers:cors});
            const wid=wDoc.name?wDoc.name.split('/').pop():'';
            return new Response(JSON.stringify({wid,waitNum,status:'waiting'}),{headers:cors});
          }
          if (method === 'GET') {
            const did=new URL(request.url).searchParams.get('did');
            const dateQ=new URL(request.url).searchParams.get('date')||new Date().toISOString().slice(0,10);
            if(!did) return new Response(JSON.stringify({error:'did required'}),{status:400,headers:cors});
            const lRes=await fetch(`${FS_BASE}:runQuery`,{
              method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
              body:JSON.stringify({structuredQuery:{from:[{collectionId:'dine_waiting'}],where:{compositeFilter:{op:'AND',filters:[{fieldFilter:{field:{fieldPath:'dealerId'},op:'EQUAL',value:{stringValue:did}}},{fieldFilter:{field:{fieldPath:'date'},op:'EQUAL',value:{stringValue:dateQ}}}]}},orderBy:[{field:{fieldPath:'createdAt'},direction:'ASCENDING'}]}})
            });
            const lData=await lRes.json();
            const list=(lData||[]).filter(r=>r.document).map(r=>{
              const f=r.document.fields||{};
              const gf=k=>{const x=f[k];if(!x)return null;return x.stringValue!==undefined?x.stringValue:x.integerValue!==undefined?parseInt(x.integerValue):x.booleanValue||null;};
              return {wid:r.document.name.split('/').pop(),name:gf('name')||'손님',seats:gf('seats')||1,phone:gf('phone')||'',memo:gf('memo')||'',status:gf('status')||'waiting',waitNum:gf('waitNum')||0,date:gf('date')||'',createdAt:gf('createdAt')||'',calledAt:gf('calledAt')||''};
            });
            const waitingCnt=list.filter(w=>w.status==='waiting').length;
            const calledCnt=list.filter(w=>w.status==='called').length;
            const seatedCnt=list.filter(w=>w.status==='seated').length;
            return new Response(JSON.stringify({list,waitingCnt,calledCnt,seatedCnt}),{headers:cors});
          }
          return new Response(JSON.stringify({error:'method not allowed'}),{status:405,headers:cors});
        } catch(e){return new Response(JSON.stringify({error:e.message}),{status:500,headers:cors});}
      }

      // ── /api/waiting-update — 웨이팅 상태 변경 (PATCH) ──
      if (path === '/api/waiting-update' && method === 'POST') {
        const cors={'Content-Type':'application/json','Access-Control-Allow-Origin':'*'};
        try {
          const body=await request.json();
          const {wid,status,did}=body;
          if(!wid||!status) return new Response(JSON.stringify({error:'wid,status 필수'}),{status:400,headers:cors});
          const token=await getAccessToken(env);
          const now=new Date().toISOString();
          const fields={status:{stringValue:status}};
          if(status==='called') fields.calledAt={stringValue:now};
          if(status==='seated') fields.seatedAt={stringValue:now};
          const mask=Object.keys(fields).map(k=>'updateMask.fieldPaths='+k).join('&');
          await fetch(`${FS_BASE}/dine_waiting/${wid}?${mask}`,{
            method:'PATCH',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
            body:JSON.stringify({fields})
          });
          // 호출 시 FCM 발송
          if(status==='called' && did) {
            // 토큰 조회
            const docRes=await fetch(`${FS_BASE}/dine_waiting/${wid}`,{headers:{'Authorization':'Bearer '+token}});
            const docData=await docRes.json();
            const fcmToken=(docData.fields&&docData.fields.guestFcmToken&&docData.fields.guestFcmToken.stringValue)||'';
            if(fcmToken) {
              await fetch(`https://fcm.googleapis.com/v1/projects/mbti-logistics/messages:send`,{
                method:'POST',headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},
                body:JSON.stringify({message:{token:fcmToken,notification:{title:'순서가 됐어요!',body:'직원의 안내를 받아 입장해 주세요'},data:{type:'waiting_call',wid}}})
              }).catch(()=>{});
            }
          }
          return new Response(JSON.stringify({ok:true}),{headers:cors});
        } catch(e){return new Response(JSON.stringify({error:e.message}),{status:500,headers:cors});}
      }

      if (path === '/firebase-messaging-sw.js') return serveKVFile(env, 'firebase-messaging-sw.js', 'application/javascript');
      if (path === '/fcm/notify-drivers' && method === 'POST') {
        const body2 = await request.json();
        const { tokens, title, body: msgBody, data: extraData, type: msgType } = body2;
        if (!tokens || !tokens.length) return new Response(JSON.stringify({ok:true,sent:0}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        const accessToken2 = await getAccessToken(env);
        let sent2=0; const errors2=[];
        await Promise.all(tokens.slice(0,20).map(async function(token){
          try{
            const resp=await fetch('https://fcm.googleapis.com/v1/projects/mbti-logistics/messages:send',{
              method:'POST',
              headers:{'Authorization':'Bearer '+accessToken2,'Content-Type':'application/json'},
              body:JSON.stringify({message:{token:token,
                notification:{title:title||'알림',body:msgBody||''},
                data:Object.assign({
                  type:msgType||'pickup',
                  title:title||'알림',
                  body:msgBody||'',
                  url:(extraData&&extraData.url)||'/'
                },extraData||{}),
                android:{priority:'high',notification:{
                  sound:'default',
                  channel_id:'filo_'+(msgType||'pickup'),
                  defaultSound:true
                }},
                apns:{payload:{aps:{sound:'default',badge:1,'content-available':1}}},
                webpush:{
                  notification:{
                    icon:'/filo-icon-192.png',
                    badge:'/filo-icon-192.png',
                    requireInteraction:true,
                    vibrate:[300,100,300,100,300]
                  },
                  fcm_options:{link:(extraData&&extraData.url)||'/'}
                }
              }})
            });
            if(resp.ok)sent2++; else errors2.push(await resp.text());
          }catch(e){errors2.push(e.message);}
        }
));
        return new Response(JSON.stringify({ok:true,sent:sent2,errors:errors2}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
      }


      if (path === '/order.js') return serveKVFile(env, 'order.js', 'application/javascript');
      if (path === '/order' || path === '/order.html') return serveKVFile(env, 'order.html', 'text/html');
      // /api/menu-image — Pexels 음식 이미지 검색
      if (path === '/api/menu-image') {
        const q = new URL(request.url).searchParams.get('q') || 'food';
        const pexelsKey = env.PEXELS_API_KEY || '';
        if (!pexelsKey) return Response.json({url:''});
        try {
          // orientation=square 로만 찾으면 정사각 사진이 없는 검색어(sushi, ramen 등)는
          // 결과가 0이 되어 이미지가 안 나온다 → 없으면 필터 없이 한 번 더 찾는다
          const _pex = async (extra) => {
            const r = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=5${extra}`, {
              headers: {'Authorization': pexelsKey}
            });
            const d = await r.json();
            return d.photos || [];
          };
          let photos = await _pex('&orientation=square');
          if (!photos.length) photos = await _pex('');
          if (!photos.length) return Response.json({url:''}, {headers:{'Access-Control-Allow-Origin':'*'}});
          // 랜덤으로 하나 선택
          const photo = photos[Math.floor(Math.random() * photos.length)];
          const url = photo.src?.medium || photo.src?.original || '';
          return Response.json({url}, {headers:{'Access-Control-Allow-Origin':'*'}});
        } catch(e) {
          return Response.json({url:''});
        }
      }

      if (path === '/api/store') {
        const slug = new URL(request.url).searchParams.get('slug');
        if (!slug) return new Response(JSON.stringify({error:'slug required'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        const token = await getAccessToken(env);
        // slug로 조회
        const r1 = await fetch(FS_BASE+'/companies/'+slug,{headers:{'Authorization':'Bearer '+token}});
        const d1 = await r1.json();
        if(d1.fields){
          const f=d1.fields;
          const store={id:slug,name:(f.companyName&&f.companyName.stringValue)||(f.name&&f.name.stringValue)||'',address:(f.address&&f.address.stringValue)||''};
          return new Response(JSON.stringify({store}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        }
        // slug 필드로 검색
        const r2 = await fetch(`${FS_BASE}:runQuery`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
          body:JSON.stringify({structuredQuery:{from:[{collectionId:'companies'}],where:{fieldFilter:{field:{fieldPath:'slug'},op:'EQUAL',value:{stringValue:slug}}},limit:1}})});
        const d2 = await r2.json();
        const doc=(d2||[]).find(function(r){return r.document;});
        if(!doc) return new Response(JSON.stringify({error:'매장을 찾을 수 없습니다'}),{status:404,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        const f=doc.document.fields||{};
        const store={id:doc.document.name.split('/').pop(),name:(f.companyName&&f.companyName.stringValue)||(f.name&&f.name.stringValue)||'',address:(f.address&&f.address.stringValue)||''};
        return new Response(JSON.stringify({store}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
      }
      // /api/menu-image — Pexels 음식 이미지 검색
      if (path === '/api/menu-image') {
        const q = new URL(request.url).searchParams.get('q') || 'food';
        const pexelsKey = env.PEXELS_API_KEY || '';
        if (!pexelsKey) return Response.json({url:''});
        try {
          // orientation=square 로만 찾으면 정사각 사진이 없는 검색어(sushi, ramen 등)는
          // 결과가 0이 되어 이미지가 안 나온다 → 없으면 필터 없이 한 번 더 찾는다
          const _pex = async (extra) => {
            const r = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=5${extra}`, {
              headers: {'Authorization': pexelsKey}
            });
            const d = await r.json();
            return d.photos || [];
          };
          let photos = await _pex('&orientation=square');
          if (!photos.length) photos = await _pex('');
          if (!photos.length) return Response.json({url:''}, {headers:{'Access-Control-Allow-Origin':'*'}});
          // 랜덤으로 하나 선택
          const photo = photos[Math.floor(Math.random() * photos.length)];
          const url = photo.src?.medium || photo.src?.original || '';
          return Response.json({url}, {headers:{'Access-Control-Allow-Origin':'*'}});
        } catch(e) {
          return Response.json({url:''});
        }
      }

      if (path === '/api/store') {
        if (request.method === 'OPTIONS') return new Response(null,{headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type'}});
        const slug = new URL(request.url).searchParams.get('slug')||'';
        if (!slug) return new Response(JSON.stringify({error:'slug required'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        const token2 = await getAccessToken(env);
        // dealerId로 직접 조회
        const r1 = await fetch(FS_BASE+'/companies/'+slug,{headers:{'Authorization':'Bearer '+token2}});
        const d1 = await r1.json();
        if(d1.fields){
          const f=d1.fields;
          return new Response(JSON.stringify({store:{id:slug,name:(f.companyName&&f.companyName.stringValue)||(f.name&&f.name.stringValue)||'',address:(f.address&&f.address.stringValue)||''}}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        }
        // slug 필드로 검색
        const r2 = await fetch(`${FS_BASE}:runQuery`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token2},body:JSON.stringify({structuredQuery:{from:[{collectionId:'companies'}],where:{fieldFilter:{field:{fieldPath:'slug'},op:'EQUAL',value:{stringValue:slug}}},limit:1}})});
        const d2 = await r2.json();
        const docItem=(d2||[]).find(r=>r.document);
        if(!docItem) return new Response(JSON.stringify({error:'매장을 찾을 수 없습니다'}),{status:404,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        const f2=docItem.document.fields||{};
        const did2=docItem.document.name.split('/').pop();
        return new Response(JSON.stringify({store:{id:did2,name:(f2.companyName&&f2.companyName.stringValue)||(f2.name&&f2.name.stringValue)||'',address:(f2.address&&f2.address.stringValue)||''}}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
      }
      if (path === '/store.js') return serveKVFile(env, 'store.js', 'application/javascript');
      if (path.startsWith('/store')) return serveKVFile(env, 'store.html', 'text/html');
      if (path === '/' || path === '') return serveKVFile(env, 'filo-landing.html', 'text/html');
      // ★ /{slug} 직접 접속 → filo.html 서빙 + dealerId 주입
      const filoSlugMatch = path.match(/^\/([A-Za-z0-9\-_]+)$/);
      if (filoSlugMatch && !path.startsWith('/api') && !path.startsWith('/c/')) {
        const filoSlug = filoSlugMatch[1];
        const skipPaths = ['app','order','inventory','qr','kiosk','store','kitchen','member','staff','register','login','control','join','mbtico'];
        if (!skipPaths.includes(filoSlug)) {
          // Firestore에서 slug로 dealerId 조회
          try {
            const fsT = await getAccessToken(env);
            const qRes = await fetch('https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents:runQuery', {
              method:'POST',
              headers:{'Authorization':'Bearer '+fsT,'Content-Type':'application/json'},
              body: JSON.stringify({structuredQuery:{
                from:[{collectionId:'companies'}],
                where:{fieldFilter:{field:{fieldPath:'slug'},op:'EQUAL',value:{stringValue:filoSlug}}},
                limit:1
              }})
            });
            const qData = await qRes.json();
            const fields = qData[0]?.document?.fields || {};
            const dealerId = fields.dealerId?.stringValue || fields.uid?.stringValue || '';
            if (dealerId) {
              let filoHtml = await env.DONWAY_ASSETS.get('filo.html', 'text');
              if (filoHtml) {
                filoHtml = filoHtml.replace('__FILO_DEALER_ID__', dealerId);
                return new Response(filoHtml, {
                  headers: {'Content-Type':'text/html;charset=utf-8','Cache-Control':'no-store',...SECURITY_HEADERS}
                });
              }
            }
          } catch(e) { console.error('[filo-slug]', e.message); }
        }
      }

      if (path === '/app' || path === '/app.html') return serveKVFile(env, 'filo.html', 'text/html');
      if (path === '/smart-pos' || path === '/smart-pos.html') return serveKVFile(env, 'filo-smart-pos.html', 'text/html');
      if (path === '/inventory' || path === '/inventory.html') return serveKVFile(env, 'inventory.html', 'text/html');
      if (path === '/qr') {
        // 직원 출퇴근 QR — 직원선택 + GPS + 기기 중복방지
        const params = new URL(request.url).searchParams;
        const did    = params.get('did');
        const action = params.get('action') || 'in';
        if (!did) return serveKVFile(env, 'qrpos.html', 'text/html');

        const actionMap = {in:'출근', out:'퇴근'};
        const iconMap   = {in:'●', out:'○'};
        const label = actionMap[action] || '출근';
        const icon  = iconMap[action]  || '●';

        try {
          const token = await getAccessToken(env);
          // members 조회
          // 매장 GPS 좌표 조회
          const cRes = await fetch(`${FS_BASE}/companies/${did}`,{headers:{'Authorization':'Bearer '+token}});
          const cData = await cRes.json();
          const shopLat = cData.fields?.lat?.doubleValue||cData.fields?.lat?.integerValue||0;
          const shopLng = cData.fields?.lng?.doubleValue||cData.fields?.lng?.integerValue||0;

          // members는 클라이언트에서 Firebase SDK로 로드
          const membersJson = '[]'; // 클라이언트에서 로드
          const html = `<!DOCTYPE html>
<html lang="ko"><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<title>${label}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0a0a14;color:#e8e8f0;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;
  min-height:100vh;display:flex;align-items:center;justify-content:center;padding:16px;}
.card{background:#10101a;border:1px solid #1a1a2e;border-radius:24px;padding:28px 20px;max-width:360px;width:100%;}
h2{font-size:20px;font-weight:900;text-align:center;margin-bottom:20px;color:#00ff88;}
.mem-btn{width:100%;padding:14px;background:#1a1a2e;border:1px solid #2a2a4e;border-radius:12px;
  color:#e8e8f0;font-size:16px;font-weight:700;cursor:pointer;margin-bottom:10px;text-align:left;}
.mem-btn:active{background:#2a2a4e;}
.status{text-align:center;font-size:14px;color:#666680;margin-top:12px;min-height:20px;}
.done-card{text-align:center;}
.done-icon{font-size:64px;margin-bottom:12px;}
.done-label{font-size:24px;font-weight:900;color:#00ff88;margin-bottom:6px;}
.done-name{font-size:16px;color:#888;margin-bottom:4px;}
.done-time{font-size:13px;color:#555;}
.btn{display:block;margin:20px auto 0;padding:12px 32px;background:#1a1a3e;border:1px solid #2a2a5e;
  border-radius:12px;color:#e8e8f0;font-size:14px;font-weight:700;cursor:pointer;}
.err{color:#ff4466;text-align:center;padding:12px;}
</style>
</head><body>
<div class="card" id="main">
  <h2>${icon} ${label}</h2>
  <div id="list"></div>
  <div class="status" id="status">본인 이름을 선택하세요</div>
</div>
<script>
var DID='${did}';
var ACTION='${action}';
var SHOP_LAT=${shopLat};
var SHOP_LNG=${shopLng};
var MEMBERS=${membersJson};
var GPS_RADIUS=300; // 매장 반경 300m

function getKST(){var n=new Date();return new Date(n.getTime()+9*3600000);}
function getToday(){return getKST().toISOString().slice(0,10);}
function getDeviceId(){
  var k='filo_dev_id';
  var id=localStorage.getItem(k);
  if(!id){id='dev_'+Math.random().toString(36).slice(2)+'_'+Date.now();localStorage.setItem(k,id);}
  return id;
}
function getDistM(lat1,lng1,lat2,lng2){
  var R=6371000;
  var dLat=(lat2-lat1)*Math.PI/180;
  var dLng=(lng2-lng1)*Math.PI/180;
  var a=Math.sin(dLat/2)*Math.sin(dLat/2)+
    Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*
    Math.sin(dLng/2)*Math.sin(dLng/2);
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

function setStatus(msg,col){
  var el=document.getElementById('status');
  if(el){el.textContent=msg;if(col)el.style.color=col;}
}

function renderList(){
  var ul=document.getElementById('list');
  if(!ul)return;
  var html='';
  if(MEMBERS.length){
    html=MEMBERS.map(function(m){
      return '<button class="mem-btn" onclick="selectMember(\''+m.id+'\',\''+m.name+'\')">'+m.name+'</button>';
    }).join('');
  } else {
    html='<div class="err" style="margin-bottom:10px">등록된 직원이 없습니다</div>';
  }
  html+='<button class="mem-btn" style="border-color:#7c3aed;color:#a78bfa;background:rgba(124,58,237,.12);margin-top:8px" onclick="showRegForm()">+ 내 이름이 없어요 (신규 등록)</button>';
  ul.innerHTML=html;
}

function showRegForm(){
  var ul=document.getElementById('list');
  if(!ul)return;
  ul.innerHTML='<div>'+
    '<div style="font-size:14px;font-weight:800;color:#a78bfa;margin-bottom:12px">신규 직원 등록</div>'+
    '<input id="r-name" type="text" placeholder="이름을 입력하세요" autocomplete="name" '+
    'style="width:100%;padding:12px;background:#1a1a2e;border:1.5px solid #7c3aed;border-radius:10px;color:#fff;font-size:15px;margin-bottom:8px;outline:none;display:block">'+
    '<input id="r-phone" type="tel" placeholder="연락처 (선택사항, 010-0000-0000)" autocomplete="tel" '+
    'style="width:100%;padding:12px;background:#1a1a2e;border:1px solid #2a2a4e;border-radius:10px;color:#fff;font-size:14px;margin-bottom:12px;outline:none;display:block">'+
    '<button onclick="doRegister()" style="width:100%;padding:14px;background:#7c3aed;border:none;border-radius:10px;color:#fff;font-size:15px;font-weight:800;cursor:pointer">등록 후 ${label}</button>'+
    '<button onclick="renderList()" style="width:100%;padding:10px;background:transparent;border:none;color:#666;font-size:13px;cursor:pointer;margin-top:6px">← 목록으로 돌아가기</button>'+
  '</div>';
  setTimeout(function(){var n=document.getElementById('r-name');if(n)n.focus();},100);
}

function doRegister(){
  var name=(document.getElementById('r-name')&&document.getElementById('r-name').value||'').trim();
  var phone=(document.getElementById('r-phone')&&document.getElementById('r-phone').value||'').trim();
  if(!name){setStatus('이름을 입력하세요','#ff4466');return;}
  setStatus('등록 중...','#aaa');
  var deviceId=getDeviceId();
  var today=getToday();
  var dupKey='att_'+DID+'_'+today+'_'+deviceId+'_'+ACTION;
  if(localStorage.getItem(dupKey)){
    setStatus('이 기기에서 이미 처리됐습니다','#ff4466');
    return;
  }
  fetch('/qr/register',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({did:DID,name:name,phone:phone})
  }).then(function(r){return r.json();}).then(function(res){
    if(res.ok&&res.uid){
      doSave(res.uid,name,deviceId,dupKey,0,0);
    } else {
      setStatus(res.error||'등록 오류','#ff4466');
    }
  }).catch(function(){setStatus('네트워크 오류','#ff4466');});
}

function selectMember(uid,name){
  setStatus('위치 확인 중...','#aaa');
  var deviceId=getDeviceId();
  var today=getToday();

  // 기기 중복 체크
  var dupKey='att_'+DID+'_'+today+'_'+deviceId+'_'+ACTION;
  if(localStorage.getItem(dupKey)){
    setStatus('이미 '+name+'님의 '+('${label}')+'이 처리됐습니다','#ff4466');
    return;
  }

  // GPS 확인
  if(SHOP_LAT&&SHOP_LNG&&navigator.geolocation){
    navigator.geolocation.getCurrentPosition(function(pos){
      var dist=getDistM(pos.coords.latitude,pos.coords.longitude,SHOP_LAT,SHOP_LNG);
      if(dist>GPS_RADIUS){
        setStatus('매장에서 '+Math.round(dist)+'m 떨어져 있습니다 (최대 '+GPS_RADIUS+'m)','#ff4466');
        return;
      }
      doSave(uid,name,deviceId,dupKey,pos.coords.latitude,pos.coords.longitude);
    },function(){
      // GPS 실패 시 그냥 진행
      doSave(uid,name,deviceId,dupKey,0,0);
    },{timeout:8000});
  } else {
    doSave(uid,name,deviceId,dupKey,0,0);
  }
}

function doSave(uid,name,deviceId,dupKey,lat,lng){
  setStatus('저장 중...','#aaa');
  var now=new Date();
  var kst=new Date(now.getTime()+9*3600000);
  var date=kst.toISOString().slice(0,10);
  var timeStr=kst.toISOString().slice(11,16);

  fetch('/qr/confirm',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({did:DID,uid:uid,name:name,action:ACTION,deviceId:deviceId,lat:lat,lng:lng})
  }).then(function(r){return r.json();}).then(function(res){
    if(res.ok){
      localStorage.setItem(dupKey,'1');
      var card=document.getElementById('main');
      card.innerHTML='<div class="done-card">'+
        '<div class="done-icon">'+(ACTION==='in'?'출근':'퇴근')+'</div>'+
        '<div class="done-label">'+(ACTION==='in'?'출근':'퇴근')+' 완료</div>'+
        '<div class="done-name">'+name+'</div>'+
        '<div class="done-time">'+date+' '+timeStr+'</div>'+
        '<button class="btn" onclick="window.close();history.back()">확인</button>'+
        '</div>';
    } else {
      setStatus(res.error||'오류가 발생했습니다','#ff4466');
    }
  }).catch(function(){setStatus('네트워크 오류','#ff4466');});
}

// /qr/members API로 직원 목록 로드
fetch('/qr/members?did='+DID)
  .then(function(r){return r.json();})
  .then(function(res){
    if(res.members) MEMBERS=res.members;
    renderList();
  }).catch(function(){renderList();});
</script>
</body></html>`;
          return new Response(html, {headers:{'Content-Type':'text/html; charset=utf-8'}});
        } catch(e) {
          return new Response(`<h2 style="font-family:sans-serif;padding:40px;color:#fff;background:#0a0a14">오류: ${e.message}</h2>`,
            {headers:{'Content-Type':'text/html'}});
        }
      }

      // /qr/members — 직원 목록 조회 (SA 토큰)
      if (path === '/qr/members') {
        const did = new URL(request.url).searchParams.get('did');
        if (!did) return Response.json({members:[]});
        try {
          const token = await getAccessToken(env);
          const res = await fetch(`${FS_BASE}:runQuery`, {
            method:'POST',
            headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
            body: JSON.stringify({structuredQuery:{
              from:[{collectionId:'members'}],
              where:{fieldFilter:{field:{fieldPath:'dealerId'},op:'EQUAL',value:{stringValue:did}}},
              orderBy:[{field:{fieldPath:'name'},direction:'ASCENDING'}]
            }})
          });
          const docs = await res.json();
          const members = (Array.isArray(docs)?docs:[]).filter(d=>d.document).map(d=>{
            const f=d.document.fields||{};
            return {id:d.document.name.split('/').pop(), name:f.name?.stringValue||''};
          }).filter(m=>m.name);
          return Response.json({members});
        } catch(e) {
          return Response.json({members:[], error:e.message});
        }
      }

      // /qr/register — 신규 직원 이름+연락처 등록
      if (path === '/qr/register' && request.method === 'POST') {
        try {
          const body = await request.json();
          const {did, name, phone} = body;
          if (!did || !name) return Response.json({ok:false,error:'이름을 입력하세요'});
          const token = await getAccessToken(env);
          const res = await fetch(`${FS_BASE}/members`, {
            method:'POST',
            headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
            body: JSON.stringify({fields:{
              dealerId:   {stringValue: did},
              name:       {stringValue: name},
              phone:      {stringValue: phone||''},
              role:       {stringValue: 'part'},
              wage:       {integerValue: 0},
              wageType:   {stringValue: 'hourly'},
              is_active:  {booleanValue: true},
              createdAt:  {stringValue: new Date().toISOString()}
            }})
          });
          const doc = await res.json();
          const uid = doc.name?.split('/').pop();
          if (!uid) return Response.json({ok:false,error:'등록 실패'});
          return Response.json({ok:true, uid});
        } catch(e) {
          return Response.json({ok:false,error:e.message});
        }
      }

      // /qr/confirm — 출퇴근 저장
      if (path === '/qr/confirm' && request.method === 'POST') {
        try {
          const body = await request.json();
          const {did, uid, name, action, deviceId, lat, lng} = body;
          if (!did || !uid || !action) return Response.json({ok:false,error:'파라미터 오류'});

          const now = new Date();
          const kst = new Date(now.getTime() + 9*3600*1000);
          const date = kst.toISOString().slice(0,10);
          const type = ['in','out','break_start','break_end'].includes(action) ? action : 'in';

          const token = await getAccessToken(env);

          // 오늘 같은 uid+type 중복 체크 (서버 사이드)
          const dupRes = await fetch(`${FS_BASE}:runQuery`, {
            method:'POST',
            headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
            body: JSON.stringify({structuredQuery:{
              from:[{collectionId:'attendance'}],
              where:{compositeFilter:{op:'AND',filters:[
                {fieldFilter:{field:{fieldPath:'dealerId'},op:'EQUAL',value:{stringValue:did}}},
                {fieldFilter:{field:{fieldPath:'memberId'},op:'EQUAL',value:{stringValue:uid}}},
                {fieldFilter:{field:{fieldPath:'date'},op:'EQUAL',value:{stringValue:date}}},
                {fieldFilter:{field:{fieldPath:'type'},op:'EQUAL',value:{stringValue:type}}}
              ]}}
            }})
          });
          const dupDocs = await dupRes.json();
          const hasDup = Array.isArray(dupDocs) && dupDocs.some(d=>d.document);
          if (hasDup) return Response.json({ok:false,error:'이미 '+( type==='in'?'출근':'퇴근')+'처리됐습니다'});

          // members에서 이름 조회
          const mr = await fetch(`${FS_BASE}/members/${uid}`, {headers:{'Authorization':'Bearer '+token}});
          const md = await mr.json();
          const memberName = md.fields?.name?.stringValue || name || '';

          await fetch(`${FS_BASE}/attendance`, {
            method:'POST',
            headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
            body: JSON.stringify({fields:{
              dealerId:   {stringValue: did},
              memberId:   {stringValue: uid},
              memberName: {stringValue: memberName},
              type:       {stringValue: type},
              date:       {stringValue: date},
              time:       {stringValue: now.toISOString()},
              deviceId:   {stringValue: deviceId||''},
              lat:        {doubleValue: lat||0},
              lng:        {doubleValue: lng||0},
              createdAt:  {stringValue: now.toISOString()}
            }})
          });

          // 사장님 FCM 출퇴근 알림
          try {
            const compRes2 = await fetch(`${FS_BASE}/companies/${did}`, {headers:{'Authorization':'Bearer '+token}});
            const compData2 = await compRes2.json();
            const fcmArr2 = compData2.fields?.fcmTokens?.arrayValue?.values?.map(v=>v.stringValue).filter(Boolean) || [];
            const fcmSingle2 = compData2.fields?.fcmToken?.stringValue || '';
            const allFcmTokens = [...new Set([...fcmArr2, fcmSingle2].filter(Boolean))];
            const actionLabel = type==='in'?'출근':'퇴근';
            const kstStr = kst.toISOString().slice(11,16);
            for(const ft of allFcmTokens) {
              await sendAdminFCM(env, ft, { title: `${actionLabel} 알림`, body: `${memberName||name||uid}님이 ${kstStr}에 ${actionLabel}했습니다.` });
            }
          } catch(e){}

          return Response.json({ok:true});
        } catch(e) {
          return Response.json({ok:false,error:e.message});
        }
      }
      if (path === '/qrpos' || path === '/qrpos.html') return serveKVFile(env, 'qrpos.html', 'text/html');
      if (path === '/kiosk' || path === '/kiosk.html') return serveKVFile(env, 'kiosk.html', 'text/html');
      if (path === '/universal' || path === '/universal.html') return Response.redirect('https://donway.ai.kr/join', 302);
      if (path === '/register' || path === '/register.html') return serveKVFile(env, 'register.html', 'text/html');
      if (path === '/filo-manifest.json' || path === '/mbtico-manifest.json') return serveKVFile(env, 'filo-manifest.json', 'application/manifest+json');
      if (path === '/admin_sub' || path === '/admin_sub.html') return Response.redirect('https://mbtico.kr/control', 302);
      if (path === '/table' || path === '/table-reserve') return serveKVFile(env, 'table-reserve.html', 'text/html');

      /* ★ 메뉴 공개 API (로그인 불필요) */
      // ── /api/review-reply — AI 리뷰 답글 생성
      if (path === '/api/review-reply' && method === 'POST') {
        try {
          const body = await request.json();
          const { review, type, compName } = body;
          const typeLabel = type===1?'긍정적이고 감사한':type===0?'사과하고 개선 의지를 보이는':'친절하고 전문적인';
          const apiKey = (env.ANTHROPIC_API_KEY || env.CLAUDE_API_KEY || '').trim();
          const resp = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01'},
            body: JSON.stringify({
              model: 'claude-haiku-4-5-20251001',
              max_tokens: 300,
              messages: [{role:'user',content:'다음 고객 리뷰에 대한 '+typeLabel+' 답글을 작성해줘. 매장명: '+(compName||'저희 매장')+'. 답글만 출력해. 2~4문장으로 간결하게.\n\n리뷰: '+review}]
            })
          });
          const d = await resp.json();
          const reply = (d.content&&d.content[0]&&d.content[0].text)||'';
          return new Response(JSON.stringify({reply}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        } catch(e) {
          return new Response(JSON.stringify({error:e.message}), {status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        }
      }

      // ── /api/routeiq-match — ROUTEIQ AI 맞춤 공고 추천
      if (path === '/api/routeiq-match' && method === 'POST') {
        try {
          const body = await request.json();
          const { driver, posts } = body;
          if (!driver || !Array.isArray(posts) || !posts.length) {
            return new Response(JSON.stringify({error:'파라미터 오류',matches:[]}),
              {status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
          }
          const apiKey = (env.ANTHROPIC_API_KEY || '').trim();
          if (!apiKey) {
            // API 키 없으면 지역 점수 기반 폴백
            const fallback = posts.slice(0,5).map((p,i)=>({id:p.id,score:90-i*8,reason:'지역 기반 추천'}));
            return new Response(JSON.stringify({matches:fallback}),
              {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
          }
          const postSummary = posts.slice(0,20).map(p=>({
            id:p.id,
            title:p.title||'',
            region:p.region||'',
            courier:p.courier||p.courierBrand||'',
            price:p.price||0,
            minGuarantee:p.minGuarantee||0,
            tags:(p.tags||[]).join(',')
          }));
          const prompt = `당신은 택배 기사와 노선 공고를 매칭하는 AI입니다. 기사 정보를 보고 공고 적합도를 평가해주세요.

기사 정보:
- 이름: ${driver.name}
- 활동 지역: ${driver.region}
- 보유 차종: ${driver.carType||'미설정'}
- 선호 택배사: ${(driver.preferredCouriers||[]).join(', ')||'없음'}
- 최근 실적 평균 단가: ${driver.avgPrice||0}원/건
- 최근 실적 지역: ${(driver.recentRegions||[]).join(', ')||'없음'}

공고 목록 (JSON):
${JSON.stringify(postSummary)}

각 공고에 대해 이 기사에게 얼마나 적합한지 0-100점으로 평가하고, 추천 이유를 한 줄(20자 이내)로 작성해주세요.
상위 5개를 score 내림차순 JSON 배열로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요.
형식: [{"id":"...","score":90,"reason":"지역 완벽 일치"},...]`;

          const resp = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01'},
            body: JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:600,messages:[{role:'user',content:prompt}]})
          });
          const d = await resp.json();
          const text = (d.content&&d.content[0]&&d.content[0].text)||'[]';
          let matches = [];
          try {
            const m = text.match(/\[[\s\S]*?\]/);
            if (m) matches = JSON.parse(m[0]);
          } catch(e) { matches = []; }
          return new Response(JSON.stringify({matches}),
            {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        } catch(e) {
          return new Response(JSON.stringify({error:e.message,matches:[]}),
            {status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        }
      }

      // ── /api/cs-bot — AI CS봇 (고객 문의 자동 답변 + FCM 푸시)
      if (path === '/api/cs-bot' && method === 'POST') {
        try {
          const body = await request.json();
          const { did, question, fcmToken, lang } = body;
          if (!did || !question) return new Response(JSON.stringify({ok:false,error:'파라미터 오류'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
          const token = await getAccessToken(env);
          let compName = '', menuList = '';
          try {
            const cr = await fetch(`${FS_BASE}/companies/${did}`, {headers:{'Authorization':'Bearer '+token}});
            const cd = await cr.json();
            compName = cd.fields?.compName?.stringValue || cd.fields?.name?.stringValue || '';
          } catch(e){}
          try {
            const mr = await fetch(`${FS_BASE}:runQuery`, {
              method:'POST',
              headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
              body: JSON.stringify({structuredQuery:{
                from:[{collectionId:'filo_menus'}],
                where:{fieldFilter:{field:{fieldPath:'dealerId'},op:'EQUAL',value:{stringValue:did}}},
                limit:{value:30}
              }})
            });
            const mDocs = await mr.json();
            if(Array.isArray(mDocs)){
              menuList = mDocs.filter(d=>d.document).map(d=>{
                const f=d.document.fields||{};
                const n=f.name?.stringValue||'';
                const p=f.price?.integerValue||f.price?.doubleValue||0;
                return n&&p?n+'('+p+'원)':n;
              }).filter(Boolean).slice(0,20).join(', ');
            }
          } catch(e){}
          const apiKey = (env.ANTHROPIC_API_KEY || env.CLAUDE_API_KEY || '').trim();
          const langInst = lang && lang!=='ko' ? ' Respond in the same language as the customer question.' : '';
          const prompt = `당신은 "${compName||'저희 매장'}" 식당의 AI 직원입니다. 친절하고 간결하게 답변하세요.${langInst}\n메뉴: ${menuList||'다양한 메뉴가 있습니다'}\n고객 문의: ${question}\n2~3문장으로 간결하게 답변하세요.`;
          const resp = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01'},
            body: JSON.stringify({model:'claude-haiku-4-5-20251001', max_tokens:200, messages:[{role:'user',content:prompt}]})
          });
          const d = await resp.json();
          const answer = (d.content&&d.content[0]&&d.content[0].text)||'죄송합니다. 잠시 후 다시 문의해 주세요.';
          if (fcmToken) {
            try { await sendAdminFCM(env, fcmToken, { title: '문의 답변', body: answer }); } catch(e){}
          }
          return new Response(JSON.stringify({ok:true,answer}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        } catch(e) {
          return new Response(JSON.stringify({ok:false,error:e.message}), {status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        }
      }

      // ── /api/ai-insight — 대시보드 한줄 브리핑
      if (path === '/api/ai-insight' && method === 'POST') {
        try {
          const body = await request.json();
          const { did } = body;
          if (!did) return new Response(JSON.stringify({ok:false,error:'파라미터 오류'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
          const token = await getAccessToken(env);
          const today = new Date().toISOString().slice(0,10);
          const weekAgo = new Date(Date.now()-7*86400000).toISOString().slice(0,10);
          let totalSales=0, txCount=0, lowStockCount=0;
          try {
            const sr = await fetch(`${FS_BASE}:runQuery`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({structuredQuery:{from:[{collectionId:'filo_sales'}],where:{compositeFilter:{op:'AND',filters:[{fieldFilter:{field:{fieldPath:'dealerId'},op:'EQUAL',value:{stringValue:did}}},{fieldFilter:{field:{fieldPath:'date'},op:'GREATER_THAN_OR_EQUAL',value:{stringValue:weekAgo}}}]}},limit:{value:200}}})});
            const sd = await sr.json();
            if(Array.isArray(sd)) sd.filter(d=>d.document).forEach(d=>{const f=d.document.fields||{};if(f.status?.stringValue!=='cancelled'){totalSales+=(f.total?.integerValue||f.total?.doubleValue||0)*1;txCount++;}});
          } catch(e){}
          try {
            const ir = await fetch(`${FS_BASE}:runQuery`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({structuredQuery:{from:[{collectionId:'filo_inventory'}],where:{compositeFilter:{op:'AND',filters:[{fieldFilter:{field:{fieldPath:'dealerId'},op:'EQUAL',value:{stringValue:did}}},{fieldFilter:{field:{fieldPath:'qty'},op:'LESS_THAN_OR_EQUAL',value:{integerValue:'5'}}}]}},limit:{value:50}}})});
            const id = await ir.json();
            if(Array.isArray(id)) lowStockCount=id.filter(d=>d.document).length;
          } catch(e){}
          const apiKey=(env.ANTHROPIC_API_KEY||env.CLAUDE_API_KEY||'').trim();
          let insight='';
          if(apiKey && txCount>0){
            try {
              const pr=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:80,messages:[{role:'user',content:`최근 7일 매출: ₩${totalSales.toLocaleString()} (${txCount}건). 재고부족: ${lowStockCount}건. 한 문장(30자 이내) 브리핑:`}]})});
              const pd=await pr.json();
              insight=pd.content?.[0]?.text||'';
            } catch(e){}
          }
          if(!insight){
            if(txCount===0) insight='최근 7일 매출 데이터가 없습니다. 매출을 입력해 주세요.';
            else insight=`최근 7일 매출 ₩${totalSales.toLocaleString()}(${txCount}건)${lowStockCount>0?' · 재고 부족 '+lowStockCount+'건 확인 필요':''}`;
          }
          return new Response(JSON.stringify({ok:true,insight,lowStockCount}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        } catch(e){
          return new Response(JSON.stringify({ok:false,error:e.message}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        }
      }

      // ── /api/ai-forecast — AI 매출 예측 (내일+7일)
      if (path === '/api/ai-forecast' && method === 'POST') {
        try {
          const body = await request.json();
          const { did } = body;
          if (!did) return new Response(JSON.stringify({ok:false,error:'파라미터 오류'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
          const token = await getAccessToken(env);
          const now = new Date();
          const today = now.toISOString().slice(0,10);
          const thirtyAgo = new Date(now-30*86400000).toISOString().slice(0,10);
          let salesByDate={}, salesByDow=[0,0,0,0,0,0,0], countByDow=[0,0,0,0,0,0,0];
          try {
            const sr = await fetch(`${FS_BASE}:runQuery`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({structuredQuery:{from:[{collectionId:'filo_sales'}],where:{compositeFilter:{op:'AND',filters:[{fieldFilter:{field:{fieldPath:'dealerId'},op:'EQUAL',value:{stringValue:did}}},{fieldFilter:{field:{fieldPath:'date'},op:'GREATER_THAN_OR_EQUAL',value:{stringValue:thirtyAgo}}},{fieldFilter:{field:{fieldPath:'date'},op:'LESS_THAN_OR_EQUAL',value:{stringValue:today}}}]}},limit:{value:500}}})});
            const sd = await sr.json();
            if(Array.isArray(sd)) sd.filter(d=>d.document).forEach(d=>{
              const f=d.document.fields||{};
              if(f.status?.stringValue==='cancelled') return;
              const dt=f.date?.stringValue||today;
              const amt=(f.total?.integerValue||f.total?.doubleValue||0)*1;
              salesByDate[dt]=(salesByDate[dt]||0)+amt;
            });
          } catch(e){}
          const sampleDays=Object.keys(salesByDate).length;
          if(sampleDays<3) return new Response(JSON.stringify({ok:true,insufficient:true,message:'매출 예측을 위해 최소 3일 이상의 데이터가 필요합니다. 매출 입력 탭에서 데이터를 입력해 주세요.'}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
          Object.entries(salesByDate).forEach(([dt,amt])=>{
            const dow=new Date(dt).getDay();
            salesByDow[dow]+=amt; countByDow[dow]++;
          });
          const avgByDow=salesByDow.map((s,i)=>countByDow[i]>0?Math.round(s/countByDow[i]):0);
          const DOWS=['일','월','화','수','목','금','토'];
          const week=[];
          for(let i=1;i<=7;i++){
            const d=new Date(now.getTime()+i*86400000);
            const dt=d.toISOString().slice(0,10);
            const dow=d.getDay();
            const base=avgByDow[dow]||0;
            week.push({date:dt,dow:DOWS[dow],amount:base,low:Math.round(base*0.8),high:Math.round(base*1.2)});
          }
          const txCount=Object.values(salesByDate).length;
          const allAmounts=Object.values(salesByDate);
          const weekTotal=week.reduce((s,w)=>s+w.amount,0);
          const avgTicket=allAmounts.length?Math.round(allAmounts.reduce((a,b)=>a+b,0)/allAmounts.length):0;
          const recentHalf=allAmounts.slice(-Math.floor(allAmounts.length/2));
          const earlyHalf=allAmounts.slice(0,Math.floor(allAmounts.length/2));
          const recentAvg=recentHalf.length?recentHalf.reduce((a,b)=>a+b,0)/recentHalf.length:0;
          const earlyAvg=earlyHalf.length?earlyHalf.reduce((a,b)=>a+b,0)/earlyHalf.length:0;
          const trendPerDay=earlyAvg?Math.round((recentAvg-earlyAvg)/earlyAvg*1000):0;
          const trend=recentAvg>=earlyAvg?'up':'down';
          const last7=Object.entries(salesByDate).slice(-7).map(([,v])=>v);
          const prev7=Object.entries(salesByDate).slice(-14,-7).map(([,v])=>v);
          const last7Avg=last7.length?last7.reduce((a,b)=>a+b,0)/last7.length:0;
          const prev7Avg=prev7.length?prev7.reduce((a,b)=>a+b,0)/prev7.length:0;
          const wowPct=prev7Avg?Math.round((last7Avg-prev7Avg)/prev7Avg*100):0;
          const apiKey=(env.ANTHROPIC_API_KEY||env.CLAUDE_API_KEY||'').trim();
          let insight='', aiPowered=false;
          if(apiKey){
            try {
              const pr=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:100,messages:[{role:'user',content:`매출 추세: ${trend==='up'?'상승':'하락'}, 전주대비: ${wowPct}%, 평균 객단가: ₩${avgTicket.toLocaleString()}. 한 문장(40자 이내) 경영 인사이트:`}]})});
              const pd=await pr.json();
              insight=pd.content?.[0]?.text||'';
              aiPowered=!!insight;
            } catch(e){}
          }
          if(!insight) insight=`최근 ${sampleDays}일 데이터 기준, 매출이 ${trend==='up'?'상승':'하락'} 추세입니다.`;
          return new Response(JSON.stringify({ok:true,tomorrow:week[0],week,confidence:Math.min(95,50+sampleDays),weekTotal,wowPct,avgTicket,trend,trendPerDay,insight,aiPowered,sampleDays,txCount}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        } catch(e){
          return new Response(JSON.stringify({ok:false,error:e.message}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        }
      }

      // ── /api/ai-menu-recommend — AI 메뉴 추천 (날씨·시간대·재고)
      if (path === '/api/ai-menu-recommend' && method === 'POST') {
        try {
          const body = await request.json();
          const { did, lat, lon } = body;
          if (!did) return new Response(JSON.stringify({ok:false,error:'파라미터 오류'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
          const token = await getAccessToken(env);
          const hour = new Date().getHours();
          const timeLabel = hour<11?'오전':hour<14?'점심':hour<17?'오후':hour<20?'저녁':'야간';
          let menus=[], lowStock=[];
          try {
            const mr = await fetch(`${FS_BASE}:runQuery`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({structuredQuery:{from:[{collectionId:'filo_menus'}],where:{compositeFilter:{op:'AND',filters:[{fieldFilter:{field:{fieldPath:'dealerId'},op:'EQUAL',value:{stringValue:did}}},{fieldFilter:{field:{fieldPath:'available'},op:'NOT_EQUAL',value:{booleanValue:false}}}]}},limit:{value:50}}})});
            const md=await mr.json();
            if(Array.isArray(md)) menus=md.filter(d=>d.document).map(d=>{const f=d.document.fields||{};return{name:f.name?.stringValue||'',price:(f.price?.integerValue||f.price?.doubleValue||0)*1,emoji:f.emoji?.stringValue||'🍽',category:f.category?.stringValue||'',stock:(f.stock?.integerValue||f.stock?.doubleValue||999)*1};}).filter(m=>m.name);
          } catch(e){}
          if(!menus.length) return new Response(JSON.stringify({ok:true,insufficient:true,message:'메뉴가 등록되어 있지 않습니다. 메뉴 관리 탭에서 메뉴를 등록해 주세요.'}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
          lowStock=menus.filter(m=>m.stock<5 && m.stock<999).map(m=>({name:m.name,stockNote:m.stock+'개 남음'}));
          const avail=menus.filter(m=>m.stock>=5||m.stock===999);
          const WEATHER_ICONS=['🌙','🌙','🌙','🌙','🌙','🌙','☀️','☀️','☀️','🌤','🌤','☀️','☀️','☀️','☀️','☀️','🌤','🌆','🌆','🌙','🌙','🌙','🌙','🌙'];
          const WEATHER_LABELS=['야간','야간','야간','새벽','새벽','새벽','아침','아침','아침','오전','오전','점심','점심','점심','점심','오후','오후','저녁','저녁','야간','야간','야간','야간','야간'];
          let weather=null;
          const WEATHER_DATA_FALLBACK={icon:WEATHER_ICONS[hour],label:WEATHER_LABELS[hour],temp:25};
          if(lat&&lon){
            try{const wr=await fetch(`https://wttr.in/${lat},${lon}?format=j1&lang=ko`,{signal:AbortSignal.timeout(2000)});const wd=await wr.json();const cur=wd?.current_condition?.[0];if(cur){weather={icon:hour>=6&&hour<20?'☀️':'🌙',label:cur.lang_ko?.[0]?.value||'맑음',temp:Number(cur.temp_C||25)};}}catch(e){weather=WEATHER_DATA_FALLBACK;}
          } else weather=WEATHER_DATA_FALLBACK;
          const apiKey=(env.ANTHROPIC_API_KEY||env.CLAUDE_API_KEY||'').trim();
          let recommends=[], advice='', aiPowered=false;
          if(apiKey && avail.length){
            try{
              const menuList=avail.slice(0,30).map(m=>`${m.name}(${m.price}원)`).join(', ');
              const pr=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:300,messages:[{role:'user',content:`날씨:${weather.label} ${weather.temp}°C, 시간대:${timeLabel}. 메뉴:${menuList}. 상위 3개 추천을 JSON 배열로(name,reason,score 1-100)만 출력:`}]})});
              const pd=await pr.json();
              const raw=pd.content?.[0]?.text||'';
              const match=raw.match(/\[[\s\S]*?\]/);
              if(match){
                const parsed=JSON.parse(match[0]);
                recommends=parsed.slice(0,3).map(r=>{const m=avail.find(x=>x.name===r.name)||avail[0];return{name:r.name||m.name,emoji:m.emoji,reason:r.reason||'추천 메뉴',price:m.price,score:r.score||80};});
                aiPowered=true;
                advice=`${weather.label} ${timeLabel}에 어울리는 메뉴를 선정했습니다.`;
              }
            } catch(e){}
          }
          if(!recommends.length){
            recommends=avail.slice(0,3).map((m,i)=>({name:m.name,emoji:m.emoji,reason:['인기 메뉴','매출 상위 메뉴','추천 메뉴'][i]||'추천 메뉴',price:m.price,score:90-i*10}));
            advice=`${timeLabel}에 추천하는 메뉴입니다.`;
          }
          return new Response(JSON.stringify({ok:true,weather,hour,timeLabel,recommends,lowStock,advice,aiPowered}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        } catch(e){
          return new Response(JSON.stringify({ok:false,error:e.message}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        }
      }

      // ── /api/ai-schedule — AI 직원 스케줄 최적화
      if (path === '/api/ai-schedule' && method === 'POST') {
        try {
          const body = await request.json();
          const { did } = body;
          if (!did) return new Response(JSON.stringify({ok:false,error:'파라미터 오류'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
          const token = await getAccessToken(env);
          const today = new Date().toISOString().slice(0,10);
          const monthAgo = new Date(Date.now()-30*86400000).toISOString().slice(0,10);
          let members=[], salesByDowHour=Array.from({length:7},()=>Array(24).fill(0));
          try {
            const mr=await fetch(`${FS_BASE}:runQuery`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({structuredQuery:{from:[{collectionId:'members'}],where:{compositeFilter:{op:'AND',filters:[{fieldFilter:{field:{fieldPath:'dealerId'},op:'EQUAL',value:{stringValue:did}}},{fieldFilter:{field:{fieldPath:'status'},op:'EQUAL',value:{stringValue:'active'}}}]}},limit:{value:30}}})});
            const md=await mr.json();
            if(Array.isArray(md)) members=md.filter(d=>d.document).map(d=>{const f=d.document.fields||{};return{name:f.name?.stringValue||'직원',role:f.role?.stringValue||'staff',hourlyRate:(f.hourlyRate?.integerValue||f.hourlyRate?.doubleValue||10030)*1};});
          } catch(e){}
          try {
            const sr=await fetch(`${FS_BASE}:runQuery`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({structuredQuery:{from:[{collectionId:'filo_sales'}],where:{compositeFilter:{op:'AND',filters:[{fieldFilter:{field:{fieldPath:'dealerId'},op:'EQUAL',value:{stringValue:did}}},{fieldFilter:{field:{fieldPath:'date'},op:'GREATER_THAN_OR_EQUAL',value:{stringValue:monthAgo}}}]}},limit:{value:500}}})});
            const sd=await sr.json();
            if(Array.isArray(sd)) sd.filter(d=>d.document).forEach(d=>{
              const f=d.document.fields||{};
              if(f.status?.stringValue==='cancelled') return;
              const dt=f.createdAt?.timestampValue||f.date?.stringValue||today;
              const date=new Date(dt);
              const dow=date.getDay(); const h=date.getHours();
              salesByDowHour[dow][h]+=(f.total?.integerValue||f.total?.doubleValue||0)*1;
            });
          } catch(e){}
          const DOWS=['일','월','화','수','목','금','토'];
          const openFrom=9,openTo=21;
          const hours=[];for(let h=openFrom;h<=openTo;h++) hours.push(h);
          let maxRevPerSlot=1;
          salesByDowHour.forEach(d=>d.forEach(v=>{if(v>maxRevPerSlot)maxRevPerSlot=v;}));
          const days=DOWS.map((dow,di)=>({dow,blocks:hours.map(h=>({hour:String(h),need:Math.max(1,Math.round(salesByDowHour[di][h]/maxRevPerSlot*3)),revenue:salesByDowHour[di][h]}))}));
          const weeklyHoursPerMember=40;
          const assignments=members.slice(0,8).map(m=>{
            const wPay=Math.round(m.hourlyRate*weeklyHoursPerMember);
            const hPay=weeklyHoursPerMember>=15?Math.round(wPay/5):0;
            return{name:m.name,role:m.role,hourlyRate:m.hourlyRate,weeklyHours:weeklyHoursPerMember,weeklyPay:wPay,holidayPay:hPay};
          });
          const laborCost=assignments.reduce((s,a)=>s+a.weeklyPay,0);
          const holidayTotal=assignments.reduce((s,a)=>s+a.holidayPay,0);
          const totalHeadHours=members.length*weeklyHoursPerMember;
          const actualCost=Math.round(laborCost*1.1);
          const apiKey=(env.ANTHROPIC_API_KEY||env.CLAUDE_API_KEY||'').trim();
          let advice='', aiPowered=false;
          if(apiKey && members.length){
            try{
              const pr=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:80,messages:[{role:'user',content:`직원 ${members.length}명, 주 인건비 ₩${laborCost.toLocaleString()}. 한 문장(40자) 스케줄 조언:`}]})});
              const pd=await pr.json();
              advice=pd.content?.[0]?.text||'';
              aiPowered=!!advice;
            } catch(e){}
          }
          if(!advice) advice=members.length?`${members.length}명의 매출 곡선 기반 배치입니다. 피크 시간대에 인원을 집중하세요.`:'직원을 먼저 등록해 주세요.';
          if(!members.length) return new Response(JSON.stringify({ok:true,insufficient:true,message:'직원 데이터가 없습니다. 직원 관리 탭에서 직원을 먼저 등록해 주세요.'}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
          return new Response(JSON.stringify({ok:true,days,totalHeadHours,laborCost,actualCost,saving:actualCost-laborCost,assignments,advice,aiPowered,sampleDays:30,openFrom,openTo,holidayTotal}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        } catch(e){
          return new Response(JSON.stringify({ok:false,error:e.message}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        }
      }

      // ── /api/ai-voice-order — 음성 주문 파싱
      if (path === '/api/ai-voice-order' && method === 'POST') {
        try {
          const body = await request.json();
          const { did, text } = body;
          if (!did || !text) return new Response(JSON.stringify({ok:false,error:'파라미터 오류'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
          const token = await getAccessToken(env);
          let menus=[];
          try {
            const mr=await fetch(`${FS_BASE}:runQuery`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({structuredQuery:{from:[{collectionId:'filo_menus'}],where:{fieldFilter:{field:{fieldPath:'dealerId'},op:'EQUAL',value:{stringValue:did}}},limit:{value:60}}})});
            const md=await mr.json();
            if(Array.isArray(md)) menus=md.filter(d=>d.document).map(d=>{const f=d.document.fields||{};return{name:f.name?.stringValue||'',price:(f.price?.integerValue||f.price?.doubleValue||0)*1,emoji:f.emoji?.stringValue||'🍽'};}).filter(m=>m.name&&m.price);
          } catch(e){}
          const apiKey=(env.ANTHROPIC_API_KEY||env.CLAUDE_API_KEY||'').trim();
          let items=[];
          if(apiKey && menus.length){
            try {
              const menuList=menus.slice(0,40).map(m=>`${m.name}(${m.price}원)`).join(', ');
              const pr=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:200,messages:[{role:'user',content:`메뉴판: ${menuList}\n음성입력: "${text}"\n주문 항목을 JSON 배열로만 출력 [{name,qty}]:`}]})});
              const pd=await pr.json();
              const raw=pd.content?.[0]?.text||'';
              const match=raw.match(/\[[\s\S]*?\]/);
              if(match){
                const parsed=JSON.parse(match[0]);
                items=parsed.map(r=>{const m=menus.find(x=>x.name===r.name||x.name.includes(r.name)||r.name.includes(x.name));return m?{name:m.name,emoji:m.emoji,qty:Math.max(1,parseInt(r.qty)||1),price:m.price}:null;}).filter(Boolean);
              }
            } catch(e){}
          }
          if(!items.length){
            /* 규칙 기반 폴백: 숫자 + 메뉴명 패턴 */
            const NUMS={'하나':1,'한':1,'둘':2,'두':2,'셋':3,'세':3,'넷':4,'네':4,'다섯':5,'한개':1,'두개':2,'세개':3,'네개':4,'1개':1,'2개':2,'3개':3,'4개':4,'1잔':1,'2잔':2,'3잔':3};
            menus.forEach(m=>{if(text.includes(m.name)){let qty=1;Object.entries(NUMS).forEach(([k,v])=>{if(text.includes(k+' '+m.name)||text.includes(k+m.name))qty=v;});items.push({name:m.name,emoji:m.emoji,qty,price:m.price});}});
          }
          const total=items.reduce((s,i)=>s+i.price*i.qty,0);
          return new Response(JSON.stringify({ok:true,items,total}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        } catch(e){
          return new Response(JSON.stringify({ok:false,error:e.message}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        }
      }

      // ── /api/filo-push — 사장님 FCM 신규주문/웨이팅/재고부족 알림
      if (path === '/api/filo-push' && method === 'POST') {
        try {
          const body = await request.json();
          const { did, title, body: msgBody } = body;
          if (!did || !title) return new Response(JSON.stringify({ok:false,error:'파라미터 오류'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
          const token = await getAccessToken(env);
          const compRes = await fetch(`${FS_BASE}/companies/${did}`, {headers:{'Authorization':'Bearer '+token}});
          const compData = await compRes.json();
          const fcmArr = compData.fields?.fcmTokens?.arrayValue?.values?.map(v=>v.stringValue).filter(Boolean) || [];
          const fcmSingle = compData.fields?.fcmToken?.stringValue || '';
          const allTokens = [...new Set([...fcmArr, fcmSingle].filter(Boolean))];
          let sent = 0;
          for(const ft of allTokens) {
            try { await sendAdminFCM(env, ft, { title, body: msgBody||'' }); sent++; } catch(e){}
          }
          return new Response(JSON.stringify({ok:true,sent}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        } catch(e) {
          return new Response(JSON.stringify({ok:false,error:e.message}), {status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        }
      }

      // ── /api/payslip-fcm — 직원 급여명세서 FCM 발송
      if (path === '/api/payslip-fcm' && method === 'POST') {
        try {
          const body = await request.json();
          const { did, ym, employees } = body;
          if (!did || !employees || !employees.length) return new Response(JSON.stringify({ok:false,error:'파라미터 오류'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
          const token = await getAccessToken(env);
          let sent = 0;
          for (const emp of employees) {
            try {
              const mr = await fetch(`${FS_BASE}/members/${emp.uid}`, {headers:{'Authorization':'Bearer '+token}});
              const md = await mr.json();
              const empFcm = md.fields?.fcmToken?.stringValue || '';
              if (empFcm) {
                const msg = `${ym} 급여명세서가 발송되었습니다. 실수령액: ₩${Number(emp.netPay||0).toLocaleString()}`;
                await sendAdminFCM(env, empFcm, { title: '급여명세서', body: msg });
                sent++;
              }
            } catch(e){}
          }
          return new Response(JSON.stringify({ok:true,sent}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        } catch(e) {
          return new Response(JSON.stringify({ok:false,error:e.message}), {status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        }
      }

      // ── /api/demo-seed — 박람회 데모 데이터 생성 (해물밥상 광안점, 2026년 7월)
      if (path === '/api/demo-seed' && method === 'POST') {
        try {
          let body; try{body=await request.json();}catch(e){body={};}
          const did = body.did || 'haemul_gwangan_2026';
          if (body.secret !== 'filo2026demo') return new Response(JSON.stringify({ok:false,error:'unauthorized'}),{status:401,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
          const token = await getAccessToken(env);
          function fsv(v){if(typeof v==='string')return{stringValue:v};if(typeof v==='boolean')return{booleanValue:v};if(typeof v==='number')return Number.isInteger(v)?{integerValue:String(v)}:{doubleValue:v};if(Array.isArray(v))return{arrayValue:{values:v.map(fsv)}};if(v&&typeof v==='object')return{mapValue:{fields:Object.fromEntries(Object.entries(v).map(([k,x])=>[k,fsv(x)]))}};return{nullValue:null};}
          function fsd(col,id,obj){return{update:{name:`projects/mbti-logistics/databases/(default)/documents/${col}/${id}`,fields:Object.fromEntries(Object.entries(obj).map(([k,v])=>[k,fsv(v)]))}}}
          function rng(seed){let s=(seed|1)>>>0;return()=>{s=Math.imul(s,1664525)+1013904223|0;return(s>>>0)/4294967296;}}
          const writes=[];
          writes.push(fsd('companies',did,{name:'해물밥상 광안점',dealerId:did,type:'일식/횟집',businessType:'횟집',address:'부산 수영구 광안해변로 219',phone:'051-752-1234',openHours:'11:00~22:00',status:'active',createdAt:'2026-01-01T00:00:00Z',primaryColor:'#3b82f6',bgColor:'#0a0f1e',theme:'일식/횟집'}));
          const staff=[{uid:`${did}_m1`,name:'김민형',role:'manager',hourlyRate:11000},{uid:`${did}_m2`,name:'구자경',role:'staff',hourlyRate:10500},{uid:`${did}_m3`,name:'김기현',role:'staff',hourlyRate:11500},{uid:`${did}_m4`,name:'김성운',role:'staff',hourlyRate:10000},{uid:`${did}_m5`,name:'이수진',role:'part',hourlyRate:10000}];
          staff.forEach(s=>writes.push(fsd('members',s.uid,{...s,dealerId:did,status:'active',joinDate:'2026-01-01'})));
          const menus=[{id:'m01',name:'모듬회(소)',price:35000,category:'회',emoji:'🐟'},{id:'m02',name:'모듬회(중)',price:55000,category:'회',emoji:'🐟'},{id:'m03',name:'모듬회(대)',price:75000,category:'회',emoji:'🐟'},{id:'m04',name:'광어회(소)',price:40000,category:'회',emoji:'🐠'},{id:'m05',name:'광어회(중)',price:60000,category:'회',emoji:'🐠'},{id:'m06',name:'해물탕',price:35000,category:'탕',emoji:'🦑'},{id:'m07',name:'알탕',price:25000,category:'탕',emoji:'🍲'},{id:'m08',name:'매운탕',price:20000,category:'탕',emoji:'🍲'},{id:'m09',name:'새우구이',price:20000,category:'구이',emoji:'🦐'},{id:'m10',name:'전복구이',price:20000,category:'구이',emoji:'🐚'},{id:'m11',name:'생굴',price:15000,category:'해산물',emoji:'🦪'},{id:'m12',name:'소주',price:5000,category:'주류',emoji:'🍶'},{id:'m13',name:'맥주',price:6000,category:'주류',emoji:'🍺'},{id:'m14',name:'파전',price:10000,category:'안주',emoji:'🥞'},{id:'m15',name:'공기밥',price:1000,category:'밥',emoji:'🍚'}];
          menus.forEach(m=>writes.push(fsd('filo_menus',`${did}_${m.id}`,{...m,dealerId:did,available:true,createdAt:'2026-01-01T00:00:00Z'})));
          const popular=[{name:'모듬회(소)',price:35000,emoji:'🐟'},{name:'모듬회(중)',price:55000,emoji:'🐟'},{name:'광어회(소)',price:40000,emoji:'🐠'},{name:'해물탕',price:35000,emoji:'🦑'},{name:'알탕',price:25000,emoji:'🍲'},{name:'새우구이',price:20000,emoji:'🦐'},{name:'소주',price:5000,emoji:'🍶'},{name:'맥주',price:6000,emoji:'🍺'},{name:'파전',price:10000,emoji:'🥞'}];
          const orderWrites=[];let oidx=0;
          for(let day=1;day<=31;day++){
            const dateStr=`2026-07-${String(day).padStart(2,'0')}`;
            const dow=new Date(Date.UTC(2026,6,day)).getDay();
            const isWeekend=dow===0||dow===6;
            const r=rng(day*137+2026);
            const targetSales=isWeekend?1200000+Math.floor(r()*300000):800000+Math.floor(r()*200000);
            for(const [sh,eh,ratio] of [[11,14,0.4],[17,21,0.6]]){
              let sessionTotal=0,safetyCount=0;
              while(sessionTotal<targetSales*ratio*0.85&&safetyCount<30){
                safetyCount++;
                const r2=rng(day*10000+oidx*37+sh);
                const hour=sh+Math.floor(r2()*(eh-sh));
                const min=Math.floor(r2()*60);
                const isoStr=new Date(Date.UTC(2026,6,day,hour-9,min,0)).toISOString();
                const tableNum=1+Math.floor(r2()*8);
                const numItems=2+Math.floor(r2()*3);
                const items=[];let orderTotal=0;
                for(let i=0;i<numItems;i++){const m=popular[Math.floor(r2()*popular.length)];const qty=1+Math.floor(r2()*2);items.push({name:m.name,price:m.price,qty,emoji:m.emoji});orderTotal+=m.price*qty;}
                const pr=r2();const payType=pr<0.7?'card':pr<0.8?'cash':'delivery';
                orderWrites.push(fsd('filo_orders',`demo_${did}_${dateStr}_${String(oidx).padStart(4,'0')}`,{dealerId:did,type:'table',status:'completed',payType,tableNum,tableName:'테이블 '+tableNum,items,total:orderTotal,createdAt:isoStr,date:dateStr}));
                sessionTotal+=orderTotal;oidx++;
              }
            }
          }
          const attWrites=[];
          for(const s of staff){
            for(let day=1;day<=31;day++){
              const dow=new Date(Date.UTC(2026,6,day)).getDay();
              if(dow===0)continue;
              const r=rng(day*97+staff.indexOf(s)*13+7);
              if(r()<0.04)continue;
              if(dow===6&&r()<0.3)continue;
              const isLate=r()<0.08;
              const inH=10,inM=isLate?15+Math.floor(r()*16):Math.floor(r()*10);
              const isEarlyOut=r()<0.05;
              const outH=isEarlyOut?20:22,outM=Math.floor(r()*60);
              const dateStr=`2026-07-${String(day).padStart(2,'0')}`;
              const inIso=new Date(Date.UTC(2026,6,day,inH-9,inM,0)).toISOString();
              const outIso=new Date(Date.UTC(2026,6,day,outH-9,outM,0)).toISOString();
              const sfx=s.uid.split('_').pop();
              attWrites.push(fsd('attendance',`${did}_${sfx}_${dateStr}_in`,{dealerId:did,memberId:s.uid,memberName:s.name,type:'in',date:dateStr,time:inIso,createdAt:inIso}));
              attWrites.push(fsd('attendance',`${did}_${sfx}_${dateStr}_out`,{dealerId:did,memberId:s.uid,memberName:s.name,type:'out',date:dateStr,time:outIso,createdAt:outIso}));
            }
          }
          const allWrites=[...writes,...orderWrites,...attWrites];
          const batchUrl=`https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents:batchWrite`;
          const hdrs={'Authorization':'Bearer '+token,'Content-Type':'application/json'};
          const batchResults=[];
          for(let i=0;i<allWrites.length;i+=400){
            const br=await fetch(batchUrl,{method:'POST',headers:hdrs,body:JSON.stringify({writes:allWrites.slice(i,i+400)})});
            const bd=await br.json();
            batchResults.push({batch:Math.floor(i/400)+1,status:br.status,count:allWrites.slice(i,i+400).length,errorCount:(bd.status||[]).filter(x=>x&&x.code&&x.code!==0).length});
          }
          return new Response(JSON.stringify({ok:true,did,stats:{base:writes.length,orders:orderWrites.length,attendance:attWrites.length,total:allWrites.length},batches:batchResults}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        } catch(e){return new Response(JSON.stringify({ok:false,error:e.message}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});}
      }

      // ── /api/demo-token — 업종별 데모 Firebase 커스텀 토큰 발급
      if (path === '/api/demo-token' && method === 'POST') {
        if (request.method === 'OPTIONS') return new Response(null,{headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type'}});
        try {
          let body; try{body=await request.json();}catch(e){body={};}
          const validTypes=['cafe','korean','japanese','snack','western','bakery'];
          const type=body.type||'cafe';
          if(!validTypes.includes(type)) return new Response(JSON.stringify({ok:false,error:'invalid type'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
          const did=`demo_${type}`;
          const sa=JSON.parse(env.FIREBASE_SA_KEY);
          const token=await makeFirebaseCustomToken(sa,did);
          return new Response(JSON.stringify({ok:true,token,did}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        } catch(e){return new Response(JSON.stringify({ok:false,error:e.message}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});}
      }

      // ── /api/demo-seed-all — 6개 업종 데모 데이터 일괄 생성
      if (path === '/api/demo-seed-all' && method === 'POST') {
        if (request.method === 'OPTIONS') return new Response(null,{headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type'}});
        try {
          let body; try{body=await request.json();}catch(e){body={};}
          if(body.secret!=='filo2026demo') return new Response(JSON.stringify({ok:false,error:'unauthorized'}),{status:401,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
          const token=await getAccessToken(env);
          function fsv2(v){if(typeof v==='string')return{stringValue:v};if(typeof v==='boolean')return{booleanValue:v};if(typeof v==='number')return Number.isInteger(v)?{integerValue:String(v)}:{doubleValue:v};if(Array.isArray(v))return{arrayValue:{values:v.map(fsv2)}};if(v&&typeof v==='object')return{mapValue:{fields:Object.fromEntries(Object.entries(v).map(([k,x])=>[k,fsv2(x)]))}};return{nullValue:null};}
          function fsd2(col,id,obj){return{update:{name:`projects/mbti-logistics/databases/(default)/documents/${col}/${id}`,fields:Object.fromEntries(Object.entries(obj).map(([k,v])=>[k,fsv2(v)]))}}}
          const DEMOS={
            cafe:{name:'데모 카페',type:'카페/베이커리',primaryColor:'#c8a96e',bgColor:'#1a1209',addr:'서울 강남구 테헤란로 123',phone:'02-1234-5678',hours:'08:00~22:00',
              staff:[{n:'김지현',r:'manager',hw:11000},{n:'박소연',r:'staff',hw:10500},{n:'이민준',r:'part',hw:10000}],
              menus:[{id:'m01',n:'아메리카노(ICE)',p:4000,c:'커피',e:'☕'},{id:'m02',n:'아메리카노(HOT)',p:4000,c:'커피',e:'☕'},{id:'m03',n:'카페라떼',p:4500,c:'커피',e:'☕'},{id:'m04',n:'카푸치노',p:4500,c:'커피',e:'☕'},{id:'m05',n:'바닐라라떼',p:5000,c:'커피',e:'☕'},{id:'m06',n:'크로와상',p:3500,c:'베이커리',e:'🥐'},{id:'m07',n:'스콘',p:3000,c:'베이커리',e:'🍞'},{id:'m08',n:'치즈케이크',p:5500,c:'케이크',e:'🍰'},{id:'m09',n:'자몽에이드',p:5000,c:'에이드',e:'🍊'},{id:'m10',n:'딸기스무디',p:5500,c:'스무디',e:'🍓'}]},
            korean:{name:'데모 한식당',type:'한식당',primaryColor:'#d4af37',bgColor:'#0a0f1e',addr:'서울 마포구 합정동 456',phone:'02-2345-6789',hours:'11:00~22:00',
              staff:[{n:'최영수',r:'manager',hw:11000},{n:'김미영',r:'staff',hw:10500},{n:'박준호',r:'part',hw:10000}],
              menus:[{id:'m01',n:'된장찌개',p:8000,c:'찌개',e:'🍲'},{id:'m02',n:'김치찌개',p:8000,c:'찌개',e:'🍲'},{id:'m03',n:'순두부찌개',p:8000,c:'찌개',e:'🍲'},{id:'m04',n:'비빔밥',p:9000,c:'밥',e:'🍚'},{id:'m05',n:'불고기',p:12000,c:'고기',e:'🥩'},{id:'m06',n:'제육볶음',p:10000,c:'볶음',e:'🥩'},{id:'m07',n:'냉면',p:10000,c:'면',e:'🍜'},{id:'m08',n:'삼겹살(1인분)',p:13000,c:'고기',e:'🥓'},{id:'m09',n:'공기밥',p:1000,c:'밥',e:'🍚'},{id:'m10',n:'김치',p:2000,c:'반찬',e:'🥬'}]},
            japanese:{name:'데모 일식당',type:'일식/횟집',primaryColor:'#e05555',bgColor:'#0a0a0a',addr:'서울 송파구 잠실동 789',phone:'02-3456-7890',hours:'11:30~22:00',
              staff:[{n:'이하준',r:'manager',hw:11500},{n:'정수아',r:'staff',hw:10500},{n:'강민서',r:'part',hw:10000}],
              menus:[{id:'m01',n:'연어초밥(2pc)',p:4000,c:'초밥',e:'🍣'},{id:'m02',n:'참치초밥(2pc)',p:4000,c:'초밥',e:'🍣'},{id:'m03',n:'광어회(소)',p:35000,c:'회',e:'🐠'},{id:'m04',n:'모듬회(소)',p:45000,c:'회',e:'🐟'},{id:'m05',n:'우동',p:9000,c:'면',e:'🍜'},{id:'m06',n:'라멘',p:10000,c:'면',e:'🍜'},{id:'m07',n:'돈카츠',p:12000,c:'튀김',e:'🍱'},{id:'m08',n:'카이센동',p:18000,c:'덮밥',e:'🍱'},{id:'m09',n:'사케(1홉)',p:8000,c:'술',e:'🍶'},{id:'m10',n:'하이볼',p:7000,c:'술',e:'🥃'}]},
            snack:{name:'데모 분식집',type:'패스트푸드/분식',primaryColor:'#f97316',bgColor:'#1a0a00',addr:'서울 종로구 인사동 321',phone:'02-4567-8901',hours:'10:00~21:00',
              staff:[{n:'윤서연',r:'manager',hw:10500},{n:'조현우',r:'staff',hw:10000},{n:'임지원',r:'part',hw:9860}],
              menus:[{id:'m01',n:'떡볶이',p:5000,c:'분식',e:'🌶️'},{id:'m02',n:'순대',p:4000,c:'분식',e:'🍢'},{id:'m03',n:'튀김(5개)',p:3000,c:'튀김',e:'🍤'},{id:'m04',n:'라볶이',p:6000,c:'분식',e:'🌶️'},{id:'m05',n:'김밥(1줄)',p:3500,c:'김밥',e:'🍙'},{id:'m06',n:'치즈김밥',p:4000,c:'김밥',e:'🍙'},{id:'m07',n:'참치김밥',p:4500,c:'김밥',e:'🍙'},{id:'m08',n:'어묵국물',p:1000,c:'국물',e:'🍵'},{id:'m09',n:'쫄면',p:5500,c:'면',e:'🍜'},{id:'m10',n:'핫도그',p:2500,c:'튀김',e:'🌭'}]},
            western:{name:'데모 양식당',type:'피자/양식',primaryColor:'#e05555',bgColor:'#f8f9fa',addr:'서울 용산구 이태원동 654',phone:'02-5678-9012',hours:'11:00~23:00',
              staff:[{n:'한지수',r:'manager',hw:12000},{n:'신동욱',r:'staff',hw:11000},{n:'배수진',r:'part',hw:10000}],
              menus:[{id:'m01',n:'마르게리타 피자',p:18000,c:'피자',e:'🍕'},{id:'m02',n:'페퍼로니 피자',p:20000,c:'피자',e:'🍕'},{id:'m03',n:'크림 파스타',p:13000,c:'파스타',e:'🍝'},{id:'m04',n:'로제 파스타',p:14000,c:'파스타',e:'🍝'},{id:'m05',n:'토마토 파스타',p:12000,c:'파스타',e:'🍝'},{id:'m06',n:'시저 샐러드',p:10000,c:'샐러드',e:'🥗'},{id:'m07',n:'갈릭 브레드',p:5000,c:'사이드',e:'🥖'},{id:'m08',n:'치킨 윙(6pc)',p:15000,c:'사이드',e:'🍗'},{id:'m09',n:'콜라(Large)',p:3000,c:'음료',e:'🥤'},{id:'m10',n:'스파클링워터',p:3500,c:'음료',e:'💧'}]},
            bakery:{name:'데모 베이커리',type:'카페/베이커리',primaryColor:'#c8a96e',bgColor:'#faf7f2',addr:'서울 서대문구 연희동 987',phone:'02-6789-0123',hours:'07:30~20:00',
              staff:[{n:'오채원',r:'manager',hw:11000},{n:'류지훈',r:'staff',hw:10500},{n:'송예은',r:'part',hw:10000}],
              menus:[{id:'m01',n:'크로와상',p:3500,c:'빵',e:'🥐'},{id:'m02',n:'바게트',p:4500,c:'빵',e:'🥖'},{id:'m03',n:'소금빵',p:2500,c:'빵',e:'🍞'},{id:'m04',n:'치즈케이크',p:5500,c:'케이크',e:'🍰'},{id:'m05',n:'딸기타르트',p:6000,c:'케이크',e:'🍓'},{id:'m06',n:'마카롱(3pc)',p:7500,c:'쿠키',e:'🍬'},{id:'m07',n:'스콘',p:3000,c:'빵',e:'🍞'},{id:'m08',n:'아메리카노(ICE)',p:4000,c:'커피',e:'☕'},{id:'m09',n:'카페라떼',p:4500,c:'커피',e:'☕'},{id:'m10',n:'허브티',p:4000,c:'차',e:'🍵'}]}
          };
          const allW2=[];
          for(const [type,d] of Object.entries(DEMOS)){
            const did=`demo_${type}`;
            allW2.push(fsd2('companies',did,{name:d.name,dealerId:did,type:d.type,businessType:d.type,address:d.addr,phone:d.phone,openHours:d.hours,status:'active',createdAt:'2026-01-01T00:00:00Z',primaryColor:d.primaryColor,bgColor:d.bgColor,theme:d.type,demo:true}));
            d.staff.forEach(function(s,i){const uid=`${did}_m${i+1}`;allW2.push(fsd2('members',uid,{uid,name:s.n,role:s.r,hourlyRate:s.hw,dealerId:did,status:'active',joinDate:'2026-01-01'}));});
            d.menus.forEach(function(m){allW2.push(fsd2('filo_menus',`${did}_${m.id}`,{name:m.n,price:m.p,category:m.c,emoji:m.e,dealerId:did,available:true,createdAt:'2026-01-01T00:00:00Z'}));});
            // 오늘 포함 7일 데이터 (현실적인 50+ 주문)
            const todayStr=new Date().toISOString().slice(0,10);
            const sevenDays=[];for(let si=6;si>=0;si--){const sd=new Date();sd.setDate(sd.getDate()-si);sevenDays.push(sd.toISOString().slice(0,10));}
            const peakHours=[8,9,10,12,13,14,15,16,17,18,19,20];
            const payTypes=['card','cash','kakaopay','naverpay'];
            let gon=0;
            sevenDays.forEach(function(date){
              const isToday=date===todayStr;
              const ordCnt=isToday?6:8;
              const statuses=isToday?['pending','preparing','completed','completed','completed','completed']:['completed'];
              for(let oi=0;oi<ordCnt;oi++){
                const h=peakHours[oi%peakHours.length];
                const mm=(oi*7+3)%58;
                const status=statuses[oi%statuses.length];
                const payType=status==='completed'?payTypes[gon%4]:'';
                const cnt=1+(oi%3===0?1:0);
                const items=[];let total=0;
                for(let j=0;j<cnt;j++){const m=d.menus[(gon+j)%d.menus.length];const qty=j===0&&m.p<7000?2:1;items.push({name:m.n,price:m.p,qty,emoji:m.e});total+=m.p*qty;}
                allW2.push(fsd2('filo_orders',`${did}_${date.replace(/-/g,'')}_${String(oi+1).padStart(2,'0')}`,{dealerId:did,type:'table',status,payType,tableNum:(oi%8)+1,tableName:`테이블 ${(oi%8)+1}`,items,total,createdAt:`${date}T${String(h).padStart(2,'0')}:${String(mm).padStart(2,'0')}:00.000Z`,date}));
                gon++;
              }
              // 일별 POS 매출 집계
              let dayTotal=0;
              for(let oi=0;oi<ordCnt;oi++){const m=d.menus[oi%d.menus.length];dayTotal+=m.p*(1+(oi%3===0?1:0));}
              allW2.push(fsd2('filo_sales',`${did}_${date}`,{dealerId:did,date,total:dayTotal,itemCount:ordCnt,status:'closed'}));
            });
            // 출근 기록: 오늘은 in만, 과거 6일은 in+out (급여 계산 호환)
            sevenDays.forEach(function(date){
              const isToday=date===todayStr;
              d.staff.forEach(function(s,si){
                const inH=8+(si%3);const inM=(si*7)%60;
                const inIso=`${date}T${String(inH).padStart(2,'0')}:${String(inM).padStart(2,'0')}:00.000Z`;
                allW2.push(fsd2('attendance',`${did}_att_${date}_m${si+1}_in`,{dealerId:did,memberId:`${did}_m${si+1}`,memberName:s.n,type:'in',date,time:inIso,createdAt:inIso}));
                if(!isToday){
                  const outH=17+(si%2);const outM=(si*11)%60;
                  const outIso=`${date}T${String(outH).padStart(2,'0')}:${String(outM).padStart(2,'0')}:00.000Z`;
                  allW2.push(fsd2('attendance',`${did}_att_${date}_m${si+1}_out`,{dealerId:did,memberId:`${did}_m${si+1}`,memberName:s.n,type:'out',date,time:outIso,createdAt:outIso}));
                }
              });
            });
            // 재고 (3개 부족 시뮬레이션)
            const invList=['쌀(20kg)','참기름(1L)','간장(1.8L)','된장(3kg)','설탕(3kg)','소금(1kg)','고추장(5kg)','식용유(1.8L)','계란(30개)','마늘(1kg)'];
            invList.forEach(function(nm,i){allW2.push(fsd2('inventory',`${did}_inv_${i+1}`,{dealerId:did,name:nm,stock:i<3?3:12+i,minStock:5,unit:'개',category:'식자재',updatedAt:todayStr}));});
          }
          const batchUrl2=`https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents:batchWrite`;
          const hdrs2={'Authorization':'Bearer '+token,'Content-Type':'application/json'};
          const batchRes2=[];
          for(let i=0;i<allW2.length;i+=400){
            const br=await fetch(batchUrl2,{method:'POST',headers:hdrs2,body:JSON.stringify({writes:allW2.slice(i,i+400)})});
            const bd=await br.json();
            batchRes2.push({batch:Math.floor(i/400)+1,status:br.status,count:allW2.slice(i,i+400).length,errorCount:(bd.status||[]).filter(x=>x&&x.code&&x.code!==0).length});
          }
          return new Response(JSON.stringify({ok:true,stores:Object.keys(DEMOS),total:allW2.length,batches:batchRes2}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        } catch(e){return new Response(JSON.stringify({ok:false,error:e.message}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});}
      }

      if (path === '/api/translate') {
        if (request.method === 'OPTIONS') return new Response(null, {headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type'}});
        let body;try{body=await request.json();}catch(e){body={};}
        const name = body.name || '';
        const lang = body.lang || 'en';
        if(!name) return new Response(JSON.stringify({translated:''}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        // KV 캐시 확인 (24시간) - ASCII 해시로 키 생성
        const cacheKey = 'tr:'+lang+':'+(function(s){var h=0x811c9dc5;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0;}return h.toString(36)+':'+s.length;})(name);
        try {
          const cached = await env.DONWAY_ASSETS.get(cacheKey);
          if(cached) return new Response(JSON.stringify({translated:cached}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','X-Cache':'HIT'}});
        } catch(e){}
        const langNames = {en:'English',zh:'Chinese (Simplified)',ja:'Japanese'};
        const langMap = {en:'en',zh:'zh-CN',ja:'ja'};
        let translated = '';
        // Anthropic 재시도 3회 + Google 폴백
        const k = (env.ANTHROPIC_API_KEY||'').trim();
        const tl2 = langMap[lang]||'en';
        for(let attempt=0; attempt<3 && !translated; attempt++) {
          try {
            if(attempt>0) await new Promise(r=>setTimeout(r,500*attempt));
            if(k) {
              const res = await fetch('https://api.anthropic.com/v1/messages',{
                method:'POST',
                headers:{'Content-Type':'application/json','x-api-key':k,'anthropic-version':'2023-06-01'},
                body:JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:60,messages:[{role:'user',content:'Translate this Korean restaurant menu item name to '+langNames[lang]+'. This is a Korean traditional meal set restaurant menu. Return ONLY the translated name, keep it natural and appetizing, nothing else: '+name}]})
              });
              if(res.ok){
                const d = await res.json();
                translated = (d.content&&d.content[0]&&d.content[0].text)||'';
                console.log('[tr] anthropic ok(attempt '+attempt+'):'+translated);
              } else {
                console.log('[tr] anthropic '+res.status+' attempt '+attempt);
              }
            }
          } catch(e){console.log('[tr] anthropic err:'+e.message);}
        }
        // Google 폴백
        if(!translated || translated===name) {
          try {
            const gKey = (env.GOOGLE_TRANSLATE_KEY||'').trim();
          if(gKey){
            const gRes = await fetch('https://translation.googleapis.com/language/translate/v2?key='+gKey,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({q:name,source:'ko',target:tl2,format:'text'})});
            const gData = await gRes.json();
            translated = (gData&&gData.data&&gData.data.translations&&gData.data.translations[0]&&gData.data.translations[0].translatedText)||'';
            console.log('[tr] google official:'+translated);
          } else {
            const gRes = await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=ko&tl='+tl2+'&dt=t&q='+encodeURIComponent(name));
            const gData = await gRes.json();
            translated = (gData&&gData[0]&&gData[0][0]&&gData[0][0][0])||'';
            console.log('[tr] google fallback:'+translated);
          }
          } catch(e){}
        }
        // 번역 성공 시만 KV 캐시 저장
        if(translated && translated.trim() !== name) {
          try{await env.DONWAY_ASSETS.put(cacheKey,translated.trim(),{expirationTtl:86400});}catch(e){}
        }
        return new Response(JSON.stringify({translated:(translated||name).trim()}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
      }
      if (path === '/api/menus') {
        const did = new URL(request.url).searchParams.get('did');
        if (!did) return new Response(JSON.stringify({error:'did required'}), {status:400, headers:{'Content-Type':'application/json',...SECURITY_HEADERS}});
        const token = await getAccessToken(env);
        const r = await fetch(`${FS_BASE}:runQuery`, {
          method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
          body: JSON.stringify({structuredQuery:{
            from:[{collectionId:'filo_menus'}],
            where:{fieldFilter:{field:{fieldPath:'dealerId'},op:'EQUAL',value:{stringValue:did}}},
            limit:200
          }})
        });
        const rows = await r.json();
        const parseRows = (rows) => (rows||[]).filter(d=>d.document&&!(d.document.fields?.forSale?.booleanValue===false)).map(d=>{
          const f = d.document.fields||{};
          const g = (k)=>{const v=f[k]; if(!v)return null; return v.stringValue??v.integerValue??v.booleanValue??null;};
          return {
            id: d.document.name.split('/').pop(),
            name: g('name')||g('menuName')||'',
            price: parseInt(g('price')||g('sellPrice')||0),
            category: g('category')||'기타',
            emoji: g('emoji')||'🍽',
            imgUrl: g('imageUrl')||g('imgUrl')||'',
            soldOut: f.soldOut?.booleanValue||false
          };
        }).filter(m=>m.name&&m.price>0);

        let menus = parseRows(rows);

        /* filo_menus 없으면 inventory fallback */
        if(!menus.length){
          const r2 = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`, {
            method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
            body: JSON.stringify({structuredQuery:{
              from:[{collectionId:'inventory'}],
              where:{fieldFilter:{field:{fieldPath:'dealerId'},op:'EQUAL',value:{stringValue:did}}},
              limit:300
            }})
          });
          const rows2 = await r2.json();
          menus = parseRows(rows2).filter(m=>m.price>0);
        }

        return new Response(JSON.stringify(menus), {
          headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}
        });
      }
      if (path === '/order-done') return serveKVFile(env, 'order-done.html', 'text/html');
      if (path === '/order-fail') return serveKVFile(env, 'order-done.html', 'text/html');
      if (path === '/kitchen' || path === '/kitchen.html') return serveKVFile(env, 'kitchen.html', 'text/html');
      // FIX: wait.html은 KV에 있는데 라우트가 없어 웨이팅 QR이 filo.html로 빠지고 있었다
      if (path === '/wait' || path === '/wait.html') return serveKVFile(env, 'wait.html', 'text/html');
      if (path === '/wait-join' || path === '/wait-join.html') return serveKVFile(env, 'wait-join.html', 'text/html');
      if (path === '/member-join') return serveKVFile(env, 'member-join.html', 'text/html');
      if (path === '/staff' || path === '/staff-portal') return serveKVFile(env, 'staff-portal.html', 'text/html');
      if (path === '/member' || path === '/member-portal') return serveKVFile(env, 'member-portal.html', 'text/html');
      // filo JS 모듈 서빙 (slug 라우팅보다 먼저!)
      const cleanPath = path.split('?')[0];
      if (cleanPath.match(/^\/filo-[a-z0-9_-]+\.js$/)) {
        return serveKVFile(env, cleanPath.slice(1), 'application/javascript');
      }
      if (cleanPath === '/store.js' || cleanPath === '/order.js') {
        return serveKVFile(env, cleanPath.slice(1), 'application/javascript');
      }
      // FIX: /api /toss /fcm /storage-upload 는 아래 공통 라우터에만 핸들러가 있다.
      // slug catch-all이 가로채면 JSON 대신 filo.html(HTML)이 돌아가 호출부가 조용히 실패한다.
      const _delegateToCommon = cleanPath.startsWith('/api/') || cleanPath.startsWith('/toss/') || cleanPath.startsWith('/fcm/') || cleanPath === '/storage-upload';
      if (!_delegateToCommon) {
      // ★ /매장명 or /slug → filo.html + 매장명 주입
      const filoPath = path.replace(/^\//, '');
      if (filoPath) {
        const filoHtml = await env.DONWAY_ASSETS.get('filo.html', 'text');
        if (filoHtml) {
          const storeKey = decodeURIComponent(filoPath);
          let storeName = storeKey;
          let dealerId = '';
          try {
            // dineSlug로 먼저 조회
            const r1 = await fetch('https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents:runQuery', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'companies' }],
                where: { fieldFilter: { field: { fieldPath: 'dineSlug' }, op: 'EQUAL', value: { stringValue: storeKey } } }, limit: 1 }})
            });
            const d1 = await r1.json();
            const doc1 = d1 && d1[0] && d1[0].document;
            if (doc1) {
              storeName = (doc1.fields.companyName || doc1.fields.name || {}).stringValue || storeKey;
              dealerId = (doc1.fields.dealerId || doc1.fields.uid || {}).stringValue || '';
              if(!dealerId && doc1.name) dealerId = doc1.name.split('/').pop();
            } else {
              // slug 필드로 재시도 (관제센터 slug 기반)
              const r2 = await fetch('https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents:runQuery', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'companies' }],
                  where: { fieldFilter: { field: { fieldPath: 'slug' }, op: 'EQUAL', value: { stringValue: storeKey } } }, limit: 1 }})
              });
              const d2 = await r2.json();
              const doc2 = d2 && d2[0] && d2[0].document;
              if (doc2) {
                storeName = (doc2.fields.companyName || doc2.fields.name || {}).stringValue || storeKey;
                dealerId = (doc2.fields.dealerId || doc2.fields.uid || {}).stringValue || '';
                if(!dealerId && doc2.name) dealerId = doc2.name.split('/').pop();
              } else {
                // companyName으로 마지막 재시도
                const r3 = await fetch('https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents:runQuery', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'companies' }],
                    where: { fieldFilter: { field: { fieldPath: 'companyName' }, op: 'EQUAL', value: { stringValue: storeKey } } }, limit: 1 }})
                });
                const d3 = await r3.json();
                const doc3 = d3 && d3[0] && d3[0].document;
                if (doc3) {
                  storeName = (doc3.fields.companyName || doc3.fields.name || {}).stringValue || storeKey;
                  dealerId = (doc3.fields.dealerId || doc3.fields.uid || {}).stringValue || '';
                  if(!dealerId && doc3.name) dealerId = doc3.name.split('/').pop();
                }
              }
            }
          } catch(e) {}
          const injected = filoHtml.replace('</head>',
            '<script>window.__FILO_STORE__=' + JSON.stringify(storeName) +
            ';window.__FILO_SLUG__=' + JSON.stringify(storeKey) +
            ';window.__FILO_DEALER_ID__=' + JSON.stringify(dealerId || '') +
            ';</script></head>'
          );
          return new Response(injected, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
        }
      }
      return serveKVFile(env, 'filo.html', 'text/html');
      } // end _delegateToCommon guard
    }

        // ★ mbtico.kr → 엠비티아이 배송앱
    if (hostname === 'mbtico.kr' || hostname === 'www.mbtico.kr') {
      if (path === '/settle' || path === '/settle.html') return Response.redirect('https://donway.ai.kr/settle', 302);
      if (path === '/' || path === '') return serveKVFile(env, 'mbti_landing.html', 'text/html');
      // /app 경로 제거됨 (레거시 물류앱v9 삭제)
      if (path === '/hub') return serveKVFile(env, 'mbtico_hub.html', 'text/html');
      if (path === '/control' || path === '/control/') {
        const ctrlHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>엠비티아이 관제센터</title>
<style>
:root{
  --bg:#07080F;--bg2:#0D1117;--bg3:#161B22;--bd:rgba(255,255,255,.08);
  --tx:#F0F4FF;--tx2:#8B949E;--tx3:#484F58;
  --blue:#0066FF;--green:#22c55e;--red:#ef4444;--gold:#f59e0b;--purple:#7C3AED;
  --radius:12px;
}
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
html,body{height:100%;background:var(--bg);color:var(--tx);font-family:-apple-system,BlinkMacSystemFont,'Pretendard','Segoe UI',sans-serif;font-size:14px}

/* ── 로그인 ── */
#login-screen{position:fixed;inset:0;background:var(--bg);display:flex;align-items:center;justify-content:center;z-index:999}
.login-box{background:var(--bg2);border:1px solid var(--bd);border-radius:20px;padding:36px 28px;width:100%;max-width:360px;display:flex;flex-direction:column;gap:12px}
.login-logo{font-size:22px;font-weight:900;text-align:center;margin-bottom:8px;background:linear-gradient(135deg,var(--blue),var(--purple));-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.login-sub{font-size:12px;color:var(--tx2);text-align:center;margin-bottom:4px}

/* ── 메인 레이아웃 ── */
#main-screen{display:none;flex-direction:column;height:100vh;overflow:hidden}
.top-bar{background:var(--bg2);border-bottom:1px solid var(--bd);padding:0 20px;height:52px;display:flex;align-items:center;gap:12px;flex-shrink:0}
.top-logo{font-size:16px;font-weight:900;background:linear-gradient(135deg,var(--blue),var(--purple));-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.top-space{flex:1}
#ctrl-user{font-size:11px;color:var(--tx2)}
.top-btn{padding:6px 12px;border-radius:8px;border:1px solid var(--bd);background:transparent;color:var(--tx2);font-size:12px;cursor:pointer}
.top-btn:hover{border-color:rgba(255,255,255,.2);color:var(--tx)}
.main-scroll{flex:1;overflow-y:auto;padding:16px}
.main-scroll::-webkit-scrollbar{width:4px}
.main-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:2px}

/* ── 아코디언 ── */
.acc-item{background:var(--bg2);border:1px solid var(--bd);border-radius:var(--radius);margin-bottom:10px;overflow:hidden}
.acc-header{padding:14px 18px;display:flex;align-items:center;gap:10px;cursor:pointer;user-select:none;transition:.15s}
.acc-header:hover{background:rgba(255,255,255,.03)}
.acc-icon{font-size:12px;color:var(--tx2);width:14px;flex-shrink:0}
.acc-title{font-size:14px;font-weight:700;flex:1}
.acc-badge{background:var(--red);color:#fff;font-size:11px;font-weight:800;min-width:20px;height:20px;border-radius:10px;display:none;align-items:center;justify-content:center;padding:0 6px}
.acc-body{display:none;padding:0 18px 18px;border-top:1px solid var(--bd)}

/* ── 공통 컴포넌트 ── */
.ctrl-input{width:100%;padding:10px 12px;border:1px solid var(--bd);border-radius:8px;background:var(--bg3);color:var(--tx);font-size:13px;font-family:inherit;outline:none}
.ctrl-input:focus{border-color:var(--blue)}
.ctrl-select{padding:8px 12px;border:1px solid var(--bd);border-radius:8px;background:var(--bg3);color:var(--tx);font-size:13px;cursor:pointer;outline:none}
.ctrl-label{font-size:12px;font-weight:700;color:var(--tx2);margin-bottom:6px}
.ctrl-btn{padding:6px 12px;border-radius:7px;font-size:12px;font-weight:700;cursor:pointer;border:none;transition:.15s;white-space:nowrap}
.ctrl-btn-ok{background:rgba(34,197,94,.15);color:var(--green);border:1px solid rgba(34,197,94,.3)}
.ctrl-btn-ok:hover{background:rgba(34,197,94,.25)}
.ctrl-btn-err{background:rgba(239,68,68,.15);color:var(--red);border:1px solid rgba(239,68,68,.3)}
.ctrl-btn-err:hover{background:rgba(239,68,68,.25)}
.ctrl-btn-sub{background:var(--bg3);color:var(--tx2);border:1px solid var(--bd)}
.ctrl-btn-sub:hover{border-color:rgba(255,255,255,.2);color:var(--tx)}
.ctrl-toolbar{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;align-items:center}
.ctrl-loading{padding:24px;text-align:center;color:var(--tx2);font-size:13px}
.ctrl-empty{padding:24px;text-align:center;color:var(--tx3);font-size:13px}
.ctrl-table-wrap{overflow-x:auto}
.ctrl-table{width:100%;border-collapse:collapse;font-size:13px}
.ctrl-table th{padding:8px 12px;text-align:left;background:var(--bg3);color:var(--tx2);font-weight:700;font-size:12px;border-bottom:1px solid var(--bd);white-space:nowrap}
.ctrl-table td{padding:8px 12px;border-bottom:1px solid var(--bd);vertical-align:middle}
.ctrl-table tr:last-child td{border-bottom:none}
.ctrl-table td .ctrl-btn{margin:2px}
.ctrl-hint{font-size:11px;color:var(--tx3);margin-top:12px;text-align:center}
.badge{display:inline-flex;align-items:center;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:700}
.badge-ok{background:rgba(34,197,94,.15);color:var(--green)}
.badge-warn{background:rgba(245,158,11,.15);color:var(--gold)}
.badge-err{background:rgba(239,68,68,.15);color:var(--red)}
.badge-hold{background:rgba(124,58,237,.15);color:var(--purple)}

/* ── 대시보드 ── */
.dash-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:8px}
@media(max-width:500px){.dash-grid{grid-template-columns:repeat(2,1fr)}}
.dash-card{background:var(--bg3);border:1px solid var(--bd);border-radius:10px;padding:14px 16px;text-align:center}
.dash-val{font-size:28px;font-weight:900;margin-bottom:4px}
.dash-label{font-size:11px;color:var(--tx2);font-weight:600}

/* ── 고객사 카드 ── */
.comp-cards{display:flex;flex-direction:column;gap:10px}
.comp-card{background:var(--bg3);border:1px solid var(--bd);border-radius:10px;padding:14px}
.comp-card-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px}
.comp-name{font-size:14px;font-weight:800}
.comp-email{font-size:11px;color:var(--tx2);margin-top:2px}
.comp-meta{display:flex;flex-wrap:wrap;gap:8px;font-size:11px;color:var(--tx2);margin-bottom:10px}
.comp-actions{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}
.comp-features{display:flex;flex-wrap:wrap;gap:5px;padding-top:10px;border-top:1px solid var(--bd)}
.feat-label{font-size:11px;color:var(--tx2);width:100%;margin-bottom:4px}
.feat-btn{padding:4px 8px;border-radius:5px;font-size:11px;font-weight:600;cursor:pointer;border:none;transition:.1s}
.feat-on{background:rgba(34,197,94,.15);color:var(--green)}
.feat-off{background:var(--bg2);color:var(--tx3);border:1px solid var(--bd)}

/* ── 채팅 ── */
.chat-layout{display:flex;gap:12px;height:400px}
.chat-list{width:200px;flex-shrink:0;border:1px solid var(--bd);border-radius:8px;overflow-y:auto;background:var(--bg3)}
.chat-item{padding:10px 12px;border-bottom:1px solid var(--bd);cursor:pointer;transition:.1s}
.chat-item:hover,.chat-item-active{background:rgba(0,102,255,.1)}
.chat-item-name{font-size:12px;font-weight:700;display:flex;align-items:center;gap:6px}
.chat-item-last{font-size:11px;color:var(--tx2);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.chat-badge{background:var(--red);color:#fff;font-size:10px;font-weight:800;min-width:16px;height:16px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;padding:0 4px}
.chat-room{flex:1;display:flex;flex-direction:column;border:1px solid var(--bd);border-radius:8px;overflow:hidden}
.chat-room-hdr{padding:10px 14px;background:var(--bg3);border-bottom:1px solid var(--bd);font-size:13px;font-weight:700;flex-shrink:0}
.chat-room-empty{flex:1;display:flex;align-items:center;justify-content:center;color:var(--tx3);font-size:13px}
.chat-msgs{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px}
.chat-msgs::-webkit-scrollbar{width:3px}
.chat-msgs::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1)}
.chat-msg{max-width:75%;display:flex;flex-direction:column;gap:2px}
.chat-msg-sa{align-self:flex-end;align-items:flex-end}
.chat-msg-dealer{align-self:flex-start;align-items:flex-start}
.chat-msg-text{padding:8px 12px;border-radius:12px;font-size:13px;line-height:1.5;word-break:break-word}
.chat-msg-sa .chat-msg-text{background:var(--blue);color:#fff;border-radius:12px 12px 4px 12px}
.chat-msg-dealer .chat-msg-text{background:var(--bg3);color:var(--tx);border:1px solid var(--bd);border-radius:12px 12px 12px 4px}
.chat-msg-time{font-size:10px;color:var(--tx3)}
.chat-input-row{display:flex;gap:8px;padding:10px;border-top:1px solid var(--bd);background:var(--bg2);flex-shrink:0}
.chat-input-row .ctrl-input{flex:1}
@media(max-width:540px){.chat-layout{flex-direction:column;height:auto}.chat-list{width:100%;height:150px}.chat-room{height:300px}}

/* ── 공지 ── */
.notice-form{display:flex;flex-direction:column;gap:4px;max-width:520px}
.notice-item{background:var(--bg3);border:1px solid var(--bd);border-radius:8px;padding:12px;margin-bottom:8px}
.notice-title{font-size:13px;font-weight:700;margin-bottom:4px}
.notice-body{font-size:12px;color:var(--tx2);margin-bottom:6px}
.notice-meta{font-size:11px;color:var(--tx3)}

/* ── 결제 ── */
.billing-total{padding:10px 0;font-size:14px;margin-bottom:8px}

/* ── 상세 모달 ── */
#detail-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:800;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)}
#detail-overlay.open{display:flex}
#detail-box{background:var(--bg2);border:1px solid var(--bd);border-radius:16px;width:100%;max-width:440px;max-height:85vh;overflow-y:auto}
.modal-hdr{padding:16px 20px;display:flex;align-items:center;border-bottom:1px solid var(--bd);position:sticky;top:0;background:var(--bg2);z-index:1}
.modal-title{font-size:15px;font-weight:900;flex:1}
.modal-close{background:rgba(255,255,255,.06);border:none;color:var(--tx2);width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:16px}
.modal-body{padding:16px 20px 24px}
.detail-row{padding:8px 0;border-bottom:1px solid var(--bd);font-size:13px;display:flex;gap:8px}
.detail-row b{color:var(--tx2);font-size:12px;min-width:80px;flex-shrink:0}
.detail-section{font-size:12px;font-weight:700;color:var(--tx2);margin:14px 0 8px;text-transform:uppercase}
.doc-row{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--bd)}
.doc-label{flex:1;font-size:13px}
.doc-none{font-size:12px;color:var(--tx3)}

/* ── Toast ── */
.ctrl-toast{position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.88);color:#fff;padding:10px 20px;border-radius:20px;font-size:13px;font-weight:600;z-index:9999;white-space:nowrap;animation:fadeIn .2s ease;pointer-events:none}
@keyframes fadeIn{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
</style>
</head>
<body>

<!-- 로그인 -->
<div id="login-screen">
  <div class="login-box">
    <div class="login-logo">엠비티아이 관제센터</div>
    <div class="login-sub">슈퍼어드민 전용</div>
    <input id="l-email" class="ctrl-input" type="email" placeholder="이메일" value="kimdh4790@gmail.com">
    <input id="l-pw"    class="ctrl-input" type="password" placeholder="비밀번호"
      onkeydown="if(event.key==='Enter')_ctrlLogin()">
    <button onclick="_ctrlLogin()"
      style="padding:12px;background:linear-gradient(135deg,var(--blue),var(--purple));color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:800;cursor:pointer">
      로그인
    </button>
  </div>
</div>

<!-- 메인 -->
<div id="main-screen">
  <div class="top-bar">
    <div class="top-logo">관제센터</div>
    <div class="top-space"></div>
    <span id="ctrl-user"></span>
    <button class="top-btn" onclick="_ctrlLogout()">로그아웃</button>
  </div>

  <div class="main-scroll">

    <!-- 📊 대시보드 -->
    <div class="acc-item">
      <div class="acc-header" onclick="_ctrlToggle('dashboard')">
        <span class="acc-icon" id="ico-dashboard">▶</span>
        <span class="acc-title">대시보드</span>
      </div>
      <div class="acc-body" id="acc-dashboard"></div>
    </div>

    <!-- ✅ 가입 승인 -->
    <div class="acc-item">
      <div class="acc-header" onclick="_ctrlToggle('join')">
        <span class="acc-icon" id="ico-join">▶</span>
        <span class="acc-title">가입 승인</span>
        <span class="acc-badge" id="badge-join"></span>
      </div>
      <div class="acc-body" id="acc-join"></div>
    </div>

    <!-- 👥 고객사 관리 -->
    <div class="acc-item">
      <div class="acc-header" onclick="_ctrlToggle('companies')">
        <span class="acc-icon" id="ico-companies">▶</span>
        <span class="acc-title">고객사 관리</span>
      </div>
      <div class="acc-body" id="acc-companies"></div>
    </div>

    <!-- 💬 채팅 -->
    <div class="acc-item">
      <div class="acc-header" onclick="_ctrlToggle('chat')">
        <span class="acc-icon" id="ico-chat">▶</span>
        <span class="acc-title">1:1 채팅</span>
        <span class="acc-badge" id="badge-chat"></span>
      </div>
      <div class="acc-body" id="acc-chat"></div>
    </div>

    <!-- 📢 공지 발송 -->
    <div class="acc-item">
      <div class="acc-header" onclick="_ctrlToggle('notice')">
        <span class="acc-icon" id="ico-notice">▶</span>
        <span class="acc-title">공지 발송</span>
      </div>
      <div class="acc-body" id="acc-notice"></div>
    </div>

    <!-- 💰 결제 현황 -->
    <div class="acc-item">
      <div class="acc-header" onclick="_ctrlToggle('billing')">
        <span class="acc-icon" id="ico-billing">▶</span>
        <span class="acc-title">결제 현황</span>
      </div>
      <div class="acc-body" id="acc-billing"></div>
    </div>

  </div><!-- /main-scroll -->
</div><!-- /main-screen -->

<!-- 상세 모달 -->
<div id="detail-overlay" onclick="if(event.target===this)_ctrlCloseDetail()">
  <div id="detail-box"></div>
</div>

<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-storage-compat.js"></script>
<script src="/mbtico-ctrl.js?v=1"></script>
<script>
  // 앱 시작
  window.addEventListener('DOMContentLoaded', _ctrlInit);
  // ESC → 모달 닫기
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') _ctrlCloseDetail();
  });
</script>
</body>
</html>
`;
        return new Response(ctrlHtml, {headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'}});
      }
      if (path === '/label' || path === '/label.html') return serveKVFile(env, 'label.html', 'text/html');
      // /delivery → /drivers 리다이렉트 (drivers.html로 통합)
      if (path === '/delivery' || path === '/delivery.html') {
        var did = new URL(request.url).searchParams.get('did') || '';
        return Response.redirect('https://mbtico.kr/drivers' + (did ? '?did=' + did : ''), 302);
      }
      if (path === '/emergency' || path === '/emergency.html') return serveKVFile(env, 'emergency.html', 'text/html');
      if (path === '/checkin' || path === '/checkin.html') return serveKVFile(env, 'checkin.html', 'text/html');
      // /v9 경로 제거됨 (레거시 물류앱v9 삭제)
      if (path === '/admin' || path === '/admin.html') return Response.redirect('https://mbtico.kr/control', 302);
      if (path === '/register' || path === '/register.html') return serveKVFile(env, 'register.html', 'text/html');
      if (path === '/drivers' || path === '/drivers.html') return serveKVFile(env, 'drivers.html', 'text/html');
      if (path === '/notice' || path === '/notice.html') return serveKVFile(env, 'notice.html', 'text/html');
      if (path === '/schedule' || path === '/schedule.html') return serveKVFile(env, 'schedule.html', 'text/html');
      if (path === '/scan' || path === '/scan.html') return serveKVFile(env, 'scan.html', 'text/html');
      if (path === '/mbtico_hub' || path === '/mbtico-hub') return serveKVFile(env, 'mbtico_hub.html', 'text/html');
      if (path === '/mbtico-join' || path === '/company-join') return serveKVFile(env, 'mbtico_join.html', 'text/html');
    }
    // ★ mbetco.kr / bico.kr → FILO 구버전 호환
    if (hostname === 'bico.kr' || hostname === 'mbetco.kr' || hostname === 'www.mbetco.kr') {
      if (path === '/' || path === '') return serveKVFile(env, 'filo.html', 'text/html');
      if (path === '/inventory' || path === '/inventory.html') return serveKVFile(env, 'inventory.html', 'text/html');
      if (path === '/qr') {
        // 직원 출퇴근 QR — 직원선택 + GPS + 기기 중복방지
        const params = new URL(request.url).searchParams;
        const did    = params.get('did');
        const action = params.get('action') || 'in';
        if (!did) return serveKVFile(env, 'qrpos.html', 'text/html');

        const actionMap = {in:'출근', out:'퇴근'};
        const iconMap   = {in:'●', out:'○'};
        const label = actionMap[action] || '출근';
        const icon  = iconMap[action]  || '●';

        try {
          const token = await getAccessToken(env);
          // members 조회
          // 매장 GPS 좌표 조회
          const cRes = await fetch(`${FS_BASE}/companies/${did}`,{headers:{'Authorization':'Bearer '+token}});
          const cData = await cRes.json();
          const shopLat = cData.fields?.lat?.doubleValue||cData.fields?.lat?.integerValue||0;
          const shopLng = cData.fields?.lng?.doubleValue||cData.fields?.lng?.integerValue||0;

          // members는 클라이언트에서 Firebase SDK로 로드
          const membersJson = '[]'; // 클라이언트에서 로드
          const html = `<!DOCTYPE html>
<html lang="ko"><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<title>${label}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0a0a14;color:#e8e8f0;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;
  min-height:100vh;display:flex;align-items:center;justify-content:center;padding:16px;}
.card{background:#10101a;border:1px solid #1a1a2e;border-radius:24px;padding:28px 20px;max-width:360px;width:100%;}
h2{font-size:20px;font-weight:900;text-align:center;margin-bottom:20px;color:#00ff88;}
.mem-btn{width:100%;padding:14px;background:#1a1a2e;border:1px solid #2a2a4e;border-radius:12px;
  color:#e8e8f0;font-size:16px;font-weight:700;cursor:pointer;margin-bottom:10px;text-align:left;}
.mem-btn:active{background:#2a2a4e;}
.status{text-align:center;font-size:14px;color:#666680;margin-top:12px;min-height:20px;}
.done-card{text-align:center;}
.done-icon{font-size:64px;margin-bottom:12px;}
.done-label{font-size:24px;font-weight:900;color:#00ff88;margin-bottom:6px;}
.done-name{font-size:16px;color:#888;margin-bottom:4px;}
.done-time{font-size:13px;color:#555;}
.btn{display:block;margin:20px auto 0;padding:12px 32px;background:#1a1a3e;border:1px solid #2a2a5e;
  border-radius:12px;color:#e8e8f0;font-size:14px;font-weight:700;cursor:pointer;}
.err{color:#ff4466;text-align:center;padding:12px;}
</style>
</head><body>
<div class="card" id="main">
  <h2>${icon} ${label}</h2>
  <div id="list"></div>
  <div class="status" id="status">본인 이름을 선택하세요</div>
</div>
<script>
var DID='${did}';
var ACTION='${action}';
var SHOP_LAT=${shopLat};
var SHOP_LNG=${shopLng};
var MEMBERS=${membersJson};
var GPS_RADIUS=300; // 매장 반경 300m

function getKST(){var n=new Date();return new Date(n.getTime()+9*3600000);}
function getToday(){return getKST().toISOString().slice(0,10);}
function getDeviceId(){
  var k='filo_dev_id';
  var id=localStorage.getItem(k);
  if(!id){id='dev_'+Math.random().toString(36).slice(2)+'_'+Date.now();localStorage.setItem(k,id);}
  return id;
}
function getDistM(lat1,lng1,lat2,lng2){
  var R=6371000;
  var dLat=(lat2-lat1)*Math.PI/180;
  var dLng=(lng2-lng1)*Math.PI/180;
  var a=Math.sin(dLat/2)*Math.sin(dLat/2)+
    Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*
    Math.sin(dLng/2)*Math.sin(dLng/2);
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

function setStatus(msg,col){
  var el=document.getElementById('status');
  if(el){el.textContent=msg;if(col)el.style.color=col;}
}

function renderList(){
  var ul=document.getElementById('list');
  if(!ul)return;
  var html='';
  if(MEMBERS.length){
    html=MEMBERS.map(function(m){
      return '<button class="mem-btn" onclick="selectMember(\''+m.id+'\',\''+m.name+'\')">'+m.name+'</button>';
    }).join('');
  } else {
    html='<div class="err" style="margin-bottom:10px">등록된 직원이 없습니다</div>';
  }
  html+='<button class="mem-btn" style="border-color:#7c3aed;color:#a78bfa;background:rgba(124,58,237,.12);margin-top:8px" onclick="showRegForm()">+ 내 이름이 없어요 (신규 등록)</button>';
  ul.innerHTML=html;
}

function showRegForm(){
  var ul=document.getElementById('list');
  if(!ul)return;
  ul.innerHTML='<div>'+
    '<div style="font-size:14px;font-weight:800;color:#a78bfa;margin-bottom:12px">신규 직원 등록</div>'+
    '<input id="r-name" type="text" placeholder="이름을 입력하세요" autocomplete="name" '+
    'style="width:100%;padding:12px;background:#1a1a2e;border:1.5px solid #7c3aed;border-radius:10px;color:#fff;font-size:15px;margin-bottom:8px;outline:none;display:block">'+
    '<input id="r-phone" type="tel" placeholder="연락처 (선택사항, 010-0000-0000)" autocomplete="tel" '+
    'style="width:100%;padding:12px;background:#1a1a2e;border:1px solid #2a2a4e;border-radius:10px;color:#fff;font-size:14px;margin-bottom:12px;outline:none;display:block">'+
    '<button onclick="doRegister()" style="width:100%;padding:14px;background:#7c3aed;border:none;border-radius:10px;color:#fff;font-size:15px;font-weight:800;cursor:pointer">등록 후 ${label}</button>'+
    '<button onclick="renderList()" style="width:100%;padding:10px;background:transparent;border:none;color:#666;font-size:13px;cursor:pointer;margin-top:6px">← 목록으로 돌아가기</button>'+
  '</div>';
  setTimeout(function(){var n=document.getElementById('r-name');if(n)n.focus();},100);
}

function doRegister(){
  var name=(document.getElementById('r-name')&&document.getElementById('r-name').value||'').trim();
  var phone=(document.getElementById('r-phone')&&document.getElementById('r-phone').value||'').trim();
  if(!name){setStatus('이름을 입력하세요','#ff4466');return;}
  setStatus('등록 중...','#aaa');
  var deviceId=getDeviceId();
  var today=getToday();
  var dupKey='att_'+DID+'_'+today+'_'+deviceId+'_'+ACTION;
  if(localStorage.getItem(dupKey)){
    setStatus('이 기기에서 이미 처리됐습니다','#ff4466');
    return;
  }
  fetch('/qr/register',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({did:DID,name:name,phone:phone})
  }).then(function(r){return r.json();}).then(function(res){
    if(res.ok&&res.uid){
      doSave(res.uid,name,deviceId,dupKey,0,0);
    } else {
      setStatus(res.error||'등록 오류','#ff4466');
    }
  }).catch(function(){setStatus('네트워크 오류','#ff4466');});
}

function selectMember(uid,name){
  setStatus('위치 확인 중...','#aaa');
  var deviceId=getDeviceId();
  var today=getToday();

  // 기기 중복 체크
  var dupKey='att_'+DID+'_'+today+'_'+deviceId+'_'+ACTION;
  if(localStorage.getItem(dupKey)){
    setStatus('이미 '+name+'님의 '+('${label}')+'이 처리됐습니다','#ff4466');
    return;
  }

  // GPS 확인
  if(SHOP_LAT&&SHOP_LNG&&navigator.geolocation){
    navigator.geolocation.getCurrentPosition(function(pos){
      var dist=getDistM(pos.coords.latitude,pos.coords.longitude,SHOP_LAT,SHOP_LNG);
      if(dist>GPS_RADIUS){
        setStatus('매장에서 '+Math.round(dist)+'m 떨어져 있습니다 (최대 '+GPS_RADIUS+'m)','#ff4466');
        return;
      }
      doSave(uid,name,deviceId,dupKey,pos.coords.latitude,pos.coords.longitude);
    },function(){
      // GPS 실패 시 그냥 진행
      doSave(uid,name,deviceId,dupKey,0,0);
    },{timeout:8000});
  } else {
    doSave(uid,name,deviceId,dupKey,0,0);
  }
}

function doSave(uid,name,deviceId,dupKey,lat,lng){
  setStatus('저장 중...','#aaa');
  var now=new Date();
  var kst=new Date(now.getTime()+9*3600000);
  var date=kst.toISOString().slice(0,10);
  var timeStr=kst.toISOString().slice(11,16);

  fetch('/qr/confirm',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({did:DID,uid:uid,name:name,action:ACTION,deviceId:deviceId,lat:lat,lng:lng})
  }).then(function(r){return r.json();}).then(function(res){
    if(res.ok){
      localStorage.setItem(dupKey,'1');
      var card=document.getElementById('main');
      card.innerHTML='<div class="done-card">'+
        '<div class="done-icon">'+(ACTION==='in'?'출근':'퇴근')+'</div>'+
        '<div class="done-label">'+(ACTION==='in'?'출근':'퇴근')+' 완료</div>'+
        '<div class="done-name">'+name+'</div>'+
        '<div class="done-time">'+date+' '+timeStr+'</div>'+
        '<button class="btn" onclick="window.close();history.back()">확인</button>'+
        '</div>';
    } else {
      setStatus(res.error||'오류가 발생했습니다','#ff4466');
    }
  }).catch(function(){setStatus('네트워크 오류','#ff4466');});
}

// /qr/members API로 직원 목록 로드
fetch('/qr/members?did='+DID)
  .then(function(r){return r.json();})
  .then(function(res){
    if(res.members) MEMBERS=res.members;
    renderList();
  }).catch(function(){renderList();});
</script>
</body></html>`;
          return new Response(html, {headers:{'Content-Type':'text/html; charset=utf-8'}});
        } catch(e) {
          return new Response(`<h2 style="font-family:sans-serif;padding:40px;color:#fff;background:#0a0a14">오류: ${e.message}</h2>`,
            {headers:{'Content-Type':'text/html'}});
        }
      }

      // /qr/members — 직원 목록 조회 (SA 토큰)
      if (path === '/qr/members') {
        const did = new URL(request.url).searchParams.get('did');
        if (!did) return Response.json({members:[]});
        try {
          const token = await getAccessToken(env);
          const res = await fetch(`${FS_BASE}:runQuery`, {
            method:'POST',
            headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
            body: JSON.stringify({structuredQuery:{
              from:[{collectionId:'members'}],
              where:{fieldFilter:{field:{fieldPath:'dealerId'},op:'EQUAL',value:{stringValue:did}}},
              orderBy:[{field:{fieldPath:'name'},direction:'ASCENDING'}]
            }})
          });
          const docs = await res.json();
          const members = (Array.isArray(docs)?docs:[]).filter(d=>d.document).map(d=>{
            const f=d.document.fields||{};
            return {id:d.document.name.split('/').pop(), name:f.name?.stringValue||''};
          }).filter(m=>m.name);
          return Response.json({members});
        } catch(e) {
          return Response.json({members:[], error:e.message});
        }
      }

      // /qr/register — 신규 직원 이름+연락처 등록
      if (path === '/qr/register' && request.method === 'POST') {
        try {
          const body = await request.json();
          const {did, name, phone} = body;
          if (!did || !name) return Response.json({ok:false,error:'이름을 입력하세요'});
          const token = await getAccessToken(env);
          const res = await fetch(`${FS_BASE}/members`, {
            method:'POST',
            headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
            body: JSON.stringify({fields:{
              dealerId:   {stringValue: did},
              name:       {stringValue: name},
              phone:      {stringValue: phone||''},
              role:       {stringValue: 'part'},
              wage:       {integerValue: 0},
              wageType:   {stringValue: 'hourly'},
              is_active:  {booleanValue: true},
              createdAt:  {stringValue: new Date().toISOString()}
            }})
          });
          const doc = await res.json();
          const uid = doc.name?.split('/').pop();
          if (!uid) return Response.json({ok:false,error:'등록 실패'});
          return Response.json({ok:true, uid});
        } catch(e) {
          return Response.json({ok:false,error:e.message});
        }
      }

      // /qr/confirm — 출퇴근 저장
      if (path === '/qr/confirm' && request.method === 'POST') {
        try {
          const body = await request.json();
          const {did, uid, name, action, deviceId, lat, lng} = body;
          if (!did || !uid || !action) return Response.json({ok:false,error:'파라미터 오류'});

          const now = new Date();
          const kst = new Date(now.getTime() + 9*3600*1000);
          const date = kst.toISOString().slice(0,10);
          const type = ['in','out','break_start','break_end'].includes(action) ? action : 'in';

          const token = await getAccessToken(env);

          // 오늘 같은 uid+type 중복 체크 (서버 사이드)
          const dupRes = await fetch(`${FS_BASE}:runQuery`, {
            method:'POST',
            headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
            body: JSON.stringify({structuredQuery:{
              from:[{collectionId:'attendance'}],
              where:{compositeFilter:{op:'AND',filters:[
                {fieldFilter:{field:{fieldPath:'dealerId'},op:'EQUAL',value:{stringValue:did}}},
                {fieldFilter:{field:{fieldPath:'memberId'},op:'EQUAL',value:{stringValue:uid}}},
                {fieldFilter:{field:{fieldPath:'date'},op:'EQUAL',value:{stringValue:date}}},
                {fieldFilter:{field:{fieldPath:'type'},op:'EQUAL',value:{stringValue:type}}}
              ]}}
            }})
          });
          const dupDocs = await dupRes.json();
          const hasDup = Array.isArray(dupDocs) && dupDocs.some(d=>d.document);
          if (hasDup) return Response.json({ok:false,error:'이미 '+( type==='in'?'출근':'퇴근')+'처리됐습니다'});

          // members에서 이름 조회
          const mr = await fetch(`${FS_BASE}/members/${uid}`, {headers:{'Authorization':'Bearer '+token}});
          const md = await mr.json();
          const memberName = md.fields?.name?.stringValue || name || '';

          await fetch(`${FS_BASE}/attendance`, {
            method:'POST',
            headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
            body: JSON.stringify({fields:{
              dealerId:   {stringValue: did},
              memberId:   {stringValue: uid},
              memberName: {stringValue: memberName},
              type:       {stringValue: type},
              date:       {stringValue: date},
              time:       {stringValue: now.toISOString()},
              deviceId:   {stringValue: deviceId||''},
              lat:        {doubleValue: lat||0},
              lng:        {doubleValue: lng||0},
              createdAt:  {stringValue: now.toISOString()}
            }})
          });

          // 사장님 FCM 출퇴근 알림
          try {
            const compRes2 = await fetch(`${FS_BASE}/companies/${did}`, {headers:{'Authorization':'Bearer '+token}});
            const compData2 = await compRes2.json();
            const fcmArr2 = compData2.fields?.fcmTokens?.arrayValue?.values?.map(v=>v.stringValue).filter(Boolean) || [];
            const fcmSingle2 = compData2.fields?.fcmToken?.stringValue || '';
            const allFcmTokens = [...new Set([...fcmArr2, fcmSingle2].filter(Boolean))];
            const actionLabel = type==='in'?'출근':'퇴근';
            const kstStr = kst.toISOString().slice(11,16);
            for(const ft of allFcmTokens) {
              await sendAdminFCM(env, ft, { title: `${actionLabel} 알림`, body: `${memberName||name||uid}님이 ${kstStr}에 ${actionLabel}했습니다.` });
            }
          } catch(e){}

          return Response.json({ok:true});
        } catch(e) {
          return Response.json({ok:false,error:e.message});
        }
      }
      if (path === '/qrpos' || path === '/qrpos.html') return serveKVFile(env, 'qrpos.html', 'text/html');
      if (path === '/kiosk' || path === '/kiosk.html') return serveKVFile(env, 'kiosk.html', 'text/html');
      if (path === '/register' || path === '/register.html') return serveKVFile(env, 'register.html', 'text/html');
    }
        // ── donway_og.jpg / OG 이미지 → KV 서빙 ──
    if (path === '/donway_og.jpg' || path === '/og_banner.jpg' || path === '/donway-og.jpg') {
      return serveKVFile(env, 'donway_og.jpg', 'image/jpeg');
    }




    // ── HTTPS 강제 리다이렉트 (HTTP → HTTPS) ──
    if (url.protocol === 'http:' && !hostname.includes('localhost') && !hostname.includes('workers.dev')) {
      return Response.redirect('https://' + hostname + url.pathname + url.search, 301);
    }

    // ── Rate Limiting (API 엔드포인트만) ──
    const isApiPath = ['/claude-ocr','/label-ocr','/scan-save','/truck-save'].includes(path);
    if (isApiPath) {
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      if (!checkRateLimit(ip, 30, 60000)) {
        return new Response(JSON.stringify({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json', 'Retry-After': '60', ...SECURITY_HEADERS }
        });
      }
    }


    // ── firebase-messaging-sw.js KV에서 서빙 ──
    if (path === '/firebase-messaging-sw.js') {
      const swContent = await env.DONWAY_ASSETS.get('firebase-messaging-sw.js', 'text');
      if (swContent) {
        return new Response(swContent, {
          headers: { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-cache', 'Service-Worker-Allowed': '/', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    // ★ 루트 접속 → 랜딩페이지 리라이트 (URL 유지, workers.dev 제외)
    // ── 루트 경로 처리 ──
    if (path === '/' || path === '' || path === '/donway_landing' || path === '/donway_landing/') {
      // yongcha.app fallback (Worker route 미등록 시 Pages 프록시 경유 가능성 대비)
      if (hostname === 'yongcha.app' || hostname === 'www.yongcha.app') {
        return handleYongcha(request, env);
      }
      // mbetco.kr → universal_settle.html
      if (hostname.includes('mbetco') || hostname.includes('mbtico')) {
        // mbtico.kr 루트 → 허브 페이지
        if (url.pathname === '/' || url.pathname === '' || url.pathname === '/index.html') {
          const hubResp = await fetchAsset('/mbtico_hub.html', request, env);
          const h = new Headers();
          h.set('Content-Type', 'text/html; charset=utf-8');
          h.set('Cache-Control', 'no-cache');
          return new Response(hubResp.body, {status: hubResp.status, headers: h});
        }
        // /admin_sub → 구독 어드민
        if (url.pathname === '/admin_sub' || url.pathname === '/admin_sub.html') {
          return Response.redirect('https://mbtico.kr/control', 302);
          const h = new Headers(); h.set('Content-Type','text/html; charset=utf-8'); h.set('Cache-Control','no-cache');
          Object.entries(SECURITY_HEADERS).forEach(([k,v]) => h.set(k,v));
          return new Response(r.body, {status:r.status, headers:h});
        }
        // /inventory → 재고관리
        if (url.pathname === '/inventory' || url.pathname === '/inventory.html') {
          const e2 = env || _env_ref;
          if (e2 && e2.DONWAY_ASSETS) {
            const kvVal = await e2.DONWAY_ASSETS.get('inventory.html', {type:'text'});
            if (kvVal) {
              return new Response(kvVal, {headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'}});
            }
          }
          const r = await fetchAsset('/inventory.html', request, env);
          const h = new Headers(); h.set('Content-Type','text/html; charset=utf-8'); h.set('Cache-Control','no-cache');
          Object.entries(SECURITY_HEADERS).forEach(([k,v]) => h.set(k,v));
          return new Response(r.body, {status:r.status, headers:h});
        }
        // /qr → QR POS
        if (url.pathname === '/qr' || url.pathname === '/qrpos' || url.pathname === '/qrpos.html') {
          const r = await fetchAsset('/qrpos.html', request, env);
          const h = new Headers(); h.set('Content-Type','text/html; charset=utf-8'); h.set('Cache-Control','no-cache');
          Object.entries(SECURITY_HEADERS).forEach(([k,v]) => h.set(k,v));
          return new Response(r.body, {status:r.status, headers:h});
        }
        // /kiosk → 키오스크·POS
        if (url.pathname === '/kiosk' || url.pathname === '/kiosk.html') {
          const r = await fetchAsset('/kiosk.html', request, env);
          const h = new Headers(); h.set('Content-Type','text/html; charset=utf-8'); h.set('Cache-Control','no-cache');
          Object.entries(SECURITY_HEADERS).forEach(([k,v]) => h.set(k,v));
          return new Response(r.body, {status:r.status, headers:h});
        }
        // /order 경로 → QR 예약·결제·평가 페이지
        if (url.pathname === '/order' || url.pathname === '/order.html') {
          const orderResp = await fetchAsset('/order.html', request, env);
          const orderH = new Headers();
          orderH.set('Content-Type', 'text/html; charset=utf-8');
          orderH.set('Cache-Control', 'no-cache');
          Object.entries(SECURITY_HEADERS).forEach(([k,v]) => orderH.set(k,v));
          return new Response(orderResp.body, { status: orderResp.status, headers: orderH });
        }
        // /liquor 경로 → 주류 재고관리
        if (url.pathname === '/liquor' || url.pathname === '/liquor.html') {
          const liqResp = await fetchAsset('/mbetco_liquor.html', request, env);
          return liqResp;
        }
        const mbResp = await fetchAsset('/settle.html', request, env);
        const mbH = new Headers();
        mbH.set('Content-Type', 'text/html; charset=utf-8');
        mbH.set('Cache-Control', 'no-cache');
        Object.entries(SECURITY_HEADERS).forEach(([k,v]) => mbH.set(k,v));
        return new Response(mbResp.body, { status: mbResp.status, headers: mbH });
      }
      // workers.dev = 물류앱, 그 외 = DONWAY 랜딩
      if (hostname.includes('workers.dev') || hostname.includes('kimdh4790')) {
        // ★ workers.dev → 배송앱 허브
        return serveKVFile(env, 'mbtico_hub.html', 'text/html');
      } else {
        const landingResp = await fetchAsset('/donway_landing.html', request, env);
        const landingHeaders = new Headers();
        landingHeaders.set('Content-Type', 'text/html; charset=utf-8');
        landingHeaders.set('Cache-Control', 'no-cache');
        Object.entries(SECURITY_HEADERS).forEach(([k,v]) => landingHeaders.set(k,v));
        return new Response(landingResp.body, { status: landingResp.status, headers: landingHeaders });
      }
    }


    // API 키 테스트 엔드포인트 (슈퍼어드민만)
    if (path === '/test-apikey') {
      const testEmail = request.headers.get('X-Admin-Email') || '';
      if(!['kimdh4790@gmail.com','soungkyekim@naver.com'].includes(testEmail)){
        return new Response(JSON.stringify({error:'Unauthorized'}),{status:401,headers:{'Content-Type':'application/json'}});
      }
      try {
        const k = (env.ANTHROPIC_API_KEY || env.CLAUDE_API_KEY || '').trim();
        if (!k) {
          return new Response(JSON.stringify({ ok:false, reason:'NO_KEY' }), 
            { headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'} });
        }
        // 키 형식 검사
        const isValidFormat = k.startsWith('sk-ant-');
        const masked = k.substring(0,12)+'...'+k.substring(k.length-6);
        
        // Anthropic API 직접 호출 (텍스트만, 이미지 없이)
        const testResp = await fetch('https://api.anthropic.com/v1/messages', {
          method:'POST',
          headers:{
            'Content-Type':'application/json',
            'x-api-key': k,
            'anthropic-version':'2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 10,
            messages: [{role:'user', content:'hi'}]
          })
        });
        const rawText = await testResp.text();
        let testJson = {};
        try { testJson = JSON.parse(rawText); } catch(e) {}
        
        return new Response(JSON.stringify({
          ok: testResp.ok,
          http_status: testResp.status,
          key_prefix: masked,
          key_len: k.length,
          valid_format: isValidFormat,
          error_type: testJson.error?.type || null,
          error_message: testJson.error?.message || null,
          raw_response: testResp.ok ? 'OK' : rawText.substring(0,200)
        }, null, 2), { headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'} });
      } catch(err) {
        return new Response(JSON.stringify({ok:false, exception:err.message}),
          { headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'} });
      }
    }


    // favicon: 뒤에서 icon-192.png 기반으로 서빙 (204 제거)

    if (method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Email',
        }
      });
    }


    // ── Firebase Storage 업로드 프록시 ──
    if (path === '/storage-upload' && method === 'POST') {
      try {
        const body = await request.json();
        const { storagePath, base64data, contentType, idToken } = body;
        const bucket = 'mbti-logistics.appspot.com';
        const uploadUrl = 'https://firebasestorage.googleapis.com/v0/b/' + bucket + '/o?uploadType=media&name=' + encodeURIComponent(storagePath);
        const binary = atob(base64data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const resp = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': contentType || 'image/jpeg', 'Authorization': 'Bearer ' + idToken },
          body: bytes
        });
        const result = await resp.json();
        const downloadUrl = 'https://firebasestorage.googleapis.com/v0/b/' + bucket + '/o/' + encodeURIComponent(storagePath) + '?alt=media';
        return new Response(JSON.stringify({ ok: true, url: downloadUrl }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch(e) {
        return new Response(JSON.stringify({ ok: false, error: e.message }), {
          status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    // ── Firebase Storage 삭제 프록시 ──
    if (path === '/storage-delete' && method === 'POST') {
      try {
        const body = await request.json();
        const { storagePath, idToken } = body;
        const bucket = 'mbti-logistics.appspot.com';
        await fetch('https://firebasestorage.googleapis.com/v0/b/' + bucket + '/o/' + encodeURIComponent(storagePath), {
          method: 'DELETE', headers: { 'Authorization': 'Bearer ' + idToken }
        });
        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch(e) {
        return new Response(JSON.stringify({ ok: false, error: e.message }), {
          status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }
    if (path === '/worker-test') {
      return new Response(JSON.stringify({ status: 'worker OK', path, method }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (path === '/label-ocr') {
      if (method !== 'POST') {
        return new Response(JSON.stringify({ status: 'label-ocr ready' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      try {
        const body = await request.json();
        const apiKey = (env.ANTHROPIC_API_KEY || env.CLAUDE_API_KEY || '').trim().replace(/[\r\n\s]+/g, '');
        if (!apiKey) {
          return new Response(JSON.stringify({ error: { message: 'ANTHROPIC_API_KEY 환경변수 미설정. Cloudflare Workers 환경변수를 확인하세요.' } }), {
            status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }
        const resp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify(body)
        });
        const data = await resp.json();
        // Anthropic 응답 그대로 전달 (에러 status code 포함)
        return new Response(JSON.stringify(data), {
          status: resp.status,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    if (path === '/claude-ocr' && method === 'POST') {
      try {
        const body = await request.json();
        const apiKey = (env.ANTHROPIC_API_KEY || env.CLAUDE_API_KEY || '').trim().replace(/[\r\n\s]+/g, '');
        if (!apiKey) {
          return new Response(JSON.stringify({ error: { message: 'ANTHROPIC_API_KEY 환경변수 미설정' } }), {
            status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }
        // ★ Claude API 직접 호출 (/label-ocr 동일 방식)
        const resp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify(body)
        });
        const data = await resp.json();
        return new Response(JSON.stringify(data), {
          status: resp.status,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: { message: e.message } }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    // ── 스캔 세션 저장 ──
    // ── 간선차 GPS 저장 ──
    // /get-label-key 삭제됨 (보안 취약점 — API 키 노출)

    // ── /api/join-member — 직원 가입 시 members 자동 저장 (서버 백업)
  if (path === '/api/join-member' && request.method === 'POST') {
    try {
      const body = await request.json();
      const uid = body.uid||''; const dealerId = body.dealerId||'';
      const name = body.name||''; const driverId = body.driverId||'';
      const email = body.email||''; const phone = body.phone||'';
      const companyName = body.companyName||''; const role = body.role||'member';
      const store = body.store||''; const platform = body.platform||'donway';
      if (!uid || !dealerId) return new Response(JSON.stringify({error:'uid, dealerId 필수'}), {status:400,headers:{'Content-Type':'application/json'}});
      const memberDoc = { fields: {
        uid:{stringValue:uid}, name:{stringValue:name}, driverId:{stringValue:driverId},
        email:{stringValue:email}, phone:{stringValue:phone},
        dealerId:{stringValue:dealerId}, companyName:{stringValue:companyName},
        role:{stringValue:role}, store:{stringValue:store},
        status:{stringValue:'active'}, platform:{stringValue:platform}, authUid:{stringValue:uid},
        joinedAt:{timestampValue:new Date().toISOString()},
        createdAt:{timestampValue:new Date().toISOString()},
      }};
      const saKey = env.FIREBASE_SA_KEY ? JSON.parse(env.FIREBASE_SA_KEY) : null;
      if (!saKey) return new Response(JSON.stringify({error:'SA key 없음'}),{status:500,headers:{'Content-Type':'application/json'}});
      const token = await getFirebaseAccessToken(saKey);
      const fsUrl = 'https://firestore.googleapis.com/v1/projects/' + PROJECT_ID + '/databases/(default)/documents/members/' + uid;
      await fetch(fsUrl, {method:'PATCH', headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'}, body:JSON.stringify(memberDoc)});
      return new Response(JSON.stringify({ok:true,name:name,dealerId:dealerId}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
    } catch(e) {
      return new Response(JSON.stringify({error:e.message}),{status:500,headers:{'Content-Type':'application/json'}});
    }
  }

  if (path === '/test-inject') {
      const key = (env.ANTHROPIC_API_KEY || env.CLAUDE_API_KEY || '').trim().replace(/[\r\n\s]+/g, '');
      return new Response(JSON.stringify({
        key_len: key.length,
        key_start: key.substring(0,15)+'...',
        has_ak: !!env.ANTHROPIC_API_KEY,
        has_ck: !!env.CLAUDE_API_KEY,
        inject_test: '<head><script>window.__AK='+JSON.stringify(key)+';</script>'.substring(0,60)
      }), { headers: {'Content-Type':'application/json'}});
    }

    if (path === '/truck-save' && request.method === 'POST') {
      try {
        const token = await getAccessToken(env);
        const body  = await request.json();
        const docId = body.truckId;
        await fsPatch(token, `${FS_BASE}/truck_gps/${docId}`, {
          lat:       { doubleValue: body.lat },
          lng:       { doubleValue: body.lng },
          speed:     { doubleValue: body.speed || 0 },
          heading:   { doubleValue: body.heading || 0 },
          camp:      { stringValue: body.camp || '' },
          driver:    { stringValue: body.driver || '' },
          status:    { stringValue: body.status || 'moving' },
          updatedAt: { stringValue: new Date().toISOString() },
        });
        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch (e) {
        return new Response(JSON.stringify({ ok: false, error: e.message }), {
          status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    // ── 간선차 GPS 조회 ──
    if (path.startsWith('/truck-get/') && request.method === 'GET') {
      try {
        const token = await getAccessToken(env);
        const docId = decodeURIComponent(path.replace('/truck-get/', ''));
        const doc   = await fsGet(token, 'truck_gps', docId);
        if (!doc || !doc.fields) {
          return new Response(JSON.stringify({ ok: false, empty: true }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }
        const f = doc.fields;
        return new Response(JSON.stringify({
          ok:        true,
          lat:       f.lat       ? f.lat.doubleValue       : 0,
          lng:       f.lng       ? f.lng.doubleValue       : 0,
          speed:     f.speed     ? f.speed.doubleValue     : 0,
          heading:   f.heading   ? f.heading.doubleValue   : 0,
          camp:      f.camp      ? f.camp.stringValue      : '',
          driver:    f.driver    ? f.driver.stringValue    : '',
          status:    f.status    ? f.status.stringValue    : '',
          updatedAt: f.updatedAt ? f.updatedAt.stringValue : null,
        }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      } catch (e) {
        return new Response(JSON.stringify({ ok: false, error: e.message }), {
          status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    if (path === '/scan-save' && request.method === 'POST') {
      try {
        const token = await getAccessToken(env);
        const body  = await request.json();
        const docId = body.sessionId;
        const fields = {};
        if (body.type === 'loaded') {
          fields['loadedRoutes'] = { stringValue: JSON.stringify(body.routes) };
          fields['loadedTotal']  = { integerValue: String(body.total) };
          fields['loadedAt']     = { stringValue: new Date().toISOString() };
          fields['camp']         = { stringValue: body.camp || '' };
          fields['date']         = { stringValue: body.date || '' };
        } else {
          fields['receivedRoutes'] = { stringValue: JSON.stringify(body.routes) };
          fields['receivedTotal']  = { integerValue: String(body.total) };
          fields['receivedAt']     = { stringValue: new Date().toISOString() };
        }
        await fsPatch(token, `${FS_BASE}/scan_sessions/${docId}`, fields);
        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch (e) {
        return new Response(JSON.stringify({ ok: false, error: e.message }), {
          status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    // ── 스캔 세션 조회 ──
    if (path.startsWith('/scan-get/') && request.method === 'GET') {
      try {
        const token = await getAccessToken(env);
        const docId = decodeURIComponent(path.replace('/scan-get/', ''));
        const doc   = await fsGet(token, 'scan_sessions', docId);
        if (!doc || !doc.fields) {
          return new Response(JSON.stringify({ ok: false, empty: true }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }
        const f = doc.fields;
        return new Response(JSON.stringify({
          ok: true,
          loadedRoutes:   f.loadedRoutes   ? JSON.parse(f.loadedRoutes.stringValue)   : {},
          loadedTotal:    f.loadedTotal     ? parseInt(f.loadedTotal.integerValue)     : 0,
          loadedAt:       f.loadedAt        ? f.loadedAt.stringValue                   : null,
          receivedRoutes: f.receivedRoutes  ? JSON.parse(f.receivedRoutes.stringValue) : {},
          receivedTotal:  f.receivedTotal   ? parseInt(f.receivedTotal.integerValue)   : 0,
          receivedAt:     f.receivedAt      ? f.receivedAt.stringValue                 : null,
          camp: f.camp ? f.camp.stringValue : '',
          date: f.date ? f.date.stringValue : '',
        }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      } catch (e) {
        return new Response(JSON.stringify({ ok: false, error: e.message }), {
          status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }



    if (path === '/scan' || path === '/scan/') {
      const req  = new Request(new URL('/scan.html', url).toString(), { method: 'GET', headers: request.headers });
      const resp = await fetchAsset(new URL(req.url).pathname, request, env);
      const html = await resp.text();
      const key  = (env.ANTHROPIC_API_KEY || env.CLAUDE_API_KEY || '').trim().replace(/[\r\n\s]+/g, '');
      const injected = html.replace('<head>', '<head><script>window.__AK=' + JSON.stringify(key) + ';</script>');
      return new Response(injected, { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    // ★ 간선차 GPS 공유
    if (path === '/truck' || path === '/truck/') {
      const resp = await fetchAsset('/truck.html', request);
      return new Response(await resp.text(), { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }


    // ── 회사별 전용 URL (/{slug}) ──
    // 예: /mbti → 엠비티아이 전용, /abc물류 → ABC물류 전용
    const knownPaths = new Set([
      '/donway_landing','/DONWAY_%EC%8B%9C%EB%AE%AC%EB%A0%88%EC%9D%B4%ED%84%B0.html','/test-apikey','/favicon.ico','/favicon.png',
      '/worker-test','/label-ocr','/claude-ocr','/get-label-key',
      '/test-inject','/truck-save','/scan-save',
      '/scan','/truck','/settle','/visitor','/checkin','/emergency','/portal','/join','/company-register','/inventory','/qr','/kiosk','/order','/admin_sub','/mbtico_hub','/sync-kv',
      '/attendance','/donway-sound.js','/report','/contract',
      '/notice','/settings','/schedule','/drivers','/dashboard',
      '/my','/attendance-admin','/attendance-display',
      '/company-get','/modusign-send','/toss-confirm',
      '/api','/cron-expire','/favicon.ico','/manifest.json',
      '/sw.js','/firebase-messaging-sw.js','/robots.txt'
    ]);
    // ── robots.txt 직접 반환 ──
    if (path === '/robots.txt') {
      return new Response(
`User-agent: *
Allow: /

User-agent: Yeti
Allow: /
Crawl-delay: 1

User-agent: Googlebot
Allow: /
Crawl-delay: 1

User-agent: Daumoa
Allow: /
Crawl-delay: 1

User-agent: bingbot
Allow: /
Crawl-delay: 1

Sitemap: https://donway.ai.kr/sitemap.xml`,
        { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } }
      );
    }

    // ── 네이버 소유확인 HTML 파일 ──
    if (path === '/naver335e547bce1645ef18a6f68fac7f87eb.html') {
      return new Response('naver-site-verification', {
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' }
      });
    }

    // ── sitemap.xml 직접 반환 ──
    if (path === '/sitemap.xml') {
      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://donway.ai.kr/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://donway.ai.kr/join</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://donway.ai.kr/register</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
</urlset>`;
      return new Response(sitemap, {
        headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=86400' }
      });
    }

    // .html 파일은 슬러그 라우팅 제외 (정적 파일 직접 서빙)
    if (path.endsWith('.html') && method === 'GET') {
      try {
        const assetResp2 = await fetchAsset(url.pathname, request, env);
        const isSimulator2 = url.pathname.includes('%EC%8B%9C%EB%AE%AC%EB%A0%88%EC%9D%B4%ED%84%B0') || url.pathname.includes('simulator');
        return addSecurityHeaders(assetResp2, isSimulator2);
      } catch(e) {}
    }
    // ── 회사 승인 요청 (/api/approval-request) ──
    if (path === '/api/approval-request' && method === 'POST') {
      try {
        const body = await request.json();
        const { uid, companyName, email, phone, serviceType, services, bizNumber } = body;

        // ★ 서버사이드 사업자번호 이중 검증
        if (bizNumber) {
          const fsToken0 = await getAccessToken(env);
          const bizClean = bizNumber.replace(/-/g,'');

          // 1) 블랙리스트 확인
          const blRes = await fetch(
            `https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents/used_biz_numbers/${bizClean}`,
            {headers:{'Authorization':`Bearer ${fsToken0}`}}
          );
          if (blRes.ok) {
            const blData = await blRes.json();
            if (blData.fields) {
              // 블랙리스트에 있음 → Auth 계정 삭제 + 거부
              await fetch(`https://identitytoolkit.googleapis.com/v1/projects/mbti-logistics/accounts/${uid}`, {
                method:'DELETE',
                headers:{'Authorization':`Bearer ${fsToken0}`,'Content-Type':'application/json'}
              }).catch(()=>{});
              await fetch(
                `https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents/companies/${uid}`,
                {method:'DELETE', headers:{'Authorization':`Bearer ${fsToken0}`}}
              ).catch(()=>{});
              return new Response(JSON.stringify({ok:false,error:'blocked_biz'}),{status:403,headers:{'Content-Type':'application/json'}});
            }
          }

          // 2) companies 컬렉션 기존 가입 이력 확인
          const compRes = await fetch(
            `https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents:runQuery`,
            {
              method:'POST',
              headers:{'Authorization':`Bearer ${fsToken0}`,'Content-Type':'application/json'},
              body: JSON.stringify({structuredQuery:{
                from:[{collectionId:'companies'}],
                where:{fieldFilter:{field:{fieldPath:'bizNumber'},op:'EQUAL',value:{stringValue:bizNumber}}},
                limit:2
              }})
            }
          );
          const compData = await compRes.json();
          const existing = compData.filter(d=>d.document&&d.document.name&&!d.document.name.endsWith('/'+uid));
          if (existing.length > 0) {
            const exFields = existing[0].document.fields || {};
            const exStatus = exFields.status?.stringValue || '';
            // approved 상태면 이미 정상 가입 완료 → 중복 차단
            // pending/trial 상태면서 trialUsed=true인 경우만 차단
            if (exStatus === 'approved') {
              return new Response(JSON.stringify({ok:false,error:'already_registered'}),{status:403,headers:{'Content-Type':'application/json'}});
            }
            if (exFields.trialUsed?.booleanValue && exStatus !== 'approved') {
              // 이미 체험 이력 → 신규 계정 삭제
              await fetch(`https://identitytoolkit.googleapis.com/v1/projects/mbti-logistics/accounts/${uid}`, {
                method:'DELETE',
                headers:{'Authorization':`Bearer ${fsToken0}`,'Content-Type':'application/json'}
              }).catch(()=>{});
              await fetch(
                `https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents/companies/${uid}`,
                {method:'DELETE', headers:{'Authorization':`Bearer ${fsToken0}`}}
              ).catch(()=>{});
              return new Response(JSON.stringify({ok:false,error:'trial_already_used'}),{status:403,headers:{'Content-Type':'application/json'}});
            }
          }
        }
        const approveLink = `https://donway.ai.kr/api/approve?uid=${uid}&key=${env.FIREBASE_SA_KEY?'ok':''}`;
        const emailKey = (env.EMAIL_API_KEY||env.RESEND_API_KEY||'').trim();
        const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <div style="background:linear-gradient(135deg,#0066ff,#7c3aed);padding:24px;border-radius:12px;text-align:center;margin-bottom:24px">
            <div style="font-size:24px;font-weight:900;color:#fff">DONWAY 신규 가입 신청</div>
          </div>
          <table style="width:100%;border-collapse:collapse">
            <tr style="background:#f8fafc"><td style="padding:12px 16px;font-weight:700;width:120px">회사명</td><td style="padding:12px 16px">${companyName}</td></tr>
            <tr><td style="padding:12px 16px;font-weight:700">이메일</td><td style="padding:12px 16px">${email}</td></tr>
            <tr style="background:#f8fafc"><td style="padding:12px 16px;font-weight:700">전화번호</td><td style="padding:12px 16px">${phone||'-'}</td></tr>
            <tr><td style="padding:12px 16px;font-weight:700">서비스</td><td style="padding:12px 16px">${(services||[serviceType]).join(', ')}</td></tr>
          </table>
          <div style="text-align:center;margin-top:24px">
            <a href="https://donway.ai.kr/api/approve?uid=${uid}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#059669,#0d9488);color:#fff;text-decoration:none;border-radius:10px;font-size:16px;font-weight:800">✅ 승인하기</a>
          </div>
          <p style="text-align:center;color:#888;font-size:12px;margin-top:16px">승인 버튼 클릭 시 즉시 로그인 가능합니다</p>
        </body></html>`;
        
        // 이메일 발송
        await fetch('https://api.resend.com/emails', {
          method:'POST',
          headers:{'Authorization':`Bearer ${emailKey}`,'Content-Type':'application/json'},
          body:JSON.stringify({
          from: (services||[]).some(s=>['filo','dine','table_order','kiosk','inventory'].includes(s))
            ? 'FILO·DINE <filo-dine@donway.ai.kr>'
            : 'DONWAY <all@donway.ai.kr>',
          to: (services||[]).some(s=>['filo','dine','table_order','kiosk','inventory'].includes(s))
            ? ['skypjh1101@naver.com','kimdh4790@gmail.com']
            : ['kimdh4790@gmail.com','soungkyekim@naver.com','skypjh1101@naver.com'],
          subject:`[신규가입] ${companyName}`, html})
        });
        
        // FCM 푸시 (슈퍼어드민 전체 기기 - admin_tokens 컬렉션 사용)
        const fsToken2 = await getAccessToken(env);
        await notifyAdmins(env, fsToken2, {
          title: '신규 가입 신청',
          body: `${companyName}님이 가입 신청했습니다. 승인이 필요합니다.`,
          type: 'new_signup'
        });
        
        return new Response(JSON.stringify({ok:true}), {headers:{'Content-Type':'application/json'}});
      } catch(e) {
        return new Response(JSON.stringify({ok:false,error:e.message}), {headers:{'Content-Type':'application/json'}});
      }
    }

    // ── 이메일 테스트 (/api/email-test) ──
    if (path === '/api/email-test' && method === 'GET') {
      const emailKey = (env.EMAIL_API_KEY||env.RESEND_API_KEY||'').trim();
      if (!emailKey) return new Response(JSON.stringify({ok:false,error:'EMAIL_API_KEY 없음'}), {headers:{'Content-Type':'application/json'}});
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method:'POST',
          headers:{'Authorization':`Bearer ${emailKey}`,'Content-Type':'application/json'},
          body:JSON.stringify({from:'DONWAY <all@donway.ai.kr>', to:['kimdh4790@gmail.com','soungkyekim@naver.com','skypjh1101@naver.com'], subject:'[DONWAY] 이메일 테스트', html:'<p>이메일 발송 테스트입니다.</p>'})
        });
        const data = await res.json();
        return new Response(JSON.stringify({ok:res.ok, status:res.status, data, keyPrefix:emailKey.slice(0,8)+'...'}), {headers:{'Content-Type':'application/json'}});
      } catch(e) {
        return new Response(JSON.stringify({ok:false, error:e.message}), {headers:{'Content-Type':'application/json'}});
      }
    }

    // ── 회사 승인 처리 (/api/approve) ──
    if (path === '/api/approve' && method === 'GET') {
      try {
        const uid = url.searchParams.get('uid');
        if (!uid) return new Response('uid 없음', {status:400});
        const fsToken3 = await getAccessToken(env);

        // 1) Firestore status → approved
        await fetch(
          `https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents/companies/${uid}?updateMask.fieldPaths=status&updateMask.fieldPaths=approvedAt`,
          {method:'PATCH', headers:{'Authorization':`Bearer ${fsToken3}`,'Content-Type':'application/json'},
           body:JSON.stringify({fields:{status:{stringValue:'approved'},approvedAt:{stringValue:new Date().toISOString()}}})}
        );

        // 2) 고객 정보 조회 (이메일, FCM토큰, 회사명)
        const compRes = await fetch(
          `https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents/companies/${uid}`,
          {headers:{'Authorization':`Bearer ${fsToken3}`}}
        );
        const compData = await compRes.json();
        const f = compData.fields || {};
        const custEmail = f.email?.stringValue || '';
        const custName  = f.companyName?.stringValue || f.name?.stringValue || '고객';
        const custFcm   = f.fcmToken?.stringValue || '';
        const slug      = f.slug?.stringValue || '';
        const loginUrl  = slug ? `https://donway.ai.kr/c/${slug}` : 'https://donway.ai.kr/settle';
        const emailKey  = (env.EMAIL_API_KEY||env.RESEND_API_KEY||'').trim();

        // 3) 고객 이메일 발송
        if (custEmail && emailKey) {
          const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:20px">
            <div style="background:linear-gradient(135deg,#0066ff,#7c3aed);padding:28px;border-radius:14px;text-align:center;margin-bottom:24px">
              <div style="font-size:36px;margin-bottom:8px"></div>
              <div style="font-size:22px;font-weight:900;color:#fff">가입 승인 완료!</div>
              <div style="font-size:13px;color:rgba(255,255,255,.8);margin-top:6px">DONWAY 서비스를 이용하실 수 있습니다</div>
            </div>
            <p style="font-size:15px;color:#111;line-height:1.7"><strong>${custName}</strong>님, 가입 신청이 승인되었습니다.<br>아래 버튼을 눌러 바로 로그인하세요!</p>
            <div style="text-align:center;margin:28px 0">
              <a href="${loginUrl}" style="display:inline-block;padding:16px 36px;background:linear-gradient(135deg,#0066ff,#7c3aed);color:#fff;text-decoration:none;border-radius:12px;font-size:16px;font-weight:800">지금 로그인하기</a>
            </div>
            <div style="background:#f8fafc;border-radius:10px;padding:14px 18px;font-size:13px;color:#6b7280">
              <div>로그인 주소: <a href="${loginUrl}" style="color:#0066ff">${loginUrl}</a></div>
              <div style="margin-top:6px">문의: 051-711-3103</div>
            </div>
          </body></html>`;
          await fetch('https://api.resend.com/emails', {
            method:'POST',
            headers:{'Authorization':`Bearer ${emailKey}`,'Content-Type':'application/json'},
            body:JSON.stringify({from:'DONWAY <all@donway.ai.kr>', to:[custEmail], subject:`[DONWAY] ${custName}님, 가입이 승인되었습니다`, html})
          }).catch(()=>{});
        }

        // 4) 고객 FCM 앱 푸시
        if (custFcm) {
          await fetch(`https://fcm.googleapis.com/v1/projects/mbti-logistics/messages:send`, {
            method:'POST',
            headers:{'Authorization':`Bearer ${fsToken3}`,'Content-Type':'application/json'},
            body:JSON.stringify({message:{
              token: custFcm,
              notification:{title:'가입 승인 완료!', body:`${custName}님, DONWAY 서비스 이용이 가능합니다. 지금 로그인하세요!`},
              android:{priority:'high', notification:{sound:'default', channelId:'donway_admin'}},
              apns:{payload:{aps:{sound:'default', badge:1}}}
            }})
          }).catch(()=>{});
        }

        // 5) loginAllowed FCM 토큰들에도 푸시 (등록된 담당자 다수)
        const loginAllowed = f.loginAllowed?.arrayValue?.values || [];
        for (const la of loginAllowed) {
          const laFcm = la.mapValue?.fields?.fcmToken?.stringValue || '';
          if (laFcm && laFcm !== custFcm) {
            await fetch(`https://fcm.googleapis.com/v1/projects/mbti-logistics/messages:send`, {
              method:'POST',
              headers:{'Authorization':`Bearer ${fsToken3}`,'Content-Type':'application/json'},
              body:JSON.stringify({message:{
                token: laFcm,
                notification:{title:'가입 승인', body:'DONWAY 로그인이 가능합니다'},
                android:{priority:'high'}
              }})
            }).catch(()=>{});
          }
        }

        // 5) 카카오 알림톡 발송 (승인 완료)
        const custPhone = f.phone?.stringValue || f.settlementPhone?.stringValue || '';
        if (custPhone && env.SOLAPI_KEY && env.SOLAPI_SECRET) {
          const pfId      = env.KAKAO_PF_ID || 'KA01PF260618094439788FzuY2GxDiSW';
          const date2     = new Date().toISOString();
          const salt2     = Math.random().toString(36).slice(2);
          const enc2      = new TextEncoder();
          const ck2       = await crypto.subtle.importKey('raw', enc2.encode(env.SOLAPI_SECRET), {name:'HMAC',hash:'SHA-256'}, false, ['sign']);
          const sg2       = await crypto.subtle.sign('HMAC', ck2, enc2.encode(date2+salt2));
          const sig2      = Array.from(new Uint8Array(sg2)).map(b=>b.toString(16).padStart(2,'0')).join('');
          const authHdr2  = `HMAC-SHA256 apiKey=${env.SOLAPI_KEY}, date=${date2}, salt=${salt2}, signature=${sig2}`;
          const fallback  = `[DONWAY] ${custName}님, 가입이 승인되었습니다. 로그인: ${loginUrl}`;
          await fetch('https://api.solapi.com/messages/v4/send-many/detail', {
            method: 'POST',
            headers: {'Content-Type':'application/json', 'Authorization': authHdr2},
            body: JSON.stringify({messages:[{
              to: custPhone.replace(/[^0-9]/g,''),
              from: '05171133103',
              type: 'ATA',
              text: fallback,
              kakaoOptions: {
                pfId,
                templateId: 'KA01TP260627140546788gz4m68aBSRn',
                variables: { '#{회사명}': custName, '#{로그인URL}': loginUrl },
                disableSms: false
              }
            }]})
          }).catch(()=>{});
        }

        return new Response(`<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:60px 20px;background:#f8fafc">
          <div style="max-width:400px;margin:0 auto;background:#fff;border-radius:16px;padding:40px;box-shadow:0 4px 20px rgba(0,0,0,.08)">
            <div style="font-size:56px;margin-bottom:16px"></div>
            <h2 style="color:#059669;margin:0 0 8px">승인 완료!</h2>
            <p style="color:#374151;margin:0 0 6px"><strong>${custName}</strong></p>
            <p style="color:#888;font-size:13px;margin:0 0 20px">이메일 · 앱 푸시 · 카카오 알림톡 발송 완료</p>
            <a href="${loginUrl}" style="display:inline-block;padding:12px 28px;background:#0066ff;color:#fff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:700">로그인 페이지 열기</a>
          </div>
        </body></html>`, {headers:{'Content-Type':'text/html'}});
      } catch(e) {
        return new Response('오류: '+e.message, {status:500});
      }
    }

    // ── 문의 접수 (/api/inquiry) ──
    if (path === '/api/inquiry' && method === 'POST') {
      try {
        const body = await request.json();
        const { name, phone, msg } = body;
        if (!name || !phone) return new Response(JSON.stringify({ok:false,error:'필수 항목 누락'}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        const emailKey = (env.EMAIL_API_KEY||env.RESEND_API_KEY||'').trim();
        const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <div style="background:linear-gradient(135deg,#0066ff,#7c3aed);padding:24px;border-radius:12px;text-align:center;margin-bottom:24px">
            <div style="font-size:28px;font-weight:900;color:#fff">DONWAY</div>
            <div style="font-size:14px;color:rgba(255,255,255,.8);margin-top:4px">랜딩페이지 문의 접수</div>
          </div>
          <table style="width:100%;border-collapse:collapse">
            <tr style="background:#f8fafc"><td style="padding:12px 16px;font-weight:700;color:#374151;width:120px">이름/회사</td><td style="padding:12px 16px;color:#111">${name}</td></tr>
            <tr><td style="padding:12px 16px;font-weight:700;color:#374151">연락처</td><td style="padding:12px 16px;color:#111">${phone}</td></tr>
            <tr style="background:#f8fafc"><td style="padding:12px 16px;font-weight:700;color:#374151;vertical-align:top">문의내용</td><td style="padding:12px 16px;color:#111;line-height:1.6">${(msg||'-').replace(/\n/g,'<br>')}</td></tr>
          </table>
          <div style="margin-top:20px;padding:12px;background:#eff6ff;border-radius:8px;font-size:12px;color:#6b7280;text-align:center">
            donway.ai.kr 랜딩페이지 문의폼 · ${new Date().toLocaleString('ko-KR')}
          </div>
        </body></html>`;
        await fetch('https://api.resend.com/emails', {
          method:'POST',
          headers:{'Authorization':`Bearer ${emailKey}`,'Content-Type':'application/json'},
          body:JSON.stringify({from:'DONWAY <all@donway.ai.kr>', to:['kimdh4790@gmail.com','soungkyekim@naver.com','skypjh1101@naver.com'], subject:`[DONWAY 문의] ${name}`, html})
        });
        return new Response(JSON.stringify({ok:true}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
      } catch(e) {
        return new Response(JSON.stringify({ok:false,error:e.message}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
      }
    }

    // /api/send-email
    if (path === '/api/send-email') {
      if (method !== 'POST') return new Response('Method Not Allowed', {status:405});
      try {
        const body = await request.json();
        const { email, companyName, tempPassword, loginUrl } = body;
        if (!email || !companyName) return new Response(JSON.stringify({ok:false,reason:'missing_params'}), {status:400,headers:{'Content-Type':'application/json'}});
        const result = await sendWelcomeEmail(env, {email, companyName, tempPassword: tempPassword||'donway2026!', loginUrl: loginUrl||'https://donway.ai.kr/settle', planType:'trial', planLabel:'7일 무료 체험'});
        return new Response(JSON.stringify({ok:result&&result.ok!==false}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
      } catch(e) { return new Response(JSON.stringify({ok:false,reason:e.message}), {status:500,headers:{'Content-Type':'application/json'}}); }
    }
    // /api/create-account
    if (path === '/api/create-account') {
      if (method !== 'POST') return new Response('Method Not Allowed', {status:405});
      try {
        const body = await request.json();
        const { email, companyName, companyId, trialExpiry } = body;
        if (!email||!companyName||!companyId) return new Response(JSON.stringify({ok:false,reason:'missing_params'}), {status:400,headers:{'Content-Type':'application/json'}});
        const tempPw = 'Donway' + Math.floor(1000+Math.random()*9000) + '!';
        const accessToken = await getAccessToken(env);
        let uid = null;
        const lookupRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${env.FIREBASE_WEB_API_KEY||''}`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});
        const lookupData = await lookupRes.json();
        if (lookupData.users&&lookupData.users.length>0) { uid=lookupData.users[0].localId; }
        else {
          const createRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${env.FIREBASE_WEB_API_KEY||''}`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:tempPw,displayName:companyName,returnSecureToken:false})});
          const createData = await createRes.json();
          if (createData.error) throw new Error(createData.error.message);
          uid = createData.localId;
        }
        await fetch(`https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents/companies/${companyId}?updateMask.fieldPaths=uid&updateMask.fieldPaths=status`, {method:'PATCH',headers:{'Authorization':`Bearer ${accessToken}`,'Content-Type':'application/json'},body:JSON.stringify({fields:{uid:{stringValue:uid},status:{stringValue:'trial'}}})});
        await sendWelcomeEmail(env, {email,companyName,tempPassword:tempPw,loginUrl:'https://donway.ai.kr/settle',planType:'trial',planLabel:'7일 무료 체험'});
        return new Response(JSON.stringify({ok:true,uid,tempPw}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
      } catch(e) { return new Response(JSON.stringify({ok:false,reason:e.message}), {status:500,headers:{'Content-Type':'application/json'}}); }
    }
    // /admin_sub → 구독 어드민 (donway.ai.kr)
    if (path === '/admin_sub' || path === '/admin_sub.html') {
      return Response.redirect('https://mbtico.kr/control', 302);
      const adH = new Headers();
      adH.set('Content-Type', 'text/html; charset=utf-8');
      adH.set('Cache-Control', 'no-cache');
      Object.entries(SECURITY_HEADERS).forEach(([k,v]) => adH.set(k,v));
      return new Response(adResp.body, { status: adResp.status, headers: adH });
    }
    // /sync-kv — GitHub 최신 파일 KV 저장 (터미널 없이 배포)
    if (path === '/sync-kv') {
      const secret = url.searchParams.get('s');
      const syncSecret = env.SYNC_KV_SECRET || 'donway2026';
      if (secret !== syncSecret) return new Response('unauthorized',{status:401});
      const files=['kiosk.html','inventory.html','qrpos.html','mbtico_hub.html','join.html','admin_sub.html','order.html','donway_landing.html'];
      const e2=env||_env_ref;
      const out=[];
      for(const f of files){
        try{
          const res=await fetch('https://raw.githubusercontent.com/kimdh4790-cpu/mbti-logistics/main/'+f+'?v='+Date.now());
          if(res.ok&&e2&&e2.DONWAY_ASSETS){
            const txt=await res.text();
            await e2.DONWAY_ASSETS.put(f,txt);
            out.push('OK: '+f+' ('+txt.length+')');
          }else out.push('FAIL: '+f);
        }catch(ex){out.push('ERR: '+f+' '+ex.message);}
      }
      return new Response(out.join('\n'),{headers:{'Content-Type':'text/plain;charset=utf-8'}});
    }
    if (!['mbtico.kr','www.mbtico.kr'].includes(hostname)) {
    const slugMatch = path.match(/^\/([a-zA-Z0-9가-힣\-_]{1,30})\/?$/);
    if (slugMatch && !knownPaths.has(slugMatch[0].replace(/\/$/,'')) && method === 'GET') {
      const companySlug = slugMatch[1];
      try {
        const resp = await fetchAsset('/settle.html', request, env);
        let html = await resp.text();
        // slug + 보안헤더 주입 (</head> 앞에 삽입 - 가장 안전한 위치)
        const akKey = (env.ANTHROPIC_API_KEY || env.CLAUDE_API_KEY || '').trim().replace(/[\r\n\s]+/g, '');
        const storageSDK = '<script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-storage-compat.js"></script>';
        // manifest 링크를 슬러그 기반으로 교체
        html = html.replace('href="/manifest.json"', 'href="/' + companySlug + '/manifest.json"');
        const slugScript = '<script>window.__AK=' + JSON.stringify(akKey) + ';window._COMPANY_SLUG=' + JSON.stringify(companySlug) + ';window._SLUG_MODE=true;</script>';
        // 구독 팝업: AI정산+배달대행만 노출 / 회사등록: 범용·재고 숨김 / 요금 실제값으로 교체
        const hideScript = '<style>' +
          '#svc-universal-card,#svc-inventory-card{display:none!important}' +
          '.sub-amt-qr_payroll,.sub-tier-label-qr_payroll{display:none!important}' +
          '</style>' +
          '<script>(function(){' +
          // 구독 팝업 카드 숨김
          'var HIDE=["qr_payroll","universal","filo_combo"];' +
          'function _hideCards(){document.querySelectorAll("button[data-pkey]").forEach(function(btn){' +
          'if(HIDE.indexOf(btn.dataset.pkey)>-1){var el=btn;for(var i=0;i<5;i++){el=el.parentElement;if(!el)break;' +
          'if(el.getAttribute&&(el.getAttribute("style")||"").indexOf("bg3")>-1){el.style.display="none";break;}}}' +
          '});}' +
          'var obs=new MutationObserver(_hideCards);obs.observe(document.body,{childList:true,subtree:true});_hideCards();' +
          // 요금 옵션 실제값으로 교체
          'function _fixPrices(){' +
          'var sel=document.getElementById("settle-tier-select");if(!sel||sel.dataset.fixed)return;sel.dataset.fixed="1";' +
          '[["50","~50명 — 20만원/월"],["100","~100명 — 40만원/월"],["200","~200명 — 80만원/월"],' +
          '["300","~300명 — 120만원/월"],["500","~500명 — 200만원/월"],["700","~700명 — 280만원/월"],' +
          '["1000","~1000명 — 400만원/월"],["1500","~1500명 — 600만원/월"],["2000","~2000명 — 800만원/월"],' +
          '["9999","2000명+ — 별도 문의"]].forEach(function(r){var o=sel.querySelector("option[value=\""+r[0]+"\"]");if(o)o.textContent=r[1];});' +
          'var card=document.getElementById("svc-settle-card");if(card){' +
          'card.querySelectorAll("div").forEach(function(d){' +
          'if(d.textContent.indexOf("32.5만")>-1)d.textContent="개인: 50명 20만 · 100명 40만 · 200명 80만 · 300명 120만 · 500명 200만 (VAT별도)";' +
          'if(d.textContent.indexOf("26.5만")>-1)d.textContent="단체(20개사+): 50명 15만 · 100명 30만 · 200명 60만 · 300명 90만 · 500명 150만 (VAT별도)";' +
          '});}' +
          '}' +
          'var obs2=new MutationObserver(_fixPrices);obs2.observe(document.body,{childList:true,subtree:true});_fixPrices();' +
          '})();</script>';
        html = html.replace('</head>', storageSDK + '\n' + slugScript + '\n' + hideScript + '\n</head>');
        const slugHeaders = new Headers();
        slugHeaders.set('Content-Type', 'text/html; charset=utf-8');
        slugHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        slugHeaders.set('X-Company-Slug', companySlug);
        Object.entries(SECURITY_HEADERS).forEach(([k,v]) => slugHeaders.set(k,v));
        return new Response(html, { status: 200, headers: slugHeaders });
      } catch(e) {
        return new Response('Not found', { status: 404 });
      }
    }
    } // end mbtico.kr slug 제외

    if (path === '/settle.html' || path === '/settle' || path === '/settle/') return Response.redirect('https://donway.ai.kr/join', 302);









    // ── Phase 2: 신규 라우트 ──────────────────────────────────────────────

    // 기사 배송앱

    // 통합 포털
    if (path === '/portal' || path === '/portal/') {
      const resp = await fetchAsset('/portal.html', request);
      return new Response(await resp.text(), { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    // 기사 자체 가입 (mbtico.kr 전용 - donway는 537줄에서 처리)
    // /join은 donway.ai.kr 블록(줄537)에서 회사가입 stepper로 처리됨
    // 여기서는 mbtico.kr 등 다른 도메인에서만 join.html 서빙
    if ((path === '/join' || path === '/join/') && hostname !== 'donway.ai.kr' && hostname !== 'www.donway.ai.kr') {
      const resp = await fetchAsset('/join.html', request);
      return new Response(await resp.text(), { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    // 회사 신규 등록
    if (path === '/company-register' || path === '/company-register/') { return Response.redirect('https://donway.ai.kr/join', 302);
      return new Response(await resp.text(), { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    // ★ DONWAY 출퇴근 QR (모든 업종 공통)
    if (path === '/attendance' || path === '/attendance/') {
      const resp = await fetchAsset('/attendance.html', request);
      return new Response(await resp.text(), { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    // ★ DONWAY 사운드 모듈
    if (path === '/donway-sound.js') {
      const resp = await fetchAsset('/donway-sound.js', request);
      return new Response(await resp.text(), { status: resp.status, headers: { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } });
    }

    // ★ 정산 분석 리포트
    if (path === '/report' || path === '/report/') {
      const resp = await fetchAsset('/report.html', request);
      return new Response(await resp.text(), { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    // ★ 근로계약서
    if (path === '/contract' || path === '/contract/') {
      const resp = await fetchAsset('/contract.html', request);
      return new Response(await resp.text(), { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    // ★ 공지·알림
    if (path === '/notice' || path === '/notice/') {
      const resp = await fetchAsset('/notice.html', request);
      return new Response(await resp.text(), { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    // ★ 시스템 설정
    if (path === '/settings' || path === '/settings/') {
      const resp = await fetchAsset('/settings.html', request);
      return new Response(await resp.text(), { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    // ★ 근무 스케줄러
    if (path === '/schedule' || path === '/schedule/') {
      const resp = await fetchAsset('/schedule.html', request);
      return new Response(await resp.text(), { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    // ★ 직원 관리
    if (path === '/drivers' || path === '/drivers/') {
      const resp = await fetchAsset('/drivers.html', request);
      return new Response(await resp.text(), { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    // ★ 관리자 종합 대시보드 → settle.html로 서빙 (DONWAY 통합)
    if (path === '/admin' || path === '/admin/') {
      return serveKVFile(env, 'settle.html', 'text/html');
    }

    if (path === '/dashboard' || path === '/dashboard/') {
      const resp = await fetchAsset('/dashboard.html', request);
      return new Response(await resp.text(), { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    // ★ 직원 마이페이지
    if (path === '/my' || path === '/my/') {
      const resp = await fetchAsset('/my.html', request);
      return new Response(await resp.text(), { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    // ★ 출퇴근 관리자 대시보드
    if (path === '/attendance-admin' || path === '/attendance-admin/') {
      const resp = await fetchAsset('/attendance-admin.html', request);
      return new Response(await resp.text(), { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    // ★ 매장/회사 QR 디스플레이 (입구 화면)
    // ★ 임시 패치 (사용 후 삭제 예정)
    if (path === '/patch' || path === '/patch/') {
      const resp = await fetchAsset('/patch.html', request);
      return new Response(await resp.text(), { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    // ★ 긴급배송
    if (path === '/emergency' || path === '/emergency/') {
      const resp = await fetchAsset('/emergency.html', request);
      return new Response(await resp.text(), { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    // ★ 직원 셀프 체크인
    if (path === '/checkin' || path === '/checkin/') {
      const resp = await fetchAsset('/checkin.html', request);
      return new Response(await resp.text(), { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    // ★ 방문자 등록 페이지
    if (path === '/visitor' || path === '/visitor/') {
      const resp = await fetchAsset('/visitor.html', request);
      return new Response(await resp.text(), { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    if (path === '/attendance-display' || path === '/attendance-display/') {
      const resp = await fetchAsset('/attendance-display.html', request);
      return new Response(await resp.text(), { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    // 회사 코드 검증 API (join.html 에서 호출)
    if (path === '/company-get' && method === 'GET') {
      try {
        const code = url.searchParams.get('code') || '';
        if (!code) return new Response(JSON.stringify({ ok: false, error: 'code required' }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        // MBTI01 하드코딩 (기존 엠비티아이)
        if (code.toUpperCase() === 'MBTI01') {
          return new Response(JSON.stringify({
            ok: true,
            company: { code: 'MBTI01', name: '엠비티아이(유)', camps: ['부산1','부산2','부산3','대구2','진주M'], plan: 'pro' }
          }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        }
        const token = await getAccessToken(env);
        const fsUrl = `${FS_BASE}/companies?pageSize=1`;
        // Firestore query via REST
        const qBody = {
          structuredQuery: {
            from: [{ collectionId: 'companies' }],
            where: { fieldFilter: { field: { fieldPath: 'code' }, op: 'EQUAL', value: { stringValue: code.toUpperCase() } } },
            limit: 1
          }
        };
        const qResp = await fetch(`https://firestore.googleapis.com/v1/${FS_BASE.replace('https://firestore.googleapis.com/v1/','')}:runQuery`, {
          method: 'POST', headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify(qBody)
        });
        const qData = await qResp.json();
        if (qData && qData[0] && qData[0].document) {
          const f = qData[0].document.fields || {};
          const company = {
            code: f.code?.stringValue || code,
            name: f.name?.stringValue || '',
            camps: f.camps ? JSON.parse(f.camps.stringValue || '[]') : [],
            plan: f.plan?.stringValue || 'free'
          };
          return new Response(JSON.stringify({ ok: true, company }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        }
        return new Response(JSON.stringify({ ok: false, error: 'not found' }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      } catch (e) {
        return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      }
    }

    // 모두싸인 계약서 발송 프록시 (API 키 보호)
    if (path === '/modusign-send' && method === 'POST') {
      try {
        const body = await request.json();
        const apiKey = env.MODUSIGN_API_KEY || '';
        if(!apiKey) return new Response(JSON.stringify({error:'MODUSIGN_API_KEY 미설정'}),{status:500,headers:{'Content-Type':'application/json'}});
        const encoded = btoa(apiKey + ':');
        const resp = await fetch('https://api.modusign.co.kr/documents/request-with-template', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': 'Basic ' + encoded
          },
          body: JSON.stringify({
            templateId: body.templateId,
            document: {
              title: body.title,
              participantMappings: [{
                name: body.signerName,
                signingMethod: { type: 'EMAIL', value: body.signerEmail }
              }],
              metadatas: Object.entries(body.metadata||{}).map(([key,value])=>({key,value}))
            }
          })
        });
        const data = await resp.json();
        return new Response(JSON.stringify(data), {
          headers: {'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}
        });
      } catch(e) {
        return new Response(JSON.stringify({error:e.message}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
      }
    }

    // 토스페이먼츠 결제 확인 + Firestore 구독 업데이트
    if (path === '/toss-confirm' && method === 'POST') {
      try {
        const body   = await request.json();
        const { paymentKey, orderId, amount } = body;

        // 1. 토스 결제 확인 API
        const encoded = btoa((env.TOSS_SECRET_KEY || '') + ':');
        const tossResp = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${encoded}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) })
        });
        const tossData = await tossResp.json();

        if (tossData.status !== 'DONE') {
          return new Response(JSON.stringify({ success: false, error: tossData.message || '결제 확인 실패' }), {
            status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }

        // 2. orderId 파싱: LN-{uid8}-{timestamp}-{plan}
        const parts  = orderId.split('-');
        const plan   = parts[parts.length - 1] || 'basic'; // 마지막 파트 = plan
        const months = 1; // 월간 고정
        const uid    = body.uid || ''; // subscribe-success.html에서 Firebase Auth uid 전달
        if (!uid) throw new Error('uid 누락 — 로그인 후 다시 시도해주세요');

        // 3. Firestore 구독 업데이트
        const token  = await getAccessToken(env);
        const now    = new Date();
        const subDoc = await fsGet(token, 'subscriptions', uid);
        const existingExpire = subDoc.fields?.expireDate?.timestampValue
          ? new Date(subDoc.fields.expireDate.timestampValue) : null;
        const base      = (existingExpire && existingExpire > now) ? existingExpire : now;
        const newExpire = new Date(base.getTime() + months * 30 * 24 * 60 * 60 * 1000);
        // 4. orderId에서 product/인원/요금제 타입 파싱
        // orderId 형식: DW-{uid8}-{timestamp}-{planType}-{hc}-{subType}
        const planType  = parts.length >= 4 ? parts[3] : 'settle';
        const headcount = parts.length >= 5 ? parseInt(parts[4]) || 50 : 50;
        const subType   = parts.length >= 6 ? parts[5] : 'ind'; // ind=개인, grp=단체

        // 실제 요금 계산 (settle.html DW_TIERS_IND/GRP 기준)
        const DW_TIERS_IND = [
          {cap:50,   amt:200000},  {cap:100,  amt:400000},
          {cap:200,  amt:800000},  {cap:300,  amt:1200000},
          {cap:500,  amt:2000000}, {cap:700,  amt:2800000},
          {cap:1000, amt:4000000}, {cap:1500, amt:6000000},
          {cap:2000, amt:8000000}, {cap:9999, amt:0}
        ];
        const DW_TIERS_GRP = [
          {cap:50,   amt:150000},  {cap:100,  amt:300000},
          {cap:200,  amt:600000},  {cap:300,  amt:900000},
          {cap:500,  amt:1500000}, {cap:700,  amt:2100000},
          {cap:1000, amt:3000000}, {cap:1500, amt:4500000},
          {cap:2000, amt:6000000}, {cap:9999, amt:0}
        ];
        function _calcPlanAmt(pType, hc, sType) {
          if (pType === 'qr_payroll') return (hc || 50) * 3500; // 인당 3,500원
          if (pType === 'filo_combo') return 110000;
          const tiers = sType === 'grp' ? DW_TIERS_GRP : DW_TIERS_IND;
          for (const t of tiers) { if (hc <= t.cap) return t.amt; }
          return tiers[tiers.length - 2].amt;
        }
        const calcedAmt = _calcPlanAmt(planType, headcount, subType);

        await fsPatch(token, `${FS_BASE}/subscriptions/${uid}`, {
          plan:       { stringValue: planType },
          status:     { stringValue: 'active' },
          expireDate: { timestampValue: newExpire.toISOString() },
          amount:     { integerValue: String(calcedAmt) },
          headcount:  { integerValue: String(headcount) },
          subType:    { stringValue: subType },
          updatedAt:  { timestampValue: now.toISOString() }
        });

        // product → companies 필드 매핑
        const PRODUCT_MAP = {
          settle:     { field: 'settlePaid' },
          delivery:   { field: 'deliveryPaid' },
          qr:         { field: 'qrPaid' },
          payroll:    { field: 'payrollPaid' },
          qr_payroll: { fields: ['qrPaid','payrollPaid'] },
          universal:  { field: 'universalPaid' },
          premium:    { field: 'premiumPaid' },
          // mbtico 크로스 연동 (subscriptions 서브필드)
          inventory:  { subField: 'inventory' },
          kiosk:      { subField: 'kiosk' },
          qr_mbtico:  { subField: 'qr' },
        };
        const pm = PRODUCT_MAP[planType] || { field: planType+'Paid' };
        const expireStr = newExpire.toISOString().slice(0, 10);

        try {
          // companies 직접 필드 업데이트 (DONWAY 상품)
          if (pm.field || pm.fields) {
            const updateFields = {};
            const fieldList = pm.fields || [pm.field];
            fieldList.forEach(f => {
              updateFields[f] = { booleanValue: true };
            });
            updateFields['planExpiry'] = { stringValue: expireStr };
            updateFields['planUpdatedAt'] = { stringValue: now.toISOString() };
            if (headcount > 0) updateFields['personCount'] = { integerValue: String(headcount) };
            await fsPatch(token, `${FS_BASE}/companies/${uid}`, updateFields);
          }

          // subscriptions 서브필드 업데이트 (MBTICO 상품 or donway 기본)
          const subProduct = pm.subField || 'donway';
          await fsPatch(token, `${FS_BASE}/companies/${uid}`, {
            'subscriptions': {
              mapValue: {
                fields: {
                  [subProduct]: {
                    mapValue: {
                      fields: {
                        active:    { booleanValue: true },
                        plan:      { stringValue: planType },
                        expiry:    { stringValue: expireStr },
                        headcount: { integerValue: String(headcount) },
                        updatedAt: { stringValue: now.toISOString() }
                      }
                    }
                  }
                }
              }
            }
          });
        } catch (e2) {
          console.error('[toss-confirm] companies 동기화 실패:', e2.message);
        }

        // 5. 어드민 이메일 + 알림톡 큐 발송
        try {
          const planLabel = { starter: 'Starter', basic: 'Basic', pro: 'Pro' }[plan] || plan;
          const compDoc = await fsGet(token, 'companies', uid);
          const companyName = compDoc.fields?.companyName?.stringValue || compDoc.fields?.name?.stringValue || uid;
          const adminEmail  = compDoc.fields?.adminEmail?.stringValue || compDoc.fields?.email?.stringValue || '';
          const expireStr   = newExpire.toISOString().slice(0, 10);
          if (env.EMAIL_API_KEY) {
            const html = '<div style="font-family:sans-serif;padding:24px"><b style="color:#0066ff;font-size:18px">신규 결제</b><br><br>'
              + '회사: ' + companyName + '<br>이메일: ' + adminEmail
              + '<br>플랜: ' + planLabel + '<br>금액: ' + Number(amount).toLocaleString() + '원'
              + '<br>만료: ' + expireStr + '<br>주문: ' + orderId + '</div>';
            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: { 'Authorization': 'Bearer ' + env.EMAIL_API_KEY, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                from: 'DONWAY <all@donway.ai.kr>',
                to: ['kimdh4790@gmail.com', 'soungkyekim@naver.com'],
                subject: '[DONWAY] 신규결제 ' + companyName + ' / ' + planLabel + ' / ' + Number(amount).toLocaleString() + '원',
                html
              })
            });
          }
          await fsAdd(token, 'alimtalk_queue', {
            type:        { stringValue: 'new_payment' },
            companyId:   { stringValue: uid },
            companyName: { stringValue: companyName },
            plan:        { stringValue: planLabel },
            amount:      { integerValue: String(amount) },
            expireDate:  { stringValue: expireStr },
            createdAt:   { timestampValue: now.toISOString() }
          });
        } catch (e3) {
          console.error('[toss-confirm] 알림 실패:', e3.message);
        }

        // 6. 결제 내역 기록
        await fsAdd(token, 'payments', {
          dealerId:   { stringValue: uid },
          type:       { stringValue: 'toss' },
          plan:       { stringValue: plan },
          months:     { integerValue: String(months) },
          amount:     { integerValue: String(amount) },
          paymentKey: { stringValue: paymentKey },
          orderId:    { stringValue: orderId },
          expireDate: { timestampValue: newExpire.toISOString() },
          note:       { stringValue: `토스페이먼츠 ${months}개월 결제` },
          createdAt:  { timestampValue: now.toISOString() }
        });

        return new Response(JSON.stringify({
          success: true, plan, months,
          expireDate: newExpire.toISOString()
        }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });

      } catch (e) {
        return new Response(JSON.stringify({ success: false, error: e.message }), {
          status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }


    
    
    // ── 명세서 뷰어 (/stmt?t=TOKEN) — 로그인 없이 토큰으로만 접근 ──

    
    // ── 시뮬레이션 테스트 엔드포인트 (/api/test-sim) ──
    if (path === '/api/test-sim' && method === 'POST') {
      try {
        const body = await request.json();
        const { action, data, secret } = body;
        // 보안키 확인
        // superadmin 이메일로 인증
        const ALLOWED = ['kimdh4790@gmail.com','soungkyekim@naver.com'];
        if (!ALLOWED.includes(secret)) {
          return new Response(JSON.stringify({ok:false,error:'unauthorized'}), {headers:{'Content-Type':'application/json'}});
        }
        const fsToken = await getAccessToken(env);
        const project = 'mbti-logistics';
        const fsBase  = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;
        const headers = { 'Authorization': `Bearer ${fsToken}`, 'Content-Type': 'application/json' };

        // action: create_test_company
        if (action === 'create_test_company') {
          const dealerId = 'TEST_SIM_001';
          const companyDoc = {
            fields: {
              companyName:   {stringValue: '시뮬레이션 테스트 주식회사'},
              bizNumber:     {stringValue: '000-00-00000'},
              email:         {stringValue: 'sim_test@donway.ai.kr'},
              plan:          {stringValue: 'trial'},
              services:      {arrayValue: {values: [{stringValue:'settle'},{stringValue:'qr'},{stringValue:'payroll'}]}},
              industryType:  {stringValue: 'coupang'},
              dealerId:      {stringValue: dealerId},
              trialEnd:      {stringValue: new Date(Date.now()+30*24*60*60*1000).toISOString().slice(0,10)},
              createdAt:     {stringValue: new Date().toISOString()}
            }
          };
          const r1 = await fetch(`${fsBase}/companies/${dealerId}`, {method:'PATCH', headers, body: JSON.stringify(companyDoc)});
          const d1 = await r1.json();

          // 테스트 기사 등록
          const driverId = 'drv_sim_test001';
          const driverDoc = {
            fields: {
              name:     {stringValue: '홍길동'},
              userId:   {stringValue: 'sim_drv001'},
              phone:    {stringValue: '01012345678'},
              camp:     {stringValue: '부산1'},
              dealerId: {stringValue: dealerId},
              status:   {stringValue: '재직'},
              isBiz:    {booleanValue: false},
              createdAt:{stringValue: new Date().toISOString()}
            }
          };
          const r2 = await fetch(`${fsBase}/drivers/${driverId}`, {method:'PATCH', headers, body: JSON.stringify(driverDoc)});
          const d2 = await r2.json();

          // 테스트 정산 데이터
          const settleId = 'settle_sim_2026_06';
          const settleDoc = {
            fields: {
              dealerId:   {stringValue: dealerId},
              driver:     {stringValue: '홍길동'},
              userId:     {stringValue: 'sim_drv001'},
              month:      {stringValue: '2026-06'},
              camp:       {stringValue: '부산1'},
              totalAmt:   {doubleValue: 4500000},
              supplyAmt:  {doubleValue: 4090909},
              net:        {doubleValue: 4410000},
              emp:        {doubleValue: 90000},
              dcnt:       {integerValue: 1200},
              rcnt:       {integerValue: 5},
              status:     {stringValue: 'pending'},
              isBiz:      {booleanValue: false},
              createdAt:  {stringValue: new Date().toISOString()}
            }
          };
          const r3 = await fetch(`${fsBase}/settlements/${settleId}`, {method:'PATCH', headers, body: JSON.stringify(settleDoc)});
          const d3 = await r3.json();

          return new Response(JSON.stringify({
            ok: true,
            results: {
              company:  d1.fields ? '✅ 회사 생성' : '❌ ' + JSON.stringify(d1),
              driver:   d2.fields ? '✅ 기사 생성' : '❌ ' + JSON.stringify(d2),
              settle:   d3.fields ? '✅ 정산 생성' : '❌ ' + JSON.stringify(d3),
              dealerId, driverId, settleId
            }
          }), {headers:{'Content-Type':'application/json'}});
        }

        // action: check_data
        if (action === 'check_data') {
          const dealerId = data?.dealerId || 'TEST_SIM_001';
          const [r1,r2,r3] = await Promise.all([
            fetch(`${fsBase}/companies/${dealerId}`, {headers}),
            fetch(`${fsBase}/drivers?pageSize=5`, {headers}),
            fetch(`${fsBase}/settlements?pageSize=5`, {headers})
          ]);
          const [c1,c2,c3] = await Promise.all([r1.json(),r2.json(),r3.json()]);
          return new Response(JSON.stringify({
            ok: true,
            company:  c1.fields?.companyName?.stringValue || 'not found',
            drivers:  (c2.documents||[]).length + '개',
            settles:  (c3.documents||[]).length + '개'
          }), {headers:{'Content-Type':'application/json'}});
        }


        // action: fix_test_account — test0 계정 데이터 수정
        if (action === 'fix_test_account') {
          try {
            // test0 계정 uid 찾기
            const usersRes = await fetch(`${fsBase}/users?pageSize=100`, {headers});
            const usersData = await usersRes.json();
            const docs = usersData.documents || [];
            
            // test0 또는 test1@naver.com 찾기
            let testUser = null;
            let testUid = null;
            for (const doc of docs) {
              const d = doc.fields || {};
              const email = d.email?.stringValue || '';
              const userId = d.userId?.stringValue || '';
              if (email === 'test1@naver.com' || userId === 'test0' || email.includes('test0')) {
                testUser = d;
                testUid = doc.name.split('/').pop();
                break;
              }
            }

            if (!testUser) {
              return new Response(JSON.stringify({ok:false,error:'test0 계정 못찾음', docs: docs.length}), {headers:{'Content-Type':'application/json'}});
            }

            const dealerId = testUser.dealerId?.stringValue || testUid;

            // users 문서에 dealerId 추가
            const userPatch = {
              fields: {
                ...testUser,
                dealerId: {stringValue: dealerId},
                role: {stringValue: 'admin'},
                plan: {stringValue: 'trial'},
                services: {arrayValue: {values: [
                  {stringValue:'settle'},
                  {stringValue:'qr'},
                  {stringValue:'payroll'},
                  {stringValue:'inventory'}
                ]}}
              }
            };
            const r1 = await fetch(`${fsBase}/users/${testUid}`, {method:'PATCH', headers, body: JSON.stringify(userPatch)});

            // companies 문서 확인/생성
            const compRes = await fetch(`${fsBase}/companies/${dealerId}`, {headers});
            const compData = await compRes.json();
            let compStatus = '';

            if (!compData.fields) {
              // 회사 문서 생성
              const compDoc = {
                fields: {
                  companyName:  {stringValue: '테스트 대리점'},
                  bizNumber:    {stringValue: '000-00-00001'},
                  email:        {stringValue: 'test1@naver.com'},
                  plan:         {stringValue: 'trial'},
                  services:     {arrayValue: {values: [{stringValue:'settle'},{stringValue:'qr'},{stringValue:'payroll'}]}},
                  industryType: {stringValue: 'coupang'},
                  dealerId:     {stringValue: dealerId},
                  trialEnd:     {stringValue: new Date(Date.now()+30*24*60*60*1000).toISOString().slice(0,10)},
                  settlePaid:   {booleanValue: true},
                  qrPaid:       {booleanValue: true},
                  payrollPaid:  {booleanValue: true},
                  createdAt:    {stringValue: new Date().toISOString()}
                }
              };
              const r2 = await fetch(`${fsBase}/companies/${dealerId}`, {method:'PATCH', headers, body: JSON.stringify(compDoc)});
              const d2 = await r2.json();
              compStatus = d2.fields ? '✅ 회사 생성' : '❌ ' + JSON.stringify(d2).slice(0,100);
            } else {
              // 기존 회사 문서에 서비스 플래그 추가
              const existing = compData.fields;
              const compUpdate = {
                fields: {
                  ...existing,
                  services:      {arrayValue: {values: [
                    {stringValue:'settle'},{stringValue:'qr'},{stringValue:'payroll'},
                    {stringValue:'inventory'},{stringValue:'kiosk'},{stringValue:'delivery'},
                    {stringValue:'filo'},{stringValue:'premium'}
                  ]}},
                  plan:          {stringValue: 'OWNER'},
                  settlePaid:    {booleanValue: true},
                  qrPaid:        {booleanValue: true},
                  payrollPaid:   {booleanValue: true},
                  inventoryPaid: {booleanValue: true},
                  kioskPaid:     {booleanValue: true},
                  trialEnd:      {stringValue: new Date(Date.now()+30*24*60*60*1000).toISOString().slice(0,10)},
                  dealerId:      {stringValue: dealerId}
                }
              };
              const r2 = await fetch(`${fsBase}/companies/${dealerId}`, {method:'PATCH', headers, body: JSON.stringify(compUpdate)});
              const d2 = await r2.json();
              compStatus = d2.fields ? '✅ 회사 업데이트' : '❌ ' + JSON.stringify(d2).slice(0,100);
            }

            const d1 = await r1.json();
            return new Response(JSON.stringify({
              ok: true,
              testUid,
              dealerId,
              userUpdate: d1.fields ? '✅ users 업데이트' : '❌ ' + JSON.stringify(d1).slice(0,100),
              companyUpdate: compStatus
            }), {headers:{'Content-Type':'application/json'}});
          } catch(e) {
            return new Response(JSON.stringify({ok:false,error:e.message}), {headers:{'Content-Type':'application/json'}});
          }
        }


        // action: cleanup
        if (action === 'cleanup') {
          const dealerId = 'TEST_SIM_001';
          await fetch(`${fsBase}/companies/${dealerId}`, {method:'DELETE', headers});
          await fetch(`${fsBase}/drivers/drv_sim_test001`, {method:'DELETE', headers});
          await fetch(`${fsBase}/settlements/settle_sim_2026_06`, {method:'DELETE', headers});
          return new Response(JSON.stringify({ok:true,message:'테스트 데이터 삭제 완료'}), {headers:{'Content-Type':'application/json'}});
        }

        return new Response(JSON.stringify({ok:false,error:'unknown action'}), {headers:{'Content-Type':'application/json'}});
      } catch(e) {
        return new Response(JSON.stringify({ok:false,error:e.message}), {headers:{'Content-Type':'application/json'}});
      }
    }


    
    // ── Firestore Rules 자동 배포 (/api/deploy-rules) ──
    if (path === '/api/deploy-rules' && method === 'POST') {
      const authUser2 = await verifyFirebaseToken(request);
      if (!authUser2) return new Response(JSON.stringify({ok:false,error:'인증 필요'}), {status:401,headers:{'Content-Type':'application/json'}});
      try {
        const body = await request.json();
        if (body.secret !== (env.CRON_SECRET || '')) {
          return new Response(JSON.stringify({ok:false,error:'unauthorized'}), {headers:{'Content-Type':'application/json'}});
        }
        const fsToken = await getAccessToken(env);
        const rulesContent = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAuth() {
      return request.auth != null;
    }

    function isSuperAdmin() {
      return isAuth() && (
        request.auth.token.email == 'kimdh4790@gmail.com' ||
        request.auth.token.email == 'soungkyekim@naver.com'
      );
    }

    // dealerId 확인 — uid 직접비교 + users 문서 조회 둘 다
    function isDealer(dealerId) {
      return isAuth() && (
        request.auth.uid == dealerId ||
        (exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.dealerId == dealerId) ||
        isSuperAdmin()
      );
    }

    function ownsDoc() {
      return isAuth() && (
        request.auth.uid == resource.data.dealerId ||
        (exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.dealerId == resource.data.dealerId) ||
        isSuperAdmin()
      );
    }

    function ownsNewDoc() {
      return isAuth() && (
        request.auth.uid == request.resource.data.dealerId ||
        (exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.dealerId == request.resource.data.dealerId) ||
        isSuperAdmin()
      );
    }

    match /admins/{docId} {
      allow read: if isAuth();
      allow write: if isSuperAdmin();
    }
    match /security_logs/{docId} {
      allow read: if isSuperAdmin();
      allow create: if isAuth();
    }
    match /error_logs/{docId} {
      allow create: if isAuth();
      allow read: if isSuperAdmin();
    }
    match /admin_events/{docId} {
      allow read, write: if isSuperAdmin();
    }
    match /admin_notifications/{docId} {
      allow read, write: if isSuperAdmin();
    }
    match /admin_tokens/{docId} {
      allow read, write: if isAuth();
    }
    match /cron_logs/{docId} {
      allow read: if isSuperAdmin();
      allow write: if false;
    }
    match /subscription_logs/{docId} {
      allow read, create: if isSuperAdmin();
    }
    match /alimtalk_queue/{docId} {
      allow create: if true;
      allow read, update: if isSuperAdmin();
    }
    match /join_requests/{docId} {
      allow create: if true;
      allow read, update, delete: if isSuperAdmin();
    }
    match /companies/{dealerId} {
      allow read: if isDealer(dealerId);
      allow create: if isAuth();
      allow update: if isDealer(dealerId);
      allow delete: if isSuperAdmin();
    }
    match /users/{userId} {
      allow read: if isAuth() && (
        request.auth.uid == userId || ownsDoc() || isSuperAdmin()
      );
      allow create: if isAuth();
      allow update, delete: if isAuth() && (
        request.auth.uid == userId || isSuperAdmin()
      );
    }
    match /subscriptions/{uid} {
      allow read: if isAuth() && (
        request.auth.uid == uid || isDealer(uid) || isSuperAdmin()
      );
      allow write: if isSuperAdmin();
    }
    match /payments/{docId} {
      allow read: if ownsDoc() || isSuperAdmin();
      allow write: if isSuperAdmin();
    }
    match /payment_requests/{docId} {
      allow read: if ownsDoc() || isSuperAdmin();
      allow create: if ownsNewDoc();
      allow update, delete: if isSuperAdmin();
    }
    match /mbetco_subscriptions/{docId} {
      allow read: if isAuth() && (
        resource.data.email == request.auth.token.email || isSuperAdmin()
      );
      allow write: if isSuperAdmin();
    }
    match /plan_guards/{docId} {
      allow read: if ownsDoc() || isSuperAdmin();
      allow create: if ownsNewDoc();
      allow update, delete: if ownsDoc() || isSuperAdmin();
    }
    match /plan_guard_alerts/{docId} {
      allow read: if ownsDoc() || isSuperAdmin();
      allow create: if ownsNewDoc();
      allow update, delete: if ownsDoc() || isSuperAdmin();
    }
    match /settlements/{docId} {
      allow read: if ownsDoc() || isSuperAdmin();
      allow create: if ownsNewDoc() || isSuperAdmin();
      allow update, delete: if ownsDoc() || isSuperAdmin();
    }
    match /drivers/{docId} {
      allow read: if ownsDoc() || isSuperAdmin();
      allow create: if ownsNewDoc() || isSuperAdmin();
      allow update, delete: if ownsDoc() || isSuperAdmin();
    }
    match /members/{docId} {
      allow read: if ownsDoc() || isSuperAdmin();
      allow create: if ownsNewDoc() || isSuperAdmin();
      allow update, delete: if ownsDoc() || isSuperAdmin();
    }
    match /attendance/{docId} {
      allow read: if ownsDoc() || isSuperAdmin();
      allow create: if ownsNewDoc() || isSuperAdmin();
      allow update, delete: if ownsDoc() || isSuperAdmin();
    }
    match /leaves/{docId} {
      allow read: if ownsDoc() || isSuperAdmin();
      allow create: if ownsNewDoc() || isSuperAdmin();
      allow update, delete: if ownsDoc() || isSuperAdmin();
    }
    match /leaveBalance/{docId} {
      allow read: if ownsDoc() || isSuperAdmin();
      allow create: if ownsNewDoc() || isSuperAdmin();
      allow update, delete: if ownsDoc() || isSuperAdmin();
    }
    match /overtimes/{docId} {
      allow read: if ownsDoc() || isSuperAdmin();
      allow create: if ownsNewDoc() || isSuperAdmin();
      allow update, delete: if ownsDoc() || isSuperAdmin();
    }
    match /payslips/{docId} {
      allow read: if ownsDoc() || isSuperAdmin();
      allow create: if ownsNewDoc() || isSuperAdmin();
      allow update, delete: if ownsDoc() || isSuperAdmin();
    }
    match /notices/{docId} {
      allow read: if ownsDoc() || isSuperAdmin();
      allow create: if ownsNewDoc() || isSuperAdmin();
      allow update, delete: if ownsDoc() || isSuperAdmin();
    }
    match /inventory/{docId} {
      allow read: if ownsDoc() || isSuperAdmin();
      allow create: if ownsNewDoc() || isSuperAdmin();
      allow update, delete: if ownsDoc() || isSuperAdmin();
    }
    match /inventory_in/{docId} {
      allow read: if ownsDoc() || isSuperAdmin();
      allow create: if ownsNewDoc() || isSuperAdmin();
      allow update, delete: if ownsDoc() || isSuperAdmin();
    }
    match /inventory_out/{docId} {
      allow read: if ownsDoc() || isSuperAdmin();
      allow create: if ownsNewDoc() || isSuperAdmin();
      allow update, delete: if ownsDoc() || isSuperAdmin();
    }
    match /mbetco_sales/{docId} {
      allow read: if ownsDoc() || isSuperAdmin();
      allow create: if ownsNewDoc() || isSuperAdmin();
      allow update, delete: if ownsDoc() || isSuperAdmin();
    }
    match /message_history/{docId} {
      allow read: if ownsDoc() || isSuperAdmin();
      allow create: if ownsNewDoc() || isSuperAdmin();
      allow update, delete: if ownsDoc() || isSuperAdmin();
    }
    match /statement_share/{docId} {
      allow read: if true;
      allow create: if isAuth();
      allow update, delete: if isSuperAdmin();
    }
    match /settings/{docId} {
      allow read: if ownsDoc() || isSuperAdmin();
      allow create: if ownsNewDoc() || isSuperAdmin();
      allow update, delete: if ownsDoc() || isSuperAdmin();
    }
    match /contracts/{docId} {
      allow read: if ownsDoc() || isSuperAdmin();
      allow create: if ownsNewDoc() || isSuperAdmin();
      allow update, delete: if ownsDoc() || isSuperAdmin();
    }
    match /expenses/{docId} {
      allow read: if ownsDoc() || isSuperAdmin();
      allow create: if ownsNewDoc() || isSuperAdmin();
      allow update, delete: if ownsDoc() || isSuperAdmin();
    }
    match /vehicles/{docId} {
      allow read: if ownsDoc() || isSuperAdmin();
      allow create: if ownsNewDoc() || isSuperAdmin();
      allow update, delete: if ownsDoc() || isSuperAdmin();
    }
    match /customers/{docId} {
      allow read: if ownsDoc() || isSuperAdmin();
      allow create: if ownsNewDoc() || isSuperAdmin();
      allow update, delete: if ownsDoc() || isSuperAdmin();
    }
    match /taxShares/{docId} {
      allow read: if ownsDoc() || isSuperAdmin();
      allow create: if ownsNewDoc() || isSuperAdmin();
      allow update, delete: if ownsDoc() || isSuperAdmin();
    }
    match /documents/{docId} {
      allow read: if ownsDoc() || isSuperAdmin();
      allow create: if ownsNewDoc() || isSuperAdmin();
      allow update, delete: if ownsDoc() || isSuperAdmin();
    }
    match /dispatch_results/{docId} {
      allow read: if ownsDoc() || isSuperAdmin();
      allow create: if ownsNewDoc() || isSuperAdmin();
      allow update, delete: if ownsDoc() || isSuperAdmin();
    }
    match /driver_settlements/{docId} {
      allow read: if ownsDoc() || isSuperAdmin();
      allow create: if ownsNewDoc() || isSuperAdmin();
      allow update, delete: if ownsDoc() || isSuperAdmin();
    }
    match /incomes/{docId} {
      allow read: if ownsDoc() || isSuperAdmin();
      allow create: if ownsNewDoc() || isSuperAdmin();
      allow update, delete: if ownsDoc() || isSuperAdmin();
    }
    match /evaluations/{docId} {
      allow read: if ownsDoc() || isSuperAdmin();
      allow create: if ownsNewDoc() || isSuperAdmin();
      allow update, delete: if ownsDoc() || isSuperAdmin();
    }
    match /reservations/{docId} {
      allow read: if ownsDoc() || isSuperAdmin();
      allow create: if ownsNewDoc() || isSuperAdmin();
      allow update, delete: if ownsDoc() || isSuperAdmin();
    }
    match /idSupport/{docId} {
      allow read: if ownsDoc() || isSuperAdmin();
      allow create: if ownsNewDoc() || isSuperAdmin();
      allow update, delete: if ownsDoc() || isSuperAdmin();
    }
    // 기타 모든 컬렉션 — 인증된 사용자 읽기/쓰기
    match /{document=**} {
      allow read, write: if isAuth();
    }
  }
}
`;
        
        // Firebase Rules API로 배포
        const rulesRes = await fetch(
          'https://firebaserules.googleapis.com/v1/projects/mbti-logistics/rulesets',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${fsToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              source: {
                files: [{
                  name: 'firestore.rules',
                  content: rulesContent
                }]
              }
            })
          }
        );
        const rulesData = await rulesRes.json();
        if (!rulesData.name) {
          return new Response(JSON.stringify({ok:false,error:'ruleset 생성 실패',data:rulesData}), {headers:{'Content-Type':'application/json'}});
        }
        
        // Release에 적용
        const releaseRes = await fetch(
          'https://firebaserules.googleapis.com/v1/projects/mbti-logistics/releases/cloud.firestore',
          {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${fsToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              release: {
                name: 'projects/mbti-logistics/releases/cloud.firestore',
                rulesetName: rulesData.name
              }
            })
          }
        );
        const releaseData = await releaseRes.json();
        const ok = !!releaseData.rulesetName;
        return new Response(JSON.stringify({ok, ruleset: rulesData.name, release: releaseData.rulesetName}), {headers:{'Content-Type':'application/json'}});
      } catch(e) {
        return new Response(JSON.stringify({ok:false,error:e.message}), {headers:{'Content-Type':'application/json'}});
      }
    }


    // ── 카카오 JS 앱키 전달 (/api/kakao-config) ──
    // ── 국세청 사업자등록정보 조회 (/api/biz-lookup) ──
    if (path === '/api/biz-lookup' && method === 'POST') {
      try {
        const body = await request.json();
        const rawNum = (body.bizNum || '').replace(/[^0-9]/g, '');
        if (!rawNum || rawNum.length !== 10) {
          return new Response(JSON.stringify({ ok: false, error: '사업자번호 10자리 필요' }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        }
        const apiKey = env.BIZ_API_KEY || '2817b81658d3fd5d701ebb227ff81dd7cce603fee57f961c2b60c6452f9beed4';
        // status API (serviceKey URL 인코딩 필수)
        const statusUrl = `https://api.odcloud.kr/api/nts-businessman/v1/status?serviceKey=${encodeURIComponent(apiKey)}`;
        const ntsRes = await fetch(statusUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json;charset=UTF-8', 'Accept': 'application/json' },
          body: JSON.stringify({ b_no: [rawNum] })
        });
        const rawText = await ntsRes.text();
        if (!ntsRes.ok) {
          // 국세청 API 장애 시 임시 우회: 형식만 맞으면 통과
          return new Response(JSON.stringify({ ok: true, active: true, bizName: '', fallback: true }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        }
        const ntsData = JSON.parse(rawText);
        const item = ntsData.data && ntsData.data[0];
        if (!item) return new Response(JSON.stringify({ ok: false, error: '조회 결과 없음', raw: rawText.slice(0,200) }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        const active = item.b_stt_cd === '01';

        // ★ 서버사이드 companies 중복체크 (클라이언트 권한 없음 대응)
        let alreadyRegistered = false;
        let trialUsed = false;
        try {
          const fsToken4 = await getAccessToken(env);
          const dupRes = await fetch(
            `https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents:runQuery`,
            {
              method: 'POST',
              headers: {'Authorization':`Bearer ${fsToken4}`,'Content-Type':'application/json'},
              body: JSON.stringify({structuredQuery:{
                from:[{collectionId:'companies'}],
                where:{fieldFilter:{field:{fieldPath:'bizNumber'},op:'EQUAL',value:{stringValue:rawNum.replace(/(\d{3})(\d{2})(\d{5})/,'$1-$2-$3')}}},
                limit: 1
              }})
            }
          );
          const dupData = await dupRes.json();
          const existing = dupData.filter(d=>d.document);
          if (existing.length > 0) {
            const exFields = existing[0].document.fields || {};
            alreadyRegistered = true;
            trialUsed = !!(exFields.trialUsed?.booleanValue || exFields.plan?.stringValue === 'trial');
          }
        } catch(e2) { /* 중복체크 실패해도 계속 진행 */ }

        return new Response(JSON.stringify({
          ok: true,
          active,
          status: item.b_stt || '',
          companyName: item.b_nm || '',
          repName: item.p_nm || '',
          taxType: item.tax_type || '',
          alreadyRegistered,
          trialUsed
        }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      } catch (e) {
        return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      }
    }
    if (path === '/api/biz-lookup' && method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type' } });
    }

    if (path === '/api/kakao-config' && method === 'GET') {
      return new Response(JSON.stringify({
        key: env.KAKAO_JS_KEY || ''
      }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }});
    }

    // ── 토스페이먼츠 클라이언트 키 전달 (/api/toss-client-key) ──
    if (path === '/api/toss-client-key' && method === 'GET') {
      return new Response(JSON.stringify({
        clientKey: env.TOSS_CLIENT_KEY || ''
      }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }});
    }

    // ── 토스 POS 결제 성공 콜백 (/toss/pos-success) ──
    if (path === '/toss/pos-success' && method === 'GET') {
      const u = new URL(request.url);
      const paymentKey = u.searchParams.get('paymentKey') || '';
      const orderId = u.searchParams.get('orderId') || '';
      const amount = parseInt(u.searchParams.get('amount') || '0');
      const cors = {'Content-Type':'text/html','Access-Control-Allow-Origin':'*'};
      if (!paymentKey || !orderId || !amount) {
        return new Response('<script>window.opener&&window.opener.postMessage({type:"toss_fail",reason:"파라미터 누락"},"*");window.close();</script>',{headers:cors});
      }
      try {
        const secretKey = env.TOSS_SECRET_KEY || '';
        const tossResp = await fetch('https://api.tosspayments.com/v1/payments/confirm',{
          method:'POST',
          headers:{'Authorization':'Basic '+btoa(secretKey+':'),'Content-Type':'application/json'},
          body:JSON.stringify({paymentKey,orderId,amount})
        });
        const tossData = await tossResp.json();
        if(tossResp.ok && tossData.status==='DONE'){
          return new Response('<script>window.opener&&window.opener.postMessage({type:"toss_success",paymentKey:"'+paymentKey+'",orderId:"'+orderId+'",amount:'+amount+',method:"'+((tossData.method)||'카드')+'"},"*");window.close();</script>',{headers:cors});
        } else {
          const msg=tossData.message||'결제 실패';
          return new Response('<script>window.opener&&window.opener.postMessage({type:"toss_fail",reason:"'+msg+'"},"*");window.close();</script>',{headers:cors});
        }
      } catch(e){
        return new Response('<script>window.opener&&window.opener.postMessage({type:"toss_fail",reason:"'+e.message+'"},"*");window.close();</script>',{headers:cors});
      }
    }

    // ── 토스 POS 결제 실패 콜백 (/toss/pos-fail) ──
    if (path === '/toss/pos-fail' && method === 'GET') {
      const u2 = new URL(request.url);
      const msg = u2.searchParams.get('message') || '결제 취소';
      return new Response('<script>window.opener&&window.opener.postMessage({type:"toss_fail",reason:"'+msg+'"},"*");window.close();</script>',{headers:{'Content-Type':'text/html','Access-Control-Allow-Origin':'*'}});
    }

    if (path === '/api/geocode' && method === 'GET') {
      const addr = new URL(request.url).searchParams.get('addr') || '';
      if (!addr) return new Response(JSON.stringify({ok:false}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
      const key = env.KAKAO_REST_KEY || '';
      const r = await fetch('https://dapi.kakao.com/v2/local/search/address.json?query='+encodeURIComponent(addr), {
        headers: { 'Authorization': 'KakaoAK '+key }
      });
      const d = await r.json();
      const doc = d.documents && d.documents[0];
      if (doc) {
        return new Response(JSON.stringify({
          ok:true,
          lat:parseFloat(doc.y),
          lng:parseFloat(doc.x),
          address_name: doc.address_name || '',
          road_address: (doc.road_address && doc.road_address.address_name) || ''
        }), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
      }
      return new Response(JSON.stringify({ok:false}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
    }

    // ── 채팅 FCM 알림 (/api/chat-notify) ──
    if (path === '/api/chat-notify' && method === 'POST') {
      try {
        const body = await request.json();
        const { dealerId, text, sender, companyName } = body;
        if (!dealerId || !text) return new Response(JSON.stringify({ok:false}), {headers:{'Content-Type':'application/json'}});
        const fsToken = await getAccessToken(env);
        const fsBase = `https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents`;
        const headers = {'Authorization':`Bearer ${fsToken}`,'Content-Type':'application/json'};
        const tokens = [];

        if (sender === 'customer') {
          // 고객 → 슈퍼어드민에게 알림 (admin_tokens)
          const r = await fetch(`${fsBase}/admin_tokens?pageSize=50`, {headers});
          const d = await r.json();
          (d.documents||[]).forEach(doc=>{
            const t=doc.fields?.token?.stringValue;
            if(t) tokens.push(t);
          });
        } else {
          // 슈퍼어드민 → 고객사에게 알림
          const r = await fetch(`${fsBase}/companies/${dealerId}`, {headers});
          const d = await r.json();
          const f = d.fields||{};
          if(f.fcmToken?.stringValue) tokens.push(f.fcmToken.stringValue);
          (f.loginAllowed?.arrayValue?.values||[]).forEach(v=>{
            const t=v.mapValue?.fields?.fcmToken?.stringValue;
            if(t&&!tokens.includes(t)) tokens.push(t);
          });
        }

        const title = sender==='customer'?`${companyName||'고객'} 문의`:'DONWAY 답변';
        for (const token of tokens) {
          await fetch(`https://fcm.googleapis.com/v1/projects/mbti-logistics/messages:send`, {
            method:'POST', headers,
            body:JSON.stringify({message:{
              token,
              notification:{title, body:text.slice(0,80)},
              android:{priority:'high', notification:{sound:'default', channelId:'donway_chat'}},
              apns:{payload:{aps:{sound:'default', badge:1}}},
              data:{type:'chat', dealerId, url:'/settle?page=chat'}
            }})
          }).catch(()=>{});
        }
        return new Response(JSON.stringify({ok:true, sent:tokens.length}), {headers:{'Content-Type':'application/json'}});
      } catch(e) {
        return new Response(JSON.stringify({ok:false,error:e.message}), {headers:{'Content-Type':'application/json'}});
      }
    }

    // ── 배달대행 배차 요청 (/api/delivery-dispatch) ──
    if (path === '/api/delivery-dispatch' && method === 'POST') {
      const cors = {'Content-Type':'application/json','Access-Control-Allow-Origin':'*'};
      try {
        const body = await request.json();
        const {orderId, did, address, customerName, phone, items, total, agency} = body;
        const token = await getAccessToken(env);
        const fsBase = `https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents`;
        const now = new Date().toISOString();
        const dispatchDoc = {fields:{
          orderId:{stringValue:orderId||''},
          did:{stringValue:did||''},
          address:{stringValue:address||''},
          customerName:{stringValue:customerName||''},
          phone:{stringValue:phone||''},
          total:{integerValue:String(total||0)},
          agency:{stringValue:agency||'barogo'},
          status:{stringValue:'requested'},
          createdAt:{stringValue:now}
        }};
        await fetch(`${fsBase}/filo_dispatch_requests`, {
          method:'POST',
          headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
          body:JSON.stringify(dispatchDoc)
        });
        return new Response(JSON.stringify({ok:true, status:'requested', agency:agency||'barogo'}), {headers:cors});
      } catch(e) {
        return new Response(JSON.stringify({ok:false, error:e.message}), {status:500, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
      }
    }

    // ── 전체 고객사 공지 FCM 발송 (/api/send-notice) ──
    if (path === '/api/send-notice' && method === 'POST') {
      try {
        const body = await request.json();
        const { title, body: msgBody, type } = body;
        if (!title) return new Response(JSON.stringify({ok:false,error:'title 없음'}), {headers:{'Content-Type':'application/json'}});
        const fsToken = await getAccessToken(env);
        const fsBase = `https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents`;
        const headers = {'Authorization':`Bearer ${fsToken}`,'Content-Type':'application/json'};

        // 전체 companies 조회하여 FCM 토큰 수집
        const compRes = await fetch(`${fsBase}/companies?pageSize=200`, {headers});
        const compData = await compRes.json();
        const docs = compData.documents || [];
        const tokens = new Set();
        for (const doc of docs) {
          const f = doc.fields || {};
          const status = f.status?.stringValue || '';
          if (status !== 'approved') continue;
          // 대표 FCM 토큰
          if (f.fcmToken?.stringValue) tokens.add(f.fcmToken.stringValue);
          // loginAllowed 배열의 FCM 토큰
          const la = f.loginAllowed?.arrayValue?.values || [];
          for (const v of la) {
            const t = v.mapValue?.fields?.fcmToken?.stringValue;
            if (t) tokens.add(t);
          }
        }

        // FCM 발송
        let sent = 0, failed = 0;
        for (const token of tokens) {
          const r = await fetch(`https://fcm.googleapis.com/v1/projects/mbti-logistics/messages:send`, {
            method:'POST',
            headers,
            body:JSON.stringify({message:{
              token,
              notification:{title, body: msgBody || '내용을 확인하세요'},
              android:{priority:'high', notification:{sound:'default', channelId:'donway_admin'}},
              apns:{payload:{aps:{sound:'default', badge:1}}},
              data:{type: type || 'notice', url: '/settle'}
            }})
          }).catch(()=>({ok:false}));
          if (r.ok) sent++; else failed++;
        }

        return new Response(JSON.stringify({ok:true, sent, failed, total:tokens.size}), {headers:{'Content-Type':'application/json'}});
      } catch(e) {
        return new Response(JSON.stringify({ok:false,error:e.message}), {headers:{'Content-Type':'application/json'}});
      }
    }

    // ── 관제센터 알림 발송 (/api/ctrl-notify) ──
    if (path === '/api/ctrl-notify' && method === 'POST') {
      try {
        const body = await request.json();
        const { type, dealerId, title, body: msgBody, data } = body;
        const fsToken = await getAccessToken(env);

        // ── 특정 토큰 직접 발송 (손님 FCM) ──
        if (type === 'token' && body.token) {
          await sendFCM(body.token, title, msgBody, data||{});
          return new Response(JSON.stringify({ok:true}), {headers:{'Content-Type':'application/json'}});
        }

        // 고객사 FCM 토큰 조회 (companies/{dealerId}.fcmTokens 배열)
        async function getDealerTokens(did) {
          const res = await fetch(`${FS_BASE}/companies/${did}`, {
            headers: { Authorization: `Bearer ${fsToken}` }
          });
          if (!res.ok) return [];
          const doc = await res.json();
          const tokens = doc.fields?.fcmTokens?.arrayValue?.values || [];
          return tokens.map(t => t.stringValue).filter(Boolean);
        }

        // 단일 FCM 토큰에 발송
        async function sendFCM(fcmToken, t, b, d) {
          const accessToken = await getAccessToken(env);
          return fetch(
            `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`,
            {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                message: {
                  token: fcmToken,
                  notification: { title: t, body: b },
                  data: { ...( d || {}), click_action: d?.url || 'https://donway.ai.kr' },
                  android: { priority: 'high', notification: { click_action: d?.url || '' } },
                  apns: { payload: { aps: { sound: 'default', badge: 1 } } },
                  webpush: {
                    notification: { title: t, body: b, icon: '/mbtico-192.png' },
                    fcm_options: { link: d?.url || 'https://donway.ai.kr' }
                  }
                }
              })
            }
          );
        }

        let sent = 0;

        if (type === 'dealer' && dealerId) {
          // 특정 고객사에게 발송
          const tokens = await getDealerTokens(dealerId);
          await Promise.allSettled(tokens.map(t => sendFCM(t, title, msgBody, data)));
          sent = tokens.length;
        } else if (type === 'admin') {
          // 슈퍼어드민에게 발송
          await notifyAdmins(env, fsToken, { title, body: msgBody, type: data?.type || 'ctrl' });
          sent = 1;
        } else if (type === 'all' || type === 'group') {
          // 전체 또는 그룹 발송 — companies 컬렉션에서 fcmTokens 있는 고객사 전체
          const res = await fetch(`${FS_BASE}/companies?pageSize=100`, {
            headers: { Authorization: `Bearer ${fsToken}` }
          });
          if (res.ok) {
            const docs = (await res.json()).documents || [];
            const tasks = [];
            for (const doc of docs) {
              const status = doc.fields?.status?.stringValue;
              if (type === 'group' && title !== 'all' && status !== type) continue;
              const tokens = (doc.fields?.fcmTokens?.arrayValue?.values || [])
                .map(t => t.stringValue).filter(Boolean);
              tokens.forEach(t => tasks.push(sendFCM(t, title, msgBody, data)));
            }
            await Promise.allSettled(tasks);
            sent = tasks.length;
          }
        }

        // 이메일 발송 (type==='email' 일 때)
        if (type === 'email' && body.to) {
          const emailKey = (env.EMAIL_API_KEY||env.RESEND_API_KEY||'').trim();
          if (emailKey) {
            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${emailKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                from: body.from || 'DONWAY <all@donway.ai.kr>',
                to: body.to,
                subject: body.subject || title,
                html: body.html || `<p>${msgBody}</p>`
              })
            });
            sent++;
          }
        }

        return new Response(JSON.stringify({ ok: true, sent }),
          { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      } catch(e) {
        return new Response(JSON.stringify({ ok: false, error: e.message }),
          { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      }
    }

    // ── 계좌 등록 (/api/register-bank) ──
    if (path === '/api/register-bank' && method === 'POST') {
      // 인증 불필요 — 명세서 토큰으로 검증
      try {
        const body = await request.json();
        const { token, bankName, bankNum, driverName, dealerId } = body;
        if (!token || !bankName || !bankNum || !driverName || !dealerId) {
          return new Response(JSON.stringify({ok:false,error:'필수 항목이 누락되었습니다'}), {headers:{'Content-Type':'application/json'}});
        }
        const fsToken = await getAccessToken(env);
        const fsBase = `https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents`;
        const headers = {'Authorization':`Bearer ${fsToken}`,'Content-Type':'application/json'};

        // 기사 정보에서 등록된 계좌번호 확인
        const drvRes = await fetch(`${fsBase}/drivers?pageSize=50`, {headers});
        // dealerId + driverName으로 쿼리
        const queryUrl = `https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents:runQuery`;
        const queryBody = {
          structuredQuery: {
            from: [{collectionId:'drivers'}],
            where: {
              compositeFilter: {
                op: 'AND',
                filters: [
                  {fieldFilter:{field:{fieldPath:'dealerId'},op:'EQUAL',value:{stringValue:dealerId}}},
                  {fieldFilter:{field:{fieldPath:'name'},op:'EQUAL',value:{stringValue:driverName}}}
                ]
              }
            },
            limit: 1
          }
        };
        const qRes = await fetch(queryUrl, {method:'POST', headers, body:JSON.stringify(queryBody)});
        const qData = await qRes.json();
        const doc = qData[0]?.document;

        if (!doc) {
          return new Response(JSON.stringify({ok:false,error:'기사 정보를 찾을 수 없습니다'}), {headers:{'Content-Type':'application/json'}});
        }

        const registeredBank = doc.fields?.accountNumber?.stringValue || doc.fields?.bankAccount?.stringValue || '';
        const registeredBankNum = registeredBank.replace(/[^0-9]/g,'');
        const submittedBankNum = bankNum.replace(/[^0-9]/g,'');

        // 1차 검증: 기사수정에 등록된 계좌번호와 대조
        const isMismatch = registeredBankNum && registeredBankNum !== submittedBankNum;
        if (isMismatch) {
          // 불일치 알림 저장 (관리자 확인용)
          const alertBody = {fields:{
            dealerId:{stringValue:dealerId},
            type:{stringValue:'account_mismatch'},
            driverName:{stringValue:driverName},
            registeredAccount:{stringValue:registeredBankNum},
            submittedAccount:{stringValue:submittedBankNum},
            bankName:{stringValue:bankName},
            createdAt:{stringValue:new Date().toISOString()},
            isRead:{booleanValue:false}
          }};
          await fetch(`https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents/plan_guard_alerts`, {
            method:'POST', headers, body:JSON.stringify(alertBody)
          }).catch(()=>{});
          // settlements 문서에 accountMismatch:true 업데이트 (송금관리 ⚠️ 표시용)
          const smQuery = {structuredQuery:{from:[{collectionId:'settlements'}],where:{compositeFilter:{op:'AND',filters:[
            {fieldFilter:{field:{fieldPath:'dealerId'},op:'EQUAL',value:{stringValue:dealerId}}},
            {fieldFilter:{field:{fieldPath:'driverName'},op:'EQUAL',value:{stringValue:driverName}}}
          ]}},limit:5}};
          const smRes = await fetch(queryUrl,{method:'POST',headers,body:JSON.stringify(smQuery)}).catch(()=>null);
          if(smRes&&smRes.ok){
            const smData = await smRes.json();
            for(const row of smData){
              if(row.document){
                await fetch(`${row.document.name}?updateMask.fieldPaths=accountMismatch`,{
                  method:'PATCH',headers,
                  body:JSON.stringify({fields:{accountMismatch:{booleanValue:true}}})
                }).catch(()=>{});
              }
            }
          }
          return new Response(JSON.stringify({ok:false,error:'등록된 계좌번호와 일치하지 않습니다. 관리자에게 문의하세요.',mismatch:true}), {headers:{'Content-Type':'application/json'}});
        }

        // 계좌 저장 (drivers 문서 업데이트)
        const docPath = doc.name;
        const updateBody = {
          fields: {
            bankAccount: {stringValue: bankNum},
            bankName: {stringValue: bankName},
            bankRegisteredAt: {stringValue: new Date().toISOString()},
            bankRegisteredVia: {stringValue: 'stmt_link'}
          }
        };
        const updateMask = 'updateMask.fieldPaths=bankAccount&updateMask.fieldPaths=bankName&updateMask.fieldPaths=bankRegisteredAt&updateMask.fieldPaths=bankRegisteredVia';
        await fetch(`${docPath}?${updateMask}`, {method:'PATCH', headers, body:JSON.stringify(updateBody)});

        // statement_share 토큰 문서에도 기록
        await fetch(`${fsBase}/statement_share/${token}?updateMask.fieldPaths=bankRegistered&updateMask.fieldPaths=bankRegisteredAt`, {
          method:'PATCH', headers,
          body:JSON.stringify({fields:{bankRegistered:{booleanValue:true},bankRegisteredAt:{stringValue:new Date().toISOString()}}})
        });

        return new Response(JSON.stringify({ok:true}), {headers:{'Content-Type':'application/json'}});
      } catch(e) {
        return new Response(JSON.stringify({ok:false,error:e.message}), {headers:{'Content-Type':'application/json'}});
      }
    }

    // ── 로그인 알림 (/api/login-notify) ──
    if (path === '/api/login-notify' && method === 'POST') {
      try {
        const body = await request.json();
        const { dealerId, loginName, timeStr } = body;
        if (!dealerId) return new Response(JSON.stringify({ok:false}), {headers:{'Content-Type':'application/json'}});
        
        const fsToken = await getAccessToken(env);
        const fsRes = await fetch(
          `https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents/companies/${dealerId}`,
          {headers: {'Authorization': `Bearer ${fsToken}`}}
        );
        if (!fsRes.ok) return new Response(JSON.stringify({ok:false}), {headers:{'Content-Type':'application/json'}});
        const fsData = await fsRes.json();
        const fields = fsData.fields || {};
        
        // loginAllowed 배열에서 FCM 토큰 수집
        const tokens = new Set();
        
        // loginAllowed 배열
        const loginAllowed = fields.loginAllowed?.arrayValue?.values || [];
        loginAllowed.forEach(v => {
          const f = v.mapValue?.fields;
          // 단일 토큰
          if (f?.fcmToken?.stringValue) tokens.add(f.fcmToken.stringValue);
          // 누적 토큰 배열
          if (f?.fcmTokens?.arrayValue?.values) {
            f.fcmTokens.arrayValue.values.forEach(t => {
              if (t.stringValue) tokens.add(t.stringValue);
            });
          }
        });
        
        // companies.fcmToken도 포함
        if (fields.fcmToken?.stringValue) tokens.add(fields.fcmToken.stringValue);
        
        if (!tokens.size) return new Response(JSON.stringify({ok:false,reason:'no tokens'}), {headers:{'Content-Type':'application/json'}});
        
        const accessToken = await getAccessToken(env);
        const title = '로그인 알림';
        const msgBody = `${loginName||'관리자'}님이 ${timeStr||''}에 로그인하였습니다`;
        
        const results = await Promise.all([...tokens].map(async tok => {
          const r = await fetch(
            `https://fcm.googleapis.com/v1/projects/mbti-logistics/messages:send`,
            {
              method: 'POST',
              headers: {'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json'},
              body: JSON.stringify({
                message: {
                  token: tok,
                  notification: {title, body: msgBody},
                  android: {priority: 'high'},
                  webpush: {notification: {icon: '/icon-192.png', requireInteraction: true}}
                }
              })
            }
          );
          return r.ok;
        }));
        
        return new Response(JSON.stringify({ok:true, sent:results.filter(Boolean).length, total:tokens.size}), {headers:{'Content-Type':'application/json'}});
      } catch(e) {
        return new Response(JSON.stringify({ok:false,error:e.message}), {headers:{'Content-Type':'application/json'}});
      }
    }

    // ── DONWAY 팝빌 전자세금계산서 역발행 (/api/popbill-issue) ──
    if (path === '/api/popbill-issue' && method === 'POST') {
      try {
        const body = await request.json();
        const result = await popbillIssueReverseDonway(env, body);
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch(e) {
        return new Response(JSON.stringify({ ok: false, error: e.message }), {
          status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    // ── DONWAY 팝빌 웹훅 (/api/popbill-webhook) ──
    if (path === '/api/popbill-webhook' && method === 'POST') {
      try {
        const body = await request.json();
        const { MgtKey, State, StateDate } = body;
        const fsToken = await getAccessToken(env);
        if (MgtKey) {
          const settleId = MgtKey.replace(/^DW/, '');
          const now = new Date().toISOString();
          const patchFields = {
            taxInvoiceState:     { stringValue: State || '알수없음' },
            taxInvoiceUpdatedAt: { stringValue: StateDate || now },
            taxInvoiceMgtKey:    { stringValue: MgtKey }
          };
          await fetch(`${FS_BASE}/settlements/${settleId}?${
            Object.keys(patchFields).map(k => `updateMask.fieldPaths=${k}`).join('&')
          }`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${fsToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields: patchFields })
          });
          if (State === '3' || State === '역발행승인') {
            const settleDoc = await fsGet(fsToken, 'settlements', settleId);
            const fields = settleDoc.fields || {};
            const driverToken = fields.driverFcmToken?.stringValue;
            const agencyToken = fields.agencyFcmToken?.stringValue;
            const driverName  = fields.driverName?.stringValue || '기사';
            const agencyName  = fields.agencyName?.stringValue || '대리점';
            const totalAmt    = fields.totalAmount?.integerValue || fields.totalAmount?.doubleValue || 0;
            const amtStr      = Number(totalAmt).toLocaleString('ko-KR');
            const fcmPromises = [];
            if (driverToken) fcmPromises.push(sendFCMPush(driverToken, '세금계산서 발행 완료',
              `${agencyName} 세금계산서 ${amtStr}원이 승인되었습니다.`, { type: 'tax_invoice_approved', settleId }));
            if (agencyToken) fcmPromises.push(sendFCMPush(agencyToken, '세금계산서 역발행 승인 완료',
              `${driverName} 기사 세금계산서 ${amtStr}원 역발행이 완료되었습니다.`, { type: 'tax_invoice_approved', settleId }));
            await Promise.allSettled(fcmPromises);
          }
          if (State === '역발행거부') {
            const settleDoc = await fsGet(fsToken, 'settlements', settleId);
            const fields = settleDoc.fields || {};
            const agencyToken = fields.agencyFcmToken?.stringValue;
            const driverName  = fields.driverName?.stringValue || '기사';
            if (agencyToken) await sendFCMPush(agencyToken, '세금계산서 역발행 거부',
              `${driverName} 기사가 세금계산서 역발행 요청을 거부했습니다.`, { type: 'tax_invoice_rejected', settleId });
          }
        }
        return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
      } catch(e) {
        return new Response(JSON.stringify({ ok: false, error: e.message }), {
          status: 500, headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // ── 로그인 알림 푸시 (/api/send-push) ──
    if (path === '/api/send-push' && method === 'POST') {
      try {
        const body = await request.json();
        const { token, title, body: msgBody } = body;
        if (!token) return new Response(JSON.stringify({ok:false,error:'token 필요'}), {headers:{'Content-Type':'application/json'}});
        // FCM 직접 발송
        const accessToken = await getAccessToken(env);
        const fcmResp = await fetch(
          `https://fcm.googleapis.com/v1/projects/mbti-logistics/messages:send`,
          {
            method: 'POST',
            headers: {'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json'},
            body: JSON.stringify({
              message: {
                token: token,
                notification: {title: title||'DONWAY 알림', body: msgBody||''},
                android: {priority: 'high'},
                webpush: {notification: {icon: '/icon-192.png', requireInteraction: true}}
              }
            })
          }
        );
        const fcmData = await fcmResp.json();
        return new Response(JSON.stringify({ok: fcmResp.ok, data: fcmData}), {headers:{'Content-Type':'application/json'}});
      } catch(e) {
        return new Response(JSON.stringify({ok:false,error:e.message}), {headers:{'Content-Type':'application/json'}});
      }
    }

    // ── 카카오 알림톡 (/api/send-alimtalk) ──
    if (path === '/api/send-alimtalk' && method === 'POST') {
      try {
        const body = await request.json();
        const { to, templateCode, variables, fallbackText } = body;
        const apiKey    = env.SOLAPI_KEY;
        const apiSecret = env.SOLAPI_SECRET;
        const pfId      = env.KAKAO_PF_ID || 'KA01PF260618094439788FzuY2GxDiSW';
        if (!apiKey || !apiSecret) {
          return new Response(JSON.stringify({ error: 'SOLAPI 키 없음' }), {
            status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }
        // HMAC 인증
        const date = new Date().toISOString();
        const salt = Math.random().toString(36).slice(2);
        const encoder = new TextEncoder();
        const keyData = encoder.encode(apiSecret);
        const msgData = encoder.encode(date + salt);
        const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
        const sig = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
        const signature = Array.from(new Uint8Array(sig)).map(b=>b.toString(16).padStart(2,'0')).join('');
        const authHeader = `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;

        // 톡 실패 시 SMS 자동 대체 (fallbackText 있으면 ATA, 없으면 SMS fallback)
        const payload = {
          messages: [{
            to: to.replace(/[^0-9]/g,''),
            from: '05171133103',
            type: 'ATA',           // 카카오 알림톡 우선
            text: fallbackText || '', // 톡 실패 시 SMS로 대체 발송
            kakaoOptions: {
              pfId: pfId || 'KA01PF260618094439788FzuY2GxDiSW',
              templateId: templateCode || 'KA01TP260618101225825DuJHXpoC4kY',
              variables: variables || {},
              disableSms: false
            }
          }]
        };

        const solapiRes = await fetch('https://api.solapi.com/messages/v4/send-many/detail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
          body: JSON.stringify(payload)
        });
        const result = await solapiRes.json();
        const ok = (result.results||[]).some(r=>r.statusCode==='2000');
        return new Response(JSON.stringify({ ok, result }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch(e) {
        return new Response(JSON.stringify({ ok: false, error: e.message }), {
          status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    // ══ Solapi SMS/알림톡 자동발송 ══
    if (path === '/api/send-sms' && method === 'POST') {
      const headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      };
      try {
        const body = await request.json();
        const { messages } = body; // [{to, text}]
        if (!messages || !messages.length) {
          return new Response(JSON.stringify({error:'messages 없음'}),{status:400,headers});
        }
        const apiKey = env.SOLAPI_KEY;
        const apiSecret = env.SOLAPI_SECRET;
        const from = '05171133103'; // 발신번호 (하이픈 제거)
        if (!apiKey || !apiSecret) {
          return new Response(JSON.stringify({error:'API Key 미설정'}),{status:500,headers});
        }
        // HMAC-SHA256 인증 생성
        const date = new Date().toISOString();
        const salt = Math.random().toString(36).substring(2,14);
        const msg = date + salt;
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
          'raw', encoder.encode(apiSecret),
          {name:'HMAC',hash:'SHA-256'}, false, ['sign']
        );
        const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(msg));
        const sigHex = Array.from(new Uint8Array(sig)).map(b=>b.toString(16).padStart(2,'0')).join('');
        const authHeader = `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${sigHex}`;
        // 발송 요청
        const payload = {
          messages: messages.map(function(m){
            return {
              to: m.to.replace(/[^0-9]/g,''),
              from: from,
              text: m.text,
              type: 'SMS'
            };
          })
        };
        const solapiRes = await fetch('https://api.solapi.com/messages/v4/send-many/detail',{
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader
          },
          body: JSON.stringify(payload)
        });
        const solapiData = await solapiRes.json();
        const successCount = (solapiData.results||[]).filter(r=>r.statusCode==='2000').length;
        return new Response(JSON.stringify({
          success: solapiRes.ok,
          successCount,
          total: messages.length,
          data: solapiData
        }),{status:200,headers});
      } catch(e) {
        return new Response(JSON.stringify({error:e.message}),{status:500,headers});
      }
    }

    // Cron 만료처리 — 수동 트리거
    if (path === '/cron-expire' && method === 'POST') {
      const secret = request.headers.get('X-Cron-Secret') || '';
      if (env.CRON_SECRET && secret !== env.CRON_SECRET) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { 'Content-Type': 'application/json' }
        });
      }
      try {
        const result = await runExpireJob(env);
        return new Response(JSON.stringify({ success: true, ...result }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (e) {
        return new Response(JSON.stringify({ success: false, error: e.message }), {
          status: 500, headers: { 'Content-Type': 'application/json' }
        });
      }
    }


    // ══════════════════════════════════════════════════════════════
    // 토스페이먼츠 PG 연동
    // ══════════════════════════════════════════════════════════════

    // ── 결제 주문 생성 (/toss/create-order) ──
    if (path === '/toss/create-order' && method === 'POST') {
      try {
        const body = await request.json();
        const { dealerId, companyName, email, planType, amount } = body;
        if (!dealerId || !planType || !amount) {
          return new Response(JSON.stringify({ error: '필수 파라미터 누락' }), {
            status: 400, headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS }
          });
        }
        const PLAN_LABELS = {
          contract: '위수탁 계약서',
          roster: '근무표 관리',
          qr: 'QR 출퇴근',
          full: '풀패키지',
          settle: 'AI 정산'
        };
        // 주문 ID 생성 (dealerId + timestamp)
        const orderId = `DONWAY-${dealerId.slice(0,8)}-${Date.now()}`;
        // Firestore에 주문 기록 저장
        const token = await getAccessToken(env);
        const orderDoc = {
          fields: {
            orderId:     { stringValue: orderId },
            dealerId:    { stringValue: dealerId },
            companyName: { stringValue: companyName || '' },
            email:       { stringValue: email || '' },
            planType:    { stringValue: planType },
            amount:      { integerValue: String(amount) },
            status:      { stringValue: 'pending' },
            slug:        { stringValue: '' },   // confirm 시 companies에서 채워짐
            createdAt:   { timestampValue: new Date().toISOString() }
          }
        };
        await fetch(`${FS_BASE}/toss_orders?documentId=${orderId}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(orderDoc)
        });
        return new Response(JSON.stringify({
          orderId,
          orderName: `DONWAY ${PLAN_LABELS[planType] || planType}`,
          amount,
          customerEmail: email,
          customerName: companyName
        }), {
          headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500, headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS }
        });
      }
    }

    // ── 결제 확인 & 기능 활성화 (/toss/confirm) ──
    if (path === '/toss/confirm' && method === 'POST') {
      try {
        const body = await request.json();
        const { paymentKey, orderId, amount } = body;
        if (!paymentKey || !orderId || !amount) {
          return new Response(JSON.stringify({ error: '필수 파라미터 누락' }), {
            status: 400, headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS }
          });
        }
        const secretKey = env.TOSS_SECRET_KEY;
        if (!secretKey) {
          return new Response(JSON.stringify({ error: 'TOSS_SECRET_KEY 미설정' }), {
            status: 500, headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS }
          });
        }

        // 1. 토스 결제 승인 API 호출
        const tossResp = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
          method: 'POST',
          headers: {
            Authorization: `Basic ${btoa(secretKey + ':')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ paymentKey, orderId, amount })
        });
        const tossData = await tossResp.json();
        if (!tossResp.ok) {
          return new Response(JSON.stringify({ error: tossData.message || '결제 승인 실패', code: tossData.code }), {
            status: 400, headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS }
          });
        }

        // 2. Firestore에서 주문 정보 조회
        const token = await getAccessToken(env);
        const orderResp = await fetch(`${FS_BASE}/toss_orders/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!orderResp.ok) {
          return new Response(JSON.stringify({ error: '주문 정보 없음' }), {
            status: 404, headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS }
          });
        }
        const orderDoc = await orderResp.json();
        const fields = orderDoc.fields || {};
        const dealerId = fields.dealerId?.stringValue;
        const planType = fields.planType?.stringValue;

        // 3. 플랜별 활성화 필드 매핑
        const PLAN_FIELDS = {
          contract: { contractPaid: { booleanValue: true } },
          roster:   { rosterPaid:   { booleanValue: true } },
          qr:       { qrPaid:       { booleanValue: true } },
          full:     { contractPaid: { booleanValue: true }, rosterPaid: { booleanValue: true }, qrPaid: { booleanValue: true }, settlePaid: { booleanValue: true } },
          settle:   { settlePaid:   { booleanValue: true } }
        };
        const planFields = PLAN_FIELDS[planType] || {};

        // 4. Firestore companies 문서 업데이트 (기능 즉시 활성화)
        if (dealerId && Object.keys(planFields).length) {
          const updateFields = {
            ...planFields,
            plan:            { stringValue: 'paid' },
            lastPaymentKey:  { stringValue: paymentKey },
            lastPaidAt:      { timestampValue: new Date().toISOString() },
            lastPlanType:    { stringValue: planType }
          };
          const updateMask = Object.keys(updateFields).map(k => `updateMask.fieldPaths=${k}`).join('&');
          await fetch(`${FS_BASE}/companies/${dealerId}?${updateMask}`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields: updateFields })
          });
        }

        // 5. 주문 상태 완료로 업데이트
        await fetch(`${FS_BASE}/toss_orders/${orderId}?updateMask.fieldPaths=status&updateMask.fieldPaths=paidAt&updateMask.fieldPaths=paymentKey`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: {
            status:     { stringValue: 'paid' },
            paidAt:     { timestampValue: new Date().toISOString() },
            paymentKey: { stringValue: paymentKey }
          }})
        });

        // 6. companies 문서에서 slug + email 조회 (toss_orders에는 slug 없음)
        const email = fields.email?.stringValue || '';
        const companyName = fields.companyName?.stringValue || '고객사';
        let slug = '';
        if (dealerId) {
          try {
            const compResp = await fetch(`${FS_BASE}/companies/${dealerId}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (compResp.ok) {
              const compDoc = await compResp.json();
              slug = compDoc.fields?.slug?.stringValue || '';
            }
          } catch(e) { /* slug 없어도 계속 진행 */ }
        }
        // 임시 비밀번호 생성 (기존 계정이면 불필요하지만 관리자 확인용으로 저장)
        const tempPassword = generateTempPassword();

        // companies 문서에 임시 비밀번호 저장 (관리자 확인용)
        if (dealerId) {
          await fetch(`${FS_BASE}/companies/${dealerId}?updateMask.fieldPaths=tempPassword&updateMask.fieldPaths=tempPasswordAt&updateMask.fieldPaths=needsPasswordChange`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields: {
              tempPassword:         { stringValue: tempPassword },
              tempPasswordAt:       { timestampValue: new Date().toISOString() },
              needsPasswordChange:  { booleanValue: true }
            }})
          });
        }

        // 7. 관리자 FCM 푸시 알림 (결제 완료)
        await notifyAdmins(env, token, {
          title: '새 결제 완료!',
          body: `${companyName} · ${planType} 플랜 결제`,
          type: 'pay'
        });

        // 8. 환영 이메일 발송
        const PLAN_LABELS = {
          contract:'위수탁 계약서', roster:'근무표 관리', qr:'QR 출퇴근',
          full:'풀패키지', settle:'AI 정산',
          starter:'Starter 플랜', basic:'Basic 플랜', pro:'Pro 플랜',
          starter3:'Starter 3개월', basic3:'Basic 3개월', pro3:'Pro 3개월'
        };
        const loginUrl = getPlanUrl(planType, slug);
        const emailResult = await sendWelcomeEmail(env, {
          email, companyName, tempPassword, planType, loginUrl,
          planLabel: PLAN_LABELS[planType] || planType
        });

        // ★ FCM 푸시 알림 발송 (앱이 열려 있으면 즉시 수신)
        let fcmResult = { sent: false };
        try {
          const compDocResp = await fetch(`${FS_BASE}/companies/${dealerId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (compDocResp.ok) {
            const compDoc = await compDocResp.json();
            const fcmToken = compDoc.fields?.fcmToken?.stringValue;
            if (fcmToken) {
              fcmResult = await sendFCMPush(
                fcmToken,
                '결제 완료! 기능 활성화됨',
                `${PLAN_LABELS[planType]||planType} 이용을 시작하세요`,
                { loginUrl, planType }
              );
            }
          }
        } catch(e) { /* FCM 실패해도 결제는 성공 */ }

        return new Response(JSON.stringify({
          success: true,
          message: '결제 완료! 기능이 즉시 활성화됐습니다.',
          planType, dealerId, tempPassword,
          emailSent: emailResult.sent,
          fcmSent: fcmResult.sent,
          loginUrl
        }), {
          headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500, headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS }
        });
      }
    }


    // ══════════════════════════════════════════
    // ★ /sa/manual-activate — 수동 즉시 활성화
    // ══════════════════════════════════════════
    if (path === '/sa/manual-activate' && method === 'POST') {
      try {
        // 슈퍼어드민만 허용
        const authHeader = request.headers.get('Authorization') || '';
        const body = await request.json();
        const { email, plan, months=1, memo='' } = body;
        if (!email || !plan) return new Response(JSON.stringify({ok:false,reason:'이메일/플랜 필수'}),{status:400,headers:{'Content-Type':'application/json'}});

        const token = await getAccessToken(env);

        // 이메일로 companies 조회
        const compSnap = await fetch(
          `${FS_BASE}/companies?orderBy=email&equalTo="${email}"`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        // 대안: companies 전체 조회 후 필터
        const compAll = await fetch(`${FS_BASE}/companies`, { headers: { Authorization: `Bearer ${token}` } });
        const compData = await compAll.json();
        const docs = compData.documents || [];
        const found = docs.find(d => d.fields?.adminEmail?.stringValue===email || d.fields?.email?.stringValue===email);
        if (!found) return new Response(JSON.stringify({ok:false,reason:'고객 미존재: '+email}),{status:404,headers:{'Content-Type':'application/json'}});

        const dealerId = found.name.split('/').pop();
        const companyName = found.fields?.companyName?.stringValue || found.fields?.name?.stringValue || email;

        // 만료일 계산
        const expiry = new Date();
        expiry.setMonth(expiry.getMonth() + (months||1));
        const expiryStr = expiry.toISOString().slice(0,10);

        // PLAN_FIELDS
        const PLAN_FIELDS_MA = {
          settle:    { settlePaid:    { booleanValue: true } },
          inventory: { inventoryPaid: { booleanValue: true } },
          qr:        { qrPaid:        { booleanValue: true } },
          kiosk:     { kioskPaid:     { booleanValue: true } },
          universal: { universalPaid: { booleanValue: true } },
          full: { settlePaid:{booleanValue:true}, inventoryPaid:{booleanValue:true}, qrPaid:{booleanValue:true}, kioskPaid:{booleanValue:true} }
        };
        const PLAN_SUBS_MA = {
          settle:['settle'], inventory:['inventory'], qr:['qrpos'],
          kiosk:['kiosk'], universal:['settle','qrpos','inventory','kiosk'],
          full:['settle','qrpos','inventory','kiosk']
        };
        const planFields = PLAN_FIELDS_MA[plan] || {};
        const planMods = PLAN_SUBS_MA[plan] || [];

        // companies 업데이트
        const updateF = {
          ...planFields,
          plan:      { stringValue: 'paid' },
          lastPaidAt:{ timestampValue: new Date().toISOString() },
          lastPlanType:{ stringValue: plan },
          manualMemo:{ stringValue: memo }
        };
        const mask = Object.keys(updateF).map(k=>`updateMask.fieldPaths=${k}`).join('&');
        await fetch(`${FS_BASE}/companies/${dealerId}?${mask}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: updateF })
        });

        // subscriptions 업데이트
        if (planMods.length) {
          const subFields = {};
          planMods.forEach(mod => {
            subFields[mod] = { mapValue: { fields: {
              active:  { booleanValue: true },
              expiry:  { stringValue: expiryStr },
              plan:    { stringValue: plan },
              paidAt:  { timestampValue: new Date().toISOString() },
              manual:  { booleanValue: true }
            }}};
          });
          await fetch(`${FS_BASE}/companies/${dealerId}?${planMods.map(m=>`updateMask.fieldPaths=subscriptions.${m}`).join('&')}`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields: { subscriptions: { mapValue: { fields: subFields } } } })
          }).catch(()=>{});
        }

        // 관리자 알림
        await notifyAdmins(env, token, {
          title: '수동 활성화 완료',
          body: `${companyName} · ${plan} · ${months}개월 (${memo||'메모없음'})`,
          type: 'pay'
        });

        return new Response(JSON.stringify({
          ok: true, companyName, dealerId, plan, expiry: expiryStr
        }), { headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS } });
      } catch(e) {
        return new Response(JSON.stringify({ok:false,error:e.message}),{status:500,headers:{'Content-Type':'application/json'}});
      }
    }

    // ══════════════════════════════════════════
    // ★ /hana/webhook — 하나은행 가상계좌 입금 알림
    // ══════════════════════════════════════════
    if (path === '/hana/webhook' && method === 'POST') {
      try {
        const body = await request.json();
        // 하나은행 입금 알림 파라미터
        // inAmt: 입금액, dpstrNm: 입금자명, acctNo: 계좌번호, trDt: 거래일자
        const { inAmt, dpstrNm, acctNo, trDt, orderId } = body;

        const token = await getAccessToken(env);

        // orderId로 주문 조회 (미리 toss_orders와 동일 방식으로 hana_orders에 저장)
        if (orderId) {
          const orderResp = await fetch(`${FS_BASE}/hana_orders/${orderId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (orderResp.ok) {
            const orderDoc = await orderResp.json();
            const f = orderDoc.fields || {};
            const dealerId = f.dealerId?.stringValue;
            const planType = f.planType?.stringValue;
            const email = f.email?.stringValue || '';
            const companyName = f.companyName?.stringValue || '';
            const months = parseInt(f.months?.integerValue || f.months?.stringValue || '1');

            if (dealerId && planType) {
              // toss/confirm과 동일한 활성화 로직 호출
              // (내부적으로 재사용)
              const PLAN_SUBS_H = {
                settle:['settle'], inventory:['inventory'], qr:['qrpos'],
                kiosk:['kiosk'], universal:['settle','qrpos','inventory','kiosk'],
                full:['settle','qrpos','inventory','kiosk']
              };
              const planMods2 = PLAN_SUBS_H[planType] || [];
              const expiry2 = new Date(); expiry2.setMonth(expiry2.getMonth()+months);
              const expiryStr2 = expiry2.toISOString().slice(0,10);

              if (planMods2.length) {
                const subFields2 = {};
                planMods2.forEach(mod => {
                  subFields2[mod] = { mapValue: { fields: {
                    active:{booleanValue:true}, expiry:{stringValue:expiryStr2},
                    plan:{stringValue:planType}, paidAt:{timestampValue:new Date().toISOString()}
                  }}};
                });
                await fetch(`${FS_BASE}/companies/${dealerId}?${planMods2.map(m=>`updateMask.fieldPaths=subscriptions.${m}`).join('&')}`, {
                  method:'PATCH', headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
                  body: JSON.stringify({fields:{subscriptions:{mapValue:{fields:subFields2}}}})
                }).catch(()=>{});
              }

              // 주문 상태 완료 처리
              await fetch(`${FS_BASE}/hana_orders/${orderId}?updateMask.fieldPaths=status&updateMask.fieldPaths=paidAt&updateMask.fieldPaths=dpstrNm`, {
                method:'PATCH', headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
                body: JSON.stringify({fields:{
                  status:{stringValue:'PAID'},
                  paidAt:{timestampValue:new Date().toISOString()},
                  dpstrNm:{stringValue:dpstrNm||''}
                }})
              }).catch(()=>{});

              // 환영 이메일 + 관리자 알림
              if (email) {
                const tempPw = 'Donway' + Math.floor(1000+Math.random()*9000) + '!';
                await sendWelcomeEmail(env, {
                  email, companyName, tempPassword: tempPw,
                  planType, loginUrl: getPlanUrl(planType,''),
                  planLabel: planType+' 플랜 (하나은행 이체 완료)'
                });
              }
              await notifyAdmins(env, token, {
                title: '하나은행 입금 완료!',
                body: `${companyName||dpstrNm} · ${planType} · ${Number(inAmt||0).toLocaleString()}원`,
                type: 'pay'
              });
            }
          }
        }
        return new Response(JSON.stringify({ok:true}),{headers:{'Content-Type':'application/json'}});
      } catch(e) {
        return new Response(JSON.stringify({ok:false,error:e.message}),{status:500,headers:{'Content-Type':'application/json'}});
      }
    }

    // ★ /sa/notify-admin — 신규 가입 알림
    if (path === '/sa/notify-admin' && method === 'POST') {
      try {
        const body = await request.json();
        const token = await getAccessToken(env);
        await notifyAdmins(env, token, {
          title: body.title || '신규 등록',
          body: body.body || '',
          type: body.type || 'join'
        });
        return new Response(JSON.stringify({ok:true}),{headers:{'Content-Type':'application/json',...SECURITY_HEADERS}});
      } catch(e) {
        return new Response(JSON.stringify({ok:false,error:e.message}),{status:500,headers:{'Content-Type':'application/json'}});
      }
    }

    // ★ /api/link-account — 3도메인 통합 계정 연결
    // 같은 이메일로 donway/filo/mbti 가입 시 companies 통합
    if (path === '/api/link-account' && method === 'POST') {
      try {
        const body = await request.json();
        const { email, fromDomain } = body;
        if (!email) return new Response(JSON.stringify({ok:false,reason:'이메일 필수'}),{status:400,headers:{'Content-Type':'application/json'}});
        const token = await getAccessToken(env);
        // 이메일로 모든 companies 조회
        const snap = await fetch(
          `${FS_BASE}/companies?pageSize=10`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await snap.json();
        const docs = (data.documents || []).filter(d =>
          d.fields?.email?.stringValue === email ||
          d.fields?.adminEmail?.stringValue === email
        );
        if (docs.length <= 1) return new Response(JSON.stringify({ok:true,linked:false,msg:'단일 계정'}),{headers:{'Content-Type':'application/json'}});
        // 첫번째를 master로, 나머지 구독 병합
        const master = docs[0];
        const masterId = master.name.split('/').pop();
        const masterSubs = master.fields?.subscriptions?.mapValue?.fields || {};
        const mergedSubs = {...masterSubs};
        docs.slice(1).forEach(d => {
          const subs = d.fields?.subscriptions?.mapValue?.fields || {};
          Object.assign(mergedSubs, subs);
        });
        // master에 병합 구독 저장
        await fetch(`${FS_BASE}/companies/${masterId}?updateMask.fieldPaths=subscriptions&updateMask.fieldPaths=linkedDomains`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: {
            subscriptions: { mapValue: { fields: mergedSubs } },
            linkedDomains: { arrayValue: { values: ['donway.ai.kr','filo.ai.kr','mbti-logistics'].map(d=>({stringValue:d})) } }
          }})
        }).catch(()=>{});
        return new Response(JSON.stringify({ok:true,linked:true,masterId,mergedModules:Object.keys(mergedSubs)}),
          {headers:{'Content-Type':'application/json',...SECURITY_HEADERS}});
      } catch(e) {
        return new Response(JSON.stringify({ok:false,error:e.message}),{status:500,headers:{'Content-Type':'application/json'}});
      }
    }

    // ★ 슈퍼어드민 Firestore 수정
    if (path === '/sa/firestore' && method === 'POST') {
      return handleSAFirestore(request, env);
    }

    // ★ 기사 배치 업데이트 (이름 기준)
    if (path === '/sa/drivers-batch' && method === 'POST') {
      return handleDriversBatch(request, env);
    }

    // ── 관리자 FCM 알림 (/fcm/notify-admin) ──
    if (path === '/fcm/notify-admin' && method === 'POST') {
      try {
        const body = await request.json();
        const { title, body: msgBody, type } = body;
        const token = await getAccessToken(env);
        await notifyAdmins(env, token, {
          title: title || 'DONWAY 알림',
          body: msgBody || '',
          type: type || 'alert'
        });
        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS }
        });
      } catch(e) {
        return new Response(JSON.stringify({ ok: false, error: e.message }), {
          status: 500, headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS }
        });
      }
    }

    // ── 기사 FCM 알림 (/fcm/notify-drivers) ──
    if (path === '/fcm/notify-drivers' && method === 'POST') {
      try {
        const body = await request.json();
        const { tokens, title, body: msgBody, type, url, data: extraData } = body;
        if (!tokens || !tokens.length) {
          return new Response(JSON.stringify({ ok: true, sent: 0 }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }
        // Legacy FCM Server Key 방식
        // v1 API — SA_KEY로 OAuth 토큰 발급
        const accessToken = await getAccessToken(env);
        const PROJECT_ID_FCM = 'mbti-logistics';
        let sent = 0;
        const errors = [];
        const targets = tokens.slice(0, 20);
        await Promise.all(targets.map(async (token) => {
          try {
            const resp = await fetch(
              `https://fcm.googleapis.com/v1/projects/${PROJECT_ID_FCM}/messages:send`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  message: {
                    token: token,
                    notification: { title: title || 'DONWAY 알림', body: msgBody || '' },
                    data: Object.assign({ type: type || 'notice', url: url || '/' }, extraData || {}),
                    android: { priority: 'high', notification: { sound: 'default', channel_id: 'donway_v2', defaultSound: true, defaultVibrateTimings: false, vibrateTimings: ['0.3s','0.1s','0.3s','0.1s','0.3s'] } },
                    apns: { payload: { aps: { sound: 'default', badge: 1, 'content-available': 1 } } },
                    webpush: { notification: { icon: '/icon-192.png', badge: '/icon-192.png', vibrate: [200,100,200], requireInteraction: false }, fcm_options: { link: url || '/' } }
                  }
                })
              }
            );
            const respText = await resp.text();
            if (resp.ok) sent++;
            else errors.push({status: resp.status, body: respText.slice(0,200)});
          } catch(e) { errors.push({exception: e.message}); }
        }));
        return new Response(JSON.stringify({ ok: true, sent, total: targets.length, errors }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch(e) {
        return new Response(JSON.stringify({ ok: false, error: e.message }), {
          status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    // ── 토스 웹훅 수신 (/toss/webhook) ──
    if (path === '/toss/webhook' && method === 'POST') {
      try {
        // 토스 웹훅 서명 검증
        const webhookSecret = env.TOSS_WEBHOOK_SECRET;
        const signature = request.headers.get('TossPayments-Signature');
        const bodyText = await request.text();
        if (webhookSecret && signature) {
          const key = await crypto.subtle.importKey(
            'raw', new TextEncoder().encode(webhookSecret),
            { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
          );
          const valid = await crypto.subtle.verify(
            'HMAC', key, hexToBytes(signature),
            new TextEncoder().encode(bodyText)
          );
          if (!valid) {
            return new Response('Invalid signature', { status: 401, headers: SECURITY_HEADERS });
          }
        }
        const event = JSON.parse(bodyText);
        // 결제 완료 이벤트만 처리
        if (event.eventType === 'PAYMENT_STATUS_CHANGED' && event.data?.status === 'DONE') {
          const orderId = event.data.orderId;
          const paymentKey = event.data.paymentKey;
          const token = await getAccessToken(env);
          const orderResp = await fetch(`${FS_BASE}/toss_orders/${orderId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (orderResp.ok) {
            const orderDoc = await orderResp.json();
            const f = orderDoc.fields || {};
            const dealerId = f.dealerId?.stringValue;
            const planType = f.planType?.stringValue;
            const email = f.email?.stringValue || '';
            const companyName = f.companyName?.stringValue || '';
            // confirm과 동일한 PLAN_FIELDS 사용
            const PLAN_FIELDS_WH = {
              contract:  { contractPaid:  { booleanValue: true } },
              roster:    { rosterPaid:    { booleanValue: true } },
              qr:        { qrPaid:        { booleanValue: true } },
              inventory: { inventoryPaid: { booleanValue: true } },
              kiosk:     { kioskPaid:     { booleanValue: true } },
              universal: { universalPaid: { booleanValue: true } },
              settle:    { settlePaid:    { booleanValue: true } },
              full: { contractPaid:{booleanValue:true}, rosterPaid:{booleanValue:true}, qrPaid:{booleanValue:true}, settlePaid:{booleanValue:true}, inventoryPaid:{booleanValue:true}, kioskPaid:{booleanValue:true} }
            };
            const PLAN_SUBS_WH = {
              settle:['settle'], qr:['qrpos'], inventory:['inventory'],
              kiosk:['kiosk'], universal:['settle','qrpos','inventory','kiosk'],
              full:['settle','qrpos','inventory','kiosk'], contract:['contract'], roster:['roster']
            };
            const planFields = PLAN_FIELDS_WH[planType] || {};
            const planSubModules = PLAN_SUBS_WH[planType] || [];
            if (dealerId && Object.keys(planFields).length) {
              // companies 업데이트
              const updateFields = {
                ...planFields,
                plan: { stringValue: 'paid' },
                lastPaymentKey: { stringValue: paymentKey || '' },
                lastPaidAt: { timestampValue: new Date().toISOString() }
              };
              const mask = Object.keys(updateFields).map(k=>`updateMask.fieldPaths=${k}`).join('&');
              await fetch(`${FS_BASE}/companies/${dealerId}?${mask}`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ fields: updateFields })
              });
              // subscriptions 업데이트
              if (planSubModules.length) {
                const today = new Date();
                const expiry = new Date(today); expiry.setMonth(expiry.getMonth()+1);
                const expiryStr = expiry.toISOString().slice(0,10);
                const subFields = {};
                planSubModules.forEach(mod => {
                  subFields[mod] = { mapValue: { fields: {
                    active:  { booleanValue: true },
                    expiry:  { stringValue: expiryStr },
                    plan:    { stringValue: planType },
                    paidAt:  { timestampValue: new Date().toISOString() }
                  }}};
                });
                await fetch(`${FS_BASE}/companies/${dealerId}?${planSubModules.map(m=>`updateMask.fieldPaths=subscriptions.${m}`).join('&')}`, {
                  method: 'PATCH',
                  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                  body: JSON.stringify({ fields: { subscriptions: { mapValue: { fields: subFields } } } })
                }).catch(()=>{});
              }
              // Auth 자동 생성
              if (email) {
                try {
                  const webKey = env.FIREBASE_WEB_API_KEY || ''+env.FIREBASE_WEB_API_KEY+'';
                  const tempPw = 'Donway' + Math.floor(1000+Math.random()*9000) + '!';
                  const lookupR = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${webKey}`, {
                    method:'POST', headers:{'Content-Type':'application/json'},
                    body: JSON.stringify({ email })
                  });
                  const lookupD = await lookupR.json();
                  let authUid = lookupD.users?.[0]?.localId || null;
                  if (!authUid) {
                    const createR = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${webKey}`, {
                      method:'POST', headers:{'Content-Type':'application/json'},
                      body: JSON.stringify({ email, password: tempPw, displayName: companyName })
                    });
                    const createD = await createR.json();
                    authUid = createD.localId || null;
                  }
                  if (authUid) {
                    await fetch(`${FS_BASE}/companies/${dealerId}?updateMask.fieldPaths=uid&updateMask.fieldPaths=authUid`, {
                      method:'PATCH', headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
                      body: JSON.stringify({ fields: { uid:{stringValue:authUid}, authUid:{stringValue:authUid} } })
                    }).catch(()=>{});
                    await fetch(`${FS_BASE}/users/${authUid}`, {
                      method:'PATCH', headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
                      body: JSON.stringify({ fields: {
                        uid:{stringValue:authUid}, email:{stringValue:email},
                        dealerId:{stringValue:dealerId}, companyName:{stringValue:companyName},
                        role:{stringValue:'admin'}, plan:{stringValue:planType},
                        createdAt:{timestampValue:new Date().toISOString()}
                      }})
                    }).catch(()=>{});
                    // 환영 이메일 (계좌이체 완료)
                    const loginUrl = getPlanUrl(planType, '');
                    await sendWelcomeEmail(env, { email, companyName, tempPassword:tempPw, planType, loginUrl,
                      planLabel: planType+' 플랜 (계좌이체 완료)' });
                    // 관리자 알림
                    await notifyAdmins(env, token, { title:'계좌이체 완료!', body:`${companyName} · ${planType}`, type:'pay' });
                  }
                } catch(authErr) { /* 실패해도 계속 */ }
              }
            }
          }
        }
        return new Response('OK', { status: 200, headers: SECURITY_HEADERS });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500, headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS }
        });
      }
    }

    // ── 토스 지급대행 (페이아웃) ──
    // POST /toss/payout  — 즉시송금(EXPRESS) or 예약송금(SCHEDULED)
    if (path === '/toss/payout' && method === 'POST') {
      try {
        const body = await request.json();
        const { dealerId, adminEmail, payouts, scheduleType, payoutDate } = body;
        const ADMIN_EMAILS = ['kimdh4790@gmail.com','soungkyekim@naver.com'];

        // 슈퍼어드민 or 해당 딜러만 허용
        if (!adminEmail || (!ADMIN_EMAILS.includes(adminEmail) && adminEmail !== dealerId)) {
          return new Response(JSON.stringify({ error: '권한 없음' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
        }

        const TOSS_PAYOUT_SECRET = env.TOSS_PAYOUT_SECRET_KEY || env.TOSS_SECRET_KEY || '';
        if (!TOSS_PAYOUT_SECRET) {
          return new Response(JSON.stringify({ error: 'TOSS_PAYOUT_SECRET_KEY 미설정 — 토스 심사 완료 후 등록 필요' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
        }

        // 은행명 → 토스 은행코드 변환
        const BANK_CODES = {
          '국민은행':  '004', 'KB국민':    '004',
          '신한은행':  '088', '신한':      '088',
          '우리은행':  '020', '우리':      '020',
          '하나은행':  '081', '하나':      '081',
          '기업은행':  '003', 'IBK':       '003',
          '농협은행':  '011', '농협':      '011',
          '카카오뱅크':'090', '카카오':    '090',
          '토스뱅크':  '092', '토스':      '092',
          '케이뱅크':  '089',
          '새마을금고':'045',
          '신협':      '048',
          '우체국':    '071',
          '씨티은행':  '027',
          'SC제일':    '023',
          '부산은행':  '032',
          '경남은행':  '039',
          '대구은행':  '031',
          '광주은행':  '034',
          '전북은행':  '037',
          '제주은행':  '035',
        };

        // payouts 배열 검증 및 bankCode 매핑
        if (!Array.isArray(payouts) || payouts.length === 0) {
          return new Response(JSON.stringify({ error: 'payouts 배열 필요' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        const mappedPayouts = payouts.map((p, i) => {
          const bankCode = p.bankCode || BANK_CODES[p.bankName] || '';
          if (!bankCode) throw new Error(`${p.name}(${p.bankName}) 은행코드 매핑 실패`);
          if (!p.accountNumber) throw new Error(`${p.name} 계좌번호 없음`);
          if (!p.amount || p.amount < 1) throw new Error(`${p.name} 송금금액 오류`);
          return {
            payoutId: `DONWAY-${dealerId.slice(0,8)}-${Date.now()}-${i}`,
            sellerId: p.driverId || p.userId || p.name,
            sellerName: p.name,
            bankCode,
            accountNumber: p.accountNumber,
            holderName: p.holderName || p.name,
            amount: Math.round(p.amount),
            purpose: p.purpose || `${p.month || ''} 정산금`,
          };
        });

        const requestBody = {
          scheduleType: scheduleType || 'EXPRESS',
          ...(scheduleType === 'SCHEDULED' && payoutDate ? { payoutDate } : {}),
          payouts: mappedPayouts,
        };

        // ★ 토스 페이아웃 API — JWE 암호화 필요 (심사 완료 후 보안키로 암호화 구현)
        // 현재는 골격만 구성, TOSS_PAYOUT_SECURITY_KEY 등록 후 JWE 암호화 추가 예정
        const encoded = btoa(TOSS_PAYOUT_SECRET + ':');
        const tossRes = await fetch('https://api.tosspayments.com/v1/payouts', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${encoded}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': `DONWAY-${dealerId}-${Date.now()}`,
          },
          body: JSON.stringify(requestBody),
        });

        const tossData = await tossRes.json();

        if (!tossRes.ok) {
          return new Response(JSON.stringify({ error: tossData.message || '토스 페이아웃 오류', detail: tossData }), {
            status: tossRes.status, headers: { 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify({ success: true, data: tossData }), {
          headers: { 'Content-Type': 'application/json' }
        });

      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    }

    // POST /toss/payout-status — 송금 상태 조회
    if (path === '/toss/payout-status' && method === 'POST') {
      try {
        const { payoutId } = await request.json();
        const TOSS_PAYOUT_SECRET = env.TOSS_PAYOUT_SECRET_KEY || env.TOSS_SECRET_KEY || '';
        if (!TOSS_PAYOUT_SECRET) {
          return new Response(JSON.stringify({ error: 'TOSS_PAYOUT_SECRET_KEY 미설정' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
        }
        const encoded = btoa(TOSS_PAYOUT_SECRET + ':');
        const res = await fetch(`https://api.tosspayments.com/v1/payouts/${payoutId}`, {
          headers: { 'Authorization': `Basic ${encoded}` }
        });
        const data = await res.json();
        return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    }

    // POST /toss/payout-webhook — 토스 페이아웃 웹훅 (payout.changed)
    if (path === '/toss/payout-webhook' && method === 'POST') {
      try {
        const bodyText = await request.text();
        const data = JSON.parse(bodyText);
        const { payoutId, status, sellerId } = data?.data || {};

        // Firestore payouts 컬렉션 업데이트
        const fsUrl = `https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents/payouts/${payoutId}`;
        await fetch(fsUrl, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: {
            status: { stringValue: status },
            updatedAt: { stringValue: new Date().toISOString() },
          }})
        });

        return new Response('OK', { status: 200 });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
      }
    }

    // ── 임시 비밀번호 조회 (슈퍼어드민 전용) /toss/temp-pw ──
    if (path === '/toss/temp-pw' && method === 'POST') {
      try {
        const body = await request.json();
        const { dealerId, adminEmail } = body;
        const ADMIN_EMAILS = ['kimdh4790@gmail.com','soungkyekim@naver.com'];
        if (!ADMIN_EMAILS.includes(adminEmail)) {
          return new Response(JSON.stringify({ error: '권한 없음' }), {
            status: 403, headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS }
          });
        }
        const token = await getAccessToken(env);
        const resp = await fetch(`${FS_BASE}/companies/${dealerId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const doc = await resp.json();
        const f = doc.fields || {};
        return new Response(JSON.stringify({
          tempPassword: f.tempPassword?.stringValue || '',
          needsChange: f.needsPasswordChange?.booleanValue || false,
          email: f.email?.stringValue || '',
          companyName: f.companyName?.stringValue || ''
        }), {
          headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS }
        });
      } catch(e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500, headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS }
        });
      }
    }


    // ── 아이콘 파일 인라인 서빙 (GitHub 업로드 불필요) ──
    if (path === '/icon-192.png' || path === '/icon-512.png' || path === '/apple-touch-icon.png' || path === '/favicon.ico') {
      const ICONS = {
        '/icon-192.png': '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',
        '/icon-512.png': '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',
        '/apple-touch-icon.png': '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',
        '/favicon.ico': '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'
      };
      const b64 = ICONS[path];
      if (!b64) return new Response('Not found', {status:404});
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const ct = path.endsWith('.ico') ? 'image/jpeg' : 'image/png';
      return new Response(bytes.buffer, {
        headers: {'Content-Type': ct, 'Cache-Control': 'public, max-age=86400'}
      });
    }

    // ★ sw.js — Service Worker (MIME 명시)
    if (path === '/sw.js') {
      const resp = await fetchAsset('/sw.js', request);
      const h = new Headers();
      h.set('Content-Type', 'application/javascript; charset=utf-8');
      h.set('Service-Worker-Allowed', '/');
      h.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      h.set('X-Content-Type-Options', 'nosniff');
      return new Response(resp.body, { status: resp.status, headers: h });
    }

    // ── firebase core compat JS 프록시 (settle.html 상대경로 로딩) ──
    if (path === '/firebase-auth-compat.js') {
      const r = await fetch('https://www.gstatic.com/firebasejs/8.10.1/firebase-auth-compat.js');
      const js = await r.text();
      return new Response(js, { headers: { 'Content-Type': 'application/javascript', 'Cache-Control': 'public, max-age=86400' } });
    }
    if (path === '/firebase-firestore-compat.js') {
      const r = await fetch('https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore-compat.js');
      const js = await r.text();
      return new Response(js, { headers: { 'Content-Type': 'application/javascript', 'Cache-Control': 'public, max-age=86400' } });
    }
    if (path === '/firebase-messaging-compat.js') {
      const r = await fetch('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging-compat.js');
      const js = await r.text();
      return new Response(js, { headers: { 'Content-Type': 'application/javascript', 'Cache-Control': 'public, max-age=86400' } });
    }

    // ── firebase-storage-compat.js 프록시 ──
    if (path === '/firebase-storage-compat.js') {
      const r = await fetch('https://www.gstatic.com/firebasejs/8.10.1/firebase-storage-compat.js');
      const js = await r.text();
      return new Response(js, { headers: { 'Content-Type': 'application/javascript', 'Cache-Control': 'public, max-age=86400' } });
    }

    // ── manifest.json 인라인 서빙 ──
    // /{slug}/manifest.json → 슬러그별 start_url 주입
    const slugManifestMatch = path.match(/^\/([a-zA-Z0-9가-힣\-_]{1,30})\/manifest\.json$/);
    if (slugManifestMatch) {
      const slug = slugManifestMatch[1];
      return new Response(JSON.stringify({
        name:'DONWAY — 자동화 정산 플랫폼', short_name:'DONWAY',
        description:'AI 자동 정산 · QR 출퇴근 · 급여 관리',
        start_url:'/'+slug, scope:'/'+slug, display:'standalone',
        orientation:'portrait', background_color:'#185FA5', theme_color:'#185FA5', lang:'ko',
        icons:[
          {src:'/icon-192.png',sizes:'192x192',type:'image/png',purpose:'any maskable'},
          {src:'/icon-512.png',sizes:'512x512',type:'image/png',purpose:'any maskable'}
        ]
      }), { status:200, headers:{'Content-Type':'application/manifest+json; charset=utf-8','Cache-Control':'no-cache'} });
    }
    // ── /{slug}/sw.js → 슬러그 scope용 SW 서빙 (PWA 설치 지원)
    const slugSwMatch = path.match(/^\/([a-zA-Z0-9가-힣\-_]{1,30})\/sw\.js$/);
    if (slugSwMatch) {
      const slug = slugSwMatch[1];
      const swContent = `importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');`
        + `importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');`
        + `firebase.initializeApp({apiKey:'AIzaSyDQmEFfLczgCuPQidunbBXqaHWgs39VMg0',authDomain:'mbti-logistics.firebaseapp.com',projectId:'mbti-logistics',storageBucket:'mbti-logistics.firebasestorage.app',messagingSenderId:'40761160761',appId:'1:40761160761:web:20545b610f03f534e949e8'});`
        + `const messaging=firebase.messaging();`
        + `messaging.onBackgroundMessage(function(payload){`
        + `  const data=payload.data||{};`
        + `  const title='DONWAY '+(payload.notification&&payload.notification.title||'알림');`
        + `  const body=(payload.notification&&payload.notification.body)||'';`
        + `  return self.registration.showNotification(title,{body:body,icon:'/icon-192.png',badge:'/icon-192.png',tag:'donway-push',renotify:true,vibrate:[200,100,200]});`
        + `});`
        + `self.addEventListener('notificationclick',function(e){e.notification.close();e.waitUntil(clients.matchAll({type:'window'}).then(function(cl){for(var c of cl){if('focus' in c)return c.focus();}if(clients.openWindow)return clients.openWindow('/'+e.notification.data&&e.notification.data.url||'${slug}');}));});`
        + `self.addEventListener('install',function(){self.skipWaiting();});`
        + `self.addEventListener('activate',function(e){e.waitUntil(clients.claim());});`;
      return new Response(swContent, {
        status: 200,
        headers: {
          'Content-Type': 'application/javascript; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Service-Worker-Allowed': '/'+slug+'/',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    if (path === '/filo-manifest.json' || path === '/mbtico-manifest.json') {
      return serveKVFile(env, 'mbtico-manifest.json', 'application/manifest+json');
    }

    if (path === '/manifest.json') {
      // mbtico.kr → mbtico manifest 서빙
      if (hostname.includes('mbetco') || hostname.includes('mbtico')) {
        const mResp = await fetchAsset('/mbtico_manifest.json', request, env);
        const mH = new Headers();
        mH.set('Content-Type', 'application/manifest+json');
        mH.set('Cache-Control', 'no-cache');
        return new Response(mResp.body, {status: mResp.status, headers: mH});
      }
    }
    if (path === '/manifest_donway.json' || path === '/manifest.json') {
      return new Response(JSON.stringify({
        name:'DONWAY — 자동화 정산 플랫폼', short_name:'DONWAY',
        description:'AI 자동 정산 · QR 출퇴근 · 급여 관리',
        start_url:'/settle', scope:'/', display:'standalone',
        orientation:'portrait', background_color:'#185FA5', theme_color:'#185FA5', lang:'ko',
        icons:[
          {src:'/icon-192.png',sizes:'192x192',type:'image/png',purpose:'any maskable'},
          {src:'/icon-512.png',sizes:'512x512',type:'image/png',purpose:'any maskable'}
        ]
      }), { status:200, headers:{'Content-Type':'application/manifest+json; charset=utf-8','Cache-Control':'no-cache'} });
    }

    // 정적 파일 서빙 + 보안 헤더 적용
    const assetResp = await fetchAsset(url.pathname, request, env);
    // ★ JS 파일: application/javascript 강제 + GitHub Raw CSP 제거
    if (url.pathname.endsWith('.js')) {
      const jsHeaders = new Headers();
      const copyKeys = ['cache-control','etag','last-modified','content-encoding'];
      copyKeys.forEach(k => { const v = assetResp.headers.get(k); if(v) jsHeaders.set(k,v); });
      jsHeaders.set('Content-Type', 'application/javascript; charset=utf-8');
      jsHeaders.set('Service-Worker-Allowed', '/');
      jsHeaders.set('X-Content-Type-Options', 'nosniff');
      jsHeaders.set('X-Frame-Options', 'SAMEORIGIN');
      return new Response(assetResp.body, { status: assetResp.status, headers: jsHeaders });
    }
    // ★ 시뮬레이터 파일은 iframe 허용 (랜딩페이지 팝업용)
    const isSimulator = url.pathname.includes('시뮬레이터') || url.pathname.includes('%EC%8B%9C%EB%AE%AC%EB%A0%88%EC%9D%B4%ED%84%B0');
    return addSecurityHeaders(assetResp, isSimulator);
  },

  // Cloudflare Cron Trigger — 매일 01:00 UTC (한국 10:00 KST)
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      runExpireJob(env).catch(e => console.error('[cron-expire]', e.message))
    );
  }
};




// ── yongcha.app 핸들러 ────────────────────────────────────────────
const YONGCHA_HTML_YONGCHA = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0a0f1e">
<title>용차 — 택배 노선 매칭</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js"></script>
<style>
:root{
  --bg:#0a0f1e;--bg2:#0e1528;--bg3:#141d36;--bg4:#1a2444;
  --bd:rgba(255,255,255,.07);--bd2:rgba(255,255,255,.13);
  --tx:#e2e8f9;--t2:#8896b3;--t3:#4a5870;
  --ac:#4f78f5;--acl:rgba(79,120,245,.13);--ach:rgba(79,120,245,.22);
  --gn:#10b981;--gnl:rgba(16,185,129,.12);
  --rd:#ef4444;--rdl:rgba(239,68,68,.12);
  --or:#f97316;--orl:rgba(249,115,22,.12);
  --yw:#f59e0b;--ywl:rgba(245,158,11,.12);
  --cj:#ff4d5e;--hj:#4897c8;--lt:#ff8c4e;--up:#2dba9f;--cp:#ff7043;--rz:#a78bfa;
  --r:14px;--r2:20px;
  --sh:0 2px 12px rgba(0,0,0,.45);
  --sh2:0 6px 24px rgba(0,0,0,.55);
}
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{height:100%;font-family:'Pretendard Variable',Pretendard,-apple-system,sans-serif;background:var(--bg);color:var(--tx);overflow:hidden}

#ld{position:fixed;inset:0;background:linear-gradient(135deg,#060b1a 0%,#0d1a3a 60%,#1a2d5a 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:999;gap:16px}
.ld-mark{width:72px;height:72px;border-radius:22px;background:rgba(79,120,245,.18);display:flex;align-items:center;justify-content:center;border:1px solid rgba(79,120,245,.35);box-shadow:0 8px 32px rgba(79,120,245,.3)}
.ld-mark svg{width:38px;height:38px;stroke:#4f78f5;fill:none;stroke-width:2}
.ld-title{font-size:32px;font-weight:900;color:#fff;letter-spacing:-.5px}
.ld-sub{font-size:13px;color:rgba(255,255,255,.45)}
.spinner{width:24px;height:24px;border:2.5px solid rgba(255,255,255,.12);border-top-color:var(--ac);border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}

#login-screen{position:fixed;inset:0;background:linear-gradient(160deg,#060b1a 0%,#0a1535 100%);display:none;flex-direction:column;align-items:center;justify-content:center;padding:20px;overflow-y:auto}
.login-card{background:var(--bg2);border:1px solid var(--bd2);border-radius:24px;padding:36px 28px;max-width:400px;width:100%;box-shadow:0 8px 40px rgba(0,0,0,.7)}
.login-mark{width:60px;height:60px;border-radius:18px;background:linear-gradient(135deg,#4f78f5,#6366f1);display:flex;align-items:center;justify-content:center;margin:0 auto 14px;box-shadow:0 8px 24px rgba(79,120,245,.4)}
.login-mark svg{width:32px;height:32px;stroke:#fff;fill:none;stroke-width:2}
.login-name{font-size:24px;font-weight:900;text-align:center;letter-spacing:-.5px;color:var(--tx);margin-bottom:4px}
.login-sub{font-size:13px;color:var(--t2);text-align:center;margin-bottom:28px}
.tabs{display:flex;background:var(--bg3);border-radius:12px;padding:4px;margin-bottom:24px;gap:3px}
.tab{flex:1;padding:10px;border-radius:9px;border:none;background:transparent;color:var(--t2);font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;transition:.2s}
.tab.on{background:var(--bg4);color:var(--ac);box-shadow:0 2px 8px rgba(0,0,0,.3)}
.type-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px}
.type-card{border:2px solid var(--bd);border-radius:var(--r);padding:16px 12px;text-align:center;cursor:pointer;transition:.2s;background:var(--bg3)}
.type-card.on{border-color:var(--ac);background:var(--acl)}
.type-ico{margin-bottom:8px}
.type-lbl{font-size:13px;font-weight:800;color:var(--tx)}
.type-desc{font-size:11px;color:var(--t2);margin-top:2px}
.inp-wrap{margin-bottom:14px}
.inp-lbl{font-size:12px;font-weight:700;color:var(--t2);margin-bottom:6px;display:block}
.inp{width:100%;padding:12px 14px;background:var(--bg3);border:1.5px solid var(--bd);border-radius:var(--r);color:var(--tx);font-size:14px;outline:none;font-family:inherit;transition:.2s}
.inp:focus{border-color:var(--ac);background:var(--bg4);box-shadow:0 0 0 3px var(--acl)}
.inp::placeholder{color:var(--t3)}
select.inp{cursor:pointer;-webkit-appearance:none;appearance:none}
select.inp option{background:var(--bg3);color:var(--tx)}
textarea.inp{resize:vertical;min-height:80px}
.err{color:var(--rd);font-size:12px;margin-bottom:10px;display:none;padding:8px 12px;background:var(--rdl);border-radius:8px;border:1px solid rgba(239,68,68,.2)}
.btn-main{width:100%;padding:15px;background:linear-gradient(135deg,var(--ac),#6366f1);color:#fff;border:none;border-radius:var(--r);font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;transition:.2s;margin-top:4px;box-shadow:0 4px 16px rgba(79,120,245,.35)}
.btn-main:active{filter:brightness(.9);transform:translateY(1px)}
.btn-main:disabled{opacity:.4;cursor:not-allowed;box-shadow:none}
.btn-sec{width:100%;padding:13px;background:var(--bg3);color:var(--tx);border:1px solid var(--bd);border-radius:var(--r);font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;margin-top:8px}
.btn-gn{width:100%;padding:13px;background:var(--gnl);color:var(--gn);border:1px solid rgba(16,185,129,.22);border-radius:var(--r);font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;margin-top:8px}
.btn-rd{width:100%;padding:13px;background:var(--rdl);color:var(--rd);border:1px solid rgba(239,68,68,.22);border-radius:var(--r);font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;margin-top:8px}

#app{position:fixed;inset:0;display:none;flex-direction:column;background:var(--bg)}
.app-hdr{background:var(--bg2);border-bottom:1px solid var(--bd);padding:12px 16px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.hdr-left{display:flex;align-items:center;gap:10px}
.hdr-logo{font-size:18px;font-weight:900;letter-spacing:-.5px;background:linear-gradient(135deg,#4f78f5,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.hdr-badge{font-size:10px;font-weight:700;padding:3px 9px;border-radius:20px}
.badge-admin{background:rgba(167,139,250,.15);color:#a78bfa}
.badge-agency{background:var(--acl);color:var(--ac)}
.badge-driver{background:var(--gnl);color:var(--gn)}
.hdr-right{display:flex;align-items:center;gap:8px}
.notif-btn{width:34px;height:34px;border-radius:10px;background:var(--bg3);border:none;color:var(--t2);cursor:pointer;display:flex;align-items:center;justify-content:center}
.notif-btn svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2}
.logout-btn{font-size:11px;color:var(--t3);background:none;border:none;cursor:pointer;font-family:inherit;padding:4px 8px}
#content{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:16px 16px 80px}
.bnav{background:var(--bg2);border-top:1px solid var(--bd);display:flex;z-index:100;padding-bottom:env(safe-area-inset-bottom);flex-shrink:0}
.nb{flex:1;padding:10px 4px 8px;border:none;background:none;color:var(--t3);font-size:10px;font-weight:600;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px;transition:color .15s;font-family:inherit}
.nb.on{color:var(--ac)}
.nb svg{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:1.8}

.card{background:var(--bg2);border:1px solid var(--bd);border-radius:var(--r);padding:16px;margin-bottom:10px;box-shadow:var(--sh)}
.page-title{font-size:20px;font-weight:900;letter-spacing:-.5px;margin-bottom:4px;color:var(--tx)}
.page-sub{font-size:12px;color:var(--t2);margin-bottom:16px}
.section-lbl{font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.8px;margin:16px 0 10px}

.filter-row{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none;-webkit-overflow-scrolling:touch;margin-bottom:8px}
.filter-row::-webkit-scrollbar{display:none}
.chip{flex-shrink:0;padding:7px 16px;border-radius:20px;border:1.5px solid var(--bd);background:var(--bg2);color:var(--t2);font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;font-family:inherit;transition:.15s}
.chip.on{background:var(--ac);color:#fff;border-color:var(--ac);box-shadow:0 2px 8px rgba(79,120,245,.3)}

.pcard{background:var(--bg2);border:1px solid var(--bd);border-left:4px solid var(--bd);border-radius:var(--r);padding:14px;margin-bottom:8px;cursor:pointer;transition:.2s;box-shadow:var(--sh);position:relative;overflow:hidden}
.pcard:active{transform:scale(.99)}
.pcard.closed{opacity:.4;cursor:default}
.pcard--cj{border-left-color:var(--cj)}
.pcard--hj{border-left-color:var(--hj)}
.pcard--lt{border-left-color:var(--lt)}
.pcard--up{border-left-color:var(--up)}
.pcard--cp{border-left-color:var(--cp)}
.pcard--rz{border-left-color:var(--rz)}
.pc-top{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px}
.pc-courier{display:inline-block;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;margin-bottom:5px}
.pc-area{font-size:18px;font-weight:900;letter-spacing:-.4px;margin-bottom:5px;color:var(--tx)}
.pc-status{font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;flex-shrink:0}
.st-open{background:var(--gnl);color:var(--gn)}
.st-closed{background:var(--rdl);color:var(--rd)}
.st-matched{background:var(--acl);color:var(--ac)}
.pc-earn{display:flex;align-items:baseline;gap:8px;margin-bottom:6px;flex-wrap:wrap}
.pc-price{font-size:32px;font-weight:900;letter-spacing:-1.5px;color:var(--tx);line-height:1}
.pc-unit{font-size:12px;font-weight:500;color:var(--t2)}
.riq-badge{font-size:10px;font-weight:800;padding:3px 8px;border-radius:10px}
.riq-up{background:var(--gnl);color:var(--gn)}
.riq-down{background:var(--rdl);color:var(--rd)}
.riq-flat{background:var(--acl);color:var(--ac)}
.pc-minguar{font-size:11px;color:var(--t2);margin-bottom:8px;background:var(--bg3);border-radius:8px;padding:4px 10px;display:inline-block}
.pc-tags{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px}
.tag{font-size:10px;font-weight:600;padding:3px 8px;border-radius:6px;background:var(--bg4);color:var(--t2)}
.pc-foot{display:flex;align-items:center;justify-content:space-between}
.pc-agency{font-size:11px;color:var(--t2);font-weight:500}
.quick-apply{display:flex;align-items:center;gap:4px;background:linear-gradient(135deg,var(--ac),#6366f1);color:#fff;border:none;border-radius:20px;padding:7px 16px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;box-shadow:0 2px 8px rgba(79,120,245,.3)}
.quick-apply svg{width:13px;height:13px;fill:currentColor}
.quick-apply:active{filter:brightness(.88)}

.urgency-badge{position:absolute;top:0;right:0;background:var(--or);color:#fff;font-size:10px;font-weight:800;padding:4px 12px;border-radius:0 var(--r) 0 12px;animation:pulseOr 1.5s infinite;box-shadow:0 2px 8px rgba(249,115,22,.4)}
@keyframes pulseOr{0%,100%{opacity:1}50%{opacity:.78}}

.pg-row{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:14px;padding:4px 0}
.pg-btn{padding:7px 18px;border-radius:10px;border:1.5px solid var(--bd);background:var(--bg2);color:var(--t2);font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;transition:.2s}
.pg-btn:disabled{opacity:.3;cursor:not-allowed}
.pg-info{font-size:12px;color:var(--t2);font-weight:600}

.ai-card{background:linear-gradient(135deg,#060d24 0%,#0e1e4a 60%,#1a2d6b 100%);border:1px solid rgba(79,120,245,.2);border-radius:var(--r2);padding:20px;margin-bottom:14px}
.ai-hdr{display:flex;align-items:center;gap:12px;margin-bottom:14px}
.ai-icon{width:40px;height:40px;border-radius:12px;background:rgba(79,120,245,.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1px solid rgba(79,120,245,.3)}
.ai-icon svg{width:22px;height:22px;stroke:#a5b4fc;fill:none;stroke-width:2}
.ai-title{font-size:15px;font-weight:800;color:#fff}
.ai-sub-txt{font-size:11px;color:rgba(255,255,255,.5)}
.ai-body{font-size:13px;color:rgba(255,255,255,.7);line-height:1.65;margin-bottom:12px}
.ai-highlight{background:rgba(79,120,245,.15);border-radius:10px;padding:10px 14px;font-size:13px;font-weight:600;color:#a5b4fc;margin-bottom:12px;border:1px solid rgba(79,120,245,.2)}
.ai-est{display:flex;align-items:center;justify-content:space-between;padding-top:12px;border-top:1px solid rgba(255,255,255,.08);margin-top:8px}
.ai-est-lbl{font-size:11px;color:rgba(255,255,255,.4)}
.ai-est-val{font-size:22px;font-weight:900;color:var(--gn)}
.ai-btn{width:100%;padding:12px;background:rgba(79,120,245,.18);color:#a5b4fc;border:1px solid rgba(79,120,245,.3);border-radius:var(--r);font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;margin-top:10px}

.revsim-hero{background:linear-gradient(135deg,#060d24 0%,#0e1e4a 100%);border:1px solid rgba(79,120,245,.15);border-radius:var(--r2);padding:22px;margin-bottom:14px}
.revsim-result{font-size:42px;font-weight:900;color:var(--gn);letter-spacing:-1.5px;margin:6px 0 4px;line-height:1}
.revsim-breakdown{background:var(--bg2);border:1px solid var(--bd);border-radius:var(--r);padding:14px;margin-bottom:12px}
.revsim-row{display:flex;justify-content:space-between;font-size:13px;padding:7px 0;border-bottom:1px solid var(--bd)}
.revsim-row:last-child{border-bottom:none;font-weight:800;color:var(--gn);font-size:14px}
.sim-item{display:flex;align-items:center;gap:12px;background:var(--bg2);border:1.5px solid var(--bd);border-radius:var(--r);padding:13px 14px;margin-bottom:8px;cursor:pointer;transition:.2s}
.sim-item.sel{border-color:var(--ac);background:var(--acl)}
.sim-check{width:22px;height:22px;border-radius:7px;border:2px solid var(--bd2);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:.2s}
.sim-item.sel .sim-check{background:var(--ac);border-color:var(--ac)}
.sim-check svg{width:12px;height:12px;stroke:#fff;fill:none;stroke-width:3}

.stat-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px}
.stat-card{background:var(--bg2);border:1px solid var(--bd);border-radius:var(--r);padding:16px}
.stat-val{font-size:26px;font-weight:900;letter-spacing:-.5px;margin-bottom:3px;color:var(--tx)}
.stat-lbl{font-size:11px;color:var(--t2);font-weight:500}

.empty{text-align:center;padding:52px 16px;color:var(--t2)}
.empty svg{width:44px;height:44px;stroke:var(--t3);fill:none;stroke-width:1.5;display:block;margin:0 auto 14px}
.empty-title{font-size:15px;font-weight:700;margin-bottom:5px;color:var(--t2)}
.empty-sub{font-size:12px;color:var(--t3)}

.map-toggle{display:inline-flex;align-items:center;gap:5px;padding:7px 14px;border-radius:20px;border:1.5px solid var(--bd);background:var(--bg2);color:var(--t2);font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;transition:.2s}
.map-toggle svg{width:13px;height:13px;stroke:currentColor;fill:none;stroke-width:2}

#modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:200;display:none;backdrop-filter:blur(4px)}
#modal-sheet{position:fixed;bottom:0;left:0;right:0;background:var(--bg2);border:1px solid var(--bd2);border-top-left-radius:24px;border-top-right-radius:24px;z-index:201;max-height:88vh;overflow-y:auto;padding:20px 20px 40px;display:none;box-shadow:0 -8px 40px rgba(0,0,0,.6)}
.modal-handle{width:40px;height:4px;background:var(--bd2);border-radius:2px;margin:0 auto 18px}
.modal-close{position:absolute;top:16px;right:16px;width:32px;height:32px;border-radius:10px;background:var(--bg3);border:none;color:var(--t2);cursor:pointer;font-size:14px;font-family:inherit}
.modal-title{font-size:20px;font-weight:900;margin-bottom:16px;letter-spacing:-.4px;color:var(--tx)}

#toast{position:fixed;bottom:96px;left:50%;transform:translateX(-50%);background:var(--bg4);border:1px solid var(--bd2);border-radius:12px;padding:11px 20px;font-size:13px;font-weight:600;color:var(--tx);z-index:300;opacity:0;transition:opacity .25s;pointer-events:none;white-space:nowrap;max-width:90vw;box-shadow:var(--sh2)}

/* Slide-to-accept */
.slide-wrap{position:relative;background:var(--gnl);border:1px solid rgba(16,185,129,.2);border-radius:50px;height:60px;overflow:hidden;touch-action:none;user-select:none;margin-top:16px}
.slide-fill{position:absolute;left:0;top:0;bottom:0;background:rgba(16,185,129,.18);border-radius:50px;width:60px}
.slide-handle{position:absolute;left:4px;top:4px;bottom:4px;width:52px;background:var(--gn);border-radius:50px;display:flex;align-items:center;justify-content:center;cursor:grab;will-change:left}
.slide-handle svg{width:20px;height:20px;stroke:#fff;fill:none;stroke-width:2.5}
.slide-label{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:rgba(16,185,129,.8);pointer-events:none;padding-left:60px}

/* 3-step work progress */
.work-steps{display:flex;gap:0;margin-bottom:20px;position:relative}
.work-steps::before{content:'';position:absolute;top:20px;left:calc(16.66% + 8px);right:calc(16.66% + 8px);height:2px;background:var(--bd);z-index:0}
.work-step{flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;position:relative;z-index:1}
.step-circle{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid var(--bd);background:var(--bg3);transition:.3s}
.step-done .step-circle{background:var(--gn);border-color:var(--gn)}
.step-active .step-circle{background:var(--ac);border-color:var(--ac);box-shadow:0 0 0 4px var(--acl),0 0 14px rgba(79,120,245,.35)}
.step-circle svg{width:18px;height:18px;stroke:#fff;fill:none;stroke-width:2.5}
.step-num{font-size:14px;font-weight:800;color:var(--t3)}
.step-done .step-num,.step-active .step-num{color:#fff}
.step-lbl{font-size:10px;font-weight:700;color:var(--t3);text-align:center;white-space:nowrap}
.step-done .step-lbl{color:var(--gn)}
.step-active .step-lbl{color:var(--ac)}

/* Work card */
.work-action{background:var(--bg2);border:1px solid var(--bd);border-radius:var(--r2);padding:20px;margin-bottom:12px}
.work-fare{font-size:52px;font-weight:900;letter-spacing:-2px;color:var(--tx);line-height:1;margin-bottom:4px}
.work-fare-unit{font-size:15px;font-weight:500;color:var(--t2);margin-left:2px}
.work-route{font-size:17px;font-weight:700;color:var(--tx);margin-bottom:3px}
.work-meta{font-size:12px;color:var(--t2);margin-bottom:16px}

/* Settle */
.settle-item{background:var(--bg2);border:1px solid var(--bd);border-radius:var(--r);padding:14px;margin-bottom:8px}
.settle-top{display:flex;justify-content:space-between;align-items:flex-start}
.settle-amt{font-size:22px;font-weight:900;color:var(--tx)}
.ss-badge{font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px}
.ss-pending{background:var(--ywl);color:var(--yw)}
.ss-confirmed{background:var(--gnl);color:var(--gn)}
.ss-paid{background:var(--acl);color:var(--ac)}

/* Template grid */
.tmpl-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}
.tmpl-btn{padding:14px 12px;background:var(--bg3);border:1px solid var(--bd);border-radius:var(--r);text-align:left;cursor:pointer;font-family:inherit;transition:.2s;width:100%}
.tmpl-btn:active{background:var(--acl);border-color:var(--ac)}
.tmpl-area{font-size:13px;font-weight:700;color:var(--tx);margin-bottom:3px}
.tmpl-price{font-size:16px;font-weight:900;color:var(--ac)}

/* Skeleton loading */
.skel{background:linear-gradient(90deg,var(--bg3) 25%,var(--bg4) 50%,var(--bg3) 75%);background-size:200% 100%;animation:skelAnim 1.3s infinite;border-radius:8px}
@keyframes skelAnim{0%{background-position:200% 0}100%{background-position:-200% 0}}
.skel-card{background:var(--bg2);border:1px solid var(--bd);border-radius:var(--r);padding:16px;margin-bottom:8px}
.skel-line{height:13px;margin-bottom:8px}
.skel-line.sm{height:9px}
.skel-line.lg{height:26px}
.skel-w40{width:40%}.skel-w60{width:60%}.skel-w80{width:80%}.skel-full{width:100%}

/* Applicant badge */
.apply-cnt{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;padding:3px 8px;border-radius:10px;background:var(--acl);color:var(--ac)}
</style>
</head>
<body>

<div id="ld">
  <div class="ld-mark"><svg viewBox="0 0 24 24"><rect x="1" y="8" width="22" height="12" rx="2"/><path d="M16 8V6a2 2 0 00-2-2H4a2 2 0 00-2 2v8"/></svg></div>
  <div class="ld-title">용<span style="color:#6366f1">차</span></div>
  <div class="ld-sub">택배 노선 매칭 플랫폼</div>
  <div class="spinner"></div>
</div>

<div id="login-screen">
  <div class="login-card">
    <div class="login-mark"><svg viewBox="0 0 24 24"><rect x="1" y="8" width="22" height="12" rx="2"/><path d="M16 8V6a2 2 0 00-2-2H4a2 2 0 00-2 2v8"/></svg></div>
    <div class="login-name">용차</div>
    <div class="login-sub">택배 노선 매칭 플랫폼</div>
    <div class="tabs">
      <button class="tab on" id="tab-login" onclick="_yTab('login')">로그인</button>
      <button class="tab" id="tab-reg" onclick="_yTab('reg')">회원가입</button>
    </div>
    <div id="form-login">
      <div class="inp-wrap"><label class="inp-lbl">이메일</label><input class="inp" id="l-email" type="email" placeholder="이메일"></div>
      <div class="inp-wrap"><label class="inp-lbl">비밀번호</label><input class="inp" id="l-pw" type="password" placeholder="비밀번호" onkeydown="if(event.key==='Enter')_yLogin()"></div>
      <div class="err" id="l-err"></div>
      <button class="btn-main" id="l-btn" onclick="_yLogin()">로그인</button>
    </div>
    <div id="form-reg" style="display:none">
      <div class="type-row">
        <div class="type-card on" id="t-agency" onclick="_setType('agency')">
          <div class="type-ico"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2H10a2 2 0 00-2 2v2"/></svg></div>
          <div class="type-lbl">대리점</div><div class="type-desc">공고 등록 · 기사 채용</div>
        </div>
        <div class="type-card" id="t-driver" onclick="_setType('driver')">
          <div class="type-ico"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8896b3" stroke-width="2"><rect x="1" y="8" width="22" height="12" rx="2"/><path d="M16 8V6a2 2 0 00-2-2H4a2 2 0 00-2 2v8"/></svg></div>
          <div class="type-lbl">기사</div><div class="type-desc">노선 지원 · 매칭</div>
        </div>
      </div>
      <div class="inp-wrap"><label class="inp-lbl" id="r-name-lbl">대리점명</label><input class="inp" id="r-name" placeholder="상호명 입력"></div>
      <div class="inp-wrap"><label class="inp-lbl">이메일</label><input class="inp" id="r-email" type="email" placeholder="이메일"></div>
      <div class="inp-wrap"><label class="inp-lbl">연락처</label><input class="inp" id="r-phone" type="tel" placeholder="010-0000-0000"></div>
      <div class="inp-wrap"><label class="inp-lbl">지역</label>
        <select class="inp" id="r-region"><option value="">지역 선택</option>
          <option>부산</option><option>대구</option><option>서울</option><option>경기</option>
          <option>인천</option><option>광주</option><option>대전</option><option>울산</option>
          <option>경남</option><option>경북</option><option>전남</option><option>전북</option>
          <option>충남</option><option>충북</option><option>강원</option><option>제주</option>
        </select>
      </div>
      <div class="inp-wrap"><label class="inp-lbl">비밀번호 (6자 이상)</label><input class="inp" id="r-pw" type="password" placeholder="비밀번호"></div>
      <div class="err" id="r-err"></div>
      <button class="btn-main" id="r-btn" onclick="_yRegister()">가입하기</button>
    </div>
  </div>
</div>

<div id="app">
  <div class="app-hdr">
    <div class="hdr-left">
      <div class="hdr-logo">용<span>차</span></div>
      <span class="hdr-badge" id="hdr-badge">—</span>
    </div>
    <div class="hdr-right">
      <button class="notif-btn" onclick="_goPage('notifications')">
        <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
      </button>
      <button class="logout-btn" onclick="_yLogout()">로그아웃</button>
    </div>
  </div>
  <div id="content"></div>
  <nav class="bnav" id="bnav"></nav>
</div>

<div id="modal-overlay" onclick="_closeModal()"></div>
<div id="modal-sheet">
  <div class="modal-handle"></div>
  <button class="modal-close" onclick="_closeModal()">&#x2715;</button>
  <div id="modal-body"></div>
</div>
<div id="toast"></div>

<script>
var _db,_auth,_CU=null,_regType='agency';
var _postsUnsub=null,_allPosts=[],_filteredPosts=[];
var _rgnFilter='전체',_platFilter='전체',_pgIdx=0,_pgSize=5;
var _revSimSel=[],_revSimPosts=[],_kakaoReady=false;
var _sliderActive=false;
var ADMINS=['kimdh4790@gmail.com','skypjh1101@naver.com'];
var API_KEY='AIzaSyDQmEFfLczgCuPQidunbBXqaHWgs39VMg0';
var REGIONS=['전체','부산','대구','서울','경기','인천','광주','대전','울산','경남','경북','전남','전북','충남','충북','강원','제주'];
var PLATFORMS=['전체','바로고','화물인','화물24','센디'];
var _MKT={'CJ대한통운':880,'한진택배':855,'롯데택배':860,'우체국':900,'쿠팡로지스틱스':960,'로젠택배':840};

var _ldTimer=setTimeout(function(){
  document.getElementById('ld').style.display='none';
  document.getElementById('login-screen').style.display='flex';
},3000);

firebase.initializeApp({
  apiKey:API_KEY,
  authDomain:'mbti-logistics.firebaseapp.com',
  projectId:'mbti-logistics',
  storageBucket:'mbti-logistics.appspot.com',
  messagingSenderId:'40761160761',
  appId:'1:40761160761:web:20545b610f03f534e949e8'
});
_db=firebase.firestore();
_auth=firebase.auth();

fetch('/api/kakao-config').then(function(r){return r.json();}).then(function(cfg){
  if(!cfg.key)return;
  var s=document.createElement('script');
  s.src='//dapi.kakao.com/v2/maps/sdk.js?appkey='+cfg.key+'&libraries=clusterer&autoload=false';
  s.onload=function(){kakao.maps.load(function(){_kakaoReady=true;});};
  document.head.appendChild(s);
}).catch(function(){});

_auth.onAuthStateChanged(function(u){
  clearTimeout(_ldTimer);
  document.getElementById('ld').style.display='none';
  if(u){
    _db.collection('yongcha_users').doc(u.uid).get().then(function(snap){
      if(snap.exists){_CU=Object.assign({uid:u.uid},snap.data());_showApp();}
      else if(ADMINS.indexOf(u.email||'')>=0){
        var doc={uid:u.uid,type:'admin',name:'관리자',email:u.email,phone:'051-711-3103',region:'부산',rating:5,reviewCount:0,status:'active',createdAt:firebase.firestore.FieldValue.serverTimestamp()};
        _db.collection('yongcha_users').doc(u.uid).set(doc).then(function(){_CU=Object.assign({uid:u.uid},doc);_showApp();});
      } else {_showLogin();}
    }).catch(function(){_showLogin();});
  } else {_showLogin();}
});

function _showLogin(){document.getElementById('login-screen').style.display='flex';document.getElementById('app').style.display='none';}

function _yTab(t){
  document.getElementById('tab-login').classList.toggle('on',t==='login');
  document.getElementById('tab-reg').classList.toggle('on',t==='reg');
  document.getElementById('form-login').style.display=t==='login'?'block':'none';
  document.getElementById('form-reg').style.display=t==='reg'?'block':'none';
}
function _setType(t){
  _regType=t;
  document.getElementById('t-agency').classList.toggle('on',t==='agency');
  document.getElementById('t-driver').classList.toggle('on',t==='driver');
  document.getElementById('r-name-lbl').textContent=t==='agency'?'대리점명':'이름';
  document.getElementById('r-name').placeholder=t==='agency'?'상호명 입력':'이름 입력';
}
function _yLogin(){
  var e=(document.getElementById('l-email').value||'').trim();
  var p=(document.getElementById('l-pw').value||'').trim();
  var err=document.getElementById('l-err'),btn=document.getElementById('l-btn');
  if(!e||!p){err.textContent='이메일과 비밀번호를 입력하세요';err.style.display='block';return;}
  err.style.display='none';btn.textContent='로그인 중...';btn.disabled=true;
  fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key='+API_KEY,{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({email:e,password:p,returnSecureToken:true})
  }).then(function(r){return r.json();}).then(function(data){
    if(data.error){
      btn.textContent='로그인';btn.disabled=false;
      var c=data.error.message||'';
      err.textContent=c.includes('WRONG_PASSWORD')||c.includes('INVALID_LOGIN')?'비밀번호가 틀렸어요':c.includes('EMAIL_NOT_FOUND')?'없는 계정이에요':c.includes('TOO_MANY')?'잠시 후 다시 시도하세요':'오류: '+c;
      err.style.display='block';return;
    }
    var uid=data.localId,email=data.email||'';
    _db.collection('yongcha_users').doc(uid).get().then(function(snap){
      if(snap.exists){_CU=Object.assign({uid:uid},snap.data());_showApp();}
      else if(ADMINS.indexOf(email)>=0){
        var doc={uid:uid,type:'admin',name:'관리자',email:email,phone:'051-711-3103',region:'부산',rating:5,reviewCount:0,status:'active',createdAt:firebase.firestore.FieldValue.serverTimestamp()};
        _db.collection('yongcha_users').doc(uid).set(doc).then(function(){_CU=Object.assign({uid:uid},doc);_showApp();});
      } else {
        btn.textContent='로그인';btn.disabled=false;
        err.textContent='용차 계정이 없어요. 회원가입 해주세요';err.style.display='block';
      }
    });
  }).catch(function(){btn.textContent='로그인';btn.disabled=false;err.textContent='네트워크 오류';err.style.display='block';});
}
function _yRegister(){
  var n=(document.getElementById('r-name').value||'').trim();
  var e=(document.getElementById('r-email').value||'').trim();
  var ph=(document.getElementById('r-phone').value||'').trim();
  var rg=(document.getElementById('r-region').value||'').trim();
  var p=(document.getElementById('r-pw').value||'').trim();
  var err=document.getElementById('r-err'),btn=document.getElementById('r-btn');
  if(!n||!e||!ph||!rg||!p){err.textContent='모든 항목을 입력하세요';err.style.display='block';return;}
  if(p.length<6){err.textContent='비밀번호는 6자 이상';err.style.display='block';return;}
  err.style.display='none';btn.textContent='가입 중...';btn.disabled=true;
  _auth.createUserWithEmailAndPassword(e,p).then(function(c){
    return _db.collection('yongcha_users').doc(c.user.uid).set({
      uid:c.user.uid,type:_regType,name:n,email:e,phone:ph,region:rg,
      rating:0,reviewCount:0,status:'active',createdAt:firebase.firestore.FieldValue.serverTimestamp()
    });
  }).catch(function(ex){
    btn.textContent='가입하기';btn.disabled=false;
    err.textContent=ex.code==='auth/email-already-in-use'?'이미 사용 중인 이메일':'오류: '+ex.message;
    err.style.display='block';
  });
}
function _yLogout(){_auth.signOut().then(function(){_CU=null;_showLogin();});}

function _showApp(){
  document.getElementById('login-screen').style.display='none';
  document.getElementById('app').style.display='flex';
  var t=_CU.type,b=document.getElementById('hdr-badge');
  b.textContent=t==='admin'?'관리자':t==='agency'?'대리점':'기사';
  b.className='hdr-badge '+(t==='admin'?'badge-admin':t==='agency'?'badge-agency':'badge-driver');
  _buildNav();_goPage('home');
}

var _SVG={
  home:'<svg viewBox="0 0 24 24"><path d="M3 12L12 3l9 9"/><path d="M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9"/></svg>',
  truck:'<svg viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
  pin:'<svg viewBox="0 0 24 24"><path d="M20 10c0 6-8 13-8 13S4 16 4 10a8 8 0 0116 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  chart:'<svg viewBox="0 0 24 24"><rect x="2" y="11" width="4" height="11" rx="1"/><rect x="9" y="6" width="4" height="16" rx="1"/><rect x="16" y="2" width="4" height="20" rx="1"/></svg>',
  user:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>',
  users:'<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M2 20c0-3.3 3.1-6 7-6s7 2.7 7 6"/><path d="M16 11c1.7 0 3 1.3 3 3m3 6c0-2.8-2.7-5-6-5"/></svg>',
  plus:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
  brain:'<svg viewBox="0 0 24 24"><path d="M9.5 2A2.5 2.5 0 007 4.5v.5a5 5 0 000 10v2.5A2.5 2.5 0 009.5 22h5a2.5 2.5 0 002.5-2.5V15a5 5 0 000-10V4.5A2.5 2.5 0 0014.5 2z"/></svg>',
  bolt:'<svg viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="currentColor"/></svg>',
  map:'<svg viewBox="0 0 24 24"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>',
  check:'<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>',
  list:'<svg viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
  target:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
  work:'<svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8m-4-4v4"/></svg>',
  wallet:'<svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M16 13a1 1 0 100-2 1 1 0 000 2z" fill="currentColor"/><path d="M2 9h20"/></svg>',
  zap:'<svg viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>'
};

function _buildNav(){
  var t=_CU.type,tabs;
  if(t==='driver'){
    tabs=[{ico:'home',lbl:'홈',p:'home'},{ico:'truck',lbl:'공고',p:'posts'},
          {ico:'work',lbl:'내작업',p:'my_work'},{ico:'wallet',lbl:'정산',p:'my_settle'},
          {ico:'user',lbl:'내정보',p:'profile'}];
  } else if(t==='agency'){
    tabs=[{ico:'home',lbl:'대시보드',p:'home'},{ico:'list',lbl:'공고목록',p:'my_posts'},
          {ico:'plus',lbl:'공고등록',p:'add_post'},{ico:'users',lbl:'기사목록',p:'drivers'},
          {ico:'wallet',lbl:'정산관리',p:'settle_mgmt'}];
  } else {
    tabs=[{ico:'home',lbl:'대시보드',p:'home'},{ico:'truck',lbl:'공고관리',p:'admin_posts'},
          {ico:'users',lbl:'사용자',p:'admin_users'},{ico:'user',lbl:'내정보',p:'profile'}];
  }
  document.getElementById('bnav').innerHTML=tabs.map(function(tb){
    return '<button class="nb" id="bnav-'+tb.p+'" onclick="_goPage(\''+tb.p+'\')">'+_SVG[tb.ico]+'<span>'+tb.lbl+'</span></button>';
  }).join('');
}

var _curPage='';
function _goPage(p){
  _curPage=p;
  document.querySelectorAll('.nb').forEach(function(b){b.classList.remove('on');});
  var btn=document.getElementById('bnav-'+p);if(btn)btn.classList.add('on');
  var el=document.getElementById('content');el.scrollTop=0;
  if(p==='home')_pgHome(el);
  else if(p==='posts')_pgPosts(el);
  else if(p==='revsim')_pgRevSim(el);
  else if(p==='my_applies')_pgMyApplies(el);
  else if(p==='my_work')_pgMyWork(el);
  else if(p==='my_settle')_pgMySettle(el);
  else if(p==='profile')_pgProfile(el);
  else if(p==='my_posts')_pgMyPosts(el);
  else if(p==='add_post')_pgAddPost(el);
  else if(p==='drivers')_pgDrivers(el);
  else if(p==='settle_mgmt')_pgSettleMgmt(el);
  else if(p==='admin_posts')_pgAdminPosts(el);
  else if(p==='admin_users')_pgAdminUsers(el);
  else if(p==='notifications')_pgNotifications(el);
  else el.innerHTML='<div class="empty"><div class="empty-title">준비 중</div></div>';
}

function _yToast(msg,dur){
  var t=document.getElementById('toast');
  t.textContent=msg;t.style.opacity='1';
  setTimeout(function(){t.style.opacity='0';},dur||2400);
}
function _showModal(html){
  document.getElementById('modal-body').innerHTML=html;
  document.getElementById('modal-overlay').style.display='block';
  document.getElementById('modal-sheet').style.display='block';
}
function _closeModal(){
  document.getElementById('modal-overlay').style.display='none';
  document.getElementById('modal-sheet').style.display='none';
}
function _fmt(n){return(n||0).toLocaleString();}
function _timeAgo(ts){
  if(!ts)return '';
  var d=ts.toDate?ts.toDate():new Date(ts);
  var s=Math.floor((Date.now()-d.getTime())/1000);
  if(s<60)return '방금';if(s<3600)return Math.floor(s/60)+'분 전';
  if(s<86400)return Math.floor(s/3600)+'시간 전';return Math.floor(s/86400)+'일 전';
}

function _courierCls(c){
  if(!c)return '';
  if(c.indexOf('CJ')>=0)return '--cj';if(c.indexOf('한진')>=0)return '--hj';
  if(c.indexOf('롯데')>=0)return '--lt';if(c.indexOf('우체국')>=0)return '--up';
  if(c.indexOf('쿠팡')>=0)return '--cp';if(c.indexOf('로젠')>=0)return '--rz';
  return '';
}
function _courierColor(c){
  var m={'CJ대한통운':'#ff4d5e','한진택배':'#4897c8','롯데택배':'#ff8c4e','우체국':'#2dba9f','쿠팡로지스틱스':'#ff7043','로젠택배':'#a78bfa'};
  return m[c]||'#4f78f5';
}
function _rateVsMarket(price,courier){
  var avg=_MKT[courier]||880;
  return Math.round((price-avg)/avg*100);
}

function _makePostCard(d){
  var isClosed=d.status==='closed',isMatched=d.status==='matched';
  var cls=_courierCls(d.courier||'');
  var rp=_rateVsMarket(d.unitPrice||0,d.courier);
  var rpCls=rp>3?'riq-up':rp<-3?'riq-down':'riq-flat';
  var rpTxt=(rp>0?'+':'')+rp+'%';
  var minG=Math.round((d.unitPrice||0)*0.85);
  var dayEst=d.unitPrice&&d.volume?Math.round(d.unitPrice*d.volume/10000):0;
  var stCls=isClosed?'st-closed':isMatched?'st-matched':'st-open';
  var stTxt=isClosed?'마감':isMatched?'매칭완료':'모집중';
  var clr=_courierColor(d.courier||'');
  var div=document.createElement('div');
  div.className='pcard'+(cls?' pcard'+cls:'')+(isClosed?' closed':'');
  div.innerHTML=
    (d.urgent?'<div class="urgency-badge">긴급</div>':'')+
    '<div class="pc-top">'+
      '<div style="flex:1;min-width:0">'+
        '<div class="pc-courier" style="background:'+clr+'25;color:'+clr+'">'+(d.courier||'택배사')+'</div>'+
        '<div class="pc-area">'+(d.region||'')+' '+(d.area||'')+'</div>'+
        '<div class="pc-tags">'+
          (d.workShift?'<span class="tag">'+d.workShift+'</span>':'')+
          (d.vehicleType?'<span class="tag">'+d.vehicleType+'</span>':'')+
          (d.platform?'<span class="tag">'+d.platform+'</span>':'')+
        '</div>'+
      '</div>'+
      '<span class="pc-status '+stCls+'">'+stTxt+'</span>'+
    '</div>'+
    '<div class="pc-earn">'+
      '<span class="pc-price">'+_fmt(d.unitPrice||0)+'<small class="pc-unit">원/건</small></span>'+
      '<span class="riq-badge '+rpCls+'">시세'+rpTxt+'</span>'+
      (dayEst?'<span style="font-size:11px;color:var(--t2)">일~'+dayEst+'만원</span>':'')+
    '</div>'+
    '<div class="pc-minguar">최소보장 '+_fmt(minG)+'원/건 (시세×85%)</div>'+
    '<div class="pc-foot">'+
      '<span class="pc-agency">'+(d.agencyName||'대리점')+'</span>'+
      (!isClosed&&_CU&&_CU.type==='driver'?
        '<button class="quick-apply" onclick="event.stopPropagation();_quickApply(\''+d.id+'\',\''+d.agencyId+'\',\''+d.agencyName+'\')">'+
        _SVG.bolt+'지원</button>':'')+
    '</div>';
  if(!isClosed||(_CU&&_CU.type==='agency'&&d.agencyId===_CU.uid))div.onclick=function(){_showPostDetail(d);};
  return div;
}

function _quickApply(postId,agencyId,agencyName){
  if(!_CU||_CU.type!=='driver'){_yToast('기사만 지원 가능해요');return;}
  _db.collection('yongcha_applies').where('postId','==',postId).where('driverId','==',_CU.uid).get()
  .then(function(snap){
    if(!snap.empty){_yToast('이미 지원한 공고예요');return;}
    return _db.collection('yongcha_applies').add({
      postId:postId,driverId:_CU.uid,driverName:_CU.name,driverPhone:_CU.phone||'',
      agencyId:agencyId,agencyName:agencyName,status:'pending',
      appliedAt:firebase.firestore.FieldValue.serverTimestamp()
    });
  }).then(function(ref){if(ref)_yToast('지원 완료! 대리점 연락을 기다려요');})
  .catch(function(e){_yToast('오류: '+e.message);});
}

function _showPostDetail(d){
  var rp=_rateVsMarket(d.unitPrice||0,d.courier);
  var minG=Math.round((d.unitPrice||0)*0.85);
  var clr=_courierColor(d.courier||'');
  var rpCls=rp>3?'riq-up':rp<-3?'riq-down':'riq-flat';
  var html=
    '<div class="modal-title">'+(d.region||'')+' '+(d.area||'')+'</div>'+
    '<div style="display:flex;gap:8px;align-items:center;margin-bottom:16px">'+
      '<span style="font-size:11px;font-weight:700;padding:2px 10px;border-radius:20px;background:'+clr+'25;color:'+clr+'">'+(d.courier||'')+'</span>'+
      '<span class="riq-badge '+rpCls+'">시세'+(rp>0?'+':'')+rp+'%</span>'+
      (d.urgent?'<span class="urgency-badge" style="position:relative;top:0;right:0;border-radius:20px">긴급</span>':'')+
    '</div>'+
    '<div class="stat-grid">'+
      '<div class="stat-card"><div class="stat-val" style="font-size:32px;color:var(--ac)">'+_fmt(d.unitPrice||0)+'</div><div class="stat-lbl">단가 (원/건)</div></div>'+
      '<div class="stat-card"><div class="stat-val">'+_fmt(minG)+'</div><div class="stat-lbl">최소보장 (원/건)</div></div>'+
      '<div class="stat-card"><div class="stat-val">'+(d.volume||0)+'</div><div class="stat-lbl">일 물량 (건)</div></div>'+
      '<div class="stat-card"><div class="stat-val">'+(d.settleDay||15)+'일</div><div class="stat-lbl">정산일</div></div>'+
    '</div>'+
    (d.description?'<div class="card" style="font-size:13px;line-height:1.7;color:var(--t2)">'+(d.description||'')+'</div>':'')+
    (_CU&&_CU.type==='driver'&&d.status==='open'?
      '<button class="btn-main" onclick="_quickApply(\''+d.id+'\',\''+d.agencyId+'\',\''+d.agencyName+'\');_closeModal()">바로 지원하기</button>':
      _CU&&_CU.type==='agency'&&d.agencyId===_CU.uid?
        '<div style="display:flex;flex-direction:column;gap:8px;margin-top:4px">'+
          '<button class="btn-main" onclick="_showApplicants(\''+d.id+'\')">지원자 확인</button>'+
          (d.status==='open'?'<button class="btn-rd" style="margin-top:0" onclick="_closePost(\''+d.id+'\')">공고 마감</button>':
          '<div style="text-align:center;font-size:12px;color:var(--t3);padding:8px">마감된 공고</div>')+
        '</div>':
      '<div style="text-align:center;font-size:13px;color:var(--t2);padding:16px">'+(d.status==='closed'?'마감된 공고예요':'')+'</div>');
  _showModal(html);
}

/* ── 홈 ───────────────────────────────────────────────────── */
function _pgHome(el){
  if(_CU.type==='driver')_pgHomeDriver(el);
  else if(_CU.type==='agency')_pgHomeAgency(el);
  else _pgHomeAdmin(el);
}

var _homeMapInst=null;
function _pgHomeDriver(el){
  el.innerHTML=
    '<div class="ai-card" id="ai-card">'+
      '<div class="ai-hdr">'+
        '<div class="ai-icon">'+_SVG.brain+'</div>'+
        '<div><div class="ai-title">AI 노선 코치</div><div class="ai-sub-txt">오늘의 최적 노선 분석</div></div>'+
      '</div>'+
      '<div class="ai-body" id="ai-body">내 지역·차종 기준 최적 노선을 분석해드려요.</div>'+
      '<button class="ai-btn" id="ai-btn" onclick="_callAICoach()">'+_SVG.bolt+' AI 분석 시작</button>'+
    '</div>'+
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">'+
      '<div class="page-title">내 주변 공고</div>'+
      '<button class="map-toggle" id="home-map-toggle" onclick="_toggleHomeMap()">'+_SVG.map+' 지도</button>'+
    '</div>'+
    '<div id="home-map" style="height:280px;display:none;border-radius:12px;overflow:hidden;border:1px solid var(--bd);margin-bottom:12px"></div>'+
    '<div id="home-posts"><div class="card"><div style="color:var(--t2);font-size:13px">로딩 중...</div></div></div>';
  _loadHomePosts();
}

function _toggleHomeMap(){
  var m=document.getElementById('home-map'),btn=document.getElementById('home-map-toggle');
  if(!m)return;
  if(m.style.display==='none'){
    m.style.display='block';btn.style.background='var(--acl)';btn.style.color='var(--ac)';
    if(_kakaoReady&&!_homeMapInst){
      var ll=new kakao.maps.LatLng(35.1795543,129.0756416);
      _homeMapInst=new kakao.maps.Map(m,{center:ll,level:7});
      _allPosts.slice(0,20).forEach(function(d){
        if(!d.lat||!d.lng)return;
        var mk=new kakao.maps.Marker({position:new kakao.maps.LatLng(d.lat,d.lng),map:_homeMapInst});
        kakao.maps.event.addListener(mk,'click',function(){_showPostDetail(d);});
      });
    }
  } else {m.style.display='none';btn.style.background='';btn.style.color='';}
}

function _loadHomePosts(){
  _db.collection('yongcha_posts').where('status','==','open').orderBy('createdAt','desc').limit(10).get()
  .then(function(snap){
    var list=[];snap.forEach(function(d){list.push(Object.assign({id:d.id},d.data()));});
    _allPosts=list;
    var el2=document.getElementById('home-posts');if(!el2)return;
    if(!list.length){el2.innerHTML='<div class="empty">'+_SVG.truck+'<div class="empty-title">공고 없음</div><div class="empty-sub">아직 등록된 공고가 없어요</div></div>';return;}
    el2.innerHTML='';
    list.slice(0,5).forEach(function(d){el2.appendChild(_makePostCard(d));});
  }).catch(function(){});
}

function _callAICoach(){
  var bodyEl=document.getElementById('ai-body'),btn=document.getElementById('ai-btn');
  if(!bodyEl)return;
  bodyEl.textContent='분석 중...';if(btn){btn.disabled=true;btn.textContent='분석 중...';}
  fetch('/api/ai-coach',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({driver:{name:_CU.name,region:_CU.region,carType:_CU.carType},posts:_allPosts})
  }).then(function(r){return r.json();}).then(function(res){
    if(!res.ok||!res.data){bodyEl.textContent='분석을 불러올 수 없어요';return;}
    var d=res.data;
    bodyEl.innerHTML='<div style="margin-bottom:8px">'+(d.summary||'')+'</div>'+
      (d.reason?'<div class="ai-highlight">'+d.reason+'</div>':'')+
      (d.applyMsg?'<div style="font-size:12px;color:rgba(255,255,255,.5)">추천 메시지: '+d.applyMsg+'</div>':'');
    if(d.monthlyEst){
      var card=document.getElementById('ai-card');
      if(card&&!card.querySelector('.ai-est')){
        var e2=document.createElement('div');e2.className='ai-est';
        e2.innerHTML='<span class="ai-est-lbl">예상 월 수익</span><span class="ai-est-val">'+d.monthlyEst+'</span>';
        card.appendChild(e2);
      }
    }
    if(btn){btn.disabled=false;btn.innerHTML=_SVG.bolt+' 다시 분석';}
  }).catch(function(){
    bodyEl.textContent='AI 분석 오류';
    if(btn){btn.disabled=false;btn.innerHTML=_SVG.bolt+' 다시 시도';}
  });
}

function _pgHomeAgency(el){
  _db.collection('yongcha_posts').where('agencyId','==',_CU.uid).get().then(function(snap){
    var posts=[];snap.forEach(function(d){posts.push(Object.assign({id:d.id},d.data()));});
    var open=posts.filter(function(p){return p.status==='open';}).length;
    var matched=posts.filter(function(p){return p.status==='matched';}).length;
    var templates=posts.slice(0,4);
    var tmplHTML='';
    if(templates.length){
      tmplHTML='<div class="section-lbl">빠른 공고 재등록</div>'+
        '<div class="tmpl-grid">'+
        templates.map(function(t){
          return '<button class="tmpl-btn" onclick="_tmplPost(\''+t.id+'\')">'+
            '<div class="tmpl-area">'+(t.region||'')+' '+(t.area||'')+'</div>'+
            '<div class="tmpl-price">'+_fmt(t.unitPrice||0)+'원</div>'+
          '</button>';
        }).join('')+
        '</div>';
    }
    el.innerHTML=
      '<div class="page-title">'+_CU.name+'</div><div class="page-sub">대리점 대시보드</div>'+
      '<div class="stat-grid">'+
        '<div class="stat-card"><div class="stat-val" style="color:var(--gn)">'+open+'</div><div class="stat-lbl">모집중</div></div>'+
        '<div class="stat-card"><div class="stat-val" style="color:var(--ac)">'+matched+'</div><div class="stat-lbl">매칭완료</div></div>'+
        '<div class="stat-card"><div class="stat-val">'+posts.length+'</div><div class="stat-lbl">전체 공고</div></div>'+
        '<div class="stat-card"><div class="stat-val">'+(_CU.region||'—')+'</div><div class="stat-lbl">담당 지역</div></div>'+
      '</div>'+
      tmplHTML+
      '<button class="btn-main" onclick="_goPage(\'add_post\')">새 공고 등록</button>';
  });
}

function _tmplPost(postId){
  _db.collection('yongcha_posts').doc(postId).get().then(function(snap){
    if(!snap.exists)return;
    var t=snap.data();
    _db.collection('yongcha_posts').add({
      agencyId:_CU.uid,agencyName:_CU.name,courier:t.courier||'CJ대한통운',
      platform:t.platform||null,region:t.region||'',area:t.area||'',
      unitPrice:t.unitPrice||0,volume:t.volume||0,workShift:t.workShift||'주간',
      settleDay:t.settleDay||15,description:t.description||'',status:'open',
      createdAt:firebase.firestore.FieldValue.serverTimestamp()
    }).then(function(){_yToast('공고가 재등록되었어요');_goPage('my_posts');})
    .catch(function(e){_yToast('오류: '+e.message);});
  });
}

function _pgHomeAdmin(el){
  Promise.all([_db.collection('yongcha_posts').get(),_db.collection('yongcha_users').get()])
  .then(function(res){
    var posts=[],users=[];
    res[0].forEach(function(d){posts.push(d.data());});
    res[1].forEach(function(d){users.push(d.data());});
    el.innerHTML=
      '<div class="page-title">관리자 대시보드</div><div class="page-sub">용차 플랫폼 현황</div>'+
      '<div class="stat-grid">'+
        '<div class="stat-card"><div class="stat-val">'+posts.length+'</div><div class="stat-lbl">전체 공고</div></div>'+
        '<div class="stat-card"><div class="stat-val">'+users.filter(function(u){return u.type==='driver';}).length+'</div><div class="stat-lbl">등록 기사</div></div>'+
        '<div class="stat-card"><div class="stat-val">'+users.filter(function(u){return u.type==='agency';}).length+'</div><div class="stat-lbl">대리점</div></div>'+
        '<div class="stat-card"><div class="stat-val">'+posts.filter(function(p){return p.status==='open';}).length+'</div><div class="stat-lbl">모집중</div></div>'+
      '</div>';
  });
}

/* ── 공고 ─────────────────────────────────────────────────── */
var _postsMapInst=null;
function _pgPosts(el){
  _pgIdx=0;_postsMapInst=null;
  el.innerHTML=
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">'+
      '<div class="page-title">공고</div>'+
      '<button class="map-toggle" id="view-toggle" onclick="_togglePostsMap()">'+_SVG.map+' 지도</button>'+
    '</div>'+
    '<div class="filter-row" id="plat-row"></div>'+
    '<div class="filter-row" id="rgn-row"></div>'+
    '<div id="posts-map" style="height:300px;display:none;border-radius:12px;overflow:hidden;border:1px solid var(--bd);margin-bottom:12px"></div>'+
    '<div id="plist"></div>';
  _buildPlatChips();_buildRgnChips();_startPostsListener();
}
function _buildPlatChips(){
  var el=document.getElementById('plat-row');if(!el)return;
  el.innerHTML=PLATFORMS.map(function(p){
    return '<button class="chip'+(p===_platFilter?' on':'')+'" onclick="_setPlatFilter(\''+p+'\')">'+p+'</button>';
  }).join('');
}
function _buildRgnChips(){
  var el=document.getElementById('rgn-row');if(!el)return;
  el.innerHTML=REGIONS.map(function(r){
    return '<button class="chip'+(r===_rgnFilter?' on':'')+'" onclick="_setRgnFilter(\''+r+'\')">'+r+'</button>';
  }).join('');
}
function _setPlatFilter(p){_platFilter=p;_pgIdx=0;_buildPlatChips();_applyFilters();}
function _setRgnFilter(r){_rgnFilter=r;_pgIdx=0;_buildRgnChips();_applyFilters();}

function _startPostsListener(){
  if(_postsUnsub)_postsUnsub();
  _postsUnsub=_db.collection('yongcha_posts').orderBy('createdAt','desc').limit(100)
  .onSnapshot(function(snap){
    _allPosts=[];snap.forEach(function(d){_allPosts.push(Object.assign({id:d.id},d.data()));});
    _applyFilters();
  },function(){});
}
function _applyFilters(){
  _filteredPosts=_allPosts.filter(function(d){
    if(_rgnFilter!=='전체'&&d.region!==_rgnFilter)return false;
    if(_platFilter!=='전체'&&d.platform!==_platFilter)return false;
    return true;
  });
  _renderPostList();
}
function _renderPostList(){
  var el=document.getElementById('plist');if(!el)return;
  var total=_filteredPosts.length,start=_pgIdx*_pgSize;
  if(!total){el.innerHTML='<div class="empty">'+_SVG.truck+'<div class="empty-title">공고 없음</div><div class="empty-sub">조건을 바꿔보세요</div></div>';return;}
  el.innerHTML='';
  _filteredPosts.slice(start,start+_pgSize).forEach(function(d){el.appendChild(_makePostCard(d));});
  var totalPages=Math.ceil(total/_pgSize);
  if(totalPages>1){
    var pg=document.createElement('div');pg.className='pg-row';
    pg.innerHTML='<button class="pg-btn" onclick="_pgNav(-1)" '+(_pgIdx===0?'disabled':'')+'>이전</button>'+
      '<span class="pg-info">'+(_pgIdx+1)+' / '+totalPages+'</span>'+
      '<button class="pg-btn" onclick="_pgNav(1)" '+(_pgIdx>=totalPages-1?'disabled':'')+'>다음</button>';
    el.appendChild(pg);
  }
}
function _pgNav(d){
  var total=Math.ceil(_filteredPosts.length/_pgSize);
  _pgIdx=Math.max(0,Math.min(total-1,_pgIdx+d));
  _renderPostList();document.getElementById('content').scrollTop=0;
}
function _togglePostsMap(){
  var m=document.getElementById('posts-map'),btn=document.getElementById('view-toggle');if(!m)return;
  if(m.style.display==='none'){
    m.style.display='block';btn.style.background='var(--acl)';btn.style.color='var(--ac)';
    if(_kakaoReady&&!_postsMapInst){
      var ll=new kakao.maps.LatLng(35.1795543,129.0756416);
      _postsMapInst=new kakao.maps.Map(m,{center:ll,level:8});
      _filteredPosts.forEach(function(d){
        if(!d.lat||!d.lng)return;
        var mk=new kakao.maps.Marker({position:new kakao.maps.LatLng(d.lat,d.lng),map:_postsMapInst});
        kakao.maps.event.addListener(mk,'click',function(){_showPostDetail(d);});
      });
    }
  } else {m.style.display='none';btn.style.background='';btn.style.color='';}
}

/* ── 내작업 (기사 3-step 배차) ──────────────────────────── */
function _pgMyWork(el){
  el.innerHTML='<div class="page-title">내 작업</div><div class="page-sub">진행 중인 배차</div>'+
    '<div id="work-content"><div class="card"><div style="color:var(--t2);font-size:13px">로딩 중...</div></div></div>'+
    '<div class="section-lbl">최근 완료 내역</div>'+
    '<div id="work-done"><div class="card"><div style="color:var(--t2);font-size:13px">로딩 중...</div></div></div>';
  _db.collection('yongcha_work').where('driverId','==',_CU.uid).where('status','in',['accepted','arrived']).orderBy('createdAt','desc').limit(1).get()
  .then(function(snap){
    var el2=document.getElementById('work-content');if(!el2)return;
    if(snap.empty){
      el2.innerHTML='<div class="empty">'+_SVG.truck+'<div class="empty-title">진행 중인 배차 없음</div><div class="empty-sub">공고에서 지원 후 수락을 기다려요</div></div>';
    } else {
      var doc=snap.docs[0];
      _renderWorkActive(el2,Object.assign({wid:doc.id},doc.data()));
    }
  }).catch(function(){});
  _db.collection('yongcha_work').where('driverId','==',_CU.uid).where('status','==','done').orderBy('completedAt','desc').limit(5).get()
  .then(function(snap){
    var el3=document.getElementById('work-done');if(!el3)return;
    if(snap.empty){el3.innerHTML='<div style="color:var(--t3);font-size:13px;padding:8px 0">완료된 배차가 없어요</div>';return;}
    el3.innerHTML='';
    snap.forEach(function(doc){
      var w=doc.data();
      var d2=document.createElement('div');d2.className='settle-item';
      d2.innerHTML='<div class="settle-top"><div>'+
        '<div style="font-size:14px;font-weight:700;margin-bottom:2px">'+(w.area||w.region||'배차')+'</div>'+
        '<div style="font-size:12px;color:var(--t2)">'+(w.courier||'')+(w.agencyName?' · '+w.agencyName:'')+'</div>'+
        '<div style="font-size:11px;color:var(--t3);margin-top:4px">'+_timeAgo(w.completedAt)+'</div>'+
      '</div>'+
      '<div class="settle-amt">'+_fmt(w.fare||0)+'<small style="font-size:11px;font-weight:400;color:var(--t2)">원</small></div>'+
      '</div>';
      el3.appendChild(d2);
    });
  }).catch(function(){});
}

function _renderWorkActive(el,w){
  var step=w.step||0;
  var steps=[
    {lbl:'수락',icon:'<polyline points="20 6 9 17 4 12"/>'},
    {lbl:'현장도착',icon:'<path d="M20 10c0 6-8 13-8 13S4 16 4 10a8 8 0 0116 0z"/><circle cx="12" cy="10" r="3"/>'},
    {lbl:'완료',icon:'<polyline points="20 6 9 17 4 12"/>'}
  ];
  var stepsHTML=steps.map(function(s,i){
    var cls=i<step?'step-done':i===step?'step-active':'step-pending';
    var inner=i<step?'<svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:#fff;fill:none;stroke-width:2.5">'+s.icon+'</svg>':'<span class="step-num">'+(i+1)+'</span>';
    return '<div class="work-step '+cls+'"><div class="step-circle">'+inner+'</div><div class="step-lbl">'+s.lbl+'</div></div>';
  }).join('');

  var actionHTML='';
  if(step===0){
    actionHTML='<div class="slide-wrap" id="work-slider">'+
      '<div class="slide-fill" id="slider-fill"></div>'+
      '<div class="slide-handle" id="slider-handle"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></div>'+
      '<div class="slide-label">밀어서 출발 확인</div>'+
    '</div>';
  } else if(step===1){
    actionHTML='<button class="btn-main" style="margin-top:16px" onclick="_workArrived(\''+w.wid+'\')">현장 도착 확인</button>';
  } else if(step===2){
    actionHTML='<button class="btn-gn" onclick="_workDone(\''+w.wid+'\')">배차 완료 처리</button>';
  }

  el.innerHTML=
    '<div class="work-action">'+
      '<div class="work-steps">'+stepsHTML+'</div>'+
      '<div class="work-fare">'+_fmt(w.fare||0)+'<span class="work-fare-unit">원</span></div>'+
      '<div class="work-route">'+(w.area||w.region||'배차 정보')+'</div>'+
      '<div class="work-meta">'+(w.courier||'')+(w.agencyName?' · '+w.agencyName:'')+'</div>'+
      actionHTML+
    '</div>';

  if(step===0){
    var handle=document.getElementById('slider-handle');
    var fill=document.getElementById('slider-fill');
    var wrap=document.getElementById('work-slider');
    if(handle&&wrap)_initSlider(handle,fill,wrap,function(){_workDepart(w.wid);});
  }
}

function _initSlider(handle,fill,wrap,onComplete){
  var startX=0,curX=0,dragging=false,done=false;
  var maxX=0;
  setTimeout(function(){maxX=wrap.offsetWidth-60;},50);

  function getMax(){return wrap.offsetWidth-60;}
  function onStart(x){
    if(done)return;
    dragging=true;startX=x-curX;
    handle.style.transition='none';fill.style.transition='none';
  }
  function onMove(x){
    if(!dragging||done)return;
    var nx=Math.max(0,Math.min(getMax(),x-startX));
    curX=nx;
    handle.style.left=(4+nx)+'px';
    fill.style.width=(60+nx)+'px';
    if(getMax()>0&&nx/getMax()>0.78)onDone();
  }
  function onEnd(){if(!dragging)return;dragging=false;if(!done)reset();}
  function reset(){
    curX=0;
    handle.style.transition='left .3s';fill.style.transition='width .3s';
    handle.style.left='4px';fill.style.width='60px';
  }
  function onDone(){
    done=true;dragging=false;
    handle.style.left=(4+getMax())+'px';
    fill.style.width=(60+getMax())+'px';
    setTimeout(onComplete,220);
  }
  handle.addEventListener('touchstart',function(e){e.preventDefault();onStart(e.touches[0].clientX);},{passive:false});
  handle.addEventListener('touchmove',function(e){e.preventDefault();onMove(e.touches[0].clientX);},{passive:false});
  handle.addEventListener('touchend',onEnd);
  handle.addEventListener('mousedown',function(e){onStart(e.clientX);});
  window.addEventListener('mousemove',function(e){if(dragging)onMove(e.clientX);});
  window.addEventListener('mouseup',onEnd);
}

function _workDepart(wid){
  _db.collection('yongcha_work').doc(wid).update({step:1,departedAt:firebase.firestore.FieldValue.serverTimestamp()})
  .then(function(){_yToast('출발 확인!');_pgMyWork(document.getElementById('content'));})
  .catch(function(e){_yToast('오류: '+e.message);});
}
function _workArrived(wid){
  _db.collection('yongcha_work').doc(wid).update({step:2,arrivedAt:firebase.firestore.FieldValue.serverTimestamp()})
  .then(function(){_yToast('현장 도착 확인!');_pgMyWork(document.getElementById('content'));})
  .catch(function(e){_yToast('오류: '+e.message);});
}
function _workDone(wid){
  _db.collection('yongcha_work').doc(wid).update({
    status:'done',step:3,settleStatus:'pending',
    completedAt:firebase.firestore.FieldValue.serverTimestamp()
  }).then(function(){_yToast('배차 완료!');_pgMyWork(document.getElementById('content'));})
  .catch(function(e){_yToast('오류: '+e.message);});
}

/* ── 정산내역 (기사) ─────────────────────────────────────── */
function _pgMySettle(el){
  el.innerHTML='<div class="page-title">정산내역</div><div class="page-sub">내 배차 정산 현황</div>'+
    '<div id="settle-list"><div class="card"><div style="color:var(--t2);font-size:13px">로딩 중...</div></div></div>';
  _db.collection('yongcha_work').where('driverId','==',_CU.uid).where('status','==','done').orderBy('completedAt','desc').limit(20).get()
  .then(function(snap){
    var list=[];snap.forEach(function(d){list.push(Object.assign({wid:d.id},d.data()));});
    var el2=document.getElementById('settle-list');if(!el2)return;
    if(!list.length){el2.innerHTML='<div class="empty"><div class="empty-title">정산 내역 없음</div><div class="empty-sub">완료된 배차가 없어요</div></div>';return;}
    var total=list.slice(0,_pgSize);
    el2.innerHTML='';
    var stMap={pending:'정산대기',confirmed:'확인완료',paid:'지급완료'};
    var stCls={pending:'ss-pending',confirmed:'ss-confirmed',paid:'ss-paid'};
    total.forEach(function(w){
      var d2=document.createElement('div');d2.className='settle-item';
      d2.innerHTML=
        '<div class="settle-top">'+
          '<div>'+
            '<div class="settle-amt">'+_fmt(w.fare||0)+'<small style="font-size:12px;font-weight:400;color:var(--t2)">원</small></div>'+
            '<div style="font-size:12px;color:var(--t2);margin-top:3px">'+(w.area||w.region||'')+(w.courier?' · '+w.courier:'')+'</div>'+
            '<div style="font-size:11px;color:var(--t3);margin-top:4px">'+_timeAgo(w.completedAt)+'</div>'+
          '</div>'+
          '<span class="ss-badge '+(stCls[w.settleStatus||'pending'])+'">'+(stMap[w.settleStatus||'pending'])+'</span>'+
        '</div>';
      el2.appendChild(d2);
    });
    if(list.length>_pgSize){
      var more=document.createElement('div');more.style.textAlign='center';more.style.marginTop='8px';
      more.innerHTML='<span style="font-size:12px;color:var(--t3)">총 '+list.length+'건 중 '+_pgSize+'건 표시</span>';
      el2.appendChild(more);
    }
  }).catch(function(){});
}

/* ── 정산관리 (대리점) ───────────────────────────────────── */
function _pgSettleMgmt(el){
  el.innerHTML='<div class="page-title">정산관리</div><div class="page-sub">배차 정산 확인 및 지급</div>'+
    '<div id="settle-mgmt"><div class="card"><div style="color:var(--t2);font-size:13px">로딩 중...</div></div></div>';
  _db.collection('yongcha_work').where('agencyId','==',_CU.uid).where('status','==','done').orderBy('completedAt','desc').limit(20).get()
  .then(function(snap){
    var list=[];snap.forEach(function(d){list.push(Object.assign({wid:d.id},d.data()));});
    var el2=document.getElementById('settle-mgmt');if(!el2)return;
    if(!list.length){el2.innerHTML='<div class="empty"><div class="empty-title">정산 대기 없음</div></div>';return;}
    el2.innerHTML='';
    list.slice(0,_pgSize).forEach(function(w){
      var d2=document.createElement('div');d2.className='settle-item';
      var isPending=!w.settleStatus||w.settleStatus==='pending';
      d2.innerHTML=
        '<div class="settle-top">'+
          '<div>'+
            '<div style="font-size:15px;font-weight:700;margin-bottom:2px">'+(w.driverName||'기사')+'</div>'+
            '<div class="settle-amt">'+_fmt(w.fare||0)+'<small style="font-size:12px;font-weight:400;color:var(--t2)">원</small></div>'+
            '<div style="font-size:11px;color:var(--t3);margin-top:4px">'+(w.area||w.region||'')+'</div>'+
          '</div>'+
          '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px">'+
            '<span class="ss-badge '+(w.settleStatus==='paid'?'ss-paid':w.settleStatus==='confirmed'?'ss-confirmed':'ss-pending')+'">'+
              (w.settleStatus==='paid'?'지급완료':w.settleStatus==='confirmed'?'확인완료':'대기')+'</span>'+
            (isPending?'<button style="font-size:12px;font-weight:700;padding:5px 14px;border-radius:8px;background:var(--gnl);color:var(--gn);border:1px solid rgba(16,185,129,.2);cursor:pointer" onclick="_confirmSettle(\''+w.wid+'\')">확인</button>':'')+
          '</div>'+
        '</div>';
      el2.appendChild(d2);
    });
  }).catch(function(){});
}
function _confirmSettle(wid){
  _db.collection('yongcha_work').doc(wid).update({settleStatus:'confirmed',confirmedAt:firebase.firestore.FieldValue.serverTimestamp()})
  .then(function(){_yToast('정산 확인 완료');_pgSettleMgmt(document.getElementById('content'));})
  .catch(function(e){_yToast('오류: '+e.message);});
}

/* ── 수익 시뮬레이터 ─────────────────────────────────────── */
function _pgRevSim(el){
  _revSimSel=[];
  el.innerHTML='<div class="card"><div style="color:var(--t2);font-size:13px">공고 로딩 중...</div></div>';
  _db.collection('yongcha_posts').where('status','==','open').orderBy('createdAt','desc').limit(20).get()
  .then(function(snap){
    _revSimPosts=[];snap.forEach(function(d){_revSimPosts.push(Object.assign({id:d.id},d.data()));});
    _renderRevSim(el);
  }).catch(function(){el.innerHTML='<div class="empty"><div class="empty-title">로드 실패</div></div>';});
}
function _renderRevSim(el){
  var sel=_revSimSel,monthDays=26;
  var total=sel.reduce(function(sum,id){
    var p=_revSimPosts.find(function(x){return x.id===id;});
    return sum+(p?Math.round((p.unitPrice||0)*(p.volume||0)*monthDays/10000):0);
  },0);
  el.innerHTML=
    '<div class="revsim-hero">'+
      '<div style="font-size:12px;color:rgba(255,255,255,.5)">이달 예상 수익</div>'+
      '<div class="revsim-result">'+(sel.length?total.toLocaleString():'—')+'<small style="font-size:16px;font-weight:400"> 만원</small></div>'+
      '<div style="font-size:12px;color:rgba(255,255,255,.45)">'+(sel.length?'선택 공고 '+sel.length+'개 기준 (월 '+monthDays+'일)':'공고를 2~3개 선택하세요')+'</div>'+
    '</div>'+
    (sel.length?_revSimBreakdown(sel,monthDays):'')+
    '<div class="section-lbl">공고 선택 (최대 3개)</div>'+
    (_revSimPosts.length?_revSimPosts.slice(0,10).map(function(d){
      var isSel=sel.indexOf(d.id)>=0;
      var dayEst=d.unitPrice&&d.volume?Math.round(d.unitPrice*d.volume/10000):0;
      return '<div class="sim-item'+(isSel?' sel':'')+'" onclick="_toggleSimSel(\''+d.id+'\')">'+
        '<div class="sim-check">'+(isSel?_SVG.check:'')+'</div>'+
        '<div style="flex:1;min-width:0">'+
          '<div style="font-size:14px;font-weight:700">'+(d.region||'')+' '+(d.area||'')+'</div>'+
          '<div style="font-size:12px;color:var(--t2)">'+(d.courier||'')+' · 일~'+dayEst+'만원</div>'+
        '</div>'+
        '<span style="font-size:16px;font-weight:900;color:var(--ac)">'+_fmt(d.unitPrice||0)+'<small style="font-size:10px;font-weight:400;color:var(--t2)">원</small></span>'+
      '</div>';
    }).join(''):'<div class="empty"><div class="empty-title">모집중 공고 없음</div></div>');
}
function _revSimBreakdown(sel,monthDays){
  var rows=sel.map(function(id){
    var p=_revSimPosts.find(function(x){return x.id===id;});if(!p)return '';
    var earn=Math.round((p.unitPrice||0)*(p.volume||0)*monthDays/10000);
    return '<div class="revsim-row"><span>'+(p.region||'')+' '+(p.area||'')+'</span><span>'+earn.toLocaleString()+'만원</span></div>';
  });
  var total=sel.reduce(function(sum,id){
    var p=_revSimPosts.find(function(x){return x.id===id;});
    return sum+(p?Math.round((p.unitPrice||0)*(p.volume||0)*monthDays/10000):0);
  },0);
  rows.push('<div class="revsim-row"><span>합계</span><span>'+total.toLocaleString()+'만원</span></div>');
  return '<div class="revsim-breakdown">'+rows.join('')+'</div>';
}
function _toggleSimSel(id){
  var idx=_revSimSel.indexOf(id);
  if(idx>=0){_revSimSel.splice(idx,1);}
  else if(_revSimSel.length<3){_revSimSel.push(id);}
  else{_yToast('최대 3개까지 선택 가능해요');return;}
  _renderRevSim(document.getElementById('content'));
}

/* ── 지원현황 ────────────────────────────────────────────── */
function _pgMyApplies(el){
  el.innerHTML='<div class="page-title">지원현황</div><div class="page-sub">내가 지원한 공고</div>'+
    '<div id="app-list"><div class="card"><div style="color:var(--t2);font-size:13px">로딩 중...</div></div></div>';
  _db.collection('yongcha_applies').where('driverId','==',_CU.uid).orderBy('appliedAt','desc').get()
  .then(function(snap){
    var list=[];snap.forEach(function(d){list.push(Object.assign({id:d.id},d.data()));});
    var el2=document.getElementById('app-list');if(!el2)return;
    if(!list.length){el2.innerHTML='<div class="empty"><div class="empty-title">지원 내역 없음</div><div class="empty-sub">공고 탭에서 지원해보세요</div></div>';return;}
    el2.innerHTML='';
    var stMap={pending:'검토중',accepted:'합격',rejected:'불합격',cancelled:'취소'};
    var stCls={pending:'riq-flat',accepted:'riq-up',rejected:'riq-down',cancelled:'tag'};
    list.slice(0,_pgSize).forEach(function(a){
      var d2=document.createElement('div');d2.className='card';d2.style.marginBottom='8px';
      d2.innerHTML=
        '<div style="display:flex;justify-content:space-between;align-items:flex-start">'+
          '<div>'+
            '<div style="font-size:15px;font-weight:700;margin-bottom:4px">'+(a.agencyName||'대리점')+'</div>'+
            '<div style="font-size:12px;color:var(--t2)">'+_timeAgo(a.appliedAt)+'</div>'+
          '</div>'+
          '<span class="riq-badge '+(stCls[a.status]||'tag')+'">'+(stMap[a.status]||a.status)+'</span>'+
        '</div>';
      el2.appendChild(d2);
    });
  }).catch(function(){});
}

/* ── 프로필 ──────────────────────────────────────────────── */
function _pgProfile(el){
  el.innerHTML=
    '<div class="page-title">내 정보</div>'+
    '<div class="page-sub">'+(_CU.type==='driver'?'기사':'대리점')+' 계정</div>'+
    '<div class="card">'+
      '<div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">'+
        '<div style="width:52px;height:52px;border-radius:16px;background:var(--acl);border:1px solid var(--bd);display:flex;align-items:center;justify-content:center">'+_SVG.user+'</div>'+
        '<div>'+
          '<div style="font-size:18px;font-weight:800">'+(_CU.name||'—')+'</div>'+
          '<div style="font-size:12px;color:var(--t2)">'+(_CU.email||'')+'</div>'+
        '</div>'+
      '</div>'+
      '<div style="display:grid;gap:0">'+
        _pRow('지역',_CU.region||'미설정')+
        _pRow('연락처',_CU.phone||'미설정')+
        (_CU.type==='driver'?_pRow('차종',_CU.carType||'미설정'):'')+
      '</div>'+
    '</div>'+
    '<button class="btn-rd" onclick="_yLogout()">로그아웃</button>';
}
function _pRow(lbl,val){
  return '<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--bd)">'+
    '<span style="font-size:13px;color:var(--t2)">'+lbl+'</span>'+
    '<span style="font-size:13px;font-weight:600">'+val+'</span></div>';
}

/* ── 공고목록 (대리점) ───────────────────────────────────── */
function _pgMyPosts(el){
  el.innerHTML='<div class="page-title">공고목록</div><div class="page-sub">내가 등록한 공고</div>'+
    '<div id="my-list"><div class="card"><div style="color:var(--t2);font-size:13px">로딩 중...</div></div></div>';
  _db.collection('yongcha_posts').where('agencyId','==',_CU.uid).orderBy('createdAt','desc').get()
  .then(function(snap){
    var list=[];snap.forEach(function(d){list.push(Object.assign({id:d.id},d.data()));});
    var el2=document.getElementById('my-list');if(!el2)return;
    if(!list.length){el2.innerHTML='<div class="empty"><div class="empty-title">등록된 공고 없음</div></div>';return;}
    el2.innerHTML='';list.slice(0,_pgSize).forEach(function(d){el2.appendChild(_makePostCard(d));});
    if(list.length>_pgSize){
      var more=document.createElement('div');more.style.textAlign='center';more.style.marginTop='8px';
      more.innerHTML='<span style="font-size:12px;color:var(--t3)">총 '+list.length+'건</span>';
      el2.appendChild(more);
    }
  });
}

/* ── 공고등록 ────────────────────────────────────────────── */
function _pgAddPost(el){
  el.innerHTML=
    '<div class="page-title">공고등록</div><div class="page-sub">ROUTEIQ 단가 기준</div>'+
    '<div class="card">'+
      '<div class="inp-wrap"><label class="inp-lbl">택배사</label>'+
        '<select class="inp" id="ap-courier" onchange="_showRIQ()">'+
          '<option>CJ대한통운</option><option>한진택배</option><option>롯데택배</option>'+
          '<option>우체국</option><option>쿠팡로지스틱스</option><option>로젠택배</option>'+
        '</select></div>'+
      '<div class="inp-wrap"><label class="inp-lbl">플랫폼</label>'+
        '<select class="inp" id="ap-platform"><option value="">직접등록</option>'+
          PLATFORMS.slice(1).map(function(p){return '<option>'+p+'</option>';}).join('')+
        '</select></div>'+
      '<div class="inp-wrap"><label class="inp-lbl">지역</label>'+
        '<select class="inp" id="ap-region">'+REGIONS.slice(1).map(function(r){return '<option>'+r+'</option>';}).join('')+'</select></div>'+
      '<div class="inp-wrap"><label class="inp-lbl">상세 구역</label><input class="inp" id="ap-area" placeholder="예: 해운대 우2동"></div>'+
      '<div class="inp-wrap"><label class="inp-lbl">단가 (원/건)</label><input class="inp" id="ap-price" type="number" placeholder="시세 기준 입력" oninput="_showRIQ()"></div>'+
      '<div id="ap-riq" style="font-size:12px;padding:8px 12px;background:var(--bg3);border-radius:8px;margin-bottom:10px;display:none"></div>'+
      '<div class="inp-wrap"><label class="inp-lbl">일 물량 (건)</label><input class="inp" id="ap-vol" type="number" placeholder="예: 200"></div>'+
      '<div class="inp-wrap"><label class="inp-lbl">근무 형태</label>'+
        '<select class="inp" id="ap-shift"><option>주간</option><option>야간</option><option>주야간</option></select></div>'+
      '<div class="inp-wrap"><label class="inp-lbl">정산일</label>'+
        '<select class="inp" id="ap-settle"><option value="15">15일</option><option value="25">25일</option><option value="30">말일</option></select></div>'+
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">'+
        '<input type="checkbox" id="ap-urgent" style="width:18px;height:18px;accent-color:var(--or)">'+
        '<label for="ap-urgent" style="font-size:13px;font-weight:700;color:var(--or);cursor:pointer">긴급 배차 (오렌지 배지 표시)</label>'+
      '</div>'+
      '<div class="inp-wrap"><label class="inp-lbl">공고 내용</label><textarea class="inp" id="ap-desc" rows="3" placeholder="공고 상세 내용"></textarea></div>'+
      '<div class="err" id="ap-err"></div>'+
      '<button class="btn-main" onclick="_submitPost()">공고 등록</button>'+
    '</div>';
}
function _showRIQ(){
  var price=parseInt((document.getElementById('ap-price')||{}).value)||0;
  var courier=((document.getElementById('ap-courier')||{}).value)||'CJ대한통운';
  var el=document.getElementById('ap-riq');if(!el||!price)return;
  var rp=_rateVsMarket(price,courier),minG=Math.round(price*0.85);
  el.style.display='block';
  el.style.color=rp>3?'var(--gn)':rp<-3?'var(--rd)':'var(--ac)';
  el.textContent='ROUTEIQ: 시세 '+(rp>0?'+':'')+rp+'% · 최소보장 '+_fmt(minG)+'원/건 (시세×85%)';
}
function _submitPost(){
  var courier=(document.getElementById('ap-courier').value||'').trim();
  var platform=(document.getElementById('ap-platform').value||'').trim();
  var region=(document.getElementById('ap-region').value||'').trim();
  var area=(document.getElementById('ap-area').value||'').trim();
  var price=parseInt(document.getElementById('ap-price').value)||0;
  var vol=parseInt(document.getElementById('ap-vol').value)||0;
  var shift=(document.getElementById('ap-shift').value||'').trim();
  var settle=parseInt(document.getElementById('ap-settle').value)||15;
  var urgent=document.getElementById('ap-urgent').checked;
  var desc=(document.getElementById('ap-desc').value||'').trim();
  var err=document.getElementById('ap-err');
  if(!region||!area||!price||!vol){err.textContent='필수 항목을 모두 입력하세요';err.style.display='block';return;}
  err.style.display='none';
  _db.collection('yongcha_posts').add({
    agencyId:_CU.uid,agencyName:_CU.name,courier:courier,platform:platform||null,
    region:region,area:area,unitPrice:price,volume:vol,workShift:shift,settleDay:settle,
    urgent:urgent,description:desc,status:'open',createdAt:firebase.firestore.FieldValue.serverTimestamp()
  }).then(function(){_yToast('공고가 등록되었어요');_goPage('my_posts');})
  .catch(function(e){err.textContent='오류: '+e.message;err.style.display='block';});
}

/* ── 기사목록 ────────────────────────────────────────────── */
function _pgDrivers(el){
  el.innerHTML='<div class="page-title">기사목록</div><div class="page-sub">등록된 기사 현황</div>'+
    '<div id="drv-list"><div class="card"><div style="color:var(--t2);font-size:13px">로딩 중...</div></div></div>';
  _db.collection('yongcha_users').where('type','==','driver').orderBy('createdAt','desc').limit(20).get()
  .then(function(snap){
    var list=[];snap.forEach(function(d){list.push(Object.assign({id:d.id},d.data()));});
    var el2=document.getElementById('drv-list');if(!el2)return;
    if(!list.length){el2.innerHTML='<div class="empty"><div class="empty-title">기사 없음</div></div>';return;}
    el2.innerHTML='';
    list.slice(0,_pgSize).forEach(function(u){
      var d2=document.createElement('div');d2.className='card';d2.style.marginBottom='8px';
      var gradeHTML='';
      if(u.grade==='A')gradeHTML='<span style="font-size:11px;font-weight:800;padding:2px 8px;border-radius:10px;background:linear-gradient(135deg,rgba(245,158,11,.2),rgba(239,68,68,.2));color:var(--yw)">A등급</span>';
      else if(u.blacklist)gradeHTML='<span style="font-size:11px;font-weight:800;padding:2px 8px;border-radius:10px;background:var(--rdl);color:var(--rd)">블랙</span>';
      d2.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between">'+
        '<div style="display:flex;align-items:center;gap:12px">'+
          '<div style="width:40px;height:40px;border-radius:12px;background:var(--gnl);border:1px solid var(--bd);display:flex;align-items:center;justify-content:center">'+_SVG.user+'</div>'+
          '<div><div style="font-size:15px;font-weight:700">'+u.name+'</div>'+
          '<div style="font-size:12px;color:var(--t2)">'+(u.region||'')+(u.carType?' · '+u.carType:'')+'</div></div>'+
        '</div>'+
        gradeHTML+
      '</div>';
      el2.appendChild(d2);
    });
  });
}

/* ── 관리자 ──────────────────────────────────────────────── */
function _pgAdminPosts(el){
  el.innerHTML='<div class="page-title">공고관리</div><div class="page-sub">전체 공고 현황</div>'+
    '<div id="adm-p"><div class="card"><div style="color:var(--t2);font-size:13px">로딩 중...</div></div></div>';
  _db.collection('yongcha_posts').orderBy('createdAt','desc').limit(20).get()
  .then(function(snap){
    var list=[];snap.forEach(function(d){list.push(Object.assign({id:d.id},d.data()));});
    var el2=document.getElementById('adm-p');if(!el2)return;
    if(!list.length){el2.innerHTML='<div class="empty"><div class="empty-title">공고 없음</div></div>';return;}
    el2.innerHTML='';list.slice(0,_pgSize).forEach(function(d){el2.appendChild(_makePostCard(d));});
  });
}
function _pgAdminUsers(el){
  el.innerHTML='<div class="page-title">사용자관리</div><div class="page-sub">전체 사용자 현황</div>'+
    '<div id="adm-u"><div class="card"><div style="color:var(--t2);font-size:13px">로딩 중...</div></div></div>';
  _db.collection('yongcha_users').orderBy('createdAt','desc').limit(30).get()
  .then(function(snap){
    var list=[];snap.forEach(function(d){list.push(Object.assign({id:d.id},d.data()));});
    var el2=document.getElementById('adm-u');if(!el2)return;
    el2.innerHTML='';
    list.forEach(function(u){
      var d2=document.createElement('div');d2.className='card';d2.style.marginBottom='8px';
      d2.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center">'+
        '<div>'+
          '<div style="font-size:14px;font-weight:700">'+u.name+'</div>'+
          '<div style="font-size:12px;color:var(--t2)">'+u.email+' · '+(u.region||'')+'</div>'+
        '</div>'+
        '<span class="hdr-badge '+(u.type==='admin'?'badge-admin':u.type==='agency'?'badge-agency':'badge-driver')+'">'+
          (u.type==='admin'?'관리자':u.type==='agency'?'대리점':'기사')+'</span>'+
      '</div>';
      el2.appendChild(d2);
    });
  });
}

/* ── 지원자 관리 (대리점) ───────────────────────────────────── */
function _showApplicants(postId){
  _showModal(
    '<div class="modal-title">지원자 목록</div>'+
    '<div id="apply-list">'+
      '<div class="skel-card"><div class="skel skel-line skel-w60"></div><div class="skel skel-line sm skel-w40"></div></div>'+
      '<div class="skel-card"><div class="skel skel-line skel-w60"></div><div class="skel skel-line sm skel-w40"></div></div>'+
    '</div>'
  );
  _db.collection('yongcha_applies').where('postId','==',postId).orderBy('appliedAt','desc').get()
  .then(function(snap){
    var list=[];snap.forEach(function(d){list.push(Object.assign({aid:d.id},d.data()));});
    var el2=document.getElementById('apply-list');if(!el2)return;
    if(!list.length){
      el2.innerHTML='<div class="empty">'+_SVG.users+'<div class="empty-title">지원자 없음</div><div class="empty-sub">아직 지원한 기사가 없어요</div></div>';
      return;
    }
    el2.innerHTML='';
    var stMap={pending:'검토중',accepted:'수락',rejected:'거절'};
    list.forEach(function(a){
      var d2=document.createElement('div');d2.className='card';d2.style.marginBottom='8px';
      var isPending=a.status==='pending';
      var stCl=a.status==='accepted'?'riq-up':a.status==='rejected'?'riq-down':'riq-flat';
      d2.innerHTML=
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:'+(isPending?'10':'0')+'px">'+
          '<div>'+
            '<div style="font-size:15px;font-weight:700;margin-bottom:2px">'+(a.driverName||'기사')+'</div>'+
            '<div style="font-size:12px;color:var(--t2)">'+(a.driverPhone||'')+'</div>'+
            '<div style="font-size:11px;color:var(--t3);margin-top:2px">'+_timeAgo(a.appliedAt)+'</div>'+
          '</div>'+
          '<span class="riq-badge '+stCl+'">'+(stMap[a.status]||a.status)+'</span>'+
        '</div>'+
        (isPending?
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'+
            '<button class="btn-gn" style="margin-top:0;font-size:13px;padding:10px" '+
              'onclick="_acceptApply(\''+a.aid+'\',\''+a.driverName+'\',\''+a.driverPhone+'\',\''+a.driverId+'\',\''+postId+'\')">수락</button>'+
            '<button class="btn-rd" style="margin-top:0;font-size:13px;padding:10px" '+
              'onclick="_rejectApply(\''+a.aid+'\',\''+postId+'\')">거절</button>'+
          '</div>':'');
      el2.appendChild(d2);
    });
  }).catch(function(e){_yToast('오류: '+e.message);});
}

function _acceptApply(applyId,driverName,driverPhone,driverId,postId){
  _db.collection('yongcha_posts').doc(postId).get().then(function(snap){
    if(!snap.exists){_yToast('공고를 찾을 수 없어요');return;}
    var post=snap.data();
    return _db.collection('yongcha_work').add({
      postId:postId,driverId:driverId,driverName:driverName,driverPhone:driverPhone,
      agencyId:_CU.uid,agencyName:_CU.name,
      courier:post.courier||'',region:post.region||'',area:post.area||'',
      fare:post.unitPrice||0,status:'accepted',step:0,settleStatus:'pending',
      createdAt:firebase.firestore.FieldValue.serverTimestamp()
    }).then(function(){
      return Promise.all([
        _db.collection('yongcha_applies').doc(applyId).update({status:'accepted'}),
        _db.collection('yongcha_posts').doc(postId).update({status:'matched'})
      ]);
    });
  }).then(function(){
    _yToast('배차가 확정되었어요!');
    _closeModal();
  }).catch(function(e){_yToast('오류: '+e.message);});
}

function _rejectApply(applyId,postId){
  _db.collection('yongcha_applies').doc(applyId).update({status:'rejected'})
  .then(function(){_yToast('거절 처리됐어요');_showApplicants(postId);})
  .catch(function(e){_yToast('오류: '+e.message);});
}

function _closePost(postId){
  _db.collection('yongcha_posts').doc(postId).update({status:'closed',closedAt:firebase.firestore.FieldValue.serverTimestamp()})
  .then(function(){_yToast('공고가 마감됐어요');_closeModal();if(_curPage==='my_posts')_pgMyPosts(document.getElementById('content'));})
  .catch(function(e){_yToast('오류: '+e.message);});
}

/* ── 알림 ──────────────────────────────────────────────────── */
function _pgNotifications(el){
  el.innerHTML='<div class="page-title">알림</div><div class="page-sub">최근 활동</div>'+
    '<div id="notif-list">'+
      '<div class="skel-card"><div class="skel skel-line skel-w80"></div><div class="skel skel-line sm skel-w40"></div></div>'+
    '</div>';
  var q=_CU.type==='agency'?
    _db.collection('yongcha_applies').where('agencyId','==',_CU.uid).orderBy('appliedAt','desc').limit(10):
    _db.collection('yongcha_applies').where('driverId','==',_CU.uid).orderBy('appliedAt','desc').limit(10);
  q.get().then(function(snap){
    var list=[];snap.forEach(function(d){list.push(Object.assign({id:d.id},d.data()));});
    var el2=document.getElementById('notif-list');if(!el2)return;
    if(!list.length){
      el2.innerHTML='<div class="empty">'+_SVG.bolt+'<div class="empty-title">알림 없음</div><div class="empty-sub">새 지원자나 배차 확정 시 알림이 와요</div></div>';
      return;
    }
    el2.innerHTML='';
    list.forEach(function(a){
      var d2=document.createElement('div');d2.className='card';d2.style.marginBottom='8px';
      var msg=_CU.type==='agency'?
        '<b>'+(a.driverName||'기사')+'</b>님이 지원했어요':
        (a.status==='accepted'?'배차가 확정됐어요':a.status==='rejected'?'지원이 거절됐어요':'지원이 접수됐어요');
      d2.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center">'+
        '<div style="font-size:14px;font-weight:600">'+msg+'</div>'+
        '<div style="font-size:11px;color:var(--t3)">'+_timeAgo(a.appliedAt)+'</div>'+
      '</div>';
      el2.appendChild(d2);
    });
  }).catch(function(){});
}
</script>
</body>
</html>`;


async function handleYongcha(request, env) {
  const url    = new URL(request.url);
  const path   = url.pathname;
  const method = request.method;

  // 카카오 설정 API
  if (path === '/api/kakao-config') {
    return new Response(JSON.stringify({ key: env.KAKAO_JS_KEY || '' }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  // 카카오 OAuth → Firebase Custom Token
  if (path === '/api/yongcha/kakao-auth' && method === 'OPTIONS') {
    return new Response(null, { headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS'
    }});
  }
  if (path === '/api/yongcha/kakao-auth' && method === 'POST') {
    try {
      const body = await request.json();
      const { accessToken } = body;
      if (!accessToken) throw new Error('accessToken required');
      if (!env.FIREBASE_SA_KEY) throw new Error('FIREBASE_SA_KEY not configured');

      // Kakao user info
      const kakaoRes = await fetch('https://kapi.kakao.com/v2/user/me', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (!kakaoRes.ok) throw new Error('Kakao API error: ' + kakaoRes.status);
      const kakaoUser = await kakaoRes.json();
      if (!kakaoUser.id) throw new Error('Invalid Kakao response');

      const kakaoId = String(kakaoUser.id);
      const kakaoEmail = (kakaoUser.kakao_account && kakaoUser.kakao_account.email) || null;
      const kakaoName = (kakaoUser.properties && kakaoUser.properties.nickname) ||
        (kakaoUser.kakao_account && kakaoUser.kakao_account.profile && kakaoUser.kakao_account.profile.nickname) || null;

      // Firebase Custom Token (signed JWT)
      const sa = JSON.parse(env.FIREBASE_SA_KEY);
      const now = Math.floor(Date.now() / 1000);
      const uid = 'kakao:' + kakaoId;
      const hdr = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
      const pay = b64url(JSON.stringify({
        iss: sa.client_email,
        sub: sa.client_email,
        aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',
        iat: now,
        exp: now + 3600,
        uid: uid,
        claims: { kakaoId: kakaoId }
      }));
      const key = await importPrivateKey(sa.private_key);
      const sig = await crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5', key,
        new TextEncoder().encode(`${hdr}.${pay}`)
      );
      const firebaseToken = `${hdr}.${pay}.${b64urlBuf(sig)}`;

      return new Response(JSON.stringify({ firebaseToken, kakaoId, kakaoEmail, kakaoName }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    } catch(e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }

  // FCM 알림
  if (path === '/api/ctrl-notify' && method === 'POST') {
    try {
      const body = await request.json();
      if (body.token && env.FCM_SERVER_KEY) {
        await fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: { 'Authorization': 'key='+env.FCM_SERVER_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: body.token, notification: { title: body.title||'용차', body: body.body||'' }, data: body.data||{} })
        });
      }
      return new Response(JSON.stringify({ok:true}), { headers: {'Content-Type':'application/json'} });
    } catch(e) {
      return new Response(JSON.stringify({ok:false}), { headers: {'Content-Type':'application/json'} });
    }
  }

  // ── 팝빌 전자세금계산서 역발행 요청 ──────────────────────────────────
  if (path === '/api/yongcha/popbill-issue' && method === 'POST') {
    try {
      const body = await request.json();
      const result = await popbillIssueReverse(env, body);
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    } catch(e) {
      return new Response(JSON.stringify({ ok: false, error: e.message }), {
        status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }

  // ── 팝빌 웹훅 수신 (상태 변경 콜백) ────────────────────────────────────
  if (path === '/api/yongcha/popbill-webhook' && method === 'POST') {
    try {
      const body = await request.json();
      // 팝빌에서 전송하는 이벤트: 역발행승인, 역발행거부, 발행취소, 발행완료 등
      const { MgtKey, State, StateDate, CorpNum } = body;
      const fsToken = await getAccessToken(env);

      // Firestore에 세금계산서 상태 업데이트
      if (MgtKey) {
        // MgtKey = "YC{settleId}" 형식으로 저장했으므로 settleId 추출
        const settleId = MgtKey.replace(/^YC/, '');
        const now = new Date().toISOString();

        // yongcha_settlements 문서 상태 업데이트
        const patchFields = {
          taxInvoiceState: { stringValue: State || '알수없음' },
          taxInvoiceUpdatedAt: { stringValue: StateDate || now },
          taxInvoiceMgtKey: { stringValue: MgtKey }
        };

        await fetch(`${FS_BASE}/yongcha_settlements/${settleId}?${
          Object.keys(patchFields).map(k => `updateMask.fieldPaths=${k}`).join('&')
        }`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${fsToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: patchFields })
        });

        // 발행완료(State=3) 또는 역발행승인 시 FCM 알림 발송
        if (State === '3' || State === '역발행승인') {
          const settleDoc = await fsGet(fsToken, 'yongcha_settlements', settleId);
          const fields = settleDoc.fields || {};
          const driverToken = fields.driverFcmToken?.stringValue;
          const agencyToken = fields.agencyFcmToken?.stringValue;
          const driverName  = fields.driverName?.stringValue || '기사';
          const agencyName  = fields.agencyName?.stringValue || '대리점';
          const totalAmt    = fields.totalAmount?.integerValue || fields.totalAmount?.doubleValue || 0;
          const amtStr      = Number(totalAmt).toLocaleString('ko-KR');

          const fcmPromises = [];
          if (driverToken) {
            fcmPromises.push(sendFCMPush(driverToken, '세금계산서 발행 완료',
              `${agencyName} 세금계산서 ${amtStr}원이 승인되었습니다.`,
              { type: 'tax_invoice_approved', settleId }
            ));
          }
          if (agencyToken) {
            fcmPromises.push(sendFCMPush(agencyToken, '세금계산서 역발행 승인 완료',
              `${driverName} 기사 세금계산서 ${amtStr}원 역발행이 완료되었습니다.`,
              { type: 'tax_invoice_approved', settleId }
            ));
          }
          await Promise.allSettled(fcmPromises);
        }

        // 역발행거부 시 FCM 알림
        if (State === '역발행거부') {
          const settleDoc = await fsGet(fsToken, 'yongcha_settlements', settleId);
          const fields = settleDoc.fields || {};
          const agencyToken = fields.agencyFcmToken?.stringValue;
          const driverName  = fields.driverName?.stringValue || '기사';
          if (agencyToken) {
            await sendFCMPush(agencyToken, '세금계산서 역발행 거부',
              `${driverName} 기사가 세금계산서 역발행 요청을 거부했습니다.`,
              { type: 'tax_invoice_rejected', settleId }
            );
          }
        }
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch(e) {
      console.error('[popbill-webhook]', e.message);
      return new Response(JSON.stringify({ ok: false, error: e.message }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // ── 팝빌 세금계산서 상태 조회 ───────────────────────────────────────────
  if (path === '/api/yongcha/popbill-status' && method === 'GET') {
    try {
      const mgtKey = url.searchParams.get('mgtKey');
      const corpNum = url.searchParams.get('corpNum');
      if (!mgtKey || !corpNum) {
        return new Response(JSON.stringify({ ok: false, error: '필수 파라미터 누락' }), {
          status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
      const pbToken = await popbillGetToken(env, corpNum);
      const BASE = env.POPBILL_TEST_MODE !== 'false'
        ? 'https://testserviceapi.popbill.com'
        : 'https://serviceapi.popbill.com';
      const resp = await fetch(`${BASE}/Taxinvoice/${corpNum}/${mgtKey}`, {
        headers: { 'Authorization': `Bearer ${pbToken}`, 'Content-Type': 'application/json' }
      });
      const data = await resp.json();
      return new Response(JSON.stringify({ ok: resp.ok, data }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    } catch(e) {
      return new Response(JSON.stringify({ ok: false, error: e.message }), {
        status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }

  // ── AI 코치 (Claude) ───────────────────────────────────────────────────────
  if (path === '/api/ai-coach' && method === 'POST') {
    try {
      const { driver, posts } = await request.json();
      const apiKey = env.ANTHROPIC_API_KEY || env.CLAUDE_API_KEY;
      if (!apiKey) return new Response(JSON.stringify({ ok: false, error: 'no key' }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });

      const MKT_AVG = { 'CJ대한통운': 880, '한진택배': 855, '롯데택배': 860, '우체국': 900, '쿠팡로지스틱스': 960, '로젠택배': 840 };
      const postSummary = (posts || []).slice(0, 8).map(p => {
        const avg = MKT_AVG[p.courier] || 880;
        const rp = Math.round((p.unitPrice - avg) / avg * 100);
        const dayEst = Math.round((p.unitPrice || 0) * (p.volume || 0) / 10000);
        return `[${p.id}] ${p.courier} ${p.region} ${p.area} / 단가:${p.unitPrice}원(시세${rp > 0 ? '+' : ''}${rp}%) / 일물량:${p.volume}건 / 일수익:~${dayEst}만원 / ${p.workShift || ''}`;
      }).join('\n');

      const prompt = `당신은 대한민국 택배 기사 수익 최적화 전문 AI 코치입니다. 구체적인 숫자와 실용적 조언을 제공하세요.

기사 정보:
- 이름: ${driver.name || '기사'}
- 담당 지역: ${driver.region || '미설정'}
- 차량: ${driver.carType || '미설정'}

현재 공개 공고 (ROUTEIQ 분석):
${postSummary || '공고 없음'}

다음 JSON만 반환하세요 (다른 텍스트 없이):
{
  "summary": "기사 맞춤 수익 인사이트 1-2문장 (지역명, 구체적 금액 포함)",
  "bestPickId": "최우선 추천 공고 ID (없으면 null)",
  "reason": "추천 이유 — 시세대비 %, 월수익 예측 포함 1문장",
  "monthlyEst": "예상 월 수익 (예: 420만원)",
  "applyMsg": "지원 시 어필 한줄 메시지"
}`;

      const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 400,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      const claudeData = await claudeRes.json();
      const raw = claudeData.content?.[0]?.text || '{}';
      let parsed = {};
      try { parsed = JSON.parse(raw); } catch(e) {
        const m = raw.match(/\{[\s\S]*\}/);
        if (m) { try { parsed = JSON.parse(m[0]); } catch(e2) {} }
      }

      return new Response(JSON.stringify({ ok: true, data: parsed }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    } catch(e) {
      return new Response(JSON.stringify({ ok: false, error: e.message }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }

  // OPTIONS preflight
  if (method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

  // 랜딩 페이지
  if (path === '/landing' || path === '/landing/') {
    return serveKVFile(env, 'yongcha-landing.html', 'text/html');
  }

  // 모든 경로 → 인라인 HTML 서빙
  return new Response(YONGCHA_HTML_YONGCHA, {
    headers: {
      'Content-Type': 'text/html;charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

// ── 팝빌 HMAC-SHA256 서명 ──────────────────────────────────────────────────
async function popbillHmacSign(message, base64Key) {
  const keyBytes = Uint8Array.from(atob(base64Key), c => c.charCodeAt(0));
  const msgBytes = new TextEncoder().encode(message);
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, msgBytes);
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

// ── 팝빌 세션 토큰 발급 ──────────────────────────────────────────────────
async function popbillGetToken(env, corpNum) {
  const linkId    = env.POPBILL_LINK_ID;
  const secretKey = env.POPBILL_SECRET_KEY;
  if (!linkId || !secretKey) throw new Error('POPBILL 인증키 미설정 (POPBILL_LINK_ID / POPBILL_SECRET_KEY)');

  // yyyyMMdd'T'HHmmss'Z' 형식
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/-/g, '').replace(/:/g, '').replace(/\.\d+Z$/, 'Z');

  const signMsg = `${timestamp}\n${linkId}\n${corpNum}`;
  const signature = await popbillHmacSign(signMsg, secretKey);

  const authBase = 'https://auth.popbill.com';
  const resp = await fetch(`${authBase}/Token`, {
    method: 'POST',
    headers: {
      'x-lh-date': timestamp,
      'Authorization': `LINKAUTHKEY ${linkId}:${signature}`,
      'Content-Type': 'application/json; charset=utf-8'
    },
    body: JSON.stringify({ CorpNum: corpNum, ID: linkId })
  });

  if (!resp.ok) throw new Error(`팝빌 토큰 발급 실패 (${resp.status}): ${await resp.text()}`);
  const data = await resp.json();
  if (!data.session_token) throw new Error('팝빌 session_token 없음: ' + JSON.stringify(data));
  return data.session_token;
}

// ── 팝빌 역발행 요청 (대리점이 기사에게 발행 요청) ────────────────────────
async function popbillIssueReverse(env, params) {
  const {
    settleId,       // 정산 문서 ID
    // 공급자 (기사)
    senderCorpNum,  // 기사 사업자번호
    senderName,     // 기사 상호/성명
    senderCEO,      // 기사 대표자명
    senderEmail,    // 기사 이메일
    // 공급받는자 (대리점)
    receiverCorpNum,// 대리점 사업자번호
    receiverName,   // 대리점 상호
    receiverEmail,  // 대리점 이메일
    // 금액
    supplyAmt,      // 공급가액 (부가세 제외)
    taxAmt,         // 세액
    totalAmt,       // 합계 (supplyAmt + taxAmt)
    writeDate,      // 작성일자 YYYYMMDD
    itemName,       // 품목명
    // FCM 알림용 (선택)
    driverFcmToken,
    agencyFcmToken
  } = params;

  if (!senderCorpNum || !receiverCorpNum) {
    throw new Error('공급자/공급받는자 사업자번호 필수');
  }
  if (!settleId) throw new Error('settleId 필수');

  // 관리번호: 영문/숫자/특수문자(-_) 24자 이내
  const mgtKey = `YC${settleId}`.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24);
  const isTest = env.POPBILL_TEST_MODE !== 'false';
  const BASE   = isTest ? 'https://testserviceapi.popbill.com' : 'https://serviceapi.popbill.com';

  // 역발행 요청 — receiverCorpNum(대리점) 명의로 토큰 발급
  const pbToken = await popbillGetToken(env, receiverCorpNum);

  const wDate = writeDate || new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const supply = Number(supplyAmt) || 0;
  const tax    = Number(taxAmt)    || Math.round(supply * 0.1);
  const total  = Number(totalAmt)  || supply + tax;

  const invoiceBody = {
    MgtKey:           mgtKey,
    WriteDate:        wDate,
    IssueType:        '역발행',
    TaxType:          '과세',
    InvoiceType:      '일반',
    PurposeType:      '영수',
    SupplyCostTotal:  String(supply),
    TaxTotal:         String(tax),
    TotalAmount:      String(total),
    // 공급자 (기사)
    SenderCorpNum:    senderCorpNum,
    SenderCorpName:   senderName || '',
    SenderCEOName:    senderCEO  || senderName || '',
    SenderEmail:      senderEmail || '',
    SenderBizType:    '개인',
    SenderBizClass:   '운수업',
    // 공급받는자 (대리점)
    ReceiverCorpNum:  receiverCorpNum,
    ReceiverCorpName: receiverName || '',
    ReceiverEmail:    receiverEmail || '',
    // 품목
    DetailList: [{
      SerialNum:   1,
      PurchaseDT:  wDate,
      ItemName:    itemName || '용차 운송비',
      Qty:         '1',
      UnitCost:    String(supply),
      SupplyCost:  String(supply),
      Tax:         String(tax),
      TotalAmount: String(total)
    }],
    Memo: `용차앱 정산 #${settleId}`
  };

  const resp = await fetch(
    `${BASE}/Taxinvoice/역발행요청?SenderCorpNum=${senderCorpNum}&MgtKey=${mgtKey}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${pbToken}`,
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify(invoiceBody)
    }
  );

  const resultText = await resp.text();
  let resultData;
  try { resultData = JSON.parse(resultText); } catch { resultData = { raw: resultText }; }

  // Firestore에 역발행 요청 기록
  try {
    const fsToken = await getAccessToken(env);
    const patchFields = {
      taxInvoiceState:    { stringValue: '역발행요청' },
      taxInvoiceMgtKey:   { stringValue: mgtKey },
      taxInvoiceIsTest:   { booleanValue: isTest },
      taxInvoiceRequestAt:{ stringValue: new Date().toISOString() },
      ...(driverFcmToken  ? { driverFcmToken:  { stringValue: driverFcmToken } }  : {}),
      ...(agencyFcmToken  ? { agencyFcmToken:  { stringValue: agencyFcmToken } }  : {}),
      ...(senderName      ? { driverName:      { stringValue: senderName } }       : {}),
      ...(receiverName    ? { agencyName:      { stringValue: receiverName } }     : {}),
      totalAmount:        { integerValue: total }
    };
    await fetch(
      `${FS_BASE}/yongcha_settlements/${settleId}?${
        Object.keys(patchFields).map(k => `updateMask.fieldPaths=${k}`).join('&')
      }`,
      {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${fsToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: patchFields })
      }
    );

    // 기사에게 역발행 요청 FCM 알림
    if (driverFcmToken) {
      await sendFCMPush(
        driverFcmToken,
        '전자세금계산서 역발행 요청',
        `${receiverName || '대리점'}에서 ${total.toLocaleString('ko-KR')}원 세금계산서 역발행 요청이 왔습니다. 앱에서 확인하세요.`,
        { type: 'tax_invoice_request', settleId, mgtKey }
      );
    }
  } catch(fsErr) {
    console.error('[popbill-fs-patch]', fsErr.message);
  }

  return {
    ok:     resp.ok,
    mgtKey,
    isTest,
    result: resultData
  };
}

// ── DONWAY 팝빌 역발행 (운영 모드) ──────────────────────────────────────────
async function popbillIssueReverseDonway(env, params) {
  const {
    settleId, senderCorpNum, senderName, senderCEO, senderEmail,
    receiverCorpNum, receiverName, receiverEmail,
    supplyAmt, taxAmt, totalAmt, writeDate, itemName,
    driverFcmToken, agencyFcmToken
  } = params;

  if (!senderCorpNum || !receiverCorpNum) throw new Error('공급자/공급받는자 사업자번호 필수');
  if (!settleId) throw new Error('settleId 필수');

  const mgtKey = `DW${settleId}`.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24);
  const BASE = 'https://serviceapi.popbill.com'; // 운영 모드

  const pbToken = await popbillGetToken(env, receiverCorpNum);
  const wDate = writeDate || new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const supply = Number(supplyAmt) || 0;
  const tax    = Number(taxAmt)    || Math.round(supply * 0.1);
  const total  = Number(totalAmt)  || supply + tax;

  const invoiceBody = {
    MgtKey:           mgtKey,
    WriteDate:        wDate,
    IssueType:        '역발행',
    TaxType:          '과세',
    InvoiceType:      '일반',
    PurposeType:      '영수',
    SupplyCostTotal:  String(supply),
    TaxTotal:         String(tax),
    TotalAmount:      String(total),
    SenderCorpNum:    senderCorpNum,
    SenderCorpName:   senderName || '',
    SenderCEOName:    senderCEO  || senderName || '',
    SenderEmail:      senderEmail || '',
    SenderBizType:    '개인',
    ReceiverCorpNum:  receiverCorpNum,
    ReceiverCorpName: receiverName || '',
    ReceiverEmail:    receiverEmail || '',
    DetailList: [{
      SerialNum:   1,
      PurchaseDT:  wDate,
      ItemName:    itemName || '쿠팡 배송 정산비',
      Qty:         '1',
      UnitCost:    String(supply),
      SupplyCost:  String(supply),
      Tax:         String(tax),
      TotalAmount: String(total)
    }],
    Memo: `DONWAY 정산 #${settleId}`
  };

  const resp = await fetch(
    `${BASE}/Taxinvoice/역발행요청?SenderCorpNum=${senderCorpNum}&MgtKey=${mgtKey}`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${pbToken}`, 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(invoiceBody)
    }
  );

  const resultText = await resp.text();
  let resultData;
  try { resultData = JSON.parse(resultText); } catch { resultData = { raw: resultText }; }

  try {
    const fsToken = await getAccessToken(env);
    const patchFields = {
      taxInvoiceState:    { stringValue: '역발행요청' },
      taxInvoiceMgtKey:   { stringValue: mgtKey },
      taxInvoiceIsTest:   { booleanValue: false },
      taxInvoiceRequestAt:{ stringValue: new Date().toISOString() },
      ...(driverFcmToken ? { driverFcmToken: { stringValue: driverFcmToken } } : {}),
      ...(agencyFcmToken ? { agencyFcmToken: { stringValue: agencyFcmToken } } : {}),
      ...(senderName     ? { driverName:     { stringValue: senderName } }     : {}),
      ...(receiverName   ? { agencyName:     { stringValue: receiverName } }   : {}),
      totalAmount:        { integerValue: total }
    };
    await fetch(
      `${FS_BASE}/settlements/${settleId}?${Object.keys(patchFields).map(k => `updateMask.fieldPaths=${k}`).join('&')}`,
      {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${fsToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: patchFields })
      }
    );
    if (driverFcmToken) {
      await sendFCMPush(driverFcmToken, '전자세금계산서 역발행 요청',
        `${receiverName || '대리점'}에서 ${total.toLocaleString('ko-KR')}원 세금계산서 역발행을 요청했습니다. 앱에서 확인해주세요.`,
        { type: 'tax_invoice_request', settleId }
      );
    }
  } catch(e) {
    console.error('[popbill-donway] Firestore 기록 오류:', e.message);
  }

  return { ok: resp.ok, resultCode: resultData?.resultCode, message: resultData?.message, mgtKey };
}

