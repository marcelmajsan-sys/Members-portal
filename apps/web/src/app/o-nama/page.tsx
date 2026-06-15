export default function AboutPage() {
  return (
    <article>
      {/* Hero Banner */}
      <div className="rounded-2xl bg-gradient-to-br from-primary to-[#152a4a] p-8 text-white md:p-12">
        <h1 className="font-heading text-3xl font-bold md:text-4xl">
          Udruga eCommerce Hrvatska
        </h1>
        <p className="mt-3 text-lg font-semibold text-accent">
          Pokažite kupcima da vam mogu vjerovati!
        </p>
      </div>

      <div className="mt-10 space-y-5 text-text-body leading-relaxed">
        <p>
          Glavni cilj naše udruge je povećati povjerenje u online kupovinu i
          okupiti zajednicu eCommerce &amp; marketing stručnjaka.
        </p>
        <p>
          U prvih 10 godina smo proveli brojna istraživanja, organizirali
          preko 100 evenata, certificirali preko 200 webshopova, educirali
          preko 300 eComm stručnjaka u sklopu eCommerce Akademije, pokrenuli
          prvi eCommerce podcast i prvi tiskani eCommerce magazin u regiji,
          te napravili alat za prikupljanje i prikaz recenzija za naše
          članove (www.safeshop.hr).
        </p>
        <p>
          U svibnju 2025. smo proslavili 10 godina postojanja uz više od 600
          tvrtki članica udruge.
        </p>
        <p className="font-semibold text-text-heading">
          Učlanite se i rastite zajedno s nama!
        </p>
      </div>

      {/* Activities */}
      <div className="mt-12">
        <ul className="mt-6 space-y-4">
          {[
            'Facebook grupa (besplatno za sve)',
            'Istraživanja web trgovina (besplatno za sudionike i članove)',
            'eCommerce Magazin (besplatno online izdanje, tiskano izdanje za članove)',
            'eCommerce Meetupovi (besplatno za punopravne članove)',
            'Safe Shop certifikacija (besplatno za punopravne članove)',
            'CRO Commerce konferencija (besplatno za punopravne članove)',
            'eCommAwards (besplatno za punopravne članove)',
            'eCommerce Akademija (besplatno za Premium članove)',
          ].map((item) => (
            <li key={item} className="flex items-start gap-3 text-text-body">
              <svg
                className="mt-0.5 h-5 w-5 shrink-0 text-accent"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Contact */}
      <div className="mt-12 rounded-2xl border border-[#E2E8F0] bg-bg-section p-8">
        <h2 className="font-heading text-xl font-bold text-text-heading">
          Kontakt
        </h2>
        <div className="mt-4 space-y-2 text-text-body">
          <p>
            <span className="font-semibold text-text-heading">Marcel Majsan</span> &mdash;
            Predsjednik Udruge
          </p>
          <p>
            Telefon:{' '}
            <a href="tel:+385992025707" className="text-accent hover:underline">
              +385 99 2025 707
            </a>
          </p>
          <p>
            Email:{' '}
            <a
              href="mailto:udruga@ecommerce.hr"
              className="text-accent hover:underline"
            >
              udruga@ecommerce.hr
            </a>
          </p>
          <p>Adresa: Republike Austrije 9, 10000 Zagreb, Hrvatska</p>
        </div>
      </div>
    </article>
  );
}
