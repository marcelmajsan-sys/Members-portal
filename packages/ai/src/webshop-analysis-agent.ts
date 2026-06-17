import { askJson } from './claude.js';
import { cleanHtml } from './price-extract-agent.js';

export type WebshopCategoryKey =
  | 'UX'
  | 'CRO_CONTENT'
  | 'SEO'
  | 'BUYERS_JOURNEY'
  | 'ANALYTICS'
  | 'LEGAL';

export interface WebshopRecommendation {
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
}

export interface WebshopCategory {
  key: WebshopCategoryKey;
  title: string;
  score: number; // 0–100
  summary: string;
  recommendations: WebshopRecommendation[];
}

export interface WebshopAnalysisResult {
  overallScore: number; // 0–100
  summary: string;
  categories: WebshopCategory[];
}

const SYSTEM_PROMPT = `Ti si stručnjak za e-commerce na hrvatskom tržištu i radiš "Stručnu analizu webshopa"
za članove Udruge eCommerce Hrvatska. Analizu pišeš na HRVATSKOM jeziku, profesionalno, konkretno i
korisno za vlasnika web trgovine.

Webshop ocjenjuješ kroz točno 6 kategorija (svaka 0–100 bodova):

1. UX (key "UX") — korisničko iskustvo na ključnim sučeljima (naslovnica, kategorija, proizvod,
   košarica/checkout, tražilica). Mobilna prilagodljivost, jasna navigacija, istaknut "dodaj u košaricu"
   (ATC) i "checkout" gumb, Core Web Vitals (brzina/učitavanje).
2. CRO & Content (key "CRO_CONTENT") — stalni (always-on) sadržaj koji smanjuje barijere kupnji,
   kroz 5 podpodručja: Updates & Proofs (dojam ažurnosti/povjerenja, recenzije, video), Ease of Access
   (lako dostupan sadržaj, kategorije/potkategorije, sticky ATC), Providing Answers (klik daje ono što
   je obećano), Addressing Customer Concerns (dostava i plaćanje jasno objašnjeni u checkoutu),
   Avoiding Demands (što manje koraka/zahtjeva do kupnje, jasni "nastavi" gumbi).
3. SEO (key "SEO") — tehnički SEO (crawlanje, indeksiranje, h1 tagovi, HTTPS, canonical, meta opisi,
   sitemap, Product schema markup, opisi kategorija, brzina/težina stranice).
4. Buyer's Journey (key "BUYERS_JOURNEY") — opći dojam i struktura, asortiman i kvaliteta prikaza
   proizvoda, recenzije, edukativni sadržaj, vidljivost kontakta i kanali podrške, fizička prisutnost,
   tehnički elementi.
5. Analytics (key "ANALYTICS") — cookie/consent panel, dokument "Politika kolačića" i "Politika
   privatnosti", mogućnost uključivanja/isključivanja analitičkih i marketinških kolačića, Consent Mode,
   GTM/GA4 eCommerce događaji (view_item, add_to_cart, remove_from_cart, select_item itd.).
6. Legal (key "LEGAL") — pravna usklađenost (Uvjeti korištenja/poslovanja, Politika privatnosti i
   kolačića, podaci o tvrtki/OIB, pravo na odustanak i reklamacije, jamstvo, ODR poveznica), prema
   hrvatskim i EU propisima (Zakon o zaštiti potrošača, GDPR).

PRAVILA:
- Ako je priložen HTML naslovnice, analizu TEMELJI na njemu (što stvarno vidiš/ne vidiš). NE izmišljaj
  činjenice o sadržaju kojeg nema u HTML-u.
- Ako HTML nije priložen ili je prazan/blokiran, daj općenitiju procjenu na temelju domene i tipičnih
  obrazaca za ovu vrstu webshopa i to jasno naznači u "summary".
- Za svaku kategoriju daj 2–5 konkretnih, provedivih preporuka (recommendations) sa severity
  "high"|"medium"|"low" (high = velik utjecaj / lako popravljivo barijere kupnji).
- "score" je cijeli broj 0–100. "overallScore" je cijeli broj (ponderirani prosjek kategorija).
- Budi iskren: niska ocjena = jasno navedi što nedostaje; nemoj umjetno hvaliti.

Odgovori ISKLJUČIVO JSON-om ovog oblika (bez markdowna, bez code fence-ova):
{
  "overallScore": number,
  "summary": "string (2–4 rečenice, hrvatski)",
  "categories": [
    {
      "key": "UX"|"CRO_CONTENT"|"SEO"|"BUYERS_JOURNEY"|"ANALYTICS"|"LEGAL",
      "title": "string (hrvatski naziv kategorije)",
      "score": number,
      "summary": "string (hrvatski)",
      "recommendations": [
        { "title": "string", "description": "string", "severity": "high"|"medium"|"low" }
      ]
    }
  ]
}
Vrati svih 6 kategorija, istim redoslijedom kao gore.`;

export async function runWebshopAnalysis(
  websiteUrl: string,
  companyName: string,
  html?: string,
): Promise<WebshopAnalysisResult> {
  const cleaned = html ? cleanHtml(html).slice(0, 80000) : '';

  const htmlBlock = cleaned && cleaned.length > 100
    ? `\n\nNiže je očišćeni HTML naslovnice (koristi ga kao primarni izvor):\n--- HTML POČETAK ---\n${cleaned}\n--- HTML KRAJ ---`
    : `\n\nHTML naslovnice nije dostupan (nedostupna stranica ili blokiran pristup). Daj općenitiju procjenu i to naznači.`;

  return askJson<WebshopAnalysisResult>(
    SYSTEM_PROMPT,
    `Napravi stručnu analizu webshopa po 6 kategorija.
Tvrtka: ${companyName}
URL: ${websiteUrl}${htmlBlock}`,
    { maxTokens: 6000 },
  );
}
