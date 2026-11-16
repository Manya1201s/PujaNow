/**
 * Phase 2: pandit management data layer.
 *
 * Every call runs as the signed-in user with the public anon key. What each user may
 * read or change is decided in the database by the Phase 2 RLS policies, the
 * pn_pandits_guard trigger and the 'pandit-photos' storage policies:
 *   - a pandit can only write their own pandits row, puja_pandits rows, availability,
 *     blocked dates and files under "pandit-photos/<their user id>/"
 *   - verification_status / rejection_reason / reviewed_at / submitted_at are set by
 *     the trigger for pandits; only admins can approve or reject
 *   - review history (pandit_verification_events) is readable by admins only
 */
import { supabase } from '@/lib/supabase';
import type {
  Pandit, PanditService, WeeklySlot, BlockedDate, VerificationEvent, Puja, Profile,
} from '@/types';

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/** Turn Postgres / PostgREST / Storage errors into a message a user can act on. */
export function dbErrorMessage(e: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const err = (e ?? {}) as { code?: string; message?: string; statusCode?: string };
  const msg = err.message || '';
  if (/failed to fetch|network/i.test(msg)) return "Can't reach the server. Check your internet connection and try again.";
  if (err.code === '23505' || /duplicate key/i.test(msg)) return 'That entry already exists.';
  if (/row-level security|permission denied/i.test(msg)) return "You don't have permission to make this change.";
  if (/exceeded the maximum allowed size|payload too large/i.test(msg)) return 'The photo is larger than 2 MB.';
  if (/mime type/i.test(msg)) return 'Please upload a JPEG, PNG or WebP image.';
  if (/violates check constraint/i.test(msg)) return 'Some of the values entered are not allowed. Please check them and try again.';
  if (/violates foreign key/i.test(msg)) return 'This item no longer exists. Refresh the page and try again.';
  // Messages raised by the PujaNow triggers (overlapping slot, reason required, photo folder …) are already readable.
  return msg || fallback;
}

// ---------------------------------------------------------------------------
// Profile photo (Storage bucket 'pandit-photos')
// ---------------------------------------------------------------------------

export const PHOTO_BUCKET = 'pandit-photos';
export const PHOTO_MAX_BYTES = 2 * 1024 * 1024;
const PHOTO_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
export const PHOTO_ACCEPT = Object.keys(PHOTO_TYPES).join(',');

/** Client-side check that mirrors the bucket limits (2 MB, jpeg/png/webp). Returns an error message or null. */
export function validatePhoto(file: File): string | null {
  if (!PHOTO_TYPES[file.type]) return 'Please choose a JPEG, PNG or WebP image.';
  if (file.size > PHOTO_MAX_BYTES) return 'The photo must be 2 MB or smaller.';
  return null;
}

/**
 * Upload a photo into the caller's own folder and return its public URL.
 * `userId` must be the signed-in user's id: the storage policy only allows
 * "<auth.uid()>/<file>", and pn_pandits_guard only accepts that URL as photo_url.
 */
export async function uploadPanditPhoto(userId: string, file: File): Promise<string> {
  const invalid = validatePhoto(file);
  if (invalid) throw new Error(invalid);
  // File name must match [A-Za-z0-9._-]{1,120} (checked by pujanow_is_own_pandit_photo).
  const path = `${userId}/photo-${Date.now()}.${PHOTO_TYPES[file.type]}`;
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, file, { contentType: file.type, cacheControl: '3600', upsert: false });
  if (error) throw new Error(dbErrorMessage(error, 'Could not upload the photo.'));
  return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Remove the caller's earlier photos, keeping the one in use. Best effort: failures are ignored. */
export async function removeOldPanditPhotos(userId: string, keepUrl: string): Promise<void> {
  try {
    const { data } = await supabase.storage.from(PHOTO_BUCKET).list(userId, { limit: 100 });
    const keep = keepUrl.split('/').pop();
    const stale = (data || []).map((f) => f.name).filter((n) => n && n !== keep).map((n) => `${userId}/${n}`);
    if (stale.length) await supabase.storage.from(PHOTO_BUCKET).remove(stale);
  } catch {
    // Leftover files only cost storage; never block the user on cleanup.
  }
}

