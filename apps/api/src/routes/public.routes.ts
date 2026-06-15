import { Router } from 'express';
import { runAuditSchema } from '@ecommerce-hr/shared';
import { validate } from '../middleware/validate.js';
import { successResponse, errorResponse } from '../utils/api-response.js';
import { runAudit } from '../services/audit.service.js';
import { prisma } from '@ecommerce-hr/db';
import { sendEmail } from '@ecommerce-hr/email';
import { logger } from '../utils/logger.js';

const router = Router();

// GET /health
router.get('/health', (_req, res) => {
  successResponse(res, {
    timestamp: new Date().toISOString(),
    version: '0.0.1',
  });
});

// GET /stats
router.get('/stats', (_req, res) => {
  successResponse(res, {
    totalMembers: 0,
    activeMembers: 0,
    totalCertifications: 0,
    totalPartners: 0,
  });
});

// POST /audit — public audit endpoint (delegates to audit service)
router.post('/audit', validate(runAuditSchema), async (req, res) => {
  try {
    const report = await runAudit(req.body.websiteUrl);
    successResponse(res, report, 201);
  } catch {
    errorResponse(res, 'AUDIT_FAILED', 'Failed to generate audit report', 500);
  }
});

// POST /newsletter
router.post('/newsletter', async (req, res) => {
  const { email } = req.body;

  successResponse(res, {
    email,
    message: 'Successfully subscribed to the newsletter',
  });
});

// POST /contact
router.post('/contact', async (req, res) => {
  successResponse(res, {
    message: 'Contact form submitted successfully',
  });
});

// GET /public/renew-response — member clicks "Da" or "Ne" from renewal email
router.get('/public/renew-response', async (req, res) => {
  const { memberId, response } = req.query;

  if (!memberId || typeof memberId !== 'string') {
    res.status(400).send(htmlPage('Greška', 'Nevažeći link.'));
    return;
  }

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: { user: true, company: true },
  });

  if (!member) {
    res.status(404).send(htmlPage('Greška', 'Član nije pronađen.'));
    return;
  }

  const memberName = `${member.user.firstName} ${member.user.lastName ?? ''}`.trim();
  const companyName = member.company?.name ?? 'N/A';

  // Update offer status
  try {
    const { updateOfferStatusByMember } = await import('../services/offer.service.js');
    await updateOfferStatusByMember(memberId, response === 'yes' ? 'ACCEPTED' : 'DECLINED');
  } catch {
    // Offer might not exist (old-style email without offer), ignore
  }

  if (response === 'yes') {
    // Send notification to admin
    const adminEmail = process.env.ADMIN_EMAIL ?? 'marcel@ecommerce.hr';
    try {
      await sendEmail(
        adminEmail,
        `Produženje članstva — ${memberName}`,
        `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;">
  <div style="background:#1B365D;padding:20px 24px;text-align:center;">
    <img src="https://admin.ecommerce.hr/logo.png" alt="eCommerce Hrvatska" style="height:44px;" />
  </div>
  <div style="padding:24px;">
    <h2 style="color:#1B365D;">Zahtjev za produženje članstva</h2>
    <div style="background:#F0FFF4;border-left:4px solid #16A34A;padding:16px;border-radius:4px;margin:20px 0;">
      <p style="margin:4px 0;"><strong>Član:</strong> ${memberName}</p>
      <p style="margin:4px 0;"><strong>Email:</strong> ${member.user.email}</p>
      <p style="margin:4px 0;"><strong>Tvrtka:</strong> ${companyName}</p>
      <p style="margin:4px 0;"><strong>Tip:</strong> ${member.memberType}</p>
      <p style="margin:4px 0;"><strong>Odgovor:</strong> <span style="color:#16A34A;font-weight:bold;">DA, želi produžiti</span></p>
    </div>
    <p>Molimo kontaktirajte člana za dogovor oko plaćanja.</p>
  </div>
  <div style="background:#1B365D;padding:20px 24px;text-align:center;">
    <p style="margin:0 0 6px;color:#E8A838;font-size:12px;font-weight:bold;">eCommerce Hrvatska</p>
    <p style="margin:0;color:rgba(255,255,255,0.6);font-size:11px;">Republike Austrije 9, Zagreb · udruga@ecommerce.hr · +385 99 2025707</p>
  </div>
</body></html>`,
        { templateName: 'renew-response-admin' },
      );
      logger.info({ memberId, memberName }, 'Renewal YES response — admin notified');
    } catch (err) {
      logger.error(err, 'Failed to send renewal notification to admin');
    }

    res.send(htmlPage(
      'Hvala Vam!',
      `<p>Poštovani <strong>${member.user.firstName}</strong>,</p>
       <p>Vaš zahtjev za produženje članstva je zabilježen.</p>
       <p>Naš tim će Vas kontaktirati s uputama za plaćanje.</p>
       <p style="margin-top:24px;">Srdačan pozdrav,<br/><strong>Tim eCommerce Hrvatska</strong></p>`,
    ));
  } else {
    // response=no or anything else
    logger.info({ memberId, memberName, response }, 'Renewal response received');

    res.send(htmlPage(
      'Primljeno',
      `<p>Poštovani <strong>${member.user.firstName}</strong>,</p>
       <p>Zabilježili smo Vaš odgovor. Ako se predomislite, javite nam se na
       <a href="mailto:udruga@ecommerce.hr" style="color:#E8A838;">udruga@ecommerce.hr</a>.</p>
       <p style="margin-top:24px;">Srdačan pozdrav,<br/><strong>Tim eCommerce Hrvatska</strong></p>`,
    ));
  }
});

