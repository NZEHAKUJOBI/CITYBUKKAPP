# CityBukka Server

REST API for the Chop City Bukka food delivery PWA (`../CityBukka-Web`): customer app, rider
app and admin dashboard. Node.js + Express 5 + PostgreSQL (`pg`).

## Run

```bash
npm install
cp .env.example .env      # set DATABASE_URL (and the secrets / admin variables)
npm run dev               # auto-restarts on changes; http://localhost:8080
npm test
```

Requires Node 22.13+ and PostgreSQL (tested with 16–18). On start the server:

1. exits with `DATABASE_URL is not set` if it is missing;
2. creates the database if it does not exist (connecting to the `postgres` maintenance DB with
   the same credentials — if the user lacks `CREATEDB`, it logs how to create it by hand);
3. applies pending migrations from `src/db/migrations/*.sql` (tracked in `schema_migrations`,
   each in its own transaction).

**Nothing is seeded.** There are no restaurants, dishes, users, riders or images until you add
them. The "All" category (`cat_all`, 🍽️) the customer app uses as a filter is built into the
API, not stored.

### Bootstrapping a fresh install

1. Set `ADMIN_EMAIL` / `ADMIN_PASSWORD` (dev defaults: `admin@citybukka.local` / `changeme`),
   start the server, and log into the admin dashboard (`/admin` in CityBukka-Web).
2. Create categories, then restaurants, then dishes. Upload photos through the dashboard
   (`POST /api/admin/uploads`) and use the returned `/uploads/...` path; image fields may also
   stay `""` (no photo).
3. Create riders (name, phone, password, vehicle). They log in to the rider app with that phone
   and password.
4. Customers register themselves in the app with name, phone and password.

### Tests

`npm test` uses `TEST_DATABASE_URL`, or `DATABASE_URL` with `_test` appended to the database name
(created if missing). Each test file drops and recreates its own schema (`test_api`,
`test_admin`), so the real database is never touched. If no Postgres is reachable the database
suites are skipped with a `# SKIP` message; the pure unit tests still run.

## Configuration

| Variable | Default | Notes |
|---|---|---|
| `PORT` | `8080` | |
| `NODE_ENV` | – | `production` disables the dev admin credentials below |
| `DATABASE_URL` | – (required) | `postgres://USER:PASSWORD@HOST:5432/citybukka` |
| `DATABASE_SSL` (or `PGSSL`) | `false` | `true` = TLS with certificate verification; `no-verify` = TLS accepting any certificate |
| `TEST_DATABASE_URL` | `DATABASE_URL` + `_test` | Tests only |
| `CORS_ORIGINS` | `http://localhost:5000,http://localhost:8000,http://localhost:5173` | Comma-separated |
| `AUTH_TOKEN_SECRET` | random per process (warning logged) | HMAC key for customer/rider tokens. Set it, or every restart logs everyone out |
| `ADMIN_EMAIL` | `admin@citybukka.local` (not in production) | Admin dashboard login |
| `ADMIN_PASSWORD` | `changeme` (not in production) | In production login returns 503 until both are set |
| `ADMIN_NAME` | `Admin` | Display name returned by login and `/me` |
| `ADMIN_TOKEN_SECRET` | random per process | HMAC key for admin tokens |
| `ADMIN_API_KEY` | empty (disabled) | Legacy static bearer key, still accepted on all `/api/admin/*` routes |
| `UPLOAD_DIR` | `./data/uploads` | Uploaded images, served at `/uploads/*` |

## Data model

PostgreSQL tables: `categories`, `restaurants`, `food_items`, `users`, `favorites`, `riders`,
`orders` (+ `schema_migrations`). Ids are `TEXT`; arrays/objects are `JSONB`; money is
`NUMERIC(12,2)` (returned as JSON numbers); times are `TIMESTAMPTZ`.

Users have a `role` (`customer`, `rider` or `admin`), a unique `phone` stored as
`+234XXXXXXXXXX`, an optional `email`, a scrypt password hash and `is_active`. A rider is a user
with role `rider` plus a `riders` row (`vehicle`, `plate_number`, `rating`); the rider's id is
their user id.

## Authentication

Customers and riders log in with phone + password and receive a bearer token (HMAC-SHA256 with
`AUTH_TOKEN_SECRET`, valid 30 days). Send it as `Authorization: Bearer <token>`.

Phone numbers are accepted as `080…`/`070…`/`090…`/`081…` (11 digits), `234…` or `+234…`
(spaces and dashes ignored) and normalised to `+234XXXXXXXXXX`; anything else is
400 `invalid_phone`. Login and register are rate limited to 10 attempts per IP per 15 minutes each
(429 `rate_limited` with `Retry-After`).

