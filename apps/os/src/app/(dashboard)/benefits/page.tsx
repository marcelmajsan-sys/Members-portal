'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '@/lib/api';

interface Grant {
  id: string;
  status: string;
  claimedAt: string | null;
  member: {
    id: string;
    company: { name: string } | null;
    user: { firstName: string; lastName: string; email: string };
  };
}
interface Benefit {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  actionUrl: string | null;
  actionLabel: string | null;
  memberTypes: string[];
  isActive: boolean;
  grants: Grant[];
  eligibleCount: number;
}
interface BenefitMember {
  memberId: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string | null;
  status: string;
  memberStatus: string;
  hasGrant: boolean;
  typeEligible: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  WEB_TRADER: 'Trgovci',
  SERVICE_PROVIDER: 'Nuditelji',
  PHYSICAL: 'Fizičke osobe',
};
const ALL_TYPES = ['WEB_TRADER', 'SERVICE_PROVIDER', 'PHYSICAL'];

const emptyForm = {
  title: '', description: '', category: '', actionUrl: '', actionLabel: 'PREUZMI',
  memberTypes: [] as string[],
};

export default function BenefitsPage() {
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'benefit' | 'category' | 'member'>('benefit');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [membersByBenefit, setMembersByBenefit] = useState<Record<string, BenefitMember[]>>({});
  const [toast, setToast] = useState('');

  // create/edit modal
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // assign member
  const [assignFor, setAssignFor] = useState<string | null>(null);
  const [assignQuery, setAssignQuery] = useState('');
  const [assignResults, setAssignResults] = useState<Array<{ id: string; user: { firstName: string; lastName: string; email: string }; company: { name: string } | null }>>([]);
  const assignTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const fetchBenefits = useCallback(async () => {
    setLoading(true);
    const res = await api.get<Benefit[]>('/api/os/benefits');
    if (res.success && res.data) setBenefits(res.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchBenefits(); }, [fetchBenefits]);

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 3000); }

  function openCreate() {
    setEditId(null); setForm(emptyForm); setShowModal(true);
  }
  function openEdit(b: Benefit) {
    setEditId(b.id);
    setForm({
      title: b.title, description: b.description || '', category: b.category || '',
      actionUrl: b.actionUrl || '', actionLabel: b.actionLabel || 'PREUZMI',
      memberTypes: b.memberTypes || [],
    });
    setShowModal(true);
  }

  async function saveBenefit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const body = { ...form };
    const res = editId
      ? await api.patch(`/api/os/benefits/${editId}`, body)
      : await api.post('/api/os/benefits', body);
    if (res.success) {
      setShowModal(false);
      showToast(editId ? 'Benefit ažuriran' : 'Benefit kreiran');
      fetchBenefits();
    } else {
      showToast(res.error?.message || 'Greška');
    }
    setSaving(false);
  }

  async function deleteBenefit(id: string) {
    if (!confirm('Obrisati ovaj benefit i sve dodjele?')) return;
    const res = await api.del(`/api/os/benefits/${id}`);
    if (res.success) { showToast('Benefit obrisan'); fetchBenefits(); }
  }

  const loadMembers = useCallback(async (benefitId: string) => {
    const res = await api.get<BenefitMember[]>(`/api/os/benefits/${benefitId}/members`);
    if (res.success && res.data) setMembersByBenefit((m) => ({ ...m, [benefitId]: res.data! }));
  }, []);

  function toggleExpand(id: string) {
    setExpanded((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else { n.add(id); loadMembers(id); }
      return n;
    });
  }

  function toggleType(t: string) {
    setForm((f) => ({ ...f, memberTypes: f.memberTypes.includes(t) ? f.memberTypes.filter(x => x !== t) : [...f.memberTypes, t] }));
  }

  // member search for assignment
  useEffect(() => {
    if (assignTimer.current) clearTimeout(assignTimer.current);
    if (assignQuery.trim().length < 2) { setAssignResults([]); return; }
    assignTimer.current = setTimeout(async () => {
      const res = await api.get<typeof assignResults>(`/api/os/members/search?q=${encodeURIComponent(assignQuery)}`);
      if (res.success && res.data) setAssignResults(res.data);
    }, 300);
    return () => { if (assignTimer.current) clearTimeout(assignTimer.current); };
  }, [assignQuery]);

  async function assignMember(benefitId: string, memberId: string) {
    const res = await api.post(`/api/os/benefits/${benefitId}/assign`, { memberId });
    if (res.success) {
      showToast('Benefit dodijeljen članu');
      setAssignFor(null); setAssignQuery(''); setAssignResults([]);
      fetchBenefits(); loadMembers(benefitId);
    } else {
      showToast(res.error?.message || 'Greška');
    }
  }

  async function unassign(benefitId: string, memberId: string) {
    const res = await api.del(`/api/os/benefits/${benefitId}/assign/${memberId}`);
    if (res.success) { showToast('Dodjela uklonjena'); fetchBenefits(); loadMembers(benefitId); }
  }

  const q = search.trim().toLowerCase();
  const filtered = q
    ? benefits.filter(b => b.title.toLowerCase().includes(q) || (b.category || '').toLowerCase().includes(q))
    : benefits;

  // stats
  const totalGrants = benefits.reduce((a, b) => a + b.grants.length, 0);
  const claimed = benefits.reduce((a, b) => a + b.grants.filter(g => g.status === 'CLAIMED').length, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Benefiti</h1>
          <p className="mt-1 text-sm text-gray-500">Pregled svih benefita i članovi koji ih imaju</p>
        </div>
        <button onClick={openCreate} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-dark">
          + Dodaj benefit
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Benefita" value={benefits.length} />
        <StatCard label="Dodijeljeno / ciljano" value={totalGrants} />
        <StatCard label="Iskorišteno" value={claimed} />
        <StatCard label="Aktivnih" value={benefits.filter(b => b.isActive).length} />
      </div>

      {/* Tabs + search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {([['benefit', 'Po benefitu'], ['category', 'Po kategoriji'], ['member', 'Po članu']] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setView(k)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${view === k ? 'bg-accent text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pretraži benefite..."
          className="w-full max-w-xs rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 sm:w-64"
        />
      </div>

      {toast && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{toast}</div>}

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-400">Učitavanje...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-400">Nema benefita. Kliknite „+ Dodaj benefit“.</div>
      ) : view === 'member' ? (
        <MemberView benefits={filtered} onUnassign={unassign} />
      ) : view === 'category' ? (
        <CategoryView benefits={filtered} />
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => (
            <div key={b.id} className="rounded-xl border border-gray-200 bg-white">
              <div className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-accent">🎁</span>
                    <p className="font-semibold text-gray-900">{b.title}</p>
                    {!b.isActive && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">neaktivan</span>}
                    <button onClick={() => openEdit(b)} className="text-gray-400 hover:text-gray-700" title="Uredi">✎</button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {b.eligibleCount} {b.eligibleCount === 1 ? 'član' : 'članova'} · {b.grants.filter(g => g.status === 'CLAIMED').length} iskoristilo
                    {b.memberTypes.length > 0 && <> · cilja: {b.memberTypes.map(t => TYPE_LABELS[t]).join(', ')}</>}
                    {b.category && <> · {b.category}</>}
                  </p>
                </div>
                <button onClick={() => deleteBenefit(b.id)} className="shrink-0 text-gray-300 hover:text-red-500" title="Obriši">🗑</button>
              </div>

              {expanded.has(b.id) && (
                <div className="border-t border-gray-100 px-4 py-3">
                  {membersByBenefit[b.id] === undefined ? (
                    <p className="text-sm text-gray-400">Učitavanje članova...</p>
                  ) : membersByBenefit[b.id].length === 0 ? (
                    <p className="text-sm text-gray-400">Nijedan član nema ovaj benefit.</p>
                  ) : (
                    <ul className="max-h-80 space-y-2 overflow-auto">
                      {membersByBenefit[b.id].map((m) => {
                        const active = m.memberStatus === 'ACTIVE';
                        return (
                        <li key={m.memberId} className="flex items-center justify-between gap-3 text-sm">
                          <div className="min-w-0">
                            <span className="text-gray-900">{m.firstName} {m.lastName}</span>
                            <span className="text-gray-400"> · {m.company || m.email}</span>
                            {m.status === 'CLAIMED' ? (
                              <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">Iskoristio</span>
                            ) : active ? (
                              <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">Može koristiti</span>
                            ) : (
                              <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">Neaktivan — produžiti</span>
                            )}
                          </div>
                          {m.hasGrant && !m.typeEligible && (
                            <button onClick={() => unassign(b.id, m.memberId)} className="shrink-0 text-xs text-gray-400 hover:text-red-500">ukloni</button>
                          )}
                        </li>
                        );
                      })}
                    </ul>
                  )}

                  {/* assign member */}
                  {assignFor === b.id ? (
                    <div className="relative mt-3">
                      <input
                        autoFocus
                        value={assignQuery}
                        onChange={(e) => setAssignQuery(e.target.value)}
                        placeholder="Pretraži člana po imenu / firmi / emailu..."
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary"
                      />
                      {assignResults.length > 0 && (
                        <div className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                          {assignResults.map((m) => (
                            <button
                              key={m.id}
                              onClick={() => assignMember(b.id, m.id)}
                              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50"
                            >
                              <span>{m.user.firstName} {m.user.lastName}</span>
                              <span className="text-xs text-gray-400">{m.company?.name || m.user.email}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      <button onClick={() => { setAssignFor(null); setAssignQuery(''); }} className="mt-2 text-xs text-gray-400 hover:text-gray-600">odustani</button>
                    </div>
                  ) : (
                    <button onClick={() => setAssignFor(b.id)} className="mt-3 text-sm text-primary hover:underline">+ Dodaj člana</button>
                  )}
                </div>
              )}

              <button onClick={() => toggleExpand(b.id)} className="w-full border-t border-gray-100 py-2 text-center text-sm text-gray-500 hover:bg-gray-50">
                {expanded.has(b.id) ? '⌃ Sakrij članove' : '⌄ Prikaži / dodijeli članove'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-bold text-gray-900">{editId ? 'Uredi benefit' : 'Novi benefit'}</h2>
            <form onSubmit={saveBenefit} className="space-y-3">
              <Field label="Naziv *">
                <input required value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="npr. Ulaznica za CRO Commerce konferenciju" />
              </Field>
              <Field label="Opis">
                <textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm" rows={2} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Kategorija"><input value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="npr. Događanja" /></Field>
                <Field label="Tekst gumba za link"><input value={form.actionLabel} onChange={(e) => setForm(f => ({ ...f, actionLabel: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="PREUZMI" /></Field>
              </div>
              <Field label="Link (opcionalno)">
                <input value={form.actionUrl} onChange={(e) => setForm(f => ({ ...f, actionUrl: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="https://..." />
              </Field>
              <Field label="Dostupno tipovima članstva">
                <div className="flex flex-wrap gap-2">
                  {ALL_TYPES.map((t) => (
                    <button type="button" key={t} onClick={() => toggleType(t)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${form.memberTypes.includes(t) ? 'border-primary bg-primary text-white' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}>
                      {TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-xs text-gray-400">Ostavi prazno ako benefit dodjeljuješ samo pojedinačnim članovima.</p>
              </Field>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Odustani</button>
                <button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-light disabled:opacity-50">
                  {saving ? 'Spremanje...' : 'Spremi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
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

function CategoryView({ benefits }: { benefits: Benefit[] }) {
  const byCat = new Map<string, Benefit[]>();
  for (const b of benefits) {
    const c = b.category || 'Bez kategorije';
    if (!byCat.has(c)) byCat.set(c, []);
    byCat.get(c)!.push(b);
  }
  return (
    <div className="space-y-4">
      {[...byCat.entries()].map(([cat, items]) => (
        <div key={cat} className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-2 font-semibold text-gray-900">{cat} <span className="text-gray-400">({items.length})</span></p>
          <ul className="space-y-1">
            {items.map((b) => (
              <li key={b.id} className="text-sm text-gray-700">🎁 {b.title}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function MemberView({ benefits, onUnassign }: { benefits: Benefit[]; onUnassign: (bId: string, mId: string) => void }) {
  // group grants by member
  const byMember = new Map<string, { name: string; sub: string; items: Array<{ benefitId: string; title: string; status: string }> }>();
  for (const b of benefits) {
    for (const g of b.grants) {
      const key = g.member.id;
      if (!byMember.has(key)) {
        byMember.set(key, {
          name: `${g.member.user.firstName} ${g.member.user.lastName}`,
          sub: g.member.company?.name || g.member.user.email,
          items: [],
        });
      }
      byMember.get(key)!.items.push({ benefitId: b.id, title: b.title, status: g.status });
    }
  }
  const entries = [...byMember.entries()];
  if (entries.length === 0) {
    return <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-400">Nijedan benefit nije pojedinačno dodijeljen članovima. (Benefiti ciljani po tipu članstva vide se na portalu člana.)</div>;
  }
  return (
    <div className="space-y-3">
      {entries.map(([mid, m]) => (
        <div key={mid} className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="font-semibold text-gray-900">{m.name} <span className="font-normal text-gray-400">· {m.sub}</span></p>
          <ul className="mt-2 space-y-1">
            {m.items.map((it) => (
              <li key={it.benefitId} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">🎁 {it.title}
                  <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${it.status === 'CLAIMED' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                    {it.status === 'CLAIMED' ? 'Iskoristio' : 'Dostupno'}
                  </span>
                </span>
                <button onClick={() => onUnassign(it.benefitId, mid)} className="text-xs text-gray-400 hover:text-red-500">ukloni</button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
