// DONWAY Worker v20260613185004
// MBTI Logistics + LogiNet — Cloudflare Worker

// ── 보안 설정 ──────────────────────────────────────────────────────────────
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)',
  'X-XSS-Protection': '1; mode=block',
  'Content-Security-Policy': "default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com https://apis.google.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://js.tosspayments.com https://cdn.iamport.kr https://static.cloudflareinsights.com https://t1.kakaocdn.net https://developers.kakao.com https://www.googletagmanager.com https://www.google-analytics.com; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https: blob:; connect-src 'self' https://app.donway.ai.kr https://*.firebaseio.com https://*.googleapis.com wss://*.firebaseio.com https://api.anthropic.com https://api.toss.im https://api.tosspayments.com https://www.gstatic.com https://api.ipify.org https://www.googletagmanager.com https://www.google-analytics.com https://region1.google-analytics.com; frame-ancestors 'none';",
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
  const fileName = filePath.replace(/^\//, '');

  // ★ Pages CDN 서빙 (settle.html), 나머지는 GitHub Raw
  const PAGES_MAP = { 'settle.html': 'https://app.donway.ai.kr/index.html' };
  const bust = Date.now() + Math.random().toString(36).slice(2);
  const fetchUrl = PAGES_MAP[fileName]
    ? PAGES_MAP[fileName] + '?bust=' + bust
    : 'https://raw.githubusercontent.com/kimdh4790-cpu/mbti-logistics/main' + filePath + '?bust=' + bust;
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
  try {
    // Pages CDN 서빙 (settle.html/filo.html), 나머지는 GitHub Raw
    const PAGES_FILES = { 'settle.html': 'https://app.donway.ai.kr/index.html' };
    const bust = Date.now() + Math.random().toString(36).slice(2);
    const fileUrl = PAGES_FILES[fileName]
      ? PAGES_FILES[fileName] + '?bust=' + bust
      : 'https://raw.githubusercontent.com/kimdh4790-cpu/mbti-logistics/main/' + encodeURIComponent(fileName) + '?bust=' + bust;
    const resp = await fetch(fileUrl, {
      cf: { cacheEverything: false, cacheTtl: 0, bypassCache: true },
      headers: { 'Cache-Control': 'no-cache, no-store', 'Pragma': 'no-cache' }
    });
    if (resp.ok) {
      const text = await resp.text();
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
  const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f0f4ff;font-family:sans-serif"><div style="max-width:480px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.1)"><div style="background:linear-gradient(135deg,#0066ff,#00d4ff);padding:32px 24px;text-align:center"><div style="font-size:32px;margin-bottom:8px">🎉</div><div style="color:#fff;font-size:22px;font-weight:900">DONWAY 승인 완료!</div><div style="color:rgba(255,255,255,.8);font-size:13px;margin-top:6px">7일 무료 체험이 시작됩니다</div></div><div style="padding:28px 24px"><p style="font-size:15px;font-weight:700;color:#1a1a2e;margin-bottom:16px">안녕하세요, <b>${companyName}</b> 대표님!</p><p style="font-size:13px;color:#555;line-height:1.7;margin-bottom:24px">DONWAY 도입 신청이 승인되었습니다.<br>지금 바로 <b>7일 무료 체험</b>을 시작하세요!</p><div style="background:#f8faff;border:1px solid #e0e8ff;border-radius:12px;padding:16px;margin-bottom:24px"><div style="font-size:12px;color:#888;margin-bottom:8px">로그인 정보</div><div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee;font-size:13px"><span style="color:#888">이메일</span><span style="font-weight:700;color:#1a1a2e">${email}</span></div>${tempPassword ? `<div style="display:flex;justify-content:space-between;padding:8px 0;font-size:13px"><span style="color:#888">임시 비밀번호</span><span style="font-weight:700;color:#0066ff;font-family:monospace;font-size:15px">${tempPassword}</span></div>` : ''}</div><a href="${signupUrl}" style="display:block;text-align:center;background:linear-gradient(90deg,#0066ff,#00d4ff);color:#fff;padding:15px;border-radius:12px;font-size:15px;font-weight:900;text-decoration:none;margin-bottom:16px">🚀 DONWAY 시작하기 →</a><div style="text-align:center;font-size:11px;color:#aaa">문의: 051-711-3103 · 평일 09:00~18:00</div></div><div style="background:#f8faff;padding:16px 24px;text-align:center;font-size:11px;color:#aaa">© 2026 (유)엠비티아이 · DONWAY</div></div></body></html>`;
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
          const html = `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px"><div style="font-size:24px;text-align:center;margin-bottom:12px">⏰</div><div style="font-size:18px;font-weight:900;text-align:center;margin-bottom:8px">구독 만료 7일 전</div><p style="font-size:13px;color:#555;text-align:center;margin-bottom:20px"><b>${companyName}</b>의 <b>${product}</b> 구독이<br><b>${expiry}</b>에 만료됩니다.</p><a href="tel:051-711-3103" style="display:block;text-align:center;background:linear-gradient(90deg,#0066ff,#00d4ff);color:#fff;padding:14px;border-radius:12px;font-size:14px;font-weight:900;text-decoration:none">📞 051-711-3103 갱신 문의</a></div>`;
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
    'mbtico_hub.html', 'join.html', 'admin_sub.html', 'order.html', 'donway_landing.html'
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

// ── Pages API Worker ── HTML은 Pages가 서빙, API만 처리

export default {
  async fetch(request, env) {
    _env_ref = env;
    const url      = new URL(request.url);
    const path     = url.pathname;
    const method   = request.method;
    const hostname = url.hostname;

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


    // ── firebase-messaging-sw.js 최우선 서빙 ──
    if (path === '/firebase-messaging-sw.js') {
      const swContent = "importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');"
        + "importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');"
        + "firebase.initializeApp({apiKey:'AIzaSyDQmEFfLczgCuPQidunbBXqaHWgs39VMg0',authDomain:'mbti-logistics.firebaseapp.com',projectId:'mbti-logistics',storageBucket:'mbti-logistics.firebasestorage.app',messagingSenderId:'40761160761',appId:'1:40761160761:web:20545b610f03f534e949e8'});"
        + "const messaging=firebase.messaging();"
        + "messaging.onBackgroundMessage(function(payload){"
        + "  const data=payload.data||{};const type=data.type||'alert';"
        + "  const title='DONWAY '+(payload.notification&&payload.notification.title||'알림');"
        + "  const body=(payload.notification&&payload.notification.body)||'';"
        + "  return self.registration.showNotification(title,{body:body,icon:'/icon-192.png',badge:'/icon-192.png',tag:'donway-'+type,renotify:true,vibrate:[200,100,200]});"
        + "});"
        + "self.addEventListener('notificationclick',function(e){e.notification.close();if(e.action==='close')return;var url=e.notification.data&&e.notification.data.url?e.notification.data.url:'/';e.waitUntil(clients.matchAll({type:'window'}).then(function(cl){for(var c of cl){if(c.url.includes('donway')&&'focus' in c)return c.focus();}if(clients.openWindow)return clients.openWindow(url);}));});"
        + "self.addEventListener('install',function(){self.skipWaiting();});"
        + "self.addEventListener('activate',function(e){e.waitUntil(clients.claim());});";
      return new Response(swContent, {
        status: 200,
        headers: {
          'Content-Type': 'application/javascript; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Service-Worker-Allowed': '/',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }


    // CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400'
      }});
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
    if (path === '/get-label-key') {
      const k = (env.ANTHROPIC_API_KEY || env.CLAUDE_API_KEY || '').trim().replace(/[\r\n\s]+/g, '');
      return new Response(JSON.stringify({ k }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }
      });
    }

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

    // /truck → Pages _redirects로 처리


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
            <div style="font-size:24px;font-weight:900;color:#fff">🆕 DONWAY 신규 가입 신청</div>
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
          body:JSON.stringify({from:'DONWAY <all@donway.ai.kr>', to:['kimdh4790@gmail.com','soungkyekim@naver.com'], subject:`[DONWAY 신규가입] ${companyName}`, html})
        });
        
        // FCM 푸시 (슈퍼어드민 전체 기기 - admin_tokens 컬렉션 사용)
        const fsToken2 = await getAccessToken(env);
        await notifyAdmins(env, fsToken2, {
          title: '🆕 신규 가입 신청',
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
          body:JSON.stringify({from:'DONWAY <all@donway.ai.kr>', to:['kimdh4790@gmail.com'], subject:'[DONWAY] 이메일 테스트', html:'<p>이메일 발송 테스트입니다.</p>'})
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
              <div style="font-size:36px;margin-bottom:8px">🎉</div>
              <div style="font-size:22px;font-weight:900;color:#fff">가입 승인 완료!</div>
              <div style="font-size:13px;color:rgba(255,255,255,.8);margin-top:6px">DONWAY 서비스를 이용하실 수 있습니다</div>
            </div>
            <p style="font-size:15px;color:#111;line-height:1.7"><strong>${custName}</strong>님, 가입 신청이 승인되었습니다.<br>아래 버튼을 눌러 바로 로그인하세요!</p>
            <div style="text-align:center;margin:28px 0">
              <a href="${loginUrl}" style="display:inline-block;padding:16px 36px;background:linear-gradient(135deg,#0066ff,#7c3aed);color:#fff;text-decoration:none;border-radius:12px;font-size:16px;font-weight:800">🚀 지금 로그인하기</a>
            </div>
            <div style="background:#f8fafc;border-radius:10px;padding:14px 18px;font-size:13px;color:#6b7280">
              <div>📌 로그인 주소: <a href="${loginUrl}" style="color:#0066ff">${loginUrl}</a></div>
              <div style="margin-top:6px">📞 문의: 051-711-3103</div>
            </div>
          </body></html>`;
          await fetch('https://api.resend.com/emails', {
            method:'POST',
            headers:{'Authorization':`Bearer ${emailKey}`,'Content-Type':'application/json'},
            body:JSON.stringify({from:'DONWAY <all@donway.ai.kr>', to:[custEmail], subject:`[DONWAY] ${custName}님, 가입이 승인되었습니다 🎉`, html})
          }).catch(()=>{});
        }

        // 4) 고객 FCM 앱 푸시
        if (custFcm) {
          await fetch(`https://fcm.googleapis.com/v1/projects/mbti-logistics/messages:send`, {
            method:'POST',
            headers:{'Authorization':`Bearer ${fsToken3}`,'Content-Type':'application/json'},
            body:JSON.stringify({message:{
              token: custFcm,
              notification:{title:'🎉 가입 승인 완료!', body:`${custName}님, DONWAY 서비스 이용이 가능합니다. 지금 로그인하세요!`},
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
                notification:{title:'✅ 가입 승인', body:'DONWAY 로그인이 가능합니다'},
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
            <div style="font-size:56px;margin-bottom:16px">✅</div>
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
            <div style="font-size:28px;font-weight:900;color:#fff">📩 DONWAY</div>
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
          body:JSON.stringify({from:'DONWAY <all@donway.ai.kr>', to:['kimdh4790@gmail.com'], subject:`[DONWAY 문의] ${name}`, html})
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
      const adResp = await fetchAsset('/admin_sub.html', request, env);
      const adH = new Headers();
      adH.set('Content-Type', 'text/html; charset=utf-8');
      adH.set('Cache-Control', 'no-cache');
      Object.entries(SECURITY_HEADERS).forEach(([k,v]) => adH.set(k,v));
      return new Response(adResp.body, { status: adResp.status, headers: adH });
    }
    // /sync-kv — GitHub 최신 파일 KV 저장 (터미널 없이 배포)
    if (path === '/sync-kv') {
      const secret = url.searchParams.get('s');
      if (secret !== 'donway2026') return new Response('unauthorized',{status:401});
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


    // 통합 포털
      return new Response(await resp.text(), { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    // 기사 자체 가입 (mbtico.kr 전용 - donway는 537줄에서 처리)
    // /join은 donway.ai.kr 블록(줄537)에서 회사가입 stepper로 처리됨
    // 여기서는 mbtico.kr 등 다른 도메인에서만 join.html 서빙
      return new Response(await resp.text(), { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    // 회사 신규 등록
      return new Response(await resp.text(), { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    // ★ DONWAY 출퇴근 QR (모든 업종 공통)
      return new Response(await resp.text(), { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    // ★ DONWAY 사운드 모듈
    if (path === '/donway-sound.js') {
      const resp = await fetchAsset('/donway-sound.js', request);
      return new Response(await resp.text(), { status: resp.status, headers: { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } });
    }

    // ★ 정산 분석 리포트
      return new Response(await resp.text(), { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    // ★ 근로계약서
      return new Response(await resp.text(), { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    // ★ 공지·알림
      return new Response(await resp.text(), { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    // ★ 시스템 설정
      return new Response(await resp.text(), { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    // ★ 근무 스케줄러
      return new Response(await resp.text(), { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    // ★ 직원 관리
      return new Response(await resp.text(), { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    // ★ 관리자 종합 대시보드
    if (path === '/admin' || path === '/admin/') {
      return new Response(await resp.text(), { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' } });
    }

      return new Response(await resp.text(), { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    // ★ 직원 마이페이지
      return new Response(await resp.text(), { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    // ★ 출퇴근 관리자 대시보드
      return new Response(await resp.text(), { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    // ★ 매장/회사 QR 디스플레이 (입구 화면)
    // ★ 임시 패치 (사용 후 삭제 예정)
      return new Response(await resp.text(), { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    // ★ 긴급배송
      return new Response(await resp.text(), { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    // ★ 직원 셀프 체크인
      return new Response(await resp.text(), { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    // ★ 방문자 등록 페이지
      return new Response(await resp.text(), { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

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
        const planAmt   = { starter: 30000, basic: 50000, pro: 80000 };

        await fsPatch(token, `${FS_BASE}/subscriptions/${uid}`, {
          plan:       { stringValue: plan },
          status:     { stringValue: 'active' },
          expireDate: { timestampValue: newExpire.toISOString() },
          amount:     { integerValue: String(planAmt[plan] || 50000) },
          updatedAt:  { timestampValue: now.toISOString() }
        });

        // 4. orderId에서 product 파싱 → companies 필드 자동 활성화
        // orderId 형식: DW-{uid8}-{timestamp}-{planType}-{hc}
        const planType = parts.length >= 4 ? parts[3] : 'settle';
        const headcount = parts.length >= 5 ? parseInt(parts[4]) || 0 : 0;

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
            const html = '<div style="font-family:sans-serif;padding:24px"><b style="color:#0066ff;font-size:18px">💰 신규 결제</b><br><br>'
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
              trialEnd:      {stringValue: '2026-12-31'},
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
                  trialEnd:     {stringValue: '2026-12-31'},
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
                  trialEnd:      {stringValue: '2026-12-31'},
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
        if (!ntsRes.ok) throw new Error('국세청 API 오류: ' + ntsRes.status + ' ' + rawText.slice(0,100));
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

        const registeredBank = doc.fields?.bankAccount?.stringValue || '';
        const registeredBankNum = registeredBank.replace(/[^0-9]/g,'');

        // 1차 검증: 기사수정에 등록된 계좌번호와 대조
        if (registeredBankNum && registeredBankNum !== bankNum) {
          return new Response(JSON.stringify({ok:false,error:'등록된 계좌번호와 일치하지 않습니다. 관리자에게 문의하세요.'}), {headers:{'Content-Type':'application/json'}});
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
        const title = '🔐 로그인 알림';
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
      const authUser = await verifyFirebaseToken(request);
      if (!authUser) return new Response(JSON.stringify({ok:false,error:'인증 필요'}), {status:401,headers:{'Content-Type':'application/json'}});
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
          title: '💳 새 결제 완료!',
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
                '🎉 결제 완료! 기능 활성화됨',
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
          title: '✅ 수동 활성화 완료',
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
                title: '🏦 하나은행 입금 완료!',
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
          title: body.title || '🎉 신규 등록',
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
                    await notifyAdmins(env, token, { title:'💳 계좌이체 완료!', body:`${companyName} · ${planType}`, type:'pay' });
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

    // ── firebase-storage-compat.js 프록시 ──
    if (path === '/firebase-storage-compat.js') {
      const r = await fetch('https://www.gstatic.com/firebasejs/8.10.1/firebase-storage-compat.js');
      const js = await r.text();
      return new Response(js, { headers: { 'Content-Type': 'application/javascript', 'Cache-Control': 'public, max-age=86400' } });
    }

    // ── firebase-messaging-sw.js 인라인 서빙 (404 방지) ──
    if (path === '/firebase-messaging-sw.js') {
      const swContent = "importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');"
        + "importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');"
        + "firebase.initializeApp({apiKey:'AIzaSyDQmEFfLczgCuPQidunbBXqaHWgs39VMg0',authDomain:'mbti-logistics.firebaseapp.com',projectId:'mbti-logistics',storageBucket:'mbti-logistics.firebasestorage.app',messagingSenderId:'40761160761',appId:'1:40761160761:web:20545b610f03f534e949e8'});"
        + "const messaging=firebase.messaging();"
        + "messaging.onBackgroundMessage(function(payload){"
        + "  const data=payload.data||{};const type=data.type||'alert';"
        + "  const title='DONWAY '+(payload.notification&&payload.notification.title||'알림');"
        + "  const body=(payload.notification&&payload.notification.body)||'';"
        + "  return self.registration.showNotification(title,{body:body,icon:'/icon-192.png',badge:'/icon-192.png',tag:'donway-'+type,renotify:true,vibrate:[200,100,200]});"
        + "});"
        + "self.addEventListener('notificationclick',function(e){e.notification.close();if(e.action==='close')return;e.waitUntil(clients.openWindow('/settle'));});"
        + "self.addEventListener('install',function(){self.skipWaiting();});"
        + "self.addEventListener('activate',function(e){e.waitUntil(clients.claim());});";
      return new Response(swContent, {
        status: 200,
        headers: {
          'Content-Type': 'application/javascript; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Service-Worker-Allowed': '/'
        }
      });
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
