import { prisma } from '@ecommerce-hr/db';
import { runWebshopAnalysis, type AnalysisPage, type CoreWebVitals } from '@ecommerce-hr/ai';
import { logger } from '../utils/logger.js';

type RequestError = {
  error: 'NOT_FOUND' | 'INACTIVE' | 'NO_WEBSITE' | 'IN_PROGRESS' | 'ANALYSIS_FAILED' | 'LIMIT_REACHED' | 'NOT_TRADER';
};

// Najviše ovoliko USPJEŠNIH analiza po članu u kliznom prozoru od 365 dana.
export const ANALYSES_PER_YEAR = 2;
const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

// Pojedini članovi (npr. testni/admin) imaju povišeni limit.
const ANALYSES_LIMIT_OVERRIDES: Record<string, number> = {
  'marcel.majsan@gmail.com': 100,
};
function analysesLimitFor(email?: string | null): number {
  return (email ? ANALYSES_LIMIT_OVERRIDES[email.toLowerCase()] : undefined) ?? ANALYSES_PER_YEAR;
}

// Koliko je analiza član iskoristio u zadnjih godinu dana + koliko ih je preostalo.
export async function getWebshopAnalysisQuota(userId: string) {
  const member = await prisma.member.findUnique({
    where: { userId },
    select: { id: true, memberType: true, user: { select: { email: true } } },
  });
  if (!member || member.memberType !== 'WEB_TRADER') return null;
  const limit = analysesLimitFor(member.user?.email);
  const used = await prisma.webshopAnalysis.count({
    where: { memberId: member.id, status: 'COMPLETED', createdAt: { gte: new Date(Date.now() - YEAR_MS) } },
  });
  return { used, remaining: Math.max(0, limit - used), limit };
}

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

// Dohvat HTML-a stranice (best-effort). Greška/timeout → prazan string.
async function fetchHtml(url: string, timeoutMs = 8000): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
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

// Stranice koje ne želimo dohvaćati kao "kategoriju/proizvod" (login, košarica, pravne...).
const SKIP_PATH = /(prijav|login|register|registr|kosaric|cart|checkout|blagajn|account|moj-racun|wishlist|kontakt|contact|o-nama|about|blog|uvjeti|terms|privatnost|privacy|kolacic|cookie|reklamacij|dostava-i-placanje|faq|\.(pdf|jpg|jpeg|png|gif|svg|webp|zip|xml|css|js))(\/|$|\?)/i;
const PRODUCT_HINT = /(\/proizvod|\/product|\/p\/|\/artikl|\/item)/i;
const CATEGORY_HINT = /(\/kategorij|\/categor|\/c\/|\/trgovina|\/shop|\/proizvodi|\/products)/i;

// Iz HTML-a naslovnice izvuci kandidate za stranicu kategorije i proizvoda (best-effort).
function discoverSubpages(homepageUrl: string, html: string): AnalysisPage[] {
  let origin: string;
  try {
    origin = new URL(homepageUrl).origin;
  } catch {
    return [];
  }
  const hrefs = new Set<string>();
  const re = /href\s*=\s*["']([^"'#]+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && hrefs.size < 400) {
    const raw = m[1].trim();
    if (!raw || raw.startsWith('mailto:') || raw.startsWith('tel:') || raw.startsWith('javascript:')) continue;
    let abs: URL;
    try {
      abs = new URL(raw, homepageUrl);
    } catch {
      continue;
    }
    if (abs.origin !== origin) continue; // samo isti host
    if (abs.pathname === '/' || abs.pathname === '') continue;
    if (SKIP_PATH.test(abs.pathname)) continue;
    hrefs.add(abs.origin + abs.pathname);
  }
  const list = [...hrefs];
  const productUrl = list.find((u) => PRODUCT_HINT.test(u));
  const categoryUrl =
    list.find((u) => CATEGORY_HINT.test(u) && u !== productUrl) ??
    // fallback: prvi smisleni link s dovoljnom dubinom puta
    list.find((u) => {
      try {
        const segs = new URL(u).pathname.split('/').filter(Boolean);
        return segs.length >= 1 && u !== productUrl;
      } catch {
        return false;
      }
    });

  const pages: AnalysisPage[] = [];
  if (categoryUrl) pages.push({ url: categoryUrl, label: 'Stranica kategorije', html: '' });
  if (productUrl && productUrl !== categoryUrl)
    pages.push({ url: productUrl, label: 'Stranica proizvoda', html: '' });
  return pages;
}

const CWV_GOOD = { lcp: 2500, inp: 200, cls: 0.1 };

