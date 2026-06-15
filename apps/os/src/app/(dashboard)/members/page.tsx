'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';

interface MemberRaw {
  id: string;
  memberType: string;
  memberTier: string;
  status: string;
  joinedAt: string | null;
  expiresAt: string | null;
  hasCertificate: boolean;
  hasAcademy: boolean;
  safeShopStatus: string | null;
  user: { id: string; firstName: string; lastName: string; email: string };
  company: { name: string };
  emailLogs?: Array<{ subject: string; sentAt: string }>;
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-green-50 text-green-700',
  PENDING: 'bg-gray-100 text-gray-600',
  EXPIRED: 'bg-red-50 text-red-700',
  SUSPENDED: 'bg-gray-100 text-gray-500',
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Aktivan',
  PENDING: 'Izbrisani',
  EXPIRED: 'Istekao',
  SUSPENDED: 'Pauziran',
};

const TYPE_LABELS: Record<string, string> = {
  WEB_TRADER: 'Web trgovac',
  SERVICE_PROVIDER: 'Nuditelj usluga',
  PHYSICAL: 'Fizički član',
};

const TIER_LABELS: Record<string, string> = {
  FREE: 'Besplatno',
  STANDARD: 'Standard',
  PREMIUM: 'Premium',
};

const TIER_STYLES: Record<string, string> = {
  FREE: 'bg-gray-100 text-gray-600',
  STANDARD: 'bg-blue-50 text-blue-700',
  PREMIUM: 'bg-purple-50 text-purple-700',
};

