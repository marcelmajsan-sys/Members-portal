import { prisma } from '@ecommerce-hr/db';
import { DomainEvents } from '@ecommerce-hr/shared';
import { sendEmail } from '@ecommerce-hr/email';
import { emitEvent } from '../lib/event-bus.js';
import { logger } from '../utils/logger.js';

export interface RenewalStats {
  expiringFound: number;
  remindersSent: number;
  expired: number;
  // Godišnji podsjetnik udruzi za pauzirane (SUSPENDED) webshopove
  anniversaryDue: number;
  anniversaryEmailSent: boolean;
}

const DAY = 24 * 60 * 60 * 1000;

// Interni sandučić udruge — na njega ide zbirni godišnji podsjetnik za pauzirane webshopove.
const ASSOCIATION_EMAIL =
  process.env.ASSOCIATION_EMAIL ?? process.env.EMAIL_REPLY_TO ?? 'udruga@ecommerce.hr';

// Kalendarski broj dana do isteka (UTC ponoć→ponoć): na sam dan isteka = 0.
// Ceil po satima bi ovisio o satu crona i nikad ne bi dao 0.
export function daysUntilExpiry(expiresAt: Date, now = new Date()): number {
  const dayStart = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.round((dayStart(expiresAt) - dayStart(now)) / DAY);
}

// Članovi kojima članstvo ističe unutar 30 dana (uključivo s DANAŠNJIM danom isteka)
// → obavijest + event (pokreće automatizacije podsjetnika, uklj. "na dan isteka").
async function checkExpiringMembers(stats: RenewalStats): Promise<void> {
  const now = new Date();
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const in30 = new Date(now.getTime() + 30 * DAY);

  const expiring = await prisma.member.findMany({
    where: { status: 'ACTIVE', expiresAt: { gte: startOfToday, lte: in30 } },
    include: { user: true, company: true },
  });
  stats.expiringFound = expiring.length;

  for (const m of expiring) {
    const days = daysUntilExpiry(m.expiresAt!, now);
    await prisma.notification.create({
      data: {
        userId: m.userId,
        type: 'REMINDER',
        title: 'Članarina uskoro istječe',
        message: `Vaša članarina istječe za ${days} dana. Molimo obnovite članstvo.`,
        actionUrl: '/membership/renew',
      },
    });
    // 'member.expiry_reminder' — isti event kao ručni /renewal-check; na njega slušaju
    // automatizacije podsjetnika (30/14/7 dana). Prije se ovdje krivo emitirao
    // 'member.expired' pa bi "Obavijest o isteku" išla mjesec dana prerano.
    await emitEvent('member.expiry_reminder', {
      memberId: m.id, userId: m.userId, email: m.user.email,
      firstName: m.user.firstName, lastName: m.user.lastName,
      companyName: m.company.name, daysUntilExpiry: days, expiresAt: m.expiresAt!.toISOString(),
      memberTier: m.memberTier,
    });
    stats.remindersSent++;
  }
}

// Članovi kojima je članstvo prošlo → status EXPIRED + obavijest.
// Istek se računa NAKON isteka cijelog dana (na sam dan isteka član je još ACTIVE
// i dobiva podsjetnik "ističe danas"; EXPIRED postaje idući dan).
async function expireOverdueMembers(stats: RenewalStats): Promise<void> {
  const now = new Date();
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const overdue = await prisma.member.findMany({
    where: { status: 'ACTIVE', expiresAt: { lt: startOfToday } },
    include: { user: true },
  });

  for (const m of overdue) {
    await prisma.member.update({ where: { id: m.id }, data: { status: 'EXPIRED' } });
    await prisma.notification.create({
      data: {
        userId: m.userId,
        type: 'WARNING',
        title: 'Članarina je istekla',
        message: 'Vaša članarina je istekla. Molimo obnovite članstvo za nastavak korištenja usluga.',
        actionUrl: '/membership/renew',
      },
    });
    // Tek OVDJE članstvo stvarno istječe — okida automatizaciju "Obavijest o isteku"
    await emitEvent(DomainEvents.MEMBER_EXPIRED, { memberId: m.id, userId: m.userId });
    stats.expired++;
  }
}

