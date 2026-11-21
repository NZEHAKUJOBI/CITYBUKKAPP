import { Router } from 'express';
import { z } from 'zod';
import { createRateLimiter, issueToken, safeEqual, verifyToken } from '../lib/adminAuth.js';
import { ApiError, validate } from '../lib/errors.js';
import { adminCatalogRoutes } from './admin/catalog.js';
import { adminOrderRoutes } from './admin/orders.js';
import { adminRiderRoutes } from './admin/riders.js';
import { adminUploadRoutes } from './admin/uploads.js';

const loginBody = z.object({
  email: z.string().trim().min(1).max(200),
  password: z.string().min(1).max(200),
});

/**
 * Staff API. `POST /login` exchanges ADMIN_EMAIL / ADMIN_PASSWORD for a 12h signed token;
 * everything else needs `Authorization: Bearer <token>` (or the legacy static ADMIN_API_KEY).
 */
export function adminRoutes({ catalog, orders, users, config, loginLimiter = createRateLimiter() }) {
  const r = Router();
  const admin = { email: config.adminEmail, name: config.adminName };

  r.post('/login', (req, res) => {
    const retryAfter = loginLimiter.hit(req.ip ?? 'unknown');
    if (retryAfter) {
      res.set('Retry-After', String(retryAfter));
      throw new ApiError(429, 'rate_limited', 'Too many login attempts. Try again later.');
    }
    if (!config.adminEmail || !config.adminPassword) {
      throw new ApiError(503, 'admin_login_disabled', 'Set ADMIN_EMAIL and ADMIN_PASSWORD to enable admin login');
    }
    const { email, password } = validate(loginBody, req.body ?? {});
    // Evaluate both comparisons so timing does not reveal which one failed.
    const emailOk = safeEqual(email.toLowerCase(), config.adminEmail);
    const passwordOk = safeEqual(password, config.adminPassword);
    if (!emailOk || !passwordOk) {
      throw new ApiError(401, 'invalid_credentials', 'Incorrect email or password');
    }
    const { token, expiresAt } = issueToken(config.adminTokenSecret, admin);
    res.json({ token, expiresAt, admin });
  });

  r.use((req, res, next) => {
    const header = req.get('authorization') ?? '';
    const given = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!given) throw ApiError.unauthorized();
    const fromToken = verifyToken(config.adminTokenSecret, given);
    if (fromToken) {
      req.admin = fromToken;
    } else if (config.adminApiKey && safeEqual(given, config.adminApiKey)) {
      req.admin = { email: config.adminEmail, name: 'API key' };
    } else {
      throw ApiError.unauthorized();
    }
    next();
  });

  r.get('/me', (req, res) => {
    res.json({ email: req.admin.email, name: req.admin.name });
  });

  r.use('/', adminCatalogRoutes({ catalog }));
  r.use('/', adminOrderRoutes({ catalog, orders, users }));
  r.use('/', adminRiderRoutes({ users }));
  r.use('/', adminUploadRoutes({ uploadDir: config.uploadDir }));

  return r;
}
