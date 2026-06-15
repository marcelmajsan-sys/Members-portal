import Link from 'next/link';

const criteria = [
  {
    num: 1,
    title: 'Iza webshopa stoji stvarni pravni subjekt',
    desc: 'Mi (trgovac) dajemo Vama (potrošaču) informacije o našem identitetu (npr. naziv tvrtke, OIB, adresu adresa tvrtke) i mogućnost da nas kontaktirate na jednostavan način (email, telefon, društvene mreže). Ako poslujemo u ime drugog trgovca (npr u slučaju da smo marketplace), obavještavamo vas i o identitetu trgovca koji će vam robu isporučiti.',
  },
  {
    num: 2,
    title: 'Znate što, kad i gdje kupujete',
    desc: 'Mi (trgovac) omogućujemo transparentan i jednostavan postupak naručivanja koji Vama (potrošaču) pruža mogućnost da provjerite svoju narudžbu i eventualno je ispravite prije nego što pošaljemo robu. Prije nego što zaključite transakciju, pružit ćemo jasne i transparentne informacije o Vašim zakonskim pravima i obvezama. Nakon kupovine ćemo Vam poslati potvrdu narudžbe na email.',
  },
  {
    num: 3,
    title: 'Ono što kupujete, to i dobivate',
    desc: 'Mi (trgovac) brinemo o tome da su bitne karakteristike proizvoda i usluga adekvatno opisane. Proizvodi će biti isporučeni Vama (potrošaču) na temelju opisa i fotografije proizvoda. Ako kupite određenu robnu marku, isporučit ćemo tu određenu robnu marku. Ne prodajemo lažne i krivotvorene proizvode.',
  },
  {
    num: 4,
    title: 'Cijene su jasne i potpune',
    desc: 'Mi (trgovac) jasno i transparentno komuniciramo našu ponudu i cijenu koju Vi (potrošač) morate platiti za naše usluge ili proizvode prije ulaska u proces narudžbe. Nećemo Vam naplatiti dodatne usluge ili proizvode osim ako se izričito ne slažete s ovim dodatnim uslugama ili proizvodima. Prije sklapanja transakcije vidjet ćete konačnu cijenu uključujući sve poreze, obične troškove, troškove isporuke i ostale troškove.',
  },
  {
    num: 5,
    title: 'Plaćanje je sigurno',
    desc: 'Mi (trgovac) Vama (potrošaču) nudimo više široko prihvaćenih i sigurnih načina plaćanja. Webshop koristi siguran protokol (HTTPS) i provjereni sustav za kartično plaćanje. Barem jedan način plaćanja nudi vam opciju za povrat novaca bez našeg pristanka ili vam nudi mogućnost plaćanja nakon što je roba zaprimljena.',
  },
  {
    num: 6,
    title: 'Informacije o dostavi su jasne i transparentne',
    desc: 'Mi (trgovac) isporučit ćemo naručene proizvode u roku koji je naveden u našim uvjetima kupovine. Ako dostavu naplaćujemo, taj trošak ćemo jasno komunicirati u procesu kupovine.',
  },
  {
    num: 7,
    title: 'Imate pravo na povrat robe u roku 14 dana',
    desc: 'Mi (trgovac) dopuštamo Vama (potrošaču) da vratite proizvode u roku od 14 dana od isporuke bez potrebe za davanjem razloga. Samo nekoliko vrsta proizvoda može biti izuzeto od povrata. Vratit ćemo Vam sve uplate koje ste dobili (uključujući troškove dostave) u roku od 14 dana od primitka robe ili dokaza o vraćanju robe. Troškove dostave za povrat robe plaća potrošač.',
  },
  {
    num: 8,
    title: 'Pritužbe se rješavaju brzo i pošteno',
    desc: 'Mi (trgovac) pobrinut ćemo se da Vas (potrošača) kontaktiramo u kratkom roku nakon što nam pošaljete pritužbu, te smo za to osigurali jasne upute u uvjetima. Ako nas kontaktirate, odgovorit ćemo Vam u roku od 3 radna dana na primarnom jeziku našeg webshopa, ili ako je moguće, na Vašem jeziku.',
  },
  {
    num: 9,
    title: 'Privatnost kupca je zaštićena',
    desc: 'Mi (trgovac) poštujemo Vašu privatnost kao kupca, štitimo Vaše podatke i brinemo za sigurno web-okruženje. Transparentni smo i informiramo Vas o prikupljanju i obradi Vaših podataka i njihovim svrhama, uključujući informacije o kolačićima. Uvijek imate opciju isključivanja kolačića sukladno GDPR regulativi. Nećemo prenositi ili prodavati Vaše podatke trećoj strani bez Vašeg izričitog pristanka, osim ako zakonom nije to potrebno.',
  },
  {
    num: 10,
    title: 'Brinemo za sigurnost vaših podataka',
    desc: 'Mi (trgovac) se obvezujemo zaštititi podatke naših kupaca provodeći minimalne sigurnosne procedure koje su definirane za sve nositelje Safe Shop oznake povjerenja.',
  },
];

