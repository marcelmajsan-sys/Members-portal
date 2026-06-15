import Link from 'next/link';

const magazines = [
  { title: 'eCommerce Magazin No.9', date: '09.12.2025' },
  { title: 'eCommerce Magazin No.8', date: '16.09.2025' },
  { title: 'eCommerce Magazin No.7', date: '23.06.2025' },
  { title: 'eCommerce Magazin No.6', date: '19.03.2025' },
  { title: 'eCommerce Magazin No.5', date: '26.12.2024' },
  { title: 'eCommerce Magazin No.4', date: '18.09.2024' },
  { title: 'eCommerce Magazin No.3', date: '24.06.2024' },
  { title: 'eCommerce Magazin No.2', date: '15.03.2024' },
  { title: 'eCommerce Magazin No.1 Specijal', date: '18.12.2023' },
];

export default function VodiciPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary to-[#152a4a] py-20 text-white">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h1 className="font-heading text-4xl font-bold md:text-5xl">
            eCommerce Vodici
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/70">
            U našim vodičima možete pronaći istraživanja web trgovina, navike online kupaca te
            korisne savjete iz prakse
          </p>
        </div>
      </section>

      {/* Grid */}
      <section className="bg-bg-light py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {magazines.map((mag) => (
              <article
                key={mag.title}
                className="group overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm transition hover:shadow-md"
              >
                <div className="flex h-72 items-center justify-center bg-bg-section">
                  <div className="text-center">
                    <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <svg className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <p className="text-sm text-text-secondary">Naslovnica magazina</p>
                  </div>
                </div>
                <div className="p-6">
                  <span className="inline-block rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                    {mag.date}
                  </span>
                  <h3 className="mt-3 text-lg font-semibold text-text-heading group-hover:text-accent transition">
                    {mag.title}
                  </h3>
                  <Link
                    href="#"
                    className="mt-4 inline-block rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-primary transition hover:bg-accent/90"
                  >
                    Preuzmi
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
