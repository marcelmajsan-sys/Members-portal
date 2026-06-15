import { Router } from 'express';
import { prisma } from '@ecommerce-hr/db';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { successResponse, errorResponse } from '../utils/api-response.js';
import { logger } from '../utils/logger.js';
import { DEFAULT_TEMPLATES } from '../utils/resolve-template.js';

const router = Router();

router.use(authenticate);
router.use(requireRole('OWNER'));

// GET / — list all templates (DB + defaults merged)
router.get('/', async (_req, res) => {
  let dbTemplates: Array<{
    id: string; slug: string; name: string; subject: string; body: string;
    ctaLabel: string | null; ctaUrl: string | null; isActive: boolean;
    createdAt: Date; updatedAt: Date;
  }> = [];

  try {
    dbTemplates = await prisma.emailTemplate.findMany({
      orderBy: { createdAt: 'asc' },
    });
  } catch (err) {
    logger.warn({ error: err instanceof Error ? err.message : String(err) }, 'Could not fetch email templates from DB — showing defaults only');
  }

  // Merge: DB templates override defaults by slug
  const dbSlugs = new Set(dbTemplates.map((t) => t.slug));
  const defaults = DEFAULT_TEMPLATES
    .filter((d) => !dbSlugs.has(d.slug))
    .map((d) => ({
      id: null as string | null,
      slug: d.slug,
      name: d.name,
      subject: d.subject,
      body: d.body,
      ctaLabel: d.ctaLabel || null,
      ctaUrl: d.ctaUrl || null,
      isActive: true,
      isDefault: true,
      createdAt: null as string | null,
      updatedAt: null as string | null,
    }));

  const merged = [
    ...dbTemplates.map((t) => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      subject: t.subject,
      body: t.body,
      ctaLabel: t.ctaLabel,
      ctaUrl: t.ctaUrl,
      isActive: t.isActive,
      isDefault: false,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })),
    ...defaults,
  ];

  successResponse(res, merged);
});

// PUT /:slug — upsert a template
router.put('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { name, subject, body, ctaLabel, ctaUrl, isActive } = req.body;

    if (!subject || body === undefined) {
      errorResponse(res, 'VALIDATION_ERROR', 'Subject i body su obavezni', 400);
      return;
    }

    const template = await prisma.emailTemplate.upsert({
      where: { slug },
      create: {
        slug,
        name: name || slug,
        subject,
        body,
        ctaLabel: ctaLabel || null,
        ctaUrl: ctaUrl || null,
        isActive: isActive !== false,
      },
      update: {
        name: name || undefined,
        subject,
        body,
        ctaLabel: ctaLabel || null,
        ctaUrl: ctaUrl || null,
        isActive: isActive !== false,
      },
    });

    successResponse(res, template);
  } catch {
    errorResponse(res, 'SAVE_FAILED', 'Greška pri spremanju predloška', 500);
  }
});

// DELETE /:slug — remove DB override, revert to default
router.delete('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    await prisma.emailTemplate.delete({ where: { slug } }).catch(() => {});
    successResponse(res, { slug, reverted: true });
  } catch {
    errorResponse(res, 'DELETE_FAILED', 'Greška pri brisanju predloška', 500);
  }
});

export default router;
