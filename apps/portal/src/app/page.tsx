'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';

interface Profile {
  memberNumber: string | null;
  memberType: string;
  memberTier: string;
  status: string;
  joinedAt: string | null;
  expiresAt: string | null;
  hasCertificate: boolean;
  hasAcademy: boolean;
  safeShopStatus: string | null;
  dateOfBirth: string | null;
  personalOib: string | null;
  personalAddress: string | null;
  personalZip: string | null;
  personalCity: string | null;
  personalCountry: string | null;
  personalPhone: string | null;
  personalNote: string | null;
  user: { firstName: string; lastName: string; email: string };
  company: {
    name: string; oib: string; address: string; city: string; zip?: string;
    country?: string; website?: string; phone?: string; email?: string; note?: string;
  };
}
interface EmailItem { id: string; subject: string; status: string | null; sentAt: string; to: string; body: string | null }
interface NotificationItem { id: string; type: string; title: string; message: string; isRead: boolean; createdAt: string }
interface OfferItem { id: string; offerNumber: string; amount: number; currency: string; status: string; validUntil: string; createdAt: string }
interface PerkItem { id: string; title: string; description: string | null; category: string | null; actionUrl: string | null; actionLabel: string | null; condition: string | null; status: string; claimedAt: string | null; statusNote: string | null }
interface Perks { available: PerkItem[]; claimed: PerkItem[] }
interface AnalysisRecommendation { title: string; description: string; severity: 'high' | 'medium' | 'low' }
interface AnalysisCategory { key: string; title: string; score: number; summary: string; recommendations: AnalysisRecommendation[] }
interface WebshopAnalysis { id: string; websiteUrl: string; status: string; overallScore: number | null; summary: string | null; result: AnalysisCategory[] | null; createdAt: string }

const TYPE_LABELS: Record<string, string> = {
  WEB_TRADER: 'Web trgovac', SERVICE_PROVIDER: 'Nuditelj usluga', PHYSICAL: 'Fizički član',
};
const TIER_LABELS: Record<string, string> = { FREE: 'Besplatno', STANDARD: 'Standard', PREMIUM: 'Premium' };
const STATUS_LABELS: Record<string, string> = { ACTIVE: 'Aktivno', PENDING: 'Na čekanju', EXPIRED: 'Isteklo', SUSPENDED: 'Pauzirano' };
const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-success-light text-success', PENDING: 'bg-gray-100 text-gray-600',
  EXPIRED: 'bg-danger-light text-danger', SUSPENDED: 'bg-warning-light text-warning',
};
const SEVERITY_DOT: Record<string, string> = {
  high: 'bg-danger', medium: 'bg-warning', low: 'bg-gray-400',
};

function fmtDate(d: string | null) {
  if (!d) return '—';
  const date = new Date(d);
  return isNaN(date.getTime()) ? '—' : date.toLocaleDateString('hr-HR');
}
function fmtCurrency(amount: number, currency = 'EUR') {
  return new Intl.NumberFormat('hr-HR', { style: 'currency', currency }).format(amount);
}

