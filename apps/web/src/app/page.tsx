import Link from 'next/link';

/* ------------------------------------------------------------------ */
/*  Quick Links Data                                                   */
/* ------------------------------------------------------------------ */
const quickLinks = [
  {
    title: 'Događanja',
    subtitle: 'Meetupi & konf.',
    href: '/eventi',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
  },
  {
    title: 'Novosti',
    subtitle: 'Blog & vijesti',
    href: '/blog',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5" />
      </svg>
    ),
  },
  {
    title: 'Akademija',
    subtitle: '8 modula',
    href: '/akademija',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" />
      </svg>
    ),
  },
  {
    title: 'Kontakt',
    subtitle: 'Javi se',
    href: '/o-nama',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    ),
  },
];

/* ------------------------------------------------------------------ */
/*  Membership Cards Data                                              */
/* ------------------------------------------------------------------ */
const membershipCards = [
  {
    label: 'WEB TRGOVCI',
    number: '01',
    title: 'Prodajte više svaki tjedan',
    body: 'AI analiza vašeg webshopa, tjedni competitor intel i Safe Shop certifikat koji grade povjerenje kupaca.',
    tags: ['AI Webshop Audit', 'Competitor Intel', 'Safe Shop', 'Pravni AI'],
    price: 'od 250€/god',
    href: '/clanstvo/web-trgovine',
    variant: 'primary' as const,
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72" />
      </svg>
    ),
  },
  {
    label: 'NUDITELJI USLUGA',
    number: '02',
    title: 'Pronađite klijente',
    body: '600+ aktivnih web trgovaca koji traže agencije, developere i usluge. Vaš profil na platformi, leads i networking.',
    tags: ['Profil na platformi', 'Leads', 'Networking'],
    price: 'od 400€/god',
    href: '/clanstvo/nuditelji-usluga',
    variant: 'white' as const,
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
      </svg>
    ),
  },
  {
    label: 'FIZIČKI ČLANOVI',
    number: '03',
    title: 'Učite i povežite se',
    body: 'Pristup akademiji, događanjima i zajednici eCommerce profesionalaca.',
    tags: ['Akademija', 'Eventi', 'Networking'],
    price: 'od 0€/god',
    href: '/clanstvo/fizicki-clan',
    variant: 'white' as const,
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
  },
];

