import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { openDatabase, redactUrl } from './db/index.js';

const config = loadConfig();

if (!config.databaseUrl) {
  console.error('DATABASE_URL is not set. Add it to CityBukka-Server/.env, e.g.\n' +
    '  DATABASE_URL=postgres://USER:PASSWORD@localhost:5432/citybukka\n(see .env.example).');
  process.exit(1);
}

let db;
try {
  console.log(`Connecting to PostgreSQL at ${redactUrl(config.databaseUrl)} ...`);
  db = await openDatabase({ url: config.databaseUrl, ssl: config.databaseSsl });
} catch (err) {
  console.error(`Could not open the database (${redactUrl(config.databaseUrl)}): ${err.code ? `${err.code} ` : ''}${err.message}`);
  process.exit(1);
}

const app = createApp({ db, config });

const server = app.listen(config.port, () => {
  console.log(`CityBukka API listening on http://localhost:${config.port}`);
  if (!config.adminEmail || !config.adminPassword) {
    console.warn('ADMIN_EMAIL / ADMIN_PASSWORD not set – admin login is disabled.');
  } else if (!config.isProduction && !process.env.ADMIN_PASSWORD) {
    console.warn(`Admin login uses dev defaults (${config.adminEmail} / changeme). Set ADMIN_EMAIL / ADMIN_PASSWORD.`);
  }
  if (!process.env.ADMIN_TOKEN_SECRET) {
    console.warn('ADMIN_TOKEN_SECRET not set – using a random secret; admin sessions end on restart.');
  }
  if (!process.env.AUTH_TOKEN_SECRET) {
    console.warn('AUTH_TOKEN_SECRET not set – using a random secret; customer and rider sessions end on restart.');
  }
});

function shutdown() {
  server.close(() => {
    db.end().finally(() => process.exit(0));
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
