import { useEffect, useMemo, useState } from 'react';
import { Link } from '@/lib/router';
import { useToast } from '@/lib/toast';
import {
  fetchPanditServices, fetchWeeklySlots, fetchVerificationEvents, reviewPandit,
  formatTime, WEEKDAYS, REJECTION_REASON_MAX, type PanditWithOwner,
} from '@/lib/panditManagement';
import type { PanditService, VerificationEvent, VerificationStatus, WeeklySlot } from '@/types';
import { SectionTitle } from '@/components/DashboardShell';
import { Badge, EmptyState, LoadingState, Modal } from '@/components/ui';
import { cn, formatDate, formatDateTime, formatINR } from '@/lib/utils';
import {
  Search, ClipboardCheck, BadgeCheck, XCircle, Mail, Phone, MapPin, Award, Languages, IndianRupee,
  History, ExternalLink, Clock, ArrowRight,
} from 'lucide-react';

type Filter = VerificationStatus | 'all';
const statusBadge: Record<VerificationStatus, { variant: 'warning' | 'success' | 'error'; label: string }> = {
  pending: { variant: 'warning', label: 'Pending' },
  verified: { variant: 'success', label: 'Verified' },
  rejected: { variant: 'error', label: 'Rejected' },
};
const MIN_REASON = 10;

/** Oldest submission first, the order of the review queue (coalesce(submitted_at, created_at)). */
const queueTime = (p: PanditWithOwner) => p.submitted_at || p.created_at || '';

