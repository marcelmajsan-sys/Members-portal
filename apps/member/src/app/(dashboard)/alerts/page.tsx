'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface PriceAlert {
  id: string;
  alertType: string;
  productName: string;
  competitorName: string;
  oldPrice: number | null;
  newPrice: number | null;
  changePercent: number | null;
  memberPrice: number | null;
  isRead: boolean;
  createdAt: string;
  competitor: { name: string; website: string };
}

interface AlertSummary {
  totalChanges: number;
  drops: number;
  increases: number;
  undercuts: number;
  newProducts: number;
}

const alertTypeConfig: Record<string, { label: string; icon: string; className: string }> = {
  PRICE_DROP: { label: 'Sniženje', icon: '\u2193', className: 'bg-emerald-100 text-emerald-700' },
  PRICE_INCREASE: { label: 'Poskupljenje', icon: '\u2191', className: 'bg-red-100 text-red-700' },
  UNDERCUT: { label: 'Undercut', icon: '!', className: 'bg-yellow-100 text-yellow-700' },
  NEW_PRODUCT: { label: 'Novi proizvod', icon: '+', className: 'bg-blue-100 text-blue-700' },
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [summary, setSummary] = useState<AlertSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  async function load() {
    const filterParam = filter !== 'all' ? `&alertType=${filter}` : '';
    const [alertsRes, summaryRes] = await Promise.all([
      api.get<PriceAlert[]>(`/api/member/competitors/prices/alerts?page=${page}&limit=${limit}${filterParam}`),
      api.get<AlertSummary>('/api/member/competitors/prices/alerts/summary'),
    ]);

    if (alertsRes.success && alertsRes.data) {
      setAlerts(Array.isArray(alertsRes.data) ? alertsRes.data : []);
      setTotal((alertsRes as { pagination?: { total: number } }).pagination?.total ?? 0);
    }
    if (summaryRes.success && summaryRes.data) {
      setSummary(summaryRes.data);
    }
    setLoading(false);
  }

  useEffect(() => {
    setLoading(true);
    load();
  }, [page, filter]);

  async function markAsRead(id: string) {
    await api.patch(`/api/member/competitors/prices/alerts/${id}/read`);
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, isRead: true } : a)));
  }

  function formatPrice(price: number | null) {
    if (price === null) return '-';
    return new Intl.NumberFormat('hr-HR', { style: 'currency', currency: 'EUR' }).format(price);
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
      <div>
        <h1 className="text-2xl font-bold text-text-heading font-heading">Upozorenja cijena</h1>
        <p className="text-text-secondary mt-1">Promjene cijena kod konkurenata u zadnjih 7 dana</p>
      </div>

      {/* KPI cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <KpiCard label="Ukupno promjena" value={summary.totalChanges} className="text-text-heading" />
          <KpiCard label="Sniženja" value={summary.drops} className="text-emerald-600" />
          <KpiCard label="Poskupljenja" value={summary.increases} className="text-red-600" />
          <KpiCard label="Undercut" value={summary.undercuts} className="text-yellow-600" />
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all', label: 'Sve' },
          { key: 'PRICE_DROP', label: 'Sniženja' },
          { key: 'PRICE_INCREASE', label: 'Poskupljenja' },
          { key: 'UNDERCUT', label: 'Undercut' },
          { key: 'NEW_PRODUCT', label: 'Novi proizvodi' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => { setFilter(f.key); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              filter === f.key ? 'bg-primary text-white' : 'bg-white border border-border text-text-body hover:bg-bg-section'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Alert list */}
      {alerts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border shadow-sm p-10 text-center">
          <p className="text-text-secondary">Nema upozorenja</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((a) => {
            const config = alertTypeConfig[a.alertType] ?? alertTypeConfig.PRICE_DROP;
            return (
              <div
                key={a.id}
                onClick={() => !a.isRead && markAsRead(a.id)}
                className={`bg-white rounded-xl border shadow-sm p-4 transition-colors ${
                  a.isRead ? 'border-border' : 'border-primary/30 bg-primary/[0.02] cursor-pointer'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${config.className}`}>
                    {config.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.className}`}>
                        {config.label}
                      </span>
                      <span className="text-xs text-text-secondary">
                        {new Date(a.createdAt).toLocaleDateString('hr-HR')}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-text-heading">
                      {a.competitorName}: {a.productName}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs">
                      {a.oldPrice !== null && a.newPrice !== null && (
                        <>
                          <span className="text-text-secondary line-through">{formatPrice(a.oldPrice)}</span>
                          <span className="font-semibold text-text-heading">{formatPrice(a.newPrice)}</span>
                          {a.changePercent !== null && (
                            <span className={`font-medium px-1.5 py-0.5 rounded-full ${
                              a.changePercent < 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {a.changePercent > 0 ? '+' : ''}{a.changePercent.toFixed(1)}%
                            </span>
                          )}
                        </>
                      )}
                      {a.memberPrice !== null && (
                        <span className="text-text-secondary">
                          Ti: {formatPrice(a.memberPrice)}
                          {a.newPrice !== null && a.memberPrice > a.newPrice && (
                            <span className="text-yellow-600 font-medium ml-1">
                              ({Math.round(((a.memberPrice - a.newPrice) / a.memberPrice) * 100)}% skuplji)
                            </span>
                          )}
                        </span>
                      )}
                      {a.alertType === 'NEW_PRODUCT' && a.newPrice !== null && (
                        <span className="font-semibold text-text-heading">{formatPrice(a.newPrice)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
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
          <span className="text-sm text-text-secondary">{page} / {totalPages}</span>
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

function KpiCard({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm p-4">
      <p className="text-xs text-text-secondary">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${className}`}>{value}</p>
    </div>
  );
}
