import { prisma } from '@ecommerce-hr/db';
import type { Conference, ConferenceTicket, Member, TicketType, User, Company } from '@ecommerce-hr/db';
import bwipjs from 'bwip-js';
import { sendEmail } from '@ecommerce-hr/email';
import { notifyStaff } from './notification.service.js';
import { logger } from '../utils/logger.js';

const PORTAL_URL = process.env.MEMBER_APP_URL ?? 'https://members.ecommerce.hr';

export const TICKET_TYPES: TicketType[] = ['VIP', 'STANDARD'];

type MemberWithUser = Member & { user: User; company: Company | null };

// ─── Kvota ────────────────────────────────────────────────────────────────────

// Kvota po članu iz Conference.ticketQuotas:
//   { "STANDARD": { "PREMIUM": 2, "STANDARD": 1 }, "VIP": { "PREMIUM": 1 } }
// Ključ unutar tipa ulaznice je MemberTier ili MemberType (tier ima prednost).
// Default ako kvote nisu definirane: STANDARD član → 1 STANDARD, PREMIUM član → 3 VIP.
export function getTicketQuota(conference: Conference, member: Member): Record<TicketType, number> {
  const quotas = conference.ticketQuotas as Record<string, Record<string, number>> | null;
  const result: Record<TicketType, number> = { VIP: 0, STANDARD: 0 };

  if (member.status !== 'ACTIVE') return result;

  if (!quotas || typeof quotas !== 'object') {
    if (member.memberTier === 'PREMIUM') result.VIP = 3;
    else if (member.memberTier === 'STANDARD') result.STANDARD = 1;
    return result;
  }

  for (const type of TICKET_TYPES) {
    const byGroup = quotas[type];
    if (!byGroup || typeof byGroup !== 'object') continue;
    const value = byGroup[member.memberTier] ?? byGroup[member.memberType] ?? byGroup['*'];
    if (typeof value === 'number' && value >= 0) result[type] = value;
  }
  return result;
}

// Iskorištenost kvote — broje se sve ne-otkazane ulaznice člana po tipu
export async function getTicketUsage(conferenceId: string, memberId: string): Promise<Record<TicketType, number>> {
  const grouped = await prisma.conferenceTicket.groupBy({
    by: ['type'],
    where: { conferenceId, memberId, status: { not: 'CANCELLED' } },
    _count: { _all: true },
  });
  const usage: Record<TicketType, number> = { VIP: 0, STANDARD: 0 };
  for (const g of grouped) usage[g.type] = g._count._all;
  return usage;
}

// ─── Dohvat ───────────────────────────────────────────────────────────────────

export async function getActiveConference(): Promise<Conference | null> {
  return prisma.conference.findFirst({
    where: { isActive: true },
    orderBy: { startDate: 'desc' },
  });
}

export function isEditOpen(conference: Conference): boolean {
  return !conference.editDeadline || new Date() <= conference.editDeadline;
}

export async function getMemberTickets(conferenceId: string, memberId: string): Promise<ConferenceTicket[]> {
  return prisma.conferenceTicket.findMany({
    where: { conferenceId, memberId, status: { not: 'CANCELLED' } },
    orderBy: { createdAt: 'asc' },
  });
}

// ─── Mutacije (member) ───────────────────────────────────────────────────────

export interface TicketInput {
  fullName: string;
  jobTitle?: string | null;
  email: string;
  phone: string;
  type: TicketType;
}

export type TicketError =
  | { error: 'CONFERENCE_NOT_FOUND' }
  | { error: 'DEADLINE_PASSED' }
  | { error: 'DUPLICATE_EMAIL' }
  | { error: 'TICKET_NOT_FOUND' }
  | { error: 'INACTIVE' };

