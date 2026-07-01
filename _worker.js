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
  'Content-Security-Policy': "default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com https://apis.google.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://js.tosspayments.com https://cdn.iamport.kr https://static.cloudflareinsights.com https://t1.kakaocdn.net https://developers.kakao.com https://www.googletagmanager.com https://www.google-analytics.com; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https: blob:; connect-src 'self' https://donway.ai.kr https://app.donway.ai.kr https://*.firebaseio.com https://*.googleapis.com wss://*.firebaseio.com https://api.anthropic.com https://api.toss.im https://api.tosspayments.com https://www.gstatic.com https://api.ipify.org https://www.googletagmanager.com https://www.google-analytics.com https://region1.google-analytics.com; frame-ancestors 'none';",
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

  // KV 우선 서빙
  if (e && e.DONWAY_ASSETS) {
    const kvVal = await e.DONWAY_ASSETS.get(fileName, 'text');
    if (kvVal) {
      return new Response(kvVal, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Served-From': 'KV' } });



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
  try {
    // KV 우선 서빙
    const _e = env || _env_ref;
    if (_e && _e.DONWAY_ASSETS) {
      const kvVal = await _e.DONWAY_ASSETS.get(fileName, 'text');
      if (kvVal) return new Response(kvVal, { headers: { 'Content-Type': contentType+'; charset=utf-8', 'Cache-Control': 'no-store', 'X-Served-From': 'KV', ...SECURITY_HEADERS } });
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
export default {
  // scheduled: KV sync moved to main scheduled handler below
  async fetch(request, env) {
    _env_ref = env;
    const url      = new URL(request.url);
    const path     = url.pathname;
    const method   = request.method;
    const hostname = url.hostname;


    // ★ donway.ai.kr 라우팅 (명시적)
    if (hostname === 'donway.ai.kr' || hostname === 'www.donway.ai.kr') {
      // /join → settle.html 서빙 + register 탭 자동 활성화
      if (path === '/join') {
        try {
          const ghJoin = await fetch('https://app.donway.ai.kr/index.html?bust='+Date.now()+Math.random().toString(36).slice(2),{cf:{cacheEverything:false,cacheTtl:0,bypassCache:true},headers:{'Cache-Control':'no-cache,no-store'}});
          const html = await ghJoin.text();
          if (html) {
            const injectScript = '<scr'+'ipt>window.addEventListener("load",function(){setTimeout(function(){var btn=document.getElementById("tab-register");if(btn)btn.click();},800);});</scr'+'ipt>';
            const lastBody = html.lastIndexOf('</body>');
            const modified = lastBody !== -1 ? html.slice(0, lastBody) + injectScript + html.slice(lastBody) : html + injectScript;
            return new Response(modified, {headers:{'Content-Type':'text/html;charset=utf-8','Cache-Control':'no-store'}});
          }
          return await serveKVFile(env, 'settle.html', 'text/html');
        } catch(e) {
          console.warn('[/join] 오류:', e.message);
          return await serveKVFile(env, 'settle.html', 'text/html');
        }
      }
      if (path === '/' || path === '') {
    const ghRaw = await fetch('https://raw.githubusercontent.com/kimdh4790-cpu/mbti-logistics/main/donway_landing.html?t='+Date.now(), {cf:{cacheEverything:false}});
    const html = await ghRaw.text();
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
          const designerSel = designers.length ? `<div class="card"><label>👤 담당 디자이너</label><select id="r-designer"><option value="">-- 선택 (상관없음) --</option>${designers.map(d=>`<option value="${d}">${d}</option>`).join('')}</select></div>` : '';
          const menus = ['시그니처펌','복구매직','디자인컷','본드케어','발레아쥬','뿌리염색','볼륨매직','남성펌','두피케어','네일'];
          const html = `<!DOCTYPE html><html lang="ko"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${coName} 예약</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,sans-serif;background:#0f172a;color:#f1f5f9;min-height:100vh;padding:16px}.wrap{max-width:480px;margin:0 auto}.header{background:linear-gradient(135deg,#C2185B,#E91E63);border-radius:16px;padding:24px;text-align:center;margin-bottom:20px;color:#fff}.header h1{font-size:22px;font-weight:900;margin-bottom:4px}.header p{font-size:13px;opacity:.85}.card{background:#1e293b;border-radius:14px;padding:16px;margin-bottom:12px}label{font-size:12px;font-weight:700;display:block;margin-bottom:6px;color:#94a3b8}input,select{width:100%;padding:12px;background:#0f172a;border:1.5px solid #334155;border-radius:10px;color:#f1f5f9;font-size:14px;outline:none}input:focus,select:focus{border-color:#C2185B}.menus{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}.menu-btn{padding:7px 14px;border:1.5px solid #334155;border-radius:20px;background:#0f172a;color:#94a3b8;font-size:12px;cursor:pointer}.menu-btn.active{border-color:#C2185B;background:#C2185B22;color:#C2185B;font-weight:700}.btn-submit{width:100%;padding:16px;background:linear-gradient(135deg,#C2185B,#E91E63);color:#fff;border:none;border-radius:12px;font-size:16px;font-weight:800;cursor:pointer;margin-top:8px}.btn-submit:disabled{opacity:.5}.success{text-align:center;padding:40px 20px;display:none}.success .icon{font-size:64px;margin-bottom:16px}.success h2{font-size:22px;font-weight:900;color:#C2185B;margin-bottom:8px}.success p{font-size:14px;color:#94a3b8;line-height:1.6}</style></head><body>
<div class="wrap">
  <div class="header"><div style="font-size:32px;margin-bottom:8px">💄</div><h1>${coName}</h1><p>온라인 예약</p></div>
  <div id="form-wrap">
    <div class="card"><label>📅 날짜</label><input type="date" id="r-date" min="${todayStr}"></div>
    <div class="card"><label>⏰ 시간</label><select id="r-time">${timeOpts}</select></div>
    ${designerSel}
    <div class="card"><label>💆 시술 메뉴</label><div class="menus">${menus.map(m=>`<button class="menu-btn" onclick="selectMenu(this,'${m}')">${m}</button>`).join('')}</div><input type="text" id="r-menu" placeholder="직접 입력 또는 위에서 선택"></div>
    <div class="card"><label>👤 고객명 *</label><input type="text" id="r-name" placeholder="이름을 입력하세요"></div>
    <div class="card"><label>📞 연락처 *</label><input type="tel" id="r-phone" placeholder="010-0000-0000"></div>
    <div class="card"><label>📝 메모 (선택)</label><input type="text" id="r-memo" placeholder="요청사항 등"></div>
    <button class="btn-submit" id="r-submit" onclick="submitReserve()">예약 신청</button>
  </div>
  <div class="success" id="success-wrap"><div class="icon">🎉</div><h2>예약 완료!</h2><p id="success-msg"></p><p style="margin-top:12px;font-size:12px;color:#64748b">예약 확인은 업체로 문의해주세요</p>
<button onclick="addToHome()" style="margin-top:16px;width:100%;padding:14px;background:#1e293b;border:1.5px solid #C2185B;border-radius:12px;color:#C2185B;font-size:14px;font-weight:700;cursor:pointer">📱 홈 화면에 추가하기</button>
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
          if (camp) dFilters.push({fieldFilter:{field:{fieldPath:'camp'},op:'EQUAL',value:{stringValue:camp}}});
          const dBody = JSON.stringify({structuredQuery:{from:[{collectionId:'drivers'}],where:{compositeFilter:{op:'AND',filters:dFilters}},orderBy:[{field:{fieldPath:'name'},direction:'ASCENDING'}],limit:200}});
          const dRes = await fetch(dUrl,{method:'POST',headers:{'Authorization':'Bearer '+fsToken,'Content-Type':'application/json'},body:dBody});
          const dData = await dRes.json();
          const drivers = (dData||[]).filter(r=>r.document).map(r=>{
            const f = r.document.fields||{};
            return {id:r.document.name.split('/').pop(), name:f.name?.stringValue||'', camp:f.camp?.stringValue||'', userId:f.userId?.stringValue||''};
          });

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
              const swapUrl = docId ? '/swap?id='+docId+'&from='+encodeURIComponent(drv.name)+'&date='+weekDays[i] : '';
              cells += `<td style="padding:8px 4px;text-align:center;border:1px solid #e2e8f0">
                <div style="background:${bg};color:${color};border-radius:6px;padding:4px 6px;font-size:12px;font-weight:700;margin-bottom:4px">${label}</div>
                ${!isOff && swapUrl ? `<a href="${swapUrl}" style="font-size:10px;color:#3b82f6;text-decoration:none">🔄 교체</a>` : ''}
              </td>`;
            }
            rows += `<tr><td style="padding:8px;font-size:13px;font-weight:700;border:1px solid #e2e8f0;white-space:nowrap">${drv.name}<br><span style="font-size:10px;color:#94a3b8">${drv.camp||''}</span></td>${cells}</tr>`;
          });

          const html = `<!DOCTYPE html><html lang="ko"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${coName} 근무표</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,sans-serif;background:#f8fafc;color:#1e293b;padding:12px}.header{background:linear-gradient(135deg,#1e40af,#3b82f6);border-radius:14px;padding:16px;text-align:center;margin-bottom:16px;color:#fff}.header h1{font-size:18px;font-weight:900}.header p{font-size:12px;opacity:.85;margin-top:4px}.nav{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}.nav a{background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:8px 16px;font-size:13px;font-weight:700;color:#1e40af;text-decoration:none}.nav span{font-size:13px;font-weight:700;color:#374151}.wrap{overflow-x:auto}.tbl{width:100%;border-collapse:collapse;min-width:600px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)}.tbl th{padding:10px 6px;background:#1e40af;color:#fff;font-size:12px;text-align:center}.tbl td{vertical-align:middle}</style>
</head><body>
<div class="header"><h1>📋 ${coName}</h1><p>${camp||'전체'} 캠프 근무표</p></div>
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
            const patchUrl = 'https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents/roster_week/'+docId+'?updateMask.fieldPaths=swapWith&updateMask.fieldPaths=swapStatus&updateMask.fieldPaths=swapAt';
            const patchBody = JSON.stringify({fields:{swapWith:{stringValue:body.name||''},swapStatus:{stringValue:'accepted'},swapAt:{stringValue:new Date().toISOString()}}});
            const pRes = await fetch(patchUrl,{method:'PATCH',headers:{'Authorization':'Bearer '+fsToken,'Content-Type':'application/json'},body:patchBody});
            if (!pRes.ok) throw new Error('저장 실패');
            return new Response(JSON.stringify({ok:true}),{headers:{'Content-Type':'application/json'}});
          } catch(e) {
            return new Response(JSON.stringify({ok:false,error:e.message}),{status:500,headers:{'Content-Type':'application/json'}});
          }
        }

        const html = `<!DOCTYPE html><html lang="ko"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>근무 교체 요청</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,sans-serif;background:#0f172a;color:#f1f5f9;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:16px}.card{background:#1e293b;border-radius:16px;padding:24px;max-width:400px;width:100%;text-align:center}.icon{font-size:48px;margin-bottom:16px}.title{font-size:18px;font-weight:900;margin-bottom:8px}.desc{font-size:13px;color:#94a3b8;margin-bottom:24px;line-height:1.6}input{width:100%;padding:12px;background:#0f172a;border:1.5px solid #334155;border-radius:10px;color:#f1f5f9;font-size:14px;outline:none;margin-bottom:12px}input:focus{border-color:#3b82f6}.btn{width:100%;padding:14px;background:linear-gradient(135deg,#1e40af,#3b82f6);color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:800;cursor:pointer}.success{display:none;padding:20px}.success .icon{font-size:64px}</style>
</head><body>
<div class="card">
  <div id="form-wrap">
    <div class="icon">🔄</div>
    <div class="title">근무 교체 요청</div>
    <div class="desc">${fromName}님의 ${date} 근무를<br>교체하려고 합니다.<br><br>교체 수락하시면 이름을 입력해주세요.</div>
    <input type="text" id="swap-name" placeholder="내 이름 입력">
    <button class="btn" onclick="acceptSwap()">✅ 교체 수락</button>
  </div>
  <div class="success" id="success-wrap">
    <div class="icon">🎉</div>
    <div class="title">교체 완료!</div>
    <div class="desc" id="success-msg"></div>
  </div>
</div>
<script>
async function acceptSwap(){
  var name=document.getElementById('swap-name').value.trim();
  if(!name){alert('이름을 입력해주세요');return;}
  try{
    var res=await fetch('/swap?id=${docId}',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name})});
    var data=await res.json();
    if(data.ok){
      document.getElementById('form-wrap').style.display='none';
      var sw=document.getElementById('success-wrap');sw.style.display='block';
      document.getElementById('success-msg').textContent='${date} 근무가 '+name+'님으로 교체됐습니다.';
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
              <div class="sec-title">📅 일일 상세 내역 (날짜별 배송/반품/프레시백)</div>
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
              <div class="sec-title" style="font-size:12px;font-weight:800;color:#166534;margin-bottom:8px">🔄 아이디 지원 내역</div>
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
              <button onclick="var el=document.getElementById('tax-detail');el.style.display=el.style.display==='none'?'block':'none';this.textContent=el.style.display==='none'?'🧾 세금계산서 보기 ▼':'🧾 세금계산서 닫기 ▲'"
                style="width:100%;padding:12px;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;margin-bottom:10px">
                🧾 세금계산서 보기 ▼
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
            .sec{padding:12px 14px}
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
              <div class="net-row"><span style="font-weight:700;font-size:13px">✅ 실지급액</span><span style="font-size:22px;font-weight:900;color:#185FA5">₩${net.toLocaleString()}</span></div>
              <div class="ft">${coName} · ${contactPhone} · 사업자번호 ${bizNum}<br>DONWAY 자동 발행 · 고유 링크로 보호됩니다</div>
              <!-- 계좌 등록 폼 -->
              <div id="bank-section" style="margin:14px;border:1.5px solid #e2e8f0;border-radius:12px;overflow:hidden">
                <div style="background:#f8fafc;padding:12px 14px;border-bottom:1px solid #e2e8f0">
                  <div style="font-size:12px;font-weight:800;color:#1e3a8a">🏦 계좌 정보 등록</div>
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
                  <button onclick="submitBank()" style="padding:12px;background:linear-gradient(135deg,#1e3a8a,#3b82f6);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer">✅ 계좌 등록</button>
                  <div id="bank-msg" style="font-size:11px;text-align:center;color:#64748b"></div>
                </div>
                <div id="bank-done" style="display:none;padding:14px;text-align:center">
                  <div style="font-size:24px;margin-bottom:6px">✅</div>
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
          return new Response('<!DOCTYPE html><html><body style="background:#0f1623;color:#f0f4ff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;text-align:center"><div><div style="font-size:40px;margin-bottom:16px">⚠️</div><div>명세서를 찾을 수 없거나 만료되었습니다.</div><div style="font-size:11px;color:#94a3b8;margin-top:12px">' + e2.message + '</div></div></body></html>', { status:404, headers:{'Content-Type':'text/html;charset=utf-8'} });
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
        const kvHtml = env.DONWAY_ASSETS ? await env.DONWAY_ASSETS.get('settle.html','text') : null;
        const html = kvHtml || await fetch('https://raw.githubusercontent.com/kimdh4790-cpu/mbti-logistics/main/settle.html?bust='+Date.now(),{cf:{cacheEverything:false,cacheTtl:0,bypassCache:true},headers:{'Cache-Control':'no-cache,no-store'}}).then(r=>r.text());
        if (html) {
          const akKey = (env.ANTHROPIC_API_KEY||env.CLAUDE_API_KEY||'').trim().replace(/[\r\n\s]+/g,'');
          const slugScript = '<script>window.__AK='+JSON.stringify(akKey)+';window._COMPANY_SLUG='+JSON.stringify(slug)+';window._SLUG_MODE=true;</script>';
          const modified = html.replace(
            '</head>',
            '<link rel="manifest" href="/c/'+slug+'/manifest.json"><meta name="apple-mobile-web-app-title" content="'+compName+'"><link rel="apple-touch-icon" href="/c/'+slug+'/icon.svg">\n'+slugScript+'\n</head>'
          );
          return new Response(modified, { headers: { 'Content-Type':'text/html;charset=utf-8', 'Cache-Control':'no-store' } });
        }
      }
    }
      if (path === '/register' || path === '/register.html') return serveKVFile(env, 'register.html', 'text/html');
      if (path === '/admin' || path === '/admin.html') return serveKVFile(env, 'admin.html', 'text/html');
      if (path === '/admin-sub' || path === '/admin_sub.html') return serveKVFile(env, 'admin_sub.html', 'text/html');
      // ★ /{slug} 직접 접속 처리 (donway.ai.kr/kimdh47900 등)
      if (!path.startsWith('/api/') && method === 'GET') {
        const slugDirect = path.match(/^\/([a-zA-Z0-9\u0041-\uD7A3\-_]{1,30})\/?$/);
        const knownDirect = new Set(['/join','/settle','/register','/admin','/admin-sub','/stmt','/c','/manifest.json','/sw.js','/firebase-messaging-sw.js','/robots.txt','/sitemap.xml','/favicon.ico']);
        if (slugDirect && !knownDirect.has(slugDirect[0].replace(/\/$/,''))) {
          const slug2 = slugDirect[1];
          try {
            const kvHtml2 = env.DONWAY_ASSETS ? await env.DONWAY_ASSETS.get('settle.html','text') : null;
            const html2 = kvHtml2 || await fetch('https://raw.githubusercontent.com/kimdh4790-cpu/mbti-logistics/main/settle.html?bust='+Date.now(),{cf:{cacheEverything:false,cacheTtl:0,bypassCache:true},headers:{'Cache-Control':'no-cache,no-store'}}).then(r=>r.text());
            if (html2) {
              const akKey2 = (env.ANTHROPIC_API_KEY||env.CLAUDE_API_KEY||'').trim().replace(/[\r\n\s]+/g,'');
              const slugScript2 = '<script>window.__AK='+JSON.stringify(akKey2)+';window._COMPANY_SLUG='+JSON.stringify(slug2)+';window._SLUG_MODE=true;</script>';
              const modified2 = html2.replace('</head>', slugScript2+'\n</head>');
              return new Response(modified2, { headers: { 'Content-Type':'text/html;charset=utf-8', 'Cache-Control':'no-store' } });
            }
          } catch(e) {}
        }
      }
    }

    // ★ filo.ai.kr 라우팅
    if (hostname === 'filo.ai.kr' || hostname === 'www.filo.ai.kr') {
      const e = env || _env_ref;
      if (path === '/' || path === '') {
    return serveKVFile(env, 'filo_landing.html', 'text/html');
      }
      if (path === '/inventory' || path === '/inventory.html') return serveKVFile(env, 'inventory.html', 'text/html');
      if (path === '/qr' || path === '/qrpos' || path === '/qrpos.html') return serveKVFile(env, 'qrpos.html', 'text/html');
      if (path === '/kiosk' || path === '/kiosk.html') return serveKVFile(env, 'kiosk.html', 'text/html');
      if (path === '/universal' || path === '/universal.html') return serveKVFile(env, 'universal_settle.html', 'text/html');
      if (path === '/register' || path === '/register.html') return serveKVFile(env, 'register.html', 'text/html');
      if (path === '/app' || path === '/app.html') return serveKVFile(env, 'filo.html', 'text/html');
  if (path === '/filo-manifest.json' || path === '/mbtico-manifest.json') return serveKVFile(env, 'filo-manifest.json', 'application/manifest+json');
      if (path === '/admin_sub' || path === '/admin_sub.html') return serveKVFile(env, 'admin_sub.html', 'text/html');
    }

    // ★ mbtico.kr → 엠비티아이 배송앱
    if (hostname === 'mbtico.kr' || hostname === 'www.mbtico.kr') {
      if (path === '/settle' || path === '/settle.html') return Response.redirect('https://donway.ai.kr/settle', 302);
      if (path === '/' || path === '') return serveKVFile(env, 'mbti_landing.html', 'text/html');
      if (path === '/app') return serveKVFile(env, '엠비티아이_물류관리_v9.html', 'text/html');
      if (path === '/hub') return serveKVFile(env, 'mbtico_hub.html', 'text/html');
      if (path === '/label' || path === '/label.html') return serveKVFile(env, 'label.html', 'text/html');
      // /delivery → /drivers 리다이렉트 (drivers.html로 통합)
      if (path === '/delivery' || path === '/delivery.html') {
        var did = new URL(request.url).searchParams.get('did') || '';
        return Response.redirect('https://mbtico.kr/drivers' + (did ? '?did=' + did : ''), 302);
      }
      if (path === '/emergency' || path === '/emergency.html') return serveKVFile(env, 'emergency.html', 'text/html');
      if (path === '/checkin' || path === '/checkin.html') return serveKVFile(env, 'checkin.html', 'text/html');
      if (path === '/v9') return serveKVFile(env, 'index.html', 'text/html');
      if (path === '/admin' || path === '/admin.html') return serveKVFile(env, 'admin.html', 'text/html');
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
      if (path === '/' || path === '') {
    return serveKVFile(env, 'filo_landing.html', 'text/html');
      }
      if (path === '/inventory' || path === '/inventory.html') return serveKVFile(env, 'inventory.html', 'text/html');
      if (path === '/qr' || path === '/qrpos' || path === '/qrpos.html') return serveKVFile(env, 'qrpos.html', 'text/html');
      if (path === '/kiosk' || path === '/kiosk.html') return serveKVFile(env, 'kiosk.html', 'text/html');
      if (path === '/register' || path === '/register.html') return serveKVFile(env, 'register.html', 'text/html');
    }
    // ── donway_og.jpg / OG 이미지 직접 서빙 (Base64 내장) ──
    if (path === '/donway_og.jpg' || path === '/og_banner.jpg' || path === '/donway_og.png') {
      const OG_B64 = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAQDAwMDAgQDAwMEBAQFBgoGBgUFBgwICQcKDgwPDg4MDQ0PERYTDxAVEQ0NExoTFRcYGRkZDxIbHRsYHRYYGRj/2wBDAQQEBAYFBgsGBgsYEA0QGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBj/wAARCAJ2BLADASIAAhEBAxEB/8QAHQAAAgEFAQEAAAAAAAAAAAAAAAUBAgMEBgcICf/EAGkQAAECBAMDBQcMDQgGBgoBBQECAwAEBREGEiEHMUETUWFxsRQVIjKBkZIIFiM0NUJScnOhwdEkJTM2RFNUVWJjgpPhFyZDRXSDlNJXZJWWovA3R4Sys9MJGCdGZYWGo8LxVnUoZnak/8QAHAEAAwEBAQEBAQAAAAAAAAAAAQIDAAQFBgcI/8QAPBEAAgECBAQEBAUDAwQDAQEAAAECAxEEEiExEzJBUQUiUmEUcZGhBhVCgdEjM0NTsfAkYsHhBxY08XL/2gAMAwEAAhEDEQA/APDcEEEegeWSDE68YgRMMwMIdy/3jzPy4+iEkO5U/wAyZsH8cPojR3I1dl80I+mJBJggHRAWxckbomItEwRWEOqELydRHOwe2EsO6D7VqA/1cw0dydblEnARI3xEA3wpQqgggjChDfDXu8j4quwwohthw2xA3zWV2GGjuTq8jFr/ALZcH6Z7TFuLj/tp3457TFuA9x1sHGJ99EQQAlwbozqR7uynygjABsIzaSft3K2/GDth1uSqcrCsC1emvlD2xhcTGdWfd+a+UPbGDxMZ7hhyomJF+eI3xIOkZBZVeLkv7dZ+MO2LUXGPbbR/SHbB7CvYY4j++N/ydghXw0MNMRi2IXuodkKxBYtPkQa80TYcw80HGDjAHJAGXcIqR440ijW/RFafGEYVjjEJIqDViRdlO4wqDrotZ1Y6iYaYi9vs/IphPBe7J0uRF4TMwN0w6OpZ+uKxOzY3TTvpmMaJ0gD2RlCoz43Tb4/bMViqVG1u7Zj0zGIIAYKbFyrsbDVahNtSkgtqYcSpbF1EK8Y33wtFYqX5W754yKzrIU35D6YUjdDSk7kaUI5djPFaqgPtxz/nyRUK7VB+Fq8w+qF0EDMynDg+gy7/ANU/KT5h9UVJxDVAbF+/7I+qFfkgEbM+4ro0/SbNM1adboMpNJWOUczBRsIwPXFU7/dEn9kRM596kh8ZXbCnjDSkyVOhCz06sbjEdS4qbPWgQDEc/wAQyf2BCiCApsd0KfpHHrinfgMH9gQHEM3axZY9AQnG+JJ0gqb7i8Cn6TZzVXRhwThZZK+Wy2KBa1oX+uB4b5SW9CBX3nf3/wBEJ4MpMSnQhrp1HHf938ilfQg7/K4yEqf2YTwQMzKcGHYcivI40yVP7MSa60R7lyp8kJYBvjZmHgx7G1S9SbXh+af7gYAQtILYvZV4XitMZbd6ZWCUH80Z4/rEwnhnJ6E6dKN5fMc9+pX80S3nMHfmSO+ksHymE0FoGZjulEc99pH80M+kYO+tP40hr0zCaCNmYODE2mQnZR2RnVNSCGkoQFKSFE5xC4VOm5TekI9MxNHP2qqXyQhNzwXJiQpRzS/Yc98aT+aU+mYO+VI40lPpmE0ELdleHEcd8aNf3IHkWYnu+jbhSR6ZhN5IIZSNwo+5tNKmqe489yEiGyGlFXhHUc0YBqFEzG9JN/jmKcP+2Jj5BcKFeMdIzloRjSWZjgz9DtpST6ZiBP0TjST+8MJ/JBpzRlIrwo+/1HAnqJ+alemYO7qH+aj6ZhP5II2Y3CXd/U2ekTNLeqaUS0gWVlJsoqvwjDcnaKlxQNLJN7ePFnDvu42LcFdkLntZhZt74xnLRE1RWd6v6jbu6iW9yyf24ju+ifmk+mYTX6BB5IGYpwV7/Ucd8KKP6o/4zEio0e1hSR5VmE0EbMbhR9zYqfPUxyosoZp3JuFYAVnJsb74idnaa1UHUO0wOLCzdWci8LKPpXJU/rB2xTVb9+Zj5QxnLQnw48TfoZxqVH40lJ/bMHfKkfmdv0zCWCBmZThRHIqVJt7jt+mYjvjS/wA0N+kYTwRszNwY+/1HTVTp6n0pTSmwSQB4RjLrFQlJeqrbdp7byhbw1E3Oka9LA91tfHHbDDEQ+3zvUn/uiCpOzJulHOi533kuFIY85g78yo8WkS/nMJxuggZmU4URx36l+FJlvngNcb4UuVHkMJ4DGuw8KPYcd/U39zJP0Yz6rVO5jL2lJdedlKvCTe3RGsDfDavj2SU/s6eyDmdhHSjmWgeuBQ3SEp6EHrhd4ScoP7uEwEFjAzMfgQ7Dg4ifB0lZb0IPXHNfiJf93CfriI15G4FPsOPXHOZtG2B/dwxnKvNMUaSfQlvO6FFV0jnjVxDmpfe/TR+irtgqcicqFNNWRT65KjfRTY/YEQcSVP4bfoiFEB3QMzLcCn6RqcR1Mn7uPREQcRVXhMf8I+qFMEByZlRp+kZmv1Q75o+YfVDM1Oc9avdfLnleWy5uNrdUayd0Oib4KB/1j6DBUmJUpQ00MY1yp/ljl/8Anoig1mpk6zjvnjBiDeEzMtw4djN771E75x70og1Sok6zsx6Z+uMLjFV4F2HJFdDJNQnydZx/0z9cM6XMzDlMqKlvuqKWhYlR5+uEcOKV7kVP5IdsGD1EqpZRUZuaKjeZeI+OYoL7x/pV+kYtnfBwMAsSVKX4yiesmKLX39kVRF4w1yLDmEOsLgd+Faf0S+yEsOsMe66j+qX2QY8yErcjE6/uqusxSN0Svx1dcRAHQRB367oLxB3xjBGZSvdmW3/dU9sYcZlK925X5UdsZbmnysrrpviCa+UMLje++GFaN69NfKGF53wHuzQ5EFzBBBAGIJgHjRESBrAY47xGfBp45pZMI+EPMSfdJO35MmEfCNLclR5EEQd0TEGAVRGsHCCCAxkO39MBM9Mwewwkh3Mj+Ysv0vnsMJIeW5Gjs/mwsIIIIUuHCKYqgjCsdYe0bqF/ycwiPjQ9oHtepE8Jc9sIrHNGeyFhzSCIvaJtEa8IUoEEEEYxIiYgcImGMwh1KfeXOj9ak9kJYdSQvg6oD9NBgrcjVWi+aEvCAQQawq2LE3gvABBaCKTDmhX5OdF98uYTQ5oJuZwc8uqGjuJVXkYm4wQHfBCjkiJiBviYwGENcO/fA0OcHsMKoa4d++FgdfYYaO5OpyMXzHtt7457YtRdmdJx3457YtQr3GWwQDfBBGCVRmUsnvzLfKp7Ywxu3RmUwfbiWP61PbDrcnPlZcrXu/NfKGMDcTGfWhauzJv7+MDfGe5ocqJiRvimx4RVew6YyGZMXGPbTXxh2xaBi6z7Zb+MO2CK1oMsSa4gd6k9kKgbQ0xH7vudSeyFUF7k6XIiqCIvEwCgRUDqIpiU74wrQ5xD7bYP6hMJ4cYg9sS3TLp7ITw0txKfKEEEEKO0VAwRFomB1AN6v7n00/qfphSIbVf3Mpp/VfTCgGHluSpcpUd8EHCCAigQQQRrmHE396dPP6SoUjdDWb+9GQ+OqFI8WDIlT2fzJggggIcIIIBBuYcWvg4/2j6IT8YcDXB6vl4Tw8uhKn1+YQQQQBwggggNBuO5Uj1oTo/TTCaHEpf1pT3x0wn8sF9CdPeXzCCCIvGKMmCDjBGNYcUf3MqXyUKOBhvRrGm1IfqoT8DGexGnzy/YIIIIxUIIIIxhxQPbUwP1C4UK8Yw2w/7cfH6hcKVeMYPQnHmZEEEEAoEEEEYw2w8bV1rqPZC137uv4xhjh73da6ldhha97YX8YxnshFzsoggggXHCCCCCzGdSPdmW+UHbFNW92Zj5QxNJP24ltP6QdsRVfdiY+OYz5SVv6n7GHBBBClQgg4QQbGLst7ba+OO2M/EJ+37vUn/uiMCX9ttfGEZ+Ifd53qT2CCtib50K4IIDujFbBBEE24QXjBAHwocV/wC6Sv8AZ0wmG8Q4r/3WU/s6eyD0Jy5kJ4IgmIvCooSd0RreCCCGxI3w4qelApo/RV2wmB1hxVD9oqaP0VdsBPcnLmQniCYmKeMAqGnPBBBAbMEOSR6yR/aPoMJvJDlabYISf9Y+gwYsSfQTE2JiLwGIhSlgO+JBtEQRgk3hxSjakVM/qx2wmhxTPcOpn9BPbGjuTq8olO+AboOJgO6AiwRFoLwXgmIhzhn3VV8kvshNDrDQ+2q/kV9kZbqwlXkYmV90V1xESrxj1xSSYFyi2I4wEkxBgvGuENRvjNpPu3K/KCMG8Z1J925UfrBBuLPlYVk3r018oYwTvjOrHu5NfKGME74Et2GHKgiDExSd8AawDdEjxoiJHjCB1CO8SfdpQc0unshIdwh1iU/ZUqP9WT2Qk4Rpbk6S8iCIuICYi8AsgMEHkggXCh5NfeNK/LqhHDub0wPJ/LKhJDyJUNn82EEEEKWCCIBvATaMCw7oJtI1Qn8nI+eEZ8Yw7oYvSqqf1H0wkPjGM9kThzSA7opEVRGogWKjQ4dqoHtbzKH1xQaDVR+CKPVb64w+6pobn3B+0YqTUJ4bpp4ftGG0J/1PYyFUWpp/A3PNeKDTJ9PjSjw/ZikVSojdOvjqWYuJrNTSNJx0/tQNDf1PYsmSmwdZd30T9UNpJp4YWn0FtQVmSQCN+sYgr9WAt3Wo9YB+iGslV552gzky46FONlOUlI5+aGilclV4mXY1vkneLavNEZFDgfNDYYlqVzcteVsQeuWePjNsK62xCpIrmqdhRYjj80GvXDj1xPnRcnKK/u4DXUHx6bKH9i0GyBmn6RPDnD5HLTQuNWFRHfmUPj0iVt0D+EMaROScy8+Gqe2yUtKUrKfGHNDRWu5KtOWR+U1c7+mCxhyajR+NIT5FmJ7uoahrTFDqX/GA0u46qP0ibzxMNxN0I75B4dS/4xBdw+o6sTKf2o1vc3EfYUw0w+f5xMeXsir+bxB9tJ8sZdKTSU1Voybsxyt9AoCx0gxWolSp5HoxJNe3XvlD2mLMO5hihGac5SdfSoqNwEXF7mKBKUAj3SdHW3AymjVVlo/oJ4jWHXcFDO6rEdaIg02knxaygdaDGyMbix9/oKU7ozKbpV5b5RPbGX3qkCPBrDB6wRF6Upku3PsrRVJdZSsGwvc6wyi7iTqxaZh1z3dmPjfRC8RsVTpaJmqPPGflmypV8i1WIjE7xKPiz8n6cFxdzRqxUVdimDjDbvBMcJuUP94In1vTh3PS5/bgZWHjQ7iiLzPthr4w7YY+t6f4Fk/txLdAqKHkqKEEAg6KBjNPQzqRtuU4i931/FT2QrjYaxSp2bqqnmGc6SlIuCOaMA0Gp29rK8hEF7iU5xyrUW7onWM/vJUxuk1ecRHeep7u43IFmPnj3MKJTvjK701Mb5J30YBTZ9PjSro/ZMGzA5x7mdiH7tK/2dMJxuh9W5WYeVLFtpxdmEg2STYwo7hnAdZZ30TBluJSnHLuWYi3li8ZWZG9h30TFPc7/FpY/ZMLqUzIoBNokGJ5Fy3iK80AQoHVB80azBdDerm9LpvyR7YT7oc1ZKu9dN8E/cjw6YT5egwZbkqLWUATaJERaJAMLcoTBE2MFoxhtNfelI/KKhON0N5ofzSkrH+kVCmxtDy3JU9n8wuYquIp1iRv3Qo9iYBvgg4wTDdP3oL+XhTwhsk/zPX8vCjXWHl0JU+vzCCJ0g0gXKWIiRBp0wdUZmHMn96c/wDGTCbWHEoT61J/T36YUaQZdCdPdkXMTaDSI88BFSYIgWvxidOmCYb0a3e+pD9VCngYbUc2kKlp/RQo4QWtCMOeX7BBBp0wadMArYIINOmCAYb4f9vPfILhSrxjDbD/ALee+QXClXjmGexNc7IggggDhBBBAYbDTD3u611Hshe97YX8Ywww/wC7zXUeyFzx+yF/GMG2hNc7KIIIIFh7BBBALX1jM1jNpXuzLfKJ7REVX3ZmB+sMTSrd+pb5Qdoimq+7Mx8oYPQT/J+xiQQaQQpSwQQQcYJrF2X9ttfGEZ+Ifd96/wCj2QvY9st3+GIz8Qkd/wB7qHZBWxNrzoVkxF4NINOmBcqEEHniON4N0YkbxDevG7sp/Z0woGquMN6+PZZSw/B0xlqJLmQmO+CDWCAihF+iJgtE2jXMQPGhvVD9paaP0FQosYb1QHvHTfiK7RGXcSXMhOdIiJsYix5jC3KXCCDyQEHmgGIBN+MOnPvIR8v9BhLZXNDlYV6ykJtry9/mgpiT6CY74iKsqvgmDIr4JgJFLopiNw1i5kV8E+aKC24TohXmjamuguIb033BqR/RT2wp5F0p+5rPTaHFNadFDqKShYJSLAjpgxTEqtWEZOsReL4k5snSVdPUkxV3vnzulHvQMLZlXJdzGgjK721D8je9AxX3qqR/AXvQMGzBnj3MLjDrDV++jnyK+yMMUmpE3Ek75oaUGQnZaoLW9LqbBaUkE23kQYp3EqzjkepryrZzbnikmGPeSqqJIlFfN9cAoNVP4KoeUfXC2ZRVI9xZznhEQ29b1V/J/wDiH1xPrcqfFlPpCNlYeJHuKIzqPrXJX5QRkHDtRG9KAPjxk06jTcvVGH1qbASq+ihfzRkncWVSOV6i2r61ya+UV2xhHfGwT9GfmKk+8mYl0hSybKWAYxxQHeM9JjrcguLuzQqxyrUTE6xEOe8OutTkx+2IO8TQ31WU9KFcWNxYdxNEjxhDjvLKgeFV5X54p71SIN++7JPNlMFRdzcWJXiQgzktbhLI7ISxs9YlJB6cbMzPpYKWkpAyk3Ft8LhI0Ub6uT/dxpRdxaVRZEKOsxEOe46APGqbh6m4O58PDfPTB6kQMo/FXZiaDnhzyWHPymaP7IiCnDoBsqbJ8kLlCqvsyudP8yJH5VUJI2mZNLTh2VzoeVL5zkFxe/G8LBMUFP4C+etcPJE6M9Hp1YpgMOO7KGndTHD1riO+NHHi0cHpLkC3uV4j9InHQYOuHBqtMHi0ZnyqvEd+JIDwaPL+X/8AUa3ubPL0ldF0o1UtxZA+eEliVaRtVPqTbtLnnkSLDQaSLpSNFb98LfXAoC6KfJJ/u4zWi1EpylmloJ8qjwg5Nzgk+aHHrkmfey0qnqbiDiWe4IYHU3C2iVzVPSJoIIIw4QQQcYUxNodU7XDNRF/g9sJoc0z73qmP0U9sPFK5OtyiXiYBuiSPCghCrCJFhEQQbCk8d0OMO+3XxzsL7IUcIb4c90XfkV9kNHcnV5GKFDUwDdEq8aIjMdbBBpBBAMTpDKgW9cEt8b64WQyoXu/LH9P64KFm/KzHnbd8H9PfntMWLiL897pP/KGMeNYEdkGkEEEayDcLnnjKp5vVZfU/dE9sYsZNP91Jf5RPbBSVwSflZmV3SuzHxvoELc199/JDKvW7/THWOwQsG+C9xIcqJ15zEjrPngiOnSAMVZ1A6KVFxhxfdCPCV4w4xZuYuN/d2/jDtg32BJJoa19x1utrCVqT4CffHmhcJuYG6YdH7ZjOxFfv6q/wE9kKteEM9xKaTimZQnp0aCadA+OfrioVGeA9uPemYxBuiYGocsexl986gD7ce9KKhVahmH2W554wokeMIN2DJHsbFV6hNyxluReUnMylRtxMLhXKkB7ZX831RkV7Qyf9nTCbfugyepOnCOXYaCv1MfhKrdQ+qJGIKnxmL/sj6oVwQLj8OPYajENS4uJPWkRV64KhxU35UCFHGK+G+NmA6cexss9WJlimyTiA2S4glV0X4wv9cE3xalz1tiJql+81Ov8Aiz2woueENKTuRpUo22G4xDNDQy0setsQHEDxFjJyh/u4U36YBoYGZlOFDsNxXVcafKehE9/EnfTpX0YUQdMDMxeFDsbM9UkJoEvMGRl1Ba1ANkaCME1pki5pUtfyxTM6YSk/lFQrENKbJ06cWn82Ne/Esd9JlvnioVaRJ8KkS/nMKNeeCBmZThRG/fWnbu9LPnIiRVKdxpDXpGE5Ou6JvGzM3CRswnJI4fU73CkNB0AtgnU23wvFQpVtaUPTgT96Dvy47IUHfBlLYlTprX5jfu+k/mn/AI4nu6j/AJqPpwoB0iY2dj8JDYztGv7lq9ODuujfm1fkchTBGzmVJdzZpd+nGhzTiJNaWQRnRn1PNY8IwO66Hb3Pd9OCT+9We+OmFHGGb2Jwppt6jfuqh/kD37yI7pof5A96cKYIGYbgruxv3TQj+Av+nB3RQfyOYH7cKIIKZuEu7+ptNNcpa5ScMvLupSG/ZApW8dEL+XoGX2rM+lBRCBIVH5GE53Rm9CdOms0tew15egfksx6UHL0H8mmfOIUweeMV4S7sbh6g/k0z5xEh2gEfcJkeUQn8sG7jGuDhruzaaSulKmHBLNvBXJqzZjwtGCp2gZjduaPURFOHjeedHEsqHZCdXjHrjX0Jxp+d6jnlMP3+5zXnEHKUD8XNecQmuIDYxrlOH7jnlKB+LmvOIM+H/wAXNecQl3bjASY1w8L3NnpS6QqpoTKNvh3WxXa26MV12gB1WZmZvfgRGNh+/f1rqPZC94/ZDnxjBvoTVLzvUa8rQL/cZrziAu0C2rM15xCYb4kmBcfh+435XD1vuE154kPYe/ETXnhNeCM2bhruzYJF2imosiXZmA5nGUqIte8RPPUZNReD7EwXAs5sp0JhZSvdiW+UT2iCq+7Mz8oYObQThLibvYzOXoH5LMn9qDuigcZSY9KE8EC5ThLuxuZigcJOY9KDuig/kUx6cKII1zcFd39R03MUMuoCJJ8Kvp4cZNWfpaKqtM1KOuOaXUlduEIJc/ZTfxh2xn4h93XOpPYIKloT4SzrVlfdVDH9XPfvIO66H+bXfK5Cm4ik74FyvCXdjjuyh8KY5+8iO7KJ+a16frIUg2iIzkw8Jd2OEz1FCge9Z9OGFWm5BlbAfkA9maSpJzWsOaNXG8Q5xARy0p/Z0wU9BJUlmRT3xpP5oT6ZiO+dM4Udv0zCq8RCXK8NDbvnTxupDXpGAVWRH9Ts+cwpuIjMIOZm4aGwq0pfSkS48phjPVBlqmSTncDCwtJIQq9ka8I1cb4b1X3GpvyZ7RGTsic6UboO/TA3UqU+eJFdbA0pkp5oTE3iIGZj8OI5Nf5qbK+jAa+rhISg/YhNeCBmZuFDsNzXnSNJOUH92IYKqrqcNImgyzmLpTlyC27mjWIcPWGCWj/rB7DBUmLOlDTTqQcQzY05CX8jQiPXFOjclkf3YhOdVamCFzNluFHsNziOoHcWh+wIg4iqX4xA6kCFMEa4eHHsNDiKplOrwHUkQxkalNv0SeeceJcbAynm16o1o+LDmmfe7Uz0J7Y0WydWnHLsYvf2p5j9lL8w+qINbqh3Tix5vqjA4xELdlckexnGsVM7513z2+iKDVal+WvenGJBc88bMxskexkGpVA75x70zDXD8zMvTjwdfcWAyo2Uo74QGHWGtZ18/qFQ0W7k6sY5HoLDOzhOs076Zikzc2TrMOn9s/XFkjWIhblbJdC6ZmYO95w/tH64p5Z071q8pijjEk6QDWXYCtfwj54zqKVGvSwzHVYjAhhQxfEEr8eCtwTtlZZqqj35mbE/dFdsYmY85jKqfuxM/KK7YxIXqxocqC5iLnpiYIw9wuTEpB5QaxEVJ8cRluZvQb4lt3ya03MI7ISeSHeJvdVPyCOyEkGW4lHkQac0T5IiAQlipHHdEmCIME1x3Oges+n6+/VCWHU/96FP+OuEt9N0NLoTo7P5gN8Qd0TBClSnhEHfuieNogxjDqkfe9VD+iPphJwh5SfvcqvxU/TCONJbEqfNL5hBBaAQpUIIIINzBAdIILXgGJG6HVJ1oVT+Ik9sJId0f3GqfyY+mHg9SdXlEx3xA3wHeYiFKFUEUxVAMTfSHGHBeprHO0vshOBpDjDRtViP1S+yHjuSq8jFC9HDpADeBf3Q+WIHNA6lFsTBBBGAEMqH7vyvx/rhbDCiH7fyvyggx3Fnyssz4+2cwP0z2xjxkVD3VmPjntjHjGjyoIIIjyiCYmMiQ905f5RPbGN5RGTI6VJg8zie2CtwS2Zm1/3fmOsdghZxhniD74JjrHYIW80Z7iQ5UTBvEGvGCAMQDFxv7s38YdsWuMXW9Hmz0iCtzPYZ4kH28PyaOyFMN8Se7f8Ado7IUQZPUnS5ETe3CC94i+toN0YpYqiRviLiCMKOa/ukza32OnsEJgdIdV7VmSP+rphKIMtxKfKVQA6xF4OqAOTE+/iBE++gMDHNVN6LTfkz2wmvpDepa0Sm/EV2wnhpbkqPKVQDfEAxPVAKFUA3wCDdrGFW42mfvQkj+sVCoboazGuEJMfrVwqvbSGkJT2fzZMEU3iqFHCDjBBxjGQ3Qb4Od/tH0Qohs1rg57ofHZCnW0NLoTpdfmAMTeIghR2VQRA3xMYCWo3k/vVn+hST2QohxJa4VqHWntEJrw76E4by+ZMERfW3TE8dIBQIgG8B3RPGMYb0XWTqI/Uwp4GG1E9q1H5GFHAwz2Jw5pfsEEEEYoEEEEYUcYeP2xX8kqFB8Y9cNsPe6S/klQpV4x64PQSPOyIIIIBSwQQeWCMEaYf93WfL2Quf9sufHMMcP+7rPWeyF74+yXPjGD0J/rZbggggDBBBBGZjMpfuxLfKDtEFV92Zj45iKX7sS3yg7RE1X3amPjmM9hf8n7GHBBBGKBBuiOMF9N0YxcYsJpvX3w7YYYhP2+e8nZC5gfZLfxh2wwxD7vvDoT2RlsxHzoVwQQRioQQQQDAN8OK+PZpT+zo7ITjfDjEH3aU/s6OyC9icuZCeIJtATrEXvClGERaJsIIFzBcw2qvuNTfk1dohTxhvVR9qKZ8krthlsLPdCaCCCAOggg059Yg74UKQEw5eFsEMi+989kJfKIdv/eSx8ueyCuolRaoRnVUG6JgteAVCAm0EU3vvjGJvuh1TfvZqZ6EQlhzT9ML1L9kQUTqcom4mIgHGIvCFbExSd8GpG+0QTBQyA7oeYZ9tTPyCoR6mHmGtJmaPNLqho7kq3IxGTrEQcbQQhQIIIIxghhQ/vglvjfRC+GNC++GW+N9EFbgqcjMWo+60z8ortjHvGRUNarM/KK7YxvLCvdjQ5UEEEEAZhFSAS6m1t8UxU392T1iCtwdBtiW5q6QfxKOyEsOcSa1oDmaR2QmHMI0txaXIgG+DjBBAKBBaC1oIw1hzUCfWnTh0rPzwmG6HNR+9em/tH54TQWTpcoRBMTFJ3wCgExTEmIgXMO6X969UPxfphLaHVN0wpUzrvT9MJoMuhKnzS+YRG6Am0RClQgh1yWGidJmaT+zeAyuHVDwak+nrbhsvuT4q7P6CW3SIIc9w0E7qssdaInvbRlDwKwPKiNlMqsff6CWHdG1pFT+SH0xBpNNI8Css+VJhhTqewzJTjbdQZeS4ixUm/gdJ6IaEXcnWqRymrHeYiHXeNkk2qkof2oPW/fxanKH9qFyspxodxLFXGHHrcfPizsof24BhucO5+XPU5Gys3Gh3FA3Q4w57sa/il9kR626gNQWTb9YIz6NSJ2UqfKvIQE5FDRV9bQYxdydWrBweprbg9lPXFPGGi6BUi4SGAQTvzD64p7wVQHSUUfKIziyiqQtuLoIYmhVQDWTX5CIpNGqY/A3fNGys2ePcwIYUX3elbfjBFBpNQG+Td9Exl0qQnWazLuOSryEpWLkpItBincWc1lephVIWrEwOGcxjQyqcjNrqz6kS7qklZsQgmMTuKbG+Ve8qDAa1DCSyrUsQReMpMp3y7o60mKSy9f7kv0TG1DdFuL8l7osfKJ7Ytlpwb21eaL0mhYqDF0K+6J4dMZbiyejM3EItiB/pt2CFghniEEV97wTuT2CFYvzGC9wU+VEnQxFzBY8xgjDMIrQTyqOuKIrRflEdcFboD2GuIrd+B8knshTDbEPuskjcWk9kKYMtydLkQQQRNugwpQjhFY3xSIqHSIYUdV4ewSOn9AISQ6rp+xZC34gQl4QZbk6XKEVCKYIBQnSJHjDriDu0iU3uOuMYcVH3Bph/QV2wnO+G9RN6DTehKu2FB3mDLcjS5QI1iQdYIPIYBQq6t0AOh0iLxPvYxhvMD+aEof1yoUnfDaZN8GynQ+qFMNIlS2fzYQXMEEKUZVxgiBvieEDqBDZr7z3vlx2Qnhy195z/AMuOyE9heC3sTp9fmSN0EEEBFAiQbREF7QTDmRP81aj1p7RCY7zDiQ1wtUT0p7RCfW26HfQlDeXzJ0vEEiCDTjvgDk3ETe8Uwbo1zDmi+1qh8h9MKOEN6IQZaofIGFHAwz2JQ55fsEEEEYcIIIIxhth73TX8kqFSvGPXDXD3uor5JX0QqPjHrg9BVzMiCCCAMEEEEYw0w/7vM+Xshe/7Zc+MYYYf932Os9kL5j2y58cwegv62W4IIIAwQQQRhjLpfuxL/KDtETVfdmZ+OYime68v8oO2Jqx+3UyLe/P0RnsS/wAn7GHEGJ4RTmB3wpUIIm44CIjGLrHtlv4w7Yz8Q6197qT/AN0QvY9st/GHbDDEHu871J7IK2Yv60K4IIIFygQHrg8sFoCZgG+HOIPHlD/q6YTgaw4r/wB0lP7OmG6E5cyEp3xETxiCQIS5V7hEX1iYg7xGQCR40N6v7kUz5I9sKB40NqsftRTPkj2wwsuZCeIvEwQpQgkRSTFREQYwUAh2/wDeTL/LnshICLQ6mLesmW+XV2QV1EqdBIInyxFxBcQCgEaRG+C/R88EYwQ6kPvVqXWmEsOpD71Kj1ogxJ1dkJSbKMU3ibXMRCFmF+gRTFVhzRTBRiRpDzDn3ea/s6vohGN9odYdPss38gqCtydbkYliDvioCIIN4VFCIILGJAjGKTDKga4hlvjHsMLbdMM8Pj+cUv1nsMFbgqcjMOd1qcx8dXbGPF+dv3ymNPfq7YsWPMYV7saHKggibEa5T5jAAonxVeYwAkRU0Lvo6xEZFHchXmMXWG3DMo8BXjDgYMdzNqxn4jv38UOZCOwQoh3iNlxdcWUtqPgJ1APMIUiVfO5lz0TGmncSlJZEWYmL4kJ0nwZV30T9UVd7Z8/gj3oGAkyuaPcxoL6iMrvZUD+BvegYlNJqJ07je378pg2Zs8e5nVMfzZpYHwVdsJo2Sfp847Q5BluWWpbaTmSBqNYVCiVQ7pNz5vrgyTJUqkbbmBFJ3wz7wVYj2qodZH1xV63atf2r/wAY+uBlZTiR7inhEQ49bdU4tJHWsfXAMN1C2vJDrcEDKwcWHcuU8WwfUj+kmEtxaNplaRNM4cnJVamszqkkHPppC71uzGXwpqVH94IaUXoTp1YJy16ic2tFMOvW8v30/Jp/bgFAQD4VUlB+1C5GU40O4k154mKYm4tClibxF+iDjExjML6Q6opPe6o/I/XCU7odUT2hUR+p+uGjuRrcgmJOYxFzEneYiFKEgnnicx54pgjGsXAtW4E+eHGHVKVWQFKOqVbz0QlFrQ3w77tp+IofNDR3JVUsjF7sxMJfVZ5wWJ0CiIBPTQGkw76Z+uLb9+XX8YxavrrGb1KKKstDNFSngNJt7yLMVCqVAad1vemYwkmKo12K4R7GZ32qP5Y76UZlNqk+5VGGlzTikqWAQTodYTxmUj3clflR2w0W7iThHK9DOqNXqDFVfbamnEoSsgDmEY6a9VL+3F+W0W6uLVyZ+UMYVuaA27mhTjlWg1GIaqD7aUesCKxiSqgW5cH9kQoggqTNwodhuMSVPi4g9aBFxjEU+uYQhZaIKgD4AhJF2X9tt/GEZSYsqMLPQ2CsVialKu4yhtkpSBbMgE7owRiKb4sSx/uhEYjuMQvA8yeyFMFydxYUYZdhwMRTHGUlD/dCKxiFzKLyUp+7EJIkb4DmxuDDsOu/o40+UP7MHftJIHe2U9GE0VJ8ZPXDKTYOFE2Wr1FEtPJQqSYdu2lV1jXdGAKzLDfSpY+eDElu+rfyKD80J4zbuTpU45FoORVpIm5pEv5CYnvpTTvo7PkUYTC9okRrlOEhv3ypRGtIQOpUAqFKv7kp9OFEEbMDhR9/qbTUZiQbl5RUxJlwKaBQM1so5owO7aLfWlr/AHkVV0fYNO+QH0QlvDSlqTp0047jnuyh21pjo6nIjuugX1pz46nITxN+iFzMbhL3+o3Ezh+/tCY9OJL+HzY9xzI/bhPfoid40EbMwcL3f1Noml0lNJklPMvFohXJgHUa8YXcrh/8TNekImp64dph6F9sJtYMpO+wlKnpuOuUw9xbmh5Yi+Hj+VjzQn6zBrzwMz7D8Jd2OctAO5ybHkEUlNB/GzdviiFOsGtjBzexsnubO4mlHDzAW7MCXDhyqCRmvGDyOH7azc36IiHvvNl7b+XMKdbQ0pexKlDR69WN+Qw9+VzXoCDuegflkz6MKLGI3GFzexTI+447noXCcmB1p/hAJehn8Oe9D+EKNYOHljZvY3Dfc2ltinet5xAml8gXQVLy6g25oXdyUP8AOTnoQNG+DZi348fRCixteC3toSp03rr1G3cdE/Oa/QgEnRvzmof3cKNINYF/Ypw36mOO4qPwqh/dxBkaRb3VI/uzCixiQDGv7ByPubTJy1PFDnG0T+ZpRTnXkIy6/PC806k/nYegYJG/rXqP7PaIT63uYaT20Iwpu78w4730obqun0DEd7qWd1XR6JhRaC3TC39inDfqG/e2m8Ku15QYO9lPtcVdnzGFFjBrwtBv7B4cu5tVKkZVtmbS1PtuhbWVRA8Uc8Lu9dPt7sM+YwUE2Zn7/iDCfwrQ91YjCnLPLXsODTKfwqzPoxApsh+dmfNCex54ATfhC5l2K8OXqHPe2Q/OzPmg72SB/rZrzQnN4NY2ZdgcOXqNopEhKszylM1Bt1RbULAfPGCqmSOc/bVnzRRh0nvoofqlQpV4xPTDZlbYmqcs71G/euR/OzEHeuS4VdgQovEacBAzew/Dl6hwKXI8aswYnvXI291WB1CExvEXVzxr+weHL1GzUiRlWKs243UG3VC9kJGp0jFdpsip9RNUZTdR0tujHw/fv+xfUXPZGBME91u6++PbBvpsTVOWd6jXvXIfnZjzRBpcj+d2BCfXng69YGb2KcOXcb965D88MRPeuR/O7EJ/IINY2b2Bw5eo2GQp0mioMKRUmVqCwQAN+u6Co0+ScqbynKm02oqJKSNRCmmKIq8tr/Sp7RE1i/fyZ09+fog38uwqpvPzGWql063uuz5op72U4f1wz5oU2PHWItru+eApew/Dl6hx3tp354a8giO9tN/PDfowpA6BF9Uo+mVTMqYWllay2lwpISpQFyAecAg+WNm9g8OXq/2GbdNpweSoVVsm40ymMuryMi9U1uP1JDCza6Cm9tIQMaTCNx8IdsZ2Ivd50W4J7BGT02JuEs68xUadS7e7LZ/YMAp9K41dHoGFGXoHngsR0QuZdimR+pjjvfSONYT+7MZMnS6M7PMtKqnKBSwMgbPhdGnbCJlKS4A4tSU77hOb5rx0fZHJbP5jazIsY2qc8zRErUpcy0OQLdgFIUpVyQkqskgAkgi1t8bMuwVTb/Uak7TqMl1YFVNgq1uSItGdWJalrclzMT6kWZTlsgm454cbRZfZ/L7TauzhGcn36EiZUmSdQhKkqaA0som6hnuLqF7WMa7ilMkFyncyn8wYT44AFvJDqStsSlBqaVzFMnQ7+6i/3ZiO4qH+c3D1I/hCY6GIuecQl/Ytw36mOTKUMf1k76H8IjuWhfl73oQn154jW++Nf2Dw/wDuHPctCze6D/7uGE/L0vuCSExMupbDZyEJvcRq9iFA3hzWDak0wX/oj2wVLTYnODzLUjuegflkx6ETyGH+M5M+gIS688ELf2KZPcdcjh3jNTfoCBTWHgNH5s/siEmsRcxs3sbhe44UmgDXlZrzCGDvesYcZzcuqX5Q5d2a9o1frOkOpgfzKlvlldkZPcWdPbUoz4f/ABc0fKIkOYf/ABE16UJ7QQMxTJ7jjlsOg+1Zo9aogzGH+EnM+nCfWDyCNmfY3C939Rt3TQfyGYP7cMZV+mHD8043KuBhKk8ogr1VzRq94dyR/mdUdPfo+mMnqJVpKy1f1KBOUDjTXv3kT3bQeFLd/eQlvruib6aCApMpwV7/AFHXdtC/Na/3kUmoUYGwpPnXCe55hEXubWjOVzcFe/1G/fKlAaUlN/jmM+lTko8JksU9DWRkqNlHUc0az0Whzh/xJ/8AsyoMXqJVprIy2KtIgm1IYGvOYq78SdtKTL+cwlIuo9cFoXMy3Cix136lRupUt5bmA11rhTJUfswlgjZmDhRHPf4e9p0oP2YzKTV1zVYaY7kl2wq/hITqNI1qGmHfviY8vZBi3cWrSjkehkv151uacbEnJ+Coi+QaxZOIZg7pWUHU2IXTft9/46u2LMByd2NGhC2w29cM3walh1NiKTiGfzbmf3YhSd/RBGzMbgw7DY4jqXBbY/YES1iCqKfQkvJsVAWyiFEXZYXm2/jCNmdzOlBLYf1utVCUrDjDD2VKQNyeiFxxDVidZo+aJxHriJ4dAHzQrguTuLSpQyLQZGv1Y/hi/Jb6opNbqh17tc88L4g7oXMyvCguhnms1M/hrvnijvrUSbd2Onj40YV9IAbaxrs2SPY2CqTk01SJBTb7iVLbKlEK36wp74zxHtt70zDCsaUiljnZ+mEl4Mm7iUYRy7GSZ6cO+ZdP7Z+uKDNzB3vunrWfrizcRHGFuyuVdi4X3SPCdWetRikuKOtyfLFJ3QQt2GyHkmb4NnVXt7KkQkucvGHcoP5lTp/WphJ72Gl0J0lrL5kXPPBBBClCkwQbzEkaRhgGsTECJjAYQ7oQvK1H5A9hhJDuge16iP8AVz2Q0dyNbkYlO8xESeeIhSoQHWCCMYkbob4c1rrfUrshQDwhvhz3ebHQrsho7oSryMWTHthwfpHtiyDeL8yLTTnxj2xZgPcaOyJEVXindEjdGCVRm0nStyvyo7YwQYzqV7tyvyg7YNxJ8rJrPu7M/KGMGM+te7s1f8YYwIL3BDlQCKop8sSIAxMXGNJls/pDti3vi4x7Zb+MIKBLZjPEv3wunnSnshRDjEo/nA58VPZCgi0GW4sOVEQbjBwg3woSrjFSfHT1xbisHwkwyYGNsRG9TaP6hHZCiG+IhapM9MujshRBluJS5ETwiYpBioboA9wiRxiIkcYwB3XNJCmn9T9UJrE74cVvWm035GE4Nz1w0nqSpLyEQRVfWJCSYS5RIpAgtzRWE9EV5dN0DMNlGVQucO03qX2wohzPAnD1N6l9sKsu7S8NKRGitC35TE2ivJ0CKsp5oXMVylq8TwMXMvRBkvpGzAyjN+4wbL/LnshTrDp1N8GsafhCh80KijWHlIjSWj+bLdjEWMXMpgydELmK5S3YxNjFeUeWAJN42Y1howL4NmNP6ZP0Qotpvh0ym2DJk2/p0/RCnIfgwzlsTpLf5lrLFVorynmich5oXMPYt26YmK8h5okI6DGzGsM5D716lpwT2iE9+iHcgn+bNUGugT2iFOUgboZy0RKG8i3aCK7Hmgyn4MLmKWKBoYN55oqynmtE2/RjZg2GtD+5T/8AZzCfhuh1RAeTn9Pwcwny6cYdy0RKK80imCJI1gtGuNYiCCCMYbYe91T8kqFR8a3TDXD3uqfk1QqV4564foTXMyIi4iYiwvugFAuIN8FhzQcYNzDSgECvMdZ7IXvn7Ld+Oe2GFA932Ov6IwJgfZbnxz2wb6E1zstxF+iJiLQpQkawQQRrmMqm277S3yie2K6x7tzPxz9EUU33WlvlB2iK6xrWpn45+iDfyk1zmDe8FumIG+JuRC3KFQ0N/JDR3EVZfwsxhx6ovrpku8qYalislKVqABPzDSFO+C5vYGBcxeZ9tN6+/EZ2IT/OB09CeyF7Htlv4wPzwwxF7vu9SeyGvoyb50K7xB1gghShINozaZNOSlYlZll5TLjbqVBxJF06jUHnjAJsYqvpGQUZD61uTjjilqWtSycx1JuTvMZ+IDd2U1B9gTCyXW0JpHLpUWswzBO+3GHmL3JV2py65RktNFhFmzvGkNfQnLnRrhFzeItExBMKVZFhvgBA54Im8YwE7ob1j3LpnyR+iFGmmsOKx7m0wfqT9EGOwk+aImiN8TaI3CAUQWPPEHribxGnNGCQQeeHcyf5ly3yyuyEsOZn7y5X5ZXZBROe8fmJxqLxBFoAdIypGUcnpvkGkOLWRolABJO4aG28kCEKMxdwiDD2o0B6nU1MzMImGsy1oBcQkIJTwzA+fphEd8HY0XfVEGHUn958/wDHRCXjDmTP80J75REGItTZfMScTEg6QHf54iFLE+SC0F/BiLmMYm/GHVA+41E80uYRg62h1QT9j1L+zmGi9SVbkYlvYkRBggiZVBBBBGDYDrDXDn3xMeXshVDXDl/XEx5eyGT1Eq8jF81rPv8Axz2xZvF6Z9uvH9M9sWIV7seOwQQQRghF6V9uNfHEWYvSvt1r44jLcEtmZ+IfvifPV2QqhpiL745gdI7IVjdBe4KXKg4RTcxUd0UwCga8YBuvEeQxN9N0YK3HNb0plLH6n6YSQ7rmlNpf9nv88JDGluRo8iCC8EFoUqEEEAjGHsp9484ed4fRCP3vlh1LH+ZE0P1w+iEp8Xyw0idLeXzIggghSxTFXCK+53vxS/RiC04N7avMYwMyKYInKv4CvNBlV8A+aMZsiHVA+5VAf6uqE2VfwTDmgg8nPi34OqGhuRrcjEvvfLBEkHXSCyvgwpYiJO+DX4NokAnhGNYphvhv3fa6QR80LABbUQ0w5b1wMeXsMGO5OryMXTQ+ynPjHtiyEm8ZExbutz457Yt6dMbqGL0RRlPGJCdIq06YNOmGQwBPTGbSwO/Mr8ontjCEZtLNqzK2/GJ7YKQk+VlVZt3/AJr5Qxg2EMa0n7fzRt78xgWHNBktWCHKiAkHhAAIkeNBY9MKMRYmK2gQ+jrEES0fZkdYjJAlsxtiJC3MQLCEknInd1Qp5F0lQ5NXg79If1QyprzxmkvKHIgo5Ii4VbTQ79bRblEUxysFlclNqzBwBoqGZPg+D5iDe/ACGauycHaIiLS06KSR1xSRpvjKnTLKnFqlW3Gmj4qVKzEDrjFJhbDra5EVDxkxT5YqGqkxluZjjEXuix/Z0dkJ4cYhH2ewSfwdEKBaGk9SVJ+RBaJiLjdBpzmBccn5okREHDfAMPK2PtZTPkYTJF7Q7rJBpdLA/EQqaRmIsI02JQV42ISgndF1LSrxlMSqle980bhhjZzi3FjC5ihUOYmpVs2XOLKWZdB5i64Uo8l487EY2FHmdjvpYeU9kaSmXJVuMXRLK+DHU/5F8Uo0cn8Ktq4pVX5cEdG8xV/I7iZIv3xwpcc2IJf648/85oeo6vgKltjnk9LK9b1NFt2fthUZdQ4R2OY2T4hdpcrK934VCmc1ya/L63N4xP5G8RkXFSwpb/8Ar8v9cNLxvDvXOSpeHVYrY5NyB5jEhhXNHWDsZxLf3Swp/vBL/XAdjOJU76lhIf8A1BLfXCfnWH9aHWAqdjlHIK5jEhhROgjqv8jeJfznhL/eGXif5HcRDU1TCX+8EvG/OqHrQfy+r2OfuMk4PYTb8IVCvudW+OuubKq93kTKJqmE86HSvTEEvujC/khxHf3Swn1+uCW+uHfjVB/qJU/D6sU7rqcuLBte0BZPwY6mNjuJD/WWEj/9QS8SNjeJbe6OE/8Ab8t9cD85oeor8BU7HK+QVwEAl133R1hOxnEx/rHCf+8Et9cXP5F8TW90cJ/7wS31wPzvD9ZmeAqdjnLMuoYQmgB/Tp+iFXIq5o7MnZFiBNDflO+mE86lhQBxBLW7YXHY5iQb6nhH/eGWH0w353h2tJkafh9RX0OVcgeaJ5E2jqB2PYjv7p4R/wB4Zb64n+RzEnCqYR/3hlvrgfnND1Ip8DU7HLeRMSGVb46kNjeJ76VLCR/+oZb64rGxvE1zeo4T/wB4Jb64z8Zw/rQfgKnY5/IMn1t1XTgjthUWF7yI7HK7IsRN0uclzU8J5ngnL/OCW4HrjCOxjEpOlTwkbf8A+Qy31w353h7cxGHh9RNto5RyCr7oORVzGOsfyL4m/OWEf94Zb64P5F8T/nLCX+8Ut9cD86w/qKfAT7HJ+QUd6YnkDzR1f+RjE/5xwl5MQy31xH8jOKPzjhL/AHhlvrgfnWH9aB8DU7HPqI0Q3P6H2uYTllVhcR2an7I8RyqZkLqWEyXWihOXEMudfPCao7H8dyVPXPNUZqpyzYut6jzbU8EgbyUtqKgOnLaKx8Zw8rJTRFeH1FJuxy1SCDqIotv0ho/K2UbC/D/kRgLbI36R6lKqpq6OapSlHRmORzRTc3i4eMUx03IWY2w77rn5JUKl/dD1w1w9pVyf1SoVr8cmG6E1zso3xMR0xMLccIIII1zWGeHyPXAx1/RGBM+23PjHtjOw/wDfCx8b6IwJn2478Y9sN0JpedlEEUwQCliqCKYqG6NczRk073Vl/lB2iK6vfv1MfHP0RRT/AHVl/lB2iK6t7tTOnvz9EG/lEXOYNjeC1oqiDC3HACCwiL2gzQbmLrAHdLfxx2wwxF7vu9SeyMaSl1uupWMuVJCzdQGma3/PGHL1Jerm0OXo7D7LLs04hpLryrNoJA1UeA54K2Jv+4ka1EX6Yc4moDuGsQzFJemG5hTKinlG/FULkAjXUab917wlgFbAYINOeJ0gXMCT4QhziL7vK/2dFuiE4AuIc4hsXpU6fcEdkMtUTlzISaxB3xUDY3sDY7jFKjdROgvwG4QtypEETbSIy674JiRw0hxV7mn0sAf0JhQgXWBGw1JphykU66lcoGrJQEXz6jjfSGitCc3aSFkvJJepszNmZbQpjJlaUPCdzEjTmta+sYLibax12k0PCk/sqrdSnsYsylWlSlMtRXJZIVN5QFNAalSgVKWnTxPfXtHM55iWS2pbk6tyZ5UpUgsKAKQPHzE776WtwvxgNWKpirjE2FonSI8sLcJA11h1NfeZKfLKhNuG6HM195knr/TLgp6MSb1Qk05rxdl3EtTCVqCrDgnf/wA3tFrhEXNt8KUM+aqj8zTmJRxKLMqUpKxvObXWMCCCAZKwDfDmT+9Ce+OiE0OZUWwfPfKIhok6my+YlvcmDmgtv64BugFgsYgxVFJtzxrmuU8Yd0L2tUv7OYTi194h1Qh9hVM/qPpjLcnW5GIhBAdCYIUsEEEEYIQ0w598bPUrshXv1hvhq3ria+Krsgx3J1eRi2Y9tu/GPbFi2sXn/bTnxjFuA9x47FNjBBB5fmjBCLsr7da+OItRflPbzXSsdsZK7BLYzcRffJMdf0QquBaGmIT/ADimfjDshUYL3BRfkQXiL6xJtaI8HmMLcrYjXjFSbaX54i6emJFtLc8YyHNeuKfSx/q4hJDyv27ipf8AZxCTSDLclR5ERBE6REJcrYIBE+eI03awbgHkvpgmZ+XH0QkOo0h2xf1jvjnf+qEnCGkTpfq+ZEEGvNBrzQpYbDE9T/GJPWgRPrlqP6o9bYhLaJjZpdyfCh2HPrkn/wAXLn+7ESMRzgOrEsf7sQn4QHog55A4MOw5GI5gjWVlT1tiM+l1Vcz3SVSzCShoqshFr9EatfXQw7w8PCnAfxBh4SdyNejBQehHf/U3p0ob/oQCvN31pUof2TCfhaIhc7LcKPYd9/JUkZqPKHzwd+pC2tGlz1EwkgjZ2DhRHaatTSbmjM+cxn0ifp71VbbZpiGnDuUk7tI1hIsIaYf0r7B6T2Q0ZyuTq0o5WZT1QpCZlaV0hKlBRuc1rxQajRDp3nHp/wAIVzft54D4Z7TFkJg5ncKorKtWOO76If6qV5HInuuhEe5bnkchRaxioDpMZSYeEu7+o2EzQTvp746lxmyD1A7vZ5OTmEuFYykruAbwiQ3mIhvTJRRn5c2/pE9oisE29gvD3i7Mz6m5QBU3hNS00p3McxQrS8YCl4ZvYS84PLGZV5FRrMyrKbFZ4QnellIF7Q8421aNTwjUFdsyCrDhNsk4PKPriLYbPvpwHyQrWi19IoseeIN+xnRa6jnk8OH+mmx5IqaZw7yotMzN76afwhLwuYlv7qnrEFMnKm7PU2+aaoj1cS3POupcVlBCRpa/DSL7DOEJbE5QqYfUEvLQQq6r8NdNY1zEYHfk33ZEmFTYKFBaCUqGqSNCLceuC52ewkMPmjzM2ioyOGxVJhKag60A4oZOTtl13WtpGIadQDqKq56H8ITuqcU+tbq1qWo5lKVvJPPFF9OMDMuw3BlFcw3720O/usv93Ed7qNm0q56Bk3woKoB4wMC6uHJL1GzViUp7s00ZioBlQaSAMt7jnhd3upJ0TWE+VH8YjEPhTstoPa6YUBJEGT12EpQeReYc96qYRfvy16MT3op9tKwx5RCffBcX3wt/YbJLuOO9EjwrEufJ/GINIlLaVeWMKMx5z5okE9MG6Dkn6jZajINvSckhVQYbDbWUKVuV0iLUrSmCqxqkoYoqyQabTbcWb6jqjDlUAKF7bxwjnrystBsPCUludZwHg2hrbqGK8UzIfw7RkIXMsy6ilc28skMyyVcM5BKjvCUkxj4rxtW8XziUzziJans+BKUuUHJysogbkttjTTnIJJuYyn1CT9TDh9pgWTPYgnX3yPfKaabSgHqCifLGnocKR4GmmkfC15OrUlUfc+porJBRQ0Yw/WJylOVCVo849Jt+PMNy6lNp61AWhU7LBKjdCfMI+i+AVUpey+hDD/JKpRkWw2G7FHiAKCuBNwb38seHdpbdEG1mvow8W+9gnXAxyXiW98E20y5s1o+Y8J8dljsRVoum45PuehXwqp01JPc1ij4Vr+IA8aDh2oVMMkBwyUsp3ISLi9hpexjNn8BYwpNNcqVVwhWJGTatnmJiSUhCbmwuSLDWO47CJVbGzLErE3Tp5LdSmJZcq+qSmnGHQ3nC/DYsq4JA0O+HG0PDc/Utns9I0eRnHZpRQtDMpIVI8qAoEpJeWUAe+JIO6Oip4xKOJ+Hy6X31MsKuHnbPNMtQ6nN0mcqcpS33pGSKO6Zhtu6Gc+icx4XtpF31u1ZeF3cRt011VKZfTKuTYSMiXVC4R1kR6F2b1Mq2dS1PnKdgSkHEKBK0+TmpN5a6otpWULfsrLYquLm2usa5imRfkvU11994URlU5iKVmDJ0gnkpM5VJLRSblCgU7rkR1fHS4rptdUl73E4Hlvc4a2w46SltkrI18FF7eaGVWwxW6JTadUKxS3ZSVqTJmJN1wCzzd7ZhbcNeOsdN2D2TVatPzGK1UZgNob5BmfZlHJpWqkgl0EZN+oGhOsd2qs9iWq01aaxUaPhdSmVLps7KViWmEOC1k8qh1HhpvvUi2+IYzxR0K6pKKt11t/8A0ajhc8M1zxpSsO1WuzipSiUabqUwkZlNSbBdUkc5A3RdksJVupTVQlpKizDr1OZVMTjfJ5VS7aSApSgdRYkeeO8bOsK1CWwvX8MTM/JuyM3VQpFTotcYlZl15kWKUpc1W0rNcdO6NtnZGouY1xrWJ2VkWEO4PelEpl3u6HApooTd9wJAU4RrpzQavi6hNwi1tpqaOGvG9zyVLU96dmm5WSknZmYdOVtlhouLWd9kganjDc4MxW0NcH10D/8Aprv+WHmz6iv1vaBTZVlVTQWwXy5SnG0TLaUpvmQpakpSb8b339Uek3J7GLVHGHhhqtKwstPJKqjmJWjVOWJvnDmfILfix/COjF4+VFqMUn9idKhnvdnjmYZelJtyWmpRyWfbOVxp5soWg8xSRpFoqHwR5hG47U6E9h/aQ+24upvInEJmWn6nMNvzD1/BUpakEgeEDYHW0Xk7HNpK0gpww4QdfbTH+eO+M4uKk+pBwldpGkCyhcoT5hAGQ6vKloKVa9gm5tGyYgwFi7CNOaqGIKKqTlnXQwhxT7S7rIJtZKidwJ8kdB2J1vGTs6jC2E38OSSA/wB1zE5UWWg6tCilJbCl3KhpolIvv54niK6p03Uhrb3GpQbkos443KcsuzLHKHmQjN2RnSeHKvUKxKUqSo8y7PTisstL8iUreNr2SCNY7hUpTER9Unid3ZUjvO0CEzj0wwhhmXbJTnWsOCyEFYvcC54b42uXxPhXFO2bB1KcxIqp1OgOp5Kpol7JqcwskLQkJslDaRc5rakRxT8SnFJqN1a/uvnp/wCToWGv1PKk1KOSk49KzDHJPsrU042pIuhSTYg9RBEWPBHvE+YQ+xkgjH9eUL2NSmd277sqNe1BMetTlnjdnFUvF2uV5k/AT5hEhSbeKnzCLe+CKWRPM+5XmHwE+YQZk/BT5hFu5gN7QcpszLl0fBHoiC6fgJ8wi1cxO/jGymuy8Cj4KfMIzqXVZ+j1NuoUmdfkZps5kPyzhbWk9Y7NYWAW1vFSTrugOKejCpM6hU2ZbahhGfrrMsyzjGlNd01BLCQhNVlb2U+EiwDyCRmt4wN98csmcP1MbpZPRZY3R0TY0+tvbfh+XFy3NuuSj6eCmnW1JWD5CfLaOaTqlMuLZbcXlQpSB4R3AkC/mj0fBqjhOVLpucPiNNuCmiwaBVM3tYekIPW9VOEuPSEYS3nArR1fpGLYmH/xq/SMfVxasfPyjO+5sFIo09K1DlXmsiShSbhQOtoXrw/Uys2l+PwhF3D7zq6qpK3FkcmreSYUrmZjlVeyub/hGKPLlRKKnnepnmgVP8nHpCI7wVP8n/4hGAZmY38s56RiO6pj8c56RhfKUtPuMO8FT/J/+IRPrfqf5P8A8Qhd3VMfjnPSMHdUx+Oc9IxvKDLPuPqTR56Wq7TzzISlJ1NweEYr9DqS5lxaZcWKiR4Q11iihPvLrrKVuLIJ1BJN9Iw5mYfE46A64AFEAZjzwzcbCJTzvUy+8FUv7VHpCJ7wVX8n/wCMQu7omPxznpGDumY/HOekYXylLT7jDvBVOMv/AMQie8FT/J/+MQt7pmPxznpGJEw/f7s56RjXia0+45kqLUGZ9lxbACUrBPhA8RE1KiVF+qPvNM3QpVwcwHNGBTnnjVZcF1Zu4m91HdcRVWH3U1qZSl1YGfgT0QfLlEyzz7lZw/VDpyA9MRHrdqn4hPpiF/dL/wCNX6RiO6Jg/wBKv0jA0KJVO4y9btUGvc49IQet6qX1YA/bELeXmPxq/SMBmH/xqvOYPlNap3G7NCqSHkKU0kAKB8cRlVijT85V3HmmkqQqw1UBuHTCKXeeVNN+Gu+ca5jDHEDq0151IWpIsnQE8wgpqzJuM861KDh+pXuWkXJuTnFzEpw/UL+Ij0xC4zD27OvzmK2FuuvobLihmUBe5NoGhS0+5n+t6ocEoP7YiPW9Uvgo9MRsG0PCUpgfEErSpLFVOrynJJmZedkHCpDK3EBRbvu46EE/RGnF125GdXngXQLVO4w7wz6d4bH94IY1elzU46wWQjwWkpN1gRrJW4VAla/PDXEKlIm5YIUoAsJ42gpqwHCeZaket+eA3tX+UESMOz5G9r94IU8osDx1eeJS658NXngXRTLU7m0UDBM/WsSSFIMzLS/dcwlgPLJWEFRteydT1C8Msc7NKpgvF79BmJuXfW0EHOAWs2YX3K18ouDwjUJKozkhONTsnNPS8wyoONvNLKVoUDcEEbiDxvF2pVmp1ecVN1OfmJyYUAC6+4VqIG4XPCGTjlJONXNe+hkow1PBQOdi3NyohnUKW+9JyTaHGczbeUkrAjVS6uwuow0rLi+4aYQSDyN736YykkhZwqOUdR/K0SsLw9VJxl+Rbl2uQDqLAlfh+DlNjY8TqL3tCN6kTjzqluPS5UokqJc3njGCzVqhL0uZprMypMrNFJebG5WU3TGFck31vGlJMrCFRXuxv63Jo/hEr+8iRhuauPsmV/eQpStd7A+cxtODMKTWL8X0zD8rPSDEzUZtEmyqYmAlKVr3FXGw6OeFVhrVO4tcw3NNrIMzKi28FyM1+lOLw9LShmJdJQ4o5ivQxsG1vZpPbM9pT+FahUqa66Gm5hLjLhCAhd8oIUMySMpuFa7juMapUWQ1hKUHLsrKXF6truD1aawU1rYScZ6XZa7wOAe3pT95Ed4HPy+U9OEtz0xN1c8KmupZxn6hyaArjUJT04O8AG+pynpmEuYjmJicxI1jXXYGSfqHJobYtmqkn6UMGaa2MNTLAnpdQWtJLgVoI1a504iHMrpgydN9eVSI0WidSErLXqVt4dS4lZTVJWyE5lEqsALgdpHni2aJKp31mU88RRsTVOhU6qScg/yLdSljKTACUnO2SCUkkHTThCdbilG9x5oCaK5J9xyKLKHfWZbzxBo8iP65lh1QkueeDXiYN0bJP1DnvVTwfdmX80M6XJSjMtOBuoNPJW1ZRSPEF95jU7mHVDP2DUr/AIj6YMWriVacsj1INLpepNaZvzZTEd7KTb3Zb9EwnvcmCEuV4cvUODTqRluayjyIMHe+iga1nzNwnguLRrm4cvUOO4KH+dlfu4YUWVpTVYQuVqCnnADZBRa8avcQ2wzb1wt/FV2QYvXYSrTeR+YvOSlC5dZXUnL3Nxk/hFIlMP8A5yfP7H8IUPk91O6++MW/LAbV9h403bcd9yYd41CYP7H8IpMth0H29MnoyfwhL5TBpx1jX9huG+465HDo/C5o9SRFbCMPiab5N+aK8wtdI3wiuOEXpPWoM2+GO2MpaglT03Ngq3eQ1Z4zapnlb+EEWt5IwicM8075xGNXye/8z8aFcaUtdhaVPyLUd8phkH7jOHrI+uJ5fDQGkrNH9r+MI4IXMPwvdjvujDY3Scz6f8YkTeHRb7Af3/D/AIwjgG+NmDwl3ZttVmKUhiS7plHFgsgt2VuHMYWCcoA3U10/3kFfvyFOHNLiEsNKWpKjRWRav6jvu+hD+qlHrXAKlQxp3nv1r/hCTfxggKbK8CPd/Udd9KON1GT5V/wie+9KG6iteVUJIg6mBnZuBH/jNtRUJY4aXMop7QbDuXkr6HdC3v1KBOlHlR0axU1pgVf9p+gQk97DSmxKVKPm+Y47+tDxaRKDyGAYgA3UuT9GEtoiJ52U4MOwQQQQpUkbrRMQImGAHGHWHfbE2P1CoSw7w77ZmelhX0Q0NyVXWDEp0NoN8Cr5oLQpQCIkCJAiYJghnh/WvMdZ7IWgQ0w/piGX6z2GHjuTqcjMSaR9nPdCz2mLVheL057oP6/0iu2LHRaC2GPKioC8VCKYqHVAWoyMyVSCoaR1vY5gqWxnj6Xp024tuUZQZl8oNlFCSBlB4XURHJZbQjnjo+zjGE7g7GMnWZEJcUk8m4yo2DratCkn6ecCPSwls6zHoYSUIzTqbHqjEGxbAdZob8rL0RmQm1IIanJcqC0L4FVz4QvvBjxXV5Eyk49LrAztrUhWXdcGxj1fjfbi3I4LlV0SmutTlTl3FNPPrBEuAtTZNhvN0m0eUam/yjillRJJOp6478fkcVlR6vik6E0lSNdfTYnSMbjGW+d8YxGu+PCktT56e5TY3uN8Vt25YHpERbripsHlB1wqJT2GuIEKXV7pQpXsSb5QTbSKsO4UrmJ8QSVDo9PeenZ54S7CSkhKlngVHQDpMTX3XW6sOTdWi7Sb5TbhGNTq1UqbUZeclp2ZQ7LuB5speUkhQO/f0CBJak6XIjctqWy/E+A8ViUqclyrbzSHETctmWwshAzpStVrqSQQRHPXELaOVYsrmvG0Y4xZXMZVtir4grD9Um3JZvO47dISoApISncN3AC8asrfut0QrKFFj0RIBzDSAwDQ7zGQo2xAPsyWP+rohTwhviH21K6/g6fphUkC+phm9SdHlRTY80Qd97R0BeyyuJ2TS2PUzVOckJmYEuyymaQH1qKSbBo2VcEEEb7AqsRrGgqTbUWIjNDlGpMVXINoi0TACPasftXSz+p+qMOWPhCMmrH7U0z5GF7K7GxMRrRzaAw+kbnZcFMnGGyyq4BlzmrEpM9+6O1xmCEZZhhPOooCVgccpEaU22pOikkEaG4ta2/SFdKqj9PnWZuUmXJd9lxLjTzSihbagbhSVDUEc8dT9e+DcX+zY6os5KVZQ9lrdADaVTB+E/LLslSv0kkEx8hjMLUo1HKMbpn0VCtCcbN6msSldq0hT1yUpU5xiWc8dlp5SEL60ggHTSMAvnjzWvG5LpeygpuMfV5P6Jw+SfOHLRiuUrZUT/0g14f/AE+r/wAyPNjSs7qD+h1N6cxnYK2oOYRpsxJTVKdq7KlJLCHKnMy6Zca5glLSwPCJBN+aN0VtMo+J9meLnyyMOVeTlWlU3kq5NKdmFqcAUEJW54RCb7gd8c9XQ9mDco3MHaDW+TdvlJw+rW395FCaXsqJt/KHWiP/APX1f+ZEqmBhKXEyPN8mNDENRypqw2wltQZoVDp0nVMJylanqKtblFnnnVIMopZzWWkfdEhXhAHcYy2qpJznqacSS0/U5ZdZncSMTZl1LHKujKorWEDUpud40hMikbKbabQq0P8A6fV/5kXBSNln+kOtG/Ph9f8A5kGdC7uovvsw8R2s2h9sGcpEltFnn6ziRuho73Ocm8482yHVlabIKnEkC+/QcI7w9jWkv0qcYfxbhRS1STsuwl+vMOtpKkEAkcgDx4GPNopOy0b9oVY5/vfX/wCZFpym7LUiydodXvz+t5f+eODFeFrFVVUmnoXp4nhwyqxuGx2Zw1KyeKF1Gt0alVdUklimTNSWEJbcJUFOINjYjTdrujYZeq12i4brcnN7cMIV5icp7ssZednnninMLkt/pm1hfnjlZpGzjuLupW0GsBkqyBYw8s62+UjHNJ2WqP8A0i1kf/Ty/wDzI6H4Zmm5tPXuv/RJYlNWRr9Lmqea9TjWUvmmB9vusMnw+SuM4T05bx6UTV8KOvClt4i2UDZ0qYD6qYtt0zKk28YpJz8tbS/PHDW6LstKtdolXt//AK8v/PGaiibKUpuraHWQecYec/zxTE4TiNOz09haVbJ1NQr8vR14oqS6Ah5FJVMuGUQ9qvkSo5M3HdCwM5Ra5I646H3m2Uq0G0Ss2vf73l/+ZEGh7JgNdola/wB3l/8AmR0qU1FRyv6Etb3uaAlKUkEgnrMdAwl/JO/h9hOKqjiGk1mXmC4uYlGQ+y+3oUpSnehQtv18kScPbKu4VzSdoNcLSFBJV631b/3kL1UnZUd20Kt/7ur/APMjSpuqrNNDQqZZXTRt9Q2lUPGfqmabiGpMJlMPF9iWeTUDdLjDd/CfG43OtjcQyk8O4eo+07124c2r4BlFMzq5uUln1KUloEmySlOlgDHPBSdlg/6wq1/u8v8AzxcRStle7+UKtf7vL/zxzvBZdIJpWt3Kce/NY17EalOYqqi1T0tOlU26szUrcNPXWTnRfUJN7jrhNk13Exvxo+ypW/aLWv8Ad5f/AJkHeTZTbTaLWj/9Or/8yOuEpRVsr+hCSzNu6NByHmMRkVzGOhow3swcl3X07QK2W2gCtQw8rQfvIt94tlP+kSt/7vK/8yH4j9L+jEUL7NGgZTBkPNHQBQNlRH/SLXP93lf54DQNlIP/AEiVz/d5X/mRuK/S/oZw9zn+UwBB5o380HZTw2iV0/8A08r/AMyAUPZQN+0Su/7vK/8AMjcV+l/Q2VdzQsp5orbQb2tG/sYb2XTPKFnaBXlhtOdVsPnQfvItcpsjov2Q29ibFDydUyzrKKbLqP6arqcI+LaCpzekYv6MFo9zKwCwcL0Wq7TKgnk2ZCXdkqWF6d1T7qC2kJHEISVKUeFhHIphVjlzFVha/PG04uxvVcVTTCpvueWk5RBZkqdJN8nLSbfwW0dPFRuTxMaa65dR1j2/C8HUhepU0bPPx2IUlkWyLKzqTFsG/CJUb3ikaXj6JKyPHerG2HVfbcnnbVCpZus9cNMPEd97fq1QrWRyh64r+lEkvOymxiBrFWkRoN0KOFoiJveCw6YxrDOge78v1xhTQ+zXh+mT88ZtB935frjCmiO73vjntg9Ca/uMsndERJNzEQClgiRzxEEaxrGXTfdiW+UT2iLlZH28mfj/AFRapnuxL/KJ7RFys+7kz8eG6E/8n7GAYLkRMEKVRTcxN+qAiI8hjBsXpb2238cdsMMRffA8TzJ7BC+W9tN/GHbDDEY+37w6E9ghlsSfOhXcXiQu0W9w3xMKVsVleg4AcBFTEw9LzDcwwoodaWHEKG9KgQQR5QItRIHhA3I164xi4tTr8yt54qU44oqWq29R1Pzw3xC2oPSxKD9wTe43RTJ1SdTOLZE66GhmUFBkFRPSOEO8RVSbfmG5Z6dfDZlx/QC6idObdBWxCcmppGkjdExnmVpyXFBU+4CBwYO/m3+WKVMU4IGSdcUokaclbKL6k66wpe5hXgNydDGauXpwaWpE84si+VPJZb9PVGFuggIJ3aw3rHtCm6/0MKCNRDetaSNN+RjISfNH9xReAk8IiCBcoSFGMiXm3pfMWVlBULEgC+7gd48kY0NsOUlit4lkqXMVFmntTLobVNv+I0DxP/74iMgN2VyzWJt2cqj7zzqXVKVfMnjoNfm1/jGRODNhGRvvDi4zscYal8K41nqJL1RuotsFNn0ZQdUhViEkgKF7GxOojBnD/M+S+UXBXUSUr5bdxIb80GsTpFN4UuEA36QQdUYBVvhzLn+Zk38smE2tuMOJb7y5v5dMaKEnsvmI+MA3wcYnheBsWZBg42gOsEa4Ah3Qx9g1PoY+mEkO6F7QqfyEGO4lXkYkO+CA3vEXMKVJMQTE8IpjGCHGGR/OFsjXwFdkJ4cYY0xAjX3iuyDHcSryMVve2XPjGLcXHvbLnxjFowOrKR2DWJOggt0xB3RgkcIyJH3SYH6Y7Yx4vyB+2bGnvx2xluCexlV/74Jn40LIZ173fmT+lCyBLcWlyIIIIIA4RI3xESkaxgjmv/c5D+zj6ISw6r48CQ/s6fohLDS3JUX5EEEEEKUuEEERGDceo8HAauN5n6IR3uLQ8OmAx0zP0QjgyZOn1+ZFtLRBHPFUB3QhS5TBB0QeURgkiJiBE6wUYIdYbN5yYB/Eq+iEnNaHeG/b0x8ir6IeG5KrysTq8cxIvB749cTugIfoEEANzEcYZGKuiGlB0r8vb4R7DCwQ0oKSa7LgD3x+mGhuTq6QZiTnuk/zcorti0lBJ4w3NKmJmpvBtsm6zr5Ycy2GEtpzzbyEDmvF4UJS1OeWMp04q7NVSyoxkNyqlAgJUT0CN0lqbR2CorSpxKRcndGwTRotJorFQbk2yy6oth0p0KwEqI8xvHTDDLqzmePk+SFznLUi+myuRctz5TaG9PlJjupr2By2cC+U88PXMdSSJMMy8nfU+CUi3DWLcrjh92caQiUQhJWkHz6R0040k1qPDFYhrWAxxxMuDDmFkqv7Sf0t/rTojnkw6V3ub8/PHSdoFQccouGCEJGaTfUf8U5HNn86yVEJAHTaExUtbHqurK+qMJdrnhfjzxZKIyphbbjabpUlYJuEiybWFrDnveLAFtL6x57VydyjJ0xKU2UOuLmS4FrEmICVhXhCEUQS2YwxCCasPkkQpCTffDmvpPfVJt/RJhSQb6iM4i0l5CFrSWmkhPhIBBPPrvizw1i7lNopKYRopYt24HfE7zuiop1iPfb4VLURq1xrX9X5Q/6umFQUm1rQ1rou5Kf2dMKcqYMtydPlRf7rdEvyIdVyZVmKL6Xta9ue3HfGOVdMEUnfpGHKojW8REg66xjDqr+5FM+ShSDpcQ3q6SaNTLW+4xRScOVCrOoSwjKhXvjDcNydkQjVjTheTsjBaeKT1RlonCnhYx1Ch7LpUpQZl3Mq11G8PZnB+EZMeyFJUnQ6b46Pyec1dnmy/EdGE8sVc5HKNz0+ckuwo2F7kaRS+zOS7+R9pSVDojszEzheRaLbDQGlr2vFp9mhTyLhIzHiYP5JC25F/iOpm5NDlk5nGGqbZKj4S9whR3QUGxBuOiOzPy9EYpksytF8hJHRGq1SVopzZJdCidb2idXwlRV0yuF8cc3ZxNF7s8GI7sIMNzTpJb1kslI64vSuGW3HlOrPsQ3COReHN7HpvxKEVeQj7rWbWvAX3CPFVG1JoDYfBQ2AgcIZS9BlloJcbAT1RWPhMmQn41COqNWU8v1opPNMHshYh9R8UHmjep6hSzFLSyFnIXCq0IJiVlmAShIvvjVPDXHc2H8UUk7GOxKzCmc5BAip1hxtG+5jGFRdQ5kzWES/UMgBJvC/C00inxVW5aLjiRqYtKm3BprEOzKF62sLRi8sCo6RCWFhfQ6I4ifUeMTh9Z06FHXl07/JCnurri8l0etyZaBGrqTCkuEHWFnh4pINGrJtsYd1Dpie6td8LeWF4C9pvhOBEtxZDLurSATZEK+W6YOV6bRuBE3FZtVOm74eqwKteTRbzwrM4eG/rjHlJkppU83m8dCe2MLlzzmGdGJOFRpsaidI3n54nu0wq5Yc0QXdYHAiV4shr3YYpM4objCzlrDSAPEiNwIm4sjaKFOrBnrq3yxhQqcJQASSIppszyaZo38Zkp+eF/KeDqYfgxsiMakszuZTj14sqN9Ysl2IzkxWEFEEm2VlURvi2VQZukxQSw6w7bvx/dq7IVL+6HrjJpL5ZqGYKt4Ch80YSl3UT0w2bQTK8zKufWC3TFGbjeAKv1RrjWK7dMHlinMIgq10jGsNqBpX5e599GHNW7td+OrtiaY8Wqo05e1jFh5d5hw398TGvoJl87YQRbz9MGeMPYuQRbz9MGfpjXNYz6aQKvLH9YntEV1m3fyZP6Z+iMSSdy1BlfMsH54rqTueqPLve6r9kZvQXJ5/2LJIHGIvFvNrBc88C46RXeCLZUeBtBnHEwTWMqWt3W1r78dsZ+Iz/OF6xvonsEKmnLPoNz4w7Yyqy+XKw6u++3ZGT0Ey+dGLBFrlIOUgXKWLsSk2WlVyOkb98Wc8VJXZYIuNRqN/kjXMkMpWYyVl9YfmAVBVlhF1qvzjhfjD6uTyhPMqM9NNK7nSNWb3tqBw0jW5V4iqOucq+kkK8JIuo9cPqw84ibZcL894Mukn2MX6ugRuhCa/qIUoak3ytyZmpgOLupRLFzffAiUkQygvzb6CU3Vdg5Uk+WLzMwVgh2anQsAiyUZhY9kXVuNvy5ZcnKgUBKQEcmPC6oyHbMXuekBetQfUnMQcrQva2/fGJNJlEOWlXlOJB1UoWvzWjLMpTgSOUnTb9XGAqVmEqPsS9/NGCrFO4C0Na0QZKmW/EQrMtMDe0oWhpVWJhUpI2bPgMC/RBvoCSWZfuJ4LQcdd8ZEjJTFRqDMlKIzvvLS02i4F1KNgLnphR721Zj2PCK0uKQq4A6UgXBh5iHB9ews4y3W5Eyq3gS3dQVcDQ7jz2hAfGtwgtNaMEZqSvF3RcW6tzxiLcABYDyQymj/NCRJ19kXCcnSG04f5nyPyi4y6iyWsfmKCQYvIk5paQpLCyCL3AjHAueiMhD8wlNkvuC24BR0gIsyFSzyF2W0oaXsRwiruGbK8gl1kg20EVqmplS83KqJtluN1uaKUzU0kFKJhwDiM0YXUjuSZC8hZWFG9gRzb4csSz4wdNJLS7l5JAtvhMqbmSQTMLNtxzboay8w+cHzSuVXcPJAVfcIMRKidl8xQZKZChdhYubA2irvfNlvOWFBI1JMC52adyFbyvBAtbS3TECamMuUPuAc2YwqKu5SqTfSgLWjKk6gnjE9xTQNuRVeKS88qyS6pWulzeAzD5WVKdXc66G1ozNqHckzmsWVDohvRm1okqmkgg8jax4mFKpmYuCXVggWFjaGtHdV3vqZKzfkb3vxgx3Eq3yigyswEkltVhxilTDiVBJAzKFxrBy71rcqsDoMQXnVDwnFHrMKV1K+5ZjdySvNEGVmAdWlDpMQX3r35VfniC89xdV54xtSHG1Nnwha+6xvDbDI+36PiK7IUKWpQAUq4G6G+GPd5PyauyNF6iVORil37us/pGLRMXHfu7nxjFNtN0B7srHYOEU3HPBmik790AIa3jIkPdNj447YxzGTT/dSX+OO2CtwS2ZkV0/zgmh+nC7hDGue78z8eMDhGluLT5EU8YIqinjpAHCJG+IiRvjGHOIDYSPRLphLDrEO+R/s6eyEsNLclR5EERxiYOqFKhECJgtAYR4r7xUD/AFk9kI4eL0wM3/aD2Qi4CNPdE6fUk7op154k7opvxgFR6ZLD5uBVHej2MxT3BQvzssf3ZhKeuC94fOuxPhv1MdGn0M/1wr92YO99G3CsgfsQl8nzwac0ZTXYHCl6n9h0aZR94rKPQhjR5OSZmXDLzyXiWyDYWsI1XXmh1hv2+6CNORV2RRNN7E6tOWV+Yq70SBUT32YHkg7zyRNhWJfywpJ8I3J3wanjG07DKMvUNu80rwq0r54kUVki4qkr54WJbJ4eeGknSlONl6Y9jaAvrxikYp9BZtw3kXWqE2TcVKWNv0odUalNSlUafM3Lu5PCyg79IRIZRNTyJRuYl5ZBJu88cqE2F9Ta/CCkra76y4RnK+UOtrAi2nlh4uMXoRqUak4NuRuSmrPOBqYl0KKtBfpjAmZKcLqgZ6WSTvBUbxq7yFqqb9iq/KHXyxcCVKN1KzHnJuYtx2zlhg0kncavUufX41Slz+2YuCmzS6amUKpE5V5w7mPKEbrXOlvJeFaJdStyIzmqc6uxCNBvNrWgXvqU4vDVlL7FaKBNX+6sEH9OGUnhyb7qZUlbJssG2fpjJpmHJicdQ0yyt59aghtltClLXf4IG+Oy0jZFSsMyLFb2j1A09JGdijSvhzcwQeI94NbX7ItTpXd0eTi/GFR0UrvtY0HFtFmZjD2GAgNnJJvp8a34U4Y01zDU8fFQ36Yj0oP5PsWhNMquC53DyGFFqTn5RC3ktgknK8ncdTckc++EGItmk5hNSJuZw3K1elO/cqhJLcLa+bMN6T0HzxapRzO5x/8A2Gcn5lY4ArC9SJIDTR/bEWVYVqQtZpHlWI7BMSuGUhtE7hydYWASQl4pJvu8YRj95cAzSUgzlWp67XupAdSPNEnhmdtLxWpLWxyT1uVFOnJIt8cRcZoc6kKQ5LtuApsAXPFPOOmOkv7O5ObuaJiWnzl9Q24osLPkOkIqlgHEFMuZymTbbYNuUTdafOIHBsetRxebVv7GHjPC7LVbZTSJzu9tUs2painJkVbVOu+NScoVSSogy/8AxCN5mqE8Ks2tanAkNpunW8W6hQUPMZmHl5hqADb6YosI5q6R6VOlOcc0TR+8NTP4Nf8AaEQcP1Qa9yn0hDN+SmGlEF10G/wjGEtmZvq89fmzH645pULdCbp1UYiqFVL6Sh84invHVL27kV80XlCaSb90PemYtLcmk39ndHSVGIOCTEcathhVqZOzCpYtS6l5WUpNuB5oWGj1Mb5RyM6svzKVSvJvrTdhJ0UdYWd2TtvbLvpGEklcnTjUsVd56n+RueaINIqV/abnmgE9Oge2nvSie+E8N049b4xhbIe1QtGlVH8kd80Ud7aiD7Td80XjPz1/bT3pGL8qmqza7IfdI4m5g5c2iBncVd2HLNKfnGac260sJSjwhbpjpNHpol5VAZZKU6AWEJ6HQJ5yWky4XVXRuB1Mb3T6G/LtcvNOLaSnVKSd8e5g8O4+Y+R8TxubyplbmaRksoC8xF41qoDOlSnM194jYag+kgjMq46eEaZWJxQdAS4bc147aslax5uDpuUtEL0y8w/MEozZRzDfDJpt9Lab5gExgJqXcaAUqN1dMZ7E4ublLoKibxzQa2R6tSMuq0FtXnHygJSlehhIVOqbvdflEbLPMHudCio3Uo3jAep6xLEoUonnERqU23c6cPOMUkKWH1NvDODGw019qYBbCVJ8ka67LvhQBcN4zZF5yXd8J4364SneLsUxEFON4myTEqV5Q1fTUxlNpDbNim6rcDCtNZyoLaXL6amMTvwuXdzcoVX547M8UeZ8POWhkVHugIyKUchVcQgnpNa5cqCjmtGTUaq8+3ygctrCh2ozGW3KndaOKrOLuj0sNSnGxr8wHmnyCCSONotOuuEahV+qMucemSoqzknqjCVMPH3580eVJWZ7sNVcA45bVJ80U3WNRmg7peH9IYqEy98OESKa9i6hxzva6jwvGEYis5OqVeaMwOu9yLXm1B4xjqmX76ufNAaNHqWTm3WV5ojw/gq80Vmaf/GfNB3U/wDjPmhdCmpRZXwVeaCyvgq80Vd1THwx5onup/4Y80Y1mXGSpMq+NdQNPLFkZuYxfbmHSw4or1SNNItd1P8Aw/mg6CpPoU+HzHzQXX0xPdT/AMMeaJ7qe+EPNG0Dr2KLq6YLr6Yr7qe+EPREHdb/AMIeaNZG8xelVqSHd+qDGNrzGMhmYdWFhShom40i13S/bePMI1gWdyi3XEWN72VFzup74SfNB3U9zp80AazLdjzGCx6Yud1Pfo+aJ7re/R80YFmVShUmY0v4p3xZJVc6GL7Mw6tzKbW37oo7pev4wt1RgWdyzrzGDXmi73S98IeiIO6XvhDzQRtexaGbmMTc9MXO6Xj75Pmg7pe50+jBBr2JliRNJNyItuXLpNjvi80+4t5KCU2OlrRSqZdCzqNDbdGBrcs69MGvTF7ut7nT6IgM09zj0RGDr2LOttxgAVbjF3up74SfRiRNvgeMn0YGhtexSzmTMI+MD88TM5jNOKIJ14RW3NPKdSkqFirXQQPTTyX1JSQADutGBrfYxwFfBPmg8LmMXe7Jj4Q80Hdcx8JPmEaw12WteY+SIIN9yvNF7uyY+GPMIO7X7eMPMIxrvsW05w4k2O8cIvTpUucKrGxA4RAnHyoAr06ormJl1uYKUqtbojC63WhjZVfBPmgyq+CfNF3uyY/GfMIO7Jj8Z80Aa7LeRZ94rzRIbcCgbK38BFfdsx+M+aJE5M5gOUPkgoHmJIcMypSSvXid564a1Z6dU40kuvkFkAg3sRGAiafVNqBzqSL+DpcQwn5h0uthTb5HJi2VQhiUk8yuhUHpxKipK3QVaEi9zEian0+K88PKYrLs+SQgrIA4gaRSp6fQm68wHPaAUsQmangFAOOm4trrEcrNnep7ffjv54uByo2JGbTqioOVO1/DsegQbg/Yslc2sAHlTbdpGbNqmQxKlOe/J62HbGOZioJQVKWoARfmZ2aalpcodKSpGpHGAK077GDyL515JfmjNpkxO0ypsT8u0eVZWHEZ0XFwbi44xj98523thXminvrUBumVfNGTsGUJSVmbJinF+IcXvsPVhKVqZSQkoay3vvvbfuA8ka2ZaZPisO+iYq771C3tlUSmr1JI0m1jqhnO71YsKTgssUrFkyk3v7nd9Ew5nJaZXhWTaSytS0rVdNtRC4Vqp8Jtzzw1mqnPt4dlJhMwsOLWoKVzgRll1EqZ7x0W4lTT506iVd0/RMZ8i3NSrxW7TFPpKbZVpMY/fuqke3HLjmiZmqzqSjkKg8oFCSfC3HiIF4oo1N9hw1NoaD7isMocdWAlBUk5UC3NxPTA3Pcm2W1YYZcRoUhSVaEJAvcb9RfymEiavUwNJ94eWDvvVPy9/wBKCpIThy/5ceCdSlWZOFmSRcouk6Hp01HRGa3ME4acV3jaSQsDkQDZXTGsCr1Qj2695VQzbn51eFph4zTpWl5ICidYKtqSqQlZbb+4JmFcsypWGGsrago5QQVeX6LRSH3hOKdXh1lYUblGUgE8/RCvvxUvy13zxBqtRO+ce88L5S7jP2+4+VOpvYYXbKbDQpsSba8N2sU91uKYDQwy0OewNtxtYeWEJqdQO6cd88QKjP29uPelAugcOft9zKm5GfmHELTIvgpbSg3HEC0ZtLp84zIzyXZdxJcZskHibwo75T4/C3vShpS5ybdp9QU5MLUUNXBKtxvBVrmqKeUXd5qnc/YTt+qJFGqhFu43Is98p/8AKnfSiDUJ4n2076UB5StqnsX+8dU/I3IqFCqn5GuMQ1Gd4TLvpQd8J38pd9IwLxNaoZfeGqX9qL84hpQqVPylW5Z9kpRkUm5IOto18z85+UO+mYbYbmZh2thC3lqGRW9Rgxy3JVVUyMsLw/VFvLUmWuCTqCIo9b9U3dz/APEIxHpybEw5Z9zxj74xa7sm7/d3PSMB5U9i0VUtuMDhyq/iB6Qg9blW/Ep9IQuMzMH+mX6RgD8x+OX6RgXj2DafdDMYbqnFtA/bEXpSgVBmfaccS2EpUCfDG6EvLPkaur9IxkyDjpqjF3Vnwx7488FON9hZqeV6r6DeqUGfmaq8+3yWVSri6wIwzhuojeWB/eCLVbdcFemvDUPD4GF3KufjFeeC3G4tONTKvN9ht625+33SX/eiAYcn+Lsv+8EKeUX8NXngK1/DV54W8ew2Wp6vsN/W5O8XpbyuCI9b04CPZ5b94IUZ1/CMRmVcEqO+MnG+wctT1fY2irUmYmjKlt5lPJspScyrRgetyb391yv7yIxAshcnY/0CYTkm+8w05RvsToxnkXm+w59bswd87J+nB63XhvnpMftQmur4Rv1xGZV/GMJmXYrln6vsOvW+sHWoSfpmINBA/rGUH7cJgSTqYOPjRsy7GyT9X2NuVTWzhZuUVPMAcqVcpfwSea8LO8krxq8p54l5VsCsAflB7DCG5BhpOPYnThKz8w97yyNtazKxHeanca1LjyQjuYASYXMuxXhy9Qa80AiSeiJhLXKMgX54q1tECKgOMOlYwWtDnDt++DvyKuyE+4Q4w3rUnAR/Qr7IeO5KrysUnxzpxi+y0VEAC5J0AigJssmG9JmUSjq1lCStSbAkXtFIRu9QTk1G6MximNyLQmJ8eHa/Jnh0mMGdqCn15UHKgcBFx+pTL7riW5hSEuJyrJPjC+6MFDZWryxWc1a0SEYfrmXg7LqpZlu5AZguhwTXKKuEWtky7t+t98ZlFlM1ZliOCoqkKVNTjyGZZhx1azZKW0FRJte0dFwxgpLPIz1RClHOLMtqAKBcjwr7720tpAhTcmcuO8QjThZs02Tw5UKnVXksMKyBeZarbklVrgb1b9wjYZLCDAbIfQ6tRUoBzNlsLfBHNx5o2SbqrEvV+60qKJtlAS2tk+Eo398ecCw0jMw9RcX41qJlMOU9Xc7aiVTCzZtkEa5nDpz9OsXjRszw63iM3G97ITs4ZpTMgh5c2whxSvEvnNtxJ5rWvHScK7OG5iVbxDVWpei0BpsByeq4tnJG9tB8bmHDrML11DZ1ssSQypnGGJ0acor2jKKHMP6Qjy+SOdYr2kYjxfUO6q5UnXyNG2R4LbQ5kI3AR0eSG+557p4rFvyNqPf+Dq07tJwtg2Xcp+zSnJamCMi67PoCplwAa8mm3gJ5uyOVVLFdUn6submai/MTC3MxfWolaiSN5jUnZ5TnviTFDQdcfRvPhDd1wvFcnZHrYXwSMNZav3Onye1LFtEqUy1Tq5OS6FLCihK9CbDWx46CNroG3nG0hOtFVZ7qQD4bMylJbcBN1ZrC/PqI4tUZSYFWesFeNbWIbbW0oFxeWKRzdTtl4NTqx1R67ldp8hjfIimVaUw9XAA2iVqzKH5OYINwlDhF0E67/njWZysGg4iMvj3AEol5QVldl0BoO3NypChoq9+Hmjz9KT7STlzHje/G8d72XV2vVWkGmYiTKT+EU+C732uUtdDC/GzdA06Y6qd5bI56XheJwb/6fWPYyJfD2yjEjpRK9+qI+64AlJbEw2m/VYx0HDuwev0x3u1GKQiQWjlG2WweUdHNyTm64i7KymFqJSH5vZJLSVVrqLrEtOvBU0wgje2k+N1b44bXMeYqmK+69WZ6dE8hVlJeUpCm9d1tMv8Azvicsz1g7Hr0MThYv+pz9jtGPZXBDVVRIYhwhUJYobTlmmEJZWrT3wtYxrcrgHZvV0L7yGoTrhBvLtTSETA/u1AX8hMJ5TbZWpI9wVIsVqnlCQqSqSOVG7WyvGEPZCl7N9oD3K4fqTmFq2ojJJTDmZlSuGRzhrw3xWnVcV5kejR8bjTf9tWNQrOzbZu2txmbqeIKU8hWqZmVBKesb41KZ2S4Ym8wom0ajOq4NT7a5Y+lqI7FiGr4wwqn1v7QMPIr1LtlbemxZwDddt4a3640eo7NaHiyXXP7PauXH8uZdHnVBEwnnyHcsfPHXTnCoryR7dHGYfFRvCCv26nMqxsRxvJSyptilJqcqB7YpjqZlH/DqPKI55PUCclnVtvMOIWnRSVCxEdKE1ivBlaKGJmfps20qxCVKbUk9I0jYk7WW6q0mUx5humYga8UzDiAxNJHQ6m1z13jnq0KbI1IUJXjfK/c4hXpNSO5Lj8HG8WMIFtEHQR6Sr+B8FY0lJdeCK61Kz/IjLR6qoNuK6EO+Ko9do43iPCNYw5UnJCrU9+Ufb3tuoKTbnHOI8+vgnbNE4ZYOcI3WqNMKDbdFOluMNmqa9MKytoPXaGMnhRb04htxwHibRwqjJux59atCluxJS6e7Uqo1KsoUpS1W04CO+0HZ8zIU2XVMITkWATYXMKsKYeptPIcQ0lCwRdR3mOxys60xQkLLICRuvHuYDAxis0z4D8Q+MVJSUKOxr7si3TZaXMhL3IR4yxuhRWJ159seGDlNyBuh5XaoHUpsoJbym+WNJmppxxpZl0XTfeY9GTjHRHj4SE52nM1+pVdbE0UuXKTCCoO90OpcaQqwFyTG0OScs8n7IUnMddeEJpmUzP8myrwd0cUqUmfTYecI2NXm387gTci0bBQVKSgWvlMYc7R0pWFpULneIZU6al5WU5NIBUBrEYUmpXZ2VpqVO0RvUFSrco0XQLgmFnLpUhXJkWtoIxag45MyqFoJ1JjDl23G3QVuRWSd9iNKlZXuYs26tDxJBMYZf5S5sRYb4bz3J5L2EIZt4JSQDrHJVi1qejR8ysWm51bUySoki8XnpgKJWTpzQq5YctZXGJfJUbA6RxubOx0VuZhmSZK/vc0YT76ScwOvNF5ICabYg2zQsWDmJGov5olKTsPTpozW3A8nKpIjDmGClzQG0X5bRYO+GbkopxvPk4QFDMgyqZGa8WrxIQExnLYKXtU2ilUsTwhXTKcYx0qJkXfjCMVW+GqZU9xOacYxzLEXuIm4MaNVC8i0ReMxbFr6RaLVjuiWUqqiZY4QRcKNYlLZMCw2YqaH2M8OgRaAjOYZJl3uqKBLngIyQnERiW1gKdYze5zzRCpc77QbAVVGFbpgtGSproijkjzQLFFUJlwfZPiGLISTxjNlWjddvgxSmXUeEYXiK5iZemDLGf3KeaIMsRwjWNxEYGUwWI4RmKlyOEUcieaAMncty/3cacDFrhGdLtHlxpwPZFgtkcILD1Me0EXCnW1ogp5hACUQRXlNt8SEadMYwS+s2jrihf3RXXGRLNnutF+eLa0WdV1xgdS1ADeKiDfURIT0Rg2KIOEXMmtrQZOiNY1yGj7Mg9IgmPbK+uKkJs6nXiIH0/ZK+uDsBbliJv0RXlgCYAWUW1vBaL2TrieTg2NcsAHONOMXpv24qJyHMNDviqcQe61+SNYW+piwRVlIMTkvAGKIqGtoqyWG6J5M7wDGMVNi8yoZVcdL/TGdPhKZpq7azZsE2VaFxQQbkRn1FrJMMqcbNuTGl9SIZCtaoxOVYvcNu2t8OB1xC7cmlabc6rxJcYucssOi5i4lyXtYyvlCoUNzHCl+NmVfhru6YlTjijdS1eeMgdzFNjLqB5wqJzy6T7Wv1qjGuYpKyNSTpzxkzhvLS3xIgrYtpLf8UXptTPJy5U0FDk9BfdBuK3qLt8GXXWL3KMAn7HGvDNEZ2wPuIA36GAPe5ZsLXvE3AGsSd+6I38IKMHCHU796Mh8ouEu86w6nvvSkPjrgrqRqbx+YmEN28NVZ5pDrculaFICwoOJAAPPc6QpRvvDiluUwtuoqU3NtJOUJ5LwrjjcbuaMNJtbFCsO1NstpU23dxfJpAcBubE+bQxV62qvkSvudFjrq4Bppr1axnBFBWolE9UU5blJsfCULWI004xatR8zxcnaifDs3Y3OUgb+fW8GwiqMxHMP1VpouqYQEJIBVnBGth9MXylUthmdll5SpEyEEp3EjSBQonJoaVU6gE6ZyAcqdea3VDBtFCeoUwvPPFsuAlVrkmw4246nWAmLOWiv3NR48YmwtqYboYoS5kJDk2UFNtRY5r8NOa+nPGQzLYa5VLa3Z4pJspwb76WsLbzr80KkWdRIQAGC38TGxOSuHQ0l1pc4qzgCkrB8JN9SDbfYX8sXgxhlDBJROLWdQTmA1FtPLzwbCusjV7f82hzR7d7amTpdn64vOpw0AEIE47YmxtYrGuh6tPni7K9yGkTplGlp9gGe4Oqtb25+iDFai1J3iawd8QTbri6WnQvLyS7nW2U/82inkHVLslpWb4Nj5IW50XLcQYvdzTBAPIr1/RMQuXfSSktLBGhBSdDAsa67lm9zaHeF9K6D+rV2QoXLTDQClsOJBHFJENsNodTW/CbUPY1A6btI0XqJVtkYqe9sL+Me2LdtN8ZLknNl1Su5nbFW/IePki06w8woJeZW2TuC0kdsZlItWLdomCCAa9wjJp2tWYH6wdojGjJpo+3Ev8ontgrcWXKy7XPd+a+PC+GFc935n48L40twU+VBBEaxMAcIOI64IObrjBuOMQjw5L+zp7ITmHWIh7JJD/V09kJeMae5Kj/bRFri0BGkTBClUUwcYki0RxjBHj2mCJfpmD2GEJNzD5/7x5a/5Qewwhh5dCdPZgN8VRFomFKoN5uIkCAC4iYNrGswiobopioC8NuCwAa6b4eYc0qayfxKuyE6Uw6w4n7ZL+SV2Q0dyFZ+RirL4V4vZFi19LxltUyZXIongEBlb/cySVpCs2W/i7wLcTpGZMSyZVaqfyTJcbUA44lYc8IXuEqGhT9UPbUOa0bi5tpROkbJhjDMxX6u1JNOIl89/ZXUkpBsSBpxJFh0mMzCWFnsQVUSzTZKE2LhSQCATa9zujqs+KThuURSKQ4XWm0KKXlIsorIGYDTidPJpHTTo3PBx/iLgssdxezRaVhulSjYzMVVlxfdLYWq6SE2Jve178AOJizKztSrmJGKfSpN90qVkbYYQVLUm9wNOA80bJJbPZ2bpjeIsdVFGGqIPCD03cvzJOvsbe83G4205jGNM7XKVh0DD2y+mikyzhyPVV4Bc5MafCPijoEdsUobnzl6ld2h5pfYzzgTCmCB322oVLlJsnlGsPSCgp9V9Ryqh4g83XGo412wVevU40OjssUGgI0RTqf4CSP1ihqo/NHO6tV5iaqUw5MTDjzqnCVOOKKlE31JPPCrlFOK3xGdbWyPZwfhDk1Otq/sXnptSidTboiwlSlnTfwi+zKLdUAEk35o3rBWzDEWL+UmKdKoYpzF1TFUnFFqWYTbUlZ3noF/JvicKUpu59RhfD3LSKNPlZNarFQNr23R13CuyN4U1nEONag3hiikhSFzQvMzPEBprfr0+a2sZCMQ4D2cqDWDZdGJ8Qo0Ndn2/sdhX+rtcfjHzmNfVPYjxjiNM7UZicqc66rwSbrO/UJG4DoEehTpxjp1O3EVsL4dByqvU6U/JbHcRzKqPIOz+GKk0bS9SqCuWZmyd3Kgfcz1WHXHOsa7OcS4VnkorcmRLuasTrJ5SXeHAoWND1b42Go7PMWJeXOKoFRSzYHNyR5odYTxbVMG0l1iqvon6GvQ0edSHWnD0A+Lx3cYs4Se6OLB+O4LxDyXWnY5/R8LyVNlG61iRKuQX7XkQrK5MHp5kdPGIxDjqemCiWbdDKGk5G2WPBbYTzJH0x0moUvCG0Zx2o4KqfcOIFNn7QVV6yb8eQdNgehJ+aOFYgotWolYep1Vp8xJTbZOZl9BSodPT1jSGqVHCFqaPTrUpwp2p7GdI4lnZGdbm5aadamG1ZkPNrKVpPQRrHVJTapQsZSKKVtRpXdrgGVqvSSQ3OM9KwNHB/zaOBlC774vy7jiFgAnhHmqrJPU+Ux3htOtq9H3R2rF+zWsSMr648OTjeIqDlH2ZIjMtoW/pWxqk/8AOkalTaq5LOeyldhuKeB4RfpONK9hTELdRoVSek3i2nMEm6HBbctJ0UOGsb0mpbOtpPuq21g/EavwthN5CZUfho3tqP8AzeLwknqtDxY4mvhdKizR7rc2rA22GflZAUjELLdfop0XKzfhKaB3FCju6t3VD/EWzml12iuYy2XzrjrKDndkr5X5VW/dv+vheOIYhwjiTBE8lNVlVCXVqzPMKzsPDnSsaeQ6w8wjjyt4aqrc9SppUu6gW8EaLG8pWNxBh3dPNHQ6aeOfPQZsXryp1YlhRtpNMXPNpTkaqrSbTbA57+/T0GNIxfs0mpWmd/qDNIrFGX4k3Ki/J/ouJ3oVHbalQsO7W6YapR5dFOxGG+Ufpt/BmBa5caHG9z4PRHH5eaxPs9xG4unzC0WUUOtK8Jt0fAWk6KHRF1UjNZZI+iwXjdPErhYla9zl9ZZmpV+WNykhlJBEbRRNoj79ORQcYyYr9JSLIQ+r2aX6Wnd6T0aiOk13D2F9pMsl2hhij4hS0Cac4crMxfX2InxVfomOKVHD9TptXXTpuUdYmELyKQ4myknpgNTpO8NUeopVMLDNF3ibxObPZE0ddcwlOGp0xPhPNkBL8rfgtI3j9IaRrbMslE6EtIKSDqTpYRuuC5ap4dfaqchNKbdQmyiTobjVJHEGL+JpOl4gadnsOMNSlRSAqZkEHRXAqa6L6kebSOhUlNZktTwMVOljm+FzGPJTtKZk8hWkrTvIEWatiltqT5MP3bA0Skxqbbc0hCpdbZ5QcQNYwZ+VnRK3LJvwJELKrKKsfLPw2Cqed6ldQxFU51xgMn2NQIt5Y2OlsTCmA5MKsCN3CNbpVPqDiGDZKQL8OmN7kpdxEkEvKSTzRTDU3LWRPGuFNKMBJUKY6t1t5k+DfW0LpiWDa7g69EbjLyqn3FsrUUgJKt14pew0y8q/dZT+x/GPocN4XOtDNFaHBHGxhpNnNJtpxDxcJWRfQRaallrSVJFiTHRXsHMvWvPH91/GKEYKQk+DPkD5L+MNLwKre7R1Lxigla5puRLEklCk3MLHUKJzgGOjuYLS4kA1C3W1/GMV3Z+tafAqSP2myPnhJ+CVbaINPxjDp6yObvFbnggWhZMy5JN46LM4EqzKSprkpj5NVj5jGrz9JmpZ0tzDDjahvChYx5WK8LqQXmievhvEKVR+SRpz7NlXtujFKljQ3jYZqUy7wYUPMkKPgx89Xwsos9ulXUlYtJd+wChV/GiwUgq0vGRydpQ3T76Jal1E7o5FBt2K5lFXKWUkKFo2Bl0qlslow5aSzEXEbLSMPz1RmUS0hKOzDqveNpuY7qGGk+h5mMxVOKu2Ie41OKzEXv0RkJpxI1SfNHZKLsYqT7aXKrOMSYO9tI5VQ82g85jc5LY1hpKQZibnnj0FKLx6UPCajV7Hy2L/ABVhaLy57/I8296z3OoZTqeaMZVKVqch80esm9j2DVIy8lO68eX/AIRiTmwfD8wg9w1Sbl18OUQlxPzWMJU8Kmuhx0/xphb2cn9Dyc9TVC/gwvdkilVrWj0PiPYdiamtKfkG2qqwNSZc2cA+IdfNeOU1CiOyz62n2FtrRopC05SnrEeXXwcobo+kwPjdLEK9OVzQ1y5BOkVNsG4h4/I5VaJihmUPKeLHC6Vme4sVdXRYlZQqYc01sIy26Yo20Pmjq2ynZOdoDVS+2zch3IEHwmS5mzX5iLWtHUWfUxkEAYsa6+4z/mjqhg5yV0j5zG/iTDYeo6c56o8vilK+CYtuUlVtEHzR6zb9TED/AO9rP+CP+aId9S8SPBxcx/glf54Dwkuxyx/FWGb5zyA9TlpvcW8kYhlTuy/NHY9omzaewPil2jza0voKEuszKEFKXkHiAd1jcEc4jQnKaUuHwY5alFxZ9FhfEY1YZ4vQSyUmolfg+9jKZpajuSfNG7YHwp65MZU6giYTLKnphMuH1IzBu/G3GPQjHqT3Eb8aS5/7Cr/PBhQb1RDF+L0sPLLNnk8UlVgMp80UqpBv4hHkj18PUqkJuMYS9/7Cf88Wl+pUdUdMYS/+BV/nh/h2cq8do+o8fOU0geKfNGKacfgnzR6vxL6mN6hYVqVa9dMu+JKXXMFoSakleUXtfMbRzDCmybFuOFzScK0J2omVy8sEOIQUZr28Yi+4xKpScVdnr4HxGGJXkdzkDFPVy/incYw3pBSQTlJj0kPUzbXkuZvWLNbiNH2P88a7iXYBtOw5h6ardYwfMycjLIzvPKdaORPE2CyTEbJ7M9J1MrvLRHA3JYgmLHJEK3Rs81T1IUQUwvVKWVbLrAyvYtnVhYiXN9xMZCZRR96fNDWXkVKNwOF93zx1il+p02u1WkS1SkcDTrstMtJeZc5VoZkKAIOq76gg+WHULbkp1VF2OMsSZ7oQSk7/AKIw3pdSXVeDxMegU+pq2ytrBVgKcATqSX2eb48cirFGmadVJiRm2C1My7qmnWzvSsGxEHJ1QsaycsvU1NTZCrWMVJaUTqDaGS5U5tRF+Xk8xtY66dUKo30LuYvRKqIuAYu9xrtoDHU8IbGNoWN6KqrYVwtM1KSS8WFPNuNpSFgAlPhKBNriNmHqaNsl7HAc5+/Z/wA8NkV7NnO8QmcD7lUl5BtxHbGPMtkTC/B4x3aoepz2tSEuZqbwXMsMt6qWt9kAW1JJz80chqcgtmbdSoC6VkHW+t7RnBpXNSxMJyyp6iFLZi8hkn/9Rkoljn3eaGEtJ3O69tdBcwkYt7FpSsrswESalEeDF8U9dr2jtVF9TttWq1Il6nJ4Ofcln2w62szDKcySAQbFVxoYcH1Mu14eCMGPHh7aY/zxbhe5y/FRb0PPSpJQIOU74sTzBTNr05o79P8Aqb9rUnLKfmMGuttptmWZlnS/7ccdqtOWxU3mHmyhxtRQtKuBBsR54EqTSzdBqWJhOeVPU1YtG+kVpZJhiZT2Q6Q9w3hOq4mr0tRaJJKm5+aVkZYSUgrIBJF1EDcDxicYt7HVKpGKuaymVJG4xV3Iq18pjuaPU07ZgLnAE9z/AHZn/PF0epq2yXIVgGeHTyzP+eDlRD4iNrnAlyygPFMZVSaPdDZUL+xjcbxuuKsD13CtYVS6/TXJGbSnMWlqSqwuRvSSN4PHhGv1WSIfRlDZ8AdEGUHHcNOtGpaUXoIkFjNcSo9KK0olzcCUt+1Ge3JKBupLNiLWKvqjMl5FK125Fq4VznX+EIl0K5hUiXQoghgWG8X3xUZMZLhjeec6R2PCew3aBi+iJq2HsJvzkksjI8HG0BQPNmULjyQ8PqZtrx0GA5m1/wAe1/nhnC2jJRxEHszz29LWObuewF7jNFuoN+xSwCbAI3XjtGLdhu0PB2HXa5iPCyqfItWzvOPtG11BIAAWSSSRHLqm2lKWsrSTZB05tYDjpceNWM35ehq5TFPCM5ZQlRzMNq16YtF9q1u5G/OYmVuYsFoyFOsFJysJSbb73i0op0yJt0GMa5RDue+9Cn/HVCU2tDqet60ZDX36oaOzJ1N4/MSg2jNpXL99mlS6mg4m6gXvFAAJJPkBjBiATa9jAKWN4U7iMoeaCafkDa/FsLJIFyOa4IjG5DEK0s5O4AmUHgrBAAKQBqeO7X5oWSneJUq2ZtmoBzICvkhos2148/mjICMPBtCG5aonlCm6iN3hG9tdTYjzQ1myG3QZrOIO5VOJ7h8JxIS6g6qCrJFhzAkGMuoLqNForofEkp5ORQ5EBSACBfy3Gsa+yqj9xMJmpWbKwbrU0N++539XVDNYp4we4tErNoaU8nxzv3fNaGj1IVel+4lTiWpJVcFo2JOqANTvPXFCMQ1FCyUFkArLgTyYygnebRmFeH0rTy9OnEBSdbC1tSdBxuLCMdSqUqXfWKfMNtqWoNOBN8gJGW5vvABhLnSkn0BrEtRaDgQmXs4orVdviTc280VnFdVKrqLBTly5OTsLbt0YbnetyTWWmppqYQE3QRdJNxfqBFzr0RdLlCMwVCTnOSyEAX1CuB6rfXAuM4R7FZxLPd18vll84TlT4Ngjws2gvzwwo9amm6bOLW207yKAUBQ0B11Nju1ML5dVC7mYbXT552ZUAF2OhJ08EcdbQ+pRw+mk1JC6dPXyAHMkg9PHQ3ueqGg9SVayjsawqvT4qSZ5S0rfSfBWpF7Dmtutv88VpxLUEvOPJLIW5YKVkHAWt1Qzc9bikPFFInQo68RkFtCDfS5338ka3NhhM653L9xv4OhGnNrCaotBqa1QyfxTVH0IQtTQbTeyEosnUEa69MVIxZU0JSlAYCAAMpbB3C1yTqYSEX1g8nzwMzHyR7DOfxBUalL8jNrbWm4XcJtYjjoYb0PEVVmatkccbyBpQyhAtpb6t8aprc6w7wuL1q/6pfZBjqxKqSg9C5MYsqzqDLOFlTQVfJkAvY9HVC2cqD0820H0pKm72cF8yr8DGK9cTK9eJimA9x4xSWgQQXiDvgDJAYyqYT33l/lE9sYflMZlM91pb5QdsFbgkvKy7W/d6Z+OYXwwrXu5M/HhfGluLT5UEER0xO6FY4QDfBEjh1xluYc4i+6SX9mT2Ql4w6xJo9JD/Vkwlgy3J0f7aJ8kRe0EQd8KVQGIggg2CPH/ALx5X5c9hhEN8PZjTA8p8uewwiEGXQSlsyYIIIUqZPcE7fWTe9AxPcM6PwR70DF/v5VL6zjsT37qf5WvzCLeUl/V7GOJGcP4I96Bi8mSmgn2q/6BjJarVUV+Fm3UIvd+qoE3E2fMIpGMbXFbqdjD7imifaz3oGH2G6dNCpk9zu/c1b0ERgN1mqrXczJ9EfVG2YYqM69OlD7xUnk1EDKN/mikIJs4cXVnGL0NcdpLzDuQozG17oBI6oZUehT9SqDcnJyjjjq7kIAtcAXPk0jZ6DTsTYlraKbR5N6emnFWDTDWY2vvNtw6TpHcqXhfDWzinqmMYTzdWragL0mRUAhogXs67w5iB88dUKCb1PBxni8qayxV5dhPhDA085Qm6fhst5EpU5OVd6zLbQIFwtziBrYAmLdTxhgfAK1et1lOKMQjRVXnW7yzBH4lv33QT/CNTx7tXxJXQintPsSNLR9zpskjIyi3RxPSfNHMZnEFQKjZ5N78ECKTqKGiOLDeHVsVLPW27DfFWMcQYpqS6hWZ6bnXjcBThJCRzJG4DqtGsSi3TWmCUrHhfBPTF4Vqpq05RBHE5BGfTpmfm6gyxlDhWoJCEN3UegW4xz61JH0+GwMoRywiJHWlrnnTYm6zw6YfYcwzVcRVhqmUanTE9NuWsywgqPWeAHSbCOpUnZz3kp6a9tQq7WHKevwmZBtsLn5voS3vSOk6xjV3bA7IU5yh7P6YzhilK0WWrLm5npdc3i/MPPHTCgoeaZ9BRwipRUq2nsNGsIYC2ZsCYx7MN4hrqRmTh+nuXZaVw5d0b/ij541LGG07EeMwiTmnUSdKZ0l6VIo5KWZHAZR4x6TeNNexBUXnCpa0kqNzdMZEpUJ5xe5FucpEGVdbROfF+J1IRcaSsjMp0mZmZSVjf0R7E2Z4Ip+FcISsyllCqlNtJdfeI1AOoQOYAWvbeb3jzFh3vnO1FmVlWFPvOGyGWmsylHoAj2XTVPd5JQTDRafDKEONkglCgkApNuI5o78HZ6n4f/8AIHilecFTjLR7mSklJ006o4ht2wiw3JS+KJNpLZUvkJlKdAVHVK+a53GO3XtGibXm593ZupElJvPpD6VvLbRnDSUg6m3DWO2tpFnw/wCGsfWw+Pg6T0e+p5BmFlp67eYKBvppY9B5+mOhUPaQir05vD+0OloxLTUjI1MueBOSo523d5A5leeNQn35sOHIlAF/ggwSKp8WmHnGZdoEXcWgcejjHjxqtPXY/o/BeM1acdNTdqpsfZqlLcruzqpeuCmoGZ2WyhE7LDmW1vUBzp8wjXKLsvxPXCpdMpD7iEGylrHJpGvEqtuh3R8fymFZpM9Ry49UW/EnM3JhBvfQDf5Y3iQ2wyeMZM03Fzz9HnXLpbrNMGUE7wHmRoR+kNYfySZevVljo2o+WfvsIXdh9Tuh+rYjotNSGxcKdU6bX1PgD6Y1yr4RpWG5tHIYlRVQpCgpUrLrTyZ6c+hBjZ8VSG0LD7Kam3WXanSHgOSqUi5yjKhv1+Af0TGuN4/xhKu5nJtuZQFCyJhlC0q6NRAnBRPlquA8VozfE1ROFtoVewyhVO9hqdIcNnaXPp5RlQ6AblB6o29GF8I42aMzgSbFLqZGZdCn1gBZ48i4dD0A/NujWkbQqdPPp7+YNo00nW5ZaLCz5RGxS8xsxnWgGRUqLMiykqNn2wo793hDrjQ33PLxUa1N5403F+2xaoaK1hjEiGJtiZps+w4FJKiULaI43PD5jHX8Q0SV2j4ZenUMtM4jlmeVmWEpy91IA+6oHA84EIZKrzC5FFPr7LOLKOgZWp6WV9kMD9FfjDqV54bsyVTbqktiTCNWVV2pQg8iRlmWAPeqRvItpcb4rOn1W5LD+KK+WqrM4RiOlzdOnmZiWcdbUhA8LVJBHzgxtFErFMxzKopOKnUtVdoBErVVJF1WGiXecdO+Or45oLGJMNs4oobDSEuoyzUsQCWXuII4XN/PHn1+cmKbWBykq0g7icnTrFaVW259RgPGZxXD3Rk4xl63hphUi+hbKlHS25Q5weIMaNS6hUGas3NNrWh1BzBQO4x18YplcRUxFJrSU8mkfY0yTcy55iN6kxp05JT1Jqapd6SaOU3Cgm4UDuIPER0zg7cSL0PQy0oQ4tFaMctyTFfpy6nKBLdQbTeYaAsF/ppHaIQzjUx3OpcwM3BIAjYKJNTjUw243KBBBGoHDm6o3GtUqSmaI1PsSraSo2daQPEP1RZQVRXPFxlWMnnW5zunMgS7K1ItpewHTGbMpUXAUXAvGe60GGELDQQgDjCWcn1qsEEAAx10opKx4VS85XGUmgpmCTqclvnEbJh6jIrM+5LqeLQSjPmCb8Y1GkzCnZwoUq/gE/OI6FgW4rL9z/Q/SI+soTlTwN4Ox8t47OVGEmtxh6wWvzkv93/GKhgJn84r/dj643D3sSBHl/G1/Ufn78XxNuY1AYBYP9Yr/d/xiF4AFvY6gCf0m7fTG5iKwOeEeOrL9Qq8WxPqOdTOCqqwglkNTAtuQbHzGNbn6ShxK5WpSQUOKHka+Q8PJHatIxp2nSdRY5KaZS4DxO8dRi9PxKW1VXR3YT8Q1KcvOeWcTYCUy0udpN3GhcqYOqkjo5xHNJqTIJBTu549ZV7Dz1KXyqCpcsT4LgHinmMchxvhJKmnKxT2QCNX2kjd+kOjnEcniHh1OvDi0dj9T/D34jVZKM2ceEuORtb30ZcrJhRFk8YzSyUg+xgaxs+DsPPYgrzcmlAS0PDdWB4iRx+gR8zTwWaaikfWYnGqnBzlshhgjAEziJ8PuFTEi2rw3raqPMkcT07hHfKFRKbRZJMnTJRLKeJSLqX0qPExNKkGZeXYp9OlwltIyNtp/wCePGOh0eitSDSXHLOTFtVW0T0D649/h08HG1vMfkHj/wCIqmIm4p2j0QskcPzcwApwBlP6e/zQ9l8NSaAC448s9dhDJsWOsZLZ4b48+tipy6nycakqj1MRFCkeAWP2ou94GSkcm84nr1EZ7YB3XjLQNNI4p159z0aOHjLmRrz9KmJdJVlzpHvk7/NGlYw2fUDGUmpNQlwzOWs3ONCy0ngD8IdB8kddSkEWIjDnKQ28C60AlfEcDAWJUvLUO6lQrYeSq4aVmjwVjTAFVwlWzI1FoFBuWn0aodTzg9o4RrTNNKXdU9Ee58V4Sp2KsPPUiothKtS29bVhfBY+kcRHlGr4em6FiKZpM/L5JiXXkUOBHAjoIsR1xyVqCvdbH33g/jrxdPLU5luda9TXJBtqv2Ta/Idqo9H0ujidQs8pkym268cG9Ty0EN13KLAhjX0o9I4cFm3rfC+iErVJU6WjPIeGhivFHxVdFKMNkH7ufNBM0JbMupxK+UsL2tvjZEp8GKyjMki0eX8XNPc+nXgGFcHFQPPe2rBIxNgF2dlWg5UKYFTDVhq43b2RHmFx0iPHsxIXcJj6QT8ipibKQm6VajT5o8ibV8BetfHThlGAmmT15iW00Tc+Gi/6JPmI5o6ajVRKSObwqU8LOVCf7Gn7JJLJtew4q39YN/THuuSlS+6lu+XNzax4/wBlkiEbUsPq5MD7ORwj2pSmQJ1sW3RKU3CDsdVeh8TjIJ6oupoC/wAcfRgXQS20pfLEkC/ixsgRpFqZFpVz4pjzliZt7n08vBMNGDeU5niykmq4MqlMS82yqbllsB1y+VBV4OY24C8J9iuxmvbN8Rz1QnqrT5yVnGEtlEuFBQKTcHVIHEw2xy85L7Oq2+ySlxqScWkjnAuOyN02dV5vEezym1RDocLjCcxBv4VtY6MZKXDTWxw/hyEOPKm17o2iwCfIYQYxw6zijB1Qob2XJNNKaOYXABG+NgN9fqilQBjyYScWmj7avTVSLg1ofLXarsxqWzfErdHqU5LTi3G1LQ7LpUlNkqy65hv3bo5qZazhuBpHtT1WuHlt1ik1pppOilslRGbxhxB03oEeWHnXmns62ZdQBUSlTCDqRY8I9pxU0mup8/ha7ySjPeLaN82N7BK1tRkXKnJVKRkpNiZDLiZlK8y0gAqKSkEblW1j6JykkxIUxiSl0hLbDSW0J6BYAeYRyr1N+G1UDYhTFutJQ/NAzC7Jy6rOY6eWOuEg62Tw3jpjlxM/NlXQrg3xIOpIxnUBWcZLg3vcdNo8J+qB2E1fDtcrON2KjIKpsy4qYTK2Xyo11G63Tv5494EJJPgo836XVGg7W8Pt1/ZpPyqm0rISSL9Nx9PzQ+En5sr2ZzeJqVKPGp7o+XK2Bytjbz7o23Z9gqaxvjWTw9IzLMs9M3PLPBRSm3QkExM7Lz7SnZF/IC2tSVp5NIsR4O+3RHdvUq4aNU2jTVammWVJp7aUtqCBcKVc3uBzCOtUssm30DicW+ApQ3dj1LsfwB/Jtsuk8MPzLMxNNuLefeaBCXFrWTcA62sE7+aN2NuURuv4N9RwuYrBUN+g8uml/piMyhbSyhpqDvy9UeY5XdzshHypM55tawlXcYbOJmgUKflZFcw2EOuTGbKGybqtlBJJAt5THzmx/g97B2LH6NNz0tOPNfdCwlSQkkXy2UBrbm0j6X7Sq2ujbPKhNInWZRaWtFug6C2ttI+b+KKxNz9UmpyZdl3Xphwu8olIUTc665ea0ejRTdDzHlUZOOOcab0tqaGwwlS9ACOuO17I9hVf2gTDFSQ7KydLbmktvmYKkrWgEFWTSx0Nt8cxl2nFN3TNISFCykiwN7dUex/U+7IWpejyWI3MVVVDy20rMlJziQhNxmsct720g0oqMXJl/Ea0kowhu2ej5GSap9NakmEpCGmylKeoC0Za1JSFLypN8xtboB+iBhS2ghpHKKSkIAURcnQ7zxMXA49ZKlb7JUbjyGOGUne5SnFRjYXVWVFQpcxIlI9lSpAuNL7wfn+aPAW3PZg7hfFc1WlzTK2Z98lLDCVeAspvqoi1iQY+hqXCLBaxom6jpvBtaPPe3zZgissPVNitPFxSswkHlI5K9lW32Op0vwjtwc1JSpy6nmYxPD14YmLtrZ/I8IzFOTyhVLlwpsCErTZRNt3n+aO9bKPU+4vrExS8VYcxfhtt6Xcam2m1OOZ02soXAR0FJ8scwqUi8nlm26Y0C2onMylR1UrnFwbWI8kdF2N4yZwbjNhc/OVKRlVrIc5FQS2gXSQbEEkam46YrTp2bj1O7HVqjpxqQ1XU+gEoytuRQh/IXQnKbbiSL6X83ki8EAqVYDwtQetP8IwqNWaZWqe3OUyfZm2VJSeVQQq43X0hknKCAQnS3vekiPKlmTae51UclSClDU86eqA2IzWL5tnEdKnJCXca0WmYCvCCgNBlB4gHymPE2JKeiSqi5d1oZ28yVakag2O/W14+rdVpzdSob8o6hKwtFrEaXtpHgrbFhWYw/jx6YeoSeRmFcoGkueCTrmBG8XuDpHbTfFpPujzoTeExiovklt8zgUszLqeIdbCBbRRUSI6fsu2SVDabWnadRZqXkQwgEzEypZGY8AALg2udYTtCakz4VKYAPgC7WuUWuDz6c8e3/Uy4Ymqds4bnqlTGZeYmvZuVDIQog6AWtuAtE08sXNno4qpKUoUae8v9jp2DcKymD8FSGH5RICJRlLdwN9k2vGwcmm/ijj2CMjktToPN0RWWtTa3Hh0R58qjk7s9GlhlCNkjiG33ZjiHaThdmlUurU+nSyFocfVN58pCbkCyQeJTr+jHzu2h4fbwtit6hprElVu5rtKmpQLS2pQ3gZgDobi9rGPpH6oHGDmFNm0yJYtd0TPsDef4StBoNefzR85MRKS9UeUelmuUIUVZGybm+p8LqjvhrRTZ5dBuOLnGK0X+5zl9Q4ADqjEJubXh/MuyyFKzMsjXdyfbC5c8wkKSmRlzc78v8IjY9fM+wuULHQ3inXiIZmrM2FqZKixv4v8ACI76s5lKNNljc3Atu+aNZGu+wtv0Q8nfCwpTx+kqMZNVZv7my3mhy/UGmaDKvmSYWlZUAgjRMMktdSNWUrx0NWyHmioJ1sRDf1wMD+qZT0YzJSrMvXLlEbyltZbLbROZQG7qvBSj3C5zX6S7TU1hynNNytQkWmygWQ4QFJCSd/z6cbxW4K8SFd8qdlaQFgIUkZUp1Gnk3Qtdq6k2UaPLoF+KND80WTXkn+rJT0Y2hNKd75Sp+tzsjVFttraUWStCVclYWUcxsOGphqcST81hJxxwtZkvJTogDy/PCNytBRzGmytzqSU74YsVNHrYdmO4mBldCeTy6dcaL3VxqsLpPJ17mJ65KpyqHCtslACQC2CLdPmiHcRT7zbjawwULBSUBsZbHhECvgC3eyU0/Qg7/i3uZJ+hAtHuPll6Sy3Wp5laltrSCtKUqJSCVZd1779/ZFTVeqLLS20ONhK1FRugEm5ueoRWa8D/AFdJ+hEeuC49z5T0IFo9w2l6C4cS1RSwsKYSoKzA8mNOgdGphjTcQ1cUyoEPtj2Ie8B3aQqTX7Kv3vlPQhlIVYzFOnne45dHJtg2SnxtYMVHuSqKVuQXrxPU3mFszCm3W12CgRYlPEacISqJJJy2vwhv64F/m+U9CI9cDn5BKehCtLuXi5LaP3E9lfBMT4XMYceuF2/tKU9CD1wu8JOV/dwLR7mzT9P3E4SeaHmGUlNYUSP6FfZFHrjfH4JK+hDGjVp6eqBZXLsIAQpQKEWOkNFK+4lV1HF+X7msPX7pXod5iiyrbjDpeIphLhAlZbQ8W4j1yTX5NLfu4DSuUTqWXl+4mseYxGVXMYc+uOat7Wlv3cAxLNfk8t+7jWQb1PSJwlR96Yy6YlQq8toQOUT2xm+uSc/Ey4/uxF+Tr00/UGWltMWWsJNmxGSVxZSqWflF9aQrv7M2BPhxgFC7eKY2OpV+blqo8whDJShVgVNgmMP1zT3wGP3YjStdmpueVaCjKbbiYMqvgnzQ29cs/bxWP3Yg9ctQ/VDqbEL5Q3qdvuKsi/gq80SG16HIrfzQzOJKlztfuxEDEVR4rb3/AIsRllub+p2X1L2IULW9KZUk2l03sOiE/Iu/i1eaNkrVYnZN2XSytIC2g4QUA6mFhxFVPxzfoCGnluToupkWgu5F38WrzQcg+Toys9STDD1xVX8cj0BEeuGq2+7J9AQnlK/1OyMDuWY4S7nomJ7kmvyZ30TGb64apxfSP2E/VB64qr+Uj0B9UHyh8/YzZhh/1lyjYaXmDxJTY3G+EncU5+SvegY2R6rz7eFpecRMEOqcKSoAbteEKPXFV/yo+iPqgysJSdSzsjD7jnPyV70DFXcM5+SvegYyvXFV/wAqPoj6oPXBVvys+iIXylP6nZC4C+sSN8FtL7oqbTmcA54K1dipmMNpDAJGpiSBnyiL48FBvrYRZaupd7eSOpqysCeiGUhJqezKCbhAuY7ng3ZSmnU1vEuOagKLS3UXZlgM03NC1/AQdwtrc/xjkdHl8k01cpUDZWhj0HtZW8rak0ykLWE0VnKL7vY9eoR24amrXZ8Z41iajqqhB2vcxU7RxLS7mH8A0pOHaNoJiZaIVNPjncd4X5hujRsR4jLjRQ2MrbYtbNfMecnnPGFTQ5JsIS4bq8NzKo2NtwtGuVOaXNzBQgWbBNuMNOb6HRgfDINrLqzGemXXXFKBFzrpGGiXW6b204kxsmFcGYhxfWBIUCmPTjo1WU6NtDnWs6JHXHTWafs42ZDNUgxjfE7VvsVokU6UV+mr+lIPDXyb4EMO5ayPtMJ4ZpeWiRpuEdlOIMRU9VamixRKAz4T1XqfsbQHHIDqs9WnTG0y2NMHYCmEU7ZpTTP1NXgO4nqrYWvdYmXaOiB+kfnjVcXY5xPjmopXW6gXkI0Yk2k8mwwOAQ2NB16mNayKbqLSAfCB8I9MPmVPlOirXp0I2pLXuVVyvVGpV6ZnahPTE7NOLOeYeWVLIHC/AcwGghTmW4rnv5ovqlFuzrgtvWdY3DB+zrEWLHyaZJBMq2fZp2YPJsM8+ZZ08m+OWdRyep4GM8ThBZpyNXlJBbhBI0MdYwtspm1UtNexXONYbouiu6JsWee6Gm95J6R54ZS1UwLs5QU4fl2sUYhRoqqTSfsSWVx5NHviDxMazUqvibGdXVNT0xNVGZVoCrVKehKRoB1QYU5T2R8hjPEa1e7Tyx7s3SY2j0XDUiukbN6WaehQyu1eZsucfHOD7wdEW8H7U6vhyaWjle7WHl5nWX1FVyd5Ct4PTGuy2zDGM880nuENKdQXEcsvLmtw6+gxed2bVmlFTlSqNOlQ1kV4btyrNwAGunVHoUIzh0PCrUMBiIOnKSlf9zrVQ27yzDS25ah/ZAFvZHroB8gv88c7c2s4nbxMqtMVVxmYVoUJtyZTwSUHQiFj+z+oz8hMVGWxFQysOttIlVTQStecXBF9AOFzp5o0eo0KvSD4S8wl1JXyaVMLCwtWcosOkqSQBxtfcRDVq02rMbwv8N4GGtJanYzV9nuPG8lSlZfCtdXr3W0m8i+s/jEf0fXujnGOsG4ow3PJVVpNXcy9WJtg8ow6P0VjTyGxjT01B5ISCeNuv643nB+0yt4el1U1ZaqNJd0dpc+OUZWONhvQekR502z2o4Gtg3nparsc7cQ825rfqvuhvSKghhWR+4F73A1Olt8dUfwfgraA2ZjAk2ij1cjMqgVBfgqP6hzcfimOYVnDdVoVYcp9UkZiTmmz4TLycqh9Y6RCQnlZ6eG8ThVWWXlfZ7nT8JYmq+H31OUeavLLZCn5R3w2XhbXOg6HdvjZF0LBOOEE0tTOF645qJV1V5F5X6Ct6CeY6RxWUnJqRnQhCl5FthKkAkXHN1Ruso/kkmplw2DpJB0ObLoRbr549OnXU1qerR8RcVlqaou17A0/h+aXTq3TXpaY94sjwV34pVuI6o1l+mzco4Q3dSQNFAx1qiY+mWqYmi1uUZrVK1T3JN6lscC2vek/NGNVMHUnEUsuawDOqfUAXF0ibOWZRpryZ3OD54ZwUthpYeniFnoP9jSsOYhqFFqrU5T5pyXfbGQqSbHp36G/MY63h3FVGxPU21PTIw/XAbMz8t4DLyuZY4EnyRwWaUZWfclJ5lxh8KstDoKVIPMR9cZNHn3ETCF8s2QkjXNrrugRk4uzPlfE/BlO7atI9eSlYfos0ZLG8g22JtGQVGVSC2/pYKWN1xpqI5jtHwOac43UmUtPybySW32tUrF9NeB1jOw3tCz06XoleYRUaWpI8Feq2ulJ3x0Or4cl6nsnRL4dmVTLCHVuNlR1TfXKrshs1ndnzNGVXD1F7HlXkG5V8kkgpNhrG50KZkqvTkUqfWkLbH2M6reg/BJ+CY1yuU1xqaUkkpUFWVm08kYcrNGWmEtNrGYdMdmGrZXlZ9dh8U0rrZm+IY7ieLbyci0GxTzQ1bqTDbGVak5CLKHOI1xypO1GRQohSpllPjH36B9IhLOTjy0KAJEejGSWqOTEYfz54vQa4kdliEoadBSU6WOhjns3MqbUoBwAX4w1nlqcp6OUcIUAbXPTGmzU1nmMq1XN+MaU1crDC2Vzb8LOrerTgWf6A9ojrOBR9uXz+p+kRyLBy81XcUm2jB/7wjr+BR9un+lr6RH1VN/9A7HwX4qVlNexv48WLE6+qWpkxMoAzNtlQvqNBGQRGFV9MPzvyKuyPGjq0j8woQvUin3NO9etVudJcX5m4ypbHM2k2mJZlYv7y6TGiVB9ctTJiYbIC22ypNxeNQl8bTjSwJlDTqONhkPnEe7Ww+FgkpI++o+ARxNNyjE9H0rENPqpCGlcm9+Kc3+TnhuLW3xwukVZqfYRNyTqgQeooP0R13DdXNWpAU792b8Bzp5jHl4vCcJZ4O8T5bxbwd4Vtx2XQaPsNTMsth5OZCxlUDxjmNXpBp1SdlFpDjR1TfULQY6mkEC8IcVyKXqWicSBnYUAT+if4xLB1sk8r2ZDwnEyoVcqPL2J8PJpFedYQD3Os8o2SPen6t0dQ2e0NFKwuh9bYExN+yKPEJ96Oq1z5YxcYUYVBEgtCBnD6WfIr+IPnjepOVBcZlGRZN0toA5tw7Iv8MqdSUuh+heJ+Kyng4pPV7m4YVpgblu+DqfZF6NnmA3mNpSTeLcuyhiVbZTYJQkJAEXkjXWPBrVXUk5M/N60nOeZl9CkhBUo6DeTuHXC5+upQsolEJVbTlFbvJGDXJ9SViTbVYAZnCOPRGg4sxzI4TlUNlAmJ5xN22SqyUp4KUebo42hoUFlz1NjvweCq4iShTWp0hutT6lXzoHRkhzIVharCYSLXtmRHl5O17E65guNvyiEX+5pYSR5zrHT8B7SGcSTAptQablp4j2NSD4DvRY7j0cYhUjSloketW8GxmEjxNzujCkOoCkEEGMlKQU7o1qjTikTIYVohe653GNpTqOiPGxEHTlY9Pw+rGvDN1FFVkRYTLYsffW49McT214VamqVLYnl2xy8qoMzFvfNHxVH4p7Y9BOth1ko5xaNRq9JbqlFnaTMJBRMNKZN+BINj57RWjUzRys1RPC4mNWGzOVbAklJrotvDJ/70ei8Op8F7T330RwHYbJuSs1X5d4EONqabUOYgqB+cR6Ew8iyHvjfRHLjJeRo93w5Z/EFJbD1CfBi8lJI0gQm4i6kpBy3F48KUj9GpU1pcw56RExLGwGYaiObbQ8Gpxdgt+RShInmCXpRR0ssDxb8xGnmjrdtN2+EVTly1MFaR4Ku2K4etZ5Wef4tgUkq8N0eRtnkoWNqFCQpBQpM8kFJFiki9wR1x66potOt9ccbreEBS9uFCrso0BKz86C4BuQ9Yk+kBfyGO1U1v7KbNovXl5WcPh8XOvBj8J0izNp+xXOoxlhOkWppI7mXf4JjyYvU+9q0rwZynaAgjZnXyNPsF0/8MK/U44jlZvCDmHVPJE3JrJ5Pd7GfFNocbRVBOyzEB3fa93/uxy71OGKKJT8QzlGnCzLz80scitSQC7p4ubn03R61SOai0fHeHf0cRGS2vY9VkXvaKSIrvdItxikgR4a00P0CXscW9UbRF1bZc+uXly+8wQ6lIFz4JuT5rx4kkKbKzmK5GWnFoblnJlCXFncEXFzzx7n23YQxXifDwRh2tCRbQCX2lOFCXE23aDWPP+wHDNKqO1yZksR09ExNSllMtLazpbWgm5Kr+DY2tvj3cM1wVK+x8bi3bEVIPTM1Y9f0KQl6fhuRk5YANNsoSkDmyxmWNhqeHGMgoTpcE9MWsqRpbmjys122e8qahFRRj+Fpv4cRzxjT8t3XSnmHASFtqGp54zcrZIuLbtIX1SWnH6W41JTAl3VJIDik5+HMYpTdpJnJio3pSVrnz42rYbfoG1CotzUuUtzKy+2b+MD41v2rx6L9S3J09rAM0/Kyym31OLU8ogakqygDnACe2OSbWsDY0o+J3Kliuc7opzr6+RmivPyaVKvlyjXgdLx6p2XStBa2XU52gSIlJR5vlEhDfJZ/07Hn1O/jHtYpqNNyWqZ89hP6vDoveO/7G6qKsihqfGiha1grO4+FzcB/GKlBPhXzalVtYszqHFSbqpVRS7lUQogkDdwjx4q7SPoasssXI4N6pjEq6Zgdynpk0zTkxZKAEknXS5tw38Y8S1N5Lli9T2pZBtZwMqGXoFz0GOwbbZnHhxotqv1KpOy+fNLp7mcHJ66C4SAb3O6OOvzXdiwmZqDzLd8tii4JBtewPMSY9mpHJBQR43hkL5q03zO40wrT6I/iiRaqk821JcoC+t1KmxlGp1137vLH0S2cN4LYwTLt4OXSlMpa8JclY3VbXUanUnfHj/YThLZpVcWKGKcQCZebKe5Zdxtculeove/j33AdBj27TaZJUymplaVTmJZjILBhAQDc34dEc+JsqaixoS4uKc1stBmpYDtidcw3DQWF4o5TxUhY1B1sbXte0WnFTGcnuVaiVE6H9GMdE7NImEhFKmD703IAGm/f0xxKOmh2yrJPVGap4lSr30va5503jSNoWzijY8pDrVSU+27lslxgJzgjwhYkHnjdErQcoIKNEnKdb6ERbBQUhF81yi978QUmHpzdNqSI4mjGtBxkfPbaHhlzBeKlyDU1UUyyBmbd5WylA3GXS1rHm540iRq6VTqDPzk0ENHNlUpTgBAFxl4A2tHoz1Q2FK5KVfvxJ1x9UqtCgZZQNkApClW338XXdHnduSLk26uZqJZSlYWhwhK0rGbIbqG7y826PRrO01JEfC6nHwzhUequme9djuP8AVbCspT6TP09qdAyLZypZccN9Dl6bjzx1tCkLV4KxcgHfzn+EeK/U20XCq69ys9V0d8ULu2A8keLcptcXPWOe0ez2mW0pFlKIHMOF44cZCKlmT1Y/hdWetFLSOnuZiLLRbha++PM23vZBiKrzqqxQpmfnQNTKreuhFybkAkW0PzR6ZSkJSQCeIjRtp9QqjGG3GafSpuaLiSA5Lq8JFxa4ERwcpKplj1OnxaMFRVV80XpY8LSeGpmlYwYkcQ06clWw77OnkVOrKb+FZI11KbeWPoZguakJjCUoqnIdQyG0gB1pTR3X8VW6PP2xbA0rPYwn8TYhmppdQbcLaZeca5NQVe5XrvzWGoHlj04yhLaAlIsOiHxslBZHubwyTr1eMnolYvjfv54qUSEKtYXvqeqLd9b23RoW0bFlSodBmRTqdUHXclkuyqAognTS8cdGjKtJRievjMdDC0nUmcK9Uth7F0+21MzmI5RyQC7s0/lgwQq9sw0ubA8+kePsT0h2VqAQ60wpICgF91coPPG/wCNahiytVR6pVqbq78xmJQJlsHKlR3W6AI5niQzKJhK1l/NmWCpbQ1+v6I9GorJR7HmYOKXmT3NNn1NNKCTLINiRoq+ohQ8pK1HKgIHMIzZgZ1rDjgRY6ZhGOWEZrd0N9cczPVTsYh14REXXEpS5ZKwoc4i1AHuEOp371JD46oS6WhzOn+akh8ZUMupKpvH5illvlH0Nk2zKCb2va5hp3zqFJW5ISs1ZLK1JzJHja7/AKoUhRG424gwE+WFKNX3GNRrVQquUTj6lpFrJ4X11tz674XWO+K28t9YdVh/Cy6FSW6HJVZmopZPfJ2bdQpp1y97tJSLgdfDhxjGiktBCdTDdkfzLmNf6dPZCknWG7P3mTHy6eyMlqJU6fMTXIEU6kRPCIvbSFLEXPREi/RBaJjGuRrDuj37zVT5IdphNlJEO6QLUaqfJDtMGK1JVXoIiTeDXniSOJiLwCpOvPEEwXiI1gAd0OcMa1hQ/VL7ITQ5wzpWD8kvsgxWolV+Rip72wvrMUXMVve2F9Zi3AY62QXgggjWMEZdMNqtL/KJ7YxOEZVN91pf5RPbAW4JcrLlasa7M6e/jAsL2hhWfdyZ+PGBxjS3BTflRTBe0VRSRAKEXvE7lAXiN0SNSDGW5h1iTWZlP7OmEsOsSaTMp/Z0QkJhp7k6D8iI06YNOmCCFK5mB0EHGCCCkG48mPvHlB+uP0wjh5MfeRKfLHsMI4aROlswggghChdsLc0ZMm3deYjQRjwykUWbHOYvQjeY0SuZ8BrKkDUxXIy5WVkWGUZjcgaeXfFLiS5OAfB6LxnmSlGaSl92eIn+WLa5FTRSpoD3xJjrlC7uLKDmm10G9HSOWSQAdRu649AbVG3nNrjYZdDYVRWA4b2unJqI4ThOVTO1+VlleItwBRvbwd5+YR6B2roR/K2laUEoFHYsTuR4HGOuhyM+C8TlfGwXszh9ZmksJyNkoUq27mjYNneFaDWKdX8RYmVOOU6hSyJlyUlCErmSpVgkqPijT598abXHiqqrRmQpKDYFBuD0x0rZojPse2lgb+9bH/iGDQs5n33gFJJq/Ywa5tKq1VpfrfocqxhzD6b5aZThkC+l1zxln5uuJwrsqxVi+W7qp0gluUGgmHlBtvyX3+SE+CaB3+x5TaMrxJl9KFW+DvPzAiPbEjLMSckzKy7SWmGUhDaECwSBuj0qFHipuR9VhMN8XeU3ojzLP7EsTYdpUzPvSrU6EpuTKOZygc5BsY0Sk4XqVXxKxIU2RenZta/BaZRmUdN55h0mPcaXEhVrcNI49tWrMxg96Wo+E5WUorVRbL81MyiMr7yr2UM3vRu0HPwiWKwyS8iPG/EfhlSlRzYdXOeowXgnAN5zH08iqVbxkYfpq82X5Zzh1CNbxXjuu4qSKcgM0ykNnK1S5FPJsoA3BXwj1+aNSnZhaqg8QtZKlkqUdSTznnjsOxvZ3IV9TtXralhhlBBaW2bDdlKVcTv04Rw08NnlY/LPEox8PpvEYl5n2MDZ5sdqeKg1UKgDL04651bz1CPQFKwxhfBdIHc8kmYeaSTnKQVWHPDg1WRkqY0xLFDDCEhKAjTTqjlOMtotMpslNsSk2Xn0qUlPJrBIVcbxza749mlQjSjqfl+JxmO8YrWhy9gx5tNqmcSlLSmRAIyLKPCUVaZfnvHEcRPv1qfM3JMzi1lNnFvKKitQtc8NBqPNGJiTFNTr0+ErU1LMoSMpRxsSoEq3qVvTGuNNzzjoQXnFKUo2BUdwN7EcLxxVauZ2R+g+D+BxwlNSkvMVzbc27VnpdtpTrhc5NLSU3svQAec7osCoVWkVFD8o6/LzDRulQNyFqGitRbcSPPG3GlUiaxUwzIYgVKsPKaQubm2i0G3FaOKNrnKk+fQxXUMF1aUfC6YtNYlXHF8i9IXUHENpsV5SLga2BPG8TdN9D6OnWhG10arLYgQtuYVVJYTLqkr5ENtoSjlFLBWpwWuRzWsdw3aRYYZp83OyiG53udKwhDq30myF31UANeT+ffF1yjtOqWt0pbUm4sQEnVVgOoAXJ6IXTKxKzCm0IzMoObUG5TewF/niUoW5jvpVISasbXUqFP4fcbzzMvNIKEvJdlHQtKQb7yNytNRvjeKHtOYn6a3QdoFLTiOmI8Bp5Zyzktpvbd3kDmMaBhqs09Mm5S66X1SLhvmaOXI6QQlW7VIubjeYs1GkzVMmEuoQp6QcUeQm0oIQ8m5sU314cYlVw6azQNj/AAmliI8Smv5Oo1bZpL1OUVXMAVEV+QSkKXK2yzksN/ht71dYHnjEwXhCqYjq3cMqzdSAQ4pegbF96jbTy6xq1CqU/Ta5LT1NnJiUmUJBS80spP8AEaR6/wADOvVHB8lV50MKnpxsLffaaDZd1IBVbebcY48zg7HwHjONxHhsMt732NMY2Lt9yJS5V08rbclnwb9saDjHB1Vwq4hZQUgm7EywTrbiDvFvPHptKOeNfx5TWans+qTbguppovINtyk6380Vp15RZ4/hP4hxdKvFyluedKHMo2kV1jCOMJFE3MuNL7mrTJyTLJSkqstW5xJtx1jjbhMtMZQSCDY3647Vs0yo2200DWyH9f7pUcOqzoE25rrmPbHoSnmhc/a6jWKwcakt2dApFULb0r4ZPsY0vHqLZviZumbLm5ybShxhdSLDltyUqQLnyWjxpJzy25uV1NuSG6PROG5pS/U6KUlViawQBbf7FuMaNpqx8B4pR4bTMjaXgpU5WZ+dpRC3GlZ3G0q1Wk6haesRxufpFTkXWnX5ZxoK1SVJtcXjuUviF5ql0nEiLOuS95GZSdykDVF+sXHkirapR2F4VlsR0tAckSm4SnXISLkx25FGx5sMXVwlVUpryvY4xKTa5RaFlViIw6jPEvBbF1Ic1sBuPNCmYrC3Xg01LqUvglI1i/LmcRLlLtmlrJKQNVCOqjPMrH1GHhnjaWxYqM2SwwHCAddPLCZ9pnugrKekGHb9FW4GlvqWo6kqUemMGelAG1NpNzuEWjBt6ltErDTBawa68lI/Bz2iOy4G0rT9/wAT9IjjOCGy3XXgd4lz/wB4R2bA2tcf+R+kR9ZS/wDws/NvxdFLMb+TpGFVj9oJ2/4lfZGdGBV7d4J35FXZHlQ5l80fmWHX9WJxisn7Qzp/UqjkTj2VehjrdbNsOzx/UK7I428SFadEen4xNxlGx+1eAQvSZueCKgpqupl855OYBSRfjwjuGCJlTVeMvfwXmyLdI1EeeMJZlYrp9t/LCO9YUJ9dcpbfc39EwtGfEwk7nhfivDxV37HUBFmoMh+kTTNvGbUB5ovgxDxHcrl/gnsjxup+ZwjaaaOZLZQ7kKt6VhwdY3fPGwYabD2IpUfBJV80IkkGNiwh98TevvF280ezi3/Rb9j6Gvd07HQk7tIrTzmITvtArRhZ5kmPlTxcuqNKmpguz7zylWClnXmF7R5dxhiByr4qnqitZIcdUGxfxUA2SPMI9HVB1SKRNujxky7ih5EEx5EqD5Lqr3jo8SnkhFI/SfwhhFJSk/YzpefISRmsL88bPQ6w/KzjEzLulLjSwtCgdxEc8ZmPY1dcbDSZg5kjqjwo1nmPr8dg4um0e5qNUET9Mkqk3YJfaS8LcLi5+kR0Ng52EkGOP7PVqXsyoil3v3IO0x12RuZJo/oiKY1aKR+Z+HQyYipTRlITp0mEs63kqKrDeLw9b3woqdxPpt8H6Y4aMvMetjqadFPsaLgqRRJbR8YNoFkqfadH7QKvpjrdAHgvfG+iOb4fA/lNxOB8CV/7hjpVBtket8L6InjH5Weh4Er4qLH6PFjCnHSzOtLB3XB6ozU7oWVY2W0RzH6I8iEc0rH32LqOnRzx3Q6aUHGwoG4MUTcqH5cptrwjBpEzmHIqNuKYdptzaRGadOR6eEcMZQu+pqb1PZeUhEy2FFpxLiCfeqTuPXDaQH2Y2Ond5IuVFhKFh1IFjoYtSJHdzcWlPPC551LCrD4pR9x/wjGnNJRy3MYyLxjzntRzqMcUd0fU1/7bOU7SD/7KcQXP9Xun5o8o4IrIoW0akVUkZWppAXf4KiAe2PV20kW2TYkPNTnf+7HiF+byZwNDc26+Ee1F+VI+Iw0G89j6byTyZmRZeQbpUkEGLpJueqNK2S19vEWyajVJLqVqclU58pvZVtR543Q7zHi1I5ZtH3GGq8SjGXcxZ1lL8o42RcKBB6dI47sxwM5Q9qOJa08lOV50IaIA0sBf57nyx2pVrHdx7IwZeSalnn1tpsXXM6tONrfRHRRrunCUO55eO8P41enW7F4kEDW94x5h5mWYU+8rK2hOZRPAaxeVpl/54Rpe06pTVO2b1J2Rl3n5gtFCGmBdRJFvNqIFGnnmodxsbX4NF1OptTbjb0sh5lWZK0gg84teAqGU6336nXhGsbO6q/VdntNmJqVfYdSwlCkPDKoEJ4j642hXineN/ZD1IOE3BkMNW49JVF1ONeqAw1MYhwhLSsqlfKKmW0ApTcjwgOwnzR0rD1PRSMJyFPb8FLLAbAGlrACM+ckpaeQlD6cwQ4HE9BABi6sgIKdRv3A9EdEsQ50o0+x59DAOlip1W9Ht/wCQUoXOp0KuPRFmcfRLSTzqjlCEk3UTbxYuKWkZrkjxtbHmjlG2XaNhGgUN6j1PFUzTp5yygzIavlNhwsbDrhaNJ1JqJbHVuDSk479DyPtarNQrm1OsTHfNCC04G0tmZUAcoudDu1B3RziaQ+0+wUuM7s3gWVa41v1xlVV5mdqEzPoqqn1OuqVd8KLqgVe+03669Rh5gnDeGK3iFMrXcXt05pSkoRyMstxbqlHxRpYdNwY9RpTnZbHNRfwmFV+h6k9Tds/pMrg5muVSkyj06sBaHnWBnF7q3kXuAQI9BF5LTVrWAFhruIR/GNO2e4Up+EcDtSEhUpyoNu5ne6JtXhnwQAAPe6cI2Z0aq1I37/ixxV3nqa7EMBF06eZ6t6mQZlROhClbrXtfwB9cc5re0+n0HH0rITrqUsKSULK1BOQ7iSOO6HWKaNiSqSYRQMWLoNtFrEm2+VeCDvWdNI8nzUhMYp2qu4brWNJ+eebWUCY7kbSSRcXSLmw4k9MdWDw9OV3LU4PE8RVcoxjK1tT2fI1KSqUg3NSEw2+ypIKVJsdAv5t8XXgVtLZJykgjMDYiy/4xoeCdldMwTd2m4hrswCFKUy++C0s6DxQI6GQhQcNyLFYAv1HdHFUUIy8p6uHzVaf9Q8+bXtjNKmqTM4gexFW1ONhSlNvzgKCm+uh5gom3MI8uVPCcpLTswKdNvTrcu3nW4VJCCfBN83G+vDQx7/xzgegY3oT0lV2HVlIKkLZeKLEAjTyGPA+O6DT8J4qmJCVqE9LqbRYIfSpZIKeCxa4J08sd0J8Wld7o5sMnhsS6V7J7LoYNGpdalam27TJadanGlKQHGHEhSXCVJRa/AkWMe69iU7i2a2fsHFK5p91xHKoemClRKVJ3ZknXUfPHz8k6oZSadU3WZlK1Aq5VLCl5yFAp43A0+aPVfqcNoc9UptGGna6uYlpfxULklJATmICQrMbXvxHCFcOJRaW4+NcqNeFZ7dT1ekouDY7wbX5xAsoelSi5GZNrjfzRitEqbBCiTlTrYcAYvNkFRACrcBcbt/0x5GVrU9xT4kfZo5VSsCrmtq664nEdcUzLru5LugBlw2Gg49PljsaSALX6CIxEttoJUlNrk3tbWMpJTbjcgcYbEVpVWm+hHwzBLCqUY9Ssrsd/PwjhHqiJ/FzODnUYeqTUkysZHFF1KCsWNwCQTxG6OxV+rM0ulPOrmpdl0JJR3Q5lTfpPNHz6214gxNi7FTjlSqNJmGGFnkUyExYZSbEkK37rR0YKk1er2OfxStGtUjhovXc5piNuaptTVLzc+pTiQbjukk6aW3c9+uNNqzoUpq8wttASQM6lK/538IzJ+Uu64VmYOXwiQ6neRpeE8wtpSmRMsTK0ZdEh8Xt5d246Rpydz06MLJIUTCUZhaYSq41NosBppSjmmALdEX5lUrmIbl3kG4uFOA8IwiLi5ERZ0l3kmbKPdAAGni74suJQF2SsKHOIgjXniCBzQBkiALHfDqeH80qef0lQl0uNBDqd+9Gn/GVDR6k57x+YliOMTwiBClCq9oL6de/pim/RAY1zIq3w3ZP8zH/l09kJgd0OGfvLmPl09kaIlTp8xKdIiJO+AboUsyRuitAB1iiLjDymHkuNqyrQQpKhwI1BjAG1Iw/U61LVB6nSM1MpkJUzT5YazhtsEBS1n3oGYaxepSAmlVYcQ2Aeu5jdMA7cMeYEp2IJak1pJRV5RUq8mYYDpToohxB0yqGZQG8eFqI0+Rmn5ql1RyYczrDIF7AcegD+MUjuSq8prZ3HWKYqO6KYmVCAb4IIxgh1hkXrBH6pfZCWHWGfdhXyS+yGjuTrcjFLv3dfWYtxW97YXpxMUQstyi2Jt0xT5YmCFMEZVN91pf5RPbGLGVTfdaX+UT2wY7glysuVn3dmfjxgxnVn3dmfjxgxpbghyoIg9UTEE2gDFJ14RKYgmJHCMMO8S+2JP+zohEd8PMSn2eS/s6OyEZ3w0tyVD+2gggghSoQcYIIwyHsx95Er8sfphFD2Y+8iU+WP0whMPPoTpbMmCIO6C5hChkCG0qPAGm6JE7Qb+5jvpwyam6GG7GlveFu8P+MddBK5B1ZekxUMWprs0bgk2F/miwhb0xMKfmHXHHXDmWtwlSlHnJ542+Ym6DJUplSqYpZzABC1XSegi8KpWYoRUPta91Z/4x114JNK4mIruMdjacBFySXP1ZDSSWGC2kqscql6XsdDpeOz7XEtM40VMvTGQpokvkRYnlSUAWHNbp5o5rRzSmMDcoiUcb7rmgACd4QPrMbztymWkbQJdAbWftJLKJvvGQRelpTPhMRUdXHRdjz+67me1IOsde2aKy7ItpJOg71sf+IY5P3XSi6PsN3fxV/GOv7PH6b/ACRbR1JlnAnvWwVDNv8AZDAwz8zsfpfgzaktOjNewLXWKBtAplXeHscu+FOaX8E6H5jHs5iYZmZJuZlXUOtOoC0OJNwoHiI8FNT8giaAEq7ofhXjtmAccVGhv0akSzrhl5t9tKpd050AKWAbA7t/CPQwuKUU79D1cN4xDBwk6q8p6HzH3x146x5r2x4vlK5tCZlJR1LsvIN9z8ojULWTmUR0bh5IebZse1iWxzWsNyk0uVkJd3kw3LgIKgUg2Kt/GOFIfbmZ9KGmHnF+9SnwifIPLD4jGRnG0Tnx34gpY2guDsx5QcNzdffmJptCW5VpZbU6VacoUkpRprc232j0dgymztEwQ1TZmaabkGTygWCQnMdVXVzXsNY57sLwqzWwJ9LTB7ncLilOJBUoncBbRSQOcaExuu1PG8lRpVOHpAll7TOU+KCdwt035tIrhoRpxzvc/B/xHjqniOM+Bpa23NOx3tAmJmecpdCmXBLklt65vn6Uga+bWOezdJqrkujlpV95KiD3Xydw6DuSFdIF7HW8bNRae7NSqpgIKqk8c4Q9dJbBt7I2ris6jTdHWcM4IkaWhM9NJL80qy1FZuEq4FI3XtxteHjCVZ36Hp04UfDqShBeY5BSNktaqcql5bCJZs3sXN58kbJL7HuSmQp185gQcyfhDjziO6Sck5MrShho6mwsDqeiNzp+AFcmHqgUNJIzeznKLnfYb4ao8Nh9Km5TDzxld5tkeaJTZRKome6XA4pWYqOY+MSf4mLE5sxdl1Imqa/My0wFBSFIeIyAHgdDoLG998erGaDKSaj3LiCSQ8bDVAUPnixUKKXWrz9EkqnL5bd0SBCHEjnsI5X4hRvpHQtlrLrc8W4nkcRilrl6jIylQl5YFtmaW0A6gJSQLq0OXwidb6xp0zR5acZU7SCFFCS8uQccupKRYJUlZAz77hI1649m1/ADE9THqhQ3jPsIHhy7iByzXWniLR52xdgiWk62ZhbLwZCSFIYbSXGk77tlRsDu+eLKnSrxzUX+x2YLFSjLh1FZnH6tIOypZcSlRaUC2gkapNvCzDQ5gQRrG24ExWmVWzh7ELiXqE+4S6xe5BKcqVBW8W32i3UqWzJMuIAfUy6yHnANAVDconeobyTznS8a1IiXbn2VthaE5gSo2T0m51jiSlSqXPpcHinSl7G512lv4bxUKc8UKCEpUhaVA5kkZknToI+ePR2xvFklUcKN0B15KZuUB5JKiByrZN9OcgnsjzhirETNWpEih59t2Yp7AbDqXQtToJuSSAL2uB0WjAoeJxJTbbjK3kLSbpUhdik9B4R5mNglPynzv4p8HhjP7fzPeIWEmxjn+1fGEnQcEzNPD6DOzyOSS0DcpQd6jzaDTpMaAxtHrH8h7lU74zXdCaoJRL2YZ8hRe144piDEiJ2dW5NrmXlq8ZS3LqPlMcsE29T4jwf8P1J1rz2izd9lrpmds9NUDf2N/o/olRxCr5hNuAmwzHtjsWxybk3NrVNUy28lfJv6qVcAcmrhHPa7RmJVSXp2Rm2Q8nlUFRy5k3PhdWh1j1nG9LQ/Z6byYKKMGVW0H5U5iTyI0j0DhiZ//tzYQkqVnr5Rbn9ijz+0KWJmXzomB7ELWPCO4UwtSXqcpKYZDgSMRX8I+EDyUGgj4nxu0or5mfQmZhchVaI81q62VoCjuWjW48lx5Y6Dssdl8QYVqmFKgsLQj2VCSb6K0IAjnFFqSX8ZyZLS1KecSASTZV9CPLDXB1clcLbXWWlIcbbdeVLKJNhlUbA267R2t3jZHj+JU3Uw12tYj3GeH9lWzvDd0AzNTdBytoUFPE/pH3ojhTtQYnKkqYaaS0CbhN72/jHQNuNHlZbaA8+pt3LMoDt0mwvuMcedmJGWNkpeBv8ACg06sqejZ6HgtTi0IybbNiqFUUUto8EAC1oWPutq8Mi94xVTcouVbWM9yOJjFVPIIypSI7I4i9j3XT02NlwiQK+8Ra3c6v8AvCOt4FVevPg/iP8A8hHBZSqTdOmTMSa0pcKMhzJCrjywzpe0bFNGm1zEo/LBS05SSwDpf+Ee9T8TpxwrpNanyHjngtXGKSg1r3PVBPTGBWFD1vTov/QL7I8+fy1413ctJnh9wTGLObaMZvyrsut+UCVoKVDudO46RxRxkE0z4zD/AIIxkZqTktDYK85bDU8P9XV2Rx1xd3CLfPDebxnW5uUdllrl8jqShVmRexjXS5MDUqTp0RfxHxSniJJw6H6V4V4fLDU8s3qb7s/kS7XRNKSeTlkFRP6R0H1x3TBEtyteW+QcrLZPlOg+mPNlHxdW6TJ9zSimEt5io+xBRJ6TG1Uja7jClMuNSj0mgOEE3l062640PE6Kw/DitWeJ474LicY5ZGj1YnfFiovBiizTtx4LSj80eb07bsdi15iT1/1ZMUTW2jGs3IuSz0xJlDgsQJdIMcPxcU9T5Kn+C8UpJto6O9NJlUNKXaynEo14XVaNkws9yWKJbXxsyPOI85T+O8Q1BpDT7zFkrDgyNAHML80Z8rtQxfLTiJpqZlUuIVmCiwm1476/itKcHBI9mr+F60oZU1c9jpWL2BEVpIUkouLWjyj/AC7bQwTmm5K54GUTE/y77QUi6ZqSB/siY8J4iJ5P/wBNxfqR2ebQXEPyih4wW0TzXun6Y8eVhpyXqL8u4kpU2tSCDvuDaOiv7YcZOvreU9JBa1ZiRLptcxz+rT0zVarM1GbCOXmFlxZbTlSVHfpGx2LhXjFI+1/D3hdXAZo1GmmJ2QS0rQ74fUkqLyEpuTw6+ELWWiEkW3njpDanPOSc2zNMpQXGlhaQsBQuCCLg790eTBWZ9HirSg0tz27hiU73YUplPKSFMyzbak9OUX+cmOqSqQmVbTzJA+aPD8vtux+hYV3dJ3BvcyaPqh0n1RW086d85E/9iRHTianESUT8/wAL4DXo1Zzk73PaLdiYTVNX2xIvuTHkxHqjNpw1NUkD/wBiRGO76oLaM69yqqhIKUeeTRrHLTjld2duI8Kq1Kaij0HhCoCZ2pYzKSCGnGG7j9FFjHV8POZg9ruXb5o8EUbazjKhVWo1CQnpdL9QcDsypxgLubk6A7t5ja5H1Qu06UQrkqpT0hRuQZJEJirTi0jp8O8OqYavGo3oe70K5oVVi6XGid2v0R44b9UttPSm5qVOP/YUxjznqlNpDygXanTjlJtaTRHmxouErs+nxD49FwW57ElpkNvZkrGZB1F9RG2sPoel0OA7xePnsn1Q20Bmsu1FFVk+WcaSysGUSUkJJKTlvv8ACOvTDWV9VFtPl2+TbqlMKb3F5FJt88LiIKeqH8I4uFvCezPej6UvMqQbEEQpk8yKmltXjJUeyPFifVT7USfdSl9XcCfri436p3aSX+VNRpefn7hT9cc8YNJo9OtOM5xn1R7xB0ixNkCScP6JjxEn1UO047qnTT/2FP1xjzPqn9qKm1J75U2yhb2inX54WOFmnc7qniFOUHFHozaW6P5IMSkqHua7/wB2PBM1NlLi0g3sdxjoFd297QKzh+dpE5PSC5SbZUw6ESaUkpIsbG+kcmcmCtRJO/hHoJWVjw8JScW3Lqe0vUi4wXUMIz2G5h4qXIO5m0nfyatRbykx6bKuciPlzgLaDibZ/Xnaphieblpl1stLLjQcCk3vax6Y6aPVRbX7a1+R/wBntxy18PKcrxPXwNZUYOEu+h73JBvYjjFCt5ufn6I8F/8ArRbXwbGvSP8AgG4tu+qj2v6gV6QP/wAvbMSWFmdcsXTPeZKbgX/5tHmH1WGJ25WgSdBbddS8+tC/AIAsDc348BHIVeql2vi57+08cb97m9Y5tjbaNifHlbFRxLPNzMwgZQW2ktgDTgOqOvC0nSnmkeXj0sRFRW1z1T6k3E/fDC1RoDrjqnJRYWnlVZiUndr83kj0kq1jw0PZHzIwNtFxRs+rLtUwvPNyz7rfJr5VlLqSnfuPGOiH1U+18p926f8A7PbhsRSlUnmiJhYqjFwbPd2XeARa50v0RStJUnKCL30vx0jwgfVR7YCM3f2ngE/m5rWIHqpNsAUB38p1+mnNxH4eZ0OpB9T3cpFrkG+hNvNHjz1TU/gOjYiaZl8Ky8xV3nCp94HIohJBNzre97buBjU1+qo2wZbd+6aR/wD05uOS4uxVXcZV9dar02l+aWLZkICEjXNoB0x1YaEqbcmedjKPGnDK7JC13EBu42zTZFppV8iA0FZN2m6x48N5jtnqb8AYfxpX356uy5nUsqz9zZVIQydSCSCMxI4cBHn/ACqDt0CxGg6I3rA21THOzuVcYwtUZaTbdUVOByUQ6VEgcVdQ80WjJq7Di6LqwUKbtqfSKTp8tTqQinyTJal2UFttrMTlAAG87/4xkOMJIVa58Yi2nvRHgxPqo9su71wSBvqfta19UXx6qHbEUAmvyH+zWo4+DUep1KMIpI9yTMpyjam0khJvc31F0W+nSOZPbANnk3XlVd2TqPdrrhcU8mfcQb2ve4IjzOfVRbYALmu0+19/e1qLZ9VBtgP9e08cPc1qLQVWGiZzVcLRqyzSR7ikKa1TpBEjLqcUylJALqytWqRxOp3RmpzKI0Op3335kfwjwin1T22EC4r1P/2a1FC/VR7Y0mya7T+A9zWt8TdKb3K06cYrLE9zVg1rvE4KCqTM8Qnk+678mLixvl14R4I22vY9pWKjKY5NNSpYKkrp6fAVmSdAbcbDTTjaL6/VU7ZEo8HEFNta1+9rUc/x7tZxptIS01iick5kNao5CUQ0R5U6xWi3TTi1uRqYVyqxqx1t3/8AAnRV5N5ZTOVOqBBAzIbtYktWOtvhADQeL0x1jZFjDZlhvHbMy85iV12ZcLGZxzTwlIKCclr65h5jHB0Ivrca8bxmSqHUrS40opUk5kkbwb74anPKzoxdCNaDR9YcNT8nVsOys9IBwS6kgJQ7ooEKKTf54boYUGwlKr6c4vutHzvw76ona3h+mpp9Prck3LpJISqQbVqekxsTfqp9slhevSP+z2o5auHm5PJsNhLQpqNTc97BoHUr0uLRdShF/upBGm6PA/8A60+2EjWuyPkp7X1RA9VNtgI1r8j/ALPajneHqM9CNWnHVHqjbNifDeGsKTE7VGZGdmUIKW2JhYSVX3AajjaPC1axpPYkn3VSuz/D4DQutuWZUbA62Ki5fgfng2ibUsa7RJZprElRYmENKzpDUshrW1tSOiOYOtuBZspWu8CPQinCChc8inQi60q0lqxzUKJWG2VJmcIBJQtAU4XUg6pKgNDxGt+iNXqlKmpZwPTNASyixJSX73vrfQ83CK1sEmyr33am8UvSw7nYyoIJSbkC19d/mtEnTbO+NVRNeeS05dTculsncUk9hiwpsi/ND0yV/eK1iwuURl0BIIve8LwWVWIQlKDzxSRDByXQgeKqMRaUA6pV54k423LxnfVGOeIhzOn+achppmXGPLLowlx3S3MF3jlOkN5hVHFBlS6mYLBJyJB1HPBSunqTq1LNaM1aDMBDcrw7e4amvKYjPh78XNeeEcSnE9mKLjng4w3z4e/FzXngzYd/FzXnjZfc3E9mKrg7octG+C5j5dMW8+HgPuUz0awybXSPW28Qh/ucOjMknwibQYx9yVSpto9zVOfSCG/K4fufYprzwBzDxOrM154GX3L8T2YouYq0I0EOM+HLX5Ca9IRHK4d4MzXpRstuoOJ7MUpUQbaiHtJy95qoR+KHaYx+Ww8B7XmT+1DWmu0hdPneQZeDYQC4CrUjohoJdyNao8vKzUiReCHfK4bB9rzZ/aiku4c4S816UJlXctxfZia0EN+Ww8N0tNelEB/Do/Bpr0oGX3NxPZim8OcMn7dW/VL7Ip5fDp3Ssz6UM6IujKqdpRmYQ5kOq1aW4w0Y67k6tTyPRmsOfd19ZijSHi3sOB5QVKzV77wqKOWw5+STXpQHBN7lFV05WJtOmDzw55fDn5JNenEF/DvCUmvTgZPc3EfpYn3njGXTfdiW+UT2xmd0YeBt3HM+nGRJP0I1BkNSkwlzOMpK7gG8ZRV9wSqOz8rF9Zt39mfjxgHojYqlMUJNTeTMSkwt0K8JSVWBMYvdOG/yKZ9ODKGu4KdR5V5WJr9EUk3h0ZnDlvc+Y9OKe6sO/m+Y9OBlXcfiezE+kG4jrhz3Vh783v8ApxImsPXH2BMenGUV3DxX6WGJTd+T/syISaXjbau/R0Ll+6pV1wlpJQQu1hzQt7sw5f3Of9OGnHXclQqPIvKxJBDvuvDf5te9L+MHdeHD/Vr3p/xhcvuV4j9LEkEPBOYcH9WP+n/GDu3DY/qx70/4xsvubiPswmT/ADGlPllfTCONvdmKR622XDJuGW5QhLebUHnvCvu3Dg3Ux70/4w04rTUSnVdn5XuIzuiIe93Ye/Njvp/xie7sPfmt304XKu5XiP0i0NkndDeTaUtbaNdSIpEiqG1MlVcq3dNwOEVw78xzvEq5XX1OiTlEKAy3JtYDdC+RSAoG27jDzEcmpMpJuiXWAUqzOb0k34QolGjm0TeOjETvUBiJ9DpYcZRhugyrCsqxLOOuXvvUvT5o3XbtrtKatf3Dl9/xY0lDBTOyTTqcuSSQPB04X1jetu4UracPBGlFY0/Zjsp/2z4q6eMh8meegDyg67R2TZwlJ2PbSykEfapjQn9YY5ApNnU2HGOw7OLfyO7SuP2qZ/8AEMJhOZn6Z4TzfszmTLanKq22B4y7W8sdDpUwU7TqMylWjU5LIt1OJjSaKEuYplUndyl42mhKzbU5A/8AxJn/AMRMFvLB2PK8adsJOw/2zvFW2XExuPbQ/wC4mNFpLcm3MJmZhwuKTmUG28yFJITdJKrW1J3C8brtlQFbXsSEE3VNadPgJjV6SwmZnkMvobeaZlwCW2E5hpexsL5hm8bUmwgUddT5jCV8uCjZ9Dvuzus0bC+zczS3e57tXW44LL5U86QRpzaRyarVM4kxS5OTLhdCnTmez5s6dyQUmwTfXzxnYlmJeU2e02RYyh15xy6lklRbGgKjayt514W4RkUjD1MfpVAVLVCWmZ2eeWZiXZQoPMJCgE5yTY31IsI9iVTPaCPm8Dg6dOdTFy3Z0rA9GlJSptTjMh9jiymc6ioeUnUaacdwjqDMs7UKolDbAzuKAyNpsNeYcRCqg0dErOtspDikNNeGpep00HVw0jpeGZRqSlJmtKSSUJCGs3wjxEdVassNTvHfoSwMfiKrrz1SMpPe3BNIzrCF1BSTddr5TzJv85jSqriuen31HlSUq13kxhV6pvVGrKUtYUlOiSCR5fLGVSMOqnGhMTJUloi+UaE9PVGw+Ep0Y8fEayZ9RVqUcNR4td6dEKFVOcQkkuLJ0tck6RkSOIp6TfztvuNq0sAbCH8xh6RzKyNWGozBdo16foypJYUnw21aZ7WsemOynUw9dZbI48Nj8FjZOko5ZdLmxyuK1O11ibs01NAZVuN2AeHMvhFW0LBtNqNM76U1hPJzPhEIsrK5uISm0aY1o6lKymw000sT1b46hhR0VTCE9JLW5ysukPNeFZSRbXqOnzx5mOofByjWpaLqPPDunelLXqjxXi3DxpVdXJPsOsuNkOhXJi6kW4Z9NN1rW1Mc0fl25eadlrB0KBKcqvBHE7hYq4W4GPT22WkKfkFTXILK2jcFO8jpvw1veOE4xwtO0oUqcfEt3POMh1og6EXGiunnVpD4mGaOc9DwyTxFBy7GpVSZbYWw0uXYzBuzxLiip0lRy6bsyb6hOnXC6RfcS6nMSFcQd/ljNxJIFmZu7NSwQoBJS1cZBckEJI8Ea8OcGF0mlBcARmsLaKFrdFo+erXcjvbUqZ2dt1X/AKsLqwo/fAnUfJRyyedUpzMq9z5Y6shsD1Kbyhv9cCT/APbEclmmFiXExdGQryWzjNcC+7miEFY8zwZKVSp82dM2GO32wUhJFxkfH/2lQnnKjK1SmNobW01V5YmXDr91B9KiQk5lHK2lCRltbXN0Rm7D3AnbJSfk3/8AwVRz+qck6iamHZlptTaiENKBKnTm1Atzb9eFo9NPLRR9biad8JC3cz32G5SoShcBdT3OhxQBIzA6jq/53x12VnAfUwSeS9k4kNgTe3sW6OOPKlBKSj4mEocLCUKYQCSrQnPmIta+hHDSOoyAX/6scobX/nEdP7qBQlqfC+JR8sL9xjS3lsVymTSQ8EoeRf4I8MbjGw7XaeKLtCcel3EIClJeSEk3QNFC/njXpBhToYd0SpICsl9+/dHQtvMi2ahS5pK9X5Bldkm/vNSfNHTmtJLuSrRUqTVtC1tkDNWwxQ64k5g80DcDWykg6x5tqkq4ZlVr24GPSWJ1qmfU2UV9YJ5NKE346EiODzSpZa1DcYNRXZ5X4dquEJR7NmpnlQlDZUba9sZ8q2gAFatYyZqUl7NqQ5qb6eWJRJgN3ve0NSh5kfXOvmSGNHpLlbxBI0eVTmmJyYbl2xzlSgkdt49H7RfU1YNouy+tVnDM3VJir0xgPlt+YC0qAsVAptxTmIjn/qbsNGubcJWecQFMUlhc4ondnPgN/OonyR6WwonEkztWx2xX6LNMUOd5JMk+8BkdShBbVbXiLHdEMZWkqnlex5Vau1UseQ9ieAaJtA2qDD1eVNiU7jdmLyzmRRUm1tebWNd2x4UpmCtsdZwzReXMjKKbDXLrzr8JtKjc8dSY7JsHojuGfVc1bDjycqpGXnGB0pCk5T6No5/6oxsK9UhiUn4bJ/8AspjKq3W0elh6VS80adsqwYnHu1uj4ZeLolpp0mZU1opLKQVLIPDQW8sdq25ep/wrgrZkMU4Ncn3FSs2lmcTMzHKgIV4Nxp4JCrDyxm+o+wsHcTV7FjrXgykuiSZVb36/CVb9lI9KOvUDDuJsU7J8d4cxdRZinu1Obm3ZMTGU3S4MzdrE+KpIiFau1U32NWrS4qtscB2AbGcH7R8EV+q4kFQMxIzAaZ7mmC0MvJZtRY31jQdleE6Ti3bTSML1ZUx3DNPOtu8g5kWQlKlCx4bhHob1JzS2dneL5VYKHUToQpJ3pPI2t81o4bsGzJ9VBh4XN+63h/8Abc+qGjVleeoHUlK77HRqnsq2QYc29VDCuKK5N0uit0pmaYdmJ3Itb612IKra6DdG7I2A7BXcHqxUiu1JVFSguGoCpexBIOUm+XgdI5L6qZdvVAEXNxTZbsVHU6NlP/o5Jhd91OfP/wD0GJScssXfcj5rXOVYi2X4JxFtdoWENj1bFTanZdTk7MuzJfRLZVaqJsNAm5sN5sI6w7sK2CYWmpPDeKMUTCq3NJHJ8vUBLrWToClCRZIJ3X39Maj6kJqTc2kYhmF2L7VOQlu+8BTvhH5hHL9tc3OTm33Fpnlqzonlti/vW0pASB0BNoZqTnkzbFLt6DjbfsWmNl0/Lz9MnHZ+hTqihl51IDjLgF+TctodNQrS9jzR0fFnqcsLs+p+XivDiqoa23TWp8odmOUQ54CVuJCbcxVaNr2vpdqPqIKVO1UlU6ZanulS9SXCkAnrIJjqFIqTErhrBVFmwksVWmplSk7lKTLJVbypCxEnXlZAc2jxrsJ2Uye03HM7LVlyaRR5GW5V5curIpSlGyEg+cnqjF227PaDs+2q+t+hLm1SYkmpgqmnOUWFKzX1tu0Eeotm+FG9kmHHac7lTPVzEipVhXFTIUcnkyJUfLHJvVDUJzEXqpqVQpcXdqDEnLADgFLUCfN2Q8auap7GVV7mwbN/UzYFrOzGhVPFMxU26zU5YzBbYmeTSEnVICbcEkE9cc22cYB2cKxXieh7Uq6ukuUqY7nYPdfIcoUqUld9Dm0A88en8Rt4gkNsOBJai0abeoUky8zNTDSRybKVoDac2vAJB8seYPVQYfcw9txmai02US9Yl0TqSBpygGRwddwD+1E6bbdm9wqs5ux2ad2A7CqdhJvEs5X6lL0dxKFInnKjZpQXokhWXjp5453R9l2y7EnqiWMJYcrk3U6AqlLm1vy84FqDySfBz25rG3TG6bRZgj1ANHWDr3JTx/xpjl/qVHFOeqCBJJ+1kwf+7GjdRbuC19RPizZs4n1R81s0wgHnU8uhtlU0vMUpLYWpa1cw1Pkjs72xHYZg5MlRsb4sfXV5pIyqene585Ol0tpFkpvuJ88MsHSks56vTGbzxSX2qeC1feLpaB+btjh23qZm3vVD4nTOFRLTrbTaVa+xhtJT5CDfywz8zUb9AKTYx20bEH9mUxLVekTr1RoE2oobceALjDm8IWRooEDRXG0dGPqeKBUvU/y+JKC7UTiF6mInW0uTGZtxzKFKSE20uLgQ6xzMKnf/AEfchN1QlcwKbJrQpzU5gtISdeOWNukcaM4P2M7PKlNLyyUymUkphR96lxogKPUoJPniWaTiku5Sc1Hc4RsR2V4Z2jUPEE1iByoNu09xCGhLO8nvSokKFjzR5zqE+tEy62FmyVqSLnWwVb6I+hWCMIIwftCx43KNhFPqoZqMsEjRN0rDiR1K+ZQj5xVm6KtMJ4B1wf8AGYFR5rtHT4fLPLUg1Bea2aLrc84U3STYC8J2lILtiY9k7FNl+xnEPqaTXMRMSMzUXEPqn5598odkVJJACdfY7JCSOe8QULnp1aip2sjyoipKSdSbxksVJSlgBW+EE2plqZcQw8XGkrIQs71C+h8o1glprK4DfdC5fNYq1eF7HrbY7sZoOIdnTm0HH9ZdkKInOWm2nQ0C2g2U44s7k3uABGVtI2b7H2tls/jHAeNU3k7I7n7qEyl9wkWbF/CSrWLmwXbVgF/ZIjZftBLEqy2lbDbk2m8vMtKUVZFEeKoEnf0HSLm1L1OlBawTNYz2bVVbsuwyqaVIre5dt1sC5U05vuBc2N928ReMfN5jxpVWpWZb2ZbFtm2J9hsvjnF1QqcoRyypp9ub5JpCULIva2gjX9omCPU/UbZzUqhg7GrlQrbSUiWle+IdzkqAPg5ddCfNHX9jklQJ31FzcriWYUzR3WJru13OUZW+UJUbjUaRwjbFhbYdScDy05s2rxnqqqcShxruxbpDRSq5yqA45dYZK7YkKknK1zp2FNj3qd8UzUvT6HjGeqNRWxyqpWXqeZQskZtMu4XjDx/sy2B4Rodblm8WTTWIZKWWpmReqN1ctlukFNrm+kc89SinL6oqX1FjTpr/APCEfqj5lDPqlsTIva5ZP/2kwLJS3LxU3LhpndMMbHPU+4odl5Ck4rm56pOS4dXKy1UupNkgqOUDhcwi2g7NPU/YSplap5xbNsYhk5VamZF+oXVyuS6AU5eOkc/9SfOJc9UbLpuPc6a7Ewm9Ug5f1TeJgkkeGyN/6lMZLzBanmyNm5z+yTCst6jhnailypGtrk25ggv+w5lO5T4Ft1jzx595VBcsDuItz749fVVsn/0ZstbjS2f/ABxHjbk1hwHp+mCm2WoyeWV2e06hsB2GYaw3T6rijEdUpTc22jIuYqORKllAUQPB644/tVwtslo8zQGdnGJnKuqbmi1PDuvluSR4ISdAMtyTrHp/aNRdm1d2Z4eZ2l1o0uQb5Jcu4Jnkc7nI2y3seBOkeUNpVH2cUPaLSJbZtWDU6atLK3nFTHLZXeVsU3sLaW0gU9e5yqpJ63Ok7bfU/YewRsvdxPhJ2pOOyj6O6kTT/KjklaZhoLEKKfJGq+p+2NUzaYis1PEjk83TZMpYZEo7yRW6dVa23AW8pEetsUGRr1RmMAVLLyVYpDykBXOlWVXlstJ8kadsrox2Z4NwhgaZARVqo5MzU2OPgJJUf/DT5oyn5fcR15LQ87SeynDUx6rmZ2ZuO1HvM0VhKg/7MbMBYuu3OTwjpNa2L+pvw5WXKRiDGc7ITyAFLYmKoEqSFC4JGXcRGBSSkf8ApIZ4KGvsptzfYqY3Pahhr1PdV2lzU3tAxN3FW+SaS6x3YprKgJGQ5Qk7xDy6ICqTfU4pg7Zfs7xh6qGoYMpdSnJzDDcs49KzUtM5luZUNnx7ajMpY3cIw9u2xuV2YYvpyaKubeolRaTyTsyrOtDqSAtJVYbwQR/CHPqb3KZL+q1nZejOctTm5eeRKuZs2doKGQ343FteMdvx00xtWwZjfBZ5Nddw3PcvKZt5ASHGz1EFbZgSbjP2sUlWcVZvU4ztY2JYF2fu4JmWKhU25GrT6Wai7NzAUG2cqSpSTbwdCdY3jD2wL1P+LHZhGFsUVKrKlwnlUylVDhQFeLfweNjbqjH9Vs7m2ZYIcKSMzyyQRu+x06Qs9RehK63i88Q1K6/tLgf48zA3NrRmo7WMEbDMLbP6jMYPxc5O4hl30MoknKgHTflAlYKLbwLxzrY/h2kY52y0TC1ZL/cM8t1LvIOcmvwW1KFj1pEanjxKE7TMR2NrVSZAI4eyqjdPU1rH/rPYTI3cs9/4C4Ll0OxQcKTbZ6KrGwf1P1LxA3hyo4rqFOq74SWpd6pgLUFeKQFJtrw545DjvYWcDbbML4cmag/P0GuzrbDcwLNvJSXEpWhVtAoBQII380egNpWw8Y82ry+MJ3E7dOp8u0yhbAZuohtRJOckJTfTWNL2u7RsOYl9UBs5w1QpxmfFJrLK5iYZXnQFqcSkISoaKsAbnqgLocMK0nsch9Ubssw5stxNQ5HDz1QcbnZV153ux7lSFJXlFjYWFo4q0gKVuv0W3mPVPq1kJVjTCigPwF8f/dEcV2N4S9du3HDlFW2VsKnEvzAtcck17Iq/ogeWNHVXZ6FKq1S13PSEt6krBT2zZhT0/V28UuUsPqSJockJgt38S3i59LXjkex3CGx2sUSrK2pYlVRajLTYaZZ7uEtdGTwrpIN7KuLx6uffxcj1UjDiKLOnDXeUypnso5EPFfKam/C2Xdxjxjt5wyMJ7dsRSDTeSWmHTPMaWGR0Z9OolQ8kaCOKNac20z0ZWtgOwTDNJl6lXsRVWnSkwoJZfmKjlS4SMwA8Hm1jStnuyTZljjbRiygSFTqE9QKdLsuyM1Kzl1OFRsq67eEL+a0bJ6qVfJ+p8weq5H2Uzx/1YxrHqMpgrx1ilZJV9r2NOc8oYFvK3cEJyy5m9jY57ZR6mWQqT9PnsfTMvMsOFp5lyqAKQoGxSRl3xzbZNsUc2l4nqkyupPyeGZCZU13U2At2Y8I5UIJ0vlsSq2lxHR8c7LdjM3V8R1yY2m5KstcxNKke62BZ6ylcnlIv4wtzw+2TLVT/AFCtVqNM8GbMrUJjMjeHLEX6wAIOijoBVqjW5gsbDNgmLVTuHsKYsme/cqk51s1DuhTZGhJQoWUm++27njheH9kSmvVPSezHGQc5EzK23XJRRbLrfJqWhaCRoDYG3WIq2IOTEp6oHCTko4rO5PBtWXihSVBQPOLb49FY7ZlWvV1bPphpKeXeklhw8SEpdCfmJgyjkk0biyS3NdrOwD1O9GxAzh6q4qqNOqj6UlqXfqWVRzaJOqbandeOP7WNha9mePKJJNzzlQodVfS2xMOICXUnlEhSF20zWVcEb+aPUO0HYVSdoe1aUxNPYpdlCwyyldOZaSVrShRN8xVcA/FNo5f6pnHFLqO0jCuDaYvlZikVBD04qxs2tSkBLeu85dT1jnhYSu0kDPNbsXbdvU3YTwTsqcxRg4VMvyb6O6kTUxywLKjlJFxpZRT5I0j1O+w2jbUO/lQxSqfapsjybDIlHOSU48q6iCbHQJA0/SEexsVPSFdq05s+qIBRWaO+ttKuOVWRXlGZJ8kajsrov8m2B8H4JmEpbqlVemZqbHG6UFSj029jTGT8lmIsTJaHhLbTg+j4J2yV7C9FL5kZB9LbRfXnXYtJVqeOpMcsmEWXpHb/AFSwI9Uvi7T8LRp/cIjicwDmMRqH0WCk3BNswFaE6Q2nT/NSQ198qFS95htOC2E5H4645+53T/T8xMCbRN4gWIibQtyrIvEZoqtFJBgvRXBoQSbQ7l/vLmb6+zp7ISkQ6l/vMmPlkxoCVdl8xJEgcbREVIUUqCgbEc0BFWMJOlzE3Jzb7TLy0SzQdWppBUEDME3UeAuoC/OQN8YChrod3TG4YZ2i4rw1RK7TKTXXJWWq0h3HNNqSFlxsLCglN/EPjajgSOManMTb8yEpddUpKb5QeFzeMzFneCId0XSk1P5EdphIId0U/auqjmZ+mDDmJVeURnfEW6YqMRCXKka23xOvPBBGuAIc4ZH26/u1dkJoc4Z93Lfq19kNF6k6vIxS793Wf0jFFouLTmmVp/SMVuyzjCGVOCwdbDiOkGF6llsY/kMF4qIim2sZmI1jKpmtWl7/AIwdsYptxjKpptVZcj8YntgLcEuVlda93Zn48YEMK37vTPx4XwZbghyoIIIIAwQDeIIkRkzDjEP3WS0/B09kJuMO8Q2zyX9nTCTjDT3Eo8iCDWCCFKhEa33wE2gvrGNYeP8A3ky+v9Oewwih66CcDsH9eewwihpE6XX5huMFzBBClj1aNhNN3evygX+UH+aMiV2HSTMwFJx3h8nmzjX544MmvvH+kPni8zW3lOJus2vDU7qV0fn35d4gt6v2O+VrYkidk5dkY7oaEITY3c0JJ3gZtI4PPSIp1ZmpFLzbvIOqaLrRulWUkXHQbQ8xFUm/W1JoQEF1R1s3qB1xqjT+ZfTbzR01E8+p7FDDYmm/68837HQpN2Zeq8shaAsmUQABxFueOi7emcu0kK/+Csf90xzelqvVZBwruFyoHmEdb2+yxGL0vnQGjM2PP4MejT/tnhyVsbBr3PMqh7KOuOvbORbY9tKtb3LY4frDHIl+C8L88df2d/8AQ1tKJ3962P8AxDCYTmZ+k+EPzfsc8of32St9fDIjZcMgnadTr7++TX/iiNXpDgZxNLLUNOVAjdaGwG9q0gkCw74sn/jTCVH5GeP45L/pJD/a8p5raBigoLPJvTWRy6brICQdDbTyRpclNLbrX20lGUzJDfJqWA0kWSLHLoCCnjxjetrU0wxj/F0qsrD7syks2Qki4AJCidQLc0aQ9JrlzKzLzUw4zNNBLBclyc1gLKSSSMoPg9Foeinbyny+CpuWCj8jYcezLRo+HGpZCQ0Zdam8xRnUSs7wjS19wMMtnNYp+H9odCqk6EPy7TaFqSwc2QqBACgdygd4G6NYxa269g+iuuLb9jLrJWlSVDWygBl4AKtEUF1SUUx551YGXIFqcCioJVuyjUDrjsoTzS1JUqMXg5R+Z7Apk0JyoTs2SUB3wgi5Ol9NY3mYcdldnjC0b1rcUbm1rC0aFKOyIprExTyksrZTcgHm54cStfL1HRSX/EKlKB3kFSSPNHq4mg55JRWiZ4/g84qlJLoxBKNh+rNNq1BXYm/THWcO05mdqzUo6PYgkKIvbN0dWojlLR5CoNr98lV7fRHRKJV1NKbnpJSSoDUbr9BhfF4znTWU9PxdKOIo16ivTW51OaoFMfkVMGVbAsQCAI5fPYYmZtM4ywhL4SVCyT4VwdLRsc7j19dPLbUtybpFsxN7eSNTaxAumcq8VoDqwBmzZTmOtz0R87gKOKpKT6l/EcZ4fjcVRWEjqt7KxrkxhabbC5pBDaGiElL6sixproOk6c8bZgNl1iuzTToTcsqSsjib9kZsvXaRimaDVTlHGX0t5eUB8DMTb/m8Z1LorlJqM5O5uUa5I8mrNe/6Nui0dmIxtSdJ0q2jO3Gv+tFx2R5/2uy6UUib5N1TSxmvYkXHEafNHFa3Rm5zBVAeSyt9Tj60lLbBClJvvCybHjpHZdscyU0gs2T4arBwDW+utvmvGnbR2kSGzPB9JfmkqdS13Spu6kkjTmt5zHs3/opPsdP4Vw7nha03scIxCmbcmUS0sTMqYcU0yAtS9U6G+m/La2tvBPRCBllhpaUtrWpwGy1E3STwKeNrc8bViCXU/UpJtLZb5W+QBeVBJvYXsL7xrvjXZuUNPqfcq5liZKUps4w5yiCLXACtxte3kj5/ERs2PCXlynXUWPqS3zx9cCf/AA44xNL9kV2x2FoqPqTpok2AxAj/AMOOPuJ5SYCSQATYk7tY5InH4JG06v8A/pnSNhbSXdsNKXyqLhD/AIB3n2JW7ojlNWA7rcsdQo8OmOwbG5ZuW2z0mXZfDyeTfu4g6K9iVHJam3accT+kbeePQrL+ij7ap/8AkiZFvsiVv+IEdzkWEK9TDJclmI9cJvm5+S1jiS0pTMSpI/oBpHdKGuXR6mqRVMi7IxGStIHDkoTDbs/PvGX5YNdyaQqV7lR3Q26fByIcQQAhV7+Fcai0dq2n4aViSjYfU1UabJFFNZJ7rdCAu40tHD23Wpecl0y5K0FXik6+bmjpe3acCJbDtPIsWqa0T5RutHTLniTxGZ4ZxWjsP53BzrmwqVoK6zS0rQR9lKeAZPhE6K480cbndjkyp4rRi7Ddr/lMbrjl00n1OVKk1eCtYb8FXTdV44TKLM4hQcA377R0Nq9mfLeEUa8lKpTlbVm5q2RT2VF8VYbujS5mt8axiigTGGKi3JPz0lOZ2+UDkm5nSBcixPPpGGplCMgS2FEX1tfjGNNL8GxSkeS0dsIJI+mw1DEqSc53XyPQnqfMQ4TwXsxxDiCqV6mMVSZUtSJV2YQl0tsoJSAkkHVRNueEGzj1SeMJ3atSZTGFclRRZl4szGZhtpLeYEJUVDcAq0cipUthJ2SK6zMvtzOc6IvbLpbcOuGEpJbNFrWJqfmWrAZbZzfn97A/KOInNyWpKrKEZSzRbfsekU1rBUh6spGLJfFFFMhP0VwPzCZxvIh5OVOVRvYFSQkgcdY4Bt7qlNqm3+vz9MnWJyVcLWSYl3AtCrNJBsRodYwVymywaJqU2fIv/LGMuU2W3uZ6aI3+/wD8sJDwjK7519RaOJUXfJL6HfNn+OsNbMvUivzNMxFSF4mmG1zglEvoW6HnFBKElF7+CkJuOiLexj1RVer+0VylY+rlNYp7kotbTziES6EOpIIBVoNRffHBwzssTa89Nedf+WK8mylIuZub5t7n1QPyVNO819Qusne8JfQ7rgnaLhHZn6ozF1GmKtJqw3XH0zctUGHA6yy4q6rKKdyfCUkngQI3SkYb9T9s/wAWTW0aTxNTkPqDjjeepIdbYz+MWkDUk3IA136R5Lm53ZdLhXIt1OZUNQG1lIv1n6o1Gq1ejPG1JpK5RPBx2YU4r6o5MT4eqX60XoU5Vf0tfM2za3tAZx/tbqeJJdCm5VxSWZVKx4QaQMqbjnOp6L2judKxlhlr/wBH5MUNzENMRVFSD6UyBmkB4qL5IGS9721jyA87mVcRaDxvawjjmlZI9R4OMkkuh0/Y9tOd2bbVZTELyHHpFQMtOsI8ZTKrXI/SBAIHGxHGPVVaw/6n7ajiNjH81i2SvkQZppE+iXS/lGgdQqykkDQ2tceePBIWUy+YD30SJkcQIm1d3uGrgVN3joeqfVF7bMPYplJPBGD5pEzS5JfLTEyzo04tKSlDbfOlN9/ORzRt+1Dadh+nbM9nNRw/iCnT1RpM1KPuy0vMJWtATL2UFJBuOKdeJjxW3MXUCdxhrTZqTanGnJyX7oZB8NoLKM45rp3Q0aUXZHPVwairnrOt7dMNY39UHgBynzzknQqc+p6YdnkhkIdUlQ8K5OiRYX/SMPJ7EOBqp6sxjE0ziyi976bRUqamVTaOTW+SpASFXsSAonzRwehq2I1NhLc/K1SlvkapdmVOIvzZgN3WI22V2cbJKk3eRnkvg/AqH0R1wwGbWLR4GJ8Ro0LqpGS/YzNo3qmMZU7arV5TCFdlF0SWeDcvlYQ4lwJAzEKI1BN9Yc+qUxDg/HWyGg4iotepkzUpVxClSrUwlTwbeR4QKQb6KAv1wpRsd2dFN+SmCnnE7oIh/ZTsmlGeUnXwwgb1OVECHfhc1Z6HND8QYNtZVL6DjH2MMLzfqGKRRJXEVMfqiJaRCpFuZSXUlKxmujeLcdI5/wCpirtIom3Hu2s1STp0sKa+jl5t1LSColNhdRAvvjHr1P2C0dtYZNQqTw0DcnMqy+mQB5rxyKtz1Keqa3KPTFSErbwWXH1PK6yojsjkq0OErNnu4KqsTF5ItfNWO+Yr2qymD/VnVDGlHmmanTw4hp0yrgWl9lTSQsJUNLi1x0pEdgxBSNgW2OoyuNn8XyrLwaSmaQifRLKdQnUIeQvwkkXtccPPHgpcxfjYdBiEzQ5r+WOeTjo0d6wLy2PVXqkNsmGa1hiT2d4ImmZmmyqkrmZiW+42bGVDSD74DeSNNALxn7T8X4aqHqPMMUmQxDTpmpy4kg7KMzCVuoIQoKukG4txvujz3s6YwPUMQTCMcTrspIpYJbW0pSSV3GhsDwvHV5egept0DuIpzyOu/wCSK06V0mmeXjK0KEsjhJv2VzvmxvbHheu7HZROJcRU2QrEm2qSeTOTCGlO5R4Kxc6gi3lBjwPWwF1SZUixSp1wgjUEZzuPGPRaaD6mMjwsSTo0t91e/wAkWX8P+pasc+J6mCeZbx//AAjSoWvruDC+IxjLSnL6Hlpy6Vm+kVInHW2lNpWoIV4yQbBXWOMb7takdmcjWpFGzSpzM7KqYJmlTBWSlzMbAZgOFt0c3UQCRHDPyux9VQkqsE2rfMvlxThuSbnnN4usghQ3xEiG1rcSpI0Rcdd49BbPaL6mypYFk5jGFarVMrSRlmmeUWUKUPfoKUEZTppvBvGhHNqTxOJVFao3XZBhr1O+L9jktRK7U25DEl+VnJibmRLTAXqLNKV4Jataydec66xv2IcabLdjOwipYKwlidusTky08iXYTNJmV53hYqUpPgoSAb2+aOdDDPqRwLHFtW/evf8AlxZdw56khAunFlXFv1j3+SLqPueBKrGUr2l9DpuxrEOz2d9SjLYOxTi6l0/utqZlphlc62y8lKlkXsToddDaNFx/su2A0XZnWqvhjHQnKvLSpclGO+7LvKrBFhkAueO6NMxPSfUzs4Qqb2HsUVR+qolnDKNOLcyrdy+CDdHPaPPD82EKsNTx64EvI73OzDUeK7q6/Y776mSvUqj7fZacrFVk6dKinzKDMTTqWkAkJsLqIF+aNZ9UdWKfVPVH4gn6VUJaelHAzlmJVxLiFENAGygSDujk8tM55gXtYA7+qLCnSTYgAQk25K6PTpYZQqcS53L1LNepdH9ULLzlXqUpISwp8ylT008lpAJSmwuo2vGN6oGsU6peqPxHPUuel52VcWzkmJdwOIX7EkaKGhjlbNapjTCErwxT3lAeOp54ZrcbBQHmileIKXbTClLA/tD4/wDzhFKyNLC56rme78A1fZlib1IFBwPivGtKp6X5BLUyyKi0y+2UuFQHhHQ6DeI5Ftc2d7EsK7NnqzgnG3fOrpmGm0S3fRp/MlSvCORIubAb48uTNWYedKmpCXlUnc2halDruomLBnQo+KL9cGMkif5dK97n0bxcrYxtN2e0OjYm2hUxhqTS08kSlUZQrPyQQQq99193RHn7avgzZLgeUoE9gHF/faYfqKUTSTPtvhtoWUFWQNBfiY8zsziA6kFKbE8/CMlqdaRMFS5dt1N9ylqAPmMPGdtif5c4PRnubbLtew1Q9rOz/FFDr0nVGZIzCZxNPfS6Q0rKlQISdCQSQDzQtoe2vDuNvVj0yuCqJkcPSdKelpZ2oFLAClIuoqubAlWg196I8gNV+mMp8LDNOX0qff1/44vDE1LCtcI06/8AaZgH/vxsyWgq8P8Ac9RyGKsMo/8ASEzldXX6cmlKKwJ4zCORN5UAeHe2/TfG949wL6n7aBjeZxVW9pUqzOzCEIUiWqzCUAISEiwN+AjwlO1WXmX88pTWZJNrcg04tY67qJMLXJwE3skeeM5bGWAb2Z602aDZ/s99WbMSdFxVKO4eZpbnJVGanG1IKlIQSC4LJve4t0RTN7XaVg71b1VxFJ1NmaoM5MNyk2/LuBba2lNpBWCDY5VWPkMeSmp1CZlBWE5b63iVVAImsymUOIB+5qUQD5Um8CVRblfy28k2z2r6rrGuFK9g7DLOHcR0qqLam3lrTJzKXShJasCQCbAnS8JvUf4sw/Q6titdcrtOpiXUSwaM5MIZz2Uu4TmIvaPKLWIKakhKsLyCjzmYf18yoxp6qszL/KS1PYkkWtyTJWpN+e6yTCqay5Sz8ObjY2LHE+h/aRiF5h5DzS6nMKQ4ggpWC6oggjQgxt3qfK5IUj1RmGJ6qTsvJyrTzpW9MOBtCRyKxqonS5sI5AZhR3/VEB0A6EQufU6XhM1PIz0n6qjFslVNtLTtCrzU9IqpjAKpKaDjWYFVwSkkXjl+zqqS8ntdwvNTb7bEuzVpZxbjigEtpDguSTuA4xz4vKNtw6oyi8mXqaVOsodQkglpZICtNxsQYbiMlHAKNPIfRLaTTdhW1SpyE7iLaPINLkW1tNdxVVlAIUq5zXvc3hLszw5sb2d7ZZyr0PHlKekhS0MtOT1TZWrlnHFZ8pBG5CE6fpCPDor9NGvrWph6e6H/APPFKsRU0Jt616akdEy//njcTSxyLwuXRnpie9VXjj+VR0StTk/W8iplKGTKouqWDtvH36p1vGb6ricwlXnaBibDuIqVUphCHJGZblJpDqwjVbaiEk6eOL9IjymuuSblwmkyrZI0IfdNvOqMMziVAjwRwhs66B/LbSumexvVO4zwvWtgeFJKi4ipdQm2ZlpTsvKzKHFtjuexKgDcAHTrjXPUhYow9h7GeInK/XKfS0PSLCWlTr6WQsh06DMRc2tujyup24uEg343i+ZhLE7LurYamEJCSpp0kJV0EjUeSJ5/YpHAR4fDbN72gTktM7WMTTUo+0/Lu1SYW082QpK0lw2II0IjuPqa9t9BwtTJzAONphEtSZtxTstNPC7TRWLLbc5kK333b723x5qaxBSib+tClf4iZ/8AMi6ut0soKWsL01pZFgpEw+SOkAr3w/Eb3Wg88FFxUFue5KFhv1P2yvEDuPZbGMospQsyrLlQbfTLhQNw0hF1KUQbC97A+WOR0Pa1IY59WvRcXzky1TaQ0+ZeXVNuJbS0yhpwArJNkkkkn41o8wmaQU3GUnn54tmdsbaX46wyqLqcsfDdNWeztqG1im4W9VtQcW0SrytRprcg0zOGTeS6lbSlqC03SSMwGvkEY/qim8E1bGOGdoWG8TUaacmJhiXnmpeaQpeUKCm3ikG4AHgm+6wvHjwVEpNhlvfdfjF+YqOSXlrpSkqbJ064CqQTM/DZLqe3NtO1jDeHdt2z/FVIr0lU5SSEwmeFOmEPlLSyAoHKd9rkA77Qvo+3LDONPVh0mqt1VMjh2n0p+Xl36ioSwU4pF1E5jYEmwGvvRHinu5JVYAX6ItrmAq5CRc8YHEjbQy8MXU6p6oaq06reqFxVP0udYnZR2ZSWpiXcDiFjkUC4UNDujjkzqo2i+4+LWJAEYjrqSfGB8sQnK562Ho8OKRiLGphrO64RkSPhrhYfC3G46DDWb1wfI219kXE11Oma5RIkmxuYrQMyrb4tm8ShZSq5hFuUd7Ow5m8N1mRkETs5TJpiXXazjjZSnXdqYUqAjoWJdp7+IcENUFUktvKWiXFPZ82QW3W1jnZUom5hp2T8pHDurJPiIpVcQ6l/vMmPlkwmPTDmX+82Z+WTAi+oauy+Ykg4wGCFLBz9MF4i8TGNYId0T3Nq3yA7YSDfvh1RD9rqr8h9MNDmJ1uUTHhEQA3EETHCCCCMYIdYXv3+FvxauyEsOcMffAgfoK7IaO5OryMx5SUZmqmlp6fl5RC3AC8+F5EXJuVZQTYW1sL67o6XtSwHgLCtHwq/hLG0rW3KhT+UnXG0laWnU+NayQUgqOUJV4Xg342jlLirTCz+kePTGVP1BybalUqe5QNMpTonLlOtxbjv3xupVbGI6lKFEIWFp3XykdsWFRUSbcL7opO/WAwkb4yqd7qS/wAoO2MS+sZMh7py5/WDtgLcEuVl+ue7818eF8MK57vzPxzC+C9xafKgggiTAHIiYiCAkFDrEG+RPHudMJbw4xB+A/2dMJjuh5bk6C8iC/RAT0+SI3awdMKWsF+eCCCMEeufeIx/aD2GEUPV/eM1/aD2QigsjS6/MIIIIBYYJmFc94yWJk5gc26LyaGkf1nK+nF9qihKge+Ut6X8YvCLucNRwNmnktzlBYWVu2YYW4FISCEq0AzX97rCFhQBT83VGwokFKoTBTUpQLQoWJULaa7tx3bjC7uEvzTkw5UJPO4srVkISLk3NgN0d1aCdmTr1aeXTc2uhOJPex1bmUAqRfeRHdtvZL1aRZxRCaQyQgnQeDfSOGUKSBpoT3ZLK5N0KFjwO+O/bY5BU1US+FoCDSmW9eB5O++OmlHyM+NrTy42CR5NWRy41G+Ov7O1A7HtpQHGmS+o+UMcwmKSpM0LzkuNR768dSwBKFOybaM33S0b0xjW+g9lieFVpM/RPCJrNf2Zy5Kg1PocB1QoKjpFOA/lKoswm1nZmXXp8dMaGinhcybTbFr8I6lhyld0TWHJ0vtqLc0yhVtdQ4mIPaSPn/GsTH4eomYW2O/8r2IL3H2Ve4+KmMNFTRObK5WTk5WqKdp03yq5gNoLYCkAOJCgMxvpodBqd8bPtdpCV7UK87yiQTMXtrp4CY5rKPLps442pYdl3G1tqZKzkVcWCiNLkGxHSIOGq5W0zyvBMVF4ZR7qxkuTYmqBM0h+TU1MNOJfZYAyhJA8PMm+8ixHljGZxS85SpClJblGzIFwJUhtKXFhRuStfvgDu5oRomUGohxx5alKBLnh3Lhvqb24iL7NJUJfu1uUSJflQyXwvN4RGYJBOgOW/mi8ZOMtDrjQjC8ejPV+yetit4K7jdecWtkEEqN9+6x5o2Ntl9E0UpQVFveUg7o857Pq+/hfEKJhT7RZKgHW1u2OS+mg49UelKdiWTUuXq8i40sZbmxzA3vvHNwtH0mGruVK0dz5CVJ4LGSuvJP7GcGeVaDqRlRfeeBtft3RfkZp6Xcuw4pB4gHfzi3RD5iitVtk1HDeVKyAp6mqN8pPFN946IxpentMvFmoSbrTliTdNiDfXQ9ESWMhJOE9Guh9FSr5KeWrHNAtzFVmFt3YdTmKDcpSBqObyQsaDs1P2UsLzHKpShm0txh2aTJJlw4hSnrWQlCvfg3NocUujzSmVJl5JSmnjYKBsojjc8wicsXSoxeUWniKNNNYenZsS0qRdl5xAaUC6FgoKATnudOqOiuzHeqntSYdSXSeUdKzz8IxGmKbhiWC3FIcniLJSDcJjWp+uy8rOFysWLMwstnwhnJAvZPTu88eRWm8ZPNbRHFNTi2k/PL7CLGuE6PjuZlu8jyGqo2+lUxJL3qbB8JST0c3GOCbbH0z2P5iTaSpLVOaTKtJykhSr668D0dEd6pzhwrTJjEzrbsxU51QalmF2S+m/ipIPE2ueeNXptVwdtZK6PjGVapuIxmZbqjICA8pKvEcSOI03+QiLKrOjpvE+ujP4DBLDuynPVnmV+RmqpiOnyKBLBp1sjM5ZLKVOXzXN+FujWNSxAUP4vnFtNqbSHCjIQkZbae904cPnjuWPcF1PZ7id/u1lKWuTVyLzSjZaSfBUCd4vw6I4yKeuZn1OOzCeUWoqUSN5JjnrNSV11PKoRk5tvojfmkq/wDVKmxb/wB4Ua/3UcrGdh0mXUnlLeNxII1GukdrYpRHqXpmXW8gXxAhVyP1Uc0MjJSiX1LmmHFrQUIVfRBO8/NEKdJi+ExcZVW1+pmw7DBfbPSgfxcxr/dKjl1XSO7Hjf35A88dZ2NMtM7ZKYpuabWrk3/BHySo5bVZJJmnCZ9jxzpzR3V4PhI+0rO2DgVuZTMyo/UjUx2+js5/U0yYUTl9cepAuQOS4RxpqSYVMy5XPNAhoC1t8d8oUm2fU2SyUTDZtXysKJsB7FE8PF3PzzxiStTS7iOXk5ecxrT5CSWTmdbayKJKrk8CeEbptpz1LbW3R5dJPJBmVQAbjcB9MYWyGiKqW2elvurSpphxUy4q4JsgFW/m0h7h+Q9dHqgJ2vTbqHJdh9yZJGovfwRFsv8AUt2PO8SxkaVCTEO3mqLlqbTqGgWbaBUBb4ICR9McLk6nkJaT4yjHTdvtTlZvHAkpadQtMs0EKVbiTcjsjjDSEImUuCcbuk33Qzn/AFNCn4fwyWDi2tWbszyqGW1OJvcE2PXGHUEIcFwLGMoTLb0ix9kIBy77wnnJjIFfZCNI9VySirM9enB5rJG2UDBmMajh6Wn6RgtyflitxSJxOX2S90EWPAEadIMXhs+2gpC0r2fzRCmUNXBSLFN/C6zfXqjn6q/U5SVDctV5hlA3IbfWlI8gNhGO3iesBd1VybI/tS/rjklWW1znqYPEttpqx0ZeA8fZ0kYDmAlITdJCLGygdBw3Wi2jAeO2if5hv2DhcTqknW+h11Go6rRpy67UnJTMmtTRNvyhZ+mFMxXKwhsLNbm7n9ev64SU4rVMSnhcVtdfR/ybsnZvtBTPB5WB33WwkpCCU+KRYC9/LeLZ2c7QU1xyoesaaKHBYsEpy8OnojQl1+tBoLFcnBc8H1/XFs4irIJvXZz9+v64g6sX3OqOHxS6r6P+Tf1bOtoZayN4AeFgkBV038FV+fXiDF2X2c7RkrfUvADzgdKTlUEWFk28o1v1iOd+uKtbhXZv9+r64j1w1u3u9N/v1/XCZl0DwMT3j9H/ACb3UtlO0SoT7kw3gibYCgBkSUaHyW5/mjCTsY2jZrnCE55VJ+uNRFfrZ3V6b/fr+uKxiOtgaV2c/wAQv64Hk6jZMWlZSX0f8m4/yL7SDK8mMHTl8173Qfpi8xsd2ksMZPWRMqVdRzqyE6i3Pw3xpgxFXuTChXZ0629sL+uIViWug27/AE4P+0L+uA3AVRxj/Uvo/wCTdRsj2kpceUMETV3SToUjLfgNYBsp2mC/8yZodRTz9caP65a5f3em/wDEL+uD1y13hiGc/wAQv64m5QDwsX3j9H/JvLmyjaW6q4wZOIGu7L9cVNbJNpSP/dKd67p+uNE9ctd41+cPXML+uKhieuAffDOf4hf1wqnBO+oksPimt4/R/wAnRhsu2nJlVIGGZ8EkEeyD/NGOrZPtNvc4VnCee6P80aMjFFfLCiK/PdfdC/ri0rFVeub4hnv8Qv64aVaPuRjg8Sne8fo/5N4d2R7S1jTCc/frR9cYq9je05Q0wjO69KPrjTVYqr3DEU9/iF/XFJxXXiNcRz3+IX9cRlUh7nRDD4pdY/R/ybavYrtRWq/rOnvIUfXEDYhtQ3+tCeH7SPrjUvXVXLffFO/4lf1wDFVdAP8AOOd/xK/rhL0/cvlxluZfR/ybtL7FtprbbifWdP3UALgo5+uLg2P7UEW/mfUObej640cYqrxaWfXDPKsPyhenzxZOJ64d+I57/EL+uBnpra4joYuT80o/R/ydAGyXaiD4OEah15kfXF+W2VbUG3nFqwTOOBbZbspSOO4798c59c9c4Yknv8Sv64n10V4f+8k9/iV/5o3Fh7g+FxPeP0f8nSTso2mLmy6rZ484kqUShRQRqgJtv3C1x0wP7KtqDzsssbNFAsAC1kEK8JB18L9Aj9oxzlOKq7//ACae/wAS5/mgOKa6TriWcP8A2lf1wjlTYypYuO0l9H/J05nZjtMQ+44dlzhzt8mU+BZPjC4F9/hecDmiZLZptRk5mbdb2fTQ7p3IJQQ1oRpr0nT6o5m3imvHOBiCeV4JOkyvT54xjieuqNziSd/xC/rgcSEdgfD4mW7j9H/J2AYB2npUlLezuYQgqCnE5kELOt+OlyfmEYc/s+2kSeG51U7gKYRJNshbjqlIBaShBBVe9+Nz0iOVeuaunfiWd/xLn+aBeIa08ytpzEc2tCwUqSZhdlDmOsPGtC+t7Ajgayaba+j/AJNhamqlLttoVhVp3KhKFFRHh5b69BsYUPiqLStAwwwUlktXWAop1NlDdrr8whEtx0n3UPpKii7lvdRXpmPQ4vh7Sunf9j06dLK79f3OiUzE9Tk6dLSbeC5XlGVlZeJTddwoAG4OgzfML9GYMW1PNNWwFKjl3eVvmF2zdvRNxu9i3fpGOZS4d5cEVFSjzZzGOovcob1ZY6M6vrhliMCtMr+wPhqblf8Ak3GVNWYn5yaVhYL7pLSw2FJshSFhZ3g6KtYgW0jYG8SVNE4ZlWz2XcGcLSgKAymznQfxg8qRHLbv30q6/TV9cSA/xrDh/vFfXG+I8P2yP6os6EHu/wDc2qclq3OSc7Kes5SW5icXOJKVAKbJFsgIGqRDrC8/iGgYXbpC8BpnHUOqdTNKWkLuSCN4O62vONNI52eWOnfhY/vFfXEezA+7Tt/lFfXE+JgU+V/VfwWcYzjllt+52WVxPiVsS6hswYUtt9Ews5kWdKUpBBFtEnLew3EwO1rFExWpqeOzSXyTMuuW5AqSA0FBOqTa4IKb+UxyGXcmRMotV3l2Pih1WvzxZefmS+v7dPp13cqr64zr4RbRf1RJYSg5ar/c7U/XsXvtzqU7MWPslDyEkrSVNcqlKTbThkTbm15454zgXGSEKbXhN50K+EQCNLaEK0541YvTFvd1798v/NEh6YOvf1798v8AzQkquFf6X9UdNGjRpK0UdUlpDFjeE26G5szD6kkHusrSF2GfQDUDRduOqQYy25XGSUnJstTygUopWXEaJVluki2viJseHhc8ciD0wf6+e8r6/wDNFYdmeFfmB/fr/wA0Di4XpF/VG+Gw71aZ2WYRjR6oy82zsibbS0p0lnlUKQ4FlZ13EHw94O5I3QtrVLx3U8NzVKGy5TBfbQ2JkON528rpcuN3wiO28cwamZpDyP5wTJ8LxeXc1/4oJybnVTi712aR0cuv/NAlUwzWz+w0MPhoyukx1/JZtCP/ALqTpHxkf5oqTso2iHdhOe9JH1xr3dE7b74pof8AaHP80T3TO21xJNf4hz/NEr4f0v7HaqlHszZE7I9o5VphKe9NH+aLqdj+0cnTCM8f7xH+aNW7pnBuxJM/4lz/ADRUJqdBuMTTQ6plz/NG/wCn9L+qG4mH7M2xOxraSf8A3OqB/bb/AM0ZVS2QbRlzhW1gyeWgpTZQWjm+NGmidqGn86Zv/FOf5ouT8/UVThzYim2/BHgmYcH/AOUBvD2tZiZ6DknZmwDZFtKCrHBk/wCm2P8A8ok7HtprlwnBc/v38o2bf8Uar3XPHdiaa/xLn+aKhNz3/wDJpr/Euf5oVOh2ZTPh+zOx0/De0ORkky69jnLrCQkv8s2F/cg2VDeAbC4NtCTGRLUDaOibU+9sWS9dlDATyzaQlKF50kWHjXABPEDdrHFhOTvHE03/AIlz/NFYnZ3hiab/AMU5/niiqUlsjkeHwTd3F/U7hIUDag3NvvzGxpqYXMNFtxQU0i5zKUFc17EJOguEjnMZkzQ9p7r6XEbFg4kMIayvONKsU8UkWypPMOjWOCd8Z8eLimcH/anP80ZM7Pz/ACjajiWcbugad1Oa/wDFGdanYg8HgHLWL+p3VFC2nJnHHf5FFFsuLeQOWaC0rUSTdXFOtgm2lhCPE2z7aniOXDDWyeYp4MyqZUpt1oklSQkpFiLJFiQNdTHHxVKhwxROf4p3/PE986gd2Kpsf9rd/wA8K8RBqw9PB4CEsyi7/M6fVNl21ioyiWV7NJthQYZZzpWz/R38LQjU316hDhrB+1BjD0pS1bHX3FS7baO6EvtJW5kKSL/okpuRv8I6xxcz1RVqcWTf+Ld/zxInKjwxVNf4t3/PCKrSXQ6JU8FPSUWdnncKbVJ3D85Tm9i5YVMyoleWbeaBaAvYoHAa3tfeN8J2tlW1NjD0rIL2bTc2OTKXwpxtNvCOl81725ueOZiZqd/vsnB/2t3/ADxmuzlSEpLA4pnR4JObut3X/igcWm9WBUsFHyxizpLez3aeZVDL2xpa1JSgZkvpSDkPgcfP8LjGVN7O9q0+pxxeyBaHF3s4HG7tgpykJF7EW113E3EclM/U+GK5z/Fu/wCeJ7uqfHFs71d2O/54HHppB4OCf6WdkmME7VHq8zUk7EmEqbASGlLQoEBSFa+Fv8C17XAJgRgTau0lLbexblWwCMr7zSlXzLWFAi1iFLvfW4SAY4yZ2pXuMWTv+Ld/zwd11InXF04P+2O/54XjUzcHBPeL+o72u03FUjiSlt4swc3hiZ7gShqXQpJDyEqI5Syd2pIjTppIGEJH5ZUZz7HdawucrwmFpFgp91ThA5gVE2HG0VzMnKqw9LS5qDKUoWohwjRRMckmm3YjUcItKCdjVCk8xinKCdYdd6ZRQ91pbzfxiO80rwq0t5v4xK5TOriXpB3QWh13mlr+60t5v4wd5ZX87S3m/jGBxIiM3HCHEuf5mzXyyYuiiytrd9ZfX/nnjNap8q3QH5cTzJQpxKi4Nw6N8NAlVqKy+ZqkF7Q4FJkTqKtLn/nrg70Sd/deXH/PXGSbKcWInuN14LGHHeeTvfvxL+f+MHeeS/O8tByMDqx/4hOIc0QHvfVPkPpgNHk7e7Euf+euGNMp0uxKziETzTocbsop3JHOYaEXclVrRy/+jVQDaCxhz3klBoKzLCDvLK292pbzwmRleLDv9hNBDrvLJ/nmW8/8YO8smTpWZbzxsjBxYiWHGFwe/wCj4iuyJ7ySZHuxL+f+MMqLTJeVqqXW6gy8rKRlSf4w0YO5OrWhkf8ABqrt+6XPjGKAemHrlFlFPLUavLpufFJ1HzxQKFKfniW8/wDGM4O7LKtG3/oTlxRQU5t/T0RSrUw77xSnCsy3n/jB3klB/XEt5/4wMjNxYf8AEIoyJH3SY+UEM+8krf3YlvP/ABi5L0WWRONqFVllEKBAB324b4yg7glWhlf8GFXQfXBNfHhbGz1SkMTFVeeVU5dpSlXKFHUfPGJ3ilvzxK+l/GNKDuLTrQyrURweUQ8NClfzxK+l/GIFCl/zxK+l/GNkZTjU+/2EkHMb6Xh0aFLj+t5XyK/jEd4pfcKtLa/pfxjZGHjQ7/Yivj2OR/s4EJY22qUpuZblLzzDWRoJGZXjbt2sL/W8zb3WlfS/jBlB3JUK8Mi1+wigh763mfztK+l/GD1vM/neV9KFyMrx4d/sIrXgtppD31vs8KvKelEjDzX52lT+3/GNkZuPDv8AYN+A0dEx9EIbi++Nv72J9bPcQnWCA7m5XMMu7dCwYfQf60lPThnBk6VaGuojtBDz1upP9ayf7yAYc5qpJeVcLkZXjw7ilKjfQxfQs23iMYc8XUnWDFglEZtzZEuloG4BvYxW0Rn8a1jGC2dd8ZzTylMts2TlQSQba6x0KTdiU0rPQ27DS7TBbzpHKJtrxj1Jj95uexXVaSQ2FJpUq8hauCeS8JPNfdHk2irIeRruMejto8+iT2xTTjqnA33plkKCDa6S0Ab+e/kj0cM/Iz4zxCFsZCR54qsq23U1oTYpCjY26Y6ls8lCdj+0qw/qyW4frY0vEtLdYnrqymxtdJBuOB088dE2cotsc2ji2+nS3/ixqMWpM+58Gld6dmc9o9GdmpxDaG8xUqwSBcnmHXHq/AGyFml0WWer7y+6A4iZRLsHKGlCxAUeJ6I43salpSY2qUduYCSkOlYCuKkpJHziPXg1TfW8edJ+Zn5H+MvFKsK3AhoaBjPZbSMTTE1UGZhyWqDxzFZIU2pVrajh5I8p4tw3O0DE71PnZctvMryqTbQ9I5wR2x7oWDfTSPPu3ynMqxLTZttI5VyWUHCOISqySfOYD02PG/DPi1WGIVKezPMS6cqeW9leQh9JshtQvnFiTY7ha3Hfew1izIFbqDIvhaEps4ApWVCV8679Fx80Zc0y6xVOVbKklK96NCBfgeEXqg2moU5FSbl+SUHORUEgBKgE5gSsm7jhuok23R10vNsfrqlGrBWIpuZU0izd3FKyoUAcyepN+bQR1Wi16qYK5BmYm5eZl3ipTjTas3JEEXHOCLjfxJHCOSSs0ZTOospWtPhpWTYtr43+rSMlmuzYYb5V0OtJUDrYJz8ygdSANSOePTw1bhnHVwsa2k0etML7RpEBtcnUC04LKvmIUnoIjrdM2m91shM4JWdSN3KJ8K3X9MeC2J9PIqfamUs8mVJum6Fk5tE2I1KtbDcLRt2HqhiOaaZkKVPrdLq02SFgHMq/ga9UdzVDE/3FqckvDaqtGlKx7hRjahJAcbpUsClWhzA2NuGkXnMUl6R5WXfYlmVKKAEAApVzHmjzavBm1JbyWw2hTYyqzB1IFyBoecQ7oOE67KOJlMUYjp8tJzLg5RAeC1hQvlsOYc0c9Tw+hHWLOmX4d8RqR1dl+xvGMscSFNSZKU5VyafaOVSk5rncPLvIjXJCmKakDi3GE+tpLCA4inrFllemVZBO6FFbxrgPDTjxosgJ6rKKxyyiS22QbXSk6Ef83jkmKsa4lxG6zVp1QfaU2UNApAQsp0UgJvc2ChbTjDeWEcqVj0MH4fhvC4udR5qp2FqrTuP8SuurmJWUmmBdunzS1oS8m2hTbUruoWHlhixgeYrGIZLE0pUlyzjJDE628UofYWCAkuMpTYJum5PEHnMcqwDTZ/E1Sbw/TZqSl3XXOXDz75LicrfvbDOFC5sgaG27SNzxJP1N6VoNJnKxThWpYPy/dMs+Mq2EEpRywAupSlDQ346gGOGrJt5Ys8StUlXqupU3Z03GFMpOKqFOUHFdep3LUtanGltgJcKSm90qVpe4UMttNI4Vh3ZIxU8SOvNTDq6I0rKJqwS44fggcFfXGLOYgqT1YdkcSsOP1BsNtd0tkIeYyGwbuLhSb2uTwG+PQezqry7ey+XanZRD77ilB4LKb57kKNwN+7yCBShk13Pofw5h416+We1jXl4Tw2nBxwx3paVTy8JlTZWq5cAtmzb72jgm1LZiMPMd+KOtx6nFWVxLmq2Sd1zxSd149Pzkg8iWRN5bMOnwFHjGj46bYXgGspmQOTEqu55ja4PnA88evGjTnB2P0Or4Xh1Tk4xSPPOxdgI200nQD2N8bv1So5XVGPsp3QAZz5dY7HsgSBtkpRG/K8dfkjHKKo0TOOC1/DNvPHnYmNqSR87i7Rwsf3LzMvytRlU2H3FI1j0XSZREt6mtlgOIP27UTzH2KOH02nLeqUqlKdS0kax3JUutnYIzJtozFNcsMvH2LhE8PG2p+b+L1FaC9zbdkdOTT8K4kxUcrREt3ExfXw17/mt54U1WrSeAMLFbJS5OzPhcL31N+qNynEy2BNj1Hp1QZSFL+zZlBNiXCPBT5NI8w49xg5W6w89eyAqyU8wh1Uy3l3Pn54V4+uofpW4unKzQ6lVZlWIpOYeS+4VmallnlWyf0TooRjO4ATPNicwxVWKrLE3IHguN9Ck7weuNVecU+7vuL3jaqJLP0vDM7iXlVMrSO5pbKqxW4oXPWAntiOHoupJyP0jwzDRjTVNrRIQVV5yQmmZckpsmxHVGIubL2VI1vziKa7U3Z1UouoWWooKeWSLHfvNool5RTVNcqGcKbHgNnfmJjObcmr6CxoxcroXzz5U4QBpGIlBcPi+aMksLd4W14xvdCwAEUVuu4pqTdCpTn3JbqMz8z8k3vPWdIlaU3dbHPiK9OjuzSpcONJy3IB3Xi5MIccaCd46o31dY2W00lmWwrVKtbe/OzvI5ukJR2RT68NnV7DZwP9puRVZVvI894upvGmzRHpNSaWwSNCYsCRKkEZdd97R0U4y2eFsIVs3SpI3fbNyKRjDZ2BYbNUf7TdgPJ0kjLGVrf239v5ObKllA2CdeqI7mc/5EdJOLtnRNzs1QP/mbsHru2dAa7NUeSpuQvkX6kN8ZW/0n9v5OcCUXl1iTKkDxRHRfXds5/wBGqf8AabkT67tnV9dmyf8AabkbyepC/GVv9J/b+TQESyjTyrQeHzRZVKqN9L+SOj+u/Z2EFI2bC3N3zcin13bOv9Go/wBpORnk9SMsXWX+J/b+TnAlVc3zRCpVegA+aOkjF2zof9Wyf9pORWMXbObf9Gif9puQjUPUjfGVv9J/b+TmBlXAd1vJEiUVvIBjppxbs4P/AFZp/wBpuRBxZs4t/wBGiR/8ycgZIepG+Nrf6T+38nPEyyhTXlAWAUOEYa2FAHQeSOojF+z3kSgbOE5TvHfJyLasVbOVeCrZuEg/BqTl4zpw9aBHGVutJ/b+Tla2iD4sYrqbHdHXFU3ZtiYFmnTc/hqdVohM8oPyyjzFQ1T1m8aLivClWwvVO4qpLFBUM7TqTmbeTwUhW4iIVKLSumd2Hxcaksj0fZmqKUQYgKJMXig77QJaJO6OV6HoqRlybZMpMq5kjtihLClaBN/JGy4OwvVsTTb1NpUop91aQSdyG08VKUdEjpMbsig7M8LgN1qrT2I59PjsUkhqXbPMXVC6vJbrjlq4hRPPr42NOTitX7HKRJL+D80T3Cvm+aOs+ufZg3ojZstY511Ry580Hrs2af6MUf7Udjn+Kl2Ob4+sv8T+xybuNwbh/wAMR3I5a1vmjrPrr2a/6MGz/wDNHYBirZp/owR/tR2N8VLsD4+r/pP7fycyp0k4p5wAa8moxh9wKtoPmjrjeLdm7Srt7MwkkEaVR2IGK9mf+jFH+1HYDxT7CrH1k/7b+38nJu4FDh80Hcaxpb5o60rFmzM/9WKR/wDNHYo9dOzQ/wDVik//ADR2N8U+wy8Rqv8Axv7fycmMmTw+aIMmoDQHzR1n10bM/wDRgn/arsSMUbM/9GKf9qOxliZdhvzCqv8AG/t/JzClyTi6mhJTpZWluiMRdPWXFWRxPCOut4s2atuZ0bMkpPOKq7Fw4t2Y3v8AyXo/2q7BeKfYn+Y1lK6pv7fycb73L+CfKIgyKkg3THY1Yt2Yn/qwQP8A5q7FhzEOy6YVkf2cuspO9cvU1lQ6gdIX4l32KR8Srdab+38nHHJcJJ3XHRGKpAAvaOyKwPg3FYLeCK6/KVJXi0qsgJLh5kPJ8EnmBjmtYo09R6o/TqhKuy8yyvKtp1Ninr+vdF6eIUtD0cNjIVdFo/cV03WqMDnXFuaSDUHrj35jMp7ak1eX00zxbfbzVF/5Q9sdcNTvppSqWRjJazEACLqZc5eJja8K4KqeJ3XVSnIS0lLjNNVCaVkYlx+kriega9Wl9jclNltDBaWazimZT4zraxJSxP6PviOm/kjsp4VtZpNJHq0sFJrNLRHMwwoaWN4O51EXsfNHRVV7Z2NEbNEED4VXdvFvv9s//wBGLX+1nYf4aHrRZYOHqRoTEse62ha5zjhF+flD3zeNvfc3RG8JxBs+QoH+TJoEf/F3YuOYo2fuuFxezForO8mrO6xvh4L9aE+Ai5XzI533Kq+75oBLLBtYnyR0IYj2eEWOzBH+13Yg4h2d/wCjBH+2HYHw0PWh/goepHPTLKB8UxBl1cxjonri2d2/6MEf7YdiPXDs7I12YNeWrvRvhqfrRvg4+pHPRLm4zDjGZVJQ98ySk+KneOiN29cGzq9/5Lm/9rvRedxRs9fcC3dmCCbWv33e3Qfh4etG+Bje+dHOO5iB4pg7mVwEdF9cOzf/AEXp/wBsPQeuHZwDcbLU/wC2HY3w8PWg/BQ9SOd9zL5j5opUwsbwY6IcR7Oj/wBWCAf/AOsOxbNf2eH/AKsk/wC13Y3w9P1o3wUPUjna21pBuIzKu2eWYN/6ERupqWzWbVyczgip09J/pafVC4pP7LmkTWMFsVWlKrGC6mazKyrV5iUW3yc5LJ+Epv36elMLLCu14STIzwLveDTOb5SIkJvGQWlfNEJRqLxwTvHc4pU7MhtscYymmbndFcsxmVc2sN+thHVKDsrRL0CXxNjytowzR3xmlkLaLk7ODnaZ3gdKo8rF4+FBeZ69jsw+ElV2Ry9MkSNExnzsm73DJAJNg2R88dRNY2L027EpgOu1hKTbuip1QsFXTkbsB1b4uHFmylaUpVsjbUBuBrT2keTLxqa2ps7n4bHrJHHRJug6tmKu41neg+aOuqxRsn4bHmv9tvRb9dOyi3/Q83/tt+EXjFT/AE3/AM/cb8vh60cn7iX8E+aKTJucEHzR1n11bKf9Dzf+234n10bKP9D7f+23o35vU/039v5N8BBfrRyFUm5mHgEmM96RUrCsqSg6Oq88dP8AXRso4bIUf7bfi4cWbLiwlk7JEcmk3Ce/b1hG/OKn+m/t/Ik/DoSt50ccEir4B16IrFPNtUfNHYBijZOAP/ZA1/tt6KvXVsp/0QNf7aehPzep/pv/AJ+5T8vp+pHHxTzb7n80QZE28T5o6+cV7Kv9EDX+23opVijZSoa7IW/9tvwV4vV/039v5N+X0/Ujjq5JQF8kZbMp/NWdvp7KiOqHEOycn/oj81bfirufY/X5NyRlHa9g554jwphaZ6UChuzEeGB0xeHjLXNBkKvhikvLJHDHJcI64xlIsd0dFxjs8rmD5lkVBpl+Tmk55SoSi+Ul5pO+6F89uB1EaS+xl01j1sPi4VVeDucVbDOm7PcWEW//AFAYuLT/AMiLZjuTucT0AAQ7olu5KkkX0lzxhKnU2h1QtZep6/g57YeHMRrcjEm/UaRHlgBsICYCKhpEEgbhBeC2kAwX5ocYYURiFHSlQhNa8N8Mi2IG/iq7IMdxKvIxa97ac+MYtRdf9tOfGPbFqA27sdbE6Qac0RBeBdmuGnNGRJ274Mi1vDHbGPF+VP2e10LEGL1BLZmZiA/zhmdPffRCyGeIPvhmD0jshYYaT1BS5EQT0RHkgO+CFLBE3vviIOMYw8rpKpKmf2cQkvDuue0aWf1EI4MtyNDkRN4iCC2kAsGvPBrzwQcYFzDxpROCHOiY3+QQluq2+HUvrgaY6Hx9EJPew8uhKn+r5heC/XEQQo5cG6KkkRQnxrXircd0MZmU2RcRlsC6tLxgNqjPlzrFYnPUWjNipQyzKBcG5G6O77Y3i3tPqVlWPeqW4fqkxxSmyLCaTKVFFRl1vOvqbVJAHlGgkAhav0Tew6RHY9t5/wDadVCL2NLldf7pMejSdonyfiMP+qin2/g1pyYar+EJeaAUualUiXeOUBISPEPWReH+BC4NlO0ZpKVEmnS+idf6WNewXP0tnDs/KVFb3KOKbS0FLCGQDcEr4lVyMvlgkK5XME4gVOUSomXdtZeSym3U38VSTotPHXni1OSW59H4PiY0qjUixhWsTFFr0tUpddnZd1LjZvxBvr0cI9k4Sx1QcV0tuYk5xpuYyjlJVxYStCuIsd45jHmtiZwBtE8GZTL4NxIrUPt3NPmlfpJ3tKPONNYSV6hYowNUkStZknGc/hMPoVnafHO2saK+aOSth3F5oHifif8AB68Q/rUXr3PYlXrtGokkuaqVQYYQkXyZwpaugJGpJjjFYxhgfHVRXJ4hZfo8wklEnVGiVhCTuDqebn+iOKIxK84VMurKkuCxubnrhP31caquRSjcX49EcrjK+p8jhvwhLCvM35jZ8cbM61h4d8lIZqFLdOZqpSSuUZWDuuR4h6/JeNFk5p2lTnKAFbRSW3GyRqk2CgDqASPfcI2HDG0/EOFZpaaZOAyrhPLSUwnlGHhfUKQefnEbcKbs92lKK6M+xhPEDn4BMKvJzCv1a7eBfm+Y74aNRwd0fQ4eviME0qyuu6/8mhMU6TqqFzFLdacnXUKDko4kgpGa51PgqAFvC3k30hE/SVy4KO5Ji10qCCnPmQRvUCN9rRsWIMHV7ClaVJVunPSbw8XOLpcHOlW5Q133jasO49flm0S+IqTLVqUbUg2dSEugIFgkOAXsBbSPVoVYVNJaH0+Cr4bFbuxyZanlPJbeTm5EjJdR0BNyTx39MPKXVGpDklsqW0cw8NJ3q1zW6N1uaOoLpGy/FiiJOqmhzbywSmdASw0CCTZSddDoOvyxrsxsuT3YymmVSUmEO5nEKbfQfASba66HTQHW0dcabi7xZ04nAypLPCV0RMbQ6soPS3fSbDfK8pbOrSxI01hlMTss/g+Rr1MrTz86h4MTstNaZFqN0raG9SCNCTuMajVMJPSUs/OKm2VZXMhQFgrJN+A4aG/NeGdGw5JvSrc7O1lMmkpUlbbjigoBNlABNtSoHTpBgqrUcrM5XUr1VlzGPVZ+WZqTvJqWCMykZVE5SdFpKTbQKB0G+CUnJ96pyKUTEwwltRcbSoW5ICxUtN9wIHDmjYcT1ChVJ5UzJU9pqYalkNFKAfDygDlBcmxI1V07o04TM4+kpWo5SorNx4R04nmieIqKO7uclenTppuTOmUvEtAmJBiQLXeSaBbS3WpUHKo5yCt1veSEm2ZNjpu1hg1QcQtVVifbZTWpIEutOyoS8FJJKTYJ1SVX0zDSEWGdnNSqlMRW6s+xQaG0nw6lNjKFD9Wk6qPTujaJLanh/BDwpuA6c4qVUQmcqk0q0zMJ4lHBA327I8517y0PnMRi1Ulkw0bs6NJYSostWmJnE4TJuuuMpkKK2pD0zMJAsEOHde9zzxWraBLUCvKpdRoTFHpZTyaG22sqmFjXwr6rJBvf6o4fOz85iDFExUKK4844gl9tuefBdJSN4WTZS7WNgN+6HqMdzWIsTSspjZc2zOSB5NubCElbOVvKG1giwRcXVbXfF6EpRle56/har4Goq97vselKfWMPT80hZxDKMNqV3PlUsaKKb232+mOM7bq5JNPqwvSTMPMBSFTjyklq4volN9+4nXmEa5PYFq7WFncSSU0male+a5JpbQUozl75XErOhtbQ2HCOgyFDqNewtNObVpISDPgiWq7yymfcSiwQhLYvnT4KtbaXjoWIcZXTPs5ePV8TBxhGyOQ7JJDPtlp7kql1TKUTBSFg5gA2oDNzRy6pyKhPLFrHMTr1x6XrGKJam0xpvZ5ItMUyYmS1NvqUgT8wE6rQogEpQUjQjn545CZGmztXnZlEvMyiFEqlJRxPL+EXBZC1G1rJJ1tvEPUlnjY83xDxCmsOqcZXa3KaJJplXkTkwhQ5NlIQBoSq2keidktEZqeBWJyq5TLy1WXOL5TQKKW9N/C8c0k8MMGfS/UnxLyzSG0oaQLrmVEaIQnpvqrgI6djaYncI7BUSzLrDL77yUlDGqWm1JPgk89tL8YDjlio9z828QxDrSjGPc5Htlx+7iOuzJZcKZUOHk09A0HzCOAVCZLjkbPX5pT7pI6bDm6I1NTSnHxeOWom3lR9P4VgskV3Zl0OmTNXrEvJSzSnHn1hCUJ3kk2jYdolSlWJyWwvS1hcnSkFkuJ3OvE3cV59B0CH1Dl28DYHVieZAFVqDamaW2rehB0W/wD/AIjymOaupMxNKUokqJuSeMdc5cCllW7PrZRWGo5f1Mt1CScnE05lpsrWtFgANSTGbV5HvaWaI2QTLD2Ug6KcI1827yRvtCpMvSaA1iqdSk9ztcnKNqHjvHcfJvjQ5xapidW+vVS1ZieuISiqdNd2cLfDp69TYsFUaQZkp7GOIGQ9TKYUhuX3d1TJ8RvqG89EaxiXE1TxHWnanUpgrcVolCdENJ4IQOCQOaNtxY73v2R4SpLfgibD9Rey++UVZU36kiOaunw76XjnrSyJQPCwy40nVn30+QFRUbiAoVe+sOsH02Vq+N6TTJ3MZeZm22XAlWUlJVY2PDrjoOKaZs+w++0W8J1GclHwrkZlNUUgKKVFKkkFF0qSRYjqO4xKFFzi5Jj18aqNRU0m2zkVyOeIDhjsLOEsG1HBc1Um6HOU6bVJPTko2ufU6ShvTlCMosnNoL77GORFCisJSk3IFumBUpShb3Gw+LjXvZWt3LfKKPHWJCiY3HEOzHEuG8KM16eRLKl3MmZLK8ykZxcZhw4RgyWCavO4Cm8XtLlUyMqopWlayFm2W9hb9MQODNOzWo0cVRnHNGWmxrtzzRIBPAw8wphtWKKyunoqMlIKQ0XC5OuZUaECwPPrG51TY9PUelOT81iKj5UtF1KOVUFOgfBuNYpDDzmrpaEa+Po0ZqnOVmzmAB4wWPAx0HaNg+lYUrFOlaW5MLRMSaX18uoKOY6WFgOaNnmtmGCKVTpB2s4snJN6cl0vpQmT5QWIBPi8xMMsHUcnHsc8/FqEYxk/1bWXY4xrzGDXdG/4sw3gik0QTFCxRN1Cb5QJ5B2SU0MpBuq5A3aaQjwxRaVWq+iTqlbao8upClGacQVgEC4Ta43xOVGSll6l4YyE6bq20+TNc8KC9hvjr9Y2QUWkUcVB/GjQQ6yp6WCpU2fsCQE+FxNh5Y1fF2D5Ch7P8OVyXdme6aiFl5LpGVNvgi14ephKlNXkQoeKYfENZHe+hpGYA21ikum1gTG4sYGD2yV/GnfGxamhLdy8n4wJAvmv07rRcm8IU5rYtKYsaXMGednFMLSVDk7C9rC177uMTdCf/k6fjKKdr9bfuaY27bojoGEKvLYhp/rDxG6FycwbSEw5qqSe97Y/AO4iOcxlybi25hLiFFKknMlQOoI1BhaMnF+xXE0VOLtuizVqPMUirTNPm2+TmJdxTS08xBtBSaY9U6nLyMq0XZh9xLTaBxKjYCN92tMtv4mkayhASanTmJtYG4rKLKPnERsbl2k7S0VJ1IUmmycxPgHiptslPzxy43+ndIR4t/DOr1sNcaT8tg2jDZ7h94JLQHfebb0My+Rct335E7rc/ljmSnc+83jIqU27Ozj048sqceWXFqJvmJN4xEJzeWPISVrsGGpcOF5avr8yrNzXiATfeY6/RMFYSGyyQrc5SJ2q1N9h6aXLMzpYKm23ClZQMpvlABI32ueEYGG5LAGIasqVl8F1JhtpCnpiadrByMtp8ZZ8DdwA3kkDjE+Kcv5hTak1F+X/AJ3OYEkGIueeNx2hYbp2HdoM5SqOl4SbaW1th5WZYCkBVifLGfhXZHifFdJNUlky0rIXITMTbmRK7G3g8SL6X3QeIrXZV4yjCmqknZPuc/ueaJueaNtxZgGu4OnmpWry6Al4XZfaVmQ5z2PP0GNoTsIxepKB3XRgtaQpKDNWUoHmBGsDixFfiNCMVNzVmcq1vFVzaGuI8O1TC1ccpNYljLzTdiU3CgoEXBBGhBHNGz4I2fSOLJRpbmK5CSm3Hi0JFxCy6oC2oIFrG580GVSMVcpUxdKnS405eU0PUjng15o7livYvQqNMpWzi1inS6msyBUUKUtagDe2VNteEafgjZs9jOWqMy1U5WQakQkuKfSogg35uAtCqqmcdPxnCzpcdS8pzw3vxgzHnMdWm9lNNk3pTLjKlT4dmmmCxKE8oQpQBKbjh1QixvgumYb2rLw0zUnmKeFtpVNTKc6m0qAJUQLXtzQVUReh4nQrTUIu+lzRbk6QcLR044AwAFW/lSlFdIkla/8AFCXaHgpjBNTkZZqqCfRNS/Lpc5Lk7C+gtmPXDKpFlKeOpTmqa3f/AINPaXlcSq9tdDzR1FnJtQwM/T5/2TFNIli/KTR+6TzCfGaWffKSBcHeY5XmHPG04Cq6qLtCotQQohKJttK7cUKOVQ8oJEaStrEOKpu3EjutjTWmQisy4AOq79sZtAw2/iPGjdJYUGy+8ordOoabTqtZ6gD5bQ3xbTUUnaxUaY2AES1RcbSBuAzEgeYwyw20uRwZjattGzyW0U9pXweWXZR9FJj28AlUs2fS+EWrTjJ9hXivEzU+lqhUJJlcPSByyrCT93I3vuH3ylHUX3DrjVuVUTr5Il5KknfpFg3CFHmF4tUqSqTse/JynKyL45xEm4jqOJcO4Iw01yjeH6lUWmXEy0y4mqlosuqQFpzJyGwUk3SoaXBEXMIUTAGKJltMzhip0+VceEq3MKqql8q8oXDaUhIJNgSTewG/fHWsBLNkudSwcr5bnKd4im3XDCUk252vs01Ew0wHpjkA8+bIRdWXMo8w4xv38jlQMoJwYrw73MVZA+Hl5CrmzZbXidPBVajeXoShhp1G8vQ5jbriOGt46BXcD02kbLpavNz7kzPLn3JNwtLBl1pStacyNL2OUeeL1EwFhya2eS+KsQYinqc29MLl8rMsHQFAkDcCeBii8PqZ8nUf4Spmys5yBrpE3I4Rv0/hvZwxS5l2RxpVH5hDai005T1JC1geCCcmgvpGiqshGY77XI5v+bxKrhp0mlInVoSg0imDcI3HEGzqsUiXpr1Oamqsiclw+oy8soBkkA5Sbm++MN/A1Sk9n0ziWpLdkltPpaTJPsEKUCQAu99BqeHvYLwVZX0G+FqptWNYvbjEFR4GNqw7g2Sr1GE+/jKiUpZcU33NOKIcGXS5sdx4Q8Y2UInEP97sc4fnnGWlPKbYC1nKBfcO2NHBVZK8UZYao1dHOM198SD0mM2i0p6t4hkKSy4llc48llK1C4QVHeQIY1PDqqJjw4bnZlDxamWmFutApCgopuUg9CoisNUkswiozktNhAFHNY6w1o9WnaPVGKjTZpctNsqCm3UcOgjiOBHEQ32h4ckMLY/mqLTVvrlmW2lpU+sKVdSLnURq6TZVjbywklOhUt1Qk1KlPU3XGMhT61RpbHFHlESrc06ZepSbfiy80NbpHBCxr1npjQwxdQjoGDVd2YWxdRHNW3qb3cgHg6yoEHzG0aYjIXRc6aG/zxLxF+VVF1NXpJuMu50PZpRaXJUuoY/xJKImqbSFoalZJzxZ6dVqhsjihOileSEmJMUVfE2IJisVqdVMzjx8JW5KE8EIHvUjcAI2rFye9ex3AVFZJQl+Seq74+G664UgnqAI8sc2cuFW4R8HGXHm6su9l+x3VFwoKEf3MgkmxSOHCJyrA1vGy7NaJT8S7S6VQ6ty3cUwtfLcivKspS2peh4eLG84hltluH5yXQ7g2vTkpNsiZk51qtZUPtniPA0IIKSn3pBiNXFqnU4dm2NSw0qkM9zkXhWsYkA9MdnrGCsDP7IKjiKRotTo9VblWp6Wl5ioF88gt5LaXFpyiwVdWUHUgX4xz7CGHmK/jek0WaecYZnZpDC3G7XQDxF9InDHQlGUtVbcM8NOMlG+5rWXXjEWI33j0076nnC7M24wZ7GTmRWXO1TEqQekEDURzXGezVuk7QqZhbDrdWdmJ5sFtFWZTKqUsqIGW9vB0389456HjFCtLLBlqvh9Wmrs5hax0iCSDxjvSfU6Vs7PFzim3vXOJjImmh1otFq9s+fgbXO/hujWHNmclKbGsT4jqj0wzW6LUhImXbcSpnxkJN9LnxjqDFIeKUZ8r62EeBqrVnK9eEQVKHP5IaUmQlalX5SnzNSYpsu+6G1zkwCUMA++UBraO4Yd9T9h+r4PqM8MXt1F632JOySFpYbKRc50kErHV2xTFY+jhNar9hKGEqVr5eh568K1wSYPCG8xtOK8L07Ds7KS1LxVIV9T2YK7kaW2WSCAAoLtvufNHRWNh1DarMjhesYyflsUTrAeblmZErYRcE5VLO/ceI3Q08dThFSb3NHB1JNxXQ4iSq2sS24UruSRHUZTZnKI2Y43rFWemG6rh6Y7maQwsckpSbAkgi5Buba7rRy9wZVlIFxfSK0q8K11Hp//AElWoyo2zdToOBsWSSJV3BmKwZjC1TWEOoOqpF0myZhr4JBtcDhrwjn2NcLzmFcXVChT1lPSrhTyiRZLqTqlxPQUkHyxU0RfKq9lDKbc0bptWUKlhTA+JVlJmJ6jdzPq+EpheQE+QgeSHw0nRrpR2l/uCquNRd90cXfSAoixEYqtFWEZ0z40YTm+Prqbuj52oiBvh1QNWakP9XMIzvEPMPH2OoDnllR0Q3OWtyMR6X3RESd8RCFAgggjGAQ3w2f5ws68D2Qohths/wA4mfL2QY7iVeRi6Y9tu/GPbFvSLkx7de+Me2LUB7sdLQIIIjyxg2DjF+W9vtfGEWYuS/txr447Yy3A1oMMQi1fmB1dkKyIaYj933/J2QrhpbgpciIO68RE6WiIUcIN0EHCMFbjuue5tLP6j6YSQ7rfuVSz+pPbCSDLclQ5QggggFgggggMDHssP5jTPyw+iEfCHkr94058sPohHwgt7EqW8vmRBBBGKFUViKjKTR3S7h/ZitMrNA6y7vomHswOce5SnQiM5hQjHEpNK3Szh/ZMX2pWbTvlnR+yYaCZGcotbmx0dz2ZCRmVrewj0ltCwxNY5ZmMcYPcZrVPdkWGnW5Q5n5ZaEAEON+MN28R5elkTbZBDLo/ZMdCwXiWv4bS7U6ROTUnNtlORbZIv0EHRQ6DePRoTVrM+X8Ww83JVqb1QuZDsq840UiywEKBG4g6Ho1h4iXVO01yXcU0HmkAFWa5cAOgEdKYrOBdp7BTjSn+tnEJTbv3JsnueYV+ub4HpHnhFiHAmIcGPNTE8w3NyRKe5KnK+yMOJ4ajdz2OvXFHS6o4qXiShJQno0cvdL0k+oKuBfQmN4wptbrFEpZodSal67QV6OUqpDlGx0oJ1QeYjzGF9YpL0/LCcZk5hWYXWjkzdJ6NN26NGm5WbYeUUMPZb6eAYTPKDPr8D4l2Z2h7B2FMesrmtl9TMvUsudzDNVdAdNvxDpNnAOY69Mc0nJKpSVecp9Tkn5SeYuFsvIKFp6wYSSzlQacS42h9C0kFKkgpKSNxB5467hraOnEKGqLtOozlalGWyGKq2kIn5QW4L/pB0Ki0clXc9eUsLiV5tJfY4ypxSXVAggg7/LGXKzi21eFqOaOpYk2OTD1IXiPA9QbxPRkjMpyUTaYluh5nxkkc40jlzlLnmVH7GdI5wLiOarhWtUcOM8Oyx20Oq4X2sTctSU4fxJJsYiolgnuOfOZTY523N6TGwuYHoeJpRypbM6p3WQM71DnFBE20OOXg4B0G/THB0MzqFC0q8D8Uw5pM1VpOcbmpbulh5pQUhxslKkHnBGohIJxPkMR4Y6TdShKzGtYpMxLTKwGHWXkHK6y4koUg9IO6LMnLTSyjMtwBJ1sSI65Q8YyGMJRqnbRqQ4++kZWq5KICJlscM4GixHRcKbLMO0x/vlMOM1htyy5YlspRlO5Skner5o9LDUpTeh4Pif4t/LqTjX5l9zzFM0hxT6z4W82G6MbuCZQ5vOnOd0e2JnD9DmZcsvUWnrbItl5BI+cC4jl+ItnuC8NTbteqrk67TQfYaZLeM4v4JXwTHRXwkqazI8fwz8fQxc+G1Z9Pc5ThLB2IMV1BLVLkeW5PVx5RyMtp451nQdvNG5zLWz7ZqOUZabxdXT4SXD4MhLK6Pxih5fJGp4x2kYjrMkaJS5RNEobfgop0iMiVD9NQ1Wfm57wqw/y9dpjmHXmVIeN1SjitwXvy+XnjzIwdSVmfZ4bA1/EGnWlZdkYuLceV/FFU7rrU93Tl0bYtlZaHMhA0FvPGry8wVrzZxbMkEZrX15ouT9KqkvOuy8xJvIdbUULSpJuCN4jLw7hWs1ytNSEhT5qamHDdDTDedSv4dJhI0HmsfQ4bwpUv6VOJDtTmpSZel2SMiyhwpI3KG4337uG4x1vAUzjTF0hMS4pVOXTEyCpB2q1EqbZlUFZUXM5Ni4Dute0Y0xgvB2AnzPYyeFfraRdugU9z2Jo23TDo+dKY1DFmO8W4oKJV9sSlMY0YpcmjkpdkcAEDQnpN47o0401dnrrCYehG9Z3fY7rQtqeFNl9LVRMNzS6++XErmKhOJPcyFA2KmWt50J159YY1fbJhfEm2Cj10d3SEvJXZfmGll7lUEmykJVuFlagi8eV2xUTa7KyeeG1Mlqm6+lIl3N+sQcYSeZbnjY7EZtFovY9k4couyuuV+fXKKk6kGbTUjNsPKadZvdRbCSACoEXAHObwgf2dy2JsNPVYOhmpSTrhDD6AkFCyV+Es6qUTe27TSNBwc6vDTMo67SZd+aUsWQ4FuPOqCtOTt4gINiRwj0PQcQzlUCZTFlKkpR6YSORkWCpx5Kd13OYAeaM41KfmTufKYjHRd6exyuk7MKxP1VEzOMuokhkCnSsKJIFwEdF4WbY8Qs+tNzCbSRMTK5hqYW6yAWW0IBCUAjernjtWLMeYbpVGaprdRckkvHkW5hhrOkaEG3DfoeMa3J7PsH4nkaLXafUW2ZdbYYmlSZ5JD4UkpVkCjcLzW4axV4htXqR0OTDYDiVVUpyvY8Uz0g44QLWB3c5h1hTBcupl7EdfQtqiyKruJtZUyvg0jpPHmEem6Dsyw04mqO1ScL8qG0Sy5ual0oaabJUkXCrLS4AE6jfGt7TaBhOsYbo0lh1c7ILZcdl0yTbBeacKPCWpOW5C8gKtdTe0PRqwUr2bPufDq0cNHiV18jzJiyuzuIq87PTASlIslplA8BpA0ShI+CB9JirCuHXK1WUtCzcugco88vxWkDeonh9cbKnBchVMWinUWuCZl3VWYemJZbSnPBvYpF7HhG/VDDuF6HPSOBqZV56bDuZFVfp8rZ9T1roQEqNikXFx0XisIZp56mxf4uM74ipsjme0Gtysw5IyFLSWqbLMlDDd7XF9VHnJ3xo3KlawD4wjp1c2bTE/QZio0Sefnnqa02JiSakXFOpufCVdNwEp4k9No0GUw5PzM9Lycs5LOvzDhaQ0lZzJUNTdNrgaiOStJymcEsZHEJzTHuMkd27MMIVJnVLLLsk5b3qkruB5jeObPNqvwjrOEWJafodQwfVp2UbZm1BxhxTovKzQJCbjeAq1jzac8afVMJ1KmV5ykVOXXKTDa8rmZJIA+GLDVPG4ha9NztKJ5uDrRpN0ZPZmHgXMjaVQVa6TzR/4o3rD/JT0/XZXEgbGG0T5cU86opLUwVkJCFDioXCh8EX3pEa3S6M/hfaDSX6qktMNzDb5eLagFNXB5TLa9iDeNyxNIYXqhbZaxozT6e0pS22VU985lqOZS1Ejwlm415rAboNGDUSGOqKVXLrqt+3/ALCnTVSfxjjFFYZSy+ijPtpZR4jbYCQhKP0Am1jxGvGNHwRRPXBtBpVMy3Q48lTluCEi6j5gY30VrC1LwZOsLxM1V58U92RlHWZV1tam1DRtWYWUkHdfcL7xaNN2fYxl8D4leq03TnZxwyymmQlYTkUffG41GlorJxzRzbEIqo6VThrW1l9NzvlXo9ZxFScZ0uo01ctKvhJpy1EEHIgkWtu8JI88c4ojAR6lzEGYZSl9QI5tW41fBu06qYcxaaxU3JmpsrbUhyXU8dSTcEXuNDbzRfmNodOVgKu4alqQ+0moza5hlwug8ilSknKRbW2XeLb46J16cvN1sedQ8NxNB8N7Xi9PuaRQqFO1yusU6mS6nnXFi+UXCRfxjzAR2vafQ2qvhGXXSHEzT2H3BKzLaBcoTlTcnqIB8/NHHqBiesYWnJiZos4qXdfaLLhCQq6Trx4g6gxXSMTVqluTfcVReZE6gtzJBvyiTvve/Pv36xy0akYRcX1PVxmFq1asasXy7e997nWNqa8KPT1JkquJpmouNS+WcTq2ywSc1031IF+EbphqvyLjbKG8VIrUkw2GuSapRvYJsm6kpJB3G0cZ2t1qhYgxJTpmhT6ZphqQQypaUKRlUCdLKA542mmYuw9UcF0qmyuL38JOybXJvMNMlSXlcVBQGt98ddOuo1ZNbHiV/DnUwdOLvfX9vs2Nsc1Kk1LDs3SaxjVhAKe6G5VVJDLilpBKEhVgdSbRyTBisLrxY0cVTjktIIBX7GknOoahJtqAeiNo2j4volVwfIUCTqj1cnWHS4upvNZCE2tkToCb9XARy5uyH0OrQlSUkEpO4jmjlxNa9VSR7Ph2Cawrpu6/5006nov10IxzSZuRapVSpEqwUuUueRKKcT4G4LAB0NhoNPNGq7SK9T67QcM0+sTjrdUbeKqilUsWy0FWBVlIA4XAGkOKjjTDuJWZOap+0KewwlppKFSCGF2SQOBR9fCNT2n4touIhSJClzLs8untFt2ouoyLfJtw5ri/XHTVrNwbbWp5eDwUadaKjBpK7+TtbV+5t7uNMEUlTWBzJpmsKqlsjs4hJUVOK15Qbr9JGt+gWI5XGsN+p+M/SGZedYE+5KsqmWLBaFE2WoA6Kt0xhmp7OsR7MsPUatYkdp8zTmbKDUupRCrWIJKeyNdxOjBrOBHabQ8eVOe5NwOM01xpSWlKvqrda9tY0qrUW01tYFLCwnOMXGSald3u07db92cqUbrJt0xel0qU6EpF1E2AGtzAWhm0vz6RvuBqExIM+vWutZKdJKzSzS/BM4+PFQm/vQdSY8qlBykfV1ayhTMba273PiSm0YKuum0yXlnADuXluoecxOx95pe0LvctwJ74yMzJJJ4LW0Qn541GuqqlXrk1VJtSFvTLhcWSriTFmkmp0ytStQlVpbel3UuoUF7iDcR5+NvNsyw0XheHfoVTDDjDi5d1JStpRQoHSxBsYtsD2TKeeOi46oKazI/yg0BrPIzus+ygXMlMEeGFD4Kjcg9Mc6SChzXSxjyk9LMWlVVSHudfU9V5fBWzddAS6qo/ZSWEtJzKUozFgLcQeY6WvDHHLErSsLOt4XalW5V+dCa0ZRZWG5gC6WQfxIOcp4FQPwRFWFcU4U/kvpMm7ihijVyTYmJUPOyzrqmUuOEqKMg0URYZr6a2jGoLWCqFMP8A/tJp85JzbZampN2nzGR5PDhooHUK3g+WOOUXc+dakm7pqzenfViPawb7V54HQclLggaf0KI3Xa3Mu07AWEaVTlqbpxlErOTRK1BKbX4HQ38scz2m1qn1vaPPT9Im+6JJYbS26ElObKgJO8A7xG44I2gUWtUmQwXjuQYmJVlQTKzriink+YKO+w3Ai2lr7oaom0g4rDzVOlXUbqOrXXb/AHGlVedqvqXJCaqqi7MMzgQwtZuqwcKbXP6N/MI27FeEJbE2MKGp3ELci+zLIKZVIPKuJBuVJ4Rq+1um4l9b7ZkmKfLYZphQppuXeGZVzlCinovuHOTreNWxNtPNWxbRK7SZF2QdpjQRlccC85vruA0IuPLE+E5bHm0cLVr041KLtdyfyvstTD2z4hkq9tGUJNpwIk2hKqU4kpUpQJKtDw148I6Ns0WzM7OZdiiVCrsFsFD7kpSWlKQ4dVJDnjHfv5rRyvH+I6Ni3FffqmU12SW60kPocUDmcGmYEW4W3xveymuYMpmBpyWrFSkpOoKmsyO6kOrBbyjgjqMVcbRSOvxGlOPhsYU4vMraHRFyU1hiUF61iOfYDZmFJfkkTeTTXVViLb7RoWy3E+H5HFOIpJFTLTdQmEiTVMy9lOElWpSnQaq3bo2WYxhgiXpk3LyeLKFKl9pTaliUmV6EcxNo47hLaXUcFyExTqdIU6ZQ5MF7lphrMoaW05gQLwrp3Wh5vh2Br18LVjUg8z/b/wBHYMWztqjTaPN4np85OM1aWLkm3TQysEK1OcaWF93G8apj+l4bqe3eqy2IarOSKeRa5HuWX5ZTi7AZbdRJhcNuFcrFRlZKqt0yVkHJlozLjUvZQSHAq99ebmjGrmNcPzXqlJXE0vUErpLbrSjMhCtAE2JsRf5oWEZI68JgMTRms0bWi9u+nsW3sMbJmJkocxvU0OoPhJckMpB6rxZ2uVfB+IJKTqFGrrszPSqESqJfkClJbF7rJPG4GnTDiuy+yTEmJZuszeOJ1h6adLqm25NRSkngCUxoGMaZhSQnpdvClbfqrC2ip5bzPJltd7AWsL6C8Vgrs9TBwU6sKk3LMu/3NNSTe++NowHTnKvtEotPQg2cm2yroSDdRPkBPkhEiXKl2QD1x0yk0mbwFgV/EU2gNV6qsKl6ZLq0Ww0oWXMKHC4OVMdEvSj2sTWjlydWaniuel6xtYqNUaIKJmpOLSQb3FyAfmhlRFCdwLjmktm7qAzUEI5w0vwvmN41WUps0H2nHTlU2sFICha3G8McP1Cdw7jgVZLKH5YqW3MMFWrrK9FJPkNx0iPc8OfCspHu+D1I0KkYvtY1h8HlCbeDFpbaSwrwvem4ja8W4Vco043NUxZmqHOeyyM2DoUnXk1H4ad3ObdBtrCBdKrb9R5YvKnw6lpbXPpEsslfY6dVzNDbdWZdSGl0p2WbTVUPqKW0ywZQStR3hSTYp45rAbzES/Ks7acJS0ohIoKVINJU0rMh1pQOZxR4ulXj31B03WjMxRN4NxE2sSeOZOmImy09OIXITC3HFpQEpQogWyptcAcSSb6RXhGYwRh7udmf2gSdQlZWZTOSzaZB9Cpd3cSkkHwVDRQtY6HfrHsxST307nrrLfc5G40t6fcbQ2txa3VBKEpKlKOY6AcTHb1YTzbFmsCqfaFfEv30EkSAb8pcp6N+XrvHHZaozNMrzdUprhZmJd/lmXAL5SFEg6xkvYmrb2KjiVdRcFTK8/LAWA0tlCd2W2mXdaObC4mnRlLNrfQ56FaNJu/U6IvvbTPU+0djEtPnVobnXk9zNK5JxLt3cma/AG1xDvBVYo1MoMjTJDaM042kJeckRSOVWlShdaSqxNwbi8c/r2JJSqbIadIPVMTNYNRcmZpBScwzKWcxNrcRuMOcC4ww5IYAcoTtWmMOVRThWqpMy/K8qL6XNjbTS3C2hj0qWJhxYtPp1O2FeCmrdjfsV16mO8u2rG/eiQmUciGHqEtWUKFjZagCSdTHnKoNNNPzDUq9y7CFKS07bLyidbKtwuNY67WMbUOT2f1WjPYsmsWzU62UModl8qGCffXIFufidBujk9PmGZapy0xNygnWGnUrcl1kpDyQdUkjdcaRxeJ1ozqRsc2OqRlNWOxmrymL10al4cx9NUqablktKl5Zpy7qwkXvuGljCLFdepaNmc5h9WMnK/UlTiFhbza0rAChdOulhYnyxYpu0PDFIqTVQpuziUlplq+R1M4slF9Da9+GkYM3jHCMyHl/yb08POhR5UzayQs38Lp1N46pYyDp8yvb3LPERcLZtf3NcwpSZWv40ptGm3XG2Zp7k1ratnAsToSN+kbvgxFJwxjXGUs9PNNMSku5LMrmFpQpzXS2650G6F1I2g0Sipk3ZfZ3SROyzaE92IfUFqWEgFe7Qk3PlgntoVBqE+7OTWzWjuvuqK1uOPKJUTxOkcdCVGlBPOsxGm6VNc2pGyejOT2MmKy8nJIUlBmXnl6JCgg5U359SeoRutWdl6XjmUxlT6VKVqmYiLDXdEwm/cq8wFwLaEixF+IIjlM1iqquyU/S5BXe+kTb6nu97JuhoH3iVHW2g042gpGIahJuSMg/U5hulNzrcy6xf2MZXASq2/psOOsNQxtKEVTt1vc1PFU4+T3Nh2ya7YJ8C+jDA/4I0IaKja9pVbpuINpM5VKRMiYlHGmkocylNyE2IsoAxrkhT56qVFmn0+Vdmpp9WRplsXKj9XOeEeZi1xK0nHqcWJ/qVXY3HBpEjhfFlac+5sUwyielx5QSB12BjS0KAdCdBa3T/wA7o3LFbKqLhqUwRSnm5hTLpm6pMtqGV2ZtYITzpQNOuNPYptRKx7GjTd4Yjj8RTcFTXRHPXxEYuMb7HUcWpVUtkGz+uNgqQ1Iu0h0/AdZcKgD0kKMc5cJCtw8kdN2doTVsN1PZ1XnWpSXqTiZqmTjjgKZadSLJCuZKxZJ6Y0at0OqUOuTNIq8i7JzsuspdZcFinpHODwI0MfBQXBqSpS3v/ud1SSqRVSO3U2nYzptqohuBYP8A/gORuOzGXp9TwkZTGLMqqioqKe9Hdiy3yk8TcspO/kVjKHOAJHPGi7MqnTaFtTpNUrcwqVkWlOJedSkqKAptSb2APwo3fEVK2fYim5VDO1an0+mSLXISMgmlTJDCL3JJt4S1HwlK3kx52Ms6ji7pWWp34Wypp3MVE7XJvD21SZxG241Ve55VMw2tOXklCaAyAcEpAAAGlgIUbKpdM3tDk501Wl0805xM4FVF0todKVWyJI46xveJsRYI/kkrEkjGErXsRzMkxId0sSbzKpppt9KkFzOLFaU3Ga9yAOaOL0qqzdCr8rWKbyaZmVc5VouIC05hu0OhiVKMq1OokrX/AIW3sNVnGnOLbuetpueok1UXp1+p4MU66rMomsTAv5E6RyrapTqZOVGkVWn17DjLgebklM06ccfd8JZPLErOgTGsnb5tECrd0Uu39hTcCLm2bE1CxRWaFNUaqy0+tqnBE25LtlAQ7nJINwOePLwnhVXD1o3Wjvr/ADod1fHUqtN23OqNSOGXNpf8lisIznJokg4K8JhwP58mblc/Aa232B4W0jW5xNAT6k/FLOHnJ14NTzTc49NKvyz4dQCtH6JABHXHPEbXcfJwqcP9+z3MW+RL3JJL/J7soc37tL7+mHdHxNh6T9TDiPDD9SbTWJyoNusSeRRUpIU3re2X3p4xeWAqUmm/Utm382T+Mp1E17GubKVSUrtMknp+ffkboW2ytiTTNqW4qwS3yahY5rkX+cR6lew3U555mdXiPGUgumquxLytOal2j0ckLhzynpjydhKapsnjqjTVWdQ3INTja5hxRUAlAVqbp1t1R6NmtomzJ2dcWMSUBTZPglYns5HSRYXjj8fhiJVoyopvQp4XOmqbUnY1va05h6ZXRaZims1tCFzXLOqNFalnUs5VJU4lSdVkHKMvWeEbfRcTUua2fTlfk9oVUmJCkpbYdm3aMx3Qi4ATYnxt41jkm2fFVAxPOUmZpFcp1QLDDjCm5Nl5HJpuFJKi5vuSRpzRtlRxDswxPs+odFnNos1Q0sSDUvOSknKLKX1BKTZzwLKKSnTriXwkpYelGon7+w6rRVWVrDPEmFxhnYFtAS03WOSneTmg7VkpS88pQRnUQk7s3PHld5VnF2547pXZjA0ls5rlNou1+r1Nc3LBPe+Yk1KEyUeI3mWklI6iI4guXW64Q0kqN+Gt/wDm0fQeEQcIzcne7vtbokeV4nLM1YxkKKTmI0Gp6o3jagnvZgjAeHXdJiVpCpp5B3pL7lwD02TfywYBwWavOuYhr4Mthilnlp2ZXoHlDVLDfwlqIAsOeNXxvVK7i/GU/X5mUU2qZcuhrMmzLaRZCB8VIAj2MNB1q8cm0f8Ac86rUjQpWk9WaJMnWMNe+HD1GqalEdyKHlH1xjqoVUJv3Mq3WI+tpwaWx89UrwezFfGHeHte7xb8GVGMaFU+EsonotDSh0yellzXLsKSFsqSm/EnhHRBO5zVqkcj1NZPjGIhiaHVL+03PNEd5Kp+RueaJ5WUzx7i+CGHeSqfkbnmiO8tT/I3fRg5WDPHuYENcOffIwOvsiz3lqn5G76MMaHS5+WrjL78s4htN7qI0GkGMXcSpOOR6iWb0n3h+mYsw0mqRUlzzykybpBWSDl6Ysmj1MfgT3omA4u7KRnGy1MGCM00ipjfJPeiYjvVUvyF/wBAwMrGzx7mHFyXNpxo/pDtjI71VL8ie9ExWxS6iJlsmSfAChrlgxTuBzjbcvYkB9cDx5wD80KriH9ep86/WnHGZZ1xOUapSTwhWaTUhvkn/QMGUXcWlOORamFBGX3rqP5E96BiDTagPwN70TC2ZXPHuYsA8aMnvdP/AJI96JiRTp6/tN70TGszZ49xlWb95KUeHJHthHGxVWUmXKDTkpZcKkIIUAN2sJe4J23tV70DGknclSnHLuY8EZHcM5+Su+iYjuKb/JnfRMBJlHOPcsQRf7jmvyd30TEdyTIPtdz0TGys2ZdxrJ64KnhzOphLwh9JS7/rSn2y0sKK0kAjfCbuWZt9wc9EwWnZE6U1eWvUswRd7mmPxDnomAy0wP6Bz0TGSZTMu4z9cdY/KbfsiI9cVY/Kv+EQq4QQ2eXcXhQ7IbpxBViPbSvMIkV6q8JtcKE3HGLiTzRszXUDox7IdtV6p6BU2v5o2OQq86rDk1MKmFFaVAJUY0VJ13xsMk7bB81obcqB2RenN3OHE4eNlZdRxK4mqjZ0nnhYcDuEb1hHa3inDV5dmdTO09zR6nzieVYcB32Sd3ktHIm3hfohmZlnIyGGihSUBLilKvnVfU9XCOinWktbnFiPDaVVO6PStFewfjiYbdwrUjhusuXSqizrxMq/feGXPe3tuPmjn+M8JV2lVZyVn5eYkZgJU4W3NEkX94rcodUc3lKktpeYE3jsOFNsTqqS3h3G1ObxLRT4PJzB9nYHO25v04D5xHSqkaitLc8KeHr4KV6WsexyOaTUpVZHdLlgYuUmoz3dTwXMukBpR1O6O4VfZXScW0p6t7M6t37lkjM7THrInZboy++Gu/o4xyRvD78nUJtp5pbbiGlJUhaSkpI4EHdEuG4vQ9LC+J06is9GWcO46xFh2qNVKjVeZk5pG5xpdsw5lDcodBFo6YnF2B9pTfJYzQcLV9YsK9TEfYzyueYZHi/GGnSI4iqVWybWII01i4xMLaUL8IanXlHRn1eFx9lleq9zfMY7OcY4OCJybUmdpL2svVZFzlZZ4HdZQ8U9B1jVWpieaVZTznSbxtuCNp1fweVy9PmETFOfFn6XNp5aVfHEKQd1+cWMbkrD+zzaSQ5g2ZbwriFepok859izCuIYePi9CT80XVONTVHTVwNHExzU9zSsP1WYS8AqYc88e0KS+y9h+QdZUFNqlmykjmyCPE9Uw/XMLV1VNrVPmJCabOrbybXHODuI6R2x2jZhtUZp1JaoNf5Uy7ejEwgZi2N+VQ5r7iI9HBvh+Vn4t/8AIH4axE4KpSjqjvdxxvGibXloY2YTFzZxb7aUWOt7kn5hF+Z2p4IlJTlzXEPAahDLalLPRa2nljkeNtojWMZ5DCmly1PauGmioEhXFaiOJHCOyrUjlaPhPwr+GcbiMbCc4NJdzjdTfmkurCHnLX54xpGYqImmyzMTAczDLlUb3vpa3THUaTsnreIW1VILl5ChpGd2rziwhhtPQT4x6BGRMYuwds+aVKbOqempVbLZzElSaBKefudo6JH6So8dUbSzM/p7A+GKlBSq6WNobwQ9iDDMniTGsxN0afZYU7MSLCUrnKiygaOIbvdJ4EmNFqW1ablGO8eCKeMOUxZyOONLzzkyOdx7eB0JjVWcXVpGLEYicqc0/Uw4HDNvOFa1G/EngebdG34hw7T8WUcY3wuwltSSk1Smt6mVWT90QPxSj6J0izmpx8m56VatCpSkqCsznNXqs2am9Z5wAkGwVvJ4mMZqZmnVXD7qr/pRmT9NUqquAoNtNRG1YN2fVrFFRTK0qnqdyj2R0+A02BxWs6Jji4c5PU+XxNeFKGeoxRSKVNT7hCnncoBtZXHm3x23A+zV2WkE4hr6006kIRYzE+opKzbehO9R5ozpBWCdn7KW5ZEtimvtpsXSnLJy5TzfjFCKaaxjPa1ixLIfdmkeDyjq/BYlE8bDcBzDjHQqagrs+VxVatieVZYmzUiqqna2ug7Mqat2eOULqs5q6sagqTcWQkb7xm4uxZTNmuH5jD1IqPd+I5lBFSqilXINtUJPDfFOJ8Y4a2S4Xdwpgxxuaq7t0ztVABVm4pB6OHAR52Uur4lriWpRmYnJx8+ChAKlK1/51gRbqvshvDvBnWlornVabiigLfZp2Iq4O4ZtsLcYTLFa2HQBZSvg3vfMi+7W8P2MDOydRYxJM4vYbwk2eWbqyHFFdwoFCEjdnJtrbjHOatSMN4JnGpzFjyapVktIUihy67JQbb33B1eKPLCKd2wYtmqil9udbYZaQWmae00kSqGz7wMnQjrF46JppJH0kfAfg2q0Hr2OxY+24O1KlPYbew0E06ZQO5JibUoOqbzDK4CNFm99TffwjCm8LYCr1Op0xgjE9RmK5UX2s8gtBW4B78rCbFABvuvpCbBE/K4/kUUWvUWSpWHpRj2WfWFFmVOYFS21nVsnXwE3T0CMbEq5TA9MeltnbzNYQ3LJnJjEEu4lx+WaUooyWH3IG9uc24RF0IxklF2DUhKvPNi45EbfjL1uYAl0Jw1RJJOJ3EqZXKoecU3LEry5kJV4y1C4tfjHJ9oE3QsIYzabpLk7UFCX5OclZ1otck6oJJCCcqrgcee4vGnM48q1IrDc8yltx8NeB3c3y4AUb50hfTuUPJGVQzP7QcbKpy36K3NT+ZZeqyw0yhQBVYLJ8HmAvqYnOtbyqRw4mEnouRbIZzuL5zD09TsR0msud1qQM8pLLUxmQfC8IjRSbncb7o2bA2HXdqD9CXPIfdYTOqXPT8y+yhttoGxaOSziQV2ss/CMJsb4JVRJCjuVTD6nJR2XAEzTpwFDelykFVwdLkE2vwuI0xyhJrb7ztDHIsSMlnnHHEiWSAk2Ge6vCUo2FxxO6IScmcdKMHG2w/xUjCtKxDLolZuoGUn2lOTDLcsj2IpeUEtMuL1cQANVXF7CHlGq9Tq9OlaZibCzlYk1gsyc3IPo7qAQDnCSD4YAGt+aOazQXTZ6WkqFVXJ0TUohlSlWWGlO2zsi+gsbDhrFdckK5Q56XVU6dT5aadfcSlsr5F9SffFSQoAINvBUN4vaGhVdMargo1ku/c6fiTZnK0lEnUaxi6epCKkyXJUVeVUl1aAB4IUCRokp06RzwmmKBRJ+Wlqa/tXkZhltQ5Fh1t0pQo2Atv5oQVHGWG6/huSlXpjFDVSlWEtMrmJ4TkuhRUSvIkgFKTpYA354WYdoTGIcbydA9cshTGJklJn6oSy0zoT7ITuOlusiGWIju0QWBq7cRm71nCeGafS2sPnHtJlgwoqfStlZU44RYm403AAWO7fCd2lUByXZaXtEoK1NIU2HVyrhUpJ0AJtwA0hHN0d6SQVTSFT0kzNuNOTFLdSsKSnTOnTRJ0sTa4hLSKems1ZUqKixIoDS3W3pxWUKygkJOu86CBKtF7RHo4WrGN+I/t/BuE5gXDyKZLT0xjimMsv5g1MJlXcr5T41jbW2l4xnMD4YaXle2iU1o/pyro4X5ukeeJqOz3Ev8hzeP0VGQnaFKzZlnGm31LU0okC9jYC6iARv0va0anNzGJ6vTWJ9+mzsxLWLSJxEupQWAdxcANyN2vARN1oroWjhar/yP7fwblJ7P8MT8yiVlNolLdfcNktpYcuT5YtHA+Em1WO0qlBQIuO53bj5o5zKPsuTSG5qZUwwT7I4E5ikc9uOttId0vFE3RZuVqNKmmFqkcjw7pZTfOT4abHRYFrWN9N1oPHh2M8FWvpN/b+Db1YEwwJZL/8AKFIcmTYL7kdtfToix6ycIEa7R6Xfm7ncjXjX6hPsd1JStmYem1ZEMIDaCFC58DcDc+aLr+HnZvF81SKZXqXUC01y5mW3ShtdwCpCARcqSSQQBwMM6sH0JrC1o3Upv7fwN1YHwnvG0mmf4dyLKsGYS3J2lUw/9nchexSRQZ6RqGJWBOUx0qKmJObSl1YFwBzgE2V8XWLL2F6s3hyVxTOcjIUadmVsy7i3s69ATmDfjKR4JGYC14lKcfSVhRqNf3H9v4HSME4U3/ykUv8Aw7hi76ycJW/6SKWP7hyNXVh+voweMUKk3RSu6hJ90k2HK5c1gOItx3cN8J1zLibKzK106DDcaK0cQfC1ZP8AuP7fwb4vBWFg2VJ2i0zKN5DC7CMf1p4QSTn2j06w4IlnCfMI08TazQZm6jflE8YVKmV/CN+uJSrRT5StLB1He839v4OmInNmeGkh0OT2J5xOqG1NmWlr86r+EeofNGnYrxrVcT1BL866ltlpORiWYGRthPwUp4D541txxRvGMrOd94lUxDaypWOuhgYQlmlq/crXMrUo+EfPFTUwtKgcx88Y5SeaKkp4WMcjbe535UdDwPjKqYaM3OSDwKMgS6w6M7TyToUrSd4tGyvTmyrE6OXe7vwpOq1WllruqVJ50p8ZN+bcI5dTSRSp/fogdsYzby02IJ88c1TDJ6o8qeAjKbnF2Z1EYPwSu5b2nU0A7uUk3UmKhgzB/wDpQpHllnfqjmaX3c28+eKy+5zq88R+GfQR4Kfrf2/g6QcGYRCv+k+jf4d36oqTgzCWa42nUcf9nd+qObB52+qleeK+6XAfGPngfDyfUDwlV/rf2/g6y1hDDbzAZO1OlqQnUJ5B4geSLRwTg7/SjR783cr31Rz2kzxEy6Co/cVcYWGorJ8cwfhnFaM5o4CrmaUvsv4Oq+srBv8ApQpH+Gd+qKhgnBp/60aR/hnfqjmko1V56SmZySkpuZl5YAvvMtKWloHdmI0HljEXPTCFqSpS0kGxBO49MZ4eXcPwFV/rf2/g6srBGC7f9KNIB/szsYLuCsGpV4O1Ck26JZ2ObtzjhdSXFqKAoZrK4RtmKk4anaq3VMKJep9EK2ZVTU2+HJhLmUFawjeUb9efSCsJJq6YywVSDtnf2/gdIwThJasqdplLUeA7mdMVDAmEFOWO0+kDnvLu/VGvvsUqSx4JKh1pVXkE2LU5yZa5S6Lnwb6WNx5IycFYPqu0LHowxRZqTl5x0OuJXOOlCPB1I0uSeYCD8I+4ODVzWzv7fwO14CwelOm1CjE/2d36ohrBmCUuDunahTco35JRxWnltGhPytRbnahLKKSqQzcuQ6LAJVlNrnwtebhC52aUnUOHoN7dUKsJK+48cFUa1qP7fwddbxFs5wWjujDsjMYjqqNW56po5OXZV8JLW9R640eq40erNZnapiNkVaZmEFIU64pHJm1gQE7gL6D+MaguaJurMbHnP0xhrc4XFuuLU6Cg7vU68P4dCDzN3fcYyrqzVJZQWonOL3MW5txwVR8ZiLOHiYKSlbtVYS2hS1BVyEgkgDeYongtVbfbbQpSy6QEgXJN+AjqitD0IaTNqoONZylU00p6Qk6hSXbiYkJoFSHST44PvV/pCGYldnFUPKM1mq4dcVvl5uW7sZT0JcQc1vjaxoUzLT9PU0J6TmJblUBxAdQUZk845xu88ZVKlJuqzaZeWdl2iSRnmHg2gHKVak7tBp5o644qTSjPVHs0cW4xtJXRuisMYPt4O0+leWSeF4oVhfCm4bTKQR/ZH41yo0aeplFplTmJ2RcbqLanW2peZS460AbWdSPEPQYily0lN1FlmdrDclLqALjx15Mk2AsSL62ueA14Rb4mPpOpY6Fr5TZE4UwopwAbTKQTuA7ieiH8KYUl3FNObSaSHEmxT3G9p5o1BhbzlTRLsrLqw4B7ESoGx3jnFtb80X60Vs1p67qfC8IBKr2HT06RnXp2uoifHQzqOU2A4Zwmr/rMpWnPJvwDC+E/fbTKQegyb0acZg7s5Pli8SlMmHlTrIJSSG8xzc0L8RB65B/jYL9JtycLYTO/aZSrdEm9FwYXweN+06lf4J6NEVNEAWcWee/CKTOrBtnPnhviafpGWNh1idBZwlhJ91LbW0ulqWo2AEk8ST1RcODsJJVlc2mUtKuYyT14561UXmXUvNvrQ4g5krSqxB57w2qNVmpKpNuSsw42ssjwkHXUEH5oPxNP0ivHQTSUTajhHBlgf5UqTY7vsF7WKF4Swbl02pUn/AvRoaZt1wkJvoLkXtFszaym+ZVuuF+Kp+gf4yHpN79auELabTqX/gXotqwthQE22mUn/BPRo3dhy6KV54gzayNVq88B4mn6DfFw9JvKaBgWWPKT20MTSRvbp1NcWs+VfgiL9SxjIYbpppuB6eun91NZX6pMrC5x1HwQRo2noTrHOlzKik3Ud0ZtYUAiSV8JgGEli9PLGxz1cc00oLcw1zC1KUc6tdfGOvT1xS28sKvnV6RjFKxeJSoFWhAPTHnzbluccp3d2OpacWN7it/EmOtUfadTKxRZahbSqQ7XJWXTyctVJZwN1CUTzBZ0dSOAUdOeOJJeynfeMlucKdeEeRjMBCvrJanZhcW6T0O2rw1stnDy1K2pdxtq/oatSnEOIHSpGiusRCsF4KQ0lxW12hJSrxSZN/X5o423U3E+K4R5YazdSWcOU+61HVfGPK/J562m/t/B3PxKCsnFHS1YQwPb/pfoFubuR/6oxzg/BJOu2Gg/4N/6o5V3xUffHymJE+fhnzwF4ZUW039v4GeOg94o6oMF4INv/bBQTrf2m/8AVF1vBWCSNdsFBtu9pv8A1RykVAgeOvzxPfNwbnFeeM/Dar1zv7fwb46n6TracEYGAv8Ayw0HT/U3/qi+cC4KTK8sdr9CDd8oUZN8C/Nujjoqrl/unzwzcqTi8Hi7ivbPP1wPymrLeb+38Al4lCNrROkHBuCLHLthw9fge5X+bfuiy5gzBma42v4d/wAM/wDVHJhUV/jVHyxIqKwPHV54H5XU9b+38D/Gw9J1c4Nwbaw2w4et/ZX/AKoE4NwaD/0vYe/wr+7m3Rynviu986vPB3xWP6RXpQfyyp639v4AsbBfpR1xODsE2uva9QOnLKPk+a0ZjEpsnw/KPz8xWqpi91gX7lkmDJS6uYKcXdRHxRHFjU3Li7ivPGZLTql0ColSidEC/GDDwaU35pu37fwJW8TVON4RVzacb7SatipLEmpLFNpMpfuOlSALbDA3XtvUr9I681o57MVGaNyJl3U/DMWXZjMSbmMRa7m5MezhMHGhHLFHnYmu60ryLi56cGvdT3pmKe+E5+UvemYx1KB54pj0Vc4HGPYye75zf3S76Zhxh+amXZiZDj7irMKULqJsY1+HWG/bkwP9XVDwbuSqxWR6C81KevpOPemYjvlP29tvemYxeJgv0CBdlMq7GV3yn/yx70zB3yn/AMre9IxiwRrsOVdjK751C9u7H/TMMqFPzjtel23Zl1aSTcKVcHSEfGGWHz/OKWH6R7IKbuJVisj0JnKnPt1F9CZt0JSsgDN0xY771K1u63fSi3UNKrM/KK7YxrQG9WNGEcqujO78VP8AK3fPEd+Kn+Vu+eMI24ExEa7Dw49kZ/fip/lbvnitms1MvpBm3CLjeYXX57xU391Sb8YybuB0422RsVeqc9LVctS8wtCMiTYHnGsK+/lV/LHfPGRiUZa2ebk0dkJoMpNMSjThkWiM/v1VL+3HfPE9+qpf225C+CFzPuV4cOyGArdVv7bXEiuVUfha4Xcd8GsbPLubhw7I2eeqk+3h+QmG5hSXHArOrn1hV39q35WuMmom+EqYb8VD54SQ0pS7kqNOGXZbjPv/AFb8rXE+uGrj8LV5oVwQud9ynCp9kM/XFV/yo+YQeuOr/lP/AAiFdoiDml3NwqfpRtUhV597D8/MuPXdatkNoV+uOsflI9ERdpZvhqqDoSYScIaU3pqTp0oZpaLcbeuOr/lA9GJGJKuP6dPlQIUQX1hM8u5ThQ9KLgIiQLiKRviQYw9gN4qSbCKTvvBe0MEvAw8l1EYLmOl4fRCAHhDtBtgpXS/DROastvmYrK8ykpJCQSBc8OmGj7rcjPPysvNNzjCiEF5oEBwAg6Ei414whCilXRGSHAoG+t4pGVtCkoJj4cnU6hOP0yVEq0hKn0yxcz8m2N/hHUnj03iZScUkgEmw6YUSzq2HQ4lIVb3qhcK6DGw0Wly1ZS+lueRLTbbSnwHRZspTqQVcDusAD5ItBJkXhuL5UbLQMST1JqLc9T51+VmWiC28ysoUnyiO10zHOF8eMKY2hSLbM8logYgkEZHbHT2VAGvXr1CPNym6jTpaUfnJF5lmbb5VhbqSA8i+XMk8dQYb0apEMzZC1AFuxsY6aVVxeV7Hzvifg6u2tH7HRsabJqtRJLvvILarNEX4TdSkfDSAd2cC+U/NHL5mmKCSQDa2h543zB20TEeFZnlaRUyGlfdJZfhMujmUjd5RG/rltnO01oLlnGMIYkWfuajeSmlHiCPEP/OsUlCM9Ynn08ZiME8tbVdzzmth1pXG3NGdKzRRYLv5Y3jFWAa9haomTrVMcYWfEWPCbdHOhQ0Mai7TSCMoN4lllTd0fR4TxeMknFnS8O7UXV0ZrD2NJFvE9DAyoam1WmJbpZe3g8wPVeNhRs2lK03372a1g1eVRdbtMeARPSotxR/SD9Ib44e2w/LuA2J6o2nCtbnabX5eblZl2XeauUutKKVJ04GOuGIzaM9mePo16eSrqOKThjE+JK2qkUekzU1NJX4bYTYN85WTokdJtG3uSOz/AGa3VXppnGGI291MlHPsGWVzOub1noA8gjX6/tjxnXqUqmTNVDbStJgyjaWFzh3XeUnVRjm7y3nVWAIG4AC3zcId1VHU1CphcIr0lqzoFa2w4nrtRCqm+w9Ip0bpqWgmWaSNwQgbus6xMtLYRxWkcjOd5Z5ST7HM+Eyo8yVDxfLHPW5B1awMpEOJCmrC72PNruEGniW/K1oNPxmNv6j0NiquzivUm7rkkp1g6h5khxsj4wvDTAiK9S8TMO0RDzk0s8nyKW+U5ZJ0UhSeKTuN43bAtBxTR6c3WKlWzhyh7i9O/wBNbg2ydVmOg0/adhNuaVK0OgvyinAGnay0EMzDo3G1hZAPADWKyjFPNTWpwfmGHxErYR+b7Cyq7HMNyfL4vriJyVZQlDkxh6RIdfYcVfwVKB8Bs8Oa9o06r4nnqtKookm0zhzDrYzIp8okpC7cFqGq1Hp0jpdDkaVT8RrqtDxh3M44iz7NTbJD4vqhatyr3F42Cc2e0SZaeq+E25B2cV4CmFvZ2mDa55Ln13Xgwk4y85eH4feJlxpu77dDlVFwLLVZ4zddnU0DDktdWaYAD76SN3Wd2vmjPxFtSl5KlDBuzOlqk5JwBKnGkkvvHcbkc/8AzaHdQ2Y1GaSaniusv1DdaUp6he/MVKOVI6oSv06rU9pcvQ3cN4MllCyphycQ9NrHElepHkjoVBVXmkztj+E3VmpVnZdjSPWQmXa76bQa4misLusSgs7OO9Ab975YwaltFl6ZIOUfANLFGlVjK5Onw5uY4eEv3o6EwzmqNszk5hyaxPtCm6xMqN1op7RWVftqvGA7tK2eYdUE4VwLLvPA2E3V3OVVfnyjT54q4QitD6COApYaDjBpW/diJeBMZ4wxGrvZSZpxrKnPMOjI2NNVFStIbOYd2e4ARy2JqunEdWQD9rKcv2BJ5nHePSBGu482w4prc2uSmas83KFCbSkv7E0NPgpteOVTtWdfJuu4vu4Rx1MRCnruzidehRV4K79zfMYbTqxiIolFLakqcyMrFOlBybDQ6vfHpOsatI4wrFIXMGl1J+VTMt8k+lpZSl5HwFjiI1Z+YUrfGGp9WaPMrYtzd2eNi6nxHPqdnf2g0bF89hxnFLJmDTZYSZ7qIbbcQNEIK27KCL3NyDbdGmzc5RFyK+5Gptif7qWTZxK2Cz70J0zXG6/EaxpxeSo3LsVomFI98CBHLxrnlfCKK0Z1pdRxZW5OSw1Slz1RZXLGZNOR4YVkScyyjd4KL680ZVa2njFNJkcPnC2GaUrk2pVycl2eSUVJWMrma/gEXIKtdLnhDXZni3AVLZqcnjeoz9KL9LHcdQpzQU+habkoSqxsV+LbcQSCY5xQMSSEvitytYioctidpxay7KvPKYV4yVKX4Ol7AjUW1OmkW4iRxRoXWxnYwlRhisVHDc5IyDz0spLSqnTHV5HUjwsySfBUCCOaLtPqEjUaJiCqzMktVUZZlGqS+2+lkS5SvLfkdeWJSLEJ3anS8GJTs8qtYkm8MqqWGHXA53dKVUlxiWdK7oS0UjNkyqNyoaW6Y12SobM3h+s1p2tyUr3uKORaWleadWteXKyQMoIAzeERpCSlmK04pKw1kKfMOttVddDpc8JRIedY7pMs44FKskqRcFVze2Ua3vGvT0vU5aoLRMScxLuLV4LboJy9GY79OMWWZ02W43OFKAkcrLOumzoBva3vgTc5eEdcpmLMN1vD9MnKg/gulz0u9POv09+nOhpwcj7HnymxuTZtI3KBJMLo+o8rx6HLp9U7LUeTQ4lxDmZebKPJvHRGCitT5lnGEzS1NuDKoKOY2Ayga7tI2ekNSk5KyTc42+GyhxQ5KcblSFX35nAUnS/g6X54XV+RkJZvlaaaisWbJROyzRSlJHjco2sg6gDcN8ZgpNSTTRbexGpNDMmlqVLD7qHHZVsONoQWxYHxspzDfpcQ4wfjmvYCqK8RYfRNSC5lt1MsW5m7SFAgZlNqBCwN1lDiLHSEVOw8ZqacRUZnuNKB4gSOWJUkqSQhZTdOmpvpcb42ml0vD9HptXfmKTT66mZpzJk1s1EcrT3XiUpKkpF1rBBzJG64vvg67saUoRWhqshUqs5TavTJWak22aiUOTYe5NCnChzMkIWrUHMrUJIvGzJoNFp2B3JLEWGak3WAh16Xq0hMomW3lZwlttSASAnNcFQN93PCWoytDbrUjKd6apIokGUN1tD7yOVLgXZam0qFkCxACdTpeEUwWGJ2aTKkPMpcIadSq1xc5VXG82iflKWbWht1GwxI1aSptNRWe51zM2EOvTMuttiVWdFZlC5ISBcm1rHeLQtxQy3hXH7iaRiBqoloX7tlAGwFkEKSCk2uBcXBsbxj0urTNLkpWolS5jk5tRU0t1SeUBSMyVEG9jxhfVKhO1urTFYqAcVMTHhrWALKJ6OGloaTSWhOEXd3eht1SqGMKRWZOkzDbTM7IyaJaXQy4iYCGXATb3ycxza6gjmENl4imu9lLExJUyt0inocdRKNyy2uT5ReVTTiwkG9/CBJIGlrxoT9cqNQlJWXnHGnUShSGrNpSUpSMoSSkAkADjHYMC7eFYU2RVbAr+EKZPd8UrSicUmym8wtqD41jqOYw8ZglSstBLT8XUKn0xWDsQUt+o0yWqSag03TamS0rNoW/C8YkZU59Cmx36xmYgewbVdrEnSaoiVpeHqUxyCpVL/JNKWlGdQQpvOQVruMwuLi3HTWKNjabo1CTISlGpwn5eY7ok6k4x7PKukpJuTooWTokjS5hnLySZCqyE5UpRTklUHJefmGWXUO8shZItdAHJKKgo5TbQ79YdXkLeMHeRiTOEKdPYZTOUCadDT47qmA+CUSDeZzwXFgaqCUJ0t77iI58ZKYQ2088w40y6bIeWk5Vbtx47xfrju0kjBT9OrNManMR02Sfnl9wobAfBsklAeRuJSsKsAdArU6a4E7NYzRUqFjmvMy2JKcwlBQSxllN2rKwhACV5bE2F9AeECpR0RCjirNo4w7JrbKSopsoZhY62vbUcOoxb7lNuJ8kd1ewBSzT2pWoystJvVOcbn5apNL5duTk15k8k6Uq8A5stswJ3XIjZJ71M9QmJqXapFbkHJh55thwvPJWnMtOYrSUXuhNwk3F7kQjwzSuN+Y04uzZ5nEko66+aKkyKr6COv1zYvjegzc5LTOHpp1Um8GXjLo5UgqSVJICdcpAJB88WcNbLcUYlrrFIpeH51yZfSpTaHGi2ClPjG6gBYQjo2LLGQezOd06RWKVUrp3tjtjEbp6yBp80emsJ+pmxxWq1UqFNSSKRyTaQ9MzlyhNzcZMuqyRrpGO16ntmnzeJpatYvkZZVBTdSpdlTwWCkqC1W8VJPg8SCRpaMqd3Yi8Uo3bPP0rh+oTcs9MS0m+60yMzq22ypLYO4qIFh5YsLpziFBKkmPYmybZoqk0KoN4hxWiRw9XKYHZiWYWEqUFKyp5QqAylN7nnvYboS7Rdluyte0lqiYbqq6TJNyK1TE20O6WUvptlSSVC1xcm1/LD8JXsSjjer2POmHMCYjxQ1Ou0CiTtSbkWuWmlS7WYMo51HyHyCHU3sdxGzs7puNHnZCXp0/OdyNNuvZHRvGZQIsB4KhcnmJ0Mdp9TbjLDOCZvGEtXJl12XflM7SG82SZ5PNoEjW5B0PAXjQsXpwsNmHLjFVSVXFzqlt0BSRyEqhSiDYagHKB4Wl77oVU97jfESusvU5q9Q6VS0zskt6eRWGVE8i6hJSphSApKipJISoA3txva4tGh+EACQbcDHRqniWs4tr7tVr7zb02mTTLh1LSW/Y0aJFkgA8Bc6xqMxOsTD8n9g2Yl78owHDlcJVdVuKQRYabt8SlDRM7KNRtu49peIsb07ZxVTTBNooczkkZuaS2OSFh4Dea2irFQ5yCQY1BkOTc0llCgXHFZRnWE3J51E6dZMO5AVmbos/SpGVWunurQ88Ncsuc1kKKjokG+W56oWS8nPvVlEpK05U1MpNgwy0XC5luToPGGh3QjRWNtWN0TlNq03S5GpqZpgbJZnKrlW8taSdFKR+iBYBO/fFimS1CmcQBmsVhyUpiFnNMsy5W4tNz4qOBPAHQHfCd55T7mctttkaWbTlH/P1RuFW2fYlwzgKm4sqFLlZyk1RtLrb7bnKFi6vBSopIyLVlOmtwDugq5nFRdr7m0bPKZs7mJepztWrVRTUGX8tMlEsj2ZBvcrO4nLfS4sbWvGq45dwzLYt7p2fu1hFOQ0gl2esl3lbeyWKdybnSEeGnnE4gl/DITcmwPRG0VLaGp7Y/wDye95KclDc+qb74Bv2cm50zc30aQ1k4nNGk41ncw8J4qodAU1N1DBEnXplBWpXdz6+TVqkpIQndYBQN73zdEXJPaDOU+oGcksJ4cQ8lxx72WnhwJC7DLlUbZRYZea5540PlXEZkpWQFb9d8QuZecWMzqiQAgXO4DcITNpZnZwVujZpOZxHJ7QVVKn01DdWRMqc7nEqlaELUFEgNKBSAASba2tfhGNiOfxK7Xah38UlicD5VMtJabbCXCLGyEi248ISJnJpLpeS+4HCb5gogk894tKcU64VuKKlk3JJuSYD20KKNmMqAiaTWGnZda20hQQtSVZbJOhHUY3fEezOuUTANP2jO1CSTK1ObU2w0y9d9oi9lED4p0Go0vGh0oKFUl9deUT2xnVJ95U++y446ttDqyhBcJSkk8E7geqGillEd+IXV0yr1TDU5XpiotvsU1TbRamZsF6yzYBtCjdQGl7bvJolQgGXW8VNWQUpIKgFG99wOpi4sXINoxlCx36wG+xeF7F9N+5lTBeb0WEZM3hq0PhAcR0xYU6Tv39EU7heKCbC8DMOm1oPMO1eo0Kq99KZVO4pxAU02QjMpaVgpWBcEbjbXn03Q2xRTabL0dittYjk35+bmlsu0htCg9LoQkZXFK3EK4fTGnNKJmUfGEZ9dVevzHk7IKlpYk0+ImTLokVoYVMVUMlalhwBhSy0APBOmisx003RglxR4257RbvfXeYkA23fPC3LJ2JLhJ3RSVa74qyka2gydEa5lNlJWo6aaw8rrK0lmZChl5NCLcdxP0Qm5IqG6HuIW1JdlUlZsWEm19++Hjdpkak/PEQ5jxEQXFWtwistm8WzYGw88I9Cqk2Gc33wcpzxmzCqP63pRLDc2KmHVd0LWoFpTdhlyjfffeFl9I1w3LilHdwhvXbJakbajkQAYSEkphzW9ZSnn9SI3QlNvPFiY74L2gO+I4whUqBtFQXFEEC1zZrF0OAAb4bTSz62pAknxldphLqNIbzf3pyN/hq+mMo6MScm2jA5WDljzxjX1iM1oTIiuZmVyx5zEcsecxjXMFzGUEbMzIL1t0NuUUcF7/wkQhzHWHaT/MlX9oHZDRgidWW3zFgdsInlYxivXhBmvw80JkRXOzI5U88TyxO6MbMYM5542RBzl/lemGkgsnD9T196mEmbXSHNMP2gqg/RT2w8I6ka0rxFCl20vFBNxEe+iI1tSlwgggjAsEOsN+6Dw52F9kJYd4Z91HfkF9kNDmEq8jEnEwRJ8YxEKPYIIIjjGCTDGg6YilT+l9ELTGfRfd+V19+IMdxai8jLNS92Jr5RXbGLcxl1TStTY/Wq7YxOMZ7sMOVBBBwg8kAcBFSNHBFA6orb+6CCgPYcYn92E/Io/wC7CWHeJheotH9QjshJGluTo8iCCCDjCFQg4wawacIxh1P/AHnU08y1j54SjdDmc1wRIH9asQmhpkaWz+bCCCCFKEiKeETAb2gphQ5pHuBVB+rB+eEnCHdF1o1VHEMg/PCThBlsidPmkEEEHkhSpVFQimJEMbUmCJtzmCx4QQXAdkPFaYKbvfV8/TCO3nh49cYLl7je8fpho3I1dbfMUg3tFxKiN1osXtuisKPCGLWMtty1oz5YpedCQsIV08YUJUQdRGQ0qyrxSEsrQrXVHSsL4RqOKalLSM9US3KMoyocccKkspJJISL6AmG87szqdEp1VmEzLbiUMpW014y3Um9yCOAtx540ClYgqFMczy8ytPMb6iNmYxNNz1NnluzjilKQlJWVWI13R6MXTnG6epOtWpxpZakbs13l35N0tuBxtxPvVCx80P2ppMnOmXqMwR7GFBcuoOjVOYcbcRfmiJiquzkg1LTzTc7LJfQ6sqA5YpToUBzeARpC16UlJisLTRGZhDDzuWXlniFuJBOibjfvtE1Bp+U56uGo1Y3izrOEdq1RkKd3krjLFeoSwEqp88c2Qfq170dHDqjaXMA4axhJLqWzadbmX0+yPUCoLCJlsDeG1X8NP/N489vJm6fNLl3inM2bKyKBym17dcNaPiGcYn2FSLr6ZlKwWiwoheb9EjW8VVW2kz5nE+DThJyoOxs87JStPmnpGqSE3JTbasq0rFik34oOugglpOgidC2ak5nA8FtSLHW979WmvG/RG2SO1WhYsk26VtLp5qKQAhqsywCJxgc5tosRXO7LZpmX9cGFJ5rElDIUe6ZQeys6bnG96T0j5ofhpvyHKsXKl5K+j+xpTdEoq1gprzWpQfCQQAVHXj73eYbytDoZUpS680fBK1jkzcqBsEeUawlpWHKjVqoiRp8m/NTLisqWWUFSj/COietPBuAEJmMfVIT9TT4QoNNcClDTQPO8Ooa9caFGTepTEY5RSjGV32RjYYwAcTzbiKQl2ZbbUc8w4A0y2ngpazoOoax0SSpmGMIKUKDS/XHWUkkzr4+xZdQ38mk6rI5/njl9a25Tk0winU2nycjTGgQ1IM+C0gcLj3x641iZ2p1xxlTbcyllKzuaSBw4RXPCGhwSwPiGLd5Ky+Z2Ws0nEVZnDVsUzjaFX0XOOjwNNyG7gJFo1R/FuGqI7yEjaoTilZQtXiJN944RyGqYvqdSWVTdQeeP6ayYVylQ5SottqSlSlrFlE6p6uuJSxHY9jCeFVKcbzlb5G9Ygx3VpqpvCamVWStQCEHKkdQEK2seVRhPJsz77YveyHCBfn3xo9VfWKpMIKtQ6eMLjMkG+a8TWLmtLn1+Fr8KmlGR06V2g1WXmQ4qZceRfwm3FkhQjY2q5gvEtkTSFUuaULZgqySeyOGd2G9rxdROkDxosvEZoFetKrrnaZ2GrYFnltKeotUYnmhuAVY/NHP6jTqxITWSblHUEKF1AXG+FUpX6lIrzSM8+wf0VG0PZXaBWVFDM6GpxFwCVDWJ1MVn3PPlXxVNPzZkKcROLFbcBzDwU380JFunXXzx0itVmiTk88h6lnlSkaotzRzmfSlE2sNtKbRfQHeI46jd9DYTGuppJWMZaiRvi1cxKlHgLxQrNwB80c8mztzX6l9bLhUFJSkJIvoeiLSgtJKSNR0xRdy97K6tYAVa+Cq8C4jY+rbnJrk9bewDWFJWhw3KRGfXwtSpTKCbMJ3QuYkpx+XcebZUUN2zc+ugsN58kGT1Ep2Ub3Lin1KWVKWpajxWSonr5+EbNVdoeJKtVk1AuykisSCaaWpCXS00plKMmqNxURe6t5uTpGpBt4e8V5jElt233NXmjXZmosy2OQCCh1JJuLEK3DiPLG60rD+Fqs3KoZrVSlZp+YRLFl6XQ6LkalOVV7XItpxEc+Sl4Eexq80ZjD0whYshYPOU/PFIysSqxbWjOsbQ9nk1g1xGFJ+TfdqjTKXg2mylNkjOq4QVAgJuL36Y1CsYJr+B0ykxiKUm6NMTLKZuRS81cTCSdFBQNk203667omYrdXlJCmTktNzKJkNuIU6lZz5VDKoE9IJGvPF7Fm0XFuN36Q7iWbVPGky4lZUKaCQEAgnNbeTYXJ32EUlJM48MpxVpPQxsQY8xXiCYk5qr1VE1MSqy62840jOVkDVZy2VoANQdwEaty8v3W46WbhRJQnOfAJ99oPmjYsX4qnsWSdFYmKTIyneqREihcnLhovJCirO5bxla741Tud8n7mvyCIzk2d8FCK0Y1fVTahU35hyZfZQ54Y0LpCjYG5JvrqeeGNNpuG3qzLMTVZdZly8hLj65bwQg3zqsNdCAAOYxOGKvSqPU6fMVXCwqzcvNcs8hxRTyzeW3J23Wv4Wu/jpGRiusYcq6RNUPDT1Im3Jx51xpKiplLJtyaEjo14DefJkSm23lR1GWwnR3pC2HsLGphlSXxJz8zyCQAE53FFeUls7gL7lX4QpXimhyuyhGBJukSrE61OuOKmGw24lIK75kqAUoqHi+CqxSPPp0rVnFU9icq8iqqkOFDjTxVdSbWF1DWwFrDdzxkN1ikKxwKj61gmiGYQ4aXmUo8mN6A4dRfiY63NaWR5lOhLVSl1N3S3svqU9QKhWKrMPpSkS1Ul1sFgtoSnKh5BbRa2a2m88Y1504eknVqpqGltrytKccllLSpJXmLnhEFKhYCyeHWRG/7Rdo+AMbYLw7RaDgQYXdpiV8pMS7aVlwEWCNACq5sSVGNdntrM2dgitmDNAlBLqmxNKn+SPLGxvlP177aQc+mqKqkk+YjGf8nNWxjQMO4PqK3aO020zN1FcqovBa13cWkABawLnQ3PAaDXeET+E6fi3ErWM8UzM3h9JSJGWTT1yzlZQgBLYuEjIlBHzmOFuYtxE2miGVJk3aK2puSmJRgMupBWVkqUBdSrnRR4aRGJMd4nxZOtTOIJ6anHWUFttTidEpJudBxJO/ohVUUTTw8qkkr6HqXD1MwvjeUbqmEdm8vOGWYQafJGoIZLhbXZ1cyAb3INhzjhCab2jVSTw1P7Iqth3DtIlnmlqK1zQaTJqKuVGqSQSEgBJ3ndHnWj1arytEmHadNTMm+ZhvK40tTahpvuNY15ycmluKU6h1xV7lRBUSefXfBliL20OWh4e05JyPR1a2wSdMpOF2aNTMPTS5GUcKFEqmC2pRsS4ldglwEBfvtTzRXhz1QLjGIKfUcS0WUmkySnHEsU9Alg464q6nFW0UrdoQRccI83h95S7hty5/RMX0PTI1DTh/ZMLx2+hb8up2s3qeqsVeqwxHUQ43h2kydGdUU3m78q6pOUhQ1FiCSTfhGRhD1VOKZKfozdbap0zKy6Cw+4QUuOIJHhKI0GUD3oF7R5SS9NKNgy4f2DFxD00E6Mu2PHIYTMno0NHCwWzPZE/6qKpIxBiCqUOWk3Ww2luXKlrLYSlVkrANtSL6dMarO4qo2KqTO1lmvVOmTM45y9ZkWmlOyMvLBXg3Te61KWUnUjedNI85yM2+mlVBPJrBLYsCki+sFKriZF2ZE3SXJ5D8sthKCtbYbWq2VzwfGynWx0Jiqko9CEsM53WY6/XcZSU1NTstJYmrdUl3Ka2lfdjpTyzqU6MFvcGU3JTxuBGSWMMYbotLxTSdozTtb7m5Z2RdlDysq8ps2TZXgga5Tm6I5hJNVSo1pqhMvJozkk25MPOVKZ5JJeQnMsJUBvVYBKddYqqKaYhllLLlak5wNh4sT7QeDiUtgjwhrqvQXFgLQyqJ6pCfDJaM9A0uepuwDDtIxmqVkcUrxLJkmXzcmZY3BulRuSDmynQai145i7s5xLjVS6rQ8OvTCqgh6bU1IzDbqJJsOFKEFIOZKicwCTru3wnn5OsYJXRKzW6fTcTyFSlOUlZVbinktIIyqSR/RLBUdLWv0gxawdjWq4MqdUqtDTVaa7MtOIaDSRybalKGXOCnw0JSVW45tYTqVyqOxsGPcFVDDGIabVans99btIfpbTLUu4+HO6nUJSXCtQ1ClE6gi9rRzDDdSw7IVwzWIcKIn2EMqQ3LtvKZAcK7pcXvvYeDbiLb43ytuY3mcUpbx8uuLUiTCmu6wpwobUkFJSlWgzA3ELJirVSVrbmH8FvPd6Hc3JLrEqwws+ClTmdRGUeJpr1c0Bw0QaVbVoV44xuxVa7W0YZpDFEpFS5PPT2kpsMuo1A33GtrDoidme0GTwaavL1Shs1SVn5NTKcxS24wvKcikuWzJFybhJBO68YNNrQzSzVbw8xVpCWb5NmXUktFGisvhpsT4SwTe58EDSMOmS0/RpmUq8zhtuoSaHieTmmFFt/4SCobx1ai94Vx6nTFwtlYlq1UlZumScmzSZSWcZzF2aaSUuTBKicyyTwva0YqK7UxRU0V6Yfep4c5XuUvLyZvhAXsDYWHWYcvVCneuanVBeCpYScshCJmnBx0NzZTcKUpV8ySq4vl5uuFjPcgXPLmaTMK5VJ7nDa1AMKzXB/TsLjWISTOyDhZXHNErtBNCk6MnDDDdVROrmFVruhanFNFNgyW/FsOffCipVeTnJSVpzNEkJZ6WWtC5ptSkrmQVXGe5tcc4i5IU9pp+QfbmFLmlqXyjPJqAaAHgkqI3nU2Fx0wuVSlGdUqbU6ylTxSohkqKBvzW4jogapBjkz7mAqyXCFBOh57j+Ih9NIpj2B6eEyclKzja1pMyy6VOTOoI5VJPgAcLDWFUnSJydnhLNoS2b2CnjyYsVWB16xp1w1xPg+dw3iGYpaZ2Rq5YSFLmaW4XmQL28aw1H0iFs97FXKN7XNcvbXXyRm016mtzINQlXn28iwQ25lJUR4F+gHfzxaVT57MULlHkqBsUlJBB6RFQp84BcyznomAl1GdSPc2CjM4eck333JiebqSJhjuOXCAppaSTyhWvgRwsI6VsxwHhLFFaqVWxe5VhSaetap7uZsBLYUfYzmBKrXvfKNNI5FTJWZRU5cqacCeUBN0kcYzpt+qy9Qm2pVUy2244bhsqAUL6Xtvi0djkk1xNGZWN5LD1PxxUZbDT005R0ukSq5pNnCjhcde7otGBLS+E10Zh2drE+zPKdKXpduWzJQjMLKBuL+DmPWAN2sL30T7ys7jTylHiQTFgyk2V35Fw8/gmJyT7F4yVrNl6mN0h5b/AH1qExKIQgFrkmOULpzgEbxYhOY9YAjDm0SyVjuWYW8koBJWjKQea30xe72VQyhmhITPIBWTlchygnW1+eLHITN83IOejE7MvmjvcvSrNOMnyq5x4TgUMjAZug+GN6vi69cMqlKyDmNks1GaXKSi1pDz6EZ1Np4kJ49UJ22pkOo9gcFlD3sZ+IG3lV11aELUDaxAPNBtZCOSc1qLnky6FLSy44qyvBJAAI5/NEN8kplzMpzlRbIEpukjjf5rQJYmTvZcP7MXUysyFZksO+RMBaj50upsWHqdTJ+uyEkKHV6k8+w42qUl1ALdmFBQaLemqQcpI42MYXeGqN1w0V6nzKailzudUqpshzlL2y5d978IuUCv4hwxiiRxDSnXmqjIuBxh1SM2Qi+liNRwtGd678UvbQ143W84usqmu7VTHJWBcvcabgOiGSFzoX12lTtEqCaZUaM9TZyXQG323s2Zar3zEHdcECw00jaGmaziGbksDUiUlnnqo4wpGcBKy4kKAsu/gpsSTod0JsU4ixDjLEs1Xa2pb89M2K1cllAsAAEpGiQBuiKi7UJOsSU5JLfYfZaQ428ySlTagbggjcRFI7M56kk5Kwybcm9m9exDh2uYbo1TnCyuQdTOI5XuZVvHaUOPhA30vYbo0JzVV9L8SBaHLzFYrM1PVCZdU6+Eqmn3Zp3w3SSLkFWqlajTfv5oUtys2+8lpphZWrQAi3bE5/I6INW3LB3aRQBv1HPrF1TEwFFJZcBGlsvGI7nfJ0ZX6JhPkVTSLV4dVr2lT9f6CFglZi/3BfomHNZYeVIU8BpRs1rYboZJ2Izms8dRAYgbovmXmAb8iv0YjkH7/cVejCFcyLUEXORf/FL9GDkX/wAUvzRjXRQIcTY/mhJnjyivphTyL19W1eaHLzTisIygCFEh1VxbUQYp6k6jSa1EXHyRBIO6L5l37/cV+aKOQe/Fq80CzKpruUA6RSSIu8i7+LV5ogsvD+jV5oFw3XcoGptDtCf5kua/hA7ITck9+LV5odNJUcFvIym/Lg28kGO5Oq1p8xGTrEXistOfAPmiOSc+CfNClLop3m8Hkici/gnzQZF/BMbU1yBoYd0o3oVUA3cmD88Jcqs2oMOaOD3pqid12Rbzw0L3J1LZRLxiIqKFXOkGQwpW5TBFWU3iMpjGuQIdYY91nPkVQmseaHOGfdhXS0sfNDQ5kJVfkYmULKMR0xWsWcVfnijjcQo61RTcwRJ1iINghGfRSBXpW/4wRgWjNpJtW5U/rE9sZbgm/KyKsCK9N3/Gq7Yw4z60LV6a+UPbGBGluzU35UHC2+ARNjzGCx3WMAe5EVI8eIseYwAHMOEZAY6xL7cl+mXSfmhH0w8xHq9KEA6y6YSG9t0GW5OjyIIIm3RBY80IUuRBE2MRrBsbcdzQvgWUPM+qEgh48b4EZvwmDCMDS8NLoSpLR/MIILXgymEK2C8ERu4wXghsOqFrIVRPOx9MJOEPMPaon088ue2EfGC9kThzyCIvzGJveDXohSth9nw3+JmfP/GDlsOD8GmT5f4wjsBB5YpmI8Jd2PRM4d/JJg/tfxg7qw8D7TfP7X8YRi1onyxs4vBXdjzu3Dt9JB8/tfxhjMzFLRQJdSpJRYUo5EZtQY1Hcd8PKkf5rU5HPcw6m7E6lJXWrI7vofvaWr04nu+jfmq/7cJE798VdcZVCvBQ6FQpF9KRf9uLqahSxuow/eQiSQDGQncBoYaMhXQQ8RUqYRpSEjrchvT5+UFInZhFPSlKLXRmuFRqyQAi4AhjJqthWo24qQIvCZzVqCcbDVvE0olQHedm3Qr+EM5bElIUbmRbbXfS8aDmI1sYkOm/0w8MS4sr8FTaOlqn5KaBeZlpRa1EkhVySYoZdbQ+hYpssgg6KToR034Rz5p9aD4KynqMZzNUnGzcPqPXrHT8RTlq0TlgPSzoTKVL8NqjyLvULGNvwhiGt4frwmaZLKprmU3cYUbLsNAoblDrjjrOJJ1pQUFi/PDujYpqj86pC5jRLSlWMVVaC5TzMZ4VKcXm1R36e2zOvUlxmmUeVpNSmdJ2ekmwhyY04fB8h80csq+LmJSpO8hIU54HNdx+XBKyoWVffr08+sc5XiCdWSov623xgvVB15RLjhUecwamLi42GwHgdLDq8VqzbZ3ErJk2226fICyiohLViPLCwYm5Jt1HeuRc5RITmUnVPSI11Uwbc8WlO7ibX645J1rnqwwUYqzHS8QvA6Scp5ouyFeedqbDapSWSFKtdI1Ea2ty5jIpZvWpb49/mjnzu5qmGgoMdTmIHEVB9HckqvKsi6k3JjGViF0j2lKehCmeWe+cz0uK7Yx8x4QjqO4aeHjZDc12YJ0lZQfswd/5kfg8t6EJs+usUlwQrqMfgQHfrimhoJaV9CK2sSTfLoQpiWsSBoiNfKrRXLm841z5x2xlUYs8PCz0NsquI5qUrDrLTTBCbeEpGu6MBWIpx1RKm2PQhfXj/OF/ydgheFm8ZzZKlhYKKY5XX5wHRpj0IoOIp0f0Uv8AuxCsm4igjTXSEbZXgxHa67NEJ5My9zYWDY4xaFXqanSkNti3EtAQuS08HEKDYCt4I6oqIm1E5w6SN990bMxeHGKHlXqc9JOsZCkZmwTdIOsMsL4+mKN3b3SzKPJeYUlKXpdK/Dt4NjvTv3iEtbaW65LAJJPICEvc75JCUE2NriHbcXoJGlCcLMbLxJUCo5VtgfEGkU+uOpX+6N+gIVGUmQR7Eo6cIq7lmAbcirzQudlFSgtBicRVE71t+gIkYhqJ/pG/IgQvRKPuAKQ3cGKkSkwokBokjeOaNmZnTgbHPVqcZpUi8HBncSSfBHPC31yVAf0qfIkRVV2HzRqalKNQ2SRzboTdzP8AKJRlAUrcCY0ptMnSowcRucRVBX9Kn0REeuGoA6Op9EQsVJzKUFRSLDTeIqTJTZVbk/njZmPwYDP1xVK1g8n0RFpVfqVz7OB+yIwxJTRJHJgdahFTUnMLQpeSwBt4RteDmMqUF0Hi6vPIw0zNh48op0pJtwjEaxFUgrN3QfREZD8ss4Pl0ADMHlcYStSz7xIQEjLocygIaTasRpQhJPTqO04mqNgC+fREQrEtRP8ATD0RCfuOZCynM1ccc4ikykyPGU3uubKBt1wvFa6j/Dw7DReIqirc9/wiLC6zUlK+7X6MohUlZO/ri8koLZSbBV7hSju6I2e4yoRXQ2KTq1QThmZdDvhhxIBA6oVms1HNq950iL8uf5ozhH41P0QjUpR1zRm9hKVOLb0Gqa7UUnR/5oupxDUrgcv80JM3TAF8ICm0VdGL6G+YaxfIysw+rEDK5phUu422hCdy1A2VcEbjbzwkXiSolRImFDW50BjX8/OTBnBEF1H3JLCwTvY26QrU69Sp9xb5JQgEadMLziCpmxTNEHgbCLFKI7yVMD8WO2FQXYQXN2QIUI5nobQcTV2cnnlsOquo8tyaEBQRl8IkaaDS5itnGVXamA6lTC0gglCmk2VbgbdG/njVw4dwUR1aRIVYXBGkBTY0qEOxvNCxbL0ordUyuZKjk7lfOVpOhyuBSTmCkqsQLWPGGko7ivGcwZPDtGmZ1cgyXnUSaC5mTYBTir6nMoA26dBGjUybSqbSy7KpnGm2nChsrDXhZSQSo7wDrbjaJpGJ63QJtU3Q6rNU55YyLdlXS0VJ5iQd3QeaKqq9mQlhIvVI6GjGGJavUlvVTEUxUSxJtM5nLoLYQLBog6+CLg9BMJn8Z1OpSw7koQbDDQRMPSQcyqWXCQ64NUhRvltoNBCml1mfnZ4pnH0qMvKcggpSAcgN7Egam53mMel1CVlHnJiWq09RpnOkoLF3GyAQQV2IJN7kaEaQ0qrsrEqeFhnldG2TWKqNP0gqk6jUaXNS8qzmL6S8Z2YzEPZbGzaQCFDnA3Ax1rFeLcZz3qaqdsvFFpjNRos6wX5gTrRfXy91MJQnN4ys/hkHgL2jgKa7V6xWph4SlJmpydYDSryzaOTCAkBSEmyQ4QkajU3heaeDilNPruegoUsB0uNLXyCT77KTci262+FdW+5ZYZLYJufxFKpU5MGZQ2HFNFxSfBzp0UnNuuImn4kKA4momaeSrLkWy4ElvUXNiLKNrgAxsVL2f1SuM1ligYlpM9K0tDk5yKpss90obP3RttdsxIuQDY6a7xGu1dVUaUzM1SmSzbkykzLTxlEt8ulRUMwy2BTe9rDS3REnmWpdRpNWsMqTVUTVQl2i7OFalKCw4pJQoWOXcBaw379bxkzzbKcIuVpGMGTUUzpZ7zZFcqEa+yBVrW07OOkazRA6jELCFBQIuCCOgxZmCozr4JuM6tPLDZtFck6MeJoMX5uqSh5VupBxOcoDja9CQAdAdeNt0YnfaqLUbzzuu+xt2QyTR6KpDb4xJLqbUrKtBZUh5ICEqKrHQi6lJAvc5eFxCaYlw0S4yvlGDqlwDW19CoX8HqPMYFyuVX0Q+dr+JZJJm6g2pS6g0FofnJYKLicwOdtShvuLZh0jjE1XHVTqlc75MyNOp/sCGDLybORm6UBBXlJNlqtmJ5yY116Zmphppt59xxLSeTaStalBCd9kjgONhGP4QPC2+x4dcLmYVQhu0PWa7PzNWYHKFCFOAcmCSN/OYYjE8tK1Koy9SannL3DKmHko5IjddJFlA7j80W69idnE+I6RMMYZo1D5BtDC0UtktIfUDq4oc5jXK0c2I5woTlHKHS942ZpaAVCEp2a6Dp3ECCwssz8+HS74PKNoIDdhqbHxt+7TSMEVyqcocs2opvoSkc++FqzKdzoLCZgOi2crIKN2pFtYPADaLFRXrnSRoOax4wFJjuhBbI25GNsTDCBoXriQae+7y7kk4kHk1oIAN7aXvewPCEZrVSKSruoi3AgXhbcxFyT088bMxeFDsMk1ipF5IMxfUcBDOrTc8ipvNyjyUttthZCiAem198IG2rJbeKkWK8uUK8LS3DmhziWRcS+5UMzPJZ0s5Q4CvNlv4u+3TuvDJ6COnFTWhjqma4iRbm+XRybiyhIC0lVx+jvHXFLU7XnJF+cQ4CywpKHCSm4KjYabzqOEYKpWYRKtTakWaeJDar3zZdD0+eM+o4fqdJpNNqU8y2hiotF2WUlxKipINtQDceWFRVwj1QO1WqyzqmplwJUk2UAEm2l+EO8T07F2DlU9uusIljUJRE7L5VoXnaVuOm49BjW6zRKjRH5ZqoNNoXMS6JltLbiXLoULpJynQ2ubb4rn6JXZeWbm5+Xe5ESzUwlanAsJacJDZ3mwNjp542do3Bg+hHrgqAcuJjXqEOaxVKjKiVdadCW3WgRu1Vx0331jTzfMARDav5kzcoTc3l0xlN6iuhTzx0LqsQ1Q73wf2RFs1mor3zAv8URQ1S5pzDrtaAb7kamEyyiXEhedSSoWTvIsDrujHLfJuFKrAiNdh4cF0HM/UUMsSZp1SdfWtkKmEuNBIbcudE84txjBFcqQ15YeiIZ4twnO4QqErJVCakJhczJtziVST4dSEOC4SojcocRCWSku7pvucTUtLeCpXKTK8iNBe17bzwgt2NGEJLYv+uKppN+WHoiM6pVudZp8k4y4EqdbKlm17mElSkkSUw6yioSk1kUE5pdZUFXTe4uNw8U9MZFV9yKYf1R7YVTepnQhmi7EnENVOndA9ERR3+qZVq8kjmyiMSTZl351tubmu5WT4zxQV5dOYaxasBuhbsrwodhkK9U82jqegZRFXf6qaXdTr+gIXtqbCVZ0qKreDl3X6Yb12rUmpSdLaptAl6YqVlQxMONOKWZxwG/Kqv4pPMNIZPQXhxvaxYNfqf4xFviCGjlYm28OMzYKeVU4UklAtbqjWbjWGz9vWcxw9nPZGUnqJUpx8uhAxLUuC2v3Yg9ctS3Z2v3YhNBbjC52UVKC6Dj1yVL4bX7sRScSVLdma/diFEB3xszDw49hsMR1EcWT/diGbNVmlYcenDkzodCRZItGrdFody33mzg/XD6IaEnclVpxstOpAxLP2uUsn+7EQcSz175GP3YhL70QQuZlXSjfYdeuWe/FS/7sRHrknfxUv+7EJoBvjZmbhx7Dr1yzl/uEt+7EMaZWH5mVnFrbZSW2cwCUAX641TjDqiC8rUR+oMGE3cnVpRy7EnEszf2rLehB65Zg/gcr6EJIIGdlOFHsOjiN++snK+hE+uN0/gMr6EJCYNY2dm4Uew69cbn5BKejDCjVhU3VEsKk5du6ScyE2O6NVG+G2HD/ADha6Qrsgwk8yEq0o5HoXnK8UvqT3tlDY2uU74p9cH/wyU9GFMx7ac+Me2LRtAzMdUY2HnrhT+apP0Yp7/oP9VSnoQkg8sbOw8GI87/t8aTKejF6TrTLs+y2KXLIKlgZkjUdIjXYyZA2qkv8qntg8Riyowsx7VarLy9VeaVTGHSFarUNTGGa3KbjRpaLFfFq8/1jshYd8Bzd2CnRhlQ678yd9aLLxPfmR40Vjzwk15xBAc2NwYjsVin39xWfP/CJFXp2YfaZn0v4QjgG8RlJ3DwYm21WekmRKqepqXczQUm6rZRzQs77Uqw+0yfT/hBXtZWnL49zgQkh5SdydGjHKh33zpJ30YfvP4QCp0c6Gj+ZyEcSN0LmZXgxHnfGi8aQr04DUKGRrSlD+8tCTXhALjjAcjcFG3GapisL8qZJfc4ey8mF6354V920AjWmvDqX/GJBvgR3omB2GEflhpS2JUqMVfXqO+68PE+0Xx+3/GJ7qw7xkn/S/jCPymA68YXN7FeDHux53Ths75SY8iv4wctho/g00Oo/xhFbpgjZ/YPCXdm3UlyjFcwJNp9JLZz5z72FxXhrOfYpq/X/ABi3hz25MDnYVCdQ9kIvDOei0IxpLPLVjy+GjwmhABho7lTQ8kIrawbt8Jn9ivBXqZVEGJgKdIBW5SCRuisKBG6KbWiNYJrldxmh1VSO8VMSPgEwkG6HVZ8GmUxP6m8MtmSqc0RPwMSFEREEKiiLosdQYuoNldEYwUoEc0ZLagTw6ooncEi8XNwtbSGcuojCU5+k6gQmWfCuNIZtaYPePO+kfNDxmRqLRC3NraKgeeLRXrvv0xIOu+Bc6lYu36YrCzffGOVa74kHpgpmMoOqvDjD7l5yY1tZhca+F6Q4oK7LnVXvaWVDxlqSr8hghy6RrraIz+DrFkKOUA830QBetoDlqVS0RcK4oKzxigqOsUFR/jC5jMulVxGbSda1L7/GPZC7NYb4YUQ3rsun9I9kZMlXfkZZnT9spgW/pFdpjHzG/NFc0fs+YI/GK7YxyqEb1NTWiKlq1ikq8kUknpg1IhbhZN4vyljPM8+cdsY8X5Ak1OXH6wdsZboSS8rMyvG+IZndv+iFt9b/ADRnV4/zimj+nC+8F7gpryouZr6boLdMWr6xcSrhGWo7RkpW0Ml33Aba8w54C4N3dLija1iN8VoEwFAWZOg1UBwiVKmeUJPIHQ6ptBIyGFaLaZlm7ymyGRYCFg5Pk1KE0vTo3w0rDwTUmkuFIAZBvYaGMEFhLakJmFJB3psIdvVkoaRLIU0N026NNbCIJbGqZx0mKlNygAsskaXF/PFtxuWKVBC1BdtLneYVlVYqKpUeLMu9Gm7ng5aWSqwfePTzxSluSIs46vNzgdEUrak0kWfWecWtChshpV1qNHpfhHVonshNnWDcLVfnvD+polu9FPDi1j2E5bDphQEyYKfCctx54dk6LWUxgpfFRPlikuOZj4Sr9cZl5EJ0Q4ekg3iw9yJ1aBGut+aFbKotpWvMApZA54qU6oHKl1S0jjuigDfeKSNNIW41kP3nD6ypbwv6ZUJCs85hvMWGC5b5ZUJYebIUUrP5sqgABBuqx4dMUwQhYqBSCMxsIzwmkCnZ+75juqx9i5EZb308LNC/piLbuEFGsPJdV8ITfyqYSE6CHMppg6b+VT9EJhawvDPoTpaOXzIPRBxgghCwGC++CDhGMh1SfcKpH9AdsJ720hxSPcSp/JjthKN8NLZEY80irNEheu+KIIUpa5dzAi0X2H1tPB1ISpQBFnE5kkEW1vGHeJvprBuGxs9Pmpecrc3MSlObkkKl9WGVFSQrS5GYm1z72+kKzTppycW1IWqOVAWpUmFLsDwta979HzRkYdOZ+bB/J1QoQ66zMh1pxaFpN0rQohQ6iN0M3oiUOeRWHAddLxlS9RmmH0L5ZS0pUhWRw5kqy7gQd44W5oxlzTjss0wsNltoEJsgBVibnUanyxUyJcsvKcfLbiEgtoyFXKG+4kbtOPGBmsUcUP01qRcw29ITFFljPLdStFRQooW2m5Kk5AcpB0A5gIuU5NCm5ljvpVJ+WCUL5RXJByyvehFjcA3N+rheNcCXOSLqUHkk2ClXvlve1/MdOiAOaGxHkh1K+5B0ex1yUwhLzNPpuIp+rzlQqtTfS3LsSqQ8Vt5LFSsxCgoADTUDTWNFqlAnJWRnJ12mTiEIqC5UTSx7HcA3bI+Hx88YeHp2ZaxDLKZeW2tKiQpCspBsdQYyp3FNYcp81RJidW/IqnVTamXQFey3PhZt4vfW2+HbTRz04VI1HfURrugFpxp1L4Vre9x0FNt9+MBBLwl5Z8upcKRfxMytNCDzEw4q2KH63iJqs1KTl1TCVFTy2LtF/muRuyiwFhuHGFknyK58Bx/ubMtGRSk50INxcr4kAa3GptuiZ220LksxUJWpFqXcQHQFBa0EOJQAPDJsDYAHeBGA4FNOFtSClSTbKRaG+KWZKTxXNMSM5Tp9vMVCbpeZplYUkEBKT4oBuLW4wvEut9Tky4qaLWUqLykFwldr2UennMC4UkyuQ5NVYl8gUAXU8dYqrISMRTgvYcqdbRMutb1YknDyKTdCMrKQndpqBx6eMXq3KuCuvuqbOVxZKSCPCtv6ob9JO9qn7GPVGKaxOhFKqC52XKAeVW0WlA8UlMYiElTgToSfJGY1JMibCJ1x6SaKFKC1slZ4200uLi14xlNBLpSlaVC9goaA+eFaHzJs36g7Mk1rY5WcdrxHIyfe5RQiSdHhPkW0vfQm/gixvHPlgJNgYrDjiEFsOHLfUX0MWlZibxm7ixTW7JQqzyOsQzxOrNX1/ET2RYVRas3QWK85IPppj0wZdubI9jU4mxKQecDWK8RA9/FFW4oSfmgdDNLiIVpNjFedXOebfFASSoBKSo8wF4E6G++AimUvJBUd0VllZSpY3JAJ13CK2EgnMR03jfU4swmNgq8GqwRKqxCZ/upGJAscoG+KLWvu0te1uF4dRuJKWV2OdKQc26GeIRZySuN8smMJYSFXAtrujPxEbrkf7MmA9mK354iUEDXSKs5B3ERRpAbnSFRUu5s28xW0y6+SllpbhAKlJbSVEAbzpzRYAI3mM+mVap0d916lzzss460WVqbtdSFWuDfgbQTJGCpF/LDarItQ6Yq3vCPnhYCNBzQ0q5/m9TLfBPbBSVmJLmiJSBeCDjBCFQgiPJEXjGKjuhu7rgxk/rz2Ql4Q6XrgpvomPojR2ZKr0+YnO+I6IOEQd8KVQG4MRBwggoKAb4eSeuDZ48zifohIBdQF7dMO5K3rRqCSq4C0XI8kNHcnV2/dCZtsLcCScoPG17ac3GKSLRv2yWW2bTe0iTY2kzFUZoigsLVKJ9/b2MKKDnAJuCU63twvGtYlRhxGKp5GGXJ5dIDyu5VTqUh5TfArym17whZiWCJO4REYQIdUHVuoJ55dUJeEOsP6qnR/q6oaG4lXlYmJuTEHdEG9yRBrl3wqKpE7xEHSDriTujDEC94bYd++Nj9rshQN8NMPH+ccuBfeeyGjuiVXkfyMKZ0nHvjntiza41i9NC08+P1iu2LEB7lI7IIIIIAQi/J374MH9YntixF2XNpxo/pjtjAlsxjiMWxC/wDs9kKTDfEv3xP/ALPZCg798GW7EpciCCxtf5ojjvMTCsoET74RHREjxrwFuYd1qxplMVzsCEW8w8rGtFpSv1UIzFJbkqPKSAIg6DS8APTEk+WFKhAbgxFzfdBe5hTDpglWB5oHg+k/NCTph5Ka4Ln7cHUmEeltxh59CdPeXzDXiIIjWxgF7whQmIJ1gO+I4xjDrDVzVlp+E0ofNChz7qocxhvhnWtgc6FD5oUu6Pr+MYbohFzsoB4RMEEKOVQQQQbChBBBAMA3w7r2kvT0czIhKBqBDrEWj0qj4LKYdbE588RKDpExTE3HPAKomKrkG4inQ8YnfBAyvlTlOfWHAV/Mo24zH1Qk0taHC9MFItxfPZDxZGrvH5irNBeLfhRIV0Qly6Lma8VX6bRbvBe6tIKYyZe6Ib0PRmoE7u5jCQKhzRD9gVNR/EWh47kq/KLLkDfEXi2VdEGc80BtFU9C4SSIgEDeIt5ldUFzzwuYDkV3B3jWGVC1r8uek9kKxqd8NMPEGvM67go/NBjLUjVfkZhTS/s163FZ7YsXvFcwR3U4bXuo9sWxaFk9RobIm5EReIJBgJF94jIYOMZNOuavLj9YO2MW454zKX7sS4H4wdsFboSb8rLlcN6/NH9MwvJNt0MKyR3+mb/DjAJF4Mtw0n5ERwvaKgvSKCTugsYFxrmQy6ykHlmyrTTKbWiVusKsG2ik30JVeLKUgqy31PPGcaaptAcU8yRcABKwTr0QU2Sk0jKxCftq3cXAQm454whMoy6y6TrrmhliBlo1IZ3chDaRlAveEhsBZNyOmC9GxKdnBGWZtsjSWQnm6ItmaWVaNICbDS0WM2m4wZhAbuOolwPgKvyad5NuuKkzSgAlKG7DdcXjGO/dEpBzA2PmjINh5Vn1tSNPUgJupm+ohWZ58ixyHW+qYY1ofYFNH6j6YSm/EGDN+YlRSymT3c/ltZHT4MWFuFxedQANteaKfIYracU26lxOigQQeaFzFtEZjdLnHZF2bbZWpltSUqcA8FOa9gT05VW6jGEU+FHSKFtfxHQ9k1VwGwiQXIVBxDq1uyTS3UkElVllN9bjfe3C2t+ePOl1edW/dutGsBPUaTQAwVJjndVCTjaHc0f5mSQ48qqEfUDDTJUdn82TBEamDUboW5dIkRJGoiBm5jE68xjLcA5lvvPmvlk/RCXhDqWuMHzVwfuqfohNY80NLoSp9fmRBBBClAg4QQcIKCtxzSfcSp/JjthNDmkg95Kmf1Y7YTQXsiceaQQQQQtiiCCIvExgjrDl+6ZsDjLqhMSc0OsNj7LmQQdWFQmUDfdDPlRGPPL9iBBeI15jEXhbFCtK1J8VRBGoI01jLcqEw9T25JwNFtpRWg8mAoXJJGbeQSdxjCvBqTpGCNqAr+cEvfU3PYYxpw/bF/5RXaYvUAE4hlwPhEfMYx5u4qLx/WK7Yp0Jf5H8gdl5llttbsu62l0ZkKUggLHODxHTFsKI3adMOKnimu1ynUqn1ipTE9KUprueSYeIKWG7glKdNxyjzCFQDanSVhSEE3IQL2F9w8kKMn0LZI3kCKkPuIbLaXVhJ3pCjY9f/O6KSErmSltVkFVgpzwdOnmjKmqTUpJcsiZknUKmpdM0ykDMXGlXsoWvp4J80C41iunzSxONNAJKVuoJJSCoWPA8Iv1aYZTW6ih2W5Vxahybmcp5Mg3JsPGuNNd0YEh7qS+h+6DXyxlVoXxDNG3vuaGv5SWiqfsXaEafNYtpjWIam/J0tT6ETM2lvl1sNZvCUlB8awubcYqm6hKM12d73Jl5qSAcYl3JmXAK29UpWU30XbXoMKgFb7RRrutAux9GVIN1pFibm1gbf89cX5lTCnFql2HGkZjZpRzBA4DNxjEN/LE5lai5AO8A74W4yRkpmZlbDcmZh0y6XM6WSs5Ao2BIG69gNYYYmTkrVja/Jp08kKWl2dR1iHWJ1Z6olISLZEqvx3WteKJJpkXpUX7iynzk7T5pU5T5hUu8hCk50EXyqGUjXnBtGMlJ975r7ojKb2I0tFxBSm5UnMCDx3HnhEWuZcq47JzjExyaFKbKHQhYzJXqCARxB5uYmGuKsSvYnxVN12ZkJKQcmSkliRa5NpNgE+Cnhu16bwpl0sOSjiFIeVNFSQyEAFJHvgrj1WiJ6RnJNYanmHmlZdEuAg5d48kNdpCeVy1Md9a0EBTZTcAi43g7jDKvKzNyC/8AV0wvnZ2ZnCjul5SwgWQmwCU6AaDgNB5oYVsEylO0/BxAT0ZppZosT74uNovr88W8pBjacB4qRgvGcpiByiyFYEuFDuOfRmaXmSRqOcX0jR31DJ2Whr6mso1hjOV6bm8JSGHnJSTTLyLq3W3kNWdUV78yr6jdzbhe9oc0/GElJ0HElPfwtSJx2spAamnUELp5C8xLNjpzeaNSWoE8YLSRoSfVDCm1alyFAq8lOUBmempxtCZWdW6pKpJQVdSkpGisw0sYKi4FYap3UqEywo6XhxPNH1rU5QHFUKpXuaaV0zEcpVRapLVTclHESjpAQ6bWVckacd6T5ow4qK3ChLZUspTuSSbDycIpA1sAYUdhY33wEQzolBq+I6w3S6JT3p2ccSVJZaF1EAXJ6owH2XGH1sutqQtCilSVAgpI3gjhDZdLmT6FncbQ6vfBH/aPohLqdbQ7SknA6tN0wOyBHqJV6fMRmIiopPMYpseaFKIIIINeaMFXQdMO6frhSpA86ISbtLGHVNUDhmpjoSfnhoPUnW5f3Qrl3Q1MIcUV5Qb+ArKfIYtE3iADbcYmx5oVlHuRBE26YLRgEaw7w3rMzY52FdkJDpDjDRHfCYTffLr7IMdxKy8jExuDACbboFeMYBugFUTAd0EQTGGAb4Z0A2xHLfG+iFflEMqEcuIpU/pgRovzInV5X8jFnxapzA/WK7Yx4yqkLVaYA/GHtjFtGb1NDlQQQb+MEYoEVte2G/jDtijjFbf3ZPWIyeoJbDTEn3wOG29KT80J7aw4xIPt3m52k9kKBuBjT3Eo8iCCAxGt9RClCYkbxEeSJHVBAx3VtcO0pX6ChCIb4eVDwsKU1QG7MPnhEL80NLcSlt+4RI3xESN8AoBNoICOmAAxmZDun64PqQ5lJPziEfGHdL8LDVTTb3qT88JBugy2RKnzS+YQQWgIhCpG8xFokaQbxujGG+GvvgaHOCPmhbMC024k/CMZ+HTbELAtqT9EYc8LVJ8cyz2wbeUT/I/kY9jExF4mAON/W5ViPa49IQeturfiUjrVC3uuaI1mXfSMR3Q/+Oc9KHvHsStV7r6DT1t1TilsftxIw3UL+EpkdaxCrlnvxq/PEco4T46vPB8vY2Wp3+w5ThybDgzOsW+OIY1ikuzk6haHmUhLaUgLUAY1lhSlTDYKjqocemGWJFk1xab+KkC0FOKjsSlGfEXmKxhx/jNyo/bifW4v30/KD9uEZJ54kE23mF07Fss/UO/W+AdalKD9qA0Jsb6rK+eEhNoLjmMa8ewMk/UOu8kuN9WlPOYZOU9g4cZlTPsBAcKg7wMaoPF0hxOeDhCQHOtRhota6EatOTcVm6lfeeQ41uXHkgFIpo/rtm/QIScYLnnMDMuxXhz9Q8NKpY31pryJg72UjjWU36EwjuYjXng5l2MqUvUPu91GG+sf8MMaczT2qdOpaneUQUZVry+KOeNQubb4d0u4w7U1H4KRfywYz12J1qbceYr7jod7qqbl+hET3HQONSd/dwhvpvvE+WFzj8N9x6ZfDw/Dnz+x/CKeRw7fWbmD1I/hCS8EHP7G4T9THgbw5bWamfQ/hGfR00g1RJk3ZhTgBPhJ4WjVRDnDFhVyrmaV2QYy12J1aVoPVlTnre5VWZyavc3sN8UEYc+FOa9EKHdXlaDfFA3mA5ajxpaLVjm2Gx+WfNE3w18CbMJoBAUvYPC92OgrDQ3NTfnEZUg5QTUmQwzM8oVDLm3XjW4z6MPt9Kj9MQ0Z67CTpLK9WNp+YoPfR/umWmFO5vCKTYXjGMxhsbpSZ8qv4wvqpvWpo/rDGHAc9TQpLKtWPO6MOW9qTHpfxitMxh9KQ4JJ7fYeF/GEQIt0xUtYOiAQkcL8eeNmYeEu7HKpygcKc915/wCMDc9RA4AmnuXvoSuEmaLjRu+gW98IKn7GdKNuptFXnKY1Usk3JKdWEDwgsjSMA1ChZCkUxy17/dItYkJNeXruSnshOd++NKfmZOjRjkQ7NQoltKYv95FPd9F/Ni/3kJoLwudleFEcd8KN+bF/vInvjSB/VZP95CbymJsCI2Zm4cTa6jPyDcpJl6Q5UKaukFdsgvuhcapSb6UkenFNb9rU8fqBCfynzw8pu5GjRjlHXfOl8KSj0oO+lN/NDfpwkO/fBAzsrwYjvvtTtwo7XpfwinvrT9ftQ16X8ITQARszDwom0vz8qjD0s+qQQpClmzROiYX99qfb3IZ8/wDCJnQU4OkBzrVCW0GUncnSpRs/mOu+9P8AzOz5/wCEHfen/mhjz/whJaJAHNC5mU4UR133kfzQx5/4RPfiR/NEv/z5IS2HPBlEDNK+4OFE21moy/rcemUyLQSlwAtjcf8Am8Le/cmb/aeWiliwwbMDX7sPohNYWEPKUtCdOjHX5jk1yW/M0v54O/crbSjy/wA8JojpgZ5FOBDsOe/csd1HlR54nv0xr9qJWEt4LnnjZ2bgQ7G1yFTZdpc86KewgNIBKE7la8YX9/Jf8zynzxFJ9wqnr/RjthNbSC5uyJwowcpaDrv5L39x5TzRBrjH5olfNCe3TEWgZpdx/h4f8uOe/bH5olfNB37Z/NEp5oTdZMGnTGzyNwIdv9zaqNU25iaeSmRYaytKUcg324QvNcZvbvVLG3G0Rhz25MfIL7ITHxzDOTyoSNCGd6Dk1ti3uRKeYwd/GLe5Ep5oS8bRJ64XPLuP8PDt/uOe/bHGkSnmiRXGAdKTK+aEo1g4xs8g8CC6G0UirMTFXZZFOl2ipXjpGoizN1xlE66jvVLqyrKcxGp13xg0A5cQSx/SjEn/AHSmNT91V2wzlKxHgQdTYaCvs29yJXzRSqvMkaUqW80JLQAjmhc8iqw8Ow578s/muVB6ouy2ITKTCX5aRZZdAKQ40SlQBBBFxrqCQeiEV7mC/VGzM3Bh2Ngl60yubZQKZLg5gL21GsZtSrTErUn5ddLYdWkgBa+PXz741mTP2wZ09+ntjMr5/nDM35/ohlJ2IuhDiLToPZKr0mdmeRfYkZFAaUvlphCikqCSQgBIJuoiwO6510jFnKpKMVByVZkKfNBKsqXmCcjnSm4BtGtXgzawOJIosNBDvv1LgkGjy2ht1RT39lgdKRKjnhNnISQCQFbxzxG83gZ2NwYdhz34lyoWpcsNYZVeptSk8ltyQZeBQlQK98aqk+GnQb4dYlCe+DShxZSYZTdmTlRhnWhV3/lvzPLeaINcllD3JlfNCZlKFvoQtYQkkAq5umJmGwzNONBxDgQogLQbpV0gwmeQ/Ah2HTNeYZcCkUuXCgbgi4seeH1JxRT5zEKZnEEuytpLSrrcKlKJy2SBoey0aIN/NF9xl9gILrTjYWnOjOm2ZJ4jnho1JIV4aD1sOX6xTFvEtUSXbTYAJzc3E9MZVSqMsxKya105p0LazAKPidAjV8wHEWHkhrWye9dMPOzBzy1saVJKSJ79SX5nl/P/AAiRWZG1jR2PPCPhFUKpyKOlEdd+ZEf1Qx5/4Qd+ZA6d52PP/CEthEZYzqSNwojrvtTiL96GfP8Awhq/PSaKFKzC5BC21qUEt30TaNR3CHE2ScISWm5xcGM3qSqUYtor78Uz8zNn9r+EVM1KTVMpMvRczg8IBF1HTUmwHAawg3RkyFQm6bOd1SMw7LvBKkBxpWVQChYi45wSIGZluDEdyWJUU2oJnqdLuSc0i+V+XfKFi41sR0GMc1enlxS1U66lXzHlNTfffrhJmiL6742Z7A4Mdx53zo1taRfqXDNE9TfWw46JAlhLoBazcbb7xp2sOmNcEzIvufSYMZvUnVox0+ZcNToZ30k+nFJqNDP9VK/eQj3GJMI5srwojnu+h/m1Y/vIgztDP9WufvP4wmidOcwM3sHhobicoV9acs/3n8YZU5+mrpU6pqVWhpKQXEFV7xqvnh1SSe8lUFz9zhoS12JVqScfoVd2YcAAVT3/AE/4wd14aI9ovj9v+MI4NOaNnZXgLu/qOzNYb/IX/T/jEF/Dp/BJgftfxhLEXvGzm4S7sc8th38lmfS/jDGiqpDlQWmTZfQ4W1A5zw4xqtgN1odYY0rRHO0ofNGjLUSpS8r1ZUVYZv4TM0D0EQZ8L/i5zziErujytBviiA5DKldbv6jzNhj4M380SfWyeM55oRQRsweD7v6jopw3vC5seSMiniiJqrJlnZjlswyBQ0vGuxmUrStyp/WJ7YylqCdLyvVjedZw/wB8XhMPzCXc5zAJ0v5oscjhnd3XM+j/AAjCrXu/N6D7oYwLQXLXY1Ol5V5mPOQwzb25Meh/CDubDajpPPD9j+EIom/RC5xuE/Ux4ZPD53VF793ECToaXElFRcJvuKISa88Sm+cdcbMjOk7cxtNYlaa9OIVMTxZVyabDLe4toYwe9tEO6sf/AG4pxIPs2XVrrLohLfWwuPLBk9dhKVN5F5h53ro1tKyn0P4xBpFJ4VtPowlvz388UnoEBNdh+HL1DvvRS+Fbb9GDvRTb+7Te/mhHBfsg5l2Nw5er/Y2yZp0q5h2VY74ICELVZ07lQtFDkyNKxLRVM2VgeUPM8odsI+G4QZSWmhOlCdn5uvsPO8UvwrEr54kUBn87ynnhFcX3QWHNC5l2K5J+r/YenD7fCqSnpRHreF/dKUP7UI4L6/VAuuwck/UbbIUrkKZPMd1ML5ZFsyVaJ64X+tx23t6V9OIoZvTqim5+4k74SFZ5zDNxstCMIzzy8w79bMxwm5Y/twetmb4Pyx/bEI86ueDOv4Rhbx7FstT1Dk4Zn/euS5/vBFPraqXOyf2xCnlXPhq88BeeP9Kvzxrx7AtU9X2NjpdCqEpV2H3AjKhVzlVc2sYsztAqL1RfdabRkUokeFraMClPuisSwLiyCsXuYmsOPN1yZSl1YAWbAHcIby5diWWrxN1t2L/raqv4tPpRHrcqw/B/nhYJmYv92c9KKhNTI/CHfSML5exW1XuvoWeETBBClQg4wRI3QyZi/JpzT7A53APnEZ2ISDiCYN+I7IxqYnNWJUfrAfni5XTmr0z8e0H9JJ/3F8hfxEB0GkB4QcIF7lQ5tYN5gETAZgHiw5qZy4apiOcKPzwmG+HdZ0o1MT+rJ7IaOzJT5oiSAE3ieOsQd0LcqERxiRugjXMEO6fcYRqKhxUkdkJBvh5KaYLnTzupHZDx3JVdkJOeC8A3GIveFRSxNx0RMQLRIjGsEOMNm1QePMwvshPDrDukxNqtul1QY7k63IxMs+yK64iJPjGIjMfZBBBBABcOMMaKL4glfjiF0MqEL4ilR+l9EGPMhKnI/kY9SN6vMnncPbGLGRPH7ZzHyh7Yx4D3NHlQQQQQbj2JOhi5L3M20P0x2xai9Ke32fjjtjID2GOIz/OB3qHZCknWGmIvvhe/Z7BCo74Mn5mJSXkXyC5guYIL30hRyQdYkb4gb4BvjLcw7rwARIC9rMCEp374c1/8D0/oBCaHluSo8oQWEF+iDpgFQggg4GMYdz/3oU4fpK7YSQ8qH3o03rXCODLcnS5f3YCKuEEF4BQpibwE6QDiIy3AOWvvNf8Alh9EJfPDpr7zX/lx9EJDeGl0Ep9fmTBBBClAggiRGMOqT7g1Pd9zHbCaHNJ1oNT+THbCUbhB6Jk4byJgimCAUDWCDW8GpjGHOHPbz4/UL7ITq+6HrhvhzSpvfIL7IUrJ5U9cM+VE487KeFoNBBBClCRExTEiMYZUL3flvjRjVD3UmPlVdsZFD93pb44jHqXutMfKqh3sSX9x/IxbmCDhrviADfcYQqTBxidbREYxkSft9k8y09ojNr4IxFM36OwRgyuk4z8cdsZ2ItMQvjq7BDfpJP8AuL5CyCKYOMKVJMSN0UwRjFQNjDnEh+ypY87CTCQb4d4i+7SZ/wBXTDLZk5c8f3EvHUROkUnfEg2hEUJi+FzM4pplb5UGkZEcovRCb7hFiDogmMotPyqlXLet0bwrTnjPrYHeil8fYj9EJtyYc1bWhUtX6ChDLZkp80RKd0TBBfWFKh5YY1M0UtSneczhUGB3UZkJHst9ctidLdULbxN4xjLZbp6qTNOPzTyJxKkBhlLd0LB8YlXC0Zkxrg+U3/dVQoO6HDuuCJc8z6oKJ1OnzEtrp3RFoOERC3KPcnzxEEEAwQ7lRfBs4OZ1BhLwEOpHXCVQH6aIaO4lXZfMSHfAYkb4iFKMIIIIxkEOaPrSqmD+Jv8APCaHVDP2HUk/6uYMdxKq8okG6JgPjGDhAK3Iud0RExPCMAgc0OcM+7ielCuyEsOMMn+cLQvvBHzQY7iVV5WKnhZ9d/hHtiiLsyLTjo5lEfPFqAx47BBEcDE9cYYIy6abViWP6ae2MSL8mbVBg8yx2xloxZ8rMmti1fmvlDC+GmIRlxDMj9K/zQrgy3FpvyoIOGvPBBCFAiU+NEQcDBsYdYjF3JM88siEuhh3iDWXpyueXT9EJB0w0tydLkQRBGkTwimAUDjERMEC5h4vXArP6MwRCPhDtGuBlfozH1QkO+DLWxOl1+YQQRB3QpQDACYiC8YKHmH/AAmp5HOwqEh3w8w0bzkwj4TCvohIv7oRDPZEo88imCCCFKBBBBGMZVONqrLn9YO2MiuptiCZ+N9EYsmctQYPMtJ+cRm4hFsQvdOXshv0k3/cXyFloIIIUoEEEGvNGMESN0REjdGMMaIkqr0sP04tVU5qxMkfjFb4ycPpzYglx0k/MYwp5Waovq53FdsP0I/5f2Me+6J3xRe5isQuxYi0TBwggGJHPDqu6SVNRzMX7IS+88sOsR6PSYJ3S6RDLZkZvzx/cSaX4wQQQpW4RJiIBrGCEO2fBwU8TxfHZCTTnh2fBwKn9KYh4EqvT5iThBa0TaI80KioQcL3g8kHXBMSN0PMPiyZ5RO6XVCTcId0E2laio8JcwYcyIVuUSG19IIjUE3iQbwCzCCCIvGFsTDXDwviOWPSewwquIb4bH84WL8M3YYMd0TqcrF86b1B/wCOe2LEXpv2898c9sWYD3GjsgggtBYxhrh88X5IXqLA53Ej54s2N4yJEfbSW+VT2xkLLZmXiE/zhf6LdghXxhpiDXEMxbnHZCuDLmYtLkXyCCCCAihN90AGukRaKkweph1iAWclBu9gEJCIdYi9sSo5mEwlO/ogyepKkvKiLRVFPTE2tC3K2Jg4RGsTGzAHdQ+9SmjpX2wlO+HNS+9imj43bCXXmh5bk6XL+7AQCA6cDB5IVNFAiRuiIkdUFbmHDf3mvfLjshNDpH3mvfLjshL1QZPYnT6/MILGDyRJOm6FuUIgg8hibaboIRzSfcKp/JjthKYdUn3CqY48mO2E2+G6IlDeRERcRV5oLQpQjfxiOsxVaC0C5hvhv3Vct+JX2Qqc8c9cNsN6VZY/Ur7IVOarOnGGv5UTXOy3YwWirhuiDugFCIkb4IBGMMKN7uS3xxFip+7E18qqL1HNq3LX/GCLVVFqzNfKK7YboTX9z9jEg88FoLEQlyoeeC0ESN0a4C7LaTbfxh2wwxGm2InupP8A3RC+X0mWyfhDthliQ3r7iuGVJ/4RDX8pN/3EJ4ImI8kArYIgjWJ8kEYADeId4i8eSN/wdMJBv3Q7xDYiRt+TpjJ6MnLniJIILHmg15j5oCZUkHSC4g1iPPGuAquMu+HFVB9b1MP6Ku2E3CHNSucM00nhmHzwy2JVOaPzEsAIgtfniCDxEIVJJHCC4imCNcJVbph2vwsDt9D5+mEgMOt+B9OD8NF7kqnT5iPhBYxNrwbuMJcqRYwWMBgjGsTwh3TRfC1SHSg/PCPhDyl64ZqY42T2w8CdXl/cSe+iIBvghSgRFtd8TBGMEOqBqifT8KWVCXjDvDn3aaSeMuqGjuTqvyiRXjHSCA+OYLwpUixvERVeKfLGMENsOKy4jlum4+aFPG0MqCbYilPjnsgrcWryMxZ5OWovjmcUPnjHjLqWlYmh+tV2xiRnuNF+VBBaCDjCsNw8sXZU2nWvjjti2euKmTaYbPModsZbgeqY0xJ98L3TY/NCiHGJRavqPOhJ+aE8NPcSnyoIIIIQpcLAawHdeDjBBuEc125ptLI/EAQlvDusDNQqUv8AVkeaElt8GW5Ki/J9SLGCxiqCBcqU2METeA74Bh3L2VgiZHEPD6IRnfDuS1wdPj4LiTCTiIZ9CdLeXzAxTFRim0KUCCCJEYKHWGT9uFJ52lCFDgs8euGuGjavIHOhQ+YwsfGWYcHMoj54Z8qIr+4y0d0REndEQpUIIIIxi6ybPoPMQYaYlTauFXwm0n5oUJNrEc8OsT+6bKudlJhlysnL+5H9xGN8VRSN8VQpQNIABDzvtRR4tGHlVEd+aYPForQ6zD5V3JZ5+liTTpiQdIdd/JEeLR5fyxPf+WAsmjyw8kHIu5s8/SW8Ni9dQrXwUqPzQufSpUws2OqiY2Ok1RM3NuJTIsMBDZXmSnXqhecQugkCSld/FEFpW3Jpzzt5RQG1A6pMTkV8Ew3GJZkbpaVH93E+ued4NS3kR/GFtHqymafYUcms7kKPkg5F3g0s/sw2OJqhwSwP2IoOJKmeLI/YjWj3Bmqdl9Rchh4qA5Je/mhxiBl52fZDbK1WZSPBSTFluv1Nx5COUTqQNEiM2tVeekqmuXlnciAlPvRzQfLlJviZ1ohGJGc4Sr3oGKhTp07pV70DF/1w1b8pPoiD1wVU/hSvMIVZStqnsWhTJ/8AJHvQMSKTUTulHfRio1yqE3M455DaKTWKmrXu10ftQfKb+p7E96anewlHPNDZynTqsJsyqGFF0OlRRxAhOapUlb5170jDebmppGEpN0TDgcW4q6wo3IhouKI1HUvG9txd3iqp/BF/NE94Kp+Sq84jFM9OnfNvH9sxBnJv8qe8qzCpxsWtU7ozBh+qkayx84g9b1UvbkB6QjCE1NEWMw56RiDMTBv7Ov0jGzQBap3Qx9btTP8ARJ9KGlLpM5LSE8hxKMzrWVNldMazy75vd5enTDqlLX3hqbilk2bAFzu1h4WbuiVZTy7osetyo33MjrWIkYbqHEsD+8EKlOO31cV54jO4f6Q+eFTRXLP1Ib+tyc4vSw/vBAMPTHvpqWH94IUZl/DPniMyucxrrsDLP1Df1vuDUzkr+8EMaPSlSlXQ8ZqXcAzDKhdzqLRq4UTxhxhu5rGv4tR+aDFq+wlWE8r1Lr1CDj61moSguSbZxffFPeBAHunKD9qE7h9mUecxRcwG12GUJWWo7NBa/Okp6UR3iYG+ryvnhNcwZjAzLsHhz9Q57ySv54lfPF6UpEo3PMrFWl1qSsEJHGNfvGXSvCrEsD+MT2wVKN9hJQlZ+YeVSmST9VeddqrDSidUEG4jD70U23u2z5EmMOtG9emtf6QxgQZNX2NCnJRXmHfemlW1rTXoxHeulAa1lHowkJiRu3wMy7D8N+odCl0kH3YT6BipNNpAVfvuD/dwj8sVN6uAXO+NddhXTfqNrq8nTnXmjMVDkSlsAJyXuOeF3e+ifndX7v8AjEYkFqi0LnRlA+aE2vPBk1fYnSpvKvMOu4aGB7qr/dxAkqEP60cP93CXyxGkDMuxXhv1DzuSg/nN30IjuWgXH2xdPQEQl8sRx3xsy7GVJ+o2ydYpaqNJoemnEtJCsikpuVawv7nw/l9uzF/iRNU0w9TR+io/PCTWGlJdidKn5eYdCXw/+WTPoQchh6/tuZ9CEtoOMLmRTh/9w65HD35VNH9iDksPDdMTXoCE2+Ab98FSNw/c2tCKOMOqTyj/AHPy2qreFeFvJ4ctcPzfm/hEJNsGr/tEJ4MpbE6dPfXqOeTw7+NnPR/hEZcO/jZvzCE0F+iBmXYpw/djnJh38ZOeYRUEYdKT4c55h9UJIqA0MHP7G4fuzapFNI71zvIKmOTyDlMw1GvCFoGHhvXNnzQUr3DqfyY7YTCC56IlCn5pasc2w8PfTZ80BOHbfhfzQn3QQM3sU4a7scXw7fdNfNE3w7zTfnEJTuiI2ZdjcNd2bXRzSO+B7kExn5NQIVa1rRgKOHsxzCavfnEW8N+7B+SX2QreHs6teJg5tFoTVLzvVjXNh74M35xAVYfP5X80JbdMGnPAz+xXhLux1mw/zTfnESFYe/1v5oSjoiq2upjZvYHDXdmxU80MVRgsCZ5TOMua1t8E8aEKk93R3Tymc5stt8KaV7sy1j/SDtgrHu5M/KGC5aE+F/U3ZmFWHb2Am/mgvh74M380JbwXhc3sV4Xux1fD3FM380F8O2vlm/OISwRr+xuF7seNnD/KpyiauCOI54zqx3m75HuszHKEJ8XmtGsM6Op1O8dsNsSj7c9baeyGzaEnS/qLVlRGHeCpuIth34c35oS2tBAz+xThL1MdZcO/DmvNBlw5+Mm/NCWCM5eweF7seBOG/hzfmEM6qmjKblVTTkwkcl4GVPCNQEPK8fsOnnnZjZtHoSnS8y1YFvDZGj036P8ACI5LDnB+a9GEnlggZiuT3Y65LDn5RNejEcjhvjMzXoQmiOMbN7G4f/cx5yWGwj21N+iIYzTVIVQ5TlZh9LAUoIUE6nrjUuEO53XCEiOAcVBjL2J1Kesdeochh0/hcz6EQWMPEazkz6EJbQWgZinD/wC4c9z4f/LZn93E9zYe/Lpj93CXWC5jZvYPD/7h13NQPy+Y/dwxSxSjhtTaZp0S/KgleTUHmtGp8YdMX9Zcx0Ophoy3uiVWm7LzdQEnQbe6T37uDuOg/nN393CW8EJddivDfqHXcVDO6quDrbg7golvdZf7uEsEbMuxsj9Q6730S3uwf3cMpGUp6KTONMVDO2tIzryWy2jVOm8OaOL0ipD9UD88GMlfYlVpvLzAKZSb61pJPQiJ71UneKynyohJbwoDAuuxXI/UOu9NLO6tN+iYjvRTD/XLXlSYSjdBc88a67A4cvUOu89O3isseYwyo8hKS8w6Wqi0+S0pOVI1HTGp3PPDnDV+/CwDvaWPmgxautBKtOWR+YrVRJMrUe/Mp1axT3jlL+7Ep54TOaPKA4GIvAvHsUUJW5h33hlyNKvKHywd4GfzrKelCS8Rc88a67ByT9Q8GHm/zrKelGVTaImWqrL4qMqvIq+VKtT1RrV4zKSSK3LH9YO2MpK+wtSEsr8w3nqEXqk+6J+VTnWTlUuxHQYx/W4u/t6VP7cYVYuK9NfKGMG5HGM2sz0NThPKtR0cNvk+DNyx/biDhyYvYTEv6cJsygfGMGZV75j54F49h8k+45OGp3g7Ln+8ECMOT4cBzMGxv48JuUWPfGKg84FDwjGuuxss7bm0Vqhzs7UkvM8nl5NI1XbUCFpwxVB71o9TgirEi1pn5cpUQDLpOkJeVeP9Irzw0nFslRjUyrVDb1tVX8U36YiPW5VvxCfShYH3h/SqHlie6H+Dy/PC+Uplqd0MPW7Vb+17/tCI9b9WvrKK06YwBMzN/bDnpGKhNzYPtp30jAvENqndGwztKnn6DIy6GCXmrhSRwhV3gq+v2EvyERnzU1MjCMm4mYcC+UUCoKNzCYVGfH4W/wCmYaTjclRVSzV0ZBodVH4E5FJo1TG+Sd80Wu+lR/LX/TMR30qX5a/6ZhfKWtU9io0mpX9pu+aKe9lQG+Te9ExWKxU0/hj3pRIrdTBuJx3zxvKFKp7DOmykz63KiythxKlZSkFOphQadPfkb+n6sw/o9TnH6XUXHpha3G2gUEndCo4hq1vbauvSHajYjTdTNJWRi97p/eZR70DFCpKbG+Ve9AxneuOrX9sq9EfVB65Kt+UA9aR9UJ5e5T+p2QuVKzCfGYdHWgxAZdH9Ev0TDL1yVa9+VR6AiTiWqH3zXoCN5e5r1ey+oYeStOIWLoUNSNRbgYwZxpaag94J8c9sOqVXJ6Zq8uy7yWVawDZABgnMQzsrUHmAhkhCyBdFzaG8ttyadRVHp07mvFC/gnzRHJrv4ph566Jsixl5U9HJxHrlfO+RlD/dwto9yuafYSZSDqIjLDw4hv41NlD+xEd/2vfUqVP7No2VdzZp+kS7rQ5xEQp2Tc+FLiJ7+SiiAaRL+b+EZ9SqEqzLSjj0g29yjeZIJtl6IZRVnqSnOWeLymqaRVDoVelnxqM35FRIqlHJ8KjjyLhcq7lM8vSxHcxMEEKVDjAN8RwiRGMO8P8AgtTznwWFQkO+0O6L4NJqa+Zq0JDrDSWiJQ55BBeDWJG+FKka88FzEmIhkYyJIXqDI51jtjPxEScRPg8LD5owqanNWJYc7iYya6rNiKaP6f0Qf0kn/cXyF0EEEIOER0CJgjDBDypAJwpTU3+EYRw8rHg0Klo/VXikNmSnzR+Ykg54DuiImVuEF9YOEHZGMHRDum+DhWpqPHKISaQ6ktMHz5tvcSIeHUlW5V80JeEEABggFUEEESN0YzZCR4Qh1hr3TdPMyowlG8Q7w4bTkyo8JdUNHcjW5GJ1aqJMRATc3iDaFKomCIHzQRgkxnUYXrsqP1gjAG6GNDF6/K/H+iCtxKnKyir616c+VV2xhcIy6ob1qb+UV2xiHhGe4IciCCCCAYIqR46euKYqR90R1xgocYlP21QP1KOyEphxiT3Zt+qR2Qnhpbk6PIgggghSoDfE2NxEQDeIwB5Vh9oqZrf2NXbCWHVYFqLTPkjCTnhpbkqXKTBBwiOEKUJgEQN8Txgow5t/MxX9ohMYdH7yv+0Ql04Q0idPr8wEB3QRJ3QClyIqimKoxhvS/cGp/EHbCiHFL9wKn8QdsJ4Z9CUXrIIIIIUoiDuiIkxEYI3w37t/3a+yFjv3de7eYZ4b92/7tfZCx32wr4xhuiEXOymItEwQobhBBBGMZdMP25lvlE9sVVn3emflDFNM915b5RPbFVaH2/mfjw36Rf8AJ+xgkaRPCI8sTCopfQgiI1EVQcYxrkt/dEw2xJ7rpP6tPZClH3UdcOMSD7at/JJ7IZcpN86E0EEEKMRYRNhBB2Rgop4w8rYvTKar9TCPjDusa0amH9Ue2D0Yk+ZCS/RAbweWIMAoTFJ3wQQLIxOloczf3nSeuodVCbgYcPgnB0udD7MYMCdTePzE++DyREEBlAMEEEBIKCHUrY4Lmx+tT9EJYdShvhCeH6aT84h4iVNkJYIDvghWUCCCCAKG5MO6HbvfUUn8TCQ+LDuhasT6edhUGO4lXlEY3mJgVYncYp6oHUsiTpuiInS2oiIwQ46w5w2R38SOJQsfNCcb9YbYbNq+yOcKHzGDHdE6vKxW8LTLg/SMURdmRaddH6Z7YtQGOtgggg4xghGVTTaryx/Wp7YxeMX5I2qLB5ljtgoWa8rMuvDLiGZt8KFsNMQi2IZjpIPzQq46wJbsWlyL5EwQRA3QpQIqGhG6IiRBQGOcQgKXJLNtZZPbCWwh1XfClKavnlwPnhIdwhnuTo8pMU3gggFbhEjUxESN8Z7BuOX/AAsDsK35X1CEtzDzfgP4sz9EIzv3xpPYlSe/zI3jSIirhBwhShTcwRI3xMYw6oBJkqki+9i/zwkuSDDvD2vdyeeXVCYjS0O+VE4c8v2KLmCCCEKBEjfERI3xjGbSDauyp/Wp7YmsjLXpkc7kWaectTYV+mO2MrEIy4imRu8K/wA0N+kT/L+wsjYcDYdXinaBTKKGypp14KfIHitJ8JZPkB88IW21uvoabQpa1kJShAupRPAAbzHqXY/s5Xg+iLq1XZArU6gBSCNZZvfyfWTqeoDhCSZZK5w7avhVrCW0yclJKVEvT5kCalG0+KlCt6RfglQI8gjSbx672pYBRjrCnJyuRFVlLuSi1aBfO2o8AbDqNo8lzsnOU6oOyU9LOy0yyoocadTlUgjgRAi76GlHqWRqLmHNWObD9MX+gRCYbvmhzP8AhYSp6uZahFI9SE+aPzElzFV4IIUoEEEEYwRIiIIxh3TBlwxU19CR88JLWFoeS3seCZxVtVuAQj4w0uhKnq5P3CCCDWFKhBEgQWMFGM6jC9elB+sBiasrNXZpX6wxcw+kLxDLjmN/mjFnVZqo+d91q7Yb9JL/ACfsY8EEEJYcOEEEEawwQ8r2kpTkczAPnhHxtDvEOi5JHNLph1syU+eKEkEEEIVCCCC0YwQ7Y0wXMm+94DshJxtD1Iy4HUfhPw8CNXp8xHAYDu8sRAKEgxG8wQRgoId4f3zyuaXVCSHdB0lqirmYIho7kq/IxLrfWARPEwQpUIIIIwAhjQRfEEt8b6IXQ0w8knEUv1nsgx3Eq6QZi1I3q8yf1iu2MUxkTpKqlMHncV2xj+SA9ww2QQQQRgsIuNfdkD9IdsW4uMg91NC3vh2xgPYaYkP29UOZtHZCeG2JAe/7g5kp7IU2MNLcSkvIgggtBCjhEjfERIGojGHdat3opY/UnthKN0O65pTaYDb7h9MI9whp7k6XKTBBpzweWFKEXHCJB5oNInSMYdHTBIP6/wCiEkOl6YJTrvfPZCa19YZ9CdLr8yIBvg8gghShJ13QWN4jdxib23wxkOaZ979T+IO2E4hxTLet+p6jxE9sJh1w0uhKG8iYIIIUcgxFjFUEYKG2G/dv+7X2Qsc9sr6zDPDY+3n92vshY593V8YweiJrnZRBBaC0AcIIPLBGMZNOuKtL/KJ7Yu1zTEE18c/RFqn+6sv8onti9XNcQzXx/qg/pFXP+wv3iJgtYQQq2HYQQQQQEp0VDjEnuk0edlP0wnG+HOJPb7HSyn6YPQSXOhLBBbW8HGAUIPPERUd0RaMEjhzw8quuHaWbe9VrCS0O6oP5s0w9CoK2Jzfmj8xHBvgg8sIUIO+IiqII6YxgvDlQvgxPMl89kJvLDpIvgpfRMQ0RJ9BJxggtBAY4QQeWJ0jIKIh3TxmwvUknhlPzwkh5SvCoFUTf3gMNF6iVX5RId8RBvifJCDsiCJ15oLGMAjjDvD2rs4k8WFQkh1hzWeeTzsKho7iVeRiU+MYiKlC6zod8QBAZVEXid8R5IPJACyLGGuHTbEUsf0rQr8kMqCbYilelyDF6oSpyMw50WqL45lntiwYyqiLVWY+UPbGLGe40OVB88EEBgDWYcYuMG0yg8yh2xb4RUjR1PXGQHsNsTD7funnCT80J4d4oFq1m520mEkafMxKT8iD54IIP+bwpQIkb4iJG8RuoB1WRejUpQ4tEdkJCRDyqa4apauYKT88IzYgQ8tydF+Ui8RYxNtYLwCpHG0SNDBbW8TAMOWrLwLMD4L4PzQkOkPpJObBVQB4LSfnEITvMGXQlT3l8wgiNOYRPkhSpB3REVGIjGHWGjefeR8JhY+aFC7hw9Bhthn3bCT75tQ+aFb6SmZWOYmG6InHnZZggghSgQDfBEiMYuyptONHmWO2N7pmCl40xtMSLdbptLyJQu825ZbmYH7mgeNaxvrxEaGzo8g9IhtiUDvslVh4TSSBbogrYRv8AqI9QYJ2U4awU4mcaSufqY/DZgAFF/gJ3J69/TG96Wt5uqPKGAtsGIMJTDUnPOu1SkXsqXdXmcaHEtLOo+KdOqPUFFrNOxBQpar0mZTMSkwnOhY042II4EbiOBERaZ1JroZ9r6Gx6DujUcabN8N44aCqjLql6gkZW56XADw5grgsdB8hEbPOTkrT6c/PTr6GJZhBcddcNkpSBe5+qPM+P9tdYxDMvU7Dbr1LpPi8og5H5gc6lDVAPwR5TGWuxpOy1Nfx9s8cwM+hCq/TagHV5EtMrs+jQm629bJ0te/GEb/hYLljbxXlCE2a6lFVyVG5J4nph0PDwWoD3jwi0Tlrbr5iWCJtEQBwghuMN1IjVLY61iKhhqetq6wnrXDZWT40O4mgO6HPrcmR401LD9uA4fUPHqEqP2o2Vg48O5WTkwLb4T8I9Y2t2moOG2JVc6wgBZVyl9DC7vLKDxqxLeT/9wZRZKlWhrr1El4qEOe9NNSfDrDXkTB3uoyd9WB6kmBlZbioT7hEX0h13FQhvqaz1IP1RHcuH0/h7x6k/wjZWbirsynDfu6g8ySfmha+c046TxUe2Njo7dIRPLXKPvLUlBKs4sAIw1DDmclSppRJubC0NleVElV/qN2YjtE7+EOc2Gvxc0fLE8rhtP4PMq/atGylOL7MS2MGtt0ORM4evpITB61wd10Ea97XCelcDKbiPsxQm5WLDjDjEnuk2kG4S0kRLc/Ry8lKKXqSN6umM2r1GRZqam36cl9YAutRtDKKsyTnJ1F5TWNSdBBrDnvxTQfBo7HlUYq7+SfvaRLwiiimeXpEllQEG+kO+/wAyN1JlfRik18X8Gmyg6MkbKjZ5+kThJvfXzQ7euMGsJA1LxMWziBz3shJj+7hjNVZ5nD8rMpaYzOKN0lGg37hDxS1J1JSutDWMireKYjk1/AV5oa+uOd4Ny46kQeuKocORH7EDQpefYV8i6dza/IInkHzuZcP7JhkcQ1E++aH7ER64apwfQOpIjWia8+wvErME6MOeiYc0Vh5EhUQptYKmrC6TrvjG9cFU/KfmEM6dUpx6lTzzrxUptAKNBobmDG1ydV1MuwhEhOn8Fe9AxV3tnyNJN/8AdmL5rlTJ9snzCI791M/hSvMIFolL1C0KZUCNJR7yoMT3qqPCTe9GK+/NT/K3B1GKe/FS/LHfSjaGvU9iRSamd0m95oZUKmz0vXGXZiXWhtN7qPVCsVWo7u7XvShpQJ6cfrSEPTLq0ZSSlSiRugpRuTq58j2MR+jVNc04pMqogqJvcRb7x1T8lV5xFp2ozxfX9lvWzGwzmLfd87+VvemYDauMuIl0MrvFVfyY+kInvDVPyf8A4hGJ3dOflT3pmI7sm/yl30zG8vU39TujM7wVb8m/4hF1mg1RE02tbFkpUCTmELe6pn8oc9IxelZh9U+yC8s+GNMxjLLfYElUs9UOqzR6hOVh19lALZtY5rX0jA9b1T+Aj0oivvO9/wB8BxQGmgMLOVd/Gr88F5b7CUlUyLVDT1uVEi+Vv0oPW5P87XpQr5V38YrzxGdz8YrzwPL2KWqd/sNfW7P8VsD9uJGHpwG5dl/ThTyjnw1QBa76rJ6zGvHsbLP1fY2mqUp+alZJCHGQW2gk5lgawu9bkzxmJYf3giuvKUlinAE6y4JhGSb7zDzy32EoqeVajn1uv/lUr+8EHreev7clf3ghNmPOYnMeeFvHsUyz9Q59bznGdlP3ggOH1AXM/K+mISgm8TciNddgZZ+o2tdKJw2mV7qY0dzZ83g8dLwu7w2/rCU9OB0/zJZ3fdzw6ISE6mDJrTQnSjKz16jo0H/4jK+mIO8Q41GU9MQlvEwLx7FMs/UOe8aPzjK+RUHeNs/1nLD9qE1ukwAdJjXj2Nln6japOmNtUmcYE4ysOJAKwdE2PGF/eNrd30lfSgpv3vVH4qe2E1r7yYLa00JQjO78w57yM/nOW88HeVjjVJXzwmyiC0DTsUyy9Q5FGl/zpLeeJ7zS/wCdJbzwltBYQNOxskvUbPSKczLVQOonmXVZVDIg6m4jDco0uXSe+ksNTpeLeG/d1I4ZFdkLHvbC/jHthk1ZaCKEs71GveaW/Okt54nvLLfnWW88JbRNhC3XYfJL1DjvNK/nWWie80t+dpWE1hBaNddg5JeofS1Jl2p5pwVSWUUqBCRe513RcqdLl3qs88uosNFSrlKr3EI5KwqLHxx2xlYgFsQzNr+N9ENdZdieSXE5jI7yyv52lvPB3mlfztLQmtzk+eC0Kmuw+SXqHXeaVH9bS0R3mlfztLQmsILdcbTsbJL1DoUaUuPttLfPDGr01iafZccnmWrNhICzv6Y1UQ4xFfl5TXewmHTVnoSlCeePmJ7yyv52lvPEd5JbhVZbzwntBCadimWXqHHeWX/OktfrgFFlzuqst54TWEFo112Dkl6hz3kY/Okt54YzlObfokmx3awlLVwFqOiuqNWhxUNcKU49KoaLWuhOcJZo+bqBoLWlqnK+lEd4W+FTlPShMdADEXMKnHsWyy9Q67wo/Ocp6Qg7wo/Ocp6cJbmIuYN12Nln6h33gT+cpT04YopQGHHJTuuXN3QvPnGUdEap0w5YJODJgEn7uD80GLj2JVIzsvN1J9b9/FqEpf44g9byuE/K+mISm44mAE33wt49iuWfqHXrdcO6dlT+2Ij1uTH5VK/vBCU6mJuecwbx7GtP1Dn1uTG7uqV/eCGFNo78vT55pbjKi6gAZV3t1xqoWoHeYd0QkyVTBUT7ATBi432JVozyvzFHrcnd4cl/Tg9bc/bRbHpwpzq4KMGdfwz54DcexVxqer7DU4cqHOz6cBw5UtLBr04VZ1/DV54M6/hq88Dy9jZandfQa+typfBb9KGVFos9Jz63XgnKW1J0VfUxrHKOcXF+eG+G3nDXEpUtRBbVoT0Q0ct9idVVMj1X0KVYdqhWSlpJF94WIo9b1V/Jx6QjCfeeEwuzq9FH3x54t90v/jnPSMK8u1h0qlt0MDh6rfkxPlEQcP1b8mPpD64we6pkbn3B+0Ynuyb/ACl30zG8o1qndGb3gq1vax9IfXGXTKNUpasy77kuoJQsEm4hQJ6cB9tPemYy6bPzZqsuFzLpSXBcFRIgq10JUVTK9VsZFRo1Rdq0w41LKUhSyUkc0YhodVH4Gv5ov1ienG65MobmnUpCzYBVrRhCpVAbp1/0zGdrmp8XKti73mqY07hdPkik0mpD8Be9GIFVqQ/DX/TMVCsVMbp170oXyj/1PYp71VH8if8AQMAp0+FAmTfH7Bivv1U/ytyKhXKp+Vq8wjeU39T2GOI5SZfnmVtMOL9hTcpSTCUyM4PwR/0DD+tVSellyoYfKA4ylRsBqYWDEFVH4UfRENLLclRdTItDB7kmxvlXh+wYDLTI/oHfRMZ/riq35QPQEAxHVvygHrSIW0WUvU7IXlh8b2l+VJiC06Dfk1eaGYxJVeLrfoweuSpbippV+dEa0Ua9TsXp9CzhOQOU3StQMIylY96fKI2l2sTQw2zOBLRWXSk3TcceELRiOctqzKno5MQ01ESlKaT06ijKbbjBlPT5objEkzexlZRX93FXrjUfGkJQ9TcLZFc0/SJbc0Twh164Ue+pcof2Ijv8wfGpEofJGsu5s0/SVU05sL1NN9yUn54Qm990bZTqkzMSE8UU9lsIQFKSj346YXCs0/jRmPIowXFWROE5KUllEliOET4XMYdir0onwqK1+yqKu+lEtrRgOpcDKu5TiS9Ih14wa9EPe+NBO+lKHU5FPdmH1X+1zo6lwMi7m4r9JZw4bYiYvxuD5owZzSoPJtuWe2H1Mfoqqs13NLPIdKvBJVpFmbVQRPvB9uY5QLOYpOl76w2XQmqr4j8r2NfsYLQ6Bw4TqJsQZMNKP3SbHkhcrKcX2YltBuh2GMNndNTKetMAlcPH8PeHWn+EbKbirsxMnfeHeJDd+VXxLCYjuKgE+DVHB1oP1QxqkpTphqUU9PhockAlRSfCHPDKLsTlUWeOhqUda2EYxdpGNBhqaePcNUOVsKOjb48Uj43inyRoHeulq8WsN+VMXpSQYkqgxOSlcYQ8y4l1tVtykm4O/ohMuhZVknqdR9UDjN1yoM4KknLMNpTMTtj46zqhB6APCI5yOaOGE3MbXXGnsRYhnK3Ua3JuTc26XXCkBKbngBfQcwhf630nxanKH9qMoNI0sRF9RIIeSYz4TnQferSYj1uu+9n5U/twxkqQ+3SJyWL7Ki6AUlKtBrxh4wZGtWhlvc1a8RDj1tz58Vxg/txHrbqZ3IbPUsQmVleNDuKi66re6s/tGDMr4R88UwRrsoTc/CiOOpgiRawOkYKHVSHJ4apqb65VKvCS1uMO64MsjTG+PI3t5oSHfBloyVLluB37zBeCCFKBBr0wQcYxh1h7wVzjnwWCITkeETDmiDLTak4Tuat2wmI0hnsicOeRTpBpzGJ0gAtClAA64mCCMwXMiSTnqLCedxI+cRl183rz/QQPmEWKUnNWZYW/pB2xcrZzV2ZP6dob9JN/3DA0g0iDvghUigac0GnNBBBsYLaQ6qemGaYnoUYTQ6rKctFpY/Vk9kPHZkqj80fmJIOEEEJcqEEEEa5rBxh5TdMM1FfQkfPCPjDySNsHT551pHZDRJ1VohLxMQYDvvEQCliobojSADSJtaMAIcYaH28BPBCj80J4dYa91HFfBZVDJ6kqvIxO592X1xTFS/uij0xT5YXqUCCC0EYARkSetSYH6Y7Yx4y6aL1iXH6YgrdAk/Ky9XTfEEx1wu4QwreuIJq/w4wRpGe5qXIimCJO+ItAGsEETaIHGMaw8xDukB+oEJOMO8RAZ5EX3S6YSEaw8tWSo8iI4wRI3xMLsUIG6JMETw3Rgjl77y2B+uPYYSHeYezItguW+WP0wjhpdCVLZ/MOEEEG/SEKBEgaRFrRUAbHSMYcU773ah1J7RCcboc04fzcqJPMO0Qmh30JQ3kEEEEApYIIIIxrDbDg+3yPiK7IWPe2F/GPbDTDfu+gfoK7IVvfd1/GMF8qEXO/kUQQQQhQIIIINjF6T90WfjjtjLxB98MzbXX6IxZP3QZ+OO2MzEA/nDMdf0Q36Sf+RCzdBBBCFEEEEEG5gHjQ5xF90k/kEwmHjCHWIRrInnl0wyejJS54iWCCCAOEEEEYNiOMOZ03wjT+hahCeG81950kf1qhBQlTePzEx4QcIk8IiEWxQpgiTviINzBwMOZbXCE30OphOIcymuEp7oWkwYLcnV2XzQn4xBiYIFitimCKoIBrFMOqBrL1If6uYTWh1h0XVPD/AFdUNHcnW5GJIIPewQpUIIIIxiOJhthw2xC10gj5oVQzw+f5xS4vvJHzGDHcSryMwJrScdH6Z7YsxlTotUXxzLUPnjFgPcaOwQQQRhrAd0ZEibVJg/pjtjHuIvypAn2fjjtgrcE9mZVdFsQzXxrwuhriNNsRP26D80Ko0nqLSfkQQQQQhQIIIBvjIFx3X9W6cvnYEJOuHtcN6VS1/qYRdMNPclRVoWCCCCFKBcxI36xEHGDYw7Iz4JH6L8JN41h5Lm+CHwd6Xx9EI+MNLoJSdrr3KeNjpBpzRVEcYQsGloiwgO+JG+MAc0Gxlqi2PfMH6YS254dYdGaYmkc7CoSnfDPZE4c8v2I0gv0mJiDuhUVuF+kxEEEY1zOo6gmty6r+/EVVhGSuTQH4wnzxZpyslUllXtZxJ+eMzEKQnEUwOkH5hB6Ev8n7Cq+loNIiKtIBQi/XERVa8FrRjEC9xDur+FQ6Yv8AQIhLbWHc6M+EKev4KlJ/580Mtic+aLEd+mDyxPAQQCtyPKYL9JiYIBgv+kYd0M5qfUm8x1ZJ7YSDjDrDllOzTZ98wqGjuSrWyMThawdHD54qD7ydzqx+0YoPjEREJd9ylkEEEEEwRIBI0ggjGQ5xCkpmJNF/Fl0wlO+CCGnuTpciJI03xEEEKUC1+MGU9B64IIxh7SUKGF6q4LaJSO2EtjbhBBDPZE6e8vmU++iYIIUdhBBBGAMKIgrr0raw8Pj5Yt1W5rMxc+/MEEP+kX/J+xh8YnL0wQQqKEWtBBBBFYcIfV5Kk0+mC+nIc/VBBDR2ZOfPH9xFaJy3ggiZREEEc0RBBBQwZemH0qhQwRNrBGr6UwQQ8epOrsvmJMpPERBTbfBBClAy34xVlVbeIIIwpSN8PMNpJnZg6XDCoIIZEqvIxKpJKjuiCLGCCF6lAA03wW6YIIwCcsZdKTmrcqP1ggggrdCz5WV1i/f6av8ADMYMEEZ7hp8qCCCCAOG+Ap5oIIxh5iJtQmJMEi3cyISZecwQQ73ZGlyIiDL0QQQrKEGKhuuLQQRjDyaSfWXKnT7sr6YR2gghpE6Wz+YZYLawQQhQmJAvBBGMOachXraqQ00CePSIS2PMIIId9CVPeROU84gsTzQQQrKhlPOIMp5xBBGRhvhptSsQtpGXVC9fJCt1J5deo8Y9sEEM+VCLnfyKcp6IgpIF7wQQg4AXgtBBDGL8mkmfZtb7oO2MzEKVeuF/d4w7IIIP6Sf+RCu17ROU84gghCiAi0ASSL3ggjGJCTmGsO8QpVlp+72smCCGWzJS54iMpIF7xEEEYsSATxiCLHhBBGAGXqhzMoJwXJnT7uofNBBBROe8fmJlJITc2inWCCEWxQm3TBaCCMYjjDqQQThKokHQFPbBBDwJVdv3QmtzRGsEEBl1sEEEEKYId4bSTMzab75dUEENHclW5GIwCBbSJteCCFKlJFjaJynnggjGIAN98M6Ak+uOUAtqu3zGCCCtxKnKzHqbZFWmQSPuqu2MUIPAwQRmNDZEFJvvERl6YIIA4BOkXWBabbI+EIIIHUEthjiNB9cDtz71J+aFWXpggjS3JUuRFJ0MTlPPBBALEDfE21FoIIwqHlWSo4dpSjY3QR88IrWggh57iU+UIIIIQcIkAndaCCCjD2SbWrBlRNxZLiDCKx6IIIZ9CdPeXzIggghCxGu6Aix0tBBGMOcMpUastIsLsr7IULRZW+CCGewn62UEawAXNoIIUckgjmiLE80EEYxdlwRNtEW0WD84hnidspxG9e2oSd/RBBB/ST/WvkxPBa0EEAoAFxvgtaCCMYIfOoKsAy6tLJmFCCCGiTqdPmIiNIALmCCFZQkiKTBBGMGWHWGwTVXEg2u0r6IIIMd0JV5GJ1j2ZQPOYiwgghWUWyP/2Q==';
      const bin = Uint8Array.from(atob(OG_B64), c => c.charCodeAt(0));
      return new Response(bin, {
        status: 200,
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=2592000',
          'Access-Control-Allow-Origin': '*',
          'X-Content-Type-Options': 'nosniff',
        }
      });
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

    // ★ 루트 접속 → 랜딩페이지 리라이트 (URL 유지, workers.dev 제외)
    // ── 루트 경로 처리 ──
    if (path === '/' || path === '' || path === '/donway_landing' || path === '/donway_landing/') {
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
          const r = await fetchAsset('/admin_sub.html', request, env);
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
        const mbResp = await fetchAsset('/universal_settle.html', request, env);
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
        html = html.replace('</head>', storageSDK + '\n' + slugScript + '\n</head>');
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
    if (path === '/company-register' || path === '/company-register/') {
      const resp = await fetchAsset('/company-register.html', request);
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

    // ★ 관리자 종합 대시보드
    if (path === '/admin' || path === '/admin/') {
      // 슈퍼어드민 접근 로그 기록 (선택적)
      const resp = await fetchAsset('/admin.html', request);
      return new Response(await resp.text(), { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' } });
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
