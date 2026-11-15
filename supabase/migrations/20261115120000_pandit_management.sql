/*
================================================================================
 PujaNow — Phase 2: Pandit management (ADDITIVE migration)
================================================================================
 Status: PROPOSED. Review before running.
 Run in Supabase Dashboard → SQL Editor, whole file, as role "postgres".
 Requires: pujanow_safe_schema.sql already applied (Phase 1).

 What this adds
   1. pandits: 3 new nullable columns
        rejection_reason (why an admin rejected the profile, shown to the pandit)
        reviewed_at      (when an admin last approved/rejected)
        submitted_at     (when the profile last entered the review queue)
   2. pujanow_pandits_guard() (existing trigger function, same trigger) now also:
        • protects the new columns from pandits
        • rejected pandit edits profile → status back to 'pending' (old reason kept)
        • verified pandit edits profile → stays 'verified'
        • admin approve → clears reason; admin reject → reason REQUIRED
        • photo_url set by a pandit must be a file in their own folder of the
          'pandit-photos' bucket
   3. Review history (pandit_verification_events, admin-only) + an in-app
      notification to the pandit when approved/rejected (AFTER trigger).
   4. Services: pandits may add/update/remove THEIR OWN puja_pandits rows.
      Public read of puja_pandits tightened to verified pandits (+ owner/admin).
   5. Availability: pandit_weekly_availability (public for verified pandits) and
      pandit_blocked_dates (private; public sees dates only via a function).
   6. Storage bucket 'pandit-photos' (public read, 2 MB, jpeg/png/webp) and
      upload rules: a pandit can only write into "<their user id>/...".

 What this does NOT do
   • no DROP / TRUNCATE / DELETE, no table recreation, no column type changes
   • no change to profiles, auth trigger, bookings, orders, reviews, payments
   • no Phase 1 policy is removed or widened; one is narrowed
     (pn_puja_pandits_select). Every other existing pn_* policy is untouched.

 Idempotent: safe to run more than once. Runs in one transaction: if any
 statement fails, nothing is changed.
================================================================================
*/

begin;

-- ============================================================================
-- 0. PRE-FLIGHT (read-only; aborts the whole script if something is off)
-- ============================================================================
do $$
declare
  v_missing text;
begin
  if current_setting('server_version_num')::int < 140000 then
    raise exception 'Needs PostgreSQL 14+ (found %).', current_setting('server_version');
  end if;

  select string_agg(x, ', ') into v_missing from (
    select 'table public.' || t as x from unnest(array['profiles','pujas','pandits','puja_pandits','notifications']) t
     where to_regclass('public.' || t) is null
    union all
    select 'function public.' || f from unnest(array['pujanow_is_admin','pujanow_is_pandit_owner','pujanow_set_updated_at','pujanow_pandits_guard']) f
     where not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = f)
    union all
    select 'trigger pn_pandits_guard' where not exists (select 1 from pg_trigger where tgname = 'pn_pandits_guard' and tgrelid = to_regclass('public.pandits'))
    union all
    select 'policy pn_puja_pandits_select' where not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'puja_pandits' and policyname = 'pn_puja_pandits_select')
    union all
    select 'table storage.' || t from unnest(array['buckets','objects']) t where to_regclass('storage.' || t) is null
    union all
    select 'function storage.foldername' where not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'storage' and p.proname = 'foldername')
  ) s;
  if v_missing is not null then
    raise exception 'Pandit-management migration aborted, missing: %. Apply pujanow_safe_schema.sql first. Nothing was changed.', v_missing;
  end if;

  -- A table with one of our new names that isn't ours → stop rather than attach rules to it.
  if to_regclass('public.pandit_weekly_availability') is not null and not exists (
       select 1 from information_schema.columns where table_schema = 'public' and table_name = 'pandit_weekly_availability' and column_name = 'weekday') then
    raise exception 'public.pandit_weekly_availability exists but is not the PujaNow table. Nothing was changed.';
  end if;
  if to_regclass('public.pandit_blocked_dates') is not null and not exists (
       select 1 from information_schema.columns where table_schema = 'public' and table_name = 'pandit_blocked_dates' and column_name = 'blocked_date') then
    raise exception 'public.pandit_blocked_dates exists but is not the PujaNow table. Nothing was changed.';
  end if;
  if to_regclass('public.pandit_verification_events') is not null and not exists (
       select 1 from information_schema.columns where table_schema = 'public' and table_name = 'pandit_verification_events' and column_name = 'to_status') then
    raise exception 'public.pandit_verification_events exists but is not the PujaNow table. Nothing was changed.';
  end if;

  -- An existing private bucket with our name belongs to something else.
  if exists (select 1 from storage.buckets where id = 'pandit-photos' and not public) then
    raise exception 'A private storage bucket "pandit-photos" already exists. Nothing was changed.';
  end if;
