// Password gate for private memo pages. The memo HTML lives in api/_memos.js
// (underscore files under api/ are neither functions nor static files), so the
// only way to read it is through this middleware. Each unlock and each later
// open is recorded with the visitor's email in the private Blob store
// "mwc-memo-views" (memo-views/<slug>/...json).
import { MEMOS, gatePage } from './api/_memos.js';

export const config = {
  matcher: ['/lightlogiq', '/lightlogiq/'],
};

// sha256 of the password; the password itself is not stored in the repo.
const PASSWORD_SHA256 = '03ba88b94c6116216919a6c96da3d610dad54324f56e1bf5cbe5dc6e75ee58df';
const ACCESS_COOKIE = 'mw_memo2';
const EMAIL_COOKIE = 'mw_email';
const TOKEN = '743ae109a8ef7ae9480ca6b3b029e28b1942e69a878de4b4';
const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function html(body, status, extra = {}) {
  return new Response(body, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'private, no-store',
      'x-robots-tag': 'noindex, nofollow',
      ...extra,
    },
  });
}

function readCookies(request) {
  const out = {};
  for (const part of (request.headers.get('cookie') || '').split(/;\s*/)) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i)] = part.slice(i + 1);
  }
  return out;
}

async function logView(request, memo, email, type) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return;
  const at = new Date().toISOString();
  const event = {
    memo,
    email,
    type,
    at,
    country: request.headers.get('x-vercel-ip-country') || '',
    city: decodeURIComponent(request.headers.get('x-vercel-ip-city') || ''),
    userAgent: request.headers.get('user-agent') || '',
  };
  const pathname = `memo-views/${memo}/${at.replace(/[:.]/g, '-')}-${type}.json`;
  try {
    const res = await fetch(`https://vercel.com/api/blob/?${new URLSearchParams({ pathname })}`, {
      method: 'PUT',
      body: JSON.stringify(event),
      headers: {
        authorization: `Bearer ${token}`,
        'x-api-version': '13',
        'x-vercel-blob-access': 'private',
        'x-vercel-blob-store-id': token.split('_')[3] || '',
        'x-content-type': 'application/json',
        'x-add-random-suffix': '1',
      },
    });
    if (!res.ok) console.error('memo view log failed', res.status, await res.text());
  } catch (err) {
    console.error('memo view log failed', err);
  }
}

export default async function middleware(request, context) {
  const url = new URL(request.url);
  const slug = url.pathname.replace(/^\/|\/$/g, '');
  const page = MEMOS[slug];
  if (!page) return html('Not found', 404);

  if (request.method === 'POST') {
    const form = await request.formData();
    const email = String(form.get('email') || '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return html(gatePage(page.title, 'Enter a valid email address.', email), 401);
    const ok = (await sha256(String(form.get('password') || ''))) === PASSWORD_SHA256;
    if (!ok) return html(gatePage(page.title, 'Wrong password. Try again.', email), 401);
    await logView(request, slug, email, 'unlock');
    const headers = new Headers({ location: '/' + slug, 'cache-control': 'no-store' });
    headers.append('set-cookie', `${ACCESS_COOKIE}=${TOKEN}; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax`);
    headers.append('set-cookie', `${EMAIL_COOKIE}=${encodeURIComponent(email)}; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax`);
    return new Response(null, { status: 303, headers });
  }

  const cookies = readCookies(request);
  const email = decodeURIComponent(cookies[EMAIL_COOKIE] || '');
  if (cookies[ACCESS_COOKIE] === TOKEN && EMAIL_RE.test(email)) {
    const log = logView(request, slug, email, 'open');
    if (context && typeof context.waitUntil === 'function') context.waitUntil(log);
    else await log;
    return html(page.html, 200);
  }
  return html(gatePage(page.title, '', ''), 401);
}
