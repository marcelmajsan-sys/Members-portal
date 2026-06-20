import { askJson } from './claude.js';
import { sanitizeForAnalysis } from './webshop-analysis-agent.js';

export interface SafeShopCheckpoint {
  n: number; // 1–10
  title: string;
  pass: boolean;
  note: string; // obrazloženje (na čemu se temelji ocjena)
}

export interface SafeShopCertificationResult {
  score: number; // 0–10 (broj zadovoljenih kriterija)
  passed: boolean; // true ako score >= 9
  summary: string; // Komentar (2–4 rečenice)
  checkpoints: SafeShopCheckpoint[]; // točno 10
}

export interface SafeShopPage {
  url: string;
  label: string;
  html: string;
}

// 10 kanonskih Safe Shop kriterija (iz stvarnih analiza Udruge, eCommerce Kodeks ponašanja).
const CRITERIA = `1. "Iza webshopa stoji stvarni pravni subjekt" — jasno je naveden prodavatelj (puni naziv tvrtke,
   adresa, OIB i MBS), definiran kao "Prodavatelj", uz službene kontakte (e-mail, telefon, web adresa).
   Jasno je tko je ugovorna strana i tko stoji iza webshopa.
2. "Znate što, kada i gdje kupujete" — postoje Predugovorne obavijesti; kupac se prije potvrde narudžbe
   upoznaje s prodavateljem, obilježjima robe, cijenama, dostavom i pravom na povrat. Objašnjen je
   postupak narudžbe (odabir artikla, e-obrazac, ugovor sklopljen tek nakon potvrde, potvrda e-mailom).
3. "Ono što kupujete, to i dobivate" — proizvodi su opisani i prikazani fotografijama (uz napomenu da su
   ilustrativne); definirana je odgovornost za materijalne nedostatke (popravak, zamjena, sniženje,
   raskid) te postupanje kad proizvod nije raspoloživ (obavijest, rok, alternativa).
4. "Cijene su jasne i potpune" — cijene su u eurima s uračunatim PDV-om; prije potvrde narudžbe jasno se
   prikazuju cijena proizvoda, cijena dostave, iznos PDV-a i konačna cijena; troškovi uplate naznačeni.
5. "Plaćanje je sigurno" — navedeni su načini plaćanja; kartično plaćanje ide preko certificiranog
   payment gatewaya (npr. WSPay/Monri), kartični podaci se ne pohranjuju kod trgovca; usklađenost s
   GDPR-om i PCI DSS standardima.
6. "Informacije o dostavi su jasne i transparentne" — troškovi dostave detaljno izloženi (dostavljači,
   prag besplatne dostave, zone), rokovi isporuke definirani, opisano postupanje kod kašnjenja i
   nemogućnosti dostave.
7. "Imate pravo na povrat robe u roku 14 dana" — pravo na jednostrani raskid ugovora u roku od najmanje
   14 dana; propisan postupak (obrazac za raskid, obavijest e-mailom, rok povrata novca, rok vraćanja
   robe); nabrojani zakonski izuzeci.
8. "Pritužbe se rješavaju brzo i pošteno" — razrađena odgovornost za materijalne nedostatke (rok prijave,
   2 godine odgovornosti); jasan kanal za pisani prigovor (e-mail/pošta) uz rok odgovora (npr. 15 dana);
   nabrojana prava kupca.
9. "Privatnost kupca je zaštićena" — Politika privatnosti i uvjeti detaljno objašnjavaju koje se osobne
   podatke prikuplja, svrhe i pravne osnove obrade; opisana prava ispitanika (pristup, ispravak,
   brisanje, ograničenje, prenosivost, prigovor); naveden kontakt službenika (DPO), mehanizam povlačenja
   privole i pravo na pritužbu AZOP-u.
10. "Brinemo za sigurnost vaših podataka" — stranica je zaštićena SSL certifikatom; kartični podaci idu
    isključivo kroz certificirani payment gateway (PCI DSS); opisana je politika kolačića (vrste kolačića)
    uz upute kako korisnik može upravljati postavkama u pregledniku.`;

