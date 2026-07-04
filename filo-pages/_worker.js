// filo-pages slim worker — KV direct serve
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    const KV = env.DONWAY_ASSETS;
    if (!KV) return new Response('KV not bound', { status: 500 });

    // 경로별 파일 매핑
    const fileMap = {
      '/': 'filo_landing.html',
      '': 'filo_landing.html',
      '/app': 'filo.html',
      '/app.html': 'filo.html',
      '/register': 'register.html',
      '/register.html': 'register.html',
    };

    const fileName = fileMap[path] || 'filo.html';
    const buf = await KV.get(fileName, 'arrayBuffer');
    if (!buf) return new Response('Not found: ' + fileName, { status: 404 });

    return new Response(buf, {
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
    });
  }
};
