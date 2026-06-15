'use client';

import { useState } from 'react';
import Link from 'next/link';
import Breadcrumb from '@/components/ui/Breadcrumb';

const membershipTypes = [
  {
    title: 'Članstvo - WEB TRGOVINE',
    description:
      'Za sve web trgovce koji žele unaprijediti svoje poslovanje, dobiti certifikaciju i pristupiti ekskluzivnim resursima.',
    href: '/clanstvo/web-trgovine',
    icon: (
      <svg className="w-12 h-12 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
      </svg>
    ),
  },
  {
    title: 'Članstvo - NUDITELJI USLUGA',
    description:
      'Za agencije, developere i sve koji nude usluge eCommerce trgovcima i žele biti dio zajednice.',
    href: '/clanstvo/nuditelji-usluga',
    icon: (
      <svg className="w-12 h-12 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    title: 'Članstvo - FIZIČKI ČLANOVI',
    description:
      'Za sve fizičke osobe koje žele pratiti eCommerce scenu, educirati se i networking.',
    href: '/clanstvo/fizicki-clan',
    icon: (
      <svg className="w-12 h-12 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
];

const faqItems = [
  {
    question: 'Koje su glavne vrijednosti udruge eCommerce Hrvatska?',
    answer:
      'Udruga eCommerce Hrvatska temelji se na zajedništvu, edukaciji, transparentnosti i inovaciji. Naš cilj je izgraditi snažnu eCommerce zajednicu koja pomaže trgovcima i pružateljima usluga da rastu, razvijaju se i budu konkurentniji na tržištu. Okupljamo preko 10.000 profesionalaca iz regije koji dijele znanje i iskustva.',
  },
  {
    question: 'Nudite li besplatno savjetovanje?',
    answer:
      'Da, članovi udruge imaju pristup besplatnim savjetovanjima kroz razne kanale. Punopravni članovi mogu zakazati individualne konzultacije s predsjednikom udruge u trajanju od 30 minuta. Također, svi članovi mogu postavljati pitanja u Facebook grupi gdje im pomažu iskusni profesionalci iz zajednice.',
  },
  {
    question: 'Kada članstvo postaje aktivno i koliko traje?',
    answer:
      'Članstvo postaje aktivno odmah nakon uspješne registracije i plaćanja (za plaćene pakete). Članstvo traje 12 mjeseci od dana aktivacije i može se obnoviti po isteku razdoblja. Besplatno (podržavajuće) članstvo traje neograničeno, ali se može nadograditi u bilo kojem trenutku.',
  },
  {
    question: 'Što ako nisam zadovoljan članstvom ili sam se predomislio?',
    answer:
      'Za punopravno članstvo nudimo 100% garanciju povrata novca. Ako u roku od 12 mjeseci ne iskoristite nijedan benefit članstva, vraćamo vam cjelokupni iznos. Želimo da svaki član osjeti stvarnu vrijednost članstva, stoga se trudimo pružiti maksimalan broj prilika za korištenje benefita.',
  },
  {
    question: 'Koja je razlika između besplatnog i punopravnog članstva za trgovce?',
    answer:
      'Besplatno (podržavajuće) članstvo uključuje osnovne benefite poput pristupa Facebook grupi, besplatnog ulaza na Meetupove i 30% popusta na razne usluge. Punopravno članstvo nadograđuje to s certifikacijom webshopa, SafeShop alatom za recenzije, konzultacijama s predsjednikom, besplatnom kotizacijom za CRO Commerce konferenciju i pristupom ekskluzivnim sadržajima.',
  },
  {
    question: 'Tko može prisustvovati Meetupovima Udruge?',
    answer:
      'Meetupovi su otvoreni za sve članove udruge. Besplatni (podržavajući) članovi imaju pravo na besplatan ulaz za 1 osobu, dok punopravni članovi mogu dovesti 2 osobe. Meetupovi se organiziraju redovito u različitim gradovima i predstavljaju izvrsnu priliku za networking i učenje.',
  },
  {
    question: 'Kako se mogu prijaviti za certifikaciju webshopa?',
    answer:
      'Certifikacija webshopa dostupna je punopravnim i premium članovima. Nakon učlanjenja, možete pokrenuti proces certifikacije kroz svoj članski profil. Certifikacija uključuje provjeru kvalitete webshopa prema našim standardima i dodjelu certifikata koji povećava povjerenje kupaca.',
  },
  {
    question: 'Koji su zajednički benefiti za SVE članove Udruge?',
    answer:
      'Svi članovi udruge, neovisno o vrsti članstva, imaju pristup Facebook grupi s preko 10.000 članova, mogu prisustvovati Meetupovima, imaju profil na ecommerce.hr webu i ostvaruju popuste na razne partnerske usluge poput hostinga, kartičnog plaćanja i edukacija.',
  },
  {
    question: 'Što ako nisam web trgovac, ali me zanima ecommerce ili nudim usluge trgovcima?',
    answer:
      'Imamo posebne kategorije članstva za nuditelje usluga (agencije, developere, marketinške stručnjake) i za fizičke osobe koje žele pratiti eCommerce industriju. Nuditelji usluga mogu pristupiti kao limitirani (besplatno za developere) ili standardni/premium članovi, dok fizičke osobe mogu birati između besplatnog i standardnog članstva.',
  },
  {
    question: 'Koliko često se organizira eCommerce Akademija i može li se pohađati online?',
    answer:
      'eCommerce Akademija organizira se nekoliko puta godišnje i pokriva različite teme relevantne za online trgovinu. Akademija se može pohađati i online. Članovi ostvaruju značajne popuste na cijenu kotizacije - od 30% za podržavajuće članove do potpuno besplatnog pristupa za premium članove.',
  },
  {
    question: 'Kako do tiskanog izdanja eCommerce magazina?',
    answer:
      'Tiskano izdanje eCommerce magazina dostupno je punopravnim i premium članovima kao dio članskog paketa. Magazin izlazi periodično i donosi najnovije trendove, intervjue s uspješnim trgovcima, analize tržišta i praktične savjete za unapređenje vašeg online poslovanja.',
  },
];

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-[#E2E8F0]">
      <button
        className="w-full flex items-center justify-between py-5 px-1 text-left group"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-[16px] font-semibold text-heading pr-4 group-hover:text-primary transition-colors font-heading">
          {question}
        </span>
        <svg
          className={`w-5 h-5 shrink-0 text-accent transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96 pb-5' : 'max-h-0'}`}
      >
        <p className="text-[15px] text-secondary leading-relaxed px-1">{answer}</p>
      </div>
    </div>
  );
}

export default function ClanstvoPage() {
  return (
    <div className="min-h-screen bg-light">
        {/* Breadcrumb */}
        <div className="bg-section">
          <div className="mx-auto max-w-7xl px-4 py-3">
            <Breadcrumb items={[{ label: 'Članstvo' }]} />
          </div>
        </div>

        {/* Hero */}
        <section className="bg-gradient-to-br from-primary to-[#2A4A7A] py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-4 text-center">
            <h1 className="text-3xl md:text-5xl font-bold text-white font-heading leading-tight">
              Odaberi željeni oblik članstva
            </h1>
            <p className="mt-5 text-lg md:text-xl text-white/80 max-w-2xl mx-auto leading-relaxed">
              Pridruži se udruzi koja okuplja preko 10.000 eCommerce profesionalaca iz regije.
            </p>
          </div>
        </section>

        {/* Membership Cards */}
        <section className="py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {membershipTypes.map((type) => (
                <Link
                  key={type.href}
                  href={type.href}
                  className="group bg-white rounded-2xl border border-[#E2E8F0] p-10 shadow-sm hover:shadow-xl hover:border-accent/40 hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center"
                >
                  <div className="w-20 h-20 rounded-2xl bg-section flex items-center justify-center mb-7 group-hover:bg-accent/10 transition-colors">
                    {type.icon}
                  </div>
                  <h2 className="text-xl font-bold text-heading mb-3 font-heading">{type.title}</h2>
                  <p className="text-[15px] text-secondary leading-relaxed mb-8">
                    {type.description}
                  </p>
                  <span className="mt-auto inline-flex items-center gap-2 text-primary font-semibold text-sm uppercase tracking-wide group-hover:gap-3 transition-all">
                    Saznaj više
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 md:py-24 bg-section">
          <div className="mx-auto max-w-3xl px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-heading text-center mb-3 font-heading">
              Česta pitanja
            </h2>
            <p className="text-center text-secondary mb-12">
              Pronađi odgovore na najčešća pitanja o članstvu u udruzi eCommerce Hrvatska.
            </p>
            <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] px-6 md:px-8">
              {faqItems.map((item, index) => (
                <FAQItem key={index} question={item.question} answer={item.answer} />
              ))}
            </div>
          </div>
        </section>
    </div>
  );
}
