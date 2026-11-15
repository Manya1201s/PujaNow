import { useState, useEffect, useMemo } from 'react';
import { Link, useRouter } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { useSavedPandits } from '@/lib/hooks';
import {
  fetchBookingsForCustomer, fetchSamagriOrders, updateProfile, updateBookingStatus, fetchNotifications,
  markAllNotificationsRead, markNotificationRead, fetchPandits,
} from '@/lib/data';
import type { Booking, SamagriOrder, Notification, Pandit } from '@/types';
import { LoadingState, EmptyState, Badge, Modal, Ornament } from '@/components/ui';
import { PanditCard } from '@/components/cards';
import { formatINR, formatDate, formatDateTime, timeAgo, cn } from '@/lib/utils';
import {
  Calendar, Package, Bell, User, ShoppingBag, Settings, LogOut, CheckCircle2, XCircle, Clock, Truck, MapPin,
  Phone, Mail, LayoutDashboard, Heart, ArrowRight, MessageCircle, Hash, CreditCard, Users, Flower2, Save,
} from 'lucide-react';

type Tab = 'overview' | 'bookings' | 'orders' | 'notifications' | 'saved' | 'profile';
const validTabs: Tab[] = ['overview', 'bookings', 'orders', 'notifications', 'saved', 'profile'];

