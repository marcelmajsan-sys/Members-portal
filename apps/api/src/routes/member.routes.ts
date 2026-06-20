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
router.put('/profile', async (req: AuthRequest, res) => {
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
    errorResponse(res, 'UPDATE_FAILED', message, 500);
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
