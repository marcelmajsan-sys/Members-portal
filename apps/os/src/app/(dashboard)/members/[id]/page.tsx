'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface SecondaryContact {
  id?: string;
  firstName: string | null;
  lastName: string | null;
  address: string | null;
  zip: string | null;
  city: string | null;
  country: string | null;
  oib: string | null;
  dateOfBirth: string | null;
  phone: string | null;
  email: string | null;
  note: string | null;
}

interface MemberRaw {
  id: string;
  memberNumber: string;
  memberType: string;
  memberTier: string;
  status: string;
  joinedAt: string | null;
  expiresAt: string | null;
  notes: string | null;
  hasCertificate: boolean;
  hasAcademy: boolean;
  safeShopStatus: string | null;
  magazinDobrePrice: boolean;
  promoKonferencija: boolean;
  promoMeetup: boolean;
  promoMagazin: boolean;
  promoWeb: boolean;
  promoOstalo: string | null;
  // Osobni podaci kontakt osobe (član kao fizička osoba)
  dateOfBirth: string | null;
  personalOib: string | null;
  personalAddress: string | null;
  personalZip: string | null;
  personalCity: string | null;
  personalCountry: string | null;
  personalPhone: string | null;
  user: { id: string; firstName: string; lastName: string; email: string; role: string };
  companyId: string;
  company: { name: string; oib: string; address: string; city: string; country: string; website?: string; phone?: string };
  payments: Array<{ id: string; amount: number; currency: string; status: string; createdAt: string; description: string }>;
  secondaryContact: SecondaryContact | null;
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

const TIER_PRICING: Record<string, Record<string, number | null>> = {
  WEB_TRADER: { FREE: 0, STANDARD: 300, PREMIUM: 2000 },
  SERVICE_PROVIDER: { FREE: 0, STANDARD: 400, PREMIUM: 1500 },
  PHYSICAL: { FREE: 0, STANDARD: 250, PREMIUM: null },
};

function formatDate(d: string | null) {
  if (!d) return '—';
  const date = new Date(d);
  return isNaN(date.getTime()) ? '—' : date.toLocaleDateString('hr-HR');
}

function formatCurrency(amount: number, currency = 'EUR') {
  return new Intl.NumberFormat('hr-HR', { style: 'currency', currency }).format(amount);
}

function expiryBadge(expiresAt: string | null): { text: string; style: string } | null {
  if (!expiresAt) return null;
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { text: `isteklo prije ${Math.abs(days)} dana`, style: 'bg-red-50 text-red-700' };
  if (days <= 14) return { text: `${days} dana!`, style: 'bg-red-50 text-red-700' };
  if (days <= 30) return { text: `${days} dana`, style: 'bg-orange-50 text-orange-700' };
  if (days <= 60) return { text: `${days} dana`, style: 'bg-yellow-50 text-yellow-700' };
  return { text: `${days} dana`, style: 'bg-green-50 text-green-700' };
}

function getTierPrice(memberType: string, tier: string): number | null {
  return TIER_PRICING[memberType]?.[tier] ?? null;
}

export default function MemberDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [member, setMember] = useState<MemberRaw | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [toast, setToast] = useState('');
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [renewAmount, setRenewAmount] = useState('');
  const [showTierModal, setShowTierModal] = useState(false);
  const [pendingTier, setPendingTier] = useState('');
  const [chargeDifference, setChargeDifference] = useState(true);
  const [notes, setNotes] = useState<Array<{ id: string; content: string; createdAt: string; author: { id: string; firstName: string; lastName: string } }>>([]);
  const [newNote, setNewNote] = useState('');
  const [notesLoading, setNotesLoading] = useState(false);
  const [emails, setEmails] = useState<Array<{ id: string; subject: string; body: string | null; templateName: string | null; sentAt: string; openedAt: string | null; clickedAt: string | null; status?: string | null }>>([]);
  const [previewEmail, setPreviewEmail] = useState<{ subject: string; body: string; sentAt: string } | null>(null);
  const [offerStep, setOfferStep] = useState(0);
  const [aiSummary, setAiSummary] = useState('');
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [aiSummaryOpen, setAiSummaryOpen] = useState(false);
  const [memberOffers, setMemberOffers] = useState<Array<{ id: string; offerNumber: string; amount: number; status: string; step: number; createdAt: string }>>([]);
  const [lastReminder, setLastReminder] = useState<{ lastSent: string | null; daysAgo: number | null; cooldownActive: boolean; templateName?: string } | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', companyName: '', oib: '', address: '', city: '', website: '', memberType: '', joinedAt: '', expiresAt: '',
    // Osobni podaci kontakt osobe
    dateOfBirth: '', personalOib: '', personalAddress: '', personalZip: '', personalCity: '', personalPhone: '',
    // Druga kontakt osoba
    secFirstName: '', secLastName: '', secEmail: '', secPhone: '', secDateOfBirth: '', secOib: '', secAddress: '', secZip: '', secCity: '',
  });
  const [hasSecond, setHasSecond] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  useEffect(() => {
    api.get<MemberRaw>(`/api/os/members/${id}`).then((res) => {
      if (res.success && res.data) {
        setMember(res.data);
      } else {
        setError(res.error?.message || 'Član nije pronađen');
      }
      setLoading(false);
    });
    // Fetch notes and email history
    api.get<typeof notes>(`/api/os/members/${id}/notes`).then((res) => {
      if (res.success && res.data) setNotes(res.data);
    });
    api.get<typeof emails>(`/api/os/members/${id}/emails`).then((res) => {
      if (res.success && res.data) setEmails(res.data);
    });
    api.get<typeof lastReminder>(`/api/os/members/${id}/last-reminder`).then((res) => {
      if (res.success && res.data) setLastReminder(res.data);
    });
    api.get<{ step: number }>(`/api/os/members/${id}/offer-step`).then((res) => {
      if (res.success && res.data) setOfferStep(res.data.step);
    });
    api.get<typeof memberOffers>(`/api/os/members/${id}/offers`).then((res) => {
      if (res.success && res.data) setMemberOffers(res.data);
    });
  }, [id]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  async function changeStatus(status: string) {
    setActionLoading(status);
    const res = await api.patch<MemberRaw>(`/api/os/members/${id}/status`, { status });
    if (res.success && res.data) {
      setMember(res.data);
      showToast(`Status promijenjen u: ${STATUS_LABELS[status] || status}`);
    } else {
      showToast(`Greška: ${res.error?.message || 'Neuspjelo'}`);
    }
    setActionLoading('');
  }

  function handleTierSelect(tier: string) {
    if (!member || tier === member.memberTier) return;
    setPendingTier(tier);
    const oldPrice = getTierPrice(member.memberType, member.memberTier) ?? 0;
    const newPrice = getTierPrice(member.memberType, tier) ?? 0;
    setChargeDifference(newPrice > oldPrice);
    setShowTierModal(true);
  }

  async function confirmTierChange() {
    setShowTierModal(false);
    setActionLoading('tier');
    const res = await api.patch<MemberRaw & { charged?: number }>(`/api/os/members/${id}/tier`, {
      tier: pendingTier,
      charge: chargeDifference,
    });
    if (res.success && res.data) {
      setMember(res.data);
      const chargedMsg = res.data.charged ? ` Naplaćena razlika: ${formatCurrency(res.data.charged)}.` : '';
      showToast(`Razina promijenjena u: ${TIER_LABELS[pendingTier] || pendingTier}.${chargedMsg}`);
    } else {
      showToast(`Greška: ${res.error?.message || 'Neuspjelo'}`);
    }
    setActionLoading('');
  }

  async function sendReminder() {
    setActionLoading('reminder');
    const res = await api.post(`/api/os/members/${id}/reminder`, {});
    if (res.success) {
      showToast('Podsjetnik za obnovu poslan!');
      // Refresh cooldown info and emails
      api.get<typeof lastReminder>(`/api/os/members/${id}/last-reminder`).then((r) => {
        if (r.success && r.data) setLastReminder(r.data);
      });
      api.get<typeof emails>(`/api/os/members/${id}/emails`).then((r) => {
        if (r.success && r.data) setEmails(r.data);
      });
    } else {
      showToast(`${res.error?.message || 'Neuspjelo'}`);
    }
    setActionLoading('');
  }

  async function sendInvite() {
    if (!member) return;
    setActionLoading('invite');
    const res = await api.post<{ email: string }>(`/api/os/members/${id}/send-invite`, {});
    if (res.success && res.data) {
      showToast(`Pristupni podaci poslani na ${res.data.email}`);
      api.get<typeof emails>(`/api/os/members/${id}/emails`).then((r) => {
        if (r.success && r.data) setEmails(r.data);
      });
    } else {
      showToast(`Greška: ${res.error?.message || 'Neuspjelo'}`);
    }
    setActionLoading('');
  }

  async function sendOffer() {
    setActionLoading('offer');
    const res = await api.post<{ offer: { id: string; offerNumber: string; step: number; amount: number } }>(`/api/os/members/${id}/send-offer`, {});
    if (res.success && res.data) {
      showToast(`${res.data.offer.step}. obavijest s predračunom br. ${res.data.offer.offerNumber} poslana!`);
      setOfferStep(res.data.offer.step);
      // Refresh offers list
      api.get<typeof memberOffers>(`/api/os/members/${id}/offers`).then((r) => {
        if (r.success && r.data) setMemberOffers(r.data);
      });
      api.get<typeof emails>(`/api/os/members/${id}/emails`).then((r) => {
        if (r.success && r.data) setEmails(r.data);
      });
      api.get<typeof lastReminder>(`/api/os/members/${id}/last-reminder`).then((r) => {
        if (r.success && r.data) setLastReminder(r.data);
      });
    } else {
      showToast(`Greška: ${res.error?.message || 'Neuspjelo'}`);
    }
    setActionLoading('');
  }

  async function handleDelete() {
    if (!confirm(`Jeste li sigurni da želite TRAJNO obrisati člana ${member?.user.firstName} ${member?.user.lastName}? Ova akcija se ne može poništiti.`)) return;
    if (!confirm('Ovo će obrisati sve podatke člana uključujući plaćanja, fakture i certifikate. Nastaviti?')) return;
    setActionLoading('delete');
    const res = await api.del(`/api/os/members/${id}`);
    if (res.success) {
      router.push('/members');
    } else {
      showToast(`Greška: ${res.error?.message || 'Brisanje neuspjelo'}`);
      setActionLoading('');
    }
  }

  function openRenewModal() {
    if (member) {
      if (member.memberTier === 'FREE') {
        showToast('Besplatni članovi ne mogu produžiti članstvo. Prvo promijenite razinu.');
        return;
      }
      const price = getTierPrice(member.memberType, member.memberTier);
      setRenewAmount(String(price ?? 0));
    }
    setShowRenewModal(true);
  }

  async function handleRenew() {
    setShowRenewModal(false);
    setActionLoading('renew');
    const amount = parseFloat(renewAmount) || undefined;
    const res = await api.post<MemberRaw>(`/api/os/members/${id}/renew`, { amount });
    if (res.success && res.data) {
      setMember(res.data);
      showToast('Članstvo uspješno produženo!');
    } else {
      showToast(`Greška: ${res.error?.message || 'Neuspjelo'}`);
    }
    setActionLoading('');
  }

  async function sendCustomNotification(title: string, message: string, type: string) {
    setActionLoading('notify');
    const res = await api.post(`/api/os/members/${id}/notify`, { title, message, type });
    if (res.success) {
      showToast('Obavijest poslana!');
    } else {
      showToast(`Greška: ${res.error?.message || 'Neuspjelo'}`);
    }
    setActionLoading('');
  }

  async function addNote() {
    if (!newNote.trim()) return;
    setNotesLoading(true);
    const res = await api.post<typeof notes[0]>(`/api/os/members/${id}/notes`, { content: newNote.trim() });
    if (res.success && res.data) {
      setNotes((prev) => [res.data!, ...prev]);
      setNewNote('');
    } else {
      showToast(`Greška: ${res.error?.message || 'Neuspjelo'}`);
    }
    setNotesLoading(false);
  }

  async function deleteNote(noteId: string) {
    const res = await api.del(`/api/os/members/${id}/notes/${noteId}`);
    if (res.success) {
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    }
  }

  async function fetchAiSummary() {
    if (aiSummary) { setAiSummaryOpen(true); return; }
    setAiSummaryLoading(true);
    setAiSummaryOpen(true);
    const res = await api.get<{ summary: string }>(`/api/os/members/${id}/ai-summary`);
    if (res.success && res.data) {
      setAiSummary(res.data.summary);
    } else {
      setAiSummary('AI sažetak trenutno nije dostupan.');
    }
    setAiSummaryLoading(false);
  }

  function openEditModal() {
    if (!member) return;
    const dateInput = (d: string | null | undefined) => (d ? new Date(d).toISOString().split('T')[0] : '');
    const sc = member.secondaryContact;
    setEditForm({
      firstName: member.user.firstName,
      lastName: member.user.lastName,
      email: member.user.email,
      phone: member.company.phone || '',
      companyName: member.company.name,
      oib: member.company.oib,
      address: member.company.address,
      city: member.company.city,
      website: member.company.website || '',
      memberType: member.memberType,
      joinedAt: dateInput(member.joinedAt),
      expiresAt: dateInput(member.expiresAt),
      // Osobni podaci kontakt osobe
      dateOfBirth: dateInput(member.dateOfBirth),
      personalOib: member.personalOib || '',
      personalAddress: member.personalAddress || '',
      personalZip: member.personalZip || '',
      personalCity: member.personalCity || '',
      personalPhone: member.personalPhone || '',
      // Druga kontakt osoba
      secFirstName: sc?.firstName || '',
      secLastName: sc?.lastName || '',
      secEmail: sc?.email || '',
      secPhone: sc?.phone || '',
      secDateOfBirth: dateInput(sc?.dateOfBirth),
      secOib: sc?.oib || '',
      secAddress: sc?.address || '',
      secZip: sc?.zip || '',
      secCity: sc?.city || '',
    });
    setHasSecond(!!sc);
    setEditError('');
    setShowEditModal(true);
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    setEditLoading(true);
    setEditError('');
    const res = await api.patch<MemberRaw>(`/api/os/members/${id}/profile`, {
      firstName: editForm.firstName,
      lastName: editForm.lastName,
      email: editForm.email,
      phone: editForm.phone,
      companyName: editForm.companyName,
      oib: editForm.oib,
      address: editForm.address,
      city: editForm.city,
      website: editForm.website,
      memberType: editForm.memberType,
      ...(editForm.joinedAt && { joinedAt: editForm.joinedAt }),
      ...(editForm.expiresAt && { expiresAt: editForm.expiresAt }),
      // Osobni podaci kontakt osobe
      dateOfBirth: editForm.dateOfBirth,
      personalOib: editForm.personalOib,
      personalAddress: editForm.personalAddress,
      personalZip: editForm.personalZip,
      personalCity: editForm.personalCity,
      personalPhone: editForm.personalPhone,
      // Druga kontakt osoba: objekt = upsert, null = ukloni
      secondaryContact: hasSecond
        ? {
            firstName: editForm.secFirstName,
            lastName: editForm.secLastName,
            email: editForm.secEmail,
            phone: editForm.secPhone,
            dateOfBirth: editForm.secDateOfBirth,
            oib: editForm.secOib,
            address: editForm.secAddress,
            zip: editForm.secZip,
            city: editForm.secCity,
          }
        : null,
    });
    if (res.success && res.data) {
      setMember(res.data);
      setShowEditModal(false);
      showToast('Podaci člana ažurirani');
    } else {
      setEditError(res.error?.message || 'Greška pri spremanju');
    }
    setEditLoading(false);
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-500">Učitavanje...</p>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="space-y-4">
        <button onClick={() => router.back()} className="text-sm text-primary hover:underline">
          &larr; Natrag
        </button>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-600">
          {error || 'Član nije pronađen'}
        </div>
      </div>
    );
  }

  const isExpired = member.expiresAt && new Date(member.expiresAt) < new Date();
  const expiry = expiryBadge(member.expiresAt);
  const isFree = member.memberTier === 'FREE';

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed right-4 top-4 z-50 rounded-lg bg-gray-900 px-4 py-3 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}

      {/* Renew modal */}
      {showRenewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Produži članstvo</h3>
            <p className="mt-2 text-sm text-gray-500">
              Produži članstvo za <strong>{member.user.firstName} {member.user.lastName}</strong> za 1 godinu.
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Razina: {TIER_LABELS[member.memberTier]} · Tip: {TYPE_LABELS[member.memberType]}
            </p>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">Iznos (EUR)</label>
              <input
                type="number"
                value={renewAmount}
                onChange={(e) => setRenewAmount(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowRenewModal(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Odustani
              </button>
              <button
                onClick={handleRenew}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
              >
                Produži
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tier change modal */}
      {showTierModal && member && (() => {
        const oldPrice = getTierPrice(member.memberType, member.memberTier) ?? 0;
        const newPrice = getTierPrice(member.memberType, pendingTier) ?? 0;
        const diff = newPrice - oldPrice;
        const isUpgrade = diff > 0;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900">Promjena razine članstva</h3>
              <p className="mt-2 text-sm text-gray-500">
                <strong>{member.user.firstName} {member.user.lastName}</strong>
              </p>
              <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Trenutna razina:</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TIER_STYLES[member.memberTier]}`}>
                    {TIER_LABELS[member.memberTier]} ({formatCurrency(oldPrice)}/god)
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-gray-500">Nova razina:</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TIER_STYLES[pendingTier]}`}>
                    {TIER_LABELS[pendingTier]} ({formatCurrency(newPrice)}/god)
                  </span>
                </div>
                {isUpgrade && (
                  <div className="mt-2 flex items-center justify-between border-t border-gray-200 pt-2">
                    <span className="font-medium text-gray-700">Razlika:</span>
                    <span className="font-semibold text-green-700">+{formatCurrency(diff)}</span>
                  </div>
                )}
              </div>
              {isUpgrade && (
                <label className="mt-4 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={chargeDifference}
                    onChange={(e) => setChargeDifference(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700">
                    Naplati razliku ({formatCurrency(diff)})
                  </span>
                </label>
              )}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowTierModal(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Odustani
                </button>
                <button
                  onClick={confirmTierChange}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                >
                  Potvrdi promjenu
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Edit modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Uredi podatke člana</h3>
            {editError && <p className="text-sm text-red-600 mb-3">{editError}</p>}
            <form onSubmit={handleEditSave} className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Osobni podaci</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Ime *</label>
                    <input required value={editForm.firstName} onChange={e => setEditForm(f => ({ ...f, firstName: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Prezime</label>
                    <input value={editForm.lastName} onChange={e => setEditForm(f => ({ ...f, lastName: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Email *</label>
                    <input required type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Telefon (tvrtka)</label>
                    <input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Mobitel</label>
                    <input value={editForm.personalPhone} onChange={e => setEditForm(f => ({ ...f, personalPhone: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Datum rođenja</label>
                    <input type="date" value={editForm.dateOfBirth} onChange={e => setEditForm(f => ({ ...f, dateOfBirth: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm" />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-xs text-gray-500 mb-1">OIB (osobni)</label>
                  <input value={editForm.personalOib} onChange={e => setEditForm(f => ({ ...f, personalOib: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm" />
                </div>
                <div className="mt-3">
                  <label className="block text-xs text-gray-500 mb-1">Adresa (osobna)</label>
                  <input value={editForm.personalAddress} onChange={e => setEditForm(f => ({ ...f, personalAddress: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Poštanski broj</label>
                    <input value={editForm.personalZip} onChange={e => setEditForm(f => ({ ...f, personalZip: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Grad</label>
                    <input value={editForm.personalCity} onChange={e => setEditForm(f => ({ ...f, personalCity: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm" />
                  </div>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Podaci o firmi</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Naziv firme *</label>
                    <input required value={editForm.companyName} onChange={e => setEditForm(f => ({ ...f, companyName: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">OIB</label>
                    <input value={editForm.oib} onChange={e => setEditForm(f => ({ ...f, oib: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm" />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-xs text-gray-500 mb-1">Adresa</label>
                  <input value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Grad</label>
                    <input value={editForm.city} onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Web stranica</label>
                    <input value={editForm.website} onChange={e => setEditForm(f => ({ ...f, website: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm" />
                  </div>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Članstvo</p>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Tip člana</label>
                  <select value={editForm.memberType} onChange={e => setEditForm(f => ({ ...f, memberType: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm">
                    <option value="WEB_TRADER">Web trgovac</option>
                    <option value="SERVICE_PROVIDER">Nuditelj usluga</option>
                    <option value="PHYSICAL">Fizički član</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Datum učlanjenja</label>
                    <input type="date" value={editForm.joinedAt} onChange={e => setEditForm(f => ({ ...f, joinedAt: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Datum isteka</label>
                    <input type="date" value={editForm.expiresAt} onChange={e => setEditForm(f => ({ ...f, expiresAt: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm" />
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Druga kontakt osoba</p>
                  {hasSecond ? (
                    <button type="button" onClick={() => setHasSecond(false)} className="text-xs text-red-600 hover:text-red-800">Ukloni</button>
                  ) : (
                    <button type="button" onClick={() => setHasSecond(true)} className="text-xs text-[#1B365D] hover:underline">+ Dodaj</button>
                  )}
                </div>
                {hasSecond && (
                  <div className="space-y-3 rounded-lg bg-gray-50 p-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Ime</label>
                        <input value={editForm.secFirstName} onChange={e => setEditForm(f => ({ ...f, secFirstName: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Prezime</label>
                        <input value={editForm.secLastName} onChange={e => setEditForm(f => ({ ...f, secLastName: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Email</label>
                        <input type="email" value={editForm.secEmail} onChange={e => setEditForm(f => ({ ...f, secEmail: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Mobitel</label>
                        <input value={editForm.secPhone} onChange={e => setEditForm(f => ({ ...f, secPhone: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Datum rođenja</label>
                        <input type="date" value={editForm.secDateOfBirth} onChange={e => setEditForm(f => ({ ...f, secDateOfBirth: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">OIB</label>
                        <input value={editForm.secOib} onChange={e => setEditForm(f => ({ ...f, secOib: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Adresa</label>
                      <input value={editForm.secAddress} onChange={e => setEditForm(f => ({ ...f, secAddress: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Poštanski broj</label>
                        <input value={editForm.secZip} onChange={e => setEditForm(f => ({ ...f, secZip: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Grad</label>
                        <input value={editForm.secCity} onChange={e => setEditForm(f => ({ ...f, secCity: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setShowEditModal(false)} className="rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
                  Odustani
                </button>
                <button type="submit" disabled={editLoading} className="rounded-lg bg-[#1B365D] px-4 py-2 text-sm font-medium text-white hover:bg-[#152a4a] disabled:opacity-50">
                  {editLoading ? 'Spremanje...' : 'Spremi promjene'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <button onClick={() => router.back()} className="text-sm text-primary hover:underline">
        &larr; Natrag na članove
      </button>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {member.user.firstName} {member.user.lastName}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {member.memberNumber ? `Članski broj: ${member.memberNumber}` : member.user.email}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={sendInvite}
            disabled={actionLoading === 'invite'}
            title="Aktivira pristup i šalje članu email s linkom za postavljanje lozinke (members.ecommerce.hr)"
            className="rounded-lg border border-[#1B365D] bg-white px-3 py-1.5 text-sm font-medium text-[#1B365D] transition hover:bg-[#1B365D] hover:text-white disabled:opacity-50"
          >
            {actionLoading === 'invite' ? 'Slanje...' : 'Pošalji pristup članu'}
          </button>
          <button
            onClick={openEditModal}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Uredi podatke
          </button>
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              TIER_STYLES[member.memberTier] || 'bg-gray-100 text-gray-500'
            }`}
          >
            {TIER_LABELS[member.memberTier] || member.memberTier}
          </span>
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              STATUS_STYLES[member.status] || 'bg-gray-100 text-gray-500'
            }`}
          >
            {STATUS_LABELS[member.status] || member.status}
          </span>
        </div>
      </div>

      {/* AI Summary */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <button
          onClick={fetchAiSummary}
          className="flex w-full items-center justify-between px-5 py-3 text-left"
        >
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
              </svg>
            </span>
            <span className="text-sm font-semibold text-gray-900">AI Sažetak</span>
            {aiSummaryLoading && <span className="text-xs text-gray-400">Generiranje...</span>}
          </div>
          <svg className={`h-4 w-4 text-gray-400 transition ${aiSummaryOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
        {aiSummaryOpen && (
          <div className="border-t border-gray-100 px-5 py-4">
            {aiSummaryLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-violet-300 border-t-violet-600" />
                AI analizira podatke o članu...
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-line">{aiSummary}</p>
                <button
                  onClick={() => { setAiSummary(''); fetchAiSummary(); }}
                  className="text-xs text-violet-600 hover:text-violet-800"
                >
                  Osvježi sažetak
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Member info */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Podaci o članu</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Email</dt>
              <dd className="font-medium text-gray-900">{member.user.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Mobitel</dt>
              <dd className="font-medium text-gray-900">{member.personalPhone || member.company.phone || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Datum rođenja</dt>
              <dd className="font-medium text-gray-900">{formatDate(member.dateOfBirth)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">OIB</dt>
              <dd className="font-medium text-gray-900">{member.personalOib || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Adresa</dt>
              <dd className="text-right font-medium text-gray-900">
                {[member.personalAddress, [member.personalZip, member.personalCity].filter(Boolean).join(' ')].filter(Boolean).join(', ') || '—'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Tip članstva</dt>
              <dd className="font-medium text-gray-900">{TYPE_LABELS[member.memberType] || member.memberType}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-gray-500">Razina članstva</dt>
              <dd>
                <select
                  value={member.memberTier}
                  onChange={(e) => handleTierSelect(e.target.value)}
                  disabled={actionLoading === 'tier'}
                  className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm font-medium text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                >
                  {(['FREE', 'STANDARD', 'PREMIUM'] as const).map((t) => {
                    const price = getTierPrice(member.memberType, t);
                    const disabled = price === null;
                    return (
                      <option key={t} value={t} disabled={disabled}>
                        {TIER_LABELS[t]}{price !== null && price > 0 ? ` (${formatCurrency(price)}/god)` : price === 0 ? ' (besplatno)' : ' (nedostupno)'}
                      </option>
                    );
                  })}
                </select>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Datum učlanjenja</dt>
              <dd className="font-medium text-gray-900">{formatDate(member.joinedAt)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Ističe</dt>
              <dd className="flex items-center gap-2">
                <span className={`font-medium ${isExpired ? 'text-red-600' : 'text-gray-900'}`}>
                  {formatDate(member.expiresAt)}
                </span>
                {expiry && (
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${expiry.style}`}>
                    {expiry.text}
                  </span>
                )}
              </dd>
            </div>
          </dl>
        </div>

        {/* Company info */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Podaci o firmi</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Naziv</dt>
              <dd>
                <button
                  onClick={() => router.push(`/members?companyId=${member.companyId}&companyName=${encodeURIComponent(member.company.name)}`)}
                  className="font-medium text-blue-600 hover:text-blue-800 hover:underline text-right"
                >
                  {member.company.name}
                </button>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">OIB</dt>
              <dd className="font-medium text-gray-900">{member.company.oib}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Adresa</dt>
              <dd className="text-right font-medium text-gray-900">{member.company.address}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Grad</dt>
              <dd className="font-medium text-gray-900">{member.company.city}</dd>
            </div>
            {member.company.website && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Web</dt>
                <dd className="font-medium text-blue-600">{member.company.website}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Druga kontakt osoba */}
      {member.secondaryContact && (() => {
        const sc = member.secondaryContact;
        const fullName = [sc.firstName, sc.lastName].filter(Boolean).join(' ');
        const addr = [sc.address, [sc.zip, sc.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
        return (
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Druga kontakt osoba</h2>
            <dl className="grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
              <div className="flex justify-between">
                <dt className="text-gray-500">Ime i prezime</dt>
                <dd className="font-medium text-gray-900">{fullName || '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Email</dt>
                <dd className="text-right font-medium text-gray-900">{sc.email || '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Mobitel</dt>
                <dd className="font-medium text-gray-900">{sc.phone || '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Datum rođenja</dt>
                <dd className="font-medium text-gray-900">{formatDate(sc.dateOfBirth)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">OIB</dt>
                <dd className="font-medium text-gray-900">{sc.oib || '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Adresa</dt>
                <dd className="text-right font-medium text-gray-900">{addr || '—'}</dd>
              </div>
            </dl>
          </div>
        );
      })()}

      {/* Trgovci: Safe Shop + Magazin Dobre Priče + Akademija */}
      {member.memberType === 'WEB_TRADER' && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Safe Shop & Magazin</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Safe Shop */}
            <div className={`rounded-xl border-2 p-4 transition ${member.hasCertificate ? 'border-emerald-500 bg-emerald-50/50' : 'border-gray-200 bg-gray-50'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${member.hasCertificate ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                    </svg>
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${member.hasCertificate ? 'text-emerald-800' : 'text-gray-500'}`}>Safe Shop</p>
                    <p className="text-xs text-gray-400">{member.hasCertificate ? 'Aktivan certifikat' : 'Nema certifikat'}</p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    const val = !member.hasCertificate;
                    const res = await api.patch<MemberRaw>(`/api/os/members/${id}/certificates`, { hasCertificate: val });
                    if (res.success && res.data) { setMember(res.data); showToast(val ? 'Certifikat aktiviran' : 'Certifikat deaktiviran'); }
                  }}
                  className={`relative h-6 w-11 rounded-full transition ${member.hasCertificate ? 'bg-emerald-500' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition ${member.hasCertificate ? 'translate-x-5' : ''}`} />
                </button>
              </div>
              {member.hasCertificate && (
                <div className="mt-2 border-t border-emerald-200 pt-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Branding na web shopu</label>
                  <select
                    value={member.safeShopStatus || 'NEMAJU NISTA'}
                    onChange={async (e) => {
                      const val = e.target.value;
                      const res = await api.patch<MemberRaw>(`/api/os/members/${id}/certificates`, { safeShopStatus: val });
                      if (res.success && res.data) { setMember(res.data); showToast(`Branding: ${val}`); }
                    }}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  >
                    <option value="NEMAJU NISTA">Nemaju ništa</option>
                    <option value="IMAJU LOGO">Imaju logo</option>
                    <option value="IMAJU WIDGET">Imaju widget</option>
                    <option value="IMAJU LOGO I WIDGET">Imaju logo i widget</option>
                    <option value="TRUSTED SHOP LOGO">Trusted Shop logo</option>
                  </select>
                </div>
              )}
            </div>

            {/* Magazin Dobre Priče */}
            <div className={`rounded-xl border-2 p-4 transition ${member.magazinDobrePrice ? 'border-amber-500 bg-amber-50/50' : 'border-gray-200 bg-gray-50'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${member.magazinDobrePrice ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5" />
                    </svg>
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${member.magazinDobrePrice ? 'text-amber-800' : 'text-gray-500'}`}>Magazin Dobre Priče</p>
                    <p className="text-xs text-gray-400">{member.magazinDobrePrice ? 'Uključen' : 'Nije uključen'}</p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    const val = !member.magazinDobrePrice;
                    const res = await api.patch<MemberRaw>(`/api/os/members/${id}/certificates`, { magazinDobrePrice: val });
                    if (res.success && res.data) { setMember(res.data); showToast(val ? 'Magazin aktiviran' : 'Magazin deaktiviran'); }
                  }}
                  className={`relative h-6 w-11 rounded-full transition ${member.magazinDobrePrice ? 'bg-amber-500' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition ${member.magazinDobrePrice ? 'translate-x-5' : ''}`} />
                </button>
              </div>
            </div>

            {/* Akademija */}
            <div className={`rounded-xl border-2 p-4 transition ${member.hasAcademy ? 'border-indigo-500 bg-indigo-50/50' : 'border-gray-200 bg-gray-50'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${member.hasAcademy ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
                    </svg>
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${member.hasAcademy ? 'text-indigo-800' : 'text-gray-500'}`}>Akademija</p>
                    <p className="text-xs text-gray-400">{member.hasAcademy ? 'Završena' : 'Nije završena'}</p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    const val = !member.hasAcademy;
                    const res = await api.patch<MemberRaw>(`/api/os/members/${id}/certificates`, { hasAcademy: val });
                    if (res.success && res.data) { setMember(res.data); showToast(val ? 'Akademija dodana' : 'Akademija uklonjena'); }
                  }}
                  className={`relative h-6 w-11 rounded-full transition ${member.hasAcademy ? 'bg-indigo-500' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition ${member.hasAcademy ? 'translate-x-5' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nuditelji: PROMO + Akademija */}
      {member.memberType === 'SERVICE_PROVIDER' && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Promo & Akademija</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* PROMO blok */}
            <div className="rounded-xl border-2 border-orange-300 bg-orange-50/50 p-4">
              <p className="text-sm font-semibold text-orange-800 mb-3">PROMO</p>
              <div className="space-y-2">
                {([
                  { key: 'promoKonferencija', label: 'Konferencija', value: member.promoKonferencija },
                  { key: 'promoMeetup', label: 'Meetup', value: member.promoMeetup },
                  { key: 'promoMagazin', label: 'Magazin', value: member.promoMagazin },
                  { key: 'promoWeb', label: 'Web', value: member.promoWeb },
                ] as const).map(({ key, label, value }) => (
                  <label key={key} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={async () => {
                        const res = await api.patch<MemberRaw>(`/api/os/members/${id}/certificates`, { [key]: !value });
                        if (res.success && res.data) { setMember(res.data); showToast(`${label}: ${!value ? 'Da' : 'Ne'}`); }
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    />
                    <span className="text-sm text-gray-700">{label}</span>
                  </label>
                ))}
                <div className="mt-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Ostalo</label>
                  <input
                    type="text"
                    value={member.promoOstalo || ''}
                    placeholder="Slobodan unos..."
                    onBlur={async (e) => {
                      const val = e.target.value || null;
                      if (val !== member.promoOstalo) {
                        const res = await api.patch<MemberRaw>(`/api/os/members/${id}/certificates`, { promoOstalo: val });
                        if (res.success && res.data) { setMember(res.data); showToast('Ostalo spremljeno'); }
                      }
                    }}
                    onChange={(e) => setMember(prev => prev ? { ...prev, promoOstalo: e.target.value } : prev)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
                  />
                </div>
              </div>
            </div>

            {/* Akademija */}
            <div className={`rounded-xl border-2 p-4 transition ${member.hasAcademy ? 'border-indigo-500 bg-indigo-50/50' : 'border-gray-200 bg-gray-50'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${member.hasAcademy ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
                    </svg>
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${member.hasAcademy ? 'text-indigo-800' : 'text-gray-500'}`}>Akademija</p>
                    <p className="text-xs text-gray-400">{member.hasAcademy ? 'Završena' : 'Nije završena'}</p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    const val = !member.hasAcademy;
                    const res = await api.patch<MemberRaw>(`/api/os/members/${id}/certificates`, { hasAcademy: val });
                    if (res.success && res.data) { setMember(res.data); showToast(val ? 'Akademija dodana' : 'Akademija uklonjena'); }
                  }}
                  className={`relative h-6 w-11 rounded-full transition ${member.hasAcademy ? 'bg-indigo-500' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition ${member.hasAcademy ? 'translate-x-5' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fizički: samo Akademija */}
      {member.memberType === 'PHYSICAL' && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Akademija</h2>
          <div className={`rounded-xl border-2 p-4 transition ${member.hasAcademy ? 'border-indigo-500 bg-indigo-50/50' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${member.hasAcademy ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
                  </svg>
                </div>
                <div>
                  <p className={`text-sm font-semibold ${member.hasAcademy ? 'text-indigo-800' : 'text-gray-500'}`}>Akademija</p>
                  <p className="text-xs text-gray-400">{member.hasAcademy ? 'Završena' : 'Nije završena'}</p>
                </div>
              </div>
              <button
                onClick={async () => {
                  const val = !member.hasAcademy;
                  const res = await api.patch<MemberRaw>(`/api/os/members/${id}/certificates`, { hasAcademy: val });
                  if (res.success && res.data) { setMember(res.data); showToast(val ? 'Akademija dodana' : 'Akademija uklonjena'); }
                }}
                className={`relative h-6 w-11 rounded-full transition ${member.hasAcademy ? 'bg-indigo-500' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition ${member.hasAcademy ? 'translate-x-5' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Akcije</h2>
        <div className="flex flex-wrap gap-3">
          {/* Status actions */}
          {member.status !== 'ACTIVE' && (
            <button
              onClick={() => changeStatus('ACTIVE')}
              disabled={!!actionLoading}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
            >
              {actionLoading === 'ACTIVE' ? 'Aktiviranje...' : 'Aktiviraj članstvo'}
            </button>
          )}
          {member.status !== 'SUSPENDED' && (
            <button
              onClick={() => changeStatus('SUSPENDED')}
              disabled={!!actionLoading}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              {actionLoading === 'SUSPENDED' ? 'Pauziranje...' : 'Pauziraj'}
            </button>
          )}
          {member.status !== 'EXPIRED' && (
            <button
              onClick={() => changeStatus('EXPIRED')}
              disabled={!!actionLoading}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            >
              {actionLoading === 'EXPIRED' ? '...' : 'Označi kao isteklo'}
            </button>
          )}

          <div className="mx-1 h-8 w-px bg-gray-200" />

          {/* Renew */}
          <button
            onClick={openRenewModal}
            disabled={!!actionLoading || isFree}
            title={isFree ? 'Besplatni članovi ne mogu produžiti članstvo' : undefined}
            className="rounded-lg bg-[#1B365D] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#2A4A7A] disabled:opacity-50"
          >
            {actionLoading === 'renew' ? 'Produžavanje...' : isFree ? 'Produži (nadogradi razinu)' : 'Produži članstvo'}
          </button>

          <div className="mx-1 h-8 w-px bg-gray-200" />

          {/* Cooldown indicator */}
          {lastReminder?.lastSent && (
            <span className={`flex items-center gap-1 rounded-lg px-3 py-2 text-xs ${lastReminder.cooldownActive ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-500'}`}>
              Podsjetnik poslan prije {lastReminder.daysAgo} {lastReminder.daysAgo === 1 ? 'dan' : 'dana'}
              {lastReminder.cooldownActive && ' · sljedeći za ' + (7 - (lastReminder.daysAgo ?? 0)) + 'd'}
            </span>
          )}

          {/* Structured offer flow */}
          {!isFree && (
            <>
              {offerStep === 0 && (
                <button
                  onClick={sendOffer}
                  disabled={!!actionLoading || !!lastReminder?.cooldownActive}
                  title={lastReminder?.cooldownActive ? 'Pričekajte 7 dana između slanja' : undefined}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
                >
                  {actionLoading === 'offer' ? 'Slanje...' : 'Pošalji 1. obavijest + predračun'}
                </button>
              )}
              {offerStep === 1 && (
                <>
                  <span className="flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
                    1. obavijest poslana
                  </span>
                  <button
                    onClick={sendOffer}
                    disabled={!!actionLoading || !!lastReminder?.cooldownActive}
                    title={lastReminder?.cooldownActive ? 'Pričekajte 7 dana između slanja' : undefined}
                    className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-orange-600 disabled:opacity-50"
                  >
                    {actionLoading === 'offer' ? 'Slanje...' : 'Pošalji 2. obavijest + predračun'}
                  </button>
                </>
              )}
              {offerStep >= 2 && (
                <>
                  <span className="flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
                    1. obavijest poslana
                  </span>
                  <span className="flex items-center gap-1 rounded-lg bg-orange-50 px-3 py-2 text-xs text-orange-700">
                    2. obavijest poslana
                  </span>
                </>
              )}
              {/* Check if latest offer was accepted/declined */}
              {memberOffers.length > 0 && memberOffers[0].status === 'ACCEPTED' && (
                <span className="flex items-center gap-1 rounded-lg bg-green-100 px-3 py-2 text-xs font-bold text-green-700">
                  PRIHVAĆENO
                </span>
              )}
              {memberOffers.length > 0 && memberOffers[0].status === 'DECLINED' && (
                <span className="flex items-center gap-1 rounded-lg bg-red-100 px-3 py-2 text-xs font-bold text-red-700">
                  ODBIJENO
                </span>
              )}
            </>
          )}

          {/* Legacy reminder for FREE members */}
          {isFree && (
            <button
              onClick={sendReminder}
              disabled={!!actionLoading || !!lastReminder?.cooldownActive}
              title={lastReminder?.cooldownActive ? 'Pričekajte 7 dana između slanja' : undefined}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-600 disabled:opacity-50"
            >
              {actionLoading === 'reminder' ? 'Slanje...' : 'Pošalji ponudu za nadogradnju'}
            </button>
          )}

          <button
            onClick={() => sendCustomNotification(
              'Obavijest od udruge',
              `Poštovani ${member.user.firstName}, imate novu obavijest od eCommerce Hrvatska. Provjerite svoj dashboard.`,
              'INFO'
            )}
            disabled={!!actionLoading}
            className="rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
          >
            {actionLoading === 'notify' ? 'Slanje...' : 'Pošalji obavijest'}
          </button>

          <div className="mx-1 h-8 w-px bg-gray-200" />

          <button
            onClick={handleDelete}
            disabled={!!actionLoading}
            className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50"
          >
            {actionLoading === 'delete' ? 'Brisanje...' : 'Obriši člana'}
          </button>
        </div>
      </div>

      {/* Recent payments */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="font-semibold text-gray-900">Nedavna plaćanja</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left">
                <th className="px-5 py-3 font-medium text-gray-500">Opis</th>
                <th className="px-5 py-3 font-medium text-gray-500">Iznos</th>
                <th className="px-5 py-3 font-medium text-gray-500">Status</th>
                <th className="px-5 py-3 font-medium text-gray-500">Datum</th>
              </tr>
            </thead>
            <tbody>
              {(!member.payments || member.payments.length === 0) ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-gray-400">
                    Nema plaćanja
                  </td>
                </tr>
              ) : (
                member.payments.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50">
                    <td className="px-5 py-3 text-gray-900">{p.description}</td>
                    <td className="px-5 py-3 font-medium text-gray-900">
                      {formatCurrency(p.amount, p.currency)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          p.status === 'PAID'
                            ? 'bg-green-50 text-green-700'
                            : p.status === 'PENDING'
                              ? 'bg-yellow-50 text-yellow-700'
                              : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500">{formatDate(p.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Ponude / Predračuni */}
      {memberOffers.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="font-semibold text-gray-900">Ponude / Predračuni</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left">
                  <th className="px-5 py-3 font-medium text-gray-500">Broj</th>
                  <th className="px-5 py-3 font-medium text-gray-500">Iznos</th>
                  <th className="px-5 py-3 font-medium text-gray-500">Korak</th>
                  <th className="px-5 py-3 font-medium text-gray-500">Status</th>
                  <th className="px-5 py-3 font-medium text-gray-500">Datum</th>
                  <th className="px-5 py-3 font-medium text-gray-500">PDF</th>
                </tr>
              </thead>
              <tbody>
                {memberOffers.map((o) => (
                  <tr key={o.id} className="border-b border-gray-50">
                    <td className="px-5 py-3 font-mono text-xs text-gray-900">{o.offerNumber}</td>
                    <td className="px-5 py-3 font-medium text-gray-900">{formatCurrency(Number(o.amount))}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${o.step === 1 ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                        {o.step}. obavijest
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        o.status === 'ACCEPTED' ? 'bg-green-100 text-green-700' :
                        o.status === 'DECLINED' ? 'bg-red-100 text-red-700' :
                        o.status === 'SENT' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {o.status === 'SENT' ? 'Poslano' : o.status === 'ACCEPTED' ? 'Prihvaćeno' : o.status === 'DECLINED' ? 'Odbijeno' : o.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500">{formatDate(o.createdAt)}</td>
                    <td className="px-5 py-3">
                      <button
                        onClick={async () => {
                          try {
                            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/os/offers/${o.id}/pdf`, {
                              headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
                            });
                            if (!res.ok) throw new Error();
                            const json = await res.json();
                            const byteChars = atob(json.data.base64);
                            const byteArray = new Uint8Array(byteChars.length);
                            for (let i = 0; i < byteChars.length; i++) byteArray[i] = byteChars.charCodeAt(i);
                            const blob = new Blob([byteArray], { type: 'application/pdf' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `Predracun-${o.offerNumber}.pdf`;
                            a.click();
                            URL.revokeObjectURL(url);
                          } catch {
                            showToast('Greška pri preuzimanju PDF-a');
                          }
                        }}
                        className="text-xs text-[#1B365D] hover:underline"
                      >
                        Preuzmi
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Notes & Email history side by side */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Member Notes */}
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="font-semibold text-gray-900">Bilješke</h2>
          </div>
          <div className="p-5">
            <div className="flex gap-2">
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addNote()}
                placeholder="Dodaj bilješku..."
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={addNote}
                disabled={notesLoading || !newNote.trim()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {notesLoading ? '...' : 'Dodaj'}
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {notes.length === 0 ? (
                <p className="py-4 text-center text-sm text-gray-400">Nema bilješki</p>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="group rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <p className="text-sm text-gray-800">{note.content}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-gray-400">
                        {note.author.firstName} {note.author.lastName} · {new Date(note.createdAt).toLocaleString('hr-HR')}
                      </span>
                      <button
                        onClick={() => deleteNote(note.id)}
                        className="text-xs text-red-400 opacity-0 transition hover:text-red-600 group-hover:opacity-100"
                      >
                        Obriši
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Email History */}
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="font-semibold text-gray-900">Komunikacija (poslano i primljeno)</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {emails.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-gray-400">Nema emailova</p>
            ) : (
              emails.map((e) => {
                const inbound = e.status === 'received';
                return (
                <div key={e.id} className={`px-5 py-3${inbound ? ' border-l-4 border-emerald-400 bg-emerald-50/30' : ''}${e.body ? ' cursor-pointer hover:bg-gray-50 transition-colors' : ''}`} onClick={() => e.body && setPreviewEmail({ subject: e.subject, body: e.body, sentAt: e.sentAt })}>
                  <p className="text-sm font-medium text-gray-900">{e.subject}{e.body && <span className="ml-1 text-xs text-gray-400">↗</span>}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {inbound && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        ↩ Odgovor člana
                      </span>
                    )}
                    {e.templateName && (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
                        {e.templateName === 'renewal_confirmation' ? 'Potvrda produženja' :
                         e.templateName === 'renewal_reminder' ? 'Podsjetnik za obnovu' :
                         e.templateName === 'free_upgrade' ? 'Ponuda za upgrade' :
                         e.templateName === 'custom_notification' ? 'Obavijest' :
                         e.templateName === 'offer_step_1' ? '1. obavijest + predračun' :
                         e.templateName === 'offer_step_2' ? '2. obavijest + predračun' :
                         e.templateName === 'welcome' ? 'Dobrodošlica' :
                         e.templateName === 'expired' ? 'Istek članstva' :
                         e.templateName}
                      </span>
                    )}
                    {e.openedAt && (
                      <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-600" title={`Otvoreno: ${new Date(e.openedAt).toLocaleString('hr-HR')}`}>
                        Otvoreno
                      </span>
                    )}
                    {e.clickedAt && (
                      <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-600" title={`Kliknuto: ${new Date(e.clickedAt).toLocaleString('hr-HR')}`}>
                        Kliknuto
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      {new Date(e.sentAt).toLocaleString('hr-HR')}
                    </span>
                  </div>
                </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Email Preview Modal */}
      {previewEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setPreviewEmail(null)}>
          <div className="relative mx-4 flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{previewEmail.subject}</h3>
                <p className="mt-0.5 text-xs text-gray-400">{new Date(previewEmail.sentAt).toLocaleString('hr-HR')}</p>
              </div>
              <button onClick={() => setPreviewEmail(null)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto p-1">
              <iframe
                srcDoc={previewEmail.body}
                className="h-[60vh] w-full border-0"
                sandbox="allow-same-origin"
                title="Email preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
