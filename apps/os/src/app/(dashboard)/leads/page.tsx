'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import LeadAddModal from '@/components/lead-add-modal';

interface LeadRaw {
  id: string;
  memberType: string;
  memberTier: string;
  leadNote: string | null;
  website: string | null;
  createdAt: string;
  user: { firstName: string; lastName: string; email: string };
  company: { name: string; phone: string | null; website: string | null } | null;
}

const TYPE_LABELS: Record<string, string> = {
  WEB_TRADER: 'Web trgovac',
  SERVICE_PROVIDER: 'Nuditelj usluga',
  PHYSICAL: 'Fizička osoba',
};
const TYPE_STYLES: Record<string, string> = {
  WEB_TRADER: 'bg-blue-50 text-blue-700',
  SERVICE_PROVIDER: 'bg-purple-50 text-purple-700',
  PHYSICAL: 'bg-gray-100 text-gray-600',
};

const CATEGORY_TABS = [
  { key: 'all', label: 'Svi' },
  { key: 'WEB_TRADER', label: 'Web trgovci' },
  { key: 'SERVICE_PROVIDER', label: 'Nuditelji usluga' },
  { key: 'PHYSICAL', label: 'Fizičke osobe' },
];

export default function LeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<LeadRaw[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState('');

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 3500); }

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const res = await api.get<LeadRaw[]>('/api/os/members?isLead=true&page=1&limit=100');
    if (res.success && res.data) {
      setLeads(res.data);
      setError('');
    } else {
      setError(res.error?.message || 'Greška pri učitavanju');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const countByType = (t: string) =>
    t === 'all' ? leads.length : leads.filter((l) => l.memberType === t).length;

  const q = search.trim().toLowerCase();
  const filtered = leads
    .filter((l) => category === 'all' || l.memberType === category)
    .filter((l) => {
      if (!q) return true;
      return [
        l.user.firstName, l.user.lastName, l.user.email,
        l.company?.name, l.website, l.company?.website, l.leadNote,
      ].some((v) => v?.toLowerCase().includes(q));
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leadovi</h1>
          <p className="mt-1 text-sm text-gray-500">Ručno dodani kontakti koji nisu članovi udruge</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="rounded-lg bg-[#1B365D] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#152a4a]"
        >
          + Dodaj kontakt
        </button>
      </div>

      {toast && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{toast}</div>}

      {/* Filteri po kategorijama */}
      <div className="flex flex-wrap items-center gap-2">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setCategory(tab.key)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              category === tab.key
                ? 'bg-[#1B365D] text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
            <span className={`ml-2 text-xs ${category === tab.key ? 'text-white/70' : 'text-gray-400'}`}>{countByType(tab.key)}</span>
          </button>
        ))}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pretraži po imenu / emailu / tvrtki..."
          className="ml-auto w-full max-w-xs rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary sm:w-64"
        />
      </div>

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-400">Učitavanje...</div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-12 text-center text-red-600">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-400">
          {leads.length === 0 ? 'Još nema leadova. Kliknite „+ Dodaj kontakt".' : 'Nema leadova za odabrane filtere.'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                <th className="px-4 py-3">Kontakt</th>
                <th className="px-4 py-3">Tvrtka</th>
                <th className="px-4 py-3">Kategorija</th>
                <th className="px-4 py-3">Napomena</th>
                <th className="px-4 py-3">Dodan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((l) => (
                <tr
                  key={l.id}
                  onClick={() => router.push(`/leads/${l.id}`)}
                  className="cursor-pointer hover:bg-gray-50/50"
                >
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">
                      {l.user.firstName} {l.user.lastName}
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">LEAD</span>
                    </p>
                    <p className="text-xs text-gray-400">{l.user.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-700">{l.company?.name || '—'}</p>
                    {(l.website || l.company?.website) && (
                      <p className="text-xs text-gray-400">{(l.website || l.company?.website || '').replace(/^https?:\/\//, '').replace(/\/+$/, '')}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_STYLES[l.memberType] || 'bg-gray-100 text-gray-600'}`}>
                      {TYPE_LABELS[l.memberType] || l.memberType}
                    </span>
                  </td>
                  <td className="max-w-xs px-4 py-3">
                    <p className="truncate text-gray-600" title={l.leadNote || ''}>{l.leadNote || '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{new Date(l.createdAt).toLocaleDateString('hr-HR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && (
        <LeadAddModal
          onClose={() => setShowAddModal(false)}
          onCreated={() => { fetchLeads(); showToast('Kontakt dodan'); }}
        />
      )}
    </div>
  );
}
