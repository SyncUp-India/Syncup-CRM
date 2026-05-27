'use client';
import { useEffect, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { notificationsApi } from '@/lib/api';
import type { Notification } from '@syncup/shared';
import { formatDateTime } from '@syncup/shared';
import toast from 'react-hot-toast';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const res = await notificationsApi.list({ limit: 50 });
      setNotifications(res.data.data);
    } catch {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotifications(); }, []);

  const markAllRead = async () => {
    await notificationsApi.markAllRead();
    setNotifications((n) => n.map((x) => ({ ...x, read: true })));
    toast.success('All marked as read');
  };

  const markRead = async (id: string) => {
    await notificationsApi.markRead(id);
    setNotifications((n) => n.map((x) => x.id === id ? { ...x, read: true } : x));
  };

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <AppShell>
      <div className="p-6 max-w-2xl space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Notifications</h1>
            <p className="text-sm text-zinc-500">{unread} unread</p>
          </div>
          {unread > 0 && (
            <button onClick={markAllRead} className="btn-secondary flex items-center gap-2">
              <CheckCheck size={14} /> Mark all read
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="card p-4 h-16 animate-pulse bg-zinc-100 dark:bg-zinc-800" />)}
          </div>
        ) : notifications.length === 0 ? (
          <div className="card p-12 text-center text-zinc-400">
            <Bell size={32} className="mx-auto mb-3 opacity-30" />
            <p>No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => !n.read && markRead(n.id)}
                className={`card p-4 flex items-start gap-3 cursor-pointer transition hover:shadow-sm ${!n.read ? 'border-black dark:border-white' : ''}`}
              >
                <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${n.read ? 'bg-zinc-200 dark:bg-zinc-700' : 'bg-black dark:bg-white'}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${!n.read ? 'font-semibold' : ''}`}>{n.title}</p>
                  <p className="text-sm text-zinc-500 mt-0.5">{n.body}</p>
                  <p className="text-xs text-zinc-400 mt-1">{formatDateTime(n.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
