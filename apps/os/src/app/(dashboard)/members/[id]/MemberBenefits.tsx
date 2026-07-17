'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Perk {
  id: string;
  title: string;
  description: string | null;
  status: string;
  statusNote: string | null;
  quota: number | null;
  usedCount: number;
}
interface Perks {
  available: Perk[];
  claimed: Perk[];
}

// Benefiti člana na admin profilu — isti popis koji član vidi na portalu
// (npr. Premium trgovci: eCommerce Akademija; Premium nuditelji: PR objave).
// Za benefite s kvotom admin +/- gumbima označava koliko je iskorišteno.
export default function MemberBenefits({ memberId }: { memberId: string }) {
  const [perks, setPerks] = useState<Perks | null>(null);
  const [busyId, setBusyId] = useState('');

  useEffect(() => {
    (async () => {
      const res = await api.get<Perks>(`/api/os/members/${memberId}/benefits`);
      if (res.success && res.data) setPerks(res.data);
    })();
  }, [memberId]);

  async function setUsage(perk: Perk, usedCount: number) {
    if (usedCount < 0 || (perk.quota !== null && usedCount > perk.quota)) return;
    setBusyId(perk.id);
    const res = await api.patch<{ usedCount: number }>(`/api/os/members/${memberId}/benefits/${perk.id}`, { usedCount });
    setBusyId('');
    if (res.success && res.data) {
      const applied = res.data.usedCount;
      setPerks((prev) => prev && {
        available: prev.available.map((p) => (p.id === perk.id ? { ...p, usedCount: applied } : p)),
        claimed: prev.claimed.map((p) => (p.id === perk.id ? { ...p, usedCount: applied } : p)),
      });
    }
  }

  const all = perks ? [...perks.available, ...perks.claimed] : [];
  if (all.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="mb-1 text-lg font-semibold text-gray-900">Benefiti</h2>
      <p className="mb-4 text-sm text-gray-500">Benefiti koje član vidi na svom portalu.</p>
      <div className="space-y-3">
        {all.map((perk) => (
          <div key={perk.id} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-gray-900">{perk.title}</p>
              <div className="flex items-center gap-2">
                {perk.quota !== null && (
                  <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2 py-1">
                    <button
                      onClick={() => setUsage(perk, perk.usedCount - 1)}
                      disabled={busyId === perk.id || perk.usedCount <= 0}
                      className="flex h-6 w-6 items-center justify-center rounded text-gray-600 transition hover:bg-gray-100 disabled:opacity-30"
                      title="Smanji iskorišteno"
                    >
                      −
                    </button>
                    <span className="min-w-[64px] text-center text-xs font-medium text-gray-700">
                      Iskorišteno {perk.usedCount}/{perk.quota}
                    </span>
                    <button
                      onClick={() => setUsage(perk, perk.usedCount + 1)}
                      disabled={busyId === perk.id || perk.usedCount >= perk.quota}
                      className="flex h-6 w-6 items-center justify-center rounded text-gray-600 transition hover:bg-gray-100 disabled:opacity-30"
                      title="Povećaj iskorišteno"
                    >
                      +
                    </button>
                  </div>
                )}
                {perk.status !== 'AVAILABLE' && (
                  <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                    {perk.statusNote || 'Iskorišteno'}
                  </span>
                )}
              </div>
            </div>
            {perk.description && <p className="mt-1 text-xs text-gray-500">{perk.description}</p>}
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-gray-500">
        Član benefit traži emailom na <span className="font-medium text-gray-700">udruga@ecommerce.hr</span>
      </p>
    </div>
  );
}
