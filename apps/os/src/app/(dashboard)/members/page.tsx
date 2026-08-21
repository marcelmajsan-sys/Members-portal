'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';

interface MemberRaw {
  id: string;
  memberType: string;
  memberTier: string;
  status: string;
  website?: string | null;
  joinedAt: string | null;
  expiresAt: string | null;
  hasCertificate: boolean;
  hasAcademy: boolean;
  safeShopStatus: string | null;
  automationsPaused?: boolean;
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
  PENDING: 'Izbrisan',
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

const MONTH_LABELS: Record<string, string> = {
  '01': 'Siječanj', '02': 'Veljača', '03': 'Ožujak', '04': 'Travanj',
  '05': 'Svibanj', '06': 'Lipanj', '07': 'Srpanj', '08': 'Kolovoz',
  '09': 'Rujan', '10': 'Listopad', '11': 'Studeni', '12': 'Prosinac',
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

// Brojevi stranica za prikaz: uvijek prva i zadnja, ± prozor oko trenutne, '…' za praznine
function getPageNumbers(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '…')[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push('…');
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < total - 1) pages.push('…');
  pages.push(total);
  return pages;
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
  const emptyAddForm = { email: '', firstName: '', lastName: '', companyId: '', companyName: '', oib: '', website: '', memberType: 'WEB_TRADER', memberTier: 'FREE', hasCertificate: false, hasAcademy: false, promoKonferencija: false, safeShopStatus: '' };
  const [addForm, setAddForm] = useState(emptyAddForm);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [companies, setCompanies] = useState<{ id: string; name: string; oib: string; website: string | null }[]>([]);
  // Postojeći profili (članstva) odabrane tvrtke — prikaz u modalu da se vidi tko je već vezan
  const [companyMembers, setCompanyMembers] = useState<MemberRaw[]>([]);
  const [companyMembersLoading, setCompanyMembersLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  // Multi-select za skupno uključivanje/isključivanje automatizacija
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  // Filteri: glavni tab (tip) + podfilteri (status / certifikat / promo) koji ovise o tipu.
  const legacyFilter = searchParams.get('filter'); // dashboard kartice linkaju ?filter=active itd.
  const [type, setType] = useState<string>(() => searchParams.get('type') || 'all');
  const [status, setStatus] = useState<string>(() => {
    if (legacyFilter === 'active') return 'ACTIVE';
    if (legacyFilter === 'expired') return 'EXPIRED';
    if (legacyFilter === 'pending') return 'PENDING';
    return searchParams.get('status') || '';
  });
  const [extra, setExtra] = useState<string>('');
  const [tier, setTier] = useState<string>(() => searchParams.get('tier') || ''); // '' | FREE | STANDARD | PREMIUM
  const [autoPaused, setAutoPaused] = useState<boolean>(false); // samo članovi s isključenim automatizacijama
  const [expiring, setExpiring] = useState<boolean>(() => legacyFilter === 'expiring_soon');
  const [expiryMonth, setExpiryMonth] = useState<string>(() => searchParams.get('expiryMonth') || '');
  const [companyId, setCompanyId] = useState<string | null>(() => searchParams.get('companyId'));
  const [companyName, setCompanyName] = useState<string | null>(() => searchParams.get('companyName'));
  const [counts, setCounts] = useState<Record<string, number>>({});

  const limit = 20;

  // Glavni tabovi (tip člana) s brojkama
  const TYPE_TABS: { key: string; label: string; countKey: string }[] = [
    { key: 'all', label: 'Svi članovi', countKey: 'total' },
    { key: 'WEB_TRADER', label: 'Trgovci', countKey: 'webTrader' },
    { key: 'SERVICE_PROVIDER', label: 'Nuditelji', countKey: 'serviceProvider' },
    { key: 'PHYSICAL', label: 'Fizičke osobe', countKey: 'physical' },
  ];

  // Podfilteri za odabrani tip (status + tip-specifični: certifikat / promo)
  type SubFilter = { key: string; label: string; group: 'status' | 'extra'; value: string; count?: number };
  const subFilters = useMemo<SubFilter[]>(() => {
    const c = counts;
    const statusPills = (pfx: string): SubFilter[] => [
      { key: 's-active', label: 'Aktivni', group: 'status', value: 'ACTIVE', count: c[`${pfx}Active`] },
      { key: 's-expired', label: 'Istekli', group: 'status', value: 'EXPIRED', count: c[`${pfx}Expired`] },
      { key: 's-suspended', label: 'Pauzirani', group: 'status', value: 'SUSPENDED', count: c[`${pfx}Suspended`] },
      { key: 's-pending', label: 'Izbrisani', group: 'status', value: 'PENDING', count: c[`${pfx}Pending`] },
    ];
    const certPills = (pfx: string): SubFilter[] => [
      { key: 'e-cert', label: 'Certificirani', group: 'extra', value: 'cert', count: c[`${pfx}Certified`] },
      { key: 'e-acad', label: 'Akademija', group: 'extra', value: 'academy', count: c[`${pfx}Academy`] },
    ];
    if (type === 'all') return [...statusPills('all'), ...certPills('all')];
    if (type === 'WEB_TRADER') return [
      ...statusPills('wt'),
      ...certPills('wt'),
      { key: 'e-nocert', label: 'Necertificirani', group: 'extra', value: 'no_cert', count: c.wtNoCert },
      { key: 'e-mag-yes', label: 'Magazin objavljeno', group: 'extra', value: 'magazin_yes', count: c.wtMagazinPublished },
      { key: 'e-mag-no', label: 'Magazin neobjavljeno', group: 'extra', value: 'magazin_no', count: c.wtMagazinUnpublished },
    ];
    if (type === 'SERVICE_PROVIDER') return [
      ...statusPills('sp'),
      ...certPills('sp'),
      { key: 'e-konf', label: 'Konferencija promo', group: 'extra', value: 'promoKonferencija', count: c.spPromoKonferencija },
      { key: 'e-meet', label: 'Meetup promo', group: 'extra', value: 'promoMeetup', count: c.spPromoMeetup },
      { key: 'e-mag', label: 'Magazin promo', group: 'extra', value: 'promoMagazin', count: c.spPromoMagazin },
      { key: 'e-web', label: 'Web promo', group: 'extra', value: 'promoWeb', count: c.spPromoWeb },
      { key: 'e-ost', label: 'Ostalo promo', group: 'extra', value: 'promoOstalo', count: c.spPromoOstalo },
    ];
    if (type === 'PHYSICAL') return [...statusPills('ph'), ...certPills('ph')];
    return [];
  }, [type, counts]);


  // Mjeseci isteka (tekući + 5 idućih) — kao "Obnove" na dashboardu
  const monthOptions = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setDate(1); // prije setMonth — inače 29./30./31. u mjesecu preskače/duplicira mjesece
    d.setMonth(d.getMonth() + i);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return { value, label: MONTH_LABELS[String(d.getMonth() + 1).padStart(2, '0')] };
  }), []);

  const fetchRequestId = useRef(0);

  const fetchMembers = useCallback(async (
    p: number, t: string, st: string, ex: string, exp: boolean, em: string, filterCompanyId?: string | null,
    tr?: string, ap?: boolean,
  ) => {
    const reqId = ++fetchRequestId.current;
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ page: String(p), limit: String(limit) });

    if (filterCompanyId) params.set('companyId', filterCompanyId);
    if (t && t !== 'all') params.set('type', t);
    if (st) params.set('status', st);
    if (tr) params.set('tier', tr);
    if (ap) params.set('automationsPaused', 'true');
    if (exp) params.set('expiring', '30');
    if (em) params.set('expiryMonth', em);
    if (ex === 'cert') params.set('hasCertificate', 'true');
    else if (ex === 'no_cert') params.set('hasCertificate', 'false');
    else if (ex === 'academy') params.set('certificate', 'HAS_ACADEMY');
    else if (ex === 'magazin_yes') params.set('magazinDobrePrice', 'true');
    else if (ex === 'magazin_no') params.set('magazinDobrePrice', 'false');
    else if (ex) params.set(ex, 'true'); // promo* zastavice

    const res = await api.get<MemberRaw[]>(`/api/os/members?${params}`);
    if (reqId !== fetchRequestId.current) return; // stigao odgovor za stariji zahtjev — ignoriraj
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

  const refreshCounts = useCallback(() => {
    api.get<Record<string, number>>('/api/os/members/counts').then((res) => {
      if (res.success && res.data) setCounts(res.data);
    });
  }, []);

  useEffect(() => {
    fetchMembers(page, type, status, extra, expiring, expiryMonth, companyId, tier, autoPaused);
    // Osvježi i brojke uz svako učitavanje liste (npr. nakon promjene zastavica na profilu).
    refreshCounts();
    // Odabir vrijedi za trenutni prikaz — očisti ga pri promjeni stranice/filtera
    setSelected(new Set());
  }, [page, type, status, extra, tier, autoPaused, expiring, expiryMonth, companyId, fetchMembers, refreshCounts]);

  // Osvježi brojke kad se korisnik vrati na karticu (npr. back nakon uređivanja profila).
  useEffect(() => {
    const onFocus = () => refreshCounts();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refreshCounts]);

  function selectType(t: string) {
    setType(t);
    setStatus('');
    setExtra('');
    setExpiring(false);
    setPage(1);
  }
  function toggleStatus(v: string) {
    setStatus((s) => (s === v ? '' : v));
    setExpiring(false);
    setPage(1);
  }
  function toggleExtra(v: string) {
    setExtra((e) => (e === v ? '' : v));
    setPage(1);
  }
  function toggleTier(v: string) {
    setTier((t) => (t === v ? '' : v));
    setPage(1);
  }
  function toggleAutoPaused() {
    setAutoPaused((v) => !v);
    setPage(1);
  }
  function toggleMonth(v: string) {
    setExpiryMonth((m) => (m === v ? '' : v));
    setExpiring(false);
    setPage(1);
  }


  // Tvrtke za dropdown u modalu "Dodaj novog člana"
  useEffect(() => {
    if (!showAddModal || companies.length > 0) return;
    api.get<{ id: string; name: string; oib: string; website: string | null }[]>('/api/os/companies').then((res) => {
      if (res.success && res.data) setCompanies(res.data);
    });
  }, [showAddModal, companies.length]);

  const selectedCompany = addForm.companyId ? companies.find((c) => c.id === addForm.companyId) : undefined;

  // Kad se u modalu odabere tvrtka, učitaj sve njene postojeće profile (kontakte/webshopove)
  useEffect(() => {
    if (!addForm.companyId) { setCompanyMembers([]); return; }
    let cancelled = false;
    setCompanyMembersLoading(true);
    api.get<MemberRaw[]>(`/api/os/members?companyId=${addForm.companyId}&page=1&limit=100`).then((res) => {
      if (cancelled) return;
      setCompanyMembers(res.success && res.data ? res.data : []);
      setCompanyMembersLoading(false);
    });
    return () => { cancelled = true; };
  }, [addForm.companyId]);

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    setAddLoading(true);
    setAddError('');
    const res = await api.post('/api/os/members', addForm);
    if (res.success) {
      setShowAddModal(false);
      setAddForm(emptyAddForm);
      fetchMembers(page, type, status, extra, expiring, expiryMonth, companyId, tier, autoPaused);
      refreshCounts();
    } else {
      setAddError(res.error?.message || 'Greška pri dodavanju');
    }
    setAddLoading(false);
  }

  function toggleSelect(memberId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  }

  const allOnPageSelected = members.length > 0 && members.every((m) => selected.has(m.id));
  function toggleSelectAllOnPage() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) members.forEach((m) => next.delete(m.id));
      else members.forEach((m) => next.add(m.id));
      return next;
    });
  }

  async function bulkSetAutomations(paused: boolean) {
    if (selected.size === 0 || bulkLoading) return;
    const ids = Array.from(selected);
    setBulkLoading(true);
    const res = await api.post<{ count: number; paused: boolean }>('/api/os/members/automations', { ids, paused });
    setBulkLoading(false);
    if (res.success && res.data) {
      // Osvježi zastavicu na trenutnoj listi bez ponovnog dohvaćanja
      setMembers((prev) => prev.map((m) => (selected.has(m.id) ? { ...m, automationsPaused: paused } : m)));
      setSelected(new Set());
    } else {
      alert(res.error?.message || 'Promjena nije uspjela');
    }
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
            if (exporting) return;
            setExporting(true);
            try {
              const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
              const token = localStorage.getItem('accessToken');
              const res = await fetch(`${baseUrl}/api/os/members/export`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (!res.ok) { alert('Preuzimanje nije uspjelo'); return; }
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `clanovi-${new Date().toISOString().slice(0, 10)}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            } catch {
              alert('Preuzimanje nije uspjelo');
            } finally {
              setExporting(false);
            }
          }}
          disabled={exporting}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
        >
          {exporting ? 'Preuzimanje...' : 'Preuzmi CSV'}
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

      {/* Glavni tabovi — tip člana (jednostruki odabir) */}
      <div className="flex flex-wrap gap-2">
        {TYPE_TABS.map((tab) => {
          const isActive = type === tab.key;
          const count = counts[tab.countKey];
          return (
            <button
              key={tab.key}
              onClick={() => selectType(tab.key)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                isActive
                  ? 'bg-[#1B365D] text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
              {count != null && (
                <span className={`ml-2 ${isActive ? 'text-white/60' : 'text-gray-400'}`}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Podfilteri — ovise o odabranom tipu */}
      {subFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {subFilters.map((sf) => {
            const isActive = sf.group === 'status' ? status === sf.value : extra === sf.value;
            return (
              <button
                key={sf.key}
                onClick={() => (sf.group === 'status' ? toggleStatus(sf.value) : toggleExtra(sf.value))}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  isActive
                    ? 'border-[#1B365D] bg-[#1B365D] text-white'
                    : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                {sf.label}
                {sf.count != null && (
                  <span className={`ml-1.5 ${isActive ? 'text-white/60' : 'text-gray-400'}`}>{sf.count}</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Razina članstva + automatizacije (vrijedi za sve tipove) */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-gray-400">Razina:</span>
        {[
          { value: 'FREE', label: 'Besplatni' },
          { value: 'STANDARD', label: 'Standard' },
          { value: 'PREMIUM', label: 'Premium' },
        ].map((o) => {
          const isActive = tier === o.value;
          return (
            <button
              key={o.value}
              onClick={() => toggleTier(o.value)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                isActive
                  ? 'border-[#1B365D] bg-[#1B365D] text-white'
                  : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              {o.label}
            </button>
          );
        })}
        <span className="mx-1 h-4 w-px bg-gray-200" />
        <button
          onClick={toggleAutoPaused}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
            autoPaused
              ? 'border-red-400 bg-red-50 text-red-700'
              : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
          }`}
        >
          🔕 Automatizacije isključene
        </button>
      </div>

      {/* Mjeseci isteka — kao "Obnove" na dashboardu (tekući + 5 idućih) */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-gray-400">Ističu u mjesecu:</span>
        {monthOptions.map((o) => {
          const isActive = expiryMonth === o.value;
          return (
            <button
              key={o.value}
              onClick={() => toggleMonth(o.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                isActive
                  ? 'bg-[#1B365D] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {o.label}
            </button>
          );
        })}
        {expiryMonth && (
          <button
            onClick={() => toggleMonth(expiryMonth)}
            className="rounded-full px-2.5 py-1 text-xs font-medium text-gray-400 hover:text-gray-600"
          >
            ✕ Poništi mjesec
          </button>
        )}
      </div>

      {/* Globalni filter iz dashboarda (kad je "Svi članovi" + status/ističu uskoro) */}
      {type === 'all' && (status || expiring) && (
        <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-4 py-2">
          <span className="text-sm text-blue-800">
            Filter: <strong>{expiring ? 'Ističu uskoro' : (STATUS_LABELS[status] || status)}</strong>
          </span>
          <button
            onClick={() => { setStatus(''); setExpiring(false); setPage(1); }}
            className="ml-auto rounded-full bg-blue-200 px-2 py-0.5 text-xs font-medium text-blue-800 hover:bg-blue-300"
          >
            ✕ Ukloni filter
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Skupne akcije — vidljive kad je odabran barem jedan član */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[#1B365D]/20 bg-[#1B365D]/5 px-4 py-2.5">
          <span className="text-sm font-medium text-[#1B365D]">Odabrano: {selected.size}</span>
          <div className="ml-auto flex flex-wrap gap-2">
            <button
              onClick={() => bulkSetAutomations(true)}
              disabled={bulkLoading}
              className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50"
            >
              {bulkLoading ? 'Spremanje...' : '🔕 Isključi automatizacije'}
            </button>
            <button
              onClick={() => bulkSetAutomations(false)}
              disabled={bulkLoading}
              className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
            >
              {bulkLoading ? 'Spremanje...' : '🔔 Uključi automatizacije'}
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
            >
              Poništi odabir
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleSelectAllOnPage}
                    aria-label="Odaberi sve na stranici"
                    className="h-4 w-4 cursor-pointer rounded border-gray-300 text-[#1B365D] focus:ring-[#1B365D]"
                  />
                </th>
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
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    Učitavanje...
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
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
                      className={`cursor-pointer border-b border-gray-50 transition hover:bg-gray-50 ${
                        selected.has(m.id) ? 'bg-[#1B365D]/5' : ''
                      }`}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected.has(m.id)}
                          onChange={() => toggleSelect(m.id)}
                          aria-label={`Odaberi ${m.user.firstName} ${m.user.lastName}`}
                          className="h-4 w-4 cursor-pointer rounded border-gray-300 text-[#1B365D] focus:ring-[#1B365D]"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <p className="flex items-center gap-1.5 font-medium text-gray-900">
                          {m.user.firstName} {m.user.lastName}
                          {m.automationsPaused && (
                            <span title="Automatizacije isključene" className="text-xs">🔕</span>
                          )}
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
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
              >
                Prethodna
              </button>
              {getPageNumbers(page, totalPages).map((p, i) =>
                p === '…' ? (
                  <span key={`gap-${i}`} className="px-1.5 text-sm text-gray-400">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    aria-current={p === page ? 'page' : undefined}
                    className={`min-w-[36px] rounded-lg border px-3 py-1.5 text-sm transition ${
                      p === page
                        ? 'border-[#1B365D] bg-[#1B365D] text-white'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
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
              <div>
                <label className="block text-xs text-gray-500 mb-1">Tvrtka</label>
                <select
                  value={addForm.companyId}
                  onChange={e => {
                    const c = companies.find(x => x.id === e.target.value);
                    setAddForm(f => ({ ...f, companyId: e.target.value, companyName: c ? c.name : f.companyName, oib: c ? c.oib : f.oib }));
                  }}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="">— Nova tvrtka —</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name || c.oib}</option>
                  ))}
                </select>
              </div>
              {addForm.companyId && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                  <p className="mb-1 text-xs font-semibold text-blue-800">Postojeći profili ove tvrtke</p>
                  {companyMembersLoading ? (
                    <p className="text-xs text-blue-700">Učitavanje...</p>
                  ) : companyMembers.length === 0 ? (
                    <p className="text-xs text-blue-700">Nema postojećih profila.</p>
                  ) : (
                    <ul className="space-y-1">
                      {companyMembers.map(m => (
                        <li key={m.id} className="text-xs text-blue-900">
                          <a href={`/admin/members/${m.id}`} target="_blank" rel="noreferrer" className="font-medium underline hover:no-underline">
                            {m.user.firstName} {m.user.lastName}
                          </a>
                          {' '}— {m.user.email}
                          {(m.website || '') && <> · {m.website!.replace(/^https?:\/\//, '').replace(/\/+$/, '')}</>}
                          {' '}· {TYPE_LABELS[m.memberType] || m.memberType} ({TIER_LABELS[m.memberTier] || m.memberTier})
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Naziv firme</label>
                  <input value={addForm.companyName} disabled={!!addForm.companyId} onChange={e => setAddForm(f => ({ ...f, companyName: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">OIB</label>
                  <input value={addForm.oib} disabled={!!addForm.companyId} onChange={e => setAddForm(f => ({ ...f, oib: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">URL</label>
                <input
                  value={addForm.website}
                  onChange={e => setAddForm(f => ({ ...f, website: e.target.value }))}
                  placeholder="https://..."
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
                {selectedCompany?.website && (
                  <p className="mt-1 text-xs text-gray-400">Upišite web stranicu za ovo (novo) članstvo.</p>
                )}
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
                <label className="block text-xs text-gray-500 mb-2">Safe Shop, Akademija & Konferencija</label>
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={addForm.hasCertificate} onChange={e => setAddForm(f => ({ ...f, hasCertificate: e.target.checked, safeShopStatus: e.target.checked ? (f.safeShopStatus || 'NEMAJU NISTA') : '' }))} className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                      <span className="text-sm text-gray-700">Safe Shop certifikat</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={addForm.hasAcademy} onChange={e => setAddForm(f => ({ ...f, hasAcademy: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                      <span className="text-sm text-gray-700">Akademija</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={addForm.promoKonferencija} onChange={e => setAddForm(f => ({ ...f, promoKonferencija: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500" />
                      <span className="text-sm text-gray-700">Konferencija</span>
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
