// filo-pages slim worker - 메인 Worker로 전달
export default {
  async fetch(request, env, ctx) {
    const target = new URL(request.url);
    target.hostname = 'mbti-logistics.kimdh4790.workers.dev';

    const proxyReq = new Request(target.toString(), {
      method: request.method,
      headers: request.headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
      redirect: 'follow'
    });

    try {
      return await fetch(proxyReq);
    } catch(e) {
      return new Response('Service unavailable', { status: 503 });
    }
  }
};
