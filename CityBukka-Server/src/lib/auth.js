import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { signPayload, verifyPayload } from './adminAuth.js';
import { ApiError } from './errors.js';

const scryptAsync = promisify(scrypt);

export const USER_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const ROLES = ['customer', 'rider', 'admin'];

// ---- Passwords -----------------------------------------------------------------------------

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

/** `scrypt$N$r$p$<salt b64>$<hash b64>` with a random 16-byte salt. */
export async function hashPassword(password) {
  const salt = randomBytes(16);
  const { N, r, p, keylen } = SCRYPT;
  const hash = await scryptAsync(password.normalize('NFKC'), salt, keylen, { N, r, p });
  return `scrypt$${N}$${r}$${p}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export async function verifyPassword(password, stored) {
  const parts = typeof stored === 'string' ? stored.split('$') : [];
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, N, r, p, saltB64, hashB64] = parts;
  const expected = Buffer.from(hashB64, 'base64');
  try {
    const actual = await scryptAsync(String(password).normalize('NFKC'), Buffer.from(saltB64, 'base64'),
      expected.length, { N: Number(N), r: Number(r), p: Number(p) });
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/** Burn comparable CPU time when the account does not exist, so timing does not reveal it. */
let dummyHash;
export async function fakePasswordCheck(password) {
  dummyHash ??= await hashPassword('not-a-real-password');
  await verifyPassword(password, dummyHash);
  return false;
}

// ---- Phone numbers -------------------------------------------------------------------------

/**
 * Normalise a Nigerian mobile number to +234XXXXXXXXXX.
 * Accepts 080…/070…/090…/081… (11 digits), 234… and +234…; spaces, dashes, dots and brackets are ignored.
 * Returns null if it is not a valid number.
 */
export function normalizePhone(input) {
  if (typeof input !== 'string') return null;
  const s = input.trim().replace(/[\s().-]/g, '');
  let national;
  if (/^0\d{10}$/.test(s)) national = s.slice(1);
  else if (/^\+?234\d{10}$/.test(s)) national = s.replace(/^\+?234/, '');
  else return null;
  if (!/^[789][01]\d{8}$/.test(national)) return null;
  return `+234${national}`;
}

export const invalidPhone = (field = 'phone') =>
  new ApiError(400, 'invalid_phone', 'Enter a valid Nigerian phone number, e.g. 08012345678 or +2348012345678',
    [{ path: field, message: 'Invalid phone number' }]);

/** normalizePhone or throw 400 invalid_phone. */
export function requirePhone(input, field = 'phone') {
  const phone = normalizePhone(input);
  if (!phone) throw invalidPhone(field);
  return phone;
}

// ---- Tokens --------------------------------------------------------------------------------

/** Customer / rider session token: `{ typ: 'user', sub: userId, role, exp }`, valid 30 days. */
export function issueUserToken(secret, { id, role }, now = Date.now()) {
  const exp = now + USER_TOKEN_TTL_MS;
  return { token: signPayload(secret, { typ: 'user', sub: id, role, exp }), expiresAt: new Date(exp).toISOString() };
}

/** `{ id, role }` for a valid, unexpired user token, otherwise null. */
export function verifyUserToken(secret, token, now = Date.now()) {
  const p = verifyPayload(secret, token, now);
  if (!p || p.typ !== 'user' || typeof p.sub !== 'string' || !ROLES.includes(p.role)) return null;
  return { id: p.sub, role: p.role };
}

export const bearer = (req) => {
  const header = req.get('authorization') ?? '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
};

export const forbidden = () => new ApiError(403, 'forbidden', 'You do not have access to this resource');
export const accountDisabled = () => new ApiError(403, 'account_disabled', 'This account has been disabled');

/**
 * Middleware: require a valid user token whose account (re-read from the DB, so role changes and
 * deactivation take effect immediately) has one of `roles`. Sets req.user and req.userId.
 * 401 `unauthorized` without a valid token, 403 `forbidden` for the wrong role, 403 `account_disabled`.
 */
export function requireUser({ users, secret }, ...roles) {
  return async (req, res, next) => {
    const claims = verifyUserToken(secret, bearer(req));
    if (!claims) throw ApiError.unauthorized();
    const user = await users.get(claims.id);
    if (!user) throw ApiError.unauthorized();
    if (!user.isActive) throw accountDisabled();
    if (roles.length && !roles.includes(user.role)) throw forbidden();
    req.user = user;
    req.userId = user.id;
    next();
  };
}
