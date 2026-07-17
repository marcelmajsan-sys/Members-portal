'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Perk {
  id: string;
  title: string;
  description: string | null;
  status: string;
  statusNote: string | null;
}
interface Perks {
  available: Perk[];
  claimed: Perk[];
}

// Benefiti člana na admin profilu — isti popis koji član vidi na portalu
// (npr. Premium trgovci: eCommerce Akademija; Premium nuditelji: PR objave).
export default function MemberBenefits({ memberId }: { memberId: string }) {
  const [perks, setPerks] = useState<Perks | null>(null);

  useEffect(() => {
    (async () => {
      const res = await api.get<Perks>(`/api/os/members/${memberId}/benefits`);
      if (res.success && res.data) setPerks(res.data);
    })();
  }, [memberId]);

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
              {perk.status !== 'AVAILABLE' && (
                <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                  {perk.statusNote || 'Iskorišteno'}
                </span>
              )}
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
