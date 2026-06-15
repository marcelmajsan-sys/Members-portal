'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface MemberProfile {
  id: string;
  user: { firstName: string; lastName: string; email: string };
  company: {
    name: string;
    oib: string;
    address: string;
    city: string;
    zip: string;
    website: string | null;
    phone: string | null;
  };
  memberType: string;
  memberTier: string;
  status: string;
  joinedAt: string;
  expiresAt: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    companyName: '',
    address: '',
    city: '',
    postalCode: '',
    phone: '',
    website: '',
  });

  useEffect(() => {
    async function load() {
      const res = await api.get<MemberProfile>('/api/member/profile');
      if (res.success && res.data) {
        const p = res.data;
        setProfile(p);
        setForm({
          firstName: p.user.firstName,
          lastName: p.user.lastName,
          companyName: p.company.name,
          address: p.company.address,
          city: p.company.city,
          postalCode: p.company.zip,
          phone: p.company.phone || '',
          website: p.company.website || '',
        });
      } else {
        setError('Greška pri učitavanju profila');
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    setError('');
    const res = await api.put<MemberProfile>('/api/member/profile', form);
    if (res.success && res.data) {
      setProfile(res.data);
      setEditing(false);
    } else {
      setError(res.error?.message || 'Greška pri spremanju');
    }
    setSaving(false);
  }

  function handleCancel() {
    if (profile) {
      setForm({
        firstName: profile.user.firstName,
        lastName: profile.user.lastName,
        companyName: profile.company.name,
        address: profile.company.address,
        city: profile.company.city,
        postalCode: profile.company.zip,
        phone: profile.company.phone || '',
        website: profile.company.website || '',
      });
    }
    setEditing(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-text-secondary">Učitavanje...</div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="bg-red-50 text-error rounded-2xl border border-red-200 px-6 py-4">
        {error}
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-heading font-heading">Profil</h1>
          <p className="text-text-secondary mt-1">Vaši podaci i informacije o članstvu</p>
        </div>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="bg-accent text-primary px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent-light transition-colors cursor-pointer"
          >
            Uredi
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-text-body hover:bg-bg-section transition-colors cursor-pointer"
            >
              Odustani
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-light transition-colors disabled:opacity-50 cursor-pointer"
            >
              {saving ? 'Spremanje...' : 'Spremi'}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-error text-sm rounded-lg px-4 py-3 border border-red-200">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline cursor-pointer">Zatvori</button>
        </div>
      )}

      {/* Personal info */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
        <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wide mb-4">
          Osobni podaci
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {editing ? (
            <>
              <EditField label="Ime" value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} />
              <EditField label="Prezime" value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} />
            </>
          ) : (
            <>
              <InfoRow label="Ime" value={profile.user.firstName} />
              <InfoRow label="Prezime" value={profile.user.lastName} />
            </>
          )}
          <InfoRow label="Email" value={profile.user.email} />
        </div>
      </div>

      {/* Company info */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
        <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wide mb-4">
          Tvrtka
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {editing ? (
            <>
              <EditField label="Naziv tvrtke" value={form.companyName} onChange={(v) => setForm({ ...form, companyName: v })} />
              <InfoRow label="OIB" value={profile.company.oib} />
              <EditField label="Adresa" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
              <EditField label="Grad" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
              <EditField label="Poštanski broj" value={form.postalCode} onChange={(v) => setForm({ ...form, postalCode: v })} />
              <EditField label="Telefon" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
              <EditField label="Web stranica" value={form.website} onChange={(v) => setForm({ ...form, website: v })} />
            </>
          ) : (
            <>
              <InfoRow label="Naziv tvrtke" value={profile.company.name} />
              <InfoRow label="OIB" value={profile.company.oib} />
              <InfoRow label="Adresa" value={profile.company.address} />
              <InfoRow label="Grad" value={profile.company.city} />
              <InfoRow label="Poštanski broj" value={profile.company.zip} />
              {profile.company.phone && <InfoRow label="Telefon" value={profile.company.phone} />}
              {profile.company.website && <InfoRow label="Web stranica" value={profile.company.website} />}
            </>
          )}
        </div>
      </div>

      {/* Membership info */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
        <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wide mb-4">
          Članstvo
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <InfoRow label="Tip članstva" value={profile.memberType} />
          <div>
            <p className="text-xs text-text-secondary mb-0.5">Status</p>
            <span
              className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${
                profile.status === 'ACTIVE'
                  ? 'bg-green-100 text-success'
                  : 'bg-yellow-100 text-warning'
              }`}
            >
              {profile.status === 'ACTIVE' ? 'Aktivno' : profile.status}
            </span>
          </div>
          {profile.joinedAt && (
            <InfoRow label="Član od" value={new Date(profile.joinedAt).toLocaleDateString('hr-HR')} />
          )}
          {profile.expiresAt && (
            <InfoRow label="Istječe" value={new Date(profile.expiresAt).toLocaleDateString('hr-HR')} />
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-text-secondary mb-0.5">{label}</p>
      <p className="text-sm font-medium text-text-heading">{value}</p>
    </div>
  );
}

function EditField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs text-text-secondary mb-1">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
    </div>
  );
}
