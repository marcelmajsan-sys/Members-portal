import Link from 'next/link';

const partners = [
  { name: 'Monri Payments', desc: 'Kompletno rješenje za online plaćanja karticama u Hrvatskoj i regiji.' },
  { name: 'DWizards', desc: 'Digitalna agencija specijalizirana za izradu i optimizaciju web trgovina.' },
  { name: 'TrustProfile', desc: 'Platforma za prikupljanje i prikaz recenzija kupaca na web trgovinama.' },
  { name: 'SAOP', desc: 'ERP i računovodstvena rješenja prilagođena potrebama online trgovaca.' },
  { name: 'Plus Hosting', desc: 'Hosting rješenja optimizirana za eCommerce platforme.' },
  { name: 'Računovodstvo Ledine', desc: 'Specijalizirano računovodstvo za web trgovine i digitalno poslovanje.' },
  { name: 'Vision Compliance', desc: 'Usklađivanje web trgovina s GDPR-om i zakonskim regulativama.' },
  { name: 'Women in Adria', desc: 'Inicijativa za podršku ženama u digitalnom poslovanju i eCommerce-u.' },
];

export default function PartneriPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary to-[#152a4a] py-20 text-white">
        <div className="mx-auto max-w-6xl px-6">
          <h1 className="font-heading text-4xl font-bold md:text-5xl">Partneri</h1>
          <p className="mt-3 text-lg text-white/70">
            Partneri koji podržavaju rad Udruge eCommerce Hrvatska
          </p>
        </div>
      </section>

      {/* Grid */}
      <section className="bg-bg-light py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {partners.map((partner) => (
              <div
                key={partner.name}
                className="flex flex-col items-center rounded-2xl border border-[#E2E8F0] bg-white p-8 text-center shadow-sm transition hover:shadow-md"
              >
                <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-bg-section text-xs font-semibold text-text-secondary">
                  Logo
                </div>
                <h3 className="text-lg font-semibold text-text-heading">{partner.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-body">{partner.desc}</p>
                <Link
                  href="#"
                  className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline"
                >
                  Posjeti stranicu
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Become Partner CTA */}
      <section className="bg-bg-section py-14">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="font-heading text-2xl font-bold text-text-heading">
            Želiš postati partner?
          </h2>
          <p className="mt-3 text-text-body">
            Kontaktiraj nas i saznaj više o partnerskim paketima.
          </p>
          <Link
            href="/kontakt"
            className="mt-6 inline-block rounded-lg bg-accent px-8 py-3 font-semibold text-primary transition hover:bg-accent/90"
          >
            Kontaktiraj nas
          </Link>
        </div>
      </section>
    </>
  );
}
