'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Conference {
  id: string;
  name: string;
  startDate: string;
  isActive: boolean;
}

interface Ticket {
  id: string;
  fullName: string;
  jobTitle: string | null;
  email: string;
  phone: string;
  type: 'VIP' | 'STANDARD';
  status: 'CONFIRMED' | 'PENDING' | 'CANCELLED';
  url: string;
  checkedInAt: string | null;
}

const STATUS_LABELS: Record<string, string> = { CONFIRMED: 'Potvrđena', PENDING: 'Na čekanju', CANCELLED: 'Otkazana' };
const STATUS_STYLES: Record<string, string> = {
  CONFIRMED: 'bg-emerald-50 text-emerald-700',
  PENDING: 'bg-orange-50 text-orange-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};
const TYPE_STYLES: Record<string, string> = { VIP: 'bg-amber-100 text-amber-800', STANDARD: 'bg-gray-100 text-gray-600' };

interface TicketForm {
  fullName: string;
  jobTitle: string;
  email: string;
  phone: string;
  type: 'VIP' | 'STANDARD';
  status: 'CONFIRMED' | 'PENDING';
}

const emptyForm: TicketForm = { fullName: '', jobTitle: '', email: '', phone: '', type: 'STANDARD', status: 'CONFIRMED' };

interface QuotaInfo {
  override: { STANDARD?: number; VIP?: number } | null;
  quota: { STANDARD: number; VIP: number } | null;
  usage: { STANDARD: number; VIP: number } | null;
}

// Ulaznice člana na profilu — ručno dodavanje od strane admina (bez kvote)
export default function MemberTickets({ memberId }: { memberId: string }) {
  const [conference, setConference] = useState<Conference | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<TicketForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [toast, setToast] = useState('');
  const [quotaInfo, setQuotaInfo] = useState<QuotaInfo | null>(null);
  const [showQuotaForm, setShowQuotaForm] = useState(false);
  const [quotaForm, setQuotaForm] = useState<{ STANDARD: string; VIP: string }>({ STANDARD: '', VIP: '' });
  const [quotaSaving, setQuotaSaving] = useState(false);
  const [quotaError, setQuotaError] = useState('');

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 3500); }

  const fetchQuota = useCallback(async () => {
    const res = await api.get<QuotaInfo>(`/api/os/members/${memberId}/ticket-quota`);
    if (res.success && res.data) setQuotaInfo(res.data);
  }, [memberId]);

  const fetchTickets = useCallback(async (confId: string) => {
    const res = await api.get<Ticket[]>(`/api/os/conferences/${confId}/tickets?memberId=${memberId}`);
    if (res.success && res.data) {
      setTickets(res.data);
      setLoadError(false);
    } else {
      setLoadError(true);
    }
  }, [memberId]);

  useEffect(() => {
    (async () => {
      const res = await api.get<Conference[]>('/api/os/conferences');
      if (res.success && res.data) {
        const active = res.data.find((c) => c.isActive) || res.data[0] || null;
        setConference(active);
        if (active) await Promise.all([fetchTickets(active.id), fetchQuota()]);
      } else {
        setLoadError(true);
      }
      setLoading(false);
    })();
  }, [fetchTickets, fetchQuota]);

  function openQuotaForm() {
    const o = quotaInfo?.override;
    setQuotaForm({
      STANDARD: o?.STANDARD !== undefined ? String(o.STANDARD) : '',
      VIP: o?.VIP !== undefined ? String(o.VIP) : '',
    });
    setQuotaError('');
    setShowQuotaForm(true);
  }

  async function saveQuota(e: React.FormEvent) {
    e.preventDefault();
    setQuotaSaving(true);
    setQuotaError('');
    const override: { STANDARD?: number; VIP?: number } = {};
    if (quotaForm.STANDARD.trim() !== '') override.STANDARD = Number(quotaForm.STANDARD);
    if (quotaForm.VIP.trim() !== '') override.VIP = Number(quotaForm.VIP);
    const res = await api.patch(`/api/os/members/${memberId}/ticket-quota`, {
      override: Object.keys(override).length > 0 ? override : null,
    });
    if (res.success) {
      setShowQuotaForm(false);
      showToast('Kvota ulaznica spremljena');
      await fetchQuota();
    } else {
      setQuotaError(res.error?.message || 'Spremanje nije uspjelo');
    }
    setQuotaSaving(false);
  }

  async function clearQuotaOverride() {
    if (!confirm('Ukloniti vlastitu kvotu? Član se vraća na standardnu kvotu po paketu.')) return;
    setQuotaSaving(true);
    const res = await api.patch(`/api/os/members/${memberId}/ticket-quota`, { override: null });
    if (res.success) {
      setShowQuotaForm(false);
      showToast('Vlastita kvota uklonjena');
      await fetchQuota();
    } else {
      showToast(res.error?.message || 'Greška');
    }
    setQuotaSaving(false);
  }

  async function addTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!conference) return;
    setSaving(true);
    setError('');
    const res = await api.post(`/api/os/conferences/${conference.id}/tickets`, { ...form, memberId });
    if (res.success) {
      setShowForm(false);
      setForm(emptyForm);
      showToast(form.status === 'CONFIRMED' ? 'Ulaznica dodana — email s ulaznicom poslan osobi' : 'Ulaznica dodana (na čekanju)');
      await Promise.all([fetchTickets(conference.id), fetchQuota()]);
    } else {
      setError(res.error?.message || 'Dodavanje nije uspjelo');
    }
    setSaving(false);
  }

  async function updateStatus(t: Ticket, status: Ticket['status']) {
    if (!conference || busyId) return;
    if (status === 'CANCELLED' && !confirm(`Otkazati ulaznicu za ${t.fullName}?`)) return;
    if (status === 'CONFIRMED' && !confirm(`Potvrditi ulaznicu za ${t.fullName}? Osobi će biti poslan email s ulaznicom.`)) return;
    setBusyId(t.id);
    const res = await api.put(`/api/os/conferences/${conference.id}/tickets/${t.id}`, { status });
    if (res.success) {
      showToast(status === 'CONFIRMED' ? 'Ulaznica potvrđena (email poslan)' : 'Ulaznica ažurirana');
      await Promise.all([fetchTickets(conference.id), fetchQuota()]);
    } else {
      showToast(res.error?.message || 'Greška');
    }
    setBusyId('');
  }

  if (loading) return null;

  if (loadError) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="font-semibold text-gray-900">Ulaznice</h2>
        <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">Nije moguće učitati ulaznice</p>
      </div>
    );
  }

  if (!conference) return null;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-gray-900">Ulaznice — {conference.name}</h2>
          <p className="mt-0.5 text-sm text-gray-500">Osobe za ulaznice ovog člana. Ručno dodane ulaznice ne podliježu kvoti.</p>
        </div>
        <button
          onClick={() => { setShowForm((s) => !s); setError(''); }}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-light"
        >
          {showForm ? 'Zatvori' : '+ Dodaj ulaznicu'}
        </button>
      </div>

      {quotaInfo?.quota && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
          <span className="font-medium text-gray-700">Kvota za samostalni unos (portal):</span>
          <span>STANDARD {quotaInfo.usage?.STANDARD ?? 0}/{quotaInfo.quota.STANDARD}</span>
          <span>VIP {quotaInfo.usage?.VIP ?? 0}/{quotaInfo.quota.VIP}</span>
          {quotaInfo.override && (
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">vlastita kvota</span>
          )}
          <button onClick={() => (showQuotaForm ? setShowQuotaForm(false) : openQuotaForm())} className="ml-auto text-xs font-medium text-primary hover:underline">
            {showQuotaForm ? 'Zatvori' : 'Uredi kvotu'}
          </button>
        </div>
      )}

      {showQuotaForm && (
        <form onSubmit={saveQuota} className="mt-3 space-y-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
          <p className="text-xs text-gray-500">
            Vlastita kvota ovog člana ima prednost pred kvotom konferencije i paketom. Prazno polje = bez vlastite kvote za taj tip (vrijedi standardna).
          </p>
          <div className="grid grid-cols-2 gap-3 sm:max-w-xs">
            <Field label="STANDARD">
              <input type="number" min={0} max={999} value={quotaForm.STANDARD} onChange={(e) => setQuotaForm(f => ({ ...f, STANDARD: e.target.value }))} placeholder="—" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary" />
            </Field>
            <Field label="VIP">
              <input type="number" min={0} max={999} value={quotaForm.VIP} onChange={(e) => setQuotaForm(f => ({ ...f, VIP: e.target.value }))} placeholder="—" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary" />
            </Field>
          </div>
          {quotaError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{quotaError}</p>}
          <div className="flex items-center justify-end gap-2">
            {quotaInfo?.override && (
              <button type="button" onClick={clearQuotaOverride} disabled={quotaSaving} className="mr-auto text-xs text-gray-400 hover:text-red-500 disabled:opacity-50">
                Ukloni vlastitu kvotu
              </button>
            )}
            <button type="button" onClick={() => setShowQuotaForm(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-white">Odustani</button>
            <button type="submit" disabled={quotaSaving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-light disabled:opacity-50">
              {quotaSaving ? 'Spremanje...' : 'Spremi kvotu'}
            </button>
          </div>
        </form>
      )}

      {toast && <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{toast}</p>}

      {showForm && (
        <form onSubmit={addTicket} className="mt-4 space-y-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Ime i prezime *">
              <input required value={form.fullName} onChange={(e) => setForm(f => ({ ...f, fullName: e.target.value }))} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary" />
            </Field>
            <Field label="Funkcija">
              <input value={form.jobTitle} onChange={(e) => setForm(f => ({ ...f, jobTitle: e.target.value }))} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary" placeholder="npr. Direktor" />
            </Field>
            <Field label="Email *">
              <input required type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary" />
            </Field>
            <Field label="Telefon *">
              <input required value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary" />
            </Field>
            <Field label="Tip ulaznice">
              <select value={form.type} onChange={(e) => setForm(f => ({ ...f, type: e.target.value as TicketForm['type'] }))} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary">
                <option value="STANDARD">STANDARD</option>
                <option value="VIP">VIP</option>
              </select>
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={(e) => setForm(f => ({ ...f, status: e.target.value as TicketForm['status'] }))} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary">
                <option value="CONFIRMED">Potvrđena (odmah šalje email s ulaznicom)</option>
                <option value="PENDING">Na čekanju</option>
              </select>
            </Field>
          </div>
          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-white">Odustani</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-light disabled:opacity-50">
              {saving ? 'Spremanje...' : 'Dodaj ulaznicu'}
            </button>
          </div>
        </form>
      )}

      {tickets.length === 0 ? (
        <p className="mt-4 py-4 text-center text-sm text-gray-400">Član još nema dodanih osoba za ulaznice.</p>
      ) : (
        <ul className="mt-4 divide-y divide-gray-100">
          {tickets.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">
                  {t.fullName}
                  {t.jobTitle && <span className="ml-2 font-normal text-gray-400">{t.jobTitle}</span>}
                  <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-semibold ${TYPE_STYLES[t.type]}`}>{t.type}</span>
                  <span className={`ml-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLES[t.status]}`}>{STATUS_LABELS[t.status]}</span>
                  {t.checkedInAt && <span className="ml-1.5 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">Check-in ✓</span>}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">{t.email} · {t.phone}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-sm">
                {t.status === 'CONFIRMED' && (
                  <a href={t.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Ulaznica</a>
                )}
                {t.status === 'PENDING' && (
                  <button onClick={() => updateStatus(t, 'CONFIRMED')} disabled={busyId === t.id} className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">{busyId === t.id ? '...' : 'Odobri'}</button>
                )}
                {t.status !== 'CANCELLED' ? (
                  <button onClick={() => updateStatus(t, 'CANCELLED')} disabled={busyId === t.id} className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-50">Otkaži</button>
                ) : (
                  <button onClick={() => updateStatus(t, 'CONFIRMED')} disabled={busyId === t.id} className="text-xs text-gray-400 hover:text-emerald-600 disabled:opacity-50">Vrati</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
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
