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
function addSecurityHeaders(response) {
  const newHeaders = new Headers(response.headers);
  Object.entries(SECURITY_HEADERS).forEach(([k,v]) => newHeaders.set(k, v));
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
// ★ Pages 배포 URL (env.ASSETS 대체 - wrangler assets 이슈 우회)
const GITHUB_RAW = 'https://raw.githubusercontent.com/kimdh4790-cpu/mbti-logistics/main';
async function fetchAsset(path, request) {
  const filePath = path.startsWith('/') ? path : '/' + path;
  // 한글 파일명 URL 인코딩 (엠비티아이_물류관리_v9.html 등)
  const encodedPath = filePath.split('/').map(seg => seg ? encodeURIComponent(seg) : '').join('/');
  const assetUrl = GITHUB_RAW + encodedPath;
  const resp = await fetch(assetUrl, { cf: { cacheEverything: true, cacheTtl: 60 } });
  return resp;
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
  // Cloudflare Email Workers 또는 외부 SMTP 서비스 사용
  // 현재는 로그만 남기고 추후 연동 (EmailJS, Resend, SendGrid 등)
  const emailKey = env.EMAIL_API_KEY;
  if (!emailKey) {
    console.log(`[Email] 미설정 — 발송 대상: ${email}, 임시PW: ${tempPassword}`);
    return { sent: false, reason: 'EMAIL_API_KEY 미설정' };
  }
  // Resend API 사용 (env.EMAIL_API_KEY = re_xxxx)
  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${emailKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'DONWAY <noreply@donway.ai.kr>',
        to: [email],
        subject: `[DONWAY] ${companyName} 계정이 생성됐습니다`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
            <div style="background:#0066ff;color:#fff;border-radius:12px 12px 0 0;padding:20px 24px">
              <h1 style="margin:0;font-size:20px">DONWAY 가입을 환영합니다! 🎉</h1>
            </div>
            <div style="background:#f8faff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:24px">
              <p style="margin:0 0 16px;color:#334155">안녕하세요, <strong>${companyName}</strong>님</p>
              <p style="margin:0 0 20px;color:#64748b">${planLabel} 결제가 완료됐습니다. 아래 정보로 로그인하세요.</p>
              <div style="background:#fff;border:1px solid #cbd5e1;border-radius:8px;padding:16px;margin-bottom:20px">
                <div style="margin-bottom:10px"><span style="color:#64748b;font-size:13px">전용 접속 URL</span><br>
                  <a href="${loginUrl}" style="color:#0066ff;font-weight:700;font-size:15px">${loginUrl}</a>
                </div>
                <div style="margin-bottom:10px"><span style="color:#64748b;font-size:13px">로그인 이메일</span><br>
                  <strong>${email}</strong>
                </div>
                <div style="margin-bottom:10px"><span style="color:#64748b;font-size:13px">플랜</span><br>
                  <strong>${planLabel}</strong> — 즉시 활성화됨 ✅
                </div>
                ${tempPassword ? '<div style="background:#fef9c3;border:1px solid #fde047;border-radius:6px;padding:12px;margin-top:8px"><span style="color:#854d0e;font-size:12px">🔑 임시 비밀번호 (최초 로그인용)</span><br><strong style="font-size:20px;letter-spacing:2px;color:#0f172a">' + tempPassword + '</strong><br><span style="color:#854d0e;font-size:11px">로그인 후 반드시 비밀번호를 변경하세요</span></div>' : ''}
              </div>
              <p style="color:#ef4444;font-size:13px;margin:0 0 20px">⚠️ 로그인 후 반드시 비밀번호를 변경해주세요</p>
              <a href="${loginUrl}" style="display:block;background:#0066ff;color:#fff;text-align:center;padding:14px;border-radius:8px;text-decoration:none;font-weight:700">바로 시작하기 →</a>
              <p style="margin:20px 0 0;font-size:12px;color:#94a3b8;text-align:center">
                문의: 051-711-3103 | donway.ai.kr<br>엠비티아이 유한회사
              </p>
            </div>
          </div>
        `
      })
    });
    return resp.ok ? { sent: true } : { sent: false, reason: await resp.text() };
  } catch(e) {
    return { sent: false, reason: e.message };
  }
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
    scope: 'https://www.googleapis.com/auth/datastore',
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
  const now   = new Date().toISOString();

  const rows = await fsQuery(token, 'subscriptions', [
    {
      fieldFilter: {
        field: { fieldPath: 'expireDate' },
        op: 'LESS_THAN',
        value: { timestampValue: now }
      }
    }
  ]);

  let expired = 0;
  for (const row of rows) {
    if (!row.document) continue;
    const status = row.document.fields?.status?.stringValue;
    if (status !== 'active' && status !== 'trial') continue;
    await fsPatch(token, `https://firestore.googleapis.com/v1/${row.document.name}`, {
      status:    { stringValue: 'expired' },
      expiredAt: { timestampValue: now }
    });
    expired++;
  }

  await fsAdd(token, 'cron_logs', {
    type:    { stringValue: 'expire_check' },
    expired: { integerValue: String(expired) },
    checked: { integerValue: String(rows.filter(r => r.document).length) },
    runAt:   { timestampValue: now }
  });

  return { checked: rows.filter(r => r.document).length, expired };
}

