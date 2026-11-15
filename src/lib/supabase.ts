import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.error('Missing Supabase env vars. Check .env for VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

/**
 * Email-link callback handling.
 *
 * The app uses a hash router (#/path). Supabase reports email-link failures
 * (expired / already-used link) as `#error=...&error_description=...`, which the
 * router would otherwise treat as a page path and show a 404. Capture that here,
 * before the router or the Supabase client read the URL, and point the user at
 * the sign-in page instead.
 *
 * Successful links come back as `?code=...` (PKCE flow, below) and are exchanged
 * for a session by the Supabase client itself.
 */
export const authRedirect: {
  /** Supabase reported a problem with the email link. */
  error: string | null;
  /** `?code=` was present: the client exchanges it for a session (same browser). */
  hadCode: boolean;
  /** `#access_token=` link (e.g. a re-sent confirmation email): the email is confirmed, the user signs in. */
  tokenLink: boolean;
} = { error: null, hadCode: false, tokenLink: false };

if (typeof window !== 'undefined') {
  const hash = window.location.hash.replace(/^#/, '');
  const search = new URLSearchParams(window.location.search);
  const hashParams = /(^|&)(error|error_description|error_code|access_token)=/.test(hash) ? new URLSearchParams(hash) : null;
  const errorDescription =
    hashParams?.get('error_description') || search.get('error_description') ||
    (hashParams?.get('error') || search.get('error') ? 'This sign-in link is invalid or has expired.' : null);

  if (errorDescription || hashParams?.get('access_token')) {
    if (errorDescription) authRedirect.error = errorDescription.replace(/\+/g, ' ');
    else authRedirect.tokenLink = true;
    ['error', 'error_description', 'error_code'].forEach((k) => search.delete(k));
    const qs = search.toString();
    // Drop the tokens/error from the address bar and history; continue on the sign-in page.
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${qs ? `?${qs}` : ''}#/auth`);
  }
  authRedirect.hadCode = search.has('code');
}

/** Where Supabase email links send the user back to (must be allowed in Auth → URL Configuration). */
export function authRedirectUrl(): string {
  return `${window.location.origin}${window.location.pathname}`;
}

// createClient throws on an empty URL, which would blank the whole app at import time.
// Fall back to an unreachable placeholder so the UI still renders and data calls fail
// into the normal error/empty states instead.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.invalid',
  supabaseAnonKey || 'missing-anon-key',
  {
    auth: {
      persistSession: true, // session is kept in localStorage and restored on refresh
      autoRefreshToken: isSupabaseConfigured,
      detectSessionInUrl: true,
      // PKCE returns `?code=` in the query string, which doesn't collide with the hash router
      // (the default implicit flow returns `#access_token=...`).
      flowType: 'pkce',
    },
  },
);
