import type { TourStep } from './guided-tour';

export const OWNER_TOUR_STEPS: TourStep[] = [
  {
    target: 'nav-dashboard',
    title: 'Dashboard',
    description:
      'Vaš kontrolni centar — prihodi, broj članova, zadaci na čekanju i analitika. Sve važno na jednom mjestu.',
    position: 'right',
    icon: 'dashboard',
  },
  {
    target: 'nav-members',
    title: 'Članovi',
    description:
      'Popis svih članova. Aktivirajte, produžite članstvo, šaljite ponude s predračunom i pratite status svakoga.',
    position: 'right',
    icon: 'members',
  },
  {
    target: 'nav-offers',
    title: 'Ponude',
    description:
      'Pregled svih predračuna i ponuda. Pratite je li ponuda poslana, prihvaćena ili istekla.',
    position: 'right',
    icon: 'offers',
  },
  {
    target: 'nav-tasks',
    title: 'Zadaci',
    description:
      'Kanban ploča — kreirajte zadatke, dodijelite ih timu i pratite napredak u realnom vremenu.',
    position: 'right',
    icon: 'tasks',
  },
  {
    target: 'nav-team',
    title: 'Tim',
    description:
      'Upravljajte operaterima, pratite performanse i vidite tko na čemu radi.',
    position: 'right',
    icon: 'team',
  },
  {
    target: 'nav-calendar',
    title: 'Kalendar',
    description:
      'Zadaci i događaji na jednom mjestu. Kreirajte evente i označite ih kao okidače za automatske pozivnice.',
    position: 'right',
    icon: 'calendar',
  },
  {
    target: 'nav-email-templates',
    title: 'Email predlošci',
    description:
      'Uredite tekstove emailova koje sustav šalje. Svaki predložak ima live pregled — vidite točno kako izgleda.',
    position: 'right',
    icon: 'email',
  },
  {
    target: 'nav-automation',
    title: 'Automatizacija',
    description:
      'Srce sustava! Postavite okidač, odaberite predložak — sustav radi umjesto vas. Podsjete, dobrodošlice, pozivnice.',
    position: 'right',
    icon: 'automation',
  },
  {
    target: 'nav-notifications',
    title: 'Obavijesti',
    description:
      'Real-time pregled svega što se događa — novi članovi, istekla članstva, završeni zadaci.',
    position: 'right',
    icon: 'notifications',
  },
  {
    target: 'header-search',
    title: 'Brza pretraga',
    description:
      'Pronađite člana u sekundi. Tipkajte ime, tvrtku ili email. Prečac: ⌘K.',
    position: 'bottom',
    icon: 'search',
  },
];