/** Set the pandit photo (validated again by pn_pandits_guard) and mirror it to the account avatar. */
export async function setPanditPhoto(panditId: string, profileId: string, url: string): Promise<Pandit> {
  const { data, error } = await supabase
    .from('pandits')
    .update({ photo_url: url })
    .eq('id', panditId)
    .select('*')
    .single();
  if (error) throw new Error(dbErrorMessage(error, 'Could not save the photo.'));
  // profiles.avatar_url is a client-updatable column; failure here is cosmetic only.
  await supabase.from('profiles').update({ avatar_url: url }).eq('id', profileId);
  return data as Pandit;
}

// ---------------------------------------------------------------------------
// Services (public.puja_pandits)
// ---------------------------------------------------------------------------

export type PujaOption = Pick<Puja, 'id' | 'name' | 'slug' | 'starting_price' | 'duration_mins' | 'is_active'>;

/** Active pujas a pandit can offer (pn_puja_pandits_pandit_insert requires is_active). */
export async function fetchPujaOptions(): Promise<PujaOption[]> {
  const { data, error } = await supabase
    .from('pujas')
    .select('id, name, slug, starting_price, duration_mins, is_active')
    .eq('is_active', true)
    .order('name');
  if (error) throw new Error(dbErrorMessage(error));
  return data as PujaOption[];
}

export async function fetchPanditServices(panditId: string): Promise<PanditService[]> {
  const { data, error } = await supabase
    .from('puja_pandits')
    .select('id, puja_id, pandit_id, custom_price, puja:pujas(id, name, slug, starting_price, duration_mins, is_active)')
    .eq('pandit_id', panditId);
  if (error) throw new Error(dbErrorMessage(error));
  const rows = (data || []) as unknown as PanditService[];
  return rows.sort((a, b) => (a.puja?.name || '').localeCompare(b.puja?.name || ''));
}

export async function addPanditService(panditId: string, pujaId: string, customPrice: number | null): Promise<void> {
  const { error } = await supabase
    .from('puja_pandits')
    .insert({ pandit_id: panditId, puja_id: pujaId, custom_price: customPrice });
  if (error) throw new Error(dbErrorMessage(error, 'Could not add the service.'));
}

export async function updatePanditServicePrice(serviceId: string, customPrice: number | null): Promise<void> {
  const { error } = await supabase
    .from('puja_pandits')
    .update({ custom_price: customPrice })
    .eq('id', serviceId);
  if (error) throw new Error(dbErrorMessage(error, 'Could not update the price.'));
}

export async function removePanditService(serviceId: string): Promise<void> {
  const { error } = await supabase.from('puja_pandits').delete().eq('id', serviceId);
  if (error) throw new Error(dbErrorMessage(error, 'Could not remove the service.'));
}

// ---------------------------------------------------------------------------
// Weekly availability (public.pandit_weekly_availability)
// ---------------------------------------------------------------------------

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
export const MAX_SLOTS_PER_DAY = 6;

export async function fetchWeeklySlots(panditId: string): Promise<WeeklySlot[]> {
  const { data, error } = await supabase
    .from('pandit_weekly_availability')
    .select('id, pandit_id, weekday, start_time, end_time')
    .eq('pandit_id', panditId)
    .order('weekday')
    .order('start_time');
  if (error) throw new Error(dbErrorMessage(error));
  return data as WeeklySlot[];
}

/** start/end as 'HH:MM'. Overlaps and the 6-per-day limit are enforced by pn_weekly_availability_check. */
export async function addWeeklySlot(panditId: string, weekday: number, start: string, end: string): Promise<WeeklySlot> {
  const { data, error } = await supabase
    .from('pandit_weekly_availability')
    .insert({ pandit_id: panditId, weekday, start_time: start, end_time: end })
    .select('id, pandit_id, weekday, start_time, end_time')
    .single();
  if (error) throw new Error(dbErrorMessage(error, 'Could not add the time slot.'));
  return data as WeeklySlot;
}

export async function deleteWeeklySlot(slotId: string): Promise<void> {
  const { error } = await supabase.from('pandit_weekly_availability').delete().eq('id', slotId);
  if (error) throw new Error(dbErrorMessage(error, 'Could not remove the time slot.'));
}