// Dodavanje osobe: unutar kvote → CONFIRMED, preko kvote → PENDING.
// Vlasništvo (memberId) dolazi iz JWT-a u ruti, nikad iz bodyja.
export async function createTicket(
  conferenceId: string,
  member: MemberWithUser,
  input: TicketInput,
): Promise<{ ticket: ConferenceTicket; overQuota: boolean } | TicketError> {
  const conference = await prisma.conference.findFirst({ where: { id: conferenceId, isActive: true } });
  if (!conference) return { error: 'CONFERENCE_NOT_FOUND' };
  if (!isEditOpen(conference)) return { error: 'DEADLINE_PASSED' };
  if (member.status !== 'ACTIVE') return { error: 'INACTIVE' };

  const email = input.email.trim().toLowerCase();

  // Duplikat emaila unutar konferencije (unique [conferenceId, email]).
  // Otkazana ulaznica istog člana se "oživljava" umjesto da blokira email.
  const existing = await prisma.conferenceTicket.findUnique({
    where: { conferenceId_email: { conferenceId, email } },
  });
  if (existing && !(existing.status === 'CANCELLED' && existing.memberId === member.id)) {
    return { error: 'DUPLICATE_EMAIL' };
  }

  const quota = getTicketQuota(conference, member);
  const usage = await getTicketUsage(conferenceId, member.id);
  const overQuota = usage[input.type] >= quota[input.type];
  const status = overQuota ? 'PENDING' : 'CONFIRMED';

  const data = {
    fullName: input.fullName.trim(),
    jobTitle: input.jobTitle?.trim() || null,
    email,
    phone: input.phone.trim(),
    type: input.type,
    status,
  } as const;

  const ticket = existing
    ? await prisma.conferenceTicket.update({ where: { id: existing.id }, data })
    : await prisma.conferenceTicket.create({ data: { ...data, conferenceId, memberId: member.id } });

  // Emailovi + obavijest osoblju — await prije odgovora (serverless), ali ne ruše operaciju
  try {
    if (status === 'CONFIRMED') {
      await sendTicketConfirmedEmail(conference, ticket, member);
      await sendMemberAddedEmail(conference, ticket, member, false);
    } else {
      await sendMemberAddedEmail(conference, ticket, member, true);
      const memberName = `${member.user.firstName} ${member.user.lastName}`.trim();
      const company = member.company?.name ? ` (${member.company.name})` : '';
      await notifyStaff({
        type: 'ACTION',
        title: 'Zatražena dodatna ulaznica',
        message: `${memberName}${company} je dodao/la osobu ${ticket.fullName} preko kvote za ${conference.name} — poslati ponudu s ${conference.extraDiscount}% popusta.`,
        actionUrl: `/tickets`,
      });
    }
  } catch (err) {
    logger.error(err, 'Ticket notification/email failed');
  }

  return { ticket, overQuota };
}

export async function updateTicket(
  conferenceId: string,
  ticketId: string,
  memberId: string,
  input: TicketInput,
): Promise<{ ticket: ConferenceTicket } | TicketError> {
  const conference = await prisma.conference.findUnique({ where: { id: conferenceId } });
  if (!conference) return { error: 'CONFERENCE_NOT_FOUND' };
  if (!isEditOpen(conference)) return { error: 'DEADLINE_PASSED' };

  // Vlasništvo: ulaznica mora pripadati članu iz tokena
  const ticket = await prisma.conferenceTicket.findFirst({
    where: { id: ticketId, conferenceId, memberId, status: { not: 'CANCELLED' } },
  });
  if (!ticket) return { error: 'TICKET_NOT_FOUND' };

  const email = input.email.trim().toLowerCase();
  if (email !== ticket.email) {
    const clash = await prisma.conferenceTicket.findUnique({
      where: { conferenceId_email: { conferenceId, email } },
    });
    if (clash && clash.id !== ticket.id) return { error: 'DUPLICATE_EMAIL' };
  }

  // Promjena tipa ulaznice ponovno prolazi kroz kvotu (ostale izmjene ne diraju status)
  let status = ticket.status;
  if (input.type !== ticket.type) {
    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (!member) return { error: 'TICKET_NOT_FOUND' };
    const quota = getTicketQuota(conference, member);
    const usage = await getTicketUsage(conferenceId, memberId);
    // usage ne uključuje ovu ulaznicu u novom tipu; u starom tipu ju isključujemo
    status = usage[input.type] >= quota[input.type] ? 'PENDING' : 'CONFIRMED';
  }

  const updated = await prisma.conferenceTicket.update({
    where: { id: ticket.id },
    data: {
      fullName: input.fullName.trim(),
      jobTitle: input.jobTitle?.trim() || null,
      email,
      phone: input.phone.trim(),
      type: input.type,
      status,
    },
  });
  return { ticket: updated };
}

export async function deleteTicket(
  conferenceId: string,
  ticketId: string,
  memberId: string,
): Promise<{ ok: true } | TicketError> {
  const conference = await prisma.conference.findUnique({ where: { id: conferenceId } });
  if (!conference) return { error: 'CONFERENCE_NOT_FOUND' };
  if (!isEditOpen(conference)) return { error: 'DEADLINE_PASSED' };

  const ticket = await prisma.conferenceTicket.findFirst({
    where: { id: ticketId, conferenceId, memberId },
  });
  if (!ticket) return { error: 'TICKET_NOT_FOUND' };

  await prisma.conferenceTicket.delete({ where: { id: ticket.id } });
  return { ok: true };
}

