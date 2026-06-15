'use client';

import { useState } from 'react';
import Link from 'next/link';

const faqs = [
  {
    q: 'Što je Udruga eCommerce Hrvatska?',
    a: 'Udruga eCommerce Hrvatska je strukovna udruga koja okuplja web trgovce, nuditelje usluga i sve zainteresirane za elektroničku trgovinu u Hrvatskoj. Naša misija je edukacija, umrežavanje i zastupanje interesa online trgovaca.',
  },
  {
    q: 'Kako se mogu učlaniti?',
    a: 'Učlaniti se možete putem naše web stranice odabirom odgovarajuće kategorije članstva — web trgovina, nuditelj usluga ili fizička osoba. Ispunite prijavnicu i izvršite uplatu članarine.',
  },
  {
    q: 'Koliko iznosi članarina?',
    a: 'Članarina ovisi o kategoriji članstva. Web trgovine plaćaju od 200 EUR godišnje, nuditelji usluga od 500 EUR godišnje, a fizičke osobe 50 EUR godišnje. Detaljne cijene pogledajte na stranici članstva.',
  },
  {
    q: 'Što je Safe Shop oznaka?',
    a: 'Safe Shop je nacionalna oznaka povjerenja za web trgovine koja potvrđuje da web trgovina zadovoljava 10 kriterija eCommerce kodeksa. Oznaka se dodjeljuje svim članovima koji prođu certifikacijski proces.',
  },
  {
    q: 'Kako mogu dobiti Safe Shop oznaku?',
    a: 'Safe Shop oznaku mogu dobiti web trgovine članice udruge koje zadovolje sve kriterije našeg eCommerce kodeksa. Nakon prijave, naš tim provjerava web trgovinu i dodjeljuje oznaku.',
  },
  {
    q: 'Što uključuje eCommerce Akademija?',
    a: 'eCommerce Akademija je program od 8 modula koji pokrivaju ključne teme online prodaje — od postavljanja web trgovine, preko marketinga i SEO-a, do logistike i korisničkog iskustva. Predavači su iskusni praktičari.',
  },
  {
    q: 'Mogu li prisustvovati događanjima bez članstva?',
    a: 'Neka događanja su otvorena za javnost, dok su druga ekskluzivna za članove. Članovi udruge imaju popuste na sve naše edukacije i konferencije.',
  },
  {
    q: 'Kako mogu postati partner udruge?',
    a: 'Zainteresirani za partnerstvo mogu nas kontaktirati putem kontakt forme ili na udruga@ecommerce.hr. Nudimo različite razine partnerstva s pripadajućim benefitima.',
  },
  {
    q: 'Što je CRO Commerce konferencija?',
    a: 'CRO Commerce je najveća eCommerce konferencija u Hrvatskoj koju organizira Udruga eCommerce Hrvatska. Konferencija okuplja stotine web trgovaca, predavača i izlagača iz cijele regije.',
  },
  {
    q: 'Kako mogu objaviti u eCommerce Magazinu?',
    a: 'Ako želite objaviti članak ili istraživanje u našem magazinu, javite nam se na udruga@ecommerce.hr s prijedlogom teme. Naš urednički tim će razmotriti prijedlog.',
  },
  {
    q: 'Gdje mogu pronaći eCommerce vodiče?',
    a: 'Svi naši vodiči i magazini dostupni su besplatno na stranici Vodici. Uključuju istraživanja, savjete iz prakse i analize tržišta web trgovina u Hrvatskoj.',
  },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary to-[#152a4a] py-20 text-white">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h1 className="font-heading text-4xl font-bold md:text-5xl">
            Često postavljana pitanja
          </h1>
          <p className="mt-4 text-lg text-white/70">Pronađite odgovore na najčešća pitanja o članstvu, uslugama i događanjima</p>
        </div>
      </section>

      {/* Accordion */}
      <section className="bg-bg-light py-16">
        <div className="mx-auto max-w-3xl px-6">
          <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
            {faqs.map((faq, i) => (
              <div key={i} className="border-b border-[#E2E8F0] last:border-b-0">
                <button
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                  className="flex w-full items-center justify-between px-6 py-5 text-left transition hover:bg-bg-section"
                >
                  <span className="pr-4 font-semibold text-text-heading">{faq.q}</span>
                  <svg
                    className={`h-5 w-5 shrink-0 text-accent transition-transform ${
                      openIndex === i ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openIndex === i && (
                  <div className="border-t border-[#E2E8F0] px-6 py-5 text-text-body leading-relaxed bg-bg-light">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="bg-bg-section py-14">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-heading text-2xl font-bold text-text-heading">
            Nisi pronašao odgovor?
          </h2>
          <p className="mt-3 text-text-body">
            Kontaktiraj nas i rado ćemo ti pomoći s bilo kojim pitanjem.
          </p>
          <Link
            href="/kontakt"
            className="mt-6 inline-block rounded-lg bg-accent px-8 py-3 font-semibold text-primary transition hover:bg-accent/90"
          >
            Kontaktiraj nas
          </Link>
        </div>
      </section>

      {/* Free Guides */}
      <section className="bg-white py-14">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-heading text-2xl font-bold text-text-heading">
            Besplatni vodici
          </h2>
          <p className="mt-3 text-text-body">
            Preuzmite naše besplatne eCommerce vodiče i unaprijedite svoje poslovanje.
          </p>
          <Link
            href="/vodici"
            className="mt-6 inline-block rounded-lg border-2 border-primary px-8 py-3 font-semibold text-primary transition hover:bg-primary hover:text-white"
          >
            Pogledaj vodiče
          </Link>
        </div>
      </section>
    </>
  );
}
