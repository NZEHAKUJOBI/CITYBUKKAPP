# Deploying Chop City Bukka on Dokploy

`docker-compose.yml` runs two containers on your Dokploy server:

- `app`: the image from `Dockerfile`. It runs the API and serves the web app (customer PWA, `/admin`, `/rider`) from one URL. Uploaded images are kept in the `uploads` volume.
- `db`: PostgreSQL 17. Its data is kept in the `pgdata` volume. It is reachable only from the internal Docker network.

Migrations run automatically when the app starts. The database starts empty.

## 1. Create the service

1. In Dokploy: **Projects → (your project) → Create Service → Compose**. Name it `citybukka`.
2. **General → Provider**: choose GitHub (or Git) and select `NZEHAKUJOBI/CITYBUKKAPP`, branch `main`.
3. Leave **Compose Path** as `./docker-compose.yml` and **Compose Type** as `docker-compose`. Save.

## 2. Environment variables

In the service's **Environment** tab, paste the following and fill in the values. Dokploy writes these to a `.env` file next to the compose file:

```env
POSTGRES_PASSWORD=
AUTH_TOKEN_SECRET=
ADMIN_TOKEN_SECRET=
ADMIN_EMAIL=
ADMIN_PASSWORD=
ADMIN_NAME=Admin
```

- Generate `POSTGRES_PASSWORD`, `AUTH_TOKEN_SECRET` and `ADMIN_TOKEN_SECRET` as three different random values:
  `openssl rand -hex 32` (or `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).
  Use hex for the database password. Characters like `@ : / #` would break the `DATABASE_URL` built from it.
- Don't change the secrets after the first deploy. Changing them signs everyone out, and a new `POSTGRES_PASSWORD` won't be accepted by the database that already exists.
- The deploy fails with a clear `set ...` message if one of these is missing.

## 3. Domain and HTTPS

1. Point a DNS **A record** (e.g. `citybukka.example.com`) at your Dokploy server's IP.
2. **Domains → Add Domain**:
   - Service Name: `app`
   - Host: `citybukka.example.com`
   - Path: `/`
   - Container Port: `8080`
   - HTTPS: on, Certificate: **Let's Encrypt**
3. Save.

The PWA can only be installed over HTTPS. `CORS_ORIGINS` doesn't need to be set, because the web app and the API share one origin.

## 4. Deploy

Click **Deploy**. The first build takes a few minutes, because it builds the web app and the server. When it finishes:

- `https://citybukka.example.com/health` returns OK
- `https://citybukka.example.com/admin`: sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`, then add restaurants, categories and dishes

To redeploy on every push, turn on **Autodeploy** in the General tab (or add the webhook URL shown there to GitHub).

## Backups

- **Database:** use **Volume Backups** on the `pgdata` volume, or run a dump on the server:
  `docker exec <db-container> pg_dump -U citybukka citybukka > backup.sql`
- **Uploaded images:** back up the `uploads` volume the same way.

Volumes persist across redeploys. Don't delete the service's volumes unless you want to wipe the data.

## Troubleshooting

- **404 / "no available server"**: check that the domain's service is `app` and the port is `8080`, then redeploy. Dokploy applies domain changes on deploy.
- **App restarts with a database error**: check the **Logs** of `db`. If you changed `POSTGRES_PASSWORD` after the first deploy, set it back. The password is fixed when the volume is first created.
- **Low memory during build** (small VPS): building the web app needs about 1 GB of RAM. Add swap, or build the image in CI, push it to a registry, and replace `build:` with `image:` in the compose file.
