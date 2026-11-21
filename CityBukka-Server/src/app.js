import cors from 'cors';
import express from 'express';
import { loadConfig, PAYMENT_METHODS, PRICING } from './config.js';
import { requireUser } from './lib/auth.js';
import { ApiError } from './lib/errors.js';
import { staticSite } from './lib/staticSite.js';
import { createCatalogRepository } from './repositories/catalog.js';
import { createOrderRepository } from './repositories/orders.js';
import { createUserRepository } from './repositories/users.js';
import { adminRoutes } from './routes/admin.js';
import { authRoutes } from './routes/auth.js';
import { catalogRoutes } from './routes/catalog.js';
import { meRoutes } from './routes/me.js';
import { orderRoutes } from './routes/orders.js';
import { riderRoutes } from './routes/rider.js';

/**
 * @param {object} opts
 * @param {import('pg').Pool} opts.db  pool from openDatabase()
 * @param {object} [opts.config]       overrides for loadConfig()
 * @param {object} [opts.loginLimiter] admin login rate limiter
 * @param {object} [opts.authLimiter]  customer/rider login + register rate limiter
 */
export function createApp({ db, config: overrides = {}, loginLimiter, authLimiter }) {
  // Anything the caller leaves out falls back to the environment-based defaults.
  const config = { ...loadConfig(), ...overrides };
  const catalog = createCatalogRepository(db);
  const users = createUserRepository(db);
  const orders = createOrderRepository(db);

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    next();
  });
  app.use(cors({ origin: config.corsOrigins, exposedHeaders: ['Location', 'Retry-After'] }));
  app.use(express.json({ limit: '100kb' }));

  // Uploaded images: random immutable filenames, so they can be cached forever.
  app.use('/uploads', express.static(config.uploadDir, {
    index: false,
    dotfiles: 'deny',
    immutable: true,
    maxAge: '365d',
    setHeaders: (res) => res.set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox"),
  }));

  app.get('/health', async (req, res) => {
    await db.query('SELECT 1');
    res.json({ status: 'ok' });
  });

  const auth = { users, secret: config.authTokenSecret };
  const customer = requireUser(auth, 'customer');
  const rider = requireUser(auth, 'rider');

  const api = express.Router();

  /** Public fee structure and payment options (promo codes stay server-side). */
  api.get('/meta', (req, res) => {
    const { promoCodes, ...fees } = PRICING;
    res.json({ currency: 'NGN', fees, paymentMethods: PAYMENT_METHODS });
  });

  const { cartRouter, ordersRouter } = orderRoutes({ catalog, orders });
  api.use('/auth', authRoutes({ users, config, authLimiter }));
  api.use('/', catalogRoutes({ catalog }));
  api.use('/me', customer, meRoutes({ users, catalog }));
  api.use('/cart', customer, cartRouter);
  api.use('/orders', customer, ordersRouter);
  api.use('/rider', rider, riderRoutes({ users, orders }));
  api.use('/admin', adminRoutes({ catalog, orders, users, config, loginLimiter }));
  app.use('/api', api);

  // Production image: the built customer/admin/rider web app is served from this same origin.
  if (config.staticDir) app.use(staticSite(config.staticDir));

  app.use((req, res) => {
    res.status(404).json({ error: { code: 'not_found', message: `No route for ${req.method} ${req.path}` } });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof ApiError) {
      return res.status(err.status).json({
        error: { code: err.code, message: err.message, ...(err.details && { details: err.details }) },
      });
    }
    // Malformed JSON / oversized bodies from express.json()
    if (err.type === 'entity.parse.failed' || err.type === 'entity.too.large') {
      return res.status(err.status).json({ error: { code: 'bad_request', message: err.message } });
    }
    console.error(err);
    res.status(500).json({ error: { code: 'internal', message: 'Something went wrong' } });
  });

  return app;
}
