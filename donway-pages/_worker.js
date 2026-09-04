// slim proxy worker
export default {
  async fetch(request, env, ctx) {
    const hostname = new URL(request.url).hostname;

    // yongcha.app: fetch yongcha.html directly from GitHub Raw
    if (hostname === 'yongcha.app' || hostname === 'www.yongcha.app') {
      const path = new URL(request.url).pathname;

      if (path === '/api/kakao-config') {
        return new Response(JSON.stringify({ key: env.KAKAO_JS_KEY || '' }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'https://yongcha.app' }
        });
      }
      if (path === '/api/ctrl-notify' && request.method === 'POST') {
        return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
      }
      if (path === '/api/yongcha-distance') {
        const u = new URL(request.url);
        const lat1 = parseFloat(u.searchParams.get('lat1') || '0');
        const lng1 = parseFloat(u.searchParams.get('lng1') || '0');
        const lat2 = parseFloat(u.searchParams.get('lat2') || '0');
        const lng2 = parseFloat(u.searchParams.get('lng2') || '0');
        if (!lat1 || !lng1 || !lat2 || !lng2) {
          return new Response(JSON.stringify({ error: 'missing coordinates' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'https://yongcha.app' }
          });
        }
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
        const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return new Response(JSON.stringify({ distanceKm: Math.round(dist * 10) / 10 }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'https://yongcha.app' }
        });
      }

      try {
        const res = await fetch(
          'https://raw.githubusercontent.com/kimdh4790-cpu/mbti-logistics/main/yongcha.html',
          { cf: { cacheEverything: false, cacheTtl: 0 } }
        );
        return new Response(res.body, {
          headers: { 'Content-Type': 'text/html;charset=utf-8', 'Cache-Control': 'no-store, no-cache, must-revalidate' }
        });
      } catch (e) {
        return new Response('Service unavailable', { status: 503 });
      }
    }

    // All other domains → proxy to main worker
    const target = new URL(request.url);
    target.hostname = 'mbti-logistics.kimdh4790.workers.dev';
    try {
      return await fetch(new Request(target.toString(), {
        method: request.method, headers: request.headers,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
        redirect: 'follow'
      }));
    } catch(e) { return new Response('Service unavailable', {status:503}); }
  }
};
