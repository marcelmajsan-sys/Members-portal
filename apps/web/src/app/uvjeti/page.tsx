export default function UvjetiPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary to-[#152a4a] py-20 text-white">
        <div className="mx-auto max-w-6xl px-6">
          <h1 className="font-heading text-4xl font-bold md:text-5xl">Uvjeti kupnje</h1>
        </div>
      </section>

      <section className="bg-bg-light py-16">
        <div className="mx-auto max-w-3xl px-6">
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-8 shadow-sm md:p-12">
            <h2 className="font-heading text-xl font-bold text-text-heading">1. Opće odredbe</h2>
            <p className="mt-3 leading-relaxed text-text-body">
              Ovi Uvjeti kupnje reguliraju odnos između Udruge eCommerce Hrvatska (u daljnjem tekstu: Prodavatelj) i
              kupca koji kupuje proizvode ili usluge putem web stranice ecommerce.hr. Kupnjom proizvoda ili usluga
              kupac prihvaća ove Uvjete kupnje.
            </p>

            <h2 className="mt-10 font-heading text-xl font-bold text-text-heading">2. Naručivanje</h2>
            <p className="mt-3 leading-relaxed text-text-body">
              Narudžba se vrši putem web stranice odabirom željenog proizvoda ili usluge i popunjavanjem podataka za
              kupnju. Kupac će primiti potvrdu narudžbe na e-mail adresu navedenu prilikom kupnje. Ugovor o kupnji
              smatra se sklopljenim u trenutku kada kupac primi potvrdu narudžbe.
            </p>

            <h2 className="mt-10 font-heading text-xl font-bold text-text-heading">3. Cijene</h2>
            <p className="mt-3 leading-relaxed text-text-body">
              Sve cijene na web stranici izražene su u eurima (EUR) i uključuju PDV ukoliko je primjenjivo. Prodavatelj
              zadržava pravo promjene cijena bez prethodne najave, ali promjena cijena ne utječe na već potvrđene narudžbe.
            </p>

            <h2 className="mt-10 font-heading text-xl font-bold text-text-heading">4. Plaćanje</h2>
            <p className="mt-3 leading-relaxed text-text-body">
              Plaćanje je moguće putem kreditne ili debitne kartice (Visa, Mastercard), virmanskim plaćanjem ili putem
              PayPal sustava. Detalji o načinima plaćanja dostupni su na stranici Načini plaćanja.
            </p>

            <h2 className="mt-10 font-heading text-xl font-bold text-text-heading">5. Reklamacije i povrat</h2>
            <p className="mt-3 leading-relaxed text-text-body">
              Kupac ima pravo na reklamaciju i povrat u skladu sa Zakonom o zaštiti potrošača. Za sve reklamacije i
              povrate kupac se može obratiti na udruga@ecommerce.hr ili putem kontakt forme na web stranici.
            </p>

            <h2 className="mt-10 font-heading text-xl font-bold text-text-heading">6. Završne odredbe</h2>
            <p className="mt-3 leading-relaxed text-text-body">
              Na ove Uvjete kupnje primjenjuje se zakonodavstvo Republike Hrvatske. Za sve sporove nadležan je sud u
              Zagrebu. Prodavatelj zadržava pravo izmjene ovih Uvjeta kupnje uz objavu na web stranici.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
