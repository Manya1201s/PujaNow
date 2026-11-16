import { useState, useEffect, useRef, type FormEvent } from 'react';
import { Link, useRouter } from '@/lib/router';
import { useAuth, ROLE_HOME } from '@/lib/auth';
import { useCart } from '@/lib/cart';
import { cn, timeAgo } from '@/lib/utils';
import type { Notification, Category, UserRole } from '@/types';
import { fetchNotifications, markAllNotificationsRead, markNotificationRead, fetchCategories } from '@/lib/data';
import { categoryIcon } from '@/components/categoryIcons';
import {
  Menu, X, Bell, ShoppingBag, User, ChevronDown, Calendar, LogOut, Search,
  ArrowRight, LayoutDashboard, Package, Heart, Flower2, Users, MessageCircle, BookOpenText, Sparkles, CalendarClock, ClipboardCheck, type LucideIcon,
} from 'lucide-react';

const navLinks = [
  { label: 'Find a Pandit', to: '/pandits' },
  { label: 'Samagri', to: '/samagri' },
  { label: 'AI Assistant', to: '/ai-assistant' },
];

// Account links shown in the user menus, per role (the role comes from the database profile).
const accountLinks: Record<UserRole, { to: string; icon: LucideIcon; label: string }[]> = {
  customer: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/dashboard/bookings', icon: Calendar, label: 'My Bookings' },
    { to: '/dashboard/orders', icon: Package, label: 'My Orders' },
    { to: '/dashboard/saved', icon: Heart, label: 'Saved Pandits' },
    { to: '/dashboard/profile', icon: User, label: 'Account Settings' },
  ],
  pandit: [
    { to: '/pandit-dashboard', icon: LayoutDashboard, label: 'Pandit Dashboard' },
    { to: '/pandit-dashboard/bookings', icon: Calendar, label: 'Bookings' },
    { to: '/pandit-dashboard/profile', icon: BookOpenText, label: 'Pandit Profile' },
    { to: '/pandit-dashboard/services', icon: Sparkles, label: 'Services & Pricing' },
    { to: '/pandit-dashboard/availability', icon: CalendarClock, label: 'Availability' },
    { to: '/pandit-dashboard/notifications', icon: Bell, label: 'Notifications' },
    { to: '/pandit-dashboard/account', icon: User, label: 'Account Settings' },
  ],
  admin: [
    { to: '/admin', icon: LayoutDashboard, label: 'Admin Console' },
    { to: '/admin/pandits', icon: ClipboardCheck, label: 'Pandit Applications' },
    { to: '/admin/users', icon: Users, label: 'Users' },
    { to: '/admin/notifications', icon: Bell, label: 'Notifications' },
    { to: '/admin/account', icon: User, label: 'Account Settings' },
  ],
};

const quickSearches = ['Griha Pravesh', 'Lakshmi Puja', 'Satyanarayan Katha', 'Rudrabhishek', 'Navagraha Shanti'];

