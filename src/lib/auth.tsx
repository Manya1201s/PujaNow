import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import type { AuthError, Session, User } from '@supabase/supabase-js';
import { supabase, authRedirect, authRedirectUrl } from '@/lib/supabase';
import type { Profile, UserRole } from '@/types';

/** Roles a visitor may pick at public sign-up. Admin is never offered. */
export type SignupRole = Exclude<UserRole, 'admin'>;

/** Landing page for each role after sign-in. */
export const ROLE_HOME: Record<UserRole, string> = {
  customer: '/dashboard',
  pandit: '/pandit-dashboard',
  admin: '/admin',
};

export const ROLE_LABEL: Record<UserRole, string> = {
  customer: 'Devotee',
  pandit: 'Pandit',
  admin: 'Administrator',
};

/** One-off message produced by an email link (shown on the next screen). */
export type AuthNotice =
  | { kind: 'email-confirmed' }
  | { kind: 'confirmed-sign-in' }
  | { kind: 'link-error'; message: string };

type Result = { error: string | null; code?: string };

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  /** Role from the database profile, never from the client. Null when signed out. */
  role: UserRole | null;
  /** True only while the saved session is being restored on page load. */
  loading: boolean;
  /** True while the profile of a newly signed-in user is being fetched. */
  profileLoading: boolean;
  profileError: string | null;
  notice: AuthNotice | null;
  clearNotice: () => void;
  signUp: (input: { email: string; password: string; role: SignupRole; fullName: string; phone: string }) => Promise<Result & { needsConfirmation: boolean }>;
  signIn: (email: string, password: string) => Promise<Result>;
  resendConfirmation: (email: string) => Promise<Result>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

/** Turn Supabase Auth errors into messages a user can act on. */
export function friendlyAuthError(err: AuthError | Error | null | undefined): Result {
  if (!err) return { error: null };
  const code = 'code' in err ? (err.code as string | undefined) : undefined;
  const status = 'status' in err ? (err.status as number | undefined) : undefined;
  const msg = err.message || '';

  if (code === 'invalid_credentials' || /invalid login credentials/i.test(msg))
    return { error: 'Incorrect email or password.', code: 'invalid_credentials' };
  if (code === 'email_not_confirmed' || /email not confirmed/i.test(msg))
    return { error: 'Please confirm your email address first. Check your inbox for the confirmation link.', code: 'email_not_confirmed' };
  if (code === 'user_already_exists' || code === 'email_exists' || /already registered/i.test(msg))
    return { error: 'An account with this email already exists. Please sign in instead.', code: 'user_already_exists' };
  if (code === 'weak_password')
    return { error: msg || 'Please choose a stronger password.', code };
  if (code === 'over_email_send_rate_limit')
    return { error: 'Too many emails sent to this address. Please wait a few minutes and try again.', code };
  if (code === 'over_request_rate_limit' || status === 429)
    return { error: 'Too many attempts. Please wait a minute and try again.', code: code || 'rate_limited' };
  if (code === 'signup_disabled')
    return { error: 'New sign-ups are currently closed.', code };
  if (code === 'email_address_invalid' || code === 'validation_failed')
    return { error: 'Please enter a valid email address.', code };
  if (err.name === 'AuthRetryableFetchError' || /failed to fetch|network/i.test(msg))
    return { error: "Can't reach the server. Check your internet connection and try again.", code: 'network' };
  return { error: msg || 'Something went wrong. Please try again.', code };
}

