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

// Strukturirani detalji ovise o kategoriji (svi opcionalni — stari zapisi ih nemaju):
export interface WebshopChecklistItem {
  label: string;
  pass: boolean;
}
export interface WebshopChecklistGroup {
  group: string;
  items: WebshopChecklistItem[];
}
export interface WebshopCriterion {
  label: string;
  score: number; // 0–5
  max: number; // 5
  note?: string;
}
export interface WebshopCheckpoint {
  label: string;
  pass: boolean;
  note?: string;
}
export interface WebshopSection {
  heading: string;
  body: string;
}

export interface WebshopCategory {
  key: WebshopCategoryKey;
  title: string;
  score: number; // 0–100
  summary: string;
  recommendations: WebshopRecommendation[];
  checklist?: WebshopChecklistGroup[]; // UX (62 točke / 5 sučelja)
  criteria?: WebshopCriterion[]; // ANALYTICS (7 kriterija 0–5)
  checkpoints?: WebshopCheckpoint[]; // LEGAL (5 točaka ✓/✗)
  sections?: WebshopSection[]; // CRO_CONTENT (5 područja) i BUYERS_JOURNEY (struktura)
}

export interface CoreWebVitals {
  lcp: number | null; // ms (Largest Contentful Paint)
  inp: number | null; // ms (Interaction to Next Paint)
  cls: number | null; // unitless (Cumulative Layout Shift)
  passed: boolean;
  source: 'field' | 'lab'; // field = stvarni korisnici (CrUX), lab = Lighthouse procjena
}

export interface WebshopAnalysisResult {
  overallScore: number; // 0–100
  summary: string;
  categories: WebshopCategory[];
  coreWebVitals?: CoreWebVitals | null;
}

export interface AnalysisPage {
  url: string;
  label: string; // npr. "Naslovnica", "Stranica kategorije", "Stranica proizvoda"
  html: string;
}

// Kanonska UX checklista (62 točke / 5 sučelja) — preuzeto iz stvarnih stručnih analiza
// žirija Udruge (Aron Stanić, temelj Baymard smjernice). Model je MORA vratiti u cijelosti.
const UX_CHECKLIST = `NASLOVNICA I NAVIGACIJA (8):
- Sticky header i/ili footer radi lakše navigacije
- Jasni i pregledni tekstualni i vizualni elementi
- Promo banner (ako postoji) ne zauzima preko 50% vidljivog ekrana (above the fold)
- Kontakt informacije ili izravan kontakt dostupni na naslovnici (bez klika na zasebnu stranicu)
- Hamburger izbornik
- Vidljiv i lako dostupan CTA
- Vidljiv trust simbol
- Izdvojeni banneri/karuseli s istaknutim proizvodima
STRANICA KATEGORIJA (12):
- Opis kategorije
- Jasna i pregledna hijerarhija kategorija (breadcrumbs)
- Prikaz proizvoda u najmanje 2 stupca
- Opcije sortiranja (cijena, novi/stari)
- Dodatne opcije sortiranja (osim gore navedenih)
- Filteri (bar jedan osim cijene)
- Filteri koji se mogu otvoriti/zatvoriti (collapsible)
- Dinamički filteri (međuovisni)
- Paginacija ili infinite scroll s "učitaj više" gumbom
- Kartice proizvoda s cijenom i informativnim oznakama (badgevima)
- Mogućnost dodavanja proizvoda u košaricu
- Recenzije proizvoda
STRANICA PROIZVODA (11):
- Kvalitetna slika proizvoda
- Dostupne dodatne slike (kod većine kataloga)
- Cijena vidljiva above the fold
- Dostupnost proizvoda
- Breadcrumbs
- Značajke proizvoda
- Prikaz opcija dostave
- Prikaz opcija plaćanja
- Opcije dodavanja više komada u košaricu pomoću strelica ili +/- znakova
- Preporuke drugih proizvoda (koja god logika je u pitanju)
- Recenzije kupaca
KOŠARICA I CHECKOUT (14):
- Mini košarica dostupna u headeru
- Uređivanje košarice pomoću strelica ili +/- znakova
- Prikaz cijene (ili procjene) dostave ili mogućnost unosa adrese za procjenu
- Potreban iznos do besplatne dostave (ako postoji na stranici)
- Checkout bez registracije
- Pogodnosti od registriranja
- Preporuke proizvoda na sučelju košarice (cross-sell)
- Fokusiran checkout (uklonjeni header/footer i sl.)
- Jasan prikaz koraka i tijeka checkouta
- Jasan prikaz pojedinačnih i ukupnih troškova
- Opcije dostave (više od jedne)
- Opcije plaćanja (osnovno - kartica, internet bankarstvo, pouzeće)
- Dodatne opcije plaćanja (KEKS Pay, Paycek, GPay i sl.)
- Jasan prikaz i objašnjenje korisničkih grešaka (krivi unos i sl.)
TRAŽILICA (17):
- Vidljiva na naslovnici (u headeru ili odmah ispod njega)
- Prijedlozi odmah pri aktivaciji
- Autosugestije pojmova
- Pretraga po katalogu i po kategorijama
- Pretraga po sadržaju
- Glasovna ili vizualna pretraga
- Opcije sortiranja (cijena, novi/stari)
- Dodatne opcije sortiranja (osim gornjih)
- Filteri (bar još jedan osim cijene)
- Filteri koji se mogu otvoriti/zatvoriti
- Dinamički filteri (međuovisni)
- Paginacija ili infinite scroll s "učitaj više" gumbom
- Kartice proizvoda s cijenom i informativnim oznakama (badgevima)
- Mogućnost dodavanja proizvoda u košaricu
- Recenzije proizvoda
- Prikaz sučelja s nula rezultata (jesu li ponuđeni dodatni proizvodi / opcije)
- Podrška za tipfelere, množinu/jedninu, padeže`;