function daysUntilExpiry(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function expiryInfo(days: number | null): { text: string; style: string } | null {
  if (days === null) return null;
  if (days < 0) {
    const abs = Math.abs(days);
    return { text: `isteklo prije ${abs} ${abs === 1 ? 'dan' : 'dana'}`, style: 'text-red-600 font-medium' };
  }
  if (days === 0) return { text: 'ističe danas!', style: 'text-red-600 font-bold' };
  if (days <= 14) return { text: `${days} ${days === 1 ? 'dan' : 'dana'}`, style: 'text-red-600 font-medium' };
  if (days <= 30) return { text: `${days} dana`, style: 'text-orange-600 font-medium' };
  if (days <= 60) return { text: `${days} dana`, style: 'text-yellow-600' };
  if (days <= 365) {
    const months = Math.floor(days / 30);
    return { text: months > 0 ? `${months} mj. ${days % 30}d` : `${days} dana`, style: 'text-gray-500' };
  }
  const years = Math.floor(days / 365);
  return { text: `${years}g ${Math.floor((days % 365) / 30)}mj`, style: 'text-gray-400' };
}

export default function MembersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [members, setMembers] = useState<MemberRaw[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ email: '', firstName: '', lastName: '', companyName: '', oib: '', memberType: 'WEB_TRADER', memberTier: 'FREE', hasCertificate: false, hasAcademy: false, safeShopStatus: '' });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  const [activeFilters, setActiveFilters] = useState<Set<string>>(() => {
    const f = searchParams.get('filter');
    return f ? new Set(f.split(',')) : new Set<string>();
  });
  const [companyId, setCompanyId] = useState<string | null>(() => searchParams.get('companyId'));
  const [companyName, setCompanyName] = useState<string | null>(() => searchParams.get('companyName'));
  const [counts, setCounts] = useState<Record<string, number>>({});

  const limit = 20;


  const fetchMembers = useCallback(async (p: number, filters: Set<string>, filterCompanyId?: string | null) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: String(limit) });

    if (filterCompanyId) {
      params.set('companyId', filterCompanyId);
    }

    // Build query from active filters
    const grouped: Record<string, string[]> = {};
    for (const key of filters) {
      const def: { param: string; value: string } | undefined = ({
        active: { param: 'status', value: 'ACTIVE' },
        expired: { param: 'status', value: 'EXPIRED' },
        pending: { param: 'status', value: 'PENDING' },
        cert: { param: 'certificate', value: 'HAS_CERT' },
        no_cert: { param: 'certificate', value: 'NO_CERT' },
        academy: { param: 'certificate', value: 'HAS_ACADEMY' },
        web_trader: { param: 'type', value: 'WEB_TRADER' },
        service_provider: { param: 'type', value: 'SERVICE_PROVIDER' },
        physical: { param: 'type', value: 'PHYSICAL' },
        expiring_soon: { param: 'expiring', value: '30' },
      } as Record<string, { param: string; value: string }>)[key];
      if (def) {
        if (!grouped[def.param]) grouped[def.param] = [];
        grouped[def.param].push(def.value);
      }
    }
    for (const [param, values] of Object.entries(grouped)) {
      params.set(param, values.join(','));
    }

    const res = await api.get<MemberRaw[]>(`/api/os/members?${params}`);
    if (res.success && res.data) {
      setMembers(res.data);
      if (res.meta) {
        setTotalPages(Math.ceil(res.meta.total / res.meta.limit));
      }
    } else {
      setError(res.error?.message || 'Greška pri učitavanju');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMembers(page, activeFilters, companyId);
  }, [page, activeFilters, companyId, fetchMembers]);

  useEffect(() => {
    api.get<Record<string, number>>('/api/os/members/counts').then((res) => {
      if (res.success && res.data) setCounts(res.data);
    });
  }, []);

  function toggleFilter(filter: string) {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (filter === 'all') {
        // "Sve" clears all filters
        return new Set<string>();
      }
      if (next.has(filter)) {
        next.delete(filter);
      } else {
        next.add(filter);
      }
      return next;
    });
    setPage(1);
  }


  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    setAddLoading(true);
    setAddError('');
    const res = await api.post('/api/os/members', addForm);
    if (res.success) {
      setShowAddModal(false);
      setAddForm({ email: '', firstName: '', lastName: '', companyName: '', oib: '', memberType: 'WEB_TRADER', memberTier: 'FREE', hasCertificate: false, hasAcademy: false, safeShopStatus: '' });
      fetchMembers(page, activeFilters, companyId);
    } else {
      setAddError(res.error?.message || 'Greška pri dodavanju');
    }
    setAddLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Članovi</h1>
        <div className="flex gap-2">
        <button
          onClick={() => setShowAddModal(true)}
          className="rounded-lg bg-[#1B365D] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#152a4a]"
        >
          + Dodaj člana
        </button>
        <button
          onClick={async () => {
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
            const token = localStorage.getItem('accessToken');
            const res = await fetch(`${baseUrl}/api/os/members/export`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) return;
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `clanovi-${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          Preuzmi Excel (CSV)
        </button>
        </div>
      </div>

      {/* Company filter banner */}
      {companyId && companyName && (
        <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-4 py-2">
          <span className="text-sm text-blue-800">Članovi tvrtke: <strong>{companyName}</strong></span>
          <button
            onClick={() => { setCompanyId(null); setCompanyName(null); router.push('/members'); }}
            className="ml-auto rounded-full bg-blue-200 px-2 py-0.5 text-xs font-medium text-blue-800 hover:bg-blue-300"
          >
            ✕ Ukloni filter
          </button>
        </div>
      )}

      {/* Filter pills — multi-select */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all', label: 'Sve', count: counts.total },
          { key: 'active', label: 'Aktivni', count: counts.active },
          { key: 'expired', label: 'Istekli', count: counts.expired },
          { key: 'pending', label: 'Izbrisani', count: counts.pending },
          { key: 'cert', label: 'Certifikat', count: counts.withCert },
          { key: 'academy', label: 'Akademija', count: counts.withAcademy },
          { key: 'no_cert', label: 'Bez certifikata', count: counts.total && counts.withCert != null ? counts.total - counts.withCert : undefined },
          { key: 'expiring_soon', label: 'Ističu uskoro', count: counts.expiringSoon },
          { key: 'web_trader', label: 'Trgovac', count: counts.webTrader },
          { key: 'service_provider', label: 'Nuditelj', count: counts.serviceProvider },
          { key: 'physical', label: 'Fizička osoba', count: counts.physical },
        ].map((f) => {
          const isActive = f.key === 'all' ? activeFilters.size === 0 : activeFilters.has(f.key);
          return (
            <button
              key={f.key}
              onClick={() => toggleFilter(f.key)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                isActive
                  ? 'bg-[#1B365D] text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
              {f.count != null && (
                <span className={`ml-1.5 ${isActive ? 'text-white/70' : 'text-gray-400'}`}>
                  {f.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left">
                <th className="px-4 py-3 font-medium text-gray-500">Ime</th>
                <th className="hidden px-4 py-3 font-medium text-gray-500 md:table-cell">Firma</th>
                <th className="px-4 py-3 font-medium text-gray-500">Razina</th>
                <th className="px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="hidden px-4 py-3 font-medium text-gray-500 lg:table-cell">Certifikati</th>
                <th className="px-4 py-3 font-medium text-gray-500">Do isteka</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-right">Zadnji email</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    Učitavanje...
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    Nema članova
                  </td>
                </tr>
              ) : (
                members.map((m) => {
                  const days = daysUntilExpiry(m.expiresAt);
                  const expiry = expiryInfo(days);

                  return (
                    <tr
                      key={m.id}
                      onClick={() => router.push(`/members/${m.id}`)}
                      className="cursor-pointer border-b border-gray-50 transition hover:bg-gray-50"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">
                          {m.user.firstName} {m.user.lastName}
                        </p>
                        <p className="text-xs text-gray-400">{m.user.email}</p>
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        <p className="text-gray-700">{m.company.name}</p>
                        <p className="text-xs text-gray-400">{TYPE_LABELS[m.memberType] || m.memberType}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            TIER_STYLES[m.memberTier] || 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {TIER_LABELS[m.memberTier] || m.memberTier}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            STATUS_STYLES[m.status] || 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {STATUS_LABELS[m.status] || m.status}
                        </span>
                      </td>
                      <td className="hidden px-4 py-3 lg:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {m.hasCertificate && (
                            <span className="inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                              Certifikat
                            </span>
                          )}
                          {m.hasAcademy && (
                            <span className="inline-block rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
                              Akademija
                            </span>
                          )}
                          {m.safeShopStatus && m.safeShopStatus !== 'NEMAJU NISTA' && (
                            <span className="inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700" title={m.safeShopStatus}>
                              {m.safeShopStatus === 'IMAJU LOGO' ? 'Logo' : m.safeShopStatus === 'IMAJU WIDGET' ? 'Widget' : m.safeShopStatus === 'IMAJU LOGO I WIDGET' ? 'Logo+Widget' : m.safeShopStatus === 'TRUSTED SHOP LOGO' ? 'Trusted Shop' : m.safeShopStatus}
                            </span>
                          )}
                          {!m.hasCertificate && !m.hasAcademy && !m.safeShopStatus && (
                            <span className="text-xs text-gray-300">&mdash;</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {expiry ? (
                          <div>
                            <span className={`text-xs ${expiry.style}`}>{expiry.text}</span>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              do {new Date(m.expiresAt!).toLocaleDateString('hr-HR')}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300">&mdash;</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {m.emailLogs && m.emailLogs.length > 0 ? (
                          <div className="text-right">
                            <p className="text-xs text-gray-600 truncate max-w-[180px] ml-auto">{m.emailLogs[0].subject}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              {new Date(m.emailLogs[0].sentAt).toLocaleDateString('hr-HR')}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300">&mdash;</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3">
            <p className="text-sm text-gray-500">
              Stranica {page} od {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
              >
                Prethodna
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
              >
                Sljedeća
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Dodaj novog člana</h2>
            {addError && <p className="text-sm text-red-600 mb-3">{addError}</p>}
            <form onSubmit={handleAddMember} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Ime *</label>
                  <input required value={addForm.firstName} onChange={e => setAddForm(f => ({ ...f, firstName: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Prezime</label>
                  <input value={addForm.lastName} onChange={e => setAddForm(f => ({ ...f, lastName: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Email *</label>
                <input required type="email" value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Naziv firme *</label>
                  <input required value={addForm.companyName} onChange={e => setAddForm(f => ({ ...f, companyName: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">OIB</label>
                  <input value={addForm.oib} onChange={e => setAddForm(f => ({ ...f, oib: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Tip člana</label>
                  <select value={addForm.memberType} onChange={e => setAddForm(f => ({ ...f, memberType: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm">
                    <option value="WEB_TRADER">Web trgovac</option>
                    <option value="SERVICE_PROVIDER">Nuditelj usluga</option>
                    <option value="PHYSICAL">Fizički član</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Razina</label>
                  <select value={addForm.memberTier} onChange={e => setAddForm(f => ({ ...f, memberTier: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm">
                    <option value="FREE">Besplatno</option>
                    <option value="STANDARD">Standard</option>
                    <option value="PREMIUM">Premium</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-2">Safe Shop & Akademija</label>
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={addForm.hasCertificate} onChange={e => setAddForm(f => ({ ...f, hasCertificate: e.target.checked, safeShopStatus: e.target.checked ? (f.safeShopStatus || 'NEMAJU NISTA') : '' }))} className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                      <span className="text-sm text-gray-700">Safe Shop certifikat</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={addForm.hasAcademy} onChange={e => setAddForm(f => ({ ...f, hasAcademy: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                      <span className="text-sm text-gray-700">Akademija</span>
                    </label>
                  </div>
                  {addForm.hasCertificate && (
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Branding na web shopu</label>
                      <select value={addForm.safeShopStatus} onChange={e => setAddForm(f => ({ ...f, safeShopStatus: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm">
                        <option value="NEMAJU NISTA">Nemaju ništa</option>
                        <option value="IMAJU LOGO">Imaju logo</option>
                        <option value="IMAJU WIDGET">Imaju widget</option>
                        <option value="IMAJU LOGO I WIDGET">Imaju logo i widget</option>
                        <option value="TRUSTED SHOP LOGO">Trusted Shop logo</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setShowAddModal(false); setAddError(''); }} className="rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
                  Odustani
                </button>
                <button type="submit" disabled={addLoading} className="rounded-lg bg-[#1B365D] px-4 py-2 text-sm font-medium text-white hover:bg-[#152a4a] disabled:opacity-50">
                  {addLoading ? 'Spremanje...' : 'Dodaj'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
