import { askJson } from './claude.js';
import {
  sanitizeForAnalysis,
  type AnalysisPage,
  type WebshopAnalysisResult,
} from './webshop-analysis-agent.js';

// ─── Stručna analiza online prisutnosti za NUDITELJE usluga ─────────────────
// Po uzoru na stručne analize žirija Udruge (Best Web / Best Copy / Best Marketing)
// koje su za nuditelje radili Ernest Antolović, Nenad Vukušić i Vanja Šebek.
// Rezultat je strukturno kompatibilan s WebshopAnalysisResult (ista tablica i isti
// generički render na portalu: criteria / checkpoints / sections / recommendations).

/** Page speed score (Lighthouse performance 0–100) za obje strategije. */
export interface PagespeedScores {
  desktop: number | null;
  mobile: number | null;
}

/** Signali detektirani deterministički iz sirovog HTML-a (prije sanitizacije). */
export interface ProviderSiteSignals {
  socialLinks: { facebook: boolean; instagram: boolean; linkedin: boolean; youtube: boolean; tiktok: boolean };
  tracking: { googleAnalytics: boolean; googleTagManager: boolean; metaPixel: boolean; linkedinInsight: boolean; hotjar: boolean };
}

const SYSTEM_PROMPT = `Ti si žiri stručnjaka Udruge eCommerce Hrvatska koji radi "Stručnu analizu online prisutnosti"
za članove NUDITELJE usluga (agencije, IT tvrtke, logistika, payment, hosting...). Analizu pišeš na
HRVATSKOM jeziku, profesionalno, izravno i korisno, obraćajući se vlasniku u 2. licu ("Vaš web",
"preporučujem", "razmotrite"). Ton je iskren ali ohrabrujući, kao u stvarnim analizama žirija: jasno
navedeš što nedostaje, ali bez omalovažavanja; gdje je nešto dobro — pohvali konkretno i kratko.
Komentare piši u stilu žirija: konkretno i sažeto (npr. "Malo previše sadržaja i mali font, nije
posebno rađen mobile dizajn, samo responzivnost.").

Web nuditelja ocjenjuješ kroz TOČNO 3 kategorije: Best Web, Best Copy i Best Marketing.

1. BEST WEB (key "BEST_WEB", title "Best Web") — VRATI "criteria" s TOČNO ovih 14 stavki, ovim
   redoslijedom, svaku s ocjenom 0–10 (max 10) i kratkim "note" (obavezno kad je ocjena < 9 — što
   konkretno nedostaje; kod 9–10 note može biti kratka pohvala). Label MORA počinjati nazivom grupe:
   Prezentacija ponude:
   - "Prezentacija ponude — Jasnoća komunikacije ponude" (Tko smo i što radimo — je li posjetitelju
     odmah jasno čime se tvrtka bavi)
   - "Prezentacija ponude — USP (Unique Selling Proposition)" (jasno istaknute prednosti nad
     konkurencijom, zašto odabrati baš njih)
   Dizajn:
   - "Dizajn — Mobile friendly" (čitkost i preglednost na mobilnim uređajima, jasnoća prikaza i
     lakoća navigacije; prosuđuj iz markupa: viewport meta, responsive klase, veličine fontova)
   - "Dizajn — Kreativnost i originalnost" (jedinstven dizajn vs. dojam gotove teme/templatea)
   - "Dizajn — Jednostavnost navigacije (UI/UX)" (jasni i pregledni izbornici, lako do željenog sadržaja)
   - "Dizajn — Call to action" (jasan, nedvosmislen CTA gumb vidljiv u svakom trenutku ili više puta
     po stranici)
   Osnovni SEO:
   - "Osnovni SEO — Struktura stranice" (usluge/kategorije imaju vlastite landing stranice)
   - "Osnovni SEO — Meta podaci" (ispunjeni Title, Description, H1 s ključnim riječima)
   - "Osnovni SEO — URL" (kratki URL-ovi s ključnim riječima)
   - "Osnovni SEO — Interni linkovi" (koriste se linkovi između stranica, npr. s blogova, s KW anchorima)
   - "Osnovni SEO — Ključne riječi na stranici" (KW u prvih 150 riječi sadržaja, prvenstveno na
     stranicama pojedinačnih usluga)
   - "Osnovni SEO — Multimedia" (osim teksta koriste se slike i video za preglednost, dinamiku i
     zadržavanje posjetitelja)
   Page speed:
   - "Page speed — Desktop" (ocjena = zaokruženi PageSpeed score / 10; npr. 50/100 → 5)
   - "Page speed — Mobile" (isto pravilo)
   Za Page speed stavke KORISTI PRILOŽENE izmjerene PageSpeed rezultate (ne procjenjuj sam); u note
   napiši "Page speed X/100". Ako mjerenje nije dostupno, daj konzervativnu procjenu i navedi to.
   "score" kategorije = round(zbroj svih 14 ocjena / 140 * 100).
   "summary" = KOMENTAR u stilu žirija (1–3 rečenice, ukupni dojam + što najviše ruši ocjenu).

2. BEST COPY (key "BEST_COPY", title "Best Copy") — VRATI:
   a) "checkpoints" s TOČNO ovih 5 stavki (pass=true → DA / pass=false → NE, uz kratak "note"):
   - "Jasna i konkretna poruka (value proposition)"
   - "Above the fold jasno komunicira za koga su usluge i što korisnik dobiva"
   - "Copy sadrži elemente koji potiču konverziju (pain points, concerns)"
   - "Konzistentan ton komunikacije"
   - "Jasan poziv na akciju (CTA)"
   b) "sections" s TOČNO ovih 5 naslova, ovim redom, svaki s detaljnim osvrtom od 3–6 rečenica u
   stilu žirijeve analize (citiraj konkretne poruke s weba gdje je moguće):
   - "1. USP i value proposal"
   - "2. Above the fold i publika"
   - "3. Bolne točke, strahovi i sumnje"
   - "4. Tone of voice"
   - "5. Koliko je jasan i specifičan CTA"
   "score" = holistička ocjena copyja 0–100 (uporište: broj DA + kvaliteta).
   "summary" = KOMENTAR u stilu žirija (1–2 iskrene rečenice, npr. "Web priča samo o sebi, a ne
   obraća pažnju na korisnika / potencijalnog kupca." — ako je to slučaj).

3. BEST MARKETING (key "BEST_MARKETING", title "Best Marketing") — VRATI "criteria" s TOČNO ovih
   7 stavki, ocjena 0–10 (max 10) + kratak "note":
   - "Social — Facebook"
   - "Social — Instagram"
   - "Social — LinkedIn"
   - "Website — Social proof" (recenzije, logotipi klijenata, case studyji, brojke, nagrade)
   - "Website — USP" (koliko je USP marketinški iskorišten na webu)
   - "Website — Tracking" (analitika i pikseli — KORISTI priložene deterministički detektirane
     signale: GA4/GTM/Meta Pixel/LinkedIn Insight/Hotjar; bez ijednog signala ocjena ≤ 2)
   - "Website — Ključne riječi" (pokrivenost relevantnih pojmova pretrage kroz sadržaj)
   Za Social stavke: ocjenjuj na temelju prisutnosti linkova na profile na webu i onoga što se iz
   weba vidi (embedovi, feedovi). Ako link na mrežu NE postoji na webu, ocjena ≤ 2 uz note "profil
   nije istaknut na webu". NE izmišljaj sadržaj profila koje ne vidiš — u note navedi da je ocjena
   temeljena na signalima s weba.
   "score" kategorije = round(zbroj 7 ocjena / 70 * 100).
   "summary" = kratak KOMENTAR (1–2 rečenice).

Svaka kategorija dodatno vraća 2–5 konkretnih "recommendations" (severity high|medium|low; high =
velik utjecaj / lako otklonjivo). Preporuke su provedive i konkretne ("Dodajte jasan CTA 'Zatražite
ponudu' u header, vidljiv na svakoj stranici", ne "poboljšajte CTA").

PRAVILA:
- Analizu TEMELJI na priloženom sadržaju (strukturni HTML stranica, izmjereni PageSpeed, detektirani
  tracking/social signali). NE tvrdi da nešto NEDOSTAJE bez pozitivnog dokaza; ako ne možeš potvrditi,
  napiši "nije potvrđeno iz dostupnog HTML-a — provjerite".
- Ovo NIJE webshop: nema košarice/checkouta. Fokus je na prezentaciji usluga, generiranju upita
  (leadova) i povjerenju.
- "overallScore" = round(prosjek 3 kategorije), cijeli broj 0–100.
- Sva polja "score"/"overallScore" su cijeli brojevi.

Odgovori ISKLJUČIVO JSON-om ovog oblika (bez markdowna, bez code fence-ova):
{
  "overallScore": number,
  "summary": "string (2–4 rečenice na hrvatskom — ukupni dojam online prisutnosti)",
  "categories": [
    { "key": "BEST_WEB", "title": "Best Web", "score": number, "summary": "string",
      "recommendations": [{ "title": "string", "description": "string", "severity": "high"|"medium"|"low" }],
      "criteria": [{ "label": "Prezentacija ponude — Jasnoća komunikacije ponude", "score": number, "max": 10, "note": "string" }] },
    { "key": "BEST_COPY", "title": "Best Copy", "score": number, "summary": "string",
      "recommendations": [...],
      "checkpoints": [{ "label": "Jasna i konkretna poruka (value proposition)", "pass": boolean, "note": "string" }],
      "sections": [{ "heading": "1. USP i value proposal", "body": "string" }] },
    { "key": "BEST_MARKETING", "title": "Best Marketing", "score": number, "summary": "string",
      "recommendations": [...],
      "criteria": [{ "label": "Social — Facebook", "score": number, "max": 10, "note": "string" }] }
  ]
}
Vrati sve 3 kategorije, istim redoslijedom, sa SVIM navedenim stavkama.
VAŽNO ZA JSON: unutar string vrijednosti NIKAD ne koristi neescapane dvostruke navodnike — kada
citiraš poruke s weba, koristi jednostruke navodnike ('...') ili „hrvatske navodnike“.`;