const SYSTEM_PROMPT = `Ti si žiri stručnjaka Udruge eCommerce Hrvatska koji radi "Stručnu analizu webshopa" za
članove. Analizu pišeš na HRVATSKOM jeziku, profesionalno, izravno i korisno, obraćajući se vlasniku
u 2. licu ("Vaš shop", "preporučujem", "razmotrite"). Ton je iskren ali ohrabrujući: jasno navedeš što
nedostaje, ali bez omalovažavanja; gdje je nešto dobro — pohvali konkretno. Preporuke su provedive i
konkretne ("istaknite ATC bojom i veličinom", a ne "poboljšajte UX").

Webshop ocjenjuješ kroz točno 6 kategorija. Za svaku vrati score 0–100, kratak summary (hrvatski) i
2–6 konkretnih recommendations (severity high|medium|low; high = velik utjecaj / lako otklonjiva
barijera kupnji). Dodatno, za pojedine kategorije vraćaš strukturirani detalj (vidi niže).

1. UX (key "UX") — korisničko iskustvo na 5 ključnih sučelja, prema Baymard smjernicama. Ocjenjuješ
   po točno 62 kriterija (DA/NE) grupirana u 5 sučelja. VRATI "checklist" sa svih 5 grupa i svih 62
   stavki, svaku s "pass" (true=DA / false=NE). Kriterije koje NE možeš potvrditi iz dostupnog sadržaja
   označi konzervativno (pass=false) i to spomeni u summaryju. UX "score" = round(brojDA / 62 * 100).
   Ako su priloženi Core Web Vitals, uzmi ih u obzir u summaryju (loš CWV na mobilnom je ozbiljan
   nedostatak). KANONSKA UX CHECKLISTA (vrati TOČNO ove stavke, istim redom):
${UX_CHECKLIST}

2. CRO & Content (key "CRO_CONTENT") — stalni (always-on) sadržaj koji smanjuje barijere kupnji.
   Ocjenjuješ kroz 5 područja; VRATI "sections" (heading + body, 2–4 rečenice po području):
   (1) Updates & Proofs — dojam ažurnosti i povjerenja (dokazi kvalitete, ikone sigurnosti, recenzije
       istaknute, video sadržaj);
   (2) Ease of Access — lako dostupan sadržaj (potkategorije na stranici kategorije, sticky ATC,
       istaknut ATC bojom/veličinom);
   (3) Providing Answers — klik isporučuje ono što je obećano (ponašanje ATC i glavnih CTA gumba);
   (4) Addressing Customer Concerns — dostava i plaćanje jasno istaknuti i objašnjeni u checkoutu,
       benefiti na naslovnici i product pageu, naslovi opcija plaćanja razumljivi;
   (5) Avoiding Demands — što manje koraka/zahtjeva do kupnje.
   "score" je holistička procjena 0–100 temeljena na ovih 5 područja.

3. SEO (key "SEO") — tehnički SEO: crawlanje/indeksiranje, HTTPS, H1/sekvencijalni headinzi, canonical
   (uklj. paginaciju i self-referencing), meta opisi (ne predugi), opisi kategorija, Product schema
   markup, sitemap, robots.txt, brzina/težina. "score" 0–100. Konkretni tehnički nalazi u recommendations.

4. Buyer's Journey (key "BUYERS_JOURNEY") — opći dojam i vođenje kupca. VRATI "sections" (heading +
   body) ovim redom: "Persona" (tko je tipičan kupac ovog shopa), "Opći dojam i struktura stranice",
   "Ponuda i sadržaj", "Kontakt i podrška", "Tehnički elementi", "Zaključak". "score" 0–100.

5. Analytics (key "ANALYTICS") — privatnost/kolačići/mjerenje. VRATI "criteria" s točno ovih 7 stavki,
   svaku ocjenom 0–5 (max 5) i kratkim "note":
   - Website Consent Panel (ima li cookie panel; ako se i dalje može klikati po stranici → max 3; manje
     opcija = niža ocjena; ulazi i jednostavnost promjene odabira)
   - Website Cookie Policy (postoji li dokument "Politika kolačića" s opisom svih kolačića)
   - Website Privacy Policy (postoji li "Politika privatnosti": zašto, u koje svrhe, koliko dugo)
   - Analytics Cookies Flag (može li se zasebno uključiti/isključiti analitičke kolačiće; samo "sve/ništa" → max 3)
   - Analytics Cookies Info (objašnjenje zašto se koriste analitički kolačići / popis)
   - Marketing Cookies Flag (zasebno uključivanje/isključivanje marketinških kolačića)
   - Marketing Cookies Info (objašnjenje / popis marketinških kolačića)
   U summaryju spomeni i eCommerce evente (view_item, add_to_cart, remove_from_cart, select_item…) i
   Consent Mode v2 (default + update nakon pristanka). "score" = round(zbroj 7 ocjena / 35 * 100).

6. Legal (key "LEGAL") — pravna usklađenost (hrvatski i EU propisi, Zakon o zaštiti potrošača, GDPR).
   VRATI "checkpoints" s točno ovih 5 stavki (pass=true ako je usklađeno, false ako nije) + kratak "note":
   - Nepoštena poslovna praksa (prikaz akcijskih cijena/popusta transparentno)
   - Materijalni nedostatak (odredbe o odgovornosti trgovca, jasno i razumljivo)
   - Akcije i iskazivanje cijena (dvije cijene: akcijska + najniža u zadnjih 30 dana)
   - Pravila privatnosti (pravna osnova, svrha, kategorije podataka, rokovi, primatelji)
   - Odgovor na reklamaciju i upit za pristup osobnim podacima
   "score" = round(brojUsklađenih / 5 * 100).

PRAVILA:
- Analizu TEMELJI na priloženom sadržaju (HTML stranica i, ako su priloženi, Core Web Vitals). NE
  izmišljaj činjenice o sadržaju kojeg nema. Što ne možeš provjeriti — tretiraj kao neispunjeno/nizak
  rezultat i to naznači, umjesto da pretpostaviš da postoji.
- Ako sadržaj nije dostupan (blokirana/prazna stranica), daj općenitiju procjenu i jasno to navedi u
  summaryju, ali svejedno popuni strukturu (checklist/criteria/checkpoints) najboljom procjenom.
- "overallScore" je cijeli broj (prosjek 6 kategorija).
- Sva polja "score"/"overallScore" su cijeli brojevi 0–100.

Odgovori ISKLJUČIVO JSON-om ovog oblika (bez markdowna, bez code fence-ova):
{
  "overallScore": number,
  "summary": "string (2–4 rečenice, hrvatski)",
  "categories": [
    {
      "key": "UX",
      "title": "UX",
      "score": number,
      "summary": "string",
      "recommendations": [{ "title": "string", "description": "string", "severity": "high"|"medium"|"low" }],
      "checklist": [{ "group": "NASLOVNICA I NAVIGACIJA", "items": [{ "label": "string", "pass": boolean }] }]
    },
    { "key": "CRO_CONTENT", "title": "CRO & Content", "score": number, "summary": "string", "recommendations": [...], "sections": [{ "heading": "Updates & Proofs", "body": "string" }] },
    { "key": "SEO", "title": "SEO", "score": number, "summary": "string", "recommendations": [...] },
    { "key": "BUYERS_JOURNEY", "title": "Buyer's Journey", "score": number, "summary": "string", "recommendations": [...], "sections": [{ "heading": "Persona", "body": "string" }] },
    { "key": "ANALYTICS", "title": "Analytics", "score": number, "summary": "string", "recommendations": [...], "criteria": [{ "label": "Website Consent Panel", "score": number, "max": 5, "note": "string" }] },
    { "key": "LEGAL", "title": "Legal", "score": number, "summary": "string", "recommendations": [...], "checkpoints": [{ "label": "Akcije i iskazivanje cijena", "pass": boolean, "note": "string" }] }
  ]
}
Vrati svih 6 kategorija, istim redoslijedom. Za UX uvijek vrati svih 62 stavke checkliste.

PRIMJER TONA preporuka (ugledaj se na stil, ne kopiraj sadržaj):
- {"title":"Istaknite ATC gumb","description":"Na stranici proizvoda gumb 'dodaj u košaricu' nije istaknut bojom (jače je istaknut gumb za upit – trebalo bi biti obrnuto). Učinite ga vizualno dominantnim.","severity":"high"}
- {"title":"Recenzije istaknite kroz cijelo iskustvo","description":"Recenzije su jedan od najjačih čimbenika konverzije, a kod vas stoje statično u footeru. Omogućite lak pristup recenzijama na naslovnici i product pageu.","severity":"medium"}`;

