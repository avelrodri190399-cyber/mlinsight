export const config = { runtime: 'edge' };

export default async function handler(req) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.searchParams.get('path');

  // ML API proxy
  if (path) {
    const token = req.headers.get('x-ml-token');
    const mlRes = await fetch('https://api.mercadolibre.com' + path, {
      method: req.method === 'POST' ? 'PUT' : 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: req.method === 'POST' ? req.body : undefined,
    });
    const data = await mlRes.json();
    return new Response(JSON.stringify(data), { status: 200, headers: corsHeaders });
  }

  // Token exchange
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
