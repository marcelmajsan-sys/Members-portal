'use client';

import { useState } from 'react';

const events = [
  {
    id: 1,
    title: 'eCommerce Akademija moduli',
    month: 'Travanj',
    year: '2026',
    date: 'Travanj 2026',
    location: 'KlubHaus9, Ulica Republike Austrije 9, Zagreb',
    price: null,
    description: 'Praktična edukacija za web trgovce — 8 modula, 8 stručnjaka.',
  },
  {
    id: 2,
    title: 'CRO Commerce 2026',
    month: 'Listopad',
    year: '2026',
    date: '13.10.2026',
    location: 'Mozaik Event Centar, Slavonska avenija 6, Zagreb',
    price: '250 EUR',
    description: 'Najveća eCommerce konferencija u Hrvatskoj.',
  },
];

export default function EventiPage() {
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'lista' | 'mjesec'>('lista');

  const filtered = events.filter((e) =>
    e.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary to-[#152a4a] py-20 text-white">
        <div className="mx-auto max-w-6xl px-6">
          <h1 className="font-heading text-4xl font-bold md:text-5xl">Događanja</h1>
          <p className="mt-3 text-lg text-white/70">Konferencije, edukacije i meetupovi za eCommerce zajednicu</p>
        </div>
      </section>

      {/* Controls */}
      <section className="border-b border-[#E2E8F0] bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative sm:max-w-xs w-full">
            <svg className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-secondary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Pretraži događanja..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-[#E2E8F0] py-2.5 pl-10 pr-4 text-text-heading outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <div className="flex rounded-lg border border-[#E2E8F0] overflow-hidden">
            <button
              onClick={() => setView('lista')}
              className={`px-5 py-2.5 text-sm font-medium transition ${
                view === 'lista' ? 'bg-accent text-primary' : 'text-text-secondary hover:bg-bg-section'
              }`}
            >
              Lista
            </button>
            <button
              onClick={() => setView('mjesec')}
              className={`px-5 py-2.5 text-sm font-medium transition ${
                view === 'mjesec' ? 'bg-accent text-primary' : 'text-text-secondary hover:bg-bg-section'
              }`}
            >
              Mjesec
            </button>
          </div>
        </div>
      </section>

      {/* Events List */}
      <section className="bg-bg-light py-14">
        <div className="mx-auto max-w-6xl px-6">
          {view === 'lista' ? (
            <div className="space-y-6">
              {filtered.map((event) => (
                <article
                  key={event.id}
                  className="flex overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm transition hover:shadow-md"
                >
                  {/* Date Badge */}
                  <div className="flex w-32 shrink-0 flex-col items-center justify-center bg-accent p-4 text-primary">
                    <span className="text-sm font-semibold uppercase">{event.month}</span>
                    <span className="text-3xl font-bold">{event.year}</span>
                  </div>
                  <div className="flex flex-1 flex-col justify-center p-6">
                    <h3 className="text-xl font-semibold text-text-heading">{event.title}</h3>
                    <p className="mt-1 text-sm text-text-body">{event.description}</p>
                    <div className="mt-3 flex flex-wrap gap-4 text-sm text-text-secondary">
                      <span className="flex items-center gap-1.5">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {event.date}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {event.location}
                      </span>
                      {event.price && (
                        <span className="flex items-center gap-1.5 font-semibold text-accent">
                          {event.price}
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              ))}
              {filtered.length === 0 && (
                <p className="py-12 text-center text-text-secondary">Nema pronađenih događanja.</p>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-8 text-center text-text-secondary">
              <p>Kalendarski prikaz dolazi uskoro.</p>
            </div>
          )}
        </div>
      </section>

      {/* Calendar Subscribe */}
      <section className="bg-bg-section py-14">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="font-heading text-2xl font-bold text-text-heading">
            Pretplati se na kalendar
          </h2>
          <p className="mt-3 text-text-body">
            Dodaj sva događanja u svoj kalendar i nikad ne propusti edukaciju ili networking.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a
              href="#"
              className="inline-flex items-center gap-2 rounded-lg border-2 border-primary bg-white px-6 py-3 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.5 3h-3V1.5h-1.5V3h-6V1.5H7.5V3h-3C3.675 3 3 3.675 3 4.5v15c0 .825.675 1.5 1.5 1.5h15c.825 0 1.5-.675 1.5-1.5v-15c0-.825-.675-1.5-1.5-1.5zm0 16.5h-15V8h15v11.5z" />
              </svg>
              Google Calendar
            </a>
            <a
              href="#"
              className="inline-flex items-center gap-2 rounded-lg border-2 border-primary bg-white px-6 py-3 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.5 3h-3V1.5h-1.5V3h-6V1.5H7.5V3h-3C3.675 3 3 3.675 3 4.5v15c0 .825.675 1.5 1.5 1.5h15c.825 0 1.5-.675 1.5-1.5v-15c0-.825-.675-1.5-1.5-1.5zm0 16.5h-15V8h15v11.5z" />
              </svg>
              iCalendar
            </a>
            <a
              href="#"
              className="inline-flex items-center gap-2 rounded-lg border-2 border-primary bg-white px-6 py-3 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.5 3h-3V1.5h-1.5V3h-6V1.5H7.5V3h-3C3.675 3 3 3.675 3 4.5v15c0 .825.675 1.5 1.5 1.5h15c.825 0 1.5-.675 1.5-1.5v-15c0-.825-.675-1.5-1.5-1.5zm0 16.5h-15V8h15v11.5z" />
              </svg>
              Outlook
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
