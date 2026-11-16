import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from '@/lib/router';
import { useAuth, ROLE_LABEL } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { updateProfile } from '@/lib/data';
import { Badge, Ornament } from '@/components/ui';
import { cn, formatDate } from '@/lib/utils';
import { LogOut, User, Phone, MapPin, Mail, Calendar, Save, type LucideIcon } from 'lucide-react';

export type DashTab<T extends string> = { id: T; label: string; icon: LucideIcon; badge?: number };

/** Header + sidebar layout shared by the pandit and admin portals (same look as the customer dashboard). */
export function DashboardShell<T extends string>({
  eyebrow, title, headerAction, tabs, tab, onTab, children,
}: {
  eyebrow: string;
  title: string;
  headerAction?: ReactNode;
  tabs: DashTab<T>[];
  tab: T;
  onTab: (t: T) => void;
  children: ReactNode;
}) {
  const { profile, signOut } = useAuth();
  const { navigate } = useRouter();
  if (!profile) return null;

  return (
    <div className="min-h-screen">
      <section className="surface-dark">
        <div className={DASH_HEADER_INNER}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="w-20 h-20 rounded-full p-1 bg-gradient-to-br from-accent-200 to-accent-500 shrink-0">
              <div className="w-full h-full rounded-full bg-primary-800 flex items-center justify-center text-cream-50 font-display text-3xl overflow-hidden border-2 border-primary-900">
                {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : (profile.full_name?.[0]?.toUpperCase() || 'U')}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="eyebrow eyebrow-light mb-1">{eyebrow}</p>
              <h1 className="font-display text-3xl sm:text-4xl font-semibold text-cream-50 break-words">{title}</h1>
              <p className="text-cream-100/75 text-sm mt-1 truncate">{profile.email}</p>
            </div>
            {headerAction}
          </div>
        </div>
      </section>

      <div className={DASH_BODY}>
        {/* grid-cols-1 (minmax(0,1fr)) stops the scrolling tab bar from stretching the page wider than the phone */}
        <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-6 items-start">
          <aside className="min-w-0 lg:sticky lg:top-28">
            <nav className="card p-2 flex lg:flex-col gap-1 overflow-x-auto scrollbar-hide">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onTab(t.id)}
                  className={cn(
                    'shrink-0 lg:w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap',
                    tab === t.id ? 'bg-gradient-to-r from-primary-700 to-primary-800 text-cream-50 shadow-soft' : 'text-charcoal-600 hover:bg-cream-200/70',
                  )}
                >
                  <t.icon size={17} className={tab === t.id ? 'text-accent-300' : 'text-charcoal-400'} /> {t.label}
                  {t.badge ? (
                    <span className={cn('ml-auto text-[11px] min-w-[20px] px-1.5 py-0.5 rounded-full text-center', tab === t.id ? 'bg-cream-50/20 text-cream-50' : 'bg-primary-100 text-primary-700')}>{t.badge}</span>
                  ) : null}
                </button>
              ))}
              <div className="hidden lg:block h-px bg-cream-300 my-1" />
              <button
                onClick={async () => { await signOut(); navigate('/'); }}
                className="shrink-0 lg:w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium text-error-600 hover:bg-error-50 whitespace-nowrap"
              >
                <LogOut size={17} /> Sign Out
              </button>
            </nav>
          </aside>

          <div key={tab} className="min-w-0 animate-fade-in">{children}</div>
        </div>
      </div>
    </div>
  );
}

/*
 * Dashboard header geometry (shared with the customer dashboard).
 * On desktop the content column is pulled 96px up into the maroon header, and the header keeps
 * enough bottom padding that the whole section heading (title + subtitle, ~60px) sits on maroon.
 * The heading therefore uses light text on desktop; on mobile it sits below the tab bar on cream.
 */
export const DASH_HEADER_INNER = 'section relative pt-24 lg:pt-28 pb-24 lg:pb-36';
export const DASH_BODY = 'section -mt-14 lg:-mt-24 relative pb-8';

export function SectionTitle({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5 pt-2 lg:pt-0 lg:min-h-[60px]">
      <div className="min-w-0">
        <h2 className="font-display text-2xl sm:text-3xl font-semibold leading-tight text-charcoal-800 lg:text-cream-50">{title}</h2>
        <p className="text-sm text-charcoal-500 lg:text-cream-100/80 mt-1">{subtitle}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** Edit the signed-in user's own profile. Role and email are not editable (database column grants). */
export function AccountSettings() {
  const { profile, refreshProfile } = useAuth();
  const { show } = useToast();
  const [form, setForm] = useState({ full_name: '', phone: '', location: '', bio: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) setForm({ full_name: profile.full_name || '', phone: profile.phone || '', location: profile.location || '', bio: profile.bio || '' });
  }, [profile]);

  if (!profile) return null;

  const save = async () => {
    if (form.full_name.trim().length < 2) { show('Please enter your full name', 'error'); return; }
    setSaving(true);
    try {
      await updateProfile(profile.id, {
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        location: form.location.trim() || null,
        bio: form.bio.trim() || null,
      });
      await refreshProfile();
      show('Profile updated successfully', 'success');
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : 'Failed to update profile', 'error');
    }
    setSaving(false);
  };

  return (
    <div>
      <SectionTitle title="Account Settings" subtitle="Your sign-in email and role are managed by PujaNow." />
      <div className="grid xl:grid-cols-[1fr_280px] gap-6 items-start">
        <div className="card p-6">
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="label" htmlFor="as-name"><User size={14} className="text-charcoal-400" /> Full name</label>
              <input id="as-name" type="text" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="input" maxLength={80} />
            </div>
            <div>
              <label className="label" htmlFor="as-phone"><Phone size={14} className="text-charcoal-400" /> Phone</label>
              <input id="as-phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" maxLength={20} />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="as-loc"><MapPin size={14} className="text-charcoal-400" /> City / location</label>
              <input id="as-loc" type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="as-bio">About you</label>
              <textarea id="as-bio" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} className="input resize-none" />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-cream-200">
            <button onClick={() => setForm({ full_name: profile.full_name || '', phone: profile.phone || '', location: profile.location || '', bio: profile.bio || '' })} className="btn-ghost">Reset</button>
            <button onClick={save} disabled={saving} className="btn-primary"><Save size={15} /> {saving ? 'Saving…' : 'Save changes'}</button>
          </div>
        </div>
        <div className="card p-6 text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-3xl font-display overflow-hidden">
            {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : (profile.full_name?.[0]?.toUpperCase() || 'U')}
          </div>
          <p className="font-display text-lg font-semibold text-charcoal-800 mt-3">{profile.full_name || 'No name set'}</p>
          <Badge variant="primary" className="mt-1">{ROLE_LABEL[profile.role]}</Badge>
          <Ornament className="mx-auto my-4 w-20" />
          <div className="space-y-2 text-sm text-left">
            <p className="flex items-center gap-2 text-charcoal-600 truncate"><Mail size={14} className="text-charcoal-400 shrink-0" /> {profile.email}</p>
            <p className="flex items-center gap-2 text-charcoal-600"><Calendar size={14} className="text-charcoal-400 shrink-0" /> Member since {formatDate(profile.created_at)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
