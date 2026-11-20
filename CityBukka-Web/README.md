# CityBukka Web

The Chop City Bukka customer app as a **React + TypeScript** progressive web app.
It is the only client: there are no native Android or iOS apps. Phones install it
from the browser ("Install app" / "Add to Home Screen").

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
  types.ts              domain models (same JSON shapes as the server)
  config/constants.ts   fees, promo codes, payment methods, hotlines
  data/api.ts           public catalogue API (CityBukka-Server); no bundled demo data
  data/client.ts        JSON client: Bearer session (localStorage, 30-day token), ApiError, 401 handling
  data/customerApi.ts   auth, /api/me, favourites, orders, cart quote, /api/meta
  test/                 test-only fixtures + in-memory fake server (never imported by app code)
  lib/                  formatting and pricing (kobo-precise)
  state/                Auth, Cart, User (profile, favourites, theme), Orders, Toast contexts
  components/           shared widgets
  layout/               phone frame, tab bar, splash, <Screen>
  screens/              one folder per feature
```

## PWA

`vite-plugin-pwa` generates the manifest and a Workbox service worker:
the app shell is precached, uploaded photos (`/uploads/`) are cache-first, the public
catalogue/meta endpoints are network-first, and per-customer endpoints are never cached. Installable on Android/desktop Chrome and via
"Add to Home Screen" on iOS.

## Notes

- Everything comes from CityBukka-Server. Until the admin adds restaurants, dishes, photos
  and prices, the app shows "Our menu is being prepared". Missing photos show a branded
  placeholder, never a stock photo.
- Browsing is public. Saved, Orders, Checkout, Profile and order tracking require a
  customer account (phone + password at /login, /register). The bag is kept on the device
  and can be filled while signed out.
- Order tracking polls every 15 s while an order is active and shows the assigned rider.
