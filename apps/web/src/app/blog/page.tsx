'use client';

import { useState } from 'react';
import Link from 'next/link';

const categories = [
  'Sve kategorije',
  'Razvoj webshopa',
  'Savjeti za prodaju',
  'Usklađivanje sa zakonom',
  'Edukacija',
  'Intervjui',
  'Istraživanja',
  'Nominis (podcast)',
  'Safe Shop',
];

const posts = [
  { id: 1, title: 'Uskoro kreće 16. eCommerce Akademija – za voditelje webshopova', date: '09.03.2026.', category: 'Edukacija' },
  { id: 2, title: 'Više je razloga zašto bi ovo mogla biti najbogatija generacija. Doznajemo kako na Day0', date: '09.03.2026.', category: 'Istraživanja' },
  { id: 3, title: 'Čime ćemo plaćati kavu 2030. godine i hoće li Europa napokon dobiti vlastitu financijsku infrastrukturu?', date: '03.03.2026.', category: 'Istraživanja' },
  { id: 4, title: 'Nominis e93 – Može li WooCommerce nositi startup? (powered by Neuralab)', date: '27.02.2026.', category: 'Nominis (podcast)' },
  { id: 5, title: 'Sedam izvješća koje svi webshopovi moraju gledati svakodnevno', date: '23.02.2026.', category: 'Savjeti za prodaju' },
  { id: 6, title: 'Nominis e92 – Kako razviti uspješan omnichannel pet shop (powered by Neuralab)', date: '13.02.2026.', category: 'Nominis (podcast)' },
  { id: 7, title: 'Novosti koje će oblikovati svakodnevicu potrošača i obveze trgovaca', date: '12.02.2026.', category: 'Istraživanja' },
  { id: 8, title: 'Otvorite paket i ne preuzimajte ono što niste naručili', date: '11.02.2026.', category: 'Usklađivanje sa zakonom' },
  { id: 9, title: 'Iluzija produktivnosti: Tihi ubojica rezultata u prodaji', date: '10.02.2026.', category: 'Savjeti za prodaju' },
  { id: 10, title: 'Prima webshop: Od tvornice do online košarice', date: '09.02.2026.', category: 'Intervjui' },
];

export default function BlogPage() {
  const [activeCategory, setActiveCategory] = useState('Sve kategorije');

  const filtered = activeCategory === 'Sve kategorije'
    ? posts
    : posts.filter((p) => p.category === activeCategory);

  const featured = filtered.slice(0, 3);
  const regular = filtered.slice(3);

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary to-[#152a4a] py-20 text-white">
        <div className="mx-auto max-w-6xl px-6">
          <h1 className="font-heading text-4xl font-bold md:text-5xl">Blog</h1>
          <p className="mt-3 text-lg text-white/70">Najnoviji članci, savjeti i istraživanja iz svijeta eCommercea</p>
        </div>
      </section>

      {/* Category Pills */}
      <section className="border-b border-[#E2E8F0] bg-white">
        <div className="mx-auto max-w-6xl px-6 py-5">
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                  activeCategory === cat
                    ? 'bg-accent text-primary'
                    : 'bg-bg-section text-text-secondary hover:bg-[#E2E8F0]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <section className="bg-bg-light py-14">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="font-heading text-2xl font-bold text-text-heading md:text-3xl">
              Izdvojeni članci
            </h2>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {featured.map((post) => (
                <article
                  key={post.id}
                  className="group overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm transition hover:shadow-md"
                >
                  <div className="flex h-48 items-center justify-center bg-bg-section text-text-secondary">
                    <svg className="h-12 w-12 text-[#CBD5E1]" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                    </svg>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-bg-section px-3 py-1 text-xs font-medium text-text-secondary">
                        {post.category}
                      </span>
                      <span className="text-xs text-text-secondary">{post.date}</span>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold leading-snug text-text-heading group-hover:text-accent transition">
                      {post.title}
                    </h3>
                    <p className="mt-2 text-sm text-text-body line-clamp-2">
                      Saznajte više o ovoj temi i kako može utjecati na vaše online poslovanje.
                    </p>
                    <Link
                      href="#"
                      className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline"
                    >
                      Pročitaj više
                      <span aria-hidden="true">&rarr;</span>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Regular Grid */}
      {regular.length > 0 && (
        <section className="bg-bg-section py-14">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid gap-6 md:grid-cols-2">
              {regular.map((post) => (
                <article
                  key={post.id}
                  className="group flex overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm transition hover:shadow-md"
                >
                  <div className="flex w-1/3 shrink-0 items-center justify-center bg-bg-section">
                    <svg className="h-10 w-10 text-[#CBD5E1]" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                    </svg>
                  </div>
                  <div className="flex flex-1 flex-col justify-center p-5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-accent">{post.category}</span>
                      <span className="text-[#CBD5E1]">&middot;</span>
                      <span className="text-xs text-text-secondary">{post.date}</span>
                    </div>
                    <h3 className="mt-2 font-semibold leading-snug text-text-heading group-hover:text-accent transition">
                      {post.title}
                    </h3>
                    <Link
                      href="#"
                      className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline"
                    >
                      Pročitaj više
                      <span aria-hidden="true">&rarr;</span>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Pagination */}
      <section className="bg-white py-10">
        <div className="mx-auto flex max-w-6xl items-center justify-center gap-6 px-6 text-sm font-semibold">
          <button className="text-text-secondary hover:text-primary transition">&larr; Novije objave</button>
          <span className="text-[#E2E8F0]">|</span>
          <button className="text-text-secondary hover:text-primary transition">Starije objave &rarr;</button>
        </div>
      </section>
    </>
  );
}
