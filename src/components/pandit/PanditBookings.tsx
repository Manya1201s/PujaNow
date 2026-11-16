import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/toast';
import {
  changeBookingStatus, BookingConflictError, bookingErrorMessage, subscribeToBookings, refreshOnFocus,
  todayInIndia, slotConflicts, BOOKING_STATUS_LABEL, REJECTION_REASON_MIN, REJECTION_REASON_MAX,
} from '@/lib/bookingRequests';
import type { Booking, BookingStatus, Pandit } from '@/types';
import { SectionTitle } from '@/components/DashboardShell';
import { Badge, EmptyState, ErrorState, LoadingState, Modal } from '@/components/ui';
import { cn, formatDateTime, formatINR, timeAgo } from '@/lib/utils';
import {
  CalendarCheck, Calendar, Clock, MapPin, User, Phone, Mail, Hash, IndianRupee, CheckCircle2, XCircle,
  AlertTriangle, MessageSquareText, Lock, CreditCard, Inbox,
} from 'lucide-react';

type Filter = 'requests' | 'upcoming' | 'past' | 'all';

// Payment preference ids saved by BookingPage.
const PAYMENT_LABEL: Record<string, string> = { upi: 'UPI', card: 'Card', netbanking: 'Net banking', cod: 'Cash on service' };

const statusVariant: Record<BookingStatus, 'warning' | 'success' | 'default' | 'error'> = {
  pending: 'warning', confirmed: 'success', completed: 'default', cancelled: 'error', rejected: 'error',
};

/** Bookings assigned to this pandit (RLS: pn_bookings_select lets the owning pandit read them). */
async function fetchPanditBookings(panditId: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('pandit_id', panditId)
    .order('scheduled_date', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw new Error(bookingErrorMessage(error, 'Could not load your bookings'));
  return data as Booking[];
}

function prettyDate(iso: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString('en-IN', opts);
}

export function PanditBookings({ pandit, initialBookingId, onPendingChange }: {
  pandit: Pandit;
  initialBookingId?: string;
  onPendingChange?: (n: number) => void;
}) {
  const { show } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('requests');
  const [openId, setOpenId] = useState<string | null>(null);
  const [deepLinkHandled, setDeepLinkHandled] = useState(false);
  const today = todayInIndia();

  const load = useCallback(() => {
    fetchPanditBookings(pandit.id)
      .then((b) => { setBookings(b); setError(''); })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load your bookings'))
      .finally(() => setLoading(false));
  }, [pandit.id]);

  useEffect(() => {
    setLoading(true);
    load();
    const unsubscribe = subscribeToBookings({ column: 'pandit_id', value: pandit.id }, (row) => {
      setBookings((prev) => (prev.some((b) => b.id === row.id) ? prev.map((b) => (b.id === row.id ? row : b)) : [...prev, row]));
    });
    const stopRefresh = refreshOnFocus(load);
    return () => { unsubscribe(); stopRefresh(); };
  }, [pandit.id, load]);

  const pending = useMemo(() => bookings.filter((b) => b.status === 'pending'), [bookings]);
  useEffect(() => { onPendingChange?.(pending.length); }, [pending.length, onPendingChange]);

  // Opened from a notification: show that booking straight away.
  useEffect(() => {
    if (loading || deepLinkHandled || !initialBookingId) return;
    setDeepLinkHandled(true);
    const target = bookings.find((b) => b.id === initialBookingId);
    if (target) {
      setOpenId(target.id);
      setFilter(target.status === 'pending' ? 'requests' : 'all');
    } else {
      show('That booking is no longer assigned to you.', 'info');
    }
  }, [loading, deepLinkHandled, initialBookingId, bookings, show]);

  const lists: Record<Filter, Booking[]> = useMemo(() => {
    const upcoming = bookings.filter((b) => b.status === 'confirmed' && b.scheduled_date >= today);
    const past = bookings
      .filter((b) => b.status !== 'pending' && !(b.status === 'confirmed' && b.scheduled_date >= today))
      .sort((a, b) => b.scheduled_date.localeCompare(a.scheduled_date));
    return { requests: pending, upcoming, past, all: [...bookings].sort((a, b) => b.created_at.localeCompare(a.created_at)) };
  }, [bookings, pending, today]);

  const opened = bookings.find((b) => b.id === openId) || null;
  const replace = (b: Booking) => setBookings((prev) => prev.map((x) => (x.id === b.id ? b : x)));

  const header = <SectionTitle title="Bookings" subtitle="Booking requests from devotees, and your confirmed ceremonies." />;
  if (loading) return <div>{header}<div className="card"><LoadingState label="Loading your bookings…" /></div></div>;
  if (error) return <div>{header}<div className="card"><ErrorState message={error} /></div></div>;

  const filters: { id: Filter; label: string }[] = [
    { id: 'requests', label: 'Requests' },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'past', label: 'Past' },
    { id: 'all', label: 'All' },
  ];
  const visible = lists[filter];

  return (
    <div>
      {header}
      <div className="flex flex-wrap gap-2 mb-5">
        {filters.map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)} className={cn('chip', filter === f.id && 'chip-active')}>
            {f.label} <span className={cn('text-[11px] tabular-nums', filter === f.id ? 'text-cream-100/80' : 'text-charcoal-400')}>{lists[f.id].length}</span>
          </button>
        ))}
      </div>

      {pandit.verification_status !== 'verified' && bookings.length === 0 && (
        <p className="text-sm text-charcoal-500 mb-4">Devotees can book you once your profile is verified.</p>
      )}

      {visible.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={filter === 'requests' ? <Inbox size={28} /> : <CalendarCheck size={28} />}
            title={filter === 'requests' ? 'No requests waiting' : filter === 'upcoming' ? 'No upcoming ceremonies' : 'Nothing here yet'}
            description={filter === 'requests' ? 'New booking requests from devotees will appear here.' : 'Bookings you accept will be listed here.'}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((b) => <BookingRow key={b.id} booking={b} today={today} onOpen={() => setOpenId(b.id)} />)}
        </div>
      )}

      {opened && (
        <BookingDetailsModal
          booking={opened}
          all={bookings}
          today={today}
          onClose={() => setOpenId(null)}
          onUpdated={replace}
        />
      )}
    </div>
  );
}

