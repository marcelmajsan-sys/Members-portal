'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface EmployeeStats {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  stats: {
    todo: number;
    inProgress: number;
    done: number;
    overdue: number;
    total: number;
  };
  avgCompletionDays: number;
  completedThisWeek: number;
  completedThisMonth: number;
}

interface TeamAnalytics {
  employees: EmployeeStats[];
  totals: {
    todo: number;
    inProgress: number;
    done: number;
    overdue: number;
    total: number;
  };
}

export default function TeamAnalyticsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState<TeamAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user && user.role !== 'OWNER') {
      router.replace('/dashboard');
    }
  }, [user, router]);

  useEffect(() => {
    async function fetch() {
      const res = await api.get<TeamAnalytics>('/api/os/tasks/analytics/team');
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.error?.message || 'Greška pri učitavanju');
      }
      setLoading(false);
    }
    fetch();
  }, []);

  if (user?.role !== 'OWNER') return null;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-500">Učitavanje analitike...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-danger bg-danger-light p-4 text-sm text-danger">
        {error}
      </div>
    );
  }

  if (!data) return null;

  const totals = data.totals;
  const completionRate = totals.total > 0 ? Math.round((totals.done / totals.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analitika tima</h1>
          <p className="mt-1 text-sm text-gray-500">Pregled performansi zaposlenika</p>
        </div>
        <Link
          href="/team"
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          Natrag na tim
        </Link>
      </div>

      {/* Team totals */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 md:grid-cols-5">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500">Ukupno</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{totals.total}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500">Za napraviti</p>
          <p className="mt-1 text-2xl font-bold text-gray-500">{totals.todo}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500">U tijeku</p>
          <p className="mt-1 text-2xl font-bold text-yellow-500">{totals.inProgress}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500">Završeno</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{totals.done}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500">Zakašnjelo</p>
          <p className="mt-1 text-2xl font-bold text-red-500">{totals.overdue}</p>
        </div>
      </div>

      {/* Team completion rate */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-700">Ukupna stopa završetka</p>
          <p className="text-sm font-bold text-gray-900">{completionRate}%</p>
        </div>
        <div className="h-3 w-full rounded-full bg-gray-100">
          <div
            className="h-3 rounded-full bg-green-500 transition-all"
            style={{ width: `${completionRate}%` }}
          />
        </div>
      </div>

      {/* Employee cards */}
      <div className="space-y-4">
        {data.employees.map((emp) => {
          const empRate = emp.stats.total > 0 ? Math.round((emp.stats.done / emp.stats.total) * 100) : 0;
          return (
            <div key={emp.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    {emp.firstName} {emp.lastName}
                  </h3>
                  <p className="text-xs text-gray-500">{emp.email}</p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <div className="text-center">
                    <p className="text-xs text-gray-400">Za napraviti</p>
                    <p className="text-sm font-bold text-gray-500">{emp.stats.todo}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400">U tijeku</p>
                    <p className="text-sm font-bold text-yellow-500">{emp.stats.inProgress}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400">Završeno</p>
                    <p className="text-sm font-bold text-green-600">{emp.stats.done}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400">Zakašnjelo</p>
                    <p className="text-sm font-bold text-red-500">{emp.stats.overdue}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400">Prosjek (dana)</p>
                    <p className="text-sm font-bold text-gray-700">
                      {emp.avgCompletionDays > 0 ? emp.avgCompletionDays.toFixed(1) : '-'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-gray-400">Stopa završetka</p>
                  <p className="text-xs font-semibold text-gray-700">{empRate}%</p>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100">
                  <div
                    className="h-2 rounded-full bg-green-500 transition-all"
                    style={{ width: `${empRate}%` }}
                  />
                </div>
              </div>

              <div className="mt-3 flex gap-4 text-xs text-gray-400">
                <span>Ovaj tjedan: <strong className="text-gray-600">{emp.completedThisWeek}</strong></span>
                <span>Ovaj mjesec: <strong className="text-gray-600">{emp.completedThisMonth}</strong></span>
              </div>
            </div>
          );
        })}

        {data.employees.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-400">Nema podataka o zaposlenicima</p>
          </div>
        )}
      </div>
    </div>
  );
}
