// Proxy worker for mbtico.kr/api/seolyuhana/* → main mbti-logistics worker
// Forwards the original hostname via x-mbtico-host so main worker routes correctly.
// Also injects ANTHROPIC_API_KEY from this worker's own secrets as x-sly-ak header
// so the main worker can use it for Claude API calls (main worker's own key is a fallback).
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const originalHostname = url.hostname; // e.g. mbtico.kr
    url.hostname = 'filo.ai.kr';

    const newHeaders = new Headers(request.headers);
    newHeaders.set('x-mbtico-host', originalHostname);
    // Pass seolyuhana's own Anthropic API key to the main worker
    if (env.ANTHROPIC_API_KEY) {
      newHeaders.set('x-sly-ak', env.ANTHROPIC_API_KEY);
    }

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
