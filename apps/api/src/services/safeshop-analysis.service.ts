import { prisma } from '@ecommerce-hr/db';
import { runSafeShopCertification, type SafeShopPage } from '@ecommerce-hr/ai';
import { logger } from '../utils/logger.js';

type RequestError = {
  error: 'NOT_FOUND' | 'NO_WEBSITE' | 'IN_PROGRESS' | 'ANALYSIS_FAILED' | 'LIMIT_REACHED';
};

// Najviše ovoliko USPJEŠNIH Safe Shop analiza po članu u kliznom prozoru od 365 dana.
export const SAFE_SHOP_ANALYSES_PER_YEAR = 2;
const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

// Koliko je Safe Shop analiza član iskoristio u zadnjih godinu dana + koliko preostaje.
export async function getSafeShopAnalysisQuota(memberId: string) {
  const used = await prisma.safeShopAnalysis.count({
    where: { memberId, status: 'COMPLETED', createdAt: { gte: new Date(Date.now() - YEAR_MS) } },
  });
  return { used, remaining: Math.max(0, SAFE_SHOP_ANALYSES_PER_YEAR - used), limit: SAFE_SHOP_ANALYSES_PER_YEAR };
}

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

// Realan browser User-Agent — mnogi webshopovi (anti-bot/WAF) blokiraju "bot" UA-ove
// i datacenter IP-ove (Vercel fra1), zbog čega je dohvat znao vratiti prazno (npr. otos.hr).
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

async function fetchHtmlOnce(url: string, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'hr-HR,hr;q=0.9,en;q=0.8',
      },
    });
    if (!res.ok) return '';
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('html')) return '';
    return await res.text();
  } catch (error) {
    logger.warn({ error: String(error), url }, 'Safe Shop analysis: HTML fetch failed');
    return '';
  } finally {
    clearTimeout(timeout);
  }
}

// Jedan retry ako prvi pokušaj vrati prazno (sporiji odgovor / tranzijentna blokada s datacenter IP-a).
async function fetchHtml(url: string, timeoutMs = 15000): Promise<string> {
  const first = await fetchHtmlOnce(url, timeoutMs);
  if (first) return first;
  return fetchHtmlOnce(url, timeoutMs);
}

// Pravne stranice na kojima počivaju Safe Shop kriteriji — kategorija -> ključne riječi u putanji/tekstu linka.
const LEGAL_CATEGORIES: { label: string; re: RegExp }[] = [
  { label: 'Uvjeti poslovanja', re: /(uvjet|terms|conditions|opci-uvjeti|pravila-kupnje)/i },
  { label: 'Politika privatnosti', re: /(privatnost|privacy|gdpr|zastita-(osobnih-)?podataka)/i },
  { label: 'Politika kolačića', re: /(kolacic|cookie)/i },
  { label: 'Dostava i plaćanje', re: /(dostav|isporuk|shipping|placanje|nacin-placanja)/i },
  { label: 'Reklamacije i povrat', re: /(reklamacij|povrat|return|raskid|prigovor|jamstv|warranty|complaint)/i },
];

