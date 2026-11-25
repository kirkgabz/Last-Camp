// Small HTTP helpers shared by the API routes (work on Vercel and in the local dev server).
import crypto from 'node:crypto';
import { db } from './db.js';

export function cors(res) {
  // Auth uses a bearer token (no cookies), so allowing any origin is safe and lets
  // the game also talk to the API when it is opened straight from index.html.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
  res.setHeader('Access-Control-Max-Age', '86400');
}

export function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

export function fail(res, status, error) {
  send(res, status, { error });
}

export async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return req.body ? JSON.parse(req.body) : {};
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > 600 * 1024) { const e = new Error('Request too large'); e.status = 413; throw e; }
    chunks.push(c);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

export const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

// Returns { id, email } for a valid session token, or null.
export async function currentUser(req) {
  const h = req.headers.authorization || '';
  const m = /^Bearer\s+([A-Za-z0-9_-]{20,200})$/.exec(h);
  if (!m) return null;
  const q = await db();
  const rows = await q(
    `select u.id, u.email from lc_sessions s join lc_users u on u.id = s.user_id
     where s.token_hash = $1 and s.expires_at > now()`, [sha256(m[1])]);
  return rows[0] || null;
}

// Wraps a route: CORS, OPTIONS preflight, and error handling.
export function route(handler) {
  return async (req, res) => {
    cors(res);
    if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
    try {
      await handler(req, res);
    } catch (err) {
      if (err instanceof SyntaxError) return fail(res, 400, 'Invalid JSON.');
      const status = err.status || 500;
      if (status >= 500) console.error(err);
      fail(res, status, status >= 500 && !err.status ? 'Server error. Please try again.' : err.message);
    }
  };
}
