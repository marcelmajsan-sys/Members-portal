'use client';

import { useState } from 'react';
import Link from 'next/link';

const providers = [
  { name: 'WebDev Studio', desc: 'Izrada i održavanje web trgovina na platformama Shopify, WooCommerce i Magento.' },
  { name: 'DigiMarketing Pro', desc: 'Specijalizirani za performance marketing i SEO optimizaciju za eCommerce.' },
  { name: 'LogiPack', desc: 'Skladištenje, pakiranje i dostava za online trgovine.' },
  { name: 'PayGate HR', desc: 'Rješenja za online plaćanja — kartično, crypto i BNPL opcije.' },
  { name: 'LegalEcom', desc: 'Pravno savjetovanje za usklađivanje web trgovina sa zakonima.' },
  { name: 'DesignHive', desc: 'UX/UI dizajn za web trgovine fokusiran na konverzije.' },
];

export default function NuditeljUslugaPage() {
  const [search, setSearch] = useState('');

  const filtered = providers.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary to-[#152a4a] py-20 text-white">
        <div className="mx-auto max-w-6xl px-6">
          <h1 className="font-heading text-4xl font-bold md:text-5xl">Nuditelji usluga</h1>
          <p className="mt-3 text-lg text-white/70">Provjereni pružatelji usluga za eCommerce</p>
        </div>
      </section>

      {/* Search */}
      <section className="border-b border-[#E2E8F0] bg-white">
        <div className="mx-auto max-w-6xl px-6 py-5">
          <div className="relative sm:max-w-md">
            <svg className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-secondary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Pretraži nuditelje usluga..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-[#E2E8F0] py-3 pl-10 pr-4 text-text-heading outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="bg-bg-light py-14">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((provider) => (
              <div
                key={provider.name}
                className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm transition hover:shadow-md"
              >
                <div className="flex h-32 items-center justify-center bg-bg-section">
                  <svg className="h-10 w-10 text-[#CBD5E1]" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                  </svg>
                </div>
                <div className="relative px-6 pb-6 pt-10">
                  <div className="absolute -top-8 left-6 flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-white bg-bg-section text-sm font-bold text-primary shadow-sm">
                    Logo
                  </div>
                  <h3 className="text-lg font-semibold text-text-heading">{provider.name}</h3>
                  <p className="mt-1 text-sm text-text-body">{provider.desc}</p>
                  <Link
                    href="#"
                    className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline"
                  >
                    Pogledaj profil
                    <span aria-hidden="true">&rarr;</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="py-12 text-center text-text-secondary">Nema pronađenih nuditelja usluga.</p>
          )}
        </div>
      </section>
    </>
  );
}
