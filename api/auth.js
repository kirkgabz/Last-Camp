// POST /api/auth   { action: 'signup' | 'signin' | 'signout', email, password }
import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { db } from './_lib/db.js';
import { route, send, fail, readJson, sha256 } from './_lib/http.js';

const scrypt = promisify(crypto.scrypt);
const SESSION_DAYS = 60;
const MAX_FAILS = 8;          // failed sign-ins per email...
const FAIL_WINDOW_MIN = 15;   // ...within this many minutes

async function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(pw, salt, 64, { N: 16384, r: 8, p: 1 });
  return 'scrypt$16384$' + salt.toString('base64') + '$' + key.toString('base64');
}

async function checkPassword(pw, stored) {
  const [alg, n, saltB64, keyB64] = String(stored).split('$');
  if (alg !== 'scrypt') return false;
  const expected = Buffer.from(keyB64, 'base64');
  const key = await scrypt(pw, Buffer.from(saltB64, 'base64'), expected.length, { N: Number(n), r: 8, p: 1 });
  return crypto.timingSafeEqual(key, expected);
}

async function newSession(q, userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  await q(`insert into lc_sessions (token_hash, user_id, expires_at) values ($1, $2, now() + ($3 || ' days')::interval)`,
    [sha256(token), userId, String(SESSION_DAYS)]);
  return token;
}

function validate(body) {
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Please enter a valid email address.' };
  if (password.length < 6) return { error: 'Password must be at least 6 characters.' };
  if (password.length > 72) return { error: 'Password must be 72 characters or fewer.' };
  return { email, password };
}

export default route(async (req, res) => {
  if (req.method !== 'POST') return fail(res, 405, 'Method not allowed.');
  const body = await readJson(req);
  const q = await db();

  if (body.action === 'signout') {
    const m = /^Bearer\s+(\S+)$/.exec(req.headers.authorization || '');
    if (m) await q('delete from lc_sessions where token_hash = $1', [sha256(m[1])]);
    return send(res, 200, { ok: true });
  }

  const v = validate(body);
  if (v.error) return fail(res, 400, v.error);

  if (body.action === 'signup') {
    const pass = await hashPassword(v.password);
    const rows = await q(`insert into lc_users (email, pass_hash) values ($1, $2) on conflict (email) do nothing returning id, email`, [v.email, pass]);
    if (!rows.length) return fail(res, 409, 'An account with this email already exists. Try signing in.');
    const token = await newSession(q, rows[0].id);
    return send(res, 200, { token, user: rows[0] });
  }

  if (body.action === 'signin') {
    const recent = await q(`select count(*)::int as n from lc_login_fails where email = $1 and at > now() - ($2 || ' minutes')::interval`,
      [v.email, String(FAIL_WINDOW_MIN)]);
    if (recent[0].n >= MAX_FAILS) return fail(res, 429, 'Too many failed attempts. Please wait 15 minutes and try again.');
    const users = await q('select id, email, pass_hash from lc_users where email = $1', [v.email]);
    const ok = users.length ? await checkPassword(v.password, users[0].pass_hash) : (await hashPassword(v.password), false);
    if (!ok) {
      await q('insert into lc_login_fails (email) values ($1)', [v.email]);
      await q(`delete from lc_login_fails where at < now() - interval '1 day'`);
      return fail(res, 401, 'Wrong email or password.');
    }
    await q('delete from lc_login_fails where email = $1', [v.email]);
    await q('delete from lc_sessions where user_id = $1 and expires_at < now()', [users[0].id]);
    const token = await newSession(q, users[0].id);
    return send(res, 200, { token, user: { id: users[0].id, email: users[0].email } });
  }

  return fail(res, 400, 'Unknown action.');
});