export default function PortalHome() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [perks, setPerks] = useState<Perks>({ available: [], claimed: [] });
  const [claiming, setClaiming] = useState('');
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<EmailItem | null>(null);
  const [editing, setEditing] = useState(false);
  const [analysis, setAnalysis] = useState<WebshopAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');

  // Guard
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) { router.replace('/login'); return; }
    if (user && user.role !== 'MEMBER') { window.location.href = '/admin'; }
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (isLoading || !isAuthenticated || (user && user.role !== 'MEMBER')) return;
    (async () => {
      const [p, e, n, o, pk, wa] = await Promise.all([
        api.get<Profile>('/api/member/profile'),
        api.get<EmailItem[]>('/api/member/emails'),
        api.get<NotificationItem[]>('/api/notifications?limit=20'),
        api.get<OfferItem[]>('/api/member/offers'),
        api.get<Perks>('/api/member/perks'),
        api.get<WebshopAnalysis | null>('/api/member/webshop-analysis'),
      ]);
      if (p.success && p.data) setProfile(p.data);
      if (e.success && e.data) setEmails(e.data);
      if (n.success && n.data) setNotifications(n.data);
      if (o.success && o.data) setOffers(o.data);
      if (pk.success && pk.data) setPerks(pk.data);
      if (wa.success && wa.data) setAnalysis(wa.data);
      setLoading(false);
      // Ako je analiza pokrenuta u prethodnom posjetu i još traje, nastavi pollati.
      if (wa.success && wa.data?.status === 'PENDING') pollAnalysis();
    })();
  }, [isLoading, isAuthenticated, user]);

  async function claimPerk(perk: PerkItem) {
    setClaiming(perk.id);
    const res = await api.post(`/api/member/perks/${perk.id}/claim`);
    if (res.success) {
      setPerks((prev) => ({
        available: prev.available.filter((x) => x.id !== perk.id),
        claimed: [{ ...perk, status: 'CLAIMED', claimedAt: new Date().toISOString() }, ...prev.claimed],
      }));
    }
    setClaiming('');
  }

  // Periodički provjerava spremljenu analizu dok ne postane COMPLETED/FAILED.
  // Tako se dovršena analiza prikaže i ako se duga POST veza prekine.
  async function pollAnalysis(maxMs = 180000) {
    setAnalyzing(true);
    const start = Date.now();
    while (Date.now() - start < maxMs) {
      await new Promise((r) => setTimeout(r, 5000));
      const res = await api.get<WebshopAnalysis | null>('/api/member/webshop-analysis');
      if (res.success && res.data) {
        if (res.data.status === 'COMPLETED') { setAnalysis(res.data); setAnalyzing(false); return; }
        if (res.data.status === 'FAILED') {
          setAnalysis(res.data);
          setAnalysisError('Analiza nije uspjela. Pokušajte ponovno.');
          setAnalyzing(false);
          return;
        }
      }
    }
    setAnalyzing(false);
    setAnalysisError('Analiza traje duže nego inače — osvježite stranicu za koju minutu.');
  }

  async function runAnalysis() {
    setAnalysisError('');
    setAnalyzing(true);
    // Pokreni analizu (na serveru se izvršava sinkrono, ~1 min).
    const res = await api.post<WebshopAnalysis>('/api/member/webshop-analysis').catch(() => null);
    if (res && res.success && res.data?.status === 'COMPLETED') {
      setAnalysis(res.data);
      setAnalyzing(false);
      return;
    }
    // Brze, tvrde greške (neaktivan član / bez web adrese) — odmah prikaži, bez pollanja.
    if (res && !res.success && res.error && res.error.code !== 'CONFLICT' && res.error.code !== 'NETWORK_ERROR') {
      setAnalysisError(res.error.message || 'Analiza nije uspjela. Pokušajte ponovno kasnije.');
      setAnalyzing(false);
      return;
    }
    // U tijeku / prekinuta duga veza → dohvati spremljeni rezultat pollanjem.
    await pollAnalysis();
  }

  if (isLoading || !isAuthenticated || (user && user.role !== 'MEMBER')) {
    return <div className="flex min-h-screen items-center justify-center text-gray-500">Učitavanje...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">
        <img src="/logo.png" alt="eCommerce Hrvatska" className="h-8 w-auto" />
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-gray-600 sm:inline">
            {profile?.user.firstName} {profile?.user.lastName}
          </span>
          <button
            onClick={logout}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition hover:bg-gray-50"
          >
            Odjava
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dobrodošli, {profile?.user.firstName}!</h1>
          <p className="mt-1 text-sm text-gray-500">Pregled vašeg članstva u Udruzi eCommerce Hrvatska</p>
        </div>

        {loading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-400">Učitavanje podataka...</div>
        ) : !profile ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
            Profil člana nije pronađen.
          </div>
        ) : (
          <>
            {/* Membership card */}
            <section className="rounded-xl border border-gray-200 bg-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-500">Tip članstva</p>
                  <p className="text-lg font-semibold text-gray-900">{TYPE_LABELS[profile.memberType] || profile.memberType}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Razina</p>
                  <p className="text-lg font-semibold text-gray-900">{TIER_LABELS[profile.memberTier] || profile.memberTier}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className={`mt-0.5 inline-block rounded-full px-3 py-1 text-sm font-medium ${STATUS_STYLES[profile.status] || 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABELS[profile.status] || profile.status}
                  </span>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-4 border-t border-gray-100 pt-5 sm:grid-cols-4">
                <Info label="Član od" value={fmtDate(profile.joinedAt)} />
                <Info label="Vrijedi do" value={fmtDate(profile.expiresAt)} />
                {profile.memberNumber && <Info label="Članski broj" value={profile.memberNumber} />}
                <Info label="Certifikat" value={profile.hasCertificate ? 'Da' : '—'} />
              </div>
            </section>

            {/* Member info */}
            <section className="rounded-xl border border-gray-200 bg-white p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-gray-900">Podaci o članu</h2>
                <button
                  onClick={() => setEditing(true)}
                  className="shrink-0 rounded-md border border-gray-300 bg-gray-50 px-4 py-1.5 text-sm font-medium text-primary transition hover:bg-gray-100"
                >
                  Uredi podatke
                </button>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Info label="Ime i prezime" value={`${profile.user.firstName} ${profile.user.lastName}`} />
                <Info label="Email" value={profile.user.email} />
                <Info label="Tvrtka" value={profile.company.name} />
                <Info label="OIB tvrtke" value={profile.company.oib} />
                <Info label="Adresa tvrtke" value={[profile.company.address, profile.company.zip, profile.company.city].filter(Boolean).join(', ') || '—'} />
                <Info label="Web trgovina" value={profile.company.website || '—'} />
                {profile.company.phone && <Info label="Telefon tvrtke" value={profile.company.phone} />}
                {profile.company.email && <Info label="E-mail web trgovine" value={profile.company.email} />}
              </div>
            </section>

            {/* Pogodnosti (benefiti) */}
            {(perks.available.length > 0 || perks.claimed.length > 0) && (
              <section className="rounded-xl border border-gray-200 bg-white p-6">
                <h2 className="mb-4 text-sm font-semibold text-gray-900">Pogodnosti</h2>
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                  {/* Dostupni */}
                  <div>
                    <h3 className="mb-3 text-base font-bold text-gray-900">Dostupni</h3>
                    {perks.available.length === 0 ? (
                      <p className="text-sm text-gray-400">Trenutno nemate dostupnih pogodnosti.</p>
                    ) : (
                      <ul className="space-y-3">
                        {perks.available.map((perk) => {
                          const isActiveMember = profile.status === 'ACTIVE';
                          return (
                          <li key={perk.id} className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm text-gray-700">
                                {perk.title}
                                {isActiveMember && perk.actionUrl && (
                                  <>
                                    {' '}
                                    <a href={perk.actionUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                                      [{perk.actionLabel || 'PREUZMI'}]
                                    </a>
                                  </>
                                )}
                              </p>
                              {perk.description && <p className="text-xs text-gray-500">{perk.description}</p>}
                            </div>
                            {isActiveMember ? (
                              <button
                                onClick={() => claimPerk(perk)}
                                disabled={claiming === perk.id}
                                className="shrink-0 rounded-md border border-gray-300 bg-gray-50 px-5 py-2 text-sm font-semibold uppercase tracking-wide text-primary transition hover:bg-gray-100 disabled:opacity-50"
                              >
                                {claiming === perk.id ? '...' : (perk.actionLabel || 'Prijava')}
                              </button>
                            ) : (
                              <span className="shrink-0 rounded-md bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700">
                                Produži članstvo
                              </span>
                            )}
                          </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                  {/* Iskorišteni */}
                  <div>
                    <h3 className="mb-3 text-base font-bold text-gray-900">Iskorišteni</h3>
                    {perks.claimed.length === 0 ? (
                      <p className="text-sm text-gray-400">Još niste iskoristili nijednu pogodnost.</p>
                    ) : (
                      <ul className="space-y-3">
                        {perks.claimed.map((perk) => (
                          <li key={perk.id}>
                            <p className="text-sm text-gray-700">{perk.title}</p>
                            {perk.statusNote ? (
                              <p className="text-xs font-medium text-success">{perk.statusNote}</p>
                            ) : (
                              <p className="text-xs text-gray-400">Zatraženo {fmtDate(perk.claimedAt)}</p>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Stručna analiza webshopa (AI) */}
            <section className="rounded-xl border border-gray-200 bg-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Stručna analiza webshopa</h2>
                  <p className="mt-1 text-xs text-gray-500">
                    Besplatna AI analiza vašeg webshopa po 6 područja: UX, CRO &amp; Content, SEO,
                    Buyer&apos;s Journey, Analytics i Legal.
                  </p>
                </div>
                {profile.status === 'ACTIVE' && profile.company.website && (
                  <button
                    onClick={runAnalysis}
                    disabled={analyzing}
                    className="shrink-0 rounded-md border border-gray-300 bg-gray-50 px-5 py-2 text-sm font-semibold uppercase tracking-wide text-primary transition hover:bg-gray-100 disabled:opacity-50"
                  >
                    {analyzing ? 'Analiziram…' : analysis ? 'Pokreni ponovno' : 'Aktiviraj besplatnu analizu'}
                  </button>
                )}
              </div>

              {profile.status !== 'ACTIVE' ? (
                <p className="mt-4 rounded-md bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
                  Produžite članstvo da biste pokrenuli besplatnu analizu.
                </p>
              ) : !profile.company.website ? (
                <p className="mt-4 text-sm text-gray-500">
                  Dodajte web adresu tvrtke (u podacima o članu) da biste mogli pokrenuti analizu.
                </p>
              ) : analyzing ? (
                <div className="mt-4 flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-6 text-sm text-gray-500">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-primary" />
                  Analiziram webshop, ovo može potrajati do minute…
                </div>
              ) : analysisError ? (
                <p className="mt-4 rounded-md bg-danger-light px-4 py-3 text-sm font-medium text-danger">{analysisError}</p>
              ) : analysis && analysis.result ? (
                <div className="mt-5 space-y-5">
                  <div className="flex items-center gap-4 border-b border-gray-100 pb-5">
                    <ScoreBadge score={analysis.overallScore ?? 0} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">Ukupna ocjena</p>
                      {analysis.summary && <p className="mt-0.5 text-sm text-gray-600">{analysis.summary}</p>}
                      <p className="mt-1 text-xs text-gray-400">Analizirano {fmtDate(analysis.createdAt)}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {analysis.result.map((cat) => (
                      <div key={cat.key} className="rounded-lg border border-gray-100 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-sm font-bold text-gray-900">{cat.title}</h3>
                          <ScoreBadge score={cat.score} small />
                        </div>
                        {cat.summary && <p className="mt-2 text-sm text-gray-600">{cat.summary}</p>}
                        {cat.recommendations.length > 0 && (
                          <ul className="mt-3 space-y-2">
                            {cat.recommendations.map((rec, i) => (
                              <li key={i} className="flex gap-2">
                                <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${SEVERITY_DOT[rec.severity] || 'bg-gray-300'}`} />
                                <div>
                                  <p className="text-sm font-medium text-gray-800">{rec.title}</p>
                                  <p className="text-xs text-gray-500">{rec.description}</p>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400">
                    Napomena: ovo je automatska AI procjena namijenjena kao smjernica i ne zamjenjuje
                    detaljnu stručnu analizu žirija Udruge.
                  </p>
                </div>
              ) : (
                <p className="mt-4 text-sm text-gray-500">
                  Kliknite &quot;Aktiviraj besplatnu analizu&quot; i AI će pregledati vaš webshop te
                  predložiti konkretna poboljšanja po 6 područja.
                </p>
              )}
            </section>

            {/* Notifications */}
            <Section title="Obavijesti" count={notifications.length}>
              {notifications.length === 0 ? (
                <Empty>Nemate novih obavijesti.</Empty>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {notifications.map((n) => (
                    <li key={n.id} className="py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{n.title}</p>
                          <p className="mt-0.5 text-sm text-gray-600">{n.message}</p>
                        </div>
                        <span className="whitespace-nowrap text-xs text-gray-400">{fmtDate(n.createdAt)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            {/* Offers */}
            <Section title="Ponude" count={offers.length}>
              {offers.length === 0 ? (
                <Empty>Nemate aktivnih ponuda.</Empty>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {offers.map((o) => (
                    <li key={o.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Predračun {o.offerNumber}</p>
                        <p className="text-xs text-gray-500">Vrijedi do {fmtDate(o.validUntil)} · {o.status}</p>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{fmtCurrency(Number(o.amount), o.currency)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            {/* Email communication */}
            <Section title="Email komunikacija" count={emails.length}>
              {emails.length === 0 ? (
                <Empty>Nema zabilježene email komunikacije.</Empty>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {emails.map((m) => (
                    <li key={m.id}>
                      <button
                        onClick={() => setPreview(m)}
                        className="-mx-2 flex w-[calc(100%+1rem)] items-center justify-between gap-3 rounded-lg px-2 py-3 text-left transition hover:bg-gray-50"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-900">{m.subject}</p>
                          <p className="text-xs text-gray-500">
                            {m.status === 'received' ? 'Vaš odgovor' : 'Poslano vama'}
                          </p>
                        </div>
                        <span className="whitespace-nowrap text-xs text-gray-400">{fmtDate(m.sentAt)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </>
        )}
      </main>

      {/* Email preview modal */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 p-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 break-words">{preview.subject}</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {preview.status === 'received' ? 'Vaš odgovor' : 'Poslano vama'} · {fmtDate(preview.sentAt)}
                </p>
              </div>
              <button
                onClick={() => setPreview(null)}
                aria-label="Zatvori"
                className="shrink-0 rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-gray-50 p-2">
              {preview.body ? (
                <iframe
                  title="Sadržaj e-maila"
                  sandbox=""
                  className="h-[60vh] w-full rounded-lg border border-gray-200 bg-white"
                  srcDoc={
                    /<[a-z][\s\S]*>/i.test(preview.body)
                      ? preview.body
                      : `<pre style="white-space:pre-wrap;word-break:break-word;font-family:system-ui,sans-serif;font-size:14px;color:#111827;padding:12px;margin:0;">${preview.body.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string))}</pre>`
                  }
                />
              ) : (
                <p className="p-6 text-center text-sm text-gray-400">Sadržaj e-maila nije dostupan.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit profile modal */}
      {editing && profile && (
        <EditProfileModal
          profile={profile}
          onClose={() => setEditing(false)}
          onSaved={(updated) => {
            setProfile(updated);
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}

function dateInput(s: string | null) {
  return s ? s.slice(0, 10) : '';
}

function EditProfileModal({
  profile,
  onClose,
  onSaved,
}: {
  profile: Profile;
  onClose: () => void;
  onSaved: (p: Profile) => void;
}) {
  const [form, setForm] = useState({
    // Fizička osoba
    firstName: profile.user.firstName || '',
    lastName: profile.user.lastName || '',
    email: profile.user.email || '',
    personalAddress: profile.personalAddress || '',
    personalZip: profile.personalZip || '',
    personalCity: profile.personalCity || '',
    personalCountry: profile.personalCountry || '',
    personalOib: profile.personalOib || '',
    dateOfBirth: dateInput(profile.dateOfBirth),
    personalPhone: profile.personalPhone || '',
    personalNote: profile.personalNote || '',
    // Poslovni subjekt
    companyName: profile.company.name || '',
    address: profile.company.address || '',
    postalCode: profile.company.zip || '',
    city: profile.company.city || '',
    country: profile.company.country || '',
    oib: profile.company.oib || '',
    phone: profile.company.phone || '',
    website: profile.company.website || '',
    companyEmail: profile.company.email || '',
    companyNote: profile.company.note || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const payload = {
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      personalAddress: form.personalAddress,
      personalZip: form.personalZip,
      personalCity: form.personalCity,
      personalCountry: form.personalCountry,
      personalOib: form.personalOib,
      dateOfBirth: form.dateOfBirth,
      personalPhone: form.personalPhone,
      personalNote: form.personalNote,
      companyName: form.companyName,
      address: form.address,
      postalCode: form.postalCode,
      city: form.city,
      country: form.country,
      oib: form.oib,
      phone: form.phone,
      website: form.website,
      companyEmail: form.companyEmail,
      companyNote: form.companyNote,
    };
    const res = await api.put<Profile>('/api/member/profile', payload);
    if (res.success && res.data) {
      onSaved(res.data);
    } else {
      setError(res.error?.message || 'Spremanje nije uspjelo. Pokušajte ponovno.');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form
        onSubmit={save}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-gray-200 p-4">
          <h2 className="text-base font-semibold text-gray-900">Uredi podatke</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zatvori"
            className="shrink-0 rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 space-y-8 overflow-auto p-5">
          {/* Poslovni subjekt */}
          <fieldset className="space-y-4">
            <legend className="text-lg font-bold text-gray-900">Poslovni subjekt</legend>
            <Field label="Naziv tvrtke" required value={form.companyName} onChange={(v) => set('companyName', v)} />
            <Field label="Adresa tvrtke" required hint="ulica i grad" value={form.address} onChange={(v) => set('address', v)} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Poštanski broj tvrtke" required value={form.postalCode} onChange={(v) => set('postalCode', v)} />
              <Field label="Mjesto tvrtke" required value={form.city} onChange={(v) => set('city', v)} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Država tvrtke" required value={form.country} onChange={(v) => set('country', v)} />
              <Field label="OIB tvrtke" required value={form.oib} onChange={(v) => set('oib', v)} />
            </div>
            <Field label="Broj telefona tvrtke" required value={form.phone} onChange={(v) => set('phone', v)} />
            <Field label="Web trgovina (URL adresa)" required hint="ako još uvijek nemaš svoj webshop ovdje napiši zašto" value={form.website} onChange={(v) => set('website', v)} />
            <Field label="E-mail (web trgovine)" required type="email" hint="upiši e-mail tvrtke ako još nemaš web trgovinu" value={form.companyEmail} onChange={(v) => set('companyEmail', v)} />
            <Field label="Napomena" value={form.companyNote} onChange={(v) => set('companyNote', v)} textarea />
          </fieldset>

          {/* Fizička osoba */}
          <fieldset className="space-y-4">
            <legend className="text-lg font-bold text-gray-900">Fizička osoba</legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Ime" required value={form.firstName} onChange={(v) => set('firstName', v)} />
              <Field label="Prezime" required value={form.lastName} onChange={(v) => set('lastName', v)} />
            </div>
            <Field label="Adresa" required value={form.personalAddress} onChange={(v) => set('personalAddress', v)} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Poštanski broj" required value={form.personalZip} onChange={(v) => set('personalZip', v)} />
              <Field label="Grad" required value={form.personalCity} onChange={(v) => set('personalCity', v)} />
            </div>
            <Field label="Država" required value={form.personalCountry} onChange={(v) => set('personalCountry', v)} />
            <Field label="OIB" required hint="ovo polje je obavezno zbog Zakona o Udrugama" value={form.personalOib} onChange={(v) => set('personalOib', v)} />
            <Field label="Datum rođenja" required type="date" hint="ovo polje je obavezno zbog Zakona o Udrugama" value={form.dateOfBirth} onChange={(v) => set('dateOfBirth', v)} />
            <Field label="Broj telefona" hint="opcionalno" value={form.personalPhone} onChange={(v) => set('personalPhone', v)} />
            <Field label="Email" required type="email" hint="na ovu adresu vam šaljemo sve informacije o vašim pogodnostima" value={form.email} onChange={(v) => set('email', v)} />
            <Field label="Napomena" value={form.personalNote} onChange={(v) => set('personalNote', v)} textarea />
          </fieldset>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-200 p-4">
          {error && <span className="mr-auto text-sm text-danger">{error}</span>}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
          >
            Odustani
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Spremam…' : 'Spremi'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  hint,
  type = 'text',
  textarea,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  hint?: string;
  type?: string;
  textarea?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-danger"> *</span>}
      </span>
      {hint && <span className="mt-0.5 block text-xs italic text-gray-400">{hint}</span>}
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
        />
      ) : (
        <input
          type={type}
          value={value}
          required={required}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
        />
      )}
    </label>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-gray-900 break-words">{value}</p>
    </div>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="mb-4 text-sm font-semibold text-gray-900">{title} {count > 0 && <span className="text-gray-400">({count})</span>}</h2>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-4 text-center text-sm text-gray-400">{children}</p>;
}

function ScoreBadge({ score, small }: { score: number; small?: boolean }) {
  const color = score >= 70 ? 'bg-success-light text-success' : score >= 40 ? 'bg-warning-light text-warning' : 'bg-danger-light text-danger';
  const size = small ? 'h-9 w-9 text-xs' : 'h-14 w-14 text-lg';
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full font-bold ${color} ${size}`}>
      {Math.round(score)}
    </span>
  );
}
