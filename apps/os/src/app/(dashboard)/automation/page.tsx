'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface EmailTemplate {
  slug: string;
  name: string;
  subject: string;
  body: string;
  ctaLabel: string | null;
  isActive: boolean;
}

// Pregled emaila s primjerima vrijednosti oznaka (isto kao na stranici predložaka)
function applySampleVars(text: string): string {
  return text
    .replace(/\{\{\s*datum_isteka\s*\}\}/g, '31. 12. 2026.')
    .replace(/\{\{\s*ime\s*\}\}/g, 'Ime')
    .replace(/\{\{\s*prezime\s*\}\}/g, 'Člana')
    .replace(/\{\{\s*tvrtka\s*\}\}/g, 'Tvrtka d.o.o.');
}

function buildPreviewHtml(tpl: EmailTemplate): string {
  const bodyParagraphs = tpl.body
    ? applySampleVars(tpl.body).split('\n').filter(Boolean).map((p) => `<p>${p}</p>`).join('\n    ')
    : '<p style="color:#999;">(prazan tekst)</p>';
  const ctaHtml = tpl.ctaLabel
    ? `<div style="text-align:center;margin:32px 0;">
        <a href="#" style="background:#E8A838;color:#1B365D;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;">${tpl.ctaLabel}</a>
      </div>`
    : '';
  return `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;background:#fff;">
  <div style="background:#1B365D;padding:20px 24px;text-align:center;">
    <img src="https://members.ecommerce.hr/admin/logo.png" alt="eCommerce Hrvatska" style="height:44px;display:inline-block;" />
  </div>
  <div style="padding:24px;">
    <p>Poštovani <strong>Ime Člana</strong>,</p>
    ${bodyParagraphs}
    ${ctaHtml}
    <p>Za sva pitanja kontaktirajte nas na <a href="#" style="color:#E8A838;">udruga@ecommerce.hr</a> ili +385 99 2025707.</p>
    <p>Srdačan pozdrav,<br/><strong>Tim eCommerce Hrvatska</strong></p>
  </div>
  <div style="background:#1B365D;padding:20px 24px;text-align:center;">
    <p style="margin:0 0 6px;color:#E8A838;font-size:12px;font-weight:bold;">eCommerce Hrvatska</p>
    <p style="margin:0;color:rgba(255,255,255,0.6);font-size:11px;">Republike Austrije 9, Zagreb · udruga@ecommerce.hr · +385 99 2025707</p>
  </div>
</body></html>`;
}

interface CalendarEventTrigger {
  id: string;
  title: string;
  date: string;
  isAutomationTrigger: boolean;
}

// ---- Analitika (tab "Analitika") ----
interface AnalyticsMember {
  memberId: string;
  name: string;
  company: string | null;
  email: string;
  date: string | null;
  dateKind: 'okida' | 'isteklo' | 'uclanjen';
  state: 'scheduled' | 'expired' | 'active';
}
interface AnalyticsSend {
  memberId: string | null;
  name: string;
  company: string | null;
  email: string;
  sentAt: string | null;
  status: string;
}
interface AnalyticsAutomation {
  id: string;
  name: string;
  description: string | null;
  triggerEvent: string;
  status: string;
  stepCount: number;
  conditionDay: number | null;
  templateSlug: string | null;
  hasAttachment: boolean;
  template: { slug: string; name: string; subject: string; body: string; inDb: boolean; isHidden: boolean } | null;
  audienceCount: number;
  audience: AnalyticsMember[];
  audienceMore: number;
  sendCount: number;
  sends: AnalyticsSend[];
}
interface AnalyticsData {
  today: string | null;
  kpis: {
    activeSequences: number;
    activeMembers: number;
    expiringSoon: number;
    expiredMembers: number;
    pendingMembers: number;
    autoEmailsSent: number;
  };
  automations: AnalyticsAutomation[];
}

