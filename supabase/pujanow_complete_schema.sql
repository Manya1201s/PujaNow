/*
================================================================================
 PujaNow — Complete database schema (for an EMPTY Supabase project)
================================================================================

 Status: PROPOSED — not yet applied. Review before running.

 What this file does
 -------------------
 Creates every table, relationship, constraint, index, trigger and RLS policy
 that the existing frontend (src/lib/data.ts, src/lib/auth.tsx) relies on.

 It consolidates the three files in supabase/migrations/ (schema, nullable
 pandits.profile_id, seed) MINUS the seed data, and fixes the problems found
 when those files were compared with the frontend:

   1. Signup never created a profile: the frontend inserts into `profiles`, but
      no INSERT policy existed. Fixed with an auth.users trigger (+ a guarded
      INSERT policy as a fallback for the existing client code).
   2. Any user could become an admin: role came straight from client-supplied
      signup metadata, and Supabase's default table privileges allowed
      authenticated users to UPDATE `profiles.role`. Role is now limited to
      customer|pandit at signup and is not client-updatable.
   3. Every user's email and phone were publicly readable (profiles SELECT to
      anon USING true). Profiles are now visible to the owner and admins only.
   4. Customers could mark their own bookings `paid`/`confirmed`, change the
      amount, or delete them; pandits could edit any booking column. Booking
      changes are now limited to the real workflow (see bookings section).
   5. Customers could tamper with order prices/totals and set orders to `paid`.
      Line-item prices and order totals are now computed server-side.
   6. Pandits could self-verify and set their own rating/review counts.
   7. Booking notifications to the other party (customer → pandit and
      pandit → customer) were silently rejected by RLS.
   8. No admin access existed anywhere. Admin read/write policies added.

 Not changed: table names, column names, types, enum values — everything the
 frontend queries keeps working as-is.

 How to apply (after approval)
 -----------------------------
   1. Supabase Dashboard → SQL Editor → run this whole file.
   2. Then run the catalogue seed:
        supabase/migrations/20261112120349_seed_pujanow_catalog.sql
   3. Make yourself an admin (optional), in the SQL editor:
        update public.profiles set role = 'admin' where email = '<you@example.com>';

 The file is idempotent: re-running it is safe.

 Secrets: nothing here needs, or exposes, the service-role key. The frontend
 keeps using only the public anon key.
================================================================================
*/

-- ============================================================================
-- 0. EXTENSIONS
-- ============================================================================
create extension if not exists pgcrypto;  -- gen_random_uuid()


-- ============================================================================
-- 1. TABLES
-- ============================================================================

-- ---------- profiles (1:1 with auth.users) ----------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null default '',
  role        text not null default 'customer' check (role in ('customer','pandit','admin')),
  full_name   text,
  phone       text,
  avatar_url  text,
  location    text,
  bio         text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- categories (puja categories) ------------------------------------
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  slug        text not null unique,
  description text,
  icon        text,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- pujas -----------------------------------------------------------
