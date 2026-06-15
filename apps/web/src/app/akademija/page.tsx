'use client';

import { useState } from 'react';
import Link from 'next/link';

/* -- Data ------------------------------------------------ */

const learningOutcomes = [
  'Napraviti strategiju za izradu webshopa',
  'Odabrati platformu i izvođača koji vas neće opljačkati',
  'Osmisliti sadržaj koji će privući vaše ciljane kupce',
  'Kreirati oglase koji će prodavati',
  'Analizirati i optimizirati webshop',
  'Rješavati prigovore i stvoriti zadovoljne kupce',
  'Uskladiti webshop sa zakonima i izbjeći drakonske kazne',
];

const testimonials = [
  {
    quote:
      'Akademija mi je otvorila oči za sve ono što nisam znao o vođenju webshopa. Praktični primjeri i mentorski pristup čine razliku.',
    author: 'Marko T.',
    role: 'Vlasnik web trgovine',
  },
  {
    quote:
      'Nakon Akademije sam potpuno promijenila pristup marketingu i prodaji. ROI se osjetio već u prvom mjesecu.',
    author: 'Ana K.',
    role: 'Marketing menadžerica',
  },
  {
    quote:
      'Konačno sam razumio kako pravilno strukturirati webshop i koje su zakonske obveze. Preporučujem svima koji tek počinju.',
    author: 'Ivan P.',
    role: 'Poduzetnik',
  },
  {
    quote:
      'Moduli su odlično raspoređeni - svaki predavač donosi ogromno iskustvo. Posebno mi je pomogao modul o SEO-u i analitici.',
    author: 'Petra S.',
    role: 'Freelancer',
  },
];

const valueProps = [
  {
    title:
      'Osigurajte svoje mjesto na eCommerce Akademiji i postanite certificirani voditelj webshopa',
    desc: 'Po završetku svih 8 modula dobivate certifikat eCommerce Akademije koji potvrđuje vaše znanje i kompetencije u vođenju online trgovine.',
  },
  {
    title: 'Izgradite webshop uz optimizaciju troškova i podršku mentora',
    desc: 'Naučite kako planirati budžet, odabrati prave alate i platforme te izbjeći skupe greške uz kontinuiranu podršku iskusnih mentora.',
  },
  {
    title: 'Naučite privući kupce i povećati prodaju',
    desc: 'Ovladajte tehnikama digitalnog marketinga, SEO optimizacije i psihologije prodaje kako biste privukli ciljanu publiku i povećali konverzije.',
  },
  {
    title: 'Osigurajte zakonitost i stabilnost poslovanja',
    desc: 'Saznajte sve o zakonskim regulativama, GDPR-u i pravima potrošača kako biste izbjegli kazne i izgradili povjerenje kupaca.',
  },
  {
    title:
      'Postanite lider u svojoj niši i ostavite konkurenciju iza sebe',
    desc: 'Primijenite napredne strategije analize tržišta, korisničkog iskustva i optimizacije kako biste se istaknuli u konkurentnom eCommerce okruženju.',
  },
];

const modules = [
  {
    num: 1,
    title: 'WEBSHOP STRATEGIJA',
    date: '7.4.2026.',
    speaker: 'Dario Begonja',
    price: '250 EUR',
  },
  {
    num: 2,
    title: 'RAZVOJ I OPTIMIZACIJA WEBSHOPA',
    date: '9.4.2026.',
    speaker: 'Aron Stanić',
    price: '250 EUR',
  },
  {
    num: 3,
    title: 'SEO & PISANJE ZA WEB',
    date: '14.4.2026.',
    speaker: 'Marko Pačar',
    price: '250 EUR',
  },
  {
    num: 4,
    title: 'PSIHOLOGIJA PRODAJE',
    date: '16.4.2026.',
    speaker: 'Goran Blagus',
    price: '250 EUR',
  },
  {
    num: 5,
    title: 'DIGITALNI MARKETING ZA WEBSHOPOVE',
    date: '21.4.2026.',
    speaker: 'Dino Oreški',
    price: '250 EUR',
  },
  {
    num: 6,
    title: 'ANALIZA WEBSHOPA',
    date: '23.4.2026.',
    speaker: 'Robert Petković',
    price: '250 EUR',
  },
  {
    num: 7,
    title: 'CUSTOMER EXPERIENCE',
    date: '28.4.2026.',
    speaker: 'Tea Nađ Župan',
    price: '250 EUR',
  },
  {
    num: 8,
    title: 'KAKO USKLADITI WEBSHOP SA ZAKONIMA',
    date: '30.4.2026.',
    speaker: 'Dijana Kladar',
    price: '250 EUR',
  },
];

