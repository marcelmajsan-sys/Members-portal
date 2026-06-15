'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import PriceTrendChart from '@/components/PriceTrendChart';

interface Competitor {
  id: string;
  name: string;
  website: string;
  industry: string;
  categoryUrls: string[];
  lastScanAt: string | null;
  score: number | null;
}

interface ScanResultRaw {
  id: string;
  metrics: {
    techStack?: string[];
    paymentMethods?: string[];
    strengths?: string[];
    weaknesses?: string[];
    score?: number;
  };
  scannedAt: string;
}

interface ScanResult {
  id: string;
  techStack: string[];
  paymentMethods: string[];
  strengths: string[];
  weaknesses: string[];
  score: number;
  createdAt: string;
}

interface ProductPrice {
  name: string;
  price: number;
  currency: string;
  url: string;
}

interface PriceChange {
  name: string;
  oldPrice: number;
  newPrice: number;
  currency: string;
  url: string;
  changePercent: number;
}

interface PriceDiff {
  added: ProductPrice[];
  removed: ProductPrice[];
  priceChanges: PriceChange[];
}

interface PriceSnapshot {
  id: string;
  categoryUrl: string;
  products: ProductPrice[];
  diff: PriceDiff | null;
  scannedAt: string;
}

interface ScanSchedule {
  id: string;
  competitorId: string;
  categoryUrl: string;
  frequency: string;
  lastRunAt: string | null;
  isActive: boolean;
}

interface TrendDataPoint {
  date: string;
  price: number;
}

function mapScan(raw: ScanResultRaw): ScanResult {
  return {
    id: raw.id,
    techStack: raw.metrics?.techStack || [],
    paymentMethods: raw.metrics?.paymentMethods || [],
    strengths: raw.metrics?.strengths || [],
    weaknesses: raw.metrics?.weaknesses || [],
    score: raw.metrics?.score || 0,
    createdAt: raw.scannedAt,
  };
}

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat('hr-HR', { style: 'currency', currency }).format(price);
}

function shortUrl(url: string) {
  try {
    const u = new URL(url);
    return u.pathname.length > 40 ? u.pathname.slice(0, 40) + '...' : u.pathname;
  } catch {
    return url.slice(0, 50);
  }
}

