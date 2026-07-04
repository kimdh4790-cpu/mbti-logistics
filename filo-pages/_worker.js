// filo-pages proxy worker
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // filo.ai.kr → mbti-logistics worker로 프록시
    const target = new URL(request.url);
    target.hostname = 'mbti-logistics.kimdh4790.workers.dev';
    const newReq = new Request(target.toString(), {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: 'follow'
    });
    return fetch(newReq);
  }
};
