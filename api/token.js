export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { code, redirect_uri } = req.body;
  if (!code) return res.status(400).json({ error: 'Missing code' });

  const CLIENT_ID = '7038339915938205';
  const CLIENT_SECRET = 'ORq7EerxNwhR0txC1hZkL4pbjmzGcbQLt';

  try {
    const response = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code: code,
        redirect_uri: redirect_uri
      })
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
