import pg from 'pg';
import { createApp } from '../src/app.js';
import { ensureDatabase, openDatabase, redactUrl, sslOption } from '../src/db/index.js';
import { createRateLimiter } from '../src/lib/adminAuth.js';
import { categories, foodItems, restaurants } from './fixtures.js';

const quiet = { info() {}, error() {} };

/**
 * TEST_DATABASE_URL, else DATABASE_URL with `_test` appended to the database name.
 * Never the real database itself.
 */
export function testDatabaseUrl(env = process.env) {
  if (env.TEST_DATABASE_URL) return env.TEST_DATABASE_URL;
  if (!env.DATABASE_URL) return null;
  try {
    const u = new URL(env.DATABASE_URL);
    const name = decodeURIComponent(u.pathname.replace(/^\//, '')) || 'citybukka';
    u.pathname = `/${encodeURIComponent(`${name}_test`)}`;
    return u.toString();
  } catch {
    return null;
  }
}

const sslFromEnv = () => {
  const v = String(process.env.DATABASE_SSL ?? process.env.PGSSL ?? '').toLowerCase();
  return v === 'no-verify' ? 'no-verify' : ['true', '1', 'yes', 'require'].includes(v);
};

/**
 * Fresh schema `test_<suite>` in the test database (created if missing), migrated and empty.
 * Each test file gets its own schema so files can run in parallel.
 * Returns `{ pool }`, or `{ skip: '<reason>' }` when no Postgres is reachable.
 */
export async function setupTestDb(suite) {
  const url = testDatabaseUrl();
  if (!url) {
    const reason = 'No Postgres configured: set TEST_DATABASE_URL or DATABASE_URL (e.g. in .env) to run the database tests';
    console.log(`# SKIP ${suite}: ${reason}`);
    return { skip: reason };
  }
  const ssl = sslFromEnv();
  const schema = `test_${suite}`;
  try {
    await ensureDatabase(url, { ssl, log: quiet });
    const client = new pg.Client({ connectionString: url, ssl: sslOption(ssl) });
    await client.connect();
    try {
      await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
      await client.query(`CREATE SCHEMA ${schema}`);
    } finally {
      await client.end();
    }
    const pool = await openDatabase({ url, ssl, schema, max: 5, log: quiet });
    return { pool };
  } catch (err) {
    const reason = `No Postgres reachable at ${redactUrl(url)} (${err.code ?? ''} ${err.message})`;
    console.log(`# SKIP ${suite}: ${reason}`);
    return { skip: reason };
  }
}

export const TEST_CONFIG = {
  corsOrigins: ['http://localhost:5173'],
  adminApiKey: 'legacy-admin-key',
  adminEmail: 'boss@citybukka.test',
  adminPassword: 'correct horse battery staple',
  adminName: 'Boss',
  adminTokenSecret: 'test-admin-secret',
  authTokenSecret: 'test-auth-secret',
};

/** Start the app on a random port; returns `{ base, server }`. */
export async function startServer(pool, config = {}, opts = {}) {
  const app = createApp({
    db: pool,
    config: { ...TEST_CONFIG, ...config },
    authLimiter: createRateLimiter({ max: 10_000 }),
    ...opts,
  });
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  return { base: `http://localhost:${server.address().port}`, server };
}

/** `call(method, path, body?, headers?)` → `{ status, headers, body }`. */
export const client = (getBase) => async (method, path, body, headers = {}) => {
  const res = await fetch(getBase() + path, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, headers: res.headers, body: text ? JSON.parse(text) : null };
};

export const bearer = (token) => ({ authorization: `Bearer ${token}` });

/** Create the fixture catalogue through the admin API. */
export async function createCatalog(call, adminHeaders) {
  for (const body of categories) await expectOk(call('POST', '/api/admin/categories', body, adminHeaders));
  for (const body of restaurants) await expectOk(call('POST', '/api/admin/restaurants', body, adminHeaders));
  for (const body of foodItems) await expectOk(call('POST', '/api/admin/food-items', body, adminHeaders));
}

async function expectOk(promise) {
  const res = await promise;
  if (res.status >= 300) throw new Error(`Fixture setup failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res;
}

let phoneSeq = 0;
/** A unique valid Nigerian mobile number per call, e.g. 0803xxxxxxx. */
export const uniquePhone = () => `0803${String(Date.now() % 1e4).padStart(4, '0')}${String(phoneSeq++).padStart(3, '0')}`;