// GET /public/upgrade-response — free member clicks "Da, želim nadograditi"
router.get('/public/upgrade-response', async (req, res) => {
  const { memberId } = req.query;

  if (!memberId || typeof memberId !== 'string') {
    res.status(400).send(htmlPage('Greška', 'Nevažeći link.'));
    return;
  }

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: { user: true, company: true },
  });

  if (!member) {
    res.status(404).send(htmlPage('Greška', 'Član nije pronađen.'));
    return;
  }

  const memberName = `${member.user.firstName} ${member.user.lastName ?? ''}`.trim();
  const companyName = member.company?.name ?? 'N/A';

  const adminEmail = process.env.ADMIN_EMAIL ?? 'marcel@ecommerce.hr';
  try {
    await sendEmail(
      adminEmail,
      `Zahtjev za nadogradnju članstva — ${memberName}`,
      `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;">
  <div style="background:#1B365D;padding:20px 24px;text-align:center;">
    <img src="https://admin.ecommerce.hr/logo.png" alt="eCommerce Hrvatska" style="height:44px;" />
  </div>
  <div style="padding:24px;">
    <h2 style="color:#1B365D;">Zahtjev za nadogradnju članstva</h2>
    <div style="background:#F0FFF4;border-left:4px solid #16A34A;padding:16px;border-radius:4px;margin:20px 0;">
      <p style="margin:4px 0;"><strong>Član:</strong> ${memberName}</p>
      <p style="margin:4px 0;"><strong>Email:</strong> ${member.user.email}</p>
      <p style="margin:4px 0;"><strong>Tvrtka:</strong> ${companyName}</p>
      <p style="margin:4px 0;"><strong>Tip:</strong> ${member.memberType}</p>
      <p style="margin:4px 0;"><strong>Trenutna razina:</strong> ${member.memberTier}</p>
      <p style="margin:4px 0;"><strong>Odgovor:</strong> <span style="color:#16A34A;font-weight:bold;">DA, želi nadograditi</span></p>
    </div>
    <p>Molimo kontaktirajte člana za dogovor oko nadogradnje i plaćanja.</p>
  </div>
  <div style="background:#1B365D;padding:20px 24px;text-align:center;">
    <p style="margin:0 0 6px;color:#E8A838;font-size:12px;font-weight:bold;">eCommerce Hrvatska</p>
    <p style="margin:0;color:rgba(255,255,255,0.6);font-size:11px;">Republike Austrije 9, Zagreb · udruga@ecommerce.hr · +385 99 2025707</p>
  </div>
</body></html>`,
      { templateName: 'upgrade-response-admin' },
    );
    logger.info({ memberId, memberName }, 'Upgrade YES response — admin notified');
  } catch (err) {
    logger.error(err, 'Failed to send upgrade notification to admin');
  }

  res.send(htmlPage(
    'Hvala Vam!',
    `<p>Poštovani <strong>${member.user.firstName}</strong>,</p>
     <p>Vaš zahtjev za nadogradnju članstva je zabilježen.</p>
     <p>Naš tim će Vas kontaktirati s detaljima o paketima i plaćanju.</p>
     <p style="margin-top:24px;">Srdačan pozdrav,<br/><strong>Tim eCommerce Hrvatska</strong></p>`,
  ));
});

// 1x1 transparent GIF
const PIXEL_GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

// GET /public/track/open/:trackingId.gif — email open tracking pixel
router.get('/public/track/open/:trackingId.gif', async (req, res) => {
  const trackingId = req.params.trackingId;
  try {
    await prisma.emailLog.updateMany({
      where: { trackingId, openedAt: null },
      data: { openedAt: new Date() },
    });
  } catch {
    // Silent fail — never break email experience
  }
  res.set({
    'Content-Type': 'image/gif',
    'Content-Length': String(PIXEL_GIF.length),
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  });
  res.end(PIXEL_GIF);
});

// GET /public/track/click/:trackingId — email click tracking redirect
router.get('/public/track/click/:trackingId', async (req, res) => {
  const { trackingId } = req.params;
  const url = req.query.url as string;
  try {
    await prisma.emailLog.updateMany({
      where: { trackingId, clickedAt: null },
      data: { clickedAt: new Date() },
    });
  } catch {
    // Silent fail
  }
  if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
    res.redirect(302, url);
  } else {
    res.redirect(302, 'https://ecommerce.hr');
  }
});

function htmlPage(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="hr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — eCommerce Hrvatska</title></head>
<body style="font-family:Arial,sans-serif;color:#333;margin:0;padding:0;background:#F8FAFC;">
  <div style="background:#1B365D;padding:20px 24px;text-align:center;">
    <img src="https://admin.ecommerce.hr/logo.png" alt="eCommerce Hrvatska" style="height:44px;" />
  </div>
  <div style="max-width:500px;margin:40px auto;padding:32px;background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <h2 style="color:#1B365D;margin-top:0;">${title}</h2>
    ${body}
  </div>
  <div style="max-width:500px;margin:20px auto;text-align:center;">
    <p style="margin:0;color:#94A3B8;font-size:11px;">Republike Austrije 9, Zagreb · udruga@ecommerce.hr · +385 99 2025707</p>
  </div>
</body></html>`;
}

export default router;
