'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface Visit {
  id: string;
  memberId: string;
  visitedAt: string;
  firstName: string;
  lastName: string;
  email: string;
  companyName: string | null;
  activatedAnalysis: boolean;
  analysisScore: number | null;
}

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr);
  return (
    d.toLocaleDateString('hr-HR') +
    ' · ' +
    d.toLocaleTimeString('hr-HR', { hour: '2-digit', minute: '2-digit' })
  );
}

export default function VisitsPage() {
  const router = useRouter();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [onlyAnalysis, setOnlyAnalysis] = useState(false);

  useEffect(() => {
    api.get<Visit[]>('/api/os/visits?limit=300').then((res) => {
      if (res.success && res.data) {
        setVisits(res.data);
      } else {
        setError(res.error?.message || 'Greška pri učitavanju');
      }
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return visits.filter((v) => {
      if (onlyAnalysis && !v.activatedAnalysis) return false;
      if (!q) return true;
      const hay = `${v.firstName} ${v.lastName} ${v.email} ${v.companyName ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [visits, query, onlyAnalysis]);

  const uniqueMembers = useMemo(() => new Set(visits.map((v) => v.memberId)).size, [visits]);
  const analysisCount = useMemo(() => visits.filter((v) => v.activatedAnalysis).length, [visits]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Posjete članova</h1>
        <p className="mt-1 text-sm text-gray-500">
          Tko se prijavio na članski portal, kada i je li tijekom posjeta pokrenuo analizu weba.
        </p>
      </div>

      {/* Sažetak */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm font-medium text-gray-500">Ukupno posjeta</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{visits.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm font-medium text-gray-500">Različitih članova</p>
          <p className="mt-2 text-3xl font-bold text-primary">{uniqueMembers}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm font-medium text-gray-500">Posjeta s analizom weba</p>
          <p className="mt-2 text-3xl font-bold text-accent-dark">{analysisCount}</p>
        </div>
      </div>

      {/* Filteri */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          placeholder="Pretraži po imenu, emailu ili firmi..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 sm:max-w-md"
        />
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={onlyAnalysis}
            onChange={(e) => setOnlyAnalysis(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30"
          />
          Samo posjete s analizom weba
        </label>
      </div>

      {/* Tablica */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left">
                <th className="px-5 py-3 font-medium text-gray-500">Član</th>
                <th className="hidden px-5 py-3 font-medium text-gray-500 sm:table-cell">Firma</th>
                <th className="px-5 py-3 font-medium text-gray-500">Vrijeme posjeta</th>
                <th className="px-5 py-3 font-medium text-gray-500">Analiza weba</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-gray-400">
                    Učitavanje...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-danger">
                    {error}
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-gray-400">
                    {visits.length === 0 ? 'Još nema zabilježenih posjeta' : 'Nema rezultata za ovaj filter'}
                  </td>
                </tr>
              ) : (
                filtered.map((v) => (
                  <tr
                    key={v.id}
                    onClick={() => router.push(`/members/${v.memberId}`)}
                    className="cursor-pointer border-b border-gray-50 transition hover:bg-gray-50"
                  >
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">
                        {v.firstName} {v.lastName}
                      </p>
                      <p className="text-xs text-gray-400">{v.email}</p>
                    </td>
                    <td className="hidden px-5 py-3 text-gray-600 sm:table-cell">
                      {v.companyName || '—'}
                    </td>
                    <td className="px-5 py-3 text-gray-500">{formatDateTime(v.visitedAt)}</td>
                    <td className="px-5 py-3">
                      {v.activatedAnalysis ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-success-light px-2.5 py-0.5 text-xs font-medium text-success">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                          Pokrenuta
                          {v.analysisScore != null && <span className="opacity-70">({v.analysisScore})</span>}
                        </span>
                      ) : (
                        <span className="inline-block rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-400">
                          Ne
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
