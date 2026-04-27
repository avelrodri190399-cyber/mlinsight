export const config = { runtime: 'edge' };

export default async function handler(req) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-ml-token',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.searchParams.get('path');
  const mlMethod = url.searchParams.get('method') || 'GET';
  const action = url.searchParams.get('action');

  // ── HUGGING FACE IMAGE GENERATION ─────────────────────────────
  if (action === 'img') {
    const HF_KEY = process.env.HF_API_KEY;
    if (!HF_KEY) {
      return new Response('HF_API_KEY not configured', {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      });
    }

    const body = await req.json();
    const prompt = body.prompt || 'product photo white background';

    // Usar flux-schnell — público, sin restricciones, muy buena calidad
    const imgRes = await fetch(
      'https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_KEY}`,
          'Content-Type': 'application/json',
          'x-wait-for-model': 'true',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            num_inference_steps: 4,
            width: 512,
            height: 512,
          }
        }),
      }
    );

    if (!imgRes.ok) {
      const errText = await imgRes.text();
      return new Response(errText, {
        status: imgRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      });
    }

    const imgBuffer = await imgRes.arrayBuffer();
    return new Response(imgBuffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'image/jpeg',
      },
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
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
