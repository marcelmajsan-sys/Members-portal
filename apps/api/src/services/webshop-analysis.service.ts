import { prisma } from '@ecommerce-hr/db';
import {
  runWebshopAnalysis,
  runProviderAnalysis,
  type AnalysisPage,
  type CoreWebVitals,
  type PagespeedScores,
  type ProviderSiteSignals,
  type WebshopSiteSignals,
} from '@ecommerce-hr/ai';
import { logger } from '../utils/logger.js';
import { fetchHtmlRobust as fetchHtml } from './html-fetch.js';

// Tko ima pravo na analizu: Web trgovci (analiza webshopa, 6 kategorija) i
// Nuditelji usluga (analiza online prisutnosti po uzoru na žiri: Best Web/Copy/Marketing).
const ANALYZABLE_TYPES = ['WEB_TRADER', 'SERVICE_PROVIDER'];

type RequestError = {
  error: 'NOT_FOUND' | 'INACTIVE' | 'NO_WEBSITE' | 'IN_PROGRESS' | 'ANALYSIS_FAILED' | 'LIMIT_REACHED' | 'NOT_TRADER';
};

// Najviše ovoliko USPJEŠNIH analiza po članu u kliznom prozoru od 365 dana,
// ovisno o paketu članstva: STANDARD (i FREE) → 2, PREMIUM → 12.
export const ANALYSES_PER_YEAR = 2;
export const ANALYSES_PER_YEAR_PREMIUM = 12;
const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

// Pojedini članovi (npr. testni/admin) imaju povišeni limit.
const ANALYSES_LIMIT_OVERRIDES: Record<string, number> = {
  'marcel.majsan@gmail.com': 100,
};
function analysesLimitFor(email?: string | null, memberTier?: string | null): number {
  const override = email ? ANALYSES_LIMIT_OVERRIDES[email.toLowerCase()] : undefined;
  if (override !== undefined) return override;
  return memberTier === 'PREMIUM' ? ANALYSES_PER_YEAR_PREMIUM : ANALYSES_PER_YEAR;
}

// Normalizirani ključ webshopa za usporedbu URL-ova (bez protokola/www/kose crte na kraju).
function siteKey(url: string): string {
  return url.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '');
}

// Svi webshopovi jednog člana: glavni (webshop članstva, prednost, inače web tvrtke) +
// dodatni webshopovi (Member.extraWebshops), bez duplikata. Član s više webshopova ima
// pravo na kvotu analiza za SVAKI od njih.
export function memberAnalysisSites(member: { website: string | null; extraWebshops?: string[]; company?: { website: string | null } | null }): string[] {
  const sites: string[] = [];
  for (const raw of [member.website, member.company?.website, ...(member.extraWebshops ?? [])]) {
    const t = raw?.trim();
    if (t && !sites.some((s) => siteKey(s) === siteKey(t))) sites.push(t);
  }
  return sites;
}

// Odabrani webshop: traženi (ako pripada članstvu) ili prvi dostupni.
function resolveSite(sites: string[], requested?: string): string | undefined {
  if (!requested) return sites[0];
  return sites.find((s) => siteKey(s) === siteKey(requested));
}

// Koliko je analiza član iskoristio u zadnjih godinu dana + koliko ih je preostalo.
// Kvota se broji PO WEBSHOPU (websiteUrl) — svaki webshop članstva ima vlastiti limit.
export async function getWebshopAnalysisQuota(userId: string, memberId?: string, website?: string) {
  const member = await prisma.member.findFirst({
    where: { userId, ...(memberId ? { id: memberId } : {}) },
    orderBy: { createdAt: 'asc' },
    select: { id: true, memberType: true, memberTier: true, website: true, extraWebshops: true, user: { select: { email: true } }, company: { select: { website: true } } },
  });
  if (!member || !ANALYZABLE_TYPES.includes(member.memberType)) return null;
  const limit = analysesLimitFor(member.user?.email, member.memberTier);
  const sites = memberAnalysisSites(member);
  const target = resolveSite(sites, website);
  const rows = await prisma.webshopAnalysis.findMany({
    where: { memberId: member.id, status: 'COMPLETED', createdAt: { gte: new Date(Date.now() - YEAR_MS) } },
    select: { websiteUrl: true },
  });
  const used = target ? rows.filter((r) => siteKey(r.websiteUrl) === siteKey(target)).length : rows.length;
  return { used, remaining: Math.max(0, limit - used), limit, website: target ?? null };
}

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

