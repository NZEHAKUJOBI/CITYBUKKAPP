import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

const b64url = (buf) => Buffer.from(buf).toString('base64url');
const sign = (secret, data) => createHmac('sha256', secret).update(data).digest();

/** Token format: base64url(JSON payload) + "." + base64url(HMAC-SHA256(payload part)). */
export function signPayload(secret, payload) {
  const part = b64url(JSON.stringify(payload));
  return `${part}.${b64url(sign(secret, part))}`;
}

/** The decoded payload if the signature matches and `exp` is in the future, otherwise null. */
export function verifyPayload(secret, token, now = Date.now()) {
  if (typeof token !== 'string') return null;
  const [part, sig, extra] = token.split('.');
  if (!part || !sig || extra !== undefined) return null;
  const expected = sign(secret, part);
  const given = Buffer.from(sig, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
    if (!payload || typeof payload.exp !== 'number' || payload.exp <= now) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Constant-time string comparison (hashing first so lengths always match). */
export function safeEqual(a, b) {
  const ha = createHash('sha256').update(String(a)).digest();
  const hb = createHash('sha256').update(String(b)).digest();
  return timingSafeEqual(ha, hb);
}

/** Admin session token: `{ sub: email, name, exp }`. */
export function issueToken(secret, { email, name }, now = Date.now()) {
  const exp = now + TOKEN_TTL_MS;
  return { token: signPayload(secret, { sub: email, name, exp }), expiresAt: new Date(exp).toISOString() };
}

/** Returns `{ email, name }` for a valid, unexpired admin token, otherwise null. */
export function verifyToken(secret, token, now = Date.now()) {
  const payload = verifyPayload(secret, token, now);
  // Customer/rider tokens carry `role` + `typ`; never accept them as admin tokens even if secrets match.
  if (!payload || typeof payload.sub !== 'string' || payload.typ !== undefined || payload.role !== undefined) return null;
  return { email: payload.sub, name: typeof payload.name === 'string' ? payload.name : '' };
}

/** Fixed-window, in-memory per-key limiter. `hit(key)` returns seconds to wait, or 0 if allowed. */
export function createRateLimiter({ max = 10, windowMs = 15 * 60 * 1000 } = {}) {
  const hits = new Map();
  return {
    hit(key, now = Date.now()) {
      if (hits.size > 10_000) {
        for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
      }
      let entry = hits.get(key);
      if (!entry || entry.resetAt <= now) {
        entry = { count: 0, resetAt: now + windowMs };
        hits.set(key, entry);
      }
      if (entry.count >= max) return Math.ceil((entry.resetAt - now) / 1000);
      entry.count += 1;
      return 0;
    },
  };
}
