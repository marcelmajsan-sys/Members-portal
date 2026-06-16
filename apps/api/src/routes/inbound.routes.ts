import { Router } from 'express';
import { fetchInboundEmails } from '../services/inbound-email.service.js';
import { runDailyRenewal } from '../services/renewal.service.js';
import { successResponse, errorResponse } from '../utils/api-response.js';

const router = Router();

function checkCronSecret(req: import('express').Request): boolean {
  const provided =
    (req.query.secret as string) ||
    (req.headers['x-cron-secret'] as string) ||
    (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  return !!process.env.CRON_SECRET && provided === process.env.CRON_SECRET;
}

// GET /api/cron/fetch-inbound — povuci dolazne odgovore članova iz sandučića udruge.
// Zaštićeno CRON_SECRET-om (Vercel cron šalje Authorization: Bearer <CRON_SECRET>).
router.get('/fetch-inbound', async (req, res) => {
  if (!checkCronSecret(req)) { errorResponse(res, 'UNAUTHORIZED', 'Neispravan cron secret', 401); return; }
  try {
    const stats = await fetchInboundEmails();
    successResponse(res, stats);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Greška pri dohvaćanju dolaznih mailova';
    errorResponse(res, 'INBOUND_ERROR', message, 500);
  }
});

// GET /api/cron/daily-renewal — dnevna provjera obnova (podsjetnici + auto-istek).
router.get('/daily-renewal', async (req, res) => {
  if (!checkCronSecret(req)) { errorResponse(res, 'UNAUTHORIZED', 'Neispravan cron secret', 401); return; }
  try {
    const stats = await runDailyRenewal();
    successResponse(res, stats);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Greška pri provjeri obnova';
    errorResponse(res, 'RENEWAL_ERROR', message, 500);
  }
});

export default router;