// Je li DANAS godišnjica isteka (svakih godinu dana od dana isteka)? Vraća broj
// navršenih godina (>=1) ako je danas godišnjica, inače 0. Računa se po UTC datumu
// (isti mjesec+dan kao istek, barem godinu dana kasnije). Istek 29.2. u ne-prijestupnoj
// godini pada na 28.2. (inače bi se podsjetnik preskočio te godine).
export function expiryAnniversaryYears(expiresAt: Date, now = new Date()): number {
  const em = expiresAt.getUTCMonth();
  const ed = expiresAt.getUTCDate();
  const years = now.getUTCFullYear() - expiresAt.getUTCFullYear();
  if (years < 1) return 0;
  const nm = now.getUTCMonth();
  const nd = now.getUTCDate();
  if (nm === em && nd === ed) return years;
  const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  if (em === 1 && ed === 29 && !isLeap(now.getUTCFullYear()) && nm === 1 && nd === 28) return years;
  return 0;
}

// Pauzirani (SUSPENDED) webshopovi kojima je DANAS godišnjica isteka (svakih 12 mjeseci
// od dana isteka) → JEDAN zbirni podsjetnik na udruga@ecommerce.hr s informacijom
// "Pauzirani webshop - prošlo X dana od isteka". Leadovi se preskaču. Svaki pad se
// logira, ali ne ruši dnevnu obnovu.
async function remindPausedWebshopAnniversaries(stats: RenewalStats): Promise<void> {
  const now = new Date();
  const paused = await prisma.member.findMany({
    where: { status: 'SUSPENDED', isLead: false, expiresAt: { not: null } },
    include: { user: true, company: true },
  });

  const due = paused
    .map((m) => ({ m, years: expiryAnniversaryYears(m.expiresAt!, now) }))
    .filter((x) => x.years >= 1)
    .sort((a, b) => (a.m.company?.name ?? '').localeCompare(b.m.company?.name ?? '', 'hr'));

  stats.anniversaryDue = due.length;
  if (due.length === 0) return;

  const rows = due
    .map(({ m }) => {
      const name = `${m.user.firstName ?? ''} ${m.user.lastName ?? ''}`.trim() || '—';
      const webshop = m.website ?? m.company?.website ?? '—';
      const expiry = m.expiresAt!.toLocaleDateString('hr-HR', { timeZone: 'Europe/Zagreb' });
      const daysSince = -daysUntilExpiry(m.expiresAt!, now);
      return `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(m.company?.name ?? '—')}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(webshop)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(name)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(m.user.email)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${expiry}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;"><strong>Pauzirani webshop - prošlo ${daysSince} dana od isteka</strong></td>
      </tr>`;
    })
    .join('');

  const today = now.toLocaleDateString('hr-HR', { timeZone: 'Europe/Zagreb' });
  const subject = `Pauzirani webshopovi — godišnji podsjetnik (${due.length}) · ${today}`;
  const html = `<!DOCTYPE html><html><body style="font-family:Arial,Helvetica,sans-serif;color:#1B365D;">
    <h2 style="color:#1B365D;">Pauzirani webshopovi — godišnji podsjetnik</h2>
    <p>Ovim pauziranim webshopovima danas je navršeno punih 12 mjeseci (ili višekratnik) od dana isteka članstva.</p>
    <table style="border-collapse:collapse;width:100%;font-size:14px;">
      <thead>
        <tr style="background:#1B365D;color:#fff;text-align:left;">
          <th style="padding:8px 12px;">Tvrtka</th>
          <th style="padding:8px 12px;">Webshop</th>
          <th style="padding:8px 12px;">Kontakt</th>
          <th style="padding:8px 12px;">Email</th>
          <th style="padding:8px 12px;">Datum isteka</th>
          <th style="padding:8px 12px;">Status</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </body></html>`;

  await sendEmail(ASSOCIATION_EMAIL, subject, html, { templateName: 'paused-webshop-anniversary-digest' });
  stats.anniversaryEmailSent = true;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );
}

/** Dnevna provjera obnova — pokreće je Vercel cron (/api/cron/daily-renewal). */
export async function runDailyRenewal(): Promise<RenewalStats> {
  const stats: RenewalStats = {
    expiringFound: 0, remindersSent: 0, expired: 0,
    anniversaryDue: 0, anniversaryEmailSent: false,
  };
  await checkExpiringMembers(stats);
  await expireOverdueMembers(stats);
  // Godišnji podsjetnik udruzi za pauzirane webshopove — ne smije srušiti obnovu.
  try {
    await remindPausedWebshopAnniversaries(stats);
  } catch (err) {
    logger.error({ err }, 'Godišnji podsjetnik za pauzirane webshopove nije uspio');
  }
  logger.info({ stats }, 'Dnevna provjera obnova gotova');
  return stats;
}
