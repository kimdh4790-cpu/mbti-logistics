// filo-pages proxy worker — hostname 유지
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // workers.dev로 프록시하되 원본 hostname 헤더 유지
    const target = new URL(request.url);
    target.hostname = 'mbti-logistics.kimdh4790.workers.dev';
    const newHeaders = new Headers(request.headers);
    newHeaders.set('X-Forwarded-Host', url.hostname);
    newHeaders.set('CF-Original-Host', url.hostname);
    const newReq = new Request(target.toString(), {
      method: request.method,
      headers: newHeaders,
      body: request.body,
      redirect: 'follow'
    });
    return fetch(newReq);
  }
};