const faqs = [
  {
    q: 'Mogu li pratiti Akademiju online?',
    a: 'Da! Akademija je dostupna i uživo u Zagrebu i online putem live streama. Oba formata nude istu kvalitetu sadržaja i mogućnost interakcije s predavačima.',
  },
  {
    q: 'Što ako ne mogu prisustvovati nekom modulu?',
    a: 'Snimke svih modula bit će dostupne polaznicima nakon završetka Akademije, tako da možete pogledati propušteni sadržaj naknadno.',
  },
  {
    q: 'Je li moguće upisati samo pojedinačne module?',
    a: 'Da, možete upisati pojedinačne module po cijeni od 250 EUR po modulu. Ipak, preporučujemo kompletnu Akademiju za cjelovito znanje.',
  },
  {
    q: 'Dobivam li certifikat po završetku?',
    a: 'Da, po uspješnom završetku svih 8 modula dobivate certifikat eCommerce Akademije koji potvrđuje vaše kompetencije u vođenju online trgovine.',
  },
];

const targetAudience = [
  {
    title: 'Trgovcima',
    desc: 'Vlasnicima i voditeljima web trgovina koji žele unaprijediti svoje poslovanje, povećati prodaju i profesionalizirati pristup online prodaji.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.15c0 .415.336.75.75.75z" />
      </svg>
    ),
  },
  {
    title: 'Nuditeljima usluga',
    desc: 'Agencijama, freelancerima i konzultantima koji rade s eCommerce klijentima i žele proširiti svoje znanje o cjelokupnom ekosustavu.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
      </svg>
    ),
  },
  {
    title: 'Fizičkim osobama',
    desc: 'Svima koji planiraju pokrenuti vlastitu online trgovinu i žele krenuti s čvrstim temeljima znanja, strategije i praktičnih vještina.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
];

const notForItems = [
  {
    title: 'Tražite brzo rješenje',
    desc: 'Akademija nije za one koji očekuju instant rezultate bez ulaganja truda. Potrebno je aktivno sudjelovanje i implementacija naučenog.',
  },
  {
    title: 'Već ste napredni eCommerce stručnjak',
    desc: 'Ako već imate duboko znanje o svim aspektima online prodaje, ova edukacija vam možda neće donijeti dovoljno novih uvida.',
  },
  {
    title: 'Ne planirate raditi u eCommerceu',
    desc: 'Akademija je usmjerena isključivo na online trgovinu i digitalno poslovanje. Ako to nije vaš fokus, ovo nije pravi program za vas.',
  },
];

/* -- Components ------------------------------------------ */

