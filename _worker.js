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
    if ((path === '/' || path === '' || path === '/donway_landing' || path === '/donway_landing/') && !hostname.includes('workers.dev')) {
      const landingUrl = new URL('/donway_landing.html', url);
      const landingResp = await env.ASSETS.fetch(new Request(landingUrl.toString(), request));
      const landingHeaders = new Headers(landingResp.headers);
      Object.entries(SECURITY_HEADERS).forEach(([k,v]) => landingHeaders.set(k,v));
      return new Response(landingResp.body, {
        status: landingResp.status,
        headers: landingHeaders
      });
    }


    // API 키 테스트 엔드포인트
    if (path === '/test-apikey') {
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
          'Access-Control-Allow-Headers': 'Content-Type'
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
      const resp = await env.ASSETS.fetch(req);
      const html = await resp.text();
      const key  = (env.ANTHROPIC_API_KEY || env.CLAUDE_API_KEY || '').trim().replace(/[\r\n\s]+/g, '');
      const injected = html.replace('<head>', '<head><script>window.__AK=' + JSON.stringify(key) + ';</script>');
      return new Response(injected, { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }


    // ── 회사별 전용 URL (/{slug}) ──
    // 예: /mbti → 엠비티아이 전용, /abc물류 → ABC물류 전용
    const knownPaths = new Set([
      '/donway_landing','/test-apikey','/favicon.ico','/favicon.png',
      '/worker-test','/label-ocr','/claude-ocr','/get-label-key',
      '/test-inject','/truck-save','/scan-save',
      '/scan','/settle','/portal','/join','/company-register',
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
        const req = new Request(new URL('/settle.html', url).toString(), { method:'GET', headers:request.headers });
        const resp = await env.ASSETS.fetch(req);
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
      const req  = new Request(new URL('/settle.html', url).toString(), { method: 'GET', headers: request.headers });
      const resp = await env.ASSETS.fetch(req);
      return new Response(resp.body, { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }


    // ── Phase 2: 신규 라우트 ──────────────────────────────────────────────

    // 기사 배송앱

    // 통합 포털
    if (path === '/portal' || path === '/portal/') {
      const resp = await env.ASSETS.fetch(new Request(new URL('/portal.html', url)));
      return new Response(await resp.text(), { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    // 기사 자체 가입
    if (path === '/join' || path === '/join/') {
      const resp = await env.ASSETS.fetch(new Request(new URL('/join.html', url)));
      return new Response(await resp.text(), { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    // 회사 신규 등록
    if (path === '/company-register' || path === '/company-register/') {
      const resp = await env.ASSETS.fetch(new Request(new URL('/company-register.html', url)));
      return new Response(await resp.text(), { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    // ★ DONWAY 출퇴근 QR (모든 업종 공통)
    if (path === '/attendance' || path === '/attendance/') {
      const resp = await env.ASSETS.fetch(new Request(new URL('/attendance.html', url)));
      return new Response(await resp.text(), { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    // ★ DONWAY 사운드 모듈
    if (path === '/donway-sound.js') {
      const resp = await env.ASSETS.fetch(new Request(new URL('/donway-sound.js', url)));
      return new Response(await resp.text(), { status: resp.status, headers: { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } });
    }

    // ★ 정산 분석 리포트
    if (path === '/report' || path === '/report/') {
      const resp = await env.ASSETS.fetch(new Request(new URL('/report.html', url)));
      return new Response(await resp.text(), { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    // ★ 근로계약서
    if (path === '/contract' || path === '/contract/') {
      const resp = await env.ASSETS.fetch(new Request(new URL('/contract.html', url)));
      return new Response(await resp.text(), { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    // ★ 공지·알림
    if (path === '/notice' || path === '/notice/') {
      const resp = await env.ASSETS.fetch(new Request(new URL('/notice.html', url)));
      return new Response(await resp.text(), { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    // ★ 시스템 설정
    if (path === '/settings' || path === '/settings/') {
      const resp = await env.ASSETS.fetch(new Request(new URL('/settings.html', url)));
      return new Response(await resp.text(), { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    // ★ 근무 스케줄러
    if (path === '/schedule' || path === '/schedule/') {
      const resp = await env.ASSETS.fetch(new Request(new URL('/schedule.html', url)));
      return new Response(await resp.text(), { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    // ★ 직원 관리
    if (path === '/drivers' || path === '/drivers/') {
      const resp = await env.ASSETS.fetch(new Request(new URL('/drivers.html', url)));
      return new Response(await resp.text(), { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    // ★ 관리자 종합 대시보드
    if (path === '/admin' || path === '/admin/') {
      // 슈퍼어드민 접근 로그 기록 (선택적)
      const resp = await env.ASSETS.fetch(new Request(new URL('/admin.html', url)));
      return new Response(await resp.text(), { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' } });
    }

    if (path === '/dashboard' || path === '/dashboard/') {
      const resp = await env.ASSETS.fetch(new Request(new URL('/dashboard.html', url)));
      return new Response(await resp.text(), { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    // ★ 직원 마이페이지
    if (path === '/my' || path === '/my/') {
      const resp = await env.ASSETS.fetch(new Request(new URL('/my.html', url)));
      return new Response(await resp.text(), { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    // ★ 출퇴근 관리자 대시보드
    if (path === '/attendance-admin' || path === '/attendance-admin/') {
      const resp = await env.ASSETS.fetch(new Request(new URL('/attendance-admin.html', url)));
      return new Response(await resp.text(), { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    // ★ 매장/회사 QR 디스플레이 (입구 화면)
    if (path === '/attendance-display' || path === '/attendance-display/') {
      const resp = await env.ASSETS.fetch(new Request(new URL('/attendance-display.html', url)));
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
      const icons = {
        '/icon-192.png': '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',
        '/icon-512.png': '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',
        '/apple-touch-icon.png': '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',
      };
      const b64 = icons[path];
      if (b64) {
        const binary = atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return new Response(bytes.buffer, {
          status: 200,
          headers: {
            'Content-Type': path.endsWith('.ico') ? 'image/x-icon' : 'image/png',
            'Cache-Control': 'public, max-age=86400'
          }
        });
      }
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
      }), { status:200, headers:{'Content-Type':'application/manifest+json','Cache-Control':'no-cache'} });
    }

    // 정적 파일 서빙 + 보안 헤더 적용
    const assetResp = await env.ASSETS.fetch(request);
    return addSecurityHeaders(assetResp);
  },

  // Cloudflare Cron Trigger — 매일 01:00 UTC (한국 10:00 KST)
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      runExpireJob(env).catch(e => console.error('[cron-expire]', e.message))
    );
  }
};