// ─── QR ───────────────────────────────────────────────────────────────────────

export function ticketUrl(token: string): string {
  return `${PORTAL_URL}/ulaznica/${token}`;
}

// QR kod sadrži javni URL ulaznice (token je u URL-u — admin skenira i radi check-in)
export async function generateTicketQr(token: string): Promise<string> {
  const png = await bwipjs.toBuffer({
    bcid: 'qrcode',
    text: ticketUrl(token),
    scale: 6,
    includetext: false,
  });
  return `data:image/png;base64,${png.toString('base64')}`;
}

// ─── Emailovi ─────────────────────────────────────────────────────────────────

function fmtDate(d: Date | null): string {
  if (!d) return '—';
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}.`;
}

function emailShell(body: string): string {
  return `<!DOCTYPE html><html lang="hr"><body style="font-family:Helvetica,Arial,sans-serif;color:#1f2937;line-height:1.6;">${body}</body></html>`;
}

// 1. Osobi za ulaznicu — kad postane CONFIRMED (kod dodavanja ili admin odobrenja)
export async function sendTicketConfirmedEmail(
  conference: Conference,
  ticket: ConferenceTicket,
  member: MemberWithUser,
): Promise<void> {
  const html = emailShell(`
    <p>Poštovani ${ticket.fullName},</p>
    <p><strong>${member.company?.name || `${member.user.firstName} ${member.user.lastName}`}</strong> vam je osigurao/la ulaznicu za konferenciju <strong>${conference.name}</strong>${conference.location ? ` (${conference.location})` : ''}, ${fmtDate(conference.startDate)}</p>
    <p style="font-size:16px;font-weight:600;color:#1B365D;">Tip ulaznice: ${ticket.type}</p>
    <p>Vaša ulaznica s QR kodom: <a href="${ticketUrl(ticket.token)}" style="color:#E8A838;font-weight:bold;">${ticketUrl(ticket.token)}</a></p>
    <p style="font-size:13px;color:#6b7280;">Ulaznicu pokažite na ulazu (na mobitelu ili isprintanu).</p>
    <p>Srdačan pozdrav,<br/><strong>Udruga eCommerce Hrvatska</strong></p>
  `);
  await sendEmail(ticket.email, `Vaša ulaznica za ${conference.name}`, html, {
    templateName: 'ticket-confirmed',
    memberId: member.id,
  });
}

// 2. Članu — potvrda dodane osobe / obavijest da dodatna ulaznica čeka ponudu
export async function sendMemberAddedEmail(
  conference: Conference,
  ticket: ConferenceTicket,
  member: MemberWithUser,
  overQuota: boolean,
): Promise<void> {
  const body = overQuota
    ? `<p>Poštovani ${member.user.firstName},</p>
       <p>Osoba <strong>${ticket.fullName}</strong> (${ticket.email}) dodana je preko vaše kvote ulaznica za <strong>${conference.name}</strong> i čeka potvrdu.</p>
       <p>Uskoro ćemo vam poslati ponudu za dodatnu ulaznicu uz <strong>${conference.extraDiscount}% popusta</strong>. Nakon uplate ulaznica se aktivira.</p>`
    : `<p>Poštovani ${member.user.firstName},</p>
       <p>Osoba <strong>${ticket.fullName}</strong> (${ticket.email}) uspješno je dodana za konferenciju <strong>${conference.name}</strong> (tip: ${ticket.type}).</p>
       <p>Ulaznica s QR kodom poslana je na email osobe, a dostupna je i na: <a href="${ticketUrl(ticket.token)}" style="color:#E8A838;">${ticketUrl(ticket.token)}</a></p>`;
  const html = emailShell(`${body}<p>Srdačan pozdrav,<br/><strong>Udruga eCommerce Hrvatska</strong></p>`);
  await sendEmail(
    member.user.email,
    overQuota
      ? `Dodatna ulaznica na čekanju — ${conference.name}`
      : `Potvrda dodane osobe — ${conference.name}`,
    html,
    { templateName: overQuota ? 'ticket-pending-member' : 'ticket-added-member', memberId: member.id },
  );
}
