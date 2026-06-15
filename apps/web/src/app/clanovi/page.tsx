'use client';

import { useState } from 'react';

const members = [
  { name: 'Ana Horvat', role: 'Web trgovac', company: 'TechStore.hr' },
  { name: 'Marko Kovačević', role: 'eCommerce Manager', company: 'ModaShop' },
  { name: 'Petra Novak', role: 'Marketing direktorica', company: 'ZeleniVrt' },
  { name: 'Ivan Babić', role: 'Vlasnik', company: 'PetLjubimac' },
  { name: 'Maja Jurić', role: 'CEO', company: 'SportMax' },
  { name: 'Tomislav Radić', role: 'CTO', company: 'BioOaza' },
];

export default function ClanoviPage() {
  const [search, setSearch] = useState('');

  const filtered = members.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.company.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary to-[#152a4a] py-20 text-white">
        <div className="mx-auto max-w-6xl px-6">
          <h1 className="font-heading text-4xl font-bold md:text-5xl">Članovi</h1>
          <p className="mt-3 text-lg text-white/70">Članovi Udruge eCommerce Hrvatska</p>
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
              placeholder="Pretraži članove..."
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
            {filtered.map((member) => (
              <div
                key={member.name}
                className="flex flex-col items-center rounded-2xl border border-[#E2E8F0] bg-white p-8 shadow-sm transition hover:shadow-md"
              >
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-bg-section">
                  <svg className="h-10 w-10 text-primary/40" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-text-heading">{member.name}</h3>
                <p className="text-sm text-text-secondary">{member.role}</p>
                <p className="mt-1 text-sm font-semibold text-accent">{member.company}</p>
              </div>
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="py-12 text-center text-text-secondary">Nema pronađenih članova.</p>
          )}
        </div>
      </section>
    </>
  );
}
