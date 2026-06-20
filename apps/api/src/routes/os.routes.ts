import { Router } from 'express';
import crypto from 'node:crypto';
import { paginationSchema, idParamSchema } from '@ecommerce-hr/shared';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validateQuery, validateParams } from '../middleware/validate.js';
import { successResponse, paginatedResponse, errorResponse } from '../utils/api-response.js';
import { getAllMembers, searchMembers, updateMember, updateMemberTier, deleteMember, renewMembership, adminUpdateMemberProfile } from '../services/member.service.js';
import { getDashboardStats, getDashboardAnalytics, getRecentActivity } from '../services/dashboard.service.js';
import { createNotification, notifyStaff } from '../services/notification.service.js';
import { emitEvent } from '../lib/event-bus.js';
import { sendEmail } from '@ecommerce-hr/email';
import { ask } from '@ecommerce-hr/ai';
import { prisma } from '@ecommerce-hr/db';
import type { MemberTier, MemberType, MemberStatus } from '@ecommerce-hr/db';
import type { AuthRequest } from '../middleware/auth.js';
import { getMembershipPrice, getMembershipBenefits, isTierAvailable } from '../config/membership.js';
import { requestSafeShopAnalysis, getLatestSafeShopAnalysis, updateSafeShopAnalysis, getSafeShopAnalysisQuota } from '../services/safeshop-analysis.service.js';
import { buildRenewalConfirmationEmail, buildFreeUpgradeEmail } from '../utils/member-emails.js';
import { checkEmailCooldown } from '../services/automation-executor.js';
import { hashPassword } from '../services/auth.service.js';


const router = Router();

router.use(authenticate);
router.use(requireRole('OWNER', 'OPERATOR'));

// GET /dashboard
router.get('/dashboard', async (req: AuthRequest, res) => {
  const stats = await getDashboardStats(req.user!.userId, req.user!.role);
  successResponse(res, stats);
});

// GET /dashboard/analytics
router.get('/dashboard/analytics', requireRole('OWNER'), async (_req: AuthRequest, res) => {
  const analytics = await getDashboardAnalytics();
  successResponse(res, analytics);
});

// GET /dashboard/activity
router.get('/dashboard/activity', async (_req: AuthRequest, res) => {
  const activity = await getRecentActivity(10);
  successResponse(res, activity);
});

// GET /dashboard/renewals?month=2026-03
router.get('/dashboard/renewals', async (req, res) => {
  const month = req.query.month as string;
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    errorResponse(res, 'INVALID_INPUT', 'Invalid month format (YYYY-MM)', 400);
    return;
  }
  const [year, mon] = month.split('-').map(Number);
  const start = new Date(year, mon - 1, 1);
  const end = new Date(year, mon, 0, 23, 59, 59);

  const members = await prisma.member.findMany({
    where: {
      expiresAt: { gte: start, lte: end },
    },
    orderBy: { expiresAt: 'asc' },
    include: {
      company: true,
      user: { select: { id: true, email: true, firstName: true, lastName: true, role: true } },
    },
  });
  successResponse(res, members);
});

// GET /members
router.get('/members', validateQuery(paginationSchema), async (req, res) => {
  const { page, limit } = res.locals.query as { page: number; limit: number };

  const tier = req.query.tier as MemberTier | undefined;
  const statusParam = req.query.status as string | undefined;
  const certificateParam = req.query.certificate as string | undefined;

  const validStatuses = ['PENDING', 'ACTIVE', 'SUSPENDED', 'EXPIRED'];
  const validCerts = ['HAS_CERT', 'NO_CERT', 'HAS_ACADEMY'];

  const typeParam = req.query.type as string | undefined;
  const validTypes = ['WEB_TRADER', 'SERVICE_PROVIDER', 'PHYSICAL'];

  const expiringParam = req.query.expiring as string | undefined;
  const expiryMonthParam = req.query.expiryMonth as string | undefined;

  const companyIdParam = req.query.companyId as string | undefined;

  const filters: { tier?: MemberTier; type?: MemberType | MemberType[]; status?: MemberStatus | MemberStatus[]; certificate?: string | string[]; expiringDays?: number; expiryMonth?: string; companyId?: string; promoKonferencija?: boolean; promoMeetup?: boolean; promoMagazin?: boolean; promoWeb?: boolean; promoOstalo?: boolean; hasCertificate?: boolean; magazinDobrePrice?: boolean } = {};
  if (companyIdParam) filters.companyId = companyIdParam;
  if (tier && ['FREE', 'STANDARD', 'PREMIUM'].includes(tier)) filters.tier = tier;

  // Expiring soon filter: ?expiring=30 (days)
  if (expiringParam) {
    const days = parseInt(expiringParam, 10);
    if (!isNaN(days) && days > 0) filters.expiringDays = days;
  }

  // Expiry month filter: ?expiryMonth=2026-06 (members whose membership expires that month)
  if (expiryMonthParam && /^\d{4}-\d{2}$/.test(expiryMonthParam)) {
    filters.expiryMonth = expiryMonthParam;
  }

  // Support comma-separated type values: ?type=WEB_TRADER,PHYSICAL
  if (typeParam) {
    const types = typeParam.split(',').filter(t => validTypes.includes(t)) as MemberType[];
    if (types.length === 1) filters.type = types[0];
    else if (types.length > 1) filters.type = types;
  }

  // Support comma-separated status values: ?status=ACTIVE,EXPIRED
  if (statusParam) {
    const statuses = statusParam.split(',').filter(s => validStatuses.includes(s)) as MemberStatus[];
    if (statuses.length === 1) filters.status = statuses[0];
    else if (statuses.length > 1) filters.status = statuses;
  }

  // Support comma-separated certificate values: ?certificate=HAS_CERT,HAS_ACADEMY
  if (certificateParam) {
    const certs = certificateParam.split(',').filter(c => validCerts.includes(c));
    if (certs.length === 1) filters.certificate = certs[0];
    else if (certs.length > 1) filters.certificate = certs;
  }

  // Boolean promo/cert filters
  if (req.query.promoKonferencija === 'true') filters.promoKonferencija = true;
  if (req.query.promoMeetup === 'true') filters.promoMeetup = true;
  if (req.query.promoMagazin === 'true') filters.promoMagazin = true;
  if (req.query.promoWeb === 'true') filters.promoWeb = true;
  if (req.query.promoOstalo === 'true') filters.promoOstalo = true;
  if (req.query.hasCertificate === 'true') filters.hasCertificate = true;
  if (req.query.hasCertificate === 'false') filters.hasCertificate = false;
  if (req.query.magazinDobrePrice === 'true') filters.magazinDobrePrice = true;
  if (req.query.magazinDobrePrice === 'false') filters.magazinDobrePrice = false;

  const { members, total } = await getAllMembers(page, limit, filters);

  paginatedResponse(res, members, { page, limit, total });
});

