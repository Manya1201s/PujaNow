import { useEffect, useState } from 'react';
import { useRouter } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from '@/lib/data';
import type { Notification } from '@/types';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui';
import { SectionTitle } from '@/components/DashboardShell';
import { cn, timeAgo } from '@/lib/utils';
import { Bell } from 'lucide-react';

/** The signed-in user's notifications (RLS: own rows only). Same look as the customer dashboard list. */
export function NotificationsPanel({ subtitle, onUnreadChange }: { subtitle: string; onUnreadChange?: (n: number) => void }) {
  const { profile } = useAuth();
  const { navigate } = useRouter();
  const { show } = useToast();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!profile) return;
    fetchNotifications(profile.id)
      .then(setItems)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load notifications'))
      .finally(() => setLoading(false));
  }, [profile]);

  const unread = items.filter((n) => !n.is_read).length;
  useEffect(() => { onUnreadChange?.(unread); }, [unread, onUnreadChange]);

  if (!profile) return null;

  const open = async (n: Notification) => {
    if (!n.is_read) {
      await markNotificationRead(n.id).catch(() => {});
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
    }
    if (n.link) navigate(n.link);
  };

  const markAll = async () => {
    try {
      await markAllNotificationsRead(profile.id);
      setItems((prev) => prev.map((x) => ({ ...x, is_read: true })));
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : 'Could not update notifications', 'error');
    }
  };

  return (
    <div>
      <SectionTitle
        title="Notifications"
        subtitle={subtitle}
        action={unread > 0 && <button onClick={markAll} className="btn-header text-xs py-2">Mark all read</button>}
      />
      {loading ? (
        <div className="card"><LoadingState label="Loading notifications…" /></div>
      ) : error ? (
        <div className="card"><ErrorState message={error} /></div>
      ) : items.length === 0 ? (
        <div className="card">
          <EmptyState icon={<Bell size={30} />} title="No notifications" description="Updates about your account will appear here." />
        </div>
      ) : (
        <div className="card divide-y divide-cream-200 overflow-hidden">
          {items.map((n) => (
            <button
              key={n.id}
              onClick={() => open(n)}
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
                <p className="text-sm text-charcoal-500 mt-0.5 break-words">{n.body}</p>
              </div>
              {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary-500 mt-2 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
