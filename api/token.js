export const config = { runtime: 'edge' };

export default async function handler(req) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-ml-token, x-ml-method, x-action',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.searchParams.get('path');
  const mlMethod = url.searchParams.get('method') || 'GET';
  const action = url.searchParams.get('action');

  // ── ANTHROPIC AI PROXY ─────────────────────────────────────────
  if (action === 'ai') {
    const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
    if (!ANTHROPIC_KEY) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500, headers: corsHeaders
      });
    }
    const body = await req.json();
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });
    const data = await aiRes.json();
    return new Response(JSON.stringify(data), {
      status: aiRes.status,
      headers: corsHeaders,
    });
  }

  // ── ML API PROXY ───────────────────────────────────────────────
  if (path) {
    const token = req.headers.get('x-ml-token');
    let body = undefined;
    if (mlMethod === 'PUT') body = await req.text();
    const mlRes = await fetch('https://api.mercadolibre.com' + path, {
      method: mlMethod,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body,
    });
    const text = await mlRes.text();
    let data = {};
    try { data = JSON.parse(text); } catch(e) { data = { raw: text }; }
    return new Response(JSON.stringify(data), {
      status: mlRes.status,
      headers: corsHeaders,
    });
  }

  // ── TOKEN EXCHANGE ─────────────────────────────────────────────
  const { code, redirect_uri, code_verifier } = await req.json();
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: '7038339915938205',
    client_secret: 'Rq7EerxNwhR0txC1hZkL4pbjmzGcbQLt',
    code,
    redirect_uri,
  });
  if (code_verifier) params.append('code_verifier', code_verifier);

  const response = await fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });
  const data = await response.json();
  return new Response(JSON.stringify(data), {
    status: data.access_token ? 200 : 400,
    headers: corsHeaders,
  });
}
