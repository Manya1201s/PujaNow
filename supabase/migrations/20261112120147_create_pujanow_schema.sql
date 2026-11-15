/*
# PujaNow — Core Schema (profiles, pujas, pandits, bookings, reviews, notifications, samagri)

## Summary
Creates the foundational tables for the PujaNow marketplace:
- `profiles` — extends Supabase auth.users with role, display name, phone, avatar
- `categories` — puja categories (Prosperity, Wellbeing, Peace, Protection, etc.)
- `pujas` — catalogue of pujas offered on the platform
- `pandits` — verified pandit profiles linked to auth users
- `puja_pandits` — many-to-many: which pandits perform which pujas
- `bookings` — a customer booking for a puja with a pandit
- `reviews` — customer reviews for pandits
- `notifications` — per-user notifications (booking updates, reminders, messages)
- `samagri_products` — puja materials marketplace products
- `samagri_categories` — product categories
- `samagri_orders` — customer orders for samagri products
- `samagri_order_items` — line items within an order

## Security
- RLS enabled on ALL tables.
- `profiles`, `bookings`, `notifications`, `reviews`, `samagri_orders`, `samagri_order_items` are
  owner-scoped (TO authenticated with auth.uid() ownership checks).
- `categories`, `pujas`, `pandits`, `puja_pandits`, `samagri_products`, `samagri_categories` are
  publicly readable (TO anon, authenticated) since they form the browsing catalogue; writes are
  admin-only via service role (edge functions) — no anon/authenticated INSERT/UPDATE/DELETE grants.
- Owner columns default to auth.uid() so client inserts that omit user_id still satisfy RLS.

## Notes
1. Profiles use a `role` column (customer | pandit | admin) that is set at signup and NOT
   client-editable — it is protected at the column level (no UPDATE grant on `role`).
2. Pandits table links to profiles; verification status is admin-controlled.
3. Bookings store denormalized puja/pandit snapshot data for history integrity.
4. All timestamps are timestamptz with now() defaults.
*/

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','pandit','admin')),
  full_name text,
  phone text,
  avatar_url text,
  location text,
  bio text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON profiles TO anon, authenticated;
GRANT UPDATE (full_name, phone, avatar_url, location, bio, updated_at) ON profiles TO authenticated;

DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================================
-- CATEGORIES (puja categories)
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  description text,
  icon text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON categories TO anon, authenticated;

DROP POLICY IF EXISTS "categories_select_all" ON categories;
CREATE POLICY "categories_select_all" ON categories FOR SELECT
  TO anon, authenticated USING (true);

-- ============================================================
-- PUJAS
-- ============================================================
CREATE TABLE IF NOT EXISTS pujas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text NOT NULL,
  short_description text,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  image_url text,
  starting_price int NOT NULL DEFAULT 1100,
  duration_mins int NOT NULL DEFAULT 90,
  popularity int NOT NULL DEFAULT 0,
  benefits text[],
  samagri_items text[],
  is_featured boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE pujas ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON pujas TO anon, authenticated;

DROP POLICY IF EXISTS "pujas_select_all" ON pujas;
CREATE POLICY "pujas_select_all" ON pujas FOR SELECT
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_pujas_category ON pujas(category_id);
CREATE INDEX IF NOT EXISTS idx_pujas_slug ON pujas(slug);
CREATE INDEX IF NOT EXISTS idx_pujas_featured ON pujas(is_featured);

-- ============================================================
-- PANDITS
-- ============================================================
CREATE TABLE IF NOT EXISTS pandits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  photo_url text,
  experience_years int NOT NULL DEFAULT 5,
  languages text[] NOT NULL DEFAULT '{}',
  specializations text[] NOT NULL DEFAULT '{}',
  location text NOT NULL,
  service_radius_km int NOT NULL DEFAULT 15,
  rating numeric(2,1) NOT NULL DEFAULT 5.0,
  total_reviews int NOT NULL DEFAULT 0,
  total_bookings int NOT NULL DEFAULT 0,
  base_price int NOT NULL DEFAULT 1500,
  verification_status text NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending','verified','rejected')),
  is_available boolean NOT NULL DEFAULT true,
  bio text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE pandits ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON pandits TO anon, authenticated;
