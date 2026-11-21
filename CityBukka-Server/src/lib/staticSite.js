import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import express from 'express';

// Never answered with the web app: these keep their JSON / file 404s.
const NOT_SPA = /^\/(api|uploads)(\/|$)|^\/health$/;

// Files that must be revalidated on every load so a new deploy is picked up right away.
const ALWAYS_FRESH = /(^|\/)(index\.html|sw\.js|registerSW\.js|manifest\.webmanifest)$/;

/**
 * Serve the built CityBukka-Web app (Vite `dist/`) from the API process, so the PWA, the API
 * and /uploads share one origin. Client-side routes (/orders/123, /admin/…) fall back to index.html.
 *
 * @param {string} dir  path to the built web app
 */
export function staticSite(dir) {
  const root = resolve(dir);
  const indexFile = join(root, 'index.html');
  if (!existsSync(indexFile)) {
    throw new Error(`STATIC_DIR is set to ${root}, but it has no index.html. Build CityBukka-Web first.`);
  }

  const router = express.Router();

  router.use(express.static(root, {
    index: false,
    dotfiles: 'ignore',
    setHeaders(res, path) {
      const p = path.replaceAll('\\', '/');
      if (ALWAYS_FRESH.test(p)) {
        res.set('Cache-Control', 'no-cache');
      } else if (p.includes('/assets/')) {
        // Vite puts a content hash in every file name under assets/.
        res.set('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  }));

  router.use((req, res, next) => {
    if ((req.method !== 'GET' && req.method !== 'HEAD') || NOT_SPA.test(req.path)) return next();
    res.set('Cache-Control', 'no-cache');
    res.sendFile(indexFile);
  });

  return router;
}
