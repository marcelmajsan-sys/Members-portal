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
    if (result.error === 'NOT_ELIGIBLE') {
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
