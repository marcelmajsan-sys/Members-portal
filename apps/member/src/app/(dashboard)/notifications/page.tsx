'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Notification {
  id: string;
  type: 'INFO' | 'WARNING' | 'ACTION' | 'REMINDER';
  title: string;
  message: string;
  isRead: boolean;
  actionUrl: string | null;
  createdAt: string;
}

const typeBadge: Record<string, { label: string; className: string }> = {
  INFO: { label: 'Info', className: 'bg-blue-100 text-blue-700' },
  WARNING: { label: 'Upozorenje', className: 'bg-yellow-100 text-yellow-700' },
  ACTION: { label: 'Akcija', className: 'bg-red-100 text-red-700' },
  REMINDER: { label: 'Podsjetnik', className: 'bg-purple-100 text-purple-700' },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  async function load() {
    const unreadOnly = filter === 'unread';
    const res = await api.get<Notification[]>(
      `/api/notifications?page=${page}&limit=${limit}${unreadOnly ? '&unreadOnly=true' : ''}`,
    );
    if (res.success && res.data) {
      setNotifications(Array.isArray(res.data) ? res.data : []);
      setTotal((res as { pagination?: { total: number } }).pagination?.total ?? 0);
    }
    setLoading(false);
  }

  useEffect(() => {
    setLoading(true);
    load();
  }, [page, filter]);

  async function markAsRead(id: string) {
    await api.patch(`/api/notifications/${id}/read`);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
  }

  async function markAllAsRead() {
    await api.post('/api/notifications/mark-all-read');
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-text-secondary">Učitavanje...</div>
      </div>
    );
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-heading font-heading">Obavijesti</h1>
          <p className="text-text-secondary mt-1">Vaše obavijesti i upozorenja</p>
        </div>
        <button
          onClick={markAllAsRead}
          className="text-sm text-primary hover:text-primary-light transition-colors cursor-pointer"
        >
          Označi sve kao pročitano
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => { setFilter('all'); setPage(1); }}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
            filter === 'all' ? 'bg-primary text-white' : 'bg-white border border-border text-text-body hover:bg-bg-section'
          }`}
        >
          Sve
        </button>
        <button
          onClick={() => { setFilter('unread'); setPage(1); }}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
            filter === 'unread' ? 'bg-primary text-white' : 'bg-white border border-border text-text-body hover:bg-bg-section'
          }`}
        >
          Nepročitane
        </button>
      </div>

      {/* Notification list */}
      {notifications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border shadow-sm p-10 text-center">
          <p className="text-text-secondary">Nema obavijesti</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => !n.isRead && markAsRead(n.id)}
              className={`bg-white rounded-xl border shadow-sm p-4 flex items-start gap-4 transition-colors ${
                n.isRead ? 'border-border' : 'border-primary/30 bg-primary/[0.02] cursor-pointer'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeBadge[n.type]?.className ?? 'bg-gray-100 text-gray-700'}`}>
                    {typeBadge[n.type]?.label ?? n.type}
                  </span>
                  {!n.isRead && (
                    <span className="w-2 h-2 bg-primary rounded-full shrink-0" />
                  )}
                </div>
                <h3 className="text-sm font-medium text-text-heading">{n.title}</h3>
                <p className="text-xs text-text-secondary mt-0.5">{n.message}</p>
              </div>
              <span className="text-xs text-text-secondary shrink-0">
                {new Date(n.createdAt).toLocaleDateString('hr-HR')}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg text-sm border border-border disabled:opacity-50 cursor-pointer"
          >
            Prethodna
          </button>
          <span className="text-sm text-text-secondary">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 rounded-lg text-sm border border-border disabled:opacity-50 cursor-pointer"
          >
            Sljedeća
          </button>
        </div>
      )}
    </div>
  );
}