async function fetchOrCreateProfile(user: User): Promise<Profile> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (error) throw error;
  if (data) return data as Profile;

  // The database trigger (pn_on_auth_user_created) normally creates the profile at sign-up.
  // Fallback for accounts created before that trigger existed. RLS only permits
  // role 'customer' or 'pandit' here, so this can never create an admin.
  const role: SignupRole = user.user_metadata?.role === 'pandit' ? 'pandit' : 'customer';
  const { data: created, error: insertError } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      email: user.email || '',
      role,
      full_name: user.user_metadata?.full_name || null,
      phone: user.user_metadata?.phone || null,
    })
    .select('*')
    .single();
  if (insertError) throw insertError;
  return created as Profile;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [notice, setNotice] = useState<AuthNotice | null>(
    authRedirect.error ? { kind: 'link-error', message: authRedirect.error }
      : authRedirect.tokenLink ? { kind: 'confirmed-sign-in' } : null,
  );

  // Guards against a slow profile response for a user who has since signed out / switched.
  const requestRef = useRef(0);
  const userIdRef = useRef<string | null | undefined>(undefined);

  const loadProfileFor = useCallback(async (user: User | null) => {
    const req = ++requestRef.current;
    if (!user) {
      setProfile(null);
      setProfileError(null);
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    setProfileError(null);
    try {
      const p = await fetchOrCreateProfile(user);
      if (req !== requestRef.current) return;
      setProfile(p);
    } catch (e) {
      if (req !== requestRef.current) return;
      console.error('Error loading profile:', e);
      setProfile(null);
      setProfileError(friendlyAuthError(e as Error).error || 'Could not load your account.');
    } finally {
      if (req === requestRef.current) setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Fires INITIAL_SESSION first (session restored from localStorage, or from an
    // email-link ?code= exchange), then SIGNED_IN / SIGNED_OUT / TOKEN_REFRESHED / USER_UPDATED.
    const { data: listener } = supabase.auth.onAuthStateChange((event, s) => {
      if (!mounted) return;
      setSession(s);
      const uid = s?.user.id ?? null;
      const userChanged = uid !== userIdRef.current;
      userIdRef.current = uid;

      if (event === 'INITIAL_SESSION' && authRedirect.hadCode) {
        authRedirect.hadCode = false;
        // Remove a leftover ?code= (e.g. link opened in a different browser) from the address bar.
        const url = new URL(window.location.href);
        if (url.searchParams.has('code')) {
          url.searchParams.delete('code');
          window.history.replaceState(window.history.state, '', url.toString());
        }
        // Email confirmed in this browser -> signed in. Otherwise the email is confirmed,
        // but the session could not be created here, so ask the user to sign in.
        setNotice(s ? { kind: 'email-confirmed' } : { kind: 'confirmed-sign-in' });
      }

      if (!userChanged && event !== 'USER_UPDATED') {
        // Token refresh etc. for the same user: keep the loaded profile.
        if (event === 'INITIAL_SESSION') setLoading(false);
        return;
      }

      // Mark the profile as pending now so guards never see "signed in, no profile, not loading".
      if (uid) setProfileLoading(true);
      // Don't call Supabase inside this callback (it holds the auth lock); defer it.
      setTimeout(() => {
        if (!mounted) return;
        loadProfileFor(s?.user ?? null).finally(() => {
          if (mounted) setLoading(false);
        });
      }, 0);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProfileFor]);

  const signUp = useCallback<AuthContextType['signUp']>(async ({ email, password, role, fullName, phone }) => {
    // The role is only a request. The database trigger accepts 'customer' or 'pandit'
    // and stores anything else as 'customer'; admin can only be granted in the database.
    const requestedRole: SignupRole = role === 'pandit' ? 'pandit' : 'customer';
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { role: requestedRole, full_name: fullName.trim(), phone: phone.trim() },
        emailRedirectTo: authRedirectUrl(),
      },
    });
    if (error) return { ...friendlyAuthError(error), needsConfirmation: false };

    // With email confirmation on, Supabase doesn't reveal existing accounts with an
    // error. It returns a user with no identities instead.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return {
        error: 'An account with this email already exists. Please sign in instead.',
        code: 'user_already_exists',
        needsConfirmation: false,
      };
    }
    return { error: null, needsConfirmation: !data.session };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return friendlyAuthError(error);
  }, []);

  const resendConfirmation = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: { emailRedirectTo: authRedirectUrl() },
    });
    return friendlyAuthError(error);
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    // If the server can't be reached, still end the session on this device.
    if (error) await supabase.auth.signOut({ scope: 'local' });
    requestRef.current++;
    userIdRef.current = null;
    setSession(null);
    setProfile(null);
    setProfileError(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await loadProfileFor(data.session?.user ?? null);
  }, [loadProfileFor]);

  const clearNotice = useCallback(() => setNotice(null), []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        role: profile?.role ?? null,
        loading,
        profileLoading,
        profileError,
        notice,
        clearNotice,
        signUp,
        signIn,
        resendConfirmation,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/** Only allow in-app paths as a post-login destination. */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next) return null;
  if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/auth')) return null;
  return next;
}
