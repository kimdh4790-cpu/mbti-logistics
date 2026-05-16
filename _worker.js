// MBTI 물류관리 Cloudflare Worker

export default {
  // Cron trigger: daily 09:00 KST (00:00 UTC)
  async scheduled(event, env, ctx) {
    ctx.waitUntil(checkExpiringSubscriptions(env));
  },

  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // ── OPTIONS ──
    if (method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }

    // ── 테스트 엔드포인트 ──
    if (path === '/worker-test') {
      return new Response(JSON.stringify({ status: 'worker OK', path, method }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // ── /label-ocr ──
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

    // ── /claude-ocr ──
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

    // ── /label ──
    if (path === '/label' || path === '/label/') {
      const req = new Request(new URL('/label.html', url).toString(), {
        method: 'GET',
        headers: request.headers
      });
      const resp = await env.ASSETS.fetch(req);
      return new Response(resp.body, {
        status: resp.status,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    // ── 기본: ASSETS ──
    return env.ASSETS.fetch(request);
  }
};

// ════════════════════════════════════════════════════════════════
// Scheduled: check expiring subscriptions and send Kakao alerts
// ════════════════════════════════════════════════════════════════

async function checkExpiringSubscriptions(env) {
  try {
    const token       = await getFirebaseToken(env.FIREBASE_SERVICE_ACCOUNT);
    const projectId   = 'mbti-logistics-bfcd3';
    const firestoreBase = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

    // Query all active subscriptions
    const queryRes = await fetch(`${firestoreBase}:runQuery`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'subscriptions' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'status' },
              op: 'EQUAL',
              value: { stringValue: 'active' }
            }
          }
        }
      })
    });

    const docs = await queryRes.json();

    const now        = new Date();
    const in3days    = new Date(now.getTime() + 3 * 86400000);
    const in1day     = new Date(now.getTime() + 1 * 86400000);
    const yesterday  = new Date(now.getTime() - 86400000);

    for (const item of docs) {
      const doc = item.document;
      if (!doc) continue;

      const fields     = doc.fields;
      const dealerId   = doc.name.split('/').pop();
      const expireDate = new Date(fields.expireDate?.timestampValue);
      const plan       = fields.plan?.stringValue || 'basic';

      // Get dealer info for phone number
      const dealerRes = await fetch(`${firestoreBase}/dealers/${dealerId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dealerDoc = await dealerRes.json();
      if (!dealerDoc.fields) continue;

      const phone       = dealerDoc.fields.phone?.stringValue || '';
      const companyName = dealerDoc.fields.name?.stringValue || '';
      const renewUrl    = 'https://mbti-logistics.kimdh4790.workers.dev/subscribe';

      if (!phone) continue;

      const diffDays = Math.ceil((expireDate - now) / 86400000);

      // 3 days before expiry
      if (diffDays === 3) {
        await sendKakaoAlimtalk(env, phone, {
          type: 'expire_warning',
          companyName,
          expireDate: expireDate.toLocaleDateString('ko-KR'),
          renewUrl,
          daysLeft: '3'
        });
      }

      // 1 day before expiry
      if (diffDays === 1) {
        await sendKakaoAlimtalk(env, phone, {
          type: 'expire_warning',
          companyName,
          expireDate: expireDate.toLocaleDateString('ko-KR'),
          renewUrl,
          daysLeft: '1'
        });
      }

      // Expired yesterday -> update status to expired
      if (diffDays < 0 && diffDays >= -1) {
        await fetch(`${firestoreBase}/subscriptions/${dealerId}?updateMask.fieldPaths=status`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: { status: { stringValue: 'expired' } }
          })
        });

        await sendKakaoAlimtalk(env, phone, {
          type: 'expired',
          companyName,
          renewUrl
        });
      }
    }
  } catch (e) {
    console.error('checkExpiringSubscriptions error:', e);
  }
}
