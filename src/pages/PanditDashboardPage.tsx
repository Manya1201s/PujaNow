import { useEffect, useState } from 'react';
import { Link } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { fetchPanditForProfile, createPanditProfile, updatePanditProfile } from '@/lib/data';
import type { Pandit } from '@/types';
import { LoadingState, ErrorState, Badge } from '@/components/ui';
import { DashboardShell, SectionTitle, AccountSettings, type DashTab } from '@/components/DashboardShell';
import { formatINR } from '@/lib/utils';
import {
  LayoutDashboard, BookOpenText, Settings, Clock, BadgeCheck, XCircle, ArrowRight, Save, MapPin, Languages, Award, IndianRupee, ExternalLink,
} from 'lucide-react';

type Tab = 'overview' | 'profile' | 'account';
const validTabs: Tab[] = ['overview', 'profile', 'account'];

const statusInfo = {
  pending: { variant: 'warning' as const, icon: Clock, label: 'Under review', text: 'Our team is reviewing your profile. Once verified, it will appear in Find a Pandit and devotees can book you.' },
  verified: { variant: 'success' as const, icon: BadgeCheck, label: 'Verified', text: 'Your profile is live. Devotees can find and book you.' },
  rejected: { variant: 'error' as const, icon: XCircle, label: 'Not approved', text: 'Your profile was not approved. Update your details and contact support to request another review.' },
};

export function PanditDashboardPage({ initialTab }: { initialTab?: string }) {
  const { profile } = useAuth();
  const [tab, setTab] = useState<Tab>(validTabs.includes(initialTab as Tab) ? (initialTab as Tab) : 'overview');
  const [pandit, setPandit] = useState<Pandit | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const load = () => {
    if (!profile) return;
    setLoading(true);
    setLoadError('');
    fetchPanditForProfile(profile.id)
      .then(setPandit)
      .catch((e: unknown) => setLoadError(e instanceof Error ? e.message : 'Could not load your pandit profile'))
      .finally(() => setLoading(false));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [profile?.id]);

  if (!profile) return null;

  const tabs: DashTab<Tab>[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'profile', label: 'Pandit Profile', icon: BookOpenText },
    { id: 'account', label: 'Settings', icon: Settings },
  ];
  const firstName = profile.full_name?.split(' ')[0] || 'Panditji';

  return (
    <DashboardShell eyebrow="Pandit portal" title={`Namaste, ${firstName}`} tabs={tabs} tab={tab} onTab={setTab}>
      {loading ? (
        <LoadingState label="Loading your pandit profile..." />
      ) : loadError ? (
        <ErrorState message={loadError} />
      ) : (
        <>
          {tab === 'overview' && <Overview pandit={pandit} onEdit={() => setTab('profile')} />}
          {tab === 'profile' && <PanditProfileForm pandit={pandit} onSaved={setPandit} />}
          {tab === 'account' && <AccountSettings />}
        </>
      )}
    </DashboardShell>
  );
}

