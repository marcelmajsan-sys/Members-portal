import { Router } from 'express';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import { prisma } from '@ecommerce-hr/db';
import type { TicketStatus, TicketType } from '@ecommerce-hr/db';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { successResponse, errorResponse } from '../utils/api-response.js';
import { sendTicketConfirmedEmail, sendMemberAddedEmail, ticketUrl } from '../services/ticket.service.js';
import { logger } from '../utils/logger.js';

const router = Router();

router.use(authenticate);
router.use(requireRole('OWNER', 'OPERATOR'));

// ─── Konferencije (postavke za ulaznice) ─────────────────────────────────────

const quotasSchema = z.record(z.record(z.number().int().min(0))).nullable();

const conferenceSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional().nullable(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  location: z.string().trim().optional().nullable(),
  isActive: z.boolean().optional(),
  editDeadline: z.coerce.date().optional().nullable(),
  extraDiscount: z.number().int().min(0).max(100).optional(),
  ticketQuotas: quotasSchema.optional(),
});

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[čć]/g, 'c').replace(/š/g, 's').replace(/ž/g, 'z').replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// GET / — sve konferencije s brojkama ulaznica
router.get('/', async (_req: AuthRequest, res) => {
  const conferences = await prisma.conference.findMany({
    orderBy: { startDate: 'desc' },
    include: { _count: { select: { tickets: true } } },
  });
  const withCounts = await Promise.all(
    conferences.map(async (c) => {
      const [confirmed, pending, checkedIn] = await Promise.all([
        prisma.conferenceTicket.count({ where: { conferenceId: c.id, status: 'CONFIRMED' } }),
        prisma.conferenceTicket.count({ where: { conferenceId: c.id, status: 'PENDING' } }),
        prisma.conferenceTicket.count({ where: { conferenceId: c.id, checkedInAt: { not: null } } }),
      ]);
      return { ...c, ticketCounts: { total: c._count.tickets, confirmed, pending, checkedIn } };
    }),
  );
  successResponse(res, withCounts);
});

// POST / — nova konferencija
router.post('/', validate(conferenceSchema), async (req: AuthRequest, res) => {
  const base = slugify(req.body.name);
  let slug = base;
  for (let i = 2; await prisma.conference.findUnique({ where: { slug } }); i++) {
    slug = `${base}-${i}`;
  }
  const conference = await prisma.conference.create({ data: { ...req.body, slug } });
  successResponse(res, conference, 201);
});

// PUT /:id — postavke (editDeadline, extraDiscount, ticketQuotas, isActive...)
router.put('/:id', validate(conferenceSchema.partial()), async (req: AuthRequest, res) => {
  const existing = await prisma.conference.findUnique({ where: { id: req.params.id as string } });
  if (!existing) {
    errorResponse(res, 'NOT_FOUND', 'Konferencija nije pronađena', 404);
    return;
  }
  const conference = await prisma.conference.update({
    where: { id: existing.id },
    data: req.body,
  });
  successResponse(res, conference);
});

// ─── Ulaznice (admin pregled i upravljanje) ──────────────────────────────────

const VALID_STATUSES: TicketStatus[] = ['CONFIRMED', 'PENDING', 'CANCELLED'];
const VALID_TYPES: TicketType[] = ['VIP', 'STANDARD'];

