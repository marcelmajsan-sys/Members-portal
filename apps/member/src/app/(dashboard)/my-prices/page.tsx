'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface MemberProduct {
  id: string;
  name: string;
  price: number;
  currency: string;
  category: string | null;
  productUrl: string | null;
}

interface ComparisonMatch {
  competitorId: string;
  competitorName: string;
  productName: string;
  price: number;
  currency: string;
  diff: number;
  diffPercent: number;
}

interface ComparisonItem {
  memberProduct: { id: string; name: string; price: number; currency: string; category: string | null };
  matches: ComparisonMatch[];
}

export default function MyPricesPage() {
  const [products, setProducts] = useState<MemberProduct[]>([]);
  const [comparison, setComparison] = useState<ComparisonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', price: '', currency: 'EUR', category: '', productUrl: '' });
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [showComparison, setShowComparison] = useState(false);

  async function loadProducts() {
    const res = await api.get<MemberProduct[]>('/api/member/products?page=1&limit=100');
    if (res.success && res.data) {
      setProducts(Array.isArray(res.data) ? res.data : []);
    }
    setLoading(false);
  }

  async function loadComparison() {
    const res = await api.get<ComparisonItem[]>('/api/member/products/comparison');
    if (res.success && res.data) {
      setComparison(Array.isArray(res.data) ? res.data : []);
      setShowComparison(true);
    } else {
      setError('Greška pri dohvaćanju usporedbe');
    }
  }

  useEffect(() => { loadProducts(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    const res = await api.post<MemberProduct>('/api/member/products', {
      name: form.name,
      price: Number(form.price),
      currency: form.currency,
      category: form.category || undefined,
      productUrl: form.productUrl || undefined,
    });
    if (res.success && res.data) {
      setProducts((prev) => [res.data!, ...prev]);
      setForm({ name: '', price: '', currency: 'EUR', category: '', productUrl: '' });
      setShowForm(false);
    } else {
      setError(res.error?.message || 'Greška pri dodavanju');
    }
    setSubmitting(false);
  }

  async function handleUpdatePrice(id: string) {
    const res = await api.put<MemberProduct>(`/api/member/products/${id}`, { price: Number(editPrice) });
    if (res.success && res.data) {
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, price: res.data!.price } : p)));
      setEditingId(null);
    } else {
      setError(res.error?.message || 'Greška pri ažuriranju');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Ukloniti proizvod?')) return;
    const res = await api.del(`/api/member/products/${id}`);
    if (res.success) {
      setProducts((prev) => prev.filter((p) => p.id !== id));
    }
  }

  function formatPrice(price: number, currency: string) {
    return new Intl.NumberFormat('hr-HR', { style: 'currency', currency }).format(price);
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
          <h1 className="text-2xl font-bold text-text-heading font-heading">Moje cijene</h1>
          <p className="text-text-secondary mt-1">Upravljajte svojim proizvodima i usporedite s konkurencijom</p>
        </div>
        <div className="flex gap-2">
          {products.length > 0 && (
            <button
              onClick={loadComparison}
              className="text-sm text-primary hover:text-primary-light px-4 py-2 border border-primary/20 rounded-lg transition-colors cursor-pointer"
            >
              Usporedi
            </button>
          )}
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-accent text-primary px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent-light transition-colors cursor-pointer"
          >
            {showForm ? 'Zatvori' : 'Dodaj proizvod'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-error text-sm rounded-lg px-4 py-3 border border-red-200">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline cursor-pointer">Zatvori</button>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold text-text-heading">Novi proizvod</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-body mb-1">Naziv proizvoda</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="npr. Samsung Galaxy S24"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-body mb-1">Cijena</label>
              <input
                required
                type="number"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="529.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-body mb-1">Kategorija</label>
              <input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Elektronika"
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

      {/* Products table */}
      {products.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border shadow-sm p-10 text-center">
          <p className="text-text-secondary">Nemate dodanih proizvoda</p>
          <button onClick={() => setShowForm(true)} className="mt-3 text-sm text-primary hover:text-primary-light cursor-pointer">
            Dodajte prvi proizvod
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-bg-section text-left">
                <th className="px-4 py-3 font-medium text-text-secondary">Proizvod</th>
                <th className="px-4 py-3 font-medium text-text-secondary">Kategorija</th>
                <th className="px-4 py-3 font-medium text-text-secondary text-right">Cijena</th>
                <th className="px-4 py-3 font-medium text-text-secondary text-right">Akcije</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 text-text-heading font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-text-secondary">{p.category || '-'}</td>
                  <td className="px-4 py-3 text-right">
                    {editingId === p.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <input
                          type="number"
                          step="0.01"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          className="w-24 rounded border border-border px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary/30"
                          onKeyDown={(e) => e.key === 'Enter' && handleUpdatePrice(p.id)}
                        />
                        <button onClick={() => handleUpdatePrice(p.id)} className="text-xs text-primary cursor-pointer">OK</button>
                        <button onClick={() => setEditingId(null)} className="text-xs text-text-secondary cursor-pointer">X</button>
                      </div>
                    ) : (
                      <span
                        onClick={() => { setEditingId(p.id); setEditPrice(String(p.price)); }}
                        className="font-medium text-text-heading cursor-pointer hover:text-primary"
                        title="Klikni za promjenu"
                      >
                        {formatPrice(p.price, p.currency)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="text-xs text-red-500 hover:text-red-700 cursor-pointer"
                    >
                      Ukloni
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Comparison section */}
      {showComparison && comparison.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-heading">Usporedba s konkurencijom</h2>
            <button onClick={() => setShowComparison(false)} className="text-sm text-text-secondary hover:text-text-heading cursor-pointer">
              Zatvori
            </button>
          </div>

          {comparison.map((item) => (
            <div key={item.memberProduct.id} className="bg-white rounded-2xl border border-border shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-text-heading">{item.memberProduct.name}</h3>
                <span className="text-sm font-bold text-primary">
                  Tvoja cijena: {formatPrice(item.memberProduct.price, item.memberProduct.currency)}
                </span>
              </div>

              {item.matches.length === 0 ? (
                <p className="text-xs text-text-secondary">Nema podudaranja kod konkurenata</p>
              ) : (
                <div className="space-y-2">
                  {item.matches.map((m, i) => (
                    <div key={i} className="flex items-center justify-between text-sm border border-border rounded-lg px-4 py-2.5">
                      <div>
                        <span className="font-medium text-text-heading">{m.competitorName}</span>
                        <span className="text-text-secondary ml-2 text-xs">{m.productName}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{formatPrice(m.price, m.currency)}</span>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            m.diffPercent < 0
                              ? 'bg-emerald-100 text-emerald-700'
                              : m.diffPercent > 0
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {m.diffPercent > 0 ? '+' : ''}{m.diffPercent}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
