import { useEffect, useState } from 'react';
import { Link } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { fetchPanditForProfile, fetchNotifications } from '@/lib/data';
import { fetchPanditServices, fetchWeeklySlots } from '@/lib/panditManagement';
import type { Pandit } from '@/types';
import { LoadingState, ErrorState, Badge } from '@/components/ui';
import { DashboardShell, AccountSettings, type DashTab } from '@/components/DashboardShell';
import { NotificationsPanel } from '@/components/NotificationsPanel';
import { PanditProfileEditor } from '@/components/pandit/PanditProfileEditor';
import { ServicesManager } from '@/components/pandit/ServicesManager';
import { AvailabilityManager } from '@/components/pandit/AvailabilityManager';
import { PanditBookings } from '@/components/pandit/PanditBookings';
import { countPendingRequests } from '@/lib/bookingRequests';
import { getQueryParam } from '@/lib/hooks';
import { formatDate, formatINR, firstName, cn } from '@/lib/utils';
import {
  LayoutDashboard, BookOpenText, Settings, Clock, BadgeCheck, XCircle, ArrowRight, MapPin, Languages, Award,
  IndianRupee, ExternalLink, Sparkles, CalendarClock, Bell, CheckCircle2, Circle, RotateCcw, CalendarCheck,
} from 'lucide-react';

type Tab = 'overview' | 'bookings' | 'profile' | 'services' | 'availability' | 'notifications' | 'account';
const validTabs: Tab[] = ['overview', 'bookings', 'profile', 'services', 'availability', 'notifications', 'account'];

const statusInfo = {
  pending: { variant: 'warning' as const, icon: Clock, label: 'Under review', text: 'Our team is reviewing your profile. Once verified, it will appear in Find a Pandit and devotees can book you.' },
  verified: { variant: 'success' as const, icon: BadgeCheck, label: 'Verified', text: 'Your profile is live. Devotees can find and book you.' },
  rejected: { variant: 'error' as const, icon: XCircle, label: 'Changes requested', text: 'Your profile was not approved yet. Update it using the feedback below to resubmit it for review.' },
};

export function PanditDashboardPage({ initialTab }: { initialTab?: string }) {
  const { profile } = useAuth();
  const [tab, setTab] = useState<Tab>(validTabs.includes(initialTab as Tab) ? (initialTab as Tab) : 'overview');
  const [pandit, setPandit] = useState<Pandit | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [unread, setUnread] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);
  // Set when opened from a "New booking request" notification (…/bookings?booking=<id>).
  const [initialBookingId] = useState(() => getQueryParam('booking'));

  useEffect(() => {
    if (!profile) return;
    setLoading(true);
    setLoadError('');
    fetchPanditForProfile(profile.id)
      .then((p) => {
        setPandit(p);
        if (p) countPendingRequests(p.id).then(setPendingRequests).catch(() => {});
      })
      .catch((e: unknown) => setLoadError(e instanceof Error ? e.message : 'Could not load your pandit profile'))
      .finally(() => setLoading(false));
    fetchNotifications(profile.id).then((n) => setUnread(n.filter((x) => !x.is_read).length)).catch(() => {});
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!profile) return null;

  const tabs: DashTab<Tab>[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'bookings', label: 'Bookings', icon: CalendarCheck, badge: pendingRequests || undefined },
    { id: 'profile', label: 'Pandit Profile', icon: BookOpenText },
    { id: 'services', label: 'Services & Pricing', icon: Sparkles },
    { id: 'availability', label: 'Availability', icon: CalendarClock },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unread || undefined },
    { id: 'account', label: 'Settings', icon: Settings },
  ];
  const greetName = firstName(profile.full_name) || 'Panditji';
  const needsProfile = !pandit && (tab === 'services' || tab === 'availability' || tab === 'bookings');

  return (
    <DashboardShell eyebrow="Pandit portal" title={`Namaste, ${greetName}`} tabs={tabs} tab={tab} onTab={setTab}>
      {tab === 'account' ? (
        <AccountSettings />
      ) : tab === 'notifications' ? (
        <NotificationsPanel subtitle="Review decisions and booking updates." onUnreadChange={setUnread} />
      ) : loading ? (
        <div className="card"><LoadingState label="Loading your pandit profile…" /></div>
      ) : loadError ? (
        <div className="card"><ErrorState message={loadError} /></div>
      ) : needsProfile ? (
        <CreateProfilePrompt onEdit={() => setTab('profile')} />
      ) : (
        <>
          {tab === 'overview' && <Overview pandit={pandit} go={setTab} pendingRequests={pendingRequests} />}
          {tab === 'bookings' && pandit && (
            <PanditBookings pandit={pandit} initialBookingId={initialBookingId} onPendingChange={setPendingRequests} />
          )}
          {tab === 'profile' && <PanditProfileEditor pandit={pandit} onSaved={setPandit} />}
          {tab === 'services' && pandit && <ServicesManager pandit={pandit} />}
          {tab === 'availability' && pandit && <AvailabilityManager pandit={pandit} onPanditChange={setPandit} />}
        </>
      )}
    </DashboardShell>
  );
}

function CreateProfilePrompt({ onEdit }: { onEdit: () => void }) {
  return (
    <div className="card p-8 text-center">
      <span className="w-14 h-14 mx-auto rounded-full bg-primary-50 flex items-center justify-center"><BookOpenText size={24} className="text-primary-700" /></span>
      <h2 className="font-display text-2xl font-semibold text-charcoal-800 mt-4">Complete your pandit profile</h2>
      <p className="text-sm text-charcoal-500 mt-2 max-w-md mx-auto">
        Tell devotees about your experience, languages and the ceremonies you perform. Our team reviews every profile before it goes live.
      </p>
      <button onClick={onEdit} className="btn-primary mt-6">Create Profile <ArrowRight size={15} /></button>
    </div>
  );
}

