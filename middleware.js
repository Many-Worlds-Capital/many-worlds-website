// Password gate for private memo pages. The memo HTML lives in api/_memos.js
// (underscore files under api/ are neither functions nor static files), so the
// only way to read it is through this middleware.
import { MEMOS, gatePage } from './api/_memos.js';

export const config = {
  matcher: ['/lightlogiq', '/lightlogiq/'],
};

// sha256 of the password; the password itself is not stored in the repo.
const PASSWORD_SHA256 = '03ba88b94c6116216919a6c96da3d610dad54324f56e1bf5cbe5dc6e75ee58df';
const COOKIE = 'mw_memo';
const TOKEN = '743ae109a8ef7ae9480ca6b3b029e28b1942e69a878de4b4';

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

export default async function middleware(request) {
  const url = new URL(request.url);
  const slug = url.pathname.replace(/^\/|\/$/g, '');
  const page = MEMOS[slug];
  if (!page) return html('Not found', 404);

  if (request.method === 'POST') {
    const form = await request.formData();
    const ok = (await sha256(String(form.get('password') || ''))) === PASSWORD_SHA256;
    if (!ok) return html(gatePage(page.title, true), 401);
    return new Response(null, {
      status: 303,
      headers: {
        location: '/' + slug,
        'set-cookie': `${COOKIE}=${TOKEN}; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax`,
        'cache-control': 'no-store',
      },
    });
  }

  const cookies = request.headers.get('cookie') || '';
  if (cookies.split(/;\s*/).includes(`${COOKIE}=${TOKEN}`)) return html(page.html, 200);
  return html(gatePage(page.title, false), 401);
}
