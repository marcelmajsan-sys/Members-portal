export default function ImpressumPage() {
  return (
    <article>
      <h1 className="font-heading text-3xl font-bold text-text-heading md:text-4xl">
        Impressum
      </h1>

      <div className="mt-8">
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-8 shadow-sm">
          <dl className="space-y-5">
            {[
              { label: 'Naziv', value: 'Udruga eCommerce Hrvatska' },
              { label: 'Adresa', value: 'Republike Austrije 9, 10000 Zagreb, Hrvatska' },
              { label: 'OIB', value: '17475291081' },
              { label: 'Matični broj', value: '4398122' },
              { label: 'IBAN', value: 'HR7123400091110780192' },
            ].map((item) => (
              <div key={item.label} className="flex flex-col sm:flex-row sm:gap-4">
                <dt className="w-40 shrink-0 font-semibold text-text-heading">{item.label}</dt>
                <dd className="text-text-body">{item.value}</dd>
              </div>
            ))}
            <div className="flex flex-col sm:flex-row sm:gap-4">
              <dt className="w-40 shrink-0 font-semibold text-text-heading">Email</dt>
              <dd>
                <a
                  href="mailto:udruga@ecommerce.hr"
                  className="text-accent hover:underline"
                >
                  udruga@ecommerce.hr
                </a>
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </article>
  );
}
