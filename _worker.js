// MBTI Logistics + LogiNet — Cloudflare Worker

export default {
  async fetch(request, env) {
    const url    = new URL(request.url);
    const path   = url.pathname;
    const method = request.method;

    // ── OPTIONS ──────────────────────────────────────────────────
    if (method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }

    // ── /worker-test ─────────────────────────────────────────────
    if (path === '/worker-test') {
      return new Response(JSON.stringify({ status: 'worker OK', path, method }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // ── /label-ocr ───────────────────────────────────────────────
    if (path === '/label-ocr') {
      if (method !== 'POST') {
        return new Response(JSON.stringify({ status: 'label-ocr ready', method: 'POST required' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      try {
        const body = await request.json();
        const resp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify(body)
        });
        const data = await resp.json();
        return new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    // ── /claude-ocr ──────────────────────────────────────────────
    if (path === '/claude-ocr' && method === 'POST') {
      try {
        const body = await request.json();
        const resp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify(body)
        });
        const data = await resp.json();
        return new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    // ── /label ───────────────────────────────────────────────────
    if (path === '/label' || path === '/label/') {
      const req  = new Request(new URL('/label.html', url).toString(), { method: 'GET', headers: request.headers });
      const resp = await env.ASSETS.fetch(req);
      return new Response(resp.body, {
        status: resp.status,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    // ── /settle ──────────────────────────────────────────────────
    if (path === '/settle' || path === '/settle/') {
      const req  = new Request(new URL('/settle.html', url).toString(), { method: 'GET', headers: request.headers });
      const resp = await env.ASSETS.fetch(req);
      return new Response(resp.body, {
        status: resp.status,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    // ── /subscribe ───────────────────────────────────────────────
    if (path === '/subscribe' || path === '/subscribe/') {
      const req  = new Request(new URL('/subscribe.html', url).toString(), { method: 'GET', headers: request.headers });
      const resp = await env.ASSETS.fetch(req);
      return new Response(resp.body, {
        status: resp.status,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    // ── /subscribe/success ───────────────────────────────────────
    if (path === '/subscribe/success') {
      const req  = new Request(new URL('/subscribe-success.html', url).toString(), { method: 'GET', headers: request.headers });
      const resp = await env.ASSETS.fetch(req);
      return new Response(resp.body, {
        status: resp.status,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    // ── /toss-confirm ────────────────────────────────────────────
    if (path === '/toss-confirm' && method === 'POST') {
      return handleTossConfirm(request, env);
    }

    // ── default: ASSETS ──────────────────────────────────────────
    return env.ASSETS.fetch(request);
  }
};

// ════════════════════════════════════════════════════════════════
// Toss payment confirm + Firestore subscription update
// Env vars required:
//   TOSS_SECRET_KEY          : Toss Payments secret key
//   FIREBASE_SERVICE_ACCOUNT : Firebase service account JSON string
//   KAKAO_ACCESS_TOKEN       : Kakao API access token
// ════════════════════════════════════════════════════════════════

async function handleTossConfirm(request, env) {
  const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  try {
    const { paymentKey, orderId, amount } = await request.json();
    if (!paymentKey || !orderId || !amount) {
      return new Response(JSON.stringify({ success: false, message: 'Missing parameters' }), { status: 400, headers: CORS });
    }

    // 1. Confirm payment with Toss API
    const tossRes  = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(env.TOSS_SECRET_KEY + ':'),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ paymentKey, orderId, amount })
    });
    const tossData = await tossRes.json();
    if (tossData.status !== 'DONE') {
      return new Response(JSON.stringify({ success: false, message: tossData.message || 'Payment failed' }), { status: 400, headers: CORS });
    }

    // 2. Parse orderId: LN-{uid8}-{timestamp}-{plan}
    const parts    = orderId.split('-');
    const plan     = parts[parts.length - 1];
    const uid8     = parts[1];

    // 3. Get Firebase access token
    const token      = await getFirebaseToken(env.FIREBASE_SERVICE_ACCOUNT);
    const projectId  = 'mbti-logistics-bfcd3';
    const firestoreBase = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

    // 4. Find dealer by uid prefix
    const queryRes = await fetch(`${firestoreBase}:runQuery`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'dealers' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'dealerId' },
              op: 'GREATER_THAN_OR_EQUAL',
              value: { stringValue: uid8 }
            }
          },
          limit: 1
        }
      })
    });
    const queryData  = await queryRes.json();
    const dealerDoc  = queryData[0]?.document;
    if (!dealerDoc) {
      return new Response(JSON.stringify({ success: false, message: 'Dealer not found' }), { status: 404, headers: CORS });
    }
    const dealerId   = dealerDoc.fields.dealerId.stringValue;
    const company    = dealerDoc.fields.name?.stringValue || '';
    const phone      = dealerDoc.fields.phone?.stringValue || '';

    // 5. Write subscription to Firestore
    const now        = new Date();
    const trialEnd   = new Date(now.getTime() + 30 * 86400000);
    const expireDate = new Date(now.getTime() + 60 * 86400000);

    await fetch(`${firestoreBase}/subscriptions/${dealerId}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          status:       { stringValue: 'active' },
          plan:         { stringValue: plan },
          amount:       { integerValue: String(amount) },
          orderId:      { stringValue: orderId },
          paymentKey:   { stringValue: paymentKey },
          startDate:    { timestampValue: now.toISOString() },
          trialEndDate: { timestampValue: trialEnd.toISOString() },
          expireDate:   { timestampValue: expireDate.toISOString() },
          updatedAt:    { timestampValue: now.toISOString() }
        }
      })
    });

    // 6. Send Kakao Alimtalk
    if (phone) {
      await sendKakaoAlimtalk(env, phone, {
        type: 'subscribe_success',
        companyName: company,
        plan,
        trialEnd: trialEnd.toLocaleDateString('ko-KR'),
        amount: Number(amount).toLocaleString()
      });
    }

    return new Response(JSON.stringify({ success: true, dealerId, plan }), { headers: CORS });

  } catch (e) {
    return new Response(JSON.stringify({ success: false, message: e.message }), { status: 500, headers: CORS });
  }
}

// ── Firebase service account JWT → access token ──────────────────
async function getFirebaseToken(serviceAccountJSON) {
  const sa  = JSON.parse(serviceAccountJSON);
  const now = Math.floor(Date.now() / 1000);
  const enc = s => btoa(JSON.stringify(s)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');

  const header  = enc({ alg: 'RS256', typ: 'JWT' });
  const payload = enc({
    iss: sa.client_email,
    sub: sa.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/datastore'
  });

  const pemBin = (() => {
    const b64 = sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
    const bin = atob(b64);
    return Uint8Array.from(bin, c => c.charCodeAt(0)).buffer;
  })();

  const key = await crypto.subtle.importKey(
    'pkcs8', pemBin,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  );
  const sigBuf = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${payload}`));
  const sig    = btoa(String.fromCharCode(...new Uint8Array(sigBuf))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');

  const res  = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${header}.${payload}.${sig}`
  });
  const { access_token } = await res.json();
  return access_token;
}

// ── Kakao Alimtalk ───────────────────────────────────────────────
// Env vars: KAKAO_ACCESS_TOKEN
async function sendKakaoAlimtalk(env, phone, data) {
  const messages = {
    subscribe_success: `[LogiNet] Subscription confirmed\n\n${data.companyName}\nPlan: ${data.plan.toUpperCase()}\nFree trial ends: ${data.trialEnd}\nMonthly fee: ${data.amount}KRW\n\nhttps://mbti-logistics.kimdh4790.workers.dev/settle`,
    expire_warning:    `[LogiNet] Subscription expiring soon\n\n${data.companyName}\nExpires: ${data.expireDate}\nRenew: ${data.renewUrl}`
  };
  const msg = messages[data.type];
  if (!msg || !env.KAKAO_ACCESS_TOKEN) return;

  await fetch('https://kapi.kakao.com/v1/api/talk/memo/default/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.KAKAO_ACCESS_TOKEN}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      template_object: JSON.stringify({
        object_type: 'text',
        text: msg,
        link: { mobile_web_url: 'https://mbti-logistics.kimdh4790.workers.dev/settle' }
      })
    })
  });
}
