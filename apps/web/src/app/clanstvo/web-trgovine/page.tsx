import Link from 'next/link';
import Breadcrumb from '@/components/ui/Breadcrumb';

const tiers = [
  {
    name: 'PODRŽAVAJUĆE (limitirano) ČLANSTVO',
    subtitle:
      'ZA TRGOVCE POČETNIKE koji rade do 40.000 € prometa godišnje i imaju aktivan webshop na hrvatskom jeziku',
    price: 'BESPLATNO',
    priceNote: null,
    cta: 'Učlani se besplatno',
    featured: false,
    guarantee: null,
    benefits: [
      'mogućnost sudjelovanja u Facebook grupi',
      'besplatan upad na sve Meetupove (1 osoba)',
      'profil na ecommerce.hr webu',
      '30% popusta na eCommerce Akademiju',
      '30% popusta na kartičnu naplatu (Monri)',
      '30% popusta na hosting (Plus)',
      '30% popusta na CRO Commerce konferenciju',
      'eCommerce Hrvatska Member Badge',
    ],
  },
  {
    name: 'PUNOPRAVNO (standardno) ČLANSTVO',
    subtitle: 'ZA TRGOVCE U RAZVOJU',
    price: '300 €',
    priceNote: '/ god',
    cta: 'Učlani se za 300 € / god',
    featured: true,
    guarantee:
      '100 % garancije – ako ne iskoristite nijedan benefit u roku 12 mjeseci, vraćamo vam novac!',
    benefits: [
      'sve iz limitiranog paketa',
      'certifikacija webshopa',
      'alat za prikupljanje i prikaz recenzija (safeshop.hr)',
      'konzultacije s predsjednikom (30 min)',
      '1x kotizacija za CRO Commerce konferenciju',
      'besplatna prijava na sve Meetupove (za 2 osobe)',
      'pravo na ekskluzivne sadržaje (snimka svih predavanja s konferencije, tiskano izdanje magazina i sl.)',
    ],
  },
  {
    name: 'PREMIUM ČLANSTVO',
    subtitle:
      'ZA NAPREDNE TRGOVCE koji žele podržati rad Udruge i dobiti mentorstvo od strane naših stručnjaka',
    price: '2.000 €',
    priceNote: '/ god',
    cta: 'Učlani se za 2.000 € / god',
    featured: false,
    guarantee: null,
    benefits: [
      'sve iz limitiranog i standardnog paketa',
      '1x besplatan online upad na eCommerce Akademiju (vrijednost 2000€)',
      '3x VIP kotizacije za CRO Commerce konferenciju (vrijednost 1200€)',
      'sva istraživanja udruge (online trgovaca & online kupaca)',
    ],
  },
];