function FAQAccordion() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      {faqs.map((faq, idx) => (
        <div
          key={idx}
          className="bg-white rounded-xl overflow-hidden shadow-sm"
        >
          <button
            onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
            className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-light transition-colors"
          >
            <span className="font-semibold text-heading pr-4">
              {faq.q}
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className={`w-5 h-5 flex-shrink-0 text-accent transition-transform duration-200 ${
                openIdx === idx ? 'rotate-180' : ''
              }`}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 8.25l-7.5 7.5-7.5-7.5"
              />
            </svg>
          </button>
          <div
            className={`overflow-hidden transition-all duration-300 ${
              openIdx === idx ? 'max-h-48' : 'max-h-0'
            }`}
          >
            <p className="px-6 pb-5 text-secondary leading-relaxed">
              {faq.a}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* -- Page ------------------------------------------------ */

export default function AkademijaPage() {
  return (
    <>
      {/* Hero */}
      <section className="gradient-hero py-24">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
            Otvoreni su upisi na{' '}
            <span className="text-accent">16. eCommerce Akademiju</span>!
          </h1>
          <p className="mt-6 text-xl md:text-2xl text-white/80 font-light">
            Mentorska edukacija o planiranju, vođenju i razvoju uspješne online
            trgovine
          </p>
          <p className="mt-4 text-lg leading-relaxed max-w-2xl mx-auto text-white/70">
            Naučite kako izgraditi webshop koji ne samo da privlači, već i
            zadržava kupce - i to uz provjerene metode vodećih stručnjaka.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white/90 text-sm px-4 py-2 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              7.4.2026. - 30.4.2026.
            </span>
            <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white/90 text-sm px-4 py-2 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              Zagreb
            </span>
            <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white/90 text-sm px-4 py-2 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Uživo + online
            </span>
          </div>
          <a
            href="#upis"
            className="mt-10 inline-block bg-accent hover:bg-accent-light text-primary font-bold text-lg px-10 py-4 rounded-lg transition-colors"
          >
            Rezervirajte mjesto
          </a>
        </div>
      </section>

      {/* Learning Outcomes */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-heading text-center mb-12">
            Što ćete naučiti?
          </h2>
          <ul className="space-y-5">
            {learningOutcomes.map((item, idx) => (
              <li key={idx} className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-0.5">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-6 h-6 text-accent"
                  >
                    <path
                      fillRule="evenodd"
                      d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <span className="text-body text-lg">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-section">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-heading text-center mb-12">
            Što kažu polaznici?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {testimonials.map((t, idx) => (
              <div
                key={idx}
                className="bg-white rounded-xl p-8 shadow-sm"
              >
                <div className="text-accent text-4xl font-serif leading-none mb-4">
                  &ldquo;
                </div>
                <p className="text-body leading-relaxed mb-6 italic">
                  {t.quote}
                </p>
                <div>
                  <p className="font-bold text-heading">{t.author}</p>
                  <p className="text-sm text-secondary">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Value Propositions */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 space-y-16">
          {valueProps.map((prop, idx) => (
            <div
              key={idx}
              className={`flex flex-col md:flex-row items-center gap-8 ${
                idx % 2 === 1 ? 'md:flex-row-reverse' : ''
              }`}
            >
              <div className="flex-shrink-0">
                <div className="w-20 h-20 rounded-2xl bg-accent flex items-center justify-center text-primary font-heading text-3xl font-bold">
                  {idx + 1}
                </div>
              </div>
              <div>
                <h3 className="font-heading text-xl md:text-2xl font-bold text-heading mb-3">
                  {prop.title}
                </h3>
                <p className="text-secondary leading-relaxed">
                  {prop.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="cijena" className="py-20 bg-section">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-heading text-center mb-4">
            Cijena
          </h2>
          <p className="text-center text-secondary mb-12">
            15 fizičkih + 15 online polaznika po modulu
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Full price */}
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
              <p className="text-sm uppercase tracking-wider text-secondary mb-2">
                Puna cijena
              </p>
              <p className="font-heading text-5xl font-bold text-heading">
                2.000
              </p>
              <p className="text-secondary mt-1">EUR</p>
              <p className="text-sm text-secondary mt-4">
                Svih 8 modula
              </p>
            </div>
            {/* VIP - featured */}
            <div className="gradient-primary rounded-2xl p-8 text-center text-white shadow-lg relative overflow-hidden scale-105">
              <div className="absolute top-3 right-3 bg-accent text-primary text-xs font-bold px-3 py-1 rounded-full uppercase">
                VIP
              </div>
              <p className="text-sm uppercase tracking-wider text-white/80 mb-2">
                Članovi udruge
              </p>
              <p className="font-heading text-5xl font-bold">1.400</p>
              <p className="mt-1 text-white/80">EUR</p>
              <p className="text-sm text-white/60 mt-4">
                Svih 8 modula uz VIP popust
              </p>
            </div>
            {/* Single module */}
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
              <p className="text-sm uppercase tracking-wider text-secondary mb-2">
                Pojedinačni modul
              </p>
              <p className="font-heading text-5xl font-bold text-heading">
                250
              </p>
              <p className="text-secondary mt-1">EUR</p>
              <p className="text-sm text-secondary mt-4">
                Po jednom modulu
              </p>
            </div>
          </div>
          <div id="upis" className="text-center mt-12">
            <Link
              href="/clanstvo"
              className="inline-block bg-accent hover:bg-accent-light text-primary font-bold text-lg px-10 py-4 rounded-lg transition-colors"
            >
              Upišite eCommerce Akademiju
            </Link>
          </div>
        </div>
      </section>

      {/* 8 Modules */}
      <section id="moduli" className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-heading text-center mb-12">
            8 modula
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {modules.map((mod) => (
              <div
                key={mod.num}
                className="bg-light rounded-xl p-6 hover:shadow-lg transition-shadow group"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-11 h-11 rounded-full bg-accent flex items-center justify-center text-primary font-bold text-lg">
                    {mod.num}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-heading text-lg font-bold text-heading mb-3 group-hover:text-primary transition-colors">
                      {mod.title}
                    </h3>
                    <div className="space-y-1.5 text-sm text-secondary">
                      <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-accent">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                        </svg>
                        <span>{mod.date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-accent">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                        </svg>
                        <span>{mod.speaker}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-accent">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>
                        <span className="font-semibold">{mod.price}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 bg-section">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-heading text-center mb-12">
            Česta pitanja
          </h2>
          <FAQAccordion />
        </div>
      </section>

      {/* Target Audience */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-heading text-center mb-12">
            Kome je Akademija namijenjena?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {targetAudience.map((item, idx) => (
              <div
                key={idx}
                className="bg-light rounded-2xl p-8 text-center"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/10 text-accent mb-5">
                  {item.icon}
                </div>
                <h3 className="font-heading text-xl font-bold text-heading mb-3">
                  {item.title}
                </h3>
                <p className="text-secondary text-sm leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NOT For Section */}
      <section className="py-20 bg-section">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-heading text-center mb-12">
            Akademija nije za vas ako...
          </h2>
          <div className="space-y-4">
            {notForItems.map((item, idx) => (
              <div
                key={idx}
                className="bg-white rounded-xl p-6 flex gap-4 shadow-sm"
              >
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-7 h-7 rounded-full bg-red-50 flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2.5}
                      stroke="currentColor"
                      className="w-4 h-4 text-red-500"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-heading mb-1">
                    {item.title}
                  </h3>
                  <p className="text-secondary text-sm leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
