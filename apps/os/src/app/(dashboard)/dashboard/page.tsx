'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface DashboardData {
  members: {
    total: number;
    active: number;
    pending: number;
    expired?: number;
    suspended?: number;
  };
  offersWithSentStatus: number;
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
  monthlyRenewals: Array<{
    id: string;
    status: string;
    expiresAt: string;
    company: { name: string };
    user: { firstName: string; lastName: string; email: string };
  }>;
  pendingTasks: number;
  unreadNotifications: number;
  memberClaims?: { total: number; thisMonth: number };
  recentClaims?: Array<{
    id: string;
    claimedAt: string | null;
    benefit: { title: string };
    member: { id: string; company: { name: string } | null; user: { firstName: string; lastName: string; email: string } };
  }>;
}

function StatCard({
  label,
  value,
  color = 'primary',
  href,
}: {
  label: string;
  value: string | number;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'accent';
  href?: string;
}) {
  const colorMap = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success-light text-success',
    warning: 'bg-warning-light text-warning',
    danger: 'bg-danger-light text-danger',
    accent: 'bg-accent/10 text-accent-dark',
  };

  const content = (
    <>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
      <div className={`mt-3 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${colorMap[color]}`}>
        {label}
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="rounded-xl border border-gray-200 bg-white p-5 transition hover:border-primary hover:shadow-sm">
        {content}
      </Link>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      {content}
    </div>
  );
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('hr-HR', { style: 'currency', currency: 'EUR' }).format(amount);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('hr-HR');
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-success-light text-success',
  PENDING: 'bg-warning-light text-warning',
  EXPIRED: 'bg-danger-light text-danger',
  SUSPENDED: 'bg-gray-100 text-gray-500',
};

interface AnalyticsData {
  memberGrowth: Array<{ label: string; count: number }>;
  memberTimeline: Array<{ label: string; total: number }>;
  revenueByMonth: Array<{ label: string; amount: number }>;
  churnByMonth: Array<{ label: string; new: number; expired: number }>;
  tierDistribution: Record<string, number>;
  typeDistribution: Record<string, number>;
  statusDistribution: Record<string, number>;
  teamStats: Array<{
    id: string;
    name: string;
    todo: number;
    inProgress: number;
    done: number;
    overdue: number;
    total: number;
    completionRate: number;
  }>;
}

// ─── Chart Components ────────────────────────────────────────────────────────

