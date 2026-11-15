import { useEffect, useMemo, useState } from 'react';
import { useAuth, ROLE_LABEL } from '@/lib/auth';
import { fetchAllProfiles, fetchAllPanditsForAdmin } from '@/lib/data';
import type { Pandit, Profile, UserRole } from '@/types';
import { LoadingState, ErrorState, EmptyState, Badge } from '@/components/ui';
import { DashboardShell, SectionTitle, AccountSettings, type DashTab } from '@/components/DashboardShell';
import { cn, formatDate } from '@/lib/utils';
import { LayoutDashboard, Users, Settings, HandHeart, BookOpenText, ShieldCheck, Clock, Search } from 'lucide-react';

type Tab = 'overview' | 'users' | 'account';
const validTabs: Tab[] = ['overview', 'users', 'account'];
const roleVariant: Record<UserRole, 'default' | 'primary' | 'accent'> = { customer: 'default', pandit: 'primary', admin: 'accent' };

export function AdminDashboardPage({ initialTab }: { initialTab?: string }) {
  const { profile } = useAuth();
  const [tab, setTab] = useState<Tab>(validTabs.includes(initialTab as Tab) ? (initialTab as Tab) : 'overview');
  const [users, setUsers] = useState<Profile[]>([]);
  const [pandits, setPandits] = useState<Pandit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // RLS returns every profile / pandit only because this user's stored role is 'admin'.
    Promise.all([fetchAllProfiles(), fetchAllPanditsForAdmin()])
      .then(([u, p]) => { setUsers(u); setPandits(p); })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load admin data'))
      .finally(() => setLoading(false));
  }, []);

  if (!profile) return null;

  const counts = {
    customer: users.filter((u) => u.role === 'customer').length,
    pandit: users.filter((u) => u.role === 'pandit').length,
    admin: users.filter((u) => u.role === 'admin').length,
  };
  const pendingPandits = pandits.filter((p) => p.verification_status === 'pending').length;

  const tabs: DashTab<Tab>[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'users', label: 'Users', icon: Users, badge: users.length || undefined },
    { id: 'account', label: 'Settings', icon: Settings },
  ];

  return (
    <DashboardShell eyebrow="Admin console" title="PujaNow administration" tabs={tabs} tab={tab} onTab={setTab}>
      {tab === 'account' ? (
        <AccountSettings />
      ) : loading ? (
        <LoadingState label="Loading admin data..." />
      ) : error ? (
        <ErrorState message={error} />
      ) : tab === 'overview' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { icon: HandHeart, value: counts.customer, label: 'Devotees', go: 'users' as Tab },
              { icon: BookOpenText, value: counts.pandit, label: 'Pandit accounts', go: 'users' as Tab },
              { icon: Clock, value: pendingPandits, label: 'Pandit profiles awaiting review', go: 'overview' as Tab },
              { icon: ShieldCheck, value: counts.admin, label: 'Administrators', go: 'users' as Tab },
            ].map(({ icon: Icon, value, label, go }) => (
              <button key={label} onClick={() => setTab(go)} className="card-hover p-5 text-left">
                <span className="w-10 h-10 rounded-xl flex items-center justify-center text-primary-600 bg-primary-50"><Icon size={19} /></span>
                <p className="font-display text-3xl font-semibold text-charcoal-800 mt-4">{value}</p>
                <p className="text-xs text-charcoal-500">{label}</p>
              </button>
            ))}
          </div>
          <div className="card p-5 text-sm text-charcoal-600">
            <p className="font-semibold text-charcoal-800">Administrator access</p>
            <p className="mt-1">
              Admin rights are granted only in the database, never at sign-up. Pandit verification, bookings and orders
              management will be added to this console in the next phases.
            </p>
          </div>
        </div>
      ) : (
        <UsersTable users={users} />
      )}
    </DashboardShell>
  );
}

function UsersTable({ users }: { users: Profile[] }) {
  const [q, setQ] = useState('');
  const [role, setRole] = useState<UserRole | 'all'>('all');
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return users.filter((u) =>
      (role === 'all' || u.role === role) &&
      (!s || u.email.toLowerCase().includes(s) || (u.full_name || '').toLowerCase().includes(s) || (u.phone || '').includes(s)),
    );
  }, [users, q, role]);

  return (
    <div>
      <SectionTitle title="Users" subtitle={`${users.length} registered account${users.length === 1 ? '' : 's'}`} />
      <div className="card p-4 mb-4 flex flex-col sm:flex-row gap-3 sm:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Search users</span>
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-400 pointer-events-none" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email or phone" className="input pl-11" />
        </label>
        <div className="flex gap-2 flex-wrap">
          {(['all', 'customer', 'pandit', 'admin'] as const).map((r) => (
            <button key={r} onClick={() => setRole(r)} className={cn('chip', role === r && 'chip-active')}>
              {r === 'all' ? 'All' : ROLE_LABEL[r]}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Users size={24} className="text-charcoal-400" />} title="No matching users" description="Try a different search or role filter." />
      ) : (
        <div className="card divide-y divide-cream-200">
          {filtered.map((u) => (
            <div key={u.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <span className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 font-display flex items-center justify-center shrink-0">
                {u.full_name?.[0]?.toUpperCase() || u.email[0]?.toUpperCase() || 'U'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-charcoal-800 truncate">{u.full_name || 'No name set'}</p>
                <p className="text-xs text-charcoal-500 truncate">{u.email}{u.phone ? ` · ${u.phone}` : ''}</p>
              </div>
              <Badge variant={roleVariant[u.role]}>{ROLE_LABEL[u.role]}</Badge>
              <p className="text-xs text-charcoal-400 sm:w-32 sm:text-right">Joined {formatDate(u.created_at)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
