export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      headers: {'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}
    });
  } catch(e) {
    return new Response(JSON.stringify({error:e.message}), {
      status:500,
      headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}
    });
  }
}
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