export default function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', website: '', industry: '' });
  const [submitting, setSubmitting] = useState(false);
  const [scanning, setScanning] = useState<string | null>(null);
  const [priceScanning, setPriceScanning] = useState<string | null>(null);
  const [selectedScans, setSelectedScans] = useState<{ competitorId: string; scans: ScanResult[] } | null>(null);
  const [selectedPrices, setSelectedPrices] = useState<{ competitorId: string; snapshot: PriceSnapshot } | null>(null);
  const [pasteModal, setPasteModal] = useState<{ competitorId: string; categoryUrl: string } | null>(null);
  const [pastedHtml, setPastedHtml] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  // Category URL management
  const [categoryModal, setCategoryModal] = useState<string | null>(null); // competitorId
  const [newCategoryUrl, setNewCategoryUrl] = useState('');
  // Schedules
  const [schedules, setSchedules] = useState<Record<string, ScanSchedule[]>>({});
  // Trend chart
  const [trendData, setTrendData] = useState<{ productName: string; data: TrendDataPoint[] } | null>(null);

  async function loadCompetitors() {
    const res = await api.get<Competitor[]>('/api/member/competitors');
    if (res.success && res.data) {
      setCompetitors(Array.isArray(res.data) ? res.data : []);
    } else {
      setError('Greška pri učitavanju konkurenata');
    }
    setLoading(false);
  }

  const triggerAutoScan = useCallback(async () => {
    await api.post('/api/member/competitors/auto-scan');
  }, []);

  useEffect(() => {
    loadCompetitors();
    triggerAutoScan();
  }, [triggerAutoScan]);

  async function loadSchedules(competitorId: string) {
    const res = await api.get<ScanSchedule[]>(`/api/member/competitors/${competitorId}/schedules`);
    if (res.success && res.data) {
      setSchedules((prev) => ({ ...prev, [competitorId]: Array.isArray(res.data) ? res.data : [] }));
    }
  }

  async function toggleSchedule(competitorId: string, categoryUrl: string) {
    const existing = schedules[competitorId]?.find((s) => s.categoryUrl === categoryUrl);
    if (existing) {
      await api.del(`/api/member/competitors/schedules/${existing.id}`);
      setSchedules((prev) => ({
        ...prev,
        [competitorId]: (prev[competitorId] || []).filter((s) => s.id !== existing.id),
      }));
    } else {
      const res = await api.post<ScanSchedule>(`/api/member/competitors/${competitorId}/schedules`, {
        categoryUrl,
        frequency: 'WEEKLY',
      });
      if (res.success && res.data) {
        setSchedules((prev) => ({
          ...prev,
          [competitorId]: [...(prev[competitorId] || []), res.data!],
        }));
      }
    }
  }

  async function loadPriceTrend(competitorId: string, productName: string, categoryUrl: string) {
    const res = await api.get<TrendDataPoint[]>(
      `/api/member/competitors/${competitorId}/prices/history?productName=${encodeURIComponent(productName)}&categoryUrl=${encodeURIComponent(categoryUrl)}`,
    );
    if (res.success && res.data && Array.isArray(res.data) && res.data.length > 0) {
      setTrendData({ productName, data: res.data });
    } else {
      setTrendData(null);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await api.post<Competitor>('/api/member/competitors', formData);
    if (res.success && res.data) {
      setCompetitors((prev) => [...prev, res.data!]);
      setFormData({ name: '', website: '', industry: '' });
      setShowForm(false);
    } else {
      setError(res.error?.message || 'Greška pri dodavanju');
    }
    setSubmitting(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Jeste li sigurni da želite obrisati ovog konkurenta?')) return;
    setDeleting(id);
    const res = await api.del(`/api/member/competitors/${id}`);
    if (res.success) {
      setCompetitors((prev) => prev.filter((c) => c.id !== id));
    } else {
      setError(res.error?.message || 'Greška pri brisanju');
    }
    setDeleting(null);
  }

  async function handleScan(id: string) {
    setScanning(id);
    const res = await api.post<ScanResult>(`/api/member/competitors/${id}/scan`);
    if (res.success) {
      await loadCompetitors();
    } else {
      setError(res.error?.message || 'Greška pri skeniranju');
    }
    setScanning(null);
  }

  async function handleAddCategory(competitorId: string) {
    if (!newCategoryUrl) return;
    try {
      new URL(newCategoryUrl);
    } catch {
      setError('Unesite ispravan URL');
      return;
    }
    const competitor = competitors.find((c) => c.id === competitorId);
    if (!competitor) return;

    const updated = [...competitor.categoryUrls, newCategoryUrl];
    const res = await api.put<Competitor>(`/api/member/competitors/${competitorId}`, { categoryUrls: updated });
    if (res.success && res.data) {
      setCompetitors((prev) => prev.map((c) => (c.id === competitorId ? { ...c, categoryUrls: res.data!.categoryUrls } : c)));
      setNewCategoryUrl('');
    } else {
      setError(res.error?.message || 'Greška pri dodavanju kategorije');
    }
  }

  async function handleRemoveCategory(competitorId: string, urlToRemove: string) {
    const competitor = competitors.find((c) => c.id === competitorId);
    if (!competitor) return;

    const updated = competitor.categoryUrls.filter((u) => u !== urlToRemove);
    const res = await api.put<Competitor>(`/api/member/competitors/${competitorId}`, { categoryUrls: updated });
    if (res.success && res.data) {
      setCompetitors((prev) => prev.map((c) => (c.id === competitorId ? { ...c, categoryUrls: res.data!.categoryUrls } : c)));
    }
  }

  async function handlePriceScan(competitorId: string, categoryUrl: string) {
    setPriceScanning(competitorId);
    setError('');

    try {
      const fetchRes = await fetch('/api/fetch-html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: categoryUrl }),
      });

      const fetchData = await fetchRes.json();

      if (!fetchRes.ok || !fetchData.html || fetchData.html.length < 500) {
        setPriceScanning(null);
        setPasteModal({ competitorId, categoryUrl });
        setPastedHtml('');
        return;
      }

      await sendHtmlForPriceScan(competitorId, categoryUrl, fetchData.html);
    } catch {
      setPriceScanning(null);
      setPasteModal({ competitorId, categoryUrl });
      setPastedHtml('');
    }
  }

  async function sendHtmlForPriceScan(competitorId: string, categoryUrl: string, html: string) {
    setPriceScanning(competitorId);
    setError('');

    const res = await api.post<PriceSnapshot>(`/api/member/competitors/${competitorId}/prices/scan`, { html, categoryUrl });

    if (res.success && res.data) {
      setSelectedPrices({ competitorId, snapshot: res.data });
      setPasteModal(null);
      setPastedHtml('');
    } else {
      setError(res.error?.message || 'Greška pri skeniranju cijena');
    }

    setPriceScanning(null);
  }

  async function handlePasteSubmit() {
    if (!pasteModal || !pastedHtml || pastedHtml.length < 200) {
      setError('Zalijepite cijeli izvorni kod stranice');
      return;
    }
    if (
      pastedHtml.includes('cf-error-details') ||
      pastedHtml.includes('Attention Required! | Cloudflare') ||
      pastedHtml.includes('you have been blocked') ||
      pastedHtml.includes('cf-chl') ||
      pastedHtml.includes('_cf_chl') ||
      (pastedHtml.includes("createElement('iframe')") && !pastedHtml.includes('product'))
    ) {
      setError('Zalijepili ste Cloudflare zaštitnu stranicu, ne pravu stranicu s proizvodima. Otvorite stranicu, pričekajte da se potpuno učita (da vidite proizvode), pa tek onda kopirajte HTML.');
      return;
    }
    await sendHtmlForPriceScan(pasteModal.competitorId, pasteModal.categoryUrl, pastedHtml);
  }

  async function viewScans(competitorId: string) {
    const res = await api.get<ScanResultRaw[]>(`/api/member/competitors/${competitorId}/scans`);
    if (res.success && res.data) {
      const raw = Array.isArray(res.data) ? res.data : [];
      setSelectedScans({ competitorId, scans: raw.map(mapScan) });
    }
  }

  async function viewPrices(competitorId: string, categoryUrl: string) {
    const res = await api.get<PriceSnapshot>(`/api/member/competitors/${competitorId}/prices/latest?categoryUrl=${encodeURIComponent(categoryUrl)}`);
    if (res.success && res.data) {
      setSelectedPrices({ competitorId, snapshot: res.data });
    } else {
      setError('Nema podataka o cijenama za ovu kategoriju. Pokrenite skeniranje.');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-text-secondary">Učitavanje...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-heading font-heading">Konkurenti</h1>
          <p className="text-text-secondary mt-1">Pratite i analizirajte svoje konkurente</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-accent text-primary px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent-light transition-colors cursor-pointer"
        >
          {showForm ? 'Zatvori' : 'Dodaj konkurenta'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-error text-sm rounded-lg px-4 py-3 border border-red-200">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline cursor-pointer">
            Zatvori
          </button>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold text-text-heading">Novi konkurent</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-body mb-1">Naziv</label>
              <input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Naziv tvrtke"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-body mb-1">Web stranica</label>
              <input
                required
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-body mb-1">Industrija</label>
              <input
                required
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="npr. Moda, Elektronika"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-light transition-colors disabled:opacity-50 cursor-pointer"
          >
            {submitting ? 'Dodavanje...' : 'Dodaj'}
          </button>
        </form>
      )}

      {/* Competitors list */}
      {competitors.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border shadow-sm p-10 text-center">
          <p className="text-text-secondary">Nemate dodanih konkurenata</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-3 text-sm text-primary hover:text-primary-light cursor-pointer"
          >
            Dodajte prvog konkurenta
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {competitors.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl border border-border shadow-sm p-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-semibold text-text-heading">{c.name}</h3>
                    {c.score !== null && (
                      <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        Score: {c.score}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-text-secondary mt-1">{c.website}</p>
                  <div className="flex flex-wrap gap-4 mt-1 text-xs text-text-secondary">
                    <span>Industrija: {c.industry}</span>
                    {c.lastScanAt && (
                      <span>Zadnje skeniranje: {new Date(c.lastScanAt).toLocaleDateString('hr-HR')}</span>
                    )}
                  </div>

                  {/* Category URLs */}
                  {c.categoryUrls.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      <p className="text-xs font-medium text-text-secondary uppercase">Kategorije za praćenje cijena:</p>
                      {c.categoryUrls.map((url) => {
                        const schedule = schedules[c.id]?.find((s) => s.categoryUrl === url);
                        return (
                          <div key={url} className="flex items-center gap-2 group">
                            <button
                              onClick={() => {
                                if (!schedules[c.id]) loadSchedules(c.id);
                                toggleSchedule(c.id, url);
                              }}
                              className={`shrink-0 cursor-pointer ${schedule ? 'text-emerald-500' : 'text-text-secondary hover:text-primary'}`}
                              title={schedule ? `Auto-scan: ${schedule.frequency}${schedule.lastRunAt ? ` | Zadnji: ${new Date(schedule.lastRunAt).toLocaleDateString('hr-HR')}` : ''}` : 'Uključi auto-scan'}
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </button>
                            <span className="text-xs text-text-body truncate max-w-md" title={url}>
                              {shortUrl(url)}
                            </span>
                            <button
                              onClick={() => viewPrices(c.id, url)}
                              className="text-xs text-primary hover:underline cursor-pointer shrink-0"
                            >
                              Cijene
                            </button>
                            <button
                              onClick={() => handlePriceScan(c.id, url)}
                              disabled={priceScanning === c.id}
                              className="text-xs text-emerald-600 hover:underline cursor-pointer shrink-0 disabled:opacity-50"
                            >
                              {priceScanning === c.id ? 'Skeniranje...' : 'Skeniraj'}
                            </button>
                            <button
                              onClick={() => handleRemoveCategory(c.id, url)}
                              className="text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                              title="Ukloni kategoriju"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <button
                    onClick={() => viewScans(c.id)}
                    className="text-sm text-primary hover:text-primary-light px-3 py-1.5 border border-primary/20 rounded-lg transition-colors cursor-pointer"
                  >
                    Rezultati
                  </button>
                  <button
                    onClick={() => handleScan(c.id)}
                    disabled={scanning === c.id}
                    className="bg-accent text-primary px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-accent-light transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {scanning === c.id ? 'Skeniranje...' : 'Skeniraj'}
                  </button>
                  <button
                    onClick={() => { setCategoryModal(c.id); setNewCategoryUrl(''); }}
                    className="text-sm text-emerald-600 hover:text-emerald-700 px-3 py-1.5 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                  >
                    + Kategorija
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    disabled={deleting === c.id}
                    className="text-sm text-red-500 hover:text-red-700 px-3 py-1.5 border border-red-200 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {deleting === c.id ? 'Brisanje...' : 'Obriši'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add category URL modal */}
      {categoryModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setCategoryModal(null)}>
          <div className="bg-white rounded-2xl shadow-lg max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-heading">Dodaj kategoriju</h2>
              <button onClick={() => setCategoryModal(null)} className="text-text-secondary hover:text-text-heading cursor-pointer">
                ✕
              </button>
            </div>
            <p className="text-sm text-text-secondary mb-4">
              Unesite URL kategorije proizvoda čije cijene želite pratiti.
            </p>
            <div className="flex gap-2">
              <input
                value={newCategoryUrl}
                onChange={(e) => setNewCategoryUrl(e.target.value)}
                placeholder="https://shop.hr/kategorija-proizvoda"
                className="flex-1 rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                onKeyDown={(e) => e.key === 'Enter' && handleAddCategory(categoryModal)}
              />
              <button
                onClick={() => handleAddCategory(categoryModal)}
                disabled={!newCategoryUrl}
                className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-light transition-colors disabled:opacity-50 cursor-pointer shrink-0"
              >
                Dodaj
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scan results modal */}
      {selectedScans && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelectedScans(null)}>
          <div
            className="bg-white rounded-2xl shadow-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-heading">Rezultati skeniranja</h2>
              <button onClick={() => setSelectedScans(null)} className="text-text-secondary hover:text-text-heading cursor-pointer">
                ✕
              </button>
            </div>

            {selectedScans.scans.length === 0 ? (
              <p className="text-sm text-text-secondary">Nema rezultata skeniranja</p>
            ) : (
              <div className="space-y-4">
                {selectedScans.scans.map((scan) => (
                  <div key={scan.id} className="border border-border rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-text-secondary">
                        {new Date(scan.createdAt).toLocaleDateString('hr-HR')}
                      </span>
                      <span className="text-sm font-semibold text-primary">Score: {scan.score}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="font-medium text-text-heading text-xs uppercase mb-1">Tech Stack</p>
                        <div className="flex flex-wrap gap-1">
                          {scan.techStack.map((t) => (
                            <span key={t} className="bg-bg-section text-text-secondary text-xs px-2 py-0.5 rounded">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="font-medium text-text-heading text-xs uppercase mb-1">Plaćanja</p>
                        <div className="flex flex-wrap gap-1">
                          {scan.paymentMethods.map((p) => (
                            <span key={p} className="bg-bg-section text-text-secondary text-xs px-2 py-0.5 rounded">
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="font-medium text-success text-xs uppercase mb-1">Snage</p>
                        <ul className="text-xs text-text-body space-y-0.5">
                          {scan.strengths.map((s, i) => (
                            <li key={i}>+ {s}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium text-error text-xs uppercase mb-1">Slabosti</p>
                        <ul className="text-xs text-text-body space-y-0.5">
                          {scan.weaknesses.map((w, i) => (
                            <li key={i}>- {w}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Price results modal */}
      {selectedPrices && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => { setSelectedPrices(null); setTrendData(null); }}>
          <div
            className="bg-white rounded-2xl shadow-lg max-w-3xl w-full max-h-[80vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-text-heading">Praćenje cijena</h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  {shortUrl(selectedPrices.snapshot.categoryUrl)} — {new Date(selectedPrices.snapshot.scannedAt).toLocaleDateString('hr-HR')}
                </p>
              </div>
              <button onClick={() => { setSelectedPrices(null); setTrendData(null); }} className="text-text-secondary hover:text-text-heading cursor-pointer">
                ✕
              </button>
            </div>

            {/* Price changes diff */}
            {selectedPrices.snapshot.diff && selectedPrices.snapshot.diff.priceChanges.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-text-heading mb-3">Promjene cijena</h3>
                <div className="space-y-2">
                  {selectedPrices.snapshot.diff.priceChanges.map((ch, i) => (
                    <div key={i} className="flex items-center justify-between border border-border rounded-lg px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-heading truncate">{ch.name}</p>
                        <a href={ch.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate block">
                          {ch.url}
                        </a>
                      </div>
                      <div className="flex items-center gap-3 ml-4 shrink-0">
                        <span className="text-xs text-text-secondary line-through">
                          {formatPrice(ch.oldPrice, ch.currency)}
                        </span>
                        <span className="text-sm font-semibold text-text-heading">
                          {formatPrice(ch.newPrice, ch.currency)}
                        </span>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            ch.changePercent < 0
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {ch.changePercent > 0 ? '+' : ''}{ch.changePercent.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New products */}
            {selectedPrices.snapshot.diff && selectedPrices.snapshot.diff.added.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-emerald-700 mb-3">
                  Novi proizvodi ({selectedPrices.snapshot.diff.added.length})
                </h3>
                <div className="space-y-1">
                  {selectedPrices.snapshot.diff.added.map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-sm py-1.5">
                      <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate flex-1 mr-2">
                        {p.name}
                      </a>
                      <span className="text-text-heading font-medium shrink-0">{formatPrice(p.price, p.currency)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Removed products */}
            {selectedPrices.snapshot.diff && selectedPrices.snapshot.diff.removed.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-red-600 mb-3">
                  Uklonjeni proizvodi ({selectedPrices.snapshot.diff.removed.length})
                </h3>
                <div className="space-y-1">
                  {selectedPrices.snapshot.diff.removed.map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-sm py-1.5 text-text-secondary">
                      <span className="truncate flex-1 mr-2 line-through">{p.name}</span>
                      <span className="shrink-0 line-through">{formatPrice(p.price, p.currency)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Price trend chart */}
            {trendData && trendData.data.length >= 2 && (
              <div className="mb-6 bg-bg-section rounded-xl p-4">
                <PriceTrendChart
                  competitorData={trendData.data}
                  competitorName={competitors.find(c => c.id === selectedPrices.competitorId)?.name ?? 'Konkurent'}
                  productName={trendData.productName}
                />
              </div>
            )}

            {/* All products table */}
            <div>
              <h3 className="text-sm font-semibold text-text-heading mb-3">
                Svi proizvodi ({selectedPrices.snapshot.products.length})
              </h3>
              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-bg-section text-left">
                      <th className="px-4 py-2.5 font-medium text-text-secondary">Proizvod</th>
                      <th className="px-4 py-2.5 font-medium text-text-secondary text-right">Cijena</th>
                      <th className="px-4 py-2.5 font-medium text-text-secondary text-right">Link</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {selectedPrices.snapshot.products.map((p, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2.5 text-text-heading">{p.name}</td>
                        <td className="px-4 py-2.5 text-right font-medium">{formatPrice(p.price, p.currency)}</td>
                        <td className="px-4 py-2.5 text-right space-x-2">
                          <button
                            onClick={() => loadPriceTrend(selectedPrices.competitorId, p.name, selectedPrices.snapshot.categoryUrl)}
                            className="text-xs text-emerald-600 hover:underline cursor-pointer"
                          >
                            Trend
                          </button>
                          <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs">
                            Otvori
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Paste HTML modal */}
      {pasteModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setPasteModal(null)}>
          <div
            className="bg-white rounded-2xl shadow-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-heading">Dohvati cijene</h2>
              <button onClick={() => setPasteModal(null)} className="text-text-secondary hover:text-text-heading cursor-pointer">
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                <p className="font-medium mb-2">Stranica ima zaštitu od automatskog dohvaćanja. Slijedite ove korake:</p>
                <ol className="list-decimal ml-4 space-y-1">
                  <li>
                    Otvorite{' '}
                    <a href={pasteModal.categoryUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline font-medium">
                      stranicu konkurenta
                    </a>{' '}
                    u novom tabu i pričekajte da se potpuno učita
                  </li>
                  <li>Pritisnite <kbd className="bg-white px-1.5 py-0.5 rounded border text-xs font-mono">F12</kbd> za otvaranje Developer Tools</li>
                  <li>U Console tab upišite: <code className="bg-white px-1.5 py-0.5 rounded border text-xs font-mono">copy(document.documentElement.outerHTML)</code> i pritisnite Enter</li>
                  <li>HTML je kopiran u clipboard — zalijepite ovdje dolje</li>
                </ol>
                <p className="text-xs mt-2 text-blue-600">Alternativno: <kbd className="bg-white px-1 py-0.5 rounded border text-xs font-mono">Ctrl+U</kbd> / <kbd className="bg-white px-1 py-0.5 rounded border text-xs font-mono">Cmd+Option+U</kbd> → označi sve → kopiraj</p>
              </div>

              <textarea
                value={pastedHtml}
                onChange={(e) => setPastedHtml(e.target.value)}
                placeholder="Zalijepite izvorni kod stranice ovdje..."
                className="w-full h-40 rounded-lg border border-border px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />

              <div className="flex items-center justify-between">
                <span className="text-xs text-text-secondary">
                  {pastedHtml.length > 0 ? `${(pastedHtml.length / 1024).toFixed(0)} KB zalijepljeno` : ''}
                </span>
                <button
                  onClick={handlePasteSubmit}
                  disabled={priceScanning !== null || pastedHtml.length < 200}
                  className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-light transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {priceScanning ? 'Analiziram...' : 'Analiziraj cijene'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
