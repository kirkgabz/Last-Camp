// Database access for the Last Camp backend.
// Production (Vercel): Neon Postgres, using the DATABASE_URL that the Neon integration adds.
// Local development: an in-process Postgres (PGlite), so no database server is needed.

let queryFn = null;
let schemaReady = null;

async function connect() {
  if (queryFn) return queryFn;
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (url) {
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(url);
    queryFn = (text, params = []) => sql.query(text, params);
  } else if (process.env.VERCEL) {
    const err = new Error('Database is not connected. Add a Neon database to this Vercel project (Storage tab) and redeploy.');
    err.status = 503;
    throw err;
  } else {
    if (!globalThis.__lcPglite) {
      const { PGlite } = await import('@electric-sql/pglite');
      globalThis.__lcPglite = new PGlite(process.env.PGLITE_DIR || undefined);
    }
    const db = globalThis.__lcPglite;
    queryFn = async (text, params = []) => (await db.query(text, params)).rows;
  }
  return queryFn;
}

// Tables are created automatically the first time the API runs.
const SCHEMA = [
  `create table if not exists lc_users (
     id uuid primary key default gen_random_uuid(),
     email text not null unique,
     pass_hash text not null,
     created_at timestamptz not null default now()
   )`,
  `create table if not exists lc_sessions (
     token_hash text primary key,
     user_id uuid not null references lc_users(id) on delete cascade,
     created_at timestamptz not null default now(),
     expires_at timestamptz not null
   )`,
  `create index if not exists lc_sessions_user on lc_sessions(user_id)`,
  `create table if not exists lc_saves (
     user_id uuid primary key references lc_users(id) on delete cascade,
     run jsonb,
     meta jsonb not null default '{}'::jsonb,
     updated_at timestamptz not null default now()
   )`,
  `create table if not exists lc_login_fails (
     email text not null,
     at timestamptz not null default now()
   )`,
  `create index if not exists lc_login_fails_email on lc_login_fails(email, at)`,
];

export async function db() {
  const q = await connect();
  if (!schemaReady) {
    schemaReady = (async () => { for (const stmt of SCHEMA) await q(stmt); })();
    schemaReady.catch(() => { schemaReady = null; });
  }
  await schemaReady;
  return q;
}
