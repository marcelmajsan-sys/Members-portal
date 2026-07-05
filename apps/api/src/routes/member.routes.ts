import { Router } from 'express';
import { updateMemberSchema, paginationSchema } from '@ecommerce-hr/shared';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import { validate, validateQuery } from '../middleware/validate.js';
import { successResponse, errorResponse, paginatedResponse } from '../utils/api-response.js';
import {
  getMemberByUserId,
  updateMemberProfile,
  getMemberDashboard,
  getMemberInvoices,
  getMemberBenefits,
  getMemberEmails,
  getMemberOffers,
  getMemberPerks,
  claimMemberPerk,
} from '../services/member.service.js';
import {
  requestWebshopAnalysis,
  getLatestWebshopAnalysis,
  getWebshopAnalysisQuota,
} from '../services/webshop-analysis.service.js';
import { sendEmail } from '@ecommerce-hr/email';
import { prisma } from '@ecommerce-hr/db';
import { createNotification } from '../services/notification.service.js';
import { z } from 'zod';
import {
  getActiveConference,
  getTicketQuota,
  getTicketUsage,
  getMemberTickets,
  isEditOpen,
  createTicket,
  updateTicket,
  deleteTicket,
} from '../services/ticket.service.js';

const router = Router();

router.use(authenticate);

// GET /dashboard — member dashboard with stats
router.get('/dashboard', async (req: AuthRequest, res) => {
  const dashboard = await getMemberDashboard(req.user!.userId);

  if (!dashboard) {
    errorResponse(res, 'NOT_FOUND', 'Member profile not found', 404);
    return;
  }

  successResponse(res, dashboard);
});

// GET /profile
router.get('/profile', async (req: AuthRequest, res) => {
  const member = await getMemberByUserId(req.user!.userId);

  if (!member) {
    errorResponse(res, 'NOT_FOUND', 'Member profile not found', 404);
    return;
  }

  successResponse(res, member);
});

// PUT /profile — update profile (personal + company data)
const optStr = (max = 500) => z.string().trim().max(max).optional();
const optDate = z
  .string()
  .refine((v) => v === '' || !Number.isNaN(Date.parse(v)), 'Neispravan datum')
  .optional()
  .nullable();

const profileUpdateSchema = z.object({
  firstName: optStr(100),
  lastName: optStr(100),
  email: z.string().trim().email('Neispravna email adresa').optional(),
  companyName: optStr(200),
  oib: optStr(20),
  address: optStr(),
  city: optStr(100),
  postalCode: optStr(20),
  country: optStr(100),
  phone: optStr(50),
  website: optStr(200),
  companyEmail: z.union([z.literal(''), z.string().trim().email('Neispravna email adresa tvrtke')]).optional().nullable(),
  companyNote: optStr(2000),
  personalAddress: optStr().nullable(),
  personalZip: optStr(20).nullable(),
  personalCity: optStr(100).nullable(),
  personalCountry: optStr(100).nullable(),
  personalOib: optStr(20).nullable(),
  personalPhone: optStr(50).nullable(),
  personalNote: optStr(2000).nullable(),
  dateOfBirth: optDate,
  secondaryContact: z
    .object({
      firstName: optStr(100).nullable(),
      lastName: optStr(100).nullable(),
      address: optStr().nullable(),
      zip: optStr(20).nullable(),
      city: optStr(100).nullable(),
      country: optStr(100).nullable(),
      oib: optStr(20).nullable(),
      dateOfBirth: optDate,
      phone: optStr(50).nullable(),
      email: z.union([z.literal(''), z.string().trim().email('Neispravna email adresa kontakta')]).optional().nullable(),
      note: optStr(2000).nullable(),
    })
    .optional()
    .nullable(),
});

