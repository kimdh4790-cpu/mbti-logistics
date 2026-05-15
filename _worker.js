// MBTI 물류관리 Cloudflare Worker

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // ── /claude-ocr : Claude API 프록시 ──
    if (path === '/claude-ocr' && request.method === 'POST') {
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
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
      }
    }

    // ── OPTIONS (CORS preflight) ──
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }

    // ★ ── /label : 영문 라벨 출력 앱 ──
    if (path === '/label' || path === '/label/') {
      return env.ASSETS.fetch(
        new Request(new URL('/label.html', url), request)
      );
    }

    // ── 기본: ASSETS 파일 서빙 ──
    return env.ASSETS.fetch(request);
  }
};