// Iz HTML-a naslovnice pronađi najbolju stranicu po pravnoj kategoriji (best-effort).
function discoverLegalPages(homepageUrl: string, html: string): SafeShopPage[] {
  let origin: string;
  try {
    origin = new URL(homepageUrl).origin;
  } catch {
    return [];
  }
  // Skupi (url, tekst-linka) parove istog hosta.
  const links: { url: string; text: string }[] = [];
  const re = /<a\b[^>]*href\s*=\s*["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  let guard = 0;
  while ((m = re.exec(html)) && guard < 2000) {
    guard++;
    const raw = m[1].trim();
    if (!raw || raw.startsWith('mailto:') || raw.startsWith('tel:') || raw.startsWith('javascript:')) continue;
    let abs: URL;
    try {
      abs = new URL(raw, homepageUrl);
    } catch {
      continue;
    }
    if (abs.origin !== origin) continue;
    const text = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    links.push({ url: abs.origin + abs.pathname, text });
  }

  const chosen: SafeShopPage[] = [];
  const usedUrls = new Set<string>();
  for (const cat of LEGAL_CATEGORIES) {
    const hit = links.find(
      (l) => !usedUrls.has(l.url) && (cat.re.test(l.url) || cat.re.test(l.text)),
    );
    if (hit) {
      usedUrls.add(hit.url);
      chosen.push({ url: hit.url, label: cat.label, html: '' });
    }
  }
  return chosen;
}

export async function getLatestSafeShopAnalysis(memberId: string) {
  return prisma.safeShopAnalysis.findFirst({
    where: { memberId },
    orderBy: { createdAt: 'desc' },
  });
}

type EditableCheckpoint = { n: number; title: string; pass: boolean; note: string };

// Admin uređivanje analize: spremi izmijenjeni komentar i kriterije; ocjenu/prolaz
// uvijek izvodimo iz checkpointa (broj zadovoljenih, prolaz >= 9).
export async function updateSafeShopAnalysis(
  id: string,
  data: { summary?: string; analyst?: string; checkpoints?: EditableCheckpoint[] },
) {
  const existing = await prisma.safeShopAnalysis.findUnique({ where: { id } });
  if (!existing) return null;

  const checkpoints = Array.isArray(data.checkpoints)
    ? data.checkpoints
    : ((existing.result as unknown as EditableCheckpoint[]) ?? []);
  const score = checkpoints.filter((c) => c?.pass).length;

  return prisma.safeShopAnalysis.update({
    where: { id },
    data: {
      summary: data.summary ?? existing.summary,
      analyst: data.analyst ?? existing.analyst,
      result: JSON.parse(JSON.stringify(checkpoints)),
      score,
      passed: score >= 9,
    },
  });
}

export async function requestSafeShopAnalysis(memberId: string) {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: { company: true },
  });

  if (!member) return { error: 'NOT_FOUND' } as RequestError;

  const website = member.company?.website?.trim();
  if (!website) return { error: 'NO_WEBSITE' } as RequestError;

  // Godišnji limit (2 uspješne analize u kliznih 365 dana).
  const quota = await getSafeShopAnalysisQuota(memberId);
  if (quota.remaining <= 0) return { error: 'LIMIT_REACHED' } as RequestError;

  // Zaglavljeni PENDING stariji od 5 min smatramo napuštenim.
  const pending = await prisma.safeShopAnalysis.findFirst({
    where: { memberId, status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
  });
  if (pending) {
    const ageMs = Date.now() - pending.createdAt.getTime();
    if (ageMs < 5 * 60 * 1000) return { error: 'IN_PROGRESS' } as RequestError;
    await prisma.safeShopAnalysis.update({
      where: { id: pending.id },
      data: { status: 'FAILED', error: 'Napušteno (prekoračeno vrijeme)' },
    });
  }

  const websiteUrl = normalizeUrl(website);

  const record = await prisma.safeShopAnalysis.create({
    data: { memberId, websiteUrl, status: 'PENDING' },
  });

  try {
    const homepageHtml = await fetchHtml(websiteUrl);
    const pages: SafeShopPage[] = [{ url: websiteUrl, label: 'Naslovnica', html: homepageHtml }];

    if (homepageHtml) {
      const legal = discoverLegalPages(websiteUrl, homepageHtml);
      const fetched = await Promise.all(
        legal.map(async (p) => ({ ...p, html: await fetchHtml(p.url, 7000) })),
      );
      pages.push(...fetched.filter((p) => p.html));
    }

    const result = await runSafeShopCertification(websiteUrl, member.company?.name ?? '', pages);

    return prisma.safeShopAnalysis.update({
      where: { id: record.id },
      data: {
        status: 'COMPLETED',
        score: result.score,
        passed: result.passed,
        summary: result.summary,
        result: JSON.parse(JSON.stringify(result.checkpoints)),
        error: null,
      },
    });
  } catch (error) {
    logger.error({ error: String(error), websiteUrl }, 'Safe Shop analysis failed');
    await prisma.safeShopAnalysis.update({
      where: { id: record.id },
      data: { status: 'FAILED', error: String(error) },
    });
    return { error: 'ANALYSIS_FAILED' } as RequestError;
  }
}
