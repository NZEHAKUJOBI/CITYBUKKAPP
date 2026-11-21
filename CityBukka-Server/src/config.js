import { randomBytes } from 'node:crypto';

export function loadConfig(env = process.env) {
  const isProduction = env.NODE_ENV === 'production';
  return {
    isProduction,
    port: Number(env.PORT) || 8080,
    databaseUrl: env.DATABASE_URL || '',
    // DATABASE_SSL (or PGSSL): 'true' = TLS with certificate checks, 'no-verify' = TLS accepting any cert.
    databaseSsl: parseSsl(env.DATABASE_SSL ?? env.PGSSL),
    corsOrigins: (env.CORS_ORIGINS || 'http://localhost:5000,http://localhost:8000,http://localhost:5173')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    /** Legacy static staff key; still accepted as a bearer token on /api/admin/*. Empty = disabled. */
    adminApiKey: env.ADMIN_API_KEY || '',
    // Dashboard login. Dev gets well-known defaults; production must set both or login stays disabled.
    adminEmail: (env.ADMIN_EMAIL || (isProduction ? '' : 'admin@citybukka.local')).trim().toLowerCase(),
    adminPassword: env.ADMIN_PASSWORD || (isProduction ? '' : 'changeme'),
    adminName: env.ADMIN_NAME || 'Admin',
    // Random per process when unset: tokens then stop working after a restart.
    adminTokenSecret: env.ADMIN_TOKEN_SECRET || randomBytes(32).toString('hex'),
    // Customer / rider session tokens. Random per process when unset (everyone is logged out on restart).
    authTokenSecret: env.AUTH_TOKEN_SECRET || randomBytes(32).toString('hex'),
    uploadDir: env.UPLOAD_DIR || './data/uploads',
    // Built CityBukka-Web (dist/) to serve from this process; empty = API only.
    staticDir: env.STATIC_DIR || '',
  };
}

function parseSsl(value) {
  const v = String(value ?? '').trim().toLowerCase();
  if (v === 'no-verify') return 'no-verify';
  return ['true', '1', 'yes', 'require'].includes(v);
}

/** Business rules for pricing; every total is computed server-side from these. */
export const PRICING = {
  standardDeliveryFee: 650,
  serviceFee: 200,
  packagingFee: 150,
  freeDeliveryThreshold: 7500,
  // value < 1 → percentage of subtotal; value >= 1 → flat naira amount off
  promoCodes: {
    BUKKA20: 0.2,
    FIRSTFEAST: 0.25,
    HOTBUKKA: 500,
  },
};

export const PAYMENT_METHODS = [
  'CityPay Wallet',
  'Debit / Credit Card',
  'Bank Transfer',
  'Cash on Delivery',
];

/** Order status codes as stored in the database and returned by the API. */
export const ORDER_STATUS = {
  placed: 0,
  preparing: 1,
  riderAssigned: 2,
  outForDelivery: 3,
  delivered: 4,
  cancelled: 5,
};