create table if not exists public.pujas (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  slug              text not null unique,
  description       text not null,
  short_description text,
  category_id       uuid references public.categories(id) on delete set null,
  image_url         text,
  starting_price    int  not null default 1100 check (starting_price >= 0),
  duration_mins     int  not null default 90   check (duration_mins > 0),
  popularity        int  not null default 0    check (popularity >= 0),
  benefits          text[],
  samagri_items     text[],
  is_featured       boolean not null default false,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ---------- pandits ---------------------------------------------------------
-- profile_id is NULL for catalogue/demo pandits that have no login.
create table if not exists public.pandits (
  id                  uuid primary key default gen_random_uuid(),
  profile_id          uuid references public.profiles(id) on delete set null,
  display_name        text not null,
  photo_url           text,
  experience_years    int  not null default 5 check (experience_years >= 0),
  languages           text[] not null default '{}',
  specializations     text[] not null default '{}',
  location            text not null,
  service_radius_km   int  not null default 15 check (service_radius_km >= 0),
  rating              numeric(2,1) not null default 5.0 check (rating between 0 and 5),
  total_reviews       int  not null default 0 check (total_reviews >= 0),
  total_bookings      int  not null default 0 check (total_bookings >= 0),
  base_price          int  not null default 1500 check (base_price >= 0),
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','rejected')),
  is_available        boolean not null default true,
  bio                 text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
-- One pandit listing per user account (NULLs allowed for catalogue pandits).
create unique index if not exists pandits_profile_id_key on public.pandits(profile_id) where profile_id is not null;

-- ---------- puja_pandits (which pandits perform which pujas) -----------------
create table if not exists public.puja_pandits (
  id           uuid primary key default gen_random_uuid(),
  puja_id      uuid not null references public.pujas(id)   on delete cascade,
  pandit_id    uuid not null references public.pandits(id) on delete cascade,
  custom_price int check (custom_price is null or custom_price >= 0),
  created_at   timestamptz not null default now(),
  unique (puja_id, pandit_id)
);

-- ---------- bookings ----------------------------------------------------------
-- puja_name / pandit_name are snapshots so history survives catalogue edits.
create table if not exists public.bookings (
  id              uuid primary key default gen_random_uuid(),
  customer_id     uuid not null references public.profiles(id) on delete cascade,
  pandit_id       uuid references public.pandits(id) on delete set null,
  puja_id         uuid references public.pujas(id)   on delete set null,
  puja_name       text not null,
  pandit_name     text,
  scheduled_date  date not null,
  scheduled_time  text not null,          -- e.g. '06:00 AM' (as sent by the UI)
  customer_name   text not null,
  customer_phone  text not null,
  customer_email  text,
  address         text not null,
  city            text not null,
  pincode         text,
  instructions    text,
  amount          int  not null default 0 check (amount >= 0),
  status          text not null default 'pending' check (status in ('pending','confirmed','completed','cancelled','rejected')),
  payment_status  text not null default 'pending' check (payment_status in ('pending','paid','failed','refunded')),
  payment_method  text,
  booking_ref     text not null unique,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------- reviews -----------------------------------------------------------
create table if not exists public.reviews (
  id           uuid primary key default gen_random_uuid(),
  booking_id   uuid not null unique references public.bookings(id) on delete cascade, -- one review per booking
  customer_id  uuid not null references public.profiles(id) on delete cascade,
  pandit_id    uuid not null references public.pandits(id)  on delete cascade,
  rating       int  not null check (rating between 1 and 5),
  comment      text,
  is_published boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------- notifications -----------------------------------------------------
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  type       text not null check (type in (
               'booking_request','booking_accepted','booking_rejected','booking_confirmed',
               'booking_cancelled','payment_status','reminder','message','admin_announcement')),
  title      text not null,
  body       text not null,
  link       text,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- samagri_categories ------------------------------------------------
create table if not exists public.samagri_categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  slug       text not null unique,
  sort_order int  not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- samagri_products --------------------------------------------------
create table if not exists public.samagri_products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  description text,
  category_id uuid references public.samagri_categories(id) on delete set null,
  image_url   text,
  price       int  not null default 0  check (price >= 0),
  unit        text not null default 'piece',
  stock       int  not null default 50 check (stock >= 0),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- samagri_orders ----------------------------------------------------
create table if not exists public.samagri_orders (
  id             uuid primary key default gen_random_uuid(),
  customer_id    uuid not null references public.profiles(id) on delete cascade,
  order_ref      text not null unique,
  total          int  not null default 0 check (total >= 0),
  status         text not null default 'pending' check (status in ('pending','paid','shipped','delivered','cancelled')),
  payment_method text,
  address        text not null,
  city           text not null,
  pincode        text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ---------- samagri_order_items -----------------------------------------------
create table if not exists public.samagri_order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.samagri_orders(id) on delete cascade,
  product_id    uuid references public.samagri_products(id) on delete set null,
  product_name  text not null,
  product_image text,
  unit_price    int  not null check (unit_price >= 0),
  quantity      int  not null check (quantity > 0),
  subtotal      int  not null check (subtotal >= 0),
  created_at    timestamptz not null default now()
);


-- ---------- compatibility with the older migrations ----------------------------
-- No-ops on an empty database. If supabase/migrations/* were applied first, the
-- CREATE TABLE IF NOT EXISTS statements above were skipped, so add what's missing.
alter table public.pandits             alter column profile_id drop not null;
alter table public.categories          add column if not exists updated_at timestamptz not null default now();
alter table public.pujas               add column if not exists updated_at timestamptz not null default now();
alter table public.reviews             add column if not exists updated_at timestamptz not null default now();
alter table public.samagri_categories  add column if not exists updated_at timestamptz not null default now();
alter table public.samagri_products    add column if not exists updated_at timestamptz not null default now();
alter table public.samagri_orders      add column if not exists updated_at timestamptz not null default now();
alter table public.samagri_order_items add column if not exists created_at timestamptz not null default now();
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'reviews_booking_id_key') then
    alter table public.reviews add constraint reviews_booking_id_key unique (booking_id);
  end if;
end $$;


-- ============================================================================
-- 2. INDEXES (match the frontend's filters and sort orders)
-- ============================================================================
create index if not exists idx_pujas_category          on public.pujas(category_id);
create index if not exists idx_pujas_active_popularity on public.pujas(is_active, popularity desc);
create index if not exists idx_pujas_featured          on public.pujas(is_featured) where is_featured;

create index if not exists idx_pandits_verified_rating on public.pandits(verification_status, rating desc);

create index if not exists idx_puja_pandits_puja   on public.puja_pandits(puja_id);
create index if not exists idx_puja_pandits_pandit on public.puja_pandits(pandit_id);

create index if not exists idx_bookings_customer_created on public.bookings(customer_id, created_at desc);
create index if not exists idx_bookings_pandit_created   on public.bookings(pandit_id, created_at desc);
create index if not exists idx_bookings_status           on public.bookings(status);
create index if not exists idx_bookings_date             on public.bookings(scheduled_date);

create index if not exists idx_reviews_pandit_created on public.reviews(pandit_id, created_at desc);
create index if not exists idx_reviews_customer       on public.reviews(customer_id);

create index if not exists idx_notifications_user_created on public.notifications(user_id, created_at desc);
create index if not exists idx_notifications_unread       on public.notifications(user_id) where not is_read;

create index if not exists idx_samagri_products_category on public.samagri_products(category_id);
create index if not exists idx_samagri_products_active   on public.samagri_products(is_active, name);

create index if not exists idx_samagri_orders_customer_created on public.samagri_orders(customer_id, created_at desc);
create index if not exists idx_samagri_order_items_order       on public.samagri_order_items(order_id);
create index if not exists idx_samagri_order_items_product     on public.samagri_order_items(product_id);


-- ============================================================================
-- 3. HELPER FUNCTIONS (SECURITY DEFINER so RLS policies don't recurse)
-- ============================================================================

-- Is the current user an admin?
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Does the current user own the pandit listing `p_pandit_id`?
create or replace function public.is_pandit_owner(p_pandit_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.pandits where id = p_pandit_id and profile_id = auth.uid());
$$;

-- Do the current user and `p_user_id` share a booking (as customer ↔ pandit)?
-- Lets booking notifications reach the other party.
create or replace function public.shares_booking_with(p_user_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.bookings b
    join public.pandits p on p.id = b.pandit_id
    where (b.customer_id = auth.uid() and p.profile_id = p_user_id)
       or (p.profile_id = auth.uid() and b.customer_id = p_user_id)
  );
$$;

-- Is `p_order_id` a pending order owned by the current user?
create or replace function public.owns_pending_order(p_order_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.samagri_orders
    where id = p_order_id and customer_id = auth.uid() and status = 'pending'
  );
$$;

revoke all on function public.is_admin()                  from public;
revoke all on function public.is_pandit_owner(uuid)       from public;
revoke all on function public.shares_booking_with(uuid)   from public;
revoke all on function public.owns_pending_order(uuid)    from public;
grant execute on function public.is_admin()                to anon, authenticated;
grant execute on function public.is_pandit_owner(uuid)     to authenticated;
grant execute on function public.shares_booking_with(uuid) to authenticated;
grant execute on function public.owns_pending_order(uuid)  to authenticated;


-- ============================================================================
-- 4. TRIGGERS
-- ============================================================================

-- ---------- updated_at ---------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['profiles','categories','pujas','pandits','bookings','reviews',
                           'samagri_categories','samagri_products','samagri_orders']
  loop
    execute format('drop trigger if exists %I_set_updated_at on public.%I', t, t);
    execute format('create trigger %I_set_updated_at before update on public.%I
                    for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

-- ---------- profile auto-creation on signup -----------------------------------
-- Role comes from signup metadata but can only ever be customer or pandit.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_role text := coalesce(new.raw_user_meta_data->>'role', 'customer');
begin
  if v_role not in ('customer','pandit') then
    v_role := 'customer';
  end if;
  insert into public.profiles (id, email, role, full_name, phone)
  values (
    new.id,
    coalesce(new.email, ''),
    v_role,
    nullif(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'phone', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for any users who signed up before this trigger existed.
insert into public.profiles (id, email, role, full_name, phone)
select u.id,
       coalesce(u.email, ''),
       case when u.raw_user_meta_data->>'role' = 'pandit' then 'pandit' else 'customer' end,
       nullif(u.raw_user_meta_data->>'full_name', ''),
       nullif(u.raw_user_meta_data->>'phone', '')
from auth.users u
on conflict (id) do nothing;

-- ---------- pandits: protect admin-controlled fields --------------------------
-- Non-admins cannot verify themselves or set their own rating/review/booking counts.
-- auth.uid() IS NULL = SQL editor / service role (e.g. seeding), which is allowed.
create or replace function public.pandits_guard()
returns trigger language plpgsql as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.verification_status := 'pending';
    new.rating              := 0;
    new.total_reviews       := 0;
    new.total_bookings      := 0;
  else
    new.verification_status := old.verification_status;
    new.rating              := old.rating;
    new.total_reviews       := old.total_reviews;
    new.total_bookings      := old.total_bookings;
    new.profile_id          := old.profile_id;
  end if;
  return new;
end;
$$;

drop trigger if exists pandits_guard on public.pandits;
create trigger pandits_guard
  before insert or update on public.pandits
  for each row execute function public.pandits_guard();

-- ---------- bookings: enforce the real status workflow ------------------------
--   customer : pending|confirmed → cancelled            (status only)
--   pandit   : pending → confirmed | rejected
--              confirmed → completed | cancelled        (status only)
--   admin / service role : anything (incl. payment_status)
create or replace function public.bookings_guard_update()
returns trigger language plpgsql as $$
declare
  v_other_changes boolean;
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  v_other_changes :=
    (to_jsonb(new) - 'status' - 'updated_at') is distinct from (to_jsonb(old) - 'status' - 'updated_at');
  if v_other_changes then
    raise exception 'Only the booking status can be changed' using errcode = '42501';
  end if;

  if new.status = old.status then
    return new;
  end if;

  if old.customer_id = auth.uid()
     and old.status in ('pending','confirmed') and new.status = 'cancelled' then
    return new;
  end if;

  if public.is_pandit_owner(old.pandit_id) and (
       (old.status = 'pending'   and new.status in ('confirmed','rejected')) or
       (old.status = 'confirmed' and new.status in ('completed','cancelled'))
     ) then
    return new;
  end if;

  raise exception 'Booking status cannot change from % to %', old.status, new.status using errcode = '42501';
end;
$$;

drop trigger if exists bookings_guard_update on public.bookings;
create trigger bookings_guard_update
  before update on public.bookings
  for each row execute function public.bookings_guard_update();

-- ---------- samagri order items: server-side pricing --------------------------
-- Ignores client-sent prices; uses the product's current price and checks stock.
create or replace function public.order_items_set_price()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_product public.samagri_products%rowtype;
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if new.product_id is null then
    raise exception 'Order items must reference a product' using errcode = '23502';
  end if;

  select * into v_product from public.samagri_products where id = new.product_id and is_active;
  if not found then
    raise exception 'Product is not available' using errcode = 'P0002';
  end if;
  if v_product.stock < new.quantity then
    raise exception 'Only % of "%" in stock', v_product.stock, v_product.name using errcode = '23514';
  end if;

  new.product_name  := v_product.name;
  new.product_image := v_product.image_url;
  new.unit_price    := v_product.price;
  new.subtotal      := v_product.price * new.quantity;
  return new;
end;
$$;

drop trigger if exists order_items_set_price on public.samagri_order_items;
create trigger order_items_set_price
  before insert on public.samagri_order_items
  for each row execute function public.order_items_set_price();

-- Keep samagri_orders.total equal to the sum of its items.
create or replace function public.order_items_sync_total()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_order_id uuid := coalesce(new.order_id, old.order_id);
begin
  update public.samagri_orders o
     set total = coalesce((select sum(subtotal) from public.samagri_order_items where order_id = v_order_id), 0)
   where o.id = v_order_id;
  return null;
end;
$$;

drop trigger if exists order_items_sync_total on public.samagri_order_items;
create trigger order_items_sync_total
  after insert or update or delete on public.samagri_order_items
  for each row execute function public.order_items_sync_total();

-- Non-admins cannot change an order after placing it (status/payment are admin-controlled).
create or replace function public.samagri_orders_guard_update()
returns trigger language plpgsql as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  raise exception 'Orders can only be updated by an administrator' using errcode = '42501';
end;
$$;

drop trigger if exists samagri_orders_guard_update on public.samagri_orders;
create trigger samagri_orders_guard_update
  before update on public.samagri_orders
  for each row
  when (pg_trigger_depth() = 0)   -- allow the total-sync trigger above
  execute function public.samagri_orders_guard_update();


-- ============================================================================
-- 5. PRIVILEGES
-- ============================================================================
-- Supabase grants ALL on new public tables to anon/authenticated by default, so
-- reset everything and grant only what the app needs. RLS (below) then decides
-- which rows each user can touch.

revoke all on all tables in schema public from anon, authenticated;

-- Public catalogue (read-only for visitors)
grant select on public.categories, public.pujas, public.pandits, public.puja_pandits,
                public.samagri_categories, public.samagri_products, public.reviews
  to anon, authenticated;

-- Admin-only writes on the catalogue (RLS restricts to admins)
grant insert, update, delete on public.categories, public.pujas, public.puja_pandits,
                                public.samagri_categories, public.samagri_products
  to authenticated;

-- profiles: role and email are NOT client-updatable
grant select, insert on public.profiles to authenticated;
-- The pandit page embeds `customer:profiles(full_name)` in the reviews query. Without
-- this column grant, logged-out visitors would get "permission denied" and the whole
-- reviews list would fail. No anon RLS policy exists, so the embed returns null and
-- the UI shows "Anonymous" — no email/phone is ever exposed.
grant select (id, full_name) on public.profiles to anon;
grant update (full_name, phone, avatar_url, location, bio) on public.profiles to authenticated;

grant insert, update, delete on public.pandits to authenticated;

grant select, insert, update on public.bookings to authenticated;
grant delete on public.bookings to authenticated;               -- RLS: admins only

grant insert, update, delete on public.reviews to authenticated;

grant select, insert, delete on public.notifications to authenticated;
grant update (is_read) on public.notifications to authenticated;

grant select, insert, update, delete on public.samagri_orders      to authenticated;
grant select, insert, update, delete on public.samagri_order_items to authenticated;


-- ============================================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================================
alter table public.profiles            enable row level security;
alter table public.categories          enable row level security;
alter table public.pujas               enable row level security;
alter table public.pandits             enable row level security;
alter table public.puja_pandits        enable row level security;
alter table public.bookings            enable row level security;
alter table public.reviews             enable row level security;
alter table public.notifications       enable row level security;
alter table public.samagri_categories  enable row level security;
alter table public.samagri_products    enable row level security;
alter table public.samagri_orders      enable row level security;
alter table public.samagri_order_items enable row level security;

-- Drop policies from the original migrations (names differ from the new ones).
do $$
declare r record;
begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public' loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- ---------- profiles ----------------------------------------------------------
create policy profiles_select_own_or_admin on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());

-- Fallback for src/lib/auth.tsx, which inserts a profile if none exists.
create policy profiles_insert_self on public.profiles for insert to authenticated
  with check (id = auth.uid() and role in ('customer','pandit'));

create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- ---------- categories / samagri_categories (public read, admin write) --------
create policy categories_select_all on public.categories for select to anon, authenticated using (true);
create policy categories_admin_write on public.categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy samagri_categories_select_all on public.samagri_categories for select to anon, authenticated using (true);
create policy samagri_categories_admin_write on public.samagri_categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- pujas / samagri_products (active items public, admin sees all) ----
create policy pujas_select_active on public.pujas for select to anon, authenticated
  using (is_active or public.is_admin());
create policy pujas_admin_write on public.pujas for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy samagri_products_select_active on public.samagri_products for select to anon, authenticated
  using (is_active or public.is_admin());
create policy samagri_products_admin_write on public.samagri_products for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- pandits -------------------------------------------------------------
-- Public sees verified pandits; a pandit sees their own pending/rejected listing.
create policy pandits_select_visible on public.pandits for select to anon, authenticated
  using (verification_status = 'verified' or profile_id = auth.uid() or public.is_admin());

create policy pandits_insert_own on public.pandits for insert to authenticated
  with check (
    public.is_admin()
    or (profile_id = auth.uid()
        and exists (select 1 from public.profiles where id = auth.uid() and role = 'pandit'))
  );

create policy pandits_update_own on public.pandits for update to authenticated
  using (profile_id = auth.uid() or public.is_admin())
  with check (profile_id = auth.uid() or public.is_admin());

create policy pandits_delete_admin on public.pandits for delete to authenticated
  using (public.is_admin());

-- ---------- puja_pandits ------------------------------------------------------------
create policy puja_pandits_select_all on public.puja_pandits for select to anon, authenticated using (true);
create policy puja_pandits_admin_write on public.puja_pandits for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- bookings ------------------------------------------------------------
create policy bookings_select_participants on public.bookings for select to authenticated
  using (customer_id = auth.uid() or public.is_pandit_owner(pandit_id) or public.is_admin());

-- New bookings are always created as pending + unpaid (no payment gateway yet).
create policy bookings_insert_own on public.bookings for insert to authenticated
  with check (
    customer_id = auth.uid()
    and status = 'pending'
    and payment_status = 'pending'
  );

-- Allowed transitions are enforced by the bookings_guard_update trigger.
create policy bookings_update_participants on public.bookings for update to authenticated
  using (customer_id = auth.uid() or public.is_pandit_owner(pandit_id) or public.is_admin())
  with check (customer_id = auth.uid() or public.is_pandit_owner(pandit_id) or public.is_admin());

create policy bookings_delete_admin on public.bookings for delete to authenticated
  using (public.is_admin());

-- ---------- reviews -----------------------------------------------------------------
create policy reviews_select_published on public.reviews for select to anon, authenticated
  using (is_published or customer_id = auth.uid() or public.is_admin());

-- Only for your own completed booking, and only for the pandit on that booking.
create policy reviews_insert_own_completed on public.reviews for insert to authenticated
  with check (
    customer_id = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = reviews.booking_id
        and b.customer_id = auth.uid()
        and b.status = 'completed'
        and b.pandit_id = reviews.pandit_id
    )
  );

create policy reviews_update_own on public.reviews for update to authenticated
  using (customer_id = auth.uid() or public.is_admin())
  with check (customer_id = auth.uid() or public.is_admin());

create policy reviews_delete_own on public.reviews for delete to authenticated
  using (customer_id = auth.uid() or public.is_admin());

-- ---------- notifications -------------------------------------------------------------
create policy notifications_select_own on public.notifications for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Yourself, the other party on a shared booking, or anyone (admins).
create policy notifications_insert_related on public.notifications for insert to authenticated
  with check (
    user_id = auth.uid()
    or public.shares_booking_with(user_id)
    or public.is_admin()
  );

create policy notifications_update_own on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy notifications_delete_own on public.notifications for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- ---------- samagri_orders ---------------------------------------------------------------
create policy samagri_orders_select_own on public.samagri_orders for select to authenticated
  using (customer_id = auth.uid() or public.is_admin());

create policy samagri_orders_insert_own on public.samagri_orders for insert to authenticated
  with check (customer_id = auth.uid() and status = 'pending');

create policy samagri_orders_update_admin on public.samagri_orders for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy samagri_orders_delete_admin on public.samagri_orders for delete to authenticated
  using (public.is_admin());

-- ---------- samagri_order_items ------------------------------------------------------------
create policy samagri_order_items_select_own on public.samagri_order_items for select to authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.samagri_orders o where o.id = samagri_order_items.order_id and o.customer_id = auth.uid())
  );

-- Items can only be added to your own order while it is still pending.
create policy samagri_order_items_insert_own on public.samagri_order_items for insert to authenticated
  with check (public.owns_pending_order(order_id) or public.is_admin());

create policy samagri_order_items_admin_modify on public.samagri_order_items for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy samagri_order_items_admin_delete on public.samagri_order_items for delete to authenticated
  using (public.is_admin());

-- ============================================================================
-- END
-- ============================================================================
