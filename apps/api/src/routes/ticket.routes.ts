import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '@ecommerce-hr/db';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { successResponse, errorResponse } from '../utils/api-response.js';
import { generateTicketQr, ticketUrl } from '../services/ticket.service.js';

// ─── Javna ulaznica (bez autha, rate-limited) ────────────────────────────────

const publicTicketLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT', message: 'Previše zahtjeva, pokušajte ponovno kasnije' },
  },
});

const publicRouter = Router();

// GET /api/tickets/:token — javni podaci ulaznice + QR (samo CONFIRMED)
publicRouter.get('/:token', publicTicketLimiter, async (req, res) => {
  const ticket = await prisma.conferenceTicket.findUnique({
    where: { token: req.params.token as string },
    include: {
      conference: { select: { name: true, startDate: true, endDate: true, location: true } },
      member: { include: { company: { select: { name: true } } } },
    },
  });

  if (!ticket || ticket.status !== 'CONFIRMED') {
    errorResponse(res, 'NOT_FOUND', 'Ulaznica nije pronađena ili još nije potvrđena', 404);
    return;
  }

  const qr = await generateTicketQr(ticket.token);
  successResponse(res, {
    fullName: ticket.fullName,
    jobTitle: ticket.jobTitle,
    company: ticket.member.company?.name ?? null,
    type: ticket.type,
    checkedInAt: ticket.checkedInAt,
    conference: ticket.conference,
    url: ticketUrl(ticket.token),
    qr,
  });
});

// ─── Check-in (auth: OWNER/OPERATOR) ─────────────────────────────────────────

const osRouter = Router();
osRouter.use(authenticate);
osRouter.use(requireRole('OWNER', 'OPERATOR'));

// POST /api/os/tickets/:token/checkin — jednokratan; već skenirano → 409 s vremenom
osRouter.post('/:token/checkin', async (req: AuthRequest, res) => {
  const ticket = await prisma.conferenceTicket.findUnique({
    where: { token: req.params.token as string },
    include: { member: { include: { company: { select: { name: true } } } } },
  });

  if (!ticket) {
    errorResponse(res, 'NOT_FOUND', 'Ulaznica nije pronađena', 404);
    return;
  }
  if (ticket.status !== 'CONFIRMED') {
    errorResponse(res, 'FORBIDDEN', 'Ulaznica nije potvrđena (status: ' + ticket.status + ')', 403);
    return;
  }
  if (ticket.checkedInAt) {
    const t = ticket.checkedInAt;
    const when = `${String(t.getDate()).padStart(2, '0')}.${String(t.getMonth() + 1).padStart(2, '0')}.${t.getFullYear()}. u ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
    errorResponse(res, 'CONFLICT', `Ulaznica je već skenirana ${when}`, 409);
    return;
  }

  const updated = await prisma.conferenceTicket.update({
    where: { id: ticket.id },
    data: { checkedInAt: new Date() },
  });
  successResponse(res, {
    fullName: ticket.fullName,
    company: ticket.member.company?.name ?? null,
    type: ticket.type,
    checkedInAt: updated.checkedInAt,
  });
});

export { publicRouter as publicTicketRoutes, osRouter as osTicketRoutes };