// GET /members/counts — Quick counts for filter pills (per-type breakdown)
router.get('/members/counts', async (_req, res) => {
  // Aggregirano preko groupBy (8 round-tripova umjesto 35) — baza je u eu-central-1,
  // pa svaki upit nosi mrežnu latenciju; smanjenje broja upita = brže učitavanje.
  const [
    statusGroups, certGroups, academyGroups,
    promoKonfG, promoMeetG, promoMagG, promoWebG, promoOstG, magazinG,
  ] = await Promise.all([
    prisma.member.groupBy({ by: ['memberType', 'status'], _count: { _all: true } }),
    prisma.member.groupBy({ by: ['memberType'], where: { hasCertificate: true }, _count: { _all: true } }),
    prisma.member.groupBy({ by: ['memberType'], where: { hasAcademy: true }, _count: { _all: true } }),
    prisma.member.groupBy({ by: ['memberType'], where: { promoKonferencija: true }, _count: { _all: true } }),
    prisma.member.groupBy({ by: ['memberType'], where: { promoMeetup: true }, _count: { _all: true } }),
    prisma.member.groupBy({ by: ['memberType'], where: { promoMagazin: true }, _count: { _all: true } }),
    prisma.member.groupBy({ by: ['memberType'], where: { promoWeb: true }, _count: { _all: true } }),
    prisma.member.groupBy({ by: ['memberType'], where: { promoOstalo: { not: null } }, _count: { _all: true } }),
    prisma.member.groupBy({ by: ['memberType'], where: { magazinDobrePrice: true }, _count: { _all: true } }),
  ]);

  type TypeGroup = { memberType: MemberType; _count: { _all: number } };
  const byType = (groups: TypeGroup[], t: MemberType) =>
    groups.find((g) => g.memberType === t)?._count._all ?? 0;
  const sumAll = (groups: TypeGroup[]) =>
    groups.reduce((acc, g) => acc + g._count._all, 0);
  const statusOf = (t: MemberType, s: MemberStatus) =>
    statusGroups.find((g) => g.memberType === t && g.status === s)?._count._all ?? 0;
  const statusAll = (s: MemberStatus) =>
    statusGroups.filter((g) => g.status === s).reduce((acc, g) => acc + g._count._all, 0);
  const typeTotal = (t: MemberType) =>
    statusGroups.filter((g) => g.memberType === t).reduce((acc, g) => acc + g._count._all, 0);

  const total = statusGroups.reduce((acc, g) => acc + g._count._all, 0);
  const webTrader = typeTotal('WEB_TRADER');
  const serviceProvider = typeTotal('SERVICE_PROVIDER');
  const physical = typeTotal('PHYSICAL');
  const wtCertified = byType(certGroups, 'WEB_TRADER');
  const wtMagazinPublished = byType(magazinG, 'WEB_TRADER');

  successResponse(res, {
    total,
    allActive: statusAll('ACTIVE'),
    allExpired: statusAll('EXPIRED'),
    allSuspended: statusAll('SUSPENDED'),
    allCertified: sumAll(certGroups),
    allAcademy: sumAll(academyGroups),
    webTrader,
    wtActive: statusOf('WEB_TRADER', 'ACTIVE'),
    wtExpired: statusOf('WEB_TRADER', 'EXPIRED'),
    wtSuspended: statusOf('WEB_TRADER', 'SUSPENDED'),
    wtCertified,
    wtNoCert: webTrader - wtCertified,
    wtMagazinPublished,
    wtMagazinUnpublished: webTrader - wtMagazinPublished,
    wtAcademy: byType(academyGroups, 'WEB_TRADER'),
    wtPromoKonferencija: byType(promoKonfG, 'WEB_TRADER'),
    wtPromoMeetup: byType(promoMeetG, 'WEB_TRADER'),
    wtPromoMagazin: byType(promoMagG, 'WEB_TRADER'),
    wtPromoWeb: byType(promoWebG, 'WEB_TRADER'),
    wtPromoOstalo: byType(promoOstG, 'WEB_TRADER'),
    serviceProvider,
    spActive: statusOf('SERVICE_PROVIDER', 'ACTIVE'),
    spExpired: statusOf('SERVICE_PROVIDER', 'EXPIRED'),
    spSuspended: statusOf('SERVICE_PROVIDER', 'SUSPENDED'),
    spCertified: byType(certGroups, 'SERVICE_PROVIDER'),
    spAcademy: byType(academyGroups, 'SERVICE_PROVIDER'),
    spPromoKonferencija: byType(promoKonfG, 'SERVICE_PROVIDER'),
    spPromoMeetup: byType(promoMeetG, 'SERVICE_PROVIDER'),
    spPromoMagazin: byType(promoMagG, 'SERVICE_PROVIDER'),
    spPromoWeb: byType(promoWebG, 'SERVICE_PROVIDER'),
    spPromoOstalo: byType(promoOstG, 'SERVICE_PROVIDER'),
    physical,
    phActive: statusOf('PHYSICAL', 'ACTIVE'),
    phExpired: statusOf('PHYSICAL', 'EXPIRED'),
    phSuspended: statusOf('PHYSICAL', 'SUSPENDED'),
    phCertified: byType(certGroups, 'PHYSICAL'),
    phAcademy: byType(academyGroups, 'PHYSICAL'),
  });
});

// GET /members/search — Quick search for members
router.get('/members/search', async (req, res) => {
  const q = req.query.q as string;
  if (!q || q.trim().length < 2) {
    successResponse(res, []);
    return;
  }
  const results = await searchMembers(q);
  successResponse(res, results);
});

// POST /members — Create a new member (admin)
router.post('/members', requireRole('OWNER'), async (req: AuthRequest, res) => {
  try {
    const { email, firstName, lastName, companyName, oib, website, address, phone, memberType, memberTier, hasCertificate, hasAcademy, safeShopStatus } = req.body;

    if (!email || !firstName || !companyName || !memberType) {
      errorResponse(res, 'VALIDATION', 'Email, ime, firma i tip su obavezni', 400);
      return;
    }

    const existing = await prisma.user.findUnique({
      where: { email },
      include: { member: true },
    });
    if (existing && existing.member) {
      errorResponse(res, 'CONFLICT', 'Korisnik s tim emailom već postoji i ima aktivno članstvo', 409);
      return;
    }

    const passwordHash = await hashPassword('Member123!');
    const finalOib = oib && oib.trim() ? oib.trim() : String(Date.now()).slice(-11).padStart(11, '0');
    const tier = memberTier || 'FREE';
    const now = new Date();
    const expiresAt = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());

    const member = await prisma.$transaction(async (tx) => {
      // Reuse existing user (orphan without member) or create new
      const user = existing
        ? await tx.user.update({ where: { id: existing.id }, data: { firstName, lastName: lastName || '', role: 'MEMBER' } })
        : await tx.user.create({ data: { email, passwordHash, firstName, lastName: lastName || '', role: 'MEMBER' } });

      const company = await tx.company.create({
        data: { name: companyName, oib: finalOib, address: address || '', city: '', zip: '', website: website || null, phone: phone || null },
      });

      return tx.member.create({
        data: {
          userId: user.id,
          companyId: company.id,
          memberType,
          memberTier: tier,
          status: 'ACTIVE',
          joinedAt: now,
          expiresAt,
          ...(hasCertificate !== undefined && { hasCertificate: !!hasCertificate }),
          ...(hasAcademy !== undefined && { hasAcademy: !!hasAcademy }),
          ...(safeShopStatus !== undefined && { safeShopStatus: safeShopStatus || null }),
        },
        include: { user: true, company: true },
      });
    });

    // Emit activation event (triggers welcome email automation)
    await emitEvent('member.activated', { memberId: member.id, userId: member.userId });

    // Inbox: notify staff about the new member (await — serverless freeze nakon odgovora)
    try {
      await notifyStaff({
        type: 'INFO',
        title: 'Novi član',
        message: `${member.user.firstName} ${member.user.lastName}${member.company?.name ? ` (${member.company.name})` : ''} dodan/a kao član.`,
        actionUrl: `/members/${member.id}`,
      });
    } catch { /* ne ruši kreiranje člana */ }

    successResponse(res, member, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Greška pri kreiranju člana';
    errorResponse(res, 'ERROR', message, 500);
  }
});

