import { lazy, Suspense, useEffect } from 'react';
import { RouterProvider, useRouter, matchRoute, Link } from '@/lib/router';
import { AuthProvider, useAuth, ROLE_HOME } from '@/lib/auth';
import { CartProvider } from '@/lib/cart';
import { ToastProvider, useToast } from '@/lib/toast';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { LoadingState } from '@/components/ui';
import { RequireRole, StatusPage } from '@/components/RouteGuard';
import { isSupabaseConfigured } from '@/lib/supabase';

import { HomePage } from '@/pages/HomePage';

// Secondary pages are split into their own chunks and loaded on first visit
const ExplorePujasPage = lazy(() => import('@/pages/ExplorePujasPage').then((m) => ({ default: m.ExplorePujasPage })));
const PujaDetailPage = lazy(() => import('@/pages/PujaDetailPage').then((m) => ({ default: m.PujaDetailPage })));
const FindPanditPage = lazy(() => import('@/pages/FindPanditPage').then((m) => ({ default: m.FindPanditPage })));
const PanditDetailPage = lazy(() => import('@/pages/PanditDetailPage').then((m) => ({ default: m.PanditDetailPage })));
const SamagriPage = lazy(() => import('@/pages/SamagriPage').then((m) => ({ default: m.SamagriPage })));
const ProductDetailPage = lazy(() => import('@/pages/ProductDetailPage').then((m) => ({ default: m.ProductDetailPage })));
const CartPage = lazy(() => import('@/pages/CartPage').then((m) => ({ default: m.CartPage })));
const BookingPage = lazy(() => import('@/pages/BookingPage').then((m) => ({ default: m.BookingPage })));
const AuthPage = lazy(() => import('@/pages/AuthPage').then((m) => ({ default: m.AuthPage })));
const AIAssistantPage = lazy(() => import('@/pages/AIAssistantPage').then((m) => ({ default: m.AIAssistantPage })));
const CustomerDashboardPage = lazy(() => import('@/pages/CustomerDashboardPage').then((m) => ({ default: m.CustomerDashboardPage })));
const PanditDashboardPage = lazy(() => import('@/pages/PanditDashboardPage').then((m) => ({ default: m.PanditDashboardPage })));
const AdminDashboardPage = lazy(() => import('@/pages/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })));

function Routes() {
  const { path } = useRouter();
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-100">
        <LoadingState label="Loading PujaNow…" />
      </div>
    );
  }

  // Strip query string for matching
  const cleanPath = path.split('?')[0] || '/';

  let m;

  if (cleanPath === '/' || cleanPath === '') return <HomePage />;
  if (cleanPath === '/explore') return <ExplorePujasPage />;
  if ((m = matchRoute('/pujas/:slug', cleanPath))) return <PujaDetailPage slug={m.slug} />;
  if (cleanPath === '/pandits') return <FindPanditPage />;
  if ((m = matchRoute('/pandits/:id', cleanPath))) return <PanditDetailPage id={m.id} />;
  if (cleanPath === '/samagri') return <SamagriPage />;
  if ((m = matchRoute('/samagri/:slug', cleanPath))) return <ProductDetailPage slug={m.slug} />;
  if (cleanPath === '/cart') return <CartPage />;
  if (cleanPath === '/booking') return <BookingPage />;
  if (cleanPath === '/auth') return <AuthPage />;
  if (cleanPath === '/ai-assistant') return <AIAssistantPage />;

  // ---- Role-protected areas (the database enforces the same rules through RLS) ----
  if (cleanPath === '/dashboard' || (m = matchRoute('/dashboard/:tab', cleanPath))) {
    return <RequireRole roles={['customer']}><CustomerDashboardPage initialTab={m?.tab} /></RequireRole>;
  }
  if (cleanPath === '/pandit-dashboard' || (m = matchRoute('/pandit-dashboard/:tab', cleanPath))) {
    return <RequireRole roles={['pandit']}><PanditDashboardPage initialTab={m?.tab} /></RequireRole>;
  }
  if (cleanPath === '/admin' || (m = matchRoute('/admin/:tab', cleanPath))) {
    return <RequireRole roles={['admin']}><AdminDashboardPage initialTab={m?.tab} /></RequireRole>;
  }

  return (
    <StatusPage
      code="404"
      title="This path leads nowhere"
      message="The page you're looking for doesn't exist or may have moved."
      action={
        <div className="flex flex-wrap gap-3 justify-center">
          <Link to="/" className="btn-primary">Back to Home</Link>
          <Link to="/explore" className="btn-outline">Explore Pujas</Link>
        </div>
      }
    />
  );
}

/** Acts on the result of an email confirmation link once the session is known. */
function AuthLinkHandler() {
  const { notice, clearNotice, profile, profileError, loading, profileLoading } = useAuth();
  const { path, navigate } = useRouter();
  const { show } = useToast();

  useEffect(() => {
    if (loading || !notice) return;
    if (notice.kind === 'email-confirmed') {
      if (profileLoading) return;
      clearNotice();
      if (profile) {
        show('Email confirmed. Welcome to PujaNow!', 'success');
        navigate(ROLE_HOME[profile.role], { replace: true });
      } else if (profileError) {
        show(profileError, 'error');
      }
    } else if (!path.startsWith('/auth')) {
      // Link problems / "please sign in" messages are shown on the sign-in page.
      navigate('/auth', { replace: true });
    }
  }, [notice, loading, profile, profileError, profileLoading, path, navigate, clearNotice, show]);

  return null;
}

function AppShell() {
  const { path } = useRouter();
  const cleanPath = (path.split('?')[0] || '/').replace(/\/$/, '') || '/';
  const isAuthPage = cleanPath === '/auth';

  return (
    <div className="min-h-screen flex flex-col bg-cream-100">
      {!isSupabaseConfigured && (
        <div role="alert" className="fixed bottom-0 inset-x-0 z-[95] bg-error-700 text-white text-xs sm:text-sm px-4 py-2.5 text-center">
          Supabase is not configured. Add <code className="font-mono">VITE_SUPABASE_URL</code> and <code className="font-mono">VITE_SUPABASE_ANON_KEY</code> to a <code className="font-mono">.env</code> file and restart the dev server. Data will not load until then.
        </div>
      )}
      <AuthLinkHandler />
      {!isAuthPage && <Navbar />}
      {/* Keyed by path so each navigation remounts the page and plays the enter transition */}
      <main key={path} className="flex-1 page-enter">
        <Suspense fallback={<div className="pt-24 min-h-[70vh]"><LoadingState /></div>}>
          <Routes />
        </Suspense>
      </main>
      {!isAuthPage && <Footer />}
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <CartProvider>
          <RouterProvider>
            <AppShell />
          </RouterProvider>
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