function pageBlock(pages: AnalysisPage[]): string {
  const usable = pages
    .map((p, i) => ({
      ...p,
      clean: p.html
        ? (i === 0
            ? sanitizeForAnalysis(p.html).slice(0, 70000)
            : sanitizeForAnalysis(p.html.replace(/<head[\s\S]*?<\/head>/i, '')).slice(0, 40000))
        : '',
    }))
    .filter((p) => p.clean.length > 100);
  if (usable.length === 0) {
    return '\n\nHTML stranica nije dostupan (nedostupna stranica ili blokiran pristup). Daj općenitiju procjenu i to jasno naznači u summaryju.';
  }
  return usable
    .map(
      (p) =>
        `\n\n--- ${p.label.toUpperCase()} (${p.url}) — strukturni HTML (tagovi + class/aria/href zadržani) ---\n${p.clean}\n--- KRAJ ---`,
    )
    .join('');
}

function pagespeedBlock(ps?: PagespeedScores | null): string {
  if (!ps || (ps.desktop == null && ps.mobile == null)) {
    return '\n\nPageSpeed (pagespeed.web.dev): mjerenje nije dostupno.';
  }
  const fmt = (v: number | null) => (v == null ? 'n/p' : `${v}/100`);
  return `\n\nPageSpeed (pagespeed.web.dev, Lighthouse performance):
- Desktop: ${fmt(ps.desktop)}
- Mobile: ${fmt(ps.mobile)}`;
}