const SYSTEM_PROMPT = `Ti si certifikacijski analitičar Safe Shop oznake Udruge eCommerce Hrvatska.
Provodiš "Safe Shop analizu" webshopa sukladno eCommerce Kodeksu ponašanja. Pišeš na HRVATSKOM jeziku,
stručno i konkretno.

Ocjenjuješ webshop po TOČNO 10 kriterija (svaki ZADOVOLJEN ili NIJE ZADOVOLJEN). Vrati "checkpoints" s
točno ovih 10 stavki, istim redom i istim naslovima, svaku s "pass" (true=zadovoljen) i kratkim "note"
koji konkretno obrazlaže na čemu temeljiš ocjenu (po mogućnosti referenciraj gdje si to našao, npr.
"Uvjeti poslovanja, odjeljak o plaćanju").

KRITERIJI:
${CRITERIA}

PRAVILA:
- Analizu TEMELJI na priloženom sadržaju (naslovnica + pravne stranice: Uvjeti poslovanja/korištenja,
  Politika privatnosti, Politika kolačića, Dostava, Reklamacije/Povrat). HTML je STRUKTURNI (zadržani
  tagovi + class/aria/type/href) — koristi i markup i tekst.
- NE izmišljaj. Kriterij označi pass=true samo ako za njega imaš stvaran dokaz u priloženom sadržaju.
  Ako relevantnu pravnu stranicu NISI dobio ili je sadržaj nedostupan, kriterij koji o njoj ovisi označi
  pass=false i u "note" napiši da nije bilo moguće potvrditi iz dostupnog sadržaja.
- "score" = broj kriterija s pass=true (cijeli broj 0–10). "passed" = true ako je score >= 9 (9/10 i
  10/10 prolaze; sve manje zahtijeva dorade).
- "summary" je Komentar (2–4 rečenice): ako prolazi — kratka pozitivna ocjena; ako ne — sažmi što treba
  doraditi (koje kriterije i zašto).

Odgovori ISKLJUČIVO JSON-om ovog oblika (bez markdowna, bez code fence-ova):
{
  "score": number,
  "passed": boolean,
  "summary": "string (hrvatski)",
  "checkpoints": [
    { "n": 1, "title": "Iza webshopa stoji stvarni pravni subjekt", "pass": boolean, "note": "string" }
  ]
}
Vrati svih 10 kriterija, istim redoslijedom i naslovima kao gore.`;

// Sidro za glavni (pravni) sadržaj stranice.
const LEGAL_ANCHOR =
  /(entry-content|page-content|<article|<main|class="[^"]*(content|uvjeti|terms|privacy|privatnost|reklamacij|dostav|kolacic|povrat)[^"]*")/i;

// Pravne stranice: makni boilerplate (head/header/nav/footer/aside) jer veliki mega-menu
// inače gura pravni tekst izvan budžeta; po potrebi recentriraj na glavni sadržaj.
function prepLegal(html: string, budget: number): string {
  const stripped = html
    .replace(/<head[\s\S]*?<\/head>/i, ' ')
    .replace(/<header[\s\S]*?<\/header>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<aside[\s\S]*?<\/aside>/gi, ' ');
  const clean = sanitizeForAnalysis(stripped);
  if (clean.length <= budget) return clean;
  const m = clean.match(LEGAL_ANCHOR);
  if (m && m.index !== undefined && m.index > budget - 8000) {
    const start = Math.max(0, m.index - 4000);
    return clean.slice(start, start + budget);
  }
  return clean.slice(0, budget);
}

function pageBlock(pages: SafeShopPage[]): string {
  const usable = pages
    .map((p, i) => ({
      ...p,
      // Naslovnica: zadrži sve (schema/kontakt/plaćanje). Pravne stranice: izvuci tekst.
      clean: p.html ? (i === 0 ? sanitizeForAnalysis(p.html).slice(0, 35000) : prepLegal(p.html, 40000)) : '',
    }))
    .filter((p) => p.clean.length > 100);
  if (usable.length === 0) {
    return '\n\nSadržaj stranica nije dostupan (nedostupno ili blokirano). Procijeni konzervativno i to naznači u note-ovima.';
  }
  return usable
    .map((p) => `\n\n--- ${p.label.toUpperCase()} (${p.url}) — strukturni HTML ---\n${p.clean}\n--- KRAJ ---`)
    .join('');
}

export async function runSafeShopCertification(
  websiteUrl: string,
  companyName: string,
  pages: SafeShopPage[],
): Promise<SafeShopCertificationResult> {
  const result = await askJson<SafeShopCertificationResult>(
    SYSTEM_PROMPT,
    `Napravi Safe Shop analizu webshopa po 10 kriterija.
Tvrtka: ${companyName}
URL: ${websiteUrl}${pageBlock(pages)}`,
    { maxTokens: 8000 },
  );
  // Score i prolaz uvijek izvodimo iz checkpointa (dosljednost).
  const checkpoints = Array.isArray(result.checkpoints) ? result.checkpoints : [];
  const score = checkpoints.filter((c) => c.pass).length;
  return { ...result, checkpoints, score, passed: score >= 9 };
}
