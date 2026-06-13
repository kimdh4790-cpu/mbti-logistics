// DONWAY Worker v20260531145518
// MBTI Logistics + LogiNet — Cloudflare Worker

// ── 보안 설정 ──────────────────────────────────────────────────────────────
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)',
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

  // ★ 1순위: KV (배포 즉시 반영)
  if (e && e.DONWAY_ASSETS) {
    try {
      const val = await e.DONWAY_ASSETS.get(fileName, { type: 'arrayBuffer' });
      if (val) {
        const ext = fileName.split('.').pop().toLowerCase();
        const types = { html:'text/html; charset=utf-8', js:'application/javascript', css:'text/css', json:'application/json', png:'image/png', jpg:'image/jpeg', pdf:'application/pdf' };
        return new Response(val, { headers: { 'Content-Type': types[ext]||'text/plain', 'Cache-Control': 'no-cache' } });
      }
    } catch(err) {}
  }

  // 폴백: GitHub Raw (캐시 완전 우회)
  const GITHUB_RAW = 'https://raw.githubusercontent.com/kimdh4790-cpu/mbti-logistics/main';
  const encodedPath = filePath.split('/').map(seg => seg ? encodeURIComponent(seg) : '').join('/');
  const bust = Date.now() + Math.random().toString(36).slice(2);
  return await fetch(GITHUB_RAW + encodedPath + '?bust=' + bust, {
    cf: { cacheEverything: false, cacheTtl: 0, bypassCache: true },
    headers: { 'Cache-Control': 'no-cache, no-store', 'Pragma': 'no-cache' }
  });
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
  if (!emailKey) {
    console.log('[Email] API키 없음 — 발송 스킵:', email);
    return Promise.resolve({ok:false,reason:'no_key'});
  }
  const signupUrl = loginUrl || 'https://donway.ai.kr/settle';
  const html = `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f4ff;font-family:'Apple SD Gothic Neo','Noto Sans KR',sans-serif">
<div style="max-width:480px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.1)">
  <div style="background:linear-gradient(135deg,#0066ff,#00d4ff);padding:32px 24px;text-align:center">
    <div style="font-size:32px;margin-bottom:8px">🎉</div>
    <div style="color:#fff;font-size:22px;font-weight:900">DONWAY 승인 완료!</div>
    <div style="color:rgba(255,255,255,.8);font-size:13px;margin-top:6px">7일 무료 체험이 시작됩니다</div>
  </div>
  <div style="padding:28px 24px">
    <p style="font-size:15px;font-weight:700;color:#1a1a2e;margin-bottom:16px">안녕하세요, <b>${companyName}</b> 대표님!</p>
    <p style="font-size:13px;color:#555;line-height:1.7;margin-bottom:24px">
      DONWAY 도입 신청이 승인되었습니다.<br>
      지금 바로 <b>7일 무료 체험</b>을 시작하세요!
    </p>
    <div style="background:#f8faff;border:1px solid #e0e8ff;border-radius:12px;padding:16px;margin-bottom:24px">
      <div style="font-size:12px;color:#888;margin-bottom:8px">로그인 정보</div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee;font-size:13px">
        <span style="color:#888">이메일</span>
        <span style="font-weight:700;color:#1a1a2e">${email}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:13px">
        <span style="color:#888">임시 비밀번호</span>
        <span style="font-weight:700;color:#0066ff;font-family:monospace;font-size:15px">${tempPassword}</span>
      </div>
    </div>
    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:12px;font-size:12px;color:#92400e;margin-bottom:24px">
      ⚠️ 최초 로그인 후 반드시 비밀번호를 변경해주세요.
    </div>
    <a href="${signupUrl}" style="display:block;text-align:center;background:linear-gradient(90deg,#0066ff,#00d4ff);color:#fff;padding:15px;border-radius:12px;font-size:15px;font-weight:900;text-decoration:none;margin-bottom:16px">
      🚀 DONWAY 시작하기 →
    </a>
    <div style="text-align:center;font-size:11px;color:#aaa">
      문의: 051-711-3103 · 평일 09:00~18:00
    </div>
  </div>
  <div style="background:#f8faff;padding:16px 24px;text-align:center;font-size:11px;color:#aaa">
    © 2026 (유)엠비티아이 · DONWAY · donway.ai.kr
  </div>
</div>
</body>
</html>`;

  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${emailKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'DONWAY <all@donway.ai.kr>',
      to: [email],
      subject: `[DONWAY] ${companyName} 계정 승인 완료 — 7일 무료 체험 시작!`,
      html: html
    })
  }).then(function(res){
    console.log('[Email] 발송 결과:', res.status, email);
    return res;
  }).catch(function(e){
    console.error('[Email] 발송 오류:', e.message);
    return {ok:false,reason:e.message};
  });
}


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

  // D-7 알림 날짜
  const d7 = new Date(now);
  d7.setDate(d7.getDate() + 7);
  const d7str = d7.toISOString().slice(0, 10);

  console.log(`[cron-expire] 실행: ${today}, D7체크: ${d7str}`);

  // companies 전체 조회
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

    // 각 구독 상품 체크
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

      // 만료 처리
      if (expiry < today) {
        updatedSubs[product] = {
          mapValue: {
            fields: {
              ...sub,
              active: { booleanValue: false },
              expiredAt: { stringValue: today },
            }
          }
        };
        needUpdate = true;
        expired++;

        // 만료 알림 이메일
        await sendWelcomeEmail(env, {
          email: adminEmail,
          companyName: companyName,
          tempPassword: '',
          planType: 'expired',
          planLabel: product,
          loginUrl: 'https://donway.ai.kr/settle',
        }).catch(()=>{});

        // alimtalk_queue 등록
        await fsAdd(token, 'alimtalk_queue', {
          type: { stringValue: 'sub_expired' },
          companyId: { stringValue: companyId },
          companyName: { stringValue: companyName },
          email: { stringValue: adminEmail },
          product: { stringValue: product },
          expiry: { stringValue: expiry },
          status: { stringValue: 'pending' },
          createdAt: { stringValue: now.toISOString() },
        }).catch(()=>{});

        console.log(`[expire] ${companyName} ${product} 만료`);
      }

      // D-7 갱신 알림
      else if (expiry === d7str) {
        warned++;

        // alimtalk_queue 등록
        await fsAdd(token, 'alimtalk_queue', {
          type: { stringValue: 'sub_renew_warning' },
          companyId: { stringValue: companyId },
          companyName: { stringValue: companyName },
          email: { stringValue: adminEmail },
          product: { stringValue: product },
          expiry: { stringValue: expiry },
          daysLeft: { integerValue: 7 },
          status: { stringValue: 'pending' },
          createdAt: { stringValue: now.toISOString() },
        }).catch(()=>{});

        // D-7 알림 이메일
        if (env.EMAIL_API_KEY) {
          const expiryDate = new Date(expiry);
          const html = `
<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f0f4ff">
  <div style="background:#fff;border-radius:16px;padding:28px">
    <div style="font-size:24px;text-align:center;margin-bottom:12px">⏰</div>
    <div style="font-size:18px;font-weight:900;text-align:center;margin-bottom:8px">구독 만료 7일 전</div>
    <p style="font-size:13px;color:#555;text-align:center;margin-bottom:20px">
      <b>${companyName}</b>의 <b>${product}</b> 구독이<br>
      <b>${expiry}</b>에 만료됩니다.
    </p>
    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:14px;font-size:13px;color:#92400e;margin-bottom:20px;text-align:center">
      갱신하지 않으면 ${expiry} 이후 서비스가 중단됩니다.
    </div>
    <a href="tel:051-711-3103" style="display:block;text-align:center;background:linear-gradient(90deg,#0066ff,#00d4ff);color:#fff;padding:14px;border-radius:12px;font-size:14px;font-weight:900;text-decoration:none">
      📞 051-711-3103 갱신 문의
    </a>
  </div>
</div>`;

          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${env.EMAIL_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: 'DONWAY <all@donway.ai.kr>',
              to: [adminEmail],
              subject: `[DONWAY] ${companyName} 구독 만료 7일 전 알림`,
              html,
            })
          }).catch(()=>{});
        }

        console.log(`[warn-d7] ${companyName} ${product} D-7`);
      }
    }

    // Firestore 업데이트 (만료된 것만)
    if (needUpdate) {
      await fsPatch(token,
        `https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents/companies/${companyId}`,
        { subscriptions: { mapValue: { fields: updatedSubs } } }
      ).catch(e => console.error('[patch]', e.message));
    }
  }

  // 크론 로그
  await fsAdd(token, 'cron_logs', {
    type:    { stringValue: 'expire_check' },
    date:    { stringValue: today },
    expired: { integerValue: expired },
    warned:  { integerValue: warned },
    renewed: { integerValue: renewed },
    createdAt: { stringValue: now.toISOString() },
  }).catch(()=>{});

  return { expired, warned, renewed };
}
