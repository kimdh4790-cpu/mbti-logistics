// slim proxy worker
export default {
  async fetch(request, env, ctx) {
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
