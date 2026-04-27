export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { code, redirect_uri, code_verifier } = req.body;
  if (!code) return res.status(400).json({ error: 'Missing code' });

  try {
    const params = {
      grant_type: 'authorization_code',
      client_id: '7038339915938205',
      client_secret: 'ORq7EerxNwhR0txC1hZkL4pbjmzGcbQLt',
      code: code,
      redirect_uri: redirect_uri
    };
    if (code_verifier) params.code_verifier = code_verifier;

    const response = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params)
    });
    const data = await response.json();
    if (data.access_token) {
      res.status(200).json(data);
    } else {
      res.status(400).json(data);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
