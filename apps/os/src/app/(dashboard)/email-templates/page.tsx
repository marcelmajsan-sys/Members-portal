'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Template {
  id: string | null;
  slug: string;
  name: string;
  subject: string;
  body: string;
  ctaLabel: string | null;
  ctaUrl: string | null;
  isActive: boolean;
  isDefault: boolean;
}

function buildPreviewHtml(tpl: Template): string {
  const bodyParagraphs = tpl.body
    ? tpl.body.split('\n').filter(Boolean).map((p) => `<p>${p}</p>`).join('\n    ')
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

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Template | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  const [error, setError] = useState('');

  async function fetchTemplates() {
    setLoading(true);
    setError('');
    const res = await api.get<Template[]>('/api/os/email-templates');
    if (res.success && res.data) {
      setTemplates(res.data);
    } else {
      setError(res.error?.message || 'Greška pri učitavanju predložaka');
      console.error('Email templates fetch error:', res);
    }
    setLoading(false);
  }

  useEffect(() => { fetchTemplates(); }, []);

  async function handleSave() {
    if (!editing) return;
    if (creating && !editing.name.trim()) return;

    const slug = creating
      ? editing.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
      : editing.slug;

    if (!slug) return;

    setSaving(true);
    const res = await api.put(`/api/os/email-templates/${slug}`, {
      name: editing.name,
      subject: editing.subject || `${editing.name} — eCommerce Hrvatska`,
      body: editing.body,
      ctaLabel: editing.ctaLabel || null,
      ctaUrl: editing.ctaUrl || null,
      isActive: editing.isActive,
    });
    if (res.success) {
      setSuccess(creating ? 'Predložak kreiran!' : 'Predložak spremljen!');
      setTimeout(() => setSuccess(''), 3000);
      setEditing(null);
      setCreating(false);
      fetchTemplates();
    }
    setSaving(false);
  }

  async function handleRevert(slug: string) {
    if (!confirm('Vratiti na zadani predložak? Ovo će obrisati vaše izmjene.')) return;
    await api.del(`/api/os/email-templates/${slug}`);
    setEditing(null);
    fetchTemplates();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-500">Učitavanje...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email predlošci</h1>
          <p className="mt-1 text-sm text-gray-500">Uredite tekstove email poruka koje sustav automatski šalje članovima.</p>
        </div>
        {!editing && !creating && (
          <button
            onClick={() => {
              setCreating(true);
              setEditing({
                id: null,
                slug: '',
                name: '',
                subject: '',
                body: '',
                ctaLabel: null,
                ctaUrl: null,
                isActive: true,
                isDefault: false,
              });
            }}
            className="self-start rounded-lg bg-[#1B365D] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#152a4a] sm:self-auto"
          >
            + Novi predložak
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      {/* Template list */}
      {!editing ? (
        <div className="grid gap-4">
          {templates.map((tpl) => (
            <div
              key={tpl.slug}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{tpl.name}</h3>
                    {tpl.isDefault ? (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">Zadano</span>
                    ) : (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">Prilagođeno</span>
                    )}
                    {tpl.isActive ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">Aktivan</span>
                    ) : (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600">Neaktivan</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    <span className="font-medium">Predmet:</span> {tpl.subject}
                  </p>
                  <p className="mt-1 text-sm text-gray-400 line-clamp-2">{tpl.body || '(prazan tekst)'}</p>
                  {tpl.ctaLabel && (
                    <p className="mt-1 text-sm text-gray-400">
                      <span className="font-medium">Gumb:</span> {tpl.ctaLabel}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 sm:ml-4">
                  <button
                    onClick={() => setEditing({ ...tpl })}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Uredi
                  </button>
                  {!tpl.isDefault && (
                    <button
                      onClick={() => handleRevert(tpl.slug)}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-50"
                    >
                      Vrati zadano
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Edit form */
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">{creating ? 'Novi predložak' : `Uređivanje: ${editing.name}`}</h2>
            <button
              onClick={() => { setEditing(null); setCreating(false); }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Odustani
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Naziv predloška</label>
              <input
                type="text"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#1B365D] focus:ring-2 focus:ring-[#1B365D]/20"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Predmet emaila</label>
              <input
                type="text"
                value={editing.subject}
                onChange={(e) => setEditing({ ...editing, subject: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#1B365D] focus:ring-2 focus:ring-[#1B365D]/20"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Tekst poruke</label>
              <p className="mb-2 text-xs text-gray-400">Unesite tekst emaila. Ime člana se automatski dodaje na početku.</p>
              <textarea
                rows={6}
                value={editing.body}
                onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#1B365D] focus:ring-2 focus:ring-[#1B365D]/20"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Tekst gumba (opcionalno)</label>
                <input
                  type="text"
                  value={editing.ctaLabel || ''}
                  onChange={(e) => setEditing({ ...editing, ctaLabel: e.target.value || null })}
                  placeholder="npr. Obnovite članstvo"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#1B365D] focus:ring-2 focus:ring-[#1B365D]/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">URL gumba (opcionalno)</label>
                <input
                  type="text"
                  value={editing.ctaUrl || ''}
                  onChange={(e) => setEditing({ ...editing, ctaUrl: e.target.value || null })}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#1B365D] focus:ring-2 focus:ring-[#1B365D]/20"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={editing.isActive}
                onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="isActive" className="text-sm text-gray-700">Aktivan predložak</label>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button
                onClick={() => { setEditing(null); setCreating(false); }}
                className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                Odustani
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-[#1B365D] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#152a4a] disabled:opacity-60"
              >
                {saving ? 'Spremanje...' : 'Spremi promjene'}
              </button>
            </div>

            {/* Live preview */}
            <div className="pt-6 border-t border-gray-100">
              <p className="mb-3 text-sm font-medium text-gray-700">Pregled emaila</p>
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <iframe
                  title="Email preview"
                  srcDoc={buildPreviewHtml(editing)}
                  className="w-full border-0"
                  style={{ height: '500px' }}
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info box */}
      <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
        <p className="font-medium">Kako radi?</p>
        <p className="mt-1">Kada sustav šalje email, prvo provjerava imate li prilagođen predložak u bazi. Ako ne, koristi zadani tekst. Možete bilo koji predložak prilagoditi i uvijek se vratiti na zadano.</p>
      </div>
    </div>
  );
}