export function CustomerDashboardPage({ initialTab }: { initialTab?: string }) {
  const { profile, signOut, refreshProfile } = useAuth();
  const { navigate } = useRouter();
  const { show } = useToast();
  const { ids: savedIds } = useSavedPandits();
  const [tab, setTab] = useState<Tab>(validTabs.includes(initialTab as Tab) ? (initialTab as Tab) : 'overview');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [orders, setOrders] = useState<SamagriOrder[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [allPandits, setAllPandits] = useState<Pandit[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileForm, setProfileForm] = useState({ full_name: '', phone: '', location: '', bio: '' });
  const [saving, setSaving] = useState(false);
  const [bookingFilter, setBookingFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!profile) { navigate('/auth'); return; }
    setProfileForm({
      full_name: profile.full_name || '',
      phone: profile.phone || '',
      location: profile.location || '',
      bio: profile.bio || '',
    });
    Promise.all([
      fetchBookingsForCustomer(profile.id),
      fetchSamagriOrders(profile.id),
      fetchNotifications(profile.id),
    ])
      .then(([b, o, n]) => { setBookings(b); setOrders(o); setNotifications(n); })
      .catch(console.error)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  useEffect(() => {
    fetchPandits().then(setAllPandits).catch(() => {});
  }, []);

  const upcomingBookings = useMemo(
    () => bookings
      .filter((b) => b.status === 'pending' || b.status === 'confirmed')
      .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date)),
    [bookings],
  );
  const pastBookings = bookings.filter((b) => b.status === 'completed' || b.status === 'cancelled' || b.status === 'rejected');
  const completedCount = bookings.filter((b) => b.status === 'completed').length;
  const unreadNotifs = notifications.filter((n) => !n.is_read).length;
  const savedPandits = allPandits.filter((p) => savedIds.includes(p.id));

  if (!profile) return null;
  if (loading) return <div className="pt-24"><LoadingState label="Loading your dashboard..." /></div>;

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await updateBookingStatus(cancelTarget.id, 'cancelled');
      setBookings((prev) => prev.map((b) => (b.id === cancelTarget.id ? { ...b, status: 'cancelled' } : b)));
      show('Booking cancelled', 'info');
      setCancelTarget(null);
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : 'Failed to cancel booking', 'error');
    }
    setCancelling(false);
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead(profile.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      show('Could not update notifications', 'error');
    }
  };

  const handleNotifClick = async (n: Notification) => {
    if (!n.is_read) {
      await markNotificationRead(n.id).catch(() => {});
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await updateProfile(profile.id, profileForm);
      await refreshProfile();
      show('Profile updated successfully', 'success');
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : 'Failed to update profile', 'error');
    }
    setSaving(false);
  };

  const tabs: { id: Tab; label: string; icon: typeof Calendar; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'bookings', label: 'Bookings', icon: Calendar, badge: upcomingBookings.length },
    { id: 'orders', label: 'Orders', icon: Package },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadNotifs },
    { id: 'saved', label: 'Saved Pandits', icon: Heart, badge: savedIds.length },
    { id: 'profile', label: 'Settings', icon: Settings },
  ];

  const visibleBookings = bookingFilter === 'upcoming' ? upcomingBookings : bookingFilter === 'past' ? pastBookings : bookings;
  const nextBooking = upcomingBookings[0];
  const firstName = profile.full_name?.split(' ')[0] || 'Devotee';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Suprabhat' : hour < 17 ? 'Namaste' : 'Shubh sandhya';

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="surface-dark">
        <div className="absolute inset-0 bg-rangoli opacity-50" />
        <div className="section relative pt-24 lg:pt-28 pb-24">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="w-20 h-20 rounded-full p-1 bg-gradient-to-br from-accent-200 to-accent-500 shrink-0">
              <div className="w-full h-full rounded-full bg-primary-800 flex items-center justify-center text-cream-50 font-display text-3xl overflow-hidden border-2 border-primary-900">
                {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : (profile.full_name?.[0]?.toUpperCase() || 'U')}
              </div>
            </div>
            <div className="flex-1">
              <p className="eyebrow eyebrow-light mb-1">{greeting}</p>
              <h1 className="font-display text-3xl sm:text-4xl font-semibold text-cream-50">{firstName}, welcome back</h1>
              <p className="text-cream-100/65 text-sm mt-1">{profile.email}</p>
            </div>
            <Link to="/booking" className="btn-accent self-start sm:self-auto"><Calendar size={16} /> Book a Puja</Link>
          </div>
        </div>
      </section>

      <div className="section -mt-14 relative pb-8">
        <div className="grid lg:grid-cols-[260px_1fr] gap-6 items-start">
          {/* Sidebar */}
          <aside className="lg:sticky lg:top-28">
            <nav className="card p-2 flex lg:flex-col gap-1 overflow-x-auto scrollbar-hide">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
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

          {/* Content */}
          <div key={tab} className="min-w-0 animate-fade-in">
            {tab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                  {[
                    { icon: Calendar, value: upcomingBookings.length, label: 'Upcoming bookings', tone: 'text-primary-600 bg-primary-50', to: 'bookings' as Tab },
                    { icon: CheckCircle2, value: completedCount, label: 'Completed pujas', tone: 'text-success-600 bg-success-50', to: 'bookings' as Tab },
                    { icon: ShoppingBag, value: orders.length, label: 'Samagri orders', tone: 'text-accent-700 bg-accent-50', to: 'orders' as Tab },
                    { icon: Heart, value: savedIds.length, label: 'Saved pandits', tone: 'text-primary-600 bg-primary-50', to: 'saved' as Tab },
                  ].map(({ icon: Icon, value, label, tone, to }) => (
                    <button key={label} onClick={() => setTab(to)} className="card-hover p-5 text-left">
                      <span className={cn('w-10 h-10 rounded-xl flex items-center justify-center', tone)}><Icon size={19} /></span>
                      <p className="font-display text-3xl font-semibold text-charcoal-800 mt-4">{value}</p>
                      <p className="text-xs text-charcoal-500">{label}</p>
                    </button>
                  ))}
                </div>

                {nextBooking ? (
                  <div className="relative rounded-3xl overflow-hidden surface-dark p-6 sm:p-8 shadow-luxe">
                    <div className="absolute inset-0 bg-rangoli opacity-40" />
                    <div className="relative flex flex-col md:flex-row md:items-center gap-6">
                      <div className="flex-1">
                        <p className="eyebrow eyebrow-light mb-2">Your next ceremony</p>
                        <h2 className="font-display text-3xl font-semibold text-cream-50">{nextBooking.puja_name}</h2>
                        <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4 text-sm text-cream-100/80">
                          <span className="flex items-center gap-2"><Calendar size={15} className="text-accent-300" /> {formatDate(nextBooking.scheduled_date)}</span>
                          <span className="flex items-center gap-2"><Clock size={15} className="text-accent-300" /> {nextBooking.scheduled_time}</span>
                          <span className="flex items-center gap-2"><MapPin size={15} className="text-accent-300" /> {nextBooking.city}</span>
                          <span className="flex items-center gap-2"><User size={15} className="text-accent-300" /> {nextBooking.pandit_name || 'Pandit to be assigned'}</span>
                        </div>
                      </div>
                      <div className="flex md:flex-col items-center md:items-end gap-3">
                        <StatusBadge status={nextBooking.status} />
                        <button onClick={() => { setTab('bookings'); setBookingFilter('upcoming'); }} className="btn-light">View details <ArrowRight size={15} /></button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="card">
                    <EmptyState icon={<Flower2 size={30} />} title="No upcoming ceremonies" description="Plan a puja and it will appear here with its status." action={<Link to="/booking" className="btn-primary">Plan a Puja</Link>} />
                  </div>
                )}

                <div className="grid sm:grid-cols-3 gap-3">
                  {[
                    { to: '/explore', icon: Flower2, label: 'Explore pujas' },
                    { to: '/pandits', icon: Users, label: 'Find a pandit' },
                    { to: '/ai-assistant', icon: MessageCircle, label: 'Ask the assistant' },
                  ].map(({ to, icon: Icon, label }) => (
                    <Link key={to} to={to} className="group flex items-center gap-3 p-4 rounded-2xl bg-cream-50 border border-cream-300 hover:border-primary-300 hover:shadow-card transition-all">
                      <span className="w-10 h-10 rounded-xl bg-cream-200 text-primary-700 flex items-center justify-center group-hover:bg-primary-700 group-hover:text-cream-50 transition-colors"><Icon size={18} /></span>
                      <span className="text-sm font-medium text-charcoal-700 flex-1">{label}</span>
                      <ArrowRight size={15} className="text-charcoal-300 group-hover:text-primary-700 group-hover:translate-x-1 transition-all" />
                    </Link>
                  ))}
                </div>

                <div className="grid xl:grid-cols-2 gap-6">
                  <Panel title="Recent orders" action={orders.length > 0 && <button onClick={() => setTab('orders')} className="link-arrow text-xs">View all <ArrowRight size={13} /></button>}>
                    {orders.length === 0 ? (
                      <p className="text-sm text-charcoal-500 py-6 text-center">No orders yet. <Link to="/samagri" className="text-primary-700 font-medium hover:underline">Shop samagri →</Link></p>
                    ) : (
                      <div className="divide-y divide-cream-200">
                        {orders.slice(0, 3).map((o) => (
                          <div key={o.id} className="flex items-center gap-3 py-3">
                            <span className="w-10 h-10 rounded-xl bg-accent-50 text-accent-700 flex items-center justify-center"><Package size={17} /></span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-charcoal-700 truncate">{o.order_ref}</p>
                              <p className="text-xs text-charcoal-400">{timeAgo(o.created_at)} · {o.items?.length || 0} items</p>
                            </div>
                            <span className="text-sm font-semibold text-primary-700">{formatINR(o.total)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </Panel>
                  <Panel title="Latest updates" action={notifications.length > 0 && <button onClick={() => setTab('notifications')} className="link-arrow text-xs">View all <ArrowRight size={13} /></button>}>
                    {notifications.length === 0 ? (
                      <p className="text-sm text-charcoal-500 py-6 text-center">You're all caught up.</p>
                    ) : (
                      <div className="divide-y divide-cream-200">
                        {notifications.slice(0, 3).map((n) => (
                          <div key={n.id} className="flex items-start gap-3 py-3">
                            <span className={cn('w-2 h-2 rounded-full mt-2 shrink-0', n.is_read ? 'bg-cream-400' : 'bg-primary-500')} />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-charcoal-700">{n.title}</p>
                              <p className="text-xs text-charcoal-400 line-clamp-1">{n.body} · {timeAgo(n.created_at)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Panel>
                </div>
              </div>
            )}

            {tab === 'bookings' && (
              <div>
                <SectionTitle title="My bookings" subtitle="Track every ceremony request and its status." />
                <div className="inline-flex p-1 rounded-full bg-cream-200 mb-5">
                  {([['upcoming', `Upcoming (${upcomingBookings.length})`], ['past', `Past (${pastBookings.length})`], ['all', `All (${bookings.length})`]] as const).map(([id, label]) => (
                    <button key={id} onClick={() => setBookingFilter(id)} className={cn('px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all', bookingFilter === id ? 'bg-cream-50 text-primary-800 shadow-soft' : 'text-charcoal-500 hover:text-charcoal-700')}>
                      {label}
                    </button>
                  ))}
                </div>
                {visibleBookings.length === 0 ? (
                  <div className="card">
                    <EmptyState icon={<Calendar size={30} />} title={bookingFilter === 'past' ? 'No past bookings' : 'No bookings yet'} description="Book your first puja with a verified pandit." action={<Link to="/booking" className="btn-primary">Plan a Puja</Link>} />
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {visibleBookings.map((b) => <BookingCard key={b.id} booking={b} onCancel={() => setCancelTarget(b)} />)}
                  </div>
                )}
              </div>
            )}

            {tab === 'orders' && (
              <div>
                <SectionTitle title="Samagri orders" subtitle="Your marketplace orders and their status." />
                {orders.length === 0 ? (
                  <div className="card">
                    <EmptyState icon={<Package size={30} />} title="No orders yet" description="Browse our samagri marketplace." action={<Link to="/samagri" className="btn-primary">Shop Samagri</Link>} />
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {orders.map((o) => <OrderCard key={o.id} order={o} />)}
                  </div>
                )}
              </div>
            )}

            {tab === 'notifications' && (
              <div>
                <SectionTitle
                  title="Notifications"
                  subtitle="Booking updates and reminders."
                  action={unreadNotifs > 0 && <button onClick={handleMarkAllRead} className="btn-outline text-xs py-2">Mark all read</button>}
                />
                {notifications.length === 0 ? (
                  <div className="card">
                    <EmptyState icon={<Bell size={30} />} title="No notifications" description="Booking updates and reminders will appear here." />
                  </div>
                ) : (
                  <div className="card divide-y divide-cream-200 overflow-hidden">
                    {notifications.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => handleNotifClick(n)}
                        className={cn('w-full p-4 sm:p-5 flex items-start gap-4 text-left transition-colors hover:bg-cream-100', !n.is_read && 'bg-primary-50/40')}
                      >
                        <span className={cn('w-10 h-10 rounded-full flex items-center justify-center shrink-0', n.is_read ? 'bg-cream-200 text-charcoal-400' : 'bg-primary-100 text-primary-700')}>
                          <Bell size={17} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <p className={cn('text-sm', n.is_read ? 'text-charcoal-600' : 'font-semibold text-charcoal-800')}>{n.title}</p>
                            <span className="text-[11px] text-charcoal-400 shrink-0">{timeAgo(n.created_at)}</span>
                          </div>
                          <p className="text-sm text-charcoal-500 mt-0.5">{n.body}</p>
                        </div>
                        {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary-500 mt-2 shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'saved' && (
              <div>
                <SectionTitle title="Saved pandits" subtitle="Pandits you've shortlisted (saved on this device)." />
                {savedPandits.length === 0 ? (
                  <div className="card">
                    <EmptyState icon={<Heart size={30} />} title="No saved pandits yet" description="Tap the heart on any pandit's card to keep them here for later." action={<Link to="/pandits" className="btn-primary">Find a pandit</Link>} />
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                    {savedPandits.map((p, i) => <PanditCard key={p.id} pandit={p} index={i} />)}
                  </div>
                )}
              </div>
            )}

            {tab === 'profile' && (
              <div>
                <SectionTitle title="Account settings" subtitle="Keep your details up to date for smoother bookings." />
                <div className="grid xl:grid-cols-[1fr_280px] gap-6 items-start">
                  <div className="card p-6">
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label className="label" htmlFor="pf-name"><User size={14} className="text-charcoal-400" /> Full name</label>
                        <input id="pf-name" type="text" value={profileForm.full_name} onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })} className="input" />
                      </div>
                      <div>
                        <label className="label" htmlFor="pf-phone"><Phone size={14} className="text-charcoal-400" /> Phone</label>
                        <input id="pf-phone" type="tel" value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} className="input" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="label" htmlFor="pf-loc"><MapPin size={14} className="text-charcoal-400" /> City / location</label>
                        <input id="pf-loc" type="text" value={profileForm.location} onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })} className="input" placeholder="Used to pre-fill your bookings" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="label" htmlFor="pf-bio">About you</label>
                        <textarea id="pf-bio" value={profileForm.bio} onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })} rows={3} className="input resize-none" placeholder="Family traditions, gotra, preferred language…" />
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-cream-200">
                      <button
                        onClick={() => setProfileForm({ full_name: profile.full_name || '', phone: profile.phone || '', location: profile.location || '', bio: profile.bio || '' })}
                        className="btn-ghost"
                      >
                        Reset
                      </button>
                      <button onClick={saveProfile} disabled={saving} className="btn-primary"><Save size={15} /> {saving ? 'Saving…' : 'Save changes'}</button>
                    </div>
                  </div>
                  <div className="card p-6 text-center">
                    <div className="w-20 h-20 mx-auto rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-3xl font-display overflow-hidden">
                      {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : (profile.full_name?.[0]?.toUpperCase() || 'U')}
                    </div>
                    <p className="font-display text-lg font-semibold text-charcoal-800 mt-3">{profile.full_name || 'No name set'}</p>
                    <Badge variant="primary" className="mt-1 capitalize">{profile.role}</Badge>
                    <Ornament className="mx-auto my-4 w-20" />
                    <div className="space-y-2 text-sm text-left">
                      <p className="flex items-center gap-2 text-charcoal-600 truncate"><Mail size={14} className="text-charcoal-400 shrink-0" /> {profile.email}</p>
                      <p className="flex items-center gap-2 text-charcoal-600"><Calendar size={14} className="text-charcoal-400 shrink-0" /> Member since {formatDate(profile.created_at)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal open={!!cancelTarget} onClose={() => !cancelling && setCancelTarget(null)} title="Cancel this booking?" size="sm">
        {cancelTarget && (
          <div>
            <p className="text-sm text-charcoal-600">
              You're about to cancel <b>{cancelTarget.puja_name}</b> on {formatDate(cancelTarget.scheduled_date)} at {cancelTarget.scheduled_time}. This can't be undone.
            </p>
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setCancelTarget(null)} disabled={cancelling} className="btn-ghost">Keep booking</button>
              <button onClick={confirmCancel} disabled={cancelling} className="btn-danger">{cancelling ? 'Cancelling…' : 'Yes, cancel'}</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function SectionTitle({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5 pt-2 lg:pt-0">
      <div className="bg-cream-100/80 lg:bg-transparent rounded-2xl">
        <h2 className="font-display text-2xl sm:text-3xl font-semibold text-charcoal-800">{title}</h2>
        <p className="text-sm text-charcoal-500 mt-0.5">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-display text-lg font-semibold text-charcoal-800">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

const bookingStatus: Record<string, { variant: 'success' | 'warning' | 'error' | 'default'; icon: typeof Clock; label: string }> = {
  pending: { variant: 'warning', icon: Clock, label: 'Pending' },
  confirmed: { variant: 'success', icon: CheckCircle2, label: 'Confirmed' },
  completed: { variant: 'default', icon: CheckCircle2, label: 'Completed' },
  cancelled: { variant: 'error', icon: XCircle, label: 'Cancelled' },
  rejected: { variant: 'error', icon: XCircle, label: 'Rejected' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = bookingStatus[status] || bookingStatus.pending;
  return <Badge variant={cfg.variant} className="capitalize"><cfg.icon size={11} /> {cfg.label}</Badge>;
}

function BookingCard({ booking, onCancel }: { booking: Booking; onCancel: () => void }) {
  const stages = ['Requested', 'Confirmed', 'Completed'];
  const stageIndex = booking.status === 'completed' ? 2 : booking.status === 'confirmed' ? 1 : 0;
  const ended = booking.status === 'cancelled' || booking.status === 'rejected';
  const [y, m, d] = booking.scheduled_date.split('-').map(Number);
  const dateObj = new Date(y, (m || 1) - 1, d || 1);

  return (
    <div className={cn('card overflow-hidden', ended && 'opacity-80')}>
      <div className="flex flex-col sm:flex-row">
        <div className={cn('sm:w-28 shrink-0 flex sm:flex-col items-center justify-center gap-2 sm:gap-0 py-3 sm:py-5', ended ? 'bg-cream-200 text-charcoal-500' : 'bg-gradient-to-br from-primary-700 to-primary-900 text-cream-50')}>
          <span className="text-xs uppercase tracking-wider opacity-80">{dateObj.toLocaleDateString('en-IN', { month: 'short' })}</span>
          <span className="font-display text-3xl font-semibold leading-none">{dateObj.getDate()}</span>
          <span className="text-xs opacity-80">{dateObj.toLocaleDateString('en-IN', { weekday: 'short' })}</span>
        </div>
        <div className="flex-1 p-5 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-display text-xl font-semibold text-charcoal-800">{booking.puja_name}</h3>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-charcoal-500 mt-1.5">
                <span className="flex items-center gap-1"><Clock size={12} /> {booking.scheduled_time}</span>
                <span className="flex items-center gap-1"><User size={12} /> {booking.pandit_name || 'Pandit to be assigned'}</span>
                <span className="flex items-center gap-1"><Hash size={12} /> {booking.booking_ref}</span>
              </div>
              <p className="text-xs text-charcoal-400 mt-1 flex items-center gap-1"><MapPin size={12} /> {booking.address}, {booking.city}</p>
            </div>
            <div className="text-right">
              <p className="font-display text-xl font-semibold text-primary-700">{formatINR(booking.amount)}</p>
              <p className="text-[11px] text-charcoal-400 flex items-center justify-end gap-1 mt-0.5"><CreditCard size={11} /> Payment {booking.payment_status}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 mt-5 pt-4 border-t border-cream-200">
            {ended ? (
              <StatusBadge status={booking.status} />
            ) : (
              <ol className="flex items-center gap-1.5 text-[11px]">
                {stages.map((s, i) => (
                  <li key={s} className="flex items-center gap-1.5">
                    <span className={cn('flex items-center gap-1 font-medium', i <= stageIndex ? 'text-primary-700' : 'text-charcoal-400')}>
                      <span className={cn('w-4 h-4 rounded-full flex items-center justify-center', i <= stageIndex ? 'bg-primary-600 text-cream-50' : 'bg-cream-300')}>
                        {i <= stageIndex && <CheckCircle2 size={10} />}
                      </span>
                      {s}
                    </span>
                    {i < stages.length - 1 && <span className={cn('w-5 sm:w-8 h-px', i < stageIndex ? 'bg-primary-500' : 'bg-cream-400')} />}
                  </li>
                ))}
              </ol>
            )}
            {(booking.status === 'pending' || booking.status === 'confirmed') && (
              <button onClick={onCancel} className="text-xs font-medium text-error-600 hover:text-error-700 hover:bg-error-50 px-3 py-1.5 rounded-lg">Cancel booking</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderCard({ order }: { order: SamagriOrder }) {
  const statusConfig: Record<string, { variant: 'success' | 'warning' | 'error' | 'default'; icon: typeof Truck }> = {
    pending: { variant: 'warning', icon: Clock },
    paid: { variant: 'success', icon: CheckCircle2 },
    shipped: { variant: 'default', icon: Truck },
    delivered: { variant: 'success', icon: CheckCircle2 },
    cancelled: { variant: 'error', icon: XCircle },
  };
  const cfg = statusConfig[order.status] || statusConfig.pending;
  const items = order.items || [];

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display text-lg font-semibold text-charcoal-800">Order {order.order_ref}</h3>
            <Badge variant={cfg.variant} className="capitalize"><cfg.icon size={11} /> {order.status}</Badge>
          </div>
          <p className="text-xs text-charcoal-400 mt-1">{formatDateTime(order.created_at)} · {order.address}, {order.city}</p>
        </div>
        <span className="font-display text-xl font-semibold text-primary-700">{formatINR(order.total)}</span>
      </div>
      {items.length > 0 && (
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-cream-200">
          <div className="flex -space-x-3">
            {items.slice(0, 4).map((it) => (
              <span key={it.id} className="w-11 h-11 rounded-xl border-2 border-cream-50 overflow-hidden bg-cream-200">
                {it.product_image && <img src={it.product_image} alt="" className="w-full h-full object-cover" />}
              </span>
            ))}
          </div>
          <p className="text-xs text-charcoal-500 line-clamp-2 flex-1">
            {items.map((it) => `${it.product_name} ×${it.quantity}`).join(', ')}
          </p>
        </div>
      )}
    </div>
  );
}