function BarChart({
  data,
  color = '#1B365D',
  secondaryData,
  secondaryColor = '#EF4444',
  formatValue,
}: {
  data: Array<{ label: string; value: number }>;
  color?: string;
  secondaryData?: Array<{ label: string; value: number }>;
  secondaryColor?: string;
  formatValue?: (v: number) => string;
}) {
  const allValues = [
    ...data.map((d) => d.value),
    ...(secondaryData?.map((d) => d.value) ?? []),
  ];
  const max = Math.max(...allValues, 1);

  return (
    <div className="flex items-end gap-1" style={{ height: 160 }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1" style={{ minWidth: 0 }}>
          <div className="relative flex w-full items-end justify-center gap-0.5" style={{ height: 130 }}>
            <div
              className="w-full max-w-[20px] rounded-t transition-all duration-500"
              style={{
                height: `${(d.value / max) * 100}%`,
                minHeight: d.value > 0 ? 4 : 0,
                backgroundColor: color,
              }}
              title={`${d.label}: ${formatValue ? formatValue(d.value) : d.value}`}
            />
            {secondaryData && (
              <div
                className="w-full max-w-[20px] rounded-t transition-all duration-500"
                style={{
                  height: `${((secondaryData[i]?.value ?? 0) / max) * 100}%`,
                  minHeight: secondaryData[i]?.value > 0 ? 4 : 0,
                  backgroundColor: secondaryColor,
                }}
                title={`${d.label}: ${secondaryData[i]?.value ?? 0}`}
              />
            )}
          </div>
          <span className="text-[9px] text-gray-400 truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function DonutChart({
  segments,
}: {
  segments: Array<{ label: string; value: number; color: string }>;
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return <p className="text-sm text-gray-400 text-center py-8">Nema podataka</p>;

  let cumulative = 0;
  const gradientParts = segments
    .filter((s) => s.value > 0)
    .map((s) => {
      const start = (cumulative / total) * 360;
      cumulative += s.value;
      const end = (cumulative / total) * 360;
      return `${s.color} ${start}deg ${end}deg`;
    });

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
      <div
        className="shrink-0 rounded-full"
        style={{
          width: 100,
          height: 100,
          background: `conic-gradient(${gradientParts.join(', ')})`,
          mask: 'radial-gradient(circle at center, transparent 40%, black 41%)',
          WebkitMask: 'radial-gradient(circle at center, transparent 40%, black 41%)',
        }}
      />
      <div className="space-y-2">
        {segments.filter((s) => s.value > 0).map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-xs text-gray-600">
              {s.label}: <strong>{s.value}</strong> ({total > 0 ? Math.round((s.value / total) * 100) : 0}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamCard({
  member,
}: {
  member: AnalyticsData['teamStats'][number];
}) {
  const rate = member.completionRate;
  const rateColor = rate >= 70 ? '#10B981' : rate >= 40 ? '#F59E0B' : '#EF4444';

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-900">{member.name}</h4>
        <div
          className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: `${rateColor}20`, color: rateColor }}
        >
          {rate}%
        </div>
      </div>
      {/* Progress bar */}
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden mb-3">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${rate}%`, backgroundColor: rateColor }}
        />
      </div>
      <div className="grid grid-cols-4 gap-2 text-center">
        <div>
          <p className="text-lg font-bold text-gray-900">{member.done}</p>
          <p className="text-[10px] text-gray-400">Gotovo</p>
        </div>
        <div>
          <p className="text-lg font-bold text-blue-600">{member.inProgress}</p>
          <p className="text-[10px] text-gray-400">U tijeku</p>
        </div>
        <div>
          <p className="text-lg font-bold text-amber-500">{member.todo}</p>
          <p className="text-[10px] text-gray-400">Čeka</p>
        </div>
        <div>
          <p className="text-lg font-bold text-red-500">{member.overdue}</p>
          <p className="text-[10px] text-gray-400">Kasni</p>
        </div>
      </div>
    </div>
  );
}

function AnalyticsSection() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<AnalyticsData>('/api/os/dashboard/analytics').then((res) => {
      if (res.success && res.data) {
        setAnalytics(res.data);
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <p className="text-gray-400 text-sm">Učitavanje analitike...</p>
      </div>
    );
  }

  if (!analytics) return null;

  const tierColors = { FREE: '#94A3B8', STANDARD: '#3B82F6', PREMIUM: '#8B5CF6' };
  const tierLabels: Record<string, string> = { FREE: 'Besplatno', STANDARD: 'Standard', PREMIUM: 'Premium' };
  const typeColors = { WEB_TRADER: '#1B365D', SERVICE_PROVIDER: '#E8A838', PHYSICAL: '#10B981' };
  const typeLabels: Record<string, string> = { WEB_TRADER: 'Web trgovac', SERVICE_PROVIDER: 'Nuditelj usluga', PHYSICAL: 'Fizički' };

  const fmtCurrency = (v: number) =>
    new Intl.NumberFormat('hr-HR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);

  // Calculate totals for summary
  const totalRevenue12m = analytics.revenueByMonth.reduce((s, m) => s + m.amount, 0);
  const totalNew12m = analytics.memberGrowth.reduce((s, m) => s + m.count, 0);
  const totalExpired12m = analytics.churnByMonth.reduce((s, m) => s + m.expired, 0);
  const latestTotal = analytics.memberTimeline[analytics.memberTimeline.length - 1]?.total ?? 0;
  const sixMonthsAgoTotal = analytics.memberTimeline[5]?.total ?? 0;
  const growthPct = sixMonthsAgoTotal > 0
    ? Math.round(((latestTotal - sixMonthsAgoTotal) / sixMonthsAgoTotal) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200" />
        <h2 className="text-lg font-bold text-gray-900">Analitika</h2>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-blue-50 to-white p-4">
          <p className="text-xs font-medium text-gray-500">Rast (6 mj.)</p>
          <p className={`mt-1 text-2xl font-bold ${growthPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {growthPct >= 0 ? '+' : ''}{growthPct}%
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-green-50 to-white p-4">
          <p className="text-xs font-medium text-gray-500">Prihod (12 mj.)</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{fmtCurrency(totalRevenue12m)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-indigo-50 to-white p-4">
          <p className="text-xs font-medium text-gray-500">Novih (12 mj.)</p>
          <p className="mt-1 text-2xl font-bold text-indigo-600">{totalNew12m}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-red-50 to-white p-4">
          <p className="text-xs font-medium text-gray-500">Isteklo (12 mj.)</p>
          <p className="mt-1 text-2xl font-bold text-red-500">{totalExpired12m}</p>
        </div>
      </div>

      {/* Charts row 1: Member growth + Revenue trend */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Ukupno članova (12 mjeseci)</h3>
          <BarChart
            data={analytics.memberTimeline.map((m) => ({ label: m.label, value: m.total }))}
            color="#3B82F6"
          />
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Prihod po mjesecu</h3>
          <BarChart
            data={analytics.revenueByMonth.map((m) => ({ label: m.label, value: m.amount }))}
            color="#10B981"
            formatValue={fmtCurrency}
          />
        </div>
      </div>

      {/* Charts row 2: New vs Expired + Distributions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Novi vs. istekli</h3>
          <div className="flex gap-3 mb-3">
            <span className="flex items-center gap-1 text-[10px] text-gray-500">
              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: '#3B82F6' }} /> Novi
            </span>
            <span className="flex items-center gap-1 text-[10px] text-gray-500">
              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: '#EF4444' }} /> Istekli
            </span>
          </div>
          <BarChart
            data={analytics.churnByMonth.map((m) => ({ label: m.label, value: m.new }))}
            color="#3B82F6"
            secondaryData={analytics.churnByMonth.map((m) => ({ label: m.label, value: m.expired }))}
            secondaryColor="#EF4444"
          />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Po razini</h3>
          <DonutChart
            segments={Object.entries(analytics.tierDistribution).map(([key, val]) => ({
              label: tierLabels[key] || key,
              value: val,
              color: tierColors[key as keyof typeof tierColors] || '#94A3B8',
            }))}
          />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Po tipu</h3>
          <DonutChart
            segments={Object.entries(analytics.typeDistribution).map(([key, val]) => ({
              label: typeLabels[key] || key,
              value: val,
              color: typeColors[key as keyof typeof typeColors] || '#94A3B8',
            }))}
          />
        </div>
      </div>

      {/* Team performance */}
      {analytics.teamStats.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Učinkovitost tima</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {analytics.teamStats.map((member) => (
              <TeamCard key={member.id} member={member} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface OperatorTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueAt?: string;
}

function OperatorDashboard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<OperatorTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<OperatorTask[]>('/api/os/tasks?page=1&limit=100').then((res) => {
      if (res.success && res.data) {
        setTasks(res.data);
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-500">Učitavanje...</p>
      </div>
    );
  }

  const todo = tasks.filter((t) => t.status === 'TODO').length;
  const inProgress = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const done = tasks.filter((t) => t.status === 'DONE').length;
  const overdue = tasks.filter(
    (t) => t.status !== 'DONE' && t.dueAt && new Date(t.dueAt) < new Date()
  ).length;

  const upcoming = tasks
    .filter((t) => t.status !== 'DONE' && t.dueAt)
    .sort((a, b) => new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">
        Dobrodošla, {user?.firstName}
      </h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Za napraviti" value={todo} color="warning" />
        <StatCard label="U tijeku" value={inProgress} color="primary" />
        <StatCard label="Završeno" value={done} color="success" />
        <StatCard label="Zakašnjelo" value={overdue} color="danger" />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="font-semibold text-gray-900">Nadolazeći rokovi</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {upcoming.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-gray-400">Nema zadataka s rokom</p>
          ) : (
            upcoming.map((t) => (
              <div key={t.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{t.title}</p>
                  <p className="text-xs text-gray-500">
                    {t.status === 'IN_PROGRESS' ? 'U tijeku' : 'Za napraviti'}
                  </p>
                </div>
                <span
                  className={`text-xs font-medium ${
                    new Date(t.dueAt!) < new Date() ? 'text-red-600' : 'text-gray-500'
                  }`}
                >
                  {new Date(t.dueAt!).toLocaleDateString('hr-HR')}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

const MONTH_LABELS: Record<string, string> = {
  '01': 'Siječanj', '02': 'Veljača', '03': 'Ožujak', '04': 'Travanj',
  '05': 'Svibanj', '06': 'Lipanj', '07': 'Srpanj', '08': 'Kolovoz',
  '09': 'Rujan', '10': 'Listopad', '11': 'Studeni', '12': 'Prosinac',
};

function RenewalsSection({
  defaultMonth,
  onMonthChange,
  renewals,
  setRenewals,
  loading,
  setLoading,
  router,
}: {
  defaultMonth: string;
  onMonthChange: (m: string) => void;
  renewals: DashboardData['monthlyRenewals'];
  setRenewals: (r: DashboardData['monthlyRenewals']) => void;
  loading: boolean;
  setLoading: (l: boolean) => void;
  router: ReturnType<typeof useRouter>;
}) {
  const [month, setMonth] = useState(defaultMonth);
  const [statusFilter, setStatusFilter] = useState('all');

  // Generate 6 months of options (current + 5 future)
  const monthOptions = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() + i);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const mon = String(d.getMonth() + 1).padStart(2, '0');
    const label = MONTH_LABELS[mon];
    return { value: val, label };
  });

  useEffect(() => {
    setLoading(true);
    api.get<DashboardData['monthlyRenewals']>(`/api/os/dashboard/renewals?month=${month}`).then((res) => {
      if (res.success && res.data) {
        setRenewals(res.data);
      }
      setLoading(false);
    });
  }, [month]);

  const activeCount = renewals.filter((m) => m.status === 'ACTIVE').length;
  const expiredCount = renewals.filter((m) => m.status === 'EXPIRED').length;
  const filtered = statusFilter === 'all' ? renewals
    : renewals.filter((m) => m.status === statusFilter);

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-5 py-4">
        <h2 className="font-semibold text-gray-900">
          Obnove ({loading ? '...' : filtered.length})
        </h2>
      </div>
      <div className="px-5 pt-4 space-y-3">
        {/* Month pills */}
        <div className="flex flex-wrap gap-2">
          {monthOptions.map((o) => (
            <button
              key={o.value}
              onClick={() => {
                setMonth(o.value);
                onMonthChange(o.value);
                setStatusFilter('all');
              }}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                month === o.value
                  ? 'bg-[#1B365D] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        {/* Status pills */}
        {!loading && (
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'Sve', count: renewals.length },
              { key: 'ACTIVE', label: 'Aktivni', count: activeCount },
              { key: 'EXPIRED', label: 'Istekli', count: expiredCount },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  statusFilter === f.key
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {f.label} <span className={statusFilter === f.key ? 'text-white/70' : 'text-gray-400'}>{f.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="overflow-x-auto mt-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left">
              <th className="px-3 py-2.5 font-medium text-gray-500 sm:px-5">Ime</th>
              <th className="px-3 py-2.5 font-medium text-gray-500 hidden sm:table-cell sm:px-5">Firma</th>
              <th className="px-3 py-2.5 font-medium text-gray-500 sm:px-5">Status</th>
              <th className="px-3 py-2.5 font-medium text-gray-500 sm:px-5">Datum isteka</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-5 py-6 text-center text-gray-400">Učitavanje...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-6 text-center text-gray-400">Nema obnova za ovaj filter</td>
              </tr>
            ) : (
              filtered.map((m) => (
                <tr
                  key={m.id}
                  onClick={() => router.push(`/members/${m.id}`)}
                  className="border-b border-gray-50 cursor-pointer transition hover:bg-gray-50"
                >
                  <td className="px-3 py-2.5 sm:px-5">
                    <p className="font-medium text-gray-900">{m.user.firstName} {m.user.lastName}</p>
                    <p className="text-xs text-gray-400">{m.user.email}</p>
                  </td>
                  <td className="px-3 py-2.5 text-gray-600 hidden sm:table-cell sm:px-5">{m.company.name}</td>
                  <td className="px-3 py-2.5 sm:px-5">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[m.status] || 'bg-gray-100 text-gray-500'}`}>
                      {m.status === 'ACTIVE' ? 'Aktivan' : m.status === 'EXPIRED' ? 'Istekao' : m.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-danger font-medium sm:px-5">{formatDate(m.expiresAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [offerSending, setOfferSending] = useState<Record<string, 'sending' | 'sent' | 'error'>>({});
  const [offerSteps, setOfferSteps] = useState<Record<string, number>>({});
  const [renewalMonth, setRenewalMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [renewals, setRenewals] = useState<DashboardData['monthlyRenewals']>([]);
  const [renewalsLoading, setRenewalsLoading] = useState(false);

  useEffect(() => {
    if (user?.role === 'OPERATOR') return;
    api.get<DashboardData>('/api/os/dashboard').then((res) => {
      if (res.success && res.data) {
        setData(res.data);
        // Fetch offer step for each expiring member
        for (const m of res.data.upcomingExpirations || []) {
          api.get<{ step: number }>(`/api/os/members/${m.id}/offer-step`).then((r) => {
            setOfferSteps((prev) => ({ ...prev, [m.id]: r.success && r.data ? r.data.step : 0 }));
          });
        }
      } else {
        setError(res.error?.message || 'Greška pri učitavanju');
      }
      setLoading(false);
    });
  }, [user]);

  if (user?.role === 'OPERATOR') {
    return <OperatorDashboard />;
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-500">Učitavanje dashboarda...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-danger bg-danger-light p-6 text-center">
        <p className="text-danger">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const expiringCount = (data.upcomingExpirations || []).length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Ukupno članova" value={data.members.total} color="primary" href="/members" />
        <StatCard label="Aktivni" value={data.members.active} color="success" href="/members?filter=active" />
        <StatCard label="Izbrisani" value={data.members.pending} color="warning" href="/members?filter=pending" />
        <StatCard label="Poslana ponuda" value={data.offersWithSentStatus ?? 0} color="accent" href="/ponude" />
        <StatCard label="Ističu uskoro" value={expiringCount} color="danger" href="/members?filter=expiring_soon" />
      </div>

      {/* Revenue */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm font-medium text-gray-500">Prihod ovog mjeseca</p>
          <p className="mt-2 text-3xl font-bold text-accent-dark">{formatCurrency(data.revenue.thisMonth)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm font-medium text-gray-500">Prihod ove godine</p>
          <p className="mt-2 text-3xl font-bold text-accent-dark">{formatCurrency(data.revenue.thisYear)}</p>
        </div>
      </div>

      {/* Renewals by month */}
      <RenewalsSection
        defaultMonth={renewalMonth}
        onMonthChange={setRenewalMonth}
        renewals={renewals}
        setRenewals={setRenewals}
        loading={renewalsLoading}
        setLoading={setRenewalsLoading}
        router={router}
      />

      {/* Quick stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link href="/tasks" className="rounded-xl border border-gray-200 bg-white p-5 flex items-center justify-between transition hover:border-primary hover:shadow-sm">
          <span className="text-sm text-gray-600">Zadaci na čekanju</span>
          <span className="rounded-full bg-warning-light px-2.5 py-0.5 text-sm font-semibold text-warning">
            {data.pendingTasks}
          </span>
        </Link>
        <Link href="/notifications" className="rounded-xl border border-gray-200 bg-white p-5 flex items-center justify-between transition hover:border-primary hover:shadow-sm">
          <span className="text-sm text-gray-600">Nepročitane obavijesti</span>
          <span className="rounded-full bg-info-light px-2.5 py-0.5 text-sm font-semibold text-info">
            {data.unreadNotifications}
          </span>
        </Link>
        <Link href="/notifications?tab=claim" className="rounded-xl border border-gray-200 bg-white p-5 flex items-center justify-between transition hover:border-primary hover:shadow-sm">
          <div>
            <span className="text-sm text-gray-600">Zatraženi benefiti</span>
            <span className="block text-xs text-gray-400">{data.memberClaims?.thisMonth ?? 0} ovaj mjesec</span>
          </div>
          <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-sm font-semibold text-purple-700">
            {data.memberClaims?.total ?? 0}
          </span>
        </Link>
      </div>

      {/* Nedavne prijave članova (zatraženi benefiti) */}
      {data.recentClaims && data.recentClaims.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <h2 className="flex items-center gap-2 font-semibold text-gray-900">
              <span className="text-accent">➔</span> Nedavne prijave članova
            </h2>
            <Link href="/notifications?tab=claim" className="text-sm font-medium text-accent hover:underline">
              Inbox →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left">
                  <th className="px-5 py-2.5 font-medium text-gray-500">Član</th>
                  <th className="hidden px-5 py-2.5 font-medium text-gray-500 sm:table-cell">Email</th>
                  <th className="hidden px-5 py-2.5 font-medium text-gray-500 md:table-cell">Benefit</th>
                  <th className="px-5 py-2.5 text-right font-medium text-gray-500">Vrijeme prijave</th>
                </tr>
              </thead>
              <tbody>
                {data.recentClaims.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/members/${c.member.id}`)}
                    className="cursor-pointer border-b border-gray-50 transition hover:bg-gray-50"
                  >
                    <td className="px-5 py-3 text-gray-900">
                      {c.member.user.firstName} {c.member.user.lastName}
                      {c.member.company?.name && <span className="text-gray-400"> ({c.member.company.name})</span>}
                    </td>
                    <td className="hidden px-5 py-3 text-gray-500 sm:table-cell">{c.member.user.email}</td>
                    <td className="hidden px-5 py-3 text-gray-500 md:table-cell">{c.benefit.title}</td>
                    <td className="px-5 py-3 text-right text-gray-400">
                      {c.claimedAt
                        ? new Date(c.claimedAt).toLocaleDateString('hr-HR') + ' · ' + new Date(c.claimedAt).toLocaleTimeString('hr-HR', { hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Analytics */}
      <AnalyticsSection />

      {/* Recent members table — full width */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="font-semibold text-gray-900">Nedavni članovi</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left">
                <th className="px-3 py-3 font-medium text-gray-500 sm:px-5">Ime</th>
                <th className="px-3 py-3 font-medium text-gray-500 hidden sm:table-cell sm:px-5">Firma</th>
                <th className="px-3 py-3 font-medium text-gray-500 sm:px-5">Status</th>
                <th className="px-3 py-3 font-medium text-gray-500 sm:px-5">Datum</th>
              </tr>
            </thead>
            <tbody>
              {(data.recentMembers || []).map((m) => (
                <tr
                  key={m.id}
                  onClick={() => router.push(`/members/${m.id}`)}
                  className="border-b border-gray-50 cursor-pointer transition hover:bg-gray-50"
                >
                  <td className="px-3 py-3 font-medium text-gray-900 sm:px-5">
                    {m.user.firstName} {m.user.lastName}
                  </td>
                  <td className="px-3 py-3 text-gray-600 hidden sm:table-cell sm:px-5">{m.company.name}</td>
                  <td className="px-3 py-3 sm:px-5">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[m.status] || 'bg-gray-100 text-gray-500'}`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-gray-500 sm:px-5">{formatDate(m.joinedAt)}</td>
                </tr>
              ))}
              {(data.recentMembers || []).length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center text-gray-400">
                    Nema nedavnih članova
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upcoming expirations — full width table */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="font-semibold text-gray-900">Ističu uskoro ({expiringCount})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left">
                <th className="px-3 py-3 font-medium text-gray-500 sm:px-5">Ime</th>
                <th className="px-3 py-3 font-medium text-gray-500 hidden sm:table-cell sm:px-5">Firma</th>
                <th className="px-3 py-3 font-medium text-gray-500 sm:px-5">Datum isteka</th>
                <th className="px-3 py-3 font-medium text-gray-500 sm:px-5">Akcije</th>
              </tr>
            </thead>
            <tbody>
              {(data.upcomingExpirations || []).map((e) => (
                <tr
                  key={e.id}
                  className="border-b border-gray-50 transition hover:bg-gray-50"
                >
                  <td
                    className="px-3 py-3 font-medium text-gray-900 cursor-pointer sm:px-5"
                    onClick={() => router.push(`/members/${e.id}`)}
                  >
                    {e.user.firstName} {e.user.lastName}
                  </td>
                  <td
                    className="px-3 py-3 text-gray-600 cursor-pointer hidden sm:table-cell sm:px-5"
                    onClick={() => router.push(`/members/${e.id}`)}
                  >
                    {e.company.name}
                  </td>
                  <td
                    className="px-3 py-3 text-danger font-medium cursor-pointer sm:px-5"
                    onClick={() => router.push(`/members/${e.id}`)}
                  >
                    {formatDate(e.expiresAt)}
                  </td>
                  <td className="px-3 py-3 sm:px-5">
                    <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                      {(() => {
                        const step = offerSteps[e.id] ?? -1;
                        const sending = offerSending[e.id];

                        if (sending === 'sent') {
                          return (
                            <span className="flex items-center gap-1 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700">
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                              Poslano
                            </span>
                          );
                        }

                        if (step === -1) return <span className="text-xs text-gray-300">...</span>;

                        return (
                          <>
                            {step >= 1 && (
                              <span className="rounded-lg bg-blue-50 px-2 py-1 text-[11px] text-blue-700">
                                1. poslana
                              </span>
                            )}
                            {step >= 2 && (
                              <span className="rounded-lg bg-orange-50 px-2 py-1 text-[11px] text-orange-700">
                                2. poslana
                              </span>
                            )}
                            {step < 2 && (
                              <button
                                disabled={sending === 'sending'}
                                onClick={async () => {
                                  setOfferSending((prev) => ({ ...prev, [e.id]: 'sending' }));
                                  const res = await api.post<{ offer: { step: number } }>(`/api/os/members/${e.id}/send-offer`, {});
                                  if (res.success && res.data) {
                                    setOfferSteps((prev) => ({ ...prev, [e.id]: res.data!.offer.step }));
                                    setOfferSending((prev) => ({ ...prev, [e.id]: 'sent' }));
                                    setTimeout(() => setOfferSending((prev) => { const n = { ...prev }; delete n[e.id]; return n; }), 3000);
                                  } else {
                                    setOfferSending((prev) => ({ ...prev, [e.id]: 'error' }));
                                  }
                                }}
                                className={`rounded-lg px-3 py-1.5 text-xs font-medium text-white transition disabled:opacity-50 ${
                                  step === 0
                                    ? 'bg-green-600 hover:bg-green-700'
                                    : 'bg-orange-500 hover:bg-orange-600'
                                }`}
                              >
                                {sending === 'sending'
                                  ? 'Šaljem...'
                                  : `Pošalji ${step + 1}. obavijest + predračun`}
                              </button>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </td>
                </tr>
              ))}
              {(data.upcomingExpirations || []).length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center text-gray-400">
                    Nema isteka u sljedećih 30 dana
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