end $$;


-- ============================================================================
-- 1. NEW COLUMNS ON pandits (nullable, no rewrite of existing rows)
-- ============================================================================
alter table public.pandits
  add column if not exists rejection_reason text check (rejection_reason is null or char_length(rejection_reason) <= 1000),
  add column if not exists reviewed_at      timestamptz,
  add column if not exists submitted_at     timestamptz;
-- Existing rows are not touched (no backfill). For profiles submitted before this
-- migration submitted_at is null; the admin queue orders by coalesce(submitted_at, created_at).

create index if not exists idx_pandits_review_queue
  on public.pandits(submitted_at) where verification_status = 'pending';


-- ============================================================================
-- 2. PHOTO CHECK HELPER
-- ============================================================================
-- True when p_url is the public URL of a file that exists in the caller's own
-- folder of the 'pandit-photos' bucket: .../object/public/pandit-photos/<auth.uid()>/<file>
create or replace function public.pujanow_is_own_pandit_photo(p_url text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select auth.uid() is not null
     and p_url ~ ('^https://[A-Za-z0-9.-]+(:[0-9]+)?/storage/v1/object/public/pandit-photos/'
                  || auth.uid()::text || '/[A-Za-z0-9._-]{1,120}$')
     and exists (
           select 1 from storage.objects o
           where o.bucket_id = 'pandit-photos'
             and o.name = substring(p_url from '/object/public/pandit-photos/(.+)$'));
$$;
revoke all on function public.pujanow_is_own_pandit_photo(text) from public;
grant execute on function public.pujanow_is_own_pandit_photo(text) to authenticated;


-- ============================================================================
-- 3. pandits GUARD (same function/trigger name as Phase 1; behaviour extended)
-- ============================================================================
-- auth.uid() IS NULL = SQL editor / service role (e.g. seeding), treated like admin.
create or replace function public.pujanow_pandits_guard()
returns trigger language plpgsql as $$
begin
  -- ---------- admin / SQL editor ----------
  if auth.uid() is null or public.pujanow_is_admin() then
    if tg_op = 'INSERT' then
      if new.verification_status = 'pending' then
        new.submitted_at := coalesce(new.submitted_at, now());
      end if;
    elsif new.verification_status is distinct from old.verification_status then
      new.reviewed_at := now();
      if new.verification_status = 'verified' then
        new.rejection_reason := null;
      elsif new.verification_status = 'rejected' then
        new.rejection_reason := nullif(btrim(coalesce(new.rejection_reason, '')), '');
        if new.rejection_reason is null then
          raise exception 'A reason is required to reject a pandit profile' using errcode = '23514';
        end if;
      else  -- moved back to pending by an admin
        new.submitted_at := now();
      end if;
    end if;
    return new;
  end if;

  -- ---------- pandit (or anyone else passing RLS) ----------
  if tg_op = 'INSERT' then
    new.verification_status := 'pending';
    new.rating              := 0;
    new.total_reviews       := 0;
    new.total_bookings      := 0;
    new.rejection_reason    := null;
    new.reviewed_at         := null;
    new.submitted_at        := now();
  else
    -- Admin-controlled fields keep their current values.
    new.verification_status := old.verification_status;
    new.rating              := old.rating;
    new.total_reviews       := old.total_reviews;
    new.total_bookings      := old.total_bookings;
    new.profile_id          := old.profile_id;
    new.rejection_reason    := old.rejection_reason;   -- kept until the next admin review
    new.reviewed_at         := old.reviewed_at;
    new.submitted_at        := old.submitted_at;
    new.created_at          := old.created_at;

    -- A rejected pandit who edits their profile resubmits it for review.
    -- (Toggling availability alone is not a resubmission.)
    if old.verification_status = 'rejected'
       and (to_jsonb(new) - array['is_available', 'updated_at']) is distinct from
           (to_jsonb(old) - array['is_available', 'updated_at']) then
      new.verification_status := 'pending';
      new.submitted_at        := now();
    end if;
  end if;

  -- Photos must be uploaded to the pandit's own folder in PujaNow storage.
  if new.photo_url is not null
     and (tg_op = 'INSERT' or new.photo_url is distinct from old.photo_url)
     and not public.pujanow_is_own_pandit_photo(new.photo_url) then
    raise exception 'Profile photo must be an image uploaded to your PujaNow photo folder' using errcode = '42501';
  end if;

  return new;
end;
$$;
-- The trigger pn_pandits_guard (BEFORE INSERT OR UPDATE ON public.pandits) already
-- exists from Phase 1 and now runs this updated function. It is not recreated.


-- ============================================================================
-- 4. REVIEW HISTORY + NOTIFICATION
-- ============================================================================
create table if not exists public.pandit_verification_events (
  id          uuid primary key default gen_random_uuid(),
  pandit_id   uuid not null references public.pandits(id) on delete cascade,
  from_status text,
  to_status   text not null,
  reason      text,
  actor_id    uuid references public.profiles(id) on delete set null,  -- null = SQL editor
  created_at  timestamptz not null default now()
);
create index if not exists idx_pandit_verification_events_pandit
  on public.pandit_verification_events(pandit_id, created_at desc);

create or replace function public.pujanow_pandits_after_status_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.pandit_verification_events (pandit_id, from_status, to_status, reason, actor_id)
  values (new.id, old.verification_status, new.verification_status,
          case when new.verification_status = 'rejected' then new.rejection_reason end,
          auth.uid());

  if new.profile_id is not null and new.verification_status in ('verified', 'rejected') then
    insert into public.notifications (user_id, type, title, body, link)
    values (
      new.profile_id,
      'admin_announcement',
      case when new.verification_status = 'verified'
           then 'Your pandit profile is approved'
           else 'Your pandit profile needs changes' end,
      case when new.verification_status = 'verified'
           then 'Your profile is now live. Devotees can find and book you.'
           else 'Reason: ' || new.rejection_reason || ' Update your profile to resubmit it for review.' end,
      '/pandit-dashboard'
    );
  end if;
  return null;
end;
$$;
revoke all on function public.pujanow_pandits_after_status_change() from public;

create or replace trigger pn_pandits_after_status_change
  after update on public.pandits
  for each row
  when (old.verification_status is distinct from new.verification_status)
  execute function public.pujanow_pandits_after_status_change();


-- ============================================================================
-- 5. AVAILABILITY TABLES
-- ============================================================================
-- Times are local (India) wall-clock times. weekday: 0 = Sunday … 6 = Saturday.
create table if not exists public.pandit_weekly_availability (
  id          uuid primary key default gen_random_uuid(),
  pandit_id   uuid not null references public.pandits(id) on delete cascade,
  weekday     smallint not null check (weekday between 0 and 6),
  start_time  time not null,
  end_time    time not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint pandit_weekly_availability_range_chk check (end_time > start_time)
);
create index if not exists idx_pandit_weekly_availability_pandit
  on public.pandit_weekly_availability(pandit_id, weekday, start_time);

create table if not exists public.pandit_blocked_dates (
  id           uuid primary key default gen_random_uuid(),
  pandit_id    uuid not null references public.pandits(id) on delete cascade,
  blocked_date date not null,
  note         text check (note is null or char_length(note) <= 200),  -- private to the pandit/admin
  created_at   timestamptz not null default now(),
  constraint pandit_blocked_dates_unique unique (pandit_id, blocked_date)
);

-- Weekly slots: no overlaps on the same day, at most 6 slots per day.
create or replace function public.pujanow_weekly_availability_check()
returns trigger language plpgsql as $$
begin
  perform pg_advisory_xact_lock(hashtext('pn_avail:' || new.pandit_id::text));
  if exists (
    select 1 from public.pandit_weekly_availability a
    where a.pandit_id = new.pandit_id and a.weekday = new.weekday and a.id <> new.id
      and a.start_time < new.end_time and new.start_time < a.end_time
  ) then
    raise exception 'This time slot overlaps another slot on the same day' using errcode = '23P01';
  end if;
  if (select count(*) from public.pandit_weekly_availability a
      where a.pandit_id = new.pandit_id and a.weekday = new.weekday and a.id <> new.id) >= 6 then
    raise exception 'At most 6 time slots per day' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace trigger pn_weekly_availability_check
  before insert or update on public.pandit_weekly_availability
  for each row execute function public.pujanow_weekly_availability_check();

create or replace trigger pn_set_updated_at
  before update on public.pandit_weekly_availability
  for each row execute function public.pujanow_set_updated_at();

-- Blocked dates: non-admins may only add dates from today up to 2 years ahead.
create or replace function public.pujanow_blocked_dates_check()
returns trigger language plpgsql as $$
begin
  if auth.uid() is null or public.pujanow_is_admin() then
    return new;
  end if;
  if new.blocked_date < current_date or new.blocked_date > current_date + 730 then
    raise exception 'Blocked dates must be between today and two years ahead' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace trigger pn_blocked_dates_check
  before insert or update on public.pandit_blocked_dates
  for each row execute function public.pujanow_blocked_dates_check();

-- Public view of a verified pandit's blocked DATES only (notes stay private).
-- Used by the booking flow in a later phase. Range limited to 400 days.
create or replace function public.pujanow_pandit_blocked_dates(p_pandit_id uuid, p_from date, p_to date)
returns setof date
language sql stable security definer set search_path = public
as $$
  select b.blocked_date
  from public.pandit_blocked_dates b
  join public.pandits p on p.id = b.pandit_id
  where b.pandit_id = p_pandit_id
    and b.blocked_date between p_from and least(p_to, p_from + 400)
    and (p.verification_status = 'verified' or p.profile_id = auth.uid() or public.pujanow_is_admin())
  order by 1;
$$;
revoke all on function public.pujanow_pandit_blocked_dates(uuid, date, date) from public;
grant execute on function public.pujanow_pandit_blocked_dates(uuid, date, date) to anon, authenticated;


-- ============================================================================
-- 6. PRIVILEGES for the new tables (least privilege; RLS below picks rows)
-- ============================================================================
revoke all on table public.pandit_weekly_availability, public.pandit_blocked_dates,
                    public.pandit_verification_events
  from anon, authenticated;

grant select                 on public.pandit_weekly_availability to anon, authenticated;
grant insert, update, delete on public.pandit_weekly_availability to authenticated;
grant select, insert, update, delete on public.pandit_blocked_dates to authenticated;
grant select                 on public.pandit_verification_events to authenticated;  -- RLS: admins only

alter table public.pandit_weekly_availability enable row level security;
alter table public.pandit_blocked_dates       enable row level security;
alter table public.pandit_verification_events enable row level security;


-- ============================================================================
-- 7. RLS POLICIES (created only if missing; nothing dropped)
-- ============================================================================
do $$
declare p record;
begin
  for p in
    select * from (values
      -- services: a pandit manages only their own rows, only for active pujas
      ('puja_pandits', 'pn_puja_pandits_pandit_insert', $p$for insert to authenticated
         with check (public.pujanow_is_pandit_owner(pandit_id)
                     and exists (select 1 from public.pujas pj where pj.id = puja_id and pj.is_active))$p$),
      ('puja_pandits', 'pn_puja_pandits_pandit_update', $p$for update to authenticated
         using (public.pujanow_is_pandit_owner(pandit_id))
         with check (public.pujanow_is_pandit_owner(pandit_id)
                     and exists (select 1 from public.pujas pj where pj.id = puja_id and pj.is_active))$p$),
      ('puja_pandits', 'pn_puja_pandits_pandit_delete', $p$for delete to authenticated
         using (public.pujanow_is_pandit_owner(pandit_id))$p$),

      -- weekly availability: public for verified pandits; owner/admin write
      ('pandit_weekly_availability', 'pn_weekly_availability_select', $p$for select to anon, authenticated
         using (exists (select 1 from public.pandits p
                        where p.id = pandit_weekly_availability.pandit_id
                          and (p.verification_status = 'verified' or p.profile_id = auth.uid()))
                or public.pujanow_is_admin())$p$),
      ('pandit_weekly_availability', 'pn_weekly_availability_write', $p$for all to authenticated
         using (public.pujanow_is_pandit_owner(pandit_id) or public.pujanow_is_admin())
         with check (public.pujanow_is_pandit_owner(pandit_id) or public.pujanow_is_admin())$p$),

      -- blocked dates: owner/admin only (public gets dates via pujanow_pandit_blocked_dates)
      ('pandit_blocked_dates', 'pn_blocked_dates_owner', $p$for all to authenticated
         using (public.pujanow_is_pandit_owner(pandit_id) or public.pujanow_is_admin())
         with check (public.pujanow_is_pandit_owner(pandit_id) or public.pujanow_is_admin())$p$),

      -- review history: admins only (rows are written by the trigger)
      ('pandit_verification_events', 'pn_verification_events_admin_select', $p$for select to authenticated
         using (public.pujanow_is_admin())$p$)
    ) as v(tbl, name, def)
  loop
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = p.tbl and policyname = p.name) then
      execute format('create policy %I on public.%I %s', p.name, p.tbl, p.def);
    end if;
  end loop;
