'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  actionUrl?: string;
  createdAt: string;
}

type NotifType = 'task' | 'member' | 'claim' | 'renewal' | 'note' | 'other';
type Tab = NotifType | 'all';

const TYPE_META: Record<NotifType, { label: string; icon: string; dot: string; badge: string; border: string }> = {
  task:    { label: 'Novi zadatak',  icon: '✓',  dot: 'bg-blue-100 text-blue-600',   badge: 'bg-blue-100 text-blue-700',   border: 'border-l-blue-500' },
  member:  { label: 'Novi član',     icon: '👤', dot: 'bg-green-100 text-green-600', badge: 'bg-green-100 text-green-700',  border: 'border-l-green-500' },
  claim:   { label: 'Zatraženi benefiti', icon: '🎁', dot: 'bg-purple-100 text-purple-600', badge: 'bg-purple-100 text-purple-700', border: 'border-l-purple-500' },
  renewal: { label: 'Članarine',     icon: '↻',  dot: 'bg-amber-100 text-amber-600', badge: 'bg-amber-100 text-amber-700',  border: 'border-l-amber-500' },
  note:    { label: 'Bilješke',      icon: '📝', dot: 'bg-teal-100 text-teal-600',   badge: 'bg-teal-100 text-teal-700',    border: 'border-l-teal-500' },
  other:   { label: 'Ostalo',        icon: '•',  dot: 'bg-gray-100 text-gray-500',   badge: 'bg-gray-100 text-gray-600',    border: 'border-l-gray-400' },
};

const TABS: { id: Tab; label: string }[] = [
  { id: 'all',     label: 'Sve obavijesti' },
  { id: 'task',    label: 'Novi zadatak' },
  { id: 'member',  label: 'Novi član' },
  { id: 'claim',   label: 'Zatraženi benefiti' },
  { id: 'renewal', label: 'Članarine' },
  { id: 'note',    label: 'Bilješke' },
];

function getNotifType(n: Notification): NotifType {
  const t = n.title.toLowerCase();
  if (n.title === 'Zatražen benefit') return 'claim';
  if (n.title === 'Novi član') return 'member';
  if (n.title === 'Nova bilješka za člana') return 'note';
  if (t.includes('zadat')) return 'task';
  if (t.includes('članarin') || t.includes('članstvo') || t.includes('obnov')) return 'renewal';
  return 'other';
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return 'upravo';
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'jučer';
  if (days < 7) return `${days} d`;
  return new Date(dateStr).toLocaleDateString('hr-HR', { day: 'numeric', month: 'numeric' });
}

export default function NotificationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as Tab) || 'all';
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>(TABS.some(t => t.id === initialTab) ? initialTab : 'all');

  const fetchNotifications = useCallback(async () => {
    const res = await api.get<Notification[]>('/api/notifications?limit=100');
    if (res.success && res.data) setNotifications(res.data);
    else setError(res.error?.message || 'Greška pri učitavanju');
    setLoading(false);
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  async function markRead(id: string, read: boolean) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: read } : n)));
    if (read) await api.patch(`/api/notifications/${id}/read`);
    else await api.patch(`/api/notifications/${id}/unread`);
  }

  async function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await api.post('/api/notifications/mark-all-read');
  }

  async function deleteNotif(id: string) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await api.del(`/api/notifications/${id}`);
  }

  const withType = notifications.map((n) => ({ ...n, notifType: getNotifType(n) }));
  const unreadOf = (type: NotifType) => withType.filter((n) => n.notifType === type && !n.isRead).length;
  const totalUnread = withType.filter((n) => !n.isRead).length;

  const visible = (tab === 'all' ? withType : withType.filter((n) => n.notifType === tab))
    .slice()
    .sort((a, b) => Number(a.isRead) - Number(b.isRead)); // unread first

  function badgeCount(id: Tab): number {
    if (id === 'all') return totalUnread;
    return unreadOf(id as NotifType);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Obavijesti</h1>
          <p className="mt-1 text-sm text-gray-500">
            {totalUnread > 0 ? `${totalUnread} nepročitanih` : 'Sve obavijesti su pročitane'}
          </p>
        </div>
        <button
          onClick={markAllRead}
          disabled={totalUnread === 0}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
        >
          Označi sve kao pročitano
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-gray-100 p-1">
        {TABS.map((t) => {
          const count = badgeCount(t.id);
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
              {count > 0 && (
                <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="rounded-xl border border-danger bg-danger-light p-4 text-sm text-danger">{error}</div>
      )}

      {loading ? (
        <div className="flex h-48 items-center justify-center"><p className="text-gray-500">Učitavanje...</p></div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <p className="text-3xl">🔔</p>
          <p className="mt-2 text-gray-400">Nema obavijesti u ovoj kategoriji</p>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((n) => {
            const meta = TYPE_META[n.notifType];
            return (
              <div
                key={n.id}
                className={`flex items-start gap-4 rounded-xl border bg-white p-4 transition ${
                  n.isRead ? 'border-gray-200 opacity-60 hover:opacity-100' : `border-gray-200 border-l-4 ${meta.border}`
                }`}
              >
                <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm ${n.isRead ? 'bg-gray-100 text-gray-400' : meta.dot}`}>
                  {meta.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.badge}`}>{meta.label}</span>
                      <h3 className={`text-sm ${n.isRead ? 'text-gray-700' : 'font-semibold text-gray-900'}`}>{n.title}</h3>
                    </div>
                    <time className="flex-shrink-0 text-xs text-gray-400">{timeAgo(n.createdAt)}</time>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">{n.message}</p>
                  <div className="mt-2 flex items-center gap-4">
                    {n.actionUrl && n.actionUrl.startsWith('/members/') && (
                      <button onClick={() => router.push(n.actionUrl!)} className="text-xs font-medium text-primary hover:underline">
                        Otvori člana →
                      </button>
                    )}
                    <button
                      onClick={() => markRead(n.id, !n.isRead)}
                      className="text-xs text-gray-400 hover:text-gray-700"
                    >
                      {n.isRead ? 'Označi nepročitano' : 'Označi pročitano'}
                    </button>
                    <button
                      onClick={() => deleteNotif(n.id)}
                      className="text-xs text-gray-400 hover:text-red-500"
                    >
                      Obriši
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
