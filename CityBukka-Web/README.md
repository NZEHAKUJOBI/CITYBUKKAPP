# CityBukka Web

The Chop City Bukka customer app as a **React + TypeScript** progressive web app.
It replaces the Flutter web build (`../CityBukka-MX`); the Flutter project is still
used for the Android and iOS apps.

## Run

```bash
npm install
npm run dev        # http://localhost:5173 – /api is proxied to CityBukka-Server on :8080
npm test           # unit + screen tests (Vitest)
npm run typecheck
npm run build      # type-checks, then builds to dist/ with the service worker
npm run preview    # serve the production build locally
```

Deploy `dist/` to any static host over **HTTPS**. Configure it to serve `index.html`
for unknown paths (single-page app), e.g. Netlify `_redirects`: `/* /index.html 200`.

## Structure

```
src/
  types.ts              domain models (same JSON shapes as the Dart models and the server)
  config/constants.ts   fees, promo codes, payment methods, hotlines
  data/api.ts           catalogue API – mock implementation today, same shape as the server's
  data/mockData.ts      generated from CityBukka-Server/src/db/seed.js
  lib/                  formatting and pricing (kobo-precise)
  state/                Cart, User (profile, favourites, theme), Orders, Toast contexts
  components/           shared widgets ported from lib/ui/core/widgets
  layout/               phone frame, tab bar, splash, <Screen>
  screens/              one folder per Flutter feature
```

## PWA

`vite-plugin-pwa` generates the manifest and a Workbox service worker:
the app shell is precached, food photos are cached (up to 80, 30 days), and `/api`
calls are network-first. Installable on Android/desktop Chrome and via
"Add to Home Screen" on iOS.

## Differences from the Flutter app

- Cart, favourites, profile and orders are saved on the device (localStorage), so they
  survive restarts. In Flutter they were in memory only.
- Orders get a rider when they reach "Rider Assigned", not at checkout, like the server.
- Data still comes from bundled mock data. Switching `src/data/api.ts` and the order
  functions to `CityBukka-Server` is the next step.
