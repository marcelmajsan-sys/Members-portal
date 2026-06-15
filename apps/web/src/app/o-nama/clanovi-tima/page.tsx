const teamMembers = [
  {
    name: 'Marcel Majsan',
    role: 'Predsjednik',
    bio: 'Osnivač i predsjednik Udruge eCommerce Hrvatska. Vizionar koji je pokrenuo najveću eCommerce zajednicu u Hrvatskoj.',
  },
  {
    name: 'Dijana Kladar',
    role: 'Dopredsjednica',
    bio: 'Dopredsjednica Udruge zadužena za strateške partnerstve i razvoj Safe Shop programa.',
  },
  {
    name: 'Dino Oreški',
    role: 'Tajnik',
    bio: 'Tajnik Udruge koji brine o administrativnom i pravnom funkcioniranju organizacije.',
  },
  {
    name: 'Goran Pavlović',
    role: 'Urednik Magazina',
    bio: 'Urednik eCommerce Magazina i voditelj sadržajne strategije Udruge.',
  },
  {
    name: 'Iva Vranić',
    role: 'Customer Success Manager',
    bio: 'Zadužena za uspjeh članova i korisničko iskustvo unutar Udruge.',
  },
  {
    name: 'Laura Vranić',
    role: 'Account Manager',
    bio: 'Upravlja odnosima s partnerima i brine o poslovnim suradnjama.',
  },
  {
    name: 'Nikola Budisa',
    role: 'CTO',
    bio: 'Zadužen za tehnologiju i razvoj digitalne platforme Udruge.',
  },
];

export default function TeamPage() {
  return (
    <article>
      <h1 className="font-heading text-3xl font-bold text-text-heading md:text-4xl">
        Članovi tima
      </h1>
      <p className="mt-3 text-text-body">
        Upoznajte ljude koji stoje iza Udruge eCommerce Hrvatska
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {teamMembers.map((member) => (
          <div
            key={member.name}
            className="rounded-2xl border border-[#E2E8F0] bg-white p-6 text-center shadow-sm transition hover:shadow-md"
          >
            <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-bg-section">
              <svg className="h-12 w-12 text-primary/40" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <h3 className="font-heading text-lg font-bold text-text-heading">
              {member.name}
            </h3>
            <p className="mt-1 text-sm font-semibold text-accent">
              {member.role}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-text-body">
              {member.bio}
            </p>
            <div className="mt-5 flex justify-center gap-2">
              <a
                href="#"
                aria-label={`${member.name} LinkedIn`}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-bg-section text-primary transition hover:bg-primary hover:text-white"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
              </a>
              <a
                href="#"
                aria-label={`${member.name} Email`}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-bg-section text-primary transition hover:bg-primary hover:text-white"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </a>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
