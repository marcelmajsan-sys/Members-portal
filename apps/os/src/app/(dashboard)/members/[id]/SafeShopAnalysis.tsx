'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Checkpoint {
  n: number;
  title: string;
  pass: boolean;
  note: string;
}
interface SafeShopAnalysisData {
  id: string;
  websiteUrl: string;
  status: string;
  score: number | null;
  passed: boolean | null;
  summary: string | null;
  analyst: string | null;
  result: Checkpoint[] | null;
  createdAt: string;
}
interface Quota { used: number; remaining: number; limit: number }

const DEFAULT_ANALYST = 'AI sustav Udruge eCommerce Hrvatska';

function fmtDate(d: string | null) {
  if (!d) return '—';
  const date = new Date(d);
  return isNaN(date.getTime()) ? '—' : date.toLocaleDateString('hr-HR');
}

export default function SafeShopAnalysis({
  memberId,
  companyName,
  websiteUrl,
}: {
  memberId: string;
  companyName: string;
  websiteUrl?: string;
}) {
  const [analysis, setAnalysis] = useState<SafeShopAnalysisData | null>(null);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  // Uređivanje
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editSummary, setEditSummary] = useState('');
  const [editAnalyst, setEditAnalyst] = useState('');
  const [editCheckpoints, setEditCheckpoints] = useState<Checkpoint[]>([]);

  function refreshQuota() {
    api.get<Quota>(`/api/os/members/${memberId}/safeshop-analysis/quota`).then((res) => {
      if (res.success && res.data) setQuota(res.data);
    });
  }

  useEffect(() => {
    refreshQuota();
    api.get<SafeShopAnalysisData | null>(`/api/os/members/${memberId}/safeshop-analysis`).then((res) => {
      if (res.success && res.data) {
        setAnalysis(res.data);
        if (res.data.status === 'PENDING') poll();
      }
    });
  }, [memberId]);

  async function poll(maxMs = 180000) {
    setRunning(true);
    const start = Date.now();
    while (Date.now() - start < maxMs) {
      await new Promise((r) => setTimeout(r, 5000));
      const res = await api.get<SafeShopAnalysisData | null>(`/api/os/members/${memberId}/safeshop-analysis`);
      if (res.success && res.data) {
        if (res.data.status === 'COMPLETED') { setAnalysis(res.data); setRunning(false); refreshQuota(); return; }
        if (res.data.status === 'FAILED') { setAnalysis(res.data); setError('Analiza nije uspjela. Pokušajte ponovno.'); setRunning(false); return; }
      }
    }
    setRunning(false);
    setError('Analiza traje duže nego inače — osvježite stranicu za koju minutu.');
  }

  async function run() {
    setError('');
    setEditing(false);
    setRunning(true);
    const res = await api.post<SafeShopAnalysisData>(`/api/os/members/${memberId}/safeshop-analysis`).catch(() => null);
    if (res && res.success && res.data?.status === 'COMPLETED') { setAnalysis(res.data); setRunning(false); refreshQuota(); return; }
    if (res && !res.success && res.error && res.error.code !== 'CONFLICT' && res.error.code !== 'NETWORK_ERROR') {
      setError(res.error.message || 'Analiza nije uspjela.');
      setRunning(false);
      refreshQuota();
      return;
    }
    await poll();
  }

  function startEdit() {
    if (!analysis) return;
    setEditSummary(analysis.summary ?? '');
    setEditAnalyst(analysis.analyst ?? DEFAULT_ANALYST);
    setEditCheckpoints((analysis.result ?? []).map((c) => ({ ...c })));
    setEditing(true);
  }

  async function save() {
    if (!analysis) return;
    setSaving(true);
    const res = await api
      .patch<SafeShopAnalysisData>(`/api/os/safeshop-analysis/${analysis.id}`, {
        summary: editSummary,
        analyst: editAnalyst,
        checkpoints: editCheckpoints,
      })
      .catch(() => null);
    setSaving(false);
    if (res && res.success && res.data) {
      setAnalysis(res.data);
      setEditing(false);
    } else {
      setError('Spremanje nije uspjelo.');
    }
  }

  function downloadPdf() {
    const prev = document.title;
    document.title = `Safe Shop analiza - ${companyName}`;
    window.print();
    document.title = prev;
  }

  function setCp(i: number, patch: Partial<Checkpoint>) {
    setEditCheckpoints((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  // Prikazne vrijednosti (u edit modu odražavaju nespremljene izmjene).
  const checkpoints = editing ? editCheckpoints : analysis?.result ?? [];
  const summary = editing ? editSummary : analysis?.summary ?? '';
  const score = editing ? editCheckpoints.filter((c) => c.pass).length : analysis?.score ?? 0;
  const passed = score >= 9;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Safe Shop analiza (certifikacija)</h2>
          <p className="mt-1 text-xs text-gray-500">
            Automatska provjera webshopa po 10 Safe Shop kriterija. Prolaz: 9/10 ili 10/10.
          </p>
        </div>
        <div className="no-print flex shrink-0 flex-col items-end gap-1">
          <div className="flex flex-wrap justify-end gap-2">
            {analysis?.status === 'COMPLETED' && !editing && (
              <>
                <button onClick={downloadPdf} className="rounded-md border border-gray-300 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-gray-100">
                  Preuzmi PDF
                </button>
                <button onClick={startEdit} className="rounded-md border border-gray-300 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-gray-100">
                  Uredi
                </button>
              </>
            )}
            {editing && (
              <>
                <button onClick={save} disabled={saving} className="rounded-md bg-primary px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-dark disabled:opacity-50">
                  {saving ? 'Spremam…' : 'Spremi'}
                </button>
                <button onClick={() => setEditing(false)} disabled={saving} className="rounded-md border border-gray-300 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-100">
                  Odustani
                </button>
              </>
            )}
            {websiteUrl ? (
              !editing && (
                <button
                  onClick={run}
                  disabled={running || (quota?.remaining ?? 1) <= 0}
                  title={(quota?.remaining ?? 1) <= 0 ? 'Iskorišten godišnji limit (2 analize)' : undefined}
                  className="rounded-md border border-gray-300 bg-gray-50 px-4 py-1.5 text-sm font-semibold uppercase tracking-wide text-primary transition hover:bg-gray-100 disabled:opacity-50"
                >
                  {running ? 'Analiziram…' : analysis ? 'Pokreni ponovno' : 'Pokreni analizu'}
                </button>
              )
            ) : (
              <span className="text-xs text-gray-400">Član nema upisanu web adresu.</span>
            )}
          </div>
          {quota && !editing && (
            <p className="text-xs text-gray-500">
              Odrađeno {quota.used}/{quota.limit} ove godine
              {quota.remaining <= 0 ? ' · godišnji limit iskorišten' : ` · preostalo ${quota.remaining}`}
            </p>
          )}
        </div>
      </div>

      {running ? (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-6 text-sm text-gray-500">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-primary" />
          Provjeravam webshop po 10 kriterija, može potrajati nekoliko minuta…
        </div>
      ) : error ? (
        <p className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</p>
      ) : analysis && analysis.status === 'COMPLETED' && checkpoints.length > 0 ? (
        <div id="safeshop-print" className="mt-5">
          {/* Zaglavlje vidljivo samo u PDF ispisu */}
          <div className="print-only safeshop-pdf-header">
            <img src="/admin/safeshop-logo.svg" alt="Safe Shop" style={{ height: 48 }} />
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 400, letterSpacing: 1 }}>SAFE SHOP ANALIZA</h1>
              <p style={{ fontSize: 12, color: '#2A6F97' }}>Certifikacijsko tijelo: Udruga eCommerce Hrvatska</p>
              {editing ? (
                <div className="no-print mt-1 flex items-center gap-2">
                  <span style={{ fontSize: 12, color: '#555' }}>Analizu odradio:</span>
                  <input
                    value={editAnalyst}
                    onChange={(e) => setEditAnalyst(e.target.value)}
                    className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700"
                    style={{ minWidth: 280 }}
                  />
                </div>
              ) : (
                <p style={{ fontSize: 12, color: '#555' }}>
                  Analizu odradio: {analysis.analyst || DEFAULT_ANALYST}
                </p>
              )}
            </div>
          </div>

          <div className="print-only" style={{ marginTop: 16 }}>
            <h3 style={{ color: '#2A6F97', fontSize: 15 }}>Opis projekta:</h3>
            <p style={{ fontSize: 12, marginTop: 4 }}>
              Analiza je provedena sukladno eCommerce Kodeksu Ponašanja objavljenom na stranici:
              https://ecommerce.hr/ecommerce-hrvatska-safe-shop/
            </p>
            <p style={{ fontSize: 12, marginTop: 4 }}>
              Dodatno, savjetovat ćemo trgovca sukladno najboljoj praksi ustanovljenoj u Udruzi eCommerce Hrvatska.
            </p>
          </div>

          {/* Rezultat */}
          <div className="mt-1 flex items-center gap-4 border-b border-gray-100 pb-5 safeshop-result">
            <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-sm font-bold ${passed ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
              {score}/10
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900">{passed ? 'Uspješna certifikacija' : 'Potrebne dorade'}</p>
              {editing ? (
                <textarea
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  rows={4}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700"
                  placeholder="Komentar…"
                />
              ) : (
                summary && <p className="mt-0.5 text-sm text-gray-600">{summary}</p>
              )}
              <p className="mt-1 text-xs text-gray-400">{analysis.websiteUrl} · Analizirano {fmtDate(analysis.createdAt)}</p>
            </div>
          </div>

          <p className="print-only" style={{ fontSize: 9, color: '#777', marginTop: 8 }}>
            *Napomena: Ovaj dokument ne predstavlja jamstvo potpune pravne usklađenosti webshopa, već potvrđuje da su
            ispunjeni osnovni kriteriji certifikacije. Za detaljnu i sveobuhvatnu pravnu provjeru preporučujemo
            savjetovanje s pravnim stručnjakom.
          </p>

          {/* 10 kriterija */}
          <ul className="mt-4 space-y-3">
            {checkpoints.map((c, i) => (
              <li key={c.n} className="flex items-start gap-3 safeshop-criterion">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gray-300 text-xs font-semibold text-gray-600">
                  {c.n}
                </span>
                <div className="min-w-0 flex-1">
                  {editing ? (
                    <>
                      <input
                        value={c.title}
                        onChange={(e) => setCp(i, { title: e.target.value })}
                        className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm font-semibold text-gray-900"
                      />
                      <textarea
                        value={c.note}
                        onChange={(e) => setCp(i, { note: e.target.value })}
                        rows={3}
                        className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600"
                      />
                    </>
                  ) : (
                    <>
                      <p className={`text-sm font-semibold ${c.pass ? 'text-gray-900' : 'text-amber-700'}`}>{c.title}</p>
                      {c.note && <p className="mt-0.5 text-xs text-gray-500">{c.note}</p>}
                    </>
                  )}
                </div>
                {editing ? (
                  <button
                    type="button"
                    onClick={() => setCp(i, { pass: !c.pass })}
                    className={`no-print shrink-0 rounded-md border px-2.5 py-1 text-xs font-semibold transition ${c.pass ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100' : 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'}`}
                    title="Klikni za prebacivanje: prolazno ↔ neprolazno"
                  >
                    {c.pass ? '☑ Prolazno' : '☐ Neprolazno'}
                  </button>
                ) : (
                  <span className={`shrink-0 text-base font-bold ${c.pass ? 'text-green-600' : 'text-red-500'}`}>
                    {c.pass ? '☑' : '☐'}
                  </span>
                )}
              </li>
            ))}
          </ul>

          <div className="print-only safeshop-pdf-footer">© Copyright 2026. - eCommerce Hrvatska</div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-gray-500">
          Pokreni analizu da sustav provjeri webshop po 10 Safe Shop kriterija i predloži prolaznu ocjenu.
        </p>
      )}
    </div>
  );
}
