import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'migrations');
// Arbitrary constant: serialises migration runs from several processes on one database.
const MIGRATION_LOCK_ID = 727_001;

/** Connection string with the password masked, safe for logs. */
export function redactUrl(url) {
  try {
    const u = new URL(url);
    if (u.password) u.password = '****';
    return u.toString();
  } catch {
    return '<invalid DATABASE_URL>';
  }
}

/** `ssl`: false | true (verify certificates) | 'no-verify' (encrypt, accept any certificate). */
export function sslOption(ssl) {
  if (!ssl) return undefined;
  return ssl === 'no-verify' ? { rejectUnauthorized: false } : { rejectUnauthorized: true };
}

const databaseName = (url) => decodeURIComponent(new URL(url).pathname.replace(/^\//, ''));
const quoteIdent = (name) => `"${name.replace(/"/g, '""')}"`;

/**
 * Create the target database if it does not exist yet, by connecting to the `postgres`
 * maintenance database with the same credentials. Failures are logged, not thrown here;
 * the subsequent real connection reports the actual problem.
 */
export async function ensureDatabase(url, { ssl, log = console } = {}) {
  const probe = new pg.Client({ connectionString: url, ssl: sslOption(ssl) });
  try {
    await probe.connect();
    return false;
  } catch (err) {
    if (err.code !== '3D000') throw err; // anything but "database does not exist"
  } finally {
    await probe.end().catch(() => {});
  }

  const name = databaseName(url);
  const admin = new URL(url);
  admin.pathname = '/postgres';
  const client = new pg.Client({ connectionString: admin.toString(), ssl: sslOption(ssl) });
  try {
    await client.connect();
    await client.query(`CREATE DATABASE ${quoteIdent(name)}`);
    log.info?.(`Created database "${name}".`);
    return true;
  } catch (err) {
    // 42P04 duplicate_database / 23505: another process created it at the same moment.
    if (err.code === '42P04' || err.code === '23505') return false;
    log.error?.(`Database "${name}" does not exist and could not be created automatically ` +
      `(${err.code ?? ''} ${err.message}). Create it manually, e.g. \`createdb ${name}\`, ` +
      `or grant the user CREATEDB.`);
    throw err;
  } finally {
    await client.end().catch(() => {});
  }
}

/** Apply every src/db/migrations/*.sql not yet recorded in schema_migrations, each in its own transaction. */
export async function migrate(pool, { log = console } = {}) {
  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_ID]);
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
    const { rows } = await client.query('SELECT version FROM schema_migrations');
    const applied = new Set(rows.map((r) => r.version));
    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
        await client.query('COMMIT');
        log.info?.(`Applied migration ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${file} failed: ${err.message}`, { cause: err });
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_ID]).catch(() => {});
    client.release();
  }
}

/**
 * Connect to PostgreSQL, creating the database if needed, and run pending migrations.
 * Nothing is seeded: the catalogue starts empty and is filled through the admin API.
 * `schema` (tests) sets the search_path so separate suites can share one database.
 */
export async function openDatabase({ url, ssl = false, schema, max = 10, log = console } = {}) {
  if (!url) throw new Error('DATABASE_URL is not set');
  await ensureDatabase(url, { ssl, log });
  const pool = new pg.Pool({
    connectionString: url,
    ssl: sslOption(ssl),
    max,
    ...(schema && { options: `-c search_path=${schema}` }),
  });
  pool.on('error', (err) => log.error?.('Idle PostgreSQL client error:', err.message));
  await migrate(pool, { log });
  return pool;
}

/** Run `fn(client)` inside BEGIN/COMMIT on one pooled client; ROLLBACK if it throws. */
export async function transaction(pool, fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
