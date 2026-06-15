import { useState, useEffect, useCallback, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { AppState } from 'react-native';
import { api } from '../lib/api';

export function useUnreadCount() {
  const [count, setCount] = useState(0);
  const appState = useRef(AppState.currentState);

  const fetchCount = useCallback(async () => {
    const res = await api.get<Array<{ isRead: boolean }>>('/api/notifications?page=1&limit=50');
    if (res.success && res.data && Array.isArray(res.data)) {
      setCount(res.data.filter((n) => !n.isRead).length);
    }
  }, []);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  // Refresh when a push notification is received while app is open
  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(() => {
      fetchCount();
    });
    return () => subscription.remove();
  }, [fetchCount]);

  // Refresh when app comes back to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        fetchCount();
      }
      appState.current = nextState;
    });
    return () => subscription.remove();
  }, [fetchCount]);

  return { count, refetch: fetchCount };
}