function Overview({ pandit, go, pendingRequests }: { pandit: Pandit | null; go: (t: Tab) => void; pendingRequests: number }) {
  const [counts, setCounts] = useState<{ services: number; slots: number } | null>(null);

  useEffect(() => {
    if (!pandit) return;
    Promise.all([fetchPanditServices(pandit.id), fetchWeeklySlots(pandit.id)])
      .then(([s, w]) => setCounts({ services: s.length, slots: w.length }))
      .catch(() => setCounts(null));
  }, [pandit?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!pandit) return <CreateProfilePrompt onEdit={() => go('profile')} />;

  const status = pandit.verification_status;
  const s = statusInfo[status];
  const checklist: { done: boolean; label: string; tab: Tab }[] = [
    { done: Boolean(pandit.photo_url), label: 'Add a profile photo', tab: 'profile' },
    { done: (pandit.bio || '').trim().length >= 30, label: 'Write a short introduction about yourself', tab: 'profile' },
    { done: (counts?.services ?? 0) > 0, label: 'Add the pujas you perform with your pricing', tab: 'services' },
    { done: (counts?.slots ?? 0) > 0, label: 'Set your weekly availability', tab: 'availability' },
  ];
  const doneCount = checklist.filter((c) => c.done).length;

  return (
    <div className="space-y-6">
      {pendingRequests > 0 && (
        <button onClick={() => go('bookings')} className="w-full card-hover p-5 flex items-center gap-4 text-left border-accent-300">
          <span className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-200 to-accent-400 text-charcoal-900 flex items-center justify-center shrink-0"><CalendarCheck size={22} /></span>
          <span className="flex-1 min-w-0">
            <span className="block font-display text-lg font-semibold text-charcoal-800">
              {pendingRequests} booking {pendingRequests === 1 ? 'request is' : 'requests are'} waiting for you
            </span>
            <span className="block text-sm text-charcoal-500">Accept or decline so devotees can plan their ceremony.</span>
          </span>
          <ArrowRight size={18} className="text-primary-700 shrink-0" />
        </button>
      )}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row gap-5 sm:items-center">
          <span className={cn('w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
            status === 'verified' ? 'bg-success-100 text-success-700' : status === 'rejected' ? 'bg-error-100 text-error-700' : 'bg-warning-100 text-warning-700')}>
            <s.icon size={22} />
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-display text-xl font-semibold text-charcoal-800">{pandit.display_name}</h2>
              <Badge variant={s.variant}>{s.label}</Badge>
            </div>
            <p className="text-sm text-charcoal-500 mt-1">{s.text}</p>
            <p className="text-xs text-charcoal-400 mt-1">
              {status === 'pending' && `Submitted ${formatDate(pandit.submitted_at || pandit.created_at || new Date())}`}
              {status !== 'pending' && pandit.reviewed_at && `Reviewed ${formatDate(pandit.reviewed_at)}`}
            </p>
          </div>
          {status === 'verified' ? (
            <Link to={`/pandits/${pandit.id}`} className="btn-outline shrink-0">View Public Profile <ExternalLink size={14} /></Link>
          ) : status === 'rejected' ? (
            <button onClick={() => go('profile')} className="btn-primary shrink-0"><RotateCcw size={15} /> Update & Resubmit</button>
          ) : (
            <button onClick={() => go('profile')} className="btn-outline shrink-0">Edit Profile</button>
          )}
        </div>
        {status === 'rejected' && pandit.rejection_reason && (
          <div className="mt-5 rounded-2xl border border-error-200 bg-error-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-error-700">Feedback from our review team</p>
            <p className="text-sm text-charcoal-700 mt-1.5 whitespace-pre-line break-words">{pandit.rejection_reason}</p>
          </div>
        )}
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-charcoal-800">Profile checklist</p>
          <span className="text-xs text-charcoal-500">{counts ? `${doneCount} of ${checklist.length} done` : ''}</span>
        </div>
        <ul className="mt-3 space-y-1">
          {checklist.map((c) => (
            <li key={c.label}>
              <button onClick={() => go(c.tab)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm hover:bg-cream-100 transition-colors">
                {c.done ? <CheckCircle2 size={18} className="text-success-500 shrink-0" /> : <Circle size={18} className="text-cream-400 shrink-0" />}
                <span className={cn('flex-1', c.done ? 'text-charcoal-400 line-through' : 'text-charcoal-700')}>{c.label}</span>
                {!c.done && <ArrowRight size={14} className="text-charcoal-400" />}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { icon: Award, value: `${pandit.experience_years} yrs`, label: 'Experience' },
          { icon: Languages, value: pandit.languages.length, label: 'Languages' },
          { icon: MapPin, value: pandit.location || 'Not set', label: 'Location' },
          { icon: IndianRupee, value: formatINR(pandit.base_price), label: 'Base dakshina' },
        ].map(({ icon: Icon, value, label }) => (
          <div key={label} className="card p-5">
            <span className="w-10 h-10 rounded-xl flex items-center justify-center text-primary-600 bg-primary-50"><Icon size={19} /></span>
            <p className="font-display text-2xl font-semibold text-charcoal-800 mt-4 truncate">{value}</p>
            <p className="text-xs text-charcoal-500">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
