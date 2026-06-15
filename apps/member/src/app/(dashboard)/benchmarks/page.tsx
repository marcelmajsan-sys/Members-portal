'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';

interface BenchmarkCategory {
  id: string;
  name: string;
  slug: string;
}

interface Benchmark {
  id: string;
  metricName: string;
  value: number;
  unit: string;
  period: string;
  region: string;
  category: string;
}

interface Meta {
  page: number;
  limit: number;
  total: number;
}

export default function BenchmarksPage() {
  const [categories, setCategories] = useState<BenchmarkCategory[]>([]);
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadCategories() {
      const res = await api.get<BenchmarkCategory[]>('/api/member/benchmarks/categories');
      if (res.success && res.data) {
        setCategories(Array.isArray(res.data) ? res.data : []);
      }
    }
    loadCategories();
  }, []);

  const loadBenchmarks = useCallback(async (p: number, category: string) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: '20' });
    if (category) params.set('category', category);

    const res = await api.get<Benchmark[]>(`/api/member/benchmarks?${params}`);
    if (res.success && res.data) {
      setBenchmarks(Array.isArray(res.data) ? res.data : []);
      if (res.meta) setMeta(res.meta as Meta);
    } else {
      setError('Greška pri učitavanju benchmarkova');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadBenchmarks(page, selectedCategory);
  }, [page, selectedCategory, loadBenchmarks]);

  function handleCategoryChange(slug: string) {
    setSelectedCategory(slug);
    setPage(1);
  }

  const totalPages = meta ? Math.ceil(meta.total / meta.limit) : 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-heading font-heading">Benchmarks</h1>
        <p className="text-text-secondary mt-1">Usporedite performanse s tržišnim prosjekom</p>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleCategoryChange('')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
            selectedCategory === ''
              ? 'bg-primary text-white'
              : 'bg-white text-text-body border border-border hover:bg-bg-section'
          }`}
        >
          Sve
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleCategoryChange(cat.slug)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              selectedCategory === cat.slug
                ? 'bg-primary text-white'
                : 'bg-white text-text-body border border-border hover:bg-bg-section'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 text-error text-sm rounded-lg px-4 py-3 border border-red-200">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-text-secondary">Učitavanje...</div>
        </div>
      ) : benchmarks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border shadow-sm p-10 text-center">
          <p className="text-text-secondary">Nema dostupnih benchmarkova</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {benchmarks.map((b) => (
            <div key={b.id} className="bg-white rounded-2xl border border-border shadow-sm p-5">
              <p className="text-xs text-text-secondary uppercase tracking-wide">{b.category}</p>
              <h3 className="text-sm font-semibold text-text-heading mt-1">{b.metricName}</h3>
              <p className="text-3xl font-bold text-primary mt-2">
                {b.value}
                <span className="text-sm font-normal text-text-secondary ml-1">{b.unit}</span>
              </p>
              <div className="flex gap-3 mt-3 text-xs text-text-secondary">
                <span>Period: {b.period}</span>
                <span>Regija: {b.region}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
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
