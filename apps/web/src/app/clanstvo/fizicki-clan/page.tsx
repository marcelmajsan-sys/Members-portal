import Link from 'next/link';
import Breadcrumb from '@/components/ui/Breadcrumb';

const tiers = [
  {
    name: 'BESPLATNO ČLANSTVO',
    subtitle: 'ZA FACEBOOK GRUPU i traženje posla',
    price: '0 €',
    priceNote: '/ god',
    cta: 'Učlani se besplatno',
    featured: false,
    benefits: [
      'mogućnost prijave za posao ili honorarnu suradnju',
      'mogućnost objavljivanja u Facebook grupi (10000+ članova)',
    ],
  },
  {
    name: 'STANDARDNO ČLANSTVO',
    subtitle: 'ZA FIZIČKE OSOBE koji žele iskoristiti sve benefite',
    price: '250 €',
    priceNote: '/ god',
    cta: 'Učlani se za 250 € / god',
    featured: true,
    benefits: [
      'mogućnost sudjelovanja u Facebook grupi',
      'pomoć kod zapošljavanja i pronalaska novih klijenata',
      'pravo na ekskluzivne sadržaje (snimka konferencije, tiskano izdanje Magazina)',
      'besplatan upad na CRO Commerce konferenciju (vrijednost 250€)',
      'besplatan modul Akademije po izboru (online praćenje)',
      'besplatne konzultacije s predsjednikom (30 min)',
      'besplatan upad na sve Meetupove',
      '30% popusta na eCommerce Akademiju',
      '30% popusta na kartičnu naplatu (Monri)',
      '30% popusta na Plus hosting',
    ],
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

export default function FizickiClanPage() {
  return (
    <div className="min-h-screen bg-light">
        {/* Breadcrumb */}
        <div className="bg-section">
          <div className="mx-auto max-w-7xl px-4 py-3">
            <Breadcrumb
              items={[
                { label: 'Članstvo', href: '/clanstvo' },
                { label: 'Fizički članovi' },
              ]}
            />
          </div>
        </div>

        {/* Hero */}
        <section className="bg-gradient-to-br from-primary to-[#2A4A7A] py-16 md:py-20">
          <div className="mx-auto max-w-7xl px-4 text-center">
            <h1 className="text-3xl md:text-5xl font-bold text-white font-heading leading-tight">
              Članstvo – FIZIČKI ČLAN
            </h1>
            <p className="mt-5 text-lg md:text-xl text-white/80 max-w-2xl mx-auto leading-relaxed">
              Posjeti naša događanja i poveži se s najboljim eCommerce stručnjacima u regiji
            </p>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="py-16 md:py-24">
          <div className="mx-auto max-w-3xl px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-6 items-start">
              {tiers.map((tier, index) => (
                <div
                  key={index}
                  className={`rounded-2xl flex flex-col ${
                    tier.featured
                      ? 'bg-gradient-to-br from-primary to-[#2A4A7A] text-white shadow-xl md:scale-105 md:z-10 border-t-4 border-accent'
                      : 'bg-white border border-[#E2E8F0] shadow-sm'
                  }`}
                >
                  {tier.featured && (
                    <div className="bg-white/15 text-center py-2.5 rounded-t-xl">
                      <span className="text-sm font-bold uppercase tracking-wider text-accent">
                        Preporučeni izbor
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
                      className={`text-sm mb-6 leading-relaxed ${
                        tier.featured ? 'text-white/80' : 'text-secondary'
                      }`}
                    >
                      {tier.subtitle}
                    </p>

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

        {/* Cross-links */}
        <section className="py-16 md:py-20 bg-section">
          <div className="mx-auto max-w-7xl px-4 text-center">
            <h2 className="text-xl font-semibold text-heading mb-8 font-heading">
              Zanimaju te druge opcije članstva?
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/clanstvo/web-trgovine"
                className="inline-flex items-center justify-center rounded-lg px-8 py-3.5 text-sm font-semibold uppercase tracking-wide border-2 border-primary text-primary hover:bg-primary hover:text-white transition-all duration-200"
              >
                Postani Član – Web trgovine
              </Link>
              <Link
                href="/clanstvo/nuditelji-usluga"
                className="inline-flex items-center justify-center rounded-lg px-8 py-3.5 text-sm font-semibold uppercase tracking-wide border-2 border-primary text-primary hover:bg-primary hover:text-white transition-all duration-200"
              >
                Postani Član – Nuditelji usluga
              </Link>
            </div>
          </div>
        </section>
    </div>
  );
}
