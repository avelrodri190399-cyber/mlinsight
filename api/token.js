export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

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
    headers: { 'Content-Type': 'application/json' },
  });
}