// Dohvat HTML-a: browser UA + reader-proxy fallback (dijeljeni helper). Neki webshopovi
// (npr. otos.hr) blokiraju "bot" UA-ove i datacenter IP-ove pa je naslovnica znala doći
// prazna — tada su UX/Legal padali na 0 jer se ne mogu potvrditi iz markupa.

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
  const re = /href\s*=\s*["']([^"']+)["']/gi;
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

// ─── Webshop: pravne/potrošačke podstranice + detekcija "raskid ugovora" ──────

// Ključne riječi za jednostrani raskid ugovora / odustanak od ugovora / otkazivanje narudžbe.
const WITHDRAWAL_RE =
  /(raskid[\s_-]*ugovor|jednostran[a-z]*[\s_-]*raskid|obrazac[\s_-]*za[\s_-]*(jednostran[a-z]*[\s_-]*)?raskid|zahtjev[\s_-]*za[\s_-]*raskid|odustan[a-z]*[\s_-]*(od[\s_-]*)?ugovor|otka[žz][a-z]*[\s_-]*narud[žz]b|otkazivanje[\s_-]*narud[žz]b|withdrawal[\s_-]*(from[\s_-]*)?contract|cancel[\s_-]*order)/i;

// Pravne/potrošačke stranice koje želimo pročitati za LEGAL/ANALYTICS (redoslijed = prioritet).
const LEGAL_HINTS: Array<{ re: RegExp; label: string }> = [
  { re: /(raskid|odustan|otkazivanje[-_]?narud|otkazi[-_]?narud)/i, label: 'Raskid ugovora' },
  { re: /(uvjeti|terms|opci-uvjeti|pravila-koristenja|uvjeti-koristenja|uvjeti-kupnje)/i, label: 'Uvjeti korištenja' },
  { re: /(reklamacij|prigovor|povrat)/i, label: 'Reklamacije i povrati' },
  { re: /(privatnost|privacy|zastita-podataka|gdpr)/i, label: 'Pravila privatnosti' },
  { re: /(kolacic|cookie)/i, label: 'Politika kolačića' },
];

// Detekcija gumba/linka za jednostrani raskid ugovora iz sirovog HTML-a (anchor href + tekst).
export function detectWithdrawalLink(homepageUrl: string, html: string): { present: boolean; url: string | null } {
  const re = /<a\s[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  let count = 0;
  while ((m = re.exec(html)) && count < 1500) {
    count++;
    const href = m[1];
    let decodedHref = href;
    try {
      decodedHref = decodeURIComponent(href);
    } catch {
      /* zadrži sirovi href */
    }
    const text = m[2].replace(/<[^>]+>/g, ' ');
    if (WITHDRAWAL_RE.test(`${decodedHref} ${text}`)) {
      let abs: string | null;
      try {
        abs = new URL(href, homepageUrl).toString();
      } catch {
        abs = null;
      }
      return { present: true, url: abs };
    }
  }
  return { present: false, url: null };
}

// Otkrij do 3 pravne/potrošačke podstranice (raskid, uvjeti/reklamacije, privatnost/kolačići) —
// discoverSubpages ih namjerno preskače (SKIP_PATH), a LEGAL/ANALYTICS ih trebaju pročitati.
export function discoverLegalPages(homepageUrl: string, html: string): AnalysisPage[] {
  let origin: string;
  try {
    origin = new URL(homepageUrl).origin;
  } catch {
    return [];
  }
  const hrefs: string[] = [];
  const seen = new Set<string>();
  const re = /href\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && seen.size < 500) {
    const raw = m[1].trim();
    if (!raw || raw.startsWith('mailto:') || raw.startsWith('tel:') || raw.startsWith('javascript:')) continue;
    let abs: URL;
    try {
      abs = new URL(raw, homepageUrl);
    } catch {
      continue;
    }
    if (abs.origin !== origin) continue;
    if (abs.pathname === '/' || abs.pathname === '') continue;
    if (/\.(pdf|jpg|jpeg|png|gif|svg|webp|zip|xml|css|js)(\?|$)/i.test(abs.pathname)) continue;
    const key = abs.origin + abs.pathname;
    if (!seen.has(key)) {
      seen.add(key);
      hrefs.push(key);
    }
  }
  const pages: AnalysisPage[] = [];
  for (const hint of LEGAL_HINTS) {
    if (pages.length >= 3) break;
    const url = hrefs.find((u) => hint.re.test(u) && !pages.some((p) => p.url === u));
    if (url) pages.push({ url, label: hint.label, html: '' });
  }
  return pages;
}