/* ------------------------------------------------------------------ */
/*  Za koga targets                                                    */
/* ------------------------------------------------------------------ */
const targets = [
  {
    title: 'Web trgovci',
    text: 'Vlasnici i manageri web shopova koji žele rasti brže uz podatke, AI alate i zajednicu.',
  },
  {
    title: 'Agencije & freelanceri',
    text: 'Pružatelji usluga koji žele pristup bazi od 600+ aktivnih trgovaca.',
  },
  {
    title: 'eCommerce entuzijasti',
    text: 'Svi koji žele učiti, networking i pratiti trendove u online prodaji.',
  },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function Home() {
  return (
    <>
      {/* ============================================================ */}
      {/*  HERO                                                        */}
      {/* ============================================================ */}
      <section className="relative overflow-hidden gradient-hero">
        {/* Decorative elements - visible on desktop */}
        <div className="pointer-events-none absolute inset-0 hidden lg:block">
          <div className="absolute -right-20 top-20 h-72 w-72 rounded-full border border-white/10" />
          <div className="absolute -right-10 top-32 h-56 w-56 rounded-full border border-white/5" />
          <div className="absolute bottom-20 right-20 h-40 w-40 rounded-full bg-white/5" />
          <div className="absolute right-40 top-40 h-3 w-3 rounded-full bg-accent/40" />
          <div className="absolute bottom-40 right-60 h-2 w-2 rounded-full bg-accent/60" />
          <div className="absolute right-80 top-60 h-2 w-2 rounded-full bg-white/30" />
          <div className="absolute bottom-32 right-16 grid grid-cols-5 gap-3 opacity-20">
            {Array.from({ length: 25 }).map((_, i) => (
              <div key={i} className="h-1.5 w-1.5 rounded-full bg-white" />
            ))}
          </div>
        </div>

        <div className="relative mx-auto max-w-6xl px-5 pb-14 pt-12 md:pb-20 md:pt-20 lg:flex lg:items-center lg:gap-16 lg:py-28">
          <div className="max-w-2xl lg:flex-1">
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-white/90">
              <span className="inline-block h-2 w-2 rounded-full bg-info" />
              AI platforma 2026
            </div>

            {/* Title */}
            <h1 className="font-heading text-4xl font-bold leading-[1.1] text-white md:text-5xl lg:text-6xl">
              Prodajte više.{' '}
              <br />
              Rasite{' '}
              <span className="relative inline-block">
                brže.
                {/* Wavy/brush underline accent */}
                <svg
                  className="absolute -bottom-2 left-0 w-full"
                  viewBox="0 0 120 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M2 8C12 4 22 2 32 4C42 6 52 10 62 8C72 6 82 2 92 4C102 6 112 8 118 6"
                    stroke="#E8A838"
                    strokeWidth="3"
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/75 md:text-lg">
              Hrvatska zajednica web trgovaca i eCommerce stručnjaka — sada s AI
              alatima koji rade umjesto vas.
            </p>

            {/* Stats row */}
            <div className="mt-8 flex items-center gap-4 text-xs font-bold uppercase tracking-wider text-white/80 md:gap-6 md:text-sm">
              <span>600+ članova</span>
              <span className="h-4 w-px bg-white/30" />
              <span>150+ Safe Shop</span>
              <span className="h-4 w-px bg-white/30" />
              <span>10 god iskustva</span>
            </div>

            {/* CTAs */}
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:gap-4">
              <Link
                href="/clanstvo"
                className="inline-flex items-center justify-center rounded-full bg-primary-light px-8 py-4 font-heading font-semibold text-white shadow-lg transition hover:bg-primary-dark hover:shadow-xl w-full sm:w-auto text-center"
              >
                Besplatna analiza webshopa&nbsp;&rarr;
              </Link>
              <Link
                href="/clanstvo"
                className="inline-flex items-center justify-center rounded-full border border-white/40 px-8 py-4 font-heading font-semibold text-white transition hover:border-white hover:bg-white/10 w-full sm:w-auto text-center"
              >
                Što dobivaju članovi&nbsp;&rarr;
              </Link>
            </div>
          </div>

          {/* Desktop decorative right column placeholder */}
          <div className="hidden lg:flex lg:flex-1 lg:items-center lg:justify-center">
            <div className="relative h-80 w-80">
              <div className="absolute inset-0 rounded-3xl bg-white/5 backdrop-blur-sm" />
              <div className="absolute inset-4 rounded-2xl bg-white/10" />
              <div className="absolute inset-8 flex items-center justify-center rounded-xl bg-white/5">
                <span className="text-6xl font-heading font-bold text-white/20">AI</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  QUICK LINKS GRID                                            */}
      {/* ============================================================ */}
      <section className="bg-bg-light py-10 md:py-14">
        <div className="mx-auto max-w-6xl px-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
            {quickLinks.map((link) => (
              <Link
                key={link.title}
                href={link.href}
                className="group flex flex-col items-center gap-2 rounded-2xl border border-border bg-white p-5 shadow-sm transition hover:shadow-md hover:border-accent/40 md:p-6"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-bg-section text-accent transition group-hover:bg-accent/10">
                  {link.icon}
                </div>
                <p className="font-heading text-sm font-semibold text-heading">
                  {link.title}
                </p>
                <p className="text-xs text-text-muted">{link.subtitle}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  STATS BAR                                                   */}
      {/* ============================================================ */}
      <div className="gradient-primary overflow-x-auto">
        <div className="mx-auto flex max-w-6xl items-center justify-around gap-8 px-5 py-5 md:py-6 min-w-max md:min-w-0">
          <div className="flex flex-col items-center text-center">
            <p className="font-heading text-2xl font-bold text-white md:text-3xl">150+</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-white/70">
              Safe Shop
            </p>
          </div>
          <div className="h-8 w-px bg-white/20" />
          <div className="flex flex-col items-center text-center">
            <p className="font-heading text-2xl font-bold text-white md:text-3xl">100+</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-white/70">
              evenata/god
            </p>
          </div>
          <div className="h-8 w-px bg-white/20" />
          <div className="flex flex-col items-center text-center">
            <p className="font-heading text-2xl font-bold text-white md:text-3xl">10</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-white/70">
              godina
            </p>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  ZA KOGA SMO?                                                */}
      {/* ============================================================ */}
      <section className="bg-white py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="text-center">
            <h2 className="font-heading text-3xl font-bold text-heading md:text-4xl">
              Za{' '}
              <em className="not-italic text-accent font-heading italic">koga</em>{' '}
              smo?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-text-secondary">
              Bez obzira jeste li iskusni trgovac, agencija ili tek počinjete —
              imamo alate i zajednicu za vas.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {targets.map((t) => (
              <div
                key={t.title}
                className="rounded-2xl border border-border bg-bg-light p-7 transition hover:shadow-md"
              >
                <h3 className="font-heading text-lg font-semibold text-heading">
                  {t.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                  {t.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  MEMBERSHIP CARDS                                            */}
      {/* ============================================================ */}
      <section className="bg-bg-section py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="text-center mb-12">
            <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-accent" />
            <h2 className="font-heading text-3xl font-bold text-heading md:text-4xl">
              Članstvo
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-text-secondary">
              Odaberi paket koji odgovara tvom poslovanju
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {membershipCards.map((card) => {
              const isPrimary = card.variant === 'primary';
              return (
                <Link
                  key={card.label}
                  href={card.href}
                  className={`group relative flex flex-col overflow-hidden rounded-2xl p-7 transition hover:shadow-lg md:p-8 ${
                    isPrimary
                      ? 'gradient-primary text-white shadow-md'
                      : 'border border-border bg-white text-heading shadow-sm'
                  }`}
                >
                  {/* Label */}
                  <div className="mb-4 flex items-center gap-2">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                        isPrimary ? 'bg-white/15' : 'bg-bg-section'
                      }`}
                    >
                      <span className={isPrimary ? 'text-white' : 'text-accent'}>
                        {card.icon}
                      </span>
                    </div>
                    <span
                      className={`text-xs font-bold uppercase tracking-wider ${
                        isPrimary ? 'text-white/70' : 'text-text-muted'
                      }`}
                    >
                      {card.label}
                    </span>
                  </div>

                  {/* Big number */}
                  <span
                    className={`pointer-events-none absolute right-4 top-4 font-heading text-7xl font-black leading-none ${
                      isPrimary ? 'text-white/10' : 'text-bg-section'
                    }`}
                  >
                    {card.number}
                  </span>

                  {/* Title */}
                  <h3
                    className={`relative z-10 font-heading text-xl font-bold md:text-2xl ${
                      isPrimary ? 'text-white' : 'text-heading'
                    }`}
                  >
                    {card.title}
                  </h3>

                  {/* Body */}
                  <p
                    className={`relative z-10 mt-3 text-sm leading-relaxed ${
                      isPrimary ? 'text-white/80' : 'text-text-secondary'
                    }`}
                  >
                    {card.body}
                  </p>

                  {/* Tags */}
                  <div className="relative z-10 mt-5 flex flex-wrap gap-2">
                    {card.tags.map((tag) => (
                      <span
                        key={tag}
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          isPrimary
                            ? 'bg-white/20 text-white'
                            : 'bg-bg-section text-text-secondary'
                        }`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Price + arrow */}
                  <div className="relative z-10 mt-auto flex items-center justify-between pt-6">
                    <span
                      className={`font-heading text-sm font-semibold ${
                        isPrimary ? 'text-white/90' : 'text-heading'
                      }`}
                    >
                      {card.price}
                    </span>
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-full transition-transform group-hover:translate-x-1 ${
                        isPrimary
                          ? 'bg-white/20 text-white'
                          : 'bg-bg-section text-text-body'
                      }`}
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
