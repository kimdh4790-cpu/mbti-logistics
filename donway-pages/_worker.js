// donway-pages slim worker - 메인 Worker로 전달
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const hostname = url.hostname;

    // donway.ai.kr → 메인 Worker로 프록시
    const target = new URL(request.url);
    target.hostname = 'mbti-logistics.kimdh4790.workers.dev';

    const proxyReq = new Request(target.toString(), {
      method: request.method,
      headers: request.headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
      redirect: 'follow'
    });

    try {
      const resp = await fetch(proxyReq);
      return resp;
    } catch(e) {
      return new Response('Service unavailable', { status: 503 });
    }
  }
};