function BookingRow({ booking: b, today, onOpen }: { booking: Booking; today: string; onOpen: () => void }) {
  const needsAction = b.status === 'pending';
  const expired = needsAction && b.scheduled_date < today;
  return (
    <button onClick={onOpen} className={cn('card-hover p-4 sm:p-5 text-left flex flex-col sm:flex-row sm:items-center gap-4', needsAction && !expired && 'border-accent-300')}>
      <div className={cn('w-16 shrink-0 rounded-2xl py-2 text-center', needsAction ? 'bg-gradient-to-br from-primary-700 to-primary-900 text-cream-50' : 'bg-cream-200 text-charcoal-600')}>
        <span className="block text-[11px] uppercase tracking-wider opacity-80">{prettyDate(b.scheduled_date, { month: 'short' })}</span>
        <span className="block font-display text-2xl font-semibold leading-none">{Number(b.scheduled_date.slice(8, 10))}</span>
        <span className="block text-[11px] opacity-80">{prettyDate(b.scheduled_date, { weekday: 'short' })}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-display text-lg font-semibold text-charcoal-800 leading-snug">{b.puja_name}</p>
          <Badge variant={statusVariant[b.status]}>{expired ? 'Date passed' : BOOKING_STATUS_LABEL[b.status]}</Badge>
        </div>
        <p className="text-xs text-charcoal-500 mt-1 flex flex-wrap gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1"><User size={12} /> {b.customer_name}</span>
          <span className="inline-flex items-center gap-1"><Clock size={12} /> {b.scheduled_time}</span>
          <span className="inline-flex items-center gap-1"><MapPin size={12} /> {b.city}</span>
          <span className="inline-flex items-center gap-1"><Hash size={12} /> {b.booking_ref}</span>
        </p>
        {needsAction && <p className="text-[11px] text-charcoal-400 mt-1">Requested {timeAgo(b.created_at)}</p>}
      </div>
      <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
        <span className="font-display text-lg font-semibold text-primary-700">{formatINR(b.amount)}</span>
        <span className={cn('text-xs font-medium', needsAction && !expired ? 'text-primary-700' : 'text-charcoal-500')}>
          {needsAction && !expired ? 'Review request →' : 'View details →'}
        </span>
      </div>
    </button>
  );
}