// GET /members/export — Download all members as CSV
router.get('/members/export', async (_req: AuthRequest, res) => {
  const members = await prisma.member.findMany({
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
      company: true,
      payments: { select: { amount: true, status: true, paidAt: true }, orderBy: { paidAt: 'desc' } },
      memberNotes: { select: { id: true } },
      emailLogs: { select: { id: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const headers = [
    'Članski broj', 'Ime', 'Prezime', 'Email',
    'Firma', 'OIB', 'Adresa', 'Grad', 'Poštanski broj', 'Država', 'Web', 'Telefon',
    'Tip članstva', 'Razina', 'Status',
    'Datum učlanjenja', 'Datum isteka',
    'Ukupno plaćeno (EUR)', 'Broj plaćanja', 'Zadnje plaćanje',
    'Broj emailova', 'Broj bilješki',
  ];

  const typeLabels: Record<string, string> = { WEB_TRADER: 'Web trgovac', SERVICE_PROVIDER: 'Nuditelj usluga', PHYSICAL: 'Fizički član' };
  const tierLabels: Record<string, string> = { FREE: 'Besplatno', STANDARD: 'Standard', PREMIUM: 'Premium' };
  const statusLabels: Record<string, string> = { ACTIVE: 'Aktivan', PENDING: 'Izbrisani', EXPIRED: 'Istekao', SUSPENDED: 'Pauziran' };

  function esc(val: string | null | undefined) {
    if (!val) return '';
    const s = String(val).replace(/"/g, '""');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
  }

  function fmtDate(d: Date | string | null) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('hr-HR');
  }

  const rows = members.map((m) => {
    const completedPayments = m.payments.filter((p) => p.status === 'COMPLETED');
    const totalPaid = completedPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const lastPayment = completedPayments[0]?.paidAt;

    return [
      esc(m.memberNumber),
      esc(m.user.firstName),
      esc(m.user.lastName),
      esc(m.user.email),
      esc(m.company.name),
      esc(m.company.oib),
      esc(m.company.address),
      esc(m.company.city),
      esc(m.company.zip),
      esc(m.company.country),
      esc(m.company.website),
      esc(m.company.phone),
      esc(typeLabels[m.memberType] || m.memberType),
      esc(tierLabels[m.memberTier] || m.memberTier),
      esc(statusLabels[m.status] || m.status),
      fmtDate(m.joinedAt),
      fmtDate(m.expiresAt),
      totalPaid.toFixed(2),
      String(completedPayments.length),
      fmtDate(lastPayment),
      String(m.emailLogs.length),
      String(m.memberNotes.length),
    ].join(',');
  });

  const csv = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="clanovi-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(csv);
});

// GET /members/:id
router.get('/members/:id', validateParams(idParamSchema), async (req, res) => {
  const member = await prisma.member.findUnique({
    where: { id: req.params.id as string },
    include: {
      company: true,
      secondaryContact: true,
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      },
      payments: { orderBy: { createdAt: 'desc' }, take: 10 },
    },
  });

  if (!member) {
    errorResponse(res, 'NOT_FOUND', 'Member not found', 404);
    return;
  }

  successResponse(res, member);
});

// GET /members/:id/safeshop-analysis — latest Safe Shop certification analysis (or null)
router.get('/members/:id/safeshop-analysis', validateParams(idParamSchema), async (req, res) => {
  const analysis = await getLatestSafeShopAnalysis(req.params.id as string);
  successResponse(res, analysis);
});

// GET /members/:id/safeshop-analysis/quota — godišnji limit (used/remaining/limit)
router.get('/members/:id/safeshop-analysis/quota', validateParams(idParamSchema), async (req, res) => {
  successResponse(res, await getSafeShopAnalysisQuota(req.params.id as string));
});

// POST /members/:id/safeshop-analysis — run a fresh Safe Shop certification analysis (synchronous)
router.post('/members/:id/safeshop-analysis', validateParams(idParamSchema), async (req, res) => {
  const result = await requestSafeShopAnalysis(req.params.id as string);

  // Uspjeh je SafeShopAnalysis zapis (ima `id`); sentineli greške nemaju `id`.
  if (!('id' in result)) {
    switch (result.error) {
      case 'NO_WEBSITE':
        errorResponse(res, 'BAD_REQUEST', 'Član nema upisanu web adresu', 400);
        return;
      case 'IN_PROGRESS':
        errorResponse(res, 'CONFLICT', 'Analiza je već u tijeku', 409);
        return;
      case 'LIMIT_REACHED':
        errorResponse(res, 'LIMIT_REACHED', 'Iskorišten godišnji limit od 2 Safe Shop analize', 429);
        return;
      case 'ANALYSIS_FAILED':
        errorResponse(res, 'ANALYSIS_FAILED', 'Analiza nije uspjela, pokušajte ponovno kasnije', 502);
        return;
      default:
        errorResponse(res, 'NOT_FOUND', 'Član nije pronađen', 404);
        return;
    }
  }

  successResponse(res, result);
});

// PATCH /safeshop-analysis/:id — admin uređivanje analize (komentar, kriteriji, note, ✓/✗)
router.patch('/safeshop-analysis/:id', validateParams(idParamSchema), async (req, res) => {
  const updated = await updateSafeShopAnalysis(req.params.id as string, {
    summary: req.body?.summary,
    analyst: req.body?.analyst,
    checkpoints: req.body?.checkpoints,
  });
  if (!updated) {
    errorResponse(res, 'NOT_FOUND', 'Analiza nije pronađena', 404);
    return;
  }
  successResponse(res, updated);
});

// POST /members/:id/send-invite — Create/refresh member portal access and email a set-password link (OWNER)
router.post('/members/:id/send-invite', requireRole('OWNER'), validateParams(idParamSchema), async (req: AuthRequest, res) => {
  const member = await prisma.member.findUnique({
    where: { id: req.params.id as string },
    include: { user: true },
  });

  if (!member) {
    errorResponse(res, 'NOT_FOUND', 'Član nije pronađen', 404);
    return;
  }

  const user = member.user;

  // Ensure the login is enabled
  if (!user.isActive) {
    await prisma.user.update({ where: { id: user.id }, data: { isActive: true } });
  }

  // Create a set-password token (reuses the reset_ mechanism used by /api/auth/reset-password), 7-day TTL
  const token = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  await prisma.refreshToken.create({
    data: { token: `reset_${token}`, userId: user.id, expiresAt },
  });

  const baseUrl = process.env.MEMBER_APP_URL ?? 'https://members.ecommerce.hr';
  const link = `${baseUrl}/reset-password?token=${token}`;

  const html = `<!DOCTYPE html><html lang="hr"><body style="font-family:Helvetica,Arial,sans-serif;color:#1f2937;line-height:1.6;">
    <p>Poštovani ${user.firstName},</p>
    <p>Otvorili smo vam pristup članskom portalu Udruge eCommerce Hrvatska, gdje možete vidjeti podatke o svom članstvu, komunikaciju, obavijesti i ponude.</p>
    <p>Kliknite na gumb ispod da postavite svoju lozinku i prijavite se:</p>
    <p style="margin:24px 0;">
      <a href="${link}" style="background:#1B365D;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;display:inline-block;">Postavi lozinku</a>
    </p>
    <p style="font-size:13px;color:#6b7280;">Ako gumb ne radi, kopirajte ovaj link u preglednik:<br>${link}</p>
    <p style="font-size:13px;color:#6b7280;">Link vrijedi 7 dana. Prijava: <a href="${baseUrl}/">${baseUrl.replace(/^https?:\/\//, '')}</a></p>
    <p>Srdačan pozdrav,<br>Udruga eCommerce Hrvatska</p>
  </body></html>`;

  try {
    await sendEmail(user.email, 'Pristup članskom portalu — eCommerce Hrvatska', html, {
      templateName: 'member-invite',
      memberId: member.id,
    });
  } catch (err) {
    errorResponse(res, 'EMAIL_FAILED', 'Slanje emaila nije uspjelo', 500);
    return;
  }

  successResponse(res, { message: 'Pristupni podaci poslani', email: user.email });
});

// PATCH /members/:id/status — Change member status (activate, suspend, expire)
router.patch('/members/:id/status', validateParams(idParamSchema), async (req: AuthRequest, res) => {
  const { status } = req.body as { status: string };
  const validStatuses = ['ACTIVE', 'PENDING', 'SUSPENDED', 'EXPIRED'];
  if (!validStatuses.includes(status)) {
    errorResponse(res, 'VALIDATION_ERROR', `Status must be one of: ${validStatuses.join(', ')}`, 400);
    return;
  }

  try {
    const member = await updateMember(req.params.id as string, { status: status as 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'EXPIRED' });

    // Notify the member
    await createNotification({
      userId: member.userId,
      type: status === 'ACTIVE' ? 'INFO' : 'WARNING',
      title: status === 'ACTIVE' ? 'Članstvo aktivirano' : status === 'SUSPENDED' ? 'Članstvo suspendirano' : 'Promjena statusa članstva',
      message: status === 'ACTIVE'
        ? 'Vaše članstvo u eCommerce Hrvatska je aktivirano.'
        : status === 'SUSPENDED'
          ? 'Vaše članstvo je privremeno suspendirano. Kontaktirajte nas za više informacija.'
          : `Status vašeg članstva je promijenjen u: ${status}`,
    });

    // Emit event
    const eventMap: Record<string, string> = {
      ACTIVE: 'member.activated',
      SUSPENDED: 'member.suspended',
      EXPIRED: 'member.expired',
    };
    if (eventMap[status]) {
      await emitEvent(eventMap[status], { memberId: member.id, userId: member.userId });
    }

    successResponse(res, member);
  } catch {
    errorResponse(res, 'NOT_FOUND', 'Member not found', 404);
  }
});

// PATCH /members/:id/tier — Change member tier (optionally charge difference)
router.patch('/members/:id/tier', validateParams(idParamSchema), async (req: AuthRequest, res) => {
  const { tier, charge } = req.body as { tier: string; charge?: boolean };
  const validTiers = ['FREE', 'STANDARD', 'PREMIUM'];
  if (!validTiers.includes(tier)) {
    errorResponse(res, 'VALIDATION_ERROR', `Tier must be one of: ${validTiers.join(', ')}`, 400);
    return;
  }

  try {
    const { member, charged } = await updateMemberTier(req.params.id as string, tier as MemberTier, { charge });
    successResponse(res, { ...member, charged });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Member not found';
    const status = message.includes('nije dostupna') ? 400 : 404;
    errorResponse(res, status === 400 ? 'VALIDATION_ERROR' : 'NOT_FOUND', message, status);
  }
});

// PATCH /members/:id/certificates — Update certificate/academy/safeshop fields
router.patch('/members/:id/certificates', validateParams(idParamSchema), async (req: AuthRequest, res) => {
  const { hasCertificate, hasAcademy, safeShopStatus, magazinDobrePrice, promoKonferencija, promoMeetup, promoMagazin, promoWeb, promoOstalo } = req.body as {
    hasCertificate?: boolean;
    hasAcademy?: boolean;
    safeShopStatus?: string | null;
    magazinDobrePrice?: boolean;
    promoKonferencija?: boolean;
    promoMeetup?: boolean;
    promoMagazin?: boolean;
    promoWeb?: boolean;
    promoOstalo?: string | null;
  };

  try {
    const member = await updateMember(req.params.id as string, {
      ...(hasCertificate !== undefined && { hasCertificate }),
      ...(hasAcademy !== undefined && { hasAcademy }),
      ...(safeShopStatus !== undefined && { safeShopStatus }),
      ...(magazinDobrePrice !== undefined && { magazinDobrePrice }),
      ...(promoKonferencija !== undefined && { promoKonferencija }),
      ...(promoMeetup !== undefined && { promoMeetup }),
      ...(promoMagazin !== undefined && { promoMagazin }),
      ...(promoWeb !== undefined && { promoWeb }),
      ...(promoOstalo !== undefined && { promoOstalo }),
    });
    successResponse(res, member);
  } catch {
    errorResponse(res, 'NOT_FOUND', 'Member not found', 404);
  }
});

// PATCH /members/:id/profile — Admin edit of member profile (user, company, memberType)
router.patch('/members/:id/profile', validateParams(idParamSchema), async (req: AuthRequest, res) => {
  try {
    const {
      firstName, lastName, email, companyName, oib, address, city, postalCode, phone, website, memberType, joinedAt, expiresAt,
      // Osobni podaci kontakt osobe (član kao fizička osoba)
      dateOfBirth, personalOib, personalAddress, personalZip, personalCity, personalCountry, personalPhone, personalNote,
      // Druga kontakt osoba (objekt = upsert, null = ukloni, undefined = ne diraj)
      secondaryContact,
    } = req.body;
    const member = await adminUpdateMemberProfile(req.params.id as string, {
      firstName, lastName, email, companyName, oib, address, city, postalCode, phone, website, memberType,
      dateOfBirth, personalOib, personalAddress, personalZip, personalCity, personalCountry, personalPhone, personalNote,
      secondaryContact,
      ...(joinedAt && { joinedAt: new Date(joinedAt) }),
      ...(expiresAt && { expiresAt: new Date(expiresAt) }),
    });
    if (!member) {
      errorResponse(res, 'NOT_FOUND', 'Member not found', 404);
      return;
    }
    successResponse(res, member);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Greška pri ažuriranju profila';
    errorResponse(res, 'ERROR', message, 400);
  }
});

// POST /members/:id/renew — Renew membership for 1 year (OWNER only)
router.post('/members/:id/renew', requireRole('OWNER'), validateParams(idParamSchema), async (req: AuthRequest, res) => {
  const { amount, note } = req.body as { amount?: number; note?: string };

  try {
    const { member, newExpiresAt, amount: paidAmount } = await renewMembership(req.params.id as string, { amount, note });

    const formattedDate = newExpiresAt.toLocaleDateString('hr-HR');

    // Notify member
    await createNotification({
      userId: member.userId,
      type: 'INFO',
      title: 'Članstvo produženo',
      message: `Vaše članstvo je produženo do ${formattedDate}.`,
    });

    // Send renewal confirmation email
    const memberWithUser = member as typeof member & { user: { email: string; firstName: string } };
    const benefits = getMembershipBenefits(
      member.memberType as MemberType,
      member.memberTier as MemberTier,
    );
    const email = buildRenewalConfirmationEmail(
      { user: { firstName: memberWithUser.user.firstName } },
      paidAmount,
      newExpiresAt,
      benefits,
    );
    await sendEmail(memberWithUser.user.email, email.subject, email.html, { memberId: member.id, templateName: 'renewal_confirmation' });

    // Emit event
    await emitEvent('member.renewed', {
      memberId: member.id,
      userId: member.userId,
      newExpiresAt: newExpiresAt.toISOString(),
    });

    successResponse(res, member);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Member not found';
    const status = message.includes('Besplatni') ? 400 : 404;
    errorResponse(res, status === 400 ? 'VALIDATION_ERROR' : 'NOT_FOUND', message, status);
  }
});

// DELETE /members/:id — Permanently delete member (OWNER only)
router.delete('/members/:id', requireRole('OWNER'), validateParams(idParamSchema), async (req: AuthRequest, res) => {
  try {
    await deleteMember(req.params.id as string);
    successResponse(res, { message: 'Član obrisan' });
  } catch {
    errorResponse(res, 'NOT_FOUND', 'Member not found', 404);
  }
});

// POST /members/:id/reminder — Send tier-aware renewal reminder
router.post('/members/:id/reminder', validateParams(idParamSchema), async (req: AuthRequest, res) => {
  const member = await prisma.member.findUnique({
    where: { id: req.params.id as string },
    include: { user: { select: { id: true, email: true, firstName: true } }, company: true },
  });

  if (!member) {
    errorResponse(res, 'NOT_FOUND', 'Member not found', 404);
    return;
  }

  // Cooldown check
  const templateName = member.memberTier === 'FREE' ? 'free_upgrade' : 'renewal_reminder';
  const lastSent = await checkEmailCooldown(member.id, templateName);
  if (lastSent) {
    const daysAgo = Math.floor((Date.now() - lastSent.getTime()) / (1000 * 60 * 60 * 24));
    errorResponse(res, 'COOLDOWN', `Podsjetnik je već poslan prije ${daysAgo} ${daysAgo === 1 ? 'dan' : 'dana'}. Pričekajte 7 dana između slanja.`, 429);
    return;
  }

  const memberType = member.memberType as MemberType;
  const memberTier = member.memberTier as MemberTier;

  // Create in-app notification
  await createNotification({
    userId: member.user.id,
    type: 'REMINDER',
    title: memberTier === 'FREE' ? 'Nadogradite članstvo' : 'Podsjetnik za obnovu članstva',
    message: memberTier === 'FREE'
      ? `Poštovani ${member.user.firstName}, nadogradite svoje besplatno članstvo kako biste dobili pristup svim pogodnostima.`
      : `Poštovani ${member.user.firstName}, vaše članstvo ističe${member.expiresAt ? ' ' + new Date(member.expiresAt).toLocaleDateString('hr-HR') : ''}. Molimo obnovite članstvo kako biste zadržali sve pogodnosti.`,
    actionUrl: '/membership/renew',
  });

  // Build tier-aware email
  if (memberTier === 'FREE') {
    // FREE → no renewal, offer upgrade to Standard/Premium
    const standardPrice = getMembershipPrice(memberType, 'STANDARD') ?? 0;
    const standardBenefits = getMembershipBenefits(memberType, 'STANDARD');
    const premiumPrice = getMembershipPrice(memberType, 'PREMIUM');
    const premiumBenefits = isTierAvailable(memberType, 'PREMIUM')
      ? getMembershipBenefits(memberType, 'PREMIUM')
      : undefined;
    const email = buildFreeUpgradeEmail(
      { user: { firstName: member.user.firstName } },
      standardPrice,
      standardBenefits,
      premiumPrice,
      premiumBenefits,
      member.id,
    );
    await sendEmail(member.user.email, email.subject, email.html, { memberId: member.id, templateName: 'free_upgrade' });
  } else {
    // STANDARD or PREMIUM → renewal reminder with price
    const tierPrice = getMembershipPrice(memberType, memberTier) ?? 0;
    const expiresFormatted = member.expiresAt
      ? new Date(member.expiresAt).toLocaleDateString('hr-HR')
      : 'uskoro';
    const fmtPrice = new Intl.NumberFormat('hr-HR', { style: 'currency', currency: 'EUR' }).format(tierPrice);

    const reminderHtml = `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;">
  <div style="background:#1B365D;padding:20px 24px;text-align:center;">
    <img src="https://members.ecommerce.hr/admin/logo.png" alt="eCommerce Hrvatska" style="height:44px;" />
  </div>
  <div style="padding:24px;">
    <p>Poštovani <strong>${member.user.firstName}</strong>,</p>
    <p>Obavještavamo Vas da Vaše članstvo u udruzi eCommerce Hrvatska ističe <strong style="color:#D97706;">${expiresFormatted}</strong>.</p>
    <div style="background:#F0F9FF;border-left:4px solid #1B365D;padding:16px;border-radius:4px;margin:20px 0;">
      <p style="margin:0 0 8px;font-weight:bold;color:#1B365D;">Detalji članarine</p>
      <p style="margin:4px 0;">Članarina: <strong>${fmtPrice}/god</strong></p>
      <p style="margin:4px 0;">Datum isteka: <strong>${expiresFormatted}</strong></p>
    </div>
    <p>Za sva pitanja kontaktirajte nas na <a href="mailto:udruga@ecommerce.hr" style="color:#E8A838;">udruga@ecommerce.hr</a> ili +385 99 2025707.</p>
    <p>Srdačan pozdrav,<br/><strong>Tim eCommerce Hrvatska</strong></p>
  </div>
  <div style="background:#1B365D;padding:20px 24px;text-align:center;">
    <p style="margin:0 0 6px;color:#E8A838;font-size:12px;font-weight:bold;">eCommerce Hrvatska</p>
    <p style="margin:0;color:rgba(255,255,255,0.6);font-size:11px;">Republike Austrije 9, Zagreb · udruga@ecommerce.hr · +385 99 2025707</p>
  </div>
</body></html>`;
    await sendEmail(member.user.email, 'Podsjetnik za obnovu članstva — eCommerce Hrvatska', reminderHtml, { memberId: member.id, templateName: 'renewal_reminder' });
  }

  // Emit event for sequence automation
  await emitEvent('member.renewal_reminder', {
    memberId: member.id,
    userId: member.user.id,
    email: member.user.email,
    firstName: member.user.firstName,
    expiresAt: member.expiresAt,
    memberTier: memberTier,
  });

  successResponse(res, { message: 'Podsjetnik poslan' });
});

// POST /members/:id/notify — Send custom notification
router.post('/members/:id/notify', validateParams(idParamSchema), async (req: AuthRequest, res) => {
  const { title, message, type } = req.body as { title: string; message: string; type?: string };

  if (!title || !message) {
    errorResponse(res, 'VALIDATION_ERROR', 'Title and message are required', 400);
    return;
  }

  const member = await prisma.member.findUnique({
    where: { id: req.params.id as string },
    include: { user: { select: { id: true, email: true, firstName: true } } },
  });

  if (!member) {
    errorResponse(res, 'NOT_FOUND', 'Member not found', 404);
    return;
  }

  const notification = await createNotification({
    userId: member.user.id,
    type: (type as 'INFO' | 'WARNING' | 'ACTION' | 'REMINDER') || 'INFO',
    title,
    message,
  });

  // Send email
  const bgColor = type === 'WARNING' ? '#FEF3C7' : '#F0F9FF';
  const accentColor = type === 'WARNING' ? '#D97706' : '#1B365D';
  await sendEmail(
    member.user.email,
    `${title} — eCommerce Hrvatska`,
    `<!DOCTYPE html>
    <html><body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;">
      <div style="background:#1B365D;padding:20px 24px;text-align:center;">
        <img src="https://members.ecommerce.hr/admin/logo.png" alt="eCommerce Hrvatska" style="height:44px;" />
      </div>
      <div style="padding:24px;">
        <div style="background:${bgColor};border-left:4px solid ${accentColor};padding:16px;border-radius:4px;margin-bottom:20px;">
          <strong style="color:${accentColor};">${title}</strong>
        </div>
        <p>Poštovani <strong>${member.user.firstName}</strong>,</p>
        <p>${message}</p>
        <div style="text-align:center;margin:32px 0;">
          <a href="https://ecommerce-hr-os.vercel.app/dashboard" style="background:#E8A838;color:#1B365D;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;">Otvori Dashboard</a>
        </div>
        <p>Srdačan pozdrav,<br/><strong>Tim eCommerce Hrvatska</strong></p>
      </div>
      <div style="background:#1B365D;padding:20px 24px;text-align:center;">
        <p style="margin:0 0 6px;color:#E8A838;font-size:12px;font-weight:bold;">eCommerce Hrvatska</p>
        <p style="margin:0;color:rgba(255,255,255,0.6);font-size:11px;">Republike Austrije 9, Zagreb · udruga@ecommerce.hr · +385 99 2025707</p>
      </div>
    </body></html>`,
    { memberId: member.id, templateName: 'custom_notification' },
  );

  successResponse(res, notification);
});

// GET /members/:id/last-reminder — Get last reminder/offer email info for cooldown UI
router.get('/members/:id/last-reminder', validateParams(idParamSchema), async (req: AuthRequest, res) => {
  const memberId = req.params.id as string;
  const cooldownTemplates = [
    'renewal_reminder', 'renewal_urgent', 'renewal_final',
    'offer_step_1', 'offer_step_2',
  ];

  const lastEmail = await prisma.emailLog.findFirst({
    where: {
      memberId,
      templateName: { in: cooldownTemplates },
    },
    orderBy: { sentAt: 'desc' },
    select: { sentAt: true, templateName: true, subject: true },
  });

  if (!lastEmail) {
    successResponse(res, { lastSent: null, daysAgo: null, cooldownActive: false });
    return;
  }

  const daysAgo = Math.floor((Date.now() - lastEmail.sentAt.getTime()) / (1000 * 60 * 60 * 24));
  successResponse(res, {
    lastSent: lastEmail.sentAt.toISOString(),
    templateName: lastEmail.templateName,
    subject: lastEmail.subject,
    daysAgo,
    cooldownActive: daysAgo < 7,
  });
});

// ─── Member Notes ─────────────────────────────────────────────────────────────

// GET /members/:id/notes — Get all notes for a member
router.get('/members/:id/notes', validateParams(idParamSchema), async (req: AuthRequest, res) => {
  const notes = await prisma.memberNote.findMany({
    where: { memberId: req.params.id as string },
    include: {
      author: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  successResponse(res, notes);
});

// POST /members/:id/notes — Add a note to a member
router.post('/members/:id/notes', validateParams(idParamSchema), async (req: AuthRequest, res) => {
  const { content } = req.body as { content: string };
  if (!content?.trim()) {
    errorResponse(res, 'VALIDATION_ERROR', 'Sadržaj bilješke je obavezan', 400);
    return;
  }

  const member = await prisma.member.findUnique({
    where: { id: req.params.id as string },
    select: { id: true, user: { select: { email: true, firstName: true, lastName: true } } },
  });
  if (!member) {
    errorResponse(res, 'NOT_FOUND', 'Member not found', 404);
    return;
  }

  const note = await prisma.memberNote.create({
    data: {
      memberId: req.params.id as string,
      authorId: req.user!.userId,
      content: content.trim(),
    },
    include: {
      author: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  // Fire-and-forget: notify udruga@ecommerce.hr about the new note
  const memberEmail = member.user.email;
  const authorName = `${note.author.firstName} ${note.author.lastName}`.trim();
  sendEmail(
    'udruga@ecommerce.hr',
    `Dodana bilješka na ${memberEmail}`,
    `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;">
  <div style="background:#1B365D;padding:20px 24px;text-align:center;">
    <img src="https://members.ecommerce.hr/admin/logo.png" alt="eCommerce Hrvatska" style="height:44px;" />
  </div>
  <div style="padding:24px;">
    <p><strong>${authorName}</strong> je dodao/la bilješku na profil člana <strong>${member.user.firstName} ${member.user.lastName}</strong> (${memberEmail}):</p>
    <div style="background:#F9FAFB;border-left:4px solid #1B365D;padding:16px;border-radius:4px;margin:20px 0;">
      <p style="margin:0;white-space:pre-wrap;">${content.trim()}</p>
    </div>
    <p style="font-size:13px;color:#6B7280;">
      <a href="https://ecommerce-hr-os.vercel.app/members/${req.params.id}" style="color:#E8A838;">Otvori profil člana</a>
    </p>
  </div>
</body></html>`,
    {},
  ).catch(() => {}); // fire-and-forget — don't block note creation

  // Inbox: notify staff about the new note (uključujući autora — u praksi je često jedini admin).
  // MORA biti await: na serverlessu se fire-and-forget posao prekida kad funkcija pošalje odgovor.
  try {
    await notifyStaff({
      type: 'INFO',
      title: 'Nova bilješka za člana',
      message: `${authorName}: bilješka na ${member.user.firstName} ${member.user.lastName} — ${content.trim().slice(0, 120)}`,
      actionUrl: `/members/${req.params.id}`,
    });
  } catch { /* ne ruši kreiranje bilješke */ }

  successResponse(res, note);
});

// DELETE /members/:id/notes/:noteId — Delete a note
router.delete('/members/:id/notes/:noteId', validateParams(idParamSchema), async (req: AuthRequest, res) => {
  const noteId = req.params.noteId as string;
  const note = await prisma.memberNote.findUnique({ where: { id: noteId }, select: { id: true } });
  if (!note) {
    errorResponse(res, 'NOT_FOUND', 'Bilješka nije pronađena', 404);
    return;
  }

  await prisma.memberNote.delete({ where: { id: noteId } });
  successResponse(res, { message: 'Bilješka obrisana' });
});

// ─── Email History ────────────────────────────────────────────────────────────

// GET /members/:id/emails — Get email history for a member
router.get('/members/:id/emails', validateParams(idParamSchema), async (req: AuthRequest, res) => {
  const member = await prisma.member.findUnique({
    where: { id: req.params.id as string },
    select: { user: { select: { email: true } } },
  });

  if (!member) {
    errorResponse(res, 'NOT_FOUND', 'Member not found', 404);
    return;
  }

  // Get emails by memberId OR by email address (for older logs without memberId)
  const emails = await prisma.emailLog.findMany({
    where: {
      OR: [
        { memberId: req.params.id as string },
        { to: member.user.email },
      ],
    },
    orderBy: { sentAt: 'desc' },
    take: 20,
  });

  successResponse(res, emails);
});

// ─── Offers / Predračuni ──────────────────────────────────────────────────────

import {
  createOffer,
  getOffers,
  getOfferPDF,
  getMemberOffers,
  getMemberLastStep,
  updateOfferStatusByMember,
} from '../services/offer.service.js';

// POST /members/:id/send-offer — Send structured offer (1st or 2nd notice) with PDF predračun
router.post('/members/:id/send-offer', validateParams(idParamSchema), async (req: AuthRequest, res) => {
  try {
    const memberId = req.params.id as string;
    const lastStep = await getMemberLastStep(memberId);
    const nextStep = lastStep < 2 ? lastStep + 1 : 2;

    const { offer, pdfBuffer } = await createOffer(memberId, nextStep);

    const member = offer.member;
    const memberTier = member.memberTier as MemberTier;
    const memberType = member.memberType as MemberType;
    const expiresFormatted = member.expiresAt
      ? new Date(member.expiresAt).toLocaleDateString('hr-HR')
      : 'uskoro';

    // Create notification
    await createNotification({
      userId: member.user.id,
      type: nextStep === 1 ? 'REMINDER' : 'WARNING',
      title: nextStep === 1 ? 'Podsjetnik za obnovu članstva' : 'Hitno: Obnovite članstvo',
      message: nextStep === 1
        ? `Vaše članstvo ističe ${expiresFormatted}. Predračun br. ${offer.offerNumber} je poslan na Vaš email.`
        : `Još uvijek niste obnovili članstvo koje ističe ${expiresFormatted}. Predračun br. ${offer.offerNumber} poslan.`,
      actionUrl: '/membership/renew',
    });

    // Build email content
    const tierPrice = getMembershipPrice(memberType, memberTier) ?? 0;
    const benefits = getMembershipBenefits(memberType, memberTier);

    const isFirstNotice = nextStep === 1;
    const subject = isFirstNotice
      ? `Predračun za članarinu — eCommerce Hrvatska (${offer.offerNumber})`
      : `Podsjetnik: Predračun za članarinu — eCommerce Hrvatska (${offer.offerNumber})`;

    const formatCurrency = (n: number) =>
      new Intl.NumberFormat('hr-HR', { style: 'currency', currency: 'EUR' }).format(n);

    const benefitsHtml = benefits.length > 0
      ? `<ul style="margin:12px 0;padding-left:20px;">${benefits.map(b => `<li style="margin:4px 0;font-size:14px;">${b}</li>`).join('')}</ul>`
      : '';

    const urgencyBlock = !isFirstNotice
      ? `<div style="background:#FEF2F2;border-left:4px solid #DC2626;padding:16px;border-radius:4px;margin:20px 0;">
          <p style="margin:0;font-weight:bold;color:#DC2626;">Još uvijek niste obnovili članstvo!</p>
          <p style="margin:4px 0 0;font-size:13px;color:#991B1B;">Ovo je druga obavijest. Predračun je priložen u ovom emailu.</p>
        </div>`
      : '';

    const html = `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;">
  <div style="background:#1B365D;padding:20px 24px;text-align:center;">
    <img src="https://members.ecommerce.hr/admin/logo.png" alt="eCommerce Hrvatska" style="height:44px;" />
  </div>
  <div style="padding:24px;">
    <p>Poštovani <strong>${member.user.firstName}</strong>,</p>
    ${isFirstNotice
      ? `<p>Obavještavamo Vas da Vaše članstvo u udruzi eCommerce Hrvatska ističe <strong style="color:#D97706;">${expiresFormatted}</strong>.</p>`
      : `<p>Ovo je drugi podsjetnik za obnovu Vašeg članstva u udruzi eCommerce Hrvatska.</p>`
    }
    ${urgencyBlock}
    <div style="background:#F0F9FF;border-left:4px solid #1B365D;padding:16px;border-radius:4px;margin:20px 0;">
      <p style="margin:0 0 8px;font-weight:bold;color:#1B365D;">Predračun br. ${offer.offerNumber}</p>
      <p style="margin:4px 0;">Članarina: <strong>${formatCurrency(tierPrice)}/god</strong></p>
      <p style="margin:4px 0;">Datum isteka: <strong>${expiresFormatted}</strong></p>
    </div>
    <p style="font-size:14px;color:#6B7280;">Predračun u PDF formatu je priložen ovom emailu. Možete ga koristiti za plaćanje putem internet bankarstva ili skeniranjem HUB-3 barkoda u predračunu.</p>
    <p>Za sva pitanja kontaktirajte nas na <a href="mailto:udruga@ecommerce.hr" style="color:#E8A838;">udruga@ecommerce.hr</a> ili +385 99 2025707.</p>
    <p>Srdačan pozdrav,<br/><strong>Tim eCommerce Hrvatska</strong></p>
  </div>
  <div style="background:#1B365D;padding:20px 24px;text-align:center;">
    <p style="margin:0 0 6px;color:#E8A838;font-size:12px;font-weight:bold;">eCommerce Hrvatska</p>
    <p style="margin:0;color:rgba(255,255,255,0.6);font-size:11px;">Republike Austrije 9, Zagreb · udruga@ecommerce.hr · +385 99 2025707</p>
  </div>
</body></html>`;

    // Send email with PDF attachment
    await sendEmail(member.user.email, subject, html, {
      memberId: member.id,
      templateName: `offer_step_${nextStep}`,
      attachments: [
        {
          filename: `Predracun-${offer.offerNumber}.pdf`,
          content: pdfBuffer.toString('base64'),
          contentType: 'application/pdf',
          encoding: 'base64',
        },
      ],
    });

    // Emit event
    await emitEvent('member.offer_sent', {
      memberId: member.id,
      userId: member.user.id,
      offerNumber: offer.offerNumber,
      step: nextStep,
    });

    successResponse(res, {
      message: `${nextStep}. obavijest s predračunom poslana`,
      offer: { id: offer.id, offerNumber: offer.offerNumber, step: nextStep, amount: offer.amount },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Greška pri slanju ponude';
    errorResponse(res, 'ERROR', message, 400);
  }
});

// GET /members/:id/offers — Get offers for a specific member
router.get('/members/:id/offers', validateParams(idParamSchema), async (req: AuthRequest, res) => {
  const offers = await getMemberOffers(req.params.id as string);
  successResponse(res, offers);
});

// GET /members/:id/offer-step — Get current step for member
router.get('/members/:id/offer-step', validateParams(idParamSchema), async (req: AuthRequest, res) => {
  const step = await getMemberLastStep(req.params.id as string);
  successResponse(res, { step });
});

// GET /offers — List all offers (for Ponude page)
router.get('/offers', async (req: AuthRequest, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const status = req.query.status as string | undefined;
  const search = req.query.search as string | undefined;

  const result = await getOffers(page, limit, status, search);
  paginatedResponse(res, result.offers, {
    page: result.page,
    limit,
    total: result.total,
    totalPages: result.totalPages,
  });
});

// GET /offers/:id/pdf — Download offer PDF
router.get('/offers/:id/pdf', async (req: AuthRequest, res) => {
  const pdf = await getOfferPDF(req.params.id as string);
  if (!pdf) {
    errorResponse(res, 'NOT_FOUND', 'PDF nije pronađen', 404);
    return;
  }
  // Return base64 JSON to avoid API Gateway binary corruption
  successResponse(res, { base64: Buffer.from(pdf).toString('base64') });
});

// POST /renewal-check — Check expiring memberships and emit events
router.post('/renewal-check', requireRole('OWNER'), async (_req: AuthRequest, res) => {
  try {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Find ACTIVE members expiring within 30 days
    const expiringMembers = await prisma.member.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: {
          gt: now,
          lte: thirtyDaysFromNow,
        },
      },
      include: {
        user: { select: { id: true, email: true, firstName: true } },
      },
    });

    // Emit expiry_reminder for each
    let processed = 0;
    for (const member of expiringMembers) {
      const daysUntilExpiry = Math.ceil(
        (new Date(member.expiresAt!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      await emitEvent('member.expiry_reminder', {
        memberId: member.id,
        userId: member.user.id,
        email: member.user.email,
        firstName: member.user.firstName,
        daysUntilExpiry,
        expiresAt: member.expiresAt!.toISOString(),
        memberTier: member.memberTier,
      });
      processed++;
    }

    // Mark expired members
    const expiredResult = await prisma.member.updateMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { lt: now },
      },
      data: { status: 'EXPIRED' },
    });

    // Emit expired event for each newly expired member
    if (expiredResult.count > 0) {
      const newlyExpired = await prisma.member.findMany({
        where: {
          status: 'EXPIRED',
          expiresAt: { lt: now },
          updatedAt: { gte: new Date(now.getTime() - 5000) },
        },
        select: { id: true, userId: true },
      });
      for (const m of newlyExpired) {
        await emitEvent('member.expired', { memberId: m.id, userId: m.userId });
      }
    }

    successResponse(res, { processed, expired: expiredResult.count });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Greška pri provjeri obnova';
    errorResponse(res, 'ERROR', message, 500);
  }
});

// GET /members/:id/ai-summary — AI member summary
router.get('/members/:id/ai-summary', validateParams(idParamSchema), async (req, res) => {
  try {
    const id = req.params.id as string;

    const member = await prisma.member.findUnique({
      where: { id },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        company: { select: { name: true } },
        payments: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });

    if (!member) {
      errorResponse(res, 'NOT_FOUND', 'Član nije pronađen', 404);
      return;
    }

    const [emails, notes, offers] = await Promise.all([
      prisma.emailLog.findMany({ where: { memberId: id }, orderBy: { sentAt: 'desc' }, take: 20, select: { subject: true, sentAt: true, openedAt: true, clickedAt: true } }),
      prisma.memberNote.findMany({ where: { memberId: id }, orderBy: { createdAt: 'desc' }, take: 10, select: { content: true, createdAt: true } }),
      prisma.offer.findMany({ where: { memberId: id }, orderBy: { createdAt: 'desc' }, take: 10, select: { status: true, step: true, createdAt: true } }),
    ]);

    const tierLabels: Record<string, string> = { FREE: 'Besplatno', STANDARD: 'Standard', PREMIUM: 'Premium' };
    const typeLabels: Record<string, string> = { WEB_TRADER: 'Web trgovac', SERVICE_PROVIDER: 'Nuditelj usluga', PHYSICAL: 'Fizički član' };
    const statusLabels: Record<string, string> = { ACTIVE: 'Aktivan', EXPIRED: 'Istekao', PENDING: 'Na čekanju', SUSPENDED: 'Pauziran' };

    const now = new Date();
    const expiresIn = member.expiresAt
      ? Math.ceil((new Date(member.expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    const emailStats = { total: emails.length, opened: emails.filter(e => e.openedAt).length, clicked: emails.filter(e => e.clickedAt).length };
    const offerStats = { total: offers.length, accepted: offers.filter(o => o.status === 'ACCEPTED').length, declined: offers.filter(o => o.status === 'DECLINED').length };

    const systemPrompt = `Ti si AI asistent za eCommerce Hrvatska udrugu. Napiši kratak sažetak o članu udruge na temelju podataka. Piši na hrvatskom jeziku, 3-5 rečenica maksimalno. Naglasi najvažnije: koliko dugo je član, plaća li redovito, otvara li mailove, ističe li uskoro. Na kraju daj kratku preporuku. Ne koristi emoji.`;

    const userMessage = `Podaci o članu:
- Ime: ${member.user.firstName} ${member.user.lastName}
- Firma: ${member.company.name}
- Tip: ${typeLabels[member.memberType] || member.memberType}
- Razina: ${tierLabels[member.memberTier] || member.memberTier}
- Status: ${statusLabels[member.status] || member.status}
- Učlanjen: ${member.joinedAt || 'nepoznato'}
- Ističe: ${member.expiresAt || 'nema'} (${expiresIn !== null ? (expiresIn > 0 ? `za ${expiresIn} dana` : `isteklo prije ${Math.abs(expiresIn)} dana`) : 'nema datuma'})
- Safe Shop certifikat: ${member.hasCertificate ? 'Da' : 'Ne'}
- Safe Shop branding: ${member.safeShopStatus || 'nema'}
- Akademija: ${member.hasAcademy ? 'Završena' : 'Ne'}
- Plaćanja: ${member.payments.length} ukupno
- Emailovi: ${emailStats.total} poslano, ${emailStats.opened} otvoreno, ${emailStats.clicked} kliknuto
- Ponude: ${offerStats.total} ukupno, ${offerStats.accepted} prihvaćeno, ${offerStats.declined} odbijeno
- Bilješke: ${notes.length > 0 ? notes.map(n => `"${n.content}"`).join('; ') : 'nema'}

Napiši sažetak:`;

    if (!process.env.ANTHROPIC_API_KEY) { errorResponse(res, 'CONFIG_ERROR', 'ANTHROPIC_API_KEY nije postavljen', 500); return; }

    // Poziv ide preko službenog Anthropic SDK-a (packages/ai → ask()), model claude-opus-4-8.
    const summary = await ask(systemPrompt, userMessage, { maxTokens: 500 });

    successResponse(res, { summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI sažetak nije dostupan';
    errorResponse(res, 'AI_ERROR', message, 500);
  }
});

export default router;
