// Proxy worker for mbtico.kr/api/seolyuhana/* → main mbti-logistics worker
// Forwards the original hostname via x-mbtico-host so main worker routes correctly.
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const originalHostname = url.hostname; // e.g. mbtico.kr
    url.hostname = 'mbti-logistics.kimdh4790.workers.dev';

    const newHeaders = new Headers(request.headers);
    newHeaders.set('x-mbtico-host', originalHostname);

    try {
      return await fetch(new Request(url.toString(), {
        method: request.method,
        headers: newHeaders,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
        redirect: 'follow'
      }));
    } catch (e) {
      return new Response('Service unavailable', { status: 503 });
    }
  }
};
