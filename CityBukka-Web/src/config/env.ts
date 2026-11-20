/** Runtime configuration read from Vite env variables (see README / .env.example). */

const env = import.meta.env as Record<string, string | boolean | undefined>;

/** Origin (and optional path prefix) of CityBukka-Server. '' = same origin (Vite dev proxy / reverse proxy). */
export const API_BASE_URL: string = String(env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

/** Build an absolute API URL: apiUrl('/api/categories', { q: 'rice' }). Empty params are skipped. */
export function apiUrl(path: string, params?: Record<string, string | number | boolean | undefined | null>, base = API_BASE_URL) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return `${base}${path}${qs ? `?${qs}` : ''}`;
}

/**
 * Images uploaded through the admin panel are stored as `/uploads/<file>` on the server.
 * Prefix them with the API base so they load when the API lives on another origin.
 */
export function resolveMediaUrl(url: string | null | undefined, base = API_BASE_URL): string {
  if (!url) return '';
  if (url.startsWith('/uploads/')) return `${base}${url}`;
  return url;
}
