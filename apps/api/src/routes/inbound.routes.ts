import { Router } from 'express';
import { fetchInboundEmails } from '../services/inbound-email.service.js';
import { successResponse, errorResponse } from '../utils/api-response.js';

const router = Router();

// GET /api/cron/fetch-inbound — povuci dolazne odgovore članova iz sandučića udruge.
// Zaštićeno CRON_SECRET-om (Vercel cron šalje Authorization: Bearer <CRON_SECRET>).
router.get('/fetch-inbound', async (req, res) => {
  const provided =
    (req.query.secret as string) ||
    (req.headers['x-cron-secret'] as string) ||
    (req.headers.authorization || '').replace(/^Bearer\s+/i, '');

  if (!process.env.CRON_SECRET || provided !== process.env.CRON_SECRET) {
    errorResponse(res, 'UNAUTHORIZED', 'Neispravan cron secret', 401);
    return;
  }

  try {
    const stats = await fetchInboundEmails();
    successResponse(res, stats);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Greška pri dohvaćanju dolaznih mailova';
    errorResponse(res, 'INBOUND_ERROR', message, 500);
  }
});

export default router;