function ticketWhere(conferenceId: string, query: Record<string, unknown>) {
  const where: Record<string, unknown> = { conferenceId };

  // Comma-separated filteri (konvencija: ?status=PENDING,CONFIRMED&type=VIP)
  const statusParam = query.status as string | undefined;
  if (statusParam) {
    const statuses = statusParam.split(',').filter((s) => VALID_STATUSES.includes(s as TicketStatus));
    if (statuses.length > 0) where.status = { in: statuses };
  }
  const typeParam = query.type as string | undefined;
  if (typeParam) {
    const types = typeParam.split(',').filter((t) => VALID_TYPES.includes(t as TicketType));
    if (types.length > 0) where.type = { in: types };
  }
  const q = (query.q as string | undefined)?.trim();
  if (q) {
    where.OR = [
      { fullName: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { member: { company: { name: { contains: q, mode: 'insensitive' } } } },
      { member: { user: { firstName: { contains: q, mode: 'insensitive' } } } },
      { member: { user: { lastName: { contains: q, mode: 'insensitive' } } } },
    ];
  }
  const checkedIn = query.checkedIn as string | undefined;
  if (checkedIn === 'true') where.checkedInAt = { not: null };
  if (checkedIn === 'false') where.checkedInAt = null;

  const memberId = query.memberId as string | undefined;
  if (memberId) where.memberId = memberId;

  return where;
}

const ticketInclude = {
  member: {
    include: {
      company: { select: { name: true } },
      user: { select: { firstName: true, lastName: true, email: true } },
    },
  },
} as const;

// GET /:id/tickets — sve prijave s filterima
router.get('/:id/tickets', async (req: AuthRequest, res) => {
  const tickets = await prisma.conferenceTicket.findMany({
    where: ticketWhere(req.params.id as string, req.query),
    include: ticketInclude,
    orderBy: { createdAt: 'desc' },
  });
  successResponse(res, tickets.map((t) => ({ ...t, url: ticketUrl(t.token) })));
});

// GET /:id/tickets/export — XLSX export
router.get('/:id/tickets/export', async (req: AuthRequest, res) => {
  const tickets = await prisma.conferenceTicket.findMany({
    where: ticketWhere(req.params.id as string, req.query),
    include: ticketInclude,
    orderBy: { fullName: 'asc' },
  });

  const fmtDT = (d: Date | null) =>
    d ? `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}. ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : '';

  const toRow = (t: (typeof tickets)[number]) => ({
    'Ime i prezime': t.fullName,
    'Funkcija': t.jobTitle ?? '',
    'Tvrtka': t.member.company?.name ?? '',
    'Član (dodao)': `${t.member.user.firstName} ${t.member.user.lastName}`.trim(),
    'Email': t.email,
    'Telefon': t.phone,
    'Tip': t.type,
    'Status': t.status,
    'Check-in': fmtDT(t.checkedInAt),
  });
  const cols = [{ wch: 28 }, { wch: 20 }, { wch: 24 }, { wch: 22 }, { wch: 30 }, { wch: 16 }, { wch: 10 }, { wch: 12 }, { wch: 18 }];

  // Dva sheeta: prijave članova i ručno dodane (admin)
  const wb = XLSX.utils.book_new();
  const memberWs = XLSX.utils.json_to_sheet(tickets.filter((t) => !t.addedByStaff).map(toRow));
  memberWs['!cols'] = cols;
  XLSX.utils.book_append_sheet(wb, memberWs, 'Ulaznice članova');
  const staffWs = XLSX.utils.json_to_sheet(tickets.filter((t) => t.addedByStaff).map(toRow));
  staffWs['!cols'] = cols;
  XLSX.utils.book_append_sheet(wb, staffWs, 'Ručno dodane');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

  res.set({
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': 'attachment; filename="ulaznice.xlsx"',
  });
  res.send(buf);
});

// POST /:id/tickets — admin ručno dodaje ulaznicu članu (bez kvote; admin bira status)
const adminCreateTicketSchema = z.object({
  memberId: z.string().min(1),
  fullName: z.string().trim().min(1, 'Ime i prezime je obavezno'),
  jobTitle: z.string().trim().optional().nullable(),
  email: z.string().trim().email('Neispravna email adresa'),
  phone: z.string().trim().min(1, 'Broj telefona je obavezan'),
  type: z.enum(['VIP', 'STANDARD']).default('STANDARD'),
  status: z.enum(['CONFIRMED', 'PENDING']).default('CONFIRMED'),
});

router.post('/:id/tickets', validate(adminCreateTicketSchema), async (req: AuthRequest, res) => {
  const conferenceId = req.params.id as string;
  const conference = await prisma.conference.findUnique({ where: { id: conferenceId } });
  if (!conference) {
    errorResponse(res, 'NOT_FOUND', 'Konferencija nije pronađena', 404);
    return;
  }
  const member = await prisma.member.findUnique({
    where: { id: req.body.memberId },
    include: { user: true, company: true },
  });
  if (!member) {
    errorResponse(res, 'NOT_FOUND', 'Član nije pronađen', 404);
    return;
  }

  const email = (req.body.email as string).toLowerCase();
  const existing = await prisma.conferenceTicket.findUnique({
    where: { conferenceId_email: { conferenceId, email } },
  });
  if (existing && existing.status !== 'CANCELLED') {
    errorResponse(res, 'CONFLICT', 'Osoba s tom email adresom već ima ulaznicu za ovu konferenciju', 409);
    return;
  }

  const data = {
    fullName: (req.body.fullName as string).trim(),
    jobTitle: (req.body.jobTitle as string | null)?.trim() || null,
    email,
    phone: (req.body.phone as string).trim(),
    type: req.body.type as TicketType,
    status: req.body.status as TicketStatus,
    addedByStaff: true,
  };
  // Otkazana ulaznica s istim emailom se oživljava (unique [conferenceId, email])
  const ticket = existing
    ? await prisma.conferenceTicket.update({ where: { id: existing.id }, data: { ...data, memberId: member.id } })
    : await prisma.conferenceTicket.create({ data: { ...data, conferenceId, memberId: member.id } });

  if (ticket.status === 'CONFIRMED') {
    try {
      await sendTicketConfirmedEmail(conference, ticket, member);
      await sendMemberAddedEmail(conference, ticket, member, false);
    } catch (err) {
      logger.error(err, 'Admin ticket creation emails failed');
    }
  }

  successResponse(res, { ...ticket, url: ticketUrl(ticket.token) }, 201);
});

// PUT /:id/tickets/:tid — admin izmjena (potvrda PENDING → CONFIRMED, tip, podaci)
const adminTicketSchema = z.object({
  fullName: z.string().trim().min(1).optional(),
  jobTitle: z.string().trim().nullable().optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().min(1).optional(),
  type: z.enum(['VIP', 'STANDARD']).optional(),
  status: z.enum(['CONFIRMED', 'PENDING', 'CANCELLED']).optional(),
});

router.put('/:id/tickets/:tid', validate(adminTicketSchema), async (req: AuthRequest, res) => {
  const ticket = await prisma.conferenceTicket.findFirst({
    where: { id: req.params.tid as string, conferenceId: req.params.id as string },
  });
  if (!ticket) {
    errorResponse(res, 'NOT_FOUND', 'Ulaznica nije pronađena', 404);
    return;
  }

  const data = { ...req.body } as Record<string, unknown>;
  if (typeof data.email === 'string') {
    const email = data.email.toLowerCase();
    if (email !== ticket.email) {
      const clash = await prisma.conferenceTicket.findUnique({
        where: { conferenceId_email: { conferenceId: ticket.conferenceId, email } },
      });
      if (clash && clash.id !== ticket.id) {
        errorResponse(res, 'CONFLICT', 'Osoba s tom email adresom već ima ulaznicu za ovu konferenciju', 409);
        return;
      }
    }
    data.email = email;
  }

  const updated = await prisma.conferenceTicket.update({
    where: { id: ticket.id },
    data,
  });

  // Odobrenje (→ CONFIRMED): pošalji ulaznicu osobi + potvrdu članu, prije odgovora (serverless)
  if (updated.status === 'CONFIRMED' && ticket.status !== 'CONFIRMED') {
    try {
      const [conference, member] = await Promise.all([
        prisma.conference.findUnique({ where: { id: updated.conferenceId } }),
        prisma.member.findUnique({
          where: { id: updated.memberId },
          include: { user: true, company: true },
        }),
      ]);
      if (conference && member) {
        await sendTicketConfirmedEmail(conference, updated, member);
        await sendMemberAddedEmail(conference, updated, member, false);
      }
    } catch (err) {
      logger.error(err, 'Ticket approval emails failed');
    }
  }

  successResponse(res, updated);
});

export default router;
