-- Initial PostgreSQL schema for CityBukka.
-- Money is NUMERIC(12,2) (naira with kobo); repositories convert it to JS numbers.

CREATE TABLE categories (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  icon_emoji  TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE restaurants (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  tagline           TEXT NOT NULL DEFAULT '',
  description       TEXT NOT NULL DEFAULT '',
  cover_image_url   TEXT NOT NULL DEFAULT '',
  logo_url          TEXT NOT NULL DEFAULT '',
  rating            DOUBLE PRECISION NOT NULL DEFAULT 0,
  review_count      INTEGER NOT NULL DEFAULT 0,
  delivery_time_min INTEGER NOT NULL DEFAULT 20,
  delivery_time_max INTEGER NOT NULL DEFAULT 40,
  delivery_fee      NUMERIC(12,2) NOT NULL DEFAULT 0,
  distance_km       DOUBLE PRECISION NOT NULL DEFAULT 0,
  cuisines          JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_featured       BOOLEAN NOT NULL DEFAULT false,
  is_open           BOOLEAN NOT NULL DEFAULT true,
  address           TEXT NOT NULL DEFAULT '',
  badges            JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE food_items (
  id                   TEXT PRIMARY KEY,
  restaurant_id        TEXT NOT NULL REFERENCES restaurants(id),
  category_id          TEXT NOT NULL REFERENCES categories(id),
  name                 TEXT NOT NULL,
  description          TEXT NOT NULL DEFAULT '',
  price                NUMERIC(12,2) NOT NULL,
  image_url            TEXT NOT NULL DEFAULT '',
  spice_level          INTEGER NOT NULL DEFAULT 0,
  rating               DOUBLE PRECISION NOT NULL DEFAULT 0,
  review_count         INTEGER NOT NULL DEFAULT 0,
  calories             INTEGER NOT NULL DEFAULT 0,
  prep_time_minutes    INTEGER NOT NULL DEFAULT 15,
  is_popular           BOOLEAN NOT NULL DEFAULT false,
  is_chef_special      BOOLEAN NOT NULL DEFAULT false,
  is_vegetarian        BOOLEAN NOT NULL DEFAULT false,
  is_available         BOOLEAN NOT NULL DEFAULT true,
  -- [{id, name, isRequired, maxSelectable, options: [{id, name, extraPrice}]}]
  customization_groups JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_food_restaurant ON food_items(restaurant_id);
CREATE INDEX idx_food_category ON food_items(category_id);

CREATE TABLE users (
  id               TEXT PRIMARY KEY,
  role             TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'rider', 'admin')),
  name             TEXT NOT NULL,
  phone            TEXT NOT NULL UNIQUE,          -- normalised +234XXXXXXXXXX
  email            TEXT,
  password_hash    TEXT NOT NULL,                 -- scrypt$N$r$p$salt$hash
  avatar_url       TEXT NOT NULL DEFAULT '',
  loyalty_points   INTEGER NOT NULL DEFAULT 0,
  saved_addresses  JSONB NOT NULL DEFAULT '[]'::jsonb,
  selected_address TEXT NOT NULL DEFAULT '',
  is_dark_mode     BOOLEAN NOT NULL DEFAULT true,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_role ON users(role);

CREATE TABLE favorites (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL CHECK (kind IN ('food', 'restaurant')),
  target_id  TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (user_id, kind, target_id)
);

-- Rider-specific details; the rider's login, name, phone and active flag live on users (role 'rider').
CREATE TABLE riders (
  user_id      TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  vehicle      TEXT NOT NULL,
  plate_number TEXT,
  rating       DOUBLE PRECISION NOT NULL DEFAULT 5
);

CREATE TABLE orders (
  id                         TEXT PRIMARY KEY,
  user_id                    TEXT NOT NULL REFERENCES users(id),
  items                      JSONB NOT NULL,      -- CartItem[] snapshot at order time
  subtotal                   NUMERIC(12,2) NOT NULL,
  delivery_fee               NUMERIC(12,2) NOT NULL,
  service_fee                NUMERIC(12,2) NOT NULL,
  packaging_fee              NUMERIC(12,2) NOT NULL,
  discount                   NUMERIC(12,2) NOT NULL,
  total                      NUMERIC(12,2) NOT NULL,
  promo_code                 TEXT,
  status                     INTEGER NOT NULL DEFAULT 0 CHECK (status BETWEEN 0 AND 5),
  delivery_address           TEXT NOT NULL,
  contact_phone              TEXT NOT NULL,
  payment_method             TEXT NOT NULL,
  rider_id                   TEXT REFERENCES riders(user_id),
  estimated_delivery_minutes INTEGER NOT NULL,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_orders_user ON orders(user_id, created_at DESC);
CREATE INDEX idx_orders_rider ON orders(rider_id, status);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
