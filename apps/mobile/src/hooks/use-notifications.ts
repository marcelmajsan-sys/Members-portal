import { useState, useEffect, useCallback } from 'react';
import * as ExpoNotifications from 'expo-notifications';
import { api } from '../lib/api';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const res = await api.get<Notification[]>('/api/notifications?page=1&limit=50');
    if (res.success && res.data) {
      setNotifications(Array.isArray(res.data) ? res.data : []);
    } else {
      setError(res.error?.message || 'Greška');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Auto-refresh when a push arrives while on this screen
  useEffect(() => {
    const sub = ExpoNotifications.addNotificationReceivedListener(() => {
      fetchAll();
    });
    return () => sub.remove();
  }, [fetchAll]);

  const markAsRead = useCallback(async (id: string) => {
    await api.patch(`/api/notifications/${id}/read`);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  }, []);

  return { notifications, loading, error, refetch: fetchAll, markAsRead };
}
