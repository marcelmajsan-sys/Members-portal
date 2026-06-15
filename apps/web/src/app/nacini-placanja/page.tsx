export default function NaciniPlacanjaPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary to-[#152a4a] py-20 text-white">
        <div className="mx-auto max-w-6xl px-6">
          <h1 className="font-heading text-4xl font-bold md:text-5xl">Načini plaćanja</h1>
        </div>
      </section>

      <section className="bg-bg-light py-16">
        <div className="mx-auto max-w-3xl px-6">
          <div className="space-y-6">
            {/* Kartično plaćanje */}
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-8 shadow-sm">
              <div className="flex items-start gap-5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-bg-section text-primary">
                  <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <div>
                  <h2 className="font-heading text-xl font-bold text-text-heading">
                    Kartično plaćanje
                  </h2>
                  <p className="mt-2 leading-relaxed text-text-body">
                    Prihvaćamo plaćanje svim Visa i Mastercard kreditnim i debitnim karticama. Transakcije se
                    obrađuju putem sigurnog sustava s SSL enkripcijom. Vaši kartični podaci nikad ne prolaze kroz
                    naš sustav.
                  </p>
                  <div className="mt-4 flex gap-3">
                    <div className="flex h-10 w-16 items-center justify-center rounded-lg border border-[#E2E8F0] bg-bg-section text-xs font-bold text-text-secondary">
                      VISA
                    </div>
                    <div className="flex h-10 w-16 items-center justify-center rounded-lg border border-[#E2E8F0] bg-bg-section text-xs font-bold text-text-secondary">
                      MC
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Virmansko plaćanje */}
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-8 shadow-sm">
              <div className="flex items-start gap-5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-bg-section text-primary">
                  <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h2 className="font-heading text-xl font-bold text-text-heading">
                    Virmansko plaćanje
                  </h2>
                  <p className="mt-2 leading-relaxed text-text-body">
                    Plaćanje možete izvršiti i bankovnim prijenosom (virmanom). Nakon narudžbe primit ćete
                    predračun s podacima za uplatu na e-mail adresu. Narudžba se obrađuje po primitku uplate.
                  </p>
                </div>
              </div>
            </div>

            {/* PayPal */}
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-8 shadow-sm">
              <div className="flex items-start gap-5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-bg-section text-primary">
                  <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="font-heading text-xl font-bold text-text-heading">
                    PayPal
                  </h2>
                  <p className="mt-2 leading-relaxed text-text-body">
                    Za brzo i sigurno plaćanje možete koristiti i PayPal. PayPal vam omogućuje plaćanje putem
                    vašeg PayPal računa ili kartice povezane s PayPal računom.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
