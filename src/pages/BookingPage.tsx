import { useState, useEffect, useMemo } from 'react';
import { useRouter, Link } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { fetchPujas, fetchPanditsForPuja, fetchPanditById, createBooking } from '@/lib/data';
import type { Puja, Pandit } from '@/types';
import { LoadingState, Stars } from '@/components/ui';
import { getQueryParam } from '@/lib/hooks';
import { formatINR, formatDuration, cn } from '@/lib/utils';
import {
  Check, ChevronRight, ChevronLeft, Calendar, Clock, MapPin, User, Phone, Mail, Users, PartyPopper,
  Search, BadgeCheck, Sunrise, Sun, Sunset, Smartphone, CreditCard, Landmark, Banknote, Info, ShieldCheck, Pencil,
} from 'lucide-react';

const steps = ['Puja', 'Pandit', 'Date & Time', 'Details', 'Address', 'Review', 'Payment', 'Confirmation'];

const timeSlots = ['06:00 AM', '08:00 AM', '10:00 AM', '12:00 PM', '03:00 PM', '05:00 PM', '07:00 PM'];
const slotGroups = [
  { label: 'Morning', icon: Sunrise, slots: timeSlots.slice(0, 3) },
  { label: 'Afternoon', icon: Sun, slots: timeSlots.slice(3, 5) },
  { label: 'Evening', icon: Sunset, slots: timeSlots.slice(5) },
];

const paymentMethods = [
  { id: 'upi', label: 'UPI', desc: 'GPay, PhonePe, Paytm or any UPI app', icon: Smartphone },
  { id: 'card', label: 'Debit / Credit Card', desc: 'Visa, Mastercard, RuPay', icon: CreditCard },
  { id: 'netbanking', label: 'Net Banking', desc: 'All major banks supported', icon: Landmark },
  { id: 'cod', label: 'Cash on Service', desc: 'Pay the pandit directly after the puja', icon: Banknote },
];

function localISODate(d: Date): string {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().split('T')[0];
}

function prettyDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function BookingPage() {
  const { navigate, path } = useRouter();
  const { profile } = useAuth();
  const { show } = useToast();
  const [step, setStep] = useState(0);
  const [pujas, setPujas] = useState<Puja[]>([]);
  const [selectedPuja, setSelectedPuja] = useState<Puja | null>(null);
  const [pandits, setPandits] = useState<Pandit[]>([]);
  const [selectedPandit, setSelectedPandit] = useState<Pandit | null>(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [details, setDetails] = useState({ name: '', phone: '', email: '', instructions: '' });
  const [address, setAddress] = useState({ address: '', city: '', pincode: '' });
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [bookingRef, setBookingRef] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [pujaSearch, setPujaSearch] = useState('');

  // Read ?puja= and ?pandit= from the URL
  useEffect(() => {
    const pujaSlug = getQueryParam('puja');
    const panditId = getQueryParam('pandit');
    Promise.all([fetchPujas(), panditId ? fetchPanditById(panditId).catch(() => null) : Promise.resolve(null)])
      .then(([p, pandit]) => {
        setPujas(p);
        if (pandit) setSelectedPandit(pandit);
        if (pujaSlug) {
          const puja = p.find((x) => x.slug === pujaSlug);
          if (puja) {
            setSelectedPuja(puja);
            fetchPanditsForPuja(puja.id).then(setPandits).catch(() => {});
            setStep(1);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Pre-fill details from profile
  useEffect(() => {
    if (profile) {
      setDetails((d) => (d.name ? d : {
        ...d,
        name: profile.full_name || '',
        phone: profile.phone || '',
        email: profile.email || '',
      }));
      setAddress((a) => (a.city ? a : { ...a, city: profile.location || '' }));
    }
  }, [profile]);

  const goTo = (s: number) => {
    setAttempted(false);
    setStep(s);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const selectPuja = (puja: Puja) => {
    setSelectedPuja(puja);
    fetchPanditsForPuja(puja.id).then(setPandits).catch(() => {});
    goTo(1);
  };

  const selectPandit = (pandit: Pandit | null) => {
    setSelectedPandit(pandit);
    goTo(2);
  };

  const amount = selectedPuja ? Math.max(selectedPuja.starting_price, selectedPandit?.base_price || 0) : 0;

  const fieldErrors = {
    name: !details.name.trim() ? 'Please enter your name' : '',
    phone: details.phone.replace(/\D/g, '').length < 10 ? 'Enter a valid 10-digit phone number' : '',
    email: details.email && !/^\S+@\S+\.\S+$/.test(details.email) ? 'Enter a valid email address' : '',
    address: !address.address.trim() ? 'Please enter the puja address' : '',
    city: !address.city.trim() ? 'Please enter the city' : '',
    pincode: address.pincode && !/^\d{6}$/.test(address.pincode) ? 'Pincode must be 6 digits' : '',
  };

  const canProceed = () => {
    if (step === 0) return !!selectedPuja;
    if (step === 1) return true; // pandit is optional
    if (step === 2) return !!date && !!time;
    if (step === 3) return !fieldErrors.name && !fieldErrors.phone && !fieldErrors.email;
    if (step === 4) return !fieldErrors.address && !fieldErrors.city && !fieldErrors.pincode;
    if (step === 5) return true;
    if (step === 6) return !!paymentMethod;
    return false;
  };

  const next = () => {
    if (!canProceed()) {
      setAttempted(true);
      if (step === 2) show('Please choose a date and time slot', 'info');
      return;
    }
    goTo(Math.min(step + 1, steps.length - 1));
  };
  const prev = () => goTo(Math.max(step - 1, 0));

  const submitBooking = async () => {
    if (!profile) {
      show('Please sign in to complete your booking', 'info');
      navigate(`/auth?next=${encodeURIComponent(path)}`);
      return;
    }
    setSubmitting(true);
    try {
      const booking = await createBooking({
        customer_id: profile.id,
        pandit_id: selectedPandit?.id || null,
        puja_id: selectedPuja?.id || null,
        puja_name: selectedPuja?.name || 'Custom Puja',
        pandit_name: selectedPandit?.display_name || null,
        scheduled_date: date,
        scheduled_time: time,
        customer_name: details.name,
        customer_phone: details.phone,
        customer_email: details.email || null,
        address: address.address,
        city: address.city,
        pincode: address.pincode || null,
        instructions: details.instructions || null,
        amount,
        payment_method: paymentMethod,
      });
      setBookingRef(booking.booking_ref);
      goTo(7);
      show('Booking request submitted. Payment is still pending.', 'success');
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : 'Failed to create booking', 'error');
    }
    setSubmitting(false);
  };

  const today = useMemo(() => new Date(), []);
  const upcomingDays = useMemo(
    () => Array.from({ length: 14 }).map((_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return d;
    }),
    [today],
  );
  const minDate = localISODate(today);

  const visiblePujas = pujaSearch.trim()
    ? pujas.filter((p) => p.name.toLowerCase().includes(pujaSearch.toLowerCase()) || p.category?.name.toLowerCase().includes(pujaSearch.toLowerCase()))
    : pujas;

  // Show a pandit chosen from their profile even if not mapped to this puja
  const panditOptions = selectedPandit && !pandits.some((p) => p.id === selectedPandit.id) ? [selectedPandit, ...pandits] : pandits;

  const paymentLabel = paymentMethods.find((m) => m.id === paymentMethod)?.label || paymentMethod;
  const progress = (Math.min(step, 6) / 6) * 100;

  if (loading) return <div className="pt-24"><LoadingState label="Preparing your booking..." /></div>;

  const err = (key: keyof typeof fieldErrors) => (attempted && fieldErrors[key] ? fieldErrors[key] : '');

  return (
    <div className="min-h-screen pb-28 lg:pb-0">
      {/* Header */}
      <section className="surface-dark">
        <div className="absolute inset-0 bg-rangoli opacity-50" />
        <div className="section relative pt-24 lg:pt-28 pb-8">
          <p className="eyebrow eyebrow-light mb-2">Plan a puja</p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-cream-50">
            {step === 7 ? 'Your request is in' : 'Book your ceremony'}
          </h1>
          <p className="text-cream-100/70 mt-1 text-sm">A few calm steps — review everything before you submit.</p>
        </div>
      </section>

      {/* Progress */}
      {step < 7 && (
        <div className="sticky top-16 lg:top-20 z-30 bg-cream-50/95 backdrop-blur-xl border-b border-cream-300 shadow-soft">
          <div className="section py-3">
            <div className="flex items-center justify-between gap-4 md:hidden mb-2">
              <p className="text-sm font-semibold text-charcoal-800">{steps[step]}</p>
              <p className="text-xs text-charcoal-400">Step {step + 1} of 7</p>
            </div>
            <div className="hidden md:flex items-center gap-1">
              {steps.slice(0, 7).map((s, i) => (
                <div key={s} className="flex items-center gap-1 flex-1 last:flex-none">
                  <button
                    onClick={() => i < step && goTo(i)}
                    disabled={i >= step}
                    className={cn(
                      'flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap',
                      i === step ? 'text-primary-800' : i < step ? 'text-primary-600 hover:bg-primary-50' : 'text-charcoal-400',
                    )}
                  >
                    <span className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-[11px] transition-all duration-300',
                      i === step ? 'bg-primary-700 text-cream-50 ring-4 ring-primary-100 scale-110' : i < step ? 'bg-accent-400 text-charcoal-900' : 'bg-cream-200 text-charcoal-400',
                    )}>
                      {i < step ? <Check size={12} strokeWidth={3} /> : i + 1}
                    </span>
                    {s}
                  </button>
                  {i < 6 && <span className={cn('flex-1 h-px mx-1 transition-colors duration-500', i < step ? 'bg-accent-400' : 'bg-cream-300')} />}
                </div>
              ))}
            </div>
            <div className="md:hidden h-1.5 rounded-full bg-cream-200 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-primary-600 to-accent-400 transition-all duration-500 ease-out" style={{ width: `${Math.max(progress, 6)}%` }} />
            </div>
          </div>
        </div>
      )}

      <div className="section py-8 lg:py-10">
        <div className={cn('grid gap-8 items-start', step < 7 && 'lg:grid-cols-[1fr_340px]')}>
          <div key={step} className="min-w-0 animate-fade-up">
            {/* Step 0: Select Puja */}
            {step === 0 && (
              <div>
                <StepTitle title="Which puja would you like to perform?" subtitle="Choose a ceremony — you can review everything before submitting." />
                <div className="relative max-w-md mb-6">
                  <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-400" />
                  <input value={pujaSearch} onChange={(e) => setPujaSearch(e.target.value)} placeholder="Search pujas…" className="input pl-11 rounded-full" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {visiblePujas.map((p) => {
                    const active = selectedPuja?.id === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => selectPuja(p)}
                        className={cn('group relative text-left rounded-2xl overflow-hidden border-2 bg-cream-50 transition-all duration-300 hover:shadow-card', active ? 'border-primary-600 shadow-card' : 'border-cream-300 hover:border-accent-300')}
                      >
                        <div className="aspect-[16/9] overflow-hidden bg-cream-200 relative">
                          {p.image_url && <img src={p.image_url} alt={p.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
                          {active && <span className="absolute top-3 right-3 w-7 h-7 rounded-full bg-primary-700 text-cream-50 flex items-center justify-center shadow"><Check size={15} strokeWidth={3} /></span>}
                        </div>
                        <div className="p-4">
                          <h3 className="font-display text-lg font-semibold text-charcoal-800">{p.name}</h3>
                          <p className="text-xs text-charcoal-500 mt-1 line-clamp-1">{p.short_description}</p>
                          <div className="flex items-center justify-between mt-3 text-sm">
                            <span className="font-semibold text-primary-700">{formatINR(p.starting_price)}</span>
                            <span className="text-xs text-charcoal-400 flex items-center gap-1"><Clock size={12} /> {formatDuration(p.duration_mins)}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 1: Select Pandit */}
            {step === 1 && (
              <div>
                <StepTitle title="Choose your pandit" subtitle="Optional — skip and we'll match you with a verified pandit near you." />
                <button
                  onClick={() => selectPandit(null)}
                  className={cn('w-full p-5 mb-4 rounded-2xl border-2 flex items-center gap-4 text-left transition-all', !selectedPandit ? 'border-primary-600 bg-primary-50/50' : 'border-dashed border-accent-300 bg-accent-50/40 hover:bg-accent-50')}
                >
                  <span className="w-14 h-14 rounded-full bg-gradient-to-br from-accent-200 to-accent-400 flex items-center justify-center shrink-0"><Users size={22} className="text-charcoal-900" /></span>
                  <span className="flex-1">
                    <span className="block font-display text-lg font-semibold text-charcoal-800">Match me with the best pandit</span>
                    <span className="block text-xs text-charcoal-500 mt-0.5">We'll assign a verified pandit experienced in this puja</span>
                  </span>
                  <span className="text-sm font-semibold text-primary-700">{formatINR(selectedPuja?.starting_price || 0)}</span>
                </button>
                {panditOptions.length === 0 ? (
                  <p className="text-sm text-charcoal-400 p-4">No pandits are listed for this puja yet — auto-assignment is recommended.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {panditOptions.map((p) => {
                      const active = selectedPandit?.id === p.id;
                      return (
                        <button
                          key={p.id}
                          onClick={() => selectPandit(p)}
                          className={cn('relative p-4 rounded-2xl border-2 bg-cream-50 flex items-center gap-4 text-left transition-all hover:shadow-card', active ? 'border-primary-600' : 'border-cream-300 hover:border-accent-300')}
                        >
                          <div className="relative w-16 h-16 shrink-0">
                            <div className="w-16 h-16 rounded-full overflow-hidden bg-cream-200 ring-2 ring-accent-300 ring-offset-2">
                              {p.photo_url && <img src={p.photo_url} alt={p.display_name} className="w-full h-full object-cover" />}
                            </div>
                            {p.verification_status === 'verified' && <BadgeCheck size={18} className="absolute -bottom-1 -right-1 text-success-600 fill-cream-50" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-display text-lg font-semibold text-charcoal-800 truncate">{p.display_name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Stars rating={p.rating} size={12} />
                              <span className="text-xs text-charcoal-500">{p.rating} · {p.experience_years} yrs</span>
                            </div>
                            <p className="text-xs text-charcoal-400 mt-0.5 flex items-center gap-1 truncate"><MapPin size={11} /> {p.location}</p>
                          </div>
                          <span className="text-sm font-semibold text-primary-700 shrink-0">{formatINR(p.base_price)}</span>
                          {active && <span className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary-700 text-cream-50 flex items-center justify-center"><Check size={13} strokeWidth={3} /></span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Date & Time */}
            {step === 2 && (
              <div>
                <StepTitle title="When should the puja take place?" subtitle="Pick an auspicious day and a convenient time slot." />
                <div className="card p-5 sm:p-6">
                  <p className="label"><Calendar size={14} /> Choose a date</p>
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1">
                    {upcomingDays.map((d) => {
                      const iso = localISODate(d);
                      const active = date === iso;
                      return (
                        <button
                          key={iso}
                          onClick={() => setDate(iso)}
                          className={cn('shrink-0 w-16 py-3 rounded-2xl border-2 text-center transition-all', active ? 'border-primary-700 bg-primary-700 text-cream-50 shadow-card' : 'border-cream-300 bg-cream-50 hover:border-accent-300')}
                        >
                          <span className={cn('block text-[10px] uppercase tracking-wider', active ? 'text-accent-200' : 'text-charcoal-400')}>{d.toLocaleDateString('en-IN', { weekday: 'short' })}</span>
                          <span className="block font-display text-2xl font-semibold leading-tight">{d.getDate()}</span>
                          <span className={cn('block text-[10px]', active ? 'text-cream-100/80' : 'text-charcoal-400')}>{d.toLocaleDateString('en-IN', { month: 'short' })}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-3">
                    <span className="text-xs text-charcoal-400">Or pick another date:</span>
                    <input type="date" min={minDate} value={date} onChange={(e) => setDate(e.target.value)} className="input w-auto py-2" aria-label="Pick a date" />
                  </div>
                  {date && <p className="text-sm text-primary-800 font-medium mt-4 flex items-center gap-2"><Check size={15} className="text-success-600" /> {prettyDate(date)}</p>}

                  <div className="heritage-rule my-6" />

                  <p className="label"><Clock size={14} /> Choose a time slot</p>
                  <div className="space-y-4">
                    {slotGroups.map(({ label, icon: Icon, slots }) => (
                      <div key={label}>
                        <p className="text-xs text-charcoal-500 flex items-center gap-1.5 mb-2"><Icon size={13} className="text-accent-600" /> {label}</p>
                        <div className="flex flex-wrap gap-2">
                          {slots.map((t) => (
                            <button
                              key={t}
                              onClick={() => setTime(t)}
                              className={cn('px-4 py-2.5 rounded-xl text-sm border-2 transition-all', time === t ? 'border-primary-700 bg-primary-50 text-primary-800 font-semibold' : 'border-cream-300 text-charcoal-600 hover:border-accent-300 bg-cream-50')}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  {attempted && (!date || !time) && <p className="text-xs text-error-600 mt-4">Please choose both a date and a time slot.</p>}
                </div>
              </div>
            )}

            {/* Step 3: Details */}
            {step === 3 && (
              <div>
                <StepTitle title="Devotee details" subtitle="Who should the pandit coordinate with?" />
                <div className="card p-5 sm:p-6 grid sm:grid-cols-2 gap-5">
                  <Field label="Full name" icon={User} error={err('name')}>
                    <input type="text" value={details.name} onChange={(e) => setDetails({ ...details, name: e.target.value })} placeholder="Your name" className={cn('input', err('name') && 'input-error')} />
                  </Field>
                  <Field label="Phone number" icon={Phone} error={err('phone')}>
                    <input type="tel" inputMode="tel" value={details.phone} onChange={(e) => setDetails({ ...details, phone: e.target.value })} placeholder="+91 98765 43210" className={cn('input', err('phone') && 'input-error')} />
                  </Field>
                  <Field label="Email (optional)" icon={Mail} error={err('email')} className="sm:col-span-2">
                    <input type="email" value={details.email} onChange={(e) => setDetails({ ...details, email: e.target.value })} placeholder="you@example.com" className={cn('input', err('email') && 'input-error')} />
                  </Field>
                  <Field label="Special instructions (optional)" className="sm:col-span-2">
                    <textarea value={details.instructions} onChange={(e) => setDetails({ ...details, instructions: e.target.value })} placeholder="Gotra, preferred language, family traditions, samagri you already have…" rows={3} className="input resize-none" />
                  </Field>
                </div>
              </div>
            )}

            {/* Step 4: Address */}
            {step === 4 && (
              <div>
                <StepTitle title="Where will the puja be held?" subtitle="The pandit will travel to this address." />
                <div className="card p-5 sm:p-6 grid sm:grid-cols-2 gap-5">
                  <Field label="Full address" icon={MapPin} error={err('address')} className="sm:col-span-2">
                    <textarea value={address.address} onChange={(e) => setAddress({ ...address, address: e.target.value })} placeholder="House / flat number, street, area, landmark" rows={3} className={cn('input resize-none', err('address') && 'input-error')} />
                  </Field>
                  <Field label="City" error={err('city')}>
                    <input type="text" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} placeholder="City" className={cn('input', err('city') && 'input-error')} />
                  </Field>
                  <Field label="Pincode (optional)" error={err('pincode')}>
                    <input type="text" inputMode="numeric" maxLength={6} value={address.pincode} onChange={(e) => setAddress({ ...address, pincode: e.target.value.replace(/\D/g, '') })} placeholder="560038" className={cn('input', err('pincode') && 'input-error')} />
                  </Field>
                </div>
              </div>
            )}

            {/* Step 5: Review */}
            {step === 5 && (
              <div>
                <StepTitle title="Review your booking" subtitle="Please check every detail before continuing." />
                <div className="card overflow-hidden">
                  {selectedPuja?.image_url && (
                    <div className="relative h-36 sm:h-44">
                      <img src={selectedPuja.image_url} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/80 to-transparent" />
                      <div className="absolute bottom-4 left-5 right-5">
                        <p className="font-display text-2xl font-semibold text-cream-50">{selectedPuja.name}</p>
                        <p className="text-xs text-cream-100/75">{formatDuration(selectedPuja.duration_mins)} ceremony</p>
                      </div>
                    </div>
                  )}
                  <dl className="divide-y divide-cream-200">
                    <ReviewRow label="Pandit" value={selectedPandit?.display_name || 'Auto-assigned verified pandit'} onEdit={() => goTo(1)} />
                    <ReviewRow label="Date & time" value={`${prettyDate(date)} · ${time}`} onEdit={() => goTo(2)} />
                    <ReviewRow label="Devotee" value={`${details.name} · ${details.phone}${details.email ? ` · ${details.email}` : ''}`} onEdit={() => goTo(3)} />
                    <ReviewRow label="Address" value={`${address.address}, ${address.city}${address.pincode ? ` ${address.pincode}` : ''}`} onEdit={() => goTo(4)} />
                    {details.instructions && <ReviewRow label="Instructions" value={details.instructions} onEdit={() => goTo(3)} />}
                  </dl>
                  <div className="flex justify-between items-center px-5 sm:px-6 py-5 bg-cream-100/70 border-t border-cream-300">
                    <span className="text-charcoal-600">Estimated dakshina</span>
                    <span className="font-display text-3xl font-semibold text-primary-700">{formatINR(amount)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Step 6: Payment */}
            {step === 6 && (
              <div>
                <StepTitle title="Payment preference" subtitle="Tell us how you'd like to pay. Nothing is charged at this step." />
                {!profile && (
                  <div className="bg-warning-50 border border-warning-200 text-warning-800 text-sm rounded-2xl px-4 py-3 mb-4 flex items-center gap-2">
                    <Info size={16} className="shrink-0" />
                    <span>Please <Link to="/auth" className="underline font-semibold">sign in</Link> to submit your booking request.</span>
                  </div>
                )}
                <div className="grid sm:grid-cols-2 gap-3">
                  {paymentMethods.map(({ id, label, desc, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setPaymentMethod(id)}
                      className={cn('flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all bg-cream-50', paymentMethod === id ? 'border-primary-600 bg-primary-50/50 shadow-soft' : 'border-cream-300 hover:border-accent-300')}
                    >
                      <span className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors', paymentMethod === id ? 'bg-primary-700 text-cream-50' : 'bg-cream-200 text-charcoal-500')}><Icon size={19} /></span>
                      <span className="flex-1">
                        <span className="block text-sm font-semibold text-charcoal-800">{label}</span>
                        <span className="block text-xs text-charcoal-500 mt-0.5">{desc}</span>
                      </span>
                      <span className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5', paymentMethod === id ? 'border-primary-600' : 'border-cream-400')}>
                        {paymentMethod === id && <span className="w-2.5 h-2.5 rounded-full bg-primary-600" />}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="mt-4 p-4 rounded-2xl bg-accent-50 border border-accent-200 flex items-start gap-3">
                  <ShieldCheck size={18} className="text-accent-700 shrink-0 mt-0.5" />
                  <p className="text-xs text-charcoal-600 leading-relaxed">
                    <b className="text-charcoal-800">Demo payment — no real charges will be made.</b> Your booking is created as a pending request with your selected payment preference. Payment status stays <b>pending</b> until it is confirmed.
                  </p>
                </div>
              </div>
            )}

            {/* Step 7: Confirmation */}
            {step === 7 && (
              <div className="max-w-xl mx-auto text-center py-6">
                <div className="relative w-24 h-24 mx-auto">
                  <span className="absolute inset-0 rounded-full bg-accent-200 animate-ping opacity-40" />
                  <span className="relative w-24 h-24 rounded-full bg-gradient-to-br from-accent-200 to-accent-400 flex items-center justify-center shadow-glow">
                    <PartyPopper size={38} className="text-primary-800" />
                  </span>
                </div>
                <h2 className="font-display text-4xl font-semibold text-charcoal-800 mt-7">Booking request received</h2>
                <p className="text-charcoal-500 mt-3">Your request is pending confirmation. No payment has been processed.</p>

                <div className="card p-6 mt-8 text-left">
                  <div className="flex items-center justify-between pb-4 mb-4 border-b border-dashed border-cream-400">
                    <span className="text-sm text-charcoal-500">Booking reference</span>
                    <span className="font-display text-xl font-semibold text-primary-700 tracking-wide">{bookingRef}</span>
                  </div>
                  <dl className="space-y-2.5 text-sm">
                    {[
                      ['Puja', selectedPuja?.name],
                      ['Pandit', selectedPandit?.display_name || 'To be assigned'],
                      ['Date & time', `${prettyDate(date)} · ${time}`],
                      ['Amount', formatINR(amount)],
                      ['Payment preference', paymentLabel],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-4"><dt className="text-charcoal-400">{k}</dt><dd className="font-medium text-charcoal-700 text-right">{v}</dd></div>
                    ))}
                    <div className="flex justify-between"><dt className="text-charcoal-400">Request status</dt><dd><span className="badge bg-warning-100 text-warning-700">Pending</span></dd></div>
                  </dl>
                </div>

                <div className="flex flex-wrap gap-3 mt-8 justify-center">
                  <Link to="/dashboard/bookings" className="btn-primary btn-lg">View my bookings</Link>
                  <Link to="/samagri" className="btn-outline btn-lg">Shop samagri</Link>
                </div>
              </div>
            )}

            {/* Desktop navigation */}
            {step < 7 && (
              <div className="hidden lg:flex justify-between mt-8">
                <button onClick={prev} disabled={step === 0} className="btn-ghost disabled:opacity-30">
                  <ChevronLeft size={16} /> Back
                </button>
                {step < 6 ? (
                  <button onClick={next} className={cn('btn-primary btn-lg', !canProceed() && 'opacity-60')}>
                    Continue <ChevronRight size={16} />
                  </button>
                ) : (
                  <button onClick={submitBooking} disabled={!canProceed() || submitting || !profile} className="btn-primary btn-lg">
                    {submitting ? 'Submitting…' : 'Submit booking request'} <Check size={16} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Summary */}
          {step < 7 && (
            <aside className="hidden lg:block sticky top-44">
              <div className="rounded-3xl bg-cream-50 border border-cream-300 shadow-card overflow-hidden">
                <div className="surface-dark px-5 py-4">
                  <div className="absolute inset-0 bg-rangoli opacity-40" />
                  <p className="relative text-[11px] uppercase tracking-[.2em] text-accent-200">Your booking</p>
                  <p className="relative font-display text-xl font-semibold text-cream-50 mt-0.5">{selectedPuja?.name || 'Choose a puja'}</p>
                </div>
                <ul className="p-5 space-y-3.5 text-sm">
                  <SummaryRow icon={User} label="Pandit" value={selectedPandit?.display_name || (step > 1 ? 'Auto-assigned' : '—')} />
                  <SummaryRow icon={Calendar} label="Date" value={date ? prettyDate(date) : '—'} />
                  <SummaryRow icon={Clock} label="Time" value={time || '—'} />
                  <SummaryRow icon={MapPin} label="Location" value={address.city || '—'} />
                </ul>
                <div className="px-5 py-4 border-t border-dashed border-cream-400 flex items-baseline justify-between">
                  <span className="text-sm text-charcoal-500">Estimated</span>
                  <span className="font-display text-2xl font-semibold text-primary-700">{amount ? formatINR(amount) : '—'}</span>
                </div>
              </div>
              <p className="text-[11px] text-charcoal-400 text-center mt-3 flex items-center justify-center gap-1.5"><ShieldCheck size={12} /> Nothing is charged until confirmed</p>
            </aside>
          )}
        </div>
      </div>

      {/* Mobile navigation */}
      {step < 7 && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-cream-50/95 backdrop-blur-xl border-t border-cream-300 px-4 py-3 shadow-[0_-8px_30px_-12px_rgba(37,32,30,.25)]">
          <div className="flex items-center gap-3">
            <button onClick={prev} disabled={step === 0} className="icon-btn border border-cream-300 disabled:opacity-30" aria-label="Back"><ChevronLeft size={18} /></button>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-charcoal-400 truncate">{selectedPuja?.name || 'No puja selected'}</p>
              <p className="font-display text-lg font-semibold text-primary-700 leading-tight">{amount ? formatINR(amount) : '—'}</p>
            </div>
            {step < 6 ? (
              <button onClick={next} className={cn('btn-primary px-5 py-3', !canProceed() && 'opacity-60')}>Continue <ChevronRight size={16} /></button>
            ) : (
              <button onClick={submitBooking} disabled={!canProceed() || submitting || !profile} className="btn-primary px-5 py-3">
                {submitting ? 'Submitting…' : 'Submit'} <Check size={16} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StepTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6">
      <h2 className="font-display text-2xl sm:text-3xl font-semibold text-charcoal-800">{title}</h2>
      <p className="text-sm text-charcoal-500 mt-1">{subtitle}</p>
    </div>
  );
}

function Field({ label, icon: Icon, error, className, children }: { label: string; icon?: typeof User; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label className="label">{Icon && <Icon size={14} className="text-charcoal-400" />} {label}</label>
      {children}
      {error && <p className="text-xs text-error-600 mt-1.5">{error}</p>}
    </div>
  );
}

function ReviewRow({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return (
    <div className="flex items-start gap-4 px-5 sm:px-6 py-4">
      <dt className="w-28 shrink-0 text-xs uppercase tracking-wider text-charcoal-400 pt-0.5">{label}</dt>
      <dd className="flex-1 text-sm font-medium text-charcoal-700 break-words">{value}</dd>
      <button onClick={onEdit} className="text-xs text-primary-700 hover:underline flex items-center gap-1 shrink-0"><Pencil size={12} /> Edit</button>
    </div>
  );
}

function SummaryRow({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <li className="flex items-start gap-3">
      <Icon size={15} className="text-primary-600 mt-0.5 shrink-0" />
      <span className="text-charcoal-400 w-16 shrink-0">{label}</span>
      <span className="flex-1 text-charcoal-700 font-medium text-right">{value}</span>
    </li>
  );
}