export function Navbar() {
  const { path, navigate } = useRouter();
  const { profile, signOut } = useAuth();
  const handleSignOut = async () => {
    setUserMenuOpen(false);
    await signOut();
    navigate('/');
  };
  const { count } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [pujasOpen, setPujasOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const pujasRef = useRef<HTMLDivElement>(null);

  const cleanPath = path.split('?')[0] || '/';
  const overlay = cleanPath === '/' && !scrolled && !mobileOpen;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    if (profile) {
      fetchNotifications(profile.id).then(setNotifications).catch(() => {});
    } else {
      setNotifications([]);
    }
  }, [profile]);

  // Close all menus on navigation
  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
    setNotifOpen(false);
    setPujasOpen(false);
    setSearchOpen(false);
  }, [path]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen || searchOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen, searchOpen]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (pujasRef.current && !pujasRef.current.contains(e.target as Node)) setPujasOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setUserMenuOpen(false); setNotifOpen(false); setPujasOpen(false); setSearchOpen(false); setMobileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const handleNotifClick = async (n: Notification) => {
    if (!n.is_read) {
      await markNotificationRead(n.id).catch(() => {});
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
    }
    if (n.link) navigate(n.link);
    setNotifOpen(false);
  };

  const handleMarkAllRead = async () => {
    if (!profile) return;
    await markAllNotificationsRead(profile.id).catch(() => {});
    setNotifications((prev) => prev.map((x) => ({ ...x, is_read: true })));
  };

  const isActive = (to: string) => cleanPath === to || cleanPath.startsWith(`${to}/`);
  const pujasActive = isActive('/explore') || cleanPath.startsWith('/pujas');

  const linkClass = (active: boolean) =>
    cn(
      'relative px-3.5 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1',
      overlay
        ? active ? 'text-cream-50 bg-cream-50/15' : 'text-cream-50/85 hover:text-cream-50 hover:bg-cream-50/10'
        : active ? 'text-primary-800 bg-primary-50' : 'text-charcoal-600 hover:text-primary-700 hover:bg-cream-200/70',
    );
  const iconClass = cn('icon-btn', overlay ? 'text-cream-50 hover:bg-cream-50/15' : 'text-charcoal-600');

  return (
    <>
      <header
        className={cn(
          'fixed top-0 inset-x-0 z-50 transition-all duration-500',
          overlay
            ? 'bg-gradient-to-b from-charcoal-900/50 to-transparent'
            : 'bg-cream-50/90 backdrop-blur-xl border-b border-cream-300/70 shadow-[0_6px_30px_-12px_rgba(37,32,30,.15)]',
        )}
      >
        <nav className="section flex items-center justify-between h-16 lg:h-20 gap-3">
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
            <span className={cn('w-9 h-9 rounded-xl flex items-center justify-center transition-colors', overlay ? 'bg-cream-50/15 backdrop-blur' : 'bg-primary-50')}>
              <img src="/puja.svg" alt="" className="w-6 h-6 transition-transform duration-500 group-hover:rotate-12" />
            </span>
            <span className="leading-none">
              <span className={cn('font-display text-xl font-semibold tracking-tight block', overlay ? 'text-cream-50' : 'text-primary-800')}>PujaNow</span>
              <span className={cn('text-[9px] uppercase tracking-[.28em] hidden sm:block mt-0.5', overlay ? 'text-accent-200' : 'text-accent-700')}>Sacred · Simplified</span>
            </span>
          </Link>

          <div className="hidden lg:flex items-center gap-0.5">
            <div className="relative" ref={pujasRef} onMouseLeave={() => setPujasOpen(false)}>
              <button
                onClick={() => setPujasOpen((v) => !v)}
                onMouseEnter={() => setPujasOpen(true)}
                className={linkClass(pujasActive)}
                aria-expanded={pujasOpen}
              >
                Pujas <ChevronDown size={14} className={cn('transition-transform', pujasOpen && 'rotate-180')} />
              </button>
              {pujasOpen && (
                <div className="absolute left-1/2 -translate-x-1/2 top-full pt-3 w-[560px]">
                  <div className="bg-cream-50 rounded-3xl shadow-elevated border border-cream-300 overflow-hidden animate-slide-down grid grid-cols-[1fr_190px]">
                    <div className="p-4">
                      <p className="text-[11px] uppercase tracking-[.2em] text-charcoal-400 font-semibold px-3 mb-2">Browse by intention</p>
                      <div className="grid grid-cols-2 gap-1">
                        {categories.map((c) => {
                          const Icon = categoryIcon(c.icon);
                          return (
                            <Link key={c.id} to={`/explore?category=${c.slug}`} className="flex items-start gap-3 p-3 rounded-2xl hover:bg-cream-100 transition-colors group/item">
                              <span className="w-9 h-9 rounded-xl bg-primary-50 text-primary-700 flex items-center justify-center shrink-0 group-hover/item:bg-primary-700 group-hover/item:text-cream-50 transition-colors">
                                <Icon size={17} />
                              </span>
                              <span className="min-w-0">
                                <span className="block text-sm font-medium text-charcoal-800">{c.name}</span>
                                <span className="block text-[11px] text-charcoal-400 line-clamp-1">{c.description}</span>
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                    <div className="surface-dark p-5 flex flex-col">
                      <div className="relative flex-1">
                        <Flower2 className="text-accent-300" size={22} />
                        <p className="font-display text-lg text-cream-50 mt-3 leading-snug">Every ceremony, thoughtfully arranged.</p>
                      </div>
                      <Link to="/explore" className="relative link-arrow text-accent-200 hover:text-accent-100 mt-4">All Pujas <ArrowRight size={14} /></Link>
                      <Link to="/booking" className="relative link-arrow text-cream-50/80 hover:text-cream-50 mt-2">Plan a Puja <ArrowRight size={14} /></Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {navLinks.map((link) => (
              <Link key={link.to} to={link.to} className={linkClass(isActive(link.to))}>
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1">
            <button onClick={() => setSearchOpen(true)} className={iconClass} aria-label="Search">
              <Search size={19} />
            </button>

            {profile && (
              <div className="relative hidden sm:block" ref={notifRef}>
                <button onClick={() => setNotifOpen((v) => !v)} className={iconClass} aria-label="Notifications">
                  <Bell size={19} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-primary-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-cream-50">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                {notifOpen && (
                  <div className="absolute right-0 mt-3 w-[22rem] bg-cream-50 rounded-3xl shadow-elevated border border-cream-300 animate-slide-down overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-cream-300 bg-cream-100/60">
                      <span className="font-display text-lg font-semibold text-charcoal-800">Notifications</span>
                      {unreadCount > 0 && (
                        <button onClick={handleMarkAllRead} className="text-xs font-medium text-primary-700 hover:underline">Mark all read</button>
                      )}
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-5 py-10 text-center">
                          <Bell size={28} className="mx-auto text-cream-400" />
                          <p className="text-charcoal-400 text-sm mt-2">You're all caught up</p>
                        </div>
                      ) : (
                        notifications.slice(0, 8).map((n) => (
                          <button
                            key={n.id}
                            onClick={() => handleNotifClick(n)}
                            className={cn('w-full text-left px-5 py-3.5 border-b border-cream-200 last:border-0 hover:bg-cream-100 transition-colors flex gap-3', !n.is_read && 'bg-primary-50/40')}
                          >
                            <span className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', n.is_read ? 'bg-transparent' : 'bg-primary-500')} />
                            <span className="min-w-0">
                              <span className="block text-sm font-medium text-charcoal-700">{n.title}</span>
                              <span className="block text-xs text-charcoal-500 mt-0.5 line-clamp-2">{n.body}</span>
                              <span className="block text-[11px] text-charcoal-400 mt-1">{timeAgo(n.created_at)}</span>
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                    <Link
                      to={profile.role === 'pandit' ? '/pandit-dashboard/notifications' : profile.role === 'admin' ? '/admin/notifications' : '/dashboard/notifications'}
                      className="block text-center text-xs font-medium text-primary-700 py-3 border-t border-cream-300 hover:bg-cream-100"
                    >
                      View all notifications
                    </Link>
                  </div>
                )}
              </div>
            )}

            <Link to="/cart" className={iconClass} aria-label={`Cart, ${count} items`}>
              <ShoppingBag size={19} />
              {count > 0 && (
                <span key={count} className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-accent-500 text-charcoal-900 text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-cream-50 animate-scale-in">
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </Link>

            {profile ? (
              <div className="relative hidden sm:block" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className={cn('flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full transition-colors', overlay ? 'hover:bg-cream-50/15' : 'hover:bg-cream-200')}
                  aria-expanded={userMenuOpen}
                  aria-label="Account menu"
                >
                  <span className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-800 flex items-center justify-center text-cream-50 text-xs font-semibold overflow-hidden ring-2 ring-accent-300/60">
                    {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : (profile.full_name?.[0]?.toUpperCase() || 'U')}
                  </span>
                  <ChevronDown size={14} className={cn('transition-transform', overlay ? 'text-cream-50/80' : 'text-charcoal-400', userMenuOpen && 'rotate-180')} />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-3 w-60 bg-cream-50 rounded-3xl shadow-elevated border border-cream-300 animate-slide-down overflow-hidden">
                    <div className="px-5 py-4 bg-cream-100/60 border-b border-cream-300">
                      <p className="text-sm font-semibold text-charcoal-800 truncate">{profile.full_name || 'Devotee'}</p>
                      <p className="text-xs text-charcoal-400 truncate">{profile.email}</p>
                    </div>
                    <div className="p-2">
                      {accountLinks[profile.role].map(({ to, icon: Icon, label }) => (
                        <Link key={to} to={to} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-charcoal-600 hover:bg-cream-200/70 hover:text-charcoal-800">
                          <Icon size={16} className="text-charcoal-400" /> {label}
                        </Link>
                      ))}
                    </div>
                    <div className="p-2 border-t border-cream-300">
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-error-600 hover:bg-error-50"
                      >
                        <LogOut size={16} /> Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/auth" className={cn('hidden sm:inline-flex btn px-4', overlay ? 'text-cream-50 hover:bg-cream-50/15' : 'text-charcoal-700 hover:bg-cream-200')}>Sign In</Link>
            )}

            <Link to="/booking" className={cn('hidden md:inline-flex ml-1', overlay ? 'btn-accent' : 'btn-primary')}>
              <Calendar size={15} /> Book a Puja
            </Link>

            <button onClick={() => setMobileOpen((v) => !v)} className={cn(iconClass, 'lg:hidden')} aria-label="Menu" aria-expanded={mobileOpen}>
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-charcoal-900/50 backdrop-blur-sm animate-fade-in" onClick={() => setMobileOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-[86%] max-w-sm bg-cream-50 shadow-elevated animate-slide-in-right flex flex-col pt-16">
            <div className="flex-1 overflow-y-auto px-5 py-5">
              {profile ? (
                <Link to={ROLE_HOME[profile.role]} className="flex items-center gap-3 p-3 rounded-2xl bg-cream-100 border border-cream-300 mb-5">
                  <span className="w-11 h-11 rounded-full bg-gradient-to-br from-primary-500 to-primary-800 flex items-center justify-center text-cream-50 font-semibold overflow-hidden">
                    {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : (profile.full_name?.[0]?.toUpperCase() || 'U')}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-charcoal-800 truncate">{profile.full_name || 'Devotee'}</span>
                    <span className="block text-xs text-charcoal-500 truncate">View Dashboard</span>
                  </span>
                  {unreadCount > 0 && <span className="badge bg-primary-600 text-cream-50">{unreadCount} new</span>}
                </Link>
              ) : (
                <div className="grid grid-cols-2 gap-2 mb-5">
                  <Link to="/auth" className="btn-outline">Sign In</Link>
                  <Link to="/auth?mode=signup" className="btn-primary">Sign Up</Link>
                </div>
              )}

              <p className="text-[11px] uppercase tracking-[.2em] text-charcoal-400 font-semibold mb-2 px-1">Discover</p>
              <div className="flex flex-col gap-0.5">
                {[
                  { to: '/explore', label: 'Explore Pujas', icon: Flower2 },
                  { to: '/pandits', label: 'Find a Pandit', icon: Users },
                  { to: '/samagri', label: 'Samagri Store', icon: ShoppingBag },
                  { to: '/ai-assistant', label: 'AI Assistant', icon: MessageCircle },
                ].map(({ to, label, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    className={cn('flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] font-medium transition-colors', isActive(to) ? 'text-primary-800 bg-primary-50' : 'text-charcoal-700 hover:bg-cream-200/70')}
                  >
                    <Icon size={18} className={isActive(to) ? 'text-primary-600' : 'text-charcoal-400'} /> {label}
                  </Link>
                ))}
              </div>

              {categories.length > 0 && (
                <>
                  <p className="text-[11px] uppercase tracking-[.2em] text-charcoal-400 font-semibold mt-6 mb-2 px-1">Pujas by intention</p>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((c) => (
                      <Link key={c.id} to={`/explore?category=${c.slug}`} className="chip">{c.name}</Link>
                    ))}
                  </div>
                </>
              )}

              {profile && (
                <>
                  <p className="text-[11px] uppercase tracking-[.2em] text-charcoal-400 font-semibold mt-6 mb-2 px-1">Account</p>
                  <div className="flex flex-col gap-0.5">
                    {profile.role === 'customer' ? (
                      <>
                        <Link to="/dashboard/bookings" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-charcoal-600 hover:bg-cream-200/70"><Calendar size={17} className="text-charcoal-400" /> My Bookings</Link>
                        <Link to="/dashboard/orders" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-charcoal-600 hover:bg-cream-200/70"><Package size={17} className="text-charcoal-400" /> My Orders</Link>
                        <Link to="/dashboard/notifications" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-charcoal-600 hover:bg-cream-200/70"><Bell size={17} className="text-charcoal-400" /> Notifications</Link>
                      </>
                    ) : (
                      accountLinks[profile.role].slice(1).map(({ to, icon: Icon, label }) => (
                        <Link key={to} to={to} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-charcoal-600 hover:bg-cream-200/70"><Icon size={17} className="text-charcoal-400" /> {label}</Link>
                      ))
                    )}
                    <button onClick={handleSignOut} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-error-600 hover:bg-error-50"><LogOut size={17} /> Sign Out</button>
                  </div>
                </>
              )}
            </div>
            <div className="p-5 border-t border-cream-300 bg-cream-100/70">
              <Link to="/booking" className="btn-primary btn-lg w-full"><Calendar size={16} /> Book a Puja</Link>
            </div>
          </div>
        </div>
      )}

      {/* Search overlay */}
      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} onSearch={(q) => navigate(`/explore?q=${encodeURIComponent(q)}`)} />}
    </>
  );
}

function SearchOverlay({ onClose, onSearch }: { onClose: () => void; onSearch: (q: string) => void }) {
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (q.trim()) onSearch(q.trim());
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Search pujas">
      <div className="absolute inset-0 bg-charcoal-900/60 backdrop-blur-md animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-cream-50 rounded-3xl shadow-elevated overflow-hidden animate-scale-in">
        <form onSubmit={submit} className="flex items-center gap-3 px-5 border-b border-cream-300">
          <Search size={20} className="text-primary-600 shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search pujas, occasions, rituals…"
            className="flex-1 py-5 bg-transparent text-lg text-charcoal-800 placeholder-charcoal-400 focus:outline-none"
          />
          <button type="button" onClick={onClose} className="text-[11px] font-medium text-charcoal-400 border border-cream-400 rounded-md px-1.5 py-0.5">ESC</button>
        </form>
        <div className="p-5">
          <p className="text-[11px] uppercase tracking-[.2em] text-charcoal-400 font-semibold mb-3">Popular searches</p>
          <div className="flex flex-wrap gap-2">
            {quickSearches.map((s) => (
              <button key={s} onClick={() => onSearch(s)} className="chip">
                <Search size={12} className="text-charcoal-400" /> {s}
              </button>
            ))}
          </div>
          <div className="grid sm:grid-cols-3 gap-2 mt-5">
            {[
              { to: '/pandits', label: 'Find a Pandit', icon: Users },
              { to: '/samagri', label: 'Shop Samagri', icon: ShoppingBag },
              { to: '/ai-assistant', label: 'Ask the Assistant', icon: MessageCircle },
            ].map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} className="flex items-center gap-2.5 p-3 rounded-2xl bg-cream-100 hover:bg-primary-50 hover:text-primary-800 text-sm text-charcoal-600 transition-colors">
                <Icon size={16} className="text-primary-600" /> {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