router.put('/profile', validate(profileUpdateSchema), async (req: AuthRequest, res) => {
  try {
    const updated = await updateMemberProfile(req.user!.userId, req.body);
    if (!updated) {
      errorResponse(res, 'NOT_FOUND', 'Member profile not found', 404);
      return;
    }
    successResponse(res, updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Profile update failed';
    if (message === 'EMAIL_TAKEN') {
      errorResponse(res, 'CONFLICT', 'Email adresa je već u upotrebi.', 409);
      return;
    }
    // Sirova (engleska/Prisma) poruka se ne prosljeđuje članu
    errorResponse(res, 'UPDATE_FAILED', 'Spremanje profila nije uspjelo, pokušajte ponovno.', 500);
  }
});

// GET /invoices — paginated invoices
router.get('/invoices', validateQuery(paginationSchema), async (req: AuthRequest, res) => {
  const { page, limit } = res.locals.query as { page: number; limit: number };
  const result = await getMemberInvoices(req.user!.userId, page, limit);

  if (!result) {
    errorResponse(res, 'NOT_FOUND', 'Member profile not found', 404);
    return;
  }

  paginatedResponse(res, result.invoices, { page, limit, total: result.total });
});

// GET /emails — member's email communication (sent + received)
router.get('/emails', async (req: AuthRequest, res) => {
  const emails = await getMemberEmails(req.user!.userId);
  if (!emails) {
    errorResponse(res, 'NOT_FOUND', 'Member profile not found', 404);
    return;
  }
  successResponse(res, emails);
});

// GET /offers — member's offers
router.get('/offers', async (req: AuthRequest, res) => {
  const offers = await getMemberOffers(req.user!.userId);
  if (!offers) {
    errorResponse(res, 'NOT_FOUND', 'Member profile not found', 404);
    return;
  }
  successResponse(res, offers);
});

// GET /perks — benefits available to / claimed by the member ({ available, claimed })
router.get('/perks', async (req: AuthRequest, res) => {
  const perks = await getMemberPerks(req.user!.userId);
  if (!perks) {
    errorResponse(res, 'NOT_FOUND', 'Member profile not found', 404);
    return;
  }
  successResponse(res, perks);
});

// POST /perks/:benefitId/claim — member claims a benefit ("Prijava")
router.post('/perks/:benefitId/claim', async (req: AuthRequest, res) => {
  const result = await claimMemberPerk(req.user!.userId, req.params.benefitId as string);

  if ('error' in result) {
    if (result.error === 'INACTIVE') {
      errorResponse(res, 'FORBIDDEN', 'Produžite članstvo da biste iskoristili benefit', 403);
    } else if (result.error === 'ALREADY_FULFILLED') {
      errorResponse(res, 'CONFLICT', 'Već imate aktivan certifikat', 409);
    } else if (result.error === 'NOT_ELIGIBLE') {
      errorResponse(res, 'FORBIDDEN', 'Nemate pravo na ovaj benefit', 403);
    } else if (result.error === 'NOT_FOUND') {
      errorResponse(res, 'NOT_FOUND', 'Benefit nije pronađen', 404);
    } else {
      errorResponse(res, 'NOT_FOUND', 'Member profile not found', 404);
    }
    return;
  }

  if (!result.alreadyClaimed) {
    const { member, benefit } = result;
    const memberName = `${member.user.firstName} ${member.user.lastName}`.trim();
    const company = member.company?.name ? ` (${member.company.name})` : '';

    // Notify staff in-app: pick OWNER/OPERATOR users
    try {
      const staff = await prisma.user.findMany({
        where: { role: { in: ['OWNER', 'OPERATOR'] }, isActive: true },
        select: { id: true },
      });
      await Promise.all(staff.map((s) =>
        createNotification({
          userId: s.id,
          type: 'ACTION',
          title: 'Zatražen benefit',
          message: `${memberName}${company} je zatražio/la benefit: ${benefit.title}`,
          actionUrl: `/members/${member.id}`,
        }),
      ));
    } catch (err) {
      // non-fatal
    }

    // Notify the association by email
    try {
      const to = process.env.EMAIL_REPLY_TO || 'udruga@ecommerce.hr';
      const html = `<!DOCTYPE html><html lang="hr"><body style="font-family:Helvetica,Arial,sans-serif;color:#1f2937;line-height:1.6;">
        <p>Član <strong>${memberName}</strong>${company} je putem portala zatražio benefit:</p>
        <p style="font-size:16px;font-weight:600;color:#1B365D;">${benefit.title}</p>
        ${benefit.description ? `<p style="color:#6b7280;">${benefit.description}</p>` : ''}
        <p style="font-size:13px;color:#6b7280;">Email člana: ${member.user.email}</p>
      </body></html>`;
      await sendEmail(to, `Zatražen benefit: ${benefit.title}`, html, {
        templateName: 'benefit-claim',
        memberId: member.id,
      });
    } catch (err) {
      // non-fatal
    }
  }

  successResponse(res, { message: 'Benefit zatražen', alreadyClaimed: result.alreadyClaimed });
});

// GET /webshop-analysis — latest AI webshop analysis for the member (or null)
router.get('/webshop-analysis', async (req: AuthRequest, res) => {
  const analysis = await getLatestWebshopAnalysis(req.user!.userId);
  successResponse(res, analysis);
});

// GET /webshop-analysis/quota — koliko je analiza član iskoristio/preostalo (godišnji limit)
router.get('/webshop-analysis/quota', async (req: AuthRequest, res) => {
  const quota = await getWebshopAnalysisQuota(req.user!.userId);
  successResponse(res, quota);
});

// POST /webshop-analysis — run a fresh AI webshop analysis (synchronous)
router.post('/webshop-analysis', async (req: AuthRequest, res) => {
  const result = await requestWebshopAnalysis(req.user!.userId);

  // Uspješan rezultat je WebshopAnalysis zapis koji TAKOĐER ima polje `error` (nullable
  // kolona, `null` pri uspjehu) — zato `'error' in result` ne razlikuje uspjeh od greške.
  // Sentineli greške nemaju `id`; zapis ga uvijek ima.
  if (!('id' in result)) {
    switch (result.error) {
      case 'NOT_TRADER':
        errorResponse(res, 'FORBIDDEN', 'Analiza webshopa dostupna je samo članovima tipa Web trgovac', 403);
        return;
      case 'LIMIT_REACHED':
        errorResponse(res, 'RATE_LIMITED', 'Dosegli ste godišnji limit od 2 analize webshopa', 429);
        return;
      case 'INACTIVE':
        errorResponse(res, 'FORBIDDEN', 'Produžite članstvo da biste pokrenuli analizu', 403);
        return;
      case 'NO_WEBSITE':
        errorResponse(res, 'BAD_REQUEST', 'Dodajte web adresu tvrtke da biste pokrenuli analizu', 400);
        return;
      case 'IN_PROGRESS':
        errorResponse(res, 'CONFLICT', 'Analiza je već u tijeku', 409);
        return;
      case 'ANALYSIS_FAILED':
        errorResponse(res, 'ANALYSIS_FAILED', 'Analiza nije uspjela, pokušajte ponovno kasnije', 502);
        return;
      default:
        errorResponse(res, 'NOT_FOUND', 'Member profile not found', 404);
        return;
    }
  }

  successResponse(res, result);
});

// ─── Ulaznice za konferenciju ────────────────────────────────────────────────

const ticketInputSchema = z.object({
  fullName: z.string().trim().min(1, 'Ime i prezime je obavezno'),
  jobTitle: z.string().trim().optional().nullable(),
  email: z.string().trim().email('Neispravna email adresa'),
  phone: z.string().trim().min(1, 'Broj telefona je obavezan'),
  type: z.enum(['VIP', 'STANDARD']).default('STANDARD'),
});

async function getTicketMember(userId: string) {
  return prisma.member.findUnique({
    where: { userId },
    include: { user: true, company: true },
  });
}

function ticketErrorResponse(res: Parameters<typeof errorResponse>[0], error: string): void {
  switch (error) {
    case 'CONFERENCE_NOT_FOUND':
      errorResponse(res, 'NOT_FOUND', 'Konferencija nije pronađena', 404);
      return;
    case 'DEADLINE_PASSED':
      errorResponse(res, 'FORBIDDEN', 'Rok za izmjene osoba za ulaznice je prošao', 403);
      return;
    case 'DUPLICATE_EMAIL':
      errorResponse(res, 'CONFLICT', 'Osoba s tom email adresom već ima ulaznicu za ovu konferenciju', 409);
      return;
    case 'INACTIVE':
      errorResponse(res, 'FORBIDDEN', 'Produžite članstvo da biste dodavali osobe za ulaznice', 403);
      return;
    case 'CHECKED_IN':
      errorResponse(res, 'CONFLICT', 'Ulaznica je već iskorištena na ulazu i ne može se ukloniti', 409);
      return;
    default:
      errorResponse(res, 'NOT_FOUND', 'Ulaznica nije pronađena', 404);
  }
}

// GET /conferences/active — aktivna konferencija + kvota + rok (null ako nema aktivne)
router.get('/conferences/active', async (req: AuthRequest, res) => {
  const member = await getTicketMember(req.user!.userId);
  if (!member) {
    errorResponse(res, 'NOT_FOUND', 'Member profile not found', 404);
    return;
  }
  const conference = await getActiveConference();
  if (!conference) {
    successResponse(res, null);
    return;
  }
  const [quota, used] = await Promise.all([
    Promise.resolve(getTicketQuota(conference, member)),
    getTicketUsage(conference.id, member.id),
  ]);
  successResponse(res, {
    conference: {
      id: conference.id,
      name: conference.name,
      startDate: conference.startDate,
      endDate: conference.endDate,
      location: conference.location,
      editDeadline: conference.editDeadline,
      extraDiscount: conference.extraDiscount,
    },
    editable: isEditOpen(conference),
    quota,
    used,
  });
});

// GET /conferences/:id/tickets — samo vlastite osobe (memberId iz tokena)
router.get('/conferences/:id/tickets', async (req: AuthRequest, res) => {
  const member = await getTicketMember(req.user!.userId);
  if (!member) {
    errorResponse(res, 'NOT_FOUND', 'Member profile not found', 404);
    return;
  }
  const tickets = await getMemberTickets(req.params.id as string, member.id);
  successResponse(res, tickets);
});

// POST /conferences/:id/tickets — dodaj osobu (kvota/rok/duplikat se provjeravaju na backendu)
router.post('/conferences/:id/tickets', validate(ticketInputSchema), async (req: AuthRequest, res) => {
  const member = await getTicketMember(req.user!.userId);
  if (!member) {
    errorResponse(res, 'NOT_FOUND', 'Member profile not found', 404);
    return;
  }
  const result = await createTicket(req.params.id as string, member, req.body);
  if ('error' in result) {
    ticketErrorResponse(res, result.error);
    return;
  }
  successResponse(res, { ticket: result.ticket, overQuota: result.overQuota }, 201);
});

// PUT /conferences/:id/tickets/:tid — uredi osobu
router.put('/conferences/:id/tickets/:tid', validate(ticketInputSchema), async (req: AuthRequest, res) => {
  const member = await getTicketMember(req.user!.userId);
  if (!member) {
    errorResponse(res, 'NOT_FOUND', 'Member profile not found', 404);
    return;
  }
  const result = await updateTicket(req.params.id as string, req.params.tid as string, member.id, req.body);
  if ('error' in result) {
    ticketErrorResponse(res, result.error);
    return;
  }
  successResponse(res, result.ticket);
});

// DELETE /conferences/:id/tickets/:tid — ukloni osobu
router.delete('/conferences/:id/tickets/:tid', async (req: AuthRequest, res) => {
  const member = await getTicketMember(req.user!.userId);
  if (!member) {
    errorResponse(res, 'NOT_FOUND', 'Member profile not found', 404);
    return;
  }
  const result = await deleteTicket(req.params.id as string, req.params.tid as string, member.id);
  if ('error' in result) {
    ticketErrorResponse(res, result.error);
    return;
  }
  successResponse(res, { deleted: true });
});

// GET /benefits — benefits by member type
router.get('/benefits', async (req: AuthRequest, res) => {
  const benefits = await getMemberBenefits(req.user!.userId);

  if (!benefits) {
    errorResponse(res, 'NOT_FOUND', 'Member profile not found', 404);
    return;
  }

  successResponse(res, benefits);
});

export default router;