export default function SafeShopPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="gradient-hero min-h-[500px] flex items-center">
        <div className="max-w-4xl mx-auto px-4 text-center py-24">
          <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
            Pokažite kupcima da vam mogu{' '}
            <span className="relative inline-block">
              vjerovati
              <span className="absolute bottom-1 left-0 w-full h-1.5 bg-accent rounded-full" />
            </span>
          </h1>
          <p className="mt-6 text-lg md:text-xl leading-relaxed max-w-2xl mx-auto text-white/80">
            Učlanite se u udrugu eCommerce Hrvatska kao punopravni član i
            ostvarite pravo na BESPLATNU certifikaciju webshopa
          </p>
          <Link
            href="/clanstvo"
            className="mt-8 inline-block bg-accent hover:bg-accent-light text-primary font-bold text-lg px-8 py-4 rounded-lg transition-colors uppercase"
          >
            Učlanite se ovdje
          </Link>
          <p className="mt-6 text-sm text-white/60">
            Uz certifikaciju dolazi sustav za prikupljanje i prikaz recenzija
          </p>
        </div>
      </section>

      {/* About Section */}
      <section id="o-nama" className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-heading mb-8">
            Što je Safe Shop?
          </h2>
          <p className="text-body text-lg leading-relaxed mb-6">
            Safe Shop je oznaka povjerenja koju je Udruga kreirala prema
            kriterijima kupaca, a nastala je evolucijom Trusted Shop
            certifikata.
          </p>
          <p className="text-body text-lg leading-relaxed">
            Istraživanje online kupaca (n=3431) pokazalo je da čak{' '}
            <span className="font-heading text-5xl font-bold text-accent block my-4">
              31 %
            </span>{' '}
            njih smatra oznaku povjerenja presudnom kod donošenja odluke o prvoj
            kupovini na nekom webshopu.
          </p>
        </div>
      </section>

      {/* 10 Criteria Section */}
      <section id="kriteriji" className="py-20 bg-section">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-heading text-center mb-4">
            eCommerce Kodeks Ponašanja
          </h2>
          <p className="text-center text-secondary mb-12 text-lg">
            Kodeks ponašanja je set kriterija koji su definirani u skladu s očekivanjima kupaca, a oznaku povjerenja Safe Shop mogu ostvariti samo naši članovi koji zadovolje svih 10 kriterija.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {criteria.map((item) => (
              <div
                key={item.num}
                className="bg-white rounded-xl p-6 hover:shadow-lg transition-shadow flex items-start gap-5"
              >
                <div className="flex-shrink-0">
                  <div className="w-11 h-11 rounded-full bg-accent flex items-center justify-center text-primary font-bold text-lg">
                    {item.num}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-heading text-lg mb-1">
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

      {/* Stats Section */}
      <section className="gradient-primary py-20">
        <div className="max-w-5xl mx-auto px-4">
          <p className="text-white text-lg text-center mb-12 leading-relaxed max-w-3xl mx-auto">
            Glavni cilj naše udruge je povećati povjerenje u online kupovinu. U udruzi trenutno okupljamo 600+ hrvatskih webshopova, a održali smo preko 100 događanja, certificirali više od 150 web trgovina, pokrenuli prvi eCommerce Magazin u regiji i razvili sustav za prikupljanje i prikaz recenzija Safe Shop.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
            <div>
              <p className="font-heading text-5xl md:text-6xl font-bold">
                600+
              </p>
              <p className="text-sm text-white/70 mt-2">webshopova</p>
            </div>
            <div>
              <p className="font-heading text-5xl md:text-6xl font-bold">
                100+
              </p>
              <p className="text-sm text-white/70 mt-2">događanja</p>
            </div>
            <div>
              <p className="font-heading text-5xl md:text-6xl font-bold">
                150+
              </p>
              <p className="text-sm text-white/70 mt-2">certifikacija</p>
            </div>
            <div>
              <p className="font-heading text-5xl md:text-6xl font-bold">11</p>
              <p className="text-sm text-white/70 mt-2">godina</p>
            </div>
          </div>
        </div>
      </section>

      {/* Partner Section */}
      <section id="partner" className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-heading mb-4">
            Partner projekta
          </h2>
          <p className="font-heading text-2xl font-bold text-accent mb-2">
            Hero Factory
          </p>
          <p className="text-secondary text-sm uppercase tracking-wider mb-8">
            Development partner
          </p>
          <div className="text-body text-lg leading-relaxed max-w-2xl mx-auto space-y-4">
            <p>
              Hero Factory je development partner udruge eCommerce Hrvatska, s
              kojima smo razvili Safe Shop sustav za prikupljanje recenzija{' '}
              <a
                href="https://www.safeshop.hr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline hover:text-accent-light transition-colors"
              >
                www.safeshop.hr
              </a>
            </p>
            <p>
              Direktor Dario Begonja je član eCommAwards žirija, predavač na eCommerce Akademiji i konzultant za analizu i optimizaciju marketinga u našem Mentorskom programu.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