end $$;

-- Narrow (never widen) the Phase 1 public read of puja_pandits: was USING (true),
-- which exposed links of pending/rejected pandits. Now: verified pandits, the
-- pandit themself, or an admin. ALTER POLICY keeps the same policy object.
alter policy pn_puja_pandits_select on public.puja_pandits
  using (exists (select 1 from public.pandits p
                 where p.id = puja_pandits.pandit_id
                   and (p.verification_status = 'verified' or p.profile_id = auth.uid()))
         or public.pujanow_is_admin());


-- ============================================================================
-- 8. STORAGE: profile photo bucket + upload rules
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pandit-photos', 'pandit-photos', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Public bucket: images are served by public URL without these policies. The
-- policies below only govern API access (list/upload/replace/delete).
do $$
declare p record;
begin
  for p in
    select * from (values
      ('pn_pandit_photos_select', $p$for select to authenticated
         using (bucket_id = 'pandit-photos'
                and ((storage.foldername(name))[1] = auth.uid()::text or public.pujanow_is_admin()))$p$),
      ('pn_pandit_photos_insert', $p$for insert to authenticated
         with check (bucket_id = 'pandit-photos'
                     and (storage.foldername(name))[1] = auth.uid()::text
                     and exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role = 'pandit'))$p$),
      ('pn_pandit_photos_update', $p$for update to authenticated
         using (bucket_id = 'pandit-photos' and (storage.foldername(name))[1] = auth.uid()::text)
         with check (bucket_id = 'pandit-photos' and (storage.foldername(name))[1] = auth.uid()::text)$p$),
      ('pn_pandit_photos_delete', $p$for delete to authenticated
         using (bucket_id = 'pandit-photos'
                and ((storage.foldername(name))[1] = auth.uid()::text or public.pujanow_is_admin()))$p$)
    ) as v(name, def)
  loop
    if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = p.name) then
      execute format('create policy %I on storage.objects %s', p.name, p.def);
    end if;
  end loop;
end $$;

commit;

-- ============================================================================
-- END
-- ============================================================================
