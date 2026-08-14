import crypto from 'node:crypto';
import { prisma } from '@ecommerce-hr/db';
import type { Conference, ConferenceTicket, Member, TicketType, User, Company } from '@ecommerce-hr/db';
import bwipjs from 'bwip-js';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { sendEmail } from '@ecommerce-hr/email';
import { robotoRegularBase64, robotoBoldBase64 } from '../assets/embedded-assets.js';
import { notifyStaff } from './notification.service.js';
import { logger } from '../utils/logger.js';

const PORTAL_URL = process.env.MEMBER_APP_URL ?? 'https://members.ecommerce.hr';
const API_BASE = process.env.API_BASE_URL ?? 'https://api.ecommerce.hr';

export const TICKET_TYPES: TicketType[] = ['VIP', 'STANDARD'];

type MemberWithUser = Member & { user: User; company: Company | null };

// ─── Kvota ────────────────────────────────────────────────────────────────────

// Kvota po članu iz Conference.ticketQuotas:
//   { "STANDARD": { "PREMIUM": 2, "STANDARD": 1 }, "VIP": { "PREMIUM": 1 } }
// Ključ unutar tipa ulaznice je MemberTier ili MemberType (tier ima prednost).
// Default ako kvote nisu definirane: STANDARD član → 1 STANDARD, PREMIUM član → 3 VIP.
// Member.ticketQuotaOverride ({ "STANDARD": 3 }) ima prednost pred svime — po tipu ulaznice.
export function getTicketQuota(conference: Conference, member: Member): Record<TicketType, number> {
  const quotas = conference.ticketQuotas as Record<string, Record<string, number>> | null;
  const result: Record<TicketType, number> = { VIP: 0, STANDARD: 0 };

  if (member.status !== 'ACTIVE') return result;

  if (!quotas || typeof quotas !== 'object') {
    if (member.memberTier === 'PREMIUM') result.VIP = 3;
    else if (member.memberTier === 'STANDARD') result.STANDARD = 1;
  } else {
    for (const type of TICKET_TYPES) {
      const byGroup = quotas[type];
      if (!byGroup || typeof byGroup !== 'object') continue;
      const value = byGroup[member.memberTier] ?? byGroup[member.memberType] ?? byGroup['*'];
      if (typeof value === 'number' && value >= 0) result[type] = value;
    }
  }

  const override = member.ticketQuotaOverride as Record<string, number> | null;
  if (override && typeof override === 'object') {
    for (const type of TICKET_TYPES) {
      const value = override[type];
      if (typeof value === 'number' && value >= 0) result[type] = value;
    }
  }
  return result;
}

// Iskorištenost kvote — broje se sve ne-otkazane ulaznice člana po tipu
export async function getTicketUsage(
  conferenceId: string,
  memberId: string,
  client: Pick<typeof prisma, 'conferenceTicket'> = prisma,
): Promise<Record<TicketType, number>> {
  const grouped = await client.conferenceTicket.groupBy({
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
  if (!conference.editDeadline) return true;
  // Deadline se sprema kao datum (ponoć UTC) — rok vrijedi DO KRAJA tog dana,
  // inače bi "do 13.10." u praksi značilo da 13.10. više ništa ne prolazi.
  const deadlineEnd = new Date(conference.editDeadline.getTime() + 24 * 60 * 60 * 1000);
  return new Date() < deadlineEnd;
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
  | { error: 'CHECKED_IN' }
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

  // Provjera kvote i upis u ISTOJ serializable transakciji — dva paralelna zahtjeva
  // (dupli klik, skripta) inače oba prođu ispod kvote i preskoče PENDING/ponuda flow.
  const runCreate = () =>
    prisma.$transaction(
      async (tx) => {
        const usage = await getTicketUsage(conferenceId, member.id, tx);
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

        // Token generiramo kriptografski (cuid default je djelomično predvidljiv, a token je javni URL)
        const ticket = existing
          ? await tx.conferenceTicket.update({ where: { id: existing.id }, data })
          : await tx.conferenceTicket.create({ data: { ...data, conferenceId, memberId: member.id, token: crypto.randomUUID() } });
        return { ticket, overQuota, status };
      },
      { isolationLevel: 'Serializable' },
    );

  let created: Awaited<ReturnType<typeof runCreate>>;
  try {
    created = await runCreate();
  } catch {
    // Serializacijski konflikt (paralelni upis) — jedan retry
    created = await runCreate();
  }
  const { ticket, overQuota, status } = created;

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
  // Isti guardovi kao kod kreiranja — API je ugovor, ne UI (koji gumbe samo sakrije)
  const conference = await prisma.conference.findFirst({ where: { id: conferenceId, isActive: true } });
  if (!conference) return { error: 'CONFERENCE_NOT_FOUND' };
  if (!isEditOpen(conference)) return { error: 'DEADLINE_PASSED' };

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: { user: true, company: true },
  });
  if (!member) return { error: 'TICKET_NOT_FOUND' };
  if (member.status !== 'ACTIVE') return { error: 'INACTIVE' };

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

  // Iste posljedice kao kod kreiranja: prijelaz statusa šalje emailove / obavještava staff,
  // a promjena email adrese na CONFIRMED ulaznici šalje QR novoj osobi. Await, ne ruši operaciju.
  try {
    if (updated.status !== ticket.status) {
      if (updated.status === 'CONFIRMED') {
        await sendTicketConfirmedEmail(conference, updated, member);
        await sendMemberAddedEmail(conference, updated, member, false);
      } else {
        await sendMemberAddedEmail(conference, updated, member, true);
        const memberName = `${member.user.firstName} ${member.user.lastName}`.trim();
        const company = member.company?.name ? ` (${member.company.name})` : '';
        await notifyStaff({
          type: 'ACTION',
          title: 'Zatražena dodatna ulaznica',
          message: `${memberName}${company} je promjenom tipa ulaznice (${updated.fullName}) prešao/la kvotu za ${conference.name} — poslati ponudu s ${conference.extraDiscount}% popusta.`,
          actionUrl: `/tickets`,
        });
      }
    } else if (updated.status === 'CONFIRMED' && updated.email !== ticket.email) {
      await sendTicketConfirmedEmail(conference, updated, member);
    }
  } catch (err) {
    logger.error(err, 'Ticket update notification/email failed');
  }

  return { ticket: updated };
}