// Stvarni Core Web Vitals preko Google PageSpeed Insights API-ja (mobilni).
// Bez ključa radi i javni endpoint (rate-limited); s PAGESPEED_API_KEY pouzdanije.
async function fetchCoreWebVitals(url: string): Promise<CoreWebVitals | null> {
  const key = process.env.PAGESPEED_API_KEY;
  const endpoint = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
  endpoint.searchParams.set('url', url);
  endpoint.searchParams.set('strategy', 'mobile');
  endpoint.searchParams.set('category', 'performance');
  if (key) endpoint.searchParams.set('key', key);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(endpoint.toString(), { signal: controller.signal });
    if (!res.ok) {
      logger.warn({ url, status: res.status }, 'PageSpeed: non-OK response');
      return null;
    }
    const data: any = await res.json();
    const field = data?.loadingExperience?.metrics;
    if (field) {
      const lcp = field.LARGEST_CONTENTFUL_PAINT_MS?.percentile ?? null;
      const inp = field.INTERACTION_TO_NEXT_PAINT?.percentile ?? null;
      const clsRaw = field.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile ?? null;
      const cls = clsRaw == null ? null : clsRaw / 100;
      const passed =
        lcp != null && lcp <= CWV_GOOD.lcp &&
        (inp == null || inp <= CWV_GOOD.inp) &&
        cls != null && cls <= CWV_GOOD.cls;
      return { lcp, inp, cls, passed, source: 'field' };
    }
    // Fallback: laboratorijski (Lighthouse) podaci — INP nije dostupan u labu.
    const audits = data?.lighthouseResult?.audits;
    if (audits) {
      const lcp = audits['largest-contentful-paint']?.numericValue ?? null;
      const cls = audits['cumulative-layout-shift']?.numericValue ?? null;
      const passed = lcp != null && lcp <= CWV_GOOD.lcp && cls != null && cls <= CWV_GOOD.cls;
      return {
        lcp: lcp == null ? null : Math.round(lcp),
        inp: null,
        cls: cls == null ? null : Math.round(cls * 100) / 100,
        passed,
        source: 'lab',
      };
    }
    return null;
  } catch (error) {
    logger.warn({ error: String(error), url }, 'PageSpeed: fetch failed');
    return null;
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
    include: { company: true, user: { select: { email: true } } },
  });

  if (!member) return { error: 'NOT_FOUND' } as RequestError;
  if (member.memberType !== 'WEB_TRADER') return { error: 'NOT_TRADER' } as RequestError;
  if (member.status !== 'ACTIVE') return { error: 'INACTIVE' } as RequestError;

  const website = member.company?.website?.trim();
  if (!website) return { error: 'NO_WEBSITE' } as RequestError;

  // Spriječi paralelno dvostruko pokretanje — ali samo za stvarno tekući zahtjev.
  // Zaglavljeni PENDING (prekinuta veza, timeout) stariji od 5 min smatramo napuštenim
  // i označavamo FAILED kako član ne bi ostao trajno zaključan.
  const pending = await prisma.webshopAnalysis.findFirst({
    where: { memberId: member.id, status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
  });
  if (pending) {
    const ageMs = Date.now() - pending.createdAt.getTime();
    if (ageMs < 5 * 60 * 1000) return { error: 'IN_PROGRESS' } as RequestError;
    await prisma.webshopAnalysis.update({
      where: { id: pending.id },
      data: { status: 'FAILED', error: 'Napušteno (prekoračeno vrijeme)' },
    });
  }

  // Godišnji limit: najviše ANALYSES_PER_YEAR uspješnih analiza u zadnjih 365 dana.
  const usedThisYear = await prisma.webshopAnalysis.count({
    where: { memberId: member.id, status: 'COMPLETED', createdAt: { gte: new Date(Date.now() - YEAR_MS) } },
  });
  if (usedThisYear >= analysesLimitFor(member.user?.email)) return { error: 'LIMIT_REACHED' } as RequestError;

  const websiteUrl = normalizeUrl(website);

  const record = await prisma.webshopAnalysis.create({
    data: { memberId: member.id, websiteUrl, status: 'PENDING' },
  });

  try {
    // Core Web Vitals i HTML naslovnice idu paralelno (oboje trebaju samo URL).
    const cwvPromise = fetchCoreWebVitals(websiteUrl);
    const homepageHtml = await fetchHtml(websiteUrl);

    // Naslovnica + best-effort kategorija/proizvod (paralelno).
    const pages: AnalysisPage[] = [{ url: websiteUrl, label: 'Naslovnica', html: homepageHtml }];
    const subpages = homepageHtml ? discoverSubpages(websiteUrl, homepageHtml) : [];
    if (subpages.length) {
      const fetched = await Promise.all(
        subpages.map(async (p) => ({ ...p, html: await fetchHtml(p.url, 7000) })),
      );
      pages.push(...fetched.filter((p) => p.html));
    }

    const coreWebVitals = await cwvPromise;

    const result = await runWebshopAnalysis(
      websiteUrl,
      member.company?.name ?? '',
      pages,
      coreWebVitals,
      member.hasCertificate,
    );

    return prisma.webshopAnalysis.update({
      where: { id: record.id },
      data: {
        status: 'COMPLETED',
        overallScore: Math.round(result.overallScore),
        summary: result.summary,
        result: JSON.parse(JSON.stringify(result.categories)),
        coreWebVitals: coreWebVitals ? JSON.parse(JSON.stringify(coreWebVitals)) : undefined,
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