export function PanditApplications({ pandits, onUpdated }: { pandits: PanditWithOwner[]; onUpdated: (p: PanditWithOwner) => void }) {
  const [filter, setFilter] = useState<Filter>('pending');
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const counts = useMemo(() => ({
    all: pandits.length,
    pending: pandits.filter((p) => p.verification_status === 'pending').length,
    verified: pandits.filter((p) => p.verification_status === 'verified').length,
    rejected: pandits.filter((p) => p.verification_status === 'rejected').length,
  }), [pandits]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const rows = pandits.filter((p) =>
      (filter === 'all' || p.verification_status === filter) &&
      (!s || p.display_name.toLowerCase().includes(s) || p.location.toLowerCase().includes(s) ||
        (p.owner?.email || '').toLowerCase().includes(s) || (p.owner?.phone || '').includes(s)),
    );
    return filter === 'pending'
      ? rows.sort((a, b) => queueTime(a).localeCompare(queueTime(b)))
      : rows.sort((a, b) => (b.reviewed_at || queueTime(b)).localeCompare(a.reviewed_at || queueTime(a)));
  }, [pandits, filter, q]);

  const open = pandits.find((p) => p.id === openId) || null;

  return (
    <div>
      <SectionTitle title="Pandit Applications" subtitle={`${counts.pending} awaiting review · oldest first`} />
      <div className="card p-4 mb-4 flex flex-col sm:flex-row gap-3 sm:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Search pandits</span>
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-400 pointer-events-none" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, city, email or phone" className="input pl-11" />
        </label>
        <div className="flex gap-2 flex-wrap">
          {(['pending', 'verified', 'rejected', 'all'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={cn('chip', filter === f && 'chip-active')}>
              {f === 'all' ? 'All' : statusBadge[f].label} <span className="opacity-70">{counts[f]}</span>
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<ClipboardCheck size={26} className="text-charcoal-400" />}
            title={filter === 'pending' && !q ? 'No applications waiting' : 'No matching pandits'}
            description={filter === 'pending' && !q ? 'New and resubmitted pandit profiles will appear here.' : 'Try a different search or filter.'}
          />
        </div>
      ) : (
        <div className="card divide-y divide-cream-200">
          {list.map((p) => (
            <div key={p.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar name={p.display_name} url={p.photo_url} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-charcoal-800 truncate">{p.display_name}</p>
                    <Badge variant={statusBadge[p.verification_status].variant}>{statusBadge[p.verification_status].label}</Badge>
                    {!p.profile_id && <Badge>Catalogue</Badge>}
                  </div>
                  <p className="text-xs text-charcoal-500 truncate">
                    {[p.location, `${p.experience_years} yrs`, p.owner?.email].filter(Boolean).join(' · ')}
                  </p>
                  <p className="text-[11px] text-charcoal-400 mt-0.5">
                    {p.verification_status === 'pending'
                      ? `Submitted ${formatDate(queueTime(p) || new Date())}`
                      : p.reviewed_at ? `Reviewed ${formatDate(p.reviewed_at)}` : ''}
                  </p>
                </div>
              </div>
              <button onClick={() => setOpenId(p.id)} className={cn(p.verification_status === 'pending' ? 'btn-primary' : 'btn-outline', 'self-start sm:self-center')}>
                Review <ArrowRight size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {open && <ReviewModal pandit={open} onClose={() => setOpenId(null)} onUpdated={onUpdated} />}
    </div>
  );
}

function Avatar({ name, url, size = 'md' }: { name: string; url: string | null; size?: 'md' | 'lg' }) {
  return (
    <span className={cn('rounded-full bg-primary-100 text-primary-700 font-display flex items-center justify-center overflow-hidden shrink-0',
      size === 'lg' ? 'w-20 h-20 text-3xl' : 'w-11 h-11 text-lg')}>
      {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : (name.replace(/^Pt\.?\s*/i, '')[0]?.toUpperCase() || 'P')}
    </span>
  );
}

function ReviewModal({ pandit, onClose, onUpdated }: { pandit: PanditWithOwner; onClose: () => void; onUpdated: (p: PanditWithOwner) => void }) {
  const { show } = useToast();
  const [services, setServices] = useState<PanditService[]>([]);
  const [slots, setSlots] = useState<WeeklySlot[]>([]);
  const [events, setEvents] = useState<VerificationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [mode, setMode] = useState<'view' | 'reject'>('view');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState('');

  const loadDetails = () =>
    Promise.all([fetchPanditServices(pandit.id), fetchWeeklySlots(pandit.id), fetchVerificationEvents(pandit.id)])
      .then(([s, w, e]) => { setServices(s); setSlots(w); setEvents(e); })
      .catch((e: unknown) => setLoadError(e instanceof Error ? e.message : 'Could not load details'))
      .finally(() => setLoading(false));

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadDetails(); }, [pandit.id]);

  const decide = async (decision: 'verified' | 'rejected') => {
    setError('');
    const r = reason.trim();
    if (decision === 'rejected' && r.length < MIN_REASON) {
      setError(`Please explain what the pandit needs to change (at least ${MIN_REASON} characters). They will see this message.`);
      return;
    }
    setBusy(decision === 'verified' ? 'approve' : 'reject');
    try {
      const updated = await reviewPandit(pandit.id, decision, r);
      onUpdated(updated);
      show(decision === 'verified' ? `${updated.display_name} approved. They have been notified.` : `${updated.display_name} rejected. They have been notified with your reason.`, 'success');
      setMode('view');
      setReason('');
      await loadDetails();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not save the decision');
    }
    setBusy(null);
  };

  const st = pandit.verification_status;
  const slotsByDay = [1, 2, 3, 4, 5, 6, 0]
    .map((d) => ({ d, list: slots.filter((s) => s.weekday === d) }))
    .filter((x) => x.list.length > 0);

  return (
    <Modal open onClose={onClose} title="Review pandit profile" size="lg">
      <div className="space-y-6">
        {/* Identity */}
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
          <Avatar name={pandit.display_name} url={pandit.photo_url} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display text-xl font-semibold text-charcoal-800">{pandit.display_name}</h3>
              <Badge variant={statusBadge[st].variant}>{statusBadge[st].label}</Badge>
            </div>
            <div className="mt-1.5 space-y-0.5 text-xs text-charcoal-500">
              {pandit.owner?.full_name && <p>Account: {pandit.owner.full_name}</p>}
              {pandit.owner?.email && <p className="flex items-center gap-1.5"><Mail size={12} /> {pandit.owner.email}</p>}
              {pandit.owner?.phone && <p className="flex items-center gap-1.5"><Phone size={12} /> {pandit.owner.phone}</p>}
              {!pandit.profile_id && <p>Catalogue pandit (no login account)</p>}
            </div>
          </div>
          {st === 'verified' && (
            <Link to={`/pandits/${pandit.id}`} className="btn-ghost text-xs self-start">Public page <ExternalLink size={13} /></Link>
          )}
        </div>

        {!pandit.photo_url && <p className="text-xs text-warning-700 bg-warning-50 rounded-xl px-3 py-2">No profile photo uploaded.</p>}

        <div className="grid grid-cols-2 gap-3 text-sm">
          <Fact icon={MapPin} label="City" value={pandit.location || 'Not provided'} />
          <Fact icon={Award} label="Experience" value={`${pandit.experience_years} years`} />
          <Fact icon={Languages} label="Languages" value={pandit.languages.join(', ') || 'Not provided'} />
          <Fact icon={IndianRupee} label="Base dakshina" value={formatINR(pandit.base_price)} />
        </div>

        <Block title="About">
          <p className="text-sm text-charcoal-600 whitespace-pre-line break-words">{pandit.bio?.trim() || <span className="text-charcoal-400">Not provided.</span>}</p>
          {pandit.specializations.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {pandit.specializations.map((s) => <Badge key={s} variant="primary">{s}</Badge>)}
            </div>
          )}
        </Block>

        {loading ? (
          <LoadingState label="Loading services, availability and history…" />
        ) : loadError ? (
          <p className="text-sm text-error-700">{loadError}</p>
        ) : (
          <>
            <Block title={`Services (${services.length})`}>
              {services.length === 0 ? (
                <p className="text-sm text-charcoal-400">No services added.</p>
              ) : (
                <ul className="text-sm divide-y divide-cream-200">
                  {services.map((s) => (
                    <li key={s.id} className="py-1.5 flex justify-between gap-3">
                      <span className="text-charcoal-700">{s.puja?.name || 'Puja'}</span>
                      <span className="text-charcoal-500 shrink-0">{formatINR(s.custom_price ?? pandit.base_price)}{s.custom_price == null ? ' (base)' : ''}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Block>

            <Block title="Weekly availability">
              {slotsByDay.length === 0 ? (
                <p className="text-sm text-charcoal-400">No weekly hours set.</p>
              ) : (
                <ul className="text-sm space-y-1">
                  {slotsByDay.map(({ d, list }) => (
                    <li key={d} className="flex gap-3">
                      <span className="w-24 text-charcoal-700 shrink-0">{WEEKDAYS[d]}</span>
                      <span className="text-charcoal-500">{list.map((s) => `${formatTime(s.start_time)}–${formatTime(s.end_time)}`).join(', ')}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Block>

            <Block title="Review history" icon={History}>
              {events.length === 0 ? (
                <p className="text-sm text-charcoal-400">No decisions recorded yet.</p>
              ) : (
                <ol className="space-y-3">
                  {events.map((ev) => (
                    <li key={ev.id} className="relative pl-5">
                      <span className={cn('absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full',
                        ev.to_status === 'verified' ? 'bg-success-500' : ev.to_status === 'rejected' ? 'bg-error-500' : 'bg-warning-500')} />
                      <p className="text-sm text-charcoal-700">
                        <span className="capitalize">{ev.from_status || 'new'}</span> → <span className="font-semibold capitalize">{ev.to_status}</span>
                        <span className="text-charcoal-400"> · {ev.actor?.full_name || ev.actor?.email || (ev.actor_id ? 'Admin' : 'System / SQL editor')}</span>
                      </p>
                      <p className="text-[11px] text-charcoal-400">{formatDateTime(ev.created_at)}</p>
                      {ev.reason && <p className="text-xs text-charcoal-600 mt-1 bg-cream-100 rounded-lg px-3 py-2 whitespace-pre-line break-words">{ev.reason}</p>}
                    </li>
                  ))}
                </ol>
              )}
              {st === 'pending' && pandit.rejection_reason && (
                <p className="text-xs text-charcoal-500 mt-3">Resubmitted after a rejection. Previous feedback: “{pandit.rejection_reason}”</p>
              )}
            </Block>
          </>
        )}

        {/* Decision */}
        <div className="border-t border-cream-300 pt-5">
          {error && <p className="bg-error-50 border border-error-200 text-error-700 text-sm rounded-2xl px-4 py-3 mb-4" role="alert">{error}</p>}
          {mode === 'reject' ? (
            <div>
              <label className="label" htmlFor="reject-reason">Reason for rejection (shown to the pandit)</label>
              <textarea
                id="reject-reason"
                className="input resize-none"
                rows={4}
                maxLength={REJECTION_REASON_MAX}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Please upload a clear front-facing photo and list the pujas you perform with prices."
                autoFocus
              />
              <p className="text-[11px] text-charcoal-400 mt-1 text-right">{reason.trim().length}/{REJECTION_REASON_MAX}</p>
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-3">
                <button onClick={() => { setMode('view'); setError(''); }} disabled={busy !== null} className="btn-ghost">Cancel</button>
                <button onClick={() => decide('rejected')} disabled={busy !== null || reason.trim().length === 0} className="btn-danger">
                  <XCircle size={15} /> {busy === 'reject' ? 'Rejecting…' : 'Reject profile'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2">
              <p className="text-xs text-charcoal-400 sm:mr-auto flex items-center gap-1.5">
                <Clock size={12} /> {st === 'pending' ? `Waiting since ${formatDate(queueTime(pandit) || new Date())}` : pandit.reviewed_at ? `Last reviewed ${formatDateTime(pandit.reviewed_at)}` : ''}
              </p>
              {st !== 'rejected' && (
                <button onClick={() => { setMode('reject'); setError(''); }} disabled={busy !== null} className="btn-outline border-error-200 text-error-700 hover:bg-error-50">
                  <XCircle size={15} /> {st === 'verified' ? 'Revoke & reject' : 'Reject'}
                </button>
              )}
              {st !== 'verified' && (
                <button onClick={() => decide('verified')} disabled={busy !== null} className="btn-primary">
                  <BadgeCheck size={15} /> {busy === 'approve' ? 'Approving…' : 'Approve'}
                </button>
              )}
            </div>
          )}
          {st === 'rejected' && mode === 'view' && pandit.rejection_reason && (
            <p className="text-xs text-charcoal-500 mt-3">Current feedback to pandit: “{pandit.rejection_reason}”</p>
          )}
        </div>
      </div>
    </Modal>
  );
}

function Fact({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-cream-100 border border-cream-300/70 px-3 py-2.5 min-w-0">
      <p className="text-[11px] text-charcoal-400 flex items-center gap-1"><Icon size={12} /> {label}</p>
      <p className="text-sm font-medium text-charcoal-700 truncate" title={value}>{value}</p>
    </div>
  );
}

function Block({ title, icon: Icon, children }: { title: string; icon?: typeof MapPin; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-charcoal-400 mb-2 flex items-center gap-1.5">
        {Icon && <Icon size={12} />} {title}
      </p>
      {children}
    </div>
  );
}
