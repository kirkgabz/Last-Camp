// GET /api/save  -> this player's save   |   PUT /api/save { run, meta } -> store it
// Requires "Authorization: Bearer <token>" from /api/auth.
import { db } from './_lib/db.js';
import { route, send, fail, readJson, currentUser } from './_lib/http.js';

const MAX_BYTES = 400 * 1024;

export default route(async (req, res) => {
  const user = await currentUser(req);
  if (!user) return fail(res, 401, 'Please sign in again.');
  const q = await db();

  if (req.method === 'GET') {
    const rows = await q('select run, meta, updated_at from lc_saves where user_id = $1', [user.id]);
    const r = rows[0];
    return send(res, 200, { user, run: r ? r.run : null, meta: r ? r.meta : null, updated_at: r ? r.updated_at : null, exists: !!r });
  }

  if (req.method === 'PUT') {
    const body = await readJson(req);
    const run = body.run === undefined ? null : body.run;
    const meta = body.meta && typeof body.meta === 'object' && !Array.isArray(body.meta) ? body.meta : {};
    if (run !== null && (typeof run !== 'object' || Array.isArray(run))) return fail(res, 400, 'Invalid save data.');
    const runJson = run === null ? null : JSON.stringify(run);
    const metaJson = JSON.stringify(meta);
    if ((runJson ? runJson.length : 0) + metaJson.length > MAX_BYTES) return fail(res, 413, 'Save is too large.');
    const rows = await q(
      `insert into lc_saves (user_id, run, meta, updated_at) values ($1, $2::jsonb, $3::jsonb, now())
       on conflict (user_id) do update set run = excluded.run, meta = excluded.meta, updated_at = now()
       returning updated_at`, [user.id, runJson, metaJson]);
    return send(res, 200, { ok: true, updated_at: rows[0].updated_at });
  }

  return fail(res, 405, 'Method not allowed.');
});
