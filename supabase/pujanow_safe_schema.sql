/*
================================================================================
 PujaNow — NON-DESTRUCTIVE schema (safe alternative to pujanow_complete_schema.sql)
================================================================================

 Status: PROPOSED — not yet applied. Review before running.

 Same tables, columns, constraints, indexes, triggers and RLS rules as
 pujanow_complete_schema.sql, rewritten so that it:

   • contains no statements that remove tables, columns, rows, policies,
     triggers or functions;
   • never touches objects outside PujaNow's 12 tables
       (no schema-wide REVOKE, no schema-wide policy removal);
   • never replaces an object it did not create itself — every function,
     trigger and policy has a PujaNow-specific name
       functions : public.pujanow_*        triggers/policies : pn_*
     so CREATE OR REPLACE can only ever update this file's own objects;
   • only ADDS: tables / columns / indexes / policies that are missing;
   • runs in ONE transaction — if any statement fails, nothing is changed;
   • stops before changing anything (pre-flight checks) if it finds something
     it can't safely merge with, e.g. a different app's `profiles` table or
     older policies whose rules would combine with the new ones.

 Re-running it is safe (idempotent).

 How to apply (after approval)
 -----------------------------
   1. Supabase Dashboard → SQL Editor → run this whole file.
   2. Then run the catalogue seed:
        supabase/migrations/20261112120349_seed_pujanow_catalog.sql
   3. Optional — make yourself an admin:
        update public.profiles set role = 'admin' where email = '<you@example.com>';

 Requires PostgreSQL 14+ (for CREATE OR REPLACE TRIGGER). All current Supabase
 projects run 15 or newer.
================================================================================
*/

begin;

-- ============================================================================
-- 0. PRE-FLIGHT CHECKS (read-only; aborts the whole script if unsafe)
-- ============================================================================
do $$
declare
  v_tables   text[] := array['profiles','categories','pujas','pandits','puja_pandits','bookings','reviews',
                             'notifications','samagri_categories','samagri_products','samagri_orders','samagri_order_items'];
  v_existing text;
  v_foreign  text;
  v_missing  text;
begin
  if current_setting('server_version_num')::int < 140000 then
    raise exception 'PujaNow schema needs PostgreSQL 14 or newer (found %).', current_setting('server_version');
  end if;

  -- Report tables that already exist (they will be kept as-is, not recreated).
  select string_agg(table_name, ', ') into v_existing
  from information_schema.tables
  where table_schema = 'public' and table_name = any(v_tables);
  if v_existing is not null then
    raise notice 'Existing tables kept unchanged (only missing columns/indexes/policies are added): %', v_existing;
  end if;

  -- If a table with one of our names exists but has a different shape, it most
  -- likely belongs to another app. Stop rather than attach PujaNow rules to it.
  select string_agg(format('%s.%s', t.tbl, t.col), ', ') into v_missing
  from (values
    ('profiles','role'), ('profiles','email'),
    ('pujas','slug'), ('pujas','starting_price'),
    ('pandits','verification_status'), ('pandits','display_name'),
    ('bookings','booking_ref'), ('bookings','customer_id'),
    ('samagri_products','price'), ('samagri_orders','order_ref'),
    ('notifications','user_id'), ('reviews','booking_id')
  ) as t(tbl, col)
  where exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = t.tbl)
    and not exists (select 1 from information_schema.columns
                    where table_schema = 'public' and table_name = t.tbl and column_name = t.col);
  if v_missing is not null then
    raise exception 'A table with a PujaNow name already exists but is missing PujaNow columns (%). It probably belongs to another app — nothing was changed.', v_missing;
  end if;

  -- RLS policies are OR-ed together. Policies not created by this file (e.g. the
  -- old "profiles_select_all ... USING (true)") would silently keep their wider
  -- access. This script will not remove them; list them so you can review first.
  select string_agg(format('%s on %s', policyname, tablename), '; ') into v_foreign
  from pg_policies
  where schemaname = 'public' and tablename = any(v_tables) and policyname not like 'pn\_%';
  if v_foreign is not null then
    raise exception 'Found existing RLS policies that were not created by this file: %. They would combine with the new rules and could keep data exposed. Review/remove them deliberately, then re-run. Nothing was changed.', v_foreign;
  end if;
end $$;


-- ============================================================================
-- 0b. EXTENSIONS
-- ============================================================================
create extension if not exists pgcrypto;  -- gen_random_uuid()


