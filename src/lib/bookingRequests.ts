/**
 * Booking request workflow (accept / decline / complete / cancel) and live updates.
 *
 * Security lives in the database, not here:
 *   • RLS (pn_bookings_update): only the devotee, the assigned pandit or an admin can update a booking.
 *   • pn_bookings_guard_update: allowed transitions only, reason required to decline, no accepting
 *     past dates or a slot that is already confirmed, nothing but status/reason can change.
 *   • pn_bookings_after_status_change: sends the devotee + pandit notifications (server-side, once).
 * The app adds an optimistic "from" check so a stale screen can't overwrite a newer decision.
 */
import { supabase } from '@/lib/supabase';
import type { Booking, BookingStatus } from '@/types';

export const REJECTION_REASON_MIN = 10;
export const REJECTION_REASON_MAX = 500;

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  pending: 'Awaiting response',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  rejected: 'Declined',
};

/** Readable message for errors from the bookings table and its triggers. */
export function bookingErrorMessage(e: unknown, fallback = 'Could not update the booking. Please try again.'): string {
  const err = (e ?? {}) as { code?: string; message?: string };
  const msg = err.message || '';
  if (/failed to fetch|network/i.test(msg)) return "Can't reach the server. Check your internet connection and try again.";
  // Messages written for people by pn_bookings_guard_update.
  if (/already passed|confirmed booking on this date|reason for declining/i.test(msg)) return msg;
  if (/booking status cannot change/i.test(msg)) return 'This booking has already been updated. Refresh to see its latest status.';
  if (/column .*rejection_reason|rejection_reason.* does not exist/i.test(msg)) {
    return 'Booking responses are not enabled yet. The booking-requests database migration needs to be applied.';
  }
  if (/row-level security|permission denied|only the booking status/i.test(msg)) return "You don't have permission to change this booking.";
  if (/violates check constraint/i.test(msg)) return `The reason must be ${REJECTION_REASON_MAX} characters or fewer.`;
  return msg || fallback;
}

/** Thrown when the booking was changed elsewhere (another tab, the devotee, an admin) before this update. */
export class BookingConflictError extends Error {
  constructor(public current: Booking | null) {
    super(
      current
        ? `This booking is already ${BOOKING_STATUS_LABEL[current.status].toLowerCase()}. The latest status is now shown.`
        : 'This booking is no longer available to you.',
    );
    this.name = 'BookingConflictError';
  }
}

/**
 * Moves a booking from one of `from` to `to`. The update only matches while the booking is still in an
 * expected status, so double clicks, two open tabs, or a devotee cancelling at the same moment can't
 * produce conflicting updates. Notifications are sent by the database trigger, not from the browser.
 */
export async function changeBookingStatus(
  bookingId: string,
  to: BookingStatus,
  opts: { from: BookingStatus[]; reason?: string },
): Promise<Booking> {
  const patch: { status: BookingStatus; rejection_reason?: string } = { status: to };
  if (to === 'rejected') {
    const reason = (opts.reason || '').trim();
    if (reason.length < REJECTION_REASON_MIN) throw new Error(`Please explain why in at least ${REJECTION_REASON_MIN} characters.`);
    if (reason.length > REJECTION_REASON_MAX) throw new Error(`Please keep the reason under ${REJECTION_REASON_MAX} characters.`);
    patch.rejection_reason = reason;
  }

  const { data, error } = await supabase
    .from('bookings')
    .update(patch)
    .eq('id', bookingId)
    .in('status', opts.from)
    .select('*');
  if (error) throw new Error(bookingErrorMessage(error));
  if (data && data.length === 1) return data[0] as Booking;

  // Nothing matched: either the status moved on, or RLS hides the row.
  const { data: current } = await supabase.from('bookings').select('*').eq('id', bookingId).maybeSingle();
  throw new BookingConflictError((current as Booking | null) ?? null);
}

/**
 * Live updates for bookings the current user can read (RLS applies to Realtime too).
 * Needs public.bookings in the supabase_realtime publication (added by the booking-requests migration);
 * without it this is a harmless no-op and the screens still refresh on focus.
 */
export function subscribeToBookings(
  filter: { column: 'customer_id' | 'pandit_id'; value: string },
  onChange: (booking: Booking) => void,
): () => void {
  const channel = supabase
    .channel(`bookings:${filter.column}:${filter.value}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'bookings', filter: `${filter.column}=eq.${filter.value}` },
      (payload) => {
        const row = payload.new as Booking | undefined;
        if (row && row.id) onChange(row);
      },
    )
    .subscribe();
  return () => { void supabase.removeChannel(channel); };
}

/** Calls `refresh` when the tab becomes visible again and every `intervalMs` while visible. */
export function refreshOnFocus(refresh: () => void, intervalMs = 60_000): () => void {
  const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('focus', onVisible);
  const timer = window.setInterval(onVisible, intervalMs);
  return () => {
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('focus', onVisible);
    window.clearInterval(timer);
  };
}

/** Number of booking requests waiting for this pandit's answer (for the tab badge). */
export async function countPendingRequests(panditId: string): Promise<number> {
  const { count, error } = await supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('pandit_id', panditId)
    .eq('status', 'pending');
  if (error) throw error;
  return count ?? 0;
}

/** Today's date (India) as YYYY-MM-DD, matching the server's check for past dates. */
export function todayInIndia(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

/** Other confirmed bookings of the same pandit in the same date + time slot. */
export function slotConflicts(booking: Booking, all: Booking[]): Booking[] {
  return all.filter((b) => b.id !== booking.id && b.status === 'confirmed'
    && b.scheduled_date === booking.scheduled_date && b.scheduled_time === booking.scheduled_time);
}
