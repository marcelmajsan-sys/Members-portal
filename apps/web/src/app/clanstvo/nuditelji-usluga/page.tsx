import Link from 'next/link';
import Breadcrumb from '@/components/ui/Breadcrumb';

const tiers = [
  {
    name: 'LIMITIRANO ČLANSTVO',
    subtitle: 'ZA DEVELOPERE',
    description:
      'koji žele biti prepoznati ako nudite uslugu razvoja webshopa, ispunite kratki upitnik i postanite naš podržavajući član, te osigurajte pristup novim leadovima!',
    note: 'Podržavajući članovi nemaju benefite koje imaju standardni i premium članovi.',
    price: '0 €',
    priceNote: '/ god',
    cta: 'Učlani se besplatno',
    featured: false,
    benefits: [] as string[],
  },
  {
    name: 'STANDARDNO ČLANSTVO',
    subtitle: 'ZA NUDITELJE USLUGA',
    description: null,
    note: 'uz promociju',
    price: '400 €',
    priceNote: '/ god',
    cta: 'Učlani se za 400 € / god',
    featured: true,
    benefits: [
      'profil vaše tvrtke na webu Udruge',
      'mogućnost promocije posebnih pogodnosti za članove Udruge (Newsletter, Facebook grupa)',
      'mogućnost objave 1x PR članka na webu Udruge (uz autorizaciju teksta)',
      'pravo na ekskluzivne sadržaje (snimka konferencije, istraživanje online kupaca)',
      '1x kotizacija za CRO Commerce konferenciju (vrijednost 250€)',
      '1x kotizacija za sve eCommerce Meetupove',
      'mogućnost sudjelovanja u Facebook grupi',
      '30% popusta na dodatne ulaznice CRO Commerce konferencije',
      '30% popusta na eCommerce Akademiju',
      '30% popusta na kartičnu naplatu (Monri)',
      '30% popusta na hosting (Plus)',
      'eCommerce Hrvatska Member Badge',
    ],
  },
  {
    name: 'PREMIUM ČLANSTVO',
    subtitle: 'ZA NAJBOLJE USLUGE',
    description:
      'Premium članarine nudimo samo istaknutim tvrtkama',
    note: null,
    price: '1.500 €',
    priceNote: '/ god',
    cta: 'Učlani se za 1.500 € / god',
    featured: false,
    benefits: [
      'sve iz standardnog paketa',
      '3x VIP kotizacija za CRO Commerce konferenciju (vrijednost 1200€)',
      '3x kotizacija za sve eCommerce Meetupove',
      'uključuje dodatnu promociju (strategiju dogovaramo individualno)',
      'sva istraživanja udruge (online trgovaca i online kupaca)',
      'eCommerce Hrvatska Premium Member Badge',
    ],
  },
];

const testimonials = [
  {
    quote:
      'Veoma dobra organizacija konferencije, zanimljiva i poučna predavanja te veliki broj posjetitelja iz poslovnog svijeta.',
    name: 'Josipa Lauš',
    company: 'Key Account Manager, Selectbox',
  },
  {
    quote:
      'Jako dobra vibra konferencije, dijalozi, pozitivna energija',
    name: 'Tomislav Bilić',
    company: 'CEO, Inchoo',
  },
  {
    quote:
      'Svake godine dižete ljestvicu, CroCommerce je postao centralno mjesto susreta zajednice',
    name: 'David Peranić',
    company: 'CEO, Scoreminds',
  },
  {
    quote:
      'Veoma smo zadovoljni. Stvarno organizacija, sudionici i speakeri – sve na mjestu.',
    name: 'Goran Udošić',
    company: 'CEO, Minds',
  },
  {
    quote:
      'Ponosni smo što smo dio udruge eCommerce Hrvatska!',
    name: 'Miroslav Mareš',
    company: 'CEO, BoxNow',
  },
  {
    quote:
      'Jučer sam ponovo bio na eCommerce & Marketing konferenciji. I iskreno – wow. Povezati 600 ljudi na jednom mjestu i dizati ljestvicu svake godine je nevjerojatan uspjeh',
    name: 'Davor Bomeštar',
    company: 'CEO, Fortis Agency',
  },
  {
    quote:
      'I especially liked the organisation, it worked like a well oiled machine. As an exhibitor it was really convenient to cooperate with eCommerce Hrvatska with setting up the necessary things for the event.',
    name: 'Arpad Neveri',
    company: 'Key Account Manager, Decta',
  },
];

function CheckIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`w-5 h-5 shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function NuditeljUslugaPage() {
  return (
    <div className="min-h-screen bg-light">
        {/* Breadcrumb */}
        <div className="bg-section">
          <div className="mx-auto max-w-7xl px-4 py-3">
            <Breadcrumb
              items={[
                { label: 'Članstvo', href: '/clanstvo' },
                { label: 'Nuditelji usluga' },
              ]}
            />
          </div>
        </div>

        {/* Hero */}
        <section className="bg-gradient-to-br from-primary to-[#2A4A7A] py-16 md:py-20">
          <div className="mx-auto max-w-7xl px-4 text-center">
            <h1 className="text-3xl md:text-5xl font-bold text-white font-heading leading-tight">
              Članstvo – NUDITELJ USLUGA
            </h1>
            <p className="mt-5 text-lg md:text-xl text-white/80 max-w-2xl mx-auto leading-relaxed">
              Prezentiraj svoje usluge ostalim članovima udruge i pronađi nove partnere.
            </p>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-6 items-start">
              {tiers.map((tier, index) => (
                <div
                  key={index}
                  className={`rounded-2xl flex flex-col ${
                    tier.featured
                      ? 'bg-gradient-to-br from-primary to-[#2A4A7A] text-white shadow-xl lg:scale-105 lg:z-10 border-t-4 border-accent'
                      : 'bg-white border border-[#E2E8F0] shadow-sm'
                  }`}
                >
                  {tier.featured && (
                    <div className="bg-white/15 text-center py-2.5 rounded-t-xl">
                      <span className="text-sm font-bold uppercase tracking-wider text-accent">
                        Najpopularniji izbor
                      </span>
                    </div>
                  )}
                  <div className="p-8 lg:p-10 flex flex-col flex-1">
                    <h3
                      className={`text-lg font-bold mb-2 font-heading ${
                        tier.featured ? 'text-white' : 'text-heading'
                      }`}
                    >
                      {tier.name}
                    </h3>
                    <p
                      className={`text-sm mb-2 leading-relaxed font-semibold ${
                        tier.featured ? 'text-white/80' : 'text-secondary'
                      }`}
                    >
                      {tier.subtitle}
                    </p>
                    {tier.description && (
                      <p
                        className={`text-sm mb-4 leading-relaxed ${
                          tier.featured ? 'text-white/70' : 'text-body'
                        }`}
                      >
                        {tier.description}
                      </p>
                    )}
                    {tier.note && (
                      <p
                        className={`text-xs mb-4 leading-relaxed italic ${
                          tier.featured ? 'text-white/60' : 'text-secondary'
                        }`}
                      >
                        {tier.note}
                      </p>
                    )}

                    <div className="mb-8">
                      <span
                        className={`text-4xl font-bold ${
                          tier.featured ? 'text-white' : 'text-heading'
                        }`}
                      >
                        {tier.price}
                      </span>
                      {tier.priceNote && (
                        <span
                          className={`text-lg ml-1 ${
                            tier.featured ? 'text-white/70' : 'text-secondary'
                          }`}
                        >
                          {tier.priceNote}
                        </span>
                      )}
                    </div>

                    {tier.benefits.length > 0 && (
                      <ul className="space-y-3.5 mb-10 flex-1">
                        {tier.benefits.map((benefit, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <CheckIcon
                              className={tier.featured ? 'text-[#F0C878] mt-0.5' : 'text-accent mt-0.5'}
                            />
                            <span
                              className={`text-sm leading-relaxed ${
                                tier.featured ? 'text-white/90' : 'text-body'
                              }`}
                            >
                              {benefit}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}

                    <Link
                      href="#"
                      className={`block w-full text-center rounded-lg px-6 py-4 text-sm font-semibold uppercase tracking-wide transition-all duration-200 ${
                        tier.featured
                          ? 'bg-accent text-primary hover:bg-[#D4952E]'
                          : 'border-2 border-primary text-primary hover:bg-primary hover:text-white'
                      }`}
                    >
                      {tier.cta}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-16 md:py-24 bg-section">
          <div className="mx-auto max-w-7xl px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-heading text-center mb-3 font-heading">
              Iskustva članova – Nuditelja usluga
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
              {testimonials.map((t, index) => (
                <div
                  key={index}
                  className="bg-white rounded-2xl p-7 shadow-sm border border-[#E2E8F0]"
                >
                  <p className="text-sm text-body leading-relaxed mb-5 italic">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-[#2A4A7A] flex items-center justify-center text-white font-bold text-sm">
                      {t.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-heading">{t.name}</p>
                      <p className="text-xs text-secondary">{t.company}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Cross-links */}
        <section className="py-16 md:py-20">
          <div className="mx-auto max-w-7xl px-4 text-center">
            <h2 className="text-xl font-semibold text-heading mb-8 font-heading">
              Nisi nuditelj usluga? Vidi ove opcije:
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/clanstvo/web-trgovine"
                className="inline-flex items-center justify-center rounded-lg px-8 py-3.5 text-sm font-semibold uppercase tracking-wide border-2 border-primary text-primary hover:bg-primary hover:text-white transition-all duration-200"
              >
                Postani Član – Web trgovine
              </Link>
              <Link
                href="/clanstvo/fizicki-clan"
                className="inline-flex items-center justify-center rounded-lg px-8 py-3.5 text-sm font-semibold uppercase tracking-wide border-2 border-primary text-primary hover:bg-primary hover:text-white transition-all duration-200"
              >
                Postani Član – Fizički članovi
              </Link>
            </div>
          </div>
        </section>
    </div>
  );
}
