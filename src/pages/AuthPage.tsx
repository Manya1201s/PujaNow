import { useEffect, useRef, useState } from 'react';
import { Link, useRouter } from '@/lib/router';
import { useAuth, ROLE_HOME, safeNextPath, type SignupRole } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { getQueryParam } from '@/lib/hooks';
import { Ornament } from '@/components/ui';
import { cn } from '@/lib/utils';
import { Mail, Lock, User, Phone, Eye, EyeOff, ArrowLeft, HandHeart, BookOpenText, BadgeCheck, CalendarCheck, AlertCircle, CheckCircle2, MailCheck } from 'lucide-react';

const AUTH_IMAGE = 'https://images.pexels.com/photos/13655189/pexels-photo-13655189.jpeg?auto=compress&cs=tinysrgb&h=1200&w=900';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validateSignup(f: { email: string; password: string; fullName: string; phone: string }): string | null {
  const name = f.fullName.trim();
  if (name.length < 2) return 'Please enter your full name.';
  if (name.length > 80) return 'Name is too long (80 characters max).';
  const digits = f.phone.replace(/[\s\-()+]/g, '');
  if (!/^\d+$/.test(digits) || digits.length < 10 || digits.length > 15) return 'Please enter a valid phone number (10–15 digits).';
  if (!EMAIL_RE.test(f.email.trim())) return 'Please enter a valid email address.';
  if (f.password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Za-z]/.test(f.password) || !/\d/.test(f.password)) return 'Password must include at least one letter and one number.';
  if (new TextEncoder().encode(f.password).length > 72) return 'Password is too long (72 characters max).';
  return null;
}

