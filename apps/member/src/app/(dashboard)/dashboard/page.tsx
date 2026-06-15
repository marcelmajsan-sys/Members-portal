'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';

interface DashboardData {
  member: {
    user?: { firstName: string; lastName: string };
    firstName?: string;
    lastName?: string;
    memberType?: string;
    memberTier?: string;
    status?: string;
    expiresAt?: string;
  };
  stats: {
    competitorsTracked: number;
    unreadNotifications: number;
    priceAlerts: number;
  };
}

interface MarketIntelItem {
  id: string;
  title: string;
  category: string;
  summary: string;
  publishedAt: string;
}

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [recentIntel, setRecentIntel] = useState<MarketIntelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      const [dashRes, intelRes] = await Promise.all([
        api.get<DashboardData>('/api/member/dashboard'),
        api.get<MarketIntelItem[]>('/api/member/market-intelligence?page=1&limit=3'),
      ]);

      if (dashRes.success && dashRes.data) {
        setDashboard(dashRes.data);
      } else {
        setError('Greška pri učitavanju podataka');
      }

      if (intelRes.success && intelRes.data) {
        setRecentIntel(Array.isArray(intelRes.data) ? intelRes.data : []);
      }

      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-text-secondary">Učitavanje...</div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="bg-red-50 text-error rounded-2xl border border-red-200 px-6 py-4">
        {error || 'Nešto je pošlo po krivu'}
      </div>
    );
  }

  const { member, stats } = dashboard;
  const firstName = member.user?.firstName ?? member.firstName ?? '';
  const memberType = member.memberTier ?? member.memberType ?? '';
  const memberStatus = member.status ?? 'ACTIVE';

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-text-heading font-heading">
          Dobrodošli, {firstName}!
        </h1>
        <p className="text-text-secondary mt-1">Pregled vašeg članstva i aktivnosti</p>
      </div>

      {/* Membership card */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
        <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wide mb-3">
          Članstvo
        </h2>
        <div className="flex flex-wrap gap-6">
          <div>
            <p className="text-xs text-text-secondary">Tip</p>
            <p className="text-sm font-medium text-text-heading">{memberType}</p>
          </div>
          <div>
            <p className="text-xs text-text-secondary">Status</p>
            <span
              className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                memberStatus === 'ACTIVE'
                  ? 'bg-green-100 text-success'
                  : 'bg-yellow-100 text-warning'
              }`}
            >
              {memberStatus === 'ACTIVE' ? 'Aktivno' : memberStatus}
            </span>
          </div>
          {member.expiresAt && (
            <div>
              <p className="text-xs text-text-secondary">Istječe</p>
              <p className="text-sm font-medium text-text-heading">
                {new Date(member.expiresAt).toLocaleDateString('hr-HR')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Praćeni konkurenti" value={stats.competitorsTracked} href="/competitors" />
        <StatCard label="Nepročitane obavijesti" value={stats.unreadNotifications} href="/notifications" />
        <StatCard label="Upozorenja cijena (7d)" value={stats.priceAlerts} href="/alerts" />
      </div>

      {/* Recent market intel */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-heading">Najnoviji Market Intel</h2>
          <Link href="/market-intelligence" className="text-sm text-primary hover:text-primary-light">
            Vidi sve
          </Link>
        </div>

        {recentIntel.length === 0 ? (
          <p className="text-sm text-text-secondary">Nema novih članaka</p>
        ) : (
          <div className="space-y-3">
            {recentIntel.map((item) => (
              <div key={item.id} className="border-b border-border last:border-0 pb-3 last:pb-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-text-heading">{item.title}</h3>
                    <p className="text-xs text-text-secondary mt-1 line-clamp-2">{item.summary}</p>
                  </div>
                  <span className="text-xs bg-bg-section text-text-secondary px-2 py-0.5 rounded-full shrink-0">
                    {item.category}
                  </span>
                </div>
                <p className="text-xs text-text-secondary mt-1">
                  {new Date(item.publishedAt).toLocaleDateString('hr-HR')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link
      href={href}
      className="bg-white rounded-2xl border border-border shadow-sm p-5 hover:border-primary/30 transition-colors"
    >
      <p className="text-xs text-text-secondary">{label}</p>
      <p className="text-3xl font-bold text-text-heading mt-1">{value}</p>
    </Link>
  );
}
