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
  result: Checkpoint[] | null;
  createdAt: string;
}

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
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
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
        if (res.data.status === 'COMPLETED') { setAnalysis(res.data); setRunning(false); return; }
        if (res.data.status === 'FAILED') { setAnalysis(res.data); setError('Analiza nije uspjela. Pokušajte ponovno.'); setRunning(false); return; }
      }
    }
    setRunning(false);
    setError('Analiza traje duže nego inače — osvježite stranicu za koju minutu.');
  }

  async function run() {
    setError('');
    setRunning(true);
    const res = await api.post<SafeShopAnalysisData>(`/api/os/members/${memberId}/safeshop-analysis`).catch(() => null);
    if (res && res.success && res.data?.status === 'COMPLETED') { setAnalysis(res.data); setRunning(false); return; }
    if (res && !res.success && res.error && res.error.code !== 'CONFLICT' && res.error.code !== 'NETWORK_ERROR') {
      setError(res.error.message || 'Analiza nije uspjela.');
      setRunning(false);
      return;
    }
    await poll();
  }

  function downloadPdf() {
    const prev = document.title;
    document.title = `Safe Shop analiza - ${companyName}`;
    window.print();
    document.title = prev;
  }

  const score = analysis?.score ?? 0;
  const passed = analysis?.passed ?? false;
  const checkpoints = analysis?.result ?? [];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Safe Shop analiza (certifikacija)</h2>
          <p className="mt-1 text-xs text-gray-500">
            Automatska provjera webshopa po 10 Safe Shop kriterija. Prolaz: 9/10 ili 10/10.
          </p>
        </div>
        <div className="no-print flex shrink-0 gap-2">
          {analysis?.status === 'COMPLETED' && (
            <button
              onClick={downloadPdf}
              className="rounded-md border border-gray-300 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-gray-100"
            >
              Preuzmi PDF
            </button>
          )}
          {websiteUrl ? (
            <button
              onClick={run}
              disabled={running}
              className="rounded-md border border-gray-300 bg-gray-50 px-4 py-1.5 text-sm font-semibold uppercase tracking-wide text-primary transition hover:bg-gray-100 disabled:opacity-50"
            >
              {running ? 'Analiziram…' : analysis ? 'Pokreni ponovno' : 'Pokreni analizu'}
            </button>
          ) : (
            <span className="text-xs text-gray-400">Član nema upisanu web adresu.</span>
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
            <img src="/admin/logo.png" alt="eCommerce Hrvatska" style={{ height: 40 }} />
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 400, letterSpacing: 1 }}>SAFE SHOP ANALIZA</h1>
              <p style={{ fontSize: 12, color: '#2A6F97' }}>Izvođač: Udruga eCommerce Hrvatska</p>
              <p style={{ fontSize: 12, color: '#555' }}>Analizu odradio: AI sustav Udruge eCommerce Hrvatska</p>
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
            <span
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                passed ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
              }`}
            >
              {score}/10
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">
                {passed ? 'Uspješna certifikacija' : 'Potrebne dorade'}
              </p>
              {analysis.summary && <p className="mt-0.5 text-sm text-gray-600">{analysis.summary}</p>}
              <p className="mt-1 text-xs text-gray-400">
                {analysis.websiteUrl} · Analizirano {fmtDate(analysis.createdAt)}
              </p>
            </div>
          </div>

          <p className="print-only" style={{ fontSize: 9, color: '#777', marginTop: 8 }}>
            *Napomena: Ovaj dokument ne predstavlja jamstvo potpune pravne usklađenosti webshopa, već potvrđuje da su
            ispunjeni osnovni kriteriji certifikacije. Za detaljnu i sveobuhvatnu pravnu provjeru preporučujemo
            savjetovanje s pravnim stručnjakom.
          </p>

          {/* 10 kriterija */}
          <ul className="mt-4 space-y-3">
            {checkpoints.map((c) => (
              <li key={c.n} className="flex items-start gap-3 safeshop-criterion">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gray-300 text-xs font-semibold text-gray-600">
                  {c.n}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold ${c.pass ? 'text-gray-900' : 'text-amber-700'}`}>{c.title}</p>
                  {c.note && <p className="mt-0.5 text-xs text-gray-500">{c.note}</p>}
                </div>
                <span className={`shrink-0 text-base font-bold ${c.pass ? 'text-green-600' : 'text-red-500'}`}>
                  {c.pass ? '☑' : '☐'}
                </span>
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