const testimonials = [
  {
    quote:
      'U konzultacijama za članove sam zatražio analizu FB kampanjama razumljivo ekipa možda ne poznaje dovoljno brand niti poslovne ciljeve, ali jednostavno to je pogled iz drugog ugla. Uz dobre aktivnosti i brojke otkriveni su i problemi u nekim područjima. Kolege su dali sugestije za poboljšanja i savjete iz njihovog iskustva. Sve u svemu prihvaćam to i pretvaram u nove izazove u poboljšanju prodaje na webshopu. Toplo preporučujem.',
    name: 'Hrvoje Fligić',
    company: 'voditelj webshopa, argentum.hr',
  },
  {
    quote:
      'Uvijek se iznova iznenadimo koliko dobivamo kao članovi eCommerce udruge. Tako je bilo i s konzultacijama za online marketing. Marcel je na temelju brzog skeniranja ukazao na ključne propuste, a dečki iz Hero Factoryja zaista su si dali truda i napravili super analizu. Iako smo do sada prodavali jako dobro, vjerujem da ćemo od sada prodavati puno više.',
    name: 'Igor Kovačić',
    company: 'vlasnik, 50nijansi.hr',
  },
  {
    quote:
      'Analiza nam je ukazala na neke ključne web propuste i uputila nas na kontakte njihovih partnera koji su nam detaljnije analizirali web shop i napravili upute o daljnjim koracima marketinških aktivnosti. Ova analiza nam je došla u ključnom trenutku kada smo odlučili napraviti veći iskorak u svom razvoju i investirati veća sredstva u marketing.',
    name: 'Ana Buljan',
    company: 'vlasnica, 365 Coffee doo',
  },
  {
    quote:
      'eCommerce Hrvatska, hvala na anketi, ali bolje rečeno na vašoj inicijativi koja nas je potakla da se pokrenemo prema boljem korištenju digitalnog marketinga. Konzultacije i analiza naših marketinških aktivnosti napravljene brzo i profesionalno, a dostavljeni izvještaji i check liste su prepuni korisnih savjeta. Veliko hvala Hero Factory timu na angažmanu, zaključcima i prijedlozima. Ovo nam je veliki korak naprijed!',
    name: 'Nikola Smirčić',
    company: 'vlasnik, Funestra doo',
  },
  {
    quote:
      'Izuzetno korisno i pozitivno iskustvo iz pozicije vlasnika web shopa koji pokušava naućiti nove stvari i nadograditi znanja koja već ima. Ekipa koja stoji iza udruge je profesionalna i dobronamjerna. Analiza shopa, konzultacije, meetupovi i razne konfe su više nego koristan alat u procesu unapredenja prodaje. Hvala',
    name: 'Marijan Sokačić',
    company: 'vlasnik, sape.hr',
  },
  {
    quote:
      'Iako već godinama imamo web shop kojeg stalno razvijamo i nastojimo poboljšati, suradnjom s eCommerce udrugom sve smo podigli na neku višu razinu. Na meetupovima možemo saznati korisne savjete, sudjelovati u diskusijama i što je najvažnije upoznavati ljude koji se bave istim stvarima i imaju slične probleme. Možda najbolja stvar je stručna analiza naše web stranice na koju imamo pravo kao članovi udruge, a otkrila nam je što treba popraviti ili možemo napraviti još bolje.',
    name: 'Dubravko Pavlešić',
    company: 'vlasnik, limes.hr',
  },
  {
    quote:
      'Najbolja domaća zajednica posvećena unapređenju eCommercea i centralno mjesto za sve vezano za tu temu – od kvalitetnih i objektivnih analiza webshopova za članove (s tehničke, sadržajne, pravne, UX strane), konzultacija, redovitih, zanimljivih i edukativnih događaja, vrhunskih predavača, networkinga – sve pokrivaju… Dobiven know-how vrijedan svakog centa. Sve pohvale i keep rocking',
    name: 'Nino Zubanović',
    company: 'voditelj webshopa, 3dprintaj.com',
  },
  {
    quote:
      'Svjesni toga da kupac želi drugačije i inovativno korisničko iskustvo, bilo nam je bitno da budemo u korak s vremenom i trendovima te smo stoga postali dio obitelji E-commerca Hrvatska, što preporučujemo apsolutno svakome.',
    name: 'Goran Šijaković',
    company: 'sales, Polleo',
  },
  {
    quote:
      'Učlanjenje u eCommerce HR udrugu pokazalo se kao odličan poslovni potez i mjesto odličnog networkinga s kolegama iz industrije. Sve to rezultiralo je novim idejama, razvojem i rastom našeg digitalnog poslovanja, tako da bih svima iz industrije preporučio učlanjene u udrugu.',
    name: 'Petar Anić',
    company: 'Primat Logistika',
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

export default function WebTrgovinePage() {
  return (
    <div className="min-h-screen bg-light">
        {/* Breadcrumb */}
        <div className="bg-section">
          <div className="mx-auto max-w-7xl px-4 py-3">
            <Breadcrumb
              items={[
                { label: 'Članstvo', href: '/clanstvo' },
                { label: 'Web trgovine' },
              ]}
            />
          </div>
        </div>

        {/* Hero */}
        <section className="bg-gradient-to-br from-primary to-[#2A4A7A] py-16 md:py-20">
          <div className="mx-auto max-w-7xl px-4 text-center">
            <h1 className="text-3xl md:text-5xl font-bold text-white font-heading leading-tight">
              Članstvo – WEB TRGOVINE
            </h1>
            <p className="mt-5 text-lg md:text-xl text-white/80 max-w-2xl mx-auto leading-relaxed">
              Pridruži se Udruzi 500+ trgovaca koji rastu zajedno s nama
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
                      className={`text-sm mb-6 leading-relaxed ${
                        tier.featured ? 'text-white/80' : 'text-secondary'
                      }`}
                    >
                      {tier.subtitle}
                    </p>

                    {tier.guarantee && (
                      <div className="bg-white/10 border border-white/20 rounded-xl p-4 mb-6">
                        <p className="text-sm font-semibold text-white flex items-start gap-2">
                          <svg
                            className="w-5 h-5 shrink-0 mt-0.5 text-accent"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                            />
                          </svg>
                          {tier.guarantee}
                        </p>
                      </div>
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

        {/* Testimonials */}
        <section className="py-16 md:py-24 bg-section">
          <div className="mx-auto max-w-7xl px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-heading text-center mb-3 font-heading">
              Iskustva članova – Vlasnika web trgovina
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
              Nemaš web trgovinu? Pogledaj ostale opcije:
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/clanstvo/nuditelji-usluga"
                className="inline-flex items-center justify-center rounded-lg px-8 py-3.5 text-sm font-semibold uppercase tracking-wide border-2 border-primary text-primary hover:bg-primary hover:text-white transition-all duration-200"
              >
                Postani Član – Nuditelji usluga
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
