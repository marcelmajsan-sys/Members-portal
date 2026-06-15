import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

export interface DashboardData {
  members: {
    total: number;
    active: number;
    pending: number;
    expired?: number;
    suspended?: number;
  };
  revenue: {
    thisMonth: number;
    thisYear: number;
  };
  recentMembers: Array<{
    id: string;
    status: string;
    joinedAt: string;
    expiresAt: string | null;
    company: { name: string };
    user: { firstName: string; lastName: string; email: string };
  }>;
  upcomingExpirations: Array<{
    id: string;
    expiresAt: string;
    company: { name: string };
    user: { firstName: string; lastName: string };
  }>;
  pendingTasks: number;
  unreadNotifications: number;
}

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await api.get<DashboardData>('/api/os/dashboard');
    if (res.success && res.data) {
      setData(res.data);
    } else {
      setError(res.error?.message || 'Greška pri učitavanju');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
