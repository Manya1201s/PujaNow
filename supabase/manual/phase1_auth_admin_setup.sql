-- ============================================================================
-- PujaNow - Phase 1 auth: verification + first admin
-- REVIEW BEFORE RUNNING. Not a migration: no schema, policy or table changes.
-- Run in Supabase Dashboard -> SQL Editor (role "postgres").
-- ============================================================================

-- ---- STEP 1 (read-only): confirm the auth pieces from pujanow_safe_schema.sql are live ----
select
  exists (select 1 from pg_trigger where tgname = 'pn_on_auth_user_created' and tgrelid = 'auth.users'::regclass) as signup_trigger_ok,
  exists (select 1 from pg_proc where proname = 'pujanow_is_admin')                                          as admin_check_fn_ok,
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass)                             as profiles_rls_on,
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'profiles')                 as profiles_policies_expect_3,
  not has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE')                            as role_not_client_editable,
  (select count(*) from auth.users u left join public.profiles p on p.id = u.id where p.id is null)         as users_without_profile_expect_0;
-- Expected: true, true, true, 3, true, 0

-- ---- STEP 2: make your own account an administrator ----
-- 1. Sign up on the website as a normal Devotee with the email you want to use as admin.
-- 2. Confirm the email.
-- 3. Replace the address below and run ONLY this statement:
--
-- update public.profiles set role = 'admin' where email = 'replace-with-your-email@example.com';
--
-- 4. Refresh the website: the account menu now shows "Admin Console" (/#/admin).
-- To revoke later: update public.profiles set role = 'customer' where email = '...';