// ─── Nuditelji: otkrivanje podstranica usluga + deterministički signali ───────

// Web nuditelja nema kategorije/proizvode — tražimo stranice usluga/referenci/o nama.
const PROVIDER_HINTS: Array<{ re: RegExp; label: string }> = [
  { re: /(\/usluge|\/services|\/ponuda|\/rjesenja|\/solutions|\/sto-radimo|\/what-we-do)/i, label: 'Stranica usluga' },
  { re: /(\/o-nama|\/about|\/tko-smo)/i, label: 'O nama' },
  { re: /(\/reference|\/portfolio|\/case-stud|\/radovi|\/projekti|\/clients|\/klijenti)/i, label: 'Reference / portfolio' },
  { re: /(\/cjenik|\/pricing|\/paketi|\/plans)/i, label: 'Cjenik / paketi' },
];
const PROVIDER_SKIP = /(prijav|login|register|registr|account|kontakt|contact|uvjeti|terms|privatnost|privacy|kolacic|cookie|faq|\.(pdf|jpg|jpeg|png|gif|svg|webp|zip|xml|css|js))(\/|$|\?)/i;

function discoverProviderSubpages(homepageUrl: string, html: string): AnalysisPage[] {
  let origin: string;
  try {
    origin = new URL(homepageUrl).origin;
  } catch {
    return [];
  }
  const hrefs: string[] = [];
  const seen = new Set<string>();
  const re = /href\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && seen.size < 400) {
    const raw = m[1].trim();
    if (!raw || raw.startsWith('mailto:') || raw.startsWith('tel:') || raw.startsWith('javascript:')) continue;
    let abs: URL;
    try {
      abs = new URL(raw, homepageUrl);
    } catch {
      continue;
    }
    if (abs.origin !== origin) continue;
    if (abs.pathname === '/' || abs.pathname === '') continue;
    if (PROVIDER_SKIP.test(abs.pathname)) continue;
    const key = abs.origin + abs.pathname;
    if (!seen.has(key)) {
      seen.add(key);
      hrefs.push(key);
    }
  }
  const pages: AnalysisPage[] = [];
  for (const hint of PROVIDER_HINTS) {
    if (pages.length >= 3) break;
    const url = hrefs.find((u) => hint.re.test(u) && !pages.some((p) => p.url === u));
    if (url) pages.push({ url, label: hint.label, html: '' });
  }
  // Fallback: bar jedna smislena podstranica ako hintovi ništa nisu našli
  if (pages.length === 0) {
    const fallback = hrefs.find((u) => {
      try {
        return new URL(u).pathname.split('/').filter(Boolean).length >= 1;
      } catch {
        return false;
      }
    });
    if (fallback) pages.push({ url: fallback, label: 'Podstranica', html: '' });
  }
  return pages;
}