function Overview({ pandit, onEdit }: { pandit: Pandit | null; onEdit: () => void }) {
  if (!pandit) {
    return (
      <div className="card p-8 text-center">
        <span className="w-14 h-14 mx-auto rounded-full bg-primary-50 flex items-center justify-center"><BookOpenText size={24} className="text-primary-700" /></span>
        <h2 className="font-display text-2xl font-semibold text-charcoal-800 mt-4">Complete your pandit profile</h2>
        <p className="text-sm text-charcoal-500 mt-2 max-w-md mx-auto">
          Tell devotees about your experience, languages and the ceremonies you perform. Our team reviews every profile before it goes live.
        </p>
        <button onClick={onEdit} className="btn-primary mt-6">Create profile <ArrowRight size={15} /></button>
      </div>
    );
  }

  const s = statusInfo[pandit.verification_status];
  return (
    <div className="space-y-6">
      <div className="card p-6 flex flex-col sm:flex-row gap-5 sm:items-center">
        <span className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center shrink-0"><s.icon size={22} className="text-primary-700" /></span>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-display text-xl font-semibold text-charcoal-800">{pandit.display_name}</h2>
            <Badge variant={s.variant}>{s.label}</Badge>
          </div>
          <p className="text-sm text-charcoal-500 mt-1">{s.text}</p>
        </div>
        {pandit.verification_status === 'verified' ? (
          <Link to={`/pandits/${pandit.id}`} className="btn-outline shrink-0">View public profile <ExternalLink size={14} /></Link>
        ) : (
          <button onClick={onEdit} className="btn-outline shrink-0">Edit profile</button>
        )}
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { icon: Award, value: `${pandit.experience_years} yrs`, label: 'Experience' },
          { icon: Languages, value: pandit.languages.length, label: 'Languages' },
          { icon: MapPin, value: pandit.location || '—', label: 'Location' },
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

const splitList = (v: string) => Array.from(new Set(v.split(',').map((x) => x.trim()).filter(Boolean)));

function PanditProfileForm({ pandit, onSaved }: { pandit: Pandit | null; onSaved: (p: Pandit) => void }) {
  const { profile } = useAuth();
  const { show } = useToast();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    display_name: pandit?.display_name || (profile?.full_name ? `Pt. ${profile.full_name}` : ''),
    experience_years: String(pandit?.experience_years ?? ''),
    languages: pandit?.languages.join(', ') || '',
    specializations: pandit?.specializations.join(', ') || '',
    location: pandit?.location || profile?.location || '',
    base_price: String(pandit?.base_price ?? ''),
    bio: pandit?.bio || '',
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  const save = async () => {
    setError('');
    const exp = Number(form.experience_years);
    const price = Number(form.base_price);
    const languages = splitList(form.languages);
    const specializations = splitList(form.specializations);
    if (form.display_name.trim().length < 3) return setError('Please enter the name devotees will see.');
    if (!Number.isInteger(exp) || exp < 0 || exp > 80) return setError('Experience must be a whole number of years (0–80).');
    if (languages.length === 0) return setError('Add at least one language.');
    if (specializations.length === 0) return setError('Add at least one puja you perform.');
    if (!form.location.trim()) return setError('Please enter your city.');
    if (!Number.isInteger(price) || price < 0) return setError('Please enter the base dakshina as a whole rupee amount.');

    const payload = {
      display_name: form.display_name.trim(),
      experience_years: exp,
      languages,
      specializations,
      location: form.location.trim(),
      base_price: price,
      bio: form.bio.trim(),
    };
    setSaving(true);
    try {
      const saved = pandit
        ? await updatePanditProfile(pandit.id, payload)
        : await createPanditProfile({ ...payload, profile_id: profile!.id });
      onSaved(saved);
      show(pandit ? 'Profile updated' : 'Profile submitted for review', 'success');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not save your profile');
    }
    setSaving(false);
  };

  return (
    <div>
      <SectionTitle
        title={pandit ? 'Pandit profile' : 'Create your pandit profile'}
        subtitle={pandit ? 'This is what devotees see on your public profile.' : 'Submitted profiles are reviewed by our team before going live.'}
      />
      <div className="card p-6">
        {error && <p className="bg-error-50 border border-error-200 text-error-700 text-sm rounded-2xl px-4 py-3 mb-5" role="alert">{error}</p>}
        <div className="grid sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="pp-name">Display name</label>
            <input id="pp-name" className="input" value={form.display_name} onChange={set('display_name')} placeholder="Pt. Your Name" maxLength={80} />
          </div>
          <div>
            <label className="label" htmlFor="pp-exp">Experience (years)</label>
            <input id="pp-exp" className="input" type="number" min={0} max={80} value={form.experience_years} onChange={set('experience_years')} />
          </div>
          <div>
            <label className="label" htmlFor="pp-price">Base dakshina (₹)</label>
            <input id="pp-price" className="input" type="number" min={0} value={form.base_price} onChange={set('base_price')} />
          </div>
          <div>
            <label className="label" htmlFor="pp-lang">Languages</label>
            <input id="pp-lang" className="input" value={form.languages} onChange={set('languages')} placeholder="Hindi, Sanskrit, English" />
          </div>
          <div>
            <label className="label" htmlFor="pp-loc">City</label>
            <input id="pp-loc" className="input" value={form.location} onChange={set('location')} placeholder="Varanasi" />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="pp-spec">Pujas you perform</label>
            <input id="pp-spec" className="input" value={form.specializations} onChange={set('specializations')} placeholder="Griha Pravesh, Satyanarayan Katha, Rudrabhishek" />
            <p className="text-[11px] text-charcoal-400 mt-1">Separate with commas.</p>
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="pp-bio">About you</label>
            <textarea id="pp-bio" className="input resize-none" rows={4} value={form.bio} onChange={set('bio')} placeholder="Your training, lineage and the traditions you follow" />
          </div>
        </div>
        <div className="flex justify-end mt-6 pt-5 border-t border-cream-200">
          <button onClick={save} disabled={saving} className="btn-primary"><Save size={15} /> {saving ? 'Saving…' : pandit ? 'Save changes' : 'Submit for review'}</button>
        </div>
      </div>
    </div>
  );
}
