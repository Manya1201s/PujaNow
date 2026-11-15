/*
# Make pandits.profile_id nullable for demo catalog entries

## Summary
Alters the pandits table to allow profile_id to be NULL, so seeded demo pandit
listings can exist without a corresponding auth.users entry. Real pandits who
sign up will still have profile_id set to their auth uid.

## Changes
- `pandits.profile_id` changed from NOT NULL to nullable
- Removes the ON DELETE CASCADE FK and re-adds it as ON DELETE SET NULL
  so deleting a profile doesn't wipe the catalog pandit listing

## Security
- No RLS or policy changes. Pandit SELECT policy already allows public read.
- The pandits_update_own policy uses `auth.uid() = profile_id` — when profile_id
  is NULL, no authenticated user can match it, so demo entries are effectively
  read-only for all authenticated users. This is the desired behavior.
*/

ALTER TABLE pandits DROP CONSTRAINT IF EXISTS pandits_profile_id_fkey;
ALTER TABLE pandits ALTER COLUMN profile_id DROP NOT NULL;
ALTER TABLE pandits ADD CONSTRAINT pandits_profile_id_fkey
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE SET NULL;
