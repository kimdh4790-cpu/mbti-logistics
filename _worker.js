// MBTI 물류관리 Cloudflare Worker

export default {
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

    // ── /claude-ocr : POST 요청을 ASSETS보다 먼저 가로채기 ──
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
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
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

    // ── GET /claude-ocr 테스트용 ──
    if (path === '/claude-ocr' && method === 'GET') {
      return new Response(JSON.stringify({ status: 'worker OK', path: path }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // ── 기본: ASSETS ──
    return env.ASSETS.fetch(request);
  }
};
