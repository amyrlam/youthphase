/* Vercel serverless function backing the /contact form. Lives outside
   src/ on purpose: the Astro build stays fully static, and Vercel picks
   up /api/*.js as functions alongside it (no adapter needed).

   Env vars (Vercel → Project → Settings → Environment Variables):
     RESEND_API_KEY    — from resend.com (free tier: 3,000 emails/mo)
     CONTACT_TO_EMAIL  — where messages are delivered

   The visitor's address goes in reply_to, so replying in the inbox just
   works. The sender stays onboarding@resend.dev (Resend's shared sender,
   fine without a custom domain). Neither env value ever reaches the
   client — that's the whole reason this is a form and not a mailto. */

const MAX = { name: 200, email: 254, message: 5000 };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const { name = '', email = '', message = '', website = '' } = req.body ?? {};

  // Honeypot: the "website" field is visually hidden and labeled to be
  // ignored; bots fill it anyway. Report success so they move on.
  if (website) return res.status(200).json({ ok: true });

  const clean = {
    name: String(name).trim().slice(0, MAX.name),
    email: String(email).trim().slice(0, MAX.email),
    message: String(message).trim().slice(0, MAX.message),
  };
  if (!clean.name || !clean.message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean.email)) {
    return res.status(400).json({ error: 'missing or invalid fields' });
  }

  const key = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  if (!key || !to) {
    return res.status(500).json({ error: 'form not configured' });
  }

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'youthphase.dev <onboarding@resend.dev>',
      to: [to],
      reply_to: clean.email,
      subject: `youthphase.dev — message from ${clean.name}`,
      text: `${clean.message}\n\n—\n${clean.name}\n${clean.email}`,
    }),
  });

  if (!r.ok) {
    return res.status(502).json({ error: 'delivery failed' });
  }
  return res.status(200).json({ ok: true });
}
