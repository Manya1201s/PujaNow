import { useEffect, useState } from 'react';
import { useToast } from '@/lib/toast';
import { updatePanditProfile } from '@/lib/data';
import {
  fetchWeeklySlots, addWeeklySlot, deleteWeeklySlot,
  fetchBlockedDates, addBlockedDate, deleteBlockedDate,
  WEEKDAYS, MAX_SLOTS_PER_DAY, todayISO, formatTime, formatISODate, dbErrorMessage,
} from '@/lib/panditManagement';
import type { Pandit, WeeklySlot, BlockedDate } from '@/types';
import { SectionTitle } from '@/components/DashboardShell';
import { ErrorState, LoadingState } from '@/components/ui';
import { cn } from '@/lib/utils';
import { Plus, X, CalendarX, CalendarClock, Trash2 } from 'lucide-react';

// Monday first, as most people read a week; values stay 0 = Sunday … 6 = Saturday (database convention).
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const short = (d: number) => WEEKDAYS[d].slice(0, 3);
const hhmm = (t: string) => t.slice(0, 5);

export function AvailabilityManager({ pandit, onPanditChange }: { pandit: Pandit; onPanditChange: (p: Pandit) => void }) {
  const [slots, setSlots] = useState<WeeklySlot[]>([]);
  const [blocked, setBlocked] = useState<BlockedDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchWeeklySlots(pandit.id), fetchBlockedDates(pandit.id)])
      .then(([s, b]) => { setSlots(s); setBlocked(b); })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load availability'))
      .finally(() => setLoading(false));
  }, [pandit.id]);

  const header = <SectionTitle title="Availability" subtitle="Your regular weekly hours and the dates you're away." />;
  if (loading) return <div>{header}<div className="card"><LoadingState label="Loading availability…" /></div></div>;
  if (error) return <div>{header}<div className="card"><ErrorState message={error} /></div></div>;

  return (
    <div>
      {header}
      <div className="space-y-5">
        <AcceptingToggle pandit={pandit} onChange={onPanditChange} />
        <WeeklySchedule panditId={pandit.id} slots={slots} setSlots={setSlots} />
        <BlockedDates panditId={pandit.id} blocked={blocked} setBlocked={setBlocked} />
      </div>
    </div>
  );
}

function AcceptingToggle({ pandit, onChange }: { pandit: Pandit; onChange: (p: Pandit) => void }) {
  const { show } = useToast();
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    setBusy(true);
    try {
      // is_available alone never changes verification status (see pn_pandits_guard).
      const saved = await updatePanditProfile(pandit.id, { is_available: !pandit.is_available });
      onChange(saved);
      show(saved.is_available ? 'Your profile shows you are accepting bookings' : 'Your profile shows you are not taking new bookings', 'success');
    } catch (e: unknown) {
      show(dbErrorMessage(e, 'Could not update'), 'error');
    }
    setBusy(false);
  };
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className="flex-1">
        <p className="text-sm font-semibold text-charcoal-800">Accepting new bookings</p>
        <p className="text-xs text-charcoal-500 mt-0.5">Shown on your public profile. Turn it off to show devotees you're not taking new requests right now.</p>
      </div>
      <button
        role="switch"
        aria-checked={pandit.is_available}
        aria-label="Accepting new bookings"
        onClick={toggle}
        disabled={busy}
        className={cn('relative w-12 h-7 rounded-full transition-colors shrink-0 disabled:opacity-60', pandit.is_available ? 'bg-success-500' : 'bg-cream-400')}
      >
        <span className={cn('absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform', pandit.is_available && 'translate-x-5')} />
      </button>
    </div>
  );
}

