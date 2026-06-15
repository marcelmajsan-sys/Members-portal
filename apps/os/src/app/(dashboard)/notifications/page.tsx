'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchNotifications = useCallback(async () => {
    const res = await api.get<Notification[]>('/api/notifications');
    if (res.success && res.data) {
      setNotifications(res.data);
    } else {
      setError(res.error?.message || 'Greška pri učitavanju');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  async function markAllRead() {
    const res = await api.post('/api/notifications/mark-all-read');
    if (res.success) {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    }
  }

  function handleClick(notification: Notification) {
    // Mark single as read
    if (!notification.isRead) {
      api.patch(`/api/notifications/${notification.id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
      );
    }
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Obavijesti</h1>
          {unreadCount > 0 && (
            <p className="mt-1 text-sm text-gray-500">{unreadCount} nepročitanih</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
          >
            Označi sve kao pročitano
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-danger bg-danger-light p-4 text-sm text-danger">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <p className="text-gray-500">Učitavanje...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <p className="text-gray-400">Nema obavijesti</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleClick(n)}
              className={`cursor-pointer rounded-xl border bg-white p-4 transition hover:shadow-sm ${
                n.isRead ? 'border-gray-200' : 'border-primary/30 bg-primary/[0.02]'
              }`}
            >
              <div className="flex items-start gap-3">
                {!n.isRead && (
                  <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
                )}
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className={`text-sm ${n.isRead ? 'text-gray-700' : 'font-semibold text-gray-900'}`}>
                      {n.title}
                    </h3>
                    <time className="flex-shrink-0 text-xs text-gray-400">
                      {new Date(n.createdAt).toLocaleDateString('hr-HR')}
                    </time>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">{n.message}</p>
                  {n.actionUrl && (
                    <p className="mt-2 text-xs font-medium text-primary">Pogledaj &rarr;</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