function signalsBlock(sig?: ProviderSiteSignals | null): string {
  if (!sig) return '';
  const yn = (b: boolean) => (b ? 'DA' : 'NE');
  return `\n\nDeterministički detektirani signali iz HTML-a (pouzdano):
- Linkovi na društvene mreže na webu: Facebook ${yn(sig.socialLinks.facebook)}, Instagram ${yn(sig.socialLinks.instagram)}, LinkedIn ${yn(sig.socialLinks.linkedin)}, YouTube ${yn(sig.socialLinks.youtube)}, TikTok ${yn(sig.socialLinks.tiktok)}
- Tracking skripte: Google Analytics ${yn(sig.tracking.googleAnalytics)}, Google Tag Manager ${yn(sig.tracking.googleTagManager)}, Meta Pixel ${yn(sig.tracking.metaPixel)}, LinkedIn Insight ${yn(sig.tracking.linkedinInsight)}, Hotjar ${yn(sig.tracking.hotjar)}`;
}

export async function runProviderAnalysis(
  websiteUrl: string,
  companyName: string,
  pages: AnalysisPage[],
  pagespeed?: PagespeedScores | null,
  signals?: ProviderSiteSignals | null,
): Promise<WebshopAnalysisResult> {
  const result = await askJson<WebshopAnalysisResult>(
    SYSTEM_PROMPT,
    `Napravi stručnu analizu online prisutnosti nuditelja usluga po 3 kategorije (Best Web, Best Copy, Best Marketing).
Tvrtka: ${companyName}
URL: ${websiteUrl}${pagespeedBlock(pagespeed)}${signalsBlock(signals)}${pageBlock(pages)}`,
    { maxTokens: 16000 },
  );
  // Normalizacija: model povremeno izostavi "max" na kriterijima → default 10
  for (const cat of result.categories ?? []) {
    if (cat.criteria) for (const c of cat.criteria) c.max = c.max ?? 10;
  }
  result.coreWebVitals = null;
  return result;
}
