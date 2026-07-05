import { prisma } from '@ecommerce-hr/db';
import { logger } from './logger.js';

export interface ResolvedTemplate {
  subject: string;
  body: string;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
}

/**
 * Try to load an email template from the DB by slug.
 * Returns null if not found or inactive — caller falls back to hardcoded.
 * Returns 'HIDDEN' if the template was deleted by the admin — caller must NOT send at all.
 */
export async function resolveTemplate(slug: string): Promise<ResolvedTemplate | 'HIDDEN' | null> {
  try {
    const tpl = await prisma.emailTemplate.findUnique({ where: { slug } });
    if (tpl?.isHidden) return 'HIDDEN';
    if (!tpl || !tpl.isActive) return null;
    return {
      subject: tpl.subject,
      body: tpl.body,
      ctaLabel: tpl.ctaLabel,
      ctaUrl: tpl.ctaUrl,
    };
  } catch (err) {
    logger.warn({ slug, error: err instanceof Error ? err.message : String(err) }, 'Failed to load email template from DB — using default');
    return null;
  }
}

/**
 * Default template definitions — used to seed the DB and as fallback descriptions.
 */
export const DEFAULT_TEMPLATES: Array<{
  slug: string;
  name: string;
  subject: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
}> = [
  {
    slug: 'welcome',
    name: 'Dobrodošlica',
    subject: 'Dobrodošli u eCommerce Hrvatska!',
    body: 'Dobrodošli u udrugu eCommerce Hrvatska! Vaše članstvo je uspješno aktivirano.\n\nSada imate pristup svim pogodnostima vaše razine članstva.',
    ctaLabel: undefined,
    ctaUrl: undefined,
  },
  {
    slug: 'expired',
    name: 'Isteklo članstvo',
    subject: 'Vaše članstvo je isteklo — eCommerce Hrvatska',
    body: 'Obavještavamo Vas da je Vaše članstvo u udruzi eCommerce Hrvatska isteklo {{datum_isteka}}, čime gubite pristup benefitima za članove (popis: https://ecommerce.hr/o-udruzi/clanstvo/).\n\nPredračun za obnovu članstva nalazi se u privitku ovog emaila — možete ga platiti internet bankarstvom ili skeniranjem HUB-3 barkoda.\n\nJavite nam kada izvršite uplatu kako bismo Vam produžili članstvo — dovoljno je odgovoriti na ovaj email.',
    ctaLabel: undefined,
    ctaUrl: undefined,
  },
  {
    slug: 'renewal_confirmation',
    name: 'Potvrda produženja',
    subject: 'Potvrda produženja članstva — eCommerce Hrvatska',
    body: 'Vaše članstvo u udruzi eCommerce Hrvatska uspješno je produženo.',
    ctaLabel: undefined,
    ctaUrl: undefined,
  },
  {
    slug: 'free_upgrade',
    name: 'Nadogradnja besplatnog članstva',
    subject: 'Nadogradite članstvo — eCommerce Hrvatska',
    body: 'Trenutno koristite besplatno članstvo u udruzi eCommerce Hrvatska. Nadogradnjom na plaćenu razinu dobivate pristup svim pogodnostima.',
    ctaLabel: 'Da, želim nadograditi',
    ctaUrl: undefined,
  },
  {
    slug: 'renewal_reminder',
    name: 'Podsjetnik za obnovu',
    subject: 'Vaše članstvo ističe {{datum_isteka}} — eCommerce Hrvatska',
    body: 'Vaše članstvo u udruzi eCommerce Hrvatska ističe {{datum_isteka}}.\n\nObnovom članstva zadržavate sve pogodnosti za članove: sudjelovanje na konferenciji i događajima, edukacije, alate na članskom portalu i podršku udruge.\n\nPredračun za obnovu nalazi se u privitku ovog emaila — možete ga platiti internet bankarstvom ili skeniranjem HUB-3 barkoda. Ako imate pitanja ili želite promijeniti paket članstva, slobodno odgovorite na ovaj email.',
    ctaLabel: undefined,
    ctaUrl: undefined,
  },
  {
    slug: 'renewal_urgent',
    name: 'Drugi podsjetnik za obnovu (14 dana)',
    subject: 'Vaše članstvo ističe {{datum_isteka}} — eCommerce Hrvatska',
    body: 'Podsjećamo Vas da Vaše članstvo u udruzi eCommerce Hrvatska ističe {{datum_isteka}} — za manje od 14 dana.\n\nObnovite članstvo na vrijeme kako biste bez prekida zadržali pristup pogodnostima, događajima i alatima za članove. Predračun za obnovu nalazi se u privitku ovog emaila.\n\nAko ste uplatu već izvršili, slobodno zanemarite ovaj podsjetnik.',
    ctaLabel: undefined,
    ctaUrl: undefined,
  },
  {
    slug: 'renewal_final',
    name: 'Zadnji podsjetnik za obnovu (7 dana)',
    subject: 'Zadnji podsjetnik — članstvo ističe {{datum_isteka}}',
    body: 'Ovo je zadnji podsjetnik: Vaše članstvo u udruzi eCommerce Hrvatska ističe {{datum_isteka}}.\n\nNakon tog datuma članstvo prelazi u status isteklog i gubite pristup pogodnostima za članove. Predračun za obnovu nalazi se u privitku ovog emaila — obnovite članstvo što prije.\n\nAko ste uplatu već izvršili, slobodno zanemarite ovu poruku.',
    ctaLabel: undefined,
    ctaUrl: undefined,
  },
  {
    slug: 'offer_step',
    name: 'Ponuda s predračunom (PDF)',
    subject: 'Obnova članstva — eCommerce Hrvatska',
    body: 'Obavještavamo Vas da Vaše članstvo u udruzi eCommerce Hrvatska ističe.\n\nPredračun u PDF formatu je priložen ovom emailu. Možete ga koristiti za plaćanje putem internet bankarstva ili skeniranjem HUB-3 barkoda.',
    ctaLabel: undefined,
    ctaUrl: undefined,
  },
  {
    slug: 'event_invitation',
    name: 'Pozivnica na događaj',
    subject: 'Pozivnica — eCommerce Hrvatska',
    body: 'Pozivamo Vas na događaj koji organizira udruga eCommerce Hrvatska.\n\nDetalji događaja će biti navedeni u emailu.',
    ctaLabel: undefined,
    ctaUrl: undefined,
  },
  {
    slug: 'custom_notification',
    name: 'Obavijest članu',
    subject: 'Obavijest — eCommerce Hrvatska',
    body: '',
    ctaLabel: 'Otvori članski portal',
    ctaUrl: 'https://members.ecommerce.hr/',
  },
  {
    slug: 'custom',
    name: 'Prilagođena automatizacija',
    subject: 'Obavijest — eCommerce Hrvatska',
    body: '',
    ctaLabel: 'Otvori članski portal',
    ctaUrl: 'https://members.ecommerce.hr/',
  },
];
