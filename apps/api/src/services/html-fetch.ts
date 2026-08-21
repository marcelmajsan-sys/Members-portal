import { logger } from '../utils/logger.js';

// Realan browser User-Agent — mnogi webshopovi (anti-bot/WAF) blokiraju "bot" UA-ove
// i datacenter IP-ove (Vercel fra1), zbog čega je dohvat znao vratiti prazno (npr. otos.hr).
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

// Cloudflare / anti-bot challenge stranice vraćaju 200 + HTML, ali BEZ stvarnog sadržaja
// (interstitial "Just a moment..."). Tretiramo ih kao neuspjeh da (1) padnemo na reader
// proxy i (2) ne nahranimo model praznim sadržajem pa spremimo lažne 0-ocjene.
export function looksLikeChallenge(html: string): boolean {
  const head = html.slice(0, 4000).toLowerCase();
  return (
    head.includes('just a moment') ||
    head.includes('cf-browser-verification') ||
    head.includes('/cdn-cgi/challenge-platform') ||
    head.includes('challenge-platform') ||
    head.includes('attention required') ||
    head.includes('enable javascript and cookies to continue')
  );
}

async function fetchDirect(url: string, timeoutMs: number): Promise<string> {
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
    const text = await res.text();
    if (looksLikeChallenge(text)) return '';
    return text;
  } catch (error) {
    logger.warn({ error: String(error), url }, 'HTML fetch failed (direct)');
    return '';
  } finally {
    clearTimeout(timeout);
  }
}

// Reader proxy (r.jina.ai) dohvaća stranicu sa SVOJE infrastrukture i vraća čist markdown.
// Fallback kad direktan dohvat s Vercel datacenter IP-a (fra1) bude blokiran — neki
// webshopovi (npr. otos.hr) blokiraju datacenter IP-ove bez obzira na User-Agent.
// NAPOMENA: bez JINA_API_KEY r.jina.ai sada vraća vlastiti Cloudflare challenge (403),
// pa je za produkciju (blokirane stranice) potreban postavljen JINA_API_KEY.
async function fetchViaReader(url: string, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      signal: controller.signal,
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: 'text/plain, text/markdown, */*',
        ...(process.env.JINA_API_KEY ? { Authorization: `Bearer ${process.env.JINA_API_KEY}` } : {}),
      },
    });
    if (!res.ok) return '';
    const text = await res.text();
    if (looksLikeChallenge(text)) return '';
    return text;
  } catch (error) {
    logger.warn({ error: String(error), url }, 'HTML fetch failed (reader)');
    return '';
  } finally {
    clearTimeout(timeout);
  }
}

// Direktan dohvat (brz); ako vrati prazno (timeout / blokada datacenter IP-a / challenge),
// padni na reader proxy. Vraća prazan string kad ni jedan put ne uspije.
export async function fetchHtmlRobust(url: string, timeoutMs = 12000): Promise<string> {
  const direct = await fetchDirect(url, timeoutMs);
  if (direct) return direct;
  return fetchViaReader(url, 30000);
}