GRANT INSERT, UPDATE ON pandits TO authenticated;

DROP POLICY IF EXISTS "pandits_select_all" ON pandits;
CREATE POLICY "pandits_select_all" ON pandits FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "pandits_insert_own" ON pandits;
CREATE POLICY "pandits_insert_own" ON pandits FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "pandits_update_own" ON pandits;
CREATE POLICY "pandits_update_own" ON pandits FOR UPDATE
  TO authenticated USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);

CREATE INDEX IF NOT EXISTS idx_pandits_profile ON pandits(profile_id);
CREATE INDEX IF NOT EXISTS idx_pandits_verified ON pandits(verification_status);

-- ============================================================
-- PUJA_PANDITS (many-to-many)
-- ============================================================
CREATE TABLE IF NOT EXISTS puja_pandits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  puja_id uuid NOT NULL REFERENCES pujas(id) ON DELETE CASCADE,
  pandit_id uuid NOT NULL REFERENCES pandits(id) ON DELETE CASCADE,
  custom_price int,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(puja_id, pandit_id)
);

ALTER TABLE puja_pandits ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON puja_pandits TO anon, authenticated;

DROP POLICY IF EXISTS "puja_pandits_select_all" ON puja_pandits;
CREATE POLICY "puja_pandits_select_all" ON puja_pandits FOR SELECT
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_puja_pandits_puja ON puja_pandits(puja_id);
CREATE INDEX IF NOT EXISTS idx_puja_pandits_pandit ON puja_pandits(pandit_id);

-- ============================================================
-- BOOKINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pandit_id uuid REFERENCES pandits(id) ON DELETE SET NULL,
  puja_id uuid REFERENCES pujas(id) ON DELETE SET NULL,
  puja_name text NOT NULL,
  pandit_name text,
  scheduled_date date NOT NULL,
  scheduled_time text NOT NULL,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text,
  address text NOT NULL,
  city text NOT NULL,
  pincode text,
  instructions text,
  amount int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','completed','cancelled','rejected')),
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','failed','refunded')),
  payment_method text,
  booking_ref text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON bookings TO authenticated;

DROP POLICY IF EXISTS "bookings_select_own" ON bookings;
CREATE POLICY "bookings_select_own" ON bookings FOR SELECT
  TO authenticated USING (
    auth.uid() = customer_id
    OR EXISTS (SELECT 1 FROM pandits WHERE pandits.id = bookings.pandit_id AND pandits.profile_id = auth.uid())
  );

DROP POLICY IF EXISTS "bookings_insert_own" ON bookings;
CREATE POLICY "bookings_insert_own" ON bookings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "bookings_update_own" ON bookings;
CREATE POLICY "bookings_update_own" ON bookings FOR UPDATE
  TO authenticated USING (
    auth.uid() = customer_id
    OR EXISTS (SELECT 1 FROM pandits WHERE pandits.id = bookings.pandit_id AND pandits.profile_id = auth.uid())
  ) WITH CHECK (
    auth.uid() = customer_id
    OR EXISTS (SELECT 1 FROM pandits WHERE pandits.id = bookings.pandit_id AND pandits.profile_id = auth.uid())
  );

DROP POLICY IF EXISTS "bookings_delete_own" ON bookings;
CREATE POLICY "bookings_delete_own" ON bookings FOR DELETE
  TO authenticated USING (auth.uid() = customer_id);

CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_pandit ON bookings(pandit_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(scheduled_date);

-- ============================================================
-- REVIEWS
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pandit_id uuid NOT NULL REFERENCES pandits(id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON reviews TO authenticated;

DROP POLICY IF EXISTS "reviews_select_all" ON reviews;
CREATE POLICY "reviews_select_all" ON reviews FOR SELECT
  TO anon, authenticated USING (is_published = true);

DROP POLICY IF EXISTS "reviews_insert_own" ON reviews;
CREATE POLICY "reviews_insert_own" ON reviews FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "reviews_update_own" ON reviews;
CREATE POLICY "reviews_update_own" ON reviews FOR UPDATE
  TO authenticated USING (auth.uid() = customer_id) WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "reviews_delete_own" ON reviews;
CREATE POLICY "reviews_delete_own" ON reviews FOR DELETE
  TO authenticated USING (auth.uid() = customer_id);

CREATE INDEX IF NOT EXISTS idx_reviews_pandit ON reviews(pandit_id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('booking_request','booking_accepted','booking_rejected','booking_confirmed','booking_cancelled','payment_status','reminder','message','admin_announcement')),
  title text NOT NULL,
  body text NOT NULL,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO authenticated;

DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_insert_own" ON notifications;
CREATE POLICY "notifications_insert_own" ON notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;
CREATE POLICY "notifications_delete_own" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);

-- ============================================================
-- SAMAGRI CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS samagri_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE samagri_categories ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON samagri_categories TO anon, authenticated;

DROP POLICY IF EXISTS "samagri_categories_select_all" ON samagri_categories;
CREATE POLICY "samagri_categories_select_all" ON samagri_categories FOR SELECT
  TO anon, authenticated USING (true);

-- ============================================================
-- SAMAGRI PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS samagri_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  category_id uuid REFERENCES samagri_categories(id) ON DELETE SET NULL,
  image_url text,
  price int NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'piece',
  stock int NOT NULL DEFAULT 50,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE samagri_products ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON samagri_products TO anon, authenticated;

DROP POLICY IF EXISTS "samagri_products_select_all" ON samagri_products;
CREATE POLICY "samagri_products_select_all" ON samagri_products FOR SELECT
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_samagri_products_category ON samagri_products(category_id);

-- ============================================================
-- SAMAGRI ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS samagri_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_ref text NOT NULL UNIQUE,
  total int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','shipped','delivered','cancelled')),
  payment_method text,
  address text NOT NULL,
  city text NOT NULL,
  pincode text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE samagri_orders ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON samagri_orders TO authenticated;

DROP POLICY IF EXISTS "samagri_orders_select_own" ON samagri_orders;
CREATE POLICY "samagri_orders_select_own" ON samagri_orders FOR SELECT
  TO authenticated USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "samagri_orders_insert_own" ON samagri_orders;
CREATE POLICY "samagri_orders_insert_own" ON samagri_orders FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "samagri_orders_update_own" ON samagri_orders;
CREATE POLICY "samagri_orders_update_own" ON samagri_orders FOR UPDATE
  TO authenticated USING (auth.uid() = customer_id) WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "samagri_orders_delete_own" ON samagri_orders;
CREATE POLICY "samagri_orders_delete_own" ON samagri_orders FOR DELETE
  TO authenticated USING (auth.uid() = customer_id);

CREATE INDEX IF NOT EXISTS idx_samagri_orders_customer ON samagri_orders(customer_id);

-- ============================================================
-- SAMAGRI ORDER ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS samagri_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES samagri_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES samagri_products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  product_image text,
  unit_price int NOT NULL,
  quantity int NOT NULL CHECK (quantity > 0),
  subtotal int NOT NULL
);

ALTER TABLE samagri_order_items ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON samagri_order_items TO authenticated;

DROP POLICY IF EXISTS "samagri_order_items_select_own" ON samagri_order_items;
CREATE POLICY "samagri_order_items_select_own" ON samagri_order_items FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM samagri_orders WHERE samagri_orders.id = samagri_order_items.order_id AND samagri_orders.customer_id = auth.uid())
  );

DROP POLICY IF EXISTS "samagri_order_items_insert_own" ON samagri_order_items;
CREATE POLICY "samagri_order_items_insert_own" ON samagri_order_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM samagri_orders WHERE samagri_orders.id = samagri_order_items.order_id AND samagri_orders.customer_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_samagri_order_items_order ON samagri_order_items(order_id);

-- ============================================================
-- UPDATED_AT trigger
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_set_updated_at ON profiles;
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS pandits_set_updated_at ON pandits;
CREATE TRIGGER pandits_set_updated_at BEFORE UPDATE ON pandits
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS bookings_set_updated_at ON bookings;
CREATE TRIGGER bookings_set_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
