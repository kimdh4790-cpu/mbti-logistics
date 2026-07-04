// filo-pages — KV 직접 서빙 worker
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const KV = env.DONWAY_ASSETS;

    async function serveKV(key, ct) {
      const val = await KV.get(key, 'arrayBuffer');
      if (!val) return new Response(key + ' not found', { status: 404 });
      return new Response(val, { headers: { 'Content-Type': ct + '; charset=utf-8', 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' } });
    }

    // filo.ai.kr 라우팅
    if (path === '/' || path === '') return serveKV('filo_landing.html', 'text/html');
    if (path === '/app' || path === '/app.html') return serveKV('filo.html', 'text/html');
    if (path === '/inventory') return serveKV('inventory.html', 'text/html');
    if (path === '/qr' || path === '/qrpos') return serveKV('qrpos.html', 'text/html');
    if (path === '/kiosk') return serveKV('kiosk.html', 'text/html');
    if (path === '/universal') return serveKV('universal_settle.html', 'text/html');
    if (path === '/register') return serveKV('register.html', 'text/html');
    if (path === '/admin-sub') return serveKV('admin_sub.html', 'text/html');

    // API는 메인 worker로 프록시
    if (path.startsWith('/api/') || path.startsWith('/fcm/') || path.startsWith('/stmt')) {
      const target = new URL(request.url);
      target.hostname = 'mbti-logistics.kimdh4790.workers.dev';
      const newHeaders = new Headers(request.headers);
      newHeaders.set('X-Original-Host', 'filo.ai.kr');
      return fetch(new Request(target.toString(), { method: request.method, headers: newHeaders, body: request.body }));
    }

    if (path === '/filo-manifest.json') return serveKV('filo-manifest.json', 'application/manifest+json');
    if (path === '/firebase-app-compat.js' || path === '/firebase-firestore-compat.js' || path === '/firebase-auth-compat.js') {
      // Firebase CDN으로 리다이렉트
      const cdnBase = 'https://www.gstatic.com/firebasejs/10.12.2';
      return Response.redirect(cdnBase + path, 302);
    }
    return new Response('Not found', { status: 404 });
  }
};
