// Newsletter signup from the home page. Adds the email to the Many Worlds
// Beehiiv publication so visitors never leave the site.
// Needs BEEHIIV_API_KEY in the Vercel project env (Beehiiv: Settings > API).

const PUBLICATION_ID = 'pub_e502609a-3c84-4512-8399-aa2cb3a4f9ea';
const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

// Beehiiv confirmation is off, so cap signups per IP (best effort, per instance).
const LIMIT = 5;
const WINDOW_MS = 10 * 60 * 1000;
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > LIMIT;
}

function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return Object.fromEntries(new URLSearchParams(req.body)); }
  }
  return {};
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const wantsJson = (req.headers.accept || '').includes('application/json');
  const reply = (status, payload) => {
    if (wantsJson) return res.status(status).json(payload);
    // No-JS fallback: plain form post, send them back home.
    res.setHeader('Location', payload.ok ? '/?subscribed=1' : '/?subscribed=0');
    return res.status(303).end();
  };

  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  const ip = String(req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();
  if (limited(ip)) return reply(429, { ok: false, error: 'Too many requests. Try again in a few minutes.' });

  const body = readBody(req);
  // Honeypot: real visitors never fill this hidden field.
  if (body.company) return reply(200, { ok: true });

  const email = String(body.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return reply(400, { ok: false, error: 'Please enter a valid email.' });
  }

  const key = process.env.BEEHIIV_API_KEY;
  if (!key) return reply(503, { ok: false, error: 'Signup is unavailable right now.' });

  try {
    const r = await fetch(`https://api.beehiiv.com/v2/publications/${PUBLICATION_ID}/subscriptions`, {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        email,
        reactivate_existing: false, // someone who unsubscribed stays unsubscribed
        send_welcome_email: true,
        utm_source: 'manyworlds.vc',
        utm_medium: 'website',
        referring_site: 'https://manyworlds.vc/',
      }),
    });
    if (!r.ok) {
      console.error('beehiiv subscribe failed', r.status, (await r.text()).slice(0, 300));
      return reply(502, { ok: false, error: 'Something went wrong. Please try again.' });
    }
    return reply(200, { ok: true });
  } catch (err) {
    console.error('beehiiv subscribe error', err);
    return reply(502, { ok: false, error: 'Something went wrong. Please try again.' });
  }
}
