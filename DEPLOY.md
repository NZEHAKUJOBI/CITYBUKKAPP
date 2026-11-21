# Deploying Chop City Bukka on Render (Docker)

One Docker image runs the API (`CityBukka-Server`) and serves the built web app
(`CityBukka-Web`: customer PWA, `/admin`, `/rider`) from the same URL. Data lives in a
Render PostgreSQL database; uploaded images live on a Render persistent disk.

```
Browser ──► https://citybukka.onrender.com
              ├─ /api/*      Express API
              ├─ /uploads/*  images on the disk (/var/data/uploads)
              └─ everything else → web app (index.html for client-side routes)
                     │
                     └─► Render PostgreSQL (internal network)
```

## First deploy

1. Push this repository (with `render.yaml`, `Dockerfile`, `docker-entrypoint.sh`) to GitHub or GitLab.
2. In Render: **New → Blueprint**, pick the repository. Render reads `render.yaml` and proposes:
   - `citybukka-db`: PostgreSQL 17, plan `basic-256mb`
   - `citybukka`: Docker web service, plan `starter`, 1 GB disk at `/var/data`
3. Fill in the two values it asks for:
   - `ADMIN_EMAIL`: the admin dashboard login
   - `ADMIN_PASSWORD`: a long, unique password
4. Click **Apply**. The first build takes a few minutes. Migrations run automatically on start;
   when `/health` answers, the service goes live at `https://citybukka.onrender.com`
   (or the name Render assigns).
5. Open `https://<your-service>.onrender.com/admin`, sign in, and add restaurants,
   categories and dishes. The database starts empty.

After this, every push to the deployed branch redeploys automatically (`autoDeploy: true`).

## Configuration

Set by `render.yaml`; change any of these under the service's **Environment** tab:

| Variable | Value |
|---|---|
| `DATABASE_URL` | from `citybukka-db` (internal connection string) |
| `DATABASE_SSL` | `false` (internal network). Use `true` if you point at an external database |
| `NODE_ENV` | `production` |
| `AUTH_TOKEN_SECRET`, `ADMIN_TOKEN_SECRET` | random, generated once by Render. Changing them logs everyone out |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | admin dashboard login |

Set inside the image (no need to change): `PORT=8080` (Render overrides it), `STATIC_DIR=/app/public`,
`UPLOAD_DIR=/var/data/uploads`. `CORS_ORIGINS` isn't needed, because the app and API share one origin.

## Costs and the free tier

- The Blueprint uses paid plans because **persistent disks need a paid instance** and **free
  PostgreSQL databases are deleted 30 days after creation** (14-day grace period to upgrade).
- To just try it for free, set `plan: free` on both and **delete the `disk:` block**.
  The app works, but uploaded images vanish on every deploy or restart, the database
  expires after 30 days, and the service sleeps when idle (first request after a pause takes ~1 min).

## Custom domain

Service → **Settings → Custom Domains**. Render issues the HTTPS certificate. HTTPS is
required for the PWA to be installable.

## Test the image locally

```bash
docker network create cb
docker run -d --name cb-pg --network cb -e POSTGRES_USER=citybukka -e POSTGRES_PASSWORD=pw -e POSTGRES_DB=citybukka postgres:17-alpine
docker build -t citybukka .
docker run --rm -p 8080:8080 --network cb \
  -e DATABASE_URL=postgres://citybukka:pw@cb-pg:5432/citybukka \
  -e ADMIN_EMAIL=admin@example.com -e ADMIN_PASSWORD=change-me-please \
  citybukka
# → http://localhost:8080 and http://localhost:8080/admin
```

## Notes

- **Backups:** paid Render PostgreSQL plans include point-in-time recovery. The disk (uploaded
  images) is snapshotted daily by Render.
- **One instance only:** a service with a disk can't scale to several instances. To scale out,
  move uploads to object storage (e.g. S3 or Cloudflare R2) first.
- **Zero-downtime deploys** are not available for services with a disk; expect a few seconds
  of downtime per deploy.
