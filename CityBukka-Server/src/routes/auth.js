import { Router } from 'express';
import { z } from 'zod';
import { createRateLimiter } from '../lib/adminAuth.js';
import {
  accountDisabled, bearer, fakePasswordCheck, hashPassword, issueUserToken, requirePhone,
  verifyPassword, verifyUserToken,
} from '../lib/auth.js';
import { ApiError, validate } from '../lib/errors.js';
import { publicUser } from '../repositories/users.js';

const registerBody = z.object({
  name: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(1).max(30),
  password: z.string().min(6).max(200),
  email: z.union([z.email().max(200), z.literal(''), z.null()]).optional(),
});

const loginBody = z.object({
  phone: z.string().trim().min(1).max(30),
  password: z.string().min(1).max(200),
});

const invalidCredentials = () => new ApiError(401, 'invalid_credentials', 'Incorrect phone number or password');

/** Customer / rider authentication. Login and register are rate limited per IP. */
export function authRoutes({ users, config, authLimiter = createRateLimiter() }) {
  const r = Router();

  const limit = (kind) => (req, res, next) => {
    const retryAfter = authLimiter.hit(`${kind}:${req.ip ?? 'unknown'}`);
    if (retryAfter) {
      res.set('Retry-After', String(retryAfter));
      throw new ApiError(429, 'rate_limited', 'Too many attempts. Try again later.');
    }
    next();
  };

  const session = (user) => ({ ...issueUserToken(config.authTokenSecret, user), user: publicUser(user) });

  r.post('/register', limit('register'), async (req, res) => {
    const body = validate(registerBody, req.body ?? {});
    const phone = requirePhone(body.phone);
    if (await users.phoneExists(phone)) {
      throw new ApiError(409, 'phone_taken', 'An account with this phone number already exists');
    }
    const user = await users.createCustomer({
      name: body.name,
      phone,
      email: body.email ? body.email.toLowerCase() : null,
      passwordHash: await hashPassword(body.password),
    });
    res.status(201).json(session(user));
  });

  r.post('/login', limit('login'), async (req, res) => {
    const body = validate(loginBody, req.body ?? {});
    const phone = requirePhone(body.phone);
    const found = await users.findByPhoneWithHash(phone);
    if (!found) {
      await fakePasswordCheck(body.password);
      throw invalidCredentials();
    }
    if (!(await verifyPassword(body.password, found.passwordHash))) throw invalidCredentials();
    if (!found.user.isActive) throw accountDisabled();
    if (found.user.role !== 'customer' && found.user.role !== 'rider') throw invalidCredentials();
    res.json(session(found.user));
  });

  r.get('/me', async (req, res) => {
    const claims = verifyUserToken(config.authTokenSecret, bearer(req));
    if (!claims) throw ApiError.unauthorized();
    const user = await users.get(claims.id);
    if (!user) throw ApiError.unauthorized();
    if (!user.isActive) throw accountDisabled();
    res.json({ user: publicUser(user) });
  });

  return r;
}