const AUDIENCE_HEADERS: Record<AnalyticsMember['dateKind'], string> = {
  okida: 'Okida',
  isteklo: 'Isteklo',
  uclanjen: 'Učlanjen',
};
const STATE_STYLES: Record<AnalyticsMember['state'], string> = {
  scheduled: 'bg-blue-50 text-blue-700',
  expired: 'bg-red-50 text-red-700',
  active: 'bg-green-50 text-green-700',
};
const STATE_LABELS: Record<AnalyticsMember['state'], string> = {
  scheduled: 'Zakazano',
  expired: 'Isteklo',
  active: 'Član',
};

interface Sequence {
  id: string;
  name: string;
  description: string | null;
  triggerEvent: string;
  steps: Array<{ type: string; config: Record<string, unknown>; order: number }>;
  status: string;
  createdAt: string;
  _count: { logs: number };
}

const TRIGGER_LABELS: Record<string, string> = {
  'member.expiry_reminder': 'Podsjetnik prije isteka članstva',
  'member.renewal_reminder': 'Podsjetnik za obnovu',
  'member.activated': 'Aktivacija članstva',
  'member.expired': 'Istek članstva',
  'member.suspended': 'Suspenzija članstva',
  'member.offer_sent': 'Ponuda poslana',
  'member.renewed': 'Obnova članstva',
  'payment.completed': 'Uspješno plaćanje',
  'payment.failed': 'Neuspjelo plaćanje',
};

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-green-50 text-green-700',
  PAUSED: 'bg-yellow-50 text-yellow-700',
  COMPLETED: 'bg-gray-100 text-gray-500',
  CANCELLED: 'bg-red-50 text-red-700',
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Aktivna',
  PAUSED: 'Pauzirana',
  COMPLETED: 'Završena',
  CANCELLED: 'Otkazana',
};

// Hrvatska pluralizacija: 1 aktivna, 2-4 aktivne, 5+ aktivnih (uz iznimke 11-14)
function plural(n: number, one: string, few: string, many: string): string {
  if (n % 10 === 1 && n % 100 !== 11) return one;
  if (n % 10 >= 2 && n % 10 <= 4 && !(n % 100 >= 12 && n % 100 <= 14)) return few;
  return many;
}

// Uvjet je "eq" (točno taj dan) — cron dnevno okida event za sve koji ističu unutar 30 dana,
// pa bi "lte" slao podsjetnik svakih 7 dana (cooldown) umjesto točno na 30/14/7.
const PRESET_AUTOMATIONS = [
  {
    name: 'Podsjetnik 30 dana prije isteka',
    description: 'Automatski šalje podsjetnik s predračunom u privitku točno 30 dana prije isteka članstva.',
    triggerEvent: 'member.expiry_reminder',
    steps: [
      { type: 'CONDITION', config: { field: 'daysUntilExpiry', operator: 'eq', value: 30 }, order: 0 },
      { type: 'SEND_EMAIL', config: { template: 'renewal_reminder' }, order: 1 },
    ],
  },
  {
    name: 'Podsjetnik 14 dana prije isteka',
    description: 'Drugi podsjetnik s predračunom — točno 14 dana prije isteka.',
    triggerEvent: 'member.expiry_reminder',
    steps: [
      { type: 'CONDITION', config: { field: 'daysUntilExpiry', operator: 'eq', value: 14 }, order: 0 },
      { type: 'SEND_EMAIL', config: { template: 'renewal_urgent' }, order: 1 },
    ],
  },
  {
    name: 'Podsjetnik 7 dana prije isteka',
    description: 'Zadnji podsjetnik s predračunom — točno 7 dana prije isteka.',
    triggerEvent: 'member.expiry_reminder',
    steps: [
      { type: 'CONDITION', config: { field: 'daysUntilExpiry', operator: 'eq', value: 7 }, order: 0 },
      { type: 'SEND_EMAIL', config: { template: 'renewal_final' }, order: 1 },
    ],
  },
  {
    name: 'Podsjetnik na dan isteka',
    description: 'Podsjetnik s predračunom na sam dan isteka članstva — zadnji dan za obnovu bez prekida.',
    triggerEvent: 'member.expiry_reminder',
    steps: [
      { type: 'CONDITION', config: { field: 'daysUntilExpiry', operator: 'eq', value: 0 }, order: 0 },
      { type: 'SEND_EMAIL', config: { template: 'renewal_expiry_today' }, order: 1 },
    ],
  },
  {
    name: 'Dobrodošlica novom članu',
    description: 'Automatski šalje email dobrodošlice kad se član aktivira.',
    triggerEvent: 'member.activated',
    steps: [
      { type: 'SEND_EMAIL', config: { template: 'welcome', subject: 'Dobrodošli u eCommerce Hrvatska!' }, order: 0 },
    ],
  },
  {
    name: 'Obavijest o isteku',
    description: 'Šalje obavijest kad članstvo istekne.',
    triggerEvent: 'member.expired',
    steps: [
      { type: 'SEND_EMAIL', config: { template: 'expired', subject: 'Vaše članstvo je isteklo' }, order: 0 },
    ],
  },
];

