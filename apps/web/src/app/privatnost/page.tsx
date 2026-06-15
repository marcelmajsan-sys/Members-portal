export default function PrivatnostPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary to-[#152a4a] py-20 text-white">
        <div className="mx-auto max-w-6xl px-6">
          <h1 className="font-heading text-4xl font-bold md:text-5xl">Pravila privatnosti</h1>
        </div>
      </section>

      <section className="bg-bg-light py-16">
        <div className="mx-auto max-w-3xl px-6">
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-8 shadow-sm md:p-12">
            <h2 className="font-heading text-xl font-bold text-text-heading">1. Uvod</h2>
            <p className="mt-3 leading-relaxed text-text-body">
              Udruga eCommerce Hrvatska poštuje privatnost svojih korisnika i članova. Ova Pravila privatnosti
              objašnjavaju koje osobne podatke prikupljamo, zašto ih prikupljamo i kako ih koristimo, u skladu s
              Općom uredbom o zaštiti podataka (GDPR).
            </p>

            <h2 className="mt-10 font-heading text-xl font-bold text-text-heading">2. Voditelj obrade podataka</h2>
            <p className="mt-3 leading-relaxed text-text-body">
              Voditelj obrade osobnih podataka je Udruga eCommerce Hrvatska, Remetinečka 7, Zagreb. Za sva pitanja
              vezana uz zaštitu podataka možete nas kontaktirati na udruga@ecommerce.hr.
            </p>

            <h2 className="mt-10 font-heading text-xl font-bold text-text-heading">3. Prikupljanje podataka</h2>
            <p className="mt-3 leading-relaxed text-text-body">
              Prikupljamo osobne podatke koje nam dobrovoljno pružite: ime i prezime, e-mail adresa, telefonski broj,
              adresa, podaci o tvrtki. Podatke prikupljamo prilikom registracije, kupnje, kontaktiranja i prijave na
              događanja.
            </p>

            <h2 className="mt-10 font-heading text-xl font-bold text-text-heading">4. Svrha obrade</h2>
            <p className="mt-3 leading-relaxed text-text-body">
              Osobne podatke koristimo za: ispunjavanje ugovornih obveza, komunikaciju s članovima, slanje obavijesti
              o događanjima i edukacijama, poboljšanje naših usluga i zakonske obveze.
            </p>

            <h2 className="mt-10 font-heading text-xl font-bold text-text-heading">5. Kolačići</h2>
            <p className="mt-3 leading-relaxed text-text-body">
              Naša web stranica koristi kolačiće za poboljšanje korisničkog iskustva. Korisnik može upravljati
              postavkama kolačića putem svog web preglednika. Više informacija o kolačićima dostupno je u našoj
              Politici kolačića.
            </p>

            <h2 className="mt-10 font-heading text-xl font-bold text-text-heading">6. Prava korisnika</h2>
            <p className="mt-3 leading-relaxed text-text-body">
              Imate pravo na pristup, ispravak, brisanje, ograničenje obrade, prenosivost i prigovor na obradu
              vaših osobnih podataka. Za ostvarivanje prava kontaktirajte nas na udruga@ecommerce.hr.
            </p>

            <h2 className="mt-10 font-heading text-xl font-bold text-text-heading">7. Sigurnost podataka</h2>
            <p className="mt-3 leading-relaxed text-text-body">
              Primjenjujemo odgovarajuće tehničke i organizacijske mjere za zaštitu vaših osobnih podataka od
              neovlaštenog pristupa, gubitka ili uništenja.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
