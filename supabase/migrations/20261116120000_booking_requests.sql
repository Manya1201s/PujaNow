/*
================================================================================
 PujaNow — Booking request management (ADDITIVE migration)
================================================================================
 Status: PROPOSED. Review before running.
 Run in Supabase Dashboard → SQL Editor, whole file, as role "postgres".
 Requires: pujanow_safe_schema.sql (Phase 1). Independent of the Phase 2 file.

 What this adds
   1. bookings: 2 new nullable columns
        rejection_reason  why the pandit declined (shown to the devotee)
        responded_at      when the pandit accepted / declined (set by the server)
   2. pujanow_bookings_guard_update() (existing function, same trigger
      pn_bookings_guard_update) now also:
        • pandit reject (pending → rejected) REQUIRES a reason (1–500 chars)
        • pandit accept (pending → confirmed) is refused when the date has
          passed, or when the pandit already has a confirmed booking at the
          same date and time slot
        • rejection_reason / responded_at can't be edited any other way
      The allowed status transitions are unchanged:
        customer : pending|confirmed → cancelled
        pandit   : pending → confirmed|rejected, confirmed → completed|cancelled
        admin / SQL editor : anything
   3. AFTER UPDATE trigger pn_bookings_after_status_change: one in-app
      notification to the devotee AND one to the pandit whenever a booking's
      status changes. Written by the server, so it can't be skipped or duplicated
      by the browser. (The app no longer inserts status notifications itself.)
   4. Realtime: adds public.bookings to the supabase_realtime publication (if
      that publication exists) so dashboards update live. Realtime applies the
      same RLS: each user only receives bookings they can already read.

 What this does NOT do
   • no DROP / TRUNCATE / DELETE, no table recreation, no column type changes
   • no RLS policy is created, removed or changed (pn_bookings_* stay as they are)
   • no change to the booking insert path, payments, profiles or auth

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
  select string_agg(x, ', ') into v_missing from (
    select 'table public.' || t as x from unnest(array['profiles','pandits','bookings','notifications']) t
     where to_regclass('public.' || t) is null
    union all
    select 'column bookings.' || c from unnest(array['status','customer_id','pandit_id','scheduled_date','scheduled_time','puja_name','booking_ref']) c
     where not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'bookings' and column_name = c)
    union all
    select 'function public.' || f from unnest(array['pujanow_is_admin','pujanow_is_pandit_owner','pujanow_bookings_guard_update']) f
     where not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = f)
    union all
    select 'trigger pn_bookings_guard_update' where not exists (select 1 from pg_trigger where tgname = 'pn_bookings_guard_update' and tgrelid = to_regclass('public.bookings'))
  ) s;
  if v_missing is not null then
    raise exception 'Booking-requests migration aborted, missing: %. Apply pujanow_safe_schema.sql first. Nothing was changed.', v_missing;
  end if;

  -- The notification types this file uses must be allowed by the existing check constraint.
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.notifications'::regclass and contype = 'c'
       and pg_get_constraintdef(oid) like '%booking_accepted%'
       and pg_get_constraintdef(oid) like '%booking_rejected%'
       and pg_get_constraintdef(oid) like '%booking_confirmed%'
       and pg_get_constraintdef(oid) like '%booking_cancelled%'
       and pg_get_constraintdef(oid) like '%''message''%') then
    raise exception 'notifications.type does not allow the booking_* / message types. Nothing was changed.';
  end if;
end $$;


-- ============================================================================
-- 1. NEW COLUMNS ON bookings (nullable, no rewrite of existing rows)
-- ============================================================================
alter table public.bookings
  add column if not exists rejection_reason text check (rejection_reason is null or char_length(rejection_reason) between 1 and 500),
  add column if not exists responded_at     timestamptz;


-- ============================================================================
-- 2. STATUS GUARD (same function name → the existing trigger runs the new body)
-- ============================================================================
create or replace function public.pujanow_bookings_guard_update()
returns trigger language plpgsql as $$
declare
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
begin
  -- Admin / SQL editor: anything, but keep the server-owned fields consistent.
  if auth.uid() is null or public.pujanow_is_admin() then
    if old.status = 'pending' and new.status in ('confirmed', 'rejected') and new.status is distinct from old.status then
      new.responded_at := coalesce(new.responded_at, now());
    end if;
    return new;
  end if;

  -- Participants may change only the status (plus the reason, validated below).
  if (to_jsonb(new) - 'status' - 'updated_at' - 'rejection_reason' - 'responded_at')
     is distinct from
     (to_jsonb(old) - 'status' - 'updated_at' - 'rejection_reason' - 'responded_at') then
    raise exception 'Only the booking status can be changed' using errcode = '42501';
  end if;

  new.responded_at := old.responded_at;            -- server-owned

  if new.status = old.status then
    new.rejection_reason := old.rejection_reason;  -- no silent reason edits
    return new;
  end if;

  -- Devotee cancels.
  if old.customer_id = auth.uid()
     and old.status in ('pending', 'confirmed') and new.status = 'cancelled' then
    new.rejection_reason := old.rejection_reason;
    return new;
  end if;

  if public.pujanow_is_pandit_owner(old.pandit_id) then
    -- Accept.
    if old.status = 'pending' and new.status = 'confirmed' then
      if old.scheduled_date < v_today then
        raise exception 'This booking date has already passed, so it can''t be accepted.' using errcode = '22023';
      end if;
      -- Serialise accepts for the same pandit + slot so two requests can't both win.
      perform pg_advisory_xact_lock(hashtext(old.pandit_id::text || '|' || old.scheduled_date::text || '|' || old.scheduled_time));
      if exists (
        select 1 from public.bookings b
         where b.pandit_id = old.pandit_id and b.id <> old.id and b.status = 'confirmed'
           and b.scheduled_date = old.scheduled_date and b.scheduled_time = old.scheduled_time) then
        raise exception 'You already have a confirmed booking on this date at %.', old.scheduled_time using errcode = '23505';
      end if;
      new.rejection_reason := null;
      new.responded_at := now();
      return new;
    end if;

    -- Decline (reason required).
    if old.status = 'pending' and new.status = 'rejected' then
      new.rejection_reason := nullif(btrim(coalesce(new.rejection_reason, '')), '');
      if new.rejection_reason is null then
        raise exception 'Please give a reason for declining this booking.' using errcode = '23514';
      end if;
      new.responded_at := now();
      return new;
    end if;

    -- After the ceremony / later change of plans.
    if old.status = 'confirmed' and new.status in ('completed', 'cancelled') then
      new.rejection_reason := old.rejection_reason;
      return new;
    end if;
  end if;

  raise exception 'Booking status cannot change from % to %', old.status, new.status using errcode = '42501';
end;
$$;
-- The trigger pn_bookings_guard_update (BEFORE UPDATE ON public.bookings) already
-- exists from Phase 1 and now runs this updated function. It is not recreated.


-- ============================================================================
-- 3. NOTIFICATIONS ON EVERY STATUS CHANGE (devotee + pandit)
-- ============================================================================
create or replace function public.pujanow_bookings_after_status_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_pandit_profile uuid;
  v_when   text := to_char(new.scheduled_date, 'FMDD Mon YYYY') || ' at ' || new.scheduled_time;
  v_what   text := new.puja_name || ' on ' || v_when || ' (' || new.booking_ref || ')';
  v_by_customer boolean := auth.uid() is not null and auth.uid() = new.customer_id;
  v_pandit text := coalesce(new.pandit_name, 'Your pandit');
begin
  select profile_id into v_pandit_profile from public.pandits where id = new.pandit_id;

  -- Devotee
  insert into public.notifications (user_id, type, title, body, link)
  select new.customer_id, x.type, x.title, x.body, '/dashboard/bookings'
  from (values
    ('confirmed', 'booking_confirmed', 'Booking accepted',
       v_pandit || ' accepted your booking for ' || v_what || '.'),
    ('rejected',  'booking_rejected',  'Booking request declined',
       v_pandit || ' declined your booking for ' || v_what || '. Reason: ' || coalesce(new.rejection_reason, 'not given') || ' You can book another pandit.'),
    ('cancelled', 'booking_cancelled', 'Booking cancelled',
       case when v_by_customer then 'You cancelled your booking for ' || v_what || '.'
            else 'Your booking for ' || v_what || ' was cancelled by ' || v_pandit || '.' end),
    ('completed', 'message',           'Puja completed',
       'Your ' || v_what || ' is marked as completed. Thank you for booking with PujaNow.')
  ) as x(status, type, title, body)
  where x.status = new.status;

  -- Pandit (when the booking is assigned to a pandit with a login account)
  if v_pandit_profile is not null then
    insert into public.notifications (user_id, type, title, body, link)
    select v_pandit_profile, x.type, x.title, x.body, '/pandit-dashboard/bookings?booking=' || new.id
    from (values
      ('confirmed', 'booking_accepted',  'Booking accepted',
         'You accepted ' || v_what || ' for ' || new.customer_name || '.'),
      ('rejected',  'booking_rejected',  'Booking declined',
         'You declined ' || v_what || '. The devotee has been notified.'),
      ('cancelled', 'booking_cancelled', 'Booking cancelled',
         case when v_by_customer then new.customer_name || ' cancelled ' || v_what || '.'
              else 'You cancelled ' || v_what || '. The devotee has been notified.' end),
      ('completed', 'message',           'Puja marked completed',
         v_what || ' is marked as completed.')
    ) as x(status, type, title, body)
    where x.status = new.status;
  end if;

  return null;
end;
$$;
revoke all on function public.pujanow_bookings_after_status_change() from public;

create or replace trigger pn_bookings_after_status_change
  after update on public.bookings
  for each row
  when (old.status is distinct from new.status)
  execute function public.pujanow_bookings_after_status_change();


-- ============================================================================
-- 4. REALTIME (optional; skipped when the publication doesn't exist)
-- ============================================================================
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'bookings') then
    execute 'alter publication supabase_realtime add table public.bookings';
  end if;
end $$;

commit;


/*
================================================================================
 VERIFY (read-only, run after the script above)
================================================================================
select
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'bookings'
      and column_name in ('rejection_reason','responded_at'))                       as new_columns_2,
  (select count(*) from pg_trigger where tgrelid = 'public.bookings'::regclass
      and tgname in ('pn_bookings_guard_update','pn_bookings_after_status_change')) as triggers_2,
  (select prosrc like '%reason for declining%' from pg_proc
    where proname = 'pujanow_bookings_guard_update')                                as guard_updated,
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'bookings'
      and policyname like 'pn_%')                                                    as booking_policies_unchanged_4,
  exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'bookings')                          as realtime_enabled;
================================================================================
*/
