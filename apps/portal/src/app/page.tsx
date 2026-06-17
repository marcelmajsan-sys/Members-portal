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
  user: { firstName: string; lastName: string; email: string };
  company: { name: string; oib: string; address: string; city: string; website?: string; phone?: string };
}
interface EmailItem { id: string; subject: string; status: string | null; sentAt: string; to: string; body: string | null }
interface NotificationItem { id: string; type: string; title: string; message: string; isRead: boolean; createdAt: string }
interface OfferItem { id: string; offerNumber: string; amount: number; currency: string; status: string; validUntil: string; createdAt: string }

const TYPE_LABELS: Record<string, string> = {
  WEB_TRADER: 'Web trgovac', SERVICE_PROVIDER: 'Nuditelj usluga', PHYSICAL: 'Fizički član',
};
const TIER_LABELS: Record<string, string> = { FREE: 'Besplatno', STANDARD: 'Standard', PREMIUM: 'Premium' };
const STATUS_LABELS: Record<string, string> = { ACTIVE: 'Aktivno', PENDING: 'Na čekanju', EXPIRED: 'Isteklo', SUSPENDED: 'Pauzirano' };
const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-success-light text-success', PENDING: 'bg-gray-100 text-gray-600',
  EXPIRED: 'bg-danger-light text-danger', SUSPENDED: 'bg-warning-light text-warning',
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
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<EmailItem | null>(null);

  // Guard
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) { router.replace('/login'); return; }
    if (user && user.role !== 'MEMBER') { window.location.href = '/admin'; }
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (isLoading || !isAuthenticated || (user && user.role !== 'MEMBER')) return;
    (async () => {
      const [p, e, n, o] = await Promise.all([
        api.get<Profile>('/api/member/profile'),
        api.get<EmailItem[]>('/api/member/emails'),
        api.get<NotificationItem[]>('/api/notifications?limit=20'),
        api.get<OfferItem[]>('/api/member/offers'),
      ]);
      if (p.success && p.data) setProfile(p.data);
      if (e.success && e.data) setEmails(e.data);
      if (n.success && n.data) setNotifications(n.data);
      if (o.success && o.data) setOffers(o.data);
      setLoading(false);
    })();
  }, [isLoading, isAuthenticated, user]);

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
              <h2 className="mb-4 text-sm font-semibold text-gray-900">Podaci o članu</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Info label="Ime i prezime" value={`${profile.user.firstName} ${profile.user.lastName}`} />
                <Info label="Email" value={profile.user.email} />
                <Info label="Tvrtka" value={profile.company.name} />
                <Info label="OIB" value={profile.company.oib} />
                <Info label="Adresa" value={[profile.company.address, profile.company.city].filter(Boolean).join(', ') || '—'} />
                <Info label="Web" value={profile.company.website || '—'} />
                {profile.company.phone && <Info label="Telefon" value={profile.company.phone} />}
              </div>
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
    </div>
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
