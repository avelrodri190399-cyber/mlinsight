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

  // ── HUGGING FACE IMAGE GENERATION (gratis) ─────────────────────
  if (action === 'img') {
    const HF_KEY = process.env.HF_API_KEY;
    if (!HF_KEY) {
      return new Response(JSON.stringify({ error: 'HF_API_KEY not configured in Vercel' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    const body = await req.json();
    const prompt = body.prompt || 'product photo white background';

    // Usar SDXL-Turbo — rápido y gratis en HF
    const imgRes = await fetch(
      'https://api-inference.huggingface.co/models/stabilityai/sdxl-turbo',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            negative_prompt: 'watermark, text, logo, blurry, dark background, shadow, person, hand, nsfw',
            num_inference_steps: 4,
            guidance_scale: 0,
          }
        }),
      }
    );

    // HF devuelve la imagen como blob binario
    if (!imgRes.ok) {
      const errText = await imgRes.text();
      return new Response(errText, {
        status: imgRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const imgBlob = await imgRes.arrayBuffer();
    return new Response(imgBlob, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'image/png',
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
