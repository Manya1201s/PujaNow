import { useRef, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { createPanditProfile, updatePanditProfile, updateProfile } from '@/lib/data';
import {
  dbErrorMessage, uploadPanditPhoto, setPanditPhoto, removeOldPanditPhotos, validatePhoto, PHOTO_ACCEPT,
} from '@/lib/panditManagement';
import type { Pandit } from '@/types';
import { SectionTitle } from '@/components/DashboardShell';
import { Spinner } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { Save, Camera, AlertTriangle, Phone, User, MapPin, Languages, Award, IndianRupee, BookOpenText, Info } from 'lucide-react';

const splitList = (v: string) => Array.from(new Set(v.split(',').map((x) => x.trim()).filter(Boolean)));
const PHONE_RE = /^\+?[0-9][0-9\s-]{6,18}[0-9]$/;

export function PanditProfileEditor({ pandit, onSaved }: { pandit: Pandit | null; onSaved: (p: Pandit) => void }) {
  const { profile, refreshProfile } = useAuth();
  const { show } = useToast();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    display_name: pandit?.display_name || (profile?.full_name ? `Pt. ${profile.full_name}` : ''),
    phone: profile?.phone || '',
    experience_years: String(pandit?.experience_years ?? ''),
    languages: pandit?.languages.join(', ') || '',
    specializations: pandit?.specializations.join(', ') || '',
    location: pandit?.location || profile?.location || '',
    base_price: String(pandit?.base_price ?? ''),
    bio: pandit?.bio || '',
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  if (!profile) return null;
  const status = pandit?.verification_status;

  const save = async () => {
    setError('');
    const exp = Number(form.experience_years);
    const price = Number(form.base_price);
    const phone = form.phone.trim();
    const languages = splitList(form.languages);
    const specializations = splitList(form.specializations);
    if (form.display_name.trim().length < 3) return setError('Please enter the name devotees will see.');
    if (phone && !PHONE_RE.test(phone)) return setError('Please enter a valid phone number (digits, optional + country code).');
    if (form.experience_years.trim() === '' || !Number.isInteger(exp) || exp < 0 || exp > 80) return setError('Experience must be a whole number of years (0–80).');
    if (languages.length === 0) return setError('Add at least one language.');
    if (specializations.length === 0) return setError('Add at least one puja you perform.');
    if (!form.location.trim()) return setError('Please enter your city.');
    if (form.base_price.trim() === '' || !Number.isInteger(price) || price < 0) return setError('Please enter the base dakshina as a whole rupee amount.');

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
      // Phone lives on the account (profiles.phone); pandits has no phone column.
      if (phone !== (profile.phone || '')) {
        await updateProfile(profile.id, { phone: phone || null });
        await refreshProfile();
      }
      if (!pandit) {
        const created = await createPanditProfile({ ...payload, profile_id: profile.id });
        onSaved(created);
        show('Profile submitted for review', 'success');
      } else {
        const saved = await updatePanditProfile(pandit.id, payload);
        onSaved(saved);
        if (status === 'rejected') {
          // pn_pandits_guard moves a rejected profile back to 'pending' only when its details actually change.
          if (saved.verification_status === 'pending') show('Profile resubmitted for review', 'success');
          else setError('Your profile details are unchanged, so it was not resubmitted. Update the details mentioned in the feedback, then save again.');
        } else if (status === 'verified') {
          show('Profile updated. Your changes are live.', 'success');
        } else {
          show('Profile updated. It is still in the review queue.', 'success');
        }
      }
    } catch (e: unknown) {
      setError(dbErrorMessage(e, 'Could not save your profile'));
    }
    setSaving(false);
  };

  return (
    <div>
      <SectionTitle
        title={pandit ? 'Pandit Profile' : 'Create Your Pandit Profile'}
        subtitle={pandit ? 'This is what devotees see on your public profile.' : 'Submitted profiles are reviewed by our team before going live.'}
      />

      {status === 'rejected' && (
        <div className="card p-5 mb-5 border-error-200 bg-error-50/60" role="status">
          <p className="flex items-center gap-2 text-sm font-semibold text-error-700"><AlertTriangle size={16} /> Changes requested by our review team</p>
          {pandit?.rejection_reason && <p className="text-sm text-charcoal-700 mt-2 whitespace-pre-line break-words">{pandit.rejection_reason}</p>}
          <p className="text-xs text-charcoal-500 mt-3">Update your details below and save. Saving changes resubmits your profile for review automatically.</p>
        </div>
      )}
      {status === 'verified' && (
        <p className="flex items-start gap-2 text-xs text-charcoal-500 mb-4"><Info size={14} className="shrink-0 mt-0.5" /> Your profile is verified. Edits go live immediately and keep your verified status.</p>
      )}

      {pandit && <PhotoUploader pandit={pandit} onSaved={onSaved} />}

      <div className="card p-6">
        {error && <p className="bg-error-50 border border-error-200 text-error-700 text-sm rounded-2xl px-4 py-3 mb-5" role="alert">{error}</p>}
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className="label" htmlFor="pp-name"><User size={14} className="text-charcoal-400" /> Display name</label>
            <input id="pp-name" className="input" value={form.display_name} onChange={set('display_name')} placeholder="Pt. Your Name" maxLength={80} />
          </div>
          <div>
            <label className="label" htmlFor="pp-phone"><Phone size={14} className="text-charcoal-400" /> Phone</label>
            <input id="pp-phone" className="input" type="tel" value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" maxLength={20} />
            <p className="text-[11px] text-charcoal-400 mt-1">Saved on your account. Not shown on your public profile.</p>
          </div>
          <div>
            <label className="label" htmlFor="pp-exp"><Award size={14} className="text-charcoal-400" /> Experience (years)</label>
            <input id="pp-exp" className="input" type="number" min={0} max={80} value={form.experience_years} onChange={set('experience_years')} />
          </div>
          <div>
            <label className="label" htmlFor="pp-price"><IndianRupee size={14} className="text-charcoal-400" /> Base dakshina (₹)</label>
            <input id="pp-price" className="input" type="number" min={0} value={form.base_price} onChange={set('base_price')} />
          </div>
          <div>
            <label className="label" htmlFor="pp-lang"><Languages size={14} className="text-charcoal-400" /> Languages</label>
            <input id="pp-lang" className="input" value={form.languages} onChange={set('languages')} placeholder="Hindi, Sanskrit, English" />
          </div>
          <div>
            <label className="label" htmlFor="pp-loc"><MapPin size={14} className="text-charcoal-400" /> City</label>
            <input id="pp-loc" className="input" value={form.location} onChange={set('location')} placeholder="Varanasi" maxLength={80} />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="pp-spec"><BookOpenText size={14} className="text-charcoal-400" /> Pujas you perform</label>
            <input id="pp-spec" className="input" value={form.specializations} onChange={set('specializations')} placeholder="Griha Pravesh, Satyanarayan Katha, Rudrabhishek" />
            <p className="text-[11px] text-charcoal-400 mt-1">Separate with commas. Set prices for each puja in the Services tab.</p>
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="pp-bio">About you</label>
            <textarea id="pp-bio" className="input resize-none" rows={4} value={form.bio} onChange={set('bio')} maxLength={1500} placeholder="Your training, lineage and the traditions you follow" />
            <p className="text-[11px] text-charcoal-400 mt-1 text-right">{form.bio.length}/1500</p>
          </div>
        </div>
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 mt-6 pt-5 border-t border-cream-200">
          <p className="text-xs text-charcoal-400">
            {pandit?.submitted_at && status === 'pending' ? `In review queue since ${formatDate(pandit.submitted_at)}` : ''}
          </p>
          <button onClick={save} disabled={saving} className="btn-primary">
            <Save size={15} /> {saving ? 'Saving…' : !pandit ? 'Submit for review' : status === 'rejected' ? 'Save & resubmit for review' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PhotoUploader({ pandit, onSaved }: { pandit: Pandit; onSaved: (p: Pandit) => void }) {
  const { profile, refreshProfile } = useAuth();
  const { show } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!profile) return null;

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow choosing the same file again
    if (!file) return;
    setError('');
    const invalid = validatePhoto(file);
    if (invalid) { setError(invalid); return; }
    setBusy(true);
    try {
      const url = await uploadPanditPhoto(profile.id, file);
      const saved = await setPanditPhoto(pandit.id, profile.id, url);
      onSaved(saved);
      await refreshProfile();
      void removeOldPanditPhotos(profile.id, url);
      show(pandit.verification_status === 'rejected' && saved.verification_status === 'pending'
        ? 'Photo updated and profile resubmitted for review' : 'Profile photo updated', 'success');
    } catch (err: unknown) {
      setError(dbErrorMessage(err, 'Could not upload the photo'));
    }
    setBusy(false);
  };

  return (
    <div className="card p-5 mb-5 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="w-20 h-20 rounded-full bg-primary-100 text-primary-700 font-display text-3xl flex items-center justify-center overflow-hidden shrink-0 mx-auto sm:mx-0 relative">
        {pandit.photo_url
          ? <img src={pandit.photo_url} alt={`${pandit.display_name}`} className="w-full h-full object-cover" />
          : (pandit.display_name.replace(/^Pt\.?\s*/i, '')[0]?.toUpperCase() || 'P')}
        {busy && <span className="absolute inset-0 bg-cream-50/70 flex items-center justify-center"><Spinner size={24} /></span>}
      </div>
      <div className="flex-1 text-center sm:text-left">
        <p className="text-sm font-semibold text-charcoal-800">Profile photo</p>
        <p className="text-xs text-charcoal-500 mt-0.5">A clear, front-facing photo builds trust. JPEG, PNG or WebP, up to 2 MB.</p>
        {error && <p className="text-xs text-error-700 mt-2" role="alert">{error}</p>}
      </div>
      <input ref={inputRef} type="file" accept={PHOTO_ACCEPT} className="hidden" onChange={onFile} aria-label="Choose profile photo" />
      <button onClick={() => inputRef.current?.click()} disabled={busy} className="btn-outline shrink-0 self-center">
        <Camera size={15} /> {busy ? 'Uploading…' : pandit.photo_url ? 'Change photo' : 'Upload photo'}
      </button>
    </div>
  );
}