export async function deleteTicket(
  conferenceId: string,
  ticketId: string,
  memberId: string,
): Promise<{ ok: true } | TicketError> {
  const conference = await prisma.conference.findFirst({ where: { id: conferenceId, isActive: true } });
  if (!conference) return { error: 'CONFERENCE_NOT_FOUND' };
  if (!isEditOpen(conference)) return { error: 'DEADLINE_PASSED' };

  const member = await prisma.member.findUnique({ where: { id: memberId } });
  if (!member || member.status !== 'ACTIVE') return { error: 'INACTIVE' };

  const ticket = await prisma.conferenceTicket.findFirst({
    where: { id: ticketId, conferenceId, memberId },
  });
  if (!ticket) return { error: 'TICKET_NOT_FOUND' };
  // Iskorištena (skenirana) ulaznica se ne smije obrisati — trag check-ina mora ostati
  if (ticket.checkedInAt) return { error: 'CHECKED_IN' };

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

// Javni URL za preuzimanje ulaznice kao PDF
export function ticketPdfUrl(token: string): string {
  return `${API_BASE}/api/tickets/${token}/pdf`;
}

// ─── PDF ulaznice ─────────────────────────────────────────────────────────────

// Generira ulaznicu kao PDF (isti sadržaj kao javna stranica: konferencija, tip, vlasnik,
// QR kod, dvojezična napomena). Roboto fontovi zbog hrvatskih znakova.
export async function generateTicketPdf(
  ticket: Pick<ConferenceTicket, 'fullName' | 'jobTitle' | 'email' | 'type' | 'token'>,
  conference: Pick<Conference, 'name' | 'description' | 'startDate' | 'location'>,
  companyName: string | null,
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const fontRegular = await pdfDoc.embedFont(Buffer.from(robotoRegularBase64, 'base64'), { subset: true });
  const fontBold = await pdfDoc.embedFont(Buffer.from(robotoBoldBase64, 'base64'), { subset: true });

  const W = 700;
  const H = 330;
  const page = pdfDoc.addPage([W, H]);
  const navy = rgb(0.06, 0.09, 0.16);
  const dark = rgb(0.12, 0.16, 0.22);
  const gray = rgb(0.42, 0.45, 0.5);
  const light = rgb(0.62, 0.65, 0.7);
  const orange = rgb(0.93, 0.5, 0.13);

  // Tamni okvir + narančasti akcent gore desno (kao na javnoj stranici ulaznice)
  page.drawRectangle({ x: 6, y: 6, width: W - 12, height: H - 12, borderColor: navy, borderWidth: 8 });
  page.drawRectangle({ x: W - 290, y: H - 14, width: 276, height: 8, color: orange });

  const left = 40;
  let y = H - 62;
  page.drawText('ULAZNICA · TICKET', { x: left, y, size: 9, font: fontBold, color: light });
  y -= 30;
  page.drawText(conference.name.toUpperCase(), { x: left, y, size: 25, font: fontBold, color: navy });
  y -= 24;
  page.drawText(fmtDate(conference.startDate), { x: left, y, size: 13, font: fontBold, color: dark });
  y -= 17;
  if (conference.location) {
    page.drawText(conference.location, { x: left, y, size: 10.5, font: fontRegular, color: gray });
    y -= 15;
  }
  if (conference.description) {
    page.drawText(conference.description, { x: left, y, size: 10.5, font: fontBold, color: dark });
    y -= 15;
  }
  y -= 10;
  page.drawText(`Tip ulaznice: ${ticket.type}`, { x: left, y, size: 11, font: fontBold, color: dark });
  y -= 20;
  if (ticket.jobTitle) {
    page.drawText(ticket.jobTitle, { x: left, y, size: 10.5, font: fontRegular, color: gray });
    y -= 15;
  }
  page.drawText(ticket.email, { x: left, y, size: 10.5, font: fontRegular, color: dark });
  y -= 15;
  if (companyName) {
    page.drawText(companyName, { x: left, y, size: 10.5, font: fontRegular, color: dark });
  }

  // Desno: QR kod + vlasnik
  const qrPng = await bwipjs.toBuffer({ bcid: 'qrcode', text: ticketUrl(ticket.token), scale: 6, includetext: false });
  const qrImage = await pdfDoc.embedPng(qrPng);
  const qrSize = 150;
  const qrX = W - qrSize - 55;
  const qrY = H - qrSize - 55;
  page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });
  const ownerLabel = 'VLASNIK ULAZNICE';
  const ownerLabelW = fontBold.widthOfTextAtSize(ownerLabel, 8);
  page.drawText(ownerLabel, { x: qrX + qrSize / 2 - ownerLabelW / 2, y: qrY - 18, size: 8, font: fontBold, color: light });
  const ownerW = fontBold.widthOfTextAtSize(ticket.fullName, 13);
  page.drawText(ticket.fullName, { x: qrX + qrSize / 2 - ownerW / 2, y: qrY - 34, size: 13, font: fontBold, color: navy });

  // Dvojezična napomena na dnu
  const noteLines = [
    'Ulaznica vrijedi za cijeli dan (uključujući party), glasi na ime i prezime i nije prenosiva.',
    'Ulaznicu je potrebno zamijeniti za akreditaciju na registracijskom pultu konferencije.',
    "The ticket is valid for all day (including party), it's under your name and it's not transferable.",
    'The ticket needs to be exchanged for a Conference pass at the registration desk.',
  ];
  let ny = 58;
  for (const line of noteLines) {
    page.drawText(line, { x: left, y: ny, size: 8, font: fontRegular, color: gray });
    ny -= 11;
  }

  return Buffer.from(await pdfDoc.save());
}