| Method | Path | Notes |
|---|---|---|
| POST | `/api/auth/register` | `{ name, phone, password (min 6), email? }` → 201 `{ token, expiresAt, user }` (role `customer`). 409 `phone_taken` |
| POST | `/api/auth/login` | `{ phone, password }` → `{ token, expiresAt, user }` for customers and riders. 401 `invalid_credentials`, 403 `account_disabled` |
| GET | `/api/auth/me` | `{ user }` |

`user` = `{ id, name, phone, email, role, avatarUrl, savedAddresses, selectedAddress, isDarkMode, loyaltyPoints, createdAt }`
(`email` may be `null`).

Protected routes answer 401 `unauthorized` without a valid token and 403 `forbidden` for the
wrong role (403 `account_disabled` if the account was deactivated).

## Public catalogue API (no auth)

All JSON is camelCase. Enum fields are integers: `spiceLevel` (none 0 … bukkaFire 4) and order
`status` (see below). Image fields may be `""`.

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | Checks the database too |
| GET | `/api/meta` | Fees and payment methods |
| GET | `/api/categories` | `cat_all` ("All") first |
| GET | `/api/restaurants?q=&cuisine=` | |
| GET | `/api/restaurants/:id` | |
| GET | `/api/restaurants/:id/menu` | Available items only |
| GET | `/api/food-items?categoryId=&restaurantId=&q=&popular=true` | Available items only |
| GET | `/api/food-items/:id` | |
| GET | `/uploads/:file` | Uploaded images (immutable, cached for a year) |

## Customer API (role `customer`)

| Method | Path | Notes |
|---|---|---|
| GET / PATCH | `/api/me` | Profile. PATCH: `name`, `email`, `avatarUrl`, `savedAddresses`, `selectedAddress`, `isDarkMode` (phone is not editable) |
| GET | `/api/me/favorites` | Full favourite items and restaurants |
| GET | `/api/me/favorites/ids` | |
| PUT / DELETE | `/api/me/favorites/{foods\|restaurants}/:id` | Idempotent |
| POST | `/api/cart/quote` | Server-side pricing and promo validation |
| GET | `/api/orders?status=active\|past` | |
| GET | `/api/orders/:id` | |
| POST | `/api/orders` | Place an order |
| POST | `/api/orders/:id/cancel` | Only while status is `placed` |

Cart and order bodies send **only what the customer chose**. Prices always come from the database:

```json
{
  "items": [{ "foodItemId": "food_jellof_rice", "quantity": 2, "optionIds": ["p_goat", "a_dodo"], "specialInstructions": "Extra pepper" }],
  "promoCode": "BUKKA20",
  "deliveryAddress": "Shiroro Road by Unity Block, Minna",
  "contactPhone": "08031234567",
  "paymentMethod": "Cash on Delivery"
}
```

`deliveryAddress` is required; `contactPhone` defaults to the account's phone.

`Order` = `{ id, items, subtotal, deliveryFee, serviceFee, packagingFee, discount, total, promoCode, status, createdAt, updatedAt, deliveryAddress, contactPhone, paymentMethod, rider: { id, name, phone, vehicle } | null, riderName, riderPhone, riderVehicle, riderRating, estimatedDeliveryMinutes }`
(the flat `rider*` fields are kept for older clients).

Errors look like `{ "error": { "code": "bad_request", "message": "...", "details": [...] } }`.

Order flow: `placed (0) → preparing (1) → riderAssigned (2) → outForDelivery (3) → delivered (4)`,
or `cancelled (5)`. The admin assigns a rider; the rider marks pickup and delivery.

Fees and promo codes live in `src/config.js`.

## Rider API (role `rider`)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/rider/me` | `{ user, rider: { vehicle, plateNumber, isActive } }` |
| GET | `/api/rider/orders?scope=active\|completed` | Only this rider's orders. `active` (default) = riderAssigned/outForDelivery, oldest first; `completed` = delivered/cancelled, latest 50 |
| GET | `/api/rider/orders/:id` | 404 if not assigned to this rider |
| POST | `/api/rider/orders/:id/pickup` | riderAssigned → outForDelivery (409 `invalid_status` otherwise) |
| POST | `/api/rider/orders/:id/deliver` | outForDelivery → delivered (409 `invalid_status` otherwise) |

Rider orders are the `Order` shape plus `customer: { name, phone }`.

## Admin API

### Auth