function WeeklySchedule({ panditId, slots, setSlots }: {
  panditId: string;
  slots: WeeklySlot[];
  setSlots: React.Dispatch<React.SetStateAction<WeeklySlot[]>>;
}) {
  const { show } = useToast();
  const [days, setDays] = useState<number[]>([]);
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('13:00');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [removing, setRemoving] = useState<string | null>(null);

  const toggleDay = (d: number) => setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  const sortSlots = (list: WeeklySlot[]) => [...list].sort((a, b) => a.weekday - b.weekday || a.start_time.localeCompare(b.start_time));

  const add = async () => {
    setError('');
    if (days.length === 0) return setError('Choose at least one day.');
    if (!start || !end) return setError('Enter a start and end time.');
    if (end <= start) return setError('The end time must be after the start time.');

    // Same rules as pn_weekly_availability_check, checked first for a clearer message.
    const problems: string[] = [];
    const okDays: number[] = [];
    for (const d of days) {
      const daySlots = slots.filter((s) => s.weekday === d);
      if (daySlots.length >= MAX_SLOTS_PER_DAY) problems.push(`${short(d)}: already has ${MAX_SLOTS_PER_DAY} slots`);
      else if (daySlots.some((s) => hhmm(s.start_time) < end && start < hhmm(s.end_time))) problems.push(`${short(d)}: overlaps an existing slot`);
      else okDays.push(d);
    }

    setBusy(true);
    const added: WeeklySlot[] = [];
    for (const d of okDays) {
      try {
        added.push(await addWeeklySlot(panditId, d, start, end));
      } catch (e: unknown) {
        problems.push(`${short(d)}: ${e instanceof Error ? e.message : 'could not add'}`);
      }
    }
    setBusy(false);
    if (added.length) {
      setSlots((prev) => sortSlots([...prev, ...added]));
      show(`Added ${formatTime(start)}–${formatTime(end)} to ${added.length} day${added.length === 1 ? '' : 's'}`, 'success');
      setDays([]);
    }
    if (problems.length) setError(problems.join(' · '));
  };

  const remove = async (slot: WeeklySlot) => {
    setRemoving(slot.id);
    try {
      await deleteWeeklySlot(slot.id);
      setSlots((prev) => prev.filter((s) => s.id !== slot.id));
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : 'Could not remove the slot', 'error');
    }
    setRemoving(null);
  };

  return (
    <div className="card p-5 sm:p-6">
      <p className="flex items-center gap-2 text-sm font-semibold text-charcoal-800"><CalendarClock size={16} className="text-primary-600" /> Weekly schedule</p>
      <p className="text-xs text-charcoal-500 mt-0.5">Times are local (India) time. Up to {MAX_SLOTS_PER_DAY} non-overlapping slots per day.</p>

      <div className="mt-4 rounded-2xl bg-cream-100/80 border border-cream-300/70 p-4">
        <p className="text-xs font-medium text-charcoal-600 mb-2">Add a time slot to</p>
        <div className="flex flex-wrap gap-2">
          {DAY_ORDER.map((d) => (
            <button key={d} type="button" onClick={() => toggleDay(d)} aria-pressed={days.includes(d)} className={cn('chip', days.includes(d) && 'chip-active')}>
              {short(d)}
            </button>
          ))}
          <button type="button" onClick={() => setDays([1, 2, 3, 4, 5])} className="text-xs font-medium text-primary-700 hover:underline px-1">Weekdays</button>
          <button type="button" onClick={() => setDays([...DAY_ORDER])} className="text-xs font-medium text-primary-700 hover:underline px-1">All days</button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-[160px_160px_auto] gap-3 mt-3 items-end">
          <div>
            <label className="label" htmlFor="slot-start">From</label>
            <input id="slot-start" type="time" step={900} className="input py-2" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="slot-end">To</label>
            <input id="slot-end" type="time" step={900} className="input py-2" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <button onClick={add} disabled={busy} className="btn-primary col-span-2 sm:col-span-1 justify-self-start"><Plus size={15} /> {busy ? 'Adding…' : 'Add slot'}</button>
        </div>
        {error && <p className="text-xs text-error-700 mt-2" role="alert">{error}</p>}
      </div>

      <div className="mt-4 divide-y divide-cream-200">
        {DAY_ORDER.map((d) => {
          const daySlots = slots.filter((s) => s.weekday === d);
          return (
            <div key={d} className="py-3 flex flex-col sm:flex-row sm:items-center gap-2">
              <p className="w-28 text-sm font-medium text-charcoal-700 shrink-0">{WEEKDAYS[d]}</p>
              {daySlots.length === 0 ? (
                <p className="text-xs text-charcoal-400">Unavailable</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {daySlots.map((s) => (
                    <span key={s.id} className="inline-flex items-center gap-1 pl-3 pr-1 py-1 rounded-full bg-primary-50 text-primary-800 text-xs font-medium border border-primary-100">
                      {formatTime(s.start_time)} – {formatTime(s.end_time)}
                      <button
                        onClick={() => remove(s)}
                        disabled={removing === s.id}
                        className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-primary-100 disabled:opacity-50"
                        aria-label={`Remove ${WEEKDAYS[d]} ${formatTime(s.start_time)} to ${formatTime(s.end_time)}`}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BlockedDates({ panditId, blocked, setBlocked }: {
  panditId: string;
  blocked: BlockedDate[];
  setBlocked: React.Dispatch<React.SetStateAction<BlockedDate[]>>;
}) {
  const { show } = useToast();
  const minDate = todayISO();
  const maxDate = todayISO(730);
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [removing, setRemoving] = useState<string | null>(null);

  const add = async () => {
    setError('');
    if (!date) return setError('Choose a date.');
    if (date < minDate || date > maxDate) return setError('Choose a date between today and two years from now.');
    if (blocked.some((b) => b.blocked_date === date)) return setError('This date is already blocked.');
    setBusy(true);
    try {
      const row = await addBlockedDate(panditId, date, note.trim() || null);
      setBlocked((prev) => [...prev, row].sort((a, b) => a.blocked_date.localeCompare(b.blocked_date)));
      setDate('');
      setNote('');
      show(`${formatISODate(row.blocked_date)} blocked`, 'success');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not block the date');
    }
    setBusy(false);
  };

  const remove = async (b: BlockedDate) => {
    setRemoving(b.id);
    try {
      await deleteBlockedDate(b.id);
      setBlocked((prev) => prev.filter((x) => x.id !== b.id));
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : 'Could not remove the date', 'error');
    }
    setRemoving(null);
  };

  return (
    <div className="card p-5 sm:p-6">
      <p className="flex items-center gap-2 text-sm font-semibold text-charcoal-800"><CalendarX size={16} className="text-primary-600" /> Blocked dates</p>
      <p className="text-xs text-charcoal-500 mt-0.5">Days you can't take bookings (travel, festivals, personal). Your note is private to you and PujaNow admins.</p>

      <div className="grid sm:grid-cols-[180px_1fr_auto] gap-3 mt-4 items-end">
        <div>
          <label className="label" htmlFor="bd-date">Date</label>
          <input id="bd-date" type="date" className="input py-2" min={minDate} max={maxDate} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="bd-note">Private note (optional)</label>
          <input id="bd-note" className="input py-2" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="e.g. Travelling to Haridwar" />
        </div>
        <button onClick={add} disabled={busy} className="btn-primary justify-self-start"><Plus size={15} /> {busy ? 'Blocking…' : 'Block date'}</button>
      </div>
      {error && <p className="text-xs text-error-700 mt-2" role="alert">{error}</p>}

      {blocked.length === 0 ? (
        <p className="text-sm text-charcoal-400 mt-5">No upcoming blocked dates.</p>
      ) : (
        <ul className="mt-5 divide-y divide-cream-200 border-t border-cream-200">
          {blocked.map((b) => (
            <li key={b.id} className="py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-charcoal-800">{formatISODate(b.blocked_date)}</p>
                {b.note && <p className="text-xs text-charcoal-500 truncate">{b.note}</p>}
              </div>
              <button
                onClick={() => remove(b)}
                disabled={removing === b.id}
                className="icon-btn text-error-600 hover:bg-error-50 disabled:opacity-50"
                aria-label={`Unblock ${formatISODate(b.blocked_date)}`}
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
