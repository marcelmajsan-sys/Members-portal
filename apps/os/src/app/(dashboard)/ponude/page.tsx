'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Offer {
  id: string;
  offerNumber: string;
  amount: number;
  currency: string;
  status: string;
  step: number;
  validUntil: string;
  respondedAt: string | null;
  createdAt: string;
  member: {
    id: string;
    user: { firstName: string; lastName: string; email: string };
    company: { name: string };
    memberTier: string;
    memberType: string;
  };
}

const STATUS_LABELS: Record<string, string> = {
  SENT: 'Poslano',
  ACCEPTED: 'Prihvaćeno',
  DECLINED: 'Odbijeno',
  EXPIRED: 'Isteklo',
  NO_RESPONSE: 'Bez odgovora',
};

const STATUS_COLORS: Record<string, string> = {
  SENT: 'bg-blue-100 text-blue-700',
  ACCEPTED: 'bg-green-100 text-green-700',
  DECLINED: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-gray-100 text-gray-500',
  NO_RESPONSE: 'bg-yellow-100 text-yellow-700',
};

export default function PonudePage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    loadOffers();
  }, [page, statusFilter, search]);

  async function loadOffers() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('search', search);
      const res = await api.get<Offer[]>(`/api/os/offers?${params}`) as any;
      setOffers(res.data || []);
      setTotalPages(res.meta?.totalPages || 1);
    } catch {
      setOffers([]);
    }
    setLoading(false);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('hr-HR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function formatAmount(n: number) {
    return new Intl.NumberFormat('hr-HR', { style: 'currency', currency: 'EUR' }).format(n);
  }

  async function downloadPDF(offerId: string, offerNumber: string) {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/os/offers/${offerId}/pdf`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      if (!res.ok) throw new Error('Failed to download');
      const json = await res.json();
      const byteChars = atob(json.data.base64);
      const byteArray = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) byteArray[i] = byteChars.charCodeAt(i);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Predracun-${offerNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Greška pri preuzimanju PDF-a');
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Ponude / Predračuni</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Svi statusi</option>
          <option value="SENT">Poslano</option>
          <option value="ACCEPTED">Prihvaćeno</option>
          <option value="DECLINED">Odbijeno</option>
          <option value="EXPIRED">Isteklo</option>
          <option value="NO_RESPONSE">Bez odgovora</option>
        </select>

        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-0 sm:flex-initial">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Pretraži po imenu ili firmi..."
            className="border rounded-lg px-3 py-2 text-sm w-full sm:w-64"
          />
          <button type="submit" className="bg-[#1B365D] text-white px-4 py-2 rounded-lg text-sm flex-shrink-0">
            Traži
          </button>
        </form>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-gray-500">Učitavanje...</p>
      ) : offers.length === 0 ? (
        <p className="text-gray-500">Nema ponuda.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-3 px-2 hidden sm:table-cell">Broj</th>
                <th className="py-3 px-2">Član</th>
                <th className="py-3 px-2 hidden md:table-cell">Firma</th>
                <th className="py-3 px-2">Iznos</th>
                <th className="py-3 px-2 hidden lg:table-cell">Korak</th>
                <th className="py-3 px-2">Status</th>
                <th className="py-3 px-2 hidden sm:table-cell">Datum</th>
                <th className="py-3 px-2">Akcije</th>
              </tr>
            </thead>
            <tbody>
              {offers.map((offer) => (
                <tr key={offer.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-2 font-mono text-xs hidden sm:table-cell">{offer.offerNumber}</td>
                  <td className="py-3 px-2">
                    <a href={`/members/${offer.member.id}`} className="text-[#1B365D] hover:underline">
                      {offer.member.user.firstName} {offer.member.user.lastName}
                    </a>
                  </td>
                  <td className="py-3 px-2 text-gray-600 hidden md:table-cell">{offer.member.company.name}</td>
                  <td className="py-3 px-2 font-medium">{formatAmount(Number(offer.amount))}</td>
                  <td className="py-3 px-2 hidden lg:table-cell">
                    <span className={`text-xs px-2 py-1 rounded-full ${offer.step === 1 ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                      {offer.step}. obavijest
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[offer.status] || 'bg-gray-100'}`}>
                      {STATUS_LABELS[offer.status] || offer.status}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-gray-500 hidden sm:table-cell">{formatDate(offer.createdAt)}</td>
                  <td className="py-3 px-2">
                    <button
                      onClick={() => downloadPDF(offer.id, offer.offerNumber)}
                      className="text-xs text-[#1B365D] hover:underline"
                    >
                      PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 border rounded text-sm disabled:opacity-50"
          >
            Prethodna
          </button>
          <span className="px-3 py-1 text-sm text-gray-500">
            Stranica {page} od {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 border rounded text-sm disabled:opacity-50"
          >
            Sljedeća
          </button>
        </div>
      )}
    </div>
  );
}
