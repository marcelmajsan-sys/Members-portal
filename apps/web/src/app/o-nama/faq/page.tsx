'use client';

import { useState } from 'react';

const faqs = [
  {
    q: 'Što je Udruga eCommerce Hrvatska?',
    a: 'Udruga eCommerce Hrvatska je neprofitna organizacija osnovana 2015. godine s ciljem promicanja i unapređenja elektroničke trgovine u Hrvatskoj. Okupljamo web trgovce, pružatelje usluga i stručnjake iz područja digitalne trgovine.',
  },
  {
    q: 'Tko može postati član Udruge?',
    a: 'Članom Udruge mogu postati web trgovine (pravne osobe koje prodaju proizvode ili usluge putem interneta), nuditelji usluga (agencije, platforme, logističke tvrtke i drugi pružatelji usluga za eCommerce) te fizičke osobe zainteresirane za područje elektroničke trgovine.',
  },
  {
    q: 'Koliko košta članstvo?',
    a: 'Članarina ovisi o kategoriji članstva. Web trgovine i nuditelji usluga plaćaju godišnju članarinu, dok fizičke osobe imaju povlaštenu cijenu. Za točne iznose i uvjete kontaktirajte nas ili posjetite stranicu o članstvu.',
  },
  {
    q: 'Što je Safe Shop oznaka?',
    a: 'Safe Shop je nacionalna oznaka povjerenja koju dodjeljujemo web trgovinama koje zadovoljavaju 10 kriterija našeg eCommerce kodeksa. Oznaka kupcima signalizira da je web trgovina provjerena i pouzdana.',
  },
  {
    q: 'Kako mogu dobiti Safe Shop oznaku?',
    a: 'Da biste dobili Safe Shop oznaku, potrebno je biti član Udruge i zadovoljiti 10 kriterija eCommerce kodeksa koji uključuju transparentnost poslovanja, zaštitu potrošača, sigurnost plaćanja i druge aspekte kvalitetne online trgovine.',
  },
  {
    q: 'Što je eCommerce Akademija?',
    a: 'eCommerce Akademija je strukturirani edukacijski program koji se sastoji od 8 modula. Svaki modul vodi drugi stručnjak iz prakse, a teme pokrivaju sve aspekte vođenja web trgovine — od strategije i marketinga do logistike i korisničkog iskustva.',
  },
  {
    q: 'Kako se mogu prijaviti na eCommerce Akademiju?',
    a: 'Na eCommerce Akademiju možete se prijaviti putem naše web stranice. Članovi Udruge ostvaruju povlaštene uvjete za sudjelovanje. Pratite naš kalendar događanja za termine novih ciklusa Akademije.',
  },
  {
    q: 'Organizirate li događanja za nečlanove?',
    a: 'Da, neka naša događanja otvorena su i za nečlanove, no članovi uvijek imaju povlaštene uvjete (besplatan ili snižen ulaz). Pratite naš kalendar događanja za informacije o nadolazećim konferencijama, meetupovima i radionicama.',
  },
  {
    q: 'Što je eCommerce Magazin?',
    a: 'eCommerce Magazin je naša digitalna publikacija koja donosi istraživanja web trgovina, analize navika online kupaca, intervjue s vodećim stručnjacima i praktične savjete iz prakse. Magazin je dostupan u digitalnom formatu.',
  },
  {
    q: 'Kako mogu postati partner Udruge?',
    a: 'Partnerstvo s Udrugom eCommerce Hrvatska nudi vidljivost prema 500+ članova eCommerce zajednice. Za informacije o partnerskim paketima i mogućnostima kontaktirajte nas putem emaila udruga@ecommerce.hr.',
  },
  {
    q: 'Kako vas mogu kontaktirati?',
    a: 'Možete nas kontaktirati putem emaila udruga@ecommerce.hr, telefonom na +385 98 188 3000 ili posjetite nas na adresi Republike Austrije 9, 10000 Zagreb. Također nas možete pratiti na društvenim mrežama.',
  },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <article>
      <h1 className="font-heading text-3xl font-bold text-text-heading md:text-4xl">
        Često postavljana pitanja
      </h1>
      <p className="mt-3 text-text-body">
        Pronađite odgovore na najčešća pitanja o Udruzi eCommerce Hrvatska
      </p>

      <div className="mt-8 rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
        {faqs.map((faq, i) => (
          <div key={i} className="border-b border-[#E2E8F0] last:border-b-0">
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="flex w-full items-center justify-between px-6 py-5 text-left transition hover:bg-bg-section"
              aria-expanded={openIndex === i}
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
              <div className="border-t border-[#E2E8F0] px-6 py-5 leading-relaxed text-text-body bg-bg-light">
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </article>
  );
}