// ---------------------------------------------------------------------------
// Blocked dates (public.pandit_blocked_dates)
// ---------------------------------------------------------------------------

/** Today's date in the browser's time zone as 'YYYY-MM-DD'. */
export function todayISO(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Upcoming blocked dates (today onwards). */
export async function fetchBlockedDates(panditId: string): Promise<BlockedDate[]> {
  const { data, error } = await supabase
    .from('pandit_blocked_dates')
    .select('id, pandit_id, blocked_date, note')
    .eq('pandit_id', panditId)
    .gte('blocked_date', todayISO())
    .order('blocked_date');
  if (error) throw new Error(dbErrorMessage(error));
  return data as BlockedDate[];
}

/** The database only accepts dates from today up to two years ahead (pn_blocked_dates_check). */
export async function addBlockedDate(panditId: string, date: string, note: string | null): Promise<BlockedDate> {
  const { data, error } = await supabase
    .from('pandit_blocked_dates')
    .insert({ pandit_id: panditId, blocked_date: date, note })
    .select('id, pandit_id, blocked_date, note')
    .single();
  if (error) {
    if (error.code === '23505') throw new Error('This date is already blocked.');
    throw new Error(dbErrorMessage(error, 'Could not block the date.'));
  }
  return data as BlockedDate;
}

export async function deleteBlockedDate(id: string): Promise<void> {
  const { error } = await supabase.from('pandit_blocked_dates').delete().eq('id', id);
  if (error) throw new Error(dbErrorMessage(error, 'Could not remove the blocked date.'));
}

// ---------------------------------------------------------------------------
// Admin review
// ---------------------------------------------------------------------------

export type PanditWithOwner = Pandit & {
  owner?: Pick<Profile, 'full_name' | 'email' | 'phone'> | null;
};

/** Every pandit with the owner account's contact details (RLS: admins see all rows). */
export async function fetchPanditsForReview(): Promise<PanditWithOwner[]> {
  const { data, error } = await supabase
    .from('pandits')
    .select('*, owner:profiles(full_name, email, phone)')
    .order('created_at', { ascending: true });
  if (error) throw new Error(dbErrorMessage(error, 'Could not load pandit applications.'));
  return data as unknown as PanditWithOwner[];
}

/** Review history for one pandit, newest first (pn_verification_events_admin_select). */
export async function fetchVerificationEvents(panditId: string): Promise<VerificationEvent[]> {
  const { data, error } = await supabase
    .from('pandit_verification_events')
    .select('*, actor:profiles(full_name, email)')
    .eq('pandit_id', panditId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(dbErrorMessage(error, 'Could not load review history.'));
  return data as unknown as VerificationEvent[];
}

export const REJECTION_REASON_MAX = 1000;

/**
 * Approve or reject a pandit. pn_pandits_guard sets reviewed_at, clears the reason on
 * approval and refuses a rejection without a reason; pn_pandits_after_status_change
 * records the history row and notifies the pandit.
 */
export async function reviewPandit(
  panditId: string,
  decision: 'verified' | 'rejected',
  reason?: string,
): Promise<PanditWithOwner> {
  const update: Record<string, unknown> = { verification_status: decision };
  if (decision === 'rejected') {
    const r = (reason || '').trim();
    if (!r) throw new Error('A reason is required to reject a pandit profile.');
    if (r.length > REJECTION_REASON_MAX) throw new Error(`Keep the reason under ${REJECTION_REASON_MAX} characters.`);
    update.rejection_reason = r;
  }
  const { data, error } = await supabase
    .from('pandits')
    .update(update)
    .eq('id', panditId)
    .select('*, owner:profiles(full_name, email, phone)')
    .single();
  if (error) throw new Error(dbErrorMessage(error, 'Could not save the decision.'));
  return data as unknown as PanditWithOwner;
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

/** '07:30:00' → '7:30 AM' */
export function formatTime(t: string): string {
  const [hStr, mStr = '00'] = t.split(':');
  const h = Number(hStr);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr.padStart(2, '0')} ${suffix}`;
}

/** 'YYYY-MM-DD' → 'Sat, 21 Nov 2026' without time-zone shifts. */
export function formatISODate(d: string): string {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}