// Signali koje detektiramo deterministički iz SIROVOG HTML-a (sanitizacija briše skripte,
// pa se tracking mora prepoznati prije nje). Model dobiva ove činjenice u promptu.
function detectProviderSignals(html: string): ProviderSiteSignals {
  const h = html.toLowerCase();
  return {
    socialLinks: {
      facebook: /facebook\.com\//.test(h),
      instagram: /instagram\.com\//.test(h),
      linkedin: /linkedin\.com\//.test(h),
      youtube: /(youtube\.com\/|youtu\.be\/)/.test(h),
      tiktok: /tiktok\.com\//.test(h),
    },
    tracking: {
      googleAnalytics: /(gtag\(|google-analytics\.com|googletagmanager\.com\/gtag)/.test(h),
      googleTagManager: /googletagmanager\.com\/gtm/.test(h),
      metaPixel: /(fbevents\.js|fbq\(|connect\.facebook\.net)/.test(h),
      linkedinInsight: /(snap\.licdn\.com|_linkedin_partner_id)/.test(h),
      hotjar: /(hotjar\.com|hj\()/.test(h),
    },
  };
}

// Lighthouse performance score (0–100) za zadanu strategiju — za "Page speed" kriterije
// žirijeve analize (žiri koristi pagespeed.web.dev i score dijeli s 10).
async function fetchPagespeedScore(url: string, strategy: 'desktop' | 'mobile'): Promise<number | null> {
  const key = process.env.PAGESPEED_API_KEY;
  const endpoint = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
  endpoint.searchParams.set('url', url);
  endpoint.searchParams.set('strategy', strategy);
  endpoint.searchParams.set('category', 'performance');
  if (key) endpoint.searchParams.set('key', key);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 40000);
  try {
    const res = await fetch(endpoint.toString(), { signal: controller.signal });
    if (!res.ok) return null;
    const data: any = await res.json();
    const score = data?.lighthouseResult?.categories?.performance?.score;
    return typeof score === 'number' ? Math.round(score * 100) : null;
  } catch (error) {
    logger.warn({ error: String(error), url, strategy }, 'PageSpeed score: fetch failed');
    return null;
  } finally {
    clearTimeout(timeout);
  }
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

export async function getLatestWebshopAnalysis(userId: string, memberId?: string, website?: string) {
  const member = await prisma.member.findFirst({
    where: { userId, ...(memberId ? { id: memberId } : {}) },
    orderBy: { createdAt: 'asc' },
    select: { id: true, website: true, extraWebshops: true, company: { select: { website: true } } },
  });
  if (!member) return null;
  // Bez traženog webshopa: zadnja analiza bilo kojeg (staro ponašanje).
  // S traženim webshopom: zadnja analiza upravo tog webshopa (usporedba normaliziranih URL-ova).
  if (!website) {
    return prisma.webshopAnalysis.findFirst({ where: { memberId: member.id }, orderBy: { createdAt: 'desc' } });
  }
  const target = resolveSite(memberAnalysisSites(member), website);
  if (!target) return null;
  const rows = await prisma.webshopAnalysis.findMany({
    where: { memberId: member.id },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });
  return rows.find((r) => siteKey(r.websiteUrl) === siteKey(target)) ?? null;
}

export async function requestWebshopAnalysis(userId: string, memberId?: string, requestedWebsite?: string) {
  const member = await prisma.member.findFirst({
    where: { userId, ...(memberId ? { id: memberId } : {}) },
    orderBy: { createdAt: 'asc' },
    include: { company: true, user: { select: { email: true } } },
  });

  if (!member) return { error: 'NOT_FOUND' } as RequestError;
  if (!ANALYZABLE_TYPES.includes(member.memberType)) return { error: 'NOT_TRADER' } as RequestError;
  if (member.status !== 'ACTIVE') return { error: 'INACTIVE' } as RequestError;

  // Webshop članstva ima prednost pred webshopom tvrtke; član s više webshopova
  // može eksplicitno odabrati koji analizira (mora pripadati članstvu).
  const website = resolveSite(memberAnalysisSites(member), requestedWebsite);
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

  const limit = analysesLimitFor(member.user?.email, member.memberTier);

  // Dnevni cap na broj POKRENUTIH analiza (bilo koji status) u zadnjih 24h.
  // Godišnja kvota broji samo COMPLETED, pa bi bez ovoga kompromitirani račun mogao
  // beskonačno ponavljati NEuspjele analize (svaka i dalje troši Opus poziv) i nikad
  // dosegnuti godišnji limit. Cap je iznad legitimne potrebe (nitko ne radi >par/dan).
  const DAY_MS = 24 * 60 * 60 * 1000;
  const dailyCap = Math.max(limit, 6);
  const startedToday = await prisma.webshopAnalysis.count({
    where: { memberId: member.id, createdAt: { gte: new Date(Date.now() - DAY_MS) } },
  });
  if (startedToday >= dailyCap) return { error: 'LIMIT_REACHED' } as RequestError;

  // Godišnji limit: najviše `limit` USPJEŠNIH analiza u zadnjih 365 dana — PO WEBSHOPU
  // (član s više webshopova ima kvotu za svaki zasebno).
  const yearRows = await prisma.webshopAnalysis.findMany({
    where: { memberId: member.id, status: 'COMPLETED', createdAt: { gte: new Date(Date.now() - YEAR_MS) } },
    select: { websiteUrl: true },
  });
  const usedThisYear = yearRows.filter((r) => siteKey(r.websiteUrl) === siteKey(website)).length;
  if (usedThisYear >= limit) return { error: 'LIMIT_REACHED' } as RequestError;

  const websiteUrl = normalizeUrl(website);

  const record = await prisma.webshopAnalysis.create({
    data: { memberId: member.id, websiteUrl, status: 'PENDING' },
  });

  try {
    const isProvider = member.memberType === 'SERVICE_PROVIDER';

    // Mjerenja i HTML naslovnice idu paralelno (trebaju samo URL).
    // Trgovci: Core Web Vitals (mobile). Nuditelji: PageSpeed score desktop + mobile
    // (žirijeva "Page speed" kriterija dijele score s 10).
    const cwvPromise = isProvider ? Promise.resolve(null) : fetchCoreWebVitals(websiteUrl);
    const psPromise: Promise<PagespeedScores | null> = isProvider
      ? Promise.all([
          fetchPagespeedScore(websiteUrl, 'desktop'),
          fetchPagespeedScore(websiteUrl, 'mobile'),
        ]).then(([desktop, mobile]) => ({ desktop, mobile }))
      : Promise.resolve(null);

    const homepageHtml = await fetchHtml(websiteUrl);

    // Naslovnica + best-effort podstranice. Trgovci: kategorija/proizvod + pravne/potrošačke
    // (raskid, uvjeti, privatnost, kolačići) za LEGAL/ANALYTICS. Nuditelji: usluge/reference.
    const pages: AnalysisPage[] = [{ url: websiteUrl, label: 'Naslovnica', html: homepageHtml }];
    let subpages: AnalysisPage[] = [];
    if (homepageHtml) {
      subpages = isProvider
        ? discoverProviderSubpages(websiteUrl, homepageHtml)
        : [...discoverSubpages(websiteUrl, homepageHtml), ...discoverLegalPages(websiteUrl, homepageHtml)];
    }
    if (subpages.length) {
      const fetched = await Promise.all(
        subpages.map(async (p) => ({ ...p, html: await fetchHtml(p.url, 7000) })),
      );
      pages.push(...fetched.filter((p) => p.html));
    }

    // Deterministički signal za trgovce: gumb/link za jednostrani raskid ugovora (iz naslovnice).
    const webshopSignals: WebshopSiteSignals | null =
      !isProvider && homepageHtml ? { withdrawal: detectWithdrawalLink(websiteUrl, homepageHtml) } : null;

    const [coreWebVitals, pagespeed] = await Promise.all([cwvPromise, psPromise]);

    const result = isProvider
      ? await runProviderAnalysis(
          websiteUrl,
          member.company?.name ?? '',
          pages,
          pagespeed,
          homepageHtml ? detectProviderSignals(homepageHtml) : null,
        )
      : await runWebshopAnalysis(
          websiteUrl,
          member.company?.name ?? '',
          pages,
          coreWebVitals,
          member.hasCertificate,
          webshopSignals,
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