export default function AutomationPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [toast, setToast] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const [renewalLoading, setRenewalLoading] = useState(false);

  // Email templates for dropdown
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  // Calendar events that are automation triggers
  const [calendarTriggers, setCalendarTriggers] = useState<CalendarEventTrigger[]>([]);

  // Custom automation form (kreiranje + uređivanje)
  const [editingSeq, setEditingSeq] = useState<Sequence | null>(null);
  const [customName, setCustomName] = useState('');
  const [customTrigger, setCustomTrigger] = useState('member.expiry_reminder');
  const [customDays, setCustomDays] = useState(30);
  // 'eq' = točno taj dan (preporučeno uz dnevni cron); 'lte' = unutar X dana (šalje svakih ~7 dana zbog cooldowna)
  const [customOperator, setCustomOperator] = useState<'eq' | 'lte'>('eq');
  const [customSubject, setCustomSubject] = useState('');
  const [customTemplate, setCustomTemplate] = useState('custom');
  const [previewTpl, setPreviewTpl] = useState<EmailTemplate | null>(null);

  // Tab: popis automatizacija ↔ analitika
  const [view, setView] = useState<'list' | 'analytics'>('list');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [openAuto, setOpenAuto] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    const res = await api.get<AnalyticsData>('/api/os/sequences/analytics');
    if (res.success && res.data) setAnalytics(res.data);
    setAnalyticsLoading(false);
  }, []);

  useEffect(() => {
    if (view === 'analytics' && !analytics && !analyticsLoading) loadAnalytics();
  }, [view, analytics, analyticsLoading, loadAnalytics]);

  // Otvori pregled emaila iz analitike (reuse postojećeg modala).
  function previewAnalyticsTemplate(t: NonNullable<AnalyticsAutomation['template']>) {
    setPreviewTpl({ slug: t.slug, name: t.name, subject: t.subject, body: t.body, ctaLabel: null, isActive: true });
  }

  function resetForm() {
    setEditingSeq(null);
    setCustomName('');
    setCustomTrigger('member.expiry_reminder');
    setCustomDays(30);
    setCustomOperator('eq');
    setCustomSubject('');
    setCustomTemplate('custom');
  }

  function startEdit(seq: Sequence) {
    const cond = seq.steps?.find((s) => s.type.toLowerCase() === 'condition');
    const mail = seq.steps?.find((s) => ['send_email', 'email'].includes(s.type.toLowerCase()));
    setEditingSeq(seq);
    setCustomName(seq.name);
    setCustomTrigger(seq.triggerEvent);
    setCustomDays(Number(cond?.config?.value ?? 30));
    setCustomOperator((cond?.config?.operator as 'eq' | 'lte') === 'lte' ? 'lte' : 'eq');
    setCustomSubject((mail?.config?.subject as string) || '');
    setCustomTemplate((mail?.config?.template as string) || 'custom');
    setShowCreate(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showToastMsg(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  useEffect(() => {
    if (user && user.role !== 'OWNER') {
      router.replace('/dashboard');
    }
  }, [user, router]);

  const fetchSequences = useCallback(async () => {
    const res = await api.get<Sequence[]>('/api/os/sequences?page=1&limit=50');
    if (res.success && res.data) {
      setSequences(res.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSequences();
    api.get<EmailTemplate[]>('/api/os/email-templates').then((res) => {
      if (res.success && res.data) setEmailTemplates(res.data.filter((t) => t.isActive));
    });
    api.get<CalendarEventTrigger[]>('/api/os/calendar-events').then((res) => {
      if (res.success && res.data) {
        setCalendarTriggers(res.data.filter((e) => e.isAutomationTrigger));
      }
    });
  }, [fetchSequences]);

  async function toggleSequence(seq: Sequence) {
    // Dozvoli samo ACTIVE ↔ PAUSED (ne diraj COMPLETED/CANCELLED)
    if (seq.status !== 'ACTIVE' && seq.status !== 'PAUSED') return;
    const newStatus = seq.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    setActionLoading(seq.id);
    const res = await api.patch(`/api/os/sequences/${seq.id}/status`, { status: newStatus });
    if (res.success) {
      setSequences((prev) => prev.map((s) => (s.id === seq.id ? { ...s, status: newStatus } : s)));
      showToastMsg(`${seq.name}: ${newStatus === 'ACTIVE' ? 'Uključena' : 'Isključena'}`);
    }
    setActionLoading('');
  }

  async function deleteSequence(seq: Sequence) {
    if (!confirm(`Obrisati automatizaciju "${seq.name}"?`)) return;
    setActionLoading(seq.id);
    const res = await api.patch(`/api/os/sequences/${seq.id}/status`, { status: 'CANCELLED' });
    if (res.success) {
      setSequences((prev) => prev.filter((s) => s.id !== seq.id));
      showToastMsg('Automatizacija obrisana');
    }
    setActionLoading('');
  }

  async function testSequence(seq: Sequence) {
    const email = prompt('Pošalji testni email automatizacije na adresu:', user?.email || '');
    if (!email) return;
    setActionLoading(seq.id);
    const res = await api.post<{ sent: string[]; to: string }>(`/api/os/sequences/${seq.id}/test`, { email });
    if (res.success && res.data) {
      showToastMsg(`Test poslan na ${res.data.to} (${res.data.sent.join(', ')})`);
    } else {
      showToastMsg(`Greška: ${res.error?.message || 'Test nije uspio'}`);
    }
    setActionLoading('');
  }

  async function createPreset(preset: typeof PRESET_AUTOMATIONS[0]) {
    setActionLoading('preset');
    const res = await api.post<Sequence>('/api/os/sequences', {
      name: preset.name,
      description: preset.description,
      triggerEvent: preset.triggerEvent,
      steps: preset.steps,
      status: 'ACTIVE',
    });
    if (res.success && res.data) {
      setSequences((prev) => [res.data!, ...prev]);
      showToastMsg(`Kreirana: ${preset.name}`);
    } else {
      showToastMsg(`Greška: ${res.error?.message}`);
    }
    setActionLoading('');
  }

  async function saveCustom() {
    if (!customName.trim()) return;
    setActionLoading('custom');
    const steps = [
      ...(customTrigger === 'member.expiry_reminder'
        ? [{ type: 'CONDITION', config: { field: 'daysUntilExpiry', operator: customOperator, value: customDays }, order: 0 }]
        : []),
      {
        type: 'SEND_EMAIL',
        config: {
          template: customTemplate,
          // Prazno = koristi subject iz email predloška (podržava {{datum_isteka}} i sl.)
          ...(customSubject.trim() ? { subject: customSubject.trim() } : {}),
        },
        order: customTrigger === 'member.expiry_reminder' ? 1 : 0,
      },
    ];

    const body = {
      name: customName,
      description: editingSeq?.description || `Prilagođena automatizacija: ${TRIGGER_LABELS[customTrigger] || calendarTriggers.find((e) => `calendar_event.${e.id}` === customTrigger)?.title || customTrigger}`,
      triggerEvent: customTrigger,
      steps,
    };

    const res = editingSeq
      ? await api.put<Sequence>(`/api/os/sequences/${editingSeq.id}`, body)
      : await api.post<Sequence>('/api/os/sequences', { ...body, status: 'ACTIVE' });

    if (res.success && res.data) {
      const saved = res.data;
      setSequences((prev) =>
        editingSeq ? prev.map((s) => (s.id === saved.id ? { ...s, ...saved } : s)) : [saved, ...prev],
      );
      showToastMsg(editingSeq ? `Spremljena: ${customName}` : `Kreirana: ${customName}`);
      setShowCreate(false);
      resetForm();
    } else {
      showToastMsg(`Greška: ${res.error?.message}`);
    }
    setActionLoading('');
  }

  if (user?.role !== 'OWNER') {
    return null;
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-500">Učitavanje...</p>
      </div>
    );
  }

  async function checkRenewals() {
    setRenewalLoading(true);
    const res = await api.post<{ processed: number; expired: number }>('/api/os/renewal-check');
    if (res.success && res.data) {
      showToastMsg(`Obrađeno: ${res.data.processed} podsjetnika, ${res.data.expired} isteklih`);
    } else {
      showToastMsg(`Greška: ${res.error?.message || 'Nepoznata greška'}`);
    }
    setRenewalLoading(false);
  }

  const activeCount = sequences.filter((s) => s.status === 'ACTIVE').length;

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed right-4 top-4 z-50 rounded-lg bg-gray-900 px-4 py-3 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Automatizacija</h1>
          <p className="mt-1 text-sm text-gray-500">
            {view === 'list'
              ? `${activeCount} ${plural(activeCount, 'aktivna automatizacija', 'aktivne automatizacije', 'aktivnih automatizacija')}`
              : 'Analitika — tko je u svakoj automatizaciji, predlošci i povijest slanja'}
          </p>
        </div>
        {view === 'list' && (
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={checkRenewals}
              disabled={renewalLoading}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 sm:px-4"
            >
              {renewalLoading ? 'Provjeravam...' : 'Provjeri obnove'}
            </button>
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white transition hover:bg-primary-light sm:px-4"
            >
              + Nova automatizacija
            </button>
          </div>
        )}
      </div>

      {/* Tab prekidač: Popis ↔ Analitika */}
      <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 w-fit">
        {(['list', 'analytics'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
              view === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {v === 'list' ? 'Popis' : 'Analitika'}
          </button>
        ))}
      </div>

      {view === 'list' && (<>
      {/* Create/edit custom automation */}
      {showCreate && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            {editingSeq ? `Uređivanje: ${editingSeq.name}` : 'Nova automatizacija'}
          </h2>

          {/* Presets — samo pri kreiranju */}
          {!editingSeq && (
            <div className="mb-6">
              <h3 className="mb-3 text-sm font-medium text-gray-700">Predlošci — klikni za brzo dodavanje:</h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {PRESET_AUTOMATIONS.filter(
                  (p) => !sequences.some((s) => s.name === p.name && s.status !== 'CANCELLED')
                ).map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => createPreset(preset)}
                    disabled={!!actionLoading}
                    className="rounded-lg border border-gray-200 p-3 text-left transition hover:border-primary hover:bg-primary/5 disabled:opacity-50"
                  >
                    <p className="text-sm font-medium text-gray-900">{preset.name}</p>
                    <p className="mt-0.5 text-xs text-gray-500">{preset.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={editingSeq ? '' : 'border-t border-gray-100 pt-4'}>
            {!editingSeq && <h3 className="mb-3 text-sm font-medium text-gray-700">Ili kreiraj prilagođenu:</h3>}
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm text-gray-600">Naziv</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Npr: Podsjetnik 45 dana prije"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-gray-600">Okidač</label>
                  <select
                    value={customTrigger}
                    onChange={(e) => setCustomTrigger(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
                  >
                    <optgroup label="Članstvo">
                      {Object.entries(TRIGGER_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </optgroup>
                    {calendarTriggers.length > 0 && (
                      <optgroup label="Kalendar — Događaji">
                        {calendarTriggers.map((ev) => (
                          <option key={ev.id} value={`calendar_event.${ev.id}`}>
                            {ev.title} ({new Date(ev.date).toLocaleDateString('hr-HR')})
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>
                {customTrigger === 'member.expiry_reminder' && (
                  <div>
                    <label className="mb-1 block text-sm text-gray-600">Dana prije isteka</label>
                    <input
                      type="number"
                      value={customDays}
                      onChange={(e) => setCustomDays(Number(e.target.value))}
                      min={1}
                      max={365}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </div>
                )}
              </div>
              {customTrigger === 'member.expiry_reminder' && (
                <div>
                  <label className="mb-1 block text-sm text-gray-600">Uvjet slanja</label>
                  <select
                    value={customOperator}
                    onChange={(e) => setCustomOperator(e.target.value as 'eq' | 'lte')}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
                  >
                    <option value="eq">Točno taj dan (preporučeno — šalje jednom)</option>
                    <option value="lte">Unutar zadanih dana (ponavlja se svakih ~6 dana do isteka)</option>
                  </select>
                </div>
              )}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-gray-600">Email predložak</label>
                  <select
                    value={customTemplate}
                    onChange={(e) => setCustomTemplate(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
                  >
                    {emailTemplates.map((t) => (
                      <option key={t.slug} value={t.slug}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  {emailTemplates.some((t) => t.slug === customTemplate) && (
                    <div className="mt-1.5 flex gap-3 text-xs">
                      <button
                        type="button"
                        onClick={() => setPreviewTpl(emailTemplates.find((t) => t.slug === customTemplate) || null)}
                        className="font-medium text-primary hover:underline"
                      >
                        Pregled emaila
                      </button>
                      <button
                        type="button"
                        onClick={() => router.push(`/email-templates?edit=${customTemplate}`)}
                        className="font-medium text-primary hover:underline"
                      >
                        Uredi predložak
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-600">Naslov emaila (opcionalno)</label>
                  <input
                    type="text"
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    placeholder="Ako prazno, koristi se iz predloška"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { setShowCreate(false); resetForm(); }}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                >
                  Odustani
                </button>
                <button
                  onClick={saveCustom}
                  disabled={!customName.trim() || !!actionLoading}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-light disabled:opacity-50"
                >
                  {editingSeq ? 'Spremi promjene' : 'Kreiraj'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Existing automations */}
      {sequences.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <p className="text-gray-500">Nema automatizacija. Klikni &quot;+ Nova automatizacija&quot; za početak.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sequences.map((seq) => (
            <div
              key={seq.id}
              className="rounded-xl border border-gray-200 bg-white p-5 transition hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-900">{seq.name}</h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[seq.status] || 'bg-gray-100 text-gray-500'}`}
                    >
                      {STATUS_LABELS[seq.status] || seq.status}
                    </span>
                  </div>
                  {seq.description && (
                    <p className="mt-1 text-sm text-gray-500">{seq.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-400">
                    <span>Okidač: {TRIGGER_LABELS[seq.triggerEvent] || calendarTriggers.find((e) => `calendar_event.${e.id}` === seq.triggerEvent)?.title || seq.triggerEvent}</span>
                    <span>Koraka: {seq.steps?.length || 0}</span>
                    <span>Izvršenja: {seq._count?.logs || 0}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Toggle switch */}
                  <button
                    onClick={() => toggleSequence(seq)}
                    disabled={actionLoading === seq.id}
                    className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                      seq.status === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                    title={seq.status === 'ACTIVE' ? 'Isključi' : 'Uključi'}
                  >
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform duration-200 ${
                        seq.status === 'ACTIVE' ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  {/* Preview email template of this sequence */}
                  {(() => {
                    const mail = seq.steps?.find((s) => ['send_email', 'email'].includes(s.type.toLowerCase()));
                    const tpl = mail && emailTemplates.find((t) => t.slug === mail.config?.template);
                    return tpl ? (
                      <button
                        onClick={() => setPreviewTpl(tpl)}
                        disabled={!!actionLoading}
                        className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30"
                        title="Pregled emaila"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        </svg>
                      </button>
                    ) : null;
                  })()}
                  {/* Test send */}
                  <button
                    onClick={() => testSequence(seq)}
                    disabled={!!actionLoading}
                    className="rounded-lg p-1.5 text-gray-400 transition hover:bg-blue-50 hover:text-blue-600 disabled:opacity-30"
                    title="Pošalji testni email"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                    </svg>
                  </button>
                  {/* Edit */}
                  <button
                    onClick={() => startEdit(seq)}
                    disabled={!!actionLoading}
                    className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30"
                    title="Uredi"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                    </svg>
                  </button>
                  {/* Delete */}
                  <button
                    onClick={() => deleteSequence(seq)}
                    disabled={!!actionLoading}
                    className="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                    title="Obriši"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </>)}

      {/* Analitika */}
      {view === 'analytics' && (
        analyticsLoading || !analytics ? (
          <div className="flex h-64 items-center justify-center">
            <p className="text-gray-500">Učitavanje analitike...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* KPI */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {[
                { n: analytics.kpis.activeSequences, l: 'Aktivnih automatizacija', c: 'text-primary' },
                { n: analytics.kpis.activeMembers, l: 'Aktivnih članova', c: 'text-green-600' },
                { n: analytics.kpis.expiringSoon, l: 'U obnovi (≤60 dana)', c: 'text-yellow-600' },
                { n: analytics.kpis.expiredMembers, l: 'Istekli članovi', c: 'text-red-600' },
                { n: analytics.kpis.pendingMembers, l: 'Na čekanju', c: 'text-gray-700' },
                { n: analytics.kpis.autoEmailsSent, l: 'Automatskih mailova', c: 'text-primary' },
              ].map((k) => (
                <div key={k.l} className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className={`text-2xl font-bold ${k.c}`}>{k.n}</p>
                  <p className="mt-1 text-xs font-medium text-gray-500">{k.l}</p>
                </div>
              ))}
            </div>

            {/* Automatizacije */}
            <div className="space-y-3">
              {analytics.automations.map((a) => {
                const open = openAuto === a.id;
                return (
                  <div key={a.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                    <button
                      onClick={() => setOpenAuto(open ? null : a.id)}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-gray-50"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2.5">
                          <span className="font-semibold text-gray-900">{a.name}</span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[a.status] || 'bg-gray-100 text-gray-500'}`}>
                            {STATUS_LABELS[a.status] || a.status}
                          </span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                          <span>Okidač: {TRIGGER_LABELS[a.triggerEvent] || a.triggerEvent}</span>
                          <span>U automatizaciji: <b className="text-gray-600">{a.audienceCount}</b></span>
                          <span>Poslano: <b className="text-gray-600">{a.sendCount}</b></span>
                          {a.hasAttachment && <span className="text-blue-600">📎 predračun</span>}
                        </div>
                      </div>
                      <svg className={`h-5 w-5 flex-none text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
                      </svg>
                    </button>

                    {open && (
                      <div className="border-t border-gray-100 bg-gray-50/60 p-5">
                        <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
                          {/* Tijek + okidač */}
                          <div className="rounded-lg border border-gray-200 bg-white p-4">
                            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Tijek</h4>
                            <div className="space-y-1.5 text-sm text-gray-700">
                              {a.conditionDay !== null && (
                                <p>⚖ Uvjet: <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">daysUntilExpiry == {a.conditionDay}</code></p>
                              )}
                              <p>✉ Pošalji email: <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">{a.templateSlug ?? '—'}</code></p>
                            </div>
                            <p className="mt-3 text-xs text-gray-400">Okidač: <code className="rounded bg-gray-100 px-1.5 py-0.5">{a.triggerEvent}</code></p>
                          </div>

                          {/* Predložak */}
                          <div className="rounded-lg border border-gray-200 bg-white p-4">
                            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Email predložak</h4>
                            {a.template ? (
                              <div className="space-y-2.5">
                                <p className="text-sm font-medium text-gray-900">{applySampleVars(a.template.subject)}</p>
                                <p className="text-xs text-gray-400">
                                  {a.template.slug}{!a.template.inDb && ' · definiran u kodu'}{a.template.isHidden && ' · skriven'}
                                </p>
                                <div className="flex flex-wrap items-center gap-2">
                                  {a.hasAttachment ? (
                                    <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">📎 Predračun (PDF · HUB-3)</span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">— bez priloga</span>
                                  )}
                                  <button
                                    onClick={() => previewAnalyticsTemplate(a.template!)}
                                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition hover:bg-primary-light"
                                  >
                                    Pregledaj sadržaj maila
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-400">Bez email koraka.</p>
                            )}
                          </div>
                        </div>

                        {/* Audience */}
                        <div className="rounded-lg border border-gray-200 bg-white">
                          <div className="flex items-center justify-between px-4 py-3">
                            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                              Tko je u automatizaciji · {a.audienceCount}
                            </h4>
                          </div>
                          {a.audience.length === 0 ? (
                            <p className="px-4 pb-4 text-sm text-gray-400">Trenutno nitko ne zadovoljava uvjete.</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[520px] text-sm">
                                <thead>
                                  <tr className="border-t border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                                    <th className="px-4 py-2 font-semibold">Član</th>
                                    <th className="px-4 py-2 font-semibold">Email</th>
                                    <th className="px-4 py-2 font-semibold">{AUDIENCE_HEADERS[a.audience[0].dateKind]}</th>
                                    <th className="px-4 py-2 font-semibold">Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {a.audience.map((m) => (
                                    <tr key={m.memberId} className="border-t border-gray-50 hover:bg-gray-50/60">
                                      <td className="px-4 py-2">
                                        <div className="font-medium text-gray-800">{m.name}</div>
                                        {m.company && <div className="text-xs text-gray-400">{m.company}</div>}
                                      </td>
                                      <td className="px-4 py-2 text-xs text-gray-500">{m.email}</td>
                                      <td className="px-4 py-2 text-xs text-gray-500">{m.date ? new Date(m.date).toLocaleDateString('hr-HR') : '—'}</td>
                                      <td className="px-4 py-2">
                                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATE_STYLES[m.state]}`}>{STATE_LABELS[m.state]}</span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                          {a.audienceMore > 0 && (
                            <p className="px-4 py-2.5 text-center text-xs italic text-gray-400">
                              + još {a.audienceMore} (prikazano {a.audience.length})
                            </p>
                          )}
                        </div>

                        {/* Povijest slanja */}
                        {a.sends.length > 0 && (
                          <div className="mt-4 rounded-lg border border-gray-200 bg-white">
                            <h4 className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Povijest slanja · {a.sendCount}</h4>
                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[520px] text-sm">
                                <thead>
                                  <tr className="border-t border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                                    <th className="px-4 py-2 font-semibold">Član</th>
                                    <th className="px-4 py-2 font-semibold">Email</th>
                                    <th className="px-4 py-2 font-semibold">Poslano</th>
                                    <th className="px-4 py-2 font-semibold">Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {a.sends.map((s, i) => (
                                    <tr key={`${s.memberId ?? s.email}-${i}`} className="border-t border-gray-50 hover:bg-gray-50/60">
                                      <td className="px-4 py-2">
                                        <div className="font-medium text-gray-800">{s.name}</div>
                                        {s.company && <div className="text-xs text-gray-400">{s.company}</div>}
                                      </td>
                                      <td className="px-4 py-2 text-xs text-gray-500">{s.email}</td>
                                      <td className="px-4 py-2 text-xs text-gray-500">{s.sentAt ? new Date(s.sentAt).toLocaleString('hr-HR') : '—'}</td>
                                      <td className="px-4 py-2">
                                        <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">{s.status}</span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )
      )}

      {/* Email preview modal */}
      {previewTpl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setPreviewTpl(null)}>
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-gray-900">{previewTpl.name}</p>
                <p className="truncate text-xs text-gray-500">Predmet: {applySampleVars(previewTpl.subject)}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push(`/email-templates?edit=${previewTpl.slug}`)}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Uredi
                </button>
                <button onClick={() => setPreviewTpl(null)} aria-label="Zatvori" className="p-1 text-gray-400 hover:text-gray-700">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <iframe
              title="Pregled emaila"
              srcDoc={buildPreviewHtml(previewTpl)}
              className="w-full flex-1 border-0"
              style={{ minHeight: '420px' }}
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      )}
    </div>
  );
}