export function AuthPage() {
  const { signIn, signUp, resendConfirmation, session, profile, profileError, notice, clearNotice } = useAuth();
  const { navigate } = useRouter();
  const { show } = useToast();
  const next = safeNextPath(getQueryParam('next'));
  const [mode, setMode] = useState<'signin' | 'signup'>(getQueryParam('mode') === 'signup' ? 'signup' : 'signin');
  // Only 'customer' or 'pandit' can be requested here. The database decides the stored role.
  const [role, setRole] = useState<SignupRole>(getQueryParam('role') === 'pandit' ? 'pandit' : 'customer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState<string | undefined>();
  const [info, setInfo] = useState('');
  const [awaitingProfile, setAwaitingProfile] = useState(false);
  const [checkEmail, setCheckEmail] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const redirected = useRef(false);

  // Messages from an email confirmation link (expired link, "please sign in", ...).
  useEffect(() => {
    if (!notice || notice.kind === 'email-confirmed') return;
    if (notice.kind === 'link-error') {
      setError(`${notice.message.replace(/\.$/, '')}. Sign in below, or request a new confirmation email.`);
      setErrorCode('email_not_confirmed');
    } else {
      setInfo('Your email address is confirmed. Please sign in to continue.');
    }
    setMode('signin');
    clearNotice();
  }, [notice, clearNotice]);

  // Signed in (now or already): send the user to the page for their role, or back to `next`.
  useEffect(() => {
    if (!session || !profile || redirected.current) return;
    redirected.current = true;
    if (awaitingProfile) show(`Welcome${profile.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}!`, 'success');
    navigate(next || ROLE_HOME[profile.role], { replace: true });
  }, [session, profile, awaitingProfile, next, navigate, show]);

  useEffect(() => {
    if (awaitingProfile && profileError) {
      setError(profileError);
      setLoading(false);
      setAwaitingProfile(false);
    }
  }, [awaitingProfile, profileError]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || awaitingProfile) return;
    setError('');
    setErrorCode(undefined);
    setInfo('');

    if (mode === 'signin') {
      if (!EMAIL_RE.test(email.trim())) { setError('Please enter a valid email address.'); return; }
      if (!password) { setError('Please enter your password.'); return; }
      setLoading(true);
      const { error: err, code } = await signIn(email, password);
      setLoading(false);
      if (err) { setError(err); setErrorCode(code); return; }
      // Redirect happens once the profile (and therefore the role) has loaded. See above.
      setAwaitingProfile(true);
      return;
    }

    const invalid = validateSignup({ email, password, fullName, phone });
    if (invalid) { setError(invalid); return; }
    setLoading(true);
    const { error: err, code, needsConfirmation } = await signUp({ email, password, role, fullName, phone });
    setLoading(false);
    if (err) { setError(err); setErrorCode(code); return; }
    if (needsConfirmation) {
      setCheckEmail(email.trim());
      setResendIn(60);
      setPassword('');
      return;
    }
    // Email confirmation is turned off in Supabase: the user is signed in straight away.
    setAwaitingProfile(true);
  };

  const handleResend = async (address: string) => {
    if (resendIn > 0) return;
    if (!EMAIL_RE.test(address.trim())) { setError('Enter your email address above, then request a new link.'); return; }
    const { error: err } = await resendConfirmation(address);
    if (err) { setError(err); return; }
    setError('');
    setErrorCode(undefined);
    setResendIn(60);
    show('Confirmation email sent. Check your inbox.', 'success');
  };

  const switchMode = (m: 'signin' | 'signup') => {
    setMode(m);
    setError('');
    setErrorCode(undefined);
    setInfo('');
    setCheckEmail(null);
  };

  const busy = loading || awaitingProfile;

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr] bg-cream-100">
      {/* Visual panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden bg-charcoal-900">
        <img src={AUTH_IMAGE} alt="" className="absolute inset-0 w-full h-full object-cover animate-kenburns" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900/90 via-primary-800/70 to-charcoal-900/90" />
        <div className="absolute inset-0 bg-rangoli opacity-40" />

        <Link to="/" className="relative flex items-center gap-2.5 w-fit">
          <span className="w-10 h-10 rounded-xl bg-cream-50/15 backdrop-blur flex items-center justify-center"><img src="/puja.svg" alt="" className="w-6 h-6" /></span>
          <span className="font-display text-2xl font-semibold text-cream-50">PujaNow</span>
        </Link>

        <div className="relative max-w-md">
          <Ornament light className="mb-6" />
          <blockquote className="font-display text-4xl leading-tight text-cream-50">
            “Sacred traditions, <span className="italic text-gradient-gold">thoughtfully arranged</span> for your family.”
          </blockquote>
          <div className="grid gap-3 mt-10">
            {[
              { icon: BadgeCheck, text: 'Verified, Vedic-trained pandits' },
              { icon: CalendarCheck, text: 'Track every booking in one place' },
              { icon: HandHeart, text: 'Samagri and guidance for each ceremony' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-cream-100/85 text-sm">
                <span className="w-9 h-9 rounded-full bg-cream-50/10 border border-cream-50/15 flex items-center justify-center"><Icon size={16} className="text-accent-300" /></span>
                {text}
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-cream-100/50">© 2026 PujaNow</p>
      </div>

      {/* Form */}
      <div className="relative flex flex-col px-5 sm:px-10 py-8 bg-rangoli-light">
        <div className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-charcoal-500 hover:text-primary-700"><ArrowLeft size={15} /> Back to home</Link>
          <Link to="/" className="lg:hidden flex items-center gap-2">
            <img src="/puja.svg" alt="" className="w-7 h-7" />
            <span className="font-display text-xl font-semibold text-primary-800">PujaNow</span>
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center py-10">
          <div className="w-full max-w-md animate-fade-up">
            <h1 className="font-display text-4xl font-semibold text-charcoal-800">
              {mode === 'signin' ? 'Welcome back' : 'Create your account'}
            </h1>
            <p className="text-charcoal-500 mt-2">
              {mode === 'signin' ? 'Sign in to manage your bookings and orders.' : 'Join PujaNow to book authentic pujas with verified pandits.'}
            </p>

            <div className="grid grid-cols-2 p-1 rounded-full bg-cream-200 mt-8 relative" role="tablist">
              <span className={cn('absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full bg-cream-50 shadow-soft transition-transform duration-300', mode === 'signup' ? 'translate-x-[calc(100%+0px)]' : 'translate-x-0')} style={{ left: 4 }} />
              {(['signin', 'signup'] as const).map((m) => (
                <button key={m} role="tab" aria-selected={mode === m} onClick={() => switchMode(m)} className={cn('relative py-2.5 text-sm font-medium rounded-full transition-colors', mode === m ? 'text-primary-800' : 'text-charcoal-500')}>
                  {m === 'signin' ? 'Sign in' : 'Sign up'}
                </button>
              ))}
            </div>

            {info && (
              <div className="flex items-start gap-2 bg-success-50 border border-success-200 text-success-700 text-sm rounded-2xl px-4 py-3 mt-6 animate-fade-in" role="status">
                <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> {info}
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 bg-error-50 border border-error-200 text-error-700 text-sm rounded-2xl px-4 py-3 mt-6 animate-fade-in" role="alert">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>
                  {error}
                  {errorCode === 'email_not_confirmed' && (
                    <button type="button" onClick={() => handleResend(email)} disabled={resendIn > 0} className="block mt-1 font-semibold underline disabled:no-underline disabled:opacity-60">
                      {resendIn > 0 ? `Resend available in ${resendIn}s` : 'Resend confirmation email'}
                    </button>
                  )}
                  {errorCode === 'user_already_exists' && mode === 'signup' && (
                    <button type="button" onClick={() => switchMode('signin')} className="block mt-1 font-semibold underline">Go to sign in</button>
                  )}
                </span>
              </div>
            )}

            {checkEmail ? (
              <div className="card p-6 mt-6 text-center animate-fade-in" role="status">
                <span className="w-14 h-14 mx-auto rounded-full bg-primary-50 flex items-center justify-center"><MailCheck size={26} className="text-primary-700" /></span>
                <h2 className="font-display text-2xl font-semibold text-charcoal-800 mt-4">Check your inbox</h2>
                <p className="text-sm text-charcoal-500 mt-2">
                  We sent a confirmation link to <b className="text-charcoal-700 break-all">{checkEmail}</b>. Open it on this device to activate your account. You'll be signed in automatically.
                </p>
                <div className="flex flex-col gap-2 mt-6">
                  <button type="button" onClick={() => handleResend(checkEmail)} disabled={resendIn > 0} className="btn-outline w-full">
                    {resendIn > 0 ? `Resend email in ${resendIn}s` : 'Resend email'}
                  </button>
                  <button type="button" onClick={() => switchMode('signin')} className="btn-ghost w-full">Back to sign in</button>
                </div>
                <p className="text-[11px] text-charcoal-400 mt-4">Can't find it? Check your spam or promotions folder.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 mt-6">
                {mode === 'signup' && (
                  <div className="animate-fade-in flex flex-col gap-4">
                    <div>
                      <p className="label">I am joining as</p>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { id: 'customer' as const, label: 'Devotee', desc: 'Book pujas & samagri', icon: HandHeart },
                          { id: 'pandit' as const, label: 'Pandit', desc: 'Offer my services', icon: BookOpenText },
                        ].map(({ id, label, desc, icon: Icon }) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setRole(id)}
                            aria-pressed={role === id}
                            className={cn('p-4 rounded-2xl border-2 text-left transition-all', role === id ? 'border-primary-600 bg-primary-50/60' : 'border-cream-300 bg-cream-50 hover:border-cream-400')}
                          >
                            <Icon size={20} className={role === id ? 'text-primary-700' : 'text-charcoal-400'} />
                            <span className="block text-sm font-semibold text-charcoal-800 mt-2">{label}</span>
                            <span className="block text-xs text-charcoal-500">{desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <IconInput icon={User} label="Full name">
                      <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" className="input pl-11" autoComplete="name" maxLength={80} />
                    </IconInput>
                    <IconInput icon={Phone} label="Phone">
                      <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" className="input pl-11" autoComplete="tel" maxLength={20} />
                    </IconInput>
                  </div>
                )}
                <IconInput icon={Mail} label="Email">
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="input pl-11" autoComplete="email" />
                </IconInput>
                <IconInput icon={Lock} label="Password">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'signup' ? '8+ characters, letters & numbers' : '••••••••'}
                    className="input pl-11 pr-11"
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  />
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-400 hover:text-charcoal-700 p-1" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </IconInput>

                <button type="submit" disabled={busy} className="btn-primary btn-lg w-full mt-2">
                  {busy ? (
                    <><span className="w-4 h-4 rounded-full border-2 border-cream-50/40 border-t-cream-50 animate-spin" /> Please wait…</>
                  ) : mode === 'signin' ? 'Sign in' : 'Create account'}
                </button>
              </form>
            )}

            <p className="text-center text-sm text-charcoal-500 mt-6">
              {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
              <button onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')} className="text-primary-700 hover:underline font-semibold">
                {mode === 'signin' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
            <p className="text-[11px] text-charcoal-400 text-center mt-6 flex items-center justify-center gap-1.5">
              {mode === 'signup' && role === 'pandit'
                ? 'Pandit profiles are reviewed by our team before they appear in search.'
                : 'Secured by Supabase Auth. Your password is never stored in plain text.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function IconInput({ icon: Icon, label, children }: { icon: typeof Mail; label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <span className="relative block">
        <Icon size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-400 pointer-events-none" />
        {children}
      </span>
    </label>
  );
}