// ─── Emailovi ─────────────────────────────────────────────────────────────────

function fmtDate(d: Date | null): string {
  if (!d) return '—';
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}.`;
}

function emailShell(body: string): string {
  return `<!DOCTYPE html><html lang="hr"><body style="font-family:Helvetica,Arial,sans-serif;color:#1f2937;line-height:1.6;">${body}</body></html>`;
}

// 1. Osobi za ulaznicu — kad postane CONFIRMED (kod dodavanja ili admin odobrenja).
// Ulaznica (PDF) ide u privitku + gumbi "Otvori ulaznicu" i "Preuzmi PDF";
// nigdje se ne spominje members portal (ni golim URL-om).
export async function sendTicketConfirmedEmail(
  conference: Conference,
  ticket: ConferenceTicket,
  member: MemberWithUser,
): Promise<void> {
  const pdfFilename = `ulaznica-${conference.name.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '')}.pdf`;
  let pdfBase64: string | null = null;
  try {
    const pdf = await generateTicketPdf(ticket, conference, member.company?.name ?? null);
    pdfBase64 = pdf.toString('base64');
  } catch (err) {
    logger.error(err, 'Ticket PDF generation failed — email ide bez privitka');
  }

  const html = emailShell(`
    <p>Poštovani ${ticket.fullName},</p>
    <p><strong>${member.company?.name || `${member.user.firstName} ${member.user.lastName}`}</strong> vam je osigurao/la ulaznicu za konferenciju <strong>${conference.name}</strong>${conference.location ? ` (${conference.location})` : ''}, ${fmtDate(conference.startDate)}</p>
    <p style="font-size:16px;font-weight:600;color:#1B365D;">Tip ulaznice: ${ticket.type}</p>
    <p>Vaša ulaznica s QR kodom nalazi se u privitku ovog emaila (PDF).</p>
    <p>
      <a href="${ticketUrl(ticket.token)}" style="display:inline-block;background:#1B365D;color:#ffffff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold;">Otvori ulaznicu</a>
      &nbsp;
      <a href="${ticketPdfUrl(ticket.token)}" style="display:inline-block;background:#ffffff;color:#1B365D;border:2px solid #1B365D;padding:8px 18px;border-radius:8px;text-decoration:none;font-weight:bold;">Preuzmi PDF</a>
    </p>
    <p style="font-size:13px;color:#6b7280;">Ulaznicu pokažite na ulazu (na mobitelu ili isprintanu).</p>
    <p>Srdačan pozdrav,<br/><strong>Udruga eCommerce Hrvatska</strong></p>
  `);
  await sendEmail(ticket.email, `Vaša ulaznica za ${conference.name}`, html, {
    templateName: 'ticket-confirmed',
    memberId: member.id,
    ...(pdfBase64
      ? { attachments: [{ filename: pdfFilename, content: pdfBase64, contentType: 'application/pdf' }] }
      : {}),
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
       <p>Ulaznica s QR kodom poslana je na email osobe, a možete je i sami <a href="${ticketUrl(ticket.token)}" style="color:#E8A838;font-weight:bold;">otvoriti</a> ili <a href="${ticketPdfUrl(ticket.token)}" style="color:#E8A838;font-weight:bold;">preuzeti kao PDF</a>.</p>`;
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
