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
                <div style="margin-bottom:10px"><span style="color:#64748b;font-size:13px">접속 URL</span><br>
                  <a href="${loginUrl}" style="color:#0066ff;font-weight:700">${loginUrl}</a>
                </div>
                <div style="margin-bottom:10px"><span style="color:#64748b;font-size:13px">이메일</span><br>
                  <strong>${email}</strong>
                </div>
                <div><span style="color:#64748b;font-size:13px">임시 비밀번호</span><br>
                  <strong style="font-size:20px;letter-spacing:2px;color:#0f172a">${tempPassword}</strong>
                </div>
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


    // favicon 404/500 방지
    if (path === '/favicon.ico' || path === '/favicon.png') {
      return new Response('', { status: 204 });
    }

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

        // 6. 임시 비밀번호 생성 & Firestore에 저장
        const tempPassword = generateTempPassword();
        const email = fields.email?.stringValue || '';
        const companyName = fields.companyName?.stringValue || '고객사';
        const slug = fields.slug?.stringValue || '';

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

        // 7. 환영 이메일 발송
        const PLAN_LABELS = { contract:'위수탁 계약서', roster:'근무표 관리', qr:'QR 출퇴근', full:'풀패키지', settle:'AI 정산' };
        const loginUrl = getPlanUrl(planType, slug);
        const emailResult = await sendWelcomeEmail(env, {
          email, companyName, tempPassword, planType, loginUrl,
          planLabel: PLAN_LABELS[planType] || planType
        });

        return new Response(JSON.stringify({
          success: true,
          message: '결제 완료! 기능이 즉시 활성화됐습니다.',
          planType, dealerId, tempPassword,
          emailSent: emailResult.sent,
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
