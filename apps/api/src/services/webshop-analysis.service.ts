import { prisma } from '@ecommerce-hr/db';
import { runWebshopAnalysis } from '@ecommerce-hr/ai';
import { logger } from '../utils/logger.js';

type RequestError = {
  error: 'NOT_FOUND' | 'INACTIVE' | 'NO_WEBSITE' | 'IN_PROGRESS' | 'ANALYSIS_FAILED';
};

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

// Dohvat HTML-a naslovnice (best-effort). Greška/timeout → prazan string (fallback na URL-only analizu).
async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; eCommerceHR-Analiza/1.0; +https://www.ecommerce.hr)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!res.ok) return '';
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('html')) return '';
    return await res.text();
  } catch (error) {
    logger.warn({ error: String(error), url }, 'Webshop analysis: HTML fetch failed');
    return '';
  } finally {
    clearTimeout(timeout);
  }
}

export async function getLatestWebshopAnalysis(userId: string) {
  const member = await prisma.member.findUnique({ where: { userId }, select: { id: true } });
  if (!member) return null;
  return prisma.webshopAnalysis.findFirst({
    where: { memberId: member.id },
    orderBy: { createdAt: 'desc' },
  });
}

export async function requestWebshopAnalysis(userId: string) {
  const member = await prisma.member.findUnique({
    where: { userId },
    include: { company: true },
  });

  if (!member) return { error: 'NOT_FOUND' } as RequestError;
  if (member.status !== 'ACTIVE') return { error: 'INACTIVE' } as RequestError;

  const website = member.company?.website?.trim();
  if (!website) return { error: 'NO_WEBSITE' } as RequestError;

  // Spriječi paralelno dvostruko pokretanje — ali samo za stvarno tekući zahtjev.
  // Zaglavljeni PENDING (prekinuta veza, timeout) stariji od 3 min smatramo napuštenim
  // i označavamo FAILED kako član ne bi ostao trajno zaključan.
  const pending = await prisma.webshopAnalysis.findFirst({
    where: { memberId: member.id, status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
  });
  if (pending) {
    const ageMs = Date.now() - pending.createdAt.getTime();
    if (ageMs < 3 * 60 * 1000) return { error: 'IN_PROGRESS' } as RequestError;
    await prisma.webshopAnalysis.update({
      where: { id: pending.id },
      data: { status: 'FAILED', error: 'Napušteno (prekoračeno vrijeme)' },
    });
  }

  const websiteUrl = normalizeUrl(website);

  const record = await prisma.webshopAnalysis.create({
    data: { memberId: member.id, websiteUrl, status: 'PENDING' },
  });

  try {
    const html = await fetchHtml(websiteUrl);
    const result = await runWebshopAnalysis(websiteUrl, member.company?.name ?? '', html);

    return prisma.webshopAnalysis.update({
      where: { id: record.id },
      data: {
        status: 'COMPLETED',
        overallScore: Math.round(result.overallScore),
        summary: result.summary,
        result: JSON.parse(JSON.stringify(result.categories)),
        error: null,
      },
    });
  } catch (error) {
    logger.error({ error: String(error), websiteUrl }, 'Webshop analysis failed');
    await prisma.webshopAnalysis.update({
      where: { id: record.id },
      data: { status: 'FAILED', error: String(error) },
    });
    return { error: 'ANALYSIS_FAILED' } as RequestError;
  }
}
