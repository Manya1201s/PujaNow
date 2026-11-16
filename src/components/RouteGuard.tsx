import { useEffect, type ReactNode } from 'react';
import { Link, useRouter } from '@/lib/router';
import { useAuth, ROLE_HOME, ROLE_LABEL } from '@/lib/auth';
import type { UserRole } from '@/types';
import { LoadingState, Ornament } from '@/components/ui';

/**
 * Client-side route protection. This only decides what to *show*. The data itself is
 * protected by Row Level Security in the database, which checks the role stored in
 * public.profiles on every request.
 */
export function RequireRole({ roles, children }: { roles: UserRole[]; children: ReactNode }) {
  const { session, profile, profileLoading, profileError, refreshProfile, signOut } = useAuth();
  const { path, navigate } = useRouter();

  useEffect(() => {
    // Only redirect if this page is still the current URL. When the user signs out, the app is
    // already navigating home, and this guard must not override that with the sign-in page.
    if (!session && window.location.hash.slice(1) === path) {
      navigate(`/auth?next=${encodeURIComponent(path)}`, { replace: true });
    }
  }, [session, path, navigate]);

  if (!session) return <div className="pt-24 min-h-[70vh]"><LoadingState label="Redirecting to sign in…" /></div>;
  if (profileLoading || (!profile && !profileError)) return <div className="pt-24 min-h-[70vh]"><LoadingState label="Loading your account…" /></div>;

  if (!profile) {
    return (
      <StatusPage
        code="!"
        title="We couldn't load your account"
        message={profileError || 'Please try again in a moment.'}
        action={
          <div className="flex flex-wrap gap-3 justify-center">
            <button onClick={() => refreshProfile()} className="btn-primary">Try Again</button>
            <button onClick={() => signOut()} className="btn-outline">Sign Out</button>
          </div>
        }
      />
    );
  }

  if (!roles.includes(profile.role)) {
    const current = ROLE_LABEL[profile.role].toLowerCase();
    const article = /^[aeiou]/.test(current) ? 'an' : 'a';
    return (
      <StatusPage
        code="403"
        title="This area isn't available for your account"
        message={`You're signed in as ${article} ${current}. This page is only for ${roles.map((r) => ROLE_LABEL[r].toLowerCase() + 's').join(' and ')}.`}
        action={<Link to={ROLE_HOME[profile.role]} className="btn-primary">Go to My Dashboard</Link>}
      />
    );
  }

  return <>{children}</>;
}

export function StatusPage({ code, title, message, action }: { code: string; title: string; message: string; action: ReactNode }) {
  return (
    <div className="pt-24 min-h-[80vh] flex items-center justify-center">
      <div className="text-center px-4 max-w-md">
        <p className="font-display text-7xl sm:text-8xl font-semibold text-gradient-gold">{code}</p>
        <div className="flex justify-center mt-4"><Ornament /></div>
        <h1 className="font-display text-2xl font-semibold text-charcoal-800 mt-5 text-balance">{title}</h1>
        <p className="text-charcoal-500 text-sm mt-2 mb-7">{message}</p>
        {action}
      </div>
    </div>
  );
}
