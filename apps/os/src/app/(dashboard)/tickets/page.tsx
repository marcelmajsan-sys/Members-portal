'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Conference {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  location: string | null;
  isActive: boolean;
  editDeadline: string | null;
  extraDiscount: number;
  ticketQuotas: Record<string, Record<string, number>> | null;
  ticketCounts: { total: number; confirmed: number; pending: number; checkedIn: number };
}

interface Ticket {
  id: string;
  fullName: string;
  jobTitle: string | null;
  email: string;
  phone: string;
  type: 'VIP' | 'STANDARD';
  status: 'CONFIRMED' | 'PENDING' | 'CANCELLED';
  token: string;
  url: string;
  checkedInAt: string | null;
  createdAt: string;
  member: {
    id: string;
    company: { name: string } | null;
    user: { firstName: string; lastName: string; email: string };
  };
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const STATUS_LABELS: Record<string, string> = { CONFIRMED: 'Potvrđena', PENDING: 'Na čekanju', CANCELLED: 'Otkazana' };
const STATUS_STYLES: Record<string, string> = {
  CONFIRMED: 'bg-emerald-50 text-emerald-700',
  PENDING: 'bg-orange-50 text-orange-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};
const TYPE_STYLES: Record<string, string> = { VIP: 'bg-amber-100 text-amber-800', STANDARD: 'bg-gray-100 text-gray-600' };
const TIERS = ['FREE', 'STANDARD', 'PREMIUM'] as const;
const TIER_LABELS: Record<string, string> = { FREE: 'Free', STANDARD: 'Standard', PREMIUM: 'Premium' };

// Zadane kvote: standardni članovi 1 STANDARD, premium članovi 3 VIP
const DEFAULT_QUOTAS: Record<string, Record<string, number>> = {
  STANDARD: { FREE: 0, STANDARD: 1, PREMIUM: 0 },
  VIP: { FREE: 0, STANDARD: 0, PREMIUM: 3 },
};

function fmtDate(d: string | null) {
  if (!d) return '—';
  const date = new Date(d);
  return isNaN(date.getTime()) ? '—' : date.toLocaleDateString('hr-HR');
}
function fmtDateTime(d: string | null) {
  if (!d) return '—';
  const date = new Date(d);
  return isNaN(date.getTime()) ? '—' : date.toLocaleString('hr-HR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function TicketsPage() {
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [toast, setToast] = useState('');

  // Filteri: Set<string> obrazac, backend prima comma-separated
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  const [showSettings, setShowSettings] = useState(false);

  const selected = conferences.find((c) => c.id === selectedId) || null;

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 3500); }

  const fetchConferences = useCallback(async () => {
    const res = await api.get<Conference[]>('/api/os/conferences');
    if (res.success && res.data) {
      setConferences(res.data);
      setSelectedId((prev) => prev || res.data!.find((c) => c.isActive)?.id || res.data![0]?.id || '');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchConferences(); }, [fetchConferences]);

  const fetchTickets = useCallback(async () => {
    if (!selectedId) return;
    setLoadingTickets(true);
    const params = new URLSearchParams();
    if (statusFilter.size > 0) params.set('status', [...statusFilter].join(','));
    if (typeFilter.size > 0) params.set('type', [...typeFilter].join(','));
    if (search.trim()) params.set('q', search.trim());
    const qs = params.toString();
    const res = await api.get<Ticket[]>(`/api/os/conferences/${selectedId}/tickets${qs ? `?${qs}` : ''}`);
    if (res.success && res.data) setTickets(res.data);
    setLoadingTickets(false);
  }, [selectedId, statusFilter, typeFilter, search]);

  useEffect(() => {
    const t = setTimeout(fetchTickets, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [fetchTickets, search]);

  function toggleFilter(set: Set<string>, setter: (s: Set<string>) => void, value: string) {
    const n = new Set(set);
    if (n.has(value)) n.delete(value);
    else n.add(value);
    setter(n);
  }

  async function updateTicket(t: Ticket, data: Partial<Pick<Ticket, 'status' | 'type'>>) {
    const res = await api.put(`/api/os/conferences/${selectedId}/tickets/${t.id}`, data);
    if (res.success) {
      showToast(data.status === 'CONFIRMED' ? `Ulaznica potvrđena — ${t.fullName} (email poslan)` : 'Ulaznica ažurirana');
      fetchTickets(); fetchConferences();
    } else {
      showToast(res.error?.message || 'Greška');
    }
  }

  async function exportXlsx() {
    if (!selectedId) return;
    const token = localStorage.getItem('accessToken');
    const res = await fetch(`${BASE_URL}/api/os/conferences/${selectedId}/tickets/export`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) { showToast('Export nije uspio'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ulaznice-${selected?.name?.toLowerCase().replace(/\s+/g, '-') || 'export'}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-400">Učitavanje...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ulaznice</h1>
          <p className="mt-1 text-sm text-gray-500">Osobe za ulaznice koje su članovi prijavili za konferenciju</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {conferences.length > 1 && (
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
            >
              {conferences.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.isActive ? '' : ' (neaktivna)'}</option>
              ))}
            </select>
          )}
          {selected && (
            <>
              <button onClick={() => setShowSettings(true)} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50">
                ⚙ Postavke
              </button>
              <button onClick={exportXlsx} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50">
                ⬇ Excel export
              </button>
            </>
          )}
          <button
            onClick={() => setShowSettings(true)}
            className={selected ? 'hidden' : 'rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-dark'}
          >
            + Nova konferencija
          </button>
        </div>
      </div>

      {toast && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{toast}</div>}

      {!selected ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-400">
          Nema konferencije. Kliknite „+ Nova konferencija" i postavite kvote ulaznica.
        </div>
      ) : (
        <>
          {/* Stat kartice — live brojka check-ina */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Ukupno prijava" value={selected.ticketCounts.total} />
            <StatCard label="Potvrđenih" value={selected.ticketCounts.confirmed} />
            <StatCard label="Na čekanju" value={selected.ticketCounts.pending} accent={selected.ticketCounts.pending > 0} />
            <StatCard label="Check-in" value={selected.ticketCounts.checkedIn} />
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{selected.name}</span>
            {' '}· {fmtDate(selected.startDate)}{selected.location ? ` · ${selected.location}` : ''}
            {' '}· rok za izmjene: <strong>{fmtDate(selected.editDeadline)}</strong>
            {' '}· popust za dodatne: <strong>{selected.extraDiscount}%</strong>
          </div>

          {/* Filteri */}
          <div className="flex flex-wrap items-center gap-2">
            {(['CONFIRMED', 'PENDING', 'CANCELLED'] as const).map((s) => (
              <button
                key={s}
                onClick={() => toggleFilter(statusFilter, setStatusFilter, s)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${statusFilter.has(s) ? 'border-primary bg-primary text-white' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
            <span className="mx-1 text-gray-200">|</span>
            {(['VIP', 'STANDARD'] as const).map((t) => (
              <button
                key={t}
                onClick={() => toggleFilter(typeFilter, setTypeFilter, t)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${typeFilter.has(t) ? 'border-primary bg-primary text-white' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                {t}
              </button>
            ))}
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pretraži po imenu / emailu / tvrtki..."
              className="ml-auto w-full max-w-xs rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary sm:w-64"
            />
          </div>

          {/* Tablica */}
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            {loadingTickets ? (
              <div className="p-12 text-center text-gray-400">Učitavanje ulaznica...</div>
            ) : tickets.length === 0 ? (
              <div className="p-12 text-center text-gray-400">Nema prijava za odabrane filtere.</div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                    <th className="px-4 py-3">Osoba</th>
                    <th className="px-4 py-3">Član (dodao)</th>
                    <th className="px-4 py-3">Kontakt</th>
                    <th className="px-4 py-3">Tip</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Check-in</th>
                    <th className="px-4 py-3 text-right">Akcije</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {tickets.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">{t.fullName}</p>
                        {t.jobTitle && <p className="text-xs text-gray-400">{t.jobTitle}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-700">{t.member.user.firstName} {t.member.user.lastName}</p>
                        {t.member.company?.name && <p className="text-xs text-gray-400">{t.member.company.name}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-700">{t.email}</p>
                        <p className="text-xs text-gray-400">{t.phone}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TYPE_STYLES[t.type]}`}>{t.type}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[t.status]}`}>{STATUS_LABELS[t.status]}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{fmtDateTime(t.checkedInAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                          {t.status === 'PENDING' && (
                            <button
                              onClick={() => updateTicket(t, { status: 'CONFIRMED' })}
                              className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-emerald-700"
                              title="Potvrdi ulaznicu (šalje email osobi i članu)"
                            >
                              Odobri
                            </button>
                          )}
                          {t.status === 'CONFIRMED' && (
                            <a href={t.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">Ulaznica</a>
                          )}
                          {t.status !== 'CANCELLED' && (
                            <button
                              onClick={() => { if (confirm(`Otkazati ulaznicu za ${t.fullName}?`)) updateTicket(t, { status: 'CANCELLED' }); }}
                              className="text-xs text-gray-400 hover:text-red-500"
                            >
                              Otkaži
                            </button>
                          )}
                          {t.status === 'CANCELLED' && (
                            <button onClick={() => updateTicket(t, { status: 'CONFIRMED' })} className="text-xs text-gray-400 hover:text-emerald-600">
                              Vrati
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {showSettings && (
        <ConferenceSettingsModal
          conference={selected}
          onClose={() => setShowSettings(false)}
          onSaved={() => { setShowSettings(false); fetchConferences(); showToast(selected ? 'Postavke spremljene' : 'Konferencija kreirana'); }}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`rounded-xl border bg-white p-4 ${accent ? 'border-orange-200' : 'border-gray-200'}`}>
      <p className={`text-2xl font-bold ${accent ? 'text-orange-600' : 'text-gray-900'}`}>{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}

function dateInput(s: string | null | undefined) {
  return s ? s.slice(0, 10) : '';
}

function ConferenceSettingsModal({
  conference,
  onClose,
  onSaved,
}: {
  conference: Conference | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: conference?.name || 'CRO Commerce 2026',
    location: conference?.location || '',
    startDate: dateInput(conference?.startDate),
    endDate: dateInput(conference?.endDate),
    editDeadline: dateInput(conference?.editDeadline),
    extraDiscount: conference?.extraDiscount ?? 30,
    isActive: conference?.isActive ?? true,
  });
  const [quotas, setQuotas] = useState<Record<string, Record<string, number>>>(() => {
    const q = conference?.ticketQuotas;
    return {
      STANDARD: { ...DEFAULT_QUOTAS.STANDARD, ...(q?.STANDARD || {}) },
      VIP: { ...DEFAULT_QUOTAS.VIP, ...(q?.VIP || {}) },
    };
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function setQuota(type: string, tier: string, value: string) {
    const n = Math.max(0, parseInt(value, 10) || 0);
    setQuotas((prev) => ({ ...prev, [type]: { ...prev[type], [tier]: n } }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const body = {
      name: form.name,
      location: form.location || null,
      startDate: form.startDate,
      endDate: form.endDate || form.startDate,
      editDeadline: form.editDeadline || null,
      extraDiscount: Number(form.extraDiscount),
      isActive: form.isActive,
      ticketQuotas: quotas,
    };
    const res = conference
      ? await api.put(`/api/os/conferences/${conference.id}`, body)
      : await api.post('/api/os/conferences', body);
    if (res.success) onSaved();
    else { setError(res.error?.message || 'Spremanje nije uspjelo'); setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form
        onSubmit={save}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        <div className="border-b border-gray-200 p-4">
          <h2 className="text-lg font-bold text-gray-900">{conference ? 'Postavke konferencije' : 'Nova konferencija'}</h2>
        </div>

        <div className="flex-1 space-y-4 overflow-auto p-5">
          <Field label="Naziv *">
            <input required value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Početak *">
              <input required type="date" value={form.startDate} onChange={(e) => setForm(f => ({ ...f, startDate: e.target.value }))} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary" />
            </Field>
            <Field label="Kraj">
              <input type="date" value={form.endDate} onChange={(e) => setForm(f => ({ ...f, endDate: e.target.value }))} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary" />
            </Field>
          </div>
          <Field label="Lokacija">
            <input value={form.location} onChange={(e) => setForm(f => ({ ...f, location: e.target.value }))} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary" placeholder="npr. Zagreb" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Rok za izmjene osoba">
              <input type="date" value={form.editDeadline} onChange={(e) => setForm(f => ({ ...f, editDeadline: e.target.value }))} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary" />
            </Field>
            <Field label="Popust za dodatne ulaznice (%)">
              <input type="number" min={0} max={100} value={form.extraDiscount} onChange={(e) => setForm(f => ({ ...f, extraDiscount: Number(e.target.value) }))} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary" />
            </Field>
          </div>

          <Field label="Kvote ulaznica po paketu članstva">
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-500">
                    <th className="px-3 py-2 text-left font-medium">Paket člana</th>
                    <th className="px-3 py-2 text-center font-medium">STANDARD ulaznice</th>
                    <th className="px-3 py-2 text-center font-medium">VIP ulaznice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {TIERS.map((tier) => (
                    <tr key={tier}>
                      <td className="px-3 py-2 font-medium text-gray-700">{TIER_LABELS[tier]}</td>
                      {(['STANDARD', 'VIP'] as const).map((type) => (
                        <td key={type} className="px-3 py-2 text-center">
                          <input
                            type="number"
                            min={0}
                            value={quotas[type]?.[tier] ?? 0}
                            onChange={(e) => setQuota(type, tier, e.target.value)}
                            className="w-16 rounded-md border border-gray-200 px-2 py-1 text-center text-sm outline-none focus:border-primary"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-1 text-xs text-gray-400">Broj ulaznica uključenih u paket. Sve preko toga ide „na čekanje" uz ponudu s popustom.</p>
          </Field>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm(f => ({ ...f, isActive: e.target.checked }))} />
            Aktivna (vidljiva članovima na portalu)
          </label>

          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 p-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Odustani</button>
          <button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-light disabled:opacity-50">
            {saving ? 'Spremanje...' : 'Spremi'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-gray-500">{label}</label>
      {children}
    </div>
  );
}