function BookingDetailsModal({ booking: b, all, today, onClose, onUpdated }: {
  booking: Booking;
  all: Booking[];
  today: string;
  onClose: () => void;
  onUpdated: (b: Booking) => void;
}) {
  const { show } = useToast();
  const [mode, setMode] = useState<'view' | 'decline' | 'cancel'>('view');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<BookingStatus | null>(null);
  const [error, setError] = useState('');

  const isPending = b.status === 'pending';
  const pastDate = b.scheduled_date < today;
  const conflicts = isPending ? slotConflicts(b, all) : [];
  const canAccept = isPending && !pastDate && conflicts.length === 0;
  // Contact details and the street address are shown once the pandit has accepted the booking.
  const showContact = b.status === 'confirmed' || b.status === 'completed';
  const reasonLen = reason.trim().length;

  const act = async (to: BookingStatus, from: BookingStatus[], okMessage: string, why?: string) => {
    if (busy) return;
    setError('');
    setBusy(to);
    try {
      const updated = await changeBookingStatus(b.id, to, { from, reason: why });
      onUpdated(updated);
      show(okMessage, 'success');
      setMode('view');
      setReason('');
    } catch (e: unknown) {
      if (e instanceof BookingConflictError && e.current) onUpdated(e.current);
      setError(e instanceof Error ? e.message : bookingErrorMessage(e));
    }
    setBusy(null);
  };

  return (
    <Modal open onClose={() => !busy && onClose()} title="Booking details" size="lg">
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-display text-2xl font-semibold text-charcoal-800 leading-snug">{b.puja_name}</p>
            <p className="text-xs text-charcoal-500 mt-1 inline-flex items-center gap-1"><Hash size={12} /> Booking ID {b.booking_ref}</p>
          </div>
          <Badge variant={statusVariant[b.status]}>{BOOKING_STATUS_LABEL[b.status]}</Badge>
        </div>

        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-4 rounded-2xl bg-cream-100/70 border border-cream-300 p-4 sm:p-5">
          <Detail icon={Calendar} label="Date">{prettyDate(b.scheduled_date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</Detail>
          <Detail icon={Clock} label="Time">{b.scheduled_time}</Detail>
          <Detail icon={User} label="Devotee">{b.customer_name}</Detail>
          <Detail icon={IndianRupee} label="Dakshina">{formatINR(b.amount)}</Detail>
          <Detail icon={MapPin} label="Location" wide>
            {showContact ? <>{b.address}, {b.city}{b.pincode ? ` ${b.pincode}` : ''}</> : <>{b.city}{b.pincode ? ` ${b.pincode}` : ''}</>}
          </Detail>
          {showContact ? (
            <>
              <Detail icon={Phone} label="Phone"><a href={`tel:${b.customer_phone}`} className="text-primary-700 hover:underline">{b.customer_phone}</a></Detail>
              <Detail icon={Mail} label="Email">{b.customer_email ? <a href={`mailto:${b.customer_email}`} className="text-primary-700 hover:underline break-all">{b.customer_email}</a> : 'Not provided'}</Detail>
            </>
          ) : (
            <div className="sm:col-span-2 flex items-start gap-2 text-xs text-charcoal-500">
              <Lock size={13} className="mt-0.5 shrink-0" /> The devotee's phone number, email and full address are shown after you accept.
            </div>
          )}
          <Detail icon={CreditCard} label="Payment">{b.payment_method ? `${PAYMENT_LABEL[b.payment_method] || b.payment_method} · ` : ''}{b.payment_status === 'paid' ? 'Paid' : b.payment_status === 'pending' ? 'Not paid yet' : b.payment_status}</Detail>
          <Detail icon={Clock} label="Requested">{formatDateTime(b.created_at)}</Detail>
          {b.instructions && <Detail icon={MessageSquareText} label="Devotee's note" wide><span className="whitespace-pre-line break-words">{b.instructions}</span></Detail>}
        </dl>

        {b.status === 'rejected' && b.rejection_reason && (
          <div className="rounded-2xl border border-error-200 bg-error-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-error-700">Your reason for declining</p>
            <p className="text-sm text-charcoal-700 mt-1 whitespace-pre-line break-words">{b.rejection_reason}</p>
          </div>
        )}
        {b.responded_at && b.status !== 'pending' && (
          <p className="text-xs text-charcoal-500">Responded {formatDateTime(b.responded_at)}</p>
        )}

        {isPending && pastDate && (
          <Notice>This date has already passed, so the request can't be accepted. Please decline it so the devotee can rebook.</Notice>
        )}
        {conflicts.length > 0 && (
          <Notice>
            You already have a confirmed booking at this time ({conflicts.map((c) => `${c.puja_name}, ${c.booking_ref}`).join('; ')}). Decline this request or cancel the other booking first.
          </Notice>
        )}

        {error && <p className="text-sm text-error-700 bg-error-50 border border-error-200 rounded-xl px-3 py-2" role="alert">{error}</p>}

        {/* Actions */}
        {isPending && mode === 'view' && (
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2 border-t border-cream-300">
            <button onClick={() => { setMode('decline'); setError(''); }} disabled={!!busy} className="btn-outline border-error-200 text-error-700 hover:bg-error-50 hover:border-error-300">
              <XCircle size={16} /> Decline Booking
            </button>
            <button
              onClick={() => act('confirmed', ['pending'], 'Booking accepted. The devotee has been notified.')}
              disabled={!canAccept || !!busy}
              className="btn-primary"
            >
              <CheckCircle2 size={16} /> {busy === 'confirmed' ? 'Accepting…' : 'Accept Booking'}
            </button>
          </div>
        )}

        {isPending && mode === 'decline' && (
          <div className="pt-2 border-t border-cream-300">
            <label className="label" htmlFor="decline-reason">Reason for declining (shared with the devotee)</label>
            <textarea
              id="decline-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={REJECTION_REASON_MAX}
              className="input resize-none"
              placeholder="e.g. I'm travelling on this date. Please choose another day or pandit."
              autoFocus
            />
            <div className="flex justify-between text-[11px] mt-1">
              <span className={reasonLen > 0 && reasonLen < REJECTION_REASON_MIN ? 'text-error-700' : 'text-charcoal-400'}>At least {REJECTION_REASON_MIN} characters</span>
              <span className="text-charcoal-400 tabular-nums">{reason.length}/{REJECTION_REASON_MAX}</span>
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-4">
              <button onClick={() => { setMode('view'); setReason(''); setError(''); }} disabled={!!busy} className="btn-ghost">Back</button>
              <button
                onClick={() => act('rejected', ['pending'], 'Booking declined. The devotee has been notified.', reason)}
                disabled={reasonLen < REJECTION_REASON_MIN || !!busy}
                className="btn-danger"
              >
                <XCircle size={16} /> {busy === 'rejected' ? 'Declining…' : 'Confirm Decline'}
              </button>
            </div>
          </div>
        )}

        {b.status === 'confirmed' && mode === 'view' && (
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2 border-t border-cream-300">
            <button onClick={() => { setMode('cancel'); setError(''); }} disabled={!!busy} className="btn-ghost text-error-700 hover:bg-error-50">Cancel Booking</button>
            <button
              onClick={() => act('completed', ['confirmed'], 'Marked as completed.')}
              disabled={b.scheduled_date > today || !!busy}
              title={b.scheduled_date > today ? 'Available on or after the ceremony date' : undefined}
              className="btn-primary"
            >
              <CheckCircle2 size={16} /> {busy === 'completed' ? 'Saving…' : 'Mark as Completed'}
            </button>
          </div>
        )}

        {b.status === 'confirmed' && mode === 'cancel' && (
          <div className="pt-2 border-t border-cream-300">
            <p className="text-sm text-charcoal-700">Cancel this confirmed booking? The devotee will be notified. This can't be undone.</p>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-4">
              <button onClick={() => setMode('view')} disabled={!!busy} className="btn-ghost">Keep Booking</button>
              <button onClick={() => act('cancelled', ['confirmed'], 'Booking cancelled. The devotee has been notified.')} disabled={!!busy} className="btn-danger">
                {busy === 'cancelled' ? 'Cancelling…' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function Detail({ icon: Icon, label, wide, children }: { icon: typeof User; label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={cn('min-w-0', wide && 'sm:col-span-2')}>
      <dt className="text-[11px] uppercase tracking-wider text-charcoal-500 flex items-center gap-1.5"><Icon size={12} /> {label}</dt>
      <dd className="text-sm font-medium text-charcoal-800 mt-0.5 break-words">{children}</dd>
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-2xl border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-800">
      <AlertTriangle size={16} className="shrink-0 mt-0.5" /> <span>{children}</span>
    </div>
  );
}
