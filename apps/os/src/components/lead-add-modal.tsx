'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface CompanyOption {
  id: string;
  name: string;
  oib: string;
  website: string | null;
}

interface LeadForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  companyId: string;
  companyName: string;
  oib: string;
  website: string;
  memberType: string;
  hasCertificate: boolean;
  hasAcademy: boolean;
  promoKonferencija: boolean;
  safeShopStatus: string;
  leadNote: string;
}

const emptyForm: LeadForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  companyId: '',
  companyName: '',
  oib: '',
  website: '',
  memberType: 'WEB_TRADER',
  hasCertificate: false,
  hasAcademy: false,
  promoKonferencija: false,
  safeShopStatus: '',
  leadNote: '',
};

// Modal "Dodaj novi kontakt (lead)" — ista polja kao "Dodaj novog člana" + NAPOMENA.
// Uz `conference` prop nudi i odmah izradu ulaznice za taj kontakt (ručno dodana, bez kvote).
export default function LeadAddModal({
  conference,
  onClose,
  onCreated,
}: {
  conference?: { id: string; name: string } | null;
  onClose: () => void;
  onCreated: (result: { memberId: string; ticketCreated: boolean }) => void;
}) {
  const [form, setForm] = useState<LeadForm>(emptyForm);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [createTicket, setCreateTicket] = useState(!!conference);
  const [ticketType, setTicketType] = useState<'STANDARD' | 'VIP'>('STANDARD');
  // CONFIRMED_SILENT = potvrđena, ali se NIKOME ne šalje email (CONFIRMED + sendEmails:false)
  const [ticketStatus, setTicketStatus] = useState<'CONFIRMED' | 'CONFIRMED_SILENT' | 'PENDING'>('CONFIRMED');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<CompanyOption[]>('/api/os/companies').then((res) => {
      if (res.success && res.data) setCompanies(res.data);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (conference && createTicket && !form.phone.trim()) {
      setError('Telefon je obavezan za izradu ulaznice');
      return;
    }
    setSaving(true);
    setError('');

    const res = await api.post<{ id: string }>('/api/os/members', {
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      phone: form.phone || undefined,
      companyId: form.companyId || undefined,
      companyName: form.companyName || undefined,
      oib: form.oib || undefined,
      website: form.website || undefined,
      memberType: form.memberType,
      memberTier: 'FREE',
      hasCertificate: form.hasCertificate,
      hasAcademy: form.hasAcademy,
      promoKonferencija: form.promoKonferencija,
      safeShopStatus: form.hasCertificate ? form.safeShopStatus || 'NEMAJU NISTA' : undefined,
      isLead: true,
      leadNote: form.leadNote,
    });

    if (!res.success || !res.data) {
      setError(res.error?.message || 'Greška pri dodavanju kontakta');
      setSaving(false);
      return;
    }

    const memberId = res.data.id;
    let ticketCreated = false;

    if (conference && createTicket) {
      const tRes = await api.post(`/api/os/conferences/${conference.id}/tickets`, {
        memberId,
        fullName: `${form.firstName} ${form.lastName}`.trim(),
        email: form.email,
        phone: form.phone.trim(),
        type: ticketType,
        status: ticketStatus === 'PENDING' ? 'PENDING' : 'CONFIRMED',
        sendEmails: ticketStatus !== 'CONFIRMED_SILENT',
      });
      if (tRes.success) {
        ticketCreated = true;
      } else {
        // Kontakt je kreiran, ulaznica nije — javi i osvježi listu (ulaznica se može dodati s profila leada)
        setError(`Kontakt je dodan, ali izrada ulaznice nije uspjela: ${tRes.error?.message || 'greška'}`);
        setSaving(false);
        onCreated({ memberId, ticketCreated: false });
        return;
      }
    }

    onCreated({ memberId, ticketCreated });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        <div className="border-b border-gray-200 p-4">
          <h2 className="text-lg font-bold text-gray-900">Dodaj novi kontakt (lead)</h2>
        </div>

        <div className="flex-1 space-y-3 overflow-auto p-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-gray-500">Ime *</label>
              <input required value={form.firstName} onChange={(e) => setForm(f => ({ ...f, firstName: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Prezime</label>
              <input value={form.lastName} onChange={(e) => setForm(f => ({ ...f, lastName: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-gray-500">Email *</label>
              <input required type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Telefon{conference && createTicket ? ' *' : ''}</label>
              <input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Tvrtka</label>
            <select
              value={form.companyId}
              onChange={(e) => {
                const c = companies.find((x) => x.id === e.target.value);
                setForm(f => ({ ...f, companyId: e.target.value, companyName: c ? c.name : f.companyName, oib: c ? c.oib : f.oib }));
              }}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            >
              <option value="">— Nova tvrtka —</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name || c.oib}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-gray-500">Naziv firme</label>
              <input value={form.companyName} disabled={!!form.companyId} onChange={(e) => setForm(f => ({ ...f, companyName: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">OIB</label>
              <input value={form.oib} disabled={!!form.companyId} onChange={(e) => setForm(f => ({ ...f, oib: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">URL</label>
            <input value={form.website} onChange={(e) => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://..." className="w-full rounded-lg border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Tip (kategorija)</label>
            <select value={form.memberType} onChange={(e) => setForm(f => ({ ...f, memberType: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm">
              <option value="WEB_TRADER">Web trgovac</option>
              <option value="SERVICE_PROVIDER">Nuditelj usluga</option>
              <option value="PHYSICAL">Fizička osoba</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs text-gray-500">Oznake</label>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" checked={form.hasCertificate} onChange={(e) => setForm(f => ({ ...f, hasCertificate: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                <span className="text-sm text-gray-700">Safe Shop certifikat</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" checked={form.hasAcademy} onChange={(e) => setForm(f => ({ ...f, hasAcademy: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                <span className="text-sm text-gray-700">Akademija</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" checked={form.promoKonferencija} onChange={(e) => setForm(f => ({ ...f, promoKonferencija: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500" />
                <span className="text-sm text-gray-700">Konferencija</span>
              </label>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Napomena</label>
            <textarea
              value={form.leadNote}
              onChange={(e) => setForm(f => ({ ...f, leadNote: e.target.value }))}
              rows={3}
              placeholder="npr. upoznat na konferenciji, zainteresiran za članstvo..."
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>

          {conference && (
            <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
                <input type="checkbox" checked={createTicket} onChange={(e) => setCreateTicket(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
                Odmah izradi ulaznicu — {conference.name}
              </label>
              {createTicket && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Tip ulaznice</label>
                    <select value={ticketType} onChange={(e) => setTicketType(e.target.value as 'STANDARD' | 'VIP')} className="w-full rounded-lg border bg-white px-3 py-2 text-sm">
                      <option value="STANDARD">STANDARD</option>
                      <option value="VIP">VIP</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Status</label>
                    <select value={ticketStatus} onChange={(e) => setTicketStatus(e.target.value as 'CONFIRMED' | 'CONFIRMED_SILENT' | 'PENDING')} className="w-full rounded-lg border bg-white px-3 py-2 text-sm">
                      <option value="CONFIRMED">Potvrđena (odmah šalje email s ulaznicom)</option>
                      <option value="CONFIRMED_SILENT">Potvrđena (ne šalje email s ulaznicom)</option>
                      <option value="PENDING">Na čekanju</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 p-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Odustani</button>
          <button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-light disabled:opacity-50">
            {saving ? 'Spremanje...' : 'Dodaj kontakt'}
          </button>
        </div>
      </form>
    </div>
  );
}
