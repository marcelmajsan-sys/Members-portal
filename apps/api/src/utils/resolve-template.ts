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
 */
export async function resolveTemplate(slug: string): Promise<ResolvedTemplate | null> {
  try {
    const tpl = await prisma.emailTemplate.findUnique({ where: { slug } });
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
    body: 'Obavještavamo Vas da je Vaše članstvo u udruzi eCommerce Hrvatska isteklo.\n\nObnovite članstvo kako biste zadržali pristup svim pogodnostima.',
    ctaLabel: 'Obnovite članstvo',
    ctaUrl: 'https://ecommerce.hr/clanstvo',
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
    subject: 'Podsjetnik za obnovu članstva — eCommerce Hrvatska',
    body: 'Obavještavamo Vas da Vaše članstvo u udruzi eCommerce Hrvatska uskoro ističe.\n\nMolimo obnovite članstvo kako biste zadržali pristup svim pogodnostima.',
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
    ctaLabel: 'Otvori Dashboard',
    ctaUrl: 'https://ecommerce-hr-os.vercel.app/dashboard',
  },
  {
    slug: 'custom',
    name: 'Prilagođena automatizacija',
    subject: 'Obavijest — eCommerce Hrvatska',
    body: '',
    ctaLabel: 'Otvori Dashboard',
    ctaUrl: 'https://ecommerce-hr-os.vercel.app/dashboard',
  },
];