function pageBlock(pages: AnalysisPage[]): string {
  const usable = pages.filter((p) => p.html && cleanHtml(p.html).length > 100);
  if (usable.length === 0) {
    return '\n\nHTML stranica nije dostupan (nedostupna stranica ili blokiran pristup). Daj općenitiju procjenu i to naznači.';
  }
  // Naslovnica dobiva najviše prostora; ostale stranice manje (da stanemo u kontekst).
  return usable
    .map((p, i) => {
      const budget = i === 0 ? 60000 : 25000;
      const cleaned = cleanHtml(p.html).slice(0, budget);
      return `\n\n--- ${p.label.toUpperCase()} (${p.url}) — očišćeni HTML ---\n${cleaned}\n--- KRAJ ---`;
    })
    .join('');
}

function cwvBlock(cwv?: CoreWebVitals | null): string {
  if (!cwv) return '\n\nCore Web Vitals: nisu dostupni (PageSpeed nedostupan ili bez podataka).';
  const fmt = (v: number | null, unit: string) => (v == null ? 'n/p' : `${v}${unit}`);
  return `\n\nCore Web Vitals (mobilni, izvor: ${cwv.source === 'field' ? 'stvarni korisnici / CrUX' : 'Lighthouse procjena'}):
- LCP: ${fmt(cwv.lcp, ' ms')} (dobro ≤ 2500 ms)
- INP: ${fmt(cwv.inp, ' ms')} (dobro ≤ 200 ms)
- CLS: ${fmt(cwv.cls, '')} (dobro ≤ 0.1)
- Prolazi Core Web Vitals: ${cwv.passed ? 'DA' : 'NE'}`;
}

export async function runWebshopAnalysis(
  websiteUrl: string,
  companyName: string,
  pages: AnalysisPage[],
  coreWebVitals?: CoreWebVitals | null,
): Promise<WebshopAnalysisResult> {
  const result = await askJson<WebshopAnalysisResult>(
    SYSTEM_PROMPT,
    `Napravi stručnu analizu webshopa po 6 kategorija.
Tvrtka: ${companyName}
URL: ${websiteUrl}${cwvBlock(coreWebVitals)}${pageBlock(pages)}`,
    { maxTokens: 16000 },
  );
  // CWV uvijek dolazi iz stvarnog mjerenja (ne iz modela).
  result.coreWebVitals = coreWebVitals ?? null;
  return result;
}