`POST /api/admin/login` with `{ "email", "password" }` returns
`{ "token", "expiresAt", "admin": { "email", "name" } }` (401 `invalid_credentials` otherwise).
Tokens are HMAC-SHA256 signed with `ADMIN_TOKEN_SECRET` and expire after 12 hours. Login is
rate limited to 10 attempts per IP per 15 minutes (429 `rate_limited` with `Retry-After`).

Every other admin route needs `Authorization: Bearer <token>` (or `Bearer <ADMIN_API_KEY>`
if that is set); otherwise 401 `unauthorized`. Customer/rider tokens are never accepted here.

### Endpoints (all under `/api/admin`)

| Method | Path | Notes |
|---|---|---|
| POST | `/login` | See above |
| GET | `/me` | `{ email, name }` |
| GET | `/stats` | `{ ordersToday, revenueToday, activeOrders, totalOrders, restaurants, foodItems, categories, users, riders, ordersByStatus: { placed, preparing, riderAssigned, outForDelivery, delivered, cancelled }, recentOrders }`. `users` = customers, `riders` = active riders, `categories` includes `cat_all` |
| GET / POST | `/restaurants` | List includes closed restaurants |
| GET / PATCH / DELETE | `/restaurants/:id` | DELETE → 409 `in_use` while it has food items |
| GET / POST | `/categories` | |
| GET / PATCH / DELETE | `/categories/:id` | DELETE → 409 `in_use` while food items use it. `cat_all` is built in: PATCH/DELETE → 409 `in_use` |
| GET / POST | `/food-items?restaurantId=&categoryId=&q=` | List includes unavailable items |
| GET / PATCH / DELETE | `/food-items/:id` | |
| GET | `/orders?status=&q=&limit=&offset=` | `{ items, total }`, newest first. `status` is a name (`preparing`) or code (`1`); `q` matches order id, address, payment method, contact phone, customer name/email/phone, rider name; `limit` 1–200 (default 50) |
| GET | `/orders/:id` | |
| POST | `/orders/:id/advance` | placed → preparing; preparing → 409 `rider_required` (use `/assign`); riderAssigned → outForDelivery → delivered (override); 409 `conflict` if finished |
| POST | `/orders/:id/assign` | `{ riderId }`. Allowed while placed, preparing or riderAssigned (reassign); sets the rider and status riderAssigned. 400 `invalid_rider` if not an active rider, 409 `invalid_status` otherwise |
| POST | `/orders/:id/unassign` | riderAssigned → preparing, rider removed (409 `invalid_status` otherwise) |
| POST | `/orders/:id/cancel` | Any active order |
| GET | `/users?role=customer\|rider` | Users (`User` shape + `isActive`, `orderCount`) |
| GET / POST | `/riders` | Rider = `{ id, name, phone, email, vehicle, plateNumber, isActive, activeOrders, deliveredOrders, createdAt }`. POST `{ name, phone, password, vehicle, plateNumber?, email? }` → 201; 409 `phone_taken` |
| GET / PATCH / DELETE | `/riders/:id` | PATCH `{ name?, phone?, vehicle?, plateNumber?, email?, isActive?, password? }`. DELETE deactivates (204); 409 `in_use` while the rider has active orders |
| POST | `/uploads` | Image upload, see below |

**Catalogue bodies** use the same field names as the GET responses. POST requires `name`
(food items also `restaurantId`, `categoryId`, `price`); everything else falls back to a
default. An `id` may be given (letters, digits, `_`, `-`; 409 if taken), otherwise one is
generated (`rest_…`, `cat_…`, `food_…`). PATCH is partial, and unknown fields (including `id`)
are ignored. Categories also accept an optional `sortOrder`; new ones go to the end.
Customization groups/options without an `id` get a generated one (`grp_…` / `opt_…`).
Image fields (`coverImageUrl`, `logoUrl`, `imageUrl`) accept an absolute `https://` URL,
a `/uploads/…` path, or `""`.

Admin order objects are the customer `Order` shape plus `userId`, `customerName`,
`customerPhone` and `customer: { id, name, phone }`.

**Uploads**: `POST /api/admin/uploads` as `multipart/form-data` with the file in field `image`.
JPEG, PNG and WebP only (checked by magic bytes, not just the declared type), max 5 MB.
Returns `201 { "url": "/uploads/<random>.<ext>" }`; store that path in an image field.
Errors: 415 `unsupported_media_type`, 413 `file_too_large`, 400 for a missing/misnamed field.

## Not built yet

- Multiple admin accounts (there is one admin from env vars; the `admin` user role is reserved).
- Password reset / phone verification (OTP).
- Payments (card/transfer/wallet are recorded as text only), push notifications for order
  status, rate limiting outside the login/register endpoints.
