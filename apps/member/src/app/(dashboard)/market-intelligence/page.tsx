'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface MarketIntelItem {
  id: string;
  title: string;
  category: string;
  summary: string;
  publishedAt: string;
}

interface Meta {
  page: number;
  limit: number;
  total: number;
}

export default function MarketIntelligencePage() {
  const [items, setItems] = useState<MarketIntelItem[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadItems(p: number) {
    setLoading(true);
    const res = await api.get<MarketIntelItem[]>(`/api/member/market-intelligence?page=${p}&limit=10`);
    if (res.success && res.data) {
      setItems(Array.isArray(res.data) ? res.data : []);
      if (res.meta) {
        setMeta(res.meta as Meta);
      }
    } else {
      setError('Greška pri učitavanju');
    }
    setLoading(false);
  }

  useEffect(() => {
    loadItems(page);
  }, [page]);

  const totalPages = meta ? Math.ceil(meta.total / meta.limit) : 1;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-text-secondary">Učitavanje...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-error rounded-2xl border border-red-200 px-6 py-4">{error}</div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-heading font-heading">Market Intelligence</h1>
        <p className="text-text-secondary mt-1">Najnoviji uvidi i analize tržišta</p>
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border shadow-sm p-10 text-center">
          <p className="text-text-secondary">Nema dostupnih članaka</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl border border-border shadow-sm p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-text-heading">{item.title}</h3>
                  <p className="text-sm text-text-secondary mt-2 line-clamp-3">{item.summary}</p>
                  <p className="text-xs text-text-secondary mt-3">
                    {new Date(item.publishedAt).toLocaleDateString('hr-HR')}
                  </p>
                </div>
                <span className="text-xs font-medium bg-accent/10 text-accent px-2.5 py-1 rounded-full shrink-0">
                  {item.category}
                </span>
              </div>
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
            className="px-3 py-1.5 text-sm border border-border rounded-lg disabled:opacity-40 hover:bg-bg-section transition-colors cursor-pointer"
          >
            Prethodna
          </button>
          <span className="text-sm text-text-secondary px-3">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-sm border border-border rounded-lg disabled:opacity-40 hover:bg-bg-section transition-colors cursor-pointer"
          >
            Sljedeća
          </button>
        </div>
      )}
    </div>
  );
}
