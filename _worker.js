// MBTI Logistics + LogiNet — Cloudflare Worker

export default {
  async fetch(request, env) {
    const url    = new URL(request.url);
    const path   = url.pathname;
    const method = request.method;

    if (method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }

    if (path === '/worker-test') {
      return new Response(JSON.stringify({ status: 'worker OK', path, method }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (path === '/get-label-key') {
      const apiKey = env.ANTHROPIC_API_KEY || env.CLAUDE_API_KEY || '';
      return new Response(JSON.stringify({ k: apiKey }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }
      });
    }

    if (path === '/label-ocr') {
      if (method !== 'POST') {
        return new Response(JSON.stringify({ status: 'label-ocr ready' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      try {
        const body = await request.json();
        const resp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': env.ANTHROPIC_API_KEY || env.CLAUDE_API_KEY,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify(body)
        });
        const data = await resp.json();
        return new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    if (path === '/claude-ocr' && method === 'POST') {
      try {
        const body = await request.json();
        const resp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': env.ANTHROPIC_API_KEY || env.CLAUDE_API_KEY,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify(body)
        });
        const data = await resp.json();
        return new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    if (path === '/label' || path === '/label/') {
      const req  = new Request(new URL('/label.html', url).toString(), { method: 'GET', headers: request.headers });
      const resp = await env.ASSETS.fetch(req);
      return new Response(resp.body, { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    if (path === '/settle' || path === '/settle/') {
      const req  = new Request(new URL('/settle.html', url).toString(), { method: 'GET', headers: request.headers });
      const resp = await env.ASSETS.fetch(req);
      return new Response(resp.body, { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    if (path === '/admin' || path === '/admin/') {
      const req  = new Request(new URL('/admin.html', url).toString(), { method: 'GET', headers: request.headers });
      const resp = await env.ASSETS.fetch(req);
      return new Response(resp.body, { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    if (path === '/subscribe' || path === '/subscribe/') {
      const req  = new Request(new URL('/subscribe.html', url).toString(), { method: 'GET', headers: request.headers });
      const resp = await env.ASSETS.fetch(req);
      return new Response(resp.body, { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    if (path === '/subscribe/success') {
      const req  = new Request(new URL('/subscribe-success.html', url).toString(), { method: 'GET', headers: request.headers });
      const resp = await env.ASSETS.fetch(req);
      return new Response(resp.body, { status: resp.status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    
    // 모두싸인 계약서 발송 프록시 (API 키 보호)
    if (path === '/modusign-send' && method === 'POST') {
      try {
        const body = await request.json();
        const apiKey = env.MODUSIGN_API_KEY || '';
        if(!apiKey) return new Response(JSON.stringify({error:'MODUSIGN_API_KEY 미설정'}),{status:500,headers:{'Content-Type':'application/json'}});
        const encoded = btoa(apiKey + ':');
        const resp = await fetch('https://api.modusign.co.kr/documents/request-with-template', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': 'Basic ' + encoded
          },
          body: JSON.stringify({
            templateId: body.templateId,
            document: {
              title: body.title,
              participantMappings: [{
                name: body.signerName,
                signingMethod: { type: 'EMAIL', value: body.signerEmail }
              }],
              metadatas: Object.entries(body.metadata||{}).map(([key,value])=>({key,value}))
            }
          })
        });
        const data = await resp.json();
        return new Response(JSON.stringify(data), {
          headers: {'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}
        });
      } catch(e) {
        return new Response(JSON.stringify({error:e.message}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
      }
    }

if (path === '/toss-confirm' && method === 'POST') {
      return new Response(JSON.stringify({ success: false, message: 'Coming soon' }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    if (path === '/cron-expire' && method === 'POST') {
      return new Response(JSON.stringify({ success: true, message: 'OK' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return env.ASSETS.fetch(request);
  }
};
