'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Partner {
  id: string;
  name: string;
  description: string;
  website: string;
  contactEmail: string;
  contactPhone?: string;
  logoUrl?: string;
}

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      const res = await api.get<Partner[]>('/api/member/partners');
      if (res.success && res.data) {
        setPartners(Array.isArray(res.data) ? res.data : []);
      } else {
        setError('Greška pri učitavanju partnera');
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-text-secondary">Učitavanje...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-error rounded-2xl border border-red-200 px-6 py-4">{error}</div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-heading font-heading">Partneri</h1>
        <p className="text-text-secondary mt-1">Partnerska mreža eCommerce Hrvatska</p>
      </div>

      {partners.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border shadow-sm p-10 text-center">
          <p className="text-text-secondary">Nema dostupnih partnera</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {partners.map((partner) => (
            <div key={partner.id} className="bg-white rounded-2xl border border-border shadow-sm p-6 flex flex-col">
              <div className="flex-1">
                <h3 className="text-base font-semibold text-text-heading">{partner.name}</h3>
                <p className="text-sm text-text-secondary mt-2 line-clamp-3">{partner.description}</p>
              </div>

              <div className="mt-4 pt-4 border-t border-border space-y-1.5 text-sm">
                {partner.website && (
                  <a
                    href={partner.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-primary hover:text-primary-light truncate"
                  >
                    {partner.website.replace(/^https?:\/\//, '')}
                  </a>
                )}
                {partner.contactEmail && (
                  <a
                    href={`mailto:${partner.contactEmail}`}
                    className="block text-text-body hover:text-primary truncate"
                  >
                    {partner.contactEmail}
                  </a>
                )}
                {partner.contactPhone && (
                  <p className="text-text-secondary">{partner.contactPhone}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