-- ============================================================================
-- 1. TABLES (created only if missing)
-- ============================================================================

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

create table if not exists public.puja_pandits (
  id           uuid primary key default gen_random_uuid(),
  puja_id      uuid not null references public.pujas(id)   on delete cascade,
  pandit_id    uuid not null references public.pandits(id) on delete cascade,
  custom_price int check (custom_price is null or custom_price >= 0),
  created_at   timestamptz not null default now(),
  unique (puja_id, pandit_id)
);

-- puja_name / pandit_name are snapshots so history survives catalogue edits.
create table if not exists public.bookings (
  id              uuid primary key default gen_random_uuid(),
  customer_id     uuid not null references public.profiles(id) on delete cascade,
  pandit_id       uuid references public.pandits(id) on delete set null,
  puja_id         uuid references public.pujas(id)   on delete set null,
  puja_name       text not null,
  pandit_name     text,
  scheduled_date  date not null,
  scheduled_time  text not null,
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

create table if not exists public.reviews (
  id           uuid primary key default gen_random_uuid(),
  booking_id   uuid not null references public.bookings(id) on delete cascade,
  customer_id  uuid not null references public.profiles(id) on delete cascade,
  pandit_id    uuid not null references public.pandits(id)  on delete cascade,
  rating       int  not null check (rating between 1 and 5),
  comment      text,
  is_published boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint reviews_booking_id_key unique (booking_id)   -- one review per booking
);

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

create table if not exists public.samagri_categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  slug       text not null unique,
  sort_order int  not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

-- Additive only: columns the app relies on, in case a table already existed
-- without them. (Adds a column with a default; never removes or rewrites data.)
alter table public.categories          add column if not exists updated_at timestamptz not null default now();
alter table public.pujas               add column if not exists updated_at timestamptz not null default now();
alter table public.reviews             add column if not exists updated_at timestamptz not null default now();
alter table public.samagri_categories  add column if not exists updated_at timestamptz not null default now();
alter table public.samagri_products    add column if not exists updated_at timestamptz not null default now();
alter table public.samagri_orders      add column if not exists updated_at timestamptz not null default now();
alter table public.samagri_order_items add column if not exists created_at timestamptz not null default now();


-- ============================================================================
-- 2. INDEXES (created only if missing)
-- ============================================================================
create unique index if not exists pandits_profile_id_key on public.pandits(profile_id) where profile_id is not null;

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
-- 3. HELPER FUNCTIONS (PujaNow-specific names; SECURITY DEFINER avoids RLS recursion)
-- ============================================================================

create or replace function public.pujanow_is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.pujanow_is_pandit_owner(p_pandit_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.pandits where id = p_pandit_id and profile_id = auth.uid());
$$;

-- Do the current user and p_user_id share a booking (customer ↔ pandit)?
create or replace function public.pujanow_shares_booking_with(p_user_id uuid)
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

create or replace function public.pujanow_owns_pending_order(p_order_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.samagri_orders
    where id = p_order_id and customer_id = auth.uid() and status = 'pending'
  );
$$;

-- Limit who can call the helpers (these REVOKEs only affect the functions above).
revoke all on function public.pujanow_is_admin()                from public;
revoke all on function public.pujanow_is_pandit_owner(uuid)     from public;
revoke all on function public.pujanow_shares_booking_with(uuid) from public;
revoke all on function public.pujanow_owns_pending_order(uuid)  from public;
grant execute on function public.pujanow_is_admin()                to anon, authenticated;
grant execute on function public.pujanow_is_pandit_owner(uuid)     to authenticated;
grant execute on function public.pujanow_shares_booking_with(uuid) to authenticated;
grant execute on function public.pujanow_owns_pending_order(uuid)  to authenticated;


-- ============================================================================
-- 4. TRIGGERS (CREATE OR REPLACE TRIGGER with pn_* names — nothing removed)
-- ============================================================================

create or replace function public.pujanow_set_updated_at()
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
    execute format('create or replace trigger pn_set_updated_at before update on public.%I
                    for each row execute function public.pujanow_set_updated_at()', t);
  end loop;
end $$;

-- ---------- profile auto-creation on signup ------------------------------------
-- Adds a NEW trigger on auth.users named pn_on_auth_user_created. Any existing
-- trigger on auth.users (e.g. "on_auth_user_created") is left untouched.
-- Role from signup metadata is limited to customer|pandit (never admin).
create or replace function public.pujanow_handle_new_user()
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

create or replace trigger pn_on_auth_user_created
  after insert on auth.users
  for each row execute function public.pujanow_handle_new_user();

-- Additive backfill: create profiles for users who signed up before this
-- trigger existed. Existing profiles are never modified (ON CONFLICT DO NOTHING).
insert into public.profiles (id, email, role, full_name, phone)
select u.id,
       coalesce(u.email, ''),
       case when u.raw_user_meta_data->>'role' = 'pandit' then 'pandit' else 'customer' end,
       nullif(u.raw_user_meta_data->>'full_name', ''),
       nullif(u.raw_user_meta_data->>'phone', '')
from auth.users u
on conflict (id) do nothing;

-- ---------- pandits: admin-controlled fields ------------------------------------
-- auth.uid() IS NULL = SQL editor / service role (e.g. seeding), which is allowed.
create or replace function public.pujanow_pandits_guard()
returns trigger language plpgsql as $$
begin
  if auth.uid() is null or public.pujanow_is_admin() then
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

create or replace trigger pn_pandits_guard
  before insert or update on public.pandits
  for each row execute function public.pujanow_pandits_guard();

-- ---------- bookings: enforce the real status workflow ------------------------
--   customer : pending|confirmed → cancelled            (status only)
--   pandit   : pending → confirmed | rejected
--              confirmed → completed | cancelled        (status only)
--   admin / service role : anything (incl. payment_status)
create or replace function public.pujanow_bookings_guard_update()
returns trigger language plpgsql as $$
begin
  if auth.uid() is null or public.pujanow_is_admin() then
    return new;
  end if;

  if (to_jsonb(new) - 'status' - 'updated_at') is distinct from (to_jsonb(old) - 'status' - 'updated_at') then
    raise exception 'Only the booking status can be changed' using errcode = '42501';
  end if;

  if new.status = old.status then
    return new;
  end if;

  if old.customer_id = auth.uid()
     and old.status in ('pending','confirmed') and new.status = 'cancelled' then
    return new;
  end if;

  if public.pujanow_is_pandit_owner(old.pandit_id) and (
       (old.status = 'pending'   and new.status in ('confirmed','rejected')) or
       (old.status = 'confirmed' and new.status in ('completed','cancelled'))
     ) then
    return new;
  end if;

  raise exception 'Booking status cannot change from % to %', old.status, new.status using errcode = '42501';
end;
$$;

create or replace trigger pn_bookings_guard_update
  before update on public.bookings
  for each row execute function public.pujanow_bookings_guard_update();

-- ---------- samagri order items: server-side pricing ----------------------------
create or replace function public.pujanow_order_items_set_price()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_product public.samagri_products%rowtype;
begin
  if auth.uid() is null or public.pujanow_is_admin() then
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

create or replace trigger pn_order_items_set_price
  before insert on public.samagri_order_items
  for each row execute function public.pujanow_order_items_set_price();

-- Keep samagri_orders.total equal to the sum of its items.
create or replace function public.pujanow_order_items_sync_total()
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

create or replace trigger pn_order_items_sync_total
  after insert or update or delete on public.samagri_order_items
  for each row execute function public.pujanow_order_items_sync_total();

-- Non-admins cannot change an order after placing it.
create or replace function public.pujanow_orders_guard_update()
returns trigger language plpgsql as $$
begin
  if auth.uid() is null or public.pujanow_is_admin() then
    return new;
  end if;
  raise exception 'Orders can only be updated by an administrator' using errcode = '42501';
end;
$$;

create or replace trigger pn_orders_guard_update
  before update on public.samagri_orders
  for each row
  when (pg_trigger_depth() = 0)   -- allow the total-sync trigger above
  execute function public.pujanow_orders_guard_update();


-- ============================================================================
-- 5. PRIVILEGES — scoped to PujaNow's 12 tables only
-- ============================================================================
-- Supabase gives anon/authenticated ALL privileges on new public tables. These
-- tables are reset to least privilege; RLS (below) then picks the rows. No other
-- table in your project is touched.
revoke all on table
  public.profiles, public.categories, public.pujas, public.pandits, public.puja_pandits,
  public.bookings, public.reviews, public.notifications, public.samagri_categories,
  public.samagri_products, public.samagri_orders, public.samagri_order_items
from anon, authenticated;

grant select on public.categories, public.pujas, public.pandits, public.puja_pandits,
                public.samagri_categories, public.samagri_products, public.reviews
  to anon, authenticated;

grant insert, update, delete on public.categories, public.pujas, public.puja_pandits,
                                public.samagri_categories, public.samagri_products
  to authenticated;                                   -- RLS: admins only

-- profiles: role and email are not client-updatable
grant select, insert on public.profiles to authenticated;
grant update (full_name, phone, avatar_url, location, bio) on public.profiles to authenticated;
-- Lets the reviews query's `customer:profiles(full_name)` embed succeed for
-- logged-out visitors; with no anon policy it returns null ("Anonymous").
grant select (id, full_name) on public.profiles to anon;

grant insert, update, delete on public.pandits to authenticated;
grant select, insert, update, delete on public.bookings to authenticated;   -- delete: RLS admins only
grant insert, update, delete on public.reviews to authenticated;
grant select, insert, delete on public.notifications to authenticated;
grant update (is_read) on public.notifications to authenticated;
grant select, insert, update, delete on public.samagri_orders      to authenticated;
grant select, insert, update, delete on public.samagri_order_items to authenticated;


-- ============================================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================================
-- Enabling RLS never deletes data. On a table with no policies it blocks API
-- access, which is why policies are created right after, in the same transaction.
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

-- Postgres has no CREATE POLICY IF NOT EXISTS, so each policy is created only
-- when a policy with that name is not already on that table. Nothing is dropped.
do $$
declare p record;
begin
  for p in
    select * from (values
      -- profiles
      ('profiles', 'pn_profiles_select', $p$for select to authenticated
         using (id = auth.uid() or public.pujanow_is_admin())$p$),
      ('profiles', 'pn_profiles_insert_self', $p$for insert to authenticated
         with check (id = auth.uid() and role in ('customer','pandit'))$p$),
      ('profiles', 'pn_profiles_update', $p$for update to authenticated
         using (id = auth.uid() or public.pujanow_is_admin())
         with check (id = auth.uid() or public.pujanow_is_admin())$p$),

      -- categories / samagri_categories
      ('categories', 'pn_categories_select', $p$for select to anon, authenticated using (true)$p$),
      ('categories', 'pn_categories_admin_write', $p$for all to authenticated
         using (public.pujanow_is_admin()) with check (public.pujanow_is_admin())$p$),
      ('samagri_categories', 'pn_samagri_categories_select', $p$for select to anon, authenticated using (true)$p$),
      ('samagri_categories', 'pn_samagri_categories_admin_write', $p$for all to authenticated
         using (public.pujanow_is_admin()) with check (public.pujanow_is_admin())$p$),

      -- pujas / samagri_products
      ('pujas', 'pn_pujas_select', $p$for select to anon, authenticated
         using (is_active or public.pujanow_is_admin())$p$),
      ('pujas', 'pn_pujas_admin_write', $p$for all to authenticated
         using (public.pujanow_is_admin()) with check (public.pujanow_is_admin())$p$),
      ('samagri_products', 'pn_samagri_products_select', $p$for select to anon, authenticated
         using (is_active or public.pujanow_is_admin())$p$),
      ('samagri_products', 'pn_samagri_products_admin_write', $p$for all to authenticated
         using (public.pujanow_is_admin()) with check (public.pujanow_is_admin())$p$),

      -- pandits
      ('pandits', 'pn_pandits_select', $p$for select to anon, authenticated
         using (verification_status = 'verified' or profile_id = auth.uid() or public.pujanow_is_admin())$p$),
      ('pandits', 'pn_pandits_insert', $p$for insert to authenticated
         with check (public.pujanow_is_admin()
           or (profile_id = auth.uid()
               and exists (select 1 from public.profiles where id = auth.uid() and role = 'pandit')))$p$),
      ('pandits', 'pn_pandits_update', $p$for update to authenticated
         using (profile_id = auth.uid() or public.pujanow_is_admin())
         with check (profile_id = auth.uid() or public.pujanow_is_admin())$p$),
      ('pandits', 'pn_pandits_delete_admin', $p$for delete to authenticated
         using (public.pujanow_is_admin())$p$),

      -- puja_pandits
      ('puja_pandits', 'pn_puja_pandits_select', $p$for select to anon, authenticated using (true)$p$),
      ('puja_pandits', 'pn_puja_pandits_admin_write', $p$for all to authenticated
         using (public.pujanow_is_admin()) with check (public.pujanow_is_admin())$p$),

      -- bookings (status transitions enforced by pn_bookings_guard_update)
      ('bookings', 'pn_bookings_select', $p$for select to authenticated
         using (customer_id = auth.uid() or public.pujanow_is_pandit_owner(pandit_id) or public.pujanow_is_admin())$p$),
      ('bookings', 'pn_bookings_insert', $p$for insert to authenticated
         with check (customer_id = auth.uid() and status = 'pending' and payment_status = 'pending')$p$),
      ('bookings', 'pn_bookings_update', $p$for update to authenticated
         using (customer_id = auth.uid() or public.pujanow_is_pandit_owner(pandit_id) or public.pujanow_is_admin())
         with check (customer_id = auth.uid() or public.pujanow_is_pandit_owner(pandit_id) or public.pujanow_is_admin())$p$),
      ('bookings', 'pn_bookings_delete_admin', $p$for delete to authenticated
         using (public.pujanow_is_admin())$p$),

      -- reviews
      ('reviews', 'pn_reviews_select', $p$for select to anon, authenticated
         using (is_published or customer_id = auth.uid() or public.pujanow_is_admin())$p$),
      ('reviews', 'pn_reviews_insert', $p$for insert to authenticated
         with check (customer_id = auth.uid() and exists (
           select 1 from public.bookings b
           where b.id = reviews.booking_id and b.customer_id = auth.uid()
             and b.status = 'completed' and b.pandit_id = reviews.pandit_id))$p$),
      ('reviews', 'pn_reviews_update', $p$for update to authenticated
         using (customer_id = auth.uid() or public.pujanow_is_admin())
         with check (customer_id = auth.uid() or public.pujanow_is_admin())$p$),
      ('reviews', 'pn_reviews_delete', $p$for delete to authenticated
         using (customer_id = auth.uid() or public.pujanow_is_admin())$p$),

      -- notifications
      ('notifications', 'pn_notifications_select', $p$for select to authenticated
         using (user_id = auth.uid() or public.pujanow_is_admin())$p$),
      ('notifications', 'pn_notifications_insert', $p$for insert to authenticated
         with check (user_id = auth.uid() or public.pujanow_shares_booking_with(user_id) or public.pujanow_is_admin())$p$),
      ('notifications', 'pn_notifications_update', $p$for update to authenticated
         using (user_id = auth.uid()) with check (user_id = auth.uid())$p$),
      ('notifications', 'pn_notifications_delete', $p$for delete to authenticated
         using (user_id = auth.uid() or public.pujanow_is_admin())$p$),

      -- samagri_orders
      ('samagri_orders', 'pn_samagri_orders_select', $p$for select to authenticated
         using (customer_id = auth.uid() or public.pujanow_is_admin())$p$),
      ('samagri_orders', 'pn_samagri_orders_insert', $p$for insert to authenticated
         with check (customer_id = auth.uid() and status = 'pending')$p$),
      ('samagri_orders', 'pn_samagri_orders_update_admin', $p$for update to authenticated
         using (public.pujanow_is_admin()) with check (public.pujanow_is_admin())$p$),
      ('samagri_orders', 'pn_samagri_orders_delete_admin', $p$for delete to authenticated
         using (public.pujanow_is_admin())$p$),

      -- samagri_order_items
      ('samagri_order_items', 'pn_samagri_order_items_select', $p$for select to authenticated
         using (public.pujanow_is_admin() or exists (
           select 1 from public.samagri_orders o
           where o.id = samagri_order_items.order_id and o.customer_id = auth.uid()))$p$),
      ('samagri_order_items', 'pn_samagri_order_items_insert', $p$for insert to authenticated
         with check (public.pujanow_owns_pending_order(order_id) or public.pujanow_is_admin())$p$),
      ('samagri_order_items', 'pn_samagri_order_items_update_admin', $p$for update to authenticated
         using (public.pujanow_is_admin()) with check (public.pujanow_is_admin())$p$),
      ('samagri_order_items', 'pn_samagri_order_items_delete_admin', $p$for delete to authenticated
         using (public.pujanow_is_admin())$p$)
    ) as v(tbl, name, def)
  loop
    if not exists (select 1 from pg_policies
                   where schemaname = 'public' and tablename = p.tbl and policyname = p.name) then
      execute format('create policy %I on public.%I %s', p.name, p.tbl, p.def);
    end if;
  end loop;
end $$;

commit;

-- ============================================================================
-- END
-- ============================================================================
