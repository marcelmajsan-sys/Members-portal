export default function MilestonesPage() {
  return (
    <article>
      <h1 className="font-heading text-3xl font-bold text-text-heading md:text-4xl">
        Bitni događaji
      </h1>
      <p className="mt-3 text-text-body">
        Ključni trenuci u razvoju Udruge eCommerce Hrvatska
      </p>

      <div className="relative mt-10 ml-4 border-l-2 border-[#E2E8F0] pl-8">
        {milestones.map((m, i) => (
          <div key={i} className="relative mb-12 last:mb-0">
            {/* Accent dot */}
            <div className="absolute -left-[2.55rem] top-1 h-4 w-4 rounded-full border-[3px] border-accent bg-white" />
            <span className="inline-block rounded-full bg-accent px-4 py-1 text-sm font-bold text-primary">
              {m.year}
            </span>
            <h3 className="mt-3 font-heading text-lg font-bold text-text-heading">
              {m.title}
            </h3>
            <p className="mt-2 leading-relaxed text-text-body">
              {m.description}
            </p>
          </div>
        ))}
      </div>
    </article>
  );
}

const milestones = [
  {
    year: '2015',
    title: 'Osnivanje Udruge',
    description:
      'Udruga eCommerce Hrvatska službeno je osnovana s ciljem promicanja elektroničke trgovine u Hrvatskoj. Okupili smo prve članove i postavili temelje za buduće djelovanje.',
  },
  {
    year: '2016',
    title: 'Prva eCommerce konferencija',
    description:
      'Organizirali smo prvu nacionalnu eCommerce konferenciju koja je okupila preko 200 sudionika i postavila standard za buduća događanja u industriji.',
  },
  {
    year: '2017',
    title: 'Pokretanje Safe Shop programa',
    description:
      'Uspostavili smo Safe Shop oznaku povjerenja kao nacionalni standard za certificiranje pouzdanih web trgovina. Prve web trgovine dobile su certifikat.',
  },
  {
    year: '2018',
    title: 'Pokretanje eCommerce Akademije',
    description:
      'Lansirali smo eCommerce Akademiju — strukturirani edukacijski program od 8 modula koji pokriva sve aspekte vođenja web trgovine, od marketinga do logistike.',
  },
  {
    year: '2019',
    title: '100+ članova i eCommerce Magazin',
    description:
      'Udruga je premašila 100 članova. Pokrenuli smo eCommerce Magazin koji donosi istraživanja, intervjue i praktične savjete za web trgovce.',
  },
  {
    year: '2020',
    title: 'Digitalna transformacija tijekom pandemije',
    description:
      'U godini pandemije pomogli smo stotinama trgovaca u digitalnoj transformaciji. Svi događaji prebačeni su u online format, a članstvo je značajno naraslo jer su mnogi prepoznali važnost online prodaje.',
  },
  {
    year: '2021',
    title: '300+ članova i međunarodna suradnja',
    description:
      'Udruga je premašila 300 članova. Pokrenuli smo suradnju s eCommerce udrugama iz regije i Europe te sudjelovali u kreiranju regulatornog okvira za digitalnu trgovinu.',
  },
  {
    year: '2022',
    title: '500+ članova i najveća eCommerce zajednica',
    description:
      'Postali smo najveća eCommerce zajednica u Hrvatskoj s više od 500 članova. Organizirali smo rekordni broj događanja i edukacija.',
  },
  {
    year: '2023',
    title: 'Digitalna platforma i novi projekti',
    description:
      'Pokrenuli smo razvoj digitalne platforme za članove, proširili Safe Shop program i nastavili s rastom zajednice kroz nove formate događanja i edukacija.',
  },
];