// ── Fetch Handler ─────────────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
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

    // ★ 루트 접속 → 랜딩페이지 리라이트 (URL 유지, workers.dev 제외)
    // ── 루트 경로 처리 ──
    if (path === '/' || path === '' || path === '/donway_landing' || path === '/donway_landing/') {
      // workers.dev = 물류앱, 그 외 = DONWAY 랜딩
      if (hostname.includes('workers.dev') || hostname.includes('kimdh4790')) {
        // ★ 물류앱 메인 HTML 서빙
        const logisticsResp = await fetchAsset('/엠비티아이_물류관리_v9.html', request);
        const lh = new Headers();
        lh.set('Content-Type', 'text/html; charset=utf-8');
        lh.set('Cache-Control', 'no-cache');
        Object.entries(SECURITY_HEADERS).forEach(([k,v]) => lh.set(k,v));
        return new Response(logisticsResp.body, { status: logisticsResp.status, headers: lh });
      } else {
        const landingResp = await fetchAsset('/donway_landing.html', request);
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
      const allowedOrigins = ['https://donway.ai.kr','https://mbti-logistics.kimdh4790.workers.dev'];
      const origin = request.headers.get('Origin') || '';
      const allowOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': allowOrigin,
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Vary': 'Origin'
        }
      });
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
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
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
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
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
      const resp = await fetchAsset(new URL(req.url).pathname, request);
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
      '/donway_landing','/test-apikey','/favicon.ico','/favicon.png',
      '/worker-test','/label-ocr','/claude-ocr','/get-label-key',
      '/test-inject','/truck-save','/scan-save',
      '/scan','/truck','/settle','/visitor','/checkin','/emergency','/portal','/join','/company-register',
      '/attendance','/donway-sound.js','/report','/contract',
      '/notice','/settings','/schedule','/drivers','/dashboard',
      '/my','/attendance-admin','/attendance-display',
      '/company-get','/modusign-send','/toss-confirm',
      '/api','/cron-expire','/favicon.ico','/manifest.json',
      '/sw.js','/firebase-messaging-sw.js','/robots.txt'
    ]);
    const slugMatch = path.match(/^\/([a-zA-Z0-9가-힣\-_]{1,30})\/?$/);
    if (slugMatch && !knownPaths.has(slugMatch[0].replace(/\/$/,'')) && method === 'GET') {
      const companySlug = slugMatch[1];
      try {
        const resp = await fetchAsset('/settle.html', request);
        let html = await resp.text();
        // slug + 보안헤더 주입 (</head> 앞에 삽입 - 가장 안전한 위치)
        const slugScript = '<script>window._COMPANY_SLUG=' + JSON.stringify(companySlug) + ';window._SLUG_MODE=true;</script>';
        html = html.replace('</head>', slugScript + '\n</head>');
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

    if (path === '/settle' || path === '/settle/') {
      const resp = await fetchAsset('/settle.html', request);
      return new Response(await resp.text(), { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' } });
    }


    // ── Phase 2: 신규 라우트 ──────────────────────────────────────────────

    // 기사 배송앱

    // 통합 포털
    if (path === '/portal' || path === '/portal/') {
      const resp = await fetchAsset('/portal.html', request);
      return new Response(await resp.text(), { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    // 기사 자체 가입
    if (path === '/join' || path === '/join/') {
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

        // 4. 결제 내역 기록
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
        const { tokens, title, body: msgBody, type } = body;
        if (!tokens || !tokens.length) {
          return new Response(JSON.stringify({ ok: true, sent: 0 }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }
        const accessToken = await getAccessToken(env);
        const PROJECT_ID_FCM = 'mbti-logistics';
        let sent = 0;
        // 토큰별 개별 발송 (최대 20개)
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
                    data: { type: type || 'notice', click_action: 'FLUTTER_NOTIFICATION_CLICK' },
                    android: { priority: 'high' },
                    apns: { payload: { aps: { sound: 'default', badge: 1 } } }
                  }
                })
              }
            );
            if (resp.ok) sent++;
          } catch(e) {}
        }));
        return new Response(JSON.stringify({ ok: true, sent, total: targets.length }), {
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
          // 위 confirm 로직과 동일하게 처리 (이중 안전장치)
          const token = await getAccessToken(env);
          const orderResp = await fetch(`${FS_BASE}/toss_orders/${orderId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (orderResp.ok) {
            const orderDoc = await orderResp.json();
            const f = orderDoc.fields || {};
            const dealerId = f.dealerId?.stringValue;
            const planType = f.planType?.stringValue;
            const PLAN_FIELDS = {
              contract: { contractPaid: { booleanValue: true } },
              roster:   { rosterPaid:   { booleanValue: true } },
              qr:       { qrPaid:       { booleanValue: true } },
              full:     { contractPaid: { booleanValue: true }, rosterPaid: { booleanValue: true }, qrPaid: { booleanValue: true }, settlePaid: { booleanValue: true } },
              settle:   { settlePaid:   { booleanValue: true } }
            };
            const planFields = PLAN_FIELDS[planType] || {};
            if (dealerId && Object.keys(planFields).length) {
              const updateFields = {
                ...planFields,
                plan: { stringValue: 'paid' },
                lastPaymentKey: { stringValue: paymentKey || '' },
                lastPaidAt: { timestampValue: new Date().toISOString() }
              };
              const mask = Object.keys(updateFields).map(k => `updateMask.fieldPaths=${k}`).join('&');
              await fetch(`${FS_BASE}/companies/${dealerId}?${mask}`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ fields: updateFields })
              });
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
        '/icon-512.png': '/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAIAAgADASIAAhEBAxEB/8QAHQABAAICAwEBAAAAAAAAAAAAAAQIAwcCBQYJAf/EAGQQAAAEAwIDEQsHBwkGBQQDAAABAgMEBREGBxIhMQgJExQYN0FRVVdhdpKUtNHSFRciNHSBkZWz09RUcZOWoaSxFjJCU1aywSMzQ1JydYKi8DU4RGJz4TZlg8LxJCVkhKPD4//EABwBAQADAQEBAQEAAAAAAAAAAAABAgMEBQYHCP/EAD8RAAIBAgIECQsFAAEEAwAAAAABAgMRBBIFITFRExQyQVORkrHRBhUWImFxgZOh0+EHQlLB8DMjNGKCwtLx/9oADAMBAAIRAxEAPwCuNy12E/vYtTE2ds7FyyFi4aCXGrXHuLQ2aErQgyI0IWeFVxOxShHjG3tRbelu/Y3nkT8OGdz69s44tv8ASYYX1j4uFgIF+OjolmFhIZtTr77zhIbaQkqqUpR4kpIiMzM8REQ0lJpkFCtRbelu/Y3nkT8OGotvS3fsbzyJ+HFye+vdbvlWN9eQ3bDvr3W75VjfXkN2xGaQKbai29Ld+xvPIn4cNRbelu/Y3nkT8OLk99e63fKsb68hu2HfXut3yrG+vIbthmkCm2otvS3fsbzyJ+HDUW3pbv2N55E/Di5PfXut3yrG+vIbth317rd8qxvryG7YZpAptqLb0t37G88ifhw1Ft6W79jeeRPw4uT317rd8qxvryG7Yd9e63fKsb68hu2GaQKbai29Ld+xvPIn4cNRbelu/Y3nkT8OLk99e63fKsb68hu2HfXut3yrG+vIbthmkCm2otvS3fsbzyJ+HDUW3pbv2N55E/Di5PfXut3yrG+vIbth317rd8qxvryG7YZpAptqLb0t37G88ifhw1Ft6W79jeeRPw4uT317rd8qxvryG7Yd9e63fKsb68hu2GaQKbai29Ld+xvPIn4cNRbelu/Y3nkT8OLk99e63fKsb68hu2HfXut3yrG+vIbthmkCm2otvS3fsbzyJ+HDUW3pbv2N55E/Di5PfXut3yrG+vIbth317rd8qxvryG7YZpAptqLb0t37G88ifhw1Ft6W79jeeRPw4uT317rd8qxvryG7Yd9e63fKsb68hu2GaQKbai29Ld+xvPIn4cNRbelu/Y3nkT8OLk99e63fKsb68hu2HfXut3yrG+vIbthmkCm2otvS3fsbzyJ+HDUW3pbv2N55E/Di5PfXut3yrG+vIbth317rd8qxvryG7YZpAptqLb0t37G88ifhw1Ft6W79jeeRPw4uT317rd8qxvryG7Yd9e63fKsb68hu2GaQKbai29Ld+xvPIn4cNRbelu/Y3nkT8OLk99e63fKsb68hu2HfXut3yrG+vIbthmkCm2otvS3fsbzyJ+HDUW3pbv2N55E/Di5PfXut3yrG+vIbth317rd8qxvryG7YZpAptqLb0t37G88ifhw1Ft6W79jeeRPw4uT317rd8qxvryG7Yd9e63fKsb68hu2GaQKbai29Ld+xvPIn4cNRbelu/Y3nkT8OLk99e63fKsb68hu2HfXut3yrG+vIbthmkCm2otvS3fsbzyJ+HDUW3pbv2N55E/Di5PfXut3yrG+vIbth317rd8qxvryG7YZpAptqLb0t37G88ifhw1Ft6W79jeeRPw4uT317rd8qxvryG7Yd9e63fKsb68hu2GaQKbai29Ld+xvPIn4cNRbelu/Y3nkT8OLk99e63fKsb68hu2HfXut3yrG+vIbthmkCm2otvS3fsbzyJ+HDUW3pbv2N55E/Di5PfXut3yrG+vIbth317rd8qxvryG7YZpAptqLb0t37G88ifhw1Ft6W79jeeRPw4uT317rd8qxvryG7Yd9e63fKsb68hu2GaQKbai29Ld+xvPIn4cNRbelu/Y3nkT8OLk99e63fKsb68hu2HfXut3yrG+vIbthmkCm2otvS3fsbzyJ+HDUW3pbv2N55E/Di5PfXut3yrG+vIbth317rd8qxvryG7YZpAptqLb0t37G88ifhw1Ft6W79jeeRPw4uT317rd8qxvryG7Yd9e63fKsb68hu2GaQKbai29Ld+xvPIn4cNRbelu/Y3nkT8OLk99e63fKsb68hu2HfXut3yrG+vIbthmkCm2otvS3fsbzyJ+HDUW3pbv2N55E/Di5PfXut3yrG+vIbth317rd8qxvryG7YZpAptqLb0t37G88ifhw1Ft6W79jeeRPw4uT317rd8qxvryG7Yd9e63fKsb68hu2GaQKbai29Ld+xvPIn4cNRbelu/Y3nkT8OLk99e63fKsb68hu2HfXut3yrG+vIbthmkCm2otvS3fsbzyJ+HDUW3pbv2N55E/Di5PfXut3yrG+vIbth317rd8qxvryG7YZpAptqLb0t37G88ifhxqG+m7Cf3T2phrO2ii5ZFRcTBIjULgHFrbJClrQRGa0IPCq2rYpQyxj6pwEXCx8CxHQMSzFQkS2l1h9lwltuoUVUqSosSkmRkZGWIyMUKzxjXtk/FtjpMSJjJtgZ3Pr2zji2/wBJhhcm/TWSt3xbmHRnBTbO59e2ccW3+kwwuTfprJW74tzDozgiXKCPlo4uEhIGAM5ZCvreYU4tbq3ameirT+isiyJLYGLT8LuLAct/3gTTxGVeSK9u6IA0BP0/C7iwHLf94Gn4XcWA5b/vBAATYgn6fhdxYDlv+8DT8LuLAct/3ggAFgT9Pwu4sBy3/eBp+F3FgOW/7wQACwJ+n4XcWA5b/vA0/C7iwHLf94IABYE/T8LuLAct/wB4Gn4XcWA5b/vBAALAn6fhdxYDlv8AvA0/C7iwHLf94IABYE/T8LuLAct/3gafhdxYDlv+8EAAsCfp+F3FgOW/7wNPwu4sBy3/AHggAFgT9Pwu4sBy3/eBp+F3FgOW/wC8EAAsCfp+F3FgOW/7wNPwu4sBy3/eCAAWBP0/C7iwHLf94Gn4XcWA5b/vBAALAn6fhdxYDlv+8DT8LuLAct/3ggAFgT9Pwu4sBy3/AHgafhdxYDlv+8EAAsCfp+F3FgOW/wC8DT8LuLAct/3ggAFgT9Pwu4sBy3/eBp+F3FgOW/7wQACwJ+n4XcWA5b/vA0/C7iwHLf8AeCAAWBP0/C7iwHLf94Gn4XcWA5b/ALwQACwJ+n4XcWA5b/vA0/C7iwHLf94IABYE/T8LuLAct/3gafhdxYDlv+8EAAsCfp+F3FgOW/7wNPwu4sBy3/eCAAWBP0/C7iwHLf8AeBp+F3FgOW/7wQACwJ+n4XcWA5b/ALwNPwu4sBy3/eCAAWBP0/C7iwHLf94Gn4XcWA5b/vBAALAn6fhdxYDlv+8DT8LuLAct/wB4IABYE/T8LuLAct/3gafhdxYDlv8AvBAALAn6fhdxYDlv+8DT8LuLAct/3ggAFgT9Pwu4sBy3/eBp+F3FgOW/7wQACwJ+n4XcWA5b/vA0/C7iwHLf94IABYE/T8LuLAct/wB4Mra4SLgY8ylkKwtlhLiFtLdqR6KhP6SzLIo9gdWJ8r8RmvkifbtCAfVC4vWSsJxbl/RmxTbPGNe2T8W2OkxIuTcXrJWE4ty/ozYptnjGvbJ+LbHSYkZw2kjO59e2ccW3+kwwuTfprJW74tzDozgptnc+vbOOLb/SYYXJv01krd8W5h0ZwJcoI+V808RlXkivbuiAJ808RlXkivbuiANQAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAnyvxGa+SJ9u0IAnyvxGa+SJ9u0IYPqhcXrJWE4ty/ozYptnjGvbJ+LbHSYkXJuL1krCcW5f0ZsU2zxjXtk/FtjpMSM4bSRnc+vbOOLb/AEmGFyb9NZK3fFuYdGcFNs7n17Zxxbf6TDC5N+mslbvi3MOjOBLlBHyvmniMq8kV7d0QBPmniMq8kV7d0QBqAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAE+V+IzXyRPt2hAE+V+IzXyRPt2hDB9ULi9ZKwnFuX9GbFNs8Y17ZPxbY6TEi5NxeslYTi3L+jNim2eMa9sn4tsdJiRnDaSM7n17Zxxbf6TDC5N+mslbvi3MOjOCm2dz69s44tv8ASYYXJv01krd8W5h0ZwJcoI+V808RlXkivbuiAJ808RlXkivbuiANQAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAnyvxGa+SJ9u0IAnyvxGa+SJ9u0IYPqhcXrJWE4ty/ozYptnjGvbJ+LbHSYkXJuL1krCcW5f0ZsU2zxjXtk/FtjpMSM4bSRnc+vbOOLb/SYYXJv01krd8W5h0ZwU2zufXtnHFt/pMMLk36ayVu+Lcw6M4EuUEfK+aeIyryRXt3RAE+aeIyryRXt3RAGoAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAT5X4jNfJE+3aEAT5X4jNfJE+3aEMH1QuL1krCcW5f0ZsU2zxjXtk/FtjpMSLk3F6yVhOLcv6M2KbZ4xr2yfi2x0mJGcNpIzufXtnHFt/pMMLk36ayVu+Lcw6M4KbZ3Pr2zji2/0mGFyb9NZK3fFuYdGcCXKCPlfNPEZV5Ir27ogCfNPEZV5Ir27ogDUAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4msi4RwNZnwCrkkSZDMiymOJrLYxjhQftBF2wDWfAPzCUeyP2g/aBlbBxxnlqFByoP2nAHBi5woGMslRzpwD8pwBwYuccJRbJj9JauAftB+UDK0DkSy2SHIjI8hjGZD8oF5IGYBiJRkORLI8uISpJixzAfg/RYgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACfK/EZr5In27QgCfK/EZr5In27Qhg+qFxeslYTi3L+jNim2eMa9sn4tsdJiRcm4vWSsJxbl/RmxTbPGNe2T8W2OkxIzhtJGdz69s44tv8ASYYXJv01krd8W5h0ZwU2zufXtnHFt/pMMLk36ayVu+Lcw6M4EuUEfK+aeIyryRXt3RAE+aeIyryRXt3RAGoAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAcFL2CEN2JP1SiLKOClGY/Mo/SIU1yB+EQ/SIciIciIhpGmRc4kW0Q/SSOZEY/SSNVTIucKEP0i4BkJI/SSNFTBioY/cExlweAMExbgwYsEwoYy4JgaQ4MGEy4B+UIZjSPw0irpgwmnaH4ZbZDKaR+GkxR0xcxGQ4mQymRDiZDGVMm5wJRkMiVEfzjgZD8MhnriSZgGNK9gxzF07g/QABJAAAAAAAAAAAAAAAAAAAAAAAAAAAT5X4jNfJE+3aEAT5X4jNfJE+3aEMH1QuL1krCcW5f0ZsU2zxjXtk/FtjpMSLk3F6yVhOLcv6M2KbZ4xr2yfi2x0mJGcNpIzufXtnHFt/pMMLk36ayVu+Lcw6M4KbZ3Pr2zji2/wBJhhcm/TWSt3xbmHRnAlygj5XzTxGVeSK9u6IAnzTxGVeSK9u6IA1AAAAgAAAAAAAAAAAAAAAAAAAAAAD8AY1qriLIIbsSFqriLIPwiAiHMi2hWMW9bB+EQ5EW2P0iHNKR0QgVufhEORJHIiHNKBvGAOBJHMkjISRyJI2UCtzGSB+kkZiQY5E2NFTIuYCSP3B4PsEjALhDALaE5Bcj4PB9gGngEjALaDAIMguRjSOJoEk2xxNBiHAXIxoHA0iUaRwNIzcCbkY0jiaTEhSBjNIylAsYDIcTIZlJHAy2xhKmLmIyH6lRl8w5GVBxMhzSjbWixkI6lUh+jElWCfAMhHUqkJjK4P0AAWIAAAAAAAAAAAAAAAAAAAAAAAnyvxGa+SJ9u0IAnyvxGa+SJ9u0IYPqhcXrJWE4ty/ozYptnjGvbJ+LbHSYkXJuL1krCcW5f0ZsU2zxjXtk/FtjpMSM4bSRnc+vbOOLb/SYYXJv01krd8W5h0ZwU2zufXtnHFt/pMMLk36ayVu+Lcw6M4EuUEfK+aeIyryRXt3RAE+aeIyryRXt3RAGoAAAEAAAAAAAAAAAAAAAAAAAABxWqhU2RDdiTi4rYIcSICIciLYFYrM7sH6RDmRbBD8SWwQyJIdMIFQlI5pSP1KRzUaW0YSjxDpUUldkH6lI/FvNN5VVPaLGYwKU4+dE+Aj7TGdiExl4OP0mOeeLS1QRKjvMemVn/NtbOIzDRYo8ZGhHBQdi1BYyqRF8+MSG4HFSh+YqDmeIqPnLZUdNokX+tT6C6hyKJiklQ0IXTZplHdaR4Fekhicgcp09Kf4iFXqL9zGVEBuYN4VHWlN7RljE5pbbpVbWlfzHkEZ6DoR+Di4MZCE5DrbVhtmaFFkNJjqp4+ceWrlXBHc4A/DRjyfYIsDMiNRNRhEhR0IlkWLz/wCvQO0NvHsD1qVSFaN4syaa2kM2yHE0CYbfzjgaBdwFyGpO2QxqQJqkDEpAo4E3IakjGpImKTtkMK0DGUCUyKpIxqISlJGJSRhKBZMjmQ4GVBnUQxmWwOacCTEZAhVDoeQcjLYHAyHLJWd0WMwDg2rYMcxZO4AAAkgAAAAAAAAAAAAAAAAAAAnyvxGa+SJ9u0IAnyvxGa+SJ9u0IYPqhcXrJWE4ty/ozYptnjGvbJ+LbHSYkXJuL1krCcW5f0ZsU2zxjXtk/FtjpMSM4bSRnc+vbOOLb/SYYXJv01krd8W5h0ZwU2zufXtnHFt/pMMLk36ayVu+Lcw6M4EuUEfK+aeIyryRXt3RAE+aeIyryRXt3RAGoAAAEAAAAAAAAAAAAAAAAAAB+GdCqMRnU6jk4ewPxJDN63Yk/SIc0lQfiS2RzSWyOinEhnJJDIlNR+JIZSolJmeIiLGOuMSrOLi0tIwlYz2C2xibaW84S3MZnsbQ/EEqIdwlVwa0SQ7eBha0Olf4jgr1s7sthZKxxhIQzMsR4/SY7SGg8REScX2CVCQlaHTL6THbw0Jk8Ej82Ic5Y65iBxFixcGIhJbgSx+CXoqO7Zgq5S9OMxLRBFXGR+cwB5zSJf1f8gwuQJY6EVeA8Y9XpJO0n0mMLkFixkfnKoA8e/BYzxVP0GOtioTGZ0Mj29ke0iYOifzcXpIdXGQmIzpTzYyAHiYuEoRkacv+sQSuOVBLJl8zVDqPEf8AUPq4B3sbCZSpi4B0UdDEVa/P/wBxpSqypSzRIauehJJKSSkmSkmVSMtkhxUjbIdfZmOUbnc+IUpR0/kTpXEWUvRk8/AO8U1tD6ahVjXgpo55JxdjrltjEtA7BbfAMC0cAu4kXIC0DCtNBPcQMC0jKUSxCWgYVJExaaDA4kYSiSmRVpGJRCSshhUQ5ZxLpmAyHAyGZRDGotkcs4kox5DGVJ1KoxqIGzodNscy9VljKAANCAAAAAAAAAAAAAAAAAAACfK/EZr5In27QgCfK/EZr5In27Qhg+qFxeslYTi3L+jNim2eMa9sn4tsdJiRcm4vWSsJxbl/RmxTbPGNe2T8W2OkxIzhtJGdz69s44tv9Jhhcm/TWSt3xbmHRnBTbO59e2ccW3+kwwuTfprJW74tzDozgS5QR8r5p4jKvJFe3dEAT5p4jKvJFe3dEAagAAAQAAAAAAAAAAAAAAAH4Z0Ko/RwcPFQQ3ZEnDKdRyIcUjInKIpoM5JLYGRJDighlQWMdsIlTmghiizM1JZLZxmJCSEaHLRYhS8dDOhfMIxUskLbxHWydL2K0xUL+A9BAw9aVT6PwECXNUIlU4eoejlzGQv9V2R5pclwUNU8lTHdwkLSh0x5K9QxS9gqFi/+B6CAha0xY/wAGKGgq4qej+InswWSidjYL+I7GEhMRYsRegh2bMHkqWPh6gB0BwR0yK9JCK9A4qYJF5qGPXKgqJOqaf4aCJEwdCyYtrYAHiouEoRnT/XCOnjYShHQsn2D28bCUI8WTFj/AIjoY6GpUqbeL+AA8VHQxUMsmPY2B5+Ph8R+DQ9jgMe1j2CKtCxU+wedmLNK7eTqAHjoxtTa9EQZoWk8JJliMh7WVv6flrEVg0NacZUpjI6HTgqRjzEwaoZnTh6x2Fgnz0aKl6jMypoqCoVC2Dx5dlPoHpaMrZKuR7GZ1VdXO6cbEdxvgHauN5RFdb4B9C0c9zq1oEdxA7J1sRXEjKUSyZ160jAtInOoEZxIwlEsQnE0GFZCYtIjqIc04lkRlEMSiGdZYxiWQ5ZxLmEy2BxPEYyK2xwUOKpEsjIk6lUfoxtnjoMgRd0AAAJIAAAAAAAAAAAAAAACfK/EZr5In27QgCfK/EZr5In27Qhg+qFxeslYTi3L+jNim2eMa9sn4tsdJiRcm4vWSsJxbl/RmxTbPGNe2T8W2OkxIzhtJGdz69s44tv9Jhhcm/TWSt3xbmHRnBTbO59e2ccW3+kwwuTfprJW74tzDozgS5QR8r5p4jKvJFe3dEAT5p4jKvJFe3dEAagAAAQAAAAAAAAAAAAAAAGJZ1UMh4iqMRZRSe4lHIhzSWIcCGVOUbU0QzmkhmbIY0kMyCxDtgirP1zwWVqrTwToYxy5GIsR1HOLKkGvzfiQ5S39H/COTHP10vYTDYehlyCwiLh/AellyCPBKuwX2jz8tyeY/wAR6eXY1F85/gOIud7LmyMyPJs+gekl7OIsWP8AiOklZFixF+iPTS0ioR02DMAdrAw1cEi81djhHeQsHiKiT+brESWoTWmxWnoIejl7JKIq8B+kAdeuCIk4i9BjrY2ExHi+zKPZxEOnQstdsdFMmyLC8/2ADxkewVK0qX8B52Ys5S81fwHsJiksIy4fxHmZiRUM6bBGAPITFBUM8W2PNzNBYJlXYP7B6yZkXhYi/SHmpjlP5y/AAeSmSCx4q4/xEeyi9CtRC1c0NLhKQqqqErwToR+emLboJsy/MP5i/EdVLSraKXF/+Wj98hrQllqxftREtjNkutiI63TYHbPN8H/YQ3keYfZNHGdS8gQ3kDtXkUEJ5AyaJR1rieARXEjsHUiI6kYyRdEJwsYjuljExwhGcLEOeaLIirIYFEJKyGBZYxyTRdGFRZSGMxlVlGNWUcVRFkcCOiiGYYTGVJ1SQwjtsSfoAAuQAAAAAAAAAAAAAAAE+V+IzXyRPt2hAE+V+IzXyRPt2hDB9ULi9ZKwnFuX9GbFNs8Y17ZPxbY6TEi5NxeslYTi3L+jNim2eMa9sn4tsdJiRnDaSM7n17Zxxbf6TDC5N+mslbvi3MOjOCm2dz69s44tv9Jhhcm/TWSt3xbmHRnAlygj5XzTxGVeSK9u6IAnzTxGVeSK9u6IA1AAAAgAAAAAAAAAAAAAADiv80xjIc3fzfOOKRR65EnJOUZUDGkZEZB1UyrMqCGdBYxhbEhssY7KaKs/ItJnBrIiqdK/bUcZapPgnXa+wSTRojakVphJMqjr5cvIWLaHHj42kmWgetlqiqRfOX8R6aXLLCSZFlP8R5GXO5FV4cRekell7mQq48nUOAuevli6UxbBH6B6aXLLEVSpkHjZe8VUn5+seigHyoW1T7AB7SXPUMjrw9Y9BBRJJSXhYvxIeJg4nEXhY/8AWMh3EPG0IsfoyAD1j8ZVvGZ4slR00wfI6+Fl29rZMQ1RxUxGXmIQIyLqR4/Sf4gCPMXcqvPj+webmK8Zli2h2UdEcNf4mPPzF4jIyrwV/EAdNMl4lHTKR/aPNTJZFU8eWvoHdzF0qH6R5uZOYjKvB1gDoZiosEy+YhAkDLkVamWtspw1FEpcMq08FJ4Rnj4CMSJk5lxlt9Ql3ZQumrYpcw8EoVhblKVwqlgU4Pz6+Yb4aGetGPtRWbtFs2O+2IL6KDt30ZR18Qn0D7No4kdU+gQX04h2j6cRiA+nGYykix1j6RDdLEOwfLFkEJ0soxki6IThCM4WMxLdLGIzpYxzzRZERZDA4QkuljEdwclRF0YF5BjUMq8gxKyDiqIsY1Dm3+aOKh+tbI5f3FjIAALkAAAAAAAAAAAAAAABPlfiM18kT7doQBPlfiM18kT7doQwfVC4vWSsJxbl/RmxTbPGNe2T8W2OkxIuTcXrJWE4ty/ozYptnjGvbJ+LbHSYkZw2kjO59e2ccW3+kwwuTfprJW74tzDozgptnc+vbOOLb/SYYXJv01krd8W5h0ZwJcoI+V808RlXkivbuiAJ808RlXkivbuiANQAAAIAAAAAAAAAAAAAAAxu7A/Ej9d2B+JFP3EnNOQZUZBiTkGVA66ZVmZsSGixjA2M7WUdtMqyS0WMdbFI0CYKx4nPDL569dR2TQ4TKGOIh8JH843VSeHbIRiqPCUtW1ERdmZpc8WLHwkX4j0UvfIqVPJ+GwY8XARGMtuv2jv4CIOhGR0/1kHhmx7aAiDKhGdMeM9ox3sFEmmmPF+A8TBxNKY8Wwe1wGO6hIulCrk9JAD20LF5Cr5q/gOxZjaU8L04j9I8ZDxlCxGVODIJzMdsEexsHX7AB6lUdiPwv8wjPxlSy4vQQ6PTx7avQQjPR1Sy4/nqAOwjYvFlM6/aOkjojEZmr5+oYoqLy1PGexsmOojIupVwvR/AAcI+IOpmeX8THnpg8R1x1LJX8TEqOicvhUP8CHQR8RiMj2sdNjgAEGYPFU8eL+A2PdDKjhrOuzRa6rj3MREeIkINSS2MuFhbeKnCNfWelETaSfsyqGVoeHVTruCaiaQWUzp5iLJUzIqlUb6TDswkIzCQ6MBllpLbaameClJUIqnjyEPa0Ph3KbqvYtnvOevLVlOtiS4B10QnLiHaRWz5x1sRl84+hZzo618sY698h2L/APAdfEbPnGTLnXvljMQXSxie/lEF0YyLIhukIrpCU91iK6OeZdEZ0R3BIdGBwctQsjAoYlZBlUMSsg4qhcxqH61+d5h+KH61+d5hxvlFjIAALkAAAAAAAAAAAAAAABPlfiM18kT7doQBPlfiM18kT7doQwfVC4vWSsJxbl/RmxTbPGNe2T8W2OkxIuTcXrJWE4ty/ozYptnjGvbJ+LbHSYkZw2kjO59e2ccW3+kwwuTfprJW74tzDozgptnc+vbOOLb/AEmGFyb9NZK3fFuYdGcCXKCPlfNPEZV5Ir27ogCfNPEZV5Ir27ogDUAAACAAAAAAAAAAAAAAAMbuwPxI5O/m+ccUin7iTmnIMqBiTsjKjIOumyrMzYkNZRHbGdvKOymVZKayiU0IjeUSWjxjrgUZ1s4hTh3NNsko0LOrhbBH/wBx+wcSZGWOtftHdoIlINKkkZGVDI8ZGOmmUqdhcOJhvDYLGaK40ls+bh/+R5mNwTTdSC1c5pCfMzuISLyUV/rhHbQ0ZiLH8xGf4GPFQsXjrhHX7R2cPG4iqfUPLND2bMZtHj+ehiWiNOuM/SXUPIMxp0Kiq/aQktx1K4y8x0AHqNPcKfQYxORqqfnHTbyDz2n/APm/zjE5HZaGVeAsYA7iIjMRlUqegh1kXGVrRXn6h18RG5aq9OMx18TGVM6KP+IAkRsXiPHj+fIOoeW8+8hlhC3XXFElttJGpSjM6FQiymZjnCtxczj2oCXsLiIl5WC22jb/AOxYzM8RFUzG5LvLDMWawphMHGouaqqlK0VNDKcng1IjMzLKdOAtmvXhMHPEystnOzOdRQRLu9su3ZiSUcNZzCLShcWalfmqodEFQzKianj2TqeShF20UrGYlRDu0Y62IWXzD62nTjSgoR2I4m23dkOJVwjrog8omRC8Zjr4hWUhZkohvnjHXxBiY+rKYgPqyjNlyI+eMxAdMTHzxGITp5RjIsiK8YiuiQ6eMRnTxjnmXRHdEdwZ3cojuDkqF0YlDErIMixiVkHFULHBQ/WvzvMPxQ/Wtkcj5RYyAAC5AAAAAAAAAAAAAAAAT5X4jNfJE+3aEAT5X4jNfJE+3aEMH1QuL1krCcW5f0ZsU2zxjXtk/FtjpMSLk3F6yVhOLcv6M2KbZ4xr2yfi2x0mJGcNpIzufXtnHFt/pMMLk36ayVu+Lcw6M4KbZ3Pr2zji2/0mGFyb9NZK3fFuYdGcCXKCPlfNPEZV5Ir27ogCfNPEZV5Ir27ogDUAAACAAAAAAAAAAAAAAAOK/wA0xjSMp4yoMRZRSW0k5pyjKgYiGROUdFNlWZkGM6MojoPGMyDHbTZVkts8hiS2YhtniElox1wZVk1oxMYUOvaUJbSsY6YsozBM5GxGmp6HUTEQZmoz2F4tktj5y4co6OMgZlLyNcRDqNsjpoqDqnLlOmStSpWg9gyvIJjKxy1tH0qzutTJVRo181GlUsdD9BiS3GnTEoz+0e2flMqjCPR4Fk1GrCUpJYKjPbMyoZ5RHesdJX1kpGmIciKhpbcqXz+ERmOCeiKy5LTNOFR5PTqttXoIYnI06nVXpP8AgPZt2DkqssTH+ZxHZHZwdirNNspQ7BuRCirVxx5ZGrHs4JkX2CI6IxD3L4h1omsiiHHnUMsIW44syShCEmZqMzxEWzUepkV3s/makrjjRK4Y0kqrlFOGRkZlRBHlyVJRppXZpQbKlsNAQOFpKChoXDph6E0lGFStK0LHlP0iel/FlP8AEd1HQ8I66juZSrvmPyzcllNnYJUPK4cm8PBN1xSsJbpkVKqP0nQqEVToRVE92IxZRBU/i2RiW/w+gexGMYLLFWRg9eszvO8Igvu1/wBZRxderXGIrruISLHF9wQX1jm85lxiG8vLUVbLpGJ9YgvqGZ5YhPLGUmWMD6usQ3TxDM6qpiK6oYyZZGBwxGcPGYzOGIzh4hzzZZGFZjA4YyrPZGBeUck2XRjXkGNQ5rGNWUcVRlkcFDm3+aOBjIjEkhzLXIscgABcgAAAAAAAAAAAAAAAJ8r8RmvkifbtCAJ8r8RmvkifbtCGD6oXF6yVhOLcv6M2KbZ4xr2yfi2x0mJFybi9ZKwnFuX9GbFNs8Y17ZPxbY6TEjOG0kZ3Pr2zji2/0mGFyb9NZK3fFuYdGcFNs7n17Zxxbf6TDC5N+mslbvi3MOjOBLlBHyvmniMq8kV7d0QBPmniMq8kV7d0QBqAAABAAAAAAAAAAAAAAAAYllRRjKODpbIrNaiUfhDmk8QxpHNO0L05EMzJMZmzEdBjKg8Y7YMqyU2eMSGzxiIkxnbVUh1wZRk1tQlNKEBtQkNKHTFlWdiyumyJjKx1bahKacG0WVaO2acpTGJbTg6lpzbMSmnKDVMqds07kElt3hHUtujOh2myLpkWO2Q9tDmT2L/sOrS9tn6RzJ7Fl+0WuRY7LRvm9Axre2xC0bh+0cDe4fQQXFiU47wiM66MK3RgcdFWybHN1zhER1wfjrvCIzrgo2ScXliG8sc3XBFcUM2yyRwcUIrihzdWI7ihhJlkY3DEd09gZFq2RHWY55ssjgsxhUY5rMYlmOSbLo4KPKYxmOStocFDiqMsj8LGqgzDG2WOoyDKG8lgAAXIAAAAAAAAAAAAAAACfK/EZr5In27QgCfK/EZr5In27Qhg+qFxeslYTi3L+jNim2eMa9sn4tsdJiRcm4vWSsJxbl/RmxTbPGNe2T8W2OkxIzhtJGdz69s44tv9Jhhcm/TWSt3xbmHRnBTbO59e2ccW3+kwwuTfprJW74tzDozgS5QR8r5p4jKvJFe3dEAT5p4jKvJFe3dEAagAAAQAAAAAAAAAAAAAAAH4ZVKg/QAGHIY5EYOFjqPxJikXZ2JMqT2RkSYwpPYGRJjrpyKkhBjMhVBFSYzJMdcJFWiYhQzoUITahnQqg6YyKsnNrEhtYgIUM7axvGRVo7FtzhEltwdYhYzIcoNVIrY7RDm0Yzod/wBEOrQ7wjKl0XUiLHZpe4S/AcydxbI60ncWyOWiltl6BbMQdhovzjgb2LKXpELRS2yHE3cWyGYEtbowrd4RHU6MS3eEVcibGZx3hEZxzKMa3RgWsUcibHJaxHcWDixgWoZSkWSPxahHWqo5LXUYHFbAxlIscXFDCsxyUYwrOo5pyLJHFRjEo6mOSjGNR7A5JyLH4Z7I4GP1Rggqq+Ycc3d2LI5pKiaDkAC61EAAAAAAAAAAAAAAAAAAAE+V+IzXyRPt2hAE+V+IzXyRPt2hDB9ULi9ZKwnFuX9GbFNs8Y17ZPxbY6TEi5NxeslYTi3L+jNim2eMa9sn4tsdJiRnDaSM7n17Zxxbf6TDC5N+mslbvi3MOjOCm2dz69s44tv9Jhhcm/TWSt3xbmHRnAlygj5XzTxGVeSK9u6IA7WJh1RMLK0JWhBlBqOqjxfz7ow9y3flEPyj6hsk2ZSqwi7NkABP7lu/KIflH1B3Ld+UQ/KPqE5WV4xT3kABP7lu/KIflH1B3Ld+UQ/KPqDKxxinvIACf3Ld+UQ/KPqDuW78oh+UfUGVjjFPeQAE/uW78oh+UfUHct35RD8o+oMrHGKe8gAJ/ct35RD8o+oO5bvyiH5R9QZWOMU95AAT+5bvyiH5R9Qdy3flEPyj6gyscYp7zrzKpUGLIdB2vct35RD8o+ocVyh08ZRENyj6hSUHtRPGKe864jHNJiaUoeL/AIiG5R9Q/SlLxH4xDco+oXhmRDxFPeRUmMiFUEgpW6X/ABEPyj6hzKWufKIflH1DqjIjh6e8xJUMyFjkmAcL+nY5R9Q5lBLL+nZ5R9Q3jVS5yrr095+oVQZkLGNMKov6dn0n1DmTBl/TNek+obKtHeV4anvMyFjMhwRybp/TNek+ociSRf0zfpMaLEQ3jhqe8lpXwjIl09sQyMi/pW/SORLT+tR6RdYinvI4WG8mE7iHPRuH7RC0RH61HpH7oiP1qBPGae8jhYbyZo3D9o4m7lyCLoiP1qB+aIj9aj0hxmnvHCw3khTp7YxqWMOGn9a2OJmR/wBK36TEPEU95PCw3mRTgwrc4QNJH/TN+kxwNuv9M16T6hR4iG8cNDecFrGFa6jMpgz/AKZr0n1DgqGUeR9n0n1DN1o7yeGp7yOte0MClCWcGs/6dn0n1DgqAcP+nY5R9QxlVT5yyr095CWoY1GJxy5w/wDiIflH1DicsdP/AIiH5R9QwlK5bh6e864z2RwMx2Ryp4/+IhuUfUOJyh4/+IhuUfUOad2SsRT3nWnjMZElQqCcmUOkdTiIblH1Dn3Ld+UQ/KPqGcYPayeMU95AAT+5bvyiH5R9Qdy3flEPyj6hfKyOMU95AAT+5bvyiH5R9Qdy3flEPyj6gyscYp7yAAn9y3flEPyj6g7lu/KIflH1BlY4xT3kABP7lu/KIflH1B3Ld+UQ/KPqDKxxinvIACf3Ld+UQ/KPqDuW78oh+UfUGVjjFPeQAE/uW78oh+UfUHct35RD8o+oMrHGKe8gCfK/EZr5In27Qdy3flEPyj6hmhodUNCzRCloWZwaTqk8X8+0IaaLRqwk7Jn1KuL1krCcW5f0ZsU2zxjXtk/FtjpMSLk3F6yVhOLcv6M2KbZ4xr2yfi2x0mJGMNpqM7n17Zxxbf6TDC5N+mslbvi3MOjOCm2dz69s44tv9Jhhcm/TWSt3xbmHRnAlygj5n2XiZPCxUvcnVnznkOcsWlMPp1cNgr0yui8JGM6FUqZMfAPTd2bAb1SvrDE9Q1zNPEZV5Ir27ogDsp13CNkl8Un3pnk4zRFPFVeElOS905xXVGSX0Nq92bAb1SvrDE9Qd2bAb1SvrDE9Q1UAvxuW5dmPgcno9S6SfzKv3DavdmwG9Ur6wxPUHdmwG9Ur6wxPUNVAHG5bl2Y+A9HqXST+ZV+4bV7s2A3qlfWGJ6g7s2A3qlfWGJ6hqoA43LcuzHwHo9S6SfzKv3DavdmwG9Ur6wxPUHdmwG9Ur6wxPUNVAHG5bl2Y+A9HqXST+ZV+4bV7s2A3qlfWGJ6g7s2A3qlfWGJ6hqoA43LcuzHwHo9S6SfzKv3DavdmwG9Ur6wxPUHdmwG9Ur6wxPUNVAHG5bl2Y+A9HqXST+ZV+4bV7s2A3qlfWGJ6g7s2A3qlfWGJ6hqoA43LcuzHwHo9S6SfzKv3DavdmwG9Ur6wxPUHdmwG9Ur6wxPUNUmVSoYxqTgnwCHjJL9q7MfAn0epdJP5lX7htruzYDeqV9YYnqDuzYDeqV9YYnqGpSMciOglYxvmXZj4Eej1LpJ/Mq/cNsd2bAb1SvrDE9Qd2bAb1SvrDE9Q1UR7Q5pUNVXb5l2Y+A9H6XST+ZV+4bS7s2A3qlfWGJ6g7s2A3qlfWGJ6hrAlDmlYuqje7sx8CPR+l0k/mVfuGzO7NgN6pX1hieoO7NgN6pX1hieoa2JQ5ksxdSb3dmPgR5gpdJP5lX7hsbuzYDeqV9YYnqDuzYDeqV9YYnqGvCcHIli2v2dmPgPMFLpJ/Mq/cNg92bAb1SvrDE9Qd2bAb1SvrDE9Q8Bhltj9w+H7RNpezsx8B5gpdJP5lX7h77uzYDeqV9YYnqDuzYDeqV9YYnqHgcPh+0fhrKuULS9nZj4DzBS6SfzKv3D3/dmwG9Ur6wxPUHdmwG9Ur6wxPUNfmshwNwRr9nZj4DzBS6SfzKv3DYfdmwG9Ur6wxPUHdmwG9Ur6wxPUNdGsxwNQq21u7MfAeYKXST+ZV+4bI7s2A3qlfWGJ6g7s2A3qlfWGJ6hrRSxjUoUdRrd2Y+BPo/S6SfzKv3DZ/dmwG9Ur6wxPUHdmwG9Ur6wxPUNWqUOBntijrtcy7MfAn0fpdJP5lX7htXuzYDeqV9YYnqDuzYDeqV9YYnqGpzOo4mYyeLa5l2Y+A9HqXST+ZV+4ba7s2A3qlfWGJ6g7s2A3qlfWGJ6hqRJGoxlIiIqEIWMk/wBq7Mf/AKk+j1LpJ/Mq/cNrd2bAb1SvrDE9Qd2bAb1SvrDE9Q1UAnjcty7MfAj0epdJP5lX7htXuzYDeqV9YYnqDuzYDeqV9YYnqGqgDjcty7MfAej1LpJ/Mq/cNq92bAb1SvrDE9Qd2bAb1SvrDE9Q1UAcbluXZj4D0epdJP5lX7htXuzYDeqV9YYnqDuzYDeqV9YYnqGqgDjcty7MfAej1LpJ/Mq/cNq92bAb1SvrDE9Qd2bAb1SvrDE9Q1UAcbluXZj4D0epdJP5lX7htXuzYDeqV9YYnqDuzYDeqV9YYnqGqgDjcty7MfAej1LpJ/Mq/cNq92bAb1SvrDE9Qd2bAb1SvrDE9Q1UAcbluXZj4D0epdJP5lX7htXuzYDeqV9YYnqHmbURMnioqYOSWz5yOHKWISqH06uJwl6ZRVeEvGVSoVMmLhHkBPlfiM18kT7doUq4hzjZpfBJdyR1YPRFPC1eEjOT985yXVKTX0PqhcXrJWE4ty/ozYptnjGvbJ+LbHSYkXJuL1krCcW5f0ZsU2zxjXtk/FtjpMSOOG09cZ3Pr2zji2/0mGFyb9NZK3fFuYdGcFNs7n17Zxxbf6TDC5N+mslbvi3MOjOBLlBHyvmniMq8kV7d0QBPmniMq8kV7d0QBqAAABAAAAAAAAAAAAAAAAAAAAAAAH4ZVKhj9AAYlJMj4B+EYyjgpGyQo01rRII9ocyMYiMciMXjMhoykocyUMBGORHtDeNQgzkociWMBKHIlDZTIJBLH6ShHqP0lC6mLEglcI/cIxHwjH7hC3CEWM+EYGrhGDCH5hBwgsZjUPw1jEahxqIcybGU1jgahwNQ4moZuYOZmOBq2hxM9sx+GoZSqEn6ZjiZ7Y/DMcTMc8pk2P0zH4kjUY/UorjPIMhFQqEM0nLaSCIiKhD9ABoQAAAAAAAAAAAAAAAAAAAAAAAAAAE+V+IzXyRPt2hAE+V+IzXyRPt2hDB9ULi9ZKwnFuX9GbFNs8Y17ZPxbY6TEi5NxeslYTi3L+jNim2eMa9sn4tsdJiRnDaSM7n17Zxxbf6TDC5N+mslbvi3MOjOCm2dz69s44tv9Jhhcm/TWSt3xbmHRnAlygj5XzTxGVeSK9u6IAnzTxGVeSK9u6IA1AAAAg+nF0t2V20bdVZGNjbvbJRMVESOCdeeek0Otbi1MINSlKNFTMzMzMzyj0/eout3tbG+o4bsDNcxrPWL4vwHR0D1gwbLHi13TXWKKh3bWO80khy/BAgR1x10MYk0vXd2eSR/qYQmj/yUHmbVZpW72zVoo+RTSHnCIqBiXIdwyQwSVKQs0macJ0jMqkdDoQ5SHNM3VzWISycxjILC/SfZSoi+iUsxtwFXcZ8JDedfabMnXOTdpZQUpmEkdV/SQMes6H/Zdw0+YiIV4vfzI1s7LQr01shGFaqXtkalsIa0OMQXA3Uycp/ynU9hIvfIpzKZ9L0TCTTGFj4VeInWHCWmu0dMh8B4xPGd5RdmX1M+ODqFtOKbcQpC0GaVJUVDSZZSMhxF9s2JcBB2rlEXbuyMEhi0cIg3Y2HaSRJmDZFVSqfrSLHX9IsR1OgoSojSo0qIyMjoZHsDRa1cgDsLOSSbWjncLJJFL35hMYtehsQ7KaqWf8CIsZmeIiIzPEOvSRqMkpIzM8REWyPpBmSLmIS7SxbM3msKlVq5qylyMcWXhQrZ40w6dqmI1batskkIlKxJrm57McSmFhmJleZMHI+LURKOVwLptst/8rjpeEs/7GCRbZixVmLs7vbMsobkdi5FBGkqE4mCQp0/ncURqPzmPWjw95t6VlLANpbm8S4/HuJwm4KGIlOmX9Y6mRJTwmePYrQUjGdR2jrZDairs9olhhLehpZbJH9UklT0DoLQ2EsTaFpTc8slI5iSspxEC2tRcJKMqkfCRiv8bmx7PQ0SbZ2ZJTdaYRTPCV6EtGX2jZ10l/VgrxopEtl0ccDNlFVMHEqIlObeAZH4XzHQ+AXlQqR1tfVEKpFmt718x7Y2dwzsZYOKds3MaGaIZ1anoRw9o8Kq0V2yMyL+qKV3g2MtJYO0j9n7Uyx2AjmvCIlY0OoPItCixKSdMpcJHQyMh9cRru/y6uTXrWIek8c22zMmEqclkbg+FDu028poVQiUXnykQpGWuzLM+WCkkfAMZkZZR2topPMLPz2Nkk1h1Q8bBPKZfbVlSpJ0MdeLyhrCZ9CMyJd5YKd5ney00ndhrMzKYPlFG7FRkpYddcpFvJThLUkzOiSIiqeQiG2O9PdZva2M9Rw3YHksxmVMzTZAi/VxPSnht8ZNu5JW/NXXC2Xm92MRNrF2YlUmnElSuKSiWwTUOUU1QtEQskJLCMiLCTXJQyL84x8/K0OhlQx9k1ESkmlREZGVDI9kfMzNc3andxevFog2DRJZtWMgDIvBSSj8Nv8AwqqXzUG9Ofq23FXtNQEfCLw5hCxNi7SXNx8faGyFn5xFonjzSX4+WsvuEgmWDJJKWkzoRmZ04TFG6j6BZ3XrGTLjC/7CHEyneLCRuHvU3Xb21jfUcN2BQvNl2cktm77JoxIpfDS2EcJnBhIVlDLDVIdkzwEIIiKpmZntmZmPpMPnbm8jpfhHfM10ZgTh3ym939orPav9zHV5leGkE3m05lE6k0smLhsIiIc4uFQ6pBJUaV0NRHSuGj0Dfv5DWK/Y+z3q1nsiqeZ8nByi9iTKWsktRa1QjldnREmSS5eCLmj6vREoVcPrWtM/Cf1E4zg9L54Tkozinqbtdan3X+JXXNQWKlErl8vnkllkLLyTVl5uFYQ02ZVxKMkkVVeFSu0Qr+Z7Zi6N+so7sXazJlKMNxpJOoIstSxF+NfMKV1Hm6ZpqlVUoqyaPu/070jPGaKyVJXlCTWvbZ60TJTCOzKawkuh/wCdin0MI/tKUSS+0xd1iwNiWmG2vyRkK8BJJwly5k1HQspng4zFWMzrKe697UpJSCU1B4cW5XYwE+CfLNAuWOvQlGMqcpyV7vuPlf1N0pVhi6OGpTayxbdnblO3N7vqee/IWxH7HWd9WM9kU+vds81Zi3kxlkOk0w+iG4yR0xIMzoWLY/gLxCtOa2kyW57AzhKf55BIUZFlOhl9mCXpG2mMNGWGcorWjg/TvTFaOlOAqzbU09rb1rWv7NDERnkG3sy7ZaXz62UdETaBhY6DgoOpsxDKXEGtaiJJmSiMsREoamIqFQhaPMlSk4Sw0dNlpSSo+MMkmRYzQ2VCr/iNY8HRWHVTExza7az9J8udISwWhasoO0pWivi9f0ubG/IWxP7HWe9WM9kauzRlnLKS6yrSIGSS2WvEa39Eg4RppasFNEpNRJrgmpRYuAbyFcs1RNsOM0glRGSdDZMvmI3DP0mkh9RjoUoYebyrYfkHkdUxeL0vSi6kmlretmgwAdtY2SvWitTLZGzUlRkQlszLKlNfCV5k1PzD4qMXJqK2s/oitVhRpyqTdlFNv3Ishmf7vZCm7qFmM9kUtmEXMVnEpVFwqHTQ2eJBFhEdCMiwv8Q2F+Qtif2Os96sZ7I7yDh2oSEZhWEEhlltLbaS2EkVCL0EMo+7o4WnTpqFlqP5c0jpzF4zF1MRwklmbdrvUuZfBHmYy7+xMRCPQ/5JyJrRW1Iw25c0laalSpGScRltimttpE7Zu08bJ3cI9LuGlKlZVFt/62hfAVtzWVnNAmsFaJhvwIhOhvGRfpF/ovOoedpfCRlQzxWuPcfafp3p2tDSLwtebcai1Xd9a8Vc1JYWcQcitRBzGZSuEmkClWDEQ0SylxK0HiOhKIywiykfALiSyyd30yl0PMIGytm34aIbJxpxEtZMlJMqkf5oo+N+5ly3xsRB2Jmjx6G6Zrly1GVEqyqa8+UuGu2PN0RiYRnwVRans9/5Pr/1A0PiK+G49hZNSpr1km1eO/3ruvuRueIsDYh+HcZVZGQoJxJpNSJe0lRVKlSMk1I+EVGvTsbFWItW/KXTW5DK/lIR5RfzjZ5OCpZDF3h4G/Cw7dtLIuIYbT3UgyN2EVTGo6Y0fMf4j2NI4CNel6itJbPA/PfI3yqq6NxyhiZt0p6nd3s+Z693P7PcU0GSEh3ouKahYZtTrzy0ttoTlUozoRF85mOLza2XVtOoNDiFGlSTKhkZZSG+syzYPTESq20zZ/kmTNuXpURUUvIpzzZC4a7Q+XwuGliKqpo/b9OaYo6IwM8XU122Le3sX+5rs2TdxdXZuQ2ShIOcyKVzOZKTokU9Ewrbxks8qUmovzSyF6dkej/IWxP7HWe9WM9kehHlrybSt2ekSzQ6lEU8lRIUZ/zaSLwln834j7SNCjThbKrI/nBY/SWksXqqSc5vmbtr/pdxpHNEosfDtFAymTy6Xqh3DSS4GFaaU87ShkZkmpoTslt+YaNHb2snLk6my4gzVoKfBZSewnb+c8v/AMDqB8djq8a1ZygrI/o3QGjp6PwMKM5OT576wJ8r8RmvkifbtCAJ8r8RmvkifbtDiZ7J9ULi9ZKwnFuX9GbFNs8Y17ZPxbY6TEi5NxeslYTi3L+jNim2eMa9sn4tsdJiRnDaSM7n17Zxxbf6TDC5N+mslbvi3MOjOCm2dz69s44tv9Jhhcm/TWSt3xbmHRnAlygj5XzTxGVeSK9u6IAnzTxGVeSK9u6IA1AAAAg+stzGs9Yvi/AdHQPWDydzGs9Yvi/AdHQPWDnZY+Xuai167Sf3jFdIcGsBs/NRa9dpP7xiukODWA7a3LMqfJPd3PXq2ruxtNDzWSRrjkKSklFQDqzNmIbrjQZbB0rQyyHjH0+sVaKW2usnK7TShw3IGZQyIhozypIyxpPaUR1Iy2yMfIYfQbO+Ju9MLin4B5ZmUrnD8O0R7CFIbd/ecWOeprVzRKxYsfNHNfWFZsRfHMm4BkmpfMD03DpSVEpJeMyLaIjwiL+yY+lwpxnjEtQp6QzOnh6WUiu2SHP/APUxahrvH2dxWeqzNIZkOyLVsb+ZDCRTROwUvUqZRKTKpGlkqoIy2SNw2yMtozH02FGs7dgkOW+tTMTIsNiVtsEe0TjpKP2ZC8ozm9ZZHSW9tCxZSxs0tDEJJaYGHU4lBnTDXkQnzqNJecfMC9i2M0tJaSOdi4xx51501xTlcbrmyXAlOQiyFTgIXyzZMwVAXOmRKMkPzBptwttKUOOU9LZD5ruLU4tS1qNSlGZmZ7JjppvJR1bZdyMms09fMfgywUTEwUWzGQb7sPEMLJxp1pZpWhRHUlEZYyMj2RiAZmh9RczLeE5eXdDK5/GKSqaMmqCmOCVCN9ulVU2MJJoXTYwqDZgqFna0xcckttZSpR6FDxEJEoTsVcS6lR//AMSRb0YSVmWKH54NY5qV2/grUwjOAiaQ5aOZFiNxHgmfowD+dZirwvzngsvRFXdSqJMvCZfeSR/OlK//AOshQYdUtcYy3ru1GcdrR9Msxn/u02Q/6cT0p4bfGoMxn/u02Q/6cT0p4bfHK9poQZNNYKbNRDkE6ThQ0U7CPFsocbUaVEZeapcBkeyNYZrG7VF5F1MWxDMkqcSusZL1UqZmReGj/EkvSRDW9295RWYzVNpbFTN/AlloplEFDmo8TcYl1WByyqjhMkC0o1qR4KpZFIvPE+NbzLrLq2nEGlaFGlRHlIyykPoJndzRt3ExqjVXRJ9EKpTJ/JMF/AV5za12n5D3mLnMvh9Dk88M32cEqJbd/TQXzHjIiyEZCxmd76wz/wDfcR7NoROOXZsJi7lih87M3pr3xvzN9GYH0THzwzeBEd9kfUi/oujMi1FXU/d/aKz2x9/9Mr9LYx6AmMNHQ5kT0M6l5s9pSTIy+0h9AJbFtR8uho5g6tRLKHUHtpURGX2GPn7Qtohc3M/TXutdPJlnUlwraoRRVr/NmaS/y4I97QFRxnOm+dX6v/0/Lf1TwefC0MUlyZOL/wDZX/8Aj9T2k2hSjpXFQSqUfZU3j2KkZChdpZeuXT+OgjQaSaeUREeUiPGX2GQv6KfZoqU9zLxYpaUEluIqsqbZ+F+Ckl5h2ado56CnufeeL+l2O4PGVcM/3K696/DPb5juTf8A1E9nziU+CluDaPZxnhr/AAQN/wA5iygJTFxp0/kGVLKuyZFiIeBzNkp7l3UwDi0JS5HuORS6FjMjPBTX/ClI7q9yYJgbGPkpRJ0daUGe0ReEf2J+0dmj6ao4SK9l+vWfPeUdZ6U8o6kVrWdR+EdT7mztbDzJM1srARhOE4rQ9DcVWtVoM0Krw1SY8HmnJTp+wBxaS8OFWZ1pkKmEf7lPOIeZVnq5pZGaQTyk6LCzBTpER4yS6WF+8Sxsa30AmZWOmcKpOFVg1kW3g+FT7KDSMli8Nf8AkjGUJaD8orfwn9H+GUSF4bqJR3Du4kUuUhKHEQiFuEkv01+Gr7VGKd2Vkbkzt1L7Pmklm7Hoh3CrQsEl0UfoIzF60pSlJJSREkioRFsEPI0FStKc37vE+3/VLHJ08PhYvbeT7l3s/TxFUxTS/GanM7XKUR1TVbpcGGrEXoSQttbCM0hZiYRRHRSWFJSe0pXgl9pkKQWvitOWljniyE6aC+ZPg/wHTpyrloqG9nF+l+Cz4mriXzKy/wB8TqhvPMkWd0zP5jaZ5B6HBNaXYOuI3F41H5kl/mGjBdW5Kzv5M3byuCcbNES83pqJI6V0RzHQ6bRULzDydD0OFxGZ7I6/A+w/UPSnEtEujF+tVeX4bZfTV8T2g8FePbBqztopI244aWEvoOIIj2HFaGXoI1KHvRUXNBWg7rWjU0hdUKcN3/CXgI+wj9I+kx2I4vRc1tPyfyN0NHSuP4OfJSd/ireJboeNvms+m0dgJhCYJG60g3mjMshp/wC2PzEM10NoCtNd3KJmpZKf0EmYj/qI8FXppXzj1a0pWg0KIlJUVDI8hkN0416d+aS7zxIutonH7p0pfWLPnw4hTa1IWk0qSZkojykY5wr70LEtRMO4pt5pZONrTlSojqRl5x66+azyrOW/mEGSTJlxeitHTKR/x2fOPGj4StTdGo4Pamf1Jg8TTxuGhXhrjNJ9ZdS5u27NuLINRq1JKYw1GY5sipRyn5xFtKyl5y2B7UUmuitpEWItexMiNSoJ6jMa0Rn4TZnlIv6ycpejZF04GKh46CZjIR5D0O+2TjTiTqSkmVSMvMPrtGYzjNK0uUtvifz35a+Tj0Njs1Nf9KeuPs3x+HN7DRd69zj07vGgI+To0GAmbv8A9wUgv5gyKqll/aIsXCN4SmXwkqlkNLYBlLMLDNk20hJUJKSISgHVSw1OlOU4rXI8XSGnMZpDD0cPXleNJWXi/alZe5e8wR8WxAwT0ZErJDLKDUtR7RfxFTb8LZvzqbPQqFmWHTREkf8ANoL81v8Aif8A3MbRv/ty3AQi5dDOEomVUURH/OPbCfmTlPh+YhWF91x95bzyzW44o1KUeUzPKY8jTGNyx4GG17T9N/TzybyR4/XWt8n/AH16vacAAB8yfrYE+V+IzXyRPt2hAE+V+IzXyRPt2hDB9ULi9ZKwnFuX9GbFNs8Y17ZPxbY6TEi5NxeslYTi3L+jNim2eMa9sn4tsdJiRnDaSM7n17Zxxbf6TDC5N+mslbvi3MOjOCm2dz69s44tv9Jhhcm/TWSt3xbmHRnAlygj5XzTxGVeSK9u6IAnzTxGVeSK9u6IA1AAAAg+stzGs9Yvi/AdHQPWDydzGs9Yvi/AdHQPWDnZY+Xuai167Sf3jFdIcGsBs/NRa9dpP7xiukODWA7a3LMqfJA+gGd4y16DuSj411JpKPnbzjR7aEtNIrykrLzCjt39kJ9bq1cHZqzkEuKjopdCoXgNJ/ScWf6KEljM/wCNCH1QuxsjA2EsDJrJS48NiWwxNG5ShurMzUtZlsGpZqV5xzzeqxoj0YqDniUUhUPJoKvhtwq3DLgW8gi/cMW+Hz2zblrmrQXiRbEM9okPCrTBNGWMlJaqa/NoilU2yGmGWuUtyf11GdR7F7T1GdtxSEW0tbAmfhuy5l0i4EOGR/vkLwj5sZii1LVmL/5QiJdJqGnDTkrcUZ0KrlFNl53ENl5x9JxjPaaI0Zm34RyKuRcNsjPQY5KzpsVZdR+KiHzhH1rvTsyVsLvpxZ3wSdioc9BNWQnUmSkV2iwklXgqPlFaCVxcknkbKI9lxiJg31MutuJwVJNJ0xlsDaLvTXsKWtJkEAAiMzoWMxBYufnakE4mCtzMVJPQ3HIJlB8KSfUr99IuENP5kGwETd/cvAQkyYUxNZo4qYxraioptSySSEHtGSEoqWwo1DcAwk7ssVwzfESlF3EuhTPwnHYhwi/stGX/ALyHz9Fwc8CtO2/N4aQMu10hCklZFsOvKJSk/RoQfnFPh2TWWnBezvZlDXKTPplmM/8Adpsh/wBOJ6U8NvjUGYz/AN2myH/TielPDb443tNT5lZqOIfhb8Z1FQzq2X2ZpEONuIOikKJ4zIyPYMjF8szxeIxebdZLLR4aO6CU6WmTacWBEoIsLFsEojJZFtKIUJzV2vPP/wC8Yn2qh6fMQXl/kTeimz8xiMCS2jNEM5hH4LUTX+RXwVMzQf8AbIz/ADR1YlXl1dxlS5JcvNHXeM3k3XTGSpaI5iyk4mAXTGTqS/N/xFipkrTaHgcwHDvQlyMbCxCDbean0ShaT2DJDRGLCjprL2cl9nVzbucjQ25lMFx7iCKhJcWhCVU4DNFfOMM14ZWXtrudyPnhm79eyYf+j0ZkfQ8fPDN369kw/wDR6MyNMPsn7v7RWe2Pv/plfRY3MfzYly6eyNRnVp1EUgq4qKLBV+6n0iuQ2dmZZv3MvUhYda1JbmDDkMZFkrTDTXzop5x3aNq8HiYPfq6z5ryzwXHNC14LalmX/rr7ky3Y0DmrpE7EuymPhmcN1xRMlTZMzp9pqQXmG/h0NsJC1Pe5aXWyWmFj2ohRH/VQeFT0pSPr8VR4elKnvPwLyc0n5r0jTxL2K9/dY7Cz0ublEhl8qZSlKISGbYSRZPBSRfwGpc1BNtLSREEk8egKMyrl0RRI+wiUN0CrGabm2m7RqhUnVJPmnLk0NJJ/E1DHSE1Rw0rbrHseROFljtNQnPXa8n/us/cyZNtKW+jJWqmBHwZ0x/ptnhF9hrFpVpStCkLIjSoqGR7JCjd1017iXhyKZH+a1GISvHTwFHgK+xRi8o49B1c1Bw3PvPU/U3BcDpSGIWycV1x1d1iul2FlFM5oiPU6zVqWtOxBK2CWf8mR+czUfmFix0UnkLUFayczomyJccllCT4EkZn6VHUd6PRw2HVFSS522fLeUOlnpTEQqP8AbCMepXf1bPAX6TUpbY8yrjWpThltpQkzMvTgimqjNSjUozMzOpmeyLGZqibYLKYBKzxNobxbClHhH/lSQrmPntOVc1ZQ3I/Y/wBOsFxfRXCPbN38D1tz9nfyovDlUsW2a4cndHicn82jwjrXboRecXcLEVCGhcyNZzQZbM7Uvt+HEK0pDGZF+YnGsy+dWCX+Eb6HqaGocHh8z2y1+B+d/qLpTjmlXQi/VpK3xet/0vgdDb6Zdy7KxjyVYLjidBb/ALSsX2FU/MKTWnj+6U9i4slVQpeC3/ZLEX2FXzi98dBQUe0TMdCQ8U2R1JDzZLIjyVoY6b8hbE/sdZ71Yz2RppHBTxaUYyskZ+SPlThdAwnwlJylLnTWw0zmQ7QUXN7MPOfnEUZDpM/mSsi/yH6RYcdRK7L2alUWUXK7OyiBiSI0k9DQTbayI8pYSSIx246MHQnQoqnJ3seF5R6ToaU0hPF0IOKla6e+1n1mic1lZzTEpgrRMt1WwrQnTItg8n+tpIrYL3W7kzc/snMZU4jDN5lWAX/MRYi8+Tzii8whXIKOfhHS8Nlw0KxZaHlHgacoZaqqLn70frn6a6U4zo6WFk/Wpv6PZ9bmEWNzKFsoqMZirGxhrdKEZOKhHDOuA3hJSpHzEaiMvnMVyG4syPrlR390O+1ZHHoypKGJjbn1HueW2FpYjQld1FfKsy9jRacdBb+dLkNmn41qhOqPQ0KPIgzI/CP5iIzHfjwV/Gt/Ef2//YsfZVJZYNo/nvRNGFfG0qc9jkiptsp25PJut/DUbDZmlkjymWyo+E8voHSgA+AqVJVJOctrP6qoUYUKapwVkgAAKGoE+V+IzXyRPt2hAE+V+IzXyRPt2hDB9ULi9ZKwnFuX9GbFNs8Y17ZPxbY6TEi5NxeslYTi3L+jNim2eMa9sn4tsdJiRnDaSM7n17Zxxbf6TDC5N+mslbvi3MOjOCm2dz69s44tv9Jhhcm/TWSt3xbmHRnAlygj5ZxjDsRCStDSSUooNR0qRYtHd2xH7mRv6ovpE9Y9HZlNnVxMvK03dnSfc1eB3L0PRdE0wuldExYNMLhrQek0G6XbvB+6DspUM8b3S+J42N0pLDVeDVOT90b/ANo1x3Mjf1RfSJ6w7mRv6ovpE9Y2PoN0u3eD90DQbpdu8H7oNOKr+S6/wcnn2fRS7P5Li3ZX+XSya7azEomVrSYjYGTwkNEtdz4lWA4hlCVJqlsyOhkZVIzIei1R1zH7Zl6ti/dCjGg3S7d4P3QNBul27wfugpxKP8l1/gefp9FLs/k2NejZe5i29tplaXv5lAadiXX9A/JWLdwMNxS6YWEmtMKlaFkECz92eZwh30rnt9M1mDZHU0QkjfhsLgqptweI0G6XbvB+6BoN0u3eD90F5YbM7ua6/wAELTk1qVKXZfiW6u2vIzMt3UrVL7IzeGl6XKaM93NjFvPGWytxTRqVs4q0KuIiHrdUdcx+2ZerYv3QoxoN0u3eD90DQbpdu8H7oKcSX8l1/gnz9Popdn8lu71s0vYZqyMTD2Jnpx83iiNptwoR5ooYjLG5VaE1MiyEVceM8mOiVqFR83mzkToX8kXgtkbia4O2ePKZ1Mey0G6XbvB+6BoN0u3eD90GqoWhkUl1lfPc82bgp9n8mvYWDmcLEtRMNVl9lZONuIdSSkKI6kZHXEZGPoLdnmm7AR9iJY/bSddyLQEyTcdD6TedSpxOI3EqbQpOCr86lalWmxU6eaDdLt3g/dA0G6XbvB+6Cjwif7l1/gt59n0Uuz+S8+qOuY/bMvVsX7oaQzQGpvvTizncPb5UhtDgElUY1KIpxuIIsmit6GVTLISiMj260Ii0PoN0u3eD90DQbpdu8H7oIWDS2SXX+B59n0Uuz+SG9dxZwoo0s3tWUXD1xOLgpkldP7JQpl/mG47jbP5nOw83h7Q2ovETaSbQyichmu48W3CsLLIrBNszcUWwZ0IsuDUiMtUaDdLt3g/dA0G6XbvB+6CeKJ/uXX+B59n0Uuz+S8+qOuY/bMvVsX7oRJvmlro4WVxMRA2lVHxTbSlMwyIGJQbq6Yk4SmyIqnsmYpHoN0u3eD90DQbpdu8H7oIWDj/Jdf4Hn2fRS7P5OqvYn00tlaWImby9HU+6p91zCJJKcUewRniIixFtDxvcyN/VF9InrGx9Bul27wfugaDdLt3g/dBrOjnlmcl1lY6bnFWVKXZ/JaDMzX0XZ2OuPs5Zu0dpigZrBofKIY0lEOYBqiHFp8JDZpPwVEeIzyjY+qOuY/bMvVsX7oUY0G6XbvB+6BoN0u3eD90GXEo/yXX+C3n6fRS7P5MWaCmMHaq86cTmQvlGQMRGPutO0NvCSpwzSdF0MsR7JDXyZdHpUSkt4KiOpGTiSMj9I2NoN0u3eD90DQbpdu8H7oNJUMzu5LrIjpyaVuCl2fyW6ugzS1h37upQm3k/OXWjZZJmNQcI87oqkYidwm0KT4ZESjKuIzMqZB63VHXMftmXq2L90KMaDdLt3g/dA0G6XbvB+6DLiUf5Lr/BPn6fRS7P5Lz6o65j9sy9WxfuhTPNaWik1ur0YydWWjSmEA5oeA7gKarRhpJ4nCSeVKiybA6TQbpdu8H7oGg3S7d4P3QXhhlC9pLX7fwQ9OTdv+lLs/k1x3Mjf1RfSJ6x2Vlu6EltLLZshBpODim3qpcTWiVEZll2SqQ9roN0u3eD90DQbpdu8H7oJjh8rTUl1/grV0y6sHCVGVmrP1d/xLA99i7/APaAuaP9gO+xd/8AtAXNH+wK/aDdLt3g/dA0G6XbvB+6D2fOdf8A8PqfnXoZozdW6o+Bv9y9mwKUKUmfEpREZkkoV4qntfmCrl4T8RPbRLjGP5VvAoS8IiwjMzUZ0PHlP7B6TQbpdu8H7oGg3S7d4P3Qc2KxNXEwyTcUvYz3tA6Nwmg6squHhVber1op91jXHcyN/VF9InrFubO3s2NVIJecznOl47SzemWjh3VmhzBLCLCJJkeOuMho3Qbpdu8H7oGg3S7d4P3QZYOpPCNuDjr3s6PKDDYfT0YRxNOosl7ZY227dt9xYHvsXf8A7QFzR/sB32Lv/wBoC5o/2BX7Qbpdu8H7oGg3S7d4P3Qd3nOv/wCH1PmfQzRm6t1R8DDfbOU2ptCqIlbumIY3lqwj8GpFRKMSqH+aX2jX3cyN/VF9InrGx9Bul27wfugaDdLt3g/dB5deDr1HUlJXftPvMBj1gMPDD0qU8sVZXjr7zctgrdXd2ZsdK5G3P0EcLDpS4ZQbxYTh41niRsqMzHed9i7/APaAuaP9gV+0G6XbvB+6BoN0u3eD90HpQ0jWhFRWSy958RX8ktH16sqtThnKTbeqO163zG71X02LJRkSpgoiPKTBUP8AzD879VjP/MfoC7Q0joN0u3eD90DQbpdu8H7oJ854jfEn0Q0T0dXqN3d+qxn/AJj9AXaE6FvcsG8wlxycLh1HWrbkK4ai5KTL7RoPQbpdu8H7oGg3S7d4P3QT5zxG+P1Kz8j9FSVlCsvgv7TLA99i7/8AaAuaP9gVovgh5VMbbRcys1Eoi4OJPDMySbeCrZKiyI+DzDttBul27wfugaDdLt3g/dBzYrE1MVDJNx6z19BaKw2g67r4aNVtqzTSt9Ld5rjuZG/qi+kT1jZWZ1msBZO28XMrQRBQcK5LnGUuYJuVWbjZkVEEZ5Enj4Bw0G6XbvB+6BoN0u3eD90HHRpujUVSMlde09/SWOWkMLPC1ac1Gas7R1/C7fcWB77F3/7QFzR/sDyN7Vv7Iz2x70BKpuUREqXUkaA6n9BRZVJIspkNWaDdLt3g/dA0G6XbvB+6D05aRryTTcfqfG4TyV0dha8a0I1rxd9aVu41x3Mjf1RfSJ6w7mRv6ovpE9Y2PoN0u3eD90DQbpdu8H7oPH4qv5Lr/B+gefZ9FLs/k1x3Mjf1RfSJ6w7mRv6ovpE9Y2PoN0u3eD90DQbpdu8H7oHFV/Jdf4Hn2fRS7P5NcdzI39UX0iesSINh2HhJoh1JJUcGk6VI8WjtbQ9/oN0u3eD90Hm7TJs6iJmBWZ7s6T7mow+6mh6LommEVpoeLBpg8NajOrQyRvdP4nXgtKSxNXg3TkvfG39s+mNxeslYTi3L+jNim2eMa9sn4tsdJiRcm4vWSsJxbl/RmxTbPGNe2T8W2OkxI44bT2Rnc+vbOOLb/SYYXJv01krd8W5h0ZwU2zufXtnHFt/pMMLk36ayVu+Lcw6M4EuUEfLGPccag5UppxSD0ooqpOn9O6Imm4v5U/8ASGJM08RlXkivbuiANU2VcIvajNpuL+VP/SGGm4v5U/8ASGMICbsjg47ifDTiYw7eA2+kyrX+UaQs/SojMZO780/Ws82b7I6wBZVJrnI4Kn/FdR2fd+afrWebN9kDn0zMv51nmzfZHWDLBwz8ZGMwkK0p199xLbSE5VKUdCIvnMw4Se9kcFT/AIrqMj0wjXVYSolZH/yeCXoKg4abi/lT/wBIY3lMMyrePBy6IjO6Vm4g2GVO6CzEvG45gkZ4KaskWEdKFUyKuyNELQpC1IWRpUk6GR7BiZxnHXIpTlRqcmzMum4v5U/9IYabi/lT/wBIY2rZbM/2ztFd81baBmUhRL3YZ2JS06+6T2C2aiMqE0aa+CdPC2hqVxCm3FNrKikmZGW0ZCHGcVdkxdKbaja6Mum4v5U/9IYabi/lT/0hjCPa3SXaWhvNnEXLZA5AsKhGNHeejFrQ2RGokkmqUqPCOpmRUyJMQszdkWkqcVdpWPIabi/lT/0hiXBTuPhSJJLadSR5HWkrr5zKv2j3N7dytrrtJXBzOdvyuLhIp02ScgXXFk2oiqRKw0JpXHSlch5B5m7Wxs0t9a6GszJ34NiMiEOLQuLWpLZEhJqOppSo8hbQtapCVuconRnHMrWMZWri6f7Olh/+gfaHF21MatBpTBS5sz/SSxjL0mY7u9y660N2UfBwc+iZbEqi2jdbXBOrWkiqZUPDQk64j2DHb3TXHWsvKs4/PpFMJJDQzEWqEUmNedQs1pQhRmRIbUVKLLZ28Q0z1r5ecpbD5c+qxrmImUc+5hriFEf/ACUQXoTQhj03F/Kn/pDG1LA3AWztmzNXJbMJFDlK5guAfKKfdSanEpSo1JwW1VSZKKlaHwEPTaky8bdqynOoj3IrwdV8zHDYdc6NC6bi/lT/ANIYabi/lT/0hjeE3zLN4MslMZMnpvZhbUIwt9aW4l81KShJqMiqyRVxbJkNRWTsraG1c8TJLPSp+YRx1q20RUQRHQ1KUfgpTwmZEKyhOO1F4TozvltqIcLNo+GJRNv4WFl0RCXPRhEdBm7vzT9azzZvsjckPmVbzHYUnlxVnWFmVdBcjHDWXBVLZp+0a0vEu6thYCLbYtPKHIVt0zJmIQonGXeBK04q8B0PgFmqsVzkRlh5uys2efiZpHxCiU5EGkyKhaGkmy9CSIYdNxfyp/6QxhHJltx51DLLanHFqJKEJKpqM8RERbJjJyb2s14OC5kZNNxfyp/6QxLZncyabS2l5sySVCNTCFH6TKpjbdnszDefNpe3GPolEoNxJKJmOilE4RHtk2hdD4Dxlsjpbw7hrwbDyKJns0hpfEy2FwTffhIolYBKUSSPBUSVGVTLIR0y5BqoVY61cx4TDt2ujwHd+afrWebN9kYYqax8SSScfwcHJoaEt+nBIqj290F0Fpb0IaYvyCOlEMmXrbQ6Uc64g1GslGWDgIV/VPLQe81Jl427VlOdRHuQSqyXPYSnh4OzsmaF03F/Kn/pDDTcX8qf+kMbKnVx1rZTebJ7v4mOkqplN4dT8O+2+4cORJJwzJRm2SiP+TPIkyxljy09hqTLxt2rKc6iPciOCqbg6uHVndGjISbTCFNRtPkrCpXRUJc9GER08wkflFNf1sPzRrsjdepMvG3aspzqI9yIcDmXLwIuOj4Rub2ZSuBeS04aol+ijU2lwjTRnJRZFjpjI/nF1GulZXMpPByd5KN/cjT67QTRaDSbrFDKh0hWiP0knEIOm4v5U/8ASGN9aky8bdqynOoj3IizfMs3gyyUxkyem9mFtQjC31pbiXzUpKEmoyKrJFXFsmQhwrS23ZMZ4SHJsvgaP03F/Kn/AKQxlhplHQ7uiNxClKpSjhE4XoVUhsq664e2F4dnHJ7JphI4aHbilwqkRj7qXMNBJM8SG1FTwi2RrOawT8tmURARODo0O4ba8E6lUj2OAUtOKzGy4GbcNT9hM/KKa/rYfmjXZD8opr+th+aNdkT7tbGzS31roazMnfg2IyIQ4tC4taktkSEmo6mlKjyFtDbmpMvG3aspzqI9yLxlWkrpvrMZ0sJB2lGK+CNDLjYxa1KOJdIzOp0UZF6CyDkzMI1l1LiIlw1JOpEs8IvOR1Ixsm9a4u1929m25/O4+SRUK5EphsGCfcUtKlJUZGZLbSVPBpiOuMsWWnZWCzOdt7Z2Rl9ppXNLPMwcchS2kRMQ8lwiJRpPCJLRllSeQzFclTNbnNM+Hy31W2GsPyimv62H5o12Rxdn80cbU2p1kiURkZphm0n5jJNS+chntzZea2NtVHWcnSEJjINzAUbZmaFllJaTMiM0mVDKpEePIQ2Ddrmfbb29smxaWVxclg4KIWtLKY151C1kk8E1ESW1Fg1Iyy7BiylWby3ZV0cLGKnljb3I1VpuL+VP/SGGm4v5U/8ASGPRXgWGnFibbOWSmz0G7Gtm1/Kwy1KaVoiUqKhqSR/pUOpbB5RtjUmXjbtWU51Ee5FFTm3axd1KEUm7azQum4v5U/8ASGP1MbFpUSiiXqkdcazMbrtBmX7wJLIphOIia2adZgYZyJcbaiXjWpKEmoyTVoiqZFiqZFwkPA3SXbTy82dRcpkMXLoZ+FhtMLVGuLQk04RJoRoQo61UWwDhUTSaCqUJJtWsjoPyimv62H5o12Q/KGa/rYfmjXZHqb3bpbVXYrgTn64CJYjiVoURBOLW2Sk5UHhJSZKpQ8lKbOUdldLcfay8uzkRPZFMJJDQzEWqEUmNedQs1pQhZmRIbUVKOFs7eIXzVr5bu5nwWEy58sbe5GtdORfyp/6QxybjoxtxLiYl0zSZGWErCLFtkeI/mMbOu4uFtjbuBmMXKo+RwyZfHKgnkxb7qVGtKUqM04DaiNNFFlMj4B6rUmXjbtWU51Ee5EKlU3FnVw+xtGlPyimv62H5o12R+LtBNFoNJusUMqHSFaI/SScQ3FN8yzeDLJTGTJ6b2YW1CMLfWluJfNSkoSajIqskVcWyZDRS0qQtSFFRSToZcImUq0eU2Vp0sJN+pGL+CMum4v5U/wDSGGm4v5U/9IYwgMbs6uDjuM2m4v5U/wDSGGm4v5U/9IYwgF2ODjuM2m4v5U/9IYlwDjjsHNVOuKWelElVR1/p2h1wnyvxGa+SJ9u0IbZKjFbEfVC4vWSsJxbl/RmxTbPGNe2T8W2OkxIuTcXrJWE4ty/ozYptnjGvbJ+LbHSYkZQ2lhnc+vbOOLb/AEmGFyb9NZK3fFuYdGcFNs7n17Zxxbf6TDC5N+mslbvi3MOjOBLlBHyvmniMq8kV7d0QBPmniMq8kV7d0QBqAAABAAAAAbjzIFkvylvghI59rDg5I2cc4ZliNwjo0Xz4Zkr/AAGNOC72Y1syxZi6N+00xNuGcnDqopx10yQSIZuqUYRnkL+cXXaUNqEM00cuMq8HSft1Gw4C3sFE3wR9giUjRYeXIiUHXGayUWGnh8FxvF/yqFJ80rZL8kL3JtBstaHBxa9OQtConAcxmRfMdS8wtHAWSurg70SvFavKwpuTzjptqnMJoB4ZKJSDSSK4NFHiwsWLaHmc3JZRMysdLLYQjZLdlzugPqSVasuY0n8xK/eHfXg5Qat7vh/meTg6sadWLT26n8f8j19yH+6rL/7ojP3nRRGY/wC0Ij/qq/Exe65D/dVl/wDdEZ+86KIzH/aER/1VfiYwxH/DD/cx2YP/ALip/udmAXYzJMjh7FXIxtr5k3gOzLRI5wzxK0u0Rk2nz0Wov7ZCntjZFFWntXK7PQRHo8wim4dJ0rg4R0NR8BFUz4CH0NtpKrJNWDasZNp81Z+WOQyIZgyi2mHDbawaEg3CMjpRNcWzwiuDheWZltJ1csFBc55CfmxfRmb4mIaQ2uNdh1rQSSrgxTCjI6F/zGk6cCyFbMx6lSL/AGUoWRpUliKIyPYPQVi11yNn7DWLlcTZqx9rynTbzyos2XZgxEONngpSo0k2lNE4k1qR4/nGh5PJ4W7jNowjD5Jh5bMXnVQqjxJIohpZISX/AKhkkb1Yt5ZNa0zkw9SKU6cXdNO3+/2wy5vX/wAQWf8AJT/fWPd5hLWgmf8Afz3sGB1ObVsPae0apJNrPyaNmyGEqYfag2VOuIxmZHgpqZkdTxkWKmMexzKNmZpYW554rTw6pY9ERr0wcaf8FTLWAhNVl+idGzOh4yI8YNN17+wKSWEs3ruVStdbW11mLeWjhbPWkmsrh3Zi4441DRKkIUvJhUI6VoRFXgLaFusyjO5vaC52Dmc8mUVMY1cW+lT8Q4a1mRLoRVPaFG7exiJhbObRrf5r0UtZekXUzGOsXA+WRP74pCcnXkr6tfea1qcVhYStrsvfsKmT29C8U46OglW1nq4Y3HGjaXGLUk0VMsEyM8ZUxYxa7MpyOX2VuQRad1lJxszQ9MI10iLCUhBqJCSPaJKa021K2xSGe/7bjvKF/vGLuZlCfS61txjVnFPp03Lm3YCMaI/CJCzUaFkW0aVUrtpVtCKU3Ks1J7ycTTUMMnBWva/UVutffreNG2riI6CtHGQDbb56HDsOGTRER5MD80y+cqns1Fq5A9DX1Znhl6dQjKn5nBOJWRJoTcS0pSCcT/V8NGEXAdBUi1Vyt5UvtfFSliyUzj0qfUTMVDMGuHcSZ+CrRPzU4v6xlTZFu7Kwbdz+Z+hoOaxLRRUvgnFLMlYlxLilLwEns0Uuldoqi9KVSdVqWwyxMaNOjFw2/U+fsUycPFOsKOptrNBnt0Og9xmeYiWQt9VlX5uptEImOLwnPzUuGkybM9qizRjHipi6l+YRD6PzXHVLL5jMzHYWMs7MbWWmgrOynQdPRqjQyTq8FJmSTVQzpiyDg2T9Xeew/Wp+tq1F4s0RIr2JuzAuXbzRTCGkmURDtRel3VKr+cSjMiMqUKhni84rfeBay+2QWSj7KXgwcwXLJigmtGjWiX4RKJRYD6akZ1TkqeL0j0ckneabsIbcpVIp5M4dmiUoXB6eTgliIidRhULziw81ci7SXCx79vpIxLouJlTzkZBKOqWlkSjQZVyKxIURZSM6ZSHpXdV+q2nuPEsqC9eKa331moswD/se13lEL+64ON69mM0XFW/m0TZCJnaZK4+pUKTU6ZbQSanSiVOkaSpTFQhlzBCEol1skJVhJTFQxEe2VHRivXtzmgZVb+bQNlpPO4mTtvqKFcas+b6DRU6UWTZ4RcNTFKeqjrdvcXretinZJ+/ZsRoi8KNvRs1baFXa+azaGtFANkcPEKjScdaQoq0S6hR4jIzxV2TrlMbWzJNvLaWivcRLp7aibTKD0g+5oMREqWjCLBodDPKVRp+9yaW7nFoW4+8CWxsDM3GiwNNQCoVTiC8EjJJkVSxUqRD3mYn17Uf3bEf+0c6m+FspOx2zpReHblFJpPZ/R7zNm2ztbZi3Mnh7PWjmkrZelhLcbhYlSEqVorhVMiOlaUKvAQ0K1eneO08683baeoceMlOqTGLI1mRUIzx4zoRFXaItobczemuDIv7qL2rgrkJxFWcajSb5u4rgqFKdFOUU3r5vaX/zKM7m9oLnYOZzyZRUxjVxb6VPxDhrWZEuhFU9oU8nt6F4px0dBKtrPVwxuONG0uMWpJoqZYJkZ4ypixi2eYx1i4HyyJ/fFHJ7/tuO8oX+8Y0qVJqlFp6zHD0qcsROLira+b2l1sxEpS7m4hajqpU4iDM+HAbFObf/APjSb+VL/EXEzD2sw9/e7/7jYrFbe7u8CItdNH4ewtp3mlxKlIWiUvqSoq5SMk4xFS7w6+H9lqDUcXK+596O9zHWv1J/J4n2KxYbNJSO9+aTaWO3ZvTNthDBpiShZm3DJwsJWUlrTU6UxjQuZTlU0kuaJlUvnEtjJbGIhog1Q8WwppxJGwoyM0qIjKpDfWaStPezZ+bSxN3UvmcZDusGcSULKdNpJeErKZIVQ6UxVFsNqpPmM8brxEbK/dzlbb35bfZJ5HDs3kRU1XLYl7+RREzFuJQbidmiFqwTKuU6ZaC1FwEw7kZmSTzXQ9E0lLYmIwK0wsBx1VPsFWb3rTXx2gkLBXhSSaw0vZd/knomTKhUJWrYwsBJGZ4OQ9oWXui/3RGf7ijvxeE0bOttb1c/vIxKccPrSWvm9x4fNW2AVbaY2PtbZZCX+7S2YBTqU4jS54TLh8FDOp7BEQ3xZlyVWemEru9laCJMBJyd4UoQpDaTPbNR4Rn83CNO5km8uRv3dKs7aWcy6Ci5JEGmG05EIbNxhVTSacIyqaTNScWQsHbGO4O17ls80dbCa4RmwUtNDCT/AEUE82SS+ehER8JGNYZbcJv1HPUVT/i5o3fwNTZq/wD3jX//ANP2aBau/eX2zmVgHYawbkWidaOhSDhotMOvBIlV8JSklStMVRVTNX/7xr//AOn7NAtXfvNLYSewDsdYZiLfnCX0EluGg9MrNFFV8DBViyY6CKf/ACT+HcXrf8NP495V21kizTEos5HzC0EZPSlTTJ6bw5yy8k2z8EyNCXDNRHWlKHlHaZgvXGnv90H7ZsdZam3OaLmtno6An1nJ6csdaPTWHZxTaSQXhGZqJssEipWtSyDs8wXrjT3+6D9s2Oe6dSNpN+862mqM7xS2bCwN7Ukld59lrT2IbNBTeVm06zhHjQ6ponGl8CVVUjzKHjsw5Dvwd1s7hIlpTT7Non23EKKhpUTEORkfnHj7fW+Vd9mvnphEOmmVRkPDQkxKuImlNIov/AqituhGWyLK2dkcukz02iJckkpm0ccweJP5uiKabQoy+fQyV85mOlqMp350cF5QpWeyWvq/3cfPma21tdZi1E7hbPWkmsrh3Y1bjjUNEqQhS8mFQjpWhEVeAtoXFzKM7m9oLnYOZzyZRUxjVxb6VPxDhrWZEuhFU9oUat5/4ym3lK/xF1cxjrFwPlkT++MYTk68o31a+8669OCwsJJa7LX8Cpk9vQvFOOjoJVtZ6uGNxxo2lxi1JNFTLBMjPGVMWMeEWpS1qWo6qUdTPhEue/7bjvKF/vGIY5K05Sk03zno4anCME4pK6QAAGRuAAAAE+V+IzXyRPt2hAE+V+IzXyRPt2hDB9ULi9ZKwnFuX9GbFNs8Y17ZPxbY6TEi5NxeslYTi3L+jNim2eMa9sn4tsdJiRnDaSM7n17Zxxbf6TDC5N+mslbvi3MOjOCm2dz69s44tv8ASYYXJv01krd8W5h0ZwJcoI+V808RlXkivbuiAJ808RlXkivbuiANQAAAIAAAADdE0zRFpo67/wDIxEik0FAlBtwiVwpOJUhCCSREWEoypRJEZbRmNLgNKdWVN3izKtQp1laauBuWIzQtpY67grDzaRyiOgTgUwS316ITy0JIiSozwqYZUI60ylWg00AiFSVN3iKtGFVWmjcdj80Haazd3jNiWJLKH4FmHdh0vLJwnTQs1GdTJVK+EextYhp+Ic0aIcdpg4azVSuSpjgAmVWUoqLepCFCnCTlFa2enuvtnF2BthD2mgJfAx0VDoWhtEWSjSk1pNJqLBMjrQzLzmO5vjvWnd50XBxE2g4SDKERgIbhjVgHjM60UZnXHjx7BbQ1+ARqyjFxT1MSoU5TVRrWj0d21sZrYK2EHaeTpZciYbDSbTxGbbiVJNKkqIjI8h1y5SI9gegvivWmV5sVL42aSeXwEZApNDb0GayNSDOtDwjPIeMqUymNeAIVSUYuK2MSowlNTa1o3dZHNN3iSOWtwUbpGdE0kkodjGz0Shf1lJMjUfCeMddeDmgrdWwljktech5fCO/zjUKVEq+czxn8xmZcA1EA0WJqpWTMngaDd3Hv7tgUZqMzMzMzxmZ7I3BdVmgLTXe2Ras1LZNKIuGaeW6lyIJzDqs6mR4KiLLwDT4DOE5Qd4m1SlCrHLJajNHP6ajX4nBwNFcUvBrWlTrQdpYy1U/sdO25xZyZPQEWgqGpB1StP9VSTxKTwGOlARmd83OWyRy5baiwMLmrretQhMvSqSvukVDeNtaVGe3Qjp9g1veVepa63rhFO49RsJ/MYRRKE7dCKheelT2TMeGAavE1WrXOeOCoRlmUe8DsLNzqZWdnkJO5PEnCx8G5ojLpER4J5Mh4jxGZDrwGCdjqaTVmb9lWasvAhYcm4yXyeYOEWNxxpSDPzIMiHmbx7+7b22lipZFOswMGs6rZhiwUq2qnlPzmZbOXGNUAOjjVW23uOTiFC98v1fibJuYvhn11zEyYlEtlsa3MFNrc00S6pNBKIqGlRYvCMbC1W9tP2as/6Hu2K6AKwr1IKyfcXqYSjUlmktfvZ7++S9Ka3nR0FGzaWwUE7CNaEgoU1YKk1M8ZKM8dTPZHWXUW7md3VrUWjlUJCRUQTC2DbiSUaDSqlfzTI64iHkwFZVZSlmb1l40KcYcGlqPdXyXmTS86cQU0m0vg4J+Eh9LpTCmrBUnCNVTJRmdaqPZ2h4UAFZzc3mkWp04045Y7DcF1WaAtNd7ZFqzUtk0oi4Zp5bqXIgnMOqzqZHgqIsvANSxz+mo1+JwcDRXFLwa1pU60GEBMqkpRUXsRWNGEJuaWtm2ro7+LSXb2XXZ6VyiUxkMqJVEYcSTmGSlEkjLwVEVPBLYHsdVvbT9mrP8Aoe7YroAvHEVIqyf0RnPB0ZycpLX72bUiL7p+7ezD3kJlMsTMmWTZOHPDNlSTb0PJhYRHThyj2+q3tp+zVn/Q92xXQBKxNRO9/oiHgqDSVtntfibivRzQForwbKOWdmsklUNDqdS6TkMbhLJREZF+coypjMcbK3/2lkF2qLCNSaUvy9MK9CE8onCdwHMKp1wqV8M6HSmTENPgHGambNfX8BxKjlyW1e9n6o8JRntnUe2udvKm92M+i5vKIGBjHIqG0u4iKJZkScIlVLBUWOqS2x4gBlGTi7o6JwjOOWWw9beTbuYW5tuq1sdBQsLGKJrCaZwjbq2REVKnXIRVxjbqc1vbXBLCs3Z4zpjMieL/AN4rqA0Veom2ntMZYSlKKi1qXtZYKa5qq18ylcXLn7OSJLUUwtlZo0UlElSTSZlVZ46GNb3SXmze7a0kdO5RAQMW5GsGw43FEsyJJrJVSwTLHUiHhQCWIqStd7CI4SjFNJbfaz1V6dto68G1z1pZjBw8JEvNoQttgzwPBSSSMqmZ5CLZGybF5pu21mrLy+Q9y5RMUQDJMNREQTmiKQnEklUWRHQqFWmQi2cY0YAhVpqTlfWWeGpSgoNal7yZO49U0m0TMFtk2qIcNw0EdSIzG1Lqs0Baa72yLVmpbJpRFwzTy3UuRBOYdVnUyPBURZeAafAQqslJyT1lpUKcoKDWpGaOf01GvxODgaK4peDWtKnWgwgAo227s0ilFWQAAEEgAAABPlfiM18kT7doQBPlfiM18kT7doQwfVC4vWSsJxbl/RmxTbPGNe2T8W2OkxIuTcXrJWE4ty/ozYptnjGvbJ+LbHSYkZw2kjO59e2ccW3+kwwuTfprJW74tzDozgptnc+vbOOLb/SYYXJv01krd8W5h0ZwJcoI+V808RlXkivbuiAJ808RlXkivbuiANQAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAnyvxGa+SJ9u0IAnyvxGa+SJ9u0IYPqhcXrJWE4ty/ozYptnjGvbJ+LbHSYkXJuL1krCcW5f0ZsU2zxjXtk/FtjpMSM4bSRnc+vbOOLb/SYYXJv01krd8W5h0ZwU2zufXtnHFt/pMMLk36ayVu+Lcw6M4EuUEfK+aeIyryRXt3RAHaOIhIuBgCOZwrC2WFNrQ6h2pHoq1fooMsii2Ri0hC7tQHIf8AdjQEABP0hC7tQHIf92GkIXdqA5D/ALsTcggAJ+kIXdqA5D/uw0hC7tQHIf8AdhcEABP0hC7tQHIf92GkIXdqA5D/ALsLggAJ+kIXdqA5D/uw0hC7tQHIf92FwQAE/SELu1Ach/3YaQhd2oDkP+7C4IACfpCF3agOQ/7sNIQu7UByH/dhcEABP0hC7tQHIf8AdhpCF3agOQ/7sLggAJ+kIXdqA5D/ALsNIQu7UByH/dhcEABP0hC7tQHIf92GkIXdqA5D/uwuCAAn6Qhd2oDkP+7DSELu1Ach/wB2FwQAE/SELu1Ach/3YaQhd2oDkP8AuwuCAAn6Qhd2oDkP+7DSELu1Ach/3YXBAAT9IQu7UByH/dhpCF3agOQ/7sLggAJ+kIXdqA5D/uw0hC7tQHIf92FwQAE/SELu1Ach/wB2GkIXdqA5D/uwuCAAn6Qhd2oDkP8Auw0hC7tQHIf92FwQAE/SELu1Ach/3YaQhd2oDkP+7C4IACfpCF3agOQ/7sNIQu7UByH/AHYXBAAT9IQu7UByH/dhpCF3agOQ/wC7C4IACfpCF3agOQ/7sNIQu7UByH/dhcEABP0hC7tQHIf92GkIXdqA5D/uwuCAAn6Qhd2oDkP+7DSELu1Ach/3YXBAAT9IQu7UByH/AHYaQhd2oDkP+7C4IACfpCF3agOQ/wC7DSELu1Ach/3YXBAAT9IQu7UByH/dhpCF3agOQ/7sLggAJ+kIXdqA5D/uw0hC7tQHIf8AdhcEABP0hC7tQHIf92GkIXdqA5D/ALsLggAJ+kIXdqA5D/uw0hC7tQHIf92FwQBPlfiM18kT7doNIQu7UByH/djK2iEhIGPIpnCvreYS2hDSHameioV+kgiyJPZEA+pdxeslYTi3L+jNim2eMa9sn4tsdJiRcm4vWSsJxbl/RmxTbPGNe2T8W2OkxIzhtJGdz69s44tv9JhhfWPhIWPgX4GOhmYqEiW1NPsPNktt1CiopKkniUkyMyMjxGRj5WXLXnz+6e1MTaKzsJLIqLiYJcEtEe2tbZIUtCzMiQtB4VW07NKGeIbe1aV6W4FjeZxPxAmUW2C5Peout3tbG+o4bsB3qLrd7WxvqOG7Aptq0r0twLG8zifiA1aV6W4FjeZxPxAjLIFye9Rdbva2N9Rw3YDvUXW72tjfUcN2BTbVpXpbgWN5nE/EBq0r0twLG8zifiAyyBcnvUXW72tjfUcN2A71F1u9rY31HDdgU21aV6W4FjeZxPxAatK9LcCxvM4n4gMsgXJ71F1u9rY31HDdgO9Rdbva2N9Rw3YFNtWleluBY3mcT8QGrSvS3AsbzOJ+IDLIFye9Rdbva2N9Rw3YDvUXW72tjfUcN2BTbVpXpbgWN5nE/EBq0r0twLG8zifiAyyBcnvUXW72tjfUcN2A71F1u9rY31HDdgU21aV6W4FjeZxPxAatK9LcCxvM4n4gMsgXJ71F1u9rY31HDdgO9Rdbva2N9Rw3YFNtWleluBY3mcT8QGrSvS3AsbzOJ+IDLIFye9Rdbva2N9Rw3YDvUXW72tjfUcN2BTbVpXpbgWN5nE/EBq0r0twLG8zifiAyyBcnvUXW72tjfUcN2A71F1u9rY31HDdgU21aV6W4FjeZxPxAatK9LcCxvM4n4gMsgXJ71F1u9rY31HDdgO9Rdbva2N9Rw3YFNtWleluBY3mcT8QGrSvS3AsbzOJ+IDLIFye9Rdbva2N9Rw3YDvUXW72tjfUcN2BTbVpXpbgWN5nE/EBq0r0twLG8zifiAyyBcnvUXW72tjfUcN2A71F1u9rY31HDdgU21aV6W4FjeZxPxAatK9LcCxvM4n4gMsgXJ71F1u9rY31HDdgO9Rdbva2N9Rw3YFNtWleluBY3mcT8QGrSvS3AsbzOJ+IDLIFye9Rdbva2N9Rw3YDvUXW72tjfUcN2BTbVpXpbgWN5nE/EBq0r0twLG8zifiAyyBcnvUXW72tjfUcN2A71F1u9rY31HDdgU21aV6W4FjeZxPxAatK9LcCxvM4n4gMsgXJ71F1u9rY31HDdgO9Rdbva2N9Rw3YFNtWleluBY3mcT8QGrSvS3AsbzOJ+IDLIFye9Rdbva2N9Rw3YDvUXW72tjfUcN2BTbVpXpbgWN5nE/EBq0r0twLG8zifiAyyBcnvUXW72tjfUcN2A71F1u9rY31HDdgU21aV6W4FjeZxPxAatK9LcCxvM4n4gMsgXJ71F1u9rY31HDdgO9Rdbva2N9Rw3YFNtWleluBY3mcT8QGrSvS3AsbzOJ+IDLIFye9Rdbva2N9Rw3YDvUXW72tjfUcN2BTbVpXpbgWN5nE/EBq0r0twLG8zifiAyyBcnvUXW72tjfUcN2A71F1u9rY31HDdgU21aV6W4FjeZxPxAatK9LcCxvM4n4gMsgXJ71F1u9rY31HDdgO9Rdbva2N9Rw3YFNtWleluBY3mcT8QGrSvS3AsbzOJ+IDLIFye9Rdbva2N9Rw3YDvUXW72tjfUcN2BTbVpXpbgWN5nE/EBq0r0twLG8zifiAyyBcnvUXW72tjfUcN2A71F1u9rY31HDdgU21aV6W4FjeZxPxAatK9LcCxvM4n4gMsgXJ71F1u9rY31HDdgO9Rdbva2N9Rw3YFNtWleluBY3mcT8QGrSvS3AsbzOJ+IDLIFye9Rdbva2N9Rw3YDvUXW72tjfUcN2BTbVpXpbgWN5nE/EBq0r0twLG8zifiAyyBcnvUXW72tjfUcN2A71F1u9rY31HDdgU21aV6W4FjeZxPxAatK9LcCxvM4n4gMsgXJ71F1u9rY31HDdgO9Rdbva2N9Rw3YFNtWleluBY3mcT8QGrSvS3AsbzOJ+IDLIFye9Rdbva2N9Rw3YDvUXW72tjfUcN2BTbVpXpbgWN5nE/EBq0r0twLG8zifiAyyBcnvUXW72tjfUcN2A71F1u9rY31HDdgU21aV6W4FjeZxPxAatK9LcCxvM4n4gMsgX1gISFgIFiBgYZmFhIZtLTDDLZIbaQkqJSlJYkpIiIiIsREQoVnjGvbJ+LbHSYkNWleluBY3mcT8QNQ303nz+9i1MNaK0UJLIWLhoJEEhEA2tDZoStayMyWtZ4VXFbNKEWITGLTB//9k=',
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
    if (path === '/manifest.json') {
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

    // ── donway_og.jpg / OG 이미지 CORS 허용 ──
    if (path === '/donway_og.jpg' || path === '/donway_og.png') {
      const resp = await fetchAsset(path, request);
      const h = new Headers(resp.headers);
      h.set('Content-Type', path.endsWith('.png') ? 'image/png' : 'image/jpeg');
      h.set('Cache-Control', 'public, max-age=86400');
      h.set('Access-Control-Allow-Origin', '*');
      return new Response(resp.body, { status: resp.status, headers: h });
    }

    // 정적 파일 서빙 + 보안 헤더 적용
    const assetResp = await fetchAsset(url.pathname, request);
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
    return addSecurityHeaders(assetResp);
  },

  // Cloudflare Cron Trigger — 매일 01:00 UTC (한국 10:00 KST)
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      runExpireJob(env).catch(e => console.error('[cron-expire]', e.message))
    );
  }
};
